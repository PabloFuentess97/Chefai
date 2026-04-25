import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandingForm } from "@/components/admin/branding-form";

export const metadata = { title: "Admin · Branding" };

export default async function AdminBrandingPage() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Branding
        </h1>
        <p className="text-muted-foreground">
          Cambios visibles en toda la app tras un refresh.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identidad de marca</CardTitle>
        </CardHeader>
        <CardContent>
          <BrandingForm settings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
