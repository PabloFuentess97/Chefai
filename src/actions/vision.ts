"use server";

import { z } from "zod";
import { analyzeImage } from "@/lib/ai/text";
import { requireUser } from "@/lib/auth";
import { getCurrentPlan, planHasFeature } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/session";

const responseSchema = z.object({
  ingredients: z.array(z.string().trim().min(1).max(60)).min(0).max(40),
});

export type DetectResult = z.infer<typeof responseSchema>;

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

const SYSTEM_PROMPT = `Eres un asistente que identifica ingredientes comestibles en una foto de una nevera, despensa o encimera. Responde EXCLUSIVAMENTE con un JSON válido.

Reglas:
1. Devuelve una lista en español con los nombres de los ingredientes que veas claramente. Sin descripciones, sin marcas, sin envases.
2. Usa el nombre genérico singular en minúsculas (ej. "pollo", "tomate", "queso parmesano", "leche").
3. NO inventes ingredientes que no estés razonablemente seguro de ver.
4. Ignora utensilios, recipientes, servilletas, etiquetas y cualquier objeto no comestible.
5. Si la imagen no muestra ingredientes o no es de cocina, devuelve { "ingredients": [] }.
6. Como mucho 30 ingredientes. Si hay más, prioriza los más útiles para cocinar.

Formato:
{ "ingredients": ["pollo", "arroz", "tomate", "limón", ...] }`;

export async function detectIngredientsFromImageAction(
  formData: FormData
): Promise<ActionResult<DetectResult>> {
  const user = await requireUser();

  const plan = await getCurrentPlan(user.id);
  if (!planHasFeature(plan, "fridgePhoto")) {
    return fail(
      "FORBIDDEN",
      "La foto de la nevera está disponible en planes superiores"
    );
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return fail("VALIDATION", "No se recibió ninguna imagen");
  }
  if (file.size > 10 * 1024 * 1024) {
    return fail("FILE_TOO_LARGE", "La imagen excede 10 MB");
  }
  if (!file.type.startsWith("image/")) {
    return fail("BAD_TYPE", "El archivo no es una imagen");
  }

  const rl = await rateLimit(`vision:${user.id}`, 8, 60);
  if (!rl.ok) {
    return fail("RATE_LIMIT", "Espera un momento antes de subir otra foto");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mime = file.type;
  const dataUrl = `data:${mime};base64,${base64}`;

  try {
    const result = await analyzeImage({
      systemPrompt: SYSTEM_PROMPT,
      userText:
        "Identifica los ingredientes comestibles que veas en esta foto.",
      imageDataUrl: dataUrl,
      jsonResponse: true,
      temperature: 0.2,
      maxTokens: 500,
    });
    if (!result.content) return fail("AI", "Respuesta vacía");
    const parsed = responseSchema.parse(JSON.parse(result.content));
    return { ok: true, data: parsed };
  } catch (e) {
    logger.error({ err: e, userId: user.id }, "vision detection failed");
    return fail(
      "AI",
      "No hemos podido analizar la foto. Inténtalo de nuevo."
    );
  }
}
