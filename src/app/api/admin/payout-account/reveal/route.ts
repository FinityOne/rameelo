import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { decryptSecret, payoutCryptoConfigured } from "@/lib/payout-crypto";

export const runtime = "nodejs";

// Reveals an organizer's full bank details to a platform admin — gated by BOTH an
// admin session AND a separate reveal password (PAYOUT_REVEAL_PASSWORD). The full
// account number is decrypted here from the encrypted blob and returned only on
// this authenticated, password-verified request.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const orgId = typeof body.orgId === "string" ? body.orgId : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

  const expected = process.env.PAYOUT_REVEAL_PASSWORD ?? "";
  if (!expected) return NextResponse.json({ error: "Reveal password isn't configured (PAYOUT_REVEAL_PASSWORD)." }, { status: 503 });
  if (!payoutCryptoConfigured()) return NextResponse.json({ error: "Payout encryption isn't configured (PAYOUT_ENC_KEY)." }, { status: 503 });

  // Constant-time password check (length guard avoids timingSafeEqual throwing).
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const passwordOk = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!passwordOk) return NextResponse.json({ error: "Incorrect password." }, { status: 403 });

  const [{ data: acct }, { data: enc, error: encErr }] = await Promise.all([
    supabase.from("organizer_payout_accounts")
      .select("account_holder_name, bank_name, account_type, routing_number, account_last4")
      .eq("org_id", orgId).maybeSingle(),
    supabase.rpc("get_payout_account_enc", { p_org_id: orgId }),
  ]);
  if (encErr) return NextResponse.json({ error: encErr.message }, { status: 400 });
  if (!acct || !enc) return NextResponse.json({ error: "No payout account on file." }, { status: 404 });

  let accountNumber = "";
  try { accountNumber = decryptSecret(enc as string); }
  catch { return NextResponse.json({ error: "Could not decrypt the stored account." }, { status: 500 }); }

  return NextResponse.json({
    ok: true,
    accountHolderName: acct.account_holder_name,
    bankName: acct.bank_name,
    accountType: acct.account_type,
    routingNumber: acct.routing_number,
    accountNumber,
  });
}
