import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles, Check } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";

import { getActiveCampaignBySlug } from "@/lib/campaigns";
import { getCampaignTemplate } from "@/lib/campaign-templates";
import { getBranding } from "@/lib/branding";
import { CampaignSignupForm } from "@/components/landing/campaign-signup-form";
import { CampaignDecoration } from "@/components/landing/campaign-decoration";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const c = await getActiveCampaignBySlug(slug);
  if (!c) return { title: "Campaña no disponible" };
  return {
    title: c.heroTitle ?? c.name,
    description: c.heroSubtitle ?? c.description ?? undefined,
  };
}

export default async function CampaignLandingPage({ params }: Props) {
  const { slug } = await params;
  const campaign = await getActiveCampaignBySlug(slug);
  if (!campaign) notFound();

  // If the admin provided custom HTML, render that instead — escape hatch
  // for full creative control. Defense in depth: even though only the
  // admin can write this field, we sanitize via DOMPurify to neutralize
  // any <script>, on* handlers, javascript: URLs, etc. that would lead
  // to stored XSS if the admin account is ever compromised or if a
  // future SQL injection bug lets attackers write to this column.
  if (campaign.customHtml) {
    const clean = DOMPurify.sanitize(campaign.customHtml, {
      ALLOWED_TAGS: [
        "div", "span", "p", "a", "img", "br", "hr",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "ul", "ol", "li",
        "strong", "em", "b", "i", "u", "s", "small",
        "section", "article", "header", "footer", "main", "nav",
        "blockquote", "code", "pre",
        "table", "thead", "tbody", "tr", "th", "td",
      ],
      ALLOWED_ATTR: [
        "href", "src", "alt", "title",
        "class", "style",
        "target", "rel",
        "width", "height",
        "id",
      ],
      // Block javascript: URLs and inline event handlers
      ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
      FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
      FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus"],
    });
    return (
      <div
        className="min-h-svh bg-background"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  const branding = await getBranding();
  const template = getCampaignTemplate(campaign.templateKey);
  const accent =
    campaign.accentColor ?? template?.accentColor ?? branding.color;
  const gradientFrom = template?.gradientFrom ?? accent;
  const gradientTo = template?.gradientTo ?? accent;
  const decoration = template?.decoration ?? "none";

  const bullets =
    campaign.bulletList
      ?.split("|")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  return (
    <div className="min-h-svh bg-background">
      {/* Top bar — overlays the hero, transparent so the gradient bleeds */}
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="text-base font-bold tracking-wide text-white drop-shadow-sm">
            {branding.name}
          </div>
          <Link
            href="/login"
            className="text-sm text-white/85 hover:text-white"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* Hero with full gradient background */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
        }}
      >
        {/* Decorative motif scattered across the hero */}
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <CampaignDecoration kind={decoration} color="#ffffff" />
        </div>
        {/* Soft radial highlight top-right for depth */}
        <div
          className="absolute -top-32 -right-32 size-[480px] rounded-full opacity-30 blur-3xl"
          style={{ background: "rgba(255,255,255,0.55)" }}
        />
        {/* Vignette at the bottom so the card has contrast */}
        <div
          className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.18) 100%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 pt-28 pb-12 md:pt-32 md:pb-20">
          <div className="grid md:grid-cols-[1.1fr_1fr] gap-10 items-center">
            {/* Left — pitch */}
            <div className="space-y-6">
              {campaign.heroBadge && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/15 text-white backdrop-blur-sm border border-white/25">
                  <Sparkles className="size-3.5" />
                  {campaign.heroBadge}
                </span>
              )}
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-pretty leading-[1.02]">
                {campaign.heroTitle ?? campaign.name}
              </h1>
              {campaign.heroSubtitle && (
                <p className="text-lg md:text-xl text-white/90 text-pretty leading-relaxed max-w-xl">
                  {campaign.heroSubtitle}
                </p>
              )}

              {bullets.length > 0 && (
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 pt-2 max-w-xl">
                  {bullets.map((b, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm md:text-base text-white/95"
                    >
                      <span
                        className="size-5 rounded-full bg-white/20 grid place-items-center shrink-0 mt-0.5"
                        aria-hidden="true"
                      >
                        <Check className="size-3" />
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="pt-3 text-xs md:text-sm text-white/75 max-w-xl">
                {campaign.trialDays} días gratis ·{" "}
                {campaign.trialRecipesPerDay} recetas/día. Al finalizar pasarás
                a <strong className="text-white">{campaign.targetPlan.name}</strong>{" "}
                ({(campaign.targetPlan.priceCents / 100).toFixed(2)} €/
                {campaign.targetPlan.interval === "MONTH" ? "mes" : "año"}).
                Puedes cancelar antes y no se cobra nada.
              </div>
            </div>

            {/* Right — signup card or image */}
            <div className="md:pl-4">
              {campaign.heroImageUrl ? (
                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl">
                  <Image
                    src={campaign.heroImageUrl}
                    alt={campaign.heroTitle ?? campaign.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="rounded-2xl bg-white text-foreground p-6 md:p-7 shadow-2xl ring-1 ring-black/5">
                  <div className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"
                    style={{ color: accent }}>
                    <Sparkles className="size-4" />
                    Empieza ahora
                  </div>
                  <CampaignSignupForm
                    campaignSlug={campaign.slug}
                    ctaLabel={campaign.ctaLabel ?? "Empezar gratis"}
                    brandColor={accent}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Signup form below if hero image used */}
      {campaign.heroImageUrl && (
        <section
          id="signup"
          className="mx-auto max-w-xl px-4 py-12 md:py-16"
        >
          <div
            className="rounded-2xl bg-card p-6 md:p-7 shadow-xl ring-1 ring-black/5"
            style={{
              boxShadow: `0 20px 40px -16px ${accent}40`,
            }}
          >
            <div
              className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"
              style={{ color: accent }}
            >
              <Sparkles className="size-4" />
              Empieza ahora
            </div>
            <CampaignSignupForm
              campaignSlug={campaign.slug}
              ctaLabel={campaign.ctaLabel ?? "Empezar gratis"}
              brandColor={accent}
            />
          </div>
        </section>
      )}

      {/* Trust strip */}
      <section className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TrustItem
            accent={accent}
            title="Sin compromiso"
            body="Cancela cuando quieras desde tu cuenta. Si lo haces antes de que acabe el trial, no se cobra nada."
          />
          <TrustItem
            accent={accent}
            title="Tarjeta segura"
            body="El pago se procesa con Stripe. ChefAI nunca ve ni guarda tu número de tarjeta."
          />
          <TrustItem
            accent={accent}
            title="Tu cocina, tus reglas"
            body="Configura tu dieta —vegano, keto, sin gluten— y la IA respeta cada receta y menú."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 mt-4">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-3">
          <span>
            © {new Date().getFullYear()} {branding.name}
          </span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-foreground">
              Términos
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacidad
            </Link>
            <Link href="/cookies" className="hover:text-foreground">
              Cookies
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TrustItem({
  accent,
  title,
  body,
}: {
  accent: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div
        className="size-9 rounded-lg grid place-items-center mb-3"
        style={{ background: `${accent}15`, color: accent }}
      >
        <Check className="size-4" />
      </div>
      <p className="font-semibold text-sm mb-1">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
