import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles, Check } from "lucide-react";

import { getActiveCampaignBySlug } from "@/lib/campaigns";
import { getBranding } from "@/lib/branding";
import { CampaignSignupForm } from "@/components/landing/campaign-signup-form";

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
  // for full creative control. Mind the security implications (admin-only).
  if (campaign.customHtml) {
    return (
      <div
        className="min-h-svh bg-background"
        dangerouslySetInnerHTML={{ __html: campaign.customHtml }}
      />
    );
  }

  const branding = await getBranding();
  const bullets =
    campaign.bulletList
      ?.split("|")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  return (
    <div className="min-h-svh bg-background">
      {/* Top bar */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-bold tracking-wide">{branding.name}</div>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pt-12 pb-8 md:pt-20 md:pb-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            {campaign.heroBadge && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{
                  background: `${branding.color}1f`,
                  color: branding.color,
                }}
              >
                <Sparkles className="size-3.5" />
                {campaign.heroBadge}
              </span>
            )}
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-pretty">
              {campaign.heroTitle ?? campaign.name}
            </h1>
            {campaign.heroSubtitle && (
              <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
                {campaign.heroSubtitle}
              </p>
            )}

            {bullets.length > 0 && (
              <ul className="space-y-2 pt-2">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check
                      className="size-4 mt-0.5 shrink-0"
                      style={{ color: branding.color }}
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-3 text-xs text-muted-foreground">
              Hoy {campaign.trialDays} días gratis · {campaign.trialRecipesPerDay} recetas/día ·
              al finalizar pasarás a <strong>{campaign.targetPlan.name}</strong>{" "}
              ({(campaign.targetPlan.priceCents / 100).toFixed(2)} €/
              {campaign.targetPlan.interval === "MONTH" ? "mes" : "año"}).
              Puedes cancelar antes y no se cobra nada.
            </div>
          </div>

          {/* Right column — image or signup */}
          <div>
            {campaign.heroImageUrl ? (
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border bg-muted">
                <Image
                  src={campaign.heroImageUrl}
                  alt={campaign.heroTitle ?? campaign.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ) : (
              <div
                className="rounded-2xl border p-6 bg-card shadow-sm"
                style={{
                  borderColor: `${branding.color}40`,
                  boxShadow: `0 10px 30px -10px ${branding.color}26`,
                }}
              >
                <CampaignSignupForm
                  campaignSlug={campaign.slug}
                  ctaLabel={campaign.ctaLabel ?? "Empezar gratis"}
                  brandColor={branding.color}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Signup form below if hero image used */}
      {campaign.heroImageUrl && (
        <section
          id="signup"
          className="mx-auto max-w-xl px-4 pb-20 -mt-2"
        >
          <div
            className="rounded-2xl border p-6 bg-card shadow-sm"
            style={{
              borderColor: `${branding.color}40`,
              boxShadow: `0 10px 30px -10px ${branding.color}26`,
            }}
          >
            <CampaignSignupForm
              campaignSlug={campaign.slug}
              ctaLabel={campaign.ctaLabel ?? "Empezar gratis"}
              brandColor={branding.color}
            />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border/60 mt-12">
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
