"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { parseCsv, buildRows, mapHeaders, importTemplateCsv, type ImportRow } from "@/lib/csv";

type Step = 1 | 2 | 3 | "done";
type PastEvent = { id: string; title: string; start_date: string };
type Batch = { id: string; label: string; created_count: number; matched_count: number; failed_count: number; total_rows: number; created_at: string };
type Result = { created: number; matched: number; failed: number; appliedToExisting: number; errors: string[] };

const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5 block";
const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all";

function fmtTS(d: string) { return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }); }
function fmtDay(d: string) { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

export default function ImportUsersPage() {
  const [step, setStep] = useState<Step>(1);

  // Parsed file
  const [filename, setFilename] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapped, setMapped] = useState<(string | null)[]>([]);
  const [stats, setStats] = useState({ invalid: 0, duplicates: 0 });
  const [parseError, setParseError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Enrichment
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [defaultCity, setDefaultCity] = useState("");
  const [defaultState, setDefaultState] = useState("");
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [applyToExisting, setApplyToExisting] = useState(false);

  // Dedup + data
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(false);
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [eventSearch, setEventSearch] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);

  // Commit
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [commitError, setCommitError] = useState("");

  useEffect(() => { document.title = "Import Users | Rameelo Admin"; loadBatches(); loadEvents(); }, []);

  async function loadBatches() {
    const supabase = createClient();
    const { data } = await supabase.from("user_import_batches").select("id, label, created_count, matched_count, failed_count, total_rows, created_at").order("created_at", { ascending: false }).limit(8);
    setBatches((data ?? []) as Batch[]);
  }
  async function loadEvents() {
    const supabase = createClient();
    const { data } = await supabase.from("events").select("id, title, start_date").order("start_date", { ascending: false }).limit(200);
    setPastEvents((data ?? []) as PastEvent[]);
  }

  function onFile(file: File) {
    setParseError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result ?? ""));
        if (parsed.headers.length === 0) { setParseError("That file looks empty."); return; }
        const m = mapHeaders(parsed.headers);
        if (!m.includes("email")) { setParseError("No email column found. Your CSV needs an 'email' column — download the template below."); return; }
        const built = buildRows(parsed);
        if (built.rows.length === 0) { setParseError("No rows with a valid email were found."); return; }
        setFilename(file.name);
        setHeaders(parsed.headers);
        setMapped(m);
        setRows(built.rows);
        setStats({ invalid: built.invalid, duplicates: built.duplicates });
        setLabel(file.name.replace(/\.[^.]+$/, ""));
      } catch {
        setParseError("Couldn't read that file. Make sure it's a CSV.");
      }
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const blob = new Blob([importTemplateCsv()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "rameelo-user-import-template.csv";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function reset() {
    setStep(1); setFilename(""); setRows([]); setHeaders([]); setMapped([]); setStats({ invalid: 0, duplicates: 0 });
    setLabel(""); setNote(""); setTags([]); setTagDraft(""); setDefaultCity(""); setDefaultState("");
    setEventIds([]); setApplyToExisting(false); setExisting(new Set()); setResult(null); setCommitError("");
    if (fileRef.current) fileRef.current.value = "";
    loadBatches();
  }

  // Dedup when entering review.
  async function goToReview() {
    setStep(2);
    setChecking(true);
    try {
      const res = await fetch("/api/admin/import-users/preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: rows.map(r => r.email) }),
      });
      const data = await res.json().catch(() => ({}));
      setExisting(new Set((data.existing ?? []).map((e: string) => e.toLowerCase())));
    } catch { /* leave existing empty — counts just show all as new */ }
    setChecking(false);
  }

  function addTag(raw: string) {
    const t = raw.trim().replace(/,$/, "");
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft("");
  }

  // Final rows with default city/state filled in.
  const finalRows = useMemo(() => rows.map(r => ({
    ...r,
    city: r.city || defaultCity.trim(),
    state: r.state || defaultState.trim().toUpperCase().slice(0, 2),
  })), [rows, defaultCity, defaultState]);

  const newCount = useMemo(() => rows.filter(r => !existing.has(r.email)).length, [rows, existing]);
  const matchedCount = rows.length - newCount;

  async function commit() {
    setSubmitting(true);
    setCommitError("");
    try {
      const res = await fetch("/api/admin/import-users/commit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || filename, filename, note: note.trim(), tags, eventIds, applyToExisting,
          rows: finalRows,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setCommitError(data.error || "Import failed. Please try again."); setSubmitting(false); return; }
      setResult(data as Result);
      setStep("done");
    } catch {
      setCommitError("Import failed. Please try again.");
    }
    setSubmitting(false);
  }

  const filteredEvents = pastEvents.filter(e => e.title.toLowerCase().includes(eventSearch.toLowerCase()));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Import Users</h2>
        <p className="font-ui text-ink-muted text-sm mt-0.5">
          Bulk-add people from a CSV — grouped per import, tagged, and optionally marked as past-event attendees. No emails are sent; accounts are created passwordless and can sign in with a code later.
        </p>
      </div>

      {/* Step indicator */}
      {step !== "done" && (
        <div className="flex items-center gap-2">
          {[{ n: 1, l: "Upload" }, { n: 2, l: "Review & tag" }, { n: 3, l: "Confirm" }].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              {i > 0 && <div className="w-6 h-px bg-ivory-200" />}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                (step as number) > s.n ? "bg-peacock text-white" : step === s.n ? "bg-aubergine text-white" : "bg-ivory-200 text-ink-muted"
              }`}>{(step as number) > s.n ? "✓" : s.n}</div>
              <span className={`font-mono text-[10px] uppercase tracking-widest ${step === s.n ? "text-ink" : "text-ink-muted/60"}`}>{s.l}</span>
            </div>
          ))}
        </div>
      )}

      {/* ════ STEP 1 — UPLOAD ════ */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-ivory-200 p-5">
            <label
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
              className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-ivory-200 rounded-2xl py-12 px-4 text-center cursor-pointer hover:border-aubergine/40 hover:bg-ivory/40 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-aubergine/8 flex items-center justify-center">
                <svg className="w-6 h-6 text-aubergine" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 13l3-3m0 0l3 3m-3-3v12" /></svg>
              </div>
              <div>
                <p className="font-display font-bold text-ink text-sm">{filename || "Drop a CSV here, or click to browse"}</p>
                <p className="font-ui text-xs text-ink-muted mt-0.5">CSV from Excel/Sheets · <strong className="text-ink">email is required</strong> on every row — it&rsquo;s the unique key and how future campaigns reach them. Rows without a valid email are skipped.</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            </label>

            <div className="flex items-center justify-between mt-3">
              <button onClick={downloadTemplate} className="inline-flex items-center gap-1.5 font-ui font-semibold text-xs text-aubergine hover:text-aubergine-light">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Download CSV template
              </button>
              <span className="font-mono text-[10px] text-ink-muted/70">first_name · last_name · email · phone · city · state · tags · notes</span>
            </div>

            {parseError && <p className="mt-3 font-ui text-sm text-durga bg-durga/8 border border-durga/20 rounded-xl px-3.5 py-2.5">{parseError}</p>}
          </div>

          {/* Parsed preview */}
          {rows.length > 0 && (
            <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
              <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Detected</p>
                <div className="flex items-center gap-3 font-mono text-[10px]">
                  <span className="text-peacock font-bold">{rows.length} valid rows</span>
                  {stats.duplicates > 0 && <span className="text-ink-muted">{stats.duplicates} dup{stats.duplicates !== 1 ? "s" : ""} merged</span>}
                  {stats.invalid > 0 && <span className="text-marigold-dark">{stats.invalid} skipped (no email)</span>}
                </div>
              </div>
              {/* Column mapping */}
              <div className="px-5 py-3 flex flex-wrap gap-1.5 border-b border-ivory-200">
                {headers.map((h, i) => (
                  <span key={i} className={`font-mono text-[10px] px-2 py-1 rounded-full ${mapped[i] ? "bg-peacock/10 text-peacock" : "bg-ivory-200 text-ink-muted/60"}`}>
                    {h}{mapped[i] ? ` → ${mapped[i]}` : " · ignored"}
                  </span>
                ))}
              </div>
              {/* First few rows */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-ivory-200">
                    {["Name", "Email", "Phone", "Location", "Tags"].map(h => <th key={h} className="px-4 py-2 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-ivory-200">
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-ui text-sm text-ink">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}</td>
                        <td className="px-4 py-2 font-ui text-xs text-ink-muted">{r.email}</td>
                        <td className="px-4 py-2 font-mono text-xs text-ink-muted">{r.phone || "—"}</td>
                        <td className="px-4 py-2 font-ui text-xs text-ink-muted">{[r.city, r.state].filter(Boolean).join(", ") || "—"}</td>
                        <td className="px-4 py-2 font-mono text-[10px] text-ink-muted">{r.tags.join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 5 && <p className="px-5 py-2 font-mono text-[10px] text-ink-muted/60 bg-ivory/40">+{rows.length - 5} more rows</p>}
              <div className="px-5 py-3 border-t border-ivory-200">
                <button onClick={goToReview} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-all">
                  Continue to review →
                </button>
              </div>
            </div>
          )}

          {/* Recent imports */}
          {batches.length > 0 && (
            <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
              <div className="px-5 py-3 bg-ivory border-b border-ivory-200"><p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Recent imports</p></div>
              <div className="divide-y divide-ivory-200">
                {batches.map(b => (
                  <div key={b.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0"><p className="font-ui text-sm text-ink truncate">{b.label}</p><p className="font-mono text-[10px] text-ink-muted">{fmtTS(b.created_at)}</p></div>
                    <span className="font-mono text-[10px] shrink-0">
                      <span className="text-peacock font-bold">+{b.created_count} added</span>
                      <span className="text-ink-muted"> · {b.matched_count} existed</span>
                      {b.failed_count > 0 && <span className="text-durga"> · {b.failed_count} failed</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════ STEP 2 — REVIEW & TAG ════ */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Dedup summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Rows in file", value: rows.length, cls: "text-ink" },
              { label: "Already on platform", value: checking ? "…" : matchedCount, cls: "text-ink-muted" },
              { label: "New users to add", value: checking ? "…" : newCount, cls: "text-peacock" },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-2xl border border-ivory-200 px-4 py-3.5">
                <p className={`font-display font-bold text-2xl ${c.cls}`} style={{ letterSpacing: "-0.02em" }}>{c.value}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-1">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-ivory-200 p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Import label *</label>
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Diwali Mela 2024 attendees" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Note <span className="text-ink-muted/50 normal-case">(optional)</span></label>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="Where this list came from…" className={inputCls} />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className={labelCls}>Tags <span className="text-ink-muted/50 normal-case">— applied to everyone in this import</span></label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-ivory-200 bg-white px-2.5 py-2">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 font-mono text-[11px] bg-aubergine/8 text-aubergine px-2 py-1 rounded-full">
                    {t}
                    <button onClick={() => setTags(tags.filter(x => x !== t))} className="hover:text-durga">×</button>
                  </span>
                ))}
                <input
                  value={tagDraft}
                  onChange={e => setTagDraft(e.target.value)}
                  onKeyDown={e => { if ((e.key === "Enter" || e.key === ",") && tagDraft.trim()) { e.preventDefault(); addTag(tagDraft); } else if (e.key === "Backspace" && !tagDraft && tags.length) setTags(tags.slice(0, -1)); }}
                  onBlur={() => tagDraft.trim() && addTag(tagDraft)}
                  placeholder={tags.length ? "" : "Type a tag, press Enter"}
                  className="flex-1 min-w-[120px] bg-transparent outline-none font-ui text-sm text-ink placeholder-ink-muted/40 py-1"
                />
              </div>
              <p className="font-mono text-[10px] text-ink-muted/60 mt-1.5">Per-row tags from the CSV are merged in too. Use these to target future email groups.</p>
            </div>

            {/* Default location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Default city <span className="text-ink-muted/50 normal-case">(fills blanks)</span></label>
                <input value={defaultCity} onChange={e => setDefaultCity(e.target.value)} placeholder="e.g. Edison" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Default state</label>
                <input value={defaultState} onChange={e => setDefaultState(e.target.value.toUpperCase().slice(0, 2))} placeholder="NJ" maxLength={2} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Attach to past events */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Mark as attendees of <span className="text-ink-muted/50 normal-case">(optional)</span></p>
              <p className="font-ui text-xs text-ink-muted mt-0.5">Attach everyone in this import to past events — for future “people who attended X” campaigns.</p>
            </div>
            <div className="p-3">
              <input value={eventSearch} onChange={e => setEventSearch(e.target.value)} placeholder="Search events…" className={`${inputCls} mb-2`} />
              <div className="max-h-52 overflow-auto rounded-xl border border-ivory-200 divide-y divide-ivory-200">
                {filteredEvents.length === 0 ? (
                  <p className="px-3.5 py-3 font-ui text-sm text-ink-muted">No events found.</p>
                ) : filteredEvents.map(e => {
                  const checked = eventIds.includes(e.id);
                  return (
                    <button key={e.id} onClick={() => setEventIds(checked ? eventIds.filter(x => x !== e.id) : [...eventIds, e.id])}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${checked ? "bg-aubergine/[0.04]" : "hover:bg-ivory/50"}`}>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-aubergine border-aubergine" : "border-ivory-200 bg-white"}`}>
                        {checked && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </span>
                      <span className="flex-1 min-w-0"><span className="font-ui text-sm text-ink truncate block">{e.title}</span><span className="font-mono text-[10px] text-ink-muted">{fmtDay(e.start_date)}</span></span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Apply to existing */}
          {matchedCount > 0 && (
            <button onClick={() => setApplyToExisting(v => !v)} className="w-full bg-white rounded-2xl border border-ivory-200 p-4 flex items-center justify-between gap-4 text-left hover:border-aubergine/25 transition-colors">
              <div>
                <p className="font-ui text-sm font-semibold text-ink">Also tag &amp; attach the {matchedCount} existing user{matchedCount !== 1 ? "s" : ""}</p>
                <p className="font-ui text-xs text-ink-muted mt-0.5">Apply the tags + event attendance above to people in this file who already have accounts. Off = they’re left untouched.</p>
              </div>
              <span className={`relative shrink-0 w-12 h-6 rounded-full transition-all ${applyToExisting ? "bg-peacock" : "bg-ivory-200"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${applyToExisting ? "translate-x-6" : ""}`} />
              </span>
            </button>
          )}

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(1)} className="font-ui font-semibold text-sm text-ink-muted hover:text-ink">← Back</button>
            <button onClick={() => setStep(3)} disabled={!label.trim()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-all disabled:opacity-50">
              Continue to confirm →
            </button>
          </div>
        </div>
      )}

      {/* ════ STEP 3 — CONFIRM ════ */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-ivory-200 p-5 space-y-4">
            <p className="font-display font-bold text-ink text-base">Review &amp; create</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "New users to create", value: newCount, big: true },
                { label: "Already on platform", value: applyToExisting ? `${matchedCount} (enriched)` : `${matchedCount} (skipped)` },
              ].map(c => (
                <div key={c.label} className="rounded-xl border border-ivory-200 bg-ivory/40 px-4 py-3">
                  <p className={`font-display font-bold ${c.big ? "text-peacock text-3xl" : "text-ink text-xl"}`} style={{ letterSpacing: "-0.02em" }}>{c.value}</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-1">{c.label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-ivory-200 divide-y divide-ivory-200 text-sm">
              {[
                ["Import label", label.trim() || filename],
                ["Tags", tags.length ? tags.join(", ") : "—"],
                ["Attend events", eventIds.length ? `${eventIds.length} event${eventIds.length !== 1 ? "s" : ""}` : "—"],
                ["Default location", [defaultCity, defaultState].filter(Boolean).join(", ") || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">{k}</span>
                  <span className="font-ui text-sm text-ink text-right">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-marigold/8 border border-marigold/25 px-3.5 py-2.5">
              <svg className="w-4 h-4 text-marigold-dark shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3l-6.93-12a2 2 0 00-3.48 0l-6.93 12a2 2 0 001.74 3z" /></svg>
              <p className="font-ui text-[12px] text-ink-muted">This creates <strong className="text-ink">{newCount}</strong> passwordless accounts now. <strong>No emails are sent</strong> — sending to these groups is a separate, deliberate step later.</p>
            </div>
            {commitError && <p className="font-ui text-sm text-durga bg-durga/8 border border-durga/20 rounded-xl px-3.5 py-2.5">{commitError}</p>}
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(2)} disabled={submitting} className="font-ui font-semibold text-sm text-ink-muted hover:text-ink">← Back</button>
            <button onClick={commit} disabled={submitting || newCount + (applyToExisting ? matchedCount : 0) === 0}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-peacock text-white font-display font-bold text-sm hover:bg-peacock/90 transition-all disabled:opacity-50">
              {submitting ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating…</> : `Create ${newCount} user${newCount !== 1 ? "s" : ""} →`}
            </button>
          </div>
        </div>
      )}

      {/* ════ DONE ════ */}
      {step === "done" && result && (
        <div className="bg-white rounded-2xl border border-ivory-200 p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-peacock/10 flex items-center justify-center mx-auto text-2xl">🎉</div>
          <div>
            <p className="font-display font-bold text-ink text-xl">Import complete</p>
            <p className="font-ui text-sm text-ink-muted mt-1">
              <strong className="text-peacock">{result.created} new user{result.created !== 1 ? "s" : ""}</strong> added
              {result.appliedToExisting > 0 && <> · {result.appliedToExisting} existing enriched</>}
              {result.matched > 0 && <> · {result.matched} already existed</>}
              {result.failed > 0 && <> · <span className="text-durga">{result.failed} failed</span></>}.
            </p>
          </div>
          {result.errors.length > 0 && (
            <div className="text-left rounded-xl bg-durga/6 border border-durga/15 px-3.5 py-2.5 max-h-40 overflow-auto">
              <p className="font-mono text-[10px] uppercase tracking-widest text-durga mb-1">Failures</p>
              {result.errors.map((e, i) => <p key={i} className="font-mono text-[11px] text-ink-muted">{e}</p>)}
            </div>
          )}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button onClick={reset} className="px-5 py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-all">Import another</button>
            <Link href="/admin/users" className="px-5 py-2.5 rounded-xl border border-ivory-200 text-ink-muted font-ui font-semibold text-sm hover:bg-ivory transition-all">View users →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
