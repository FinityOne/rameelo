import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbSchema, personSchema, ld } from "@/lib/jsonld";
import DonateSection from "./DonateSection";

// ── Types ─────────────────────────────────────────────────────────────────────

type Member = { name: string; role: string; year?: string; bio?: string; instagram?: string; major?: string; image_url?: string };
type Achievement  = { year: number; competition: string; placement: string; category?: string; notes?: string };
type Competition  = { name: string; date: string; location: string; url?: string };

type Team = {
  id: string; slug: string; team_name: string; university_name: string;
  tagline: string | null; bio: string | null; history: string | null;
  region: string; state: string; city: string; founded_year: number | null;
  coach_name: string | null; coach_bio: string | null; performance_style: string | null;
  cover_image_url: string | null; profile_image_url: string | null;
  university_url: string | null; website_url: string | null;
  instagram_url: string | null; youtube_url: string | null;
  tiktok_url: string | null; facebook_url: string | null;
  mix_url: string | null; mix_description: string | null;
  members: Member[]; achievements: Achievement[]; upcoming_competitions: Competition[];
  donate_enabled: boolean; donate_title: string | null; donate_description: string | null;
  donate_goal: number | null; is_verified: boolean; is_featured: boolean;
};

type Props = { params: Promise<{ slug: string }> };

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return m?.[1] ?? null;
}
function extractSoundCloudUrl(url: string) {
  return url.includes("soundcloud.com") ? url : null;
}

const REGION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Northeast: { bg: "bg-indigo-500/15", text: "text-indigo-300", border: "border-indigo-500/30" },
  Southeast: { bg: "bg-red-500/15",    text: "text-red-300",    border: "border-red-500/30" },
  South:     { bg: "bg-amber-500/15",  text: "text-amber-300",  border: "border-amber-500/30" },
  Midwest:   { bg: "bg-emerald-500/15",text: "text-emerald-300",border: "border-emerald-500/30" },
  Southwest: { bg: "bg-orange-500/15", text: "text-orange-300", border: "border-orange-500/30" },
  West:      { bg: "bg-cyan-500/15",   text: "text-cyan-300",   border: "border-cyan-500/30" },
};

const ROLE_ORDER: Record<string, number> = {
  "Captain": 0, "Vice Captain": 1, "Treasurer": 2,
  "Choreographer": 3, "Co-Choreographer": 4,
  "Coach": 5, "Faculty Advisor": 6,
  "Dancer": 7, "Alumni": 8,
};

const ROLE_BADGE: Record<string, { color: string; bg: string; icon: string }> = {
  "Captain":          { color: "text-marigold",    bg: "bg-marigold/15 border-marigold/30",      icon: "👑" },
  "Vice Captain":     { color: "text-orange-600",  bg: "bg-orange-100 border-orange-200",         icon: "⭐" },
  "Treasurer":        { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",         icon: "💰" },
  "Choreographer":    { color: "text-purple-700",  bg: "bg-purple-50 border-purple-200",           icon: "🎭" },
  "Co-Choreographer": { color: "text-pink-700",    bg: "bg-pink-50 border-pink-200",               icon: "🎨" },
  "Coach":            { color: "text-cyan-700",    bg: "bg-cyan-50 border-cyan-200",               icon: "🏋️" },
  "Faculty Advisor":  { color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-200",           icon: "📚" },
  "Dancer":           { color: "text-ink-muted",   bg: "bg-ink/5 border-ink/10",                   icon: "💃" },
  "Alumni":           { color: "text-ink-muted",   bg: "bg-ink/5 border-ink/8",                    icon: "🎓" },
};
const PLACEMENT_ICON: Record<string, string> = { "1st Place": "🥇", "2nd Place": "🥈", "3rd Place": "🥉", "Top 4": "🏅", "Top 8": "🏅" };

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("collegiate_teams")
    .select("team_name, university_name, tagline, bio, cover_image_url, region, state")
    .eq("slug", slug).eq("is_active", true).single();
  if (!data) return { title: "Team | Rameelo Collegiate" };
  const desc = data.bio?.slice(0, 160) ?? `${data.team_name} — collegiate raas garba team at ${data.university_name}, ${data.state}. Follow their journey on Rameelo.`;
  return {
    title: `${data.team_name} | ${data.university_name} — Rameelo Collegiate`,
    description: desc,
    keywords: [data.team_name, data.university_name, "collegiate raas garba", "raas garba team", data.region, data.state],
    alternates: { canonical: `https://www.rameelo.com/collegiate/${slug}` },
    openGraph: {
      title: `${data.team_name} — ${data.university_name}`,
      description: desc,
      type: "profile",
      url: `https://www.rameelo.com/collegiate/${slug}`,
      siteName: "Rameelo",
      images: data.cover_image_url
        ? [{ url: data.cover_image_url, width: 1200, height: 630, alt: data.team_name }]
        : [{ url: "https://www.rameelo.com/og-default.jpg", width: 1200, height: 630, alt: data.team_name }],
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CollegiateTeamPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const [{ data: raw }, { data: donationsRaw }] = await Promise.all([
    supabase.from("collegiate_teams").select("*").eq("slug", slug).eq("is_active", true).single(),
    supabase.from("team_donations").select("amount").eq("status", "confirmed"),
  ]);

  if (!raw) notFound();
  const team = raw as Team;

  // Compute total raised for this team
  const raised = (donationsRaw ?? [])
    .filter((d: { amount: number } & { team_id?: string }) => true) // we'll fix with proper filter below
    .reduce((s: number, d: { amount: number }) => s + Number(d.amount), 0);

  // Proper raised total per team
  const { data: teamDonations } = await supabase.from("team_donations")
    .select("amount").eq("team_id", team.id).eq("status", "confirmed");
  const totalRaised = (teamDonations ?? []).reduce((s, d) => s + Number(d.amount), 0);

  const achievements = (team.achievements ?? []) as Achievement[];
  const members      = (team.members ?? []) as Member[];
  const competitions = (team.upcoming_competitions ?? []) as Competition[];
  const regionStyle  = REGION_COLORS[team.region] ?? REGION_COLORS.West;

  // Sort: captains first
  const sortedMembers = [...members].sort((a, b) =>
    (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)
  );
  const sortedAchievements = [...achievements].sort((a, b) => b.year - a.year);

  const ytId = team.mix_url ? extractYouTubeId(team.mix_url) : null;
  const scUrl = team.mix_url ? extractSoundCloudUrl(team.mix_url) : null;

  const wins = achievements.filter(a => a.placement === "1st Place").length;
  const podiums = achievements.filter(a => ["1st Place","2nd Place","3rd Place"].includes(a.placement)).length;

  const socials = [
    team.instagram_url && { label: "Instagram", url: team.instagram_url, icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
    team.youtube_url  && { label: "YouTube",   url: team.youtube_url,   icon: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
    team.tiktok_url   && { label: "TikTok",    url: team.tiktok_url,    icon: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" },
    team.facebook_url && { label: "Facebook",  url: team.facebook_url,  icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
  ].filter(Boolean) as { label: string; url: string; icon: string }[];

  const crumbs = breadcrumbSchema([
    { name: "Home", url: "https://www.rameelo.com" },
    { name: "Collegiate", url: "https://www.rameelo.com/collegiate" },
    { name: team.team_name, url: `https://www.rameelo.com/collegiate/${slug}` },
  ]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F2" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbs) }} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: team.cover_image_url ? undefined : "linear-gradient(135deg,#0d0620 0%,#1e0a30 35%,#2E1B30 60%,#4a0e20 100%)" }}>
        {team.cover_image_url && (
          <>
            <img src={team.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(13,6,32,0.7) 0%, rgba(13,6,32,0.85) 100%)" }} />
          </>
        )}
        {/* Decorative circles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[320,480,640].map((s, i) => (
            <div key={i} className="absolute rounded-full border border-white/4" style={{ width: s, height: s, right: -s/4, top: "50%", transform: "translateY(-50%)" }} />
          ))}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-15 blur-3xl" style={{ background: "#F5A623" }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          {/* Breadcrumb */}
          <Link href="/collegiate" className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-white/35 hover:text-white/60 transition-colors mb-8">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            All Teams
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end gap-8">
            {/* Team photo */}
            <div className="shrink-0">
              {team.profile_image_url ? (
                <img
                  src={team.profile_image_url}
                  alt={team.team_name}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover border-4 border-white/20 shadow-2xl"
                />
              ) : (
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl border-4 border-marigold/30 flex items-center justify-center shadow-2xl"
                  style={{ background: "linear-gradient(135deg,#F5A623 0%,#7C1F2C 100%)" }}>
                  <span className="text-5xl font-display font-bold text-white">{team.team_name[0]}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-mono font-bold uppercase tracking-widest ${regionStyle.bg} ${regionStyle.text} ${regionStyle.border}`}>
                  {team.region}
                </span>
                {team.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-peacock/20 border border-peacock/30 text-[9px] font-mono font-bold uppercase tracking-widest text-peacock">
                    ✓ Verified
                  </span>
                )}
                {team.is_featured && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-marigold/20 border border-marigold/30 text-[9px] font-mono font-bold uppercase tracking-widest text-marigold">
                    ⭐ Featured
                  </span>
                )}
              </div>

              <h1 className="font-display font-bold text-white leading-none mb-1" style={{ fontSize: "clamp(28px,5vw,54px)", letterSpacing: "-0.03em" }}>
                {team.team_name}
              </h1>
              <p className="font-ui text-white/60 text-lg mb-1">{team.university_name}</p>
              <p className="font-mono text-[11px] text-white/30 uppercase tracking-widest">{team.city}, {team.state}</p>
              {team.tagline && (
                <p className="font-ui italic text-white/50 text-base mt-3 max-w-xl">&ldquo;{team.tagline}&rdquo;</p>
              )}

              {/* Social row */}
              {socials.length > 0 && (
                <div className="flex items-center gap-3 mt-4">
                  {socials.map(s => (
                    <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors" title={s.label}>
                      <svg className="w-3.5 h-3.5 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d={s.icon} /></svg>
                    </a>
                  ))}
                  {team.university_url && (
                    <a href={team.university_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 transition-colors font-mono text-[9px] uppercase tracking-widest text-white/60">
                      🎓 University
                    </a>
                  )}
                  {team.website_url && (
                    <a href={team.website_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 transition-colors font-mono text-[9px] uppercase tracking-widest text-white/60">
                      🌐 Website
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Quick stats */}
            <div className="flex gap-5 sm:gap-8 shrink-0">
              {[
                { val: team.founded_year ? `'${String(team.founded_year).slice(-2)}` : "—", label: "Est." },
                { val: members.length || "—", label: "Members" },
                { val: wins || "—", label: wins === 1 ? "Win" : "Wins" },
                { val: podiums || "—", label: "Podiums" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="font-display font-bold text-white leading-none" style={{ fontSize: 28, letterSpacing: "-0.03em" }}>{s.val}</p>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-white/25 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">

          {/* ── LEFT ──────────────────────────────────────────────── */}
          <div className="space-y-10">

            {/* About */}
            {(team.bio || team.history) && (
              <section>
                <h2 className="font-display font-bold text-ink text-xl mb-4" style={{ letterSpacing: "-0.02em" }}>About the Team</h2>
                {team.bio && <p className="font-ui text-ink-muted leading-relaxed mb-3">{team.bio}</p>}
                {team.history && <p className="font-ui text-ink-muted leading-relaxed text-sm">{team.history}</p>}
                {(team.performance_style || team.coach_name) && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {team.performance_style && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-marigold/10 border border-marigold/20 font-mono text-[10px] font-bold uppercase tracking-widest text-marigold-dark">
                        🎭 {team.performance_style}
                      </span>
                    )}
                    {team.coach_name && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-aubergine/8 border border-aubergine/15 font-mono text-[10px] uppercase tracking-widest text-aubergine">
                        👤 Coach: {team.coach_name}
                      </span>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Trophy Case */}
            {sortedAchievements.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Trophy Case</h2>
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-marigold/15 text-marigold-dark font-bold">{achievements.length} achievements</span>
                </div>
                <div className="space-y-2.5">
                  {sortedAchievements.map((a, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-ivory-200 hover:border-marigold/25 transition-colors">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl"
                        style={{ background: a.placement === "1st Place" ? "linear-gradient(135deg,#FFD700,#F5A623)" : a.placement === "2nd Place" ? "linear-gradient(135deg,#C0C0C0,#a0a0a0)" : "linear-gradient(135deg,#CD7F32,#a05f20)" }}>
                        {PLACEMENT_ICON[a.placement] ?? "🏅"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-ink text-sm">{a.competition}</p>
                        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">
                          {a.placement}{a.category ? ` · ${a.category}` : ""}
                        </p>
                        {a.notes && <p className="font-ui text-xs text-ink-muted mt-0.5">{a.notes}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-display font-bold text-marigold text-lg">{a.year}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* The Mix */}
            {team.mix_url && (ytId || scUrl) && (
              <section>
                <h2 className="font-display font-bold text-ink text-xl mb-2" style={{ letterSpacing: "-0.02em" }}>The Mix</h2>
                {team.mix_description && (
                  <p className="font-ui text-sm text-ink-muted mb-4">{team.mix_description}</p>
                )}
                {ytId && (
                  <div className="rounded-2xl overflow-hidden border border-ivory-200 shadow-sm" style={{ aspectRatio: "16/9" }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      title={`${team.team_name} Competition Mix`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                )}
                {scUrl && !ytId && (
                  <div className="rounded-2xl overflow-hidden border border-ivory-200" style={{ height: 166 }}>
                    <iframe
                      src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(scUrl)}&color=%23F5A623&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`}
                      className="w-full h-full"
                      title="Competition Mix"
                    />
                  </div>
                )}
              </section>
            )}

            {/* Team Roster */}
            {sortedMembers.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Team Roster</h2>
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-aubergine/8 text-aubergine font-bold">{members.length} members</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {sortedMembers.map((m, i) => {
                    const badge = ROLE_BADGE[m.role] ?? ROLE_BADGE["Dancer"];
                    const isLeadership = !["Dancer", "Alumni"].includes(m.role);
                    return (
                      <div key={i} className={`p-4 rounded-2xl border text-center transition-shadow hover:shadow-sm ${
                        isLeadership ? "border-ink/12 bg-white shadow-sm" : "border-ivory-200 bg-white"
                      }`}>
                        {m.image_url ? (
                          <img src={m.image_url} alt={m.name} className="w-14 h-14 rounded-full object-cover mx-auto mb-2.5 border-2 border-ivory-200" />
                        ) : (
                          <div className="w-14 h-14 rounded-full mx-auto mb-2.5 flex items-center justify-center font-bold text-white text-lg"
                            style={{ background: isLeadership ? "linear-gradient(135deg,#C9A84C,#e8c46a)" : "linear-gradient(135deg,#2E1B30,#4a2d4f)" }}>
                            {m.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <p className="font-display font-bold text-ink text-xs leading-snug mb-1.5">{m.name}</p>
                        {/* Role badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono border ${badge.bg} ${badge.color}`}>
                          {badge.icon} {m.role}
                        </span>
                        {m.year && <p className="font-mono text-[8px] text-ink-muted/60 mt-1.5">{m.year}</p>}
                        {m.bio  && <p className="font-ui text-[10px] text-ink-muted/70 mt-1 leading-relaxed line-clamp-2">{m.bio}</p>}
                        {m.instagram && (
                          <a href={m.instagram} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 font-mono text-[8px] text-peacock/60 hover:text-peacock mt-1 transition-colors">
                            IG ↗
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Upcoming Competitions */}
            {competitions.length > 0 && (
              <section>
                <h2 className="font-display font-bold text-ink text-xl mb-4" style={{ letterSpacing: "-0.02em" }}>Upcoming Competitions</h2>
                <div className="space-y-2.5">
                  {competitions.map((c, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-ivory-200">
                      <div className="w-10 h-10 rounded-xl bg-aubergine/8 flex items-center justify-center shrink-0">
                        <span className="text-lg">🏟️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-ink text-sm">{c.name}</p>
                        <p className="font-mono text-[10px] text-ink-muted">{c.location} · {c.date}</p>
                      </div>
                      {c.url && (
                        <a href={c.url} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-aubergine text-white font-ui text-xs font-semibold hover:bg-aubergine/80 transition-colors">
                          Details →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ─────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Donation Widget */}
            {team.donate_enabled && (
              <div className="sticky top-24">
                <DonateSection
                  teamId={team.id}
                  teamName={team.team_name}
                  donateTitle={team.donate_title ?? ""}
                  donateDescription={team.donate_description ?? ""}
                  goal={team.donate_goal}
                  raised={totalRaised}
                />
              </div>
            )}

            {/* Quick Info Card */}
            <div className="rounded-2xl bg-white border border-ivory-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-ivory-200 bg-ivory">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted font-bold">Team Info</p>
              </div>
              <div className="divide-y divide-ivory-200">
                {[
                  { label: "University",    val: team.university_name },
                  { label: "Location",      val: `${team.city}, ${team.state}` },
                  { label: "Region",        val: team.region },
                  { label: "Founded",       val: team.founded_year ? String(team.founded_year) : null },
                  { label: "Style",         val: team.performance_style },
                  { label: "Coach",         val: team.coach_name },
                ].filter(r => r.val).map(r => (
                  <div key={r.label} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{r.label}</span>
                    <span className="font-ui text-xs font-semibold text-ink text-right">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Back to collegiate */}
            <Link href="/collegiate"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-aubergine/20 hover:border-aubergine/40 font-ui text-sm font-semibold text-aubergine/60 hover:text-aubergine transition-all">
              ← All Collegiate Teams
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
