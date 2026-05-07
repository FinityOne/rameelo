"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUser, SEEDED_TICKETS, type RameeloUser, type PortalTicket } from "@/lib/auth";

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

export default function PortalDashboard() {
  const [user, setUser] = useState<RameeloUser | null>(null);
  const [tickets, setTickets] = useState<PortalTicket[]>([]);

  useEffect(() => {
    setUser(getUser());
    setTickets(SEEDED_TICKETS);
  }, []);

  if (!user) return null;

  const upcoming = tickets.filter((t) => t.dateISO >= "2026-05-07").sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const nextEvent = upcoming[0];
  const daysUntil = nextEvent ? Math.ceil((new Date(nextEvent.dateISO).getTime() - Date.now()) / 86400000) : null;

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
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0" style={{ backgroundColor: user.avatarColor }}>
              {user.avatarInitials}
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-0.5">Member since {new Date(user.joinedAt).toLocaleDateString("en-US",{month:"short",year:"numeric"})}</p>
              <h2 className="font-display font-bold text-white text-xl leading-tight">{user.firstName} {user.lastName}</h2>
              <p className="font-ui text-white/50 text-sm">{user.email} · {user.city || "Member"}</p>
            </div>
          </div>
          <div className="relative flex gap-6 sm:gap-8 shrink-0">
            {[
              { label: "Tickets", value: user.ticketsCount },
              { label: "Events", value: user.eventsAttended },
              { label: "Groups", value: 1 },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display font-bold text-white text-2xl">{s.value}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/30">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Next event countdown */}
        {nextEvent && daysUntil !== null && (
          <div className="border-t border-white/8 px-6 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-marigold/20 flex items-center justify-center">
                <span className="text-marigold text-sm">🎶</span>
              </div>
              <div>
                <p className="font-display font-bold text-white text-sm">{nextEvent.eventTitle}</p>
                <p className="font-mono text-[10px] text-white/40">{nextEvent.date} · {nextEvent.city}, {nextEvent.state}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-center px-3 py-1.5 rounded-xl bg-marigold/15 border border-marigold/25">
                <p className="font-display font-bold text-marigold text-xl leading-none">{daysUntil}</p>
                <p className="font-mono text-[9px] uppercase tracking-wide text-marigold/60">days away</p>
              </div>
              <Link href="/portal/tickets" className="px-3 py-2 rounded-xl bg-marigold text-aubergine font-ui font-semibold text-xs hover:bg-marigold-dark transition-all whitespace-nowrap">
                View ticket →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Upcoming tickets (quick strip) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-ink text-lg">Upcoming Tickets</h3>
          <Link href="/portal/tickets" className="font-ui text-sm text-marigold-dark hover:text-marigold transition-colors">See all ({tickets.length}) →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {upcoming.map((ticket) => (
            <Link
              key={ticket.orderId}
              href="/portal/tickets"
              className="group flex items-center gap-3 p-4 rounded-2xl bg-white border border-ivory-200 hover:border-marigold/30 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: ticket.artistColor }}>
                {ticket.artist.split(" ").map((w) => w[0]).join("").slice(0,2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-ink text-xs truncate group-hover:text-aubergine transition-colors">{ticket.eventTitle}</p>
                <p className="font-mono text-[10px] text-ink-muted">{ticket.date}</p>
                <p className="font-mono text-[10px] text-ink-muted">{ticket.city}, {ticket.state} · {ticket.qty} ticket{ticket.qty > 1 ? "s" : ""}</p>
              </div>
              <QRMini value={ticket.orderId} />
            </Link>
          ))}
        </div>
      </div>

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
            <p className="font-ui text-sm mb-0" style={{ color: SPONSOR_ADS[0].accent, opacity: 0.7 }}>{SPONSOR_ADS[0].desc}</p>
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
          { label: "Find Events", href: "/events", icon: "🔍", desc: "100+ events" },
          { label: "Group Order", href: "/events", icon: "👥", desc: "Save up to 15%" },
          { label: "My Tickets", href: "/portal/tickets", icon: "🎟️", desc: `${tickets.length} upcoming` },
          { label: "Invite Friend", href: "/events", icon: "📲", desc: "Share the vibe" },
        ].map((a) => (
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
        {SPONSOR_ADS.slice(1).map((ad) => (
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

      {/* ── Recommended events ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-ink text-lg">Recommended for you</h3>
          <Link href="/events" className="font-ui text-sm text-marigold-dark hover:text-marigold transition-colors">Browse all →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: "Kinjal Dave — Bay Area", date: "Oct 10, 2026", city: "San Jose, CA", price: 70, pct: 62, color: "#F5A623" },
            { title: "Hemant Chauhan — Houston", date: "Oct 07, 2026", city: "Houston, TX", price: 55, pct: 44, color: "#D4891B" },
            { title: "Osman Mir — Edison Navratri", date: "Oct 03, 2026", city: "Edison, NJ", price: 80, pct: 88, color: "#0a4f46" },
          ].map((e) => (
            <Link
              key={e.title}
              href="/events"
              className="group p-4 rounded-2xl bg-white border border-ivory-200 hover:border-marigold/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: e.color }}>
                  {e.title.split(" ").slice(0,2).map(w=>w[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-ink text-sm truncate group-hover:text-aubergine transition-colors">{e.title}</p>
                  <p className="font-mono text-[10px] text-ink-muted">{e.date} · {e.city}</p>
                </div>
              </div>
              <div className="h-1 bg-ivory-200 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full" style={{ width: `${e.pct}%`, backgroundColor: e.pct >= 85 ? "#D4891B" : "#0E8C7A" }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] text-ink-muted">{e.pct}% sold</p>
                <p className="font-display font-bold text-ink text-sm">${e.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
