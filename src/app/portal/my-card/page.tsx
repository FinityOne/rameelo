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
  artist:     string | null;   // free-text fallback
  artists:    { name: string } | null;  // joined from artists table
  source:     "purchase" | "custom"; // purchase = from a ticket (locked), custom = user-added
};

type ArtistOption = { id: string; name: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function memberCode(userId: string, first: string, last: string): string {
  const initials = `${(first[0] ?? "R").toUpperCase()}${(last[0] ?? "M").toUpperCase()}`;
  const hash     = userId.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `${initials}${hash}`;
}

function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function stampDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Deterministic color from ID — rich ink colors for stamps
const STAMP_COLORS = [
  "#1B3A5C", // navy
  "#1B2F5E", // forest green
  "#6B1E3A", // burgundy
  "#1B2F5E", // aubergine
  "#3B2200", // dark amber
  "#1A3B3B", // teal ink
  "#4A1942", // plum
];

function stampColor(id: string): string {
  const sum = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return STAMP_COLORS[sum % STAMP_COLORS.length];
}

function stampRotation(id: string): number {
  const val = parseInt(id.replace(/-/g, "").slice(0, 4), 16);
  return (val % 11) - 5; // -5 to +5 degrees
}

// Truncate artist/city to fit stamp
function fitText(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "." : text;
}

// ── NPS-style Passport Stamp ──────────────────────────────────────────────────

function PassportStamp({ stamp }: { stamp: EventStamp }) {
  const color    = stampColor(stamp.id);
  const rot      = stampRotation(stamp.id);
  const artist   = stamp.artist ?? stamp.artists?.name ?? "Artist";
  const city     = stamp.city ?? "";
  const date     = stampDate(stamp.start_date);

  // Artist name: up to 2 lines — split at space if long
  const words     = artist.toUpperCase().split(" ");
  const half      = Math.ceil(words.length / 2);
  const line1     = words.slice(0, half).join(" ");
  const line2     = words.slice(half).join(" ");
  const singleLine = artist.length <= 11;

  // City label for outer arc (bottom)
  const cityLabel = city ? fitText(city.toUpperCase(), 14) : "";
  const dateLabel = date;

  return (
    <div className="relative flex items-center justify-center"
      style={{ transform: `rotate(${rot}deg)` }}>
      <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-sm" fill="none">
        {/* Outer thick ring */}
        <circle cx="60" cy="60" r="56" stroke={color} strokeWidth="3" opacity="0.9" />
        {/* Outer dashed ring */}
        <circle cx="60" cy="60" r="50" stroke={color} strokeWidth="1" strokeDasharray="3.5 2.5" opacity="0.5" />
        {/* Inner ring */}
        <circle cx="60" cy="60" r="44" stroke={color} strokeWidth="0.75" opacity="0.3" />

        {/* Top bar label — event type */}
        <rect x="22" y="19" width="76" height="11" rx="1" fill={color} opacity="0.08" />
        <text x="60" y="26.5" textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize="6" fontFamily="monospace" fontWeight="700"
          letterSpacing="2.5" opacity="0.7">
          GARBA NIGHT
        </text>

        {/* Artist name — hero text */}
        {singleLine ? (
          <text x="60" y="58" textAnchor="middle" dominantBaseline="middle"
            fill={color} fontSize="13.5" fontFamily="Georgia, serif" fontWeight="700"
            letterSpacing="0.5">
            {fitText(artist.toUpperCase(), 12)}
          </text>
        ) : (
          <>
            <text x="60" y="51" textAnchor="middle" dominantBaseline="middle"
              fill={color} fontSize="12" fontFamily="Georgia, serif" fontWeight="700"
              letterSpacing="0.5">
              {fitText(line1, 12)}
            </text>
            <text x="60" y="64" textAnchor="middle" dominantBaseline="middle"
              fill={color} fontSize="12" fontFamily="Georgia, serif" fontWeight="700"
              letterSpacing="0.5">
              {fitText(line2, 12)}
            </text>
          </>
        )}

        {/* Thin rule below artist name */}
        <line x1="30" y1="73" x2="90" y2="73" stroke={color} strokeWidth="0.75" opacity="0.35" />

        {/* City */}
        {cityLabel && (
          <text x="60" y="81" textAnchor="middle" dominantBaseline="middle"
            fill={color} fontSize="7" fontFamily="monospace" fontWeight="600"
            letterSpacing="1.5" opacity="0.7">
            {cityLabel}
          </text>
        )}

        {/* Date */}
        <text x="60" y="91" textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize="6.5" fontFamily="monospace"
          letterSpacing="0.5" opacity="0.5">
          {dateLabel}
        </text>

        {/* Small decorative dots at 3/9 o'clock */}
        <circle cx="8" cy="60" r="2" fill={color} opacity="0.2" />
        <circle cx="112" cy="60" r="2" fill={color} opacity="0.2" />
      </svg>
    </div>
  );
}

// ── Empty stamp slot ──────────────────────────────────────────────────────────

function EmptyStamp() {
  return (
    <div className="flex items-center justify-center opacity-[0.15]">
      <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
        <circle cx="60" cy="60" r="56" stroke="#1B2F5E" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="60" cy="60" r="44" stroke="#1B2F5E" strokeWidth="0.75" />
        <text x="60" y="62" textAnchor="middle" dominantBaseline="middle"
          fill="#1B2F5E" fontSize="24" fontFamily="Georgia, serif" opacity="0.5">?</text>
      </svg>
    </div>
  );
}

// ── Artist combobox ───────────────────────────────────────────────────────────
function ArtistCombobox({ artists, query, setQuery, onSelect, selectedId }: {
  artists: ArtistOption[];
  query: string;
  setQuery: (v: string) => void;
  onSelect: (a: ArtistOption | null) => void;
  selectedId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const q = query.trim().toLowerCase();
  const matches = q
    ? artists.filter(a => a.name.toLowerCase().includes(q)).slice(0, 6)
    : artists.slice(0, 6);
  const exact = artists.some(a => a.name.toLowerCase() === q);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); onSelect(null); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search artists or type a name…"
        className="w-full rounded-xl border border-ivory-200 px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-[#1B2F5E]/20 focus:border-[#1B2F5E]/40 transition-all"
      />
      {open && (matches.length > 0 || (query.trim() && !exact)) && (
        <div className="absolute z-10 left-0 right-0 mt-1.5 rounded-xl border border-ivory-200 bg-white shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {matches.map(a => (
            <button
              key={a.id}
              type="button"
              onMouseDown={() => { onSelect(a); setQuery(a.name); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 font-ui text-sm transition-colors flex items-center gap-2 ${selectedId === a.id ? "bg-[#1B2F5E]/8 text-[#1B2F5E] font-semibold" : "text-ink hover:bg-ivory"}`}
            >
              <span className="w-6 h-6 rounded-full bg-[#1B2F5E]/10 flex items-center justify-center text-[10px] font-bold text-[#1B2F5E] shrink-0">{a.name[0]?.toUpperCase()}</span>
              {a.name}
            </button>
          ))}
          {query.trim() && !exact && (
            <button
              type="button"
              onMouseDown={() => { onSelect(null); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 font-ui text-sm text-ink-muted hover:bg-ivory transition-colors border-t border-ivory-200"
            >
              Use “<span className="font-semibold text-ink">{query.trim()}</span>” as the artist
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add Stamp Modal (form + live preview) ───────────────────────────────────────
function AddStampModal({ artists, userId, onClose, onAdded }: {
  artists: ArtistOption[];
  userId: string;
  onClose: () => void;
  onAdded: (s: EventStamp) => void;
}) {
  const [eventName, setEventName] = useState("");
  const [date, setDate] = useState("");
  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("");
  const [mode, setMode] = useState<"artist" | "noartist">("artist");
  const [artistQuery, setArtistQuery] = useState("");
  const [selectedArtist, setSelectedArtist] = useState<ArtistOption | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const heroLabel = mode === "artist"
    ? (selectedArtist?.name ?? artistQuery.trim())
    : customLabel.trim();
  const valid = !!(eventName.trim() && date && heroLabel);

  // Live preview stamp
  const preview: EventStamp = {
    id: "preview",
    title: eventName.trim() || "Your Garba",
    city: city.trim() || null,
    state: stateField.trim() || null,
    start_date: date || new Date().toISOString().slice(0, 10),
    artist: heroLabel || "Artist",
    artists: null,
    source: "custom",
  };

  async function handleAdd() {
    if (!valid) return;
    setSaving(true); setError("");
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("passport_stamps")
      .insert({
        user_id: userId,
        event_name: eventName.trim(),
        event_date: date,
        city: city.trim() || null,
        state: stateField.trim() || null,
        artist_id: mode === "artist" ? (selectedArtist?.id ?? null) : null,
        artist_name: heroLabel,
      })
      .select("id, event_name, event_date, city, state, artist_name")
      .single();
    setSaving(false);
    if (err || !data) { setError(err?.message ?? "Couldn't save your stamp. Try again."); return; }
    onAdded({
      id: data.id, title: data.event_name, city: data.city, state: data.state,
      start_date: data.event_date, artist: data.artist_name, artists: null, source: "custom",
    });
  }

  const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-1.5";
  const inputCls = "w-full rounded-xl border border-ivory-200 px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-[#1B2F5E]/20 focus:border-[#1B2F5E]/40 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-[#FDFAF2] sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[94dvh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-ink-muted/20" />
        </div>

        {/* Header */}
        <div className="px-6 pt-4 pb-3 flex items-start justify-between gap-3 shrink-0">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#1B2F5E]/60">Add a stamp</p>
            <p className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.015em" }}>Stamp a garba you danced at</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/[0.04] flex items-center justify-center text-ink-muted hover:text-ink transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Live preview */}
        <div className="px-6 pb-3 shrink-0">
          <div className="rounded-2xl border border-[#1B2F5E]/12 bg-white px-4 py-4 flex items-center gap-4">
            <div className="w-[104px] h-[104px] shrink-0">
              <PassportStamp stamp={preview} />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-widest text-[#1B2F5E]/50 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1B2F5E] animate-pulse" /> Live preview
              </p>
              <p className="font-display font-bold text-ink text-sm leading-tight truncate">{preview.title}</p>
              <p className="font-ui text-xs text-ink-muted truncate">{preview.artist}</p>
              <p className="font-mono text-[10px] text-ink-muted/70 mt-0.5">
                {[preview.city, preview.state].filter(Boolean).join(", ")}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 pb-4 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className={labelCls}>Event name</label>
            <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Edison Navratri Garba" className={inputCls} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Edison" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>State</label>
            <input value={stateField} onChange={e => setStateField(e.target.value.toUpperCase().slice(0, 2))} placeholder="NJ" className={inputCls} />
          </div>

          {/* Artist mode toggle */}
          <div>
            <label className={labelCls}>What goes on the stamp?</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button type="button" onClick={() => setMode("artist")}
                className={`py-2.5 rounded-xl border-2 font-ui font-semibold text-xs transition-all ${mode === "artist" ? "border-[#1B2F5E] bg-[#1B2F5E]/5 text-[#1B2F5E]" : "border-ivory-200 text-ink-muted hover:border-[#1B2F5E]/30"}`}>
                Featured artist
              </button>
              <button type="button" onClick={() => setMode("noartist")}
                className={`py-2.5 rounded-xl border-2 font-ui font-semibold text-xs transition-all ${mode === "noartist" ? "border-[#1B2F5E] bg-[#1B2F5E]/5 text-[#1B2F5E]" : "border-ivory-200 text-ink-muted hover:border-[#1B2F5E]/30"}`}>
                No artist
              </button>
            </div>

            {mode === "artist" ? (
              <>
                <ArtistCombobox artists={artists} query={artistQuery} setQuery={setArtistQuery} onSelect={setSelectedArtist} selectedId={selectedArtist?.id ?? null} />
                <p className="font-ui text-[11px] text-ink-muted mt-1.5">Pick from the list, or type any artist name — it&apos;s your passport.</p>
              </>
            ) : (
              <>
                <input value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder="e.g. Community Night, Society Garba" className={inputCls} />
                <p className="font-ui text-[11px] text-ink-muted mt-1.5">Local garba with no headliner? Put any name you want on the stamp.</p>
              </>
            )}
          </div>

          {error && <p className="font-ui text-xs text-durga">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1B2F5E]/10 shrink-0 flex gap-2.5">
          <button onClick={onClose} className="px-5 py-3.5 rounded-2xl border border-ink/12 font-ui font-semibold text-sm text-ink-muted hover:text-ink transition-colors">
            Cancel
          </button>
          <button
            disabled={!valid || saving}
            onClick={handleAdd}
            className={`flex-1 py-3.5 rounded-2xl font-display font-bold text-base transition-all flex items-center justify-center gap-2 ${valid && !saving ? "text-white hover:opacity-90 active:scale-[0.98]" : "bg-ivory-200 text-ink-muted/50 cursor-not-allowed"}`}
            style={valid && !saving ? { backgroundColor: "#1B2F5E" } : undefined}
          >
            {saving ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Adding…</> : "Confirm & add stamp"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GarbaPassportPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stamps,  setStamps]  = useState<EventStamp[]>([]);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [userId,  setUserId]  = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [shared,  setShared]  = useState(false);

  function sortStamps(list: EventStamp[]) {
    return [...list].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  }

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/signin"); return; }
      setUserId(user.id);

      const [{ data: profileData, error: pErr }, { data: ordersData }, { data: customData }, { data: artistData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, first_name, last_name, city, state, created_at, avatar_url")
          .eq("id", user.id)
          .single(),
        supabase
          .from("orders")
          .select("event_id")
          .eq("user_id", user.id)
          .eq("status", "confirmed"),
        supabase
          .from("passport_stamps")
          .select("id, event_name, event_date, city, state, artist_name")
          .eq("user_id", user.id),
        supabase
          .from("artists")
          .select("id, name")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (pErr || !profileData) { setError(true); setLoading(false); return; }
      setProfile(profileData as Profile);
      setArtists((artistData ?? []) as ArtistOption[]);

      const merged: EventStamp[] = [];

      // Purchase stamps — from confirmed ticket orders (locked, can't be removed)
      if (ordersData && ordersData.length > 0) {
        const eventIds = [...new Set(ordersData.map(o => o.event_id).filter(Boolean))];
        const { data: eventsData } = await supabase
          .from("events")
          .select("id, title, city, state, start_date, artist, artists(name)")
          .in("id", eventIds);
        for (const ev of eventsData ?? []) {
          merged.push({
            ...ev,
            artists: Array.isArray(ev.artists) ? (ev.artists[0] ?? null) : ev.artists,
            source: "purchase",
          } as EventStamp);
        }
      }

      // Custom stamps — user-added (removable)
      for (const c of (customData ?? []) as { id: string; event_name: string; event_date: string; city: string | null; state: string | null; artist_name: string }[]) {
        merged.push({
          id: c.id, title: c.event_name, city: c.city, state: c.state,
          start_date: c.event_date, artist: c.artist_name, artists: null, source: "custom",
        });
      }

      setStamps(sortStamps(merged));
      setLoading(false);
    });
  }, [router]);

  function handleStampAdded(s: EventStamp) {
    setStamps(prev => sortStamps([...prev, s]));
    setShowAdd(false);
  }

  async function handleRemoveStamp(id: string) {
    setRemovingId(id);
    const supabase = createClient();
    const { error: err } = await supabase.from("passport_stamps").delete().eq("id", id);
    if (!err) setStamps(prev => prev.filter(s => s.id !== id));
    setRemovingId(null);
  }

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

  const code        = memberCode(profile.id, profile.first_name, profile.last_name);
  const initials    = `${(profile.first_name[0] ?? "").toUpperCase()}${(profile.last_name[0] ?? "").toUpperCase()}`;
  const location    = [profile.city, profile.state].filter(Boolean).join(", ");
  const referralUrl = `https://rameelo.com/join?ref=${code}`;
  const fullName    = `${profile.first_name} ${profile.last_name}`;

  const MIN_SLOTS  = 6;
  const emptyCount = Math.max(0, MIN_SLOTS - stamps.length);

  const whatsappMsg = encodeURIComponent(
    `Hey! I just joined Rameelo — the platform for garba & navratri events across the US 🪈\n\nCheck out my Garba Passport: ${referralUrl}`
  );

  async function handleNativeShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${fullName}'s Garba Passport`,
          text: `I've been collecting garba stamps on Rameelo 🪈 Join me!`,
          url: referralUrl,
        });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } catch { /* dismissed */ }
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

      {showAdd && (
        <AddStampModal artists={artists} userId={userId} onClose={() => setShowAdd(false)} onAdded={handleStampAdded} />
      )}

      {/* Back */}
      <div className="flex items-center gap-3">
        <Link href="/portal" className="text-ink/30 hover:text-ink/60 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
        </Link>
        <div>
          <p className="font-display font-bold text-ink/85 text-lg" style={{ letterSpacing: "-0.02em" }}>Garba Passport</p>
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink/35">
            {stamps.length > 0 ? `${stamps.length} stamp${stamps.length !== 1 ? "s" : ""} collected` : "Collect stamps at every garba"}
          </p>
        </div>
      </div>

      {/* ── PASSPORT BOOK ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.18)] select-none">

        {/* ── COVER ── USA passport navy blue */}
        <div className="relative overflow-hidden" style={{ backgroundColor: "#1B2F5E" }}>

          {/* Subtle texture overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, #C9A84C 0px, #C9A84C 1px, transparent 1px, transparent 8px)" }} />

          {/* Fine gold decorative border */}
          <div className="absolute inset-x-0 top-0 h-[1.5px]" style={{ background: "linear-gradient(90deg, transparent, #C9A84C60, #C9A84C, #C9A84C60, transparent)" }} />
          <div className="absolute inset-x-4 top-[5px] h-px" style={{ backgroundColor: "#C9A84C22" }} />
          <div className="absolute inset-x-0 bottom-0 h-[1.5px]" style={{ background: "linear-gradient(90deg, transparent, #C9A84C60, #C9A84C, #C9A84C60, transparent)" }} />
          <div className="absolute inset-x-4 bottom-[5px] h-px" style={{ backgroundColor: "#C9A84C22" }} />
          <div className="absolute inset-y-0 left-0 w-[1.5px]" style={{ background: "linear-gradient(180deg, transparent, #C9A84C60, #C9A84C, #C9A84C60, transparent)" }} />
          <div className="absolute inset-y-4 left-[5px] w-px" style={{ backgroundColor: "#C9A84C22" }} />
          <div className="absolute inset-y-0 right-0 w-[1.5px]" style={{ background: "linear-gradient(180deg, transparent, #C9A84C60, #C9A84C, #C9A84C60, transparent)" }} />
          <div className="absolute inset-y-4 right-[5px] w-px" style={{ backgroundColor: "#C9A84C22" }} />

          {/* Garba mandala watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
            <svg viewBox="0 0 300 300" className="w-[140%] h-[140%]" fill="none">
              {Array.from({ length: 12 }, (_, i) => i * 30).map(a => (
                <ellipse key={a} cx="150" cy="70" rx="10" ry="55" fill="#C9A84C" transform={`rotate(${a} 150 150)`} />
              ))}
              {[130, 100, 72, 48, 26].map(r => (
                <circle key={r} cx="150" cy="150" r={r} stroke="#C9A84C" strokeWidth="1.5" />
              ))}
            </svg>
          </div>

          {/* Cover content */}
          <div className="relative px-6 pt-7 pb-6">

            {/* "United States of Garba" header */}
            <p className="text-center font-mono text-[7.5px] uppercase tracking-[0.38em] mb-3"
              style={{ color: "#C9A84C90" }}>
              United&nbsp;States&nbsp;of&nbsp;Garba
            </p>

            {/* PASSPORT title */}
            <div className="text-center mb-5">
              <p className="font-display font-bold text-white text-base mb-0.5"
                style={{ letterSpacing: "0.18em", textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>
                RAMEELO
              </p>
              <p className="font-mono font-bold tracking-[0.28em] uppercase"
                style={{ fontSize: "13px", color: "#C9A84Ccc", letterSpacing: "0.35em" }}>
                PASSPORT
              </p>
              <div className="flex items-center justify-center gap-2 mt-1.5">
                <div className="h-px flex-1" style={{ backgroundColor: "#C9A84C25" }} />
                <span className="font-mono text-[7px] tracking-widest uppercase" style={{ color: "#C9A84C55" }}>Navratri 2026</span>
                <div className="h-px flex-1" style={{ backgroundColor: "#C9A84C25" }} />
              </div>
            </div>

            {/* Portrait + identity fields */}
            <div className="flex items-start gap-4 mb-5">
              {/* Portrait */}
              <div className="shrink-0 flex flex-col items-center gap-1">
                <div className="w-[68px] h-[84px] rounded-sm overflow-hidden border"
                  style={{ borderColor: "#C9A84C40", backgroundColor: "#0d1a3a" }}>
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-display font-bold text-[28px]" style={{ color: "#C9A84C" }}>{initials}</span>
                    </div>
                  )}
                </div>
                <p className="font-mono text-[6px] uppercase tracking-widest" style={{ color: "#C9A84C45" }}>Photo</p>
              </div>

              {/* Identity fields */}
              <div className="flex-1 min-w-0 space-y-3">
                <div className="pb-2 border-b" style={{ borderColor: "#C9A84C18" }}>
                  <p className="font-mono text-[6.5px] uppercase tracking-widest mb-0.5" style={{ color: "#C9A84C55" }}>
                    Surname / Nom
                  </p>
                  <p className="font-display font-bold text-white text-sm leading-tight truncate"
                    style={{ letterSpacing: "-0.01em" }}>
                    {profile.last_name.toUpperCase()}
                  </p>
                </div>
                <div className="pb-2 border-b" style={{ borderColor: "#C9A84C18" }}>
                  <p className="font-mono text-[6.5px] uppercase tracking-widest mb-0.5" style={{ color: "#C9A84C55" }}>
                    Given Names / Prénoms
                  </p>
                  <p className="font-display font-bold text-white text-sm leading-tight truncate"
                    style={{ letterSpacing: "-0.01em" }}>
                    {profile.first_name.toUpperCase()}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-3">
                  <div>
                    <p className="font-mono text-[6.5px] uppercase tracking-widest mb-0.5" style={{ color: "#C9A84C55" }}>Issue Date</p>
                    <p className="font-mono text-[9px] text-white/65">{memberSince(profile.created_at)}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[6.5px] uppercase tracking-widest mb-0.5" style={{ color: "#C9A84C55" }}>Place of Origin</p>
                    <p className="font-mono text-[9px] text-white/65 uppercase">{location || "USA"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* MRZ */}
            <div className="rounded px-3 py-2.5" style={{ backgroundColor: "#00000030" }}>
              <p className="font-mono text-[8px] tracking-[0.18em] leading-5 break-all select-all"
                style={{ color: "#C9A84C40" }}>
                {`P<RML${profile.last_name.replace(/\s/g,"").toUpperCase().slice(0,8)}<<${profile.first_name.replace(/\s/g,"").toUpperCase().slice(0,8)}<<<<<<`}
              </p>
              <p className="font-mono text-[8px] tracking-[0.18em] break-all select-all"
                style={{ color: "#C9A84C40" }}>
                {`${code}0RML26${stamps.length.toString().padStart(2,"0")}<<<<<<<<<<<<<<<<<<`}
              </p>
            </div>
          </div>
        </div>

        {/* ── STAMP PAGES ── cream/parchment interior */}
        <div style={{ backgroundColor: "#FDFAF2" }}>

          {/* Page header */}
          <div className="px-5 pt-5 pb-3 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: "#1B2F5E20" }} />
            <p className="font-mono text-[8px] uppercase tracking-[0.3em]" style={{ color: "#1B2F5E55" }}>
              Visas &amp; Stamps
            </p>
            <div className="flex-1 h-px" style={{ backgroundColor: "#1B2F5E20" }} />
          </div>

          {/* Stamps grid */}
          <div className="px-4 pb-5 grid grid-cols-3 gap-1.5">
            {stamps.map(s => (
              <div key={s.id} className="relative">
                <PassportStamp stamp={s} />
                {s.source === "custom" && (
                  <button
                    onClick={() => handleRemoveStamp(s.id)}
                    disabled={removingId === s.id}
                    aria-label="Remove stamp"
                    title="Remove this stamp"
                    className="absolute top-0 right-1 w-5 h-5 rounded-full bg-white border border-[#6B1E3A]/30 shadow-sm flex items-center justify-center text-[#6B1E3A] hover:bg-[#6B1E3A] hover:text-white transition-all"
                  >
                    {removingId === s.id
                      ? <div className="w-2.5 h-2.5 rounded-full border border-[#6B1E3A]/40 border-t-[#6B1E3A] animate-spin" />
                      : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>}
                  </button>
                )}
              </div>
            ))}
            {/* Add a stamp tile */}
            <button
              onClick={() => setShowAdd(true)}
              className="group flex items-center justify-center transition-transform hover:scale-105"
              aria-label="Add a stamp"
            >
              <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
                <circle cx="60" cy="60" r="56" stroke="#1B2F5E" strokeWidth="2.5" strokeDasharray="4 3" opacity="0.5" className="group-hover:opacity-80 transition-opacity" />
                <circle cx="60" cy="42" r="13" stroke="#1B2F5E" strokeWidth="2.5" opacity="0.55" />
                <line x1="60" y1="36" x2="60" y2="48" stroke="#1B2F5E" strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
                <line x1="54" y1="42" x2="66" y2="42" stroke="#1B2F5E" strokeWidth="2.5" opacity="0.7" strokeLinecap="round" />
                <text x="60" y="74" textAnchor="middle" fill="#1B2F5E" fontSize="9" fontFamily="monospace" fontWeight="700" letterSpacing="1.5" opacity="0.6">ADD</text>
                <text x="60" y="86" textAnchor="middle" fill="#1B2F5E" fontSize="7" fontFamily="monospace" letterSpacing="1" opacity="0.45">A STAMP</text>
              </svg>
            </button>
            {Array.from({ length: Math.max(0, emptyCount - 1) }).map((_, i) => (
              <EmptyStamp key={`empty-${i}`} />
            ))}
          </div>

          {/* Page footer — referral strip */}
          <div className="mx-4 mb-5 rounded-lg py-2.5 px-4 flex items-center justify-between gap-2 border"
            style={{ backgroundColor: "#1B2F5E0a", borderColor: "#1B2F5E18" }}>
            <p className="font-mono text-[8px] uppercase tracking-widest" style={{ color: "#1B2F5E70" }}>
              rameelo.com/join?ref=
            </p>
            <p className="font-mono text-[9px] font-bold" style={{ color: "#1B2F5E" }}>{code}</p>
          </div>
        </div>
      </div>

      {/* Add a stamp — primary action */}
      <button
        onClick={() => setShowAdd(true)}
        className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-white transition-all hover:opacity-95 active:scale-[0.99]"
        style={{ backgroundColor: "#1B2F5E" }}
      >
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </div>
        <div className="flex-1 text-left">
          <p className="font-display font-bold text-[15px]" style={{ letterSpacing: "-0.01em" }}>Add a stamp</p>
          <p className="font-ui text-xs text-white/60">Danced at a garba? Stamp it — no ticket needed.</p>
        </div>
        <svg className="w-4 h-4 text-white/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>

      {/* Stamp callout */}
      {stamps.length === 0 ? (
        <div className="px-5 py-4 rounded-2xl border border-[#1B2F5E]/15 bg-[#1B2F5E]/5 text-center">
          <p className="font-display font-bold text-ink/70 text-sm mb-0.5" style={{ letterSpacing: "-0.01em" }}>Your passport is empty — for now</p>
          <p className="font-ui text-xs text-ink-muted mb-3">Add stamps for every garba you&apos;ve danced at, or buy a ticket to earn one automatically.</p>
          <Link href="/events" className="inline-block px-5 py-2.5 rounded-xl text-white font-ui font-semibold text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#1B2F5E" }}>
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="px-5 py-3.5 rounded-2xl border border-[#1B2F5E]/15 bg-[#1B2F5E]/5 flex items-center gap-3">
          <span className="text-xl">🪔</span>
          <div>
            <p className="font-display font-bold text-ink/80 text-sm" style={{ letterSpacing: "-0.01em" }}>
              {stamps.length} garba{stamps.length !== 1 ? "s" : ""} stamped
            </p>
            <p className="font-ui text-xs text-ink-muted">Ticket stamps are locked in — your own stamps can be removed any time.</p>
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
          <span className="flex-1 text-left">{shared ? "Shared! 🎉" : "Share to Instagram Story"}</span>
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
          {!copied && <span className="font-mono text-[9px] uppercase tracking-widest text-ink/35 shrink-0">Copy</span>}
        </button>
      </div>

      <div className="text-center pb-4">
        <p className="font-display font-bold text-ink/50 text-sm" style={{ letterSpacing: "-0.01em" }}>
          The garba community grows when you share 🙏
        </p>
      </div>

    </div>
  );
}
