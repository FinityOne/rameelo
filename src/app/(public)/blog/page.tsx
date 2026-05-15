import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_ARTICLES, getFeaturedArticle, type BlogArticle } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Rameelo Blog — Raas Garba News, Guides & Community",
  description: "The authoritative source for Raas Garba in America. Event guides, culture explainers, city-by-city breakdowns, and Navratri tips — all in one place.",
  keywords: ["garba blog", "navratri news", "raas garba usa", "dandiya events guide", "navratri 2025"],
  openGraph: {
    title: "Rameelo Blog — Raas Garba News, Guides & Community",
    description: "The authoritative source for Raas Garba in America. Event guides, culture explainers, city-by-city breakdowns, and Navratri tips.",
    type: "website",
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  "Event Guide":    "bg-aubergine/10 text-aubergine border-aubergine/20",
  "Culture":        "bg-peacock/10 text-peacock border-peacock/20",
  "City Guide":     "bg-[#7C1F2C]/10 text-[#7C1F2C] border-[#7C1F2C]/20",
  "Community":      "bg-marigold/10 text-marigold-dark border-marigold/20",
  "Tips & Tricks":  "bg-[#5a1e7a]/10 text-[#5a1e7a] border-[#5a1e7a]/20",
  "For Organizers": "bg-peacock/10 text-peacock border-peacock/20",
  "Platform":       "bg-aubergine/10 text-aubergine border-aubergine/20",
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function CategoryBadge({ category }: { category: string }) {
  const cls = CATEGORY_COLORS[category] ?? "bg-ivory-200 text-ink-muted border-ivory-200";
  return (
    <span className={`inline-block font-mono text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border ${cls}`}>
      {category}
    </span>
  );
}

function ArticleCard({ article, layout = "grid" }: { article: BlogArticle; layout?: "grid" | "list" }) {
  if (layout === "list") {
    return (
      <Link href={`/blog/${article.slug}`} className="group flex gap-5 py-5 border-b border-ivory-200 last:border-0 hover:bg-ivory/30 -mx-3 px-3 rounded-xl transition-colors">
        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${article.coverGradient} flex items-center justify-center text-2xl shrink-0`}>
          {article.coverEmoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <CategoryBadge category={article.category} />
            <span className="font-mono text-[9px] text-ink-muted">{article.readMinutes} min read</span>
          </div>
          <h3 className="font-display font-bold text-ink text-sm leading-snug group-hover:text-aubergine transition-colors mb-1" style={{ letterSpacing: "-0.01em" }}>
            {article.title}
          </h3>
          <p className="font-ui text-xs text-ink-muted leading-relaxed line-clamp-2">{article.excerpt}</p>
          <p className="font-mono text-[9px] text-ink-muted/60 mt-1.5">{fmtDate(article.publishedAt)} · {article.author}</p>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/blog/${article.slug}`} className="group flex flex-col rounded-2xl border border-ivory-200 bg-white overflow-hidden hover:border-aubergine/30 hover:shadow-md transition-all">
      <div className={`h-40 bg-gradient-to-br ${article.coverGradient} flex items-center justify-center text-5xl`}>
        {article.coverEmoji}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <CategoryBadge category={article.category} />
          <span className="font-mono text-[9px] text-ink-muted">{article.readMinutes} min read</span>
        </div>
        <h3 className="font-display font-bold text-ink text-base leading-snug group-hover:text-aubergine transition-colors mb-2 flex-1" style={{ letterSpacing: "-0.015em" }}>
          {article.title}
        </h3>
        <p className="font-ui text-xs text-ink-muted leading-relaxed line-clamp-3 mb-3">{article.excerpt}</p>
        <div className="flex items-center justify-between pt-3 border-t border-ivory-200">
          <p className="font-mono text-[9px] text-ink-muted">{article.author}</p>
          <p className="font-mono text-[9px] text-ink-muted">{fmtDate(article.publishedAt)}</p>
        </div>
      </div>
    </Link>
  );
}

export default function BlogPage() {
  const featured = getFeaturedArticle();
  const rest = BLOG_ARTICLES.filter(a => !a.featured).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const allCategories = [...new Set(BLOG_ARTICLES.map(a => a.category))];

  return (
    <div className="bg-ivory min-h-screen">
      {/* ── Masthead ── */}
      <div style={{ backgroundColor: "#2E1B30" }} className="border-b-4 border-marigold">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="h-px flex-1 bg-marigold/30 max-w-16" />
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-marigold/60">Est. 2024</span>
              <div className="h-px flex-1 bg-marigold/30 max-w-16" />
            </div>
            <h1 className="font-display font-bold text-white text-4xl sm:text-5xl mb-1" style={{ letterSpacing: "-0.03em" }}>
              The Rameelo Review
            </h1>
            <p className="font-ui text-white/40 text-sm tracking-wider">
              America&rsquo;s Premier Source for Raas Garba Culture &amp; Events
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              {allCategories.map(cat => (
                <span key={cat} className="font-mono text-[9px] uppercase tracking-widest text-marigold/50 hover:text-marigold transition-colors cursor-pointer">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between border-t border-white/10">
          <p className="font-mono text-[9px] text-white/30">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
          <p className="font-mono text-[9px] text-white/30">{BLOG_ARTICLES.length} Articles</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Featured article ── */}
        {featured && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-ink/10" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Featured Story</span>
              <div className="h-px flex-1 bg-ink/10" />
            </div>
            <Link href={`/blog/${featured.slug}`} className="group block rounded-3xl overflow-hidden border border-ivory-200 bg-white hover:shadow-xl hover:border-aubergine/30 transition-all">
              <div className={`relative h-64 sm:h-80 bg-gradient-to-br ${featured.coverGradient} flex items-center justify-center`}>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, rgba(245,166,35,0.4) 0%, transparent 60%)" }} />
                <span className="text-8xl relative z-10">{featured.coverEmoji}</span>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <CategoryBadge category={featured.category} />
                </div>
              </div>
              <div className="p-6 sm:p-8">
                <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl leading-tight group-hover:text-aubergine transition-colors mb-3" style={{ letterSpacing: "-0.025em" }}>
                  {featured.title}
                </h2>
                <p className="font-ui text-ink-muted leading-relaxed mb-5 text-base max-w-3xl">{featured.excerpt}</p>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-aubergine flex items-center justify-center text-white text-xs font-bold">
                      {featured.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-ui text-sm font-semibold text-ink">{featured.author}</p>
                      <p className="font-mono text-[9px] text-ink-muted">{featured.authorTitle} · {fmtDate(featured.publishedAt)}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 font-ui font-semibold text-aubergine text-sm group-hover:gap-2.5 transition-all">
                    Read story
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* ── Divider ── */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-ink/10" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">More Stories</span>
          <div className="h-px flex-1 bg-ink/10" />
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main column — article cards */}
          <div className="lg:col-span-2">
            <div className="grid sm:grid-cols-2 gap-5">
              {rest.slice(0, 4).map(article => (
                <ArticleCard key={article.slug} article={article} layout="grid" />
              ))}
            </div>
          </div>

          {/* Sidebar — list format + CTA */}
          <div className="space-y-6">
            {/* Recent list */}
            <div className="bg-white rounded-2xl border border-ivory-200 p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-5 bg-marigold rounded-full" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">Also Reading</p>
              </div>
              <div className="divide-y divide-ivory-200">
                {rest.slice(4).map(article => (
                  <ArticleCard key={article.slug} article={article} layout="list" />
                ))}
              </div>
            </div>

            {/* Find events CTA */}
            <div className="rounded-2xl overflow-hidden border border-marigold/25" style={{ backgroundColor: "#2E1B30" }}>
              <div className="p-5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-marigold/60 mb-2">On Rameelo</p>
                <h3 className="font-display font-bold text-white text-lg mb-2" style={{ letterSpacing: "-0.02em" }}>
                  Find Garba Events Near You
                </h3>
                <p className="font-ui text-white/50 text-sm mb-4 leading-relaxed">
                  Every verified raas garba and Navratri event in the USA — searchable by city, date, and style.
                </p>
                <Link href="/events" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
                  Browse events →
                </Link>
              </div>
            </div>

            {/* Group discount CTA */}
            <div className="rounded-2xl border border-peacock/20 bg-peacock/5 p-5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-peacock font-bold mb-2">Group Discounts</p>
              <p className="font-display font-bold text-ink text-base mb-1" style={{ letterSpacing: "-0.015em" }}>
                Save up to 15% on group tickets
              </p>
              <p className="font-ui text-sm text-ink-muted mb-3 leading-relaxed">
                Bring 5+ friends and unlock automatic discounts. No coupon codes needed.
              </p>
              <Link href="/events" className="font-ui font-semibold text-peacock text-sm hover:text-peacock/70 transition-colors">
                Learn how it works →
              </Link>
            </div>
          </div>
        </div>

        {/* ── About the publication ── */}
        <div className="mt-12 border-t-2 border-ink/8 pt-8">
          <div className="max-w-2xl">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-3">About The Rameelo Review</p>
            <p className="font-ui text-ink-muted text-sm leading-relaxed">
              The Rameelo Review is the editorial voice of the Rameelo platform — America&rsquo;s dedicated home for raas garba ticketing and community. Our writers are garba enthusiasts, cultural insiders, and community members who cover Navratri events, culture, artists, and the South Asian diaspora across the United States. We believe garba deserves serious, authoritative, joyful coverage.
            </p>
          </div>
        </div>
      </div>

      {/* ── Structured data ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "The Rameelo Review",
            "description": "America's premier source for raas garba culture, events, and Navratri news",
            "url": "https://rameelo.com/blog",
            "publisher": {
              "@type": "Organization",
              "name": "Rameelo",
              "url": "https://rameelo.com",
              "logo": { "@type": "ImageObject", "url": "https://rameelo.com/og-default.jpg" },
            },
          }),
        }}
      />
    </div>
  );
}
