import Link from "next/link";
import { Eyebrow, Button, Badge, Avatar } from "@/components/ui";

// ─── Data ────────────────────────────────────────────────────────────────────

const trustStats = [
  { value: "500+", label: "Active organizers" },
  { value: "$4.2M", label: "Revenue processed" },
  { value: "27", label: "Cities this Navratri" },
  { value: "34%", label: "Avg. sales lift with group orders" },
];

const feeComparison = [
  {
    platform: "Rameelo",
    rmlPlan: "Pro",
    ticketFee: "2%",
    processingFee: "2.9% + 30¢",
    total: "~4.9%",
    groupOrders: true,
    garbaFocus: true,
    community: true,
    sponsorTools: true,
    highlight: true,
  },
  {
    platform: "Eventbrite",
    ticketFee: "3.7%",
    processingFee: "2.9% + 79¢",
    total: "~8.5%",
    groupOrders: false,
    garbaFocus: false,
    community: false,
    sponsorTools: false,
  },
  {
    platform: "Sulekha",
    ticketFee: "5–8%",
    processingFee: "2.9% + 30¢",
    total: "~10–12%",
    groupOrders: false,
    garbaFocus: "Partial",
    community: false,
    sponsorTools: false,
  },
  {
    platform: "AllEvents",
    ticketFee: "4%",
    processingFee: "2.9% + 30¢",
    total: "~7.9%",
    groupOrders: false,
    garbaFocus: false,
    community: false,
    sponsorTools: false,
  },
  {
    platform: "Others",
    ticketFee: "5–10%",
    processingFee: "2.9% + 30¢",
    total: "~9–14%",
    groupOrders: false,
    garbaFocus: false,
    community: false,
    sponsorTools: false,
  },
];

const groupOrderSteps = [
  {
    number: "01",
    title: "Organizer sets a minimum.",
    body: "You decide the discount threshold — 5, 8, or 10 tickets. Once a group hits it, every member in that circle automatically gets the group rate.",
  },
  {
    number: "02",
    title: "An attendee creates the group.",
    body: "Anyone ready to commit starts a group order with one tap. They get a unique link they can drop in their group chat or share straight to their Instagram story.",
  },
  {
    number: "03",
    title: "The circle fills itself.",
    body: "Friends join the link on their own time. No coordination drama. Everyone who joins gets notified when the discount threshold is reached — a moment of reward that drives urgency.",
  },
  {
    number: "04",
    title: "Rameelo follows up automatically.",
    body: "We nudge uncommitted members with smart reminders: \"3 more spots until your group unlocks the discount.\" You don't lift a finger — we push the circle to close.",
  },
  {
    number: "05",
    title: "Tickets sell. You get paid.",
    body: "Groups check out together or individually through one unified flow. Higher commitment rate, bigger average order size, faster sellout. Every time.",
  },
];

const communityFeatures = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Photo sharing & event galleries",
    body: "Attendees share their moments directly inside the platform. Your event becomes a living album — the kind of social proof that sells next year's tickets before you've even set the date.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "A real community, not just a list",
    body: "Rameelo is a social network for raas garba enthusiasts. Your events live inside that community — getting discovered organically by people who actually want to come.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    title: "Built-in announcements & updates",
    body: "Push schedule changes, parking notes, or hype posts directly to everyone attending your event. No third-party email blasts. No wondering if they saw it.",
  },
];

const sponsorFeatures = [
  {
    area: "Event listing page",
    description: "Sponsor logo and branded message appear alongside your event details — seen by every visitor who lands on your page.",
  },
  {
    area: "Ticket confirmation email",
    description: "Sponsor placement in the confirmation email sent to every ticket buyer. High open rate, guaranteed impression.",
  },
  {
    area: "Group order flow",
    description: "Sponsor branding appears in the group order invite link and share card — the most-shared piece of content your event produces.",
  },
  {
    area: "Digital ticket & wallet pass",
    description: "Sponsor logo printed on every digital ticket and Apple/Google Wallet pass. Attendees see it every time they open it at the door.",
  },
  {
    area: "Community photo feed",
    description: "Sponsored moments in the post-event photo feed. Authentic placement inside the community experience, not a banner ad.",
  },
];

const testimonials = [
  {
    name: "Rohan Shah",
    role: "Founder, Midwest Navratri Festival",
    city: "Chicago, IL",
    avatar: "RS",
    color: "marigold" as const,
    quote:
      "We moved from Eventbrite to Rameelo two years ago and never looked back. Our reach in the South Asian community doubled in the first season. The platform just gets it — it speaks our language, literally and figuratively.",
    stat: "2× ticket sales in year one",
  },
  {
    name: "Kavya Nair",
    role: "Director, East Coast Garba Association",
    city: "New Jersey",
    avatar: "KN",
    color: "peacock" as const,
    quote:
      "Group orders changed everything. I used to chase people on WhatsApp for weeks. Now they just share the link, the circle fills, everyone commits. We hit 80% sold-out in the first 72 hours.",
    stat: "80% sold in 72 hours",
  },
  {
    name: "Sanjay Mehta",
    role: "Organizer, DFW Dandiya Dhamaka",
    city: "Dallas, TX",
    avatar: "SM",
    color: "durga" as const,
    quote:
      "The sponsor dashboard alone paid for the Pro plan three times over. Presenting to sponsors with built-in placement data and reach numbers — they don't say no to that.",
    stat: "3 sponsors onboarded in week one",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircle({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrganizersPage() {
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
              "radial-gradient(ellipse at 85% 20%, rgba(245,166,35,0.18) 0%, transparent 55%), radial-gradient(ellipse at 15% 80%, rgba(124,31,44,0.4) 0%, transparent 50%)",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <Eyebrow className="mb-6">For Organizers · RML</Eyebrow>

          <h1
            className="font-display font-bold text-white mb-4"
            style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.05, letterSpacing: "-0.025em" }}
          >
            Run your Navratri on the platform
          </h1>
          <h1
            className="font-editorial italic text-marigold mb-8"
            style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.05, fontWeight: 500 }}
          >
            born in garba circles.
          </h1>

          <p className="font-ui text-white/60 text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            Rameelo is the only ticketing platform built specifically for raas garba — not adapted from a
            generic events tool. Lower fees, group-order conversions, community tools, and sponsorship
            infrastructure that generic platforms don&apos;t have and never will.
          </p>

          <div className="flex flex-wrap gap-3 justify-center mb-8">
            <Button href="#get-started" size="lg">
              List your first event free
            </Button>
            <Button href="/pricing" variant="ghost" size="lg">
              See plans & pricing
            </Button>
          </div>

          <p className="font-mono text-[11px] text-white/30 tracking-widest uppercase">
            No credit card required · Setup in under 20 minutes
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TRUST STATS
      ══════════════════════════════════════════ */}
      <section className="bg-ivory py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-center text-[11px] text-ink-muted tracking-widest uppercase mb-8">
            Trusted by organizers in 120+ US cities
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-ivory-200 rounded-[16px] overflow-hidden border border-ivory-200">
            {trustStats.map((s) => (
              <div key={s.label} className="bg-ivory py-8 px-6 text-center">
                <p
                  className="font-display font-bold text-aubergine"
                  style={{ fontSize: "36px", letterSpacing: "-0.03em", lineHeight: 1 }}
                >
                  {s.value}
                </p>
                <p className="font-mono text-[11px] text-ink-muted tracking-widest uppercase mt-2">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          01 — BUILT FOR RAAS GARBA
      ══════════════════════════════════════════ */}
      <section className="bg-ivory-200 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Eyebrow className="mb-4">01 — Purpose built</Eyebrow>
              <h2
                className="font-display font-semibold text-ink mb-5"
                style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.022em", lineHeight: 1.1 }}
              >
                Generic ticketing platforms weren&apos;t built for{" "}
                <span className="font-editorial italic text-marigold">this community.</span>
              </h2>
              <p className="font-ui text-ink-muted text-base leading-relaxed mb-6">
                Eventbrite doesn&apos;t know the difference between Garba and Disco Dandiya. Sulekha isn&apos;t
                built around group purchasing. AllEvents can&apos;t surface your college raas team rankings or
                put your sponsor on a digital wallet pass.
              </p>
              <p className="font-ui text-ink-muted text-base leading-relaxed mb-8">
                Rameelo was built from day one for the Gujarati diaspora and every South Asian
                community that circles up for Navratri. Every feature on this platform — from the
                group order flow to the AI-driven discovery — was designed around how this community
                actually buys tickets: together, on group chat, at 11pm.
              </p>
              <ul className="space-y-3">
                {[
                  "Raas Garba–native event categories and discovery filters",
                  "AI-powered audience matching with 80K+ active members",
                  "AI-powered attendee matching across 80K+ active members",
                  "9-night multi-session Navratri event management built in",
                  "Community in the same language — literally and culturally",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-ui text-sm text-ink-muted">
                    <CheckCircle className="w-4 h-4 text-peacock shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual: platform feature cards */}
            <div className="space-y-3">
              {[
                { label: "DISCOVERY", title: "Find a Garba near you", sub: "80K+ members · AI matched · 27 cities", bg: "bg-aubergine", dark: true },
                { label: "COMMUNITY", title: "80K+ members ready to discover your event.", sub: "AI matched · Photo sharing · Group orders", bg: "bg-ivory", dark: false },
                { label: "NAVRATRI", title: "Night 04 of 09 · The Edison Garba", sub: "Multi-session · Live check-in · Sponsor placement", bg: "bg-durga", dark: true },
              ].map((card) => (
                <div
                  key={card.label}
                  className={`${card.bg} rounded-[16px] px-6 py-5 border ${card.dark ? "border-white/10" : "border-ivory-200"}`}
                >
                  <p className={`font-mono text-[10px] tracking-widest uppercase mb-1.5 ${card.dark ? "text-marigold" : "text-ink-muted"}`}>
                    {card.label}
                  </p>
                  <p
                    className={`font-display font-semibold ${card.dark ? "text-white" : "text-ink"}`}
                    style={{ fontSize: "18px", letterSpacing: "-0.015em" }}
                  >
                    {card.title}
                  </p>
                  <p className={`font-ui text-xs mt-1.5 ${card.dark ? "text-white/50" : "text-ink-muted"}`}>
                    {card.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          02 — FEE COMPARISON
      ══════════════════════════════════════════ */}
      <section className="bg-ivory py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Eyebrow className="mb-4">02 — Lower fees</Eyebrow>
            <h2
              className="font-display font-semibold text-ink mb-4"
              style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.022em", lineHeight: 1.1 }}
            >
              Keep more of every ticket sold.
            </h2>
            <p className="font-ui text-ink-muted text-base max-w-xl mx-auto leading-relaxed">
              At a 1,000-ticket event priced at $45, the difference between Rameelo Pro and Eventbrite
              is over <strong className="text-ink">$3,200</strong> back in your pocket — before you even
              account for group order revenue lift.
            </p>
          </div>

          {/* Fee Comparison Table */}
          <div className="rounded-[16px] overflow-hidden border border-ivory-200 shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-6 bg-ivory-200 border-b border-ivory-200">
              <div className="col-span-2 px-5 py-4">
                <p className="font-mono text-[10px] text-ink-muted tracking-widest uppercase">Platform</p>
              </div>
              <div className="px-4 py-4 text-center">
                <p className="font-mono text-[10px] text-ink-muted tracking-widest uppercase">Ticket fee</p>
              </div>
              <div className="px-4 py-4 text-center">
                <p className="font-mono text-[10px] text-ink-muted tracking-widest uppercase">Processing</p>
              </div>
              <div className="px-4 py-4 text-center">
                <p className="font-mono text-[10px] text-ink-muted tracking-widest uppercase">Effective total</p>
              </div>
              <div className="px-4 py-4 text-center">
                <p className="font-mono text-[10px] text-ink-muted tracking-widest uppercase">Garba-native</p>
              </div>
            </div>

            {feeComparison.map((row) => (
              <div
                key={row.platform}
                className={`grid grid-cols-6 border-b border-ivory-200 last:border-b-0 transition-colors ${
                  row.highlight
                    ? "bg-marigold/8 border-l-2 border-l-marigold"
                    : "bg-ivory hover:bg-ivory-200/40"
                }`}
              >
                <div className="col-span-2 px-5 py-4 flex items-center gap-3">
                  {row.highlight && (
                    <div className="w-7 h-7 bg-marigold rounded-[6px] flex items-center justify-center shrink-0">
                      <span className="font-display font-bold text-aubergine text-[13px]">R</span>
                    </div>
                  )}
                  <div>
                    <p className={`font-ui font-semibold text-sm ${row.highlight ? "text-ink" : "text-ink-muted"}`}>
                      {row.platform}
                    </p>
                    {row.highlight && row.rmlPlan && (
                      <Badge variant="marigold" className="mt-1">Pro plan</Badge>
                    )}
                  </div>
                </div>
                <div className="px-4 py-4 text-center flex items-center justify-center">
                  <span className={`font-ui text-sm font-semibold ${row.highlight ? "text-ink" : "text-ink-muted"}`}>
                    {row.ticketFee}
                  </span>
                </div>
                <div className="px-4 py-4 text-center flex items-center justify-center">
                  <span className="font-ui text-xs text-ink-muted">{row.processingFee}</span>
                </div>
                <div className="px-4 py-4 text-center flex items-center justify-center">
                  <span
                    className={`font-display font-bold text-base ${
                      row.highlight ? "text-peacock" : "text-ink-muted"
                    }`}
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {row.total}
                  </span>
                </div>
                <div className="px-4 py-4 text-center flex items-center justify-center">
                  {row.garbaFocus === true ? (
                    <CheckCircle className="w-5 h-5 text-peacock" />
                  ) : row.garbaFocus === "Partial" ? (
                    <span className="font-mono text-[10px] text-ink-muted tracking-widest">Partial</span>
                  ) : (
                    <XCircle className="w-5 h-5 text-ink-muted/40" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Savings callout */}
          <div className="mt-6 bg-aubergine rounded-[16px] px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] text-marigold tracking-widest uppercase mb-1.5">
                Example · 1,000 tickets × $45
              </p>
              <p className="font-display font-semibold text-white" style={{ fontSize: "20px", letterSpacing: "-0.02em" }}>
                Rameelo saves you <span className="text-marigold">$3,200+</span> vs. Eventbrite
                per event.
              </p>
            </div>
            <Button href="/pricing" size="md" className="shrink-0">
              See full pricing
            </Button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          03 — GROUP ORDERS
      ══════════════════════════════════════════ */}
      <section className="bg-ivory-200 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Eyebrow className="mb-4">03 — The group order feature</Eyebrow>
            <h2
              className="font-display font-semibold text-ink mb-4"
              style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.022em", lineHeight: 1.1 }}
            >
              Nobody goes to Garba alone.
              <br />
              <span className="font-editorial italic text-marigold">Your sales shouldn&apos;t wait on them.</span>
            </h2>
            <p className="font-ui text-ink-muted text-base max-w-2xl mx-auto leading-relaxed">
              The #1 reason tickets go unsold: people want to go, but won&apos;t commit until their whole
              group is on board. Group Orders solve this by letting one person create a circle, share
              a link, and get everyone committed — before anyone has to wait on anyone else.
            </p>
          </div>

          {/* Problem → Solution visual */}
          <div className="grid md:grid-cols-2 gap-5 mb-16">
            {/* Before */}
            <div className="bg-ivory rounded-[16px] p-7 border border-ivory-200">
              <p className="font-mono text-[10px] text-ink-muted tracking-widest uppercase mb-4">
                Without group orders
              </p>
              <div className="space-y-3 mb-5">
                {[
                  { msg: "\"Are you guys going to Navratri?\"", sender: "Priya", delay: "" },
                  { msg: "\"Maybe, depends on who else is going\"", sender: "Rohan", delay: "" },
                  { msg: "\"I'll go if you all go\"", sender: "Aanya", delay: "" },
                  { msg: "\"...\"", sender: "Group chat", delay: "3 weeks later" },
                  { msg: "Event sells out. Nobody goes.", sender: "", delay: "", red: true },
                ].map((item, i) => (
                  <div key={i}>
                    {item.delay && (
                      <p className="font-mono text-[10px] text-ink-muted tracking-widest text-center my-2 uppercase">
                        — {item.delay} —
                      </p>
                    )}
                    <div className={`rounded-[10px] px-3 py-2 ${item.red ? "bg-durga/10 border border-durga/20" : "bg-ivory-200"}`}>
                      {item.sender && (
                        <p className="font-mono text-[9px] text-ink-muted tracking-widest uppercase mb-0.5">
                          {item.sender}
                        </p>
                      )}
                      <p className={`font-ui text-sm ${item.red ? "text-durga font-medium" : "text-ink-muted"}`}>
                        {item.msg}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Badge variant="durga">❌ Tickets unsold. Revenue lost.</Badge>
            </div>

            {/* After */}
            <div className="bg-ivory rounded-[16px] p-7 border border-ivory-200">
              <p className="font-mono text-[10px] text-marigold tracking-widest uppercase mb-4">
                With Rameelo group orders
              </p>
              <div className="space-y-2.5 mb-5">
                {[
                  { step: "Priya creates a group order", detail: "1 tap · gets a shareable link", state: "done" },
                  { step: "Drops link in group chat + Instagram story", detail: "Link works for anyone, anywhere", state: "done" },
                  { step: "Rohan joins · Aanya joins · 4 more join", detail: "Each member commits individually", state: "done" },
                  { step: "🎉 8 tickets — discount threshold hit", detail: "Everyone notified. Group rate unlocked.", state: "celebrate" },
                  { step: "Automatic nudges close stragglers", detail: "\"3 more spots until your discount!\"", state: "auto" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`rounded-[10px] px-3 py-2.5 flex items-start gap-2.5 ${
                      item.state === "celebrate" ? "bg-marigold/15 border border-marigold/30" : "bg-ivory-200"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold font-ui ${
                        item.state === "celebrate" ? "bg-marigold text-aubergine" : item.state === "auto" ? "bg-peacock text-white" : "bg-aubergine text-white"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-ui text-sm text-ink font-medium">{item.step}</p>
                      <p className="font-ui text-xs text-ink-muted">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Badge variant="peacock" dot>Group sold out. 34% more revenue.</Badge>
            </div>
          </div>

          {/* 5-step how it works */}
          <div className="grid md:grid-cols-5 gap-4 mb-12">
            {groupOrderSteps.map((step, i) => (
              <div key={step.number} className="relative">
                {i < groupOrderSteps.length - 1 && (
                  <div className="hidden md:block absolute top-5 left-full w-full h-px bg-ivory-200 z-0 -translate-x-4" />
                )}
                <div className="relative bg-ivory rounded-[16px] p-5 border border-ivory-200 h-full">
                  <div className="w-8 h-8 bg-marigold rounded-[8px] flex items-center justify-center mb-3">
                    <span className="font-mono text-[11px] font-bold text-aubergine tracking-widest">
                      {step.number}
                    </span>
                  </div>
                  <h4
                    className="font-display font-semibold text-ink mb-2"
                    style={{ fontSize: "14px", letterSpacing: "-0.01em" }}
                  >
                    {step.title}
                  </h4>
                  <p className="font-ui text-xs text-ink-muted leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Group discount mechanic callout */}
          <div
            className="rounded-[24px] p-8 md:p-10"
            style={{ background: "#2E1B30" }}
          >
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <Eyebrow color="marigold" className="mb-4">The discount mechanic</Eyebrow>
                <h3
                  className="font-display font-semibold text-white mb-4"
                  style={{ fontSize: "28px", letterSpacing: "-0.02em", lineHeight: 1.15 }}
                >
                  The bigger the circle,
                  <br />
                  <span className="font-editorial italic text-marigold">the better the deal.</span>
                </h3>
                <p className="font-ui text-white/60 text-sm leading-relaxed mb-6">
                  You set discount thresholds — say, 10% off at 5 tickets, 15% off at 10 tickets.
                  Once a group hits the minimum, every member gets the group rate automatically.
                  This creates a viral loop: people share more aggressively because their friends&apos;
                  participation directly benefits them.
                </p>
                <p className="font-ui text-white/60 text-sm leading-relaxed">
                  The result: larger groups, more committed attendees, and a natural social amplification
                  engine built into every ticket sale — at no extra cost to you.
                </p>
              </div>

              {/* Discount tier visual */}
              <div className="space-y-3">
                {[
                  { tickets: "5+ tickets", discount: "10% off", progress: 55, label: "Most common" },
                  { tickets: "8+ tickets", discount: "12% off", progress: 75, label: "Sweet spot" },
                  { tickets: "10+ tickets", discount: "15% off", progress: 90, label: "Circle goal" },
                ].map((tier) => (
                  <div key={tier.tickets} className="bg-white/5 rounded-[12px] p-4 border border-white/8">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/40 tracking-widest uppercase">
                          {tier.tickets}
                        </span>
                        <Badge variant="ivory" className="text-[9px]">{tier.label}</Badge>
                      </div>
                      <span className="font-display font-bold text-marigold text-lg" style={{ letterSpacing: "-0.02em" }}>
                        {tier.discount}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-marigold"
                        style={{ width: `${tier.progress}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="bg-marigold rounded-[12px] p-4 flex items-center justify-between">
                  <p className="font-ui text-aubergine font-semibold text-sm">Avg. group size on Rameelo</p>
                  <p
                    className="font-display font-bold text-aubergine text-3xl"
                    style={{ letterSpacing: "-0.03em" }}
                  >
                    7.4
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          04 — COMMUNITY
      ══════════════════════════════════════════ */}
      <section className="bg-ivory py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Eyebrow className="mb-4">04 — Community & network</Eyebrow>
            <h2
              className="font-display font-semibold text-ink mb-4"
              style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.022em", lineHeight: 1.1 }}
            >
              Your event doesn&apos;t end when the lights come on.
            </h2>
            <p className="font-ui text-ink-muted text-base max-w-xl mx-auto leading-relaxed">
              Rameelo is a living community for people who love raas garba — not just a place to buy
              tickets and leave. That community becomes your most powerful marketing channel.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mb-10">
            {communityFeatures.map((f) => (
              <div
                key={f.title}
                className="bg-ivory-200 rounded-[16px] p-6 border border-ivory-200 flex gap-4"
              >
                <div className="w-10 h-10 bg-aubergine/10 rounded-[10px] flex items-center justify-center text-aubergine shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h3
                    className="font-display font-semibold text-ink mb-1.5"
                    style={{ fontSize: "16px", letterSpacing: "-0.01em" }}
                  >
                    {f.title}
                  </h3>
                  <p className="font-ui text-sm text-ink-muted leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Community stat strip */}
          <div className="bg-aubergine rounded-[16px] p-6 flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {[
              { value: "80K+", label: "Active community members" },
              { value: "12K+", label: "Photos shared last Navratri" },
              { value: "320", label: "Organizers in the network" },
              { value: "4.9★", label: "Avg. organizer rating" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p
                  className="font-display font-bold text-white"
                  style={{ fontSize: "28px", letterSpacing: "-0.03em" }}
                >
                  {s.value}
                </p>
                <p className="font-mono text-[10px] text-white/40 tracking-widest uppercase mt-1">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          05 — SPONSORSHIP TOOLS
      ══════════════════════════════════════════ */}
      <section className="bg-ivory-200 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <Eyebrow className="mb-4">05 — Sponsorship tools</Eyebrow>
              <h2
                className="font-display font-semibold text-ink mb-5"
                style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.022em", lineHeight: 1.1 }}
              >
                Sponsors built into
                <br />
                <span className="font-editorial italic text-marigold">the experience.</span>
              </h2>
              <p className="font-ui text-ink-muted text-base leading-relaxed mb-6">
                When you onboard a sponsor, their brand doesn&apos;t live in a banner nobody clicks — it
                lives inside the moments your attendees actually pay attention to. Confirmation emails.
                Shared group links. Digital wallet passes. The photo feed.
              </p>
              <p className="font-ui text-ink-muted text-base leading-relaxed mb-8">
                Our sponsor dashboard gives you a professional pitch deck with real audience numbers —
                impressions, click-throughs, and event reach — so you can close deals and deliver
                measurable ROI to every sponsor you bring on.
              </p>
              <Button href="#get-started">
                Start onboarding sponsors
              </Button>
            </div>

            <div className="space-y-3">
              {sponsorFeatures.map((f, i) => (
                <div
                  key={f.area}
                  className="bg-ivory rounded-[16px] px-5 py-4 border border-ivory-200 flex gap-4 items-start"
                >
                  <div className="w-7 h-7 bg-marigold/15 rounded-[6px] flex items-center justify-center shrink-0">
                    <span className="font-mono text-[10px] font-bold text-marigold-dark">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div>
                    <p className="font-display font-semibold text-ink text-sm mb-0.5" style={{ letterSpacing: "-0.01em" }}>
                      {f.area}
                    </p>
                    <p className="font-ui text-xs text-ink-muted leading-relaxed">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════ */}
      <section className="py-20" style={{ background: "#2E1B30" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Eyebrow className="mb-4">Organizer stories</Eyebrow>
            <h2
              className="font-display font-semibold text-white"
              style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.022em" }}
            >
              Real organizers. Real results.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-[16px] p-6 flex flex-col"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <svg className="w-6 h-6 mb-4" fill="#F5A623" opacity="0.35" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="font-ui text-white/70 text-sm leading-relaxed flex-1 mb-5">{t.quote}</p>

                {/* Stat */}
                <div
                  className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full mb-5"
                  style={{ background: "rgba(245,166,35,0.15)", border: "1px solid rgba(245,166,35,0.25)" }}
                >
                  <svg className="w-3 h-3 text-marigold" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                  <span className="font-mono text-[10px] text-marigold tracking-widest uppercase">{t.stat}</span>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-white/8">
                  <Avatar initials={t.avatar} size="md" color={t.color} />
                  <div>
                    <p className="font-ui font-semibold text-white text-sm">{t.name}</p>
                    <p className="font-mono text-[10px] text-white/40 tracking-widest uppercase">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA — GET STARTED
      ══════════════════════════════════════════ */}
      <section id="get-started" className="relative overflow-hidden py-24" style={{ background: "#7C1F2C" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 80% 50%, rgba(245,166,35,0.22) 0%, transparent 55%), radial-gradient(ellipse at 10% 60%, rgba(46,27,48,0.5) 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Eyebrow className="mb-6">Get started today</Eyebrow>
            <h2
              className="font-display font-bold text-white mb-3"
              style={{ fontSize: "clamp(32px, 5vw, 56px)", letterSpacing: "-0.025em", lineHeight: 1.05 }}
            >
              Your next Navratri starts here.
            </h2>
            <h2
              className="font-editorial italic text-marigold mb-8"
              style={{ fontSize: "clamp(32px, 5vw, 56px)", lineHeight: 1.05, fontWeight: 500 }}
            >
              Nine nights. Zero spreadsheets.
            </h2>
            <p className="font-ui text-white/55 text-base max-w-lg mx-auto leading-relaxed">
              Join 500+ organizers who trust Rameelo to run their events. List your first event in under
              20 minutes — free, no credit card needed.
            </p>
          </div>

          {/* Sign-up form */}
          <div
            className="max-w-md mx-auto rounded-[24px] p-7"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <p className="font-display font-semibold text-white text-base mb-5" style={{ letterSpacing: "-0.015em" }}>
              Create your organizer account
            </p>
            <div className="space-y-3">
              {["Your name", "Email address", "Organization or event name"].map((placeholder) => (
                <input
                  key={placeholder}
                  type={placeholder === "Email address" ? "email" : "text"}
                  placeholder={placeholder}
                  className="w-full rounded-[10px] px-4 py-3 font-ui text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-marigold/50"
                  style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
              ))}
              <button className="w-full bg-marigold text-aubergine font-ui font-bold py-3.5 rounded-[10px] hover:bg-marigold-dark transition-colors text-sm">
                Create free account →
              </button>
            </div>
            <p className="font-mono text-[10px] text-white/25 tracking-widest uppercase text-center mt-4">
              Free forever · No credit card · Cancel anytime
            </p>
          </div>

          <div className="text-center mt-8">
            <p className="font-ui text-white/40 text-sm">
              Running a large-scale festival?{" "}
              <a
                href="mailto:organizers@rameelo.com"
                className="text-marigold hover:text-marigold-dark underline underline-offset-2 transition-colors"
              >
                Talk to our team directly
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
