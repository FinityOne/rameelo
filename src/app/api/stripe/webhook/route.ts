import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeConfigured, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { friendlyStripeError } from "@/lib/stripe/errors";
import { paymentFailedEmail } from "@/lib/email/templates/paymentFailed";
import { orderConfirmationEmail } from "@/lib/email/templates/orderConfirmation";
import { orderTeamNotificationEmail } from "@/lib/email/templates/orderTeamNotification";
import { orderAdminNotificationEmail } from "@/lib/email/templates/orderAdminNotification";
import { ticketsPendingEmail } from "@/lib/email/templates/ticketsPending";
import { groupTicketClaimEmail } from "@/lib/email/templates/groupTicketClaim";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import { EMAIL } from "@/lib/email/theme";
import type { SupabaseClient } from "@supabase/supabase-js";

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
function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

// Stripe sends the raw body; we must read it verbatim to verify the signature.
export const runtime = "nodejs";

// Stripe webhook — the SOURCE OF TRUTH for payment outcomes.
//
// Orders are created `pending` at checkout (before payment) so none are ever
// lost. This endpoint is what actually FULFILLS them:
//   • payment_intent.succeeded  → confirm the order (releasing the QR/tickets),
//       email the buyer their receipt, alert the organizing team, allocate group
//       tickets + claim emails, and save the payment method.
//   • payment_intent.processing → ACH initiated: email the buyer "tickets reserved".
//   • payment_intent.payment_failed / canceled → cancel + release the seat + email
//       (card declines during active checkout are left pending so a retry works).
//
// Runs with no user session (Stripe calls us), so it uses the service-role client.
export async function POST(request: Request) {
  if (!stripeConfigured || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid signature";
    return NextResponse.json({ error: `Webhook signature verification failed: ${msg}` }, { status: 400 });
  }

  if (!serviceRoleConfigured) {
    console.error("Stripe webhook received but SUPABASE_SERVICE_ROLE_KEY is not set — cannot reconcile order.");
    return NextResponse.json({ received: true, skipped: "no-service-role" });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        await fulfillPaidOrder(event.data.object as Stripe.PaymentIntent);
        break;
      }
      case "payment_intent.processing": {
        await notifyAchProcessing((event.data.object as Stripe.PaymentIntent).id);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await failOrderForIntent(pi, friendlyStripeError(pi.last_payment_error ?? undefined), false);
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await failOrderForIntent(pi, "The payment was canceled before it completed.", true);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Stripe webhook handler error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

type FulfillEvent = { title: string; start_date: string; start_time: string | null; city: string | null; state: string | null; venue_name: string | null; cover_image_url: string | null; org_id: string | null; organizer_id: string | null; artists: { name: string } | { name: string }[] | null } | null;

// Confirms a paid order and fully fulfills it. Idempotent — only acts on an order
// that's still `pending`, so duplicate webhook deliveries don't double-fire.
async function fulfillPaidOrder(pi: Stripe.PaymentIntent) {
  const admin = createAdminClient();

  // Find the order for this PaymentIntent and decide if it should be fulfilled:
  // a still-pending order, or one the cleanup cron expired while the webhook was
  // delayed (reason "Expired…"). Never re-fulfill an already-confirmed order or a
  // real payment failure ("Payment failed: …").
  const { data: cand } = await admin
    .from("orders")
    .select("id, status, cancellation_reason")
    .eq("stripe_payment_intent_id", pi.id)
    .limit(1)
    .maybeSingle();
  if (!cand) return; // unknown intent
  const eligible = cand.status === "pending" || (cand.status === "cancelled" && (cand.cancellation_reason ?? "").startsWith("Expired"));
  if (!eligible) return; // already fulfilled, or a real failure

  // Idempotent: gating on the exact current status means concurrent deliveries
  // only fulfill once. The trigger re-reserves the seat if it was released.
  const { data: rows } = await admin
    .from("orders")
    .update({ status: "confirmed", confirmation_email_sent_at: new Date().toISOString(), cancellation_reason: null, cancelled_at: null })
    .eq("id", cand.id)
    .eq("status", cand.status)
    .select(`
      id, user_id, group_id, buyer_name, buyer_email, buyer_phone, qty, unit_price, discount_pct, discount_amount, promo_code,
      rameelo_fee, processing_fee, grand_total, payment_method, event_id, combo_ticket_id,
      events ( title, start_date, start_time, city, state, venue_name, cover_image_url, org_id, organizer_id, artists ( name ) ),
      ticket_tiers ( name ),
      combo_tickets ( name )
    `);

  const order = rows?.[0] as {
    id: string; user_id: string | null; group_id: string | null; buyer_name: string | null; buyer_email: string; buyer_phone: string | null;
    qty: number; unit_price: number; discount_pct: number; discount_amount: number; promo_code: string | null;
    rameelo_fee: number; processing_fee: number; grand_total: number; payment_method: string; event_id: string; combo_ticket_id: string | null;
    events: FulfillEvent; ticket_tiers: { name: string } | null; combo_tickets: { name: string } | null;
  } | undefined;
  if (!order || !order.buyer_email) return; // already fulfilled, or unknown intent

  // Combo orders: materialize a per-event ticket/QR segment for every event in
  // the bundle (idempotent), and gather the event names for the email's combo note.
  let comboEventNames: string[] = [];
  if (order.combo_ticket_id) {
    try {
      await admin.rpc("ensure_combo_event_tickets", { p_order_id: order.id });
      const { data: names } = await admin.rpc("get_order_combo_event_names", { p_order_id: order.id });
      if (Array.isArray(names)) comboEventNames = names as string[];
    } catch (e) { console.error("combo segment/email-names error:", e instanceof Error ? e.message : e); }
  }

  const ev = order.events;
  const artist = one(ev?.artists)?.name ?? null;
  const tierName = order.ticket_tiers?.name ?? order.combo_tickets?.name ?? "Ticket";
  const eventWhen = ev ? `${fmtDate(ev.start_date)}${fmtTime(ev.start_time) ? ` · ${fmtTime(ev.start_time)}` : ""}` : "";
  const where = [ev?.venue_name, ev?.city, ev?.state].filter(Boolean).join(", ");

  // 1) Group order: mark paid, split into per-member allocations, email claim links.
  if (order.group_id) {
    try {
      await admin.rpc("mark_group_paid", { p_group_id: order.group_id, p_order_id: order.id });
      await admin.rpc("create_group_ticket_allocations", { p_order_id: order.id });
      const { data: recips } = await admin.rpc("get_group_claim_recipients", { p_order_id: order.id });
      for (const r of (recips ?? []) as { to_email: string; to_name: string | null; qty: number; token: string; buyer_name: string | null; event_title: string; event_start_date: string; event_start_time: string | null; city: string; state: string; venue_name: string | null }[]) {
        const cl = groupTicketClaimEmail({
          recipientName: r.to_name, buyerName: r.buyer_name ?? "", eventTitle: r.event_title,
          eventWhen: `${fmtDate(r.event_start_date)}${fmtTime(r.event_start_time) ? ` · ${fmtTime(r.event_start_time)}` : ""}`,
          eventWhere: [r.venue_name, r.city, r.state].filter(Boolean).join(", "),
          qty: r.qty, claimUrl: `${EMAIL.site}/tickets/claim/${r.token}`,
        });
        const sent = await sendEmail({ to: r.to_email, subject: cl.subject, html: cl.html, text: cl.text, type: "group_ticket_claim" });
        await recordEmailLog(admin as SupabaseClient, { userId: null, toEmail: r.to_email, type: "group_ticket_claim", subject: cl.subject, status: sent.error ? "failed" : "sent", trigger: "automatic", providerId: sent.id, error: sent.error });
      }
    } catch (e) { console.error("group fulfillment error:", e instanceof Error ? e.message : e); }
  }

  // 2) Buyer confirmation / receipt. (Best-effort: the order is already confirmed
  //    above — never let an email hiccup throw, which would make Stripe retry and
  //    then skip fulfillment since the order is no longer `pending`.)
  try {
    const conf = orderConfirmationEmail({
      buyerName: order.buyer_name, receiptNum: receiptNum(order.id), qty: order.qty,
      unitPrice: Number(order.unit_price) || 0, discountPct: Number(order.discount_pct) || 0, discountAmount: Number(order.discount_amount) || 0,
      rameeloFee: Number(order.rameelo_fee) || 0, processingFee: Number(order.processing_fee) || 0, grandTotal: Number(order.grand_total) || 0,
      tierName, eventTitle: ev?.title ?? "your event", artistName: artist,
      eventWhen, eventWhere: where,
      directionsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`,
      ticketsUrl: `${EMAIL.site}/portal/tickets`, buyMoreUrl: `${EMAIL.site}/events`,
      comboEventNames,
    });
    const r1 = await sendEmail({ to: order.buyer_email, subject: conf.subject, html: conf.html, text: conf.text, type: "order_confirmation" });
    await recordEmailLog(admin as SupabaseClient, { userId: order.user_id, toEmail: order.buyer_email, type: "order_confirmation", subject: conf.subject, status: r1.error ? "failed" : "sent", trigger: "automatic", providerId: r1.id, error: r1.error, orderId: order.id });
  } catch (e) { console.error("buyer confirmation email error:", e instanceof Error ? e.message : e); }

  // 3) Organizing team alert (org owners/admins + the event creator).
  try {
    const memberIds = ev?.org_id
      ? ((await admin.from("organization_members").select("user_id").eq("org_id", ev.org_id).in("role", ["owner", "admin"])).data ?? []).map(m => m.user_id)
      : [];
    const ids = Array.from(new Set([...memberIds, ev?.organizer_id].filter(Boolean))) as string[];
    const { data: profs } = ids.length ? await admin.from("profiles").select("email, first_name").in("id", ids) : { data: [] };
    for (const p of ((profs ?? []) as { email: string | null; first_name: string | null }[]).filter(p => p.email)) {
      const unitPrice = Number(order.unit_price) || 0;
      const discountAmount = Number(order.discount_amount) || 0;
      const tn = orderTeamNotificationEmail({
        recipientFirstName: p.first_name, buyerFirstName: (order.buyer_name || "").trim().split(" ")[0] || "Someone",
        qty: order.qty, tierName, unitPrice, discountAmount, promoCode: order.promo_code,
        faceValue: Math.max(0, order.qty * unitPrice - discountAmount),
        eventTitle: ev?.title ?? "", artistName: artist, eventWhen, eventWhere: where,
        bannerUrl: ev?.cover_image_url ?? null, ordersUrl: `${EMAIL.site}/organizer/events/${order.event_id}/orders`,
        paymentMethod: order.payment_method,
      });
      const sent = await sendEmail({ to: p.email as string, subject: tn.subject, html: tn.html, text: tn.text, type: "order_team_notification" });
      await recordEmailLog(admin as SupabaseClient, { toEmail: p.email as string, type: "order_team_notification", subject: tn.subject, status: sent.error ? "failed" : "sent", trigger: "automatic", providerId: sent.id, error: sent.error });
    }
  } catch (e) { console.error("team notify error:", e instanceof Error ? e.message : e); }

  // 3.5) Platform-admin alert — detailed internal record (full buyer contact, price
  //      breakdown, and Rameelo's effective profit after Stripe's cost). Goes to every
  //      admin EXCEPT those who opted out of this event's order emails.
  try {
    const { data: optouts } = await admin.from("admin_event_email_optouts").select("user_id").eq("event_id", order.event_id);
    const optedOut = new Set(((optouts ?? []) as { user_id: string }[]).map(r => r.user_id));
    const { data: admins } = await admin.from("profiles").select("id, email").eq("role", "admin");
    const recipients = ((admins ?? []) as { id: string; email: string | null }[])
      .filter(a => a.email && !optedOut.has(a.id));
    if (recipients.length) {
      const an = orderAdminNotificationEmail({
        buyerName: order.buyer_name, buyerEmail: order.buyer_email, buyerPhone: order.buyer_phone,
        qty: order.qty, tierName, unitPrice: Number(order.unit_price) || 0, discountAmount: Number(order.discount_amount) || 0,
        promoCode: order.promo_code,
        rameeloFee: Number(order.rameelo_fee) || 0, processingFee: Number(order.processing_fee) || 0, grandTotal: Number(order.grand_total) || 0,
        paymentMethod: order.payment_method, eventTitle: ev?.title ?? "", artistName: artist, eventWhen, eventWhere: where,
        receiptNum: receiptNum(order.id), orderUrl: `${EMAIL.site}/admin/events/${order.event_id}`,
        placedAt: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
      });
      for (const a of recipients) {
        const sent = await sendEmail({ to: a.email as string, subject: an.subject, html: an.html, text: an.text, type: "order_admin_notification" });
        await recordEmailLog(admin as SupabaseClient, { toEmail: a.email as string, type: "order_admin_notification", subject: an.subject, status: sent.error ? "failed" : "sent", trigger: "automatic", providerId: sent.id, error: sent.error });
      }
    }
  } catch (e) { console.error("admin notify error:", e instanceof Error ? e.message : e); }

  // 4) Save the payment method (last-4 / brand) to the order + buyer's account.
  try {
    const full = await getStripe().paymentIntents.retrieve(pi.id, { expand: ["payment_method"] });
    const pm = full.payment_method as Stripe.PaymentMethod | null;
    if (pm && typeof pm !== "string") {
      let brand = "", last4 = "", expMonth: number | null = null, expYear: number | null = null;
      if (pm.type === "card" && pm.card) { brand = pm.card.brand ?? ""; last4 = pm.card.last4 ?? ""; expMonth = pm.card.exp_month ?? null; expYear = pm.card.exp_year ?? null; }
      else if (pm.type === "us_bank_account" && pm.us_bank_account) { brand = pm.us_bank_account.bank_name ?? ""; last4 = pm.us_bank_account.last4 ?? ""; }
      const customerId = typeof full.customer === "string" ? full.customer : full.customer?.id ?? "";
      await admin.rpc("save_order_payment_method", { p_order_id: order.id, p_pm_id: pm.id, p_customer_id: customerId, p_type: pm.type, p_brand: brand, p_last4: last4, p_exp_month: expMonth, p_exp_year: expYear });
    }
  } catch (e) { console.error("save payment method error:", e instanceof Error ? e.message : e); }
}

// ACH initiated (not yet cleared) — tell the buyer their tickets are reserved.
async function notifyAchProcessing(paymentIntentId: string) {
  const admin = createAdminClient();
  const { data: o } = await admin
    .from("orders")
    .select(`id, user_id, buyer_name, buyer_email, qty, payment_method,
      events ( title, start_date, start_time, city, state, venue_name, artists ( name ) ),
      ticket_tiers ( name )`)
    .eq("stripe_payment_intent_id", paymentIntentId)
    .eq("status", "pending")
    .maybeSingle();

  const order = o as {
    id: string; user_id: string | null; buyer_name: string | null; buyer_email: string; qty: number; payment_method: string;
    events: FulfillEvent; ticket_tiers: { name: string } | null;
  } | null;
  if (!order || order.payment_method !== "ach" || !order.buyer_email) return;

  const ev = order.events;
  const artist = one(ev?.artists)?.name ?? null;
  const eventWhen = ev ? `${fmtDate(ev.start_date)}${fmtTime(ev.start_time) ? ` · ${fmtTime(ev.start_time)}` : ""}` : "";
  const where = [ev?.venue_name, ev?.city, ev?.state].filter(Boolean).join(", ");

  const { subject, html, text } = ticketsPendingEmail({
    buyerName: order.buyer_name, receiptNum: receiptNum(order.id), qty: order.qty,
    tierName: order.ticket_tiers?.name ?? "Ticket", eventTitle: ev?.title ?? "", artistName: artist,
    eventWhen, eventWhere: where, ticketsUrl: `${EMAIL.site}/portal/tickets`,
  });
  const sent = await sendEmail({ to: order.buyer_email, subject, html, text, type: "tickets_pending" });
  await recordEmailLog(admin as SupabaseClient, { userId: order.user_id, toEmail: order.buyer_email, type: "tickets_pending", subject, status: sent.error ? "failed" : "sent", trigger: "automatic", providerId: sent.id, error: sent.error, orderId: order.id });
}

// Cancels the order tied to a failed/canceled PaymentIntent and releases its seat.
// A *card* decline during active checkout is left pending (the buyer is retrying on
// the page), so we only cancel when forced (PI canceled), or for ACH bounces, or a
// confirmed order failing. Emails the buyer when it's a real cancellation.
async function failOrderForIntent(pi: Stripe.PaymentIntent, reason: string, forceCancel: boolean) {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("orders")
    .select("id, status, payment_method")
    .eq("stripe_payment_intent_id", pi.id)
    .in("status", ["confirmed", "pending"])
    .maybeSingle();
  if (!existing) return; // unknown or already handled

  const isAch = existing.payment_method === "ach";
  // Leave card checkout declines pending for a retry; cancel only when meaningful.
  if (!forceCancel && existing.status === "pending" && !isAch) return;

  const { data: rows } = await admin
    .from("orders")
    .update({ status: "cancelled", cancellation_reason: `Payment failed: ${reason}`, cancelled_at: new Date().toISOString() })
    .eq("id", existing.id)
    .in("status", ["confirmed", "pending"])
    .select("id, user_id, buyer_name, buyer_email, qty, event_id");

  const order = rows?.[0];
  if (!order || !order.buyer_email) return;

  const { data: ev } = await admin.from("events").select("title").eq("id", order.event_id).single();
  const { subject, html, text } = paymentFailedEmail({
    buyerName: order.buyer_name, eventTitle: ev?.title ?? "your event", qty: order.qty,
    reason, retryUrl: `${EMAIL.site}/events`,
  });
  const sent = await sendEmail({ to: order.buyer_email, subject, html, text, type: "payment_failed" });
  await recordEmailLog(admin as SupabaseClient, { userId: order.user_id, toEmail: order.buyer_email, type: "payment_failed", subject, status: sent.error ? "failed" : "sent", trigger: "automatic", providerId: sent.id, error: sent.error, orderId: order.id });
}
