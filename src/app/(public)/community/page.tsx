import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { testimonials } from "@/lib/data";
import { webPageSchema, ld } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Garba Community — Connect with Dancers Across the USA | Rameelo",
  description: "Join the Rameelo garba community. Connect with raas garba dancers, share event photos, find dance groups, and join city-based garba communities across the USA.",
  keywords: ["garba community usa", "navratri community", "raas garba dancers", "garba groups near me", "gujarati community usa", "dandiya community"],
  alternates: { canonical: "https://rameelo.com/community" },
  openGraph: {
    title: "Garba Community — Connect with Dancers Across the USA | Rameelo",
    description: "Connect with raas garba and dandiya dancers across America. Share moments, find groups, and celebrate Navratri together.",
    type: "website",
    url: "https://rameelo.com/community",
    siteName: "Rameelo",
    images: [{ url: "https://rameelo.com/og-default.jpg", width: 1200, height: 630, alt: "Rameelo Garba Community" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Garba Community — Rameelo",
    description: "Connect with raas garba and dandiya dancers across America.",
    images: ["https://rameelo.com/og-default.jpg"],
  },
};

export const revalidate = 60;

const communityPage = webPageSchema({
  name: "Garba Community — Rameelo",
  url: "https://rameelo.com/community",
  description: "Connect with raas garba dancers, share event photos, find dance groups, and join city-based garba communities across the USA.",
  breadcrumbs: [
    { name: "Home", url: "https://rameelo.com" },
    { name: "Community", url: "https://rameelo.com/community" },
  ],
});

type ChatGroup = {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  category: string | null;
  color1: string;
  color2: string;
  member_count: number;
  is_hot: boolean;
  is_pinned: boolean;
  discount_pct: number;
};

const CATEGORY_PILL: Record<string, string> = {
  Fashion:     "bg-[#892240]/12 text-[#892240]",
  Hangout:     "bg-aubergine/10 text-aubergine",
  Food:        "bg-marigold/15 text-[#D4891B]",
  Dance:       "bg-marigold/12 text-[#B87A00]",
  Beginner:    "bg-peacock/12 text-peacock",
  Vibes:       "bg-[#5a1e7a]/12 text-[#5a1e7a]",
  Marketplace: "bg-durga/12 text-durga",
  Community:   "bg-peacock/10 text-peacock",
  Social:      "bg-[#892240]/12 text-[#892240]",
  Family:      "bg-aubergine/10 text-aubergine",
  Planning:    "bg-marigold/12 text-[#D4891B]",
};

export default async function CommunityPage() {
  const supabase = await createClient();

  const { data: groups } = await supabase
    .from("chat_groups")
    .select("id, name, emoji, description, category, color1, color2, member_count, is_hot, is_pinned, discount_pct")
    .eq("group_type", "interest")
    .eq("is_active", true)
    .eq("admin_hidden", false)
    .order("is_pinned", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("member_count", { ascending: false });

  const liveGroups: ChatGroup[] = (groups ?? []) as ChatGroup[];
  const totalMembers = liveGroups.reduce((s, g) => s + (g.member_count ?? 0), 0);

  return (
    <div className="bg-ivory min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(communityPage) }} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(145deg, #2E1B30 0%, #7C1F2C 100%)" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: "#F5A623" }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-marigold mb-4">Community</p>
          <h1 className="font-display font-black text-white mb-4" style={{ fontSize: "clamp(32px, 6vw, 64px)", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            Your garba family.<br />
            <span className="font-editorial italic font-normal" style={{ color: "#F5A623" }}>All in one place.</span>
          </h1>
          <p className="font-ui text-white/55 text-base max-w-md mb-8 leading-relaxed">
            Connect with dancers, organizers, and enthusiasts across the USA. Find your city crew or
            join a nationwide community.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/signup"
              className="inline-flex items-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-6 py-3.5 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-marigold/20">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Join the community
            </Link>
            <Link href="/auth/signin"
              className="inline-flex items-center gap-2 border border-white/20 text-white/70 font-ui font-medium text-sm px-6 py-3.5 rounded-2xl hover:bg-white/8 hover:text-white transition-all">
              Sign in
            </Link>
          </div>

          {/* Live stats */}
          <div className="mt-10 flex flex-wrap gap-6">
            {[
              { value: liveGroups.length.toString(),         label: "Live communities" },
              { value: totalMembers.toLocaleString(),        label: "Members" },
              { value: liveGroups.filter(g => g.is_hot).length.toString(), label: "Hot groups" },
            ].map(s => (
              <div key={s.label} className="flex items-baseline gap-2">
                <span className="font-display font-black text-marigold text-2xl" style={{ letterSpacing: "-0.03em" }}>{s.value}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-16">

        {/* ── Communities grid ── */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine mb-1">Open communities</p>
              <h2 className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>
                Find your people
              </h2>
            </div>
            <Link href="/auth/signup"
              className="font-mono text-[10px] uppercase tracking-widest text-aubergine hover:text-ink transition-colors">
              Join all →
            </Link>
          </div>

          {liveGroups.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-ivory-200">
              <p className="text-4xl mb-3">💬</p>
              <p className="font-display font-bold text-ink text-lg">Communities coming soon</p>
              <p className="font-ui text-sm text-ink-muted mt-1 mb-5">Be the first to know when they launch.</p>
              <Link href="/auth/signup" className="inline-flex items-center gap-2 bg-aubergine text-white font-ui font-semibold text-sm px-5 py-2.5 rounded-2xl hover:opacity-90 transition-all">
                Get notified
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {liveGroups.map((group) => {
                const pillCls = CATEGORY_PILL[group.category ?? ""] ?? "bg-marigold/10 text-[#D4891B]";
                return (
                  <div key={group.id}
                    className="bg-white rounded-2xl border border-ivory-200 overflow-hidden hover:border-aubergine/20 hover:shadow-md transition-all flex flex-col group">

                    {/* Gradient header */}
                    <div className="h-24 relative flex items-end px-4 pb-3"
                      style={{ background: `linear-gradient(135deg, ${group.color1}, ${group.color2})` }}>
                      <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
                        {[40, 80, 120].map((r, i) => (
                          <div key={i} className="absolute rounded-full border border-white"
                            style={{ width: r * 2, height: r * 2, top: "50%", right: -r / 2, transform: "translateY(-50%)" }} />
                        ))}
                      </div>
                      <div className="relative flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl border border-white/30 shadow-lg">
                          {group.emoji}
                        </div>
                        {group.category && (
                          <span className="font-mono text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                            {group.category}
                          </span>
                        )}
                      </div>
                      {group.is_hot && (
                        <span className="absolute top-3 right-3 font-mono text-[9px] font-bold bg-marigold/90 text-aubergine px-2 py-0.5 rounded-full">
                          🔥 HOT
                        </span>
                      )}
                      {group.is_pinned && !group.is_hot && (
                        <span className="absolute top-3 right-3 font-mono text-[9px] text-white/60">📌</span>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-4 flex flex-col gap-3 flex-1">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-display font-bold text-ink text-base leading-tight">{group.name}</h3>
                          {group.category && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[8px] font-bold uppercase tracking-wide ${pillCls}`}>
                              {group.category}
                            </span>
                          )}
                        </div>
                        {group.description && (
                          <p className="font-ui text-xs text-ink-muted leading-relaxed line-clamp-2">{group.description}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-ivory-200">
                        <div className="flex items-baseline gap-1">
                          <span className="font-display font-black text-aubergine text-lg" style={{ letterSpacing: "-0.03em" }}>
                            {group.member_count.toLocaleString()}
                          </span>
                          <span className="font-ui text-xs text-ink-muted">members</span>
                        </div>
                        {group.discount_pct > 0 && (
                          <span className="font-mono text-[9px] font-bold text-marigold bg-marigold/10 border border-marigold/20 px-2 py-0.5 rounded-full">
                            {group.discount_pct}% group discount
                          </span>
                        )}
                        <Link href="/auth/signup"
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-aubergine text-white font-ui font-semibold text-xs hover:opacity-90 transition-all">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                          Join
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Don't see your city callout ── */}
        <section className="relative overflow-hidden rounded-3xl"
          style={{ background: "linear-gradient(145deg, #7C1F2C 0%, #2E1B30 100%)" }}>
          <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="relative px-8 py-10 md:px-12 text-center">
            <h2 className="font-display font-bold text-white mb-2" style={{ fontSize: "clamp(22px, 3vw, 32px)", letterSpacing: "-0.02em" }}>
              Don&apos;t see your city?
            </h2>
            <p className="font-ui text-white/55 max-w-md mx-auto mb-6 text-sm leading-relaxed">
              Start a Rameelo community group in your area and become the connector your local garba scene needs.
            </p>
            <Link href="/auth/signup"
              className="inline-flex items-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-7 py-3.5 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-marigold/20">
              Create a local group
            </Link>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section>
          <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine mb-2">Stories</p>
          <h2 className="font-display font-bold text-ink text-2xl mb-8" style={{ letterSpacing: "-0.02em" }}>From the community</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div key={t.id} className="bg-white border border-ivory-200 rounded-2xl p-6 hover:shadow-sm hover:border-aubergine/20 transition-all">
                <svg className="w-5 h-5 text-marigold/50 mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="font-ui text-ink/70 italic mb-5 leading-relaxed text-sm">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-ivory-200">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg, #7C1F2C, #2E1B30)" }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-ui font-semibold text-ink text-sm">{t.name}</p>
                    <p className="font-ui text-xs text-ink-muted">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
