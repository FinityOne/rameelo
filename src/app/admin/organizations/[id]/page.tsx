"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatDateRange, emptyOffer } from "@/lib/onboarding";
import type { OnboardingResponses, OnboardingEvent, OnboardingContact, OnboardingDocument, OnboardingOffer, OnboardingConfig } from "@/lib/onboarding";

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
      const raw = m as { id: string; org_id: string; user_id: string; role: string; joined_at: string; profiles: { first_name: string; last_name: string; email: string; city: string | null; state: string | null } | null };
      return {
        id: raw.id, org_id: raw.org_id, user_id: raw.user_id, role: raw.role, joined_at: raw.joined_at,
        profile: raw.profiles ?? { first_name: "Unknown", last_name: "", email: raw.user_id, city: null, state: null },
      };
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

      {/* ── Onboarding questionnaire ── */}
      <OnboardingPanel orgId={id} />
    </div>
  );
}

// ── Onboarding questionnaire: link generation + submission viewer ─────────────
type OnboardingRow = {
  id: string; token: string; status: string;
  responses: Partial<OnboardingResponses>; documents: OnboardingDocument[];
  offer: Partial<OnboardingOffer>; config: Partial<OnboardingConfig>;
  agreement_name: string | null; agreed_at: string | null; submitted_at: string | null;
  agreement_version: string | null; agreement_text: string | null; agreement_user_agent: string | null;
  draft_saved_at: string | null; created_at: string;
};

function OnboardingPanel({ orgId }: { orgId: string }) {
  const [row, setRow] = useState<OnboardingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  // Use the live host so the link is localhost:3000 locally and the real domain
  // (Vercel/production) wherever it's deployed — never a hardcoded URL.
  const [origin, setOrigin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));

  useEffect(() => { if (!origin) setOrigin(window.location.origin); }, [origin]);

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("org_onboarding")
      .select("id, token, status, responses, documents, offer, config, agreement_name, agreed_at, submitted_at, agreement_version, agreement_text, agreement_user_agent, draft_saved_at, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setRow((data as OnboardingRow | null) ?? null);
    setLoading(false);
  }

  async function generate() {
    setGenerating(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_onboarding_link", { p_org_id: orgId });
    setGenerating(false);
    if (error) { alert("Could not create link: " + error.message); return; }
    setRow(data as OnboardingRow);
  }

  const link = row ? `${origin}/onboarding/${row.token}` : "";

  function copy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return null;

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-ivory-200 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Onboarding</p>
          <p className="font-display font-bold text-ink text-lg mt-0.5" style={{ letterSpacing: "-0.015em" }}>Event Onboarding Questionnaire</p>
          <p className="font-ui text-sm text-ink-muted mt-0.5">Send this organizer a no-login link to collect their event, ticketing &amp; marketing details.</p>
        </div>
        {row && (
          <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shrink-0 ${row.status === "submitted" ? "bg-peacock/12 text-peacock" : row.draft_saved_at ? "bg-aubergine/10 text-aubergine" : "bg-marigold/15 text-marigold-dark"}`}>
            {row.status === "submitted" ? "Submitted" : row.draft_saved_at ? "Draft in progress" : "Awaiting response"}
          </span>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Link row / generate */}
        {!row ? (
          <button onClick={generate} disabled={generating}
            className="inline-flex items-center gap-2 bg-aubergine text-white font-display font-bold text-sm px-5 py-3 rounded-2xl hover:bg-aubergine-light transition-all disabled:opacity-50">
            {generating
              ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating…</>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5m6.656-6.656l1.5-1.5a4 4 0 115.656 5.656l-3 3a4 4 0 01-5.656 0" /></svg>Generate onboarding link</>}
          </button>
        ) : (
          <div className="flex items-stretch gap-2">
            <div className="flex-1 min-w-0 rounded-xl border border-ivory-200 bg-ivory/40 px-3 py-2.5 font-mono text-xs text-ink-muted truncate flex items-center">{link}</div>
            <button onClick={copy} className={`px-4 rounded-xl font-mono text-[10px] uppercase tracking-widest font-bold transition-all ${copied ? "bg-peacock/12 text-peacock" : "bg-aubergine text-white hover:bg-aubergine-light"}`}>
              {copied ? "✓ Copied" : "Copy link"}
            </button>
            <a href={link} target="_blank" rel="noopener noreferrer" className="px-4 rounded-xl border border-ivory-200 text-ink-muted hover:text-aubergine hover:border-aubergine/30 transition-all flex items-center" title="Open in new tab">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </div>
        )}

        {/* Form-flow configuration (powers step 1 pricing) */}
        <OnboardingConfigEditor orgId={orgId} initial={row?.config ?? {}} onSaved={(updated) => setRow(updated)} />

        {/* Offer designer (powers step 1 of the questionnaire) */}
        <OnboardingOfferEditor orgId={orgId} initial={row?.offer ?? {}} onSaved={(updated) => setRow(updated)} />

        {/* Submission / draft preview */}
        {row && (row.status === "submitted" || row.draft_saved_at) && (
          <OnboardingSubmission row={row} draft={row.status !== "submitted"} />
        )}
      </div>
    </div>
  );
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// ── Admin form-flow configuration (ACH free-ticket threshold, etc.) ───────────
function OnboardingConfigEditor({ orgId, initial, onSaved }: {
  orgId: string; initial: Partial<OnboardingConfig>; onSaved: (row: OnboardingRow) => void;
}) {
  const [ach, setAch] = useState(initial.achFreeTickets != null ? String(initial.achFreeTickets) : "");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  async function save() {
    setSaving(true);
    setSavedMsg("");
    const supabase = createClient();
    const parsed = ach.trim() === "" ? null : Math.max(0, parseInt(ach, 10) || 0);
    const { data, error } = await supabase.rpc("upsert_onboarding_config", {
      p_org_id: orgId,
      p_config: { achFreeTickets: parsed },
    });
    setSaving(false);
    if (error) { setSavedMsg("error:" + error.message); return; }
    setSavedMsg("ok:Saved — this updates the pricing shown on step 1.");
    setTimeout(() => setSavedMsg(""), 4000);
    onSaved(data as OnboardingRow);
  }

  return (
    <div className="rounded-xl border border-ivory-200 bg-ivory/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-aubergine shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        <div>
          <p className="font-ui text-sm font-semibold text-ink">Form-flow configuration</p>
          <p className="font-mono text-[10px] text-ink-muted/70">Settings that personalize what this organizer sees</p>
        </div>
      </div>

      <div>
        <label className={labelCls}>Free ACH tickets (before 1% organizer fee)</label>
        <div className="flex items-center gap-2">
          <input
            type="number" min="0" value={ach}
            onChange={e => setAch(e.target.value)}
            placeholder="e.g. 500"
            className={`${inputCls} max-w-[180px]`}
          />
          <button type="button" onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 bg-aubergine text-white font-display font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-aubergine-light transition-all disabled:opacity-50 shrink-0">
            {saving ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</> : "Save"}
          </button>
        </div>
        <p className="font-mono text-[10px] text-ink-muted/70 mt-1.5">
          ACH-paid tickets are fee-free up to this count; a 1% fee (paid by the organizer) applies to ACH sales beyond it. Leave blank to show the generic &ldquo;promotional threshold&rdquo; wording.
        </p>
        {savedMsg && <p className={`font-ui text-xs mt-1.5 ${savedMsg.startsWith("error:") ? "text-durga" : "text-peacock"}`}>{savedMsg.replace(/^(error|ok):/, "")}</p>}
      </div>
    </div>
  );
}

function OfferListEditor({ label, items, onItems, placeholder }: { label: string; items: string[]; onItems: (v: string[]) => void; placeholder: string }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={it} onChange={e => onItems(items.map((x, idx) => idx === i ? e.target.value : x))} className={inputCls} placeholder={placeholder} />
            <button type="button" onClick={() => onItems(items.filter((_, idx) => idx !== i))} className="text-ink-muted/40 hover:text-durga transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
        <button type="button" onClick={() => onItems([...items, ""])} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-aubergine hover:text-aubergine-light transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add {label.toLowerCase()}
        </button>
      </div>
    </div>
  );
}

// ── Admin offer designer — sets the headline/bonuses/requirements on step 1 ───
function OnboardingOfferEditor({ orgId, initial, onSaved }: {
  orgId: string; initial: Partial<OnboardingOffer>; onSaved: (row: OnboardingRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [offer, setOffer] = useState<OnboardingOffer>({ ...emptyOffer(), ...initial, bonuses: initial.bonuses ?? [], requirements: initial.requirements ?? [] });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const hasContent = !!(offer.headline || offer.details || offer.bonuses.length || offer.requirements.length);

  async function save() {
    setSaving(true);
    setSavedMsg("");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("upsert_onboarding_offer", {
      p_org_id: orgId,
      p_offer: { ...offer, bonuses: offer.bonuses.filter(Boolean), requirements: offer.requirements.filter(Boolean) },
    });
    setSaving(false);
    if (error) { setSavedMsg("error:" + error.message); return; }
    setSavedMsg("ok:Saved — this now appears on step 1 of the organizer's link.");
    setTimeout(() => setSavedMsg(""), 4000);
    onSaved(data as OnboardingRow);
  }

  return (
    <div className="rounded-xl border border-ivory-200 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 bg-ivory/40 hover:bg-ivory/70 transition-colors text-left">
        <svg className="w-4 h-4 text-aubergine shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
        <div className="flex-1 min-w-0">
          <p className="font-ui text-sm font-semibold text-ink">Design the welcome offer <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted/60 ml-1">Step 1</span></p>
          <p className="font-mono text-[10px] text-ink-muted truncate">{hasContent ? (offer.headline || "Custom offer set") : "Optional — personalize what this organizer sees first"}</p>
        </div>
        {hasContent && <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-peacock/12 text-peacock shrink-0">Set</span>}
        <svg className={`w-4 h-4 text-ink-muted shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {open && (
        <div className="p-4 space-y-4 border-t border-ivory-200">
          <p className="font-ui text-xs text-ink-muted">This appears on the first step of the organizer&apos;s onboarding link — alongside Rameelo&apos;s standard benefits, mission, and fee structure. Leave blank to show just the standard welcome.</p>
          <div>
            <label className={labelCls}>Offer headline</label>
            <input value={offer.headline} onChange={e => setOffer(o => ({ ...o, headline: e.target.value }))} className={inputCls} placeholder="e.g. 0% platform fee on your first event" />
          </div>
          <div>
            <label className={labelCls}>Offer details</label>
            <textarea rows={3} value={offer.details} onChange={e => setOffer(o => ({ ...o, details: e.target.value }))} className={`${inputCls} resize-none`} placeholder="Describe the offer in a sentence or two…" />
          </div>
          <OfferListEditor label="Special bonuses" items={offer.bonuses} onItems={v => setOffer(o => ({ ...o, bonuses: v }))} placeholder="e.g. Free featured placement for 2 weeks" />
          <OfferListEditor label="What we require" items={offer.requirements} onItems={v => setOffer(o => ({ ...o, requirements: v }))} placeholder="e.g. Share Rameelo ticket links on your socials" />

          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={save} disabled={saving}
              className="inline-flex items-center gap-2 bg-aubergine text-white font-display font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-aubergine-light transition-all disabled:opacity-50">
              {saving ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</> : "Save offer"}
            </button>
            {savedMsg && <p className={`font-ui text-xs ${savedMsg.startsWith("error:") ? "text-durga" : "text-peacock"}`}>{savedMsg.replace(/^(error|ok):/, "")}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function OnboardingSubmission({ row, draft }: { row: OnboardingRow; draft: boolean }) {
  const r = row.responses ?? {};
  const events = (r.events ?? []) as OnboardingEvent[];
  const contacts = (r.contacts ?? []) as OnboardingContact[];
  const docs = row.documents ?? [];

  const DL = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{label}</dt>
      <dd className="font-ui text-sm text-ink mt-0.5 break-words">{value?.toString().trim() ? value : <span className="text-ink-muted/40">—</span>}</dd>
    </div>
  );
  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine">{title}</p>
      {children}
    </div>
  );

  return (
    <div className="space-y-6 pt-4 border-t border-ivory-200">
      {draft ? (
        <div className="flex items-start gap-2 rounded-xl bg-aubergine/8 border border-aubergine/20 px-3 py-2.5">
          <svg className="w-4 h-4 text-aubergine shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          <p className="font-ui text-xs text-ink-muted">Draft in progress — last saved {row.draft_saved_at ? fmtDateTime(row.draft_saved_at) : "—"}. The organizer can still edit until they submit; details below may change.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-peacock/25 bg-peacock/[0.06] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <p className="font-ui text-sm font-bold text-ink">Signed &amp; locked</p>
            <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-peacock/15 text-peacock ml-auto">Read-only</span>
          </div>

          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Signed by</dt>
              <dd className="font-ui text-sm font-semibold text-ink mt-0.5">{row.agreement_name || "—"}</dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Signed on</dt>
              <dd className="font-ui text-sm text-ink mt-0.5">{row.agreed_at ? fmtDateTime(row.agreed_at) : row.submitted_at ? fmtDateTime(row.submitted_at) : "—"}</dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Agreement version</dt>
              <dd className="font-ui text-sm text-ink mt-0.5">{row.agreement_version ? `v${row.agreement_version}` : "—"}</dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Signed from (device)</dt>
              <dd className="font-mono text-[10px] text-ink-muted mt-0.5 break-all line-clamp-2">{row.agreement_user_agent || "—"}</dd>
            </div>
          </dl>

          {/* Historical timeline */}
          <div className="pt-2.5 border-t border-peacock/15">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5">History</p>
            <ul className="space-y-1 font-mono text-[11px] text-ink-muted">
              <li>· Link created — {fmtDateTime(row.created_at)}</li>
              {row.draft_saved_at && <li>· Last draft saved — {fmtDateTime(row.draft_saved_at)}</li>}
              <li>· Submitted &amp; signed — {row.submitted_at ? fmtDateTime(row.submitted_at) : "—"}</li>
            </ul>
          </div>

          {/* Exact agreement signed (immutable snapshot) */}
          {row.agreement_text && (
            <details className="pt-2.5 border-t border-peacock/15">
              <summary className="cursor-pointer font-ui text-xs font-semibold text-aubergine hover:text-aubergine-light">View the exact agreement signed{row.agreement_version ? ` (v${row.agreement_version})` : ""}</summary>
              <div className="mt-2 rounded-lg border border-ivory-200 bg-white px-3 py-2 max-h-72 overflow-y-auto">
                <pre className="font-ui text-[11px] text-ink-muted leading-relaxed whitespace-pre-wrap">{row.agreement_text}</pre>
              </div>
            </details>
          )}
        </div>
      )}

      <Group title="Organizer">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          <DL label="Organization" value={r.organizationName} />
          <DL label="Year founded" value={r.foundedYear} />
          <DL label="Primary contact" value={r.primaryContactName} />
          <DL label="Email" value={r.email} />
          <DL label="Phone" value={r.phone} />
          <DL label="Website" value={r.website} />
          <DL label="Instagram" value={r.instagram ? `@${r.instagram}` : ""} />
          <DL label="Facebook" value={r.facebook} />
          <div className="sm:col-span-2"><DL label="Description" value={r.organizationDescription} /></div>
        </dl>
      </Group>

      <Group title={`Event${events.length !== 1 ? "s" : ""} (${events.length})`}>
        {events.length === 0 ? (
          <p className="font-ui text-sm text-ink-muted/50">None provided</p>
        ) : (
          <div className="space-y-4">
            {events.map((ev, ei) => {
              const tiers = (ev.tiers ?? []).filter(t => t.name || t.price || t.quantity);
              return (
                <div key={ei} className="rounded-xl border border-ivory-200 bg-ivory/40 p-4 space-y-3">
                  <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>
                    <span className="font-mono text-[10px] text-ink-muted/60 mr-1.5">#{ei + 1}</span>
                    {ev.eventName || `Event ${ei + 1}`}
                  </p>
                  <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                    <DL label="Date(s)" value={formatDateRange(ev.startDate, ev.endDate)} />
                    <DL label="Schedule" value={[ev.doorsOpen && `Doors ${ev.doorsOpen}`, ev.eventStart && `Start ${ev.eventStart}`, ev.eventEnd && `End ${ev.eventEnd}`].filter(Boolean).join(" · ")} />
                    <DL label="Venue capacity" value={ev.venueCapacity} />
                    <DL label="Expected attendance" value={ev.expectedAttendance} />
                    <DL label="Venue" value={ev.venueName} />
                    <DL label="Address" value={[ev.streetAddress, [ev.city, ev.state].filter(Boolean).join(", "), ev.zip].filter(Boolean).join(" · ")} />
                    <DL label="Featured artist(s)" value={ev.featuredArtists} />
                  </dl>

                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5">Tickets ({tiers.length})</p>
                    {tiers.length === 0 ? (
                      <p className="font-ui text-sm text-ink-muted/50">None provided</p>
                    ) : (
                      <div className="space-y-1.5">
                        {tiers.map((t, ti) => (
                          <div key={ti} className="rounded-lg border border-ivory-200 bg-white px-3 py-2 flex flex-wrap items-center gap-x-5 gap-y-1">
                            <span className="font-ui text-sm font-semibold text-ink">{t.name || "Untitled"}</span>
                            <span className="font-mono text-xs text-ink-muted">${t.price || "—"}</span>
                            <span className="font-mono text-xs text-ink-muted">Qty {t.quantity || "—"}</span>
                            {(t.saleStart || t.saleEnd) && <span className="font-mono text-[10px] text-ink-muted/60">{t.saleStart || "?"} → {t.saleEnd || "?"}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {ev.groupDiscounts && (
                    <p className="font-ui text-xs text-ink-muted">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted/70">Group discounts:</span>{" "}
                      {ev.groupDiscounts === "yes" ? `Yes${ev.groupDiscountsDetails ? ` — ${ev.groupDiscountsDetails}` : ""}` : "No"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Group>

      {contacts.filter(c => c.firstName || c.lastName || c.email).length > 0 && (
        <Group title={`Team members (${contacts.filter(c => c.firstName || c.lastName || c.email).length})`}>
          <div className="space-y-2">
            {contacts.filter(c => c.firstName || c.lastName || c.email).map((c, i) => (
              <div key={i} className="rounded-xl border border-ivory-200 bg-ivory/40 px-3 py-2.5">
                <p className="font-ui text-sm font-semibold text-ink">{[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"} {c.role && <span className="font-normal text-ink-muted">· {c.role}</span>}</p>
                <p className="font-mono text-[11px] text-ink-muted">{[c.email, c.phone].filter(Boolean).join(" · ") || "—"}</p>
              </div>
            ))}
          </div>
        </Group>
      )}

      <Group title="Marketing assets">
        <div className="flex flex-wrap gap-1.5">
          {(r.marketingAssets ?? []).length === 0 && docs.length === 0 ? (
            <p className="font-ui text-sm text-ink-muted/50">None indicated</p>
          ) : (r.marketingAssets ?? []).map(a => (
            <span key={a} className="font-mono text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-aubergine/8 text-aubergine">{a}</span>
          ))}
        </div>
        {docs.length > 0 && (
          <div className="space-y-2 mt-2">
            {docs.map((d, i) => (
              <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-ivory-200 bg-white px-3 py-2.5 hover:border-aubergine/30 transition-all">
                <svg className="w-4 h-4 text-aubergine shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <div className="flex-1 min-w-0">
                  <p className="font-ui text-sm text-ink truncate">{d.name}</p>
                  <p className="font-mono text-[10px] text-ink-muted/60">{(d.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-ivory-200 text-ink-muted shrink-0">{d.category}</span>
              </a>
            ))}
          </div>
        )}
      </Group>

      <Group title="Financial">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          <DL label="Payout recipient" value={r.payoutRecipientName} />
          <DL label="Payout email" value={r.payoutEmail} />
          <DL label="Preferred method" value={r.preferredPaymentMethod} />
          <DL label="Est. gross revenue" value={r.estimatedGrossRevenue} />
        </dl>
      </Group>

      {(r.additionalNotes?.trim() || r.submittedBy?.trim()) && (
        <Group title="Additional">
          <DL label="Notes" value={r.additionalNotes} />
          <DL label="Submitted by" value={r.submittedBy} />
        </Group>
      )}
    </div>
  );
}
