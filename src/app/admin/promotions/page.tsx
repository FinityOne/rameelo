"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PROMO_DEFAULTS, type Promotion } from "@/lib/promotions";

type Row = Promotion & { entry_count: number };

function fmtTS(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AdminPromotionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: promos } = await supabase
      .from("promotions")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (promos ?? []) as Promotion[];
    // Per-promo entry counts (head+count is cheap; few promotions expected).
    const withCounts = await Promise.all(
      list.map(async (p) => {
        const { count } = await supabase
          .from("promotion_entries")
          .select("id", { count: "exact", head: true })
          .eq("promotion_id", p.id);
        return { ...p, entry_count: count ?? 0 } as Row;
      }),
    );
    setRows(withCounts);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(p: Row) {
    setBusy(p.id);
    const supabase = createClient();
    await supabase.rpc("set_promotion_active", { p_id: p.id, p_active: !p.is_active });
    await load();
    setBusy(null);
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <p className="font-ui text-sm text-ink-muted max-w-xl leading-relaxed">
          Create a platform-wide giveaway shown as a modal to logged-out visitors. Toggle one live at a time, and view everyone who entered.
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New promotion
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-3 border-ivory-200 border-t-aubergine animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-14 text-center">
          <div className="text-4xl mb-3">🎁</div>
          <p className="font-display font-bold text-ink text-lg mb-1" style={{ letterSpacing: "-0.015em" }}>No promotions yet</p>
          <p className="font-ui text-sm text-ink-muted mb-5">Create your first giveaway to start collecting entries from visitors.</p>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-colors">
            Create a promotion →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <div key={p.id} className="rounded-2xl border border-ivory-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${p.is_active ? "bg-peacock/12 text-peacock" : "bg-ivory-200 text-ink-muted"}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${p.is_active ? "bg-peacock" : "bg-ink-muted/50"}`} />
                    {p.is_active ? "Live" : "Off"}
                  </span>
                  <p className="font-display font-bold text-ink text-base truncate" style={{ letterSpacing: "-0.01em" }}>{p.name}</p>
                </div>
                <p className="font-ui text-sm text-ink-muted truncate">{p.headline} · ${p.prize_value} value</p>
                <p className="font-mono text-[10px] text-ink-muted/60 mt-1">Created {fmtTS(p.created_at)}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link href={`/admin/promotions/${p.id}`} className="text-center">
                  <p className="font-display font-bold text-aubergine text-xl leading-none">{p.entry_count}</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-1">entries</p>
                </Link>

                {/* Toggle */}
                <button
                  onClick={() => toggleActive(p)}
                  disabled={busy === p.id}
                  aria-label={p.is_active ? "Turn off" : "Turn on"}
                  className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${p.is_active ? "bg-peacock" : "bg-ivory-200"} disabled:opacity-50`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${p.is_active ? "translate-x-5" : ""}`} />
                </button>

                <Link href={`/admin/promotions/${p.id}`} className="px-3.5 py-2 rounded-xl border border-ivory-200 font-ui text-sm font-semibold text-ink-muted hover:text-ink hover:border-aubergine/30 transition-colors">
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

// ── Create modal ───────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState(PROMO_DEFAULTS.headline);
  const [subheadline, setSubheadline] = useState(PROMO_DEFAULTS.subheadline);
  const [prizeValue, setPrizeValue] = useState(String(PROMO_DEFAULTS.prize_value));
  const [ctaLabel, setCtaLabel] = useState(PROMO_DEFAULTS.cta_label);
  const [finePrint, setFinePrint] = useState(PROMO_DEFAULTS.fine_print);
  const [activate, setActivate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim() || !headline.trim()) { setError("Name and headline are required."); return; }
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error: insErr } = await supabase
      .from("promotions")
      .insert({
        name: name.trim(),
        headline: headline.trim(),
        subheadline: subheadline.trim(),
        prize_value: parseInt(prizeValue, 10) || 0,
        cta_label: ctaLabel.trim() || PROMO_DEFAULTS.cta_label,
        fine_print: finePrint.trim(),
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();
    if (insErr || !data) { setError(insErr?.message ?? "Could not create promotion."); setSaving(false); return; }
    if (activate) await supabase.rpc("set_promotion_active", { p_id: data.id, p_active: true });
    setSaving(false);
    onCreated();
  }

  const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine transition-all";
  const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5 block";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-aubergine/50 backdrop-blur-sm px-0 sm:px-4" onClick={onClose}>
      <div className="w-full sm:max-w-lg bg-ivory rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[94dvh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-ivory-200 flex items-center justify-between">
          <h2 className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.015em" }}>New promotion</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-ink-muted hover:text-ink transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div>
            <label className={labelCls}>Internal name</label>
            <input className={inputCls} placeholder="e.g. Navratri 2026 ticket giveaway" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Headline (shown to users)</label>
            <input className={inputCls} value={headline} onChange={(e) => setHeadline(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Subheadline</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={subheadline} onChange={(e) => setSubheadline(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prize value ($)</label>
              <input className={inputCls} type="number" inputMode="numeric" value={prizeValue} onChange={(e) => setPrizeValue(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Button label</label>
              <input className={inputCls} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Fine print / terms</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={finePrint} onChange={(e) => setFinePrint(e.target.value)} />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} className="w-4 h-4 rounded accent-peacock" />
            <span className="font-ui text-sm text-ink">Make this the live promotion now <span className="text-ink-muted">(turns others off)</span></span>
          </label>
          {error && <p className="font-ui text-xs text-durga">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-ivory-200 flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-ivory-200 font-ui text-sm font-semibold text-ink-muted hover:text-ink transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={saving} className="flex-1 py-3 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-colors disabled:opacity-60">
            {saving ? "Creating…" : "Create promotion"}
          </button>
        </div>
      </div>
    </div>
  );
}
