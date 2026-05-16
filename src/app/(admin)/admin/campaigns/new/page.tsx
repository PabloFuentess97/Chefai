import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { CampaignForm } from "@/components/admin/campaign-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Admin · Nueva campaña" };

export default async function NewCampaignPage() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true, priceCents: true, interval: true },
  });

  return (
    <div className="space-y-6">
      <Link
        href="/admin/campaigns"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Nueva campaña
        </h1>
        <p className="text-muted-foreground">
          Configura una landing externa con un trial limitado.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <CampaignForm plans={plans} />
        </CardContent>
      </Card>
    </div>
  );
}
