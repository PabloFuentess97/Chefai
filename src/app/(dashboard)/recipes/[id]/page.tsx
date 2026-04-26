import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Clock, Flame, Users, ChefHat, ArrowLeft } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCurrentPlan, planHasFeature } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ServingsAdjuster } from "@/components/dashboard/servings-adjuster";
import { RecipeActions } from "@/components/dashboard/recipe-actions";
import { CookingModeButton } from "@/components/dashboard/cooking-mode";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  return { title: recipe?.title ?? "Receta" };
}

export default async function RecipeDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { sortOrder: "asc" } },
      steps: { orderBy: { order: "asc" } },
    },
  });

  if (!recipe) notFound();
  // Recipes referenced by meal plans may belong to other users (community
  // pool reuse). Allow read-only view; only the owner can edit/delete.
  const isOwner = recipe.userId === user.id;

  const plan = await getCurrentPlan(user.id);
  const pdfEnabled = planHasFeature(plan, "pdfExport");
  const voiceEnabled = planHasFeature(plan, "voiceCooking");
  const subsEnabled = planHasFeature(plan, "substitutions");
  const totalTime = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);

  return (
    <div className="space-y-6">
      <Link
        href="/recipes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver a mis recetas
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {recipe.imageUrl && (
            <div className="relative aspect-video overflow-hidden rounded-2xl border bg-muted">
              <Image
                src={recipe.imageUrl}
                alt={recipe.title}
                fill
                priority
                unoptimized
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {recipe.cuisine && (
                <Badge variant="outline">{recipe.cuisine}</Badge>
              )}
              {recipe.difficulty && (
                <Badge variant="outline">
                  {recipe.difficulty === "easy"
                    ? "Fácil"
                    : recipe.difficulty === "medium"
                      ? "Media"
                      : "Difícil"}
                </Badge>
              )}
              <Badge>IA</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {recipe.title}
            </h1>
            {recipe.description && (
              <p className="text-muted-foreground text-pretty">
                {recipe.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            {totalTime > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4 text-primary" />
                {totalTime} min
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4 text-primary" />
              {recipe.servings} comensales
            </span>
            {recipe.totalCalories != null && (
              <span className="inline-flex items-center gap-1.5">
                <Flame className="size-4 text-primary" />
                {Math.round(recipe.totalCalories)} kcal/ración
              </span>
            )}
          </div>

          <RecipeActions
            recipeId={recipe.id}
            isFavorite={recipe.isFavorite}
            pdfEnabled={pdfEnabled}
            isOwner={isOwner}
          />

          <CookingModeButton
            recipeTitle={recipe.title}
            enabled={voiceEnabled}
            steps={recipe.steps.map((s) => ({
              id: s.id,
              order: s.order,
              content: s.content,
              durationMin: s.durationMin,
            }))}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="size-5 text-primary" />
                Pasos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {recipe.steps.map((step, i) => (
                  <li key={step.id} className="flex gap-4">
                    <div className="size-8 shrink-0 rounded-full bg-primary/10 text-primary font-semibold grid place-items-center text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <p className="leading-relaxed">{step.content}</p>
                      {step.durationMin != null && step.durationMin > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {step.durationMin} min
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ingredientes</CardTitle>
            </CardHeader>
            <CardContent>
              <ServingsAdjuster
                baseServings={recipe.servings}
                ingredients={recipe.ingredients}
                recipeId={recipe.id}
                substitutionsEnabled={subsEnabled}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Por ración</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Stat
                  label="Calorías"
                  value={`${Math.round(recipe.totalCalories ?? 0)} kcal`}
                />
                <Stat
                  label="Proteínas"
                  value={`${Math.round(recipe.totalProteins ?? 0)} g`}
                />
                <Stat
                  label="Grasas"
                  value={`${Math.round(recipe.totalFats ?? 0)} g`}
                />
                <Stat
                  label="Carbos"
                  value={`${Math.round(recipe.totalCarbs ?? 0)} g`}
                />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}
