import Link from "next/link";
import { events, stats, testimonials, communityGroups } from "@/lib/data";
import { Eyebrow, Button, Badge, EventCard, Avatar } from "@/components/ui";

/* ─────────────────────────────────────────────
   Hero: Animated activity panel (right side)
───────────────────────────────────────────── */
function HeroActivityPanel() {
  const activityItems = [
    { initials: "PP", name: "Priya Patel", action: "joined", event: "Edison Garba", color: "marigold" as const },
    { initials: "RS", name: "Rohan Shah", action: "going to", event: "Chicago Utsav", color: "peacock" as const },
    { initials: "AM", name: "Aanya Mehta", action: "invited 4 to", event: "NYC Garba Night", color: "aubergine" as const },
    { initials: "DM", name: "Dev Modi", action: "joined", event: "Dallas Dandiya", color: "durga" as const },
  ];

  return (
    <div className="relative w-full h-[520px] hidden lg:block select-none">
      {/* Ambient glow behind cards */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)" }}
      />

      {/* Main featured event card — top center */}
      <div
        className="absolute top-0 left-1/2 -translate-x-[45%] w-[260px] animate-float-a"
        style={{ animationDelay: "0s" }}
      >
        <div
          className="rounded-[16px] overflow-hidden shadow-2xl"
          style={{ background: "linear-gradient(145deg, #2E1B30 0%, #7C1F2C 55%, #F5A623 130%)" }}
        >
          <div className="p-4 pb-5">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="peacock" dot>Live now</Badge>
              <span className="font-mono text-[10px] text-white/50 tracking-widest">SAT · OCT 03</span>
            </div>
            <p className="font-mono text-[10px] text-white/50 tracking-widest uppercase mb-1">
              NAVRATRI · NIGHT 04
            </p>
            <h4
              className="font-display font-semibold text-white text-xl leading-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              The Edison Garba
            </h4>
            <p className="font-ui text-white/50 text-xs mt-1.5">Edison, NJ · 7:30pm</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {["PP", "RS", "AM"].map((i, idx) => (
                  <div
                    key={idx}
                    className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ background: idx === 0 ? "#F5A623" : idx === 1 ? "#0E8C7A" : "#3D2543" }}
                  >
                    {i}
                  </div>
                ))}
              </div>
              <span className="font-ui text-[11px] text-white/60">12 friends going</span>
            </div>
          </div>
          <div className="border-t border-dashed border-white/10 mx-4" />
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <span className="font-display font-bold text-white text-lg" style={{ letterSpacing: "-0.02em" }}>$42</span>
              <span className="text-white/40 text-xs font-ui"> /ea</span>
            </div>
            <span className="bg-marigold text-aubergine font-ui text-xs font-semibold px-3 py-1.5 rounded-[8px]">
              Buy tickets
            </span>
          </div>
        </div>
      </div>

      {/* Activity feed card — left mid */}
      <div
        className="absolute top-[200px] left-0 w-[220px] animate-float-b"
        style={{ animationDelay: "1s" }}
      >
        <div className="bg-ivory/10 backdrop-blur-sm border border-white/10 rounded-[16px] p-3 shadow-xl space-y-2.5">
          {activityItems.slice(0, 3).map((item) => (
            <div key={item.name} className="flex items-center gap-2.5">
              <Avatar initials={item.initials} size="sm" color={item.color} />
              <div className="min-w-0">
                <p className="font-ui text-[11px] text-white/80 font-medium leading-tight truncate">
                  <span className="font-semibold">{item.name}</span>
                </p>
                <p className="font-ui text-[10px] text-white/40 leading-tight truncate">
                  {item.action} · {item.event}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mini live card — right mid */}
      <div
        className="absolute top-[230px] right-0 w-[200px] animate-float-c"
        style={{ animationDelay: "2s" }}
      >
        <div
          className="rounded-[16px] overflow-hidden shadow-xl"
          style={{ background: "linear-gradient(145deg, #0E8C7A 0%, #0a4f46 100%)" }}
        >
          <div className="p-3.5">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="ivory">Tonight</Badge>
              <Badge variant="peacock" dot>Live</Badge>
            </div>
            <p className="font-mono text-[10px] text-white/50 uppercase tracking-widest mb-0.5">
              DISCO DANDIYA · DC
            </p>
            <p className="font-display font-semibold text-white text-sm leading-tight" style={{ letterSpacing: "-0.015em" }}>
              Sangat Garba
            </p>
            <p className="font-ui text-white/50 text-[10px] mt-1">Reston Convention · 8:00pm</p>
            <p className="font-display font-bold text-white mt-2 text-base">$35</p>
          </div>
        </div>
      </div>

      {/* Group order badge — bottom left */}
      <div
        className="absolute bottom-8 left-8 animate-float-d"
        style={{ animationDelay: "0.5s" }}
      >
        <div className="bg-marigold rounded-[12px] px-4 py-2.5 shadow-lg flex items-center gap-2.5">
          <div className="flex -space-x-1">
            {["RS", "DM"].map((i, idx) => (
              <div
                key={idx}
                className="w-5 h-5 rounded-full bg-aubergine border border-marigold flex items-center justify-center text-[8px] text-white font-bold"
              >
                {i}
              </div>
            ))}
          </div>
          <div>
            <p className="font-ui text-aubergine text-xs font-bold leading-tight">Group order open</p>
            <p className="font-mono text-[9px] text-aubergine/60 tracking-wider uppercase">Chicago Utsav</p>
          </div>
        </div>
      </div>

      {/* Ticket sold stat — bottom right */}
      <div
        className="absolute bottom-12 right-8 animate-float-b"
        style={{ animationDelay: "3s" }}
      >
        <div className="bg-aubergine-light/80 backdrop-blur-sm border border-white/10 rounded-[12px] px-4 py-3 shadow-lg text-center">
          <p className="font-display font-bold text-white text-2xl" style={{ letterSpacing: "-0.03em" }}>88%</p>
          <p className="font-mono text-[9px] text-white/50 tracking-widest uppercase">Sold · Bay Area</p>
        </div>
      </div>
    </div>
  );
}

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
export default function HomePage() {
  const featuredEvents = events.slice(0, 3);

  return (
    <div className="bg-ivory">

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ background: "#2E1B30" }}
      >
        {/* Warm glow — lower right, festival atmosphere */}
        <div
          className="absolute bottom-0 right-0 w-[700px] h-[500px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 80% 100%, rgba(124,31,44,0.5) 0%, rgba(245,166,35,0.15) 40%, transparent 70%)",
          }}
        />
        {/* Cool glow — upper left */}
        <div
          className="absolute top-0 left-0 w-[500px] h-[400px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(61,37,67,0.8) 0%, transparent 60%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 lg:pb-32">
          <div className="grid lg:grid-cols-[1fr_440px] gap-12 xl:gap-20 items-center">

            {/* ── Left: Headline ── */}
            <div className="max-w-2xl">
              <Eyebrow className="mb-6">
                RML — 001 / FALL &apos;26 · NAVRATRI · 27 CITIES
              </Eyebrow>

              <h1
                className="font-display font-bold text-white mb-2"
                style={{
                  fontSize: "clamp(52px, 7vw, 88px)",
                  lineHeight: 1.04,
                  letterSpacing: "-0.025em",
                }}
              >
                Nine nights.
              </h1>
              <h1
                className="font-editorial italic mb-8"
                style={{
                  fontSize: "clamp(52px, 7vw, 88px)",
                  lineHeight: 1.04,
                  color: "#F5A623",
                  fontWeight: 500,
                }}
              >
                Infinite circles.
              </h1>

              <p className="font-ui text-white/60 text-lg leading-relaxed mb-10 max-w-lg">
                Rameelo is the modern home for raas garba ticketing — from your friend
                group&apos;s chai-fueled chat to the nine-night Navratri marathon. Every flow
                is built for the way our community actually shows up: together, in circles,
                and on time.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button href="/events" size="lg">
                  Get tickets
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
                <Button href="/events" variant="ghost" size="lg">
                  Explore events
                </Button>
              </div>

              {/* Trust signals */}
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {["PP", "RS", "AM", "DM"].map((i, idx) => (
                      <div
                        key={idx}
                        className="w-6 h-6 rounded-full border-2 border-aubergine flex items-center justify-center text-[8px] font-bold text-white"
                        style={{
                          background:
                            idx === 0 ? "#F5A623" : idx === 1 ? "#0E8C7A" : idx === 2 ? "#7C1F2C" : "#3D2543",
                        }}
                      >
                        {i[0]}
                      </div>
                    ))}
                  </div>
                  <span className="font-ui text-white/50 text-sm">80K+ community members</span>
                </div>
                <span className="w-px h-4 bg-white/15 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-peacock" />
                  <span className="font-mono text-[11px] text-white/50 tracking-widest uppercase">
                    Group orders open
                  </span>
                </div>
              </div>
            </div>

            {/* ── Right: Animated Activity Panel ── */}
            <HeroActivityPanel />
          </div>
        </div>
      </section>

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
          CTA BANNER — Heritage festival style
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-24" style={{ background: "#7C1F2C" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 80% 50%, rgba(245,166,35,0.2) 0%, transparent 60%), radial-gradient(ellipse at 20% 50%, rgba(46,27,48,0.4) 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <Eyebrow className="mb-6">Navratri &apos;26</Eyebrow>
          <h2
            className="font-display font-bold text-white mb-3"
            style={{ fontSize: "clamp(36px, 5vw, 60px)", letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            Where the dandiya
          </h2>
          <h2
            className="font-editorial italic text-marigold mb-8"
            style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.05, fontWeight: 500 }}
          >
            finds its beat.
          </h2>
          <p className="font-ui text-white/60 text-base leading-relaxed mb-10 max-w-lg mx-auto">
            Join thousands of South Asians celebrating culture, community, and connection
            across 27 cities — 9 nights at a time.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button href="/events" size="lg">
              Get tickets
            </Button>
            <Button href="/pricing" variant="ghost" size="lg">
              For organizers
            </Button>
          </div>

          {/* Navratri nights indicator */}
          <div className="mt-12 flex items-center justify-center gap-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i < 4 ? "28px" : "8px",
                  height: "8px",
                  background: i < 4 ? "#F5A623" : "rgba(255,255,255,0.2)",
                }}
              />
            ))}
            <span className="font-mono text-[10px] text-white/40 tracking-widest uppercase ml-3">
              Night 04 of 09
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
