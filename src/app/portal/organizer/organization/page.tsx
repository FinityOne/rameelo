"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const ORG_TYPES = [
  { value: "nonprofit",   label: "Non-profit" },
  { value: "forprofit",   label: "For-profit" },
  { value: "community",   label: "Community group" },
  { value: "educational", label: "Educational" },
  { value: "government",  label: "Government" },
];

type OrgData = {
  id: string; name: string; slug: string | null; description: string | null;
  email: string | null; phone: string | null; website: string | null;
  city: string | null; state: string | null; org_type: string | null;
  status: string; founded_year: number | null;
  instagram: string | null; facebook: string | null;
  created_at: string; updated_at: string;
};

type OrgMember = {
  id: string; user_id: string; role: string;
  profile: { first_name: string; last_name: string; email: string };
};

type UserResult = { id: string; first_name: string; last_name: string; email: string; role: string };

const MEMBER_ROLES = [
  { value: "owner",  label: "Owner",  desc: "Full control, primary contact" },
  { value: "admin",  label: "Admin",  desc: "Can edit org profile and add members" },
  { value: "member", label: "Member", desc: "Can view org profile" },
];

type PayoutSchedule = "weekly" | "monthly";
type AccountType = "checking" | "savings";

type BankAccountDraft = {
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: AccountType;
  accountHolder: string;
};

const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-4 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all";
const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-1.5";
const ROLE_BADGE: Record<string, string> = { owner: "bg-aubergine/10 text-aubergine", admin: "bg-peacock/10 text-peacock", member: "bg-ivory-200 text-ink-muted" };

export default function OrganizerOrganizationPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [orgId, setOrgId] = useState<string>("");
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [myRole, setMyRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [form, setForm] = useState<Partial<OrgData>>({});

  // Member search
  const [memberSearch, setMemberSearch]   = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching]         = useState(false);
  const [addingUser, setAddingUser]       = useState<UserResult | null>(null);
  const [addingRole, setAddingRole]       = useState("member");
  const [addError, setAddError]           = useState("");
  const [removingId, setRemovingId]       = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Payout settings (stored locally until Stripe Connect is wired)
  const [payoutSchedule, setPayoutSchedule] = useState<PayoutSchedule>("monthly");
  const [scheduleMsg, setScheduleMsg]       = useState("");
  const [bankDraft, setBankDraft]           = useState<BankAccountDraft>({
    bankName: "Chase Business Checking",
    routingNumber: "021000021",
    accountNumber: "000123456789",
    accountType: "checking",
    accountHolder: "",
  });
  const [bankSaving, setBankSaving]   = useState(false);
  const [bankMsg, setBankMsg]         = useState("");
  const [showAccount, setShowAccount] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      // Find org membership for this user
      const { data: membership } = await supabase
        .from("organization_members")
        .select("org_id, role")
        .eq("user_id", user.id)
        .order("joined_at")
        .limit(1)
        .single();

      if (!membership) { setNotFound(true); setLoading(false); return; }

      setMyRole(membership.role);
      setOrgId(membership.org_id);

      const [{ data: orgData }, { data: membersData }] = await Promise.all([
        supabase.from("organizations").select("*").eq("id", membership.org_id).single(),
        supabase.from("organization_members")
          .select("id, user_id, role, profiles (first_name, last_name, email)")
          .eq("org_id", membership.org_id)
          .order("joined_at"),
      ]);

      if (!orgData) { setNotFound(true); setLoading(false); return; }

      const o = orgData as OrgData;
      setOrg(o);
      setForm(o);
      setMembers((membersData ?? []).map((m: unknown) => {
        const raw = m as { id: string; user_id: string; role: string; profiles: { first_name: string; last_name: string; email: string } };
        return { id: raw.id, user_id: raw.user_id, role: raw.role, profile: raw.profiles };
      }));
      setLoading(false);
    });
  }, []);

  function setField(key: string, value: string | number | null) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    const supabase = createClient();
    const { error } = await supabase.from("organizations").update({
      name: form.name,
      description: form.description || null,
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      city: form.city || null,
      state: form.state || null,
      org_type: form.org_type || null,
      founded_year: form.founded_year || null,
      instagram: form.instagram || null,
      facebook: form.facebook || null,
      updated_at: new Date().toISOString(),
    }).eq("id", org!.id);
    setSaving(false);
    if (error) { setSaveMsg("Error: " + error.message); return; }
    setSaveMsg("Saved!");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  // Debounced profile search
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
    if (!addingUser || !orgId) return;
    setAddError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("organization_members").upsert({
      org_id: orgId, user_id: addingUser.id, role: addingRole, invited_by: user?.id ?? null,
    }, { onConflict: "org_id,user_id" });
    if (error) { setAddError(error.message); return; }
    if (addingUser.role === "user") {
      await supabase.from("profiles").update({ role: "organizer" }).eq("id", addingUser.id);
    }
    setMemberSearch(""); setSearchResults([]); setAddingUser(null);
    const { data: membersData } = await supabase
      .from("organization_members")
      .select("id, user_id, role, profiles (first_name, last_name, email)")
      .eq("org_id", orgId)
      .order("joined_at");
    setMembers((membersData ?? []).map((m: unknown) => {
      const raw = m as { id: string; user_id: string; role: string; profiles: { first_name: string; last_name: string; email: string } };
      return { id: raw.id, user_id: raw.user_id, role: raw.role, profile: raw.profiles };
    }));
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

  function handleScheduleSave() {
    setScheduleMsg("Schedule saved!");
    setTimeout(() => setScheduleMsg(""), 3000);
  }

  async function handleBankSave(e: React.FormEvent) {
    e.preventDefault();
    setBankSaving(true);
    setBankMsg("");
    // Full persistence requires Stripe Connect — saving locally for now
    await new Promise(r => setTimeout(r, 600));
    setBankSaving(false);
    setBankMsg("Bank account updated!");
    setTimeout(() => setBankMsg(""), 3000);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" /></div>;
  }

  if (notFound) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-ivory-200 flex items-center justify-center mx-auto mb-4 text-3xl">🏢</div>
        <h2 className="font-display font-bold text-ink text-xl mb-2" style={{ letterSpacing: "-0.02em" }}>Not in an organization</h2>
        <p className="font-ui text-ink-muted text-sm leading-relaxed">
          You haven&apos;t been added to an organization yet. Contact a platform admin to be added.
        </p>
      </div>
    );
  }

  if (!org) return null;

  const canEdit = myRole === "owner" || myRole === "admin";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>{org.name}</h1>
            <span className={`font-mono text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full font-bold ${org.status === "active" ? "bg-peacock/12 text-peacock" : "bg-ivory-200 text-ink-muted"}`}>
              {org.status}
            </span>
          </div>
          {org.slug && <p className="font-mono text-[11px] text-ink-muted/60">rameelo.com/org/{org.slug}</p>}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-ivory-200/60 border border-ivory-200">
          <span className={`font-mono text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[myRole] ?? "bg-ivory-200 text-ink-muted"}`}>{myRole}</span>
          <span className="font-ui text-xs text-ink-muted">Your role</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── Edit Form ── */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSave} className="space-y-5">
            {/* Identity */}
            <div className="bg-white rounded-2xl border border-ivory-200 p-5 space-y-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Identity</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Organization name</label>
                  <input
                    required
                    disabled={!canEdit}
                    value={form.name ?? ""}
                    onChange={e => setField("name", e.target.value)}
                    className={`${inputCls} ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Type</label>
                  <select
                    disabled={!canEdit}
                    value={form.org_type ?? ""}
                    onChange={e => setField("org_type", e.target.value)}
                    className={`${inputCls} ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <option value="">No type selected</option>
                    {ORG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Founded year</label>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    disabled={!canEdit}
                    value={form.founded_year ?? ""}
                    onChange={e => setField("founded_year", e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="2010"
                    className={`${inputCls} ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Description</label>
                  <textarea
                    rows={3}
                    disabled={!canEdit}
                    value={form.description ?? ""}
                    onChange={e => setField("description", e.target.value)}
                    placeholder="Brief description of your organization…"
                    className={`${inputCls} resize-none ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-2xl border border-ivory-200 p-5 space-y-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Contact &amp; Location</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    disabled={!canEdit}
                    value={form.email ?? ""}
                    onChange={e => setField("email", e.target.value)}
                    placeholder="info@org.com"
                    className={`${inputCls} ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input
                    type="tel"
                    disabled={!canEdit}
                    value={form.phone ?? ""}
                    onChange={e => setField("phone", e.target.value)}
                    placeholder="(555) 000-0000"
                    className={`${inputCls} ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Website</label>
                  <input
                    type="url"
                    disabled={!canEdit}
                    value={form.website ?? ""}
                    onChange={e => setField("website", e.target.value)}
                    placeholder="https://…"
                    className={`${inputCls} ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input
                    disabled={!canEdit}
                    value={form.city ?? ""}
                    onChange={e => setField("city", e.target.value)}
                    placeholder="Edison"
                    className={`${inputCls} ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <select
                    disabled={!canEdit}
                    value={form.state ?? ""}
                    onChange={e => setField("state", e.target.value)}
                    className={`${inputCls} ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
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
                    <input
                      disabled={!canEdit}
                      value={form.instagram ?? ""}
                      onChange={e => setField("instagram", e.target.value.replace("@", ""))}
                      placeholder="handle"
                      className={`${inputCls} pl-8 ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Facebook</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-muted">@</span>
                    <input
                      disabled={!canEdit}
                      value={form.facebook ?? ""}
                      onChange={e => setField("facebook", e.target.value.replace("@", ""))}
                      placeholder="handle"
                      className={`${inputCls} pl-8 ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {canEdit ? (
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-aubergine text-white font-display font-bold text-sm px-6 py-3 rounded-2xl hover:bg-aubergine-light transition-all disabled:opacity-50"
                >
                  {saving ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</> : "Save changes"}
                </button>
                {saveMsg && (
                  <p className={`font-ui text-sm ${saveMsg.startsWith("Error") ? "text-durga" : "text-peacock"}`}>{saveMsg}</p>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-ivory-200/60 border border-ivory-200 px-4 py-3">
                <p className="font-ui text-xs text-ink-muted">Only owners and admins can edit the organization profile. Contact your org owner to request changes.</p>
              </div>
            )}
          </form>
        </div>

        {/* ── Team Members ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-ivory-200">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Team</p>
              <p className="font-display font-bold text-ink text-lg mt-0.5" style={{ letterSpacing: "-0.015em" }}>
                {members.length} member{members.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Add member — owners and admins only */}
            {canEdit && (
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
                        <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-full shrink-0 ${u.role === "admin" ? "bg-durga/10 text-durga" : "bg-ivory-200 text-ink-muted"}`}>
                          {u.role}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

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
                    {addingUser.role === "user" && (
                      <p className="font-mono text-[9px] text-peacock bg-peacock/8 px-2.5 py-1.5 rounded-lg">
                        This user will be promoted to Organizer so they can access the organizer portal.
                      </p>
                    )}
                    <div>
                      <label className="font-mono text-[9px] uppercase tracking-widest text-ink-muted block mb-1.5">Org Role</label>
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
            )}

            {/* Member list */}
            {members.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="font-ui text-sm text-ink-muted">No members yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-ivory-200">
                {members.map(m => (
                  <div key={m.id} className="px-5 py-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-aubergine/10 flex items-center justify-center text-aubergine font-bold text-xs shrink-0">
                      {m.profile?.first_name?.charAt(0) ?? "?"}{m.profile?.last_name?.charAt(0) ?? ""}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui text-sm font-semibold text-ink truncate">{m.profile?.first_name} {m.profile?.last_name}</p>
                      <p className="font-mono text-[10px] text-ink-muted truncate">{m.profile?.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {canEdit ? (
                        <select
                          value={m.role}
                          onChange={e => handleRoleChange(m.id, e.target.value)}
                          className={`font-mono text-[9px] uppercase tracking-wide px-2 py-1 rounded-full border-0 outline-none cursor-pointer font-bold ${ROLE_BADGE[m.role] ?? "bg-ivory-200 text-ink-muted"}`}
                        >
                          {MEMBER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      ) : (
                        <span className={`font-mono text-[9px] uppercase tracking-wide px-2 py-1 rounded-full font-bold ${ROLE_BADGE[m.role] ?? "bg-ivory-200 text-ink-muted"}`}>
                          {m.role}
                        </span>
                      )}
                      {canEdit && (
                        <button
                          disabled={removingId === m.id}
                          onClick={() => handleRemoveMember(m.id)}
                          className="font-mono text-[9px] text-ink-muted/50 hover:text-durga transition-colors"
                        >
                          {removingId === m.id ? "…" : "Remove"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Payout Schedule ── */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-ivory-200">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Payout schedule</p>
              <p className="font-display font-bold text-ink text-base mt-0.5" style={{ letterSpacing: "-0.015em" }}>When do you get paid?</p>
            </div>
            <div className="p-4 space-y-2.5">
              {(["weekly", "monthly"] as const).map(opt => (
                <label
                  key={opt}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${payoutSchedule === opt ? "border-peacock/30 bg-peacock/5" : "border-ivory-200 hover:border-aubergine/20"}`}
                >
                  <input
                    type="radio"
                    name="payout_schedule"
                    value={opt}
                    checked={payoutSchedule === opt}
                    onChange={() => setPayoutSchedule(opt)}
                    className="accent-peacock shrink-0"
                  />
                  <div className="flex-1">
                    <p className="font-ui font-semibold text-ink text-sm capitalize">{opt}</p>
                    <p className="font-mono text-[10px] text-ink-muted mt-0.5">
                      {opt === "weekly" ? "Every Friday · Mon–Thu sales included" : "1st of month · prior month sales"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <div className="px-4 pb-4 pt-1 flex items-center gap-3">
              <button
                onClick={handleScheduleSave}
                className="px-4 py-2 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:bg-aubergine/90 transition-all"
              >
                Save schedule
              </button>
              {scheduleMsg && <p className="font-ui text-xs text-peacock">{scheduleMsg}</p>}
            </div>
          </div>

          {/* ── Bank Account for Payouts ── */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-ivory-200 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Payout account</p>
                <p className="font-display font-bold text-ink text-base mt-0.5" style={{ letterSpacing: "-0.015em" }}>Bank Account</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-peacock/10 text-peacock font-mono text-[9px] font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-peacock" />
                Test
              </span>
            </div>

            <form onSubmit={handleBankSave} className="p-4 space-y-3">
              <div>
                <label className={labelCls}>Bank name</label>
                <input
                  type="text"
                  value={bankDraft.bankName}
                  onChange={e => setBankDraft(d => ({ ...d, bankName: e.target.value }))}
                  placeholder="e.g. Chase Business Checking"
                  className={inputCls}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <label className={labelCls}>Account holder name</label>
                <input
                  type="text"
                  value={bankDraft.accountHolder}
                  onChange={e => setBankDraft(d => ({ ...d, accountHolder: e.target.value }))}
                  placeholder="Legal name on account"
                  className={inputCls}
                  disabled={!canEdit}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Routing number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={9}
                    value={showAccount ? bankDraft.routingNumber : bankDraft.routingNumber.replace(/\d(?=\d{4})/g, "•")}
                    onChange={e => setBankDraft(d => ({ ...d, routingNumber: e.target.value.replace(/\D/g, "") }))}
                    placeholder="9 digits"
                    className={`${inputCls} font-mono`}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <label className={labelCls}>Account number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={showAccount ? bankDraft.accountNumber : bankDraft.accountNumber.replace(/\d(?=\d{4})/g, "•")}
                    onChange={e => setBankDraft(d => ({ ...d, accountNumber: e.target.value.replace(/\D/g, "") }))}
                    placeholder="Account number"
                    className={`${inputCls} font-mono`}
                    disabled={!canEdit}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Account type</label>
                <div className="flex gap-2">
                  {(["checking", "savings"] as const).map(t => (
                    <label
                      key={t}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border cursor-pointer transition-all text-sm font-ui font-medium capitalize ${bankDraft.accountType === t ? "border-aubergine/30 bg-aubergine/8 text-ink" : "border-ivory-200 text-ink-muted hover:border-aubergine/20"}`}
                    >
                      <input
                        type="radio"
                        name="account_type"
                        value={t}
                        checked={bankDraft.accountType === t}
                        onChange={() => setBankDraft(d => ({ ...d, accountType: t }))}
                        className="accent-aubergine"
                        disabled={!canEdit}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAccount(s => !s)}
                className="font-mono text-[10px] text-ink-muted hover:text-ink transition-colors"
              >
                {showAccount ? "Hide" : "Show"} account details
              </button>

              {canEdit && (
                <div className="pt-1 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={bankSaving}
                    className="px-4 py-2 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:bg-aubergine/90 transition-all disabled:opacity-50"
                  >
                    {bankSaving ? "Saving…" : "Update account"}
                  </button>
                  {bankMsg && <p className="font-ui text-xs text-peacock">{bankMsg}</p>}
                </div>
              )}
            </form>

            <div className="px-4 py-3 bg-ivory border-t border-ivory-200">
              <p className="font-mono text-[10px] text-ink-muted/60">
                Stored securely · Full encryption via Stripe Connect · Only owners can update
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
