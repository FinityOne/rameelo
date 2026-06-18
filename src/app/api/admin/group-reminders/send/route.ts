import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { groupReminderEmail } from "@/lib/email/templates/groupReminder";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import { groupDiscountSummary } from "@/lib/group-orders";
import { EMAIL } from "@/lib/email/theme";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

const REMIND_COOLDOWN_DAYS = 7;   // one reminder per person per 7 days
const CONCURRENCY = 10;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function fmtDate(d: string) { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }); }
function fmtTime(t: string | null) { if (!t) return ""; const [h, m] = t.split(":"); const hr = parseInt(h, 10); return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`; }
function one<T>(v: T | T[] | null | undefined): T | null { return Array.isArray(v) ? (v[0] ?? null) : (v ?? null); }
async function pool<T>(items: T[], limit: number, worker: (i: T) => Promise<void>) {
  let i = 0; await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (i < items.length) { const idx = i++; await worker(items[idx]); } }));
}

type TierRow = { name: string; price: number; group_discount_mode: "simple" | "scaling" | null; group_discount_min_qty: number | null; group_discount_type: "percentage" | "fixed" | null; group_discount_value: number | null; group_discount_tiers: { min_qty: number; percent: number }[] | null };
type GroupRow = {
  id: string; target_size: number; tier_id: string | null;
  organizer_email: string | null; organizer_name: string | null;
  group_order_members: { name: string | null; email: string | null; qty: number; is_organizer: boolean }[];
  ticket_tiers: TierRow | TierRow[] | null;
};

// Sends a "remind your group, invite more" email to each group member (with an email)
// for an event's groups — personalized to their group's progress + discount goal.
// Honors a per-recipient 7-day cooldown. Also supports a single test send to review.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!serviceRoleConfigured) return NextResponse.json({ error: "Email isn't configured on the server." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const testEmail = typeof body.testEmail === "string" ? body.testEmail.trim().toLowerCase() : "";
  if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

  const { data: ev } = await supabase
    .from("events")
    .select("title, start_date, start_time, city, state, venue_name, metro_city, cover_image_url, artists(name)")
    .eq("id", eventId).single();
  if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const e = ev as unknown as { title: string; start_date: string; start_time: string | null; city: string | null; state: string | null; venue_name: string | null; metro_city: string | null; cover_image_url: string | null; artists: { name: string } | { name: string }[] | null };
  const artistName = (one(e.artists) as { name: string } | null)?.name ?? null;
  const eventWhen = `${fmtDate(e.start_date)}${fmtTime(e.start_time) ? ` · ${fmtTime(e.start_time)}` : ""}`;
  const eventWhere = [e.venue_name, e.city, e.state].filter(Boolean).join(", ");
  const base = { eventTitle: e.title, artistName, eventWhen, eventWhere, metroCity: e.metro_city, bannerUrl: e.cover_image_url };

  // Pull the event's groups + members + tier (for the discount goal).
  const { data: groupsData } = await supabase
    .from("group_orders")
    .select("id, target_size, tier_id, organizer_email, organizer_name, group_order_members(name, email, qty, is_organizer), ticket_tiers(name, price, group_discount_mode, group_discount_min_qty, group_discount_type, group_discount_value, group_discount_tiers)")
    .eq("event_id", eventId);
  const groups = (groupsData ?? []) as unknown as GroupRow[];

  // Per-group computed stats + a builder for one recipient's email.
  function buildFor(g: GroupRow, firstName: string | null) {
    const members = g.group_order_members ?? [];
    const memberCount = members.length;
    const tickets = members.reduce((s, m) => s + (m.qty || 0), 0);
    const disc = groupDiscountSummary(one(g.ticket_tiers));
    const discount = disc && tickets < disc.minQty ? { amount: disc.amount, needMore: disc.minQty - tickets } : null;
    return groupReminderEmail({
      recipientFirstName: firstName, ...base,
      members: memberCount, targetSize: g.target_size || memberCount, tickets,
      groupUrl: `${EMAIL.site}/group/${g.id}`, discount,
    });
  }

  // ── Test send ──────────────────────────────────────────────────────────────
  if (testEmail) {
    if (!EMAIL_RE.test(testEmail)) return NextResponse.json({ error: "Enter a valid test email." }, { status: 400 });
    const g = groups.find(x => (x.group_order_members ?? []).length > 0) ?? groups[0];
    const { subject, html, text } = g
      ? buildFor(g, "there")
      : groupReminderEmail({ recipientFirstName: "there", ...base, members: 3, targetSize: 6, tickets: 5, groupUrl: `${EMAIL.site}/events/${eventId}`, discount: { amount: "10% off", needMore: 2 } });
    const { error: sendErr } = await sendEmail({ to: testEmail, subject: `[TEST] ${subject}`, html, text, type: "group_reminder" });
    if (sendErr) return NextResponse.json({ error: sendErr }, { status: 500 });
    return NextResponse.json({ ok: true, test: true });
  }

  // ── Real blast ───────────────────────────────────────────────────────────
  // One recipient per email (dedup); keep their first group. Members with an email only.
  const byEmail = new Map<string, { group: GroupRow; name: string | null }>();
  for (const g of groups) {
    for (const m of g.group_order_members ?? []) {
      const email = (m.email ?? "").trim().toLowerCase();
      if (!EMAIL_RE.test(email) || byEmail.has(email)) continue;
      byEmail.set(email, { group: g, name: m.name ?? null });
    }
  }
  if (byEmail.size === 0) return NextResponse.json({ error: "No group members with an email to remind for this event." }, { status: 422 });

  // 7-day cooldown — exclude anyone emailed a group reminder recently.
  const admin = createAdminClient();
  const since = new Date(Date.now() - REMIND_COOLDOWN_DAYS * 86_400_000).toISOString();
  const recent = new Set<string>();
  const allEmails = Array.from(byEmail.keys());
  for (let i = 0; i < allEmails.length; i += 500) {
    const { data } = await admin.from("email_logs").select("to_email").eq("type", "group_reminder").eq("status", "sent").gte("created_at", since).in("to_email", allEmails.slice(i, i + 500));
    for (const r of (data ?? []) as { to_email: string }[]) recent.add(r.to_email.toLowerCase());
  }

  const recipients = allEmails.filter(em => !recent.has(em));
  const skipped = byEmail.size - recipients.length;
  if (recipients.length === 0) return NextResponse.json({ ok: true, sent: 0, skipped, recipients: byEmail.size, note: "Everyone was reminded within the last 7 days." });

  let sent = 0, failed = 0;
  await pool(recipients, CONCURRENCY, async (email) => {
    const { group, name } = byEmail.get(email)!;
    const { subject, html, text } = buildFor(group, name ? name.split(" ")[0] : null);
    const { id: providerId, error: sendErr } = await sendEmail({ to: email, subject, html, text, type: "group_reminder" });
    await recordEmailLog(supabase as SupabaseClient, { toEmail: email, type: "group_reminder", subject, status: sendErr ? "failed" : "sent", trigger: "manual", providerId, error: sendErr });
    if (sendErr) failed++; else sent++;
  });

  await supabase.rpc("record_group_reminder_blast", { p_event_id: eventId, p_recipient_count: byEmail.size, p_sent_count: sent, p_skipped_count: skipped });

  return NextResponse.json({ ok: true, sent, failed, skipped, recipients: byEmail.size });
}
