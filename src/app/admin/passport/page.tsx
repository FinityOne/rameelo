"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  city: string | null;
  state: string | null;
  organization_name: string | null;
};

type Stamp = {
  id: string; // local key
  artist: string;
  city: string;
  date: string;
  eventTitle: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2); }

function memberCode(first: string, last: string, seed: string): string {
  const initials = `${(first[0] ?? "R").toUpperCase()}${(last[0] ?? "M").toUpperCase()}`;
  const hash = seed.replace(/-/g, "").slice(0, 6).toUpperCase().padEnd(6, "X");
  return `${initials}${hash}`;
}

function stampDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STAMP_COLORS = [
  "#1B3A5C", "#6B1E3A", "#1A3B3B", "#3B2200", "#4A1942", "#2E1B30", "#1C3B2D",
];
const STAMP_ROTATIONS = [-4, 3, -2, 5, -3, 4, -5, 2];

function PassportStamp({ stamp, index }: { stamp: Stamp; index: number }) {
  const color = STAMP_COLORS[index % STAMP_COLORS.length];
  const rot   = STAMP_ROTATIONS[index % STAMP_ROTATIONS.length];
  const name  = stamp.artist || "Artist";
  const words = name.toUpperCase().split(" ");
  const half  = Math.ceil(words.length / 2);
  const line1 = words.slice(0, half).join(" ");
  const line2 = words.slice(half).join(" ");
  const single = name.length <= 11;
  const city  = stamp.city ? stamp.city.slice(0, 13).toUpperCase() : "";
  const date  = stampDate(stamp.date);

  return (
    <div className="flex items-center justify-center" style={{ transform: `rotate(${rot}deg)` }}>
      <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
        <circle cx="60" cy="60" r="56" stroke={color} strokeWidth="3" opacity="0.9" />
        <circle cx="60" cy="60" r="50" stroke={color} strokeWidth="1" strokeDasharray="3.5 2.5" opacity="0.5" />
        <circle cx="60" cy="60" r="44" stroke={color} strokeWidth="0.75" opacity="0.3" />
        <rect x="22" y="19" width="76" height="11" rx="1" fill={color} opacity="0.08" />
        <text x="60" y="26.5" textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize="6" fontFamily="monospace" fontWeight="700" letterSpacing="2.5" opacity="0.7">
          GARBA NIGHT
        </text>
        {single ? (
          <text x="60" y="58" textAnchor="middle" dominantBaseline="middle"
            fill={color} fontSize="13.5" fontFamily="Georgia, serif" fontWeight="700" letterSpacing="0.5">
            {name.slice(0, 12)}
          </text>
        ) : (
          <>
            <text x="60" y="51" textAnchor="middle" dominantBaseline="middle"
              fill={color} fontSize="12" fontFamily="Georgia, serif" fontWeight="700" letterSpacing="0.5">
              {line1.slice(0, 12)}
            </text>
            <text x="60" y="64" textAnchor="middle" dominantBaseline="middle"
              fill={color} fontSize="12" fontFamily="Georgia, serif" fontWeight="700" letterSpacing="0.5">
              {line2.slice(0, 12)}
            </text>
          </>
        )}
        <line x1="30" y1="73" x2="90" y2="73" stroke={color} strokeWidth="0.75" opacity="0.35" />
        {city && (
          <text x="60" y="81" textAnchor="middle" dominantBaseline="middle"
            fill={color} fontSize="7" fontFamily="monospace" fontWeight="600" letterSpacing="1.5" opacity="0.7">
            {city}
          </text>
        )}
        <text x="60" y="91" textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize="6.5" fontFamily="monospace" letterSpacing="0.5" opacity="0.5">
          {date}
        </text>
        <circle cx="8"   cy="60" r="2" fill={color} opacity="0.2" />
        <circle cx="112" cy="60" r="2" fill={color} opacity="0.2" />
      </svg>
    </div>
  );
}

function EmptyStamp() {
  return (
    <div className="flex items-center justify-center opacity-[0.15]">
      <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
        <circle cx="60" cy="60" r="56" stroke="#2E1B30" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="60" cy="60" r="44" stroke="#2E1B30" strokeWidth="0.75" />
        <text x="60" y="62" textAnchor="middle" dominantBaseline="middle"
          fill="#2E1B30" fontSize="24" fontFamily="Georgia, serif" opacity="0.5">?</text>
      </svg>
    </div>
  );
}

// ── Passport Card (pure presentational, used for preview + print) ─────────────

function PassportCard({
  firstName, lastName, city, state, memberSince, code, stamps,
}: {
  firstName: string; lastName: string; city: string; state: string;
  memberSince: string; code: string; stamps: Stamp[];
}) {
  const initials   = `${(firstName[0] ?? "?").toUpperCase()}${(lastName[0] ?? "?").toUpperCase()}`;
  const location   = [city, state].filter(Boolean).join(", ");
  const MIN_SLOTS  = 6;
  const emptyCount = Math.max(0, MIN_SLOTS - stamps.length);

  const sinceLabel = memberSince
    ? new Date(memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  return (
    <div id="passport-card" className="rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.22)] select-none" style={{ maxWidth: 360 }}>

      {/* ── COVER ── */}
      <div className="relative overflow-hidden" style={{ backgroundColor: "#1B2F5E" }}>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "repeating-linear-gradient(45deg,#C9A84C 0px,#C9A84C 1px,transparent 1px,transparent 8px)" }} />
        {/* Border lines */}
        {["top","bottom"].map(side => (
          <div key={side} className={`absolute inset-x-0 ${side}-0 h-[1.5px]`}
            style={{ background: "linear-gradient(90deg,transparent,#C9A84C60,#C9A84C,#C9A84C60,transparent)" }} />
        ))}
        {["top","bottom"].map(side => (
          <div key={`i${side}`} className={`absolute inset-x-4 ${side}-[5px] h-px`}
            style={{ backgroundColor: "#C9A84C22" }} />
        ))}
        {["left","right"].map(side => (
          <div key={side} className={`absolute inset-y-0 ${side}-0 w-[1.5px]`}
            style={{ background: "linear-gradient(180deg,transparent,#C9A84C60,#C9A84C,#C9A84C60,transparent)" }} />
        ))}
        {["left","right"].map(side => (
          <div key={`i${side}`} className={`absolute inset-y-4 ${side}-[5px] w-px`}
            style={{ backgroundColor: "#C9A84C22" }} />
        ))}
        {/* Mandala watermark */}
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

        <div className="relative px-6 pt-7 pb-6">
          <p className="text-center font-mono text-[7.5px] uppercase tracking-[0.38em] mb-3"
            style={{ color: "#C9A84C90" }}>United&nbsp;States&nbsp;of&nbsp;Garba</p>

          <div className="text-center mb-5">
            <p className="font-display font-bold text-white text-base mb-0.5"
              style={{ letterSpacing: "0.18em", textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>RAMEELO</p>
            <p className="font-mono font-bold tracking-[0.35em] uppercase"
              style={{ fontSize: "13px", color: "#C9A84Ccc" }}>PASSPORT</p>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <div className="h-px flex-1" style={{ backgroundColor: "#C9A84C25" }} />
              <span className="font-mono text-[7px] tracking-widest uppercase" style={{ color: "#C9A84C55" }}>Navratri 2026</span>
              <div className="h-px flex-1" style={{ backgroundColor: "#C9A84C25" }} />
            </div>
          </div>

          {/* Portrait + fields */}
          <div className="flex items-start gap-4 mb-5">
            <div className="shrink-0 flex flex-col items-center gap-1">
              <div className="w-[68px] h-[84px] rounded-sm overflow-hidden border flex items-center justify-center"
                style={{ borderColor: "#C9A84C40", backgroundColor: "#0d1a3a" }}>
                <span className="font-display font-bold text-[28px]" style={{ color: "#C9A84C" }}>{initials}</span>
              </div>
              <p className="font-mono text-[6px] uppercase tracking-widest" style={{ color: "#C9A84C45" }}>Photo</p>
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="pb-2 border-b" style={{ borderColor: "#C9A84C18" }}>
                <p className="font-mono text-[6.5px] uppercase tracking-widest mb-0.5" style={{ color: "#C9A84C55" }}>Surname / Nom</p>
                <p className="font-display font-bold text-white text-sm leading-tight truncate">{(lastName || "—").toUpperCase()}</p>
              </div>
              <div className="pb-2 border-b" style={{ borderColor: "#C9A84C18" }}>
                <p className="font-mono text-[6.5px] uppercase tracking-widest mb-0.5" style={{ color: "#C9A84C55" }}>Given Names / Prénoms</p>
                <p className="font-display font-bold text-white text-sm leading-tight truncate">{(firstName || "—").toUpperCase()}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-3">
                <div>
                  <p className="font-mono text-[6.5px] uppercase tracking-widest mb-0.5" style={{ color: "#C9A84C55" }}>Issue Date</p>
                  <p className="font-mono text-[9px] text-white/65">{sinceLabel}</p>
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
            <p className="font-mono text-[8px] tracking-[0.18em] leading-5 break-all"
              style={{ color: "#C9A84C40" }}>
              {`P<RML${(lastName || "X").replace(/\s/g,"").toUpperCase().slice(0,8)}<<${(firstName || "X").replace(/\s/g,"").toUpperCase().slice(0,8)}<<<<<<`}
            </p>
            <p className="font-mono text-[8px] tracking-[0.18em] break-all" style={{ color: "#C9A84C40" }}>
              {`${code}0RML26${stamps.length.toString().padStart(2,"0")}<<<<<<<<<<<<<<<<<<`}
            </p>
          </div>
        </div>
      </div>

      {/* ── STAMPS PAGE ── */}
      <div style={{ backgroundColor: "#FDFAF2" }}>
        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
          <div className="flex-1 h-px" style={{ backgroundColor: "#2E1B3020" }} />
          <p className="font-mono text-[8px] uppercase tracking-[0.3em]" style={{ color: "#2E1B3055" }}>Visas &amp; Stamps</p>
          <div className="flex-1 h-px" style={{ backgroundColor: "#2E1B3020" }} />
        </div>
        <div className="px-4 pb-5 grid grid-cols-3 gap-1.5">
          {stamps.map((s, i) => <PassportStamp key={s.id} stamp={s} index={i} />)}
          {Array.from({ length: emptyCount }).map((_, i) => <EmptyStamp key={i} />)}
        </div>
        <div className="mx-4 mb-5 rounded-lg py-2.5 px-4 flex items-center justify-between gap-2 border"
          style={{ backgroundColor: "#1B2F5E0a", borderColor: "#1B2F5E18" }}>
          <p className="font-mono text-[8px] uppercase tracking-widest" style={{ color: "#1B2F5E70" }}>rameelo.com/join?ref=</p>
          <p className="font-mono text-[9px] font-bold" style={{ color: "#1B2F5E" }}>{code}</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PassportGeneratorPage() {
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [firstName, setFirstName]   = useState("");
  const [lastName,  setLastName]    = useState("");
  const [city,      setCity]        = useState("");
  const [state,     setState]       = useState("");
  const [memberSince, setMemberSince] = useState(new Date().toISOString().slice(0, 10));
  const [stamps, setStamps]         = useState<Stamp[]>([{ id: uid(), artist: "", city: "", date: "", eventTitle: "" }]);
  const [saving, setSaving]         = useState(false);
  const [saved,  setSaved]          = useState(false);
  const [leadSearch, setLeadSearch] = useState("");

  const code = memberCode(firstName, lastName, selectedLead?.id ?? uid());

  useEffect(() => {
    document.title = "Passport Generator | Admin";
    const supabase = createClient();
    supabase.from("sales_leads")
      .select("id, first_name, last_name, city, state, organization_name")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setLeads(data ?? []));
  }, []);

  // When a lead is selected, populate fields + load their existing past events as stamps
  async function selectLead(lead: Lead) {
    setSelectedLead(lead);
    setFirstName(lead.first_name);
    setLastName(lead.last_name);
    setCity(lead.city ?? "");
    setState(lead.state ?? "");
    setLeadSearch(`${lead.first_name} ${lead.last_name}`);
    setSaved(false);

    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data: events } = await supabase
      .from("events")
      .select("id, title, city, state, start_date, artist")
      .eq("lead_id", lead.id)
      .lt("start_date", today)
      .order("start_date", { ascending: false })
      .limit(6);

    if (events && events.length > 0) {
      setStamps(events.map(e => ({
        id: uid(),
        artist: e.artist ?? "",
        city: e.city ?? "",
        date: e.start_date ?? "",
        eventTitle: e.title ?? "",
      })));
    } else {
      setStamps([{ id: uid(), artist: "", city: "", date: "", eventTitle: "" }]);
    }
  }

  function addStamp() {
    if (stamps.length >= 9) return;
    setStamps(prev => [...prev, { id: uid(), artist: "", city: "", date: "", eventTitle: "" }]);
  }

  function removeStamp(id: string) {
    setStamps(prev => prev.filter(s => s.id !== id));
  }

  function updateStamp(id: string, field: keyof Stamp, value: string) {
    setStamps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  async function saveToLead() {
    if (!selectedLead) return;
    setSaving(true);
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    const toInsert = stamps
      .filter(s => s.artist || s.eventTitle)
      .map(s => ({
        title:              s.eventTitle || `${s.artist} Garba`,
        artist:             s.artist || null,
        start_date:         s.date || today,
        city:               s.city || null,
        status:             "published",
        selling_on_rameelo: false,
        category:           "garba",
        lead_id:            selectedLead.id,
      }));

    if (toInsert.length > 0) {
      await supabase.from("events").insert(toInsert);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handlePrint() {
    window.print();
  }

  const filteredLeads = leads.filter(l =>
    `${l.first_name} ${l.last_name} ${l.organization_name ?? ""}`.toLowerCase()
      .includes(leadSearch.toLowerCase())
  );

  const inputCls = "w-full rounded-lg border border-ivory-200 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all";
  const labelCls = "block font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-1";

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #passport-card, #passport-card * { visibility: visible !important; }
          #passport-card {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 360px !important;
            box-shadow: none !important;
          }
          @page { margin: 0; size: A5 portrait; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>
              Passport Generator
            </h1>
            <p className="font-ui text-sm text-ink-muted mt-0.5">
              Build a personalised Garba Passport for any lead — then screenshot and share it.
            </p>
          </div>
          <Link href="/admin/pipeline"
            className="font-ui text-sm text-ink/40 hover:text-ink/70 transition-colors">
            ← Back to Pipeline
          </Link>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">

          {/* ── LEFT: Form ── */}
          <div className="space-y-6">

            {/* Lead selector */}
            <div className="rounded-2xl border border-ivory-200 bg-white p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-aubergine/10 flex items-center justify-center text-xs">🔗</div>
                <h2 className="font-display font-bold text-ink text-sm">Link to a Lead</h2>
              </div>

              <div className="relative">
                <label className={labelCls}>Search leads</label>
                <input
                  type="text"
                  value={leadSearch}
                  onChange={e => { setLeadSearch(e.target.value); if (!e.target.value) setSelectedLead(null); }}
                  placeholder="Name or organisation…"
                  className={inputCls}
                />
                {leadSearch && !selectedLead && filteredLeads.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-ivory-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {filteredLeads.slice(0, 8).map(l => (
                      <button key={l.id} onClick={() => selectLead(l)}
                        className="w-full text-left px-4 py-2.5 hover:bg-ivory transition-colors flex items-center justify-between">
                        <div>
                          <p className="font-ui text-sm text-ink font-medium">{l.first_name} {l.last_name}</p>
                          {l.organization_name && <p className="font-ui text-xs text-ink-muted">{l.organization_name}</p>}
                        </div>
                        {(l.city || l.state) && (
                          <p className="font-mono text-[10px] text-ink/30">{[l.city, l.state].filter(Boolean).join(", ")}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedLead && (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-aubergine/5 border border-aubergine/15">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-peacock" />
                    <p className="font-ui text-sm text-ink font-medium">
                      {selectedLead.first_name} {selectedLead.last_name}
                    </p>
                    {selectedLead.organization_name && (
                      <p className="font-ui text-xs text-ink/40">· {selectedLead.organization_name}</p>
                    )}
                  </div>
                  <button onClick={() => { setSelectedLead(null); setLeadSearch(""); }}
                    className="text-ink/30 hover:text-ink/60 text-xs transition-colors">✕</button>
                </div>
              )}
            </div>

            {/* Personal details */}
            <div className="rounded-2xl border border-ivory-200 bg-white p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-aubergine/10 flex items-center justify-center text-xs">👤</div>
                <h2 className="font-display font-bold text-ink text-sm">Personal Details</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>First name</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Priya" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Last name</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Patel" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Edison" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input type="text" value={state} onChange={e => setState(e.target.value)} placeholder="NJ" maxLength={2} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Member Since</label>
                  <input type="date" value={memberSince} onChange={e => setMemberSince(e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>

            {/* Stamps */}
            <div className="rounded-2xl border border-ivory-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-aubergine/10 flex items-center justify-center text-xs">🎟️</div>
                  <h2 className="font-display font-bold text-ink text-sm">Garba Stamps</h2>
                  <span className="font-mono text-[9px] text-ink/30">{stamps.length}/9</span>
                </div>
                {stamps.length < 9 && (
                  <button onClick={addStamp}
                    className="font-ui text-xs text-aubergine font-semibold hover:text-aubergine/70 transition-colors">
                    + Add stamp
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {stamps.map((s, i) => (
                  <div key={s.id} className="rounded-xl border border-ivory-200 p-3 space-y-2 bg-ivory/30">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] text-ink/30 uppercase tracking-widest">Stamp {i + 1}</span>
                      {stamps.length > 1 && (
                        <button onClick={() => removeStamp(s.id)}
                          className="text-ink/20 hover:text-durga text-xs transition-colors">✕</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className={labelCls}>Artist Name *</label>
                        <input type="text" value={s.artist} onChange={e => updateStamp(s.id, "artist", e.target.value)}
                          placeholder="Atul Purohit" className={inputCls} />
                      </div>
                      <div className="col-span-2">
                        <label className={labelCls}>Event Title</label>
                        <input type="text" value={s.eventTitle} onChange={e => updateStamp(s.id, "eventTitle", e.target.value)}
                          placeholder="Chicago Dada Garba" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>City</label>
                        <input type="text" value={s.city} onChange={e => updateStamp(s.id, "city", e.target.value)}
                          placeholder="Chicago" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Date</label>
                        <input type="date" value={s.date} onChange={e => updateStamp(s.id, "date", e.target.value)}
                          className={inputCls} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:opacity-90 transition-opacity">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / Screenshot
              </button>

              {selectedLead && (
                <button
                  onClick={saveToLead}
                  disabled={saving}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-ui font-semibold text-sm border transition-all ${saved ? "bg-peacock/10 border-peacock/30 text-peacock" : "bg-white border-ivory-200 text-ink hover:border-aubergine/30 hover:text-aubergine"} disabled:opacity-50`}>
                  {saving ? "Saving…" : saved ? "✓ Saved to lead" : "Save stamps to lead"}
                </button>
              )}
            </div>

          </div>

          {/* ── RIGHT: Live preview ── */}
          <div className="lg:sticky lg:top-6 space-y-3">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/30 text-center">Live Preview</p>
            <PassportCard
              firstName={firstName}
              lastName={lastName}
              city={city}
              state={state}
              memberSince={memberSince}
              code={code}
              stamps={stamps}
            />
            <p className="font-mono text-[8px] text-ink/25 text-center">
              Click &ldquo;Print / Screenshot&rdquo; → Save as PDF, or use your OS screenshot tool on the preview
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
