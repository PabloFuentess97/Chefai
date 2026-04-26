import { NextResponse, type NextRequest } from "next/server";
import { Readable } from "node:stream";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCurrentPlan, planHasFeature } from "@/lib/plans";
import { getBranding } from "@/lib/branding";
import { renderCookbookPdf } from "@/lib/cookbook-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const user = await requireUser();
  const plan = await getCurrentPlan(user.id);

  if (!planHasFeature(plan, "cookbookExport")) {
    return NextResponse.json(
      { error: "Disponible solo en plan Pro o superior." },
      { status: 403 }
    );
  }

  const recipes = await prisma.recipe.findMany({
    where: { userId: user.id, isFavorite: true },
    orderBy: { createdAt: "asc" },
    include: {
      ingredients: { orderBy: { sortOrder: "asc" } },
      steps: { orderBy: { order: "asc" } },
    },
  });

  if (recipes.length === 0) {
    return NextResponse.json(
      {
        error:
          "No tienes recetas favoritas todavía. Marca algunas como favoritas para crear tu recetario.",
      },
      { status: 400 }
    );
  }

  const branding = await getBranding();
  const stream = await renderCookbookPdf({
    brandName: branding.name,
    brandColor: branding.color,
    authorName: user.name?.trim() || user.email.split("@")[0] || "Chef",
    recipes,
  });
  const webStream = Readable.toWeb(stream as Readable) as unknown as ReadableStream;

  const safeName = (user.name ?? "recetario")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recetario-${safeName || "personal"}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
