import "server-only";
import OpenAI from "openai";
import { env } from "@/env";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  buildImagePrompt,
  recipesResponseSchema,
  type RecipesResponse,
} from "./prompts";
import type { GenerateRecipesInput } from "./validators";

// Lazy init so importing this module doesn't crash at build time
// (when OPENAI_API_KEY isn't available) for routes that only need helpers.
let _client: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (_client) return _client;
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  _client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return _client;
}

// Backwards-compatible Proxy: keep `openai.chat.completions.create(...)`
// usage working without rewriting call sites. Each property access lazily
// resolves through the real client.
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const c = getOpenAI() as unknown as Record<string | symbol, unknown>;
    const value = c[prop];
    return typeof value === "function" ? value.bind(c) : value;
  },
});

export type GenerateResult = {
  parsed: RecipesResponse;
  usage: { tokens: number; costCents: number };
};

const TEXT_INPUT_USD_PER_1M = 0.15;
const TEXT_OUTPUT_USD_PER_1M = 0.6;
const IMAGE_USD_BY_QUALITY: Record<string, number> = {
  low: 0.02,
  standard: 0.04,
  hd: 0.08,
};
const EUR_PER_USD = 0.93;

export async function generateRecipes(
  input: GenerateRecipesInput
): Promise<GenerateResult> {
  const userPrompt = buildUserPrompt(input);

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_TEXT_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.85,
    max_tokens: 4000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned empty content");

  const json = JSON.parse(raw);
  const parsed = recipesResponseSchema.parse(json);

  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;
  const totalTokens = inputTokens + outputTokens;

  const costUsd =
    (inputTokens * TEXT_INPUT_USD_PER_1M +
      outputTokens * TEXT_OUTPUT_USD_PER_1M) /
    1_000_000;
  const costCents = Math.ceil(costUsd * EUR_PER_USD * 100);

  return { parsed, usage: { tokens: totalTokens, costCents } };
}

export type ImageQuality = "low" | "standard" | "hd";

export async function generateRecipeImage(
  rawImagePrompt: string,
  quality: ImageQuality
): Promise<{ b64: string; costCents: number }> {
  const prompt = buildImagePrompt(rawImagePrompt);

  const r = await openai.images.generate({
    model: env.OPENAI_IMAGE_MODEL,
    prompt,
    size: "1024x1024",
    quality: quality === "hd" ? "high" : quality === "standard" ? "medium" : "low",
    n: 1,
  });

  const b64 = r.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI image: no b64_json returned");

  const costUsd = IMAGE_USD_BY_QUALITY[quality] ?? IMAGE_USD_BY_QUALITY.standard;
  const costCents = Math.ceil(costUsd * EUR_PER_USD * 100);

  return { b64, costCents };
}
