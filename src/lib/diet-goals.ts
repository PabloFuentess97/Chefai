// Meal types and dietary goals — used by the generate wizard, prompts, and profile.

export type MealType = "breakfast" | "lunch" | "snack" | "dinner";
export type DietGoal =
  | "deficit"
  | "maintain"
  | "volume"
  | "definition"
  | "muscle";

export type MealMeta = {
  id: MealType;
  label: string;
  desc: string;
  baseCalMin: number;
  baseCalMax: number;
  /** Hard rules sent to the AI prompt explaining what this meal IS. */
  promptRules: string;
};

export type GoalMeta = {
  id: DietGoal;
  label: string;
  short: string;
  desc: string;
  calMultiplier: number;
  proteinMin: number;
};

export const MEAL_TYPES: readonly MealMeta[] = [
  {
    id: "breakfast",
    label: "Desayuno",
    desc: "Para empezar el día con energía",
    baseCalMin: 300,
    baseCalMax: 450,
    promptRules:
      "DESAYUNO ESPAÑOL/EUROPEO típico que un adulto comería a primera hora de la mañana. CONTEXTO CULTURAL OBLIGATORIO: salvo que el usuario haya pedido explícitamente cocina ASIÁTICA en el campo COCINA, el desayuno DEBE encajar en la tradición mediterránea/europea/americana. PROHIBIDO usar adjetivos culturales NO españoles/europeos en el título: nada de 'al estilo japonés', 'al estilo asiático', 'al estilo oriental', 'al estilo coreano', 'al estilo tailandés', 'fusion', 'estilo zen' o similares — si el usuario no eligió esa cocina, no la metas por la puerta de atrás. PERMITIDO: tostadas con tomate y aceite, tostadas con aguacate, tostadas con queso fresco, tortitas/pancakes con fruta, crepes dulces, gachas/porridge de avena CON LECHE Y FRUTA (NUNCA con tofu, soja salada, ni verduras saladas), granola con yogur, yogur natural con fruta y miel, smoothie/batido de fruta con avena/proteína, huevos revueltos, huevos pochados, tortilla francesa SIMPLE (huevo entero, sin claras separadas, con un solo relleno ligero como queso o jamón), huevos benedict, sandwich de pavo y queso, mini bocadillo de jamón, café con leche, té, zumos naturales, bizcocho casero, magdalena, muffin de plátano, croissant, fruta fresca con frutos secos, queso fresco con miel, requesón con mermelada, tortita de arroz con crema de cacahuete y plátano, pudding de chía con fruta, overnight oats. PROHIBIDO ABSOLUTAMENTE: tortillas de claras solas (eso es comida de gym, no desayuno típico), tortillas con múltiples verduras tipo frittata grande, gachas saladas asiáticas tipo congee, arroz hervido con tofu, tofu salteado, salsa de soja, miso, ramen, pad thai, rollitos de primavera, dim sum salado, currys, estofados, guisos, lasañas, pasta con salsa pesada, paellas, pollo entero al horno, costillas BBQ, hamburguesas completas, lentejas, fabada, sopas de comida principal, platos de cuchara, bowls de comida tipo poke con arroz y tofu, ensaladas grandes con proteína. Si el plato suena a almuerzo, cena o comida exótica salada con tofu, está MAL. Cuando el usuario es vegetariano/vegano, usa proteínas vegetales SUAVES en contexto desayuno: yogur de soja, queso vegano, mantequilla de cacahuete, granola con frutos secos — NO tofu salado ni seitán.",
  },
  {
    id: "lunch",
    label: "Almuerzo",
    desc: "Comida principal, plato completo",
    baseCalMin: 450,
    baseCalMax: 650,
    promptRules:
      "ALMUERZO como comida principal del mediodía. Plato completo y saciante: arroces, pastas, legumbres, carnes/pescados a la plancha o al horno con guarnición, ensaladas grandes con proteína, bowls completos, guisos, currys, paellas, lasañas. Debe ser un plato sustancial, no un snack ni un picoteo.",
  },
  {
    id: "snack",
    label: "Merienda",
    desc: "Algo ligero entre comidas",
    baseCalMin: 150,
    baseCalMax: 300,
    promptRules:
      "MERIENDA: snack ligero a media tarde (~17-18h). DEBE SER ALGO QUE COMES CON LA MANO O CON UNA CUCHARA, sin platos elaborados, sin cocción larga. PERMITIDO: fruta fresca con yogur, frutos secos, hummus con palitos de zanahoria/apio, tostada pequeña con queso fresco y miel, mini-bocadillo de pavo, smoothie/batido de fruta, barrita energética casera, palomitas, queso curado con membrillo, galletas integrales con crema de cacahuete, gelatina de fruta, bizcocho de plátano (porción pequeña), tostada con aguacate (porción), dátiles rellenos de almendra, tortitas de arroz con crema de cacahuete, requesón con mermelada, pudding de chía pequeño, manzana con almendras laminadas, plátano con chocolate negro. CARACTERÍSTICAS OBLIGATORIAS: 150-300 kcal totales, MUY rápido de preparar (≤10 min), preferiblemente sin sartén ni horno, NO requiere cocina compleja. PROHIBIDO ABSOLUTAMENTE: tortillas (de claras o enteras), revueltos, frittatas, omelettes — todo lo que requiera sartén con varios ingredientes es comida, no merienda. Tampoco pollo al horno, pescado a la plancha, guisos, pastas, arroces cocinados, lasañas, hamburguesas, ensaladas grandes con proteína cocinada, bowls de quinoa/arroz, sopas de comida, paellas. Si parece una comida principal en miniatura, está MAL — debe parecer un snack/picoteo.",
  },
  {
    id: "dinner",
    label: "Cena",
    desc: "Ligera, fácil de digerir",
    baseCalMin: 400,
    baseCalMax: 600,
    promptRules:
      "CENA ligera para final del día. PERMITIDO: pescados blancos a la plancha o al horno, tortillas, revueltos de huevo con verdura, cremas y sopas ligeras, ensaladas templadas con proteína magra, verduras al horno con queso, hamburguesas de pescado/pollo, sandwiches templados, wraps. EVITAR fritos pesados, salsas grasas excesivas, exceso de hidratos refinados, legumbres en grandes cantidades. Debe digerirse bien antes de dormir, ser razonablemente rápida (≤30-40 min) y saciante sin ser pesada.",
  },
] as const;

export const GOALS: readonly GoalMeta[] = [
  {
    id: "deficit",
    label: "Déficit calórico",
    short: "Déficit",
    desc: "Bajar grasa controlando calorías",
    calMultiplier: 0.85,
    proteinMin: 25,
  },
  {
    id: "maintain",
    label: "Mantenimiento",
    short: "Mantener",
    desc: "Comer equilibrado, sin objetivo",
    calMultiplier: 1.0,
    proteinMin: 20,
  },
  {
    id: "volume",
    label: "Volumen",
    short: "Volumen",
    desc: "Subir peso, ganar masa total",
    calMultiplier: 1.15,
    proteinMin: 30,
  },
  {
    id: "definition",
    label: "Definición",
    short: "Definir",
    desc: "Mantener masa, marcar músculo",
    calMultiplier: 1.0,
    proteinMin: 35,
  },
  {
    id: "muscle",
    label: "Ganar músculo",
    short: "Músculo",
    desc: "Hipertrofia con superávit ligero",
    calMultiplier: 1.1,
    proteinMin: 35,
  },
] as const;

export function getMeal(id: MealType | null | undefined): MealMeta | undefined {
  if (!id) return undefined;
  return MEAL_TYPES.find((m) => m.id === id);
}

export function getGoal(id: DietGoal | null | undefined): GoalMeta | undefined {
  if (!id) return undefined;
  return GOALS.find((g) => g.id === id);
}

export function targetCaloriesForMeal(
  mealId: MealType | null | undefined,
  goalId: DietGoal | null | undefined
): { min: number; max: number } | null {
  const meal = getMeal(mealId);
  if (!meal) return null;
  const goal = getGoal(goalId);
  const mult = goal?.calMultiplier ?? 1.0;
  return {
    min: Math.round(meal.baseCalMin * mult),
    max: Math.round(meal.baseCalMax * mult),
  };
}

export function proteinMinForGoal(
  goalId: DietGoal | null | undefined
): number | null {
  const goal = getGoal(goalId);
  return goal?.proteinMin ?? null;
}

// ---------- Dietary profiles ----------
//
// User-level dietary restriction. Different from "forbidden" (per-recipe
// allergens) and "goal" (nutritional target). The profile is applied as a
// hard constraint on EVERY generated recipe, both single recipes and meal
// plans. Stored on User.dietaryProfile.

export type DietaryProfile =
  | "omnivore"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "keto"
  | "lowcarb"
  | "glutenfree"
  | "lactosefree"
  | "paleo"
  | "mediterranean";

export type DietaryProfileMeta = {
  id: DietaryProfile;
  label: string;
  short: string;
  desc: string;
  /** Hard rules sent verbatim to the AI prompt. */
  rules: string[];
  /** Ingredients the AI must avoid for this profile. */
  banned: string[];
};

export const DIETARY_PROFILES: readonly DietaryProfileMeta[] = [
  {
    id: "omnivore",
    label: "Sin restricciones",
    short: "Omnívora",
    desc: "Come de todo, sin restricciones especiales",
    rules: [],
    banned: [],
  },
  {
    id: "vegetarian",
    label: "Vegetariana",
    short: "Vegetariana",
    desc: "Sin carne ni pescado. Permite huevos y lácteos.",
    rules: [
      "NO uses carne (ternera, cerdo, pollo, cordero, conejo, embutidos) ni pescado/mariscos en ningún plato.",
      "Sí puedes usar huevos, lácteos, legumbres, cereales, frutos secos y proteínas vegetales (tofu, tempeh, seitán).",
      "CONTEXTO DE COMIDA: respeta el momento del día. Para DESAYUNO prefiere yogur, huevos, queso fresco, frutos secos, granola, tostadas con aguacate o crema de cacahuete; evita tofu/seitán/tempeh salteados (más propios de almuerzo o cena). Para MERIENDA: yogur, fruta, frutos secos, hummus pequeño, queso fresco. Para ALMUERZO/CENA: usa libremente legumbres, tofu, tempeh, seitán en preparaciones sustanciosas.",
    ],
    banned: [
      "carne", "ternera", "cerdo", "pollo", "pavo", "cordero", "conejo",
      "jamón", "chorizo", "bacon", "salchicha", "embutido",
      "pescado", "atún", "salmón", "merluza", "bacalao", "marisco",
      "gambas", "langostinos", "mejillones", "calamares", "pulpo",
    ],
  },
  {
    id: "vegan",
    label: "Vegana",
    short: "Vegana",
    desc: "Sin productos de origen animal",
    rules: [
      "NO uses ningún producto de origen animal: carne, pescado, mariscos, huevos, lácteos (leche, queso, yogur, mantequilla, nata), miel, gelatina.",
      "Usa proteínas vegetales (tofu, tempeh, seitán, legumbres), leches vegetales (avena, soja, almendra), quesos veganos y levadura nutricional.",
      "Las recetas deben ser explícitamente veganas y saciantes, con proteína suficiente.",
      "CONTEXTO DE COMIDA: respeta el momento del día. Para DESAYUNO usa yogur vegetal, leches vegetales, granola, fruta, frutos secos, crema de cacahuete, pan con aguacate, gachas de avena DULCES con leche vegetal y fruta — EVITA tofu/seitán/tempeh salteados. Para MERIENDA: yogur vegetal, fruta, frutos secos, hummus pequeño. Para ALMUERZO/CENA: usa libremente tofu, tempeh, seitán y legumbres en preparaciones sustanciosas.",
    ],
    banned: [
      "carne", "ternera", "cerdo", "pollo", "pavo", "cordero", "conejo",
      "jamón", "chorizo", "bacon", "salchicha", "embutido",
      "pescado", "atún", "salmón", "merluza", "bacalao", "marisco",
      "gambas", "langostinos", "mejillones", "calamares", "pulpo",
      "huevo", "huevos", "yema", "clara",
      "leche", "queso", "yogur", "mantequilla", "nata", "crema",
      "miel", "gelatina",
    ],
  },
  {
    id: "pescatarian",
    label: "Pescetariana",
    short: "Pescetariana",
    desc: "Sin carne, pero sí pescado y mariscos",
    rules: [
      "NO uses carne ni aves (ternera, cerdo, pollo, pavo, cordero, conejo, embutidos).",
      "Sí puedes usar pescado, mariscos, huevos, lácteos y todos los vegetales.",
    ],
    banned: [
      "carne", "ternera", "cerdo", "pollo", "pavo", "cordero", "conejo",
      "jamón", "chorizo", "bacon", "salchicha", "embutido",
    ],
  },
  {
    id: "keto",
    label: "Cetogénica (keto)",
    short: "Keto",
    desc: "Muy baja en carbohidratos, alta en grasas saludables",
    rules: [
      "La receta DEBE ser cetogénica: máximo 10g netos de carbohidratos por ración.",
      "Prioriza grasas saludables (aguacate, aceite de oliva, frutos secos, mantequilla, coco) y proteínas.",
      "NO uses azúcar, harinas de trigo, arroz, pasta, pan, legumbres ni frutas dulces (manzana, plátano, uva). Sí frutos rojos en cantidades pequeñas.",
      "Verduras permitidas: hojas verdes, brócoli, coliflor, calabacín, espárragos, pimientos.",
    ],
    banned: [
      "azúcar", "harina", "pan", "arroz", "pasta", "patata", "patatas",
      "lentejas", "garbanzos", "alubias", "judías",
      "plátano", "manzana", "uva", "naranja", "piña", "mango",
      "maíz", "avena", "quinoa", "cuscús",
    ],
  },
  {
    id: "lowcarb",
    label: "Baja en carbohidratos",
    short: "Low-carb",
    desc: "Menos de 30g de carbohidratos por ración",
    rules: [
      "La receta DEBE tener menos de 30g de carbohidratos netos por ración.",
      "Reduce o sustituye harinas refinadas, pasta, arroz blanco, pan y azúcares.",
      "Prioriza verduras, proteínas magras y grasas saludables.",
    ],
    banned: ["azúcar"],
  },
  {
    id: "glutenfree",
    label: "Sin gluten",
    short: "Sin gluten",
    desc: "Apta para celíacos: nada de trigo, cebada, centeno, espelta",
    rules: [
      "NO uses trigo, cebada, centeno, espelta, kamut, ni ningún derivado (harina de trigo, pan común, pasta común, cuscús, bulgur, sémola).",
      "Usa alternativas sin gluten: arroz, maíz, quinoa, trigo sarraceno, harina de almendra o garbanzo, pasta sin gluten certificada.",
      "Avisa de salsas que suelen llevar gluten (soja convencional → usa tamari sin gluten).",
    ],
    banned: [
      "trigo", "cebada", "centeno", "espelta", "kamut",
      "harina de trigo", "pan", "pasta", "cuscús", "bulgur", "sémola",
      "salsa de soja",
    ],
  },
  {
    id: "lactosefree",
    label: "Sin lactosa",
    short: "Sin lactosa",
    desc: "Sin lácteos con lactosa (leche, queso fresco, yogur, nata, mantequilla)",
    rules: [
      "NO uses leche de vaca, nata, mantequilla, queso fresco, yogur convencional ni helados lácteos.",
      "Sí puedes usar bebidas vegetales (avena, soja, almendra), quesos curados sin lactosa, yogur sin lactosa o margarinas vegetales.",
    ],
    banned: [
      "leche", "nata", "mantequilla", "queso fresco", "yogur",
    ],
  },
  {
    id: "paleo",
    label: "Paleo",
    short: "Paleo",
    desc: "Sin cereales, legumbres, lácteos ni procesados",
    rules: [
      "NO uses cereales (trigo, arroz, avena, maíz), legumbres (lentejas, garbanzos, alubias), lácteos ni azúcares refinados.",
      "Sí puedes usar carnes, pescados, huevos, verduras, frutas, frutos secos, semillas, aceites naturales (oliva, coco) y miel en pequeñas cantidades.",
    ],
    banned: [
      "trigo", "arroz", "avena", "maíz", "pan", "pasta",
      "lentejas", "garbanzos", "alubias", "judías",
      "leche", "queso", "yogur", "mantequilla", "nata",
      "azúcar",
    ],
  },
  {
    id: "mediterranean",
    label: "Mediterránea",
    short: "Mediterránea",
    desc: "Aceite de oliva, pescado, legumbres, verduras y poca carne roja",
    rules: [
      "La receta debe seguir el patrón mediterráneo: abundantes verduras, legumbres y cereales integrales, pescado y aves en lugar de carnes rojas, aceite de oliva como grasa principal, frutos secos y hierbas frescas.",
      "Limita carnes rojas, embutidos y azúcares refinados.",
    ],
    banned: [],
  },
] as const;

export function getDietaryProfile(
  id: DietaryProfile | null | undefined
): DietaryProfileMeta | undefined {
  if (!id) return undefined;
  return DIETARY_PROFILES.find((d) => d.id === id);
}
