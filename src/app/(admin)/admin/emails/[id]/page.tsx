import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Send, CheckCircle2, Mail, AlertCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { EmailCampaignForm } from "@/components/admin/email-campaign-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Admin · Editar email" };

type Props = { params: Promise<{ id: string }> };

const fmt = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function EditEmailPage({ params }: Props) {
  const { id } = await params;
  const [campaign, plans, acqCampaigns] = await Promise.all([
    prisma.emailCampaign.findUnique({ where: { id } }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);
  if (!campaign) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/emails"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {campaign.name}
        </h1>
        <p className="text-muted-foreground">
          {campaign.subject}
          {campaign.sentAt && ` · Enviado el ${fmt.format(campaign.sentAt)}`}
        </p>
      </div>

      {/* Stats card (after send) */}
      {campaign.status === "SENT" && (
        <div className="grid sm:grid-cols-4 gap-3">
          <Stat
            icon={<Mail className="size-4" />}
            label="Destinatarios"
            value={campaign.recipientCount}
          />
          <Stat
            icon={<Send className="size-4" />}
            label="Enviados"
            value={campaign.sentCount}
          />
          <Stat
            icon={<CheckCircle2 className="size-4 text-primary" />}
            label="Aperturas"
            value={campaign.openedCount}
            sub={
              campaign.sentCount > 0
                ? `${Math.round((campaign.openedCount / campaign.sentCount) * 100)}%`
                : undefined
            }
          />
          <Stat
            icon={<AlertCircle className="size-4 text-destructive" />}
            label="Bounces"
            value={campaign.bouncedCount}
          />
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <EmailCampaignForm
            plans={plans}
            acqCampaigns={acqCampaigns}
            campaign={campaign}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {sub && (
          <span className="text-xs text-muted-foreground">{sub}</span>
        )}
      </div>
    </div>
  );
}
