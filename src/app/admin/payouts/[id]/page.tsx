"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { computeBalance, money, PAYOUT_PILL, type BalanceOrder, type PayoutStatus } from "@/lib/payouts";

type Req = {
  id: string; org_id: string | null; requested_by: string; amount: number; status: PayoutStatus;
  organizer_notes: string | null; admin_notes: string | null; payment_reference: string | null;
  created_at: string; approved_at: string | null; paid_at: string | null;
  organizations: { name: string } | null;
};

function ts(s: string | null) { return s ? new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—"; }

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ivory-200 last:border-0">
      <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted shrink-0 pt-0.5">{label}</span>
      <span className="font-ui text-sm text-ink text-right min-w-0 break-words">{value}</span>
    </div>
  );
}

export default function AdminPayoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [req, setReq] = useState<Req | null>(null);
  const [orgName, setOrgName] = useState("Organizer");
  const [totals, setTotals] = useState({ totalRevenue: 0, totalPaidOut: 0, available: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // action inputs
  const [rejectNote, setRejectNote] = useState("");
  const [payRef, setPayRef] = useState("");
  const [mode, setMode] = useState<"reject" | "paid" | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("payout_requests")
      .select("id, org_id, requested_by, amount, status, organizer_notes, admin_notes, payment_reference, created_at, approved_at, paid_at, organizations(name)")
      .eq("id", id).single();
    if (!data) { router.replace("/admin/payouts"); return; }
    const r = data as unknown as Req;
    setReq(r);

    if (r.organizations?.name) setOrgName(r.organizations.name);
    else {
      const { data: prof } = await supabase.from("profiles").select("first_name, last_name, email").eq("id", r.requested_by).single();
      if (prof) setOrgName([prof.first_name, prof.last_name].filter(Boolean).join(" ") || prof.email || "Organizer");
    }

    // Balance for this org/requester
    const evQ = supabase.from("events").select("id");
    const { data: evs } = await (r.org_id ? evQ.eq("org_id", r.org_id) : evQ.eq("organizer_id", r.requested_by));
    const eventIds = (evs ?? []).map((e: { id: string }) => e.id);
    let ords: BalanceOrder[] = [];
    if (eventIds.length) {
      const { data: od } = await supabase.from("orders").select("created_at, qty, unit_price, discount_amount, status, dispute_status, order_type").in("event_id", eventIds).eq("is_test", false);
      ords = (od ?? []) as BalanceOrder[];
    }
    let reqQ = supabase.from("payout_requests").select("amount, status");
    reqQ = r.org_id ? reqQ.eq("org_id", r.org_id) : reqQ.eq("requested_by", r.requested_by);
    const { data: allReqs } = await reqQ;
    const bal = computeBalance(ords, (allReqs ?? []) as { amount: number; status: PayoutStatus }[]);
    setTotals({ totalRevenue: bal.totalRevenue, totalPaidOut: bal.totalPaidOut, available: bal.availableForPayout });
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function act(status: PayoutStatus, opts?: { adminNote?: string; ref?: string }) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_update_payout", {
      p_id: id, p_status: status, p_admin_notes: opts?.adminNote ?? null, p_payment_reference: opts?.ref ?? null,
    });
    setBusy(false);
    if (!error) { setMode(null); setRejectNote(""); setPayRef(""); load(); }
  }

  if (loading || !req) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" /></div>;

  const pill = PAYOUT_PILL[req.status];
  const canApprove = req.status === "submitted";
  const canReject = req.status === "submitted" || req.status === "approved";
  const canPay = req.status === "approved" || req.status === "submitted";

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-2 text-xs">
        <Link href="/admin/payouts" className="font-ui text-ink-muted hover:text-ink flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>Payout Management</Link>
        <span className="text-ink-muted/40">/</span><span className="font-ui text-ink-muted truncate">{orgName}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-ivory-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${pill.cls}`}>{pill.label}</span>
            <p className="font-display font-bold text-ink text-xl mt-1.5" style={{ letterSpacing: "-0.02em" }}>{orgName}</p>
            <p className="font-ui text-sm text-ink-muted mt-0.5">Requested {ts(req.created_at)}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Requested amount</p>
            <p className="font-display font-bold text-ink text-3xl" style={{ letterSpacing: "-0.03em" }}>${money(req.amount)}</p>
          </div>
        </div>
      </div>

      {/* Context */}
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="px-5 py-3 bg-ivory border-b border-ivory-200"><p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Request details</p></div>
        <div className="px-5 py-4">
          <Field label="Organization" value={orgName} />
          <Field label="Requested amount" value={`$${money(req.amount)}`} />
          <Field label="Available balance" value={<span className={req.amount > totals.available ? "text-durga font-semibold" : ""}>${money(totals.available)}</span>} />
          <Field label="Total revenue" value={`$${money(totals.totalRevenue)}`} />
          <Field label="Total paid out" value={`$${money(totals.totalPaidOut)}`} />
          <Field label="Organizer notes" value={req.organizer_notes || <span className="text-ink-muted/50">None</span>} />
          {req.admin_notes && <Field label="Admin notes" value={req.admin_notes} />}
          {req.payment_reference && <Field label="Payment reference" value={<span className="font-mono">{req.payment_reference}</span>} />}
          {req.approved_at && <Field label="Reviewed at" value={ts(req.approved_at)} />}
          {req.paid_at && <Field label="Paid at" value={ts(req.paid_at)} />}
        </div>
      </div>

      {req.amount > totals.available && req.status === "submitted" && (
        <div className="rounded-xl bg-durga/8 border border-durga/20 px-4 py-2.5">
          <p className="font-ui text-xs text-durga">⚠ Requested amount exceeds the current available balance (${money(totals.available)}). Review before approving.</p>
        </div>
      )}

      {/* Actions */}
      {req.status !== "paid" && req.status !== "rejected" && (
        <div className="bg-white rounded-2xl border border-ivory-200 p-5">
          <p className="font-display font-bold text-ink text-sm mb-3" style={{ letterSpacing: "-0.01em" }}>Actions</p>

          {mode === null && (
            <div className="flex flex-wrap gap-2">
              {canApprove && (
                <button onClick={() => act("approved")} disabled={busy}
                  className="px-4 py-2.5 rounded-xl bg-peacock text-white font-display font-bold text-sm hover:bg-peacock/90 transition-colors disabled:opacity-50">Approve</button>
              )}
              {canReject && (
                <button onClick={() => setMode("reject")} disabled={busy}
                  className="px-4 py-2.5 rounded-xl border-2 border-durga/30 text-durga font-display font-bold text-sm hover:bg-durga/5 transition-colors disabled:opacity-50">Reject</button>
              )}
              {canPay && (
                <button onClick={() => setMode("paid")} disabled={busy}
                  className="px-4 py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-colors disabled:opacity-50">Mark as Paid</button>
              )}
            </div>
          )}

          {mode === "reject" && (
            <div className="space-y-3">
              <label className="font-mono text-[9px] uppercase tracking-widest text-ink-muted block">Reason (optional, shown to organizer)</label>
              <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3} placeholder="Why is this request being rejected?"
                className="w-full rounded-xl border border-ivory-200 px-3.5 py-2.5 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-durga/20 resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setMode(null)} className="px-4 py-2.5 rounded-xl border border-ivory-200 font-ui font-semibold text-sm text-ink-muted">Cancel</button>
                <button onClick={() => act("rejected", { adminNote: rejectNote.trim() || undefined })} disabled={busy}
                  className="flex-1 py-2.5 rounded-xl bg-durga text-white font-display font-bold text-sm hover:bg-durga/90 transition-colors disabled:opacity-50">Confirm rejection</button>
              </div>
            </div>
          )}

          {mode === "paid" && (
            <div className="space-y-3">
              <label className="font-mono text-[9px] uppercase tracking-widest text-ink-muted block">Payment reference (optional)</label>
              <input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Bank confirmation / wire number"
                className="w-full rounded-xl border border-ivory-200 px-3.5 py-2.5 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/20" />
              <p className="font-mono text-[10px] text-ink-muted/70">Mark as paid only after funds have been transferred outside the platform.</p>
              <div className="flex gap-2">
                <button onClick={() => setMode(null)} className="px-4 py-2.5 rounded-xl border border-ivory-200 font-ui font-semibold text-sm text-ink-muted">Cancel</button>
                <button onClick={() => act("paid", { ref: payRef.trim() || undefined })} disabled={busy}
                  className="flex-1 py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-colors disabled:opacity-50">Confirm paid</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
