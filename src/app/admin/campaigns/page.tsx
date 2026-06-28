"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BLAST_TEMPLATES, blastTemplate } from "@/lib/email/blast-templates";

type Batch = { id: string; label: string; created_count: number };
type EventOpt = { id: string; title: string; start_date: string; status: string };
type Blast = { id: string; subject: string; event_id: string | null; recipient_count: number; sent_count: number; failed_count: number; created_at: string };
type AudienceFilters = { tags: string[]; batchIds: string[]; cities: string[]; states: string[]; attendedEventIds: string[]; source: string | null; matchAny: boolean };
type SavedList = { id: string; name: string; description: string | null; filters: AudienceFilters; last_used_at: string | null; created_at: string };

const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5 block";
const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all";
const fmtTS = (d: string) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const fmtDay = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Small numbered step header.
function StepHead({ n, title, sub, done }: { n: number; title: string; sub?: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className={`w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-sm shrink-0 ${done ? "bg-peacock text-white" : "bg-aubergine text-white"}`}>
        {done ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : n}
      </span>
      <div>
        <p className="font-display font-bold text-ink text-sm">{title}</p>
        {sub && <p className="font-ui text-xs text-ink-muted">{sub}</p>}
      </div>
    </div>
  );
}

// Searchable multi-select checklist.
function MultiPick({ title, options, selected, onChange, labelOf, searchable = true }: {
  title: string; options: { value: string; label: string; sub?: string }[]; selected: string[];
  onChange: (v: string[]) => void; labelOf?: (v: string) => string; searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">{title}</span>
        {selected.length > 0 && <button onClick={() => onChange([])} className="font-mono text-[9px] text-ink-muted hover:text-durga">clear ({selected.length})</button>}
      </div>
      {options.length === 0 ? (
        <p className="font-ui text-xs text-ink-muted/60 px-1 py-2">None yet.</p>
      ) : (
        <>
          {searchable && options.length > 8 && <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} className={`${inputCls} mb-1.5 py-2`} />}
          <div className="max-h-44 overflow-auto rounded-xl border border-ivory-200 divide-y divide-ivory-200">
            {filtered.map(o => {
              const on = selected.includes(o.value);
              return (
                <button key={o.value} onClick={() => toggle(o.value)} className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${on ? "bg-aubergine/[0.04]" : "hover:bg-ivory/50"}`}>
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? "bg-aubergine border-aubergine" : "border-ivory-200 bg-white"}`}>
                    {on && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </span>
                  <span className="flex-1 min-w-0"><span className="font-ui text-sm text-ink truncate block">{o.label}</span>{o.sub && <span className="font-mono text-[10px] text-ink-muted">{o.sub}</span>}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
      {labelOf && selected.length > 0 && <p className="font-mono text-[10px] text-aubergine mt-1.5">{selected.map(labelOf).join(", ")}</p>}
    </div>
  );
}

export default function CampaignsPage() {
  const supabase = useMemo(() => createClient(), []);

  // Facets + data
  const [tags, setTags] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [upcoming, setUpcoming] = useState<EventOpt[]>([]);
  const [allEvents, setAllEvents] = useState<EventOpt[]>([]);
  const [blasts, setBlasts] = useState<Blast[]>([]);

  // Saved lists
  const [lists, setLists] = useState<SavedList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [savingList, setSavingList] = useState(false);
  const [listName, setListName] = useState("");
  const [confirmDeleteList, setConfirmDeleteList] = useState<string | null>(null);

  // Giveaway-lead account sync
  const [pendingLeads, setPendingLeads] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  // Step 1 — audience filters
  const [selTags, setSelTags] = useState<string[]>([]);
  const [selBatches, setSelBatches] = useState<string[]>([]);
  const [selCities, setSelCities] = useState<string[]>([]);
  const [selStates, setSelStates] = useState<string[]>([]);
  const [selAttended, setSelAttended] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [matchAny, setMatchAny] = useState(false);

  // Step 2 — event
  const [eventId, setEventId] = useState("");
  const [eventSearch, setEventSearch] = useState("");

  // Step 3 — template (+ custom compose)
  const [templateKey, setTemplateKey] = useState<string>("nearby-events");
  const [subject, setSubject] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");

  // Audience count
  const [count, setCount] = useState<number | null>(null);
  const [sample, setSample] = useState<string[]>([]);
  const [counting, setCounting] = useState(false);

  // Preview / test / send
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewErr, setPreviewErr] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; recipients: number } | null>(null);
  const [sendErr, setSendErr] = useState("");

  useEffect(() => { document.title = "Campaigns | Rameelo Admin"; load(); loadPending(); }, []);

  async function load() {
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: facets }, { data: bs }, { data: evs }, { data: bl }, { data: ls }] = await Promise.all([
      supabase.rpc("get_marketing_filter_facets"),
      supabase.from("user_import_batches").select("id, label, created_count").order("created_at", { ascending: false }),
      supabase.from("events").select("id, title, start_date, status").order("start_date", { ascending: false }).limit(200),
      supabase.from("marketing_blasts").select("id, subject, event_id, recipient_count, sent_count, failed_count, created_at").order("created_at", { ascending: false }).limit(8),
      supabase.from("marketing_lists").select("id, name, description, filters, last_used_at, created_at").order("created_at", { ascending: false }),
    ]);
    const f = (facets ?? {}) as { tags?: string[]; cities?: string[]; states?: string[] };
    setTags(f.tags ?? []); setCities(f.cities ?? []); setStates(f.states ?? []);
    setBatches((bs ?? []) as Batch[]);
    const events = (evs ?? []) as EventOpt[];
    setAllEvents(events);
    setUpcoming(events.filter(e => e.start_date >= today && e.status === "published").sort((a, b) => a.start_date.localeCompare(b.start_date)));
    setBlasts((bl ?? []) as Blast[]);
    setLists((ls ?? []) as SavedList[]);
  }

  async function loadPending() {
    try {
      const res = await fetch("/api/admin/promo-leads/provision");
      const d = await res.json().catch(() => ({}));
      if (res.ok) setPendingLeads(d.pending ?? 0);
    } catch { /* ignore */ }
  }

  async function syncLeads() {
    setSyncing(true); setSyncMsg("");
    try {
      const res = await fetch("/api/admin/promo-leads/provision", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setSyncMsg(d.error || "Sync failed."); setSyncing(false); return; }
      setSyncMsg(`Synced — ${d.created} new account${d.created === 1 ? "" : "s"}${d.linked ? `, ${d.linked} linked` : ""}.`);
      await Promise.all([load(), loadPending()]);
    } catch { setSyncMsg("Sync failed."); }
    setSyncing(false);
  }

  const filters = useMemo<AudienceFilters>(() => ({
    tags: selTags, batchIds: selBatches, cities: selCities, states: selStates,
    attendedEventIds: selAttended, source: source || null, matchAny,
  }), [selTags, selBatches, selCities, selStates, selAttended, source, matchAny]);

  const hasFilters = selTags.length || selBatches.length || selCities.length || selStates.length || selAttended.length || source;

  // Debounced live recipient count.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCounting(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/marketing/audience", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(filters) });
        const d = await res.json().catch(() => ({}));
        setCount(res.ok ? d.count : null); setSample(d.sample ?? []);
      } catch { setCount(null); }
      setCounting(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filters]);

  const tmpl = blastTemplate(templateKey);
  const isGeo = !!tmpl?.perRecipientGeo;
  const eventTitleOf = (id: string) => allEvents.find(e => e.id === id)?.title ?? "event";

  // Invalidate a stale preview whenever the content inputs change.
  useEffect(() => { setPreview(null); }, [templateKey, eventId, subject, headline, body]);

  // What does the chosen template still need before it can send?
  const needsEvent = !!tmpl?.requiresEvent && !eventId;
  const needsCustom = !!tmpl?.custom && (!subject.trim() || (!body.trim() && !eventId));
  const contentReady = !!tmpl && !needsEvent && !needsCustom;
  const canSend = contentReady && (count ?? 0) > 0;
  const canPreviewOrTest = !!tmpl && !needsEvent && (!tmpl.custom || !!subject.trim() || !!eventId);

  // ── Saved lists ──
  function applyList(l: SavedList) {
    const f = l.filters || {} as AudienceFilters;
    setSelTags(f.tags ?? []); setSelBatches(f.batchIds ?? []); setSelCities(f.cities ?? []);
    setSelStates(f.states ?? []); setSelAttended(f.attendedEventIds ?? []);
    setSource(f.source ?? ""); setMatchAny(!!f.matchAny);
    setActiveListId(l.id);
    supabase.from("marketing_lists").update({ last_used_at: new Date().toISOString() }).eq("id", l.id).then(() => {});
  }
  async function saveList() {
    const name = listName.trim();
    if (!name) return;
    const { data } = await supabase.from("marketing_lists").insert({ name, filters }).select("id, name, description, filters, last_used_at, created_at").single();
    if (data) { setLists([data as SavedList, ...lists]); setActiveListId((data as SavedList).id); }
    setSavingList(false); setListName("");
  }
  async function deleteList(id: string) {
    await supabase.from("marketing_lists").delete().eq("id", id);
    setLists(lists.filter(l => l.id !== id));
    if (activeListId === id) setActiveListId(null);
    setConfirmDeleteList(null);
  }
  function clearAudience() {
    setSelTags([]); setSelBatches([]); setSelCities([]); setSelStates([]); setSelAttended([]); setSource(""); setMatchAny(false); setActiveListId(null);
  }

  function contentPayload() {
    return { templateKey, eventId: eventId || null, subject: subject.trim(), headline: headline.trim(), body: body.trim() };
  }

  async function doPreview() {
    setPreviewing(true); setPreviewErr("");
    try {
      const res = await fetch("/api/admin/marketing/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contentPayload()) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setPreviewErr(d.error || "Couldn't build a preview."); setPreviewing(false); return; }
      setPreview({ subject: d.subject, html: d.html });
    } catch { setPreviewErr("Couldn't build a preview."); }
    setPreviewing(false);
  }

  async function sendTest() {
    if (!testEmail.trim()) return;
    setTesting(true); setTestMsg(null);
    try {
      const res = await fetch("/api/admin/marketing/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...contentPayload(), testEmail: testEmail.trim() }) });
      const d = await res.json().catch(() => ({}));
      setTestMsg(res.ok ? { ok: true, text: `Test sent to ${testEmail.trim()}` } : { ok: false, text: d.error || "Couldn't send the test." });
    } catch { setTestMsg({ ok: false, text: "Couldn't send the test." }); }
    setTesting(false);
  }

  async function send() {
    setSending(true); setSendErr("");
    try {
      const res = await fetch("/api/admin/marketing/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...filters, ...contentPayload() }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setSendErr(d.error || "Send failed."); setSending(false); setConfirming(false); return; }
      setResult({ sent: d.sent, failed: d.failed, recipients: d.recipients });
      setConfirming(false);
      load();
    } catch { setSendErr("Send failed."); }
    setSending(false);
  }

  function resetAfterSend() {
    setResult(null); setSubject(""); setHeadline(""); setBody(""); setEventId(""); setTemplateKey("nearby-events");
    clearAudience(); setPreview(null); setTestMsg(null);
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-ivory-200 p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-peacock/10 flex items-center justify-center mx-auto text-2xl">📣</div>
          <div>
            <p className="font-display font-bold text-ink text-xl">Campaign sent</p>
            <p className="font-ui text-sm text-ink-muted mt-1">
              <strong className="text-peacock">{result.sent} delivered</strong> of {result.recipients}{result.failed > 0 && <> · <span className="text-durga">{result.failed} failed</span></>}.
            </p>
          </div>
          <button onClick={resetAfterSend} className="px-5 py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-all">New campaign</button>
        </div>
      </div>
    );
  }

  const filteredEvents = eventSearch ? upcoming.filter(e => e.title.toLowerCase().includes(eventSearch.toLowerCase())) : upcoming;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Campaigns</h2>
        <p className="font-ui text-ink-muted text-sm mt-0.5">Build an email campaign in three steps — pick a list, choose your content, then preview, test, and send. Honors marketing opt-outs.</p>
      </div>

      {/* Giveaway-lead sync nudge */}
      {pendingLeads > 0 && (
        <div className="bg-marigold/[0.08] border border-marigold/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="shrink-0 w-9 h-9 rounded-xl bg-marigold/20 flex items-center justify-center text-lg">🎁</span>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-ink text-sm">{pendingLeads} giveaway {pendingLeads === 1 ? "lead isn't" : "leads aren't"} reachable yet</p>
            <p className="font-ui text-xs text-ink-muted">Create platform accounts for your giveaway entrants so you can email them. New entrants are added automatically.</p>
          </div>
          <button onClick={syncLeads} disabled={syncing} className="shrink-0 px-4 py-2 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-all disabled:opacity-50">
            {syncing ? "Syncing…" : "Create accounts"}
          </button>
        </div>
      )}
      {syncMsg && !pendingLeads && <p className="font-ui text-xs text-peacock">✓ {syncMsg}</p>}

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* ── Left: the 3 steps ── */}
        <div className="space-y-4">
          {/* Step 1 — Audience + Lists */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-5">
            <StepHead n={1} title="Who to reach" sub="Pick a saved list or build one with filters" done={!!hasFilters} />

            {/* Saved lists */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Saved lists</span>
                <button onClick={() => setSavingList(true)} disabled={!hasFilters}
                  className="font-mono text-[9px] uppercase tracking-widest text-aubergine hover:text-aubergine-light disabled:opacity-40 disabled:hover:text-aubergine">+ Save current as list</button>
              </div>
              {lists.length === 0 ? (
                <p className="font-ui text-xs text-ink-muted/60">No saved lists yet — build an audience below and save it for one-click reuse.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {lists.map(l => {
                    const on = activeListId === l.id;
                    return (
                      <span key={l.id} className={`group inline-flex items-center gap-1 rounded-full border pl-3 pr-1.5 py-1 transition-all ${on ? "border-aubergine bg-aubergine/[0.05]" : "border-ivory-200 hover:border-aubergine/30"}`}>
                        <button onClick={() => applyList(l)} className="font-ui text-xs font-semibold text-ink">{l.name}</button>
                        {confirmDeleteList === l.id ? (
                          <button onClick={() => deleteList(l.id)} className="font-mono text-[9px] text-durga px-1" title="Confirm delete">delete?</button>
                        ) : (
                          <button onClick={() => setConfirmDeleteList(l.id)} className="w-4 h-4 rounded-full flex items-center justify-center text-ink-muted/40 hover:text-durga hover:bg-durga/10" title="Delete list">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
              {savingList && (
                <div className="mt-2 flex gap-2">
                  <input autoFocus value={listName} onChange={e => setListName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveList(); if (e.key === "Escape") { setSavingList(false); setListName(""); } }}
                    placeholder="List name (e.g. NJ Giveaway Leads)" className={`${inputCls} py-2`} />
                  <button onClick={saveList} disabled={!listName.trim()} className="shrink-0 px-4 py-2 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light disabled:opacity-40">Save</button>
                  <button onClick={() => { setSavingList(false); setListName(""); }} className="shrink-0 px-3 py-2 rounded-xl border border-ivory-200 text-ink-muted font-ui text-sm hover:bg-ivory">Cancel</button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-3 pt-3 border-t border-ivory-200">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Filters</span>
              <div className="flex items-center gap-2">
                {hasFilters && <button onClick={clearAudience} className="font-mono text-[9px] text-ink-muted hover:text-durga">clear all</button>}
                <div className="flex items-center gap-1 bg-ivory rounded-lg p-0.5 border border-ivory-200">
                  {[{ v: false, l: "Match all" }, { v: true, l: "Match any" }].map(o => (
                    <button key={o.l} onClick={() => setMatchAny(o.v)} className={`px-2.5 py-1 rounded-md font-ui text-xs font-semibold transition-all ${matchAny === o.v ? "bg-white text-ink shadow-sm" : "text-ink-muted"}`}>{o.l}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <MultiPick title="Tags" options={tags.map(t => ({ value: t, label: t }))} selected={selTags} onChange={setSelTags} />
              <MultiPick title="Uploads" options={batches.map(b => ({ value: b.id, label: b.label, sub: `${b.created_count} added` }))} selected={selBatches} onChange={setSelBatches} labelOf={id => batches.find(b => b.id === id)?.label ?? id} />
              <div className="grid grid-cols-2 gap-4">
                <MultiPick title="States" options={states.map(s => ({ value: s, label: s }))} selected={selStates} onChange={setSelStates} />
                <MultiPick title="Cities" options={cities.map(c => ({ value: c, label: c }))} selected={selCities} onChange={setSelCities} />
              </div>
              <MultiPick title="Attended event" options={allEvents.map(e => ({ value: e.id, label: e.title, sub: fmtDay(e.start_date) }))} selected={selAttended} onChange={setSelAttended} labelOf={eventTitleOf} />
              <div>
                <label className={labelCls}>Joined via</label>
                <div className="flex flex-wrap gap-1.5">
                  {[{ v: "", l: "Anyone" }, { v: "promo", l: "🎁 Giveaway" }, { v: "signup", l: "Signed up" }, { v: "import", l: "Imported" }].map(o => (
                    <button key={o.l} onClick={() => setSource(o.v)} className={`px-3 py-1.5 rounded-xl font-ui text-xs font-semibold border transition-all ${source === o.v ? "bg-aubergine text-white border-aubergine" : "border-ivory-200 text-ink-muted hover:border-aubergine/30"}`}>{o.l}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 — Content (template + event) */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-5">
            <StepHead n={2} title="Choose your content" sub="Pick a template — designed for you, no copywriting needed" done={contentReady} />
            <div className="space-y-2.5">
              {BLAST_TEMPLATES.map(t => {
                const on = templateKey === t.key;
                return (
                  <button key={t.key} onClick={() => setTemplateKey(t.key)} className={`w-full flex items-start gap-3 px-3.5 py-3 rounded-xl border text-left transition-all ${on ? "border-aubergine bg-aubergine/[0.04] ring-1 ring-aubergine/20" : "border-ivory-200 hover:border-aubergine/30"}`}>
                    <span className="text-xl shrink-0 leading-none mt-0.5">{t.emoji}</span>
                    <span className="min-w-0">
                      <span className="font-display font-bold text-ink text-sm flex items-center gap-2">{t.name}{t.perRecipientGeo && <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-peacock bg-peacock/10 px-1.5 py-0.5 rounded-full">Location-aware</span>}</span>
                      <span className="font-ui text-xs text-ink-muted block mt-0.5">{t.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Location-aware: no event to pick */}
            {isGeo && (
              <div className="mt-3 rounded-xl border border-peacock/30 bg-peacock/[0.05] px-3.5 py-3">
                <p className="font-ui text-xs text-ink">📍 No event to pick — each recipient automatically gets the soonest on-sale events in <strong>their own state</strong> (falling back to the soonest events nationwide). Great for blasting giveaway leads everywhere at once.</p>
              </div>
            )}

            {/* Event picker — shown for event templates and the custom feature option */}
            {!isGeo && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">{tmpl?.requiresEvent ? "Event to feature *" : "Feature an event (optional)"}</span>
                  {eventId && <button onClick={() => setEventId("")} className="font-mono text-[9px] text-ink-muted hover:text-durga">clear</button>}
                </div>
                {upcoming.length > 8 && <input value={eventSearch} onChange={e => setEventSearch(e.target.value)} placeholder="Search upcoming events…" className={`${inputCls} mb-2 py-2`} />}
                <div className="max-h-56 overflow-auto rounded-xl border border-ivory-200 divide-y divide-ivory-200">
                  {!tmpl?.requiresEvent && (
                    <button onClick={() => setEventId("")} className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${!eventId ? "bg-aubergine/[0.04]" : "hover:bg-ivory/50"}`}>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${!eventId ? "border-aubergine" : "border-ivory-200"}`}>{!eventId && <span className="w-2 h-2 rounded-full bg-aubergine" />}</span>
                      <span className="font-ui text-sm text-ink">No event — message only</span>
                    </button>
                  )}
                  {filteredEvents.length === 0 ? (
                    <p className="font-ui text-xs text-ink-muted/60 px-3 py-4">No published upcoming events.</p>
                  ) : filteredEvents.map(e => {
                    const on = eventId === e.id;
                    return (
                      <button key={e.id} onClick={() => setEventId(e.id)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${on ? "bg-aubergine/[0.04]" : "hover:bg-ivory/50"}`}>
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${on ? "border-aubergine" : "border-ivory-200"}`}>{on && <span className="w-2 h-2 rounded-full bg-aubergine" />}</span>
                        <span className="flex-1 min-w-0"><span className="font-ui text-sm text-ink truncate block">{e.title}</span><span className="font-mono text-[10px] text-ink-muted">{fmtDay(e.start_date)}</span></span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Template-specific helper / compose */}
            {tmpl && !tmpl.custom && !isGeo && (
              <div className="mt-3 rounded-xl border border-marigold/30 bg-marigold/[0.06] px-3.5 py-3">
                <p className="font-ui text-xs text-ink">
                  {needsEvent
                    ? "Pick an event above — the subject, ticket tiers, prices, and the sales-close countdown are filled in automatically."
                    : "Subject and copy are written for you. The email lists this event's ticket tiers & prices and counts down to the sales-close date. Preview it on the right."}
                </p>
              </div>
            )}
            {tmpl?.custom && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className={labelCls}>Subject line *</label>
                  <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Your VIP invite to Diwali Dhamaka 🎟️" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Headline <span className="text-ink-muted/50 normal-case">(optional)</span></label>
                  <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="You're invited" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Message {eventId ? <span className="text-ink-muted/50 normal-case">(optional with an event)</span> : "*"}</label>
                  <textarea rows={5} value={body} onChange={e => setBody(e.target.value)} placeholder={"Hey — tickets are moving fast for this one.\n\nWe saved you a spot. Grab yours before they're gone!"} className={`${inputCls} resize-none`} />
                  <p className="font-mono text-[10px] text-ink-muted/60 mt-1.5">Blank lines start new paragraphs. Each recipient is greeted by first name automatically.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: recipients + review + send (sticky) ── */}
        <div className="space-y-4 lg:sticky lg:top-4">
          {/* Recipient count */}
          <div className="bg-aubergine rounded-2xl p-5 text-white">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">Recipients {!hasFilters && "(everyone opted-in)"}</p>
            <p className="font-display font-bold text-4xl mt-1" style={{ letterSpacing: "-0.03em" }}>{counting ? "…" : (count ?? "—")}</p>
            {sample.length > 0 && <p className="font-mono text-[10px] text-white/40 mt-2 truncate">{sample.join(" · ")}{(count ?? 0) > sample.length ? " …" : ""}</p>}
          </div>

          {/* Review & send */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-5 space-y-4">
            <p className="font-display font-bold text-ink text-sm">Step 3 · Review &amp; send</p>

            {/* Summary */}
            <div className="rounded-xl border border-ivory-200 bg-ivory/40 divide-y divide-ivory-200">
              {[
                ["List", count != null ? `${count} ${count === 1 ? "person" : "people"}` : "—"],
                ["Template", tmpl ? `${tmpl.emoji} ${tmpl.name}` : "—"],
                ["Event", isGeo ? "Auto · nearest to each person" : (eventId ? eventTitleOf(eventId) : "— none")],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-3.5 py-2"><span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">{k}</span><span className="font-ui text-sm text-ink text-right truncate max-w-[60%]">{v}</span></div>
              ))}
            </div>

            {/* Preview */}
            <div>
              <button onClick={doPreview} disabled={!canPreviewOrTest || previewing}
                className="w-full py-2.5 rounded-xl border border-aubergine/30 text-aubergine font-display font-bold text-sm hover:bg-aubergine/[0.04] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                {previewing ? <><div className="w-4 h-4 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />Building…</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>Preview email</>}
              </button>
              {isGeo && <p className="font-mono text-[10px] text-ink-muted/60 mt-1.5">Preview uses your own state as the sample location.</p>}
              {previewErr && <p className="font-ui text-xs text-durga mt-1.5">{previewErr}</p>}
            </div>

            {/* Test send */}
            <div>
              <label className={labelCls}>Send yourself a test</label>
              <div className="flex gap-2">
                <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="you@example.com" className={`${inputCls} py-2`} />
                <button onClick={sendTest} disabled={!canPreviewOrTest || testing || !testEmail.trim()} className="shrink-0 px-4 py-2 rounded-xl border border-ivory-200 text-ink-muted font-ui font-semibold text-sm hover:border-aubergine/30 hover:text-aubergine transition-colors disabled:opacity-40">
                  {testing ? "Sending…" : "Send test"}
                </button>
              </div>
              {testMsg && <p className={`font-ui text-xs mt-1.5 ${testMsg.ok ? "text-peacock" : "text-durga"}`}>{testMsg.ok ? "✓ " : ""}{testMsg.text}</p>}
            </div>

            {sendErr && <p className="font-ui text-sm text-durga bg-durga/8 border border-durga/20 rounded-xl px-3.5 py-2.5">{sendErr}</p>}

            <button onClick={() => setConfirming(true)} disabled={!canSend}
              className="w-full py-3.5 rounded-2xl bg-peacock text-white font-display font-bold text-base hover:bg-peacock/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Send to {count ?? 0} {count === 1 ? "person" : "people"}
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      {blasts.length > 0 && (
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          <div className="px-5 py-3 bg-ivory border-b border-ivory-200"><p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Recent campaigns</p></div>
          <div className="divide-y divide-ivory-200">
            {blasts.map(b => (
              <div key={b.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0"><p className="font-ui text-sm text-ink truncate">{b.subject}</p><p className="font-mono text-[10px] text-ink-muted">{fmtTS(b.created_at)}{b.event_id && ` · ${eventTitleOf(b.event_id)}`}</p></div>
                <span className="font-mono text-[10px] shrink-0"><span className="text-peacock font-bold">{b.sent_count} sent</span>{b.failed_count > 0 && <span className="text-durga"> · {b.failed_count} failed</span>}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-ivory-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Subject</p>
                <p className="font-ui text-sm text-ink truncate">{preview.subject}</p>
              </div>
              <button onClick={() => setPreview(null)} className="shrink-0 w-8 h-8 rounded-lg border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-ivory transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <iframe title="Email preview" srcDoc={preview.html} className="flex-1 w-full bg-ivory" style={{ minHeight: "60vh" }} />
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => !sending && setConfirming(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-peacock/10 flex items-center justify-center text-xl shrink-0">📣</div>
              <div>
                <p className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.015em" }}>Send this campaign?</p>
                <p className="font-ui text-xs text-ink-muted">This emails real people. It can&rsquo;t be unsent.</p>
              </div>
            </div>
            <div className="rounded-xl border border-ivory-200 bg-ivory/40 divide-y divide-ivory-200">
              {[["Recipients", String(count ?? 0)], ["Template", tmpl ? tmpl.name : "—"], ["Event", isGeo ? "Auto · nearest to each person" : (eventId ? eventTitleOf(eventId) : "— none")]].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5"><span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">{k}</span><span className="font-ui text-sm text-ink text-right truncate max-w-[60%]">{v}</span></div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirming(false)} disabled={sending} className="flex-1 py-2.5 rounded-xl border border-ivory-200 font-ui font-semibold text-sm text-ink-muted hover:bg-ivory transition-colors">Cancel</button>
              <button onClick={send} disabled={sending} className="flex-1 py-2.5 rounded-xl bg-peacock text-white font-display font-bold text-sm hover:bg-peacock/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Sending…</> : `Send to ${count ?? 0}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
