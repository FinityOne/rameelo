"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { garbaEvents } from "@/lib/events-data";

interface StoredOrder {
  orderId: string;
  firstName: string;
  lastName: string;
  email: string;
  event1: { title: string; date: string; venue: string; city: string; state: string } | null;
  event2: { title: string; date: string; venue: string; city: string; state: string } | null;
  grandTotal: number;
  qty: number;
  type: string;
  purchasedAt: string;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ConfirmationPage() {
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rameelo_order");
      if (raw) {
        const parsed = JSON.parse(raw) as StoredOrder;
        setOrder(parsed);
        setConfettiActive(true);
        setTimeout(() => setConfettiActive(false), 3000);
      }
    } catch {}
  }, []);

  function copyOrderId() {
    if (order) {
      navigator.clipboard.writeText(order.orderId).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const relatedEvents = order?.event1
    ? garbaEvents.filter((e) => e.id !== (order as StoredOrder & { payload?: { event1Id: string } })?.payload?.event1Id).slice(0, 3)
    : garbaEvents.slice(0, 3);

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "#FCF9F2" }}>
        <p className="font-display text-2xl font-bold text-ink">No order found</p>
        <Link href="/events" className="px-6 py-3 rounded-2xl bg-marigold text-aubergine font-semibold text-sm hover:bg-marigold-dark transition-all">
          Browse events
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F2" }}>
      {/* Celebration header */}
      <div
        className="relative overflow-hidden"
        style={{ backgroundColor: "#2E1B30" }}
      >
        {confettiActive && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-bounce"
                style={{
                  left: `${(i * 4.2) % 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: ["#F5A623", "#0E8C7A", "#7C1F2C", "#FCF9F2"][i % 4],
                  animationDelay: `${(i * 0.08) % 1}s`,
                  animationDuration: `${0.6 + (i % 4) * 0.2}s`,
                }}
              />
            ))}
          </div>
        )}

        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center">
          {/* Success checkmark */}
          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6" style={{ backgroundColor: "#0E8C7A" }}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <p className="font-mono text-marigold text-xs font-bold uppercase tracking-widest mb-2">
            Order Confirmed
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">
            You&rsquo;re going to Garba,<br />
            <span className="text-marigold">{order.firstName}!</span>
          </h1>
          <p className="font-ui text-white/60 text-sm">
            Your tickets are on their way to <strong className="text-white/80">{order.email}</strong>
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Order ID card */}
        <div className="rounded-2xl bg-white border border-ivory-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-ivory-200 flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-0.5">Order ID</p>
              <p className="font-display font-bold text-ink text-lg tracking-wide">{order.orderId}</p>
            </div>
            <button
              onClick={copyOrderId}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${copied ? "bg-peacock text-white" : "bg-ivory border border-ivory-200 text-ink-muted hover:text-ink hover:border-aubergine/30"}`}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Events in this order */}
          <div className="divide-y divide-ivory-200">
            {[order.event1, order.event2].filter(Boolean).map((ev, i) => ev && (
              <div key={i} className="px-6 py-4">
                {i === 1 && (
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-marigold-dark bg-marigold/10 px-2 py-0.5 rounded-full mb-2">
                    Bundle Event
                  </span>
                )}
                <p className="font-display font-bold text-ink mb-1">{ev.title}</p>
                <div className="flex flex-wrap gap-4 text-xs text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="font-ui">{ev.date}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                    <span className="font-ui">{ev.venue}, {ev.city}, {ev.state}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Ticket summary */}
          <div className="px-6 py-4 bg-ivory border-t border-ivory-200 flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-0.5">
                {order.qty} × {order.type === "combo" ? "Bundle Tickets" : order.type?.toUpperCase() + " Tickets"}
              </p>
              <p className="font-ui text-xs text-ink-muted">
                Purchased {formatTime(order.purchasedAt)} · Sent to {order.email}
              </p>
            </div>
            <p className="font-display font-bold text-ink text-xl">${order.grandTotal.toLocaleString()}</p>
          </div>
        </div>

        {/* QR ticket mock */}
        <div className="rounded-2xl bg-white border-2 border-dashed border-ivory-200 p-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-4">Your Entry Ticket</p>
          <div className="w-32 h-32 mx-auto rounded-xl bg-aubergine/5 border border-ivory-200 flex items-center justify-center mb-4">
            <div className="grid grid-cols-5 gap-0.5 opacity-60">
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: Math.random() > 0.5 ? "#2E1B30" : "transparent" }}
                />
              ))}
            </div>
          </div>
          <p className="font-display font-bold text-ink text-sm mb-1">{order.orderId}</p>
          <p className="font-ui text-xs text-ink-muted">Show this at the venue entrance</p>
          <p className="font-mono text-[10px] text-ink-muted mt-2">Full tickets sent to your email</p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-ivory-200 bg-white text-ink font-ui font-semibold text-sm hover:border-aubergine/30 transition-all">
            <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Add to Calendar
          </button>
          <button className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-ivory-200 bg-white text-ink font-ui font-semibold text-sm hover:border-aubergine/30 transition-all">
            <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            Share Event
          </button>
        </div>

        {/* Group order nudge */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "#2E1B30" }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-marigold/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-marigold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-white mb-1">Bring the whole crew</p>
              <p className="font-ui text-white/60 text-sm">
                Start a Group Order and your friends get a sharable link to buy their own tickets. 5+ tickets unlock group discounts up to 15% off.
              </p>
            </div>
          </div>
          <button className="mt-4 w-full py-3 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
            Start Group Order
          </button>
        </div>

        {/* More events */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-ink text-lg">More events you&rsquo;ll love</h2>
            <Link href="/events" className="font-ui text-sm text-marigold-dark hover:text-marigold transition-colors">
              See all →
            </Link>
          </div>
          <div className="space-y-3">
            {relatedEvents.map((ev) => {
              const pct = Math.round((ev.soldTickets / ev.totalTickets) * 100);
              const almostGone = pct >= 85;
              return (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-ivory-200 hover:border-marigold/30 hover:shadow-sm transition-all group"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: "#2E1B30" }}
                  >
                    {ev.artist.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-ink text-sm truncate group-hover:text-aubergine transition-colors">{ev.title}</p>
                    <p className="font-mono text-[10px] text-ink-muted">{ev.date} · {ev.city}, {ev.state}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-ink text-sm">${ev.price}</p>
                    {almostGone && (
                      <p className="font-mono text-[9px] text-marigold-dark uppercase tracking-wide">Almost gone</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="font-ui text-ink-muted text-sm mb-4">
            Questions about your order? <Link href="/tickets" className="text-marigold-dark hover:underline">Visit your tickets</Link> or contact support.
          </p>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-aubergine/20 text-aubergine font-ui font-semibold text-sm hover:bg-aubergine hover:text-white transition-all"
          >
            ← Discover more events
          </Link>
        </div>
      </div>
    </div>
  );
}
