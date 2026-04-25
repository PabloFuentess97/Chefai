import "server-only";
import { env } from "@/env";

const BASE = () =>
  env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

let _accessToken: { token: string; expiresAt: number } | null = null;

export async function paypalAccessToken(): Promise<string> {
  if (_accessToken && _accessToken.expiresAt > Date.now() + 30_000) {
    return _accessToken.token;
  }
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials not configured");
  }
  const auth = Buffer.from(
    `${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch(`${BASE()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  _accessToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

export async function paypalFetch<T>(
  url: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const token = await paypalAccessToken();
  const { json, headers, ...rest } = init;
  const res = await fetch(`${BASE()}${url}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`PayPal ${res.status} ${url}: ${body}`);
  }
  return (await res.json()) as T;
}

export type PaypalOrder = {
  id: string;
  status: string;
  links: { rel: string; href: string; method: string }[];
};

export async function createPaypalOrder(args: {
  amountCents: number;
  currency: string;
  referenceId: string;
  description: string;
}): Promise<PaypalOrder> {
  return paypalFetch<PaypalOrder>("/v2/checkout/orders", {
    method: "POST",
    json: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: args.referenceId,
          description: args.description,
          amount: {
            currency_code: args.currency.toUpperCase(),
            value: (args.amountCents / 100).toFixed(2),
          },
        },
      ],
      application_context: {
        return_url: `${env.APP_URL}/billing/paypal/return`,
        cancel_url: `${env.APP_URL}/billing?paypal=cancel`,
        user_action: "PAY_NOW",
      },
    },
  });
}

export async function capturePaypalOrder(orderId: string): Promise<{
  id: string;
  status: string;
  payer: { email_address?: string };
  purchase_units?: Array<{
    payments?: { captures?: Array<{ id: string; amount: { value: string; currency_code: string } }> };
  }>;
}> {
  return paypalFetch(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    json: {},
  });
}

export type WebhookVerifyResponse = { verification_status: "SUCCESS" | "FAILURE" };

export async function verifyPaypalWebhook(args: {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookId: string;
  body: unknown;
}): Promise<boolean> {
  const res = await paypalFetch<WebhookVerifyResponse>(
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      json: {
        auth_algo: args.authAlgo,
        cert_url: args.certUrl,
        transmission_id: args.transmissionId,
        transmission_sig: args.transmissionSig,
        transmission_time: args.transmissionTime,
        webhook_id: args.webhookId,
        webhook_event: args.body,
      },
    }
  );
  return res.verification_status === "SUCCESS";
}
