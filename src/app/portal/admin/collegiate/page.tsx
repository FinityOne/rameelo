import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Collegiate Teams — Admin | Rameelo" };

type Team = {
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
  Midwest:   { bar: "bg-emerald-500", badge: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  Southwest: { bar: "bg-orange-500",  badge: "bg-orange-50 border-orange-200",   text: "text-orange-700"  },
  West:      { bar: "bg-cyan-600",    badge: "bg-cyan-50 border-cyan-200",       text: "text-cyan-700"    },
};

export default async function AdminCollegiatePage() {
  const supabase = await createClient();
  const [{ data: teams }, { data: pendingApps }] = await Promise.all([
    supabase
      .from("collegiate_teams")
      .select("id, slug, team_name, university_name, region, state, city, cover_image_url, is_active, is_featured, is_verified, donate_enabled, created_at")
      .order("is_active", { ascending: false })
      .order("is_featured", { ascending: false })
      .order("team_name"),
    supabase
      .from("team_applications")
      .select("id")
      .eq("status", "pending"),
  ]);

  const allTeams: Team[]  = teams ?? [];
  const pendingCount      = pendingApps?.length ?? 0;
  const activeCount       = allTeams.filter(t => t.is_active).length;
  const featuredCount     = allTeams.filter(t => t.is_featured).length;
  const inactiveCount     = allTeams.filter(t => !t.is_active).length;

  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Link href="/portal/admin" className="font-mono text-[10px] uppercase tracking-widest text-ink/30 hover:text-ink/60 transition-colors">
                Admin
              </Link>
              <span className="text-ink/20 text-xs">›</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-aubergine font-semibold">Collegiate Teams</span>
            </div>
            <h1 className="font-display font-black text-ink text-3xl" style={{ letterSpacing: "-0.03em" }}>
              Collegiate Teams
            </h1>
            <p className="font-ui text-ink/40 text-sm mt-1">
              {allTeams.length} team{allTeams.length !== 1 ? "s" : ""} · manage rosters, trophies, and donations
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 mt-1">
            <Link
              href="/portal/admin/collegiate/applications"
              className="relative flex items-center gap-2 px-4 py-2.5 border border-ink/12 bg-white hover:bg-ink/3 text-ink/60 hover:text-ink font-ui font-medium text-sm rounded-xl shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Applications
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-aubergine text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                  {pendingCount}
                </span>
              )}
            </Link>

            <Link
              href="/portal/admin/collegiate/create"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-aubergine text-white font-ui font-semibold text-sm rounded-xl hover:bg-aubergine/85 shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add Team
            </Link>
          </div>
        </div>

        {/* ── Stats strip ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total Teams", value: allTeams.length, valueColor: "text-ink",         dotColor: "bg-ink/20",        bg: "bg-white" },
            { label: "Active",      value: activeCount,     valueColor: "text-emerald-700",  dotColor: "bg-emerald-500",   bg: "bg-white" },
            { label: "Featured",    value: featuredCount,   valueColor: "text-amber-700",    dotColor: "bg-amber-400",     bg: "bg-white" },
            { label: "Inactive",    value: inactiveCount,   valueColor: "text-ink/30",       dotColor: "bg-ink/15",        bg: "bg-white" },
          ].map(({ label, value, valueColor, dotColor, bg }) => (
            <div key={label} className={`${bg} border border-ink/8 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm`}>
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
              <div>
                <p className={`font-display font-black text-2xl leading-none ${valueColor}`} style={{ letterSpacing: "-0.03em" }}>
                  {value}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink/35 mt-1">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Pending applications callout ─────────────────────────────── */}
        {pendingCount > 0 && (
          <Link
            href="/portal/admin/collegiate/applications"
            className="flex items-center justify-between w-full mb-6 px-5 py-3.5 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <p className="font-ui font-semibold text-amber-800 text-sm">
                {pendingCount} team application{pendingCount !== 1 ? "s" : ""} waiting for review
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-amber-600 group-hover:text-amber-800 transition-colors">
              Review →
            </span>
          </Link>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {allTeams.length === 0 && (
          <div className="text-center py-24 bg-white border border-ink/8 rounded-3xl shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-aubergine/8 border border-aubergine/15 flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">🏆</span>
            </div>
            <p className="font-display font-bold text-ink text-xl mb-2" style={{ letterSpacing: "-0.02em" }}>No teams yet</p>
            <p className="font-ui text-ink/40 text-sm mb-6 max-w-xs mx-auto leading-relaxed">
              Add your first collegiate raas team manually, or approve a team application.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/portal/admin/collegiate/create" className="px-5 py-2.5 bg-aubergine text-white font-ui font-semibold text-sm rounded-xl hover:bg-aubergine/85 transition-all shadow-sm">
                Add Team
              </Link>
              <Link href="/portal/admin/collegiate/applications" className="px-5 py-2.5 border border-ink/12 bg-white text-ink/60 font-ui text-sm rounded-xl hover:bg-ink/3 transition-all shadow-sm">
                View Applications
              </Link>
            </div>
          </div>
        )}

        {/* ── Team cards grid ──────────────────────────────────────────── */}
        {allTeams.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTeams.map(team => {
              const accent   = REGION_ACCENT[team.region] ?? { bar: "bg-ink/20", badge: "bg-ink/5 border-ink/12", text: "text-ink/50" };
              const location = [team.city, team.state].filter(Boolean).join(", ");

              return (
                <div
                  key={team.id}
                  className={`group relative bg-white border rounded-2xl overflow-hidden flex flex-col shadow-sm transition-all hover:shadow-md ${
                    team.is_active ? "border-ink/8 hover:border-ink/15" : "border-ink/5 opacity-55 hover:opacity-75"
                  }`}
                >
                  {/* Region color bar at top */}
                  <div className={`h-1 w-full shrink-0 ${accent.bar}`} />

                  {/* Cover photo */}
                  <div className="relative h-32 overflow-hidden bg-gradient-to-br from-aubergine/8 to-peacock/5 shrink-0">
                    {team.cover_image_url ? (
                      <img
                        src={team.cover_image_url}
                        alt={team.team_name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl opacity-8 select-none">🏆</span>
                      </div>
                    )}
                    {/* Gradient overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

                    {/* Status badge overlaid on image */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wider backdrop-blur-md ${
                        team.is_active
                          ? "bg-emerald-900/75 border border-emerald-400/40 text-emerald-200"
                          : "bg-black/50 border border-white/15 text-white/40"
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${team.is_active ? "bg-emerald-400" : "bg-white/30"}`} />
                        {team.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {/* Card content */}
                  <div className="px-4 pt-4 pb-4 flex flex-col flex-1">
                    {/* Team name */}
                    <p className="font-display font-bold text-ink text-base leading-tight mb-0.5 group-hover:text-aubergine transition-colors" style={{ letterSpacing: "-0.02em" }}>
                      {team.team_name}
                    </p>

                    {/* University + location */}
                    <p className="font-ui text-ink/50 text-xs leading-snug mb-3">
                      {team.university_name}
                      {location && <span className="text-ink/30"> · {location}</span>}
                    </p>

                    {/* Region + flags chips */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[9px] border ${accent.badge} ${accent.text}`}>
                        {team.region}
                      </span>
                      {team.is_featured && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 font-mono text-[9px] text-amber-700">
                          ⭐ Featured
                        </span>
                      )}
                      {team.is_verified && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 font-mono text-[9px] text-teal-700">
                          ✓ Verified
                        </span>
                      )}
                      {team.donate_enabled && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 font-mono text-[9px] text-blue-700">
                          💙 Donations
                        </span>
                      )}
                    </div>

                    {/* Actions footer */}
                    <div className="mt-auto pt-3 border-t border-ink/6 flex items-center justify-between">
                      <p className="font-mono text-[9px] text-ink/25">
                        {new Date(team.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      <div className="flex items-center gap-1">
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
                          href={`/portal/admin/collegiate/${team.id}/edit`}
                          className="px-3 py-1 rounded-lg bg-aubergine/8 border border-aubergine/15 font-mono text-[9px] uppercase tracking-wider text-aubergine hover:bg-aubergine/15 transition-all"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
