import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbSchema, ld } from "@/lib/jsonld";

const PRIVACY_EFFECTIVE = "June 23, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy — Rameelo",
  description:
    "How Rameelo collects, uses, shares, and protects your information when you use the platform to discover events and buy tickets.",
  alternates: { canonical: "https://www.rameelo.com/privacy" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Privacy Policy — Rameelo",
    description: "How Rameelo handles your data — what we collect, how we use it, and your choices.",
    type: "website",
    url: "https://www.rameelo.com/privacy",
    siteName: "Rameelo",
  },
};

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-24" id={`s${n}`}>
      <h2 className="font-display font-bold text-ink text-xl sm:text-2xl mb-3" style={{ letterSpacing: "-0.02em" }}>
        <span className="text-marigold-dark font-mono text-base mr-2">{n}.</span>
        {title}
      </h2>
      <div className="font-ui text-[15px] text-ink-muted leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="text-marigold-dark mt-1.5 shrink-0 w-1 h-1 rounded-full bg-marigold-dark" />
      <span>{children}</span>
    </li>
  );
}

export default function PrivacyPage() {
  const crumbs = breadcrumbSchema([
    { name: "Home", url: "https://www.rameelo.com" },
    { name: "Privacy Policy", url: "https://www.rameelo.com/privacy" },
  ]);

  return (
    <div className="bg-ivory min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbs) }} />

      {/* Hero */}
      <div style={{ backgroundColor: "#2E1B30" }} className="pt-12 pb-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-2 mb-6 font-mono text-[10px] uppercase tracking-widest text-white/35">
            <Link href="/" className="hover:text-marigold transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white/55">Privacy Policy</span>
          </nav>
          <p className="font-mono text-[10px] uppercase tracking-widest text-marigold/60 mb-3">Legal</p>
          <h1 className="font-display font-bold text-white text-3xl sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
            Privacy Policy
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-widest text-white/40 mt-4">
            Effective {PRIVACY_EFFECTIVE}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl border border-ivory-200 bg-white p-6 mb-10">
          <p className="font-ui text-[15px] text-ink leading-relaxed">
            This Privacy Policy explains how Rameelo (&ldquo;Rameelo,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;)
            collects, uses, shares, and protects your information when you use our websites, apps, and services (the
            &ldquo;Platform&rdquo;) to discover events and buy tickets. By using the Platform, you agree to this Policy.
          </p>
        </div>

        <div className="space-y-10">
          <Section n="1" title="Information We Collect">
            <p>We collect information you provide, information created when you use the Platform, and information from a few trusted third parties:</p>
            <ul className="space-y-2.5">
              <Bullet><strong className="text-ink">Account &amp; profile:</strong> name, email, phone, password, city, and any profile details you add.</Bullet>
              <Bullet><strong className="text-ink">Orders &amp; tickets:</strong> events you view or buy, ticket tiers, quantities, order history, transfers, and check-in scans.</Bullet>
              <Bullet><strong className="text-ink">Payment:</strong> payments are processed by our payment processor (Stripe). We receive limited details such as the last four digits, card brand, and authorization result. <strong className="text-ink">We do not store full card numbers or full bank account numbers.</strong></Bullet>
              <Bullet><strong className="text-ink">Device &amp; usage:</strong> IP address, device and browser type, pages viewed, and actions taken — used for security, fraud prevention, and improving the Platform.</Bullet>
              <Bullet><strong className="text-ink">Location:</strong> if you allow it, approximate location from your device to show events near you. You can decline this in your browser or device settings.</Bullet>
              <Bullet><strong className="text-ink">Communications:</strong> messages, support requests, and your marketing preferences.</Bullet>
              <Bullet><strong className="text-ink">Organizer information:</strong> if you onboard as an organizer, business details, verification documents, and payout information you provide.</Bullet>
            </ul>
          </Section>

          <Section n="2" title="How We Use Your Information">
            <ul className="space-y-2.5">
              <Bullet>Process orders, deliver tickets, and provide customer support.</Bullet>
              <Bullet>Operate, secure, and improve the Platform, and personalize what you see (such as events near you).</Bullet>
              <Bullet>Prevent fraud, enforce our Terms, and respond to payment disputes and chargebacks.</Bullet>
              <Bullet>Send transactional messages (confirmations, reminders) and, where permitted, marketing — which you can opt out of at any time.</Bullet>
              <Bullet>Comply with legal obligations and protect the rights, safety, and property of Rameelo, organizers, and attendees.</Bullet>
            </ul>
          </Section>

          <Section n="3" title="How We Share Information">
            <p>We do not sell your personal information. We share it only as needed to run the Platform:</p>
            <ul className="space-y-2.5">
              <Bullet><strong className="text-ink">Event organizers:</strong> the organizer of an event you buy from receives the information needed to fulfill and manage your order and run their event (such as your name, contact details, and ticket details).</Bullet>
              <Bullet><strong className="text-ink">Service providers:</strong> vendors who help us operate — including payment processing (Stripe), email/SMS delivery, hosting, and analytics — under contracts that limit their use of your data.</Bullet>
              <Bullet><strong className="text-ink">Disputes:</strong> banks, card networks, and payment processors, as evidence in response to a chargeback or payment dispute you initiate.</Bullet>
              <Bullet><strong className="text-ink">Legal &amp; safety:</strong> when required by law, subpoena, or to protect rights, prevent fraud, or ensure safety.</Bullet>
              <Bullet><strong className="text-ink">Business transfers:</strong> in connection with a merger, acquisition, or sale of assets, subject to this Policy.</Bullet>
            </ul>
          </Section>

          <Section n="4" title="Payments">
            <p>
              Card and bank payments are handled by our PCI-compliant payment processor. Rameelo never receives or
              stores your full card number or full bank account number — only masked, last-four details and the result
              of the transaction. The processor&rsquo;s handling of your payment data is governed by its own privacy
              terms.
            </p>
          </Section>

          <Section n="5" title="Cookies & Tracking">
            <p>
              We use cookies and similar technologies to keep you signed in, remember preferences, secure the Platform,
              and understand usage. You can control cookies through your browser settings; disabling some may affect how
              the Platform works.
            </p>
          </Section>

          <Section n="6" title="Marketing & Communications">
            <p>
              We send transactional messages related to your orders and account. With your permission, we may send
              marketing about events and features. You can opt out of marketing at any time via the unsubscribe link in
              an email or your account settings — transactional messages will still be sent.
            </p>
          </Section>

          <Section n="7" title="Data Retention">
            <p>
              We keep your information for as long as your account is active and as needed to provide the Platform.
              Certain records — including your order, terms acceptance (version, timestamp, and IP address), ticket
              activity, and dispute evidence — are retained longer for fraud prevention, legal compliance, and to
              respond to chargebacks, as described in our{" "}
              <Link href="/terms" className="text-aubergine font-semibold hover:underline">Terms of Service</Link>.
            </p>
          </Section>

          <Section n="8" title="Security">
            <p>
              We use technical and organizational safeguards — including encryption in transit, access controls, and
              row-level database protections — to protect your information. No method of transmission or storage is
              100% secure, but we work to protect your data and limit access to those who need it.
            </p>
          </Section>

          <Section n="9" title="Your Rights & Choices">
            <ul className="space-y-2.5">
              <Bullet>Access or update your profile information in your account settings.</Bullet>
              <Bullet>Opt out of marketing communications at any time.</Bullet>
              <Bullet>Request deletion of your account by emailing{" "}
                <a href="mailto:support@rameelo.com" className="text-aubergine font-semibold hover:underline">support@rameelo.com</a>{" "}
                — note that active tickets or pending orders may be cancelled, and some records are retained where required by law.</Bullet>
              <Bullet>Depending on where you live, you may have additional rights (such as access, correction, deletion, or portability). Contact us to exercise them.</Bullet>
            </ul>
          </Section>

          <Section n="10" title="Children's Privacy">
            <p>
              The Platform is intended for adults. We do not knowingly collect personal information from children under
              13. If you believe a child has provided us information, contact us and we will delete it.
            </p>
          </Section>

          <Section n="11" title="Third-Party Links">
            <p>
              The Platform may link to organizer pages, artists, sponsors, or other third-party sites we don&rsquo;t
              control. Their privacy practices are their own — please review their policies.
            </p>
          </Section>

          <Section n="12" title="Changes to This Policy">
            <p>
              We may update this Policy from time to time. The effective date at the top reflects the latest version.
              Material changes will be communicated where appropriate, and continued use of the Platform means you
              accept the updated Policy.
            </p>
          </Section>

          <Section n="13" title="Contact Us">
            <p>
              Questions about your privacy or this Policy? Email{" "}
              <a href="mailto:support@rameelo.com" className="text-aubergine font-semibold hover:underline">support@rameelo.com</a>.
              See also our{" "}
              <Link href="/terms" className="text-aubergine font-semibold hover:underline">Terms of Service</Link>.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
