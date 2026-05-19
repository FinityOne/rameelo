"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Order = {
  id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  qty: number;
  unit_price: number;
  discount_amount: number;
  service_fee: number;
  grand_total: number;
  status: string;
  created_at: string;
  group_id: string | null;
  ticket_tiers: { name: string } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "bg-peacock/15 text-peacock" },
  pending:   { label: "Pending",   cls: "bg-marigold/20 text-[#a06b00]" },
  refunded:  { label: "Refunded",  cls: "bg-durga/15 text-durga" },
  cancelled: { label: "Cancelled", cls: "bg-ivory-200 text-ink-muted" },
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EventOrdersPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [orders, setOrders]       = useState<Order[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<string>("all");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [evRes, ordRes] = await Promise.all([
        supabase.from("events").select("title").eq("id", id).eq("organizer_id", user.id).single(),
        supabase.from("orders")
          .select("id, buyer_name, buyer_email, buyer_phone, qty, unit_price, discount_amount, service_fee, grand_total, status, created_at, group_id, ticket_tiers(name)")
          .eq("event_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (!evRes.data) { router.replace("/portal/organizer/events"); return; }
      setEventTitle(evRes.data.title);
      setOrders((ordRes.data ?? []) as unknown as Order[]);
      setLoading(false);
    }
    load();
  }, [id, router]);

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const totalRevenue = orders.filter(o => o.status === "confirmed").reduce((s, o) => s + o.grand_total, 0);
  const totalTickets = orders.filter(o => o.status === "confirmed").reduce((s, o) => s + o.qty, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Link href="/portal/organizer/events"
            className="font-ui text-xs text-ink-muted hover:text-ink flex items-center gap-1 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            My Events
          </Link>
          <span className="text-ink-muted/40 text-xs">/</span>
          <Link href={`/portal/organizer/events/${id}`}
            className="font-ui text-xs text-ink-muted hover:text-ink transition-colors truncate max-w-[180px]">
            {eventTitle}
          </Link>
          <span className="text-ink-muted/40 text-xs">/</span>
          <span className="font-ui text-xs text-ink">Orders</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>All Orders</h1>
            <p className="font-ui text-sm text-ink-muted mt-0.5">
              {orders.length} order{orders.length !== 1 ? "s" : ""} · {totalTickets} tickets · ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} confirmed revenue
            </p>
          </div>
          <Link href={`/portal/organizer/events/${id}`}
            className="font-ui text-sm font-semibold text-ink-muted hover:text-ink flex items-center gap-1 transition-colors">
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* Summary tiles */}
      {orders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Confirmed", count: orders.filter(o => o.status === "confirmed").length, cls: "text-peacock" },
            { label: "Pending",   count: orders.filter(o => o.status === "pending").length,   cls: "text-[#a06b00]" },
            { label: "Refunded",  count: orders.filter(o => o.status === "refunded").length,  cls: "text-durga" },
            { label: "Cancelled", count: orders.filter(o => o.status === "cancelled").length, cls: "text-ink-muted" },
          ].map(tile => (
            <button
              key={tile.label}
              onClick={() => setFilter(filter === tile.label.toLowerCase() ? "all" : tile.label.toLowerCase())}
              className={`bg-white rounded-2xl border px-4 py-3.5 text-left transition-all ${
                filter === tile.label.toLowerCase() ? "border-aubergine shadow-sm" : "border-ivory-200 hover:border-aubergine/25"
              }`}
            >
              <p className={`font-display font-bold text-2xl ${tile.cls}`} style={{ letterSpacing: "-0.03em" }}>{tile.count}</p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-1">{tile.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filter bar */}
      {orders.length > 0 && (
        <div className="flex items-center gap-1 bg-ivory-200 rounded-xl p-1 w-fit">
          {["all", "confirmed", "pending", "refunded", "cancelled"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg font-ui text-xs font-semibold capitalize transition-all ${
                filter === f ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              }`}>
              {f === "all" ? `All (${orders.length})` : f}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
          <p className="text-4xl mb-3">🧾</p>
          <p className="font-display font-semibold text-ink text-lg mb-1" style={{ letterSpacing: "-0.015em" }}>
            {orders.length === 0 ? "No orders yet" : `No ${filter} orders`}
          </p>
          <p className="font-ui text-sm text-ink-muted">
            {orders.length === 0 ? "Orders will appear here as attendees purchase tickets." : "Try a different filter."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ivory-200 bg-ivory">
                  <th className="px-5 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Date</th>
                  <th className="px-5 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Buyer</th>
                  <th className="px-5 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Tier</th>
                  <th className="px-5 py-3 text-center font-mono text-[9px] uppercase tracking-widest text-ink-muted">Qty</th>
                  <th className="px-5 py-3 text-right font-mono text-[9px] uppercase tracking-widest text-ink-muted">Total</th>
                  <th className="px-5 py-3 text-center font-mono text-[9px] uppercase tracking-widest text-ink-muted">Status</th>
                  <th className="px-5 py-3 text-center font-mono text-[9px] uppercase tracking-widest text-ink-muted">Group</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {filtered.map(order => {
                  const s = ORDER_STATUS[order.status] ?? ORDER_STATUS.confirmed;
                  return (
                    <tr key={order.id} className="hover:bg-ivory/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-ui text-xs text-ink">{fmtDate(order.created_at)}</p>
                        <p className="font-mono text-[9px] text-ink-muted">{fmtTime(order.created_at)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-ui text-sm font-semibold text-ink">{order.buyer_name}</p>
                        <p className="font-mono text-[9px] text-ink-muted">{order.buyer_email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-ui text-sm text-ink">{order.ticket_tiers?.name ?? "—"}</p>
                        <p className="font-mono text-[9px] text-ink-muted">${order.unit_price}/ticket</p>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <p className="font-display font-bold text-ink" style={{ letterSpacing: "-0.02em" }}>{order.qty}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <p className="font-display font-bold text-peacock" style={{ letterSpacing: "-0.02em" }}>${order.grand_total.toFixed(2)}</p>
                        {order.discount_amount > 0 && (
                          <p className="font-mono text-[9px] text-ink-muted">−${order.discount_amount.toFixed(2)} disc.</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${s.cls}`}>{s.label}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {order.group_id ? (
                          <span className="font-mono text-[9px] text-aubergine bg-aubergine/8 px-2 py-0.5 rounded-full">Group</span>
                        ) : (
                          <span className="font-mono text-[9px] text-ink-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-ivory-200">
            {filtered.map(order => {
              const s = ORDER_STATUS[order.status] ?? ORDER_STATUS.confirmed;
              return (
                <div key={order.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="min-w-0">
                      <p className="font-ui text-sm font-semibold text-ink">{order.buyer_name}</p>
                      <p className="font-mono text-[9px] text-ink-muted">{order.ticket_tiers?.name ?? "—"} · {order.qty} ticket{order.qty !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-bold text-peacock" style={{ letterSpacing: "-0.02em" }}>${order.grand_total.toFixed(2)}</p>
                      <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                    </div>
                  </div>
                  <p className="font-mono text-[9px] text-ink-muted">{fmtDate(order.created_at)} · {fmtTime(order.created_at)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
