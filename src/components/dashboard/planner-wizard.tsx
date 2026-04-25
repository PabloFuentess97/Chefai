"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarRange,
  Sparkles,
  Zap,
  Minus,
  Plus,
  TrendingDown,
  Equal,
  TrendingUp,
  Dumbbell,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

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
import { ChipsInput } from "./chips-input";
import { GOALS, type DietGoal } from "@/lib/diet-goals";
import { cn } from "@/lib/utils";
import { createMealPlanAction } from "@/actions/planner";

const GOAL_ICONS: Record<DietGoal, LucideIcon> = {
  deficit: TrendingDown,
  maintain: Equal,
  volume: TrendingUp,
  definition: Sparkles,
  muscle: Dumbbell,
};

type State = {
  type: "DAILY" | "WEEKLY";
  startDate: string; // ISO YYYY-MM-DD
  goal: DietGoal | null;
  difficulty: "easy" | "medium" | "hard" | "";
  fast: boolean;
  servings: number;
  cuisine: string;
  preferences: string[];
  forbidden: string[];
};

const STEPS = [
  { n: 1, title: "¿Diario o semanal?", subtitle: "Elige el tipo de menú" },
  { n: 2, title: "Tu objetivo", subtitle: "La IA ajustará calorías y macros" },
  {
    n: 3,
    title: "Estilo de cocina",
    subtitle: "Dificultad, comensales y preferencias",
  },
  { n: 4, title: "Resumen", subtitle: "Revisa y crea tu menú" },
];

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextMondayISO(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun..6=Sat
  const offset = day === 0 ? 1 : (8 - day) % 7 || 7;
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function PlannerWizard({
  defaultGoal = null,
}: {
  defaultGoal?: DietGoal | null;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [direction, setDirection] = React.useState<1 | -1>(1);
  const [pending, startTransition] = React.useTransition();
  const [s, setS] = React.useState<State>({
    type: "WEEKLY",
    startDate: nextMondayISO(),
    goal: defaultGoal,
    difficulty: "",
    fast: false,
    servings: 2,
    cuisine: "",
    preferences: [],
    forbidden: [],
  });

  function update<K extends keyof State>(key: K, value: State[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
  }

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  function next() {
    if (step < STEPS.length) go(step + 1);
  }

  function prev() {
    if (step > 1) go(step - 1);
  }

  function submit() {
    const fd = new FormData();
    fd.set("type", s.type);
    fd.set("startDate", s.startDate);
    if (s.goal) fd.set("goal", s.goal);
    if (s.difficulty) fd.set("difficulty", s.difficulty);
    fd.set("fast", s.fast ? "on" : "");
    fd.set("servings", String(s.servings));
    if (s.cuisine) fd.set("cuisine", s.cuisine);
    fd.set("preferences", s.preferences.join(","));
    fd.set("forbidden", s.forbidden.join(","));

    startTransition(async () => {
      const res = await createMealPlanAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(
        `${res.data.generated} generadas + ${res.data.reused} reutilizadas`
      );
      router.push(`/planner/${res.data.planId}`);
      router.refresh();
    });
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;
  const current = STEPS[step - 1]!;
  const totalSlots = (s.type === "WEEKLY" ? 7 : 1) * 4;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-muted-foreground">
            Paso {step} de {STEPS.length}
          </span>
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
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
            {step === 1 && <Step1 state={s} update={update} />}
            {step === 2 && <Step2 state={s} update={update} />}
            {step === 3 && <Step3 state={s} update={update} />}
            {step === 4 && <Step4 state={s} totalSlots={totalSlots} />}
          </motion.div>
        </AnimatePresence>
      </div>

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
          <Button size="lg" onClick={submit} disabled={pending}>
            <Sparkles className="size-4" />
            {pending
              ? `Cocinando ${totalSlots} recetas… puede tardar`
              : "Crear menú"}
          </Button>
        )}
      </div>

      {pending && (
        <div className="text-xs text-muted-foreground text-center pt-1">
          Reutilizamos recetas existentes cuando podemos para ahorrar tiempo y
          coste. Esto puede tardar entre 30 segundos y 2 minutos según el
          tamaño del menú.
        </div>
      )}
    </div>
  );
}

// ---------------- STEP 1 ----------------

function Step1({
  state,
  update,
}: {
  state: State;
  update: <K extends keyof State>(k: K, v: State[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <SelectableCard
          active={state.type === "DAILY"}
          onClick={() => {
            update("type", "DAILY");
            update("startDate", todayISO());
          }}
        >
          <CalendarDays
            className={cn(
              "size-7 mb-2",
              state.type === "DAILY" ? "text-primary" : "text-muted-foreground"
            )}
          />
          <p className="font-semibold">Menú diario</p>
          <p className="text-xs text-muted-foreground mt-1">
            4 recetas para un solo día (desayuno, almuerzo, merienda, cena)
          </p>
        </SelectableCard>
        <SelectableCard
          active={state.type === "WEEKLY"}
          onClick={() => {
            update("type", "WEEKLY");
            update("startDate", nextMondayISO());
          }}
        >
          <CalendarRange
            className={cn(
              "size-7 mb-2",
              state.type === "WEEKLY" ? "text-primary" : "text-muted-foreground"
            )}
          />
          <p className="font-semibold">Menú semanal</p>
          <p className="text-xs text-muted-foreground mt-1">
            28 recetas para 7 días completos
          </p>
        </SelectableCard>
      </div>

      <div className="space-y-2 max-w-xs">
        <Label htmlFor="startDate">
          {state.type === "DAILY" ? "Día" : "Lunes de inicio"}
        </Label>
        <Input
          id="startDate"
          type="date"
          value={state.startDate}
          onChange={(e) => update("startDate", e.target.value)}
        />
      </div>
    </div>
  );
}

// ---------------- STEP 2 ----------------

function Step2({
  state,
  update,
}: {
  state: State;
  update: <K extends keyof State>(k: K, v: State[K]) => void;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <SelectableCard
        active={state.goal === null}
        onClick={() => update("goal", null)}
      >
        <p className="font-semibold text-sm">Sin preferencia</p>
        <p className="text-[11px] text-muted-foreground leading-snug mt-1">
          Recetas equilibradas, sin objetivo concreto.
        </p>
      </SelectableCard>
      {GOALS.map((g) => {
        const Icon = GOAL_ICONS[g.id];
        const active = state.goal === g.id;
        return (
          <SelectableCard
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
          </SelectableCard>
        );
      })}
    </div>
  );
}

// ---------------- STEP 3 ----------------

function Step3({
  state,
  update,
}: {
  state: State;
  update: <K extends keyof State>(k: K, v: State[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="difficulty">Dificultad</Label>
          <Select
            value={state.difficulty}
            onValueChange={(v) =>
              update("difficulty", (v ?? "") as State["difficulty"])
            }
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
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => update("fast", !state.fast)}
          className={cn(
            "w-full text-left rounded-xl border p-4 flex items-center gap-3 transition active:scale-[0.99]",
            state.fast
              ? "border-primary bg-primary/5 ring-2 ring-primary/30"
              : "border-border hover:border-foreground/30 bg-card"
          )}
        >
          <Zap
            className={cn(
              "size-5",
              state.fast ? "text-primary" : "text-muted-foreground"
            )}
          />
          <div className="flex-1">
            <p className="font-semibold text-sm">Solo recetas rápidas</p>
            <p className="text-xs text-muted-foreground">
              Máximo 25 minutos en total (preparación + cocción)
            </p>
          </div>
          <span
            className={cn(
              "size-5 rounded-full border grid place-items-center",
              state.fast
                ? "bg-primary border-primary text-white"
                : "border-muted-foreground"
            )}
          >
            {state.fast && (
              <svg
                className="size-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                viewBox="0 0 24 24"
              >
                <path d="M5 12l5 5L20 7" />
              </svg>
            )}
          </span>
        </button>
      </div>

      <div className="space-y-2">
        <Label>Comensales</Label>
        <div className="inline-flex items-center gap-3 rounded-xl border bg-card px-3 h-14">
          <button
            type="button"
            onClick={() => update("servings", Math.max(1, state.servings - 1))}
            className="size-10 grid place-items-center rounded-lg hover:bg-muted active:scale-95 transition"
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
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Ingredientes preferidos (opcional)</Label>
        <ChipsInput
          name="preferences"
          values={state.preferences}
          onChange={(v) => update("preferences", v)}
          placeholder="pollo, arroz, espinacas…"
          ariaLabel="Ingredientes preferidos"
        />
      </div>

      <div className="space-y-2">
        <Label>Prohibidos / alergias</Label>
        <ChipsInput
          name="forbidden"
          values={state.forbidden}
          onChange={(v) => update("forbidden", v)}
          placeholder="gluten, lactosa…"
          ariaLabel="Ingredientes prohibidos"
        />
      </div>
    </div>
  );
}

// ---------------- STEP 4 ----------------

function Step4({ state, totalSlots }: { state: State; totalSlots: number }) {
  const goal = GOALS.find((g) => g.id === state.goal);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
          Resumen del menú
        </p>
        <Row
          label="Tipo"
          value={state.type === "WEEKLY" ? "Semanal (7 días)" : "Diario (1 día)"}
        />
        <Row
          label={state.type === "WEEKLY" ? "Lunes inicio" : "Día"}
          value={state.startDate}
        />
        <Row label="Recetas totales" value={`${totalSlots} platos`} />
        <Row label="Objetivo" value={goal?.label ?? "Sin preferencia"} />
        <Row
          label="Dificultad"
          value={
            state.difficulty === "easy"
              ? "Fácil"
              : state.difficulty === "medium"
                ? "Media"
                : state.difficulty === "hard"
                  ? "Difícil"
                  : "Cualquiera"
          }
        />
        {state.fast && (
          <Row label="Velocidad" value="Solo recetas rápidas (≤25 min)" />
        )}
        <Row label="Comensales" value={String(state.servings)} />
        {state.cuisine && <Row label="Cocina" value={state.cuisine} />}
        {state.preferences.length > 0 && (
          <Row
            label="Preferencias"
            value={state.preferences.join(", ")}
          />
        )}
        {state.forbidden.length > 0 && (
          <Row
            label="Prohibidos"
            value={state.forbidden.join(", ")}
            danger
          />
        )}
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
        <p className="font-medium">Optimización de tokens</p>
        <p className="text-muted-foreground text-xs mt-1">
          Para cada plato intentamos reutilizar primero recetas que ya existen
          en la plataforma (tuyas o de otros usuarios) coincidentes con
          objetivo + dificultad. Solo generamos con IA los huecos que no se
          puedan cubrir.
        </p>
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

function SelectableCard({
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
