import type { Plan } from "@prisma/client";

export type PlanFeature =
  | "imagesEnabled"
  | "pdfExport"
  | "shoppingList"
  | "weeklyPlanner"
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
