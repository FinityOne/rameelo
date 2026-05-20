"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "@/app/organizer/events/create/types";

type DBEvent = {
  id: string;
  title: string;
  category: string;
  artist: string | null;
  artist_id: string | null;
  description: string | null;
  start_date: string;
  city: string;
  state: string;
  venue_name: string;
  start_time: string;
  cover_image_url: string | null;
  cover_gradient: string;
  dress_code: string;
  dandiya_sticks: string;
  age_restriction: string;
  navratri_nights: number[] | null;
  capacity: number | null;
  ticket_tiers: { price: number; quantity: number }[];
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
  city: string;
  state: string;
  venue: string;
  time: string;
  coverImageUrl: string | null;
  gradient: typeof GRADIENTS[0];
  minPrice: number;
  maxPrice: number;
  totalQty: number;
  dressCode: string;
  ageRestriction: string;
  navratriNights: number[];
};

const CATEGORY_LABELS: Record<string, string> = {
  garba: 'Garba', dandiya: 'Dandiya', raas: 'Raas', workshop: 'Workshop', community: 'Community', other: 'Other',
};
const SORT_OPTIONS = ['Date: Soonest', 'Price: Low to High', 'Price: High to Low'];

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmt12(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
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

function EventCard({ event }: { event: EventVM }) {
  const gradient = event.gradient;
  const free = event.minPrice === 0;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-ivory-200 hover:border-marigold/30 hover:shadow-lg transition-all group flex flex-col">
      <div className="h-36 relative flex flex-col justify-between p-4"
        style={{ background: event.coverImageUrl ? undefined : gradient.css }}>
        {event.coverImageUrl && (
          <img src={event.coverImageUrl} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        <div className="relative flex items-start justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full text-white/90"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)' }}>
            {CATEGORY_LABELS[event.category] ?? event.category}
          </span>
          {event.navratriNights.length > 0 && (
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full text-white/80"
              style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
              Night{event.navratriNights.length > 1 ? 's' : ''} {event.navratriNights.slice(0, 3).join(', ')}
              {event.navratriNights.length > 3 ? '…' : ''}
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
          {fmtDate(event.date)} · {event.city}, {event.state}
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
            {free ? (
              <span className="font-display font-bold text-peacock text-base">Free</span>
            ) : (
              <>
                <span className="font-display font-bold text-ink text-base">${event.minPrice}</span>
                {event.maxPrice > event.minPrice && (
                  <span className="text-ink-muted text-xs ml-1">– ${event.maxPrice}</span>
                )}
              </>
            )}
          </div>
          <Link href={`/events/${event.id}`}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-marigold text-aubergine hover:bg-[#d4891b] transition-all">
            Get Tickets
          </Link>
        </div>
      </div>
    </div>
  );
}

type Panel = 'location' | 'category' | 'sort' | null;

export default function EventsPage() {
  const [events, setEvents]               = useState<EventVM[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeCity, setActiveCity]       = useState('All Cities');
  const [sort, setSort]                   = useState('Date: Soonest');
  const [showAll, setShowAll]             = useState(false);
  const [openPanel, setOpenPanel]         = useState<Panel>(null);
  const [geoCity, setGeoCity]             = useState<string | null>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('events')
        .select(`
          id, title, category, artist, artist_id, description,
          start_date, city, state, venue_name, start_time,
          cover_image_url, cover_gradient, dress_code, dandiya_sticks,
          age_restriction, navratri_nights, capacity,
          ticket_tiers (price, quantity),
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
          city: ev.city,
          state: ev.state,
          venue: ev.venue_name,
          time: ev.start_time,
          coverImageUrl: ev.cover_image_url,
          gradient,
          minPrice: prices.length ? Math.min(...prices) : 0,
          maxPrice: prices.length ? Math.max(...prices) : 0,
          totalQty: ev.ticket_tiers.reduce((s, t) => s + t.quantity, 0),
          dressCode: ev.dress_code,
          ageRestriction: ev.age_restriction,
          navratriNights: ev.navratri_nights ?? [],
        };
      });

      setEvents(vms);
      setLoading(false);

      // After events load, match geo city to an actual event city
      if (geoCity) {
        const matched = vms.find(e => e.city.toLowerCase() === geoCity.toLowerCase());
        if (matched) setActiveCity(matched.city);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Read hero search params (?city=Atlanta&vibe=Garba) on first mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cityParam = params.get("city");
    const vibeParam = params.get("vibe");
    if (cityParam) setActiveCity(cityParam);
    if (vibeParam && vibeParam !== "All") setActiveCategory(vibeParam);
  }, []); // eslint-disable-line

  // IP-based geolocation — no permission dialog needed
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then((d: { city?: string }) => {
        if (d.city) setGeoCity(d.city);
      })
      .catch(() => { /* silent — geo is best-effort */ });
  }, []);

  // Close dropdowns when clicking outside the pill
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Once geo city is known and events are loaded, auto-select nearest city
  useEffect(() => {
    if (!geoCity || events.length === 0) return;
    const matched = events.find(e => e.city.toLowerCase() === geoCity.toLowerCase());
    if (matched && activeCity === 'All Cities') setActiveCity(matched.city);
  }, [geoCity, events]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = ['All', ...Array.from(new Set(events.map(e => CATEGORY_LABELS[e.category] ?? e.category))).sort()];
  const cities = ['All Cities', ...Array.from(new Set(events.map(e => e.city))).sort()];

  const filtered = useMemo(() => {
    let result = [...events];
    if (activeCategory !== 'All') result = result.filter(e => (CATEGORY_LABELS[e.category] ?? e.category) === activeCategory);
    if (activeCity !== 'All Cities') result = result.filter(e => e.city === activeCity);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.artist ?? '').toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      if (sort === 'Date: Soonest') return a.date.localeCompare(b.date);
      if (sort === 'Price: Low to High') return a.minPrice - b.minPrice;
      if (sort === 'Price: High to Low') return b.minPrice - a.minPrice;
      return 0;
    });
    return result;
  }, [events, activeCategory, activeCity, search, sort]);

  const displayed = showAll ? filtered : filtered.slice(0, 24);

  const locationLabel = activeCity === 'All Cities'
    ? (geoCity ? `Near ${geoCity}` : 'Anywhere')
    : activeCity;

  const categoryLabel = activeCategory === 'All' ? 'All types' : activeCategory;

  const chevron = (
    <svg className="w-3 h-3 text-aubergine/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
    </svg>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FCF9F2' }}>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ backgroundColor: '#2E1B30' }}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #F5A623 0%, transparent 60%), radial-gradient(circle at 80% 20%, #1E3A7A 0%, transparent 50%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <p className="font-mono text-marigold text-xs font-bold uppercase tracking-widest mb-4">
            Navratri 2026 · {events.length} Event{events.length !== 1 ? 's' : ''} Nationwide
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white leading-tight mb-4 max-w-3xl">
            Find Your <span className="text-marigold">Garba.</span>
            <br />
            <span className="text-white/60 text-3xl md:text-4xl font-medium">Every artist. Every city.</span>
          </h1>
          <p className="font-ui text-white/60 text-base max-w-xl mb-8 leading-relaxed">
            Garba, Dandiya, and Navratri events across the USA — from Edison to LA. Browse and get tickets in seconds.
          </p>

          {/* Airbnb-style search pill */}
          <div ref={pillRef} className="relative max-w-xl">
            <div className="flex items-stretch bg-white rounded-full shadow-lg overflow-visible border border-white/10">

              {/* Search segment */}
              <div className="flex items-center gap-2.5 px-4 py-3 flex-1 min-w-0">
                <svg className="w-4 h-4 text-aubergine/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowAll(false); setOpenPanel(null); }}
                  placeholder="Events, artists, venues…"
                  className="flex-1 min-w-0 font-ui text-sm text-aubergine placeholder-aubergine/35 outline-none bg-transparent"
                />
              </div>

              {/* Divider */}
              <div className="w-px bg-ivory-200 my-2.5 shrink-0" />

              {/* Location segment */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setOpenPanel(openPanel === 'location' ? null : 'location')}
                  className={`flex items-center gap-1.5 px-4 py-3 h-full whitespace-nowrap transition-colors ${openPanel === 'location' ? 'bg-ivory/60' : 'hover:bg-ivory/40'}`}
                >
                  <span className="text-sm leading-none">📍</span>
                  <span className="font-ui text-sm text-aubergine font-medium truncate max-w-[100px]">{locationLabel}</span>
                  {chevron}
                </button>

                {openPanel === 'location' && (
                  <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-ivory-200 overflow-hidden z-50 min-w-[180px]">
                    <div className="px-3 py-2 border-b border-ivory-200">
                      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Location</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1.5">
                      {cities.map(c => (
                        <button key={c} type="button"
                          onClick={() => { setActiveCity(c); setOpenPanel(null); setShowAll(false); }}
                          className={`w-full text-left px-4 py-2.5 font-ui text-sm transition-colors flex items-center gap-2.5 ${
                            activeCity === c ? 'text-aubergine font-semibold bg-marigold/8' : 'text-ink hover:bg-ivory'
                          }`}>
                          {activeCity === c && <span className="w-1.5 h-1.5 rounded-full bg-marigold shrink-0" />}
                          {activeCity !== c && <span className="w-1.5 h-1.5 shrink-0" />}
                          {c === 'All Cities' ? 'Anywhere' : c}
                          {c === 'All Cities' && geoCity && (
                            <span className="ml-auto font-mono text-[9px] text-ink-muted/60">Near {geoCity}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="w-px bg-ivory-200 my-2.5 shrink-0" />

              {/* Category segment */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setOpenPanel(openPanel === 'category' ? null : 'category')}
                  className={`flex items-center gap-1.5 px-4 py-3 h-full whitespace-nowrap transition-colors ${openPanel === 'category' ? 'bg-ivory/60' : 'hover:bg-ivory/40'}`}
                >
                  <span className="font-ui text-sm text-aubergine font-medium">{categoryLabel}</span>
                  {chevron}
                </button>

                {openPanel === 'category' && (
                  <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-ivory-200 overflow-hidden z-50 min-w-[160px]">
                    <div className="px-3 py-2 border-b border-ivory-200">
                      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Event type</p>
                    </div>
                    <div className="py-1.5">
                      {categories.map(cat => (
                        <button key={cat} type="button"
                          onClick={() => { setActiveCategory(cat); setOpenPanel(null); setShowAll(false); }}
                          className={`w-full text-left px-4 py-2.5 font-ui text-sm transition-colors flex items-center gap-2.5 ${
                            activeCategory === cat ? 'text-aubergine font-semibold bg-marigold/8' : 'text-ink hover:bg-ivory'
                          }`}>
                          {activeCategory === cat && <span className="w-1.5 h-1.5 rounded-full bg-marigold shrink-0" />}
                          {activeCategory !== cat && <span className="w-1.5 h-1.5 shrink-0" />}
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Search button */}
              <div className="p-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpenPanel(null)}
                  className="flex items-center justify-center w-10 h-full rounded-full bg-marigold hover:bg-[#d4891b] transition-colors"
                  aria-label="Search"
                >
                  <svg className="w-4 h-4 text-aubergine" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Active filter chips below pill */}
            {(search || activeCity !== 'All Cities' || activeCategory !== 'All') && (
              <div className="flex flex-wrap gap-2 mt-3">
                {activeCity !== 'All Cities' && (
                  <button onClick={() => { setActiveCity('All Cities'); setShowAll(false); }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/15 text-white hover:bg-white/25 transition-colors backdrop-blur-sm">
                    📍 {activeCity} <span className="opacity-60">×</span>
                  </button>
                )}
                {activeCategory !== 'All' && (
                  <button onClick={() => { setActiveCategory('All'); setShowAll(false); }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/15 text-white hover:bg-white/25 transition-colors backdrop-blur-sm">
                    {activeCategory} <span className="opacity-60">×</span>
                  </button>
                )}
                {search && (
                  <button onClick={() => { setSearch(''); setShowAll(false); }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/15 text-white hover:bg-white/25 transition-colors backdrop-blur-sm">
                    &ldquo;{search}&rdquo; <span className="opacity-60">×</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick stats */}
          {!loading && (
            <div className="flex flex-wrap gap-6 mt-8 pt-8 border-t border-white/10">
              {[
                { label: 'Live Events', value: String(events.length) },
                { label: 'Cities', value: String(new Set(events.map(e => e.city)).size) },
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

      {/* Sort / category strip */}
      <div className="sticky top-0 z-30 bg-white/95 border-b border-ivory-200" style={{ backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 overflow-x-auto">
          <div className="flex gap-1.5 shrink-0">
            {categories.map(cat => (
              <button key={cat} onClick={() => { setActiveCategory(cat); setShowAll(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat ? 'bg-marigold text-aubergine font-semibold' : 'text-ink-muted hover:text-ink hover:bg-ivory'
                }`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="ml-auto shrink-0">
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="text-xs font-ui text-ink-muted bg-transparent border border-ivory-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-aubergine cursor-pointer">
              {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
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
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <p className="font-ui text-sm text-ink">
                <span className="font-bold">{filtered.length}</span>
                <span className="text-ink-muted"> event{filtered.length !== 1 ? 's' : ''}</span>
                {activeCity !== 'All Cities' && <span className="text-ink-muted"> in {activeCity}</span>}
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-24">
                <p className="font-display text-2xl font-bold text-ink mb-2">No events found</p>
                <p className="font-ui text-ink-muted text-sm mb-6">Try adjusting your filters.</p>
                <button onClick={() => { setSearch(''); setActiveCategory('All'); setActiveCity('All Cities'); }}
                  className="px-6 py-3 rounded-2xl bg-marigold text-aubergine font-semibold text-sm hover:bg-[#d4891b] transition-colors">
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {displayed.map(ev => <EventCard key={ev.id} event={ev} />)}
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
