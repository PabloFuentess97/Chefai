import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { generateImageBase64 } from "./ai/image";
import { IMAGE_PROMPT_PREFIX } from "./prompts";
import { env } from "@/env";
import { logger } from "./logger";

// Marker format produced by the AI:   [IMAGE: english prompt here ~30 words]
// We replace each occurrence (in the Markdown body) with an `![alt](url)` line.
const IMAGE_MARKER_RE = /^\s*\[IMAGE:\s*([^\]]+)\]\s*$/gm;

/** Best-effort alt derived from the nearest heading above the marker. */
function deriveAltFromHeading(content: string, markerOffset: number): string {
  const before = content.slice(0, markerOffset);
  // Search backwards for the last "### " heading
  const lines = before.split("\n").reverse();
  for (const line of lines) {
    const m = /^#{2,4}\s+(.+)$/.exec(line.trim());
    if (m) {
      // Strip leading "1. " number if present
      return m[1]!.replace(/^\d+\.\s*/, "").trim();
    }
  }
  return "";
}

/** Run a list of promise-producing functions with a max concurrency. */
async function runConcurrent<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++;
      results[i] = await tasks[i]!();
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, worker)
  );
  return results;
}

/**
 * Find every [IMAGE: prompt] marker in the Markdown, generate each image
 * via the configured AI image provider, save the PNG to disk under
 * /uploads/blog/, and return the new Markdown with each marker replaced by
 * `![alt](url)` syntax.
 *
 * Designed to be idempotent: lines that already render as `![…](…)` are
 * left alone. Failed generations leave the marker untouched so the admin
 * can retry from the editor.
 */
export async function processInlineImages(
  markdown: string,
  opts: { concurrency?: number; quality?: "low" | "standard" | "hd" } = {}
): Promise<{ content: string; generated: number; failed: number }> {
  const concurrency = opts.concurrency ?? 3;
  const quality = opts.quality ?? "standard";

  // Collect all markers and their offsets in one pass so we can derive alts.
  type Marker = { fullMatch: string; prompt: string; offset: number; alt: string };
  const markers: Marker[] = [];
  let m: RegExpExecArray | null;
  // Reset lastIndex (global flag)
  IMAGE_MARKER_RE.lastIndex = 0;
  while ((m = IMAGE_MARKER_RE.exec(markdown)) !== null) {
    const fullMatch = m[0];
    const prompt = m[1]!.trim();
    const offset = m.index;
    const alt = deriveAltFromHeading(markdown, offset);
    markers.push({ fullMatch, prompt, offset, alt });
  }

  if (markers.length === 0) {
    return { content: markdown, generated: 0, failed: 0 };
  }

  // Ensure target dir
  const dir = path.resolve(process.cwd(), env.UPLOADS_DIR, "blog");
  await fs.mkdir(dir, { recursive: true });

  const tasks = markers.map((mk) => async (): Promise<{
    marker: Marker;
    ok: boolean;
    url?: string;
  }> => {
    try {
      const result = await generateImageBase64({
        prompt: `${IMAGE_PROMPT_PREFIX} ${mk.prompt}`,
        quality,
      });
      const filename = `${crypto.randomBytes(10).toString("hex")}.png`;
      await fs.writeFile(
        path.join(dir, filename),
        Buffer.from(result.b64, "base64")
      );
      return { marker: mk, ok: true, url: `/uploads/blog/${filename}` };
    } catch (e) {
      logger.warn(
        { err: e, prompt: mk.prompt.slice(0, 80) },
        "blog inline image generation failed"
      );
      return { marker: mk, ok: false };
    }
  });

  const results = await runConcurrent(tasks, concurrency);

  // Replace markers from last to first so offsets stay valid
  let updated = markdown;
  let generated = 0;
  let failed = 0;
  // Reuse markers order; we matched indexes in order of appearance.
  const orderedResults = [...results].reverse();
  for (const r of orderedResults) {
    if (!r.ok || !r.url) {
      failed += 1;
      continue;
    }
    generated += 1;
    const altEscaped = r.marker.alt.replace(/[\[\]]/g, "");
    const replacement = `![${altEscaped}](${r.url})`;
    // Replace this specific occurrence by offset slice (safer than global replace)
    const before = updated.slice(0, r.marker.offset);
    const after = updated.slice(r.marker.offset + r.marker.fullMatch.length);
    updated = before + replacement + after;
  }

  return { content: updated, generated, failed };
}

/** Count how many [IMAGE: ...] markers remain in a Markdown string. */
export function countInlineMarkers(markdown: string): number {
  IMAGE_MARKER_RE.lastIndex = 0;
  let count = 0;
  while (IMAGE_MARKER_RE.exec(markdown) !== null) count += 1;
  return count;
}
