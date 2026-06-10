"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
import type { Notification } from "@/hooks/useNotifications";

// ─── Constants ────────────────────────────────────────────────────────────────
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const AVATAR_COLORS = ["#7C1F2C","#0E8C7A","#2E1B30","#D4891B","#5a1e7a","#892240","#1a4a5e"];

type Tab = "profile" | "payments" | "notifications";

type PaymentMethod = {
  id: string;
  type: string;          // 'card' | 'us_bank_account'
  brand: string | null;  // card brand or bank name
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  created_at: string;
};

type NotifPrefKey =
  | "event_reminders"
  | "group_order_updates"
  | "friend_requests"
  | "friend_accepted"
  | "platform_announcements"
  | "new_events_nearby";

const PREF_CONFIG: { key: NotifPrefKey; label: string; sub: string; defaultOn: boolean }[] = [
  { key: "event_reminders",        label: "Event reminders",        sub: "48 hours before an event you have tickets to",      defaultOn: true  },
  { key: "group_order_updates",    label: "Group order updates",    sub: "When someone joins or leaves your group order",     defaultOn: true  },
  { key: "friend_requests",        label: "Friend requests",        sub: "When someone wants to connect with you",            defaultOn: true  },
  { key: "friend_accepted",        label: "Friend accepted",        sub: "When someone accepts your connection request",      defaultOn: true  },
  { key: "platform_announcements", label: "Platform announcements", sub: "Important updates from the Rameelo team",          defaultOn: true  },
  { key: "new_events_nearby",      label: "New events near me",     sub: "Weekly digest of events in your city",             defaultOn: false },
];

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  avatar_url: string | null;
  created_at: string;
  notification_preferences: Partial<Record<NotifPrefKey, boolean>>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const NOTIF_ICON: Record<string, React.ReactNode> = {
  ticket:     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>,
  event:      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  friend:     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  group:      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  bell:       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  check:      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  star:       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
};

const NOTIF_BG: Record<string, string> = {
  ticket: "bg-marigold/12 text-marigold",
  event:  "bg-peacock/12 text-peacock",
  friend: "bg-durga/12 text-durga",
  group:  "bg-aubergine/12 text-aubergine",
  bell:   "bg-ink/8 text-ink/50",
  check:  "bg-green-500/12 text-green-600",
  star:   "bg-marigold/12 text-marigold",
};

// ─── Toggle component ─────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${on ? "bg-peacock" : "bg-ivory-200"}`}
    >
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? "left-5" : "left-1"}`} />
    </button>
  );
}

// ─── Notification row ─────────────────────────────────────────────────────────
import Link from "next/link";

function NotifRow({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const icon = NOTIF_ICON[n.icon_key] ?? NOTIF_ICON.bell;
  const bg   = NOTIF_BG[n.icon_key]  ?? NOTIF_BG.bell;

  const inner = (
    <div
      onClick={() => { if (!n.read) onRead(n.id); }}
      className={`flex items-start gap-3 px-5 py-4 hover:bg-ivory transition-colors cursor-pointer ${!n.read ? "bg-marigold/3" : ""}`}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`font-ui text-sm leading-snug ${n.read ? "text-ink/70" : "font-semibold text-ink"}`}>{n.title}</p>
        {n.body && <p className="font-ui text-xs text-ink-muted mt-0.5 leading-snug">{n.body}</p>}
        <p className="font-mono text-[9px] text-ink/30 uppercase tracking-wider mt-1">{timeAgo(n.created_at)}</p>
      </div>
      {!n.read && <span className="w-2 h-2 bg-marigold rounded-full shrink-0 mt-1.5" />}
    </div>
  );

  if (n.href) return <Link href={n.href}>{inner}</Link>;
  return inner;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [city, setCity]           = useState("");
  const [stateVal, setStateVal]   = useState("NJ");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [tab, setTab]             = useState<Tab>("profile");

  // Notification preferences state
  const [prefs, setPrefs] = useState<Partial<Record<NotifPrefKey, boolean>>>({});
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSaved, setPrefSaved]   = useState(false);

  // Saved payment methods (read-only — kept on the account for record purposes)
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);

  const loadMethods = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("payment_methods")
      .select("id, type, brand, last4, exp_month, exp_year, created_at")
      .order("created_at", { ascending: false });
    setMethods((data ?? []) as PaymentMethod[]);
    setMethodsLoading(false);
  }, []);

  useEffect(() => { loadMethods(); }, [loadMethods]);

  const { notifications, loading: notifsLoading, unreadCount, markRead, markAllRead } =
    useNotifications({ audience: "user", limit: 50 });

  const loadProfile = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone, city, state, avatar_url, created_at, notification_preferences")
      .eq("id", user.id)
      .single();
    if (!data) return;
    const p = data as Profile;
    setProfile(p);
    setFirstName(p.first_name ?? "");
    setLastName(p.last_name ?? "");
    setEmail(p.email ?? user.email ?? "");
    setPhoneDigits((p.phone ?? "").replace(/\D/g, "").slice(0, 10));
    setCity(p.city ?? "");
    setStateVal(p.state ?? "NJ");
    setAvatarUrl(p.avatar_url ?? null);
    const idx = (p.first_name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
    setAvatarColor(AVATAR_COLORS[idx]);
    setPrefs(p.notification_preferences ?? {});
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    setError("");
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${profile.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("profile-images")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) { setError("Upload failed: " + uploadError.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("profile-images").getPublicUrl(path);
    const urlWithBust = `${publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: urlWithBust }).eq("id", profile.id);
    setAvatarUrl(urlWithBust);
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { error: saveError } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName, phone: phoneDigits, city, state: stateVal })
      .eq("id", profile.id);
    setSaving(false);
    if (saveError) { setError(saveError.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function savePref(key: NotifPrefKey, value: boolean) {
    if (!profile) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setPrefSaving(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ notification_preferences: next })
      .eq("id", profile.id);
    setPrefSaving(false);
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2000);
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }

  const initials = ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase() || "?";
  const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all";
  const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5 block";

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Profile card */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#2E1B30" }}>
        <div className="px-6 py-6 flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-white font-bold text-2xl" style={{ backgroundColor: avatarColor }}>
              {avatarUrl ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : initials}
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-marigold border-2 border-aubergine flex items-center justify-center hover:bg-marigold-dark transition-all disabled:opacity-60">
              {uploading
                ? <div className="w-3 h-3 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />
                : <svg className="w-3.5 h-3.5 text-aubergine" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              }
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-white text-xl">{firstName} {lastName}</p>
            <p className="font-ui text-white/50 text-sm truncate">{email}</p>
            <p className="font-mono text-[10px] text-white/30 mt-1">
              Member since {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={() => setTab("notifications")}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-marigold/15 border border-marigold/25 hover:bg-marigold/25 transition-colors">
              <span className="w-1.5 h-1.5 bg-marigold rounded-full animate-pulse" />
              <span className="font-mono text-[9px] font-bold text-marigold uppercase tracking-widest">{unreadCount} new</span>
            </button>
          )}
        </div>
        <div className="border-t border-white/8 px-6 py-3 flex items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">Avatar color</p>
          <div className="flex gap-2">
            {AVATAR_COLORS.map((color) => (
              <button key={color} type="button" onClick={() => setAvatarColor(color)}
                className={`w-6 h-6 rounded-full transition-all ${avatarColor === color ? "ring-2 ring-white ring-offset-1 ring-offset-aubergine scale-110" : "hover:scale-110"}`}
                style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-ivory-200 p-1 gap-1">
        {([["profile", "Profile"], ["payments", "Payments"], ["notifications", "Notifications"]] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl font-ui font-semibold text-sm transition-all relative ${tab === t ? "bg-white text-ink shadow-sm" : "text-ink/50 hover:text-ink"}`}>
            {label}
            {t === "notifications" && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-durga text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {tab === "profile" && (
        <form onSubmit={handleSave} className="rounded-2xl bg-white border border-ivory-200 p-6 space-y-5">
          <h2 className="font-display font-bold text-ink text-lg">Personal Information</h2>
          {error && (
            <div className="rounded-xl bg-durga/10 border border-durga/20 px-4 py-3">
              <p className="font-ui text-sm text-durga">{error}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>First name</label>
              <input type="text" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Last name</label>
              <input type="text" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} required />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email address</label>
            <input type="email" value={email} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
            <p className="font-mono text-[9px] text-ink-muted mt-1">Email cannot be changed here.</p>
          </div>
          <div>
            <label className={labelCls}>Phone number</label>
            <div className="flex items-center">
              <div className="flex items-center gap-1.5 px-3 py-3 rounded-l-xl border border-r-0 border-ivory-200 bg-ivory shrink-0">
                <span className="text-base leading-none">🇺🇸</span>
                <span className="font-ui text-sm text-ink-muted font-medium">+1</span>
              </div>
              <input type="tel" autoComplete="tel-national"
                value={formatPhone(phoneDigits)}
                onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="(555) 867-5309" maxLength={14}
                className="flex-1 rounded-r-xl rounded-l-none border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all" />
            </div>
            {phoneDigits.length > 0 && phoneDigits.length < 10 && (
              <p className="font-mono text-[9px] text-marigold mt-1">{10 - phoneDigits.length} more digits needed</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>City</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Edison" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <select value={stateVal} onChange={(e) => setStateVal(e.target.value)} className={`${inputCls} cursor-pointer`}>
                {US_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving || (phoneDigits.length > 0 && phoneDigits.length < 10)}
            className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              saved ? "bg-peacock text-white"
              : saving ? "bg-marigold/60 text-aubergine cursor-not-allowed"
              : "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98]"
            }`}>
            {saved ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Saved!</>
            : saving ? <><div className="w-4 h-4 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />Saving…</>
            : "Save Changes"}
          </button>
        </form>
      )}

      {/* ── Payments tab ── */}
      {tab === "payments" && (
        <div className="rounded-2xl bg-white border border-ivory-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-ivory-200">
            <h2 className="font-display font-bold text-ink text-lg">Payment methods</h2>
            <p className="font-ui text-xs text-ink-muted mt-0.5">Cards and bank accounts saved from your purchases. We only ever store the last 4 digits.</p>
          </div>

          {methodsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-ivory-200 border-t-marigold animate-spin" />
            </div>
          ) : methods.length === 0 ? (
            <div className="py-12 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-ivory-200 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-ink/25" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h.01M11 15h2M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <p className="font-display font-bold text-ink text-sm">No saved payment methods</p>
              <p className="font-ui text-xs text-ink-muted mt-1">Your card or bank will appear here automatically after your next purchase.</p>
            </div>
          ) : (
            <div className="divide-y divide-ivory-200">
              {methods.map(m => {
                const isCard = m.type === "card";
                const label = (m.brand || (isCard ? "Card" : "Bank account")).replace(/\b\w/g, c => c.toUpperCase());
                return (
                  <div key={m.id} className="flex items-center gap-4 px-6 py-4">
                    <div className={`w-11 h-8 rounded-md flex items-center justify-center shrink-0 ${isCard ? "bg-aubergine/8 text-aubergine" : "bg-peacock/10 text-peacock"}`}>
                      {isCard ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11M8 14v3m4-3v3m4-3v3" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui text-sm font-semibold text-ink">
                        {label} <span className="font-mono text-ink-muted">•••• {m.last4 || "0000"}</span>
                      </p>
                      <p className="font-mono text-[10px] text-ink-muted uppercase tracking-widest mt-0.5">
                        {isCard
                          ? `Card${m.exp_month && m.exp_year ? ` · Exp ${String(m.exp_month).padStart(2, "0")}/${String(m.exp_year).slice(-2)}` : ""}`
                          : "Bank account · ACH"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-6 py-3 bg-ivory/50 border-t border-ivory-200 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <p className="font-ui text-[11px] text-ink-muted">Securely stored by Stripe. Rameelo never sees or keeps your full card or bank numbers.</p>
          </div>
        </div>
      )}

      {/* ── Notifications tab ── */}
      {tab === "notifications" && (
        <div className="space-y-5">

          {/* Activity */}
          <div className="rounded-2xl bg-white border border-ivory-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ivory-200">
              <div>
                <h2 className="font-display font-bold text-ink text-base">Activity</h2>
                <p className="font-mono text-[9px] text-ink/40 uppercase tracking-widest mt-0.5">Your recent notifications</p>
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="font-mono text-[9px] uppercase tracking-widest text-peacock hover:text-aubergine transition-colors">
                  Mark all read
                </button>
              )}
            </div>

            {notifsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 rounded-full border-2 border-ivory-200 border-t-marigold animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-ivory-200 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-ink/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="font-display font-bold text-ink text-sm">No notifications yet</p>
                <p className="font-ui text-xs text-ink-muted mt-1">We&apos;ll let you know when something happens.</p>
              </div>
            ) : (
              <div className="divide-y divide-ivory-200 max-h-80 overflow-y-auto">
                {notifications.map(n => (
                  <NotifRow key={n.id} n={n} onRead={markRead} />
                ))}
              </div>
            )}
          </div>

          {/* Preferences */}
          <div className="rounded-2xl bg-white border border-ivory-200 p-6 space-y-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-bold text-ink text-base">Preferences</h2>
                <p className="font-mono text-[9px] text-ink/40 uppercase tracking-widest mt-0.5">Choose what you hear about</p>
              </div>
              {prefSaving && <span className="font-mono text-[9px] text-ink/30 uppercase tracking-widest">Saving…</span>}
              {prefSaved && !prefSaving && (
                <span className="font-mono text-[9px] text-peacock uppercase tracking-widest flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Saved
                </span>
              )}
            </div>
            {PREF_CONFIG.map((pref, i) => {
              const isOn = prefs[pref.key] ?? pref.defaultOn;
              return (
                <div key={pref.key} className={`flex items-center justify-between py-3.5 ${i < PREF_CONFIG.length - 1 ? "border-b border-ivory-200" : ""}`}>
                  <div className="flex-1 pr-4">
                    <p className="font-ui font-semibold text-ink text-sm">{pref.label}</p>
                    <p className="font-ui text-xs text-ink-muted mt-0.5">{pref.sub}</p>
                  </div>
                  <Toggle on={isOn} onChange={(v) => savePref(pref.key, v)} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Account — always visible */}
      <div className="rounded-2xl bg-white border border-ivory-200 p-6">
        <h2 className="font-display font-bold text-ink text-lg mb-4">Account</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="flex-1 py-3 rounded-xl border border-ivory-200 text-ink-muted font-ui font-semibold text-sm hover:border-aubergine/30 hover:text-ink transition-all">
            Change Password
          </button>
          <button className="flex-1 py-3 rounded-xl border border-durga/20 text-durga font-ui font-semibold text-sm hover:bg-durga/5 transition-all">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
