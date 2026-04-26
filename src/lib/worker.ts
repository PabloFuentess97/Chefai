import "server-only";
import { Worker } from "bullmq";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import {
  getRedisConnection,
  getScannerQueue,
  QUEUE,
  SCANNER_QUEUE,
  enqueueImageJob,
  isRecipeOnImageCooldown,
  setRecipeImageCooldown,
  type ImageJobData,
} from "./queue";
import { generateImageBase64 } from "./ai/image";
import { env } from "@/env";
import { prisma } from "./db";
import { logger } from "./logger";
import { IMAGE_PROMPT_PREFIX } from "./prompts";

let started = false;

const SCAN_BATCH_SIZE = 10; // recipes per tick
const SCAN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function startImageWorker(): void {
  if (started) return;
  const conn = getRedisConnection();
  if (!conn) {
    logger.info("REDIS_URL not configured — image jobs run inline");
    return;
  }
  started = true;

  // ---------- 1) Image generation worker ----------

  const worker = new Worker<ImageJobData>(
    QUEUE,
    async (job) => {
      const { recipeId, userId, imagePrompt, quality } = job.data;
      logger.info({ jobId: job.id, recipeId }, "image worker: start");

      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { id: true, imageStoragePath: true },
      });
      if (!recipe || recipe.imageStoragePath) {
        logger.info({ recipeId }, "image worker: skipping, already has image");
        return;
      }

      let b64: string;
      try {
        const r = await generateImageBase64({
          prompt: `${IMAGE_PROMPT_PREFIX} ${imagePrompt}`,
          quality,
        });
        b64 = r.b64;
      } catch (e) {
        logger.warn({ err: e, recipeId }, "image worker: provider error");
        // Set a cooldown so the periodic scanner doesn't immediately re-enqueue
        await setRecipeImageCooldown(recipeId, 30 * 60);
        throw e; // BullMQ retries per the job's attempts/backoff config
      }

      const dir = path.resolve(process.cwd(), env.UPLOADS_DIR, userId);
      await fs.mkdir(dir, { recursive: true });
      const id = crypto.randomBytes(10).toString("hex");
      const filename = `${id}.png`;
      const absolutePath = path.join(dir, filename);
      await fs.writeFile(absolutePath, Buffer.from(b64, "base64"));

      await prisma.recipe.update({
        where: { id: recipeId },
        data: {
          imageUrl: `/uploads/${userId}/${filename}`,
          imageStoragePath: absolutePath,
        },
      });

      logger.info({ recipeId }, "image worker: done");
    },
    {
      connection: conn,
      // Rate limits are tight on most image providers; cap concurrency.
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job?.id }, "image job completed");
  });
  worker.on("failed", (job, err) => {
    logger.warn(
      { jobId: job?.id, attempts: job?.attemptsMade, err: err?.message },
      "image job failed"
    );
  });

  // ---------- 2) Scanner worker — fills missing images periodically ----------

  const scanner = new Worker(
    SCANNER_QUEUE,
    async () => {
      logger.info("scanner: tick start");
      const enqueued = await scanAndEnqueueMissingImages();
      logger.info({ enqueued }, "scanner: tick done");
    },
    { connection: conn, concurrency: 1 }
  );

  scanner.on("failed", (job, err) => {
    logger.warn({ jobId: job?.id, err: err?.message }, "scanner job failed");
  });

  // ---------- 3) Bootstrap the periodic schedule ----------

  void scheduleScanner();
}

async function scheduleScanner(): Promise<void> {
  const queue = getScannerQueue();
  if (!queue) return;

  try {
    // Remove any previous repeatable schedules with the same name to avoid
    // duplicates after a redeploy.
    const existing = await queue.getRepeatableJobs();
    for (const job of existing) {
      if (job.name === "scan") {
        try {
          await queue.removeRepeatableByKey(job.key);
        } catch {
          /* ignore */
        }
      }
    }
    await queue.add(
      "scan",
      {},
      {
        repeat: { every: SCAN_INTERVAL_MS },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
      }
    );
    // Also kick off one immediate run so users don't wait 5 minutes for the
    // first scan after a redeploy.
    await queue.add("scan", {}, { delay: 5_000 });
    logger.info(
      { everyMs: SCAN_INTERVAL_MS, batch: SCAN_BATCH_SIZE },
      "scanner: schedule installed"
    );
  } catch (e) {
    logger.warn({ err: e }, "scanner: failed to schedule");
  }
}

/**
 * Find recipes belonging to (or referenced by) paid users with imagesEnabled
 * that lack an image, and enqueue image-gen jobs for the next batch.
 */
async function scanAndEnqueueMissingImages(): Promise<number> {
  const now = new Date();

  // Eligible if either the owner has imagesEnabled OR the recipe is referenced
  // in a meal plan whose owner has imagesEnabled.
  const candidates = await prisma.recipe.findMany({
    where: {
      imageStoragePath: null,
      OR: [
        {
          user: {
            subscription: {
              status: { in: ["ACTIVE", "TRIALING"] },
              currentPeriodEnd: { gt: now },
              plan: { imagesEnabled: true },
            },
          },
        },
        {
          mealPlanItems: {
            some: {
              plan: {
                user: {
                  subscription: {
                    status: { in: ["ACTIVE", "TRIALING"] },
                    currentPeriodEnd: { gt: now },
                    plan: { imagesEnabled: true },
                  },
                },
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      userId: true,
      title: true,
      description: true,
      cuisine: true,
      user: {
        select: {
          subscription: {
            select: {
              plan: { select: { imageQuality: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: SCAN_BATCH_SIZE * 3, // over-fetch; we'll filter cooldown
  });

  let enqueued = 0;
  for (const recipe of candidates) {
    if (enqueued >= SCAN_BATCH_SIZE) break;

    const onCooldown = await isRecipeOnImageCooldown(recipe.id);
    if (onCooldown) continue;

    // Build a prompt from the recipe metadata (we don't store the original
    // imagePrompt; this is good enough).
    const promptParts = [
      recipe.title,
      recipe.description ?? "",
      recipe.cuisine ? `${recipe.cuisine} cuisine` : "",
    ].filter(Boolean);
    const prompt = promptParts.join(", ");

    const quality =
      (recipe.user.subscription?.plan?.imageQuality as
        | "low"
        | "standard"
        | "hd"
        | undefined) ?? "standard";

    const ok = await enqueueImageJob({
      recipeId: recipe.id,
      userId: recipe.userId,
      imagePrompt: prompt,
      quality,
    });

    if (ok) {
      // Apply cooldown immediately so we don't double-enqueue across overlapping ticks
      await setRecipeImageCooldown(recipe.id, 30 * 60);
      enqueued += 1;
    }
  }
  return enqueued;
}
