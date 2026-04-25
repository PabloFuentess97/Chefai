import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCurrentPlan } from "@/lib/plans";
import { getUsage } from "@/lib/usage";
import { Card, CardContent } from "@/components/ui/card";
import { GenerateForm } from "@/components/dashboard/generate-form";
import { UsageMeter } from "@/components/dashboard/usage-meter";

export const metadata = { title: "Generar receta" };

export default async function GeneratePage() {
  const user = await requireUser();
  const [plan, usage] = await Promise.all([
    getCurrentPlan(user.id),
    getUsage(user.id),
  ]);

  const limited =
    plan.recipesPerMonth !== -1 && usage.recipesUsed >= plan.recipesPerMonth;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Generar nuevas recetas
        </h1>
        <p className="text-muted-foreground">
          Cuéntanos qué tienes y nosotros nos encargamos de la inspiración.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <UsageMeter
            used={usage.recipesUsed}
            limit={plan.recipesPerMonth}
          />
          {limited && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3 text-sm">
              <p className="font-medium">Has alcanzado tu límite mensual</p>
              <p className="text-muted-foreground">
                Mejora tu plan para seguir generando este mes.{" "}
                <Link
                  href="/billing"
                  className="text-primary inline-flex items-center gap-1 hover:underline"
                >
                  Ver planes <ArrowRight className="size-3" />
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <GenerateForm />
        </CardContent>
      </Card>
    </div>
  );
}
