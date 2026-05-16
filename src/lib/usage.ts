import "server-only";
import { prisma } from "./db";

export function currentPeriodKey(d: Date = new Date()): string {
  // Local timezone (Europe/Madrid via TZ env in container) so the monthly
  // reset happens at 00:00 local time, not UTC midnight.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Daily counter key, e.g. "2026-05-16". Used for trial users where the
 * quota is per-day, not per-month. Re-uses the UsageCounter table — same
 * userId + periodKey unique constraint.
 */
export function currentDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getDailyUsage(userId: string, dayKey = currentDayKey()) {
  const row = await prisma.usageCounter.findUnique({
    where: { userId_periodKey: { userId, periodKey: dayKey } },
  });
  return row?.recipesUsed ?? 0;
}

export async function getUsage(userId: string, periodKey = currentPeriodKey()) {
  const row = await prisma.usageCounter.findUnique({
    where: { userId_periodKey: { userId, periodKey } },
  });
  return (
    row ?? {
      id: "",
      userId,
      periodKey,
      recipesUsed: 0,
      imagesUsed: 0,
      tokensUsed: 0,
      costCents: 0,
      updatedAt: new Date(),
    }
  );
}

export async function incrementUsage(
  userId: string,
  delta: {
    recipes?: number;
    images?: number;
    tokens?: number;
    costCents?: number;
  },
  opts?: { periodKey?: string; alsoTrackDaily?: boolean }
) {
  const periodKey = opts?.periodKey ?? currentPeriodKey();
  const incRecipes = delta.recipes ?? 0;
  const incImages = delta.images ?? 0;
  const incTokens = delta.tokens ?? 0;
  const incCost = delta.costCents ?? 0;

  const monthly = prisma.usageCounter.upsert({
    where: { userId_periodKey: { userId, periodKey } },
    create: {
      userId,
      periodKey,
      recipesUsed: incRecipes,
      imagesUsed: incImages,
      tokensUsed: incTokens,
      costCents: incCost,
    },
    update: {
      recipesUsed: { increment: incRecipes },
      imagesUsed: { increment: incImages },
      tokensUsed: { increment: incTokens },
      costCents: { increment: incCost },
    },
  });

  if (!opts?.alsoTrackDaily) return monthly;

  const dayKey = currentDayKey();
  const daily = prisma.usageCounter.upsert({
    where: { userId_periodKey: { userId, periodKey: dayKey } },
    create: {
      userId,
      periodKey: dayKey,
      recipesUsed: incRecipes,
      imagesUsed: incImages,
      tokensUsed: incTokens,
      costCents: incCost,
    },
    update: {
      recipesUsed: { increment: incRecipes },
      imagesUsed: { increment: incImages },
      tokensUsed: { increment: incTokens },
      costCents: { increment: incCost },
    },
  });

  const [m] = await Promise.all([monthly, daily]);
  return m;
}
