"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Heart, Trash2, FileDown, ShoppingBasket } from "lucide-react";
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
import { toggleFavoriteAction, deleteRecipeAction } from "@/actions/recipes";
import { addRecipeToShoppingListAction } from "@/actions/shopping";

export function RecipeActions({
  recipeId,
  recipeTitle,
  isFavorite,
  pdfEnabled,
  isOwner = true,
}: {
  recipeId: string;
  recipeTitle?: string;
  isFavorite: boolean;
  pdfEnabled: boolean;
  isOwner?: boolean;
}) {
  const router = useRouter();
  const [favPending, startFav] = React.useTransition();
  const [delPending, startDel] = React.useTransition();
  const [shopPending, startShop] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [fav, setFav] = React.useState(isFavorite);

  function addToShopping() {
    startShop(async () => {
      const res = await addRecipeToShoppingListAction(recipeId);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(
        res.data.added > 0
          ? `${res.data.added} ingredientes añadidos a la lista`
          : "Los ingredientes ya estaban en tu lista"
      );
    });
  }

  function onToggleFav() {
    startFav(async () => {
      const res = await toggleFavoriteAction(recipeId);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      setFav(res.data.isFavorite);
    });
  }

  function onDelete() {
    startDel(async () => {
      const res = await deleteRecipeAction(recipeId);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Receta eliminada");
      setOpen(false);
      router.push("/recipes");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isOwner && (
        <Button
          variant="outline"
          onClick={onToggleFav}
          disabled={favPending}
          aria-pressed={fav}
        >
          <Heart
            className={fav ? "size-4 fill-pink-500 text-pink-500" : "size-4"}
          />
          {fav ? "Favorita" : "Marcar favorita"}
        </Button>
      )}

      <Button
        variant="outline"
        onClick={addToShopping}
        disabled={shopPending}
      >
        <ShoppingBasket className="size-4" />
        {shopPending ? "Añadiendo…" : "A la compra"}
      </Button>

      {pdfEnabled ? (
        <Button
          variant="outline"
          render={
            <a
              href={`/api/recipes/${recipeId}/pdf`}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          <FileDown className="size-4" />
          Descargar PDF
        </Button>
      ) : (
        <Button
          variant="outline"
          disabled
          title="Disponible en plan Pro"
        >
          <FileDown className="size-4" />
          PDF (Pro)
        </Button>
      )}

      {isOwner && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button variant="destructive">
                <Trash2 className="size-4" />
                Eliminar
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar esta receta?</DialogTitle>
              <DialogDescription className="space-y-2">
                {recipeTitle && (
                  <span className="block rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
                    {recipeTitle}
                  </span>
                )}
                <span className="block">
                  Esta acción no se puede deshacer. La imagen asociada
                  también se borrará.
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setOpen(false)}
                disabled={delPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={onDelete}
                disabled={delPending}
              >
                <Trash2 className="size-4" />
                {delPending ? "Eliminando…" : "Sí, eliminar"}
              </Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
