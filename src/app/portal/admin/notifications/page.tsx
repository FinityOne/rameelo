"use client";

import { useState } from "react";
import Link from "next/link";
import { useNotifications } from "@/hooks/useNotifications";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  new_event_submission:  { label: "Event Submission",  color: "bg-peacock/10 text-peacock" },
  new_user_signup:       { label: "New User",          color: "bg-marigold/10 text-aubergine" },
  new_organization:      { label: "Organization",      color: "bg-aubergine/10 text-aubergine" },
  collegiate_application:{ label: "Collegiate App",   color: "bg-aubergine/10 text-aubergine" },
  payout_processed:      { label: "Payout",            color: "bg-emerald-500/10 text-emerald-600" },
  low_inventory:         { label: "Low Inventory",     color: "bg-orange-500/10 text-orange-600" },
  system_alert:          { label: "System Alert",      color: "bg-red-500/10 text-red-600" },
  event_flagged:         { label: "Flagged Content",   color: "bg-red-500/10 text-red-600" },
  refund_requested:      { label: "Refund Request",    color: "bg-orange-500/10 text-orange-600" },
};

const ALL_TYPES = Object.keys(TYPE_LABELS);

const ICON_SVG: Record<string, React.ReactNode> = {
  new_event_submission:  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  new_user_signup:       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  new_organization:      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" /></svg>,
  collegiate_application:<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /></svg>,
  payout_processed:      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  low_inventory:         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  system_alert:          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  event_flagged:         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>,
  refund_requested:      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>,
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STATS = [
  { label: "Total alerts", key: "total" },
  { label: "Unread",       key: "unread" },
  { label: "Today",        key: "today" },
  { label: "Critical",     key: "critical" },
];

export default function AdminNotificationsPage() {
  const { notifications, loading, unreadCount, markRead, markAllRead } = useNotifications({
    audience: "admin",
    limit: 100,
  });
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRead, setFilterRead] = useState<"all" | "unread">("all");

  const today = new Date().toDateString();
  const todayCount = notifications.filter((n) => new Date(n.created_at).toDateString() === today).length;
  const criticalCount = notifications.filter((n) =>
    ["system_alert", "event_flagged", "refund_requested"].includes(n.type)
  ).length;

  const statValues: Record<string, number> = {
    total: notifications.length,
    unread: unreadCount,
    today: todayCount,
    critical: criticalCount,
  };

  const filtered = notifications.filter((n) => {
    if (filterType !== "all" && n.type !== filterType) return false;
    if (filterRead === "unread" && n.read) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.key} className="bg-white rounded-2xl border border-ivory-200 p-4 shadow-sm">
            <p className="font-display font-black text-ink text-2xl" style={{ letterSpacing: "-0.03em" }}>
              {statValues[s.key]}
            </p>
            <p className="font-mono text-[9px] text-ink/40 uppercase tracking-widest mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-ivory-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-ivory-200 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="font-ui text-xs border border-ivory-200 rounded-xl px-3 py-2 bg-ivory text-ink focus:outline-none focus:border-aubergine/40"
            >
              <option value="all">All types</option>
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]?.label ?? t}</option>
              ))}
            </select>

            <div className="flex rounded-xl border border-ivory-200 overflow-hidden">
              {(["all", "unread"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setFilterRead(v)}
                  className={`px-3 py-2 font-mono text-[9px] uppercase tracking-widest transition-colors ${
                    filterRead === v ? "bg-aubergine text-white" : "bg-ivory text-ink/40 hover:text-ink/70"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="font-mono text-[9px] uppercase tracking-widest text-peacock hover:text-aubergine transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
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
            {filtered.map((n) => {
              const meta = TYPE_LABELS[n.type];
              const icon = ICON_SVG[n.type] ?? ICON_SVG.system_alert;

              const row = (
                <div
                  key={n.id}
                  onClick={() => { if (!n.read) markRead(n.id); }}
                  className={`flex items-start gap-4 px-5 py-4 hover:bg-ivory transition-colors cursor-pointer ${!n.read ? "bg-marigold/2" : ""}`}
                >
                  {/* Unread dot */}
                  <div className="w-2 h-2 mt-2 shrink-0">
                    {!n.read && <span className="block w-2 h-2 bg-durga rounded-full animate-pulse" />}
                  </div>

                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta?.color ?? "bg-ink/8 text-ink/50"}`}>
                    {icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`font-ui text-sm leading-snug ${!n.read ? "font-semibold text-ink" : "text-ink/70"}`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="font-ui text-xs text-ink-muted mt-0.5 leading-snug">{n.body}</p>
                        )}
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

      {/* Info callout */}
      <div className="bg-aubergine/5 border border-aubergine/15 rounded-2xl px-5 py-4">
        <p className="font-ui text-sm text-aubergine font-semibold mb-1">About admin notifications</p>
        <p className="font-ui text-xs text-ink/60 leading-relaxed">
          These alerts are automatically generated when key events happen on the platform — new event submissions,
          user signups, payout processing, low inventory warnings, and system alerts. They're visible to all
          admins in real time. Click any row to mark it read and follow the link if one is attached.
        </p>
      </div>
    </div>
  );
}
