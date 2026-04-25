import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
const COOKIE = process.env.SESSION_COOKIE_NAME ?? "session";

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
