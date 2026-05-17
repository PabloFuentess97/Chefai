import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import crypto from "node:crypto";
import { Role } from "@prisma/client";

import { env } from "@/env";
import { prisma } from "./db";
import type { SessionUser } from "@/types/session";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);
const TTL_DAYS = env.SESSION_TTL_DAYS;
// Sliding-window: bump the session's expiresAt forward each time we
// observe activity within RENEW_WINDOW_DAYS of expiry. Caps an idle
// session at 7 days while keeping active users logged in indefinitely.
const RENEW_WINDOW_DAYS = 7;

// Cookie Secure flag depends on whether the app is served over HTTPS,
// not on NODE_ENV. This lets us run prod build over plain http://IP:3000.
// Read directly from process.env so it's safe during build with SKIP_ENV_VALIDATION.
const COOKIE_SECURE = (process.env.APP_URL ?? "").startsWith("https://");

// __Host- prefix forces Secure + Path=/ + no Domain — defeats subdomain
// cookie injection. Only valid over HTTPS, so we keep the legacy name on
// HTTP (local dev). Must mirror the same logic in src/middleware.ts.
const COOKIE_NAME = COOKIE_SECURE
  ? "__Host-" + env.SESSION_COOKIE_NAME
  : env.SESSION_COOKIE_NAME;

export type JwtPayload = {
  sub: string;
  jti: string;
  role: Role;
};

function hashToken(jti: string): string {
  return crypto.createHash("sha256").update(jti).digest("hex");
}

export async function signSession(
  userId: string,
  role: Role,
  meta?: { userAgent?: string | null; ip?: string | null }
): Promise<{ token: string; expiresAt: Date }> {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86400_000);

  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(SECRET);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(jti),
      userAgent: meta?.userAgent ?? null,
      ip: meta?.ip ?? null,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    // __Host- prefix mandates Secure=true. On HTTP local dev we use the
    // unprefixed name and let Secure follow COOKIE_SECURE (false → cookie
    // works over http://localhost).
    secure: COOKIE_SECURE,
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    expires: new Date(0),
    path: "/",
  });
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (
      typeof payload.sub !== "string" ||
      typeof payload.jti !== "string" ||
      (payload.role !== "USER" && payload.role !== "ADMIN")
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      jti: payload.jti,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(payload.jti) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  // Sliding-window renewal: if the session is within RENEW_WINDOW_DAYS of
  // expiry, push expiresAt forward. Active users stay logged in, idle ones
  // (no requests for RENEW_WINDOW_DAYS) drop off automatically. Best-effort:
  // a DB failure on renewal must not lock the user out of the request.
  const now = Date.now();
  const renewThresholdMs = RENEW_WINDOW_DAYS * 86400_000;
  if (session.expiresAt.getTime() - now < renewThresholdMs) {
    const newExpiry = new Date(now + TTL_DAYS * 86400_000);
    try {
      await prisma.session.update({
        where: { id: session.id },
        data: { expiresAt: newExpiry },
      });
    } catch {
      // ignore — the user is still authenticated for this request
    }
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    emailVerifiedAt: session.user.emailVerifiedAt,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== Role.ADMIN) redirect("/dashboard");
  return session;
}

/**
 * Returns a SessionUser only if their email is verified. Use this on
 * resource-consuming actions (recipe gen, planner gen, vision OCR, etc.)
 * to block unverified accounts from burning quota and abusing the IA budget.
 *
 * Does NOT redirect — the caller decides how to react (typically: return
 * a typed error so the UI can show a "verifica tu email" prompt).
 */
export function isEmailVerified(session: SessionUser): boolean {
  return Boolean(session.emailVerifiedAt);
}

export async function logoutSession() {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      await prisma.session
        .deleteMany({ where: { tokenHash: hashToken(payload.jti) } })
        .catch(() => undefined);
    }
  }
  await clearSessionCookie();
}

export async function logoutAllSessionsForUser(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function getRequestMeta() {
  const h = await headers();
  const userAgent = h.get("user-agent");
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;
  return { userAgent, ip };
}
