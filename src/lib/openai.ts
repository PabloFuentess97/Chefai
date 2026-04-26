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
import { generateText } from "./ai/text";
import { generateImageBase64, type ImageQuality } from "./ai/image";

// ----- OpenAI client (still used by direct callers and as the OpenAI
// implementation in the provider abstraction) ---------------------------

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

// ----- Recipe text generation (uses the provider abstraction) ----------

export async function generateRecipes(
  input: GenerateRecipesInput
): Promise<GenerateResult> {
  const userPrompt = buildUserPrompt(input);

  const result = await generateText({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    jsonResponse: true,
    temperature: 0.85,
    maxTokens: 4000,
  });

  if (!result.content) throw new Error("AI returned empty content");
  const json = JSON.parse(result.content);
  const parsed = recipesResponseSchema.parse(json);

  return {
    parsed,
    usage: {
      tokens: result.inputTokens + result.outputTokens,
      costCents: result.costCents,
    },
  };
}

// ----- Recipe image generation (uses the provider abstraction) ---------

export type { ImageQuality };

export async function generateRecipeImage(
  rawImagePrompt: string,
  quality: ImageQuality
): Promise<{ b64: string; costCents: number }> {
  const prompt = buildImagePrompt(rawImagePrompt);
  const result = await generateImageBase64({ prompt, quality });
  return { b64: result.b64, costCents: result.costCents };
}
