import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GRADIENTS } from "@/app/organizer/events/create/types";
import { findMetroBySlug, metroSlug, metrosNear } from "@/lib/metros";
import { breadcrumbSchema, itemListSchema, faqSchema, ld } from "@/lib/jsonld";

const BASE = "https://www.rameelo.com";

// Server-rendered per request so the event list stays fresh; the routes are
// discovered via the sitemap (one entry per metro).
export const dynamic = "force-dynamic";

// SEO city landing pages — one per metro — that rank for "garba events near
// {city}", "navratri {city}", "dandiya {city} tickets", etc. Server-rendered with
// the real upcoming events near that metro, city-targeted metadata/keywords, and
// ItemList + FAQ + breadcrumb structured data. Statically generated for all metros.

type Props = { params: Promise<{ city: string }> };

type Tier = { price: number; quantity: number; quantity_sold: number; sold_out: boolean; is_visible: boolean };
type EventRow = {
  id: string; title: string; category: string; start_date: string; start_time: string | null;
  venue_name: string | null; city: string | null; state: string | null; metro_city: string | null;
  cover_image_url: string | null; cover_gradient: string | null; selling_on_rameelo: boolean;
  artists: { name: string } | { name: string }[] | null;
  ticket_tiers: Tier[];
};

// Events near a metro: tagged to it via metro_city, or physically in that city.
async function loadCityEvents(city: string): Promise<EventRow[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("events")
    .select("id, title, category, start_date, start_time, venue_name, city, state, metro_city, cover_image_url, cover_gradient, selling_on_rameelo, artists(name), ticket_tiers(price, quantity, quantity_sold, sold_out, is_visible)")
    .eq("status", "published")
    .gte("start_date", today)
    .or(`metro_city.ilike.${city},city.ilike.${city}`)
    .order("start_date", { ascending: true });
  return (data ?? []) as EventRow[];
}

function priceRange(events: EventRow[]): { min: number | null; max: number | null } {
  const prices = events.flatMap((e) =>
    (e.ticket_tiers ?? []).filter((t) => t.is_visible && t.price > 0).map((t) => t.price)
  );
  return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: null, max: null };
}

function fromPrice(e: EventRow): number | null {
  const ps = (e.ticket_tiers ?? []).filter((t) => t.is_visible && !t.sold_out && t.price > 0).map((t) => t.price);
  return ps.length && e.selling_on_rameelo ? Math.min(...ps) : null;
}

function artistOf(e: EventRow): string | null {
  const a = e.artists;
  return Array.isArray(a) ? a[0]?.name ?? null : a?.name ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params;
  const metro = findMetroBySlug(slug);
  if (!metro) return { title: "Garba Events | Rameelo" };

  const events = await loadCityEvents(metro.city);
  const year = events[0] ? new Date(events[0].start_date + "T00:00:00").getFullYear() : new Date().getFullYear();
  const cityState = `${metro.city}, ${metro.state}`;
  const count = events.length;

  const title = `Garba Events in ${metro.city} ${year} — Dandiya & Navratri Tickets | Rameelo`;
  const description = count > 0
    ? `${count} upcoming Garba, Dandiya & Navratri ${count === 1 ? "event" : "events"} in ${cityState}. Buy tickets on Rameelo — verified events, group discounts up to 15% off.`
    : `Find Garba, Dandiya & Navratri events in ${cityState}. Get notified the moment new ${year} shows are announced near you — only on Rameelo.`;

  const url = `${BASE}/garba-events/${slug}`;
  return {
    title,
    description,
    keywords: [
      `garba ${metro.city}`, `garba events ${metro.city}`, `garba near me`,
      `navratri ${metro.city}`, `dandiya ${metro.city}`, `garba tickets ${metro.city}`,
      `raas garba ${metro.city}`, `${metro.city} garba ${year}`, `navratri ${metro.state}`,
      `garba events near me`, `navratri events near me`, `garba ${cityState}`,
    ],
    alternates: { canonical: url },
    openGraph: {
      title, description, type: "website", url, siteName: "Rameelo",
      images: [{ url: `${BASE}/og-default.jpg`, width: 1200, height: 630, alt: `Garba Events in ${metro.city}` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`${BASE}/og-default.jpg`] },
  };
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return {
    month: d.toLocaleString("en-US", { month: "short" }),
    day: String(d.getDate()),
    weekday: d.toLocaleString("en-US", { weekday: "short" }),
    full: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  garba: "Garba", dandiya: "Dandiya", raas: "Raas", workshop: "Workshop", community: "Community", other: "Other",
};

function EventCard({ e }: { e: EventRow }) {
  const date = fmtDate(e.start_date);
  const price = fromPrice(e);
  const gradient = GRADIENTS.find((g) => g.id === e.cover_gradient)?.css ?? GRADIENTS[0].css;
  const where = [e.venue_name, e.city, e.state].filter(Boolean).join(", ");
  return (
    <Link href={`/events/${e.id}`} className="group flex flex-col rounded-2xl border border-ivory-200 bg-white overflow-hidden hover:border-aubergine/30 hover:shadow-sm transition-all">
      <div className="relative h-28" style={{ background: e.cover_image_url ? undefined : gradient }}>
        {e.cover_image_url && <img src={e.cover_image_url} alt={e.title} className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute top-2 left-2 bg-white/95 rounded-lg px-2 py-1 text-center leading-none shadow-sm">
          <p className="font-mono text-[8px] uppercase tracking-widest text-ink-muted">{date.month}</p>
          <p className="font-display font-bold text-ink text-base leading-none">{date.day}</p>
        </div>
      </div>
      <div className="flex flex-col flex-1 p-4">
        <span className="font-mono text-[9px] uppercase tracking-widest text-marigold-dark mb-1">{CATEGORY_LABELS[e.category] ?? e.category}</span>
        <h3 className="font-display font-bold text-ink text-base leading-tight group-hover:text-aubergine transition-colors line-clamp-2">{e.title}</h3>
        <p className="font-ui text-xs text-ink-muted mt-1 truncate">{date.full}</p>
        {where && <p className="font-ui text-xs text-ink-muted truncate">📍 {where}</p>}
        <div className="mt-3 pt-3 border-t border-ivory-200 flex items-center justify-between gap-2">
          <span className="font-display font-bold text-ink">{price !== null ? `From $${price}` : "See details"}</span>
          <span className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg bg-aubergine text-white font-display font-bold text-xs group-hover:bg-aubergine-light transition-colors whitespace-nowrap">Get tickets →</span>
        </div>
      </div>
    </Link>
  );
}

export default async function CityGarbaPage({ params }: Props) {
  const { city: slug } = await params;
  const metro = findMetroBySlug(slug);
  if (!metro) notFound();

  const events = await loadCityEvents(metro.city);
  const cityState = `${metro.city}, ${metro.state}`;
  const year = events[0] ? new Date(events[0].start_date + "T00:00:00").getFullYear() : new Date().getFullYear();
  const { min, max } = priceRange(events);
  const nearby = metrosNear(metro, 6);

  const faqs = [
    {
      question: `Where can I find Garba events near ${metro.city}?`,
      answer: `Rameelo lists verified Garba, Dandiya, and Raas Garba events in and around ${cityState}. Browse upcoming shows above and buy tickets online — most events offer group discounts of up to 15% off.`,
    },
    {
      question: `How much do Garba tickets cost in ${metro.city}?`,
      answer: min !== null
        ? `Garba and Dandiya tickets near ${metro.city} currently range from about $${min} to $${max}, depending on the event, tier, and date. Group bookings can save up to 15%.`
        : `Garba and Dandiya ticket prices near ${metro.city} vary by event and tier. Create a free Rameelo account to be notified when ${year} tickets go on sale.`,
    },
    {
      question: `When is Navratri ${year}?`,
      answer: `Navratri ${year} celebrations run for nine nights in the fall, with Garba and Dandiya events held across the ${metro.city} area throughout the season. Follow events on Rameelo so you don't miss when tickets drop.`,
    },
    {
      question: `Are these Garba events near ${metro.city} family-friendly?`,
      answer: `Most Garba and Navratri events near ${metro.city} welcome all ages and the whole family. Check each event's detail page for dress code, age policy, and parking before you go.`,
    },
  ];

  const crumbs = breadcrumbSchema([
    { name: "Home", url: BASE },
    { name: "Garba Events", url: `${BASE}/garba-events` },
    { name: metro.city, url: `${BASE}/garba-events/${slug}` },
  ]);
  const list = itemListSchema(
    `Garba & Dandiya events in ${cityState}`,
    events.map((e) => ({ name: e.title, url: `${BASE}/events/${e.id}` })),
  );
  const faq = faqSchema(faqs);

  return (
    <div className="min-h-screen overflow-x-clip" style={{ backgroundColor: "#FCF9F2" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbs) }} />
      {events.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(list) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(faq) }} />

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,#2E1B30 0%,#7C1F2C 120%)" }}>
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
          <nav className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-white/55 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/garba-events" className="hover:text-white transition-colors">Garba Events</Link>
            <span>/</span>
            <span className="text-white/80">{metro.city}</span>
          </nav>
          <h1 className="font-display font-black text-white leading-[1.02] break-words" style={{ fontSize: "clamp(2rem, 5.5vw, 3.5rem)", letterSpacing: "-0.03em" }}>
            Garba &amp; Dandiya Events in {metro.city}
          </h1>
          <p className="font-ui text-white/75 text-base sm:text-lg leading-relaxed max-w-2xl mt-4">
            {events.length > 0
              ? `${events.length} upcoming Garba, Dandiya & Navratri ${events.length === 1 ? "event" : "events"} near ${cityState}. Buy tickets online with group discounts up to 15% off — only on Rameelo.`
              : `Find Garba, Dandiya & Navratri ${year} events near ${cityState}. New shows are added all season — get notified the moment tickets drop.`}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <a href="#events" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
              See {metro.city} events →
            </a>
            <Link href="/events" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/25 bg-white/10 text-white font-display font-bold text-sm hover:bg-white/20 transition-all">
              Browse all USA events
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Events */}
        <section id="events">
          <h2 className="font-display font-bold text-ink text-2xl mb-5" style={{ letterSpacing: "-0.02em" }}>
            {events.length > 0 ? `Upcoming Garba Events in ${metro.city}` : `No ${metro.city} events listed yet`}
          </h2>
          {events.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((e) => <EventCard key={e.id} e={e} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-ivory-200 bg-white p-10 text-center">
              <div className="text-3xl mb-3">🪔</div>
              <p className="font-display font-bold text-ink text-lg mb-1">Garba {year} near {metro.city} is being announced</p>
              <p className="font-ui text-sm text-ink-muted max-w-md mx-auto mb-6">
                Organizers add new Garba, Dandiya, and Navratri events near {cityState} all season. Create a free account and we&rsquo;ll email you the moment tickets go live.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/auth/signup" className="px-5 py-3 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-all">Notify me when shows drop</Link>
                <Link href="/events" className="px-5 py-3 rounded-xl border border-ivory-200 bg-white text-ink font-display font-bold text-sm hover:border-aubergine/30 transition-all">Browse all events</Link>
              </div>
            </div>
          )}
        </section>

        {/* Intro / keyword content */}
        <section className="prose-none">
          <h2 className="font-display font-bold text-ink text-2xl mb-3" style={{ letterSpacing: "-0.02em" }}>
            Your guide to Garba &amp; Navratri in {metro.city}
          </h2>
          <p className="font-ui text-ink-muted leading-relaxed">
            {metro.city} is home to one of America&rsquo;s most vibrant Garba and Dandiya communities. Each Navratri season, organizers across {cityState} host nights of Raas Garba, live music, and Dandiya Raas for dancers of every age. Rameelo brings every verified event together in one place so you can find Garba near you, compare ticket prices, and book your spot — with group discounts up to 15% off and instant mobile tickets.
          </p>
        </section>

        {/* Nearby cities */}
        <section>
          <h2 className="font-display font-bold text-ink text-xl mb-4" style={{ letterSpacing: "-0.02em" }}>Garba events in nearby cities</h2>
          <div className="flex flex-wrap gap-2">
            {nearby.map((m) => (
              <Link key={m.city} href={`/garba-events/${metroSlug(m)}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-ivory-200 bg-white font-ui text-sm font-semibold text-ink hover:border-aubergine/30 hover:text-aubergine transition-all">
                Garba in {m.city}
              </Link>
            ))}
            <Link href="/garba-events" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-aubergine/30 bg-aubergine/[0.04] font-ui text-sm font-semibold text-aubergine hover:bg-aubergine/[0.08] transition-all">
              All cities →
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="font-display font-bold text-ink text-2xl mb-5" style={{ letterSpacing: "-0.02em" }}>Garba in {metro.city} — FAQ</h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <div key={f.question} className="rounded-2xl border border-ivory-200 bg-white p-5">
                <h3 className="font-display font-bold text-ink text-base mb-1.5">{f.question}</h3>
                <p className="font-ui text-sm text-ink-muted leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
