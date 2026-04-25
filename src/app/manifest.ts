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
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
