import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { EmailCampaignForm } from "@/components/admin/email-campaign-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Admin · Nueva campaña de email" };

export default async function NewEmailPage() {
  const [plans, campaigns] = await Promise.all([
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
          Nueva campaña de email
        </h1>
        <p className="text-muted-foreground">
          Elige plantilla, escribe el copy y filtra la audiencia.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <EmailCampaignForm plans={plans} acqCampaigns={campaigns} />
        </CardContent>
      </Card>
    </div>
  );
}
