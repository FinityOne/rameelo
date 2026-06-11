"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "../org-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type Order = {
  id: string; buyer_email: string; buyer_name: string;
  qty: number; unit_price: number; discount_amount: number; grand_total: number;
  status: string; created_at: string; event_id: string; tier_id: string;
  eventTitle: string; eventState: string; tierName: string;
};
type EventInfo = { id: string; title: string; state: string; start_date: string; capacity: number | null; cap: number };
type SavedView = { name: string; range: string; eventId: string; tier: string; status: string };

const REFUND = new Set(["refunded", "cancelled"]);
const RANGES: { key: string; label: string; days: number | null }[] = [
  { key: "all", label: "All time", days: null },
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "ytd", label: "This year", days: -1 },
];
// Funnel conversion benchmarks (modeled — no live view/cart tracking yet)
const FUNNEL = { viewToCart: 0.30, cartToCheckout: 0.65, checkoutToPurchase: 0.75 };

function money(n: number) { return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function compact(n: number) {
  if (n >= 1_000_000) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}
function fmtDay(d: string) { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function daysUntil(d: string) { return Math.ceil((new Date(d + "T00:00:00").getTime() - Date.now()) / 86400000); }
function daysBetween(a: string, b: number) { return Math.max(0, (b - new Date(a).getTime()) / 86400000); }

// ── Building blocks ──────────────────────────────────────────────────────────────

function Card({ title, subtitle, action, children, badge }: { title: string; subtitle?: string; action?: React.ReactNode; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-ivory-200 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>{title}</p>
            {badge && <span className="font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-marigold/15 text-marigold-dark">{badge}</span>}
          </div>
          {subtitle && <p className="font-ui text-[11px] text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="font-ui text-sm text-ink-muted text-center py-6">{children}</p>;
}
function BarList({ rows, fmt, color = "#0E8C7A" }: { rows: { label: string; value: number; sub?: string }[]; fmt: (n: number) => string; color?: string }) {
  if (rows.length === 0) return <Empty>No data in this range.</Empty>;
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <div className="space-y-3">
      {rows.map(r => (
        <div key={r.label}>
          <div className="flex justify-between items-baseline text-xs mb-1 gap-2">
            <span className="font-ui text-ink truncate">{r.label}</span>
            <span className="font-mono text-ink-muted shrink-0">{fmt(r.value)}{r.sub ? ` · ${r.sub}` : ""}</span>
          </div>
          <div className="h-2 rounded-full bg-ivory-200 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(r.value / max) * 100}%`, backgroundColor: color, minWidth: r.value > 0 ? 4 : 0 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { activeOrg } = useOrg();
  const [orders, setOrders] = useState<Order[]>([]);
  const [eventInfos, setEventInfos] = useState<EventInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [range, setRange] = useState("all");
  const [eventId, setEventId] = useState("all");
  const [tier, setTier] = useState("all");
  const [status, setStatus] = useState("all");

  // Saved views
  const [saved, setSaved] = useState<SavedView[]>([]);
  const viewsKey = useMemo(() => `rameelo_reports_views_${activeOrg?.id ?? "me"}`, [activeOrg]);
  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem(viewsKey) ?? "[]")); } catch { setSaved([]); }
  }, [viewsKey]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const evQuery = supabase.from("events").select("id, title, state, start_date, capacity, ticket_tiers(id, name, price, quantity)");
      const { data: evs } = await (activeOrg ? evQuery.eq("org_id", activeOrg.id) : evQuery.eq("organizer_id", user.id));
      const events = (evs ?? []) as unknown as { id: string; title: string; state: string | null; start_date: string; capacity: number | null; ticket_tiers: { id: string; name: string; price: number; quantity: number }[] }[];
      if (events.length === 0) { setLoading(false); return; }

      const tierMap = new Map<string, string>();
      const infos: EventInfo[] = events.map(e => {
        (e.ticket_tiers ?? []).forEach(t => tierMap.set(t.id, t.name));
        return { id: e.id, title: e.title, state: e.state ?? "—", start_date: e.start_date, capacity: e.capacity, cap: (e.ticket_tiers ?? []).reduce((s, t) => s + t.quantity, 0) };
      });
      const evMap = new Map(infos.map(i => [i.id, i]));
      setEventInfos(infos);

      const { data: rawOrders } = await supabase
        .from("orders")
        .select("id, buyer_email, buyer_name, qty, unit_price, discount_amount, grand_total, status, created_at, event_id, tier_id")
        .in("event_id", events.map(e => e.id))
        .eq("is_test", false)
        .neq("status", "pending")   // organizers only see paid orders, never pending ones
        .order("created_at", { ascending: true });

      const rows: Order[] = ((rawOrders ?? []) as Omit<Order, "eventTitle" | "eventState" | "tierName">[]).map(o => ({
        ...o,
        eventTitle: evMap.get(o.event_id)?.title ?? "Event",
        eventState: evMap.get(o.event_id)?.state ?? "—",
        tierName: tierMap.get(o.tier_id) ?? "—",
      }));
      setOrders(rows);
      setLoading(false);
    }
    load();
  }, [activeOrg]);

  // ── Apply filters ──
  const cutoff = useMemo(() => {
    const r = RANGES.find(x => x.key === range);
    if (!r || r.days === null) return null;
    if (r.days === -1) return `${new Date().getFullYear()}-01-01T00:00:00`;
    return new Date(Date.now() - r.days * 86400000).toISOString();
  }, [range]);

  const filtered = useMemo(() => orders.filter(o =>
    (!cutoff || o.created_at >= cutoff) &&
    (eventId === "all" || o.event_id === eventId) &&
    (tier === "all" || o.tierName === tier) &&
    (status === "all" || o.status === status)
  ), [orders, cutoff, eventId, tier, status]);

  const confirmed = useMemo(() => filtered.filter(o => !REFUND.has(o.status)), [filtered]);

  // Global per-buyer order counts (for New vs Returning)
  const buyerTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) if (!REFUND.has(o.status)) m.set(o.buyer_email.toLowerCase(), (m.get(o.buyer_email.toLowerCase()) ?? 0) + 1);
    return m;
  }, [orders]);

  const tierNames = useMemo(() => Array.from(new Set(orders.map(o => o.tierName))).sort(), [orders]);

  // ── Metrics ──
  const revenue = confirmed.reduce((s, o) => s + Number(o.grand_total), 0);
  const tickets = confirmed.reduce((s, o) => s + o.qty, 0);
  const aov = confirmed.length ? revenue / confirmed.length : 0;

  const byEvent = useMemo(() => groupSum(confirmed, o => o.eventTitle, o => Number(o.grand_total)).sort((a, b) => b.value - a.value).slice(0, 10), [confirmed]);
  const byTier = useMemo(() => {
    const tixMap = new Map<string, number>();
    confirmed.forEach(o => tixMap.set(o.tierName, (tixMap.get(o.tierName) ?? 0) + o.qty));
    return groupSum(confirmed, o => o.tierName, o => Number(o.grand_total)).sort((a, b) => b.value - a.value)
      .map(r => ({ ...r, sub: `${tixMap.get(r.label) ?? 0} tix` }));
  }, [confirmed]);
  const byDay = useMemo(() => groupSum(confirmed, o => o.created_at.slice(0, 10), o => Number(o.grand_total)).sort((a, b) => a.label.localeCompare(b.label)), [confirmed]);
  const byState = useMemo(() => groupSum(confirmed, o => o.eventState, o => Number(o.grand_total)).sort((a, b) => b.value - a.value), [confirmed]);

  // New vs Returning (customer level)
  const customers = useMemo(() => {
    const seen = new Map<string, boolean>(); // email → returning?
    for (const o of confirmed) {
      const e = o.buyer_email.toLowerCase();
      if (!seen.has(e)) seen.set(e, (buyerTotals.get(e) ?? 0) > 1);
    }
    let ret = 0; seen.forEach(v => { if (v) ret++; });
    return { total: seen.size, returning: ret, neu: seen.size - ret };
  }, [confirmed, buyerTotals]);

  // Funnel (modeled from real purchases)
  const purchases = confirmed.length;
  const checkout = Math.round(purchases / FUNNEL.checkoutToPurchase) || 0;
  const cart = Math.round(checkout / FUNNEL.cartToCheckout) || 0;
  const views = Math.round(cart / FUNNEL.viewToCart) || 0;
  const funnel = [
    { label: "Event Views", value: views, real: false },
    { label: "Add to Cart", value: cart, real: false },
    { label: "Checkout Started", value: checkout, real: false },
    { label: "Purchase Completed", value: purchases, real: true },
  ];

  // Forecasting (velocity-based, ignores date filter; respects event filter)
  const forecasts = useMemo(() => {
    const now = Date.now();
    const scoped = orders.filter(o => !REFUND.has(o.status) && (eventId === "all" || o.event_id === eventId));
    const byEv = new Map<string, Order[]>();
    scoped.forEach(o => { (byEv.get(o.event_id) ?? byEv.set(o.event_id, []).get(o.event_id)!).push(o); });
    const out: { id: string; title: string; sold: number; revenue: number; projAtt: number; projRev: number; daysLeft: number; cap: number }[] = [];
    byEv.forEach((evOrders, eid) => {
      const info = eventInfos.find(i => i.id === eid);
      if (!info) return;
      const daysLeft = daysUntil(info.start_date);
      if (daysLeft <= 0) return; // only upcoming
      const sold = evOrders.reduce((s, o) => s + o.qty, 0);
      const rev = evOrders.reduce((s, o) => s + Number(o.grand_total), 0);
      if (sold === 0) return;
      const firstSale = evOrders.reduce((m, o) => o.created_at < m ? o.created_at : m, evOrders[0].created_at);
      const daysSelling = Math.max(1, daysBetween(firstSale, now));
      const velocity = sold / daysSelling;
      const addl = velocity * daysLeft;
      const cap = info.cap || Infinity;
      const projAtt = Math.min(cap, Math.round(sold + addl));
      const avgPrice = rev / sold;
      const projRev = Math.min(cap === Infinity ? Infinity : cap * avgPrice, rev + addl * avgPrice);
      out.push({ id: eid, title: info.title, sold, revenue: rev, projAtt, projRev, daysLeft, cap: info.cap ? info.cap : 0 });
    });
    return out.sort((a, b) => b.projRev - a.projRev);
  }, [orders, eventId, eventInfos]);

  const totalProjAtt = forecasts.reduce((s, f) => s + f.projAtt, 0);
  const totalProjRev = forecasts.reduce((s, f) => s + f.projRev, 0);

  // ── Saved views + export ──
  function saveView() {
    const name = window.prompt("Name this report view:");
    if (!name) return;
    const next = [...saved.filter(v => v.name !== name), { name, range, eventId, tier, status }];
    setSaved(next);
    try { localStorage.setItem(viewsKey, JSON.stringify(next)); } catch { /* ignore */ }
  }
  function applyView(v: SavedView) { setRange(v.range); setEventId(v.eventId); setTier(v.tier); setStatus(v.status); }
  function deleteView(name: string) {
    const next = saved.filter(v => v.name !== name);
    setSaved(next);
    try { localStorage.setItem(viewsKey, JSON.stringify(next)); } catch { /* ignore */ }
  }
  function resetFilters() { setRange("all"); setEventId("all"); setTier("all"); setStatus("all"); }
  function exportCsv() {
    const headers = ["Order", "Date", "Buyer", "Email", "Event", "Tier", "Qty", "Unit Price", "Discount", "Total", "Status"];
    const rows = filtered.map(o => [
      "RM-" + o.id.replace(/-/g, "").slice(0, 10).toUpperCase(), new Date(o.created_at).toISOString(),
      o.buyer_name, o.buyer_email, o.eventTitle, o.tierName, o.qty, o.unit_price, o.discount_amount, o.grand_total, o.status,
    ]);
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(r => r.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = `rameelo-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const selectCls = "h-9 rounded-xl border border-ivory-200 bg-white pl-3 pr-8 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/20 cursor-pointer appearance-none";
  const chev = (
    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
  );
  const hasFilters = range !== "all" || eventId !== "all" || tier !== "all" || status !== "all";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Reports</h2>
          <p className="font-ui text-ink-muted text-sm mt-0.5">Advanced reporting — build a view, save it, export it.</p>
        </div>
        <button onClick={exportCsv} disabled={loading || filtered.length === 0}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ivory-200 bg-white text-ink-muted font-ui font-semibold text-sm hover:text-aubergine hover:border-aubergine/30 transition-all disabled:opacity-50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" /></div>
      ) : eventInfos.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-marigold/10 border border-marigold/20 flex items-center justify-center mx-auto mb-4 text-3xl">📈</div>
          <p className="font-display font-semibold text-ink text-xl mb-2" style={{ letterSpacing: "-0.015em" }}>No data to report yet</p>
          <p className="font-ui text-ink-muted text-sm max-w-xs mx-auto mb-6">Reports build automatically as your events sell tickets.</p>
          <Link href="/organizer/events" className="inline-flex items-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-marigold-dark transition-colors shadow-sm">View my events →</Link>
        </div>
      ) : (
        <>
          {/* ── Filter bar ── */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-4 space-y-3 sticky top-[52px] z-20" style={{ backdropFilter: "blur(8px)" }}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative"><select value={range} onChange={e => setRange(e.target.value)} className={selectCls}>{RANGES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}</select>{chev}</div>
              <div className="relative"><select value={eventId} onChange={e => setEventId(e.target.value)} className={selectCls}><option value="all">All events</option>{eventInfos.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select>{chev}</div>
              <div className="relative"><select value={tier} onChange={e => setTier(e.target.value)} className={selectCls}><option value="all">All ticket types</option>{tierNames.map(t => <option key={t} value={t}>{t}</option>)}</select>{chev}</div>
              <div className="relative"><select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}><option value="all">All statuses</option><option value="confirmed">Confirmed</option><option value="refunded">Refunded</option><option value="cancelled">Cancelled</option></select>{chev}</div>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={saveView} className="font-ui font-semibold text-xs px-3 py-1.5 rounded-lg bg-aubergine text-white hover:bg-aubergine-light transition-colors">Save view</button>
                {hasFilters && <button onClick={resetFilters} className="font-mono text-[10px] text-durga hover:underline">Reset</button>}
              </div>
            </div>
            {saved.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-ivory-200">
                <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mr-1">Saved:</span>
                {saved.map(v => (
                  <span key={v.name} className="inline-flex items-center gap-1 rounded-full bg-ivory border border-ivory-200 pl-2.5 pr-1 py-1">
                    <button onClick={() => applyView(v)} className="font-ui text-xs text-ink hover:text-aubergine">{v.name}</button>
                    <button onClick={() => deleteView(v.name)} className="text-ink-muted hover:text-durga"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Revenue ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Revenue", value: `$${money(revenue)}` },
              { label: "Orders", value: confirmed.length.toLocaleString() },
              { label: "Tickets", value: tickets.toLocaleString() },
              { label: "Avg. Order", value: `$${money(aov)}` },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-ivory-200 px-4 py-3.5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{s.label}</p>
                <p className="font-display font-bold text-ink text-xl sm:text-2xl mt-1" style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
              </div>
            ))}
          </div>

          <Card title="Revenue by Day" subtitle="Daily ticket revenue across the selected range">
            {byDay.length === 0 ? <Empty>No revenue in this range.</Empty> : (
              <>
                <div className="flex items-end gap-[3px] h-36 overflow-x-auto pb-1">
                  {byDay.map(d => {
                    const max = Math.max(1, ...byDay.map(x => x.value));
                    return (
                      <div key={d.label} className="flex-1 min-w-[6px] h-full flex items-end" title={`${fmtDay(d.label)} · $${money(d.value)}`}>
                        <div className="w-full rounded-t" style={{ height: `${(d.value / max) * 100}%`, backgroundColor: "#2E1B30", minHeight: d.value > 0 ? 2 : 0 }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 font-mono text-[9px] text-ink-muted">
                  <span>{fmtDay(byDay[0].label)}</span><span>{fmtDay(byDay[byDay.length - 1].label)}</span>
                </div>
              </>
            )}
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Revenue by Event">
              <BarList rows={byEvent} fmt={compact} color="#0E8C7A" />
            </Card>
            <Card title="Revenue by Ticket Type">
              <BarList rows={byTier} fmt={compact} color="#3D2543" />
            </Card>
          </div>

          {/* ── Attendees ── */}
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted px-1 pt-1">Attendees</p>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="New vs Returning" subtitle={`${customers.total.toLocaleString()} unique customers`}>
              {customers.total === 0 ? <Empty>No customers in this range.</Empty> : (
                <>
                  <div className="flex h-3 rounded-full overflow-hidden mb-3">
                    <div style={{ width: `${(customers.neu / customers.total) * 100}%`, backgroundColor: "#0E8C7A" }} />
                    <div style={{ width: `${(customers.returning / customers.total) * 100}%`, backgroundColor: "#F5A623" }} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <div><span className="inline-block w-2.5 h-2.5 rounded-full bg-peacock mr-1.5 align-middle" /><span className="font-ui text-ink">New</span> <span className="font-display font-bold text-ink ml-1">{customers.neu}</span></div>
                    <div><span className="inline-block w-2.5 h-2.5 rounded-full bg-marigold mr-1.5 align-middle" /><span className="font-ui text-ink">Returning</span> <span className="font-display font-bold text-ink ml-1">{customers.returning}</span></div>
                  </div>
                  <p className="font-mono text-[10px] text-ink-muted mt-3">{customers.total ? Math.round((customers.returning / customers.total) * 100) : 0}% repeat-customer rate</p>
                </>
              )}
            </Card>
            <Card title="Geography" subtitle="Sales by event location (state)">
              <BarList rows={byState.map(r => ({ ...r }))} fmt={compact} color="#7C1F2C" />
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Age Range" badge="Coming soon">
              <div className="text-center py-4">
                <p className="font-ui text-sm text-ink-muted">Age data isn&apos;t collected at checkout yet.</p>
                <p className="font-ui text-xs text-ink-muted/70 mt-1">We&apos;ll surface age breakdowns here once attendees share their birth year — opt-in, privacy-first.</p>
              </div>
            </Card>
            <Card title="Gender" badge="Coming soon">
              <div className="text-center py-4">
                <p className="font-ui text-sm text-ink-muted">Gender isn&apos;t collected yet.</p>
                <p className="font-ui text-xs text-ink-muted/70 mt-1">When available, the split will appear here automatically.</p>
              </div>
            </Card>
          </div>

          {/* ── Sales Funnel ── */}
          <Card title="Sales Funnel" badge="Estimated"
            subtitle="Purchases are real; upstream steps are modeled from typical conversion benchmarks until live page tracking ships.">
            {purchases === 0 ? <Empty>No purchases to model a funnel.</Empty> : (
              <div className="space-y-2.5">
                {funnel.map((s, i) => {
                  const top = funnel[0].value || 1;
                  const conv = i > 0 && funnel[i - 1].value > 0 ? Math.round((s.value / funnel[i - 1].value) * 100) : null;
                  return (
                    <div key={s.label}>
                      <div className="flex justify-between items-baseline text-xs mb-1">
                        <span className="font-ui text-ink flex items-center gap-1.5">
                          {s.label}
                          {s.real
                            ? <span className="font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-peacock/15 text-peacock">Actual</span>
                            : <span className="font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-ivory-200 text-ink-muted">Est.</span>}
                        </span>
                        <span className="font-mono text-ink-muted">{s.value.toLocaleString()}{conv !== null && <span className="text-ink-muted/60"> · {conv}%</span>}</span>
                      </div>
                      <div className="h-6 rounded-lg bg-ivory-200 overflow-hidden">
                        <div className="h-full rounded-lg flex items-center" style={{ width: `${(s.value / top) * 100}%`, backgroundColor: s.real ? "#0E8C7A" : "#2E1B30", minWidth: 6, opacity: s.real ? 1 : 0.55 }} />
                      </div>
                    </div>
                  );
                })}
                <p className="font-mono text-[10px] text-ink-muted/70 pt-1">Benchmarks: {Math.round(FUNNEL.viewToCart * 100)}% view→cart · {Math.round(FUNNEL.cartToCheckout * 100)}% cart→checkout · {Math.round(FUNNEL.checkoutToPurchase * 100)}% checkout→purchase.</p>
              </div>
            )}
          </Card>

          {/* ── Forecasting ── */}
          <Card title="Forecasting" badge="Projection"
            subtitle="Projected final sales for upcoming events, based on each event's current selling velocity and days remaining.">
            {forecasts.length === 0 ? (
              <Empty>Forecasts appear once an upcoming event has started selling.</Empty>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-ivory/60 px-4 py-3 text-center">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Projected Attendance</p>
                    <p className="font-display font-bold text-ink text-2xl mt-0.5" style={{ letterSpacing: "-0.02em" }}>{totalProjAtt.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-ivory/60 px-4 py-3 text-center">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Projected Revenue</p>
                    <p className="font-display font-bold text-peacock text-2xl mt-0.5" style={{ letterSpacing: "-0.02em" }}>{compact(totalProjRev)}</p>
                  </div>
                </div>
                <div className="divide-y divide-ivory-200">
                  {forecasts.map(f => (
                    <div key={f.id} className="py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-ui text-sm font-semibold text-ink truncate">{f.title}</p>
                        <p className="font-mono text-[10px] text-ink-muted">{f.sold} sold now · {f.daysLeft}d left{f.cap ? ` · ${f.cap} capacity` : ""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display font-bold text-ink text-sm">~{f.projAtt.toLocaleString()} <span className="font-ui font-normal text-[11px] text-ink-muted">tickets</span></p>
                        <p className="font-mono text-[11px] text-peacock">~{compact(f.projRev)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="font-mono text-[10px] text-ink-muted/70 pt-2">Projections are estimates from recent velocity and are capped at each event&apos;s ticket inventory.</p>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ── util ──
function groupSum<T>(items: T[], keyFn: (x: T) => string, valFn: (x: T) => number) {
  const m = new Map<string, number>();
  for (const it of items) { const k = keyFn(it); m.set(k, (m.get(k) ?? 0) + valFn(it)); }
  return Array.from(m, ([label, value]) => ({ label, value }));
}
