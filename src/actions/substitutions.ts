"use server";

import { z } from "zod";
import { openai } from "@/lib/openai";
import { env } from "@/env";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/session";

const responseSchema = z.object({
  substitutions: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        ratio: z.string().min(1).max(40), // e.g. "1:1", "150g por 100g"
        note: z.string().min(1).max(200),
      })
    )
    .min(1)
    .max(4),
});

export type SubstitutionResult = z.infer<typeof responseSchema>;

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

export async function getSubstitutionsAction(
  recipeId: string,
  ingredientName: string
): Promise<ActionResult<SubstitutionResult>> {
  const user = await requireUser();
  if (!ingredientName?.trim()) {
    return fail("VALIDATION", "Falta el ingrediente");
  }

  const rl = await rateLimit(`subs:${user.id}`, 10, 60);
  if (!rl.ok) return fail("RATE_LIMIT", "Espera un momento antes de pedir otra sugerencia");

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: {
      title: true,
      cuisine: true,
      ingredients: { select: { name: true } },
    },
  });
  if (!recipe) return fail("NOT_FOUND", "Receta no encontrada");

  const otherIngredients = recipe.ingredients
    .map((i) => i.name)
    .filter((n) => n.toLowerCase() !== ingredientName.toLowerCase())
    .slice(0, 12);

  const systemPrompt = `Eres un chef experto que sugiere sustitutos de ingredientes en recetas. Respondes EXCLUSIVAMENTE con un JSON válido sin texto extra.

Reglas:
1. Sugiere 2 o 3 alternativas realistas y comunes que un usuario probablemente tenga en casa.
2. Para cada alternativa, indica la PROPORCIÓN respecto al original (ej. "1:1", "150g por 100g de original", "2 unidades por taza").
3. Añade una NOTA breve (máx 1 frase) sobre el efecto en el sabor o textura.
4. Tener en cuenta el TIPO DE COCINA y el resto de ingredientes para mantener coherencia.
5. NO sugieras como alternativa un ingrediente que ya está en la receta.
6. Si el ingrediente es difícil de sustituir, sugiere quitarlo o dejarlo opcional con una nota.

Formato de respuesta:
{ "substitutions": [
  { "name": "string", "ratio": "string", "note": "string" }
] }`;

  const userPrompt = `RECETA: ${recipe.title}
COCINA: ${recipe.cuisine ?? "no especificada"}
OTROS INGREDIENTES PRESENTES: ${JSON.stringify(otherIngredients)}

INGREDIENTE A SUSTITUIR: ${ingredientName.trim()}

Dame 2-3 alternativas que mantengan la coherencia con la receta y la cocina.`;

  try {
    const completion = await openai.chat.completions.create({
      model: env.OPENAI_TEXT_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_tokens: 500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return fail("OPENAI", "Respuesta vacía");
    const parsed = responseSchema.parse(JSON.parse(raw));
    return { ok: true, data: parsed };
  } catch (e) {
    logger.error({ err: e, recipeId, ingredientName }, "substitution failed");
    return fail("OPENAI", "No hemos podido obtener sustitutos. Inténtalo de nuevo.");
  }
}
