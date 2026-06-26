"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import DailySummaryCard from "./DailySummaryCard";
import { TicketSalesChart, SignupsChart, LoginsChart } from "./DashboardCharts";
import { effectiveProfit } from "@/lib/fees";

type DashboardData = {
  totalUsers: number;
  members: number;
  organizers: number;
  newUsersThisWeek: number;
  totalEvents: number;
  pendingEvents: number;
  publishedEvents: number;
  sellingEvents: number;
  rameeloProfit: number;
  profitThisMonth: number;
  totalOrders: number;
  totalTicketsSold: number;
  // Today (since midnight PT)
  usersToday: number;
  eventsToday: number;
  profitToday: number;
  ticketsToday: number;
  ordersToday: number;
  eventSales: Array<{ id: string; title: string; city: string | null; tickets: number }>;
  recentUsers: Array<{ id: string; first_name: string; last_name: string; email: string; city: string | null; state: string | null; role: string; created_at: string }>;
  pendingEventList: Array<{ id: string; title: string; city: string | null; created_at: string }>;
};

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function fmtMoney(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// The UTC instant of midnight today in Pacific time — so "today" matches the rest
// of the platform (daily summary, charts all bucket on America/Los_Angeles).
function startOfTodayPT(): number {
  const now = new Date();
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(now); // YYYY-MM-DD
  const off = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "longOffset" })
    .formatToParts(now).find((p) => p.type === "timeZoneName")?.value ?? "GMT-08:00"; // e.g. "GMT-07:00"
  return new Date(`${ymd}T00:00:00${off.replace("GMT", "")}`).getTime();
}

const ROLE_STYLES: Record<string, string> = {
  user:      "bg-[#F5F3F0] text-ink/50",
  organizer: "bg-peacock/10 text-peacock",
  admin:     "bg-red-50 text-red-600",
};

type KpiProps = {
  label: string; value: string; sub?: string;
  delta?: { value: string; positive: boolean };
  today?: { value: string; note?: string };
  accent?: string;
};

function KpiCard({ label, value, sub, delta, today, accent = "#F5A623" }: KpiProps) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-5 flex flex-col gap-3 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink/35">{label}</p>
        {delta && (
          <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full ${delta.positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
            {delta.positive ? "↑" : "↓"} {delta.value}
          </span>
        )}
      </div>
      <div>
        <p className="font-display font-black text-ink/90" style={{ fontSize: 28, letterSpacing: "-0.04em", color: accent }}>
          {value}
        </p>
        {sub && <p className="font-ui text-xs text-ink/40 mt-0.5">{sub}</p>}
      </div>
      {/* Today (since midnight PT) — a quiet footer strip; no extra cards/scroll. */}
      {today && (
        <div className="mt-auto pt-2.5 border-t border-black/[0.05] flex items-center justify-between gap-2">
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/35 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
            Today
          </span>
          <span className="font-ui text-xs leading-none">
            <span className="font-bold" style={{ color: accent }}>{today.value}</span>
            {today.note && <span className="text-ink/35 font-medium"> · {today.note}</span>}
          </span>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, email, city, state, role, created_at").order("created_at", { ascending: false }),
      supabase.from("events").select("id, title, city, status, selling_on_rameelo, created_at"),
      supabase.from("orders").select("grand_total, rameelo_fee, processing_fee, service_fee, payment_method, qty, created_at, status, event_id").eq("status", "confirmed").eq("is_test", false).neq("order_type", "manual"),
    ]).then(([profiles, events, orders]) => {
      const p = profiles.data ?? [];
      const ev = (events.data ?? []) as Array<{ id: string; title: string; city: string | null; status: string; selling_on_rameelo: boolean; created_at: string }>;
      const ord = (orders.data ?? []) as Array<{ grand_total: number; rameelo_fee: number | null; processing_fee: number | null; service_fee: number | null; payment_method: "card" | "ach" | null; qty: number | null; created_at: string; event_id: string | null }>;

      // Rameelo's net profit per order = platform fee + processing fee − Stripe's
      // cut (same calc as the Revenue page). Legacy orders that predate the split
      // columns fall back to splitting service_fee 30/70.
      const profitOf = (o: typeof ord[number]) => {
        const rf = o.rameelo_fee ?? (o.service_fee ?? 0) * 0.3;
        const pf = o.processing_fee ?? (o.service_fee ?? 0) * 0.7;
        return effectiveProfit(rf, pf, o.grand_total, o.payment_method ?? "card").netProfit;
      };
      const rameeloProfit    = ord.reduce((s, o) => s + profitOf(o), 0);
      const profitThisMonth  = ord.filter((o) => o.created_at >= monthStart).reduce((s, o) => s + profitOf(o), 0);
      const totalTicketsSold = ord.reduce((s, o) => s + (o.qty ?? 0), 0);
      const newUsersThisWeek = p.filter((u) => u.created_at >= weekAgo).length;

      // ── Today (since midnight Pacific) ──────────────────────────────────────
      const todayStart = startOfTodayPT();
      const isToday = (iso: string) => new Date(iso).getTime() >= todayStart;
      const ordersTodayList = ord.filter((o) => isToday(o.created_at));
      const usersToday   = p.filter((u) => isToday(u.created_at)).length;
      const eventsToday  = ev.filter((e) => isToday(e.created_at)).length;
      const ordersToday  = ordersTodayList.length;
      const ticketsToday = ordersTodayList.reduce((s, o) => s + (o.qty ?? 0), 0);
      const profitToday  = ordersTodayList.reduce((s, o) => s + profitOf(o), 0);

      // Tickets sold per event (same confirmed/live/non-manual basis as the
      // Tickets Sold KPI, so the widget's total tallies with it). Only events
      // with at least one ticket sold, highest first.
      const titleById = new Map(ev.map((e) => [e.id, e]));
      const ticketsByEvent = new Map<string, number>();
      for (const o of ord) {
        if (!o.event_id) continue;
        ticketsByEvent.set(o.event_id, (ticketsByEvent.get(o.event_id) ?? 0) + (o.qty ?? 0));
      }
      const eventSales = [...ticketsByEvent.entries()]
        .map(([id, tickets]) => ({ id, tickets, title: titleById.get(id)?.title ?? "Untitled event", city: titleById.get(id)?.city ?? null }))
        .filter((e) => e.tickets > 0)
        .sort((a, b) => b.tickets - a.tickets);

      setData({
        totalUsers: p.length,
        members: p.filter((x) => x.role === "user").length,
        organizers: p.filter((x) => x.role === "organizer").length,
        newUsersThisWeek,
        totalEvents: ev.length,
        pendingEvents: ev.filter((x) => x.status === "pending_review").length,
        publishedEvents: ev.filter((x) => x.status === "published").length,
        sellingEvents: ev.filter((x) => x.selling_on_rameelo).length,
        rameeloProfit,
        profitThisMonth,
        totalOrders: ord.length,
        totalTicketsSold,
        usersToday,
        eventsToday,
        profitToday,
        ticketsToday,
        ordersToday,
        eventSales,
        recentUsers: p.slice(0, 3),
        pendingEventList: ev.filter((x) => x.status === "pending_review").slice(0, 5),
      });
    });
  }, []);

  const loading = data === null;

  return (
    <div className="space-y-7">

      {/* ── Pending review alert ─────────────────────────────────── */}
      {!loading && data.pendingEvents > 0 && (
        <Link href="/admin/events"
          className="flex items-center gap-4 bg-white rounded-2xl border border-[#F5A623]/30 px-5 py-4 shadow-sm hover:border-[#F5A623]/60 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(245,166,35,0.12)" }}>
            <span className="w-2.5 h-2.5 bg-marigold rounded-full animate-pulse block" />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-ink/80 text-sm" style={{ letterSpacing: "-0.01em" }}>
              {data.pendingEvents} event{data.pendingEvents !== 1 ? "s" : ""} awaiting review
            </p>
            <p className="font-ui text-xs text-ink/40 mt-0.5">Open the review queue to approve or reject submissions</p>
          </div>
          <svg className="w-4 h-4 text-ink/25 group-hover:text-ink/50 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      {/* ── KPI grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Users"
          value={loading ? "—" : fmt(data.totalUsers)}
          sub={loading ? undefined : `+${data.newUsersThisWeek} this week`}
          delta={loading || data.newUsersThisWeek === 0 ? undefined : { value: `${data.newUsersThisWeek}`, positive: true }}
          today={loading ? undefined : { value: `+${data.usersToday}`, note: data.usersToday === 1 ? "signup" : "signups" }}
          accent="#2E1B30"
        />
        <KpiCard
          label="Rameelo Profit"
          value={loading ? "—" : fmtMoney(data.rameeloProfit)}
          sub={loading ? undefined : `${fmtMoney(data.profitThisMonth)} this month · net of Stripe`}
          today={loading ? undefined : { value: fmtMoney(data.profitToday), note: "net" }}
          accent="#F5A623"
        />
        <KpiCard
          label="Events"
          value={loading ? "—" : String(data.totalEvents)}
          sub={loading ? undefined : `${data.sellingEvents} selling on Rameelo · ${data.publishedEvents} published`}
          delta={loading || data.sellingEvents === 0 ? undefined : { value: `${data.sellingEvents} selling`, positive: true }}
          today={loading ? undefined : { value: `+${data.eventsToday}`, note: "created" }}
          accent="#1A6B7C"
        />
        <KpiCard
          label="Tickets Sold"
          value={loading ? "—" : fmt(data.totalTicketsSold)}
          sub={loading ? undefined : `${data.totalOrders} live order${data.totalOrders !== 1 ? "s" : ""} · test excluded`}
          today={loading ? undefined : { value: `${data.ticketsToday} tix`, note: `${data.ordersToday} txn` }}
          accent="#8B2252"
        />
      </div>

      {/* ── Ticket sales over time ────────────────────────────────── */}
      <TicketSalesChart />

      {/* ── Tickets sold by event ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
          <div>
            <p className="font-display font-bold text-ink/80 text-sm" style={{ letterSpacing: "-0.01em" }}>Tickets Sold by Event</p>
            <p className="font-mono text-[10px] text-ink/35 mt-0.5 uppercase tracking-widest">Confirmed, live orders</p>
          </div>
          {!loading && data.eventSales.length > 0 && (
            <div className="text-right">
              <p className="font-display font-black text-ink/90" style={{ fontSize: 18, letterSpacing: "-0.03em", color: "#8B2252" }}>
                {data.totalTicketsSold.toLocaleString()}
              </p>
              <p className="font-mono text-[9px] text-ink/35 uppercase tracking-widest">total</p>
            </div>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-black/10 border-t-aubergine animate-spin" />
          </div>
        ) : data.eventSales.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-2xl mb-1.5">🎟️</p>
            <p className="font-ui text-xs text-ink/40">No tickets sold yet</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-black/[0.04] max-h-[420px] overflow-y-auto">
              {data.eventSales.map((e, i) => {
                const top = data.eventSales[0].tickets || 1;
                const pct = Math.max(4, Math.round((e.tickets / top) * 100));
                return (
                  <Link key={e.id} href={`/admin/events/${e.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-black/[0.02] transition-colors group">
                    <span className="font-mono text-[10px] text-ink/25 w-4 shrink-0 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui font-semibold text-ink/75 text-[13px] truncate group-hover:text-aubergine transition-colors">{e.title}</p>
                      <div className="h-1 rounded-full bg-black/[0.06] overflow-hidden mt-1.5">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: "#8B2252" }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-bold text-ink/80 text-sm" style={{ letterSpacing: "-0.02em" }}>{e.tickets.toLocaleString()}</p>
                      {e.city && <p className="font-mono text-[9px] text-ink/30 truncate max-w-[90px]">{e.city}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-black/[0.05] bg-black/[0.015]">
              <span className="font-mono text-[10px] text-ink/40 uppercase tracking-widest">
                {data.eventSales.length} event{data.eventSales.length !== 1 ? "s" : ""} with sales
              </span>
              <span className="font-mono text-[11px] font-bold text-ink/60">{data.totalTicketsSold.toLocaleString()} tickets</span>
            </div>
          </>
        )}
      </div>

      {/* ── Daily summary email ───────────────────────────────────── */}
      <DailySummaryCard />

      {/* ── User growth + logins ──────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <SignupsChart />
        <LoginsChart />
      </div>

      {/* ── Two-col row ───────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-5 gap-4">

        {/* Recent signups (3/5) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
            <div>
              <p className="font-display font-bold text-ink/80 text-sm" style={{ letterSpacing: "-0.01em" }}>Recent Signups</p>
              <p className="font-mono text-[10px] text-ink/35 mt-0.5 uppercase tracking-widest">Latest 3 members</p>
            </div>
            <Link href="/admin/users" className="font-mono text-[10px] text-ink/35 hover:text-aubergine uppercase tracking-widest transition-colors">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-black/10 border-t-aubergine animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-black/[0.04]">
              {data.recentUsers.map((u) => (
                <Link key={u.id} href={`/admin/users/${u.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-black/[0.02] transition-colors group">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: "#" + ((u.first_name.charCodeAt(0) * 1234567) % 0xffffff).toString(16).padStart(6, "8") }}
                  >
                    {u.first_name[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-ui font-semibold text-ink/75 text-[13px] truncate group-hover:text-aubergine transition-colors">
                      {u.first_name} {u.last_name}
                    </p>
                    <p className="font-mono text-[10px] text-ink/35 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${ROLE_STYLES[u.role] ?? ROLE_STYLES.user}`}>
                      {u.role}
                    </span>
                    <span className="font-mono text-[10px] text-ink/25">{timeAgo(u.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column (2/5) */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Pending events */}
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden flex-1">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
              <p className="font-display font-bold text-ink/80 text-sm" style={{ letterSpacing: "-0.01em" }}>Pending Review</p>
              <Link href="/admin/events" className="font-mono text-[10px] text-ink/35 hover:text-aubergine uppercase tracking-widest transition-colors">
                Queue →
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 rounded-full border-2 border-black/10 border-t-aubergine animate-spin" />
              </div>
            ) : data.pendingEventList.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-2xl mb-1.5">✅</p>
                <p className="font-ui text-xs text-ink/40">Queue is clear</p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.04]">
                {data.pendingEventList.map((ev) => (
                  <Link key={ev.id} href={`/admin/events/${ev.id}`}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-black/[0.02] transition-colors group">
                    <div className="w-1.5 h-1.5 rounded-full bg-marigold mt-1.5 shrink-0 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <p className="font-ui font-semibold text-ink/75 text-[12px] truncate group-hover:text-aubergine transition-colors">{ev.title}</p>
                      <p className="font-mono text-[10px] text-ink/30 mt-0.5">{ev.city ?? "—"} · {timeAgo(ev.created_at)}</p>
                    </div>
                    <svg className="w-3.5 h-3.5 text-ink/20 group-hover:text-ink/50 shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Platform pulse */}
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm px-5 py-4">
            <p className="font-display font-bold text-ink/80 text-sm mb-4" style={{ letterSpacing: "-0.01em" }}>Platform Pulse</p>
            <div className="space-y-3">
              {[
                { label: "Members",    value: loading ? 0 : data.members,    max: loading ? 100 : data.totalUsers, color: "#2E1B30" },
                { label: "Organizers", value: loading ? 0 : data.organizers, max: loading ? 100 : data.totalUsers, color: "#1A6B7C" },
                { label: "Confirmed orders", value: loading ? 0 : data.totalOrders, max: Math.max(loading ? 100 : data.totalOrders, 1), color: "#F5A623" },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-ink/40 uppercase tracking-widest">{row.label}</span>
                    <span className="font-mono text-[10px] text-ink/50 font-bold">{row.value.toLocaleString()}</span>
                  </div>
                  <div className="h-1 rounded-full bg-black/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, (row.value / row.max) * 100)}%`, backgroundColor: row.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────── */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink/35 mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { href: "/admin/events",          label: "Review Events",   emoji: "🔍" },
            { href: "/admin/users",            label: "Manage Users",    emoji: "👥" },
            { href: "/admin/community/groups", label: "Groups",          emoji: "💬" },
            { href: "/admin/financials",       label: "Revenue",         emoji: "💰" },
            { href: "/admin/notifications",    label: "Notify Members",  emoji: "📣" },
            { href: "/admin/events/create",    label: "Create Event",    emoji: "✨" },
          ].map((a) => (
            <Link key={a.href} href={a.href}
              className="bg-white border border-black/[0.06] rounded-xl px-4 py-3.5 flex flex-col items-center gap-2 text-center hover:border-aubergine/25 hover:shadow-sm transition-all group shadow-sm">
              <span className="text-xl">{a.emoji}</span>
              <span className="font-ui text-[12px] font-semibold text-ink/60 group-hover:text-ink/80 transition-colors leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
