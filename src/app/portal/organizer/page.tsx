"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type RawTier = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  quantity_sold?: number; // not fetched from DB — computed from orders
  sort_order: number;
};

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
  tiers: RawTier[];
  totalSold: number;
  totalCapacity: number;
  fillPct: number;
  maxRevenue: number;
  earnedRevenue: number;
  remainingRevenue: number;
  daysUntil: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string) {
  return Math.max(0, Math.ceil((new Date(dateStr + "T00:00:00").getTime() - Date.now()) / 86400000));
}
function fmtCurrency(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function milestone(fillPct: number, totalSold: number): { emoji: string; msg: string; sub: string } {
  if (totalSold === 0)
    return { emoji: "🚀", msg: "Your dashboard is live.", sub: "The moment your first ticket sells, this place lights up." };
  if (fillPct < 10)
    return { emoji: "⚡", msg: "First tickets are in!", sub: "Early sales are the hardest — you're past it. Keep sharing." };
  if (fillPct < 25)
    return { emoji: "📈", msg: "You're building real momentum.", sub: "Top organizers on Rameelo hit 25% within the first week. You're on track." };
  if (fillPct < 50)
    return { emoji: "🔥", msg: "Heating up — 1 in 4 seats is filled.", sub: "This is the inflection point. Social proof kicks in here. Push hard." };
  if (fillPct < 75)
    return { emoji: "🎉", msg: "Over halfway! People are talking.", sub: "Events at 50%+ sell the remaining tickets 3× faster. The wave is building." };
  if (fillPct < 90)
    return { emoji: "💥", msg: "You're in the home stretch.", sub: "Scarcity is your best marketing tool now. Let people know seats are running out." };
  if (fillPct < 100)
    return { emoji: "🏆", msg: "Almost sold out — this is rare.", sub: "Fewer than 1 in 10 events reach 90%. You're hosting something legendary." };
  return { emoji: "🎊", msg: "SOLD OUT. Every. Single. Seat.", sub: "You didn't just host an event — you created a moment people will talk about." };
}

function momentumLabel(fillPct: number, daysLeft: number): { label: string; color: string } {
  if (fillPct >= 90) return { label: "Nearly sold out", color: "#7C1F2C" };
  if (fillPct >= 60) return { label: "Flying ↑", color: "#0E8C7A" };
  if (daysLeft < 14 && fillPct < 40) return { label: "Needs push ↗", color: "#D4891B" };
  if (fillPct >= 30) return { label: "On track", color: "#0E8C7A" };
  if (fillPct >= 10) return { label: "Gaining traction", color: "#D4891B" };
  return { label: "Just launched", color: "#6B6B7B" };
}

// ── SVG Radial Ring ───────────────────────────────────────────────────────────

function RadialRing({
  pct, size = 72, stroke = 6, color = "#0E8C7A", label,
}: {
  pct: number; size?: number; stroke?: number; color?: string; label?: string;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * Math.min(1, pct / 100);
  const cx = size / 2;
  const display = pct >= 100 ? "100" : pct < 1 && pct > 0 ? "<1" : Math.round(pct).toString();
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#EBE6DB" strokeWidth={stroke} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-ink leading-none" style={{ fontSize: size * 0.22, letterSpacing: "-0.03em" }}>
          {display}%
        </span>
        {label && <span className="font-mono text-ink-muted leading-none mt-0.5" style={{ fontSize: size * 0.1 }}>{label}</span>}
      </div>
    </div>
  );
}

// ── Revenue Opportunity Bar ────────────────────────────────────────────────────

function RevenueBar({ earned, max }: { earned: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (earned / max) * 100) : 0;
  const remaining = max - earned;
  return (
    <div className="rounded-2xl bg-white border border-ivory-200 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Revenue Opportunity</p>
          <p className="font-display font-bold text-ink text-lg mt-0.5" style={{ letterSpacing: "-0.02em" }}>
            {max > 0 ? `Sell out = ${fmtCurrency(max)}` : "Set ticket prices to unlock your potential"}
          </p>
        </div>
        {remaining > 0 && max > 0 && (
          <div className="shrink-0 text-right">
            <p className="font-mono text-[9px] uppercase tracking-widest text-peacock">{fmtCurrency(remaining)}</p>
            <p className="font-mono text-[9px] text-ink-muted">still available</p>
          </div>
        )}
      </div>

      {max > 0 && (
        <>
          {/* Bar */}
          <div className="relative h-3 rounded-full overflow-hidden" style={{ backgroundColor: "#EBE6DB" }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, #0E8C7A 0%, #2E1B30 100%)",
                minWidth: earned > 0 ? 4 : 0,
              }}
            />
          </div>

          {/* Labels */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display font-bold text-peacock" style={{ fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
                {fmtCurrency(earned)}
              </p>
              <p className="font-mono text-[9px] text-ink-muted uppercase tracking-widest">earned so far</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-[10px] text-ink-muted">{Math.round(pct)}% unlocked</p>
            </div>
            <div className="text-right">
              <p className="font-display font-bold text-aubergine" style={{ fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
                {fmtCurrency(max)}
              </p>
              <p className="font-mono text-[9px] text-ink-muted uppercase tracking-widest">at sellout</p>
            </div>
          </div>

          {/* Scenario ticks */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-ivory-200">
            {[25, 50, 75, 100].map(s => {
              const rev = max * s / 100;
              const reached = pct >= s;
              return (
                <div key={s} className={`text-center py-2 rounded-xl transition-colors ${reached ? "bg-peacock/8" : "bg-ivory"}`}>
                  <p className={`font-display font-bold text-sm ${reached ? "text-peacock" : "text-ink-muted"}`} style={{ letterSpacing: "-0.02em" }}>
                    {fmtCurrency(rev)}
                  </p>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-ink-muted">{s}% sold</p>
                  {reached && <p className="font-mono text-[8px] text-peacock">✓</p>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Event Performance Card ─────────────────────────────────────────────────────

function EventCard({ ev }: { ev: EventStat }) {
  const momentum = momentumLabel(ev.fillPct, ev.daysUntil);
  const ringColor = ev.fillPct >= 90 ? "#7C1F2C" : ev.fillPct >= 50 ? "#0E8C7A" : "#D4891B";

  if (ev.status !== "published" && ev.status !== "pending_review") return null;

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
      {/* Card header */}
      <div className="px-5 pt-5 pb-4 flex items-start gap-4">
        <RadialRing pct={ev.fillPct} size={80} stroke={7} color={ringColor} label="filled" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${momentum.color}18`, color: momentum.color }}
            >
              {momentum.label}
            </span>
            {ev.daysUntil > 0 && (
              <span className="font-mono text-[9px] text-ink-muted bg-ivory px-2 py-0.5 rounded-full">
                In {ev.daysUntil} day{ev.daysUntil !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="font-display font-bold text-ink text-base leading-tight" style={{ letterSpacing: "-0.015em" }}>
            {ev.title}
          </p>
          <p className="font-ui text-xs text-ink-muted mt-0.5">{fmtDate(ev.start_date)}</p>
          <div className="flex items-center gap-3 mt-2">
            <div>
              <p className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.02em" }}>
                {ev.totalSold.toLocaleString()}
                <span className="font-ui font-normal text-sm text-ink-muted"> / {ev.totalCapacity.toLocaleString()}</span>
              </p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">tickets</p>
            </div>
            <div className="w-px h-8 bg-ivory-200" />
            <div>
              <p className="font-display font-bold text-peacock text-lg" style={{ letterSpacing: "-0.02em" }}>
                {fmtCurrency(ev.earnedRevenue)}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">earned</p>
            </div>
            <div className="w-px h-8 bg-ivory-200" />
            <div>
              <p className="font-display font-bold text-aubergine text-lg" style={{ letterSpacing: "-0.02em" }}>
                {fmtCurrency(ev.maxRevenue)}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">if sold out</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tier breakdown */}
      {ev.tiers.length > 0 && (
        <div className="px-5 pb-5 space-y-2 border-t border-ivory-200 pt-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-3">Ticket tiers</p>
          {ev.tiers.slice().sort((a, b) => a.sort_order - b.sort_order).map(tier => {
            const sold = tier.quantity_sold ?? 0;
            const tierFill = tier.quantity > 0 ? (sold / tier.quantity) * 100 : 0;
            const tierEarned = sold * tier.price;
            const tierMax = tier.quantity * tier.price;
            const barColor = tierFill >= 90 ? "#7C1F2C" : tierFill >= 50 ? "#0E8C7A" : "#2E1B30";
            return (
              <div key={tier.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-ui text-xs font-medium text-ink truncate">{tier.name}</span>
                    <span className="font-mono text-[9px] text-ink-muted shrink-0">${tier.price}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-[9px] text-ink-muted">
                      {sold}/{tier.quantity}
                    </span>
                    <span className="font-display font-bold text-xs" style={{ color: barColor, minWidth: 32, textAlign: "right" }}>
                      {Math.round(tierFill)}%
                    </span>
                  </div>
                </div>
                <div className="relative h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#EBE6DB" }}>
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${tierFill}%`, backgroundColor: barColor, transition: "width 0.8s ease", minWidth: tierFill > 0 ? 4 : 0 }}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[8px] text-peacock">{fmtCurrency(tierEarned)} earned</span>
                  <span className="font-mono text-[8px] text-ink-muted">{fmtCurrency(tierMax)} potential</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pace insight */}
      {ev.daysUntil > 0 && ev.totalCapacity > ev.totalSold && (
        <div className="mx-5 mb-5 px-4 py-3 rounded-xl bg-ivory border border-ivory-200">
          <p className="font-ui text-xs text-ink-muted">
            <span className="font-semibold text-ink">
              {Math.ceil((ev.totalCapacity - ev.totalSold) / Math.max(1, ev.daysUntil))} tickets/day
            </span>{" "}
            needed to sell out by event day ·{" "}
            <span className="font-semibold text-aubergine">{ev.totalCapacity - ev.totalSold} seats remaining</span>
          </p>
        </div>
      )}

      <Link
        href={`/portal/organizer/events/${ev.id}`}
        className="flex items-center justify-center gap-2 border-t border-ivory-200 py-3 font-ui text-xs font-semibold text-ink-muted hover:text-aubergine hover:bg-ivory transition-colors"
      >
        Manage event
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrganizerHubPage() {
  const [events, setEvents] = useState<EventStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [hasAnyEvent, setHasAnyEvent] = useState<boolean | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();
      setFirstName(profile?.first_name ?? user.email?.split("@")[0] ?? "");

      // Events with tiers (no quantity_sold — we compute from orders)
      const { data: eventsRaw } = await supabase
        .from("events")
        .select("id, title, start_date, status, capacity, created_at, ticket_tiers (id, name, price, quantity, sort_order)")
        .eq("organizer_id", user.id)
        .order("start_date", { ascending: true });

      const raw = (eventsRaw ?? []) as RawEvent[];
      setHasAnyEvent(raw.length > 0);

      // Fetch confirmed orders to get real sold counts per tier
      const tierSold: Record<string, number> = {};
      const tierRevenue: Record<string, number> = {};
      if (raw.length > 0) {
        const eventIds = raw.map(e => e.id);
        const { data: ordersRaw } = await supabase
          .from("orders")
          .select("tier_id, qty, unit_price")
          .in("event_id", eventIds)
          .eq("status", "confirmed");
        for (const o of (ordersRaw ?? []) as { tier_id: string; qty: number; unit_price: number }[]) {
          tierSold[o.tier_id] = (tierSold[o.tier_id] ?? 0) + o.qty;
          tierRevenue[o.tier_id] = (tierRevenue[o.tier_id] ?? 0) + o.qty * o.unit_price;
        }
      }

      const computed: EventStat[] = raw.map(ev => {
        const tiers = (ev.ticket_tiers ?? []).map(t => ({
          ...t,
          quantity_sold: tierSold[t.id] ?? 0,
        }));
        const totalSold = tiers.reduce((s, t) => s + t.quantity_sold, 0);
        const totalCapacity = tiers.reduce((s, t) => s + t.quantity, 0);
        const maxRevenue = tiers.reduce((s, t) => s + t.quantity * t.price, 0);
        const earnedRevenue = tiers.reduce((s, t) => s + (tierRevenue[t.id] ?? 0), 0);
        const fillPct = totalCapacity > 0 ? (totalSold / totalCapacity) * 100 : 0;
        return {
          id: ev.id, title: ev.title, start_date: ev.start_date, status: ev.status,
          tiers, totalSold, totalCapacity, fillPct,
          maxRevenue, earnedRevenue, remainingRevenue: maxRevenue - earnedRevenue,
          daysUntil: daysUntil(ev.start_date),
        };
      });
      setEvents(computed);
      setLoading(false);
    }
    load();
  }, []);

  // Aggregate stats
  const totalSold = events.reduce((s, e) => s + e.totalSold, 0);
  const totalCapacity = events.reduce((s, e) => s + e.totalCapacity, 0);
  const totalEarned = events.reduce((s, e) => s + e.earnedRevenue, 0);
  const totalMax = events.reduce((s, e) => s + e.maxRevenue, 0);
  const overallFill = totalCapacity > 0 ? (totalSold / totalCapacity) * 100 : 0;
  const liveEvents = events.filter(e => e.status === "published");
  const { emoji, msg, sub } = milestone(overallFill, totalSold);
  const showGate = hasAnyEvent === false;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // KPI tiles
  const KPI_TILES = [
    {
      label: "Est. Revenue",
      value: fmtCurrency(totalEarned),
      sub: totalMax > 0 ? `of ${fmtCurrency(totalMax)} potential` : "publish your first event",
      color: "#0E8C7A",
      bg: "bg-peacock/5",
      border: "border-peacock/15",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Sellout Value",
      value: fmtCurrency(totalMax),
      sub: "if every seat is filled",
      color: "#2E1B30",
      bg: "bg-aubergine/5",
      border: "border-aubergine/15",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      label: "Tickets Sold",
      value: totalSold.toLocaleString(),
      sub: totalCapacity > 0 ? `${totalCapacity.toLocaleString()} total capacity` : "set ticket quantities",
      color: "#2E1B30",
      bg: "bg-white",
      border: "border-ivory-200",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
    },
    {
      label: "Capacity Filled",
      value: totalCapacity > 0 ? `${Math.round(overallFill)}%` : "—",
      sub: liveEvents.length > 0 ? `across ${liveEvents.length} live event${liveEvents.length !== 1 ? "s" : ""}` : "no live events yet",
      color: overallFill >= 50 ? "#0E8C7A" : "#D4891B",
      bg: "bg-white",
      border: "border-ivory-200",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>
            {greeting}{firstName ? `, ${firstName}` : ""}.
          </h2>
          <p className="font-ui text-ink-muted text-sm mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · Organizer Hub
          </p>
        </div>
        <Link
          href="/portal/organizer/events/create"
          className="shrink-0 flex items-center gap-2 bg-aubergine text-white font-ui font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-aubergine-light transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New event
        </Link>
      </div>

      {/* Gate overlay or full dashboard */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : showGate ? (
        /* ── No events yet ── */
        <div className="bg-white rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-aubergine/8 border border-aubergine/15 flex items-center justify-center mx-auto mb-5 text-3xl">🎯</div>
          <p className="font-display font-bold text-ink text-xl mb-2" style={{ letterSpacing: "-0.02em" }}>Your analytics dashboard awaits</p>
          <p className="font-ui text-ink-muted text-sm max-w-sm mx-auto mb-6 leading-relaxed">
            The moment you create an event and set your ticket prices, this dashboard will show your revenue potential, fill rates, and pacing insights in real time.
          </p>
          <Link
            href="/portal/organizer/events/create"
            className="inline-flex items-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-marigold-dark transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create your first event →
          </Link>
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted/50 mt-5">Takes less than 5 minutes</p>
        </div>
      ) : (
        <>
          {/* ── KPI Tiles ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {KPI_TILES.map(tile => (
              <div key={tile.label} className={`rounded-2xl border ${tile.bg} ${tile.border} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${tile.color}18`, color: tile.color }}>
                    {tile.icon}
                  </div>
                </div>
                <p className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.03em", color: tile.color }}>
                  {tile.value}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-1">{tile.label}</p>
                <p className="font-ui text-[11px] text-ink-muted/70 mt-0.5 leading-tight">{tile.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Milestone Banner ── */}
          {totalMax > 0 && (
            <div className="rounded-2xl border border-marigold/25 bg-gradient-to-br from-marigold/8 via-transparent to-aubergine/5 p-5 flex gap-4 items-start">
              <span className="text-3xl shrink-0 mt-0.5">{emoji}</span>
              <div className="min-w-0">
                <p className="font-display font-bold text-ink text-base" style={{ letterSpacing: "-0.02em" }}>{msg}</p>
                <p className="font-ui text-sm text-ink-muted mt-0.5 leading-relaxed">{sub}</p>
              </div>
              {totalCapacity > totalSold && (
                <div className="shrink-0 text-right hidden sm:block">
                  <p className="font-display font-bold text-aubergine text-xl" style={{ letterSpacing: "-0.03em" }}>
                    {totalCapacity - totalSold}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">seats left</p>
                </div>
              )}
            </div>
          )}

          {/* ── Revenue Opportunity ── */}
          <RevenueBar earned={totalEarned} max={totalMax} />

          {/* ── Event Cards ── */}
          {events.filter(e => e.status === "published" || e.status === "pending_review").length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Event performance</p>
                <Link href="/portal/organizer/events" className="font-ui text-xs text-aubergine hover:underline">View all →</Link>
              </div>
              <div className="space-y-4">
                {events
                  .filter(e => e.status === "published" || e.status === "pending_review")
                  .map(ev => <EventCard key={ev.id} ev={ev} />)}
              </div>
            </div>
          )}

          {/* ── Quick Actions ── */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Link
              href="/portal/organizer/events"
              className="bg-white rounded-2xl border border-ivory-200 p-4 flex items-center gap-4 hover:border-aubergine/30 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-aubergine/8 border border-aubergine/15 flex items-center justify-center shrink-0">
                <svg className="w-4.5 h-4.5 text-aubergine" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>All Events</p>
                <p className="font-ui text-xs text-ink-muted">{events.length} event{events.length !== 1 ? "s" : ""} total</p>
              </div>
              <svg className="w-4 h-4 text-ink-muted shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/portal/organizer/sales"
              className="bg-white rounded-2xl border border-ivory-200 p-4 flex items-center gap-4 hover:border-aubergine/30 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-marigold/10 border border-marigold/20 flex items-center justify-center shrink-0">
                <svg className="w-4.5 h-4.5 text-aubergine" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>Sales & Analytics</p>
                <p className="font-ui text-xs text-ink-muted">Deep dive into your numbers</p>
              </div>
              <svg className="w-4 h-4 text-ink-muted shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
