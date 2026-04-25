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
  },
  {
    id: "lunch",
    label: "Almuerzo",
    desc: "Comida principal, plato completo",
    baseCalMin: 450,
    baseCalMax: 650,
  },
  {
    id: "snack",
    label: "Merienda",
    desc: "Algo ligero entre comidas",
    baseCalMin: 150,
    baseCalMax: 300,
  },
  {
    id: "dinner",
    label: "Cena",
    desc: "Ligera, fácil de digerir",
    baseCalMin: 400,
    baseCalMax: 600,
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
