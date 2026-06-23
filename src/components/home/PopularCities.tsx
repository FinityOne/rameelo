"use client";

import { useRef } from "react";
import Link from "next/link";
import { useCity } from "./HomeCity";
import { CITY_SKYLINES, skylineGradient } from "@/lib/city-skylines";

// "Popular Cities" — skyline-style tiles for the metros we're actively selling
// in. Image priority: a real skyline photo (CITY_SKYLINES) → a representative
// event cover from that city → a branded skyline illustration. Tapping a tile
// selects that city and scrolls to the events section (seamless, no routing).

function cityKey(metro: string | null, city: string): string {
  return (metro || city || "Other").trim();
}

// Simple layered-building silhouette for the illustrated fallback.
function SkylineSilhouette() {
  return (
    <svg className="absolute bottom-0 left-0 w-full" style={{ height: "58%" }} viewBox="0 0 320 100" preserveAspectRatio="none" aria-hidden="true">
      <g fill="rgba(255,255,255,0.16)">
        <rect x="0" y="58" width="26" height="42" />
        <rect x="30" y="40" width="20" height="60" />
        <rect x="54" y="64" width="22" height="36" />
        <rect x="80" y="28" width="16" height="72" />
        <rect x="100" y="48" width="24" height="52" />
        <rect x="128" y="18" width="14" height="82" />
        <rect x="146" y="54" width="26" height="46" />
        <rect x="176" y="36" width="18" height="64" />
        <rect x="198" y="60" width="22" height="40" />
        <rect x="224" y="30" width="16" height="70" />
        <rect x="244" y="50" width="24" height="50" />
        <rect x="272" y="42" width="20" height="58" />
        <rect x="296" y="62" width="24" height="38" />
      </g>
    </svg>
  );
}

export default function PopularCities() {
  const { events, cityOptions, select } = useCity();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (cityOptions.length === 0) return null;

  const tiles = cityOptions.map((c) => {
    const cover = events.find((e) => cityKey(e.metroCity, e.city) === c.label && e.coverImageUrl)?.coverImageUrl ?? null;
    return {
      city: c.label,
      state: c.state,
      count: c.count,
      isNear: c.isNear,
      img: CITY_SKYLINES[c.label] ?? cover,
    };
  });

  const scrollByDir = (dir: 1 | -1) => scrollRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  const pick = (city: string) => {
    select(city);
    setTimeout(() => document.getElementById("city-events")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <section className="bg-ivory py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-7 gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-marigold-dark mb-3">Popular cities</p>
            <h2 className="font-display font-semibold text-ink" style={{ fontSize: "clamp(24px, 4vw, 36px)", letterSpacing: "-0.022em", lineHeight: 1.1 }}>
              Where garba&rsquo;s happening
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0 mb-1">
            <button onClick={() => scrollByDir(-1)} className="hidden sm:flex w-9 h-9 rounded-full border border-ivory-200 bg-white items-center justify-center text-ink-muted hover:text-ink hover:border-aubergine/30 transition-all" aria-label="Scroll left">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => scrollByDir(1)} className="hidden sm:flex w-9 h-9 rounded-full border border-ivory-200 bg-white items-center justify-center text-ink-muted hover:text-ink hover:border-aubergine/30 transition-all" aria-label="Scroll right">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <Link href="/events" className="font-ui text-sm font-semibold text-ink-muted hover:text-ink hidden sm:flex items-center gap-1 transition-colors ml-1">
              See all
            </Link>
          </div>
        </div>

        <div ref={scrollRef} className="no-scrollbar flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x" style={{ scrollbarWidth: "none" }}>
          {tiles.map((t) => (
            <button key={t.city} onClick={() => pick(t.city)} className="group shrink-0 w-[68vw] sm:w-60 snap-start text-left">
              <div
                className="relative aspect-[16/10] rounded-2xl overflow-hidden ring-1 ring-ivory-200 group-hover:ring-marigold group-active:scale-[0.98] transition-all shadow-sm"
                style={{ background: t.img ? `url(${t.img}) center/cover no-repeat` : skylineGradient(t.city) }}
              >
                {!t.img && <SkylineSilhouette />}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(20,8,22,0.6) 0%, rgba(20,8,22,0.05) 55%)" }} />
                {t.isNear && (
                  <span className="absolute top-2.5 left-2.5 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-marigold text-aubergine shadow">📍 Near you</span>
                )}
                <span className="absolute bottom-2.5 left-2.5 font-mono text-[9px] font-bold uppercase tracking-widest text-white/90">
                  {t.count} {t.count === 1 ? "event" : "events"}
                </span>
              </div>
              <p className="font-display font-bold text-ink text-base mt-3 leading-tight group-hover:text-aubergine transition-colors">{t.city}</p>
              {t.state && <p className="font-mono text-[10px] text-ink-muted uppercase tracking-wide mt-0.5">{t.state}</p>}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
