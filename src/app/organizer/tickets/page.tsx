"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "../org-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderRow = {
  id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  qty: number;
  unit_price: number;
  discount_pct: number;
  discount_amount: number;
  service_fee: number;
  grand_total: number;
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

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}
function receiptNum(id: string) {
  return "RM-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

// ── Expanded Row Detail ───────────────────────────────────────────────────────

function OrderDetail({ order }: { order: OrderRow }) {
  const subtotal = order.qty * order.unit_price;
  return (
    <div className="px-4 pb-4 pt-3 bg-ivory border-t border-ivory-200">
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Buyer info */}
        <div className="space-y-1">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2">Buyer</p>
          <p className="font-ui text-sm font-semibold text-ink">{order.buyer_name}</p>
          <p className="font-ui text-xs text-ink-muted">{order.buyer_email}</p>
          {order.buyer_phone && <p className="font-ui text-xs text-ink-muted">{order.buyer_phone}</p>}
          {order.group_id && (
            <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-marigold/10 text-marigold-dark">
              Group · {order.group_id}
            </span>
          )}
        </div>

        {/* Price breakdown */}
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2">Breakdown</p>
          <div className="space-y-1">
            <div className="flex justify-between font-ui text-xs">
              <span className="text-ink-muted">{order.qty} × ${Number(order.unit_price).toFixed(2)}</span>
              <span className="text-ink">${subtotal.toFixed(2)}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between font-ui text-xs">
                <span className="text-peacock">Group discount ({order.discount_pct}%)</span>
                <span className="text-peacock">−${Number(order.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-ui text-xs">
              <span className="text-ink-muted">Service fee</span>
              <span className="text-ink-muted">${Number(order.service_fee).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-ui text-xs font-bold border-t border-ivory-200 pt-1 mt-1">
              <span className="text-ink">Total paid</span>
              <span className="text-ink">${Number(order.grand_total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <p className="font-mono text-[9px] text-ink-muted">Order ID: {order.id}</p>
        <p className="font-mono text-[9px] text-ink-muted">· Purchased {fmtDateTime(order.created_at)}</p>
      </div>
    </div>
  );
}

// ── Table Row ─────────────────────────────────────────────────────────────────

function TableRow({ order }: { order: OrderRow }) {
  const [open, setOpen] = useState(false);
  const isUpcoming = order.eventDate >= new Date().toISOString().slice(0, 10);

  return (
    <>
      <tr
        onClick={() => setOpen(!open)}
        className="border-b border-ivory-200 hover:bg-ivory/60 cursor-pointer transition-colors"
      >
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="font-mono text-xs font-bold text-aubergine">{receiptNum(order.id)}</p>
          <p className="font-mono text-[9px] text-ink-muted">{fmtDateTime(order.created_at)}</p>
        </td>
        <td className="px-4 py-3 min-w-[160px]">
          <p className="font-ui text-sm font-medium text-ink">{order.buyer_name}</p>
          <p className="font-mono text-[10px] text-ink-muted truncate max-w-[180px]">{order.buyer_email}</p>
        </td>
        <td className="px-4 py-3 min-w-[160px]">
          <p className="font-ui text-sm text-ink truncate max-w-[200px]">{order.eventTitle}</p>
          <p className="font-mono text-[10px] text-ink-muted">{fmtDate(order.eventDate)}</p>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="font-ui text-sm text-ink">{order.tierName}</p>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-center">
          <span className="font-display font-bold text-ink text-sm">{order.qty}</span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <p className="font-display font-bold text-ink text-sm">${Number(order.grand_total).toFixed(2)}</p>
          {Number(order.discount_amount) > 0 && (
            <p className="font-mono text-[9px] text-peacock">{order.discount_pct}% disc.</p>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`font-mono text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-full ${
            order.status === "confirmed" ? "bg-peacock/10 text-peacock" : "bg-ivory-200 text-ink-muted"
          }`}>
            {order.status}
          </span>
          {order.group_id && (
            <span className="ml-1 font-mono text-[9px] px-2 py-0.5 rounded-full bg-marigold/10 text-marigold-dark">Group</span>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <svg
            className={`w-4 h-4 text-ink-muted inline transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-ivory-200">
          <td colSpan={8} className="p-0">
            <OrderDetail order={order} />
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrganizerTicketsPage() {
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
          id, buyer_name, buyer_email, buyer_phone,
          qty, unit_price, discount_pct, discount_amount, service_fee, grand_total,
          status, created_at, group_id, event_id,
          events (id, title, start_date),
          ticket_tiers (name)
        `)
        .in("event_id", eventIds)
        .order("created_at", { ascending: false });

      const rows: OrderRow[] = ((rawOrders ?? []) as unknown as {
        id: string; buyer_name: string; buyer_email: string; buyer_phone: string | null;
        qty: number; unit_price: number; discount_pct: number; discount_amount: number;
        service_fee: number; grand_total: number; status: string; created_at: string; group_id: string | null;
        event_id: string;
        events: { id: string; title: string; start_date: string };
        ticket_tiers: { name: string };
      }[]).map(o => ({
        id: o.id,
        buyer_name: o.buyer_name,
        buyer_email: o.buyer_email,
        buyer_phone: o.buyer_phone,
        qty: o.qty,
        unit_price: o.unit_price,
        discount_pct: o.discount_pct,
        discount_amount: o.discount_amount,
        service_fee: o.service_fee,
        grand_total: o.grand_total,
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

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.buyer_name.toLowerCase().includes(q) ||
        o.buyer_email.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        receiptNum(o.id).toLowerCase().includes(q) ||
        o.eventTitle.toLowerCase().includes(q)
      );
    }

    // Event filter
    if (eventFilter !== "all") list = list.filter(o => o.eventId === eventFilter);

    // Status filter
    if (statusFilter !== "all") list = list.filter(o => o.status === statusFilter);

    // Sort
    list.sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "date_asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "total_desc") return Number(b.grand_total) - Number(a.grand_total);
      if (sortBy === "name_asc") return a.buyer_name.localeCompare(b.buyer_name);
      return 0;
    });

    return list;
  }, [orders, search, eventFilter, statusFilter, sortBy]);

  // Aggregate stats
  const totalRevenue = filtered.reduce((s, o) => s + Number(o.grand_total), 0);
  const totalTickets = filtered.reduce((s, o) => s + o.qty, 0);

  const inputCls = "h-9 rounded-xl border border-ivory-200 bg-white px-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all";
  const selectCls = `${inputCls} cursor-pointer pr-8 appearance-none`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Ticket Orders</h2>
          <p className="font-ui text-ink-muted text-sm mt-0.5">
            {loading ? "Loading…" : `${orders.length} total order${orders.length !== 1 ? "s" : ""} across ${events.length} event${events.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/organizer/events/create"
          className="flex items-center gap-2 bg-aubergine text-white font-ui font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-aubergine-light transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New event
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-marigold/10 border border-marigold/20 flex items-center justify-center mx-auto mb-4 text-3xl">🎟️</div>
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
          {/* ── Search + Filters ── */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-4 space-y-3">
            {/* Search bar */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, order ID, or event…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 rounded-xl border border-ivory-200 bg-ivory pl-9 pr-4 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select value={eventFilter} onChange={e => setEventFilter(e.target.value)} className={selectCls}>
                  <option value="all">All events</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <div className="relative">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
                  <option value="all">All statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <div className="relative">
                <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className={selectCls}>
                  <option value="date_desc">Newest first</option>
                  <option value="date_asc">Oldest first</option>
                  <option value="total_desc">Highest total</option>
                  <option value="name_asc">Name A–Z</option>
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <span className="font-mono text-[10px] text-ink-muted">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
                {(search || eventFilter !== "all" || statusFilter !== "all") && (
                  <button
                    onClick={() => { setSearch(""); setEventFilter("all"); setStatusFilter("all"); }}
                    className="font-mono text-[10px] text-durga hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Summary strip ── */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Orders shown", value: filtered.length.toString() },
                { label: "Tickets", value: totalTickets.toString() },
                { label: "Revenue", value: `$${totalRevenue.toFixed(2)}` },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-ivory-200 px-4 py-3">
                  <p className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Table ── */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-ivory-200 p-12 text-center">
              <p className="font-display font-bold text-ink text-base mb-1">No matching orders</p>
              <p className="font-ui text-xs text-ink-muted">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-ivory-200 bg-ivory">
                      <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Order</th>
                      <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Buyer</th>
                      <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Event</th>
                      <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Tier</th>
                      <th className="px-4 py-3 text-center font-mono text-[9px] uppercase tracking-widest text-ink-muted">Qty</th>
                      <th className="px-4 py-3 text-right font-mono text-[9px] uppercase tracking-widest text-ink-muted">Total</th>
                      <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Status</th>
                      <th className="px-4 py-3 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(order => (
                      <TableRow key={order.id} order={order} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div className="px-4 py-3 border-t border-ivory-200 bg-ivory flex items-center justify-between">
                <p className="font-mono text-[10px] text-ink-muted">
                  Showing {filtered.length} of {orders.length} orders
                </p>
                <p className="font-mono text-[10px] text-ink-muted">
                  Click any row to expand details
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
