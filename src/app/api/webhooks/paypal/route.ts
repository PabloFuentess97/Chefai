import { NextResponse, type NextRequest } from "next/server";
import { verifyPaypalWebhook } from "@/lib/paypal";
import { env } from "@/env";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!env.PAYPAL_WEBHOOK_ID)
    return NextResponse.json(
      { error: "PAYPAL_WEBHOOK_ID not configured" },
      { status: 500 }
    );

  const text = await req.text();
  const body = JSON.parse(text);

  const headers = {
    authAlgo: req.headers.get("paypal-auth-algo") ?? "",
    certUrl: req.headers.get("paypal-cert-url") ?? "",
    transmissionId: req.headers.get("paypal-transmission-id") ?? "",
    transmissionSig: req.headers.get("paypal-transmission-sig") ?? "",
    transmissionTime: req.headers.get("paypal-transmission-time") ?? "",
  };

  let verified = false;
  try {
    verified = await verifyPaypalWebhook({
      ...headers,
      webhookId: env.PAYPAL_WEBHOOK_ID,
      body,
    });
  } catch (e) {
    logger.error({ err: e }, "PayPal verification call failed");
  }
  if (!verified)
    return NextResponse.json(
      { error: "verification failed" },
      { status: 400 }
    );

  try {
    switch (body.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED": {
        const cap = body.resource;
        await prisma.payment
          .updateMany({
            where: { provider: "PAYPAL", externalId: cap.id },
            data: { status: "succeeded", rawPayload: cap },
          })
          .catch(() => undefined);
        break;
      }
      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.REFUNDED": {
        const cap = body.resource;
        await prisma.payment
          .updateMany({
            where: { provider: "PAYPAL", externalId: cap.id },
            data: { status: "failed", rawPayload: cap },
          })
          .catch(() => undefined);
        break;
      }
      default:
        logger.info(
          { event: body.event_type },
          "Unhandled PayPal webhook event"
        );
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error({ err }, "PayPal webhook handler error");
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }
}
