import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Sparkles,
  Clock,
  Calendar,
  ArrowLeft,
  ArrowRight,
  User,
} from "lucide-react";

import { prisma } from "@/lib/db";
import { getBranding } from "@/lib/branding";
import { renderMarkdown } from "@/lib/markdown";
import { readingTimeMinutes } from "@/lib/blog-ai";
import { Button } from "@/components/ui/button";
import { env } from "@/env";

const fmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "long" });

type Props = { params: Promise<{ slug: string }> };

async function findPost(slug: string) {
  return prisma.blogPost.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
    },
    include: {
      category: { select: { name: true, slug: true, color: true } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const branding = await getBranding();
  const post = await findPost(slug);
  if (!post) return { title: "Artículo no encontrado" };

  const url = `${env.APP_URL ?? "https://chefai.fit"}/blog/${post.slug}`;
  const title = post.metaTitle || `${post.title} · ${branding.name}`;
  const description =
    post.metaDescription || post.excerpt || `${post.title} en ${branding.name}.`;
  const image = post.ogImageUrl || post.heroImageUrl || undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: post.focusKeyword
      ? [post.focusKeyword, ...post.tags]
      : post.tags,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: post.authorName ? [post.authorName] : [branding.name],
      images: image
        ? [
            {
              url: image.startsWith("http") ? image : `${env.APP_URL}${image}`,
              alt: post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await findPost(slug);
  if (!post) notFound();

  const branding = await getBranding();
  const html = await renderMarkdown(post.content);
  const minutes = readingTimeMinutes(post.content);

  // Async + best-effort view counter
  prisma.blogPost
    .update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {});

  // Related: same category, exclude current, latest 3
  const related = post.categoryId
    ? await prisma.blogPost.findMany({
        where: {
          status: "PUBLISHED",
          publishedAt: { lte: new Date() },
          categoryId: post.categoryId,
          NOT: { id: post.id },
        },
        orderBy: { publishedAt: "desc" },
        take: 3,
        include: {
          category: { select: { name: true, color: true } },
        },
      })
    : [];

  const baseUrl = env.APP_URL ?? "https://chefai.fit";
  const url = `${baseUrl}/blog/${post.slug}`;
  const ogImage = post.ogImageUrl || post.heroImageUrl;
  const absoluteImage = ogImage
    ? ogImage.startsWith("http")
      ? ogImage
      : `${baseUrl}${ogImage}`
    : undefined;

  // Structured data (Article + BreadcrumbList)
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": url,
        headline: post.title,
        description: post.metaDescription || post.excerpt || undefined,
        image: absoluteImage,
        datePublished: post.publishedAt?.toISOString(),
        dateModified: post.updatedAt.toISOString(),
        author: {
          "@type": "Organization",
          name: post.authorName || branding.name,
          url: baseUrl,
        },
        publisher: {
          "@type": "Organization",
          name: branding.name,
          url: baseUrl,
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        keywords: post.tags.join(", "),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Inicio",
            item: baseUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: `${baseUrl}/blog`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: url,
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-svh bg-background">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Top bar */}
      <header className="border-b border-border/60 bg-background/85 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-bold tracking-wide hover:text-primary"
          >
            {branding.name}
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/blog"
              className="text-muted-foreground hover:text-foreground"
            >
              Blog
            </Link>
            <Button size="sm" render={<Link href="/register" />}>
              Empezar gratis
            </Button>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 pt-10 pb-16">
        {/* Breadcrumb */}
        <nav
          aria-label="breadcrumb"
          className="text-xs text-muted-foreground mb-6"
        >
          <Link href="/blog" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-3" />
            Volver al blog
          </Link>
        </nav>

        {/* Category */}
        {post.category && (
          <Link
            href={`/blog?categoria=${post.category.slug}`}
            className="inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4"
            style={
              post.category.color
                ? {
                    background: `${post.category.color}1f`,
                    color: post.category.color,
                  }
                : { background: "rgba(22,163,74,0.12)", color: "var(--primary, #16a34a)" }
            }
          >
            {post.category.name}
          </Link>
        )}

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-pretty leading-[1.1]">
          {post.title}
        </h1>
        {post.subtitle && (
          <p className="text-lg md:text-xl text-muted-foreground mt-4 text-pretty leading-relaxed">
            {post.subtitle}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 mt-6 text-sm text-muted-foreground flex-wrap">
          <span className="inline-flex items-center gap-1.5">
            <User className="size-3.5" />
            {post.authorName || branding.name}
          </span>
          {post.publishedAt && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {fmt.format(post.publishedAt)}
              </span>
            </>
          )}
          <span>·</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {minutes} min de lectura
          </span>
        </div>

        {/* Hero image */}
        {post.heroImageUrl && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-muted mt-8 border">
            <Image
              src={post.heroImageUrl}
              alt={post.title}
              fill
              priority
              unoptimized
              sizes="(min-width: 1024px) 768px, 100vw"
              className="object-cover"
            />
          </div>
        )}

        {/* Inline CTA after hero */}
        <InlineCta brandName={branding.name} />

        {/* Body */}
        <div
          className="prose-blog mt-10"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-12 pt-6 border-t">
            {post.tags.map((t) => (
              <Link
                key={t}
                href={`/blog?tag=${encodeURIComponent(t)}`}
                className="text-xs px-3 py-1 rounded-full bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}

        {/* Bottom CTA card */}
        <FinalCta brandName={branding.name} />
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 pb-16">
          <h2 className="text-xl font-bold mb-5">Sigue leyendo</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/blog/${r.slug}`}
                className="group rounded-xl border bg-card overflow-hidden hover:border-primary transition-colors"
              >
                <div className="relative aspect-[16/10] bg-muted">
                  {r.heroImageUrl ? (
                    <Image
                      src={r.heroImageUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  ) : null}
                </div>
                <div className="p-3 space-y-1">
                  <p className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {r.title}
                  </p>
                  {r.publishedAt && (
                    <p className="text-[11px] text-muted-foreground">
                      {fmt.format(r.publishedAt)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-4xl px-4 py-6 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-3">
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

      {/* Inline blog styles — scoped to .prose-blog */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Base typography — always dark text on white page (public blog
               is intentionally light-themed so SEO previews look right) */
            .prose-blog {
              font-size: 17px;
              line-height: 1.75;
              color: #1c1917;
            }
            .prose-blog p {
              margin: 0 0 20px;
              color: #1c1917;
            }
            .prose-blog h2 {
              font-size: 32px;
              line-height: 1.15;
              font-weight: 800;
              margin: 56px 0 18px;
              letter-spacing: -0.6px;
              color: #0c0a09;
              position: relative;
              padding-bottom: 12px;
            }
            .prose-blog h2::after {
              content: "";
              position: absolute;
              left: 0;
              bottom: 0;
              width: 48px;
              height: 3px;
              background: #16a34a;
              border-radius: 2px;
            }
            .prose-blog h3 {
              font-size: 24px;
              line-height: 1.2;
              font-weight: 700;
              margin: 38px 0 12px;
              letter-spacing: -0.3px;
              color: #0c0a09;
            }
            .prose-blog h4 {
              font-size: 18px;
              font-weight: 700;
              margin: 26px 0 8px;
              color: #0c0a09;
            }

            /* Lists — give the bullet a brand color circle */
            .prose-blog ul {
              margin: 0 0 24px 0;
              padding: 0;
              list-style: none;
            }
            .prose-blog ul li {
              position: relative;
              padding-left: 24px;
              margin: 8px 0;
            }
            .prose-blog ul li::before {
              content: "";
              position: absolute;
              left: 4px;
              top: 12px;
              width: 6px;
              height: 6px;
              border-radius: 999px;
              background: #16a34a;
            }

            /* Numbered lists — big brand circles for step-by-step style */
            .prose-blog ol {
              margin: 0 0 28px 0;
              padding: 0;
              list-style: none;
              counter-reset: step;
            }
            .prose-blog ol li {
              position: relative;
              padding-left: 44px;
              margin: 14px 0;
              counter-increment: step;
              min-height: 32px;
            }
            .prose-blog ol li::before {
              content: counter(step);
              position: absolute;
              left: 0;
              top: 2px;
              width: 30px;
              height: 30px;
              border-radius: 999px;
              background: #16a34a;
              color: white;
              font-weight: 700;
              font-size: 14px;
              display: grid;
              place-items: center;
              line-height: 1;
            }

            .prose-blog strong { font-weight: 700; color: #0c0a09; }
            .prose-blog em { font-style: italic; }

            .prose-blog a {
              color: #16a34a;
              text-decoration: underline;
              text-underline-offset: 3px;
              text-decoration-thickness: 1.5px;
              transition: color 0.15s ease;
            }
            .prose-blog a:hover { color: #0f7a37; }

            .prose-blog blockquote {
              margin: 28px 0;
              padding: 16px 22px;
              border-left: 4px solid #16a34a;
              background: #f0fdf4;
              border-radius: 0 14px 14px 0;
              font-style: italic;
              color: #166534;
            }
            .prose-blog blockquote p { margin: 0; color: inherit; }

            .prose-blog code {
              background: #f5f5f4;
              padding: 2px 7px;
              border-radius: 5px;
              font-size: 0.9em;
              color: #be185d;
              font-family: ui-monospace, "SF Mono", "Menlo", "Consolas", monospace;
            }

            .prose-blog hr {
              border: 0;
              border-top: 1px solid #e7e5e4;
              margin: 44px 0;
            }

            /* IMAGES — the big visual upgrade */
            .prose-blog img {
              display: block;
              width: 100%;
              max-width: 100%;
              height: auto;
              margin: 28px auto;
              border-radius: 18px;
              border: 1px solid rgba(0,0,0,0.04);
              box-shadow: 0 18px 50px -16px rgba(0,0,0,0.18),
                          0 4px 12px -2px rgba(0,0,0,0.05);
              aspect-ratio: 4 / 3;
              object-fit: cover;
              background: #f5f5f4;
            }

            /* When an image follows a recipe heading, tighten the gap */
            .prose-blog h3 + p > img,
            .prose-blog h3 + img {
              margin-top: 14px;
            }

            /* Recipe info pills ("**Tiempo:** XX min · **Dificultad:** Fácil") */
            .prose-blog p strong:first-child + br + strong,
            .prose-blog p > strong {
              display: inline;
            }

            /* "Cómo hacerlo" sub-headings (h4) act as step labels */
            .prose-blog h4 {
              color: #16a34a;
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-top: 24px;
              margin-bottom: 10px;
            }
          `,
        }}
      />
    </div>
  );
}

function InlineCta({ brandName }: { brandName: string }) {
  return (
    <div className="my-8 rounded-2xl border border-primary/30 bg-primary/5 p-5 flex items-center gap-4 flex-wrap">
      <Sparkles className="size-5 text-primary shrink-0" />
      <div className="flex-1 min-w-[180px]">
        <p className="font-semibold text-sm">
          ¿Quieres recetas como esta cada día?
        </p>
        <p className="text-xs text-muted-foreground">
          {brandName} genera recetas personalizadas con IA en segundos.
        </p>
      </div>
      <Button size="sm" render={<Link href="/register" />}>
        Probar gratis
        <ArrowRight className="size-3.5" />
      </Button>
    </div>
  );
}

function FinalCta({ brandName }: { brandName: string }) {
  return (
    <div className="mt-14 rounded-3xl bg-primary text-primary-foreground p-8 md:p-10 text-center">
      <Sparkles className="size-8 mx-auto opacity-80" />
      <h2 className="text-2xl md:text-3xl font-bold mt-3 mb-2">
        Cocina con lo que tienes en la nevera
      </h2>
      <p className="opacity-90 max-w-md mx-auto text-sm md:text-base">
        Genera recetas personalizadas con IA adaptadas a tu dieta y tus
        ingredientes. Empieza gratis hoy.
      </p>
      <Button
        size="lg"
        variant="outline"
        className="mt-5 bg-white text-primary hover:bg-white/90 border-white"
        render={<Link href="/register" />}
      >
        Empezar gratis en {brandName}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
