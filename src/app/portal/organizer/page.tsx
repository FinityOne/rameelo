"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Stats = {
  eventsPublished: number;
  ticketsSold: number;
  grossRevenue: number;
  hasAnyEvent: boolean;
};

export default function OrganizerHubPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: events } = await supabase
        .from('events')
        .select('id, status')
        .eq('organizer_id', user.id);

      const hasAnyEvent = (events?.length ?? 0) > 0;
      const eventsPublished = events?.filter(e => e.status === 'published').length ?? 0;

      setStats({ eventsPublished, ticketsSold: 0, grossRevenue: 0, hasAnyEvent });
    }
    load();
  }, []);

  const STAT_CARDS = [
    { label: "Events Published", value: stats ? String(stats.eventsPublished) : "—", icon: "📅", hint: "Live events on Rameelo" },
    { label: "Total Tickets Sold", value: stats ? String(stats.ticketsSold) : "—", icon: "🎟️", hint: "Across all events" },
    { label: "Gross Revenue", value: stats ? `$${stats.grossRevenue.toLocaleString()}` : "—", icon: "💰", hint: "After platform fees" },
  ];

  const showGate = stats !== null && !stats.hasAnyEvent;

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: '-0.02em' }}>Organizer Hub</h2>
        <p className="font-ui text-ink-muted text-sm mt-0.5">Manage your events, track sales, and grow your audience.</p>
      </div>

      {/* Stats — blurred when no events */}
      <div className="relative">
        <div className={`grid sm:grid-cols-3 gap-4 transition-all duration-300 ${showGate ? 'blur-sm pointer-events-none select-none' : ''}`}>
          {STAT_CARDS.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-ivory-200 p-6">
              <p className="text-2xl mb-3">{stat.icon}</p>
              <p className="font-display font-bold text-ink text-3xl" style={{ letterSpacing: '-0.02em' }}>{stat.value}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mt-1">{stat.label}</p>
              <p className="font-ui text-xs text-ink-muted/60 mt-1">{stat.hint}</p>
            </div>
          ))}
        </div>

        {/* Gate overlay */}
        {showGate && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur-md border border-ivory-200 rounded-2xl shadow-xl px-8 py-7 text-center max-w-sm w-full mx-4">
              <div className="w-14 h-14 rounded-2xl bg-marigold/15 border border-marigold/25 flex items-center justify-center mx-auto mb-4 text-2xl">
                🎉
              </div>
              <p className="font-display font-bold text-ink text-lg mb-1.5" style={{ letterSpacing: '-0.02em' }}>
                Your dashboard awaits
              </p>
              <p className="font-ui text-ink-muted text-sm leading-relaxed mb-5">
                Create your first event to unlock ticket sales, revenue tracking, and your organizer analytics.
              </p>
              <Link
                href="/portal/organizer/events/create"
                className="inline-flex items-center gap-2 bg-aubergine text-white font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-aubergine-light transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Create your first event
              </Link>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted/50 mt-4">
                Takes less than 5 minutes
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions — always visible */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/portal/organizer/events"
          className="bg-white rounded-2xl border border-ivory-200 p-5 flex items-center gap-4 hover:border-aubergine/30 hover:shadow-sm transition-all group"
        >
          <div className="w-11 h-11 rounded-xl bg-aubergine/10 border border-aubergine/15 flex items-center justify-center shrink-0 group-hover:bg-aubergine/15 transition-colors">
            <svg className="w-5 h-5 text-aubergine" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: '-0.01em' }}>My Events</p>
            <p className="font-ui text-xs text-ink-muted mt-0.5">View, edit, and manage all your events</p>
          </div>
          <svg className="w-4 h-4 text-ink-muted shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" /></svg>
        </Link>

        <Link
          href="/portal/organizer/events/create"
          className="bg-marigold/5 rounded-2xl border border-marigold/20 p-5 flex items-center gap-4 hover:border-marigold/40 hover:bg-marigold/10 transition-all group"
        >
          <div className="w-11 h-11 rounded-xl bg-marigold/20 border border-marigold/30 flex items-center justify-center shrink-0 group-hover:bg-marigold/30 transition-colors">
            <svg className="w-5 h-5 text-aubergine" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: '-0.01em' }}>Create Event</p>
            <p className="font-ui text-xs text-ink-muted mt-0.5">Build and submit a new event for review</p>
          </div>
          <svg className="w-4 h-4 text-ink-muted shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" /></svg>
        </Link>
      </div>

      {/* Upcoming tip */}
      {!showGate && (
        <div className="rounded-xl bg-ivory border border-ivory-200 p-4 flex gap-3">
          <span className="text-lg shrink-0">💡</span>
          <p className="font-ui text-xs text-ink-muted leading-relaxed">
            <strong className="text-ink">Tip:</strong> Events submitted for review are typically approved within 24 hours. You can continue editing while your event is in review.
          </p>
        </div>
      )}
    </div>
  );
}
