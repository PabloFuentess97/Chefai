"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShoppingBasket, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addPlanToShoppingListAction } from "@/actions/shopping";
import { deleteMealPlanAction } from "@/actions/planner";

export function PlanActions({ planId }: { planId: string }) {
  const router = useRouter();
  const [pendingShop, startShop] = React.useTransition();
  const [pendingDel, startDel] = React.useTransition();
  const [open, setOpen] = React.useState(false);

  function addToShopping() {
    startShop(async () => {
      const res = await addPlanToShoppingListAction(planId);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(
        `${res.data.added} ingredientes nuevos añadidos a la lista`
      );
      router.push("/shopping");
    });
  }

  function deletePlan() {
    startDel(async () => {
      const res = await deleteMealPlanAction(planId);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Menú eliminado");
      setOpen(false);
      router.push("/planner");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={addToShopping} disabled={pendingShop}>
        <ShoppingBasket className="size-4" />
        {pendingShop ? "Añadiendo…" : "Añadir todo a la compra"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button variant="destructive">
              <Trash2 className="size-4" />
              Eliminar menú
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar este menú?</DialogTitle>
            <DialogDescription>
              Las recetas individuales NO se borran, solo el menú. Las
              encontrarás en /recetas como hasta ahora.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={deletePlan}
              disabled={pendingDel}
            >
              {pendingDel ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
