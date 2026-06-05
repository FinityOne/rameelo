import type { Metadata } from "next";
import Link from "next/link";
import { webPageSchema, ld } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Garba Community — Coming Soon | Rameelo",
  description: "The Rameelo garba community is coming soon. Connect with raas garba dancers, find city-based groups, and celebrate Navratri together across the USA — launching shortly.",
  keywords: ["garba community usa", "navratri community", "raas garba dancers", "garba groups near me", "gujarati community usa", "dandiya community"],
  alternates: { canonical: "https://rameelo.com/community" },
  openGraph: {
    title: "Garba Community — Coming Soon | Rameelo",
    description: "Connect with raas garba and dandiya dancers across America. Communities are launching soon on Rameelo.",
    type: "website",
    url: "https://rameelo.com/community",
    siteName: "Rameelo",
    images: [{ url: "https://rameelo.com/og-default.jpg", width: 1200, height: 630, alt: "Rameelo Garba Community" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Garba Community — Coming Soon | Rameelo",
    description: "Communities are launching soon on Rameelo.",
    images: ["https://rameelo.com/og-default.jpg"],
  },
};

const communityPage = webPageSchema({
  name: "Garba Community — Coming Soon | Rameelo",
  url: "https://rameelo.com/community",
  description: "The Rameelo garba community is launching soon — connect with raas garba dancers and city-based groups across the USA.",
  breadcrumbs: [
    { name: "Home", url: "https://rameelo.com" },
    { name: "Community", url: "https://rameelo.com/community" },
  ],
});

export default function CommunityPage() {
  return (
    <div className="bg-ivory min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(communityPage) }} />

      <section className="relative overflow-hidden" style={{ background: "linear-gradient(145deg, #2E1B30 0%, #7C1F2C 100%)" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: "#F5A623" }} />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-marigold bg-marigold/10 px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-marigold animate-pulse" /> Coming soon
          </span>
          <h1 className="font-display font-black text-white mb-5" style={{ fontSize: "clamp(32px, 6vw, 60px)", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            Your garba family.<br />
            <span className="font-editorial italic font-normal" style={{ color: "#F5A623" }}>Coming soon.</span>
          </h1>
          <p className="font-ui text-white/60 text-base sm:text-lg max-w-xl mx-auto mb-9 leading-relaxed">
            We&apos;re building a home for dancers, organizers, and enthusiasts to connect across the USA —
            city crews, group chats, and nationwide communities. It&apos;s almost ready. Jai Shree Krishna! 🙏
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/events"
              className="inline-flex items-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-6 py-3.5 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-marigold/20">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Explore events
            </Link>
            <Link href="/auth/signup"
              className="inline-flex items-center gap-2 border border-white/20 text-white/75 font-ui font-medium text-sm px-6 py-3.5 rounded-2xl hover:bg-white/8 hover:text-white transition-all">
              Join Rameelo to get notified
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
