"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const GEO_URL = "/states.json";

export type MapTeam = {
  id: string;
  slug: string;
  team_name: string;
  university_name: string;
  tagline: string | null;
  region: string;
  state: string | null;
  city: string | null;
  cover_image_url: string | null;
  is_featured: boolean;
  is_verified: boolean;
  donate_enabled: boolean;
  wins: number;
  podiums: number;
  coords: [number, number]; // [lng, lat]
};

// Pin color per region (hex to match the region palette used across the site).
const REGION_PIN: Record<string, string> = {
  Northeast: "#6366F1",
  Southeast: "#EF4444",
  South:     "#F59E0B",
  Midwest:   "#10B981",
  Southwest: "#F97316",
  West:      "#06B6D4",
};
const DEFAULT_PIN = "#F5A623";

function pinColor(region: string) {
  return REGION_PIN[region] ?? DEFAULT_PIN;
}

type Selected = { team: MapTeam; x: number; y: number; below: boolean };

export default function TeamMap({ teams }: { teams: MapTeam[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Fan pins out when several teams share (almost) the same coordinate, so every
  // pin stays clickable instead of stacking into one. Offsets are in SVG units.
  const offsets = useMemo(() => {
    const groups: Record<string, MapTeam[]> = {};
    for (const t of teams) {
      const k = `${t.coords[0].toFixed(1)},${t.coords[1].toFixed(1)}`;
      (groups[k] ??= []).push(t);
    }
    const out: Record<string, [number, number]> = {};
    for (const members of Object.values(groups)) {
      if (members.length === 1) {
        out[members[0].id] = [0, 0];
        continue;
      }
      const radius = members.length <= 4 ? 11 : 14;
      members.forEach((t, i) => {
        const angle = (2 * Math.PI * i) / members.length - Math.PI / 2;
        out[t.id] = [Math.cos(angle) * radius, Math.sin(angle) * radius];
      });
    }
    return out;
  }, [teams]);

  // Regions actually present, for the legend.
  const legend = useMemo(() => {
    const present = new Set(teams.map(t => t.region));
    return Object.keys(REGION_PIN).filter(r => present.has(r));
  }, [teams]);

  function openPin(team: MapTeam, el: SVGGraphicsElement) {
    const wrap = wrapRef.current;
    const ctm = el.getScreenCTM();
    if (!wrap || !ctm) return;
    const rect = wrap.getBoundingClientRect();
    const rawX = ctm.e - rect.left;
    const rawY = ctm.f - rect.top;
    const x = Math.min(Math.max(rawX, 130), rect.width - 130);
    const below = rawY < 190; // near the top → drop the card below the pin
    setSelected({ team, x, y: rawY, below });
  }

  // Dismiss on Escape / scroll (positions are computed at click time).
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    const onScroll = () => setSelected(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [selected]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      style={{ maxWidth: 900, margin: "0 auto" }}
      onClick={e => {
        // Click on the empty map area closes any open popup.
        if (e.target === e.currentTarget) setSelected(null);
      }}
    >
      {/* Glow under map */}
      <div
        className="absolute -inset-3 rounded-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(245,166,35,0.07) 0%, transparent 70%)" }}
      />

      <div className="relative rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000 }}
          width={800}
          height={500}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: { fill: "rgba(255,255,255,0.05)", stroke: "rgba(255,255,255,0.14)", strokeWidth: 0.6, outline: "none" },
                    hover:   { fill: "rgba(245,166,35,0.10)", stroke: "rgba(245,166,35,0.28)", strokeWidth: 0.7, outline: "none" },
                    pressed: { fill: "rgba(245,166,35,0.10)", stroke: "rgba(245,166,35,0.28)", strokeWidth: 0.7, outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {teams.map(team => {
            const [dx, dy] = offsets[team.id] ?? [0, 0];
            const color = pinColor(team.region);
            const isHover = hovered === team.id;
            const isOpen = selected?.team.id === team.id;
            const r = isHover || isOpen ? 6.5 : 5;
            return (
              <Marker key={team.id} coordinates={team.coords}>
                <g transform={`translate(${dx},${dy})`} style={{ cursor: "pointer" }}
                   onMouseEnter={() => setHovered(team.id)}
                   onMouseLeave={() => setHovered(null)}
                   onClick={e => { e.stopPropagation(); openPin(team, e.currentTarget as unknown as SVGGraphicsElement); }}
                >
                  {/* Selected halo */}
                  {isOpen && <circle r={r + 4} fill="none" stroke={color} strokeWidth={1.2} opacity={0.5} />}
                  {team.is_featured && (
                    <circle r={r * 2.2} fill="none" stroke={color} strokeWidth={0.8} opacity={0}>
                      <animate attributeName="r" values={`${r * 1.3};${r * 2.6}`} dur="2.2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.45;0" dur="2.2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle r={r} fill={color} stroke="white" strokeWidth={isHover || isOpen ? 1.6 : 1.1} style={{ transition: "r 0.12s ease" }} />
                  <circle r={r * 0.36} fill="white" />
                </g>
              </Marker>
            );
          })}
        </ComposableMap>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {legend.map(region => (
          <span key={region} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: pinColor(region) }} />
            <span className="font-mono text-[9px] uppercase tracking-widest text-white/45">{region}</span>
          </span>
        ))}
        <span className="font-mono text-[9px] uppercase tracking-widest text-white/25">· Tap a pin to meet the team</span>
      </div>

      {/* Popup card */}
      {selected && (
        <TeamPopup
          selected={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function TeamPopup({ selected, onClose }: { selected: Selected; onClose: () => void }) {
  const { team, x, y, below } = selected;
  const color = pinColor(team.region);
  const location = [team.city, team.state].filter(Boolean).join(", ");

  return (
    <div
      className="absolute z-20 w-[260px]"
      style={{
        left: x,
        top: y + (below ? 16 : -16),
        transform: `translate(-50%, ${below ? "0" : "-100%"})`,
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="relative rounded-2xl overflow-hidden border border-white/12 bg-[#140a17] shadow-2xl">
        {/* Cover */}
        <div className="relative h-24 bg-gradient-to-br from-aubergine to-[#0d0010]">
          {team.cover_image_url && (
            <img src={team.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#140a17] via-transparent to-transparent" />
          <span
            className="absolute top-2 left-2 font-mono text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: color }}
          >
            {team.region}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/45 hover:bg-black/70 text-white/80 flex items-center justify-center transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5">
          <div className="flex items-start gap-1.5">
            <p className="font-display font-bold text-white text-sm leading-tight flex-1" style={{ letterSpacing: "-0.02em" }}>
              {team.team_name}
            </p>
            {team.is_verified && (
              <svg className="w-3.5 h-3.5 text-peacock shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-label="Verified">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <p className="font-ui text-white/50 text-xs mt-0.5">
            {team.university_name}
            {location && <span className="text-white/30"> · {location}</span>}
          </p>

          {team.tagline && (
            <p className="font-ui text-white/40 text-[11px] leading-relaxed mt-2 line-clamp-2">{team.tagline}</p>
          )}

          {(team.wins > 0 || team.podiums > 0 || team.donate_enabled) && (
            <div className="flex items-center gap-3 mt-2.5">
              {team.wins > 0 && <span className="font-mono text-[9px] text-marigold">🥇 {team.wins} win{team.wins !== 1 ? "s" : ""}</span>}
              {team.podiums > team.wins && <span className="font-mono text-[9px] text-white/35">{team.podiums} podium{team.podiums !== 1 ? "s" : ""}</span>}
              {team.donate_enabled && <span className="font-mono text-[9px] text-peacock ml-auto">💙 Donate</span>}
            </div>
          )}

          <Link
            href={`/collegiate/${team.slug}`}
            className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-marigold text-aubergine font-display font-bold text-xs hover:bg-marigold/90 transition-colors"
          >
            View team
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Caret */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#140a17] border-white/12"
          style={
            below
              ? { top: -6, borderLeftWidth: 1, borderTopWidth: 1 }
              : { bottom: -6, borderRightWidth: 1, borderBottomWidth: 1 }
          }
        />
      </div>
    </div>
  );
}
