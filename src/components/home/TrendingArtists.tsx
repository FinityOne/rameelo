import Link from "next/link";

// Attendees recognize artists before anything else — this rail puts the biggest
// garba names front and center as tappable portraits that lead to each artist's
// tour page. A fast, familiar way to navigate by who you want to see.

export type TrendingArtist = {
  name: string;
  slug: string;
  imageUrl: string | null;
  tagline: string | null;
};

export default function TrendingArtists({ artists }: { artists: TrendingArtist[] }) {
  if (!artists.length) return null;

  return (
    <section className="bg-ivory py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-7">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-marigold-dark mb-3">Trending artists</p>
            <h2 className="font-display font-semibold text-ink" style={{ fontSize: "clamp(24px, 4vw, 36px)", letterSpacing: "-0.022em", lineHeight: 1.1 }}>
              Follow the headliners
            </h2>
          </div>
          <Link href="/artists" className="font-ui text-sm font-semibold text-ink-muted hover:text-ink hidden sm:flex items-center gap-1 transition-colors shrink-0 mb-1">
            All artists
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>

        {/* Horizontal scroll of artist portraits */}
        <div className="no-scrollbar flex gap-5 sm:gap-7 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none" }}>
          {artists.map((a) => (
            <Link key={a.slug} href={`/artists/${a.slug}`} className="group shrink-0 w-24 sm:w-32 text-center">
              <div
                className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-2 ring-ivory-200 group-hover:ring-marigold group-active:scale-95 transition-all shadow-sm mx-auto"
                style={{ background: a.imageUrl ? `url(${a.imageUrl}) center/cover no-repeat` : "#2E1B30" }}
              >
                {!a.imageUrl && (
                  <div className="absolute inset-0 flex items-center justify-center font-display font-bold text-white text-3xl">{a.name.charAt(0)}</div>
                )}
                {/* Subtle hover ring glow */}
                <div className="absolute inset-0 rounded-full ring-0 group-hover:ring-4 ring-marigold/20 transition-all" />
              </div>
              <p className="font-display font-semibold text-ink text-sm mt-3 leading-tight group-hover:text-aubergine transition-colors line-clamp-1">{a.name}</p>
              {a.tagline && <p className="font-ui text-[11px] text-ink-muted mt-0.5 line-clamp-1">{a.tagline}</p>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
