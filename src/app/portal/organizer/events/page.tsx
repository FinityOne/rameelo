"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "./create/types";

type Event = {
  id: string;
  title: string;
  category: string;
  artist: string | null;
  start_date: string;
  city: string;
  state: string;
  status: string;
  cover_image_url: string | null;
  cover_gradient: string;
  created_at: string;
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
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('events')
        .select('id, title, category, artist, start_date, city, state, status, cover_image_url, cover_gradient, created_at')
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false });
      setEvents((data as Event[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: '-0.02em' }}>My Events</h2>
          {!loading && <p className="font-ui text-ink-muted text-sm mt-0.5">{events.length} event{events.length !== 1 ? 's' : ''}</p>}
        </div>
        <Link
          href="/portal/organizer/events/create"
          className="flex items-center gap-2 bg-aubergine text-white font-ui font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-aubergine-light transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Create event
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : events.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-marigold/10 border border-marigold/20 flex items-center justify-center mx-auto mb-4 text-3xl">🎉</div>
          <p className="font-display font-semibold text-ink text-xl mb-2" style={{ letterSpacing: '-0.015em' }}>Create your first event</p>
          <p className="font-ui text-ink-muted text-sm max-w-xs mx-auto mb-6">Build your Navratri event in minutes — multi-step, polished, and built for the garba community.</p>
          <Link href="/portal/organizer/events/create"
            className="inline-flex items-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-marigold-dark transition-colors shadow-sm">
            Get started →
          </Link>
        </div>
      ) : (
        /* Events grid */
        <div className="space-y-3">
          {events.map(ev => {
            const gradient = GRADIENTS.find(g => g.id === ev.cover_gradient) ?? GRADIENTS[0];
            const status = STATUS_STYLES[ev.status] ?? STATUS_STYLES.draft;
            return (
              <div
                key={ev.id}
                onClick={() => router.push(`/portal/organizer/events/${ev.id}`)}
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
