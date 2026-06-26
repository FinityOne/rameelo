"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { createClient } from "@/lib/supabase/client";

// ── Shared range control ──────────────────────────────────────────────────────
// Default to the last 7 days; expand out to all-time. `null` p_from = since the
// first record (the RPC resolves it), so "All" never needs a client-side date.
type RangeKey = "7d" | "30d" | "90d" | "all";
const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "7d",  label: "7D",  days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
  { key: "all", label: "All", days: null },
];

function fromDate(days: number | null): string | null {
  if (days === null) return null;
  const d = new Date();
  d.setDate(d.getDate() - (days - 1)); // inclusive of today
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function RangeTabs({ value, onChange }: { value: RangeKey; onChange: (k: RangeKey) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-black/[0.04] rounded-full p-0.5">
      {RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => onChange(r.key)}
          className={`font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full transition-all ${
            value === r.key ? "bg-white text-aubergine shadow-sm" : "text-ink/40 hover:text-ink/70"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function money(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
}
function fmtAxis(day: string): string {
  const d = new Date(day + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtFull(day: string): string {
  const d = new Date(day + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

// ════════════════════════ Ticket sales ════════════════════════
type SalesPoint = { day: string; tickets: number; orders: number; revenue: number };
type SellingEvent = { event_id: string; title: string; startDate: string | null; tickets_sold: number };

// Compact event date for the picker, e.g. "Sep 20 '26".
function fmtShortDate(day: string | null): string {
  if (!day) return "";
  const d = new Date(day + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ` '${String(d.getFullYear()).slice(-2)}`;
}

function SalesTooltip({ active, payload }: { active?: boolean; payload?: { payload: SalesPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-ivory-200 bg-white shadow-lg px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">{fmtFull(p.day)}</p>
      <p className="font-ui text-sm font-bold text-ink">{p.tickets.toLocaleString()} ticket{p.tickets !== 1 ? "s" : ""}</p>
      <p className="font-ui text-xs text-peacock">{money(p.revenue)} in sales · {p.orders} order{p.orders !== 1 ? "s" : ""}</p>
    </div>
  );
}

export function TicketSalesChart() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [eventId, setEventId] = useState<string>(""); // "" = all events
  const [events, setEvents] = useState<SellingEvent[]>([]);
  const [data, setData] = useState<SalesPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Event dropdown — only events that have sold real tickets.
  useEffect(() => {
    createClient().rpc("admin_selling_events").then(({ data }) => {
      setEvents(((data ?? []) as { event_id: string; title: string; start_date: string | null; tickets_sold: number }[])
        .map((e) => ({ event_id: e.event_id, title: e.title, startDate: e.start_date, tickets_sold: Number(e.tickets_sold) })));
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const days = RANGES.find((r) => r.key === range)!.days;
    createClient()
      .rpc("admin_ticket_sales_timeseries", { p_from: fromDate(days), p_event_id: eventId || null })
      .then(({ data }) => {
        if (cancelled) return;
        setData(((data ?? []) as SalesPoint[]).map((r) => ({
          day: r.day, tickets: Number(r.tickets), orders: Number(r.orders), revenue: Number(r.revenue),
        })));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [range, eventId]);

  const totals = useMemo(() => ({
    tickets: data.reduce((s, d) => s + d.tickets, 0),
    revenue: data.reduce((s, d) => s + d.revenue, 0),
  }), [data]);

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-5">
      <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
        <div>
          <p className="font-display font-bold text-ink/80 text-sm" style={{ letterSpacing: "-0.01em" }}>Ticket Sales Over Time</p>
          <p className="font-mono text-[10px] text-ink/35 mt-0.5 uppercase tracking-widest">
            {totals.tickets.toLocaleString()} tickets · {money(totals.revenue)} · live orders only
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="font-ui text-xs text-ink/70 bg-white border border-ivory-200 rounded-lg px-2.5 py-1.5 max-w-[200px] focus:outline-none focus:border-aubergine cursor-pointer"
          >
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.event_id} value={e.event_id}>
                {e.title}{e.startDate ? ` · ${fmtShortDate(e.startDate)}` : ""} ({e.tickets_sold})
              </option>
            ))}
          </select>
          <RangeTabs value={range} onChange={setRange} />
        </div>
      </div>

      <div className="h-60 mt-3">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-black/10 border-t-marigold animate-spin" />
          </div>
        ) : totals.tickets === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <p className="text-2xl mb-1.5">🎟️</p>
            <p className="font-ui text-xs text-ink/40">No ticket sales in this range{eventId ? " for this event" : ""}.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F5A623" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#F5A623" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000008" vertical={false} />
              <XAxis dataKey="day" tickFormatter={fmtAxis} minTickGap={28}
                tick={{ fontSize: 10, fill: "#9a9088" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} width={36}
                tick={{ fontSize: 10, fill: "#9a9088" }} axisLine={false} tickLine={false} />
              <Tooltip content={<SalesTooltip />} cursor={{ stroke: "#F5A623", strokeWidth: 1, strokeOpacity: 0.4 }} />
              <Area type="monotone" dataKey="tickets" stroke="#F5A623" strokeWidth={2} fill="url(#salesFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ════════════════════════ User growth ════════════════════════
type SignupPoint = { day: string; signups: number };

function SignupTooltip({ active, payload }: { active?: boolean; payload?: { payload: SignupPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-ivory-200 bg-white shadow-lg px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">{fmtFull(p.day)}</p>
      <p className="font-ui text-sm font-bold text-ink">{p.signups.toLocaleString()} new account{p.signups !== 1 ? "s" : ""}</p>
    </div>
  );
}

export function SignupsChart() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [data, setData] = useState<SignupPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const days = RANGES.find((r) => r.key === range)!.days;
    createClient()
      .rpc("admin_signups_timeseries", { p_from: fromDate(days) })
      .then(({ data }) => {
        if (cancelled) return;
        setData(((data ?? []) as SignupPoint[]).map((r) => ({ day: r.day, signups: Number(r.signups) })));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [range]);

  const total = useMemo(() => data.reduce((s, d) => s + d.signups, 0), [data]);

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-5">
      <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
        <div>
          <p className="font-display font-bold text-ink/80 text-sm" style={{ letterSpacing: "-0.01em" }}>User Growth</p>
          <p className="font-mono text-[10px] text-ink/35 mt-0.5 uppercase tracking-widest">
            {total.toLocaleString()} new account{total !== 1 ? "s" : ""} in range
          </p>
        </div>
        <RangeTabs value={range} onChange={setRange} />
      </div>

      <div className="h-44 mt-3">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-black/10 border-t-aubergine animate-spin" />
          </div>
        ) : total === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <p className="text-2xl mb-1.5">👤</p>
            <p className="font-ui text-xs text-ink/40">No new signups in this range.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000008" vertical={false} />
              <XAxis dataKey="day" tickFormatter={fmtAxis} minTickGap={28}
                tick={{ fontSize: 10, fill: "#9a9088" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} width={36}
                tick={{ fontSize: 10, fill: "#9a9088" }} axisLine={false} tickLine={false} />
              <Tooltip content={<SignupTooltip />} cursor={{ fill: "#2E1B3010" }} />
              <Bar dataKey="signups" fill="#2E1B30" radius={[3, 3, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ════════════════════════ Logins ════════════════════════
type LoginPoint = { day: string; logins: number; users: number };

function LoginTooltip({ active, payload }: { active?: boolean; payload?: { payload: LoginPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-ivory-200 bg-white shadow-lg px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">{fmtFull(p.day)}</p>
      <p className="font-ui text-sm font-bold text-ink">{p.logins.toLocaleString()} login{p.logins !== 1 ? "s" : ""}</p>
      <p className="font-ui text-xs text-peacock">{p.users.toLocaleString()} unique user{p.users !== 1 ? "s" : ""}</p>
    </div>
  );
}

export function LoginsChart() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [data, setData] = useState<LoginPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const days = RANGES.find((r) => r.key === range)!.days;
    createClient()
      .rpc("admin_logins_timeseries", { p_from: fromDate(days) })
      .then(({ data }) => {
        if (cancelled) return;
        setData(((data ?? []) as LoginPoint[]).map((r) => ({ day: r.day, logins: Number(r.logins), users: Number(r.users) })));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [range]);

  const totals = useMemo(() => ({
    logins: data.reduce((s, d) => s + d.logins, 0),
    peakUsers: data.reduce((m, d) => Math.max(m, d.users), 0),
  }), [data]);

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-5">
      <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
        <div>
          <p className="font-display font-bold text-ink/80 text-sm" style={{ letterSpacing: "-0.01em" }}>Logins Over Time</p>
          <p className="font-mono text-[10px] text-ink/35 mt-0.5 uppercase tracking-widest">
            {totals.logins.toLocaleString()} login{totals.logins !== 1 ? "s" : ""} in range
          </p>
        </div>
        <RangeTabs value={range} onChange={setRange} />
      </div>

      <div className="h-44 mt-3">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-black/10 border-t-peacock animate-spin" />
          </div>
        ) : totals.logins === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <p className="text-2xl mb-1.5">🔐</p>
            <p className="font-ui text-xs text-ink/40">No logins in this range.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000008" vertical={false} />
              <XAxis dataKey="day" tickFormatter={fmtAxis} minTickGap={28}
                tick={{ fontSize: 10, fill: "#9a9088" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} width={36}
                tick={{ fontSize: 10, fill: "#9a9088" }} axisLine={false} tickLine={false} />
              <Tooltip content={<LoginTooltip />} cursor={{ stroke: "#0E8C7A", strokeWidth: 1, strokeOpacity: 0.4 }} />
              <Line type="monotone" dataKey="logins" stroke="#0E8C7A" strokeWidth={2.5}
                dot={false} activeDot={{ r: 4, fill: "#0E8C7A" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
