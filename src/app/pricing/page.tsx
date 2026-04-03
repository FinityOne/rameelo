import Link from "next/link";

// ─── Data ───────────────────────────────────────────────────────────────────

const trustStats = [
  { value: "500+", label: "Active organizers" },
  { value: "$4.2M", label: "Tickets sold this year" },
  { value: "98%", label: "Organizer satisfaction" },
  { value: "72 hrs", label: "Avg. time to first sale" },
];

const plans = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Perfect for first-time organizers",
    price: null,
    priceNote: "Free to list",
    fee: "5% per ticket sold",
    feeNote: "No upfront cost. Pay only when you sell.",
    cta: "List Your First Event",
    ctaHref: "#get-started",
    highlight: false,
    features: [
      "1 active event at a time",
      "Up to 300 tickets per event",
      "Standard event listing page",
      "Rameelo checkout & payment processing",
      "Basic sales dashboard",
      "Email confirmation to attendees",
      "Community support",
    ],
    notIncluded: [
      "Custom branding",
      "Waitlist management",
      "Promo codes & discounts",
      "Advanced analytics",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For organizers serious about growth",
    price: 79,
    priceNote: "per month",
    fee: "2% per ticket sold",
    feeNote: "Save thousands vs. Starter at scale.",
    cta: "Start Free 30-Day Trial",
    ctaHref: "#get-started",
    highlight: true,
    badge: "Most Popular",
    features: [
      "Unlimited active events",
      "Unlimited tickets per event",
      "Custom branded event page",
      "Waitlist management",
      "Promo codes & early-bird pricing",
      "Real-time analytics & reporting",
      "Attendee check-in app (iOS & Android)",
      "Dedicated onboarding call",
      "Priority email & phone support",
      "Rameelo featured placement",
    ],
    notIncluded: [
      "White-label checkout",
      "API access",
      "Dedicated account manager",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For large-scale productions & associations",
    price: null,
    priceNote: "Custom pricing",
    fee: "Negotiated flat fee",
    feeNote: "Volume discounts for 1,000+ ticket events.",
    cta: "Talk to Our Team",
    ctaHref: "#get-started",
    highlight: false,
    features: [
      "Everything in Pro",
      "White-label checkout experience",
      "API & webhook access",
      "Multi-event bundle management",
      "Custom contract & SLA",
      "Dedicated account manager",
      "On-site event support option",
      "Co-marketing opportunities",
      "Custom integrations",
    ],
    notIncluded: [],
  },
];

const benefits = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Built-in Audience of 80,000+",
    body: "Your event is instantly visible to tens of thousands of South Asians actively searching for Garba and Navratri events near them. No ad budget needed to get discovered.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Real-Time Sales Dashboard",
    body: "Watch tickets sell in real time. Track revenue by session, day, or ticket tier. Export attendee lists in one click. Know exactly where you stand at every moment.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Fast, Secure Payouts",
    body: "Revenue lands in your bank account within 2 business days of your event. No chasing invoices, no payment hold drama. Stripe-powered security on every transaction.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    title: "Built-In Marketing Tools",
    body: "Promo codes, early-bird pricing tiers, referral tracking, and social share cards — all built in. Run a waitlist that converts into a surge of sales the moment tickets go live.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Fraud Protection & Buyer Verification",
    body: "Our platform verifies every buyer identity to prevent scalping and fraudulent chargebacks. You focus on the event — we handle the risk.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: "Humans On Call, Not Bots",
    body: "Pro and Enterprise organizers get a direct line to our team. Event night problems get resolved in minutes — not hours. We've been to Garba. We understand what's at stake.",
  },
];

const comparisons = [
  {
    category: "Event Management",
    rows: [
      { feature: "Active events", starter: "1", pro: "Unlimited", enterprise: "Unlimited" },
      { feature: "Tickets per event", starter: "Up to 300", pro: "Unlimited", enterprise: "Unlimited" },
      { feature: "Ticket tiers (GA, VIP, etc.)", starter: false, pro: true, enterprise: true },
      { feature: "Waitlist management", starter: false, pro: true, enterprise: true },
      { feature: "Multi-day / multi-session events", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    category: "Marketing & Sales",
    rows: [
      { feature: "Promo codes & discounts", starter: false, pro: true, enterprise: true },
      { feature: "Early-bird pricing", starter: false, pro: true, enterprise: true },
      { feature: "Referral tracking", starter: false, pro: true, enterprise: true },
      { feature: "Featured placement on Rameelo", starter: false, pro: true, enterprise: true },
      { feature: "Co-marketing campaigns", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "Analytics & Data",
    rows: [
      { feature: "Basic sales dashboard", starter: true, pro: true, enterprise: true },
      { feature: "Real-time analytics", starter: false, pro: true, enterprise: true },
      { feature: "Attendee data export (CSV)", starter: false, pro: true, enterprise: true },
      { feature: "Custom reporting", starter: false, pro: false, enterprise: true },
      { feature: "API & webhook access", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "Support & Operations",
    rows: [
      { feature: "Check-in app (iOS & Android)", starter: false, pro: true, enterprise: true },
      { feature: "Attendee self-service portal", starter: true, pro: true, enterprise: true },
      { feature: "Priority support", starter: false, pro: true, enterprise: true },
      { feature: "Dedicated account manager", starter: false, pro: false, enterprise: true },
      { feature: "On-site event support", starter: false, pro: false, enterprise: "Optional" },
    ],
  },
];

const faqs = [
  {
    q: "Is there a contract or minimum commitment?",
    a: "No. Starter is free forever. Pro is month-to-month — cancel any time. Enterprise contracts are typically annual but we work with your timeline.",
  },
  {
    q: "When do I get paid after my event?",
    a: "Payouts are deposited to your bank account within 2 business days after your event ends. For multi-day events, you can request a mid-event payout at no additional charge.",
  },
  {
    q: "What happens if I need to cancel or postpone?",
    a: "We make refunds simple. You can issue full or partial refunds from your dashboard. For postponements, attendees are automatically notified and can transfer their ticket to the new date.",
  },
  {
    q: "Can I use my own payment processor?",
    a: "Pro and Enterprise plans support custom Stripe Connect accounts so revenue flows directly to you. Starter events use Rameelo's managed payment system.",
  },
  {
    q: "Do attendees pay a booking fee on top of my ticket price?",
    a: "On Starter, a small convenience fee is passed to the buyer. On Pro and Enterprise, you choose whether to absorb the fee or pass it on — fully configurable.",
  },
  {
    q: "How quickly can I get my event live?",
    a: "Most organizers have their event page live in under 20 minutes. Our setup wizard walks you through everything: ticket tiers, descriptions, payout info, and go-live.",
  },
];

const organizerTestimonials = [
  {
    name: "Rohan Shah",
    role: "Founder, Midwest Navratri Festival",
    city: "Chicago, IL",
    avatar: "RS",
    quote:
      "We moved from Eventbrite to Rameelo two years ago and never looked back. Our reach in the South Asian community doubled in the first season. The platform just gets it — it speaks our language, literally and figuratively.",
    stat: "2× ticket sales in year one",
  },
  {
    name: "Kavya Nair",
    role: "Director, East Coast Garba Association",
    city: "New Jersey",
    avatar: "KN",
    quote:
      "The Pro analytics alone are worth it. I can see in real time which promo codes are working, where buyers are coming from, and when to push marketing. We sold out our 1,500-person event three weeks before the date.",
    stat: "Sold out 6 weeks early",
  },
  {
    name: "Sanjay Mehta",
    role: "Organizer, DFW Dandiya Dhamaka",
    city: "Dallas, TX",
    avatar: "SM",
    quote:
      "I was worried about switching platforms mid-season. The Rameelo team did a live migration call with me on a Saturday afternoon. That level of care is rare. The check-in app on event night was flawless.",
    stat: "Zero check-in delays for 900 attendees",
  },
];

// ─── Components ─────────────────────────────────────────────────────────────

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TableCell({ value }: { value: boolean | string }) {
  if (value === true)
    return (
      <td className="py-3.5 px-4 text-center">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand/10 text-brand">
          <CheckIcon />
        </span>
      </td>
    );
  if (value === false)
    return (
      <td className="py-3.5 px-4 text-center">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cream-dark text-ink-muted">
          <CrossIcon />
        </span>
      </td>
    );
  return (
    <td className="py-3.5 px-4 text-center">
      <span className="text-xs font-semibold text-brand">{value}</span>
    </td>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="bg-cream">
      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: "linear-gradient(145deg, #6e1a2e 0%, #4a1238 45%, #2e1a47 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 60%, #c29f5d 0%, transparent 45%), radial-gradient(circle at 85% 25%, #c29f5d 0%, transparent 40%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-gold text-xs font-semibold px-4 py-1.5 rounded-full mb-7 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" />
            For Event Organizers
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.08] mb-5">
            Sell More Tickets.
            <br />
            <span className="text-gold">Keep More Revenue.</span>
          </h1>
          <p className="text-white/65 text-lg max-w-2xl mx-auto leading-relaxed mb-9">
            Rameelo is the only ticketing platform built specifically for South Asian cultural events. Stop
            fighting generic tools — use one that already speaks to your audience.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#plans"
              className="bg-cream text-brand font-bold px-8 py-3.5 rounded-lg hover:bg-white transition-colors text-sm shadow-md"
            >
              See Plans & Pricing
            </a>
            <a
              href="#get-started"
              className="border border-white/25 text-white/90 font-semibold px-8 py-3.5 rounded-lg hover:bg-white/10 transition-colors text-sm"
            >
              Talk to Our Team
            </a>
          </div>
          <p className="text-white/35 text-xs mt-5">No credit card required · Cancel anytime</p>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-14"
          style={{ background: "#faf3e0", clipPath: "ellipse(55% 100% at 50% 100%)" }}
        />
      </section>

      {/* ══ TRUST BAR ═════════════════════════════════════════════════════════ */}
      <section className="bg-cream pt-10 pb-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-ink-muted text-xs uppercase tracking-widest font-semibold mb-8">
            Trusted by organizers in 120+ US cities
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-cream-dark rounded-2xl overflow-hidden border border-cream-dark">
            {trustStats.map((s) => (
              <div key={s.label} className="bg-cream py-7 px-6 text-center">
                <p className="text-3xl font-extrabold text-brand tracking-tight">{s.value}</p>
                <p className="text-ink-muted text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING PLANS ═════════════════════════════════════════════════════ */}
      <section id="plans" className="bg-cream-surface py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-gold-dark text-xs font-bold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-4xl font-extrabold text-ink tracking-tight mb-3">
              Simple, Transparent Pricing
            </h2>
            <p className="text-ink-muted max-w-lg mx-auto text-base">
              Start for free. Upgrade when you need more. No hidden fees, no surprise charges on event night.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl flex flex-col transition-all ${
                  plan.highlight
                    ? "shadow-xl"
                    : "border border-cream-dark bg-white hover:shadow-sm"
                }`}
                style={
                  plan.highlight
                    ? { background: "linear-gradient(160deg, #6e1a2e 0%, #2e1a47 100%)" }
                    : undefined
                }
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                    <span
                      className="text-xs font-bold px-4 py-1.5 rounded-full"
                      style={{ background: "#c29f5d", color: "#1a1a1a" }}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className={`p-7 pb-6 ${plan.badge ? "pt-8" : ""}`}>
                  <p
                    className={`text-xs font-bold uppercase tracking-widest mb-1 ${
                      plan.highlight ? "text-gold" : "text-gold-dark"
                    }`}
                  >
                    {plan.name}
                  </p>
                  <p className={`text-sm mb-6 ${plan.highlight ? "text-white/60" : "text-ink-muted"}`}>
                    {plan.tagline}
                  </p>

                  {/* Price display */}
                  <div className="mb-1">
                    {plan.price ? (
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={`text-5xl font-extrabold tracking-tight ${
                            plan.highlight ? "text-white" : "text-ink"
                          }`}
                        >
                          ${plan.price}
                        </span>
                        <span className={`text-sm ${plan.highlight ? "text-white/50" : "text-ink-muted"}`}>
                          / mo
                        </span>
                      </div>
                    ) : (
                      <p
                        className={`text-3xl font-extrabold tracking-tight ${
                          plan.highlight ? "text-white" : "text-ink"
                        }`}
                      >
                        {plan.priceNote}
                      </p>
                    )}
                  </div>

                  <div
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 ${
                      plan.highlight
                        ? "bg-white/10 text-white/80"
                        : "bg-brand-faint text-brand"
                    }`}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    {plan.fee}
                  </div>

                  <a
                    href={plan.ctaHref}
                    className={`block w-full text-center text-sm font-bold py-3 rounded-lg transition-colors ${
                      plan.highlight
                        ? "bg-cream text-brand hover:bg-white"
                        : plan.id === "enterprise"
                        ? "border border-brand text-brand hover:bg-brand-faint"
                        : "bg-brand text-white hover:bg-brand-hover"
                    }`}
                  >
                    {plan.cta}
                  </a>

                  {plan.highlight && (
                    <p className="text-center text-white/35 text-xs mt-2.5">
                      30-day free trial · No credit card
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className={`mx-7 h-px ${plan.highlight ? "bg-white/15" : "bg-cream-dark"}`} />

                {/* Features list */}
                <div className="p-7 pt-6 flex-1">
                  <p
                    className={`text-xs font-bold uppercase tracking-widest mb-4 ${
                      plan.highlight ? "text-white/50" : "text-ink-muted"
                    }`}
                  >
                    Included
                  </p>
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            plan.highlight ? "bg-white/15 text-white" : "bg-brand/10 text-brand"
                          }`}
                        >
                          <CheckIcon className="w-2.5 h-2.5" />
                        </span>
                        <span
                          className={`text-sm ${plan.highlight ? "text-white/80" : "text-ink-secondary"}`}
                        >
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {plan.notIncluded.length > 0 && (
                    <>
                      <p
                        className={`text-xs font-bold uppercase tracking-widest mt-5 mb-3 ${
                          plan.highlight ? "text-white/30" : "text-ink-muted/50"
                        }`}
                      >
                        Not included
                      </p>
                      <ul className="space-y-2">
                        {plan.notIncluded.map((f) => (
                          <li key={f} className="flex items-start gap-2.5">
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                plan.highlight ? "bg-white/8 text-white/25" : "bg-cream-dark text-ink-muted/50"
                              }`}
                            >
                              <CrossIcon />
                            </span>
                            <span
                              className={`text-sm ${
                                plan.highlight ? "text-white/30" : "text-ink-muted/60"
                              }`}
                            >
                              {f}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Savings callout */}
          <div className="mt-8 bg-gold-faint border border-gold/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gold-dark shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-ink-secondary text-sm">
                <span className="font-bold text-ink">At 500 tickets × $40</span> — Pro saves you{" "}
                <span className="font-bold text-brand">$600</span> in fees vs. Starter. Pro pays for itself
                in a single mid-size event.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ BENEFITS ══════════════════════════════════════════════════════════ */}
      <section className="bg-cream py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-gold-dark text-xs font-bold uppercase tracking-widest mb-3">Why Rameelo</p>
            <h2 className="text-4xl font-extrabold text-ink tracking-tight mb-3">
              Everything You Need to Run a
              <br className="hidden sm:block" />
              <span className="text-brand"> Flawless Event</span>
            </h2>
            <p className="text-ink-muted max-w-lg mx-auto text-base">
              Generic platforms weren't built for cultural events. We were.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="bg-white border border-cream-dark rounded-2xl p-6 hover:border-brand/25 hover:shadow-sm transition-all"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 text-brand"
                  style={{ background: "rgba(110, 26, 46, 0.08)" }}
                >
                  {b.icon}
                </div>
                <h3 className="font-bold text-ink text-base tracking-tight mb-2">{b.title}</h3>
                <p className="text-ink-muted text-sm leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ORGANIZER TESTIMONIALS ════════════════════════════════════════════ */}
      <section className="py-20 text-white" style={{ background: "#2e1a47" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-gold text-xs font-bold uppercase tracking-widest mb-3">Organizer Stories</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Real Organizers. Real Results.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {organizerTestimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl p-6 flex flex-col"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
              >
                <svg className="w-6 h-6 text-gold/40 mb-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>

                <p className="text-white/75 text-sm leading-relaxed flex-1 mb-5">{t.quote}</p>

                {/* Stat badge */}
                <div
                  className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full text-xs font-bold mb-5"
                  style={{ background: "rgba(194,159,93,0.2)", color: "#c29f5d", border: "1px solid rgba(194,159,93,0.3)" }}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                  {t.stat}
                </div>

                <div
                  className="flex items-center gap-3 pt-4"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg, #6e1a2e, #2e1a47)" }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-white/40 text-xs">{t.role} · {t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURE COMPARISON TABLE ══════════════════════════════════════════ */}
      <section className="bg-cream py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-gold-dark text-xs font-bold uppercase tracking-widest mb-3">Compare Plans</p>
            <h2 className="text-3xl font-extrabold text-ink tracking-tight">Full Feature Breakdown</h2>
          </div>

          <div className="bg-white border border-cream-dark rounded-2xl overflow-hidden shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-4 bg-cream-surface border-b border-cream-dark">
              <div className="p-5 col-span-1" />
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`p-5 text-center border-l border-cream-dark ${
                    plan.highlight ? "bg-brand/5" : ""
                  }`}
                >
                  <p
                    className={`text-sm font-bold tracking-tight ${
                      plan.highlight ? "text-brand" : "text-ink"
                    }`}
                  >
                    {plan.name}
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {plan.price ? `$${plan.price}/mo` : plan.priceNote}
                  </p>
                </div>
              ))}
            </div>

            {/* Table body */}
            {comparisons.map((group, gi) => (
              <div key={group.category}>
                <div className="bg-cream-surface border-b border-cream-dark px-5 py-2.5">
                  <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">
                    {group.category}
                  </p>
                </div>
                {group.rows.map((row, ri) => (
                  <table
                    key={row.feature}
                    className={`w-full ${
                      ri < group.rows.length - 1 ? "border-b border-cream-dark/60" : ""
                    } ${gi < comparisons.length - 1 && ri === group.rows.length - 1 ? "border-b border-cream-dark" : ""}`}
                  >
                    <tbody>
                      <tr className="hover:bg-cream/40 transition-colors">
                        <td className="py-3.5 px-5 text-sm text-ink-secondary w-2/5">{row.feature}</td>
                        <TableCell value={row.starter} />
                        <td className="py-3.5 px-4 text-center bg-brand/[0.03] border-x border-brand/8">
                          {row.pro === true ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand/10 text-brand">
                              <CheckIcon />
                            </span>
                          ) : row.pro === false ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cream-dark text-ink-muted">
                              <CrossIcon />
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-brand">{row.pro}</span>
                          )}
                        </td>
                        <TableCell value={row.enterprise} />
                      </tr>
                    </tbody>
                  </table>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-cream-surface py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-gold-dark text-xs font-bold uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl font-extrabold text-ink tracking-tight">Common Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white border border-cream-dark rounded-xl p-6 hover:border-brand/20 hover:shadow-sm transition-all"
              >
                <p className="font-bold text-ink text-sm mb-2 tracking-tight">{faq.q}</p>
                <p className="text-ink-muted text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-ink-muted text-sm mt-8">
            More questions?{" "}
            <a href="#get-started" className="text-brand font-semibold hover:text-brand-hover transition-colors">
              Talk to our team
            </a>
          </p>
        </div>
      </section>

      {/* ══ FINAL CTA ═════════════════════════════════════════════════════════ */}
      <section
        id="get-started"
        className="relative overflow-hidden text-white py-24"
        style={{ background: "linear-gradient(145deg, #6e1a2e 0%, #4a1238 50%, #2e1a47 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle at 80% 50%, #c29f5d 0%, transparent 55%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-4xl block mb-6">🪔</span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Your Next Navratri Starts Here
          </h2>
          <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Join 500+ organizers who run their events on Rameelo. List your first event in under 20 minutes,
            free — no credit card needed.
          </p>

          {/* Sign-up form */}
          <div
            className="rounded-2xl p-7 max-w-md mx-auto mb-8"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <p className="font-bold text-white text-base mb-5">Start for free today</p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Your name"
                className="w-full rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none text-sm"
                style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.13)" }}
              />
              <input
                type="email"
                placeholder="Email address"
                className="w-full rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none text-sm"
                style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.13)" }}
              />
              <input
                type="text"
                placeholder="Event name or organization"
                className="w-full rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none text-sm"
                style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.13)" }}
              />
              <button
                className="w-full font-bold py-3.5 rounded-xl transition-colors text-sm"
                style={{ background: "#faf3e0", color: "#6e1a2e" }}
              >
                Create Free Account
              </button>
            </div>
            <p className="text-white/30 text-xs text-center mt-3">
              No credit card · Cancel anytime · Setup in 20 minutes
            </p>
          </div>

          <p className="text-white/40 text-sm">
            Need Enterprise pricing?{" "}
            <a href="mailto:organizers@rameelo.com" className="text-gold underline underline-offset-2 hover:text-gold-light transition-colors">
              Email us directly
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
