"use server";

import { revalidatePath } from "next/cache";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateRecipesInput } from "@/lib/validators";
import { generateRecipes, generateRecipeImage } from "@/lib/openai";
import { enqueueImageJob, getQueue } from "@/lib/queue";
import {
  getCurrentPlan,
  canGenerate,
  planHasFeature,
} from "@/lib/plans";
import {
  getUsage,
  incrementUsage,
  currentPeriodKey,
  getDailyUsage,
} from "@/lib/usage";
import { getActiveTrialCampaign, isOnActiveTrial } from "@/lib/campaigns";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { env } from "@/env";
import type { ActionResult } from "@/types/session";

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

function fromZod(err: z.ZodError): ActionResult<never> {
  const first = err.issues[0];
  return fail("VALIDATION", first?.message ?? "Datos no válidos");
}

async function ensureUploadDir(userId: string): Promise<string> {
  const base = path.resolve(process.cwd(), env.UPLOADS_DIR, userId);
  await fs.mkdir(base, { recursive: true });
  return base;
}

async function saveImageFromBase64(
  userId: string,
  b64: string
): Promise<{ url: string; absolutePath: string }> {
  const dir = await ensureUploadDir(userId);
  const id = crypto.randomBytes(10).toString("hex");
  const filename = `${id}.png`;
  const absolutePath = path.join(dir, filename);
  await fs.writeFile(absolutePath, Buffer.from(b64, "base64"));
  return { url: `/uploads/${userId}/${filename}`, absolutePath };
}

function promptHash(input: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

export type GenerateActionResult = ActionResult<{
  recipeIds: string[];
}>;

export async function generateRecipesAction(
  _prev: GenerateActionResult | null,
  formData: FormData
): Promise<GenerateActionResult> {
  const user = await requireUser();

  // Fall back to the user's saved dietary profile if the wizard didn't override
  let dietaryFromForm = (formData.get("dietaryProfile") || "")
    .toString()
    .trim();
  if (!dietaryFromForm) {
    const u = await prisma.user.findUnique({
      where: { id: user.id },
      select: { dietaryProfile: true },
    });
    if (u?.dietaryProfile) dietaryFromForm = u.dietaryProfile;
  }

  // Form data uses comma-separated arrays for chips
  const parsed = generateRecipesInput.safeParse({
    ingredients: parseList(formData.get("ingredients")),
    forbidden: parseList(formData.get("forbidden")),
    unwanted: parseList(formData.get("unwanted")),
    servings: formData.get("servings"),
    cuisine: formData.get("cuisine") || undefined,
    difficulty: formData.get("difficulty") || undefined,
    mealType: formData.get("mealType") || undefined,
    goal: formData.get("goal") || undefined,
    dietaryProfile: dietaryFromForm || undefined,
  });
  if (!parsed.success) return fromZod(parsed.error);

  // Per-user rate limit (1 req / 8s)
  const rl = await rateLimit(`gen:${user.id}`, 1, 8);
  if (!rl.ok)
    return fail(
      "RATE_LIMIT",
      "Espera unos segundos antes de generar otra receta."
    );

  const plan = await getCurrentPlan(user.id);
  const usage = await getUsage(user.id);

  // Trial users get a daily cap from the campaign instead of monthly.
  const trialUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      trialEndsAt: true,
      trialChargedAt: true,
      campaignId: true,
    },
  });
  let trialQuota: { dailyCap: number; usedToday: number } | null = null;
  if (trialUser && isOnActiveTrial(trialUser)) {
    const campaign = await getActiveTrialCampaign(trialUser);
    if (campaign) {
      const usedToday = await getDailyUsage(user.id);
      trialQuota = {
        dailyCap: campaign.trialRecipesPerDay,
        usedToday,
      };
    }
  }

  const can = canGenerate(plan, usage.recipesUsed, trialQuota);
  if (!can.allowed) return fail("PLAN_LIMIT", can.reason);

  let parsedResp;
  let usageInfo;
  try {
    const result = await generateRecipes(parsed.data);
    parsedResp = result.parsed;
    usageInfo = result.usage;
  } catch (e) {
    logger.error({ err: e, userId: user.id }, "OpenAI text generation failed");
    return fail(
      "OPENAI",
      "No hemos podido generar las recetas. Intenta de nuevo en un momento."
    );
  }

  const wantsImages = planHasFeature(plan, "imagesEnabled");
  const imageQuality = (
    plan.imageQuality === "hd" || plan.imageQuality === "standard"
      ? plan.imageQuality
      : "low"
  ) as "low" | "standard" | "hd";

  // If Redis is up, image generation goes to background workers and the
  // action returns ~10s. Otherwise we fall back to inline (slower).
  const queueAvailable = !!getQueue();

  const recipeIds: string[] = [];
  let imagesGenerated = 0;
  let imageCostCents = 0;
  const hash = promptHash(parsed.data);

  for (const r of parsedResp.recipes) {
    let imageUrl: string | null = null;
    let imageStoragePath: string | null = null;

    if (wantsImages && !queueAvailable) {
      // Inline path (no Redis): generate the image now
      try {
        const img = await generateRecipeImage(r.imagePrompt, imageQuality);
        const saved = await saveImageFromBase64(user.id, img.b64);
        imageUrl = saved.url;
        imageStoragePath = saved.absolutePath;
        imagesGenerated += 1;
        imageCostCents += img.costCents;
      } catch (e) {
        logger.error({ err: e, userId: user.id }, "image generation failed");
      }
    }

    const recipe = await prisma.recipe.create({
      data: {
        userId: user.id,
        title: r.title,
        description: r.description,
        servings: r.servings,
        prepMinutes: r.prepMinutes,
        cookMinutes: r.cookMinutes,
        difficulty: r.difficulty,
        cuisine: r.cuisine ?? null,
        imageUrl,
        imageStoragePath,
        totalCalories: r.perServing.calories,
        totalProteins: r.perServing.proteins,
        totalFats: r.perServing.fats,
        totalCarbs: r.perServing.carbs,
        promptHash: hash,
        mealType: parsed.data.mealType ?? null,
        goal: parsed.data.goal ?? null,
        ingredients: {
          create: r.ingredients.map((ing, i) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            optional: ing.optional,
            suggested: ing.suggested,
            calories: ing.calories,
            proteins: ing.proteins,
            fats: ing.fats,
            carbs: ing.carbs,
            sortOrder: i,
          })),
        },
        steps: {
          create: r.steps.map((s) => ({
            order: s.order,
            content: s.content,
            durationMin: s.durationMin,
          })),
        },
      },
    });

    await prisma.recipeHistory.create({
      data: {
        userId: user.id,
        recipeId: recipe.id,
        promptInputs: parsed.data as object,
        tokensUsed: usageInfo.tokens,
        costCents: usageInfo.costCents + imageCostCents,
      },
    });

    // Background path: enqueue the image so the action can return now
    if (wantsImages && queueAvailable && !recipe.imageStoragePath) {
      await enqueueImageJob({
        recipeId: recipe.id,
        userId: user.id,
        imagePrompt: r.imagePrompt,
        quality: imageQuality,
      });
    }

    recipeIds.push(recipe.id);
  }

  await incrementUsage(
    user.id,
    {
      recipes: recipeIds.length,
      images: imagesGenerated,
      tokens: usageInfo.tokens,
      costCents: usageInfo.costCents + imageCostCents,
    },
    { periodKey: currentPeriodKey(), alsoTrackDaily: true }
  );

  revalidatePath("/recipes");
  revalidatePath("/dashboard");

  return { ok: true, data: { recipeIds } };
}

export async function toggleFavoriteAction(
  recipeId: string
): Promise<ActionResult<{ isFavorite: boolean }>> {
  const user = await requireUser();
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe || recipe.userId !== user.id)
    return fail("NOT_FOUND", "Receta no encontrada");

  const updated = await prisma.recipe.update({
    where: { id: recipeId },
    data: { isFavorite: !recipe.isFavorite },
  });
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  return { ok: true, data: { isFavorite: updated.isFavorite } };
}

export async function deleteRecipeAction(
  recipeId: string
): Promise<ActionResult<{ deleted: true }>> {
  const user = await requireUser();
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe || recipe.userId !== user.id)
    return fail("NOT_FOUND", "Receta no encontrada");

  await prisma.recipe.delete({ where: { id: recipeId } });

  if (recipe.imageStoragePath) {
    fs.unlink(recipe.imageStoragePath).catch(() => undefined);
  }

  revalidatePath("/recipes");
  revalidatePath("/dashboard");
  return { ok: true, data: { deleted: true } };
}

function parseList(value: FormDataEntryValue | null): string[] {
  if (!value) return [];
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
