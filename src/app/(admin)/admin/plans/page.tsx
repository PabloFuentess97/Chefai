import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanForm } from "@/components/admin/plan-form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const metadata = { title: "Admin · Planes" };

export default async function AdminPlansPage() {
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
  const slugs = plans.map((p) => p.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Planes
        </h1>
        <p className="text-muted-foreground">
          Edita precios, límites e identificadores de Stripe / PayPal.
        </p>
      </div>

      <Tabs defaultValue={slugs[0] ?? "new"}>
        <TabsList className="flex-wrap">
          {plans.map((p) => (
            <TabsTrigger key={p.id} value={p.id}>
              {p.name}
              {!p.isActive && (
                <span className="ml-1 text-xs text-muted-foreground">
                  (inactivo)
                </span>
              )}
            </TabsTrigger>
          ))}
          <TabsTrigger value="new">+ Nuevo plan</TabsTrigger>
        </TabsList>

        {plans.map((p) => (
          <TabsContent key={p.id} value={p.id}>
            <Card>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <PlanForm plan={p} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>Crear plan</CardTitle>
            </CardHeader>
            <CardContent>
              <PlanForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
