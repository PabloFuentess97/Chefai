import { ImageResponse } from "next/og";
import { getBranding } from "@/lib/branding";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const branding = await getBranding();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, ${branding.color} 0%, color-mix(in oklab, ${branding.color} 60%, #000) 100%)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}
      >
        <svg
          width="100"
          height="100"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 19h12M7 16h10M9 13c-2.5 0-4-2-4-4s1.5-4 4-4c.5 0 1 .1 1.5.3C11 4 12.4 3 14 3c2.2 0 4 1.8 4 4 0 .3 0 .6-.1.9 1.2.5 2.1 1.7 2.1 3.1 0 1.7-1.3 3-3 3"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div
          style={{
            color: "#ffffff",
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: -0.5,
            marginTop: 2,
          }}
        >
          {branding.name}
        </div>
      </div>
    ),
    { ...size }
  );
}
