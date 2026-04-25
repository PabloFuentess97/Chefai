import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { getBranding } from "@/lib/branding";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsent } from "@/components/shared/cookie-consent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://chefai.fit";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  const title = `${branding.name} — Recetas con IA según tus ingredientes y objetivo`;
  const description =
    "Genera recetas personalizadas en segundos con IA. Indica los ingredientes que tienes, alergias y tu objetivo (déficit, volumen, definición) y obtén platos completos con foto, valores nutricionales y pasos claros. En español.";

  return {
    title: {
      default: title,
      template: `%s · ${branding.name}`,
    },
    description,
    metadataBase: new URL(APP_URL),
    applicationName: branding.name,
    keywords: [
      "recetas con ia",
      "recetas personalizadas",
      "generador de recetas",
      "recetas saludables",
      "déficit calórico",
      "ganar masa muscular",
      "definición",
      "recetas con ingredientes que tengo",
      "ai cocina",
      "chefai",
      "recetario personal",
      "macros por receta",
    ],
    authors: [{ name: branding.name, url: APP_URL }],
    creator: branding.name,
    publisher: branding.name,
    appleWebApp: {
      capable: true,
      title: branding.name,
      statusBarStyle: "default",
    },
    formatDetection: {
      telephone: false,
      address: false,
      email: false,
    },
    openGraph: {
      title,
      description,
      url: APP_URL,
      siteName: branding.name,
      type: "website",
      locale: "es_ES",
      images: [
        {
          url: `${APP_URL}/api/og`,
          width: 1200,
          height: 630,
          alt: branding.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${APP_URL}/api/og`],
    },
    alternates: {
      canonical: APP_URL,
      languages: {
        "es-ES": APP_URL,
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    // icons are auto-generated from app/icon.tsx and app/apple-icon.tsx
    manifest: "/manifest.webmanifest",
    category: "food",
  };
}

export async function generateViewport(): Promise<Viewport> {
  const branding = await getBranding();
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    themeColor: branding.color,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getBranding();
  return (
    <html
      lang="es-ES"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ "--brand": branding.color } as React.CSSProperties}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground overscroll-none">
        {children}
        <Toaster richColors position="top-center" />
        <CookieConsent />
      </body>
    </html>
  );
}
