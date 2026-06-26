import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { welcomeEmail } from "@/lib/email/templates/welcome";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";

// Resend SDK + service-role auth.admin both require the Node.js runtime.
export const runtime = "nodejs";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Admin-only: manually add a single member to the platform and auto-send the
// welcome email. Email is the unique key — a case-insensitive match against an
// existing profile is rejected so no duplicate account is ever created. The
// account has no password (like CSV imports); the member signs in via login code.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!serviceRoleConfigured) return NextResponse.json({ error: "User creation isn't configured on the server." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const phone = String(body.phone ?? "").trim();

  if (!firstName) return NextResponse.json({ error: "First name is required." }, { status: 400 });
  if (!lastName) return NextResponse.json({ error: "Last name is required." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  // Authoritative duplicate guard (case-insensitive) — the UI also checks in the
  // background, but never trust the client. Matches the import dedup logic.
  const { data: existing } = await supabase.rpc("find_existing_profiles", { p_emails: [email] });
  if (Array.isArray(existing) && existing.length > 0) {
    return NextResponse.json({ error: "A user with this email already exists.", code: "duplicate" }, { status: 409 });
  }

  const admin = createAdminClient();

  // Create the auth user (no confirmation email — we send our own welcome).
  const { data: cu, error: cErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { firstName, lastName, phone },
  });
  if (cErr || !cu?.user) {
    // The most common failure is a race on the unique email — report it cleanly.
    const dup = (cErr?.message ?? "").toLowerCase().includes("already") || (cErr as { code?: string })?.code === "email_exists";
    return NextResponse.json(
      { error: dup ? "A user with this email already exists." : "Could not create the user.", code: dup ? "duplicate" : undefined },
      { status: dup ? 409 : 500 },
    );
  }
  const id = cu.user.id;

  // Stamp profile fields the signup trigger may leave blank, and mark the source.
  await admin.from("profiles").update({
    source: "manual",
    first_name: firstName,
    last_name: lastName,
    phone: phone || undefined,
  }).eq("id", id);

  // Auto-send the welcome email and log it against the new profile.
  const { subject, html, text } = welcomeEmail({ firstName });
  const { id: providerId, error: emailErr } = await sendEmail({ to: email, subject, html, text });
  await recordEmailLog(supabase, {
    userId: id,
    toEmail: email,
    type: "welcome",
    subject,
    status: emailErr ? "failed" : "sent",
    trigger: "manual",
    providerId,
    error: emailErr,
  });

  return NextResponse.json({ ok: true, userId: id, welcomeSent: !emailErr });
}
