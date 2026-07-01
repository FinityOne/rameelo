import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { orderAdminNotificationEmail } from "@/lib/email/templates/orderAdminNotification";
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
function receiptNum(id: string) {
  return "RM-" + id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

type AdminPayload = {
  is_test: boolean;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  qty: number;
  tier_name: string | null;
  unit_price: number;
  discount_amount: number;
  promo_code: string | null;
  rameelo_fee: number;
  processing_fee: number;
  grand_total: number;
  payment_method: string;
  created_at: string;
  event_id: string;
  event_title: string;
  event_start_date: string;
  event_start_time: string | null;
  city: string | null;
  state: string | null;
  venue_name: string | null;
  artist_name: string | null;
  recipients: { email: string }[];
};

// Notifies every subscribed platform admin on a new order — a detailed internal
// record (full buyer contact, price breakdown, and Rameelo's effective profit after
// the Stripe processing cost). Data + recipient list come from a SECURITY DEFINER
// RPC keyed by order id (fresh-order gated), so it works for guest checkouts.
// Admins opt out per event, so the recipient list already excludes the unsubscribed.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_order_admin_notification", { p_order_id: orderId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const o = data as AdminPayload | null;
  if (!o) return NextResponse.json({ ok: true, skipped: "not-found" });
  // Never notify admins for sandbox/test orders.
  if (o.is_test) return NextResponse.json({ ok: true, skipped: "test-order" });
  const recipients = (o.recipients ?? []).filter(r => r.email);
  if (recipients.length === 0) return NextResponse.json({ ok: true, skipped: "no-subscribed-admins" });

  const eventWhen = `${fmtDate(o.event_start_date)}${fmtTime(o.event_start_time) ? ` · ${fmtTime(o.event_start_time)}` : ""}`;
  const eventWhere = [o.venue_name, o.city, o.state].filter(Boolean).join(", ");
  const placedAt = new Date(o.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const orderUrl = `${EMAIL.site}/admin/events/${o.event_id}`;

  const { subject, html, text } = orderAdminNotificationEmail({
    buyerName: o.buyer_name,
    buyerEmail: o.buyer_email,
    buyerPhone: o.buyer_phone,
    qty: o.qty,
    tierName: o.tier_name ?? "Ticket",
    unitPrice: Number(o.unit_price) || 0,
    discountAmount: Number(o.discount_amount) || 0,
    promoCode: o.promo_code,
    rameeloFee: Number(o.rameelo_fee) || 0,
    processingFee: Number(o.processing_fee) || 0,
    grandTotal: Number(o.grand_total) || 0,
    paymentMethod: o.payment_method,
    eventTitle: o.event_title,
    artistName: o.artist_name,
    eventWhen,
    eventWhere,
    receiptNum: receiptNum(orderId),
    orderUrl,
    placedAt,
  });

  const results = await Promise.all(recipients.map(async (r) => {
    const { id: providerId, error: sendError } = await sendEmail({ to: r.email, subject, html, text, type: "order_admin_notification" });
    await recordEmailLog(supabase, {
      toEmail: r.email,
      type: "order_admin_notification",
      subject,
      status: sendError ? "failed" : "sent",
      trigger: "automatic",
      providerId,
      error: sendError,
    });
    return !sendError;
  }));

  return NextResponse.json({ ok: true, sent: results.filter(Boolean).length, total: recipients.length });
}
