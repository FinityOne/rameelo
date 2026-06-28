import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceRoleConfigured } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import { makeUnsubToken } from "@/lib/marketing-token";
import { EMAIL } from "@/lib/email/theme";
import { loadBlastEvent, buildBlastEmail, loadUpcomingGeoEvents, pickNearbyEvents, buildNearbyEmail, type GeoEvent } from "@/lib/email/build-blast";
import { blastTemplate } from "@/lib/email/blast-templates";
import type { SupabaseClient } from "@supabase/supabase-js";

type Built = { subject: string; html: string; text: string };

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_RECIPIENTS = 2000;
const CONCURRENCY = 12;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const arr = (v: unknown) => Array.isArray(v) ? v.map(String).map(s => s.trim()).filter(Boolean) : [];

async function pool<T>(items: T[], limit: number, worker: (i: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await worker(items[idx]); }
  }));
}

// Sends a marketing blast (or a single test) using a selected template + optional
// event. Per-recipient (branded, personalized, one-click unsubscribe), logged,
// and recorded. Body: { templateKey, eventId?, subject?, headline?, body?,
// testEmail?, ...audience filters }.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role, first_name, state").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!serviceRoleConfigured) return NextResponse.json({ error: "Email isn't configured on the server." }, { status: 503 });

  const b = await request.json().catch(() => ({}));
  const templateKey = String(b.templateKey ?? "custom");
  const tmpl = blastTemplate(templateKey);
  if (!tmpl) return NextResponse.json({ error: "Unknown template." }, { status: 400 });

  const eventId = typeof b.eventId === "string" && b.eventId ? b.eventId : null;
  const subject = String(b.subject ?? "").trim();
  const headline = String(b.headline ?? "").trim() || null;
  const body = String(b.body ?? "").trim() || null;
  const testEmail = typeof b.testEmail === "string" ? b.testEmail.trim().toLowerCase() : "";

  // Per-template validation.
  if (tmpl.requiresEvent && !eventId) return NextResponse.json({ error: `Pick an event for the “${tmpl.name}” template.` }, { status: 400 });
  if (tmpl.custom) {
    if (!subject) return NextResponse.json({ error: "A subject line is required." }, { status: 400 });
    if (!body && !eventId) return NextResponse.json({ error: "Add a message or pick an event to feature." }, { status: 400 });
  }

  const isGeo = !!tmpl.perRecipientGeo;

  // Load the event once (shared by every recipient + the history record).
  const event = eventId ? await loadBlastEvent(supabase as SupabaseClient, eventId) : null;
  if (eventId && !event) return NextResponse.json({ error: "That event isn't published or wasn't found." }, { status: 404 });

  // For the location-aware template, load the on-sale upcoming events once and
  // pick each recipient's nearest set from this shared list.
  let geoEvents: GeoEvent[] = [];
  if (isGeo) {
    geoEvents = await loadUpcomingGeoEvents(supabase as SupabaseClient);
    if (geoEvents.length === 0) return NextResponse.json({ error: "No upcoming on-sale events to feature right now." }, { status: 422 });
  }

  const custom = { subject, headline, body };

  // Builds the final email for one recipient — branches between the location-aware
  // template (per-recipient event set) and the shared-event / custom templates.
  const buildFor = (firstName: string | null, state: string | null, unsubscribeUrl: string): Built => {
    if (isGeo) {
      const { items, locationLabel } = pickNearbyEvents(geoEvents, state);
      return buildNearbyEmail({ recipientFirstName: firstName, items, locationLabel, unsubscribeUrl });
    }
    return buildBlastEmail({ templateKey, recipientFirstName: firstName, event, unsubscribeUrl, custom });
  };

  // Representative subject for history / the test prefix (template subjects don't
  // depend on the recipient's name; for geo we use the admin's own state).
  const repSubject = buildFor(null, me.state ?? null, `${EMAIL.site}/api/unsubscribe/preview`).subject;

  // ── Test send ────────────────────────────────────────────────────────────
  if (testEmail) {
    if (!EMAIL_RE.test(testEmail)) return NextResponse.json({ error: "Enter a valid test email." }, { status: 400 });
    const unsubscribeUrl = `${EMAIL.site}/api/unsubscribe/${makeUnsubToken(testEmail)}`;
    const { subject: subj, html, text } = buildFor(me.first_name ?? "there", me.state ?? null, unsubscribeUrl);
    const { error: sendErr } = await sendEmail({ to: testEmail, subject: `[TEST] ${subj}`, html, text, type: "marketing_blast" });
    if (sendErr) return NextResponse.json({ error: sendErr }, { status: 500 });
    return NextResponse.json({ ok: true, test: true });
  }

  // ── Real blast ───────────────────────────────────────────────────────────
  const filters = {
    p_tags: arr(b.tags),
    p_batch_ids: arr(b.batchIds),
    p_cities: arr(b.cities).map(c => c.toLowerCase()),
    p_states: arr(b.states).map(s => s.toUpperCase()),
    p_attended_event_ids: arr(b.attendedEventIds),
    p_source: typeof b.source === "string" && b.source ? b.source : null,
    p_match_any: b.matchAny === true,
  };

  const { data: audienceData, error: aErr } = await supabase.rpc("resolve_marketing_audience", filters);
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 400 });
  const recipients = (audienceData ?? []) as { email: string; first_name: string | null; state: string | null }[];
  if (recipients.length === 0) return NextResponse.json({ error: "No recipients match those filters." }, { status: 422 });
  if (recipients.length > MAX_RECIPIENTS) return NextResponse.json({ error: `Audience too large (${recipients.length}). Narrow it to ${MAX_RECIPIENTS} or fewer.` }, { status: 413 });

  let sent = 0, failed = 0;
  await pool(recipients, CONCURRENCY, async (r) => {
    const unsubscribeUrl = `${EMAIL.site}/api/unsubscribe/${makeUnsubToken(r.email)}`;
    const { subject: subj, html, text } = buildFor(r.first_name, r.state, unsubscribeUrl);
    const { id: providerId, error: sendErr } = await sendEmail({
      to: r.email, subject: subj, html, text, type: "marketing_blast",
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    await recordEmailLog(supabase as SupabaseClient, { toEmail: r.email, type: "marketing_blast", subject: subj, status: sendErr ? "failed" : "sent", trigger: "manual", providerId, error: sendErr });
    if (sendErr) failed++; else sent++;
  });

  const { data: blastId } = await supabase.rpc("record_marketing_blast", {
    p_subject: repSubject, p_headline: headline, p_body: body, p_event_id: eventId,
    p_audience: { ...filters, template: templateKey }, p_recipient_count: recipients.length, p_sent_count: sent, p_failed_count: failed,
  });

  return NextResponse.json({ ok: true, blastId, recipients: recipients.length, sent, failed });
}
