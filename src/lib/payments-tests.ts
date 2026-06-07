// ── Payments test suite ───────────────────────────────────────────────────────
// Deterministic, DB-free verification of every money calculation in the checkout
// flow. Runs the REAL production helpers (computeFees + the tier discount helpers)
// against hand-computed expected values, so a regression in pricing, discounting,
// the 3% platform fee, the 5% card fee, or ACH math is caught immediately.
//
// Each test states its criteria and emits per-assertion expected/actual/pass.

import { computeFees, RAMEELO_FEE_PCT, CARD_FEE_PCT } from "./fees";
import {
  groupDiscountPct,
  groupDiscountAmount,
  groupScalingLevels,
  tierHasGroupDiscount,
  type TierDiscountFields,
} from "./group-orders";

export type Assertion = { label: string; expected: string; actual: string; pass: boolean };
export type PaymentTest = {
  id: string;
  name: string;
  category: "Base pricing" | "Flat discount" | "Scaling discount" | "ACH" | "Edge cases" | "Fee integrity";
  criteria: string;
  scenario: string;
  assertions: Assertion[];
  pass: boolean;
};

const money = (n: number) => `$${n.toFixed(2)}`;
const pct = (n: number) => `${n}%`;
// Money is rounded to cents; compare with a sub-cent tolerance.
const eq = (a: number, b: number) => Math.abs(a - b) < 0.005;

function assertMoney(label: string, actual: number, expected: number): Assertion {
  return { label, expected: money(expected), actual: money(actual), pass: eq(actual, expected) };
}
function assertNum(label: string, actual: number, expected: number, fmt: (n: number) => string = String): Assertion {
  return { label, expected: fmt(expected), actual: fmt(actual), pass: eq(actual, expected) };
}
function assertBool(label: string, actual: boolean, expected: boolean): Assertion {
  return { label, expected: String(expected), actual: String(actual), pass: actual === expected };
}

// Build a tier object the discount helpers understand.
function tier(p: Partial<TierDiscountFields> & { price: number }): TierDiscountFields {
  return {
    group_discount_mode: null,
    group_discount_min_qty: null,
    group_discount_type: null,
    group_discount_value: null,
    group_discount_tiers: null,
    ...p,
  };
}

// A full checkout scenario: price, qty, the tier's discount config, and method.
// Computes the discount + fees exactly as the live flow does and asserts the
// breakdown against the caller-provided expectations.
function checkoutCase(opts: {
  id: string;
  name: string;
  category: PaymentTest["category"];
  criteria: string;
  price: number;
  qty: number;
  t: TierDiscountFields;
  method: "card" | "ach";
  expect: { discountPct?: number; discount: number; fee: number; processing: number; total: number };
}): PaymentTest {
  const { price, qty, t, method, expect } = opts;
  const faceSubtotal = price * qty;
  const livePct = groupDiscountPct(t, qty);
  const discount = groupDiscountAmount(t, qty, faceSubtotal);
  const afterDiscount = +(faceSubtotal - discount).toFixed(2);
  const { rameeloFee, processingFee, grandTotal } = computeFees(faceSubtotal, afterDiscount, method);

  const a: Assertion[] = [];
  if (expect.discountPct !== undefined) a.push(assertNum("Discount %", livePct, expect.discountPct, pct));
  a.push(assertMoney("Face subtotal (pre-discount)", faceSubtotal, price * qty));
  a.push(assertMoney("Discount applied", discount, expect.discount));
  a.push(assertMoney("Ticket subtotal after discount", afterDiscount, +(price * qty - expect.discount).toFixed(2)));
  a.push(assertMoney(`Rameelo fee (${RAMEELO_FEE_PCT * 100}% of FACE)`, rameeloFee, expect.fee));
  a.push(assertMoney(`Card processing (${method === "card" ? CARD_FEE_PCT * 100 + "% of discounted" : "ACH free"})`, processingFee, expect.processing));
  a.push(assertMoney("Grand total charged", grandTotal, expect.total));

  return {
    id: opts.id, name: opts.name, category: opts.category, criteria: opts.criteria,
    scenario: `${qty} × ${money(price)}${tierHasGroupDiscount(t) ? " with organizer discount" : ""}, paid by ${method === "card" ? "card" : "ACH"}.`,
    assertions: a,
    pass: a.every(x => x.pass),
  };
}

export function runPaymentTests(): PaymentTest[] {
  const tests: PaymentTest[] = [];

  // ── Base pricing ──
  tests.push(checkoutCase({
    id: "base-card", name: "Single tier, card, no discount", category: "Base pricing",
    criteria: "3% Rameelo fee + 5% card fee on a plain purchase; no discount.",
    price: 50, qty: 2, t: tier({ price: 50 }), method: "card",
    // face 100 · fee 3 · card 5 · total 108
    expect: { discount: 0, fee: 3.0, processing: 5.0, total: 108.0 },
  }));
  tests.push(checkoutCase({
    id: "base-ach", name: "Single tier, ACH, no discount", category: "Base pricing",
    criteria: "ACH carries no processing fee; only the 3% platform fee applies.",
    price: 100, qty: 1, t: tier({ price: 100 }), method: "ach",
    // face 100 · fee 3 · proc 0 · total 103
    expect: { discount: 0, fee: 3.0, processing: 0, total: 103.0 },
  }));

  // ── Flat (simple) discount — % and $ ──
  tests.push(checkoutCase({
    id: "flat-pct-card", name: "Flat % discount — fee stays on face", category: "Flat discount",
    criteria: "10% off at 10+; the 3% fee must be charged on the $250 FACE value, not the $225 discounted subtotal.",
    price: 25, qty: 10, method: "card",
    t: tier({ price: 25, group_discount_mode: "simple", group_discount_min_qty: 10, group_discount_type: "percentage", group_discount_value: 10 }),
    // face 250 · disc 25 · after 225 · fee 3%*250=7.50 · card 5%*225=11.25 · total 243.75
    expect: { discountPct: 10, discount: 25.0, fee: 7.5, processing: 11.25, total: 243.75 },
  }));
  tests.push(checkoutCase({
    id: "flat-fixed-card", name: "Flat $ discount per ticket — exact dollars", category: "Flat discount",
    criteria: "$5 off each at 5+; discount = $5 × qty exactly; 3% fee still on face.",
    price: 40, qty: 5, method: "card",
    t: tier({ price: 40, group_discount_mode: "simple", group_discount_min_qty: 5, group_discount_type: "fixed", group_discount_value: 5 }),
    // face 200 · disc 25 · after 175 · fee 3%*200=6.00 · card 5%*175=8.75 · total 189.75
    expect: { discount: 25.0, fee: 6.0, processing: 8.75, total: 189.75 },
  }));
  tests.push(checkoutCase({
    id: "flat-below-min", name: "Below minimum quantity — no discount", category: "Flat discount",
    criteria: "Buying 3 when the discount needs 5 → no discount applies; full fees.",
    price: 25, qty: 3, method: "card",
    t: tier({ price: 25, group_discount_mode: "simple", group_discount_min_qty: 5, group_discount_type: "percentage", group_discount_value: 10 }),
    // face 75 · disc 0 · fee 2.25 · card 3.75 · total 81
    expect: { discountPct: 0, discount: 0, fee: 2.25, processing: 3.75, total: 81.0 },
  }));

  // ── Scaling discount — custom levels ──
  const scalingTier = tier({
    price: 30,
    group_discount_mode: "scaling",
    group_discount_tiers: [{ min_qty: 5, percent: 10 }, { min_qty: 8, percent: 12 }, { min_qty: 10, percent: 15 }],
  });
  tests.push(checkoutCase({
    id: "scale-l1", name: "Scaling — entry level (5–7 → 10%)", category: "Scaling discount",
    criteria: "6 tickets sits in the 5+ band → 10% off; fee on face.",
    price: 30, qty: 6, method: "card", t: scalingTier,
    // face 180 · disc 18 · after 162 · fee 3%*180=5.40 · card 5%*162=8.10 · total 175.50
    expect: { discountPct: 10, discount: 18.0, fee: 5.4, processing: 8.1, total: 175.5 },
  }));
  tests.push(checkoutCase({
    id: "scale-l2", name: "Scaling — mid level (8–9 → 12%)", category: "Scaling discount",
    criteria: "9 tickets → the 8+ band applies, not 5+.",
    price: 30, qty: 9, method: "card", t: scalingTier,
    // face 270 · disc 32.40 · after 237.60 · fee 3%*270=8.10 · card 5%*237.60=11.88 · total 257.58
    expect: { discountPct: 12, discount: 32.4, fee: 8.1, processing: 11.88, total: 257.58 },
  }));
  tests.push(checkoutCase({
    id: "scale-l3", name: "Scaling — top level (10+ → 15%)", category: "Scaling discount",
    criteria: "12 tickets → highest band (15%); fee still on the full $360 face.",
    price: 30, qty: 12, method: "card", t: scalingTier,
    // face 360 · disc 54 · after 306 · fee 3%*360=10.80 · card 5%*306=15.30 · total 332.10
    expect: { discountPct: 15, discount: 54.0, fee: 10.8, processing: 15.3, total: 332.1 },
  }));
  tests.push(checkoutCase({
    id: "scale-below", name: "Scaling — below first level (no discount)", category: "Scaling discount",
    criteria: "4 tickets is under the 5+ entry band → no discount.",
    price: 30, qty: 4, method: "card", t: scalingTier,
    // face 120 · disc 0 · fee 3.60 · card 6.00 · total 129.60
    expect: { discountPct: 0, discount: 0, fee: 3.6, processing: 6.0, total: 129.6 },
  }));
  tests.push(checkoutCase({
    id: "scale-ach", name: "Scaling discount over ACH", category: "Scaling discount",
    criteria: "Scaling 15% via ACH: 3% fee on face, no processing fee.",
    price: 30, qty: 10, method: "ach", t: scalingTier,
    // face 300 · disc 45 · after 255 · fee 9.00 · proc 0 · total 264
    expect: { discountPct: 15, discount: 45.0, fee: 9.0, processing: 0, total: 264.0 },
  }));

  // ── ACH with discount ──
  tests.push(checkoutCase({
    id: "ach-flat", name: "Flat % discount over ACH", category: "ACH",
    criteria: "ACH never adds processing; 3% platform fee on face even with a discount.",
    price: 20, qty: 10, method: "ach",
    t: tier({ price: 20, group_discount_mode: "simple", group_discount_min_qty: 5, group_discount_type: "percentage", group_discount_value: 15 }),
    // face 200 · disc 30 · after 170 · fee 6.00 · proc 0 · total 176
    expect: { discountPct: 15, discount: 30.0, fee: 6.0, processing: 0, total: 176.0 },
  }));

  // ── Edge cases ──
  tests.push(checkoutCase({
    id: "free", name: "Free ticket ($0)", category: "Edge cases",
    criteria: "A $0 ticket yields $0 fees and $0 total (Stripe is skipped for free orders).",
    price: 0, qty: 2, method: "card", t: tier({ price: 0 }),
    expect: { discount: 0, fee: 0, processing: 0, total: 0 },
  }));
  tests.push(checkoutCase({
    id: "rounding", name: "Rounding to whole cents", category: "Edge cases",
    criteria: "$33.33 × 3 = $99.99; 3% = $2.9997 must round to $3.00, never a fraction of a cent.",
    price: 33.33, qty: 3, method: "ach", t: tier({ price: 33.33 }),
    // face 99.99 · fee round(2.9997)=3.00 · proc 0 · total 102.99
    expect: { discount: 0, fee: 3.0, processing: 0, total: 102.99 },
  }));
  tests.push(checkoutCase({
    id: "discount-rounding", name: "Percentage discount rounding", category: "Edge cases",
    criteria: "12% of $270 = $32.40 exact; 5% card of $237.60 = $11.88; totals stay to the cent.",
    price: 45, qty: 6, method: "card",
    t: tier({ price: 45, group_discount_mode: "simple", group_discount_min_qty: 5, group_discount_type: "percentage", group_discount_value: 12 }),
    // face 270 · disc 32.40 · after 237.60 · fee 3%*270=8.10 · card 11.88 · total 257.58
    expect: { discountPct: 12, discount: 32.4, fee: 8.1, processing: 11.88, total: 257.58 },
  }));

  // ── Fee-integrity unit tests on the helpers directly ──
  {
    const t1 = tier({ price: 100, group_discount_mode: "simple", group_discount_min_qty: 4, group_discount_type: "fixed", group_discount_value: 10 });
    const a: Assertion[] = [
      assertNum("$10 off on a $100 tier → 10% effective", groupDiscountPct(t1, 4), 10, pct),
      assertMoney("groupDiscountAmount exact ($10 × 4)", groupDiscountAmount(t1, 4, 400), 40),
      assertBool("Tier reports it has a discount", tierHasGroupDiscount(t1), true),
      assertBool("No discount below min qty (3 of 4)", groupDiscountPct(t1, 3) === 0, true),
    ];
    tests.push({
      id: "helper-fixed", name: "Helper: fixed-$ discount → percentage + exact $", category: "Fee integrity",
      criteria: "groupDiscountPct converts $-off to the equivalent % of price; groupDiscountAmount keeps exact dollars.",
      scenario: "$100 tier, $10 off each at 4+.",
      assertions: a, pass: a.every(x => x.pass),
    });
  }
  {
    const t2 = tier({ price: 30, group_discount_mode: "scaling", group_discount_tiers: [{ min_qty: 10, percent: 15 }, { min_qty: 5, percent: 10 }, { min_qty: 8, percent: 12 }] });
    const levels = groupScalingLevels(t2);
    const a: Assertion[] = [
      assertNum("Levels normalized & sorted ascending — count", levels.length, 3),
      assertNum("Lowest level min qty", levels[0]?.minQty ?? -1, 5),
      assertNum("Highest level min qty", levels[2]?.minQty ?? -1, 10),
      assertNum("qty 7 → 10% (entry band)", groupDiscountPct(t2, 7), 10, pct),
      assertNum("qty 8 → 12% (exact boundary)", groupDiscountPct(t2, 8), 12, pct),
      assertNum("qty 100 → caps at top level 15%", groupDiscountPct(t2, 100), 15, pct),
    ];
    tests.push({
      id: "helper-scaling", name: "Helper: scaling levels normalize, sort & pick highest", category: "Fee integrity",
      criteria: "Out-of-order scaling levels are sorted; the highest qualifying band applies; boundaries are inclusive.",
      scenario: "Scaling tier with levels entered out of order: 10→15%, 5→10%, 8→12%.",
      assertions: a, pass: a.every(x => x.pass),
    });
  }
  {
    // Invariant: fee on face >= fee on discounted, and organizer never loses the cut.
    const t3 = tier({ price: 25, group_discount_mode: "simple", group_discount_min_qty: 10, group_discount_type: "percentage", group_discount_value: 10 });
    const face = 250, disc = groupDiscountAmount(t3, 10, face), after = face - disc;
    const onFace = computeFees(face, after, "ach").rameeloFee;
    const onDiscounted = +(after * RAMEELO_FEE_PCT).toFixed(2);
    const a: Assertion[] = [
      assertMoney("Fee charged (on $250 face)", onFace, 7.5),
      assertMoney("Fee if it were on discounted $225 (wrong)", onDiscounted, 6.75),
      assertBool("Face-value fee > discounted fee (Rameelo protected)", onFace > onDiscounted, true),
    ];
    tests.push({
      id: "invariant-face-fee", name: "Invariant: platform fee never eroded by discounts", category: "Fee integrity",
      criteria: "The 3% fee on face value is strictly greater than (or equal to) charging it on the discounted subtotal — proving organizer discounts don't reduce Rameelo's revenue.",
      scenario: "$25 × 10 @ 10% off.",
      assertions: a, pass: a.every(x => x.pass),
    });
  }

  return tests;
}
