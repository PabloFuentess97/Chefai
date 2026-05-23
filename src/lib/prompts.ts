import { z } from "zod";
import type { GenerateRecipesInput } from "./validators";
import {
  getMeal,
  getGoal,
  getDietaryProfile,
  targetCaloriesForMeal,
  proteinMinForGoal,
} from "./diet-goals";
import { getAppliances } from "./appliances";

// Number fields that the AI sometimes returns as null when the value is
// "not applicable" (e.g. cookMinutes for a smoothie). Always end up as 0.
const numOrNull = z
  .union([z.number().int().min(0), z.null(), z.undefined()])
  .transform((v) => v ?? 0);

const nonNegOrZero = z
  .union([z.number().nonnegative(), z.null(), z.undefined()])
  .transform((v) => v ?? 0);

const optionalBool = z
  .union([z.boolean(), z.null(), z.undefined()])
  .transform((v) => v ?? false);

export const recipesResponseSchema = z.object({
  recipes: z
    .array(
      z.object({
        title: z.string().min(2),
        description: z.string().nullable().optional().transform((v) => v ?? ""),
        cuisine: z.string().nullable().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]),
        prepMinutes: numOrNull,
        cookMinutes: numOrNull,
        servings: z.number().int().min(1),
        imagePrompt: z
          .string()
          .nullable()
          .optional()
          .transform((v) => v ?? ""),
        ingredients: z
          .array(
            z.object({
              name: z.string(),
              quantity: nonNegOrZero,
              unit: z.string(),
              optional: optionalBool,
              suggested: optionalBool,
              calories: nonNegOrZero,
              proteins: nonNegOrZero,
              fats: nonNegOrZero,
              carbs: nonNegOrZero,
            })
          )
          .min(1),
        perServing: z.object({
          calories: nonNegOrZero,
          proteins: nonNegOrZero,
          fats: nonNegOrZero,
          carbs: nonNegOrZero,
        }),
        steps: z
          .array(
            z.object({
              order: z.number().int().min(1),
              content: z.string().min(2),
              durationMin: z
                .union([z.number().int().nonnegative(), z.null(), z.undefined()])
                .transform((v) => v ?? null),
            })
          )
          .min(2),
      })
    )
    .min(1),
});

export type RecipesResponse = z.infer<typeof recipesResponseSchema>;

export const SYSTEM_PROMPT = `Eres un chef profesional con formación en nutrición. Generas recetas en español, realistas, sabrosas y cocinables en una cocina doméstica estándar (horno, fogones, microondas, batidora). Respondes EXCLUSIVAMENTE con un JSON válido que cumpla el esquema indicado por el usuario, sin texto extra, sin markdown, sin explicaciones.

Reglas estrictas (en orden de prioridad):
0. Si el prompt indica un PERFIL DIETÉTICO (vegetariano, vegano, keto, sin gluten, etc.), TODAS las recetas DEBEN cumplir sus reglas y NO contener los ingredientes vetados por ese perfil. Esta restricción es de máxima prioridad junto con "forbidden".
0b. Si el prompt indica UTENSILIOS del usuario (air fryer, Thermomix, olla lenta, etc.), adapta los pasos y tiempos a esos aparatos. Ofrece la versión con el aparato cuando aplique, indicando temperatura/velocidad/tiempo concretos del aparato.
1. NUNCA uses ningún ingrediente listado en "forbidden" (alergias/intolerancias). Esto es una cuestión de seguridad alimentaria.
2. EVITA los ingredientes listados en "unwanted" salvo que sean absolutamente imprescindibles; en ese caso, usa una alternativa equivalente.
3. Usa principalmente los ingredientes en "available". Puedes sugerir hasta 3 ingredientes adicionales por receta marcándolos como "suggested": true (sal, aceite, especias comunes no cuentan).
4. Ajusta TODAS las cantidades para el número exacto de "servings" indicado.
5. Los valores nutricionales deben ser realistas y proporcionales (calorías por gramo coherentes con el ingrediente). Calorías y macros se expresan POR RACIÓN para los totales y POR LA CANTIDAD INDICADA para cada ingrediente.
6. Genera al menos 3 recetas DIFERENTES entre sí (técnicas o sabores distintos).
7. Las instrucciones (steps) deben ser claras, en imperativo, numeradas implícitamente por orden, sin omitir pasos críticos (precalentar, salpimentar, reposar).
8. Unidades métricas: g, ml, ud (unidad), cda (cucharada), cdta (cucharadita).
9. Si se indica TIPO DE COMIDA, todas las recetas DEBEN encajar inequívocamente. Una MERIENDA es siempre ligera (150-300 kcal, ≤10 min, snack); un DESAYUNO es tostadas/tortitas/huevos/yogures/smoothies, NUNCA estofados o pastas con salsa; una CENA es ligera; el ALMUERZO es el plato sustancial. Lee y respeta el bloque "REGLAS ESTRICTAS PARA …" del prompt del usuario — esas listas SÍ/NO son inviolables.
10. Si se indica OBJETIVO NUTRICIONAL con un rango de calorías y un mínimo de proteína por ración, respétalos con prioridad alta. Ajusta CANTIDADES (no inventes ingredientes nuevos) para encajar el rango. Si imposible, prioriza la proteína mínima sobre el límite calórico superior.
11. Para los campos numéricos (prepMinutes, cookMinutes, calories, proteins, fats, carbs, quantity) usa SIEMPRE un número, nunca null ni cadena vacía. Si la receta no requiere cocción, cookMinutes = 0. Si no requiere preparación, prepMinutes = 0.
12. Si no es posible generar una receta razonable con las restricciones, devuelve un objeto en "recipes" con error: { code: "NOT_FEASIBLE", message: "..." } — NO inventes recetas no cocinables.`;

/**
 * Strip characters that could break out of the JSON context or inject
 * pseudo-instructions into the prompt: newlines, JSON delimiters, quote
 * marks. Also caps length so a single ingredient can't blow up the
 * token budget. Defense-in-depth on top of the Zod schema's max(60).
 */
function sanitizeIngredient(s: string): string {
  return s
    .replace(/[\n\r\t"{}\[\]<>]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 60)
    .trim();
}

function sanitizeList(arr: string[] | undefined): string[] {
  return (arr ?? [])
    .map(sanitizeIngredient)
    .filter((s) => s.length > 0);
}

export function buildUserPrompt(input: GenerateRecipesInput): string {
  // Sanitize untrusted user input before it enters the prompt context.
  // Untouched: enums (mealType, goal, dietaryProfile, difficulty) and
  // numeric fields — Zod has already validated those.
  const safeIngredients = sanitizeList(input.ingredients);
  const safeForbidden = sanitizeList(input.forbidden);
  const safeUnwanted = sanitizeList(input.unwanted);
  const safeCuisine = input.cuisine
    ? sanitizeIngredient(input.cuisine)
    : undefined;
  const meal = getMeal(input.mealType);
  const goal = getGoal(input.goal);
  const dietary = getDietaryProfile(input.dietaryProfile);
  const calRange = targetCaloriesForMeal(input.mealType, input.goal);
  const proteinMin = proteinMinForGoal(input.goal);

  const mealLine = meal
    ? `TIPO DE COMIDA: ${meal.label} (${meal.desc}).
REGLAS ESTRICTAS PARA ${meal.label.toUpperCase()} (PRIORIDAD MÁXIMA):
${meal.promptRules}`
    : `TIPO DE COMIDA: cualquiera`;

  const goalLine = goal
    ? `OBJETIVO NUTRICIONAL: ${goal.label} — ${goal.desc}. Calcula las cantidades para que cada ración tenga ENTRE ${calRange?.min ?? "—"} Y ${calRange?.max ?? "—"} kcal y AL MENOS ${proteinMin}g de proteína. Es prioritario respetar este rango.`
    : `OBJETIVO NUTRICIONAL: equilibrado, sin restricción específica`;

  const dietaryBlock =
    dietary && dietary.id !== "omnivore"
      ? `\nPERFIL DIETÉTICO: ${dietary.label} — ${dietary.desc}.
REGLAS DE ESTE PERFIL (PRIORIDAD MÁXIMA, junto con "forbidden"):
${dietary.rules.map((r, i) => `  ${i + 1}. ${r}`).join("\n")}
INGREDIENTES VETADOS POR ESTE PERFIL (añádelos mentalmente a "forbidden"): ${JSON.stringify(dietary.banned)}
Si alguno de los "INGREDIENTES DISPONIBLES" rompe el perfil, IGNÓRALO en lugar de usarlo.`
      : "";

  const appliancesList = getAppliances(input.appliances ?? []);
  const appliancesBlock =
    appliancesList.length > 0
      ? `\nUTENSILIOS DEL USUARIO (adapta los pasos cuando aplique):
${appliancesList.map((a) => `- ${a.label}: ${a.instruction}`).join("\n")}
Cuando un paso pueda ejecutarse en uno de estos aparatos, OFRECE explícitamente esa versión (no solo la del fogón/horno). Si una receta se beneficia mucho de un aparato concreto, monta los pasos directamente para ese aparato. No inventes pasos imposibles para un aparato que el usuario no tiene.`
      : "";

  return `Genera recetas con estos parámetros:

${mealLine}
${goalLine}${dietaryBlock}${appliancesBlock}

INGREDIENTES DISPONIBLES: ${JSON.stringify(safeIngredients)}
INGREDIENTES PROHIBIDOS (alergias/intolerancias): ${JSON.stringify(safeForbidden)}
INGREDIENTES NO DESEADOS: ${JSON.stringify(safeUnwanted)}
COMENSALES: ${input.servings}
COCINA (opcional): ${safeCuisine ?? "any"}
DIFICULTAD (opcional): ${input.difficulty ?? "any"}

Devuelve estrictamente este JSON:
{
  "recipes": [
    {
      "title": "string",
      "description": "string corta (1-2 frases)",
      "cuisine": "string|null",
      "difficulty": "easy|medium|hard",
      "prepMinutes": number,
      "cookMinutes": number,
      "servings": ${input.servings},
      "imagePrompt": "Prompt en INGLÉS, descriptivo, fotográfico, ~30 palabras, para generar una foto cenital realista del plato terminado",
      "ingredients": [
        {
          "name": "string",
          "quantity": number,
          "unit": "g|ml|ud|cda|cdta",
          "optional": boolean,
          "suggested": boolean,
          "calories": number,
          "proteins": number,
          "fats": number,
          "carbs": number
        }
      ],
      "perServing": {
        "calories": number,
        "proteins": number,
        "fats": number,
        "carbs": number
      },
      "steps": [
        { "order": 1, "content": "string", "durationMin": number|null }
      ]
    }
  ]
}`;
}

export const IMAGE_PROMPT_PREFIX =
  "Professional overhead food photography, natural daylight, shallow depth of field, rustic plating, no text, no watermarks. Subject:";

export function buildImagePrompt(recipeImagePrompt: string): string {
  return `${IMAGE_PROMPT_PREFIX} ${recipeImagePrompt}`;
}
