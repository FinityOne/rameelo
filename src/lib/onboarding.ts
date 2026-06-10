// ── Organizer onboarding questionnaire — shared types + agreement copy ───────
// The public questionnaire (src/app/onboarding/[token]) collects an organizer's
// first-step setup info. Submission is a one-time, signed acknowledgment of the
// Rameelo organizer affiliation terms below. Bump ONBOARDING_AGREEMENT_VERSION
// whenever the agreement text materially changes.

export const ONBOARDING_AGREEMENT_VERSION = "2.4";
export const ONBOARDING_AGREEMENT_EFFECTIVE = "June 9, 2026";

// Short, friendly summary shown next to the acceptance control.
export const ONBOARDING_AGREEMENT_SUMMARY =
  "By submitting, you confirm the information is accurate and agree, on behalf of your organization, to the Rameelo Organizer Onboarding Acknowledgments & Agreements you reviewed.";

export const ONBOARDING_AGREEMENT_PREAMBLE =
  "The Organizer acknowledges and agrees to the following as part of creating an account, onboarding onto the Rameelo platform, and listing events for sale.";

export const ONBOARDING_AGREEMENT_CLOSING =
  "By proceeding with onboarding, the Organizer acknowledges that they have read, understood, and agreed to all of the above terms and representations.";

export type AgreementSection = { n: number; title: string; points: string[] };

// ── Payout-hold window (dynamic) ─────────────────────────────────────────────
// Payouts are frozen for a configurable number of days before the event date.
// Admins set this per-organization (org_onboarding.config.payoutHoldDays); when an
// organizer signs, the resolved number is baked into the snapshotted agreement_text
// and stays locked for that signature. Falls back to the platform default below.
export const DEFAULT_PAYOUT_HOLD_DAYS = 14;

export function payoutHoldPolicyLine(days: number): string {
  const n = Math.max(0, Math.round(days));
  return `No payouts will be processed within ${n} day${n === 1 ? "" : "s"} prior to the event date.`;
}

function payoutPolicyPoints(days: number): string[] {
  return [
    "All payout requests are subject to administrative review and approval.",
    "Funds become eligible for payout only after applicable payment clearing periods have passed.",
    "Organizer may request payouts on eligible cleared funds.",
    payoutHoldPolicyLine(days),
    "Remaining eligible funds are generally released following successful completion of the event and completion of any required reviews.",
  ];
}

// The full Organizer Onboarding Acknowledgments & Agreements. Disclosed in step 2
// of the questionnaire and bound by the typed signature at submit. The structured
// form is rendered in the UI; the agreement text is derived from it. The payout
// section (n=10) is parameterized — see buildAgreementSections / buildAgreementText.
const AGREEMENT_SECTIONS_BASE: AgreementSection[] = [
  { n: 1, title: "Account Creation & Authority", points: [
    "Organizer is creating a Rameelo account and agrees to Rameelo's Terms of Service and Privacy Policy.",
    "Organizer represents and warrants that they have the legal authority to act on behalf of the organization, venue, artist, or event being listed.",
    "Organizer has all necessary rights, permissions, permits, licenses, and approvals required to host, market, and sell tickets for the event.",
  ]},
  { n: 2, title: "Promotional Pricing Acknowledgment", points: [
    "Organizer acknowledges that Rameelo's current pricing structure is promotional in nature and may be modified for future events at Rameelo's sole discretion.",
    "Current promotional pricing includes: a 3% platform fee paid by attendees; a 5% card processing fee paid by attendees; and 0% ACH fee to attendees for eligible transactions up to the applicable promotional threshold.",
    "Future pricing, fees, and platform charges may change upon notice from Rameelo.",
  ]},
  { n: 3, title: "Complimentary Tickets", points: [
    "Organizer grants Rameelo the right to issue up to fifteen (15) complimentary tickets per event.",
    "Complimentary tickets may be used for staff, event operations, customer service, influencers, promotional campaigns, giveaways, media partners, sponsors, and marketing initiatives.",
  ]},
  { n: 4, title: "Marketing & Promotional License", points: [
    "Organizer grants Rameelo a worldwide, royalty-free, non-exclusive license to use and display the organizer name, event name, artist names, logos, images, videos, event descriptions, and marketing materials.",
    "Such materials may be used across Rameelo websites, mobile applications, social media platforms, advertising campaigns, email marketing, SMS marketing, sales materials, investor materials, case studies, and historical event archives.",
    "Rameelo is not obligated to market or promote the event, but will use good-faith efforts to promote it as much as reasonably possible.",
    "Additional or special marketing requests are not included; any such requests will have separate costs that can be discussed and purchased separately.",
  ]},
  { n: 5, title: "Case Studies & Success Stories", points: [
    "Organizer grants Rameelo permission to reference the Organizer and Event as a customer of the platform.",
    "Rameelo may publish aggregate event metrics, success stories, testimonials, attendance figures, and sales statistics for marketing and business development purposes.",
  ]},
  { n: 6, title: "Data & Analytics Rights", points: [
    "Organizer retains ownership of its event and attendee relationships.",
    "Rameelo retains ownership of all platform technology, software, analytics, operational metrics, benchmarking data, fraud data, and platform-generated insights.",
    "Rameelo may use aggregated and anonymized data for reporting, benchmarking, product development, and marketing purposes.",
  ]},
  { n: 7, title: "Event Information Accuracy", points: [
    "Organizer certifies that all event information submitted is accurate and current, including event dates, venue information, artist lineup, age restrictions, ticket tiers, pricing, and event policies.",
    "Organizer agrees to promptly update any material changes.",
  ]},
  { n: 8, title: "Marketing Cooperation", points: [
    "Rameelo does not require exclusivity — Organizer is free to use other ticketing, sales, or promotional platforms at its discretion. The cooperation terms below apply to tickets and links offered through Rameelo.",
    "For tickets sold through Rameelo, Organizer agrees to direct those purchasers to Rameelo's official checkout process.",
    "Organizer agrees to publish and maintain the Rameelo ticket link(s) on its Instagram, other social media channels, and website.",
    "Organizer agrees to cross-promote with Rameelo on social media, including sharing, tagging, and reposting Rameelo's related content.",
    "Organizer agrees to display the Rameelo logo and, where appropriate, language identifying Rameelo as the official ticketing partner (e.g., “Official Ticketing Partner of [Organization Name]”).",
    "Organizer agrees not to remove or obscure Rameelo branding from ticket purchase flows without prior written approval.",
    "Organizer authorizes Rameelo to send transactional communications, event reminders, promotional communications, and attendee engagement campaigns related to the event.",
  ]},
  { n: 9, title: "KYC & Business Verification", points: [
    "Rameelo may require additional verification at any time, including government-issued identification, business registration documents, EIN verification, bank account verification, venue agreements, artist agreements, and insurance documentation.",
    "Failure to provide requested documentation may result in delayed sales activation, payout delays, or account suspension.",
  ]},
  { n: 10, title: "Payout Policy", points: payoutPolicyPoints(DEFAULT_PAYOUT_HOLD_DAYS) },
  { n: 11, title: "Reserve Requirements", points: [
    "Rameelo may maintain a reserve of up to twenty percent (20%) of event proceeds.",
    "Rameelo may increase reserve requirements when deemed necessary due to fraud risk, chargeback exposure, event size, organizer history, payment processor requirements, refund risk, or operational or financial risk factors.",
  ]},
  { n: 12, title: "Chargebacks, Fraud & Investigations", points: [
    "Organizer agrees to cooperate fully with fraud investigations, chargebacks, payment disputes, and risk reviews.",
    "Organizer shall provide requested documentation within five (5) business days when requested by Rameelo.",
    "Such documentation may include venue agreements, artist agreements, event photos, communications, attendee records, event policies, and supporting evidence.",
  ]},
  { n: 13, title: "Refunds", points: [
    "Organizer remains responsible for event refund decisions unless otherwise required by law or payment processor requirements.",
    "Rameelo reserves the right to issue refunds in cases involving fraud, duplicate transactions, system errors, legal obligations, or payment processor requirements.",
    "Refund amounts may be deducted from future payouts.",
  ]},
  { n: 14, title: "Event Cancellations & Postponements", points: [
    "Organizer remains financially responsible for cancellations, postponements, venue issues, artist issues, and other event-related obligations.",
    "Rameelo may withhold payouts, establish reserves, or issue refunds as necessary to protect attendees and the platform.",
  ]},
  { n: 15, title: "Tax Responsibility", points: [
    "Organizer is solely responsible for determining, collecting, reporting, and remitting any applicable taxes associated with the event, including local, state, federal, entertainment, admissions, or amusement taxes.",
  ]},
  { n: 16, title: "Insurance", points: [
    "Organizer acknowledges that Rameelo may require proof of event liability insurance for certain events, venues, attendance levels, or risk profiles.",
  ]},
  { n: 17, title: "Right to Suspend Services", points: [
    "Rameelo may suspend ticket sales, delay payouts, freeze funds, remove listings, suspend accounts, or terminate services if fraud is suspected, excessive chargebacks occur, terms are violated, legal concerns arise, required documentation is not provided, or operational or financial risk is identified.",
  ]},
  { n: 18, title: "Indemnification", points: [
    "Organizer agrees to defend, indemnify, and hold harmless Rameelo and its affiliates, officers, employees, contractors, and partners from claims, damages, liabilities, losses, costs, and expenses arising from the event, organizer actions or omissions, venue disputes, artist disputes, intellectual property claims, attendee claims, or regulatory violations.",
  ]},
  { n: 19, title: "Force Majeure", points: [
    "Rameelo shall not be liable for delays, interruptions, or failures caused by circumstances beyond its reasonable control, including acts of God, natural disasters, pandemics, government actions, labor disputes, internet outages, payment processor disruptions, venue closures, or artist cancellations.",
  ]},
  { n: 20, title: "Limitation of Liability", points: [
    "To the fullest extent permitted by law, Rameelo's total liability arising out of or relating to the event shall not exceed the total platform fees retained by Rameelo for the applicable event.",
  ]},
  { n: 21, title: "Platform Changes & Operational Discretion", points: [
    "Rameelo may, at its sole discretion, modify pricing, fees, platform features, policies, processes, and operational practices in order to improve the platform, smooth out operations, and ensure a seamless experience for organizers, users, and attendees.",
    "Such changes may include adjustments to checkout flows, payout processes, fee structures, promotional terms, and other operational matters, and may be made with or without prior notice where reasonable.",
    "Rameelo will use good-faith efforts to provide notice of material changes affecting the Organizer and to minimize disruption to active events.",
  ]},
  { n: 22, title: "Electronic Consent", points: [
    "Organizer agrees that electronic acceptance, digital signatures, and online acknowledgments shall be deemed legally binding and enforceable.",
  ]},
];

// Build the agreement personalized by the payout-hold days. Pass the org's
// configured value (resolvePayoutHoldDays) so the signed snapshot locks it in.
export function buildAgreementSections(holdDays: number = DEFAULT_PAYOUT_HOLD_DAYS): AgreementSection[] {
  return AGREEMENT_SECTIONS_BASE.map(s =>
    s.n === 10 ? { ...s, points: payoutPolicyPoints(holdDays) } : s
  );
}

export function buildAgreementText(holdDays: number = DEFAULT_PAYOUT_HOLD_DAYS): string {
  return [
    `RAMEELO ORGANIZER ONBOARDING ACKNOWLEDGMENTS & AGREEMENTS`,
    `Version ${ONBOARDING_AGREEMENT_VERSION} · Effective ${ONBOARDING_AGREEMENT_EFFECTIVE}`,
    ``,
    ONBOARDING_AGREEMENT_PREAMBLE,
    ``,
    ...buildAgreementSections(holdDays).map(s =>
      `${s.n}. ${s.title.toUpperCase()}\n${s.points.map(p => `   • ${p}`).join("\n")}`
    ),
    ``,
    ONBOARDING_AGREEMENT_CLOSING,
  ].join("\n");
}

// Defaults (platform hold window) — kept for callers that don't personalize.
export const ONBOARDING_AGREEMENT_SECTIONS: AgreementSection[] = buildAgreementSections();
export const ONBOARDING_AGREEMENT_TEXT: string = buildAgreementText();

// ── Form data shapes ─────────────────────────────────────────────────────────

export type OnboardingTier = {
  name: string;
  price: string;          // kept as strings — these are organizer-entered drafts
  quantity: string;
  saleStart: string;
  saleEnd: string;
};

export type OnboardingContact = {
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
};

// A single event the organizer wants to run — venue, schedule, tickets, and
// group-discount settings all live per-event so an organizer can add many.
export type OnboardingEvent = {
  eventName: string;
  startDate: string;   // YYYY-MM-DD (native date picker)
  endDate: string;     // YYYY-MM-DD — blank for single-day events
  doorsOpen: string;
  eventStart: string;
  eventEnd: string;
  venueCapacity: string;
  expectedAttendance: string;
  venueName: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  featuredArtists: string;
  tiers: OnboardingTier[];
  groupDiscounts: "yes" | "no" | "";
  groupDiscountsDetails: string;
};

export type OnboardingDocument = {
  name: string;
  url: string;
  size: number;
  type: string;
  category: string;       // e.g. "Event Flyer", "Organizer Logo"
};

// Admin-designed offer shown on step 1 of the questionnaire. Configured per-org
// on the admin organization detail page and stored on org_onboarding.offer.
export type OnboardingOffer = {
  headline: string;        // the specific offer, e.g. "0% platform fee on your first event"
  details: string;         // free-form description of the offer
  bonuses: string[];       // special bonuses Rameelo is extending
  requirements: string[];  // what we ask of the organizer
};

export function emptyOffer(): OnboardingOffer {
  return { headline: "", details: "", bonuses: [], requirements: [] };
}

// Admin-controlled form-flow settings stored on org_onboarding.config.
export type OnboardingConfig = {
  // Number of ACH-paid tickets that are free of the ACH fee. Beyond this
  // threshold, a 1% fee (paid by the organizer) applies to ACH transactions.
  achFreeTickets: number | null;
  // Days before the event date during which payouts are frozen. Admin-set per org
  // and locked into the signed agreement at submission. Null → platform default.
  payoutHoldDays: number | null;
};

export function emptyConfig(): OnboardingConfig {
  return { achFreeTickets: null, payoutHoldDays: null };
}

// Resolve the effective payout-hold days for an org's config, falling back to the
// platform default when the admin hasn't set a value.
export function resolvePayoutHoldDays(config?: Partial<OnboardingConfig> | null): number {
  const v = config?.payoutHoldDays;
  return typeof v === "number" && v >= 0 ? Math.round(v) : DEFAULT_PAYOUT_HOLD_DAYS;
}

// The ACH fee line shown in step 1, personalized by the configured threshold.
export function achFeeLine(achFreeTickets?: number | null): string {
  if (achFreeTickets && achFreeTickets > 0) {
    return `0% ACH fee on your first ${achFreeTickets.toLocaleString()} ACH ticket sales — after that, a 1% fee (paid by you) applies to additional ACH transactions.`;
  }
  return "0% ACH fee for attendees on eligible transactions, up to the applicable promotional threshold.";
}

// The full set of questionnaire answers stored in org_onboarding.responses.
export type OnboardingResponses = {
  // Organizer information
  organizationName: string;
  organizationDescription: string;
  foundedYear: string;
  primaryContactName: string;
  email: string;
  phone: string;
  website: string;
  instagram: string;
  facebook: string;
  // Event(s) — one or more, each with its own venue, schedule, tickets & discounts
  events: OnboardingEvent[];
  // Marketing assets the organizer intends to provide
  marketingAssets: string[];
  // Financial information (no banking — collected separately)
  payoutRecipientName: string;
  payoutEmail: string;
  preferredPaymentMethod: string;
  estimatedGrossRevenue: string;
  // Additional
  additionalNotes: string;
  submittedBy: string;
  // Additional people in the organization
  contacts: OnboardingContact[];
};

export const MARKETING_ASSET_OPTIONS = [
  "Event Flyer",
  "Organizer Logo",
  "Artist Photos",
  "Event Description",
  "Promotional Videos",
  "Sponsor Logos",
] as const;

export const PAYMENT_METHOD_OPTIONS = [
  "Bank transfer (ACH)",
  "Check",
  "Wire",
  "Not sure yet",
] as const;

// ── Step 1 (Welcome & Offer) static content ──────────────────────────────────
export const RAMEELO_WELCOME = "Jai Shree Krishna! 🙏";

export const RAMEELO_MISSION =
  "Rameelo exists to help our community connect, grow, and build on our culture. Every Garba night is a chance to bring people together in joy — and we're here to make yours unforgettable.";

export const RAMEELO_BENEFITS: { title: string; desc: string }[] = [
  { title: "Built for Garba", desc: "A platform made specifically for Raas Garba, Dandiya & Navratri — your community already lives here." },
  { title: "Sell more tickets", desc: "Group discounts, referrals, and an engaged community of dancers ready to attend your event." },
  { title: "Effortless operations", desc: "QR check-in, live sales, team roles, and a browser-based door scanner that just works — no app to install." },
  { title: "Get paid your way", desc: "You keep your full ticket face value; fees are paid by buyers, and ACH payouts are free." },
  { title: "Marketing muscle", desc: "Featured placement, email, and social reach across the diaspora to fill your floor." },
  { title: "Real support", desc: "A team that actually picks up the phone — we're in this with you, every step and every night." },
];

// Promotional pricing — paid by attendees, never deducted from the organizer.
// The ACH line is rendered separately (personalized by config) via achFeeLine().
export const RAMEELO_FEE_POINTS: string[] = [
  "You keep 100% of every ticket's face value — Rameelo fees are never deducted from your payout.",
  "Attendees cover a 3% Rameelo platform fee at checkout.",
  "Attendees cover a 5% card processing fee at checkout.",
];

export const RAMEELO_PROMO_NOTE =
  "This pricing is promotional and may be modified for future events at Rameelo's discretion, with notice. You'll see the full details in the agreement on the next step.";

// ── Step 2 (Rules & Tips) static content ─────────────────────────────────────
export const ONBOARDING_SCAN_TIP =
  "Check-in runs right in your phone or tablet's browser — no app to install. Just bring a device with a camera and internet at each entrance. For busy nights, 1–2 devices per entry lane keeps the line moving.";

export const ONBOARDING_SUPPORT_EMAIL = "support@rameelo.com";
export const ONBOARDING_SUPPORT_NOTE =
  "Rameelo is always here to help — before, during, and after your event. Reach your onboarding contact or email us anytime, and we'll jump in on setup, marketing, and anything you need on the night.";

export function emptyTier(): OnboardingTier {
  return { name: "", price: "", quantity: "", saleStart: "", saleEnd: "" };
}

/** Format a native date range (YYYY-MM-DD) for display, e.g. "Oct 3 – Oct 11, 2026". */
export function formatDateRange(start?: string, end?: string): string {
  const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (!start) return "";
  if (end && end !== start) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start);
}

export function emptyEvent(): OnboardingEvent {
  return {
    eventName: "",
    startDate: "",
    endDate: "",
    doorsOpen: "",
    eventStart: "",
    eventEnd: "",
    venueCapacity: "",
    expectedAttendance: "",
    venueName: "",
    streetAddress: "",
    city: "",
    state: "",
    zip: "",
    featuredArtists: "",
    tiers: [emptyTier()],
    groupDiscounts: "",
    groupDiscountsDetails: "",
  };
}

export function emptyResponses(): OnboardingResponses {
  return {
    organizationName: "",
    organizationDescription: "",
    foundedYear: "",
    primaryContactName: "",
    email: "",
    phone: "",
    website: "",
    instagram: "",
    facebook: "",
    events: [emptyEvent()],
    marketingAssets: [],
    payoutRecipientName: "",
    payoutEmail: "",
    preferredPaymentMethod: "",
    estimatedGrossRevenue: "",
    additionalNotes: "",
    submittedBy: "",
    contacts: [],
  };
}
