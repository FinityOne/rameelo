import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { orderConfirmationEmail } from "@/lib/email/templates/orderConfirmation";
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
// Canonical receipt number: RM- + first 10 hex of the order id, uppercased.
function receiptNum(id: string) {
  return "RM-" + id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

// Sends the order confirmation / receipt to the buyer after a purchase. Details
// come from a SECURITY DEFINER RPC keyed by order id that only returns a
// freshly-placed order — so it works for guest buyers and can't be abused.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_order_for_receipt", { p_order_id: orderId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const o = one(data as unknown) as {
    buyer_name: string | null; buyer_email: string; user_id: string | null;
    qty: number; unit_price: number; discount_pct: number; discount_amount: number;
    rameelo_fee: number; processing_fee: number; service_fee: number; grand_total: number;
    payment_method: string; created_at: string; tier_name: string | null;
    event_title: string; event_start_date: string; event_start_time: string | null;
    city: string; state: string; venue_name: string | null; artist_name: string | null;
  } | null;

  if (!o || !o.buyer_email) return NextResponse.json({ ok: true, skipped: "not-found" });

  const eventWhen = `${fmtDate(o.event_start_date)}${fmtTime(o.event_start_time) ? ` · ${fmtTime(o.event_start_time)}` : ""}`;
  const eventWhere = [o.venue_name, o.city, o.state].filter(Boolean).join(", ");
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([o.venue_name, o.city, o.state].filter(Boolean).join(", "))}`;

  const { subject, html, text } = orderConfirmationEmail({
    buyerName: o.buyer_name,
    receiptNum: receiptNum(orderId),
    qty: o.qty,
    unitPrice: Number(o.unit_price) || 0,
    discountPct: Number(o.discount_pct) || 0,
    discountAmount: Number(o.discount_amount) || 0,
    rameeloFee: Number(o.rameelo_fee) || 0,
    processingFee: Number(o.processing_fee) || 0,
    grandTotal: Number(o.grand_total) || 0,
    tierName: o.tier_name ?? "Ticket",
    eventTitle: o.event_title,
    artistName: o.artist_name,
    eventWhen,
    eventWhere,
    directionsUrl,
    ticketsUrl: `${EMAIL.site}/portal/tickets`,
    buyMoreUrl: `${EMAIL.site}/events`,
  });

  const { id: providerId, error: sendError } = await sendEmail({ to: o.buyer_email, subject, html, text, type: "order_confirmation" });

  await recordEmailLog(supabase, {
    userId: o.user_id,
    toEmail: o.buyer_email,
    type: "order_confirmation",
    subject,
    status: sendError ? "failed" : "sent",
    trigger: "automatic",
    providerId,
    error: sendError,
  });

  return NextResponse.json({ ok: true, emailed: !sendError });
}
