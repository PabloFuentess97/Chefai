"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { upsertEmailCampaignSchema } from "@/lib/validators";
import { sendOne, sendCampaignNow, resolveAudience } from "@/lib/email-send";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/session";

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

function fromZod(err: z.ZodError): ActionResult<never> {
  const first = err.issues[0];
  return fail("VALIDATION", first?.message ?? "Datos no válidos");
}

export async function upsertEmailCampaignAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = upsertEmailCampaignSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    templateKey: formData.get("templateKey"),
    accentColor: formData.get("accentColor") || undefined,
    subject: formData.get("subject"),
    preheader: formData.get("preheader") || undefined,
    heroBadge: formData.get("heroBadge") || undefined,
    heroTitle: formData.get("heroTitle") || undefined,
    heroBody: formData.get("heroBody") || undefined,
    ctaLabel: formData.get("ctaLabel") || undefined,
    ctaUrl: formData.get("ctaUrl") || undefined,
    imageUrl: formData.get("imageUrl") || undefined,
    audienceMode: formData.get("audienceMode") || "ALL_USERS",
    audiencePlanId: formData.get("audiencePlanId") || undefined,
    audienceAcqCampaignId: formData.get("audienceAcqCampaignId") || undefined,
    audienceDietary: formData.get("audienceDietary") || undefined,
    scheduledFor: formData.get("scheduledFor") || null,
  });
  if (!parsed.success) return fromZod(parsed.error);

  const data = parsed.data;
  const writeData = {
    name: data.name,
    description: data.description ?? null,
    templateKey: data.templateKey,
    accentColor: data.accentColor ?? null,
    subject: data.subject,
    preheader: data.preheader ?? null,
    heroBadge: data.heroBadge ?? null,
    heroTitle: data.heroTitle ?? null,
    heroBody: data.heroBody ?? null,
    ctaLabel: data.ctaLabel ?? null,
    ctaUrl: data.ctaUrl ?? null,
    imageUrl: data.imageUrl ?? null,
    audienceMode: data.audienceMode,
    audiencePlanId:
      data.audienceMode === "PLAN" ? (data.audiencePlanId ?? null) : null,
    audienceAcqCampaignId:
      data.audienceMode === "ACQUISITION_CAMPAIGN"
        ? (data.audienceAcqCampaignId ?? null)
        : null,
    audienceDietary:
      data.audienceMode === "DIETARY_PROFILE"
        ? (data.audienceDietary ?? null)
        : null,
    scheduledFor: data.scheduledFor,
    status: data.scheduledFor ? ("SCHEDULED" as const) : ("DRAFT" as const),
  };

  const saved = data.id
    ? await prisma.emailCampaign.update({
        where: { id: data.id },
        data: writeData,
      })
    : await prisma.emailCampaign.create({ data: writeData });

  revalidatePath("/admin/emails");
  revalidatePath(`/admin/emails/${saved.id}`);
  return { ok: true, data: { id: saved.id } };
}

export async function deleteEmailCampaignAction(
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  await requireAdmin();
  if (!id) return fail("VALIDATION", "Falta el ID");
  await prisma.emailCampaign.delete({ where: { id } });
  revalidatePath("/admin/emails");
  return { ok: true, data: { deleted: true } };
}

export async function testSendEmailCampaignAction(
  campaignId: string,
  toEmail: string
): Promise<ActionResult<{ sent: true }>> {
  await requireAdmin();
  if (!campaignId || !toEmail)
    return fail("VALIDATION", "Falta campaña o email");
  const c = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!c) return fail("NOT_FOUND", "Campaña no encontrada");

  const r = await sendOne({
    toEmail,
    templateKey: c.templateKey,
    accentColor: c.accentColor,
    subject: `[TEST] ${c.subject}`,
    preheader: c.preheader,
    heroBadge: c.heroBadge,
    heroTitle: c.heroTitle,
    heroBody: c.heroBody,
    ctaLabel: c.ctaLabel,
    ctaUrl: c.ctaUrl,
    imageUrl: c.imageUrl,
    vars: { name: "Pablo", email: toEmail },
  });
  if (!r.ok)
    return fail("SEND_FAILED", r.error ?? "Resend devolvió un error");
  return { ok: true, data: { sent: true } };
}

export async function sendEmailCampaignNowAction(
  id: string
): Promise<ActionResult<{ recipients: number; sent: number; failed: number }>> {
  await requireAdmin();
  if (!id) return fail("VALIDATION", "Falta el ID");
  try {
    const out = await sendCampaignNow(id);
    revalidatePath("/admin/emails");
    revalidatePath(`/admin/emails/${id}`);
    return { ok: true, data: out };
  } catch (e) {
    logger.error({ err: e, id }, "sendEmailCampaignNowAction failed");
    return fail(
      "SEND_FAILED",
      e instanceof Error ? e.message : "Error al enviar la campaña"
    );
  }
}

export async function previewAudienceAction(args: {
  audienceMode:
    | "ALL_USERS"
    | "NEWSLETTER_OPT_IN"
    | "PLAN"
    | "ACQUISITION_CAMPAIGN"
    | "DIETARY_PROFILE";
  audiencePlanId?: string | null;
  audienceAcqCampaignId?: string | null;
  audienceDietary?: string | null;
}): Promise<ActionResult<{ count: number }>> {
  await requireAdmin();
  const rec = await resolveAudience(args);
  return { ok: true, data: { count: rec.length } };
}
