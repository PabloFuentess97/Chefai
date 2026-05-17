import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { env } from "@/env";

// JWT_SECRET is validated as min(32) in src/env.ts — refuse to boot if
// it's missing. Never fall back to an empty secret (would let attackers
// forge tokens with secret="").
const SECRET = new TextEncoder().encode(env.JWT_SECRET);

// __Host- prefix forces Secure + Path=/ + no Domain. Only safe over HTTPS,
// so we keep the legacy name in local dev. Must mirror the same logic in
// src/lib/auth.ts.
const APP_URL = env.APP_URL ?? "";
const USE_HOST_PREFIX = APP_URL.startsWith("https://");
const COOKIE =
  (USE_HOST_PREFIX ? "__Host-" : "") +
  (env.SESSION_COOKIE_NAME ?? "session");

const PROTECTED = [
  /^\/dashboard/,
  /^\/generate/,
  /^\/recipes/,
  /^\/billing/,
  /^\/settings/,
  /^\/admin/,
];
const ADMIN_ONLY = [/^\/admin/];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some((r) => r.test(pathname));
  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (
      ADMIN_ONLY.some((r) => r.test(pathname)) &&
      payload.role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  } catch {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/health|api/og).*)",
  ],
};
