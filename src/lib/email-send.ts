import "server-only";
import crypto from "node:crypto";
import { prisma } from "./db";
import { env } from "@/env";
import { logger } from "./logger";
import { getBranding } from "./branding";
import { renderEmail, type EmailRenderInput } from "./email-render";

export type SendOneInput = Omit<EmailRenderInput, "brandName" | "unsubscribeUrl"> & {
  toEmail: string;
  toUserId?: string | null;
  emailCampaignId?: string | null;
};

/** Low-level send via Resend. Creates an EmailDelivery row when given a campaignId. */
export async function sendOne(input: SendOneInput): Promise<{
  ok: boolean;
  resendId?: string;
  error?: string;
}> {
  const branding = await getBranding();
  // Build per-recipient unsubscribe URL if we have a user id
  let unsubscribeUrl: string | null = null;
  if (input.toUserId) {
    const token = await ensureUnsubscribeToken(input.toUserId);
    unsubscribeUrl = `${env.APP_URL ?? "https://chefai.fit"}/unsubscribe?token=${token}`;
  }

  const rendered = renderEmail({
    ...input,
    brandName: branding.name,
    unsubscribeUrl,
  });

  // Console fallback (dev / no Resend key)
  if (env.EMAIL_PROVIDER === "console" || !env.RESEND_API_KEY) {
    logger.info(
      { to: input.toEmail, subject: rendered.subject },
      "[email:console] " + rendered.subject
    );
    if (input.emailCampaignId) {
      await prisma.emailDelivery.create({
        data: {
          emailCampaignId: input.emailCampaignId,
          userId: input.toUserId ?? null,
          toEmail: input.toEmail,
          status: "sent",
          sentAt: new Date(),
        },
      });
    }
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: input.toEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        // Tag for analytics + webhook attribution
        tags: input.emailCampaignId
          ? [{ name: "campaign_id", value: input.emailCampaignId }]
          : [{ name: "kind", value: "transactional" }],
        headers: unsubscribeUrl
          ? { "List-Unsubscribe": `<${unsubscribeUrl}>` }
          : undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error(
        { status: res.status, body, to: input.toEmail },
        "resend send failed"
      );
      if (input.emailCampaignId) {
        await prisma.emailDelivery.create({
          data: {
            emailCampaignId: input.emailCampaignId,
            userId: input.toUserId ?? null,
            toEmail: input.toEmail,
            status: "failed",
            errorMessage: body.slice(0, 500),
          },
        });
      }
      return { ok: false, error: body };
    }

    const data = (await res.json()) as { id?: string };
    const resendId = data.id;
    if (input.emailCampaignId) {
      await prisma.emailDelivery.create({
        data: {
          emailCampaignId: input.emailCampaignId,
          userId: input.toUserId ?? null,
          toEmail: input.toEmail,
          resendId: resendId ?? null,
          status: "sent",
          sentAt: new Date(),
        },
      });
    }
    return { ok: true, resendId };
  } catch (e) {
    logger.error({ err: e, to: input.toEmail }, "resend send threw");
    if (input.emailCampaignId) {
      await prisma.emailDelivery.create({
        data: {
          emailCampaignId: input.emailCampaignId,
          userId: input.toUserId ?? null,
          toEmail: input.toEmail,
          status: "failed",
          errorMessage:
            e instanceof Error ? e.message.slice(0, 500) : "unknown",
        },
      });
    }
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

async function ensureUnsubscribeToken(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailUnsubscribeToken: true },
  });
  if (u?.emailUnsubscribeToken) return u.emailUnsubscribeToken;
  const token = crypto.randomBytes(20).toString("hex");
  await prisma.user.update({
    where: { id: userId },
    data: { emailUnsubscribeToken: token },
  });
  return token;
}

/**
 * Resolve the recipient list for a campaign based on its audience filter.
 * Returns user rows (id, email, name) for personalization.
 */
export type Recipient = {
  id: string;
  email: string;
  name: string | null;
};

export async function resolveAudience(args: {
  audienceMode:
    | "ALL_USERS"
    | "NEWSLETTER_OPT_IN"
    | "PLAN"
    | "ACQUISITION_CAMPAIGN"
    | "DIETARY_PROFILE";
  audiencePlanId?: string | null;
  audienceAcqCampaignId?: string | null;
  audienceDietary?: string | null;
}): Promise<Recipient[]> {
  const base = {
    // Always skip unsubscribed users (transactional code paths don't call this)
    unsubscribedAt: null as Date | null,
  };

  switch (args.audienceMode) {
    case "ALL_USERS":
      return prisma.user.findMany({
        where: base,
        select: { id: true, email: true, name: true },
      });
    case "NEWSLETTER_OPT_IN":
      return prisma.user.findMany({
        where: { ...base, newsletterOptIn: true },
        select: { id: true, email: true, name: true },
      });
    case "PLAN": {
      if (!args.audiencePlanId) return [];
      return prisma.user.findMany({
        where: {
          ...base,
          subscription: {
            planId: args.audiencePlanId,
            status: { in: ["ACTIVE", "TRIALING"] },
          },
        },
        select: { id: true, email: true, name: true },
      });
    }
    case "ACQUISITION_CAMPAIGN": {
      if (!args.audienceAcqCampaignId) return [];
      return prisma.user.findMany({
        where: { ...base, campaignId: args.audienceAcqCampaignId },
        select: { id: true, email: true, name: true },
      });
    }
    case "DIETARY_PROFILE": {
      if (!args.audienceDietary) return [];
      return prisma.user.findMany({
        where: { ...base, dietaryProfile: args.audienceDietary },
        select: { id: true, email: true, name: true },
      });
    }
    default:
      return [];
  }
}

/**
 * Send an entire email campaign in batches. Updates counters and status.
 * Idempotent: only sends to users who don't yet have an EmailDelivery row
 * for this campaign.
 */
export async function sendCampaignNow(campaignId: string): Promise<{
  recipients: number;
  sent: number;
  failed: number;
}> {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status === "SENT") {
    return {
      recipients: campaign.recipientCount,
      sent: campaign.sentCount,
      failed: campaign.failedCount,
    };
  }

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { status: "SENDING" },
  });

  try {
    const recipients = await resolveAudience({
      audienceMode: campaign.audienceMode,
      audiencePlanId: campaign.audiencePlanId,
      audienceAcqCampaignId: campaign.audienceAcqCampaignId,
      audienceDietary: campaign.audienceDietary,
    });

    // Skip people who already received this campaign
    const already = await prisma.emailDelivery.findMany({
      where: { emailCampaignId: campaign.id },
      select: { userId: true },
    });
    const skipUserIds = new Set(
      already.map((d) => d.userId).filter((id): id is string => !!id)
    );
    const todo = recipients.filter((r) => !skipUserIds.has(r.id));

    let sent = 0;
    let failed = 0;

    // Resend's free tier is 100 emails/sec — we cap at 8/sec for safety.
    const CHUNK = 8;
    for (let i = 0; i < todo.length; i += CHUNK) {
      const chunk = todo.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map(async (r) => {
          const result = await sendOne({
            emailCampaignId: campaign.id,
            toEmail: r.email,
            toUserId: r.id,
            templateKey: campaign.templateKey,
            accentColor: campaign.accentColor,
            subject: campaign.subject,
            preheader: campaign.preheader,
            heroBadge: campaign.heroBadge,
            heroTitle: campaign.heroTitle,
            heroBody: campaign.heroBody,
            ctaLabel: campaign.ctaLabel,
            ctaUrl: campaign.ctaUrl,
            imageUrl: campaign.imageUrl,
            vars: {
              name: r.name ?? "chef",
              email: r.email,
            },
          });
          if (result.ok) sent += 1;
          else failed += 1;
        })
      );
      if (i + CHUNK < todo.length) {
        await new Promise((res) => setTimeout(res, 1100));
      }
    }

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        recipientCount: recipients.length,
        sentCount: { increment: sent },
        failedCount: { increment: failed },
      },
    });

    return { recipients: recipients.length, sent, failed };
  } catch (e) {
    logger.error({ err: e, campaignId }, "sendCampaignNow failed");
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: "FAILED" },
    });
    throw e;
  }
}
