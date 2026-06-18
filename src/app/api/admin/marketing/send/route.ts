import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceRoleConfigured } from "@/lib/supabase/admin";
import { marketingBlastEmail } from "@/lib/email/templates/marketingBlast";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import { makeUnsubToken } from "@/lib/marketing-token";
import { EMAIL } from "@/lib/email/theme";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_RECIPIENTS = 2000;
const CONCURRENCY = 12;
const arr = (v: unknown) => Array.isArray(v) ? v.map(String).map(s => s.trim()).filter(Boolean) : [];

function fmtDate(d: string) { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }); }
function fmtTime(t: string | null) {
  if (!t) return ""; const [h, m] = t.split(":"); const hr = parseInt(h, 10);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}
async function pool<T>(items: T[], limit: number, worker: (i: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await worker(items[idx]); }
  }));
}

// Sends a marketing blast to the resolved audience about an optional featured event.
// Per-recipient (branded, personalized, one-click unsubscribe), logged, and recorded.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!serviceRoleConfigured) return NextResponse.json({ error: "Email isn't configured on the server." }, { status: 503 });

  const b = await request.json().catch(() => ({}));
  const subject = String(b.subject ?? "").trim();
  const headline = String(b.headline ?? "").trim() || null;
  const body = String(b.body ?? "").trim() || null;
  const eventId = typeof b.eventId === "string" && b.eventId ? b.eventId : null;
  if (!subject) return NextResponse.json({ error: "A subject line is required." }, { status: 400 });
  if (!body && !eventId) return NextResponse.json({ error: "Add a message or pick an event to feature." }, { status: 400 });

  const filters = {
    p_tags: arr(b.tags),
    p_batch_ids: arr(b.batchIds),
    p_cities: arr(b.cities).map(c => c.toLowerCase()),
    p_states: arr(b.states).map(s => s.toUpperCase()),
    p_attended_event_ids: arr(b.attendedEventIds),
    p_source: typeof b.source === "string" && b.source ? b.source : null,
    p_match_any: b.matchAny === true,
  };

  // Resolve audience via the admin's session.
  const { data: audienceData, error: aErr } = await supabase.rpc("resolve_marketing_audience", filters);
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 400 });
  const recipients = (audienceData ?? []) as { email: string; first_name: string | null }[];
  if (recipients.length === 0) return NextResponse.json({ error: "No recipients match those filters." }, { status: 422 });
  if (recipients.length > MAX_RECIPIENTS) return NextResponse.json({ error: `Audience too large (${recipients.length}). Narrow it to ${MAX_RECIPIENTS} or fewer.` }, { status: 413 });

  // Featured event details (for the card).
  let event: Parameters<typeof marketingBlastEmail>[0]["event"] = null;
  if (eventId) {
    const { data: ev } = await supabase
      .from("events")
      .select("title, start_date, start_time, city, state, venue_name, metro_city, cover_image_url, artists(name), ticket_tiers(price, is_visible)")
      .eq("id", eventId).eq("status", "published").maybeSingle();
    if (ev) {
      const e = ev as unknown as { title: string; start_date: string; start_time: string | null; city: string | null; state: string | null; venue_name: string | null; metro_city: string | null; cover_image_url: string | null; artists: { name: string } | { name: string }[] | null; ticket_tiers: { price: number; is_visible: boolean }[] };
      const artist = Array.isArray(e.artists) ? e.artists[0]?.name : e.artists?.name;
      const prices = (e.ticket_tiers ?? []).filter(t => t.is_visible).map(t => t.price);
      event = {
        title: e.title, artistName: artist ?? null,
        eventWhen: `${fmtDate(e.start_date)}${fmtTime(e.start_time) ? ` · ${fmtTime(e.start_time)}` : ""}`,
        eventWhere: [e.venue_name, e.city, e.state].filter(Boolean).join(", "),
        metroCity: e.metro_city, bannerUrl: e.cover_image_url,
        fromPrice: prices.length ? Math.min(...prices) : null,
        url: `${EMAIL.site}/events/${eventId}`,
      };
    }
  }

  let sent = 0, failed = 0;
  await pool(recipients, CONCURRENCY, async (r) => {
    const unsubscribeUrl = `${EMAIL.site}/api/unsubscribe/${makeUnsubToken(r.email)}`;
    const { html, text } = marketingBlastEmail({ recipientFirstName: r.first_name, subject, headline, body, event, unsubscribeUrl });
    const { id: providerId, error: sendErr } = await sendEmail({
      to: r.email, subject, html, text, type: "marketing_blast",
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    await recordEmailLog(supabase as SupabaseClient, { toEmail: r.email, type: "marketing_blast", subject, status: sendErr ? "failed" : "sent", trigger: "manual", providerId, error: sendErr });
    if (sendErr) failed++; else sent++;
  });

  // Record the blast for the history/audit.
  const { data: blastId } = await supabase.rpc("record_marketing_blast", {
    p_subject: subject, p_headline: headline, p_body: body, p_event_id: eventId,
    p_audience: { ...filters }, p_recipient_count: recipients.length, p_sent_count: sent, p_failed_count: failed,
  });

  return NextResponse.json({ ok: true, blastId, recipients: recipients.length, sent, failed });
}
