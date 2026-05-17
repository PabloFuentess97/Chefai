import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { BlogPostForm } from "@/components/admin/blog-post-form";

export const metadata = { title: "Admin · Editar post" };

type Props = { params: Promise<{ id: string }> };

export default async function EditBlogPostPage({ params }: Props) {
  const { id } = await params;
  const [post, categories] = await Promise.all([
    prisma.blogPost.findUnique({ where: { id } }),
    prisma.blogCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);
  if (!post) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/blog"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {post.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            /blog/{post.slug} · {post.viewCount} vistas
          </p>
        </div>
        {post.status === "PUBLISHED" && (
          <a
            href={`/blog/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
          >
            <ExternalLink className="size-3.5" />
            Ver post público
          </a>
        )}
      </div>
      <Card>
        <CardContent className="pt-6">
          <BlogPostForm post={post} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
