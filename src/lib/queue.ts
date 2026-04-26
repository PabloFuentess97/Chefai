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

let _connection: Redis | null = null;
let _queue: Queue<ImageJobData> | null = null;
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

export function getRedisConnection(): Redis | null {
  return tryConnect();
}

export const QUEUE = QUEUE_NAME;

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
