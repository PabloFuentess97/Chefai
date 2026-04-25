import Link from "next/link";
import {
  Sparkles,
  BookOpen,
  Heart,
  CalendarClock,
  BookMarked,
  ArrowRight,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCurrentPlan } from "@/lib/plans";
import { getUsage } from "@/lib/usage";
import { prisma } from "@/lib/db";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Inicio" };

export default async function DashboardHome() {
  const user = await requireUser();
  const [plan, usage, totalRecipes, favorites, sub] = await Promise.all([
    getCurrentPlan(user.id),
    getUsage(user.id),
    prisma.recipe.count({ where: { userId: user.id } }),
    prisma.recipe.count({ where: { userId: user.id, isFavorite: true } }),
    prisma.subscription.findUnique({
      where: { userId: user.id },
      include: { plan: true },
    }),
  ]);

  const greeting = user.name ? `Hola, ${user.name}` : "Hola de nuevo";

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {greeting}
          </h1>
          <p className="text-muted-foreground">
            ¿Qué cocinamos hoy? Tienes ingredientes esperando.
          </p>
        </div>
        <Button size="lg" render={<Link href="/generate" />}>
          <Sparkles className="size-4" />
          Generar receta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Uso del plan {plan.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UsageMeter
              used={usage.recipesUsed}
              limit={plan.recipesPerMonth}
            />
            <p className="text-xs text-muted-foreground mt-3">
              {plan.recipesPerMonth === -1
                ? "Tu plan no tiene límite de recetas."
                : `Se renueva el primer día del próximo mes.`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BookOpen className="size-4 text-primary" /> Recetas guardadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalRecipes}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Históricas en tu cuenta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Heart className="size-4 text-primary" /> Favoritas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{favorites}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Las que más cocinas
            </p>
          </CardContent>
        </Card>
      </div>

      {sub && sub.status === "ACTIVE" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" /> Próximo cobro
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Plan {sub.plan.name} —{" "}
              {new Intl.DateTimeFormat("es-ES", {
                dateStyle: "long",
              }).format(sub.currentPeriodEnd)}
            </p>
            {sub.cancelAtPeriodEnd && (
              <p className="text-amber-600 mt-1">
                Cancelación programada al final del periodo.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {favorites > 0 && (
        <Card
          className="overflow-hidden border-0 text-white"
          style={{
            background: `linear-gradient(135deg, var(--brand) 0%, color-mix(in oklab, var(--brand) 30%, #000) 100%)`,
          }}
        >
          <CardContent className="p-6 md:p-8 flex flex-wrap items-center gap-6">
            <div className="size-14 grid place-items-center rounded-2xl bg-white/15 backdrop-blur shrink-0">
              <BookMarked className="size-7" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs uppercase tracking-[3px] opacity-80 font-bold">
                Tu recetario
              </p>
              <p className="text-xl md:text-2xl font-bold mt-1 leading-tight">
                Tienes {favorites} {favorites === 1 ? "favorita" : "favoritas"} —
                hazlas libro.
              </p>
              <p className="text-sm opacity-85 mt-1">
                Maquetado tipo revista, listo para imprimir.
              </p>
            </div>
            <Button
              variant="secondary"
              size="lg"
              render={<Link href="/cookbook" />}
            >
              Crear recetario
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Empieza con un clic
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/generate" />}>
            <Sparkles className="size-4" />
            Generar 3 recetas
          </Button>
          <Button variant="outline" render={<Link href="/recipes" />}>
            <BookOpen className="size-4" />
            Ver historial
          </Button>
          <Button variant="outline" render={<Link href="/cookbook" />}>
            <BookMarked className="size-4" />
            Mi recetario
          </Button>
          <Button variant="outline" render={<Link href="/billing" />}>
            Cambiar plan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
