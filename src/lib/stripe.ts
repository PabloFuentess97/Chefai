import "server-only";
import Stripe from "stripe";
import { env } from "@/env";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    typescript: true,
  });
  return _stripe;
}

/**
 * Create (or reuse) a Stripe Customer + SetupIntent so the frontend can
 * collect a card during signup without charging it. Returns the client
 * secret the frontend hands to stripe.js.
 */
export async function createSetupIntentForEmail(input: {
  email: string;
  name?: string | null;
  metadata?: Record<string, string>;
}): Promise<{ customerId: string; clientSecret: string }> {
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: input.email,
    name: input.name ?? undefined,
    metadata: input.metadata,
  });
  const setupIntent = await stripe.setupIntents.create({
    customer: customer.id,
    usage: "off_session",
    payment_method_types: ["card"],
  });
  if (!setupIntent.client_secret) {
    throw new Error("Stripe did not return a SetupIntent client_secret");
  }
  return {
    customerId: customer.id,
    clientSecret: setupIntent.client_secret,
  };
}

/**
 * Charge the user's saved payment method off-session to create the first
 * subscription invoice for their target plan. Called by the trial-expiry
 * worker. Returns the new Stripe subscription id.
 */
export async function chargeTrialAndSubscribe(input: {
  customerId: string;
  paymentMethodId: string;
  stripePriceId: string;
  userId: string;
  planId: string;
}): Promise<{ subscriptionId: string; currentPeriodEnd: Date }> {
  const stripe = getStripe();

  // Make sure the saved PM is the default for future invoices.
  await stripe.customers.update(input.customerId, {
    invoice_settings: { default_payment_method: input.paymentMethodId },
  });

  const subscription = await stripe.subscriptions.create({
    customer: input.customerId,
    items: [{ price: input.stripePriceId }],
    default_payment_method: input.paymentMethodId,
    off_session: true,
    metadata: { userId: input.userId, planId: input.planId, source: "trial-conversion" },
    expand: ["latest_invoice.payment_intent"],
  });

  // Stripe returns the current period end as a unix timestamp on the sub.
  const cpe = (subscription as unknown as { current_period_end?: number })
    .current_period_end;
  const periodEnd = cpe ? new Date(cpe * 1000) : new Date(Date.now() + 30 * 86400_000);
  return { subscriptionId: subscription.id, currentPeriodEnd: periodEnd };
}
