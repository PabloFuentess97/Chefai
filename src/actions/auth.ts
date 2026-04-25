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
