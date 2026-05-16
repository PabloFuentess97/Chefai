import "server-only";
import type { Campaign, Plan, User } from "@prisma/client";
import { prisma } from "./db";

export type CampaignWithPlan = Campaign & { targetPlan: Plan };

export async function getActiveCampaignBySlug(
  slug: string
): Promise<CampaignWithPlan | null> {
  const c = await prisma.campaign.findUnique({
    where: { slug },
    include: { targetPlan: true },
  });
  if (!c) return null;
  if (!c.isActive) return null;
  if (c.expiresAt && c.expiresAt < new Date()) return null;
  return c;
}

/**
 * True while the user's trial window is still open.
 * Note: this is timestamp-based; we don't tie it to a Subscription row.
 */
export function isOnActiveTrial(user: {
  trialEndsAt: Date | null;
  trialChargedAt: Date | null;
}): boolean {
  if (!user.trialEndsAt) return false;
  if (user.trialChargedAt) return false; // already converted
  return user.trialEndsAt > new Date();
}

/**
 * True when the trial window has closed AND the user wasn't charged yet
 * (auto-charge cron hasn't run, payment failed, or user signed up without
 * card). UI should show a paywall and try to recover the card.
 */
export function isTrialExpiredUnpaid(user: {
  trialEndsAt: Date | null;
  trialChargedAt: Date | null;
}): boolean {
  if (!user.trialEndsAt) return false;
  if (user.trialChargedAt) return false;
  return user.trialEndsAt <= new Date();
}

export function trialDaysRemaining(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  const diff = trialEndsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

/**
 * Look up the campaign attached to a user, only if the user is still
 * in their original trial.
 */
export async function getActiveTrialCampaign(
  user: Pick<User, "campaignId" | "trialEndsAt" | "trialChargedAt">
): Promise<Campaign | null> {
  if (!user.campaignId) return null;
  if (!isOnActiveTrial(user)) return null;
  return prisma.campaign.findUnique({ where: { id: user.campaignId } });
}
