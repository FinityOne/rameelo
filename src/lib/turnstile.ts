// Cloudflare Turnstile — free, unlimited, privacy-friendly human verification
// (no tracking cookies; GDPR/compliance-friendly). Two keys, both free from the
// Cloudflare dashboard:
//   • NEXT_PUBLIC_TURNSTILE_SITE_KEY — public, rendered in the widget
//   • TURNSTILE_SECRET_KEY          — server-only, used to verify the token
// When either is missing the check is DISABLED (verifyTurnstile returns true and
// the widget renders nothing), so auth keeps working until the keys are added.

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

/** True only when BOTH keys are configured — i.e. the human check is enforced. */
export const turnstileEnabled = !!(process.env.TURNSTILE_SECRET_KEY && TURNSTILE_SITE_KEY);

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Validate a Turnstile token server-side. Returns:
 *  • true  when the check is disabled (no secret configured) — graceful no-op
 *  • true  when Cloudflare confirms the token is a real human
 *  • false when the token is missing or Cloudflare rejects it
 * On a network error we fail OPEN (return true) so a brief Cloudflare outage
 * can't lock every real user out of signing in.
 */
export async function verifyTurnstile(token: string | null | undefined, ip?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;            // not configured → skip
  if (!token) return false;            // configured but no token → reject

  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    if (ip) form.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, { method: "POST", body: form });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return true; // network error → fail open (availability over strictness)
  }
}
