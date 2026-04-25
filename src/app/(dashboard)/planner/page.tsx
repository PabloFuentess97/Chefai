import Link from "next/link";
import { CalendarDays, CalendarRange, Plus, ShoppingBasket } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Mi menú" };

const dateFmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "long" });

export default async function PlannerListPage() {
  const user = await requireUser();
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
          <Button render={<Link href="/planner/new" />}>
            <Plus className="size-4" />
            Crear menú
          </Button>
        </div>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center space-y-3">
            <CalendarDays className="size-10 mx-auto text-muted-foreground" />
            <h2 className="font-semibold">Aún no tienes ningún menú</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Crea tu primer menú diario o semanal con recetas adaptadas a tu
              objetivo nutricional.
            </p>
            <Button render={<Link href="/planner/new" />}>
              <Plus className="size-4" />
              Crear mi primer menú
            </Button>
          </CardContent>
        </Card>
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
