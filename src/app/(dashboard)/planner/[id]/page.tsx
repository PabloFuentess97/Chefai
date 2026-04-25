import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Flame } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlanActions } from "@/components/dashboard/plan-actions";
import { SLOTS, slotLabel, dayLabel } from "@/lib/meal-plans";

const dateFmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "long" });

export const metadata = { title: "Menú" };

type Props = { params: Promise<{ id: string }> };

export default async function PlanDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const plan = await prisma.mealPlan.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          recipe: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              prepMinutes: true,
              cookMinutes: true,
              totalCalories: true,
            },
          },
        },
      },
    },
  });

  if (!plan || plan.userId !== user.id) notFound();

  const days = plan.type === "WEEKLY" ? 7 : 1;
  const totalKcal = plan.items.reduce(
    (acc, it) => acc + (it.recipe.totalCalories ?? 0),
    0
  );

  // Group items by day for easier rendering
  const byDay: Record<number, typeof plan.items> = {};
  for (let d = 0; d < days; d++) byDay[d] = [];
  for (const it of plan.items) {
    (byDay[it.dayIndex] ?? []).push(it);
  }

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
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge>{plan.type === "WEEKLY" ? "Semanal" : "Diario"}</Badge>
          {plan.goal && <Badge variant="outline">{plan.goal}</Badge>}
          {plan.difficulty && (
            <Badge variant="outline">{plan.difficulty}</Badge>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {plan.type === "WEEKLY" ? "Semana del " : "Menú del "}
          {dateFmt.format(plan.startDate)}
        </h1>
        <p className="text-muted-foreground">
          {plan.items.length} platos · {plan.servings} comensales ·{" "}
          {Math.round(totalKcal)} kcal totales
        </p>
      </div>

      <PlanActions planId={plan.id} />

      <div className="space-y-4">
        {Array.from({ length: days }).map((_, dayIdx) => (
          <div key={dayIdx} className="space-y-2">
            {plan.type === "WEEKLY" && (
              <h2 className="text-lg font-semibold tracking-tight">
                {dayLabel(dayIdx)}
              </h2>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SLOTS.map((s) => {
                const item = byDay[dayIdx]?.find((it) => it.slot === s);
                return (
                  <SlotCard
                    key={s}
                    label={slotLabel(s)}
                    item={item}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ItemWithRecipe = {
  id: string;
  recipe: {
    id: string;
    title: string;
    imageUrl: string | null;
    prepMinutes: number | null;
    cookMinutes: number | null;
    totalCalories: number | null;
  };
};

function SlotCard({
  label,
  item,
}: {
  label: string;
  item: ItemWithRecipe | undefined;
}) {
  if (!item) {
    return (
      <Card className="opacity-60 border-dashed">
        <CardContent className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            {label}
          </p>
          <p className="text-sm text-muted-foreground mt-2">Sin asignar</p>
        </CardContent>
      </Card>
    );
  }
  const totalTime =
    (item.recipe.prepMinutes ?? 0) + (item.recipe.cookMinutes ?? 0);
  return (
    <Link
      href={`/recipes/${item.recipe.id}`}
      className="rounded-2xl border bg-card overflow-hidden hover:border-primary hover:shadow-lg transition-all flex flex-col"
    >
      <div className="aspect-[4/3] relative bg-muted">
        {item.recipe.imageUrl ? (
          <Image
            src={item.recipe.imageUrl}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <Flame className="size-8 opacity-40" />
          </div>
        )}
        <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider font-bold rounded-full bg-background/90 px-2.5 py-1">
          {label}
        </span>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <p className="font-semibold text-sm leading-tight line-clamp-2">
          {item.recipe.title}
        </p>
        <div className="mt-auto pt-2 flex items-center gap-3 text-xs text-muted-foreground">
          {totalTime > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {totalTime}m
            </span>
          )}
          {item.recipe.totalCalories != null && (
            <span className="inline-flex items-center gap-1">
              <Flame className="size-3" />
              {Math.round(item.recipe.totalCalories)} kcal
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
