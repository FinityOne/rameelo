"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useNearestMetro } from "@/hooks/useNearestMetro";
import { METROS } from "@/lib/metros";

const VIBES = [
  { value: "All",      label: "All vibes",  icon: "✨" },
  { value: "Garba",    label: "Garba",      icon: "🌀" },
  { value: "Dandiya",  label: "Dandiya",    icon: "🥢" },
  { value: "Raas",     label: "Raas",       icon: "🎭" },
  { value: "Workshop", label: "Workshop",   icon: "📚" },
];

const CITY_LIST = ["All Cities", ...METROS.map(m => m.city)];

type Drop = "city" | "vibe" | null;

export default function HeroSearch() {
  const router = useRouter();
  const locationState = useNearestMetro();
  const containerRef = useRef<HTMLDivElement>(null);

  const [city, setCity]   = useState("All Cities");
  const [vibe, setVibe]   = useState("All");
  const [open, setOpen]   = useState<Drop>(null);

  // Pre-fill city from geolocation once resolved
  useEffect(() => {
    if (locationState.status === "resolved" && city === "All Cities") {
      setCity(locationState.metro.city);
    }
  }, [locationState.status]); // eslint-disable-line

  // Close dropdowns on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function handleSearch() {
    const params = new URLSearchParams();
    if (city !== "All Cities") params.set("city", city);
    if (vibe !== "All")        params.set("vibe", vibe);
    const qs = params.toString();
    router.push(`/events${qs ? `?${qs}` : ""}`);
  }

  const cityLabel = city === "All Cities" ? "Anywhere" : city;
  const vibeLabel = VIBES.find(v => v.value === vibe)?.label ?? "All vibes";
  const vibeIcon  = VIBES.find(v => v.value === vibe)?.icon ?? "✨";

  return (
    <>
      {/* ── Search widget ── */}
      <div ref={containerRef} className="w-full max-w-3xl mb-7">

        {/* Desktop: single row */}
        <div className="hidden sm:flex items-stretch bg-white/8 border border-white/12 backdrop-blur-sm rounded-2xl p-2 gap-0">

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

            {/* City dropdown */}
            {open === "city" && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-[#1e0f2a] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="p-2 max-h-72 overflow-y-auto">
                  {CITY_LIST.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCity(c); setOpen(null); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                        city === c
                          ? "bg-marigold/15 text-marigold"
                          : "text-white/70 hover:bg-white/8 hover:text-white"
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

          {/* WHEN — static for now, links to events */}
          <Link
            href="/events"
            className="flex-1 flex flex-col items-start px-5 py-3 rounded-xl hover:bg-white/8 transition-colors min-w-0"
          >
            <span className="font-mono text-[9px] uppercase tracking-widest text-white/35 mb-1.5">When</span>
            <div className="flex items-center gap-2 w-full">
              <svg className="w-3.5 h-3.5 text-white/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-ui text-sm text-white/85 font-medium">Navratri · Oct 11 – 20</span>
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

            {/* Vibe dropdown */}
            {open === "vibe" && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-[#1e0f2a] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="p-2">
                  {VIBES.map((v) => (
                    <button
                      key={v.value}
                      onClick={() => { setVibe(v.value); setOpen(null); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        vibe === v.value
                          ? "bg-marigold/15 text-marigold"
                          : "text-white/70 hover:bg-white/8 hover:text-white"
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

        {/* Mobile layout — stacked, thumb-friendly */}
        <div className="flex flex-col sm:hidden bg-white/8 border border-white/12 backdrop-blur-sm rounded-2xl overflow-hidden">

          {/* WHERE */}
          <button
            onClick={() => setOpen(open === "city" ? null : "city")}
            className={`flex items-center gap-3 px-4 py-4 border-b border-white/8 text-left transition-colors ${open === "city" ? "bg-white/10" : ""}`}
          >
            <div className="w-9 h-9 rounded-xl bg-marigold/15 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-marigold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/35 mb-0.5">Where</p>
              {locationState.status === "pending" && city === "All Cities" ? (
                <span className="inline-block w-32 h-4 rounded bg-white/15 animate-pulse" />
              ) : (
                <p className={`font-ui text-sm font-medium ${city !== "All Cities" ? "text-white" : "text-white/60"}`}>{cityLabel}</p>
              )}
            </div>
            <svg className={`w-4 h-4 text-white/25 shrink-0 transition-transform ${open === "city" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* City dropdown (mobile, inline) */}
          {open === "city" && (
            <div className="border-b border-white/8 bg-black/20 p-3 grid grid-cols-2 gap-1 max-h-52 overflow-y-auto">
              {CITY_LIST.map((c) => (
                <button
                  key={c}
                  onClick={() => { setCity(c); setOpen(null); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors ${
                    city === c ? "bg-marigold/15 text-marigold" : "text-white/60 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${city === c ? "bg-marigold" : "bg-white/20"}`} />
                  <span className="font-ui text-xs leading-tight">{c === "All Cities" ? "Anywhere" : c}</span>
                </button>
              ))}
            </div>
          )}

          {/* WHEN */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-white/8">
            <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/35 mb-0.5">When</p>
              <p className="font-ui text-sm text-white/85 font-medium">Navratri · Oct 11 – 20</p>
            </div>
          </div>

          {/* VIBE */}
          <button
            onClick={() => setOpen(open === "vibe" ? null : "vibe")}
            className={`flex items-center gap-3 px-4 py-4 text-left transition-colors ${open === "vibe" ? "bg-white/10" : ""}`}
          >
            <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center shrink-0 text-base leading-none">
              {vibeIcon}
            </div>
            <div className="flex-1">
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/35 mb-0.5">Vibe</p>
              <p className={`font-ui text-sm font-medium ${vibe !== "All" ? "text-white" : "text-white/60"}`}>{vibeLabel}</p>
            </div>
            <svg className={`w-4 h-4 text-white/25 shrink-0 transition-transform ${open === "vibe" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Vibe dropdown (mobile, inline) */}
          {open === "vibe" && (
            <div className="border-t border-white/8 bg-black/20 p-3 flex flex-col gap-1">
              {VIBES.map((v) => (
                <button
                  key={v.value}
                  onClick={() => { setVibe(v.value); setOpen(null); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    vibe === v.value ? "bg-marigold/15 text-marigold" : "text-white/60 hover:bg-white/8 hover:text-white"
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
          )}

          {/* Full-width CTA */}
          <button
            onClick={handleSearch}
            className="flex items-center justify-center gap-2 bg-marigold text-aubergine font-display font-bold text-base px-6 py-4 hover:bg-marigold-dark active:scale-[0.98] transition-all w-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Find my garba
          </button>
        </div>
      </div>

      {/* Popular searches */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest mr-1 shrink-0">Popular:</span>
        {[
          { label: "Falguni Pathak · NJ",   city: "Edison",       vibe: "All"   },
          { label: "Atul Purohit · Houston", city: "Houston",      vibe: "Garba" },
          { label: "Garba · Atlanta",        city: "Atlanta",      vibe: "Garba" },
          { label: "Dandiya · Chicago",      city: "Chicago",      vibe: "Dandiya" },
          { label: "UGA Raas Royalty",       city: "All Cities",   vibe: "Raas"  },
          { label: "Bay Area Navratri",      city: "San Jose",     vibe: "All"   },
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
