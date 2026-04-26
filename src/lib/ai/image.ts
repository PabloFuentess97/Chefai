import "server-only";
import { fal } from "@fal-ai/client";
import { openai } from "@/lib/openai";
import { env } from "@/env";

// ----- Pricing -----

const OPENAI_USD_BY_QUALITY: Record<ImageQuality, number> = {
  low: 0.02,
  standard: 0.04,
  hd: 0.08,
};
// Fal.ai Flux Dev: ~$0.025 per image at 1024x1024 (1 megapixel).
// Slightly higher cost when more steps for "hd".
const FAL_USD_BY_QUALITY: Record<ImageQuality, number> = {
  low: 0.02,
  standard: 0.025,
  hd: 0.035,
};
const EUR_PER_USD = 0.93;

// ----- Lazy Fal client config -----

let _falConfigured = false;
function ensureFalConfigured(): void {
  if (_falConfigured) return;
  if (!env.FAL_KEY) {
    throw new Error("FAL_KEY is not configured but IMAGE_PROVIDER=fal");
  }
  fal.config({ credentials: env.FAL_KEY });
  _falConfigured = true;
}

// ----- Public types -----

export type ImageQuality = "low" | "standard" | "hd";

export type ImageResult = {
  /** PNG base64 (no data URL prefix). */
  b64: string;
  costCents: number;
};

export type GenerateImageInput = {
  prompt: string;
  quality: ImageQuality;
};

// ====================================================================
// generateImageBase64 — provider-agnostic
// ====================================================================

export async function generateImageBase64(
  input: GenerateImageInput
): Promise<ImageResult> {
  if (env.IMAGE_PROVIDER === "fal") {
    return generateImageFal(input);
  }
  return generateImageOpenAI(input);
}

async function generateImageOpenAI(
  input: GenerateImageInput
): Promise<ImageResult> {
  const r = await openai.images.generate({
    model: env.OPENAI_IMAGE_MODEL,
    prompt: input.prompt,
    size: "1024x1024",
    quality:
      input.quality === "hd"
        ? "high"
        : input.quality === "standard"
          ? "medium"
          : "low",
    n: 1,
  });
  const b64 = r.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI image: empty b64_json in response");
  }
  const usd = OPENAI_USD_BY_QUALITY[input.quality];
  return {
    b64,
    costCents: Math.ceil(usd * EUR_PER_USD * 100),
  };
}

async function generateImageFal(
  input: GenerateImageInput
): Promise<ImageResult> {
  ensureFalConfigured();

  const steps =
    input.quality === "hd" ? 35 : input.quality === "standard" ? 28 : 20;

  // fal-ai/flux/dev returns a temporary URL — we MUST download the bytes
  // and re-upload to our own storage (same as we already do for OpenAI's
  // base64 response). Caller saves the returned base64 to disk.
  type FalResult = {
    data?: {
      images?: Array<{ url?: string }>;
    };
  };
  const result = (await fal.subscribe(env.FAL_IMAGE_MODEL, {
    input: {
      prompt: input.prompt,
      image_size: "square_hd", // 1024x1024
      num_inference_steps: steps,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: true,
    },
    logs: false,
  })) as FalResult;

  const imageUrl = result?.data?.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error("Fal: no image URL in response");
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Fal: failed to download image (HTTP ${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const b64 = Buffer.from(arrayBuffer).toString("base64");

  const usd = FAL_USD_BY_QUALITY[input.quality];
  return {
    b64,
    costCents: Math.ceil(usd * EUR_PER_USD * 100),
  };
}
