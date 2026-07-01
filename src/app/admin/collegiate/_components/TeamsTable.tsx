"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type Team = {
  id: string;
  slug: string;
  team_name: string;
  university_name: string;
  region: string;
  state: string | null;
  city: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_verified: boolean;
  donate_enabled: boolean;
  created_at: string;
};

const REGION_ACCENT: Record<string, { bar: string; badge: string; text: string }> = {
  Northeast: { bar: "bg-indigo-500",  badge: "bg-indigo-50 border-indigo-200",   text: "text-indigo-700"  },
  Southeast: { bar: "bg-red-500",     badge: "bg-red-50 border-red-200",         text: "text-red-700"     },
  South:     { bar: "bg-amber-500",   badge: "bg-amber-50 border-amber-200",     text: "text-amber-700"   },
  Midwest:   { bar: "bg-emerald-500", badge: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  Southwest: { bar: "bg-orange-500",  badge: "bg-orange-50 border-orange-200",   text: "text-orange-700"  },
  West:      { bar: "bg-cyan-600",    badge: "bg-cyan-50 border-cyan-200",       text: "text-cyan-700"    },
};

const REGION_ORDER = ["Northeast", "Southeast", "South", "Midwest", "Southwest", "West"];

function accentFor(region: string) {
  return REGION_ACCENT[region] ?? { bar: "bg-ink/20", badge: "bg-ink/5 border-ink/12", text: "text-ink/50" };
}

export default function TeamsTable({ teams }: { teams: Team[] }) {
  const [query, setQuery]           = useState("");
  const [regionFilter, setRegion]   = useState<string>("All");

  // Regions actually present, ordered canonically (unknowns appended).
  const regionsPresent = useMemo(() => {
    const present = Array.from(new Set(teams.map(t => t.region)));
    const ordered  = REGION_ORDER.filter(r => present.includes(r));
    const extras   = present.filter(r => !REGION_ORDER.includes(r)).sort();
    return [...ordered, ...extras];
  }, [teams]);

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of teams) counts[t.region] = (counts[t.region] ?? 0) + 1;
    return counts;
  }, [teams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teams.filter(t => {
      if (regionFilter !== "All" && t.region !== regionFilter) return false;
      if (!q) return true;
      return [t.team_name, t.university_name, t.city, t.state]
        .filter(Boolean)
        .some(v => (v as string).toLowerCase().includes(q));
    });
  }, [teams, query, regionFilter]);

  // Group the filtered rows by region for the table sections.
  const grouped = useMemo(() => {
    const map: Record<string, Team[]> = {};
    for (const t of filtered) (map[t.region] ??= []).push(t);
    const orderedRegions = regionsPresent.filter(r => map[r]?.length);
    return orderedRegions.map(region => ({ region, rows: map[region] }));
  }, [filtered, regionsPresent]);

  return (
    <div>
      {/* ── Search + region filter ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-0">
          <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search team, university, or location…"
            className="w-full pl-10 pr-3 py-2.5 bg-white border border-ink/12 rounded-xl font-ui text-sm text-ink placeholder:text-ink/30 shadow-sm focus:outline-none focus:border-aubergine/40 focus:ring-2 focus:ring-aubergine/10 transition-all"
          />
        </div>
      </div>

      {/* Region pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        <RegionPill
          label="All Regions"
          count={teams.length}
          active={regionFilter === "All"}
          onClick={() => setRegion("All")}
        />
        {regionsPresent.map(r => (
          <RegionPill
            key={r}
            label={r}
            count={regionCounts[r] ?? 0}
            active={regionFilter === r}
            barClass={accentFor(r).bar}
            onClick={() => setRegion(regionFilter === r ? "All" : r)}
          />
        ))}
      </div>

      {/* ── No results ─────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-ink/8 rounded-2xl shadow-sm">
          <p className="font-display font-bold text-ink text-base mb-1">No teams match</p>
          <p className="font-ui text-ink/40 text-sm">
            Try a different search{regionFilter !== "All" ? " or region" : ""}.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-ink/8 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-ink/8">
                  {["Team", "University", "Location", "Status", "Flags", "Added", ""].map((h, i) => (
                    <th
                      key={i}
                      className={`font-mono text-[9px] uppercase tracking-widest text-ink/40 font-semibold px-4 py-3 ${
                        i === 2 ? "hidden md:table-cell" : ""
                      } ${i === 4 ? "hidden lg:table-cell" : ""} ${i === 5 ? "hidden xl:table-cell" : ""} ${
                        i === 6 ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map(({ region, rows }) => {
                  const accent = accentFor(region);
                  return (
                    <TeamRows key={region} region={region} rows={rows} accent={accent} />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamRows({
  region,
  rows,
  accent,
}: {
  region: string;
  rows: Team[];
  accent: { bar: string; badge: string; text: string };
}) {
  return (
    <>
      {/* Region section header */}
      <tr className="bg-ink/[0.02] border-y border-ink/6">
        <td colSpan={7} className="px-4 py-2">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${accent.bar}`} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink/60 font-bold">{region}</span>
            <span className="font-mono text-[10px] text-ink/30">
              {rows.length} team{rows.length !== 1 ? "s" : ""}
            </span>
          </div>
        </td>
      </tr>

      {rows.map(team => {
        const location = [team.city, team.state].filter(Boolean).join(", ");
        return (
          <tr
            key={team.id}
            className={`border-b border-ink/5 last:border-b-0 hover:bg-ink/[0.015] transition-colors ${
              team.is_active ? "" : "opacity-55"
            }`}
          >
            {/* Team */}
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-gradient-to-br from-aubergine/10 to-peacock/8 shrink-0 flex items-center justify-center">
                  {team.cover_image_url ? (
                    <img src={team.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm opacity-40 select-none">🏆</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-ui font-semibold text-ink text-sm leading-tight truncate">{team.team_name}</p>
                  <p className="font-ui text-ink/40 text-xs truncate md:hidden">{team.university_name}</p>
                </div>
              </div>
            </td>

            {/* University */}
            <td className="px-4 py-3 hidden md:table-cell">
              <p className="font-ui text-ink/60 text-sm truncate max-w-[220px]">{team.university_name}</p>
            </td>

            {/* Location */}
            <td className="px-4 py-3 hidden md:table-cell">
              <p className="font-ui text-ink/50 text-sm truncate">{location || "—"}</p>
            </td>

            {/* Status */}
            <td className="px-4 py-3">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wider border ${
                  team.is_active
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-ink/5 border-ink/12 text-ink/40"
                }`}
              >
                <span className={`w-1 h-1 rounded-full ${team.is_active ? "bg-emerald-500" : "bg-ink/30"}`} />
                {team.is_active ? "Active" : "Inactive"}
              </span>
            </td>

            {/* Flags */}
            <td className="px-4 py-3 hidden lg:table-cell">
              <div className="flex items-center gap-1">
                {team.is_featured && (
                  <span title="Featured" className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 font-mono text-[9px] text-amber-700">⭐</span>
                )}
                {team.is_verified && (
                  <span title="Verified" className="inline-flex items-center px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 font-mono text-[9px] text-teal-700">✓</span>
                )}
                {team.donate_enabled && (
                  <span title="Donations enabled" className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 font-mono text-[9px] text-blue-700">💙</span>
                )}
                {!team.is_featured && !team.is_verified && !team.donate_enabled && (
                  <span className="font-mono text-[10px] text-ink/20">—</span>
                )}
              </div>
            </td>

            {/* Added */}
            <td className="px-4 py-3 hidden xl:table-cell">
              <p className="font-mono text-[10px] text-ink/35 whitespace-nowrap">
                {new Date(team.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </td>

            {/* Actions */}
            <td className="px-4 py-3">
              <div className="flex items-center justify-end gap-1">
                <Link
                  href={`/collegiate/${team.slug}`}
                  target="_blank"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-[9px] uppercase tracking-wider text-ink/35 hover:text-ink/70 hover:bg-ink/5 transition-all"
                >
                  View
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
                <Link
                  href={`/admin/collegiate/${team.id}/edit`}
                  className="px-3 py-1 rounded-lg bg-aubergine/8 border border-aubergine/15 font-mono text-[9px] uppercase tracking-wider text-aubergine hover:bg-aubergine/15 transition-all"
                >
                  Edit
                </Link>
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}

function RegionPill({
  label,
  count,
  active,
  barClass,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  barClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-mono text-[10px] uppercase tracking-wider transition-all ${
        active
          ? "bg-aubergine text-white border-aubergine shadow-sm"
          : "bg-white text-ink/55 border-ink/12 hover:border-ink/25 hover:text-ink/80"
      }`}
    >
      {barClass && <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-white/70" : barClass}`} />}
      {label}
      <span className={`font-bold ${active ? "text-white/80" : "text-ink/30"}`}>{count}</span>
    </button>
  );
}
