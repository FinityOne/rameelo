"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PROMO_LS, type Promotion } from "@/lib/promotions";
import PromoEntryModal from "./PromoEntryModal";

// Minimal, ad-style promo strip (sits just below the hero). Shows the most
// recent active promotion; clicking opens the same entry form as the site-wide
// modal. Renders nothing when there's no active promo or the visitor already
// entered/dismissed it.

export default function PromoBanner() {
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("get_active_promotion");
      const active = (data as Promotion | null) ?? null;
      if (cancelled || !active) return;
      // If they've already entered this promo, keep the page clean.
      try {
        if (localStorage.getItem(PROMO_LS.doneFor) === active.id) { setHidden(true); }
      } catch {}
      setPromo(active);
    })();
    return () => { cancelled = true; };
  }, []);

  function handleEntered() {
    if (promo) { try { localStorage.setItem(PROMO_LS.doneFor, promo.id); } catch {} }
  }

  if (!promo || hidden) return null;

  return (
    <section className="bg-ivory border-b border-ivory-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <button
          onClick={() => setOpen(true)}
          className="group w-full flex items-center gap-3 sm:gap-4 rounded-xl border border-marigold/30 bg-white px-3.5 sm:px-4 py-3 text-left hover:border-marigold/60 hover:shadow-sm transition-all"
        >
          <span className="shrink-0 w-9 h-9 rounded-lg bg-marigold/15 flex items-center justify-center text-lg">🎁</span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-ink-muted/60 border border-ink/10 rounded px-1 py-0.5 leading-none">Giveaway</span>
              {promo.prize_value > 0 && (
                <span className="font-mono text-[9px] uppercase tracking-widest text-marigold-dark">${promo.prize_value} value</span>
              )}
            </div>
            <p className="font-display font-bold text-ink text-sm sm:text-base truncate mt-1">{promo.headline}</p>
            <p className="font-ui text-xs text-ink-muted truncate hidden sm:block">{promo.subheadline}</p>
          </div>

          <span className="shrink-0 inline-flex items-center gap-1.5 bg-marigold text-aubergine font-display font-bold text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg group-hover:bg-marigold-dark transition-colors">
            {promo.cta_label}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </span>
        </button>
      </div>

      {open && <PromoEntryModal promo={promo} onClose={() => setOpen(false)} onEntered={handleEntered} />}
    </section>
  );
}
