"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Types ───────────────────────────────────────────────────────────────────────

type OrderRow = {
  id: string;
  buyer_name: string;
  buyer_email: string;
  qty: number;
  unit_price: number;
  discount_amount: number;
  rameelo_fee: number;
  processing_fee: number;
  grand_total: number;
  status: string;
  payment_method: string;
  is_test: boolean;
  group_id: string | null;
  created_at: string;
  event_id: string;
  events: { id: string; title: string; start_date: string; city: string | null; state: string | null } | null;
  ticket_tiers: { name: string } | null;
};

type TypeFilter = "all" | "live" | "test";
type Sort = "newest" | "oldest" | "amount_high" | "amount_low";

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "bg-peacock/15 text-peacock" },
  pending:   { label: "Pending",   cls: "bg-marigold/20 text-[#a06b00]" },
  cancelled: { label: "Cancelled", cls: "bg-durga/15 text-durga" },
  refunded:  { label: "Refunded",  cls: "bg-ink/10 text-ink-muted" },
};

const PAGE_SIZE = 15;

function receiptNum(id: string) {
  return "RM-" + id.replace(/-/g, "").slice(0, 10).toUpperCase();
}
function fmtTS(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function fmtDateShort(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders]   = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("all");
  const [payment, setPayment]     = useState("all");
  const [eventFilter, setEvent]   = useState("all");
  const [typeFilter, setType]     = useState<TypeFilter>("all");
  const [sort, setSort]           = useState<Sort>("newest");
  const [page, setPage]           = useState(1);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("orders")
      .select(`
        id, buyer_name, buyer_email, qty, unit_price, discount_amount,
        rameelo_fee, processing_fee, grand_total, status, payment_method,
        is_test, group_id, created_at, event_id,
        events (id, title, start_date, city, state),
        ticket_tiers (name)
      `)
      .order("created_at", { ascending: false });
    setOrders((data ?? []) as unknown as OrderRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search, status, payment, eventFilter, typeFilter, sort]);

  // Distinct events present in orders (for the event filter)
  const eventOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of orders) if (o.events) map.set(o.events.id, o.events.title);
    return Array.from(map, ([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title));
  }, [orders]);

  const filtered = useMemo(() => {
    let result = [...orders];
    if (typeFilter === "live") result = result.filter(o => !o.is_test);
    if (typeFilter === "test") result = result.filter(o => o.is_test);
    if (status !== "all")  result = result.filter(o => o.status === status);
    if (payment !== "all") result = result.filter(o => o.payment_method === payment);
    if (eventFilter !== "all") result = result.filter(o => o.event_id === eventFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.buyer_name.toLowerCase().includes(q) ||
        o.buyer_email.toLowerCase().includes(q) ||
        (o.events?.title ?? "").toLowerCase().includes(q) ||
        receiptNum(o.id).toLowerCase().includes(q) ||
        (o.group_id ?? "").toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      if (sort === "amount_high") return b.grand_total - a.grand_total;
      if (sort === "amount_low")  return a.grand_total - b.grand_total;
      const diff = a.created_at.localeCompare(b.created_at);
      return sort === "oldest" ? diff : -diff;
    });
    return result;
  }, [orders, search, status, payment, eventFilter, typeFilter, sort]);

  // Stats reflect the current filter (excluding test orders from money)
  const stats = useMemo(() => {
    const live = filtered.filter(o => !o.is_test);
    return {
      count:    filtered.length,
      testCount: filtered.length - live.length,
      tickets:  live.reduce((s, o) => s + o.qty, 0),
      revenue:  live.reduce((s, o) => s + o.grand_total, 0),
      fees:     live.reduce((s, o) => s + o.rameelo_fee, 0),
    };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = search || status !== "all" || payment !== "all" || eventFilter !== "all" || typeFilter !== "all";

  function exportCsv() {
    const headers = ["Order", "Placed", "Buyer", "Email", "Event", "Tier", "Qty", "Unit Price", "Discount", "Rameelo Fee", "Processing Fee", "Total", "Payment", "Status", "Type"];
    const rows = filtered.map(o => [
      receiptNum(o.id), new Date(o.created_at).toISOString(), o.buyer_name, o.buyer_email,
      o.events?.title ?? "", o.ticket_tiers?.name ?? "", o.qty, o.unit_price, o.discount_amount,
      o.rameelo_fee, o.processing_fee, o.grand_total, o.payment_method, o.status, o.is_test ? "test" : "live",
    ]);
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(r => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `rameelo-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectCls = (active: boolean) =>
    `px-3 py-2 rounded-xl border font-ui text-sm transition-all focus:outline-none focus:ring-2 focus:ring-aubergine/20 ${active ? "border-aubergine/40 bg-aubergine/5 text-aubergine font-semibold" : "border-ivory-200 bg-white text-ink-muted"}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Orders</h2>
          <p className="font-ui text-ink-muted text-sm mt-0.5">
            {loading ? "—" : `${orders.length} order${orders.length !== 1 ? "s" : ""} across the platform`}
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={loading || filtered.length === 0}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ivory-200 bg-white text-ink-muted font-ui font-semibold text-sm hover:text-aubergine hover:border-aubergine/30 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Summary stats — reflect the current filter, money excludes test orders */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Orders", value: stats.count.toLocaleString(), sub: stats.testCount > 0 ? `${stats.testCount} test` : "all live" },
          { label: "Tickets (live)", value: stats.tickets.toLocaleString(), sub: "excludes test" },
          { label: "Gross revenue (live)", value: `$${money(stats.revenue)}`, sub: "excludes test" },
          { label: "Rameelo fees (live)", value: `$${money(stats.fees)}`, sub: "platform take" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-ivory-200 px-4 py-3.5">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{s.label}</p>
            <p className="font-display font-bold text-ink text-xl mt-1" style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
            <p className="font-mono text-[9px] text-ink-muted/70 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Type toggle + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-ivory rounded-2xl p-1 border border-ivory-200">
          {(["all", "live", "test"] as TypeFilter[]).map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`px-3.5 py-1.5 rounded-xl font-ui font-semibold text-sm capitalize transition-all ${
                typeFilter === t ? "bg-white text-ink shadow-sm border border-ivory-200" : "text-ink-muted hover:text-ink"
              }`}>
              {t}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search buyer, email, order #, event…"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-ivory-200 bg-white font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
          />
        </div>

        <select value={eventFilter} onChange={e => setEvent(e.target.value)} className={selectCls(eventFilter !== "all")}>
          <option value="all">All events</option>
          {eventOptions.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
        </select>

        <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls(status !== "all")}>
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>

        <select value={payment} onChange={e => setPayment(e.target.value)} className={selectCls(payment !== "all")}>
          <option value="all">All payments</option>
          <option value="card">Card</option>
          <option value="ach">ACH / Bank</option>
        </select>

        <select value={sort} onChange={e => setSort(e.target.value as Sort)} className={selectCls(false)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="amount_high">Amount: High to Low</option>
          <option value="amount_low">Amount: Low to High</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(""); setStatus("all"); setPayment("all"); setEvent("all"); setType("all"); }}
            className="px-3 py-2 rounded-xl font-ui text-sm text-ink-muted hover:text-durga transition-colors"
          >
            Clear filters
          </button>
        )}

        {!loading && (
          <span className="ml-auto font-mono text-[10px] text-ink-muted">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ivory-200 p-16 text-center">
          <p className="text-3xl mb-3">{hasFilters ? "🔍" : "🧾"}</p>
          <p className="font-ui text-ink-muted text-sm">{hasFilters ? "No orders match your filters." : "No orders yet."}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          <div className="grid items-center px-4 py-2 border-b border-ivory-200 bg-ivory/60"
            style={{ gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.8fr) 64px 100px 90px 110px 100px" }}>
            {["Order", "Event", "Qty", "Total", "Payment", "Status", "Placed"].map((h, i) => (
              <p key={h} className={`font-mono text-[9px] uppercase tracking-widest text-ink-muted ${i === 2 || i === 3 ? "text-right" : ""}`}>{h}</p>
            ))}
          </div>

          <div className="divide-y divide-ivory-200">
            {paginated.map(o => {
              const pill = STATUS_PILL[o.status] ?? { label: o.status, cls: "bg-ivory-200 text-ink-muted" };
              return (
                <div
                  key={o.id}
                  onClick={() => router.push(`/admin/orders/${o.id}`)}
                  className={`grid items-center px-4 py-2.5 cursor-pointer transition-colors hover:bg-ivory/50 ${o.is_test ? "bg-marigold/[0.03]" : ""}`}
                  style={{ gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.8fr) 64px 100px 90px 110px 100px" }}
                >
                  {/* Order + buyer */}
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-1.5">
                      <p className="font-mono text-[11px] font-bold text-ink truncate">{receiptNum(o.id)}</p>
                      {o.is_test && <span className="font-mono text-[8px] uppercase tracking-widest bg-marigold/20 text-marigold-dark px-1.5 py-0.5 rounded-full shrink-0">Test</span>}
                    </div>
                    <p className="font-ui text-xs text-ink-muted truncate">{o.buyer_name}</p>
                  </div>

                  {/* Event */}
                  <div className="min-w-0 pr-3">
                    <p className="font-ui font-semibold text-ink text-sm truncate">{o.events?.title ?? "—"}</p>
                    <p className="font-mono text-[10px] text-ink-muted/80 truncate">
                      {o.ticket_tiers?.name ?? "—"}
                      {o.events?.start_date ? ` · ${fmtDateShort(o.events.start_date)}` : ""}
                      {o.events?.city ? ` · ${o.events.city}` : ""}
                    </p>
                  </div>

                  {/* Qty */}
                  <p className="font-mono text-sm text-ink text-right">{o.qty}</p>

                  {/* Total */}
                  <p className="font-mono text-sm text-ink text-right">${money(o.grand_total)}</p>

                  {/* Payment */}
                  <p className="font-ui text-xs text-ink-muted uppercase">{o.payment_method}</p>

                  {/* Status */}
                  <div>
                    <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${pill.cls}`}>{pill.label}</span>
                  </div>

                  {/* Placed */}
                  <p className="font-mono text-[10px] text-ink-muted">{fmtTS(o.created_at)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] text-ink-muted">Page {page} of {totalPages} · {filtered.length} orders</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink hover:border-aubergine/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center font-mono text-xs text-ink-muted">…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p as number)}
                    className={`w-8 h-8 rounded-lg font-mono text-xs transition-all ${page === p ? "bg-aubergine text-white border border-aubergine" : "border border-ivory-200 text-ink-muted hover:text-ink hover:border-aubergine/30"}`}>
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-lg border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink hover:border-aubergine/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
