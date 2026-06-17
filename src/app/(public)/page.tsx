import type { Metadata } from "next";
import Link from "next/link";
import { testimonials, communityGroups } from "@/lib/data";
import { Eyebrow, Button, Badge, EventCard, Avatar } from "@/components/ui";
import HeroSearch from "@/components/HeroSearch";
import { createClient } from "@/lib/supabase/server";
import { getHomeSearchOptions } from "@/lib/home-search";
import { getPlatformStats, headlineStats, compactNumber } from "@/lib/platform-stats";
import { breadcrumbSchema, faqSchema, itemListSchema, ld } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Rameelo — America's Home for Raas Garba & Navratri Events",
  description:
    "Find and buy tickets for raas garba, dandiya, and Navratri events across the USA. New Jersey, Houston, Chicago, Atlanta, Bay Area, and more. Group discounts up to 15% off.",
  keywords: [
    "garba events usa 2026", "navratri 2026", "raas garba tickets", "dandiya near me",
    "navratri near me", "garba new jersey", "garba houston", "garba chicago",
    "garba san jose", "garba atlanta", "gujarati events usa", "navratri tickets online",
    "group garba tickets", "rameelo", "garba event platform",
  ],
  alternates: { canonical: "https://rameelo.com" },
  openGraph: {
    type: "website",
    url: "https://rameelo.com",
    title: "Rameelo — America's Home for Raas Garba & Navratri Events",
    description: "Every verified raas garba, dandiya, and Navratri event in America — searchable by city. Group discounts up to 15% off.",
    siteName: "Rameelo",
    images: [{ url: "https://rameelo.com/og-default.jpg", width: 1200, height: 630, alt: "Rameelo — America's home for Raas Garba" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rameelo — Raas Garba & Navratri Events in America",
    description: "Find garba, dandiya, and Navratri events near you. Group discounts up to 15% off.",
    images: ["https://rameelo.com/og-default.jpg"],
  },
};


/* ─────────────────────────────────────────────
   Scrolling city ticker
───────────────────────────────────────────── */
function CityTicker() {
  const cities = [
    "San Jose", "Atlanta", "Chicago", "New York", "Dallas",
    "Seattle", "Houston", "Edison", "Boston", "Washington DC",
    "Los Angeles", "Philadelphia", "Denver", "Phoenix", "Austin",
    "San Jose", "Atlanta", "Chicago", "New York", "Dallas",
    "Seattle", "Houston", "Edison", "Boston", "Washington DC",
    "Los Angeles", "Philadelphia", "Denver", "Phoenix", "Austin",
  ];

  return (
    <div className="overflow-hidden border-y border-ivory-200 bg-ivory py-3">
      <div className="flex animate-ticker whitespace-nowrap">
        {cities.map((city, i) => (
          <span key={i} className="inline-flex items-center gap-3 px-4">
            <span className="font-mono text-xs text-ink-muted tracking-widest uppercase">{city}</span>
            <span className="text-marigold text-xs">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
type LiveEvent = {
  id: string; title: string; category: string;
  city: string; state: string; start_date: string; start_time: string; venue_name: string;
  artists: { name: string } | null;
  selling_on_rameelo: boolean;
  featured_on_tour: boolean;
  cover_image_url: string | null;
  ticket_tiers: { price: number; quantity: number; quantity_sold: number }[];
};

function eventAvailability(tiers: { price: number; quantity: number; quantity_sold: number }[]) {
  if (tiers.length === 0) return { badge: "tickets tba", style: "bg-white/8 text-white/50 border-white/10" };
  const total = tiers.reduce((s, t) => s + t.quantity, 0);
  const sold  = tiers.reduce((s, t) => s + t.quantity_sold, 0);
  const pct   = total > 0 ? sold / total : 0;
  if (pct >= 1)    return { badge: "sold out",      style: "bg-red-900/60 text-red-300 border-red-500/30" };
  if (pct >= 0.9)  return { badge: "almost gone",   style: "bg-red-900/60 text-red-300 border-red-500/30" };
  if (pct >= 0.75) return { badge: "filling fast",  style: "bg-orange-900/50 text-orange-300 border-orange-500/30" };
  return { badge: "on sale", style: "bg-marigold/15 text-marigold border-marigold/25" };
}

export default async function HomePage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [platformStats, searchOptions, { data: rawEvents }] = await Promise.all([
    getPlatformStats(),
    getHomeSearchOptions(),
    supabase.from("events")
      .select("id, title, category, city, state, start_date, start_time, venue_name, selling_on_rameelo, featured_on_tour, cover_image_url, artists(name), ticket_tiers(price, quantity, quantity_sold)")
      .eq("status", "published")
      .gte("start_date", today)
      .order("featured_on_tour", { ascending: false })
      .order("start_date")
      .limit(6),
  ]);

  const liveEvents = (rawEvents ?? []) as unknown as LiveEvent[];
  const { events: eventCount, members: memberCount, teams: collegiateCount, cities: cityCount } = platformStats;
  const headline = headlineStats(platformStats);
  const memberDisplay = compactNumber(memberCount).toLowerCase();

  const homeFaq = faqSchema([
    { question: "What is Rameelo?", answer: "Rameelo is America's dedicated ticketing platform for raas garba, dandiya, and Navratri events. We serve 14+ cities including Edison NJ, Houston, Chicago, Atlanta, and the Bay Area." },
    { question: "How do I buy garba tickets on Rameelo?", answer: "Browse events at rameelo.com/events, select your city and date, choose your ticket tier, and check out. Group discounts of up to 15% are automatically applied for groups of 10 or more." },
    { question: "Does Rameelo offer group discounts?", answer: "Yes — groups of 10 or more receive automatic discounts of up to 15% off. No promo code needed. Start a group order and invite friends directly from the app." },
    { question: "Which cities have garba events on Rameelo?", answer: "Rameelo covers garba events in New Jersey (Edison), Houston TX, Chicago IL, Atlanta GA, San Jose/Bay Area CA, Dallas TX, Boston MA, Seattle WA, Denver CO, Phoenix AZ, Detroit MI, Philadelphia PA, Los Angeles CA, and Minneapolis MN." },
    { question: "How do I list my Navratri event on Rameelo?", answer: "Visit rameelo.com/organizers to learn about our organizer plans. You can list events with full ticketing, group orders, and real-time analytics starting at no upfront cost." },
  ]);

  const siteNavList = itemListSchema("Rameelo Site Navigation", [
    { name: "Find Events", url: "https://rameelo.com/events" },
    { name: "List Your Event", url: "https://rameelo.com/organizers" },
    { name: "Pricing", url: "https://rameelo.com/pricing" },
    { name: "Blog", url: "https://rameelo.com/blog" },
    { name: "About Rameelo", url: "https://rameelo.com/about" },
    { name: "Sign Up Free", url: "https://rameelo.com/auth/signup" },
  ]);

  const breadcrumbs = breadcrumbSchema([{ name: "Home", url: "https://rameelo.com" }]);

  return (
    <div className="bg-ivory">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(homeFaq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(siteNavList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(breadcrumbs) }} />

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ background: "#2E1B30", minHeight: "88vh" }}>
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 80% 60%, rgba(124,31,44,0.45) 0%, transparent 55%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at -5% 0%, rgba(61,37,67,0.8) 0%, transparent 45%)" }} />
        {/* Subtle dot grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-16 sm:pb-24">

          {/* Platform pill */}
          <div className="inline-flex items-center gap-2 mb-8 border border-white/12 rounded-full px-4 py-1.5 bg-white/4">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marigold opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-marigold" />
            </span>
            <span className="font-mono text-[10px] text-white/50 tracking-[0.18em] uppercase">The garba platform · United States</span>
          </div>

          {/* Headline — left aligned, massive */}
          <div className="max-w-4xl mb-7">
            <h1
              className="font-display font-black text-white leading-[0.95] mb-0"
              style={{ fontSize: "clamp(56px, 10vw, 108px)", letterSpacing: "-0.035em" }}
            >
              Every garba.
            </h1>
            <h1
              className="font-editorial italic leading-[0.95]"
              style={{ fontSize: "clamp(56px, 10vw, 108px)", letterSpacing: "-0.025em", color: "#F5A623", fontWeight: 500, lineHeight: 1.0 }}
            >
              Every city.
            </h1>
            <h1
              className="font-display font-black text-white leading-[0.95]"
              style={{ fontSize: "clamp(56px, 10vw, 108px)", letterSpacing: "-0.035em" }}
            >
              One platform.
            </h1>
          </div>

          {/* Subtitle */}
          <p className="font-ui text-white/55 text-base sm:text-lg leading-relaxed max-w-lg mb-10">
            Tickets, your crew, the artists, and the afterparty — all in one place.
            From the biggest Navratri nights to your college raas competition.
          </p>

          {/* ── Search widget + popular (client — reads geolocation) ── */}
          <HeroSearch cities={searchOptions.cities} quickCities={searchOptions.quickCities} />

          {/* Trust strip */}
          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-1.5">
                {[["PP","#F5A623"],["RS","#0E8C7A"],["AM","#7C1F2C"],["DM","#3D2543"],["KP","#892240"]].map(([initials, bg]) => (
                  <div key={initials} className="w-6 h-6 rounded-full border-2 border-[#2E1B30] flex items-center justify-center text-[8px] font-bold text-white" style={{ background: bg }}>
                    {initials[0]}
                  </div>
                ))}
              </div>
              <span className="font-ui text-white/40 text-sm">
                <span className="text-white/70 font-semibold">{memberDisplay}</span> already in the circle
              </span>
            </div>
            <span className="w-px h-4 bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-white/25 tracking-widest uppercase">{cityCount > 0 ? cityCount : 27} cities</span>
              <span className="w-px h-3 bg-white/10" />
              <span className="font-mono text-[10px] text-white/25 tracking-widest uppercase">Navratri 2026</span>
              <span className="w-px h-3 bg-white/10" />
              <span className="font-mono text-[10px] text-white/25 tracking-widest uppercase">Founding members open</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CITY TICKER
      ══════════════════════════════════════════ */}
      <CityTicker />

      {/* ══════════════════════════════════════════
          FEATURED EVENTS
      ══════════════════════════════════════════ */}
      <section className="bg-ivory-200 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <Eyebrow className="mb-3">Events near you</Eyebrow>
              <h2
                className="font-display font-semibold text-ink"
                style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.022em", lineHeight: 1.1 }}
              >
                Featured this Navratri
              </h2>
            </div>
            <Link
              href="/events"
              className="font-ui text-sm font-semibold text-ink-muted hover:text-ink hidden sm:flex items-center gap-1 transition-colors"
            >
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {liveEvents.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
              <p className="text-4xl mb-3">🎪</p>
              <p className="font-display font-semibold text-ink text-lg mb-1" style={{ letterSpacing: "-0.015em" }}>Events coming soon</p>
              <p className="font-ui text-sm text-ink-muted mb-4">Organizers are listing events now — check back soon.</p>
              <Link href="/events" className="font-ui text-sm font-semibold text-aubergine hover:underline">Browse all events →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {liveEvents.slice(0, 3).map((event) => {
                const tiers = event.ticket_tiers;
                const total = tiers.reduce((s, t) => s + t.quantity, 0);
                const sold  = tiers.reduce((s, t) => s + t.quantity_sold, 0);
                const pct   = total > 0 ? Math.round((sold / total) * 100) : 0;
                const minPrice = tiers.length > 0 ? Math.min(...tiers.map(t => t.price)) : null;
                const maxPrice = tiers.length > 0 ? Math.max(...tiers.map(t => t.price)) : null;
                const dateStr  = new Date(event.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                return (
                  <EventCard
                    key={event.id}
                    title={event.title}
                    category={event.category}
                    city={event.city}
                    state={event.state}
                    date={dateStr}
                    minPrice={minPrice}
                    maxPrice={maxPrice}
                    sellingOnRameelo={event.selling_on_rameelo}
                    soldPct={pct}
                    soldOut={total > 0 && sold >= total}
                    coverImageUrl={event.cover_image_url}
                    href={`/events/${event.id}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          NETWORK STATS + LIVE EVENTS
      ══════════════════════════════════════════ */}
      <section style={{ background: "#261030" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid lg:grid-cols-[380px_1fr] gap-5">

            {/* ── Left: network stats ── */}
            <div className="rounded-2xl border border-white/8 p-6" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/25 mb-6 text-right">Network</p>
              <div className="grid grid-cols-2 divide-x divide-y divide-white/8 border border-white/8 rounded-xl overflow-hidden">
                {[
                  {
                    value: eventCount > 0 ? `${eventCount}+` : "500+",
                    label: "events listed nationwide",
                    italic: true,
                  },
                  {
                    value: cityCount > 0 ? `${cityCount}` : "47",
                    label: "cities in the network",
                    italic: false,
                  },
                  {
                    value: collegiateCount > 0 ? `${collegiateCount}+` : "180+",
                    label: "collegiate teams",
                    italic: true,
                    dot: true,
                  },
                  {
                    value: memberCount > 0 ? compactNumber(memberCount) : "92K",
                    label: "dancers on Rameelo",
                    italic: false,
                  },
                ].map((stat, i) => (
                  <div key={i} className="px-5 py-5 relative">
                    <p
                      className={`leading-none mb-2 ${stat.italic ? "font-editorial italic" : "font-display font-bold"}`}
                      style={{ fontSize: "clamp(32px, 4vw, 48px)", color: "#F5A623", letterSpacing: "-0.02em" }}
                    >
                      {stat.value}
                    </p>
                    <p className="font-ui text-sm text-white/40 leading-snug">{stat.label}</p>
                    {stat.dot && (
                      <div className="mt-4 flex gap-1 flex-wrap">
                        {Array.from({ length: 9 }).map((_, j) => (
                          <div
                            key={j}
                            className="rounded-full"
                            style={{
                              width: j === 4 ? 10 : 7,
                              height: j === 4 ? 10 : 7,
                              background: j === 4 ? "#F5A623" : `rgba(245,166,35,${0.15 + j * 0.04})`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: upcoming events ── */}
            <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marigold opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-marigold" />
                  </span>
                  <span className="font-display font-bold text-white text-base" style={{ letterSpacing: "-0.01em" }}>
                    Upcoming events
                  </span>
                  {liveEvents.length > 0 && (
                    <span className="font-ui text-sm text-white/35">· {liveEvents.length} on the calendar</span>
                  )}
                </div>
                <Link
                  href="/events"
                  className="font-ui text-sm font-medium text-marigold hover:text-marigold/80 transition-colors flex items-center gap-1"
                >
                  See all
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Event rows */}
              {liveEvents.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/25 mb-2">Coming soon</p>
                  <p className="font-ui text-sm text-white/40">Events are being added — check back soon or browse all events.</p>
                  <Link href="/events" className="inline-block mt-4 font-ui text-sm font-semibold text-marigold hover:text-marigold/80 transition-colors">
                    Browse all events →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-white/6">
                  {liveEvents.map((ev) => {
                    const avail = eventAvailability(ev.ticket_tiers);
                    const dateObj = new Date(ev.start_date + "T00:00:00");
                    const dateLabel = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    const timeLabel = ev.start_time
                      ? new Date(`1970-01-01T${ev.start_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                      : "";
                    const displayName = ev.artists?.name ?? ev.title;
                    return (
                      <Link
                        key={ev.id}
                        href={`/events/${ev.id}`}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-white/4 transition-colors group"
                      >
                        <span className="font-mono text-[10px] uppercase tracking-widest text-white/30 w-24 shrink-0">
                          {ev.city}, {ev.state}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-ui font-semibold text-white text-sm group-hover:text-marigold transition-colors leading-none mb-0.5 truncate">
                            {displayName}
                          </p>
                          <p className="font-ui text-xs text-white/35 truncate">{ev.venue_name}</p>
                        </div>
                        <span className="font-ui text-sm text-white/40 shrink-0 mr-3 whitespace-nowrap">
                          {dateLabel}{timeLabel ? ` · ${timeLabel}` : ""}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg font-mono text-[9px] uppercase tracking-widest font-bold border shrink-0 ${avail.style}`}>
                          {avail.badge}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Footer */}
              <div className="px-6 py-3 border-t border-white/6">
                <Link
                  href="/events"
                  className="font-ui text-sm text-white/35 hover:text-white/60 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
                  </svg>
                  View all upcoming events
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          WHY RAMEELO — Problem / Solution
      ══════════════════════════════════════════ */}
      <section className="bg-ivory py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Eyebrow className="mb-4">Why we built this</Eyebrow>
            <h2
              className="font-display font-semibold text-ink"
              style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.022em", lineHeight: 1.12 }}
            >
              Garba runs on community.
              <br />
              <span className="font-editorial italic text-marigold">The tools never have.</span>
            </h2>
            <p className="font-ui text-ink-muted text-base mt-5 max-w-2xl mx-auto leading-relaxed">
              Navratri is the most anticipated cultural event of the year for millions of Indian-Americans — yet organizers run it on Google Forms, attendees coordinate on WhatsApp, and groups still fight over who's buying tickets. We built the platform the community deserves.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                problem: "You find out tickets went on sale after they've already sold out",
                solution: "48-hour member early access to every event, every city, every year",
                icon: "🎟️",
                label: "Early Access",
              },
              {
                problem: "One person buys all the tickets and chases Venmo for weeks",
                solution: "Group orders built in — discounts unlock automatically as your circle joins",
                icon: "👥",
                label: "Group Pricing",
              },
              {
                problem: "You showed up and spent the night trying to find where your friends were",
                solution: "See your circle's plans, coordinate everything in one shared space",
                icon: "🌀",
                label: "Your Circle",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] bg-ivory-200 p-7 border border-ivory-200 flex flex-col gap-4">
                <div>
                  <span className="text-2xl block mb-3">{item.icon}</span>
                  <p className="font-mono text-[10px] text-marigold-dark tracking-widest uppercase">{item.label}</p>
                </div>
                <div className="flex flex-col gap-2.5 flex-1">
                  <div className="rounded-xl px-4 py-3.5" style={{ background: "rgba(124,31,44,0.05)", border: "1px solid rgba(124,31,44,0.1)" }}>
                    <p className="font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: "rgba(124,31,44,0.5)" }}>Before</p>
                    <p className="font-ui text-sm text-ink-muted leading-snug">{item.problem}</p>
                  </div>
                  <div className="rounded-xl px-4 py-3.5" style={{ background: "rgba(14,140,122,0.05)", border: "1px solid rgba(14,140,122,0.15)" }}>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-peacock mb-1.5">With Rameelo</p>
                    <p className="font-ui text-sm text-ink font-medium leading-snug">{item.solution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS
      ══════════════════════════════════════════ */}
      <section className="bg-ivory py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-ivory-200 rounded-[16px] overflow-hidden border border-ivory-200">
            {headline.map((stat) => (
              <div key={stat.label} className="bg-ivory py-8 px-6 text-center">
                <p
                  className="font-display font-bold text-aubergine"
                  style={{ fontSize: "36px", letterSpacing: "-0.03em", lineHeight: 1 }}
                >
                  {stat.value}
                </p>
                <p className="font-mono text-[11px] text-ink-muted tracking-widest uppercase mt-2">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOR EVERYONE — Audience pillars
      ══════════════════════════════════════════ */}
      <section className="bg-ivory py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Eyebrow className="mb-4">Built for everyone in the circle</Eyebrow>
            <h2
              className="font-display font-semibold text-ink"
              style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.022em" }}
            >
              One platform. Every ticket in the circle.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                eyebrow: "Enthusiasts",
                title: "Find your garba, wherever you are.",
                body:
                  "Browse Navratri events by city, date, and style. See how many friends are going. Grab tickets in two taps — together or solo.",
                cta: "Browse events",
                href: "/events",
                bg: "bg-ivory-200",
                eyebrowColor: "marigold" as const,
              },
              {
                eyebrow: "Organizers",
                title: "Sell out your Navratri in one place.",
                body:
                  "Group orders, sponsor handoffs, community reach — everything you need to run a 9-night Navratri marathon without the spreadsheet chaos.",
                cta: "List an event",
                href: "/pricing",
                bg: "bg-aubergine",
                dark: true,
                eyebrowColor: "marigold" as const,
              },
              {
                eyebrow: "Collegiate teams",
                title: "Raas All-Stars: earn your ranking.",
                body:
                  "Chapter profiles, team orders, and a live leaderboard that lets your crew see where they stand against college raas teams nationwide.",
                cta: "See standings",
                href: "/collegiate",
                bg: "bg-ivory-200",
                eyebrowColor: "marigold" as const,
              },
            ].map((card) => (
              <div
                key={card.eyebrow}
                className={`${card.bg} rounded-[24px] p-8 flex flex-col justify-between min-h-[340px]`}
              >
                <div>
                  <Eyebrow color={card.eyebrowColor} className="mb-4">
                    {card.eyebrow}
                  </Eyebrow>
                  <h3
                    className={`font-display font-semibold mb-4 ${card.dark ? "text-white" : "text-ink"}`}
                    style={{ fontSize: "22px", letterSpacing: "-0.02em", lineHeight: 1.2 }}
                  >
                    {card.title}
                  </h3>
                  <p className={`font-ui text-sm leading-relaxed ${card.dark ? "text-white/60" : "text-ink-muted"}`}>
                    {card.body}
                  </p>
                </div>
                <Link
                  href={card.href}
                  className={`mt-8 inline-flex items-center gap-2 font-ui text-sm font-semibold transition-colors ${
                    card.dark
                      ? "text-marigold hover:text-marigold-dark"
                      : "text-aubergine hover:text-aubergine-light"
                  }`}
                >
                  {card.cta}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          COMMUNITY GROUPS
      ══════════════════════════════════════════ */}
      <section className="bg-ivory-200 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <Eyebrow className="mb-4">Community</Eyebrow>
              <h2
                className="font-display font-semibold text-ink mb-4"
                style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.022em", lineHeight: 1.1 }}
              >
                Nobody comes to Garba{" "}
                <span className="font-editorial italic text-marigold">alone.</span>
              </h2>
              <p className="font-ui text-ink-muted text-base leading-relaxed mb-8">
                Every primary flow — discovery, ordering, attending, sharing — assumes a
                circle of friends, a chapter, a family. Solo is the edge case.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Find local Garba classes and practice sessions",
                  "Connect with organizers and performers",
                  "Share event photos with your circle",
                  "Discover regional traditions across the USA",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-ui text-ink-muted text-sm">
                    <span className="w-4 h-4 rounded-full bg-marigold/20 border border-marigold/30 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-2.5 h-2.5 text-marigold-dark" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Button href="/community">
                Explore community
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {communityGroups.slice(0, 4).map((group) => (
                <div
                  key={group.id}
                  className="bg-ivory rounded-[16px] p-5 border border-ivory-200 hover:border-marigold/30 hover:shadow-sm transition-all"
                >
                  <p className="font-mono text-[9px] text-ink-muted tracking-widest uppercase mb-2">
                    {group.category}
                  </p>
                  <p className="font-display font-semibold text-ink text-sm mb-1 line-clamp-2 leading-snug" style={{ letterSpacing: "-0.01em" }}>
                    {group.name}
                  </p>
                  <p className="font-ui text-xs text-ink-muted mb-3">{group.city}</p>
                  <p
                    className="font-display font-bold text-aubergine"
                    style={{ fontSize: "28px", letterSpacing: "-0.03em" }}
                  >
                    {group.members.toLocaleString()}
                  </p>
                  <p className="font-mono text-[10px] text-ink-muted tracking-widest uppercase">members</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════ */}
      <section className="py-20" style={{ background: "#2E1B30" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Eyebrow className="mb-4">What the community says</Eyebrow>
            <h2
              className="font-display font-semibold text-white"
              style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.022em" }}
            >
              The ones who got in early.
            </h2>
            <p className="font-ui text-white/40 text-base mt-3 max-w-md mx-auto">
              Founding members across 27 cities — on what changed.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="rounded-[16px] p-6"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <svg className="w-6 h-6 mb-4" fill="#F5A623" opacity="0.4" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="font-ui text-white/70 text-sm leading-relaxed mb-6">{t.text}</p>
                <div className="flex items-center gap-3">
                  <Avatar initials={t.avatar} size="md" color="marigold" />
                  <div>
                    <p className="font-ui font-semibold text-white text-sm">{t.name}</p>
                    <p className="font-mono text-[10px] text-white/40 tracking-widest uppercase">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA BANNER — Founding member
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-24" style={{ background: "#2E1B30" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 60% 50%, rgba(124,31,44,0.5) 0%, transparent 60%), radial-gradient(ellipse at 20% 50%, rgba(245,166,35,0.08) 0%, transparent 50%)" }} />
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 mb-8 bg-marigold/10 border border-marigold/20 rounded-full px-4 py-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marigold opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-marigold" />
            </span>
            <span className="font-mono text-[10px] text-marigold/80 tracking-widest uppercase">Founding Members Open</span>
          </div>

          <h2 className="font-display font-bold text-white mb-3" style={{ fontSize: "clamp(40px, 5.5vw, 68px)", letterSpacing: "-0.025em", lineHeight: 1.04 }}>
            Join the
          </h2>
          <h2 className="font-editorial italic text-marigold mb-8" style={{ fontSize: "clamp(40px, 5.5vw, 68px)", lineHeight: 1.04, fontWeight: 500 }}>
            founding circle.
          </h2>

          <p className="font-ui text-white/50 text-base mb-3 max-w-sm mx-auto">
            Tickets, your crew, the artists, and the afterparty — all in one place.
          </p>
          <p className="font-ui text-white/30 text-sm mb-10 max-w-xs mx-auto">
            {memberDisplay} founding members already in the circle.
          </p>

          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2.5 bg-marigold text-aubergine font-display font-bold text-lg px-8 py-4 rounded-2xl hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-xl shadow-marigold/20 w-full sm:w-auto justify-center"
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-aubergine/60 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-aubergine/80" />
            </span>
            Join free — takes 30 seconds
          </Link>

          <div className="mt-10 flex items-center justify-center gap-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-full" style={{ width: 8, height: 8, background: i < 5 ? "#F5A623" : "rgba(255,255,255,0.15)" }} />
            ))}
            <span className="font-mono text-[10px] text-white/30 tracking-widest uppercase ml-3">Navratri · Oct 11–20, 2026</span>
          </div>
        </div>
      </section>
    </div>
  );
}
