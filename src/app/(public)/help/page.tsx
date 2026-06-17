import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbSchema, ld } from "@/lib/jsonld";
import HelpChat from "./HelpChat";

export const metadata: Metadata = {
  title: "Help Center — Rameelo",
  description:
    "Get answers about buying garba tickets, group orders, refunds, organizer tools, and your Rameelo account.",
  keywords: [
    "rameelo help",
    "garba ticket help",
    "navratri ticket refund",
    "rameelo support",
    "group order discount",
  ],
  alternates: { canonical: "https://rameelo.com/help" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Help Center — Rameelo",
    description:
      "Answers to common questions about garba tickets, group orders, refunds, and your Rameelo account.",
    type: "website",
    url: "https://rameelo.com/help",
    siteName: "Rameelo",
    images: [
      {
        url: "https://rameelo.com/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Rameelo Help Center",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Help Center — Rameelo",
    description: "Answers to common questions about garba tickets, group orders, and your account.",
    images: ["https://rameelo.com/og-default.jpg"],
  },
};

// ── Categories ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: "tickets",
    title: "Tickets & Orders",
    description: "Purchase, download, transfer, and manage your event tickets.",
    count: 4,
    iconBg: "#2E1B30",
    iconFg: "#F5A623",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
  {
    id: "groups",
    title: "Groups & Friends",
    description: "Group orders, discounts, friend connections, and shared experiences.",
    count: 3,
    iconBg: "#0E8C7A",
    iconFg: "#ffffff",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: "events",
    title: "Events & Discovery",
    description: "Find garba events near you, filter by city or date, and get notified.",
    count: 3,
    iconBg: "#7C1F2C",
    iconFg: "#ffffff",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "organizers",
    title: "For Organizers",
    description: "List events, manage ticket tiers, check-ins, and receive payouts.",
    count: 4,
    iconBg: "#d97b0e",
    iconFg: "#ffffff",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
  {
    id: "account",
    title: "Account & Profile",
    description: "Signing in, profile settings, organization linking, and privacy.",
    count: 3,
    iconBg: "#3B4A6B",
    iconFg: "#ffffff",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: "payments",
    title: "Payments & Billing",
    description: "Accepted methods, payment security, receipts, and declined cards.",
    count: 3,
    iconBg: "#065f46",
    iconFg: "#6ee7b7",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
];

// ── Articles ────────────────────────────────────────────────────────────────

const ARTICLES = [
  // Tickets & Orders
  {
    cat: "Tickets & Orders",
    catId: "tickets",
    q: "Where are my tickets after purchase?",
    a: "After completing checkout, your tickets are available in two places: your Rameelo account under My Tickets, and via the confirmation email sent to the address you used at checkout. If you don't see the email, check your spam or promotions folder. The email arrives within 2–3 minutes of purchase.",
    cta: { label: "My Tickets", href: "/portal/tickets" },
    min: 2,
  },
  {
    cat: "Tickets & Orders",
    catId: "tickets",
    q: "Can I get a refund or cancel my order?",
    a: "Refund eligibility depends on the event organizer's policy. To request a refund, email hello@rameelo.com with your Order ID (found in your confirmation email or My Tickets). Our team will contact the organizer on your behalf. Most events allow full refunds when requested at least 7 days before the event date.",
    cta: { label: "Contact support", href: "/contact" },
    min: 2,
  },
  {
    cat: "Tickets & Orders",
    catId: "tickets",
    q: "How do I transfer a ticket to someone else?",
    a: "In My Tickets, tap the ticket you want to transfer and select Transfer Ticket. Enter the recipient's email address and confirm. They'll receive an email prompting them to claim the ticket to their own Rameelo account. Transfers are available any time before the event starts.",
    cta: { label: "My Tickets", href: "/portal/tickets" },
    min: 2,
  },
  {
    cat: "Tickets & Orders",
    catId: "tickets",
    q: "Can I buy tickets on behalf of someone else?",
    a: "Yes — just enter the attendee's name during checkout. The confirmation email will go to your email address, and you can transfer the ticket to them afterward using the Transfer Ticket feature in My Tickets.",
    min: 1,
  },

  // Groups & Friends
  {
    cat: "Groups & Friends",
    catId: "groups",
    q: "How do group discounts work?",
    a: "Rameelo automatically applies a 15% group discount when 10 or more people purchase tickets through the same group order. One person creates the group order and shares a link with the crew. As each member joins and selects their tickets, the headcount updates in real time. Once 10 people are in, everyone's price drops — no promo code or organizer approval needed.",
    cta: { label: "Browse events", href: "/events" },
    min: 3,
  },
  {
    cat: "Groups & Friends",
    catId: "groups",
    q: "How do I start a group order?",
    a: "On any event page, tap Get Group Tickets or Start a Group. You'll be asked to name your group and select your ticket tier. You'll then get a shareable link to send to your crew via text, WhatsApp, or Instagram DM. Each person who clicks the link can add themselves to your group order.",
    cta: { label: "Browse events", href: "/events" },
    min: 2,
  },
  {
    cat: "Groups & Friends",
    catId: "groups",
    q: "How do I add friends on Rameelo?",
    a: "Head to the Friends section in your Rameelo portal. You can search by name or username and send a friend request. Once accepted, you'll see each other's upcoming events and can easily create group orders together. Your friends' activity is always private — only visible to you.",
    cta: { label: "Find friends", href: "/portal/friends" },
    min: 1,
  },

  // Events & Discovery
  {
    cat: "Events & Discovery",
    catId: "events",
    q: "How do I find garba events near me?",
    a: "Go to the Events page and use the city or state filter to narrow down events in your area. You can also filter by date range, ticket availability, and artist. Rameelo covers garba and Navratri events across every major metro in the USA — New Jersey, Atlanta, Chicago, Los Angeles, Bay Area, Dallas, Houston, Seattle, and more.",
    cta: { label: "Browse events", href: "/events" },
    min: 2,
  },
  {
    cat: "Events & Discovery",
    catId: "events",
    q: "What does 'Sold Out' or 'Waitlist' mean?",
    a: "Sold Out means all available tickets for that tier have been purchased. Waitlist means the organizer has enabled a waiting list — you can join and be notified if tickets become available due to cancellations or a capacity increase. You are not charged when joining a waitlist.",
    min: 1,
  },
  {
    cat: "Events & Discovery",
    catId: "events",
    q: "How do I get notified about new events?",
    a: "Create a free Rameelo account and follow your favorite artists. When an artist announces a new event, you'll receive an email notification. You can also follow an organizer's page and opt in to city-based alerts in your account settings.",
    cta: { label: "Create account", href: "/auth/signup" },
    min: 1,
  },

  // Organizers
  {
    cat: "For Organizers",
    catId: "organizers",
    q: "How do I list my event on Rameelo?",
    a: "Visit rameelo.com/organizers and sign up for an organizer account — it's free. From your Organizer Portal, click Create Event and fill in your event details: title, date(s), venue, description, and cover image. Then add your ticket tiers with pricing and capacity. Once you're ready, publish and your event goes live on the platform immediately.",
    cta: { label: "Organizer Hub", href: "/organizers" },
    min: 4,
  },
  {
    cat: "For Organizers",
    catId: "organizers",
    q: "When and how do I get paid?",
    a: "Organizers receive payouts 3 business days after each event concludes. Funds are transferred via ACH to the bank account you add in your Organizer Portal under Payouts. You can track pending and completed payouts in the Financials section. Rameelo doesn't charge organizers a platform fee — you keep 100% of your ticket revenue.",
    cta: { label: "Organizer Portal", href: "/portal/organizer/financials" },
    min: 3,
  },
  {
    cat: "For Organizers",
    catId: "organizers",
    q: "How do I set up ticket tiers?",
    a: "Inside your event's edit page, scroll to the Ticket Tiers section. Add as many tiers as you need — General Admission, Couples, VIP, Early Bird, etc. For each tier, set the name, price, total capacity, and (optionally) a sale end date. You can reorder tiers, mark them as hidden, or pause sales at any time from the portal.",
    min: 3,
  },
  {
    cat: "For Organizers",
    catId: "organizers",
    q: "How do I manage check-ins on event night?",
    a: "From the Organizer Portal, open your event and go to Check-In. You can scan attendee QR codes directly from your phone's camera — no additional app needed. The check-in dashboard shows real-time entry counts and flags duplicate scan attempts automatically.",
    min: 2,
  },

  // Account & Profile
  {
    cat: "Account & Profile",
    catId: "account",
    q: "How do I sign in to my account?",
    a: "Rameelo is passwordless — there's no password to set or remember. Go to rameelo.com/auth/signin, enter the email associated with your account, and we'll send you a 6-digit code. Type it in to sign in. The code expires in 30 minutes; if you don't see it within a minute, check your spam folder. You can also continue with Google.",
    cta: { label: "Sign in", href: "/auth/signin" },
    min: 1,
  },
  {
    cat: "Account & Profile",
    catId: "account",
    q: "How do I update my profile information?",
    a: "Log in to your Rameelo account and go to Settings in the portal sidebar. From there you can update your display name, profile photo, city, and notification preferences. Changes save immediately.",
    min: 1,
  },
  {
    cat: "Account & Profile",
    catId: "account",
    q: "How do I delete my account?",
    a: "To delete your Rameelo account, email hello@rameelo.com from the email address on your account with the subject line 'Account Deletion Request.' We'll process your request within 5 business days and confirm by email when complete. Note that any active tickets or pending group orders will be permanently cancelled.",
    cta: { label: "Contact us", href: "/contact" },
    min: 2,
  },

  // Payments & Billing
  {
    cat: "Payments & Billing",
    catId: "payments",
    q: "What payment methods does Rameelo accept?",
    a: "Rameelo accepts all major credit and debit cards: Visa, Mastercard, American Express, and Discover. Payments are processed securely through Stripe, one of the world's most trusted payment providers. We currently don't accept cash, checks, PayPal, Venmo, or cryptocurrency.",
    min: 1,
  },
  {
    cat: "Payments & Billing",
    catId: "payments",
    q: "Is my payment information secure?",
    a: "Yes. Rameelo uses Stripe for all payment processing, which is PCI DSS Level 1 certified — the highest level of security certification in the payments industry. Your full card number is never stored on Rameelo's servers. All transactions are encrypted end-to-end using TLS.",
    min: 2,
  },
  {
    cat: "Payments & Billing",
    catId: "payments",
    q: "How do I get a receipt or invoice?",
    a: "A receipt is automatically emailed to you at checkout. You can also download it from My Tickets by selecting your order and tapping Download Receipt. If you need a formal invoice for expense reporting, email hello@rameelo.com with your Order ID and we'll generate one within 1 business day.",
    cta: { label: "My Tickets", href: "/portal/tickets" },
    min: 2,
  },
];

// Group articles by category for the accordion section
const CATEGORY_IDS = ["tickets", "groups", "events", "organizers", "account", "payments"];
const CATEGORY_LABELS: Record<string, string> = {
  tickets: "Tickets & Orders",
  groups: "Groups & Friends",
  events: "Events & Discovery",
  organizers: "For Organizers",
  account: "Account & Profile",
  payments: "Payments & Billing",
};

export default function HelpPage() {
  const crumbs = breadcrumbSchema([
    { name: "Home", url: "https://rameelo.com" },
    { name: "Help Center", url: "https://rameelo.com/help" },
  ]);

  return (
    <div className="bg-ivory min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ld(crumbs) }}
      />

      {/* ── Hero ── */}
      <div style={{ backgroundColor: "#2E1B30" }} className="pt-16 pb-32 sm:pb-36">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-marigold/60 mb-4">
            Support
          </p>
          <h1
            className="font-display font-bold text-white text-4xl sm:text-5xl mb-4"
            style={{ letterSpacing: "-0.03em" }}
          >
            How can we help you?
          </h1>
          <p className="font-ui text-white/45 text-base sm:text-lg max-w-lg mx-auto">
            Find answers instantly with our support assistant, or browse the articles below.
          </p>
        </div>
      </div>

      {/* ── Floating chat card ── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-24 sm:-mt-28 relative z-10">
        <HelpChat />
      </div>

      {/* ── Browse by topic ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-ink/8" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">
            Browse by Topic
          </span>
          <div className="h-px flex-1 bg-ink/8" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <a
              key={cat.id}
              href={`#${cat.id}`}
              className="group flex items-start gap-4 p-5 rounded-2xl bg-white border border-ivory-200 hover:border-aubergine/20 hover:shadow-md transition-all"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: cat.iconBg, color: cat.iconFg }}
              >
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="font-display font-bold text-ink text-sm mb-1 group-hover:text-aubergine transition-colors"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {cat.title}
                </p>
                <p className="font-ui text-xs text-ink-muted leading-relaxed">
                  {cat.description}
                </p>
              </div>
              <svg
                className="w-4 h-4 text-ink-muted/40 group-hover:text-aubergine/60 transition-colors shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}
        </div>
      </div>

      {/* ── Articles by category ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 space-y-12">
        {CATEGORY_IDS.map((catId) => {
          const catArticles = ARTICLES.filter((a) => a.catId === catId);
          const catMeta = CATEGORIES.find((c) => c.id === catId)!;
          return (
            <section key={catId} id={catId} className="scroll-mt-24">
              {/* Section header */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: catMeta.iconBg, color: catMeta.iconFg }}
                >
                  <span className="scale-75">{catMeta.icon}</span>
                </div>
                <h2
                  className="font-display font-bold text-ink text-lg"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {CATEGORY_LABELS[catId]}
                </h2>
                <span className="font-mono text-[9px] text-ink-muted bg-ivory-200 px-2 py-0.5 rounded-full">
                  {catArticles.length} articles
                </span>
              </div>

              {/* Accordion */}
              <div className="rounded-2xl border border-ivory-200 bg-white overflow-hidden divide-y divide-ivory-200">
                {catArticles.map((article, i) => (
                  <details key={i} className="group">
                    <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer list-none select-none hover:bg-ivory/60 transition-colors">
                      <span className="flex-1 font-ui font-semibold text-ink text-sm leading-snug">
                        {article.q}
                      </span>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-mono text-[9px] text-ink-muted hidden sm:block">
                          {article.min} min
                        </span>
                        <svg
                          className="w-4 h-4 text-ink-muted transition-transform duration-200 group-open:rotate-180"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </summary>
                    <div className="px-5 pb-5 pt-1">
                      <p className="font-ui text-sm text-ink-muted leading-relaxed">
                        {article.a}
                      </p>
                      {article.cta && (
                        <Link
                          href={article.cta.href}
                          className="inline-flex items-center gap-1.5 mt-3 font-ui font-semibold text-aubergine text-sm hover:text-aubergine/70 transition-colors"
                        >
                          {article.cta.label}
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* ── Still need help CTA ── */}
      <div style={{ backgroundColor: "#2E1B30" }} className="border-t border-white/8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-marigold/50 mb-3">
            Still need help?
          </p>
          <h2
            className="font-display font-bold text-white text-2xl sm:text-3xl mb-3"
            style={{ letterSpacing: "-0.025em" }}
          >
            We&rsquo;re a message away
          </h2>
          <p className="font-ui text-white/45 text-sm mb-8 max-w-md mx-auto">
            Our support team is real people who love garba just as much as you do. Reach us by email or text.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="mailto:hello@rameelo.com"
              className="flex items-center gap-2.5 px-6 py-3 rounded-2xl font-display font-bold text-sm text-aubergine hover:opacity-90 transition-all"
              style={{ backgroundColor: "#F5A623" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email us
            </a>
            <a
              href="sms:+19498670499"
              className="flex items-center gap-2.5 px-6 py-3 rounded-2xl font-display font-bold text-sm text-white border border-white/15 hover:border-white/35 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Text us
              <span className="font-mono text-[9px] text-white/40 font-normal">(949) 867-0499</span>
            </a>
            <Link
              href="/contact"
              className="font-ui font-semibold text-white/40 text-sm hover:text-white/70 transition-colors"
            >
              Open contact page →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
