import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { loginCodeEmail } from "@/lib/email/templates/loginCode";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import { hashOtp } from "@/lib/auth-otp";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const OTP_TTL_MIN = 30;
const RATE_WINDOW_MIN = 10;
const RATE_MAX = 4; // max codes per email per window
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Status = { exists: boolean; confirmed: boolean; user_id: string | null };

// Issues OUR OWN 6-digit email code for passwordless signup/login (Supabase's native
// OTP is 8 digits, so we use our own for a clean 6-digit UX). The code is HMAC-hashed
// and stored with a 30-minute window; the session is minted at verify time. Delivered
// through the branded email system.
export async function POST(request: Request) {
  if (!serviceRoleConfigured) {
    return NextResponse.json({ error: "Authentication isn't configured on the server." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const purpose = body.purpose === "signup" ? "signup" : "login";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Rate limit per email.
  const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();
  const { count } = await admin
    .from("auth_otp_requests")
    .select("*", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);
  if ((count ?? 0) >= RATE_MAX) {
    return NextResponse.json({ error: "Too many codes requested. Please wait a few minutes and try again." }, { status: 429 });
  }

  // Branch on whether the account already exists / is confirmed.
  const { data: statusData, error: statusErr } = await admin.rpc("get_user_auth_status", { p_email: email });
  if (statusErr) return NextResponse.json({ error: "Could not start sign-in. Please try again." }, { status: 500 });
  const status = (statusData ?? { exists: false, confirmed: false, user_id: null }) as Status;

  if (purpose === "login" && !status.exists) {
    return NextResponse.json({ error: "No account found for that email.", code: "no_account" }, { status: 404 });
  }
  if (purpose === "signup" && status.exists && status.confirmed) {
    return NextResponse.json({ error: "An account already exists for that email. Sign in instead.", code: "account_exists" }, { status: 409 });
  }

  // For signup, ensure the (passwordless) user exists with the latest profile data
  // before minting the code. Confirmation happens when they verify the code.
  if (purpose === "signup") {
    const meta = {
      firstName: String(body.firstName ?? "").trim(),
      lastName: String(body.lastName ?? "").trim(),
      phone: String(body.phone ?? "").replace(/\D/g, "").slice(0, 10),
      city: String(body.city ?? "").trim(),
      state: String(body.state ?? "").trim(),
    };
    if (!status.exists) {
      const { error: cErr } = await admin.auth.admin.createUser({ email, email_confirm: false, user_metadata: meta });
      if (cErr) return NextResponse.json({ error: "Could not start sign-up. Please try again." }, { status: 500 });
    } else if (status.user_id) {
      // Abandoned/unconfirmed signup — refresh their details.
      await admin.auth.admin.updateUserById(status.user_id, { user_metadata: meta });
    }
  }

  // Our own 6-digit code (cryptographically random). Stored only as an HMAC; the
  // session itself is minted at verify time, so no Supabase token is persisted.
  const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");

  // Record the request (30-min gate + attempt limiter + hashed code).
  await admin.from("auth_otp_requests").insert({
    email,
    purpose,
    code_hash: hashOtp(email, purpose, otp),
    expires_at: new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString(),
  });

  // Deliver the branded code email.
  const firstName = purpose === "signup" ? String(body.firstName ?? "").trim() : null;
  const { subject, html, text } = loginCodeEmail({ code: otp, purpose, firstName, minutes: OTP_TTL_MIN });
  const { id: providerId, error: sendErr } = await sendEmail({ to: email, subject, html, text, type: "login_code" });
  await recordEmailLog(admin as SupabaseClient, {
    toEmail: email, type: "login_code", subject,
    status: sendErr ? "failed" : "sent", trigger: "automatic", providerId, error: sendErr,
  });
  if (sendErr) return NextResponse.json({ error: "Could not send the code email. Please try again." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
