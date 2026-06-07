import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groupCreatedEmail } from "@/lib/email/templates/groupCreated";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import { EMAIL } from "@/lib/email/theme";
import { groupDiscountSummary } from "@/lib/group-orders";

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
function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

// Emails a group's creator their share link + how-it-works on creation.
// Recipient is always the group's stored organizer_email (never request input),
// and we only send for a freshly-created group — so this can't be abused.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  if (!groupId) return NextResponse.json({ error: "Missing groupId" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_orders")
    .select(`
      id, organizer_name, organizer_email, organizer_user_id, created_at,
      events ( title, start_date, start_time, city, state, venue_name ),
      ticket_tiers ( name, price, group_discount_mode, group_discount_min_qty, group_discount_type, group_discount_value, group_discount_tiers )
    `)
    .eq("id", groupId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  type TierRow = { name: string; price: number; group_discount_mode: "simple" | "scaling" | null; group_discount_min_qty: number | null; group_discount_type: "percentage" | "fixed" | null; group_discount_value: number | null; group_discount_tiers: { min_qty: number; percent: number }[] | null };
  const g = data as unknown as {
    organizer_name: string; organizer_email: string; organizer_user_id: string | null;
    created_at: string;
    events: { title: string; start_date: string; start_time: string | null; city: string; state: string; venue_name: string | null } | { title: string; start_date: string; start_time: string | null; city: string; state: string; venue_name: string | null }[] | null;
    ticket_tiers: TierRow | TierRow[] | null;
  };

  // Only send for a just-created group (guards against replay/abuse).
  if (Date.now() - new Date(g.created_at).getTime() > 60 * 60 * 1000) {
    return NextResponse.json({ ok: true, skipped: "stale" });
  }
  if (!g.organizer_email) return NextResponse.json({ error: "No organizer email" }, { status: 400 });

  const ev = one(g.events);
  const tier = one(g.ticket_tiers);
  const eventWhen = ev ? `${fmtDate(ev.start_date)}${fmtTime(ev.start_time) ? ` · ${fmtTime(ev.start_time)}` : ""}` : "";
  const eventWhere = ev ? [ev.venue_name, ev.city, ev.state].filter(Boolean).join(", ") : "";

  // Discount comes straight from the event's ticket tier (never hardcoded);
  // null when this tier has no group discount, so the email omits all of it.
  const discount = groupDiscountSummary(tier);

  const { subject, html, text } = groupCreatedEmail({
    hostName: g.organizer_name,
    eventTitle: ev?.title ?? "your event",
    eventWhen,
    eventWhere,
    shareUrl: `${EMAIL.site}/group/${groupId}`,
    discount,
  });

  const { id: providerId, error: sendError } = await sendEmail({ to: g.organizer_email, subject, html, text });

  await recordEmailLog(supabase, {
    userId: g.organizer_user_id,
    toEmail: g.organizer_email,
    type: "group_created",
    subject,
    status: sendError ? "failed" : "sent",
    trigger: "automatic",
    providerId,
    error: sendError,
  });

  if (sendError) {
    console.error("group-created send error:", sendError);
    return NextResponse.json({ ok: true, emailed: false });
  }
  return NextResponse.json({ ok: true, emailed: true });
}
