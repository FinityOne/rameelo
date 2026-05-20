"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const ORG_TYPES = [
  { value: "nonprofit",   label: "Non-profit" },
  { value: "forprofit",   label: "For-profit" },
  { value: "community",   label: "Community group" },
  { value: "educational", label: "Educational" },
  { value: "government",  label: "Government" },
];

const MEMBER_ROLES = [
  { value: "owner",  label: "Owner", desc: "Full control, primary contact" },
  { value: "admin",  label: "Admin", desc: "Can edit org profile" },
  { value: "member", label: "Member", desc: "Can view org profile" },
];

type OrgData = {
  id: string; name: string; slug: string | null; description: string | null;
  logo_url: string | null; email: string | null; phone: string | null;
  website: string | null; city: string | null; state: string | null;
  org_type: string | null; status: string; founded_year: number | null;
  instagram: string | null; facebook: string | null;
  created_at: string; updated_at: string;
};

type Member = {
  id: string; org_id: string; user_id: string; role: string; joined_at: string;
  profile: { first_name: string; last_name: string; email: string; city: string | null; state: string | null };
};

type UserResult = { id: string; first_name: string; last_name: string; email: string; role: string };

const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-4 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all";
const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-1.5";
const ROLE_BADGE: Record<string, string> = { owner: "bg-aubergine/10 text-aubergine", admin: "bg-peacock/10 text-peacock", member: "bg-ivory-200 text-ink-muted" };

function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

export default function AdminOrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [org, setOrg] = useState<OrgData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [form, setForm] = useState<Partial<OrgData>>({});

  // Member search
  const [memberSearch, setMemberSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingRole, setAddingRole] = useState("member");
  const [addingUser, setAddingUser] = useState<UserResult | null>(null);
  const [addError, setAddError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetchAll(); }, [id]);

  async function fetchAll() {
    const supabase = createClient();
    const [{ data: orgData }, { data: membersData }] = await Promise.all([
      supabase.from("organizations").select("*").eq("id", id).single(),
      supabase.from("organization_members")
        .select("id, org_id, user_id, role, joined_at, profiles (first_name, last_name, email, city, state)")
        .eq("org_id", id)
        .order("joined_at"),
    ]);

    if (!orgData) { router.push("/admin/organizations"); return; }
    const o = orgData as OrgData;
    setOrg(o);
    setForm(o);
    setMembers((membersData ?? []).map((m: unknown) => {
      const raw = m as { id: string; org_id: string; user_id: string; role: string; joined_at: string; profiles: { first_name: string; last_name: string; email: string; city: string | null; state: string | null } };
      return { id: raw.id, org_id: raw.org_id, user_id: raw.user_id, role: raw.role, joined_at: raw.joined_at, profile: raw.profiles };
    }));
    setLoading(false);
  }

  function setField(key: string, value: string | number | null) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    const supabase = createClient();
    const { error } = await supabase.from("organizations").update({
      name: form.name, slug: form.slug, description: form.description || null,
      email: form.email || null, phone: form.phone || null, website: form.website || null,
      city: form.city || null, state: form.state || null, org_type: form.org_type || null,
      status: form.status, founded_year: form.founded_year || null,
      instagram: form.instagram || null, facebook: form.facebook || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    setSaving(false);
    if (error) { setSaveMsg("Error: " + error.message); return; }
    setSaveMsg("Saved!");
    setTimeout(() => setSaveMsg(""), 3000);
    fetchAll();
  }

  // Debounced user search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchResults([]);
    if (memberSearch.length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, role")
        .or(`first_name.ilike.%${memberSearch}%,last_name.ilike.%${memberSearch}%,email.ilike.%${memberSearch}%`)
        .limit(8);
      const alreadyIn = new Set(members.map(m => m.user_id));
      setSearchResults(((data ?? []) as UserResult[]).filter(u => !alreadyIn.has(u.id)));
      setSearching(false);
    }, 400);
  }, [memberSearch, members]);

  async function handleAddMember() {
    if (!addingUser) return;
    setAddError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("organization_members").upsert({
      org_id: id, user_id: addingUser.id, role: addingRole, invited_by: user?.id ?? null,
    }, { onConflict: "org_id,user_id" });
    if (error) { setAddError(error.message); return; }
    // Promote to organizer if they're a plain user so they can access the organizer portal
    if (addingUser.role === "user") {
      await supabase.from("profiles").update({ role: "organizer" }).eq("id", addingUser.id);
    }
    setMemberSearch(""); setSearchResults([]); setAddingUser(null);
    await fetchAll();
  }

  async function handleRemoveMember(memberId: string) {
    setRemovingId(memberId);
    const supabase = createClient();
    await supabase.from("organization_members").delete().eq("id", memberId);
    setRemovingId(null);
    setMembers(prev => prev.filter(m => m.id !== memberId));
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    const supabase = createClient();
    await supabase.from("organization_members").update({ role: newRole }).eq("id", memberId);
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
  }

  if (loading) {
    return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" /></div>;
  }
  if (!org) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/organizations" className="font-ui text-ink-muted hover:text-aubergine transition-colors">Organizations</Link>
        <svg className="w-4 h-4 text-ink-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="font-ui font-semibold text-ink">{org.name}</span>
      </div>

      {/* Title + status */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>{org.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {org.slug && <p className="font-mono text-[11px] text-ink-muted/60">rameelo.com/org/{org.slug}</p>}
            <span className={`font-mono text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full font-bold ${org.status === "active" ? "bg-peacock/12 text-peacock" : org.status === "suspended" ? "bg-durga/12 text-durga" : "bg-ivory-200 text-ink-muted"}`}>
              {org.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2 text-xs text-ink-muted font-ui">
          <span>Created {fmtDate(org.created_at)}</span>
          {org.updated_at !== org.created_at && <span>· Updated {fmtDate(org.updated_at)}</span>}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── Left: Edit form ── */}
        <div className="lg:col-span-3 space-y-5">
          <form onSubmit={handleSave} className="space-y-5">
            {/* Identity */}
            <div className="bg-white rounded-2xl border border-ivory-200 p-5 space-y-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Identity</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Organization name *</label>
                  <input required value={form.name ?? ""} onChange={e => setField("name", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Slug</label>
                  <input value={form.slug ?? ""} onChange={e => setField("slug", e.target.value)} placeholder="url-handle" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Type</label>
                  <select value={form.org_type ?? ""} onChange={e => setField("org_type", e.target.value)} className={inputCls}>
                    <option value="">No type</option>
                    {ORG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Founded year</label>
                  <input type="number" min="1900" max={new Date().getFullYear()} value={form.founded_year ?? ""} onChange={e => setField("founded_year", e.target.value ? parseInt(e.target.value) : null)} placeholder="2010" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={form.status ?? "active"} onChange={e => setField("status", e.target.value)} className={inputCls}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Description</label>
                  <textarea rows={3} value={form.description ?? ""} onChange={e => setField("description", e.target.value)} placeholder="Brief description…" className={`${inputCls} resize-none`} />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-2xl border border-ivory-200 p-5 space-y-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Contact &amp; Location</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={form.email ?? ""} onChange={e => setField("email", e.target.value)} placeholder="info@org.com" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" value={form.phone ?? ""} onChange={e => setField("phone", e.target.value)} placeholder="(555) 000-0000" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Website</label>
                  <input type="url" value={form.website ?? ""} onChange={e => setField("website", e.target.value)} placeholder="https://…" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input value={form.city ?? ""} onChange={e => setField("city", e.target.value)} placeholder="Edison" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <select value={form.state ?? ""} onChange={e => setField("state", e.target.value)} className={inputCls}>
                    <option value="">Select state…</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Social */}
            <div className="bg-white rounded-2xl border border-ivory-200 p-5 space-y-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Social</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Instagram</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-muted">@</span>
                    <input value={form.instagram ?? ""} onChange={e => setField("instagram", e.target.value.replace("@",""))} placeholder="handle" className={`${inputCls} pl-8`} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Facebook</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-muted">@</span>
                    <input value={form.facebook ?? ""} onChange={e => setField("facebook", e.target.value.replace("@",""))} placeholder="handle" className={`${inputCls} pl-8`} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-aubergine text-white font-display font-bold text-sm px-6 py-3 rounded-2xl hover:bg-aubergine-light transition-all disabled:opacity-50">
                {saving ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</> : "Save changes"}
              </button>
              {saveMsg && <p className={`font-ui text-sm ${saveMsg.startsWith("Error") ? "text-durga" : "text-peacock"}`}>{saveMsg}</p>}
            </div>
          </form>
        </div>

        {/* ── Right: Members ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-ivory-200">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Members</p>
              <p className="font-display font-bold text-ink text-lg mt-0.5" style={{ letterSpacing: "-0.015em" }}>
                {members.length} organizer{members.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Add member */}
            <div className="px-5 py-4 border-b border-ivory-200 space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Add organizer</p>
              <div className="relative">
                <input
                  type="text"
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Search name or email…"
                  className={inputCls}
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-ivory-200 border-t-aubergine animate-spin" />
                )}
              </div>

              {/* Search results dropdown */}
              {searchResults.length > 0 && !addingUser && (
                <div className="rounded-xl border border-ivory-200 bg-white shadow-sm overflow-hidden">
                  {searchResults.map(u => (
                    <button key={u.id} onClick={() => { setAddingUser(u); setMemberSearch(""); setSearchResults([]); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-ivory transition-colors text-left border-b border-ivory-200 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-aubergine/10 flex items-center justify-center text-aubergine font-bold text-xs shrink-0">
                        {u.first_name.charAt(0)}{u.last_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-ui text-sm font-semibold text-ink truncate">{u.first_name} {u.last_name}</p>
                        <p className="font-mono text-[10px] text-ink-muted truncate">{u.email}</p>
                      </div>
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-peacock/10 text-peacock shrink-0">{u.role}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Confirm add */}
              {addingUser && (
                <div className="rounded-xl border border-aubergine/20 bg-aubergine/5 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-aubergine flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {addingUser.first_name.charAt(0)}{addingUser.last_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui text-sm font-semibold text-ink">{addingUser.first_name} {addingUser.last_name}</p>
                      <p className="font-mono text-[10px] text-ink-muted truncate">{addingUser.email}</p>
                    </div>
                    <button onClick={() => setAddingUser(null)} className="text-ink-muted hover:text-ink transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div>
                    <label className={labelCls}>Role</label>
                    <div className="space-y-1.5">
                      {MEMBER_ROLES.map(r => (
                        <label key={r.value} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-all ${addingRole === r.value ? "border-aubergine/30 bg-aubergine/8" : "border-ivory-200 hover:border-aubergine/20"}`}>
                          <input type="radio" name="add_role" value={r.value} checked={addingRole === r.value} onChange={() => setAddingRole(r.value)} className="accent-aubergine" />
                          <div>
                            <p className="font-ui text-xs font-semibold text-ink">{r.label}</p>
                            <p className="font-mono text-[9px] text-ink-muted">{r.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  {addError && <p className="font-ui text-xs text-durga">{addError}</p>}
                  <button onClick={handleAddMember} className="w-full py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-all">
                    Add to organization
                  </button>
                </div>
              )}

              {memberSearch.length >= 2 && searchResults.length === 0 && !searching && !addingUser && (
                <p className="font-ui text-xs text-ink-muted">No users found matching that name or email.</p>
              )}
            </div>

            {/* Member list */}
            {members.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="font-ui text-sm text-ink-muted">No members yet. Add an organizer above.</p>
              </div>
            ) : (
              <div className="divide-y divide-ivory-200">
                {members.map(m => (
                  <div key={m.id} className="px-5 py-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-aubergine/10 flex items-center justify-center text-aubergine font-bold text-xs shrink-0">
                      {m.profile.first_name.charAt(0)}{m.profile.last_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui text-sm font-semibold text-ink truncate">{m.profile.first_name} {m.profile.last_name}</p>
                      <p className="font-mono text-[10px] text-ink-muted truncate">{m.profile.email}</p>
                      {(m.profile.city || m.profile.state) && (
                        <p className="font-mono text-[9px] text-ink-muted/60">{[m.profile.city, m.profile.state].filter(Boolean).join(", ")}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <select
                        value={m.role}
                        onChange={e => handleRoleChange(m.id, e.target.value)}
                        className={`font-mono text-[9px] uppercase tracking-wide px-2 py-1 rounded-full border-0 outline-none cursor-pointer font-bold ${ROLE_BADGE[m.role] ?? "bg-ivory-200 text-ink-muted"}`}
                      >
                        {MEMBER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      <button
                        disabled={removingId === m.id}
                        onClick={() => handleRemoveMember(m.id)}
                        className="font-mono text-[9px] text-ink-muted/50 hover:text-durga transition-colors"
                      >
                        {removingId === m.id ? "…" : "Remove"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
