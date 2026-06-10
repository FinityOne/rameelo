import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// ── Service-role Supabase client (server-only) ────────────────────────────────
// Bypasses RLS — use ONLY in trusted server contexts that have no user session,
// like the Stripe webhook (Stripe calls us with no cookies). The service-role key
// must NEVER be exposed to the browser; it lives in SUPABASE_SERVICE_ROLE_KEY
// (server env only — `.env.local` locally, Vercel project env in production).

export const serviceRoleConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) must be set for the admin client.");
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
