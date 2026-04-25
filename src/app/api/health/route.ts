import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const ok = dbOk;
  return NextResponse.json(
    { ok, db: dbOk, ts: new Date().toISOString() },
    { status: ok ? 200 : 503 }
  );
}
