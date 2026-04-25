import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Next.js standalone bundles `public/` only at build time. Files written at
// runtime (recipe images) aren't served by the static handler — so we serve
// them ourselves from this route, reading the same on-disk path.
const UPLOADS_BASE = path.resolve(
  process.cwd(),
  process.env.UPLOADS_DIR ?? "./public/uploads"
);

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { path: parts } = await params;
  if (!parts || parts.length === 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Path traversal protection
  const rel = parts.join("/");
  if (rel.includes("..") || rel.startsWith("/")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const abs = path.join(UPLOADS_BASE, rel);
  if (!abs.startsWith(UPLOADS_BASE + path.sep) && abs !== UPLOADS_BASE) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const buf = await fs.readFile(abs);
    const ext = path.extname(rel).toLowerCase();
    const contentType = MIME[ext] ?? "application/octet-stream";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(buf.length),
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
