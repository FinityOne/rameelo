"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { saveOrder, markMemberPaid } from "@/lib/group-orders";

interface CheckoutPayload {
  eventId: string;
  tierId: string;
  tierName: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  eventCity: string;
  eventState: string;
  artistName: string | null;
  qty: number;
  unitPrice: number;
  discount: number;
  discountAmount: number;
  subtotalAfterDiscount: number;
  rameeloFee: number;
  serviceFee: number;
  grandTotal: number;
  groupId?: string;
  groupEmail?: string;
}

type PaymentMethod = "card" | "ach";

const RAMEELO_FEE_PCT  = 0.03;
const CARD_FEE_PCT     = 0.035;

function calcFees(subtotalAfterDiscount: number, method: PaymentMethod) {
  const rameeloFee    = Math.round(subtotalAfterDiscount * RAMEELO_FEE_PCT * 100) / 100;
  const processingFee = method === "card"
    ? Math.round(subtotalAfterDiscount * CARD_FEE_PCT * 100) / 100
    : 0;
  const grandTotal = subtotalAfterDiscount + rameeloFee + processingFee;
  return { rameeloFee, processingFee, grandTotal };
}

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}
function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<CheckoutPayload | null>(null);
  const [step, setStep] = useState<"contact" | "payment">("contact");
  const [loading, setLoading] = useState(false);

  // Auth
  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Contact
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry]         = useState("");
  const [cvv, setCvv]               = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [billingZip, setBillingZip] = useState("");

  // ACH fields
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType]     = useState<"checking" | "savings">("checking");
  const [accountName, setAccountName]     = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rameelo_checkout");
      if (raw) setPayload(JSON.parse(raw) as CheckoutPayload);
    } catch {}

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setAuthedUserId(user.id);
      setIsSignedIn(true);
      supabase
        .from("profiles")
        .select("first_name, last_name, email, phone")
        .eq("id", user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.first_name) setFirstName(profile.first_name);
          if (profile?.last_name)  setLastName(profile.last_name);
          if (profile?.email || user.email) setEmail(profile?.email || user.email || "");
          if (profile?.phone) setPhoneDigits(profile.phone.replace(/\D/g, "").slice(0, 10));
        });
    });
  }, []);

  useEffect(() => {
    if (firstName && lastName && !nameOnCard) setNameOnCard(`${firstName} ${lastName}`);
    if (firstName && lastName && !accountName) setAccountName(`${firstName} ${lastName}`);
  }, [firstName, lastName]);

  const subtotal = payload?.subtotalAfterDiscount ?? payload?.grandTotal ?? 0;
  const { rameeloFee, processingFee, grandTotal } = calcFees(subtotal, paymentMethod);

  const contactValid = firstName && lastName && email.includes("@") && phoneDigits.length === 10;
  const cardValid    = cardNumber.replace(/\s/g, "").length === 16 && expiry.length === 5 && cvv.length >= 3 && nameOnCard && billingZip.length === 5;
  const achValid     = routingNumber.length === 9 && accountNumber.length >= 4 && accountName.trim().length > 0;
  const paymentValid = paymentMethod === "card" ? cardValid : achValid;

  function handleContactNext(e: React.FormEvent) {
    e.preventDefault();
    if (contactValid) setStep("payment");
  }

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!payload) return;
    setLoading(true);

    const { orderId, error } = await saveOrder({
      userId: authedUserId,
      eventId: payload.eventId,
      tierId: payload.tierId,
      groupId: payload.groupId,
      buyerName: `${firstName} ${lastName}`,
      buyerEmail: email,
      buyerPhone: phoneDigits,
      qty: payload.qty,
      unitPrice: payload.unitPrice,
      discountPct: payload.discount,
      discountAmount: payload.discountAmount,
      serviceFee: rameeloFee + processingFee,
      rameeloFee,
      processingFee,
      paymentMethod,
      grandTotal,
    });

    if (orderId && payload.groupId && payload.groupEmail) {
      await markMemberPaid({ groupId: payload.groupId, email: payload.groupEmail, orderId });
    }

    if (error) console.error("Order save error:", error);

    const orderSnapshot = {
      orderId: orderId ?? ("RM-" + Math.random().toString(36).slice(2, 8).toUpperCase()),
      firstName,
      lastName,
      email,
      eventTitle: payload.eventTitle,
      eventDate: payload.eventDate,
      eventVenue: payload.eventVenue,
      eventCity: payload.eventCity,
      eventState: payload.eventState,
      grandTotal,
      qty: payload.qty,
      tierName: payload.tierName,
      groupId: payload.groupId,
      purchasedAt: new Date().toISOString(),
    };
    localStorage.setItem("rameelo_order", JSON.stringify(orderSnapshot));

    await new Promise(r => setTimeout(r, 1800));
    router.push("/confirmation");
  }

  const inputCls  = "w-full rounded-xl border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all";
  const labelCls  = "font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5 block";

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-ivory-200" />
          <div className="absolute inset-0 rounded-full border-4 border-marigold border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="font-display font-bold text-ink text-xl mb-1">Processing your order…</p>
          <p className="font-ui text-ink-muted text-sm">Please don&rsquo;t close this window</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F2" }}>
      {/* Top bar */}
      <div className="bg-white border-b border-ivory-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F5A623" }}>
              <span className="font-display font-bold text-aubergine text-sm">R</span>
            </div>
            <span className="font-display font-bold text-aubergine">Rameelo</span>
          </Link>
          <div className="flex items-center gap-2">
            {["Contact", "Payment"].map((s, i) => {
              const active = (i === 0 && step === "contact") || (i === 1 && step === "payment");
              const done   = i === 0 && step === "payment";
              return (
                <div key={s} className="flex items-center gap-2">
                  {i > 0 && <div className="w-8 h-px bg-ivory-200" />}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${done ? "bg-peacock text-white" : active ? "bg-aubergine text-white" : "bg-ivory-200 text-ink-muted"}`}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span className={`font-mono text-[10px] uppercase tracking-widest hidden sm:block ${active ? "text-ink" : "text-ink-muted"}`}>{s}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 text-ink-muted">
            <svg className="w-3.5 h-3.5 text-peacock" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <span className="font-mono text-[10px]">Secure</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">

          {/* ── Left: Form ── */}
          <div className="flex-1 min-w-0">

            {payload?.groupId && (
              <div className="mb-6 rounded-2xl bg-marigold/8 border border-marigold/20 px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-marigold/20 flex items-center justify-center shrink-0">
                  <span className="text-xl">👥</span>
                </div>
                <div>
                  <p className="font-ui text-sm font-semibold text-ink">Group Order</p>
                  <p className="font-ui text-xs text-ink-muted">
                    You&rsquo;re joining group <span className="font-mono font-bold text-marigold-dark">{payload.groupId}</span>
                    {payload.discount > 0 && ` · ${payload.discount}% off applied`}
                  </p>
                </div>
              </div>
            )}

            {isSignedIn ? (
              <div className="mb-6 rounded-2xl bg-peacock/8 border border-peacock/20 px-5 py-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="font-ui text-sm text-peacock font-semibold">Signed in — info pre-filled, order linked to your account</p>
              </div>
            ) : (
              <div className="mb-6 rounded-2xl bg-aubergine/5 border border-aubergine/15 px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-ui text-sm font-semibold text-ink">Already have an account?</p>
                  <p className="font-ui text-xs text-ink-muted">Sign in for faster checkout and to track this order.</p>
                </div>
                <Link
                  href={`/auth/signin?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "/checkout")}`}
                  className="shrink-0 px-4 py-2 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:bg-aubergine-light transition-all"
                >
                  Sign in
                </Link>
              </div>
            )}

            {step === "contact" ? (
              <form onSubmit={handleContactNext} className="space-y-5">
                <div>
                  <h2 className="font-display font-bold text-ink text-xl mb-1">Contact information</h2>
                  <p className="font-ui text-ink-muted text-sm">Your tickets will be sent to this email.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>First name</label>
                    <input type="text" autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Priya" className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls}>Last name</label>
                    <input type="text" autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Patel" className={inputCls} required />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Email address</label>
                  <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="priya@example.com" className={inputCls} required />
                  <p className="font-mono text-[10px] text-ink-muted mt-1.5">Tickets sent here as PDF + QR code</p>
                </div>

                <div>
                  <label className={labelCls}>Phone number</label>
                  <div className="flex items-center">
                    <div className="flex items-center gap-1.5 px-3 py-3 rounded-l-xl border border-r-0 border-ivory-200 bg-ivory shrink-0">
                      <span className="text-base leading-none">🇺🇸</span>
                      <span className="font-ui text-sm text-ink-muted font-medium">+1</span>
                    </div>
                    <input
                      type="tel"
                      autoComplete="tel-national"
                      value={formatPhone(phoneDigits)}
                      onChange={e => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="(555) 867-5309"
                      maxLength={14}
                      className="flex-1 rounded-r-xl rounded-l-none border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all"
                      required
                    />
                  </div>
                  <p className="font-mono text-[10px] text-ink-muted mt-1.5">For event day updates only · no spam</p>
                </div>

                <button
                  type="submit"
                  disabled={!contactValid}
                  className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all ${contactValid ? "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-sm" : "bg-ivory-200 text-ink-muted cursor-not-allowed"}`}
                >
                  Continue to Payment →
                </button>
              </form>
            ) : (
              <form onSubmit={handlePurchase} className="space-y-5">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setStep("contact")} className="w-9 h-9 rounded-xl border border-ivory-200 flex items-center justify-center text-ink-muted hover:border-aubergine hover:text-aubergine transition-all">←</button>
                  <div>
                    <h2 className="font-display font-bold text-ink text-xl">Payment details</h2>
                    <p className="font-ui text-ink-muted text-sm">{firstName} {lastName} · {email}</p>
                  </div>
                </div>

                {/* ── Payment method toggle ── */}
                <div>
                  <label className={labelCls}>How would you like to pay?</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["card", "ach"] as PaymentMethod[]).map(method => {
                      const isCard = method === "card";
                      const active = paymentMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`rounded-xl border-2 p-4 text-left transition-all ${active ? "border-aubergine bg-aubergine/5" : "border-ivory-200 bg-white hover:border-aubergine/40"}`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? "border-aubergine" : "border-ivory-200"}`}>
                              {active && <div className="w-2 h-2 rounded-full bg-aubergine" />}
                            </div>
                            <span className="font-ui font-semibold text-sm text-ink">{isCard ? "Credit / Debit" : "Bank / ACH"}</span>
                          </div>
                          <p className="font-mono text-[10px] text-ink-muted pl-6">
                            {isCard ? `+${(CARD_FEE_PCT * 100).toFixed(1)}% processing fee` : "No processing fee"}
                          </p>
                          {!isCard && (
                            <p className="font-mono text-[9px] text-peacock font-bold pl-6 mt-0.5">Save ${processingFee.toFixed(2)}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {paymentMethod === "ach" && (
                    <div className="mt-3 rounded-xl bg-peacock/8 border border-peacock/20 px-4 py-3 flex items-start gap-2">
                      <svg className="w-4 h-4 text-peacock shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p className="font-ui text-xs text-peacock leading-relaxed">
                        Bank transfers settle in <strong>2–5 business days</strong>. Your ticket is reserved immediately and delivered once payment clears.
                      </p>
                    </div>
                  )}
                </div>

                {/* Test mode hint */}
                <div className="rounded-xl bg-marigold/8 border border-marigold/20 px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-marigold-dark font-bold mb-1">Test Mode</p>
                  {paymentMethod === "card" ? (
                    <p className="font-ui text-xs text-ink-muted">
                      Card: <span className="font-mono font-bold text-ink">4242 4242 4242 4242</span>, any future date, any CVV.
                    </p>
                  ) : (
                    <p className="font-ui text-xs text-ink-muted">
                      Routing: <span className="font-mono font-bold text-ink">110000000</span> · Account: <span className="font-mono font-bold text-ink">000123456789</span>
                    </p>
                  )}
                </div>

                {/* ── Card fields ── */}
                {paymentMethod === "card" && (
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Card number</label>
                      <div className="relative">
                        <input type="text" autoComplete="cc-number" value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))} placeholder="1234 5678 9012 3456" className={`${inputCls} pr-14`} required />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                          <div className="w-6 h-4 rounded bg-[#1A1F71] opacity-60" />
                          <div className="w-6 h-4 rounded bg-[#FF5F00] opacity-60" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Expiry</label>
                        <input type="text" autoComplete="cc-exp" value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" className={inputCls} required />
                      </div>
                      <div>
                        <label className={labelCls}>CVV</label>
                        <input type="text" autoComplete="cc-csc" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" className={inputCls} required />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Name on card</label>
                      <input type="text" autoComplete="cc-name" value={nameOnCard} onChange={e => setNameOnCard(e.target.value)} placeholder="Priya Patel" className={inputCls} required />
                    </div>
                    <div>
                      <label className={labelCls}>Billing ZIP code</label>
                      <input type="text" autoComplete="postal-code" value={billingZip} onChange={e => setBillingZip(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="94105" className={inputCls} required />
                    </div>
                  </div>
                )}

                {/* ── ACH fields ── */}
                {paymentMethod === "ach" && (
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Account holder name</label>
                      <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Priya Patel" className={inputCls} required />
                    </div>
                    <div>
                      <label className={labelCls}>Account type</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(["checking", "savings"] as const).map(t => (
                          <button key={t} type="button" onClick={() => setAccountType(t)}
                            className={`py-2.5 rounded-xl border-2 font-ui font-semibold text-sm capitalize transition-all ${accountType === t ? "border-aubergine bg-aubergine/5 text-aubergine" : "border-ivory-200 text-ink-muted hover:border-aubergine/40"}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Routing number (9 digits)</label>
                      <input type="text" inputMode="numeric" value={routingNumber} onChange={e => setRoutingNumber(e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="110000000" className={inputCls} required />
                    </div>
                    <div>
                      <label className={labelCls}>Account number</label>
                      <input type="text" inputMode="numeric" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 17))} placeholder="000123456789" className={inputCls} required />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-4 rounded-xl bg-peacock/5 border border-peacock/20">
                  <svg className="w-5 h-5 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <p className="font-ui text-xs text-ink-muted">Your payment info is encrypted with 256-bit SSL. We never store your full payment details.</p>
                </div>

                <button
                  type="submit"
                  disabled={!paymentValid}
                  className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all flex items-center justify-center gap-2 ${paymentValid ? "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-sm" : "bg-ivory-200 text-ink-muted cursor-not-allowed"}`}
                >
                  Complete Purchase · ${grandTotal.toFixed(2)}
                </button>

                <p className="text-center font-mono text-[10px] text-ink-muted">By completing purchase you agree to our Terms of Service</p>
              </form>
            )}
          </div>

          {/* ── Right: Order summary ── */}
          <div className="lg:w-80 shrink-0">
            <div className="lg:sticky lg:top-24 rounded-2xl bg-white border border-ivory-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-ivory-200" style={{ backgroundColor: "#2E1B30" }}>
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/50 mb-2">Order Summary</p>
                {payload && (
                  <div>
                    <p className="font-display font-bold text-white text-sm leading-snug">{payload.eventTitle}</p>
                    {payload.artistName && (
                      <p className="font-ui text-white/50 text-xs mt-0.5">{payload.artistName}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-5 space-y-3">
                {payload && (
                  <div className="text-xs space-y-2">
                    <div className="flex items-center gap-1.5 text-ink-muted">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="font-ui">{payload.eventDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-ink-muted">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                      <span className="font-ui">{payload.eventVenue}, {payload.eventCity}, {payload.eventState}</span>
                    </div>
                  </div>
                )}

                {payload && (
                  <div className="border-t border-ivory-200 pt-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-ui text-ink-muted">{payload.tierName} · {payload.qty} ticket{payload.qty > 1 ? "s" : ""}</span>
                      <span className="font-ui text-ink">${(payload.unitPrice * payload.qty).toFixed(2)}</span>
                    </div>
                    {payload.discount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="font-ui text-peacock">Group discount ({payload.discount}%)</span>
                        <span className="font-ui text-peacock">−${payload.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {subtotal !== payload.unitPrice * payload.qty && (
                      <div className="flex justify-between text-xs border-t border-ivory-200 pt-1.5">
                        <span className="font-ui text-ink-muted">Subtotal</span>
                        <span className="font-ui text-ink">${subtotal.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Fee breakdown */}
                    <div className="rounded-lg bg-ivory p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="font-ui text-ink-muted">Rameelo fee (3%)</span>
                        <span className="font-ui text-ink-muted">${rameeloFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <div>
                          <span className="font-ui text-ink-muted">Processing fee</span>
                          {paymentMethod === "card" ? (
                            <p className="font-mono text-[9px] text-ink-muted/70">3.5% · credit/debit card</p>
                          ) : (
                            <p className="font-mono text-[9px] text-peacock">Free · bank transfer</p>
                          )}
                        </div>
                        <span className={`font-ui shrink-0 ${paymentMethod === "ach" ? "text-peacock font-semibold" : "text-ink-muted"}`}>
                          {paymentMethod === "ach" ? "FREE" : `$${processingFee.toFixed(2)}`}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-ivory-200 pt-2 flex justify-between">
                      <span className="font-display font-bold text-ink">Total</span>
                      <span className="font-display font-bold text-ink text-lg">${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* ACH savings callout */}
                {paymentMethod === "ach" && processingFee > 0 && (
                  <div className="rounded-xl bg-peacock/10 border border-peacock/25 p-3">
                    <p className="font-ui text-xs font-semibold text-peacock text-center">
                      Saving ${processingFee.toFixed(2)} by paying with bank transfer!
                    </p>
                  </div>
                )}

                {payload && (payload.discount ?? 0) > 0 && (
                  <div className="rounded-xl bg-marigold/10 border border-marigold/25 p-3">
                    <p className="font-ui text-xs font-semibold text-marigold-dark text-center">
                      Saving ${(payload.discountAmount ?? 0).toFixed(2)} with group pricing!
                    </p>
                  </div>
                )}

                {payload?.groupId && (
                  <div className="rounded-xl bg-aubergine/5 border border-aubergine/10 p-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine font-bold mb-1">Group Order</p>
                    <p className="font-ui text-xs text-ink-muted">Your ticket will appear in <strong className="text-ink">{payload.groupId}</strong> once payment is complete.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
