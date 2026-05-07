import Link from "next/link";
import { Eyebrow, Button, Badge } from "@/components/ui";

// ─── Data ─────────────────────────────────────────────────────────────────────

const plans = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Free forever. No upfront cost.",
    price: null,
    priceNote: "Free to list",
    fee: "5% per ticket",
    highlight: false,
    cta: "List your first event",
    ctaHref: "/organizers#get-started",
    features: [
      "1 active event at a time",
      "Up to 300 tickets per event",
      "Standard event listing page",
      "Rameelo checkout & payments",
      "Basic sales dashboard",
      "Email confirmation to attendees",
      "Group orders (basic)",
      "Community support",
    ],
    missing: [
      "Custom branding",
      "Waitlist management",
      "Promo codes & discounts",
      "Advanced analytics",
      "Sponsor dashboard",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For organizers serious about growth.",
    price: 79,
    priceNote: "per month",
    fee: "2% per ticket",
    highlight: true,
    badge: "Most popular",
    cta: "Start 30-day free trial",
    ctaHref: "/organizers#get-started",
    features: [
      "Unlimited active events",
      "Unlimited tickets per event",
      "Custom branded event page",
      "Group orders with auto follow-ups",
      "Group discount thresholds",
      "Waitlist management",
      "Promo codes & early-bird pricing",
      "Real-time analytics & reporting",
      "Sponsor dashboard & placement tools",
      "Attendee check-in app (iOS & Android)",
      "Community photo feeds for your events",
      "Featured placement on Rameelo",
      "Priority email & phone support",
      "Dedicated onboarding call",
    ],
    missing: [
      "White-label checkout",
      "API access",
      "Dedicated account manager",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For large-scale productions & associations.",
    price: null,
    priceNote: "Custom pricing",
    fee: "Negotiated flat fee",
    highlight: false,
    cta: "Talk to our team",
    ctaHref: "/organizers#get-started",
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
    missing: [],
  },
];

const comparisonRows = [
  {
    category: "Events & Tickets",
    rows: [
      { feature: "Active events", starter: "1", pro: "Unlimited", enterprise: "Unlimited" },
      { feature: "Tickets per event", starter: "Up to 300", pro: "Unlimited", enterprise: "Unlimited" },
      { feature: "Ticket tiers (GA, VIP, etc.)", starter: false, pro: true, enterprise: true },
      { feature: "Waitlist management", starter: false, pro: true, enterprise: true },
      { feature: "Multi-day / multi-session", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    category: "Group Orders",
    rows: [
      { feature: "Group order creation", starter: true, pro: true, enterprise: true },
      { feature: "Shareable group links", starter: true, pro: true, enterprise: true },
      { feature: "Automatic follow-up nudges", starter: false, pro: true, enterprise: true },
      { feature: "Discount threshold tiers", starter: false, pro: true, enterprise: true },
      { feature: "Instagram story share card", starter: false, pro: true, enterprise: true },
    ],
  },
  {
    category: "Marketing & Sales",
    rows: [
      { feature: "Promo codes & discounts", starter: false, pro: true, enterprise: true },
      { feature: "Early-bird pricing", starter: false, pro: true, enterprise: true },
      { feature: "Featured placement on Rameelo", starter: false, pro: true, enterprise: true },
      { feature: "Co-marketing campaigns", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "Community & Sponsors",
    rows: [
      { feature: "Event community photo feed", starter: false, pro: true, enterprise: true },
      { feature: "Sponsor dashboard", starter: false, pro: true, enterprise: true },
      { feature: "Sponsor placements (email, ticket, feed)", starter: false, pro: true, enterprise: true },
      { feature: "Custom sponsor reporting", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "Analytics & Data",
    rows: [
      { feature: "Basic sales dashboard", starter: true, pro: true, enterprise: true },
      { feature: "Real-time analytics", starter: false, pro: true, enterprise: true },
      { feature: "Attendee data export (CSV)", starter: false, pro: true, enterprise: true },
      { feature: "API & webhook access", starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "Support & Operations",
    rows: [
      { feature: "Check-in app (iOS & Android)", starter: false, pro: true, enterprise: true },
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
    a: "You can issue full or partial refunds from your dashboard. For postponements, attendees are automatically notified and can transfer their ticket to the new date.",
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Check() {
  return (
    <svg className="w-4 h-4 text-peacock" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function Dash() {
  return <span className="font-ui text-ink-muted/40 text-sm">—</span>;
}

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <td className="py-3.5 px-4 text-center"><Check /></td>;
  if (value === false) return <td className="py-3.5 px-4 text-center"><Dash /></td>;
  return (
    <td className="py-3.5 px-4 text-center">
      <span className="font-mono text-[10px] text-peacock tracking-widest uppercase">{value}</span>
    </td>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="bg-ivory">

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ background: "#2E1B30" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 80% 30%, rgba(245,166,35,0.15) 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <Eyebrow className="mb-6">Plans & Pricing</Eyebrow>
          <h1
            className="font-display font-bold text-white mb-4"
            style={{ fontSize: "clamp(36px, 5vw, 60px)", letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            Simple, transparent pricing.
          </h1>
          <p className="font-ui text-white/55 text-lg max-w-xl mx-auto leading-relaxed mb-8">
            Start for free. Upgrade when you need more. No hidden fees, no surprise
            charges on event night.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button href="/organizers" variant="ghost" size="md">
              ← Why Rameelo for organizers
            </Button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PLAN CARDS
      ══════════════════════════════════════════ */}
      <section className="bg-ivory-200 py-20" id="plans">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-5 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-[24px] overflow-hidden ${
                  plan.highlight ? "shadow-xl shadow-aubergine/20" : "border border-ivory-200 bg-ivory"
                }`}
                style={plan.highlight ? { background: "#2E1B30" } : undefined}
              >
                {plan.badge && (
                  <div className="absolute top-0 left-0 right-0 flex justify-center -translate-y-1/2 z-10">
                    <Badge variant="marigold">{plan.badge}</Badge>
                  </div>
                )}

                <div className={`p-7 ${plan.badge ? "pt-10" : ""}`}>
                  <p
                    className={`font-mono text-[11px] tracking-[0.12em] uppercase mb-1.5 ${
                      plan.highlight ? "text-marigold" : "text-ink-muted"
                    }`}
                  >
                    {plan.name}
                  </p>
                  <p className={`font-ui text-sm mb-6 ${plan.highlight ? "text-white/50" : "text-ink-muted"}`}>
                    {plan.tagline}
                  </p>

                  {/* Price */}
                  {plan.price ? (
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span
                        className={`font-display font-bold ${plan.highlight ? "text-white" : "text-ink"}`}
                        style={{ fontSize: "48px", letterSpacing: "-0.03em" }}
                      >
                        ${plan.price}
                      </span>
                      <span className={`font-ui text-sm ${plan.highlight ? "text-white/40" : "text-ink-muted"}`}>
                        / mo
                      </span>
                    </div>
                  ) : (
                    <p
                      className={`font-display font-bold mb-1 ${plan.highlight ? "text-white" : "text-ink"}`}
                      style={{ fontSize: "32px", letterSpacing: "-0.025em" }}
                    >
                      {plan.priceNote}
                    </p>
                  )}

                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-[10px] tracking-widest uppercase mb-6 ${
                      plan.highlight ? "bg-white/8 text-marigold" : "bg-marigold/10 text-marigold-dark"
                    }`}
                  >
                    {plan.fee}
                  </div>

                  <Link
                    href={plan.ctaHref}
                    className={`block w-full text-center font-ui text-sm font-semibold py-3 rounded-[10px] transition-colors ${
                      plan.highlight
                        ? "bg-marigold text-aubergine hover:bg-marigold-dark"
                        : plan.id === "enterprise"
                        ? "border border-aubergine/30 text-aubergine hover:bg-aubergine-faint"
                        : "bg-aubergine text-white hover:bg-aubergine-light"
                    }`}
                  >
                    {plan.cta}
                  </Link>

                  {plan.highlight && (
                    <p className="font-mono text-[10px] text-white/25 tracking-widest uppercase text-center mt-3">
                      30-day free trial · No credit card
                    </p>
                  )}
                </div>

                <div className={`mx-7 h-px ${plan.highlight ? "bg-white/10" : "bg-ivory-200"}`} />

                <div className="p-7 pt-6 flex-1">
                  <p
                    className={`font-mono text-[10px] tracking-widest uppercase mb-4 ${
                      plan.highlight ? "text-white/30" : "text-ink-muted"
                    }`}
                  >
                    Included
                  </p>
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            plan.highlight ? "bg-white/10" : "bg-peacock/10"
                          }`}
                        >
                          <svg
                            className={`w-2.5 h-2.5 ${plan.highlight ? "text-white" : "text-peacock"}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span className={`font-ui text-sm ${plan.highlight ? "text-white/75" : "text-ink-muted"}`}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {plan.missing.length > 0 && (
                    <>
                      <p
                        className={`font-mono text-[10px] tracking-widest uppercase mt-5 mb-3 ${
                          plan.highlight ? "text-white/20" : "text-ink-muted/40"
                        }`}
                      >
                        Not included
                      </p>
                      <ul className="space-y-2">
                        {plan.missing.map((f) => (
                          <li key={f} className="flex items-start gap-2.5">
                            <span className={`font-ui text-sm ${plan.highlight ? "text-white/25" : "text-ink-muted/40"}`}>
                              — {f}
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
          <div className="mt-6 bg-aubergine rounded-[16px] px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-3xl mx-auto">
            <div>
              <p className="font-mono text-[10px] text-marigold tracking-widest uppercase mb-1">
                Example · 1,000 tickets × $45
              </p>
              <p className="font-display font-semibold text-white" style={{ fontSize: "18px", letterSpacing: "-0.02em" }}>
                Pro saves you <span className="text-marigold">$1,350</span> in fees vs. Starter on a single mid-size event.
              </p>
            </div>
            <Button href="/organizers" size="sm" className="shrink-0 whitespace-nowrap">
              Compare vs. others →
            </Button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FULL COMPARISON TABLE
      ══════════════════════════════════════════ */}
      <section className="bg-ivory py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Eyebrow className="mb-4">Full breakdown</Eyebrow>
            <h2
              className="font-display font-semibold text-ink"
              style={{ fontSize: "clamp(24px, 3.5vw, 36px)", letterSpacing: "-0.022em" }}
            >
              Every feature, every plan
            </h2>
          </div>

          <div className="rounded-[16px] overflow-hidden border border-ivory-200 bg-ivory shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-4 bg-ivory-200 border-b border-ivory-200">
              <div className="col-span-1 px-5 py-4" />
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`px-4 py-4 text-center border-l border-ivory-200 ${
                    plan.highlight ? "bg-aubergine/5" : ""
                  }`}
                >
                  <p
                    className={`font-display font-semibold text-sm ${
                      plan.highlight ? "text-aubergine" : "text-ink"
                    }`}
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    {plan.name}
                  </p>
                  <p className="font-mono text-[10px] text-ink-muted tracking-widest mt-0.5">
                    {plan.price ? `$${plan.price}/mo` : plan.priceNote}
                  </p>
                </div>
              ))}
            </div>

            {comparisonRows.map((group) => (
              <div key={group.category}>
                <div className="bg-ivory-200/60 border-b border-ivory-200 px-5 py-2.5">
                  <p className="font-mono text-[10px] text-ink-muted tracking-widest uppercase">
                    {group.category}
                  </p>
                </div>
                {group.rows.map((row, ri) => (
                  <table
                    key={row.feature}
                    className={`w-full ${ri < group.rows.length - 1 ? "border-b border-ivory-200/60" : "border-b border-ivory-200"}`}
                  >
                    <tbody>
                      <tr className="hover:bg-ivory-200/30 transition-colors">
                        <td className="py-3 px-5 font-ui text-sm text-ink-muted w-2/5">{row.feature}</td>
                        <Cell value={row.starter} />
                        <td
                          className="py-3 px-4 text-center bg-aubergine/[0.03] border-x border-aubergine/8"
                        >
                          {row.pro === true ? (
                            <Check />
                          ) : row.pro === false ? (
                            <Dash />
                          ) : (
                            <span className="font-mono text-[10px] text-peacock tracking-widest uppercase">{row.pro}</span>
                          )}
                        </td>
                        <Cell value={row.enterprise} />
                      </tr>
                    </tbody>
                  </table>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════ */}
      <section className="bg-ivory-200 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Eyebrow className="mb-4">FAQ</Eyebrow>
            <h2
              className="font-display font-semibold text-ink"
              style={{ fontSize: "clamp(24px, 3.5vw, 36px)", letterSpacing: "-0.022em" }}
            >
              Common questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-ivory rounded-[16px] p-6 border border-ivory-200 hover:border-aubergine/20 transition-colors"
              >
                <p className="font-display font-semibold text-ink text-sm mb-2" style={{ letterSpacing: "-0.01em" }}>
                  {faq.q}
                </p>
                <p className="font-ui text-ink-muted text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>

          <p className="font-ui text-center text-ink-muted text-sm mt-8">
            More questions?{" "}
            <Link href="/organizers#get-started" className="text-aubergine font-semibold hover:text-aubergine-light transition-colors">
              Talk to our team
            </Link>
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-20" style={{ background: "#2E1B30" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 80% 50%, rgba(245,166,35,0.15) 0%, transparent 55%)",
          }}
        />
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <h2
            className="font-display font-bold text-white mb-4"
            style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.025em" }}
          >
            Ready to list your event?
          </h2>
          <p className="font-ui text-white/55 text-base mb-8 leading-relaxed">
            Free to start. No credit card needed. Your first event goes live in under 20 minutes.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button href="/organizers#get-started" size="lg">
              Get started free
            </Button>
            <Button href="/organizers" variant="ghost" size="lg">
              Learn about Rameelo for organizers
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
