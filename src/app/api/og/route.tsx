import { ImageResponse } from "next/og";
import { getBranding } from "@/lib/branding";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? undefined;

  const branding = await getBranding();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 80,
          fontFamily: "sans-serif",
          background: `linear-gradient(135deg, ${branding.color} 0%, #0a0a0a 100%)`,
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 700, opacity: 0.9 }}>
          {branding.name}
        </div>
        <div
          style={{
            marginTop: "auto",
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          {title ?? branding.tagline}
        </div>
        <div style={{ marginTop: 24, fontSize: 24, opacity: 0.85 }}>
          Recetas con IA en segundos
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
