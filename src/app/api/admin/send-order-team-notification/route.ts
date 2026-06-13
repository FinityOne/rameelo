import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { orderTeamNotificationEmail } from "@/lib/email/templates/orderTeamNotification";
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

type Recipient = { email: string; first_name: string | null };
type TeamPayload = {
  buyer_name: string | null;
  qty: number;
  tier_name: string | null;
  unit_price: number;
  discount_amount: number;
  grand_total: number;
  payment_method: string;
  event_id: string;
  event_title: string;
  event_start_date: string;
  event_start_time: string | null;
  city: string | null;
  state: string | null;
  venue_name: string | null;
  cover_image_url: string | null;
  artist_name: string | null;
  recipients: Recipient[];
};

// Admin-triggered resend of the new-order notification to an event's organizing
// team. The get_order_team_notification RPC bypasses its recency guard for admins,
// so it works for any order; admins resolve recipients securely inside it.
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

  const { data, error } = await supabase.rpc("get_order_team_notification", { p_order_id: orderId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const o = data as TeamPayload | null;
  if (!o) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const recipients = (o.recipients ?? []).filter(r => r.email);
  if (recipients.length === 0) return NextResponse.json({ error: "This event has no team members to notify." }, { status: 422 });

  const eventWhen = `${fmtDate(o.event_start_date)}${fmtTime(o.event_start_time) ? ` · ${fmtTime(o.event_start_time)}` : ""}`;
  const eventWhere = [o.venue_name, o.city, o.state].filter(Boolean).join(", ");
  const buyerFirstName = (o.buyer_name ?? "").trim().split(" ")[0] || "Someone";
  const ordersUrl = `${EMAIL.site}/organizer/events/${o.event_id}/orders`;
  const unitPrice = Number(o.unit_price) || 0;
  const discountAmount = Number(o.discount_amount) || 0;
  const faceValue = Math.max(0, o.qty * unitPrice - discountAmount);

  const results = await Promise.all(recipients.map(async (r) => {
    const { subject, html, text } = orderTeamNotificationEmail({
      recipientFirstName: r.first_name,
      buyerFirstName,
      qty: o.qty,
      tierName: o.tier_name ?? "Ticket",
      unitPrice,
      discountAmount,
      faceValue,
      eventTitle: o.event_title,
      artistName: o.artist_name,
      eventWhen,
      eventWhere,
      bannerUrl: o.cover_image_url,
      ordersUrl,
      paymentMethod: o.payment_method,
    });

    const { id: providerId, error: sendError } = await sendEmail({ to: r.email, subject, html, text });
    await recordEmailLog(supabase, {
      toEmail: r.email,
      type: "order_team_notification",
      subject,
      status: sendError ? "failed" : "sent",
      trigger: "manual",
      providerId,
      error: sendError,
    });
    return !sendError;
  }));

  const sent = results.filter(Boolean).length;
  if (sent === 0) return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  return NextResponse.json({ ok: true, sent, total: recipients.length });
}
