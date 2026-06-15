import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { compTicketEmail } from "@/lib/email/templates/compTicket";
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

type CompPayload = {
  buyer_name: string | null;
  buyer_email: string | null;
  qty: number;
  tier_name: string | null;
  order_type: string;
  recipient_exists: boolean;
  comped_by_name: string | null;
  event_title: string;
  event_start_date: string;
  event_start_time: string | null;
  city: string | null;
  state: string | null;
  venue_name: string | null;
  cover_image_url: string | null;
  artist_name: string | null;
};

// Emails a comp-ticket recipient their free tickets. Details come from a SECURITY
// DEFINER RPC keyed by order id (gated to the issuer/org-admin or a fresh order),
// and the body branches on whether the recipient already has a Rameelo account.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_comp_order_for_send", { p_order_id: orderId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const o = data as CompPayload | null;
  if (!o || o.order_type !== "comp" || !o.buyer_email) return NextResponse.json({ ok: true, skipped: "not-found" });

  const eventWhen = `${fmtDate(o.event_start_date)}${fmtTime(o.event_start_time) ? ` · ${fmtTime(o.event_start_time)}` : ""}`;
  const eventWhere = [o.venue_name, o.city, o.state].filter(Boolean).join(", ");
  const firstName = (o.buyer_name ?? "").trim().split(" ")[0] || null;

  const { subject, html, text } = compTicketEmail({
    recipientFirstName: firstName,
    recipientEmail: o.buyer_email,
    hostName: o.comped_by_name,
    qty: o.qty,
    tierName: o.tier_name ?? "Ticket",
    eventTitle: o.event_title,
    artistName: o.artist_name,
    eventWhen,
    eventWhere,
    bannerUrl: o.cover_image_url,
    hasAccount: !!o.recipient_exists,
    signInUrl: `${EMAIL.site}/auth/signin?next=/portal/tickets`,
    signUpUrl: `${EMAIL.site}/auth/signup?email=${encodeURIComponent(o.buyer_email)}&next=/portal/tickets`,
  });

  const { id: providerId, error: sendError } = await sendEmail({ to: o.buyer_email, subject, html, text, type: "comp_ticket" });
  await recordEmailLog(supabase, {
    toEmail: o.buyer_email,
    type: "comp_ticket",
    subject,
    status: sendError ? "failed" : "sent",
    trigger: "automatic",
    providerId,
    error: sendError,
  });

  if (sendError) return NextResponse.json({ error: sendError }, { status: 500 });
  return NextResponse.json({ ok: true });
}
