"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addManualShoppingItemAction } from "@/actions/shopping";

const UNIT_OPTIONS = ["g", "ml", "ud", "cda", "cdta", "tz", "pizca"];

/**
 * Lets the user add an item to their shopping list without going through
 * a recipe — for things they know they need (pan de molde, papel cocina,
 * detergente) that wouldn't otherwise show up. Collapsed by default to
 * keep the main list readable; opens with a single tap.
 */
export function AddShoppingItem() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const [name, setName] = React.useState("");
  const [quantity, setQuantity] = React.useState<string>("1");
  const [unit, setUnit] = React.useState("ud");
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Focus the name input when the form expands
    if (open) nameInputRef.current?.focus();
  }, [open]);

  function reset() {
    setName("");
    setQuantity("1");
    setUnit("ud");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Pon un nombre");
      return;
    }
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("quantity", quantity);
    fd.set("unit", unit);
    start(async () => {
      const res = await addManualShoppingItemAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(`${name.trim()} añadido a la lista`);
      reset();
      // Keep the form open so the user can add several in a row
      router.refresh();
      // Re-focus the name input for fast multi-add
      requestAnimationFrame(() => nameInputRef.current?.focus());
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto"
      >
        <Plus className="size-4" />
        Añadir ítem manualmente
      </Button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border bg-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Añadir a la lista</p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="size-7 grid place-items-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Cerrar"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-[1fr_90px_90px] gap-2">
        <Input
          ref={nameInputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Pan de molde, papel cocina…"
          maxLength={80}
          required
          aria-label="Nombre del producto"
        />
        <Input
          type="number"
          step="0.1"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          aria-label="Cantidad"
        />
        <Select value={unit} onValueChange={(v) => setUnit(v ?? "ud")}>
          <SelectTrigger aria-label="Unidad">
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

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          <Plus className="size-4" />
          {pending ? "Añadiendo…" : "Añadir"}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Si ya tienes el mismo producto con la misma unidad sin marcar como
        comprado, las cantidades se suman.
      </p>
    </form>
  );
}
