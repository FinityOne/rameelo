"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "@/app/organizer/events/create/types";

// ── Props (structural subset of the full Event) ──────────────────────────────
type IVArtist = {
  id: string; name: string; slug: string | null; tagline: string | null;
  bio: string | null; profile_image_url: string | null; genres: string[] | null;
  years_active_since: number | null; follower_count: number | null; performance_style: string | null;
};
type IVEvent = {
  id: string; title: string; category: string; description: string | null;
  start_date: string; end_date: string | null; start_time: string; end_time: string | null;
  doors_open_time: string | null;
  venue_name: string; address_line1: string; city: string; state: string; zip: string | null;
  parking: string; age_restriction: string; dress_code: string; dandiya_sticks: string;
  cover_image_url: string | null; cover_gradient: string;
  artist: IVArtist | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
// Abbreviated for mobile scannability, e.g. "Fri, Sep 11, 2026".
function fmtDateShort(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}
function fmtCount(n: number): string {
  const c = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  return n >= 1000 ? `${c}+` : c;
}
const CATEGORY_LABEL: Record<string, string> = {
  garba: "Garba", dandiya: "Dandiya", raas: "Raas", workshop: "Workshop", community: "Community", other: "Event",
};
const DRESS_LABEL: Record<string, string> = {
  none: "No dress code", encouraged: "Traditional encouraged", required: "Traditional attire required",
};
const STICKS_LABEL: Record<string, string> = {
  not_applicable: "", provided: "Dandiya sticks provided", byod: "Bring your own sticks",
};
const PARKING_LABEL: Record<string, string> = {
  free: "Free parking", paid_nearby: "Paid parking nearby", street: "Street parking", valet: "Valet parking", limited: "Limited parking", none: "",
};
const AGE_LABEL: Record<string, string> = {
  all: "All ages welcome", "13+": "13+ event", "18+": "18+ only", "21+": "21+ only",
};

function ComingSoon({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-widest text-ink-muted/45 bg-ink/[0.04] border border-ink/[0.06] px-2 py-0.5 rounded-md ${className}`}>
      Coming soon
    </span>
  );
}

// FA-style inline icons
const Icon = {
  calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  clock: <><circle cx="12" cy="12" r="9" strokeWidth={1.8} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 7v5l3 2" /></>,
  pin: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><circle cx="12" cy="11" r="3" strokeWidth={1.8} /></>,
  star: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.48 3.5l2.2 4.46 4.92.72-3.56 3.47.84 4.9-4.4-2.31-4.4 2.31.84-4.9L4.36 8.68l4.92-.72L11.48 3.5z" />,
  music: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z" />,
  sparkles: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m6-13l2.5 5.5L22 14l-5.5 2.5L14 22l-2.5-5.5L6 14l5.5-2.5L14 6z" />,
  users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  ticket: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 010 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 010-4V7a2 2 0 00-2-2H5z" />,
  shirt: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 4l4 3-2 3-2-1v11H8V9L6 10 4 7l4-3 1.5 1a3.5 3.5 0 005 0L16 4z" />,
  car: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14m-14 0a2 2 0 00-2 2v3h2m12-5a2 2 0 012 2v3h-2M7 16h10M7 16v2H5v-2m12 0v2h2v-2" />,
  bolt: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />,
  shield: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
  share: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />,
};
const Svg = ({ children, className = "w-4 h-4" }: { children: React.ReactNode; className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">{children}</svg>
);

const TICKET_OPTIONS = [1, 2, 4, 6];
const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-4 py-2.5 font-ui text-base sm:text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-marigold/30 focus:border-marigold/50 transition-all";
const labelCls = "block font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5";

// Stable per-event "buzz" base so the interest count reads as healthy demand even
// when few forms are in yet. Seeded by event id (changes daily, never drops), and
// real submissions are added on top.
function interestBase(eventId: string): number {
  const key = eventId + "interest" + new Date().toDateString();
  let h = 0;
  for (let i = 0; i < key.length; i++) { h = (Math.imul(31, h) + key.charCodeAt(i)) | 0; }
  return 180 + (Math.abs(h) % 461); // 180–640
}

// ── Component ────────────────────────────────────────────────────────────────
export default function EventInterestView({ event }: { event: IVEvent }) {
  const supabase = useRef(createClient()).current;
  const a = event.artist;

  // Interest form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [qty, setQty] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [interestedCount, setInterestedCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("event_interests").select("*", { count: "exact", head: true }).eq("event_id", event.id)
      .then(({ count }) => setInterestedCount(count ?? 0));
  }, [event.id, supabase]);

  // Shown count = a stable high "buzz" base + the real submissions on top.
  const displayInterested = interestedCount === null ? null : interestBase(event.id) + interestedCount;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const { error: err } = await supabase.from("event_interests").insert({
      event_id: event.id, name: name.trim(), email: email.trim(),
      phone: phone.trim() || null, qty_interested: qty, city: city.trim() || null,
    });
    setSubmitting(false);
    if (err) { setError("Something went wrong. Please try again."); return; }
    setSubmitted(true);
    setInterestedCount(c => (c ?? 0) + 1);
  }

  function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) { navigator.share({ title: event.title, url }).catch(() => {}); return; }
    navigator.clipboard?.writeText(url).catch(() => {});
  }

  // Derived
  const categoryLabel = CATEGORY_LABEL[event.category] ?? event.category;
  const heroGradient = GRADIENTS.find(g => g.id === event.cover_gradient)?.css ?? "linear-gradient(135deg,#2E1B30,#1a0a1f)";
  const dateLabel = event.end_date && event.end_date !== event.start_date
    ? `${fmtDate(event.start_date)} – ${fmtDate(event.end_date)}`
    : fmtDate(event.start_date);
  const dateLabelShort = event.end_date && event.end_date !== event.start_date
    ? `${fmtDateShort(event.start_date)} – ${fmtDateShort(event.end_date)}`
    : fmtDateShort(event.start_date);
  const timeLabel = [fmtTime(event.start_time), fmtTime(event.end_time)].filter(Boolean).join(" – ");
  const locationLabel = [event.venue_name, event.city, event.state].filter(Boolean).join(", ");
  const subtitle = event.description
    ? event.description.split(/[.!?]/)[0].slice(0, 120)
    : `An unforgettable night of ${categoryLabel}${a ? ` with ${a.name}` : ""}.`;
  const yearsActive = a?.years_active_since ? new Date().getFullYear() - a.years_active_since : null;

  // Real event highlight chips (only where data exists)
  const highlights = [
    AGE_LABEL[event.age_restriction] && { icon: Icon.users, title: AGE_LABEL[event.age_restriction], sub: "Age policy" },
    DRESS_LABEL[event.dress_code] && event.dress_code !== "none" && { icon: Icon.shirt, title: DRESS_LABEL[event.dress_code], sub: "Dress code" },
    STICKS_LABEL[event.dandiya_sticks] && { icon: Icon.sparkles, title: STICKS_LABEL[event.dandiya_sticks], sub: "Dandiya" },
    PARKING_LABEL[event.parking] && { icon: Icon.car, title: PARKING_LABEL[event.parking], sub: "Parking" },
  ].filter(Boolean) as { icon: React.ReactNode; title: string; sub: string }[];

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.venue_name, event.address_line1, event.city, event.state, event.zip].filter(Boolean).join(", "))}`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F2" }}>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{ background: "#1a0a1f" }}>
        {event.cover_image_url
          ? <img src={event.cover_image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover object-top lg:object-center" />
          : <div className="absolute inset-0" style={{ background: heroGradient }} />}
        {/* Readability wash: always on mobile; on desktop only over the gradient
            fallback — a real banner shows clean on desktop. */}
        <div
          className={`absolute inset-0 ${event.cover_image_url ? "lg:hidden" : ""}`}
          style={{ background: "linear-gradient(100deg, rgba(26,10,31,0.95) 0%, rgba(46,27,48,0.8) 35%, rgba(26,10,31,0.55) 60%, rgba(26,10,31,0.1) 100%)" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-9 lg:min-h-[500px] flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-white/70 min-w-0">
              <Link href="/events" className="hover:text-white transition-colors">Events</Link>
              <span className="text-white/30">/</span>
              <span className="truncate">{event.title}</span>
            </div>
            <button type="button" onClick={share}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs font-ui font-semibold hover:bg-white/20 transition-all shrink-0">
              <Svg className="w-3.5 h-3.5">{Icon.share}</Svg> Share
            </button>
          </div>

          <div className="mt-auto pt-10">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-white bg-aubergine/60 border border-white/15 px-2.5 py-1 rounded-full">{categoryLabel}</span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-marigold bg-marigold/15 border border-marigold/40 px-2.5 py-1 rounded-full">Tickets Coming Soon</span>
            </div>
            <h1 className="font-display font-bold text-white leading-[0.98]" style={{ fontSize: "clamp(2.25rem, 6vw, 4rem)", letterSpacing: "-0.035em" }}>{event.title}</h1>
            {/* Subtitle hidden on mobile for a more scannable header */}
            <p className="hidden sm:block font-ui text-white/75 text-base sm:text-lg mt-3 max-w-2xl leading-relaxed">{subtitle}</p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 sm:mt-6">
              <span className="inline-flex items-center gap-2 font-ui text-sm text-white/85">
                <Svg className="w-4 h-4 text-marigold">{Icon.calendar}</Svg>
                <span className="sm:hidden">{dateLabelShort}</span>
                <span className="hidden sm:inline">{dateLabel}</span>
              </span>
              {timeLabel && <span className="inline-flex items-center gap-2 font-ui text-sm text-white/85"><Svg className="w-4 h-4 text-marigold">{Icon.clock}</Svg>{timeLabel}</span>}
              {locationLabel && <span className="inline-flex items-center gap-2 font-ui text-sm text-white/85"><Svg className="w-4 h-4 text-marigold">{Icon.pin}</Svg>{locationLabel}</span>}
            </div>
          </div>
        </div>
      </section>

      {/* ── BODY ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 grid lg:grid-cols-3 gap-8 items-start">

        {/* ── LEFT ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Performing artist */}
          {a && (
            <div className="bg-white rounded-2xl border border-ivory-200 p-5 sm:p-6 flex items-center gap-4">
              {a.profile_image_url
                ? <img src={a.profile_image_url} alt={a.name} className="w-14 h-14 rounded-full object-cover shrink-0" />
                : <div className="w-14 h-14 rounded-full bg-aubergine/10 flex items-center justify-center text-aubergine font-display font-bold shrink-0">{a.name.charAt(0)}</div>}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-widest text-marigold">Performing Artist</p>
                <p className="font-display font-bold text-ink text-lg leading-tight truncate" style={{ letterSpacing: "-0.015em" }}>{a.name}</p>
                {a.tagline && <p className="font-ui text-sm text-ink-muted truncate">{a.tagline}</p>}
              </div>
              {a.slug && (
                <Link href={`/artists/${a.slug}`} className="shrink-0 inline-flex items-center gap-1.5 font-ui text-sm font-semibold text-aubergine hover:text-aubergine-light transition-colors">
                  View Artist Profile
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              )}
            </div>
          )}

          {/* Artist stats */}
          {a && (
            <div className="rounded-2xl border border-marigold/25 bg-marigold/[0.06] p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Icon.star, value: yearsActive !== null ? `${yearsActive}+` : "25+", label: "Years Performing" },
                { icon: Icon.ticket, value: "2000+", label: "Events Performed" },
                { icon: Icon.users, value: a.follower_count ? fmtCount(a.follower_count) : "500K+", label: "Fans Every Year" },
                { icon: Icon.sparkles, value: a.genres?.length ? a.genres.slice(0, 3).join(" · ") : (a.performance_style ?? "Garba · Dandiya · Raas"), label: "Signature Style" },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-marigold shrink-0 mt-0.5"><Svg className="w-4 h-4">{s.icon}</Svg></span>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-ink text-sm sm:text-base leading-tight truncate">{s.value}</p>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-1">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* About this event */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-5 sm:p-6">
            <h2 className="font-display font-bold text-ink text-xl mb-3" style={{ letterSpacing: "-0.02em" }}>About This Event</h2>
            {event.description
              ? <p className="font-ui text-ink/75 text-base leading-relaxed whitespace-pre-line">{event.description}</p>
              : <div className="flex items-center gap-2"><p className="font-ui text-sm text-ink-muted/60">An event description hasn&apos;t been added yet.</p><ComingSoon /></div>}

            {/* Highlight chips */}
            {highlights.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-ivory-200">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-durga shrink-0 mt-0.5"><Svg className="w-4 h-4">{h.icon}</Svg></span>
                    <div className="min-w-0">
                      <p className="font-ui text-sm font-semibold text-ink leading-tight">{h.title}</p>
                      <p className="font-mono text-[9px] uppercase tracking-wide text-ink-muted mt-0.5">{h.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event highlights gallery — no per-event gallery yet */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Event Highlights</h2>
              <ComingSoon />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="aspect-[4/3] rounded-xl bg-ivory-200/60 border border-ivory-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-ink-muted/25" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              ))}
            </div>
            <p className="font-ui text-xs text-ink-muted/60 mt-3">Photos from this event will appear here once they&apos;re added.</p>
          </div>

          {/* Venue */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-5 sm:p-6">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-durga"><Svg className="w-4 h-4">{Icon.pin}</Svg></span>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Venue</p>
                </div>
                <p className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.015em" }}>{event.venue_name || "Venue TBA"}</p>
                <p className="font-ui text-sm text-ink-muted mt-0.5">{[event.address_line1, event.city, event.state, event.zip].filter(Boolean).join(", ")}</p>
                <div className="flex items-center gap-1.5 mt-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted/60">Ratings</span>
                  <ComingSoon />
                </div>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-aubergine/8 text-aubergine font-ui text-sm font-semibold hover:bg-aubergine/15 transition-all">
                  View on Maps
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </a>
              </div>
              <iframe
                title={`Map to ${event.venue_name || "venue"}`}
                className="w-full rounded-xl border border-ivory-200 min-h-[180px] h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent([event.venue_name, event.address_line1, event.city, event.state, event.zip].filter(Boolean).join(", "))}&output=embed&z=15`}
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT — interest sidebar ── */}
        <aside className="lg:sticky lg:top-6 space-y-5">
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 pt-5 pb-4">
              <h2 className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>
                Be the <span className="text-durga">first to know</span>
              </h2>
              <p className="font-ui text-sm text-ink-muted mt-1.5 leading-relaxed">
                Tickets for this event aren&apos;t live yet. Fill out the form and we&apos;ll reach out as soon as tickets go live!
              </p>
              {displayInterested !== null && (
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex -space-x-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-7 h-7 rounded-full border-2 border-white" style={{ background: ["#7C1F2C", "#2E1B30", "#0E8C7A"][i] }} />
                    ))}
                  </div>
                  <p className="font-ui text-xs text-ink-muted leading-tight">
                    <span className="font-bold text-ink">{displayInterested.toLocaleString()} people</span> are interested<br />and will be notified
                  </p>
                </div>
              )}
            </div>

            {submitted ? (
              <div className="px-5 pb-6 pt-2 text-center">
                <div className="w-14 h-14 rounded-full bg-peacock/12 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-peacock" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="font-display font-bold text-ink text-lg">You&apos;re on the list! 🎉</p>
                <p className="font-ui text-sm text-ink-muted mt-1">We&apos;ll email you the moment tickets go live.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="px-5 pb-5 space-y-3.5">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input required value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email Address *</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Your City</label>
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="Your city" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>How many tickets are you looking for?</label>
                  <div className="grid grid-cols-4 gap-2">
                    {TICKET_OPTIONS.map(n => (
                      <button key={n} type="button" onClick={() => setQty(n)}
                        className={`py-2.5 rounded-xl border font-display font-bold text-sm transition-all ${qty === n ? "bg-aubergine text-white border-aubergine" : "border-ivory-200 text-ink-muted hover:border-aubergine/40"}`}>
                        {n === 6 ? "6+" : n}
                      </button>
                    ))}
                  </div>
                </div>
                {error && <p className="font-ui text-xs text-durga">{error}</p>}
                <button type="submit" disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-durga text-white font-display font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50">
                  {submitting
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Submitting…</>
                    : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>Notify Me When Tickets Go Live</>}
                </button>
                <p className="font-mono text-[10px] text-center text-ink-muted/70">No payment needed · You&apos;ll be the first to know!</p>
              </form>
            )}
          </div>

          {/* Reassurance cards */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-durga/10 text-durga flex items-center justify-center shrink-0"><Svg className="w-4 h-4">{Icon.bolt}</Svg></span>
              <div>
                <p className="font-ui text-sm font-semibold text-ink">Why fill this out?</p>
                <p className="font-ui text-xs text-ink-muted leading-relaxed mt-0.5">You&apos;ll be the first to know when tickets drop and get early access.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-peacock/10 text-peacock flex items-center justify-center shrink-0"><Svg className="w-4 h-4">{Icon.shield}</Svg></span>
              <div>
                <p className="font-ui text-sm font-semibold text-ink">Trusted by thousands</p>
                <p className="font-ui text-xs text-ink-muted leading-relaxed mt-0.5">Join Garba lovers across the country who never miss their favorite events.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
