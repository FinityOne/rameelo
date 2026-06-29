import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbSchema, ld } from "@/lib/jsonld";
import { TERMS_VERSION, TERMS_EFFECTIVE } from "@/lib/terms";

export const metadata: Metadata = {
  title: "Terms of Service — Rameelo",
  description:
    "Rameelo's Terms of Service: how the platform works, all sales are final (no refunds unless the organizer cancels), event fulfillment is the organizer's responsibility, and Rameelo's role as a ticketing & payment facilitator.",
  alternates: { canonical: "https://www.rameelo.com/terms" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Terms of Service — Rameelo",
    description: "How Rameelo works, ticket purchase terms, refunds, and platform rules.",
    type: "website",
    url: "https://www.rameelo.com/terms",
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

export default function TermsPage() {
  const crumbs = breadcrumbSchema([
    { name: "Home", url: "https://www.rameelo.com" },
    { name: "Terms of Service", url: "https://www.rameelo.com/terms" },
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
            <span className="text-white/55">Terms of Service</span>
          </nav>
          <p className="font-mono text-[10px] uppercase tracking-widest text-marigold/60 mb-3">Legal</p>
          <h1 className="font-display font-bold text-white text-3xl sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
            Terms of Service
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-widest text-white/40 mt-4">
            Version {TERMS_VERSION} · Effective {TERMS_EFFECTIVE}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Intro / key summary */}
        <div className="rounded-2xl border border-ivory-200 bg-white p-6 mb-10">
          <p className="font-ui text-[15px] text-ink leading-relaxed">
            Welcome to Rameelo. These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the Rameelo
            websites, apps, and services (the &ldquo;Platform&rdquo;). <strong className="text-ink">Rameelo is a ticketing
            and payment facilitator</strong> — events are produced, hosted, and fulfilled by the organizers who
            list them, not by Rameelo. By using the Platform or buying a ticket, you agree to these Terms.
          </p>
          <ul className="mt-4 space-y-2 font-ui text-sm text-ink-muted">
            <li className="flex gap-2.5"><span className="text-peacock mt-0.5">✓</span><span>All ticket sales are final — <strong className="text-ink">no refunds</strong>, except where required by law or where the organizer cancels the event in its entirety.</span></li>
            <li className="flex gap-2.5"><span className="text-peacock mt-0.5">✓</span><span>The <strong className="text-ink">organizer</strong> is solely responsible for the event taking place and for funding any refunds.</span></li>
            <li className="flex gap-2.5"><span className="text-peacock mt-0.5">✓</span><span>Rameelo never pays refunds, fees, or other amounts from its own funds for a cancelled, postponed, or unauthorized event.</span></li>
          </ul>
        </div>

        <div className="space-y-10">
          <Section n="1" title="What Rameelo Is — Facilitator Only">
            <p>
              The event is produced, hosted, controlled, and fulfilled{" "}
              <strong className="text-ink">solely by the event organizer</strong> (the &ldquo;Organizer&rdquo;), not by
              Rameelo. Rameelo provides only the
              technology to list events, sell tickets, and process payments on the Organizer&rsquo;s behalf. Rameelo
              is not the event producer, promoter, venue, host, or performer, and does not control the event.
            </p>
            <p>
              The Organizer is solely responsible for the event taking place as described — including its occurrence,
              scheduling, venue, safety, permits, and licensing, and the appearance of any artist or performer — and
              represents that it holds all rights and authorizations required to stage the event and sell tickets to
              it. <strong className="text-ink">Any obligation to deliver the event, or to refund tickets if the event
              does not occur as described, rests solely with the Organizer.</strong>
            </p>
          </Section>

          <Section n="2" title="Your Account">
            <p>
              You may need an account to buy tickets, save tickets, or use certain features. You are responsible for
              the accuracy of your information and for activity under your account. Keep your login secure. We may
              suspend or terminate accounts for fraud, chargeback abuse, or violations of these Terms.
            </p>
          </Section>

          <Section n="3" title="Buying Tickets — All Sales Are Final">
            <p>
              All ticket purchases are <strong className="text-ink">final, non-refundable, and non-cancellable</strong>.
              You are not entitled to a refund, exchange, credit, or cancellation for any reason — including change of
              plans, inability to attend, dissatisfaction, weather, travel issues, or duplicate purchase. The only
              exceptions are: (a) where a refund is expressly required by applicable law; or (b) where the Organizer
              cancels the event in its entirety (see Section 5).
            </p>
            <p>
              Tickets are delivered electronically immediately upon purchase, in your Rameelo account, by email
              confirmation, by QR code, and via mobile wallet. Delivery of the electronic ticket and QR code
              constitutes full performance of Rameelo&rsquo;s ticketing role; delivery of the underlying event remains
              the Organizer&rsquo;s responsibility. You are responsible for safeguarding your QR code — lost, stolen,
              duplicated, or shared codes may be voided at entry, and only the first valid scan is admitted.
            </p>
          </Section>

          <Section n="4" title="Prices, Fees & Payments">
            <p>
              Ticket prices are set by the Organizer. Buyers may be charged a Rameelo service fee and a payment
              processing fee, shown before checkout. Payments are processed by our payment processor (Stripe); Rameelo
              does not store full card numbers. Service fees and processing fees are non-refundable to the maximum
              extent permitted by law, as they cover costs already incurred.
            </p>
          </Section>

          <Section n="5" title="Event Cancellation, Changes & Fulfillment">
            <p>
              <strong className="text-ink">Event changes are not refundable.</strong> Date, start time, venue, lineup,
              performers, and other details may change. Postponement, rescheduling, line-up changes, or partial
              changes are not grounds for a refund, and your ticket remains valid for the rescheduled or modified
              event.
            </p>
            <p>
              <strong className="text-ink">If the Organizer cancels the event in its entirety and does not reschedule
              it</strong>, you will be eligible for a refund of the ticket face value to your original payment method.
              Any such refund is the sole responsibility of, and is <strong className="text-ink">funded by, the
              Organizer</strong> out of event proceeds. Rameelo facilitates refunds only as the Organizer&rsquo;s agent
              and only to the extent Organizer funds are actually available to Rameelo for that purpose;
              <strong className="text-ink"> Rameelo is under no obligation to fund or advance any refund from its own
              funds</strong>, and is not liable for a refund the Organizer fails to fund.
            </p>
            <p>
              Where an event is cancelled, not authorized, fraudulent, or otherwise not delivered — or where an
              artist or performer fails to appear — your sole recourse for the ticket face value is to the Organizer.
              Rameelo is not responsible or liable for, and has no obligation to pay from its own funds, any refund,
              fee, or other amount in connection with such an event.
            </p>
          </Section>

          <Section n="6" title="Chargebacks & Disputes">
            <p>
              Because tickets are delivered immediately and all sales are final, you agree <strong className="text-ink">not
              to initiate a chargeback, payment dispute, or reversal</strong> for a ticket that was delivered to you.
              Initiating a chargeback on a valid, delivered ticket is a material breach of these Terms and may
              constitute friendly fraud. We retain records of your purchase, identity, device and IP address, terms
              acceptance, ticket access, wallet activity, transfers, and entry scans, and you consent to those records
              being submitted to your bank, card network, and payment processor as evidence in response to any dispute.
            </p>
            <p>
              If you initiate a chargeback in breach of these Terms, the Organizer and Rameelo may contest it,
              recover the disputed amount plus chargeback, administrative, and reasonable collection or legal fees, and
              suspend your account and void associated tickets. Please contact{" "}
              <a href="mailto:support@rameelo.com" className="text-aubergine font-semibold hover:underline">support@rameelo.com</a>{" "}
              first to resolve any billing concern.
            </p>
          </Section>

          <Section n="7" title="Ticket Transfers & Resale">
            <p>
              Tickets may be transferred to another person through the Rameelo Platform. Resale above face value or
              through unauthorized channels may result in the ticket being voided without refund.
            </p>
          </Section>

          <Section n="8" title="For Organizers">
            <p>
              If you list or sell events on Rameelo, you also agree to the Rameelo Organizer Agreement you accept
              during onboarding. Among other things, you represent that you are authorized to present the event and any
              advertised artist; you are <strong className="text-ink">solely and financially responsible</strong> for
              the event taking place, for all attendee refunds (including those arising from cancellation,
              postponement, non-occurrence, or an unauthorized event), and for reimbursing Rameelo for any refunds,
              chargebacks, fees, or costs Rameelo incurs as a result; and you agree to defend, indemnify, and hold
              Rameelo harmless from claims arising out of your event.
            </p>
          </Section>

          <Section n="9" title="Acceptable Use">
            <p>
              You agree not to misuse the Platform — including by attempting to defraud, scrape, reverse-engineer,
              disrupt, resell access to, or circumvent the security of the Platform, or by listing events you are not
              authorized to present. We may remove content and suspend access for violations.
            </p>
          </Section>

          <Section n="10" title="Intellectual Property">
            <p>
              The Platform, including its software, design, and the Rameelo name and logos, is owned by Rameelo and
              protected by law. Organizers and artists retain rights in their own names, images, and event materials
              and grant Rameelo a license to display them for ticketing and promotion as described in their
              agreements. You may not copy or use Rameelo&rsquo;s materials without permission.
            </p>
          </Section>

          <Section n="11" title="Disclaimers">
            <p>
              The Platform is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any
              kind to the maximum extent permitted by law. Rameelo does not warrant that any event will occur, be of a
              particular quality, or that any artist will appear — those are the Organizer&rsquo;s responsibility.
            </p>
          </Section>

          <Section n="12" title="Limitation of Liability">
            <p>
              The event and its fulfillment are the sole responsibility of the Organizer. To the maximum extent
              permitted by law, Rameelo acts only as a limited ticketing and payment facilitator and is{" "}
              <strong className="text-ink">not liable</strong> for the event&rsquo;s occurrence, cancellation,
              postponement, relocation, or quality, for any artist&rsquo;s performance or non-appearance, for an event
              that is unauthorized or fraudulent, or for any other act or omission of the Organizer.
            </p>
            <p>
              To the maximum extent permitted by law: (a) the Organizer&rsquo;s total liability arising from your
              purchase is limited to the ticket face value paid; and (b) <strong className="text-ink">Rameelo&rsquo;s
              total liability arising from your purchase is limited to the service fees Rameelo actually retained on
              your order</strong>. Neither is liable for indirect, incidental, special, or consequential damages.
            </p>
          </Section>

          <Section n="13" title="Indemnification">
            <p>
              You agree to indemnify and hold harmless Rameelo and its affiliates, officers, and employees from claims,
              damages, and costs arising out of your use of the Platform, your violation of these Terms, or — if you
              are an Organizer — your event.
            </p>
          </Section>

          <Section n="14" title="Governing Law & Disputes">
            <p>
              These Terms are governed by the laws of the State of Delaware, without regard to conflict-of-laws rules.
              Any dispute not resolved informally shall be resolved on an individual basis and not as part of any class
              action.
            </p>
          </Section>

          <Section n="15" title="Changes to These Terms">
            <p>
              We may update these Terms from time to time. The version and effective date appear at the top of this
              page, and the ticket purchase terms you accept at checkout are recorded with a version, timestamp, and IP
              address. Continued use of the Platform after an update means you accept the revised Terms.
            </p>
          </Section>

          <Section n="16" title="Contact">
            <p>
              Questions about these Terms? Email{" "}
              <a href="mailto:support@rameelo.com" className="text-aubergine font-semibold hover:underline">support@rameelo.com</a>.
              See also our{" "}
              <Link href="/privacy" className="text-aubergine font-semibold hover:underline">Privacy Policy</Link>.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
