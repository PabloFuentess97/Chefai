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
} from "@/lib/validators";
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
    shoppingList: formData.get("shoppingList") === "on",
    weeklyPlanner: formData.get("weeklyPlanner") === "on",
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
    shoppingList: parsed.data.shoppingList,
    weeklyPlanner: parsed.data.weeklyPlanner,
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
  return { ok: true, data: { updated: true } };
}
