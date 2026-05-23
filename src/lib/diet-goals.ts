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
      "DESAYUNO típico español/europeo. PERMITIDO: tostadas, tortitas, gachas/porridge de avena, granola, yogur con fruta, smoothies/batidos, fruta fresca, huevos (revueltos, en tortilla, pochados, benedict), pan integral con tomate y aceite, café/té, zumos, bocadillos pequeños, crepes, panqueques, muffins, pan con aguacate. PROHIBIDO ABSOLUTAMENTE: estofados, guisos, lasaña, pasta con salsa pesada, paella, arroz al horno, pollo entero, pescados a la plancha como plato principal, sopas calientes de comida, hamburguesas, costillas, carnes en salsa, platos de cuchara, postres como brownies o tartas. La sensación debe ser ligera, dulce o salada simple, y desayunable a primera hora.",
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
      "MERIENDA: snack ligero a media tarde (~17-18h). PERMITIDO: fruta con yogur, frutos secos, hummus con palitos de verdura, tostada pequeña con queso, mini-bocadillos, smoothie/batido pequeño, barrita energética casera, palomitas, queso con membrillo, galletas integrales, gelatina, bizcocho de plátano (porción pequeña), tostadas con aguacate, dátiles con almendra, mini-tortitas. CARACTERÍSTICAS OBLIGATORIAS: 150-300 kcal totales, MUY rápido de preparar (≤10 min), comestible sin necesidad de cubiertos en algunos casos, NO requiere cocina compleja. PROHIBIDO ABSOLUTAMENTE: platos principales como pollo al horno, pescado a la plancha, guisos, pastas, arroces, lasañas, hamburguesas, ensaladas grandes, bowls de proteína, sopas de comida, paellas. Si parece una comida o cena, está MAL.",
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
