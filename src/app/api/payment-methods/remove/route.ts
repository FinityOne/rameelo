import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, stripeConfigured } from "@/lib/stripe/server";

export const runtime = "nodejs";

// Removes a saved payment method: detaches it from Stripe and deletes the row.
// Ownership is enforced by RLS — the row is only visible/deletable to its owner,
// so a member can never touch someone else's method.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // RLS scopes this to the caller's own methods.
  const { data: row } = await supabase
    .from("payment_methods")
    .select("id, stripe_payment_method_id")
    .eq("id", id)
    .single();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Detach from Stripe (best-effort — still remove the row if already detached).
  if (stripeConfigured && row.stripe_payment_method_id) {
    try { await getStripe().paymentMethods.detach(row.stripe_payment_method_id); } catch { /* ignore */ }
  }

  const { error } = await supabase.from("payment_methods").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
