// ── Buyer-facing fees ─────────────────────────────────────────────────────────
// The 3% Rameelo platform fee is ALWAYS charged on the ticket FACE value (qty ×
// unit price, before any organizer group discount) — so Rameelo's cut is never
// eroded by an organizer's discount. The 5% card processing fee applies to the
// post-discount ticket subtotal (the amount actually being charged for tickets);
// ACH is fee-free. Both fees are paid by the buyer, never deducted from the org.

export const RAMEELO_FEE_PCT = 0.03;
export const CARD_FEE_PCT = 0.05;

const round2 = (n: number) => Math.round(n * 100) / 100;

export type PayMethod = "card" | "ach";

/**
 * @param faceSubtotal  pre-discount ticket subtotal (qty × unit price)
 * @param afterDiscount ticket subtotal after the organizer group discount
 * @param method        card adds the 5% processing fee; ACH is free
 */
export function computeFees(faceSubtotal: number, afterDiscount: number, method: PayMethod) {
  const rameeloFee    = round2(faceSubtotal * RAMEELO_FEE_PCT);          // 3% on FACE value
  const processingFee = method === "card" ? round2(afterDiscount * CARD_FEE_PCT) : 0;
  const grandTotal    = round2(afterDiscount + rameeloFee + processingFee);
  return { rameeloFee, processingFee, grandTotal };
}

// ── Stripe processing cost & Rameelo's effective profit ───────────────────────
// What STRIPE charges Rameelo to move the money (a cost to us, distinct from the
// fees the buyer pays). Card: 2.9% + $0.30 per transaction. ACH: 0.8%, capped at
// $5.00 (Stripe's real ACH ceiling). Effective profit is the buyer-paid fee
// revenue (Rameelo platform fee + card processing fee) minus this Stripe cost.
export const STRIPE_CARD_PCT  = 0.029;
export const STRIPE_CARD_FLAT = 0.30; // per transaction
export const STRIPE_ACH_PCT   = 0.008;
export const STRIPE_ACH_CAP   = 5.00; // per transaction

export function stripeCost(grandTotal: number, method: PayMethod): number {
  if (method === "card") return round2(grandTotal * STRIPE_CARD_PCT + STRIPE_CARD_FLAT);
  return Math.min(round2(grandTotal * STRIPE_ACH_PCT), STRIPE_ACH_CAP);
}

/**
 * Rameelo's effective profit on a single order.
 * @returns platformRevenue (rameeloFee + processingFee charged to buyer),
 *          stripeCost (what Stripe takes), and netProfit (revenue − cost).
 */
export function effectiveProfit(rameeloFee: number, processingFee: number, grandTotal: number, method: PayMethod) {
  const platformRevenue = round2((Number(rameeloFee) || 0) + (Number(processingFee) || 0));
  const cost = stripeCost(grandTotal, method);
  return { platformRevenue, stripeCost: cost, netProfit: round2(platformRevenue - cost) };
}
