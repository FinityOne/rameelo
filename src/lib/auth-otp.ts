import { createHmac, timingSafeEqual } from "crypto";

// HMAC of a one-time code, bound to the email + purpose. Server-only (uses the
// service-role key as the HMAC secret, so a DB-only leak can't brute-force the
// otherwise-tiny 6-digit space offline). Stored in auth_otp_requests.code_hash.
export function hashOtp(email: string, purpose: string, code: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHmac("sha256", secret).update(`${email.toLowerCase()}:${purpose}:${code}`).digest("hex");
}

export function otpMatches(email: string, purpose: string, code: string, hash: string | null): boolean {
  if (!hash) return false;
  const a = Buffer.from(hashOtp(email, purpose, code));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}
