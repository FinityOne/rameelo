import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { provisionPromoAccounts } from "@/lib/promo-accounts";

export const runtime = "nodejs";
export const maxDuration = 60;

// Admin: backfill platform accounts for all giveaway leads that don't have one
// yet (and report how many still need one via GET). Idempotent — safe to re-run.
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { supabase };
}

export async function GET() {
  const { error, supabase } = await requireAdmin();
  if (error) return error;
  // Count leads still missing an account (unlinked entries with a valid email).
  const { count } = await supabase!
    .from("promotion_entries")
    .select("id", { count: "exact", head: true })
    .is("user_id", null);
  return NextResponse.json({ pending: count ?? 0 });
}

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;
  if (!serviceRoleConfigured) return NextResponse.json({ error: "Account provisioning isn't configured on the server." }, { status: 503 });

  const admin = createAdminClient();
  const result = await provisionPromoAccounts(admin);
  return NextResponse.json({ ok: true, ...result });
}
