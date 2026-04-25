import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/db";
import { getCurrentPlan } from "@/lib/plans";
import { getUsage } from "@/lib/usage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserControls } from "@/components/admin/user-controls";

export const metadata = { title: "Admin · Usuario" };

type Props = { params: Promise<{ id: string }> };

const dateFmt = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;

  const [user, plans] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: true } },
      },
    }),
    prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  if (!user) notFound();

  const [currentPlan, usage, recipesCount, paymentsCount] = await Promise.all([
    getCurrentPlan(user.id),
    getUsage(user.id),
    prisma.recipe.count({ where: { userId: user.id } }),
    prisma.payment.count({ where: { userId: user.id } }),
  ]);

  const sub = user.subscription;
  const hasActiveSub =
    !!sub &&
    (sub.status === "ACTIVE" || sub.status === "TRIALING") &&
    sub.currentPeriodEnd > new Date();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver a usuarios
      </Link>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight break-all">
          {user.name ?? user.email}
        </h1>
        <p className="text-muted-foreground break-all">{user.email}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
            {user.role}
          </Badge>
          <Badge variant="outline">Plan: {currentPlan.name}</Badge>
          {user.emailVerifiedAt ? (
            <Badge variant="outline">Email verificado</Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600">
              Sin verificar
            </Badge>
          )}
          {sub && (
            <Badge
              variant={
                sub.status === "ACTIVE" || sub.status === "TRIALING"
                  ? "default"
                  : "outline"
              }
            >
              Sub: {sub.status} ({sub.provider})
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Alta" value={dateFmt.format(user.createdAt)} small />
        <Stat label="Total recetas" value={String(recipesCount)} />
        <Stat label="Recetas este mes" value={String(usage.recipesUsed)} />
        <Stat label="Pagos registrados" value={String(paymentsCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <UserControls
            userId={user.id}
            currentName={user.name}
            currentRole={user.role}
            currentPlanSlug={currentPlan.slug}
            hasActiveSubscription={hasActiveSub}
            plans={plans}
          />
        </CardContent>
      </Card>

      {sub && (
        <Card>
          <CardHeader>
            <CardTitle>Detalles de suscripción</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <Row label="Plan" value={sub.plan.name} />
            <Row label="Provider" value={sub.provider} />
            <Row label="Estado" value={sub.status} />
            <Row
              label="Periodo actual"
              value={`${dateFmt.format(sub.currentPeriodStart)} → ${dateFmt.format(sub.currentPeriodEnd)}`}
            />
            {sub.cancelAtPeriodEnd && (
              <Row label="Cancelación" value="al final del periodo" />
            )}
            {sub.stripeSubscriptionId && (
              <Row
                label="Stripe Subscription"
                value={sub.stripeSubscriptionId}
              />
            )}
            {sub.paypalSubscriptionId && (
              <Row label="PayPal" value={sub.paypalSubscriptionId} />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Uso este mes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4 text-sm">
          <Mini label="Recetas" value={usage.recipesUsed} />
          <Mini label="Imágenes" value={usage.imagesUsed} />
          <Mini label="Tokens" value={usage.tokensUsed} />
          <Mini
            label="Coste"
            value={`${(usage.costCents / 100).toFixed(2)} €`}
          />
        </CardContent>
      </Card>

      <div>
        <Button variant="outline" render={<Link href="/admin/users" />}>
          ← Volver a la lista
        </Button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
          {label}
        </p>
        <p className={small ? "text-sm font-semibold mt-1" : "text-2xl font-bold mt-1"}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium font-mono text-xs sm:text-sm break-all text-right">
        {value}
      </span>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
