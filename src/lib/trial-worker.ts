import "server-only";
import { prisma } from "./db";
import { chargeTrialAndSubscribe } from "./stripe";
import { logger } from "./logger";

/**
 * Find every user whose trial has expired and who hasn't been charged yet,
 * then attempt to auto-charge them off-session and create the matching
 * subscription. Run by a periodic worker (every 15 min). Idempotent: if a
 * user already has a subscription row, we skip them.
 */
export async function processExpiredTrials(): Promise<{
  scanned: number;
  charged: number;
  failed: number;
}> {
  const now = new Date();
  const candidates = await prisma.user.findMany({
    where: {
      trialEndsAt: { lte: now },
      trialChargedAt: null,
      stripeCustomerId: { not: null },
      stripePaymentMethodId: { not: null },
      trialPlanId: { not: null },
      subscription: { is: null },
    },
    select: {
      id: true,
      email: true,
      stripeCustomerId: true,
      stripePaymentMethodId: true,
      trialPlanId: true,
      campaignId: true,
    },
    take: 100,
  });

  let charged = 0;
  let failed = 0;
  for (const u of candidates) {
    if (
      !u.stripeCustomerId ||
      !u.stripePaymentMethodId ||
      !u.trialPlanId
    )
      continue;
    const plan = await prisma.plan.findUnique({ where: { id: u.trialPlanId } });
    if (!plan || !plan.stripePriceId) {
      logger.warn(
        { userId: u.id, planId: u.trialPlanId },
        "trial-conversion: target plan has no stripePriceId — skipping"
      );
      failed += 1;
      continue;
    }

    try {
      const { subscriptionId, currentPeriodEnd } =
        await chargeTrialAndSubscribe({
          customerId: u.stripeCustomerId,
          paymentMethodId: u.stripePaymentMethodId,
          stripePriceId: plan.stripePriceId,
          userId: u.id,
          planId: plan.id,
        });

      await prisma.$transaction([
        prisma.subscription.upsert({
          where: { userId: u.id },
          create: {
            userId: u.id,
            planId: plan.id,
            provider: "STRIPE",
            status: "ACTIVE",
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: u.stripeCustomerId,
            currentPeriodStart: new Date(),
            currentPeriodEnd,
          },
          update: {
            planId: plan.id,
            provider: "STRIPE",
            status: "ACTIVE",
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: u.stripeCustomerId,
            currentPeriodStart: new Date(),
            currentPeriodEnd,
            cancelAtPeriodEnd: false,
            canceledAt: null,
          },
        }),
        prisma.user.update({
          where: { id: u.id },
          data: { trialChargedAt: new Date() },
        }),
        u.campaignId
          ? prisma.campaign.update({
              where: { id: u.campaignId },
              data: { conversionCount: { increment: 1 } },
            })
          : prisma.user.update({
              // no-op stub so the transaction array stays uniform
              where: { id: u.id },
              data: {},
            }),
      ]);
      charged += 1;
      logger.info({ userId: u.id, subscriptionId }, "trial-conversion: charged");
    } catch (e) {
      failed += 1;
      logger.error(
        { err: e, userId: u.id, email: u.email },
        "trial-conversion failed — will retry next tick"
      );
    }
  }

  return { scanned: candidates.length, charged, failed };
}
