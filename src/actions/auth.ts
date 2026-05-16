"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  signSession,
  setSessionCookie,
  logoutSession,
  logoutAllSessionsForUser,
  getRequestMeta,
} from "@/lib/auth";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  emailSchema,
} from "@/lib/validators";
import {
  sendEmail,
  verifyEmailTemplate,
  resetPasswordEmailTemplate,
} from "@/lib/email";
import { getBranding } from "@/lib/branding";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/session";
import { rateLimit } from "@/lib/rate-limit";

function fail(
  code: string,
  message: string,
  field?: string
): ActionResult<never> {
  return { ok: false, error: { code, message, field } };
}

function fromZod(err: z.ZodError): ActionResult<never> {
  const first = err.issues[0];
  return fail(
    "VALIDATION",
    first?.message ?? "Datos no válidos",
    first?.path?.[0] ? String(first.path[0]) : undefined
  );
}

export async function registerAction(
  _prev: ActionResult<{ userId: string }> | null,
  formData: FormData
): Promise<ActionResult<{ userId: string }>> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) return fromZod(parsed.error);

  const { ip } = await getRequestMeta();
  const rl = await rateLimit(`auth:register:${ip ?? "anon"}`, 10, 60);
  if (!rl.ok) return fail("RATE_LIMIT", "Demasiados intentos, espera un momento");

  const exists = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (exists)
    return fail("EMAIL_TAKEN", "Ya existe una cuenta con ese email", "email");

  const passwordHash = await hashPassword(parsed.data.password);
  const verifyToken = crypto.randomBytes(24).toString("hex");

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name ?? null,
      verifyToken,
    },
  });

  // Send verification email (non-blocking failure)
  try {
    const branding = await getBranding();
    const link = `${env.APP_URL}/verify-email?token=${verifyToken}`;
    const tpl = verifyEmailTemplate({
      brandName: branding.name,
      link,
      toName: user.name,
    });
    await sendEmail({ to: user.email, ...tpl });
  } catch (e) {
    logger.error({ err: e }, "verify email send failed");
  }

  const meta = await getRequestMeta();
  const { token, expiresAt } = await signSession(user.id, user.role, meta);
  await setSessionCookie(token, expiresAt);

  return { ok: true, data: { userId: user.id } };
}

export async function loginAction(
  _prev: ActionResult<{ userId: string }> | null,
  formData: FormData
): Promise<ActionResult<{ userId: string }>> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  const { ip } = await getRequestMeta();
  const rl = await rateLimit(`auth:login:${ip ?? "anon"}`, 10, 60);
  if (!rl.ok) return fail("RATE_LIMIT", "Demasiados intentos, espera un momento");

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user) return fail("INVALID_CREDENTIALS", "Email o contraseña incorrectos");

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return fail("INVALID_CREDENTIALS", "Email o contraseña incorrectos");

  const meta = await getRequestMeta();
  const { token, expiresAt } = await signSession(user.id, user.role, meta);
  await setSessionCookie(token, expiresAt);

  return { ok: true, data: { userId: user.id } };
}

export async function logoutAction() {
  await logoutSession();
  redirect("/");
}

export async function forgotPasswordAction(
  _prev: ActionResult<{ sent: true }> | null,
  formData: FormData
): Promise<ActionResult<{ sent: true }>> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  const { ip } = await getRequestMeta();
  const rl = await rateLimit(`auth:forgot:${ip ?? "anon"}`, 10, 60);
  if (!rl.ok) return fail("RATE_LIMIT", "Demasiados intentos, espera un momento");

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Don't reveal whether email exists
  if (user) {
    const resetToken = crypto.randomBytes(24).toString("hex");
    const resetTokenExp = new Date(Date.now() + 60 * 60_000); // 1h
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExp },
    });

    try {
      const branding = await getBranding();
      const link = `${env.APP_URL}/reset-password?token=${resetToken}`;
      const tpl = resetPasswordEmailTemplate({
        brandName: branding.name,
        link,
      });
      await sendEmail({ to: user.email, ...tpl });
    } catch (e) {
      logger.error({ err: e }, "reset password email send failed");
    }
  }

  return { ok: true, data: { sent: true } };
}

export async function resetPasswordAction(
  _prev: ActionResult<{ updated: true }> | null,
  formData: FormData
): Promise<ActionResult<{ updated: true }>> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  const user = await prisma.user.findUnique({
    where: { resetToken: parsed.data.token },
  });
  if (!user || !user.resetTokenExp || user.resetTokenExp < new Date()) {
    return fail("INVALID_TOKEN", "El enlace no es válido o ha caducado");
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExp: null },
  });
  await logoutAllSessionsForUser(user.id);

  return { ok: true, data: { updated: true } };
}

/**
 * Public action used by /r/[slug] landings: prepares a Stripe SetupIntent
 * (no charge) so the landing can collect a card before signup. We don't
 * have a user yet — the customer will be re-attached to the user on signup.
 */
export async function prepareCampaignSetupIntentAction(input: {
  email: string;
  campaignSlug: string;
}): Promise<ActionResult<{ clientSecret: string; stripeCustomerId: string }>> {
  const e = emailSchema.safeParse(input.email);
  if (!e.success) return fail("VALIDATION", "Email no válido", "email");

  // Campaign sanity check
  const campaign = await prisma.campaign.findUnique({
    where: { slug: input.campaignSlug },
  });
  if (!campaign || !campaign.isActive)
    return fail("CAMPAIGN_NOT_FOUND", "Campaña no disponible");
  if (campaign.expiresAt && campaign.expiresAt < new Date())
    return fail("CAMPAIGN_EXPIRED", "Esta campaña ha terminado");

  // Avoid creating duplicate trials for the same email
  const exists = await prisma.user.findUnique({
    where: { email: e.data },
  });
  if (exists) return fail("EMAIL_TAKEN", "Ya existe una cuenta con ese email", "email");

  try {
    const { createSetupIntentForEmail } = await import("@/lib/stripe");
    const { clientSecret, customerId } = await createSetupIntentForEmail({
      email: e.data,
      metadata: { campaignSlug: campaign.slug },
    });
    return {
      ok: true,
      data: { clientSecret, stripeCustomerId: customerId },
    };
  } catch (err) {
    logger.error({ err, email: e.data }, "setup intent create failed");
    return fail(
      "STRIPE_ERROR",
      "No se pudo iniciar el método de pago. Inténtalo de nuevo."
    );
  }
}

/**
 * Sign up a user coming from a campaign landing. By this point the
 * frontend has confirmed the SetupIntent and we have a saved Stripe
 * customer + payment method id.
 */
export async function registerWithCampaignAction(
  _prev: ActionResult<{ userId: string }> | null,
  formData: FormData
): Promise<ActionResult<{ userId: string }>> {
  const { signupWithCampaignSchema } = await import("@/lib/validators");
  const parsed = signupWithCampaignSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
    campaignSlug: formData.get("campaignSlug"),
    stripePaymentMethodId: formData.get("stripePaymentMethodId"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  const { ip } = await getRequestMeta();
  const rl = await rateLimit(`auth:register:${ip ?? "anon"}`, 10, 60);
  if (!rl.ok) return fail("RATE_LIMIT", "Demasiados intentos, espera un momento");

  const campaign = await prisma.campaign.findUnique({
    where: { slug: parsed.data.campaignSlug },
  });
  if (!campaign || !campaign.isActive)
    return fail("CAMPAIGN_NOT_FOUND", "Campaña no disponible");
  if (campaign.expiresAt && campaign.expiresAt < new Date())
    return fail("CAMPAIGN_EXPIRED", "Esta campaña ha terminado");

  const exists = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (exists)
    return fail("EMAIL_TAKEN", "Ya existe una cuenta con ese email", "email");

  // Look up the Stripe customer attached to this PM (we don't trust the
  // client to send the customerId — Stripe gives us the canonical mapping).
  let stripeCustomerId: string | null = null;
  try {
    const { getStripe } = await import("@/lib/stripe");
    const stripe = getStripe();
    const pm = await stripe.paymentMethods.retrieve(
      parsed.data.stripePaymentMethodId
    );
    stripeCustomerId =
      typeof pm.customer === "string"
        ? pm.customer
        : pm.customer?.id ?? null;
    if (!stripeCustomerId) {
      return fail("STRIPE_ERROR", "Método de pago sin cliente asociado");
    }
  } catch (e) {
    logger.error({ err: e }, "retrieve payment method failed");
    return fail("STRIPE_ERROR", "No se pudo validar el método de pago");
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const verifyToken = crypto.randomBytes(24).toString("hex");
  const trialStartedAt = new Date();
  const trialEndsAt = new Date(
    trialStartedAt.getTime() + campaign.trialDays * 86400_000
  );

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name ?? null,
      verifyToken,
      campaignId: campaign.id,
      trialStartedAt,
      trialEndsAt,
      trialPlanId: campaign.targetPlanId,
      stripeCustomerId,
      stripePaymentMethodId: parsed.data.stripePaymentMethodId,
    },
  });

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { signupCount: { increment: 1 } },
  });

  // Best-effort welcome email
  try {
    const branding = await getBranding();
    const link = `${env.APP_URL}/verify-email?token=${verifyToken}`;
    const tpl = verifyEmailTemplate({
      brandName: branding.name,
      link,
      toName: user.name,
    });
    await sendEmail({ to: user.email, ...tpl });
  } catch (e) {
    logger.error({ err: e }, "verify email send failed");
  }

  const meta = await getRequestMeta();
  const { token, expiresAt } = await signSession(user.id, user.role, meta);
  await setSessionCookie(token, expiresAt);

  return { ok: true, data: { userId: user.id } };
}

export async function verifyEmailAction(token: string): Promise<ActionResult<{ verified: true }>> {
  if (!token) return fail("INVALID_TOKEN", "Enlace no válido");

  const user = await prisma.user.findUnique({ where: { verifyToken: token } });
  if (!user) return fail("INVALID_TOKEN", "Enlace no válido o ya usado");

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), verifyToken: null },
  });

  return { ok: true, data: { verified: true } };
}
