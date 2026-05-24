"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MealPlanType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireUser, isEmailVerified } from "@/lib/auth";
import { getCurrentPlan, planHasFeature } from "@/lib/plans";
import { getUsage, incrementUsage, currentPeriodKey } from "@/lib/usage";
import { rateLimit } from "@/lib/rate-limit";
import {
  SLOTS,
  resolveSlot,
  type MealSlotEnum,
  type SlotInput,
} from "@/lib/meal-plans";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/session";

const createPlanSchema = z.object({
  type: z.enum(["DAILY", "WEEKLY"]),
  startDate: z.string().min(8), // ISO date "YYYY-MM-DD"
  goal: z
    .enum(["deficit", "maintain", "volume", "definition", "muscle"])
    .nullable()
    .optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional(),
  fast: z.coerce.boolean().default(false),
  servings: z.coerce.number().int().min(1).max(20).default(2),
  cuisine: z.string().trim().max(40).optional().nullable(),
  preferences: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  forbidden: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  dietaryProfile: z
    .enum([
      "omnivore",
      "vegetarian",
      "vegan",
      "pescatarian",
      "keto",
      "lowcarb",
      "glutenfree",
      "lactosefree",
      "paleo",
      "mediterranean",
    ])
    .nullable()
    .optional(),
  appliances: z.array(z.string()).max(10).default([]),
});

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

function fromZod(err: z.ZodError): ActionResult<never> {
  const first = err.issues[0];
  return fail("VALIDATION", first?.message ?? "Datos no válidos");
}

// Limit OpenAI concurrency for weekly plans (28 slots)
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}

export type CreatePlanResult = ActionResult<{
  planId: string;
  generated: number;
  reused: number;
}>;

export async function createMealPlanAction(
  _prev: CreatePlanResult | null,
  formData: FormData
): Promise<CreatePlanResult> {
  const user = await requireUser();
  if (!isEmailVerified(user)) {
    return fail(
      "EMAIL_NOT_VERIFIED",
      "Verifica tu email antes de crear un menú (revisa tu bandeja de entrada)."
    );
  }

  // Fallback to the user's saved dietary profile when wizard doesn't override
  let dietaryFromForm = (formData.get("dietaryProfile") || "")
    .toString()
    .trim();
  let appliancesFromForm = parseList(formData.get("appliances"));
  if (!dietaryFromForm || appliancesFromForm.length === 0) {
    const u = await prisma.user.findUnique({
      where: { id: user.id },
      select: { dietaryProfile: true, cookingAppliances: true },
    });
    if (!dietaryFromForm && u?.dietaryProfile)
      dietaryFromForm = u.dietaryProfile;
    if (appliancesFromForm.length === 0 && u?.cookingAppliances?.length) {
      appliancesFromForm = u.cookingAppliances;
    }
  }

  const parsed = createPlanSchema.safeParse({
    type: formData.get("type"),
    startDate: formData.get("startDate"),
    goal: formData.get("goal") || null,
    difficulty: formData.get("difficulty") || null,
    fast: formData.get("fast") === "on" || formData.get("fast") === "true",
    servings: formData.get("servings") || 2,
    cuisine: formData.get("cuisine") || null,
    preferences: parseList(formData.get("preferences")),
    forbidden: parseList(formData.get("forbidden")),
    dietaryProfile: dietaryFromForm || null,
    appliances: appliancesFromForm,
  });
  if (!parsed.success) return fromZod(parsed.error);

  const data = parsed.data;
  const type = data.type as MealPlanType;
  const days = type === "WEEKLY" ? 7 : 1;
  const totalSlots = days * SLOTS.length;

  // Rate limit per user (avoid abuse)
  const rl = await rateLimit(`plan:${user.id}`, 1, 30);
  if (!rl.ok) return fail("RATE_LIMIT", "Espera medio minuto antes de crear otro plan");

  const plan = await getCurrentPlan(user.id);
  const usage = await getUsage(user.id);

  // Plan-level feature gate: meal planner is a paid feature
  if (!planHasFeature(plan, "mealPlanner")) {
    return fail(
      "PLAN_FEATURE",
      "La creación de menús está disponible en los planes Pro y Chef. Mejora tu plan para usarla."
    );
  }
  // Weekly plans only on Chef (or any plan with weeklyPlanner true)
  if (type === "WEEKLY" && !planHasFeature(plan, "weeklyPlanner")) {
    return fail(
      "PLAN_FEATURE",
      "Los menús semanales están disponibles en el plan Chef. Crea uno diario o mejora tu plan."
    );
  }

  // Treat plan creation as N recipe generations against the monthly quota.
  // If reuse fills slots later, we'll only count the actually generated ones.
  if (plan.recipesPerMonth !== -1) {
    if (usage.recipesUsed >= plan.recipesPerMonth) {
      return fail(
        "PLAN_LIMIT",
        "Has alcanzado tu cuota mensual. Mejora de plan para crear más menús."
      );
    }
  }

  const imagesEnabled = planHasFeature(plan, "imagesEnabled");
  const imageQuality = (
    plan.imageQuality === "hd" || plan.imageQuality === "standard"
      ? plan.imageQuality
      : "low"
  ) as "low" | "standard" | "hd";

  // Generous image budget — semaphore + retry inside resolveSlot pace the
  // calls within OpenAI rate limits without dropping many.
  const imageBudget = {
    remaining: imagesEnabled ? (type === "DAILY" ? 6 : 16) : 0,
  };

  // Build all slot inputs
  type Slot = { dayIndex: number; slot: MealSlotEnum };
  const slots: Slot[] = [];
  for (let d = 0; d < days; d++) {
    for (const s of SLOTS) {
      slots.push({ dayIndex: d, slot: s });
    }
  }

  // Variety: exclude recipes already used in the user's plans in the last 14
  // days so weekly subscribers don't get repeats. We collect recipeIds AND
  // titles (to feed the AI prompt and discourage clones).
  const recentCutoff = new Date(Date.now() - 14 * 86400_000);
  const recentItems = await prisma.mealPlanItem.findMany({
    where: {
      plan: { userId: user.id, createdAt: { gte: recentCutoff } },
    },
    include: { recipe: { select: { id: true, title: true } } },
  });
  const recentRecipeIds = new Set(recentItems.map((it) => it.recipeId));
  const recentTitles = Array.from(
    new Set(recentItems.map((it) => it.recipe.title))
  );

  // Track recipe IDs already used in THIS plan (to avoid intra-plan dupes)
  const usedIds = new Set<string>();

  // Titles already generated within the same day's loop. Resets per day
  // so breakfast → lunch → snack → dinner each know what's already on
  // the table and avoid producing four tortillas in a row.
  let sameDayTitles: string[] = [];

  const buildSlotInput = (s: Slot): SlotInput => ({
    slot: s.slot,
    goal: data.goal ?? null,
    difficulty: data.difficulty ?? null,
    fast: data.fast,
    cuisine: data.cuisine ?? null,
    preferences: data.preferences,
    forbidden: data.forbidden,
    dietaryProfile: data.dietaryProfile ?? null,
    appliances: data.appliances,
    servings: data.servings,
    excludeRecipeIds: [...usedIds, ...recentRecipeIds],
    // Day-level AVOID list: prior slots of THIS day first (most valuable
    // for variety), then recent history. The prompt builder caps the
    // list at 20 entries.
    avoidTitles: [...sameDayTitles, ...recentTitles],
  });

  // Resolve all slots (reuse first, generate when needed). Concurrency cap.
  // Note: usedIds set is shared, but resolveSlot reads it at call time.
  // For correctness we run sequentially per day to keep diversity strong.
  let generated = 0;
  let reused = 0;
  let totalTokens = 0;
  let totalCost = 0;

  type Resolved = {
    dayIndex: number;
    slot: MealSlotEnum;
    recipeId: string;
    source: "reused" | "generated";
  };

  const resolvedAll: Resolved[] = [];

  // Sequential per-day loop so each slot's AVOID list contains the titles
  // generated for prior slots THE SAME day. Costs ~3× wall time per day
  // (4 sequential AI calls vs 4 parallel) but kills the "every slot is a
  // tortilla" failure mode the IA falls into when slots can't see each
  // other. Across-day boundaries we still run sequentially because the
  // outer loop is sequential anyway.
  for (let d = 0; d < days; d++) {
    const daySlots = slots.filter((s) => s.dayIndex === d);
    sameDayTitles = []; // reset for each new day

    for (const s of daySlots) {
      try {
        let useImage = false;
        if (imageBudget.remaining > 0) {
          imageBudget.remaining -= 1;
          useImage = true;
        }
        const r = await resolveSlot({
          userId: user.id,
          input: buildSlotInput(s),
          imagesEnabled: useImage,
          imageQuality,
        });
        usedIds.add(r.recipeId);

        // Look up the title we just generated/reused to feed it into the
        // next slot's AVOID list. Best-effort — if the lookup fails the
        // worst case is the next slot might repeat a technique.
        try {
          const persisted = await prisma.recipe.findUnique({
            where: { id: r.recipeId },
            select: { title: true },
          });
          if (persisted?.title) sameDayTitles.push(persisted.title);
        } catch {
          /* ignore — variety check is best-effort */
        }

        if (r.source === "generated") {
          generated += 1;
          totalTokens += r.tokensUsed;
          totalCost += r.costCents;
        } else {
          reused += 1;
        }
        resolvedAll.push({
          dayIndex: s.dayIndex,
          slot: s.slot,
          recipeId: r.recipeId,
          source: r.source,
        });
      } catch (e) {
        logger.error({ err: e, slot: s }, "slot resolve failed");
      }
    }
  }

  if (resolvedAll.length < totalSlots * 0.5) {
    return fail(
      "GENERATION_FAILED",
      "No hemos podido generar suficientes recetas, inténtalo de nuevo en un momento."
    );
  }

  // Persist plan + items
  const startDate = new Date(`${data.startDate}T00:00:00`);

  const created = await prisma.$transaction(async (tx) => {
    const planRow = await tx.mealPlan.create({
      data: {
        userId: user.id,
        type,
        startDate,
        goal: data.goal ?? null,
        difficulty: data.difficulty ?? null,
        servings: data.servings,
      },
    });
    await tx.mealPlanItem.createMany({
      data: resolvedAll.map((r) => ({
        planId: planRow.id,
        dayIndex: r.dayIndex,
        slot: r.slot,
        recipeId: r.recipeId,
        servings: data.servings,
      })),
    });
    return planRow;
  });

  await incrementUsage(
    user.id,
    {
      recipes: generated,
      images: 0, // image cost already accounted in costCents per recipe
      tokens: totalTokens,
      costCents: totalCost,
    },
    { periodKey: currentPeriodKey(), alsoTrackDaily: true }
  );

  revalidatePath("/planner");
  revalidatePath("/recipes");
  revalidatePath("/dashboard");

  return {
    ok: true,
    data: { planId: created.id, generated, reused },
  };
}

export async function deleteMealPlanAction(
  planId: string
): Promise<ActionResult<{ deleted: true }>> {
  const user = await requireUser();
  const plan = await prisma.mealPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== user.id) {
    return fail("NOT_FOUND", "Menú no encontrado");
  }
  await prisma.mealPlan.delete({ where: { id: planId } });
  revalidatePath("/planner");
  return { ok: true, data: { deleted: true } };
}

function parseList(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
