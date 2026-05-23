"use client";

import * as React from "react";
import { ArrowLeftRight, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getSubstitutionsAction,
  type SubstitutionResult,
} from "@/actions/substitutions";

export function IngredientSubstitute({
  recipeId,
  ingredientName,
  enabled = true,
}: {
  recipeId: string;
  ingredientName: string;
  enabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<SubstitutionResult | null>(null);

  if (!enabled) return null;

  async function load() {
    if (result || pending) return;
    setPending(true);
    try {
      const res = await getSubstitutionsAction(recipeId, ingredientName);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      setResult(res.data);
    } finally {
      setPending(false);
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) load();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`Sustituir ${ingredientName}`}
            // Always visible at 60% opacity so it's discoverable on
            // mobile/touch (no hover); fades to full opacity on
            // hover/focus for desktop polish.
            className="size-7 grid place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary focus:bg-muted focus:text-primary transition opacity-60 group-hover:opacity-100 focus:opacity-100"
          >
            <ArrowLeftRight className="size-3.5" />
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Sustitutos para {ingredientName}
          </DialogTitle>
          <DialogDescription>
            Alternativas que mantienen el espíritu de la receta
          </DialogDescription>
        </DialogHeader>

        {pending && (
          <div className="space-y-2 py-2">
            <div className="h-16 rounded-lg bg-muted shimmer" />
            <div className="h-16 rounded-lg bg-muted shimmer" />
          </div>
        )}

        {!pending && result && (
          <div className="space-y-2.5">
            {result.substitutions.map((s, i) => (
              <div
                key={i}
                className="rounded-lg border bg-card p-3.5 space-y-1"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold capitalize">{s.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium tabular-nums shrink-0">
                    {s.ratio}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.note}
                </p>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground pt-2">
              Sugerencias generadas con IA. Ajusta el resto de la receta si es
              necesario.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
