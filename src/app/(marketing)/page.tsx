import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PricingCards } from "@/components/landing/pricing-cards";
import { Testimonials } from "@/components/landing/testimonials";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/cta";
import { listPublicPlans } from "@/lib/plans";

export default async function HomePage() {
  const plans = await listPublicPlans();
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <section className="py-20 md:py-28 mx-auto max-w-7xl px-4 md:px-6">
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
