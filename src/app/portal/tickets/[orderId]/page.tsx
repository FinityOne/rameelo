"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderReceipt = {
  id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  qty: number;
  unit_price: number;
  discount_pct: number;
  discount_amount: number;
  promo_code: string | null;
  service_fee: number;
  grand_total: number;
  status: string;
  created_at: string;
  group_id: string | null;
  event: {
    id: string;
    title: string;
    start_date: string;
    start_time: string | null;
    venue_name: string;
    city: string;
    state: string;
  };
  tier: {
    name: string;
    price: number;
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZoneName: "short",
  });
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}
function fmtTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}
function receiptNum(id: string) {
  return "RM-" + id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

// ── Receipt Page ──────────────────────────────────────────────────────────────

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<OrderReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/signin"); return; }

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, buyer_name, buyer_email, buyer_phone,
          qty, unit_price, discount_pct, discount_amount, promo_code, service_fee, grand_total,
          status, created_at, group_id,
          events (id, title, start_date, start_time, venue_name, city, state),
          ticket_tiers (name, price)
        `)
        .eq("id", orderId)
        .eq("user_id", user.id)
        .single();

      if (error || !data) { setNotFound(true); setLoading(false); return; }

      const raw = data as unknown as {
        id: string; buyer_name: string; buyer_email: string; buyer_phone: string | null;
        qty: number; unit_price: number; discount_pct: number; discount_amount: number; promo_code: string | null;
        service_fee: number; grand_total: number; status: string; created_at: string; group_id: string | null;
        events: { id: string; title: string; start_date: string; start_time: string | null; venue_name: string; city: string; state: string };
        ticket_tiers: { name: string; price: number };
      };

      setOrder({
        ...raw,
        event: raw.events,
        tier: raw.ticket_tiers,
      });
      setLoading(false);

      // Record ticket-view activity (dispute evidence) — best effort
      supabase.rpc("mark_ticket_viewed", { p_order_id: orderId }).then(() => {});
    }
    load();
  }, [orderId, router]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-4">
        <p className="font-display font-bold text-ink text-xl">Receipt not found</p>
        <p className="font-ui text-ink-muted text-sm">This order doesn't exist or doesn't belong to your account.</p>
        <Link href="/portal/tickets" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-marigold text-aubergine font-semibold text-sm">
          ← Back to tickets
        </Link>
      </div>
    );
  }

  const subtotal = order.qty * order.unit_price;
  const receiptId = receiptNum(order.id);

  return (
    <>
      {/* Print styles — hidden in browser, visible on print */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-page { box-shadow: none !important; border: none !important; max-width: 100% !important; }
        }
      `}</style>

      <div className="max-w-2xl mx-auto space-y-4">

        {/* Back + action controls */}
        <div className="flex items-center justify-between gap-3 no-print flex-wrap">
          <Link
            href="/portal/tickets"
            className="flex items-center gap-2 font-ui text-sm text-ink-muted hover:text-ink transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />
            </svg>
            My Tickets
          </Link>
          <div className="flex items-center gap-2">
            {order.status === "confirmed" && (
              <a
                href={`/api/wallet/pass/${order.id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white font-ui text-sm font-medium hover:bg-zinc-800 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Add to Apple Wallet
              </a>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-ivory-200 bg-white font-ui text-sm font-medium text-ink hover:border-aubergine/30 hover:bg-ivory transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* Receipt card */}
        <div ref={printRef} className="print-page bg-white rounded-2xl border border-ivory-200 overflow-hidden shadow-sm">

          {/* Header band */}
          <div className="px-8 py-6 flex items-center justify-between" style={{ backgroundColor: "#2E1B30" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#F5A623" }}>
                <span className="font-display font-bold text-aubergine text-lg leading-none">R</span>
              </div>
              <div>
                <p className="font-display font-bold text-white text-lg leading-none">Rameelo</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/40">rameelo.com</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/40 mb-0.5">Receipt</p>
              <p className="font-display font-bold text-white text-lg leading-none">{receiptId}</p>
            </div>
          </div>

          {/* Status bar */}
          <div className={`px-8 py-2.5 flex items-center gap-2 border-b border-ivory-200 ${order.status === "confirmed" ? "bg-peacock/6" : "bg-ivory"}`}>
            <div className={`w-2 h-2 rounded-full ${order.status === "confirmed" ? "bg-peacock" : "bg-ink-muted"}`} />
            <p className="font-mono text-[10px] uppercase tracking-widest font-bold" style={{ color: order.status === "confirmed" ? "#0E8C7A" : "#6B6B7B" }}>
              {order.status === "confirmed" ? "Payment Confirmed" : order.status}
            </p>
            <span className="ml-auto font-mono text-[10px] text-ink-muted">{fmtDateTime(order.created_at)}</span>
          </div>

          <div className="px-8 py-6 space-y-6">

            {/* Two-column info */}
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Billed to */}
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2">Billed To</p>
                <p className="font-ui font-semibold text-ink text-sm">{order.buyer_name}</p>
                <p className="font-ui text-xs text-ink-muted mt-0.5">{order.buyer_email}</p>
                {order.buyer_phone && (
                  <p className="font-ui text-xs text-ink-muted">{order.buyer_phone}</p>
                )}
                {order.group_id && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-marigold/10 border border-marigold/20">
                    <span className="font-mono text-[9px] text-marigold-dark font-bold uppercase tracking-widest">Group Order</span>
                    <span className="font-mono text-[9px] text-ink-muted">{order.group_id}</span>
                  </div>
                )}
              </div>

              {/* Event */}
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2">Event</p>
                <p className="font-ui font-semibold text-ink text-sm">{order.event.title}</p>
                <p className="font-ui text-xs text-ink-muted mt-0.5">{fmtDate(order.event.start_date)}</p>
                {order.event.start_time && (
                  <p className="font-ui text-xs text-ink-muted">{fmtTime(order.event.start_time)}</p>
                )}
                <p className="font-ui text-xs text-ink-muted">{order.event.venue_name}</p>
                <p className="font-ui text-xs text-ink-muted">{order.event.city}, {order.event.state}</p>
              </div>
            </div>

            {/* Line items */}
            <div className="rounded-xl border border-ivory-200 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 bg-ivory border-b border-ivory-200">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Description</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted text-right">Qty</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted text-right">Amount</p>
              </div>

              {/* Ticket line */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3.5 border-b border-ivory-200">
                <div>
                  <p className="font-ui text-sm font-medium text-ink">{order.tier.name}</p>
                  <p className="font-mono text-[10px] text-ink-muted">${Number(order.unit_price).toFixed(2)} per ticket</p>
                </div>
                <p className="font-ui text-sm text-ink text-right self-center">{order.qty}</p>
                <p className="font-ui text-sm text-ink text-right self-center font-medium">${subtotal.toFixed(2)}</p>
              </div>

              {/* Discount line (if any) */}
              {Number(order.discount_amount) > 0 && (
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 border-b border-ivory-200 bg-peacock/4">
                  <div>
                    <p className="font-ui text-sm text-peacock">{order.promo_code ? "Promo code" : "Group discount"}</p>
                    <p className="font-mono text-[10px] text-peacock/70">
                      {order.promo_code ? `${order.promo_code} — applied at checkout` : `${order.discount_pct}% off — applied at checkout`}
                    </p>
                  </div>
                  <p className="font-ui text-sm text-peacock text-right self-center">{order.qty}</p>
                  <p className="font-ui text-sm text-peacock text-right self-center font-medium">−${Number(order.discount_amount).toFixed(2)}</p>
                </div>
              )}

              {/* Subtotal after discount */}
              <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2.5 border-b border-ivory-200">
                <p className="font-ui text-xs text-ink-muted">Subtotal</p>
                <p className="font-ui text-xs text-ink-muted text-right">
                  ${(subtotal - Number(order.discount_amount)).toFixed(2)}
                </p>
              </div>

              {/* Service fee */}
              <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2.5 border-b border-ivory-200">
                <div>
                  <p className="font-ui text-xs text-ink-muted">Platform service fee</p>
                  <p className="font-mono text-[9px] text-ink-muted/60">Applied by Rameelo</p>
                </div>
                <p className="font-ui text-xs text-ink-muted text-right self-center">${Number(order.service_fee).toFixed(2)}</p>
              </div>

              {/* Total */}
              <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4 bg-aubergine/4">
                <div>
                  <p className="font-display font-bold text-ink text-base" style={{ letterSpacing: "-0.01em" }}>Total Paid</p>
                  <p className="font-mono text-[9px] text-ink-muted">USD · All amounts in US dollars</p>
                </div>
                <p className="font-display font-bold text-aubergine text-xl text-right self-center" style={{ letterSpacing: "-0.02em" }}>
                  ${Number(order.grand_total).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Payment info */}
            <div className="rounded-xl bg-ivory border border-ivory-200 p-4 space-y-1.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2">Payment Details</p>
              {[
                { label: "Order ID", value: order.id },
                { label: "Receipt #", value: receiptId },
                { label: "Date", value: fmtDateTime(order.created_at) },
                { label: "Method", value: "Card via Rameelo secure checkout" },
                { label: "Status", value: order.status === "confirmed" ? "Paid" : order.status },
              ].map(row => (
                <div key={row.label} className="flex items-start gap-2">
                  <span className="font-mono text-[10px] text-ink-muted w-20 shrink-0 pt-0.5">{row.label}</span>
                  <span className="font-ui text-xs text-ink break-all">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Tax / legal note */}
            <div className="rounded-xl border border-ivory-200 p-4 flex gap-3">
              <svg className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="space-y-1">
                <p className="font-ui text-xs font-semibold text-ink">Tax & Legal Notice</p>
                <p className="font-ui text-xs text-ink-muted leading-relaxed">
                  Rameelo is a ticketing platform. Sales tax, if applicable, is collected and remitted by the event organizer in accordance with applicable state law. The platform service fee shown above is charged by Rameelo, Inc. for processing and platform access. This document serves as your official purchase receipt. Please retain for your records.
                </p>
                <p className="font-ui text-xs text-ink-muted">
                  For questions about your order, contact the event organizer directly.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-ivory-200 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="font-mono text-[9px] text-ink-muted uppercase tracking-widest">
              Rameelo, Inc. · rameelo.com
            </p>
            <p className="font-mono text-[9px] text-ink-muted">
              Generated {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
