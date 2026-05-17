import type { NextConfig } from "next";

// Allow-list for Next.js Image optimizer. Wildcards like "**" let the
// server fetch from arbitrary hosts, opening SSRF against internal
// services. Keep this list tight and add hosts only when needed.
const allowedImageHosts: { protocol: "http" | "https"; hostname: string }[] = [
  { protocol: "https", hostname: "chefai.fit" },
  { protocol: "https", hostname: "www.chefai.fit" },
  // Provider domains used for hero images we surface in the UI
  { protocol: "https", hostname: "fal.media" },
  { protocol: "https", hostname: "v3.fal.media" },
  { protocol: "https", hostname: "oaidalleapiprodscus.blob.core.windows.net" },
  // Local dev — never reached in production
  { protocol: "http", hostname: "localhost" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: allowedImageHosts,
  },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
