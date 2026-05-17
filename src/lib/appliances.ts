// Cooking-appliance registry.
//
// The user picks zero or more from this list (stored on User.cookingAppliances).
// When generating a recipe or meal plan, the chosen appliances are injected
// verbatim as adaptation instructions into the AI system prompt — the model
// rewrites timings and steps accordingly. Examples:
//   - "150 g a 200 °C en horno"  →  "150 g a 200 °C en air fryer 12 min"
//   - "Sofríe la cebolla 8 min"  →  "Sofríe la cebolla en Thermomix
//      vel 1 / 100 °C / 8 min, añadiendo aceite por el bocal"

export type ApplianceId =
  | "air-fryer"
  | "thermomix"
  | "monsieur-cuisine"
  | "mambo"
  | "olla-rapida"
  | "olla-lenta"
  | "microondas"
  | "vaporera"
  | "wok"
  | "plancha"
  | "robot-generico";

export type ApplianceMeta = {
  id: ApplianceId;
  label: string;
  short: string;
  emoji: string;
  desc: string;
  /** Instruction injected into the AI system prompt verbatim. */
  instruction: string;
};

export const APPLIANCES: readonly ApplianceMeta[] = [
  {
    id: "air-fryer",
    label: "Freidora de aire (air fryer)",
    short: "Air fryer",
    emoji: "🍟",
    desc: "Cocina más rápido con poco aceite",
    instruction:
      "El usuario tiene FREIDORA DE AIRE. Siempre que un paso del horno pueda hacerse en air fryer, ofrécelo: indica temperatura (suele ser 180-200 °C) y tiempo aproximado, y recuerda agitar la cesta a mitad de cocción si procede. Para fritos clásicos (croquetas, patatas, alitas), prefiere la air fryer al aceite. Reduce ~20-30 % el tiempo respecto al horno tradicional.",
  },
  {
    id: "thermomix",
    label: "Thermomix",
    short: "Thermomix",
    emoji: "🌀",
    desc: "Vaso multifunción de Vorwerk",
    instruction:
      "El usuario tiene THERMOMIX. Adapta los pasos al vaso con indicaciones explícitas de velocidad (vel 1-10 o turbo), temperatura (Varoma / 60-120 °C) y tiempo. Aprovecha el vaso para sofritos (vel 1 + temperatura), batidos (vel 8-10) y cocciones (Varoma para vapor). Indica si conviene retirar el cubilete para que evapore.",
  },
  {
    id: "monsieur-cuisine",
    label: "Monsieur Cuisine",
    short: "Monsieur Cuisine",
    emoji: "🤖",
    desc: "Robot de Lidl",
    instruction:
      "El usuario tiene MONSIEUR CUISINE. Adapta los pasos al robot con velocidad (1-10), temperatura (40-130 °C, modo Varoma o cestillo para vapor) y tiempo. Funciona como un Thermomix; usa terminología equivalente.",
  },
  {
    id: "mambo",
    label: "Mambo / Cecotec",
    short: "Mambo",
    emoji: "🥣",
    desc: "Robot de cocina Cecotec",
    instruction:
      "El usuario tiene un MAMBO (Cecotec). Indica velocidad (1-10), temperatura (40-140 °C, modo plancha o vapor con cestillo) y tiempo. Aprovecha la función plancha del Mambo (no la tiene Thermomix) para dorar carnes antes de guisar.",
  },
  {
    id: "olla-rapida",
    label: "Olla rápida / a presión",
    short: "Olla rápida",
    emoji: "🍲",
    desc: "Cocina legumbres y guisos en minutos",
    instruction:
      "El usuario tiene OLLA RÁPIDA (a presión). Adapta tiempos: legumbres remojadas 10-15 min, garbanzos 15-20 min, carnes guisadas 20-25 min, arroces no recomendados. Indica claramente el momento de cerrar la válvula, el tiempo a presión y cuándo despresurizar de forma natural o rápida.",
  },
  {
    id: "olla-lenta",
    label: "Olla lenta (slow cooker)",
    short: "Olla lenta",
    emoji: "⏳",
    desc: "Cocción de 4-8 horas a baja temperatura",
    instruction:
      "El usuario tiene OLLA LENTA (slow cooker / crock-pot). Cuando la receta admita cocción larga (estofados, sopas, carnes en salsa), ofrece la versión de olla lenta: HIGH 3-4 horas o LOW 6-8 horas. Reduce el líquido un 25 % respecto a la versión de fogón. Recomienda dorar previamente carnes en sartén aparte para mejor sabor.",
  },
  {
    id: "microondas",
    label: "Microondas",
    short: "Microondas",
    emoji: "📡",
    desc: "Para descongelar y cocciones rápidas",
    instruction:
      "El usuario tiene MICROONDAS. Ofrece atajos cuando proceda: cocer patata o boniato 6-8 min al 100 %, descongelar pescado 2-3 min al 30 %, atemperar mantequilla 10 s. Indica potencia y tiempo aproximados.",
  },
  {
    id: "vaporera",
    label: "Vaporera",
    short: "Vaporera",
    emoji: "♨️",
    desc: "Eléctrica o bambú",
    instruction:
      "El usuario tiene VAPORERA. Para verduras, pescado y dim sum prefiere la cocción al vapor en lugar de hervir o saltear. Indica tiempos típicos: brócoli 6-8 min, pescado blanco 8-10 min, calabacín 5 min.",
  },
  {
    id: "wok",
    label: "Wok",
    short: "Wok",
    emoji: "🥢",
    desc: "Salteados rápidos a fuego fuerte",
    instruction:
      "El usuario tiene WOK. Para salteados orientales y verduras crujientes, usa el wok con fuego muy fuerte, aceite con punto de humo alto (cacahuete o girasol) y movimiento constante. Cocción típica: 3-5 min total. Añade los ingredientes en orden de dureza (de más a menos).",
  },
  {
    id: "plancha",
    label: "Plancha eléctrica",
    short: "Plancha",
    emoji: "🔥",
    desc: "Carnes, pescados y verduras",
    instruction:
      "El usuario tiene PLANCHA eléctrica. Para carnes, pescados y verduras, prefiere la plancha bien caliente con un hilo de aceite. Indica vuelta única o vuelta y vuelta según grosor. Pre-calentar 3-5 min.",
  },
  {
    id: "robot-generico",
    label: "Robot de cocina genérico",
    short: "Robot",
    emoji: "🍳",
    desc: "Cualquier robot con vaso y cuchillas",
    instruction:
      "El usuario tiene un ROBOT DE COCINA con vaso, cuchillas y calor. Adapta los pasos para que pueda hacerlos en el vaso (triturar, sofreír, cocinar con temperatura). Usa indicaciones genéricas de velocidad baja / media / alta y temperatura aproximada en °C.",
  },
] as const;

export function getAppliance(id: string): ApplianceMeta | undefined {
  return APPLIANCES.find((a) => a.id === id);
}

export function getAppliances(ids: string[]): ApplianceMeta[] {
  return ids
    .map((id) => getAppliance(id))
    .filter((a): a is ApplianceMeta => !!a);
}
