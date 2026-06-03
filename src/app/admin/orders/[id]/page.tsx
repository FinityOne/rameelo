"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ── Types ───────────────────────────────────────────────────────────────────────

type OrderFull = {
  id: string;
  user_id: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  qty: number;
  unit_price: number;
  discount_pct: number;
  discount_amount: number;
  rameelo_fee: number;
  processing_fee: number;
  service_fee: number;
  grand_total: number;
  status: string;
  payment_method: string;
  is_test: boolean;
  group_id: string | null;
  created_at: string;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  events: { id: string; title: string; start_date: string; start_time: string | null; venue_name: string; city: string | null; state: string | null; status: string } | null;
  ticket_tiers: { id: string; name: string; price: number } | null;
};

type BuyerProfile = { id: string; first_name: string | null; last_name: string | null; email: string | null; city: string | null; state: string | null } | null;

const STATUS_META: Record<string, { label: string; cls: string; icon: string }> = {
  confirmed: { label: "Confirmed", cls: "bg-peacock/15 text-peacock", icon: "✅" },
  pending:   { label: "Pending",   cls: "bg-marigold/20 text-[#a06b00]", icon: "🕓" },
  cancelled: { label: "Cancelled", cls: "bg-durga/15 text-durga", icon: "🚫" },
  refunded:  { label: "Refunded",  cls: "bg-ink/10 text-ink-muted", icon: "↩️" },
};

function receiptNum(id: string) { return "RM-" + id.replace(/-/g, "").slice(0, 10).toUpperCase(); }
function fmtTS(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function fmtEventDate(d: string, t: string | null) {
  const date = new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  if (!t) return date;
  const [h, m] = t.split(":").map(Number);
  return `${date} · ${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function money(n: number) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ivory-200 last:border-0">
      <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-ink text-right ${mono ? "font-mono" : "font-ui"}`}>{value}</span>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder]     = useState<OrderFull | null>(null);
  const [buyer, setBuyer]     = useState<BuyerProfile>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("orders")
        .select(`
          id, user_id, buyer_name, buyer_email, buyer_phone,
          qty, unit_price, discount_pct, discount_amount,
          rameelo_fee, processing_fee, service_fee, grand_total,
          status, payment_method, is_test, group_id, created_at,
          cancellation_reason, cancelled_at,
          events (id, title, start_date, start_time, venue_name, city, state, status),
          ticket_tiers (id, name, price)
        `)
        .eq("id", id)
        .single();

      if (!data) { router.replace("/admin/orders"); return; }
      const ord = data as unknown as OrderFull;
      setOrder(ord);

      if (ord.user_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, city, state")
          .eq("id", ord.user_id)
          .single();
        setBuyer((prof as BuyerProfile) ?? null);
      }
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function toggleTest() {
    if (!order) return;
    setToggling(true);
    const supabase = createClient();
    const next = !order.is_test;
    const { error } = await supabase.from("orders").update({ is_test: next }).eq("id", order.id);
    if (!error) setOrder(prev => prev ? { ...prev, is_test: next } : prev);
    setToggling(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }
  if (!order) return null;

  const meta     = STATUS_META[order.status] ?? { label: order.status, cls: "bg-ivory-200 text-ink-muted", icon: "•" };
  const subtotal = order.unit_price * order.qty;
  const buyerName = buyer ? [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") || order.buyer_name : order.buyer_name;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <Link href="/admin/orders" className="font-ui text-xs text-ink-muted hover:text-ink flex items-center gap-1 shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Orders
        </Link>
        <span className="text-ink-muted/40 text-xs">/</span>
        <span className="font-mono text-xs text-ink-muted truncate">{receiptNum(order.id)}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-ivory-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${meta.cls}`}>
                {meta.icon} {meta.label}
              </span>
              {order.is_test && (
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-marigold/20 text-marigold-dark">Test order</span>
              )}
            </div>
            <p className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>{receiptNum(order.id)}</p>
            <p className="font-ui text-sm text-ink-muted mt-0.5">Placed {fmtTS(order.created_at)} · {order.payment_method.toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Total</p>
            <p className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>${money(order.grand_total)}</p>
            <p className="font-mono text-[10px] text-ink-muted">{order.qty} ticket{order.qty !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Cancellation notice */}
      {(order.cancelled_at || order.status === "cancelled" || order.status === "refunded") && (
        <div className="rounded-2xl bg-durga/8 border border-durga/20 px-5 py-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-durga mb-1">
            {order.status === "refunded" ? "Refunded" : "Cancelled"} {order.cancelled_at ? `· ${fmtTS(order.cancelled_at)}` : ""}
          </p>
          <p className="font-ui text-sm text-ink leading-relaxed">{order.cancellation_reason || "No reason recorded."}</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Event */}
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Event</p>
            {order.events && (
              <Link href={`/admin/events/${order.events.id}`} className="font-ui text-xs font-semibold text-aubergine hover:underline">Open →</Link>
            )}
          </div>
          <div className="px-5 py-4">
            {order.events ? (
              <>
                <p className="font-display font-bold text-ink text-sm">{order.events.title}</p>
                <Row label="Date" value={fmtEventDate(order.events.start_date, order.events.start_time)} />
                <Row label="Venue" value={order.events.venue_name} />
                <Row label="Location" value={[order.events.city, order.events.state].filter(Boolean).join(", ") || "—"} />
                <Row label="Event status" value={order.events.status} />
              </>
            ) : (
              <p className="font-ui text-sm text-ink-muted">Event not found.</p>
            )}
          </div>
        </div>

        {/* Buyer */}
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Buyer</p>
            {order.user_id ? (
              <Link href={`/admin/users/${order.user_id}`} className="font-ui text-xs font-semibold text-aubergine hover:underline">Profile →</Link>
            ) : (
              <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted/60">Guest</span>
            )}
          </div>
          <div className="px-5 py-4">
            <p className="font-display font-bold text-ink text-sm">{buyerName}</p>
            <Row label="Email" value={order.buyer_email} />
            <Row label="Phone" value={order.buyer_phone || "—"} />
            {buyer && (buyer.city || buyer.state) && (
              <Row label="Home" value={[buyer.city, buyer.state].filter(Boolean).join(", ")} />
            )}
          </div>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Order Summary</p>
          <p className="font-mono text-[10px] text-ink-muted">{order.ticket_tiers?.name ?? "—"}</p>
        </div>
        <div className="px-5 py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-ui text-ink-muted">{order.qty} × ${money(order.unit_price)} ({order.ticket_tiers?.name ?? "Ticket"})</span>
            <span className="font-mono text-ink">${money(subtotal)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="font-ui text-peacock">Group discount{order.discount_pct ? ` (${order.discount_pct}%)` : ""}</span>
              <span className="font-mono text-peacock">−${money(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="font-ui text-ink-muted">Rameelo fee</span>
            <span className="font-mono text-ink-muted">${money(order.rameelo_fee)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-ui text-ink-muted">Card processing</span>
            <span className="font-mono text-ink-muted">${money(order.processing_fee)}</span>
          </div>
          <div className="border-t border-ivory-200 pt-2 flex justify-between">
            <span className="font-display font-bold text-ink">Grand total</span>
            <span className="font-display font-bold text-ink text-lg">${money(order.grand_total)}</span>
          </div>
          <p className="font-mono text-[10px] text-ink-muted pt-1">
            Platform take (Rameelo fee): <span className="font-bold text-ink">${money(order.rameelo_fee)}</span>
          </p>
        </div>
      </div>

      {/* Meta + admin actions */}
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Details</p>
        </div>
        <div className="px-5 py-4">
          <Row label="Order ID" value={<span className="select-all">{order.id}</span>} mono />
          <Row label="Payment" value={order.payment_method.toUpperCase()} />
          <Row label="Group order" value={
            order.group_id
              ? <Link href={`/group/${order.group_id}`} className="text-aubergine hover:underline">{order.group_id}</Link>
              : "—"
          } mono />
          <Row label="Placed" value={fmtTS(order.created_at)} />
        </div>

        {/* Test/live toggle — excludes from live totals platform-wide */}
        <div className="px-5 py-4 border-t border-ivory-200 flex items-center justify-between gap-4">
          <div>
            <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>
              {order.is_test ? "Marked as a test order" : "Counted as a live order"}
            </p>
            <p className="font-ui text-xs text-ink-muted mt-0.5">
              Test orders are excluded from live revenue everywhere and labeled in the member portal.
            </p>
          </div>
          <button
            onClick={toggleTest}
            disabled={toggling}
            className={`relative shrink-0 w-12 h-6 rounded-full transition-all duration-200 ${order.is_test ? "bg-marigold" : "bg-ivory-200"} ${toggling ? "opacity-50" : ""}`}
            title={order.is_test ? "Mark as live" : "Mark as test"}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${order.is_test ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
