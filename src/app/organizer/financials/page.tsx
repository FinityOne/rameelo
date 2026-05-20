"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "../org-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type EventMeta = {
  id: string;
  title: string;
  start_date: string;
  status: string;
};

type RawOrder = {
  id: string;
  event_id: string;
  qty: number;
  unit_price: number;
  discount_amount: number;
  grand_total: number;
  payment_method: "card" | "ach" | null;
  created_at: string;
};

type MonthBucket = { label: string; gross: number; payout: number };

// ── Constants ─────────────────────────────────────────────────────────────────

const RAMEELO_FEE_PCT = 0.03;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(n: number, compact = false) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−$" : "$";
  if (compact) {
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function orderYear(o: RawOrder) {
  return new Date(o.created_at).getFullYear();
}

function ticketSubtotal(o: RawOrder) {
  return o.unit_price * o.qty - (o.discount_amount ?? 0);
}

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Monthly bar chart ─────────────────────────────────────────────────────────

function MonthlyChart({ buckets }: { buckets: MonthBucket[] }) {
  const maxVal = Math.max(...buckets.map(b => b.payout), 1);
  const hasAny = buckets.some(b => b.payout > 0);
  if (!hasAny) return null;

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-4">Monthly Earnings</p>
      <div className="flex items-end gap-1.5 h-24">
        {buckets.map((b, i) => {
          const heightPct = maxVal > 0 ? (b.payout / maxVal) * 100 : 0;
          const isNow = i === new Date().getMonth() && new Date().getFullYear() === parseInt(b.label.split(" ")[1] ?? "0");
          return (
            <div key={b.label} className="flex-1 flex flex-col items-center gap-1 group relative">
              {b.payout > 0 && (
                <div
                  className="absolute -top-7 left-1/2 -translate-x-1/2 bg-aubergine text-white font-mono text-[8px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                >
                  {fmtMoney(b.payout, true)}
                </div>
              )}
              <div className="w-full flex items-end" style={{ height: 80 }}>
                <div
                  className="w-full rounded-t transition-all duration-500"
                  style={{
                    height: `${heightPct}%`,
                    minHeight: b.payout > 0 ? 3 : 0,
                    backgroundColor: isNow ? "#F5A623" : b.payout > 0 ? "#0E8C7A" : "#EBE6DB",
                    opacity: b.payout > 0 ? 1 : 0.4,
                  }}
                />
              </div>
              <span className="font-mono text-[8px] text-ink-muted whitespace-nowrap">{MONTHS_SHORT[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Payment Mix ───────────────────────────────────────────────────────────────

function PaymentMix({ orders }: { orders: RawOrder[] }) {
  const total = orders.length;
  if (total === 0) return null;

  const cardOrders = orders.filter(o => (o.payment_method ?? "card") === "card");
  const achOrders  = orders.filter(o => o.payment_method === "ach");
  const cardPct    = Math.round((cardOrders.length / total) * 100);
  const achPct     = 100 - cardPct;

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">How fans paid</p>
          <p className="font-ui text-xs text-ink-muted mt-0.5">Payment method split across your orders</p>
        </div>
      </div>

      {/* Visual split bar */}
      <div className="h-3 rounded-full overflow-hidden flex mb-4">
        <div className="h-full transition-all duration-700" style={{ width: `${cardPct}%`, backgroundColor: "#2E1B30" }} />
        <div className="h-full flex-1 transition-all duration-700" style={{ backgroundColor: "#0E8C7A" }} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-start gap-2.5">
          <div className="w-3 h-3 rounded-sm bg-aubergine mt-0.5 shrink-0" />
          <div>
            <p className="font-ui text-sm font-semibold text-ink">Card</p>
            <p className="font-mono text-[10px] text-ink-muted">{cardOrders.length} orders · {cardPct}%</p>
            <p className="font-mono text-[9px] text-ink-muted/60 mt-0.5">
              {fmtMoney(cardOrders.reduce((s, o) => s + ticketSubtotal(o), 0), true)} in sales
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="w-3 h-3 rounded-sm bg-peacock mt-0.5 shrink-0" />
          <div>
            <p className="font-ui text-sm font-semibold text-ink">Bank Transfer</p>
            <p className="font-mono text-[10px] text-ink-muted">{achOrders.length} orders · {achPct}%</p>
            <p className="font-mono text-[9px] text-ink-muted/60 mt-0.5">
              {fmtMoney(achOrders.reduce((s, o) => s + ticketSubtotal(o), 0), true)} in sales
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrganizerFinancialsPage() {
  const { activeOrg } = useOrg();
  const [allEvents, setAllEvents]   = useState<EventMeta[]>([]);
  const [allOrders, setAllOrders]   = useState<RawOrder[]>([]);
  const [loading, setLoading]       = useState(true);

  // Filters
  const [selectedYear, setSelectedYear]   = useState<number>(new Date().getFullYear());
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [showFeeNote, setShowFeeNote]     = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const evQuery = supabase
        .from("events")
        .select("id, title, start_date, status")
        .order("start_date", { ascending: false });
      const { data: eventsData } = await (activeOrg
        ? evQuery.eq("org_id", activeOrg.id)
        : evQuery.eq("organizer_id", user.id));

      const events = (eventsData ?? []) as EventMeta[];
      setAllEvents(events);

      if (events.length === 0) { setLoading(false); return; }

      const eventIds = events.map(e => e.id);
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, event_id, qty, unit_price, discount_amount, grand_total, payment_method, created_at")
        .in("event_id", eventIds)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false });

      setAllOrders((ordersData ?? []) as RawOrder[]);
      setLoading(false);
    }
    load();
  }, [activeOrg]);

  // ── Derived: available years from order data ─────────────────────────────
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(allOrders.map(orderYear))).sort((a, b) => b - a);
    if (!years.includes(new Date().getFullYear())) years.unshift(new Date().getFullYear());
    return years;
  }, [allOrders]);

  // ── Filtered orders ───────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return allOrders.filter(o => {
      const yearMatch  = orderYear(o) === selectedYear;
      const eventMatch = selectedEvent === "all" || o.event_id === selectedEvent;
      return yearMatch && eventMatch;
    });
  }, [allOrders, selectedYear, selectedEvent]);

  // ── Aggregates ────────────────────────────────────────────────────────────
  const totalGross   = filteredOrders.reduce((s, o) => s + ticketSubtotal(o), 0);
  const rameeloFee   = Math.round(totalGross * RAMEELO_FEE_PCT * 100) / 100;
  const netPayout    = totalGross - rameeloFee;
  const totalTickets = filteredOrders.reduce((s, o) => s + o.qty, 0);
  const totalOrders  = filteredOrders.length;
  const avgOrder     = totalOrders > 0 ? netPayout / totalOrders : 0;

  // ── Monthly buckets ───────────────────────────────────────────────────────
  const monthlyBuckets = useMemo<MonthBucket[]>(() => {
    return MONTHS_SHORT.map((label, i) => {
      const monthOrders = filteredOrders.filter(o => new Date(o.created_at).getMonth() === i);
      const gross  = monthOrders.reduce((s, o) => s + ticketSubtotal(o), 0);
      const payout = gross * (1 - RAMEELO_FEE_PCT);
      return { label, gross, payout };
    });
  }, [filteredOrders]);

  // ── Per-event breakdown ────────────────────────────────────────────────────
  const eventBreakdown = useMemo(() => {
    const relevantEvents = selectedEvent === "all" ? allEvents : allEvents.filter(e => e.id === selectedEvent);
    return relevantEvents.map(ev => {
      const evOrders = filteredOrders.filter(o => o.event_id === ev.id);
      const gross    = evOrders.reduce((s, o) => s + ticketSubtotal(o), 0);
      const fee      = Math.round(gross * RAMEELO_FEE_PCT * 100) / 100;
      const payout   = gross - fee;
      const tickets  = evOrders.reduce((s, o) => s + o.qty, 0);
      return { ev, orders: evOrders.length, tickets, gross, fee, payout };
    }).filter(row => row.orders > 0 || selectedEvent === row.ev.id);
  }, [allEvents, filteredOrders, selectedEvent]);

  // ── Status pill ────────────────────────────────────────────────────────────
  const STATUS_PILL: Record<string, { label: string; cls: string }> = {
    published:      { label: "Live",      cls: "bg-peacock/15 text-peacock" },
    pending_review: { label: "In Review", cls: "bg-marigold/20 text-[#a06b00]" },
    draft:          { label: "Draft",     cls: "bg-ivory-200 text-ink-muted" },
    rejected:       { label: "Rejected",  cls: "bg-durga/15 text-durga" },
    cancelled:      { label: "Cancelled", cls: "bg-ivory-200 text-ink-muted" },
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Earnings</h2>
          <p className="font-ui text-ink-muted text-sm mt-0.5">Your payout picture, all in one place.</p>
        </div>

        {/* Year tabs */}
        {!loading && availableYears.length > 0 && (
          <div className="flex gap-1 bg-ivory rounded-2xl p-1 border border-ivory-200">
            {availableYears.map(y => (
              <button key={y} onClick={() => setSelectedYear(y)}
                className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all ${
                  selectedYear === y ? "bg-white text-ink shadow-sm border border-ivory-200" : "text-ink-muted hover:text-ink"
                }`}>
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : allEvents.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
          <p className="text-4xl mb-4">💸</p>
          <p className="font-display font-semibold text-ink text-lg mb-2" style={{ letterSpacing: "-0.015em" }}>No earnings yet</p>
          <p className="font-ui text-ink-muted text-sm max-w-xs mx-auto mb-6">Create an event and start selling tickets — your earnings will show up here.</p>
          <Link href="/organizer/events/create"
            className="inline-flex items-center gap-2 bg-aubergine text-white font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-aubergine-light transition-colors">
            Create event →
          </Link>
        </div>
      ) : (
        <>
          {/* Event filter */}
          {allEvents.length > 1 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Show:</span>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setSelectedEvent("all")}
                  className={`px-3.5 py-1.5 rounded-full font-ui text-xs font-semibold transition-all ${
                    selectedEvent === "all"
                      ? "bg-aubergine text-white shadow-sm"
                      : "bg-white border border-ivory-200 text-ink-muted hover:border-aubergine/40 hover:text-ink"
                  }`}>
                  All events
                </button>
                {allEvents.map(ev => (
                  <button key={ev.id} onClick={() => setSelectedEvent(selectedEvent === ev.id ? "all" : ev.id)}
                    className={`px-3.5 py-1.5 rounded-full font-ui text-xs font-semibold transition-all truncate max-w-[180px] ${
                      selectedEvent === ev.id
                        ? "bg-aubergine text-white shadow-sm"
                        : "bg-white border border-ivory-200 text-ink-muted hover:border-aubergine/40 hover:text-ink"
                    }`}>
                    {ev.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Hero payout block ── */}
          <div className="rounded-2xl overflow-hidden border border-ivory-200">
            {/* Main hero */}
            <div className="bg-white px-6 py-6 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">
                  Your take-home · {selectedYear}{selectedEvent !== "all" && ` · ${allEvents.find(e => e.id === selectedEvent)?.title ?? ""}`}
                </p>
                <div className="flex items-baseline gap-3">
                  <p className="font-display font-bold text-peacock"
                    style={{ fontSize: 48, letterSpacing: "-0.04em", lineHeight: 1 }}>
                    {fmtMoney(netPayout)}
                  </p>
                  {totalGross > 0 && (
                    <div className="pb-1">
                      <p className="font-mono text-[9px] text-ink-muted leading-snug">from {fmtMoney(totalGross)} in ticket sales</p>
                      <button
                        onClick={() => setShowFeeNote(!showFeeNote)}
                        className="font-mono text-[9px] text-ink-muted/60 hover:text-ink-muted underline decoration-dotted transition-colors"
                      >
                        {showFeeNote ? "hide details" : "how is this calculated?"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline fee note — shown on demand, subtle */}
                {showFeeNote && (
                  <div className="mt-3 flex items-start gap-2.5 bg-ivory rounded-xl px-4 py-3 max-w-sm">
                    <svg className="w-3.5 h-3.5 text-ink-muted shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                      <p className="font-ui text-xs text-ink leading-relaxed">
                        Ticket sales of <strong>{fmtMoney(totalGross)}</strong> minus a 3% Rameelo platform fee
                        (<strong>{fmtMoney(rameeloFee)}</strong>) = <strong className="text-peacock">{fmtMoney(netPayout)}</strong> payout.
                      </p>
                      <p className="font-mono text-[9px] text-ink-muted/70 mt-1">
                        Platform fee covers: secure checkout, QR ticket delivery, group ordering, and buyer support — so you don&apos;t have to.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right side KPIs */}
              <div className="flex gap-5 shrink-0">
                {[
                  { label: "Tickets Sold",  value: totalTickets.toLocaleString() },
                  { label: "Orders",        value: totalOrders.toLocaleString() },
                  { label: "Avg / Order",   value: fmtMoney(avgOrder) },
                ].map(kpi => (
                  <div key={kpi.label} className="text-center sm:text-right">
                    <p className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.03em" }}>{kpi.value}</p>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-0.5">{kpi.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Payout pending banner */}
            {netPayout > 0 && (
              <div className="bg-peacock/8 border-t border-peacock/20 px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                  <p className="font-ui text-sm text-peacock font-semibold">
                    <strong>{fmtMoney(netPayout)}</strong> confirmed earnings
                  </p>
                </div>
                <p className="font-mono text-[9px] text-peacock/70 text-right hidden sm:block">
                  Payouts transferred via your connected payout method after each event
                </p>
              </div>
            )}
          </div>

          {/* ── Charts ── */}
          {totalOrders > 0 && (
            <div className="grid lg:grid-cols-2 gap-4">
              <MonthlyChart buckets={monthlyBuckets} />
              <PaymentMix orders={filteredOrders} />
            </div>
          )}

          {/* ── Event breakdown table ── */}
          {eventBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
              <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Breakdown by event</p>
                <p className="font-mono text-[10px] text-ink-muted">{selectedYear}</p>
              </div>

              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ivory-200">
                      <th className="px-5 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal">Event</th>
                      <th className="px-4 py-3 text-center font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal">Tickets</th>
                      <th className="px-4 py-3 text-right font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal">Ticket Sales</th>
                      <th className="px-4 py-3 text-right font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal opacity-60">Platform</th>
                      <th className="px-5 py-3 text-right font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal">Your Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ivory-200">
                    {eventBreakdown.map(row => {
                      const pill = STATUS_PILL[row.ev.status] ?? STATUS_PILL.draft;
                      return (
                        <tr key={row.ev.id} className="hover:bg-ivory/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="font-ui text-sm font-semibold text-ink">{row.ev.title}</p>
                                  <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0 ${pill.cls}`}>
                                    {pill.label}
                                  </span>
                                </div>
                                <p className="font-mono text-[9px] text-ink-muted">{fmtDate(row.ev.start_date)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <p className="font-display font-bold text-ink" style={{ letterSpacing: "-0.02em" }}>{row.tickets}</p>
                            <p className="font-mono text-[9px] text-ink-muted">{row.orders} order{row.orders !== 1 ? "s" : ""}</p>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <p className="font-ui text-sm text-ink">{fmtMoney(row.gross)}</p>
                          </td>
                          {/* Fee column — visually de-emphasized */}
                          <td className="px-4 py-4 text-right">
                            <p className="font-mono text-[10px] text-ink-muted/60">
                              {row.gross > 0 ? `−${fmtMoney(row.fee)}` : "—"}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <p className="font-display font-bold text-peacock text-base" style={{ letterSpacing: "-0.02em" }}>
                              {row.gross > 0 ? fmtMoney(row.payout) : "—"}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Totals row */}
                  {eventBreakdown.length > 1 && (
                    <tfoot>
                      <tr className="border-t-2 border-ivory-200 bg-ivory">
                        <td className="px-5 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted" colSpan={2}>
                          Total · {selectedYear}
                        </td>
                        <td className="px-4 py-3 text-right font-ui text-sm font-semibold text-ink">
                          {fmtMoney(totalGross)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[10px] text-ink-muted/60">
                          {totalGross > 0 ? `−${fmtMoney(rameeloFee)}` : "—"}
                        </td>
                        <td className="px-5 py-3 text-right font-display font-bold text-peacock text-base" style={{ letterSpacing: "-0.02em" }}>
                          {fmtMoney(netPayout)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-ivory-200">
                {eventBreakdown.map(row => {
                  const pill = STATUS_PILL[row.ev.status] ?? STATUS_PILL.draft;
                  return (
                    <div key={row.ev.id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-ui text-sm font-semibold text-ink truncate">{row.ev.title}</p>
                            <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0 ${pill.cls}`}>
                              {pill.label}
                            </span>
                          </div>
                          <p className="font-mono text-[9px] text-ink-muted">
                            {fmtDate(row.ev.start_date)} · {row.tickets} tickets · {row.orders} orders
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-display font-bold text-peacock text-base" style={{ letterSpacing: "-0.02em" }}>
                            {row.gross > 0 ? fmtMoney(row.payout) : "—"}
                          </p>
                          {row.gross > 0 && (
                            <p className="font-mono text-[9px] text-ink-muted/60">from {fmtMoney(row.gross)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {eventBreakdown.length > 1 && totalGross > 0 && (
                  <div className="px-4 py-4 bg-ivory flex items-center justify-between">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Total {selectedYear}</p>
                    <p className="font-display font-bold text-peacock" style={{ letterSpacing: "-0.02em" }}>{fmtMoney(netPayout)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state for year/filter combo */}
          {totalOrders === 0 && (
            <div className="bg-white rounded-2xl border border-ivory-200 p-12 text-center">
              <div className="text-3xl mb-3">📅</div>
              <p className="font-display font-semibold text-ink text-base mb-1" style={{ letterSpacing: "-0.015em" }}>
                No sales in {selectedYear}
                {selectedEvent !== "all" && " for this event"}
              </p>
              <p className="font-ui text-ink-muted text-sm">
                {selectedEvent !== "all"
                  ? "Try switching to All Events or a different year."
                  : "Try a different year, or create an event to start selling tickets."}
              </p>
              {selectedEvent !== "all" && (
                <button onClick={() => setSelectedEvent("all")}
                  className="mt-4 font-ui text-sm font-semibold text-aubergine hover:underline">
                  View all events →
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
