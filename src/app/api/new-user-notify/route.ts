import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { newUserSignupEmail } from "@/lib/email/templates/newUserSignup";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";

export const runtime = "nodejs";

// Notifies every platform admin when a new user registers. Details + admin emails
// come from a SECURITY DEFINER RPC keyed by the new user's id and gated to fresh
// signups (last hour), so it works for the anonymous post-signup trigger without
// exposing arbitrary users' PII or the admin email list.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_new_user_for_admin_notify", { p_user_id: userId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const row = data as {
    first_name: string; last_name: string; email: string;
    phone: string | null; city: string | null; state: string | null;
    role: string | null; created_at: string; admin_emails: string[] | null;
  } | null;
  if (!row) return NextResponse.json({ ok: true, skipped: "not-found" });

  const admins = (row.admin_emails ?? []).filter(Boolean);
  if (admins.length === 0) return NextResponse.json({ ok: true, sent: 0, note: "no admins" });

  const { subject, html, text } = newUserSignupEmail({
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    state: row.state,
    role: row.role,
    registeredAt: new Date(row.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
  });

  let sent = 0;
  for (const to of admins) {
    const { id: providerId, error: sendError } = await sendEmail({ to, subject, html, text, type: "new_user_admin_notification" });
    await recordEmailLog(supabase, {
      userId: null,
      toEmail: to,
      type: "new_user_admin_notification",
      subject,
      status: sendError ? "failed" : "sent",
      trigger: "automatic",
      providerId,
      error: sendError,
    });
    if (!sendError) sent++;
  }

  return NextResponse.json({ ok: true, sent, total: admins.length });
}
