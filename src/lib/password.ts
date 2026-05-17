import bcrypt from "bcryptjs";

// OWASP 2026 recommendation for bcrypt cost factor on modern hardware.
// Each +1 doubles the time to compute. 14 keeps verify times under ~250 ms
// on a typical VPS while putting offline cracking out of reach for years.
const COST = 14;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Inspect a bcrypt hash and decide if it should be re-hashed because its
 * stored cost factor is below the current minimum. Used after a successful
 * login: if true, the login flow re-hashes the password and persists it,
 * transparently upgrading old accounts.
 */
export function isRehashNeeded(hash: string): boolean {
  // bcrypt hash format: $2[a|b|y]$<cost>$<salt+hash>
  const m = /^\$2[aby]\$(\d{2})\$/.exec(hash);
  if (!m) return true; // unknown format → re-hash to be safe
  const storedCost = parseInt(m[1]!, 10);
  return storedCost < COST;
}
