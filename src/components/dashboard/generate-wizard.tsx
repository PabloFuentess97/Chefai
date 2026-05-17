"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Minus,
  Plus,
  Coffee,
  UtensilsCrossed,
  Cookie,
  Soup,
  TrendingDown,
  Equal,
  TrendingUp,
  Dumbbell,
  type LucideIcon,
} from "lucide-react";
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
import { FridgePhotoButton } from "./fridge-photo-button";
import {
  ProgressOverlay,
  SINGLE_RECIPE_PHASES,
} from "./progress-overlay";
import { generateRecipesAction } from "@/actions/recipes";
import {
  MEAL_TYPES,
  GOALS,
  DIETARY_PROFILES,
  type DietGoal,
  type DietaryProfile,
  type MealType,
  targetCaloriesForMeal,
} from "@/lib/diet-goals";
import { APPLIANCES, type ApplianceId } from "@/lib/appliances";
import { cn } from "@/lib/utils";

const MEAL_ICONS: Record<MealType, LucideIcon> = {
  breakfast: Coffee,
  lunch: UtensilsCrossed,
  snack: Cookie,
  dinner: Soup,
};

const GOAL_ICONS: Record<DietGoal, LucideIcon> = {
  deficit: TrendingDown,
  maintain: Equal,
  volume: TrendingUp,
  definition: Sparkles,
  muscle: Dumbbell,
};

type State = {
  mealType: MealType | null;
  goal: DietGoal | null;
  dietary: DietaryProfile | null;
  appliances: ApplianceId[];
  servings: number;
  ingredients: string[];
  forbidden: string[];
  unwanted: string[];
  cuisine: string;
  difficulty: string;
};

const STEPS = [
  { n: 1, title: "¿Qué cocinamos?", subtitle: "Tipo de comida y comensales" },
  { n: 2, title: "Tu objetivo", subtitle: "La IA ajustará calorías y proteína" },
  {
    n: 3,
    title: "Tus ingredientes",
    subtitle: "Lo que tienes y lo que quieres evitar",
  },
  {
    n: 4,
    title: "Detalles finales",
    subtitle: "Cocina, dificultad y a generar",
  },
];

export function GenerateWizard({
  defaultGoal = null,
  defaultDietary = null,
  defaultAppliances = [],
  fridgePhotoEnabled = true,
}: {
  defaultGoal?: DietGoal | null;
  defaultDietary?: DietaryProfile | null;
  defaultAppliances?: ApplianceId[];
  fridgePhotoEnabled?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [direction, setDirection] = React.useState<1 | -1>(1);
  const [pending, startTransition] = React.useTransition();
  const [s, setS] = React.useState<State>({
    mealType: null,
    goal: defaultGoal,
    dietary: defaultDietary,
    appliances: defaultAppliances,
    servings: 2,
    ingredients: [],
    forbidden: [],
    unwanted: [],
    cuisine: "",
    difficulty: "",
  });

  function update<K extends keyof State>(key: K, value: State[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
  }

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  function next() {
    if (step === 3 && s.ingredients.length === 0) {
      toast.error("Añade al menos un ingrediente");
      return;
    }
    if (step < STEPS.length) go(step + 1);
  }

  function prev() {
    if (step > 1) go(step - 1);
  }

  function submit() {
    if (s.ingredients.length === 0) {
      toast.error("Añade al menos un ingrediente");
      go(3);
      return;
    }
    const fd = new FormData();
    fd.set("ingredients", s.ingredients.join(","));
    fd.set("forbidden", s.forbidden.join(","));
    fd.set("unwanted", s.unwanted.join(","));
    fd.set("servings", String(s.servings));
    if (s.cuisine) fd.set("cuisine", s.cuisine);
    if (s.difficulty) fd.set("difficulty", s.difficulty);
    if (s.mealType) fd.set("mealType", s.mealType);
    if (s.goal) fd.set("goal", s.goal);
    if (s.dietary) fd.set("dietaryProfile", s.dietary);
    fd.set("appliances", s.appliances.join(","));

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

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;
  const current = STEPS[step - 1];

  return (
    <div className="space-y-6">
      {/* Progress + step heading */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-muted-foreground">
            Paso {step} de {STEPS.length}
          </span>
          <span className="text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            {current.title}
          </h2>
          <p className="text-sm text-muted-foreground">{current.subtitle}</p>
        </div>
      </div>

      {/* Step content with slide animation */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction === 1 ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction === 1 ? -24 : 24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {step === 1 && (
              <Step1
                state={s}
                update={update}
              />
            )}
            {step === 2 && <Step2 state={s} update={update} />}
            {step === 3 && (
              <Step3
                state={s}
                update={update}
                fridgePhotoEnabled={fridgePhotoEnabled}
              />
            )}
            {step === 4 && <Step4 state={s} update={update} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav */}
      <div className="flex justify-between gap-3 pt-2">
        <Button
          variant="outline"
          onClick={prev}
          disabled={step === 1 || pending}
        >
          <ArrowLeft className="size-4" />
          Atrás
        </Button>
        {step < STEPS.length ? (
          <Button onClick={next} disabled={pending}>
            Siguiente
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={submit}
            disabled={pending || s.ingredients.length === 0}
          >
            <Sparkles className="size-4" />
            {pending ? "Cocinando ideas…" : "Generar recetas"}
          </Button>
        )}
      </div>

      <ProgressOverlay
        open={pending}
        phases={SINGLE_RECIPE_PHASES}
        expectedSeconds={12}
        title="Cocinando 3 recetas para ti"
        subtitle="La IA escribe las recetas ahora; las fotos se preparan en segundo plano y aparecerán al instante."
      />
    </div>
  );
}

// ----------------- STEP 1: meal type + servings -----------------

function Step1({
  state,
  update,
}: {
  state: State;
  update: <K extends keyof State>(k: K, v: State[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Tipo de comida</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MEAL_TYPES.map((m) => {
            const Icon = MEAL_ICONS[m.id];
            const active = state.mealType === m.id;
            return (
              <Card
                key={m.id}
                active={active}
                onClick={() =>
                  update("mealType", active ? null : m.id)
                }
              >
                <Icon
                  className={cn(
                    "size-7 mb-2",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <p className="font-semibold text-sm">{m.label}</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-1">
                  {m.desc}
                </p>
              </Card>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Opcional. Si no eliges, la IA elegirá platos versátiles.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Comensales</Label>
        <div className="inline-flex items-center gap-3 rounded-xl border bg-card px-3 h-14">
          <button
            type="button"
            onClick={() => update("servings", Math.max(1, state.servings - 1))}
            className="size-10 grid place-items-center rounded-lg hover:bg-muted active:scale-95 transition"
            aria-label="Quitar comensal"
          >
            <Minus className="size-4" />
          </button>
          <span className="min-w-12 text-center text-2xl font-bold tabular-nums">
            {state.servings}
          </span>
          <button
            type="button"
            onClick={() => update("servings", Math.min(20, state.servings + 1))}
            className="size-10 grid place-items-center rounded-lg hover:bg-muted active:scale-95 transition"
            aria-label="Añadir comensal"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------- STEP 2: dietary goal -----------------

function Step2({
  state,
  update,
}: {
  state: State;
  update: <K extends keyof State>(k: K, v: State[K]) => void;
}) {
  const calRange = state.mealType
    ? targetCaloriesForMeal(state.mealType, state.goal)
    : null;
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <Card
          active={state.goal === null}
          onClick={() => update("goal", null)}
        >
          <p className="font-semibold text-sm">Sin preferencia</p>
          <p className="text-[11px] text-muted-foreground leading-snug mt-1">
            La IA hará una receta equilibrada.
          </p>
        </Card>
        {GOALS.map((g) => {
          const Icon = GOAL_ICONS[g.id];
          const active = state.goal === g.id;
          return (
            <Card
              key={g.id}
              active={active}
              onClick={() => update("goal", active ? null : g.id)}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={cn(
                    "size-5",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <p className="font-semibold text-sm">{g.label}</p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug mt-1.5">
                {g.desc}
              </p>
              {active && (
                <p className="text-[10px] uppercase tracking-wide text-primary font-bold mt-2">
                  ≥ {g.proteinMin}g proteína · multiplicador {g.calMultiplier}
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {calRange && state.mealType && (
        <div className="rounded-lg border bg-primary/5 p-3 text-sm">
          <p className="font-medium">Rango calórico estimado</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            La IA apuntará a <strong>{calRange.min}–{calRange.max} kcal</strong>{" "}
            por ración.
          </p>
        </div>
      )}
    </div>
  );
}

// ----------------- STEP 3: ingredients -----------------

function Step3({
  state,
  update,
  fridgePhotoEnabled,
}: {
  state: State;
  update: <K extends keyof State>(k: K, v: State[K]) => void;
  fridgePhotoEnabled: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>
          Ingredientes que tienes
          <span className="text-destructive"> *</span>
        </Label>
        <ChipsInput
          name="ingredients"
          values={state.ingredients}
          onChange={(v) => update("ingredients", v)}
          placeholder="pollo, arroz, limón… pulsa Enter"
          ariaLabel="Ingredientes disponibles"
        />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <FridgePhotoButton
            enabled={fridgePhotoEnabled}
            onDetected={(detected) => {
              const merged = Array.from(
                new Set([...state.ingredients, ...detected])
              );
              update("ingredients", merged);
            }}
          />
          <p className="text-xs text-muted-foreground flex-1">
            Pulsa <kbd className="rounded border bg-muted px-1">Enter</kbd> o{" "}
            <kbd className="rounded border bg-muted px-1">,</kbd> para añadir
            a mano, o usa la cámara.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Prohibidos (alergias / intolerancias)</Label>
        <ChipsInput
          name="forbidden"
          values={state.forbidden}
          onChange={(v) => update("forbidden", v)}
          placeholder="gluten, lactosa…"
          ariaLabel="Ingredientes prohibidos"
        />
      </div>

      <div className="space-y-2">
        <Label>No me gustan</Label>
        <ChipsInput
          name="unwanted"
          values={state.unwanted}
          onChange={(v) => update("unwanted", v)}
          placeholder="brócoli, anchoas…"
          ariaLabel="Ingredientes no deseados"
        />
      </div>
    </div>
  );
}

// ----------------- STEP 4: extras + summary -----------------

function Step4({
  state,
  update,
}: {
  state: State;
  update: <K extends keyof State>(k: K, v: State[K]) => void;
}) {
  const meal = MEAL_TYPES.find((m) => m.id === state.mealType);
  const goal = GOALS.find((g) => g.id === state.goal);
  const dietary = DIETARY_PROFILES.find((d) => d.id === state.dietary);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cuisine">Cocina</Label>
          <Select
            value={state.cuisine}
            onValueChange={(v) => update("cuisine", v ?? "")}
          >
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
          <Select
            value={state.difficulty}
            onValueChange={(v) => update("difficulty", v ?? "")}
          >
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

      <div className="space-y-2">
        <Label htmlFor="dietary">Perfil dietético</Label>
        <Select
          value={state.dietary ?? ""}
          onValueChange={(v) =>
            update("dietary", (v || null) as DietaryProfile | null)
          }
        >
          <SelectTrigger id="dietary">
            <SelectValue placeholder="Sin restricciones" />
          </SelectTrigger>
          <SelectContent>
            {DIETARY_PROFILES.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          Por defecto se usa el de tu perfil. Cámbialo solo para esta
          receta si quieres.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Utensilios de cocina</Label>
        <p className="text-[11px] text-muted-foreground">
          La IA adaptará los pasos a estos aparatos. Por defecto se usan
          los de tu perfil; toca para añadir o quitar.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {APPLIANCES.map((a) => {
            const active = state.appliances.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  const next = active
                    ? state.appliances.filter((id) => id !== a.id)
                    : [...state.appliances, a.id];
                  update("appliances", next);
                }}
                className={cn(
                  "rounded-xl border p-2.5 text-left transition-all active:scale-[0.98]",
                  active
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border hover:border-foreground/30"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{a.emoji}</span>
                  <span className="font-medium text-xs">{a.short}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
          Resumen
        </p>
        <Row label="Tipo" value={meal?.label ?? "Cualquiera"} />
        <Row label="Objetivo" value={goal?.label ?? "Sin preferencia"} />
        <Row label="Dieta" value={dietary?.label ?? "Sin restricciones"} />
        <Row
          label="Utensilios"
          value={
            state.appliances.length === 0
              ? "—"
              : state.appliances
                  .map((id) => APPLIANCES.find((a) => a.id === id)?.short ?? id)
                  .join(", ")
          }
        />
        <Row label="Comensales" value={String(state.servings)} />
        <Row
          label="Ingredientes"
          value={
            state.ingredients.length === 0
              ? "—"
              : state.ingredients.join(", ")
          }
        />
        {state.forbidden.length > 0 && (
          <Row
            label="Prohibidos"
            value={state.forbidden.join(", ")}
            danger
          />
        )}
        {state.unwanted.length > 0 && (
          <Row label="No me gustan" value={state.unwanted.join(", ")} />
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span
        className={cn(
          "text-right font-medium truncate",
          danger && "text-destructive"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Card({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all active:scale-[0.98]",
        active
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "border-border hover:border-foreground/30 bg-card"
      )}
    >
      {children}
    </button>
  );
}
