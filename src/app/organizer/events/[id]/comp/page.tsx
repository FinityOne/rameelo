"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { lookupUserByEmail, type UserLookup } from "@/lib/transfers";
import { compEventTickets } from "@/lib/comps";
import EventSubnav from "../EventSubnav";

type Tier = { id: string; name: string; price: number; quantity: number; quantity_sold: number };
type EventData = { id: string; title: string; status: string; cover_image_url: string | null; ticket_tiers: Tier[] };
type CompOrder = {
  id: string; buyer_name: string; buyer_email: string; buyer_phone: string | null;
  qty: number; user_id: string | null; comp_note: string | null; created_at: string;
  ticket_tiers: { name: string } | null;
};

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function CompTicketsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [ev, setEv] = useState<EventData | null>(null);
  const [comps, setComps] = useState<CompOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [tierId, setTierId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState<{ name: string; qty: number; hasAccount: boolean } | null>(null);

  // Live account lookup for the entered email
  const [lookup, setLookup] = useState<UserLookup | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [evRes, compRes] = await Promise.all([
      supabase
        .from("events")
        .select("id, title, status, cover_image_url, ticket_tiers(id, name, price, quantity, quantity_sold)")
        .eq("id", id)
        .eq("organizer_id", user.id)
        .single(),
      supabase
        .from("orders")
        .select("id, buyer_name, buyer_email, buyer_phone, qty, user_id, comp_note, created_at, ticket_tiers(name)")
        .eq("event_id", id)
        .eq("order_type", "comp")
        .eq("is_test", false)
        .order("created_at", { ascending: false }),
    ]);

    if (!evRes.data) { router.replace("/organizer/events"); return; }
    const e = evRes.data as unknown as EventData;
    setEv(e);
    setComps((compRes.data ?? []) as unknown as CompOrder[]);
    // Default the tier to the first one with inventory left.
    const firstAvail = e.ticket_tiers.find(t => t.quantity - t.quantity_sold > 0) ?? e.ticket_tiers[0];
    setTierId(prev => prev || firstAvail?.id || "");
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  // Debounced "does this person have an account?" lookup.
  useEffect(() => {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { setLookup(null); setLookingUp(false); return; }
    setLookingUp(true);
    const t = setTimeout(async () => {
      const res = await lookupUserByEmail(e);
      setLookup(res);
      setLookingUp(false);
      // Prefill names from their account if we have them and the fields are empty.
      if (res.exists && res.name) {
        const [f, ...rest] = res.name.split(" ");
        setFirstName(prev => prev || f || "");
        setLastName(prev => prev || rest.join(" "));
      }
    }, 450);
    return () => clearTimeout(t);
  }, [email]);

  const tiers = ev?.ticket_tiers ?? [];
  const selectedTier = tiers.find(t => t.id === tierId) ?? null;
  const remaining = selectedTier ? Math.max(0, selectedTier.quantity - selectedTier.quantity_sold) : 0;
  const emailValid = EMAIL_RE.test(email.trim());
  const overCapacity = !!selectedTier && qty > remaining; // comps may exceed capacity
  const canSubmit = !!tierId && firstName.trim() && emailValid && qty >= 1 && !submitting;

  const totalComped = comps.reduce((s, c) => s + c.qty, 0);
  const claimedCount = comps.filter(c => c.user_id).length;

  async function handleSubmit() {
    if (!canSubmit || !ev) return;
    setSubmitting(true);
    setErrorMsg("");
    setSuccess(null);

    const { result, error } = await compEventTickets({
      eventId: ev.id, tierId, firstName: firstName.trim(), lastName: lastName.trim(),
      email: email.trim(), phone: phone.trim(), qty, note: note.trim() || undefined,
    });

    if (error || !result) {
      setErrorMsg(error || "Could not issue tickets. Please try again.");
      setSubmitting(false);
      return;
    }

    // Fire the recipient's email (non-blocking — the tickets already exist).
    fetch("/api/comp-ticket-send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: result.orderId }) }).catch(() => {});

    setSuccess({ name: `${firstName.trim()} ${lastName.trim()}`.trim() || email.trim(), qty: result.qty, hasAccount: result.recipientExists });
    // Reset the recipient fields, keep tier for repeat sends.
    setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setQty(1); setNote("");
    setLookup(null);
    setSubmitting(false);
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }
  if (!ev) return null;

  const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all";
  const labelCls = "font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5 block";

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
        <span className="font-ui text-xs text-ink">Comp Tickets</span>
      </div>

      {/* Title */}
      <div>
        <h1 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Comp Tickets</h1>
        <p className="font-ui text-sm text-ink-muted mt-0.5">
          Send free tickets to friends, family, artists, and promo guests — no payment, delivered straight to their Rameelo account.
        </p>
      </div>

      <EventSubnav eventId={id} active="comp" />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Comped tickets", value: totalComped.toLocaleString(), cls: "text-aubergine" },
          { label: "Recipients", value: comps.length.toLocaleString(), cls: "text-ink" },
          { label: "In an account", value: `${claimedCount}/${comps.length}`, cls: "text-peacock" },
        ].map(t => (
          <div key={t.label} className="bg-white rounded-2xl border border-ivory-200 px-4 py-3.5">
            <p className={`font-display font-bold text-2xl ${t.cls}`} style={{ letterSpacing: "-0.03em" }}>{t.value}</p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-1">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Success banner */}
      {success && (
        <div className="rounded-2xl bg-peacock/8 border border-peacock/25 px-5 py-4 flex items-start gap-3">
          <span className="text-xl shrink-0">🎉</span>
          <div className="flex-1 min-w-0">
            <p className="font-ui font-semibold text-ink text-sm">
              {success.qty} free ticket{success.qty !== 1 ? "s" : ""} sent to {success.name}
            </p>
            <p className="font-ui text-xs text-ink-muted mt-0.5">
              {success.hasAccount
                ? "They already have a Rameelo account — the tickets are in their portal now, and we emailed them to log in."
                : "We emailed them to create a free account with this email; their tickets will appear automatically when they sign up."}
            </p>
          </div>
          <button onClick={() => setSuccess(null)} className="shrink-0 text-ink-muted hover:text-ink">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Issue form */}
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Issue complimentary tickets</p>
        </div>
        <div className="p-5 space-y-4">
          {/* Tier + qty */}
          <div className="grid sm:grid-cols-[1fr_120px] gap-4">
            <div>
              <label className={labelCls}>Ticket tier</label>
              <select value={tierId} onChange={e => { setTierId(e.target.value); setQty(1); }} className={inputCls}>
                {tiers.map(t => {
                  const rem = Math.max(0, t.quantity - t.quantity_sold);
                  return <option key={t.id} value={t.id}>{t.name} · {rem} left{rem === 0 ? " (sold out)" : ""}</option>;
                })}
              </select>
            </div>
            <div>
              <label className={labelCls}>Quantity</label>
              <input
                type="number" min={1} value={qty}
                onChange={e => setQty(Math.max(1, parseInt(e.target.value || "1", 10)))}
                className={inputCls}
              />
              <p className={`font-mono text-[9px] mt-1 ${overCapacity ? "text-marigold-dark" : "text-ink-muted"}`}>
                {overCapacity ? `${remaining} for sale · over capacity OK` : `${remaining} available`}
              </p>
            </div>
          </div>

          {/* Name */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First name *</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Priya" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Last name</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Patel" className={inputCls} />
            </div>
          </div>

          {/* Email + live account check */}
          <div>
            <label className={labelCls}>Recipient email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="priya@email.com" className={inputCls} />
            {emailValid && (
              <div className="mt-1.5 min-h-[18px]">
                {lookingUp ? (
                  <p className="font-mono text-[10px] text-ink-muted flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-ivory-200 border-t-ink-muted animate-spin" />
                    Checking for an account…
                  </p>
                ) : lookup?.exists ? (
                  <p className="font-mono text-[10px] text-peacock font-bold flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    Has a Rameelo account{lookup.name ? ` · ${lookup.name}` : ""} — tickets land in their portal instantly
                  </p>
                ) : lookup ? (
                  <p className="font-mono text-[10px] text-marigold-dark flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    No account yet — we&apos;ll email them to create one (free); tickets attach automatically
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {/* Phone + note */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Phone <span className="text-ink-muted/50 normal-case">(optional)</span></label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Internal note <span className="text-ink-muted/50 normal-case">(optional)</span></label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Artist guest list" className={inputCls} />
            </div>
          </div>

          {overCapacity && (
            <p className="font-ui text-xs text-[#a06b00] bg-marigold/8 border border-marigold/25 rounded-xl px-3.5 py-2.5">
              Heads up: {qty} exceeds the {remaining} ticket{remaining !== 1 ? "s" : ""} left for sale in this tier. Comps are allowed to go over capacity — just make sure your venue can accommodate the extra {qty - remaining} guest{qty - remaining !== 1 ? "s" : ""}.
            </p>
          )}

          {errorMsg && (
            <p className="font-ui text-sm text-durga bg-durga/8 border border-durga/20 rounded-xl px-3.5 py-2.5">{errorMsg}</p>
          )}

          <div className="flex items-center justify-between gap-4 pt-1">
            <p className="font-ui text-xs text-ink-muted">
              These are <strong className="text-ink">$0 comp tickets</strong> — they never touch Stripe and generate no revenue.
            </p>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-ui font-semibold text-sm transition-all ${
                canSubmit ? "bg-aubergine text-white hover:bg-aubergine/90 active:scale-[0.98] shadow-sm" : "bg-black/[0.06] text-ink-muted cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Sending…</>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4m0 0v4m0-4h4m-4 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Send {qty > 1 ? `${qty} free tickets` : "free ticket"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Comped tickets list */}
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Comped tickets</p>
          <span className="font-mono text-[10px] text-ink-muted">{comps.length} recipient{comps.length !== 1 ? "s" : ""} · {totalComped} ticket{totalComped !== 1 ? "s" : ""}</span>
        </div>

        {comps.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-3xl mb-2">🎁</p>
            <p className="font-ui text-sm text-ink-muted">No comp tickets issued yet.</p>
            <p className="font-ui text-xs text-ink-muted/60 mt-1">Use the form above to send free tickets to your guests.</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ivory-200 bg-ivory/50">
                    <th className="px-5 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Recipient</th>
                    <th className="px-3 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Tier</th>
                    <th className="px-3 py-3 text-center font-mono text-[9px] uppercase tracking-widest text-ink-muted">Qty</th>
                    <th className="px-3 py-3 text-center font-mono text-[9px] uppercase tracking-widest text-ink-muted">Status</th>
                    <th className="px-3 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted hidden md:table-cell">Note</th>
                    <th className="px-5 py-3 text-right font-mono text-[9px] uppercase tracking-widest text-ink-muted">Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {comps.map(c => (
                    <tr key={c.id} className="hover:bg-ivory/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-ui text-sm font-semibold text-ink">{c.buyer_name}</p>
                        <p className="font-mono text-[9px] text-ink-muted">{c.buyer_email}</p>
                      </td>
                      <td className="px-3 py-3.5 font-ui text-sm text-ink">{c.ticket_tiers?.name ?? "—"}</td>
                      <td className="px-3 py-3.5 text-center font-display font-bold text-ink" style={{ letterSpacing: "-0.02em" }}>{c.qty}</td>
                      <td className="px-3 py-3.5 text-center">
                        {c.user_id ? (
                          <span className="font-mono text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-peacock/12 text-peacock">In account</span>
                        ) : (
                          <span className="font-mono text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-marigold/20 text-[#a06b00]">Awaiting sign-up</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 font-ui text-xs text-ink-muted hidden md:table-cell">{c.comp_note || "—"}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-[10px] text-ink-muted">{fmtDateTime(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="sm:hidden divide-y divide-ivory-200">
              {comps.map(c => (
                <div key={c.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-ui text-sm font-semibold text-ink truncate">{c.buyer_name}</p>
                      <p className="font-mono text-[9px] text-ink-muted truncate">{c.buyer_email}</p>
                      <p className="font-mono text-[9px] text-ink-muted mt-0.5">{c.ticket_tiers?.name ?? "—"} · {c.qty} ticket{c.qty !== 1 ? "s" : ""}</p>
                    </div>
                    {c.user_id ? (
                      <span className="font-mono text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-peacock/12 text-peacock shrink-0">In account</span>
                    ) : (
                      <span className="font-mono text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-marigold/20 text-[#a06b00] shrink-0">Awaiting</span>
                    )}
                  </div>
                  <p className="font-mono text-[9px] text-ink-muted mt-1.5">{fmtDateTime(c.created_at)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
