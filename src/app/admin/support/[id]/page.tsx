"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { STATUSES, STATUS_META, issueTypeLabel, srRef, type SupportStatus } from "@/lib/support";

type Request = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  name: string | null;
  email: string;
  issue_type: string;
  reference: string | null;
  description: string;
  attachment_url: string | null;
  attachment_name: string | null;
  status: SupportStatus;
  admin_notes: string | null;
  resolved_at: string | null;
};

function fmtTS(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ivory-200 last:border-0">
      <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted shrink-0 pt-0.5">{label}</span>
      <span className="font-ui text-sm text-ink text-right min-w-0 break-words">{value}</span>
    </div>
  );
}

export default function AdminSupportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [req, setReq] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("support_requests")
        .select("id, created_at, updated_at, user_id, name, email, issue_type, reference, description, attachment_url, attachment_name, status, admin_notes, resolved_at")
        .eq("id", id)
        .single();
      if (!data) { router.replace("/admin/support"); return; }
      setReq(data as Request);
      setNotes((data as Request).admin_notes ?? "");
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function changeStatus(next: SupportStatus) {
    if (!req || next === req.status) return;
    setSavingStatus(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_update_support_request", { p_id: req.id, p_status: next, p_notes: null });
    if (!error) {
      setReq(prev => prev ? { ...prev, status: next, resolved_at: (next === "resolved" || next === "closed") ? (prev.resolved_at ?? new Date().toISOString()) : null, updated_at: new Date().toISOString() } : prev);
    }
    setSavingStatus(false);
  }

  async function saveNotes() {
    if (!req) return;
    setSavingNotes(true);
    setNotesSaved(false);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_update_support_request", { p_id: req.id, p_status: req.status, p_notes: notes });
    if (!error) {
      setReq(prev => prev ? { ...prev, admin_notes: notes, updated_at: new Date().toISOString() } : prev);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
    }
    setSavingNotes(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }
  if (!req) return null;

  const meta = STATUS_META[req.status];
  const replyHref = `mailto:${req.email}?subject=${encodeURIComponent(`Re: your Rameelo support request ${srRef(req.id)}`)}`;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0 text-xs">
        <Link href="/admin/support" className="font-ui text-ink-muted hover:text-ink flex items-center gap-1 shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Support
        </Link>
        <span className="text-ink-muted/40">/</span>
        <span className="font-mono text-ink-muted truncate">{srRef(req.id)}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-ivory-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${meta.pill}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
              </span>
              {req.attachment_url && <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-aubergine/10 text-aubergine">Attachment</span>}
            </div>
            <p className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>{issueTypeLabel(req.issue_type)}</p>
            <p className="font-ui text-sm text-ink-muted mt-0.5">{srRef(req.id)} · Received {fmtTS(req.created_at)}</p>
          </div>
          <a href={replyHref}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:opacity-90 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Reply by email
          </a>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 items-start">
        {/* Left: the request */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3 bg-ivory border-b border-ivory-200">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">The request</p>
            </div>
            <div className="px-5 py-4">
              <p className="font-ui text-sm text-ink leading-relaxed whitespace-pre-wrap">{req.description}</p>
              {req.attachment_url && (
                <a href={req.attachment_url} target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ivory-200 bg-ivory text-aubergine font-ui font-semibold text-sm hover:bg-white transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  {req.attachment_name || "View attachment"}
                </a>
              )}
            </div>
          </div>

          {/* Admin notes */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3 bg-ivory border-b border-ivory-200 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Internal notes</p>
              {notesSaved && <span className="font-mono text-[9px] text-peacock uppercase tracking-widest">Saved ✓</span>}
            </div>
            <div className="px-5 py-4">
              <textarea
                rows={4}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Private notes for the team — what was done, who's handling it, next steps…"
                className="w-full rounded-xl border border-ivory-200 bg-ivory px-3 py-2.5 font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-aubergine/15 focus:border-aubergine transition-all resize-none"
              />
              <button onClick={saveNotes} disabled={savingNotes}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60">
                {savingNotes ? "Saving…" : "Save notes"}
              </button>
            </div>
          </div>
        </div>

        {/* Right: manage */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3 bg-ivory border-b border-ivory-200">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Status</p>
            </div>
            <div className="px-4 py-4 space-y-1.5">
              {STATUSES.map(s => {
                const active = s.value === req.status;
                return (
                  <button key={s.value} onClick={() => changeStatus(s.value)} disabled={savingStatus || active}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-ui text-sm transition-all ${active ? "bg-ivory ring-1 ring-aubergine/20 font-semibold text-ink" : "hover:bg-ivory/60 text-ink-muted"}`}>
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    {s.label}
                    {active && <svg className="w-4 h-4 text-peacock ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Requester */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3 bg-ivory border-b border-ivory-200 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Requester</p>
              {req.user_id
                ? <Link href={`/admin/users/${req.user_id}`} className="font-ui text-xs font-semibold text-aubergine hover:underline">Profile →</Link>
                : <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted/60">Guest</span>}
            </div>
            <div className="px-5 py-4">
              <p className="font-display font-bold text-ink text-sm">{req.name || "—"}</p>
              <Row label="Email" value={<a href={`mailto:${req.email}`} className="text-aubergine hover:underline break-all">{req.email}</a>} />
              {req.reference && <Row label="Their ref" value={<span className="font-mono">{req.reference}</span>} />}
              <Row label="Received" value={fmtTS(req.created_at)} />
              <Row label="Updated" value={fmtTS(req.updated_at)} />
              {req.resolved_at && <Row label="Resolved" value={fmtTS(req.resolved_at)} />}
            </div>
          </div>
        </div>
      </div>

      <p className="font-mono text-[10px] text-ink-muted/60 text-center break-all">Request ID: {req.id}</p>
    </div>
  );
}
