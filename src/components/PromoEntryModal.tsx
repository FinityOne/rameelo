"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNearestMetro } from "@/hooks/useNearestMetro";
import { type Promotion } from "@/lib/promotions";

// Reusable promotion entry dialog: the giveaway hero band + entry form +
// success state. Parent controls when it's mounted and what happens on close /
// after a successful entry. Used by both the auto-shown PromoModal and the
// click-to-open PromoBanner so the form stays identical everywhere.

type Phase = "form" | "success";

export default function PromoEntryModal({
  promo,
  onClose,
  onEntered,
}: {
  promo: Promotion;
  onClose: () => void;
  onEntered?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("form");
  const loc = useNearestMetro();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cityTouched, setCityTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill city/state from geolocation (seamless) unless the user typed.
  useEffect(() => {
    if (!cityTouched && loc.status === "resolved") {
      setCity((c) => c || loc.metro.city);
      setState((s) => s || loc.metro.state);
    }
  }, [loc, cityTouched]);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || !lastName.trim() || !email.includes("@")) {
      setError("Please enter your name and a valid email.");
      return;
    }
    setSubmitting(true);
    let ip: string | null = null;
    try {
      const r = await fetch("https://api.ipify.org?format=json").then((x) => x.json());
      ip = r?.ip ?? null;
    } catch {}
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("enter_promotion", {
      p_promotion_id: promo.id,
      p_first_name: firstName,
      p_last_name: lastName,
      p_email: email,
      p_phone: phone,
      p_city: city,
      p_state: state,
      p_source_ip: ip,
    });
    setSubmitting(false);
    const res = data as { ok?: boolean; error?: string; entry_id?: string | null; is_new?: boolean } | null;
    if (rpcError || res?.error) { setError(res?.error || "Something went wrong. Please try again."); return; }
    // Notify admins — only for a genuinely new entry (dedupes don't re-notify).
    if (res?.is_new && res.entry_id) {
      fetch("/api/promotion-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: res.entry_id }),
      }).catch(() => {});
    }
    onEntered?.();
    setPhase("success");
  }

  const inputCls =
    "w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-marigold/40 focus:border-marigold/50 transition-all";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-aubergine/55 backdrop-blur-sm px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-md bg-ivory rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-ink-muted hover:text-ink shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {phase === "success" ? (
          <div className="px-7 py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-marigold/15 border border-marigold/30 flex items-center justify-center mx-auto text-3xl mb-4">🎉</div>
            <h2 className="font-display font-bold text-ink text-2xl mb-2" style={{ letterSpacing: "-0.02em" }}>You&rsquo;re in!</h2>
            <p className="font-ui text-sm text-ink-muted leading-relaxed max-w-xs mx-auto">
              Your entry is confirmed. If you win, we&rsquo;ll email <span className="font-semibold text-ink">{email}</span> with your prize. Good luck! 🪔
            </p>
            <button onClick={onClose} className="mt-7 inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-colors">
              Keep browsing →
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto">
            {/* Hero band */}
            <div className="relative px-7 pt-9 pb-7 text-center" style={{ background: "linear-gradient(160deg, #2E1B30 0%, #7C1F2C 130%)" }}>
              <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-aubergine bg-marigold px-3 py-1 rounded-full shadow-sm mb-4">
                  🎁 Giveaway · ${promo.prize_value} value
                </span>
                <h2 className="font-display font-black text-white text-[28px] leading-[1.05] mb-2.5" style={{ letterSpacing: "-0.025em" }}>
                  {promo.headline}
                </h2>
                <p className="font-ui text-white/70 text-sm leading-relaxed max-w-xs mx-auto">
                  {promo.subheadline}
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-7 py-6 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <input className={inputCls} placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
                <input className={inputCls} placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
              </div>
              <input className={inputCls} type="email" inputMode="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              <input className={inputCls} type="tel" inputMode="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              <div className="grid grid-cols-[1fr_88px] gap-2.5">
                <input className={inputCls} placeholder="City" value={city} onChange={(e) => { setCityTouched(true); setCity(e.target.value); }} autoComplete="address-level2" />
                <input className={inputCls} placeholder="State" maxLength={2} value={state} onChange={(e) => { setCityTouched(true); setState(e.target.value.toUpperCase()); }} autoComplete="address-level1" />
              </div>

              {error && <p className="font-ui text-xs text-durga">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-1 inline-flex items-center justify-center gap-2 bg-marigold text-aubergine font-display font-bold text-base py-3.5 rounded-2xl hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-lg shadow-marigold/20 disabled:opacity-60"
                style={{ minHeight: 52 }}
              >
                {submitting ? <><span className="w-4 h-4 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />Entering…</> : <>{promo.cta_label} 🎟️</>}
              </button>

              <p className="font-ui text-[11px] text-ink-muted/70 leading-relaxed text-center pt-1">
                {promo.fine_print}
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
