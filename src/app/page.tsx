import Link from "next/link";
import { events, stats, testimonials, communityGroups } from "@/lib/data";

export default function HomePage() {
  const featuredEvents = events.slice(0, 3);

  return (
    <div className="bg-cream">
      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: "linear-gradient(145deg, #6e1a2e 0%, #4a1238 45%, #2e1a47 100%)" }}
      >
        {/* Subtle geometric ornament */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #c29f5d 0%, transparent 50%), radial-gradient(circle at 80% 20%, #c29f5d 0%, transparent 40%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-40 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-gold text-xs font-semibold px-4 py-1.5 rounded-full mb-8 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" />
            Navratri 2025 · Tickets Now Available
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.08]">
            Celebrate. Connect.
            <br />
            <span className="text-gold">Keep the Tradition Alive.</span>
          </h1>

          <p className="max-w-xl mx-auto text-base md:text-lg text-white/70 mb-10 leading-relaxed">
            Rameelo is the home for South Asian Garba, Raas, and community events across the United States.
            Discover events near you, buy tickets, and find your people.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/events"
              className="bg-cream text-brand font-bold px-8 py-3.5 rounded-lg hover:bg-white transition-colors shadow-md text-sm"
            >
              Browse Events
            </Link>
            <Link
              href="/community"
              className="border border-white/25 text-white/90 font-semibold px-8 py-3.5 rounded-lg hover:bg-white/10 transition-colors text-sm"
            >
              Join Community
            </Link>
          </div>
        </div>

        {/* Wave transition to cream */}
        <div
          className="absolute bottom-0 left-0 right-0 h-14"
          style={{
            background: "#faf3e0",
            clipPath: "ellipse(55% 100% at 50% 100%)",
          }}
        />
      </section>

      {/* ── Stats ── */}
      <section className="bg-cream py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-cream-dark rounded-2xl overflow-hidden border border-cream-dark">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-cream py-8 px-6 text-center">
                <p className="text-4xl font-extrabold text-brand tracking-tight">{stat.value}</p>
                <p className="text-ink-muted text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Events ── */}
      <section className="bg-cream-surface py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-gold-dark text-xs font-bold uppercase tracking-widest mb-2">
                Events Near You
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
                Featured This Navratri
              </h2>
            </div>
            <Link
              href="/events"
              className="text-brand text-sm font-semibold hover:text-brand-hover transition-colors hidden sm:flex items-center gap-1"
            >
              View all events
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredEvents.map((event) => {
              const pct = Math.round((event.soldTickets / event.totalTickets) * 100);
              const soldOut = event.soldTickets >= event.totalTickets;
              return (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-cream-dark group"
                >
                  {/* Card Header */}
                  <div
                    className="h-44 relative flex items-end justify-start p-4"
                    style={{
                      background: "linear-gradient(145deg, #6e1a2e 0%, #2e1a47 100%)",
                    }}
                  >
                    <div className="absolute inset-0 opacity-10 flex items-center justify-center text-7xl select-none">
                      🪔
                    </div>
                    <div className="relative flex items-center gap-2">
                      <span className="bg-gold/90 text-ink text-xs font-bold px-2.5 py-1 rounded-md">
                        {event.category}
                      </span>
                      {soldOut && (
                        <span className="bg-white/15 text-white text-xs font-semibold px-2.5 py-1 rounded-md border border-white/20">
                          Sold Out
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-xs text-ink-muted mb-1.5">
                      {event.date} · {event.city}, {event.state}
                    </p>
                    <h3 className="font-bold text-ink text-base mb-1.5 line-clamp-1 tracking-tight">
                      {event.title}
                    </h3>
                    <p className="text-ink-muted text-sm line-clamp-2 mb-4 leading-relaxed">
                      {event.description}
                    </p>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-ink-muted mb-1.5">
                        <span>{pct}% sold</span>
                        <span>{(event.totalTickets - event.soldTickets).toLocaleString()} remaining</span>
                      </div>
                      <div className="h-1 bg-cream-dark rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="font-bold text-ink text-lg">${event.price}</span>
                        <span className="text-ink-muted text-sm font-normal"> / person</span>
                      </div>
                      <Link
                        href="/tickets"
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          soldOut
                            ? "bg-cream-surface text-ink-muted cursor-not-allowed"
                            : "bg-brand text-white hover:bg-brand-hover"
                        }`}
                      >
                        {soldOut ? "Sold Out" : "Get Tickets"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Community Preview ── */}
      <section className="bg-cream py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-gold-dark text-xs font-bold uppercase tracking-widest mb-3">Community</p>
              <h2 className="text-3xl md:text-4xl font-bold text-ink tracking-tight mb-4">
                Your People Are Already Here
              </h2>
              <p className="text-ink-secondary text-base leading-relaxed mb-6">
                Whether you are a seasoned Garba dancer or discovering it for the first time, Rameelo connects
                you with local groups, organizers, and a nationwide community that shares your passion.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Find local Garba classes and practice sessions",
                  "Connect with organizers and performers",
                  "Share event photos and memories",
                  "Discover regional traditions across the USA",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-ink-secondary text-sm">
                    <span className="w-4 h-4 rounded-full bg-brand-faint border border-brand-soft flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-2.5 h-2.5 text-brand" fill="currentColor" viewBox="0 0 20 20">
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
              <Link
                href="/community"
                className="inline-flex items-center gap-2 bg-brand text-white font-semibold px-6 py-3 rounded-lg hover:bg-brand-hover transition-colors text-sm"
              >
                Explore Community
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {communityGroups.slice(0, 4).map((group) => (
                <div
                  key={group.id}
                  className="bg-white rounded-xl p-5 border border-cream-dark hover:border-brand/30 hover:shadow-sm transition-all"
                >
                  <p className="font-semibold text-ink text-sm mb-1 line-clamp-2 leading-snug">
                    {group.name}
                  </p>
                  <p className="text-xs text-ink-muted mb-3">{group.city}</p>
                  <p className="text-brand font-extrabold text-2xl tracking-tight">
                    {group.members.toLocaleString()}
                  </p>
                  <p className="text-xs text-ink-muted">members</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 text-white" style={{ background: "#2e1a47" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-gold text-xs font-bold uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">What the Community Says</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl p-6 text-left"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
              >
                {/* Quote icon */}
                <svg
                  className="w-6 h-6 text-gold/50 mb-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-white/75 mb-6 leading-relaxed text-sm">{t.text}</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg, #6e1a2e, #2e1a47)" }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-white/40 text-xs">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="bg-brand text-white py-16 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle at 80% 50%, #c29f5d 0%, transparent 60%)",
          }}
        />
        <div className="relative max-w-2xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">Ready to Rameelo?</h2>
          <p className="text-white/70 mb-8 text-base">
            Join thousands of South Asians celebrating culture, community, and connection across the USA.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/events"
              className="bg-cream text-brand font-bold px-8 py-3 rounded-lg hover:bg-white transition-colors text-sm"
            >
              Find Events
            </Link>
            <Link
              href="/about"
              className="border border-white/25 text-white font-semibold px-8 py-3 rounded-lg hover:bg-white/10 transition-colors text-sm"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
