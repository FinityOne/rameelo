"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "@/app/organizer/events/create/types";
import { getUser, type RameeloUser } from "@/lib/auth";
import { loadMyOrders, loadMyPendingGroups, type PortalOrderRow, type PendingGroup } from "@/lib/group-orders";
import { loadIncomingTransfers, type IncomingTransfer } from "@/lib/transfers";
import OrganizerAccessBanner from "./OrganizerAccessBanner";
import PortalPromoCard from "./PortalPromoCard";

// Resolve an event's saved cover into a CSS background (image preferred, else gradient).
function coverBg(coverImageUrl: string | null, coverGradient: string): string {
  if (coverImageUrl) return `linear-gradient(135deg, rgba(20,8,22,0.35), rgba(20,8,22,0.55)), url(${coverImageUrl}) center/cover no-repeat`;
  return GRADIENTS.find(g => g.id === coverGradient)?.css ?? "linear-gradient(135deg, #7C1F2C 0%, #B84A22 55%, #F5A623 120%)";
}


// ── Types ─────────────────────────────────────────────────────────────────────

type RecommendedEvent = {
  id: string; title: string; start_date: string; city: string; state: string;
  cover_gradient: string; cover_image_url: string | null; lowestPrice: number | null; fillPct: number; sellingOnRameelo: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(t?: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  return `${h % 12 || 12}:${String(m ?? 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function fmtDateFull(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function greeting(name: string) {
  const h = new Date().getHours();
  if (h < 5)  return `Night owl energy, ${name} 🌙`;
  if (h < 12) return `Good morning, ${name} ☀️`;
  if (h < 17) return `Good afternoon, ${name} ☕`;
  if (h < 21) return `Good evening, ${name} 🎶`;
  return `Late night vibes, ${name} 🪈`;
}

// ── Live countdown ────────────────────────────────────────────────────────────

function CountdownBoxes({ dateStr }: { dateStr: string }) {
  const [t, setT] = useState({ days: 0, hours: 0, mins: 0, secs: 0, ms: 1 });

  useEffect(() => {
    function tick() {
      const target = new Date(dateStr + "T00:00:00").getTime();
      const ms = Math.max(0, target - Date.now());
      setT({
        days:  Math.floor(ms / 86400000),
        hours: Math.floor((ms % 86400000) / 3600000),
        mins:  Math.floor((ms % 3600000) / 60000),
        secs:  Math.floor((ms % 60000) / 1000),
        ms,
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dateStr]);

  const pad = (n: number) => String(n).padStart(2, "0");
  if (t.ms === 0) {
    return (
      <div className="inline-flex items-center px-4 py-2.5 rounded-xl bg-marigold/20 border border-marigold/40">
        <p className="font-display font-bold text-marigold text-base">It&apos;s time to dance! 🎶</p>
      </div>
    );
  }
  const units = [
    { val: pad(t.days),  label: "days" },
    { val: pad(t.hours), label: "hrs"  },
    { val: pad(t.mins),  label: "min"  },
    { val: pad(t.secs),  label: "sec"  },
  ];
  return (
    <div className="flex items-start gap-2 sm:gap-3">
      {units.map(({ val, label }, i) => (
        <div key={label} className="flex items-start gap-2 sm:gap-3">
          {i > 0 && <span className="font-display font-bold text-white/20 pt-2.5 text-2xl">:</span>}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center rounded-xl tabular-nums" style={{ minWidth: "clamp(52px,6vw,66px)", padding: "10px 8px", background: "rgba(0,0,0,0.28)", border: "1px solid rgba(245,166,35,0.18)" }}>
              <span className="font-display font-bold text-marigold leading-none" style={{ fontSize: "clamp(24px,3.5vw,36px)", letterSpacing: "-0.04em" }}>{val}</span>
            </div>
            <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/30 mt-1.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── QR mini ───────────────────────────────────────────────────────────────────

function QRMini({ value }: { value: string }) {
  const grid = 11;
  let seed = value.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0x7fffffff, 7);
  function next() { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; }
  const cells = Array.from({ length: grid }, () => Array.from({ length: grid }, () => next() > 0.45));
  return (
    <svg width={40} height={40} viewBox={`0 0 ${grid} ${grid}`} style={{ imageRendering: "pixelated" }}>
      <rect width={grid} height={grid} fill="white" />
      {cells.map((row, r) => row.map((on, c) => on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#2E1B30" /> : null))}
    </svg>
  );
}

// ── Ticket row ────────────────────────────────────────────────────────────────

function TicketRow({ order }: { order: PortalOrderRow }) {
  return (
    <Link
      href="/portal/tickets"
      className="group flex items-center gap-3.5 p-3 rounded-2xl bg-white border border-ivory-200 hover:border-marigold/40 hover:shadow-sm transition-all"
    >
      {/* Cover thumbnail */}
      <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-xl relative overflow-hidden" style={{ background: coverBg(order.coverImageUrl, order.coverGradient) }}>
        {!order.coverImageUrl && <span>🪔</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="font-display font-bold text-ink text-sm truncate group-hover:text-aubergine transition-colors">{order.eventTitle}</p>
          {order.isTest && (
            <span className="font-mono text-[8px] uppercase tracking-widest font-bold bg-marigold/20 text-marigold-dark px-1.5 py-0.5 rounded-full shrink-0">Test</span>
          )}
        </div>
        <p className="font-ui text-xs text-ink-muted mt-0.5">
          {fmtDate(order.eventDate)}
          {(order.city || order.state) && <span className="text-ink-muted/60"> · 📍 {[order.city, order.state].filter(Boolean).join(", ")}</span>}
        </p>
      </div>
      <span className="font-mono text-[10px] font-bold text-ink-muted bg-ivory border border-ivory-200 px-2.5 py-1 rounded-full shrink-0">
        {order.qty} ticket{order.qty !== 1 ? "s" : ""}
      </span>
      <div className="shrink-0 rounded-md overflow-hidden border border-ivory-200">
        <QRMini value={order.orderId} />
      </div>
    </Link>
  );
}

// ── Group order banner (single, mockup style) ──────────────────────────────────
function GroupOrderBanner({ group }: { group: PendingGroup }) {
  const discounted = Math.round(group.tierPrice * (1 - group.discountPct / 100));
  const tickets = Math.max(1, group.targetSize);
  const total = discounted * tickets;

  return (
    <div className="rounded-2xl border border-marigold/30 bg-gradient-to-br from-marigold/[0.07] to-marigold/[0.02] p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-marigold/15 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-marigold-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-bold text-ink text-base" style={{ letterSpacing: "-0.015em" }}>Finish your group order</p>
          </div>
          <p className="font-ui text-sm text-ink-muted mt-0.5">
            <span className="font-semibold text-ink">{group.eventTitle}</span> · {fmtDate(group.eventDate)}
            {(group.city || group.state) && ` · ${[group.city, group.state].filter(Boolean).join(", ")}`}
            {" — "}{tickets} unpaid ticket{tickets !== 1 ? "s" : ""} you started.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="font-display font-bold text-ink text-xl leading-none">${total}</p>
            <p className="font-mono text-[10px] text-ink-muted mt-0.5">{tickets} ticket{tickets !== 1 ? "s" : ""}</p>
          </div>
          <Link href={`/group/${group.groupId}`} className="hidden sm:inline-flex items-center px-4 py-2.5 rounded-xl border border-ink/12 bg-white text-ink font-ui font-semibold text-sm hover:bg-ivory transition-all">
            Details
          </Link>
          <Link href={`/group/${group.groupId}`} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark active:scale-[0.98] transition-all whitespace-nowrap">
            Complete checkout
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Garba Passport card ─────────────────────────────────────────────────────────
function PassportCard() {
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #2E1B30 0%, #1a0f1f 100%)" }}>
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-marigold/10 blur-2xl pointer-events-none" />
      <div className="relative">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-marigold/70 mb-2">Garba Passport</p>
        <p className="font-display font-bold text-white text-lg leading-tight mb-1.5" style={{ letterSpacing: "-0.015em" }}>Your passport is ready ✨</p>
        <p className="font-ui text-sm text-white/55 leading-relaxed mb-4">Share your unique member card on Instagram or WhatsApp — invite friends to join Rameelo.</p>
        <Link href="/portal/my-card" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark active:scale-[0.98] transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          Share my card
        </Link>
      </div>
    </div>
  );
}

// ── Pending group card ────────────────────────────────────────────────────────

function PendingGroupCard({ group }: { group: PendingGroup }) {
  const discountedPrice = Math.round(group.tierPrice * (1 - group.discountPct / 100));

  return (
    <div className="rounded-2xl border-2 p-5 border-marigold/25 bg-marigold/4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-marigold/20 text-[#a06b00]">
              {group.isOrganizer ? "You started this" : "You were invited"}
            </span>
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
      <Link href={`/group/${group.groupId}`} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
        Complete Your Ticket →
      </Link>
    </div>
  );
}

// ── Quick actions ─────────────────────────────────────────────────────────────

function QuickActions({ orderCount }: { orderCount: number }) {
  const icon = (d: string) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} /></svg>
  );
  const actions = [
    { label: "Find Events",  href: "/events",              desc: "Near you",          tint: "#F5A623", svg: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
    { label: "My Tickets",   href: "/portal/tickets",      desc: orderCount > 0 ? `${orderCount} order${orderCount !== 1 ? "s" : ""}` : "None yet", tint: "#7C1F2C", svg: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" },
    { label: "Group Orders", href: "/portal/group-orders", desc: "Yours & joined",    tint: "#0E8C7A", svg: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4 0m4 0a4 4 0 014 4M9 12a4 4 0 110-8 4 4 0 010 8z" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {actions.map(a => (
        <Link
          key={a.label}
          href={a.href}
          className="group flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-ivory-200 hover:border-ink/15 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${a.tint}1a`, color: a.tint }}>
            {icon(a.svg)}
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-ink text-[13px] leading-tight truncate">{a.label}</p>
            <p className="font-ui text-[11px] text-ink-muted leading-tight truncate">{a.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Recommended event card ────────────────────────────────────────────────────

function RecommendedCard({ ev }: { ev: RecommendedEvent }) {
  const d = new Date(ev.start_date + "T00:00:00");
  const day = d.getDate();
  const mon = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();

  return (
    <Link href={`/events/${ev.id}`} className="group rounded-2xl overflow-hidden bg-white border border-ivory-200 hover:border-marigold/30 hover:shadow-md transition-all block">
      {/* Cover */}
      <div className="relative h-28 flex items-center justify-center" style={{ background: coverBg(ev.cover_image_url, ev.cover_gradient) }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.16]" style={{ backgroundImage: "radial-gradient(circle at 75% 20%, rgba(255,255,255,0.55) 0%, transparent 50%)" }} />
        {/* Date chip */}
        <div className="absolute top-3 left-3 bg-white rounded-xl px-2.5 py-1 text-center shadow-sm">
          <p className="font-display font-bold text-ink leading-none" style={{ fontSize: 16 }}>{day}</p>
          <p className="font-mono text-[8px] text-ink-muted uppercase tracking-widest leading-none mt-0.5">{mon}</p>
        </div>
        {!ev.cover_image_url && <span className="relative text-3xl">🪔</span>}
        <span className="absolute bottom-2 right-3 font-mono text-[8px] uppercase tracking-widest text-white/55">Cover photo</span>
      </div>
      {/* Body */}
      <div className="p-3.5">
        <p className="font-display font-bold text-ink text-sm leading-snug truncate group-hover:text-aubergine transition-colors">{ev.title}</p>
        <p className="font-ui text-xs text-ink-muted mt-0.5 flex items-center gap-1">
          <svg className="w-3 h-3 text-ink/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          {[ev.city, ev.state].filter(Boolean).join(", ")}
        </p>
      </div>
    </Link>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function PortalDashboard() {
  const [user, setUser]                   = useState<RameeloUser | null>(null);
  const [orders, setOrders]               = useState<PortalOrderRow[]>([]);
  const [pendingGroups, setPendingGroups] = useState<PendingGroup[]>([]);
  const [recommended, setRecommended]     = useState<RecommendedEvent[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<IncomingTransfer[]>([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    setUser(getUser());
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) return;
      const today = new Date().toISOString().slice(0, 10);
      const email = authUser.email ?? "";
      const [myOrders, myPending, incoming, { data: eventsRaw }, { data: prof }] = await Promise.all([
        loadMyOrders(authUser.id),
        loadMyPendingGroups(authUser.id),
        email ? loadIncomingTransfers(email) : Promise.resolve([]),
        supabase
          .from("events")
          .select("id, title, start_date, city, state, cover_gradient, cover_image_url, selling_on_rameelo, ticket_tiers (price, quantity, quantity_sold)")
          .eq("status", "published")
          .gte("start_date", today)
          .order("start_date")
          .limit(6),
        supabase.from("profiles").select("role").eq("id", authUser.id).maybeSingle(),
      ]);
      // Test orders are only shown to admins; everyone else sees live tickets only.
      const isAdmin = (prof as { role?: string } | null)?.role === "admin";
      setOrders(isAdmin ? myOrders : myOrders.filter(o => !o.isTest));
      setPendingGroups(myPending);
      setIncomingTransfers(incoming);
      const myEventIds = new Set(myOrders.map(o => o.eventId));
      const recs: RecommendedEvent[] = ((eventsRaw ?? []) as {
        id: string; title: string; start_date: string; city: string; state: string; cover_gradient: string; cover_image_url: string | null;
        selling_on_rameelo: boolean;
        ticket_tiers: { price: number; quantity: number; quantity_sold: number }[];
      }[])
        .filter(e => !myEventIds.has(e.id)).slice(0, 3)
        .map(e => {
          const tiers = e.ticket_tiers ?? [];
          const prices = tiers.map(t => t.price).filter(p => p > 0);
          const totalQ = tiers.reduce((s, t) => s + t.quantity, 0);
          const totalS = tiers.reduce((s, t) => s + t.quantity_sold, 0);
          return {
            id: e.id, title: e.title, start_date: e.start_date, city: e.city ?? "", state: e.state ?? "",
            cover_gradient: e.cover_gradient, cover_image_url: e.cover_image_url ?? null,
            lowestPrice: e.selling_on_rameelo && prices.length > 0 ? Math.min(...prices) : null,
            fillPct: totalQ > 0 ? Math.round((totalS / totalQ) * 100) : 0,
            sellingOnRameelo: e.selling_on_rameelo,
          };
        });
      setRecommended(recs);
      setLoading(false);
    });
  }, []);

  if (!user) return null;

  const today    = new Date().toISOString().slice(0, 10);
  const upcoming = orders.filter(o => o.eventDate >= today).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const nextOrder = upcoming[0] ?? null;

  const totalTickets  = orders.reduce((s, o) => s + o.qty, 0);
  const distinctEvents = new Set(orders.map(o => o.eventId)).size;
  const hasTickets = orders.length > 0;
  const distinctGroups = new Set(orders.filter(o => o.groupId).map(o => o.groupId)).size;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Organizer access (claims pending team invites) ── */}
      <OrganizerAccessBanner />

      {/* ── Hero ── */}
      <div className="rounded-3xl overflow-hidden relative" style={{ background: "linear-gradient(135deg,#1e0f20 0%,#2E1B30 55%,#1a1230 100%)" }}>
        {/* Cover photo panel (desktop) */}
        {nextOrder && (
          <div className="hidden lg:block absolute inset-y-0 right-0 w-[40%]" style={{ background: coverBg(nextOrder.coverImageUrl, nextOrder.coverGradient) }}>
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, #21122a 0%, rgba(33,18,42,0.55) 30%, transparent 100%)" }} />
            <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-90 pointer-events-none">{!nextOrder.coverImageUrl && "🪔"}</div>
            <span className="absolute bottom-4 right-5 font-mono text-[8px] uppercase tracking-[0.2em] text-white/40">Cover photo</span>
          </div>
        )}

        {/* Stats */}
        {!loading && (
          <div className="absolute top-5 right-6 z-20 flex gap-5 sm:gap-7">
            {[
              { label: "Tickets", value: totalTickets },
              { label: "Events",  value: distinctEvents },
              { label: "Groups",  value: distinctGroups },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="font-display font-bold text-white leading-none" style={{ fontSize: 22, letterSpacing: "-0.03em" }}>{s.value}</p>
                <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/40 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 p-6 sm:p-8 lg:max-w-[62%]">
          {/* Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white font-bold shrink-0 ring-2 ring-white/15" style={{ backgroundColor: user.avatarColor }}>
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.avatarInitials}
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-white leading-tight truncate" style={{ fontSize: "clamp(18px,2.4vw,22px)", letterSpacing: "-0.025em" }}>
                {greeting(user.firstName)}
              </h2>
              <p className="font-ui text-white/45 text-[13px] truncate">
                {user.email}{user.city ? ` · ${user.city}` : ""} · Member since {new Date(user.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </p>
            </div>
          </div>

          <div className="border-t border-white/8 my-5" />

          {nextOrder ? (
            <>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marigold opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-marigold" />
                </span>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-marigold/80">Your next event</p>
              </div>

              <h3 className="font-display font-bold text-white leading-none mb-3" style={{ fontSize: "clamp(26px,4vw,38px)", letterSpacing: "-0.03em" }}>
                {nextOrder.eventTitle}
              </h3>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mb-6">
                {(nextOrder.city || nextOrder.state) && (
                  <span className="font-ui text-[13px] text-white/55 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {[nextOrder.city, nextOrder.state].filter(Boolean).join(", ")}
                  </span>
                )}
                <span className="font-ui text-[13px] text-white/55 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {fmtDateFull(nextOrder.eventDate)}{nextOrder.eventTime ? ` · ${fmtTime(nextOrder.eventTime)}` : ""}
                </span>
                <span className="font-ui text-[13px] text-white/55 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                  {nextOrder.qty} ticket{nextOrder.qty !== 1 ? "s" : ""}
                </span>
              </div>

              <CountdownBoxes dateStr={nextOrder.eventDate} />

              <div className="flex flex-wrap gap-2.5 mt-6">
                <Link href="/portal/tickets" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark active:scale-[0.98] transition-all">
                  View ticket
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </Link>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([nextOrder.venue, nextOrder.city, nextOrder.state].filter(Boolean).join(", "))}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 text-white/80 font-ui font-semibold text-sm hover:bg-white/8 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Get directions
                </a>
              </div>
            </>
          ) : (
            <>
              <p className="font-display font-bold text-white text-lg mb-1" style={{ letterSpacing: "-0.02em" }}>No upcoming events yet</p>
              <p className="font-ui text-white/45 text-sm mb-5">Find your next garba night — tickets across the US this Navratri.</p>
              <Link href="/events" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
                Browse events
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Giveaway (entered confirmation or one-tap join) ── */}
      <PortalPromoCard />

      {/* ── Quick actions ── */}
      <QuickActions orderCount={orders.length} />

      {/* ── Incoming transfer alert ── */}
      {!loading && incomingTransfers.length > 0 && (
        <Link href="/portal/tickets" className="flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-marigold/40 bg-marigold/8 hover:bg-marigold/12 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-marigold flex items-center justify-center shrink-0 text-xl">🎟️</div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>
              {incomingTransfers.length} ticket{incomingTransfers.length !== 1 ? "s" : ""} waiting for you
            </p>
            <p className="font-ui text-xs text-ink-muted">{incomingTransfers[0].fromName || "Someone"} sent you tickets to {incomingTransfers[0].eventTitle}. Accept now.</p>
          </div>
          <svg className="w-5 h-5 text-marigold group-hover:translate-x-0.5 transition-transform shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </Link>
      )}

      {/* ── Group order banner (single) ── */}
      {!loading && pendingGroups.length > 0 && <GroupOrderBanner group={pendingGroups[0]} />}

      {/* ── Main two-column ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_336px] gap-5 items-start">

          {/* Left column */}
          <div className="space-y-8 min-w-0">
            {/* Your tickets */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.02em" }}>Your tickets</h3>
                {hasTickets && (
                  <Link href="/portal/tickets" className="font-ui text-sm text-peacock hover:text-peacock/70 transition-colors font-semibold">
                    See all ({orders.length}) →
                  </Link>
                )}
              </div>
              {!hasTickets ? (
                <div className="rounded-2xl border border-ivory-200 bg-white p-6 text-center">
                  <p className="font-display font-bold text-ink text-base mb-1">No tickets yet</p>
                  <p className="font-ui text-xs text-ink-muted mb-4">Browse live events across the US — group discounts up to 15% off.</p>
                  <Link href="/events" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-marigold text-aubergine font-semibold text-sm hover:bg-marigold-dark transition-all">Browse events →</Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {orders.slice(0, 3).map(o => <TicketRow key={o.orderId} order={o} />)}
                </div>
              )}
            </div>

            {/* More events */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.02em" }}>
                  {hasTickets ? "More events you might like" : "Explore events near you"}
                </h3>
                <Link href="/events" className="font-ui text-sm text-peacock hover:text-peacock/70 font-semibold transition-colors">Browse all →</Link>
              </div>
              {recommended.length === 0 ? (
                <div className="rounded-2xl border border-ivory-200 bg-white p-8 text-center">
                  <p className="font-display font-bold text-ink text-base mb-1">Events coming soon</p>
                  <p className="font-ui text-xs text-ink-muted mb-4">Check back as organizers publish new events for this season.</p>
                  <Link href="/events" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-marigold text-aubergine font-semibold text-sm hover:bg-marigold-dark transition-all">Browse events →</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {recommended.map(ev => <RecommendedCard key={ev.id} ev={ev} />)}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <PassportCard />
          </div>
        </div>
      )}

      {/* ── Sponsor this space ── */}
      {!loading && (
      <div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted/40 mb-2 px-1">Advertise with Rameelo</p>
        <Link href="/sponsor" className="block rounded-2xl overflow-hidden border-2 border-dashed border-marigold/40 hover:border-marigold transition-all group">
          <div className="px-6 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-5" style={{ background: "linear-gradient(135deg, #2E1B30 0%, #3D2543 100%)" }}>
            <div className="text-5xl">📣</div>
            <div className="flex-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-marigold/80 mb-1">Your business could be here</p>
              <h4 className="font-display font-bold text-2xl text-white mb-1 leading-snug">Reach thousands of Garba &amp; Navratri-goers</h4>
              <p className="font-ui text-sm text-white/65">Put your brand in front of an engaged Gujarati-diaspora community across the US. Become a Rameelo sponsor.</p>
            </div>
            <span className="shrink-0 px-5 py-3 rounded-xl font-ui font-bold text-sm bg-marigold text-aubergine group-hover:bg-marigold-dark transition-all whitespace-nowrap">
              Sponsor Rameelo →
            </span>
          </div>
        </Link>
      </div>
      )}

    </div>
  );
}
