import "server-only";
import { prisma } from "./db";

export function currentPeriodKey(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
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
  periodKey = currentPeriodKey()
) {
  const incRecipes = delta.recipes ?? 0;
  const incImages = delta.images ?? 0;
  const incTokens = delta.tokens ?? 0;
  const incCost = delta.costCents ?? 0;

  return prisma.usageCounter.upsert({
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
}
