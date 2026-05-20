"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { updateTeam } from "@/lib/actions/collegiate-applications";
import ImageUpload from "./ImageUpload";

// ─── Constants ────────────────────────────────────────────────────────────────

const REGIONS = ["Northeast", "Southeast", "Midwest", "Southwest", "West"];

export const MEMBER_ROLES = [
  "Captain",
  "Vice Captain",
  "Treasurer",
  "Choreographer",
  "Co-Choreographer",
  "Dancer",
  "Alumni",
  "Coach",
  "Faculty Advisor",
] as const;
type MemberRole = (typeof MEMBER_ROLES)[number];

const ROLE_BADGE: Record<MemberRole, { label: string; color: string; bg: string; icon: string }> = {
  "Captain":           { label: "Captain",         color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",     icon: "👑" },
  "Vice Captain":      { label: "Vice Captain",    color: "text-orange-700",  bg: "bg-orange-50 border-orange-200",   icon: "⭐" },
  "Treasurer":         { label: "Treasurer",       color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: "💰" },
  "Choreographer":     { label: "Choreographer",   color: "text-purple-700",  bg: "bg-purple-50 border-purple-200",   icon: "🎭" },
  "Co-Choreographer":  { label: "Co-Choreo",       color: "text-pink-700",    bg: "bg-pink-50 border-pink-200",       icon: "🎨" },
  "Dancer":            { label: "Dancer",          color: "text-ink/50",      bg: "bg-ink/4 border-ink/10",           icon: "💃" },
  "Alumni":            { label: "Alumni",          color: "text-ink/40",      bg: "bg-ink/3 border-ink/8",            icon: "🎓" },
  "Coach":             { label: "Coach",           color: "text-cyan-700",    bg: "bg-cyan-50 border-cyan-200",       icon: "🏋️" },
  "Faculty Advisor":   { label: "Faculty Advisor", color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-200",   icon: "📚" },
};

const PLACEMENTS = ["1st", "2nd", "3rd", "4th", "5th", "Semi-finalist", "Quarterfinalist", "Finalist", "Champion", "Best Costume", "Best Mix"];

// ─── Types ────────────────────────────────────────────────────────────────────

type Member = { name: string; role: MemberRole; year: string; bio: string; instagram: string; image_url: string };
type Achievement = { placement: string; competition: string; year: number; location: string; notes: string };
type Competition = { name: string; date: string; location: string; url: string };

// ─── Nav sections ─────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  { id: "identity",     label: "Identity",      icon: "🏫", desc: "Name, university, region" },
  { id: "story",        label: "Story & Style", icon: "✍️",  desc: "Bio, history, coach, style" },
  { id: "media",        label: "Media & Links", icon: "🎬", desc: "Photos, mix, social handles" },
  { id: "roster",       label: "Team Roster",   icon: "👥", desc: "Members and their roles" },
  { id: "trophies",     label: "Trophy Case",   icon: "🏆", desc: "Placements and awards" },
  { id: "competitions", label: "Competitions",  icon: "📅", desc: "Upcoming schedule" },
  { id: "donations",    label: "Donations",     icon: "💙", desc: "Fan support widget" },
  { id: "publish",      label: "Publish",       icon: "🚀", desc: "Status, featured, verified" },
] as const;
type SectionId = (typeof NAV_SECTIONS)[number]["id"];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ─── Component ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function CollegiateTeamForm({ mode, team }: { mode: "create" | "edit"; team?: Record<string, any> }) {
  const router = useRouter();
  const [active, setActive]           = useState<SectionId>("identity");
  const [saving, setSaving]           = useState(false);
  const [isPending, startTransition]  = useTransition();
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState("");

  // ── Identity ──
  const [teamName, setTeamName]       = useState(team?.team_name ?? "");
  const [university, setUniversity]   = useState(team?.university_name ?? "");
  const [slug, setSlug]               = useState(team?.slug ?? "");
  const [tagline, setTagline]         = useState(team?.tagline ?? "");
  const [region, setRegion]           = useState(team?.region ?? "Northeast");
  const [state, setState]             = useState(team?.state ?? "");
  const [city, setCity]               = useState(team?.city ?? "");
  const [foundedYear, setFoundedYear] = useState(team?.founded_year ? String(team.founded_year) : "");

  // ── Story ──
  const [bio, setBio]             = useState(team?.bio ?? "");
  const [history, setHistory]     = useState(team?.history ?? "");
  const [perfStyle, setPerfStyle] = useState(team?.performance_style ?? "");
  const [coachName, setCoachName] = useState(team?.coach_name ?? "");
  const [coachBio, setCoachBio]   = useState(team?.coach_bio ?? "");

  // ── Media ──
  const [coverUrl, setCoverUrl]         = useState(team?.cover_image_url ?? "");
  const [profileUrl, setProfileUrl]     = useState(team?.profile_image_url ?? "");
  const [mixUrl, setMixUrl]             = useState(team?.mix_url ?? "");
  const [mixDesc, setMixDesc]           = useState(team?.mix_description ?? "");
  const [uniUrl, setUniUrl]             = useState(team?.university_url ?? "");
  const [websiteUrl, setWebsiteUrl]     = useState(team?.website_url ?? "");
  const [instagramUrl, setInstagramUrl] = useState(team?.instagram_url ?? "");
  const [youtubeUrl, setYoutubeUrl]     = useState(team?.youtube_url ?? "");
  const [tiktokUrl, setTiktokUrl]       = useState(team?.tiktok_url ?? "");
  const [facebookUrl, setFacebookUrl]   = useState(team?.facebook_url ?? "");

  // ── Roster ──
  const [members, setMembers] = useState<Member[]>(() => {
    const raw = team?.members ?? [];
    return raw.length > 0
      ? (raw as Member[]).map(m => ({ bio: m.bio ?? "", instagram: m.instagram ?? "", name: m.name, role: m.role, year: m.year ?? "", image_url: m.image_url ?? "" }))
      : [];
  });

  // ── Trophies ──
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const raw = team?.achievements ?? [];
    return raw.length > 0 ? (raw as Achievement[]) : [];
  });

  // ── Competitions ──
  const [competitions, setCompetitions] = useState<Competition[]>(() => {
    const raw = team?.upcoming_competitions ?? [];
    return raw.length > 0 ? (raw as Competition[]) : [];
  });

  // ── Donations ──
  const [donateEnabled, setDonateEnabled] = useState(team?.donate_enabled ?? false);
  const [donateTitle, setDonateTitle]     = useState(team?.donate_title ?? "");
  const [donateDesc, setDonateDesc]       = useState(team?.donate_description ?? "");
  const [donateGoal, setDonateGoal]       = useState(team?.donate_goal ? String(team.donate_goal) : "");

  // ── Publish ──
  const [isActive, setIsActive]     = useState(team?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(team?.is_featured ?? false);
  const [isVerified, setIsVerified] = useState(team?.is_verified ?? false);

  // ─── Roster helpers ───────────────────────────────────────────────────────

  const ROLE_SORT_ORDER: MemberRole[] = [
    "Captain", "Vice Captain", "Treasurer", "Choreographer", "Co-Choreographer",
    "Coach", "Faculty Advisor", "Dancer", "Alumni",
  ];

  function addMember() { setMembers(p => [...p, { name: "", role: "Dancer", year: "", bio: "", instagram: "", image_url: "" }]); }
  function removeMember(i: number) { setMembers(p => p.filter((_, j) => j !== i)); }
  function updateMember<K extends keyof Member>(i: number, key: K, value: Member[K]) {
    setMembers(p => p.map((m, j) => j === i ? { ...m, [key]: value } : m));
  }

  // ─── Payload ──────────────────────────────────────────────────────────────

  function buildPayload() {
    return {
      slug: slug.trim(), team_name: teamName.trim(), university_name: university.trim(),
      tagline: tagline.trim() || null, region,
      state: state.trim() || null, city: city.trim() || null,
      founded_year: foundedYear ? parseInt(foundedYear) : null,
      bio: bio.trim() || null, history: history.trim() || null,
      performance_style: perfStyle.trim() || null,
      coach_name: coachName.trim() || null, coach_bio: coachBio.trim() || null,
      cover_image_url: coverUrl.trim() || null, profile_image_url: profileUrl.trim() || null,
      mix_url: mixUrl.trim() || null, mix_description: mixDesc.trim() || null,
      university_url: uniUrl.trim() || null, website_url: websiteUrl.trim() || null,
      instagram_url: instagramUrl.trim() || null, youtube_url: youtubeUrl.trim() || null,
      tiktok_url: tiktokUrl.trim() || null, facebook_url: facebookUrl.trim() || null,
      members: members.filter(m => m.name.trim()),
      achievements: achievements.filter(a => a.competition.trim()),
      upcoming_competitions: competitions.filter(c => c.name.trim()),
      donate_enabled: donateEnabled,
      donate_title: donateTitle.trim() || null, donate_description: donateDesc.trim() || null,
      donate_goal: donateGoal ? parseFloat(donateGoal) : null,
      is_active: isActive, is_featured: isFeatured, is_verified: isVerified,
    };
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!teamName.trim() || !university.trim() || !slug.trim()) {
      setError("Team name, university, and slug are required.");
      setActive("identity");
      return;
    }
    setError("");
    if (mode === "create") {
      setSaving(true);
      const supabase = createClient();
      const { error: dbErr } = await supabase.from("collegiate_teams").insert(buildPayload());
      setSaving(false);
      if (dbErr) { setError(dbErr.message); return; }
      router.push("/admin/collegiate");
    } else {
      startTransition(async () => {
        const res = await updateTeam(team!.id, buildPayload());
        if (res.error) { setError(res.error); return; }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      });
    }
  }

  const isBusy = saving || isPending;
  const currentSection = NAV_SECTIONS.find(s => s.id === active)!;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-[calc(100vh-140px)] bg-[#f7f5f2]">

      {/* ── Left sidebar ──────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 bg-white border-r border-ink/8 flex flex-col shadow-sm">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-ink/8">
          <div className="flex items-center gap-1.5 mb-2">
            <Link href="/admin/collegiate"
              className="font-mono text-[9px] uppercase tracking-widest text-ink/30 hover:text-ink/60 transition-colors">
              Collegiate
            </Link>
            <span className="text-ink/20 text-xs">›</span>
          </div>
          {mode === "create" ? (
            <p className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.02em" }}>New Team</p>
          ) : (
            <>
              <p className="font-display font-bold text-ink text-base leading-snug" style={{ letterSpacing: "-0.02em" }}>
                {team?.team_name || "Edit Team"}
              </p>
              {team?.slug && (
                <Link href={`/collegiate/${team.slug}`} target="_blank"
                  className="inline-flex items-center gap-1 font-mono text-[9px] text-ink/30 hover:text-aubergine transition-colors mt-1">
                  View live
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              )}
            </>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV_SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                active === s.id
                  ? "bg-aubergine/8 border border-aubergine/15"
                  : "border border-transparent hover:bg-ink/4"
              }`}
            >
              <span className="text-base leading-none shrink-0">{s.icon}</span>
              <div className="min-w-0">
                <p className={`font-ui font-semibold text-sm leading-none transition-colors ${
                  active === s.id ? "text-aubergine" : "text-ink/60 group-hover:text-ink"
                }`}>
                  {s.label}
                </p>
                <p className="font-mono text-[8px] text-ink/30 mt-0.5 leading-none">{s.desc}</p>
              </div>
            </button>
          ))}
        </nav>

        {/* Save */}
        <div className="px-4 py-4 border-t border-ink/8">
          <button
            onClick={handleSave}
            disabled={isBusy}
            className={`w-full py-2.5 rounded-xl font-display font-bold text-sm shadow-sm transition-all disabled:opacity-50 ${
              saved
                ? "bg-emerald-600 text-white"
                : "bg-aubergine text-white hover:bg-aubergine/85"
            }`}
          >
            {isBusy ? "Saving…" : saved ? "✓ Saved" : mode === "create" ? "Create Team" : "Save Changes"}
          </button>
          {error && (
            <p className="font-ui text-[11px] text-red-600 mt-2 text-center leading-relaxed">{error}</p>
          )}
        </div>
      </aside>

      {/* ── Main panel ────────────────────────────────────────────────── */}
      <main className="flex-1 px-10 py-8 pb-16 min-w-0 overflow-y-auto">

        {/* Section heading */}
        <div className="mb-7">
          <h2 className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.025em" }}>
            {currentSection.icon} {currentSection.label}
          </h2>
          <p className="font-ui text-ink/40 text-sm mt-1">{currentSection.desc}</p>
          <div className="mt-4 h-px bg-ink/8" />
        </div>

        {/* ── Identity ── */}
        {active === "identity" && (
          <div className="space-y-5 max-w-xl">
            <F label="Team Name" required>
              <input
                value={teamName}
                onChange={e => { setTeamName(e.target.value); if (mode === "create" && !slug) setSlug(slugify(e.target.value)); }}
                placeholder="e.g. Chakkar"
                className={inp}
              />
            </F>

            <F label="URL Slug" required hint="Appears in the URL: rameelo.com/collegiate/[slug]">
              <div className="flex items-center bg-white border border-ink/12 rounded-xl overflow-hidden focus-within:border-aubergine/50 transition-colors shadow-sm">
                <span className="px-3 font-mono text-[11px] text-ink/30 border-r border-ink/10 py-2.5 bg-ink/3 shrink-0 select-none">
                  /collegiate/
                </span>
                <input
                  value={slug}
                  onChange={e => setSlug(slugify(e.target.value))}
                  placeholder="chakkar-usc"
                  className="flex-1 bg-transparent px-3 py-2.5 text-ink placeholder-ink/30 font-ui text-sm focus:outline-none"
                />
              </div>
            </F>

            <F label="University" required>
              <input value={university} onChange={e => setUniversity(e.target.value)}
                placeholder="University of Southern California" className={inp} />
            </F>

            <F label="Tagline" hint="One punchy line shown on the team card">
              <input value={tagline} onChange={e => setTagline(e.target.value)}
                placeholder="Where tradition meets the future" className={inp} />
            </F>

            <div className="grid grid-cols-2 gap-4">
              <F label="Region" required>
                <select value={region} onChange={e => setRegion(e.target.value)} className={inp}>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </F>
              <F label="Year Founded">
                <input type="number" value={foundedYear} onChange={e => setFoundedYear(e.target.value)}
                  placeholder="2012" className={inp} />
              </F>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <F label="City">
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="Los Angeles" className={inp} />
              </F>
              <F label="State">
                <input value={state} onChange={e => setState(e.target.value)} placeholder="CA" className={inp} />
              </F>
            </div>
          </div>
        )}

        {/* ── Story & Style ── */}
        {active === "story" && (
          <div className="space-y-5 max-w-xl">
            <F label="Team Bio" hint="Main description displayed on the public team page">
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={6}
                placeholder="Tell the world what makes this team special — your culture, values, and what drives you to compete..."
                className={ta} />
            </F>
            <F label="History" hint="Longer legacy section — founding story, major milestones">
              <textarea value={history} onChange={e => setHistory(e.target.value)} rows={4}
                placeholder="Founded in 2012 by a group of students who wanted to keep their Gujarati roots alive..."
                className={ta} />
            </F>
            <F label="Performance Style" hint="Comma-separated style tags shown on the team page">
              <input value={perfStyle} onChange={e => setPerfStyle(e.target.value)}
                placeholder="Traditional, Contemporary Fusion, High-Energy" className={inp} />
            </F>

            <div className="pt-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-ink/8" />
                <span className="font-mono text-[9px] uppercase tracking-widest text-ink/30">Coach / Advisor</span>
                <div className="h-px flex-1 bg-ink/8" />
              </div>
              <div className="space-y-4">
                <F label="Coach Name">
                  <input value={coachName} onChange={e => setCoachName(e.target.value)}
                    placeholder="Coach Meera Shah" className={inp} />
                </F>
                <F label="Coach Bio" hint="Brief background shown on the team page">
                  <textarea value={coachBio} onChange={e => setCoachBio(e.target.value)} rows={3}
                    placeholder="Former competitor and 3× national champion coach..."
                    className={ta} />
                </F>
              </div>
            </div>
          </div>
        )}

        {/* ── Media & Links ── */}
        {active === "media" && (
          <div className="space-y-4 max-w-xl">
            <SCard title="Cover Photo" desc="Wide banner for the hero section (recommended: 1400×500 px)">
              <ImageUpload
                value={coverUrl}
                onChange={setCoverUrl}
                label="Cover photo"
                hint="This appears as the full-width hero banner on the team's public page"
                shape="banner"
              />
            </SCard>

            <SCard title="Team Photo" desc="Square portrait — shown alongside the bio and team info">
              <ImageUpload
                value={profileUrl}
                onChange={setProfileUrl}
                label="Team photo"
                hint="Best as a square crop. Shown next to the team bio."
                shape="square"
              />
            </SCard>

            <SCard title="Performance Mix" desc="YouTube, SoundCloud, or Spotify link to the competition mix">
              <F label="Mix URL">
                <input value={mixUrl} onChange={e => setMixUrl(e.target.value)} placeholder="https://youtu.be/..." className={inp} />
              </F>
              <F label="Mix Label" hint="e.g. 2024–25 Competition Mix">
                <input value={mixDesc} onChange={e => setMixDesc(e.target.value)} placeholder="2024–25 Competition Mix" className={inp} />
              </F>
            </SCard>

            <SCard title="Social & Web">
              {[
                { label: "University Website", val: uniUrl,        set: setUniUrl,        ph: "https://usc.edu/..." },
                { label: "Team Website",       val: websiteUrl,    set: setWebsiteUrl,    ph: "https://yourteam.com" },
                { label: "Instagram",          val: instagramUrl,  set: setInstagramUrl,  ph: "https://instagram.com/yourteam" },
                { label: "YouTube",            val: youtubeUrl,    set: setYoutubeUrl,    ph: "https://youtube.com/@yourteam" },
                { label: "TikTok",             val: tiktokUrl,     set: setTiktokUrl,     ph: "https://tiktok.com/@yourteam" },
                { label: "Facebook",           val: facebookUrl,   set: setFacebookUrl,   ph: "https://facebook.com/yourteam" },
              ].map(({ label, val, set, ph }) => (
                <F key={label} label={label}>
                  <input value={val} onChange={e => set(e.target.value)} placeholder={ph} className={inp} />
                </F>
              ))}
            </SCard>
          </div>
        )}

        {/* ── Roster ── */}
        {active === "roster" && (
          <div className="max-w-2xl">
            {/* Role legend */}
            <div className="flex flex-wrap gap-1.5 mb-5 px-4 py-3 bg-white border border-ink/8 rounded-xl shadow-sm">
              {MEMBER_ROLES.slice(0, 5).map(role => {
                const meta = ROLE_BADGE[role];
                return (
                  <span key={role} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${meta.bg} ${meta.color}`}>
                    {meta.icon} {meta.label}
                  </span>
                );
              })}
              <span className="font-mono text-[9px] text-ink/30 self-center ml-1">→ highlighted on public page</span>
            </div>

            {members.length === 0 ? (
              <div className="text-center py-14 border-2 border-dashed border-ink/12 rounded-2xl bg-white">
                <p className="text-4xl mb-3">👥</p>
                <p className="font-ui font-medium text-ink/50 text-sm mb-1">No members added yet</p>
                <p className="font-mono text-[9px] text-ink/30 mb-5">Add captains, choreographers, and dancers</p>
                <button onClick={addMember} className={addBtn}>+ Add First Member</button>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {[...members]
                  .map((m, originalIndex) => ({ m, originalIndex }))
                  .sort((a, b) => ROLE_SORT_ORDER.indexOf(a.m.role) - ROLE_SORT_ORDER.indexOf(b.m.role))
                  .map(({ m, originalIndex: i }) => {
                    const meta = ROLE_BADGE[m.role];
                    const isLeadership = !["Dancer", "Alumni"].includes(m.role);
                    return (
                      <div key={i} className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-shadow hover:shadow-md ${
                        isLeadership ? "border-ink/12" : "border-ink/8"
                      }`}>
                        {/* Role accent stripe */}
                        {isLeadership && <div className={`h-0.5 w-full ${meta.bg.split(" ")[0].replace("bg-", "bg-").replace("/", "/").replace("50", "300")}`} />}

                        {/* Header row */}
                        <div className="flex items-center gap-3 px-4 py-3">
                          <div className="shrink-0">
                            <ImageUpload
                              shape="avatar"
                              value={m.image_url}
                              onChange={url => updateMember(i, "image_url", url)}
                              label="Photo"
                            />
                          </div>
                          <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                            <input
                              value={m.name}
                              onChange={e => updateMember(i, "name", e.target.value)}
                              placeholder="Full name"
                              className={`${sm} font-semibold`}
                            />
                            <select
                              value={m.role}
                              onChange={e => updateMember(i, "role", e.target.value as MemberRole)}
                              className={`${sm} ${meta.color} font-medium`}
                            >
                              {MEMBER_ROLES.map(r => (
                                <option key={r} value={r}>{ROLE_BADGE[r].icon} {r}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={() => removeMember(i)}
                            className="text-ink/20 hover:text-red-500 transition-colors shrink-0 p-1 rounded-lg hover:bg-red-50"
                            title="Remove member"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Secondary fields */}
                        <div className="px-4 pb-3.5 pt-2.5 grid grid-cols-2 gap-2 border-t border-ink/6">
                          <input value={m.year} onChange={e => updateMember(i, "year", e.target.value)}
                            placeholder="Year (e.g. Junior)" className={sm} />
                          <input value={m.instagram} onChange={e => updateMember(i, "instagram", e.target.value)}
                            placeholder="Instagram handle (optional)" className={sm} />
                          <input value={m.bio} onChange={e => updateMember(i, "bio", e.target.value)}
                            placeholder="Short bio (optional)" className={`${sm} col-span-2`} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            <button onClick={addMember} className={addBtn}>+ Add Member</button>
            {members.length > 0 && (
              <p className="font-mono text-[9px] text-ink/30 text-center mt-3">
                {members.length} member{members.length !== 1 ? "s" : ""} · leadership roles automatically appear first on the public page
              </p>
            )}
          </div>
        )}

        {/* ── Trophies ── */}
        {active === "trophies" && (
          <div className="max-w-xl">
            {achievements.length === 0 ? (
              <div className="text-center py-14 border-2 border-dashed border-ink/12 rounded-2xl bg-white mb-4">
                <p className="text-4xl mb-3">🏆</p>
                <p className="font-ui font-medium text-ink/50 text-sm mb-1">No achievements added yet</p>
                <p className="font-mono text-[9px] text-ink/30 mb-5">Document placements, awards, and recognition</p>
                <button onClick={() => setAchievements([{ placement: "1st", competition: "", year: new Date().getFullYear(), location: "", notes: "" }])}
                  className={addBtn}>+ Add First Achievement</button>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {achievements.map((a, i) => (
                  <div key={i} className="bg-white border border-ink/10 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-ink/2 border-b border-ink/8">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-ink/35 font-semibold">
                        Achievement {i + 1}
                      </span>
                      <button onClick={() => setAchievements(achievements.filter((_, j) => j !== i))}
                        className="font-ui text-xs text-ink/30 hover:text-red-500 transition-colors">
                        Remove
                      </button>
                    </div>
                    <div className="p-4 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <select value={a.placement} onChange={e => setAchievements(achievements.map((x, j) => j === i ? { ...x, placement: e.target.value } : x))}
                          className={sm}>
                          {PLACEMENTS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input type="number" value={a.year}
                          onChange={e => setAchievements(achievements.map((x, j) => j === i ? { ...x, year: parseInt(e.target.value) || new Date().getFullYear() } : x))}
                          placeholder="Year" className={sm} />
                      </div>
                      <input value={a.competition}
                        onChange={e => setAchievements(achievements.map((x, j) => j === i ? { ...x, competition: e.target.value } : x))}
                        placeholder="Competition name (e.g. NCRC Nationals)" className={sm} />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={a.location}
                          onChange={e => setAchievements(achievements.map((x, j) => j === i ? { ...x, location: e.target.value } : x))}
                          placeholder="Location (optional)" className={sm} />
                        <input value={a.notes}
                          onChange={e => setAchievements(achievements.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))}
                          placeholder="Notes (optional)" className={sm} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {achievements.length > 0 && (
              <button onClick={() => setAchievements([...achievements, { placement: "1st", competition: "", year: new Date().getFullYear(), location: "", notes: "" }])}
                className={addBtn}>+ Add Achievement</button>
            )}
          </div>
        )}

        {/* ── Competitions ── */}
        {active === "competitions" && (
          <div className="max-w-xl">
            {competitions.length === 0 ? (
              <div className="text-center py-14 border-2 border-dashed border-ink/12 rounded-2xl bg-white mb-4">
                <p className="text-4xl mb-3">📅</p>
                <p className="font-ui font-medium text-ink/50 text-sm mb-1">No upcoming competitions</p>
                <p className="font-mono text-[9px] text-ink/30 mb-5">Keep fans updated on where you&apos;re competing next</p>
                <button onClick={() => setCompetitions([{ name: "", date: "", location: "", url: "" }])}
                  className={addBtn}>+ Add Competition</button>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {competitions.map((c, i) => (
                  <div key={i} className="bg-white border border-ink/10 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-ink/2 border-b border-ink/8">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-ink/35 font-semibold">
                        Competition {i + 1}
                      </span>
                      <button onClick={() => setCompetitions(competitions.filter((_, j) => j !== i))}
                        className="font-ui text-xs text-ink/30 hover:text-red-500 transition-colors">
                        Remove
                      </button>
                    </div>
                    <div className="p-4 space-y-2.5">
                      <input value={c.name}
                        onChange={e => setCompetitions(competitions.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        placeholder="Competition name" className={sm} />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={c.date}
                          onChange={e => setCompetitions(competitions.map((x, j) => j === i ? { ...x, date: e.target.value } : x))}
                          className={sm} />
                        <input value={c.location}
                          onChange={e => setCompetitions(competitions.map((x, j) => j === i ? { ...x, location: e.target.value } : x))}
                          placeholder="City, State" className={sm} />
                      </div>
                      <input value={c.url}
                        onChange={e => setCompetitions(competitions.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                        placeholder="Link to event page (optional)" className={sm} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {competitions.length > 0 && (
              <button onClick={() => setCompetitions([...competitions, { name: "", date: "", location: "", url: "" }])}
                className={addBtn}>+ Add Competition</button>
            )}
          </div>
        )}

        {/* ── Donations ── */}
        {active === "donations" && (
          <div className="max-w-lg space-y-5">
            <label className={`flex items-start gap-4 cursor-pointer p-5 rounded-2xl border shadow-sm transition-all ${
              donateEnabled
                ? "bg-teal-50 border-teal-200"
                : "bg-white border-ink/10 hover:border-ink/20"
            }`}>
              <div className="pt-0.5 shrink-0">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  donateEnabled ? "bg-teal-600 border-teal-600" : "border-ink/20"
                }`}>
                  {donateEnabled && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <input type="checkbox" checked={donateEnabled} onChange={e => setDonateEnabled(e.target.checked)} className="sr-only" />
              </div>
              <div>
                <p className={`font-ui font-semibold text-sm ${donateEnabled ? "text-teal-800" : "text-ink"}`}>
                  Enable fan donations
                </p>
                <p className={`font-ui text-xs mt-0.5 leading-relaxed ${donateEnabled ? "text-teal-600" : "text-ink/45"}`}>
                  A donation widget appears on this team&apos;s public page so fans can support them directly on Rameelo.
                </p>
              </div>
            </label>

            {donateEnabled && (
              <div className="space-y-4 bg-white border border-ink/8 rounded-2xl p-5 shadow-sm">
                <F label="Widget headline" hint="Shown at the top of the donate card">
                  <input value={donateTitle} onChange={e => setDonateTitle(e.target.value)}
                    placeholder="Help us compete at nationals!" className={inp} />
                </F>
                <F label="Description">
                  <textarea value={donateDesc} onChange={e => setDonateDesc(e.target.value)} rows={3}
                    placeholder="We need your support to cover travel costs to NCRC this January…"
                    className={ta} />
                </F>
                <F label="Fundraising goal ($)" hint="Leave blank to hide the progress bar">
                  <input type="number" value={donateGoal} onChange={e => setDonateGoal(e.target.value)}
                    placeholder="5000" className={inp} />
                </F>
              </div>
            )}
          </div>
        )}

        {/* ── Publish ── */}
        {active === "publish" && (
          <div className="max-w-lg space-y-3">
            {[
              { id: "active",   icon: "🟢", label: "Active",   desc: "Team is visible on the public /collegiate page and indexable by search engines.", val: isActive,   set: setIsActive   },
              { id: "featured", icon: "⭐", label: "Featured", desc: "Team appears in the Featured Teams spotlight section at the top of the page.",      val: isFeatured, set: setIsFeatured },
              { id: "verified", icon: "✓",  label: "Verified", desc: "Displays a verified badge on the team page — use for officially confirmed teams.",   val: isVerified, set: setIsVerified },
            ].map(({ id, icon, label, desc, val, set }) => (
              <label key={id} className={`flex items-start gap-4 cursor-pointer p-5 bg-white rounded-2xl border shadow-sm transition-all ${
                val ? "border-aubergine/25 ring-1 ring-aubergine/10" : "border-ink/8 hover:border-ink/16"
              }`}>
                <div className="pt-0.5 shrink-0">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    val ? "bg-aubergine border-aubergine" : "border-ink/20"
                  }`}>
                    {val && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="sr-only" />
                </div>
                <div>
                  <p className={`font-ui font-semibold text-sm ${val ? "text-aubergine" : "text-ink"}`}>
                    {icon} {label}
                  </p>
                  <p className="font-ui text-ink/45 text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </label>
            ))}

            <div className="pt-2">
              <button onClick={handleSave} disabled={isBusy}
                className={`w-full py-3 rounded-xl font-display font-bold text-base shadow-sm transition-all disabled:opacity-50 ${
                  saved ? "bg-emerald-600 text-white" : "bg-aubergine text-white hover:bg-aubergine/85"
                }`}>
                {isBusy ? "Saving…" : saved ? "✓ Saved" : mode === "create" ? "Create Team →" : "Save All Changes →"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function F({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="font-ui text-xs font-semibold text-ink/55">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="font-mono text-[9px] text-ink/30 leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

function SCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-ink/8 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-ink/8 bg-ink/2">
        <p className="font-ui font-semibold text-ink text-sm">{title}</p>
        {desc && <p className="font-mono text-[9px] text-ink/35 mt-0.5">{desc}</p>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

const inp    = "w-full px-3.5 py-2.5 bg-white border border-ink/12 rounded-xl text-ink placeholder-ink/30 font-ui text-sm focus:outline-none focus:border-aubergine/50 focus:ring-2 focus:ring-aubergine/10 transition-all shadow-sm";
const sm     = "w-full px-3 py-2 bg-white border border-ink/12 rounded-lg text-ink placeholder-ink/30 font-ui text-sm focus:outline-none focus:border-aubergine/50 focus:ring-1 focus:ring-aubergine/10 transition-all";
const ta     = "w-full px-3.5 py-2.5 bg-white border border-ink/12 rounded-xl text-ink placeholder-ink/30 font-ui text-sm focus:outline-none focus:border-aubergine/50 focus:ring-2 focus:ring-aubergine/10 transition-all shadow-sm resize-none leading-relaxed";
const addBtn = "w-full py-2.5 border-2 border-dashed border-ink/15 rounded-xl font-mono text-[10px] uppercase tracking-wider text-ink/35 hover:text-ink/60 hover:border-ink/25 hover:bg-ink/2 transition-all";
