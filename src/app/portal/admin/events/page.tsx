"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "@/app/portal/organizer/events/create/types";

type EventRow = {
  id: string;
  title: string;
  category: string;
  city: string;
  state: string;
  start_date: string;
  status: string;
  cover_image_url: string | null;
  cover_gradient: string;
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  organizer: { first_name: string | null; last_name: string | null; email: string } | null;
};

type Tab = 'pending' | 'published' | 'rejected' | 'all';

const TAB_META: Record<Tab, { label: string; status?: string; emptyIcon: string; emptyMsg: string }> = {
  pending:   { label: 'Pending Review', status: 'pending_review', emptyIcon: '✅', emptyMsg: 'No events awaiting review.' },
  published: { label: 'Published',      status: 'published',      emptyIcon: '📅', emptyMsg: 'No published events yet.' },
  rejected:  { label: 'Rejected',       status: 'rejected',       emptyIcon: '🗂️', emptyMsg: 'No rejected events.' },
  all:       { label: 'All',                                       emptyIcon: '🎉', emptyMsg: 'No events submitted yet.' },
};

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  draft:          { label: 'Draft',     cls: 'bg-ivory-200 text-ink-muted' },
  pending_review: { label: 'In Review', cls: 'bg-marigold/20 text-[#a06b00]' },
  published:      { label: 'Published', cls: 'bg-peacock/15 text-peacock' },
  rejected:       { label: 'Rejected',  cls: 'bg-durga/15 text-durga' },
  cancelled:      { label: 'Cancelled', cls: 'bg-ivory-200 text-ink-muted' },
};

const CATEGORY_LABELS: Record<string, string> = {
  garba: 'Garba', dandiya: 'Dandiya', raas: 'Raas', workshop: 'Workshop', community: 'Community', other: 'Other',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents]   = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<Tab>('pending');
  const [acting, setActing]   = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from('events')
      .select(`
        id, title, category, city, state, start_date, status,
        cover_image_url, cover_gradient, created_at, reviewed_at, review_note,
        organizer:profiles!events_organizer_id_fkey (first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });
    setEvents((data ?? []) as unknown as EventRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function quickApprove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setActing(id);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('events').update({
      status: 'published',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
      review_note: null,
    }).eq('id', id);
    await load();
    setActing(null);
  }

  async function quickReject(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/portal/admin/events/${id}`);
  }

  const tabEvents = tab === 'all'
    ? events
    : events.filter(e => e.status === TAB_META[tab].status);

  const pendingCount = events.filter(e => e.status === 'pending_review').length;

  const TABS: Tab[] = ['pending', 'published', 'rejected', 'all'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: '-0.02em' }}>Event Review</h2>
        <p className="font-ui text-ink-muted text-sm mt-0.5">
          {loading ? '—' : `${events.length} total · ${pendingCount} awaiting review`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-ivory rounded-2xl p-1 w-fit border border-ivory-200">
        {TABS.map(t => {
          const meta = TAB_META[t];
          const count = t === 'all' ? events.length : events.filter(e => e.status === meta.status).length;
          return (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-ui font-semibold text-sm transition-all whitespace-nowrap ${
                tab === t ? 'bg-white text-ink shadow-sm border border-ivory-200' : 'text-ink-muted hover:text-ink'
              }`}>
              {meta.label}
              {count > 0 && (
                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full ${
                  t === 'pending' ? 'bg-marigold text-aubergine' : 'bg-ivory-200 text-ink-muted'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : tabEvents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ivory-200 p-16 text-center">
          <div className="text-4xl mb-3">{TAB_META[tab].emptyIcon}</div>
          <p className="font-ui text-ink-muted text-sm">{TAB_META[tab].emptyMsg}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tabEvents.map(ev => {
            const gradient = GRADIENTS.find(g => g.id === ev.cover_gradient) ?? GRADIENTS[0];
            const pill = STATUS_PILL[ev.status] ?? STATUS_PILL.draft;
            const organizer = ev.organizer;
            const orgName = [organizer?.first_name, organizer?.last_name].filter(Boolean).join(' ') || organizer?.email || '—';
            const isPending = ev.status === 'pending_review';
            const isActing  = acting === ev.id;

            return (
              <div
                key={ev.id}
                onClick={() => router.push(`/portal/admin/events/${ev.id}`)}
                className={`bg-white rounded-2xl border overflow-hidden flex cursor-pointer transition-all hover:shadow-sm ${
                  isPending ? 'border-marigold/30 hover:border-marigold/50' : 'border-ivory-200 hover:border-aubergine/25'
                }`}
              >
                {/* Thumbnail */}
                <div className="w-20 sm:w-28 shrink-0 relative"
                  style={{ background: ev.cover_image_url ? undefined : gradient.css }}>
                  {ev.cover_image_url && (
                    <img src={ev.cover_image_url} alt={ev.title} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  {isPending && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-marigold rounded-full animate-pulse shadow-lg" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 px-4 py-3.5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${pill.cls}`}>
                        {pill.label}
                      </span>
                      <span className="font-mono text-[9px] text-ink-muted uppercase tracking-widest">
                        {CATEGORY_LABELS[ev.category] ?? ev.category}
                      </span>
                    </div>
                    <p className="font-display font-semibold text-ink text-base truncate" style={{ letterSpacing: '-0.015em' }}>
                      {ev.title}
                    </p>
                    <p className="font-ui text-xs text-ink-muted mt-0.5">
                      {ev.city}, {ev.state} · {fmtDate(ev.start_date)}
                    </p>
                    <p className="font-ui text-xs text-ink-muted/70 mt-0.5 truncate">
                      By {orgName} · Submitted {fmtDate(ev.created_at)}
                    </p>
                    {ev.review_note && (
                      <p className="font-ui text-xs text-durga mt-1 truncate">
                        Rejection note: {ev.review_note}
                      </p>
                    )}
                  </div>

                  {/* Quick actions for pending */}
                  {isPending && (
                    <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => quickApprove(ev.id, e)}
                        disabled={isActing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-peacock/10 border border-peacock/20 text-peacock font-ui font-semibold text-xs hover:bg-peacock/20 transition-colors disabled:opacity-50"
                      >
                        {isActing ? (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-peacock/30 border-t-peacock animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        )}
                        Approve
                      </button>
                      <button
                        onClick={e => quickReject(ev.id, e)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-durga/8 border border-durga/20 text-durga font-ui font-semibold text-xs hover:bg-durga/15 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        Review
                      </button>
                    </div>
                  )}

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
