"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createClient } from "@/lib/supabase/client";
import { saveOrder, markGroupPaid, createGroupAllocations } from "@/lib/group-orders";
import { TERMS_VERSION, TERMS_SUMMARY, TERMS_TEXT, NO_REFUND_NOTICE } from "@/lib/terms";
import { money } from "@/lib/money";
import { computeFees } from "@/lib/fees";
import { getStripe, stripeConfigured, STRIPE_TEST_MODE } from "@/lib/stripe/client";

const stripePromise = getStripe();

// Brand-matched Stripe Elements appearance.
const STRIPE_APPEARANCE = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#2E1B30",
    colorText: "#2E1B30",
    colorDanger: "#7C1F2C",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    borderRadius: "12px",
  },
};

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
  isGroupPay?: boolean;
  groupPayerName?: string;        // the group member being paid as
  groupPayerHasAccount?: boolean; // that member already has a Rameelo account
}

type PaymentMethod = "card" | "ach";

// Fee math is centralized in src/lib/fees.ts — 3% Rameelo fee always on FACE value.
const CARD_FEE_PCT = 0.05; // kept for the "+5% processing fee" toggle label

function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

// Privacy masks for paying as an account-holding group member.
function maskLastName(last: string): string {
  const l = (last ?? "").trim();
  if (!l) return "";
  return `${l[0]}${"•".repeat(Math.max(l.length - 1, 1))}`;
}

// ── Stripe payment section (lives inside <Elements>) ──────────────────────────
// Renders the Payment Element + the "Complete Purchase" button. Confirms the
// payment with Stripe, then hands off to the parent's finalizeOrder() which
// records the order exactly as before.
function StripePaymentSection({
  grandTotalLabel, billingName, email, disabled, onPaid,
}: {
  grandTotalLabel: string;
  billingName: string;
  email: string;
  disabled: boolean;
  onPaid: () => Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || disabled) return;
    setProcessing(true);
    setError("");

    // Confirm the payment. `redirect: "if_required"` keeps the buyer on-page for
    // cards (and instant bank verification); only redirects if truly necessary.
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/confirmation`,
        payment_method_data: {
          billing_details: { name: billingName, email },
        },
      },
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment could not be completed. Please try again.");
      setProcessing(false);
      return;
    }

    // succeeded = card cleared; processing = ACH initiated (settles in days, but
    // the ticket is reserved now — matching the existing ACH copy).
    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      await onPaid();
      return;
    }
    setError("Payment didn't complete. Please try again.");
    setProcessing(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* We already collected name + email in the contact step, so hide them here
          and pass them at confirm (also satisfies the ACH mandate requirement). */}
      <PaymentElement options={{ layout: "tabs", fields: { billingDetails: { name: "never", email: "never" } } }} />

      {error && (
        <div className="rounded-xl bg-durga/8 border border-durga/20 px-4 py-3">
          <p className="font-ui text-sm text-durga">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || disabled || processing}
        className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all flex items-center justify-center gap-2 ${!disabled && stripe && !processing ? "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-sm" : "bg-ivory-200 text-ink-muted cursor-not-allowed"}`}
      >
        {processing ? "Processing…" : `Complete Purchase · $${grandTotalLabel}`}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<CheckoutPayload | null>(null);
  const [step, setStep] = useState<"contact" | "payment">("contact");
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = "Checkout | Rameelo"; }, []);

  // Auth
  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Contact
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  // Group payer: the email is fixed to the chosen group member and can't be edited.
  const [lockedEmail, setLockedEmail] = useState<string | null>(null);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");

  // Stripe: clientSecret for the current PaymentIntent (recreated per method/amount)
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentError, setIntentError]   = useState("");

  // Terms acceptance + IP (for dispute evidence)
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [showTerms, setShowTerms]     = useState(false);
  const [clientIp, setClientIp]       = useState<string | null>(null);
  useEffect(() => {
    fetch("https://api.ipify.org?format=json").then(r => r.json()).then((d: { ip?: string }) => setClientIp(d.ip ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    let groupLockedEmail: string | null = null;
    try {
      const raw = localStorage.getItem("rameelo_checkout");
      if (raw) {
        const parsed = JSON.parse(raw) as CheckoutPayload;
        setPayload(parsed);
        // Group payment: lock the email to the selected group member's email.
        if (parsed.isGroupPay && parsed.groupEmail) {
          groupLockedEmail = parsed.groupEmail;
          setLockedEmail(parsed.groupEmail);
          setEmail(parsed.groupEmail);
        }
        // Paying as a member who already has an account → everything's on file:
        // prefill their name and jump straight to payment (details shown masked).
        if (parsed.isGroupPay && parsed.groupPayerHasAccount && parsed.groupPayerName) {
          const [f, ...rest] = parsed.groupPayerName.trim().split(" ");
          setFirstName(f ?? "");
          setLastName(rest.join(" "));
          setStep("payment");
        }
      }
    } catch {}

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setAuthedUserId(user.id);
      setIsSignedIn(true);
      // Signed-in buyers don't re-enter contact info — jump straight to payment
      // (their details are shown there; the back arrow returns to the form).
      setStep("payment");
      supabase
        .from("profiles")
        .select("first_name, last_name, email, phone")
        .eq("id", user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.first_name) setFirstName(profile.first_name);
          if (profile?.last_name)  setLastName(profile.last_name);
          // Don't override a locked group-payer email with the account's email.
          if (!groupLockedEmail && (profile?.email || user.email)) setEmail(profile?.email || user.email || "");
          if (profile?.phone) setPhoneDigits(profile.phone.replace(/\D/g, "").slice(0, 10));
        });
    });
  }, []);

  const subtotal = payload?.subtotalAfterDiscount ?? payload?.grandTotal ?? 0;
  // Face value (pre-discount) = discounted subtotal + the discount that was applied.
  // The 3% Rameelo fee is charged on this face value regardless of the discount.
  const faceSubtotal = subtotal + (payload?.discountAmount ?? 0);
  const { rameeloFee, processingFee, grandTotal } = computeFees(faceSubtotal, subtotal, paymentMethod);
  const isFree = grandTotal <= 0; // free tickets skip Stripe entirely

  // Paying as a group member who has an account: lock + mask their contact details
  // (the purchaser may not be them). Doesn't apply when the buyer is signed in.
  const groupPayerLocked = !!payload?.isGroupPay && !!payload?.groupPayerHasAccount && !isSignedIn;

  const contactValid = firstName && lastName && email.includes("@") && phoneDigits.length === 10;

  function handleContactNext(e: React.FormEvent) {
    e.preventDefault();
    if (contactValid) setStep("payment");
  }

  // Create / refresh the Stripe PaymentIntent whenever we're on the payment step
  // and the amount or method changes (card carries a fee, ACH doesn't).
  useEffect(() => {
    if (step !== "payment" || !payload || isFree || !stripeConfigured) return;
    let cancelled = false;
    setClientSecret(null);
    setIntentError("");
    fetch("/api/checkout/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(grandTotal * 100),
        paymentMethod,
        email,
        eventId: payload.eventId,
        tierId: payload.tierId,
        groupId: payload.groupId,
        qty: payload.qty,
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.clientSecret) setClientSecret(d.clientSecret);
        else setIntentError(d.error ?? "Could not start payment.");
      })
      .catch(() => { if (!cancelled) setIntentError("Could not start payment."); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, paymentMethod, grandTotal, isFree, payload?.eventId]);

  // Records the order after a successful (or processing, for ACH) Stripe payment —
  // or immediately for free tickets. Everything downstream (group allocation,
  // confirmation email, redirect) is unchanged from the prior flow.
  async function finalizeOrder() {
    if (!payload) return;
    setLoading(true);

    const isTest = STRIPE_TEST_MODE;

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
      isTest,
      purchaseIp: clientIp,
      termsVersion: TERMS_VERSION,
      termsAcceptedIp: clientIp,
    });

    // One-payer group model: this single order covers everyone, so mark the
    // whole group paid, split the tickets into per-member allocations the others
    // claim, and email each of them a claim link.
    if (orderId && payload.groupId) {
      await markGroupPaid({ groupId: payload.groupId, orderId });
      if (payload.isGroupPay) {
        await createGroupAllocations(orderId);
        fetch("/api/group-tickets-distributed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        }).catch(() => { /* non-blocking — claim emails shouldn't block confirmation */ });
      }
    }

    // Send the buyer their order confirmation / receipt (non-blocking).
    if (orderId) {
      fetch("/api/order-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      }).catch(() => { /* non-blocking — receipt email shouldn't block confirmation */ });
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
      isGroupPay: payload.isGroupPay ?? false,
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
      {/* Test-environment banner — only shows when running on Stripe TEST keys */}
      {STRIPE_TEST_MODE && (
        <div className="bg-marigold text-aubergine text-center py-1.5 px-4">
          <p className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">
            ⚠ Test environment · Stripe test mode — no real charges
          </p>
        </div>
      )}

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
                  {lockedEmail ? (
                    <>
                      <div className={`${inputCls} flex items-center justify-between gap-2 bg-ivory/60 cursor-not-allowed`}>
                        <span className="truncate text-ink">{lockedEmail}</span>
                        <svg className="w-4 h-4 text-ink-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.105-.895-2-2-2H8m8 2V7a4 4 0 00-8 0v4m-1 0h10a1 1 0 011 1v7a1 1 0 01-1 1H7a1 1 0 01-1-1v-7a1 1 0 011-1z" /></svg>
                      </div>
                      <p className="font-mono text-[10px] text-ink-muted mt-1.5">You&rsquo;re paying for the group — tickets go to each member.</p>
                    </>
                  ) : (
                    <>
                      <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="priya@example.com" className={inputCls} required />
                      <p className="font-mono text-[10px] text-ink-muted mt-1.5">Tickets sent here as PDF + QR code</p>
                    </>
                  )}
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
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  {!groupPayerLocked && (
                    <button type="button" onClick={() => setStep("contact")} className="w-9 h-9 rounded-xl border border-ivory-200 flex items-center justify-center text-ink-muted hover:border-aubergine hover:text-aubergine transition-all">←</button>
                  )}
                  <div>
                    <h2 className="font-display font-bold text-ink text-xl">Payment details</h2>
                    <p className="font-ui text-ink-muted text-sm">
                      {firstName} {groupPayerLocked ? maskLastName(lastName) : lastName} · {email}
                    </p>
                  </div>
                </div>

                {/* Paying as an account-holding member — details on file, masked for privacy */}
                {groupPayerLocked && (
                  <div className="rounded-2xl border border-ivory-200 bg-ivory/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">Paying as</p>
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-peacock font-bold">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Rameelo member
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-ui text-sm text-ink">{firstName} {maskLastName(lastName)}</p>
                      <p className="font-ui text-sm text-ink-muted">{email}</p>
                      <p className="font-ui text-sm text-ink-muted">+1 (•••) •••-••••</p>
                    </div>
                    <p className="font-mono text-[10px] text-ink-muted mt-2.5 leading-relaxed">
                      This member already has an account — their details are on file and hidden for privacy. Their tickets go straight to their wallet.
                    </p>
                  </div>
                )}

                {/* ── Payment method toggle (free tickets skip payment) ── */}
                {!isFree && (
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
                            <p className="font-mono text-[9px] text-peacock font-bold pl-6 mt-0.5">Save ${money(processingFee)}</p>
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
                )}

                {/* Required Terms acceptance */}
                <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${agreedTerms ? "border-aubergine/30 bg-aubergine/5" : "border-ivory-200 hover:border-aubergine/20"}`}>
                  <input type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)} className="mt-0.5 w-4 h-4 accent-aubergine shrink-0" />
                  <span className="font-ui text-xs text-ink-muted leading-relaxed">
                    I have read and agree to the{" "}
                    <button type="button" onClick={() => setShowTerms(true)} className="font-semibold text-aubergine hover:underline">Terms &amp; Conditions</button>.{" "}
                    {TERMS_SUMMARY}
                  </span>
                </label>

                {/* ── Payment ── */}
                {isFree ? (
                  <button
                    type="button"
                    onClick={() => { if (agreedTerms) finalizeOrder(); }}
                    disabled={!agreedTerms}
                    className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all ${agreedTerms ? "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-sm" : "bg-ivory-200 text-ink-muted cursor-not-allowed"}`}
                  >
                    Reserve {payload?.qty ?? 1} Free Ticket{(payload?.qty ?? 1) > 1 ? "s" : ""} →
                  </button>
                ) : !stripeConfigured ? (
                  <div className="rounded-xl bg-durga/8 border border-durga/20 px-4 py-3">
                    <p className="font-ui text-sm text-durga">Payments aren&rsquo;t set up yet. Add your Stripe keys to enable checkout.</p>
                  </div>
                ) : intentError ? (
                  <div className="rounded-xl bg-durga/8 border border-durga/20 px-4 py-3">
                    <p className="font-ui text-sm text-durga">{intentError}</p>
                  </div>
                ) : clientSecret ? (
                  <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
                    <StripePaymentSection
                      grandTotalLabel={money(grandTotal)}
                      billingName={`${firstName} ${lastName}`.trim()}
                      email={email}
                      disabled={!agreedTerms}
                      onPaid={finalizeOrder}
                    />
                  </Elements>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-7 h-7 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
                  </div>
                )}

                <div className="flex items-center gap-3 p-4 rounded-xl bg-peacock/5 border border-peacock/20">
                  <svg className="w-5 h-5 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <p className="font-ui text-xs text-ink-muted">Payments are processed securely by Stripe. Rameelo never sees or stores your full card or bank details.</p>
                </div>

                <p className="text-center font-mono text-[10px] text-ink-muted">Acceptance is recorded with version {TERMS_VERSION}, a timestamp, and your IP for your protection and ours.</p>
              </div>
            )}

            {/* Terms modal */}
            {showTerms && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowTerms(false)}>
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[85dvh] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="px-5 py-4 border-b border-ivory-200 flex items-center justify-between shrink-0">
                    <div>
                      <p className="font-display font-bold text-ink text-base" style={{ letterSpacing: "-0.015em" }}>Terms &amp; Conditions</p>
                      <p className="font-mono text-[10px] text-ink-muted">Version {TERMS_VERSION}</p>
                    </div>
                    <button onClick={() => setShowTerms(false)} className="w-8 h-8 rounded-xl border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                  <div className="px-5 py-4 overflow-y-auto">
                    <pre className="font-ui text-xs text-ink whitespace-pre-wrap break-words leading-relaxed">{TERMS_TEXT}</pre>
                  </div>
                  <div className="px-5 py-3 border-t border-ivory-200 shrink-0">
                    <button onClick={() => { setAgreedTerms(true); setShowTerms(false); }} className="w-full py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:bg-aubergine/90 transition-colors">Agree &amp; close</button>
                  </div>
                </div>
              </div>
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
                      <span className="font-ui text-ink">${money((payload.unitPrice * payload.qty))}</span>
                    </div>
                    {payload.discount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="font-ui text-peacock">Group discount ({payload.discount}%)</span>
                        <span className="font-ui text-peacock">−${money(payload.discountAmount)}</span>
                      </div>
                    )}
                    {subtotal !== payload.unitPrice * payload.qty && (
                      <div className="flex justify-between text-xs border-t border-ivory-200 pt-1.5">
                        <span className="font-ui text-ink-muted">Subtotal</span>
                        <span className="font-ui text-ink">${money(subtotal)}</span>
                      </div>
                    )}

                    {/* Fee breakdown */}
                    <div className="rounded-lg bg-ivory p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="font-ui text-ink-muted">Rameelo fee (3%)</span>
                        <span className="font-ui text-ink-muted">${money(rameeloFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <div>
                          <span className="font-ui text-ink-muted">Processing fee</span>
                          {paymentMethod === "card" ? (
                            <p className="font-mono text-[9px] text-ink-muted/70">5% · credit/debit card</p>
                          ) : (
                            <p className="font-mono text-[9px] text-peacock">Free · bank transfer</p>
                          )}
                        </div>
                        <span className={`font-ui shrink-0 ${paymentMethod === "ach" ? "text-peacock font-semibold" : "text-ink-muted"}`}>
                          {paymentMethod === "ach" ? "FREE" : `$${money(processingFee)}`}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-ivory-200 pt-2 flex justify-between">
                      <span className="font-display font-bold text-ink">Total</span>
                      <span className="font-display font-bold text-ink text-lg">${money(grandTotal)}</span>
                    </div>
                    <p className="font-ui text-[10px] text-ink-muted/70 text-center pt-1">{NO_REFUND_NOTICE}</p>
                  </div>
                )}

                {/* ACH savings callout */}
                {paymentMethod === "ach" && processingFee > 0 && (
                  <div className="rounded-xl bg-peacock/10 border border-peacock/25 p-3">
                    <p className="font-ui text-xs font-semibold text-peacock text-center">
                      Saving ${money(processingFee)} by paying with bank transfer!
                    </p>
                  </div>
                )}

                {payload && (payload.discount ?? 0) > 0 && (
                  <div className="rounded-xl bg-marigold/10 border border-marigold/25 p-3">
                    <p className="font-ui text-xs font-semibold text-marigold-dark text-center">
                      Saving ${money((payload.discountAmount ?? 0))} with group pricing!
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
