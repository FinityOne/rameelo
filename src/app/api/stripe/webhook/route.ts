import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeConfigured, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { friendlyStripeError } from "@/lib/stripe/errors";
import { paymentFailedEmail } from "@/lib/email/templates/paymentFailed";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import { EMAIL } from "@/lib/email/theme";

// Stripe sends the raw body; we must read it verbatim to verify the signature.
export const runtime = "nodejs";

// Stripe webhook — the source of truth for async payment outcomes.
//
// Why it matters: a card decline is caught live at checkout, but a *bank/ACH*
// transfer is only "processing" at checkout and can bounce days later. Stripe
// reports that via `payment_intent.payment_failed`. This endpoint reconciles the
// order: a failed/canceled payment flips the order out of `confirmed`, which the
// quantity_sold trigger uses to release the seat — so a bounced payment never
// keeps a valid ticket. The buyer is emailed so they know to fix it.
//
// Runs with no user session (Stripe calls us), so it uses the service-role client.
export async function POST(request: Request) {
  if (!stripeConfigured || !STRIPE_WEBHOOK_SECRET) {
    // Misconfigured — tell Stripe so the dashboard surfaces it (and it retries).
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    // Bad signature → reject so nobody can spoof payment outcomes.
    const msg = e instanceof Error ? e.message : "invalid signature";
    return NextResponse.json({ error: `Webhook signature verification failed: ${msg}` }, { status: 400 });
  }

  // We can verify but can't write without the service role — ack so Stripe stops
  // retrying, but make the gap obvious in logs.
  if (!serviceRoleConfigured) {
    console.error("Stripe webhook received but SUPABASE_SERVICE_ROLE_KEY is not set — cannot reconcile order.");
    return NextResponse.json({ received: true, skipped: "no-service-role" });
  }

  try {
    switch (event.type) {
      case "payment_intent.payment_failed":
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const reason =
          event.type === "payment_intent.canceled"
            ? "The payment was canceled before it completed."
            : friendlyStripeError(pi.last_payment_error ?? undefined);
        await failOrderForIntent(pi.id, reason);
        break;
      }
      // Card success is finalized inline at checkout; a bank transfer clearing
      // later lands here. Orders are created `confirmed`, so this is a safety
      // acknowledgment — nothing to change.
      case "payment_intent.succeeded":
      default:
        break;
    }
  } catch (e) {
    // Returning 500 makes Stripe retry, which is what we want on a transient error.
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Stripe webhook handler error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// Cancels the order tied to a failed PaymentIntent (releasing its seats via the
// quantity_sold trigger) and emails the buyer. Idempotent: only acts on an order
// that's still `confirmed`, so duplicate webhook deliveries don't double-send.
async function failOrderForIntent(paymentIntentId: string, reason: string) {
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("orders")
    .update({
      status: "cancelled",
      cancellation_reason: `Payment failed: ${reason}`,
      cancelled_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .eq("status", "confirmed")
    .select("id, user_id, buyer_name, buyer_email, qty, event_id");

  const order = rows?.[0];
  if (!order) return; // unknown intent, or already handled

  // Tell the buyer their payment didn't go through and how to fix it.
  if (order.buyer_email) {
    const { data: ev } = await admin
      .from("events")
      .select("title")
      .eq("id", order.event_id)
      .single();

    const { subject, html, text } = paymentFailedEmail({
      buyerName: order.buyer_name,
      eventTitle: ev?.title ?? "your event",
      qty: order.qty,
      reason,
      retryUrl: `${EMAIL.site}/events`,
    });

    const { id: providerId, error: sendError } = await sendEmail({ to: order.buyer_email, subject, html, text });
    await recordEmailLog(admin, {
      userId: order.user_id,
      toEmail: order.buyer_email,
      type: "payment_failed",
      subject,
      status: sendError ? "failed" : "sent",
      trigger: "automatic",
      providerId,
      error: sendError,
    });
  }
}
