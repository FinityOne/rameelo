"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "../org-context";

// ── Model constants ──────────────────────────────────────────────────────────────
const RESERVE_PCT = 0.20;          // 20% held as chargeback buffer
const PAYABLE_PCT = 1 - RESERVE_PCT; // 80% released per cycle
const RESERVE_HOLD_DAYS = 30;      // reserve releases 30 days after event
const RAMEELO_FEE_PCT = 0.03;      // charged to the BUYER at checkout
const CARD_FEE_PCT = 0.05;         // charged to the BUYER (free with ACH)

type Status = "scheduled" | "processing" | "paid";
type Payout = {
  id: string; title: string; eventDate: string; revenue: number;
  reserve: number; payable: number; tickets: number;
  status: Status; payoutDate: string; reserveReleaseISO: string; reserveReleased: boolean;
};
type ACH = { holder: string; bank: string; routingLast4: string; accountLast4: string; type: string };

// ── Helpers ──────────────────────────────────────────────────────────────────────
function money(n: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n); }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function fmtShort(iso: string) { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function addDays(iso: string, d: number) { return new Date(new Date(iso + "T00:00:00").getTime() + d * 86400000).toISOString(); }

const STATUS_META: Record<Status, { label: string; cls: string; dot: string }> = {
  paid:       { label: "Paid",       cls: "bg-peacock/12 text-peacock",    dot: "bg-peacock" },
  processing: { label: "In transit", cls: "bg-marigold/15 text-[#a06b00]", dot: "bg-marigold" },
  scheduled:  { label: "Scheduled",  cls: "bg-aubergine/10 text-aubergine", dot: "bg-aubergine/50" },
};

// ── Page ───────────────────────────────────────────────────────────────────────
export default function EarningsPayoutsPage() {
  const { activeOrg } = useOrg();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [selected, setSelected] = useState<Payout | null>(null);

  // ACH (basic, masked-only persistence — never store full account numbers)
  const achKey = useMemo(() => `rameelo_ach_${activeOrg?.id ?? "me"}`, [activeOrg]);
  const [ach, setAch] = useState<ACH | null>(null);
  const [achForm, setAchForm] = useState(false);
  useEffect(() => { try { setAch(JSON.parse(localStorage.getItem(achKey) ?? "null")); } catch { setAch(null); } }, [achKey]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const evQuery = supabase.from("events").select("id, title, start_date");
      const { data: evs } = await (activeOrg ? evQuery.eq("org_id", activeOrg.id) : evQuery.eq("organizer_id", user.id));
      const events = (evs ?? []) as { id: string; title: string; start_date: string }[];
      if (events.length === 0) { setPayouts([]); setLoading(false); return; }

      const { data: orders } = await supabase
        .from("orders")
        .select("event_id, qty, unit_price, discount_amount, status")
        .in("event_id", events.map(e => e.id))
        .eq("is_test", false);

      // Organizer ticket revenue = face value after discount (platform fees are on the buyer)
      const revByEvent = new Map<string, { rev: number; tix: number }>();
      for (const o of (orders ?? []) as { event_id: string; qty: number; unit_price: number; discount_amount: number; status: string }[]) {
        if (o.status === "refunded" || o.status === "cancelled") continue;
        const rev = o.qty * Number(o.unit_price) - Number(o.discount_amount);
        const cur = revByEvent.get(o.event_id) ?? { rev: 0, tix: 0 };
        cur.rev += rev; cur.tix += o.qty;
        revByEvent.set(o.event_id, cur);
      }

      const today = new Date().toISOString().slice(0, 10);
      const list: Payout[] = [];
      for (const e of events) {
        const agg = revByEvent.get(e.id);
        if (!agg || agg.rev <= 0) continue;
        const reserve = Math.round(agg.rev * RESERVE_PCT * 100) / 100;
        const payable = Math.round(agg.rev * PAYABLE_PCT * 100) / 100;
        const happened = e.start_date <= today;
        const daysSince = (Date.now() - new Date(e.start_date + "T00:00:00").getTime()) / 86400000;
        const status: Status = !happened ? "scheduled" : daysSince <= 7 ? "processing" : "paid";
        const reserveReleaseISO = addDays(e.start_date, RESERVE_HOLD_DAYS);
        list.push({
          id: e.id, title: e.title, eventDate: e.start_date, revenue: agg.rev, reserve, payable, tickets: agg.tix,
          status, payoutDate: addDays(e.start_date, 3), reserveReleaseISO,
          reserveReleased: new Date(reserveReleaseISO) <= new Date(),
        });
      }
      setPayouts(list);
      setLoading(false);
    }
    load();
  }, [activeOrg]);

  // ── Earnings + balance buckets ──
  const stats = useMemo(() => {
    let availableNow = 0, reserveHeld = 0, pendingUpcoming = 0, gross = 0, tickets = 0, paidToDate = 0;
    for (const p of payouts) {
      gross += p.revenue; tickets += p.tickets;
      if (p.status === "scheduled") {
        pendingUpcoming += p.revenue;
      } else {
        availableNow += p.payable + (p.reserveReleased ? p.reserve : 0);
        if (!p.reserveReleased) reserveHeld += p.reserve;
        if (p.status === "paid") paidToDate += p.reserveReleased ? p.revenue : p.payable;
      }
    }
    return { availableNow, reserveHeld, pendingUpcoming, gross, tickets, paidToDate, events: payouts.length };
  }, [payouts]);

  const upcoming = useMemo(() => payouts.filter(p => p.status !== "paid").sort((a, b) => a.eventDate.localeCompare(b.eventDate)), [payouts]);
  const history = useMemo(() => {
    const list = payouts.filter(p => p.status !== "scheduled").sort((a, b) => b.eventDate.localeCompare(a.eventDate));
    return filter === "all" ? list : list.filter(p => p.status === filter);
  }, [payouts, filter]);

  function saveAch(form: { holder: string; routing: string; account: string; type: string }) {
    const rec: ACH = { holder: form.holder.trim(), bank: "Bank account", routingLast4: form.routing.slice(-4), accountLast4: form.account.slice(-4), type: form.type };
    setAch(rec); setAchForm(false);
    try { localStorage.setItem(achKey, JSON.stringify(rec)); } catch { /* ignore */ }
  }
  function removeAch() { setAch(null); try { localStorage.removeItem(achKey); } catch { /* ignore */ } }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px]"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {payouts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-marigold/10 border border-marigold/20 flex items-center justify-center mx-auto mb-4 text-3xl">💵</div>
          <p className="font-display font-semibold text-ink text-xl mb-2" style={{ letterSpacing: "-0.015em" }}>No earnings yet</p>
          <p className="font-ui text-ink-muted text-sm max-w-xs mx-auto mb-6">As your events sell tickets, your earnings, balance, and payout schedule appear here.</p>
          <Link href="/organizer/events" className="inline-flex items-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-marigold-dark transition-colors shadow-sm">View my events →</Link>
        </div>
      ) : (
        <>
          {/* ── Earnings snapshot ── */}
          <section className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted px-1">Earnings</p>
            <div className="bg-white rounded-2xl border border-ivory-200 p-5 sm:p-6">
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Gross earned · lifetime</p>
                  <p className="font-display font-bold text-ink" style={{ fontSize: 40, letterSpacing: "-0.03em", lineHeight: 1.05 }}>{money(stats.gross)}</p>
                  <p className="font-mono text-[10px] text-ink-muted mt-1">Full ticket face value — platform fees are paid by buyers</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right">
                  {[
                    { label: "Tickets", value: stats.tickets.toLocaleString() },
                    { label: "Events", value: stats.events.toLocaleString() },
                    { label: "Avg / event", value: money(stats.events ? stats.gross / stats.events : 0) },
                  ].map(s => (
                    <div key={s.label}>
                      <p className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Connection banner */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${ach ? "bg-peacock/8 border-peacock/20" : "bg-marigold/10 border-marigold/20"}`}>
            <svg className={`w-4 h-4 shrink-0 ${ach ? "text-peacock" : "text-[#a06b00]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className={`font-mono text-[10px] ${ach ? "text-peacock" : "text-[#a06b00]"}`}>
              {ach ? "Payout account connected. Balances reflect your real ticket sales." : "Connect a payout account below to receive transfers. Balances reflect your real ticket sales."}
            </p>
          </div>

          {/* ── Current Balance ── */}
          <section className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted px-1">Current Balance</p>
            <div className="bg-white rounded-2xl border border-ivory-200 p-5 sm:p-6">
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Available to pay out</p>
                  <p className="font-display font-bold text-peacock" style={{ fontSize: 40, letterSpacing: "-0.03em", lineHeight: 1.05 }}>{money(stats.availableNow)}</p>
                  <p className="font-mono text-[10px] text-ink-muted mt-1">80% of past-event revenue + released reserves</p>
                </div>
                <button
                  disabled={!ach || stats.availableNow <= 0}
                  className="px-5 py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-colors disabled:opacity-50 shrink-0"
                  title={!ach ? "Connect a payout account first" : ""}
                >
                  Withdraw
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Reserve held", value: money(stats.reserveHeld), hint: "20% · releases 30d post-event" },
                { label: "Pending (upcoming)", value: money(stats.pendingUpcoming), hint: "paid after each event" },
                { label: "Paid to date", value: money(stats.paidToDate), hint: "transferred to your bank" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-ivory-200 px-3 sm:px-4 py-3.5">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{s.label}</p>
                  <p className="font-display font-bold text-ink text-base sm:text-xl mt-1" style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
                  <p className="font-mono text-[8px] text-ink-muted/70 mt-0.5 hidden sm:block">{s.hint}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Upcoming Payouts ── */}
          <section className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted px-1">Upcoming Payouts</p>
            <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
              {upcoming.length === 0 ? (
                <p className="font-ui text-sm text-ink-muted text-center py-10">No upcoming payouts. Money from past events is in your available balance.</p>
              ) : (
                <div className="divide-y divide-ivory-200">
                  {upcoming.map(p => {
                    const meta = STATUS_META[p.status];
                    return (
                      <div key={p.id} className="px-5 py-4 flex items-center gap-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.cls}`}><span className={`w-2 h-2 rounded-full ${meta.dot}`} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-ui font-semibold text-ink text-sm truncate">{p.title}</p>
                          <p className="font-mono text-[10px] text-ink-muted mt-0.5">
                            {p.status === "processing" ? `Arriving ~${fmtShort(p.payoutDate)}` : `Pays out ~${fmtShort(p.payoutDate)}`} · {p.tickets} tickets
                          </p>
                        </div>
                        <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-widest shrink-0 ${meta.cls}`}><span className={`w-1 h-1 rounded-full ${meta.dot}`} />{meta.label}</span>
                        <div className="text-right shrink-0">
                          <p className="font-display font-bold text-ink text-base" style={{ letterSpacing: "-0.02em" }}>{money(p.payable)}</p>
                          <p className="font-mono text-[9px] text-ink-muted">+ {money(p.reserve)} reserve</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ── ACH Information ── */}
          <section className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted px-1">ACH Information</p>
            <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
              {ach ? (
                <>
                  <div className="px-5 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-ivory border border-ivory-200 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui font-semibold text-ink text-sm truncate">{ach.holder} · <span className="capitalize font-normal text-ink-muted">{ach.type}</span></p>
                      <p className="font-mono text-xs text-ink-muted mt-0.5">Routing ••••{ach.routingLast4} · Account ••••{ach.accountLast4}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-peacock/10 text-peacock font-mono text-[9px] font-bold uppercase tracking-widest shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-peacock" />Active</span>
                  </div>
                  <div className="px-5 py-3 bg-ivory border-t border-ivory-200 flex items-center justify-between">
                    <p className="font-mono text-[9px] text-ink-muted/70">ACH transfers · no fees · 1–2 business days</p>
                    <button onClick={removeAch} className="font-ui text-xs font-semibold text-durga hover:underline">Remove</button>
                  </div>
                </>
              ) : achForm ? (
                <AchForm onSave={saveAch} onCancel={() => setAchForm(false)} defaultHolder={activeOrg?.name ?? ""} />
              ) : (
                <div className="px-5 py-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-ivory border border-ivory-200 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  </div>
                  <p className="font-display font-bold text-ink text-base mb-1" style={{ letterSpacing: "-0.01em" }}>Connect your bank for ACH payouts</p>
                  <p className="font-ui text-xs text-ink-muted max-w-sm mx-auto mb-4">Direct deposit to your bank account — no transfer fees, arriving in 1–2 business days. Details are masked and stored securely.</p>
                  <button onClick={() => setAchForm(true)} className="inline-flex items-center gap-2 bg-aubergine text-white font-display font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-aubergine-light transition-colors">Add bank account</button>
                </div>
              )}
            </div>
          </section>

          {/* ── Payout History ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Payout History</p>
              <div className="flex items-center gap-1.5">
                {(["all", "processing", "paid"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-widest transition-all ${filter === f ? "bg-aubergine text-white" : "bg-ivory text-ink-muted hover:text-ink"}`}>
                    {f === "processing" ? "In transit" : f}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
              {history.length === 0 ? (
                <p className="font-ui text-sm text-ink-muted text-center py-10">No payouts in this view yet.</p>
              ) : (
                <div className="divide-y divide-ivory-200">
                  {history.map(p => {
                    const meta = STATUS_META[p.status];
                    return (
                      <button key={p.id} onClick={() => setSelected(p)} className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-ivory transition-colors group">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.cls}`}><span className={`w-2 h-2 rounded-full ${meta.dot}`} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-ui font-semibold text-ink text-sm truncate">{p.title}</p>
                          <p className="font-mono text-[10px] text-ink-muted mt-0.5">{fmtShort(p.payoutDate)} · {p.tickets} tickets · {p.reserveReleased ? "reserve released" : `reserve held to ${fmtShort(p.reserveReleaseISO)}`}</p>
                        </div>
                        <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-widest shrink-0 ${meta.cls}`}><span className={`w-1 h-1 rounded-full ${meta.dot}`} />{meta.label}</span>
                        <div className="text-right shrink-0">
                          <p className="font-display font-bold text-base text-peacock" style={{ letterSpacing: "-0.02em" }}>{money(p.reserveReleased ? p.revenue : p.payable)}</p>
                          <p className="font-mono text-[9px] text-ink-muted">{p.reserveReleased ? "100% paid" : "80% paid"}</p>
                        </div>
                        <svg className="w-4 h-4 text-ink-muted/30 group-hover:text-ink-muted transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ── Fee Breakdown ── */}
          <FeeBreakdown />
        </>
      )}

      {selected && <PayoutDetail p={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ── ACH form ──
function AchForm({ onSave, onCancel, defaultHolder }: { onSave: (f: { holder: string; routing: string; account: string; type: string }) => void; onCancel: () => void; defaultHolder: string }) {
  const [holder, setHolder] = useState(defaultHolder);
  const [routing, setRouting] = useState("");
  const [account, setAccount] = useState("");
  const [type, setType] = useState("checking");
  const valid = holder.trim() && /^\d{9}$/.test(routing) && /^\d{4,17}$/.test(account);
  const input = "w-full rounded-xl border border-ivory-200 px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all";
  return (
    <div className="p-5 space-y-3">
      <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>Add bank account (ACH)</p>
      <div>
        <label className="font-mono text-[9px] uppercase tracking-widest text-ink-muted block mb-1.5">Account holder name</label>
        <input value={holder} onChange={e => setHolder(e.target.value)} placeholder="Business or full name" className={input} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-mono text-[9px] uppercase tracking-widest text-ink-muted block mb-1.5">Routing number</label>
          <input value={routing} onChange={e => setRouting(e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="9 digits" inputMode="numeric" className={input} />
        </div>
        <div>
          <label className="font-mono text-[9px] uppercase tracking-widest text-ink-muted block mb-1.5">Account number</label>
          <input value={account} onChange={e => setAccount(e.target.value.replace(/\D/g, "").slice(0, 17))} placeholder="Account #" inputMode="numeric" className={input} />
        </div>
      </div>
      <div>
        <label className="font-mono text-[9px] uppercase tracking-widest text-ink-muted block mb-1.5">Account type</label>
        <div className="flex gap-2">
          {["checking", "savings"].map(t => (
            <button key={t} type="button" onClick={() => setType(t)} className={`flex-1 py-2 rounded-xl border-2 font-ui font-semibold text-xs capitalize transition-all ${type === t ? "border-aubergine bg-aubergine/5 text-aubergine" : "border-ivory-200 text-ink-muted"}`}>{t}</button>
          ))}
        </div>
      </div>
      <p className="font-mono text-[9px] text-ink-muted/70">Only the last 4 digits are stored on this device for display. Full ACH verification happens at transfer time.</p>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="px-4 py-2.5 rounded-xl border border-ivory-200 font-ui font-semibold text-sm text-ink-muted hover:text-ink transition-colors">Cancel</button>
        <button disabled={!valid} onClick={() => onSave({ holder, routing, account, type })} className="flex-1 py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-colors disabled:opacity-50">Save account</button>
      </div>
    </div>
  );
}

// ── Fee breakdown ──
function FeeBreakdown() {
  const ticket = 25;
  const rameelo = +(ticket * RAMEELO_FEE_PCT).toFixed(2);
  const card = +(ticket * CARD_FEE_PCT).toFixed(2);
  const buyerPays = +(ticket + rameelo + card).toFixed(2);
  const payable = +(ticket * PAYABLE_PCT).toFixed(2);
  const reserve = +(ticket * RESERVE_PCT).toFixed(2);
  return (
    <section className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted px-1">Fee Breakdown</p>
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="p-5 space-y-3">
          {[
            { label: "Rameelo platform fee", val: "3%", note: "Charged to the buyer at checkout — never deducted from you.", color: "text-ink-muted" },
            { label: "Card processing", val: "5%", note: "Charged to the buyer. Free when they pay by bank (ACH).", color: "text-ink-muted" },
            { label: "You receive", val: "100%", note: "The full ticket face value is yours.", color: "text-peacock" },
            { label: "Paid out per cycle", val: "80%", note: "Released to your bank on your payout schedule.", color: "text-ink" },
            { label: "Chargeback reserve", val: "20%", note: `Held ${RESERVE_HOLD_DAYS} days after the event, then released — always yours unless a dispute is filed.`, color: "text-[#a06b00]" },
          ].map(r => (
            <div key={r.label} className="flex items-start justify-between gap-4 py-1.5 border-b border-ivory-200 last:border-0">
              <div className="min-w-0">
                <p className="font-ui text-sm font-semibold text-ink">{r.label}</p>
                <p className="font-mono text-[10px] text-ink-muted/80 mt-0.5">{r.note}</p>
              </div>
              <p className={`font-display font-bold text-base shrink-0 ${r.color}`} style={{ letterSpacing: "-0.02em" }}>{r.val}</p>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 bg-ivory border-t border-ivory-200">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2">Example · one ${ticket} ticket</p>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between"><span className="text-ink-muted">Buyer pays (card)</span><span className="text-ink">{money(buyerPays)}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">— Rameelo fee 3% / card 5%</span><span className="text-ink-muted">{money(rameelo + card)}</span></div>
            <div className="flex justify-between border-t border-ivory-200 pt-1"><span className="text-ink font-bold">Your revenue</span><span className="text-ink font-bold">{money(ticket)}</span></div>
            <div className="flex justify-between"><span className="text-peacock">Paid now (80%)</span><span className="text-peacock">{money(payable)}</span></div>
            <div className="flex justify-between"><span className="text-[#a06b00]">Reserve (20%, 30d)</span><span className="text-[#a06b00]">{money(reserve)}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Payout detail modal ──
function PayoutDetail({ p, onClose }: { p: Payout; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-ivory-200 flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Payout breakdown</p>
            <p className="font-display font-semibold text-ink text-sm mt-0.5 truncate max-w-[260px]" style={{ letterSpacing: "-0.015em" }}>{p.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="px-5 py-5 space-y-3">
          {[
            { label: "Ticket revenue", value: money(p.revenue), note: `${p.tickets} tickets · face value`, strong: false },
            { label: "Chargeback reserve (20%)", value: `−${money(p.reserve)}`, note: p.reserveReleased ? "Released — included in payout" : `Held until ${fmtShort(p.reserveReleaseISO)}`, strong: false },
            { label: "Paid out (80%)", value: money(p.payable), note: "Deposited to your bank", strong: true },
          ].map(r => (
            <div key={r.label} className="flex items-start justify-between gap-3">
              <div><p className={`font-ui text-sm ${r.strong ? "font-semibold text-ink" : "text-ink-muted"}`}>{r.label}</p><p className="font-mono text-[9px] text-ink-muted/60 mt-0.5">{r.note}</p></div>
              <p className={`font-display font-bold text-sm shrink-0 ${r.strong ? "text-peacock" : "text-ink"}`} style={{ letterSpacing: "-0.02em" }}>{r.value}</p>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 bg-ivory border-t border-ivory-200 space-y-2">
          {[
            { label: "Event date", value: fmtDate(p.eventDate) },
            { label: "Payout date", value: fmtDate(p.payoutDate) },
            { label: "Reserve release", value: p.reserveReleased ? "Released" : fmtDate(p.reserveReleaseISO) },
          ].map(r => (
            <div key={r.label} className="flex justify-between items-center"><p className="font-mono text-[10px] text-ink-muted uppercase tracking-widest">{r.label}</p><p className="font-mono text-[10px] text-ink font-medium">{r.value}</p></div>
          ))}
        </div>
        <div className="px-5 py-3"><button onClick={onClose} className="w-full py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:bg-aubergine/90 transition-colors">Done</button></div>
      </div>
    </div>
  );
}
