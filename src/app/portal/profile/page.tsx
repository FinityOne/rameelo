"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const AVATAR_COLORS = ["#7C1F2C","#0E8C7A","#2E1B30","#D4891B","#5a1e7a","#892240","#1a4a5e"];

function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

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
};

export default function ProfilePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
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

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone, city, state, avatar_url, created_at")
        .eq("id", user.id)
        .single();
      if (data) {
        setProfile(data as Profile);
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setEmail(data.email ?? user.email ?? "");
        setPhoneDigits((data.phone ?? "").replace(/\D/g, "").slice(0, 10));
        setCity(data.city ?? "");
        setStateVal(data.state ?? "NJ");
        setAvatarUrl(data.avatar_url ?? null);
        const idx = (data.first_name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
        setAvatarColor(AVATAR_COLORS[idx]);
      }
    });
  }, []);

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
    if (uploadError) {
      setError("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage
      .from("profile-images")
      .getPublicUrl(path);
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
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: phoneDigits,
        city,
        state: stateVal,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-white font-bold text-2xl"
              style={{ backgroundColor: avatarColor }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                : initials
              }
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-marigold border-2 border-aubergine flex items-center justify-center hover:bg-marigold-dark transition-all disabled:opacity-60"
            >
              {uploading
                ? <div className="w-3 h-3 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />
                : <svg className="w-3.5 h-3.5 text-aubergine" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              }
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-white text-xl">{firstName} {lastName}</p>
            <p className="font-ui text-white/50 text-sm truncate">{email}</p>
            <p className="font-mono text-[10px] text-white/30 mt-1">
              Member since {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Avatar color picker */}
        <div className="border-t border-white/8 px-6 py-3 flex items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">Avatar color</p>
          <div className="flex gap-2">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setAvatarColor(color)}
                className={`w-6 h-6 rounded-full transition-all ${avatarColor === color ? "ring-2 ring-white ring-offset-1 ring-offset-aubergine scale-110" : "hover:scale-110"}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Edit form */}
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
          <div className="flex items-center gap-0">
            <div className="flex items-center gap-1.5 px-3 py-3 rounded-l-xl border border-r-0 border-ivory-200 bg-ivory shrink-0">
              <span className="text-base leading-none">🇺🇸</span>
              <span className="font-ui text-sm text-ink-muted font-medium">+1</span>
            </div>
            <input
              type="tel"
              autoComplete="tel-national"
              value={formatPhone(phoneDigits)}
              onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="(555) 867-5309"
              maxLength={14}
              className="flex-1 rounded-r-xl rounded-l-none border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all"
            />
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

        <button
          type="submit"
          disabled={saving || (phoneDigits.length > 0 && phoneDigits.length < 10)}
          className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            saved ? "bg-peacock text-white"
            : saving ? "bg-marigold/60 text-aubergine cursor-not-allowed"
            : "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98]"
          }`}
        >
          {saved ? (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Saved!</>
          ) : saving ? (
            <><div className="w-4 h-4 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />Saving…</>
          ) : (
            "Save Changes"
          )}
        </button>
      </form>

      {/* Notification prefs */}
      <div className="rounded-2xl bg-white border border-ivory-200 p-6 space-y-4">
        <h2 className="font-display font-bold text-ink text-lg">Notifications</h2>
        {[
          { label: "Event reminders", sub: "48 hours before your event", defaultOn: true },
          { label: "Group order updates", sub: "When someone joins your group", defaultOn: true },
          { label: "New events near me", sub: "Weekly digest of events in your city", defaultOn: false },
          { label: "Promotional offers", sub: "Discounts and special deals", defaultOn: false },
        ].map((pref) => (
          <div key={pref.label} className="flex items-center justify-between py-2 border-b border-ivory-200 last:border-0">
            <div>
              <p className="font-ui font-semibold text-ink text-sm">{pref.label}</p>
              <p className="font-ui text-xs text-ink-muted">{pref.sub}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={pref.defaultOn} className="sr-only peer" />
              <div className="w-10 h-5 rounded-full peer-checked:bg-peacock bg-ivory-200 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 border border-ivory-200 peer-checked:border-peacock" />
            </label>
          </div>
        ))}
      </div>

      {/* Account */}
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
