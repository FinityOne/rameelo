"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getUser, type RameeloUser } from "@/lib/auth";
import { loadMyOrders, loadMyPendingGroups, type PortalOrderRow, type PendingGroup } from "@/lib/group-orders";
import { loadIncomingTransfers, type IncomingTransfer } from "@/lib/transfers";

// ── Sponsor ads (kept as curated content) ────────────────────────────────────

const SPONSOR_ADS = [
  {
    id: "realty",
    type: "hero",
    biz: "Priya Singh Realty",
    tag: "Real Estate",
    tagline: "Your dream home in the community you love.",
    desc: "Specializing in first-generation homebuyers across NJ, NY & CA. Free consultation for Rameelo members.",
    cta: "Free Consultation",
    color: "#0E8C7A",
    accent: "#FCF9F2",
    emoji: "🏡",
    sponsor: "Keller Williams · Sponsored",
  },
  {
    id: "dental",
    type: "card",
    biz: "Dr. Patel's Family Dentistry",
    tag: "Dentistry",
    tagline: "Your community's smile since 2003.",
    desc: "New patient special: $99 cleaning + whitening. Locations in Edison · Fremont · Chicago.",
    cta: "Book Appointment",
    color: "#2E1B30",
    accent: "#F5A623",
    emoji: "🦷",
    sponsor: "Sponsored",
  },
  {
    id: "chiro",
    type: "card",
    biz: "Bay Area Chiro & Wellness",
    tag: "Chiropractic",
    tagline: "Back pain after Garba? We've got you.",
    desc: "Dr. Meera Choksi, DC — specializing in dance & performance recovery. First visit free.",
    cta: "Schedule Now",
    color: "#3D2543",
    accent: "#0E8C7A",
    emoji: "💆",
    sponsor: "Sponsored",
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type RecommendedEvent = {
  id: string;
  title: string;
  start_date: string;
  city: string;
  state: string;
  cover_gradient: string;
  lowestPrice: number;
  fillPct: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateShort(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr + "T00:00:00").getTime() - Date.now()) / 86400000);
}

// ── QR mini ───────────────────────────────────────────────────────────────────

function QRMini({ value }: { value: string }) {
  const grid = 11;
  let seed = value.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0x7fffffff, 7);
  function next() { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; }
  const cells = Array.from({ length: grid }, () => Array.from({ length: grid }, () => next() > 0.45));
  return (
    <svg width={40} height={40} viewBox={`0 0 ${grid} ${grid}`} style={{ imageRendering: "pixelated", display: "block" }}>
      <rect width={grid} height={grid} fill="white" />
      {cells.map((row, r) => row.map((on, c) => on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#2E1B30" /> : null))}
    </svg>
  );
}

// ── Pending group card ────────────────────────────────────────────────────────

function PendingGroupCard({ group }: { group: PendingGroup }) {
  const discountedPrice = Math.round(group.tierPrice * (1 - group.discountPct / 100));
  const deadlineDate = new Date(group.deadline);
  const hoursLeft = Math.max(0, Math.round((deadlineDate.getTime() - Date.now()) / 3600000));
  const daysLeft = Math.floor(hoursLeft / 24);
  const timeLabel = daysLeft > 0 ? `${daysLeft}d left` : `${hoursLeft}h left`;
  const urgent = hoursLeft < 48;

  return (
    <div className={`rounded-2xl border-2 p-5 ${urgent ? "border-durga/30 bg-durga/4" : "border-marigold/25 bg-marigold/4"}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-marigold/20 text-marigold-dark">
              {group.isOrganizer ? "You started this" : "You were invited"}
            </span>
            <span className={`font-mono text-[9px] font-bold ${urgent ? "text-durga" : "text-ink-muted"}`}>{timeLabel}</span>
          </div>
          <p className="font-display font-bold text-ink text-sm">{group.eventTitle}</p>
          <p className="font-mono text-[10px] text-ink-muted">{fmtDate(group.eventDate)} · {group.city}, {group.state}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display font-bold text-ink text-lg">${discountedPrice}</p>
          <p className="font-mono text-[10px] text-ink-muted line-through">${group.tierPrice}</p>
          <p className="font-mono text-[10px] text-peacock">{group.discountPct}% off</p>
        </div>
      </div>
      <Link
        href={`/group/${group.groupId}`}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all"
      >
        Complete Your Ticket →
      </Link>
    </div>
  );
}

// ── No tickets CTA ────────────────────────────────────────────────────────────

function ExploreEventsCTA() {
  return (
    <div className="rounded-2xl overflow-hidden border border-marigold/25 bg-gradient-to-br from-marigold/8 via-transparent to-aubergine/5">
      <div className="px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5">No tickets yet</p>
          <h3 className="font-display font-bold text-ink text-xl mb-1" style={{ letterSpacing: "-0.02em" }}>
            Your first Navratri night is one click away
          </h3>
          <p className="font-ui text-sm text-ink-muted leading-relaxed">
            Browse live events across the US — garba, dandiya, raas, and more. Get your tickets before they sell out.
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Link
            href="/events"
            className="flex items-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-marigold-dark transition-all shadow-sm whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Browse events →
          </Link>
          <Link
            href="/events"
            className="text-center font-mono text-[10px] text-ink-muted hover:text-aubergine transition-colors"
          >
            Group discounts available
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PortalDashboard() {
  const [user, setUser] = useState<RameeloUser | null>(null);
  const [orders, setOrders] = useState<PortalOrderRow[]>([]);
  const [pendingGroups, setPendingGroups] = useState<PendingGroup[]>([]);
  const [recommended, setRecommended] = useState<RecommendedEvent[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<IncomingTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getUser());

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) return;

      const today = new Date().toISOString().slice(0, 10);
      const email = authUser.email ?? "";

      // Load orders, pending groups, incoming transfers, and recommended events in parallel
      const [myOrders, myPending, incoming, { data: eventsRaw }] = await Promise.all([
        loadMyOrders(authUser.id),
        loadMyPendingGroups(authUser.id),
        email ? loadIncomingTransfers(email) : Promise.resolve([]),
        supabase
          .from("events")
          .select(`id, title, start_date, city, state, cover_gradient, ticket_tiers (price, quantity, quantity_sold)`)
          .eq("status", "published")
          .gte("start_date", today)
          .order("start_date")
          .limit(6),
      ]);

      setOrders(myOrders);
      setPendingGroups(myPending);
      setIncomingTransfers(incoming);

      // Build recommended events, excluding ones the user already bought
      const myEventIds = new Set(myOrders.map(o => o.eventId));
      const recs: RecommendedEvent[] = ((eventsRaw ?? []) as {
        id: string; title: string; start_date: string; city: string; state: string; cover_gradient: string;
        ticket_tiers: { price: number; quantity: number; quantity_sold: number }[];
      }[])
        .filter(e => !myEventIds.has(e.id))
        .slice(0, 3)
        .map(e => {
          const tiers = e.ticket_tiers ?? [];
          const totalQ = tiers.reduce((s, t) => s + t.quantity, 0);
          const totalS = tiers.reduce((s, t) => s + t.quantity_sold, 0);
          const prices = tiers.map(t => t.price).filter(p => p > 0);
          return {
            id: e.id,
            title: e.title,
            start_date: e.start_date,
            city: e.city,
            state: e.state,
            cover_gradient: e.cover_gradient,
            lowestPrice: prices.length > 0 ? Math.min(...prices) : 0,
            fillPct: totalQ > 0 ? Math.round((totalS / totalQ) * 100) : 0,
          };
        });
      setRecommended(recs);

      setLoading(false);
    });
  }, []);

  if (!user) return null;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = orders.filter(o => o.eventDate >= today).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const nextOrder = upcoming[0] ?? null;
  const nextDays = nextOrder ? daysUntil(nextOrder.eventDate) : null;
  const totalTickets = orders.reduce((s, o) => s + o.qty, 0);
  const distinctEvents = new Set(orders.map(o => o.eventId)).size;
  const hasTickets = orders.length > 0;

  const AVATAR_COLORS = ["#7C1F2C", "#0E8C7A", "#2E1B30", "#D4891B", "#5a1e7a", "#892240", "#1a4a5e"];

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Welcome strip ── */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#2E1B30" }}>
        <div className="relative px-6 py-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 90% 50%, #F5A623 0%, transparent 60%)" }}
          />
          <div className="relative flex items-center gap-4 flex-1 min-w-0">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0 overflow-hidden"
              style={{ backgroundColor: user.avatarColor }}
            >
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                : user.avatarInitials}
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-0.5">
                Member since {new Date(user.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </p>
              <h2 className="font-display font-bold text-white text-xl leading-tight">{user.firstName} {user.lastName}</h2>
              <p className="font-ui text-white/50 text-sm">{user.email}{user.city ? ` · ${user.city}` : ""}</p>
            </div>
          </div>
          <div className="relative flex gap-6 sm:gap-8 shrink-0">
            {[
              { label: "Tickets", value: loading ? "—" : String(totalTickets) },
              { label: "Events", value: loading ? "—" : String(distinctEvents) },
              { label: "Groups", value: loading ? "—" : String(new Set(orders.filter(o => o.groupId).map(o => o.groupId)).size) },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="font-display font-bold text-white text-2xl">{s.value}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/30">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Next event countdown */}
        {nextOrder && nextDays !== null && (
          <div className="border-t border-white/8 px-6 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-marigold/20 flex items-center justify-center">
                <span className="text-marigold text-sm">🎶</span>
              </div>
              <div>
                <p className="font-display font-bold text-white text-sm">{nextOrder.eventTitle}</p>
                <p className="font-mono text-[10px] text-white/40">
                  {fmtDate(nextOrder.eventDate)} · {nextOrder.city}, {nextOrder.state}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-center px-3 py-1.5 rounded-xl bg-marigold/15 border border-marigold/25">
                <p className="font-display font-bold text-marigold text-xl leading-none">{nextDays}</p>
                <p className="font-mono text-[9px] uppercase tracking-wide text-marigold/60">days away</p>
              </div>
              <Link href="/portal/tickets" className="px-3 py-2 rounded-xl bg-marigold text-aubergine font-ui font-semibold text-xs hover:bg-marigold-dark transition-all whitespace-nowrap">
                View ticket →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Pending transfer alert ── */}
      {!loading && incomingTransfers.length > 0 && (
        <Link
          href="/portal/tickets"
          className="flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-marigold/40 bg-marigold/8 hover:bg-marigold/12 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-marigold flex items-center justify-center shrink-0 text-xl">🎟️</div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>
              You have {incomingTransfers.length} ticket{incomingTransfers.length !== 1 ? "s" : ""} waiting for you
            </p>
            <p className="font-ui text-xs text-ink-muted">
              {incomingTransfers[0].fromName || "Someone"} sent you ticket{incomingTransfers.length !== 1 ? "s" : ""} to {incomingTransfers[0].eventTitle}. Accept them now.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-6 h-6 rounded-full bg-marigold flex items-center justify-center font-bold text-aubergine text-xs">{incomingTransfers.length}</span>
            <svg className="w-4 h-4 text-marigold-dark group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </div>
        </Link>
      )}

      {/* ── Upcoming tickets or explore CTA ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : !hasTickets ? (
        <ExploreEventsCTA />
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-ink text-lg">Upcoming Tickets</h3>
            <Link href="/portal/tickets" className="font-ui text-sm text-marigold-dark hover:text-marigold transition-colors">
              See all ({orders.length}) →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-ivory-200 bg-white p-6 text-center">
              <p className="font-display font-bold text-ink text-base mb-1">No upcoming events</p>
              <p className="font-ui text-xs text-ink-muted mb-4">All your tickets are for past events. Find your next night out!</p>
              <Link href="/events" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-marigold text-aubergine font-semibold text-sm hover:bg-marigold-dark transition-all">
                Browse events →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {upcoming.slice(0, 3).map(order => {
                const initials = (order.artistName || order.eventTitle).split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                const colorIdx = ((order.artistName || order.eventTitle).charCodeAt(0) || 0) % AVATAR_COLORS.length;
                return (
                  <Link
                    key={order.orderId}
                    href="/portal/tickets"
                    className="group flex items-center gap-3 p-4 rounded-2xl bg-white border border-ivory-200 hover:border-marigold/30 hover:shadow-sm transition-all"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: AVATAR_COLORS[colorIdx] }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-ink text-xs truncate group-hover:text-aubergine transition-colors">
                        {order.eventTitle}
                      </p>
                      <p className="font-mono text-[10px] text-ink-muted">{fmtDateShort(order.eventDate)}</p>
                      <p className="font-mono text-[10px] text-ink-muted">
                        {order.city}, {order.state} · {order.qty} ticket{order.qty > 1 ? "s" : ""}
                      </p>
                    </div>
                    <QRMini value={order.orderId} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Unfinished Group Orders ── */}
      {pendingGroups.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-marigold/15 flex items-center justify-center">
              <span className="text-base">👥</span>
            </div>
            <div>
              <h3 className="font-display font-bold text-ink text-lg">Finish Your Group Orders</h3>
              <p className="font-ui text-xs text-ink-muted">You have unpaid group tickets — complete checkout to secure your spot.</p>
            </div>
          </div>
          <div className="space-y-3">
            {pendingGroups.map(g => <PendingGroupCard key={g.groupId} group={g} />)}
          </div>
        </div>
      )}

      {/* ── Sponsor Hero ── */}
      <div className="rounded-2xl overflow-hidden border border-ivory-200">
        <div className="px-1 py-1 flex justify-end">
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted px-2">Sponsored</span>
        </div>
        <div className="px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center gap-5" style={{ backgroundColor: SPONSOR_ADS[0].color }}>
          <div className="text-5xl">{SPONSOR_ADS[0].emoji}</div>
          <div className="flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: SPONSOR_ADS[0].accent, opacity: 0.6 }}>{SPONSOR_ADS[0].tag}</p>
            <h4 className="font-display font-bold text-2xl mb-1" style={{ color: SPONSOR_ADS[0].accent }}>{SPONSOR_ADS[0].tagline}</h4>
            <p className="font-ui text-sm" style={{ color: SPONSOR_ADS[0].accent, opacity: 0.7 }}>{SPONSOR_ADS[0].desc}</p>
          </div>
          <button className="shrink-0 px-5 py-3 rounded-xl font-ui font-bold text-sm transition-all whitespace-nowrap" style={{ backgroundColor: SPONSOR_ADS[0].accent, color: SPONSOR_ADS[0].color }}>
            {SPONSOR_ADS[0].cta} →
          </button>
        </div>
        <div className="px-6 py-2 bg-ivory border-t border-ivory-200 flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-peacock flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <p className="font-mono text-[10px] text-ink-muted">{SPONSOR_ADS[0].sponsor} · {SPONSOR_ADS[0].biz}</p>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Find Events", href: "/events", icon: "🔍", desc: "Upcoming near you" },
          { label: "Group Order", href: "/events", icon: "👥", desc: "Save up to 15%" },
          { label: "My Tickets", href: "/portal/tickets", icon: "🎟️", desc: hasTickets ? `${orders.length} order${orders.length !== 1 ? "s" : ""}` : "None yet" },
          { label: "Invite Friend", href: "/portal/refer", icon: "📲", desc: "Share the vibe" },
        ].map(a => (
          <Link
            key={a.label}
            href={a.href}
            className="p-4 rounded-2xl bg-white border border-ivory-200 hover:border-marigold/30 hover:shadow-sm transition-all group text-center"
          >
            <span className="text-2xl block mb-2">{a.icon}</span>
            <p className="font-display font-bold text-ink text-sm group-hover:text-aubergine transition-colors">{a.label}</p>
            <p className="font-mono text-[10px] text-ink-muted">{a.desc}</p>
          </Link>
        ))}
      </div>

      {/* ── Two sponsor cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SPONSOR_ADS.slice(1).map(ad => (
          <div key={ad.id} className="rounded-2xl overflow-hidden border border-ivory-200">
            <div className="px-1 py-1 flex justify-end bg-white">
              <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted px-2">{ad.sponsor}</span>
            </div>
            <div className="px-5 py-5 flex gap-4" style={{ backgroundColor: ad.color }}>
              <div className="text-3xl">{ad.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: ad.accent, opacity: 0.6 }}>{ad.tag}</p>
                <p className="font-display font-bold text-base leading-snug mb-1" style={{ color: ad.accent }}>{ad.tagline}</p>
                <p className="font-ui text-xs mb-3" style={{ color: ad.accent, opacity: 0.6 }}>{ad.desc}</p>
                <button className="px-4 py-2 rounded-lg font-ui font-semibold text-xs transition-all" style={{ backgroundColor: ad.accent, color: ad.color }}>
                  {ad.cta} →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recommended events (real DB data) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-ink text-lg">
            {hasTickets ? "More events you might like" : "Explore events near you"}
          </h3>
          <Link href="/events" className="font-ui text-sm text-marigold-dark hover:text-marigold transition-colors">
            Browse all →
          </Link>
        </div>

        {recommended.length === 0 ? (
          <div className="rounded-2xl border border-ivory-200 bg-white p-8 text-center">
            <p className="font-display font-bold text-ink text-base mb-1">Events coming soon</p>
            <p className="font-ui text-xs text-ink-muted mb-4">Check back as organizers publish new events for this season.</p>
            <Link href="/events" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-marigold text-aubergine font-semibold text-sm hover:bg-marigold-dark transition-all">
              Browse events →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recommended.map(ev => {
              const initials = ev.title.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
              const colorIdx = (ev.title.charCodeAt(0) || 0) % AVATAR_COLORS.length;
              const urgencyColor = ev.fillPct >= 85 ? "#D4891B" : "#0E8C7A";
              return (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="group p-4 rounded-2xl bg-white border border-ivory-200 hover:border-marigold/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: AVATAR_COLORS[colorIdx] }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-ink text-sm truncate group-hover:text-aubergine transition-colors">
                        {ev.title}
                      </p>
                      <p className="font-mono text-[10px] text-ink-muted">
                        {fmtDateShort(ev.start_date)} · {ev.city}, {ev.state}
                      </p>
                    </div>
                  </div>
                  {ev.fillPct > 0 && (
                    <div className="h-1 bg-ivory-200 rounded-full overflow-hidden mb-2">
                      <div className="h-full rounded-full" style={{ width: `${ev.fillPct}%`, backgroundColor: urgencyColor }} />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] text-ink-muted">
                      {ev.fillPct > 0 ? `${ev.fillPct}% sold` : "On sale now"}
                      {ev.fillPct >= 85 && " · Almost gone"}
                    </p>
                    <p className="font-display font-bold text-ink text-sm">
                      {ev.lowestPrice > 0 ? `From $${ev.lowestPrice}` : "Free"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
