import Link from "next/link";
import { Plus, ExternalLink, Users, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Admin · Campañas" };

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { targetPlan: { select: { name: true, slug: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Campañas
          </h1>
          <p className="text-muted-foreground">
            Landings externas con URL personalizada y trial gratuito que
            convierte automáticamente al plan elegido.
          </p>
        </div>
        <Button render={<Link href="/admin/campaigns/new" />}>
          <Plus className="size-4" />
          Nueva campaña
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <p className="font-semibold">Aún no hay campañas</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Crea tu primera campaña para conseguir signups con URL propia,
              un trial limitado y cobro automático al expirar.
            </p>
            <Button render={<Link href="/admin/campaigns/new" />}>
              <Plus className="size-4" />
              Crear campaña
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {campaigns.map((c) => {
            const conversionRate =
              c.signupCount > 0
                ? Math.round((c.conversionCount / c.signupCount) * 100)
                : 0;
            const expired = c.expiresAt && c.expiresAt < new Date();
            return (
              <Link
                key={c.id}
                href={`/admin/campaigns/${c.id}`}
                className="rounded-xl border bg-card p-4 hover:border-primary hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{c.name}</p>
                      {!c.isActive && <Badge variant="outline">Pausada</Badge>}
                      {expired && <Badge variant="destructive">Expirada</Badge>}
                      {c.isActive && !expired && (
                        <Badge>Activa</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      /r/{c.slug}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Trial: {c.trialDays} días · {c.trialRecipesPerDay}{" "}
                      recetas/día → plan <strong>{c.targetPlan.name}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-5 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Users className="size-4 text-muted-foreground" />
                      <span className="font-semibold tabular-nums">
                        {c.signupCount}
                      </span>
                      <span className="text-muted-foreground">signups</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-primary" />
                      <span className="font-semibold tabular-nums">
                        {c.conversionCount}
                      </span>
                      <span className="text-muted-foreground">
                        ({conversionRate}%)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <a
                    href={`/r/${c.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="size-3" />
                    Ver landing
                  </a>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
