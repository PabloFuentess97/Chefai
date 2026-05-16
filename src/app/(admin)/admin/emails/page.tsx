import Link from "next/link";
import { Plus, Mail, Send, Calendar, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEmailTemplate } from "@/lib/email-templates";

export const metadata = { title: "Admin · Emails" };

const fmt = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function EmailCampaignsPage() {
  const campaigns = await prisma.emailCampaign.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Email campaigns
          </h1>
          <p className="text-muted-foreground">
            Newsletter, lanzamientos y emails temáticos con plantillas
            preconfiguradas.
          </p>
        </div>
        <Button render={<Link href="/admin/emails/new" />}>
          <Plus className="size-4" />
          Nuevo email
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Mail className="size-8 mx-auto text-muted-foreground" />
            <p className="font-semibold">Aún no hay campañas de email</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Elige una plantilla, escribe el copy, filtra la audiencia y
              envíalo ahora o programado para más tarde.
            </p>
            <Button render={<Link href="/admin/emails/new" />}>
              <Plus className="size-4" />
              Crear primera campaña
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {campaigns.map((c) => {
            const tpl = getEmailTemplate(c.templateKey);
            const openRate =
              c.sentCount > 0
                ? Math.round((c.openedCount / c.sentCount) * 100)
                : 0;
            return (
              <div
                key={c.id}
                className="rounded-xl border bg-card p-4 hover:border-primary hover:shadow-md transition-all"
              >
                <Link href={`/admin/emails/${c.id}`} className="block">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {tpl && (
                          <span className="text-xl leading-none">
                            {tpl.emoji}
                          </span>
                        )}
                        <p className="font-semibold truncate">{c.name}</p>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.subject}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {tpl && <span>{tpl.name}</span>}
                        <span>·</span>
                        <span>
                          Audiencia: {audienceLabel(c.audienceMode)}
                        </span>
                        {c.scheduledFor && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="size-3" />
                              {fmt.format(c.scheduledFor)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {c.status === "SENT" && (
                      <div className="flex items-center gap-5 text-sm shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Send className="size-4 text-muted-foreground" />
                          <span className="font-semibold tabular-nums">
                            {c.sentCount}
                          </span>
                          <span className="text-muted-foreground">
                            / {c.recipientCount}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-4 text-primary" />
                          <span className="font-semibold tabular-nums">
                            {c.openedCount}
                          </span>
                          <span className="text-muted-foreground">
                            ({openRate}%)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "SENT") return <Badge>Enviado</Badge>;
  if (status === "SENDING") return <Badge variant="outline">Enviando</Badge>;
  if (status === "SCHEDULED")
    return <Badge variant="outline">Programado</Badge>;
  if (status === "FAILED")
    return <Badge variant="destructive">Falló</Badge>;
  return <Badge variant="outline">Borrador</Badge>;
}

function audienceLabel(mode: string) {
  switch (mode) {
    case "ALL_USERS":
      return "Todos los usuarios";
    case "NEWSLETTER_OPT_IN":
      return "Newsletter";
    case "PLAN":
      return "Plan específico";
    case "ACQUISITION_CAMPAIGN":
      return "Landing de origen";
    case "DIETARY_PROFILE":
      return "Perfil dietético";
    default:
      return mode;
  }
}
