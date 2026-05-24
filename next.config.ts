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

// Security headers applied by Next.js directly (not by an external reverse
// proxy). Works the same behind Traefik/Coolify, nginx, Caddy, or no proxy.
// Mirror of what the legacy docker/nginx.conf used to inject.
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    // 2 years, includeSubDomains, preload. Browsers won't downgrade to HTTP
    // after the first visit.
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(self), microphone=(self), geolocation=(), payment=(self)",
  },
  {
    key: "Content-Security-Policy",
    // 'unsafe-inline' on script-src is required by Next.js's bootstrap
    // and RSC payload inlining. Everything else is locked down.
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.paypal.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "frame-src https://js.stripe.com https://www.paypal.com https://hooks.stripe.com",
      "connect-src 'self' https://api.stripe.com https://api-m.paypal.com https://api-m.sandbox.paypal.com https://api.resend.com",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: allowedImageHosts,
  },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
  async headers() {
    return [
      {
        // Apply to every route. Static assets get a slightly different
        // treatment via _next/static cache rules but the security headers
        // still apply.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
