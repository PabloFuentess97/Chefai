import "server-only";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { prisma } from "./db";
import { env } from "@/env";
import { enqueueImageJob, getQueue } from "./queue";
import { generateText } from "./ai/text";
import { generateImageBase64 } from "./ai/image";
import {
  recipesResponseSchema,
  IMAGE_PROMPT_PREFIX,
} from "./prompts";
import {
  type DietGoal,
  type DietaryProfile,
  type MealType,
  getMeal,
  getGoal,
  getDietaryProfile,
  targetCaloriesForMeal,
  proteinMinForGoal,
} from "./diet-goals";
import { getAppliances } from "./appliances";
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
  dietaryProfile: DietaryProfile | null;
  appliances: string[]; // ApplianceId[]
  servings: number;
  excludeRecipeIds: string[];
  avoidTitles?: string[]; // recently used recipe titles to encourage variety
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
  // Safety: when the user has a dietary profile (vegan/vegetarian/keto/etc.)
  // we cannot blindly reuse community recipes because they aren't tagged with
  // dietary metadata. Force a fresh AI generation that respects the profile.
  if (input.dietaryProfile && input.dietaryProfile !== "omnivore") {
    return null;
  }

  const mealType = SLOT_TO_MEAL_TYPE[input.slot];
  const cuisine = input.cuisine?.trim();

  // Cuisine is treated as a hard preference. If the user picked one, prefer
  // matches; only fall back to other cuisines when no match exists.
  const cuisineWhere = cuisine
    ? { cuisine: { equals: cuisine, mode: "insensitive" as const } }
    : {};

  // If a cuisine is specified, ALL fallback levels keep that cuisine filter.
  // Better to generate fresh via AI than serve a wrong-cuisine reuse.
  const conditions = cuisine
    ? [
        { mealType, ...cuisineWhere, goal: input.goal ?? undefined, difficulty: input.difficulty ?? undefined },
        { mealType, ...cuisineWhere, goal: input.goal ?? undefined },
        { mealType, ...cuisineWhere },
      ]
    : [
        { mealType, goal: input.goal ?? undefined, difficulty: input.difficulty ?? undefined },
        { mealType, goal: input.goal ?? undefined },
        { mealType },
      ];

  for (const where of conditions) {
    const candidates = await prisma.recipe.findMany({
      where: {
        ...where,
        id: { notIn: input.excludeRecipeIds },
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
0. Si el prompt indica un PERFIL DIETÉTICO (vegetariano, vegano, keto, sin gluten, etc.), TODAS las recetas DEBEN cumplir sus reglas y NO contener los ingredientes vetados. Esta restricción es de máxima prioridad junto con "forbidden".
1. NUNCA uses ningún ingrediente listado en "forbidden" (alergias). Es seguridad alimentaria.
2. La receta DEBE ser exactamente UNA y ENCAJAR INEQUÍVOCAMENTE en el TIPO DE COMIDA pedido, EN EL CONTEXTO CULTURAL ESPAÑOL/EUROPEO salvo que el usuario haya elegido una cocina extranjera explícita. Si te piden DESAYUNO, devuelve algo que un español/europeo se desayunaría a primera hora (tostadas, tortitas, huevos, yogur, granola, smoothies, fruta) — NUNCA gachas saladas con tofu, congee, ramen, ni platos asiáticos salados, ni guisos, lasañas, paellas, pollo entero. Si te piden MERIENDA, devuelve algo ligero (~150-300 kcal, ≤10 min), jamás un plato principal. Lee y respeta literalmente el bloque "REGLAS ESTRICTAS PARA …" que viene en el prompt del usuario.
3. Si se indica OBJETIVO NUTRICIONAL con rango calórico y proteína mínima, respétalos. Ajusta cantidades para encajar.
4. Si se indica COCINA específica (mexicana, india, italiana, asiática, americana, etc.), la receta DEBE ser AUTÉNTICA de esa tradición culinaria: usar ingredientes característicos, técnicas y perfiles de sabor propios de esa cocina. NO mezcles ni inventes platos fusión genéricos. Ejemplos:
   - india: especias como comino, cúrcuma, garam masala, jengibre, curry, lentejas, arroz basmati, paneer, ghee. Técnicas: tadka, dum cooking, tandoor.
   - mexicana: chiles, cilantro, lima, comino, frijoles, maíz, aguacate, tomatillo, tortillas, mole. Platos: tacos, enchiladas, pozole, chilaquiles.
   - italiana: aceite de oliva, ajo, parmesano, albahaca, pasta fresca, técnicas como sofrito y mantecato. Platos: risotto, osso buco, saltimbocca.
   - asiática: salsa de soja, jengibre, ajo, sésamo, mirin, miso, fish sauce. Técnicas: wok, al vapor, dim sum.
   - española: aceite de oliva, ajo, pimentón, jamón, azafrán, chorizo. Platos: paella, tortilla, gazpacho, pisto, fabada.
   - mediterránea: pescado, verduras, aceite oliva, hierbas frescas, legumbres. Mediterránea ≠ italiana ni española solas — es la tradición común.
   - americana: BBQ, smoking, comfort food, tex-mex, southern food. Platos típicos: pulled pork, mac & cheese, buffalo wings, meatloaf, jambalaya, gumbo, cornbread, pancakes, biscuits & gravy, sloppy joes, philly cheesesteak, clam chowder. NO uses esto para cualquier hamburguesa genérica.
5. Si se indica una lista AVOID_TITLES, evita generar recetas con títulos parecidos o el mismo plato base. Da variedad real.
6. Las instrucciones (steps) son claras, en imperativo, sin omitir pasos críticos.
7. Unidades métricas: g, ml, ud, cda, cdta.
8. Cantidades calculadas para el número de comensales indicado.`;

function buildSlotUserPrompt(input: SlotInput): string {
  const meal = getMeal(SLOT_TO_MEAL_TYPE[input.slot]);
  const goal = getGoal(input.goal);
  const dietary = getDietaryProfile(input.dietaryProfile);
  const calRange = targetCaloriesForMeal(SLOT_TO_MEAL_TYPE[input.slot], input.goal);
  const proteinMin = proteinMinForGoal(input.goal);

  const speedLine = input.fast
    ? "REQUISITO DE TIEMPO: Receta rápida, máximo 25 minutos en total (prep + cocción)."
    : "";
  const goalLine = goal && calRange
    ? `OBJETIVO NUTRICIONAL: ${goal.label}. La ración debe tener ${calRange.min}-${calRange.max} kcal y al menos ${proteinMin}g de proteína.`
    : "";

  const cuisineLine = input.cuisine
    ? `COCINA: ${input.cuisine} — la receta DEBE ser auténtica de esta tradición culinaria, con ingredientes y técnicas propios.`
    : "COCINA: cualquiera";

  const dietaryBlock =
    dietary && dietary.id !== "omnivore"
      ? `PERFIL DIETÉTICO (PRIORIDAD MÁXIMA): ${dietary.label}. La receta DEBE cumplir estas reglas:
${dietary.rules.map((r, i) => `  ${i + 1}. ${r}`).join("\n")}
INGREDIENTES VETADOS POR EL PERFIL: ${JSON.stringify(dietary.banned)}`
      : "";

  const appliancesList = getAppliances(input.appliances ?? []);
  const appliancesBlock =
    appliancesList.length > 0
      ? `UTENSILIOS DEL USUARIO (adapta los pasos cuando aplique):
${appliancesList.map((a) => `- ${a.label}: ${a.instruction}`).join("\n")}`
      : "";

  const avoidLine =
    input.avoidTitles && input.avoidTitles.length > 0
      ? `AVOID_TITLES (recetas recientes y otros slots del MISMO día que NO debes repetir ni imitar): ${JSON.stringify(input.avoidTitles.slice(0, 20))}
REGLA DE VARIEDAD: si alguna de las recetas en AVOID_TITLES usa una técnica o ingrediente principal (ej. tortilla, revuelto, ensalada, pasta, arroz, sopa, bowl, sandwich, smoothie, tostada), TU receta debe usar una técnica COMPLETAMENTE DIFERENTE. No vale "tortilla de claras" si ya hay "tortilla de verduras", ni "ensalada de quinoa" si ya hay "ensalada de garbanzos". Cambia el tipo de plato.`
      : "";

  // Hard rules for the specific meal type (what IS and ISN'T a breakfast,
  // snack, lunch, dinner). The model gets explicit allow/deny lists so it
  // doesn't fall back to "generic recipe" for snack/breakfast slots.
  const mealRulesBlock = meal
    ? `REGLAS ESTRICTAS PARA ${meal.label.toUpperCase()} (PRIORIDAD MÁXIMA):
${meal.promptRules}`
    : "";

  return `Genera UNA receta con estos parámetros:

TIPO DE COMIDA: ${meal?.label ?? "comida"}.
${mealRulesBlock}
${goalLine}
${speedLine}
${cuisineLine}
${dietaryBlock}
${appliancesBlock}
${avoidLine}
DIFICULTAD: ${input.difficulty ?? "any"}
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

async function generateOneRecipeForSlot(input: SlotInput) {
  const result = await generateText({
    systemPrompt: SLOT_SYSTEM_PROMPT,
    userPrompt: buildSlotUserPrompt(input),
    jsonResponse: true,
    temperature: 0.85,
    maxTokens: 1500,
  });

  if (!result.content) throw new Error("AI returned empty content for slot");

  const parsed = recipesResponseSchema.parse(JSON.parse(result.content));
  const r = parsed.recipes[0];
  if (!r) throw new Error("AI returned no recipe for slot");

  return {
    recipe: r,
    tokens: result.inputTokens + result.outputTokens,
    costCents: result.costCents,
  };
}

// In-process semaphore — caps concurrent image calls so we don't blast
// past OpenAI's 5/min limit for gpt-image-1.
class Semaphore {
  private active = 0;
  private queue: Array<() => void> = [];
  constructor(private readonly limit: number) {}
  async acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active += 1;
      return;
    }
    return new Promise((resolve) =>
      this.queue.push(() => {
        this.active += 1;
        resolve();
      })
    );
  }
  release(): void {
    this.active -= 1;
    const next = this.queue.shift();
    if (next) next();
  }
}

const imageSemaphore = new Semaphore(2);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(message: string): number {
  // OpenAI error messages: "Please try again in 12s." or "1m23s"
  const sec = message.match(/try again in\s+(\d+)s/i);
  if (sec?.[1]) return parseInt(sec[1], 10);
  const ms = message.match(/try again in\s+(\d+)ms/i);
  if (ms?.[1]) return Math.max(1, Math.ceil(parseInt(ms[1], 10) / 1000));
  return 15;
}

async function maybeGenerateImage(
  imagePrompt: string,
  enabled: boolean,
  quality: "low" | "standard" | "hd"
): Promise<{ b64: string | null; costCents: number }> {
  if (!enabled) return { b64: null, costCents: 0 };

  await imageSemaphore.acquire();
  try {
    let attempt = 0;
    while (attempt < 2) {
      try {
        const r = await generateImageBase64({
          prompt: `${IMAGE_PROMPT_PREFIX} ${imagePrompt}`,
          quality,
        });
        return { b64: r.b64, costCents: r.costCents };
      } catch (e) {
        const err = e as { status?: number; message?: string };
        if (err?.status === 429 && attempt === 0) {
          const wait = parseRetryAfter(err.message ?? "");
          logger.warn(
            { wait, attempt },
            "image rate-limited, sleeping then retrying"
          );
          await sleep((wait + 1) * 1000);
          attempt += 1;
          continue;
        }
        logger.error({ err: e }, "meal plan image generation failed");
        return { b64: null, costCents: 0 };
      }
    }
    return { b64: null, costCents: 0 };
  } finally {
    imageSemaphore.release();
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

  // Detect if a background queue is available — if so, plan creation
  // returns fast and images are generated/saved in workers afterwards.
  const queueAvailable = !!getQueue();

  // 1. Try reuse
  const reusableId = await findReusableRecipe(input);
  if (reusableId) {
    let imageCost = 0;
    if (imagesEnabled) {
      const existing = await prisma.recipe.findUnique({
        where: { id: reusableId },
        select: {
          id: true,
          title: true,
          description: true,
          cuisine: true,
          imageStoragePath: true,
        },
      });
      if (existing && !existing.imageStoragePath) {
        const promptParts = [
          existing.title,
          existing.description ?? "",
          existing.cuisine ? `${existing.cuisine} cuisine` : "",
        ].filter(Boolean);
        const prompt = promptParts.join(", ");

        if (queueAvailable) {
          // Background path — instant return, worker fills the image
          await enqueueImageJob({
            recipeId: existing.id,
            userId,
            imagePrompt: prompt,
            quality: imageQuality,
          });
        } else {
          // Inline path — wait for image (legacy behaviour)
          const { b64, costCents } = await maybeGenerateImage(
            prompt,
            true,
            imageQuality
          );
          imageCost = costCents;
          if (b64) {
            const saved = await saveImage(userId, b64);
            await prisma.recipe.update({
              where: { id: existing.id },
              data: {
                imageUrl: saved.url,
                imageStoragePath: saved.absolutePath,
              },
            });
          }
        }
      }
    }
    return {
      recipeId: reusableId,
      source: "reused",
      tokensUsed: 0,
      costCents: imageCost,
    };
  }

  // 2. Generate text first (always inline — recipe is immediately usable)
  const { recipe, tokens, costCents: textCost } =
    await generateOneRecipeForSlot(input);

  let imageUrl: string | null = null;
  let imageStoragePath: string | null = null;
  let imgCost = 0;

  // For images: enqueue if queue is available; otherwise generate inline
  if (imagesEnabled && !queueAvailable) {
    const { b64, costCents } = await maybeGenerateImage(
      recipe.imagePrompt,
      imagesEnabled,
      imageQuality
    );
    imgCost = costCents;
    if (b64) {
      const saved = await saveImage(userId, b64);
      imageUrl = saved.url;
      imageStoragePath = saved.absolutePath;
    }
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

  // Enqueue background image generation if the queue is available and we
  // haven't already generated one inline.
  if (imagesEnabled && queueAvailable && !created.imageStoragePath) {
    await enqueueImageJob({
      recipeId: created.id,
      userId,
      imagePrompt: recipe.imagePrompt,
      quality: imageQuality,
    });
  }

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
