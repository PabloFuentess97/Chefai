"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// All filter values mirror what the server-side page resolves into a
// Prisma query. Keep this list in sync with /recipes/page.tsx.
const CUISINES = [
  { value: "mediterránea", label: "Mediterránea" },
  { value: "italiana", label: "Italiana" },
  { value: "asiática", label: "Asiática" },
  { value: "mexicana", label: "Mexicana" },
  { value: "india", label: "India" },
  { value: "española", label: "Española" },
  { value: "americana", label: "Americana" },
];

const DIFFICULTIES = [
  { value: "easy", label: "Fácil" },
  { value: "medium", label: "Media" },
  { value: "hard", label: "Difícil" },
];

const MEAL_TYPES = [
  { value: "breakfast", label: "Desayuno" },
  { value: "lunch", label: "Almuerzo" },
  { value: "snack", label: "Merienda" },
  { value: "dinner", label: "Cena" },
];

const TIME_BUCKETS = [
  { value: "quick", label: "Rápidas (≤30 min)" },
  { value: "medium", label: "Medias (30-60 min)" },
  { value: "long", label: "Largas (>60 min)" },
];

const SORTS = [
  { value: "recent", label: "Más recientes" },
  { value: "fastest", label: "Más rápidas" },
  { value: "kcal-asc", label: "Menos calorías" },
  { value: "kcal-desc", label: "Más calorías" },
];

type ChipValue = {
  key: string;
  label: string;
  value: string;
};

/**
 * Client-side controls for /recipes. Updates the URL with searchParams
 * (so it's bookmarkable + back-button-friendly) and lets the server
 * page re-render with the new filter set. Search input is debounced
 * 400 ms to avoid hammering the BD on each keystroke.
 */
export function RecipeFilters({ totalLabel }: { totalLabel: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const q = params.get("q") ?? "";
  const cuisine = params.get("cuisine") ?? "";
  const difficulty = params.get("difficulty") ?? "";
  const mealType = params.get("mealType") ?? "";
  const time = params.get("time") ?? "";
  const sort = params.get("sort") ?? "recent";

  const [searchInput, setSearchInput] = React.useState(q);
  const [advancedOpen, setAdvancedOpen] = React.useState(
    Boolean(cuisine || difficulty || mealType || time)
  );

  // Debounced URL sync when the user types in the search box
  React.useEffect(() => {
    if (searchInput === q) return;
    const t = setTimeout(() => {
      pushParam("q", searchInput);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function pushParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    // Always reset to page 1 when any filter changes — keeping the user
    // on page 5 of a now-filtered list would show "no results"
    next.delete("page");
    startTransition(() => {
      router.replace(`/recipes?${next.toString()}`, { scroll: false });
    });
  }

  function clearAll() {
    setSearchInput("");
    startTransition(() => {
      // Keep the favorites tab if active, drop everything else
      const filter = params.get("filter");
      const qs = filter ? `?filter=${filter}` : "";
      router.replace(`/recipes${qs}`, { scroll: false });
    });
  }

  // Build the chip list of active filters for visual feedback
  const chips: ChipValue[] = [];
  if (q)
    chips.push({ key: "q", label: `"${q}"`, value: q });
  if (cuisine) {
    const meta = CUISINES.find((c) => c.value === cuisine);
    chips.push({ key: "cuisine", label: meta?.label ?? cuisine, value: cuisine });
  }
  if (difficulty) {
    const meta = DIFFICULTIES.find((d) => d.value === difficulty);
    chips.push({
      key: "difficulty",
      label: meta?.label ?? difficulty,
      value: difficulty,
    });
  }
  if (mealType) {
    const meta = MEAL_TYPES.find((m) => m.value === mealType);
    chips.push({
      key: "mealType",
      label: meta?.label ?? mealType,
      value: mealType,
    });
  }
  if (time) {
    const meta = TIME_BUCKETS.find((t) => t.value === time);
    chips.push({ key: "time", label: meta?.label ?? time, value: time });
  }

  return (
    <div className="space-y-3">
      {/* Search + sort row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Buscar por nombre o ingrediente…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-10"
            aria-label="Buscar recetas"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-6 grid place-items-center rounded hover:bg-muted text-muted-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <Select
            value={sort}
            onValueChange={(v) =>
              v && pushParam("sort", v === "recent" ? "" : v)
            }
          >
            <SelectTrigger className="h-10 w-[150px] sm:w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={advancedOpen ? "default" : "outline"}
            onClick={() => setAdvancedOpen((v) => !v)}
            className="h-10"
            aria-pressed={advancedOpen}
          >
            <SlidersHorizontal className="size-4" />
            Filtros
            {chips.length > 0 && (
              <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-primary-foreground/20 text-[11px] font-bold tabular-nums">
                {chips.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Advanced filter row (collapsible) */}
      {advancedOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border bg-card p-3">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              Cocina
            </label>
            <Select
              value={cuisine || "any"}
              onValueChange={(v) =>
                pushParam("cuisine", !v || v === "any" ? "" : v)
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Todas</SelectItem>
                {CUISINES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              Dificultad
            </label>
            <Select
              value={difficulty || "any"}
              onValueChange={(v) =>
                pushParam("difficulty", !v || v === "any" ? "" : v)
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Todas</SelectItem>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              Tipo
            </label>
            <Select
              value={mealType || "any"}
              onValueChange={(v) =>
                pushParam("mealType", !v || v === "any" ? "" : v)
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Todos</SelectItem>
                {MEAL_TYPES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              Tiempo
            </label>
            <Select
              value={time || "any"}
              onValueChange={(v) =>
                pushParam("time", !v || v === "any" ? "" : v)
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Cualquiera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Cualquiera</SelectItem>
                {TIME_BUCKETS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Active filter chips + result count */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Filtrando por:
          </span>
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                if (c.key === "q") setSearchInput("");
                pushParam(c.key, "");
              }}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                "bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
              )}
            >
              {c.label}
              <X className="size-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Limpiar todo
          </button>
        </div>
      )}

      {/* Subtle pending state — barely-visible bar at the bottom */}
      {pending && (
        <div className="h-0.5 w-full bg-muted overflow-hidden rounded-full">
          <div className="h-full w-1/3 bg-primary animate-[slide_1s_ease-in-out_infinite]" />
        </div>
      )}

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {totalLabel}
      </p>
    </div>
  );
}
