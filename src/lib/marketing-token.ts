import { createHmac, timingSafeEqual } from "crypto";

// Stateless one-click unsubscribe token for marketing emails: base64url(email).HMAC.
// Server-only (HMAC keyed by the service-role secret). Lets a recipient opt out
// without an account or a stored token.
function b64url(s: string): string { return Buffer.from(s).toString("base64url"); }
function unb64url(s: string): string { return Buffer.from(s, "base64url").toString("utf8"); }

function sign(email: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHmac("sha256", secret).update(`unsub:${email.toLowerCase()}`).digest("base64url");
}

export function makeUnsubToken(email: string): string {
  return `${b64url(email.toLowerCase())}.${sign(email)}`;
}

export function verifyUnsubToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const email = unb64url(token.slice(0, dot)).toLowerCase();
  const sig = token.slice(dot + 1);
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(email));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return email;
}
