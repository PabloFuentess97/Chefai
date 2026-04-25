"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChipsInput } from "./chips-input";
import { generateRecipesAction } from "@/actions/recipes";

export function GenerateForm() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [ingredients, setIngredients] = React.useState<string[]>([]);
  const [forbidden, setForbidden] = React.useState<string[]>([]);
  const [unwanted, setUnwanted] = React.useState<string[]>([]);
  const [servings, setServings] = React.useState(2);
  const [cuisine, setCuisine] = React.useState<string>("");
  const [difficulty, setDifficulty] = React.useState<string>("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ingredients.length === 0) {
      toast.error("Añade al menos un ingrediente");
      return;
    }
    const fd = new FormData();
    fd.set("ingredients", ingredients.join(","));
    fd.set("forbidden", forbidden.join(","));
    fd.set("unwanted", unwanted.join(","));
    fd.set("servings", String(servings));
    if (cuisine) fd.set("cuisine", cuisine);
    if (difficulty) fd.set("difficulty", difficulty);

    startTransition(async () => {
      const res = await generateRecipesAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(`${res.data.recipeIds.length} recetas listas`);
      router.push(`/recipes?ids=${res.data.recipeIds.join(",")}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="ingredients">
          Ingredientes que tienes
          <span className="text-destructive"> *</span>
        </Label>
        <ChipsInput
          name="ingredients"
          values={ingredients}
          onChange={setIngredients}
          placeholder="pollo, arroz, limón… pulsa Enter"
          ariaLabel="Ingredientes disponibles"
        />
        <p className="text-xs text-muted-foreground">
          Pulsa <kbd className="rounded border bg-muted px-1">Enter</kbd> o{" "}
          <kbd className="rounded border bg-muted px-1">,</kbd> para añadir.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="forbidden">Prohibidos (alergias)</Label>
          <ChipsInput
            name="forbidden"
            values={forbidden}
            onChange={setForbidden}
            placeholder="gluten, lactosa…"
            ariaLabel="Ingredientes prohibidos"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unwanted">No me gustan</Label>
          <ChipsInput
            name="unwanted"
            values={unwanted}
            onChange={setUnwanted}
            placeholder="brócoli, anchoas…"
            ariaLabel="Ingredientes no deseados"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Comensales</Label>
          <div className="inline-flex items-center gap-2 rounded-lg border px-2 h-10">
            <button
              type="button"
              onClick={() => setServings(Math.max(1, servings - 1))}
              className="size-8 grid place-items-center rounded hover:bg-muted"
              aria-label="Quitar comensal"
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-8 text-center font-semibold">
              {servings}
            </span>
            <button
              type="button"
              onClick={() => setServings(Math.min(20, servings + 1))}
              className="size-8 grid place-items-center rounded hover:bg-muted"
              aria-label="Añadir comensal"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cuisine">Cocina</Label>
          <Select value={cuisine} onValueChange={(v) => setCuisine(v ?? "")}>
            <SelectTrigger id="cuisine">
              <SelectValue placeholder="Cualquiera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mediterránea">Mediterránea</SelectItem>
              <SelectItem value="italiana">Italiana</SelectItem>
              <SelectItem value="asiática">Asiática</SelectItem>
              <SelectItem value="mexicana">Mexicana</SelectItem>
              <SelectItem value="india">India</SelectItem>
              <SelectItem value="española">Española</SelectItem>
              <SelectItem value="americana">Americana</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="difficulty">Dificultad</Label>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v ?? "")}>
            <SelectTrigger id="difficulty">
              <SelectValue placeholder="Cualquiera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Fácil</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="hard">Difícil</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={pending || ingredients.length === 0}
        className="w-full sm:w-auto"
      >
        <Sparkles className="size-4" />
        {pending ? "Cocinando ideas…" : "Generar recetas"}
      </Button>
    </form>
  );
}
