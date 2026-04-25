"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUser, logoutAllSessionsForUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  updateProfileSchema,
  changePasswordSchema,
} from "@/lib/validators";
import type { ActionResult } from "@/types/session";

function fail(code: string, message: string, field?: string): ActionResult<never> {
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

export async function updateProfileAction(
  _prev: ActionResult<{ updated: true }> | null,
  formData: FormData
): Promise<ActionResult<{ updated: true }>> {
  const user = await requireUser();
  const goalRaw = formData.get("preferredGoal");
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    preferredGoal: goalRaw && goalRaw !== "" ? goalRaw : null,
  });
  if (!parsed.success) return fromZod(parsed.error);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      preferredGoal: parsed.data.preferredGoal ?? null,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/generate");
  return { ok: true, data: { updated: true } };
}

export async function changePasswordAction(
  _prev: ActionResult<{ updated: true }> | null,
  formData: FormData
): Promise<ActionResult<{ updated: true }>> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return fail("NOT_FOUND", "Usuario no encontrado");

  const ok = await verifyPassword(parsed.data.currentPassword, dbUser.passwordHash);
  if (!ok)
    return fail("INVALID_CREDENTIALS", "La contraseña actual no es correcta", "currentPassword");

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
  await logoutAllSessionsForUser(user.id);
  return { ok: true, data: { updated: true } };
}
