import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { PlannerWizard } from "@/components/dashboard/planner-wizard";
import type { DietGoal } from "@/lib/diet-goals";

export const metadata = { title: "Crear menú" };

export default async function NewPlanPage() {
  const session = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { preferredGoal: true },
  });

  return (
    <div className="space-y-6">
      <Link
        href="/planner"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver al menú
      </Link>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Nuevo menú
        </h1>
        <p className="text-muted-foreground">
          Cuatro pasos y tu plan de comidas listo.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <PlannerWizard
            defaultGoal={(user?.preferredGoal as DietGoal | null) ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
