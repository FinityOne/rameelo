"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "@/app/organizer/events/create/types";
import { salesClosedForEvent, tierSaleClosed } from "@/lib/event-time";
import { money } from "@/lib/money";
import { groupDiscountPct, groupDiscountAmount, groupScalingLevels } from "@/lib/group-orders";
import { computeFees } from "@/lib/fees";
import EventInterestView from "./EventInterestView";
import { ComboBanner, ComboTicketCard, comboBuyable, type ComboTicket } from "./ComboTickets";
import MetroSticker from "./MetroSticker";
import MoreFromOrganizer from "./MoreFromOrganizer";
import EventWhenWhere from "./EventWhenWhere";
import EventPresenter from "./EventPresenter";

// ── Types ────────────────────────────────────────────────────────────────────

type Artist = {
  id: string;
  name: string;
  slug: string | null;
  tagline: string | null;
  bio: string | null;
  profile_image_url: string | null;
  genres: string[] | null;
  years_active_since: number | null;
  follower_count: number | null;
  performance_style: string | null;
};

type Organization = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
};

type Tier = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  quantity_sold: number;
  sold_out: boolean;
  sale_start_date: string | null;
  sale_end_date: string | null;
  is_visible: boolean;
  sort_order: number;
  group_discount_mode: 'simple' | 'scaling' | null;
  group_discount_min_qty: number | null;
  group_discount_type: 'percentage' | 'fixed' | null;
  group_discount_value: number | null;
  group_discount_tiers: { min_qty: number; percent: number }[] | null;
};

type Event = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  navratri_nights: number[] | null;
  start_date: string;
  end_date: string | null;
  start_time: string;
  end_time: string | null;
  doors_open_time: string | null;
  venue_name: string;
  address_line1: string;
  city: string;
  state: string;
  zip: string | null;
  metro_city: string | null;
  parking: string;
  parking_notes: string | null;
  website_url: string | null;
  cover_image_url: string | null;
  cover_gradient: string;
  dress_code: string;
  dress_code_details: string | null;
  dandiya_sticks: string;
  age_restriction: string;
  capacity: number | null;
  selling_on_rameelo: boolean;
  kids_5_under_free: boolean;
  kids_free_age: number;
  show_social_proof: boolean;
  org_id: string | null;
  artist: Artist | null;
  organization: Organization | null;
  ticket_tiers: Tier[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────
// Discount math is centralized in src/lib/group-orders.ts so the event page,
// group flow, and checkout all behave identically. These thin wrappers adapt the
// page's Tier shape to the shared helpers.

function getTierDiscount(tier: Tier | null, qty: number): number {
  return groupDiscountPct(tier, qty);
}
function getTierDiscountAmount(tier: Tier | null, qty: number, subtotal: number): number {
  return groupDiscountAmount(tier, qty, subtotal);
}
// The next scaling level the buyer hasn't reached yet (for the "add N more" nudge).
function getNextScalingTier(tier: Tier | null, qty: number): { min: number; discount: number } | null {
  for (const lvl of groupScalingLevels(tier)) {
    if (qty < lvl.minQty) return { min: lvl.minQty, discount: lvl.percent };
  }
  return null;
}

// Tickets remaining for a tier. An admin-forced `sold_out` flag closes the tier
// immediately, regardless of how many were actually sold — so it always reads 0.
function tierRemaining(tier: Tier): number {
  if (tier.sold_out) return 0;
  return tier.quantity - tier.quantity_sold;
}
// A tier counts as sold out when the admin forced it OR real inventory ran out.
function tierIsSoldOut(tier: Tier): boolean {
  return tier.sold_out || tier.quantity_sold >= tier.quantity;
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}
function fmtTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

/** Pseudo-random but stable-per-day-per-event so it doesn't flicker on re-render */
function stableRandom(eventId: string, salt: string, min: number, max: number): number {
  const key = eventId + salt + new Date().toDateString();
  let h = 0;
  for (let i = 0; i < key.length; i++) { h = (Math.imul(31, h) + key.charCodeAt(i)) | 0; }
  return min + Math.abs(h) % (max - min + 1);
}

/** Days until a date string (YYYY-MM-DD) */
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / 86400000));
}

/** A multi-day event is "past" once its final day is before today (local). */
function isEventPast(ev: { start_date: string; end_date: string | null }): boolean {
  const lastDay = ev.end_date ?? ev.start_date;
  return lastDay < new Date().toISOString().slice(0, 10);
}

// Don't surface the real "X people secured their spot" count until it's high
// enough to be persuasive — a low number discourages buyers. Below this we use
// encouraging early-buyer wording with no number instead.
const SOCIAL_PROOF_MIN_SOLD = 50;

/** Pick urgency state based on lowest fill-% across visible tiers */
function getUrgencyState(tiers: Tier[]): "early" | "momentum" | "urgent" | "critical" | "soldout" {
  if (!tiers.length) return "early";
  const all = tiers.filter(t => t.quantity > 0);
  if (all.every(tierIsSoldOut)) return "soldout";
  // Exclude force-closed tiers from the fill math so a half-empty tier the admin
  // marked sold out doesn't drag the urgency signal down for the live tiers.
  const live = all.filter(t => !t.sold_out);
  const totalQty  = live.reduce((s, t) => s + t.quantity, 0);
  const totalSold = live.reduce((s, t) => s + t.quantity_sold, 0);
  const pct = totalQty > 0 ? totalSold / totalQty : 0;
  if (pct >= 0.85) return "critical";
  if (pct >= 0.5)  return "urgent";
  if (pct >= 0.12) return "momentum";
  return "early";
}

const CATEGORY_LABELS: Record<string, string> = {
  garba: "Garba", dandiya: "Dandiya", raas: "Raas",
  workshop: "Workshop", community: "Community", other: "Other",
};
const DRESS_LABELS: Record<string, string> = {
  none: "No requirement", encouraged: "Traditional encouraged", required: "Traditional required",
};
const DANDIYA_LABELS: Record<string, string> = {
  provided: "Sticks provided", byod: "Bring your own", not_applicable: "N/A",
};
const PARKING_LABELS: Record<string, string> = {
  free: "Free parking", paid_nearby: "Paid parking nearby", street: "Street parking",
  valet: "Valet available", limited: "Limited parking", none: "No dedicated parking",
};

// ── Countdown Component ───────────────────────────────────────────────────────
function EventCountdown({ dateStr }: { dateStr: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    function update() {
      const target = new Date(dateStr + "T00:00:00").getTime();
      const diff = Math.max(0, target - Date.now());
      const days    = Math.floor(diff / 86400000);
      const hours   = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setTimeLeft({ days, hours, minutes });
    }
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [dateStr]);

  // Event is today → drop the day/hour grid and show a loud "today / last chance"
  // urgency message instead of a tiny countdown.
  if (timeLeft.days === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-durga/10 border border-durga/25 px-3.5 py-2.5">
        <span className="w-2 h-2 bg-durga rounded-full animate-pulse shrink-0" />
        <div>
          <p className="font-display font-bold text-durga text-base leading-tight">It&rsquo;s today! 🔥</p>
          <p className="font-ui text-[11px] text-durga/80 leading-tight">Last chance to grab your tickets</p>
        </div>
      </div>
    );
  }

  const units = [
    { label: "Days",    value: timeLeft.days },
    { label: "Hours",   value: timeLeft.hours },
    { label: "Min",     value: timeLeft.minutes },
  ];

  return (
    <div className="flex items-center gap-2">
      {units.map((u, i) => (
        <div key={u.label} className="flex items-center gap-2">
          {i > 0 && <span className="font-display font-bold text-aubergine/30 text-lg">:</span>}
          <div className="text-center">
            <div className="w-12 h-11 rounded-xl flex items-center justify-center font-display font-bold text-xl text-aubergine" style={{ backgroundColor: "rgba(46,27,48,0.07)" }}>
              {String(u.value).padStart(2, "0")}
            </div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-0.5">{u.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Urgency Banner ────────────────────────────────────────────────────────────
function UrgencyBanner({
  event,
  urgencyState,
  viewingNow,
  soldToday,
  lowestTier,
  nextCheapestPrice,
}: {
  event: Event;
  urgencyState: ReturnType<typeof getUrgencyState>;
  viewingNow: number;
  soldToday: number;
  lowestTier: Tier | null;
  nextCheapestPrice: number | null;
}) {
  const days = daysUntil(event.start_date);

  // ── SOLD OUT ──────────────────────────────────────────────────────────
  if (urgencyState === "soldout") {
    return (
      <div className="rounded-2xl bg-ink border border-ink/20 p-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/50 mb-1">Sold Out</p>
        <p className="font-display font-bold text-white text-base mb-2">All tickets claimed</p>
        <p className="font-ui text-xs text-white/60">Join the waitlist — organizers sometimes release held tickets.</p>
      </div>
    );
  }

  // ── CRITICAL (85%+ sold) ─────────────────────────────────────────────
  if (urgencyState === "critical" && lowestTier) {
    const rem = lowestTier.quantity - lowestTier.quantity_sold;
    return (
      <div className="rounded-2xl overflow-hidden border-2 border-durga/40" style={{ backgroundColor: "#fff5f5" }}>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-durga">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse shrink-0" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-white font-bold">Almost Gone</p>
        </div>
        <div className="px-4 py-3 space-y-2">
          <p className="font-display font-bold text-ink text-base">
            Only {rem} {lowestTier.name} ticket{rem !== 1 ? "s" : ""} left
          </p>
          <p className="font-ui text-xs text-ink-muted">
            {soldToday > 0 && <><strong className="text-ink">{soldToday} tickets</strong> sold in the last 24 hours. </>}
            {nextCheapestPrice !== null && (
              <>Once {lowestTier.name} sells out, the next option is <strong className="text-ink">${money(nextCheapestPrice)}</strong>.</>
            )}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <span className="w-1.5 h-1.5 bg-durga rounded-full animate-pulse shrink-0" />
            <p className="font-mono text-[10px] text-durga font-bold">{viewingNow} people looking at this right now</p>
          </div>
        </div>
      </div>
    );
  }

  // ── URGENT (50–85% sold) ─────────────────────────────────────────────
  if (urgencyState === "urgent" && lowestTier) {
    const rem = lowestTier.quantity - lowestTier.quantity_sold;
    const pct = Math.round((lowestTier.quantity_sold / lowestTier.quantity) * 100);
    return (
      <div className="rounded-2xl border border-marigold/30 bg-marigold/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-marigold rounded-full animate-pulse shrink-0" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-marigold-dark font-bold">Selling Fast</p>
          </div>
          <p className="font-mono text-[10px] text-ink-muted">{pct}% claimed</p>
        </div>
        <div className="h-2 bg-ivory-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-marigold transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="font-ui text-sm text-ink">
          <strong>{rem} tickets remaining.</strong>
          {soldToday > 0 && <> {soldToday} sold today</>}{days === 0 ? <> — <strong className="text-durga">it&rsquo;s today — last chance!</strong></> : days <= 30 ? ` — only ${days} days to go.` : "."}
        </p>
        {nextCheapestPrice !== null && rem <= Math.ceil(lowestTier.quantity * 0.25) && (
          <p className="font-mono text-[10px] text-marigold-dark bg-marigold/10 px-3 py-1.5 rounded-lg">
            ⚠️ Once {lowestTier.name} sells out, next tier is ${money(nextCheapestPrice)}
          </p>
        )}
      </div>
    );
  }

  // ── MOMENTUM (12–50% sold) ───────────────────────────────────────────
  if (urgencyState === "momentum") {
    return (
      <div className="rounded-2xl border border-ivory-200 bg-white p-4 space-y-3">
        {/* Countdown */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">{days === 0 ? "Happening today" : "Event countdown"}</p>
            <EventCountdown dateStr={event.start_date} />
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">Interest</p>
            <div className="flex items-center gap-1.5 justify-end">
              <span className="w-1.5 h-1.5 bg-peacock rounded-full animate-pulse" />
              <p className="font-mono text-xs text-peacock font-bold">{viewingNow} viewing</p>
            </div>
            {soldToday > 0 && (
              <p className="font-mono text-[10px] text-ink-muted">{soldToday} sold today</p>
            )}
          </div>
        </div>

        <div className="border-t border-ivory-200 pt-3">
          <p className="font-ui text-xs text-ink-muted leading-relaxed">
            <strong className="text-ink">Navratri events in {event.city} fill up weeks before the date.</strong>{" "}
            Ticket prices don&rsquo;t drop — lock in your spot now and plan your night stress-free.
          </p>
        </div>
      </div>
    );
  }

  // ── EARLY (0–12% sold) — the hard case ───────────────────────────────
  const totalSold = event.ticket_tiers.reduce((s, t) => s + t.quantity_sold, 0);
  const holderNum = totalSold + 1; // next buyer's position

  return (
    <div className="rounded-2xl border border-ivory-200 bg-white overflow-hidden">
      {/* Countdown header */}
      <div className="px-4 pt-4 pb-3 border-b border-ivory-200">
        <p className={`font-mono text-[10px] uppercase tracking-widest mb-2 ${days === 0 ? "text-durga font-bold" : "text-ink-muted"}`}>
          {days === 0 ? "Last chance — tonight!" : days > 60 ? "Lock in your spot early" : days > 30 ? "Getting close" : "Coming up fast"}
        </p>
        <EventCountdown dateStr={event.start_date} />
      </div>

      <div className="px-4 py-3 space-y-2.5">
        {/* Social proof line */}
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-peacock rounded-full animate-pulse shrink-0" />
          <p className="font-mono text-[10px] text-peacock font-bold">{viewingNow} people viewing this event right now</p>
        </div>

        {/* Social proof — only show the real count once it's high enough to
            persuade. Below the threshold a low number hurts conversion, so we
            lean on encouraging early-buyer framing with no number instead.
            Admins can hide this whole block per event (show_social_proof). */}
        {event.show_social_proof !== false && (
          totalSold >= SOCIAL_PROOF_MIN_SOLD ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-aubergine/5 border border-aubergine/10">
              <span className="text-base">🎟️</span>
              <p className="font-ui text-xs text-ink-muted">
                <strong className="text-ink">{totalSold} people</strong> have already secured their spot.
                {holderNum <= 100 && (
                  <> You&rsquo;d be ticket holder <strong className="text-aubergine">#{holderNum}</strong>.</>
                )}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-marigold/8 border border-marigold/20">
              <span className="text-base">🌟</span>
              <p className="font-ui text-xs text-ink-muted">
                <strong className="text-ink">{totalSold === 0 ? "Be the first to grab tickets." : "Get in early."}</strong>{" "}
                Early buyers always get the best seats and more time to plan their night.
              </p>
            </div>
          )
        )}

        {/* Historical FOMO — educational, never deceptive */}
        <p className="font-ui text-xs text-ink-muted leading-relaxed">
          {days === 0
            ? `It's today — last chance to grab tickets! Navratri events in ${event.city} sell out, and prices never drop.`
            : days === 1
              ? `Tomorrow! Navratri events in ${event.city} typically sell out before the date — prices don't drop.`
              : days <= 45
                ? `Only ${days} days away. Navratri events in ${event.city} typically sell out before the date — prices don't drop.`
                : `Tickets for ${CATEGORY_LABELS[event.category] ?? "Navratri"} events in ${event.city} regularly sell out weeks in advance. Early buyers never worry.`
          }
        </p>
      </div>
    </div>
  );
}

// ── Tier Availability Bar ─────────────────────────────────────────────────────

function fmtShortDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isTierNotStarted(tier: Tier): boolean {
  if (!tier.sale_start_date) return false;
  return new Date(tier.sale_start_date + "T00:00:00") > new Date();
}

// A tier is "expired" once its sale window closes — its sale_end_date at 23:59
// IN THE EVENT'S TIMEZONE, and never past the event's doors (so a tier can't be
// bought after the event has started even if its end date is later or unset).
function isTierExpired(tier: Tier, ev: TierTimeCtx): boolean {
  return tierSaleClosed({ start_date: ev.start_date, start_time: ev.start_time, state: ev.state }, tier.sale_end_date);
}

type TierTimeCtx = { start_date: string; start_time: string | null; state: string };

function daysUntilDate(d: string): number {
  return Math.ceil((new Date(d + "T00:00:00").getTime() - Date.now()) / 86400000);
}

function TierAvailabilityBar({ tier, ev, isSelected, onClick, isBestDeal, isMostPopular }: {
  tier: Tier;
  ev: TierTimeCtx;
  isSelected: boolean;
  onClick: () => void;
  isBestDeal: boolean;
  isMostPopular: boolean;
}) {
  const notStarted = isTierNotStarted(tier);
  const expired    = isTierExpired(tier, ev);
  // An admin-forced sold out outranks the sale window — a tier the organizer
  // closed reads "Sold out" even if its sale dates say it's open or upcoming.
  const forcedSoldOut = tier.sold_out;
  const locked     = !forcedSoldOut && (notStarted || expired);

  const rem  = tierRemaining(tier);
  const pct  = tier.quantity > 0 ? Math.round((tier.quantity_sold / tier.quantity) * 100) : 0;
  const soldOut    = forcedSoldOut || (!locked && rem <= 0);
  const almostGone = !soldOut && !locked && rem <= Math.ceil(tier.quantity * 0.15);
  const sellingFast = !almostGone && !soldOut && !locked && pct >= 50;

  // Sale end urgency — ending within 3 days
  const endingSoon = !locked && !soldOut && tier.sale_end_date && daysUntilDate(tier.sale_end_date) <= 3;

  const disabled = locked || soldOut;

  const barColor = expired ? "#6B5E6E"
    : almostGone ? "#C0392B"
    : sellingFast ? "#D4891B"
    : "#0E8C7A";

  // Primary status badge (only one shown — priority order). Note: the sold-out
  // state is handled by its own dedicated render branch above, so it never
  // reaches this badge logic.
  const badge = expired        ? { label: "Sale ended",     bg: "bg-ivory-200",   text: "text-ink-muted" }
    : notStarted               ? { label: "Not yet open",   bg: "bg-ivory-200",   text: "text-ink-muted" }
    : almostGone               ? { label: `${rem} left`,    bg: "bg-durga/10",    text: "text-durga font-bold" }
    : sellingFast              ? { label: "Selling fast",   bg: "bg-marigold/10", text: "text-marigold-dark font-bold" }
    : null;

  // Accent labels (can stack alongside badge)
  const accentLabels: { label: string; cls: string }[] = [];
  if (!disabled && isBestDeal)    accentLabels.push({ label: "Best deal",      cls: "bg-peacock/10 text-peacock font-bold" });
  if (!disabled && isMostPopular) accentLabels.push({ label: "Most popular",   cls: "bg-aubergine/10 text-aubergine font-bold" });

  // ── SOLD OUT ── a distinct, emotionally-loaded "you missed it" treatment.
  // Caution-tape diagonal wash + a rubber-stamp badge + struck-through name and
  // price make the lost opportunity land — on phone and desktop alike. Rendered
  // as a plain div (not a dimmed disabled button) so it reads bold, not faded.
  if (soldOut) {
    return (
      <div
        aria-disabled
        className="group/sold relative w-full overflow-hidden rounded-xl border-2 border-durga/30 bg-durga/[0.04] p-3.5 select-none"
      >
        {/* caution-tape diagonal wash — the "this is closed off" cue */}
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ background: "repeating-linear-gradient(135deg, rgba(124,31,44,0.07) 0px, rgba(124,31,44,0.07) 11px, transparent 11px, transparent 22px)" }}
        />
        {/* huge ghosted watermark — the gut-punch, clipped tastefully by the card */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-2 -bottom-3 font-display font-extrabold uppercase italic leading-none tracking-tighter text-durga/[0.07] text-5xl sm:text-6xl whitespace-nowrap"
        >
          Sold&nbsp;out
        </span>

        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-sm text-ink/55 truncate line-through decoration-durga/40 decoration-2">
              {tier.name}
            </p>
            {tier.description && (
              <p className="font-ui text-xs text-ink-muted/70 mt-0.5 leading-snug line-clamp-1">{tier.description}</p>
            )}
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-durga shrink-0" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-durga font-bold">
                Gone — claimed before you got here
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1.5">
            {/* rubber-stamp badge */}
            <span
              className="font-display font-extrabold text-[11px] uppercase tracking-[0.16em] text-durga border-[2.5px] border-durga/45 rounded-md px-2.5 py-1 -rotate-6 transition-transform group-hover/sold:-rotate-3"
              style={{ boxShadow: "inset 0 0 0 1px rgba(124,31,44,0.12)" }}
            >
              Sold Out
            </span>
            {tier.price > 0 && (
              <span className="font-display font-bold text-sm text-ink/35 line-through decoration-durga/40">
                ${money(tier.price)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
        disabled   ? "opacity-60 cursor-not-allowed border-ivory-200 bg-ivory"
        : isSelected ? "border-aubergine bg-aubergine/5"
        : "border-ivory-200 hover:border-aubergine/40 bg-white"
      }`}
    >
      {/* Top row: name + badges + price */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className={`font-display font-bold text-sm ${isSelected && !disabled ? "text-aubergine" : "text-ink"}`}>{tier.name}</p>
            {badge && (
              <span className={`font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            )}
            {accentLabels.map(a => (
              <span key={a.label} className={`font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ${a.cls}`}>
                {a.label}
              </span>
            ))}
          </div>
          {tier.description && (
            <p className="font-ui text-xs text-ink-muted mt-0.5 leading-snug">{tier.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={`font-display font-bold text-base ${isSelected && !disabled ? "text-aubergine" : "text-ink"}`}>
            {tier.price === 0 ? "Complimentary" : `$${money(tier.price)}`}
          </p>
        </div>
      </div>

      {/* Date context row */}
      <div className="flex items-center gap-3 mb-2">
        {notStarted && tier.sale_start_date && (
          <p className="font-mono text-[10px] text-ink-muted flex items-center gap-1">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Opens {fmtShortDate(tier.sale_start_date)}
          </p>
        )}
        {expired && tier.sale_end_date && (
          <p className="font-mono text-[10px] text-ink-muted">
            Ended {fmtShortDate(tier.sale_end_date)}
          </p>
        )}
        {!locked && tier.sale_end_date && (
          <p className={`font-mono text-[10px] flex items-center gap-1 ${endingSoon ? "text-durga font-bold" : "text-ink-muted"}`}>
            {endingSoon && <span className="w-1.5 h-1.5 bg-durga rounded-full animate-pulse shrink-0" />}
            {endingSoon
              ? daysUntilDate(tier.sale_end_date) === 0
                ? "Ends today!"
                : daysUntilDate(tier.sale_end_date) === 1
                  ? "Ends tomorrow!"
                  : `Ends in ${daysUntilDate(tier.sale_end_date)} days`
              : `Sale ends ${fmtShortDate(tier.sale_end_date)}`}
          </p>
        )}
      </div>

      {/* Fill bar */}
      {!notStarted && tier.quantity > 0 && (
        <div className="h-1 bg-ivory-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${expired ? 100 : pct}%`, backgroundColor: barColor }}
          />
        </div>
      )}
    </button>
  );
}

// ── Avatar circle ─────────────────────────────────────────────────────────────
function ArtistAvatar({ artist, size = 14 }: { artist: Artist; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xl shrink-0`;
  const initials = artist.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={cls} style={{ backgroundColor: "#2E1B30" }}>
      {artist.profile_image_url
        ? <img src={artist.profile_image_url} alt={artist.name} className="w-full h-full object-cover" />
        : initials}
    </div>
  );
}

// ── Artist card ───────────────────────────────────────────────────────────────
// Links to the artist's profile page (works on upcoming AND past events).
function ArtistCard({ artist }: { artist: Artist }) {
  const body = (
    <>
      <ArtistAvatar artist={artist} size={14} />
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-0.5">Performing Artist</p>
        <p className="font-display font-bold text-ink text-base sm:text-lg group-hover:text-aubergine transition-colors">{artist.name}</p>
        {artist.tagline && <p className="font-ui text-ink-muted text-sm truncate">{artist.tagline}</p>}
      </div>
      {artist.slug && (
        <span className="hidden sm:flex items-center gap-1 text-xs font-semibold text-marigold-dark group-hover:text-marigold transition-colors shrink-0">
          View profile
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </span>
      )}
    </>
  );
  const cls = "flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-ivory-200";
  return artist.slug
    ? <Link href={`/artists/${artist.slug}`} className={`${cls} group hover:border-aubergine/30 hover:shadow-sm transition-all`}>{body}</Link>
    : <div className={`${cls} group`}>{body}</div>;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EventDetailClient({ id }: { id: string }) {
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [combos, setCombos] = useState<ComboTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [qty, setQty] = useState(2);

  // Navigate-away popup
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);

  // Share panel
  const [showShare, setShowShare] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  function copyEventLink() {
    const url = `https://rameelo.com/events/${id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  // Existing group orders (logged-in host — could have started multiple)
  const [existingGroups, setExistingGroups] = useState<{ id: string; name?: string; joined: number; target: number }[]>([]);

  // Invite group — arrived via /events/[id]?groupId=RM-XXXXX
  const [inviteGroup, setInviteGroup] = useState<{ id: string; hostName: string; joined: number; discount: number } | null>(null);

  // Mobile sticky "Buy Tickets" bar: hidden once the buy panel is reached (or
  // scrolled past) so there's never a duplicate action on screen.
  const buyPanelRef = useRef<HTMLDivElement>(null);
  const [buyPanelReached, setBuyPanelReached] = useState(false);
  useEffect(() => {
    const el = buyPanelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setBuyPanelReached(entry.isIntersecting || entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [event]);
  function scrollToBuyPanel() {
    buyPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Interest form (for non-Rameelo events)
  const [interestName, setInterestName]           = useState("");
  const [interestEmail, setInterestEmail]         = useState("");
  const [interestPhone, setInterestPhone]         = useState("");
  const [interestQty, setInterestQty]             = useState(2);
  const [interestCity, setInterestCity]           = useState("");
  const [interestSubmitting, setInterestSubmitting] = useState(false);
  const [interestSubmitted, setInterestSubmitted] = useState(false);
  const [interestError, setInterestError]         = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const supabase = createClient();

    // `initial` controls first-load behavior (spinner, default tier, org fetch);
    // silent reloads just refresh live inventory (quantity/sold) without disrupting
    // the buyer's current tier selection.
    async function loadEvent(initial: boolean) {
      const { data, error } = await supabase
        .from("events")
        .select(`
          id, title, category, description, navratri_nights, org_id,
          start_date, end_date, start_time, end_time, doors_open_time,
          venue_name, address_line1, city, state, zip, metro_city,
          parking, parking_notes, website_url,
          cover_image_url, cover_gradient,
          dress_code, dress_code_details, dandiya_sticks, age_restriction, capacity, selling_on_rameelo, kids_5_under_free, kids_free_age, show_social_proof,
          artist:artists!events_artist_id_fkey (
            id, name, slug, tagline, bio, profile_image_url, genres, years_active_since, follower_count, performance_style
          ),
          ticket_tiers (
            id, name, description, price, quantity, quantity_sold, sold_out,
            sale_start_date, sale_end_date, is_visible, sort_order,
            group_discount_mode, group_discount_min_qty, group_discount_type, group_discount_value, group_discount_tiers
          )
        `)
        .eq("id", id)
        .eq("status", "published")
        .single();

      if (cancelled) return;
      if (error || !data) { if (initial) { setNotFound(true); setLoading(false); } return; }
      const ev = data as unknown as Event;
      ev.ticket_tiers = ev.ticket_tiers
        .filter(t => t.is_visible)
        .sort((a, b) => a.sort_order - b.sort_order || a.price - b.price);
      // Keep any already-loaded org so a silent refresh doesn't blank it.
      setEvent(prev => (prev ? { ...ev, organization: prev.organization ?? ev.organization } : ev));

      if (initial) {
        const firstSelectable = ev.ticket_tiers.find(t =>
          !isTierNotStarted(t) && !isTierExpired(t, ev) && tierRemaining(t) > 0
        );
        if (firstSelectable) setSelectedTierId(firstSelectable.id);
        setLoading(false);
        // Public org details (RLS hides organizations from anon, so use the RPC).
        if (ev.org_id) {
          supabase.rpc("get_public_organization", { p_id: ev.org_id }).then(({ data: orgRows }) => {
            const org = Array.isArray(orgRows) ? orgRows[0] : orgRows;
            if (org && !cancelled) setEvent(prev => prev ? { ...prev, organization: org as Organization } : prev);
          });
        }
        // Combo tickets that include this event (org-spanning bundles).
        supabase.rpc("get_event_combo_tickets", { p_event_id: id }).then(({ data: comboRows }) => {
          if (!cancelled) setCombos((comboRows ?? []) as ComboTicket[]);
        });
      }
    }

    loadEvent(true);
    // Refresh live inventory when the buyer returns to this tab (e.g. after an
    // admin edits the tier in another tab) — so the available count is never stale.
    const onVisible = () => { if (document.visibilityState === "visible") loadEvent(false); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [id]);

  // Detect group invite via ?groupId= param
  useEffect(() => {
    const gid = new URLSearchParams(window.location.search).get("groupId");
    if (!gid) return;
    const supabase = createClient();
    supabase
      .from("group_orders")
      .select("id, organizer_name, discount_pct, status")
      .eq("id", gid)
      .eq("status", "open")
      .single()
      .then(async ({ data }) => {
        if (!data) return;
        const { count } = await supabase
          .from("group_order_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", gid);
        setInviteGroup({ id: gid, hostName: data.organizer_name, joined: count ?? 0, discount: data.discount_pct });
      });
  }, []);

  // Check all open group orders this logged-in user has started for this event
  useEffect(() => {
    if (!event || isEventPast(event)) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: rows } = await supabase
        .from("group_orders")
        .select("id, name, target_size")
        .eq("organizer_user_id", user.id)
        .eq("event_id", event.id)
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (!rows?.length) return;
      const groups = await Promise.all(rows.map(async g => {
        const { count } = await supabase
          .from("group_order_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", g.id);
        const row = g as unknown as { id: string; name: string | null; target_size: number };
        return { id: row.id, name: row.name ?? undefined, joined: count ?? 0, target: row.target_size };
      }));
      setExistingGroups(groups);
    });
  }, [event]);

  // Browser-level navigate-away warning — only while there's a purchase to lose
  useEffect(() => {
    if (!event || isEventPast(event)) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [event]);

  function handleNavAway(href: string) {
    setPendingNav(href);
    setShowLeaveModal(true);
  }

  function confirmLeave() {
    setShowLeaveModal(false);
    if (pendingNav) router.push(pendingNav);
  }

  async function handleInterestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    setInterestSubmitting(true);
    setInterestError("");
    const supabase = createClient();
    // Generate the id client-side so we can notify admins without a SELECT policy
    // (RLS only lets admins/organizers read this table, so RETURNING is blocked).
    const interestId = crypto.randomUUID();
    const { error } = await supabase.from("event_interests").insert({
      id: interestId,
      event_id: event.id,
      name: interestName.trim(),
      email: interestEmail.trim(),
      phone: interestPhone.trim() || null,
      qty_interested: interestQty,
      city: interestCity.trim() || null,
    });
    if (error) { setInterestError("Something went wrong. Please try again."); setInterestSubmitting(false); return; }
    setInterestSubmitted(true);
    setInterestSubmitting(false);
    // Alert platform admins about the new interest (traction signal). Best-effort.
    fetch("/api/event-interest-notify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interestId }),
    }).catch(() => {});
  }

  const selectedTier = event?.ticket_tiers.find(t => t.id === selectedTierId) ?? null;
  const remaining = selectedTier ? tierRemaining(selectedTier) : 0;
  const soldOut = selectedTier ? remaining <= 0 : false;

  const unitPrice = selectedTier?.price ?? 0;
  const subtotal = unitPrice * qty;              // face value (pre-discount)
  const discountAmount = getTierDiscountAmount(selectedTier, qty, subtotal);
  const discountPct = getTierDiscount(selectedTier, qty);
  const afterDiscount = subtotal - discountAmount;
  // 3% Rameelo fee on FACE value; 5% card processing on the discounted subtotal.
  const { rameeloFee, processingFee, grandTotal } = computeFees(subtotal, afterDiscount, "card");
  const serviceFee   = rameeloFee + processingFee; // kept for backward compat
  const nextScalingTier = selectedTier?.group_discount_mode === 'scaling' ? getNextScalingTier(selectedTier, qty) : null;

  const maxQty = Math.min(20, selectedTier ? Math.max(0, remaining) : 0);

  // ── Urgency signals ───────────────────────────────────────────────────────
  const urgencyState = event ? getUrgencyState(event.ticket_tiers) : "early";

  // Stable-per-day demand signals (seeded, plausible, not fabricated inventory)
  const viewingNow = event ? stableRandom(event.id, "viewing", 14, 67) : 0;
  const soldToday  = event ? stableRandom(event.id, "sold", 3, 22) : 0;

  // For tier cascade warning: lowest tier + next tier's price
  const lowestTier = event?.ticket_tiers.find(t => tierRemaining(t) > 0) ?? null;
  const tiersSortedByPrice = event ? [...event.ticket_tiers].sort((a, b) => a.price - b.price) : [];
  const lowestAvailIdx = tiersSortedByPrice.findIndex(t => tierRemaining(t) > 0);
  const nextCheapestPrice = lowestAvailIdx >= 0 && lowestAvailIdx < tiersSortedByPrice.length - 1
    ? tiersSortedByPrice[lowestAvailIdx + 1].price
    : null;

  const handleContinue = useCallback(() => {
    if (!event || !selectedTier) return;
    if (salesClosedForEvent(event)) return; // doors have opened — sales closed
    const payload = {
      eventId: event.id,
      tierId: selectedTier.id,
      tierName: selectedTier.name,
      eventTitle: event.title,
      eventDate: fmtDate(event.start_date),
      eventStartDate: event.start_date,
      eventVenue: event.venue_name,
      eventCity: event.city,
      eventState: event.state,
      eventMetro: event.metro_city,
      category: event.category,
      artistName: event.artist?.name ?? null,
      organizer: event.organization?.name ?? null,
      qty,
      unitPrice,
      discount: discountPct,
      discountAmount,
      subtotalAfterDiscount: afterDiscount,
      rameeloFee,
      serviceFee,
      grandTotal,
    };
    localStorage.setItem("rameelo_checkout", JSON.stringify(payload));
    router.push("/checkout");
  }, [event, selectedTier, qty, unitPrice, discountPct, discountAmount, serviceFee, grandTotal, router]);

  // Combo tickets have a single flat price (no group discounts) and route straight
  // to checkout with a combo payload. event_id anchors the order to this event.
  const handleComboCheckout = useCallback((combo: ComboTicket, comboQty: number) => {
    if (!event) return;
    const subtotal = combo.price * comboQty;
    const { rameeloFee, processingFee, grandTotal: comboGrand } = computeFees(subtotal, subtotal, "card");
    const payload = {
      eventId: event.id,
      tierId: "",
      tierName: combo.name,
      comboTicketId: combo.id,
      isCombo: true,
      eventTitle: event.title,
      eventDate: fmtDate(event.start_date),
      eventStartDate: event.start_date,
      eventVenue: event.venue_name,
      eventCity: event.city,
      eventState: event.state,
      eventMetro: event.metro_city,
      category: event.category,
      artistName: event.artist?.name ?? null,
      organizer: event.organization?.name ?? null,
      qty: comboQty,
      unitPrice: combo.price,
      discount: 0,
      discountAmount: 0,
      subtotalAfterDiscount: subtotal,
      rameeloFee,
      serviceFee: rameeloFee + processingFee,
      grandTotal: comboGrand,
    };
    localStorage.setItem("rameelo_checkout", JSON.stringify(payload));
    router.push("/checkout");
  }, [event, router]);

  const gradient = event ? (GRADIENTS.find(g => g.id === event.cover_gradient) ?? GRADIENTS[0]) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="w-10 h-10 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="text-center">
          <p className="font-display text-2xl font-bold text-ink mb-2">Event not found</p>
          <Link href="/events" className="text-marigold font-semibold hover:underline">← Back to events</Link>
        </div>
      </div>
    );
  }

  // ── INTEREST MODE ── event not selling tickets on Rameelo (and not past):
  // a "Tickets Coming Soon" interest page with a notify-me form.
  if (!event.selling_on_rameelo && !isEventPast(event)) {
    return <EventInterestView event={event} />;
  }

  const totalSoldOut = event.ticket_tiers.length > 0 && event.ticket_tiers.every(tierIsSoldOut);
  // Sales close once doors open in the event's local timezone.
  const salesClosed = salesClosedForEvent(event);
  // Active, in-window combo tickets that include this event.
  const buyableCombos = combos.filter(comboBuyable);

  // ── PAST EVENT ── rich, indexable recap — keeps artist/org/details for SEO &
  // context, but drops every CTA, form, and urgency mechanic. ───────────────────
  if (isEventPast(event)) {
    const endedDate = fmtDate(event.end_date ?? event.start_date);
    const whenValue = event.end_date && event.end_date !== event.start_date
      ? `${fmtDate(event.start_date)} – ${fmtDate(event.end_date)}`
      : `${fmtDate(event.start_date)}${fmtTime(event.start_time) ? ` · ${fmtTime(event.start_time)}` : ""}`;
    const recap: { label: string; value: string }[] = [
      { label: "When", value: whenValue },
      { label: "Where", value: [event.venue_name, event.city, event.state].filter(Boolean).join(", ") },
      ...(event.artist ? [{ label: "Lineup", value: event.artist.name }] : []),
      ...(event.organization ? [{ label: "Presented by", value: event.organization.name }] : []),
    ];

    return (
      <div className="min-h-screen" style={{ backgroundColor: "#FCF9F2" }}>
        {/* Hero — full-color, no live/urgency badges */}
        <div
          className="relative overflow-hidden"
          style={{
            height: "clamp(200px, 28vw, 340px)",
            background: event.cover_image_url ? undefined : gradient?.css,
            backgroundColor: event.cover_image_url ? undefined : "#2E1B30",
          }}
        >
          {event.cover_image_url && (
            <img src={event.cover_image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)" }} />

          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-5">
            <div className="flex items-center gap-2 text-white/60 text-xs font-mono">
              <Link href="/events" className="hover:text-white transition-colors">Events</Link>
              <span>/</span>
              <span className="text-white/80 truncate max-w-xs">{event.title}</span>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-6 pt-10">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/15 text-white backdrop-blur-sm">
                  {CATEGORY_LABELS[event.category] ?? event.category}
                </span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-black/40 text-white/90 backdrop-blur-sm">
                  Event Ended
                </span>
              </div>
              <MetroSticker metro={event.metro_city} category={event.category} />
              <EventPresenter org={event.organization} />
              <h1 className="font-display text-xl sm:text-3xl md:text-4xl font-bold text-white leading-tight mb-2">
                {event.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-white/70 text-xs sm:text-sm font-ui">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {fmtDate(event.start_date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {event.venue_name}, {event.city}, {event.state}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
          {/* Ended notice */}
          <div className="rounded-2xl bg-white border border-ivory-200 p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-ivory flex items-center justify-center shrink-0 text-ink-muted">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.015em" }}>This event has ended</p>
              <p className="font-ui text-sm text-ink-muted mt-0.5">
                {event.title} took place on {endedDate}. Tickets and registration are closed.
              </p>
            </div>
          </div>

          {/* Artist — clickable to profile (kept for context & indexing) */}
          {event.artist && <ArtistCard artist={event.artist} />}

          {/* Presented by — clickable to the organization's page when it has a slug */}
          {event.organization && (() => {
            const org = event.organization;
            const inner = (
              <>
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-aubergine/10 text-aubergine font-bold text-lg">
                  {org.logo_url
                    ? <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                    : org.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-0.5">Presented by</p>
                  <p className="font-display font-bold text-ink text-base">{org.name}</p>
                  {(org.city || org.state) && (
                    <p className="font-ui text-ink-muted text-xs">
                      {[org.city, org.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                {org.slug && (
                  <svg className="w-4 h-4 text-ink-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                )}
              </>
            );
            return org.slug ? (
              <Link href={`/org/${org.slug}`} className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-ivory-200 hover:border-aubergine/30 hover:shadow-sm transition-all">
                {inner}
              </Link>
            ) : (
              <div className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-ivory-200">{inner}</div>
            );
          })()}

          {/* Description */}
          {event.description && (
            <div className="rounded-2xl bg-white border border-ivory-200 p-4 sm:p-6">
              <h2 className="font-display font-bold text-ink text-lg mb-3">About this event</h2>
              <p className="font-ui text-ink-muted leading-relaxed text-sm sm:text-base">{event.description}</p>
            </div>
          )}

          {/* Recap facts */}
          <div className="rounded-2xl bg-white border border-ivory-200 divide-y divide-ivory-200">
            {recap.map(r => (
              <div key={r.label} className="flex items-start gap-4 px-5 py-3.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted shrink-0 w-28 pt-0.5">{r.label}</span>
                <span className="font-ui text-sm text-ink">{r.value}</span>
              </div>
            ))}
          </div>

          {/* Venue (text + maps link — no heavy embed) */}
          <div className="rounded-2xl bg-white border border-ivory-200 p-4 sm:p-6">
            <h2 className="font-display font-bold text-ink text-lg mb-3">Venue</h2>
            <p className="font-ui font-semibold text-ink">{event.venue_name}</p>
            <p className="font-ui text-ink-muted text-sm">{event.address_line1}{event.city ? `, ${event.city}` : ""}, {event.state}{event.zip ? ` ${event.zip}` : ""}</p>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(`${event.venue_name} ${event.address_line1} ${event.city} ${event.state}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-marigold-dark hover:text-marigold transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
              Open in Google Maps →
            </a>
          </div>

          {/* Browse upcoming — navigation, not a sales CTA */}
          <div className="text-center pt-1">
            <Link href="/events" className="inline-flex items-center gap-1.5 font-ui font-semibold text-sm text-marigold-dark hover:text-marigold transition-colors">
              Explore upcoming events
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>

        {/* More from this organizer (only other upcoming org events) */}
        <MoreFromOrganizer orgId={event.org_id} currentEventId={event.id} orgName={event.organization?.name} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F2" }}>
      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden"
        style={{
          height: "clamp(220px, 30vw, 380px)",
          background: event.cover_image_url ? undefined : gradient?.css,
          backgroundColor: event.cover_image_url ? undefined : "#2E1B30",
        }}
      >
        {event.cover_image_url && (
          <img src={event.cover_image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)" }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/60 text-xs font-mono">
              <button onClick={() => handleNavAway("/events")} className="hover:text-white transition-colors">Events</button>
              <span>/</span>
              <span className="text-white/80 truncate max-w-xs">{event.title}</span>
            </div>
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/80 hover:bg-white/25 hover:text-white transition-all font-ui text-xs font-semibold"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6 pt-10">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/15 text-white backdrop-blur-sm">
                {CATEGORY_LABELS[event.category] ?? event.category}
              </span>
              {event.navratri_nights && event.navratri_nights.length > 1 && (
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/10 text-white/80 backdrop-blur-sm">
                  {event.navratri_nights.length}-Night Event
                </span>
              )}
              {event.selling_on_rameelo && totalSoldOut && (
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">
                  Sold Out
                </span>
              )}
              {event.selling_on_rameelo && !totalSoldOut && urgencyState === "critical" && (
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full text-white animate-pulse backdrop-blur-sm" style={{ backgroundColor: "rgba(192,57,43,0.6)" }}>
                  ⚡ Almost Gone
                </span>
              )}
              {!event.selling_on_rameelo && (
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-marigold/70 text-aubergine backdrop-blur-sm">
                  Tickets Coming Soon
                </span>
              )}
            </div>

            {/* Major-metro destination sticker — the standout regional cue */}
            <MetroSticker metro={event.metro_city} category={event.category} />

            {/* Organizer top billing — "{Org} presents" leading into the title */}
            <EventPresenter org={event.organization} />

            <h1 className="font-display text-xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
              {event.title}
            </h1>
          </div>
        </div>
      </div>

      {/* ── Group invite banner ── */}
      {inviteGroup && (
        <div className="bg-aubergine border-b border-aubergine-light">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-marigold/20 border border-marigold/30 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-marigold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-ui text-sm text-white leading-snug">
                <strong className="text-marigold">{inviteGroup.hostName}</strong> invited you to their group
                {inviteGroup.discount > 0 && <span className="text-white/70"> · {inviteGroup.discount}% group discount</span>}
                <span className="text-white/50 ml-1">· {inviteGroup.joined} {inviteGroup.joined === 1 ? "person" : "people"} in so far</span>
              </p>
            </div>
            <Link
              href={`/group/${inviteGroup.id}`}
              className="shrink-0 flex items-center gap-1.5 bg-marigold text-aubergine font-display font-bold text-xs px-4 py-2 rounded-xl hover:bg-marigold-dark active:scale-95 transition-all whitespace-nowrap"
            >
              Join group →
            </Link>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Combo ticket promo banner — clicks scroll to the combo card */}
        {buyableCombos.length > 0 && (
          <ComboBanner
            combo={buyableCombos[0]}
            onGet={() => document.getElementById("combo-tickets")?.scrollIntoView({ behavior: "smooth", block: "center" })}
          />
        )}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">

          {/* ── Left: Event details ── */}
          <div className="w-full lg:flex-1 min-w-0 space-y-5">

            {/* When & where — prominent date / start time / venue right up top */}
            <EventWhenWhere
              startDate={event.start_date}
              startTime={event.start_time}
              endDate={event.end_date}
              isMultiDay={!!event.end_date && event.end_date !== event.start_date}
              venueName={event.venue_name}
              addressLine1={event.address_line1}
              city={event.city}
              state={event.state}
              zip={event.zip}
            />

            {/* Mobile urgency / interest — shown above everything on mobile */}
            <div className="lg:hidden">
              {event.selling_on_rameelo ? (
                <UrgencyBanner
                  event={event}
                  urgencyState={urgencyState}
                  viewingNow={viewingNow}
                  soldToday={soldToday}
                  lowestTier={lowestTier}
                  nextCheapestPrice={nextCheapestPrice}
                />
              ) : (
                <div className="rounded-2xl border border-marigold/30 bg-marigold/5 p-4 flex items-start gap-3">
                  <span className="w-1.5 h-1.5 mt-1.5 bg-marigold rounded-full animate-pulse shrink-0" />
                  <p className="font-ui text-sm text-ink-muted leading-relaxed">
                    <strong className="text-ink">{viewingNow} people</strong> are viewing this event — drop your info below to be first when tickets go live.
                  </p>
                </div>
              )}
            </div>

            {/* Artist card */}
            {event.artist && <ArtistCard artist={event.artist} />}

            {/* Presenting Organization */}
            {event.organization && (
              <div className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-ivory-200">
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-aubergine/10 text-aubergine font-bold text-lg">
                  {event.organization.logo_url
                    ? <img src={event.organization.logo_url} alt={event.organization.name} className="w-full h-full object-cover" />
                    : event.organization.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-0.5">Presented by</p>
                  <p className="font-display font-bold text-ink text-base">{event.organization.name}</p>
                  {(event.organization.city || event.organization.state) && (
                    <p className="font-ui text-ink-muted text-xs">
                      {[event.organization.city, event.organization.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {event.organization.instagram && (
                    <a href={`https://instagram.com/${event.organization.instagram}`} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-ivory flex items-center justify-center text-ink-muted hover:text-aubergine hover:bg-aubergine/10 transition-all">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    </a>
                  )}
                  {event.organization.website && (
                    <a href={event.organization.website} target="_blank" rel="noopener noreferrer"
                      className="hidden sm:flex w-8 h-8 rounded-full bg-ivory items-center justify-center text-ink-muted hover:text-aubergine hover:bg-aubergine/10 transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="rounded-2xl bg-white border border-ivory-200 p-4 sm:p-6">
                <h2 className="font-display font-bold text-ink text-lg mb-3">About this event</h2>
                <p className="font-ui text-ink-muted leading-relaxed text-sm sm:text-base">{event.description}</p>
              </div>
            )}

            {/* Event details grid */}
            <div className="rounded-2xl bg-white border border-ivory-200 p-4 sm:p-6">
              <h2 className="font-display font-bold text-ink text-lg mb-4">Event Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                    label: "Schedule",
                    value: [
                      event.doors_open_time ? `Doors: ${fmtTime(event.doors_open_time)}` : null,
                      fmtTime(event.start_time) ? `Start: ${fmtTime(event.start_time)}` : null,
                      event.end_time ? `End: ${fmtTime(event.end_time)}` : null,
                    ].filter(Boolean).join(" · ") || "TBA",
                  },
                  {
                    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
                    label: "Age Restriction",
                    value: event.age_restriction === "all" ? "All ages welcome" : `${event.age_restriction} and over`,
                  },
                  {
                    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
                    label: "Dress Code",
                    value: DRESS_LABELS[event.dress_code] ?? event.dress_code,
                  },
                  {
                    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>,
                    label: "Dandiya Sticks",
                    value: DANDIYA_LABELS[event.dandiya_sticks] ?? event.dandiya_sticks,
                  },
                  {
                    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /><rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>,
                    label: "Parking",
                    value: PARKING_LABELS[event.parking] ?? event.parking,
                  },
                  ...(event.capacity ? [{
                    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                    label: "Venue Capacity",
                    value: `${event.capacity.toLocaleString()} attendees`,
                  }] : []),
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-ivory flex items-center justify-center text-ink-muted shrink-0 mt-0.5">{item.icon}</div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-0.5">{item.label}</p>
                      <p className="font-ui text-sm text-ink">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {event.kids_5_under_free && (
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-peacock/8 border border-peacock/25 px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-peacock/15 flex items-center justify-center text-peacock shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7a2 2 0 100-4 2 2 0 000 4zm0 0v4m0 0l-3 3m3-3l3 3m-6 4h6" /></svg>
                  </div>
                  <div>
                    <p className="font-display font-bold text-ink text-sm leading-tight">Children {event.kids_free_age} &amp; under get in <span className="text-peacock">FREE</span></p>
                    <p className="font-ui text-xs text-ink-muted mt-0.5">No ticket needed for little ones aged {event.kids_free_age} and under.</p>
                  </div>
                </div>
              )}
              {event.dress_code_details && (
                <p className="mt-4 pt-4 border-t border-ivory-200 font-ui text-xs text-ink-muted">{event.dress_code_details}</p>
              )}
              {event.parking_notes && (
                <p className="mt-2 font-ui text-xs text-ink-muted">{event.parking_notes}</p>
              )}
            </div>

            {/* Venue */}
            <div className="rounded-2xl bg-white border border-ivory-200 p-4 sm:p-6">
              <h2 className="font-display font-bold text-ink text-lg mb-3">Venue</h2>
              <p className="font-ui font-semibold text-ink">{event.venue_name}</p>
              <p className="font-ui text-ink-muted text-sm">{event.address_line1}{event.city ? `, ${event.city}` : ""}, {event.state}{event.zip ? ` ${event.zip}` : ""}</p>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(`${event.venue_name} ${event.address_line1} ${event.city} ${event.state}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-marigold-dark hover:text-marigold transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                Open in Google Maps →
              </a>
              <iframe
                className="mt-4 w-full rounded-xl border border-ivory-200"
                style={{ height: 200 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                  [event.venue_name, event.address_line1, event.city, event.state, event.zip]
                    .filter(Boolean).join(", ")
                )}&output=embed&z=15`}
              />
            </div>
          </div>

          {/* ── Right: Purchase widget or Interest form ── */}
          <div ref={buyPanelRef} className="w-full lg:w-96 shrink-0">
            <div className="lg:sticky lg:top-5 space-y-4">

              {/* Combo tickets (org-spanning bundles) — shown above the regular tickets */}
              {buyableCombos.length > 0 && (
                <div id="combo-tickets" className="space-y-3 scroll-mt-5">
                  {buyableCombos.map(combo => (
                    <ComboTicketCard key={combo.id} combo={combo} currentEventId={event.id} onBuy={handleComboCheckout} />
                  ))}
                </div>
              )}

              {/* Urgency / Interest banner — desktop only */}
              <div className="hidden lg:block">
                {event.selling_on_rameelo ? (
                  <UrgencyBanner
                    event={event}
                    urgencyState={urgencyState}
                    viewingNow={viewingNow}
                    soldToday={soldToday}
                    lowestTier={lowestTier}
                    nextCheapestPrice={nextCheapestPrice}
                  />
                ) : (
                  <div className="rounded-2xl border border-marigold/30 bg-marigold/5 p-4 flex items-start gap-3">
                    <span className="w-1.5 h-1.5 mt-1.5 bg-marigold rounded-full animate-pulse shrink-0" />
                    <p className="font-ui text-sm text-ink-muted leading-relaxed">
                      <strong className="text-ink">{viewingNow} people</strong> are viewing this event right now — and the organizer will see every inquiry we collect.
                    </p>
                  </div>
                )}
              </div>

              {/* Interest form (when not selling on Rameelo) */}
              {!event.selling_on_rameelo ? (
                <div className="rounded-2xl bg-white border border-ivory-200 overflow-hidden shadow-sm">
                  <div className="px-5 pt-5 pb-4 border-b border-ivory-200" style={{ background: "linear-gradient(135deg, rgba(46,27,48,0.04) 0%, rgba(245,166,35,0.06) 100%)" }}>
                    <span className="inline-block font-mono text-[9px] uppercase tracking-widest bg-marigold/20 text-marigold-dark px-2.5 py-1 rounded-full font-bold mb-3">
                      Tickets Coming to Rameelo
                    </span>
                    <p className="font-display font-bold text-ink text-lg leading-tight" style={{ letterSpacing: "-0.02em" }}>
                      Be first in line when tickets drop
                    </p>
                    <p className="font-ui text-sm text-ink-muted mt-2 leading-relaxed">
                      This organizer hasn&apos;t set up ticketing here yet — but your crew is already showing up. Drop your info and we&apos;ll reach out the moment tickets go live on Rameelo.
                    </p>
                  </div>

                  {!interestSubmitted ? (
                    <form onSubmit={handleInterestSubmit} className="p-5 space-y-3">
                      <div>
                        <label className="block font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5">Your Name *</label>
                        <input
                          required value={interestName} onChange={e => setInterestName(e.target.value)}
                          placeholder="Priya Patel"
                          className="w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5">Email *</label>
                        <input
                          required type="email" value={interestEmail} onChange={e => setInterestEmail(e.target.value)}
                          placeholder="priya@example.com"
                          className="w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5">Phone</label>
                          <input
                            type="tel" value={interestPhone} onChange={e => setInterestPhone(e.target.value)}
                            placeholder="(555) 000-0000"
                            className="w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5">Your City</label>
                          <input
                            value={interestCity} onChange={e => setInterestCity(e.target.value)}
                            placeholder="Edison, NJ"
                            className="w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5">How many tickets?</label>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setInterestQty(Math.max(1, interestQty - 1))}
                            className="w-10 h-10 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-lg hover:border-aubergine hover:text-aubergine transition-all">−</button>
                          <span className="font-display font-bold text-2xl text-ink w-10 text-center">{interestQty}</span>
                          <button type="button" onClick={() => setInterestQty(Math.min(20, interestQty + 1))}
                            className="w-10 h-10 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-lg hover:border-aubergine hover:text-aubergine transition-all">+</button>
                        </div>
                      </div>
                      {interestError && <p className="font-ui text-xs text-durga">{interestError}</p>}
                      <button
                        type="submit" disabled={interestSubmitting}
                        className="w-full py-4 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark transition-all active:scale-[0.98] shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {interestSubmitting
                          ? <><div className="w-4 h-4 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />Sending…</>
                          : "Claim My Spot →"}
                      </button>
                      <p className="text-center font-mono text-[10px] text-ink-muted">
                        No payment needed · We&apos;ll notify you when tickets go live
                      </p>
                    </form>
                  ) : (
                    <div className="p-6 text-center space-y-4">
                      <div className="w-14 h-14 rounded-full bg-peacock/10 flex items-center justify-center mx-auto">
                        <svg className="w-7 h-7 text-peacock" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-display font-bold text-ink text-xl mb-1" style={{ letterSpacing: "-0.02em" }}>You&apos;re on the list!</p>
                        <p className="font-ui text-sm text-ink-muted leading-relaxed">
                          We&apos;ll reach out the moment tickets go live. The organizer will see that their community is ready — that&apos;s real leverage.
                        </p>
                      </div>
                      <div className="rounded-xl bg-ivory border border-ivory-200 px-4 py-3">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-0.5">What happens next</p>
                        <p className="font-ui text-xs text-ink-muted">We&apos;ll contact the organizer on your behalf, share demand numbers, and notify you first when tickets drop.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
              /* Ticket purchase widget */
              <div className="rounded-2xl bg-white border border-ivory-200 overflow-hidden shadow-sm">

                {/* Tier selector */}
                <div className="p-4 sm:p-5 border-b border-ivory-200 space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Select Tickets</p>
                  {event.ticket_tiers.length === 0 ? (
                    <p className="font-ui text-sm text-ink-muted py-2">No tickets available yet.</p>
                  ) : (() => {
                    // Compute cross-tier signals once
                    const evCtx = { start_date: event.start_date, start_time: event.start_time, state: event.state };
                    const available = event.ticket_tiers.filter(t =>
                      !isTierNotStarted(t) && !isTierExpired(t, evCtx) && tierRemaining(t) > 0
                    );
                    const minPrice = available.length ? Math.min(...available.map(t => t.price)) : null;
                    const maxSold  = available.length ? Math.max(...available.map(t => t.quantity_sold)) : null;
                    return event.ticket_tiers.map(tier => (
                      <TierAvailabilityBar
                        key={tier.id}
                        tier={tier}
                        ev={evCtx}
                        isSelected={selectedTierId === tier.id}
                        isBestDeal={
                          available.length > 1 &&
                          minPrice !== null &&
                          tier.price === minPrice &&
                          !isTierNotStarted(tier) && !isTierExpired(tier, evCtx) &&
                          tierRemaining(tier) > 0
                        }
                        isMostPopular={
                          available.length > 1 &&
                          maxSold !== null && maxSold > 0 &&
                          tier.quantity_sold === maxSold &&
                          !isTierNotStarted(tier) && !isTierExpired(tier, evCtx) &&
                          tierRemaining(tier) > 0
                        }
                        onClick={() => {
                          if (tier.sold_out || isTierNotStarted(tier) || isTierExpired(tier, evCtx) || salesClosed) return;
                          const rem = tierRemaining(tier);
                          if (rem > 0) { setSelectedTierId(tier.id); setQty(Math.min(qty, rem)); }
                        }}
                      />
                    ));
                  })()}
                </div>

                {selectedTier && !soldOut && !salesClosed && (
                  <div className="p-4 sm:p-5 space-y-5">
                    {/* Quantity */}
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Number of Tickets</p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQty(Math.max(1, qty - 1))}
                          className="w-10 h-10 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-lg text-ink hover:border-aubergine hover:text-aubergine transition-all"
                        >−</button>
                        <span className="font-display font-bold text-2xl text-ink w-10 text-center">{qty}</span>
                        <button
                          onClick={() => setQty(Math.min(maxQty, qty + 1))}
                          disabled={qty >= maxQty}
                          className="w-10 h-10 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-lg text-ink hover:border-aubergine hover:text-aubergine transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >+</button>
                        {/* Inline scarcity nudge next to qty */}
                        {remaining <= 10 && remaining > 0 && (
                          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-durga/8 border border-durga/20">
                            <span className="w-1.5 h-1.5 bg-durga rounded-full animate-pulse shrink-0" />
                            <span className="font-mono text-[10px] text-durga font-bold">{remaining} left</span>
                          </div>
                        )}
                        {remaining > 10 && remaining <= 30 && (
                          <span className="font-mono text-[10px] text-marigold-dark">{remaining} remaining</span>
                        )}
                      </div>
                      {/* Scaling mode: nudge to next tier */}
                      {selectedTier?.group_discount_mode === 'scaling' && nextScalingTier && qty >= nextScalingTier.min - 3 && qty < nextScalingTier.min && (
                        <button
                          onClick={() => setQty(nextScalingTier.min)}
                          className="mt-2 w-full text-left px-3 py-2 rounded-lg bg-peacock/8 border border-peacock/20 hover:bg-peacock/12 transition-colors"
                        >
                          <p className="font-ui text-xs text-peacock">
                            <strong>Add {nextScalingTier.min - qty} more</strong> → unlock {nextScalingTier.discount}% group discount
                          </p>
                        </button>
                      )}
                      {/* Simple mode: nudge to hit minimum */}
                      {selectedTier?.group_discount_mode === 'simple' && selectedTier.group_discount_min_qty && qty < selectedTier.group_discount_min_qty && qty >= selectedTier.group_discount_min_qty - 3 && (
                        <button
                          onClick={() => setQty(selectedTier.group_discount_min_qty!)}
                          className="mt-2 w-full text-left px-3 py-2 rounded-lg bg-peacock/8 border border-peacock/20 hover:bg-peacock/12 transition-colors"
                        >
                          <p className="font-ui text-xs text-peacock">
                            <strong>Add {selectedTier.group_discount_min_qty - qty} more</strong> → unlock group pricing
                          </p>
                        </button>
                      )}
                    </div>

                    {/* ── Scaling group discount table ── */}
                    {unitPrice > 0 && selectedTier?.group_discount_mode === 'scaling' && (
                      <div className="rounded-xl border border-ivory-200 overflow-hidden">
                        <div className="bg-aubergine/5 px-3 py-2 border-b border-ivory-200">
                          <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine font-bold">Group Discounts</p>
                        </div>
                        <div className="divide-y divide-ivory-200">
                          {groupScalingLevels(selectedTier).slice().reverse().map(st => {
                            const active = qty >= st.minQty;
                            const isNext = nextScalingTier?.min === st.minQty;
                            return (
                              <div key={st.minQty} className={`flex items-center justify-between px-3 py-2.5 ${active ? "bg-peacock/5" : isNext ? "bg-marigold/5" : ""}`}>
                                <div className="flex items-center gap-2">
                                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${active ? "bg-peacock text-white" : "bg-ivory-200 text-ink-muted"}`}>
                                    {active ? "✓" : "·"}
                                  </span>
                                  <span className={`font-ui text-xs ${active ? "text-ink font-semibold" : "text-ink-muted"}`}>{st.minQty}+ tickets</span>
                                  {isNext && (
                                    <span className="font-mono text-[9px] uppercase tracking-wide text-marigold-dark bg-marigold/15 px-1.5 py-0.5 rounded-full">
                                      Add {st.minQty - qty}
                                    </span>
                                  )}
                                </div>
                                <span className={`font-display font-bold text-sm ${active ? "text-peacock" : "text-ink-muted"}`}>{st.percent}% off</span>
                              </div>
                            );
                          })}
                        </div>
                        {discountAmount > 0 && (
                          <div className="bg-peacock px-3 py-2">
                            <p className="font-ui text-xs text-white font-semibold text-center">
                              Saving ${money(discountAmount)} with group pricing!
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Simple group discount banner ── */}
                    {unitPrice > 0 && selectedTier?.group_discount_mode === 'simple' && selectedTier.group_discount_min_qty && (
                      (() => {
                        const minQty = selectedTier.group_discount_min_qty!;
                        const val = selectedTier.group_discount_value ?? 0;
                        const type = selectedTier.group_discount_type ?? 'percentage';
                        const unlocked = qty >= minQty;
                        const discLabel = type === 'percentage' ? `${val}% off each` : `$${val} off each`;
                        const discPrice = type === 'percentage'
                          ? (unitPrice * (1 - val / 100)).toFixed(2)
                          : Math.max(0, unitPrice - val).toFixed(2);
                        return (
                          <div className={`rounded-xl border-2 overflow-hidden transition-all ${unlocked ? "border-peacock/40" : "border-ivory-200"}`}>
                            <div className={`flex items-center justify-between px-4 py-3 ${unlocked ? "bg-peacock/8" : "bg-ivory"}`}>
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${unlocked ? "bg-peacock" : "bg-ivory-200"}`}>
                                  <svg className={`w-4 h-4 ${unlocked ? "text-white" : "text-ink-muted"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className={`font-ui text-sm font-semibold ${unlocked ? "text-peacock" : "text-ink"}`}>
                                    Group rate — {discLabel}
                                  </p>
                                  <p className="font-mono text-[10px] text-ink-muted">
                                    {unlocked ? `Applied! $${discPrice}/ticket` : `Buy ${minQty}+ tickets to unlock`}
                                  </p>
                                </div>
                              </div>
                              {unlocked ? (
                                <span className="font-mono text-[10px] font-bold text-white bg-peacock px-2 py-1 rounded-full">Active</span>
                              ) : (
                                <span className="font-mono text-[10px] text-ink-muted bg-ivory-200 px-2 py-1 rounded-full">{minQty - qty} more</span>
                              )}
                            </div>
                            {unlocked && (
                              <div className="bg-peacock px-3 py-2">
                                <p className="font-ui text-xs text-white font-semibold text-center">
                                  Saving ${money(discountAmount)} with group pricing!
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}

                    {/* Price breakdown */}
                    {unitPrice > 0 && (
                      <div className="rounded-xl bg-ivory p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-ui text-ink-muted">{qty} × ${money(unitPrice)}</span>
                          <span className="font-ui text-ink">${money(subtotal)}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="font-ui text-peacock">Group discount</span>
                            <span className="font-ui text-peacock">−${money(discountAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="font-ui text-ink-muted">Rameelo fee (3%)</span>
                          <span className="font-ui text-ink-muted">${money(rameeloFee)}</span>
                        </div>
                        <div className="flex items-start justify-between text-sm gap-2">
                          <div>
                            <span className="font-ui text-ink-muted">Card processing (5%)</span>
                            <p className="font-mono text-[9px] text-peacock mt-0.5">Free with bank / ACH at checkout</p>
                          </div>
                          <span className="font-ui text-ink-muted shrink-0">${money(processingFee)}</span>
                        </div>
                        <div className="border-t border-ivory-200 pt-2 flex justify-between">
                          <span className="font-display font-bold text-ink">Total</span>
                          <span className="font-display font-bold text-ink text-lg">${money(grandTotal)}</span>
                        </div>
                      </div>
                    )}

                    {/* CTA */}
                    <button
                      onClick={handleContinue}
                      className="w-full py-4 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark transition-all active:scale-[0.98] shadow-sm"
                    >
                      {unitPrice === 0 ? `Reserve ${qty} Free Ticket${qty > 1 ? "s" : ""} →` : `Continue to Checkout →`}
                    </button>

                    {/* Group order CTAs — one card per active group */}
                    {existingGroups.map(eg => (
                      <div key={eg.id} className="rounded-2xl border border-aubergine/20 bg-aubergine/5 p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <p className="font-mono text-[9px] uppercase tracking-widest text-aubergine font-bold mb-0.5">Your active group</p>
                            <p className="font-display font-bold text-ink text-sm">
                              {eg.name ?? eg.id}
                            </p>
                            <p className="font-mono text-[10px] text-ink-muted">{eg.joined} of {eg.target} tickets</p>
                          </div>
                          <Link
                            href={`/group/${eg.id}`}
                            className="shrink-0 px-4 py-2 rounded-xl bg-aubergine text-white font-ui font-semibold text-xs hover:bg-aubergine-light transition-colors"
                          >
                            Manage →
                          </Link>
                        </div>
                        <div className="h-1.5 bg-white rounded-full overflow-hidden">
                          <div
                            className="h-full bg-marigold rounded-full transition-all"
                            style={{ width: `${Math.min(100, (eg.joined / eg.target) * 100)}%` }}
                          />
                        </div>
                        <p className="font-mono text-[10px] text-aubergine/60 mt-2">
                          Share your group link to bring more people in
                        </p>
                      </div>
                    ))}
                    <Link
                      href={`/group/create?eventId=${event.id}`}
                      className="w-full py-3 rounded-2xl border border-aubergine/25 text-aubergine font-ui font-semibold text-sm hover:bg-aubergine/5 transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {existingGroups.length > 0
                        ? "Start a new group"
                        : selectedTier?.group_discount_mode === 'scaling' && groupScalingLevels(selectedTier).length > 0
                          ? `Start a Group Order — Save up to ${Math.max(...groupScalingLevels(selectedTier).map(l => l.percent))}%`
                          : "Start a Group Order"}
                    </Link>

                    <p className="text-center font-mono text-[10px] text-ink-muted">
                      Secure checkout · No hidden fees · Instant e-tickets
                    </p>
                    <p className="text-center font-ui text-[10px] text-ink-muted/70 -mt-1">All sales are final · no refunds except event cancellation</p>
                  </div>
                )}

                {salesClosed && !totalSoldOut && !(selectedTier && soldOut) && (
                  <div className="p-5 space-y-2 text-center">
                    <button disabled className="w-full py-4 rounded-2xl bg-ivory-200 text-ink-muted font-semibold text-sm cursor-not-allowed">
                      Sales closed
                    </button>
                    <p className="font-ui text-xs text-ink-muted">
                      Online sales close when doors open. Tickets may be available at the door.
                    </p>
                  </div>
                )}

                {(totalSoldOut || (selectedTier && soldOut)) && (
                  <div className="p-5 space-y-3">
                    <button disabled className="w-full py-4 rounded-2xl bg-ivory-200 text-ink-muted font-semibold text-sm cursor-not-allowed">
                      Sold Out
                    </button>
                    <p className="text-center font-ui text-xs text-ink-muted">
                      Join the waitlist to be notified if tickets are released.
                    </p>
                  </div>
                )}
              </div>
              )} {/* end selling_on_rameelo conditional */}
            </div>
          </div>
        </div>
      </div>

      {/* ── More from this organizer (only other upcoming org events) ── */}
      <MoreFromOrganizer orgId={event.org_id} currentEventId={event.id} orgName={event.organization?.name} />

      {/* ── Leave confirmation modal ── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
            {/* Visual hook */}
            <div className="relative h-28 overflow-hidden" style={{ background: event?.cover_image_url ? undefined : (GRADIENTS.find(g => g.id === event?.cover_gradient) ?? GRADIENTS[0]).css }}>
              {event?.cover_image_url && <img src={event.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)" }} />
              <div className="absolute bottom-3 left-4 right-4">
                <p className="font-display font-bold text-white text-sm leading-tight truncate" style={{ letterSpacing: "-0.01em" }}>{event?.title}</p>
                <p className="font-mono text-[10px] text-white/60">{event?.city}, {event?.state}</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="font-display font-bold text-ink text-xl mb-1.5" style={{ letterSpacing: "-0.02em" }}>
                  Hold on — your spot isn&apos;t saved yet
                </p>
                <p className="font-ui text-sm text-ink-muted leading-relaxed">
                  {viewingNow} people are looking at this right now. Navratri events in {event?.city} fill up fast — prices don&apos;t drop if you come back later.
                </p>
              </div>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="w-full py-3.5 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark transition-all active:scale-[0.98]"
              >
                {event?.selling_on_rameelo ? "Stay and lock in my spot →" : "Stay and claim my spot →"}
              </button>
              <button
                onClick={confirmLeave}
                className="w-full py-2.5 font-ui text-sm text-ink-muted hover:text-ink transition-colors"
              >
                I&apos;ll take my chances and leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share panel ── */}
      {showShare && event && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowShare(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-ivory-200 flex items-center justify-between">
              <p className="font-display font-bold text-ink text-base" style={{ letterSpacing: "-0.01em" }}>Share this event</p>
              <button onClick={() => setShowShare(false)} className="w-7 h-7 rounded-full bg-ivory flex items-center justify-center text-ink-muted hover:bg-ivory-200 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* Event title */}
              <p className="font-ui text-sm text-ink-muted leading-snug truncate">{event.title} · {event.city}, {event.state}</p>

              {/* Copy link */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-ivory border border-ivory-200">
                <p className="flex-1 font-mono text-[11px] text-ink-muted truncate">rameelo.com/events/{id}</p>
                <button
                  onClick={copyEventLink}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-ui font-semibold text-xs transition-all ${linkCopied ? "bg-peacock text-white" : "bg-white border border-ivory-200 text-ink hover:border-aubergine/30"}`}
                >
                  {linkCopied ? (
                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Copied!</>
                  ) : (
                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy link</>
                  )}
                </button>
              </div>

              {/* Social buttons */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${event.title} — ${event.city}, ${event.state} 🪈`)}&url=${encodeURIComponent(`https://rameelo.com/events/${id}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-ivory-200 bg-white hover:border-black/20 transition-all font-ui text-sm font-semibold text-ink"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  X / Twitter
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`${event.title} 🪈 — ${event.city}, ${event.state}\nhttps://rameelo.com/events/${id}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-ivory-200 bg-white hover:border-[#25D366]/40 transition-all font-ui text-sm font-semibold text-ink"
                >
                  <svg className="w-4 h-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  WhatsApp
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://rameelo.com/events/${id}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-ivory-200 bg-white hover:border-[#1877F2]/40 transition-all font-ui text-sm font-semibold text-ink"
                >
                  <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  Facebook
                </a>
                <button
                  onClick={copyEventLink}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-ivory-200 bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] hover:opacity-90 transition-all font-ui text-sm font-semibold text-white"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                  Instagram
                </button>
              </div>

              <p className="font-mono text-[9px] text-ink-muted text-center">
                For Instagram: copy the link and paste it in your Story or bio
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky mobile "Buy Tickets" bar — hides once the buy panel is reached ── */}
      {event.selling_on_rameelo && !salesClosed && !totalSoldOut && !inviteGroup && !buyPanelReached && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-safe-bottom pb-3 pt-5"
          style={{ background: "linear-gradient(to top, rgba(252,249,242,1) 62%, rgba(252,249,242,0))" }}>
          <button
            onClick={scrollToBuyPanel}
            className="w-full py-4 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-xl shadow-marigold/30"
          >
            Buy Tickets →
          </button>
          <Link
            href={`/group/create?eventId=${event.id}`}
            className="mt-2 flex items-center justify-center gap-1.5 text-aubergine/70 active:opacity-70"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="font-ui text-[11px] font-medium underline underline-offset-2 decoration-aubergine/30">
              Going with friends? Start a group to unlock discounts
            </span>
          </Link>
        </div>
      )}

      {/* ── Sticky mobile group invite bar ── */}
      {inviteGroup && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-safe-bottom pb-4 pt-3"
          style={{ background: "linear-gradient(to top, rgba(252,249,242,1) 60%, rgba(252,249,242,0))" }}>
          <Link
            href={`/group/${inviteGroup.id}`}
            className="flex items-center gap-3 w-full bg-aubergine rounded-2xl px-4 py-3.5 shadow-xl shadow-aubergine/20 active:scale-[0.98] transition-all"
          >
            <div className="w-9 h-9 rounded-full bg-marigold/20 border border-marigold/30 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-marigold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-white text-sm leading-tight truncate">
                {inviteGroup.hostName}&apos;s group
              </p>
              <p className="font-mono text-[10px] text-white/60 mt-0.5">
                {inviteGroup.joined} {inviteGroup.joined === 1 ? "person" : "people"} in
                {inviteGroup.discount > 0 && ` · ${inviteGroup.discount}% group discount`}
              </p>
            </div>
            <span className="shrink-0 bg-marigold text-aubergine font-display font-bold text-xs px-3.5 py-2 rounded-xl whitespace-nowrap">
              Join group →
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
