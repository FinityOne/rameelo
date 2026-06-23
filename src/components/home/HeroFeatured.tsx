import Link from "next/link";
import type { HomeEvent } from "./HomeCity";

// Ticketmaster-style hero: the top events shown big and image-forward, so an
// attendee recognizes the artist/event instantly and taps straight to buy.
// Minimal text — artist, date, city — the cover image does the selling.

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const FALLBACK = "linear-gradient(135deg, #2E1B30 0%, #7C1F2C 55%, #F5A623 135%)";

function priceFrom(e: HomeEvent): string {
  const paid = e.tiers.filter((t) => t.price > 0).map((t) => t.price);
  if (paid.length) return `From $${Math.min(...paid)}`;
  if (e.tiers.length) return "Free entry";
  return "Tickets soon";
}

function FeatureCard({ e, large }: { e: HomeEvent; large?: boolean }) {
  const bg = e.coverImageUrl
    ? `linear-gradient(to top, rgba(15,6,17,0.94) 4%, rgba(15,6,17,0.35) 42%, rgba(15,6,17,0.15) 100%), url(${e.coverImageUrl}) center/cover no-repeat`
    : FALLBACK;
  const headline = e.artistName || e.title;
  const sub = e.artistName ? e.title : "";
  const place = [e.city, e.state].filter(Boolean).join(", ");

  return (
    <Link
      href={`/events/${e.id}`}
      className="group relative block h-full rounded-2xl overflow-hidden ring-1 ring-white/12 shadow-2xl active:scale-[0.99] transition-transform"
    >
      <div className={large ? "aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[420px]" : "aspect-[16/10] sm:aspect-[3/2]"} style={{ background: bg }} />

      {/* Top tag */}
      <div className="absolute top-3 left-3">
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-marigold text-aubergine shadow">
          {e.featured ? "★ Featured" : "On sale"}
        </span>
      </div>

      {/* Bottom content */}
      <div className={`absolute inset-x-0 bottom-0 ${large ? "p-5 sm:p-6" : "p-4 sm:p-5"}`}>
        {e.category && <p className="font-mono text-[9px] uppercase tracking-widest text-marigold/90 mb-1.5">{e.category}</p>}
        <p
          className={`font-display font-bold text-white leading-[1.05] ${large ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"}`}
          style={{ letterSpacing: "-0.02em" }}
        >
          {headline}
        </p>
        {sub && <p className="font-ui text-white/65 text-xs sm:text-sm mt-1 line-clamp-1">{sub}</p>}
        <p className="font-ui text-white/75 text-xs sm:text-sm mt-1.5">
          {fmtDate(e.startDate)}{place ? ` · ${place}` : ""}
        </p>
        <div className="mt-3.5 flex items-center justify-between gap-2">
          <span className="font-display font-bold text-white text-sm">{priceFrom(e)}</span>
          <span className="inline-flex items-center gap-1 font-display font-bold text-sm text-aubergine bg-marigold px-3.5 py-2 rounded-xl group-hover:bg-marigold-dark transition-colors">
            Get tickets
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HeroFeatured({ events }: { events: HomeEvent[] }) {
  // Featured first, then soonest.
  const top = [...events]
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.startDate.localeCompare(b.startDate))
    .slice(0, 3);

  if (top.length === 0) return null;

  // One large lead card + up to two stacked beside it on desktop; clean stack on mobile.
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 gap-3.5 sm:gap-4">
      <div className="lg:col-span-2 lg:row-span-2">
        <FeatureCard e={top[0]} large />
      </div>
      {top.slice(1).map((e) => (
        <div key={e.id} className="lg:col-span-1">
          <FeatureCard e={e} />
        </div>
      ))}
    </div>
  );
}
