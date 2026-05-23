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
  // Reject trivially short passwords at the boundary to avoid wasting
  // bcrypt cycles on bot brute-force traffic. Real users have ≥10 chars
  // per the register schema, so 8 is a safe lower bound that still
  // accepts any password that was actually accepted at signup time.
  password: z.string().min(8, "Introduce tu contraseña"),
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

export const applianceEnum = z.enum([
  "air-fryer",
  "thermomix",
  "monsieur-cuisine",
  "mambo",
  "olla-rapida",
  "olla-lenta",
  "microondas",
  "vaporera",
  "wok",
  "plancha",
  "robot-generico",
]);

export const dietaryProfileEnum = z.enum([
  "omnivore",
  "vegetarian",
  "vegan",
  "pescatarian",
  "keto",
  "lowcarb",
  "glutenfree",
  "lactosefree",
  "paleo",
  "mediterranean",
]);

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
  dietaryProfile: dietaryProfileEnum.optional(),
  appliances: z.array(applianceEnum).max(10).default([]),
});

export type GenerateRecipesInput = z.infer<typeof generateRecipesInput>;

// ---------- Manual recipe edit ----------
//
// Accepted by updateRecipeAction. Lets the owner edit basic info,
// ingredients (full replace) and steps (full replace). Macro fields are
// intentionally NOT in this schema — manual edits don't try to recalc
// nutrition, that's only meaningful when the IA generates the recipe.

export const recipeIngredientEditSchema = z.object({
  name: z.string().trim().min(1, "Nombre obligatorio").max(80),
  quantity: z.coerce.number().min(0).max(10000),
  unit: z.string().trim().max(20),
  optional: z.coerce.boolean().default(false),
});

export const recipeStepEditSchema = z.object({
  content: z.string().trim().min(1, "El paso no puede estar vacío").max(2000),
  durationMin: z
    .union([z.coerce.number().int().min(0).max(600), z.null(), z.literal("")])
    .transform((v) => (v === "" || v === null ? null : v))
    .nullable()
    .optional(),
});

export const updateRecipeSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, "El título es obligatorio").max(120),
  description: z
    .union([z.string().trim().max(500), z.null(), z.literal("")])
    .transform((v) => (v ? v : null))
    .nullable()
    .optional(),
  cuisine: z
    .union([z.string().trim().max(40), z.null(), z.literal("")])
    .transform((v) => (v ? v : null))
    .nullable()
    .optional(),
  difficulty: z
    .union([z.enum(["easy", "medium", "hard"]), z.null(), z.literal("")])
    .transform((v) => (v === "" || v === null ? null : v))
    .nullable()
    .optional(),
  prepMinutes: z.coerce.number().int().min(0).max(600),
  cookMinutes: z.coerce.number().int().min(0).max(600),
  servings: z.coerce.number().int().min(1).max(20),
  ingredients: z
    .array(recipeIngredientEditSchema)
    .min(1, "Añade al menos un ingrediente")
    .max(50, "Máximo 50 ingredientes"),
  steps: z
    .array(recipeStepEditSchema)
    .min(1, "Añade al menos un paso")
    .max(50, "Máximo 50 pasos"),
});

export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;

// ---------- Profile ----------

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  preferredGoal: z
    .enum(["deficit", "maintain", "volume", "definition", "muscle"])
    .optional()
    .nullable(),
  dietaryProfile: dietaryProfileEnum.optional().nullable(),
  cookingAppliances: z.array(applianceEnum).max(10).default([]),
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
  cookbookExport: z.coerce.boolean(),
  shoppingList: z.coerce.boolean(),
  weeklyPlanner: z.coerce.boolean(),
  mealPlanner: z.coerce.boolean(),
  voiceCooking: z.coerce.boolean(),
  fridgePhoto: z.coerce.boolean(),
  substitutions: z.coerce.boolean(),
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

export const updateUserNameSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
});

export const setUserPlanSchema = z.object({
  userId: z.string().min(1),
  planSlug: z.string().trim().min(1).max(40),
  periodMonths: z.coerce.number().int().min(1).max(120).default(12),
});

// ---------- Campaigns ----------

export const upsertCampaignSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  templateKey: z.string().trim().max(40).optional().nullable(),
  accentColor: z
    .union([
      z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color HEX inválido"),
      z.literal(""),
    ])
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  heroBadge: z.string().trim().max(40).optional().nullable(),
  heroTitle: z.string().trim().max(120).optional().nullable(),
  heroSubtitle: z.string().trim().max(300).optional().nullable(),
  heroImageUrl: z.string().trim().max(500).optional().nullable(),
  ctaLabel: z.string().trim().max(60).optional().nullable(),
  bulletList: z.string().trim().max(500).optional().nullable(),
  customHtml: z.string().trim().max(20_000).optional().nullable(),
  trialDays: z.coerce.number().int().min(1).max(90),
  trialRecipesPerDay: z.coerce.number().int().min(1).max(50),
  targetPlanId: z.string().min(1, "Elige el plan objetivo"),
  isActive: z.coerce.boolean().default(true),
  expiresAt: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      if (!v) return null;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }),
});

export const signupWithCampaignSchema = registerSchema.extend({
  campaignSlug: z.string().trim().min(1).max(40),
  stripePaymentMethodId: z.string().trim().min(1, "Falta el método de pago"),
});

// ---------- Email campaigns ----------

// ---------- Blog ----------

export const generateBlogPostInput = z.object({
  topic: z
    .string()
    .trim()
    .min(8, "Describe el tema con un poco más de detalle")
    .max(200),
  focusKeyword: z.string().trim().min(2).max(80).optional().nullable(),
  postType: z
    .enum(["listicle", "guide", "comparison", "recipe-roundup", "explainer"])
    .default("listicle"),
  targetAudience: z.string().trim().max(120).optional().nullable(),
  categorySlug: z.string().trim().max(40).optional().nullable(),
  generateImage: z.coerce.boolean().default(true),
});

export const upsertBlogPostSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  title: z.string().trim().min(3).max(200),
  subtitle: z.string().trim().max(300).optional().nullable(),
  excerpt: z.string().trim().max(500).optional().nullable(),
  content: z.string().trim().min(50, "El contenido es demasiado corto"),
  heroImageUrl: z.string().trim().max(500).optional().nullable(),
  authorName: z.string().trim().max(80).optional().nullable(),
  metaTitle: z.string().trim().max(70).optional().nullable(),
  metaDescription: z.string().trim().max(170).optional().nullable(),
  focusKeyword: z.string().trim().max(80).optional().nullable(),
  ogImageUrl: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  scheduledFor: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      if (!v) return null;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }),
  categoryId: z.string().trim().optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
});

export const upsertBlogCategorySchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(300).optional().nullable(),
  color: z
    .union([
      z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color HEX inválido"),
      z.literal(""),
    ])
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  sortOrder: z.coerce.number().int().default(0),
});

// Defense-in-depth: strip HTML tags from text fields that will be
// interpolated into email HTML. The renderer already escapes on output,
// but stripping here also protects rendering paths we might add later
// (e.g. plain-text fallbacks, preview cards, the admin UI itself).
const stripHtml = (s: string | null | undefined) =>
  (s ?? "").replace(/<\/?[^>]+>/g, "");

const safeText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform(stripHtml);

export const upsertEmailCampaignSchema = z.object({
  id: z.string().optional(),
  name: safeText(120).pipe(z.string().min(1)),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v ? stripHtml(v) : v)),
  templateKey: z.string().trim().min(1).max(40),
  accentColor: z
    .union([
      z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color HEX inválido"),
      z.literal(""),
    ])
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  subject: safeText(180).pipe(z.string().min(1, "Falta el asunto")),
  preheader: z
    .string()
    .trim()
    .max(180)
    .optional()
    .nullable()
    .transform((v) => (v ? stripHtml(v) : v)),
  heroBadge: z
    .string()
    .trim()
    .max(60)
    .optional()
    .nullable()
    .transform((v) => (v ? stripHtml(v) : v)),
  heroTitle: z
    .string()
    .trim()
    .max(160)
    .optional()
    .nullable()
    .transform((v) => (v ? stripHtml(v) : v)),
  heroBody: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .nullable()
    .transform((v) => (v ? stripHtml(v) : v)),
  ctaLabel: z
    .string()
    .trim()
    .max(60)
    .optional()
    .nullable()
    .transform((v) => (v ? stripHtml(v) : v)),
  ctaUrl: z.string().trim().max(500).optional().nullable(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  audienceMode: z.enum([
    "ALL_USERS",
    "NEWSLETTER_OPT_IN",
    "PLAN",
    "ACQUISITION_CAMPAIGN",
    "DIETARY_PROFILE",
  ]),
  audiencePlanId: z.string().trim().optional().nullable(),
  audienceAcqCampaignId: z.string().trim().optional().nullable(),
  audienceDietary: z.string().trim().optional().nullable(),
  scheduledFor: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      if (!v) return null;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }),
});
