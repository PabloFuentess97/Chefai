"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  X,
  GripVertical,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateRecipeAction } from "@/actions/recipes";
import { cn } from "@/lib/utils";

type Difficulty = "easy" | "medium" | "hard";

type IngredientRow = {
  name: string;
  quantity: number;
  unit: string;
  optional: boolean;
};

type StepRow = {
  content: string;
  durationMin: number | null;
};

type RecipeForEdit = {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  difficulty: Difficulty | null;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  ingredients: IngredientRow[];
  steps: StepRow[];
};

const UNIT_OPTIONS = ["g", "ml", "ud", "cda", "cdta", "tz", "pizca"];

const CUISINE_OPTIONS = [
  { value: "", label: "Sin especificar" },
  { value: "mediterránea", label: "Mediterránea" },
  { value: "italiana", label: "Italiana" },
  { value: "asiática", label: "Asiática" },
  { value: "mexicana", label: "Mexicana" },
  { value: "india", label: "India" },
  { value: "española", label: "Española" },
  { value: "americana", label: "Americana" },
];

export function RecipeEditor({ recipe }: { recipe: RecipeForEdit }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  // ---- Basic fields ----
  const [title, setTitle] = React.useState(recipe.title);
  const [description, setDescription] = React.useState(recipe.description);
  const [cuisine, setCuisine] = React.useState(recipe.cuisine);
  const [difficulty, setDifficulty] = React.useState<Difficulty | "">(
    recipe.difficulty ?? ""
  );
  const [prepMinutes, setPrepMinutes] = React.useState(recipe.prepMinutes);
  const [cookMinutes, setCookMinutes] = React.useState(recipe.cookMinutes);
  const [servings, setServings] = React.useState(recipe.servings);

  // ---- Arrays ----
  const [ingredients, setIngredients] = React.useState<IngredientRow[]>(
    recipe.ingredients
  );
  const [steps, setSteps] = React.useState<StepRow[]>(recipe.steps);

  // ---- Ingredient helpers ----
  function updateIngredient<K extends keyof IngredientRow>(
    idx: number,
    key: K,
    value: IngredientRow[K]
  ) {
    setIngredients((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
    );
  }
  function addIngredient() {
    setIngredients((prev) => [
      ...prev,
      { name: "", quantity: 0, unit: "g", optional: false },
    ]);
  }
  function removeIngredient(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }
  function moveIngredient(idx: number, direction: -1 | 1) {
    setIngredients((prev) => {
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target]!, copy[idx]!];
      return copy;
    });
  }

  // ---- Step helpers ----
  function updateStep<K extends keyof StepRow>(
    idx: number,
    key: K,
    value: StepRow[K]
  ) {
    setSteps((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
    );
  }
  function addStep() {
    setSteps((prev) => [...prev, { content: "", durationMin: null }]);
  }
  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }
  function moveStep(idx: number, direction: -1 | 1) {
    setSteps((prev) => {
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target]!, copy[idx]!];
      return copy;
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    const cleanIngredients = ingredients
      .map((i) => ({
        name: i.name.trim(),
        quantity: i.quantity,
        unit: i.unit.trim() || "g",
        optional: i.optional,
      }))
      .filter((i) => i.name.length > 0);
    if (cleanIngredients.length === 0) {
      toast.error("Añade al menos un ingrediente");
      return;
    }
    const cleanSteps = steps
      .map((s) => ({
        content: s.content.trim(),
        durationMin: s.durationMin,
      }))
      .filter((s) => s.content.length > 0);
    if (cleanSteps.length === 0) {
      toast.error("Añade al menos un paso");
      return;
    }

    const fd = new FormData();
    fd.set("id", recipe.id);
    fd.set("title", title.trim());
    fd.set("description", description.trim());
    fd.set("cuisine", cuisine);
    fd.set("difficulty", difficulty);
    fd.set("prepMinutes", String(prepMinutes));
    fd.set("cookMinutes", String(cookMinutes));
    fd.set("servings", String(servings));
    fd.set("ingredients", JSON.stringify(cleanIngredients));
    fd.set("steps", JSON.stringify(cleanSteps));

    start(async () => {
      const res = await updateRecipeAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Receta actualizada");
      router.push(`/recipes/${recipe.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* ------------ Basic info ------------ */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Información básica
        </legend>

        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
            placeholder="Pollo al pesto con espárragos"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción (opcional)</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cuisine">Cocina</Label>
            <Select
              value={cuisine || "__none"}
              onValueChange={(v) => setCuisine(v === "__none" ? "" : v ?? "")}
            >
              <SelectTrigger id="cuisine">
                <SelectValue placeholder="Sin especificar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sin especificar</SelectItem>
                {CUISINE_OPTIONS.filter((o) => o.value).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulty">Dificultad</Label>
            <Select
              value={difficulty || "__none"}
              onValueChange={(v) =>
                setDifficulty(
                  v === "__none" ? "" : ((v as Difficulty) ?? "")
                )
              }
            >
              <SelectTrigger id="difficulty">
                <SelectValue placeholder="Sin especificar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sin especificar</SelectItem>
                <SelectItem value="easy">Fácil</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="hard">Difícil</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="prepMinutes">Prep (min)</Label>
            <Input
              id="prepMinutes"
              type="number"
              min={0}
              max={600}
              value={prepMinutes}
              onChange={(e) => setPrepMinutes(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cookMinutes">Cocción (min)</Label>
            <Input
              id="cookMinutes"
              type="number"
              min={0}
              max={600}
              value={cookMinutes}
              onChange={(e) => setCookMinutes(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="servings">Comensales</Label>
            <Input
              id="servings"
              type="number"
              min={1}
              max={20}
              value={servings}
              onChange={(e) =>
                setServings(Math.max(1, Number(e.target.value) || 1))
              }
            />
          </div>
        </div>
      </fieldset>

      {/* ------------ Ingredients ------------ */}
      <fieldset className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Ingredientes ({ingredients.length})
          </legend>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addIngredient}
          >
            <Plus className="size-4" />
            Añadir
          </Button>
        </div>

        <div className="space-y-2">
          {ingredients.map((ing, idx) => (
            <div
              key={idx}
              className={cn(
                "rounded-lg border bg-card p-3",
                "flex flex-wrap items-start gap-2"
              )}
            >
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => moveIngredient(idx, -1)}
                  disabled={idx === 0}
                  className="size-6 grid place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Subir ingrediente"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveIngredient(idx, 1)}
                  disabled={idx === ingredients.length - 1}
                  className="size-6 grid place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Bajar ingrediente"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>

              <div className="flex-1 min-w-[180px] grid grid-cols-[1fr_90px_90px] gap-2">
                <Input
                  value={ing.name}
                  onChange={(e) =>
                    updateIngredient(idx, "name", e.target.value)
                  }
                  placeholder="Nombre"
                  maxLength={80}
                  aria-label="Nombre del ingrediente"
                  className="h-9"
                />
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  value={ing.quantity}
                  onChange={(e) =>
                    updateIngredient(
                      idx,
                      "quantity",
                      Number(e.target.value) || 0
                    )
                  }
                  aria-label="Cantidad"
                  className="h-9"
                />
                <Select
                  value={ing.unit || "g"}
                  onValueChange={(v) =>
                    updateIngredient(idx, "unit", v ?? "g")
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs text-muted-foreground inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ing.optional}
                    onChange={(e) =>
                      updateIngredient(idx, "optional", e.target.checked)
                    }
                    className="size-4 accent-primary"
                  />
                  Opcional
                </label>
                <button
                  type="button"
                  onClick={() => removeIngredient(idx)}
                  className="size-8 grid place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  aria-label="Eliminar ingrediente"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Las calorías y macros que ve el usuario en la página de receta no
          se recalculan al editar manualmente — siguen siendo las que
          generó la IA originalmente.
        </p>
      </fieldset>

      {/* ------------ Steps ------------ */}
      <fieldset className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Pasos ({steps.length})
          </legend>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addStep}
          >
            <Plus className="size-4" />
            Añadir paso
          </Button>
        </div>

        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="rounded-lg border bg-card p-3 flex gap-3"
            >
              <div className="flex flex-col gap-1 shrink-0">
                <div className="size-7 rounded-full bg-primary/10 text-primary font-semibold grid place-items-center text-sm">
                  {idx + 1}
                </div>
                <div className="flex flex-col gap-0.5 mt-1">
                  <button
                    type="button"
                    onClick={() => moveStep(idx, -1)}
                    disabled={idx === 0}
                    className="size-6 grid place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Subir paso"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(idx, 1)}
                    disabled={idx === steps.length - 1}
                    className="size-6 grid place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Bajar paso"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                <textarea
                  value={step.content}
                  onChange={(e) =>
                    updateStep(idx, "content", e.target.value)
                  }
                  maxLength={2000}
                  rows={3}
                  placeholder="Describe el paso en una o dos frases…"
                  aria-label={`Paso ${idx + 1}`}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm leading-relaxed"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Label
                    htmlFor={`step-dur-${idx}`}
                    className="text-xs text-muted-foreground"
                  >
                    Duración (min, opcional)
                  </Label>
                  <Input
                    id={`step-dur-${idx}`}
                    type="number"
                    min={0}
                    max={600}
                    value={step.durationMin ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      updateStep(
                        idx,
                        "durationMin",
                        raw === "" ? null : Number(raw) || 0
                      );
                    }}
                    className="h-8 w-24"
                  />
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    className="ml-auto size-8 grid place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label="Eliminar paso"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      {/* ------------ Actions ------------ */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/recipes/${recipe.id}`)}
          disabled={pending}
        >
          <X className="size-4" />
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          <Save className="size-4" />
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
