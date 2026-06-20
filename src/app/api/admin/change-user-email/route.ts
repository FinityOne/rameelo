import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Admin-only: rename an account's email. This is the "fix the typo on the actual
// account" path (distinct from re-assigning a single order's buyer_email). It
// updates the canonical identity (Supabase Auth) so the member can log in with the
// new address, mirrors it into profiles, and re-labels every order they own so no
// tickets are orphaned. Emails are globally unique — auth.users enforces this and
// we pre-check for a friendly error.
export async function POST(request: Request) {
  if (!serviceRoleConfigured) {
    return NextResponse.json({ error: "Server isn't configured for this action." }, { status: 503 });
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId ?? "").trim();
  const newEmail = String(body.newEmail ?? "").trim().toLowerCase();

  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (!EMAIL_RE.test(newEmail)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const admin = createAdminClient();

  // Target must exist; no-op guard if unchanged.
  const { data: target } = await admin.from("profiles").select("id, email").eq("id", userId).maybeSingle();
  if (!target) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if ((target.email ?? "").toLowerCase() === newEmail) {
    return NextResponse.json({ error: "That's already this account's email." }, { status: 400 });
  }

  // Uniqueness pre-check — no other account may use this email (case-insensitive).
  // auth.users' unique constraint is the hard backstop; this gives a clean message.
  const { data: clash } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", newEmail)
    .neq("id", userId)
    .maybeSingle();
  if (clash) return NextResponse.json({ error: "An account already uses that email." }, { status: 409 });

  // 1) Canonical identity in Supabase Auth. email_confirm keeps it verified — an
  //    admin is correcting a typo, so we don't bounce the member through re-confirm.
  const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: true,
  });
  if (authErr) {
    const dup = /already|registered|exists/i.test(authErr.message);
    return NextResponse.json(
      { error: dup ? "An account already uses that email." : "Couldn't update the account email." },
      { status: dup ? 409 : 500 },
    );
  }

  // 2) Mirror into profiles.
  const { error: profErr } = await admin.from("profiles").update({ email: newEmail }).eq("id", userId);
  if (profErr) {
    return NextResponse.json({ error: "Account email changed, but the profile copy failed — retry." }, { status: 500 });
  }

  // 3) Re-label every order this member owns so the portal/email-match stays correct
  //    and no tickets are orphaned.
  const { error: ordErr } = await admin.from("orders").update({ buyer_email: newEmail }).eq("user_id", userId);
  if (ordErr) {
    return NextResponse.json({ error: "Email changed, but updating their orders failed — retry." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email: newEmail });
}
