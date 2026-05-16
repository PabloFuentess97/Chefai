import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { CampaignForm } from "@/components/admin/campaign-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Admin · Editar campaña" };

type Props = { params: Promise<{ id: string }> };

export default async function EditCampaignPage({ params }: Props) {
  const { id } = await params;
  const [campaign, plans] = await Promise.all([
    prisma.campaign.findUnique({ where: { id } }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        priceCents: true,
        interval: true,
      },
    }),
  ]);
  if (!campaign) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/campaigns"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {campaign.name}
          </h1>
          <p className="text-muted-foreground">
            /r/{campaign.slug} · {campaign.signupCount} signups ·{" "}
            {campaign.conversionCount} conversiones
          </p>
        </div>
        <a
          href={`/r/${campaign.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
        >
          <ExternalLink className="size-3.5" />
          Ver landing pública
        </a>
      </div>
      <Card>
        <CardContent className="pt-6">
          <CampaignForm plans={plans} campaign={campaign} />
        </CardContent>
      </Card>
    </div>
  );
}
