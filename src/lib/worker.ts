import "server-only";
import { Worker } from "bullmq";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { getRedisConnection, QUEUE, type ImageJobData } from "./queue";
import { generateImageBase64 } from "./ai/image";
import { env } from "@/env";
import { prisma } from "./db";
import { logger } from "./logger";
import { IMAGE_PROMPT_PREFIX } from "./prompts";

let started = false;

export function startImageWorker(): void {
  if (started) return;
  const conn = getRedisConnection();
  if (!conn) {
    logger.info("REDIS_URL not configured — image jobs run inline");
    return;
  }
  started = true;

  const worker = new Worker<ImageJobData>(
    QUEUE,
    async (job) => {
      const { recipeId, userId, imagePrompt, quality } = job.data;
      logger.info({ jobId: job.id, recipeId }, "image worker: start");

      // Skip if recipe already has an image (could have been added meanwhile)
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
        throw e; // Let BullMQ retry per job's backoff config
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
      // gpt-image-1 is rate-limited at ~5/min; cap to 2 concurrent and let
      // BullMQ retry on 429 via the job's attempts/backoff config.
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
}
