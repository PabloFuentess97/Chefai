import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "chefai" },
  // Pino's built-in redact path: any field matching these keys gets
  // replaced with "[Redacted]" wherever it appears in the log object,
  // including nested errors. Catches accidental leaks of API keys
  // attached to Error objects by SDKs (Stripe, OpenAI, etc.).
  redact: {
    paths: [
      "*.api_key",
      "*.apiKey",
      "*.authorization",
      "*.Authorization",
      "*.password",
      "*.passwordHash",
      "*.secret",
      "*.token",
      "*.access_token",
      "*.refresh_token",
      "*.client_secret",
      "*.stripeSecret",
      "*.headers.authorization",
      "*.headers.Authorization",
      "*.headers.cookie",
      "*.headers.Cookie",
      "*.cookie",
      "*.config.headers.Authorization",
      "*.config.headers.authorization",
      "*.req.headers.cookie",
      "*.req.headers.authorization",
    ],
    censor: "[Redacted]",
  },
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
        }
      : undefined,
});

/**
 * Defensive serialization of an unknown error for logging. Pino expands
 * Error objects including any enumerable properties — SDKs sometimes
 * stash the raw request (with Authorization header) onto the Error,
 * which would leak credentials into log aggregators.
 *
 * Use as: logger.error({ err: redactError(e), userId }, "thing failed");
 */
export function redactError(err: unknown): {
  name?: string;
  message: string;
  stack?: string;
} {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      // Stack only in dev — useful locally, useless and noisy in prod.
      stack:
        process.env.NODE_ENV === "development" ? err.stack : undefined,
    };
  }
  if (typeof err === "string") return { message: err };
  return { message: "Unknown error" };
}
