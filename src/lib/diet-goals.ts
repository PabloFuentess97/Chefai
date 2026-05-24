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
      "DESAYUNO ESPAÑOL TÍPICO. CONTEXTO POR DEFECTO: si el campo COCINA del prompt está vacío, dice 'any', 'cualquiera' o no es una cocina extranjera explícita, DEBES generar un desayuno que un español adulto comería a primera hora. El plato DEBE parecerse a UNO DE ESTOS 20 EJEMPLOS REALES (úsalos como plantilla, varía cantidades y acompañamientos pero mantén el formato):\n" +
      "1. Tostadas de pan con tomate triturado, aceite de oliva virgen extra y sal\n" +
      "2. Tostadas con jamón serrano y aceite de oliva\n" +
      "3. Tostadas con queso fresco y un hilo de miel\n" +
      "4. Tostadas con aguacate, tomate cherry y sal en escamas\n" +
      "5. Tostadas con mantequilla y mermelada de fresa o naranja\n" +
      "6. Yogur natural con muesli, fruta fresca y miel\n" +
      "7. Bol de granola casera con leche (o leche vegetal) y fruta de temporada\n" +
      "8. Tortitas/pancakes esponjosos con plátano y sirope\n" +
      "9. Crepes dulces con crema de cacahuete y plátano\n" +
      "10. Gachas/porridge de avena DULCES con leche, canela y manzana o plátano\n" +
      "11. Smoothie/batido de frutos rojos con avena y leche\n" +
      "12. Bowl de yogur con plátano, semillas de chía y nueces\n" +
      "13. Pudding de chía con leche vegetal y mango\n" +
      "14. Overnight oats con leche, miel y arándanos\n" +
      "15. Huevos revueltos con una tostada de pan integral y tomate cherry\n" +
      "16. Huevos pochados sobre tostada con aguacate (benedict simplificado)\n" +
      "17. Tortilla francesa SIMPLE (2 huevos enteros, sal) con una tostada\n" +
      "18. Magdalena o muffin casero con café con leche\n" +
      "19. Bizcocho casero de yogur o limón con un café\n" +
      "20. Bocadillo pequeño de jamón y queso en pan de barra, con zumo de naranja\n\n" +
      "FORMATO obligatorio del TÍTULO: español natural y simple ('Tostadas con aguacate y huevo', 'Bowl de yogur con granola y fruta', 'Tortitas de plátano con miel'). PROHIBIDO usar adjetivos culturales no españoles ('al estilo japonés', 'estilo oriental', 'fusion', 'coreano', 'tailandés', 'zen') salvo que la cocina pedida sea explícitamente esa.\n\n" +
      "PROHIBIDO ABSOLUTAMENTE: tortilla de CLARAS solas (es comida de gym, no desayuno), tortillas tipo frittata grandes con muchas verduras (eso es comida), congee, arroz salado, tofu salteado, salsa de soja, miso, ramen, pad thai, currys, estofados, guisos, lasañas, paellas, pollo o pescado como plato principal con guarnición, hamburguesas, lentejas, fabada, ensaladas grandes, bowls de quinoa o arroz salados con proteína cocinada (tipo poke). Si el plato suena a comida o cena, está MAL.\n\n" +
      "VEGETARIANO/VEGANO: usa yogur (vegetal si vegano), queso (vegano si vegano), mantequilla de cacahuete, granola, frutos secos, leches vegetales, fruta. NO uses tofu, tempeh ni seitán en desayuno.",
  },
  {
    id: "lunch",
    label: "Almuerzo",
    desc: "Comida principal, plato completo",
    baseCalMin: 450,
    baseCalMax: 650,
    promptRules:
      "ALMUERZO como comida principal del mediodía en contexto español: paellas, fideuá, arroz con pollo o verduras, lentejas o garbanzos guisados, cocido, ensalada mixta o ensaladilla, espaguetis a la boloñesa o carbonara, pollo asado con patatas, pescado al horno con verdura, merluza a la plancha, tortilla de patatas con ensalada, lubina al horno, gazpacho con guarnición de bocadillo, sopa de pescado con pan, lomo a la plancha con verdura, hamburguesa casera con ensalada. Debe ser sustancial y saciante. Si COCINA es asiática, italiana, mexicana, etc., adapta a esa tradición.",
  },
  {
    id: "snack",
    label: "Merienda",
    desc: "Algo ligero entre comidas",
    baseCalMin: 150,
    baseCalMax: 300,
    promptRules:
      "MERIENDA ESPAÑOLA TÍPICA, snack ligero de media tarde (~17-18h). El plato DEBE parecerse a UNO DE ESTOS 15 EJEMPLOS REALES (úsalos como plantilla):\n" +
      "1. Una manzana con un puñadito de almendras o nueces\n" +
      "2. Plátano con crema de cacahuete\n" +
      "3. Yogur natural con miel y nueces troceadas\n" +
      "4. Mini-bocadillo de jamón o pavo en pan de barra\n" +
      "5. Tostada pequeña con queso fresco y mermelada\n" +
      "6. Galletas integrales con un vaso de leche o leche vegetal\n" +
      "7. Magdalena o trozo pequeño de bizcocho casero con café\n" +
      "8. Macedonia de fruta de temporada\n" +
      "9. Batido natural de fruta (plátano + frutos rojos + leche)\n" +
      "10. Queso curado con membrillo y picos de pan\n" +
      "11. Hummus con palitos de zanahoria y apio\n" +
      "12. Dátiles rellenos de almendra (3 unidades)\n" +
      "13. Tortita de arroz con crema de cacahuete y plátano en rodajas\n" +
      "14. Requesón con mermelada y un par de nueces\n" +
      "15. Pudding de chía pequeño con frutos rojos\n\n" +
      "CARACTERÍSTICAS OBLIGATORIAS: 150-300 kcal totales, ≤10 min de preparación, preferiblemente sin sartén ni horno, comestible casi tal cual. Si el usuario es vegetariano/vegano usa la versión vegetal del lácteo o del embutido pero MANTÉN el formato de snack.\n\n" +
      "PROHIBIDO ABSOLUTAMENTE: tortillas (de claras o enteras), revueltos, frittatas, omelettes (todo lo que requiera sartén con varios ingredientes es comida, no merienda). Tampoco pollo al horno, pescado a la plancha, guisos, pastas, arroces cocinados, lasañas, hamburguesas, ensaladas grandes con proteína cocinada, bowls de quinoa/arroz, sopas de comida, paellas. Si parece una comida en miniatura, está MAL.",
  },
  {
    id: "dinner",
    label: "Cena",
    desc: "Ligera, fácil de digerir",
    baseCalMin: 400,
    baseCalMax: 600,
    promptRules:
      "CENA ESPAÑOLA TÍPICA, ligera, para final del día. Buenos ejemplos: pescado blanco (merluza, bacalao, lubina, dorada) a la plancha o al horno con verduras, salmón al horno con espárragos, tortilla francesa con ensalada, revuelto de setas o gambas, crema de calabacín o verduras con tropezones, sopa de pescado, ensalada templada de pollo o atún, verduras al horno con queso de cabra gratinado, brochetas de pollo con verdura, sandwich vegetal templado, wrap de pollo y aguacate, gazpacho con guarnición ligera, pisto con huevo, hamburguesa de pescado o pavo con ensalada. EVITAR fritos pesados, salsas grasas excesivas, exceso de hidratos refinados, legumbres en grandes cantidades. Debe digerirse bien antes de dormir y ser razonablemente rápida (≤30-40 min).",
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
