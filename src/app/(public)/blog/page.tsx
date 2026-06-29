import type { Metadata } from "next";
import Link from "next/link";
import {
  BLOG_ARTICLES,
  getFeaturedArticle,
  getArticlesByPriority,
  getArticlesByCategory,
  type BlogArticle,
} from "@/lib/blog";
import { getBlogOverrides } from "@/lib/blog-overrides";
import { breadcrumbSchema, itemListSchema, ld } from "@/lib/jsonld";

// Revalidate so admin renames (blog_article_overrides) surface on the index.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Rameelo Blog — Raas Garba News, Guides & Community",
  description: "The authoritative source for Raas Garba in America. Event guides, culture explainers, city-by-city breakdowns, and Navratri tips — all in one place.",
  keywords: ["garba blog", "navratri news 2026", "raas garba usa", "dandiya events guide", "navratri 2026", "garba culture", "navratri guide"],
  alternates: { canonical: "https://www.rameelo.com/blog" },
  openGraph: {
    title: "Rameelo Blog — Raas Garba News, Guides & Community",
    description: "The authoritative source for Raas Garba in America. Event guides, culture explainers, city-by-city breakdowns, and Navratri tips.",
    type: "website",
    url: "https://www.rameelo.com/blog",
    siteName: "Rameelo",
    images: [{ url: "https://www.rameelo.com/og-default.jpg", width: 1200, height: 630, alt: "Rameelo Blog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rameelo Blog — Raas Garba News, Guides & Community",
    description: "Event guides, culture explainers, and Navratri tips for the garba community.",
    images: ["https://www.rameelo.com/og-default.jpg"],
  },
};

// Category accent color (hex) — drives the kicker text + the hairline top-rule
// on cards. Distinct per category so a reader scans the page by color.
const CAT_ACCENT: Record<string, string> = {
  "News": "#7C1F2C",
  "City Guide": "#2E1B30",
  "Artist Spotlight": "#B06A00",
  "Tips & Tricks": "#5A1E7A",
  "First-Timer": "#0E8C7A",
  "Culture": "#A23A2B",
  "For Organizers": "#0A6B5E",
  // legacy categories still present on older posts
  "Event Guide": "#2E1B30",
  "Community": "#B06A00",
  "Platform": "#2E1B30",
};
const accentFor = (c: string) => CAT_ACCENT[c] ?? "#2E1B30";

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Kicker({ article, withEmoji = false }: { article: BlogArticle; withEmoji?: boolean }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: accentFor(article.category) }}>
      {withEmoji && <span className="mr-1.5 not-italic">{article.coverEmoji}</span>}
      {article.category}
    </span>
  );
}

// Editorial card — hairline border, a colored top rule, mono kicker, serif-feel
// headline, two-line dek and a byline. No big emoji panels.
function StoryCard({ article, title, image }: { article: BlogArticle; title?: string; image?: string | null }) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group flex flex-col bg-white border border-ink/10 rounded-[4px] overflow-hidden hover:border-ink/25 hover:shadow-sm transition-all"
    >
      {image && (
        <div className="aspect-[16/9] overflow-hidden bg-ivory-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
        </div>
      )}
      <div className="h-1" style={{ backgroundColor: accentFor(article.category) }} />
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2.5">
          <Kicker article={article} withEmoji />
          <span className="font-mono text-[9px] text-ink-muted/70">·</span>
          <span className="font-mono text-[9px] text-ink-muted/70">{article.readMinutes} min</span>
        </div>
        <h3 className="font-editorial font-bold text-ink text-lg leading-[1.2] group-hover:text-aubergine transition-colors mb-2" style={{ letterSpacing: "-0.01em" }}>
          {title ?? article.title}
        </h3>
        <p className="font-ui text-[13px] text-ink-muted leading-relaxed line-clamp-2 mb-4 flex-1">{article.excerpt}</p>
        <p className="font-mono text-[9px] text-ink-muted/70 pt-3 border-t border-ink/8">
          {article.author} · {fmtDate(article.publishedAt)}
        </p>
      </div>
    </Link>
  );
}

// Compact one-line headline row for rails and list sections.
function HeadlineRow({ article, index, title, image }: { article: BlogArticle; index?: number; title?: string; image?: string | null }) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group flex gap-3 py-3.5 border-b border-ink/8 last:border-0 items-start"
    >
      {index !== undefined && (
        <span className="font-editorial font-bold text-2xl leading-none text-ink/15 w-7 shrink-0 group-hover:text-aubergine/40 transition-colors">
          {index}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-1">
          <Kicker article={article} />
        </div>
        <h3 className="font-editorial font-bold text-ink text-[15px] leading-snug group-hover:text-aubergine transition-colors" style={{ letterSpacing: "-0.005em" }}>
          {title ?? article.title}
        </h3>
      </div>
      {image && (
        <div className="w-16 h-16 shrink-0 rounded-md overflow-hidden border border-ink/10 bg-ivory-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      )}
    </Link>
  );
}

export default async function BlogPage() {
  const overrides = await getBlogOverrides();
  const titleOf = (a: BlogArticle) => overrides[a.slug]?.title || a.title;
  const imageOf = (a: BlogArticle) => overrides[a.slug]?.coverImageUrl || null;

  const lead = getFeaturedArticle() ?? getArticlesByPriority()[0];

  // Front-page rail: the highest-intent stories after the lead.
  const railPool = getArticlesByPriority().filter(a => a.slug !== lead.slug);
  const rail = railPool.slice(0, 5);

  const cityGuides = getArticlesByCategory("City Guide").filter(a => a.slug !== lead.slug);
  const artists = getArticlesByCategory("Artist Spotlight").filter(a => a.slug !== lead.slug);
  const knowBefore = getArticlesByPriority().filter(
    a => ["Culture", "First-Timer", "Tips & Tricks"].includes(a.category) && a.slug !== lead.slug,
  );
  const organizerPosts = getArticlesByCategory("For Organizers");

  const todayLine = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const blogList = itemListSchema(
    "Rameelo Blog Articles",
    BLOG_ARTICLES.map(a => ({ name: titleOf(a), url: `https://www.rameelo.com/blog/${a.slug}` }))
  );
  const crumbs = breadcrumbSchema([
    { name: "Home", url: "https://www.rameelo.com" },
    { name: "Blog", url: "https://www.rameelo.com/blog" },
  ]);

  return (
    <div className="bg-ivory min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(blogList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbs) }} />

      {/* ── Masthead ── */}
      <header style={{ backgroundColor: "#2E1B30" }} className="border-b-2 border-marigold">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center gap-3 pt-6 pb-1">
            <div className="h-px flex-1 bg-marigold/25 max-w-20" />
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-marigold/60">The Rameelo Review · Est. 2024</span>
            <div className="h-px flex-1 bg-marigold/25 max-w-20" />
          </div>
          <h1 className="text-center font-editorial font-bold text-white text-4xl sm:text-6xl pb-2" style={{ letterSpacing: "-0.03em" }}>
            Garba &amp; Navratri, Covered.
          </h1>
          <p className="text-center font-ui text-white/45 text-[13px] sm:text-sm tracking-wide pb-4">
            America&rsquo;s authoritative source for raas garba culture, city guides, artists &amp; events.
          </p>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
            <p className="font-mono text-[9px] text-white/35">{todayLine}</p>
            <p className="font-mono text-[9px] text-white/35">{BLOG_ARTICLES.length} articles · updated weekly</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* ── Front page: lead + rail ── */}
        <section className="grid lg:grid-cols-3 gap-8 lg:gap-10 pb-8 border-b-2 border-ink/10">
          {/* Lead story */}
          <div className="lg:col-span-2">
            <Link href={`/blog/${lead.slug}`} className="group block">
              {imageOf(lead) && (
                <div className="aspect-[16/9] w-full overflow-hidden rounded-lg border border-ink/10 mb-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageOf(lead)!} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <Kicker article={lead} withEmoji />
                <span className="font-mono text-[9px] text-ink-muted/70">·</span>
                <span className="font-mono text-[9px] text-ink-muted/70">{lead.readMinutes} min read</span>
              </div>
              <h2 className="font-editorial font-bold text-ink text-3xl sm:text-[2.75rem] leading-[1.05] group-hover:text-aubergine transition-colors mb-4" style={{ letterSpacing: "-0.025em" }}>
                {titleOf(lead)}
              </h2>
              <p className="font-ui text-ink-muted text-base sm:text-lg leading-relaxed mb-5 max-w-2xl">{lead.excerpt}</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-aubergine flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {lead.author.charAt(0)}
                </div>
                <div>
                  <p className="font-ui text-sm font-semibold text-ink">{lead.author}</p>
                  <p className="font-mono text-[9px] text-ink-muted">{lead.authorTitle} · {fmtDate(lead.publishedAt)}</p>
                </div>
                <span className="ml-auto hidden sm:flex items-center gap-1.5 font-ui font-semibold text-aubergine text-sm group-hover:gap-2.5 transition-all">
                  Read story
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </span>
              </div>
            </Link>
          </div>

          {/* Right rail — the front page */}
          <aside className="lg:border-l lg:border-ink/10 lg:pl-8">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-4 bg-marigold rounded-full" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink font-bold">Most read</p>
            </div>
            <div>
              {rail.map((a, i) => (
                <HeadlineRow key={a.slug} article={a} index={i + 1} title={titleOf(a)} image={imageOf(a)} />
              ))}
            </div>
          </aside>
        </section>

        {/* ── City Guides — highest intent, surfaced first ── */}
        {cityGuides.length > 0 && (
          <section className="pt-9">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <h2 className="font-editorial font-bold text-ink text-2xl sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                  Garba by City
                </h2>
                <p className="font-ui text-sm text-ink-muted mt-0.5">Where to dance this Navratri — metro-by-metro guides with live events.</p>
              </div>
              <Link href="/events" className="hidden sm:inline-flex items-center gap-1.5 font-ui font-semibold text-aubergine text-sm hover:gap-2.5 transition-all shrink-0">
                Browse all events
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cityGuides.map(a => (
                <StoryCard key={a.slug} article={a} title={titleOf(a)} image={imageOf(a)} />
              ))}
            </div>
          </section>
        )}

        {/* ── Two-up: Artists + Know before you go ── */}
        <section className="pt-10 grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Artists */}
          {artists.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-ink/10">
                <h2 className="font-editorial font-bold text-ink text-xl sm:text-2xl" style={{ letterSpacing: "-0.02em" }}>
                  The Artists
                </h2>
              </div>
              <div className="space-y-4">
                {artists.map(a => (
                  <StoryCard key={a.slug} article={a} title={titleOf(a)} image={imageOf(a)} />
                ))}
              </div>
            </div>
          )}

          {/* Know before you go */}
          {knowBefore.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-ink/10">
                <h2 className="font-editorial font-bold text-ink text-xl sm:text-2xl" style={{ letterSpacing: "-0.02em" }}>
                  Know Before You Go
                </h2>
              </div>
              <div>
                {knowBefore.map(a => (
                  <HeadlineRow key={a.slug} article={a} title={titleOf(a)} image={imageOf(a)} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── For Organizers band ── */}
        <section className="mt-12 rounded-[6px] overflow-hidden border border-marigold/25" style={{ backgroundColor: "#2E1B30" }}>
          <div className="p-6 sm:p-8 grid md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-marigold/60 mb-2">For Organizers</p>
              <h2 className="font-editorial font-bold text-white text-xl sm:text-2xl mb-2" style={{ letterSpacing: "-0.02em" }}>
                {organizerPosts[0] ? titleOf(organizerPosts[0]) : "Sell out your Navratri event"}
              </h2>
              <p className="font-ui text-white/55 text-sm leading-relaxed max-w-xl">
                {organizerPosts[0]?.excerpt ?? "Tiered pricing, group orders, combo tickets and fast payouts — on the only platform built for raas garba."}
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              {organizerPosts[0] && (
                <Link href={`/blog/${organizerPosts[0].slug}`} className="flex items-center justify-center gap-2 w-full py-3 rounded-[4px] bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
                  Read the playbook →
                </Link>
              )}
              <Link href="/organizers" className="flex items-center justify-center gap-2 w-full py-3 rounded-[4px] border border-white/25 text-white font-display font-bold text-sm hover:bg-white/10 transition-all">
                Rameelo for organizers
              </Link>
            </div>
          </div>
        </section>

        {/* ── Find events CTA ── */}
        <section className="mt-8 rounded-[6px] border border-ink/10 bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-marigold-dark font-bold mb-1.5">On Rameelo</p>
            <h2 className="font-editorial font-bold text-ink text-xl sm:text-2xl mb-1" style={{ letterSpacing: "-0.02em" }}>
              Find garba events near you
            </h2>
            <p className="font-ui text-sm text-ink-muted max-w-xl leading-relaxed">
              Every verified raas garba, dandiya and Navratri event in the USA — searchable by city, date and artist. Bring a group and save automatically.
            </p>
          </div>
          <Link href="/events" className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[4px] bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
            Explore events →
          </Link>
        </section>

        {/* ── About the publication ── */}
        <div className="mt-12 border-t-2 border-ink/10 pt-7">
          <div className="max-w-2xl">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-3">About The Rameelo Review</p>
            <p className="font-ui text-ink-muted text-sm leading-relaxed">
              The Rameelo Review is the editorial voice of Rameelo — America&rsquo;s dedicated home for raas garba ticketing and community. Our writers are garba enthusiasts, cultural insiders and community members who cover Navratri events, culture, artists and the South Asian diaspora across the United States. We believe garba deserves serious, authoritative, joyful coverage.
            </p>
          </div>
        </div>
      </main>

      {/* ── Structured data ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "The Rameelo Review",
            "description": "America's premier source for raas garba culture, events, and Navratri news",
            "url": "https://www.rameelo.com/blog",
            "publisher": {
              "@type": "Organization",
              "name": "Rameelo",
              "url": "https://www.rameelo.com",
              "logo": { "@type": "ImageObject", "url": "https://www.rameelo.com/og-default.jpg" },
            },
          }),
        }}
      />
    </div>
  );
}
