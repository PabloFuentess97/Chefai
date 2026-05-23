import Link from "next/link";
import { Sparkles, Heart, BookOpen, BookMarked } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RecipeCard } from "@/components/dashboard/recipe-card";
import { RecipeFilters } from "@/components/dashboard/recipe-filters";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = { title: "Mis recetas" };

const PAGE_SIZE = 24;

type Sort = "recent" | "fastest" | "kcal-asc" | "kcal-desc";

type Props = {
  searchParams: Promise<{
    filter?: "all" | "favorites";
    page?: string;
    ids?: string;
    q?: string;
    cuisine?: string;
    difficulty?: "easy" | "medium" | "hard";
    mealType?: "breakfast" | "lunch" | "snack" | "dinner";
    time?: "quick" | "medium" | "long";
    sort?: Sort;
  }>;
};

export default async function RecipesPage({ searchParams }: Props) {
  const user = await requireUser();
  const {
    filter = "all",
    page = "1",
    ids,
    q,
    cuisine,
    difficulty,
    mealType,
    time,
    sort = "recent",
  } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);

  // Build the Prisma where clause from the URL searchParams. Each filter
  // is independent — undefined values simply don't add a constraint.
  const where: Prisma.RecipeWhereInput = {
    userId: user.id,
    ...(filter === "favorites" ? { isFavorite: true } : {}),
    ...(ids ? { id: { in: ids.split(",").filter(Boolean) } } : {}),
    ...(cuisine
      ? { cuisine: { equals: cuisine, mode: "insensitive" } }
      : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(mealType ? { mealType } : {}),
  };

  // Free-text search across title + ingredient name. For 160 rows this
  // is more than fast enough; if the collection ever blows up we can
  // switch to a tsvector + GIN index.
  if (q && q.trim()) {
    const term = q.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      {
        ingredients: {
          some: { name: { contains: term, mode: "insensitive" } },
        },
      },
    ];
  }

  // Time bucket: we materialize prepMinutes + cookMinutes via two
  // independent constraints because Prisma can't sum across columns in
  // a where clause. This slightly over-approximates "totalTime ≤ 30"
  // (e.g. prep=20 + cook=20 would pass each test). For UI buckets it's
  // good enough and keeps the query indexable.
  if (time === "quick") {
    where.prepMinutes = { lte: 15 };
    where.cookMinutes = { lte: 15 };
  } else if (time === "medium") {
    where.prepMinutes = { lte: 30 };
    where.cookMinutes = { lte: 30 };
  } else if (time === "long") {
    where.OR = [
      ...(where.OR ?? []),
      { prepMinutes: { gt: 30 } },
      { cookMinutes: { gt: 30 } },
    ];
  }

  // Sort
  const orderBy: Prisma.RecipeOrderByWithRelationInput =
    sort === "fastest"
      ? { cookMinutes: "asc" }
      : sort === "kcal-asc"
        ? { totalCalories: "asc" }
        : sort === "kcal-desc"
          ? { totalCalories: "desc" }
          : { createdAt: "desc" };

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      orderBy,
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.recipe.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingHighlight = !!ids;

  // Reconstruct the current URL query (minus `page`) so pagination
  // links preserve filters
  const baseParams = new URLSearchParams();
  if (filter !== "all") baseParams.set("filter", filter);
  if (q) baseParams.set("q", q);
  if (cuisine) baseParams.set("cuisine", cuisine);
  if (difficulty) baseParams.set("difficulty", difficulty);
  if (mealType) baseParams.set("mealType", mealType);
  if (time) baseParams.set("time", time);
  if (sort !== "recent") baseParams.set("sort", sort);

  const hasAnyFilter = Boolean(
    q || cuisine || difficulty || mealType || time
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {showingHighlight ? "Recién generadas" : "Mis recetas"}
          </h1>
          <p className="text-muted-foreground">
            {showingHighlight
              ? "Aquí tienes lo que la IA acaba de cocinar para ti."
              : "Tu recetario personal."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/cookbook" />}>
            <BookMarked className="size-4" />
            Mi recetario
          </Button>
          <Button render={<Link href="/generate" />}>
            <Sparkles className="size-4" />
            Generar más
          </Button>
        </div>
      </div>

      {!showingHighlight && (
        <>
          <Tabs value={filter}>
            <TabsList>
              <TabsTrigger
                value="all"
                render={
                  <Link
                    href={
                      baseParams.toString()
                        ? `/recipes?${(() => {
                            const p = new URLSearchParams(baseParams);
                            p.delete("filter");
                            return p.toString();
                          })()}`
                        : "/recipes"
                    }
                  />
                }
              >
                <BookOpen className="size-4" />
                Todas
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                render={
                  <Link
                    href={`/recipes?${(() => {
                      const p = new URLSearchParams(baseParams);
                      p.set("filter", "favorites");
                      return p.toString();
                    })()}`}
                  />
                }
              >
                <Heart className="size-4" />
                Favoritas
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <RecipeFilters
            totalLabel={
              total === 0
                ? "Sin resultados"
                : total === 1
                  ? "1 receta encontrada"
                  : `${total} recetas encontradas`
            }
          />
        </>
      )}

      {recipes.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center space-y-3">
          <Sparkles className="size-10 mx-auto text-muted-foreground" />
          {hasAnyFilter ? (
            <>
              <h2 className="font-semibold">Sin resultados</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Ninguna receta cumple esos filtros. Prueba quitando alguno o
                ampliando los términos de búsqueda.
              </p>
              <Button variant="outline" render={<Link href="/recipes" />}>
                Limpiar filtros
              </Button>
            </>
          ) : (
            <>
              <h2 className="font-semibold">Aún no tienes recetas</h2>
              <p className="text-sm text-muted-foreground">
                Genera tu primera con un par de ingredientes.
              </p>
              <Button render={<Link href="/generate" />}>Generar receta</Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}

      {!showingHighlight && totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            const active = p === pageNum;
            const linkParams = new URLSearchParams(baseParams);
            linkParams.set("page", String(p));
            return (
              <Button
                key={p}
                size="sm"
                variant={active ? "default" : "outline"}
                render={
                  <Link
                    href={`/recipes?${linkParams.toString()}`}
                    aria-current={active ? "page" : undefined}
                  />
                }
              >
                {p}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
