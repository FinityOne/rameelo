"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { garbaEvents, artists, type GarbaEvent } from "@/lib/events-data";

const categories = ["All", "Garba", "Dandiya", "Disco Dandiya", "Fusion Garba", "Traditional Garba", "Sufi Garba"];
const sortOptions = ["Date: Soonest", "Price: Low to High", "Price: High to Low", "Availability"];

const allCities = Array.from(new Set(garbaEvents.map((e) => e.city))).sort();

function ArtistInitials({ initials, color, size = "md" }: { initials: string; color: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return (
    <span
      className={`${sz} rounded-full inline-flex items-center justify-center font-bold text-white shrink-0`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  );
}

function EventCard({ event }: { event: GarbaEvent }) {
  const pct = Math.round((event.soldTickets / event.totalTickets) * 100);
  const soldOut = event.soldTickets >= event.totalTickets;
  const almostGone = !soldOut && pct >= 85;
  const artist = artists.find((a) => a.slug === event.artistSlug)!;

  const categoryGradient: Record<string, string> = {
    "Garba":             "from-aubergine to-durga",
    "Dandiya":           "from-durga to-[#5a1e7a]",
    "Disco Dandiya":     "from-[#5a1e7a] to-aubergine",
    "Fusion Garba":      "from-peacock to-aubergine",
    "Traditional Garba": "from-aubergine-light to-aubergine",
    "Sufi Garba":        "from-[#0a4f46] to-aubergine",
  };
  const gradClass = categoryGradient[event.category] ?? "from-aubergine to-durga";

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-ivory-200 hover:border-marigold/30 hover:shadow-lg transition-all group flex flex-col">
      {/* Card header */}
      <div className={`h-36 relative flex flex-col justify-between p-4 bg-gradient-to-br ${gradClass}`}>
        <div className="flex items-start justify-between">
          <span
            className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full text-white/90"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)" }}
          >
            {event.category}
          </span>
          <div className="flex gap-1.5">
            {soldOut && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-white">
                Sold Out
              </span>
            )}
            {almostGone && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-marigold/25 border border-marigold/40 text-marigold">
                Almost Gone
              </span>
            )}
            {event.featured && !soldOut && !almostGone && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-marigold/90 text-aubergine">
                Featured
              </span>
            )}
          </div>
        </div>

        {/* Artist pill */}
        <div
          className="flex items-center gap-2 w-fit px-2.5 py-1.5 rounded-full"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }}
        >
          <ArtistInitials initials={artist.initials} color={artist.color} size="sm" />
          <div>
            <p className="text-white text-xs font-semibold leading-none">{artist.name}</p>
            <p className="text-white/60 text-[10px] leading-none mt-0.5">{artist.title}</p>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1">
        <p className="font-mono text-[10px] text-ink-muted uppercase tracking-widest mb-1">
          {event.date} · {event.city}, {event.state}
        </p>
        <Link href={`/events/${event.id}`}>
          <h3 className="font-display font-bold text-ink text-sm leading-snug mb-2 line-clamp-2 group-hover:text-aubergine transition-colors">
            {event.title}
          </h3>
        </Link>
        <p className="font-ui text-ink-muted text-xs leading-relaxed line-clamp-2 mb-3 flex-1">
          {event.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {event.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="bg-ivory text-ink-muted text-[10px] font-medium px-2 py-0.5 rounded-full border border-ivory-200"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-ink-muted mb-1">
            <span>{pct}% sold</span>
            <span>{(event.totalTickets - event.soldTickets).toLocaleString()} left</span>
          </div>
          <div className="h-1 bg-ivory-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: soldOut ? "#6B5E6E" : almostGone ? "#D4891B" : "#0E8C7A",
              }}
            />
          </div>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between pt-1 border-t border-ivory-200">
          <div>
            <span className="font-display font-bold text-ink text-base">${event.price}</span>
            {event.priceVIP && (
              <span className="text-ink-muted text-xs ml-1">/ VIP ${event.priceVIP}</span>
            )}
          </div>
          <Link
            href={soldOut ? "#" : `/events/${event.id}`}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              soldOut
                ? "bg-ivory text-ink-muted cursor-not-allowed border border-ivory-200 pointer-events-none"
                : "bg-marigold text-aubergine hover:bg-marigold-dark"
            }`}
          >
            {soldOut ? "Sold Out" : "Get Tickets"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [search, setSearch] = useState("");
  const [activeArtist, setActiveArtist] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeCity, setActiveCity] = useState("All Cities");
  const [sort, setSort] = useState("Date: Soonest");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    let result = [...garbaEvents];

    if (activeArtist) {
      result = result.filter((e) => e.artistSlug === activeArtist);
    }
    if (activeCategory !== "All") {
      result = result.filter((e) => e.category === activeCategory);
    }
    if (activeCity !== "All Cities") {
      result = result.filter((e) => e.city === activeCity);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.artist.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q) ||
          e.venue.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sort === "Date: Soonest") return a.dateISO.localeCompare(b.dateISO);
      if (sort === "Price: Low to High") return a.price - b.price;
      if (sort === "Price: High to Low") return b.price - a.price;
      if (sort === "Availability") {
        const pctA = a.soldTickets / a.totalTickets;
        const pctB = b.soldTickets / b.totalTickets;
        return pctA - pctB;
      }
      return 0;
    });

    return result;
  }, [search, activeArtist, activeCategory, activeCity, sort]);

  const displayed = showAll ? filtered : filtered.slice(0, 24);

  const totalNavratri = garbaEvents.filter((e) => e.isNavratri).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F2" }}>
      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: "#2E1B30" }}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #F5A623 0%, transparent 60%), radial-gradient(circle at 80% 20%, #7C1F2C 0%, transparent 50%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <p className="font-mono text-marigold text-xs font-bold uppercase tracking-widest mb-4">
            Navratri 2026 · {garbaEvents.length} Events Nationwide
          </p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 max-w-3xl">
            Find Your <span className="text-marigold">Garba.</span>
            <br />
            <span className="text-white/60 text-3xl md:text-4xl lg:text-5xl font-medium">
              Every artist. Every city.
            </span>
          </h1>
          <p className="font-ui text-white/60 text-base max-w-xl mb-8 leading-relaxed">
            {garbaEvents.length} Garba, Dandiya, and Navratri events across the USA — from Edison to LA.
            {" "}{totalNavratri} events featuring live Navratri performances.
          </p>

          {/* Search bar */}
          <div className="flex gap-3 max-w-2xl">
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowAll(false); }}
                placeholder="Search events, artists, cities…"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-ui focus:outline-none focus:ring-2 focus:ring-marigold/50 text-aubergine placeholder-aubergine/40"
                style={{ backgroundColor: "rgba(255,255,255,0.95)" }}
              />
            </div>
            <select
              value={activeCity}
              onChange={(e) => { setActiveCity(e.target.value); setShowAll(false); }}
              className="px-4 py-3.5 rounded-2xl text-sm font-ui text-aubergine focus:outline-none focus:ring-2 focus:ring-marigold/50 cursor-pointer"
              style={{ backgroundColor: "rgba(255,255,255,0.95)" }}
            >
              <option>All Cities</option>
              {allCities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Quick stats strip */}
          <div className="flex flex-wrap gap-6 mt-8 pt-8 border-t border-white/10">
            {[
              { label: "Live Artists", value: "10" },
              { label: "Cities", value: String(allCities.length) },
              { label: "Navratri Events", value: String(totalNavratri) },
              { label: "Nights of Garba", value: "9" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display font-bold text-2xl text-white">{s.value}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Filters ── */}
      <div className="sticky top-0 z-30 bg-white/95 border-b border-ivory-200" style={{ backdropFilter: "blur(12px)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
          {/* Artist filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => { setActiveArtist(null); setShowAll(false); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeArtist === null
                  ? "bg-aubergine text-white"
                  : "bg-ivory border border-ivory-200 text-ink-muted hover:border-aubergine/30 hover:text-ink"
              }`}
            >
              All Artists
            </button>
            {artists.map((artist) => (
              <button
                key={artist.slug}
                onClick={() => { setActiveArtist(artist.slug); setShowAll(false); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  activeArtist === artist.slug
                    ? "text-white"
                    : "bg-ivory border border-ivory-200 text-ink-muted hover:text-ink"
                }`}
                style={
                  activeArtist === artist.slug
                    ? { backgroundColor: artist.color, borderColor: artist.color }
                    : {}
                }
              >
                <ArtistInitials initials={artist.initials} color={activeArtist === artist.slug ? "rgba(255,255,255,0.3)" : artist.color} size="sm" />
                {artist.name}
              </button>
            ))}
          </div>

          {/* Category + sort row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <div className="flex gap-1.5 shrink-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setShowAll(false); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? "bg-marigold text-aubergine font-semibold"
                      : "text-ink-muted hover:text-ink hover:bg-ivory"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="text-xs font-ui text-ink-muted bg-transparent border border-ivory-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-aubergine cursor-pointer"
              >
                {sortOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active filters + results count */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-ui text-ink text-sm">
              <span className="font-bold">{filtered.length}</span>
              <span className="text-ink-muted"> events</span>
            </p>
            {activeArtist && (
              <button
                onClick={() => setActiveArtist(null)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-aubergine/10 text-aubergine hover:bg-aubergine/20 transition-colors"
              >
                {artists.find((a) => a.slug === activeArtist)?.name}
                <span className="text-aubergine/60">×</span>
              </button>
            )}
            {activeCategory !== "All" && (
              <button
                onClick={() => setActiveCategory("All")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-marigold/10 text-marigold-dark hover:bg-marigold/20 transition-colors"
              >
                {activeCategory}
                <span className="text-marigold/60">×</span>
              </button>
            )}
            {activeCity !== "All Cities" && (
              <button
                onClick={() => setActiveCity("All Cities")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-peacock/10 text-peacock hover:bg-peacock/20 transition-colors"
              >
                {activeCity}
                <span className="text-peacock/60">×</span>
              </button>
            )}
            {search && (
              <button
                onClick={() => setSearch("")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-ivory border border-ivory-200 text-ink-muted hover:text-ink transition-colors"
              >
                &ldquo;{search}&rdquo;
                <span className="text-ink-muted/60">×</span>
              </button>
            )}
          </div>
        </div>

        {/* Featured strip (when no filters active) */}
        {!activeArtist && activeCategory === "All" && activeCity === "All Cities" && !search && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Featured</span>
              <div className="h-px flex-1 bg-ivory-200" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {garbaEvents.filter((e) => e.featured).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            <div className="flex items-center gap-2 mb-4 mt-10">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">All Events</span>
              <div className="h-px flex-1 bg-ivory-200" />
            </div>
          </div>
        )}

        {/* Event grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-display text-2xl font-bold text-ink mb-2">No events found</p>
            <p className="font-ui text-ink-muted text-sm mb-6">Try adjusting your filters or search term.</p>
            <button
              onClick={() => { setSearch(""); setActiveArtist(null); setActiveCategory("All"); setActiveCity("All Cities"); }}
              className="px-6 py-3 rounded-2xl bg-marigold text-aubergine font-semibold text-sm hover:bg-marigold-dark transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {displayed.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {filtered.length > 24 && !showAll && (
              <div className="text-center mt-12">
                <button
                  onClick={() => setShowAll(true)}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl border-2 border-aubergine text-aubergine font-semibold text-sm hover:bg-aubergine hover:text-white transition-all"
                >
                  Show all {filtered.length} events
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Artists section ── */}
      <section className="border-t border-ivory-200 mt-12 py-16" style={{ backgroundColor: "#2E1B30" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-marigold text-xs font-bold uppercase tracking-widest mb-3">Performing This Season</p>
          <h2 className="font-display text-3xl font-bold text-white mb-10">
            Top Garba Artists of 2026
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {artists.map((artist) => {
              const count = garbaEvents.filter((e) => e.artistSlug === artist.slug).length;
              return (
                <button
                  key={artist.slug}
                  onClick={() => { setActiveArtist(artist.slug); window.scrollTo({ top: 0, behavior: "smooth" }); setShowAll(false); }}
                  className="group flex flex-col items-center gap-3 p-4 rounded-2xl border border-white/10 hover:border-marigold/40 hover:bg-white/5 transition-all text-center"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: artist.color }}
                  >
                    {artist.initials}
                  </div>
                  <div>
                    <p className="font-display font-semibold text-white text-sm leading-tight group-hover:text-marigold transition-colors">
                      {artist.name}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-white/40 mt-0.5">
                      {artist.title}
                    </p>
                    <p className="font-ui text-xs text-white/60 mt-1">
                      {count} event{count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
