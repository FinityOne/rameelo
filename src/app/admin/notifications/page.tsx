"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationIconKey } from "@/hooks/useNotifications";

const TYPE_META: Record<string, { label: string; color: string }> = {
  new_event_submission:   { label: "Event Submission",  color: "bg-peacock/10 text-peacock" },
  new_user_signup:        { label: "New User",          color: "bg-marigold/10 text-aubergine" },
  new_organization:       { label: "Organization",      color: "bg-aubergine/10 text-aubergine" },
  collegiate_application: { label: "Collegiate App",    color: "bg-aubergine/10 text-aubergine" },
  payout_processed:       { label: "Payout",            color: "bg-emerald-500/10 text-emerald-600" },
  low_inventory:          { label: "Low Inventory",     color: "bg-orange-500/10 text-orange-600" },
  system_alert:           { label: "System Alert",      color: "bg-red-500/10 text-red-600" },
  event_flagged:          { label: "Flagged Content",   color: "bg-red-500/10 text-red-600" },
  refund_requested:       { label: "Refund Request",    color: "bg-orange-500/10 text-orange-600" },
  announcement:           { label: "Announcement",      color: "bg-peacock/10 text-peacock" },
  manual:                 { label: "Manual",            color: "bg-ink/8 text-ink/50" },
};

const SEND_TYPES = [
  { value: "announcement", label: "Platform announcement" },
  { value: "system_alert", label: "System alert" },
  { value: "manual",       label: "General message" },
];

const ICON_OPTIONS: { value: NotificationIconKey; label: string }[] = [
  { value: "bell",       label: "🔔 Bell" },
  { value: "star",       label: "⭐ Star" },
  { value: "check",      label: "✅ Check" },
  { value: "alert",      label: "⚠️ Alert" },
  { value: "event",      label: "📅 Event" },
  { value: "ticket",     label: "🎟 Ticket" },
  { value: "payout",     label: "💰 Payout" },
];

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type SendTarget = "all_members" | "specific_member" | "all_admins";

export default function AdminNotificationsPage() {
  const { notifications, loading, unreadCount, markRead, markAllRead, refetch } =
    useNotifications({ audience: "admin", limit: 100 });

  const [filterType, setFilterType]     = useState<string>("all");
  const [filterRead, setFilterRead]     = useState<"all" | "unread">("all");

  // Send form
  const [sendOpen, setSendOpen]         = useState(false);
  const [target, setTarget]             = useState<SendTarget>("all_admins");
  const [targetEmail, setTargetEmail]   = useState("");
  const [sendType, setSendType]         = useState("announcement");
  const [sendIcon, setSendIcon]         = useState<NotificationIconKey>("bell");
  const [sendTitle, setSendTitle]       = useState("");
  const [sendBody, setSendBody]         = useState("");
  const [sendHref, setSendHref]         = useState("");
  const [sending, setSending]           = useState(false);
  const [sendError, setSendError]       = useState("");
  const [sendSuccess, setSendSuccess]   = useState("");

  const today = new Date().toDateString();
  const todayCount   = notifications.filter(n => new Date(n.created_at).toDateString() === today).length;
  const criticalCount = notifications.filter(n => ["system_alert","event_flagged","refund_requested"].includes(n.type)).length;

  const filtered = notifications.filter(n => {
    if (filterType !== "all" && n.type !== filterType) return false;
    if (filterRead === "unread" && n.read) return false;
    return true;
  });

  async function handleSend() {
    if (!sendTitle.trim()) { setSendError("Title is required"); return; }
    if (target === "specific_member" && !targetEmail.trim()) { setSendError("Email is required for specific member"); return; }
    setSending(true);
    setSendError("");

    const supabase = createClient();

    if (target === "all_admins") {
      // Single admin-audience broadcast row
      const { error } = await supabase.from("notifications").insert({
        user_id: null,
        audience: "admin",
        type: sendType,
        title: sendTitle.trim(),
        body: sendBody.trim(),
        href: sendHref.trim() || null,
        icon_key: sendIcon,
      });
      if (error) { setSendError(error.message); setSending(false); return; }

    } else if (target === "specific_member") {
      // Look up user by email
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", targetEmail.trim().toLowerCase())
        .limit(1);

      if (!profiles || profiles.length === 0) {
        setSendError("No member found with that email address");
        setSending(false);
        return;
      }

      const { error } = await supabase.from("notifications").insert({
        user_id: profiles[0].id,
        audience: "user",
        type: sendType,
        title: sendTitle.trim(),
        body: sendBody.trim(),
        href: sendHref.trim() || null,
        icon_key: sendIcon,
      });
      if (error) { setSendError(error.message); setSending(false); return; }

    } else if (target === "all_members") {
      // Fetch all member IDs and insert one row per member
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "user");

      if (!profiles || profiles.length === 0) {
        setSendError("No members found");
        setSending(false);
        return;
      }

      const rows = profiles.map(p => ({
        user_id: p.id,
        audience: "user",
        type: sendType,
        title: sendTitle.trim(),
        body: sendBody.trim(),
        href: sendHref.trim() || null,
        icon_key: sendIcon,
      }));

      // Insert in chunks of 100 to stay within payload limits
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await supabase.from("notifications").insert(rows.slice(i, i + 100));
        if (error) { setSendError(error.message); setSending(false); return; }
      }
    }

    setSending(false);
    setSendSuccess(
      target === "all_admins"    ? "Sent to all admins" :
      target === "all_members"   ? "Sent to all members" :
      `Sent to ${targetEmail}`
    );
    setSendTitle("");
    setSendBody("");
    setSendHref("");
    setTargetEmail("");
    refetch();
    setTimeout(() => { setSendSuccess(""); setSendOpen(false); }, 2500);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total alerts",  value: notifications.length },
          { label: "Unread",        value: unreadCount },
          { label: "Today",         value: todayCount },
          { label: "Critical",      value: criticalCount },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-ivory-200 p-4 shadow-sm text-center">
            <p className="font-display font-black text-ink text-2xl" style={{ letterSpacing: "-0.03em" }}>{s.value}</p>
            <p className="font-mono text-[9px] text-ink/40 uppercase tracking-widest mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Send notification */}
      <div className="bg-white rounded-2xl border border-ivory-200 shadow-sm overflow-hidden">
        <button onClick={() => setSendOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-ivory/60 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-aubergine/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-aubergine" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-display font-bold text-ink text-sm">Send Notification</p>
              <p className="font-mono text-[9px] text-ink/40 uppercase tracking-widest">To members or admin team</p>
            </div>
          </div>
          <svg className={`w-4 h-4 text-ink/40 transition-transform ${sendOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {sendOpen && (
          <div className="border-t border-ivory-200 px-5 py-5 space-y-4">
            {/* Target */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">Send to</p>
              <div className="flex flex-wrap gap-2">
                {([
                  ["all_admins",      "All admins"],
                  ["specific_member", "Specific member"],
                  ["all_members",     "All members"],
                ] as [SendTarget, string][]).map(([v, label]) => (
                  <button key={v} onClick={() => setTarget(v)}
                    className={`px-3.5 py-2 rounded-xl font-ui font-semibold text-xs transition-all ${target === v ? "bg-aubergine text-white" : "bg-ivory border border-ivory-200 text-ink/60 hover:text-ink"}`}>
                    {label}
                  </button>
                ))}
              </div>
              {target === "all_members" && (
                <p className="font-mono text-[9px] text-orange-500 mt-2">This sends to every member — use sparingly.</p>
              )}
            </div>

            {target === "specific_member" && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">Member email</p>
                <input type="email" placeholder="member@example.com" value={targetEmail} onChange={e => setTargetEmail(e.target.value)}
                  className="w-full rounded-xl border border-ivory-200 px-4 py-3 font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all" />
              </div>
            )}

            {/* Type + Icon row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">Type</p>
                <select value={sendType} onChange={e => setSendType(e.target.value)}
                  className="w-full rounded-xl border border-ivory-200 px-3 py-3 font-ui text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-aubergine/25">
                  {SEND_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">Icon</p>
                <select value={sendIcon} onChange={e => setSendIcon(e.target.value as NotificationIconKey)}
                  className="w-full rounded-xl border border-ivory-200 px-3 py-3 font-ui text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-aubergine/25">
                  {ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Title */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">Title *</p>
              <input type="text" placeholder="e.g. Navratri 2026 is now live!" value={sendTitle} onChange={e => setSendTitle(e.target.value)}
                className="w-full rounded-xl border border-ivory-200 px-4 py-3 font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all" />
            </div>

            {/* Body */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">Message body</p>
              <textarea rows={2} placeholder="Optional extra detail shown below the title…" value={sendBody} onChange={e => setSendBody(e.target.value)}
                className="w-full rounded-xl border border-ivory-200 px-4 py-3 font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all resize-none" />
            </div>

            {/* Link */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">Link (optional)</p>
              <input type="text" placeholder="/events or /portal/tickets" value={sendHref} onChange={e => setSendHref(e.target.value)}
                className="w-full rounded-xl border border-ivory-200 px-4 py-3 font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all" />
            </div>

            {sendError   && <p className="font-ui text-sm text-durga">{sendError}</p>}
            {sendSuccess && (
              <div className="flex items-center gap-2 px-4 py-3 bg-peacock/10 border border-peacock/20 rounded-xl">
                <svg className="w-4 h-4 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                <p className="font-ui text-sm text-peacock font-semibold">{sendSuccess}</p>
              </div>
            )}

            <button onClick={handleSend} disabled={!sendTitle.trim() || sending}
              className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm transition-all flex items-center justify-center gap-2 ${sendTitle.trim() && !sending ? "bg-aubergine text-white hover:opacity-90" : "bg-ivory text-ink-muted cursor-not-allowed"}`}>
              {sending
                ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Sending…</>
                : <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    Send notification
                  </>
              }
            </button>
          </div>
        )}
      </div>

      {/* Filter + list */}
      <div className="bg-white rounded-2xl border border-ivory-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-ivory-200 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="font-ui text-xs border border-ivory-200 rounded-xl px-3 py-2 bg-ivory text-ink focus:outline-none focus:border-aubergine/40">
              <option value="all">All types</option>
              {Object.keys(TYPE_META).map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
            </select>
            <div className="flex rounded-xl border border-ivory-200 overflow-hidden">
              {(["all", "unread"] as const).map(v => (
                <button key={v} onClick={() => setFilterRead(v)}
                  className={`px-3 py-2 font-mono text-[9px] uppercase tracking-widest transition-colors ${filterRead === v ? "bg-aubergine text-white" : "bg-ivory text-ink/40 hover:text-ink/70"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="font-mono text-[9px] uppercase tracking-widest text-peacock hover:text-aubergine transition-colors">
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-ivory-200 border-t-marigold animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-ivory-200 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-ink/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-ui text-sm text-ink/40">No alerts match your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-ivory-200">
            {filtered.map(n => {
              const meta = TYPE_META[n.type];
              const row = (
                <div key={n.id} onClick={() => { if (!n.read) markRead(n.id); }}
                  className={`flex items-start gap-4 px-5 py-4 hover:bg-ivory transition-colors cursor-pointer ${!n.read ? "bg-marigold/2" : ""}`}>
                  <div className="w-2 h-2 mt-2 shrink-0">
                    {!n.read && <span className="block w-2 h-2 bg-durga rounded-full animate-pulse" />}
                  </div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta?.color ?? "bg-ink/8 text-ink/50"}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`font-ui text-sm leading-snug ${!n.read ? "font-semibold text-ink" : "text-ink/70"}`}>{n.title}</p>
                        {n.body && <p className="font-ui text-xs text-ink-muted mt-0.5 leading-snug">{n.body}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {meta && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[8px] font-bold uppercase tracking-wide ${meta.color}`}>
                            {meta.label}
                          </span>
                        )}
                        <p className="font-mono text-[9px] text-ink/30 uppercase tracking-wider whitespace-nowrap">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
              if (n.href) return <Link key={n.id} href={n.href}>{row}</Link>;
              return <div key={n.id}>{row}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
