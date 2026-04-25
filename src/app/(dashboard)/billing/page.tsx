import Link from "next/link";
import { Check } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listPublicPlans, getCurrentPlan } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  StripeCheckoutButton,
  PaypalCheckoutButton,
  StripePortalButton,
  CancelSubscriptionButton,
} from "@/components/dashboard/billing-actions";

export const metadata = { title: "Facturación" };

export default async function BillingPage() {
  const user = await requireUser();
  const [plans, sub, currentPlan] = await Promise.all([
    listPublicPlans(),
    prisma.subscription.findUnique({
      where: { userId: user.id },
      include: { plan: true },
    }),
    getCurrentPlan(user.id),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Facturación
        </h1>
        <p className="text-muted-foreground">
          Gestiona tu suscripción y forma de pago.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tu plan actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl font-bold">{currentPlan.name}</span>
            {sub && sub.status === "ACTIVE" && (
              <Badge>
                Renueva el{" "}
                {new Intl.DateTimeFormat("es-ES").format(sub.currentPeriodEnd)}
              </Badge>
            )}
            {sub?.cancelAtPeriodEnd && (
              <Badge variant="outline">Cancelación programada</Badge>
            )}
          </div>
          {sub && sub.provider === "STRIPE" && (
            <div className="flex flex-wrap gap-2">
              <StripePortalButton />
              {!sub.cancelAtPeriodEnd && <CancelSubscriptionButton />}
            </div>
          )}
          {sub && sub.provider === "PAYPAL" && (
            <p className="text-sm text-muted-foreground">
              Tu suscripción se gestiona desde PayPal. Para cancelar, ve a tu
              cuenta de PayPal y revoca el pago automático.
            </p>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">Cambiar de plan</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const active = plan.id === currentPlan.id;
            const isFree = plan.priceCents === 0;
            return (
              <Card
                key={plan.id}
                className={cn(active && "ring-2 ring-primary")}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    {active && <Badge>Actual</Badge>}
                  </div>
                  <p className="text-2xl font-bold pt-1">
                    {isFree
                      ? "0 €"
                      : new Intl.NumberFormat("es-ES", {
                          style: "currency",
                          currency: plan.currency,
                          minimumFractionDigits: 0,
                        }).format(plan.priceCents / 100)}
                    {!isFree && (
                      <span className="text-sm text-muted-foreground font-normal">
                        {" "}
                        / {plan.interval === "MONTH" ? "mes" : "año"}
                      </span>
                    )}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="text-sm space-y-1.5">
                    <Feat
                      label={
                        plan.recipesPerMonth === -1
                          ? "Recetas ilimitadas"
                          : `${plan.recipesPerMonth} recetas/mes`
                      }
                    />
                    {plan.imagesEnabled && (
                      <Feat
                        label={
                          plan.imageQuality === "hd"
                            ? "Imagen HD"
                            : "Imagen por receta"
                        }
                      />
                    )}
                    {plan.pdfExport && <Feat label="Exportar PDF" />}
                    {plan.shoppingList && <Feat label="Lista de la compra" />}
                    {plan.weeklyPlanner && <Feat label="Planificador semanal" />}
                    {plan.prioritySupport && <Feat label="Soporte prioritario" />}
                  </ul>
                  {!active && (
                    <div className="flex flex-col gap-2">
                      {isFree ? (
                        <Link
                          href="/billing"
                          className="text-sm text-muted-foreground"
                        >
                          Pasarás a Free al final del periodo si cancelas tu
                          plan actual.
                        </Link>
                      ) : (
                        <>
                          <StripeCheckoutButton
                            planSlug={plan.slug}
                            label={`Pagar con tarjeta (Stripe)`}
                          />
                          <PaypalCheckoutButton
                            planSlug={plan.slug}
                            label="Pagar con PayPal"
                          />
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Feat({ label }: { label: string }) {
  return (
    <li className="flex gap-2 items-start">
      <Check className="size-4 text-primary mt-0.5 shrink-0" />
      <span>{label}</span>
    </li>
  );
}
