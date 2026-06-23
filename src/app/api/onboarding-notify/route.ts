import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { onboardingSignedEmail } from "@/lib/email/templates/onboardingSigned";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import { EMAIL } from "@/lib/email/theme";

export const runtime = "nodejs";

// Notifies every platform admin when an organizer signs their onboarding
// agreement. Details + admin emails come from a SECURITY DEFINER RPC keyed by
// the onboarding token, gated to freshly-submitted rows — so it works for the
// anonymous submitter and can't be replayed.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_onboarding_for_notify", { p_token: token });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const row = (Array.isArray(data) ? data[0] : data) as {
    org_id: string; org_name: string; agreement_name: string | null;
    agreement_version: string | null; submitted_at: string;
    submitted_by: string | null; contact_name: string | null;
    email: string | null; phone: string | null; website: string | null;
    instagram: string | null; facebook: string | null; description: string | null;
    founded_year: string | null; city: string | null; state: string | null;
    n_events: number; n_documents: number; admin_emails: string[] | null;
  } | null;

  if (!row) return NextResponse.json({ ok: true, skipped: "not-found" });

  const admins = (row.admin_emails ?? []).filter(Boolean);
  if (admins.length === 0) return NextResponse.json({ ok: true, sent: 0, note: "no admins" });

  const { subject, html, text } = onboardingSignedEmail({
    orgName: row.org_name,
    signedBy: row.agreement_name,
    submittedBy: row.submitted_by,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    website: row.website,
    instagram: row.instagram,
    facebook: row.facebook,
    description: row.description,
    foundedYear: row.founded_year,
    city: row.city,
    state: row.state,
    eventsCount: row.n_events ?? 0,
    documentsCount: row.n_documents ?? 0,
    agreementVersion: row.agreement_version,
    signedAt: new Date(row.submitted_at).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }),
    orgUrl: `${EMAIL.site}/admin/organizations/${row.org_id}`,
  });

  let sent = 0;
  for (const to of admins) {
    const { id: providerId, error: sendError } = await sendEmail({ to, subject, html, text });
    await recordEmailLog(supabase, {
      userId: null,
      toEmail: to,
      type: "onboarding_signed",
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
