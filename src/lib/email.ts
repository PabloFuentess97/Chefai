import "server-only";
import { env } from "@/env";
import { logger } from "./logger";
import { sendOne } from "./email-send";
import { getEmailTemplate } from "./email-templates";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Legacy raw-HTML sender. New code should use sendTransactional() below
 * which renders via the template registry. Kept for backwards compatibility
 * with auth flows that still pass raw HTML.
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (env.EMAIL_PROVIDER === "console" || !env.RESEND_API_KEY) {
    logger.info(
      { to: msg.to, subject: msg.subject },
      "[email:console] " + msg.subject
    );
    return;
  }
  if (env.EMAIL_PROVIDER === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error({ status: res.status, body }, "Resend email failed");
      throw new Error("Email send failed");
    }
  }
}

/**
 * High-level transactional sender. Looks up the template, renders with vars
 * and overrides, sends via Resend.
 */
export async function sendTransactional(args: {
  to: string;
  toUserId?: string | null;
  templateKey: string;
  subjectOverride?: string;
  preheaderOverride?: string;
  heroTitleOverride?: string;
  heroBodyOverride?: string;
  ctaUrlOverride?: string;
  vars?: Record<string, string>;
}): Promise<{ ok: boolean; resendId?: string | undefined }> {
  const tpl = getEmailTemplate(args.templateKey);
  if (!tpl) {
    logger.error(
      { templateKey: args.templateKey },
      "sendTransactional: unknown template"
    );
    return { ok: false };
  }
  const result = await sendOne({
    toEmail: args.to,
    toUserId: args.toUserId ?? null,
    templateKey: tpl.key,
    accentColor: tpl.accentColor,
    subject: args.subjectOverride ?? tpl.defaults.subject,
    preheader: args.preheaderOverride ?? tpl.defaults.preheader,
    heroBadge: tpl.defaults.heroBadge,
    heroTitle: args.heroTitleOverride ?? tpl.defaults.heroTitle,
    heroBody: args.heroBodyOverride ?? tpl.defaults.heroBody,
    ctaLabel: tpl.defaults.ctaLabel,
    ctaUrl: args.ctaUrlOverride ?? tpl.defaults.ctaUrl,
    vars: args.vars,
  });
  return { ok: result.ok, resendId: result.resendId };
}

// Backwards-compatible helpers (still used by auth flows)

export function verifyEmailTemplate(args: {
  brandName: string;
  link: string;
  toName?: string | null;
}) {
  return {
    subject: `Verifica tu email en ${args.brandName}`,
    html: `<!doctype html><html><body style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:24px;color:#0c0a09">
      <h1 style="font-size:22px">Verifica tu cuenta</h1>
      <p>Hola${args.toName ? ` ${escapeHtml(args.toName)}` : ""}, confirma tu email haciendo clic en el siguiente botón. El enlace caduca en 24 horas.</p>
      <p style="margin:24px 0"><a href="${escapeHtml(args.link)}" style="background:#16a34a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Verificar email</a></p>
      <p style="color:#78716c;font-size:13px">Si no creaste esta cuenta, ignora este mensaje.</p>
    </body></html>`,
    text: `Confirma tu email en ${args.brandName}: ${args.link}`,
  };
}

export function resetPasswordEmailTemplate(args: {
  brandName: string;
  link: string;
}) {
  return {
    subject: `Restablece tu contraseña en ${args.brandName}`,
    html: `<!doctype html><html><body style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:24px;color:#0c0a09">
      <h1 style="font-size:22px">Restablecer contraseña</h1>
      <p>Hemos recibido una solicitud para restablecer tu contraseña en ${args.brandName}. El enlace caduca en 1 hora.</p>
      <p style="margin:24px 0"><a href="${escapeHtml(args.link)}" style="background:#16a34a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Cambiar contraseña</a></p>
      <p style="color:#78716c;font-size:13px">Si no la solicitaste, ignora este mensaje.</p>
    </body></html>`,
    text: `Restablecer contraseña en ${args.brandName}: ${args.link}`,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
