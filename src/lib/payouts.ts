// ── Rameelo payout balance calculation (MVP, no ledger) ───────────────────────
// Year-1 model: Rameelo collects all revenue via Stripe; organizers request
// manual payouts. Funds become available 14 days after the order date. Balance
// is derived from existing order + payout-request data — no separate ledger.

export const SETTLEMENT_HOLD_DAYS = 14;

export type PayoutStatus = "submitted" | "approved" | "rejected" | "paid";

export type BalanceOrder = {
  created_at: string;
  qty: number;
  unit_price: number;
  discount_amount: number;
  status: string;          // 'confirmed' counts; refunded/cancelled excluded
  dispute_status: string;  // exclude open/lost disputes (chargebacks)
  order_type?: string | null; // 'manual' = offline, excluded from Rameelo payout
};

export type BalanceRequest = { amount: number; status: PayoutStatus };

// Organizer revenue per order = ticket face value (platform/processing fees are
// charged to the buyer, not deducted from the organizer).
export function orderRevenue(o: BalanceOrder): number {
  return Number(o.qty) * Number(o.unit_price) - Number(o.discount_amount);
}

function isSuccessful(o: BalanceOrder): boolean {
  if (o.status !== "confirmed") return false;            // excludes refunded/cancelled/failed
  if (o.dispute_status === "open" || o.dispute_status === "lost") return false; // excludes chargebacks/disputes
  return true;
}

export type PayoutBalance = {
  totalRevenue: number;      // all successful ONLINE order revenue (Rameelo-collected)
  settledRevenue: number;    // online revenue older than the hold window
  pendingSettlement: number; // online revenue still inside the hold window
  totalPaidOut: number;      // sum of PAID payout requests
  outstanding: number;       // sum of submitted + approved (not yet paid) requests
  availableForPayout: number;// settled − paid − outstanding (never below 0)
  manualRevenue: number;     // offline/manual revenue — collected by the organizer, NOT paid out by Rameelo
};

// Manual/offline orders are settled off Rameelo — Rameelo never holds that money,
// so it must be EXCLUDED from every payout figure and surfaced separately.
function isManual(o: BalanceOrder): boolean {
  return (o.order_type ?? "purchase") === "manual";
}

export function computeBalance(orders: BalanceOrder[], requests: BalanceRequest[]): PayoutBalance {
  const cutoff = Date.now() - SETTLEMENT_HOLD_DAYS * 86_400_000;
  let totalRevenue = 0, settledRevenue = 0, pendingSettlement = 0, manualRevenue = 0;
  for (const o of orders) {
    if (!isSuccessful(o)) continue;
    const rev = orderRevenue(o);
    if (rev <= 0) continue;
    if (isManual(o)) { manualRevenue += rev; continue; } // tracked separately, never paid out
    totalRevenue += rev;
    if (new Date(o.created_at).getTime() <= cutoff) settledRevenue += rev;
    else pendingSettlement += rev;
  }
  const totalPaidOut = requests.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);
  const outstanding = requests.filter(r => r.status === "submitted" || r.status === "approved").reduce((s, r) => s + Number(r.amount), 0);
  const availableForPayout = Math.max(0, Math.round((settledRevenue - totalPaidOut - outstanding) * 100) / 100);
  return { totalRevenue, settledRevenue, pendingSettlement, totalPaidOut, outstanding, availableForPayout, manualRevenue };
}

export const PAYOUT_PILL: Record<PayoutStatus, { label: string; cls: string }> = {
  submitted: { label: "Submitted", cls: "bg-marigold/20 text-[#a06b00]" },
  approved:  { label: "Approved",  cls: "bg-aubergine/10 text-aubergine" },
  rejected:  { label: "Rejected",  cls: "bg-durga/15 text-durga" },
  paid:      { label: "Paid",      cls: "bg-peacock/15 text-peacock" },
};

export function money(n: number): string {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
