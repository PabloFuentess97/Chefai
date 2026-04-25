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
