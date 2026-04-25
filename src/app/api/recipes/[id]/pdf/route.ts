import { NextResponse, type NextRequest } from "next/server";
import { Readable } from "node:stream";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCurrentPlan, planHasFeature } from "@/lib/plans";
import { getBranding } from "@/lib/branding";
import { renderRecipePdf } from "@/lib/pdf";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await requireUser();
  const plan = await getCurrentPlan(user.id);

  if (!planHasFeature(plan, "pdfExport")) {
    return NextResponse.json(
      { error: "PDF disponible solo en plan Pro o superior." },
      { status: 403 }
    );
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { sortOrder: "asc" } },
      steps: { orderBy: { order: "asc" } },
    },
  });

  if (!recipe || recipe.userId !== user.id) {
    return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 });
  }

  const branding = await getBranding();
  const stream = await renderRecipePdf(recipe, branding.name);
  const webStream = Readable.toWeb(stream as Readable) as unknown as ReadableStream;

  const safeName = recipe.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName || "receta"}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
