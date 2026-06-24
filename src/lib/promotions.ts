// Shared types + helpers for platform promotions (the "win 2 free tickets"
// raffle modal) and their entries. The modal is shown to logged-out visitors;
// admins manage promos and view entries in /admin/promotions.

export interface Promotion {
  id: string;
  name: string;
  headline: string;
  subheadline: string;
  prize_value: number;
  cta_label: string;
  fine_print: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromotionEntry {
  id: string;
  promotion_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  user_id: string | null;
  created_at: string;
}

// Defaults for a fresh promotion (mirrors the DB column defaults so the admin
// create form starts persuasive out of the box).
export const PROMO_DEFAULTS = {
  headline: "Win 2 Free Garba Tickets",
  subheadline: "Enter for a chance to win 2 tickets to any garba of your choice — a $100 value.",
  prize_value: 100,
  cta_label: "Enter to win",
  fine_print:
    "Terms & conditions apply. One entry per person. No purchase necessary. Winner selected at random and contacted by email.",
};

// localStorage keys controlling how often the modal can appear, so it never
// becomes annoying. (Dismissed = snooze for a while; entered/closed-for-good =
// never show again for this browser.)
export const PROMO_LS = {
  /** epoch ms after which a dismissed modal may show again */
  snoozeUntil: "rmpromo_snooze_until",
  /** promotion id the user has already entered or permanently dismissed */
  doneFor: "rmpromo_done_for",
};
