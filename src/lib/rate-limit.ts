import "server-only";
import { prisma } from "./db";

export type RateLimitResult = { ok: boolean; remaining: number };

export async function rateLimit(
  key: string,
  max: number,
  windowSec: number
): Promise<RateLimitResult> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowSec * 1000);

  const existing = await prisma.rateLimit.findUnique({ where: { key } });

  if (!existing || existing.windowEnd < now) {
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, windowEnd },
      update: { count: 1, windowEnd },
    });
    return { ok: true, remaining: max - 1 };
  }

  const updated = await prisma.rateLimit.update({
    where: { key },
    data: { count: { increment: 1 } },
  });

  return {
    ok: updated.count <= max,
    remaining: Math.max(0, max - updated.count),
  };
}

export async function withRateLimit<T>(
  key: string,
  max: number,
  windowSec: number,
  fn: () => Promise<T>
): Promise<{ ok: true; data: T } | { ok: false; remaining: number }> {
  const rl = await rateLimit(key, max, windowSec);
  if (!rl.ok) return { ok: false, remaining: rl.remaining };
  const data = await fn();
  return { ok: true, data };
}
