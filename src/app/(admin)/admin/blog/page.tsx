import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Sparkles,
  Eye,
  Calendar,
  Tags,
  FileText,
  ExternalLink,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Admin · Blog" };

const fmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" });

export default async function BlogAdminPage() {
  const [posts, categories] = await Promise.all([
    prisma.blogPost.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { category: { select: { name: true, color: true } } },
    }),
    prisma.blogCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { posts: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Blog
          </h1>
          <p className="text-muted-foreground">
            Crea posts orientados al SEO. La IA escribe el contenido y genera
            la imagen; tú revisas y publicas.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            render={<Link href="/admin/blog/categories" />}
          >
            <Tags className="size-4" />
            Categorías
          </Button>
          <Button render={<Link href="/admin/blog/new" />}>
            <Sparkles className="size-4" />
            Generar con IA
          </Button>
        </div>
      </div>

      {/* Category strip */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-card"
              style={c.color ? { borderColor: `${c.color}80` } : undefined}
            >
              {c.color && (
                <span
                  className="size-2 rounded-full"
                  style={{ background: c.color }}
                  aria-hidden="true"
                />
              )}
              {c.name}
              <span className="text-muted-foreground">
                · {c._count.posts}
              </span>
            </span>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <FileText className="size-8 mx-auto text-muted-foreground" />
            <p className="font-semibold">El blog está vacío</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Pulsa "Generar con IA" y la IA escribirá un post completo
              optimizado para SEO con imagen incluida.
            </p>
            <Button render={<Link href="/admin/blog/new" />}>
              <Sparkles className="size-4" />
              Generar primer post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {posts.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border bg-card p-4 hover:border-primary hover:shadow-md transition-all"
            >
              <Link
                href={`/admin/blog/${p.id}`}
                className="flex gap-4 items-start"
              >
                {p.heroImageUrl ? (
                  <div className="relative size-20 sm:size-24 rounded-lg overflow-hidden bg-muted shrink-0">
                    <Image
                      src={p.heroImageUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="size-20 sm:size-24 rounded-lg bg-muted grid place-items-center shrink-0">
                    <FileText className="size-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={p.status} />
                    {p.category && (
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
                        style={
                          p.category.color
                            ? {
                                borderColor: `${p.category.color}80`,
                                color: p.category.color,
                              }
                            : undefined
                        }
                      >
                        {p.category.name}
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground">
                      /blog/{p.slug}
                    </p>
                  </div>
                  <p className="font-semibold leading-tight">{p.title}</p>
                  {p.excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {p.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 flex-wrap">
                    {p.publishedAt && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3" />
                        {fmt.format(p.publishedAt)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3" />
                      {p.viewCount} vistas
                    </span>
                    {p.focusKeyword && (
                      <span className="font-mono opacity-70">
                        🎯 {p.focusKeyword}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              {p.status === "PUBLISHED" && (
                <div className="pt-3 mt-3 border-t border-border/50">
                  <a
                    href={`/blog/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="size-3" />
                    Ver post público
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PUBLISHED") return <Badge>Publicado</Badge>;
  if (status === "SCHEDULED")
    return <Badge variant="outline">Programado</Badge>;
  if (status === "ARCHIVED")
    return <Badge variant="outline">Archivado</Badge>;
  return <Badge variant="outline">Borrador</Badge>;
}
