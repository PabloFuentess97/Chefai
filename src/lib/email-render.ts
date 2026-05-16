import "server-only";
import { getEmailTemplate, type EmailTemplateMeta } from "./email-templates";
import { env } from "@/env";

export type EmailRenderInput = {
  templateKey: string;
  accentColor?: string | null;
  subject: string;
  preheader?: string | null;
  heroBadge?: string | null;
  heroTitle?: string | null;
  heroBody?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  imageUrl?: string | null;
  // Per-recipient context
  vars?: Record<string, string>;
  unsubscribeUrl?: string | null;
  brandName: string;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyVars(input: string, vars: Record<string, string>): string {
  return input.replace(/\{(\w+)\}/g, (_m, k: string) =>
    vars[k] !== undefined ? vars[k] : `{${k}}`
  );
}

function absoluteUrl(maybePath: string): string {
  if (!maybePath) return env.APP_URL ?? "https://chefai.fit";
  if (/^https?:\/\//.test(maybePath)) return maybePath;
  const base = (env.APP_URL ?? "https://chefai.fit").replace(/\/$/, "");
  return `${base}${maybePath.startsWith("/") ? "" : "/"}${maybePath}`;
}

/**
 * Convert plain-text body (with \n\n paragraphs and \n single breaks) into
 * email-safe HTML paragraphs.
 */
function bodyToHtml(body: string): string {
  return body
    .split(/\n\s*\n/)
    .map((p) => {
      const escaped = escapeHtml(p.trim()).replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#27272a">${escaped}</p>`;
    })
    .join("");
}

function decorationBand(glyph: string, color: string): string {
  // Render a colored band with a row of repeated emoji glyphs at low opacity.
  // Reliable on Gmail/Apple Mail/Outlook because emoji are font characters.
  const row = Array.from({ length: 9 })
    .map(() => `<span style="margin:0 8px">${glyph}</span>`)
    .join("");
  return `
<tr><td style="padding:0">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${color}">
    <tr>
      <td align="center" style="padding:18px 24px;color:rgba(255,255,255,0.6);font-size:18px;letter-spacing:6px">
        ${row}
      </td>
    </tr>
  </table>
</td></tr>`;
}

export function renderEmail(input: EmailRenderInput): RenderedEmail {
  const tpl: EmailTemplateMeta | null = getEmailTemplate(input.templateKey);
  const accent = input.accentColor || tpl?.accentColor || "#16a34a";
  const decoration = tpl?.decorationGlyph || "•";
  const vars = input.vars ?? {};

  const subjectRaw = applyVars(input.subject, vars);
  const preheader = applyVars(input.preheader ?? "", vars);
  const heroBadge = applyVars(input.heroBadge ?? "", vars);
  const heroTitle = applyVars(input.heroTitle ?? "", vars);
  const heroBody = applyVars(input.heroBody ?? "", vars);
  const ctaLabel = applyVars(input.ctaLabel ?? "", vars);
  const ctaUrlRaw = applyVars(input.ctaUrl ?? "", vars);
  const ctaUrl = ctaUrlRaw ? absoluteUrl(ctaUrlRaw) : "";

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<title>${escapeHtml(subjectRaw)}</title>
</head>
<body style="margin:0;padding:0;background-color:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0c0a09">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fafaf9">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.04)">
        <!-- Brand header -->
        <tr>
          <td style="padding:20px 28px;border-bottom:1px solid #e7e5e4">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="font-size:14px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${accent}">
                  ${escapeHtml(input.brandName)}
                </td>
                <td align="right" style="font-size:11px;color:#78716c">
                  Cocina con lo que tienes
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${decorationBand(decoration, accent)}

        <!-- Body -->
        <tr><td style="padding:36px 28px 12px 28px">
          ${
            heroBadge
              ? `<div style="display:inline-block;padding:6px 12px;border-radius:999px;background:${accent}1f;color:${accent};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:18px">${escapeHtml(heroBadge)}</div>`
              : ""
          }
          ${
            heroTitle
              ? `<h1 style="margin:0 0 18px 0;font-size:28px;line-height:1.15;font-weight:700;color:#0c0a09;letter-spacing:-0.5px">${escapeHtml(heroTitle)}</h1>`
              : ""
          }
          ${heroBody ? bodyToHtml(heroBody) : ""}

          ${
            input.imageUrl
              ? `<div style="margin:24px 0 8px 0"><img src="${escapeHtml(absoluteUrl(input.imageUrl))}" alt="" style="display:block;width:100%;max-width:544px;height:auto;border-radius:12px" /></div>`
              : ""
          }

          ${
            ctaLabel && ctaUrl
              ? `<div style="margin:28px 0 8px 0">
                  <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 26px;background-color:${accent};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:10px;line-height:1">
                    ${escapeHtml(ctaLabel)}
                  </a>
                </div>`
              : ""
          }
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:32px 28px;border-top:1px solid #e7e5e4;background-color:#fafaf9">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="font-size:12px;color:#78716c;line-height:1.6">
                Recibes este email porque tienes una cuenta en ${escapeHtml(input.brandName)}.<br/>
                ${
                  input.unsubscribeUrl
                    ? `Si no quieres recibir más emails de marketing, <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#78716c;text-decoration:underline">date de baja aquí</a>.`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding-top:14px;font-size:11px;color:#a8a29e">
                © ${new Date().getFullYear()} ${escapeHtml(input.brandName)}.
                <a href="${absoluteUrl("/terms")}" style="color:#a8a29e;text-decoration:underline;margin-left:6px">Términos</a> ·
                <a href="${absoluteUrl("/privacy")}" style="color:#a8a29e;text-decoration:underline">Privacidad</a>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Plain-text fallback
  const text = [
    heroTitle,
    "",
    heroBody.replace(/\n/g, "\n"),
    "",
    ctaLabel && ctaUrl ? `${ctaLabel}: ${ctaUrl}` : "",
    "",
    "—",
    input.brandName,
    input.unsubscribeUrl ? `Date de baja: ${input.unsubscribeUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: subjectRaw, html, text };
}
