import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groupJoinedEmail } from "@/lib/email/templates/groupJoined";
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
function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

// Notifies the group host when someone joins their link. Recipient is always the
// stored organizer_email (never request input); we only fire when the named
// member genuinely joined in the last few minutes — so it can't be abused.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  const joinerEmail = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  if (!groupId || !joinerEmail) return NextResponse.json({ error: "Missing groupId/email" }, { status: 400 });

  const supabase = await createClient();

  const { data: group } = await supabase
    .from("group_orders")
    .select(`
      id, organizer_name, organizer_email, organizer_user_id,
      events ( title, start_date, start_time, city, state, venue_name )
    `)
    .eq("id", groupId)
    .single();

  if (!group || !group.organizer_email) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  // Don't notify when the host is the one "joining" (i.e. created the group).
  if (group.organizer_email.toLowerCase() === joinerEmail) {
    return NextResponse.json({ ok: true, skipped: "host" });
  }

  const { data: members } = await supabase
    .from("group_order_members")
    .select("name, email, qty, joined_at")
    .eq("group_id", groupId);

  const rows = (members ?? []) as { name: string; email: string; qty: number; joined_at: string }[];
  const joiner = rows.find(m => m.email.toLowerCase() === joinerEmail);
  if (!joiner) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  // Freshness guard — only a just-joined member triggers a send.
  if (Date.now() - new Date(joiner.joined_at).getTime() > 10 * 60 * 1000) {
    return NextResponse.json({ ok: true, skipped: "stale" });
  }

  const ev = one(group.events as unknown) as { title: string; start_date: string; start_time: string | null; city: string; state: string; venue_name: string | null } | null;
  const eventWhen = ev ? `${fmtDate(ev.start_date)}${fmtTime(ev.start_time) ? ` · ${fmtTime(ev.start_time)}` : ""}` : "";
  const eventWhere = ev ? [ev.venue_name, ev.city, ev.state].filter(Boolean).join(", ") : "";

  const { subject, html, text } = groupJoinedEmail({
    hostName: group.organizer_name,
    joinerName: joiner.name,
    qty: joiner.qty ?? 1,
    eventTitle: ev?.title ?? "your event",
    eventWhen,
    eventWhere,
    memberCount: rows.length,
    groupUrl: `${EMAIL.site}/group/${groupId}`,
  });

  const { id: providerId, error: sendError } = await sendEmail({ to: group.organizer_email, subject, html, text });

  await recordEmailLog(supabase, {
    userId: group.organizer_user_id,
    toEmail: group.organizer_email,
    type: "group_joined",
    subject,
    status: sendError ? "failed" : "sent",
    trigger: "automatic",
    providerId,
    error: sendError,
  });

  return NextResponse.json({ ok: true, emailed: !sendError });
}
