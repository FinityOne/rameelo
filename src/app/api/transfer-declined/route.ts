import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transferDeclinedEmail } from "@/lib/email/templates/transferDeclined";
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

type DeclinePayload = {
  success?: boolean;
  error?: string;
  transfer_id?: string;
  sender_email: string | null;
  sender_name: string | null;
  decliner_name: string | null;
  decliner_email: string;
  qty: number;
  seat_numbers: number[] | null;
  tier_name: string | null;
  event_title: string;
  event_start_date: string;
  event_start_time: string | null;
  city: string | null;
  state: string | null;
  venue_name: string | null;
  cover_image_url: string | null;
  artist_name: string | null;
};

// Recipient declines a transfer: the RPC marks it declined (recipient-gated) and
// returns the sender's contact + event details, then we email the sender that
// their hand-off was turned down (tickets back in their wallet). The decline is
// persisted by the RPC regardless of email outcome, so a send hiccup never
// leaves the transfer in limbo.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("decline_ticket_transfer", { p_token: token });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const d = data as DeclinePayload | null;
  if (!d || d.error) return NextResponse.json({ error: d?.error ?? "Could not decline transfer" }, { status: 400 });

  // Decline succeeded. The sender notification is best-effort from here.
  if (!d.sender_email) return NextResponse.json({ ok: true, declined: true, emailed: false });

  const eventWhen = `${fmtDate(d.event_start_date)}${fmtTime(d.event_start_time) ? ` · ${fmtTime(d.event_start_time)}` : ""}`;
  const eventWhere = [d.venue_name, d.city, d.state].filter(Boolean).join(", ");

  const { subject, html, text } = transferDeclinedEmail({
    senderName: d.sender_name,
    declinerName: d.decliner_name,
    declinerEmail: d.decliner_email,
    qty: d.qty,
    seatNumbers: d.seat_numbers ?? [],
    tierName: d.tier_name ?? "Ticket",
    eventTitle: d.event_title,
    artistName: d.artist_name,
    eventWhen,
    eventWhere,
    bannerUrl: d.cover_image_url,
    ticketsUrl: `${EMAIL.site}/portal/tickets`,
  });

  const { id: providerId, error: sendError } = await sendEmail({ to: d.sender_email, subject, html, text, type: "ticket_transfer_declined" });
  await recordEmailLog(supabase, {
    toEmail: d.sender_email,
    type: "ticket_transfer_declined",
    subject,
    status: sendError ? "failed" : "sent",
    trigger: "automatic",
    providerId,
    error: sendError,
  });

  return NextResponse.json({ ok: true, declined: true, emailed: !sendError });
}
