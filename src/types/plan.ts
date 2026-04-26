import type { Plan } from "@prisma/client";

export type PlanFeature =
  | "imagesEnabled"
  | "pdfExport"
  | "cookbookExport"
  | "shoppingList"
  | "weeklyPlanner"
  | "mealPlanner"
  | "voiceCooking"
  | "fridgePhoto"
  | "substitutions"
  | "prioritySupport";

export type PublicPlan = Pick<
  Plan,
  | "id"
  | "slug"
  | "name"
  | "description"
  | "priceCents"
  | "currency"
  | "interval"
  | "recipesPerMonth"
  | "imagesEnabled"
  | "imageQuality"
  | "pdfExport"
  | "shoppingList"
  | "weeklyPlanner"
  | "prioritySupport"
  | "sortOrder"
>;
