import "server-only";
import type { Plan, User } from "@prisma/client";
import { prisma } from "./db";
import type { PlanFeature } from "@/types/plan";

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

export async function getCurrentPlan(userId: string): Promise<Plan> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  if (
    sub &&
    (sub.status === "ACTIVE" || sub.status === "TRIALING") &&
    sub.currentPeriodEnd > new Date()
  ) {
    return sub.plan;
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

export function canGenerate(plan: Plan, recipesUsedThisMonth: number) {
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
