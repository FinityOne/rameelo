import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret, payoutCryptoConfigured } from "@/lib/payout-crypto";

export const runtime = "nodejs";

// Sets an org's payout account. The full account number is encrypted here (server
// side) and only the ciphertext + last-4 are stored. The set_org_payout_account
// RPC enforces owner/admin + write-once (locked), keyed by the caller's session.
export async function POST(request: Request) {
  if (!payoutCryptoConfigured()) {
    return NextResponse.json({ error: "Payouts aren't configured yet (PAYOUT_ENC_KEY missing)." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const orgId   = typeof body.orgId === "string" ? body.orgId : "";
  const holder  = typeof body.holder === "string" ? body.holder.trim() : "";
  const bank    = typeof body.bank === "string" ? body.bank.trim() : "";
  const type    = body.type === "savings" ? "savings" : "checking";
  const routing = String(body.routing ?? "").replace(/\D/g, "");
  const account = String(body.accountNumber ?? "").replace(/\D/g, "");

  if (!orgId || !holder || !bank || routing.length !== 9 || account.length < 4) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  const enc = encryptSecret(account);
  const { error } = await supabase.rpc("set_org_payout_account", {
    p_org_id: orgId,
    p_holder: holder,
    p_bank: bank,
    p_type: type,
    p_routing: routing,
    p_account_last4: account.slice(-4),
    p_account_enc: enc,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
