import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { otpMatches } from "@/lib/auth-otp";
import { getLockout, recordFailedAttempt, clearLockout } from "@/lib/auth-lockout";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;

// Verifies a 6-digit email code and establishes the session. Gates on our 30-minute
// window + attempt limit (admin client), then redeems the native OTP with verifyOtp
// on the cookie-bound server client so the auth cookies are set, and claims any guest
// orders / org invites for the freshly signed-in user.
export async function POST(request: Request) {
  if (!serviceRoleConfigured) {
    return NextResponse.json({ error: "Authentication isn't configured on the server." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const code = String(body.code ?? "").replace(/\D/g, "").slice(0, 6);
  const purpose = body.purpose === "signup" ? "signup" : "login";
  if (!email || code.length !== 6) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Account lockout: refuse all attempts while locked (after repeated failures).
  const lock = await getLockout(admin, email);
  if (lock.locked) {
    return NextResponse.json({ error: `Too many incorrect attempts. Your account is locked for security — try again in about ${lock.minutesLeft} minute${lock.minutesLeft === 1 ? "" : "s"}.` }, { status: 429 });
  }

  // Latest live (unconsumed, unexpired) request for this email+purpose.
  const { data: rows } = await admin
    .from("auth_otp_requests")
    .select("id, expires_at, attempts, consumed_at, code_hash")
    .eq("email", email)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1);
  const req = rows?.[0] as { id: string; expires_at: string; attempts: number; consumed_at: string | null; code_hash: string | null } | undefined;

  if (!req || new Date(req.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "That code has expired. Request a new one." }, { status: 400 });
  }
  if (req.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many incorrect attempts. Request a new code." }, { status: 429 });
  }

  // Check OUR code (HMAC, timing-safe). Wrong code → count an attempt, both on
  // this code (expiry guard) and against the per-email lockout.
  if (!otpMatches(email, purpose, code, req.code_hash)) {
    await admin.from("auth_otp_requests").update({ attempts: req.attempts + 1 }).eq("id", req.id);
    const locked = await recordFailedAttempt(admin, email);
    if (locked.locked) {
      return NextResponse.json({ error: `Too many incorrect attempts. Your account is locked for security — try again in about ${locked.minutesLeft} minutes.` }, { status: 429 });
    }
    return NextResponse.json({ error: "That code is incorrect. Please check and try again." }, { status: 400 });
  }

  // Code is correct → clear any failure count, burn the code, then mint a session.
  // Mint a fresh native token_hash via the admin API and redeem it on the
  // cookie-bound server client so the auth cookies are written (and an
  // unconfirmed signup gets confirmed).
  await clearLockout(admin, email);
  await admin.from("auth_otp_requests").update({ consumed_at: new Date().toISOString() }).eq("id", req.id);

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkErr || !tokenHash) {
    return NextResponse.json({ error: "Could not complete sign-in. Please request a new code." }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (verifyErr || !verifyData?.user) {
    return NextResponse.json({ error: "Could not complete sign-in. Please request a new code." }, { status: 500 });
  }

  // Now authenticated as this user — attach any team invites + guest orders.
  try { await supabase.rpc("claim_org_invitations"); } catch { /* organizer layout retries */ }
  try { await supabase.rpc("claim_my_guest_orders"); } catch { /* non-blocking */ }

  const userId = verifyData.user.id;
  const { data: profile } = await supabase.from("profiles").select("role, first_name, last_name").eq("id", userId).maybeSingle();
  const role = profile?.role ?? "user";

  return NextResponse.json({
    ok: true,
    userId,
    role,
    isNewUser: purpose === "signup",
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    email,
  });
}
