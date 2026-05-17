import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { BlogGenerateForm } from "@/components/admin/blog-generate-form";

export const metadata = { title: "Admin · Generar post con IA" };

export default async function NewBlogPostPage() {
  const categories = await prisma.blogCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true },
  });

  return (
    <div className="space-y-6">
      <Link
        href="/admin/blog"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Generar post con IA
        </h1>
        <p className="text-muted-foreground">
          Dile a la IA sobre qué escribir y se ocupa de todo: título, slug,
          meta SEO, cuerpo en Markdown e imagen hero. Lo dejamos como
          borrador y tú lo revisas antes de publicar.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <BlogGenerateForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
