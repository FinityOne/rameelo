"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "../org-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderRow = {
  id: string;
  buyer_name: string;
  buyer_email: string;
  qty: number;
  discount_pct: number;
  discount_amount: number;
  // Organizer-facing amount is the ticket FACE VALUE only (qty * unit_price -
  // discount). The 3% Rameelo fee and 5% card fee are paid by the buyer and
  // never shown to organizers, so grand_total is intentionally not surfaced here.
  faceValue: number;
  status: string;
  created_at: string;
  group_id: string | null;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  tierName: string;
};

type EventOption = { id: string; title: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

const REFUND_STATES = new Set(["refunded", "cancelled"]);
const STATUS_PILL: Record<string, string> = {
  confirmed: "bg-peacock/10 text-peacock",
  pending:   "bg-marigold/20 text-[#a06b00]",
  refunded:  "bg-durga/15 text-durga",
  cancelled: "bg-ivory-200 text-ink-muted",
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}
function receiptNum(id: string) {
  return "RM-" + id.replace(/-/g, "").slice(0, 10).toUpperCase();
}
function money(n: number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`font-mono text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-full ${STATUS_PILL[status] ?? "bg-ivory-200 text-ink-muted"}`}>
      {status}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrganizerOrdersPage() {
  const router = useRouter();
  const { activeOrg } = useOrg();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "total_desc" | "name_asc">("date_desc");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const evQuery = supabase
        .from("events")
        .select("id, title, start_date")
        .order("start_date", { ascending: false });
      const { data: myEvents } = await (activeOrg
        ? evQuery.eq("org_id", activeOrg.id)
        : evQuery.eq("organizer_id", user.id));

      const eventList = (myEvents ?? []) as { id: string; title: string; start_date: string }[];
      setEvents(eventList.map(e => ({ id: e.id, title: e.title })));

      if (eventList.length === 0) { setLoading(false); return; }
      const eventIds = eventList.map(e => e.id);

      const { data: rawOrders } = await supabase
        .from("orders")
        .select(`
          id, buyer_name, buyer_email, qty, unit_price, discount_pct, discount_amount,
          status, created_at, group_id, event_id,
          events (id, title, start_date),
          ticket_tiers (name)
        `)
        .in("event_id", eventIds)
        .eq("is_test", false)
        .neq("status", "pending")   // organizers only see paid orders, never pending ones
        .order("created_at", { ascending: false });

      const rows: OrderRow[] = ((rawOrders ?? []) as unknown as {
        id: string; buyer_name: string; buyer_email: string;
        qty: number; unit_price: number; discount_pct: number; discount_amount: number;
        status: string; created_at: string; group_id: string | null; event_id: string;
        events: { id: string; title: string; start_date: string };
        ticket_tiers: { name: string };
      }[]).map(o => ({
        id: o.id,
        buyer_name: o.buyer_name,
        buyer_email: o.buyer_email,
        qty: o.qty,
        discount_pct: o.discount_pct,
        discount_amount: o.discount_amount,
        faceValue: Number(o.qty) * Number(o.unit_price) - Number(o.discount_amount),
        status: o.status,
        created_at: o.created_at,
        group_id: o.group_id,
        eventId: o.events?.id ?? o.event_id,
        eventTitle: o.events?.title ?? "",
        eventDate: o.events?.start_date ?? "",
        tierName: o.ticket_tiers?.name ?? "",
      }));

      setOrders(rows);
      setLoading(false);
    }
    load();
  }, [activeOrg]);

  const filtered = useMemo(() => {
    let list = [...orders];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.buyer_name.toLowerCase().includes(q) ||
        o.buyer_email.toLowerCase().includes(q) ||
        receiptNum(o.id).toLowerCase().includes(q) ||
        o.eventTitle.toLowerCase().includes(q)
      );
    }
    if (eventFilter !== "all") list = list.filter(o => o.eventId === eventFilter);
    if (statusFilter !== "all") list = list.filter(o => o.status === statusFilter);
    list.sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "date_asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "total_desc") return Number(b.faceValue) - Number(a.faceValue);
      if (sortBy === "name_asc") return a.buyer_name.localeCompare(b.buyer_name);
      return 0;
    });
    return list;
  }, [orders, search, eventFilter, statusFilter, sortBy]);

  // ── Summary (reflects current filter) ──
  const revenue   = filtered.filter(o => !REFUND_STATES.has(o.status)).reduce((s, o) => s + Number(o.faceValue), 0);
  const refunded  = filtered.filter(o => REFUND_STATES.has(o.status)).length;
  const hasFilters = search || eventFilter !== "all" || statusFilter !== "all";

  const selectCls = "h-9 rounded-xl border border-ivory-200 bg-white pl-3 pr-8 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all cursor-pointer appearance-none";
  const chevron = (
    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Orders</h2>
          <p className="font-ui text-ink-muted text-sm mt-0.5">
            {loading ? "Loading…" : `Every transaction across ${events.length} event${events.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-marigold/10 border border-marigold/20 flex items-center justify-center mx-auto mb-4 text-3xl">🛒</div>
          <p className="font-display font-semibold text-ink text-xl mb-2" style={{ letterSpacing: "-0.015em" }}>No orders yet</p>
          <p className="font-ui text-ink-muted text-sm max-w-xs mx-auto mb-6">
            Orders will appear here once attendees purchase tickets to your events.
          </p>
          <Link href="/organizer/events" className="inline-flex items-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-marigold-dark transition-colors shadow-sm">
            View my events →
          </Link>
        </div>
      ) : (
        <>
          {/* ── Summary: Revenue · Orders · Refunded ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Revenue", value: `$${money(revenue)}`, hint: "excludes refunds" },
              { label: "Orders", value: filtered.length.toLocaleString(), hint: hasFilters ? "matching filters" : "all orders" },
              { label: "Refunded Orders", value: refunded.toLocaleString(), hint: "refunded / cancelled" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-ivory-200 px-3 sm:px-4 py-3.5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{s.label}</p>
                <p className="font-display font-bold text-ink text-lg sm:text-2xl mt-1" style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
                <p className="font-mono text-[9px] text-ink-muted/70 mt-0.5 hidden sm:block">{s.hint}</p>
              </div>
            ))}
          </div>

          {/* ── Search + Filters ── */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-4 space-y-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, order #, or event…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 rounded-xl border border-ivory-200 bg-ivory pl-9 pr-9 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select value={eventFilter} onChange={e => setEventFilter(e.target.value)} className={selectCls}>
                  <option value="all">All events</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
                {chevron}
              </div>
              <div className="relative">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
                  <option value="all">All statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="refunded">Refunded</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {chevron}
              </div>
              <div className="relative">
                <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className={selectCls}>
                  <option value="date_desc">Newest first</option>
                  <option value="date_asc">Oldest first</option>
                  <option value="total_desc">Highest amount</option>
                  <option value="name_asc">Name A–Z</option>
                </select>
                {chevron}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="font-mono text-[10px] text-ink-muted">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
                {hasFilters && (
                  <button onClick={() => { setSearch(""); setEventFilter("all"); setStatusFilter("all"); }} className="font-mono text-[10px] text-durga hover:underline">
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-ivory-200 p-12 text-center">
              <p className="font-display font-bold text-ink text-base mb-1">No matching orders</p>
              <p className="font-ui text-xs text-ink-muted">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              {/* ── Desktop table ── */}
              <div className="hidden md:block bg-white rounded-2xl border border-ivory-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ivory-200 bg-ivory">
                      <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Order #</th>
                      <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Customer</th>
                      <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Event</th>
                      <th className="px-4 py-3 text-right font-mono text-[9px] uppercase tracking-widest text-ink-muted">Amount</th>
                      <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Status</th>
                      <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Purchase Date</th>
                      <th className="px-4 py-3 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(o => (
                      <tr key={o.id}
                        onClick={() => router.push(`/organizer/tickets/${o.id}`)}
                        className="border-b border-ivory-200 last:border-0 hover:bg-ivory/60 cursor-pointer transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-mono text-xs font-bold text-aubergine">{receiptNum(o.id)}</p>
                          {o.group_id && <span className="font-mono text-[8px] uppercase tracking-widest text-marigold-dark">Group</span>}
                        </td>
                        <td className="px-4 py-3 min-w-[160px]">
                          <p className="font-ui text-sm font-medium text-ink truncate max-w-[200px]">{o.buyer_name}</p>
                          <p className="font-mono text-[10px] text-ink-muted truncate max-w-[200px]">{o.buyer_email}</p>
                        </td>
                        <td className="px-4 py-3 min-w-[160px]">
                          <p className="font-ui text-sm text-ink truncate max-w-[220px]">{o.eventTitle}</p>
                          <p className="font-mono text-[10px] text-ink-muted">{o.tierName} · {o.qty} tkt</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <p className="font-display font-bold text-ink text-sm">${money(o.faceValue)}</p>
                          {Number(o.discount_amount) > 0 && <p className="font-mono text-[9px] text-peacock">{o.discount_pct}% off</p>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap"><StatusPill status={o.status} /></td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-mono text-[11px] text-ink-muted">{fmtDateTime(o.created_at)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <svg className="w-4 h-4 text-ink-muted inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t border-ivory-200 bg-ivory">
                  <p className="font-mono text-[10px] text-ink-muted">Showing {filtered.length} of {orders.length} orders · tap a row for full detail</p>
                </div>
              </div>

              {/* ── Mobile cards ── */}
              <div className="md:hidden space-y-2.5">
                {filtered.map(o => (
                  <Link key={o.id} href={`/organizer/tickets/${o.id}`}
                    className="block bg-white rounded-2xl border border-ivory-200 p-4 active:scale-[0.99] transition-transform">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="font-mono text-xs font-bold text-aubergine">{receiptNum(o.id)}</p>
                      <StatusPill status={o.status} />
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-ui text-sm font-semibold text-ink truncate">{o.buyer_name}</p>
                        <p className="font-mono text-[10px] text-ink-muted truncate">{o.buyer_email}</p>
                        <p className="font-ui text-xs text-ink-muted truncate mt-1.5">{o.eventTitle}</p>
                        <p className="font-mono text-[10px] text-ink-muted/80">{o.tierName} · {o.qty} ticket{o.qty !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display font-bold text-ink text-base">${money(o.faceValue)}</p>
                        {o.group_id && <span className="font-mono text-[8px] uppercase tracking-widest text-marigold-dark">Group</span>}
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2.5 border-t border-ivory-200 flex items-center justify-between">
                      <p className="font-mono text-[10px] text-ink-muted">{fmtDate(o.eventDate)} event</p>
                      <p className="font-mono text-[10px] text-ink-muted">{fmtDateTime(o.created_at)}</p>
                    </div>
                  </Link>
                ))}
                <p className="font-mono text-[10px] text-ink-muted text-center pt-1">Showing {filtered.length} of {orders.length} orders</p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
