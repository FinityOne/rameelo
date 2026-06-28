"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Member giveaway piece (portal home) ──────────────────────────────────────
// Logged-in members shouldn't re-type what we already know. This shows either:
//   • "You're entered" — their email already matches an entry in the active promo
//   • a join banner — one tap to enter, since name/email/city are on file. We only
//     ask for last name / phone when those are missing, and writing them back to
//     the profile via enter_promotion_member.
// Renders nothing when there's no active promo. Mirrors the public PromoEntryModal
// but built for an already-known user.

type MemberPromo = {
  id: string; name: string; headline: string; subheadline: string;
  prize_value: number; cta_label: string; fine_print: string;
};
type Status = {
  promotion: MemberPromo | null;
  entered: boolean;
  first_name: string | null;
  needs_last_name: boolean;
  needs_phone: boolean;
};

export default function PortalPromoCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);

  // Join form (only the missing bits)
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [justEntered, setJustEntered] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("get_member_promo_status").then(({ data }) => {
      setStatus((data as Status | null) ?? null);
    });
  }, []);

  const promo = status?.promotion ?? null;
  const entered = !!status?.entered || justEntered;

  // Esc closes the modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!promo) return null;

  const needsLast = !!status?.needs_last_name;
  const needsPhone = !!status?.needs_phone;
  const needsAnything = needsLast || needsPhone;

  async function join() {
    setError("");
    if (needsLast && !lastName.trim()) { setError("Please add your last name."); return; }
    setSubmitting(true);
    const supabase = createClient();
    const { data, error: rpcErr } = await supabase.rpc("enter_promotion_member", {
      p_last_name: lastName.trim() || null,
      p_phone: phone.trim() || null,
    });
    setSubmitting(false);
    const res = data as { ok?: boolean; error?: string; entry_id?: string | null; is_new?: boolean } | null;
    if (rpcErr || res?.error) { setError(res?.error || "Something went wrong. Please try again."); return; }
    // Notify admins of a genuinely new lead (dedupes don't re-notify).
    if (res?.is_new && res.entry_id) {
      fetch("/api/promotion-notify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: res.entry_id }),
      }).catch(() => {});
    }
    setJustEntered(true);
  }

  // ── Already entered → confirmation strip ──
  if (entered) {
    return (
      <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-peacock/30 bg-peacock/[0.06]">
        <div className="w-10 h-10 rounded-xl bg-peacock/15 flex items-center justify-center shrink-0 text-xl">🎉</div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>You&rsquo;re entered in the giveaway</p>
          <p className="font-ui text-xs text-ink-muted truncate">
            {promo.headline}{promo.prize_value > 0 ? ` · $${promo.prize_value} value` : ""}. If you win, we&rsquo;ll email you. Good luck! 🪔
          </p>
        </div>
        <span className="hidden sm:inline-flex font-mono text-[9px] font-bold uppercase tracking-widest text-peacock bg-peacock/10 px-2.5 py-1 rounded-full shrink-0">Entered</span>
      </div>
    );
  }

  // ── Not entered → join banner ──
  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(""); }}
        className="group w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-marigold/40 bg-marigold/[0.08] hover:bg-marigold/12 transition-all text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-marigold flex items-center justify-center shrink-0 text-xl">🎁</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>{promo.headline}</p>
            {promo.prize_value > 0 && <span className="font-mono text-[9px] uppercase tracking-widest text-marigold-dark shrink-0">${promo.prize_value} value</span>}
          </div>
          <p className="font-ui text-xs text-ink-muted truncate">{needsAnything ? "Tap to enter — we just need one or two details." : "You're one tap away — your info's already on file."}</p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 bg-aubergine text-white font-display font-bold text-xs px-4 py-2.5 rounded-xl group-hover:bg-aubergine-light transition-colors whitespace-nowrap">
          {promo.cta_label}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-aubergine/55 backdrop-blur-sm px-0 sm:px-4" onClick={() => setOpen(false)}>
          <div className="relative w-full sm:max-w-md bg-ivory rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94dvh] flex flex-col" onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} aria-label="Close" className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-ink-muted hover:text-ink shadow-sm transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {justEntered ? (
              <div className="px-7 py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-marigold/15 border border-marigold/30 flex items-center justify-center mx-auto text-3xl mb-4">🎉</div>
                <h2 className="font-display font-bold text-ink text-2xl mb-2" style={{ letterSpacing: "-0.02em" }}>You&rsquo;re in!</h2>
                <p className="font-ui text-sm text-ink-muted leading-relaxed max-w-xs mx-auto">Your entry is confirmed. If you win, we&rsquo;ll email you with your prize. Good luck! 🪔</p>
                <button onClick={() => setOpen(false)} className="mt-7 inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-colors">Done →</button>
              </div>
            ) : (
              <div className="overflow-y-auto">
                {/* Hero band */}
                <div className="relative px-7 pt-9 pb-7 text-center" style={{ background: "linear-gradient(160deg, #2E1B30 0%, #7C1F2C 130%)" }}>
                  <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
                  <div className="relative">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-aubergine bg-marigold px-3 py-1 rounded-full shadow-sm mb-4">
                      🎁 Giveaway{promo.prize_value > 0 ? ` · $${promo.prize_value} value` : ""}
                    </span>
                    <h2 className="font-display font-black text-white text-[28px] leading-[1.05] mb-2.5" style={{ letterSpacing: "-0.025em" }}>{promo.headline}</h2>
                    <p className="font-ui text-white/70 text-sm leading-relaxed max-w-xs mx-auto">{promo.subheadline}</p>
                  </div>
                </div>

                <div className="px-7 py-6 space-y-3">
                  {needsAnything ? (
                    <>
                      <p className="font-ui text-sm text-ink-muted text-center mb-1">
                        {status?.first_name ? `You're almost in, ${status.first_name}. ` : "You're almost in. "}
                        Just add {[needsLast && "your last name", needsPhone && "a phone number"].filter(Boolean).join(" and ")} — we&rsquo;ll save it to your profile.
                      </p>
                      {needsLast && (
                        <input className="w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-marigold/40 focus:border-marigold/50 transition-all"
                          placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} autoComplete="family-name" />
                      )}
                      {needsPhone && (
                        <input className="w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-marigold/40 focus:border-marigold/50 transition-all"
                          type="tel" inputMode="tel" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" />
                      )}
                    </>
                  ) : (
                    <p className="font-ui text-sm text-ink-muted text-center mb-1">
                      {status?.first_name ? `Ready, ${status.first_name}? ` : "Ready? "}
                      Your name and email are already on file — just hit the button below to enter.
                    </p>
                  )}

                  {error && <p className="font-ui text-xs text-durga text-center">{error}</p>}

                  <button onClick={join} disabled={submitting}
                    className="w-full mt-1 inline-flex items-center justify-center gap-2 bg-marigold text-aubergine font-display font-bold text-base py-3.5 rounded-2xl hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-lg shadow-marigold/20 disabled:opacity-60"
                    style={{ minHeight: 52 }}>
                    {submitting ? <><span className="w-4 h-4 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />Entering…</> : <>{needsAnything ? "Save & enter" : "Join the giveaway"} 🎟️</>}
                  </button>

                  <p className="font-ui text-[11px] text-ink-muted/70 leading-relaxed text-center pt-1">{promo.fine_print}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
