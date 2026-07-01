import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TeamsTable, { type Team } from "./_components/TeamsTable";

export const metadata: Metadata = { title: "Collegiate Teams — Admin | Rameelo" };

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
              <Link href="/admin" className="font-mono text-[10px] uppercase tracking-widest text-ink/30 hover:text-ink/60 transition-colors">
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
              href="/admin/collegiate/applications"
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
              href="/admin/collegiate/create"
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
            href="/admin/collegiate/applications"
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
              <Link href="/admin/collegiate/create" className="px-5 py-2.5 bg-aubergine text-white font-ui font-semibold text-sm rounded-xl hover:bg-aubergine/85 transition-all shadow-sm">
                Add Team
              </Link>
              <Link href="/admin/collegiate/applications" className="px-5 py-2.5 border border-ink/12 bg-white text-ink/60 font-ui text-sm rounded-xl hover:bg-ink/3 transition-all shadow-sm">
                View Applications
              </Link>
            </div>
          </div>
        )}

        {/* ── Teams table (grouped by region, searchable) ──────────────── */}
        {allTeams.length > 0 && <TeamsTable teams={allTeams} />}
      </div>
    </div>
  );
}
