"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Fee constants (mirrors checkout logic) ────────────────────────────────────
const STRIPE_CARD_PCT      = 0.029;
const STRIPE_CARD_FLAT     = 0.30;  // per transaction
const STRIPE_ACH_PCT       = 0.008;
const STRIPE_ACH_CAP       = 5.00;  // per transaction

type PaymentMethod = "card" | "ach";

const CHARGEBACK_RESERVE = 0.20;
const AVAILABLE_PCT      = 0.80;

type OrderRow = {
  id: string;
  event_id: string;
  qty: number;
  unit_price: number;
  discount_amount: number;
  rameelo_fee: number;
  processing_fee: number;
  service_fee: number;
  grand_total: number;
  payment_method: PaymentMethod;
  status: string;
  created_at: string;
  events: { title: string; city: string; state: string; org_id: string | null; organizations: { id: string; name: string } | null } | null;
};

// Per-organizer payout summary
type OrgPayoutRow = {
  org_id: string;
  org_name: string;
  event_count: number;
  gross_revenue: number;
  platform_fees: number;
  net_to_organizer: number;
  reserve_held: number;
  available_to_pay: number;
  order_count: number;
};

type ProcessedOrder = OrderRow & {
  ticketSubtotal: number;
  stripeCost: number;
  netRameeloPerOrder: number;
};

function stripeCostForOrder(grandTotal: number, method: PaymentMethod): number {
  if (method === "card") {
    return Math.round((grandTotal * STRIPE_CARD_PCT + STRIPE_CARD_FLAT) * 100) / 100;
  }
  return Math.min(Math.round(grandTotal * STRIPE_ACH_PCT * 100) / 100, STRIPE_ACH_CAP);
}

function fmtCurrency(n: number, opts?: { sign?: boolean }) {
  const abs = Math.abs(n);
  const prefix = opts?.sign ? (n < 0 ? "−$" : "+$") : "$";
  if (abs >= 1_000_000) return `${prefix}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${prefix}${(abs / 1_000).toFixed(1)}K`;
  return `${prefix}${abs.toFixed(2)}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminFinancialsPage() {
  const [orders, setOrders]     = useState<ProcessedOrder[]>([]);
  const [orgPayouts, setOrgPayouts] = useState<OrgPayoutRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<"overview" | "orders" | "payouts">("overview");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("orders")
        .select(`
          id, event_id, qty, unit_price, discount_amount,
          rameelo_fee, processing_fee, service_fee, grand_total,
          payment_method, status, created_at,
          events (title, city, state, org_id, organizations (id, name))
        `)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false });

      const rows = (data ?? []) as unknown as OrderRow[];
      const processed: ProcessedOrder[] = rows.map(o => {
        const ticketSubtotal = o.unit_price * o.qty - (o.discount_amount ?? 0);
        const stripeCost     = stripeCostForOrder(o.grand_total, o.payment_method ?? "card");
        const rf = o.rameelo_fee   ?? o.service_fee * 0.3;
        const pf = o.processing_fee ?? o.service_fee * 0.7;
        const netRameeloPerOrder = rf + pf - stripeCost;
        return { ...o, rameelo_fee: rf, processing_fee: pf, ticketSubtotal, stripeCost, netRameeloPerOrder };
      });

      // Build per-organizer aggregation
      const orgMap = new Map<string, OrgPayoutRow>();
      for (const o of processed) {
        const orgId   = o.events?.org_id ?? "unlinked";
        const orgName = o.events?.organizations?.name ?? "Unlinked Events";
        const existing = orgMap.get(orgId);
        const gross      = o.ticketSubtotal;
        const platFee    = o.rameelo_fee;
        const net        = gross - platFee;
        const reserve    = Math.round(net * CHARGEBACK_RESERVE * 100) / 100;
        const available  = Math.round(net * AVAILABLE_PCT * 100) / 100;
        if (!existing) {
          orgMap.set(orgId, {
            org_id: orgId, org_name: orgName,
            event_count: 1, gross_revenue: gross, platform_fees: platFee,
            net_to_organizer: net, reserve_held: reserve,
            available_to_pay: available, order_count: 1,
          });
        } else {
          existing.gross_revenue   += gross;
          existing.platform_fees   += platFee;
          existing.net_to_organizer+= net;
          existing.reserve_held    += reserve;
          existing.available_to_pay+= available;
          existing.order_count     += 1;
          // Count unique events via event_id set (simplified: track by count changes)
        }
      }
      // Count unique events per org
      const eventsByOrg = new Map<string, Set<string>>();
      for (const o of processed) {
        const orgId = o.events?.org_id ?? "unlinked";
        if (!eventsByOrg.has(orgId)) eventsByOrg.set(orgId, new Set());
        eventsByOrg.get(orgId)!.add(o.event_id);
      }
      for (const [orgId, events] of eventsByOrg) {
        const row = orgMap.get(orgId);
        if (row) row.event_count = events.size;
      }

      setOrders(processed);
      setOrgPayouts(Array.from(orgMap.values()).sort((a, b) => b.gross_revenue - a.gross_revenue));
      setLoading(false);
    }
    load();
  }, []);

  // ── Aggregates ────────────────────────────────────────────────────────────
  const totalOrders          = orders.length;
  const cardOrders           = orders.filter(o => (o.payment_method ?? "card") === "card");
  const achOrders            = orders.filter(o => o.payment_method === "ach");

  const grossTicketRevenue   = orders.reduce((s, o) => s + o.ticketSubtotal, 0);
  const totalGrossCharge     = orders.reduce((s, o) => s + o.grand_total, 0);
  const totalRameeloFees     = orders.reduce((s, o) => s + o.rameelo_fee, 0);
  const totalProcessingFees  = orders.reduce((s, o) => s + o.processing_fee, 0);
  const totalStripeCosts     = orders.reduce((s, o) => s + o.stripeCost, 0);
  const totalStripeCostCard  = cardOrders.reduce((s, o) => s + o.stripeCost, 0);
  const totalStripeCostACH   = achOrders.reduce((s, o) => s + o.stripeCost, 0);
  const achSubsidy           = totalStripeCostACH; // we eat this since attendees pay $0
  const netRameeloIncome     = totalRameeloFees + totalProcessingFees - totalStripeCosts;
  const organizerPayouts     = grossTicketRevenue; // face value minus discounts

  const cardPct = totalOrders > 0 ? (cardOrders.length / totalOrders) * 100 : 0;

  // ── KPI tiles ─────────────────────────────────────────────────────────────
  const kpis = [
    {
      label: "Gross Ticket Revenue",
      value: fmtCurrency(grossTicketRevenue),
      sub: `${totalOrders} confirmed order${totalOrders !== 1 ? "s" : ""}`,
      color: "#0E8C7A",
      icon: "💰",
      note: "Face value of tickets sold (after discounts)"
    },
    {
      label: "Rameelo Platform Fees",
      value: fmtCurrency(totalRameeloFees),
      sub: "3% of each ticket subtotal",
      color: "#2E1B30",
      icon: "🏷️",
      note: "Platform fee retained by Rameelo"
    },
    {
      label: "Processing Fees Collected",
      value: fmtCurrency(totalProcessingFees),
      sub: `3.5% on card · free on ACH`,
      color: "#2E1B30",
      icon: "💳",
      note: "Passed through from attendees on card payments"
    },
    {
      label: "Stripe Costs Paid",
      value: fmtCurrency(totalStripeCosts),
      sub: `Card: ${fmtCurrency(totalStripeCostCard)} · ACH: ${fmtCurrency(totalStripeCostACH)}`,
      color: "#7C1F2C",
      icon: "📤",
      note: "Card: 2.9% + $0.30 · ACH: 0.8% capped at $5"
    },
    {
      label: "ACH Subsidy (Absorbed)",
      value: fmtCurrency(achSubsidy),
      sub: `${achOrders.length} ACH order${achOrders.length !== 1 ? "s" : ""}`,
      color: "#a06b00",
      icon: "⚖️",
      note: "Stripe ACH costs we eat since attendees pay $0"
    },
    {
      label: "Net Rameelo Income",
      value: fmtCurrency(netRameeloIncome),
      sub: "Fees collected minus Stripe costs",
      color: netRameeloIncome >= 0 ? "#0E8C7A" : "#7C1F2C",
      icon: "📊",
      note: "(Rameelo fee + processing fee) − all Stripe costs"
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Financial Overview</h2>
          <p className="font-ui text-ink-muted text-sm mt-0.5">
            {loading ? "—" : `${totalOrders} confirmed order${totalOrders !== 1 ? "s" : ""} · ${fmtCurrency(totalGrossCharge)} total collected`}
          </p>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 bg-ivory rounded-2xl p-1 border border-ivory-200 shrink-0">
          {(["overview", "orders", "payouts"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl font-ui font-semibold text-sm transition-all capitalize ${tab === t ? "bg-white text-ink shadow-sm border border-ivory-200" : "text-ink-muted hover:text-ink"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : tab === "overview" ? (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {kpis.map(kpi => (
              <div key={kpi.label} className="bg-white rounded-2xl border border-ivory-200 p-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">{kpi.icon}</span>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted leading-none">{kpi.label}</p>
                </div>
                <p className="font-display font-bold" style={{ fontSize: 24, color: kpi.color, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                  {kpi.value}
                </p>
                <p className="font-ui text-[11px] text-ink-muted/70 mt-1 leading-snug">{kpi.sub}</p>
                <p className="font-mono text-[9px] text-ink-muted/50 mt-1.5 leading-snug">{kpi.note}</p>
              </div>
            ))}
          </div>

          {/* Payment method split */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-4">Payment Method Split</p>
            <div className="space-y-3">
              {/* Card */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-aubergine" />
                    <span className="font-ui text-sm text-ink font-medium">Credit / Debit Card</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-ink">{cardOrders.length} orders · {Math.round(cardPct)}%</span>
                </div>
                <div className="h-3 bg-ivory-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-aubergine transition-all duration-700" style={{ width: `${cardPct}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="font-mono text-[10px] text-ink-muted">
                    Collected: {fmtCurrency(cardOrders.reduce((s, o) => s + o.processing_fee, 0))} in card fees
                  </span>
                  <span className="font-mono text-[10px] text-ink-muted">
                    Paid Stripe: {fmtCurrency(totalStripeCostCard)}
                  </span>
                </div>
              </div>

              {/* ACH */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-peacock" />
                    <span className="font-ui text-sm text-ink font-medium">Bank / ACH Transfer</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-ink">{achOrders.length} orders · {Math.round(100 - cardPct)}%</span>
                </div>
                <div className="h-3 bg-ivory-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-peacock transition-all duration-700" style={{ width: `${100 - cardPct}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="font-mono text-[10px] text-peacock font-bold">$0 collected (free for attendees)</span>
                  <span className="font-mono text-[10px] text-[#a06b00]">We ate: {fmtCurrency(achSubsidy)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* P&L waterfall */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Fee Waterfall</p>
              <p className="font-ui text-xs text-ink-muted mt-0.5">How money flows from each ticket sale</p>
            </div>
            <div className="divide-y divide-ivory-200">
              {[
                { label: "Ticket subtotal collected",        value: totalGrossCharge,         sign: "+", color: "text-peacock",     note: "Total charged to attendees" },
                { label: "Organizer payout (ticket face value)", value: -organizerPayouts,    sign: "−", color: "text-ink-muted",   note: "Goes to organizer" },
                { label: "Rameelo platform fees (3%)",       value: totalRameeloFees,         sign: "=", color: "text-aubergine",   note: "Rameelo retains this" },
                { label: "Card processing fees (3.5%)",      value: totalProcessingFees,      sign: "+", color: "text-aubergine",   note: "Collected from card payers" },
                { label: "Stripe card costs (2.9% + $0.30)", value: -totalStripeCostCard,     sign: "−", color: "text-durga",      note: "Paid to Stripe per card tx" },
                { label: "Stripe ACH costs (0.8%, cap $5)",  value: -totalStripeCostACH,      sign: "−", color: "text-[#a06b00]",  note: "Paid to Stripe — we absorb this" },
                { label: "Net Rameelo income",                value: netRameeloIncome,         sign: "=", color: netRameeloIncome >= 0 ? "text-peacock font-bold" : "text-durga font-bold", note: "What Rameelo actually keeps" },
              ].map((row, i) => (
                <div key={i} className={`px-5 py-3.5 flex items-start justify-between gap-4 ${i === 6 ? "bg-ivory" : ""}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[11px] font-bold w-5 shrink-0 ${row.sign === "=" ? "text-ink-muted" : row.sign === "+" ? "text-peacock" : "text-durga"}`}>
                        {row.sign}
                      </span>
                      <p className={`font-ui text-sm ${row.color}`}>{row.label}</p>
                    </div>
                    <p className="font-mono text-[9px] text-ink-muted/60 ml-7 mt-0.5">{row.note}</p>
                  </div>
                  <span className={`font-mono text-sm font-bold shrink-0 ${row.color}`}>
                    {row.value >= 0 ? "$" : "−$"}{Math.abs(row.value).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stripe rate reference */}
          <div className="rounded-2xl border border-ivory-200 bg-white p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Stripe Rate Reference (Live)</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  method: "Credit / Debit Card",
                  stripeRate: "2.9% + $0.30",
                  attendeeRate: "3.5%",
                  rameeloMargin: "~0.6% margin",
                  icon: "💳",
                  color: "bg-aubergine/8 border-aubergine/20",
                },
                {
                  method: "Bank / ACH Transfer",
                  stripeRate: "0.8% (cap $5.00)",
                  attendeeRate: "Free",
                  rameeloMargin: "Rameelo absorbs",
                  icon: "🏦",
                  color: "bg-peacock/8 border-peacock/20",
                },
              ].map(r => (
                <div key={r.method} className={`rounded-xl border p-4 ${r.color}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{r.icon}</span>
                    <p className="font-ui font-semibold text-ink text-sm">{r.method}</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-ink-muted">Stripe charges us</span>
                      <span className="font-mono font-bold text-ink">{r.stripeRate}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-ink-muted">We charge attendees</span>
                      <span className="font-mono font-bold text-ink">{r.attendeeRate}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-black/8 pt-1.5">
                      <span className="font-mono text-ink-muted">Net to Rameelo</span>
                      <span className="font-mono font-bold text-aubergine">{r.rameeloMargin}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="font-mono text-[9px] text-ink-muted/60 mt-3">
              Stripe rates as of 2026 · stripe.com/pricing · ACH: stripe.com/docs/ach-debit · All fees applied to gross charge amount
            </p>
          </div>
        </>
      ) : tab === "orders" ? (
        /* Orders tab */
        orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-ivory-200 p-16 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-ui text-ink-muted text-sm">No confirmed orders yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">All Orders</p>
              <p className="font-mono text-[10px] text-ink-muted">{orders.length} confirmed · {fmtCurrency(totalGrossCharge)} total</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-ivory-200">
                    {["Event", "Date", "Method", "Tickets", "Subtotal", "Rameelo Fee", "Processing Fee", "Stripe Cost", "Net"].map(h => (
                      <th key={h} className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {orders.map(o => {
                    const netPerOrder = o.rameelo_fee + o.processing_fee - o.stripeCost;
                    const isACH = (o.payment_method ?? "card") === "ach";
                    return (
                      <tr key={o.id} className="hover:bg-ivory/40 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-ui text-sm text-ink font-medium truncate max-w-[150px]">{o.events?.title ?? "—"}</p>
                          <p className="font-mono text-[9px] text-ink-muted">{o.events?.city}, {o.events?.state}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-ink-muted whitespace-nowrap">{fmtDate(o.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${isACH ? "bg-peacock/15 text-peacock" : "bg-aubergine/10 text-aubergine"}`}>
                            {isACH ? "ACH" : "Card"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-ink-muted">{o.qty}×</td>
                        <td className="px-4 py-3 font-mono text-sm text-ink">${o.ticketSubtotal.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-aubergine">${o.rameelo_fee.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-[11px]">
                          <span className={isACH ? "text-peacock font-bold" : "text-ink-muted"}>
                            {isACH ? "FREE" : `$${o.processing_fee.toFixed(2)}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-durga">${o.stripeCost.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-[11px] font-bold">
                          <span className={netPerOrder >= 0 ? "text-peacock" : "text-durga"}>
                            {netPerOrder >= 0 ? "+" : "−"}${Math.abs(netPerOrder).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ivory-200 bg-ivory">
                    <td colSpan={4} className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted">Totals</td>
                    <td className="px-4 py-3 font-mono text-sm font-bold text-ink">${grossTicketRevenue.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-sm font-bold text-aubergine">${totalRameeloFees.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-sm font-bold text-ink-muted">${totalProcessingFees.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-sm font-bold text-durga">${totalStripeCosts.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-sm font-bold">
                      <span className={netRameeloIncome >= 0 ? "text-peacock" : "text-durga"}>
                        {netRameeloIncome >= 0 ? "+" : "−"}${Math.abs(netRameeloIncome).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      ) : tab === "payouts" ? (
          /* ── Organizer Payouts Tab ── */
          <div className="space-y-4">
            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total organizer net",  value: fmtCurrency(orgPayouts.reduce((s, o) => s + o.net_to_organizer, 0)), color: "#0E8C7A" },
                { label: "Reserve held (20%)",   value: fmtCurrency(orgPayouts.reduce((s, o) => s + o.reserve_held, 0)),     color: "#a06b00" },
                { label: "Available to pay out", value: fmtCurrency(orgPayouts.reduce((s, o) => s + o.available_to_pay, 0)), color: "#2E1B30" },
                { label: "Organizers tracked",   value: String(orgPayouts.filter(o => o.org_id !== "unlinked").length),       color: "#2E1B30" },
              ].map(kpi => (
                <div key={kpi.label} className="bg-white rounded-2xl border border-ivory-200 p-4">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{kpi.label}</p>
                  <p className="font-display font-bold mt-1" style={{ fontSize: 22, color: kpi.color, letterSpacing: "-0.03em" }}>
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Reserve explainer */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-marigold/8 border border-marigold/20">
              <svg className="w-4 h-4 text-[#a06b00] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="font-mono text-[10px] text-[#a06b00]">
                20% chargeback reserve withheld from each payout · Released 30 days post-event · Available = 80% of organizer net
              </p>
            </div>

            {/* Per-organizer table */}
            {orgPayouts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-ivory-200 p-12 text-center">
                <p className="font-ui text-sm text-ink-muted">No confirmed orders yet. Link events to organizations to see per-organizer data.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
                <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Organizer Payout Summary</p>
                  <p className="font-mono text-[10px] text-ink-muted">{orgPayouts.length} organizer{orgPayouts.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-ivory-200">
                        {["Organization", "Events", "Orders", "Gross Revenue", "Platform Fee (3%)", "Net to Organizer", "Reserve (20%)", "Available (80%)", "Status"].map(h => (
                          <th key={h} className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ivory-200">
                      {orgPayouts.map(org => {
                        const isUnlinked = org.org_id === "unlinked";
                        return (
                          <tr key={org.org_id} className={`hover:bg-ivory/40 transition-colors ${isUnlinked ? "opacity-60" : ""}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-aubergine/10 flex items-center justify-center text-aubergine font-bold text-xs shrink-0">
                                  {org.org_name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-ui text-sm font-semibold text-ink">{org.org_name}</p>
                                  {isUnlinked && <p className="font-mono text-[9px] text-durga">no org linked</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-ink-muted">{org.event_count}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-ink-muted">{org.order_count}</td>
                            <td className="px-4 py-3 font-mono text-sm font-bold text-ink">${org.gross_revenue.toFixed(2)}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-aubergine">${org.platform_fees.toFixed(2)}</td>
                            <td className="px-4 py-3 font-mono text-sm font-bold text-ink">${org.net_to_organizer.toFixed(2)}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-[#a06b00]">${org.reserve_held.toFixed(2)}</td>
                            <td className="px-4 py-3 font-mono text-sm font-bold text-peacock">${org.available_to_pay.toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-widest ${isUnlinked ? "bg-ivory-200 text-ink-muted" : "bg-peacock/12 text-peacock"}`}>
                                <span className={`w-1 h-1 rounded-full ${isUnlinked ? "bg-ink-muted" : "bg-peacock"}`} />
                                {isUnlinked ? "unlinked" : "active"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-ivory-200 bg-ivory">
                        <td colSpan={3} className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted">Totals</td>
                        <td className="px-4 py-3 font-mono text-sm font-bold text-ink">
                          ${orgPayouts.reduce((s, o) => s + o.gross_revenue, 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm font-bold text-aubergine">
                          ${orgPayouts.reduce((s, o) => s + o.platform_fees, 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm font-bold text-ink">
                          ${orgPayouts.reduce((s, o) => s + o.net_to_organizer, 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm font-bold text-[#a06b00]">
                          ${orgPayouts.reduce((s, o) => s + o.reserve_held, 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm font-bold text-peacock">
                          ${orgPayouts.reduce((s, o) => s + o.available_to_pay, 0).toFixed(2)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null
      }
    </div>
  );
}
