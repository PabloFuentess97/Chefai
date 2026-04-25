"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getPlanById, getPlanBySlug } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";
import {
  createPaypalOrder,
  capturePaypalOrder,
} from "@/lib/paypal";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/session";

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

export async function createStripeCheckoutAction(input: {
  planSlug?: string;
  planId?: string;
}): Promise<ActionResult<{ url: string }>> {
  const user = await requireUser();
  const plan = input.planSlug
    ? await getPlanBySlug(input.planSlug)
    : input.planId
      ? await getPlanById(input.planId)
      : null;

  if (!plan) return fail("PLAN_NOT_FOUND", "Plan no encontrado");
  if (!plan.stripePriceId)
    return fail(
      "PLAN_NOT_CONFIGURED",
      "Este plan no tiene Stripe configurado todavía."
    );

  const existing = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  let customerId = existing?.stripeCustomerId ?? undefined;
  const stripe = getStripe();
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${env.APP_URL}/billing?stripe=success`,
    cancel_url: `${env.APP_URL}/billing?stripe=cancel`,
    metadata: { userId: user.id, planId: plan.id },
    subscription_data: { metadata: { userId: user.id, planId: plan.id } },
    allow_promotion_codes: true,
  });

  if (!session.url)
    return fail("STRIPE_ERROR", "Stripe no devolvió URL de checkout");

  return { ok: true, data: { url: session.url } };
}

export async function openStripePortalAction(): Promise<
  ActionResult<{ url: string }>
> {
  const user = await requireUser();
  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });
  if (!sub?.stripeCustomerId)
    return fail("NO_SUBSCRIPTION", "No tienes suscripción activa con Stripe");

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${env.APP_URL}/billing`,
  });
  return { ok: true, data: { url: session.url } };
}

export async function cancelSubscriptionAction(): Promise<
  ActionResult<{ canceled: true }>
> {
  const user = await requireUser();
  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });
  if (!sub) return fail("NO_SUBSCRIPTION", "No tienes suscripción activa");

  if (sub.provider === "STRIPE" && sub.stripeSubscriptionId) {
    const stripe = getStripe();
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true, canceledAt: new Date() },
  });
  revalidatePath("/billing");
  return { ok: true, data: { canceled: true } };
}

export async function createPaypalOrderAction(input: {
  planSlug: string;
}): Promise<ActionResult<{ approveUrl: string }>> {
  const user = await requireUser();
  const plan = await getPlanBySlug(input.planSlug);
  if (!plan) return fail("PLAN_NOT_FOUND", "Plan no encontrado");
  if (plan.priceCents === 0)
    return fail("FREE_PLAN", "El plan gratis no requiere pago");

  try {
    const order = await createPaypalOrder({
      amountCents: plan.priceCents,
      currency: plan.currency,
      referenceId: `${user.id}:${plan.id}`,
      description: `Suscripción ${plan.name}`,
    });
    const approve = order.links.find((l) => l.rel === "approve");
    if (!approve) return fail("PAYPAL_ERROR", "PayPal no devolvió URL");
    return { ok: true, data: { approveUrl: approve.href } };
  } catch (e) {
    logger.error({ err: e, userId: user.id }, "PayPal create order failed");
    return fail("PAYPAL_ERROR", "No se pudo iniciar el pago con PayPal");
  }
}

export async function capturePaypalOrderAction(
  orderId: string
): Promise<ActionResult<{ planSlug: string }>> {
  const user = await requireUser();
  try {
    const captured = await capturePaypalOrder(orderId);
    if (captured.status !== "COMPLETED")
      return fail("PAYPAL_ERROR", "Pago no completado");

    const refRaw =
      (captured as unknown as {
        purchase_units?: { reference_id?: string }[];
      }).purchase_units?.[0]?.reference_id ?? "";
    const [refUserId, refPlanId] = refRaw.split(":");
    if (refUserId !== user.id) return fail("MISMATCH", "Usuario no coincide");

    const plan = refPlanId ? await getPlanById(refPlanId) : null;
    if (!plan) return fail("PLAN_NOT_FOUND", "Plan no encontrado");

    const cap = captured.purchase_units?.[0]?.payments?.captures?.[0];
    const amountCents = cap
      ? Math.round(parseFloat(cap.amount.value) * 100)
      : plan.priceCents;
    const currency = cap?.amount.currency_code ?? plan.currency;

    const now = new Date();
    const periodEnd = new Date(now);
    if (plan.interval === "YEAR") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.$transaction(async (tx) => {
      await tx.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          planId: plan.id,
          provider: "PAYPAL",
          status: "ACTIVE",
          paypalSubscriptionId: orderId,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        update: {
          planId: plan.id,
          provider: "PAYPAL",
          status: "ACTIVE",
          paypalSubscriptionId: orderId,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
      });
      await tx.payment.upsert({
        where: { provider_externalId: { provider: "PAYPAL", externalId: orderId } },
        create: {
          userId: user.id,
          provider: "PAYPAL",
          externalId: orderId,
          amountCents,
          currency,
          status: "succeeded",
          rawPayload: captured as unknown as object,
        },
        update: {
          amountCents,
          currency,
          status: "succeeded",
        },
      });
    });

    revalidatePath("/billing");
    return { ok: true, data: { planSlug: plan.slug } };
  } catch (e) {
    logger.error({ err: e, userId: user.id }, "PayPal capture failed");
    return fail("PAYPAL_ERROR", "No se pudo capturar el pago");
  }
}

export async function gotoStripeCheckout(planSlug: string) {
  const res = await createStripeCheckoutAction({ planSlug });
  if (!res.ok) throw new Error(res.error.message);
  redirect(res.data.url);
}
