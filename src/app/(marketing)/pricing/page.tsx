import { PricingCards } from "@/components/landing/pricing-cards";
import { Faq } from "@/components/landing/faq";
import { listPublicPlans } from "@/lib/plans";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Precios — Planes Free, Pro y Chef",
  description:
    "Compara los planes de ChefAI: Free (3 recetas/mes), Pro (50 recetas con imagen y PDF) y Chef (recetas ilimitadas con imagen HD y planificador). Sin compromiso, cancela cuando quieras.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Precios — Planes Free, Pro y Chef · ChefAI",
    description:
      "Compara los planes de ChefAI. Empieza gratis, mejora cuando quieras.",
  },
};

export default async function PricingPage() {
  const plans = await listPublicPlans();
  return (
    <>
      <section className="py-16 md:py-24 mx-auto max-w-7xl px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Elige el plan que cocina contigo
          </h1>
          <p className="text-muted-foreground">
            Sin compromiso. Cancela cuando quieras desde tu panel.
          </p>
        </div>
        <PricingCards plans={plans} />
      </section>
      <Faq />
    </>
  );
}
