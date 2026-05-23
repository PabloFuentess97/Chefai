import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { RecipeEditor } from "@/components/dashboard/recipe-editor";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  return { title: recipe ? `Editar · ${recipe.title}` : "Editar receta" };
}

export default async function EditRecipePage({ params }: Props) {
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
  // Only the owner can edit. Community-pool recipes referenced by meal
  // plans render read-only on /recipes/[id]; trying to /edit them sends
  // the user back to the detail page.
  if (recipe.userId !== user.id) {
    redirect(`/recipes/${recipe.id}`);
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/recipes/${recipe.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver a la receta
      </Link>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Editar receta
        </h1>
        <p className="text-muted-foreground">
          Ajusta el título, los ingredientes y los pasos. Las cantidades
          se recalculan automáticamente para tus comensales cuando vuelvas
          a la vista de receta.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <RecipeEditor
            recipe={{
              id: recipe.id,
              title: recipe.title,
              description: recipe.description ?? "",
              cuisine: recipe.cuisine ?? "",
              difficulty:
                (recipe.difficulty as "easy" | "medium" | "hard" | null) ??
                null,
              prepMinutes: recipe.prepMinutes ?? 0,
              cookMinutes: recipe.cookMinutes ?? 0,
              servings: recipe.servings,
              ingredients: recipe.ingredients.map((i) => ({
                name: i.name,
                quantity: i.quantity,
                unit: i.unit,
                optional: i.optional,
              })),
              steps: recipe.steps.map((s) => ({
                content: s.content,
                durationMin: s.durationMin,
              })),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
