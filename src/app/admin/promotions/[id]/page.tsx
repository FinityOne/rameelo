"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Promotion, PromotionEntry } from "@/lib/promotions";

function fmtTS(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function PromotionEntriesPage() {
  const { id } = useParams<{ id: string }>();
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [entries, setEntries] = useState<PromotionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: p }, { data: e }] = await Promise.all([
      supabase.from("promotions").select("*").eq("id", id).single(),
      supabase.from("promotion_entries").select("*").eq("promotion_id", id).order("created_at", { ascending: false }),
    ]);
    setPromo((p as Promotion) ?? null);
    setEntries((e ?? []) as PromotionEntry[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function toggleActive() {
    if (!promo) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.rpc("set_promotion_active", { p_id: promo.id, p_active: !promo.is_active });
    await load();
    setBusy(false);
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return entries;
    return entries.filter((e) =>
      `${e.first_name} ${e.last_name} ${e.email} ${e.phone ?? ""} ${e.city ?? ""} ${e.state ?? ""}`.toLowerCase().includes(s),
    );
  }, [entries, q]);

  function exportCsv() {
    const headers = ["First Name", "Last Name", "Email", "Phone", "City", "State", "Entered"];
    const rows = entries.map((e) => [e.first_name, e.last_name, e.email, e.phone ?? "", e.city ?? "", e.state ?? "", new Date(e.created_at).toISOString()]);
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promotion-entries-${(promo?.name ?? "promo").replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-3 border-ivory-200 border-t-aubergine animate-spin" /></div>;
  }
  if (!promo) {
    return (
      <div className="max-w-3xl">
        <p className="font-ui text-sm text-ink-muted">Promotion not found. <Link href="/admin/promotions" className="text-aubergine font-semibold">Back to promotions</Link></p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <Link href="/admin/promotions" className="inline-flex items-center gap-1.5 font-ui text-sm text-ink-muted hover:text-ink transition-colors mb-5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Promotions
      </Link>

      {/* Promo summary */}
      <div className="rounded-2xl border border-ivory-200 bg-white p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${promo.is_active ? "bg-peacock/12 text-peacock" : "bg-ivory-200 text-ink-muted"}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${promo.is_active ? "bg-peacock" : "bg-ink-muted/50"}`} />
              {promo.is_active ? "Live" : "Off"}
            </span>
            <h2 className="font-display font-bold text-ink text-lg truncate" style={{ letterSpacing: "-0.015em" }}>{promo.name}</h2>
          </div>
          <p className="font-ui text-sm text-ink-muted">{promo.headline} · ${promo.prize_value} value</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-center px-2">
            <p className="font-display font-bold text-aubergine text-2xl leading-none">{entries.length}</p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-1">entries</p>
          </div>
          <button onClick={toggleActive} disabled={busy} aria-label={promo.is_active ? "Turn off" : "Turn on"}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${promo.is_active ? "bg-peacock" : "bg-ivory-200"} disabled:opacity-50`}>
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${promo.is_active ? "translate-x-5" : ""}`} />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <svg className="w-4 h-4 text-ink-muted/50 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, city…" className="w-full rounded-xl border border-ivory-200 bg-white pl-10 pr-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine transition-all" />
        </div>
        <button onClick={exportCsv} disabled={entries.length === 0} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-ivory-200 bg-white font-ui text-sm font-semibold text-ink-muted hover:text-ink hover:border-aubergine/30 transition-colors disabled:opacity-50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export CSV
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-14 text-center">
          <div className="text-3xl mb-3">📭</div>
          <p className="font-display font-bold text-ink text-base mb-1">No entries yet</p>
          <p className="font-ui text-sm text-ink-muted">Entries will appear here as visitors enter the giveaway{promo.is_active ? "." : " — turn the promotion on to start collecting."}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl border border-ivory-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ivory-200 bg-ivory/50">
                  {["Name", "Email", "Phone", "Location", "Entered"].map((h) => (
                    <th key={h} className="text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-ivory/40 transition-colors">
                    <td className="px-4 py-3 font-ui text-sm font-semibold text-ink">{e.first_name} {e.last_name}</td>
                    <td className="px-4 py-3 font-ui text-sm text-ink-muted"><a href={`mailto:${e.email}`} className="hover:text-aubergine">{e.email}</a></td>
                    <td className="px-4 py-3 font-ui text-sm text-ink-muted">{e.phone || "—"}</td>
                    <td className="px-4 py-3 font-ui text-sm text-ink-muted">{[e.city, e.state].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-ink-muted/70 whitespace-nowrap">{fmtTS(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2.5">
            {filtered.map((e) => (
              <div key={e.id} className="rounded-2xl border border-ivory-200 bg-white p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-ui text-sm font-bold text-ink">{e.first_name} {e.last_name}</p>
                  <span className="font-mono text-[10px] text-ink-muted/60">{fmtTS(e.created_at)}</span>
                </div>
                <a href={`mailto:${e.email}`} className="block font-ui text-sm text-aubergine">{e.email}</a>
                <p className="font-ui text-xs text-ink-muted mt-0.5">{e.phone || "No phone"} · {[e.city, e.state].filter(Boolean).join(", ") || "No location"}</p>
              </div>
            ))}
          </div>

          {q && filtered.length === 0 && <p className="font-ui text-sm text-ink-muted text-center py-8">No entries match &ldquo;{q}&rdquo;.</p>}
        </>
      )}
    </div>
  );
}
