import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ticketTransferEmail } from "@/lib/email/templates/ticketTransfer";
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

type TransferPayload = {
  status: string;
  token: string;
  to_email: string;
  to_name: string | null;
  qty: number;
  seat_numbers: number[] | null;
  recipient_exists: boolean;
  from_name: string | null;
  event_title: string;
  event_start_date: string;
  event_start_time: string | null;
  city: string | null;
  state: string | null;
  venue_name: string | null;
  cover_image_url: string | null;
  tier_name: string | null;
  artist_name: string | null;
};

// Emails a ticket-transfer recipient their claim link. Details come from a
// SECURITY DEFINER RPC keyed by transfer id (gated to the sender / org admin /
// a fresh row), and the body branches on whether the recipient already has a
// Rameelo account. Fires right after a transfer is initiated from My Tickets.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const transferId = typeof body.transferId === "string" ? body.transferId : "";
  if (!transferId) return NextResponse.json({ error: "Missing transferId" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_transfer_for_send", { p_transfer_id: transferId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const t = data as TransferPayload | null;
  if (!t || !t.to_email) return NextResponse.json({ ok: true, skipped: "not-found" });
  // Only notify on a live, pending transfer (skip ones already accepted/cancelled).
  if (t.status !== "pending") return NextResponse.json({ ok: true, skipped: "not-pending" });

  const eventWhen = `${fmtDate(t.event_start_date)}${fmtTime(t.event_start_time) ? ` · ${fmtTime(t.event_start_time)}` : ""}`;
  const eventWhere = [t.venue_name, t.city, t.state].filter(Boolean).join(", ");

  const { subject, html, text } = ticketTransferEmail({
    recipientName: t.to_name,
    recipientEmail: t.to_email,
    fromName: t.from_name,
    qty: t.qty,
    seatNumbers: t.seat_numbers ?? [],
    tierName: t.tier_name ?? "Ticket",
    eventTitle: t.event_title,
    artistName: t.artist_name,
    eventWhen,
    eventWhere,
    bannerUrl: t.cover_image_url,
    hasAccount: !!t.recipient_exists,
    claimUrl: `${EMAIL.site}/tickets/claim/${t.token}`,
    helpCreateAccountUrl: `${EMAIL.site}/help/create-account`,
  });

  const { id: providerId, error: sendError } = await sendEmail({ to: t.to_email, subject, html, text, type: "ticket_transfer" });
  await recordEmailLog(supabase, {
    toEmail: t.to_email,
    type: "ticket_transfer",
    subject,
    status: sendError ? "failed" : "sent",
    trigger: "automatic",
    providerId,
    error: sendError,
  });

  if (sendError) return NextResponse.json({ error: sendError }, { status: 500 });
  return NextResponse.json({ ok: true });
}
