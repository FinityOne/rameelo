"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "./create/types";
import { useOrg } from "../org-context";

type Event = {
  id: string;
  title: string;
  category: string;
  artist: string | null;
  start_date: string;
  end_date: string | null;
  city: string;
  state: string;
  status: string;
  cover_image_url: string | null;
  cover_gradient: string;
  created_at: string;
};

type Bucket = "active" | "draft" | "past";

// Active = live/in-review & upcoming · Draft = draft/rejected & upcoming · Past = date passed or cancelled
function bucketOf(e: Event, today: string): Bucket {
  const lastDay = e.end_date ?? e.start_date;
  if (e.status === "cancelled" || lastDay < today) return "past";
  if (e.status === "draft" || e.status === "rejected") return "draft";
  return "active";
}

const TABS: { key: Bucket; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "draft",  label: "Drafts" },
  { key: "past",   label: "Past" },
];

const EMPTY_COPY: Record<Bucket, { icon: string; title: string; body: string }> = {
  active: { icon: "🎉", title: "No active events", body: "Published, upcoming events show here. Create one or publish a draft." },
  draft:  { icon: "📝", title: "No drafts", body: "Events you're still building (or that need changes) live here." },
  past:   { icon: "📦", title: "No past events", body: "Wrapped-up and cancelled events are archived here." },
};

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  draft:          { label: 'Draft',          cls: 'bg-ivory-200 text-ink-muted' },
  pending_review: { label: 'In Review',      cls: 'bg-marigold/20 text-[#a06b00]' },
  published:      { label: 'Published',      cls: 'bg-peacock/15 text-peacock' },
  rejected:       { label: 'Rejected',       cls: 'bg-durga/15 text-durga' },
  cancelled:      { label: 'Cancelled',      cls: 'bg-ivory-200 text-ink-muted' },
};

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OrganizerEventsPage() {
  const router = useRouter();
  const { activeOrg } = useOrg();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Bucket>("active");

  useEffect(() => {
    setLoading(true);
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const q = supabase
        .from('events')
        .select('id, title, category, artist, start_date, end_date, city, state, status, cover_image_url, cover_gradient, created_at')
        .order('start_date', { ascending: false });
      const { data } = await (activeOrg
        ? q.eq('org_id', activeOrg.id)
        : q.eq('organizer_id', user.id));
      setEvents((data as Event[]) ?? []);
      setLoading(false);
    }
    load();
  }, [activeOrg]);

  const today = new Date().toISOString().slice(0, 10);
  const counts = useMemo(() => {
    const c: Record<Bucket, number> = { active: 0, draft: 0, past: 0 };
    for (const e of events) c[bucketOf(e, today)]++;
    return c;
  }, [events, today]);

  // Active/Drafts soonest-first; Past most-recent-first
  const visible = useMemo(() => {
    const list = events.filter(e => bucketOf(e, today) === tab);
    return list.sort((a, b) => tab === "past" ? b.start_date.localeCompare(a.start_date) : a.start_date.localeCompare(b.start_date));
  }, [events, tab, today]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: '-0.02em' }}>Events</h2>
          {!loading && <p className="font-ui text-ink-muted text-sm mt-0.5">{events.length} event{events.length !== 1 ? 's' : ''}</p>}
        </div>
        <Link
          href="/organizer/events/create"
          className="flex items-center gap-2 bg-aubergine text-white font-ui font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-aubergine-light transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Create event
        </Link>
      </div>

      {/* Active / Drafts / Past tabs */}
      {!loading && events.length > 0 && (
        <div className="flex gap-1 bg-ivory rounded-2xl p-1 w-fit border border-ivory-200">
          {TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-ui font-semibold text-sm transition-all ${
                tab === t.key ? 'bg-white text-ink shadow-sm border border-ivory-200' : 'text-ink-muted hover:text-ink'
              }`}>
              {t.label}
              {counts[t.key] > 0 && (
                <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-marigold/20 text-marigold-dark' : 'bg-ivory-200 text-ink-muted'}`}>
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : events.length === 0 ? (
        /* First-run empty state */
        <div className="bg-white rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-marigold/10 border border-marigold/20 flex items-center justify-center mx-auto mb-4 text-3xl">🎉</div>
          <p className="font-display font-semibold text-ink text-xl mb-2" style={{ letterSpacing: '-0.015em' }}>Create your first event</p>
          <p className="font-ui text-ink-muted text-sm max-w-xs mx-auto mb-6">Build your Navratri event in minutes — multi-step, polished, and built for the garba community.</p>
          <Link href="/organizer/events/create"
            className="inline-flex items-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-marigold-dark transition-colors shadow-sm">
            Get started →
          </Link>
        </div>
      ) : visible.length === 0 ? (
        /* Empty for the selected tab */
        <div className="bg-white rounded-2xl border-2 border-dashed border-ivory-200 p-14 text-center">
          <div className="text-3xl mb-3">{EMPTY_COPY[tab].icon}</div>
          <p className="font-display font-semibold text-ink text-lg mb-1" style={{ letterSpacing: '-0.015em' }}>{EMPTY_COPY[tab].title}</p>
          <p className="font-ui text-ink-muted text-sm max-w-xs mx-auto">{EMPTY_COPY[tab].body}</p>
        </div>
      ) : (
        /* Events grid */
        <div className="space-y-3">
          {visible.map(ev => {
            const gradient = GRADIENTS.find(g => g.id === ev.cover_gradient) ?? GRADIENTS[0];
            const status = STATUS_STYLES[ev.status] ?? STATUS_STYLES.draft;
            return (
              <div
                key={ev.id}
                onClick={() => router.push(`/organizer/events/${ev.id}`)}
                className="bg-white rounded-2xl border border-ivory-200 overflow-hidden hover:border-aubergine/30 hover:shadow-sm transition-all cursor-pointer flex"
              >
                {/* Cover thumbnail */}
                <div
                  className="w-24 sm:w-32 shrink-0 relative"
                  style={{ background: ev.cover_image_url ? undefined : gradient.css }}
                >
                  {ev.cover_image_url && (
                    <img src={ev.cover_image_url} alt={ev.title} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  {!ev.cover_image_url && (
                    <div className="absolute bottom-2 left-2">
                      <p className="font-mono text-[8px] text-white/60 uppercase tracking-wide">{gradient.label}</p>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 px-5 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                    </div>
                    <p className="font-display font-semibold text-ink text-base truncate" style={{ letterSpacing: '-0.015em' }}>{ev.title}</p>
                    <p className="font-ui text-xs text-ink-muted mt-0.5">
                      {fmtDate(ev.start_date)} · {ev.city}, {ev.state}
                      {ev.artist ? ` · ${ev.artist}` : ''}
                    </p>
                  </div>

                  <svg className="w-4 h-4 text-ink-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
