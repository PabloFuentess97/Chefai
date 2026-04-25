import Link from "next/link";
import { Check } from "lucide-react";
import type { Plan } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function planFeatures(plan: Plan): string[] {
  const out: string[] = [];
  out.push(
    plan.recipesPerMonth === -1
      ? "Recetas ilimitadas"
      : `${plan.recipesPerMonth} recetas al mes`
  );
  if (plan.imagesEnabled)
    out.push(
      plan.imageQuality === "hd"
        ? "Imagen HD por receta"
        : "Imagen por receta"
    );
  if (plan.pdfExport) out.push("Exportar a PDF");
  if (plan.shoppingList) out.push("Lista de la compra");
  if (plan.weeklyPlanner) out.push("Planificador semanal");
  if (plan.prioritySupport) out.push("Soporte prioritario");
  return out;
}

export function PricingCards({
  plans,
  emphasizeSlug = "pro",
  ctaHrefForFree = "/register",
  ctaHrefForPaid = "/billing",
}: {
  plans: Plan[];
  emphasizeSlug?: string;
  ctaHrefForFree?: string;
  ctaHrefForPaid?: string;
}) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const isFree = plan.priceCents === 0;
        const emphasized = plan.slug === emphasizeSlug;
        const features = planFeatures(plan);
        return (
          <div
            key={plan.id}
            className={cn(
              "relative rounded-2xl border bg-card p-7 flex flex-col",
              emphasized &&
                "border-primary shadow-xl shadow-primary/10 md:scale-[1.02]"
            )}
          >
            {emphasized && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                Recomendado
              </span>
            )}
            <div className="space-y-1.5">
              <h3 className="font-semibold text-lg">{plan.name}</h3>
              <p className="text-sm text-muted-foreground min-h-[40px]">
                {plan.description}
              </p>
            </div>
            <div className="mt-5 mb-6">
              <span className="text-4xl font-bold">
                {formatPrice(plan.priceCents, plan.currency)}
              </span>
              {!isFree && (
                <span className="text-muted-foreground text-sm">
                  {" "}
                  / {plan.interval === "MONTH" ? "mes" : "año"}
                </span>
              )}
            </div>
            <ul className="space-y-2.5 text-sm flex-1">
              {features.map((f) => (
                <li key={f} className="flex gap-2 items-start">
                  <Check className="size-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-6 w-full"
              variant={emphasized ? "default" : "outline"}
              size="lg"
              render={
                <Link
                  href={
                    isFree
                      ? ctaHrefForFree
                      : `${ctaHrefForPaid}?plan=${plan.slug}`
                  }
                />
              }
            >
              {isFree ? "Empezar gratis" : "Elegir " + plan.name}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
