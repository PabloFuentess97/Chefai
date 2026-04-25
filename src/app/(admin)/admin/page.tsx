import Link from "next/link";
import { Users, Package, Palette, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { currentPeriodKey } from "@/lib/usage";

export const metadata = { title: "Admin · Resumen" };

export default async function AdminHome() {
  const periodKey = currentPeriodKey();
  const [users, plans, recipesThisMonth, activeSubs, mrrAgg] = await Promise.all([
    prisma.user.count(),
    prisma.plan.count({ where: { isActive: true } }),
    prisma.recipe.count({
      where: { createdAt: { gte: new Date(`${periodKey}-01T00:00:00Z`) } },
    }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      include: { plan: true },
    }),
  ]);

  const mrrCents = mrrAgg.reduce(
    (acc, s) =>
      acc + (s.plan.interval === "MONTH" ? s.plan.priceCents : Math.round(s.plan.priceCents / 12)),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Panel admin
        </h1>
        <p className="text-muted-foreground">
          Resumen del estado de la app.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<Users className="size-4 text-primary" />}
          label="Usuarios"
          value={String(users)}
        />
        <Stat
          icon={<Package className="size-4 text-primary" />}
          label="Suscripciones activas"
          value={String(activeSubs)}
        />
        <Stat
          icon={<TrendingUp className="size-4 text-primary" />}
          label="MRR estimado"
          value={`${(mrrCents / 100).toFixed(2)} €`}
        />
        <Stat
          icon={<Palette className="size-4 text-primary" />}
          label="Recetas este mes"
          value={String(recipesThisMonth)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/admin/plans" />}>
            Editar planes ({plans})
          </Button>
          <Button variant="outline" render={<Link href="/admin/users" />}>
            Gestionar usuarios
          </Button>
          <Button variant="outline" render={<Link href="/admin/branding" />}>
            Branding
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
