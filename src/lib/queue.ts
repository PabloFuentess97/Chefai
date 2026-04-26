import "server-only";
import IORedis, { type Redis } from "ioredis";
import { Queue } from "bullmq";
import { logger } from "./logger";

export type ImageJobData = {
  recipeId: string;
  userId: string;
  imagePrompt: string;
  quality: "low" | "standard" | "hd";
};

const QUEUE_NAME = "image-gen";
const SCANNER_QUEUE_NAME = "image-scanner";

let _connection: Redis | null = null;
let _queue: Queue<ImageJobData> | null = null;
let _scannerQueue: Queue | null = null;
let _disabled = false;

function tryConnect(): Redis | null {
  if (_disabled) return null;
  if (_connection) return _connection;
  const url = process.env.REDIS_URL;
  if (!url) {
    _disabled = true;
    return null;
  }
  try {
    const conn = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
    });
    conn.on("error", (err) => {
      logger.warn({ err: err.message }, "redis connection error");
    });
    _connection = conn;
    return conn;
  } catch (e) {
    logger.error({ err: e }, "failed to create redis connection");
    _disabled = true;
    return null;
  }
}

export function getQueue(): Queue<ImageJobData> | null {
  const conn = tryConnect();
  if (!conn) return null;
  if (_queue) return _queue;
  _queue = new Queue<ImageJobData>(QUEUE_NAME, { connection: conn });
  return _queue;
}

export function getScannerQueue(): Queue | null {
  const conn = tryConnect();
  if (!conn) return null;
  if (_scannerQueue) return _scannerQueue;
  _scannerQueue = new Queue(SCANNER_QUEUE_NAME, { connection: conn });
  return _scannerQueue;
}

export function getRedisConnection(): Redis | null {
  return tryConnect();
}

export const QUEUE = QUEUE_NAME;
export const SCANNER_QUEUE = SCANNER_QUEUE_NAME;

export async function enqueueImageJob(data: ImageJobData): Promise<boolean> {
  const q = getQueue();
  if (!q) return false;
  try {
    await q.add("generate", data, {
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 100 },
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
    });
    return true;
  } catch (e) {
    logger.warn({ err: e }, "failed to enqueue image job");
    return false;
  }
}

/**
 * Per-recipe cooldown for the scanner so a recipe that keeps failing
 * doesn't get re-enqueued every 5 minutes forever.
 */
export async function isRecipeOnImageCooldown(
  recipeId: string
): Promise<boolean> {
  const conn = tryConnect();
  if (!conn) return false;
  try {
    const v = await conn.get(`image:cooldown:${recipeId}`);
    return v !== null;
  } catch {
    return false;
  }
}

export async function setRecipeImageCooldown(
  recipeId: string,
  ttlSeconds = 30 * 60
): Promise<void> {
  const conn = tryConnect();
  if (!conn) return;
  try {
    await conn.set(`image:cooldown:${recipeId}`, "1", "EX", ttlSeconds);
  } catch {
    /* ignore */
  }
}
