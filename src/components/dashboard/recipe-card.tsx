import Link from "next/link";
import Image from "next/image";
import { Clock, Users, Flame } from "lucide-react";
import type { Recipe } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function RecipeCard({
  recipe,
  className,
}: {
  recipe: Recipe;
  className?: string;
}) {
  const totalTime = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className={cn(
        "group rounded-2xl border bg-card overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col",
        className
      )}
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-muted">
        {recipe.imageUrl ? (
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <Flame className="size-12 opacity-30" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge className="bg-primary/90 text-primary-foreground">IA</Badge>
        </div>
        {recipe.isFavorite && (
          <div className="absolute top-2 right-2 size-8 grid place-items-center rounded-full bg-background/80 text-pink-500 backdrop-blur">
            ♥
          </div>
        )}
      </div>
      <div className="p-4 space-y-2 flex-1 flex flex-col">
        <h3 className="font-semibold leading-tight line-clamp-2">
          {recipe.title}
        </h3>
        {recipe.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {recipe.description}
          </p>
        )}
        <div className="mt-auto pt-3 flex items-center gap-3 text-xs text-muted-foreground">
          {totalTime > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {totalTime} min
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {recipe.servings}
          </span>
          {recipe.totalCalories != null && (
            <span className="inline-flex items-center gap-1">
              <Flame className="size-3.5" />
              {Math.round(recipe.totalCalories)} kcal
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
