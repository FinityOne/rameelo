"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getUser, type RameeloUser } from "@/lib/auth";
import { loadMyOrders, loadMyPendingGroups, type PortalOrderRow, type PendingGroup } from "@/lib/group-orders";
import { loadIncomingTransfers, type IncomingTransfer } from "@/lib/transfers";

// ── Sponsor ads ───────────────────────────────────────────────────────────────

const SPONSOR_ADS = [
  { id: "realty", biz: "Priya Singh Realty", tag: "Real Estate", tagline: "Your dream home in the community you love.", desc: "Specializing in first-generation homebuyers across NJ, NY & CA. Free consultation for Rameelo members.", cta: "Free Consultation", color: "#0E8C7A", accent: "#FCF9F2", emoji: "🏡", sponsor: "Keller Williams · Sponsored" },
  { id: "dental", biz: "Dr. Patel's Family Dentistry", tag: "Dentistry", tagline: "Your community's smile since 2003.", desc: "New patient special: $99 cleaning + whitening. Edison · Fremont · Chicago.", cta: "Book Appointment", color: "#2E1B30", accent: "#F5A623", emoji: "🦷", sponsor: "Sponsored" },
  { id: "chiro",  biz: "Bay Area Chiro & Wellness", tag: "Chiropractic", tagline: "Back pain after Garba? We've got you.", desc: "Dr. Meera Choksi, DC — performance recovery. First visit free.", cta: "Schedule Now", color: "#3D2543", accent: "#0E8C7A", emoji: "💆", sponsor: "Sponsored" },
];

// ── Live activity feed data ───────────────────────────────────────────────────

type ActivityType = "ticket" | "post" | "reaction" | "group" | "hype" | "join";

type Activity = {
  id: string;
  type: ActivityType;
  icon: string;
  text: string;
  sub: string;
  color: string;
  highlight?: boolean;
};

const ACTIVITY_POOL: Activity[] = [
  { id: "a1",  type: "ticket",   icon: "🎟️", text: "6 tickets just sold",               sub: "Navratri Night 4 · Houston · 41 left",      color: "#F5A623", highlight: true },
  { id: "a2",  type: "post",     icon: "📸", text: "Priya posted Night 3 photos",        sub: "800+ dancers · Houston · 3 new photos",     color: "#E8547A" },
  { id: "a3",  type: "reaction", icon: "🔥", text: "Karan's post is blowing up",         sub: "142 reactions · Championship win · ATL",    color: "#F97316", highlight: true },
  { id: "a4",  type: "group",    icon: "👥", text: "New group forming",                  sub: "Chicago Garba · 3 spots still open",        color: "#0E8C7A" },
  { id: "a5",  type: "hype",     icon: "⚡", text: "Dallas tickets selling fast",        sub: "Desi Night · 38 seats left · This Sat",     color: "#a06b00", highlight: true },
  { id: "a6",  type: "post",     icon: "🏆", text: "Atlanta Championship results are in", sub: "Dandiya Dhol wins couples raas · See post", color: "#F5A623", highlight: true },
  { id: "a7",  type: "ticket",   icon: "🎟️", text: "4 tickets just sold",               sub: "Bhangra Blast · Houston · 120 left",        color: "#F5A623" },
  { id: "a8",  type: "join",     icon: "🪈", text: "Arjun joined from San Jose",         sub: "Bay Area Bhangra Night recap posted",       color: "#6366F1" },
  { id: "a9",  type: "reaction", icon: "❤️", text: "Meera's couples post hit 178 loves", sub: "Chicago Garba Night · Community trending",  color: "#E8547A", highlight: true },
  { id: "a10", type: "group",    icon: "👥", text: "Group completed checkout",           sub: "8-person group · Navratri Night 4 · Full!", color: "#0E8C7A" },
  { id: "a11", type: "hype",     icon: "🌟", text: "Bay Area Bhangra sold out",          sub: "3× capacity — next event dates announced",  color: "#a06b00", highlight: true },
  { id: "a12", type: "post",     icon: "📸", text: "Divya posted Boston garba moments",  sub: "New moments · 12 reactions so far",         color: "#0E8C7A" },
  { id: "a13", type: "ticket",   icon: "🎟️", text: "3 tickets just sold",               sub: "Desi Night Dallas · 35 left",               color: "#F5A623" },
  { id: "a14", type: "reaction", icon: "✨", text: "Night 3 post at 545 reactions",      sub: "Priya Sharma · Most reacted this week",     color: "#6366F1", highlight: true },
  { id: "a15", type: "join",     icon: "🪈", text: "12 new members this hour",           sub: "Across Houston · ATL · Chicago",            color: "#E8547A" },
];

// ── Community moments (preview cards) ────────────────────────────────────────

const COMMUNITY_MOMENTS = [
  { id: "m1", name: "Priya S.", initials: "PS", color: "#E8547A", gradient: "linear-gradient(135deg,#F5A623 0%,#E8547A 50%,#2E1B30 100%)", city: "Houston", text: "Night 3 was absolutely magical ✨ The energy on that floor was unlike anything…", reactions: 545, photos: 3 },
  { id: "m2", name: "Karan M.", initials: "KM", color: "#0E8C7A", gradient: "linear-gradient(135deg,#F5A623 0%,#a06b00 100%)",              city: "Atlanta", text: "WE WON 🏆🏆🏆 Atlanta Dandiya Dhol took first place in the couple's raas category!", reactions: 586, photos: 2 },
  { id: "m3", name: "Meera T.", initials: "MT", color: "#6C4F9E", gradient: "linear-gradient(135deg,#E8547A 0%,#C73B5E 50%,#2E1B30 100%)", city: "Chicago", text: "My husband said 'I'm not a dancer' in January. Look at him now 😂❤️", reactions: 383, photos: 2 },
  { id: "m4", name: "Arjun K.", initials: "AK", color: "#2E1B30", gradient: "linear-gradient(135deg,#F97316 0%,#DC2626 50%,#7C1F2C 100%)", city: "San Jose", text: "Bay Area Bhangra Night in the books! 🎊 We packed the venue 3× over what we expected.", reactions: 425, photos: 3 },
];

// ── Hype counter data ─────────────────────────────────────────────────────────

const HYPE_STATS = [
  { label: "Fans online",    target: 847,  suffix: "",  color: "#F5A623", icon: "🪈" },
  { label: "Tickets today",  target: 94,   suffix: "",  color: "#0E8C7A", icon: "🎟️" },
  { label: "Active events",  target: 23,   suffix: "",  color: "#E8547A", icon: "📅" },
  { label: "Community posts",target: 120,  suffix: "+", color: "#6366F1", icon: "📸" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type RecommendedEvent = {
  id: string; title: string; start_date: string; city: string; state: string;
  cover_gradient: string; lowestPrice: number; fillPct: number;
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
function greeting(name: string) {
  const h = new Date().getHours();
  if (h < 5)  return `Night owl energy, ${name} 🌙`;
  if (h < 12) return `Good morning, ${name} ☀️`;
  if (h < 17) return `Good afternoon, ${name} ☕`;
  if (h < 21) return `Good evening, ${name} 🎶`;
  return `Late night vibes, ${name} 🪈`;
}

// ── Live countdown ────────────────────────────────────────────────────────────

function EventCountdown({ order }: { order: PortalOrderRow }) {
  const [t, setT] = useState({ days: 0, hours: 0, mins: 0, secs: 0, ms: 1 });

  useEffect(() => {
    function tick() {
      const target = new Date(order.eventDate + "T00:00:00").getTime();
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
  }, [order.eventDate]);

  const pad = (n: number) => String(n).padStart(2, "0");
  const isToday  = t.ms > 0 && t.ms < 86400000;
  const started  = t.ms === 0;

  const units = [
    { val: pad(t.days),  label: "days" },
    { val: pad(t.hours), label: "hrs"  },
    { val: pad(t.mins),  label: "min"  },
    { val: pad(t.secs),  label: "sec"  },
  ];

  return (
    <div className="relative border-t border-white/8 px-6 pt-5 pb-6">
      {/* Event label */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-marigold animate-pulse shrink-0" />
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/35">
          {started ? "Happening now" : isToday ? "Starting today" : "Next event"}
        </p>
      </div>

      <p
        className="font-display font-bold text-white mb-5 leading-tight truncate"
        style={{ fontSize: "clamp(16px,2.4vw,22px)", letterSpacing: "-0.025em" }}
      >
        {order.eventTitle}
        <span className="font-ui font-normal text-white/35 text-sm ml-2">
          · {order.city}, {order.state}
        </span>
      </p>

      {started ? (
        <div className="flex items-center gap-3">
          <div className="px-5 py-3 rounded-2xl bg-marigold/20 border border-marigold/40">
            <p className="font-display font-bold text-marigold text-lg" style={{ letterSpacing: "-0.02em" }}>
              It&apos;s time to dance! 🎶
            </p>
          </div>
          <Link href="/portal/tickets" className="px-4 py-3 rounded-xl bg-marigold text-aubergine font-ui font-semibold text-sm hover:bg-marigold-dark transition-all whitespace-nowrap">
            View ticket →
          </Link>
        </div>
      ) : (
        <div className="flex items-end gap-3 sm:gap-4 flex-wrap">
          {units.map(({ val, label }, i) => (
            <div key={label} className="flex items-end gap-3 sm:gap-4">
              {i > 0 && (
                <span
                  className="font-display font-bold text-white/20 pb-3"
                  style={{ fontSize: "clamp(22px,3vw,34px)" }}
                >
                  :
                </span>
              )}
              <div className="flex flex-col items-center">
                <div
                  className="flex items-center justify-center rounded-2xl border border-marigold/25 bg-marigold/10 tabular-nums"
                  style={{ minWidth: "clamp(52px,7vw,72px)", padding: "10px 8px" }}
                >
                  <span
                    className="font-display font-bold text-marigold leading-none"
                    style={{ fontSize: "clamp(26px,4vw,42px)", letterSpacing: "-0.04em" }}
                  >
                    {val}
                  </span>
                </div>
                <p className="font-mono text-[8px] uppercase tracking-widest text-white/25 mt-1.5">{label}</p>
              </div>
            </div>
          ))}

          <Link
            href="/portal/tickets"
            className="mb-5 ml-2 px-4 py-3 rounded-xl bg-marigold text-aubergine font-ui font-semibold text-sm hover:bg-marigold-dark transition-all whitespace-nowrap self-center"
          >
            View ticket →
          </Link>
        </div>
      )}
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

// ── Animated counter ──────────────────────────────────────────────────────────

function AnimatedCount({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const duration = 1200;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);
  return <>{count.toLocaleString()}{suffix}</>;
}

// ── Live activity feed ────────────────────────────────────────────────────────

function LiveActivityFeed() {
  const [items, setItems] = useState<Activity[]>(ACTIVITY_POOL.slice(0, 6));
  const [poolIdx, setPoolIdx] = useState(6);
  const [newId, setNewId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = ACTIVITY_POOL[poolIdx % ACTIVITY_POOL.length];
      setItems(prev => [next, ...prev.slice(0, 7)]);
      setNewId(next.id);
      setPoolIdx(i => i + 1);
      setTimeout(() => setNewId(null), 600);
    }, 3200);
    return () => clearInterval(interval);
  }, [poolIdx]);

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-ivory-200 flex items-center gap-2.5">
        <div className="relative flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-peacock" />
          <div className="absolute w-2 h-2 rounded-full bg-peacock animate-ping" />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink font-bold">Live on Rameelo</p>
        <div className="flex-1" />
        <span className="font-mono text-[9px] text-ink-muted/50">Updates every few sec</span>
      </div>

      {/* Feed */}
      <div className="divide-y divide-ivory-200">
        {items.map((item, i) => (
          <div
            key={item.id + i}
            className={`px-4 py-3 flex items-start gap-3 transition-all duration-500 ${
              item.id === newId ? "bg-peacock/5" : i === 0 && item.id === newId ? "bg-peacock/5" : ""
            }`}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
              style={{ backgroundColor: item.color + "18" }}
            >
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-ui text-xs leading-snug ${item.highlight ? "font-semibold text-ink" : "text-ink"}`}>
                {item.text}
              </p>
              <p className="font-mono text-[9px] text-ink-muted mt-0.5 leading-snug">{item.sub}</p>
            </div>
            {item.highlight && (
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: item.color }} />
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-ivory-200 bg-ivory">
        <Link href="/portal/community" className="flex items-center justify-center gap-1.5 font-ui text-xs font-semibold text-peacock hover:text-peacock/70 transition-colors">
          Join the conversation →
        </Link>
      </div>
    </div>
  );
}

// ── Hype bar ──────────────────────────────────────────────────────────────────

function HypeBar() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {HYPE_STATS.map(s => (
        <div
          key={s.label}
          className="bg-white rounded-2xl border border-ivory-200 px-4 py-3.5 flex items-center gap-3"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: s.color + "18" }}
          >
            {s.icon}
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-ink leading-none" style={{ fontSize: 22, letterSpacing: "-0.03em", color: s.color }}>
              <AnimatedCount target={s.target} suffix={s.suffix} />
            </p>
            <p className="font-mono text-[9px] text-ink-muted uppercase tracking-widest mt-0.5">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Community moments row ─────────────────────────────────────────────────────

function CommunityMomentsRow() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <h3 className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.02em" }}>
            Community Moments
          </h3>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-durga/10 font-mono text-[9px] font-bold uppercase tracking-widest text-durga">
            <span className="w-1 h-1 rounded-full bg-durga animate-pulse" />
            New
          </span>
        </div>
        <Link href="/portal/community" className="font-ui text-sm text-peacock hover:text-peacock/70 transition-colors font-semibold">
          See all →
        </Link>
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {COMMUNITY_MOMENTS.map(m => (
          <Link
            key={m.id}
            href="/portal/community"
            className="group shrink-0 w-64 bg-white rounded-2xl border border-ivory-200 overflow-hidden hover:border-marigold/30 hover:shadow-md transition-all"
          >
            {/* Photo strip */}
            <div className="h-28 relative" style={{ background: m.gradient }}>
              <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06) 20%, transparent 21%), radial-gradient(circle at 75% 70%, rgba(255,255,255,0.04) 30%, transparent 31%)" }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full border-2 border-white/60 flex items-center justify-center text-white text-[8px] font-bold shrink-0" style={{ backgroundColor: m.color }}>
                    {m.initials}
                  </div>
                  <p className="font-ui text-white text-[10px] font-semibold drop-shadow">{m.name}</p>
                </div>
                <div className="flex items-center gap-1 bg-black/30 rounded-full px-1.5 py-0.5">
                  <span className="text-[10px]">🔥</span>
                  <span className="font-mono text-white text-[9px]">{m.reactions}</span>
                </div>
              </div>
            </div>
            {/* Text */}
            <div className="px-3 py-2.5">
              <p className="font-ui text-xs text-ink leading-snug line-clamp-2">{m.text}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <svg className="w-2.5 h-2.5 text-ink-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span className="font-mono text-[9px] text-ink-muted">{m.city}</span>
                <span className="text-ink-muted/30">·</span>
                <span className="font-mono text-[9px] text-ink-muted">{m.photos} photos</span>
              </div>
            </div>
          </Link>
        ))}

        {/* CTA card */}
        <Link
          href="/portal/community"
          className="shrink-0 w-48 rounded-2xl border-2 border-dashed border-marigold/30 hover:border-marigold/60 transition-all flex flex-col items-center justify-center gap-2.5 p-4 group"
        >
          <div className="w-10 h-10 rounded-xl bg-marigold/15 flex items-center justify-center text-xl group-hover:bg-marigold/25 transition-colors">
            🪈
          </div>
          <div className="text-center">
            <p className="font-ui font-bold text-ink text-xs group-hover:text-aubergine transition-colors">Share your moment</p>
            <p className="font-mono text-[9px] text-ink-muted mt-0.5">Post photos &amp; stories</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ── Upcoming ticket card ──────────────────────────────────────────────────────

const AVATAR_COLORS = ["#7C1F2C", "#0E8C7A", "#2E1B30", "#D4891B", "#5a1e7a", "#892240", "#1a4a5e"];

function TicketCard({ order }: { order: PortalOrderRow }) {
  const initials = (order.artistName || order.eventTitle).split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const colorIdx = ((order.artistName || order.eventTitle).charCodeAt(0) || 0) % AVATAR_COLORS.length;
  const days = daysUntil(order.eventDate);
  const urgent = days <= 3;

  return (
    <Link
      href="/portal/tickets"
      className="group flex items-center gap-3 p-4 rounded-2xl bg-white border border-ivory-200 hover:border-marigold/40 hover:shadow-sm transition-all"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: AVATAR_COLORS[colorIdx] }}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-ink text-xs truncate group-hover:text-aubergine transition-colors">{order.eventTitle}</p>
        <p className="font-mono text-[10px] text-ink-muted">{fmtDateShort(order.eventDate)} · {order.city}, {order.state}</p>
        <p className="font-mono text-[10px] text-ink-muted">{order.qty} ticket{order.qty > 1 ? "s" : ""}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <QRMini value={order.orderId} />
        {urgent && days > 0 && (
          <span className="font-mono text-[9px] font-bold text-durga bg-durga/10 px-1.5 py-0.5 rounded-full">{days}d away</span>
        )}
      </div>
    </Link>
  );
}

// ── Pending group card ────────────────────────────────────────────────────────

function PendingGroupCard({ group }: { group: PendingGroup }) {
  const discountedPrice = Math.round(group.tierPrice * (1 - group.discountPct / 100));
  const hoursLeft = Math.max(0, Math.round((new Date(group.deadline).getTime() - Date.now()) / 3600000));
  const daysLeft = Math.floor(hoursLeft / 24);
  const timeLabel = daysLeft > 0 ? `${daysLeft}d left` : `${hoursLeft}h left`;
  const urgent = hoursLeft < 48;

  return (
    <div className={`rounded-2xl border-2 p-5 ${urgent ? "border-durga/30 bg-durga/3" : "border-marigold/25 bg-marigold/4"}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-marigold/20 text-[#a06b00]">
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
      <Link href={`/group/${group.groupId}`} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
        Complete Your Ticket →
      </Link>
    </div>
  );
}

// ── Quick actions ─────────────────────────────────────────────────────────────

function QuickActions({ hasTickets, orderCount }: { hasTickets: boolean; orderCount: number }) {
  const actions = [
    { label: "Find Events",    href: "/events",            emoji: "🔍", desc: "Events near you",                          bg: "from-aubergine/8 to-aubergine/3",   border: "border-aubergine/15", hover: "hover:border-aubergine/30" },
    { label: "Community",      href: "/portal/community",  emoji: "🪈", desc: "Share garba moments",                      bg: "from-peacock/8 to-peacock/3",       border: "border-peacock/15",   hover: "hover:border-peacock/30"   },
    { label: "Group Order",    href: "/events",            emoji: "👥", desc: "Save up to 15%",                           bg: "from-marigold/10 to-marigold/3",    border: "border-marigold/20",  hover: "hover:border-marigold/40"  },
    { label: "My Tickets",     href: "/portal/tickets",    emoji: "🎟️", desc: hasTickets ? `${orderCount} order${orderCount !== 1 ? "s" : ""}` : "None yet", bg: "from-durga/8 to-durga/3", border: "border-durga/15", hover: "hover:border-durga/30" },
    { label: "Earnings",       href: "/portal/organizer",  emoji: "💰", desc: "Organizer dashboard",                      bg: "from-peacock/8 to-peacock/3",       border: "border-peacock/15",   hover: "hover:border-peacock/30"   },
    { label: "Invite Friends", href: "/portal/refer",      emoji: "📲", desc: "Share the vibe",                           bg: "from-marigold/10 to-marigold/3",    border: "border-marigold/20",  hover: "hover:border-marigold/40"  },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
      {actions.map(a => (
        <Link
          key={a.label}
          href={a.href}
          className={`group flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-gradient-to-b ${a.bg} border ${a.border} ${a.hover} transition-all text-center`}
        >
          <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform">
            {a.emoji}
          </div>
          <div>
            <p className="font-ui font-bold text-ink text-[11px] leading-tight">{a.label}</p>
            <p className="font-mono text-[9px] text-ink-muted mt-0.5 leading-tight">{a.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Recommended event card ────────────────────────────────────────────────────

function RecommendedCard({ ev }: { ev: RecommendedEvent }) {
  const initials = ev.title.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const colorIdx = (ev.title.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  const urgencyColor = ev.fillPct >= 85 ? "#D4891B" : "#0E8C7A";

  return (
    <Link href={`/events/${ev.id}`} className="group p-4 rounded-2xl bg-white border border-ivory-200 hover:border-marigold/30 hover:shadow-sm transition-all block">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: AVATAR_COLORS[colorIdx] }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-ink text-sm truncate group-hover:text-aubergine transition-colors">{ev.title}</p>
          <p className="font-mono text-[10px] text-ink-muted">{fmtDateShort(ev.start_date)} · {ev.city}, {ev.state}</p>
        </div>
      </div>
      {ev.fillPct > 0 && (
        <div className="h-1.5 bg-ivory-200 rounded-full overflow-hidden mb-2">
          <div className="h-full rounded-full transition-all" style={{ width: `${ev.fillPct}%`, backgroundColor: urgencyColor }} />
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] text-ink-muted">
          {ev.fillPct > 0 ? `${ev.fillPct}% sold` : "On sale now"}
          {ev.fillPct >= 85 && " · 🔥 Almost gone"}
        </p>
        <p className="font-display font-bold text-ink text-sm">{ev.lowestPrice > 0 ? `From $${ev.lowestPrice}` : "Free"}</p>
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
      const [myOrders, myPending, incoming, { data: eventsRaw }] = await Promise.all([
        loadMyOrders(authUser.id),
        loadMyPendingGroups(authUser.id),
        email ? loadIncomingTransfers(email) : Promise.resolve([]),
        supabase
          .from("events")
          .select("id, title, start_date, city, state, cover_gradient, ticket_tiers (price, quantity, quantity_sold)")
          .eq("status", "published")
          .gte("start_date", today)
          .order("start_date")
          .limit(6),
      ]);
      setOrders(myOrders);
      setPendingGroups(myPending);
      setIncomingTransfers(incoming);
      const myEventIds = new Set(myOrders.map(o => o.eventId));
      const recs: RecommendedEvent[] = ((eventsRaw ?? []) as {
        id: string; title: string; start_date: string; city: string; state: string; cover_gradient: string;
        ticket_tiers: { price: number; quantity: number; quantity_sold: number }[];
      }[])
        .filter(e => !myEventIds.has(e.id)).slice(0, 3)
        .map(e => {
          const tiers = e.ticket_tiers ?? [];
          const prices = tiers.map(t => t.price).filter(p => p > 0);
          const totalQ = tiers.reduce((s, t) => s + t.quantity, 0);
          const totalS = tiers.reduce((s, t) => s + t.quantity_sold, 0);
          return { id: e.id, title: e.title, start_date: e.start_date, city: e.city, state: e.state, cover_gradient: e.cover_gradient, lowestPrice: prices.length > 0 ? Math.min(...prices) : 0, fillPct: totalQ > 0 ? Math.round((totalS / totalQ) * 100) : 0 };
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Hero ── */}
      <div className="rounded-3xl overflow-hidden relative" style={{ background: "linear-gradient(135deg,#1e0f20 0%,#2E1B30 50%,#1a1230 100%)" }}>
        {/* Mandala circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[260, 380, 500, 640].map((s, i) => (
            <div key={i} className="absolute rounded-full border border-white/4" style={{ width: s, height: s, top: "50%", left: "60%", transform: "translate(-50%,-50%)" }} />
          ))}
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-marigold/12 blur-3xl" />
          <div className="absolute bottom-0 left-10 w-44 h-44 rounded-full bg-durga/8 blur-2xl" />
        </div>

        {/* Main row */}
        <div className="relative px-6 py-7 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl overflow-hidden" style={{ backgroundColor: user.avatarColor }}>
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.avatarInitials}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-peacock border-2 border-[#2E1B30] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/30 mb-0.5">
                Member since {new Date(user.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </p>
              <h2 className="font-display font-bold text-white leading-tight truncate" style={{ fontSize: 22, letterSpacing: "-0.025em" }}>
                {greeting(user.firstName)}
              </h2>
              <p className="font-ui text-white/40 text-sm truncate">{user.email}{user.city ? ` · ${user.city}` : ""}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-5 sm:gap-8 shrink-0">
            {[
              { label: "Tickets", value: loading ? "—" : String(totalTickets) },
              { label: "Events",  value: loading ? "—" : String(distinctEvents) },
              { label: "Groups",  value: loading ? "—" : String(new Set(orders.filter(o => o.groupId).map(o => o.groupId)).size) },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="font-display font-bold text-white" style={{ fontSize: 26, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.value}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/25 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Next event big countdown */}
        {nextOrder && <EventCountdown order={nextOrder} />}
      </div>

      {/* ── Hype bar ── */}
      {!loading && <HypeBar />}

      {/* ── Transfer alert ── */}
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

      {/* ── Pending groups ── */}
      {pendingGroups.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-marigold/15 flex items-center justify-center"><span className="text-base">👥</span></div>
            <div>
              <h3 className="font-display font-bold text-ink text-base">Finish Your Group Orders</h3>
              <p className="font-ui text-xs text-ink-muted">You have unpaid group tickets — complete checkout to secure your spot.</p>
            </div>
          </div>
          <div className="space-y-3">
            {pendingGroups.map(g => <PendingGroupCard key={g.groupId} group={g} />)}
          </div>
        </div>
      )}

      {/* ── Tickets + Live Feed (2-column) ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">

          {/* Left: tickets or CTA */}
          <div>
            {!hasTickets ? (
              <div className="rounded-2xl overflow-hidden border border-marigold/25 bg-gradient-to-br from-marigold/8 via-transparent to-aubergine/5">
                <div className="px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5">No tickets yet</p>
                    <h3 className="font-display font-bold text-ink text-xl mb-1" style={{ letterSpacing: "-0.02em" }}>Your first Navratri night is one click away</h3>
                    <p className="font-ui text-sm text-ink-muted leading-relaxed">Browse live events across the US — garba, dandiya, raas, and more. Group discounts up to 15% off.</p>
                  </div>
                  <Link href="/events" className="flex items-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-marigold-dark transition-all shadow-sm whitespace-nowrap shrink-0">
                    Browse events →
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.015em" }}>Upcoming Tickets</h3>
                  <Link href="/portal/tickets" className="font-ui text-sm text-peacock hover:text-peacock/70 transition-colors font-semibold">
                    See all ({orders.length}) →
                  </Link>
                </div>
                {upcoming.length === 0 ? (
                  <div className="rounded-2xl border border-ivory-200 bg-white p-6 text-center">
                    <p className="font-display font-bold text-ink text-base mb-1">No upcoming events</p>
                    <p className="font-ui text-xs text-ink-muted mb-4">All your tickets are for past events. Find your next night out!</p>
                    <Link href="/events" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-marigold text-aubergine font-semibold text-sm hover:bg-marigold-dark transition-all">Browse events →</Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {upcoming.slice(0, 4).map(o => <TicketCard key={o.orderId} order={o} />)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Live feed */}
          <LiveActivityFeed />
        </div>
      )}

      {/* ── Community moments ── */}
      <CommunityMomentsRow />

      {/* ── Quick actions ── */}
      <QuickActions hasTickets={hasTickets} orderCount={orders.length} />

      {/* ── Recommended events ── */}
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

      {/* ── Sponsors ── */}
      <div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted/40 mb-2 px-1">From our community partners</p>
        <div className="rounded-2xl overflow-hidden border border-ivory-200 mb-3">
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
          <div className="px-5 py-2 bg-ivory border-t border-ivory-200">
            <p className="font-mono text-[9px] text-ink-muted">{SPONSOR_ADS[0].sponsor} · {SPONSOR_ADS[0].biz}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SPONSOR_ADS.slice(1).map(ad => (
            <div key={ad.id} className="rounded-2xl overflow-hidden border border-ivory-200">
              <div className="px-5 py-5 flex gap-4" style={{ backgroundColor: ad.color }}>
                <div className="text-3xl">{ad.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: ad.accent, opacity: 0.6 }}>{ad.tag}</p>
                  <p className="font-display font-bold text-base leading-snug mb-1" style={{ color: ad.accent }}>{ad.tagline}</p>
                  <p className="font-ui text-xs mb-3" style={{ color: ad.accent, opacity: 0.6 }}>{ad.desc}</p>
                  <button className="px-4 py-2 rounded-lg font-ui font-semibold text-xs" style={{ backgroundColor: ad.accent, color: ad.color }}>{ad.cta} →</button>
                </div>
              </div>
              <div className="px-4 py-1.5 bg-white border-t border-ivory-200">
                <p className="font-mono text-[9px] text-ink-muted">{ad.sponsor}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
