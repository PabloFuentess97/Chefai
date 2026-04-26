import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_URL: z.string().url(),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    SESSION_COOKIE_NAME: z.string().default("session"),
    SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),

    BRAND_NAME: z.string().default("ChefAI"),
    SUPPORT_EMAIL: z.string().email().default("hola@chefai.app"),

    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().min(8).optional(),

    OPENAI_API_KEY: z.string().min(1),
    OPENAI_TEXT_MODEL: z.string().default("gpt-4o-mini"),
    OPENAI_IMAGE_MODEL: z.string().default("gpt-image-1"),

    // Provider switches: choose where text generation and image generation
    // are routed. OpenAI is always the default, fully backward compatible.
    TEXT_PROVIDER: z.enum(["openai", "gemini"]).default("openai"),
    IMAGE_PROVIDER: z.enum(["openai", "fal"]).default("openai"),

    GEMINI_API_KEY: z.string().optional(),
    GEMINI_TEXT_MODEL: z.string().default("gemini-2.0-flash"),
    FAL_KEY: z.string().optional(),
    FAL_IMAGE_MODEL: z.string().default("fal-ai/flux/dev"),

    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    PAYPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),
    PAYPAL_CLIENT_ID: z.string().optional(),
    PAYPAL_CLIENT_SECRET: z.string().optional(),
    PAYPAL_WEBHOOK_ID: z.string().optional(),

    EMAIL_PROVIDER: z.enum(["console", "resend", "smtp"]).default("console"),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("ChefAI <hola@chefai.app>"),

    UPLOADS_DIR: z.string().default("./uploads"),

    REDIS_URL: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    NEXT_PUBLIC_PAYPAL_CLIENT_ID: z.string().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    APP_URL: process.env.APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
    SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS,

    BRAND_NAME: process.env.BRAND_NAME,
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,

    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,

    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_TEXT_MODEL: process.env.OPENAI_TEXT_MODEL,
    OPENAI_IMAGE_MODEL: process.env.OPENAI_IMAGE_MODEL,

    TEXT_PROVIDER: process.env.TEXT_PROVIDER,
    IMAGE_PROVIDER: process.env.IMAGE_PROVIDER,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_TEXT_MODEL: process.env.GEMINI_TEXT_MODEL,
    FAL_KEY: process.env.FAL_KEY,
    FAL_IMAGE_MODEL: process.env.FAL_IMAGE_MODEL,

    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

    PAYPAL_ENV: process.env.PAYPAL_ENV,
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
    PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID,

    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,

    UPLOADS_DIR: process.env.UPLOADS_DIR,

    REDIS_URL: process.env.REDIS_URL,

    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_PAYPAL_CLIENT_ID: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
  },
  skipValidation:
    !!process.env.SKIP_ENV_VALIDATION ||
    process.env.npm_lifecycle_event === "lint",
  emptyStringAsUndefined: true,
});
