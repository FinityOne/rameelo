"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { garbaEvents, artists } from "@/lib/events-data";

interface CheckoutPayload {
  type: "ga" | "vip" | "combo";
  event1Id: string;
  event2Id?: string;
  qty: number;
  unitPrice: number;
  unit2Price?: number;
  discount: number;
  grandTotal: number;
}

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<CheckoutPayload | null>(null);
  const [step, setStep] = useState<"contact" | "payment">("contact");
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  // Contact fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Payment fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [zip, setZip] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rameelo_checkout");
      if (raw) setPayload(JSON.parse(raw));
    } catch {}
  }, []);

  // Pre-fill name on card when first+last filled
  useEffect(() => {
    if (firstName && lastName && !nameOnCard) {
      setNameOnCard(`${firstName} ${lastName}`);
    }
  }, [firstName, lastName]);

  const event1 = payload ? garbaEvents.find((e) => e.id === payload.event1Id) : null;
  const event2 = payload?.event2Id ? garbaEvents.find((e) => e.id === payload.event2Id) : null;
  const artist1 = event1 ? artists.find((a) => a.slug === event1.artistSlug) : null;

  const contactValid = firstName && lastName && email && email.includes("@") && phone.length >= 10;

  function handleContactNext(e: React.FormEvent) {
    e.preventDefault();
    if (contactValid) setStep("payment");
  }

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Save order for confirmation page
    const order = {
      orderId: "RM-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      firstName,
      lastName,
      email,
      payload,
      event1: event1 ? { title: event1.title, date: event1.date, venue: event1.venue, city: event1.city, state: event1.state } : null,
      event2: event2 ? { title: event2.title, date: event2.date, venue: event2.venue, city: event2.city, state: event2.state } : null,
      grandTotal: payload?.grandTotal ?? 0,
      qty: payload?.qty ?? 1,
      type: payload?.type ?? "ga",
      purchasedAt: new Date().toISOString(),
    };
    localStorage.setItem("rameelo_order", JSON.stringify(order));

    // Fake processing delay
    await new Promise((r) => setTimeout(r, 2200));
    router.push("/confirmation");
  }

  const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all";
  const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5 block";

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
              const done = i === 0 && step === "payment";
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
            <span className="font-mono text-[10px]">Secure checkout</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Left: Form ── */}
          <div className="flex-1 min-w-0">
            {/* Login nudge */}
            {!signedIn && (
              <div className="mb-6 rounded-2xl bg-aubergine/5 border border-aubergine/15 px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-ui text-sm font-semibold text-ink">Already have an account?</p>
                  <p className="font-ui text-xs text-ink-muted">Sign in for faster checkout — your info is saved.</p>
                </div>
                <button
                  onClick={() => {
                    setSignedIn(true);
                    setFirstName("Priya");
                    setLastName("Patel");
                    setEmail("priya@example.com");
                    setPhone("4085551234");
                  }}
                  className="shrink-0 px-4 py-2 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:bg-aubergine-light transition-all"
                >
                  Sign in
                </button>
              </div>
            )}
            {signedIn && (
              <div className="mb-6 rounded-2xl bg-peacock/8 border border-peacock/20 px-5 py-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="font-ui text-sm text-peacock font-semibold">Signed in as {email} — info pre-filled</p>
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
                    <input
                      type="text"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Priya"
                      className={inputCls}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Last name</label>
                    <input
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Patel"
                      className={inputCls}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Email address</label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya@example.com"
                    className={inputCls}
                    required
                  />
                  <p className="font-mono text-[10px] text-ink-muted mt-1.5">Tickets sent here as PDF + QR code</p>
                </div>

                <div>
                  <label className={labelCls}>Phone number</label>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="4085551234"
                    className={inputCls}
                    required
                  />
                  <p className="font-mono text-[10px] text-ink-muted mt-1.5">For event day updates only · no spam</p>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-ivory border border-ivory-200">
                  <input type="checkbox" id="saveInfo" className="mt-0.5 accent-aubergine" defaultChecked />
                  <label htmlFor="saveInfo" className="font-ui text-sm text-ink-muted cursor-pointer">
                    Save my info for faster checkout next time
                  </label>
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
                  <button
                    type="button"
                    onClick={() => setStep("contact")}
                    className="w-8 h-8 rounded-xl border border-ivory-200 flex items-center justify-center text-ink-muted hover:border-aubergine hover:text-aubergine transition-all"
                  >
                    ←
                  </button>
                  <div>
                    <h2 className="font-display font-bold text-ink text-xl">Payment details</h2>
                    <p className="font-ui text-ink-muted text-sm">{firstName} {lastName} · {email}</p>
                  </div>
                </div>

                {/* Card number */}
                <div>
                  <label className={labelCls}>Card number</label>
                  <div className="relative">
                    <input
                      type="text"
                      autoComplete="cc-number"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="1234 5678 9012 3456"
                      className={`${inputCls} pr-12`}
                      required
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                      <div className="w-6 h-4 rounded bg-[#1A1F71] opacity-60" />
                      <div className="w-6 h-4 rounded bg-[#FF5F00] opacity-60" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Expiry</label>
                    <input
                      type="text"
                      autoComplete="cc-exp"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      className={inputCls}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>CVV</label>
                    <input
                      type="text"
                      autoComplete="cc-csc"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="123"
                      className={inputCls}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Name on card</label>
                  <input
                    type="text"
                    autoComplete="cc-name"
                    value={nameOnCard}
                    onChange={(e) => setNameOnCard(e.target.value)}
                    placeholder="Priya Patel"
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className={labelCls}>Billing ZIP code</label>
                  <input
                    type="text"
                    autoComplete="postal-code"
                    value={zip}
                    onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    placeholder="94105"
                    className={inputCls}
                    required
                  />
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-peacock/5 border border-peacock/20">
                  <svg className="w-5 h-5 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <p className="font-ui text-xs text-ink-muted">
                    Your payment info is encrypted with 256-bit SSL. We never store your card details.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark active:scale-[0.98] shadow-sm transition-all"
                >
                  Complete Purchase · ${payload?.grandTotal.toLocaleString() ?? "—"}
                </button>

                <p className="text-center font-mono text-[10px] text-ink-muted">
                  By completing purchase you agree to our Terms of Service
                </p>
              </form>
            )}
          </div>

          {/* ── Right: Order summary ── */}
          <div className="lg:w-80 shrink-0">
            <div className="sticky top-24 rounded-2xl bg-white border border-ivory-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-ivory-200" style={{ backgroundColor: "#2E1B30" }}>
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/50 mb-1">Order Summary</p>
                {event1 && artist1 && (
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: artist1.color }}
                    >
                      {artist1.initials}
                    </div>
                    <p className="font-display font-bold text-white text-sm leading-snug">{event1.title}</p>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-3">
                {event1 && (
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-ink-muted">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="font-ui">{event1.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-ink-muted">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                      <span className="font-ui">{event1.venue}, {event1.city}</span>
                    </div>
                  </div>
                )}

                {event2 && (
                  <>
                    <div className="flex items-center gap-2 py-2">
                      <div className="h-px flex-1 bg-ivory-200" />
                      <span className="font-mono text-[9px] uppercase tracking-widest text-marigold-dark bg-marigold/10 px-2 py-0.5 rounded-full">
                        + Bundle Event
                      </span>
                      <div className="h-px flex-1 bg-ivory-200" />
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-ui font-semibold text-ink">{event2.title}</p>
                      <p className="font-ui text-ink-muted">{event2.date} · {event2.city}, {event2.state}</p>
                    </div>
                  </>
                )}

                <div className="border-t border-ivory-200 pt-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-ui text-ink-muted capitalize">{payload?.type === "combo" ? "Bundle" : payload?.type?.toUpperCase() ?? "GA"} · {payload?.qty ?? 1} ticket{(payload?.qty ?? 1) > 1 ? "s" : ""}</span>
                    <span className="font-ui text-ink">
                      ${payload ? (payload.unitPrice * payload.qty + (payload.unit2Price ? payload.unit2Price * payload.qty : 0)).toLocaleString() : "—"}
                    </span>
                  </div>
                  {payload && payload.discount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="font-ui text-peacock">Discount ({payload.discount}%)</span>
                      <span className="font-ui text-peacock">
                        −${Math.round((payload.unitPrice * payload.qty + (payload.unit2Price ? payload.unit2Price * payload.qty : 0)) * (payload.discount / 100)).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="font-ui text-ink-muted">Service fee</span>
                    <span className="font-ui text-ink-muted">included</span>
                  </div>
                  <div className="border-t border-ivory-200 pt-2 flex justify-between">
                    <span className="font-display font-bold text-ink">Total</span>
                    <span className="font-display font-bold text-ink text-lg">${payload?.grandTotal.toLocaleString() ?? "—"}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-marigold/10 border border-marigold/25 p-3">
                  <p className="font-ui text-xs font-semibold text-marigold-dark text-center">
                    {payload && payload.discount > 0
                      ? `You're saving $${Math.round((payload.unitPrice * payload.qty + (payload.unit2Price ? payload.unit2Price * payload.qty : 0)) * (payload.discount / 100)).toLocaleString()} on this order!`
                      : "Add 5+ tickets for group discounts up to 15% off"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
