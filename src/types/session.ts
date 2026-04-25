import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  emailVerifiedAt: Date | null;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: string; message: string; field?: string };
    };
