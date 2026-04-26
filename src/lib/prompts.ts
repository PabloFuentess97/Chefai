import { z } from "zod";
import type { GenerateRecipesInput } from "./validators";
import {
  getMeal,
  getGoal,
  targetCaloriesForMeal,
  proteinMinForGoal,
} from "./diet-goals";

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
1. NUNCA uses ningún ingrediente listado en "forbidden" (alergias/intolerancias). Esto es una cuestión de seguridad alimentaria.
2. EVITA los ingredientes listados en "unwanted" salvo que sean absolutamente imprescindibles; en ese caso, usa una alternativa equivalente.
3. Usa principalmente los ingredientes en "available". Puedes sugerir hasta 3 ingredientes adicionales por receta marcándolos como "suggested": true (sal, aceite, especias comunes no cuentan).
4. Ajusta TODAS las cantidades para el número exacto de "servings" indicado.
5. Los valores nutricionales deben ser realistas y proporcionales (calorías por gramo coherentes con el ingrediente). Calorías y macros se expresan POR RACIÓN para los totales y POR LA CANTIDAD INDICADA para cada ingrediente.
6. Genera al menos 3 recetas DIFERENTES entre sí (técnicas o sabores distintos).
7. Las instrucciones (steps) deben ser claras, en imperativo, numeradas implícitamente por orden, sin omitir pasos críticos (precalentar, salpimentar, reposar).
8. Unidades métricas: g, ml, ud (unidad), cda (cucharada), cdta (cucharadita).
9. Si se indica TIPO DE COMIDA, todas las recetas DEBEN ser apropiadas para ese momento del día. Por ejemplo, una "cena" no es un brownie, un "desayuno" no es solomillo.
10. Si se indica OBJETIVO NUTRICIONAL con un rango de calorías y un mínimo de proteína por ración, respétalos con prioridad alta. Ajusta CANTIDADES (no inventes ingredientes nuevos) para encajar el rango. Si imposible, prioriza la proteína mínima sobre el límite calórico superior.
11. Para los campos numéricos (prepMinutes, cookMinutes, calories, proteins, fats, carbs, quantity) usa SIEMPRE un número, nunca null ni cadena vacía. Si la receta no requiere cocción, cookMinutes = 0. Si no requiere preparación, prepMinutes = 0.
12. Si no es posible generar una receta razonable con las restricciones, devuelve un objeto en "recipes" con error: { code: "NOT_FEASIBLE", message: "..." } — NO inventes recetas no cocinables.`;

export function buildUserPrompt(input: GenerateRecipesInput): string {
  const meal = getMeal(input.mealType);
  const goal = getGoal(input.goal);
  const calRange = targetCaloriesForMeal(input.mealType, input.goal);
  const proteinMin = proteinMinForGoal(input.goal);

  const mealLine = meal
    ? `TIPO DE COMIDA: ${meal.label} (${meal.desc}). La receta DEBE ser específicamente apropiada para ${meal.label.toLowerCase()} en sabor, presentación y textura.`
    : `TIPO DE COMIDA: cualquiera`;

  const goalLine = goal
    ? `OBJETIVO NUTRICIONAL: ${goal.label} — ${goal.desc}. Calcula las cantidades para que cada ración tenga ENTRE ${calRange?.min ?? "—"} Y ${calRange?.max ?? "—"} kcal y AL MENOS ${proteinMin}g de proteína. Es prioritario respetar este rango.`
    : `OBJETIVO NUTRICIONAL: equilibrado, sin restricción específica`;

  return `Genera recetas con estos parámetros:

${mealLine}
${goalLine}

INGREDIENTES DISPONIBLES: ${JSON.stringify(input.ingredients)}
INGREDIENTES PROHIBIDOS (alergias/intolerancias): ${JSON.stringify(input.forbidden ?? [])}
INGREDIENTES NO DESEADOS: ${JSON.stringify(input.unwanted ?? [])}
COMENSALES: ${input.servings}
COCINA (opcional): ${input.cuisine ?? "any"}
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
