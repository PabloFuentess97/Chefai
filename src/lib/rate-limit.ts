import "server-only";
import { prisma } from "./db";
import { logger } from "./logger";

export type RateLimitResult = { ok: boolean; remaining: number };

// In-process cache. Fast (no I/O), fails closed if the request rate is
// way above max — protects against DB outages or slowdowns. Single-
// instance only, so the DB layer below remains the source of truth for
// fair cross-instance limits. Worst case if BD is healthy: tiny race
// window where one extra request slips through per instance per window.
type MemEntry = { count: number; windowEnd: number };
const memCache = new Map<string, MemEntry>();

// Light periodic cleanup so the map doesn't grow unbounded. Skips the GC
// if there are few entries. Runs on next call after 5 min.
let lastSweep = 0;
function maybeSweep(now: number) {
  if (now - lastSweep < 5 * 60_000) return;
  lastSweep = now;
  for (const [k, v] of memCache) {
    if (v.windowEnd < now) memCache.delete(k);
  }
}

export async function rateLimit(
  key: string,
  max: number,
  windowSec: number
): Promise<RateLimitResult> {
  const nowMs = Date.now();
  const now = new Date(nowMs);
  const windowEnd = new Date(nowMs + windowSec * 1000);
  maybeSweep(nowMs);

  // Layer 1: in-memory pre-check. If we're already 1.5× over the limit in
  // this process, refuse immediately — even if the DB later disagrees.
  const mem = memCache.get(key);
  if (!mem || mem.windowEnd < nowMs) {
    memCache.set(key, { count: 1, windowEnd: nowMs + windowSec * 1000 });
  } else {
    mem.count += 1;
    if (mem.count > Math.ceil(max * 1.5)) {
      return { ok: false, remaining: 0 };
    }
  }

  // Layer 2: DB. Authoritative + shared across instances.
  try {
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
  } catch (e) {
    // BD outage — fall back to the in-memory count. Anything within the
    // hard 1.5× cap above goes through; everything else gets the cached
    // count's verdict. We still log because this means the BD is unhealthy.
    logger.warn({ err: e, key }, "rate-limit BD failure — using memory fallback");
    const m = memCache.get(key);
    if (!m) return { ok: true, remaining: max - 1 };
    return {
      ok: m.count <= max,
      remaining: Math.max(0, max - m.count),
    };
  }
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
