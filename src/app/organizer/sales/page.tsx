"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "../org-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type RawTier = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  quantity_sold: number;
  sort_order: number;
};

// A tier augmented with PAID-only figures derived from real confirmed orders
// (never the reserved quantity_sold, which also counts pending holds & is not
// fee/face-value aware). paidSold = qty of paid tickets; paidEarned = face value.
type Tier = RawTier & { paidSold: number; paidEarned: number };

type RawEvent = {
  id: string;
  title: string;
  start_date: string;
  status: string;
  capacity: number | null;
  created_at: string;
  ticket_tiers: RawTier[];
};

type EventStat = {
  id: string;
  title: string;
  start_date: string;
  status: string;
  tiers: Tier[];
  totalSold: number;
  totalCapacity: number;
  fillPct: number;
  maxRevenue: number;
  earnedRevenue: number;
  daysUntil: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string) {
  return Math.max(0, Math.ceil((new Date(dateStr + "T00:00:00").getTime() - Date.now()) / 86400000));
}
function fmtCurrency(n: number, compact = false) {
  if (compact) {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  }
  return `$${n.toLocaleString()}`;
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── SVG Radial Ring ───────────────────────────────────────────────────────────

function RadialRing({ pct, size = 56, stroke = 5, color = "#0E8C7A" }: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * Math.min(1, pct / 100);
  const cx = size / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#EBE6DB" strokeWidth={stroke} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display font-bold text-ink" style={{ fontSize: size * 0.24, letterSpacing: "-0.03em" }}>
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}

// ── SVG Sparkline Bar ─────────────────────────────────────────────────────────

function SparkBar({ values, color = "#0E8C7A", height = 32 }: {
  values: number[]; color?: string; height?: number;
}) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const w = 6;
  const gap = 3;
  const total = values.length * w + (values.length - 1) * gap;
  return (
    <svg width={total} height={height} className="shrink-0">
      {values.map((v, i) => {
        const barH = Math.max(2, (v / max) * height);
        return (
          <rect
            key={i}
            x={i * (w + gap)}
            y={height - barH}
            width={w}
            height={barH}
            rx={2}
            fill={color}
            opacity={0.2 + 0.8 * (i / (values.length - 1))}
          />
        );
      })}
    </svg>
  );
}

// ── Revenue Scenario Widget ───────────────────────────────────────────────────

function RevenueScenarios({ events }: { events: EventStat[] }) {
  const maxRevenue = events.reduce((s, e) => s + e.maxRevenue, 0);
  if (maxRevenue === 0) return null;

  const scenarios = [
    { label: "25% sold", pct: 25, tag: "Conservative" },
    { label: "50% sold", pct: 50, tag: "Expected" },
    { label: "75% sold", pct: 75, tag: "Strong" },
    { label: "Sold out", pct: 100, tag: "Dream" },
  ];
  const current = events.reduce((s, e) => s + e.earnedRevenue, 0);
  const currentFill = events.reduce((s, e) => s + e.totalSold, 0) / Math.max(1, events.reduce((s, e) => s + e.totalCapacity, 0)) * 100;
  const barMax = maxRevenue;

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-ivory-200 flex items-center justify-between">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Revenue Scenarios</p>
          <p className="font-display font-semibold text-ink text-base mt-0.5" style={{ letterSpacing: "-0.015em" }}>
            What different sell-through rates mean for you
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">You are here</p>
          <p className="font-display font-bold text-peacock" style={{ letterSpacing: "-0.02em" }}>
            {fmtCurrency(current, true)}
          </p>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {scenarios.map(sc => {
          const rev = maxRevenue * sc.pct / 100;
          const barPct = (rev / barMax) * 100;
          const reached = currentFill >= sc.pct;
          const isCurrent = !reached && currentFill < sc.pct && currentFill >= sc.pct - 25;
          return (
            <div key={sc.pct} className={`rounded-xl p-3.5 transition-colors ${reached ? "bg-peacock/6" : isCurrent ? "bg-marigold/5 border border-marigold/20" : "bg-ivory"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold
                    ${reached ? "bg-peacock text-white" : "bg-ivory-200 text-ink-muted"}`}>
                    {reached ? "✓ Reached" : sc.tag}
                  </span>
                  <span className="font-ui text-xs text-ink-muted">{sc.label}</span>
                </div>
                <span className={`font-display font-bold text-base ${reached ? "text-peacock" : "text-ink"}`} style={{ letterSpacing: "-0.02em" }}>
                  {fmtCurrency(rev)}
                </span>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#EBE6DB" }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${barPct}%`,
                    background: reached
                      ? "linear-gradient(90deg, #0E8C7A, #2E1B30)"
                      : isCurrent
                      ? "linear-gradient(90deg, #D4891B, #F5C030)"
                      : "#D4D0C8",
                  }}
                />
                {/* Current position marker */}
                {isCurrent && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-marigold-dark"
                    style={{ left: `${(current / barMax) * 100}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Event Comparison Chart ────────────────────────────────────────────────────

function EventComparison({ events }: { events: EventStat[] }) {
  const published = events.filter(e => e.status === "published" || e.status === "pending_review");
  if (published.length === 0) return null;
  const maxFill = 100;

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-ivory-200">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Event fill rates</p>
        <p className="font-display font-semibold text-ink text-base mt-0.5" style={{ letterSpacing: "-0.015em" }}>
          How each event is performing
        </p>
      </div>
      <div className="p-5 space-y-4">
        {published.map(ev => {
          const barColor = ev.fillPct >= 80 ? "#7C1F2C" : ev.fillPct >= 50 ? "#0E8C7A" : ev.fillPct >= 20 ? "#D4891B" : "#9B97A0";
          const daysLeft = ev.daysUntil;
          return (
            <div key={ev.id}>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <div className="min-w-0">
                  <p className="font-ui text-sm font-medium text-ink truncate">{ev.title}</p>
                  <p className="font-mono text-[9px] text-ink-muted">
                    {fmtDate(ev.start_date)}{daysLeft > 0 ? ` · ${daysLeft}d away` : " · Past"}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-display font-bold text-sm" style={{ color: barColor, letterSpacing: "-0.02em" }}>
                      {Math.round(ev.fillPct)}%
                    </p>
                    <p className="font-mono text-[8px] text-ink-muted">{ev.totalSold}/{ev.totalCapacity}</p>
                  </div>
                  <RadialRing pct={ev.fillPct} size={44} stroke={4} color={barColor} />
                </div>
              </div>
              {/* Horizontal bar */}
              <div className="relative h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "#EBE6DB" }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{ width: `${(ev.fillPct / maxFill) * 100}%`, backgroundColor: barColor, minWidth: ev.fillPct > 0 ? 4 : 0 }}
                />
              </div>
              {/* Revenue row */}
              <div className="flex justify-between mt-1">
                <span className="font-mono text-[8px] text-peacock">{fmtCurrency(ev.earnedRevenue)} earned</span>
                <span className="font-mono text-[8px] text-ink-muted">{fmtCurrency(ev.maxRevenue)} potential</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tier Performance Table ────────────────────────────────────────────────────

function TierLeaderboard({ events }: { events: EventStat[] }) {
  type TierRow = { eventTitle: string; tierName: string; price: number; sold: number; capacity: number; earned: number; fillPct: number };
  const rows: TierRow[] = [];
  for (const ev of events) {
    for (const t of ev.tiers) {
      if (t.quantity === 0) continue;
      rows.push({
        eventTitle: ev.title,
        tierName: t.name,
        price: t.price,
        sold: t.paidSold,
        capacity: t.quantity,
        earned: t.paidEarned,
        fillPct: (t.paidSold / t.quantity) * 100,
      });
    }
  }
  if (rows.length === 0) return null;
  rows.sort((a, b) => b.earned - a.earned);

  const topEarned = rows[0]?.earned ?? 1;

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-ivory-200">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Ticket tier performance</p>
        <p className="font-display font-semibold text-ink text-base mt-0.5" style={{ letterSpacing: "-0.015em" }}>
          Every tier, ranked by revenue generated
        </p>
      </div>
      <div className="divide-y divide-ivory-200">
        {rows.map((row, i) => {
          const isTop = i === 0;
          const barColor = row.fillPct >= 80 ? "#7C1F2C" : row.fillPct >= 50 ? "#0E8C7A" : "#D4891B";
          return (
            <div key={`${row.eventTitle}-${row.tierName}`} className={`px-5 py-4 ${isTop ? "bg-marigold/5" : ""}`}>
              <div className="flex items-start gap-3">
                {/* Rank */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{
                    backgroundColor: isTop ? "#F5C030" : i < 3 ? "#EBE6DB" : "#F5F3EE",
                    color: isTop ? "#2E1B30" : "#6B6B7B",
                  }}
                >
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <p className="font-ui text-sm font-semibold text-ink truncate">{row.tierName}</p>
                      <p className="font-mono text-[9px] text-ink-muted truncate">{row.eventTitle} · ${row.price}/ticket</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display font-bold text-peacock" style={{ letterSpacing: "-0.02em" }}>
                        {fmtCurrency(row.earned)}
                      </p>
                      <p className="font-mono text-[9px] text-ink-muted">{row.sold}/{row.capacity} sold</p>
                    </div>
                  </div>

                  {/* Revenue bar relative to top earner */}
                  <div className="relative h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#EBE6DB" }}>
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${(row.earned / topEarned) * 100}%`,
                        backgroundColor: barColor,
                        minWidth: row.earned > 0 ? 4 : 0,
                      }}
                    />
                  </div>

                  {/* Fill tag */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
                    <span className="font-mono text-[9px]" style={{ color: barColor }}>
                      {Math.round(row.fillPct)}% filled
                    </span>
                    {row.capacity - row.sold > 0 && (
                      <span className="font-mono text-[9px] text-ink-muted">
                        · {row.capacity - row.sold} seats remain → {fmtCurrency((row.capacity - row.sold) * row.price)} unclaimed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Revenue Breakdown ─────────────────────────────────────────────────────────

function RevenueBreakdown({ events }: { events: EventStat[] }) {
  const totalEarned = events.reduce((s, e) => s + e.earnedRevenue, 0);
  const totalMax = events.reduce((s, e) => s + e.maxRevenue, 0);
  const totalRemaining = totalMax - totalEarned;

  if (totalMax === 0) return null;

  const sections = [
    { label: "Revenue to date", value: totalEarned, color: "#0E8C7A", sub: "tickets sold × face value", bold: true },
    { label: "Remaining potential", value: totalRemaining, color: "#D4891B", sub: "if remaining seats fill" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-ivory-200">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Revenue breakdown</p>
        <p className="font-display font-semibold text-ink text-base mt-0.5" style={{ letterSpacing: "-0.015em" }}>
          Revenue picture
        </p>
      </div>
      <div className="p-5 space-y-3">
        {sections.map((s, i) => (
          <div key={s.label}>
            {i === 2 && <div className="border-t border-ivory-200 my-1" />}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <div>
                  <p className={`font-ui text-sm ${s.bold ? "font-bold text-ink" : "text-ink-muted"}`}>{s.label}</p>
                  <p className="font-mono text-[9px] text-ink-muted">{s.sub}</p>
                </div>
              </div>
              <p className={`font-display font-bold ${s.bold ? "text-lg" : "text-base"}`}
                style={{ color: s.color, letterSpacing: "-0.02em" }}>
                {s.value < 0 ? `−${fmtCurrency(Math.abs(s.value))}` : fmtCurrency(s.value)}
              </p>
            </div>
          </div>
        ))}

        <div className="mt-4 pt-4 border-t border-ivory-200 rounded-xl bg-ivory p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: "-0.02em" }}>Max potential revenue</p>
              <p className="font-mono text-[9px] text-ink-muted">if all remaining seats sell</p>
            </div>
            <p className="font-display font-bold text-aubergine text-xl" style={{ letterSpacing: "-0.03em" }}>
              {fmtCurrency(totalMax)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Velocity Insight ──────────────────────────────────────────────────────────

function VelocityInsight({ events }: { events: EventStat[] }) {
  const active = events.filter(e => e.status === "published" && e.daysUntil > 0 && e.totalCapacity > e.totalSold);
  if (active.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-ivory-200">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Sales velocity</p>
        <p className="font-display font-semibold text-ink text-base mt-0.5" style={{ letterSpacing: "-0.015em" }}>
          Daily pace needed to sell out
        </p>
      </div>
      <div className="divide-y divide-ivory-200">
        {active.map(ev => {
          const remaining = ev.totalCapacity - ev.totalSold;
          const paceNeeded = Math.ceil(remaining / Math.max(1, ev.daysUntil));
          const sparkValues = Array.from({ length: 10 }, (_, i) =>
            Math.round(ev.totalSold * (i + 1) / 10)
          );
          const urgency = paceNeeded <= 2 ? "low" : paceNeeded <= 10 ? "medium" : "high";
          const urgencyColor = urgency === "low" ? "#0E8C7A" : urgency === "medium" ? "#D4891B" : "#7C1F2C";
          const urgencyLabel = urgency === "low" ? "Comfortable pace" : urgency === "medium" ? "Steady push needed" : "Urgent — ramp up sharing";

          return (
            <div key={ev.id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-ui text-sm font-semibold text-ink truncate">{ev.title}</p>
                  <p className="font-mono text-[9px] text-ink-muted">{ev.daysUntil} days until event</p>
                </div>
                <SparkBar values={sparkValues} color={urgencyColor} height={28} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-ivory p-3 text-center">
                  <p className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>{paceNeeded}</p>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-ink-muted">tickets/day needed</p>
                </div>
                <div className="rounded-xl bg-ivory p-3 text-center">
                  <p className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>{remaining}</p>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-ink-muted">seats left</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: `${urgencyColor}10` }}>
                  <p className="font-display font-bold text-base" style={{ color: urgencyColor, letterSpacing: "-0.02em" }}>
                    {Math.round(ev.fillPct)}%
                  </p>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-ink-muted">filled</p>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: urgencyColor }} />
                <p className="font-ui text-xs" style={{ color: urgencyColor }}>{urgencyLabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrganizerSalesPage() {
  const { activeOrg } = useOrg();
  const [events, setEvents] = useState<EventStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const evQuery = supabase
        .from("events")
        .select("id, title, start_date, status, capacity, created_at, ticket_tiers (id, name, price, quantity, quantity_sold, sort_order)")
        .order("start_date", { ascending: true });
      const { data: eventsRaw } = await (activeOrg
        ? evQuery.eq("org_id", activeOrg.id)
        : evQuery.eq("organizer_id", user.id));

      const raw = (eventsRaw ?? []) as RawEvent[];
      const eventIds = raw.map(e => e.id);

      // Paid orders — confirmed, non-test, real purchases + combos (comps excluded),
      // not a lost/open chargeback, never pending. Sold counts & revenue come from
      // these real orders. Tier orders aggregate by tier; combos (untiered, anchored
      // to an event) aggregate per event.
      type PaidOrder = { event_id: string; tier_id: string | null; order_type: string; qty: number; unit_price: number; discount_amount: number; dispute_status: string | null };
      let paidOrders: PaidOrder[] = [];
      if (eventIds.length > 0) {
        const { data: ordersRaw } = await supabase
          .from("orders")
          .select("event_id, tier_id, order_type, qty, unit_price, discount_amount, dispute_status")
          .in("event_id", eventIds)
          .eq("is_test", false)
          .eq("status", "confirmed")
          .in("order_type", ["purchase", "combo"]);
        paidOrders = ((ordersRaw ?? []) as PaidOrder[]).filter(
          o => o.dispute_status !== "open" && o.dispute_status !== "lost"
        );
      }

      // Aggregate paid tickets + face-value revenue (qty * unit_price - discount).
      const soldByTier = new Map<string, number>();
      const earnedByTier = new Map<string, number>();
      const comboSoldByEvent = new Map<string, number>();
      const comboEarnedByEvent = new Map<string, number>();
      for (const o of paidOrders) {
        const face = Number(o.qty) * Number(o.unit_price) - Number(o.discount_amount);
        if (o.order_type === "combo" || !o.tier_id) {
          comboSoldByEvent.set(o.event_id, (comboSoldByEvent.get(o.event_id) ?? 0) + Number(o.qty));
          comboEarnedByEvent.set(o.event_id, (comboEarnedByEvent.get(o.event_id) ?? 0) + face);
          continue;
        }
        soldByTier.set(o.tier_id, (soldByTier.get(o.tier_id) ?? 0) + Number(o.qty));
        earnedByTier.set(o.tier_id, (earnedByTier.get(o.tier_id) ?? 0) + face);
      }

      const computed: EventStat[] = raw.map(ev => {
        const tiers: Tier[] = (ev.ticket_tiers ?? []).map(t => ({
          ...t,
          paidSold: soldByTier.get(t.id) ?? 0,
          paidEarned: earnedByTier.get(t.id) ?? 0,
        }));
        const comboSold = comboSoldByEvent.get(ev.id) ?? 0;
        const comboEarned = comboEarnedByEvent.get(ev.id) ?? 0;
        // Combos add to sold tickets + revenue, but not to tier capacity / fill rate.
        const totalSold = tiers.reduce((s, t) => s + t.paidSold, 0) + comboSold;
        const totalCapacity = tiers.reduce((s, t) => s + t.quantity, 0);
        const maxRevenue = tiers.reduce((s, t) => s + t.quantity * t.price, 0);   // sellout potential (list price)
        const earnedRevenue = tiers.reduce((s, t) => s + t.paidEarned, 0) + comboEarned; // actual paid face value (incl. combos)
        const fillPct = totalCapacity > 0 ? (tiers.reduce((s, t) => s + t.paidSold, 0) / totalCapacity) * 100 : 0;
        return {
          id: ev.id, title: ev.title, start_date: ev.start_date, status: ev.status,
          tiers, totalSold, totalCapacity, fillPct, maxRevenue, earnedRevenue,
          daysUntil: daysUntil(ev.start_date),
        };
      });
      setEvents(computed);
      setLoading(false);
    }
    load();
  }, [activeOrg]);

  const hasEvents = events.length > 0;
  const totalEarned = events.reduce((s, e) => s + e.earnedRevenue, 0);
  const totalMax = events.reduce((s, e) => s + e.maxRevenue, 0);
  const totalSold = events.reduce((s, e) => s + e.totalSold, 0);
  const totalCapacity = events.reduce((s, e) => s + e.totalCapacity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Sales & Analytics</h2>
          <p className="font-ui text-ink-muted text-sm mt-0.5">A complete picture of your ticket sales and revenue potential.</p>
        </div>
        <Link
          href="/organizer"
          className="shrink-0 font-ui text-sm text-ink-muted hover:text-ink flex items-center gap-1.5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />
          </svg>
          Hub
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : !hasEvents ? (
        <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
          <p className="text-4xl mb-4">📊</p>
          <p className="font-display font-semibold text-ink text-lg mb-2" style={{ letterSpacing: "-0.015em" }}>No events yet</p>
          <p className="font-ui text-ink-muted text-sm max-w-xs mx-auto mb-6">Once the Rameelo team lists an event for your organization, your analytics will appear here — revenue projections, fill rates, and pacing insights.</p>
          <a href="mailto:support@rameelo.com"
            className="inline-flex items-center gap-2 bg-aubergine text-white font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-aubergine-light transition-colors">
            Contact Rameelo →
          </a>
        </div>
      ) : (
        <>
          {/* Top summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Est. Gross Revenue", value: fmtCurrency(totalEarned, true), sub: "tickets × face value", color: "#0E8C7A" },
              { label: "Max Revenue (sellout)", value: fmtCurrency(totalMax, true), sub: "if all seats fill", color: "#2E1B30" },
              { label: "Tickets Sold", value: totalSold.toLocaleString(), sub: `of ${totalCapacity.toLocaleString()} available`, color: "#2E1B30" },
              { label: "Overall Fill Rate", value: totalCapacity > 0 ? `${Math.round((totalSold / totalCapacity) * 100)}%` : "—", sub: "across all events", color: totalSold / totalCapacity >= 0.5 ? "#0E8C7A" : "#D4891B" },
            ].map(tile => (
              <div key={tile.label} className="bg-white rounded-2xl border border-ivory-200 p-4">
                <p className="font-display font-bold text-2xl" style={{ color: tile.color, letterSpacing: "-0.03em" }}>{tile.value}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-1">{tile.label}</p>
                <p className="font-ui text-[11px] text-ink-muted/70 mt-0.5">{tile.sub}</p>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <p className="font-mono text-[9px] text-ink-muted/50 -mt-2">
            * Revenue figures are estimated as tickets sold × face value. You keep 100% — the 3% Rameelo fee is added to the buyer&apos;s checkout total.
          </p>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-5">
              <RevenueScenarios events={events} />
              <RevenueBreakdown events={events} />
            </div>
            <div className="space-y-5">
              <EventComparison events={events} />
              <VelocityInsight events={events} />
            </div>
          </div>

          <TierLeaderboard events={events} />
        </>
      )}
    </div>
  );
}
