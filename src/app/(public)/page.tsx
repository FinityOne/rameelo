import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ui";
import { HomeCityProvider, HeroCityBar, CityEventsSection, type HomeEvent } from "@/components/home/HomeCity";
import HeroFeatured from "@/components/home/HeroFeatured";
import PromoBanner from "@/components/PromoBanner";
import TrendingArtists, { type TrendingArtist } from "@/components/home/TrendingArtists";
import PopularCities from "@/components/home/PopularCities";
import { createClient } from "@/lib/supabase/server";
import { getPlatformStats, compactNumber } from "@/lib/platform-stats";
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
  alternates: { canonical: "https://www.rameelo.com" },
  openGraph: {
    type: "website",
    url: "https://www.rameelo.com",
    title: "Rameelo — America's Home for Raas Garba & Navratri Events",
    description: "Every verified raas garba, dandiya, and Navratri event in America — searchable by city. Group discounts up to 15% off.",
    siteName: "Rameelo",
    images: [{ url: "https://www.rameelo.com/og-default.jpg", width: 1200, height: 630, alt: "Rameelo — America's home for Raas Garba" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rameelo — Raas Garba & Navratri Events in America",
    description: "Find garba, dandiya, and Navratri events near you. Group discounts up to 15% off.",
    images: ["https://www.rameelo.com/og-default.jpg"],
  },
};


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
  ticket_tiers: { name: string; price: number; quantity: number; quantity_sold: number; sold_out: boolean; sale_end_date: string | null }[];
};

export default async function HomePage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [platformStats, { data: rawEvents }, { data: rawArtists }] = await Promise.all([
    getPlatformStats(),
    supabase.from("events")
      .select("id, title, category, city, state, metro_city, start_date, start_time, venue_name, selling_on_rameelo, featured_on_tour, cover_image_url, artists(name), ticket_tiers(name, price, quantity, quantity_sold, sold_out, sale_end_date)")
      .eq("status", "published")
      // Only events the admin has toggled to SELL on Rameelo — interest-only
      // events never surface on the home page (matches the /garba rule).
      .eq("selling_on_rameelo", true)
      .gte("start_date", today)
      .order("start_date", { ascending: true })
      .limit(60),
    supabase.from("artists")
      .select("name, slug, profile_image_url, tagline")
      .eq("is_featured", true)
      .order("name", { ascending: true }),
  ]);

  const allEvents = (rawEvents ?? []) as unknown as (LiveEvent & { metro_city: string | null })[];
  // Selling, upcoming, soonest-first — drives the city-first hero + city section.
  const cityEvents: HomeEvent[] = allEvents.map((e) => {
    const artist = e.artists as { name: string } | { name: string }[] | null;
    return {
      id: e.id,
      title: e.title,
      category: e.category ?? "",
      city: e.city ?? "",
      state: e.state ?? "",
      metroCity: e.metro_city ?? null,
      startDate: e.start_date,
      startTime: e.start_time ?? "",
      venueName: e.venue_name ?? "",
      coverImageUrl: e.cover_image_url ?? null,
      sellingOnRameelo: !!e.selling_on_rameelo,
      featured: !!e.featured_on_tour,
      artistName: Array.isArray(artist) ? artist[0]?.name ?? null : artist?.name ?? null,
      tiers: (e.ticket_tiers ?? []).map((t) => ({ name: t.name, price: t.price, quantity: t.quantity, quantitySold: t.quantity_sold, soldOut: t.sold_out, saleEndDate: t.sale_end_date })),
    };
  });
  const trendingArtists: TrendingArtist[] = ((rawArtists ?? []) as {
    name: string; slug: string; profile_image_url: string | null; tagline: string | null;
  }[]).map((a) => ({ name: a.name, slug: a.slug, imageUrl: a.profile_image_url ?? null, tagline: a.tagline ?? null }));

  const { members: memberCount, cities: cityCount } = platformStats;
  const memberDisplay = compactNumber(memberCount).toLowerCase();

  const homeFaq = faqSchema([
    { question: "What is Rameelo?", answer: "Rameelo is America's dedicated ticketing platform for raas garba, dandiya, and Navratri events. We serve 14+ cities including Edison NJ, Houston, Chicago, Atlanta, and the Bay Area." },
    { question: "How do I buy garba tickets on Rameelo?", answer: "Browse events at rameelo.com/events, select your city and date, choose your ticket tier, and check out. Group discounts of up to 15% are automatically applied for groups of 10 or more." },
    { question: "Does Rameelo offer group discounts?", answer: "Yes — groups of 10 or more receive automatic discounts of up to 15% off. No promo code needed. Start a group order and invite friends directly from the app." },
    { question: "Which cities have garba events on Rameelo?", answer: "Rameelo covers garba events in New Jersey (Edison), Houston TX, Chicago IL, Atlanta GA, San Jose/Bay Area CA, Dallas TX, Boston MA, Seattle WA, Denver CO, Phoenix AZ, Detroit MI, Philadelphia PA, Los Angeles CA, and Minneapolis MN." },
    { question: "How do I list my Navratri event on Rameelo?", answer: "Visit rameelo.com/organizers to learn about our organizer plans. You can list events with full ticketing, group orders, and real-time analytics starting at no upfront cost." },
  ]);

  const siteNavList = itemListSchema("Rameelo Site Navigation", [
    { name: "Find Events", url: "https://www.rameelo.com/events" },
    { name: "List Your Event", url: "https://www.rameelo.com/organizers" },
    { name: "Pricing", url: "https://www.rameelo.com/pricing" },
    { name: "Blog", url: "https://www.rameelo.com/blog" },
    { name: "About Rameelo", url: "https://www.rameelo.com/about" },
    { name: "Sign Up Free", url: "https://www.rameelo.com/auth/signup" },
  ]);

  const breadcrumbs = breadcrumbSchema([{ name: "Home", url: "https://www.rameelo.com" }]);

  return (
    <div className="bg-ivory">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(homeFaq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(siteNavList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(breadcrumbs) }} />

      {/* City-first experience: the hero city picker and the city-grouped events
          section share one geolocation read + selected city via this provider. */}
      <HomeCityProvider events={cityEvents}>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ background: "#2E1B30" }}>
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 80% 60%, rgba(124,31,44,0.45) 0%, transparent 55%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at -5% 0%, rgba(61,37,67,0.8) 0%, transparent 45%)" }} />
        {/* Subtle dot grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-14 sm:pb-16">

          {/* Compact headline + subtitle */}
          <div className="max-w-3xl mb-5">
            <h1 className="font-display font-black text-white leading-[1.0]" style={{ fontSize: "clamp(38px, 6.5vw, 72px)", letterSpacing: "-0.03em" }}>
              Every garba. <span className="font-editorial italic font-medium" style={{ color: "#F5A623" }}>Every city.</span>
            </h1>
            <p className="font-ui text-white/55 text-sm sm:text-base mt-3 max-w-lg leading-relaxed">
              The biggest Raas Garba &amp; Navratri nights in America — find your city and grab tickets in a tap.
            </p>
          </div>

          {/* ── Compact city picker (client — reads geolocation, scrolls to events) ── */}
          <HeroCityBar />

          {/* ── Featured events — big, image-forward, tap to buy ── */}
          <div className="mt-9 sm:mt-11">
            <div className="flex items-end justify-between mb-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-marigold/80">On sale now</p>
              <Link href="/events" className="font-ui text-sm font-semibold text-white/50 hover:text-white flex items-center gap-1 transition-colors">
                See all
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
            <HeroFeatured events={cityEvents} />
          </div>

          {/* Trust strip */}
          <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] text-white/30 tracking-widest uppercase">
            <span><span className="text-white/55">{memberDisplay}</span> dancers</span>
            <span className="w-px h-3 bg-white/10" />
            <span>{cityCount > 0 ? cityCount : 27} cities</span>
            <span className="w-px h-3 bg-white/10" />
            <span>Navratri 2026</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PROMO BANNER — minimal ad-style strip for the active giveaway
      ══════════════════════════════════════════ */}
      <PromoBanner />

      {/* ══════════════════════════════════════════
          TRENDING ARTISTS — recognizable names → tour pages
      ══════════════════════════════════════════ */}
      <TrendingArtists artists={trendingArtists} />

      {/* ══════════════════════════════════════════
          CITY-FIRST EVENTS — grouped by metro, near-you first
      ══════════════════════════════════════════ */}
      <CityEventsSection />

      {/* ══════════════════════════════════════════
          WHY RAMEELO — Problem / Solution
      ══════════════════════════════════════════ */}
      <section className="bg-ivory py-16 sm:py-20">
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
          CLOSING CTA — find your garba
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-24" style={{ background: "#2E1B30" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 60% 50%, rgba(124,31,44,0.5) 0%, transparent 60%), radial-gradient(ellipse at 20% 50%, rgba(245,166,35,0.08) 0%, transparent 50%)" }} />
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 mb-8 bg-marigold/10 border border-marigold/20 rounded-full px-4 py-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marigold opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-marigold" />
            </span>
            <span className="font-mono text-[10px] text-marigold/80 tracking-widest uppercase">Navratri · Oct 11–20, 2026</span>
          </div>

          <h2 className="font-display font-bold text-white mb-3" style={{ fontSize: "clamp(40px, 5.5vw, 68px)", letterSpacing: "-0.025em", lineHeight: 1.04 }}>
            Your next garba
          </h2>
          <h2 className="font-editorial italic text-marigold mb-8" style={{ fontSize: "clamp(40px, 5.5vw, 68px)", lineHeight: 1.04, fontWeight: 500 }}>
            is waiting.
          </h2>

          <p className="font-ui text-white/50 text-base mb-10 max-w-sm mx-auto">
            Every Raas Garba &amp; Navratri night in America — find your city and grab tickets in a tap.
          </p>

          <Link
            href="/events"
            className="inline-flex items-center gap-2.5 bg-marigold text-aubergine font-display font-bold text-lg px-8 py-4 rounded-2xl hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-xl shadow-marigold/20 w-full sm:w-auto justify-center"
          >
            Browse all events
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </Link>

          <p className="mt-5 font-ui text-sm text-white/35">
            or <Link href="/auth/signup" className="text-marigold/80 hover:text-marigold font-semibold">create a free account</Link> to save your tickets &amp; unlock early access.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          POPULAR CITIES — skyline tiles (footer-level city directory)
      ══════════════════════════════════════════ */}
      <PopularCities />

      </HomeCityProvider>
    </div>
  );
}
