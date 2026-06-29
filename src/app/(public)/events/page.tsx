"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "@/app/organizer/events/create/types";
import { regionForState } from "@/lib/us-regions";
import { METROS, metroSlug } from "@/lib/metros";

type DBEvent = {
  id: string;
  title: string;
  category: string;
  artist: string | null;
  artist_id: string | null;
  description: string | null;
  start_date: string;
  end_date: string | null;
  is_multi_day: boolean;
  city: string | null;
  state: string | null;
  metro_city: string | null;
  venue_name: string | null;
  start_time: string;
  cover_image_url: string | null;
  cover_gradient: string;
  dress_code: string;
  dandiya_sticks: string;
  age_restriction: string;
  navratri_nights: number[] | null;
  capacity: number | null;
  selling_on_rameelo: boolean;
  featured_on_events: boolean;
  ticket_tiers: { price: number; quantity: number; quantity_sold: number; sold_out: boolean }[];
  artists: { name: string; tagline: string | null; profile_image_url: string | null; is_featured: boolean } | null;
};

type EventVM = {
  id: string;
  title: string;
  category: string;
  artist: string | null;
  artistPhoto: string | null;
  artistFeatured: boolean;
  description: string | null;
  date: string;
  endDate: string | null;
  isMultiDay: boolean;
  city: string | null;
  state: string | null;
  metroCity: string | null;
  venue: string | null;
  time: string;
  coverImageUrl: string | null;
  gradient: typeof GRADIENTS[0];
  minPrice: number | null;
  maxPrice: number | null;
  totalQty: number;
  soldOut: boolean;
  dressCode: string;
  ageRestriction: string;
  navratriNights: number[];
  sellingOnRameelo: boolean;
  featuredOnEvents: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  garba: 'Garba', dandiya: 'Dandiya', raas: 'Raas', workshop: 'Workshop', community: 'Community', other: 'Other',
};
const SORT_OPTIONS = ['Date: Soonest', 'Price: Low to High', 'Price: High to Low'];

const DATE_OPTIONS = [
  { id: 'any',     label: 'Any date' },
  { id: 'weekend', label: 'This weekend' },
  { id: 'week',    label: 'Next 7 days' },
  { id: 'month',   label: 'Next 30 days' },
] as const;

const PRICE_OPTIONS = [
  { id: 'any',     label: 'Any price' },
  { id: 'free',    label: 'Free' },
  { id: 'under25', label: 'Under $25' },
  { id: '25to50',  label: '$25 – $50' },
  { id: '50plus',  label: '$50+' },
] as const;

// Location selection: anywhere, a specific city/metro, or a broad US region.
type LocSel = { kind: 'all' } | { kind: 'city'; value: string } | { kind: 'region'; value: string };

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateRange(start: string, end: string | null, isMulti: boolean): string {
  if (!isMulti || !end || end === start) return fmtDate(start);
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end   + 'T00:00:00');
  const sameYear  = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();
  const mo  = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
  const day = (d: Date) => d.getDate();
  const yr  = (d: Date) => d.getFullYear();
  if (sameMonth) return `${mo(s)} ${day(s)}–${day(e)}, ${yr(s)}`;
  if (sameYear)  return `${mo(s)} ${day(s)} – ${mo(e)} ${day(e)}, ${yr(s)}`;
  return `${mo(s)} ${day(s)}, ${yr(s)} – ${mo(e)} ${day(e)}, ${yr(e)}`;
}
function fmt12(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// An event keeps showing in the upcoming list until 2 full days after it ends —
// then it rolls into "Past events". (lastDay = end date for multi-day events.)
const PAST_GRACE_DAYS = 2;
function isPastEvent(lastDay: string): boolean {
  const cutoff = new Date(lastDay + 'T00:00:00');
  cutoff.setDate(cutoff.getDate() + PAST_GRACE_DAYS);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime() > cutoff.getTime();
}

// ── Filter predicates (pure; one per facet so we can compute faceted counts) ──
function matchSearch(e: EventVM, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    e.title.toLowerCase().includes(q) ||
    (e.artist ?? '').toLowerCase().includes(q) ||
    (e.city ?? '').toLowerCase().includes(q) ||
    (e.metroCity ?? '').toLowerCase().includes(q) ||
    (e.state ?? '').toLowerCase().includes(q) ||
    (e.venue ?? '').toLowerCase().includes(q)
  );
}
function matchCategory(e: EventVM, cat: string): boolean {
  return cat === 'All' || (CATEGORY_LABELS[e.category] ?? e.category) === cat;
}
function matchLocation(e: EventVM, loc: LocSel): boolean {
  if (loc.kind === 'all') return true;
  if (loc.kind === 'city') return e.city === loc.value || e.metroCity === loc.value;
  return regionForState(e.state) === loc.value;
}
function matchArtist(e: EventVM, artist: string): boolean {
  return artist === 'All' || e.artist === artist;
}
function matchPrice(e: EventVM, p: string): boolean {
  if (p === 'any') return true;
  if (e.minPrice === null) return false;
  if (p === 'free')    return e.minPrice === 0;
  if (p === 'under25') return e.minPrice > 0 && e.minPrice < 25;
  if (p === '25to50')  return e.minPrice >= 25 && e.minPrice <= 50;
  if (p === '50plus')  return e.minPrice > 50;
  return true;
}
function rangeOverlap(s1: number, e1: number, s2: number, e2: number) {
  return s1 <= e2 && s2 <= e1;
}
function matchDate(e: EventVM, f: string): boolean {
  if (f === 'any') return true;
  const start = new Date(e.date + 'T00:00:00').getTime();
  const end   = new Date((e.endDate ?? e.date) + 'T00:00:00').getTime();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (f === 'weekend') {
    const day = today.getDay();
    const sat = new Date(today); sat.setDate(today.getDate() + ((6 - day + 7) % 7));
    const sun = new Date(sat);   sun.setDate(sat.getDate() + 1); sun.setHours(23, 59, 59, 999);
    // Already the weekend? include today through Sunday.
    const from = (day === 0 || day === 6) ? today.getTime() : sat.getTime();
    return rangeOverlap(start, end, from, sun.getTime());
  }
  if (f === 'week')  { const to = new Date(today); to.setDate(today.getDate() + 7);  return rangeOverlap(start, end, today.getTime(), to.getTime()); }
  if (f === 'month') { const to = new Date(today); to.setDate(today.getDate() + 30); return rangeOverlap(start, end, today.getTime(), to.getTime()); }
  // Specific calendar date (yyyy-mm-dd)
  const d = new Date(f + 'T00:00:00').getTime();
  return start <= d && d <= end;
}
const isPresetDate = (f: string) => DATE_OPTIONS.some(o => o.id === f);
function dateLabel(f: string): string {
  const preset = DATE_OPTIONS.find(o => o.id === f);
  if (preset) return preset.id === 'any' ? 'Any date' : preset.label;
  return new Date(f + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ArtistAvatar({ name, photo, size = 28 }: { name: string; photo: string | null; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (photo) return <img src={photo} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full bg-aubergine/70 flex items-center justify-center shrink-0 text-white font-bold"
      style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

function EventCard({ event, isPast = false }: { event: EventVM; isPast?: boolean }) {
  const gradient = event.gradient;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-ivory-200 hover:border-marigold/30 hover:shadow-lg transition-all group flex flex-col">
      <div className="h-36 relative flex flex-col justify-between p-4"
        style={{ background: event.coverImageUrl ? undefined : gradient.css }}>
        {event.coverImageUrl && (
          <img src={event.coverImageUrl} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        <div className="relative flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full text-white/90"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)' }}>
              {CATEGORY_LABELS[event.category] ?? event.category}
            </span>
            {!isPast && event.featuredOnEvents && (
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-marigold text-aubergine">
                ⭐ Featured
              </span>
            )}
          </div>
          {isPast ? (
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full text-white/85"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
              Ended
            </span>
          ) : event.sellingOnRameelo && event.soldOut ? (
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full text-white bg-ink"
              style={{ backdropFilter: 'blur(4px)' }}>
              Sold Out
            </span>
          ) : event.navratriNights.length > 1 && (
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full text-white/80"
              style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
              {event.navratriNights.length}-Night Event
            </span>
          )}
        </div>

        {event.artist && (
          <div className="relative flex items-center gap-2 w-fit px-2.5 py-1.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }}>
            <ArtistAvatar name={event.artist} photo={event.artistPhoto} size={24} />
            <div>
              <p className="text-white text-xs font-semibold leading-none">
                {event.artist}
                {event.artistFeatured && <span className="ml-1 text-marigold">⭐</span>}
              </p>
              <p className="text-white/60 text-[9px] leading-none mt-0.5">Performing</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <p className="font-mono text-[10px] text-ink-muted uppercase tracking-widest mb-1">
          {fmtDateRange(event.date, event.endDate, event.isMultiDay)}
          {(event.city || event.state) && ` · ${[event.city, event.state].filter(Boolean).join(', ')}`}
        </p>
        <Link href={`/events/${event.id}`}>
          <h3 className="font-display font-bold text-ink text-sm leading-snug mb-2 line-clamp-2 group-hover:text-aubergine transition-colors">
            {event.title}
          </h3>
        </Link>
        {event.description && (
          <p className="font-ui text-ink-muted text-xs leading-relaxed line-clamp-2 mb-3 flex-1">
            {event.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1 mb-3">
          {event.ageRestriction !== 'all' && (
            <span className="bg-ivory text-ink-muted text-[10px] font-medium px-2 py-0.5 rounded-full border border-ivory-200">{event.ageRestriction}</span>
          )}
          {event.dressCode !== 'none' && (
            <span className="bg-ivory text-ink-muted text-[10px] font-medium px-2 py-0.5 rounded-full border border-ivory-200">
              {event.dressCode === 'required' ? 'Traditional attire required' : 'Traditional attire encouraged'}
            </span>
          )}
          <span className="bg-ivory text-ink-muted text-[10px] font-medium px-2 py-0.5 rounded-full border border-ivory-200">
            {fmt12(event.time)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-ivory-200">
          <div>
            {event.minPrice === null ? (
              <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Tickets TBA</span>
            ) : event.minPrice === 0 ? (
              <span className="font-display font-bold text-peacock text-sm">Complimentary</span>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="font-display font-bold text-ink text-base">From ${event.minPrice}</span>
                {event.maxPrice !== null && event.maxPrice > event.minPrice && (
                  <span className="text-ink-muted text-xs">– ${event.maxPrice}</span>
                )}
                {!isPast && !event.sellingOnRameelo && (
                  <span className="font-mono text-[8px] uppercase tracking-widest bg-marigold/20 text-marigold-dark px-1.5 py-0.5 rounded-full ml-1">Soon</span>
                )}
              </div>
            )}
          </div>
          <Link
            href={`/events/${event.id}`}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              isPast
                ? 'bg-ivory text-ink-muted border border-ivory-200 hover:border-aubergine/30 hover:text-aubergine'
                : !isPast && event.sellingOnRameelo && event.soldOut
                  ? 'bg-ink/90 text-white hover:bg-ink'
                  : 'bg-marigold text-aubergine hover:bg-[#d4891b]'
            }`}
          >
            {isPast
              ? "View event"
              : event.sellingOnRameelo
                ? (event.soldOut ? "Join waitlist" : "Get Tickets")
                : "Get Early Access"}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Small reusable filter primitives ──
const chevron = (
  <svg className="w-3 h-3 shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
  </svg>
);

function OptionRow({ selected, onClick, label, count, accent }: {
  selected: boolean; onClick: () => void; label: string; count?: number; accent?: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left px-4 py-2.5 font-ui text-sm transition-colors flex items-center gap-2.5 ${
        selected ? 'text-aubergine font-semibold bg-marigold/8' : 'text-ink hover:bg-ivory'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected ? 'bg-marigold' : 'bg-transparent'}`} />
      <span className="truncate">{label}</span>
      {accent && <span className="font-mono text-[8px] uppercase tracking-widest text-ink-muted/60">{accent}</span>}
      {count !== undefined && (
        <span className="ml-auto font-mono text-[10px] text-ink-muted/55 shrink-0">{count}</span>
      )}
    </button>
  );
}

function Facet({ id, label, valueLabel, isActive, openPanel, setOpenPanel, align = 'left', width = 'w-60', children }: {
  id: string; label: string; valueLabel: string; isActive: boolean;
  openPanel: string | null; setOpenPanel: (v: string | null) => void;
  align?: 'left' | 'right'; width?: string; children: React.ReactNode;
}) {
  const open = openPanel === id;
  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpenPanel(open ? null : id)}
        className={`flex items-center gap-2 pl-3.5 pr-3 py-2 rounded-full border text-sm whitespace-nowrap transition-all ${
          isActive
            ? 'border-aubergine bg-aubergine text-white'
            : open
              ? 'border-aubergine/40 bg-ivory text-ink'
              : 'border-ivory-200 bg-white text-ink hover:border-aubergine/30'
        }`}>
        <span className={`font-mono text-[8px] font-bold uppercase tracking-widest ${isActive ? 'text-white/55' : 'text-ink-muted'}`}>{label}</span>
        <span className="font-ui font-medium max-w-[10rem] truncate">{valueLabel}</span>
        {chevron}
      </button>
      {open && (
        <div className={`absolute top-[calc(100%+8px)] ${align === 'right' ? 'right-0' : 'left-0'} bg-white rounded-2xl shadow-xl border border-ivory-200 overflow-hidden z-50 ${width}`}>
          {children}
        </div>
      )}
    </div>
  );
}

function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 border-b border-ivory-200">
      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{children}</p>
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3.5 py-2 rounded-full border text-sm font-medium transition-all active:scale-95 ${
        selected ? 'border-aubergine bg-aubergine text-white' : 'border-ivory-200 bg-white text-ink'
      }`}
      style={{ minHeight: 40 }}>
      {children}
    </button>
  );
}

export default function EventsPage() {
  const [events, setEvents]               = useState<EventVM[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [location, setLocation]           = useState<LocSel>({ kind: 'all' });
  const [activeArtist, setActiveArtist]   = useState('All');
  const [dateFilter, setDateFilter]       = useState('any');
  const [price, setPrice]                 = useState('any');
  const [sort, setSort]                   = useState('Date: Soonest');
  const [view, setView]                   = useState<'upcoming' | 'past'>('upcoming');
  const [showAll, setShowAll]             = useState(false);
  const [openPanel, setOpenPanel]         = useState<string | null>(null);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [geoCity, setGeoCity]             = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.title = "Find Garba & Navratri Events | Rameelo"; }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('events')
        .select(`
          id, title, category, artist, artist_id, description,
          start_date, end_date, is_multi_day, city, state, metro_city, venue_name, start_time,
          cover_image_url, cover_gradient, dress_code, dandiya_sticks,
          age_restriction, navratri_nights, capacity, selling_on_rameelo, featured_on_events,
          ticket_tiers (price, quantity, quantity_sold, sold_out),
          artists (name, tagline, profile_image_url, is_featured)
        `)
        .eq('status', 'published')
        .order('start_date');

      const vms: EventVM[] = ((data ?? []) as unknown as DBEvent[]).map(ev => {
        const prices = ev.ticket_tiers.map(t => t.price);
        const gradient = GRADIENTS.find(g => g.id === ev.cover_gradient) ?? GRADIENTS[0];
        const artistRecord = ev.artists;
        return {
          id: ev.id,
          title: ev.title,
          category: ev.category,
          artist: artistRecord?.name ?? ev.artist ?? null,
          artistPhoto: artistRecord?.profile_image_url ?? null,
          artistFeatured: artistRecord?.is_featured ?? false,
          description: ev.description,
          date: ev.start_date,
          endDate: ev.end_date ?? null,
          isMultiDay: ev.is_multi_day,
          city: ev.city,
          state: ev.state,
          metroCity: ev.metro_city,
          venue: ev.venue_name,
          time: ev.start_time,
          coverImageUrl: ev.cover_image_url,
          gradient,
          minPrice: prices.length ? Math.min(...prices) : null,
          maxPrice: prices.length ? Math.max(...prices) : null,
          totalQty: ev.ticket_tiers.reduce((s, t) => s + t.quantity, 0),
          // Fully sold out only when every tier is gone (forced or inventory-exhausted).
          soldOut: ev.ticket_tiers.length > 0 && ev.ticket_tiers.every(t => t.sold_out || t.quantity_sold >= t.quantity),
          dressCode: ev.dress_code,
          ageRestriction: ev.age_restriction,
          navratriNights: ev.navratri_nights ?? [],
          sellingOnRameelo: ev.selling_on_rameelo,
          featuredOnEvents: ev.featured_on_events ?? false,
        };
      });

      setEvents(vms);
      setLoading(false);
    }
    load();
  }, []);

  // Read hero search params (?city=Atlanta&vibe=Garba) on first mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cityParam = params.get("city");
    const vibeParam = params.get("vibe");
    if (cityParam) setLocation({ kind: 'city', value: cityParam });
    if (vibeParam && vibeParam !== "All") setActiveCategory(vibeParam);
  }, []);

  // IP-based geolocation — no permission dialog needed
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then((d: { city?: string }) => { if (d.city) setGeoCity(d.city); })
      .catch(() => { /* silent — geo is best-effort */ });
  }, []);

  // Close dropdowns when clicking outside the toolbar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) setOpenPanel(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Once geo city is known and events are loaded, auto-select nearest city (or metro)
  useEffect(() => {
    if (!geoCity || events.length === 0 || location.kind !== 'all') return;
    const g = geoCity.toLowerCase();
    const matched = events.find(e => e.city?.toLowerCase() === g || e.metroCity?.toLowerCase() === g);
    if (matched) {
      const value = matched.metroCity?.toLowerCase() === g ? matched.metroCity! : matched.city!;
      setLocation({ kind: 'city', value });
    }
  }, [geoCity, events]); // eslint-disable-line react-hooks/exhaustive-deps

  // Split into upcoming vs past using the 2-day grace rule
  const { upcoming, past } = useMemo(() => {
    const up: EventVM[] = [];
    const pa: EventVM[] = [];
    for (const e of events) (isPastEvent(e.endDate ?? e.date) ? pa : up).push(e);
    return { upcoming: up, past: pa };
  }, [events]);

  const base = view === 'past' ? past : upcoming;

  // Category list is stable across views (derived from all events).
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(events.map(e => CATEGORY_LABELS[e.category] ?? e.category))).sort()],
    [events]
  );

  // Main filter + faceted-count computation. Each facet's option counts reflect
  // every OTHER active filter (Amazon-style), so counts shrink as you narrow.
  const { filtered, regionOpts, cityOpts, artistOpts, priceCounts, categoryCounts } = useMemo(() => {
    const pass = (e: EventVM, except: string) =>
      (except === 'search'   || matchSearch(e, search)) &&
      (except === 'date'     || matchDate(e, dateFilter)) &&
      (except === 'location' || matchLocation(e, location)) &&
      (except === 'artist'   || matchArtist(e, activeArtist)) &&
      (except === 'price'    || matchPrice(e, price)) &&
      (except === 'category' || matchCategory(e, activeCategory));

    const result = base.filter(e => pass(e, ''));
    result.sort((a, b) => {
      if (view !== 'past') {
        const featured = (b.featuredOnEvents ? 1 : 0) - (a.featuredOnEvents ? 1 : 0);
        if (featured !== 0) return featured;
        const selling = (b.sellingOnRameelo ? 1 : 0) - (a.sellingOnRameelo ? 1 : 0);
        if (selling !== 0) return selling;
      }
      if (sort === 'Price: Low to High') return (a.minPrice ?? 0) - (b.minPrice ?? 0);
      if (sort === 'Price: High to Low') return (b.minPrice ?? 0) - (a.minPrice ?? 0);
      return view === 'past' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
    });

    const byCount = (a: [string, number], b: [string, number]) => b[1] - a[1] || a[0].localeCompare(b[0]);

    const locBase = base.filter(e => pass(e, 'location'));
    const cityMap = new Map<string, number>();
    const regionMap = new Map<string, number>();
    for (const e of locBase) {
      const labels = new Set([e.city, e.metroCity].filter((c): c is string => !!c));
      for (const c of labels) cityMap.set(c, (cityMap.get(c) ?? 0) + 1);
      const r = regionForState(e.state);
      if (r) regionMap.set(r, (regionMap.get(r) ?? 0) + 1);
    }

    const artistBase = base.filter(e => pass(e, 'artist'));
    const artistMap = new Map<string, number>();
    for (const e of artistBase) if (e.artist) artistMap.set(e.artist, (artistMap.get(e.artist) ?? 0) + 1);

    const priceBase = base.filter(e => pass(e, 'price'));
    const priceCounts = Object.fromEntries(PRICE_OPTIONS.map(o => [o.id, priceBase.filter(e => matchPrice(e, o.id)).length])) as Record<string, number>;

    const catBase = base.filter(e => pass(e, 'category'));
    const categoryCounts = new Map<string, number>();
    for (const e of catBase) {
      const l = CATEGORY_LABELS[e.category] ?? e.category;
      categoryCounts.set(l, (categoryCounts.get(l) ?? 0) + 1);
    }

    return {
      filtered: result,
      regionOpts: [...regionMap.entries()].sort(byCount),
      cityOpts:   [...cityMap.entries()].sort(byCount),
      artistOpts: [...artistMap.entries()].sort(byCount),
      priceCounts,
      categoryCounts,
    };
  }, [base, view, search, dateFilter, location, activeArtist, price, activeCategory, sort]);

  const displayed = showAll ? filtered : filtered.slice(0, 24);

  // ── Labels & active-filter bookkeeping ──
  const locationLabel = location.kind === 'all'
    ? (geoCity ? `Near ${geoCity}` : 'Anywhere')
    : location.kind === 'region' ? location.value : location.value;
  const artistLabel = activeArtist === 'All' ? 'Any artist' : activeArtist;
  const priceLabel = (PRICE_OPTIONS.find(o => o.id === price) ?? PRICE_OPTIONS[0]).label;
  const categoryLabel = activeCategory === 'All' ? 'All types' : activeCategory;

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (search.trim())             activeChips.push({ key: 'q',   label: `“${search.trim()}”`, clear: () => setSearch('') });
  if (dateFilter !== 'any')      activeChips.push({ key: 'd',   label: dateLabel(dateFilter), clear: () => setDateFilter('any') });
  if (location.kind !== 'all')   activeChips.push({ key: 'loc', label: location.kind === 'region' ? `${location.value} region` : location.value, clear: () => setLocation({ kind: 'all' }) });
  if (activeArtist !== 'All')    activeChips.push({ key: 'art', label: activeArtist, clear: () => setActiveArtist('All') });
  if (price !== 'any')           activeChips.push({ key: 'pr',  label: priceLabel, clear: () => setPrice('any') });
  if (activeCategory !== 'All')  activeChips.push({ key: 'cat', label: activeCategory, clear: () => setActiveCategory('All') });
  const activeCount = activeChips.length;

  const reset = () => {
    setSearch(''); setDateFilter('any'); setLocation({ kind: 'all' });
    setActiveArtist('All'); setPrice('any'); setActiveCategory('All'); setShowAll(false);
  };
  const onFacetPick = () => { setOpenPanel(null); setShowAll(false); };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FCF9F2' }}>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ backgroundColor: '#2E1B30' }}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #F5A623 0%, transparent 60%), radial-gradient(circle at 80% 20%, #1E3A7A 0%, transparent 50%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <p className="font-mono text-marigold text-xs font-bold uppercase tracking-widest mb-4">
            Navratri 2026 · {upcoming.length} Event{upcoming.length !== 1 ? 's' : ''} Nationwide
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white leading-tight mb-4 max-w-3xl">
            Find Your <span className="text-marigold">Garba.</span>
            <br />
            <span className="text-white/60 text-3xl md:text-4xl font-medium">Every artist. Every city.</span>
          </h1>
          <p className="font-ui text-white/60 text-base max-w-xl mb-7 leading-relaxed">
            Garba, Dandiya, and Navratri events across the USA — from Edison to LA. Search by date, artist, city, region, or price.
          </p>

          {/* Big search bar — the centerpiece */}
          <div className="w-full max-w-2xl">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-aubergine/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setShowAll(false); }}
                placeholder="Search by event, artist, city, or venue…"
                className="w-full bg-white rounded-full shadow-lg pl-12 pr-11 py-4 font-ui text-[15px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-marigold"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-ivory hover:bg-ivory-200 flex items-center justify-center text-ink-muted transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* Quick stats */}
          {!loading && (
            <div className="flex flex-wrap gap-6 mt-8 pt-8 border-t border-white/10">
              {[
                { label: 'Live Events', value: String(upcoming.length) },
                { label: 'Cities', value: String(new Set(upcoming.map(e => e.city)).size) },
                { label: 'Nights of Garba', value: '9' },
              ].map(s => (
                <div key={s.label}>
                  <p className="font-display font-bold text-2xl text-white">{s.value}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sticky filter toolbar */}
      <div ref={toolbarRef} className="sticky top-0 z-30 bg-white/95 border-b border-ivory-200" style={{ backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">

          {/* Desktop: inline facet dropdowns */}
          <div className="hidden md:flex items-center gap-2">
            <Facet id="date" label="Date" valueLabel={dateLabel(dateFilter)} isActive={dateFilter !== 'any'}
              openPanel={openPanel} setOpenPanel={setOpenPanel} width="w-60">
              <PanelHeader>When</PanelHeader>
              <div className="py-1.5">
                {DATE_OPTIONS.map(o => (
                  <OptionRow key={o.id} selected={dateFilter === o.id} label={o.label}
                    onClick={() => { setDateFilter(o.id); onFacetPick(); }} />
                ))}
              </div>
              <div className="px-3 py-2.5 border-t border-ivory-200">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5">Pick a date</p>
                <input type="date" value={isPresetDate(dateFilter) ? '' : dateFilter}
                  onChange={e => { setDateFilter(e.target.value || 'any'); setShowAll(false); }}
                  className="w-full text-sm font-ui text-ink border border-ivory-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-aubergine" />
              </div>
            </Facet>

            <Facet id="location" label="Location" valueLabel={locationLabel} isActive={location.kind !== 'all'}
              openPanel={openPanel} setOpenPanel={setOpenPanel} width="w-64">
              <div className="max-h-80 overflow-y-auto overscroll-contain">
                <PanelHeader>Location</PanelHeader>
                <div className="py-1.5">
                  <OptionRow selected={location.kind === 'all'} label={geoCity ? `Anywhere (near ${geoCity})` : 'Anywhere'}
                    onClick={() => { setLocation({ kind: 'all' }); onFacetPick(); }} />
                </div>
                {regionOpts.length > 0 && (
                  <>
                    <PanelHeader>Regions</PanelHeader>
                    <div className="py-1.5">
                      {regionOpts.map(([name, count]) => (
                        <OptionRow key={name} selected={location.kind === 'region' && location.value === name}
                          label={name} count={count}
                          onClick={() => { setLocation({ kind: 'region', value: name }); onFacetPick(); }} />
                      ))}
                    </div>
                  </>
                )}
                {cityOpts.length > 0 && (
                  <>
                    <PanelHeader>Cities</PanelHeader>
                    <div className="py-1.5">
                      {cityOpts.map(([name, count]) => (
                        <OptionRow key={name} selected={location.kind === 'city' && location.value === name}
                          label={name} count={count}
                          onClick={() => { setLocation({ kind: 'city', value: name }); onFacetPick(); }} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Facet>

            <Facet id="artist" label="Artist" valueLabel={artistLabel} isActive={activeArtist !== 'All'}
              openPanel={openPanel} setOpenPanel={setOpenPanel} width="w-60">
              <div className="max-h-80 overflow-y-auto overscroll-contain">
                <PanelHeader>Artist</PanelHeader>
                <div className="py-1.5">
                  <OptionRow selected={activeArtist === 'All'} label="Any artist"
                    onClick={() => { setActiveArtist('All'); onFacetPick(); }} />
                  {artistOpts.map(([name, count]) => (
                    <OptionRow key={name} selected={activeArtist === name} label={name} count={count}
                      onClick={() => { setActiveArtist(name); onFacetPick(); }} />
                  ))}
                  {artistOpts.length === 0 && (
                    <p className="px-4 py-3 font-ui text-xs text-ink-muted">No artists in this view.</p>
                  )}
                </div>
              </div>
            </Facet>

            <Facet id="price" label="Price" valueLabel={priceLabel} isActive={price !== 'any'}
              openPanel={openPanel} setOpenPanel={setOpenPanel} width="w-52">
              <PanelHeader>Price</PanelHeader>
              <div className="py-1.5">
                {PRICE_OPTIONS.map(o => (
                  <OptionRow key={o.id} selected={price === o.id} label={o.label} count={priceCounts[o.id]}
                    onClick={() => { setPrice(o.id); onFacetPick(); }} />
                ))}
              </div>
            </Facet>

            <Facet id="category" label="Type" valueLabel={categoryLabel} isActive={activeCategory !== 'All'}
              openPanel={openPanel} setOpenPanel={setOpenPanel} width="w-52">
              <PanelHeader>Event type</PanelHeader>
              <div className="py-1.5">
                {categories.map(cat => (
                  <OptionRow key={cat} selected={activeCategory === cat} label={cat === 'All' ? 'All types' : cat}
                    count={cat === 'All' ? undefined : (categoryCounts.get(cat) ?? 0)}
                    onClick={() => { setActiveCategory(cat); onFacetPick(); }} />
                ))}
              </div>
            </Facet>

            {activeCount > 0 && (
              <button type="button" onClick={reset}
                className="ml-1 shrink-0 font-ui text-xs font-semibold text-durga hover:underline">
                Clear all
              </button>
            )}

            <div className="ml-auto shrink-0">
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="text-xs font-ui text-ink-muted bg-transparent border border-ivory-200 rounded-lg px-3 py-2 focus:outline-none focus:border-aubergine cursor-pointer">
                {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Mobile: Filters button + sort */}
          <div className="md:hidden flex items-center gap-2">
            <button type="button" onClick={() => setMobileFilters(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-ivory-200 bg-white text-sm font-semibold text-ink active:scale-95 transition-transform" style={{ minHeight: 44 }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 12h12M10 20h4" /></svg>
              Filters
              {activeCount > 0 && (
                <span className="font-mono text-[10px] font-bold bg-marigold text-aubergine rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">{activeCount}</span>
              )}
            </button>
            <div className="ml-auto shrink-0">
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="text-xs font-ui text-ink-muted bg-white border border-ivory-200 rounded-full px-3 py-2.5 focus:outline-none focus:border-aubergine cursor-pointer" style={{ minHeight: 44 }}>
                {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Active filter chips (both breakpoints) */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {activeChips.map(c => (
                <button key={c.key} onClick={c.clear}
                  className="flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-medium bg-ivory border border-ivory-200 text-ink hover:border-durga/40 hover:text-durga transition-colors">
                  {c.label}
                  <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
            <p className="font-ui text-sm text-ink-muted">Finding events near you…</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-32">
            <div className="text-5xl mb-6">🎉</div>
            <p className="font-display font-bold text-ink text-2xl mb-3" style={{ letterSpacing: '-0.02em' }}>Events coming soon</p>
            <p className="font-ui text-ink-muted text-sm max-w-sm mx-auto mb-8">
              We&apos;re reviewing and publishing Navratri 2026 events. Check back soon — or be the first to create one.
            </p>
            <Link href="/auth/signup"
              className="inline-flex items-center gap-2 bg-aubergine text-white font-display font-bold px-6 py-3 rounded-2xl hover:bg-aubergine-light transition-colors">
              Join as an organizer →
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
              <p className="font-ui text-sm text-ink">
                <span className="font-bold">{filtered.length}</span>
                <span className="text-ink-muted"> {view === 'past' ? 'past ' : ''}event{filtered.length !== 1 ? 's' : ''}</span>
                {location.kind === 'city' && <span className="text-ink-muted"> in {location.value}</span>}
                {location.kind === 'region' && <span className="text-ink-muted"> in the {location.value}</span>}
              </p>

              {/* Upcoming / Past toggle — only when past events exist */}
              {past.length > 0 && (
                <div className="flex items-center gap-0.5 bg-ivory border border-ivory-200 rounded-full p-0.5 shrink-0">
                  {([['upcoming', 'Upcoming', upcoming.length], ['past', 'Past', past.length]] as const).map(([v, label, count]) => (
                    <button key={v} type="button"
                      onClick={() => { setView(v); setShowAll(false); }}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        view === v ? 'bg-white text-aubergine shadow-sm' : 'text-ink-muted hover:text-ink'
                      }`}>
                      {label}
                      <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full ${view === v ? 'bg-marigold/20 text-marigold-dark' : 'bg-ivory-200 text-ink-muted'}`}>
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-24">
                {view === 'past' ? (
                  <>
                    <p className="font-display text-2xl font-bold text-ink mb-2">No past events</p>
                    <p className="font-ui text-ink-muted text-sm mb-6">Nothing matches here yet.</p>
                    <button onClick={() => { setView('upcoming'); setShowAll(false); }}
                      className="px-6 py-3 rounded-2xl bg-marigold text-aubergine font-semibold text-sm hover:bg-[#d4891b] transition-colors">
                      Back to upcoming events
                    </button>
                  </>
                ) : upcoming.length === 0 ? (
                  <>
                    <p className="font-display text-2xl font-bold text-ink mb-2">No upcoming events right now</p>
                    <p className="font-ui text-ink-muted text-sm mb-6">
                      {past.length > 0 ? 'Check back soon for new dates — or look back at past events.' : 'Check back soon for new dates.'}
                    </p>
                    {past.length > 0 && (
                      <button onClick={() => { setView('past'); setShowAll(false); }}
                        className="px-6 py-3 rounded-2xl bg-marigold text-aubergine font-semibold text-sm hover:bg-[#d4891b] transition-colors">
                        View past events
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-display text-2xl font-bold text-ink mb-2">No events found</p>
                    <p className="font-ui text-ink-muted text-sm mb-6">Try adjusting or clearing your filters.</p>
                    <button onClick={reset}
                      className="px-6 py-3 rounded-2xl bg-marigold text-aubergine font-semibold text-sm hover:bg-[#d4891b] transition-colors">
                      Clear all filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {displayed.map(ev => <EventCard key={ev.id} event={ev} isPast={view === 'past'} />)}
                </div>

                {filtered.length > 24 && !showAll && (
                  <div className="text-center mt-12">
                    <button onClick={() => setShowAll(true)}
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl border-2 border-aubergine text-aubergine font-semibold text-sm hover:bg-aubergine hover:text-white transition-all">
                      Show all {filtered.length} events
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Mobile filter bottom-sheet */}
      {mobileFilters && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFilters(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl flex flex-col" style={{ maxHeight: '88vh' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-ivory-200">
              <p className="font-display font-bold text-ink text-lg">Filters</p>
              <button type="button" onClick={() => setMobileFilters(false)} aria-label="Close"
                className="w-9 h-9 rounded-full bg-ivory flex items-center justify-center text-ink-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 space-y-6 flex-1">
              {/* Search inside the sheet too */}
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events, artists, cities…"
                  className="w-full bg-ivory rounded-xl pl-10 pr-3 py-3 font-ui text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-marigold" />
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2.5">Date</p>
                <div className="flex flex-wrap gap-2">
                  {DATE_OPTIONS.map(o => (
                    <Chip key={o.id} selected={dateFilter === o.id} onClick={() => setDateFilter(o.id)}>{o.label}</Chip>
                  ))}
                </div>
                <input type="date" value={isPresetDate(dateFilter) ? '' : dateFilter}
                  onChange={e => setDateFilter(e.target.value || 'any')}
                  className="mt-2.5 w-full text-sm font-ui text-ink border border-ivory-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-aubergine" />
              </div>

              {regionOpts.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2.5">Region</p>
                  <div className="flex flex-wrap gap-2">
                    {regionOpts.map(([name, count]) => (
                      <Chip key={name} selected={location.kind === 'region' && location.value === name}
                        onClick={() => setLocation(location.kind === 'region' && location.value === name ? { kind: 'all' } : { kind: 'region', value: name })}>
                        {name} <span className="opacity-50">{count}</span>
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {cityOpts.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2.5">City</p>
                  <div className="flex flex-wrap gap-2">
                    {cityOpts.map(([name, count]) => (
                      <Chip key={name} selected={location.kind === 'city' && location.value === name}
                        onClick={() => setLocation(location.kind === 'city' && location.value === name ? { kind: 'all' } : { kind: 'city', value: name })}>
                        {name} <span className="opacity-50">{count}</span>
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {artistOpts.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2.5">Artist</p>
                  <div className="flex flex-wrap gap-2">
                    {artistOpts.map(([name, count]) => (
                      <Chip key={name} selected={activeArtist === name}
                        onClick={() => setActiveArtist(activeArtist === name ? 'All' : name)}>
                        {name} <span className="opacity-50">{count}</span>
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2.5">Price</p>
                <div className="flex flex-wrap gap-2">
                  {PRICE_OPTIONS.map(o => (
                    <Chip key={o.id} selected={price === o.id} onClick={() => setPrice(o.id)}>{o.label}</Chip>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2.5">Event type</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <Chip key={cat} selected={activeCategory === cat} onClick={() => setActiveCategory(cat)}>
                      {cat === 'All' ? 'All types' : cat}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 py-4 border-t border-ivory-200">
              <button type="button" onClick={reset}
                className="px-5 py-3 rounded-2xl border border-ivory-200 text-ink font-semibold text-sm" style={{ minHeight: 48 }}>
                Clear all
              </button>
              <button type="button" onClick={() => { setMobileFilters(false); setShowAll(false); }}
                className="flex-1 px-5 py-3 rounded-2xl bg-marigold text-aubergine font-bold text-sm hover:bg-[#d4891b] transition-colors" style={{ minHeight: 48 }}>
                Show {filtered.length} event{filtered.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Browse Garba by city — internal links to local SEO landing pages */}
      <section className="border-t border-ivory-200 bg-ivory/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">Find garba near you</p>
              <h2 className="font-display font-bold text-ink text-xl sm:text-2xl" style={{ letterSpacing: '-0.02em' }}>Browse Garba events by city</h2>
            </div>
            <Link href="/garba-events" className="font-ui text-sm font-semibold text-aubergine hover:text-aubergine-light transition-colors">All cities →</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {METROS.map(m => (
              <Link key={m.city} href={`/garba-events/${metroSlug(m)}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-ivory-200 bg-white font-ui text-sm font-semibold text-ink hover:border-aubergine/30 hover:text-aubergine transition-all">
                Garba in {m.city}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Gradient color key */}
      <section className="border-t border-ivory-200 py-12" style={{ backgroundColor: '#2E1B30' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/30 mb-5">Event cover colors by region</p>
          <div className="flex flex-wrap gap-4">
            {GRADIENTS.map(g => (
              <div key={g.id} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: g.css }} />
                <div>
                  <p className="font-ui text-xs text-white font-medium">{g.name}</p>
                  <p className="font-mono text-[9px] text-white/30">{g.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
