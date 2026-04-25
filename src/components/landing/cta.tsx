import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function FinalCta() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="rounded-3xl bg-primary text-primary-foreground p-10 md:p-14 text-center space-y-6 relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent_50%)]"
          />
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight relative">
            Empieza a cocinar mejor hoy
          </h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto relative">
            3 recetas gratis al mes, sin tarjeta. Tarda menos en probarlo que
            en pedir comida a domicilio.
          </p>
          <div className="relative">
            <Button
              size="lg"
              variant="secondary"
              render={<Link href="/register" />}
            >
              Crear cuenta gratis
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
