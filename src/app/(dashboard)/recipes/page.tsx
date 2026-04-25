import Link from "next/link";
import { Sparkles, Heart, BookOpen, BookMarked } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RecipeCard } from "@/components/dashboard/recipe-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = { title: "Mis recetas" };

const PAGE_SIZE = 24;

type Props = {
  searchParams: Promise<{
    filter?: "all" | "favorites";
    page?: string;
    ids?: string;
  }>;
};

export default async function RecipesPage({ searchParams }: Props) {
  const user = await requireUser();
  const { filter = "all", page = "1", ids } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);

  const where = {
    userId: user.id,
    ...(filter === "favorites" ? { isFavorite: true } : {}),
    ...(ids ? { id: { in: ids.split(",").filter(Boolean) } } : {}),
  };

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.recipe.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingHighlight = !!ids;

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
          <Button
            variant="outline"
            render={<Link href="/cookbook" />}
          >
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
        <Tabs value={filter}>
          <TabsList>
            <TabsTrigger value="all" render={<Link href="/recipes" />}>
              <BookOpen className="size-4" />
              Todas ({total})
            </TabsTrigger>
            <TabsTrigger
              value="favorites"
              render={<Link href="/recipes?filter=favorites" />}
            >
              <Heart className="size-4" />
              Favoritas
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {recipes.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center space-y-3">
          <Sparkles className="size-10 mx-auto text-muted-foreground" />
          <h2 className="font-semibold">Aún no tienes recetas</h2>
          <p className="text-sm text-muted-foreground">
            Genera tu primera con un par de ingredientes.
          </p>
          <Button render={<Link href="/generate" />}>Generar receta</Button>
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
            return (
              <Button
                key={p}
                size="sm"
                variant={active ? "default" : "outline"}
                render={
                  <Link
                    href={`/recipes?filter=${filter}&page=${p}`}
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
