import "server-only";
import { env } from "@/env";
import { logger } from "./logger";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (env.EMAIL_PROVIDER === "console" || !env.RESEND_API_KEY) {
    logger.info(
      { to: msg.to, subject: msg.subject },
      "[email:console] " + msg.subject
    );
    logger.info({ html: msg.html }, "[email:console] body");
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

export function verifyEmailTemplate(args: {
  brandName: string;
  link: string;
  toName?: string | null;
}) {
  return {
    subject: `Verifica tu cuenta en ${args.brandName}`,
    html: `<!doctype html><html><body style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:24px;color:#0c0a09">
      <h1 style="font-size:22px">Bienvenido a ${args.brandName}${args.toName ? `, ${escapeHtml(args.toName)}` : ""}</h1>
      <p>Confirma tu email haciendo clic en el siguiente botón. El enlace caduca en 24 horas.</p>
      <p style="margin:24px 0"><a href="${escapeHtml(args.link)}" style="background:#16a34a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Verificar email</a></p>
      <p style="color:#78716c;font-size:13px">Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
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
