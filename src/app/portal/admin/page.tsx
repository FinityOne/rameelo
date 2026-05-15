"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Stats = {
  totalUsers: number; members: number; organizers: number; admins: number;
  totalEvents: number; pendingEvents: number; publishedEvents: number;
};

export default function AdminPanelPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("profiles").select("role"),
      supabase.from("events").select("status"),
    ]).then(([profiles, events]) => {
      const p = profiles.data ?? [];
      const ev = events.data ?? [];
      setStats({
        totalUsers:     p.length,
        members:        p.filter(x => x.role === "user").length,
        organizers:     p.filter(x => x.role === "organizer").length,
        admins:         p.filter(x => x.role === "admin").length,
        totalEvents:    ev.length,
        pendingEvents:  ev.filter(x => x.status === "pending_review").length,
        publishedEvents:ev.filter(x => x.status === "published").length,
      });
    });
  }, []);

  const loading = stats === null;
  const hasPending = (stats?.pendingEvents ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Pending review alert */}
      {hasPending && (
        <button
          onClick={() => router.push("/portal/admin/events")}
          className="w-full rounded-2xl bg-marigold/10 border border-marigold/30 px-5 py-4 flex items-center gap-4 hover:bg-marigold/15 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-marigold/20 border border-marigold/30 flex items-center justify-center shrink-0">
            <div className="w-3 h-3 bg-marigold rounded-full animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: '-0.01em' }}>
              {stats!.pendingEvents} event{stats!.pendingEvents !== 1 ? 's' : ''} awaiting review
            </p>
            <p className="font-ui text-xs text-ink-muted">Click to open the review queue and approve or reject submissions.</p>
          </div>
          <svg className="w-4 h-4 text-ink-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* User stats */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Users</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: loading ? "—" : stats!.totalUsers, color: "text-ink" },
            { label: "Members",    value: loading ? "—" : stats!.members,    color: "text-aubergine" },
            { label: "Organizers", value: loading ? "—" : stats!.organizers, color: "text-peacock" },
            { label: "Admins",     value: loading ? "—" : stats!.admins,     color: "text-durga" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-ivory-200 p-5 text-center">
              <p className={`font-display font-bold text-3xl ${s.color}`} style={{ letterSpacing: '-0.03em' }}>{s.value}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Event stats */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Events</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total",     value: loading ? "—" : stats!.totalEvents,     color: "text-ink",      href: "/portal/admin/events" },
            { label: "Pending",   value: loading ? "—" : stats!.pendingEvents,   color: "text-[#a06b00]", href: "/portal/admin/events" },
            { label: "Published", value: loading ? "—" : stats!.publishedEvents, color: "text-peacock",   href: "/portal/admin/events" },
          ].map(s => (
            <button key={s.label} onClick={() => router.push(s.href)}
              className="bg-white rounded-2xl border border-ivory-200 p-5 text-center hover:border-aubergine/30 hover:shadow-sm transition-all">
              <p className={`font-display font-bold text-3xl ${s.color}`} style={{ letterSpacing: '-0.03em' }}>{s.value}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mt-1">{s.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Quick Actions</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: "Event Review",      desc: "Approve or reject submitted events",  href: "/portal/admin/events",   icon: "🔍", highlight: hasPending },
            { label: "Artists",           desc: "Manage the performer roster",          href: "/portal/admin/artists",  icon: "🎤", highlight: false },
            { label: "User Management",   desc: "View all users and update roles",      href: "/portal/admin/users",    icon: "👥", highlight: false },
            { label: "Platform Settings", desc: "App-wide toggles and configuration",  href: "/portal/admin/platform", icon: "⚙️", highlight: false },
          ].map(card => (
            <button key={card.href} onClick={() => router.push(card.href)}
              className={`rounded-2xl border p-5 text-left hover:shadow-sm transition-all flex items-start gap-4 ${
                card.highlight ? 'bg-marigold/6 border-marigold/25 hover:border-marigold/40' : 'bg-white border-ivory-200 hover:border-aubergine/25'
              }`}>
              <span className="text-2xl shrink-0">{card.icon}</span>
              <div>
                <p className="font-display font-semibold text-ink text-sm mb-0.5" style={{ letterSpacing: '-0.01em' }}>{card.label}</p>
                <p className="font-ui text-ink-muted text-xs">{card.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
