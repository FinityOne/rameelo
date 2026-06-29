import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { METROS, metroSlug } from "@/lib/metros";
import { breadcrumbSchema, itemListSchema, faqSchema, ld } from "@/lib/jsonld";

const BASE = "https://www.rameelo.com";

export const dynamic = "force-dynamic";

// Hub page linking every metro's Garba landing page — strong internal linking +
// a target for "garba events usa" / "garba events near me" / "garba events by city".

export const metadata: Metadata = {
  title: "Garba Events Near You — Find Garba, Dandiya & Navratri by City | Rameelo",
  description: "Find Garba, Dandiya & Navratri events near you across the USA. Browse Garba by city — Edison, Dallas, Atlanta, Chicago, Bay Area, Houston and more. Buy tickets with group discounts.",
  keywords: [
    "garba events near me", "garba events usa", "navratri events near me",
    "dandiya events usa", "garba by city", "navratri 2026", "raas garba tickets",
    "garba near me", "find garba events",
  ],
  alternates: { canonical: `${BASE}/garba-events` },
  openGraph: {
    title: "Garba Events Near You — Find Garba by City | Rameelo",
    description: "Every verified Garba, Dandiya & Navratri event across the USA, organized by city.",
    type: "website", url: `${BASE}/garba-events`, siteName: "Rameelo",
    images: [{ url: `${BASE}/og-default.jpg`, width: 1200, height: 630, alt: "Garba Events Near You — Rameelo" }],
  },
  twitter: { card: "summary_large_image", title: "Garba Events Near You | Rameelo", description: "Find Garba, Dandiya & Navratri events by city across the USA.", images: [`${BASE}/og-default.jpg`] },
};

export default async function GarbaEventsHub() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("events")
    .select("city, metro_city")
    .eq("status", "published")
    .gte("start_date", today);

  // Count upcoming events per metro (matched by metro_city or city).
  const rows = (data ?? []) as { city: string | null; metro_city: string | null }[];
  const countFor = (metroCity: string) => {
    const c = metroCity.toLowerCase();
    return rows.filter((r) => (r.metro_city ?? "").toLowerCase() === c || (r.city ?? "").toLowerCase() === c).length;
  };
  const cities = METROS.map((m) => ({ ...m, count: countFor(m.city) }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));

  const crumbs = breadcrumbSchema([
    { name: "Home", url: BASE },
    { name: "Garba Events", url: `${BASE}/garba-events` },
  ]);
  const list = itemListSchema(
    "Garba events by city",
    cities.map((m) => ({ name: `Garba in ${m.city}`, url: `${BASE}/garba-events/${metroSlug(m)}` })),
  );
  const faq = faqSchema([
    { question: "Where can I find Garba events near me?", answer: "Rameelo lists verified Garba, Dandiya, and Navratri events across the USA. Pick your city below to see upcoming shows and buy tickets online — most events offer group discounts of up to 15% off." },
    { question: "What cities have Garba events on Rameelo?", answer: `Rameelo features Garba and Dandiya events in major metros including ${METROS.slice(0, 8).map((m) => m.city).join(", ")}, and more — across California, Texas, New Jersey, New York, Georgia, Illinois and beyond.` },
  ]);

  return (
    <div className="min-h-screen overflow-x-clip" style={{ backgroundColor: "#FCF9F2" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(list) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(faq) }} />

      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,#2E1B30 0%,#7C1F2C 120%)" }}>
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
          <h1 className="font-display font-black text-white leading-[1.02] break-words" style={{ fontSize: "clamp(2rem, 5.5vw, 3.5rem)", letterSpacing: "-0.03em" }}>
            Garba Events Near You
          </h1>
          <p className="font-ui text-white/75 text-base sm:text-lg leading-relaxed max-w-2xl mt-4">
            Find Garba, Dandiya &amp; Navratri events across the USA. Pick your city to see upcoming shows and buy tickets — group discounts up to 15% off, instant mobile tickets.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <section>
          <h2 className="font-display font-bold text-ink text-2xl mb-5" style={{ letterSpacing: "-0.02em" }}>Browse Garba by city</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {cities.map((m) => (
              <Link key={m.city} href={`/garba-events/${metroSlug(m)}`}
                className="group flex items-center justify-between gap-2 rounded-2xl border border-ivory-200 bg-white px-4 py-3.5 hover:border-aubergine/30 hover:shadow-sm transition-all">
                <div className="min-w-0">
                  <p className="font-display font-bold text-ink text-sm group-hover:text-aubergine transition-colors truncate">Garba in {m.city}</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-0.5">{m.state}</p>
                </div>
                {m.count > 0 && (
                  <span className="shrink-0 font-mono text-[10px] font-bold text-peacock bg-peacock/10 px-2 py-1 rounded-full">{m.count}</span>
                )}
              </Link>
            ))}
          </div>
          <p className="font-ui text-sm text-ink-muted mt-5">
            Don&rsquo;t see your city? <Link href="/events" className="text-aubergine font-semibold hover:underline">Browse all Garba &amp; Navratri events across the USA →</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
