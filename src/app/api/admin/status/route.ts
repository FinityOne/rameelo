import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, stripeConfigured, STRIPE_TEST_MODE } from "@/lib/stripe/server";

export const runtime = "nodejs";

type Check = {
  key: string;
  label: string;
  status: "operational" | "degraded" | "down" | "not_configured";
  detail: string;
};

// Live platform health for the admin status page. Admin-gated; runs real (cheap)
// checks against Stripe, Supabase, email config, and the selling-events pipeline.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // ── Environment ──
  const vercelEnv = process.env.VERCEL_ENV ?? null; // production | preview | development (Vercel)
  const nodeEnv = process.env.NODE_ENV ?? "unknown";
  const environment = vercelEnv === "production" ? "production"
    : vercelEnv === "preview" ? "preview"
    : nodeEnv === "production" ? "production"
    : "development";
  const region = process.env.VERCEL_REGION ?? null;

  const checks: Check[] = [];

  // ── Stripe ──
  if (!stripeConfigured) {
    checks.push({ key: "stripe", label: "Stripe payments", status: "not_configured", detail: "STRIPE_SECRET_KEY is not set — checkout is disabled." });
  } else {
    try {
      const stripe = getStripe();
      const bal = await stripe.balance.retrieve();
      checks.push({
        key: "stripe",
        label: "Stripe payments",
        status: "operational",
        detail: `${STRIPE_TEST_MODE ? "TEST" : "LIVE"} mode · key valid · ${bal.available?.length ?? 0} balance currenc${(bal.available?.length ?? 0) === 1 ? "y" : "ies"}`,
      });
    } catch (e) {
      checks.push({ key: "stripe", label: "Stripe payments", status: "down", detail: `Key rejected: ${e instanceof Error ? e.message : "unknown error"}` });
    }
  }

  // ── Supabase / database ──
  try {
    const { error } = await supabase.from("events").select("id", { count: "exact", head: true });
    checks.push({
      key: "database",
      label: "Database (Supabase)",
      status: error ? "down" : "operational",
      detail: error ? error.message : "Connected · queries responding",
    });
  } catch (e) {
    checks.push({ key: "database", label: "Database (Supabase)", status: "down", detail: e instanceof Error ? e.message : "unreachable" });
  }

  // ── Email (Resend) ──
  checks.push({
    key: "email",
    label: "Email (Resend)",
    status: process.env.RESEND_API_KEY ? "operational" : "not_configured",
    detail: process.env.RESEND_API_KEY ? "API key present · sending enabled" : "RESEND_API_KEY not set — emails won't send.",
  });

  // ── Events selling on Rameelo ──
  try {
    const { count: sellingCount } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .eq("selling_on_rameelo", true);
    const { count: publishedCount } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");
    checks.push({
      key: "selling",
      label: "Events selling on Rameelo",
      status: (sellingCount ?? 0) > 0 ? "operational" : "degraded",
      detail: `${sellingCount ?? 0} live for sale · ${publishedCount ?? 0} published total`,
    });
  } catch (e) {
    checks.push({ key: "selling", label: "Events selling on Rameelo", status: "down", detail: e instanceof Error ? e.message : "query failed" });
  }

  const downOrConfig = checks.filter(c => c.status === "down").length;
  const overall: "operational" | "degraded" | "down" =
    downOrConfig > 0 ? "down" : checks.some(c => c.status === "degraded" || c.status === "not_configured") ? "degraded" : "operational";

  return NextResponse.json({
    environment,
    nodeEnv,
    vercelEnv,
    region,
    stripeMode: stripeConfigured ? (STRIPE_TEST_MODE ? "test" : "live") : "unconfigured",
    overall,
    checks,
    checkedAt: new Date().toISOString(),
  });
}
