"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ── Constants ─────────────────────────────────────────────────────────────────

export const STAGES = [
  { id: "new_lead",    label: "New Lead",    color: "#64748b", bg: "rgba(100,116,139,0.1)",  dot: "#64748b" },
  { id: "contacted",   label: "Contacted",   color: "#3b82f6", bg: "rgba(59,130,246,0.1)",   dot: "#3b82f6" },
  { id: "qualified",   label: "Qualified",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)",   dot: "#f59e0b" },
  { id: "demo",        label: "Demo",        color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",   dot: "#8b5cf6" },
  { id: "negotiating", label: "Negotiating", color: "#f97316", bg: "rgba(249,115,22,0.1)",   dot: "#f97316" },
  { id: "onboarded",   label: "Onboarded",   color: "#10b981", bg: "rgba(16,185,129,0.1)",   dot: "#10b981" },
  { id: "nurture",     label: "Nurture",     color: "#6b7280", bg: "rgba(107,114,128,0.1)",  dot: "#6b7280" },
  { id: "lost",        label: "Lost",        color: "#ef4444", bg: "rgba(239,68,68,0.08)",   dot: "#ef4444" },
] as const;

const PRIORITY_META = {
  hot:    { label: "HOT",    cls: "bg-red-50 text-red-600 border-red-200" },
  high:   { label: "HIGH",   cls: "bg-orange-50 text-orange-600 border-orange-200" },
  medium: { label: "MED",    cls: "bg-blue-50 text-blue-600 border-blue-200" },
  low:    { label: "LOW",    cls: "bg-slate-50 text-slate-500 border-slate-200" },
};

const SOURCES = ["cold_outreach","referral","inbound","social","conference","partner","other"];
const SOURCE_LABELS: Record<string, string> = {
  cold_outreach: "Cold Outreach", referral: "Referral", inbound: "Inbound",
  social: "Social Media", conference: "Conference", partner: "Partner", other: "Other",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type AdminProfile = { id: string; first_name: string; last_name: string; email: string };
type OrgOption    = { id: string; name: string };

export type Lead = {
  id: string;
  first_name: string; last_name: string;
  email: string | null; phone: string | null;
  title: string | null;
  city: string | null; state: string | null;
  linkedin_url: string | null;
  organization_name: string | null;
  org_id: string | null;
  platform_user_id: string | null;
  stage: string; priority: string; source: string | null;
  assigned_to: string | null;
  next_follow_up_at: string | null;
  est_events_per_year: number | null;
  est_avg_attendance: number | null;
  est_avg_ticket_price: number | null;
  tags: string[] | null;
  internal_summary: string | null;
  created_at: string; stage_updated_at: string;
  // joined
  assignee?: { first_name: string; last_name: string } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcARR(lead: Lead) {
  const { est_events_per_year: ev, est_avg_attendance: att, est_avg_ticket_price: price } = lead;
  if (!ev || !att || !price) return null;
  return ev * att * Number(price) * 0.03;
}

function fmtMoney(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function daysInStage(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

function followUpLabel(iso: string | null) {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, cls: "text-red-500" };
  if (diff === 0) return { label: "Today",    cls: "text-orange-500" };
  if (diff === 1) return { label: "Tomorrow", cls: "text-amber-600" };
  return { label: `${diff}d`, cls: "text-ink/40" };
}

// ── Lead card ─────────────────────────────────────────────────────────────────

function LeadCard({ lead, onStageChange }: { lead: Lead; onStageChange: (id: string, stage: string) => void }) {
  const [stageMenu, setStageMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const arr = calcARR(lead);
  const fu = followUpLabel(lead.next_follow_up_at);
  const days = daysInStage(lead.stage_updated_at);
  const prio = PRIORITY_META[lead.priority as keyof typeof PRIORITY_META] ?? PRIORITY_META.medium;
  const isOnPlatform = !!lead.platform_user_id;
  const company = lead.organization_name || lead.org_id;

  useEffect(() => {
    if (!stageMenu) return;
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setStageMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [stageMenu]);

  return (
    <div className="bg-white rounded-xl border border-black/[0.07] p-3.5 shadow-sm hover:shadow-md hover:border-black/15 transition-all group">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <Link href={`/admin/pipeline/${lead.id}`} target="_blank" rel="noopener noreferrer" className="font-ui font-semibold text-ink/80 text-[13px] hover:text-aubergine transition-colors leading-snug block truncate">
            {lead.first_name} {lead.last_name}
          </Link>
          {company && <p className="font-mono text-[10px] text-ink/40 truncate mt-0.5">{company}</p>}
          {lead.title && <p className="font-ui text-[11px] text-ink/35 truncate">{lead.title}</p>}
        </div>
        <span className={`shrink-0 font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${prio.cls}`}>
          {prio.label}
        </span>
      </div>

      {/* Platform indicator */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnPlatform ? "bg-emerald-400" : "bg-slate-300"}`} />
        <span className="font-mono text-[9px] text-ink/35">{isOnPlatform ? "On Platform" : "External Lead"}</span>
        {arr && (
          <>
            <span className="text-ink/20 mx-1">·</span>
            <span className="font-mono text-[10px] font-bold text-ink/55">{fmtMoney(arr)}<span className="text-ink/30 font-normal">/yr</span></span>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/[0.05]">
        <div className="flex items-center gap-2">
          {fu && (
            <span className={`font-mono text-[9px] ${fu.cls}`}>📅 {fu.label}</span>
          )}
          <span className="font-mono text-[9px] text-ink/25">{days}d in stage</span>
        </div>
        {/* Stage mover */}
        <div className="relative" ref={ref}>
          <button
            onClick={(e) => { e.preventDefault(); setStageMenu(!stageMenu); }}
            className="text-ink/25 hover:text-ink/60 transition-colors"
            title="Move stage"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {stageMenu && (
            <div className="absolute right-0 bottom-full mb-1 w-36 bg-white rounded-xl border border-black/10 shadow-lg overflow-hidden z-20">
              {STAGES.map((s) => (
                <button key={s.id} onClick={() => { onStageChange(lead.id, s.id); setStageMenu(false); }}
                  className={`w-full text-left px-3 py-2 font-ui text-[12px] hover:bg-black/[0.03] transition-colors flex items-center gap-2 ${lead.stage === s.id ? "font-bold" : ""}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── New Lead Modal ────────────────────────────────────────────────────────────

function NewLeadModal({ onClose, onSave, admins, orgs }: {
  onClose: () => void;
  onSave: (lead: Lead) => void;
  admins: AdminProfile[];
  orgs: OrgOption[];
}) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", title: "",
    city: "", state: "", linkedin_url: "",
    organization_name: "", org_id: "",
    stage: "new_lead", priority: "medium", source: "",
    assigned_to: "", next_follow_up_at: "",
    est_events_per_year: "", est_avg_attendance: "", est_avg_ticket_price: "",
    tags: "", internal_summary: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) { setError("First and last name are required."); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error: err } = await supabase.from("sales_leads").insert({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      title: form.title || null,
      city: form.city || null,
      state: form.state || null,
      linkedin_url: form.linkedin_url || null,
      organization_name: form.organization_name || null,
      org_id: form.org_id || null,
      stage: form.stage,
      priority: form.priority,
      source: form.source || null,
      assigned_to: form.assigned_to || null,
      next_follow_up_at: form.next_follow_up_at || null,
      est_events_per_year: form.est_events_per_year ? Number(form.est_events_per_year) : null,
      est_avg_attendance: form.est_avg_attendance ? Number(form.est_avg_attendance) : null,
      est_avg_ticket_price: form.est_avg_ticket_price ? Number(form.est_avg_ticket_price) : null,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
      internal_summary: form.internal_summary || null,
      created_by: user?.id,
    }).select().single();
    if (err) { setError(err.message); setSaving(false); return; }
    onSave(data as Lead);
    onClose();
  }

  const inp = "w-full rounded-lg border border-black/10 bg-white px-3 py-2 font-ui text-[13px] text-ink/80 placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/30 transition-all";
  const label = "block font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-1";

  const arr = form.est_events_per_year && form.est_avg_attendance && form.est_avg_ticket_price
    ? Number(form.est_events_per_year) * Number(form.est_avg_attendance) * Number(form.est_avg_ticket_price) * 0.03
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.07]">
          <p className="font-display font-bold text-ink/80 text-base" style={{ letterSpacing: "-0.01em" }}>New Lead</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/30 hover:text-ink/60 hover:bg-black/5 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Contact */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/30 mb-3 pb-1 border-b border-black/[0.05]">Contact Info</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className={label}>First Name *</label><input className={inp} value={form.first_name} onChange={e => setForm(f => ({...f, first_name: e.target.value}))} placeholder="Raj" /></div>
              <div><label className={label}>Last Name *</label><input className={inp} value={form.last_name} onChange={e => setForm(f => ({...f, last_name: e.target.value}))} placeholder="Patel" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className={label}>Email</label><input className={inp} type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="raj@example.com" /></div>
              <div><label className={label}>Phone</label><input className={inp} value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+1 (555) 000-0000" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={label}>Title</label><input className={inp} value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Event Director" /></div>
              <div><label className={label}>City</label><input className={inp} value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} placeholder="Houston" /></div>
              <div><label className={label}>State</label><input className={inp} value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))} placeholder="TX" /></div>
            </div>
          </div>

          {/* Organization */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/30 mb-3 pb-1 border-b border-black/[0.05]">Organization</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Org Name (external)</label>
                <input className={inp} value={form.organization_name} onChange={e => setForm(f => ({...f, organization_name: e.target.value}))} placeholder="Houston Garba Association" />
              </div>
              <div>
                <label className={label}>Link to Platform Org</label>
                <select className={inp} value={form.org_id} onChange={e => setForm(f => ({...f, org_id: e.target.value}))}>
                  <option value="">— None —</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Pipeline */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/30 mb-3 pb-1 border-b border-black/[0.05]">Pipeline</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={label}>Stage</label>
                <select className={inp} value={form.stage} onChange={e => setForm(f => ({...f, stage: e.target.value}))}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Priority</label>
                <select className={inp} value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="hot">🔥 Hot</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={label}>Source</label>
                <select className={inp} value={form.source} onChange={e => setForm(f => ({...f, source: e.target.value}))}>
                  <option value="">— Select —</option>
                  {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Assigned To</label>
                <select className={inp} value={form.assigned_to} onChange={e => setForm(f => ({...f, assigned_to: e.target.value}))}>
                  <option value="">— Unassigned —</option>
                  {admins.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Next Follow-up</label>
                <input className={inp} type="date" value={form.next_follow_up_at} onChange={e => setForm(f => ({...f, next_follow_up_at: e.target.value}))} />
              </div>
            </div>
          </div>

          {/* Revenue estimate */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/30 mb-3 pb-1 border-b border-black/[0.05]">Revenue Estimate</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div><label className={label}>Events / Year</label><input className={inp} type="number" min="0" value={form.est_events_per_year} onChange={e => setForm(f => ({...f, est_events_per_year: e.target.value}))} placeholder="3" /></div>
              <div><label className={label}>Avg Attendance</label><input className={inp} type="number" min="0" value={form.est_avg_attendance} onChange={e => setForm(f => ({...f, est_avg_attendance: e.target.value}))} placeholder="500" /></div>
              <div><label className={label}>Avg Ticket Price ($)</label><input className={inp} type="number" min="0" step="0.01" value={form.est_avg_ticket_price} onChange={e => setForm(f => ({...f, est_avg_ticket_price: e.target.value}))} placeholder="25" /></div>
            </div>
            {arr != null && (
              <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ backgroundColor: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.2)" }}>
                <svg className="w-4 h-4 text-marigold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="font-ui text-[13px] text-ink/70">
                  Projected Rameelo revenue: <strong className="text-ink/85">{fmtMoney(arr)}/yr</strong>
                  <span className="text-ink/40 ml-2">· {fmtMoney(arr * 5)} over 5 years</span>
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className={label}>Internal Notes</label>
            <textarea className={`${inp} min-h-[72px] resize-none`} value={form.internal_summary} onChange={e => setForm(f => ({...f, internal_summary: e.target.value}))} placeholder="Context, referral source, previous relationship..." />
          </div>
          <div>
            <label className={label}>Tags (comma separated)</label>
            <input className={inp} value={form.tags} onChange={e => setForm(f => ({...f, tags: e.target.value}))} placeholder="navratri, houston, large-venue" />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-black/[0.07]">
          {error && <p className="font-ui text-xs text-red-500">{error}</p>}
          {!error && <span />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg font-ui text-[13px] text-ink/50 hover:text-ink/75 hover:bg-black/5 transition-all">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 rounded-lg font-ui font-semibold text-[13px] text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: "#2E1B30" }}>
              {saving ? "Saving…" : "Create Lead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showNew, setShowNew] = useState(false);
  const [filterAssigned, setFilterAssigned] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("sales_leads").select("*, assignee:assigned_to(first_name,last_name)").order("stage_updated_at", { ascending: false }),
      supabase.from("profiles").select("id, first_name, last_name, email").eq("role", "admin"),
      supabase.from("organizations").select("id, name").order("name"),
    ]).then(([leadsRes, adminsRes, orgsRes]) => {
      setLeads((leadsRes.data ?? []) as Lead[]);
      setAdmins((adminsRes.data ?? []) as AdminProfile[]);
      setOrgs((orgsRes.data ?? []) as OrgOption[]);
      setLoading(false);
    });
  }, []);

  async function handleStageChange(leadId: string, newStage: string) {
    const supabase = createClient();
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage === newStage) return;

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage, stage_updated_at: new Date().toISOString() } : l));
    await supabase.from("sales_leads").update({ stage: newStage }).eq("id", leadId);
    // Auto-log stage change
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("sales_notes").insert({
      lead_id: leadId, author_id: user?.id, note_type: "stage_change",
      body: `Stage changed from ${lead.stage} to ${newStage}`,
      metadata: { from_stage: lead.stage, to_stage: newStage },
    });
  }

  const filtered = leads.filter(l => {
    if (filterAssigned && l.assigned_to !== filterAssigned) return false;
    if (filterPriority && l.priority !== filterPriority) return false;
    if (search) {
      const q = search.toLowerCase();
      return `${l.first_name} ${l.last_name} ${l.email ?? ""} ${l.organization_name ?? ""}`.toLowerCase().includes(q);
    }
    return true;
  });

  // Stats
  const totalArr = leads.reduce((s, l) => s + (calcARR(l) ?? 0), 0);
  const overdueCount = leads.filter(l => l.next_follow_up_at && new Date(l.next_follow_up_at) < new Date()).length;
  const thisWeekCount = leads.filter(l => Date.now() - new Date(l.created_at).getTime() < 7 * 86400000).length;

  const stageMap = Object.fromEntries(STAGES.map(s => [s.id, filtered.filter(l => l.stage === s.id)]));

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-7 h-7 rounded-full border-2 border-black/10 border-t-aubergine animate-spin" />
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-5 -m-5 sm:-m-7 lg:-m-8 p-5 sm:p-7 lg:p-8">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Stats chips */}
          {[
            { label: "Total Leads",   val: String(leads.length) },
            { label: "Pipeline ARR",  val: fmtMoney(totalArr) },
            { label: "Overdue",       val: String(overdueCount), warn: overdueCount > 0 },
            { label: "New this week", val: String(thisWeekCount) },
          ].map(s => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <span className={`font-display font-black text-xl ${s.warn ? "text-red-500" : "text-ink/75"}`} style={{ letterSpacing: "-0.03em" }}>{s.val}</span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-ink/30">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-black/10 rounded-lg overflow-hidden bg-white">
            {(["kanban","list"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all ${view === v ? "bg-ink/5 text-ink/70" : "text-ink/30 hover:text-ink/55"}`}>
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-ui font-semibold text-[13px] text-white transition-all hover:opacity-90"
            style={{ backgroundColor: "#2E1B30" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            New Lead
          </button>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads…"
          className="rounded-lg border border-black/10 bg-white px-3 py-1.5 font-ui text-[13px] text-ink/70 placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-aubergine/15 w-52 transition-all" />
        <select value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}
          className="rounded-lg border border-black/10 bg-white px-3 py-1.5 font-ui text-[13px] text-ink/60 focus:outline-none">
          <option value="">All assignees</option>
          {admins.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="rounded-lg border border-black/10 bg-white px-3 py-1.5 font-ui text-[13px] text-ink/60 focus:outline-none">
          <option value="">All priorities</option>
          <option value="hot">🔥 Hot</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {(search || filterAssigned || filterPriority) && (
          <button onClick={() => { setSearch(""); setFilterAssigned(""); setFilterPriority(""); }}
            className="font-mono text-[10px] uppercase tracking-widest text-ink/35 hover:text-ink/60 transition-colors">
            Clear filters ×
          </button>
        )}
      </div>

      {/* ── Kanban ─────────────────────────────────────────────── */}
      {view === "kanban" && (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 h-full" style={{ minWidth: STAGES.length * 220 + "px" }}>
            {STAGES.map(stage => {
              const col = stageMap[stage.id] ?? [];
              const colArr = col.reduce((s, l) => s + (calcARR(l) ?? 0), 0);
              return (
                <div key={stage.id} className="flex flex-col rounded-xl overflow-hidden" style={{ width: 210, minWidth: 210, backgroundColor: stage.bg, border: `1px solid ${stage.color}22` }}>
                  {/* Column header */}
                  <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${stage.color}22` }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.dot }} />
                      <span className="font-mono text-[10px] uppercase tracking-widest font-bold" style={{ color: stage.color }}>{stage.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold" style={{ color: stage.color }}>{col.length}</span>
                    </div>
                  </div>
                  {colArr > 0 && (
                    <div className="px-3 py-1" style={{ borderBottom: `1px solid ${stage.color}18` }}>
                      <span className="font-mono text-[9px] font-bold" style={{ color: stage.color }}>{fmtMoney(colArr)}/yr</span>
                    </div>
                  )}
                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {col.length === 0 ? (
                      <p className="font-ui text-[11px] text-center py-4" style={{ color: stage.color + "60" }}>No leads</p>
                    ) : (
                      col.map(lead => (
                        <LeadCard key={lead.id} lead={lead} onStageChange={handleStageChange} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── List view ──────────────────────────────────────────── */}
      {view === "list" && (
        <div className="flex-1 bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.06] bg-black/[0.02]">
                  {["Contact","Company","Stage","Priority","ARR/yr","Assigned","Follow-up","Source"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-ink/35">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {filtered.map(lead => {
                  const stage = STAGES.find(s => s.id === lead.stage);
                  const prio = PRIORITY_META[lead.priority as keyof typeof PRIORITY_META];
                  const arr = calcARR(lead);
                  const fu = followUpLabel(lead.next_follow_up_at);
                  return (
                    <tr key={lead.id} className="hover:bg-black/[0.015] transition-colors group">
                      <td className="px-4 py-3">
                        <Link href={`/admin/pipeline/${lead.id}`} target="_blank" rel="noopener noreferrer" className="font-ui font-semibold text-ink/75 hover:text-aubergine transition-colors">
                          {lead.first_name} {lead.last_name}
                        </Link>
                        <p className="font-mono text-[10px] text-ink/35">{lead.email ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 font-ui text-ink/55">{lead.organization_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: stage?.color, backgroundColor: stage?.bg }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: stage?.dot }} />
                          {stage?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded border ${prio?.cls}`}>{prio?.label}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] font-bold text-ink/60">{arr ? fmtMoney(arr) : "—"}</td>
                      <td className="px-4 py-3 font-ui text-ink/45">{lead.assignee ? `${lead.assignee.first_name} ${lead.assignee.last_name}` : "—"}</td>
                      <td className="px-4 py-3">
                        {fu ? <span className={`font-mono text-[10px] ${fu.cls}`}>{fu.label}</span> : <span className="text-ink/25">—</span>}
                      </td>
                      <td className="px-4 py-3 font-ui text-ink/45">{lead.source ? SOURCE_LABELS[lead.source] : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-2xl mb-2">🎯</p>
                <p className="font-ui text-sm text-ink/40">No leads match your filters</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showNew && (
        <NewLeadModal
          onClose={() => setShowNew(false)}
          onSave={lead => setLeads(prev => [lead, ...prev])}
          admins={admins}
          orgs={orgs}
        />
      )}
    </div>
  );
}
