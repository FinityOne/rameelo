import Link from "next/link";
import { artists, garbaEvents } from "@/lib/events-data";

export default function ArtistsPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F2" }}>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #2E1B30 0%, #4a1040 40%, #7C1F2C 100%)",
          }}
        />
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: "#F5A623" }} />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: "#0E8C7A" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 border-2 border-white" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6">
            <span className="w-1.5 h-1.5 bg-marigold rounded-full animate-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-white/70">Navratri Season 2026</span>
          </div>
          <h1 className="font-display font-bold text-white text-5xl sm:text-6xl lg:text-7xl leading-none mb-4" style={{ letterSpacing: "-0.03em" }}>
            The Artists
          </h1>
          <p className="font-ui text-white/60 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Ten of the greatest voices in Garba and Dandiya — from living legends to the generation rewriting the sound.
          </p>

          {/* Quick stat strip */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {[
              { value: "10", label: "Artists" },
              { value: "100+", label: "Events" },
              { value: "40+", label: "Cities" },
              { value: "50M+", label: "Fans worldwide" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display font-bold text-white text-3xl leading-none" style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6">
          {artists.map((artist) => {
            const eventCount = garbaEvents.filter((e) => e.artistSlug === artist.slug).length;
            return (
              <Link
                key={artist.slug}
                href={`/artists/${artist.slug}`}
                className="group block rounded-3xl overflow-hidden bg-white border border-ivory-200 hover:border-transparent hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Color header */}
                <div
                  className="relative h-36 flex items-end p-5 overflow-hidden"
                  style={{ backgroundColor: artist.color }}
                >
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-3 right-3 w-24 h-24 rounded-full border-2 border-white" />
                    <div className="absolute top-8 right-8 w-12 h-12 rounded-full border border-white" />
                    <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full border-2 border-white" />
                  </div>

                  {/* Initials avatar */}
                  <div className="relative w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0">
                    <span className="font-display font-bold text-white text-2xl" style={{ letterSpacing: "-0.02em" }}>
                      {artist.initials}
                    </span>
                  </div>

                  {/* Arrow on hover */}
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-3">
                  <div>
                    <h2 className="font-display font-bold text-ink text-lg leading-tight group-hover:text-aubergine transition-colors" style={{ letterSpacing: "-0.02em" }}>
                      {artist.name}
                    </h2>
                    <p className="font-mono text-[10px] uppercase tracking-widest mt-0.5" style={{ color: artist.color }}>
                      {artist.title}
                    </p>
                  </div>

                  {/* Fun fact */}
                  <div className="rounded-xl p-3" style={{ backgroundColor: artist.accentColor }}>
                    <p className="font-ui text-xs text-ink-muted leading-relaxed line-clamp-3">
                      <span className="font-semibold text-ink">★ </span>
                      {artist.funFact}
                    </p>
                  </div>

                  {/* Footer row */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-display font-bold text-ink text-sm">{artist.followers}</p>
                        <p className="font-mono text-[9px] uppercase tracking-wide text-ink-muted">Followers</p>
                      </div>
                      <div className="w-px h-6 bg-ivory-200" />
                      <div>
                        <p className="font-display font-bold text-ink text-sm">{eventCount}</p>
                        <p className="font-mono text-[9px] uppercase tracking-wide text-ink-muted">Shows</p>
                      </div>
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-wide text-ink-muted">{artist.origin.split(",")[1]?.trim() ?? artist.origin}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden" style={{ backgroundColor: "#2E1B30" }}>
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full border-2 border-white -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full border border-white translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative">
            <p className="font-mono text-[11px] uppercase tracking-widest text-white/40 mb-3">Navratri 2026 · Oct 2–12</p>
            <h2 className="font-display font-bold text-white text-3xl sm:text-4xl mb-4" style={{ letterSpacing: "-0.02em" }}>
              See them live this Navratri
            </h2>
            <p className="font-ui text-white/60 max-w-xl mx-auto mb-8">
              100+ events. 10 artists. 40 cities. One unforgettable season.
            </p>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-display font-bold text-aubergine text-base hover:opacity-90 transition-all"
              style={{ backgroundColor: "#F5A623" }}
            >
              Browse all events
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
