import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbSchema, faqSchema, ld } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "How to create a Rameelo account — Rameelo Help",
  description:
    "Step-by-step guide to creating your free Rameelo account. Sign up with your email — no password needed — to claim tickets sent to you, buy garba & Navratri tickets, and keep everything in one place.",
  keywords: [
    "create rameelo account",
    "rameelo sign up",
    "claim transferred ticket",
    "garba ticket account",
    "passwordless sign in rameelo",
  ],
  alternates: { canonical: "https://rameelo.com/help/create-account" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "How to create a Rameelo account",
    description:
      "Create your free Rameelo account in under two minutes — no password, just your email and a 6-digit code.",
    type: "article",
    url: "https://rameelo.com/help/create-account",
    siteName: "Rameelo",
    images: [{ url: "https://rameelo.com/og-default.jpg", width: 1200, height: 630, alt: "Rameelo Help Center" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How to create a Rameelo account",
    description: "Create your free Rameelo account in under two minutes — no password required.",
    images: ["https://rameelo.com/og-default.jpg"],
  },
};

// ── Step card ────────────────────────────────────────────────────────────────
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-sm text-aubergine"
        style={{ backgroundColor: "#F5A623" }}
      >
        {n}
      </span>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="font-ui font-semibold text-ink text-sm mb-1">{title}</p>
        <div className="font-ui text-sm text-ink-muted leading-relaxed space-y-2">{children}</div>
      </div>
    </li>
  );
}

export default function CreateAccountArticle() {
  const crumbs = breadcrumbSchema([
    { name: "Home", url: "https://rameelo.com" },
    { name: "Help Center", url: "https://rameelo.com/help" },
    { name: "How to create an account", url: "https://rameelo.com/help/create-account" },
  ]);

  const faq = faqSchema([
    {
      question: "Do I need a password to create a Rameelo account?",
      answer:
        "No. Rameelo is passwordless. You sign up and sign in with your email — we send you a 6-digit code to enter. There's no password to create or remember. You can also continue with Google.",
    },
    {
      question: "Is creating a Rameelo account free?",
      answer:
        "Yes, creating an account is completely free. You only ever pay when you buy a ticket, and tickets that are gifted or transferred to you are free to claim.",
    },
    {
      question: "Someone transferred a ticket to me — how do I claim it?",
      answer:
        "Open the claim link in the email you received and create your account using that same email address. Once you're signed in, tap Accept and the tickets attach to your account automatically — you'll find them under My Tickets with a QR code for the door.",
    },
    {
      question: "Which email should I use to sign up?",
      answer:
        "Use the email address the ticket or invitation was sent to. Tickets sent to you are reserved for that specific address, so signing up with the same email is what lets them attach to your account automatically.",
    },
  ]);

  return (
    <div className="bg-ivory min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(faq) }} />

      {/* ── Hero ── */}
      <div style={{ backgroundColor: "#2E1B30" }} className="pt-12 pb-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-6 font-mono text-[10px] uppercase tracking-widest text-white/35">
            <Link href="/help" className="hover:text-marigold transition-colors">Help Center</Link>
            <span>/</span>
            <span className="text-white/55">Account &amp; Profile</span>
          </nav>
          <p className="font-mono text-[10px] uppercase tracking-widest text-marigold/60 mb-3">
            Account &amp; Profile · 2 min read
          </p>
          <h1 className="font-display font-bold text-white text-3xl sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
            How to create your free Rameelo account
          </h1>
          <p className="font-ui text-white/45 text-base mt-4 max-w-2xl leading-relaxed">
            Rameelo is passwordless — there&rsquo;s nothing to memorize. You sign up with your email and a 6-digit code,
            and you&rsquo;re in. This guide walks you through it step by step, including how to claim a ticket someone sent you.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-12">

        {/* ── Section 1: Create an account ── */}
        <section>
          <h2 className="font-display font-bold text-ink text-xl mb-2" style={{ letterSpacing: "-0.02em" }}>
            Create your account in under two minutes
          </h2>
          <p className="font-ui text-sm text-ink-muted leading-relaxed mb-6">
            All you need is an email address. No password, no app to download.
          </p>
          <ol className="space-y-6">
            <Step n={1} title="Open the sign-up page">
              <p>
                Go to{" "}
                <Link href="/auth/signup" className="text-aubergine font-semibold hover:underline">rameelo.com/auth/signup</Link>.
                If a ticket was sent to you, tapping <span className="font-semibold text-ink">Claim your tickets</span> in that email
                brings you here automatically.
              </p>
            </Step>
            <Step n={2} title="Enter your email">
              <p>
                Type in your email address and tap continue. If you&rsquo;re claiming a ticket, use the{" "}
                <span className="font-semibold text-ink">same email the ticket was sent to</span> — that&rsquo;s how it attaches to your account.
              </p>
            </Step>
            <Step n={3} title="Check your inbox for a 6-digit code">
              <p>
                We email you a one-time code right away (it expires in 30 minutes). Don&rsquo;t see it within a minute? Check your
                Spam and Promotions folders and search for <span className="font-semibold text-ink">&ldquo;Rameelo&rdquo;</span>.
              </p>
            </Step>
            <Step n={4} title="Type the code to finish">
              <p>
                Enter the code and your account is created — no password to set. Prefer one tap? You can also{" "}
                <span className="font-semibold text-ink">Continue with Google</span> on the same screen.
              </p>
            </Step>
            <Step n={5} title="Add your name (optional but nice)">
              <p>
                You can fill in your name and city in{" "}
                <Link href="/portal" className="text-aubergine font-semibold hover:underline">your portal</Link>{" "}
                so friends and organizers recognize you. That&rsquo;s it — you&rsquo;re all set.
              </p>
            </Step>
          </ol>
        </section>

        {/* ── Section 2: Claiming a transferred ticket ── */}
        <section>
          <h2 className="font-display font-bold text-ink text-xl mb-2" style={{ letterSpacing: "-0.02em" }}>
            Claiming a ticket someone sent you
          </h2>
          <p className="font-ui text-sm text-ink-muted leading-relaxed mb-6">
            If a friend transferred tickets to you, you&rsquo;ll get an email with a claim link. Here&rsquo;s how to bring those tickets into your wallet:
          </p>
          <ol className="space-y-6 mb-8">
            <Step n={1} title="Open the email and tap “Claim your tickets”">
              <p>
                The link is personal to you and the tickets are reserved for your email address. Opening it shows you the event,
                date, and how many tickets are waiting.
              </p>
            </Step>
            <Step n={2} title="Create your account with that same email">
              <p>
                Follow the steps above. Because the tickets were sent to your address, signing up with it is what lets them
                attach to your account automatically.
              </p>
            </Step>
            <Step n={3} title="Tap Accept">
              <p>
                Once you&rsquo;re signed in, accept the transfer. The tickets move into your{" "}
                <Link href="/portal/tickets" className="text-aubergine font-semibold hover:underline">My Tickets</Link>{" "}
                with their own QR codes — ready to scan at the door.
              </p>
            </Step>
          </ol>

          {/* Create account CTA */}
          <div className="rounded-2xl border border-ivory-200 bg-white p-6 text-center">
            <p className="font-display font-bold text-ink text-base mb-1.5" style={{ letterSpacing: "-0.01em" }}>
              Ready to get started?
            </p>
            <p className="font-ui text-sm text-ink-muted mb-4 max-w-md mx-auto leading-relaxed">
              Create your free Rameelo account now — it only takes your email and a minute.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-display font-bold text-sm text-aubergine hover:opacity-90 transition-all"
              style={{ backgroundColor: "#F5A623" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              Create your free account
            </Link>
          </div>
        </section>

        {/* ── Section 3: Good to know ── */}
        <section className="rounded-2xl border border-ivory-200 bg-white p-6">
          <h2 className="font-display font-bold text-ink text-lg mb-3" style={{ letterSpacing: "-0.02em" }}>
            Good to know
          </h2>
          <ul className="space-y-2.5 font-ui text-sm text-ink-muted leading-relaxed">
            <li className="flex gap-2.5">
              <span className="text-peacock mt-0.5">✓</span>
              <span>Creating an account is <span className="font-semibold text-ink">free</span> — you only pay when you buy a ticket.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-peacock mt-0.5">✓</span>
              <span>There&rsquo;s <span className="font-semibold text-ink">no password</span> to manage — every sign-in uses a fresh emailed code, or Google.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-peacock mt-0.5">✓</span>
              <span>Already bought tickets as a guest? Sign up with the same email and they&rsquo;ll appear in{" "}
                <Link href="/portal/tickets" className="text-aubergine font-semibold hover:underline">My Tickets</Link> automatically.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-peacock mt-0.5">✓</span>
              <span>Already have an account? Just{" "}
                <Link href="/auth/signin" className="text-aubergine font-semibold hover:underline">sign in</Link> — same email, new code.</span>
            </li>
          </ul>
        </section>
      </div>

      {/* ── Still need help CTA ── */}
      <div style={{ backgroundColor: "#2E1B30" }} className="border-t border-white/8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-marigold/50 mb-3">Still need help?</p>
          <h2 className="font-display font-bold text-white text-2xl sm:text-3xl mb-3" style={{ letterSpacing: "-0.025em" }}>
            We&rsquo;re a message away
          </h2>
          <p className="font-ui text-white/45 text-sm mb-8 max-w-md mx-auto">
            Our support team is real people who love garba just as much as you do. Reach us by email or text.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/help/request"
              className="flex items-center gap-2.5 px-6 py-3 rounded-2xl font-display font-bold text-sm text-aubergine hover:opacity-90 transition-all"
              style={{ backgroundColor: "#F5A623" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Submit a request
            </Link>
            <a
              href="sms:+19498670499"
              className="flex items-center gap-2.5 px-6 py-3 rounded-2xl font-display font-bold text-sm text-white border border-white/15 hover:border-white/35 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              Text us
              <span className="font-mono text-[9px] text-white/40 font-normal">(949) 867-0499</span>
            </a>
            <Link href="/help" className="font-ui font-semibold text-white/40 text-sm hover:text-white/70 transition-colors">
              Back to Help Center →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
