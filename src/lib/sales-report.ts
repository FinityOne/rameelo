// Event sales report — per-tier financial breakdown for an event.
//
// One report = rows of ticket tiers × columns of sold / revenue, with a totals
// row that sums every column. Built for admins to hand an organizer a clean,
// auditable sales statement. Two output formats share one computation:
//   • salesReportCSV()  — raw numeric values, opens straight in Excel/Sheets
//   • salesReportHTML()  — black-and-white print-ready statement (Save as PDF)
//
// Money rules (see CLAUDE.md) are enforced here so every surface agrees:
//   • Test orders are excluded from all money totals (counted separately).
//   • Only `confirmed`, non-disputed orders count toward revenue
//     (refunded / cancelled / open|lost disputes are excluded).
//   • Face value = qty × unit_price (pre-discount). Net = face − discounts.
//     The 3% Rameelo fee + card fee are charged to the buyer, never netted
//     out of organizer revenue — they're reported as a separate memo block.

export interface SalesReportTier {
  id: string;
  name: string;
  price: number;
  quantity: number; // capacity
  sale_start_date: string | null;
  sale_end_date: string | null;
}

export interface SalesReportOrder {
  tier_id: string | null;
  order_type?: string | null; // 'combo' rolls up into its own line, not a tier
  qty: number;
  unit_price: number | null;
  discount_amount: number | null;
  rameelo_fee: number | null;
  processing_fee: number | null;
  grand_total: number | null;
  status: string;
  is_test: boolean;
  dispute_status: string | null;
}

export interface SalesReportEvent {
  title: string;
  venue_name: string;
  city: string;
  state: string;
  start_date: string;
  status: string;
  selling_on_rameelo: boolean;
}

export interface SalesReportLine {
  name: string;
  price: number;        // unit price (face)
  capacity: number;
  sold: number;
  remaining: number;
  pctSold: number;      // 0–1
  grossFace: number;    // qty × unit_price
  discounts: number;
  netRevenue: number;   // grossFace − discounts
}

export interface SalesReport {
  event: SalesReportEvent;
  generatedAt: Date;
  lines: SalesReportLine[];
  totals: Omit<SalesReportLine, "name" | "price">;
  // Manual / offline sales — settled directly by the organizer, NOT via Rameelo.
  // Tracked as a separate section so online (Rameelo-collected) totals stay clean.
  manualLines: SalesReportLine[];
  manualTotals: Omit<SalesReportLine, "name" | "price">;
  // Memo: fees collected from buyers + order counts.
  rameeloFees: number;
  processingFees: number;
  liveOrders: number;
  testOrders: number;
  manualOrders: number;
}

// An order counts toward revenue only if it's a real, confirmed, undisputed sale.
function isRevenueOrder(o: SalesReportOrder): boolean {
  if (o.is_test) return false;
  if (o.status !== "confirmed") return false;
  if (o.dispute_status === "open" || o.dispute_status === "lost") return false;
  return true;
}

// Empty per-column accumulator used for the manual totals + a no-op fallback.
function emptyTotals(): Omit<SalesReportLine, "name" | "price"> {
  return { capacity: 0, sold: 0, remaining: 0, pctSold: 0, grossFace: 0, discounts: 0, netRevenue: 0 };
}

export function buildSalesReport(
  event: SalesReportEvent,
  tiers: SalesReportTier[],
  orders: SalesReportOrder[],
): SalesReport {
  const allRevenue = orders.filter(isRevenueOrder);
  // Online (Rameelo-collected) vs manual (offline, organizer-settled).
  const revenueOrders = allRevenue.filter(o => (o.order_type ?? "") !== "manual");
  const manualRevenueOrders = allRevenue.filter(o => (o.order_type ?? "") === "manual");

  // Aggregate revenue orders by tier. Combo tickets aren't a tier — they're an
  // org-spanning bundle anchored to this event — so they roll up into their own line.
  const byTier = new Map<string, { sold: number; grossFace: number; discounts: number }>();
  const comboAgg = { sold: 0, grossFace: 0, discounts: 0 };
  for (const o of revenueOrders) {
    if (o.order_type === "combo") {
      comboAgg.sold += o.qty;
      comboAgg.grossFace += o.qty * (o.unit_price ?? 0);
      comboAgg.discounts += o.discount_amount ?? 0;
      continue;
    }
    const key = o.tier_id ?? "__unassigned__";
    const acc = byTier.get(key) ?? { sold: 0, grossFace: 0, discounts: 0 };
    acc.sold += o.qty;
    acc.grossFace += o.qty * (o.unit_price ?? 0);
    acc.discounts += o.discount_amount ?? 0;
    byTier.set(key, acc);
  }

  const lines: SalesReportLine[] = tiers.map(t => {
    const agg = byTier.get(t.id) ?? { sold: 0, grossFace: 0, discounts: 0 };
    const grossFace = agg.grossFace;
    const discounts = agg.discounts;
    return {
      name: t.name,
      price: t.price,
      capacity: t.quantity,
      sold: agg.sold,
      remaining: Math.max(t.quantity - agg.sold, 0),
      pctSold: t.quantity > 0 ? agg.sold / t.quantity : 0,
      grossFace,
      discounts,
      netRevenue: grossFace - discounts,
    };
  });

  // Combo tickets line — bundles spanning multiple events, sold against this event.
  if (comboAgg.sold > 0) {
    lines.push({
      name: "Combo tickets",
      price: 0,
      capacity: 0,
      sold: comboAgg.sold,
      remaining: 0,
      pctSold: 0,
      grossFace: comboAgg.grossFace,
      discounts: comboAgg.discounts,
      netRevenue: comboAgg.grossFace - comboAgg.discounts,
    });
  }

  // Orders against a tier that no longer exists (deleted tier) — keep them visible
  // so revenue always reconciles to the dollar.
  const unassigned = byTier.get("__unassigned__");
  const knownIds = new Set(tiers.map(t => t.id));
  const orphanIds = [...byTier.keys()].filter(k => k !== "__unassigned__" && !knownIds.has(k));
  const orphanAgg = orphanIds.reduce(
    (a, k) => {
      const v = byTier.get(k)!;
      a.sold += v.sold; a.grossFace += v.grossFace; a.discounts += v.discounts;
      return a;
    },
    { sold: 0, grossFace: 0, discounts: 0 },
  );
  const extra = {
    sold: (unassigned?.sold ?? 0) + orphanAgg.sold,
    grossFace: (unassigned?.grossFace ?? 0) + orphanAgg.grossFace,
    discounts: (unassigned?.discounts ?? 0) + orphanAgg.discounts,
  };
  if (extra.sold > 0) {
    lines.push({
      name: "Other / archived tiers",
      price: 0,
      capacity: 0,
      sold: extra.sold,
      remaining: 0,
      pctSold: 0,
      grossFace: extra.grossFace,
      discounts: extra.discounts,
      netRevenue: extra.grossFace - extra.discounts,
    });
  }

  const totals = lines.reduce(
    (a, l) => {
      a.capacity += l.capacity;
      a.sold += l.sold;
      a.remaining += l.remaining;
      a.grossFace += l.grossFace;
      a.discounts += l.discounts;
      a.netRevenue += l.netRevenue;
      return a;
    },
    { capacity: 0, sold: 0, remaining: 0, pctSold: 0, grossFace: 0, discounts: 0, netRevenue: 0 },
  );
  totals.pctSold = totals.capacity > 0 ? totals.sold / totals.capacity : 0;

  // ── Manual / offline lines — one per tier that has manual sales, plus orphans. ──
  const manualByTier = new Map<string, { sold: number; grossFace: number; discounts: number }>();
  for (const o of manualRevenueOrders) {
    const key = o.tier_id ?? "__unassigned__";
    const acc = manualByTier.get(key) ?? { sold: 0, grossFace: 0, discounts: 0 };
    acc.sold += o.qty;
    acc.grossFace += o.qty * (o.unit_price ?? 0);
    acc.discounts += o.discount_amount ?? 0;
    manualByTier.set(key, acc);
  }
  const tierName = new Map(tiers.map(t => [t.id, t.name]));
  const manualLines: SalesReportLine[] = [...manualByTier.entries()].map(([key, agg]) => ({
    name: `${tierName.get(key) ?? "Other / archived tier"} — Manual (offline)`,
    price: 0,
    capacity: 0,
    sold: agg.sold,
    remaining: 0,
    pctSold: 0,
    grossFace: agg.grossFace,
    discounts: agg.discounts,
    netRevenue: agg.grossFace - agg.discounts,
  }));
  const manualTotals = manualLines.reduce((a, l) => {
    a.sold += l.sold; a.grossFace += l.grossFace; a.discounts += l.discounts; a.netRevenue += l.netRevenue;
    return a;
  }, emptyTotals());

  return {
    event,
    generatedAt: new Date(),
    lines,
    totals,
    manualLines,
    manualTotals,
    rameeloFees: revenueOrders.reduce((s, o) => s + (o.rameelo_fee ?? 0), 0),
    processingFees: revenueOrders.reduce((s, o) => s + (o.processing_fee ?? 0), 0),
    liveOrders: revenueOrders.length,
    testOrders: orders.filter(o => o.is_test).length,
    manualOrders: manualRevenueOrders.length,
  };
}

// ── Formatting helpers ────────────────────────────────────────────────────────
function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
function sanitizeFilename(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "event";
}
export function salesReportFilename(report: SalesReport, ext: string): string {
  const d = report.generatedAt.toISOString().slice(0, 10);
  return `rameelo-sales-${sanitizeFilename(report.event.title)}-${d}.${ext}`;
}

// ── CSV (Excel-ready, raw numbers so formulas work) ───────────────────────────
function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function csvRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(",");
}

export function salesReportCSV(report: SalesReport): string {
  const { event, totals } = report;
  const rows: string[] = [];

  rows.push(csvRow(["Rameelo — Event Sales Report"]));
  rows.push(csvRow(["Event", event.title]));
  rows.push(csvRow(["Venue", `${event.venue_name}, ${event.city}, ${event.state}`]));
  rows.push(csvRow(["Event date", fmtDate(event.start_date)]));
  rows.push(csvRow(["Status", event.status]));
  rows.push(csvRow(["Selling on Rameelo", event.selling_on_rameelo ? "Yes" : "No"]));
  rows.push(csvRow(["Report generated", report.generatedAt.toLocaleString("en-US")]));
  rows.push("");

  rows.push(csvRow(["TICKET TIER SALES"]));
  rows.push(csvRow([
    "Tier", "Unit Price (USD)", "Capacity", "Sold", "Remaining", "% Sold",
    "Gross Face Value (USD)", "Discounts (USD)", "Net Revenue (USD)",
  ]));
  for (const l of report.lines) {
    rows.push(csvRow([
      l.name, l.price.toFixed(2), l.capacity, l.sold, l.remaining, fmtPct(l.pctSold),
      l.grossFace.toFixed(2), l.discounts.toFixed(2), l.netRevenue.toFixed(2),
    ]));
  }
  rows.push(csvRow([
    "ONLINE TOTAL (collected by Rameelo)", "", totals.capacity, totals.sold, totals.remaining, fmtPct(totals.pctSold),
    totals.grossFace.toFixed(2), totals.discounts.toFixed(2), totals.netRevenue.toFixed(2),
  ]));
  rows.push("");

  // Manual / offline sales — settled directly by the organizer, never via Rameelo.
  if (report.manualLines.length > 0) {
    const m = report.manualTotals;
    rows.push(csvRow(["MANUAL / OFFLINE SALES — settled directly by organizer (not via Rameelo)"]));
    for (const l of report.manualLines) {
      rows.push(csvRow([
        l.name, "", "", l.sold, "", "",
        l.grossFace.toFixed(2), l.discounts.toFixed(2), l.netRevenue.toFixed(2),
      ]));
    }
    rows.push(csvRow(["MANUAL / OFFLINE TOTAL", "", "", m.sold, "", "", m.grossFace.toFixed(2), m.discounts.toFixed(2), m.netRevenue.toFixed(2)]));
    rows.push("");
    rows.push(csvRow([
      "COMBINED TOTAL (online + offline)", "", "", totals.sold + m.sold, "", "",
      (totals.grossFace + m.grossFace).toFixed(2), (totals.discounts + m.discounts).toFixed(2),
      (totals.netRevenue + m.netRevenue).toFixed(2),
    ]));
    rows.push("");
  }

  rows.push(csvRow(["PLATFORM FEES — charged to buyers (memo, not netted from revenue)"]));
  rows.push(csvRow(["Rameelo platform fee (3% of face)", report.rameeloFees.toFixed(2)]));
  rows.push(csvRow(["Card processing fees collected", report.processingFees.toFixed(2)]));
  rows.push("");
  rows.push(csvRow(["Live orders (counted)", report.liveOrders]));
  rows.push(csvRow(["Test orders (excluded)", report.testOrders]));
  rows.push("");
  rows.push(csvRow(["Note: Net Revenue = Gross Face Value − Discounts. Test, refunded/cancelled, and disputed orders are excluded from all revenue figures."]));

  return rows.join("\n");
}
