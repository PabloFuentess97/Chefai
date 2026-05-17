"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  upsertBlogCategoryAction,
  deleteBlogCategoryAction,
} from "@/actions/blog";

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  _count?: { posts: number };
};

export function BlogCategoriesManager({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [editingId, setEditingId] = React.useState<string | null>(null);

  function onSubmit(fd: FormData) {
    start(async () => {
      const res = await upsertBlogCategoryAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(editingId ? "Actualizada" : "Categoría creada");
      setEditingId(null);
      router.refresh();
    });
  }

  function onDelete(id: string, count: number) {
    if (count > 0) {
      if (!confirm(`Esta categoría tiene ${count} post(s). Al eliminarla los posts quedan sin categoría. ¿Continuar?`))
        return;
    } else {
      if (!confirm("¿Eliminar esta categoría?")) return;
    }
    start(async () => {
      const res = await deleteBlogCategoryAction(id);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Eliminada");
      router.refresh();
    });
  }

  const editing = editingId
    ? categories.find((c) => c.id === editingId)
    : null;

  return (
    <div className="space-y-6">
      <form action={onSubmit} className="space-y-4" key={editingId ?? "new"}>
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={editing?.name ?? ""}
              required
              maxLength={60}
              placeholder="Keto"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={editing?.slug ?? ""}
              required
              maxLength={40}
              pattern="[a-z0-9-]+"
              placeholder="keto"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descripción (opcional)</Label>
          <Input
            id="description"
            name="description"
            defaultValue={editing?.description ?? ""}
            maxLength={300}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="color">Color de acento (HEX, opcional)</Label>
            <Input
              id="color"
              name="color"
              defaultValue={editing?.color ?? ""}
              maxLength={7}
              placeholder="#16a34a"
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sortOrder">Orden</Label>
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={editing?.sortOrder ?? 0}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {editingId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingId(null)}
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={pending}>
            <Plus className="size-4" />
            {pending
              ? "Guardando…"
              : editingId
                ? "Guardar cambios"
                : "Crear categoría"}
          </Button>
        </div>
      </form>

      <div className="border-t pt-6 space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Categorías existentes
        </h2>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay categorías. Crea la primera arriba.
          </p>
        ) : (
          <ul className="space-y-2">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {c.color && (
                    <span
                      className="size-3 rounded-full shrink-0"
                      style={{ background: c.color }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      /blog/categoria/{c.slug} ·{" "}
                      {c._count?.posts ?? 0}{" "}
                      {(c._count?.posts ?? 0) === 1 ? "post" : "posts"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(c.id)}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onDelete(c.id, c._count?.posts ?? 0)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
