import { cache } from "react";
import { prisma } from "./db";
import { env } from "@/env";

export type Branding = {
  name: string;
  tagline: string;
  logoUrl: string;
  color: string;
  supportEmail: string;
  termsUrl: string;
  privacyUrl: string;
};

const FALLBACK: Branding = {
  name: "ChefAI",
  tagline: "Recetas con IA en segundos",
  logoUrl: "/logo.svg",
  color: "#16a34a",
  supportEmail: "hola@chefai.app",
  termsUrl: "/terms",
  privacyUrl: "/privacy",
};

export const getBranding = cache(async (): Promise<Branding> => {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    return {
      name: settings?.brandName ?? env.BRAND_NAME ?? FALLBACK.name,
      tagline: settings?.brandTagline ?? FALLBACK.tagline,
      logoUrl: settings?.brandLogoUrl ?? FALLBACK.logoUrl,
      color: settings?.brandColor ?? FALLBACK.color,
      supportEmail:
        settings?.supportEmail ?? env.SUPPORT_EMAIL ?? FALLBACK.supportEmail,
      termsUrl: settings?.termsUrl ?? FALLBACK.termsUrl,
      privacyUrl: settings?.privacyUrl ?? FALLBACK.privacyUrl,
    };
  } catch {
    return {
      ...FALLBACK,
      name: env.BRAND_NAME ?? FALLBACK.name,
      supportEmail: env.SUPPORT_EMAIL ?? FALLBACK.supportEmail,
    };
  }
});
