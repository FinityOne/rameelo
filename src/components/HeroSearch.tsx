"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useNearestMetro } from "@/hooks/useNearestMetro";
import { METROS } from "@/lib/metros";

const VIBES = [
  { value: "All",      label: "All",      icon: "✨" },
  { value: "Garba",    label: "Garba",    icon: "🌀" },
  { value: "Dandiya",  label: "Dandiya",  icon: "🥢" },
  { value: "Raas",     label: "Raas",     icon: "🎭" },
  { value: "Workshop", label: "Workshop", icon: "📚" },
];

// Cities shown as quick-chips — ordered by community density
const QUICK_CITIES = [
  { city: "Edison",       state: "NJ" },
  { city: "Houston",      state: "TX" },
  { city: "Atlanta",      state: "GA" },
  { city: "Chicago",      state: "IL" },
  { city: "San Jose",     state: "CA" },
  { city: "Boston",       state: "MA" },
  { city: "Dallas",       state: "TX" },
  { city: "Seattle",      state: "WA" },
  { city: "New York",     state: "NY" },
  { city: "Los Angeles",  state: "CA" },
  { city: "Philadelphia", state: "PA" },
  { city: "Denver",       state: "CO" },
];

const CITY_LIST = ["All Cities", ...METROS.map(m => m.city)];

type Drop = "city" | "vibe" | null;

export default function HeroSearch() {
  const router = useRouter();
  const locationState = useNearestMetro();
  const containerRef = useRef<HTMLDivElement>(null);

  const [city, setCity] = useState("All Cities");
  const [vibe, setVibe] = useState("All");
  const [open, setOpen] = useState<Drop>(null);

  useEffect(() => {
    if (locationState.status === "resolved" && city === "All Cities") {
      setCity(locationState.metro.city);
    }
  }, [locationState.status]); // eslint-disable-line

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function eventsUrl(overrideCity?: string, overrideVibe?: string) {
    const c = overrideCity ?? city;
    const v = overrideVibe ?? vibe;
    const params = new URLSearchParams();
    if (c !== "All Cities") params.set("city", c);
    if (v !== "All")        params.set("vibe", v);
    const qs = params.toString();
    return `/events${qs ? `?${qs}` : ""}`;
  }

  function handleSearch() {
    router.push(eventsUrl());
  }

  const cityLabel = city === "All Cities" ? "Anywhere" : city;
  const vibeLabel = VIBES.find(v => v.value === vibe)?.label ?? "All";
  const vibeIcon  = VIBES.find(v => v.value === vibe)?.icon ?? "✨";

  return (
    <>
      {/* ── Desktop search widget ── */}
      <div ref={containerRef} className="w-full max-w-3xl mb-7 hidden sm:block">
        <div className="flex items-stretch bg-white/8 border border-white/12 backdrop-blur-sm rounded-2xl p-2 gap-0">

          {/* WHERE */}
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setOpen(open === "city" ? null : "city")}
              className={`w-full flex flex-col items-start px-5 py-3 rounded-xl transition-colors text-left ${
                open === "city" ? "bg-white/12" : "hover:bg-white/8"
              }`}
            >
              <span className="font-mono text-[9px] uppercase tracking-widest text-white/35 mb-1.5">Where</span>
              <div className="flex items-center gap-2 w-full">
                <svg className="w-3.5 h-3.5 text-marigold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {locationState.status === "pending" && city === "All Cities" ? (
                  <span className="inline-block w-28 h-3.5 rounded bg-white/15 animate-pulse" />
                ) : (
                  <span className={`font-ui text-sm font-medium truncate ${city !== "All Cities" ? "text-white" : "text-white/60"}`}>
                    {cityLabel}
                  </span>
                )}
                <svg className={`w-3 h-3 text-white/30 ml-auto shrink-0 transition-transform ${open === "city" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {open === "city" && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-[#1e0f2a] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="p-2 max-h-72 overflow-y-auto overscroll-contain">
                  {CITY_LIST.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCity(c); setOpen(null); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                        city === c ? "bg-marigold/15 text-marigold" : "text-white/70 hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${city === c ? "bg-marigold" : "bg-white/20"}`} />
                      <span className="font-ui text-sm">{c === "All Cities" ? "Anywhere" : c}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px self-stretch bg-white/10 my-2" />

          {/* WHEN */}
          <Link
            href="/events"
            className="flex-1 flex flex-col items-start px-5 py-3 rounded-xl hover:bg-white/8 transition-colors min-w-0"
          >
            <span className="font-mono text-[9px] uppercase tracking-widest text-white/35 mb-1.5">When</span>
            <div className="flex items-center gap-2 w-full">
              <svg className="w-3.5 h-3.5 text-white/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-ui text-sm text-white/85 font-medium">Navratri · Oct 11–20</span>
            </div>
          </Link>

          <div className="w-px self-stretch bg-white/10 my-2" />

          {/* VIBE */}
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setOpen(open === "vibe" ? null : "vibe")}
              className={`w-full flex flex-col items-start px-5 py-3 rounded-xl transition-colors text-left ${
                open === "vibe" ? "bg-white/12" : "hover:bg-white/8"
              }`}
            >
              <span className="font-mono text-[9px] uppercase tracking-widest text-white/35 mb-1.5">Vibe</span>
              <div className="flex items-center gap-2 w-full">
                <span className="text-sm shrink-0 leading-none">{vibeIcon}</span>
                <span className={`font-ui text-sm font-medium truncate ${vibe !== "All" ? "text-white" : "text-white/60"}`}>
                  {vibeLabel}
                </span>
                <svg className={`w-3 h-3 text-white/30 ml-auto shrink-0 transition-transform ${open === "vibe" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {open === "vibe" && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-[#1e0f2a] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="p-2">
                  {VIBES.map((v) => (
                    <button
                      key={v.value}
                      onClick={() => { setVibe(v.value); setOpen(null); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        vibe === v.value ? "bg-marigold/15 text-marigold" : "text-white/70 hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      <span className="text-base leading-none">{v.icon}</span>
                      <span className="font-ui text-sm">{v.label}</span>
                      {vibe === v.value && (
                        <svg className="w-3.5 h-3.5 text-marigold ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleSearch}
            className="flex items-center justify-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-7 py-3 rounded-xl hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-lg shadow-marigold/20 shrink-0 whitespace-nowrap ml-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Find my garba
          </button>
        </div>
      </div>

      {/* ── Mobile search widget ── */}
      <div className="sm:hidden w-full mb-6">

        {/* Vibe row — always visible, tap to select then "Find" */}
        <div className="mb-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-white/35 mb-2.5">What&apos;s your vibe?</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
            {VIBES.map(v => (
              <button
                key={v.value}
                onClick={() => setVibe(v.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full border shrink-0 transition-all active:scale-95 ${
                  vibe === v.value
                    ? "bg-marigold border-marigold text-aubergine font-bold"
                    : "border-white/20 bg-white/8 text-white/70"
                }`}
                style={{ minHeight: 44 }}
              >
                <span className="text-base leading-none">{v.icon}</span>
                <span className="font-ui text-sm font-medium">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* City quick-chips — tap goes directly to filtered events */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="font-mono text-[9px] uppercase tracking-widest text-white/35">Pick a city</p>
            <Link
              href={eventsUrl("All Cities")}
              className="font-mono text-[9px] uppercase tracking-widest text-marigold/70 hover:text-marigold"
            >
              All cities →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_CITIES.map(({ city: c, state: s }) => (
              <Link
                key={c}
                href={eventsUrl(c)}
                className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl border border-white/15 bg-white/6 active:bg-white/15 transition-colors text-center"
                style={{ minHeight: 56 }}
              >
                <span className="font-ui text-sm font-semibold text-white leading-tight">{c}</span>
                <span className="font-mono text-[9px] text-white/40 mt-0.5">{s}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Full-width CTA */}
        <button
          onClick={handleSearch}
          className="w-full flex items-center justify-center gap-2.5 bg-marigold text-aubergine font-display font-bold text-base py-4 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-marigold/20"
          style={{ minHeight: 56 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {city !== "All Cities"
            ? `Find ${vibe === "All" ? "events" : vibe} in ${city}`
            : `Browse all ${vibe === "All" ? "events" : vibe}`}
        </button>
      </div>

      {/* ── Popular quick-links (both breakpoints, desktop only) ── */}
      <div className="hidden sm:flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest mr-1 shrink-0">Popular:</span>
        {[
          { label: "Falguni Pathak · NJ",    city: "Edison",     vibe: "All"     },
          { label: "Atul Purohit · Houston",  city: "Houston",    vibe: "Garba"   },
          { label: "Garba · Atlanta",         city: "Atlanta",    vibe: "Garba"   },
          { label: "Dandiya · Chicago",       city: "Chicago",    vibe: "Dandiya" },
          { label: "UGA Raas Royalty",        city: "All Cities", vibe: "Raas"    },
          { label: "Bay Area Navratri",       city: "San Jose",   vibe: "All"     },
        ].map((tag) => {
          const params = new URLSearchParams();
          if (tag.city !== "All Cities") params.set("city", tag.city);
          if (tag.vibe !== "All")        params.set("vibe", tag.vibe);
          const qs = params.toString();
          return (
            <Link
              key={tag.label}
              href={`/events${qs ? `?${qs}` : ""}`}
              className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-white/12 bg-white/5 font-ui text-xs text-white/60 hover:text-white hover:border-white/25 hover:bg-white/10 transition-all"
            >
              {tag.label}
            </Link>
          );
        })}
      </div>
    </>
  );
}
