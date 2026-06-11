"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "../org-context";
import { computeRisk, RISK_BADGE, type RiskLevel, type RiskProfile } from "@/lib/risk";

// ── Types ─────────────────────────────────────────────────────────────────────
type Row = {
  id: string; buyer_name: string; buyer_email: string; grand_total: number; created_at: string;
  status: string; dispute_status: string; eventTitle: string; eventDate: string;
  score: number; level: RiskLevel; flags: number;
};

const DISPUTE_PILL: Record<string, { label: string; cls: string }> = {
  none: { label: "—", cls: "bg-ivory-200 text-ink-muted" },
  open: { label: "Open", cls: "bg-marigold/20 text-[#a06b00]" },
  won:  { label: "Won",  cls: "bg-peacock/15 text-peacock" },
  lost: { label: "Lost", cls: "bg-durga/15 text-durga" },
};

function receiptNum(id: string) { return "RM-" + id.replace(/-/g, "").slice(0, 10).toUpperCase(); }
function money(n: number) { return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

export default function RiskDisputesPage() {
  const router = useRouter();
  const { activeOrg } = useOrg();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | RiskLevel>("all");
  const [disputeFilter, setDisputeFilter] = useState("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const evQuery = supabase.from("events").select("id, title, start_date");
      const { data: evs } = await (activeOrg ? evQuery.eq("org_id", activeOrg.id) : evQuery.eq("organizer_id", user.id));
      const events = (evs ?? []) as { id: string; title: string; start_date: string }[];
      if (events.length === 0) { setRows([]); setLoading(false); return; }
      const evMap = new Map(events.map(e => [e.id, e]));

      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, user_id, buyer_name, buyer_email, qty, grand_total, status, created_at, event_id, purchase_ip, first_viewed_at, wallet_generated_at, checked_in_count, failed_payment_attempts, dispute_status")
        .in("event_id", events.map(e => e.id))
        .eq("is_test", false)
        .neq("status", "pending")   // disputes apply to paid orders only — never pending ones
        .order("created_at", { ascending: false });
      const orders = (ordersData ?? []) as Record<string, unknown>[];

      // Buyer profiles for risk signals
      const userIds = Array.from(new Set(orders.map(o => o.user_id).filter(Boolean) as string[]));
      const profMap = new Map<string, RiskProfile>();
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, created_at, last_login_at, total_logins").in("id", userIds);
        for (const p of (profs ?? []) as { id: string; created_at: string | null; last_login_at: string | null; total_logins: number | null }[]) {
          profMap.set(p.id, { created_at: p.created_at, last_login_at: p.last_login_at, total_logins: p.total_logins });
        }
      }

      // Accounts sharing each purchase IP (within this org's orders)
      const ipAccounts = new Map<string, Set<string>>();
      for (const o of orders) {
        const ip = o.purchase_ip as string | null;
        if (!ip) continue;
        if (!ipAccounts.has(ip)) ipAccounts.set(ip, new Set());
        ipAccounts.get(ip)!.add((o.user_id as string) ?? (o.buyer_email as string));
      }

      const today = new Date().toISOString().slice(0, 10);
      const built: Row[] = orders.map(o => {
        const ev = evMap.get(o.event_id as string);
        const ip = o.purchase_ip as string | null;
        const r = computeRisk({
          order: {
            id: o.id as string, user_id: (o.user_id as string) ?? null, created_at: o.created_at as string,
            purchase_ip: ip, first_viewed_at: (o.first_viewed_at as string) ?? null,
            wallet_generated_at: (o.wallet_generated_at as string) ?? null,
            checked_in_count: (o.checked_in_count as number) ?? 0,
            failed_payment_attempts: (o.failed_payment_attempts as number) ?? 0,
          },
          profile: o.user_id ? (profMap.get(o.user_id as string) ?? null) : null,
          eventPassed: !!ev && ev.start_date < today,
          sameIpAccounts: ip ? (ipAccounts.get(ip)?.size ?? 0) : 0,
          samePaymentAccounts: 0,
        });
        return {
          id: o.id as string, buyer_name: o.buyer_name as string, buyer_email: o.buyer_email as string,
          grand_total: Number(o.grand_total), created_at: o.created_at as string, status: o.status as string,
          dispute_status: (o.dispute_status as string) ?? "none",
          eventTitle: ev?.title ?? "Event", eventDate: ev?.start_date ?? "",
          score: r.score, level: r.level, flags: r.triggered.length,
        };
      });
      setRows(built);
      setLoading(false);
    }
    load();
  }, [activeOrg]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (levelFilter !== "all") list = list.filter(r => r.level === levelFilter);
    if (disputeFilter !== "all") list = list.filter(r => r.dispute_status === disputeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.buyer_name.toLowerCase().includes(q) || r.buyer_email.toLowerCase().includes(q) ||
        receiptNum(r.id).toLowerCase().includes(q) || r.eventTitle.toLowerCase().includes(q));
    }
    return list.sort((a, b) => b.score - a.score);
  }, [rows, levelFilter, disputeFilter, search]);

  const summary = useMemo(() => ({
    total: rows.length,
    low: rows.filter(r => r.level === "Low").length,
    medium: rows.filter(r => r.level === "Medium").length,
    high: rows.filter(r => r.level === "High").length,
    open: rows.filter(r => r.dispute_status === "open").length,
    won: rows.filter(r => r.dispute_status === "won").length,
    lost: rows.filter(r => r.dispute_status === "lost").length,
  }), [rows]);

  const selectCls = "h-9 rounded-xl border border-ivory-200 bg-white pl-3 pr-8 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/20 cursor-pointer appearance-none";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Risk &amp; Disputes</h2>
        <p className="font-ui text-ink-muted text-sm mt-0.5">Spot suspicious orders early and manage chargeback disputes with evidence.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-marigold/10 border border-marigold/20 flex items-center justify-center mx-auto mb-4 text-3xl">🛡️</div>
          <p className="font-display font-semibold text-ink text-xl mb-2" style={{ letterSpacing: "-0.015em" }}>No orders to assess yet</p>
          <p className="font-ui text-ink-muted text-sm max-w-xs mx-auto mb-6">Risk scoring runs automatically as tickets are purchased.</p>
          <Link href="/organizer/events" className="inline-flex items-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-marigold-dark transition-colors shadow-sm">View my events →</Link>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total orders", value: summary.total, color: "text-ink" },
              { label: "Low risk", value: summary.low, color: "text-peacock" },
              { label: "Medium risk", value: summary.medium, color: "text-[#a06b00]" },
              { label: "High risk", value: summary.high, color: "text-durga" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-ivory-200 px-4 py-3.5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{s.label}</p>
                <p className={`font-display font-bold text-2xl mt-1 ${s.color}`} style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Open disputes", value: summary.open, color: "text-[#a06b00]" },
              { label: "Won disputes", value: summary.won, color: "text-peacock" },
              { label: "Lost disputes", value: summary.lost, color: "text-durga" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-ivory-200 px-3 sm:px-4 py-3.5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{s.label}</p>
                <p className={`font-display font-bold text-xl sm:text-2xl mt-1 ${s.color}`} style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order #, customer, event…"
                className="w-full h-10 rounded-xl border border-ivory-200 bg-ivory pl-9 pr-4 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/20 transition-all" />
            </div>
            <div className="relative">
              <select value={levelFilter} onChange={e => setLevelFilter(e.target.value as typeof levelFilter)} className={selectCls}>
                <option value="all">All risk</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <div className="relative">
              <select value={disputeFilter} onChange={e => setDisputeFilter(e.target.value)} className={selectCls}>
                <option value="all">All disputes</option><option value="open">Open</option><option value="won">Won</option><option value="lost">Lost</option><option value="none">No dispute</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <span className="font-mono text-[10px] text-ink-muted ml-auto">{filtered.length} shown</span>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ivory-200 bg-ivory">
                  {["Order #", "Customer", "Event", "Amount", "Purchase Date", "Risk", "Flags", "Dispute"].map((h, i) => (
                    <th key={h} className={`px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted ${i === 3 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} onClick={() => router.push(`/organizer/risk/${r.id}`)}
                    className="border-b border-ivory-200 last:border-0 hover:bg-ivory/60 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-aubergine whitespace-nowrap">{receiptNum(r.id)}</td>
                    <td className="px-4 py-3 min-w-[150px]"><p className="font-ui text-sm font-medium text-ink truncate max-w-[180px]">{r.buyer_name}</p><p className="font-mono text-[10px] text-ink-muted truncate max-w-[180px]">{r.buyer_email}</p></td>
                    <td className="px-4 py-3"><p className="font-ui text-sm text-ink truncate max-w-[200px]">{r.eventTitle}</p></td>
                    <td className="px-4 py-3 text-right font-display font-bold text-ink text-sm whitespace-nowrap">${money(r.grand_total)}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-ink-muted whitespace-nowrap">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3"><span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${RISK_BADGE[r.level]}`}>{r.level} · {r.score}</span></td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{r.flags} flag{r.flags !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-3"><span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${DISPUTE_PILL[r.dispute_status]?.cls ?? DISPUTE_PILL.none.cls}`}>{DISPUTE_PILL[r.dispute_status]?.label ?? "—"}</span></td>
                    <td className="px-4 py-3 text-right"><svg className="w-4 h-4 text-ink-muted inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2.5">
            {filtered.map(r => (
              <Link key={r.id} href={`/organizer/risk/${r.id}`} className="block bg-white rounded-2xl border border-ivory-200 p-4 active:scale-[0.99] transition-transform">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="font-mono text-xs font-bold text-aubergine">{receiptNum(r.id)}</p>
                  <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${RISK_BADGE[r.level]}`}>{r.level} · {r.score}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-ui text-sm font-semibold text-ink truncate">{r.buyer_name}</p>
                    <p className="font-ui text-xs text-ink-muted truncate">{r.eventTitle}</p>
                    <p className="font-mono text-[10px] text-ink-muted/80 mt-1">{r.flags} flag{r.flags !== 1 ? "s" : ""} · {fmtDate(r.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-ink text-base">${money(r.grand_total)}</p>
                    <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${DISPUTE_PILL[r.dispute_status]?.cls ?? DISPUTE_PILL.none.cls}`}>{DISPUTE_PILL[r.dispute_status]?.label ?? "—"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
