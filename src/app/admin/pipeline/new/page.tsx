"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { STAGES } from "../page";

const SOURCES = ["cold_outreach", "referral", "inbound", "social", "conference", "partner", "other"];
const SOURCE_LABELS: Record<string, string> = {
  cold_outreach: "Cold Outreach", referral: "Referral", inbound: "Inbound",
  social: "Social Media", conference: "Conference", partner: "Partner", other: "Other",
};

type AdminProfile = { id: string; first_name: string; last_name: string };
type OrgOption    = { id: string; name: string };
type ArtistOption = { id: string; name: string; slug: string };

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function NewLeadPage() {
  const router = useRouter();
  const [admins,  setAdmins]  = useState<AdminProfile[]>([]);
  const [orgs,    setOrgs]    = useState<OrgOption[]>([]);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", title: "",
    city: "", state: "", linkedin_url: "",
    organization_name: "", org_id: "",
    artist_id: "",
    stage: "new_lead", priority: "medium", source: "",
    assigned_to: "", next_follow_up_at: "",
    est_events_per_year: "", est_avg_attendance: "", est_avg_ticket_price: "",
    tags: "", internal_summary: "",
  });

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("profiles").select("id, first_name, last_name").eq("role", "admin"),
      supabase.from("organizations").select("id, name").order("name"),
      supabase.from("artists").select("id, name, slug").eq("is_active", true).order("name"),
    ]).then(([adminsRes, orgsRes, artistsRes]) => {
      setAdmins((adminsRes.data ?? []) as AdminProfile[]);
      setOrgs((orgsRes.data ?? []) as OrgOption[]);
      setArtists((artistsRes.data ?? []) as ArtistOption[]);
    });
  }, []);

  const arr = form.est_events_per_year && form.est_avg_attendance && form.est_avg_ticket_price
    ? Number(form.est_events_per_year) * Number(form.est_avg_attendance) * Number(form.est_avg_ticket_price) * 0.03
    : null;

  const gross = arr != null
    ? Number(form.est_events_per_year) * Number(form.est_avg_attendance) * Number(form.est_avg_ticket_price)
    : null;

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First and last name are required.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error: err } = await supabase.from("sales_leads").insert({
      first_name: form.first_name.trim(),
      last_name:  form.last_name.trim(),
      email:      form.email || null,
      phone:      form.phone || null,
      title:      form.title || null,
      city:       form.city  || null,
      state:      form.state || null,
      linkedin_url:      form.linkedin_url || null,
      organization_name: form.organization_name || null,
      org_id:     form.org_id    || null,
      artist_id:  form.artist_id || null,
      stage:      form.stage,
      priority:   form.priority,
      source:     form.source       || null,
      assigned_to: form.assigned_to || null,
      next_follow_up_at: form.next_follow_up_at || null,
      est_events_per_year:  form.est_events_per_year  ? Number(form.est_events_per_year)  : null,
      est_avg_attendance:   form.est_avg_attendance   ? Number(form.est_avg_attendance)   : null,
      est_avg_ticket_price: form.est_avg_ticket_price ? Number(form.est_avg_ticket_price) : null,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
      internal_summary: form.internal_summary || null,
      created_by: user?.id,
    }).select("id").single();

    if (err) { setError(err.message); setSaving(false); return; }
    router.push(`/admin/pipeline/${(data as { id: string }).id}`);
  }

  const inp   = "w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 font-ui text-[13px] text-ink/80 placeholder-ink/25 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/30 transition-all";
  const label = "block font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-1.5";
  const sec   = "font-mono text-[9px] uppercase tracking-widest text-ink/30 pb-1.5 border-b border-black/[0.05] mb-4";

  const selectedArtist = artists.find(a => a.id === form.artist_id);

  return (
    <div className="max-w-5xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/pipeline" className="text-ink/30 hover:text-ink/60 transition-colors mt-0.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
        </Link>
        <div>
          <h1 className="font-display font-black text-ink/85 text-2xl" style={{ letterSpacing: "-0.03em" }}>New Lead</h1>
          <p className="font-ui text-[13px] text-ink/40 mt-0.5">Add an organizer or artist to your sales pipeline</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">

        {/* ── Main form ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-6">
            <p className={sec}>Contact Info</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className={label}>First Name *</label><input className={inp} value={form.first_name} onChange={e => setForm(f => ({...f, first_name: e.target.value}))} placeholder="Raj" /></div>
              <div><label className={label}>Last Name *</label><input className={inp} value={form.last_name} onChange={e => setForm(f => ({...f, last_name: e.target.value}))} placeholder="Patel" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className={label}>Email</label><input className={inp} type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="raj@example.com" /></div>
              <div><label className={label}>Phone</label><input className={inp} value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+1 (555) 000-0000" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div><label className={label}>Title</label><input className={inp} value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Event Director" /></div>
              <div><label className={label}>City</label><input className={inp} value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} placeholder="Houston" /></div>
              <div><label className={label}>State</label><input className={inp} value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))} placeholder="TX" /></div>
            </div>
            <div>
              <label className={label}>LinkedIn URL</label>
              <input className={inp} value={form.linkedin_url} onChange={e => setForm(f => ({...f, linkedin_url: e.target.value}))} placeholder="https://linkedin.com/in/..." />
            </div>
          </div>

          {/* Organization */}
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-6">
            <p className={sec}>Organization</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Org Name (external)</label>
                <input className={inp} value={form.organization_name} onChange={e => setForm(f => ({...f, organization_name: e.target.value}))} placeholder="Houston Garba Association" />
              </div>
              <div>
                <label className={label}>Link to Platform Org</label>
                <select className={inp} value={form.org_id} onChange={e => setForm(f => ({...f, org_id: e.target.value}))}>
                  <option value="">— None —</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Pipeline */}
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-6">
            <p className={sec}>Pipeline</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={label}>Stage</label>
                <select className={inp} value={form.stage} onChange={e => setForm(f => ({...f, stage: e.target.value}))}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Priority</label>
                <select className={inp} value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="hot">🔥 Hot</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={label}>Source</label>
                <select className={inp} value={form.source} onChange={e => setForm(f => ({...f, source: e.target.value}))}>
                  <option value="">— Select —</option>
                  {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Assigned To</label>
                <select className={inp} value={form.assigned_to} onChange={e => setForm(f => ({...f, assigned_to: e.target.value}))}>
                  <option value="">— Unassigned —</option>
                  {admins.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Next Follow-up</label>
                <input className={inp} type="date" value={form.next_follow_up_at} onChange={e => setForm(f => ({...f, next_follow_up_at: e.target.value}))} />
              </div>
            </div>
          </div>

          {/* Revenue Estimate */}
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-6">
            <p className={sec}>Revenue Estimate</p>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={label}>Events / Year</label><input className={inp} type="number" min="0" value={form.est_events_per_year} onChange={e => setForm(f => ({...f, est_events_per_year: e.target.value}))} placeholder="3" /></div>
              <div><label className={label}>Avg Attendance</label><input className={inp} type="number" min="0" value={form.est_avg_attendance} onChange={e => setForm(f => ({...f, est_avg_attendance: e.target.value}))} placeholder="500" /></div>
              <div><label className={label}>Avg Ticket ($)</label><input className={inp} type="number" min="0" step="0.01" value={form.est_avg_ticket_price} onChange={e => setForm(f => ({...f, est_avg_ticket_price: e.target.value}))} placeholder="25" /></div>
            </div>
          </div>

        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4 lg:sticky lg:top-[68px]">

          {/* Live ARR preview */}
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-black/[0.05]">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink/35">Live Revenue Preview</p>
            </div>
            <div className="p-4">
              {arr != null ? (
                <div className="space-y-3">
                  <div className="rounded-xl p-4 text-center" style={{ background: "linear-gradient(135deg, rgba(46,27,48,0.07), rgba(46,27,48,0.03))", border: "1px solid rgba(46,27,48,0.1)" }}>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink/35 mb-1">Rameelo Fee (3%)</p>
                    <p className="font-display font-black text-[#F5A623] text-3xl" style={{ letterSpacing: "-0.04em" }}>{fmtMoney(arr)}</p>
                    <p className="font-mono text-[9px] text-ink/30 mt-0.5">per year</p>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {[
                      { label: "Gross ticket revenue", val: fmtMoney(gross!) },
                      { label: "5-yr Rameelo value",  val: fmtMoney(arr * 5)  },
                      { label: "10-yr Rameelo value", val: fmtMoney(arr * 10) },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-baseline">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-ink/30">{row.label}</span>
                        <span className="font-ui text-[12px] font-semibold text-ink/60">{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-2xl mb-2">💰</p>
                  <p className="font-ui text-[12px] text-ink/30">Fill in the revenue estimate section to see projections</p>
                </div>
              )}
            </div>
          </div>

          {/* Artist */}
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-4">
            <label className={label}>Attach Artist</label>
            <select className={inp} value={form.artist_id} onChange={e => setForm(f => ({...f, artist_id: e.target.value}))}>
              <option value="">— No artist —</option>
              {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {selectedArtist && (
              <a href={`/artists/${selectedArtist.slug}`} target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-aubergine/60 hover:text-aubergine transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                View artist page
              </a>
            )}
            <p className="font-mono text-[9px] text-ink/20 mt-2">Links past events to this artist's public page</p>
          </div>

          {/* Tags & Notes */}
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-4 space-y-3">
            <div>
              <label className={label}>Tags (comma separated)</label>
              <input className={inp} value={form.tags} onChange={e => setForm(f => ({...f, tags: e.target.value}))} placeholder="navratri, houston, large-venue" />
            </div>
            <div>
              <label className={label}>Internal Notes</label>
              <textarea className={`${inp} min-h-[80px] resize-none`} value={form.internal_summary} onChange={e => setForm(f => ({...f, internal_summary: e.target.value}))} placeholder="Context, referral source, relationship history…" />
            </div>
          </div>

          {/* Error + CTA */}
          <div className="space-y-2">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                <p className="font-ui text-xs text-red-600">{error}</p>
              </div>
            )}
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 rounded-xl font-ui font-bold text-[14px] text-white transition-all disabled:opacity-50 hover:opacity-90 flex items-center justify-center gap-2"
              style={{ backgroundColor: "#2E1B30" }}>
              {saving ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  Create Lead
                </>
              )}
            </button>
            <p className="font-mono text-[9px] text-ink/25 text-center">Redirects to lead detail after creation</p>
          </div>

        </div>
      </div>
    </div>
  );
}
