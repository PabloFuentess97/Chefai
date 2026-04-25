import { z } from "zod";

// ---------- Auth ----------

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Introduce un email válido");

export const passwordSchema = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres")
  .regex(/[a-zA-Z]/, "Debe contener al menos una letra")
  .regex(/[0-9]/, "Debe contener al menos un número");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1, "Introduce tu nombre").max(80).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Introduce tu contraseña"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(8),
  password: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "La nueva contraseña debe ser diferente a la actual",
  });

// ---------- Recipes ----------

export const generateRecipesInput = z.object({
  ingredients: z
    .array(z.string().trim().min(1).max(60))
    .min(1, "Añade al menos un ingrediente")
    .max(30, "Máximo 30 ingredientes"),
  forbidden: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  unwanted: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  servings: z.coerce.number().int().min(1).max(20),
  cuisine: z.string().trim().max(40).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  mealType: z
    .enum(["breakfast", "lunch", "snack", "dinner"])
    .optional(),
  goal: z
    .enum(["deficit", "maintain", "volume", "definition", "muscle"])
    .optional(),
});

export type GenerateRecipesInput = z.infer<typeof generateRecipesInput>;

// ---------- Profile ----------

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  preferredGoal: z
    .enum(["deficit", "maintain", "volume", "definition", "muscle"])
    .optional()
    .nullable(),
});

// ---------- Admin ----------

export const upsertPlanSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  priceCents: z.coerce.number().int().min(0),
  currency: z.string().length(3).default("EUR"),
  interval: z.enum(["MONTH", "YEAR"]).default("MONTH"),
  recipesPerMonth: z.coerce.number().int().min(-1),
  imagesEnabled: z.coerce.boolean(),
  imageQuality: z.enum(["low", "standard", "hd"]).default("low"),
  pdfExport: z.coerce.boolean(),
  shoppingList: z.coerce.boolean(),
  weeklyPlanner: z.coerce.boolean(),
  prioritySupport: z.coerce.boolean(),
  stripePriceId: z.string().trim().optional().nullable(),
  paypalPlanId: z.string().trim().optional().nullable(),
  isActive: z.coerce.boolean().default(true),
  isPublic: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export const updateSettingsSchema = z.object({
  brandName: z.string().trim().min(1).max(80),
  brandTagline: z.string().trim().max(160).optional().nullable(),
  brandLogoUrl: z.string().trim().optional().nullable(),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color HEX inválido (ej #16a34a)"),
  supportEmail: emailSchema,
  termsUrl: z.string().trim().optional().nullable(),
  privacyUrl: z.string().trim().optional().nullable(),
});

export const setUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["USER", "ADMIN"]),
});
