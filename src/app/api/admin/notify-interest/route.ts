import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { interestTicketsLiveEmail } from "@/lib/email/templates/interestTicketsLive";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import { EMAIL } from "@/lib/email/theme";

export const runtime = "nodejs";

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

// Admin-triggered "tickets are live" blast to an event's interest list. Resolves
// recipients (deduped, minus anyone who already bought/was comped) + records the
// blast for the transparent log shown in the Interest tab.
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

  const { data: ev } = await supabase
    .from("events")
    .select("title, artist, start_date, start_time, venue_name, city, state, cover_image_url, selling_on_rameelo")
    .eq("id", eventId)
    .single();
  if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (!ev.selling_on_rameelo) {
    return NextResponse.json({ error: "Turn on ticket sales for this event before notifying interested people." }, { status: 422 });
  }

  const { data: recips, error: recipErr } = await supabase.rpc("get_interest_blast_recipients", { p_event_id: eventId });
  if (recipErr) return NextResponse.json({ error: recipErr.message }, { status: 400 });
  const recipients = (recips ?? []) as { email: string; first_name: string | null; qty_interested: number | null }[];
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No one left to notify — everyone on the interest list has already purchased." }, { status: 422 });
  }

  const eventWhen = `${fmtDate(ev.start_date)}${fmtTime(ev.start_time) ? ` · ${fmtTime(ev.start_time)}` : ""}`;
  const eventWhere = [ev.venue_name, ev.city, ev.state].filter(Boolean).join(", ");
  const buyUrl = `${EMAIL.site}/events/${eventId}`;

  // Personalized per-recipient send (better conversion than one generic blast).
  const results = await Promise.all(recipients.map(async (r) => {
    const { subject, html, text } = interestTicketsLiveEmail({
      recipientFirstName: r.first_name,
      eventTitle: ev.title,
      artistName: ev.artist,
      eventWhen,
      eventWhere,
      bannerUrl: ev.cover_image_url,
      qtyInterested: r.qty_interested,
      buyUrl,
    });
    const { id: providerId, error: sendError } = await sendEmail({ to: r.email, subject, html, text, type: "interest_tickets_live" });
    await recordEmailLog(supabase, {
      toEmail: r.email,
      type: "interest_tickets_live",
      subject,
      status: sendError ? "failed" : "sent",
      trigger: "manual",
      providerId,
      error: sendError,
    });
    return !sendError;
  }));

  const sent = results.filter(Boolean).length;
  // Log the blast for the transparent history (even partial sends are recorded).
  const { data: blast } = await supabase.rpc("record_interest_blast", {
    p_event_id: eventId, p_recipient_count: recipients.length, p_success_count: sent,
  });

  return NextResponse.json({ ok: true, sent, total: recipients.length, blast });
}
