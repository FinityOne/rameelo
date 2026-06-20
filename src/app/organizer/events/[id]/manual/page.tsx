"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { lookupUserByEmail, type UserLookup } from "@/lib/transfers";
import { createManualOrder } from "@/lib/manual-orders";
import EventSubnav from "../EventSubnav";

type Tier = { id: string; name: string; price: number };
type EventData = { id: string; title: string; status: string; ticket_tiers: Tier[] };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
function money(n: number) { return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function ManualOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [ev, setEv] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — customer
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lookup, setLookup] = useState<UserLookup | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  // Step 2 — tier + amount
  const [tierId, setTierId] = useState("");
  const [qty, setQty] = useState(1);
  const [total, setTotal] = useState("");

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [done, setDone] = useState<{ name: string; qty: number; total: number; hasAccount: boolean } | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("events")
      .select("id, title, status, ticket_tiers(id, name, price)")
      .eq("id", id)
      .eq("organizer_id", user.id)
      .single();
    if (!data) { router.replace("/organizer/events"); return; }
    const e = data as unknown as EventData;
    setEv(e);
    setTierId(prev => prev || e.ticket_tiers[0]?.id || "");
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  // Live account lookup on the entered email.
  useEffect(() => {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { setLookup(null); setLookingUp(false); return; }
    setLookingUp(true);
    const t = setTimeout(async () => {
      const res = await lookupUserByEmail(e);
      setLookup(res);
      setLookingUp(false);
      if (res.exists && res.name) {
        const [f, ...rest] = res.name.split(" ");
        setFirstName(prev => prev || f || "");
        setLastName(prev => prev || rest.join(" "));
      }
    }, 450);
    return () => clearTimeout(t);
  }, [email]);

  // When the tier changes, default the total to qty × list price (organizer can override).
  const selectedTier = ev?.ticket_tiers.find(t => t.id === tierId) ?? null;
  useEffect(() => {
    if (selectedTier) setTotal(prev => prev === "" ? (selectedTier.price * qty).toFixed(2) : prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierId]);

  const emailValid = EMAIL_RE.test(email.trim());
  const step1Valid = firstName.trim() !== "" && emailValid;
  const totalNum = parseFloat(total || "0") || 0;
  const step2Valid = !!tierId && qty >= 1 && totalNum >= 0;

  async function handleSubmit() {
    if (!ev || submitting) return;
    setSubmitting(true);
    setErrorMsg("");
    const { result, error } = await createManualOrder({
      eventId: ev.id, tierId, firstName: firstName.trim(), lastName: lastName.trim(),
      email: email.trim(), phone: phone.trim(), qty, total: totalNum,
    });
    if (error || !result) {
      setErrorMsg(error || "Could not create the order. Please try again.");
      setSubmitting(false);
      return;
    }
    fetch("/api/manual-order-send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: result.orderId }) }).catch(() => {});
    setDone({ name: `${firstName.trim()} ${lastName.trim()}`.trim() || email.trim(), qty: result.qty, total: result.total, hasAccount: result.recipientExists });
    setSubmitting(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" /></div>;
  }
  if (!ev) return null;

  const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all";
  const labelCls = "font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5 block";
  const perTicket = qty > 0 ? totalNum / qty : 0;

  // ── Success state ──
  if (done) {
    return (
      <div className="space-y-5">
        <EventSubnav eventId={id} active="manual" />
        <div className="bg-white rounded-2xl border border-ivory-200 p-8 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-peacock/10 text-peacock flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Manual order created</h1>
          <p className="font-ui text-sm text-ink-muted mt-1.5 leading-relaxed">
            {done.qty} ticket{done.qty !== 1 ? "s" : ""} for <strong className="text-ink">{done.name}</strong> · <strong className="text-ink">${money(done.total)}</strong> (offline).
            {done.hasAccount
              ? " They have a Rameelo account — the tickets are in their portal now, and we emailed them a confirmation."
              : " We emailed them a confirmation; their tickets attach automatically when they sign in with this email."}
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={() => { setDone(null); setStep(1); setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setQty(1); setTotal(""); setLookup(null); }}
              className="px-4 py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:opacity-90 transition-all">Create another</button>
            <Link href={`/organizer/events/${id}/orders`} className="font-ui text-sm font-semibold text-ink-muted hover:text-ink transition-colors">View orders →</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/organizer/events" className="font-ui text-xs text-ink-muted hover:text-ink flex items-center gap-1 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          My Events
        </Link>
        <span className="text-ink-muted/40 text-xs">/</span>
        <Link href={`/organizer/events/${id}`} className="font-ui text-xs text-ink-muted hover:text-ink transition-colors truncate max-w-[180px]">{ev.title}</Link>
        <span className="text-ink-muted/40 text-xs">/</span>
        <span className="font-ui text-xs text-ink">Manual order</span>
      </div>

      <div>
        <h1 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Create a manual order</h1>
        <p className="font-ui text-sm text-ink-muted mt-0.5">
          Record a ticket sale you settled <strong>off Rameelo</strong> (cash, Zelle, at the door). Any tier, any amount — tracked separately and never charged on Rameelo.
        </p>
      </div>

      <EventSubnav eventId={id} active="manual" />

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {[{ n: 1, label: "Customer" }, { n: 2, label: "Tickets & amount" }, { n: 3, label: "Confirm" }].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${step === s.n ? "bg-aubergine text-white" : step > s.n ? "bg-peacock/15 text-peacock" : "bg-ivory text-ink-muted"}`}>
              <span className="font-display font-bold text-xs w-4 h-4 flex items-center justify-center">
                {step > s.n ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : s.n}
              </span>
              <span className="font-ui font-semibold text-xs whitespace-nowrap">{s.label}</span>
            </div>
            {i < 2 && <div className="w-4 h-px bg-ivory-200" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-ivory-200 p-5 max-w-2xl">
        {/* ── Step 1: Customer ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>First name *</label><input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Priya" className={inputCls} /></div>
              <div><label className={labelCls}>Last name</label><input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Patel" className={inputCls} /></div>
            </div>
            <div>
              <label className={labelCls}>Customer email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="priya@email.com" className={inputCls} />
              {emailValid && (
                <div className="mt-1.5 min-h-[18px]">
                  {lookingUp ? (
                    <p className="font-mono text-[10px] text-ink-muted flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-ivory-200 border-t-ink-muted animate-spin" />Checking for an account…</p>
                  ) : lookup?.exists ? (
                    <p className="font-mono text-[10px] text-peacock font-bold flex items-center gap-1.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Has a Rameelo account{lookup.name ? ` · ${lookup.name}` : ""} — tickets land in their portal instantly</p>
                  ) : lookup ? (
                    <p className="font-mono text-[10px] text-marigold-dark flex items-center gap-1.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>No account yet — we&apos;ll email them that you confirmed this order; tickets attach when they sign in</p>
                  ) : null}
                </div>
              )}
            </div>
            <div className="sm:max-w-[50%]">
              <label className={labelCls}>Phone <span className="text-ink-muted/50 normal-case">(optional)</span></label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputCls} />
            </div>
            <div className="flex justify-end pt-1">
              <button onClick={() => setStep(2)} disabled={!step1Valid}
                className={`px-5 py-2.5 rounded-xl font-ui font-semibold text-sm transition-all ${step1Valid ? "bg-aubergine text-white hover:opacity-90" : "bg-black/[0.06] text-ink-muted cursor-not-allowed"}`}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Tickets & amount ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-[1fr_110px] gap-4">
              <div>
                <label className={labelCls}>Ticket tier</label>
                <select value={tierId} onChange={e => { setTierId(e.target.value); setTotal(""); }} className={inputCls}>
                  {ev.ticket_tiers.map(t => <option key={t.id} value={t.id}>{t.name} · ${money(t.price)} list</option>)}
                </select>
                <p className="font-mono text-[9px] text-ink-muted mt-1">Any tier — capacity &amp; sale dates don&rsquo;t apply to manual orders.</p>
              </div>
              <div>
                <label className={labelCls}>Quantity</label>
                <input type="number" min={1} value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value || "1", 10)))} className={inputCls} />
              </div>
            </div>
            <div className="sm:max-w-[50%]">
              <label className={labelCls}>Total amount collected (USD)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-ui text-sm text-ink-muted">$</span>
                <input type="number" min={0} step="0.01" value={total} onChange={e => setTotal(e.target.value)} placeholder="0.00" className={`${inputCls} pl-7`} />
              </div>
              <p className="font-mono text-[9px] text-ink-muted mt-1">
                {qty > 1 ? `≈ $${money(perTicket)} per ticket · ` : ""}This funnels into the event&rsquo;s revenue as a separate offline line.
              </p>
            </div>
            <div className="flex items-center justify-between pt-1">
              <button onClick={() => setStep(1)} className="font-ui text-sm font-semibold text-ink-muted hover:text-ink transition-colors">← Back</button>
              <button onClick={() => setStep(3)} disabled={!step2Valid}
                className={`px-5 py-2.5 rounded-xl font-ui font-semibold text-sm transition-all ${step2Valid ? "bg-aubergine text-white hover:opacity-90" : "bg-black/[0.06] text-ink-muted cursor-not-allowed"}`}>
                Review →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-ivory-200 bg-ivory divide-y divide-ivory-200">
              {[
                ["Customer", `${firstName.trim()} ${lastName.trim()}`.trim() || "—"],
                ["Email", email.trim().toLowerCase()],
                ["Phone", phone.trim() || "—"],
                ["Account", lookup?.exists ? "Existing Rameelo account — tickets land instantly" : "No account yet — confirmation email + claim on sign-in"],
                ["Event", ev.title],
                ["Tier", selectedTier?.name ?? "—"],
                ["Quantity", String(qty)],
                ["Total (offline)", `$${money(totalNum)}${qty > 1 ? ` · ≈ $${money(perTicket)}/ticket` : ""}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted shrink-0 pt-0.5">{label}</span>
                  <span className="font-ui text-sm text-ink text-right min-w-0 break-words">{value}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-marigold/8 border border-marigold/25 px-4 py-3">
              <p className="font-ui text-xs text-ink leading-relaxed">
                This is an <strong>offline order</strong> — Rameelo does not process or hold this payment. It&rsquo;s tracked as a separate
                manual line in revenue and reports, and is <strong>not</strong> included in your Rameelo payout balance.
              </p>
            </div>

            {errorMsg && <p className="font-ui text-sm text-durga bg-durga/8 border border-durga/20 rounded-xl px-3.5 py-2.5">{errorMsg}</p>}

            <div className="flex items-center justify-between pt-1">
              <button onClick={() => setStep(2)} disabled={submitting} className="font-ui text-sm font-semibold text-ink-muted hover:text-ink transition-colors disabled:opacity-50">← Back</button>
              <button onClick={handleSubmit} disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60">
                {submitting ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating…</> : "Create manual order"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
