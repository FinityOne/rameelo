"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import EventSubnav from "../EventSubnav";

// ─── Types ────────────────────────────────────────────────────────────────────

type Order = {
  id: string;
  user_id: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  qty: number;
  unit_price: number;
  discount_amount: number;
  service_fee: number;
  grand_total: number;
  status: string;
  order_type: string;
  created_at: string;
  group_id: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  ticket_tiers: { name: string } | null;
  combo_tickets: { name: string } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Whether the buyer has a Rameelo account: they were signed in at purchase
// (user_id set) or a profile exists with their email (signed up later).
function buyerHasAccount(order: Order, accountEmails: Set<string>): boolean {
  return !!order.user_id || accountEmails.has((order.buyer_email ?? "").toLowerCase());
}

function AccountBadge({ has }: { has: boolean }) {
  return has ? (
    <span className="inline-flex items-center gap-1 font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-peacock/10 text-peacock">
      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
      Account
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-ink/5 text-ink-muted">
      Guest
    </span>
  );
}

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "bg-peacock/15 text-peacock" },
  pending:   { label: "Pending",   cls: "bg-marigold/20 text-[#a06b00]" },
  refunded:  { label: "Refunded",  cls: "bg-durga/15 text-durga" },
  cancelled: { label: "Cancelled", cls: "bg-black/[0.06] text-ink-muted" },
};

const CANCEL_REASONS = [
  "Buyer requested cancellation",
  "Duplicate order",
  "Payment issue",
  "Event capacity issue",
  "Attendee no longer attending",
  "Other",
];

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

function CancelOrderModal({
  order,
  onConfirm,
  onClose,
  saving,
}: {
  order: Order;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [preset, setPreset] = useState("");
  const [custom, setCustom] = useState("");

  const reason = preset === "Other" ? custom.trim() : preset;
  const valid = reason.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-ivory-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.02em" }}>
                Cancel Order
              </h2>
              <p className="font-ui text-sm text-ink-muted mt-0.5">
                This cannot be undone. The order will move to Cancelled.
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-ivory flex items-center justify-center text-ink-muted hover:bg-ivory-200 transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Order summary */}
        <div className="mx-6 mt-4 rounded-2xl bg-ivory p-4 border border-ivory-200">
          <p className="font-ui text-sm font-semibold text-ink">{order.buyer_name}</p>
          <p className="font-mono text-[9px] text-ink-muted mt-0.5">{order.buyer_email}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-ivory-200">
            <p className="font-ui text-xs text-ink-muted">
              {order.ticket_tiers?.name ?? "Ticket"} × {order.qty}
            </p>
            <p className="font-display font-bold text-ink" style={{ letterSpacing: "-0.02em" }}>
              ${order.grand_total.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Reason picker */}
        <div className="px-6 py-4 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Cancellation Reason *</p>
          <div className="flex flex-wrap gap-2">
            {CANCEL_REASONS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => { setPreset(r); if (r !== "Other") setCustom(""); }}
                className={`px-3 py-1.5 rounded-xl font-ui text-xs font-semibold border transition-all ${
                  preset === r
                    ? "bg-aubergine text-white border-aubergine"
                    : "bg-white text-ink-muted border-ivory-200 hover:border-aubergine/30 hover:text-ink"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {preset === "Other" && (
            <textarea
              autoFocus
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="Describe the reason…"
              rows={3}
              className="w-full rounded-xl border border-ivory-200 bg-ivory px-3 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/30 focus:border-aubergine/40 resize-none transition-all"
            />
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl border border-ivory-200 font-ui text-sm font-semibold text-ink-muted hover:bg-ivory transition-all"
          >
            Keep Order
          </button>
          <button
            onClick={() => valid && onConfirm(reason)}
            disabled={!valid || saving}
            className={`flex-1 py-3 rounded-2xl font-ui text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              valid && !saving
                ? "bg-durga text-white hover:bg-durga/90 shadow-sm"
                : "bg-black/[0.06] text-ink-muted cursor-not-allowed"
            }`}
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Cancelling…
              </>
            ) : (
              "Confirm Cancel"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EventOrdersPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [orders, setOrders]         = useState<Order[]>([]);
  const [accountEmails, setAccountEmails] = useState<Set<string>>(new Set());
  const [eventTitle, setEventTitle] = useState("");
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<string>("all");
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelSaving, setCancelSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [evRes, ordRes] = await Promise.all([
      supabase.from("events").select("title").eq("id", id).eq("organizer_id", user.id).single(),
      supabase.from("orders")
        .select("id, user_id, buyer_name, buyer_email, buyer_phone, qty, unit_price, discount_amount, service_fee, grand_total, status, order_type, created_at, group_id, cancellation_reason, cancelled_at, ticket_tiers(name), combo_tickets(name)")
        .eq("event_id", id)
        .eq("is_test", false)
        // Only paid orders — exclude `pending` (unpaid checkout attempts awaiting
        // the payment webhook) so organizers aren't confused by unpaid orders.
        .neq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

    if (!evRes.data) { router.replace("/organizer/events"); return; }
    setEventTitle(evRes.data.title);
    setOrders((ordRes.data ?? []) as unknown as Order[]);
    setLoading(false);

    // Flag which buyers have a Rameelo account (incl. guests who signed up later).
    const { data: acctEmails } = await supabase.rpc("get_event_buyer_account_emails", { p_event_id: id });
    setAccountEmails(new Set(((acctEmails ?? []) as string[]).map(e => e.toLowerCase())));
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function handleCancel(reason: string) {
    if (!cancelTarget) return;
    setCancelSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("orders").update({
      status: "cancelled",
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
      cancelled_by: user?.id ?? null,
    }).eq("id", cancelTarget.id);

    // Optimistically update local state
    setOrders(prev => prev.map(o =>
      o.id === cancelTarget.id
        ? { ...o, status: "cancelled", cancellation_reason: reason, cancelled_at: new Date().toISOString() }
        : o
    ));

    setCancelSaving(false);
    setCancelTarget(null);
  }

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const confirmedOrders = orders.filter(o => o.status === "confirmed");
  // Online (Rameelo-collected) totals exclude manual/offline orders, which are shown separately.
  const onlineConfirmed = confirmedOrders.filter(o => o.order_type !== "manual");
  const manualConfirmed = confirmedOrders.filter(o => o.order_type === "manual");
  const totalRevenue = onlineConfirmed.reduce((s, o) => s + o.grand_total, 0);
  const totalTickets = onlineConfirmed.reduce((s, o) => s + o.qty, 0);
  const manualRevenue = manualConfirmed.reduce((s, o) => s + o.grand_total, 0);
  const manualTickets = manualConfirmed.reduce((s, o) => s + o.qty, 0);
  const cancelledCount = orders.filter(o => o.status === "cancelled").length;
  const cancelledRevenue = orders.filter(o => o.status === "cancelled").reduce((s, o) => s + o.grand_total, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }

  return (
    <>
      {cancelTarget && (
        <CancelOrderModal
          order={cancelTarget}
          onConfirm={handleCancel}
          onClose={() => setCancelTarget(null)}
          saving={cancelSaving}
        />
      )}

      <div className="space-y-5">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link href="/organizer/events"
              className="font-ui text-xs text-ink-muted hover:text-ink flex items-center gap-1 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              My Events
            </Link>
            <span className="text-ink-muted/40 text-xs">/</span>
            <Link href={`/organizer/events/${id}`}
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
                {orders.length} order{orders.length !== 1 ? "s" : ""} · {totalTickets} tickets · ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} online revenue
              </p>
              {manualConfirmed.length > 0 && (
                <p className="font-ui text-xs text-marigold-dark mt-0.5">
                  + {manualTickets} ticket{manualTickets !== 1 ? "s" : ""} · ${manualRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} manual / offline (settled by you)
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/organizer/events/${id}/manual`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-aubergine/30 bg-white text-aubergine font-ui font-semibold text-sm hover:bg-aubergine/5 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Manual order
              </Link>
              <Link href={`/organizer/events/${id}/checkin-sheet`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:opacity-90 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Check-in sheet
              </Link>
              <Link href={`/organizer/events/${id}`}
                className="font-ui text-sm font-semibold text-ink-muted hover:text-ink flex items-center gap-1 transition-colors">
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>

        <EventSubnav eventId={id} active="orders" />

        {/* Cancelled revenue banner */}
        {cancelledCount > 0 && (
          <div className="flex items-center gap-3 bg-black/[0.03] border border-black/[0.07] rounded-2xl px-4 py-3">
            <div className="w-7 h-7 rounded-lg bg-black/[0.06] flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <p className="font-ui text-sm text-ink-muted">
              <span className="font-semibold text-ink">{cancelledCount} cancelled order{cancelledCount !== 1 ? "s" : ""}</span>
              {" "}(${cancelledRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} removed from revenue) ·{" "}
              <button onClick={() => setFilter("cancelled")} className="text-aubergine font-semibold hover:underline">
                View
              </button>
            </p>
          </div>
        )}

        {/* Summary tiles */}
        {orders.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Confirmed", count: orders.filter(o => o.status === "confirmed").length, cls: "text-peacock" },
              { label: "Refunded",  count: orders.filter(o => o.status === "refunded").length,  cls: "text-durga" },
              { label: "Cancelled", count: cancelledCount,                                       cls: "text-ink-muted" },
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
            {["all", "confirmed", "refunded", "cancelled"].map(f => (
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
                    <th className="px-5 py-3 text-center font-mono text-[9px] uppercase tracking-widest text-ink-muted">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {filtered.map(order => {
                    const s = ORDER_STATUS[order.status] ?? ORDER_STATUS.confirmed;
                    const isCancelled = order.status === "cancelled";
                    return (
                      <>
                        <tr key={order.id} className={`transition-colors ${isCancelled ? "bg-black/[0.015] opacity-70" : "hover:bg-ivory/40"}`}>
                          <td className="px-5 py-3.5">
                            <p className="font-ui text-xs text-ink">{fmtDate(order.created_at)}</p>
                            <p className="font-mono text-[9px] text-ink-muted">{fmtTime(order.created_at)}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`font-ui text-sm font-semibold ${isCancelled ? "line-through text-ink-muted" : "text-ink"}`}>{order.buyer_name}</p>
                              <AccountBadge has={buyerHasAccount(order, accountEmails)} />
                            </div>
                            <p className="font-mono text-[9px] text-ink-muted">{order.buyer_email}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-ui text-sm text-ink">{order.ticket_tiers?.name ?? order.combo_tickets?.name ?? "—"}</p>
                            <p className="font-mono text-[9px] text-ink-muted">${order.unit_price}/ticket</p>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <p className="font-display font-bold text-ink" style={{ letterSpacing: "-0.02em" }}>{order.qty}</p>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {order.order_type === "comp" ? (
                              <p className={`font-display font-bold ${isCancelled ? "line-through text-ink-muted" : "text-aubergine"}`} style={{ letterSpacing: "-0.02em" }}>Free</p>
                            ) : (
                              <>
                                <p className={`font-display font-bold ${isCancelled ? "line-through text-ink-muted" : order.order_type === "manual" ? "text-marigold-dark" : "text-peacock"}`} style={{ letterSpacing: "-0.02em" }}>
                                  ${order.grand_total.toFixed(2)}
                                </p>
                                {order.order_type === "manual" ? (
                                  <p className="font-mono text-[9px] text-marigold-dark">offline</p>
                                ) : order.discount_amount > 0 ? (
                                  <p className="font-mono text-[9px] text-ink-muted">−${order.discount_amount.toFixed(2)} disc.</p>
                                ) : null}
                              </>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${s.cls}`}>{s.label}</span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {order.order_type === "comp" ? (
                              <span className="font-mono text-[9px] text-aubergine bg-aubergine/8 px-2 py-0.5 rounded-full">Comp</span>
                            ) : order.order_type === "manual" ? (
                              <span className="font-mono text-[9px] text-marigold-dark bg-marigold/15 px-2 py-0.5 rounded-full">Manual</span>
                            ) : order.order_type === "combo" ? (
                              <span className="font-mono text-[9px] text-[#a06b00] bg-marigold/15 px-2 py-0.5 rounded-full">✨ Combo</span>
                            ) : order.group_id ? (
                              <span className="font-mono text-[9px] text-aubergine bg-aubergine/8 px-2 py-0.5 rounded-full">Group</span>
                            ) : (
                              <span className="font-mono text-[9px] text-ink-muted">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {order.status === "confirmed" || order.status === "pending" ? (
                              <button
                                onClick={() => setCancelTarget(order)}
                                className="font-mono text-[9px] font-bold uppercase tracking-widest text-durga/70 hover:text-durga border border-durga/20 hover:border-durga/50 px-2.5 py-1 rounded-lg transition-all"
                              >
                                Cancel
                              </button>
                            ) : (
                              <span className="font-mono text-[9px] text-ink-muted/40">—</span>
                            )}
                          </td>
                        </tr>
                        {isCancelled && order.cancellation_reason && (
                          <tr key={`${order.id}-reason`} className="bg-black/[0.015]">
                            <td colSpan={8} className="px-5 pb-3 pt-0">
                              <div className="flex items-center gap-2">
                                <svg className="w-3 h-3 text-ink-muted/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <p className="font-mono text-[9px] text-ink-muted">
                                  <span className="uppercase tracking-widest mr-1.5">Reason:</span>
                                  {order.cancellation_reason}
                                  {order.cancelled_at && (
                                    <span className="ml-2 opacity-50">· {fmtDate(order.cancelled_at)}</span>
                                  )}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-ivory-200">
              {filtered.map(order => {
                const s = ORDER_STATUS[order.status] ?? ORDER_STATUS.confirmed;
                const isCancelled = order.status === "cancelled";
                return (
                  <div key={order.id} className={`px-4 py-4 ${isCancelled ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-ui text-sm font-semibold ${isCancelled ? "line-through text-ink-muted" : "text-ink"}`}>{order.buyer_name}</p>
                          <AccountBadge has={buyerHasAccount(order, accountEmails)} />
                        </div>
                        <p className="font-mono text-[9px] text-ink-muted truncate">{order.buyer_email}</p>
                        <p className="font-mono text-[9px] text-ink-muted">{order.ticket_tiers?.name ?? order.combo_tickets?.name ?? "—"} · {order.qty} ticket{order.qty !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-display font-bold ${isCancelled ? "line-through text-ink-muted" : order.order_type === "comp" ? "text-aubergine" : order.order_type === "manual" ? "text-marigold-dark" : "text-peacock"}`} style={{ letterSpacing: "-0.02em" }}>{order.order_type === "comp" ? "Free" : `$${order.grand_total.toFixed(2)}`}</p>
                        <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${order.order_type === "comp" ? "bg-aubergine/12 text-aubergine" : order.order_type === "manual" ? "bg-marigold/15 text-marigold-dark" : s.cls}`}>{order.order_type === "comp" ? "Comp" : order.order_type === "manual" ? "Manual" : s.label}</span>
                      </div>
                    </div>
                    <p className="font-mono text-[9px] text-ink-muted">{fmtDate(order.created_at)} · {fmtTime(order.created_at)}</p>
                    {isCancelled && order.cancellation_reason && (
                      <p className="font-mono text-[9px] text-ink-muted/60 mt-1.5 italic">
                        Reason: {order.cancellation_reason}
                      </p>
                    )}
                    {(order.status === "confirmed" || order.status === "pending") && (
                      <button
                        onClick={() => setCancelTarget(order)}
                        className="mt-2 font-mono text-[9px] font-bold uppercase tracking-widest text-durga/70 hover:text-durga border border-durga/20 hover:border-durga/50 px-2.5 py-1 rounded-lg transition-all"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
