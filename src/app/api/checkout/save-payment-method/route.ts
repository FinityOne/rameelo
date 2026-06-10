import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getStripe, stripeConfigured } from "@/lib/stripe/server";

export const runtime = "nodejs";

// After a successful payment, read the real payment method from Stripe (server-side,
// with the secret key) and persist last-4 / brand / type to the order + the buyer's
// saved methods. We never store full card or bank numbers — only the masked display
// fields and Stripe ids. The DB write goes through a recency-guarded, write-once
// SECURITY DEFINER RPC, so a guest checkout can save without RLS exposure.
export async function POST(request: Request) {
  if (!stripeConfigured) return NextResponse.json({ ok: true, skipped: "stripe-not-configured" });

  const body = await request.json().catch(() => ({}));
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  const paymentIntentId = typeof body.paymentIntentId === "string" ? body.paymentIntentId : "";
  if (!orderId || !paymentIntentId) return NextResponse.json({ error: "Missing orderId/paymentIntentId" }, { status: 400 });

  try {
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["payment_method"] });

    const pm = pi.payment_method as Stripe.PaymentMethod | null;
    if (!pm || typeof pm === "string") return NextResponse.json({ ok: true, skipped: "no-method" });

    const customerId = typeof pi.customer === "string" ? pi.customer : pi.customer?.id ?? "";

    // Pull the masked display bits per method type (card vs bank).
    let brand = "", last4 = "", expMonth: number | null = null, expYear: number | null = null;
    if (pm.type === "card" && pm.card) {
      brand = pm.card.brand ?? "";
      last4 = pm.card.last4 ?? "";
      expMonth = pm.card.exp_month ?? null;
      expYear = pm.card.exp_year ?? null;
    } else if (pm.type === "us_bank_account" && pm.us_bank_account) {
      brand = pm.us_bank_account.bank_name ?? "";
      last4 = pm.us_bank_account.last4 ?? "";
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("save_order_payment_method", {
      p_order_id: orderId,
      p_pm_id: pm.id,
      p_customer_id: customerId,
      p_type: pm.type,
      p_brand: brand,
      p_last4: last4,
      p_exp_month: expMonth,
      p_exp_year: expYear,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, saved: { type: pm.type, brand, last4 } });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
