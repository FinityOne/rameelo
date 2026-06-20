"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "../org-context";
import {
  computeBalance, money, SETTLEMENT_HOLD_DAYS, PAYOUT_PILL,
  type BalanceOrder, type BalanceRequest, type PayoutStatus,
} from "@/lib/payouts";

type Request = {
  id: string; amount: number; status: PayoutStatus; organizer_notes: string | null;
  admin_notes: string | null; payment_reference: string | null; created_at: string; paid_at: string | null;
};

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

export default function OrganizerPayoutsPage() {
  const { activeOrg } = useOrg();
  const [orders, setOrders] = useState<BalanceOrder[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const [showRequest, setShowRequest] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const evQuery = supabase.from("events").select("id");
    const { data: evs } = await (activeOrg ? evQuery.eq("org_id", activeOrg.id) : evQuery.eq("organizer_id", user.id));
    const eventIds = (evs ?? []).map((e: { id: string }) => e.id);

    let ords: BalanceOrder[] = [];
    if (eventIds.length) {
      const { data } = await supabase
        .from("orders")
        .select("created_at, qty, unit_price, discount_amount, status, dispute_status, order_type")
        .in("event_id", eventIds)
        .eq("is_test", false);
      ords = (data ?? []) as BalanceOrder[];
    }
    setOrders(ords);

    // Payout requests for this org (or this user's, when solo)
    let reqQuery = supabase.from("payout_requests")
      .select("id, amount, status, organizer_notes, admin_notes, payment_reference, created_at, paid_at")
      .order("created_at", { ascending: false });
    reqQuery = activeOrg ? reqQuery.eq("org_id", activeOrg.id) : reqQuery.eq("requested_by", user.id);
    const { data: reqs } = await reqQuery;
    setRequests((reqs ?? []) as Request[]);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [activeOrg]);

  const balance = useMemo(() => computeBalance(orders, requests as BalanceRequest[]), [orders, requests]);

  async function submitRequest() {
    setError("");
    const amt = Math.round(parseFloat(amount) * 100) / 100;
    if (!amt || amt <= 0) { setError("Enter an amount greater than $0."); return; }
    if (amt > balance.availableForPayout) { setError(`Amount exceeds your available balance of $${money(balance.availableForPayout)}.`); return; }
    setSubmitting(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("payout_requests").insert({
      org_id: activeOrg?.id ?? null,
      requested_by: userId,
      amount: amt,
      organizer_notes: notes.trim() || null,
      status: "submitted",
    });
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    setShowRequest(false); setAmount(""); setNotes("");
    setToast("Payout request submitted — an admin will review it shortly.");
    setTimeout(() => setToast(""), 4000);
    load();
  }

  const cards = [
    { label: "Total Revenue", value: balance.totalRevenue, hint: "all successful ticket sales" },
    { label: "Available for Payout", value: balance.availableForPayout, hint: `settled ${SETTLEMENT_HOLD_DAYS}d+ · minus paid & pending`, accent: true },
    { label: "Pending Settlement", value: balance.pendingSettlement, hint: `clears ${SETTLEMENT_HOLD_DAYS} days after sale` },
    { label: "Total Paid Out", value: balance.totalPaidOut, hint: "transferred to you" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Payouts</h2>
          <p className="font-ui text-ink-muted text-sm mt-0.5">Request a payout of your settled ticket revenue.</p>
        </div>
        <button onClick={() => { setShowRequest(true); setError(""); }} disabled={loading || balance.availableForPayout <= 0}
          className="shrink-0 inline-flex items-center gap-2 bg-aubergine text-white font-display font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-aubergine-light transition-colors disabled:opacity-50"
          title={balance.availableForPayout <= 0 ? "No funds available to request yet" : ""}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Request Payout
        </button>
      </div>

      {toast && <div className="rounded-xl bg-peacock/10 border border-peacock/25 px-4 py-2.5 font-ui text-sm text-peacock">{toast}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" /></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map(c => (
              <div key={c.label} className={`rounded-2xl border px-4 py-3.5 ${c.accent ? "border-peacock/30 bg-peacock/[0.04]" : "border-ivory-200 bg-white"}`}>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{c.label}</p>
                <p className={`font-display font-bold text-xl sm:text-2xl mt-1 ${c.accent ? "text-peacock" : "text-ink"}`} style={{ letterSpacing: "-0.02em" }}>${money(c.value)}</p>
                <p className="font-mono text-[8px] text-ink-muted/70 mt-0.5 hidden sm:block">{c.hint}</p>
              </div>
            ))}
          </div>

          {/* Offline / manual sales — collected directly by the organizer, NOT part of the Rameelo payout. */}
          {balance.manualRevenue > 0 && (
            <div className="rounded-2xl border border-marigold/30 bg-marigold/[0.06] px-4 py-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-marigold/20 text-marigold-dark flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="min-w-0">
                <p className="font-ui text-sm font-semibold text-ink">Offline / manual sales: ${money(balance.manualRevenue)}</p>
                <p className="font-ui text-xs text-ink-muted mt-0.5 leading-relaxed">
                  This is revenue from manual orders you settled directly (cash, Zelle, at the door). It&rsquo;s shown for your records but is <strong>not</strong> collected or paid out by Rameelo — it&rsquo;s excluded from the balances above.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-ivory border border-ivory-200 px-4 py-2.5">
            <p className="font-mono text-[10px] text-ink-muted/80">
              Rameelo collects ticket revenue and settles it to you on request. Funds become available {SETTLEMENT_HOLD_DAYS} days after each sale; refunded, disputed, test, and manual/offline orders are excluded.
            </p>
          </div>

          {/* History */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3 bg-ivory border-b border-ivory-200 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Payout History</p>
              <span className="font-mono text-[10px] text-ink-muted">{requests.length} request{requests.length !== 1 ? "s" : ""}</span>
            </div>
            {requests.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-2xl mb-2">🏦</p>
                <p className="font-ui text-sm text-ink-muted">No payout requests yet.</p>
                <p className="font-ui text-xs text-ink-muted/70 mt-1">When you have settled funds, request a payout above.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <table className="w-full hidden sm:table">
                  <thead>
                    <tr className="border-b border-ivory-200">
                      {["Request Date", "Amount", "Status", "Notes"].map((h, i) => (
                        <th key={h} className={`px-5 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted ${i === 1 ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ivory-200">
                    {requests.map(r => (
                      <tr key={r.id}>
                        <td className="px-5 py-3 font-mono text-xs text-ink-muted whitespace-nowrap">{fmtDate(r.created_at)}</td>
                        <td className="px-5 py-3 text-right font-display font-bold text-ink text-sm">${money(r.amount)}</td>
                        <td className="px-5 py-3"><span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${PAYOUT_PILL[r.status].cls}`}>{PAYOUT_PILL[r.status].label}</span></td>
                        <td className="px-5 py-3 font-ui text-xs text-ink-muted max-w-[260px]">
                          {r.status === "rejected" && r.admin_notes ? <span className="text-durga">{r.admin_notes}</span>
                            : r.status === "paid" && r.payment_reference ? <span>Ref: <span className="font-mono">{r.payment_reference}</span></span>
                            : r.organizer_notes || <span className="text-ink-muted/40">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-ivory-200">
                  {requests.map(r => (
                    <div key={r.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display font-bold text-ink">${money(r.amount)}</p>
                        <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${PAYOUT_PILL[r.status].cls}`}>{PAYOUT_PILL[r.status].label}</span>
                      </div>
                      <p className="font-mono text-[10px] text-ink-muted mt-0.5">{fmtDate(r.created_at)}</p>
                      {(r.organizer_notes || r.admin_notes || r.payment_reference) && (
                        <p className="font-ui text-xs text-ink-muted mt-1">
                          {r.status === "rejected" && r.admin_notes ? <span className="text-durga">{r.admin_notes}</span>
                            : r.status === "paid" && r.payment_reference ? <>Ref: <span className="font-mono">{r.payment_reference}</span></>
                            : r.organizer_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <p className="font-mono text-[10px] text-ink-muted/60 text-center">
            Questions about a payout? <Link href="/organizer/financials" className="text-aubergine hover:underline">See your earnings breakdown</Link>.
          </p>
        </>
      )}

      {/* Request modal */}
      {showRequest && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowRequest(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-ivory-200 flex items-center justify-between">
              <p className="font-display font-bold text-ink text-base" style={{ letterSpacing: "-0.015em" }}>Request a payout</p>
              <button onClick={() => setShowRequest(false)} className="w-8 h-8 rounded-xl border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="rounded-xl bg-peacock/[0.06] border border-peacock/20 px-4 py-3 flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Available for payout</span>
                <span className="font-display font-bold text-peacock text-lg">${money(balance.availableForPayout)}</span>
              </div>
              <div>
                <label className="font-mono text-[9px] uppercase tracking-widest text-ink-muted block mb-1.5">Amount to request</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-display font-bold text-ink-muted">$</span>
                  <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="0.00"
                    className="w-full rounded-xl border border-ivory-200 pl-8 pr-3.5 py-2.5 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40" />
                </div>
                <button type="button" onClick={() => setAmount(String(balance.availableForPayout))} className="font-ui text-xs text-aubergine hover:underline mt-1.5">Request full balance</button>
              </div>
              <div>
                <label className="font-mono text-[9px] uppercase tracking-widest text-ink-muted block mb-1.5">Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Anything our team should know…"
                  className="w-full rounded-xl border border-ivory-200 px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 resize-none" />
              </div>
              {error && <p className="font-ui text-xs text-durga">{error}</p>}
            </div>
            <div className="px-5 py-4 bg-ivory border-t border-ivory-200 flex gap-2">
              <button onClick={() => setShowRequest(false)} className="px-4 py-2.5 rounded-xl border border-ivory-200 font-ui font-semibold text-sm text-ink-muted hover:text-ink transition-colors">Cancel</button>
              <button onClick={submitRequest} disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Submit request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
