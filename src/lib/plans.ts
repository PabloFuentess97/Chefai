import "server-only";
import type { Plan, User } from "@prisma/client";
import { prisma } from "./db";
import type { PlanFeature } from "@/types/plan";
import { isOnActiveTrial } from "./campaigns";

export const FREE_PLAN_SLUG = "free";

export async function listPublicPlans(): Promise<Plan[]> {
  return prisma.plan.findMany({
    where: { isActive: true, isPublic: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getPlanBySlug(slug: string): Promise<Plan | null> {
  return prisma.plan.findUnique({ where: { slug } });
}

export async function getPlanById(id: string): Promise<Plan | null> {
  return prisma.plan.findUnique({ where: { id } });
}

/**
 * Resolve the effective plan for a user. Priority:
 *   1) Active paid subscription → its plan
 *   2) Active trial (campaign) → the trial's target plan (features unlocked,
 *      but monthly limit reset to a synthetic daily cap; see canGenerate)
 *   3) Free plan
 */
export async function getCurrentPlan(userId: string): Promise<Plan> {
  const [sub, user] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        trialEndsAt: true,
        trialChargedAt: true,
        trialPlanId: true,
      },
    }),
  ]);

  if (
    sub &&
    (sub.status === "ACTIVE" || sub.status === "TRIALING") &&
    sub.currentPeriodEnd > new Date()
  ) {
    return sub.plan;
  }

  if (user && isOnActiveTrial(user) && user.trialPlanId) {
    const trialPlan = await prisma.plan.findUnique({
      where: { id: user.trialPlanId },
    });
    if (trialPlan) return trialPlan;
  }

  const free = await prisma.plan.findUnique({
    where: { slug: FREE_PLAN_SLUG },
  });
  if (!free) {
    throw new Error("Free plan missing — run prisma db seed");
  }
  return free;
}

export function planHasFeature(plan: Plan, feature: PlanFeature): boolean {
  return Boolean(plan[feature]);
}

/**
 * Quota check.
 *  - Trial users: enforce a daily cap (campaign.trialRecipesPerDay).
 *    The caller passes `recipesUsedToday` for that branch.
 *  - Regular users: enforce monthly cap. Caller passes `recipesUsedThisMonth`.
 *  - Unlimited (-1) skips the check.
 */
export function canGenerate(
  plan: Plan,
  recipesUsedThisMonth: number,
  trial?: { dailyCap: number; usedToday: number } | null
) {
  if (trial) {
    if (trial.usedToday >= trial.dailyCap) {
      return {
        allowed: false as const,
        reason: `Has alcanzado tu límite diario del trial (${trial.dailyCap} recetas/día). Vuelve mañana o mejora tu plan.`,
      };
    }
    return { allowed: true as const };
  }
  if (plan.recipesPerMonth === -1) return { allowed: true as const };
  if (recipesUsedThisMonth >= plan.recipesPerMonth) {
    return {
      allowed: false as const,
      reason: `Has alcanzado tu límite mensual (${plan.recipesPerMonth} recetas). Mejora tu plan para seguir generando.`,
    };
  }
  return { allowed: true as const };
}

export type UserWithPlan = User & { plan: Plan };
