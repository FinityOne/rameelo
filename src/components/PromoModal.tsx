"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PROMO_LS, type Promotion } from "@/lib/promotions";
import PromoEntryModal from "./PromoEntryModal";

// Site-wide raffle modal. Shows an active promotion (e.g. "Win 2 free garba
// tickets") to LOGGED-OUT visitors only, after a short delay, once they've spent
// a moment on the site. Lightweight and non-annoying:
//   • never shown to signed-in users
//   • never shown if already entered or permanently dismissed (localStorage)
//   • a soft dismiss snoozes it for 7 days
// The dialog itself (form + success) lives in PromoEntryModal, shared with the
// click-to-open PromoBanner.

const SHOW_DELAY_MS = 12_000;       // let them browse first
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days after a soft dismiss

export default function PromoModal() {
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Decide whether to show: only for logged-out users with an active promo they
  // haven't finished, and not currently snoozed.
  useEffect(() => {
    let cancelled = false;
    async function decide() {
      const snoozeUntil = Number(localStorage.getItem(PROMO_LS.snoozeUntil) || 0);
      if (snoozeUntil && Date.now() < snoozeUntil) return;

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || user) return; // signed in → never show

      const { data } = await supabase.rpc("get_active_promotion");
      const active = (data as Promotion | null) ?? null;
      if (cancelled || !active) return;

      if (localStorage.getItem(PROMO_LS.doneFor) === active.id) return; // already entered/dismissed-for-good

      setPromo(active);
      timerRef.current = setTimeout(() => !cancelled && setOpen(true), SHOW_DELAY_MS);
    }
    decide();
    return () => { cancelled = true; if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  function softDismiss() {
    // Snooze for a week — not gone forever, just not annoying.
    try { localStorage.setItem(PROMO_LS.snoozeUntil, String(Date.now() + SNOOZE_MS)); } catch {}
    setOpen(false);
  }

  function markDone() {
    if (promo) { try { localStorage.setItem(PROMO_LS.doneFor, promo.id); } catch {} }
  }

  if (!open || !promo) return null;

  return <PromoEntryModal promo={promo} onClose={softDismiss} onEntered={markDone} />;
}
