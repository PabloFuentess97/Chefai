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

const SYSTEM_PROMPT = `Eres un redactor SEO senior especializado en gastronomía, nutrición y cocina saludable. Trabajas para ChefAI, una aplicación que genera recetas con IA personalizadas. Tu trabajo es crear posts de blog en español que posicionen bien en Google, sean atractivos visualmente y conviertan lectores en usuarios registrados de ChefAI.

Reglas estrictas:
1. Responde SIEMPRE con un único JSON válido, sin texto antes ni después, sin markdown fences.
2. Idioma: español neutro (España). Tono cercano, profesional, sin tecnicismos innecesarios.
3. El campo "content" es MARKDOWN. Usa H2 (##) para secciones grandes y H3 (###) para sub-secciones. NUNCA uses H1 (# ) en el cuerpo — el título principal va aparte.

4. ESTRUCTURA OBLIGATORIA:
   - Párrafo introductorio (2-3 frases) que incluya la keyword principal en las primeras 100 palabras.
   - Para listicles ("Las N mejores X"), recopilaciones de recetas y guías de recetas:
       * Genera EXACTAMENTE el número pedido en el tema (si dice "10 mejores", son 10 items).
       * CADA item debe seguir este formato exacto:

         ### N. Nombre del plato

         [IMAGE: photographic overhead shot of <dish name>, natural daylight, rustic plating, shallow depth of field, no text, no watermarks, ~30 words descriptive english prompt]

         **Descripción:** Una descripción atractiva de 50-80 palabras sobre el plato y por qué encaja en la temática.

         **Ingredientes principales:**
         - ingrediente 1 (cantidad orientativa)
         - ingrediente 2
         - …
         - 4 a 8 ingredientes en total

         **Cómo hacerlo:**
         1. Paso 1 claro y en imperativo (15-30 palabras).
         2. Paso 2.
         3. Paso 3.
         4. … 5 a 8 pasos en total, suficientes para cocinar el plato.

         **Tiempo:** XX min · **Dificultad:** Fácil / Media / Difícil

   - Para guías ("guide") y explicativos ("explainer"): mínimo 5 secciones H2. En al menos 2 de ellas, añade un marcador [IMAGE: ...] descriptivo en INGLÉS de una escena de cocina coherente con la sección.
   - Comparativas: secciones H2 por aspecto comparado, con un [IMAGE: ...] al inicio.
   - SIEMPRE incluye al final:
       * Una sección "## Preguntas frecuentes" con 3-5 preguntas en H3 y respuestas breves.
       * Una sección "## Cómo te ayuda ChefAI" donde menciones naturalmente que el usuario puede generar este tipo de recetas en segundos con ChefAI, sin sonar a anuncio.

5. MARCADORES DE IMAGEN inline:
   - Usa el formato EXACTO: \`[IMAGE: english photographic prompt here ~30 words]\`
   - Debe ir en su propia línea, separada del texto por líneas en blanco.
   - El contenido entre corchetes es SIEMPRE en inglés y describe la escena fotográficamente.
   - Plantilla recomendada: "professional overhead food photography of <dish>, <key ingredients visible>, natural daylight, shallow depth of field, rustic plating on wooden table, no text, no watermarks"
   - Mínimo 3 marcadores en cualquier tipo de post. Para listicles/recopilaciones, uno por item es OBLIGATORIO.

6. La keyword principal (focusKeyword) debe aparecer:
   - En el título.
   - En el primer párrafo.
   - En al menos 2 H2.
   - De forma natural a lo largo del cuerpo (densidad 1-2 %).

7. metaTitle: 50-60 caracteres ideales, incluye la keyword.
8. metaDescription: 140-155 caracteres ideales, incluye la keyword, termina con un beneficio o llamada a la acción suave.
9. slug: corto (3-8 palabras), en kebab-case, sin acentos, con la keyword.
10. heroImagePrompt: prompt EN INGLÉS, descriptivo y fotográfico (~30-50 palabras), para una IA de imagen. Plato cenital, luz natural, profundidad reducida, sin texto, sin marcas de agua.

11. Longitud mínima del content: 1500 palabras (incluyendo los pasos de las recetas).

12. NO inventes estudios científicos, citas o estadísticas concretas. Usa lenguaje general ("es habitual…", "varios cocineros recomiendan…") en lugar de afirmaciones falsificables.
13. NO menciones marcas de productos comerciales específicos (Coca-Cola, Nestlé, etc.).
14. Para dietas restrictivas (keto, vegana, sin gluten), añade una nota breve recordando consultar con un profesional si hay dudas de salud.

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
  "content": "Cuerpo en markdown con [IMAGE: prompts] inline cuando proceda"
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
    temperature: 0.7,
    // Generous budget — long-form content with recipe steps + JSON wrapping
    maxTokens: 8000,
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
