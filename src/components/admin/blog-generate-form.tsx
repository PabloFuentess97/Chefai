"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateBlogDraftAction } from "@/actions/blog";
import { cn } from "@/lib/utils";

type Category = { id: string; slug: string; name: string };

const POST_TYPES: { id: string; label: string; desc: string }[] = [
  {
    id: "listicle",
    label: "Listicle",
    desc: "Las N mejores… · top N · ranking",
  },
  {
    id: "guide",
    label: "Guía",
    desc: "Paso a paso, cómo hacer algo",
  },
  {
    id: "comparison",
    label: "Comparativa",
    desc: "X vs Y · pros y contras",
  },
  {
    id: "recipe-roundup",
    label: "Recopilación de recetas",
    desc: "Varias recetas con ingredientes clave",
  },
  {
    id: "explainer",
    label: "Explicativo",
    desc: "Qué es, por qué importa, mitos comunes",
  },
];

export function BlogGenerateForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [postType, setPostType] = React.useState("listicle");
  const [generateImage, setGenerateImage] = React.useState(true);

  function onSubmit(fd: FormData) {
    fd.set("postType", postType);
    if (generateImage) fd.set("generateImage", "on");
    start(async () => {
      const res = await generateBlogDraftAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Post generado · revísalo antes de publicar");
      router.push(`/admin/blog/${res.data.id}`);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-7">
      <div className="space-y-2">
        <Label htmlFor="topic">Tema del post</Label>
        <Input
          id="topic"
          name="topic"
          required
          maxLength={200}
          placeholder='Ej. "Las 10 mejores recetas keto para cenar"'
        />
        <p className="text-[11px] text-muted-foreground">
          Cuanto más concreto, mejor. Incluye el ángulo que quieras: nivel
          (principiante, avanzado), momento del día, ingredientes, dieta…
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="focusKeyword">Keyword principal (opcional)</Label>
          <Input
            id="focusKeyword"
            name="focusKeyword"
            maxLength={80}
            placeholder="recetas keto cena"
          />
          <p className="text-[11px] text-muted-foreground">
            Si la dejas vacía, la IA decide la mejor según el tema.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetAudience">Público objetivo (opcional)</Label>
          <Input
            id="targetAudience"
            name="targetAudience"
            maxLength={120}
            placeholder="Adultos que empiezan dieta keto y cocinan en casa"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Tipo de post</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {POST_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPostType(t.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-all active:scale-[0.98]",
                postType === t.id
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border hover:border-foreground/30"
              )}
            >
              <p className="font-semibold text-sm">{t.label}</p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-1">
                {t.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="categorySlug">Categoría (opcional)</Label>
          <select
            id="categorySlug"
            name="categorySlug"
            className="w-full rounded-md border bg-background px-3 h-10 text-sm"
            defaultValue=""
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm self-end pb-2">
          <input
            type="checkbox"
            checked={generateImage}
            onChange={(e) => setGenerateImage(e.target.checked)}
            className="size-4 accent-primary"
          />
          Generar imagen hero con IA (recomendado)
        </label>
      </div>

      <div className="rounded-xl bg-muted/40 border p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">
          ⏱ La generación tarda 20-40 segundos
        </p>
        <p>
          La IA escribe un post de 1500-2200 palabras con estructura SEO
          (H2/H3, FAQs, llamada a la acción a ChefAI) y, si lo activas,
          genera también una imagen hero. El resultado queda en{" "}
          <strong>borrador</strong> para que lo revises antes de publicar.
        </p>
      </div>

      <Button type="submit" disabled={pending} size="lg">
        <Sparkles className="size-4" />
        {pending ? "Generando con IA…" : "Generar post"}
      </Button>
    </form>
  );
}
