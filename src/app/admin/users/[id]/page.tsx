"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────
type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
  xp: number;
  level: number;
  created_at: string;
  last_active_date: string | null;
  total_logins: number;
  last_login_at: string | null;
  total_time_secs: number;
  notification_preferences: Record<string, boolean>;
};

type Order = {
  id: string;
  event_id: string;
  qty: number;
  unit_price: number;
  grand_total: number;
  status: string;
  payment_method: string;
  created_at: string;
  event_title?: string;
  event_date?: string;
  event_city?: string;
};

type Session = {
  id: string;
  logged_in_at: string;
  logged_out_at: string | null;
  duration_secs: number | null;
  device_type: string | null;
  ip_address: string | null;
};

type GroupMembership = {
  group_id: string;
  role: string;
  joined_at: string;
  group_name?: string;
  group_emoji?: string;
  group_type?: string;
  group_category?: string;
};

type Friendship = {
  id: string;
  other_name: string;
  status: string;
  created_at: string;
};

type EmailLog = {
  id: string;
  to_email: string;
  type: string;
  subject: string | null;
  status: "sent" | "failed";
  trigger: "automatic" | "manual";
  created_at: string;
  sender: { first_name: string | null; last_name: string | null } | null;
};

type NavSection = "overview" | "tickets" | "activity" | "groups";

const EMAIL_TYPE_LABEL: Record<string, string> = {
  welcome: "Welcome email",
  org_invite: "Organization invite",
  password_reset: "Password reset",
  group_created: "Group link created",
  group_joined: "Group member joined",
  group_ticket_claim: "Group ticket claim",
  order_confirmation: "Order confirmation",
  sponsorship_inquiry: "Sponsorship inquiry",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ROLE_STYLES: Record<UserRole, { pill: string; dot: string; label: string }> = {
  user:      { pill: "bg-marigold/15 text-aubergine",  dot: "bg-marigold",  label: "Khelaiya"  },
  organizer: { pill: "bg-peacock/15 text-peacock",     dot: "bg-peacock",   label: "Aayojak"   },
  admin:     { pill: "bg-durga/15 text-durga",         dot: "bg-durga",     label: "Mukhiya"   },
};

const AVATAR_COLORS = ["#7C1F2C","#0E8C7A","#2E1B30","#D4891B","#5a1e7a","#892240","#1a4a5e"];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function fmtDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}
function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ value, label, sub, color = "text-ink" }: { value: string; label: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-ivory-200 p-5 shadow-sm">
      <p className={`font-display font-black text-3xl ${color}`} style={{ letterSpacing: "-0.035em" }}>{value}</p>
      <p className="font-ui font-semibold text-ink text-sm mt-1">{label}</p>
      {sub && <p className="font-mono text-[9px] text-ink/35 uppercase tracking-widest mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile]       = useState<Profile | null>(null);
  const [orders, setOrders]         = useState<Order[]>([]);
  const [sessions, setSessions]     = useState<Session[]>([]);
  const [groups, setGroups]         = useState<GroupMembership[]>([]);
  const [friends, setFriends]       = useState<Friendship[]>([]);
  const [loading, setLoading]       = useState(true);
  const [section, setSection]       = useState<NavSection>("overview");
  const [roleUpdating, setRoleUpdating] = useState(false);
  const [roleSaved, setRoleSaved]   = useState(false);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody]   = useState("");
  const [notifSent, setNotifSent]   = useState(false);
  const [sendingWelcome, setSendingWelcome] = useState(false);
  const [welcomeStatus, setWelcomeStatus]   = useState<"" | "sent" | "error">("");
  const [sendingReset, setSendingReset]     = useState(false);
  const [resetStatus, setResetStatus]       = useState<"" | "sent" | "error">("");
  const [emailLogs, setEmailLogs]   = useState<EmailLog[]>([]);
  const [newEmail, setNewEmail]     = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"" | "saved" | "error">("");
  const [emailError, setEmailError]   = useState("");

  const loadEmailLogs = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("email_logs")
      .select("id, to_email, type, subject, status, trigger, created_at, sender:profiles!email_logs_sent_by_fkey(first_name, last_name)")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    setEmailLogs((data as unknown as EmailLog[]) ?? []);
  }, [id]);

  const load = useCallback(async () => {
    const supabase = createClient();

    const [
      { data: profileData },
      { data: ordersData },
      { data: sessionsData },
      { data: groupMemberships },
      { data: friendsData },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone, city, state, role, avatar_url, bio, xp, level, created_at, last_active_date, total_logins, last_login_at, total_time_secs, notification_preferences")
        .eq("id", id)
        .single(),

      supabase
        .from("orders")
        .select("id, event_id, qty, unit_price, grand_total, status, payment_method, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false }),

      supabase
        .from("user_sessions")
        .select("id, logged_in_at, logged_out_at, duration_secs, device_type, ip_address")
        .eq("user_id", id)
        .order("logged_in_at", { ascending: false })
        .limit(50),

      supabase
        .from("chat_group_members")
        .select("group_id, role, joined_at, chat_groups(name, emoji, group_type, category)")
        .eq("user_id", id),

      supabase
        .from("friendships")
        .select("id, status, created_at, requester_id, addressee_id")
        .or(`requester_id.eq.${id},addressee_id.eq.${id}`)
        .limit(20),
    ]);

    if (!profileData) { router.replace("/admin/users"); return; }
    setProfile(profileData as Profile);

    // Enrich orders with event titles
    if (ordersData && ordersData.length > 0) {
      const eventIds = [...new Set(ordersData.map(o => o.event_id))];
      const { data: events } = await supabase
        .from("events")
        .select("id, title, start_date, city")
        .in("id", eventIds);
      const eventMap: Record<string, { title: string; start_date: string; city: string }> = {};
      (events ?? []).forEach(e => { eventMap[e.id] = e; });
      setOrders(ordersData.map(o => ({
        ...o,
        event_title: eventMap[o.event_id]?.title ?? "Unknown event",
        event_date:  eventMap[o.event_id]?.start_date,
        event_city:  eventMap[o.event_id]?.city,
      })));
    }

    setSessions((sessionsData ?? []) as Session[]);

    setGroups((groupMemberships ?? []).map((m: Record<string, unknown>) => ({
      group_id:       m.group_id as string,
      role:           m.role as string,
      joined_at:      m.joined_at as string,
      group_name:     (m.chat_groups as Record<string, string> | null)?.name,
      group_emoji:    (m.chat_groups as Record<string, string> | null)?.emoji,
      group_type:     (m.chat_groups as Record<string, string> | null)?.group_type,
      group_category: (m.chat_groups as Record<string, string> | null)?.category,
    })));

    setFriends((friendsData ?? []).map(f => ({
      id: f.id,
      other_name: f.requester_id === id ? "Their contact" : "Sent request",
      status: f.status,
      created_at: f.created_at,
    })));

    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); loadEmailLogs(); }, [load, loadEmailLogs]);

  async function updateRole(role: UserRole) {
    if (!profile) return;
    setRoleUpdating(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ role }).eq("id", id);
    setProfile(p => p ? { ...p, role } : p);
    setRoleUpdating(false);
    setRoleSaved(true);
    setTimeout(() => setRoleSaved(false), 2500);
  }

  async function sendWelcomeEmail() {
    if (!profile) return;
    setSendingWelcome(true);
    setWelcomeStatus("");
    try {
      const res = await fetch("/api/send-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      });
      setWelcomeStatus(res.ok ? "sent" : "error");
      if (res.ok) loadEmailLogs();
    } catch {
      setWelcomeStatus("error");
    }
    setSendingWelcome(false);
    setTimeout(() => setWelcomeStatus(""), 4000);
  }

  async function sendPasswordReset() {
    if (!profile) return;
    setSendingReset(true);
    setResetStatus("");
    try {
      const res = await fetch("/api/admin/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      });
      setResetStatus(res.ok ? "sent" : "error");
      if (res.ok) loadEmailLogs();
    } catch {
      setResetStatus("error");
    }
    setSendingReset(false);
    setTimeout(() => setResetStatus(""), 4000);
  }

  async function changeEmail() {
    if (!profile) return;
    const email = newEmail.trim().toLowerCase();
    setEmailError("");
    setEmailStatus("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError("Enter a valid email address."); return; }
    if (email === (profile.email ?? "").toLowerCase()) { setEmailError("That's already this account's email."); return; }
    setSavingEmail(true);
    try {
      const res = await fetch("/api/admin/change-user-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id, newEmail: email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailError(json.error || "Couldn't change the email — try again.");
        setEmailStatus("error");
      } else {
        setProfile(p => p ? { ...p, email } : p);
        setNewEmail("");
        setEmailStatus("saved");
        setTimeout(() => setEmailStatus(""), 4000);
      }
    } catch {
      setEmailError("Couldn't change the email — try again.");
      setEmailStatus("error");
    }
    setSavingEmail(false);
  }

  async function sendNotification() {
    if (!notifTitle.trim() || !profile) return;
    setSendingNotif(true);
    const supabase = createClient();
    await supabase.from("notifications").insert({
      user_id: profile.id,
      audience: "user",
      type: "manual",
      title: notifTitle.trim(),
      body: notifBody.trim(),
      icon_key: "bell",
    });
    setSendingNotif(false);
    setNotifSent(true);
    setNotifTitle("");
    setNotifBody("");
    setTimeout(() => setNotifSent(false), 2500);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }
  if (!profile) return null;

  const roleMeta = ROLE_STYLES[profile.role];
  const avatarColor = AVATAR_COLORS[(profile.first_name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
  const initials = ((profile.first_name?.[0] ?? "") + (profile.last_name?.[0] ?? "")).toUpperCase() || "?";
  const totalSpend = orders.filter(o => o.status === "confirmed").reduce((s, o) => s + Number(o.grand_total), 0);
  const confirmedOrders = orders.filter(o => o.status === "confirmed");

  const NAV_SECTIONS: { key: NavSection; label: string }[] = [
    { key: "overview",  label: "Overview" },
    { key: "tickets",   label: `Tickets (${confirmedOrders.length})` },
    { key: "activity",  label: `Login Activity (${sessions.length})` },
    { key: "groups",    label: `Groups (${groups.length})` },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Back */}
      <Link href="/admin/users"
        className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ink/40 hover:text-ink transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        All users
      </Link>

      {/* Identity card */}
      <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: "#2E1B30" }}>
        <div className="relative px-6 py-7">
          <div className="absolute inset-0 pointer-events-none opacity-10"
            style={{ background: "radial-gradient(ellipse at 80% 40%, #F5A623 0%, transparent 55%)" }} />
          <div className="relative flex items-start gap-5 flex-wrap">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-white font-bold text-2xl shrink-0"
              style={{ backgroundColor: avatarColor }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : initials}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="font-display font-black text-white text-2xl" style={{ letterSpacing: "-0.025em" }}>
                  {profile.first_name} {profile.last_name}
                </h1>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${roleMeta.pill}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${roleMeta.dot}`} />
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest">{roleMeta.label}</span>
                </div>
              </div>
              <p className="font-ui text-white/50 text-sm">{profile.email}</p>
              {profile.city && (
                <p className="font-mono text-[9px] text-white/30 uppercase tracking-widest mt-1">
                  {profile.city}, {profile.state}
                </p>
              )}
              <p className="font-mono text-[9px] text-white/25 mt-0.5">
                Joined {fmtDate(profile.created_at)}
                {profile.last_login_at && ` · Last login ${timeAgo(profile.last_login_at)}`}
              </p>
            </div>
            {/* Role selector */}
            <div className="shrink-0">
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/30 mb-1.5">Role</p>
              <div className="flex gap-2">
                {(["user", "organizer", "admin"] as UserRole[]).map(r => (
                  <button key={r} onClick={() => updateRole(r)} disabled={roleUpdating || profile.role === r}
                    className={`px-3 py-1.5 rounded-xl font-mono text-[9px] uppercase tracking-widest font-bold transition-all ${profile.role === r ? `${ROLE_STYLES[r].pill}` : "bg-white/8 text-white/40 hover:bg-white/15 hover:text-white/70"}`}>
                    {ROLE_STYLES[r].label}
                  </button>
                ))}
              </div>
              {roleSaved && <p className="font-mono text-[9px] text-peacock mt-1.5">✓ Role updated</p>}
            </div>
          </div>
        </div>

        {/* Quick stats strip */}
        <div className="border-t border-white/8 grid grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Total spend",   value: `$${totalSpend.toFixed(0)}` },
            { label: "Tickets",       value: confirmedOrders.reduce((s, o) => s + o.qty, 0).toString() },
            { label: "Logins",        value: profile.total_logins.toString() },
            { label: "Time on platform", value: fmtDuration(profile.total_time_secs) },
          ].map((s, i) => (
            <div key={s.label} className={`px-5 py-4 ${i < 3 ? "border-r border-white/8" : ""}`}>
              <p className="font-display font-black text-white text-xl" style={{ letterSpacing: "-0.03em" }}>{s.value}</p>
              <p className="font-mono text-[9px] text-white/30 uppercase tracking-widest mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CRM body: content (left) + actions & email log (right) ── */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start space-y-6 lg:space-y-0">
        <div className="lg:col-span-2 space-y-6">

      {/* Sub-nav */}
      <div className="flex gap-1 bg-ivory-200 rounded-2xl p-1">
        {NAV_SECTIONS.map(n => (
          <button key={n.key} onClick={() => setSection(n.key)}
            className={`flex-1 py-2.5 rounded-xl font-ui font-semibold text-xs sm:text-sm transition-all ${section === n.key ? "bg-white text-ink shadow-sm" : "text-ink/50 hover:text-ink"}`}>
            {n.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {section === "overview" && (
        <div className="space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard value={`$${totalSpend.toFixed(0)}`} label="Total spend" sub="confirmed orders" color="text-aubergine" />
            <StatCard value={confirmedOrders.length.toString()} label="Orders" sub="confirmed" />
            <StatCard value={groups.length.toString()} label="Groups" sub="joined" />
            <StatCard value={friends.length.toString()} label="Connections" />
          </div>

          {/* Profile details */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-5 shadow-sm">
            <h3 className="font-display font-bold text-ink text-base mb-4">Member Details</h3>
            <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {[
                ["Full name",    `${profile.first_name} ${profile.last_name}`],
                ["Email",        profile.email],
                ["Phone",        profile.phone || "—"],
                ["Location",     profile.city ? `${profile.city}, ${profile.state}` : "—"],
                ["Level",        `Level ${profile.level} · ${profile.xp} XP`],
                ["Member since", fmtDate(profile.created_at)],
                ["Last login",   profile.last_login_at ? fmtTime(profile.last_login_at) : "—"],
                ["Last active",  profile.last_active_date ? fmtDate(profile.last_active_date) : "—"],
              ].map(([label, val]) => (
                <div key={label}>
                  <dt className="font-mono text-[9px] uppercase tracking-widest text-ink/35">{label}</dt>
                  <dd className="font-ui text-sm text-ink mt-0.5">{val}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Engagement */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-5 shadow-sm">
            <h3 className="font-display font-bold text-ink text-base mb-4">Platform Engagement</h3>
            <div className="space-y-3">
              {[
                { label: "Total logins",       value: profile.total_logins,        max: 100,  format: (v: number) => v.toString(),          unit: "sessions" },
                { label: "Total time",         value: profile.total_time_secs,     max: 36000, format: (v: number) => fmtDuration(v),       unit: "" },
                { label: "Total spend",        value: totalSpend,                  max: 500,  format: (v: number) => `$${v.toFixed(2)}`,    unit: "" },
                { label: "Tickets purchased",  value: confirmedOrders.reduce((s, o) => s + o.qty, 0), max: 20, format: (v: number) => v.toString(), unit: "tickets" },
                { label: "Groups joined",      value: groups.length,               max: 20,   format: (v: number) => v.toString(),          unit: "groups" },
              ].map(row => {
                const pct = Math.min(100, Math.round((row.value / row.max) * 100));
                return (
                  <div key={row.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-ui text-sm text-ink">{row.label}</span>
                      <span className="font-mono text-xs text-ink/60">{row.format(row.value)}{row.unit ? ` ${row.unit}` : ""}</span>
                    </div>
                    <div className="h-1.5 bg-ivory-200 rounded-full overflow-hidden">
                      <div className="h-full bg-aubergine rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Tickets ── */}
      {section === "tickets" && (
        <div className="bg-white rounded-2xl border border-ivory-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-ivory-200 flex items-center justify-between">
            <h3 className="font-display font-bold text-ink text-base">Ticket History</h3>
            <span className="font-mono text-[10px] text-ink/40 uppercase tracking-widest">
              ${totalSpend.toFixed(2)} total
            </span>
          </div>
          {orders.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl mb-2">🎟️</p>
              <p className="font-ui text-sm text-ink/40">No tickets yet</p>
            </div>
          ) : (
            <div className="divide-y divide-ivory-200">
              {orders.map(o => (
                <div key={o.id} className="flex items-center gap-4 px-5 py-4 hover:bg-ivory/50 transition-colors">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${o.status === "confirmed" ? "bg-peacock" : "bg-ink/20"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-ui font-semibold text-ink text-sm leading-snug">{o.event_title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {o.event_date && <span className="font-mono text-[9px] text-ink/40">{fmtDate(o.event_date)}</span>}
                      {o.event_city && <span className="font-mono text-[9px] text-ink/30">· {o.event_city}</span>}
                      <span className="font-mono text-[9px] text-ink/30">· {fmtDate(o.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: "-0.02em" }}>
                      ${Number(o.grand_total).toFixed(2)}
                    </p>
                    <p className="font-mono text-[9px] text-ink/30 uppercase tracking-wider">{o.qty} ticket{o.qty !== 1 ? "s" : ""} · {o.payment_method}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[8px] font-bold uppercase tracking-wide ${o.status === "confirmed" ? "bg-peacock/10 text-peacock" : "bg-ink/8 text-ink/40"}`}>
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Activity ── */}
      {section === "activity" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard value={profile.total_logins.toString()}     label="Total logins" />
            <StatCard value={fmtDuration(profile.total_time_secs)} label="Total time" />
            <StatCard value={profile.last_login_at ? timeAgo(profile.last_login_at) : "Never"} label="Last login" />
          </div>

          {/* Session log */}
          <div className="bg-white rounded-2xl border border-ivory-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-ivory-200">
              <h3 className="font-display font-bold text-ink text-base">Login History</h3>
              <p className="font-mono text-[9px] text-ink/35 uppercase tracking-widest mt-0.5">Last {sessions.length} sessions</p>
            </div>
            {sessions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-ui text-sm text-ink/40">No sessions recorded yet</p>
                <p className="font-mono text-[9px] text-ink/25 mt-1">Sessions are logged when the member signs in</p>
              </div>
            ) : (
              <div className="divide-y divide-ivory-200">
                {sessions.map(s => (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-ivory/50 transition-colors">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${!s.logged_out_at ? "bg-green-500 animate-pulse" : "bg-ink/20"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-ui text-sm text-ink">{fmtTime(s.logged_in_at)}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {s.device_type && <span className="font-mono text-[9px] text-ink/40 capitalize">{s.device_type}</span>}
                        {s.ip_address  && <span className="font-mono text-[9px] text-ink/30">· {s.ip_address}</span>}
                        {!s.logged_out_at && <span className="font-mono text-[9px] text-green-600">· Active now</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {s.duration_secs != null
                        ? <p className="font-mono text-xs text-ink/50">{fmtDuration(s.duration_secs)}</p>
                        : !s.logged_out_at
                          ? <p className="font-mono text-xs text-green-600">in progress</p>
                          : <p className="font-mono text-xs text-ink/25">—</p>
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Groups ── */}
      {section === "groups" && (
        <div className="bg-white rounded-2xl border border-ivory-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-ivory-200">
            <h3 className="font-display font-bold text-ink text-base">Group Memberships</h3>
          </div>
          {groups.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl mb-2">💬</p>
              <p className="font-ui text-sm text-ink/40">Not in any groups yet</p>
            </div>
          ) : (
            <div className="divide-y divide-ivory-200">
              {groups.map(g => (
                <div key={g.group_id} className="flex items-center gap-4 px-5 py-4 hover:bg-ivory/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-aubergine/10 flex items-center justify-center text-xl shrink-0">
                    {g.group_emoji ?? "💬"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-ui font-semibold text-ink text-sm">{g.group_name ?? "Unknown group"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {g.group_category && <span className="font-mono text-[9px] text-ink/40">{g.group_category}</span>}
                      <span className="font-mono text-[9px] text-ink/30">· Joined {fmtDate(g.joined_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[8px] font-bold uppercase tracking-wide ${g.group_type === "interest" ? "bg-peacock/10 text-peacock" : "bg-aubergine/10 text-aubergine"}`}>
                      {g.group_type === "interest" ? "Community" : "Private"}
                    </span>
                    {g.role !== "member" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[8px] font-bold uppercase tracking-wide bg-marigold/15 text-aubergine">
                        {g.role}
                      </span>
                    )}
                    <Link href={`/portal/group-chat/${g.group_id}`}
                      className="text-ink/30 hover:text-aubergine transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

        </div>{/* ── end main column ── */}

        {/* ── Actions + Email Log sidebar ── */}
        <aside className="space-y-6">

          {/* Actions */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-5 shadow-sm">
            <h3 className="font-display font-bold text-ink text-base">Actions</h3>
            <p className="font-ui text-xs text-ink-muted mt-0.5 mb-4">Manual actions for this member.</p>

            {/* Welcome email */}
            <div className="rounded-xl border border-ivory-200 p-4 mb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-7 h-7 rounded-lg bg-marigold/15 text-marigold-dark flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </span>
                <p className="font-ui text-sm font-semibold text-ink">Welcome email</p>
              </div>
              <p className="font-ui text-xs text-ink-muted leading-relaxed mb-3">
                Branded intro inviting them to log in, explore Garba 2026 events, buy tickets, and start their Garba Passport.
              </p>
              <button onClick={sendWelcomeEmail} disabled={sendingWelcome || !profile.email}
                className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-ui font-semibold text-sm transition-all ${!sendingWelcome && profile.email ? "bg-marigold text-aubergine hover:opacity-90" : "bg-ivory text-ink-muted cursor-not-allowed"}`}>
                {sendingWelcome
                  ? <><div className="w-4 h-4 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />Sending…</>
                  : "Send welcome email"}
              </button>
              {welcomeStatus === "sent" && (
                <p className="font-mono text-[9px] text-peacock uppercase tracking-widest mt-2 flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Sent to {profile.email}
                </p>
              )}
              {welcomeStatus === "error" && <p className="font-mono text-[9px] text-durga uppercase tracking-widest mt-2">Failed to send — try again</p>}
              {!profile.email && <p className="font-mono text-[9px] text-durga uppercase tracking-widest mt-2">No email on file</p>}
            </div>

            {/* Password reset */}
            <div className="rounded-xl border border-ivory-200 p-4 mb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-7 h-7 rounded-lg bg-durga/10 text-durga flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </span>
                <p className="font-ui text-sm font-semibold text-ink">Reset password</p>
              </div>
              <p className="font-ui text-xs text-ink-muted leading-relaxed mb-3">
                Emails {profile.first_name || "this member"} a secure link (valid 24 hours) to set a new password.
              </p>
              <button onClick={sendPasswordReset} disabled={sendingReset || !profile.email}
                className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-ui font-semibold text-sm transition-all ${!sendingReset && profile.email ? "bg-aubergine text-white hover:opacity-90" : "bg-ivory text-ink-muted cursor-not-allowed"}`}>
                {sendingReset
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Sending…</>
                  : "Send reset link"}
              </button>
              {resetStatus === "sent" && (
                <p className="font-mono text-[9px] text-peacock uppercase tracking-widest mt-2 flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Reset link sent to {profile.email}
                </p>
              )}
              {resetStatus === "error" && <p className="font-mono text-[9px] text-durga uppercase tracking-widest mt-2">Failed to send — try again</p>}
            </div>

            {/* Change email address */}
            <div className="rounded-xl border border-ivory-200 p-4 mb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-7 h-7 rounded-lg bg-aubergine/10 text-aubergine flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </span>
                <p className="font-ui text-sm font-semibold text-ink">Change email address</p>
              </div>
              <p className="font-ui text-xs text-ink-muted leading-relaxed mb-1">
                Current: <span className="text-ink font-medium break-all">{profile.email || "—"}</span>
              </p>
              <p className="font-ui text-xs text-ink-muted leading-relaxed mb-3">
                Updates their login and re-labels all their tickets. Emails must be unique across all accounts.
              </p>
              <input
                type="email"
                placeholder="new-email@example.com"
                value={newEmail}
                onChange={e => { setNewEmail(e.target.value); setEmailError(""); setEmailStatus(""); }}
                className="w-full rounded-lg border border-ivory-200 px-3 py-2 font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all mb-2.5"
              />
              <button onClick={changeEmail} disabled={savingEmail || !newEmail.trim()}
                className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-ui font-semibold text-sm transition-all ${!savingEmail && newEmail.trim() ? "bg-aubergine text-white hover:opacity-90" : "bg-ivory text-ink-muted cursor-not-allowed"}`}>
                {savingEmail
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</>
                  : "Change email"}
              </button>
              {emailStatus === "saved" && (
                <p className="font-mono text-[9px] text-peacock uppercase tracking-widest mt-2 flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Email updated
                </p>
              )}
              {emailError && (
                <p className="font-ui text-[11px] text-durga font-medium mt-2">{emailError}</p>
              )}
            </div>

            {/* In-app notification */}
            <div className="rounded-xl border border-ivory-200 p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-7 h-7 rounded-lg bg-aubergine/10 text-aubergine flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </span>
                <p className="font-ui text-sm font-semibold text-ink">In-app notification</p>
              </div>
              <div className="space-y-2.5">
                <input type="text" placeholder="Notification title" value={notifTitle} onChange={e => setNotifTitle(e.target.value)}
                  className="w-full rounded-lg border border-ivory-200 px-3 py-2 font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all" />
                <textarea rows={2} placeholder="Optional message…" value={notifBody} onChange={e => setNotifBody(e.target.value)}
                  className="w-full rounded-lg border border-ivory-200 px-3 py-2 font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all resize-none" />
                {notifSent && (
                  <p className="font-mono text-[9px] text-peacock uppercase tracking-widest flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    Notification sent
                  </p>
                )}
                <button onClick={sendNotification} disabled={!notifTitle.trim() || sendingNotif}
                  className={`w-full py-2.5 rounded-xl font-ui font-semibold text-sm transition-all ${notifTitle.trim() && !sendingNotif ? "bg-aubergine text-white hover:opacity-90" : "bg-ivory text-ink-muted cursor-not-allowed"}`}>
                  {sendingNotif ? "Sending…" : "Send notification"}
                </button>
              </div>
            </div>

            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted/40 mt-3 text-center">More actions coming soon</p>
          </div>

          {/* Email Log */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-ivory-200 flex items-center justify-between">
              <h3 className="font-display font-bold text-ink text-base">Email Log</h3>
              <span className="font-mono text-[10px] text-ink/40 uppercase tracking-widest">{emailLogs.length} sent</span>
            </div>
            {emailLogs.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-2xl mb-2">📭</p>
                <p className="font-ui text-sm text-ink/40">No emails sent yet</p>
                <p className="font-mono text-[9px] text-ink/25 mt-1">Welcome &amp; future emails will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-ivory-200 max-h-[460px] overflow-y-auto">
                {emailLogs.map(log => (
                  <div key={log.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="font-ui font-semibold text-ink text-sm leading-tight">{EMAIL_TYPE_LABEL[log.type] ?? log.type}</p>
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[8px] font-bold uppercase tracking-wide ${log.status === "sent" ? "bg-peacock/10 text-peacock" : "bg-durga/12 text-durga"}`}>
                        {log.status}
                      </span>
                    </div>
                    {log.subject && <p className="font-ui text-xs text-ink-muted truncate">{log.subject}</p>}
                    <div className="flex items-center gap-x-2 gap-y-1 mt-1.5 flex-wrap">
                      <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${log.trigger === "automatic" ? "bg-peacock/10 text-peacock" : "bg-marigold/15 text-marigold-dark"}`}>
                        {log.trigger}
                      </span>
                      <span className="font-mono text-[9px] text-ink/40">{fmtTime(log.created_at)}</span>
                      {log.trigger === "manual" && log.sender && (
                        <span className="font-mono text-[9px] text-ink/30">· by {[log.sender.first_name, log.sender.last_name].filter(Boolean).join(" ")}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </aside>
      </div>{/* ── end CRM grid ── */}
    </div>
  );
}
