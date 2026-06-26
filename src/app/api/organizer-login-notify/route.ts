import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { organizerLoginEmail } from "@/lib/email/templates/organizerLogin";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";

export const runtime = "nodejs";

// Alerts every platform admin when an organizer signs in. Details + admin emails
// come from a SECURITY DEFINER RPC gated to organizers with a login recorded in
// the last 5 minutes — so it works right after the login without exposing the
// admin email list or arbitrary users' PII.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_organizer_login_for_admin_notify", { p_user_id: userId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const row = data as {
    first_name: string | null; last_name: string | null; email: string;
    phone: string | null; role: string | null;
    last_login_at: string | null; login_count_30d: number | null;
    orgs: string[] | null; admin_emails: string[] | null;
  } | null;
  // Not an organizer, no recent login, or not found → nothing to do.
  if (!row) return NextResponse.json({ ok: true, skipped: "not-eligible" });

  const admins = (row.admin_emails ?? []).filter(Boolean);
  if (admins.length === 0) return NextResponse.json({ ok: true, sent: 0, note: "no admins" });

  const { subject, html, text } = organizerLoginEmail({
    userId,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    orgs: row.orgs,
    loginCount30d: row.login_count_30d,
    signedInAt: new Date(row.last_login_at ?? Date.now()).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
  });

  let sent = 0;
  for (const to of admins) {
    const { id: providerId, error: sendError } = await sendEmail({ to, subject, html, text, type: "organizer_login_admin_notification" });
    await recordEmailLog(supabase, {
      userId: null,
      toEmail: to,
      type: "organizer_login_admin_notification",
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
