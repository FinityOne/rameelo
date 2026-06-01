import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ui";
import { faqSchema, webPageSchema, ld } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Pricing — Rameelo | Free for Organizers",
  description: "Rameelo is completely free for organizers — keep 100% of your ticket revenue. Buyers pay a 3% platform fee plus 5% card processing (8% by card); pay by bank transfer (ACH) to skip the card fee and pay just 3%.",
  keywords: ["garba ticketing pricing", "navratri event platform free", "organizer fees garba", "rameelo pricing", "free garba ticketing"],
  alternates: { canonical: "https://rameelo.com/pricing" },
  openGraph: {
    title: "Pricing — Rameelo | Free for Organizers",
    description: "Free for organizers. 3% platform fee + 5% card processing. Pay by bank transfer to skip the card fee.",
    type: "website",
    url: "https://rameelo.com/pricing",
    siteName: "Rameelo",
    images: [{ url: "https://rameelo.com/og-default.jpg", width: 1200, height: 630, alt: "Rameelo Organizer Pricing" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free for organizers — Rameelo Garba Platform",
    description: "No monthly fee. 3% platform fee + 5% card processing. Lower fees when buyers pay by bank transfer.",
    images: ["https://rameelo.com/og-default.jpg"],
  },
};

const FEATURES = [
  { icon: "🎟️", label: "Unlimited events",          desc: "List as many events as you want, any time of year." },
  { icon: "🪙",  label: "Unlimited ticket tiers",     desc: "GA, VIP, couples, early-bird — you set the tiers and prices." },
  { icon: "👥",  label: "Group orders built in",      desc: "Automatic group discounts as crew members join. No code needed." },
  { icon: "📊",  label: "Real-time sales dashboard",  desc: "Watch ticket sales, revenue, and group orders update live." },
  { icon: "🌙",  label: "Navratri night scheduling",  desc: "Assign tickets to specific nights and track per-night capacity." },
  { icon: "🎤",  label: "Artist profile linking",     desc: "Connect your event to a verified artist page for discovery." },
  { icon: "💸",  label: "Fast payouts",               desc: "Funds hit your bank within 2 business days after your event." },
  { icon: "📧",  label: "Attendee confirmations",     desc: "Branded email tickets sent automatically to every buyer." },
  { icon: "📱",  label: "Mobile check-in",            desc: "Scan QR tickets from your phone on event night." },
  { icon: "🔍",  label: "Platform discovery",         desc: "Your event appears on Rameelo search, city pages, and the home feed." },
  { icon: "📣",  label: "Group sharing tools",        desc: "Shareable group links and invite flows your crew can use instantly." },
  { icon: "🏫",  label: "Collegiate team support",    desc: "Special flows for raas teams, competitions, and chapter orders." },
];

const FAQS = [
  {
    q: "Is Rameelo really free for organizers?",
    a: "Yes — completely. Rameelo never deducts anything from your ticket revenue. We charge a 3% platform fee directly to the buyer on top of your ticket price. You set the price, you keep the full amount.",
  },
  {
    q: "What does the 3% platform fee cover?",
    a: "The platform fee is charged to attendees and covers ticketing infrastructure, group order tools, payout processing, real-time analytics, and the full Rameelo checkout experience. Organizers pay nothing.",
  },
  {
    q: "How much do buyers pay on top of the ticket price?",
    a: "Buyers pay a 3% Rameelo platform fee automatically added at checkout. If they pay by credit or debit card, an additional 5% payment processing fee applies (totaling 8%). Buyers who pay by bank account (ACH) skip the card processing fee and pay only the 3% platform fee.",
  },
  {
    q: "When do I receive my payout?",
    a: "Funds are deposited to your connected bank account within 2 business days after your event ends. For multi-night events, we can arrange a mid-event settlement on request.",
  },
  {
    q: "Can I set group discount pricing?",
    a: "Yes. Group orders are a core feature — completely free. You can set discount thresholds (e.g., 10% off for groups of 10+) and buyers self-organize into groups using a shared link.",
  },
  {
    q: "How quickly can I get my event live?",
    a: "Most organizers publish their first event in under 20 minutes. Our event creation wizard walks you through every detail, including ticket tiers, Navratri night assignments, and payout setup.",
  },
  {
    q: "What happens if I need to cancel or postpone?",
    a: "Rameelo handles automated attendee notifications and refund flows. For postponements, attendees can transfer their ticket to the new date directly. Our team is available to help with any edge cases.",
  },
];

const pricingPage = webPageSchema({
  name: "Pricing — Rameelo | Free for Organizers",
  url: "https://rameelo.com/pricing",
  description: "Free for organizers. 3% flat platform fee. Zero buyer fees on bank transfers.",
  breadcrumbs: [
    { name: "Home", url: "https://rameelo.com" },
    { name: "Pricing", url: "https://rameelo.com/pricing" },
  ],
});
const pricingFaq = faqSchema(FAQS.map(f => ({ question: f.q, answer: f.a })));

function CheckIcon({ color = "text-peacock" }: { color?: string }) {
  return (
    <svg className={`w-4 h-4 ${color} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <div className="bg-ivory">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(pricingPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(pricingFaq) }} />

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ background: "#2E1B30" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 70% 40%, rgba(245,166,35,0.12) 0%, transparent 55%)" }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 mb-7 border border-white/12 rounded-full px-4 py-1.5 bg-white/5">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marigold opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-marigold" />
            </span>
            <span className="font-mono text-[10px] text-white/50 tracking-[0.18em] uppercase">Transparent · No surprises</span>
          </div>

          <h1 className="font-display font-black text-white mb-4" style={{ fontSize: "clamp(40px, 7vw, 80px)", letterSpacing: "-0.032em", lineHeight: 1.0 }}>
            Free for organizers.
          </h1>
          <h1 className="font-editorial italic mb-8" style={{ fontSize: "clamp(40px, 7vw, 80px)", lineHeight: 1.0, color: "#F5A623", fontWeight: 500 }}>
            Always.
          </h1>

          <p className="font-ui text-white/55 text-lg max-w-xl mx-auto leading-relaxed mb-4">
            No monthly fee. No setup cost. No contracts. We add a simple 3% platform fee on top of ticket prices — charged directly to buyers. You keep every dollar you earn.
          </p>
          <p className="font-mono text-[11px] text-white/25 uppercase tracking-widest">
            Navratri 2026 · Launch offer — lock in free forever
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEE BREAKDOWN
      ══════════════════════════════════════════ */}
      <section className="bg-ivory-200 py-16" id="fees">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Top headline */}
          <div className="text-center mb-10">
            <Eyebrow className="mb-4">How the fees work</Eyebrow>
            <h2 className="font-display font-semibold text-ink" style={{ fontSize: "clamp(26px, 3.5vw, 38px)", letterSpacing: "-0.022em" }}>
              Zero fees for organizers. Transparent fees for buyers.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">

            {/* Organizer card */}
            <div className="bg-aubergine rounded-3xl p-8 flex flex-col shadow-xl shadow-aubergine/20">
              <p className="font-mono text-[10px] uppercase tracking-widest text-marigold mb-6">For organizers</p>
              <div className="flex items-end gap-3 mb-3">
                <span className="font-display font-black text-white" style={{ fontSize: "72px", letterSpacing: "-0.04em", lineHeight: 1 }}>
                  $0
                </span>
                <span className="font-ui text-white/50 text-base mb-3">/ month</span>
              </div>
              <p className="font-ui text-white/60 text-sm mb-6 leading-relaxed">
                Free to list. Free to sell. Rameelo charges a <span className="text-marigold font-semibold">3% platform fee directly to buyers</span> on top of ticket prices. You keep 100% of your revenue.
              </p>
              <ul className="space-y-3 mt-auto">
                {[
                  "No monthly subscription",
                  "No setup or onboarding fees",
                  "No per-event charges",
                  "Keep 100% of ticket revenue",
                  "Payouts within 2 business days",
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5">
                    <CheckIcon color="text-marigold" />
                    <span className="font-ui text-sm text-white/75">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/organizers"
                className="mt-8 flex items-center justify-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-6 py-3.5 rounded-2xl hover:bg-marigold-dark transition-all shadow-lg"
              >
                Start listing for free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Buyer payment options */}
            <div className="flex flex-col gap-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1">For buyers — added on top of ticket price</p>

              {/* Credit card */}
              <div className="bg-ivory rounded-2xl border border-ivory-200 p-6 flex items-start gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-ink/5 border border-ink/8 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-ink/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-ui font-semibold text-ink text-sm">Credit or debit card</p>
                    <span className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.02em" }}>+8%</span>
                  </div>
                  <p className="font-ui text-sm text-ink-muted leading-snug">
                    3% platform fee + 5% card processing, added on top of the ticket price at checkout.
                  </p>
                </div>
              </div>

              {/* ACH bank */}
              <div className="bg-ivory rounded-2xl border-2 border-peacock/20 p-6 flex items-start gap-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full font-mono text-[9px] font-bold uppercase tracking-wide bg-peacock/10 text-peacock border border-peacock/20">
                    No card fee
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-peacock/8 border border-peacock/15 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-peacock" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1 pr-16">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-ui font-semibold text-ink text-sm">Bank account (ACH)</p>
                    <span className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.02em" }}>+3%</span>
                  </div>
                  <p className="font-ui text-sm text-ink-muted leading-snug">
                    Pay directly from your bank — skip the 5% card processing fee. Buyers pay just the 3% platform fee.
                  </p>
                </div>
              </div>

              {/* Example callout */}
              <div className="bg-white border border-ink/8 rounded-2xl p-5 shadow-sm">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink/30 mb-3">Example · $50 ticket · organizer keeps $50 either way</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center bg-ink/3 rounded-xl p-3">
                    <p className="font-display font-black text-ink text-2xl mb-0.5" style={{ letterSpacing: "-0.03em" }}>$54.00</p>
                    <p className="font-mono text-[9px] text-ink/40 uppercase tracking-wider">Buyer pays (card)</p>
                    <p className="font-mono text-[9px] text-ink/25 mt-0.5">$50 + 8% fees</p>
                  </div>
                  <div className="text-center bg-peacock/5 border border-peacock/15 rounded-xl p-3">
                    <p className="font-display font-black text-peacock text-2xl mb-0.5" style={{ letterSpacing: "-0.03em" }}>$51.50</p>
                    <p className="font-mono text-[9px] text-peacock/70 uppercase tracking-wider">Buyer pays (ACH)</p>
                    <p className="font-mono text-[9px] text-peacock/40 mt-0.5">$50 + 3% platform fee</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          WHAT'S INCLUDED
      ══════════════════════════════════════════ */}
      <section className="bg-ivory py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Eyebrow className="mb-4">Everything included</Eyebrow>
            <h2 className="font-display font-semibold text-ink mb-3" style={{ fontSize: "clamp(26px, 3.5vw, 38px)", letterSpacing: "-0.022em" }}>
              Every feature. Every organizer. No upsell.
            </h2>
            <p className="font-ui text-ink-muted text-base max-w-md mx-auto">
              There's one plan and it comes with everything we've built. No feature gating.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.label} className="bg-ivory-200 border border-ivory-200 rounded-2xl p-5 hover:border-aubergine/20 hover:bg-white transition-all group">
                <span className="text-2xl block mb-3">{f.icon}</span>
                <p className="font-ui font-semibold text-ink text-sm mb-1 group-hover:text-aubergine transition-colors" style={{ letterSpacing: "-0.01em" }}>
                  {f.label}
                </p>
                <p className="font-ui text-xs text-ink-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SAVINGS CALLOUT
      ══════════════════════════════════════════ */}
      <section className="bg-ivory-200 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-aubergine rounded-3xl px-8 py-8 grid sm:grid-cols-3 gap-6 items-center shadow-xl shadow-aubergine/15">
            <div className="sm:col-span-2">
              <p className="font-mono text-[10px] text-marigold tracking-widest uppercase mb-2">
                How it compares · 1,000 tickets at $45 each
              </p>
              <p className="font-display font-bold text-white mb-2" style={{ fontSize: "clamp(20px, 2.5vw, 26px)", letterSpacing: "-0.022em", lineHeight: 1.2 }}>
                On $45,000 in ticket sales, Rameelo organizers keep <span className="text-marigold">100%</span>. Other platforms deduct 6–10% from your revenue.
              </p>
              <p className="font-ui text-white/45 text-sm">
                That's up to <span className="text-white/70 font-medium">$4,500 more in your pocket</span> on a single mid-size Navratri compared to platforms that charge organizers.
              </p>
            </div>
            <div className="text-center sm:text-right">
              <p className="font-display font-black text-marigold" style={{ fontSize: "52px", letterSpacing: "-0.04em", lineHeight: 1 }}>3%</p>
              <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest mt-1">buyer fee. always.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════ */}
      <section className="bg-ivory py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Eyebrow className="mb-4">FAQ</Eyebrow>
            <h2 className="font-display font-semibold text-ink" style={{ fontSize: "clamp(24px, 3.5vw, 36px)", letterSpacing: "-0.022em" }}>
              Common questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-ivory-200 rounded-2xl p-6 border border-ivory-200 hover:border-aubergine/20 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-aubergine/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-aubergine" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-display font-semibold text-ink text-sm mb-2 group-hover:text-aubergine transition-colors" style={{ letterSpacing: "-0.01em" }}>
                      {faq.q}
                    </p>
                    <p className="font-ui text-ink-muted text-sm leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="font-ui text-center text-ink-muted text-sm mt-8">
            More questions?{" "}
            <Link href="/organizers" className="text-aubergine font-semibold hover:underline transition-colors">
              Talk to our team
            </Link>
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-24" style={{ background: "#2E1B30" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 60% 50%, rgba(124,31,44,0.5) 0%, transparent 55%), radial-gradient(ellipse at 20% 50%, rgba(245,166,35,0.07) 0%, transparent 50%)" }} />
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-display font-black text-white mb-4" style={{ fontSize: "clamp(32px, 5vw, 56px)", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            List your first event.<br />
            <span className="font-editorial italic font-normal" style={{ color: "#F5A623" }}>Keep what you earn.</span>
          </h2>
          <p className="font-ui text-white/50 text-base mb-10 max-w-sm mx-auto leading-relaxed">
            Free to start. Your event goes live in under 20 minutes. We only make money when you do.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/portal/organizer"
              className="flex items-center justify-center gap-2 bg-marigold text-aubergine font-display font-bold text-base px-8 py-4 rounded-2xl hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-xl shadow-marigold/20"
            >
              Create your first event — free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/organizers"
              className="flex items-center justify-center gap-2 border border-white/15 text-white/70 font-ui font-medium text-base px-8 py-4 rounded-2xl hover:bg-white/8 hover:text-white transition-all"
            >
              Learn about Rameelo for organizers
            </Link>
          </div>
          <p className="font-mono text-[10px] text-white/20 uppercase tracking-widest mt-6">
            No credit card · No contract · Cancel any time
          </p>
        </div>
      </section>
    </div>
  );
}
