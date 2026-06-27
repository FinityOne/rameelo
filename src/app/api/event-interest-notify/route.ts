import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { eventInterestNotificationEmail } from "@/lib/email/templates/eventInterestNotification";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import { getAdminRecipients } from "@/lib/email/recipients";

export const runtime = "nodejs";

function fmtDate(d: string | null): string {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

// Notifies every platform admin when someone submits the interest ("notify me")
// form on an event that isn't selling tickets on Rameelo yet — so admins can see
// which not-yet-live events are getting traction. Details + admin emails come from
// a SECURITY DEFINER RPC keyed by the interest id and gated to fresh rows, so it
// works for anonymous submitters and can't be replayed. Best-effort: never blocks
// the visitor's confirmation.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const interestId = typeof body.interestId === "string" ? body.interestId : "";
  if (!interestId) return NextResponse.json({ error: "Missing interestId" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_event_interest_for_notify", { p_interest_id: interestId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const row = data as {
    name: string; email: string; phone: string | null; qty_interested: number | null;
    city: string | null; message: string | null; created_at: string;
    event_id: string; event_title: string; event_start_date: string | null;
    event_city: string | null; event_state: string | null; event_venue: string | null;
    interest_count: number | null; admin_emails: string[] | null;
  } | null;

  if (!row) return NextResponse.json({ ok: true, skipped: "not-found" });

  const admins = await getAdminRecipients(supabase, "event-interest", row.admin_emails ?? []);
  if (admins.length === 0) return NextResponse.json({ ok: true, sent: 0, note: "no admins" });

  const eventWhere = [row.event_venue, row.event_city, row.event_state].filter(Boolean).join(", ");
  const { subject, html, text } = eventInterestNotificationEmail({
    name: row.name,
    email: row.email,
    phone: row.phone,
    qtyInterested: row.qty_interested,
    city: row.city,
    message: row.message,
    eventTitle: row.event_title,
    eventWhen: fmtDate(row.event_start_date),
    eventWhere,
    eventId: row.event_id,
    interestCount: row.interest_count,
    submittedAt: new Date(row.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
  });

  let sent = 0;
  for (const to of admins) {
    const { id: providerId, error: sendError } = await sendEmail({ to, subject, html, text, type: "event_interest" });
    await recordEmailLog(supabase, {
      userId: null,
      toEmail: to,
      type: "event_interest",
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
