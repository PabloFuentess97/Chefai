"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, ShoppingBasket, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  toggleShoppingItemAction,
  deleteShoppingItemAction,
  clearBoughtItemsAction,
  clearAllShoppingItemsAction,
} from "@/actions/shopping";

type Item = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  isBought: boolean;
};

export function ShoppingList({ initialItems }: { initialItems: Item[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);

  function toggle(id: string) {
    const prev = items.find((i) => i.id === id);
    if (!prev) return;
    setItems((arr) =>
      arr.map((i) => (i.id === id ? { ...i, isBought: !i.isBought } : i))
    );
    toggleShoppingItemAction(id).then((res) => {
      if (!res.ok) {
        // revert
        setItems((arr) =>
          arr.map((i) =>
            i.id === id ? { ...i, isBought: prev.isBought } : i
          )
        );
        toast.error(res.error.message);
      }
    });
  }

  function remove(id: string) {
    setItems((arr) => arr.filter((i) => i.id !== id));
    deleteShoppingItemAction(id).then((res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        router.refresh();
      }
    });
  }

  function clearBought() {
    if (!confirm("¿Quitar de la lista los items ya comprados?")) return;
    clearBoughtItemsAction().then((res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(`${res.data.deleted} items eliminados`);
      router.refresh();
    });
  }

  function clearAll() {
    if (!confirm("¿Vaciar TODA la lista de la compra?")) return;
    clearAllShoppingItemsAction().then((res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Lista vaciada");
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-12 text-center space-y-3">
        <ShoppingBasket className="size-10 mx-auto text-muted-foreground" />
        <h2 className="font-semibold">Lista vacía</h2>
        <p className="text-sm text-muted-foreground">
          Añade ingredientes desde una receta o desde un menú.
        </p>
      </div>
    );
  }

  const pending = items.filter((i) => !i.isBought);
  const bought = items.filter((i) => i.isBought);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 justify-end text-xs">
        {bought.length > 0 && (
          <Button size="sm" variant="outline" onClick={clearBought}>
            Quitar comprados ({bought.length})
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={clearAll}>
          Vaciar todo
        </Button>
      </div>

      {pending.length > 0 && (
        <Section title="Por comprar" count={pending.length}>
          {pending.map((it) => (
            <ItemRow
              key={it.id}
              item={it}
              onToggle={() => toggle(it.id)}
              onDelete={() => remove(it.id)}
            />
          ))}
        </Section>
      )}

      {bought.length > 0 && (
        <Section title="Ya comprado" count={bought.length} muted>
          {bought.map((it) => (
            <ItemRow
              key={it.id}
              item={it}
              onToggle={() => toggle(it.id)}
              onDelete={() => remove(it.id)}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  muted,
  children,
}: {
  title: string;
  count: number;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p
        className={cn(
          "text-[10px] uppercase tracking-[2px] font-bold",
          muted ? "text-muted-foreground" : "text-primary"
        )}
      >
        {title} · {count}
      </p>
      <div className="rounded-2xl border bg-card divide-y divide-border/60 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function ItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: Item;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Checkbox
        checked={item.isBought}
        onCheckedChange={onToggle}
        aria-label={`Marcar ${item.name} como ${item.isBought ? "no comprado" : "comprado"}`}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium",
            item.isBought && "line-through text-muted-foreground"
          )}
        >
          {item.name}
        </p>
      </div>
      <span
        className={cn(
          "text-sm tabular-nums",
          item.isBought ? "text-muted-foreground" : "font-semibold"
        )}
      >
        {formatQty(item.quantity)} {item.unit}
      </span>
      <button
        onClick={onDelete}
        className="size-8 grid place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive transition"
        aria-label={`Eliminar ${item.name}`}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function formatQty(n: number): string {
  if (n >= 100) return Math.round(n).toString();
  if (n >= 10) return n.toFixed(0);
  return n.toFixed(1).replace(/\.0$/, "");
}
