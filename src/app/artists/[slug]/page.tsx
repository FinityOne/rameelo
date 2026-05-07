"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { use } from "react";
import { artists, garbaEvents } from "@/lib/events-data";

function YouTubeCard({ song, color }: { song: { title: string; album: string; year: number; youtubeId: string; streams: string }; color: string }) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${song.youtubeId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative rounded-2xl overflow-hidden border border-ivory-200 hover:border-transparent hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 bg-white"
    >
      {/* Thumbnail mock */}
      <div className="relative h-36 flex items-center justify-center overflow-hidden" style={{ backgroundColor: color }}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-2 right-2 w-20 h-20 rounded-full border border-white" />
          <div className="absolute bottom-2 left-2 w-12 h-12 rounded-full border border-white" />
        </div>
        {/* Play button */}
        <div className="relative w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center group-hover:scale-110 transition-transform">
          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {/* YouTube wordmark */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 rounded px-2 py-1">
          <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-2.75 12.56 12.56 0 00-4.56-.88A12.56 12.56 0 006.7 3.94a4.83 4.83 0 01-3.77 2.75A22.1 22.1 0 002 12a22.1 22.1 0 00.93 5.31 4.83 4.83 0 003.77 2.75 12.56 12.56 0 004.56.88 12.56 12.56 0 004.56-.88 4.83 4.83 0 003.77-2.75A22.1 22.1 0 0022 12a22.1 22.1 0 00-.41-5.31zM9.75 15.02V8.98L15.5 12z"/></svg>
          <span className="font-mono text-[9px] text-white uppercase tracking-wide">YouTube</span>
        </div>
        {/* Streams badge */}
        <div className="absolute bottom-3 right-3 bg-black/60 rounded-full px-2 py-1">
          <span className="font-mono text-[9px] text-white">{song.streams} streams</span>
        </div>
      </div>

      <div className="p-3.5">
        <p className="font-display font-bold text-ink text-sm leading-tight mb-0.5 group-hover:text-aubergine transition-colors">{song.title}</p>
        <p className="font-ui text-xs text-ink-muted">{song.album} · {song.year}</p>
      </div>
    </a>
  );
}

function StatPill({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="text-center px-6 py-4 rounded-2xl bg-white/10 border border-white/15">
      <p className="font-display font-bold text-white text-2xl sm:text-3xl leading-none" style={{ letterSpacing: "-0.02em" }}>{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-white/50 mt-1.5">{label}</p>
    </div>
  );
}

export default function ArtistDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const artist = artists.find((a) => a.slug === slug);
  if (!artist) return notFound();

  const artistEvents = garbaEvents
    .filter((e) => e.artistSlug === slug && e.dateISO >= "2026-05-07")
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
    .slice(0, 6);

  const otherArtists = artists.filter((a) => a.slug !== slug).slice(0, 4);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F2" }}>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Full-bleed gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${artist.color} 0%, #1a0a1f 60%, #2E1B30 100%)`,
          }}
        />
        {/* Decorative rings */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] -translate-y-1/3 translate-x-1/3 rounded-full opacity-10 border-2 border-white" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] -translate-y-1/4 translate-x-1/4 rounded-full opacity-10 border border-white" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] translate-y-1/2 -translate-x-1/2 rounded-full opacity-10 border-2 border-white" />
        {/* Color accent glow */}
        <div className="absolute top-1/2 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ backgroundColor: artist.color }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-10">
            <Link href="/artists" className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              All Artists
            </Link>
            <span className="text-white/20">/</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-white/40">{artist.name}</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start lg:items-end">
            {/* Left: Identity */}
            <div className="flex-1">
              {/* Genre pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/20 bg-white/10 mb-5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#F5A623" }} />
                <span className="font-mono text-[11px] uppercase tracking-widest text-white/70">{artist.genre}</span>
              </div>

              {/* Name */}
              <h1 className="font-display font-bold text-white leading-none mb-2" style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", letterSpacing: "-0.04em" }}>
                {artist.name}
              </h1>
              <p className="font-mono text-[13px] uppercase tracking-widest mb-6" style={{ color: "#F5A623", opacity: 0.9 }}>
                {artist.title} · {artist.origin}
              </p>

              {/* Bio */}
              <p className="font-ui text-white/70 text-base sm:text-lg leading-relaxed max-w-2xl mb-8">
                {artist.bio}
              </p>

              {/* Social + Channel links */}
              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://www.youtube.com/@${artist.youtubeChannel}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-ui font-semibold text-sm transition-all"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-2.75 12.56 12.56 0 00-4.56-.88A12.56 12.56 0 006.7 3.94a4.83 4.83 0 01-3.77 2.75A22.1 22.1 0 002 12a22.1 22.1 0 00.93 5.31 4.83 4.83 0 003.77 2.75 12.56 12.56 0 004.56.88 12.56 12.56 0 004.56-.88 4.83 4.83 0 003.77-2.75A22.1 22.1 0 0022 12a22.1 22.1 0 00-.41-5.31zM9.75 15.02V8.98L15.5 12z"/></svg>
                  YouTube Channel
                </a>
                <a
                  href={`https://www.instagram.com/${artist.instagramHandle.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-ui font-semibold text-sm transition-all"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  {artist.instagramHandle}
                </a>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 lg:min-w-[280px]">
              <StatPill value={artist.followers} label="Followers" color={artist.color} />
              <StatPill value={artist.showsPerformed.toLocaleString()} label="Shows" color={artist.color} />
              <StatPill value={artist.awardsCount} label="Awards" color={artist.color} />
              <StatPill value={artist.yearsActive.split("–")[0]} label="Since" color={artist.color} />
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="relative h-12 overflow-hidden">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <path d="M0 48L1440 48L1440 0C1440 0 1080 48 720 48C360 48 0 0 0 0L0 48Z" fill="#FCF9F2"/>
          </svg>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">

        {/* ── FUN FACT BANNER ──────────────────────────────────────────────── */}
        <div
          className="rounded-3xl p-6 sm:p-8 flex gap-5 items-start border"
          style={{ backgroundColor: artist.accentColor, borderColor: `${artist.color}25` }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: artist.color }}
          >
            <span className="text-white">★</span>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: artist.color }}>Did you know?</p>
            <p className="font-display font-bold text-ink text-lg sm:text-xl leading-snug" style={{ letterSpacing: "-0.01em" }}>
              {artist.funFact}
            </p>
          </div>
        </div>

        {/* ── POPULAR SONGS + YOUTUBE ──────────────────────────────────────── */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">Most Popular</p>
              <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                Songs & Videos
              </h2>
            </div>
            <a
              href={`https://www.youtube.com/@${artist.youtubeChannel}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-ui text-sm font-semibold text-ink-muted hover:text-red-600 transition-colors"
            >
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-2.75 12.56 12.56 0 00-4.56-.88A12.56 12.56 0 006.7 3.94a4.83 4.83 0 01-3.77 2.75A22.1 22.1 0 002 12a22.1 22.1 0 00.93 5.31 4.83 4.83 0 003.77 2.75 12.56 12.56 0 004.56.88 12.56 12.56 0 004.56-.88 4.83 4.83 0 003.77-2.75A22.1 22.1 0 0022 12a22.1 22.1 0 00-.41-5.31zM9.75 15.02V8.98L15.5 12z"/></svg>
              View all on YouTube →
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {artist.popularSongs.map((song) => (
              <YouTubeCard key={song.youtubeId} song={song} color={artist.color} />
            ))}
          </div>
        </section>

        {/* ── ACCOLADES ────────────────────────────────────────────────────── */}
        <section>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">Recognition</p>
          <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl mb-6" style={{ letterSpacing: "-0.02em" }}>
            Awards & Honours
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {artist.accolades.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-ivory-200 hover:border-marigold/30 transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-display font-bold text-sm shrink-0"
                  style={{ backgroundColor: artist.color }}
                >
                  {i + 1}
                </div>
                <p className="font-ui text-sm text-ink leading-snug pt-1">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── UPCOMING EVENTS ──────────────────────────────────────────────── */}
        {artistEvents.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">Navratri 2026</p>
                <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                  Upcoming Shows
                </h2>
              </div>
              <Link href={`/events?artist=${artist.slug}`} className="font-ui text-sm font-semibold text-ink-muted hover:text-aubergine transition-colors">
                All shows →
              </Link>
            </div>

            <div className="space-y-3">
              {artistEvents.map((event) => {
                const soldPct = Math.round((event.soldTickets / event.totalTickets) * 100);
                const isSoldOut = event.soldTickets >= event.totalTickets;
                const isAlmostGone = soldPct >= 90 && !isSoldOut;
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="group flex items-center gap-4 p-4 rounded-2xl bg-white border border-ivory-200 hover:border-marigold/30 hover:shadow-md transition-all"
                  >
                    {/* Date block */}
                    <div
                      className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 text-white"
                      style={{ backgroundColor: artist.color }}
                    >
                      <p className="font-display font-bold text-xl leading-none">{event.date.split(" ")[1].replace(",", "")}</p>
                      <p className="font-mono text-[9px] uppercase tracking-wide opacity-70">{event.date.split(" ")[0]}</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-ink text-sm leading-tight group-hover:text-aubergine transition-colors truncate">
                        {event.title}
                      </h3>
                      <p className="font-ui text-xs text-ink-muted mt-0.5 truncate">
                        {event.venue} · {event.city}, {event.state}
                      </p>
                      {/* Sell-through bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-ivory-200 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${soldPct}%`, backgroundColor: isSoldOut ? "#7C1F2C" : isAlmostGone ? "#D4891B" : artist.color }}
                          />
                        </div>
                        <span className={`font-mono text-[9px] uppercase tracking-wide shrink-0 ${isSoldOut ? "text-durga font-bold" : isAlmostGone ? "text-amber-600 font-bold" : "text-ink-muted"}`}>
                          {isSoldOut ? "Sold out" : isAlmostGone ? "Almost gone" : `${soldPct}% sold`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-display font-bold text-ink text-base">${event.price}</p>
                      <p className="font-mono text-[9px] uppercase tracking-wide text-ink-muted">GA</p>
                    </div>

                    <svg className="w-4 h-4 text-ink-muted group-hover:text-aubergine transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                    </svg>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl font-display font-bold text-sm hover:opacity-90 transition-all"
                style={{ backgroundColor: artist.color, color: "white" }}
              >
                Get tickets →
              </Link>
            </div>
          </section>
        )}

        {/* ── MORE ARTISTS ─────────────────────────────────────────────────── */}
        <section>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">Also Performing</p>
          <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl mb-6" style={{ letterSpacing: "-0.02em" }}>
            More Artists
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {otherArtists.map((a) => (
              <Link
                key={a.slug}
                href={`/artists/${a.slug}`}
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-white border border-ivory-200 hover:border-transparent hover:shadow-lg transition-all hover:-translate-y-0.5 text-center"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-display font-bold text-xl group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: a.color }}
                >
                  {a.initials}
                </div>
                <div>
                  <p className="font-display font-bold text-ink text-sm leading-tight group-hover:text-aubergine transition-colors">{a.name}</p>
                  <p className="font-mono text-[9px] uppercase tracking-wide text-ink-muted mt-0.5">{a.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
