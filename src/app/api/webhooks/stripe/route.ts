import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { env } from "@/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
// Disable body parsing — we need the raw body for signature verification
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no signature" }, { status: 400 });
  if (!env.STRIPE_WEBHOOK_SECRET)
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 500 }
    );

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      raw,
      sig,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.warn({ err }, "Stripe signature verification failed");
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscriptionFromStripe(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: "CANCELED", canceledAt: new Date() },
        });
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await recordInvoicePayment(invoice, "succeeded");
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await recordInvoicePayment(invoice, "failed");
        break;
      }
      default:
        logger.info({ type: event.type }, "Unhandled Stripe event");
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error({ err, type: event.type }, "Stripe webhook handler error");
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  if (!userId || !planId) {
    logger.warn({ session: session.id }, "checkout.session.completed missing metadata");
    return;
  }
  if (typeof session.subscription === "string") {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(session.subscription);
    await upsertSubscriptionFromStripe(sub, { userId, planId });
  }
}

async function upsertSubscriptionFromStripe(
  sub: Stripe.Subscription,
  hint?: { userId?: string; planId?: string }
) {
  const userId = hint?.userId ?? (sub.metadata as Record<string, string>)?.userId;
  const planId = hint?.planId ?? (sub.metadata as Record<string, string>)?.planId;
  if (!userId || !planId) {
    logger.warn({ sub: sub.id }, "subscription event missing user/plan metadata");
    return;
  }

  const status = mapStripeStatus(sub.status);
  // Stripe v22 moved billing periods onto subscription items
  const item = sub.items.data[0];
  const periodStart = item?.current_period_start
    ? new Date(item.current_period_start * 1000)
    : new Date();
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : new Date(Date.now() + 30 * 86400_000);

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      planId,
      provider: "STRIPE",
      status,
      stripeSubscriptionId: sub.id,
      stripeCustomerId:
        typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    },
    update: {
      planId,
      provider: "STRIPE",
      status,
      stripeSubscriptionId: sub.id,
      stripeCustomerId:
        typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    },
  });
}

async function recordInvoicePayment(
  invoice: Stripe.Invoice,
  status: "succeeded" | "failed"
) {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
  if (!customerId) return;

  const sub = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (!sub) return;

  await prisma.payment.upsert({
    where: {
      provider_externalId: { provider: "STRIPE", externalId: invoice.id },
    },
    create: {
      userId: sub.userId,
      provider: "STRIPE",
      externalId: invoice.id,
      amountCents: invoice.amount_paid ?? invoice.amount_due ?? 0,
      currency: (invoice.currency ?? "eur").toUpperCase(),
      status,
      rawPayload: invoice as unknown as object,
    },
    update: {
      amountCents: invoice.amount_paid ?? invoice.amount_due ?? 0,
      currency: (invoice.currency ?? "eur").toUpperCase(),
      status,
    },
  });
}

function mapStripeStatus(s: Stripe.Subscription.Status) {
  switch (s) {
    case "active":
      return "ACTIVE" as const;
    case "trialing":
      return "TRIALING" as const;
    case "past_due":
      return "PAST_DUE" as const;
    case "canceled":
    case "unpaid":
      return "CANCELED" as const;
    default:
      return "INCOMPLETE" as const;
  }
}
