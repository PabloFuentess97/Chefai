"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { IngredientSubstitute } from "./ingredient-substitute";

type Ingredient = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  optional: boolean;
  suggested: boolean;
  calories: number | null;
  proteins: number | null;
  fats: number | null;
  carbs: number | null;
};

export function ServingsAdjuster({
  baseServings,
  ingredients,
  recipeId,
  substitutionsEnabled = true,
}: {
  baseServings: number;
  ingredients: Ingredient[];
  recipeId: string;
  substitutionsEnabled?: boolean;
}) {
  const [servings, setServings] = React.useState(baseServings);
  const ratio = servings / baseServings;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Comensales</p>
        <div className="inline-flex items-center gap-2 rounded-lg border px-2 h-9">
          <button
            type="button"
            onClick={() => setServings(Math.max(1, servings - 1))}
            className="size-7 grid place-items-center rounded hover:bg-muted"
            aria-label="Quitar comensal"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="min-w-7 text-center font-semibold text-sm">
            {servings}
          </span>
          <button
            type="button"
            onClick={() => setServings(Math.min(20, servings + 1))}
            className="size-7 grid place-items-center rounded hover:bg-muted"
            aria-label="Añadir comensal"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      <ul className="space-y-1.5">
        {ingredients.map((ing) => {
          const q = ing.quantity * ratio;
          return (
            <li
              key={ing.id}
              className="group flex items-center justify-between gap-2 py-1.5 border-b border-border/40 last:border-b-0"
            >
              <span className="text-sm flex-1">
                {ing.name}
                {ing.suggested && (
                  <span className="ml-1.5 text-[10px] uppercase tracking-wider rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5">
                    sugerido
                  </span>
                )}
                {ing.optional && (
                  <span className="ml-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    opcional
                  </span>
                )}
              </span>
              <span className="text-sm font-medium tabular-nums shrink-0">
                {formatQty(q)} {ing.unit}
              </span>
              <IngredientSubstitute
                recipeId={recipeId}
                ingredientName={ing.name}
                enabled={substitutionsEnabled}
              />
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-muted-foreground pt-1.5 flex items-center gap-1.5">
        <span className="inline-flex size-4 items-center justify-center rounded-sm bg-muted">
          <svg
            className="size-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 3 4 7l4 4" />
            <path d="M4 7h16" />
            <path d="m16 21 4-4-4-4" />
            <path d="M20 17H4" />
          </svg>
        </span>
        Toca el icono junto a cada ingrediente para ver alternativas con IA
      </p>
    </div>
  );
}

function formatQty(n: number): string {
  if (n >= 100) return Math.round(n).toString();
  if (n >= 10) return n.toFixed(0);
  return n.toFixed(1).replace(/\.0$/, "");
}
