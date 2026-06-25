import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { personSchema, breadcrumbSchema, ld } from "@/lib/jsonld";
import FollowButton, { ShareButton } from "./FollowButton";
import { GRADIENTS } from "@/app/organizer/events/create/types";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ via?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select("name, tagline, bio, profile_image_url, cover_image_url, genres, based_in, hometown_city, hometown_state, instagram_url, website_url, custom_domain")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!data) return { title: "Artist | Rameelo" };

  const location = data.based_in || [data.hometown_city, data.hometown_state].filter(Boolean).join(", ");
  const genres: string[] = data.genres ?? [];
  const description = data.bio?.slice(0, 155) ??
    `${data.name} — ${genres.length ? genres.slice(0,2).join(" & ") + " " : ""}garba artist${location ? ` based in ${location}` : ""}. See upcoming events and buy tickets on Rameelo.`;

  // When served from the artist's own vanity domain, point canonical/og:url at it
  // so shares resolve cleanly to the artist's domain (not rameelo.com).
  const reqHost = (await headers()).get("host")?.split(":")[0].toLowerCase().replace(/^www\./, "") ?? "";
  const vanity = (data.custom_domain ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  const onVanity = !!vanity && reqHost === vanity;
  const pageUrl = onVanity ? `https://${vanity}` : `https://rameelo.com/artists/${slug}`;

  // Prefer the artist photo for the share card; fall back to cover, then default.
  const shareImg = data.profile_image_url || data.cover_image_url;
  const ogImage = shareImg
    ? [{ url: shareImg, width: 800, height: 800, alt: `${data.name} — Garba Artist` }]
    : [{ url: "https://rameelo.com/og-default.jpg", width: 1200, height: 630, alt: `${data.name} on Rameelo` }];

  const title = `${data.name} — ${genres[0] ?? "Garba"} Artist`;

  return {
    metadataBase: new URL(pageUrl),
    title: `${title} | Rameelo`,
    description,
    keywords: [
      data.name,
      `${data.name} garba`,
      `${data.name} navratri`,
      `${data.name} tickets`,
      "garba artist usa",
      "raas garba performer",
      "navratri artist usa",
      "garba singer america",
      ...(location ? [`garba artist ${location}`, `navratri ${location}`] : []),
      ...genres,
    ],
    alternates: { canonical: pageUrl },
    openGraph: {
      title: onVanity ? title : `${title} | Rameelo`,
      description,
      type: "profile",
      url: pageUrl,
      siteName: onVanity ? data.name : "Rameelo",
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title: onVanity ? title : `${title} | Rameelo`,
      description,
      images: [ogImage[0].url],
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
  follower_count: number | null;
  monthly_listeners: number | null;
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
  sold_out: boolean;
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
  metro_city: string | null;
  cover_gradient: string | null;
  cover_image_url: string | null;
  featured_on_artist: boolean;
  selling_on_rameelo: boolean;
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

// Compact count for vanity stats, e.g. 125000 → "125K+", 1_250_000 → "1.3M+".
function fmtCount(n: number): string {
  const c = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  return n >= 1000 ? `${c}+` : c;
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return {
    month: d.toLocaleString("en-US", { month: "short" }),
    day: String(d.getDate()),
    weekday: d.toLocaleString("en-US", { weekday: "short" }),
  };
}

function eventStats(tiers: Tier[]) {
  const visible   = tiers.filter((t) => t.is_visible);
  const totalQty  = visible.reduce((s, t) => s + t.quantity, 0);
  const totalSold = visible.reduce((s, t) => s + t.quantity_sold, 0);
  const soldPct   = totalQty > 0 ? Math.round((totalSold / totalQty) * 100) : 0;
  const minPrice  = visible.length > 0 ? Math.min(...visible.map((t) => t.price)) : null;
  // Sold out when every visible tier is gone — forced by the organizer or inventory-exhausted.
  const isSoldOut = visible.length > 0 && visible.every((t) => t.sold_out || t.quantity_sold >= t.quantity);
  return { soldPct, totalQty, totalSold, minPrice, isSoldOut };
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\s]+)/);
  return m ? m[1] : null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

// ── FA-style icons (inline SVG to match the codebase's no-dependency convention) ──
type IconName = "star" | "music" | "calendar" | "sparkles";
function StatIcon({ name }: { name: IconName }) {
  const cls = "w-5 h-5";
  switch (name) {
    case "star": // fa-star (regular)
      return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.48 3.5l2.2 4.46 4.92.72-3.56 3.47.84 4.9-4.4-2.31-4.4 2.31.84-4.9L4.36 8.68l4.92-.72L11.48 3.5z" /></svg>;
    case "music": // fa-music
      return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    case "calendar": // fa-calendar-days
      return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
    case "sparkles": // fa-wand-magic-sparkles
      return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m6-13l2.5 5.5L22 14l-5.5 2.5L14 22l-2.5-5.5L6 14l5.5-2.5L14 6z" /></svg>;
  }
}

function StatCard({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-ivory-200 bg-white px-4 py-4 text-center">
      <div className="text-marigold flex justify-center mb-2">
        <StatIcon name={icon} />
      </div>
      <p className="font-display font-bold text-ink text-xl sm:text-2xl leading-none truncate" style={{ letterSpacing: "-0.02em" }}>{value}</p>
      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-1.5">{label}</p>
    </div>
  );
}

// Dark translucent stat card for the hero (icon left, value + label right).
function HeroStat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-white/[0.08] border border-white/15 backdrop-blur-sm px-4 py-3.5">
      <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-marigold shrink-0">
        <StatIcon name={icon} />
      </span>
      <div className="min-w-0">
        <p className="font-display font-bold text-white text-xl leading-none truncate" style={{ letterSpacing: "-0.02em" }}>{value}</p>
        <p className="font-mono text-[9px] uppercase tracking-widest text-white/55 mt-1">{label}</p>
      </div>
    </div>
  );
}

// Small labelled meta row for the About card.
function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-marigold shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{label}</p>
        <p className="font-ui text-sm text-ink mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

function EventRow({ event, heroColor, past = false }: { event: EventRow; heroColor: string; past?: boolean }) {
  const { minPrice, isSoldOut } = eventStats(event.ticket_tiers ?? []);
  const date  = fmtDate(event.start_date);
  const featured = !past && event.featured_on_artist;
  const selling = event.selling_on_rameelo;
  const cityState = [event.city, event.state].filter(Boolean).join(", ");
  // Show the metro only when it adds info (i.e. the event city isn't already the metro) —
  // a subtle "near {metro}" cue so attendees who think in metros recognize the area.
  const metro = (event.metro_city ?? "").trim();
  const showMetro = metro && metro.toLowerCase() !== event.city.trim().toLowerCase();
  // "Los Angeles" → "Los Angeles area"; but don't double up when the metro label
  // already reads as an area (e.g. "SF / Bay Area").
  const metroLabel = /\barea\b/i.test(metro) ? metro : `${metro} area`;
  const eventGradient = GRADIENTS.find((g) => g.id === event.cover_gradient)?.css ?? `linear-gradient(135deg, ${heroColor}, #1a0a1f)`;
  return (
    <Link
      href={`/events/${event.id}`}
      className={`group flex items-stretch gap-4 sm:gap-5 py-4 transition-colors ${past ? "opacity-70 hover:opacity-100" : ""}`}
    >
      {/* Date tile + event image (gradient fallback) */}
      <div className="relative h-16 sm:h-[72px] w-[88px] sm:w-36 rounded-lg overflow-hidden shrink-0 self-center flex">
        <div
          className="w-12 sm:w-14 h-full flex flex-col items-center justify-center shrink-0 text-white z-10"
          style={{ backgroundColor: past ? "#9ca3af" : heroColor }}
        >
          <p className="font-mono text-[9px] uppercase tracking-widest opacity-75">{date.month}</p>
          <p className="font-display font-bold text-xl sm:text-2xl leading-none">{date.day}</p>
          <p className="font-mono text-[8px] uppercase tracking-widest opacity-60 mt-0.5">{date.weekday}</p>
        </div>
        <div className="flex-1 h-full relative">
          {event.cover_image_url ? (
            <img src={event.cover_image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: eventGradient }} />
          )}
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {featured && (
          <span className="inline-flex items-center w-fit mb-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-marigold-dark bg-marigold/15 border border-marigold/30 px-2 py-0.5 rounded-md">
            Featured Event
          </span>
        )}
        <h3 className="font-display font-bold text-ink text-base sm:text-lg leading-tight group-hover:text-aubergine transition-colors truncate">
          {event.title}
        </h3>
        <div className="mt-1.5 space-y-1">
          {event.venue_name && (
            <p className="flex items-center gap-1.5 font-ui text-xs sm:text-sm font-medium text-ink truncate">
              {/* fa-location-dot */}
              <svg className="w-3.5 h-3.5 text-aubergine shrink-0" fill="currentColor" viewBox="0 0 384 512"><path d="M215.7 499.2C267 435 384 279.4 384 192 384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2 12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 110 128 64 64 0 110-128z" /></svg>
              <span className="truncate">{event.venue_name}</span>
            </p>
          )}
          {cityState && (
            <p className="flex items-center gap-1.5 font-ui text-xs sm:text-sm font-medium text-ink-muted min-w-0">
              {/* fa-map-pin */}
              <svg className="w-3.5 h-3.5 text-durga shrink-0" fill="currentColor" viewBox="0 0 320 512"><path d="M112 316.9V456c0 30.9 21.5 56 48 56s48-25.1 48-56V316.9c54.7-15.6 96-69.3 96-132.9C352 82.5 273.5 0 176 0S0 82.5 0 184c0 63.6 41.3 117.3 96 132.9zM176 96a88 88 0 110 176 88 88 0 110-176z" /></svg>
              <span className="truncate">{cityState}</span>
              {showMetro && (
                <span className="shrink-0 inline-flex items-center font-mono text-[9px] font-semibold uppercase tracking-wider text-marigold-dark bg-marigold/10 border border-marigold/25 px-1.5 py-0.5 rounded-full leading-none">
                  {metroLabel}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Price (top) + CTA pinned bottom-right */}
      {past ? (
        <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted shrink-0 self-center">Ended</span>
      ) : (
        <div className="flex flex-col items-end shrink-0 self-stretch">
          {/* Price text only when a price exists and tickets sell on Rameelo */}
          {selling && minPrice !== null && (
            <div className="text-right leading-none">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted/70 mb-1">From</p>
              <p className="font-display font-bold text-ink text-xl sm:text-2xl leading-none">${minPrice}</p>
            </div>
          )}
          <span
            className={`mt-auto inline-flex items-center justify-center px-4 sm:px-5 py-2 rounded-lg font-display font-bold text-xs sm:text-sm text-white transition-all ${isSoldOut ? "opacity-60" : "group-hover:opacity-90"}`}
            style={{ backgroundColor: isSoldOut ? "#9ca3af" : heroColor }}
          >
            {isSoldOut ? "Sold Out" : "Get Tickets"}
          </span>
        </div>
      )}
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ArtistDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { via } = await searchParams;
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

  // All published events for this artist — matched by artist_id FK or free-text name
  const { data: eventsRaw } = await supabase
    .from("events")
    .select(`
      id, title, start_date, start_time, venue_name, city, state, metro_city, cover_gradient, cover_image_url, featured_on_artist, selling_on_rameelo,
      ticket_tiers (id, name, price, quantity, quantity_sold, sold_out, is_visible)
    `)
    .eq("status", "published")
    .or(`artist_id.eq.${artist.id},artist.ilike.${artist.name}`)
    .order("featured_on_artist", { ascending: false })
    .order("start_date", { ascending: true });

  // Other active artists
  const { data: othersRaw } = await supabase
    .from("artists")
    .select("id, name, slug, tagline, profile_image_url, genres")
    .eq("is_active", true)
    .neq("id", artist.id)
    .limit(4);

  const allEvents    = (eventsRaw ?? []) as EventRow[];
  const events       = allEvents.filter(e => e.start_date >= today);
  const pastEvents   = allEvents.filter(e => e.start_date < today).reverse(); // most recent first
  const otherArtists = (othersRaw ?? []) as OtherArtist[];

  // Follow button needs contrast against the near-black hero; if the artist's
  // accent is the darkest plum, use durga so the CTA pops.
  const followAccent = heroColor === "#2E1B30" ? "#7C1F2C" : heroColor;
  // Cities for the "Upcoming in …" strip (deduped, in chronological order).
  const tourCities = Array.from(new Set(events.map(e => e.city).filter(Boolean))).slice(0, 6);

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
    genres: artist.genres?.length ? artist.genres : undefined,
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

      {/* ── CUSTOM DOMAIN OFFICIAL BANNER ──────────────────────────────── */}
      {via && (
        <div className="sticky top-0 z-50" style={{ backgroundColor: "#2E1B30" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: "#F5A623" }}>
                <span className="font-display font-bold text-aubergine text-[11px]">R</span>
              </div>
              <div className="min-w-0">
                <p className="font-ui text-sm text-white/90 leading-snug">
                  <span className="font-semibold text-marigold">{via}</span>
                  <span className="text-white/60"> · Official site for </span>
                  <span className="font-semibold text-white">{artist.name}</span>
                  <span className="hidden sm:inline text-white/50"> · All tour dates &amp; tickets</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-peacock border border-peacock/30 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-peacock animate-pulse" />
                Official ✓
              </span>
              <Link href="/" className="font-mono text-[9px] uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors">
                rameelo.com →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO — overlay (rich on desktop, stacked on mobile) ────────────── */}
      <section className="relative overflow-hidden" style={{ backgroundColor: "#1a0a1f" }}>
        {/* Background photo */}
        {(artist.cover_image_url || artist.profile_image_url) && (
          <img
            src={artist.cover_image_url || artist.profile_image_url || ""}
            alt={artist.name}
            className="absolute inset-0 w-full h-full object-cover object-top lg:object-[78%_top]"
          />
        )}
        {/* Readability gradients — strong on the left (desktop), bottom (mobile) */}
        <div className="absolute inset-0" style={{ background: `linear-gradient(100deg, ${heroColor}f2 0%, ${heroColor}d9 30%, rgba(26,10,31,0.6) 58%, rgba(26,10,31,0.12) 100%)` }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(26,10,31,0.3) 0%, rgba(26,10,31,0) 32%, rgba(26,10,31,0.45) 100%)" }} />
        {/* Decorative ring */}
        <div className="absolute top-0 right-0 w-[480px] h-[480px] -translate-y-1/3 translate-x-1/3 rounded-full opacity-10 border-2 border-white pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 lg:pt-7 lg:pb-14 lg:min-h-[500px] flex flex-col">
          {/* Breadcrumb */}
          <Link href="/artists" className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-white/70 hover:text-white transition-colors w-fit">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            All Artists
          </Link>

          <div className="flex-1 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-center mt-10 lg:mt-8">
            {/* Identity */}
            <div className="lg:col-span-7">
              {(artist.verified || via) && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {artist.verified && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-peacock bg-peacock/15 border border-peacock/30 px-2.5 py-1 rounded-full">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      Verified Artist
                    </span>
                  )}
                  {via && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-marigold bg-marigold/15 border border-marigold/30 px-2.5 py-1 rounded-full">Official Site</span>
                  )}
                </div>
              )}

              <h1 className="font-display font-bold text-white leading-[0.98] mb-3"
                style={{ fontSize: "clamp(2.5rem, 6.5vw, 4.5rem)", letterSpacing: "-0.04em" }}>
                {artist.name}
              </h1>

              {artist.genres.length > 0 && (
                <p className="font-display font-bold text-marigold text-lg sm:text-xl">
                  {artist.genres.slice(0, 4).join("   ·   ")}
                </p>
              )}

              {artist.bio && (
                <p className="font-ui text-white/75 text-base leading-relaxed max-w-xl mt-5">{artist.bio}</p>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-7">
                <FollowButton accent={followAccent} />
                <ShareButton title={artist.name} />
              </div>

              {/* Follower / listener stats (admin-set; hidden when unset) */}
              {(artist.follower_count || artist.monthly_listeners) && (
                <p className="font-ui text-sm text-white/70 mt-4">
                  {[
                    artist.follower_count ? <><span className="font-semibold text-white">{fmtCount(artist.follower_count)}</span> followers</> : null,
                    artist.monthly_listeners ? <><span className="font-semibold text-white">{fmtCount(artist.monthly_listeners)}</span> monthly listeners</> : null,
                  ].filter(Boolean).map((node, i, arr) => (
                    <span key={i}>{node}{i < arr.length - 1 && <span className="text-white/40 mx-2">·</span>}</span>
                  ))}
                </p>
              )}

              {/* Meta + social */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mt-6">
                {(location || events.length > 0) && (
                  <p className="font-ui text-sm text-white/55">
                    {[location, events.length > 0 ? `${events.length} upcoming show${events.length !== 1 ? "s" : ""}` : null].filter(Boolean).join("   ·   ")}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {artist.youtube_url && (
                    <a href={artist.youtube_url} target="_blank" rel="noopener noreferrer" aria-label="YouTube"
                      className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white/80 hover:bg-white/20 transition-all">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-2.75 12.56 12.56 0 00-4.56-.88A12.56 12.56 0 006.7 3.94a4.83 4.83 0 01-3.77 2.75A22.1 22.1 0 002 12a22.1 22.1 0 00.93 5.31 4.83 4.83 0 003.77 2.75 12.56 12.56 0 004.56.88 12.56 12.56 0 004.56-.88 4.83 4.83 0 003.77-2.75A22.1 22.1 0 0022 12a22.1 22.1 0 00-.41-5.31zM9.75 15.02V8.98L15.5 12z" /></svg>
                    </a>
                  )}
                  {artist.instagram_url && (
                    <a href={artist.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                      className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white/80 hover:bg-white/20 transition-all">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                    </a>
                  )}
                  {artist.spotify_url && (
                    <a href={artist.spotify_url} target="_blank" rel="noopener noreferrer" aria-label="Spotify"
                      className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white/80 hover:bg-white/20 transition-all">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
                    </a>
                  )}
                  {artist.website_url && (
                    <a href={artist.website_url} target="_blank" rel="noopener noreferrer" aria-label="Website"
                      className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white/80 hover:bg-white/20 transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Stat cards */}
            <div className="lg:col-span-4 lg:col-start-9 mt-8 lg:mt-0 grid grid-cols-2 lg:grid-cols-1 gap-3">
              {yearsActive !== null && <HeroStat icon="star" value={`${yearsActive}+`} label="Years Performing" />}
              {artist.years_active_since && <HeroStat icon="music" value={String(artist.years_active_since)} label="Active Since" />}
              <HeroStat icon="calendar" value={String(events.length)} label="Upcoming Shows" />
              <HeroStat icon="sparkles" value={artist.genres.slice(0, 3).join(" · ") || "Garba"} label="Style" />
            </div>
          </div>
        </div>
      </section>

      {/* ── TOUR CITIES + SECTION NAV ──────────────────────────────────────── */}
      <div className="border-b border-ivory-200 bg-ivory/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {tourCities.length > 0 && (
            <div className="flex flex-wrap items-center gap-y-1 py-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mr-2">Upcoming in</span>
              {tourCities.map((c, i) => (
                <span key={c} className="font-ui text-sm font-semibold text-ink">
                  {c}{i < tourCities.length - 1 && <span className="text-ink-muted/40 mx-1.5">·</span>}
                </span>
              ))}
              <a href="#shows" className="ml-auto hidden sm:inline-flex items-center gap-1.5 font-ui text-sm font-semibold text-aubergine hover:text-aubergine-light transition-colors">
                View all tour dates
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </a>
            </div>
          )}
          <nav className="flex items-center gap-1 overflow-x-auto">
            {([
              { id: "overview", label: "Overview", active: true,  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
              { id: "shows", label: "Shows", active: false, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
              { id: "about", label: "About", active: false, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
              ...(youtubeVideos.length > 0 ? [{ id: "videos", label: "Videos", active: false, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /> }] : []),
            ]).map(tab => (
              <a key={tab.id} href={`#${tab.id}`}
                className={`flex items-center gap-2 px-4 py-3 font-ui text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${tab.active ? "border-aubergine text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">{tab.icon}</svg>
                {tab.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">

        {/* ── OVERVIEW — shows + about ─────────────────────────────────────── */}
        <div id="overview" className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Upcoming shows */}
          <section id="shows" className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-ivory-200 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-ink text-xl sm:text-2xl" style={{ letterSpacing: "-0.02em" }}>
                  {events.length > 0 ? "Upcoming Shows" : allEvents.length > 0 ? "Shows on Rameelo" : "Upcoming Shows"}
                </h2>
                {events.length > 0 && (
                  <a href="/events" className="inline-flex items-center gap-1.5 font-ui text-sm font-semibold text-aubergine hover:text-aubergine-light transition-colors">
                    View all shows
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </a>
                )}
              </div>

              {/* Upcoming */}
              {events.length > 0 && (
                <div className="divide-y divide-ivory-200">
                  {events.map((event) => <EventRow key={event.id} event={event} heroColor={heroColor} />)}
                </div>
              )}

          {/* No upcoming — teaser state */}
          {events.length === 0 && allEvents.length === 0 && (
            <div
              className="relative overflow-hidden rounded-3xl border border-dashed p-10 sm:p-14 text-center"
              style={{ borderColor: heroColor + "40", backgroundColor: heroColor + "08" }}
            >
              {/* Decorative blurred orbs */}
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-20" style={{ backgroundColor: heroColor }} />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-15" style={{ backgroundColor: heroColor }} />

              <div className="relative">
                {/* Pulsing icon */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 mx-auto"
                  style={{ backgroundColor: heroColor + "20", border: `1.5px solid ${heroColor}30` }}>
                  <svg className="w-7 h-7" fill="none" stroke={heroColor} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="absolute inline-flex w-3 h-3 rounded-full animate-ping opacity-60" style={{ backgroundColor: heroColor }} />
                </div>

                <p
                  className="font-mono text-[10px] uppercase tracking-widest mb-3"
                  style={{ color: heroColor }}
                >
                  Navratri 2026
                </p>
                <h3
                  className="font-display font-bold text-ink mb-3"
                  style={{ fontSize: "22px", letterSpacing: "-0.02em" }}
                >
                  Shows are being announced.
                </h3>
                <p className="font-ui text-ink-muted text-sm leading-relaxed max-w-sm mx-auto mb-7">
                  {artist.name} hasn&apos;t announced 2026 dates yet — but Navratri season is coming. Create
                  an account and we&apos;ll notify you the moment a show drops.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-ui font-semibold text-sm text-white hover:opacity-90 transition-all"
                    style={{ backgroundColor: heroColor }}
                  >
                    Notify me when shows drop
                  </Link>
                  <Link
                    href="/events"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-ui font-semibold text-sm text-ink-muted bg-white border border-ivory-200 hover:border-aubergine/25 transition-all"
                  >
                    Browse all 2026 events
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Past events */}
          {pastEvents.length > 0 && (
            <div className="mt-8">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Past Shows</p>
              <div className="divide-y divide-ivory-200">
                {pastEvents.map((event) => <EventRow key={event.id} event={event} heroColor={heroColor} past />)}
              </div>
            </div>
          )}

            </div>
          </section>

          {/* About sidebar */}
          <aside id="about" className="lg:sticky lg:top-6 space-y-4">
            <div className="bg-white rounded-3xl border border-ivory-200 p-5 sm:p-6">
              <h2 className="font-display font-bold text-ink text-lg mb-4" style={{ letterSpacing: "-0.015em" }}>About {artist.name}</h2>
              {(artist.profile_image_url || artist.bio_long || artist.bio) && (
                <div className="flex gap-4">
                  {artist.profile_image_url && (
                    <img src={artist.profile_image_url} alt={artist.name} className="w-20 h-20 rounded-2xl object-cover shrink-0" />
                  )}
                  {(artist.bio_long || artist.bio) && (
                    <p className="font-ui text-sm text-ink/75 leading-relaxed line-clamp-6">{artist.bio_long || artist.bio}</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 mt-5 pt-5 border-t border-ivory-200">
                {location && (
                  <MetaRow label="Origin" value={location}
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
                )}
                {artist.genres.length > 0 && (
                  <MetaRow label="Genres" value={artist.genres.join(", ")}
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
                )}
                {artist.years_active_since && (
                  <MetaRow label="Active Since" value={String(artist.years_active_since)}
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
                )}
                {yearsActive !== null && (
                  <MetaRow label="Years Performing" value={`${yearsActive}+`}
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.48 3.5l2.2 4.46 4.92.72-3.56 3.47.84 4.9-4.4-2.31-4.4 2.31.84-4.9L4.36 8.68l4.92-.72L11.48 3.5z" /></svg>} />
                )}
                {artist.performance_style && (
                  <MetaRow label="Style" value={artist.performance_style}
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m6-13l2.5 5.5L22 14l-5.5 2.5L14 22l-2.5-5.5L6 14l5.5-2.5L14 6z" /></svg>} />
                )}
                {artist.instruments && artist.instruments.length > 0 && (
                  <MetaRow label="Instruments" value={artist.instruments.join(", ")}
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* ── Supporting sections ──────────────────────────────────────────── */}
        <div className="space-y-16 mt-16">

        {/* ── VIDEOS ───────────────────────────────────────────────────────── */}
        {youtubeVideos.length > 0 && (
          <section id="videos">
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

        {/* ── ORGANIZER CTA ────────────────────────────────────────────────── */}
        <section className="rounded-3xl bg-white border border-ivory-200 p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <div className="flex-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">For Event Organizers</p>
              <h2 className="font-display font-bold text-ink text-2xl mb-3" style={{ letterSpacing: "-0.02em" }}>
                Booking {artist.name} for your event?
              </h2>
              <p className="font-ui text-ink-muted text-base leading-relaxed mb-6">
                Booking {artist.name}? List and sell tickets through Rameelo — fans browse artist pages here to find upcoming shows, so your event gets in front of the right audience from day one.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/organizers"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-display font-bold text-sm text-white hover:opacity-90 transition-all"
                  style={{ backgroundColor: heroColor }}
                >
                  List your event →
                </Link>
                <Link href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-ui font-semibold text-sm text-ink-muted border border-ivory-200 bg-white hover:border-aubergine/25 transition-all">
                  Contact us
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:min-w-[220px]">
              {[
                { icon: "🎟️", title: "Built-in ticketing", desc: "Fans discover shows here" },
                { icon: "📣", title: "Artist page traffic", desc: "Domain visits land on your event" },
                { icon: "👥", title: "Group discounts", desc: "Built-in group buying flows" },
                { icon: "📱", title: "Apple Wallet passes", desc: "Premium e-ticket experience" },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl bg-ivory border border-ivory-200">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-ui text-sm font-semibold text-ink">{item.title}</p>
                    <p className="font-mono text-[9px] text-ink-muted">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

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
    </div>
  );
}
