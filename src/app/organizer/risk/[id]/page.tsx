"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { computeRisk, RISK_INDICATORS, RISK_BADGE, type RiskProfile } from "@/lib/risk";
import { TERMS_TEXT, TERMS_VERSION } from "@/lib/terms";
import {
  downloadEvidencePackage, downloadScanHistory, downloadReceipt, downloadTimeline, downloadTermsAcceptance,
  type EvidenceData,
} from "@/lib/evidence";

// ── Types ─────────────────────────────────────────────────────────────────────
type Order = Record<string, unknown> & {
  id: string; user_id: string | null; buyer_name: string; buyer_email: string; buyer_phone: string | null;
  qty: number; unit_price: number; discount_amount: number; rameelo_fee: number; processing_fee: number;
  grand_total: number; status: string; payment_method: string; group_id: string | null; created_at: string;
  checked_in_count: number; checked_in_at: string | null; purchase_ip: string | null;
  first_viewed_at: string | null; last_viewed_at: string | null; wallet_generated_at: string | null;
  wallet_downloaded_at: string | null; confirmation_email_sent_at: string | null; failed_payment_attempts: number;
  terms_version: string | null; terms_accepted_at: string | null; terms_accepted_ip: string | null;
  dispute_status: string; disputed_at: string | null; event_id: string;
  events: { id: string; title: string; start_date: string; start_time: string | null; venue_name: string | null; city: string | null; state: string | null } | null;
  ticket_tiers: { name: string; price: number } | null;
};
type Transfer = { to_email: string | null; to_name: string | null; status: string; qty: number; created_at: string; accepted_at: string | null };

const DISPUTE_PILL: Record<string, { label: string; cls: string }> = {
  none: { label: "No dispute", cls: "bg-ivory-200 text-ink-muted" },
  open: { label: "Open dispute", cls: "bg-marigold/20 text-[#a06b00]" },
  won:  { label: "Dispute won", cls: "bg-peacock/15 text-peacock" },
  lost: { label: "Dispute lost", cls: "bg-durga/15 text-durga" },
};

function receiptNum(id: string) { return "RM-" + id.replace(/-/g, "").slice(0, 10).toUpperCase(); }
function money(n: number) { return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function ts(s: string | null) { return s ? new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—"; }
function fmtEventDate(d: string, t: string | null) {
  const base = new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  if (!t) return base; const [h, m] = t.split(":").map(Number); return `${base} · ${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ivory-200 last:border-0">
      <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted shrink-0 pt-0.5">{label}</span>
      <span className="font-ui text-sm text-ink text-right min-w-0 break-words">{value}</span>
    </div>
  );
}
function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
      <div className="px-5 py-3 bg-ivory border-b border-ivory-200 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">{title}</p>{action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export default function RiskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [profile, setProfile] = useState<RiskProfile>(null);
  const [profileCity, setProfileCity] = useState<{ city: string | null; state: string | null }>({ city: null, state: null });
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [sameIp, setSameIp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("orders")
        .select(`id, user_id, buyer_name, buyer_email, buyer_phone, qty, unit_price, discount_amount, rameelo_fee, processing_fee, grand_total, status, payment_method, group_id, created_at, checked_in_count, checked_in_at, purchase_ip, first_viewed_at, last_viewed_at, wallet_generated_at, wallet_downloaded_at, confirmation_email_sent_at, failed_payment_attempts, terms_version, terms_accepted_at, terms_accepted_ip, dispute_status, disputed_at, event_id, events (id, title, start_date, start_time, venue_name, city, state), ticket_tiers (name, price)`)
        .eq("id", id).single();
      if (!data) { router.replace("/organizer/risk"); return; }
      const ord = data as unknown as Order;
      setOrder(ord);

      if (ord.user_id) {
        const { data: prof } = await supabase.from("profiles").select("created_at, last_login_at, total_logins, city, state").eq("id", ord.user_id).single();
        if (prof) { setProfile({ created_at: prof.created_at, last_login_at: prof.last_login_at, total_logins: prof.total_logins }); setProfileCity({ city: prof.city, state: prof.state }); }
      }
      const { data: tr } = await supabase.from("ticket_transfers").select("to_email, to_name, status, qty, created_at, accepted_at").eq("order_id", id).order("created_at", { ascending: true });
      setTransfers((tr ?? []) as Transfer[]);

      if (ord.purchase_ip) {
        const { data: ipRows } = await supabase.from("orders").select("user_id, buyer_email").eq("purchase_ip", ord.purchase_ip).eq("is_test", false);
        const accts = new Set((ipRows ?? []).map((r: { user_id: string | null; buyer_email: string }) => r.user_id ?? r.buyer_email));
        setSameIp(accts.size);
      }
      setLoading(false);
    }
    load();
  }, [id, router]);

  const risk = useMemo(() => {
    if (!order) return null;
    const today = new Date().toISOString().slice(0, 10);
    return computeRisk({
      order: {
        id: order.id, user_id: order.user_id, created_at: order.created_at, purchase_ip: order.purchase_ip,
        first_viewed_at: order.first_viewed_at, wallet_generated_at: order.wallet_generated_at,
        checked_in_count: order.checked_in_count ?? 0, failed_payment_attempts: order.failed_payment_attempts ?? 0,
      },
      profile, eventPassed: !!order.events && order.events.start_date < today,
      sameIpAccounts: sameIp, samePaymentAccounts: 0,
    });
  }, [order, profile, sameIp]);

  const timeline = useMemo(() => {
    if (!order) return [];
    const items: { ts: string; label: string }[] = [];
    if (profile?.created_at) items.push({ ts: profile.created_at, label: "Account created" });
    items.push({ ts: order.created_at, label: `Order placed (${receiptNum(order.id)})` });
    if (order.confirmation_email_sent_at) items.push({ ts: order.confirmation_email_sent_at, label: "Order confirmation email sent" });
    if (order.first_viewed_at) items.push({ ts: order.first_viewed_at, label: "Ticket first viewed in portal" });
    if (order.last_viewed_at && order.last_viewed_at !== order.first_viewed_at) items.push({ ts: order.last_viewed_at, label: "Ticket last viewed" });
    if (order.wallet_generated_at) items.push({ ts: order.wallet_generated_at, label: "Apple Wallet pass generated" });
    if (order.wallet_downloaded_at) items.push({ ts: order.wallet_downloaded_at, label: "Apple Wallet pass downloaded" });
    if (profile?.last_login_at) items.push({ ts: profile.last_login_at, label: `Last login activity${profile.total_logins ? ` (${profile.total_logins} logins total)` : ""}` });
    for (const t of transfers) {
      items.push({ ts: t.created_at, label: `Ticket transfer sent to ${t.to_name || t.to_email || "recipient"}` });
      if (t.accepted_at) items.push({ ts: t.accepted_at, label: `Transfer accepted by ${t.to_name || t.to_email || "recipient"}` });
    }
    if (order.checked_in_count > 0 && order.checked_in_at) items.push({ ts: order.checked_in_at, label: `Checked in at event (${order.checked_in_count} ticket${order.checked_in_count !== 1 ? "s" : ""})` });
    return items.sort((a, b) => a.ts.localeCompare(b.ts));
  }, [order, profile, transfers]);

  function evidence(): EvidenceData {
    const o = order!;
    return {
      receipt: receiptNum(o.id), generatedAt: new Date().toISOString(),
      customer: { name: o.buyer_name, email: o.buyer_email, phone: o.buyer_phone, account: o.user_id ? "Rameelo member" : "Guest checkout", city: profileCity.city, state: profileCity.state, memberSince: profile?.created_at ?? null },
      order: { id: o.id, placedAt: o.created_at, status: o.status, qty: o.qty, tierName: o.ticket_tiers?.name ?? "Ticket", groupId: o.group_id },
      event: { title: o.events?.title ?? "Event", date: o.events ? new Date(o.events.start_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "—", time: o.events?.start_time ?? null, venue: o.events?.venue_name ?? null, city: o.events?.city ?? null, state: o.events?.state ?? null },
      payment: { method: o.payment_method, unitPrice: Number(o.unit_price), discount: Number(o.discount_amount), rameeloFee: Number(o.rameelo_fee), processingFee: Number(o.processing_fee), total: Number(o.grand_total) },
      ticket: { qrPayload: `RAMEELO:${o.id}`, checkedIn: o.checked_in_count ?? 0, checkedInAt: o.checked_in_at, firstViewedAt: o.first_viewed_at, lastViewedAt: o.last_viewed_at, walletGeneratedAt: o.wallet_generated_at, walletDownloadedAt: o.wallet_downloaded_at },
      login: { lastLoginAt: profile?.last_login_at ?? null, totalLogins: profile?.total_logins ?? null, confirmationEmailAt: o.confirmation_email_sent_at },
      ip: { purchase: o.purchase_ip, termsAccepted: o.terms_accepted_ip },
      terms: { version: o.terms_version, acceptedAt: o.terms_accepted_at, acceptedIp: o.terms_accepted_ip, text: TERMS_TEXT },
      transfers: transfers.map(t => ({ to: t.to_name || t.to_email || "recipient", status: t.status, qty: t.qty, sentAt: t.created_at, acceptedAt: t.accepted_at })),
      timeline,
    };
  }

  async function setDispute(status: string) {
    if (!order) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("set_order_dispute", { p_order_id: order.id, p_status: status });
    if (!error) setOrder({ ...order, dispute_status: status, disputed_at: status === "none" ? null : (order.disputed_at ?? new Date().toISOString()) });
    setBusy(false);
  }

  async function genPackage() { setGenBusy(true); try { await downloadEvidencePackage(evidence()); } finally { setGenBusy(false); } }

  if (loading || !order || !risk) {
    return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" /></div>;
  }

  const triggeredIds = new Set(risk.triggered.map(t => t.id));
  const dp = DISPUTE_PILL[order.dispute_status] ?? DISPUTE_PILL.none;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs">
        <Link href="/organizer/risk" className="font-ui text-ink-muted hover:text-ink flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>Risk &amp; Disputes</Link>
        <span className="text-ink-muted/40">/</span><span className="font-mono text-ink-muted truncate">{receiptNum(order.id)}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-ivory-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${RISK_BADGE[risk.level]}`}>{risk.level} risk · {risk.score}/100</span>
              <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${dp.cls}`}>{dp.label}</span>
            </div>
            <p className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>{receiptNum(order.id)}</p>
            <p className="font-ui text-sm text-ink-muted mt-0.5">
              <Link href={`/organizer/tickets/${order.id}`} className="text-aubergine hover:underline">{order.buyer_name}</Link> · {order.events?.title} · {order.qty} ticket{order.qty !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Amount</p>
            <p className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>{money(Number(order.grand_total))}</p>
          </div>
        </div>
      </div>

      {/* Evidence package */}
      <div className="rounded-2xl border-2 border-aubergine/20 bg-aubergine/[0.03] p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="font-display font-bold text-ink text-base" style={{ letterSpacing: "-0.01em" }}>Chargeback evidence</p>
            <p className="font-ui text-xs text-ink-muted mt-0.5 max-w-md">Generate a bank-ready PDF documenting the purchase, ticket access, scans, timeline, IP, and accepted terms — everything you need to win a dispute.</p>
          </div>
          <button onClick={genPackage} disabled={genBusy}
            className="shrink-0 inline-flex items-center gap-2 bg-aubergine text-white font-display font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-aubergine-light transition-colors disabled:opacity-60">
            {genBusy ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
            Generate Evidence Package
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-aubergine/10">
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted self-center mr-1">Individual docs:</span>
          {[
            { label: "Scan history", fn: () => downloadScanHistory(evidence()) },
            { label: "Order receipt", fn: () => downloadReceipt(evidence()) },
            { label: "Customer timeline", fn: () => downloadTimeline(evidence()) },
            { label: "Terms acceptance", fn: () => downloadTermsAcceptance(evidence()) },
          ].map(b => (
            <button key={b.label} onClick={b.fn} className="inline-flex items-center gap-1.5 font-ui font-semibold text-xs px-3 py-1.5 rounded-lg border border-ivory-200 bg-white text-ink hover:border-aubergine/30 hover:text-aubergine transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dispute controls */}
      <Card title="Dispute status">
        <p className="font-ui text-sm text-ink mb-3">Current: <span className="font-semibold">{dp.label}</span>{order.disputed_at ? <span className="text-ink-muted"> · since {ts(order.disputed_at)}</span> : ""}</p>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "open", label: "Open dispute", cls: "bg-marigold/15 text-marigold-dark border-marigold/30" },
            { key: "won", label: "Mark won", cls: "bg-peacock/10 text-peacock border-peacock/30" },
            { key: "lost", label: "Mark lost", cls: "bg-durga/10 text-durga border-durga/30" },
            { key: "none", label: "Clear", cls: "bg-white text-ink-muted border-ivory-200" },
          ].map(b => (
            <button key={b.key} onClick={() => setDispute(b.key)} disabled={busy || order.dispute_status === b.key}
              className={`px-3.5 py-2 rounded-xl border-2 font-ui font-semibold text-xs transition-all disabled:opacity-40 ${b.cls}`}>
              {b.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Risk indicators */}
      <Card title={`Risk indicators · ${risk.triggered.length} triggered`}>
        <div className="space-y-2">
          {RISK_INDICATORS.map(ind => {
            const hit = triggeredIds.has(ind.id);
            return (
              <div key={ind.id} className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 ${hit ? "border-durga/25 bg-durga/[0.04]" : "border-ivory-200 bg-white"}`}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${hit ? "bg-durga/12 text-durga" : "bg-ivory text-ink-muted"}`}>
                  {hit ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z" /></svg>
                    : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-ui text-sm font-semibold ${hit ? "text-ink" : "text-ink-muted"}`}>{ind.label}</p>
                    {hit && <span className="font-mono text-[9px] font-bold text-durga shrink-0">+{ind.weight}</span>}
                  </div>
                  <p className="font-ui text-[11px] text-ink-muted/80 leading-snug mt-0.5">{ind.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Order + customer */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card title="Customer Information">
          <p className="font-display font-bold text-ink text-sm mb-1">{order.buyer_name}</p>
          <Field label="Email" value={order.buyer_email} />
          <Field label="Phone" value={order.buyer_phone || "—"} />
          <Field label="Account" value={order.user_id ? "Rameelo member" : "Guest checkout"} />
          {profile?.created_at && <Field label="Member since" value={ts(profile.created_at)} />}
          <Field label="Location" value={[profileCity.city, profileCity.state].filter(Boolean).join(", ") || "—"} />
        </Card>
        <Card title="Order & Payment">
          <Field label="Placed" value={ts(order.created_at)} />
          <Field label="Event" value={order.events ? fmtEventDate(order.events.start_date, order.events.start_time) : "—"} />
          <Field label="Tickets" value={`${order.qty} × ${order.ticket_tiers?.name ?? "Ticket"}`} />
          <Field label="Method" value={(order.payment_method || "—").toUpperCase()} />
          <Field label="Total" value={money(Number(order.grand_total))} />
          {order.failed_payment_attempts > 0 && <Field label="Failed attempts" value={String(order.failed_payment_attempts)} />}
        </Card>
      </div>

      {/* Ticket access + IP + terms */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card title="Ticket Access History">
          <Field label="First viewed" value={ts(order.first_viewed_at)} />
          <Field label="Last viewed" value={ts(order.last_viewed_at)} />
          <Field label="Wallet generated" value={ts(order.wallet_generated_at)} />
          <Field label="Wallet downloaded" value={ts(order.wallet_downloaded_at)} />
          <Field label="Checked in" value={order.checked_in_count > 0 ? `${order.checked_in_count} of ${order.qty} · ${ts(order.checked_in_at)}` : "Not scanned"} />
        </Card>
        <Card title="IP & Terms">
          <Field label="Purchase IP" value={order.purchase_ip || "Not captured"} />
          <Field label="Accounts on IP" value={order.purchase_ip ? `${sameIp}` : "—"} />
          <Field label="Terms version" value={order.terms_version || <span className="text-ink-muted">Legacy (pre-terms)</span>} />
          <Field label="Terms accepted" value={ts(order.terms_accepted_at)} />
          <Field label="Accepted from IP" value={order.terms_accepted_ip || "—"} />
        </Card>
      </div>

      {/* Customer activity timeline */}
      <Card title="Customer Activity Timeline">
        {timeline.length === 0 ? (
          <p className="font-ui text-sm text-ink-muted text-center py-4">No tracked activity yet.</p>
        ) : (
          <div className="relative pl-4">
            <div className="absolute left-[5px] top-1 bottom-1 w-px bg-ivory-200" />
            <div className="space-y-3.5">
              {timeline.map((e, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-aubergine border-2 border-white" />
                  <p className="font-ui text-sm text-ink leading-tight">{e.label}</p>
                  <p className="font-mono text-[10px] text-ink-muted mt-0.5">{ts(e.ts)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <p className="font-mono text-[10px] text-ink-muted/60 text-center">Risk model {RISK_INDICATORS.length} indicators · terms {TERMS_VERSION} · order {order.id}</p>
    </div>
  );
}
