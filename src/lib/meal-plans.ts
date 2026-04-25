import "server-only";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { prisma } from "./db";
import { openai } from "./openai";
import { env } from "@/env";
import {
  recipesResponseSchema,
  IMAGE_PROMPT_PREFIX,
} from "./prompts";
import {
  type DietGoal,
  type MealType,
  getMeal,
  getGoal,
  targetCaloriesForMeal,
  proteinMinForGoal,
} from "./diet-goals";
import { logger } from "./logger";

// Map our internal codes to the Prisma MealSlot enum values
const SLOT_TO_MEAL_TYPE: Record<MealSlotEnum, MealType> = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  SNACK: "snack",
  DINNER: "dinner",
};

export type MealSlotEnum = "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER";

export type SlotInput = {
  slot: MealSlotEnum;
  goal: DietGoal | null;
  difficulty: "easy" | "medium" | "hard" | null;
  fast: boolean; // ≤25 min
  cuisine: string | null;
  preferences: string[]; // optional ingredient hints
  forbidden: string[];
  servings: number;
  excludeRecipeIds: string[];
};

export type ResolvedSlot = {
  recipeId: string;
  source: "reused" | "generated";
  tokensUsed: number;
  costCents: number;
};

// ------------------------------------------------------------------
// 1) Reuse step — query the global recipe pool
// ------------------------------------------------------------------

async function findReusableRecipe(input: SlotInput): Promise<string | null> {
  const mealType = SLOT_TO_MEAL_TYPE[input.slot];
  const conditions = [
    {
      mealType,
      goal: input.goal ?? undefined,
      difficulty: input.difficulty ?? undefined,
    },
    // Relax: drop difficulty
    {
      mealType,
      goal: input.goal ?? undefined,
    },
    // Relax: drop goal
    {
      mealType,
    },
  ];

  for (const where of conditions) {
    const candidates = await prisma.recipe.findMany({
      where: {
        ...where,
        id: { notIn: input.excludeRecipeIds },
        // Quick filter for fast meals: total time ≤25 min
        ...(input.fast
          ? {
              prepMinutes: { lt: 30 },
              cookMinutes: { lt: 30 },
            }
          : {}),
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    if (candidates.length > 0) {
      const idx = Math.floor(Math.random() * candidates.length);
      return candidates[idx]!.id;
    }
  }

  return null;
}

// ------------------------------------------------------------------
// 2) Generate step — slim prompt for ONE recipe in a specific slot
// ------------------------------------------------------------------

const SLOT_SYSTEM_PROMPT = `Eres un chef profesional con formación en nutrición. Generas recetas en español, realistas, sabrosas y cocinables en una cocina doméstica estándar. Respondes EXCLUSIVAMENTE con un JSON válido sin texto extra ni markdown.

Reglas estrictas (en orden de prioridad):
1. NUNCA uses ningún ingrediente listado en "forbidden" (alergias). Es seguridad alimentaria.
2. La receta DEBE ser exactamente UNA, apropiada para el TIPO DE COMIDA indicado (en sabor, presentación y textura).
3. Si se indica OBJETIVO NUTRICIONAL con rango calórico y proteína mínima, respétalos. Ajusta cantidades para encajar.
4. Las instrucciones (steps) son claras, en imperativo, sin omitir pasos críticos.
5. Unidades métricas: g, ml, ud, cda, cdta.
6. Cantidades calculadas para el número de comensales indicado.`;

function buildSlotUserPrompt(input: SlotInput): string {
  const meal = getMeal(SLOT_TO_MEAL_TYPE[input.slot]);
  const goal = getGoal(input.goal);
  const calRange = targetCaloriesForMeal(SLOT_TO_MEAL_TYPE[input.slot], input.goal);
  const proteinMin = proteinMinForGoal(input.goal);

  const speedLine = input.fast
    ? "REQUISITO DE TIEMPO: Receta rápida, máximo 25 minutos en total (prep + cocción)."
    : "";
  const goalLine = goal && calRange
    ? `OBJETIVO NUTRICIONAL: ${goal.label}. La ración debe tener ${calRange.min}-${calRange.max} kcal y al menos ${proteinMin}g de proteína.`
    : "";

  return `Genera UNA receta con estos parámetros:

TIPO DE COMIDA: ${meal?.label ?? "comida"}.
${goalLine}
${speedLine}
DIFICULTAD: ${input.difficulty ?? "any"}
COCINA: ${input.cuisine ?? "any"}
COMENSALES: ${input.servings}
INGREDIENTES PROHIBIDOS: ${JSON.stringify(input.forbidden)}
INGREDIENTES SUGERIDOS (opcional, no obligatorio): ${JSON.stringify(input.preferences)}

Devuelve estrictamente este JSON con UNA sola receta dentro de "recipes":
{ "recipes": [ {
  "title": "string",
  "description": "string corta (1-2 frases)",
  "cuisine": "string|null",
  "difficulty": "easy|medium|hard",
  "prepMinutes": number,
  "cookMinutes": number,
  "servings": ${input.servings},
  "imagePrompt": "Prompt en INGLÉS, descriptivo, fotográfico, ~30 palabras",
  "ingredients": [ { "name":"string","quantity":number,"unit":"g|ml|ud|cda|cdta","optional":boolean,"suggested":boolean,"calories":number,"proteins":number,"fats":number,"carbs":number } ],
  "perServing": { "calories":number,"proteins":number,"fats":number,"carbs":number },
  "steps": [ { "order": 1, "content": "string", "durationMin": number|null } ]
} ] }`;
}

const TEXT_INPUT_USD_PER_1M = 0.15;
const TEXT_OUTPUT_USD_PER_1M = 0.6;
const IMAGE_USD_BY_QUALITY: Record<string, number> = {
  low: 0.02,
  standard: 0.04,
  hd: 0.08,
};
const EUR_PER_USD = 0.93;

async function generateOneRecipeForSlot(input: SlotInput) {
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_TEXT_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.85,
    max_tokens: 1500,
    messages: [
      { role: "system", content: SLOT_SYSTEM_PROMPT },
      { role: "user", content: buildSlotUserPrompt(input) },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned empty content for slot");

  const parsed = recipesResponseSchema.parse(JSON.parse(raw));
  const r = parsed.recipes[0];
  if (!r) throw new Error("OpenAI returned no recipe for slot");

  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;
  const totalTokens = inputTokens + outputTokens;
  const costUsd =
    (inputTokens * TEXT_INPUT_USD_PER_1M +
      outputTokens * TEXT_OUTPUT_USD_PER_1M) /
    1_000_000;
  const costCents = Math.ceil(costUsd * EUR_PER_USD * 100);

  return { recipe: r, tokens: totalTokens, costCents };
}

async function maybeGenerateImage(
  imagePrompt: string,
  enabled: boolean,
  quality: "low" | "standard" | "hd"
): Promise<{ b64: string | null; costCents: number }> {
  if (!enabled) return { b64: null, costCents: 0 };
  try {
    const r = await openai.images.generate({
      model: env.OPENAI_IMAGE_MODEL,
      prompt: `${IMAGE_PROMPT_PREFIX} ${imagePrompt}`,
      size: "1024x1024",
      quality:
        quality === "hd" ? "high" : quality === "standard" ? "medium" : "low",
      n: 1,
    });
    const b64 = r.data?.[0]?.b64_json ?? null;
    const costUsd =
      IMAGE_USD_BY_QUALITY[quality] ?? IMAGE_USD_BY_QUALITY.standard;
    const costCents = Math.ceil(costUsd * EUR_PER_USD * 100);
    return { b64, costCents };
  } catch (e) {
    logger.error({ err: e }, "meal plan image generation failed");
    return { b64: null, costCents: 0 };
  }
}

async function saveImage(
  userId: string,
  b64: string
): Promise<{ url: string; absolutePath: string }> {
  const dir = path.resolve(process.cwd(), env.UPLOADS_DIR, userId);
  await fs.mkdir(dir, { recursive: true });
  const id = crypto.randomBytes(10).toString("hex");
  const filename = `${id}.png`;
  const absolutePath = path.join(dir, filename);
  await fs.writeFile(absolutePath, Buffer.from(b64, "base64"));
  return { url: `/uploads/${userId}/${filename}`, absolutePath };
}

// ------------------------------------------------------------------
// 3) Public: resolve a slot (reuse if possible, else generate)
// ------------------------------------------------------------------

export async function resolveSlot(args: {
  userId: string;
  input: SlotInput;
  imagesEnabled: boolean;
  imageQuality: "low" | "standard" | "hd";
}): Promise<ResolvedSlot> {
  const { userId, input, imagesEnabled, imageQuality } = args;

  // 1. Try reuse
  const reusableId = await findReusableRecipe(input);
  if (reusableId) {
    return {
      recipeId: reusableId,
      source: "reused",
      tokensUsed: 0,
      costCents: 0,
    };
  }

  // 2. Generate
  const { recipe, tokens, costCents: textCost } =
    await generateOneRecipeForSlot(input);

  const { b64, costCents: imgCost } = await maybeGenerateImage(
    recipe.imagePrompt,
    imagesEnabled,
    imageQuality
  );

  let imageUrl: string | null = null;
  let imageStoragePath: string | null = null;
  if (b64) {
    const saved = await saveImage(userId, b64);
    imageUrl = saved.url;
    imageStoragePath = saved.absolutePath;
  }

  const created = await prisma.recipe.create({
    data: {
      userId,
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      prepMinutes: recipe.prepMinutes,
      cookMinutes: recipe.cookMinutes,
      difficulty: recipe.difficulty,
      cuisine: recipe.cuisine ?? null,
      imageUrl,
      imageStoragePath,
      totalCalories: recipe.perServing.calories,
      totalProteins: recipe.perServing.proteins,
      totalFats: recipe.perServing.fats,
      totalCarbs: recipe.perServing.carbs,
      mealType: SLOT_TO_MEAL_TYPE[input.slot],
      goal: input.goal ?? null,
      ingredients: {
        create: recipe.ingredients.map((ing, i) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          optional: ing.optional,
          suggested: ing.suggested,
          calories: ing.calories,
          proteins: ing.proteins,
          fats: ing.fats,
          carbs: ing.carbs,
          sortOrder: i,
        })),
      },
      steps: {
        create: recipe.steps.map((s) => ({
          order: s.order,
          content: s.content,
          durationMin: s.durationMin,
        })),
      },
    },
  });

  return {
    recipeId: created.id,
    source: "generated",
    tokensUsed: tokens,
    costCents: textCost + imgCost,
  };
}

// ------------------------------------------------------------------
// Helpers exposed
// ------------------------------------------------------------------

export const SLOTS: MealSlotEnum[] = ["BREAKFAST", "LUNCH", "SNACK", "DINNER"];

export function slotLabel(s: MealSlotEnum): string {
  switch (s) {
    case "BREAKFAST":
      return "Desayuno";
    case "LUNCH":
      return "Almuerzo";
    case "SNACK":
      return "Merienda";
    case "DINNER":
      return "Cena";
  }
}

export function dayLabel(idx: number): string {
  return ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][idx] ?? `Día ${idx + 1}`;
}

export function shortDay(idx: number): string {
  return ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][idx] ?? `${idx + 1}`;
}
