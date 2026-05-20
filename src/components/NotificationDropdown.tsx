"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useNotifications, type Notification, type NotificationIconKey } from "@/hooks/useNotifications";
import type { UserRole } from "@/lib/auth";

const ICON_MAP: Record<NotificationIconKey, React.ReactNode> = {
  bell:       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  ticket:     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>,
  event:      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  group:      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  friend:     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  payout:     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  alert:      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  check:      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  star:       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
  user:       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  collegiate: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>,
  org:        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
};

const ICON_BG: Record<NotificationIconKey, string> = {
  bell:       "bg-ink/8 text-ink/60",
  ticket:     "bg-marigold/12 text-marigold",
  event:      "bg-peacock/12 text-peacock",
  group:      "bg-aubergine/12 text-aubergine",
  friend:     "bg-durga/12 text-durga",
  payout:     "bg-emerald-500/12 text-emerald-600",
  alert:      "bg-red-500/12 text-red-500",
  check:      "bg-green-500/12 text-green-600",
  star:       "bg-marigold/12 text-marigold",
  user:       "bg-peacock/12 text-peacock",
  collegiate: "bg-aubergine/12 text-aubergine",
  org:        "bg-ink/8 text-ink/60",
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotifRow({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const icon = ICON_MAP[n.icon_key] ?? ICON_MAP.bell;
  const bg = ICON_BG[n.icon_key] ?? ICON_BG.bell;

  const inner = (
    <div
      className={`flex items-start gap-3 px-4 py-3 hover:bg-ivory transition-colors cursor-pointer ${!n.read ? "bg-marigold/3" : ""}`}
      onClick={() => { if (!n.read) onRead(n.id); }}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-ui text-sm leading-snug ${n.read ? "text-ink/70" : "font-semibold text-ink"}`}>
          {n.title}
        </p>
        {n.body && (
          <p className="font-ui text-xs text-ink-muted mt-0.5 leading-snug line-clamp-2">{n.body}</p>
        )}
        <p className="font-mono text-[9px] text-ink/30 uppercase tracking-wider mt-1">{timeAgo(n.created_at)}</p>
      </div>
      {!n.read && <span className="w-2 h-2 bg-marigold rounded-full shrink-0 mt-1.5" />}
    </div>
  );

  if (n.href) {
    return <Link href={n.href}>{inner}</Link>;
  }
  return inner;
}

type Props = {
  role: UserRole;
};

export function NotificationDropdown({ role }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"user" | "admin">("user");
  const ref = useRef<HTMLDivElement>(null);

  const userNotifs = useNotifications({ audience: "user" });
  const adminNotifs = useNotifications({ audience: "admin" });

  const isAdmin = role === "admin";
  const active = tab === "admin" && isAdmin ? adminNotifs : userNotifs;
  const totalUnread = userNotifs.unreadCount + (isAdmin ? adminNotifs.unreadCount : 0);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-xl border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink hover:border-aubergine/30 transition-all"
        aria-label="Notifications"
      >
        <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-durga text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-ivory-200 shadow-xl overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-ivory-200 flex items-center justify-between">
            <p className="font-display font-bold text-ink text-sm">Notifications</p>
            {active.unreadCount > 0 && (
              <button
                onClick={active.markAllRead}
                className="font-mono text-[9px] uppercase tracking-widest text-peacock hover:text-aubergine transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Admin tabs */}
          {isAdmin && (
            <div className="flex border-b border-ivory-200">
              {(["user", "admin"] as const).map((t) => {
                const count = t === "user" ? userNotifs.unreadCount : adminNotifs.unreadCount;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2.5 font-mono text-[9px] uppercase tracking-widest transition-colors relative ${
                      tab === t ? "text-aubergine" : "text-ink/30 hover:text-ink/60"
                    }`}
                  >
                    {t === "user" ? "Member" : "Admin"}
                    {count > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 bg-durga text-white text-[8px] font-bold rounded-full">
                        {count}
                      </span>
                    )}
                    {tab === t && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-aubergine" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-ivory-200">
            {active.loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-ivory-200 border-t-marigold animate-spin" />
              </div>
            ) : active.notifications.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-10 h-10 rounded-2xl bg-ivory-200 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-ink/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="font-ui text-xs text-ink/40">You're all caught up</p>
              </div>
            ) : (
              active.notifications.map((n) => (
                <NotifRow key={n.id} n={n} onRead={active.markRead} />
              ))
            )}
          </div>

          {/* Footer */}
          {isAdmin && tab === "admin" && (
            <div className="border-t border-ivory-200 px-4 py-2.5">
              <Link
                href="/admin/notifications"
                onClick={() => setOpen(false)}
                className="font-mono text-[9px] uppercase tracking-widest text-aubergine hover:text-ink transition-colors"
              >
                View all admin alerts →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
