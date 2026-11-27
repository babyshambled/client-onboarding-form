import "server-only";
import { timingSafeEqual } from "crypto";

/** Constant-time check of the x-admin-password header. Fails closed when no password is configured. */
export function adminPasswordOk(given: string | null): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
