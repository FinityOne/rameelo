import Stripe from "stripe";

// ── Stripe (server-side) ──────────────────────────────────────────────────────
// One secret key drives everything. Put your *test* key in `.env.local` for
// local `npm run dev`, and your *live* key in Vercel's env vars for production —
// the code auto-detects which mode it's in from the key prefix (sk_test_ vs
// sk_live_), so no other changes are needed between environments.
//
// Get your keys at: https://dashboard.stripe.com/apikeys  (toggle Test/Live)
//
//   .env.local (LOCAL DEV — TEST keys):
//     STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx        # <-- your Stripe TEST secret key
//     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxx   # <-- your Stripe TEST publishable key
//
//   Vercel → Project → Settings → Environment Variables (PRODUCTION — LIVE keys):
//     STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx        # <-- your Stripe LIVE secret key
//     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxx   # <-- your Stripe LIVE publishable key

const SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";

// True when running against Stripe test mode (test secret key). Orders paid in
// test mode are flagged `is_test` so they're excluded from live revenue.
export const STRIPE_TEST_MODE = SECRET_KEY.startsWith("sk_test_");

export const stripeConfigured = SECRET_KEY.length > 0;

// Instantiated lazily so a missing key doesn't crash unrelated routes at import.
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add your Stripe secret key to .env.local (test) and Vercel (live)."
    );
  }
  if (!_stripe) _stripe = new Stripe(SECRET_KEY);
  return _stripe;
}
