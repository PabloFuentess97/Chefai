import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.opened"
  | "email.clicked"
  | "email.bounced"
  | "email.complained"
  | "email.delivery_delayed";

type ResendEvent = {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    to?: string[];
    subject?: string;
    tags?: { name: string; value: string }[];
  };
};

/**
 * Verify Resend's Svix-style HMAC signature.
 * https://resend.com/docs/dashboard/webhooks/verify-webhooks
 */
function verifySignature(
  rawBody: string,
  headers: Headers,
  secret: string
): boolean {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  // secret format: whsec_<base64>
  const keyB64 = secret.replace(/^whsec_/, "");
  const key = Buffer.from(keyB64, "base64");
  const expected = crypto
    .createHmac("sha256", key)
    .update(signedContent)
    .digest("base64");

  // svix-signature is space-separated "v1,base64sig v1,base64sig …"
  return svixSignature
    .split(" ")
    .some((sig) => sig.split(",")[1] === expected);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET ?? "";

  // If a secret is configured, verify it. Otherwise allow (dev mode).
  if (secret) {
    if (!verifySignature(raw, req.headers, secret)) {
      logger.warn("resend webhook: bad signature");
      return new NextResponse("bad signature", { status: 401 });
    }
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  const resendId = event.data.email_id;
  if (!resendId) return NextResponse.json({ ok: true });

  try {
    const delivery = await prisma.emailDelivery.findUnique({
      where: { resendId },
      select: { id: true, emailCampaignId: true, status: true },
    });
    if (!delivery) {
      // Transactional emails won't have a delivery row — ignore quietly.
      return NextResponse.json({ ok: true, ignored: true });
    }

    const now = new Date(event.created_at);
    const updates: Parameters<
      typeof prisma.emailDelivery.update
    >[0]["data"] = {};
    const campaignBumps: Record<string, number> = {};

    switch (event.type) {
      case "email.sent":
        if (delivery.status === "queued") {
          updates.status = "sent";
          updates.sentAt = now;
        }
        break;
      case "email.delivered":
        updates.status = "delivered";
        updates.deliveredAt = now;
        campaignBumps.deliveredCount = 1;
        break;
      case "email.opened":
        updates.status = "opened";
        updates.openedAt = now;
        campaignBumps.openedCount = 1;
        break;
      case "email.clicked":
        updates.status = "clicked";
        updates.clickedAt = now;
        campaignBumps.clickedCount = 1;
        break;
      case "email.bounced":
        updates.status = "bounced";
        updates.bouncedAt = now;
        campaignBumps.bouncedCount = 1;
        break;
      case "email.complained":
        updates.status = "complained";
        break;
      default:
        break;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: updates,
      });
    }
    if (Object.keys(campaignBumps).length > 0 && delivery.emailCampaignId) {
      await prisma.emailCampaign.update({
        where: { id: delivery.emailCampaignId },
        data: Object.fromEntries(
          Object.entries(campaignBumps).map(([k, v]) => [k, { increment: v }])
        ),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error({ err: e, resendId }, "resend webhook handler failed");
    return new NextResponse("error", { status: 500 });
  }
}
