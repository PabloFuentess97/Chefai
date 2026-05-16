"use server";

import { revalidatePath } from "next/cache";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  upsertPlanSchema,
  updateSettingsSchema,
  setUserRoleSchema,
  updateUserNameSchema,
  setUserPlanSchema,
} from "@/lib/validators";
import { getPlanBySlug } from "@/lib/plans";
import { env } from "@/env";
import type { ActionResult } from "@/types/session";

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

function fromZod(err: z.ZodError): ActionResult<never> {
  const first = err.issues[0];
  return fail("VALIDATION", first?.message ?? "Datos no válidos");
}

export async function upsertPlanAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = upsertPlanSchema.safeParse({
    id: formData.get("id") || undefined,
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    priceCents: formData.get("priceCents"),
    currency: formData.get("currency") || "EUR",
    interval: formData.get("interval") || "MONTH",
    recipesPerMonth: formData.get("recipesPerMonth"),
    imagesEnabled: formData.get("imagesEnabled") === "on",
    imageQuality: formData.get("imageQuality") || "low",
    pdfExport: formData.get("pdfExport") === "on",
    cookbookExport: formData.get("cookbookExport") === "on",
    shoppingList: formData.get("shoppingList") === "on",
    weeklyPlanner: formData.get("weeklyPlanner") === "on",
    mealPlanner: formData.get("mealPlanner") === "on",
    voiceCooking: formData.get("voiceCooking") === "on",
    fridgePhoto: formData.get("fridgePhoto") === "on",
    substitutions: formData.get("substitutions") === "on",
    prioritySupport: formData.get("prioritySupport") === "on",
    stripePriceId: formData.get("stripePriceId") || undefined,
    paypalPlanId: formData.get("paypalPlanId") || undefined,
    isActive: formData.get("isActive") === "on",
    isPublic: formData.get("isPublic") === "on",
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) return fromZod(parsed.error);

  const data = {
    slug: parsed.data.slug,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    priceCents: parsed.data.priceCents,
    currency: parsed.data.currency,
    interval: parsed.data.interval,
    recipesPerMonth: parsed.data.recipesPerMonth,
    imagesEnabled: parsed.data.imagesEnabled,
    imageQuality: parsed.data.imageQuality,
    pdfExport: parsed.data.pdfExport,
    cookbookExport: parsed.data.cookbookExport,
    shoppingList: parsed.data.shoppingList,
    weeklyPlanner: parsed.data.weeklyPlanner,
    mealPlanner: parsed.data.mealPlanner,
    voiceCooking: parsed.data.voiceCooking,
    fridgePhoto: parsed.data.fridgePhoto,
    substitutions: parsed.data.substitutions,
    prioritySupport: parsed.data.prioritySupport,
    stripePriceId: parsed.data.stripePriceId ?? null,
    paypalPlanId: parsed.data.paypalPlanId ?? null,
    isActive: parsed.data.isActive,
    isPublic: parsed.data.isPublic,
    sortOrder: parsed.data.sortOrder,
  };

  const plan = parsed.data.id
    ? await prisma.plan.update({ where: { id: parsed.data.id }, data })
    : await prisma.plan.create({ data });

  revalidatePath("/admin/plans");
  revalidatePath("/pricing");
  revalidatePath("/");
  return { ok: true, data: { id: plan.id } };
}

export async function togglePlanActiveAction(planId: string) {
  await requireAdmin();
  const p = await prisma.plan.findUnique({ where: { id: planId } });
  if (!p) return;
  await prisma.plan.update({
    where: { id: planId },
    data: { isActive: !p.isActive },
  });
  revalidatePath("/admin/plans");
  revalidatePath("/pricing");
}

export async function updateSettingsAction(
  _prev: ActionResult<{ updated: true }> | null,
  formData: FormData
): Promise<ActionResult<{ updated: true }>> {
  await requireAdmin();
  const parsed = updateSettingsSchema.safeParse({
    brandName: formData.get("brandName"),
    brandTagline: formData.get("brandTagline") || undefined,
    brandLogoUrl: formData.get("brandLogoUrl") || undefined,
    brandColor: formData.get("brandColor"),
    supportEmail: formData.get("supportEmail"),
    termsUrl: formData.get("termsUrl") || undefined,
    privacyUrl: formData.get("privacyUrl") || undefined,
  });
  if (!parsed.success) return fromZod(parsed.error);

  await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, ...parsed.data },
    update: parsed.data,
  });
  revalidatePath("/", "layout");
  return { ok: true, data: { updated: true } };
}

export async function uploadBrandLogoAction(
  _prev: ActionResult<{ url: string }> | null,
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  await requireAdmin();
  const file = formData.get("logo");
  if (!(file instanceof File))
    return fail("VALIDATION", "Archivo no recibido");
  if (file.size > 1024 * 1024)
    return fail("FILE_TOO_LARGE", "Máximo 1 MB");
  if (!file.type.startsWith("image/"))
    return fail("BAD_TYPE", "Debe ser una imagen");

  const buf = Buffer.from(await file.arrayBuffer());
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/svg+xml"
          ? "svg"
          : file.type === "image/webp"
            ? "webp"
            : "bin";
  const id = crypto.randomBytes(6).toString("hex");
  const dir = path.resolve(process.cwd(), env.UPLOADS_DIR, "branding");
  await fs.mkdir(dir, { recursive: true });
  const filename = `logo-${Date.now()}-${id}.${ext}`;
  const absolute = path.join(dir, filename);
  await fs.writeFile(absolute, buf);
  const url = `/uploads/branding/${filename}`;

  await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, brandLogoUrl: url },
    update: { brandLogoUrl: url },
  });
  revalidatePath("/", "layout");
  return { ok: true, data: { url } };
}

export async function setUserRoleAction(
  _prev: ActionResult<{ updated: true }> | null,
  formData: FormData
): Promise<ActionResult<{ updated: true }>> {
  await requireAdmin();
  const parsed = setUserRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
  });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${parsed.data.userId}`);
  return { ok: true, data: { updated: true } };
}

export async function updateUserNameAction(
  _prev: ActionResult<{ updated: true }> | null,
  formData: FormData
): Promise<ActionResult<{ updated: true }>> {
  await requireAdmin();
  const parsed = updateUserNameSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { name: parsed.data.name },
  });
  revalidatePath(`/admin/users/${parsed.data.userId}`);
  return { ok: true, data: { updated: true } };
}

export async function setUserPlanAction(
  _prev: ActionResult<{ planSlug: string }> | null,
  formData: FormData
): Promise<ActionResult<{ planSlug: string }>> {
  await requireAdmin();
  const parsed = setUserPlanSchema.safeParse({
    userId: formData.get("userId"),
    planSlug: formData.get("planSlug"),
    periodMonths: formData.get("periodMonths") ?? 12,
  });
  if (!parsed.success) return fromZod(parsed.error);

  const { userId, planSlug, periodMonths } = parsed.data;
  const plan = await getPlanBySlug(planSlug);
  if (!plan) return fail("PLAN_NOT_FOUND", "Plan no encontrado");

  if (plan.slug === "free") {
    // Removing the subscription returns the user to the implicit free plan
    await prisma.subscription
      .deleteMany({ where: { userId } })
      .catch(() => undefined);
  } else {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + periodMonths);

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: plan.id,
        provider: "MANUAL",
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        planId: plan.id,
        provider: "MANUAL",
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
    });
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true, data: { planSlug: plan.slug } };
}

export async function cancelUserSubscriptionAction(
  userId: string
): Promise<ActionResult<{ canceled: true }>> {
  await requireAdmin();
  if (!userId) return fail("VALIDATION", "userId requerido");

  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return fail("NO_SUBSCRIPTION", "El usuario no tiene suscripción");

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "CANCELED",
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
    },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { ok: true, data: { canceled: true } };
}

// ---------- Campaigns ----------

export async function upsertCampaignAction(
  _prev: ActionResult<{ id: string; slug: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdmin();

  const { upsertCampaignSchema } = await import("@/lib/validators");
  const parsed = upsertCampaignSchema.safeParse({
    id: formData.get("id") || undefined,
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    templateKey: formData.get("templateKey") || undefined,
    accentColor: formData.get("accentColor") || undefined,
    heroBadge: formData.get("heroBadge") || undefined,
    heroTitle: formData.get("heroTitle") || undefined,
    heroSubtitle: formData.get("heroSubtitle") || undefined,
    heroImageUrl: formData.get("heroImageUrl") || undefined,
    ctaLabel: formData.get("ctaLabel") || undefined,
    bulletList: formData.get("bulletList") || undefined,
    customHtml: formData.get("customHtml") || undefined,
    trialDays: formData.get("trialDays"),
    trialRecipesPerDay: formData.get("trialRecipesPerDay"),
    targetPlanId: formData.get("targetPlanId"),
    isActive: formData.get("isActive") === "on",
    expiresAt: formData.get("expiresAt") || null,
  });
  if (!parsed.success) return fromZod(parsed.error);

  const data = parsed.data;
  try {
    const saved = data.id
      ? await prisma.campaign.update({
          where: { id: data.id },
          data: {
            slug: data.slug,
            name: data.name,
            description: data.description ?? null,
            templateKey: data.templateKey ?? null,
            accentColor: data.accentColor ?? null,
            heroBadge: data.heroBadge ?? null,
            heroTitle: data.heroTitle ?? null,
            heroSubtitle: data.heroSubtitle ?? null,
            heroImageUrl: data.heroImageUrl ?? null,
            ctaLabel: data.ctaLabel ?? null,
            bulletList: data.bulletList ?? null,
            customHtml: data.customHtml ?? null,
            trialDays: data.trialDays,
            trialRecipesPerDay: data.trialRecipesPerDay,
            targetPlanId: data.targetPlanId,
            isActive: data.isActive,
            expiresAt: data.expiresAt,
          },
        })
      : await prisma.campaign.create({
          data: {
            slug: data.slug,
            name: data.name,
            description: data.description ?? null,
            templateKey: data.templateKey ?? null,
            accentColor: data.accentColor ?? null,
            heroBadge: data.heroBadge ?? null,
            heroTitle: data.heroTitle ?? null,
            heroSubtitle: data.heroSubtitle ?? null,
            heroImageUrl: data.heroImageUrl ?? null,
            ctaLabel: data.ctaLabel ?? null,
            bulletList: data.bulletList ?? null,
            customHtml: data.customHtml ?? null,
            trialDays: data.trialDays,
            trialRecipesPerDay: data.trialRecipesPerDay,
            targetPlanId: data.targetPlanId,
            isActive: data.isActive,
            expiresAt: data.expiresAt,
          },
        });

    revalidatePath("/admin/campaigns");
    revalidatePath(`/r/${saved.slug}`);
    return { ok: true, data: { id: saved.id, slug: saved.slug } };
  } catch (e) {
    const msg =
      e instanceof Error && e.message.includes("Unique constraint")
        ? "Ya existe una campaña con ese slug"
        : "No se pudo guardar la campaña";
    return fail("DB_ERROR", msg);
  }
}

export async function deleteCampaignAction(
  campaignId: string
): Promise<ActionResult<{ deleted: true }>> {
  await requireAdmin();
  if (!campaignId) return fail("VALIDATION", "Falta el ID");

  // Detach users so we don't cascade-delete them.
  await prisma.user.updateMany({
    where: { campaignId },
    data: { campaignId: null },
  });
  await prisma.campaign.delete({ where: { id: campaignId } });
  revalidatePath("/admin/campaigns");
  return { ok: true, data: { deleted: true } };
}
