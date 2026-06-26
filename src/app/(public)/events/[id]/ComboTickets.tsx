"use client";

import { useState } from "react";

// Public combo-ticket promo + purchase UI for the event detail page. A combo ticket
// is one ticket granting entry to multiple events of the same organization. Shown as
// a slim banner up top and as a richer card in the purchase column — each linked
// event surfaces its artist / date / location and links out (new tab), and the card
// quantifies the saving vs buying each event's single ticket separately.

export type ComboEvent = {
  id: string; title: string; start_date: string; start_time: string | null;
  city: string | null; state: string | null; venue_name: string | null;
  artist_name: string | null; from_price: number | null;
};
export type ComboTicket = {
  id: string; name: string; description: string | null; price: number;
  quantity: number; quantity_sold: number;
  sale_start_date: string | null; sale_end_date: string | null;
  events: ComboEvent[];
};

export function comboBuyable(c: ComboTicket): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (c.quantity - c.quantity_sold <= 0) return false;
  if (c.sale_start_date && today < c.sale_start_date) return false;
  if (c.sale_end_date && today > c.sale_end_date) return false;
  return true;
}

// Saving vs buying the cheapest single ticket for each event separately. Only when
// EVERY event has a price (so the comparison is honest and complete).
export function comboSavings(c: ComboTicket): { regular: number; save: number; pct: number } | null {
  if (c.events.length < 2 || c.events.some(e => e.from_price == null)) return null;
  const regular = c.events.reduce((s, e) => s + (e.from_price ?? 0), 0);
  const save = regular - c.price;
  if (save <= 0.5) return null;
  return { regular, save, pct: Math.round((save / regular) * 100) };
}

const money = (n: number) => `$${Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2)}`;
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
function fmtTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}
function locOf(e: ComboEvent): string {
  return [e.venue_name, [e.city, e.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
}

// ── Top quick-picker ──────────────────────────────────────────────────────────
// A slim, side-by-side pair of jump links shown above the fold: "Single event"
// (cheapest single-event ticket for THIS event) and "{N}-event combo". Both prices
// are visible on load — critical on mobile so a price-sensitive buyer is never
// misled into thinking the combo is the only (pricier) option. Tapping either
// scrolls to its purchase block. The single button is omitted when this event
// isn't selling singles here, in which case the combo button spans full width.
export function TicketQuickPicker({
  combo, comboCount, singleFromPrice, onSingle, onCombo,
}: {
  combo: ComboTicket; comboCount: number; singleFromPrice: number | null;
  onSingle: () => void; onCombo: () => void;
}) {
  const savings = comboSavings(combo);
  const nEvents = combo.events.length;
  const comboLabel = comboCount > 1 ? "Combo tickets" : `${nEvents}-event combo`;
  const hasSingle = singleFromPrice != null;
  const ChevDown = ({ className }: { className: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
    </svg>
  );
  return (
    <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-3">
      {/* Single-event tickets — this event only */}
      {hasSingle && (
        <button
          onClick={onSingle}
          className="group rounded-2xl border border-ivory-200 bg-white px-3.5 sm:px-4 py-3 text-left transition-all hover:border-aubergine/45 hover:shadow-sm active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-ink-muted">Single event</span>
            <ChevDown className="w-3.5 h-3.5 text-ink-muted/60 group-hover:translate-y-0.5 transition-transform" />
          </div>
          <p className="font-ui text-[12px] text-ink-muted mt-1.5 leading-tight">This event only</p>
          <p className="font-display font-bold text-ink text-xl leading-none mt-1" style={{ letterSpacing: "-0.02em" }}>
            <span className="font-ui text-[11px] font-medium text-ink-muted align-baseline">from </span>{money(singleFromPrice)}
          </p>
        </button>
      )}

      {/* Combo — multiple events, one ticket */}
      <button
        onClick={onCombo}
        className={`group relative overflow-hidden rounded-2xl border-2 border-marigold/45 px-3.5 sm:px-4 py-3 text-left shadow-sm transition-all active:scale-[0.99] ${hasSingle ? "" : "col-span-2"}`}
        style={{ background: "linear-gradient(120deg, #2E1B30 0%, #5B2333 72%, #B8780F 135%)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-marigold">✨ {comboLabel}</span>
          <ChevDown className="w-3.5 h-3.5 text-white/70 group-hover:translate-y-0.5 transition-transform" />
        </div>
        <p className="font-ui text-[12px] text-white/65 mt-1.5 leading-tight truncate">{nEvents} events · one ticket</p>
        <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
          {savings && <span className="font-ui text-[11px] text-white/45 line-through leading-none">{money(savings.regular)}</span>}
          <p className="font-display font-bold text-white text-xl leading-none" style={{ letterSpacing: "-0.02em" }}>{money(combo.price)}</p>
          {savings && (
            <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-aubergine bg-marigold px-1.5 py-0.5 rounded-full leading-none">Save {savings.pct}%</span>
          )}
        </div>
      </button>
    </div>
  );
}

// ── One event inside the combo ────────────────────────────────────────────────
function ComboEventBlock({ e, isCurrent }: { e: ComboEvent; isCurrent: boolean }) {
  return (
    <div className="rounded-xl border border-ivory-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display font-semibold text-ink text-sm leading-snug">{e.title}</p>
          {e.artist_name && (
            <p className="font-ui text-[12px] text-aubergine font-medium mt-0.5 flex items-center gap-1">
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              {e.artist_name}
            </p>
          )}
        </div>
        {isCurrent ? (
          <span className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-1 rounded-full bg-aubergine/8 text-aubergine">You&apos;re here</span>
        ) : (
          <a
            href={`/events/${e.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={ev => ev.stopPropagation()}
            className="shrink-0 inline-flex items-center gap-0.5 font-ui text-[12px] font-semibold text-aubergine hover:text-aubergine-light"
          >
            View
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        )}
      </div>
      <div className="mt-2 space-y-1 font-ui text-[11px] text-ink-muted">
        <p className="flex items-center gap-1.5">
          <svg className="w-3 h-3 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          {fmtDate(e.start_date)}{fmtTime(e.start_time) ? ` · ${fmtTime(e.start_time)}` : ""}
        </p>
        {locOf(e) && (
          <p className="flex items-center gap-1.5">
            <svg className="w-3 h-3 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span className="truncate">{locOf(e)}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ── Purchase card (in the tickets column) ─────────────────────────────────────
export function ComboTicketCard({ combo, currentEventId, onBuy }: {
  combo: ComboTicket; currentEventId: string; onBuy: (combo: ComboTicket, qty: number) => void;
}) {
  const remaining = combo.quantity - combo.quantity_sold;
  const maxQty = Math.min(10, Math.max(1, remaining));
  const [qty, setQty] = useState(1);
  const savings = comboSavings(combo);

  return (
    <div className="rounded-2xl bg-white border-2 border-marigold/45 overflow-hidden shadow-sm">
      {/* Slim header */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-2" style={{ background: "linear-gradient(110deg, #2E1B30 0%, #B8780F 140%)" }}>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-marigold flex items-center gap-1.5">✨ Combo Ticket</span>
        <div className="flex items-center gap-1.5">
          {savings && <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-aubergine bg-marigold px-2 py-0.5 rounded-full">Save {savings.pct}%</span>}
          {remaining <= 10 && remaining > 0 && <span className="font-mono text-[9px] font-bold text-white/90 bg-white/15 px-2 py-0.5 rounded-full">{remaining} left</span>}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <p className="font-display font-bold text-ink text-base leading-tight" style={{ letterSpacing: "-0.015em" }}>{combo.name}</p>
          {combo.description && <p className="font-ui text-[13px] text-ink-muted mt-0.5 leading-snug">{combo.description}</p>}
        </div>

        {/* Both events, connected by a + */}
        <div className="space-y-1.5">
          {combo.events.map((e, i) => (
            <div key={e.id}>
              <ComboEventBlock e={e} isCurrent={e.id === currentEventId} />
              {i < combo.events.length - 1 && (
                <div className="flex justify-center -my-0.5 relative z-10">
                  <span className="w-6 h-6 rounded-full bg-marigold text-aubergine font-bold text-sm flex items-center justify-center shadow-sm">+</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Savings vs buying separately */}
        {savings && (
          <div className="rounded-xl bg-peacock/8 border border-peacock/25 px-3.5 py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-ui text-[11px] text-ink-muted">
                Buy each separately: <span className="line-through">{money(savings.regular)}</span>
              </p>
              <p className="font-display font-bold text-peacock text-sm leading-tight">You save {money(savings.save)} with the combo</p>
            </div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-peacock bg-peacock/12 px-2 py-1 rounded-full shrink-0">−{savings.pct}%</span>
          </div>
        )}

        {/* Quantity */}
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Quantity</p>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-9 h-9 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-lg text-ink hover:border-aubergine hover:text-aubergine transition-all">−</button>
            <span className="font-display font-bold text-xl text-ink w-8 text-center">{qty}</span>
            <button onClick={() => setQty(Math.min(maxQty, qty + 1))} disabled={qty >= maxQty}
              className="w-9 h-9 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-lg text-ink hover:border-aubergine hover:text-aubergine transition-all disabled:opacity-40 disabled:cursor-not-allowed">+</button>
          </div>
        </div>

        {/* Total + CTA */}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Total</p>
            <p className="font-display font-bold text-ink text-2xl leading-none" style={{ letterSpacing: "-0.02em" }}>{money(combo.price * qty)}</p>
            <p className="font-mono text-[10px] text-ink-muted/70 mt-0.5">{combo.events.length} events · {qty} ticket{qty !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={() => onBuy(combo, qty)}
            className="inline-flex items-center gap-2 font-display font-bold text-sm text-white px-6 py-3 rounded-xl shadow-sm transition-all active:scale-[0.98] hover:opacity-95"
            style={{ background: "linear-gradient(110deg, #2E1B30 0%, #B8780F 150%)" }}
          >
            Get combo
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
