"use client";

import { useEffect, useState } from "react";
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
  user_id: string; role: string;
  profile: { first_name: string; last_name: string; email: string };
};

const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-4 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all";
const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-1.5";
const ROLE_BADGE: Record<string, string> = { owner: "bg-aubergine/10 text-aubergine", admin: "bg-peacock/10 text-peacock", member: "bg-ivory-200 text-ink-muted" };

export default function OrganizerOrganizationPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [myRole, setMyRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [form, setForm] = useState<Partial<OrgData>>({});

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

      const [{ data: orgData }, { data: membersData }] = await Promise.all([
        supabase.from("organizations").select("*").eq("id", membership.org_id).single(),
        supabase.from("organization_members")
          .select("user_id, role, profiles (first_name, last_name, email)")
          .eq("org_id", membership.org_id)
          .order("joined_at"),
      ]);

      if (!orgData) { setNotFound(true); setLoading(false); return; }

      const o = orgData as OrgData;
      setOrg(o);
      setForm(o);
      setMembers((membersData ?? []).map((m: unknown) => {
        const raw = m as { user_id: string; role: string; profiles: { first_name: string; last_name: string; email: string } };
        return { user_id: raw.user_id, role: raw.role, profile: raw.profiles };
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
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-ivory-200">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Team</p>
              <p className="font-display font-bold text-ink text-lg mt-0.5" style={{ letterSpacing: "-0.015em" }}>
                {members.length} member{members.length !== 1 ? "s" : ""}
              </p>
            </div>
            {members.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="font-ui text-sm text-ink-muted">No members yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-ivory-200">
                {members.map(m => (
                  <div key={m.user_id} className="px-5 py-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-aubergine/10 flex items-center justify-center text-aubergine font-bold text-xs shrink-0">
                      {m.profile?.first_name?.charAt(0) ?? "?"}{m.profile?.last_name?.charAt(0) ?? ""}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui text-sm font-semibold text-ink truncate">{m.profile?.first_name} {m.profile?.last_name}</p>
                      <p className="font-mono text-[10px] text-ink-muted truncate">{m.profile?.email}</p>
                    </div>
                    <span className={`font-mono text-[9px] uppercase tracking-wide px-2 py-1 rounded-full font-bold ${ROLE_BADGE[m.role] ?? "bg-ivory-200 text-ink-muted"}`}>
                      {m.role}
                    </span>
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
