import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { getBranding } from "@/lib/branding";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: {
      default: `${branding.name} — ${branding.tagline}`,
      template: `%s · ${branding.name}`,
    },
    description: branding.tagline,
    metadataBase: process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL)
      : undefined,
    applicationName: branding.name,
    appleWebApp: {
      capable: true,
      title: branding.name,
      statusBarStyle: "default",
    },
    formatDetection: {
      telephone: false,
    },
    openGraph: {
      title: branding.name,
      description: branding.tagline,
      type: "website",
    },
    icons: {
      icon: "/favicon.ico",
      apple: branding.logoUrl,
    },
    manifest: "/manifest.webmanifest",
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
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ "--brand": branding.color } as React.CSSProperties}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground overscroll-none">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
