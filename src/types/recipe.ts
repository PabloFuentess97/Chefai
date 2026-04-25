export type GeneratedRecipeIngredient = {
  name: string;
  quantity: number;
  unit: string;
  optional: boolean;
  suggested: boolean;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
};

export type GeneratedRecipeStep = {
  order: number;
  content: string;
  durationMin: number | null;
};

export type GeneratedRecipe = {
  title: string;
  description: string;
  cuisine: string | null;
  difficulty: "easy" | "medium" | "hard";
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  imagePrompt: string;
  ingredients: GeneratedRecipeIngredient[];
  perServing: {
    calories: number;
    proteins: number;
    fats: number;
    carbs: number;
  };
  steps: GeneratedRecipeStep[];
};

export type GeneratedRecipesResponse = {
  recipes: GeneratedRecipe[];
};
