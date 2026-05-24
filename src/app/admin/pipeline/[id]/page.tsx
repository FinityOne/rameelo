"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { STAGES } from "../page";

// ── Types ─────────────────────────────────────────────────────────────────────

type Lead = {
  id: string; first_name: string; last_name: string;
  email: string | null; phone: string | null; title: string | null;
  city: string | null; state: string | null; linkedin_url: string | null;
  organization_name: string | null; org_id: string | null; platform_user_id: string | null;
  stage: string; priority: string; source: string | null;
  assigned_to: string | null; next_follow_up_at: string | null;
  est_events_per_year: number | null; est_avg_attendance: number | null; est_avg_ticket_price: number | null;
  event_types: string[] | null; tags: string[] | null; internal_summary: string | null;
  created_at: string; updated_at: string; stage_updated_at: string;
};

type Note = {
  id: string; lead_id: string; author_id: string | null;
  note_type: string; body: string; metadata: Record<string, string> | null;
  created_at: string;
  author?: { first_name: string; last_name: string } | null;
};

type Doc         = { id: string; file_name: string; file_url: string; file_size_bytes: number | null; mime_type: string | null; created_at: string };
type AdminProfile = { id: string; first_name: string; last_name: string };
type OrgOption    = { id: string; name: string };
type ArtistOption = { id: string; name: string; slug: string };
type PastEvent    = {
  id: string; title: string; start_date: string;
  city: string | null; state: string | null; venue_name: string | null;
  artist_id: string | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const NOTE_TYPES = [
  { id: "note",    label: "Note",    emoji: "📝" },
  { id: "call",    label: "Call",    emoji: "📞" },
  { id: "email",   label: "Email",   emoji: "✉️" },
  { id: "sms",     label: "SMS",     emoji: "💬" },
  { id: "meeting", label: "Meeting", emoji: "🤝" },
  { id: "task",    label: "Task",    emoji: "✅" },
];

const PRIORITY_META = {
  hot:    { label: "HOT",  cls: "bg-red-50 text-red-600 border border-red-200" },
  high:   { label: "HIGH", cls: "bg-orange-50 text-orange-600 border border-orange-200" },
  medium: { label: "MED",  cls: "bg-blue-50 text-blue-600 border border-blue-200" },
  low:    { label: "LOW",  cls: "bg-slate-50 text-slate-500 border border-slate-200" },
};

const TEMPLATES: Record<string, { subject: string; sms: string; email: string }> = {
  new_lead: {
    subject: "Grow your garba event with Rameelo",
    sms: "Hi [Name]! I'm [Your Name] from Rameelo — the platform built for garba & navratri events. We'd love to help you sell tickets and grow your events. Would you have 15 min this week to chat?",
    email: `Hi [Name],\n\nI came across your organization and wanted to reach out about Rameelo — we're the leading platform for garba, navratri, and raas events across the USA.\n\nWe help organizers:\n• Sell tickets with zero fees to your organization\n• Reach thousands of garba enthusiasts in your city\n• Manage group orders and attendee communications\n\nWould you be open to a quick 15-min call this week?\n\nBest,\n[Your Name]`,
  },
  contacted: {
    subject: "Following up — Rameelo for [Org Name]",
    sms: "Hi [Name], just following up on my last message about Rameelo. Happy to show you how we've helped events like yours. Is this week a good time?",
    email: `Hi [Name],\n\nJust following up on my previous message. I know things get busy!\n\nI'd love to show you a quick demo — no commitment, just 15 minutes to see if it's a fit for your events.\n\nAre you free this week?\n\nBest,\n[Your Name]`,
  },
  qualified: {
    subject: "Your custom Rameelo setup — [Org Name]",
    sms: "Hi [Name]! Great connecting. Based on our chat I put together some numbers on what Rameelo could do for your events. Would love to walk you through it — are you free [day]?",
    email: `Hi [Name],\n\nGreat connecting with you! Based on what you shared about your events, I put together a quick breakdown of what Rameelo would look like for [Org Name].\n\nKey highlights:\n• 0% fees to your organization — attendees pay a small service fee\n• Automated ticket sales + group order management\n• Built-in promo tools to fill seats faster\n\nReady to walk through a live demo? I can do [day 1] or [day 2].\n\nBest,\n[Your Name]`,
  },
  demo: {
    subject: "Confirmed: Rameelo demo — [date]",
    sms: "Hi [Name] — looking forward to our call [date/time]! I'll send a calendar invite shortly. Feel free to reply if you need to reschedule.",
    email: `Hi [Name],\n\nLooking forward to our call on [date] at [time]!\n\nI'll send a calendar invite shortly. On the call, I'll walk you through:\n• Setting up your first event\n• How ticketing and payouts work\n• Group order features for navratri events\n\nSee you then!\n[Your Name]`,
  },
  negotiating: {
    subject: "Rameelo — next steps for [Org Name]",
    sms: "Hi [Name], thanks for the great conversation! I'm putting together the details we discussed and will send them over today. Any questions, just reply!",
    email: `Hi [Name],\n\nThanks for such a great conversation! I'm excited about the potential here.\n\nAs discussed, here's a summary for [Org Name]:\n• [Key points from demo]\n• [Any special arrangements]\n\nNext step: [specific action]\n\nLet me know if you have any questions.\n[Your Name]`,
  },
  onboarded: {
    subject: "Welcome to Rameelo, [Org Name]! 🎉",
    sms: "Welcome to Rameelo, [Name]! 🎉 Your account is live. I'm here if you need help setting up your first event. So excited to work with you!",
    email: `Hi [Name],\n\nWelcome to the Rameelo family! 🎉\n\nYour organization is live on the platform. Here's how to get started:\n1. Log in at rameelo.com/auth/signin\n2. Go to your Organizer Portal\n3. Create your first event\n\nI'm personally here to help through your first event.\n\n[Your Name]`,
  },
  nurture: {
    subject: "Checking in — garba season is coming up",
    sms: "Hi [Name]! [Your Name] from Rameelo here. Just thinking about you as navratri season approaches. Would love to reconnect — are you planning any events this year?",
    email: `Hi [Name],\n\nHope you're doing well! As garba season approaches, I wanted to check in about any upcoming events for [Org Name].\n\nWe've added great new features since we last spoke — including improved group orders and a new discovery page bringing in lots of new attendees.\n\nWould love to reconnect when the timing is right.\n\nBest,\n[Your Name]`,
  },
  lost: {
    subject: "Keeping the door open",
    sms: "Hi [Name], totally understand the timing wasn't right. If anything changes, I'm here! Wishing [Org Name] the best with your events. 🙏",
    email: `Hi [Name],\n\nCompletely understand — timing isn't always right.\n\nI'm keeping the door open if anything changes. We'll be here when you're ready.\n\nBest of luck with your events!\n[Your Name]`,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const NOTE_ICON: Record<string, string> = {
  note: "📝", call: "📞", email: "✉️", sms: "💬",
  meeting: "🤝", task: "✅", stage_change: "🔄",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[9px] uppercase tracking-widest transition-all ${copied ? "bg-emerald-50 text-emerald-600" : "bg-black/[0.04] text-ink/40 hover:text-ink/65 hover:bg-black/[0.07]"}`}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [lead,       setLead]       = useState<Lead | null>(null);
  const [notes,      setNotes]      = useState<Note[]>([]);
  const [docs,       setDocs]       = useState<Doc[]>([]);
  const [admins,     setAdmins]     = useState<AdminProfile[]>([]);
  const [orgs,       setOrgs]       = useState<OrgOption[]>([]);
  const [artists,    setArtists]    = useState<ArtistOption[]>([]);
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [loading,    setLoading]    = useState(true);

  const [editing,  setEditing]  = useState(false);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [saving,   setSaving]   = useState(false);

  const [noteBody,   setNoteBody]   = useState("");
  const [noteType,   setNoteType]   = useState("note");
  const [addingNote, setAddingNote] = useState(false);

  // Past event quick-add
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [qaForm, setQaForm] = useState({
    title: "", start_date: "", city: "", state: "", venue_name: "", artist_id: "",
  });
  const [addingEvent, setAddingEvent] = useState(false);
  const [qaError,     setQaError]     = useState("");

  // Revenue calculator (what-if)
  const [calcEvents, setCalcEvents] = useState("");
  const [calcAtt,    setCalcAtt]    = useState("");
  const [calcPrice,  setCalcPrice]  = useState("");

  const [activeTemplate, setActiveTemplate] = useState<"sms" | "email">("sms");

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    const [leadRes, notesRes, docsRes, adminsRes, orgsRes, artistsRes] = await Promise.all([
      supabase.from("sales_leads").select("*").eq("id", id).single(),
      supabase.from("sales_notes").select("*, author:author_id(first_name,last_name)").eq("lead_id", id).order("created_at", { ascending: false }),
      supabase.from("sales_documents").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, first_name, last_name").eq("role", "admin"),
      supabase.from("organizations").select("id, name"),
      supabase.from("artists").select("id, name, slug").eq("is_active", true).order("name"),
    ]);

    if (!leadRes.data) { router.push("/admin/pipeline"); return; }
    const l = leadRes.data as Lead;

    setLead(l);
    setEditForm(l);
    setCalcEvents(String(l.est_events_per_year ?? ""));
    setCalcAtt(String(l.est_avg_attendance ?? ""));
    setCalcPrice(String(l.est_avg_ticket_price ?? ""));
    setNotes((notesRes.data ?? []) as Note[]);
    setDocs((docsRes.data ?? []) as Doc[]);
    setAdmins((adminsRes.data ?? []) as AdminProfile[]);
    setOrgs((orgsRes.data ?? []) as OrgOption[]);
    setArtists((artistsRes.data ?? []) as ArtistOption[]);

    // Past events linked directly to this lead via lead_id
    const today = new Date().toISOString().split("T")[0];
    const { data: evData } = await supabase
      .from("events")
      .select("id, title, start_date, city, state, venue_name, artist_id")
      .eq("lead_id", id)
      .lt("start_date", today)
      .order("start_date", { ascending: false })
      .limit(50);
    setPastEvents((evData ?? []) as PastEvent[]);

    setLoading(false);
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function saveEdit() {
    if (!lead) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("sales_leads").update({
      first_name: editForm.first_name, last_name: editForm.last_name,
      email: editForm.email || null, phone: editForm.phone || null,
      title: editForm.title || null, city: editForm.city || null,
      state: editForm.state || null, linkedin_url: editForm.linkedin_url || null,
      organization_name: editForm.organization_name || null,
      org_id: editForm.org_id || null,
      priority: editForm.priority, source: editForm.source || null,
      assigned_to: editForm.assigned_to || null,
      next_follow_up_at: editForm.next_follow_up_at || null,
      est_events_per_year:  editForm.est_events_per_year  || null,
      est_avg_attendance:   editForm.est_avg_attendance   || null,
      est_avg_ticket_price: editForm.est_avg_ticket_price || null,
      internal_summary: editForm.internal_summary || null,
    }).eq("id", id);
    setLead(prev => prev ? { ...prev, ...editForm } as Lead : null);
    setEditing(false);
    setSaving(false);
  }

  async function changeStage(newStage: string) {
    if (!lead || lead.stage === newStage) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("sales_leads").update({ stage: newStage }).eq("id", id);
    await supabase.from("sales_notes").insert({
      lead_id: id, author_id: user?.id, note_type: "stage_change",
      body: `Stage moved from ${lead.stage} to ${newStage}`,
      metadata: { from_stage: lead.stage, to_stage: newStage },
    });
    setLead(prev => prev ? { ...prev, stage: newStage, stage_updated_at: new Date().toISOString() } : null);
    const newNotes = await supabase.from("sales_notes").select("*, author:author_id(first_name,last_name)").eq("lead_id", id).order("created_at", { ascending: false });
    setNotes((newNotes.data ?? []) as Note[]);
  }

  async function addNote() {
    if (!noteBody.trim()) return;
    setAddingNote(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("sales_notes").insert({ lead_id: id, author_id: user?.id, note_type: noteType, body: noteBody.trim() });
    setNoteBody("");
    setNoteType("note");
    const res = await supabase.from("sales_notes").select("*, author:author_id(first_name,last_name)").eq("lead_id", id).order("created_at", { ascending: false });
    setNotes((res.data ?? []) as Note[]);
    setAddingNote(false);
  }

  async function deleteNote(noteId: string) {
    const supabase = createClient();
    await supabase.from("sales_notes").delete().eq("id", noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }

  async function addPastEvent() {
    if (!qaForm.title.trim()) { setQaError("Event title is required."); return; }
    if (!qaForm.start_date)   { setQaError("Date is required."); return; }
    const today = new Date().toISOString().split("T")[0];
    if (qaForm.start_date >= today) { setQaError("Date must be in the past."); return; }
    setAddingEvent(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("events").insert({
      title:      qaForm.title.trim(),
      start_date: qaForm.start_date,
      city:       qaForm.city       || null,
      state:      qaForm.state      || null,
      venue_name: qaForm.venue_name || null,
      artist_id:  qaForm.artist_id  || null,
      org_id:     lead?.org_id      || null,
      lead_id:    id,
      status:             "published",
      selling_on_rameelo: false,
      category:           "garba",
    }).select("id, title, start_date, city, state, venue_name, artist_id").single();
    if (error) { setQaError(error.message); setAddingEvent(false); return; }
    setPastEvents(prev => [data as PastEvent, ...prev]);
    setQaForm({ title: "", start_date: "", city: "", state: "", venue_name: "", artist_id: "" });
    setQaError("");
    setShowQuickAdd(false);
    setAddingEvent(false);
  }

  // Revenue calc
  const calcArr   = calcEvents && calcAtt && calcPrice ? Number(calcEvents) * Number(calcAtt) * Number(calcPrice) * 0.03 : null;
  const calcGross = calcEvents && calcAtt && calcPrice ? Number(calcEvents) * Number(calcAtt) * Number(calcPrice) : null;

  const stageInfo   = STAGES.find(s => s.id === lead?.stage);
  const prio        = PRIORITY_META[(lead?.priority ?? "medium") as keyof typeof PRIORITY_META];
  const template    = TEMPLATES[lead?.stage ?? "new_lead"];
  const displayName = lead ? `${lead.first_name} ${lead.last_name}` : "";
  const company     = lead?.organization_name || (orgs.find(o => o.id === lead?.org_id)?.name);

  const inp   = "w-full rounded-lg border border-black/10 bg-white px-3 py-2 font-ui text-[13px] text-ink/80 placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-aubergine/15 focus:border-aubergine/30 transition-all";
  const label = "block font-mono text-[9px] uppercase tracking-widest text-ink/35 mb-1";

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-7 h-7 rounded-full border-2 border-black/10 border-t-aubergine animate-spin" />
    </div>
  );
  if (!lead) return null;

  return (
    <div className="space-y-5 max-w-7xl">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 flex-wrap">
        <Link href="/admin/pipeline" className="mt-1 text-ink/30 hover:text-ink/60 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display font-black text-ink/85 text-2xl" style={{ letterSpacing: "-0.03em" }}>{displayName}</h1>
            {company && <span className="font-ui text-ink/40 text-sm">· {company}</span>}
            {lead.title && <span className="font-ui text-ink/35 text-sm">{lead.title}</span>}
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-widest border ${lead.platform_user_id ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${lead.platform_user_id ? "bg-emerald-400" : "bg-slate-300"}`} />
              {lead.platform_user_id ? "On Platform" : "External Lead"}
            </span>
            <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded ${prio.cls}`}>{prio.label}</span>
            {pastEvents.length > 0 && (
              <span className="inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded-full bg-peacock/8 text-peacock/70 border border-peacock/15">
                {pastEvents.length} past event{pastEvents.length !== 1 ? "s" : ""} logged
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setEditing(!editing)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-ui font-medium text-[13px] border border-black/10 text-ink/55 hover:text-ink/80 hover:border-black/20 transition-all bg-white">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {/* ── Stage stepper ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-black/[0.06] px-4 py-3 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {STAGES.map((s, i) => {
            const stageIds   = STAGES.map(x => x.id);
            const currentIdx = stageIds.indexOf(lead.stage as typeof STAGES[number]["id"]);
            const isActive   = lead.stage === s.id;
            const isPast     = i < currentIdx && !["nurture", "lost"].includes(s.id);
            return (
              <button key={s.id} onClick={() => changeStage(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold uppercase tracking-widest transition-all ${
                  isActive ? "text-white shadow-sm" : isPast ? "text-emerald-600 bg-emerald-50" : "text-ink/30 hover:text-ink/60 hover:bg-black/[0.03]"
                }`}
                style={isActive ? { backgroundColor: s.color } : {}}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: isActive ? "rgba(255,255,255,0.6)" : isPast ? "#10b981" : s.dot }} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Three-column body ─────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5 items-start">

        {/* ── LEFT ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Contact card */}
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-black/[0.05]">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/35">Contact</p>
            </div>
            <div className="p-4 space-y-3">
              {editing ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className={label}>First Name</label><input className={inp} value={editForm.first_name ?? ""} onChange={e => setEditForm(f => ({...f, first_name: e.target.value}))} /></div>
                    <div><label className={label}>Last Name</label><input className={inp} value={editForm.last_name ?? ""} onChange={e => setEditForm(f => ({...f, last_name: e.target.value}))} /></div>
                  </div>
                  <div><label className={label}>Email</label><input className={inp} type="email" value={editForm.email ?? ""} onChange={e => setEditForm(f => ({...f, email: e.target.value}))} /></div>
                  <div><label className={label}>Phone</label><input className={inp} value={editForm.phone ?? ""} onChange={e => setEditForm(f => ({...f, phone: e.target.value}))} /></div>
                  <div><label className={label}>Title</label><input className={inp} value={editForm.title ?? ""} onChange={e => setEditForm(f => ({...f, title: e.target.value}))} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className={label}>City</label><input className={inp} value={editForm.city ?? ""} onChange={e => setEditForm(f => ({...f, city: e.target.value}))} /></div>
                    <div><label className={label}>State</label><input className={inp} value={editForm.state ?? ""} onChange={e => setEditForm(f => ({...f, state: e.target.value}))} /></div>
                  </div>
                  <div><label className={label}>LinkedIn URL</label><input className={inp} value={editForm.linkedin_url ?? ""} onChange={e => setEditForm(f => ({...f, linkedin_url: e.target.value}))} /></div>
                </>
              ) : (
                <dl className="space-y-3">
                  <div className="flex items-center gap-3">
                    <dt className="font-mono text-[9px] uppercase tracking-widest text-ink/30 w-16 shrink-0">Email</dt>
                    <dd className="flex-1 min-w-0">
                      {lead.email ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <a href={`mailto:${lead.email}`} className="font-ui text-[13px] text-aubergine/70 hover:text-aubergine transition-colors truncate">{lead.email}</a>
                          <CopyButton text={lead.email} />
                        </div>
                      ) : <span className="font-ui text-[12px] text-ink/28 italic">Not added</span>}
                    </dd>
                  </div>
                  <div className="flex items-center gap-3">
                    <dt className="font-mono text-[9px] uppercase tracking-widest text-ink/30 w-16 shrink-0">Phone</dt>
                    <dd className="flex-1 min-w-0">
                      {lead.phone ? (
                        <div className="flex items-center gap-2">
                          <a href={`tel:${lead.phone}`} className="font-ui text-[13px] text-aubergine/70 hover:text-aubergine transition-colors">{lead.phone}</a>
                          <CopyButton text={lead.phone} />
                        </div>
                      ) : <span className="font-ui text-[12px] text-ink/28 italic">Not added</span>}
                    </dd>
                  </div>
                  {lead.title && (
                    <div className="flex gap-3"><dt className="font-mono text-[9px] uppercase tracking-widest text-ink/30 w-16 shrink-0 mt-0.5">Title</dt><dd className="font-ui text-[13px] text-ink/65">{lead.title}</dd></div>
                  )}
                  {[lead.city, lead.state].filter(Boolean).length > 0 && (
                    <div className="flex gap-3"><dt className="font-mono text-[9px] uppercase tracking-widest text-ink/30 w-16 shrink-0 mt-0.5">Location</dt><dd className="font-ui text-[13px] text-ink/65">{[lead.city, lead.state].filter(Boolean).join(", ")}</dd></div>
                  )}
                  {lead.linkedin_url && (
                    <div className="flex gap-3">
                      <dt className="font-mono text-[9px] uppercase tracking-widest text-ink/30 w-16 shrink-0 mt-0.5">LinkedIn</dt>
                      <dd><a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="font-ui text-[13px] text-aubergine/70 hover:text-aubergine transition-colors">View Profile</a></dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </div>

          {/* Pipeline card */}
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-black/[0.05]">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/35">Pipeline</p>
            </div>
            <div className="p-4 space-y-3">
              {editing ? (
                <>
                  <div><label className={label}>Priority</label>
                    <select className={inp} value={editForm.priority ?? "medium"} onChange={e => setEditForm(f => ({...f, priority: e.target.value}))}>
                      <option value="low">Low</option><option value="medium">Medium</option>
                      <option value="high">High</option><option value="hot">🔥 Hot</option>
                    </select>
                  </div>
                  <div><label className={label}>Source</label>
                    <select className={inp} value={editForm.source ?? ""} onChange={e => setEditForm(f => ({...f, source: e.target.value}))}>
                      <option value="">—</option>
                      {["cold_outreach","referral","inbound","social","conference","partner","other"].map(s => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
                    </select>
                  </div>
                  <div><label className={label}>Assigned To</label>
                    <select className={inp} value={editForm.assigned_to ?? ""} onChange={e => setEditForm(f => ({...f, assigned_to: e.target.value}))}>
                      <option value="">— Unassigned —</option>
                      {admins.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
                    </select>
                  </div>
                  <div><label className={label}>Next Follow-up</label>
                    <input className={inp} type="date" value={editForm.next_follow_up_at ? editForm.next_follow_up_at.split("T")[0] : ""} onChange={e => setEditForm(f => ({...f, next_follow_up_at: e.target.value}))} />
                  </div>
                  <div><label className={label}>Organization Name</label>
                    <input className={inp} value={editForm.organization_name ?? ""} onChange={e => setEditForm(f => ({...f, organization_name: e.target.value}))} />
                  </div>
                  <div><label className={label}>Link to Platform Org</label>
                    <select className={inp} value={editForm.org_id ?? ""} onChange={e => setEditForm(f => ({...f, org_id: e.target.value}))}>
                      <option value="">— None —</option>
                      {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                  <div><label className={label}>Internal Notes</label>
                    <textarea className={`${inp} min-h-[72px] resize-none`} value={editForm.internal_summary ?? ""} onChange={e => setEditForm(f => ({...f, internal_summary: e.target.value}))} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={saveEdit} disabled={saving}
                      className="flex-1 py-2 rounded-lg font-ui font-semibold text-[13px] text-white transition-all disabled:opacity-50" style={{ backgroundColor: "#2E1B30" }}>
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                    <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg font-ui text-[13px] text-ink/50 hover:bg-black/5 border border-black/10 transition-all">
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <dl className="space-y-2">
                  {[
                    { k: "Stage",     v: stageInfo?.label },
                    { k: "Priority",  v: lead.priority },
                    { k: "Source",    v: lead.source?.replace(/_/g," ") },
                    { k: "Org",       v: company },
                    { k: "Follow-up", v: lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null },
                    { k: "Created",   v: new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                  ].map(row => row.v && (
                    <div key={row.k} className="flex gap-3">
                      <dt className="font-mono text-[9px] uppercase tracking-widest text-ink/30 w-16 shrink-0 mt-0.5">{row.k}</dt>
                      <dd className="font-ui text-[13px] text-ink/65">{row.v}</dd>
                    </div>
                  ))}
                  {lead.internal_summary && (
                    <div className="pt-2 border-t border-black/[0.05]">
                      <dt className="font-mono text-[9px] uppercase tracking-widest text-ink/30 mb-1">Notes</dt>
                      <dd className="font-ui text-[12px] text-ink/55 leading-relaxed">{lead.internal_summary}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </div>

          {lead.tags && lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {lead.tags.map(t => (
                <span key={t} className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-aubergine/8 text-aubergine/60 border border-aubergine/15">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* ── CENTER: Activity ─────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink/35 mb-3">Log Activity</p>
            <div className="flex gap-1 flex-wrap mb-3">
              {NOTE_TYPES.map(nt => (
                <button key={nt.id} onClick={() => setNoteType(nt.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all border ${noteType === nt.id ? "bg-aubergine/8 text-aubergine border-aubergine/20" : "text-ink/35 border-black/08 hover:text-ink/55 hover:bg-black/[0.03]"}`}>
                  <span>{nt.emoji}</span>{nt.label}
                </button>
              ))}
            </div>
            <textarea value={noteBody} onChange={e => setNoteBody(e.target.value)}
              placeholder={`Add a ${NOTE_TYPES.find(n => n.id === noteType)?.label.toLowerCase()}…`}
              className="w-full rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2.5 font-ui text-[13px] text-ink/75 placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-aubergine/15 min-h-[88px] resize-none transition-all"
              onKeyDown={e => { if (e.key === "Enter" && e.metaKey) addNote(); }} />
            <div className="flex items-center justify-between mt-2">
              <span className="font-mono text-[9px] text-ink/20">⌘ + Enter to save</span>
              <button onClick={addNote} disabled={addingNote || !noteBody.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-ui font-semibold text-[13px] text-white transition-all disabled:opacity-40"
                style={{ backgroundColor: "#2E1B30" }}>
                {addingNote ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-black/[0.05]">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/35">Activity <span className="ml-1 text-ink/25">({notes.length})</span></p>
            </div>
            {notes.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-2xl mb-1.5">💬</p>
                <p className="font-ui text-[12px] text-ink/35">No activity yet. Log your first touchpoint above.</p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.04] max-h-[520px] overflow-y-auto">
                {notes.map(n => (
                  <div key={n.id} className="px-4 py-3.5 group">
                    <div className="flex items-start gap-3">
                      <span className="text-base mt-0.5 shrink-0">{NOTE_ICON[n.note_type] ?? "📝"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-[9px] uppercase tracking-widest text-ink/35">{n.note_type.replace("_"," ")}</span>
                          {n.author && <span className="font-ui text-[11px] text-ink/45">{n.author.first_name} {n.author.last_name}</span>}
                          <span className="font-mono text-[9px] text-ink/25">{timeAgo(n.created_at)}</span>
                          <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => deleteNote(n.id)} className="font-mono text-[9px] text-ink/25 hover:text-red-400 transition-colors uppercase tracking-widest">Delete</button>
                          </span>
                        </div>
                        {n.note_type === "stage_change" ? (
                          <p className="font-ui text-[12px] text-ink/50 italic">{n.body}</p>
                        ) : (
                          <p className="font-ui text-[13px] text-ink/70 leading-relaxed whitespace-pre-wrap">{n.body}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Calculator + Templates + Docs ─────────────── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-black/[0.05]">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/35">Revenue Calculator</p>
            </div>
            <div className="p-4 space-y-3">
              <div><label className={label}>Events per year</label><input className={inp} type="number" min="0" value={calcEvents} onChange={e => setCalcEvents(e.target.value)} placeholder="3" /></div>
              <div><label className={label}>Avg attendance per event</label><input className={inp} type="number" min="0" value={calcAtt} onChange={e => setCalcAtt(e.target.value)} placeholder="500" /></div>
              <div><label className={label}>Avg ticket price ($)</label><input className={inp} type="number" min="0" step="0.01" value={calcPrice} onChange={e => setCalcPrice(e.target.value)} placeholder="25" /></div>
              {calcArr != null ? (
                <div className="rounded-xl p-4 space-y-2.5 mt-1" style={{ background: "linear-gradient(135deg, rgba(46,27,48,0.06), rgba(46,27,48,0.03))", border: "1px solid rgba(46,27,48,0.1)" }}>
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-ink/40">Gross ticket revenue</span>
                    <span className="font-display font-bold text-ink/60 text-sm">{fmtMoney(calcGross!)}</span>
                  </div>
                  <div className="h-px bg-black/[0.06]" />
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-ink/40">Rameelo fee (3%)</span>
                    <span className="font-display font-black text-[#F5A623] text-xl" style={{ letterSpacing: "-0.03em" }}>{fmtMoney(calcArr)}<span className="text-sm font-bold text-ink/30">/yr</span></span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-ink/30">5-year value</span>
                    <span className="font-display font-bold text-ink/50 text-sm">{fmtMoney(calcArr * 5)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-ink/30">10-year value</span>
                    <span className="font-display font-bold text-ink/40 text-sm">{fmtMoney(calcArr * 10)}</span>
                  </div>
                </div>
              ) : (
                <p className="font-ui text-[11px] text-ink/30 text-center py-2">Fill in all three fields to see projections</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-black/[0.05] flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/35">Outreach Templates</p>
              <div className="flex border border-black/10 rounded-lg overflow-hidden">
                {(["sms","email"] as const).map(t => (
                  <button key={t} onClick={() => setActiveTemplate(t)}
                    className={`px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest transition-all ${activeTemplate === t ? "bg-ink/5 text-ink/60" : "text-ink/25 hover:text-ink/45"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-ink/30">Template for:</span>
                <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: stageInfo?.color, backgroundColor: stageInfo?.bg }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stageInfo?.dot }} />
                  {stageInfo?.label}
                </span>
              </div>
              {activeTemplate === "email" && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={label}>Subject</label>
                    <CopyButton text={template.subject} />
                  </div>
                  <p className="font-ui text-[12px] text-ink/60 bg-black/[0.02] rounded-lg px-3 py-2 border border-black/[0.06]">{template.subject}</p>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={label}>{activeTemplate === "sms" ? "SMS Message" : "Email Body"}</label>
                  <CopyButton text={activeTemplate === "sms" ? template.sms : template.email} />
                </div>
                <div className="font-ui text-[12px] text-ink/60 bg-black/[0.02] rounded-lg px-3 py-2.5 border border-black/[0.06] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {activeTemplate === "sms" ? template.sms : template.email}
                </div>
                <p className="font-mono text-[9px] text-ink/25 mt-1.5">Replace [Name], [Org Name], [Your Name] with real values</p>
              </div>
              <div>
                <p className={`${label} mb-2`}>Other stage templates</p>
                <div className="flex flex-wrap gap-1">
                  {STAGES.filter(s => s.id !== lead.stage).map(s => (
                    <button key={s.id} onClick={() => changeStage(s.id)}
                      className="font-mono text-[9px] px-2 py-0.5 rounded-full border transition-all hover:opacity-80"
                      style={{ color: s.color, borderColor: s.color + "44", backgroundColor: s.bg }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-black/[0.05]">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/35">Documents <span className="text-ink/25">({docs.length})</span></p>
            </div>
            <div className="p-4">
              {docs.length === 0 ? (
                <p className="font-ui text-[12px] text-ink/30 text-center py-3">No documents attached</p>
              ) : (
                <div className="space-y-2">
                  {docs.map(d => (
                    <a key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-black/[0.03] transition-colors group">
                      <svg className="w-4 h-4 text-aubergine/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      <div className="flex-1 min-w-0">
                        <p className="font-ui text-[12px] text-ink/65 truncate group-hover:text-aubergine transition-colors">{d.file_name}</p>
                        <p className="font-mono text-[9px] text-ink/25">{fmtDateTime(d.created_at)}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
              <p className="font-mono text-[9px] text-ink/20 mt-3 text-center">Document upload coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Past Events ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink/35">
              Past Events {pastEvents.length > 0 && <span className="ml-1 text-ink/25">· {pastEvents.length} logged</span>}
            </p>
            <p className="font-ui text-[12px] text-ink/40 mt-0.5">
              Events this organizer has run. Each can have the artist who performed.
            </p>
          </div>
          <button onClick={() => { setShowQuickAdd(p => !p); setQaError(""); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-ui font-semibold text-[13px] text-white transition-all hover:opacity-90 shrink-0"
            style={{ backgroundColor: "#2E1B30" }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Add Past Event
          </button>
        </div>

        {/* Quick-add form */}
        {showQuickAdd && (
          <div className="p-5 border-b border-black/[0.05] bg-black/[0.015]">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/30 mb-3">New Past Event</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {/* Title spans full width on sm, 2 cols on larger */}
              <div className="col-span-2 sm:col-span-2">
                <label className="block font-mono text-[9px] uppercase tracking-widest text-ink/35 mb-1">Event Name *</label>
                <input className={inp} value={qaForm.title} onChange={e => setQaForm(f => ({...f, title: e.target.value}))} placeholder="Navratri Mahotsav 2024" />
              </div>
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-widest text-ink/35 mb-1">Date *</label>
                <input className={inp} type="date" value={qaForm.start_date} onChange={e => setQaForm(f => ({...f, start_date: e.target.value}))} max={new Date().toISOString().split("T")[0]} />
              </div>
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-widest text-ink/35 mb-1">City</label>
                <input className={inp} value={qaForm.city} onChange={e => setQaForm(f => ({...f, city: e.target.value}))} placeholder="Houston" />
              </div>
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-widest text-ink/35 mb-1">State</label>
                <input className={inp} value={qaForm.state} onChange={e => setQaForm(f => ({...f, state: e.target.value}))} placeholder="TX" />
              </div>
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-widest text-ink/35 mb-1">Venue</label>
                <input className={inp} value={qaForm.venue_name} onChange={e => setQaForm(f => ({...f, venue_name: e.target.value}))} placeholder="NRG Arena" />
              </div>
              <div className="col-span-2">
                <label className="block font-mono text-[9px] uppercase tracking-widest text-ink/35 mb-1">Artist Who Performed</label>
                <select className={inp} value={qaForm.artist_id} onChange={e => setQaForm(f => ({...f, artist_id: e.target.value}))}>
                  <option value="">— Select artist (optional) —</option>
                  {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            {qaError && <p className="font-ui text-xs text-red-500 mb-2">{qaError}</p>}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={addPastEvent} disabled={addingEvent}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg font-ui font-semibold text-[13px] text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: "#2E1B30" }}>
                {addingEvent ? "Saving…" : "Save Event"}
              </button>
              <button onClick={() => { setShowQuickAdd(false); setQaForm({ title: "", start_date: "", city: "", state: "", venue_name: "", artist_id: "" }); setQaError(""); }}
                className="px-4 py-2 rounded-lg font-ui text-[13px] text-ink/45 hover:bg-black/5 transition-all">
                Cancel
              </button>
              <p className="font-mono text-[9px] text-ink/25 ml-auto">
                If an artist is selected, this event will appear on their public profile
              </p>
            </div>
          </div>
        )}

        {/* Past events list */}
        {pastEvents.length === 0 && !showQuickAdd ? (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-ink/[0.04] flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-ink/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-ui text-[13px] text-ink/40 font-medium">No past events logged yet</p>
            <p className="font-mono text-[9px] text-ink/25 mt-1 max-w-xs mx-auto">
              Got a flyer? Log their past shows above — event name + date is all you need. Add the artist if you know who performed.
            </p>
          </div>
        ) : pastEvents.length > 0 ? (
          <div className="divide-y divide-black/[0.04]">
            {pastEvents.map(ev => {
              const d = new Date(ev.start_date + "T00:00:00");
              const artist = ev.artist_id ? artists.find(a => a.id === ev.artist_id) : null;
              return (
                <div key={ev.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-black/[0.01] transition-colors group">
                  <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 bg-ink/[0.04]">
                    <p className="font-display font-bold text-ink/55 text-sm leading-none">{d.getDate()}</p>
                    <p className="font-mono text-[8px] uppercase tracking-wide text-ink/30">
                      {d.toLocaleString("en-US", { month: "short" })} {d.getFullYear()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-ui text-[13px] font-semibold text-ink/75 truncate">{ev.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {[ev.venue_name, ev.city, ev.state].filter(Boolean).length > 0 && (
                        <p className="font-mono text-[10px] text-ink/35">{[ev.venue_name, ev.city, ev.state].filter(Boolean).join(" · ")}</p>
                      )}
                      {artist && (
                        <>
                          <span className="text-ink/20">·</span>
                          <Link href={`/artists/${artist.slug}`} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-[9px] text-aubergine/55 hover:text-aubergine transition-colors">
                            🎵 {artist.name}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <Link href={`/events/${ev.id}`} target="_blank" rel="noopener noreferrer"
                    className="text-ink/20 hover:text-aubergine transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

    </div>
  );
}
