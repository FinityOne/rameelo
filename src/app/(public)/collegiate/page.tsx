import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbSchema, itemListSchema, ld } from "@/lib/jsonld";
import { resolveUSCoords } from "@/lib/us-geo";
import TeamMap, { type MapTeam } from "./TeamMap";

export const metadata: Metadata = {
  title: "Collegiate Raas Garba Teams | Rameelo",
  description: "Discover collegiate raas garba teams competing across the United States. Explore rosters, trophies, mixes, and support your favorite team.",
  keywords: ["collegiate raas", "college garba", "raas garba competition", "NCRC", "collegiate garba teams", "university raas"],
  alternates: { canonical: "https://www.rameelo.com/collegiate" },
  openGraph: {
    title: "Collegiate Raas Garba | Rameelo",
    description: "The home of competitive collegiate raas garba in America. Explore teams, trophies, and mixes.",
    url: "https://www.rameelo.com/collegiate",
    siteName: "Rameelo",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Collegiate Raas Garba | Rameelo", description: "The home of competitive collegiate raas garba in America." },
};

const REGION_META: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  Northeast:  { label: "Northeast",  color: "text-indigo-300",  bg: "bg-indigo-500/10",  border: "border-indigo-500/25",  emoji: "🗽" },
  Southeast:  { label: "Southeast",  color: "text-red-300",     bg: "bg-red-500/10",     border: "border-red-500/25",     emoji: "🌴" },
  South:      { label: "South",      color: "text-amber-300",   bg: "bg-amber-500/10",   border: "border-amber-500/25",   emoji: "🍑" },
  Midwest:    { label: "Midwest",    color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/25", emoji: "🌽" },
  Southwest:  { label: "Southwest",  color: "text-orange-300",  bg: "bg-orange-500/10",  border: "border-orange-500/25",  emoji: "🌵" },
  West:       { label: "West",       color: "text-cyan-300",    bg: "bg-cyan-500/10",    border: "border-cyan-500/25",    emoji: "🌊" },
};

const REGION_ORDER = ["Northeast", "Southeast", "South", "Midwest", "Southwest", "West"];

type Team = {
  id: string;
  slug: string;
  team_name: string;
  university_name: string;
  tagline: string | null;
  region: string;
  state: string | null;
  city: string | null;
  cover_image_url: string | null;
  profile_image_url: string | null;
  is_featured: boolean;
  is_verified: boolean;
  achievements: { placement: string; competition: string; year: number }[] | null;
  donate_enabled: boolean;
};

export default async function CollegiatePage() {
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("collegiate_teams")
    .select("id, slug, team_name, university_name, tagline, region, state, city, cover_image_url, profile_image_url, is_featured, is_verified, achievements, donate_enabled")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("team_name");

  const allTeams: Team[] = teams ?? [];

  const byRegion: Record<string, Team[]> = {};
  for (const t of allTeams) {
    if (!byRegion[t.region]) byRegion[t.region] = [];
    byRegion[t.region].push(t);
  }

  // Teams we can place on the map (resolvable coordinates), with derived stats.
  const mapTeams: MapTeam[] = allTeams.flatMap(t => {
    const coords = resolveUSCoords(t.city, t.state);
    if (!coords) return [];
    const podiums = (t.achievements ?? []).length;
    const wins = (t.achievements ?? []).filter(a => a.placement === "1st" || a.placement === "Champion").length;
    return [{
      id: t.id, slug: t.slug, team_name: t.team_name, university_name: t.university_name,
      tagline: t.tagline, region: t.region, state: t.state, city: t.city,
      cover_image_url: t.cover_image_url, is_featured: t.is_featured, is_verified: t.is_verified,
      donate_enabled: t.donate_enabled, wins, podiums, coords,
    }];
  });

  const featured = allTeams.filter(t => t.is_featured);
  const totalTeams = allTeams.length;
  const totalStates = new Set(allTeams.map(t => t.state).filter(Boolean)).size;
  const totalUniversities = new Set(allTeams.map(t => t.university_name)).size;

  const crumbs = breadcrumbSchema([
    { name: "Home", url: "https://www.rameelo.com/" },
    { name: "Collegiate", url: "https://www.rameelo.com/collegiate" },
  ]);

  const teamList = itemListSchema(
    "Collegiate Raas Garba Teams",
    allTeams.map((t, i) => ({ position: i + 1, name: t.team_name, url: `https://www.rameelo.com/collegiate/${t.slug}` }))
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(teamList) }} />

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(160deg, #0d0010 0%, #1a0820 40%, #0d0010 100%)" }}>
        {/* Decorative orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] pointer-events-none" style={{ background: "radial-gradient(circle, #C9A84C 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full opacity-15 blur-[100px] pointer-events-none" style={{ background: "radial-gradient(circle, #6B3FA0 0%, transparent 70%)" }} />

        <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-marigold/10 border border-marigold/25 rounded-full px-4 py-1.5 mb-6">
            <span className="text-sm">🏆</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-marigold font-bold">The Collegiate Circuit</span>
          </div>

          <h1 className="font-display font-black text-white text-5xl sm:text-6xl lg:text-7xl leading-none mb-5" style={{ letterSpacing: "-0.035em" }}>
            Collegiate<br />
            <span className="text-marigold">Raas Garba</span>
          </h1>

          <p className="font-ui text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            America&apos;s most competitive college teams. Hundreds of dancers. One stage. Explore the teams pushing raas garba forward.
          </p>

          {/* Stats bar */}
          <div className="inline-grid grid-cols-3 divide-x divide-white/10 bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-10">
            {[
              { value: totalTeams || "25+", label: "Teams" },
              { value: totalUniversities || "20+", label: "Universities" },
              { value: totalStates || "15+", label: "States" },
            ].map(({ value, label }) => (
              <div key={label} className="px-8 py-4">
                <p className="font-display font-black text-marigold text-3xl" style={{ letterSpacing: "-0.03em" }}>{value}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#teams" className="px-6 py-3 bg-marigold text-aubergine font-display font-bold rounded-xl hover:bg-marigold/90 transition-all">
              Explore Teams →
            </a>
            <Link href="/collegiate/apply" className="px-6 py-3 border border-white/20 text-white font-ui font-medium rounded-xl hover:bg-white/5 transition-all text-sm">
              List Your Team
            </Link>
          </div>
        </div>
      </section>

      {/* Teams map */}
      {mapTeams.length > 0 && (
        <section className="relative overflow-hidden border-b border-white/5" style={{ background: "linear-gradient(180deg, #0d0010 0%, #12071a 55%, #0b0410 100%)" }}>
          <div className="absolute top-0 right-1/4 w-[500px] h-[400px] rounded-full opacity-15 blur-[120px] pointer-events-none" style={{ background: "radial-gradient(circle, #6B3FA0 0%, transparent 70%)" }} />
          <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-20">
            <div className="text-center mb-10">
              <p className="font-mono text-[10px] uppercase tracking-widest text-marigold font-bold mb-3">The Map</p>
              <h2 className="font-display font-bold text-white text-3xl sm:text-4xl mb-3" style={{ letterSpacing: "-0.025em" }}>
                Every team, coast to coast
              </h2>
              <p className="font-ui text-white/50 text-sm sm:text-base max-w-xl mx-auto">
                {mapTeams.length} collegiate raas teams across the country. Click a pin to meet the team.
              </p>
            </div>
            <TeamMap teams={mapTeams} />
          </div>
        </section>
      )}

      {/* What is collegiate raas */}
      <section className="bg-ivory py-16 border-b border-ink/8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-peacock font-bold mb-3">About the Circuit</p>
              <h2 className="font-display font-bold text-ink text-3xl sm:text-4xl mb-4" style={{ letterSpacing: "-0.025em" }}>
                What is collegiate raas garba?
              </h2>
              <p className="font-ui text-ink-muted leading-relaxed mb-4">
                Collegiate raas garba is a competitive dance form practiced by university teams across the United States.
                Rooted in the traditional Gujarati folk dances of Navratri, teams blend athleticism, choreography,
                and cultural storytelling into performances that compete at regional and national championships.
              </p>
              <p className="font-ui text-ink-muted leading-relaxed">
                Competitions like the National Collegiate Raas Championship (NCRC) draw thousands of spectators annually.
                Teams spend months rehearsing intricate formations, synchronizing footwork, and crafting original mixes
                that honor tradition while pushing creative boundaries.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "🎯", title: "Precision", desc: "Teams are judged on synchronization, formations, and technical execution." },
                { icon: "🎵", title: "Original Mixes", desc: "Each team creates a unique mix blending folk melodies with modern production." },
                { icon: "👘", title: "Traditional Attire", desc: "Vibrant chaniya choli and kediyu celebrate Gujarati cultural heritage." },
                { icon: "🏟️", title: "Live Competition", desc: "Regionals and nationals draw crowds of thousands across the country." },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-white rounded-2xl p-4 border border-ink/8">
                  <span className="text-2xl mb-2 block">{icon}</span>
                  <p className="font-display font-bold text-ink text-sm mb-1" style={{ letterSpacing: "-0.02em" }}>{title}</p>
                  <p className="font-ui text-ink-muted text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Teams */}
      {featured.length > 0 && (
        <section className="py-16 border-b border-ink/8" style={{ background: "linear-gradient(180deg, #1e0f20 0%, #150a17 100%)" }}>
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center gap-3 mb-8">
              <span className="text-xl">⭐</span>
              <h2 className="font-display font-bold text-white text-2xl" style={{ letterSpacing: "-0.025em" }}>Featured Teams</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map(team => <TeamCard key={team.id} team={team} dark />)}
            </div>
          </div>
        </section>
      )}

      {/* Teams by region */}
      <section id="teams" className="py-16 bg-ivory">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="font-mono text-[10px] uppercase tracking-widest text-peacock font-bold mb-2">By Region</p>
            <h2 className="font-display font-bold text-ink text-3xl sm:text-4xl" style={{ letterSpacing: "-0.025em" }}>Teams Across America</h2>
          </div>

          {allTeams.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-4">🏆</p>
              <p className="font-display font-bold text-ink text-xl mb-2" style={{ letterSpacing: "-0.02em" }}>Teams coming soon</p>
              <p className="font-ui text-ink-muted text-sm mb-6">We&apos;re onboarding the first collegiate teams. Is yours ready?</p>
              <a href="mailto:collegiate@rameelo.com" className="px-5 py-2.5 bg-peacock text-white font-ui font-semibold rounded-xl text-sm hover:bg-peacock/80 transition-colors">
                Get Your Team Listed
              </a>
            </div>
          ) : (
            <div className="space-y-14">
              {REGION_ORDER.filter(r => byRegion[r]?.length).map(region => {
                const meta = REGION_META[region] ?? { label: region, color: "text-white/60", bg: "bg-white/5", border: "border-white/10", emoji: "📍" };
                return (
                  <div key={region}>
                    <div className={`inline-flex items-center gap-2 ${meta.bg} border ${meta.border} rounded-full px-4 py-1.5 mb-5`}>
                      <span>{meta.emoji}</span>
                      <span className={`font-mono text-[10px] uppercase tracking-widest ${meta.color} font-bold`}>{meta.label}</span>
                      <span className={`font-mono text-[10px] ${meta.color} opacity-60`}>· {byRegion[region].length} team{byRegion[region].length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {byRegion[region].map(team => <TeamCard key={team.id} team={team} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Competition circuit */}
      <section className="py-16 border-t border-ink/8" style={{ background: "linear-gradient(160deg, #0d0010 0%, #1a0820 100%)" }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-marigold font-bold mb-2">The Circuit</p>
            <h2 className="font-display font-bold text-white text-3xl sm:text-4xl mb-3" style={{ letterSpacing: "-0.025em" }}>
              How the season works
            </h2>
            <p className="font-ui text-white/50 max-w-xl mx-auto text-sm">From first practice to championship stage — the collegiate raas calendar.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { phase: "01", title: "Practice Season", period: "Aug — Oct", desc: "Teams form rosters, craft mixes, and rehearse choreography through hundreds of hours." },
              { phase: "02", title: "Regional Qualifiers", period: "Nov — Dec", desc: "Compete locally for a berth at nationals. Rankings are set across five regional circuits." },
              { phase: "03", title: "Nationals",          period: "January",   desc: "Top teams from each region converge for the national championship, judged by industry experts." },
              { phase: "04", title: "Awards Season",      period: "Feb — Mar", desc: "Placements, individual awards, and hall-of-fame nods. Teams begin planning the next year." },
            ].map(({ phase, title, period, desc }) => (
              <div key={phase} className="bg-white/4 border border-white/8 rounded-2xl p-5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-marigold/60 mb-1">{period}</p>
                <p className="font-display font-black text-white/10 text-4xl leading-none mb-2" style={{ letterSpacing: "-0.04em" }}>{phase}</p>
                <p className="font-display font-bold text-white text-base mb-2" style={{ letterSpacing: "-0.02em" }}>{title}</p>
                <p className="font-ui text-white/40 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ivory py-16 border-t border-ink/8">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <span className="text-4xl block mb-4">🎓</span>
          <h2 className="font-display font-bold text-ink text-3xl mb-3" style={{ letterSpacing: "-0.025em" }}>Is your team ready for Rameelo?</h2>
          <p className="font-ui text-ink-muted mb-6 leading-relaxed">
            Get your collegiate raas team on the platform — your own page, donation support, roster showcase, and a place in the largest garba community in America.
          </p>
          <Link href="/collegiate/apply" className="inline-block px-7 py-3 bg-aubergine text-white font-display font-bold rounded-xl hover:bg-aubergine/80 transition-all">
            Apply to be listed →
          </Link>
        </div>
      </section>
    </>
  );
}

function TeamCard({ team, dark = false }: { team: Team; dark?: boolean }) {
  const wins = (team.achievements ?? []).filter((a) => a.placement === "1st" || a.placement === "Champion").length;
  const podiums = (team.achievements ?? []).length;

  if (dark) {
    return (
      <Link href={`/collegiate/${team.slug}`} className="group block rounded-2xl overflow-hidden border border-white/8 hover:border-marigold/30 transition-all">
        <div className="relative h-40 bg-gradient-to-br from-aubergine to-[#0d0010]">
          {team.cover_image_url && (
            <img src={team.cover_image_url} alt={team.team_name} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-65 transition-opacity" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          {team.is_featured && (
            <div className="absolute top-3 right-3 bg-marigold text-aubergine text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Featured</div>
          )}
          {team.is_verified && (
            <div className="absolute top-3 left-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
              <svg className="w-2.5 h-2.5 text-peacock" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Verified
            </div>
          )}
        </div>
        <div className="bg-white/4 p-4">
          <p className="font-display font-bold text-white text-base leading-tight mb-0.5 group-hover:text-marigold transition-colors" style={{ letterSpacing: "-0.02em" }}>
            {team.team_name}
          </p>
          <p className="font-ui text-white/40 text-xs mb-3">{team.university_name}</p>
          {team.tagline && <p className="font-ui text-white/30 text-xs leading-relaxed line-clamp-2 mb-3">{team.tagline}</p>}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {wins > 0 && <span className="font-mono text-[9px] text-marigold">🥇 {wins} win{wins !== 1 ? "s" : ""}</span>}
              {podiums > 0 && <span className="font-mono text-[9px] text-white/30">{podiums} podium{podiums !== 1 ? "s" : ""}</span>}
            </div>
            {team.donate_enabled && <span className="font-mono text-[9px] text-peacock/70">💙 Donate</span>}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/collegiate/${team.slug}`} className="group block rounded-2xl overflow-hidden border border-ink/8 hover:border-peacock/30 hover:shadow-lg transition-all bg-white">
      <div className="relative h-36 bg-gradient-to-br from-aubergine/20 to-peacock/20">
        {team.cover_image_url && (
          <img src={team.cover_image_url} alt={team.team_name} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {team.is_featured && (
          <div className="absolute top-2.5 right-2.5 bg-marigold text-aubergine text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Featured</div>
        )}
        {team.is_verified && (
          <div className="absolute top-2.5 left-2.5 bg-white/90 text-peacock text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            Verified
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="font-display font-bold text-ink text-sm leading-tight mb-0.5 group-hover:text-peacock transition-colors" style={{ letterSpacing: "-0.02em" }}>
          {team.team_name}
        </p>
        <p className="font-ui text-ink-muted text-xs mb-2">{team.university_name}{team.state ? ` · ${team.state}` : ""}</p>
        {team.tagline && <p className="font-ui text-ink-muted text-xs leading-relaxed line-clamp-2 mb-2">{team.tagline}</p>}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            {wins > 0 && <span className="font-mono text-[9px] text-marigold">🥇 {wins}W</span>}
            {podiums > wins && <span className="font-mono text-[9px] text-ink-muted">{podiums} podiums</span>}
          </div>
          {team.donate_enabled && <span className="font-mono text-[9px] text-peacock">Support ↗</span>}
        </div>
      </div>
    </Link>
  );
}
