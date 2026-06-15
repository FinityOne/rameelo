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
function receiptNum(id: string) {
  return "RM-" + id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

// Admin-triggered resend of an order confirmation / receipt. Admins can read any
// order via RLS, so we query it directly (no freshness limit) and resend.
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

  const { data: order } = await supabase
    .from("orders")
    .select(`
      id, user_id, buyer_name, buyer_email,
      qty, unit_price, discount_pct, discount_amount, rameelo_fee, processing_fee, grand_total,
      events ( title, start_date, start_time, city, state, venue_name, artists ( name ) ),
      ticket_tiers ( name )
    `)
    .eq("id", orderId)
    .single();

  if (!order || !order.buyer_email) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const ev = one(order.events as unknown) as { title: string; start_date: string; start_time: string | null; city: string; state: string; venue_name: string | null; artists: { name: string } | { name: string }[] | null } | null;
  const artist = ev ? one(ev.artists) : null;
  const tier = one(order.ticket_tiers as unknown) as { name: string } | null;
  const eventWhen = ev ? `${fmtDate(ev.start_date)}${fmtTime(ev.start_time) ? ` · ${fmtTime(ev.start_time)}` : ""}` : "";
  const where = ev ? [ev.venue_name, ev.city, ev.state].filter(Boolean).join(", ") : "";

  const { subject, html, text } = orderConfirmationEmail({
    buyerName: order.buyer_name,
    receiptNum: receiptNum(orderId),
    qty: order.qty,
    unitPrice: Number(order.unit_price) || 0,
    discountPct: Number(order.discount_pct) || 0,
    discountAmount: Number(order.discount_amount) || 0,
    rameeloFee: Number(order.rameelo_fee) || 0,
    processingFee: Number(order.processing_fee) || 0,
    grandTotal: Number(order.grand_total) || 0,
    tierName: tier?.name ?? "Ticket",
    eventTitle: ev?.title ?? "your event",
    artistName: artist?.name ?? null,
    eventWhen,
    eventWhere: where,
    directionsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`,
    ticketsUrl: `${EMAIL.site}/portal/tickets`,
    buyMoreUrl: `${EMAIL.site}/events`,
  });

  const { id: providerId, error: sendError } = await sendEmail({ to: order.buyer_email, subject, html, text, type: "order_confirmation" });

  await recordEmailLog(supabase, {
    userId: order.user_id,
    toEmail: order.buyer_email,
    type: "order_confirmation",
    subject,
    status: sendError ? "failed" : "sent",
    trigger: "manual",
    providerId,
    error: sendError,
  });

  if (sendError) {
    console.error("admin send-order-confirmation error:", sendError);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
