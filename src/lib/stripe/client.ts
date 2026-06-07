import { loadStripe, type Stripe } from "@stripe/stripe-js";

// ── Stripe (browser-side) ─────────────────────────────────────────────────────
// Uses NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY. Put your *test* key in `.env.local`
// for local dev and your *live* key in Vercel — see src/lib/stripe/server.ts.

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

// True in Stripe test mode (test publishable key). Used to flag test orders.
export const STRIPE_TEST_MODE = PUBLISHABLE_KEY.startsWith("pk_test_");

export const stripeConfigured = PUBLISHABLE_KEY.length > 0;

// Single shared Stripe.js instance (load once).
let _stripePromise: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> {
  if (!PUBLISHABLE_KEY) return Promise.resolve(null);
  if (!_stripePromise) _stripePromise = loadStripe(PUBLISHABLE_KEY);
  return _stripePromise;
}
