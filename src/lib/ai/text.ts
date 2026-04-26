import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { openai } from "@/lib/openai";
import { env } from "@/env";

// ----- Pricing (USD per 1M tokens) -----

const OPENAI_INPUT_USD_PER_1M = 0.15;
const OPENAI_OUTPUT_USD_PER_1M = 0.6;
// Gemini 2.0 Flash pricing (text): $0.10 input / $0.40 output per 1M tokens
const GEMINI_INPUT_USD_PER_1M = 0.1;
const GEMINI_OUTPUT_USD_PER_1M = 0.4;
const EUR_PER_USD = 0.93;

function tokenCostCents(
  inputTokens: number,
  outputTokens: number,
  inUsd1M: number,
  outUsd1M: number
): number {
  const usd =
    (inputTokens * inUsd1M + outputTokens * outUsd1M) / 1_000_000;
  return Math.ceil(usd * EUR_PER_USD * 100);
}

// ----- Lazy Gemini client -----

let _gemini: GoogleGenerativeAI | null = null;
function getGemini(): GoogleGenerativeAI {
  if (_gemini) return _gemini;
  if (!env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured but TEXT_PROVIDER=gemini"
    );
  }
  _gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return _gemini;
}

// ----- Public types -----

export type TextResult = {
  content: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
};

export type GenerateTextInput = {
  systemPrompt: string;
  userPrompt: string;
  jsonResponse?: boolean;
  temperature?: number;
  maxTokens?: number;
};

export type AnalyzeImageInput = {
  systemPrompt: string;
  userText: string;
  imageDataUrl: string; // data:image/...;base64,XXXX
  jsonResponse?: boolean;
  temperature?: number;
  maxTokens?: number;
};

// ====================================================================
// generateText — provider-agnostic
// ====================================================================

export async function generateText(
  input: GenerateTextInput
): Promise<TextResult> {
  if (env.TEXT_PROVIDER === "gemini") {
    return generateTextGemini(input);
  }
  return generateTextOpenAI(input);
}

async function generateTextOpenAI(
  input: GenerateTextInput
): Promise<TextResult> {
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_TEXT_MODEL,
    response_format: input.jsonResponse ? { type: "json_object" } : undefined,
    temperature: input.temperature ?? 0.8,
    max_tokens: input.maxTokens ?? 4000,
    messages: [
      { role: "system", content: input.systemPrompt },
      { role: "user", content: input.userPrompt },
    ],
  });
  const content = completion.choices[0]?.message?.content ?? "";
  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;
  return {
    content,
    inputTokens,
    outputTokens,
    costCents: tokenCostCents(
      inputTokens,
      outputTokens,
      OPENAI_INPUT_USD_PER_1M,
      OPENAI_OUTPUT_USD_PER_1M
    ),
  };
}

async function generateTextGemini(
  input: GenerateTextInput
): Promise<TextResult> {
  const model = getGemini().getGenerativeModel({
    model: env.GEMINI_TEXT_MODEL,
    systemInstruction: input.systemPrompt,
    generationConfig: {
      responseMimeType: input.jsonResponse ? "application/json" : "text/plain",
      temperature: input.temperature ?? 0.8,
      maxOutputTokens: input.maxTokens ?? 4000,
    },
  });
  const result = await model.generateContent(input.userPrompt);
  const content = result.response.text();
  const usage = result.response.usageMetadata;
  const inputTokens = usage?.promptTokenCount ?? 0;
  const outputTokens = usage?.candidatesTokenCount ?? 0;
  return {
    content,
    inputTokens,
    outputTokens,
    costCents: tokenCostCents(
      inputTokens,
      outputTokens,
      GEMINI_INPUT_USD_PER_1M,
      GEMINI_OUTPUT_USD_PER_1M
    ),
  };
}

// ====================================================================
// analyzeImage — vision (OpenAI: image_url; Gemini: inlineData)
// ====================================================================

export async function analyzeImage(
  input: AnalyzeImageInput
): Promise<TextResult> {
  if (env.TEXT_PROVIDER === "gemini") {
    return analyzeImageGemini(input);
  }
  return analyzeImageOpenAI(input);
}

async function analyzeImageOpenAI(
  input: AnalyzeImageInput
): Promise<TextResult> {
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_TEXT_MODEL,
    response_format: input.jsonResponse ? { type: "json_object" } : undefined,
    temperature: input.temperature ?? 0.2,
    max_tokens: input.maxTokens ?? 500,
    messages: [
      { role: "system", content: input.systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: input.userText },
          {
            type: "image_url",
            image_url: { url: input.imageDataUrl, detail: "high" },
          },
        ],
      },
    ],
  });
  const content = completion.choices[0]?.message?.content ?? "";
  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;
  return {
    content,
    inputTokens,
    outputTokens,
    costCents: tokenCostCents(
      inputTokens,
      outputTokens,
      OPENAI_INPUT_USD_PER_1M,
      OPENAI_OUTPUT_USD_PER_1M
    ),
  };
}

async function analyzeImageGemini(
  input: AnalyzeImageInput
): Promise<TextResult> {
  const match = input.imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data URL for Gemini");
  }
  const mimeType = match[1]!;
  const data = match[2]!;

  const model = getGemini().getGenerativeModel({
    model: env.GEMINI_TEXT_MODEL,
    systemInstruction: input.systemPrompt,
    generationConfig: {
      responseMimeType: input.jsonResponse ? "application/json" : "text/plain",
      temperature: input.temperature ?? 0.2,
      maxOutputTokens: input.maxTokens ?? 500,
    },
  });
  const result = await model.generateContent([
    { text: input.userText },
    { inlineData: { mimeType, data } },
  ]);
  const content = result.response.text();
  const usage = result.response.usageMetadata;
  const inputTokens = usage?.promptTokenCount ?? 0;
  const outputTokens = usage?.candidatesTokenCount ?? 0;
  return {
    content,
    inputTokens,
    outputTokens,
    costCents: tokenCostCents(
      inputTokens,
      outputTokens,
      GEMINI_INPUT_USD_PER_1M,
      GEMINI_OUTPUT_USD_PER_1M
    ),
  };
}
