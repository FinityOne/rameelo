"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { computeBalance, money, PAYOUT_PILL, type BalanceOrder, type PayoutStatus } from "@/lib/payouts";

type Req = {
  id: string; org_id: string | null; requested_by: string; amount: number; status: PayoutStatus;
  created_at: string; orgName: string; available: number;
};

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

export default function AdminPayoutManagementPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | PayoutStatus>("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();

      const { data: reqData } = await supabase
        .from("payout_requests")
        .select("id, org_id, requested_by, amount, status, created_at, organizations(name)")
        .order("created_at", { ascending: false });
      const reqs = (reqData ?? []) as unknown as { id: string; org_id: string | null; requested_by: string; amount: number; status: PayoutStatus; created_at: string; organizations: { name: string } | null }[];

      // Names for solo (no-org) requesters
      const soloUserIds = Array.from(new Set(reqs.filter(r => !r.org_id).map(r => r.requested_by)));
      const nameByUser = new Map<string, string>();
      if (soloUserIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, first_name, last_name, email").in("id", soloUserIds);
        for (const p of (profs ?? []) as { id: string; first_name: string | null; last_name: string | null; email: string | null }[]) {
          nameByUser.set(p.id, [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Organizer");
        }
      }

      // Available balance per request: load that org/requester's events + orders, compute
      const built: Req[] = [];
      const paidByEntity = new Map<string, number>(); // key → sum paid
      for (const r of reqs) {
        const key = r.org_id ?? `u:${r.requested_by}`;
        paidByEntity.set(key, (paidByEntity.get(key) ?? 0) + (r.status === "paid" ? Number(r.amount) : 0));
      }
      // cache balances per entity key
      const balCache = new Map<string, number>();
      for (const r of reqs) {
        const key = r.org_id ?? `u:${r.requested_by}`;
        if (!balCache.has(key)) {
          const evQ = supabase.from("events").select("id");
          const { data: evs } = await (r.org_id ? evQ.eq("org_id", r.org_id) : evQ.eq("organizer_id", r.requested_by));
          const eventIds = (evs ?? []).map((e: { id: string }) => e.id);
          let ords: BalanceOrder[] = [];
          if (eventIds.length) {
            const { data } = await supabase.from("orders")
              .select("created_at, qty, unit_price, discount_amount, status, dispute_status, order_type")
              .in("event_id", eventIds).eq("is_test", false);
            ords = (data ?? []) as BalanceOrder[];
          }
          // Pass this entity's own requests so available nets out paid+outstanding
          const entityReqs = reqs.filter(x => (x.org_id ?? `u:${x.requested_by}`) === key).map(x => ({ amount: x.amount, status: x.status }));
          balCache.set(key, computeBalance(ords, entityReqs).availableForPayout);
        }
        built.push({
          id: r.id, org_id: r.org_id, requested_by: r.requested_by, amount: Number(r.amount),
          status: r.status, created_at: r.created_at,
          orgName: r.organizations?.name ?? nameByUser.get(r.requested_by) ?? "Organizer",
          available: balCache.get(key) ?? 0,
        });
      }
      setRows(built);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => filter === "all" ? rows : rows.filter(r => r.status === filter), [rows, filter]);
  const counts = useMemo(() => ({
    submitted: rows.filter(r => r.status === "submitted").length,
    approved: rows.filter(r => r.status === "approved").length,
    paid: rows.filter(r => r.status === "paid").length,
  }), [rows]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Payout Management</h2>
        <p className="font-ui text-ink-muted text-sm mt-0.5">Review organizer payout requests and record manual transfers.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ivory-200 p-16 text-center">
          <p className="text-3xl mb-3">🏦</p>
          <p className="font-ui text-ink-muted text-sm">No payout requests yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Awaiting review", value: counts.submitted, color: "text-[#a06b00]" },
              { label: "Approved · unpaid", value: counts.approved, color: "text-aubergine" },
              { label: "Paid", value: counts.paid, color: "text-peacock" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-ivory-200 px-4 py-3.5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{s.label}</p>
                <p className={`font-display font-bold text-2xl mt-1 ${s.color}`} style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {(["all", "submitted", "approved", "paid", "rejected"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg font-ui font-semibold text-xs capitalize transition-all ${filter === f ? "bg-aubergine text-white" : "bg-ivory text-ink-muted hover:text-ink"}`}>
                {f}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-ivory-200 bg-ivory/60">
                    {["Organization", "Requested Amount", "Available Balance", "Request Date", "Status"].map((h, i) => (
                      <th key={h} className={`px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted ${i === 1 || i === 2 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {filtered.map(r => (
                    <tr key={r.id} onClick={() => router.push(`/admin/payouts/${r.id}`)} className="hover:bg-ivory/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-ui text-sm font-medium text-ink">{r.orgName}</td>
                      <td className="px-4 py-3 text-right font-display font-bold text-ink text-sm">${money(r.amount)}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-ink-muted">${money(r.available)}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-ink-muted whitespace-nowrap">{fmtDate(r.created_at)}</td>
                      <td className="px-4 py-3"><span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${PAYOUT_PILL[r.status].cls}`}>{PAYOUT_PILL[r.status].label}</span></td>
                      <td className="px-4 py-3 text-right"><svg className="w-4 h-4 text-ink-muted inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
