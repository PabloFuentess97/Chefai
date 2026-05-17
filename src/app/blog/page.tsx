import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Sparkles, Clock, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { getBranding } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { readingTimeMinutes } from "@/lib/blog-ai";

const fmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "long" });

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: `Blog · ${branding.name}`,
    description: `Recetas, trucos de cocina y consejos de nutrición. ${branding.name} te ayuda a comer mejor sin complicarte.`,
    openGraph: {
      title: `Blog · ${branding.name}`,
      description: "Recetas, trucos de cocina y consejos de nutrición.",
      type: "website",
    },
  };
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const branding = await getBranding();

  const [categories, allPosts] = await Promise.all([
    prisma.blogCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { posts: true } } },
    }),
    prisma.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { lte: new Date() },
        ...(sp.categoria
          ? { category: { slug: sp.categoria } }
          : {}),
        ...(sp.tag ? { tags: { has: sp.tag } } : {}),
      },
      orderBy: { publishedAt: "desc" },
      include: { category: { select: { name: true, slug: true, color: true } } },
    }),
  ]);

  const featured = allPosts[0];
  const rest = allPosts.slice(1);
  const activeCategory = sp.categoria
    ? categories.find((c) => c.slug === sp.categoria)
    : null;

  return (
    <div className="min-h-svh bg-background">
      {/* Top bar */}
      <header className="border-b border-border/60 bg-background/85 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-bold tracking-wide hover:text-primary"
          >
            {branding.name}
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-foreground"
            >
              Planes
            </Link>
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground"
            >
              Iniciar sesión
            </Link>
            <Button size="sm" render={<Link href="/register" />}>
              Empezar gratis
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-6 md:pt-20">
        <div className="text-center max-w-3xl mx-auto">
          <p className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary">
            <Sparkles className="size-3.5" />
            Blog de {branding.name}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-4 text-pretty">
            {activeCategory
              ? activeCategory.name
              : "Recetas, trucos y nutrición"}
          </h1>
          <p className="text-muted-foreground mt-3 text-lg text-pretty">
            {activeCategory?.description ??
              `Cocina mejor cada día. Artículos sobre dietas, técnicas, ingredientes y recetas creadas con IA.`}
          </p>
        </div>
      </section>

      {/* Category strip */}
      {categories.length > 0 && (
        <div className="mx-auto max-w-6xl px-4 mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              href="/blog"
              className={
                !sp.categoria
                  ? "shrink-0 px-3.5 h-9 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center"
                  : "shrink-0 px-3.5 h-9 rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-medium inline-flex items-center"
              }
            >
              Todos
            </Link>
            {categories.map((c) => {
              const active = sp.categoria === c.slug;
              return (
                <Link
                  key={c.id}
                  href={`/blog?categoria=${c.slug}`}
                  className={
                    active
                      ? "shrink-0 px-3.5 h-9 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center"
                      : "shrink-0 px-3.5 h-9 rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-medium inline-flex items-center"
                  }
                  style={
                    active && c.color
                      ? { background: c.color, color: "#fff" }
                      : undefined
                  }
                >
                  {c.name}
                  <span className="ml-1.5 opacity-70 text-xs">
                    {c._count.posts}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {allPosts.length === 0 ? (
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <p className="text-lg text-muted-foreground">
            Aún no hay artículos publicados.
          </p>
        </div>
      ) : (
        <>
          {/* Featured */}
          {featured && (
            <section className="mx-auto max-w-6xl px-4 pb-10">
              <Link
                href={`/blog/${featured.slug}`}
                className="grid md:grid-cols-2 gap-6 rounded-2xl border bg-card overflow-hidden hover:border-primary transition-colors group"
              >
                <div className="relative aspect-[16/10] md:aspect-auto bg-muted">
                  {featured.heroImageUrl ? (
                    <Image
                      src={featured.heroImageUrl}
                      alt={featured.title}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  ) : null}
                </div>
                <div className="p-6 md:p-8 flex flex-col justify-center gap-3">
                  {featured.category && (
                    <span
                      className="self-start text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                      style={
                        featured.category.color
                          ? {
                              background: `${featured.category.color}1f`,
                              color: featured.category.color,
                            }
                          : { background: "rgba(22,163,74,0.12)", color: "var(--primary, #16a34a)" }
                      }
                    >
                      {featured.category.name}
                    </span>
                  )}
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight group-hover:text-primary transition-colors">
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p className="text-muted-foreground text-pretty leading-relaxed">
                      {featured.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    {featured.publishedAt && (
                      <span>{fmt.format(featured.publishedAt)}</span>
                    )}
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {readingTimeMinutes(featured.content)} min
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1 text-sm font-semibold text-primary mt-2">
                    Leer el artículo
                    <ArrowRight className="size-4" />
                  </div>
                </div>
              </Link>
            </section>
          )}

          {/* Grid */}
          {rest.length > 0 && (
            <section className="mx-auto max-w-6xl px-4 pb-16">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {rest.map((p) => (
                  <Link
                    key={p.id}
                    href={`/blog/${p.slug}`}
                    className="group rounded-xl border bg-card overflow-hidden hover:border-primary transition-colors"
                  >
                    <div className="relative aspect-[16/10] bg-muted">
                      {p.heroImageUrl ? (
                        <Image
                          src={p.heroImageUrl}
                          alt={p.title}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        />
                      ) : null}
                    </div>
                    <div className="p-4 space-y-2">
                      {p.category && (
                        <span
                          className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={
                            p.category.color
                              ? {
                                  background: `${p.category.color}1f`,
                                  color: p.category.color,
                                }
                              : undefined
                          }
                        >
                          {p.category.name}
                        </span>
                      )}
                      <p className="font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {p.title}
                      </p>
                      {p.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {p.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                        {p.publishedAt && (
                          <span>{fmt.format(p.publishedAt)}</span>
                        )}
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" />
                          {readingTimeMinutes(p.content)} min
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="rounded-3xl bg-primary text-primary-foreground p-8 md:p-12 text-center">
          <Sparkles className="size-8 mx-auto opacity-80" />
          <h2 className="text-2xl md:text-3xl font-bold mt-3 mb-2">
            Cocina con lo que tienes en la nevera
          </h2>
          <p className="opacity-90 max-w-xl mx-auto">
            {branding.name} genera recetas personalizadas con IA en
            segundos. Prueba gratis.
          </p>
          <Button
            size="lg"
            variant="outline"
            className="mt-5 bg-white text-primary hover:bg-white/90 border-white"
            render={<Link href="/register" />}
          >
            Empezar gratis
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-3">
          <span>
            © {new Date().getFullYear()} {branding.name}
          </span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-foreground">
              Términos
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacidad
            </Link>
            <Link href="/cookies" className="hover:text-foreground">
              Cookies
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
