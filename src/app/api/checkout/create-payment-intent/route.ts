import { NextResponse } from "next/server";
import { getStripe, stripeConfigured, STRIPE_TEST_MODE } from "@/lib/stripe/server";

export const runtime = "nodejs";

// Creates a Stripe PaymentIntent for one checkout. The buyer's chosen method
// drives both the amount (card carries the processing fee, ACH is fee-free) and
// the allowed payment_method_types, so we scope the intent to that single method.
export async function POST(request: Request) {
  if (!stripeConfigured) {
    return NextResponse.json(
      { error: "Payments aren't configured yet. Add your Stripe keys to enable checkout." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const amount = Math.round(Number(body.amount)); // smallest currency unit (cents)
  const method = body.paymentMethod === "ach" ? "us_bank_account" : "card";
  const email = typeof body.email === "string" ? body.email : undefined;

  if (!Number.isFinite(amount) || amount < 50) {
    // Stripe's minimum charge is $0.50; free tickets are handled without Stripe.
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      payment_method_types: [method],
      receipt_email: email,
      // Lightweight context for reconciliation in the Stripe dashboard.
      metadata: {
        event_id: typeof body.eventId === "string" ? body.eventId : "",
        tier_id: typeof body.tierId === "string" ? body.tierId : "",
        group_id: typeof body.groupId === "string" ? body.groupId : "",
        qty: String(body.qty ?? ""),
      },
    });

    return NextResponse.json({ clientSecret: intent.client_secret, isTest: STRIPE_TEST_MODE });
  } catch (e) {
    console.error("create-payment-intent error:", e);
    // In test mode surface the real Stripe message so it's debuggable; in live
    // mode keep it generic so buyers never see internal details.
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: STRIPE_TEST_MODE ? `Stripe error: ${detail}` : "Could not start payment. Please try again." },
      { status: 500 }
    );
  }
}
