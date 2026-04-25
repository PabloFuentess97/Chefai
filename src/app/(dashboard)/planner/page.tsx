import Link from "next/link";
import {
  CalendarDays,
  CalendarRange,
  Plus,
  ShoppingBasket,
  Lock,
  ArrowRight,
  Sparkles,
  ImageIcon,
  Layers,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentPlan, planHasFeature } from "@/lib/plans";

export const metadata = { title: "Mi menú" };

const dateFmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "long" });

export default async function PlannerListPage() {
  const user = await requireUser();
  const plan = await getCurrentPlan(user.id);
  const hasMealPlanner = planHasFeature(plan, "mealPlanner");

  const plans = await prisma.mealPlan.findMany({
    where: { userId: user.id },
    orderBy: { startDate: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Mi menú
          </h1>
          <p className="text-muted-foreground">
            Planifica desayunos, comidas, meriendas y cenas. Diario o semanal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/shopping" />}>
            <ShoppingBasket className="size-4" />
            Lista de la compra
          </Button>
          {hasMealPlanner && (
            <Button render={<Link href="/planner/new" />}>
              <Plus className="size-4" />
              Crear menú
            </Button>
          )}
        </div>
      </div>

      {!hasMealPlanner && <UpgradeCard planName={plan.name} />}

      {plans.length === 0 ? (
        hasMealPlanner ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center space-y-3">
              <CalendarDays className="size-10 mx-auto text-muted-foreground" />
              <h2 className="font-semibold">Aún no tienes ningún menú</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Crea tu primer menú diario o semanal con recetas adaptadas a
                tu objetivo nutricional.
              </p>
              <Button render={<Link href="/planner/new" />}>
                <Plus className="size-4" />
                Crear mi primer menú
              </Button>
            </CardContent>
          </Card>
        ) : null
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <Link
              key={p.id}
              href={`/planner/${p.id}`}
              className="rounded-2xl border bg-card p-5 hover:border-primary hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                {p.type === "WEEKLY" ? (
                  <CalendarRange className="size-5 text-primary" />
                ) : (
                  <CalendarDays className="size-5 text-primary" />
                )}
                <Badge variant={p.type === "WEEKLY" ? "default" : "outline"}>
                  {p.type === "WEEKLY" ? "Semanal" : "Diario"}
                </Badge>
                {p.goal && (
                  <Badge variant="outline" className="text-xs">
                    {p.goal}
                  </Badge>
                )}
              </div>
              <p className="font-semibold">
                {p.type === "WEEKLY" ? "Semana del " : "Menú del "}
                {dateFmt.format(p.startDate)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {p._count.items} platos · {p.servings} comensales
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function UpgradeCard({ planName }: { planName: string }) {
  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-5 text-amber-600" />
          Función Pro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Tu plan actual ({planName}) no incluye la creación de menús. Mejora
          a Pro o Chef para planificar tu semana entera con un solo clic.
        </p>
        <ul className="grid sm:grid-cols-3 gap-3 text-sm">
          <Feat
            icon={<Sparkles className="size-4 text-primary" />}
            title="Plan en segundos"
            body="Desayuno, comida, merienda y cena adaptados a tu objetivo"
          />
          <Feat
            icon={<ImageIcon className="size-4 text-primary" />}
            title="Imágenes incluidas"
            body="Cada plato con foto generada o reutilizada"
          />
          <Feat
            icon={<Layers className="size-4 text-primary" />}
            title="Lista de la compra"
            body="Todos los ingredientes en un clic, deduplicados"
          />
        </ul>
        <Button render={<Link href="/billing" />}>
          Ver planes
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function Feat({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg bg-card border p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="font-semibold text-sm">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-snug">{body}</p>
    </div>
  );
}
