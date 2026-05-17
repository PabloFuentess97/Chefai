import "server-only";
import { z } from "zod";
import { generateText } from "./ai/text";

// ---------------------------------------------------------------
// Schema the AI must conform to
// ---------------------------------------------------------------
export const blogPostResponseSchema = z.object({
  title: z.string().min(8).max(180),
  subtitle: z.string().max(280).optional().nullable(),
  slug: z
    .string()
    .min(2)
    .max(110)
    .transform((s) =>
      s
        .toLowerCase()
        .replace(/[áàäâ]/g, "a")
        .replace(/[éèëê]/g, "e")
        .replace(/[íìïî]/g, "i")
        .replace(/[óòöô]/g, "o")
        .replace(/[úùüû]/g, "u")
        .replace(/ñ/g, "n")
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
    ),
  excerpt: z.string().min(40).max(450),
  metaTitle: z.string().min(20).max(65),
  metaDescription: z.string().min(80).max(160),
  focusKeyword: z.string().min(2).max(80),
  suggestedTags: z.array(z.string().min(2).max(30)).min(3).max(10),
  heroImagePrompt: z.string().min(20).max(500),
  content: z.string().min(800), // Markdown body
});

export type BlogPostAiOutput = z.infer<typeof blogPostResponseSchema>;

// ---------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------

const SYSTEM_PROMPT = `Eres un redactor SEO senior especializado en gastronomía, nutrición y cocina saludable. Trabajas para ChefAI, una aplicación que genera recetas con IA personalizadas. Tu trabajo es crear posts de blog en español que posicionen bien en Google y conviertan lectores en usuarios registrados de ChefAI.

Reglas estrictas:
1. Responde SIEMPRE con un único JSON válido, sin texto antes ni después, sin markdown fences.
2. Idioma: español neutro (España). Tono cercano, profesional, sin tecnicismos innecesarios.
3. El campo "content" es MARKDOWN. Usa H2 (##) para secciones grandes y H3 (###) para sub-secciones. NUNCA uses H1 (# ) en el cuerpo — el título principal va aparte.
4. Estructura SEO obligatoria del cuerpo:
   - Párrafo introductorio de 2-3 frases que incluya la keyword principal en las primeras 100 palabras.
   - Mínimo 5 secciones con H2.
   - Para listicles ("Las N mejores X"), incluye N elementos numerados, cada uno con su H3, una descripción de 80-150 palabras, y mínimo 2-3 ingredientes/datos relevantes en bullets.
   - Sección "Preguntas frecuentes" al final con 3-5 preguntas en H3 y respuestas breves.
   - Una sección "Cómo te ayuda ChefAI" en la que mencionas naturalmente que el usuario puede generar este tipo de recetas en segundos con ChefAI, sin sonar a anuncio.
5. La keyword principal (focusKeyword) debe aparecer:
   - En el título.
   - En el primer párrafo.
   - En al menos 2 H2.
   - De forma natural a lo largo del cuerpo (densidad 1-2 %).
6. metaTitle: 50-60 caracteres ideales, incluye la keyword.
7. metaDescription: 140-155 caracteres ideales, incluye la keyword, termina con un beneficio o llamada a la acción suave.
8. slug: corto (3-8 palabras), en kebab-case, sin acentos, con la keyword.
9. heroImagePrompt: prompt EN INGLÉS, descriptivo y fotográfico (~30-50 palabras), para una IA de imagen. Plato cenital, luz natural, profundidad reducida, sin texto, sin marcas de agua. Si el post no es de comida (ej. técnica), describe una escena de cocina coherente.
10. Longitud mínima del content: 1200 palabras. Recomendado 1500-2200.
11. NO inventes estudios científicos, citas o estadísticas concretas. Usa lenguaje general ("varios estudios sugieren…", "es habitual…") en lugar de afirmaciones falsificables.
12. NO menciones marcas de productos comerciales específicos (Coca-Cola, Nestlé, etc.).
13. Cuando hables de dietas restrictivas (keto, vegana, sin gluten), añade una nota breve recordando consultar con un profesional si hay dudas de salud.

Formato exacto de respuesta:
{
  "title": "string",
  "subtitle": "string opcional",
  "slug": "kebab-case-slug",
  "excerpt": "Resumen de 2-3 frases (~250 caracteres)",
  "metaTitle": "Título SEO ~55 chars",
  "metaDescription": "Descripción SEO ~150 chars",
  "focusKeyword": "keyword principal",
  "suggestedTags": ["tag1", "tag2", "..."],
  "heroImagePrompt": "English photographic prompt ~40 words",
  "content": "Cuerpo en markdown… usa ##, ###, **negritas**, listas con - y 1."
}`;

const POST_TYPE_GUIDE: Record<string, string> = {
  listicle:
    "FORMATO: Listicle numerado. Si el usuario pide 'Las 10 mejores X', genera exactamente 10 items, cada uno como sub-sección H3.",
  guide:
    "FORMATO: Guía paso a paso. Estructura: introducción → conceptos clave → pasos concretos → errores comunes → FAQ.",
  comparison:
    "FORMATO: Comparativa. Tabla mental de pros y contras, con secciones H2 por aspecto comparado (sabor, salud, precio, dificultad…).",
  "recipe-roundup":
    "FORMATO: Recopilación de recetas. Cada receta como H3 con descripción, tiempo aproximado, dificultad y 3-5 ingredientes clave (sin la receta completa).",
  explainer:
    "FORMATO: Artículo explicativo. Estructura: qué es → por qué importa → cómo funciona → mitos comunes → cuándo aplicarlo.",
};

export type GenerateInput = {
  topic: string;
  focusKeyword?: string | null;
  postType: "listicle" | "guide" | "comparison" | "recipe-roundup" | "explainer";
  targetAudience?: string | null;
};

function buildUserPrompt(input: GenerateInput, brandName: string): string {
  const guide =
    POST_TYPE_GUIDE[input.postType] ?? POST_TYPE_GUIDE["listicle"]!;
  return `Genera un post de blog para ${brandName} con estos parámetros:

TEMA / IDEA: ${input.topic}
KEYWORD PRINCIPAL (opcional, si no se indica decide tú una buena): ${input.focusKeyword ?? "(decide tú)"}
PÚBLICO OBJETIVO: ${input.targetAudience ?? "personas que cocinan en casa y quieren comer mejor sin complicarse"}

${guide}

Devuelve estrictamente el JSON con todos los campos del schema.`;
}

/**
 * Calls the configured AI text provider with high token budget and returns
 * a fully-validated blog post payload.
 */
export async function generateBlogPostAi(
  input: GenerateInput,
  brandName: string
): Promise<BlogPostAiOutput> {
  const result = await generateText({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(input, brandName),
    jsonResponse: true,
    temperature: 0.75,
    // Generous budget — long-form content + JSON wrapping
    maxTokens: 6000,
  });
  if (!result.content) throw new Error("AI returned empty content");
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.content);
  } catch {
    throw new Error("AI returned invalid JSON");
  }
  return blogPostResponseSchema.parse(parsed);
}

// ---------------------------------------------------------------
// Reading-time estimate (used by post page)
// ---------------------------------------------------------------
export function readingTimeMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}
