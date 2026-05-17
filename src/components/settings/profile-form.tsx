"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  TrendingDown,
  Equal,
  TrendingUp,
  Sparkles,
  Dumbbell,
  Leaf,
  Carrot,
  Fish,
  Flame,
  WheatOff,
  MilkOff,
  Drumstick,
  Salad,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GOALS, type DietGoal } from "@/lib/diet-goals";
import {
  DIETARY_PROFILES,
  type DietaryProfile,
} from "@/lib/diet-goals";
import { APPLIANCES, type ApplianceId } from "@/lib/appliances";
import { cn } from "@/lib/utils";
import { updateProfileAction } from "@/actions/settings";

const GOAL_ICONS: Record<DietGoal, LucideIcon> = {
  deficit: TrendingDown,
  maintain: Equal,
  volume: TrendingUp,
  definition: Sparkles,
  muscle: Dumbbell,
};

const DIET_ICONS: Record<DietaryProfile, LucideIcon> = {
  omnivore: Utensils,
  vegetarian: Carrot,
  vegan: Leaf,
  pescatarian: Fish,
  keto: Flame,
  lowcarb: Flame,
  glutenfree: WheatOff,
  lactosefree: MilkOff,
  paleo: Drumstick,
  mediterranean: Salad,
};

export function ProfileForm({
  defaultName,
  email,
  defaultGoal,
  defaultDietary,
  defaultAppliances,
}: {
  defaultName: string | null;
  email: string;
  defaultGoal: DietGoal | null;
  defaultDietary: DietaryProfile | null;
  defaultAppliances: ApplianceId[];
}) {
  const [pending, start] = React.useTransition();
  const [goal, setGoal] = React.useState<DietGoal | null>(defaultGoal);
  const [dietary, setDietary] = React.useState<DietaryProfile | null>(
    defaultDietary
  );
  const [appliances, setAppliances] =
    React.useState<ApplianceId[]>(defaultAppliances);

  function toggleAppliance(id: ApplianceId) {
    setAppliances((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  function onSubmit(fd: FormData) {
    fd.set("preferredGoal", goal ?? "");
    fd.set("dietaryProfile", dietary ?? "");
    fd.set("cookingAppliances", appliances.join(","));
    start(async () => {
      const res = await updateProfileAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Perfil actualizado");
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          El email no se puede cambiar todavía.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultName ?? ""}
          required
          maxLength={80}
        />
      </div>

      <div className="space-y-3">
        <div>
          <Label>Mi objetivo nutricional</Label>
          <p className="text-xs text-muted-foreground mt-1">
            La IA tendrá esto en cuenta al generar recetas. Puedes cambiarlo
            por receta si quieres.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Chip
            active={goal === null}
            onClick={() => setGoal(null)}
            label="Sin preferencia"
          />
          {GOALS.map((g) => {
            const Icon = GOAL_ICONS[g.id];
            return (
              <Chip
                key={g.id}
                active={goal === g.id}
                onClick={() => setGoal(g.id)}
                icon={<Icon className="size-4" />}
                label={g.short}
                desc={g.desc}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Mi perfil dietético</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Se aplicará como restricción a TODAS las recetas y menús que la
            IA genere. Si no eliges nada, no habrá restricciones.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Chip
            active={dietary === null}
            onClick={() => setDietary(null)}
            label="Sin restricciones"
          />
          {DIETARY_PROFILES.filter((d) => d.id !== "omnivore").map((d) => {
            const Icon = DIET_ICONS[d.id];
            return (
              <Chip
                key={d.id}
                active={dietary === d.id}
                onClick={() => setDietary(d.id)}
                icon={<Icon className="size-4" />}
                label={d.short}
                desc={d.desc}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Mis utensilios de cocina</Label>
          <p className="text-xs text-muted-foreground mt-1">
            La IA adaptará los pasos y tiempos al aparato que tengas. Elige
            uno o varios.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {APPLIANCES.map((a) => {
            const active = appliances.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAppliance(a.id)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all active:scale-[0.98]",
                  active
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border hover:border-foreground/30"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{a.emoji}</span>
                  <span className="font-medium text-sm">{a.short}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {a.desc}
                </p>
              </button>
            );
          })}
        </div>
        {appliances.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {appliances.length}{" "}
            {appliances.length === 1 ? "utensilio" : "utensilios"}{" "}
            seleccionados — pulsa otra vez para desmarcar.
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}

function Chip({
  active,
  onClick,
  icon,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  desc?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left transition-all active:scale-[0.98]",
        active
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "border-border hover:border-foreground/30"
      )}
    >
      <div className="flex items-center gap-2">
        {icon && (
          <span className={active ? "text-primary" : "text-muted-foreground"}>
            {icon}
          </span>
        )}
        <span className="font-medium text-sm">{label}</span>
      </div>
      {desc && (
        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
          {desc}
        </p>
      )}
    </button>
  );
}
