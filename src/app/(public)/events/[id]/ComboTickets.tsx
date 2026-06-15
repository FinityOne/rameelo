"use client";

import { useState } from "react";

// Public combo-ticket promo + purchase UI for the event detail page. A combo ticket
// is one ticket granting entry to multiple events of the same organization. Shown as
// an eye-catching banner up top and as a card in the purchase column.

export type ComboEvent = { id: string; title: string; start_date: string; city: string | null; state: string | null; venue_name: string | null };
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

const money = (n: number) => `$${Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2)}`;
const fmtDay = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

// ── Top banner ────────────────────────────────────────────────────────────────
export function ComboBanner({ combo, onGet }: { combo: ComboTicket; onGet: () => void }) {
  const count = combo.events.length;
  return (
    <button
      onClick={onGet}
      className="group relative w-full overflow-hidden rounded-3xl text-left mb-6 shadow-lg transition-transform active:scale-[0.995]"
      style={{ background: "linear-gradient(110deg, #2E1B30 0%, #5B2333 45%, #B8780F 100%)" }}
    >
      {/* sparkle texture */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 18% 30%, #fff 0, transparent 38%), radial-gradient(circle at 82% 70%, #F5A623 0, transparent 40%)" }} />
      <div className="relative px-5 sm:px-7 py-5 sm:py-6 flex items-center gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-base">✨</span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-marigold">Combo Deal · Best Value</span>
          </div>
          <p className="font-display font-bold text-white text-xl sm:text-2xl leading-tight" style={{ letterSpacing: "-0.02em" }}>{combo.name}</p>
          <p className="font-ui text-sm text-white/75 mt-1 truncate">
            One ticket → entry to {count} event{count !== 1 ? "s" : ""}: {combo.events.map(e => e.title).join(" · ")}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[9px] uppercase tracking-widest text-white/50">From</p>
          <p className="font-display font-bold text-white text-2xl sm:text-3xl leading-none" style={{ letterSpacing: "-0.03em" }}>{money(combo.price)}</p>
          <span className="mt-2 inline-flex items-center gap-1 font-ui font-bold text-xs text-aubergine bg-white px-3.5 py-1.5 rounded-full group-hover:bg-marigold group-hover:text-white transition-colors">
            Get the combo
            <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Purchase card (in the tickets column) ───────────────────────────────────────
export function ComboTicketCard({ combo, currentEventId, onBuy }: {
  combo: ComboTicket; currentEventId: string; onBuy: (combo: ComboTicket, qty: number) => void;
}) {
  const remaining = combo.quantity - combo.quantity_sold;
  const maxQty = Math.min(10, Math.max(1, remaining));
  const [qty, setQty] = useState(1);

  return (
    <div className="rounded-2xl bg-white border-2 border-marigold/40 overflow-hidden shadow-sm">
      {/* Accent header */}
      <div className="px-5 py-3 flex items-center justify-between gap-2" style={{ background: "linear-gradient(110deg, #2E1B30 0%, #B8780F 130%)" }}>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-marigold flex items-center gap-1.5">✨ Combo Ticket</span>
        {remaining <= 10 && remaining > 0 && (
          <span className="font-mono text-[9px] font-bold text-white/90 bg-white/15 px-2 py-0.5 rounded-full">{remaining} left</span>
        )}
      </div>

      <div className="p-5 space-y-4">
        <div>
          <p className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.015em" }}>{combo.name}</p>
          {combo.description && <p className="font-ui text-sm text-ink-muted mt-0.5">{combo.description}</p>}
        </div>

        {/* What's included */}
        <div className="rounded-xl border border-ivory-200 bg-ivory/50 p-3.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2">Includes entry to</p>
          <div className="space-y-1.5">
            {combo.events.map(e => (
              <div key={e.id} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                <span className={`font-ui text-sm truncate ${e.id === currentEventId ? "text-ink font-semibold" : "text-ink"}`}>{e.title}</span>
                <span className="font-mono text-[10px] text-ink-muted shrink-0 ml-auto">{fmtDay(e.start_date)}</span>
              </div>
            ))}
          </div>
        </div>

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
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Total</p>
            <p className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>{money(combo.price * qty)}</p>
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
