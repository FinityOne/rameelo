"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "./org-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type RawTier = { id: string; price: number; quantity: number; sort_order: number; name: string };

type RawEvent = {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  city: string | null;
  state: string | null;
  status: string;
  cover_image_url: string | null;
  capacity: number | null;
  created_at: string;
  ticket_tiers: RawTier[];
};

type OrderRow = { event_id: string; qty: number; unit_price: number; grand_total: number; created_at: string; status: string };

type EventCard = {
  id: string;
  title: string;
  start_date: string;
  city: string | null;
  state: string | null;
  status: string;
  cover_image_url: string | null;
  totalSold: number;
  totalCapacity: number;
  fillPct: number;
  grossRevenue: number;
  daysUntil: number;
  isLive: boolean;
  isPast: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(d: string) {
  return Math.ceil((new Date(d + "T00:00:00").getTime() - Date.now()) / 86400000);
}
function fmtMoney(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusBadge(status: string, daysUntil: number, isPast: boolean) {
  if (isPast) return { label: "Completed", cls: "bg-black/5 text-ink/40" };
  if (status === "published") {
    if (daysUntil <= 0)  return { label: "Live today!", cls: "bg-emerald-50 text-emerald-700 animate-pulse" };
    if (daysUntil <= 7)  return { label: `${daysUntil}d away`, cls: "bg-marigold/15 text-[#A06500]" };
    return { label: "Published", cls: "bg-peacock/10 text-peacock" };
  }
  if (status === "draft")          return { label: "Draft", cls: "bg-black/5 text-ink/40" };
  if (status === "pending_review") return { label: "In review", cls: "bg-marigold/12 text-[#A06500]" };
  return { label: status, cls: "bg-black/5 text-ink/40" };
}

function motivationalMsg(totalSold: number, fillPct: number): { headline: string; sub: string } {
  if (totalSold === 0)   return { headline: "Your stage is set.", sub: "Share your event — the first ticket sale changes everything." };
  if (fillPct < 15)      return { headline: "First tickets are in!", sub: "Early momentum is everything. Keep the energy going." };
  if (fillPct < 35)      return { headline: "You're building real momentum.", sub: "Top Rameelo events hit 35% in the first week. You're on track." };
  if (fillPct < 60)      return { headline: "Halfway there — and flying.", sub: "Over half sold. Create urgency with a limited-time offer." };
  if (fillPct < 85)      return { headline: "Almost sold out!", sub: "The urgency is real now. Use it — scarcity sells the last tickets fast." };
  return { headline: "This is a sellout.", sub: "Incredible. Consider a waitlist for future events." };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink/35 mb-3">{label}</p>
      <p className="font-display font-black" style={{ fontSize: 26, letterSpacing: "-0.04em", color: accent }}>{value}</p>
      {sub && <p className="font-ui text-xs text-ink/40 mt-1">{sub}</p>}
    </div>
  );
}

function FillBar({ pct, color = "#F5A623" }: { pct: number; color?: string }) {
  return (
    <div className="h-1 rounded-full bg-black/[0.06] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrganizerHubPage() {
  const { activeOrg } = useOrg();
  const [events, setEvents] = useState<EventCard[]>([]);
  const [recentOrders, setRecentOrders] = useState<(OrderRow & { event_title: string })[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      // Filter events by org_id when an org is active, otherwise by organizer_id
      const evQuery = supabase
        .from("events")
        .select("id, title, start_date, end_date, city, state, status, cover_image_url, capacity, created_at, ticket_tiers(id, price, quantity, sort_order, name)")
        .order("start_date", { ascending: true });
      const { data: rawEvents } = await (activeOrg
        ? evQuery.eq("org_id", activeOrg.id)
        : evQuery.eq("organizer_id", user.id));

      const eventIds = (rawEvents ?? []).map((e: { id: string }) => e.id);
      const { data: orders } = eventIds.length > 0
        ? await supabase.from("orders").select("event_id, qty, unit_price, grand_total, created_at, status").in("event_id", eventIds).eq("status", "confirmed").eq("is_test", false).order("created_at", { ascending: false })
        : { data: [] };

      const allOrders: OrderRow[] = (orders ?? []) as OrderRow[];

      const cards: EventCard[] = ((rawEvents ?? []) as RawEvent[]).map((ev) => {
        const evOrders = allOrders.filter((o) => o.event_id === ev.id);
        const totalSold = evOrders.reduce((s, o) => s + o.qty, 0);
        const totalCapacity = ev.ticket_tiers.reduce((s, t) => s + (t.quantity ?? 0), 0);
        const grossRevenue = evOrders.reduce((s, o) => s + o.grand_total, 0);
        const d = daysUntil(ev.start_date);
        const isPast = d < -1;
        return {
          id: ev.id, title: ev.title, start_date: ev.start_date,
          city: ev.city, state: ev.state, status: ev.status,
          cover_image_url: ev.cover_image_url,
          totalSold, totalCapacity,
          fillPct: totalCapacity > 0 ? (totalSold / totalCapacity) * 100 : 0,
          grossRevenue, daysUntil: d, isLive: d === 0, isPast,
        };
      });

      const revenue = allOrders.reduce((s, o) => s + o.grand_total, 0);
      setTotalRevenue(revenue);

      // Enrich recent orders with event titles
      const titleMap = Object.fromEntries(cards.map((c) => [c.id, c.title]));
      const recent = allOrders.slice(0, 6).map((o) => ({ ...o, event_title: titleMap[o.event_id] ?? "—" }));
      setRecentOrders(recent);

      setEvents(cards);
      setLoading(false);
    });
  }, [activeOrg]);

  const upcomingEvents = events.filter((e) => !e.isPast && e.status === "published");
  const draftEvents    = events.filter((e) => e.status === "draft" || e.status === "pending_review");
  const pastEvents     = events.filter((e) => e.isPast);
  const totalTickets   = events.reduce((s, e) => s + e.totalSold, 0);
  const totalCapacity  = events.reduce((s, e) => s + e.totalCapacity, 0);
  const overallFill    = totalCapacity > 0 ? (totalTickets / totalCapacity) * 100 : 0;
  const { headline, sub } = motivationalMsg(totalTickets, overallFill);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-7 h-7 rounded-full border-2 border-black/10 border-t-aubergine animate-spin" />
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (events.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl"
          style={{ background: "linear-gradient(135deg, #1A0826, #2D0C1A)" }}
        >
          🎪
        </div>
        <h2 className="font-display font-black text-ink/85 text-2xl mb-2" style={{ letterSpacing: "-0.03em" }}>
          Your first event is one click away.
        </h2>
        <p className="font-ui text-ink/45 text-sm mb-7 leading-relaxed">
          Thousands of garba enthusiasts are waiting to find events like yours on Rameelo. Create your first listing in minutes.
        </p>
        <Link
          href="/organizer/events/create"
          className="inline-flex items-center gap-2 font-ui font-semibold text-sm px-7 py-3.5 rounded-xl transition-all"
          style={{ background: "linear-gradient(135deg, #F5A623, #E8901A)", color: "#1A0826", boxShadow: "0 4px 20px rgba(245,166,35,0.35)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Create your first event
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-5xl">

      {/* ── Motivational banner ───────────────────────────────────── */}
      <div
        className="rounded-2xl px-6 py-5 flex items-center justify-between gap-4 overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #1A0826 0%, #3D1228 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ backgroundColor: "#F5A623", transform: "translate(30%, -30%)" }} />
        <div className="relative">
          <p className="font-display font-black text-white text-lg mb-0.5" style={{ letterSpacing: "-0.02em" }}>{headline}</p>
          <p className="font-ui text-white/45 text-sm">{sub}</p>
        </div>
        <Link
          href="/organizer/events/create"
          className="relative hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl font-ui font-semibold text-[13px] shrink-0 transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #F5A623, #E8901A)", color: "#1A0826" }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Event
        </Link>
      </div>

      {/* ── KPI tiles ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Total Revenue"     value={fmtMoney(totalRevenue)} sub="from ticket sales" accent="#1A0826" />
        <KpiTile label="Tickets Sold"      value={totalTickets.toLocaleString()} sub={totalCapacity > 0 ? `${overallFill.toFixed(0)}% fill rate` : undefined} accent="#F5A623" />
        <KpiTile label="Live Events"       value={String(upcomingEvents.length)} sub={draftEvents.length > 0 ? `${draftEvents.length} in draft` : "all published"} accent="#1A6B7C" />
        <KpiTile label="Events Created"    value={String(events.length)} sub={pastEvents.length > 0 ? `${pastEvents.length} completed` : "keep going"} accent="#8B2252" />
      </div>

      {/* ── Two-col row ───────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-5 gap-4">

        {/* Events list (3/5) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-display font-bold text-ink/75 text-sm" style={{ letterSpacing: "-0.01em" }}>
              {upcomingEvents.length > 0 ? "Upcoming Events" : "All Events"}
            </p>
            <Link href="/organizer/events" className="font-mono text-[10px] uppercase tracking-widest text-ink/35 hover:text-aubergine transition-colors">
              View all →
            </Link>
          </div>

          {(upcomingEvents.length > 0 ? upcomingEvents : events).slice(0, 4).map((ev) => {
            const badge = statusBadge(ev.status, ev.daysUntil, ev.isPast);
            return (
              <Link key={ev.id} href={`/organizer/events/${ev.id}`}
                className="block bg-white rounded-2xl border border-black/[0.06] p-4 hover:border-aubergine/20 hover:shadow-sm transition-all group shadow-sm">
                <div className="flex items-start gap-3">
                  {/* Cover thumbnail */}
                  <div
                    className="w-12 h-12 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-xl"
                    style={{ background: ev.cover_image_url ? undefined : "linear-gradient(135deg, #1A0826, #3D1228)" }}
                  >
                    {ev.cover_image_url
                      ? <img src={ev.cover_image_url} alt="" className="w-full h-full object-cover" />
                      : "🎪"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="font-display font-bold text-ink/80 text-[13px] leading-snug group-hover:text-aubergine transition-colors" style={{ letterSpacing: "-0.01em" }}>
                        {ev.title}
                      </p>
                      <span className={`shrink-0 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    <p className="font-mono text-[10px] text-ink/35 mb-2.5">
                      {fmtDate(ev.start_date)}{ev.city ? ` · ${ev.city}, ${ev.state ?? ""}` : ""}
                    </p>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <FillBar pct={ev.fillPct} color={ev.fillPct >= 80 ? "#10b981" : "#F5A623"} />
                      </div>
                      <span className="font-mono text-[10px] text-ink/45 shrink-0">
                        {ev.totalSold} / {ev.totalCapacity || "∞"} sold
                      </span>
                      <span className="font-display font-bold text-ink/70 text-[13px] shrink-0" style={{ letterSpacing: "-0.02em" }}>
                        {fmtMoney(ev.grossRevenue)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* Draft events hint */}
          {draftEvents.length > 0 && (
            <div className="rounded-xl border border-dashed border-black/15 px-4 py-3 flex items-center gap-3">
              <span className="text-base">📝</span>
              <div className="flex-1">
                <p className="font-ui text-[12px] font-semibold text-ink/55">
                  {draftEvents.length} draft event{draftEvents.length !== 1 ? "s" : ""} not yet published
                </p>
              </div>
              <Link href="/organizer/events" className="font-mono text-[10px] uppercase tracking-widest text-aubergine/60 hover:text-aubergine transition-colors shrink-0">
                Manage →
              </Link>
            </div>
          )}
        </div>

        {/* Right column (2/5) */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Recent orders */}
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden flex-1">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
              <p className="font-display font-bold text-ink/75 text-sm" style={{ letterSpacing: "-0.01em" }}>Recent Sales</p>
              <Link href="/organizer/tickets" className="font-mono text-[10px] text-ink/35 hover:text-aubergine uppercase tracking-widest transition-colors">
                All →
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-2xl mb-1.5">🎫</p>
                <p className="font-ui text-xs text-ink/35">Sales will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.04]">
                {recentOrders.map((o, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-ui text-[12px] font-semibold text-ink/70 truncate">{o.event_title}</p>
                      <p className="font-mono text-[10px] text-ink/30">{o.qty} ticket{o.qty !== 1 ? "s" : ""} · {timeAgo(o.created_at)}</p>
                    </div>
                    <span className="font-display font-bold text-ink/65 text-[13px] shrink-0" style={{ letterSpacing: "-0.02em" }}>
                      {fmtMoney(o.grand_total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/organizer/financials", label: "Earnings & Payouts", emoji: "💰" },
              { href: "/organizer/tickets",    label: "Orders",     emoji: "🧾" },
              { href: "/organizer/customers",  label: "Customers",  emoji: "👥" },
              { href: "/organizer/organization", label: "Org Setup", emoji: "🏢" },
            ].map((a) => (
              <Link key={a.href} href={a.href}
                className="bg-white border border-black/[0.06] rounded-xl px-3 py-3 flex flex-col items-center gap-1.5 text-center hover:border-aubergine/25 hover:shadow-sm transition-all shadow-sm group">
                <span className="text-lg">{a.emoji}</span>
                <span className="font-ui text-[11px] font-semibold text-ink/50 group-hover:text-ink/75 transition-colors leading-tight">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
