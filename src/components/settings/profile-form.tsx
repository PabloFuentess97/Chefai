"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  TrendingDown,
  Equal,
  TrendingUp,
  Sparkles,
  Dumbbell,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GOALS, type DietGoal } from "@/lib/diet-goals";
import { cn } from "@/lib/utils";
import { updateProfileAction } from "@/actions/settings";

const ICONS: Record<DietGoal, LucideIcon> = {
  deficit: TrendingDown,
  maintain: Equal,
  volume: TrendingUp,
  definition: Sparkles,
  muscle: Dumbbell,
};

export function ProfileForm({
  defaultName,
  email,
  defaultGoal,
}: {
  defaultName: string | null;
  email: string;
  defaultGoal: DietGoal | null;
}) {
  const [pending, start] = React.useTransition();
  const [goal, setGoal] = React.useState<DietGoal | null>(defaultGoal);

  function onSubmit(fd: FormData) {
    if (goal) fd.set("preferredGoal", goal);
    else fd.set("preferredGoal", "");
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
          <GoalChip
            active={goal === null}
            onClick={() => setGoal(null)}
            label="Sin preferencia"
          />
          {GOALS.map((g) => {
            const Icon = ICONS[g.id];
            return (
              <GoalChip
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

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}

function GoalChip({
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
