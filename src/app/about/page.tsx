import Link from "next/link";
import { stats } from "@/lib/data";

const team = [
  {
    name: "Arjun Mehta",
    role: "Co-Founder & CEO",
    bio: "Born in Ahmedabad, raised in New Jersey. Built Rameelo because he missed the community after moving to San Francisco.",
    avatar: "AM",
  },
  {
    name: "Priya Kothari",
    role: "Co-Founder & CPO",
    bio: "Former event organizer who ran the largest Navratri in New England. Obsessed with building tools that help organizers succeed.",
    avatar: "PK",
  },
  {
    name: "Dev Patel",
    role: "Head of Engineering",
    bio: "Full-stack engineer and avid Garba dancer. Believes technology should be invisible — culture should take center stage.",
    avatar: "DP",
  },
  {
    name: "Nisha Shah",
    role: "Head of Community",
    bio: "Community builder who has connected thousands of South Asians across 30+ US cities. Her superpower is making everyone feel at home.",
    avatar: "NS",
  },
];

const values = [
  {
    icon: "🌸",
    title: "Roots & Pride",
    body: "We believe in honoring where we come from. Garba is not just a dance — it is a living tradition that deserves to thrive in every corner of the world.",
  },
  {
    icon: "🤝",
    title: "Radical Inclusion",
    body: "Whether you are a third-generation Indian-American or experiencing Navratri for the first time, you belong here.",
  },
  {
    icon: "🌍",
    title: "Diaspora First",
    body: "We build for people who live between two worlds. We celebrate the beautiful hybrid culture of the diaspora.",
  },
  {
    icon: "✨",
    title: "Joy as Infrastructure",
    body: "Celebration is not a luxury — it is how communities stay connected. We are here to make sure those celebrations happen.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-cream">
      {/* ── Hero ── */}
      <section
        className="text-white py-24 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #6e1a2e 0%, #4a1238 45%, #2e1a47 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 50% 70%, #c29f5d 0%, transparent 60%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-5xl block mb-7">🪔</span>
          <p className="text-gold text-xs font-bold uppercase tracking-widest mb-4">Our Story</p>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-5">We Are Rameelo</h1>
          <p className="text-white/65 text-lg leading-relaxed max-w-2xl mx-auto">
            A platform built by the diaspora, for the diaspora. Our mission is to make South Asian culture and
            community thrive across every state in America.
          </p>
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="bg-cream py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-gold-dark text-xs font-bold uppercase tracking-widest mb-3">Our Mission</p>
              <h2 className="text-3xl md:text-4xl font-bold text-ink tracking-tight mb-5">
                Culture Should Not Have Borders
              </h2>
              <p className="text-ink-secondary text-base leading-relaxed mb-4">
                When our founders moved across the country, they found something missing: the feeling of garba
                night, of chaniya cholis swirling under lights, of dhol beats reverberating through a convention
                hall full of people who understood the same thing they did.
              </p>
              <p className="text-ink-secondary text-base leading-relaxed">
                Rameelo was born to solve that. We started as a simple event listing for Navratri and grew into
                the definitive platform for South Asian cultural celebration in the United States — connecting
                organizers, dancers, families, and newcomers in one place.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white border border-cream-dark rounded-2xl p-7 text-center hover:shadow-sm transition-all"
                >
                  <p className="text-4xl font-extrabold text-brand tracking-tight mb-1">{stat.value}</p>
                  <p className="text-ink-muted text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Gold divider ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-px bg-cream-dark" />
      </div>

      {/* ── Values ── */}
      <section className="bg-cream py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-gold-dark text-xs font-bold uppercase tracking-widest mb-3">What We Stand For</p>
            <h2 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">Our Values</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((v) => (
              <div
                key={v.title}
                className="bg-white border border-cream-dark rounded-2xl p-6 hover:shadow-sm hover:border-brand/20 transition-all"
              >
                <span className="text-3xl block mb-4">{v.icon}</span>
                <h3 className="font-bold text-ink text-base mb-2 tracking-tight">{v.title}</h3>
                <p className="text-ink-muted text-sm leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="bg-cream-surface py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-gold-dark text-xs font-bold uppercase tracking-widest mb-3">The People</p>
            <h2 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">Meet the Team</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member) => (
              <div
                key={member.name}
                className="bg-white border border-cream-dark rounded-2xl p-6 text-center hover:shadow-sm transition-all"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-bold mx-auto mb-4"
                  style={{ background: "linear-gradient(135deg, #6e1a2e, #2e1a47)" }}
                >
                  {member.avatar}
                </div>
                <h3 className="font-bold text-ink tracking-tight">{member.name}</h3>
                <p className="text-brand text-sm font-medium mb-3">{member.role}</p>
                <p className="text-ink-muted text-sm leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Organizers ── */}
      <section className="py-20 text-white relative overflow-hidden" style={{ background: "#2e1a47" }}>
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle at 90% 30%, #c29f5d 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-gold text-xs font-bold uppercase tracking-widest mb-3">For Organizers</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
                Power Your Event With Rameelo
              </h2>
              <p className="text-white/65 text-base leading-relaxed mb-7">
                We give Garba and Navratri organizers everything they need: ticketing, waitlists, attendee
                management, promotional tools, and access to a community actively searching for events like yours.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Zero upfront costs — only pay when you sell tickets",
                  "Powerful dashboard with real-time analytics",
                  "Built-in marketing tools to reach the right audience",
                  "24/7 organizer support during your event",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-white/70 text-sm">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "rgba(194,159,93,0.25)", border: "1px solid rgba(194,159,93,0.4)" }}
                    >
                      <svg className="w-3 h-3 text-gold" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                className="font-bold px-7 py-3 rounded-lg transition-colors text-sm"
                style={{ background: "#c29f5d", color: "#1a1a1a" }}
              >
                Apply as Organizer
              </button>
            </div>

            {/* Contact Form */}
            <div
              className="rounded-2xl p-7"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <h3 className="font-bold text-white text-lg tracking-tight mb-6">Get in Touch</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Your name"
                  className="w-full rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none text-sm transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                />
                <input
                  type="email"
                  placeholder="Email address"
                  className="w-full rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none text-sm"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                />
                <textarea
                  rows={4}
                  placeholder="Tell us about your event…"
                  className="w-full rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none text-sm resize-none"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                />
                <button
                  className="w-full font-bold py-3 rounded-xl transition-colors text-sm"
                  style={{ background: "#6e1a2e", color: "white" }}
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-brand text-white py-16 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, #c29f5d 0%, transparent 55%)",
          }}
        />
        <div className="relative max-w-2xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">Start Celebrating</h2>
          <p className="text-white/65 mb-8 text-base">
            Find events, join your community, and keep the tradition going — wherever you are in the USA.
          </p>
          <Link
            href="/events"
            className="bg-cream text-brand font-bold px-8 py-3 rounded-lg hover:bg-white transition-colors inline-block text-sm"
          >
            Browse Events
          </Link>
        </div>
      </section>
    </div>
  );
}
