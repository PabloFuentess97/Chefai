import type { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PricingCards } from "@/components/landing/pricing-cards";
import { Testimonials } from "@/components/landing/testimonials";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/cta";
import { listPublicPlans } from "@/lib/plans";
import { getBranding } from "@/lib/branding";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://chefai.fit";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const FAQ_FOR_SCHEMA = [
  {
    q: "¿Es realmente gratis?",
    a: "Sí. El plan Free incluye 3 recetas al mes sin tarjeta. Puedes pasarte a Pro o Chef cuando quieras.",
  },
  {
    q: "¿Qué hace exactamente la IA?",
    a: "Genera 3 o más recetas distintas adaptadas a tus ingredientes, restricciones y comensales, con foto, ingredientes detallados y nutrición real. La IA es GPT-4 con prompts especializados en cocina.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Cancelas con un clic desde tu panel. Mantienes el acceso hasta el final del periodo facturado y luego pasas a Free.",
  },
  {
    q: "¿Las recetas son seguras para alergias?",
    a: "La IA está instruida con prioridad máxima en respetar la lista de prohibidos. Aun así, revisa siempre el resultado antes de cocinar — la responsabilidad final es tuya.",
  },
  {
    q: "¿Puedo usarlo desde el móvil?",
    a: "Sí. La app es 100% responsive y está optimizada para móvil. No necesitas instalar nada.",
  },
];

export default async function HomePage() {
  const [plans, branding] = await Promise.all([
    listPublicPlans(),
    getBranding(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${APP_URL}/#organization`,
        name: branding.name,
        url: APP_URL,
        logo: `${APP_URL}${branding.logoUrl}`,
        email: branding.supportEmail,
        sameAs: [],
      },
      {
        "@type": "WebSite",
        "@id": `${APP_URL}/#website`,
        url: APP_URL,
        name: branding.name,
        description: branding.tagline,
        publisher: { "@id": `${APP_URL}/#organization` },
        inLanguage: "es-ES",
      },
      {
        "@type": "WebApplication",
        name: branding.name,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Any",
        url: APP_URL,
        description:
          "Generador de recetas con IA según tus ingredientes, alergias y objetivo nutricional (déficit, volumen, definición, ganar músculo). Incluye foto, valores nutricionales y pasos.",
        offers: plans
          .filter((p) => p.priceCents > 0)
          .map((p) => ({
            "@type": "Offer",
            name: p.name,
            price: (p.priceCents / 100).toFixed(2),
            priceCurrency: p.currency,
            availability: "https://schema.org/InStock",
            url: `${APP_URL}/pricing`,
          })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ_FOR_SCHEMA.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.a,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <Features />
      <HowItWorks />
      <section
        id="pricing"
        className="py-20 md:py-28 mx-auto max-w-7xl px-4 md:px-6"
      >
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Planes simples, precios honestos
          </h2>
          <p className="text-muted-foreground">
            Empieza gratis. Mejora cuando quieras más.
          </p>
        </div>
        <PricingCards plans={plans} />
      </section>
      <Testimonials />
      <Faq />
      <FinalCta />
    </>
  );
}
