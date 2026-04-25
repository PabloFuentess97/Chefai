import { ImageResponse } from "next/og";
import { getBranding } from "@/lib/branding";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const branding = await getBranding();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: branding.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 19h12M7 16h10M9 13c-2.5 0-4-2-4-4s1.5-4 4-4c.5 0 1 .1 1.5.3C11 4 12.4 3 14 3c2.2 0 4 1.8 4 4 0 .3 0 .6-.1.9 1.2.5 2.1 1.7 2.1 3.1 0 1.7-1.3 3-3 3"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
