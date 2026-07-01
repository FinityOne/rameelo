"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const REGIONS = ["Northeast", "Southeast", "South", "Midwest", "Southwest", "West"];
const CONTACT_ROLES = ["Captain", "Co-Captain", "Coach", "Team Manager", "Faculty Advisor", "Other"];

type Step = "form" | "done";

export default function CollegiateApplyPage() {
  const [step, setStep] = useState<Step>("form");
  const [section, setSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Contact
  const [contactName, setContactName]   = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactRole, setContactRole]   = useState("Captain");

  // Team basics
  const [teamName, setTeamName]         = useState("");
  const [university, setUniversity]     = useState("");
  const [tagline, setTagline]           = useState("");
  const [region, setRegion]             = useState("Northeast");
  const [state, setState]               = useState("");
  const [city, setCity]                 = useState("");
  const [foundedYear, setFoundedYear]   = useState("");
  const [membersCount, setMembersCount] = useState("");

  // About
  const [bio, setBio]                   = useState("");
  const [perfStyle, setPerfStyle]       = useState("");
  const [achievements, setAchievements] = useState("");

  // Links
  const [instagramUrl, setInstagramUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl]     = useState("");
  const [tiktokUrl, setTiktokUrl]       = useState("");
  const [mixUrl, setMixUrl]             = useState("");
  const [websiteUrl, setWebsiteUrl]     = useState("");

  // Extra
  const [howHeard, setHowHeard]         = useState("");
  const [extraNotes, setExtraNotes]     = useState("");

  const SECTIONS = ["Your Info", "Team Basics", "About", "Links", "Finish"];

  function validate() {
    if (!contactName.trim()) return "Your name is required.";
    if (!contactEmail.trim() || !contactEmail.includes("@")) return "A valid email is required.";
    if (!teamName.trim()) return "Team name is required.";
    if (!university.trim()) return "University is required.";
    if (!region) return "Region is required.";
    return null;
  }

  async function submit() {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError("");

    const supabase = createClient();
    const { error: dbErr } = await supabase.from("team_applications").insert({
      contact_name: contactName.trim(),
      contact_email: contactEmail.trim().toLowerCase(),
      contact_role: contactRole,
      team_name: teamName.trim(),
      university_name: university.trim(),
      tagline: tagline.trim() || null,
      region,
      state: state.trim() || null,
      city: city.trim() || null,
      founded_year: foundedYear ? parseInt(foundedYear) : null,
      members_count: membersCount ? parseInt(membersCount) : null,
      bio: bio.trim() || null,
      performance_style: perfStyle.trim() || null,
      achievements_summary: achievements.trim() || null,
      instagram_url: instagramUrl.trim() || null,
      youtube_url: youtubeUrl.trim() || null,
      tiktok_url: tiktokUrl.trim() || null,
      mix_url: mixUrl.trim() || null,
      website_url: websiteUrl.trim() || null,
      how_did_you_hear: howHeard.trim() || null,
      extra_notes: extraNotes.trim() || null,
      status: "pending",
    });

    if (dbErr) {
      setError("Something went wrong. Please try again.");
      setSaving(false);
      return;
    }
    setStep("done");
    setSaving(false);
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(160deg,#0d0010 0%,#1a0820 100%)" }}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-marigold/15 border border-marigold/30 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="font-display font-bold text-white text-3xl mb-3" style={{ letterSpacing: "-0.025em" }}>
            Application submitted!
          </h1>
          <p className="font-ui text-white/50 text-sm leading-relaxed mb-2">
            We got it. Our team will review <span className="text-white/80">{teamName}</span>&apos;s application and reach out to <span className="text-white/80">{contactEmail}</span> within a few days.
          </p>
          <p className="font-ui text-white/30 text-xs mb-8">You&apos;ll hear from us at the email you provided.</p>
          <Link href="/collegiate" className="inline-block px-6 py-2.5 border border-white/20 text-white font-ui font-medium rounded-xl hover:bg-white/5 transition-all text-sm">
            ← Back to Collegiate
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg,#0d0010 0%,#1a0820 100%)" }}>
      {/* Header */}
      <div className="border-b border-white/8 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/collegiate" className="font-mono text-[10px] uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">
            ← Collegiate
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-widest text-marigold">Team Application</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <span className="text-4xl block mb-4">🏆</span>
          <h1 className="font-display font-bold text-white text-3xl sm:text-4xl mb-3" style={{ letterSpacing: "-0.03em" }}>
            List your team on Rameelo
          </h1>
          <p className="font-ui text-white/50 text-sm max-w-lg mx-auto leading-relaxed">
            Get your own page on the largest garba platform in America — showcase your roster, trophies, competition mix, and let fans support you directly.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-8">
          {SECTIONS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5 flex-1">
              <div className={`h-1 rounded-full flex-1 transition-all duration-300 ${i <= section ? "bg-marigold" : "bg-white/10"}`} />
            </div>
          ))}
        </div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-white/30 text-center mb-6">
          Step {section + 1} of {SECTIONS.length} — {SECTIONS[section]}
        </p>

        {/* Form card */}
        <div className="bg-white/4 border border-white/10 rounded-2xl p-6 space-y-5">

          {/* Step 0: Your Info */}
          {section === 0 && (
            <>
              <SectionHeading emoji="👤">Your contact information</SectionHeading>
              <p className="font-ui text-white/40 text-xs -mt-2 leading-relaxed">
                We&apos;ll use this to review your application and reach out with next steps.
              </p>
              <Field label="Your full name *">
                <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Priya Patel" className={inp} />
              </Field>
              <Field label="Email address *">
                <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@university.edu" className={inp} />
              </Field>
              <Field label="Your role on the team *">
                <select value={contactRole} onChange={e => setContactRole(e.target.value)} className={inp}>
                  {CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </>
          )}

          {/* Step 1: Team Basics */}
          {section === 1 && (
            <>
              <SectionHeading emoji="🎓">Tell us about your team</SectionHeading>
              <Field label="Team name *">
                <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Chakkar" className={inp} />
              </Field>
              <Field label="University *">
                <input value={university} onChange={e => setUniversity(e.target.value)} placeholder="e.g. University of Southern California" className={inp} />
              </Field>
              <Field label="One-line tagline" hint="Shows up on your team card. Make it catchy.">
                <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Where tradition meets the future" className={inp} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Region *">
                  <select value={region} onChange={e => setRegion(e.target.value)} className={inp}>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Year founded">
                  <input type="number" value={foundedYear} onChange={e => setFoundedYear(e.target.value)} placeholder="2012" className={inp} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="Los Angeles" className={inp} />
                </Field>
                <Field label="State">
                  <input value={state} onChange={e => setState(e.target.value)} placeholder="CA" className={inp} />
                </Field>
              </div>
              <Field label="Number of active members">
                <input type="number" value={membersCount} onChange={e => setMembersCount(e.target.value)} placeholder="24" className={inp} />
              </Field>
            </>
          )}

          {/* Step 2: About */}
          {section === 2 && (
            <>
              <SectionHeading emoji="✍️">About the team</SectionHeading>
              <Field label="Team description" hint="This will appear on your public team page.">
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={5}
                  placeholder="Tell the world about your team — your culture, what makes you unique, and what drives you to compete..."
                  className={ta} />
              </Field>
              <Field label="Performance style" hint="e.g. Traditional, Fusion, Contemporary — comma separated">
                <input value={perfStyle} onChange={e => setPerfStyle(e.target.value)} placeholder="Traditional, Contemporary Fusion" className={inp} />
              </Field>
              <Field label="Competition achievements" hint="Briefly list your notable placements — we'll structure these on your page.">
                <textarea value={achievements} onChange={e => setAchievements(e.target.value)} rows={4}
                  placeholder="1st at NCRC 2024, 2nd at Midwest Regionals 2023, Best Mix at Carolina Classic 2022..."
                  className={ta} />
              </Field>
            </>
          )}

          {/* Step 3: Links */}
          {section === 3 && (
            <>
              <SectionHeading emoji="🔗">Links & media</SectionHeading>
              <p className="font-ui text-white/40 text-xs -mt-2">All optional — share whatever you have.</p>
              <Field label="Competition mix URL" hint="YouTube, SoundCloud, or Spotify">
                <input value={mixUrl} onChange={e => setMixUrl(e.target.value)} placeholder="https://youtu.be/..." className={inp} />
              </Field>
              <Field label="Instagram">
                <input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/yourteam" className={inp} />
              </Field>
              <Field label="YouTube channel">
                <input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/@yourteam" className={inp} />
              </Field>
              <Field label="TikTok">
                <input value={tiktokUrl} onChange={e => setTiktokUrl(e.target.value)} placeholder="https://tiktok.com/@yourteam" className={inp} />
              </Field>
              <Field label="Team website">
                <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://yourteam.com" className={inp} />
              </Field>
            </>
          )}

          {/* Step 4: Finish */}
          {section === 4 && (
            <>
              <SectionHeading emoji="🚀">Almost there</SectionHeading>
              <Field label="How did you hear about Rameelo?">
                <input value={howHeard} onChange={e => setHowHeard(e.target.value)} placeholder="Instagram, another team, Google..." className={inp} />
              </Field>
              <Field label="Anything else you want us to know?">
                <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)} rows={4}
                  placeholder="Questions, special requests, or anything that would help us review your application..."
                  className={ta} />
              </Field>

              {/* Review summary */}
              <div className="bg-white/4 border border-white/8 rounded-xl p-4 space-y-1.5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/30 mb-2">Submitting</p>
                {[
                  ["Team", teamName || "—"],
                  ["University", university || "—"],
                  ["Region", region],
                  ["Contact", `${contactName} (${contactEmail})`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="font-ui text-xs text-white/40">{label}</span>
                    <span className="font-ui text-xs text-white/80">{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {error && <p className="mt-3 font-ui text-sm text-durga">{error}</p>}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5">
          <button
            onClick={() => setSection(s => s - 1)}
            disabled={section === 0}
            className="px-5 py-2.5 border border-white/15 text-white/60 font-ui text-sm rounded-xl hover:bg-white/5 disabled:opacity-0 transition-all"
          >
            ← Back
          </button>

          {section < SECTIONS.length - 1 ? (
            <button
              onClick={() => setSection(s => s + 1)}
              className="px-6 py-2.5 bg-marigold text-aubergine font-display font-bold text-sm rounded-xl hover:bg-marigold/90 transition-all"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={saving}
              className="px-6 py-2.5 bg-marigold text-aubergine font-display font-bold text-sm rounded-xl hover:bg-marigold/90 disabled:opacity-60 transition-all"
            >
              {saving ? "Submitting…" : "Submit Application →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pb-1 border-b border-white/8">
      <span>{emoji}</span>
      <p className="font-mono text-[10px] uppercase tracking-widest text-marigold/70 font-bold">{children}</p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="font-ui text-xs font-semibold text-white/60">{label}</label>
      {hint && <p className="font-mono text-[9px] text-white/25">{hint}</p>}
      {children}
    </div>
  );
}

const inp = "w-full px-3 py-2.5 bg-white/6 border border-white/10 rounded-xl text-white placeholder-white/25 font-ui text-sm focus:outline-none focus:border-marigold/40 transition-colors";
const ta  = "w-full px-3 py-2.5 bg-white/6 border border-white/10 rounded-xl text-white placeholder-white/25 font-ui text-sm focus:outline-none focus:border-marigold/40 transition-colors resize-none";
