import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { personSchema, breadcrumbSchema, ld } from "@/lib/jsonld";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select("name, tagline, bio, profile_image_url, genres, based_in, hometown_city, hometown_state, instagram_url, website_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!data) return { title: "Artist | Rameelo" };

  const location = data.based_in || [data.hometown_city, data.hometown_state].filter(Boolean).join(", ");
  const description = data.bio?.slice(0, 160) ??
    `${data.name} — garba artist${location ? ` based in ${location}` : ""}. Book tickets to upcoming events on Rameelo.`;

  return {
    title: `${data.name} — Garba Artist | Rameelo`,
    description,
    keywords: [data.name, "garba artist", "raas garba performer", "navratri artist usa", ...(data.genres ?? [])],
    alternates: { canonical: `https://rameelo.com/artists/${slug}` },
    openGraph: {
      title: `${data.name} — Garba Artist | Rameelo`,
      description,
      type: "profile",
      url: `https://rameelo.com/artists/${slug}`,
      siteName: "Rameelo",
      images: data.profile_image_url
        ? [{ url: data.profile_image_url, width: 800, height: 800, alt: data.name }]
        : [{ url: "https://rameelo.com/og-default.jpg", width: 1200, height: 630, alt: data.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.name} — Garba Artist | Rameelo`,
      description,
      images: data.profile_image_url ? [data.profile_image_url] : ["https://rameelo.com/og-default.jpg"],
    },
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ArtistFull = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  bio: string | null;
  bio_long: string | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  genres: string[];
  performance_style: string | null;
  instruments: string[];
  years_active_since: number | null;
  based_in: string | null;
  hometown_city: string | null;
  hometown_state: string | null;
  website_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  spotify_url: string | null;
  apple_music_url: string | null;
  tiktok_url: string | null;
  video_urls: string[];
  notable_events: string | null;
  awards: string | null;
  is_featured: boolean;
  verified: boolean;
};

type Tier = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  quantity_sold: number;
  is_visible: boolean;
};

type EventRow = {
  id: string;
  title: string;
  start_date: string;
  start_time: string | null;
  venue_name: string | null;
  city: string;
  state: string;
  cover_gradient: string | null;
  ticket_tiers: Tier[];
};

type OtherArtist = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  profile_image_url: string | null;
  genres: string[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const GENRE_COLORS: Record<string, string> = {
  Garba: "#2E1B30",
  Dandiya: "#7C1F2C",
  Raas: "#3D2543",
  Fusion: "#0E5A52",
  Bollywood: "#4a1040",
  Sufi: "#1A2A4A",
  Folk: "#4a2800",
  Classical: "#1a3020",
};

function genreColor(genres: string[]): string {
  for (const g of genres) if (GENRE_COLORS[g]) return GENRE_COLORS[g];
  return "#2E1B30";
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return {
    month: d.toLocaleString("en-US", { month: "short" }),
    day: String(d.getDate()),
  };
}

function eventStats(tiers: Tier[]) {
  const visible = tiers.filter((t) => t.is_visible);
  const totalQty = visible.reduce((s, t) => s + t.quantity, 0);
  const totalSold = visible.reduce((s, t) => s + t.quantity_sold, 0);
  const soldPct = totalQty > 0 ? Math.round((totalSold / totalQty) * 100) : 0;
  const minPrice = visible.length > 0 ? Math.min(...visible.map((t) => t.price)) : null;
  const isSoldOut = totalQty > 0 && totalSold >= totalQty;
  const isAlmostGone = soldPct >= 85 && !isSoldOut;
  return { soldPct, minPrice, isSoldOut, isAlmostGone };
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\s]+)/);
  return m ? m[1] : null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center px-6 py-4 rounded-2xl bg-white/10 border border-white/15">
      <p className="font-display font-bold text-white text-2xl sm:text-3xl leading-none" style={{ letterSpacing: "-0.02em" }}>{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-white/50 mt-1.5">{label}</p>
    </div>
  );
}

function ArtistAvatar({ artist, size = 64 }: { artist: ArtistFull | OtherArtist; size?: number }) {
  const initials = artist.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (artist.profile_image_url) {
    return <img src={artist.profile_image_url} alt={artist.name} className="rounded-2xl object-cover border-2 border-white/30" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <span className="font-display font-bold text-white" style={{ fontSize: size * 0.38, letterSpacing: "-0.02em" }}>{initials}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ArtistDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: artistData } = await supabase
    .from("artists")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!artistData) notFound();

  const artist = artistData as ArtistFull;
  const heroColor = genreColor(artist.genres);
  const today = new Date().toISOString().split("T")[0];
  const location = artist.based_in || [artist.hometown_city, artist.hometown_state].filter(Boolean).join(", ");
  const yearsActive = artist.years_active_since ? new Date().getFullYear() - artist.years_active_since : null;

  // Upcoming events for this artist
  const { data: eventsRaw } = await supabase
    .from("events")
    .select(`
      id, title, start_date, start_time, venue_name, city, state, cover_gradient,
      ticket_tiers (id, name, price, quantity, quantity_sold, is_visible)
    `)
    .eq("artist_id", artist.id)
    .eq("status", "published")
    .gte("start_date", today)
    .order("start_date")
    .limit(6);

  // Other active artists
  const { data: othersRaw } = await supabase
    .from("artists")
    .select("id, name, slug, tagline, profile_image_url, genres")
    .eq("is_active", true)
    .neq("id", artist.id)
    .limit(4);

  const events = (eventsRaw ?? []) as EventRow[];
  const otherArtists = (othersRaw ?? []) as OtherArtist[];

  const awardsList = artist.awards
    ? artist.awards.split("\n").map((s) => s.trim()).filter(Boolean)
    : [];
  const videoUrls = artist.video_urls ?? [];
  const youtubeVideos = videoUrls.map((url) => ({ url, id: extractYouTubeId(url) })).filter((v) => v.id);

  const sameAs = [artist.instagram_url, artist.website_url, artist.youtube_url, artist.spotify_url, artist.tiktok_url].filter(Boolean) as string[];
  const artistLd = personSchema({
    name: artist.name,
    slug,
    description: artist.bio ?? undefined,
    imageUrl: artist.profile_image_url ?? undefined,
    basedIn: location || undefined,
    sameAs,
  });
  const crumbs = breadcrumbSchema([
    { name: "Home", url: "https://rameelo.com" },
    { name: "Artists", url: "https://rameelo.com/artists" },
    { name: artist.name, url: `https://rameelo.com/artists/${slug}` },
  ]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F2" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(artistLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbs) }} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background — cover image or gradient */}
        {artist.cover_image_url ? (
          <>
            <img src={artist.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 100%)" }} />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${heroColor} 0%, #1a0a1f 60%, #2E1B30 100%)` }} />
        )}

        {/* Decorative rings */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] -translate-y-1/3 translate-x-1/3 rounded-full opacity-10 border-2 border-white" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] -translate-y-1/4 translate-x-1/4 rounded-full opacity-10 border border-white" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] translate-y-1/2 -translate-x-1/2 rounded-full opacity-10 border-2 border-white" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-10">
            <Link href="/artists" className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              All Artists
            </Link>
            <span className="text-white/20">/</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-white/40">{artist.name}</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start lg:items-end">
            {/* Left: Identity */}
            <div className="flex-1">
              {/* Genre + status pills */}
              <div className="flex flex-wrap gap-2 mb-5">
                {artist.genres.slice(0, 3).map((g) => (
                  <div key={g} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/20 bg-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-marigold animate-pulse" />
                    <span className="font-mono text-[11px] uppercase tracking-widest text-white/70">{g}</span>
                  </div>
                ))}
                {artist.verified && (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-peacock/40 bg-peacock/20">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-peacock">✓ Verified</span>
                  </div>
                )}
              </div>

              {/* Name */}
              <h1 className="font-display font-bold text-white leading-none mb-2" style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", letterSpacing: "-0.04em" }}>
                {artist.name}
              </h1>

              {artist.tagline && (
                <p className="font-mono text-[13px] uppercase tracking-widest mb-6" style={{ color: "#F5A623", opacity: 0.9 }}>
                  {artist.tagline}{location ? ` · ${location}` : ""}
                </p>
              )}

              {/* Bio */}
              {artist.bio && (
                <p className="font-ui text-white/70 text-base sm:text-lg leading-relaxed max-w-2xl mb-8">
                  {artist.bio}
                </p>
              )}

              {/* Social links */}
              <div className="flex flex-wrap gap-3">
                {artist.youtube_url && (
                  <a href={artist.youtube_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-ui font-semibold text-sm transition-all">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-2.75 12.56 12.56 0 00-4.56-.88A12.56 12.56 0 006.7 3.94a4.83 4.83 0 01-3.77 2.75A22.1 22.1 0 002 12a22.1 22.1 0 00.93 5.31 4.83 4.83 0 003.77 2.75 12.56 12.56 0 004.56.88 12.56 12.56 0 004.56-.88 4.83 4.83 0 003.77-2.75A22.1 22.1 0 0022 12a22.1 22.1 0 00-.41-5.31zM9.75 15.02V8.98L15.5 12z" /></svg>
                    YouTube
                  </a>
                )}
                {artist.instagram_url && (
                  <a href={artist.instagram_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-ui font-semibold text-sm transition-all">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                    Instagram
                  </a>
                )}
                {artist.spotify_url && (
                  <a href={artist.spotify_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-ui font-semibold text-sm transition-all">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
                    Spotify
                  </a>
                )}
                {artist.website_url && (
                  <a href={artist.website_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-ui font-semibold text-sm transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
                    Website
                  </a>
                )}
              </div>
            </div>

            {/* Right: Stats */}
            <div className="flex flex-wrap lg:flex-col gap-3 lg:min-w-[200px]">
              {yearsActive !== null && (
                <StatPill value={`${yearsActive}+`} label="Years performing" />
              )}
              {artist.years_active_since && (
                <StatPill value={String(artist.years_active_since)} label="Active since" />
              )}
              {events.length > 0 && (
                <StatPill value={String(events.length)} label="Upcoming shows" />
              )}
              {artist.genres.length > 0 && (
                <StatPill value={artist.genres.join(" · ")} label="Style" />
              )}
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="relative h-12 overflow-hidden">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <path d="M0 48L1440 48L1440 0C1440 0 1080 48 720 48C360 48 0 0 0 0L0 48Z" fill="#FCF9F2" />
          </svg>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">

        {/* ── FULL BIO ─────────────────────────────────────────────────────── */}
        {artist.bio_long && (
          <section className="rounded-3xl p-6 sm:p-10 bg-white border border-ivory-200">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">About</p>
            <p className="font-ui text-ink text-base sm:text-lg leading-relaxed whitespace-pre-line">{artist.bio_long}</p>
          </section>
        )}

        {/* ── UPCOMING SHOWS ───────────────────────────────────────────────── */}
        {events.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">Tour Dates</p>
                <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                  Upcoming Shows
                </h2>
              </div>
              <Link href="/events" className="font-ui text-sm font-semibold text-ink-muted hover:text-aubergine transition-colors">
                All events →
              </Link>
            </div>

            <div className="space-y-3">
              {events.map((event) => {
                const { soldPct, minPrice, isSoldOut, isAlmostGone } = eventStats(event.ticket_tiers ?? []);
                const date = fmtDate(event.start_date);
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="group flex items-center gap-4 p-4 rounded-2xl bg-white border border-ivory-200 hover:border-marigold/30 hover:shadow-md transition-all"
                  >
                    {/* Date block */}
                    <div
                      className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 text-white"
                      style={{ backgroundColor: heroColor }}
                    >
                      <p className="font-display font-bold text-xl leading-none">{date.day}</p>
                      <p className="font-mono text-[9px] uppercase tracking-wide opacity-70">{date.month}</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-ink text-sm leading-tight group-hover:text-aubergine transition-colors truncate">
                        {event.title}
                      </h3>
                      <p className="font-ui text-xs text-ink-muted mt-0.5 truncate">
                        {[event.venue_name, event.city, event.state].filter(Boolean).join(" · ")}
                      </p>
                      {/* Sell-through bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-ivory-200 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${soldPct}%`,
                              backgroundColor: isSoldOut ? "#7C1F2C" : isAlmostGone ? "#D4891B" : heroColor,
                            }}
                          />
                        </div>
                        <span className={`font-mono text-[9px] uppercase tracking-wide shrink-0 ${isSoldOut ? "text-durga font-bold" : isAlmostGone ? "text-amber-600 font-bold" : "text-ink-muted"}`}>
                          {isSoldOut ? "Sold out" : isAlmostGone ? "Almost gone" : `${soldPct}% sold`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {minPrice !== null ? (
                        <>
                          <p className="font-display font-bold text-ink text-base">${minPrice}</p>
                          <p className="font-mono text-[9px] uppercase tracking-wide text-ink-muted">from</p>
                        </>
                      ) : (
                        <p className="font-mono text-[9px] uppercase tracking-wide text-ink-muted">Free</p>
                      )}
                    </div>

                    <svg className="w-4 h-4 text-ink-muted group-hover:text-aubergine transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl font-display font-bold text-sm text-white hover:opacity-90 transition-all"
                style={{ backgroundColor: heroColor }}
              >
                Get tickets →
              </Link>
            </div>
          </section>
        )}

        {/* ── VIDEOS ───────────────────────────────────────────────────────── */}
        {youtubeVideos.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">Watch</p>
                <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>Videos</h2>
              </div>
              {artist.youtube_url && (
                <a href={artist.youtube_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-ui text-sm font-semibold text-ink-muted hover:text-red-600 transition-colors">
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-2.75 12.56 12.56 0 00-4.56-.88A12.56 12.56 0 006.7 3.94a4.83 4.83 0 01-3.77 2.75A22.1 22.1 0 002 12a22.1 22.1 0 00.93 5.31 4.83 4.83 0 003.77 2.75 12.56 12.56 0 004.56.88 12.56 12.56 0 004.56-.88 4.83 4.83 0 003.77-2.75A22.1 22.1 0 0022 12a22.1 22.1 0 00-.41-5.31zM9.75 15.02V8.98L15.5 12z" /></svg>
                  View channel →
                </a>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {youtubeVideos.slice(0, 6).map(({ url, id }) => (
                <a key={id} href={url} target="_blank" rel="noopener noreferrer"
                  className="group relative rounded-2xl overflow-hidden border border-ivory-200 hover:border-transparent hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 bg-white">
                  <div className="relative h-40 overflow-hidden bg-ink">
                    <img
                      src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── NOTABLE EVENTS ───────────────────────────────────────────────── */}
        {artist.notable_events && (
          <section className="rounded-3xl p-6 sm:p-8 flex gap-5 items-start border bg-white border-ivory-200">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl shrink-0" style={{ backgroundColor: heroColor }}>★</div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine mb-2">Notable Appearances</p>
              <p className="font-ui text-ink text-sm sm:text-base leading-relaxed whitespace-pre-line">{artist.notable_events}</p>
            </div>
          </section>
        )}

        {/* ── AWARDS ───────────────────────────────────────────────────────── */}
        {awardsList.length > 0 && (
          <section>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">Recognition</p>
            <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl mb-6" style={{ letterSpacing: "-0.02em" }}>
              Awards &amp; Honours
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {awardsList.map((award, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-ivory-200 hover:border-marigold/30 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-display font-bold text-sm shrink-0" style={{ backgroundColor: heroColor }}>
                    {i + 1}
                  </div>
                  <p className="font-ui text-sm text-ink leading-snug pt-1">{award}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── MORE ARTISTS ─────────────────────────────────────────────────── */}
        {otherArtists.length > 0 && (
          <section>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">Also Performing</p>
            <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl mb-6" style={{ letterSpacing: "-0.02em" }}>
              More Artists
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {otherArtists.map((a) => {
                const initials = a.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                const color = genreColor(a.genres ?? []);
                return (
                  <Link
                    key={a.id}
                    href={`/artists/${a.slug}`}
                    className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-white border border-ivory-200 hover:border-transparent hover:shadow-lg transition-all hover:-translate-y-0.5 text-center"
                  >
                    {a.profile_image_url ? (
                      <img src={a.profile_image_url} alt={a.name} className="w-14 h-14 rounded-2xl object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-display font-bold text-xl group-hover:scale-105 transition-transform" style={{ backgroundColor: color }}>
                        {initials}
                      </div>
                    )}
                    <div>
                      <p className="font-display font-bold text-ink text-sm leading-tight group-hover:text-aubergine transition-colors">{a.name}</p>
                      {a.tagline && <p className="font-mono text-[9px] uppercase tracking-wide text-ink-muted mt-0.5 truncate">{a.tagline}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
