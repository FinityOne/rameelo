"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const ORG_TYPES = [
  { value: "nonprofit",    label: "Non-profit" },
  { value: "forprofit",    label: "For-profit" },
  { value: "community",    label: "Community group" },
  { value: "educational",  label: "Educational" },
  { value: "government",   label: "Government" },
];

type OrgRow = {
  id: string;
  name: string;
  slug: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  org_type: string | null;
  status: string;
  created_at: string;
  member_count: number;
};

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-peacock/12 text-peacock",
  inactive:  "bg-ivory-200 text-ink-muted",
  suspended: "bg-durga/12 text-durga",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-4 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all";
const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-1.5";

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  // Create form state
  const [form, setForm] = useState({
    name: "", slug: "", email: "", phone: "", website: "",
    city: "", state: "", org_type: "", description: "",
    founded_year: "", instagram: "", facebook: "",
  });

  useEffect(() => { fetchOrgs(); }, []);

  async function fetchOrgs() {
    const supabase = createClient();
    const { data: orgsData } = await supabase
      .from("organizations")
      .select("id, name, slug, email, city, state, org_type, status, created_at")
      .order("name");

    const { data: membersData } = await supabase
      .from("organization_members")
      .select("org_id");

    const countMap: Record<string, number> = {};
    for (const m of (membersData ?? [])) {
      countMap[m.org_id] = (countMap[m.org_id] ?? 0) + 1;
    }

    setOrgs((orgsData ?? []).map(o => ({ ...o, member_count: countMap[o.id] ?? 0 })));
    setLoading(false);
  }

  function setField(key: string, value: string) {
    setForm(f => {
      const next = { ...f, [key]: value };
      if (key === "name" && !f.slug) next.slug = slugify(value);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setCreateError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name.trim()),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        city: form.city.trim() || null,
        state: form.state || null,
        org_type: form.org_type || null,
        description: form.description.trim() || null,
        founded_year: form.founded_year ? parseInt(form.founded_year) : null,
        instagram: form.instagram.trim() || null,
        facebook: form.facebook.trim() || null,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) { setCreateError(error.message); return; }
    setShowCreate(false);
    setForm({ name: "", slug: "", email: "", phone: "", website: "", city: "", state: "", org_type: "", description: "", founded_year: "", instagram: "", facebook: "" });
    await fetchOrgs();
    // Navigate to new org detail
    if (data?.id) window.location.href = `/admin/organizations/${data.id}`;
  }

  const filtered = orgs.filter(o => {
    const q = search.toLowerCase();
    return !q || o.name.toLowerCase().includes(q) || (o.email ?? "").toLowerCase().includes(q) || (o.city ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>Organizations</h1>
          <p className="font-ui text-ink-muted text-sm">{orgs.length} organization{orgs.length !== 1 ? "s" : ""} on the platform</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-aubergine text-white font-ui font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-aubergine-light transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New organization
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organizations…" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ivory-200 bg-white font-ui text-sm focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all" />
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-ivory-200 flex items-center justify-between shrink-0">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Admin</p>
                <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.015em" }}>New Organization</h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-full bg-ivory flex items-center justify-center text-ink-muted hover:text-ink transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="overflow-y-auto">
              <div className="px-6 py-5 space-y-5">
                {/* Identity */}
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Identity</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className={labelCls}>Organization name *</label>
                      <input required value={form.name} onChange={e => setField("name", e.target.value)} placeholder="Navratri Council of NJ" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Slug (URL handle)</label>
                      <input value={form.slug} onChange={e => setField("slug", slugify(e.target.value))} placeholder="navratri-council-nj" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Type</label>
                      <select value={form.org_type} onChange={e => setField("org_type", e.target.value)} className={inputCls}>
                        <option value="">Select type…</option>
                        {ORG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Founded year</label>
                      <input type="number" min="1900" max={new Date().getFullYear()} value={form.founded_year} onChange={e => setField("founded_year", e.target.value)} placeholder="2010" className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Description</label>
                      <textarea rows={3} value={form.description} onChange={e => setField("description", e.target.value)} placeholder="Brief description of this organization…" className={`${inputCls} resize-none`} />
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Contact</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Email</label>
                      <input type="email" value={form.email} onChange={e => setField("email", e.target.value)} placeholder="info@org.com" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Phone</label>
                      <input type="tel" value={form.phone} onChange={e => setField("phone", e.target.value)} placeholder="(555) 000-0000" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Website</label>
                      <input type="url" value={form.website} onChange={e => setField("website", e.target.value)} placeholder="https://…" className={inputCls} />
                    </div>
                    <div />
                    <div>
                      <label className={labelCls}>City</label>
                      <input value={form.city} onChange={e => setField("city", e.target.value)} placeholder="Edison" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>State</label>
                      <select value={form.state} onChange={e => setField("state", e.target.value)} className={inputCls}>
                        <option value="">Select state…</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Social */}
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Social</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Instagram handle</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-muted">@</span>
                        <input value={form.instagram} onChange={e => setField("instagram", e.target.value.replace("@", ""))} placeholder="navratricouncil" className={`${inputCls} pl-8`} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Facebook handle</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-muted">@</span>
                        <input value={form.facebook} onChange={e => setField("facebook", e.target.value.replace("@", ""))} placeholder="navratricouncil" className={`${inputCls} pl-8`} />
                      </div>
                    </div>
                  </div>
                </div>

                {createError && (
                  <div className="rounded-xl bg-durga/10 border border-durga/20 px-4 py-3">
                    <p className="font-ui text-sm text-durga">{createError}</p>
                  </div>
                )}
              </div>

              <div className="px-6 pb-6 flex gap-3 shrink-0">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-2xl border border-ivory-200 font-ui text-sm font-semibold text-ink-muted hover:text-ink transition-colors">Cancel</button>
                <button type="submit" disabled={saving || !form.name.trim()} className="flex-1 py-3 rounded-2xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating…</> : "Create organization →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-ivory-200">
          <p className="font-display font-bold text-ink text-lg mb-2">{search ? "No results" : "No organizations yet"}</p>
          <p className="font-ui text-ink-muted text-sm">{search ? "Try a different search." : "Create the first organization to get started."}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ivory-200 bg-ivory/50">
                {["Organization", "Type", "Location", "Members", "Status", "Created"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-ink-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {filtered.map(org => (
                <tr key={org.id} className="hover:bg-ivory/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <Link href={`/admin/organizations/${org.id}`} className="group">
                      <p className="font-ui font-semibold text-ink group-hover:text-aubergine transition-colors">{org.name}</p>
                      {org.slug && <p className="font-mono text-[10px] text-ink-muted/60">{org.slug}</p>}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-ui text-xs text-ink-muted capitalize">{ORG_TYPES.find(t => t.value === org.org_type)?.label ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-ui text-xs text-ink-muted">{[org.city, org.state].filter(Boolean).join(", ") || "—"}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-display font-bold text-ink text-sm">{org.member_count}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`font-mono text-[9px] uppercase tracking-wide px-2 py-1 rounded-full font-bold ${STATUS_STYLES[org.status] ?? "bg-ivory-200 text-ink-muted"}`}>
                      {org.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-ui text-xs text-ink-muted">{fmtDate(org.created_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
