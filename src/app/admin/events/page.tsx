"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type EventRow = {
  id: string;
  title: string;
  category: string;
  artist: string | null;
  city: string | null;
  state: string | null;
  start_date: string;
  status: string;
  created_at: string;
  location_tba: boolean;
  selling_on_rameelo: boolean;
  organizer: { first_name: string | null; last_name: string | null; email: string } | null;
  organization: { name: string } | null;
  ticket_tiers: { price: number; quantity: number }[];
};

type Tab = 'published' | 'draft' | 'cancelled' | 'all';

const TAB_META: Record<Tab, { label: string; status?: string }> = {
  published: { label: 'Published', status: 'published' },
  draft:     { label: 'Draft',     status: 'draft' },
  cancelled: { label: 'Cancelled', status: 'cancelled' },
  all:       { label: 'All' },
};

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  draft:          { label: 'Draft',     cls: 'bg-ivory-200 text-ink-muted' },
  pending_review: { label: 'Pending',   cls: 'bg-marigold/20 text-[#a06b00]' },
  published:      { label: 'Published', cls: 'bg-peacock/15 text-peacock' },
  rejected:       { label: 'Rejected', cls: 'bg-durga/15 text-durga' },
  cancelled:      { label: 'Cancelled', cls: 'bg-ivory-200 text-ink-muted' },
};

const CATEGORY_LABELS: Record<string, string> = {
  garba: 'Garba', dandiya: 'Dandiya', raas: 'Raas', workshop: 'Workshop', community: 'Community', other: 'Other',
};

const PAGE_SIZE = 12;
const GRID_COLS = 'minmax(0,2.4fr) 100px 92px 130px 120px 64px 100px';

function fmtDateShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents]   = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<Tab>('published');

  // Filters
  const [search, setSearch]           = useState('');
  const [filterCat, setFilterCat]     = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterArtist, setFilterArtist] = useState('');
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [page, setPage] = useState(1);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from('events')
      .select(`
        id, title, category, artist, city, state, start_date, status,
        created_at, location_tba, selling_on_rameelo,
        organizer:profiles!events_organizer_id_fkey (first_name, last_name, email),
        organization:organizations (name),
        ticket_tiers (price, quantity)
      `)
      .order('start_date', { ascending: true });
    setEvents((data ?? []) as unknown as EventRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Reset page when tab or filters change
  useEffect(() => { setPage(1); }, [tab, search, filterCat, filterState, filterArtist]);

  const pendingCount = events.filter(e => e.status === 'pending_review').length;
  const TABS: Tab[] = ['published', 'draft', 'cancelled', 'all'];

  // Derived filter options
  const allCategories = useMemo(() => Array.from(new Set(events.map(e => e.category))).sort(), [events]);
  const allStates     = useMemo(() => Array.from(new Set(events.map(e => e.state).filter(Boolean) as string[])).sort(), [events]);
  const allArtists    = useMemo(() => Array.from(new Set(events.map(e => e.artist).filter(Boolean) as string[])).sort(), [events]);

  const filtered = useMemo(() => {
    let result = tab === 'all' ? events : events.filter(e => e.status === TAB_META[tab].status);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.city ?? '').toLowerCase().includes(q) ||
        (e.state ?? '').toLowerCase().includes(q) ||
        (e.artist ?? '').toLowerCase().includes(q) ||
        (e.organization?.name ?? '').toLowerCase().includes(q) ||
        [e.organizer?.first_name, e.organizer?.last_name].filter(Boolean).join(' ').toLowerCase().includes(q) ||
        (e.organizer?.email ?? '').toLowerCase().includes(q)
      );
    }
    if (filterCat)    result = result.filter(e => e.category === filterCat);
    if (filterState)  result = result.filter(e => e.state === filterState);
    if (filterArtist) result = result.filter(e => e.artist === filterArtist);

    result = [...result].sort((a, b) => {
      const diff = a.start_date.localeCompare(b.start_date);
      return sortDir === 'asc' ? diff : -diff;
    });

    return result;
  }, [events, tab, search, filterCat, filterState, filterArtist, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = search || filterCat || filterState || filterArtist;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: '-0.02em' }}>All Events</h2>
          <p className="font-ui text-ink-muted text-sm mt-0.5">
            {loading ? '—' : `${events.length} event${events.length !== 1 ? 's' : ''} across the platform`}
          </p>
        </div>
        <Link
          href="/admin/events/create"
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:bg-aubergine/90 active:scale-[0.98] transition-all shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Create Event
        </Link>
      </div>

      {/* Pending-review banner — routes triage to the dedicated queue */}
      {!loading && pendingCount > 0 && (
        <Link href="/admin/events/review"
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-marigold/30 bg-marigold/8 hover:bg-marigold/12 transition-colors group">
          <span className="w-9 h-9 rounded-xl bg-marigold/20 flex items-center justify-center text-base shrink-0">🔍</span>
          <div className="flex-1 min-w-0">
            <p className="font-ui font-semibold text-ink text-sm">
              {pendingCount} event{pendingCount !== 1 ? 's' : ''} awaiting review
            </p>
            <p className="font-ui text-xs text-ink-muted">Approve or reject submissions in the Review Queue.</p>
          </div>
          <span className="flex items-center gap-1 font-ui font-semibold text-sm text-[#a06b00] shrink-0">
            Review now
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </span>
        </Link>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-ivory rounded-2xl p-1 w-fit border border-ivory-200">
        {TABS.map(t => {
          const meta = TAB_META[t];
          const count = t === 'all' ? events.length : events.filter(e => e.status === meta.status).length;
          return (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-ui font-semibold text-sm transition-all whitespace-nowrap ${
                tab === t ? 'bg-white text-ink shadow-sm border border-ivory-200' : 'text-ink-muted hover:text-ink'
              }`}>
              {meta.label}
              {count > 0 && (
                <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-ivory-200 text-ink-muted">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title, artist, organizer, org…"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-ivory-200 bg-white font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
          />
        </div>

        {/* Category */}
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className={`px-3 py-2 rounded-xl border font-ui text-sm transition-all focus:outline-none focus:ring-2 focus:ring-aubergine/20 ${filterCat ? 'border-aubergine/40 bg-aubergine/5 text-aubergine font-semibold' : 'border-ivory-200 bg-white text-ink-muted'}`}
        >
          <option value="">All categories</option>
          {allCategories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
        </select>

        {/* State */}
        <select
          value={filterState}
          onChange={e => setFilterState(e.target.value)}
          className={`px-3 py-2 rounded-xl border font-ui text-sm transition-all focus:outline-none focus:ring-2 focus:ring-aubergine/20 ${filterState ? 'border-aubergine/40 bg-aubergine/5 text-aubergine font-semibold' : 'border-ivory-200 bg-white text-ink-muted'}`}
        >
          <option value="">All states</option>
          {allStates.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Artist */}
        {allArtists.length > 0 && (
          <select
            value={filterArtist}
            onChange={e => setFilterArtist(e.target.value)}
            className={`px-3 py-2 rounded-xl border font-ui text-sm transition-all focus:outline-none focus:ring-2 focus:ring-aubergine/20 ${filterArtist ? 'border-aubergine/40 bg-aubergine/5 text-aubergine font-semibold' : 'border-ivory-200 bg-white text-ink-muted'}`}
          >
            <option value="">All artists</option>
            {allArtists.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}

        {/* Date sort */}
        <button
          type="button"
          onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-ivory-200 bg-white font-ui text-sm text-ink-muted hover:text-ink hover:border-aubergine/30 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {sortDir === 'asc' ? 'Soonest first' : 'Latest first'}
        </button>

        {/* Clear filters */}
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(''); setFilterCat(''); setFilterState(''); setFilterArtist(''); }}
            className="px-3 py-2 rounded-xl font-ui text-sm text-ink-muted hover:text-durga transition-colors"
          >
            Clear filters
          </button>
        )}

        {/* Results count */}
        {!loading && (
          <span className="ml-auto font-mono text-[10px] text-ink-muted">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ivory-200 p-16 text-center">
          <p className="text-3xl mb-3">{hasFilters ? '🔍' : '📅'}</p>
          <p className="font-ui text-ink-muted text-sm">
            {hasFilters ? 'No events match your filters.' : 'No events here yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          {/* Table header */}
          <div className="grid items-center px-4 py-2 border-b border-ivory-200 bg-ivory/60"
            style={{ gridTemplateColumns: GRID_COLS }}>
            {['Event', 'Location', 'Date', 'Organizer', 'Capacity', 'Mode', ''].map((h, i) => (
              <p key={i} className={`font-mono text-[9px] uppercase tracking-widest text-ink-muted ${i >= 4 && i <= 5 ? 'text-right' : ''}`}>{h}</p>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-ivory-200">
            {paginated.map(ev => {
              const pill     = STATUS_PILL[ev.status] ?? STATUS_PILL.draft;
              const orgName  = [ev.organizer?.first_name, ev.organizer?.last_name].filter(Boolean).join(' ') || ev.organizer?.email || '—';
              const location = ev.location_tba ? 'TBA' : [ev.city, ev.state].filter(Boolean).join(', ') || '—';
              const capacity = ev.ticket_tiers.reduce((s, t) => s + t.quantity, 0);
              const prices   = ev.ticket_tiers.map(t => t.price);
              const minP     = prices.length ? Math.min(...prices) : 0;
              const maxP     = prices.length ? Math.max(...prices) : 0;
              const isPast   = ev.start_date < today;
              const subline  = [CATEGORY_LABELS[ev.category] ?? ev.category, ev.artist, ev.organization?.name].filter(Boolean).join(' · ');

              return (
                <div
                  key={ev.id}
                  onClick={() => router.push(`/admin/events/${ev.id}`)}
                  className="grid items-center px-4 py-2.5 cursor-pointer transition-colors hover:bg-ivory/50"
                  style={{ gridTemplateColumns: GRID_COLS }}
                >
                  {/* Event title + status + subline */}
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0 ${pill.cls}`}>
                        {pill.label}
                      </span>
                      {isPast && <span className="font-mono text-[8px] uppercase tracking-widest text-ink-muted/50">Past</span>}
                    </div>
                    <p className="font-ui font-semibold text-ink text-sm truncate" style={{ letterSpacing: '-0.01em' }}>
                      {ev.title}
                    </p>
                    <p className="font-ui text-[11px] text-ink-muted/80 truncate">{subline || '—'}</p>
                  </div>

                  {/* Location */}
                  <p className={`font-ui text-xs truncate pr-2 ${ev.location_tba ? 'text-marigold-dark italic' : 'text-ink-muted'}`}>
                    {location}
                  </p>

                  {/* Event date */}
                  <p className={`font-mono text-xs ${isPast ? 'text-ink-muted/50' : 'text-ink-muted'}`}>
                    {fmtDateShort(ev.start_date)}
                  </p>

                  {/* Organizer */}
                  <p className="font-ui text-xs text-ink-muted truncate pr-2">{orgName}</p>

                  {/* Capacity + price */}
                  <div className="text-right pr-2">
                    {ev.ticket_tiers.length > 0 ? (
                      <>
                        <p className="font-mono text-xs text-ink">{capacity.toLocaleString()}</p>
                        <p className="font-mono text-[10px] text-ink-muted/70">${minP}{maxP > minP ? `–$${maxP}` : ''}</p>
                      </>
                    ) : (
                      <span className="font-mono text-xs text-ink-muted/40">—</span>
                    )}
                  </div>

                  {/* Mode */}
                  <div className="flex justify-end pr-1">
                    <span title={ev.selling_on_rameelo ? 'Selling tickets on Rameelo' : 'Interest collection only'}
                      className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full ${ev.selling_on_rameelo ? 'bg-peacock/12 text-peacock' : 'bg-ivory-200 text-ink-muted'}`}>
                      {ev.selling_on_rameelo ? '🎟️' : '👀'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                    <Link
                      href={`/admin/events/${ev.id}/edit`}
                      className="w-7 h-7 rounded-lg border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-aubergine hover:border-aubergine/30 transition-colors"
                      title="Edit event"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </Link>
                    <Link
                      href={`/admin/events/${ev.id}`}
                      className="px-2.5 py-1.5 rounded-lg border border-ivory-200 text-ink-muted font-ui text-xs hover:border-aubergine/30 hover:text-aubergine transition-colors"
                      title="View event"
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] text-ink-muted">
            Page {page} of {totalPages} · {filtered.length} events
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink hover:border-aubergine/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '…')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center font-mono text-xs text-ink-muted">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-8 h-8 rounded-lg font-mono text-xs transition-all ${
                      page === p ? 'bg-aubergine text-white border border-aubergine' : 'border border-ivory-200 text-ink-muted hover:text-ink hover:border-aubergine/30'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-lg border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink hover:border-aubergine/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
