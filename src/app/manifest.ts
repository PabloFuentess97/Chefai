import type { MetadataRoute } from "next";
import { getBranding } from "@/lib/branding";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await getBranding();
  return {
    name: branding.name,
    short_name: branding.name,
    description: branding.tagline,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: branding.color,
    orientation: "portrait",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: branding.logoUrl, sizes: "192x192", type: "image/png" },
      { src: branding.logoUrl, sizes: "512x512", type: "image/png" },
    ],
  };
}
