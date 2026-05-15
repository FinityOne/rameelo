import Link from "next/link";
import { events, stats, testimonials, communityGroups } from "@/lib/data";
import { Eyebrow, Button, Badge, EventCard, Avatar } from "@/components/ui";
import { HeroCountdown } from "@/components/ui/HeroCountdown";
import { createClient } from "@/lib/supabase/server";
import USAEventMap from "@/components/USAEventMap";


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
export default async function HomePage() {
  const featuredEvents = events.slice(0, 3);

  // Real member count from DB
  const supabase = await createClient();
  const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
  const memberCount = count ?? 0;
  const memberDisplay = memberCount >= 1000
    ? `${(memberCount / 1000).toFixed(1).replace(".0", "")}k`
    : String(memberCount);

  return (
    <div className="bg-ivory">

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ background: "#2E1B30" }}>
        {/* Glows */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 70% 110%, rgba(124,31,44,0.6) 0%, rgba(245,166,35,0.08) 45%, transparent 65%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 20% -10%, rgba(61,37,67,0.9) 0%, transparent 55%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(212,137,27,0.04) 0%, transparent 60%)" }} />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-20 sm:pb-28 text-center">

          {/* Launch pill */}
          <div className="inline-flex items-center gap-2.5 mb-8 bg-white/5 border border-white/10 rounded-full px-4 py-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marigold opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-marigold" />
            </span>
            <span className="font-mono text-[10px] text-white/60 tracking-widest uppercase">Something big · Launches June 1</span>
          </div>

          {/* Headline */}
          <h1
            className="font-display font-bold text-white mb-2"
            style={{ fontSize: "clamp(44px, 9vw, 88px)", lineHeight: 1.0, letterSpacing: "-0.032em" }}
          >
            Garba season
          </h1>
          <h1
            className="font-editorial italic mb-6"
            style={{ fontSize: "clamp(44px, 9vw, 88px)", lineHeight: 1.0, color: "#F5A623", fontWeight: 500 }}
          >
            is about to change.
          </h1>

          <p className="font-ui text-white/50 text-base sm:text-lg leading-relaxed mb-3 max-w-md mx-auto">
            The first platform built by and for the US garba community.
          </p>
          <p className="font-ui text-white/30 text-sm mb-12 max-w-xs mx-auto">
            Not just tickets. Not another app. Something the community has never had.
          </p>

          {/* ── COUNTDOWN ── */}
          <div className="mb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 mb-5">
              Until launch
            </p>
            <HeroCountdown />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-10 max-w-sm mx-auto">
            <div className="flex-1 h-px bg-white/10" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-white/25">What founding members unlock</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Teaser items — create curiosity without full reveal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 text-left max-w-2xl mx-auto">
            {[
              {
                icon: "🎟️",
                title: "Navratri tickets — before anyone else",
                body: "Members get access 48 hours before public sale. Every city. Every artist.",
              },
              {
                icon: "👥",
                title: "Group pricing, built in",
                body: "Bring your crew. Discounts unlock automatically the more people join.",
              },
              {
                icon: "🔒",
                title: "One more thing.",
                body: "We're not saying yet. Founding members find out first on June 1st.",
                mystery: true,
              },
            ].map((item) => (
              <div
                key={item.title}
                className={`rounded-2xl p-4 border ${item.mystery ? "border-marigold/20 bg-marigold/5" : "border-white/8 bg-white/5"}`}
              >
                <span className="text-xl mb-2.5 block">{item.icon}</span>
                <p className={`font-ui text-sm font-semibold mb-1 ${item.mystery ? "text-marigold" : "text-white/90"}`}>{item.title}</p>
                <p className="font-ui text-xs text-white/40 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>

          {/* ── PRIMARY CTA ── */}
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2.5 bg-marigold text-aubergine font-display font-bold text-base sm:text-lg px-8 py-4 rounded-2xl hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-2xl shadow-marigold/25 w-full sm:w-auto justify-center"
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-aubergine/60 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-aubergine/80" />
            </span>
            Join as a Founding Member — Free
          </Link>

          <p className="font-mono text-[10px] text-white/25 tracking-widest uppercase mt-4">
            Takes 30 seconds · No credit card
          </p>

          {/* Trust strip */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
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
            <span className="font-mono text-[11px] text-white/30 tracking-widest uppercase">27 cities · Navratri 2026</span>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          USA EVENT MAP
      ══════════════════════════════════════════ */}
      <USAEventMap />

      {/* ══════════════════════════════════════════
          CITY TICKER
      ══════════════════════════════════════════ */}
      <CityTicker />

      {/* ══════════════════════════════════════════
          STATS
      ══════════════════════════════════════════ */}
      <section className="bg-ivory py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-ivory-200 rounded-[16px] overflow-hidden border border-ivory-200">
            {stats.map((stat) => (
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featuredEvents.map((event) => {
              const pct = Math.round((event.soldTickets / event.totalTickets) * 100);
              return (
                <EventCard
                  key={event.id}
                  title={event.title}
                  category={event.category}
                  city={event.city}
                  state={event.state}
                  date={event.date}
                  price={event.price}
                  soldPct={pct}
                  soldOut={event.soldTickets >= event.totalTickets}
                  isLive={event.id === "1"}
                />
              );
            })}
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
              One platform. Every seat in the circle.
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
                href: "/community",
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
              The circle is already full.
            </h2>
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
            Be inside
          </h2>
          <h2 className="font-editorial italic text-marigold mb-8" style={{ fontSize: "clamp(40px, 5.5vw, 68px)", lineHeight: 1.04, fontWeight: 500 }}>
            when it drops.
          </h2>

          <p className="font-ui text-white/50 text-base mb-3 max-w-sm mx-auto">
            June 1st. Something the US garba community has never had before.
          </p>
          <p className="font-ui text-white/30 text-sm mb-10 max-w-xs mx-auto">
            {memberDisplay} founding members already registered. They find out first.
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
            <span className="font-mono text-[10px] text-white/30 tracking-widest uppercase ml-3">Navratri · Oct 2–10, 2026</span>
          </div>
        </div>
      </section>
    </div>
  );
}
