"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "../org-context";
import { orderRevenue, money, type BalanceOrder } from "@/lib/payouts";

const RAMEELO_FEE_PCT = 0.03; // charged to the buyer
const CARD_FEE_PCT = 0.05;    // charged to the buyer (free with ACH)

type EventAgg = { id: string; title: string; revenue: number; tickets: number; orders: number };

function fmtMonth(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", year: "2-digit" }); }

export default function EarningsPage() {
  const { activeOrg } = useOrg();
  const [orders, setOrders] = useState<(BalanceOrder & { event_id: string })[]>([]);
  const [eventTitles, setEventTitles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const evQ = supabase.from("events").select("id, title");
      const { data: evs } = await (activeOrg ? evQ.eq("org_id", activeOrg.id) : evQ.eq("organizer_id", user.id));
      const events = (evs ?? []) as { id: string; title: string }[];
      setEventTitles(new Map(events.map(e => [e.id, e.title])));
      if (events.length === 0) { setOrders([]); setLoading(false); return; }
      const { data } = await supabase
        .from("orders")
        .select("event_id, created_at, qty, unit_price, discount_amount, status, dispute_status")
        .in("event_id", events.map(e => e.id))
        .eq("is_test", false);
      setOrders((data ?? []) as (BalanceOrder & { event_id: string })[]);
      setLoading(false);
    }
    load();
  }, [activeOrg]);

  const confirmed = useMemo(() => orders.filter(o => o.status === "confirmed" && o.dispute_status !== "open" && o.dispute_status !== "lost"), [orders]);
  const revenue = confirmed.reduce((s, o) => s + orderRevenue(o), 0);
  const tickets = confirmed.reduce((s, o) => s + o.qty, 0);

  const byEvent = useMemo(() => {
    const m = new Map<string, EventAgg>();
    for (const o of confirmed) {
      const cur = m.get(o.event_id) ?? { id: o.event_id, title: eventTitles.get(o.event_id) ?? "Event", revenue: 0, tickets: 0, orders: 0 };
      cur.revenue += orderRevenue(o); cur.tickets += o.qty; cur.orders += 1;
      m.set(o.event_id, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue);
  }, [confirmed, eventTitles]);

  const byMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of confirmed) { const k = o.created_at.slice(0, 7); m.set(k, (m.get(k) ?? 0) + orderRevenue(o)); }
    return Array.from(m, ([k, v]) => ({ k, v })).sort((a, b) => a.k.localeCompare(b.k)).slice(-12);
  }, [confirmed]);

  const ticket = 25, rameelo = +(ticket * RAMEELO_FEE_PCT).toFixed(2), card = +(ticket * CARD_FEE_PCT).toFixed(2);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Earnings</h2>
          <p className="font-ui text-ink-muted text-sm mt-0.5">Your ticket revenue at a glance.</p>
        </div>
        <Link href="/organizer/payouts" className="shrink-0 inline-flex items-center gap-2 bg-aubergine text-white font-ui font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-aubergine-light transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          Go to Payouts
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" /></div>
      ) : confirmed.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-marigold/10 border border-marigold/20 flex items-center justify-center mx-auto mb-4 text-3xl">💰</div>
          <p className="font-display font-semibold text-ink text-xl mb-2" style={{ letterSpacing: "-0.015em" }}>No earnings yet</p>
          <p className="font-ui text-ink-muted text-sm max-w-xs mx-auto mb-6">Revenue appears here as your events sell tickets.</p>
          <Link href="/organizer/events" className="inline-flex items-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-marigold-dark transition-colors shadow-sm">View my events →</Link>
        </div>
      ) : (
        <>
          {/* Snapshot */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Gross earned · lifetime</p>
                <p className="font-display font-bold text-ink" style={{ fontSize: 40, letterSpacing: "-0.03em", lineHeight: 1.05 }}>${money(revenue)}</p>
                <p className="font-mono text-[10px] text-ink-muted mt-1">Full ticket face value — platform fees are paid by buyers</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-right">
                {[
                  { label: "Tickets", value: tickets.toLocaleString() },
                  { label: "Events", value: byEvent.length.toLocaleString() },
                  { label: "Avg / event", value: "$" + money(byEvent.length ? revenue / byEvent.length : 0) },
                ].map(s => (
                  <div key={s.label}><p className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.02em" }}>{s.value}</p><p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{s.label}</p></div>
                ))}
              </div>
            </div>
          </div>

          {/* Revenue by month */}
          {byMonth.length > 1 && (
            <div className="bg-white rounded-2xl border border-ivory-200 p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Revenue by month</p>
              <div className="flex items-end gap-1.5 h-28">
                {byMonth.map(m => {
                  const max = Math.max(1, ...byMonth.map(x => x.v));
                  return (
                    <div key={m.k} className="flex-1 flex flex-col items-center gap-1" title={`${m.k} · $${money(m.v)}`}>
                      <div className="w-full rounded-t bg-aubergine" style={{ height: `${(m.v / max) * 100}%`, minHeight: m.v > 0 ? 3 : 0 }} />
                      <span className="font-mono text-[8px] text-ink-muted">{fmtMonth(m.k + "-01")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Revenue by event */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3 bg-ivory border-b border-ivory-200"><p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Revenue by event</p></div>
            <div className="divide-y divide-ivory-200">
              {byEvent.map(e => (
                <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-ui font-semibold text-ink text-sm truncate">{e.title}</p>
                    <p className="font-mono text-[10px] text-ink-muted">{e.tickets} tickets · {e.orders} order{e.orders !== 1 ? "s" : ""}</p>
                  </div>
                  <p className="font-display font-bold text-peacock shrink-0">${money(e.revenue)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Fee breakdown */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3 bg-ivory border-b border-ivory-200"><p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">How fees work</p></div>
            <div className="p-5 space-y-3">
              {[
                { label: "Rameelo platform fee", val: "3%", note: "Charged to the buyer at checkout — never deducted from you.", color: "text-ink-muted" },
                { label: "Card processing", val: "5%", note: "Charged to the buyer. Free when they pay by bank (ACH).", color: "text-ink-muted" },
                { label: "You keep", val: "100%", note: "The full ticket face value is yours.", color: "text-peacock" },
              ].map(r => (
                <div key={r.label} className="flex items-start justify-between gap-4 py-1.5 border-b border-ivory-200 last:border-0">
                  <div className="min-w-0"><p className="font-ui text-sm font-semibold text-ink">{r.label}</p><p className="font-mono text-[10px] text-ink-muted/80 mt-0.5">{r.note}</p></div>
                  <p className={`font-display font-bold text-base shrink-0 ${r.color}`} style={{ letterSpacing: "-0.02em" }}>{r.val}</p>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 bg-ivory border-t border-ivory-200">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2">Example · one ${ticket} ticket</p>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between"><span className="text-ink-muted">Buyer pays (card)</span><span className="text-ink">${money(ticket + rameelo + card)}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">— Rameelo 3% / card 5%</span><span className="text-ink-muted">${money(rameelo + card)}</span></div>
                <div className="flex justify-between border-t border-ivory-200 pt-1"><span className="text-ink font-bold">Your revenue</span><span className="text-ink font-bold">${money(ticket)}</span></div>
              </div>
            </div>
          </div>

          <p className="font-mono text-[10px] text-ink-muted/60 text-center">Ready to cash out? <Link href="/organizer/payouts" className="text-aubergine hover:underline">Request a payout</Link>.</p>
        </>
      )}
    </div>
  );
}
