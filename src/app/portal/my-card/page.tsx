"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  first_name: string;
  last_name:  string;
  city:       string | null;
  state:      string | null;
  created_at: string;
  avatar_url: string | null;
};

type EventStamp = {
  id:         string;
  title:      string;
  city:       string | null;
  state:      string | null;
  start_date: string;
  category:   string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function memberCode(userId: string, first: string, last: string): string {
  const initials = `${(first[0] ?? "R").toUpperCase()}${(last[0] ?? "M").toUpperCase()}`;
  const hash     = userId.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `${initials}${hash}`;
}

function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function stampDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

const AVATAR_PALETTE = [
  "#7C1F2C", "#0E8C7A", "#2E1B30", "#D4891B", "#5a1e7a", "#892240", "#1a4a5e",
];

const STAMP_PALETTE = [
  "#F5A623", "#0E8C7A", "#892240", "#5a1e7a", "#1a4a5e", "#D4891B", "#7C1F2C",
];

function colorFromId(id: string): string {
  const sum = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

function stampColorFromId(id: string): string {
  const sum = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return STAMP_PALETTE[sum % STAMP_PALETTE.length];
}

function stampRotation(id: string): number {
  const val = parseInt(id.replace(/-/g, "").slice(0, 4), 16);
  const r = (val % 13) - 6; // -6 to +6 degrees
  return r;
}

// ── SVG Mandala ───────────────────────────────────────────────────────────────

function GarbaMandala({ accent }: { accent: string }) {
  const p8  = Array.from({ length: 8  }, (_, i) => i * 45);
  const p16 = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <svg viewBox="0 0 400 400" fill="none" className="w-full h-full">
      {[185, 158, 130, 105].map((r, i) => (
        <circle key={r} cx="200" cy="200" r={r}
          stroke="white" strokeOpacity={[0.04, 0.06, 0.07, 0.05][i]} strokeWidth="1" />
      ))}
      {p8.map(a => (
        <ellipse key={a} cx="200" cy="110" rx="13" ry="46"
          fill="white" fillOpacity="0.035"
          transform={`rotate(${a} 200 200)`} />
      ))}
      {p8.map(a => (
        <ellipse key={`ac${a}`} cx="200" cy="104" rx="4" ry="10"
          fill={accent} fillOpacity="0.3"
          transform={`rotate(${a} 200 200)`} />
      ))}
      {[80, 58, 36].map((r, i) => (
        <circle key={r} cx="200" cy="200" r={r}
          stroke="white" strokeOpacity={[0.06, 0.09, 0.1][i]} strokeWidth="1" />
      ))}
      {p16.map(a => (
        <ellipse key={a} cx="200" cy="155" rx="5" ry="18"
          fill="white" fillOpacity="0.05"
          transform={`rotate(${a} 200 200)`} />
      ))}
      {p8.map(a => (
        <line key={`l${a}`} x1="200" y1="64" x2="200" y2="88"
          stroke={accent} strokeOpacity="0.2" strokeWidth="1.5"
          transform={`rotate(${a} 200 200)`} />
      ))}
      <circle cx="200" cy="200" r="5" fill={accent} fillOpacity="0.25" />
      <circle cx="200" cy="200" r="2" fill={accent} fillOpacity="0.6" />
    </svg>
  );
}

// ── Passport Stamp ────────────────────────────────────────────────────────────

function PassportStamp({ stamp }: { stamp: EventStamp }) {
  const color = stampColorFromId(stamp.id);
  const rot   = stampRotation(stamp.id);
  const city  = stamp.city ?? "US";
  // Abbreviate long city names
  const cityLabel = city.length > 10 ? city.slice(0, 9) + "." : city.toUpperCase();
  const dateLabel = stampDate(stamp.start_date);
  const titleWords = stamp.title.split(" ");
  // Show up to 2 words of event title
  const shortTitle = titleWords.slice(0, 2).join(" ").toUpperCase();

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <svg viewBox="0 0 110 110" className="w-full h-full" fill="none">
        {/* Outer dashed ring — classic passport stamp */}
        <circle cx="55" cy="55" r="50" stroke={color} strokeWidth="2.5" strokeOpacity="0.9"
          strokeDasharray="4 2.5" />
        {/* Inner solid ring */}
        <circle cx="55" cy="55" r="43" stroke={color} strokeWidth="1" strokeOpacity="0.5" />
        {/* Inner thin ring */}
        <circle cx="55" cy="55" r="38" stroke={color} strokeWidth="0.5" strokeOpacity="0.3" />

        {/* City — big */}
        <text x="55" y="46" textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize="13" fontFamily="monospace" fontWeight="700"
          letterSpacing="2">
          {cityLabel}
        </text>

        {/* Horizontal rule */}
        <line x1="22" y1="53" x2="88" y2="53" stroke={color} strokeWidth="0.8" strokeOpacity="0.4" />

        {/* Event short name */}
        <text x="55" y="62" textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize="7.5" fontFamily="monospace" fontWeight="500"
          letterSpacing="1" opacity="0.75">
          {shortTitle}
        </text>

        {/* Date */}
        <text x="55" y="72" textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize="7" fontFamily="monospace" fontWeight="400"
          opacity="0.55">
          {dateLabel}
        </text>

        {/* Garba symbol at top */}
        <text x="55" y="26" textAnchor="middle" dominantBaseline="middle"
          fontSize="10" opacity="0.6">
          🪈
        </text>
      </svg>
    </div>
  );
}

// ── Placeholder stamp (empty slot) ───────────────────────────────────────────

function EmptyStamp() {
  return (
    <div className="flex items-center justify-center opacity-20">
      <svg viewBox="0 0 110 110" className="w-full h-full" fill="none">
        <circle cx="55" cy="55" r="50" stroke="white" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx="55" cy="55" r="38" stroke="white" strokeWidth="0.5" />
        <text x="55" y="58" textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize="22" opacity="0.4">?</text>
      </svg>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GarbaPassportPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stamps,  setStamps]  = useState<EventStamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [shared,  setShared]  = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/signin"); return; }

      const [{ data: profileData, error: pErr }, { data: ordersData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, first_name, last_name, city, state, created_at, avatar_url")
          .eq("id", user.id)
          .single(),
        supabase
          .from("orders")
          .select("event_id, events(id, title, city, state, start_date, category)")
          .eq("user_id", user.id)
          .eq("status", "confirmed"),
      ]);

      if (pErr || !profileData) { setError(true); setLoading(false); return; }
      setProfile(profileData as Profile);

      // Deduplicate by event_id and flatten
      if (ordersData) {
        const seen = new Set<string>();
        const deduped: EventStamp[] = [];
        for (const row of ordersData) {
          const ev = (row as unknown as { event_id: string; events: EventStamp | null }).events;
          if (ev && !seen.has(ev.id)) {
            seen.add(ev.id);
            deduped.push(ev);
          }
        }
        // Sort upcoming first, then past
        deduped.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
        setStamps(deduped);
      }

      setLoading(false);
    });
  }, [router]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-7 h-7 rounded-full border-2 border-black/10 border-t-aubergine animate-spin" />
    </div>
  );
  if (error || !profile) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
      <p className="font-display font-bold text-ink/60 text-lg">Couldn&apos;t load your Passport</p>
      <p className="font-ui text-sm text-ink-muted">Make sure your profile is complete and try refreshing.</p>
      <Link href="/portal/profile" className="mt-2 px-5 py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:opacity-90 transition-opacity">
        Complete Profile
      </Link>
    </div>
  );

  const accent      = colorFromId(profile.id);
  const code        = memberCode(profile.id, profile.first_name, profile.last_name);
  const initials    = `${(profile.first_name[0] ?? "").toUpperCase()}${(profile.last_name[0] ?? "").toUpperCase()}`;
  const location    = [profile.city, profile.state].filter(Boolean).join(", ");
  const referralUrl = `https://rameelo.com/join?ref=${code}`;
  const fullName    = `${profile.first_name} ${profile.last_name}`;

  // Always show at least 6 slots (3 per row × 2 rows)
  const MIN_SLOTS = 6;
  const emptyCount = Math.max(0, MIN_SLOTS - stamps.length);

  const whatsappMsg = encodeURIComponent(
    `Hey! I just joined Rameelo — the platform for garba & navratri events across the US 🪈\n\nJoin me: ${referralUrl}`
  );

  async function handleNativeShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${fullName} is on Rameelo`,
          text: `Hey! Join me on Rameelo — the platform for garba & navratri events in the US 🪈`,
          url: referralUrl,
        });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } catch {
        // user dismissed — no-op
      }
    } else {
      navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="max-w-sm mx-auto space-y-6 pb-10">

      {/* Back */}
      <div className="flex items-center gap-3">
        <Link href="/portal" className="text-ink/30 hover:text-ink/60 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
        </Link>
        <div>
          <p className="font-display font-bold text-ink/85 text-lg" style={{ letterSpacing: "-0.02em" }}>Your Garba Passport</p>
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink/35">
            {stamps.length > 0 ? `${stamps.length} stamp${stamps.length !== 1 ? "s" : ""} collected` : "Share your community identity"}
          </p>
        </div>
      </div>

      {/* ── THE CARD ─────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-3xl overflow-hidden select-none"
        style={{
          background: `linear-gradient(160deg, #0e0514 0%, #1e0e22 35%, #2E1B30 70%, #1a0a1f 100%)`,
        }}
      >
        {/* Background mandala */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[110%] h-[110%]">
            <GarbaMandala accent={accent} />
          </div>
        </div>

        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: accent }} />
        <div className="absolute bottom-8 left-4 w-32 h-32 rounded-full blur-2xl opacity-10"
          style={{ backgroundColor: "#F5A623" }} />

        {/* Content */}
        <div className="relative flex flex-col px-6 py-6">

          {/* Header row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🪈</span>
              <span className="font-display font-bold text-white text-base tracking-tight">RAMEELO</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/8 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
              <span className="font-mono text-[9px] uppercase tracking-widest text-white/50">Verified</span>
            </div>
          </div>

          {/* Avatar + name */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative shrink-0">
              <div className="absolute -inset-1.5 rounded-full opacity-30 blur-md"
                style={{ backgroundColor: accent }} />
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/20"
                style={{ backgroundColor: accent }}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-display font-bold text-white text-xl">{initials}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-bold text-white text-lg leading-tight truncate"
                style={{ letterSpacing: "-0.025em" }}>
                {fullName}
              </h2>
              {location && (
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/40 mt-0.5">{location}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <div>
                  <p className="font-mono text-[7px] uppercase tracking-widest text-white/25">Since</p>
                  <p className="font-display font-bold text-white text-[11px]">{memberSince(profile.created_at)}</p>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div>
                  <p className="font-mono text-[7px] uppercase tracking-widest text-white/25">Code</p>
                  <p className="font-display font-bold text-[11px]" style={{ color: accent }}>{code}</p>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div>
                  <p className="font-mono text-[7px] uppercase tracking-widest text-white/25">Stamps</p>
                  <p className="font-display font-bold text-white text-[11px]">{stamps.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span style={{ color: accent }} className="text-xs">◆</span>
            <span className="font-mono text-[8px] uppercase tracking-widest text-white/30">Garba Stamps</span>
            <span style={{ color: accent }} className="text-xs">◆</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* ── Stamps grid ── */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {stamps.map(s => (
              <PassportStamp key={s.id} stamp={s} />
            ))}
            {Array.from({ length: emptyCount }).map((_, i) => (
              <EmptyStamp key={`empty-${i}`} />
            ))}
          </div>

          {/* Footer URL strip */}
          <div className="rounded-xl py-2 px-4 flex items-center justify-center"
            style={{ backgroundColor: `${accent}18`, border: `1px solid ${accent}30` }}>
            <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: `${accent}aa` }}>
              rameelo.com/join?ref={code}
            </span>
          </div>
        </div>
      </div>

      {/* Stamp count callout */}
      {stamps.length === 0 ? (
        <div className="px-5 py-4 rounded-2xl border border-marigold/20 bg-marigold/5 text-center">
          <p className="font-display font-bold text-ink/70 text-sm mb-0.5" style={{ letterSpacing: "-0.01em" }}>No stamps yet</p>
          <p className="font-ui text-xs text-ink-muted">Buy tickets to garba events — each one earns you a stamp on your Passport.</p>
          <Link href="/events" className="inline-block mt-3 px-4 py-2 rounded-xl bg-aubergine text-white font-ui font-semibold text-xs hover:opacity-90 transition-opacity">
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="px-5 py-3.5 rounded-2xl border border-aubergine/15 bg-aubergine/5 flex items-center gap-3">
          <span className="text-xl">🎟️</span>
          <div>
            <p className="font-display font-bold text-ink/80 text-sm" style={{ letterSpacing: "-0.01em" }}>
              {stamps.length} garba event{stamps.length !== 1 ? "s" : ""} collected
            </p>
            <p className="font-ui text-xs text-ink-muted">Keep going — every event adds a new stamp to your Passport.</p>
          </div>
        </div>
      )}

      {/* ── Share buttons ─────────────────────────────────────────────────── */}
      <div className="space-y-3">

        <button onClick={handleNativeShare}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-ui font-bold text-[14px] text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)" }}>
          <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </svg>
          <span className="flex-1 text-left">
            {shared ? "Shared! 🎉" : "Share to Instagram Story"}
          </span>
          <svg className="w-4 h-4 opacity-60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>

        <div className="px-4 py-2.5 rounded-xl bg-black/[0.03] border border-black/[0.06]">
          <p className="font-mono text-[9px] text-ink/35 text-center">
            📱 On mobile — tap above to share directly. Or screenshot your Passport and paste into your Instagram Story.
          </p>
        </div>

        <a href={`https://wa.me/?text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-ui font-bold text-[14px] text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: "#25D366" }}>
          <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <span className="flex-1 text-left">Invite friends on WhatsApp</span>
          <svg className="w-4 h-4 opacity-60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        <button onClick={handleCopy}
          className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-ui font-semibold text-[13px] border transition-all ${copied ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-black/10 text-ink/65 hover:border-black/20 hover:text-ink/80"}`}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {copied
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            }
          </svg>
          <span className="flex-1 text-left font-mono text-[11px] truncate">
            {copied ? "Copied! Send to your friends 🎉" : referralUrl}
          </span>
          {!copied && (
            <span className="font-mono text-[9px] uppercase tracking-widest text-ink/35 shrink-0">Copy</span>
          )}
        </button>
      </div>

      {/* Bottom note */}
      <div className="text-center space-y-1 pb-4">
        <p className="font-display font-bold text-ink/60 text-sm" style={{ letterSpacing: "-0.01em" }}>
          The garba community grows when you share 🙏
        </p>
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink/25">
          Your code: <span className="font-bold">{code}</span>
        </p>
      </div>

    </div>
  );
}
