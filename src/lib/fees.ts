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
