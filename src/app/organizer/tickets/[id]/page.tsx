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
  group_id: string | null;
  created_at: string;
  checked_in_count: number;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  event_id: string;
  events: { id: string; title: string; start_date: string; venue_name: string | null; city: string | null; state: string | null } | null;
  ticket_tiers: { name: string; price: number } | null;
};

type Transfer = {
  id: string;
  to_email: string | null;
  to_name: string | null;
  to_user_id: string | null;
  status: string;
  qty: number;
  seat_numbers: number[] | null;
  created_at: string;
  accepted_at: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; cls: string; icon: string }> = {
  confirmed: { label: "Confirmed", cls: "bg-peacock/15 text-peacock", icon: "✅" },
  pending:   { label: "Pending",   cls: "bg-marigold/20 text-[#a06b00]", icon: "🕓" },
  refunded:  { label: "Refunded",  cls: "bg-durga/15 text-durga", icon: "↩️" },
  cancelled: { label: "Cancelled", cls: "bg-ivory-200 text-ink-muted", icon: "🚫" },
};
const TRANSFER_META: Record<string, { label: string; cls: string }> = {
  accepted:  { label: "Accepted",  cls: "bg-peacock/15 text-peacock" },
  pending:   { label: "Pending",   cls: "bg-marigold/20 text-[#a06b00]" },
  cancelled: { label: "Cancelled", cls: "bg-ivory-200 text-ink-muted" },
};

function receiptNum(id: string) { return "RM-" + id.replace(/-/g, "").slice(0, 10).toUpperCase(); }
function money(n: number) { return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtTS(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function fmtDay(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
      <div className="px-5 py-3 bg-ivory border-b border-ivory-200 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">{title}</p>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ivory-200 last:border-0">
      <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted shrink-0 pt-0.5">{label}</span>
      <span className="font-ui text-sm text-ink text-right min-w-0 break-words">{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────────

export default function OrganizerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<OrderFull | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("orders")
        .select(`
          id, user_id, buyer_name, buyer_email, buyer_phone,
          qty, unit_price, discount_pct, discount_amount, rameelo_fee, processing_fee, service_fee, grand_total,
          status, payment_method, group_id, created_at, checked_in_count, cancellation_reason, cancelled_at, event_id,
          events (id, title, start_date, venue_name, city, state),
          ticket_tiers (name, price)
        `)
        .eq("id", id)
        .single();

      if (!data) { router.replace("/organizer/tickets"); return; }
      setOrder(data as unknown as OrderFull);

      const { data: tr } = await supabase
        .from("ticket_transfers")
        .select("id, to_email, to_name, to_user_id, status, qty, seat_numbers, created_at, accepted_at")
        .eq("order_id", id)
        .order("created_at", { ascending: false });
      setTransfers((tr ?? []) as Transfer[]);
      setLoading(false);
    }
    load();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }
  if (!order) return null;

  const meta      = STATUS_META[order.status] ?? { label: order.status, cls: "bg-ivory-200 text-ink-muted", icon: "•" };
  const subtotal  = order.qty * Number(order.unit_price);
  const rameeloFee = Number(order.rameelo_fee) || 0;
  const procFee   = Number(order.processing_fee) || 0;
  const feeTotal  = rameeloFee + procFee || Number(order.service_fee) || 0;
  const checkedIn = order.checked_in_count ?? 0;
  const seats     = Array.from({ length: order.qty }, (_, i) => i + 1);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0 text-xs">
        <Link href="/organizer/tickets" className="font-ui text-ink-muted hover:text-ink flex items-center gap-1 shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Orders
        </Link>
        <span className="text-ink-muted/40">/</span>
        <span className="font-mono text-ink-muted truncate">{receiptNum(order.id)}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-ivory-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${meta.cls}`}>{meta.icon} {meta.label}</span>
              {order.group_id && <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-marigold/15 text-marigold-dark">Group</span>}
            </div>
            <p className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>{receiptNum(order.id)}</p>
            <p className="font-ui text-sm text-ink-muted mt-0.5">
              {order.events ? (
                <Link href={`/organizer/events/${order.events.id}`} className="text-aubergine hover:underline">{order.events.title}</Link>
              ) : "Event"}
              {order.events?.start_date ? ` · ${fmtDay(order.events.start_date)}` : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Amount</p>
            <p className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>${money(order.grand_total)}</p>
            <p className="font-mono text-[10px] text-ink-muted">{order.qty} ticket{order.qty !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Cancellation / refund notice */}
      {(order.cancelled_at || order.status === "cancelled" || order.status === "refunded") && (
        <div className="rounded-2xl bg-durga/8 border border-durga/20 px-5 py-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-durga mb-1">
            {order.status === "refunded" ? "Refunded" : "Cancelled"}{order.cancelled_at ? ` · ${fmtTS(order.cancelled_at)}` : ""}
          </p>
          <p className="font-ui text-sm text-ink">{order.cancellation_reason || "No reason recorded."}</p>
        </div>
      )}

      {/* Ticket Breakdown */}
      <SectionCard title="Ticket Breakdown">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-ivory-200">
          <div>
            <p className="font-display font-bold text-ink text-sm">{order.ticket_tiers?.name ?? "Ticket"}</p>
            <p className="font-mono text-[10px] text-ink-muted">{order.qty} × ${money(order.unit_price)}</p>
          </div>
          <p className="font-display font-bold text-ink">${money(subtotal)}</p>
        </div>

        <div className="flex items-center justify-between gap-2 py-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Check-in</p>
          <p className="font-ui text-xs text-ink-muted">{checkedIn} of {order.qty} admitted</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {seats.map(n => {
            const inDoor = n <= checkedIn;
            return (
              <span key={n}
                className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-1 rounded-lg border ${inDoor ? "bg-peacock/10 text-peacock border-peacock/20" : "bg-ivory text-ink-muted border-ivory-200"}`}>
                {inDoor && <span className="w-1.5 h-1.5 rounded-full bg-peacock" />}
                T{n}
              </span>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Customer Information */}
        <SectionCard title="Customer Information">
          <p className="font-display font-bold text-ink text-sm mb-1">{order.buyer_name}</p>
          <Field label="Email" value={<a href={`mailto:${order.buyer_email}`} className="text-aubergine hover:underline">{order.buyer_email}</a>} />
          <Field label="Phone" value={order.buyer_phone ? <a href={`tel:${order.buyer_phone}`} className="text-aubergine hover:underline">{order.buyer_phone}</a> : "—"} />
          <Field label="Account" value={order.user_id ? "Rameelo member" : "Guest checkout"} />
          {order.group_id && <Field label="Group" value={<span className="font-mono">{order.group_id}</span>} />}
        </SectionCard>

        {/* Payment Details */}
        <SectionCard title="Payment Details">
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-ui text-ink-muted">{order.qty} × ${money(order.unit_price)}</span>
              <span className="font-mono text-ink">${money(subtotal)}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="font-ui text-peacock">Discount{order.discount_pct ? ` (${order.discount_pct}%)` : ""}</span>
                <span className="font-mono text-peacock">−${money(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="font-ui text-ink-muted">Fees</span>
              <span className="font-mono text-ink-muted">${money(feeTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-ivory-200 pt-2 mt-1">
              <span className="font-display font-bold text-ink">Total</span>
              <span className="font-display font-bold text-ink">${money(order.grand_total)}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-ivory-200">
            <Field label="Method" value={(order.payment_method || "—").toUpperCase()} />
            <Field label="Status" value={meta.label} />
            <Field label="Purchased" value={fmtTS(order.created_at)} />
          </div>
        </SectionCard>
      </div>

      {/* Transfer History */}
      <SectionCard title="Transfer History">
        {transfers.length === 0 ? (
          <div className="py-4 text-center">
            <p className="font-ui text-sm text-ink-muted">No transfers — all tickets are held by the original buyer.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {transfers.map(t => {
              const tm = TRANSFER_META[t.status] ?? { label: t.status, cls: "bg-ivory-200 text-ink-muted" };
              return (
                <div key={t.id} className="flex items-start gap-3 rounded-xl border border-ivory-200 px-3.5 py-3">
                  <div className="w-8 h-8 rounded-full bg-aubergine/10 flex items-center justify-center text-aubergine shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-ui font-semibold text-ink text-sm truncate">
                        To {t.to_name || t.to_email || "recipient"}
                      </p>
                      <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${tm.cls}`}>{tm.label}</span>
                    </div>
                    <p className="font-mono text-[10px] text-ink-muted truncate">
                      {t.qty} ticket{t.qty !== 1 ? "s" : ""}
                      {t.seat_numbers?.length ? ` · ${t.seat_numbers.map(s => `T${s}`).join(", ")}` : ""}
                      {t.to_email ? ` · ${t.to_email}` : ""}
                    </p>
                    <p className="font-mono text-[10px] text-ink-muted/70 mt-0.5">
                      Sent {fmtTS(t.created_at)}{t.accepted_at ? ` · Accepted ${fmtTS(t.accepted_at)}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <p className="font-mono text-[10px] text-ink-muted/60 text-center break-all">Order ID: {order.id}</p>
    </div>
  );
}
