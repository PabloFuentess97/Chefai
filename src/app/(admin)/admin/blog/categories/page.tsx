import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { BlogCategoriesManager } from "@/components/admin/blog-categories-manager";

export const metadata = { title: "Admin · Categorías del blog" };

export default async function BlogCategoriesPage() {
  const categories = await prisma.blogCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { posts: true } } },
  });

  return (
    <div className="space-y-6">
      <Link
        href="/admin/blog"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver al blog
      </Link>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Categorías
        </h1>
        <p className="text-muted-foreground">
          Las categorías ayudan a clasificar posts y mejorar la navegación
          por temas.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <BlogCategoriesManager categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
