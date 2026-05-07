"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { garbaEvents, artists, type GarbaEvent } from "@/lib/events-data";

const GROUP_TIERS = [
  { min: 10, label: "10+ tickets", discount: 15, tag: "Best Value" },
  { min: 8,  label: "8–9 tickets",  discount: 12, tag: "Great Deal" },
  { min: 5,  label: "5–7 tickets",  discount: 10, tag: "Group Rate" },
];

function getDiscount(qty: number): number {
  for (const tier of GROUP_TIERS) {
    if (qty >= tier.min) return tier.discount;
  }
  return 0;
}

function getNextTier(qty: number) {
  for (let i = GROUP_TIERS.length - 1; i >= 0; i--) {
    if (qty < GROUP_TIERS[i].min) return GROUP_TIERS[i];
  }
  return null;
}

function findComboEvent(event: GarbaEvent): GarbaEvent | null {
  return garbaEvents.find(
    (e) =>
      e.id !== event.id &&
      e.artistSlug === event.artistSlug &&
      e.state === event.state &&
      e.soldTickets < e.totalTickets
  ) ?? garbaEvents.find(
    (e) =>
      e.id !== event.id &&
      e.artistSlug === event.artistSlug &&
      e.soldTickets < e.totalTickets
  ) ?? null;
}

type TicketType = "ga" | "vip" | "combo";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const event = garbaEvents.find((e) => e.id === id);

  const [ticketType, setTicketType] = useState<TicketType>("ga");
  const [qty, setQty] = useState(2);
  const [comboQty, setComboQty] = useState(2);
  const [viewingCount] = useState(() => Math.floor(Math.random() * 40) + 18);

  const artist = event ? artists.find((a) => a.slug === event.artistSlug) : null;
  const comboEvent = event ? findComboEvent(event) : null;

  const pct = event ? Math.round((event.soldTickets / event.totalTickets) * 100) : 0;
  const soldOut = event ? event.soldTickets >= event.totalTickets : false;
  const almostGone = !soldOut && pct >= 85;

  const unitPrice = event
    ? ticketType === "vip" && event.priceVIP
      ? event.priceVIP
      : event.price
    : 0;

  const discount = getDiscount(qty);
  const subtotal = unitPrice * qty;
  const discountAmount = Math.round(subtotal * (discount / 100));
  const total = subtotal - discountAmount;
  const serviceFee = Math.round(total * 0.049);
  const grandTotal = total + serviceFee;

  const comboDiscount = 15;
  const comboSubtotal = event && comboEvent ? (event.price + comboEvent.price) * comboQty : 0;
  const comboSavings = Math.round(comboSubtotal * (comboDiscount / 100));
  const comboTotal = comboSubtotal - comboSavings + Math.round((comboSubtotal - comboSavings) * 0.049);

  const nextTier = getNextTier(qty);

  const handleContinue = useCallback(() => {
    if (!event) return;
    const payload =
      ticketType === "combo" && comboEvent
        ? {
            type: "combo",
            event1Id: event.id,
            event2Id: comboEvent.id,
            qty: comboQty,
            unitPrice: event.price,
            unit2Price: comboEvent.price,
            discount: comboDiscount,
            grandTotal: comboTotal,
          }
        : {
            type: ticketType,
            event1Id: event.id,
            qty,
            unitPrice,
            discount,
            grandTotal,
          };
    localStorage.setItem("rameelo_checkout", JSON.stringify(payload));
    router.push("/checkout");
  }, [event, comboEvent, ticketType, qty, comboQty, unitPrice, discount, grandTotal, comboTotal, router]);

  if (!event || !artist) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="text-center">
          <p className="font-display text-2xl font-bold text-ink mb-2">Event not found</p>
          <Link href="/events" className="text-marigold font-semibold hover:underline">← Back to events</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F2" }}>
      {/* ── Hero ── */}
      <div className="relative h-72 md:h-96 overflow-hidden" style={{ backgroundColor: "#2E1B30" }}>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${artist.color}CC 0%, #2E1B30 60%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle at 70% 30%, #F5A623 0%, transparent 60%)",
          }}
        />
        {/* Breadcrumb */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex items-center gap-2 text-white/50 text-xs font-mono">
            <Link href="/events" className="hover:text-white transition-colors">Events</Link>
            <span>/</span>
            <span className="text-white/80">{event.city}</span>
            <span>/</span>
            <span className="text-white/60 truncate max-w-xs">{event.title}</span>
          </div>
        </div>

        {/* Event header */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end h-52 md:h-72 pb-8">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/10 text-white/80">
                {event.category}
              </span>
              {almostGone && (
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-marigold/90 text-aubergine">
                  Almost Sold Out
                </span>
              )}
              {soldOut && (
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/20 text-white">
                  Sold Out
                </span>
              )}
              {event.isNavratri && event.navratriNight && (
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/10 text-white/70">
                  Navratri Night {event.navratriNight}
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl md:text-4xl font-bold text-white leading-tight mb-2">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm font-ui">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {event.date} · {event.time}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {event.venue}, {event.city}, {event.state}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Left: Event details ── */}
          <div className="flex-1 min-w-0 space-y-8">

            {/* Artist */}
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-ivory-200">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ backgroundColor: artist.color }}
              >
                {artist.initials}
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">Performing Artist</p>
                <p className="font-display font-bold text-ink text-lg">{artist.name}</p>
                <p className="font-ui text-ink-muted text-sm">{artist.title}</p>
              </div>
              <div className="ml-auto">
                <Link
                  href={`/events?artist=${artist.slug}`}
                  className="text-xs font-semibold text-marigold-dark hover:text-marigold transition-colors"
                >
                  All {artist.name.split(" ")[0]}&rsquo;s events →
                </Link>
              </div>
            </div>

            {/* About */}
            <div>
              <h2 className="font-display font-bold text-ink text-xl mb-3">About this event</h2>
              <p className="font-ui text-ink-muted leading-relaxed">{event.description}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {event.tags.map((tag) => (
                  <span key={tag} className="bg-ivory border border-ivory-200 text-ink-muted text-xs font-medium px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* What to expect */}
            <div className="rounded-2xl bg-white border border-ivory-200 p-6">
              <h2 className="font-display font-bold text-ink text-lg mb-4">What to expect</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: "🎶", title: "Live Performance", desc: `${artist.name} performs live all night` },
                  { icon: "🥁", title: "Live Dhol", desc: "Traditional dhol players throughout" },
                  { icon: "👗", title: "Traditional Attire", desc: "Chaniya choli & kurta encouraged" },
                  { icon: "🍽️", title: "Authentic Cuisine", desc: "Gujarati food stalls on-site" },
                  { icon: "📸", title: "Photo Moments", desc: "Dedicated photo walls & stages" },
                  { icon: "🌙", title: "9 Nights of Energy", desc: "Navratri celebration in full swing" },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 items-start">
                    <span className="text-xl mt-0.5">{item.icon}</span>
                    <div>
                      <p className="font-ui font-semibold text-ink text-sm">{item.title}</p>
                      <p className="font-ui text-ink-muted text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Venue */}
            <div className="rounded-2xl bg-white border border-ivory-200 p-6">
              <h2 className="font-display font-bold text-ink text-lg mb-3">Venue</h2>
              <p className="font-ui font-semibold text-ink">{event.venue}</p>
              <p className="font-ui text-ink-muted text-sm">{event.city}, {event.state}</p>
              <div className="mt-3 h-32 rounded-xl bg-ivory border border-ivory-200 flex items-center justify-center">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Map loading…</p>
              </div>
            </div>

            {/* Availability */}
            <div className="rounded-2xl bg-white border border-ivory-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-bold text-ink text-lg">Availability</h2>
                <span className="font-mono text-xs text-ink-muted">{pct}% sold</span>
              </div>
              <div className="h-2 bg-ivory-200 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: soldOut ? "#6B5E6E" : almostGone ? "#D4891B" : "#0E8C7A",
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-ink-muted">
                <span>{event.soldTickets.toLocaleString()} sold</span>
                <span>{(event.totalTickets - event.soldTickets).toLocaleString()} remaining</span>
              </div>
              <p className="font-ui text-xs text-peacock font-medium mt-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-peacock rounded-full inline-block animate-pulse" />
                {viewingCount} people viewing this event right now
              </p>
            </div>
          </div>

          {/* ── Right: Purchase widget ── */}
          <div className="lg:w-96 shrink-0">
            <div className="sticky top-20 space-y-4">
              <div className="rounded-2xl bg-white border border-ivory-200 overflow-hidden shadow-sm">

                {/* Ticket type tabs */}
                <div className="grid grid-cols-3 border-b border-ivory-200">
                  {[
                    { key: "ga" as TicketType, label: "General", sub: `$${event.price}` },
                    { key: "vip" as TicketType, label: "VIP", sub: event.priceVIP ? `$${event.priceVIP}` : "N/A", disabled: !event.priceVIP },
                    { key: "combo" as TicketType, label: "Bundle", sub: "Save 15%", disabled: !comboEvent },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => !tab.disabled && setTicketType(tab.key)}
                      disabled={tab.disabled || soldOut}
                      className={`py-3.5 px-2 text-center transition-all relative ${
                        tab.disabled || soldOut
                          ? "opacity-40 cursor-not-allowed bg-ivory"
                          : ticketType === tab.key
                          ? "bg-aubergine"
                          : "hover:bg-ivory cursor-pointer"
                      }`}
                    >
                      <p className={`font-display font-bold text-sm ${ticketType === tab.key && !tab.disabled ? "text-white" : "text-ink"}`}>
                        {tab.label}
                      </p>
                      <p className={`font-mono text-[10px] ${ticketType === tab.key && !tab.disabled ? "text-white/70" : tab.key === "combo" ? "text-peacock" : "text-ink-muted"}`}>
                        {tab.sub}
                      </p>
                      {tab.key === "combo" && !tab.disabled && ticketType !== "combo" && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-peacock rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-5 space-y-5">
                  {/* COMBO VIEW */}
                  {ticketType === "combo" && comboEvent ? (
                    <>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-peacock font-bold mb-3">
                          Bundle & Save 15%
                        </p>
                        <div className="space-y-2.5">
                          {[event, comboEvent].map((ev, i) => (
                            <div key={ev.id} className={`rounded-xl p-3 ${i === 0 ? "bg-aubergine/5 border border-aubergine/15" : "bg-ivory border border-ivory-200"}`}>
                              <p className="font-display font-bold text-ink text-xs leading-snug">{ev.title}</p>
                              <p className="font-mono text-[10px] text-ink-muted mt-0.5">{ev.date} · {ev.city}, {ev.state}</p>
                              <p className="font-ui text-xs text-ink-muted mt-1">${ev.price} / person</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 p-3 rounded-xl bg-peacock/8 border border-peacock/20">
                          <p className="font-ui text-xs text-peacock font-semibold">
                            You save ${Math.round((event.price + comboEvent.price) * comboQty * 0.15).toLocaleString()} on this bundle!
                          </p>
                          <p className="font-ui text-[11px] text-ink-muted mt-0.5">
                            vs. buying each event separately
                          </p>
                        </div>
                      </div>

                      {/* Qty for combo */}
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Number of People</p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setComboQty(Math.max(1, comboQty - 1))}
                            className="w-9 h-9 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-ink hover:border-aubergine hover:text-aubergine transition-all"
                          >
                            −
                          </button>
                          <span className="font-display font-bold text-2xl text-ink w-10 text-center">{comboQty}</span>
                          <button
                            onClick={() => setComboQty(Math.min(20, comboQty + 1))}
                            className="w-9 h-9 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-ink hover:border-aubergine hover:text-aubergine transition-all"
                          >
                            +
                          </button>
                          <span className="text-xs text-ink-muted ml-1">per event</span>
                        </div>
                      </div>

                      {/* Combo price breakdown */}
                      <div className="rounded-xl bg-ivory p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-ui text-ink-muted">{comboQty}× (${event.price} + ${comboEvent.price})</span>
                          <span className="font-ui text-ink">${comboSubtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="font-ui text-peacock">Bundle discount (15%)</span>
                          <span className="font-ui text-peacock">−${comboSavings.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="font-ui text-ink-muted">Service fee (4.9%)</span>
                          <span className="font-ui text-ink-muted">${Math.round((comboSubtotal - comboSavings) * 0.049).toLocaleString()}</span>
                        </div>
                        <div className="border-t border-ivory-200 pt-2 flex justify-between">
                          <span className="font-display font-bold text-ink">Total</span>
                          <span className="font-display font-bold text-ink text-lg">${comboTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* GA / VIP VIEW */
                    <>
                      {/* Quantity */}
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Number of Tickets</p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setQty(Math.max(1, qty - 1))}
                            className="w-9 h-9 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-ink hover:border-aubergine hover:text-aubergine transition-all"
                          >
                            −
                          </button>
                          <span className="font-display font-bold text-2xl text-ink w-10 text-center">{qty}</span>
                          <button
                            onClick={() => setQty(Math.min(20, qty + 1))}
                            className="w-9 h-9 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-ink hover:border-aubergine hover:text-aubergine transition-all"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Group discount tiers */}
                      <div className="rounded-xl border border-ivory-200 overflow-hidden">
                        <div className="bg-aubergine/5 px-3 py-2 border-b border-ivory-200">
                          <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine font-bold">Group Discounts</p>
                        </div>
                        <div className="divide-y divide-ivory-200">
                          {GROUP_TIERS.slice().reverse().map((tier) => {
                            const active = qty >= tier.min;
                            const isNext = nextTier?.min === tier.min;
                            return (
                              <div
                                key={tier.min}
                                className={`flex items-center justify-between px-3 py-2.5 transition-all ${active ? "bg-peacock/5" : isNext ? "bg-marigold/5" : ""}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${active ? "bg-peacock text-white" : "bg-ivory-200 text-ink-muted"}`}>
                                    {active ? "✓" : "·"}
                                  </span>
                                  <span className={`font-ui text-xs ${active ? "text-ink font-semibold" : "text-ink-muted"}`}>
                                    {tier.label}
                                  </span>
                                  {isNext && (
                                    <span className="font-mono text-[9px] uppercase tracking-wide text-marigold-dark bg-marigold/15 px-1.5 py-0.5 rounded-full">
                                      Add {tier.min - qty} more
                                    </span>
                                  )}
                                </div>
                                <span className={`font-display font-bold text-sm ${active ? "text-peacock" : "text-ink-muted"}`}>
                                  {tier.discount}% off
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {discount > 0 && (
                          <div className="bg-peacock px-3 py-2">
                            <p className="font-ui text-xs text-white font-semibold text-center">
                              You&rsquo;re saving ${discountAmount.toLocaleString()} with group pricing!
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Price breakdown */}
                      <div className="rounded-xl bg-ivory p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-ui text-ink-muted">{qty} × ${unitPrice}</span>
                          <span className="font-ui text-ink">${subtotal.toLocaleString()}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="font-ui text-peacock">Group discount ({discount}%)</span>
                            <span className="font-ui text-peacock">−${discountAmount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="font-ui text-ink-muted">Service fee (4.9%)</span>
                          <span className="font-ui text-ink-muted">${serviceFee.toLocaleString()}</span>
                        </div>
                        <div className="border-t border-ivory-200 pt-2 flex justify-between">
                          <span className="font-display font-bold text-ink">Total</span>
                          <span className="font-display font-bold text-ink text-lg">${grandTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Combo upsell nudge (when on GA/VIP tab and combo exists) */}
                  {ticketType !== "combo" && comboEvent && (
                    <button
                      onClick={() => setTicketType("combo")}
                      className="w-full text-left rounded-xl border-2 border-dashed border-peacock/30 bg-peacock/4 px-4 py-3 hover:border-peacock/60 hover:bg-peacock/8 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-ui text-xs font-bold text-peacock mb-0.5">Bundle & Save 15%</p>
                          <p className="font-ui text-[11px] text-ink-muted leading-snug">
                            Add <span className="text-ink font-medium">{comboEvent.city}</span> on {comboEvent.date.split(",")[0]}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] text-peacock group-hover:translate-x-0.5 transition-transform">→</span>
                      </div>
                    </button>
                  )}

                  {/* CTA */}
                  {soldOut ? (
                    <button disabled className="w-full py-4 rounded-2xl bg-ivory-200 text-ink-muted font-semibold text-sm cursor-not-allowed">
                      Sold Out
                    </button>
                  ) : (
                    <button
                      onClick={handleContinue}
                      className="w-full py-4 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark transition-all active:scale-[0.98] shadow-sm"
                    >
                      Continue to Checkout →
                    </button>
                  )}

                  {/* Group order CTA */}
                  <Link
                    href={`/group/create?eventId=${event.id}`}
                    className="w-full py-3 rounded-2xl border border-aubergine/25 text-aubergine font-ui font-semibold text-sm hover:bg-aubergine/5 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Start a Group Order
                  </Link>

                  <p className="text-center font-mono text-[10px] text-ink-muted">
                    Secure checkout · No hidden fees · Instant e-tickets
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
