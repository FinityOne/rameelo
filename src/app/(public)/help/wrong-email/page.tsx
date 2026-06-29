import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbSchema, faqSchema, ld } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Can't find your tickets or used the wrong email? — Rameelo Help",
  description:
    "Can't find your garba tickets, or entered the wrong email at guest checkout? Here's how to locate your tickets and how to request an email correction from Rameelo support.",
  keywords: [
    "rameelo wrong email",
    "can't find tickets",
    "guest checkout wrong email",
    "garba ticket missing",
    "update email on order",
  ],
  alternates: { canonical: "https://www.rameelo.com/help/wrong-email" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Can't find your tickets or used the wrong email?",
    description:
      "Find your garba tickets, or request an email correction if you mistyped your address at guest checkout.",
    type: "article",
    url: "https://www.rameelo.com/help/wrong-email",
    siteName: "Rameelo",
    images: [{ url: "https://www.rameelo.com/og-default.jpg", width: 1200, height: 630, alt: "Rameelo Help Center" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Can't find your tickets or used the wrong email?",
    description: "Find your tickets, or request an email correction from Rameelo support.",
    images: ["https://www.rameelo.com/og-default.jpg"],
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

export default function WrongEmailArticle() {
  const crumbs = breadcrumbSchema([
    { name: "Home", url: "https://www.rameelo.com" },
    { name: "Help Center", url: "https://www.rameelo.com/help" },
    { name: "Can't find your tickets / wrong email", url: "https://www.rameelo.com/help/wrong-email" },
  ]);

  const faq = faqSchema([
    {
      question: "Why can't I find my tickets after buying them?",
      answer:
        "The most common reason is a typo in the email entered at checkout, so the confirmation went to the wrong address. First check your spam and promotions folders, confirm the exact email you typed, and sign in to Rameelo with that email — guest-checkout tickets attach to your account automatically when you sign in with the matching address.",
    },
    {
      question: "I entered the wrong email at guest checkout. How do I fix it?",
      answer:
        "Submit a request from the Help Center and choose 'I used the wrong email at checkout'. Include your event name, the incorrect and correct emails, the approximate purchase date and amount, and upload a screenshot of the charge. Once we verify you're the purchaser, we update the email on your order and the tickets appear under your correct address.",
    },
    {
      question: "How long does an email correction take?",
      answer:
        "Our support team typically responds within 1–2 business days. After the email is corrected, sign in to Rameelo with the correct address and your tickets will be in My Tickets.",
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
            <span className="text-white/55">Tickets &amp; Orders</span>
          </nav>
          <p className="font-mono text-[10px] uppercase tracking-widest text-marigold/60 mb-3">
            Tickets &amp; Orders · 3 min read
          </p>
          <h1 className="font-display font-bold text-white text-3xl sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
            Can&rsquo;t find your tickets, or used the wrong email at checkout?
          </h1>
          <p className="font-ui text-white/45 text-base mt-4 max-w-2xl leading-relaxed">
            If your tickets aren&rsquo;t showing up, it&rsquo;s almost always because of a small typo in the email entered at checkout.
            This guide helps you locate them — and shows you exactly how to request an email correction if you need one.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-12">

        {/* ── Section 1: Find your tickets ── */}
        <section>
          <h2 className="font-display font-bold text-ink text-xl mb-2" style={{ letterSpacing: "-0.02em" }}>
            First, let&rsquo;s try to locate your tickets
          </h2>
          <p className="font-ui text-sm text-ink-muted leading-relaxed mb-6">
            Before requesting a correction, run through these quick checks — most missing-ticket cases are solved here.
          </p>
          <ol className="space-y-6">
            <Step n={1} title="Check your spam and promotions folders">
              <p>
                Your confirmation email arrives within 2–3 minutes of purchase. Search your inbox for
                {" "}<span className="font-semibold text-ink">&ldquo;Rameelo&rdquo;</span> and check Spam, Junk, and the Promotions tab.
              </p>
            </Step>
            <Step n={2} title="Double-check the email you typed">
              <p>
                A small typo is the usual culprit — for example <span className="font-mono text-ink">gmial.com</span> instead of
                {" "}<span className="font-mono text-ink">gmail.com</span>, or a missing letter. Look at the charge confirmation from your
                bank; the receipt descriptor can help you recall what you entered.
              </p>
            </Step>
            <Step n={3} title="Sign in with the exact email you used">
              <p>
                Go to <Link href="/auth/signin" className="text-aubergine font-semibold hover:underline">Sign in</Link> and enter the
                email you used at checkout. Even if you bought as a guest, your tickets attach to your account automatically the moment
                you sign in with the matching address — then they&rsquo;ll be in{" "}
                <Link href="/portal/tickets" className="text-aubergine font-semibold hover:underline">My Tickets</Link>.
              </p>
            </Step>
            <Step n={4} title="Still nothing? You likely used the wrong email">
              <p>
                If none of the above works, the order was almost certainly placed under a mistyped address. Don&rsquo;t worry —
                your tickets aren&rsquo;t lost. Follow the steps below to have support move them to the correct email.
              </p>
            </Step>
          </ol>
        </section>

        {/* ── Section 2: Request a correction ── */}
        <section>
          <h2 className="font-display font-bold text-ink text-xl mb-2" style={{ letterSpacing: "-0.02em" }}>
            If you entered the wrong email at checkout
          </h2>
          <p className="font-ui text-sm text-ink-muted leading-relaxed mb-6">
            Guest checkout sends tickets to the email you entered. If that address was wrong, our support team can verify you as the
            purchaser and update your order — moving the tickets to your correct email. The fastest way is to submit a request:
          </p>
          <ol className="space-y-6 mb-8">
            <Step n={1} title="Open the support request form">
              <p>
                Use the <span className="font-semibold text-ink">Submit a request</span> button below. Pick
                <span className="font-semibold text-ink"> &ldquo;I used the wrong email at checkout&rdquo;</span> as the issue type
                (it&rsquo;s pre-selected for you from this page).
              </p>
            </Step>
            <Step n={2} title="Tell us the details">
              <p>
                In the description, include the <span className="font-semibold text-ink">event name</span>, the
                <span className="font-semibold text-ink"> incorrect</span> and <span className="font-semibold text-ink">correct</span> emails,
                roughly when you purchased, and the amount charged. Add your order/receipt number if you have it.
              </p>
            </Step>
            <Step n={3} title="Attach a screenshot of the charge">
              <p>
                Upload a screenshot of the transaction/charge confirmation from your bank or card statement using the file upload on the
                form. This is how we confirm you&rsquo;re the rightful purchaser before changing any contact details.
              </p>
            </Step>
            <Step n={4} title="Submit — and watch for our reply">
              <p>
                You&rsquo;ll get an instant email confirmation with a reference number, and we typically respond within 1–2 business days.
                Once your order is updated, sign in with the corrected email and your tickets will appear in{" "}
                <Link href="/portal/tickets" className="text-aubergine font-semibold hover:underline">My Tickets</Link>.
              </p>
            </Step>
          </ol>

          {/* Submit a request CTA */}
          <div className="rounded-2xl border border-ivory-200 bg-white p-6 text-center">
            <p className="font-display font-bold text-ink text-base mb-1.5" style={{ letterSpacing: "-0.01em" }}>
              Ready to get your tickets back?
            </p>
            <p className="font-ui text-sm text-ink-muted mb-4 max-w-md mx-auto leading-relaxed">
              Submit a request and our team will move your tickets to the right email. It only takes a minute.
            </p>
            <Link
              href="/help/request?type=wrong_email"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-display font-bold text-sm text-aubergine hover:opacity-90 transition-all"
              style={{ backgroundColor: "#F5A623" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Submit a request
            </Link>
          </div>
        </section>

        {/* ── Section 3: Avoid it next time ── */}
        <section className="rounded-2xl border border-ivory-200 bg-white p-6">
          <h2 className="font-display font-bold text-ink text-lg mb-3" style={{ letterSpacing: "-0.02em" }}>
            Tips to avoid this next time
          </h2>
          <ul className="space-y-2.5 font-ui text-sm text-ink-muted leading-relaxed">
            <li className="flex gap-2.5">
              <span className="text-peacock mt-0.5">✓</span>
              <span>Double-check your email on the checkout screen before paying — that&rsquo;s where your tickets are sent.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-peacock mt-0.5">✓</span>
              <span>
                <Link href="/auth/signup" className="text-aubergine font-semibold hover:underline">Create a free account</Link>{" "}
                before buying so your tickets always land in your portal.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-peacock mt-0.5">✓</span>
              <span>Buying for friends? Use your own email and <Link href="/portal/tickets" className="text-aubergine font-semibold hover:underline">transfer the tickets</Link> to them afterward.</span>
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
              href="/help/request?type=wrong_email"
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
