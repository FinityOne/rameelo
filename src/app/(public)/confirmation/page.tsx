"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/money";
import { trackPixelOnce, eventPixelParams } from "@/lib/meta-pixel";

interface StoredOrder {
  orderId: string;
  firstName: string;
  lastName: string;
  email: string;
  groupId?: string;
  isGroupPay?: boolean;
  // flat fields written by current checkout
  eventTitle?: string;
  eventDate?: string;
  eventVenue?: string;
  eventCity?: string;
  eventState?: string;
  tierName?: string;
  // legacy nested shape (kept for backwards-compat)
  event1?: { title: string; date: string; venue: string; city: string; state: string } | null;
  event2?: { title: string; date: string; venue: string; city: string; state: string } | null;
  type?: string;
  grandTotal: number;
  qty: number;
  purchasedAt: string;
  paymentMethod?: string;     // 'card' | 'ach'
  paymentPending?: boolean;   // ACH order awaiting bank-transfer clearance
  // Meta Pixel attribution fields (written by checkout's order snapshot).
  eventId?: string;
  artistName?: string | null;
  organizer?: string | null;
  category?: string | null;
  eventMetro?: string | null;
  eventStartDate?: string | null;
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
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null); // null = unknown
  const [phase, setPhase] = useState<"checking" | "pending" | "confirmed" | "cancelled" | "timeout">("checking");

  useEffect(() => { document.title = "Order Confirmed | Rameelo"; }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setIsSignedIn(!!user));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rameelo_order");
      if (raw) setOrder(JSON.parse(raw) as StoredOrder);
    } catch {}
  }, []);

  // Poll the order status until the payment webhook marks it paid — up to ~1
  // minute, then settle on "still pending" so the buyer isn't stuck on a spinner.
  useEffect(() => {
    const fromUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("order") : null;
    const orderId = fromUrl || order?.orderId || "";
    if (!/^[0-9a-fA-F-]{36}$/.test(orderId)) { setPhase("pending"); return; }
    const supabase = createClient();
    let active = true;
    const startedAt = Date.now();
    async function poll() {
      if (!active) return;
      const { data } = await supabase.rpc("get_order_status", { p_order_id: orderId });
      if (!active) return;
      const st = (data as { status?: string } | null)?.status;
      if (st === "confirmed") {
        setPhase("confirmed");
        setConfettiActive(true);
        setTimeout(() => setConfettiActive(false), 3000);
        return;
      }
      if (st === "cancelled") { setPhase("cancelled"); return; }
      if (Date.now() - startedAt > 60000) { setPhase("timeout"); return; } // ~1 min cap
      setPhase("pending");
      setTimeout(poll, 3000);
    }
    poll();
    return () => { active = false; };
  }, [order?.orderId]);

  // Meta Pixel: fire Purchase exactly once, and ONLY after the order is confirmed
  // (Stripe verified → webhook marked it paid → status poll returns "confirmed").
  // Deduped by order id so a refresh or revisit never double-counts. Pending/ACH
  // orders that haven't cleared never reach "confirmed" here, so no false Purchase.
  useEffect(() => {
    if (phase !== "confirmed" || !order) return;
    const params: Record<string, unknown> = order.eventId
      ? eventPixelParams({
          eventId: order.eventId,
          eventName: order.eventTitle ?? "Event",
          artistName: order.artistName,
          organizer: order.organizer,
          category: order.category,
          city: order.eventCity,
          state: order.eventState,
          metroCity: order.eventMetro,
          eventDate: order.eventStartDate ?? order.eventDate,
        })
      : { content_type: "product", currency: "USD" };
    trackPixelOnce(order.orderId, "Purchase", {
      ...params,
      value: order.grandTotal,
      currency: "USD",
      num_items: order.qty,
    });
  }, [phase, order]);

  function copyOrderId() {
    if (order) {
      navigator.clipboard.writeText(order.orderId).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }


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

  const paid = phase === "confirmed";
  const failed = phase === "cancelled";
  const stillPending = phase === "timeout";
  const processing = phase === "checking" || phase === "pending";

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
          {/* Icon reflects the live payment state */}
          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6" style={{ backgroundColor: paid ? "#0E8C7A" : failed ? "#7C1F2C" : "#B8780F" }}>
            {paid ? (
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            ) : failed ? (
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : processing ? (
              <div className="w-9 h-9 rounded-full border-4 border-white/30 border-t-white animate-spin" />
            ) : (
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
          </div>

          <p className="font-mono text-marigold text-xs font-bold uppercase tracking-widest mb-2">
            {paid ? "Order Confirmed" : failed ? "Payment Issue" : processing ? "Confirming Payment" : "Payment Pending"}
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">
            {paid ? <>You&rsquo;re going to Garba,<br /><span className="text-marigold">{order.firstName}!</span></>
              : failed ? <>Hold on,<br /><span className="text-marigold">{order.firstName}.</span></>
              : <>Almost there,<br /><span className="text-marigold">{order.firstName}!</span></>}
          </h1>
          <p className="font-ui text-white/60 text-sm">
            {paid ? "Your tickets are saved to your Rameelo account"
              : failed ? "Your payment didn’t go through — no charge was made"
              : processing ? "We’re confirming your payment…"
              : "We’re still waiting for your payment to clear"}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Confirming — webhook hasn't landed yet (first ~minute) */}
        {processing && (
          <div className="rounded-2xl border-2 border-marigold/40 bg-marigold/[0.08] p-5 sm:p-6 text-center">
            <div className="w-10 h-10 rounded-full border-4 border-marigold/30 border-t-marigold animate-spin mx-auto mb-3" />
            <p className="font-display font-bold text-ink text-base">Confirming your payment…</p>
            <p className="font-ui text-sm text-ink-muted mt-1 leading-relaxed">This usually takes just a few seconds — please keep this page open.</p>
          </div>
        )}

        {/* Still pending after ~1 minute */}
        {stillPending && (
          <div className="rounded-2xl border-2 border-marigold/40 bg-marigold/[0.08] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-marigold/20 flex items-center justify-center shrink-0 text-xl">⏳</div>
              <div>
                <p className="font-display font-bold text-ink text-base">We&rsquo;re still pending your payment to clear</p>
                <p className="font-ui text-sm text-ink-muted mt-1 leading-relaxed">
                  We haven&rsquo;t received final confirmation yet. {order.paymentMethod === "ach" ? "Bank transfers can take 2–5 business days to settle." : "This occasionally takes a little longer than usual."} Your spot is held — <strong className="text-ink">we&rsquo;ll email you the moment it&rsquo;s confirmed</strong>, and your tickets unlock in your account.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment failed */}
        {failed && (
          <div className="rounded-2xl border-2 border-durga/30 bg-durga/[0.06] p-5 sm:p-6 text-center">
            <p className="font-display font-bold text-ink text-lg">Your payment didn&rsquo;t go through</p>
            <p className="font-ui text-sm text-ink-muted mt-1 mb-4">No charge was made. You can try again with a different payment method.</p>
            <Link href="/events" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">Browse events →</Link>
          </div>
        )}

        {/* Where the tickets live — once paid (or set up your account ready for when it clears) */}
        {(paid || stillPending) && (
          <div className="rounded-2xl border-2 border-marigold/30 bg-marigold/[0.06] p-5 sm:p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-marigold/20 flex items-center justify-center mx-auto mb-3 text-2xl">🎟️</div>
            <p className="font-display font-bold text-ink text-lg">
              {paid ? "Your tickets are in your account" : "Your tickets live in your account"}
            </p>
            <p className="font-ui text-sm text-ink-muted mt-1 mb-4">
              {paid
                ? (isSignedIn === false
                    ? "Create your free account with the email below to open your wallet — your tickets and QR codes are waiting."
                    : "Your tickets and QR codes are ready in your Rameelo wallet.")
                : (isSignedIn === false
                    ? "Create your free account with the email below — your tickets and QR codes unlock here as soon as your payment clears."
                    : "Your tickets and QR codes unlock here automatically once your payment clears.")}
            </p>

            {/* Showcase the account email */}
            <div className="inline-flex flex-col items-center gap-0.5 px-5 py-3 rounded-xl bg-white border border-ivory-200 mb-4">
              <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Account email</span>
              <span className="font-display font-bold text-ink text-base break-all">{order.email}</span>
            </div>

            {isSignedIn === false ? (
              <>
                <Link
                  href={`/auth/signup?email=${encodeURIComponent(order.email)}&next=${encodeURIComponent("/portal/tickets")}`}
                  className="block w-full py-3.5 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm text-center hover:bg-marigold-dark active:scale-[0.98] shadow-sm transition-all"
                >
                  Create my account &amp; open my tickets →
                </Link>
                <p className="font-mono text-[10px] text-ink-muted mt-2">
                  Already have one?{" "}
                  <Link href={`/auth/signin?next=${encodeURIComponent("/portal/tickets")}`} className="text-marigold-dark font-bold hover:underline">Sign in</Link>
                </p>
              </>
            ) : (
              <Link
                href="/portal/tickets"
                className="block w-full py-3.5 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm text-center hover:bg-marigold-dark active:scale-[0.98] shadow-sm transition-all"
              >
                Open my tickets →
              </Link>
            )}
          </div>
        )}

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
            {/* Current flat shape */}
            {order.eventTitle && (
              <div className="px-6 py-4">
                <p className="font-display font-bold text-ink mb-1">{order.eventTitle}</p>
                <div className="flex flex-wrap gap-4 text-xs text-ink-muted">
                  {order.eventDate && (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="font-ui">{order.eventDate}</span>
                    </span>
                  )}
                  {(order.eventVenue || order.eventCity) && (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                      <span className="font-ui">
                        {[order.eventVenue, order.eventCity, order.eventState].filter(Boolean).join(", ")}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )}
            {/* Legacy nested shape */}
            {!order.eventTitle && [order.event1, order.event2].filter(Boolean).map((ev, i) => ev && (
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
                {order.qty} × {order.tierName ?? (order.type === "combo" ? "Bundle" : order.type) ?? "Ticket"}{order.qty !== 1 ? "s" : ""}
              </p>
              <p className="font-ui text-xs text-ink-muted">
                Purchased {formatTime(order.purchasedAt)} · Saved to {order.email}
              </p>
            </div>
            <p className="font-display font-bold text-ink text-xl">${money(order.grandTotal)}</p>
          </div>
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

        {/* CTA row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <Link
            href="/portal/tickets"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-display font-bold text-sm text-white hover:opacity-90 transition-all"
            style={{ backgroundColor: "#2E1B30" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            View My Tickets
          </Link>
          <Link
            href="/events"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-display font-bold text-sm text-aubergine hover:opacity-90 transition-all"
            style={{ backgroundColor: "#F5A623" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Buy More Tickets
          </Link>
        </div>
      </div>
    </div>
  );
}
