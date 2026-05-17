"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Save, ImagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  upsertBlogPostAction,
  deleteBlogPostAction,
  regenerateBlogImageAction,
} from "@/actions/blog";

type Category = { id: string; name: string; slug: string };

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string;
  heroImageUrl: string | null;
  heroImagePrompt: string | null;
  authorName: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  ogImageUrl: string | null;
  status: string;
  scheduledFor: Date | string | null;
  categoryId: string | null;
  tags: string[];
};

type State = {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  heroImageUrl: string;
  authorName: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  ogImageUrl: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  scheduledFor: string;
  categoryId: string;
  tags: string;
};

function defaultState(post: BlogPost): State {
  return {
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle ?? "",
    excerpt: post.excerpt ?? "",
    content: post.content,
    heroImageUrl: post.heroImageUrl ?? "",
    authorName: post.authorName ?? "",
    metaTitle: post.metaTitle ?? "",
    metaDescription: post.metaDescription ?? "",
    focusKeyword: post.focusKeyword ?? "",
    ogImageUrl: post.ogImageUrl ?? "",
    status: post.status as State["status"],
    scheduledFor: post.scheduledFor
      ? new Date(post.scheduledFor).toISOString().slice(0, 16)
      : "",
    categoryId: post.categoryId ?? "",
    tags: post.tags.join(", "),
  };
}

export function BlogPostForm({
  post,
  categories,
}: {
  post: BlogPost;
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [deleting, startDelete] = React.useTransition();
  const [regenerating, startRegen] = React.useTransition();
  const [s, setS] = React.useState<State>(() => defaultState(post));

  function update<K extends keyof State>(k: K, v: State[K]) {
    setS((prev) => ({ ...prev, [k]: v }));
  }

  function onSubmit(fd: FormData) {
    start(async () => {
      const res = await upsertBlogPostAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Cambios guardados");
      router.refresh();
    });
  }

  function onDelete() {
    if (!confirm("¿Eliminar este post? No se puede deshacer.")) return;
    startDelete(async () => {
      const res = await deleteBlogPostAction(post.id);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Eliminado");
      router.push("/admin/blog");
      router.refresh();
    });
  }

  function onRegenerateImage() {
    startRegen(async () => {
      const res = await regenerateBlogImageAction(post.id);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      update("heroImageUrl", res.data.imageUrl);
      toast.success("Imagen regenerada");
    });
  }

  const metaTitleLen = s.metaTitle.length;
  const metaDescLen = s.metaDescription.length;

  return (
    <form action={onSubmit} className="space-y-8">
      <input type="hidden" name="id" value={post.id} />

      {/* Status */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Estado
        </legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              ["DRAFT", "Borrador"],
              ["SCHEDULED", "Programado"],
              ["PUBLISHED", "Publicado"],
              ["ARCHIVED", "Archivado"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => update("status", val)}
              className={
                s.status === val
                  ? "rounded-xl border-2 border-primary bg-primary/5 p-3 text-sm font-semibold"
                  : "rounded-xl border bg-card p-3 text-sm hover:border-foreground/30"
              }
            >
              {label}
            </button>
          ))}
        </div>
        <input type="hidden" name="status" value={s.status} />
        {s.status === "SCHEDULED" && (
          <div className="space-y-1">
            <Label htmlFor="scheduledFor">Programar para</Label>
            <Input
              id="scheduledFor"
              name="scheduledFor"
              type="datetime-local"
              value={s.scheduledFor}
              onChange={(e) => update("scheduledFor", e.target.value)}
            />
          </div>
        )}
      </fieldset>

      {/* Identidad */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Identidad
        </legend>
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            name="title"
            value={s.title}
            onChange={(e) => update("title", e.target.value)}
            required
            maxLength={200}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              value={s.slug}
              onChange={(e) => update("slug", e.target.value)}
              required
              maxLength={120}
              pattern="[a-z0-9-]+"
            />
            <p className="text-[11px] text-muted-foreground">
              <code className="bg-muted px-1 rounded">/blog/{s.slug}</code>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryId">Categoría</Label>
            <select
              id="categoryId"
              name="categoryId"
              value={s.categoryId}
              onChange={(e) => update("categoryId", e.target.value)}
              className="w-full rounded-md border bg-background px-3 h-10 text-sm"
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subtitle">Subtítulo (opcional)</Label>
          <Input
            id="subtitle"
            name="subtitle"
            value={s.subtitle}
            onChange={(e) => update("subtitle", e.target.value)}
            maxLength={300}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="excerpt">Resumen (excerpt)</Label>
          <textarea
            id="excerpt"
            name="excerpt"
            value={s.excerpt}
            onChange={(e) => update("excerpt", e.target.value)}
            maxLength={500}
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="authorName">Autor</Label>
            <Input
              id="authorName"
              name="authorName"
              value={s.authorName}
              onChange={(e) => update("authorName", e.target.value)}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (separados por coma)</Label>
            <Input
              id="tags"
              name="tags"
              value={s.tags}
              onChange={(e) => update("tags", e.target.value)}
              placeholder="keto, cena, rapidas"
            />
          </div>
        </div>
      </fieldset>

      {/* Imagen */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Imagen hero
        </legend>
        {s.heroImageUrl ? (
          <div className="flex items-start gap-4">
            <div className="relative w-48 aspect-[16/9] rounded-lg overflow-hidden bg-muted shrink-0">
              <Image
                src={s.heroImageUrl}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="heroImageUrl">URL</Label>
              <Input
                id="heroImageUrl"
                name="heroImageUrl"
                value={s.heroImageUrl}
                onChange={(e) => update("heroImageUrl", e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRegenerateImage}
                disabled={regenerating}
              >
                <ImagePlus className="size-4" />
                {regenerating ? "Regenerando…" : "Regenerar con IA"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              name="heroImageUrl"
              value={s.heroImageUrl}
              onChange={(e) => update("heroImageUrl", e.target.value)}
              placeholder="https://… o /uploads/blog/…"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRegenerateImage}
              disabled={regenerating}
            >
              <ImagePlus className="size-4" />
              {regenerating ? "Generando…" : "Generar imagen con IA"}
            </Button>
          </div>
        )}
      </fieldset>

      {/* Contenido */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Contenido (Markdown)
        </legend>
        <textarea
          id="content"
          name="content"
          value={s.content}
          onChange={(e) => update("content", e.target.value)}
          rows={24}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono leading-relaxed"
          required
        />
        <p className="text-[11px] text-muted-foreground">
          Soporta encabezados (<code>##</code>, <code>###</code>),{" "}
          <strong>negritas</strong>, listas con <code>-</code> o{" "}
          <code>1.</code>, enlaces, citas. El H1 lo pone automáticamente la
          página con el título.
        </p>
      </fieldset>

      {/* SEO */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          SEO
        </legend>
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <Label htmlFor="metaTitle">Meta título</Label>
            <span
              className={
                metaTitleLen > 60
                  ? "text-[11px] text-amber-600"
                  : "text-[11px] text-muted-foreground"
              }
            >
              {metaTitleLen} / ~60
            </span>
          </div>
          <Input
            id="metaTitle"
            name="metaTitle"
            value={s.metaTitle}
            onChange={(e) => update("metaTitle", e.target.value)}
            maxLength={70}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <Label htmlFor="metaDescription">Meta descripción</Label>
            <span
              className={
                metaDescLen > 160
                  ? "text-[11px] text-amber-600"
                  : "text-[11px] text-muted-foreground"
              }
            >
              {metaDescLen} / ~155
            </span>
          </div>
          <textarea
            id="metaDescription"
            name="metaDescription"
            value={s.metaDescription}
            onChange={(e) => update("metaDescription", e.target.value)}
            maxLength={170}
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="focusKeyword">Keyword principal</Label>
            <Input
              id="focusKeyword"
              name="focusKeyword"
              value={s.focusKeyword}
              onChange={(e) => update("focusKeyword", e.target.value)}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ogImageUrl">OG image (opcional)</Label>
            <Input
              id="ogImageUrl"
              name="ogImageUrl"
              value={s.ogImageUrl}
              onChange={(e) => update("ogImageUrl", e.target.value)}
              placeholder="Si vacío, usa la imagen hero"
            />
          </div>
        </div>
      </fieldset>

      <div className="flex justify-between items-center gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onDelete}
          disabled={deleting}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
          {deleting ? "Eliminando…" : "Eliminar"}
        </Button>
        <Button type="submit" disabled={pending}>
          <Save className="size-4" />
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
