import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticle, getArticleCta, getArticleCityFilter, BLOG_ARTICLES, type BlogArticle } from "@/lib/blog";
import { getBlogOverride } from "@/lib/blog-overrides";
import { breadcrumbSchema, faqSchema, ld } from "@/lib/jsonld";
import BlogCityEvents from "./BlogCityEvents";

type Props = { params: Promise<{ slug: string }> };

// Revalidate so admin renames / cover-image uploads (blog_article_overrides)
// surface on the public article within a minute without a redeploy.
export const revalidate = 60;

export async function generateStaticParams() {
  return BLOG_ARTICLES.map(a => ({ slug: a.slug }));
}

// Trim a description to a clean, ~155-char meta length without cutting a word.
function metaDescription(text: string, max = 158): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s]+$/, "") + "…";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) {
    return { title: "Article not found — Rameelo", robots: { index: false, follow: true } };
  }

  const override = await getBlogOverride(slug);
  const displayTitle = override.title || article.title;
  const description = metaDescription(article.excerpt);
  const url = `https://rameelo.com/blog/${article.slug}`;
  // og:image / twitter:image are supplied by the sibling opengraph-image.tsx
  // (one branded card per article) — so we don't set images here.
  return {
    title: `${displayTitle} — Rameelo`,
    description,
    keywords: article.tags,
    authors: [{ name: article.author }],
    category: article.category,
    alternates: { canonical: url },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large", "max-video-preview": -1 } },
    openGraph: {
      title: displayTitle,
      description,
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.publishedAt,
      authors: [article.author],
      section: article.category,
      tags: article.tags,
      url,
      siteName: "Rameelo",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      site: "@rameelo",
      creator: "@rameelo",
      title: article.title,
      description,
    },
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  "Event Guide":    "bg-aubergine/10 text-aubergine",
  "Culture":        "bg-peacock/10 text-peacock",
  "City Guide":     "bg-[#7C1F2C]/10 text-[#7C1F2C]",
  "Community":      "bg-marigold/10 text-marigold-dark",
  "Tips & Tricks":  "bg-[#5a1e7a]/10 text-[#5a1e7a]",
  "For Organizers": "bg-peacock/10 text-peacock",
  "Platform":       "bg-aubergine/10 text-aubergine",
  "News":           "bg-[#7C1F2C]/10 text-[#7C1F2C]",
  "Artist Spotlight": "bg-[#B06A00]/10 text-[#B06A00]",
  "First-Timer":    "bg-peacock/10 text-peacock",
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function RelatedCard({ article }: { article: BlogArticle }) {
  return (
    <Link href={`/blog/${article.slug}`} className="group flex gap-4 p-4 rounded-2xl border border-ivory-200 bg-white hover:border-aubergine/30 hover:shadow-sm transition-all">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${article.coverGradient} flex items-center justify-center text-xl shrink-0`}>
        {article.coverEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`inline-block font-mono text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full mb-1 ${CATEGORY_COLORS[article.category] ?? "bg-ivory-200 text-ink-muted"}`}>
          {article.category}
        </span>
        <p className="font-display font-bold text-ink text-sm leading-snug group-hover:text-aubergine transition-colors" style={{ letterSpacing: "-0.01em" }}>
          {article.title}
        </p>
        <p className="font-mono text-[9px] text-ink-muted mt-1">{article.readMinutes} min read</p>
      </div>
    </Link>
  );
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const override = await getBlogOverride(slug);
  const displayTitle = override.title || article.title;
  const coverImageUrl = override.coverImageUrl;

  const related = BLOG_ARTICLES
    .filter(a => a.slug !== slug)
    .sort((a, b) => {
      if (a.category === article.category && b.category !== article.category) return -1;
      if (b.category === article.category && a.category !== article.category) return 1;
      return b.publishedAt.localeCompare(a.publishedAt);
    })
    .slice(0, 3);

  const cta = getArticleCta(slug);
  const cityFilter = getArticleCityFilter(slug);

  const crumbs = breadcrumbSchema([
    { name: "Home", url: "https://rameelo.com" },
    { name: "Blog", url: "https://rameelo.com/blog" },
    { name: displayTitle, url: `https://rameelo.com/blog/${article.slug}` },
  ]);

  const articleUrl = `https://rameelo.com/blog/${article.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    // News pieces emit NewsArticle so Google can surface them in Top stories /
    // Google News; evergreen pieces stay BlogPosting.
    "@type": article.category === "News" ? "NewsArticle" : "BlogPosting",
    "@id": articleUrl,
    "headline": displayTitle,
    "description": article.excerpt,
    "image": coverImageUrl || "https://rameelo.com/og-default.jpg",
    "author": {
      "@type": "Person",
      "name": article.author,
      "jobTitle": article.authorTitle,
    },
    "publisher": {
      "@type": "Organization",
      "name": "Rameelo",
      "url": "https://rameelo.com",
      "logo": { "@type": "ImageObject", "url": "https://rameelo.com/logo/rameelo-icon-goldred.png" },
    },
    "datePublished": article.publishedAt,
    "dateModified": article.publishedAt,
    "url": articleUrl,
    "keywords": article.tags.join(", "),
    "articleSection": article.category,
    "wordCount": Math.round(article.body.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length),
    "inLanguage": "en-US",
    "isPartOf": { "@type": "Blog", "name": "The Rameelo Review", "url": "https://rameelo.com/blog" },
    "mainEntityOfPage": { "@type": "WebPage", "@id": articleUrl },
  };

  // Extract FAQ pairs from <h3>…</h3> <p>…</p> patterns in the body
  const faqPairs: { question: string; answer: string }[] = [];
  const faqBlockRe = /<h3>([^<]+)<\/h3>\s*<p>([^<]*(?:<(?!\/p>)[^<]*)*)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = faqBlockRe.exec(article.body)) !== null) {
    const q = m[1].trim();
    const a = m[2].replace(/<[^>]+>/g, "").trim();
    // Only include question-shaped headings
    if (q.endsWith("?")) faqPairs.push({ question: q, answer: a });
  }
  const faqLd = faqPairs.length > 0 ? faqSchema(faqPairs) : null;

  return (
    <div className="bg-ivory min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbs) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(faqLd) }} />}

      {/* ── Masthead strip ── */}
      <div style={{ backgroundColor: "#2E1B30" }} className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/blog" className="font-display font-bold text-white text-sm hover:text-marigold transition-colors" style={{ letterSpacing: "-0.02em" }}>
            ← The Rameelo Review
          </Link>
          <span className="font-mono text-[9px] text-white/30 uppercase tracking-widest">
            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className={`bg-gradient-to-br ${article.coverGradient}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
          <div className="text-7xl mb-6">{article.coverEmoji}</div>
          <span className={`inline-block font-mono text-[9px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full mb-6 bg-white/15 text-white border border-white/20`}>
            {article.category}
          </span>
          <h1 className="font-display font-bold text-white text-3xl sm:text-4xl lg:text-5xl leading-tight max-w-3xl mx-auto mb-6" style={{ letterSpacing: "-0.03em" }}>
            {displayTitle}
          </h1>
          <p className="font-ui text-white/60 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-8">
            {article.excerpt}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                {article.author.charAt(0)}
              </div>
              <div className="text-left">
                <p className="font-ui font-semibold text-white text-sm">{article.author}</p>
                <p className="font-mono text-[9px] text-white/50">{article.authorTitle}</p>
              </div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <p className="font-mono text-[9px] text-white/50">{fmtDate(article.publishedAt)}</p>
            <div className="w-px h-8 bg-white/20" />
            <p className="font-mono text-[9px] text-white/50">{article.readMinutes} min read</p>
          </div>
        </div>
      </div>

      {/* ── Article body ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Main content */}
          <article className="lg:col-span-2">
            {/* Decorative rule */}
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px flex-1 bg-marigold/40" />
              <div className="w-2 h-2 bg-marigold rounded-full" />
              <div className="h-px flex-1 bg-marigold/40" />
            </div>

            {/* Cover image (admin-uploaded) — inline, full image, never cropped */}
            {coverImageUrl && (
              <figure className="mb-8 max-w-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImageUrl}
                  alt={displayTitle}
                  className="w-full h-auto rounded-xl border border-ivory-200 shadow-sm bg-white"
                />
              </figure>
            )}

            <div
              className="prose prose-ink max-w-none"
              style={{
                lineHeight: "1.8",
                color: "#2E1B30",
              }}
              dangerouslySetInnerHTML={{ __html: article.body }}
            />

            {/* Tags */}
            <div className="mt-10 pt-6 border-t border-ivory-200">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-3">Topics</p>
              <div className="flex flex-wrap gap-2">
                {article.tags.map(tag => (
                  <span key={tag} className="font-mono text-[10px] px-3 py-1.5 rounded-full bg-ivory-200 text-ink-muted border border-ivory-200 capitalize">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Share row */}
            <div className="mt-6 pt-6 border-t border-ivory-200 flex items-center gap-3 flex-wrap">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Share this story</p>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(displayTitle)}&url=${encodeURIComponent(`https://rameelo.com/blog/${article.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-ivory-200 font-ui text-xs text-ink-muted hover:text-ink hover:border-ink/20 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                X / Twitter
              </a>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="sticky top-24 space-y-5">
              {/* Find events CTA */}
              <div className="rounded-2xl overflow-hidden border border-marigold/25" style={{ backgroundColor: "#2E1B30" }}>
                <div className="p-5">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-marigold/60 mb-2">Rameelo</p>
                  <h3 className="font-display font-bold text-white text-base mb-2" style={{ letterSpacing: "-0.02em" }}>
                    Find Garba Events Near You
                  </h3>
                  <p className="font-ui text-white/50 text-xs mb-4 leading-relaxed">
                    Every verified raas garba and Navratri event in the USA — searchable by city, date, and style.
                  </p>
                  <Link href="/events" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
                    Browse events →
                  </Link>
                </div>
              </div>

              {/* Author card */}
              <div className="rounded-2xl border border-ivory-200 bg-white p-5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-3">Written by</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-aubergine flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {article.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-ui font-semibold text-ink text-sm">{article.author}</p>
                    <p className="font-mono text-[10px] text-ink-muted">{article.authorTitle}</p>
                  </div>
                </div>
              </div>

              {/* Group discount box */}
              <div className="rounded-2xl border border-peacock/20 bg-peacock/5 p-5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-peacock font-bold mb-2">💡 Tip</p>
                <p className="font-ui text-sm text-ink font-semibold mb-1">Save 15% on group tickets</p>
                <p className="font-ui text-xs text-ink-muted mb-3 leading-relaxed">
                  Bring 10+ friends and unlock Rameelo&apos;s automatic group discount. No code needed.
                </p>
                <Link href="/events" className="font-ui font-semibold text-peacock text-xs hover:text-peacock/70 transition-colors">
                  Get group tickets →
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* ── City-matched live events (city guides) — buy straight from the article ── */}
        {cityFilter && <BlogCityEvents filter={cityFilter} />}

        {/* ── Conversion CTA — one clear next step, tailored per article ── */}
        <div className="mt-12 rounded-3xl overflow-hidden border border-marigold/25 relative" style={{ backgroundColor: "#2E1B30" }}>
          <div className="absolute inset-0 pointer-events-none opacity-[0.5]" style={{ background: "radial-gradient(ellipse at 85% 0%, rgba(245,166,35,0.22) 0%, transparent 55%)" }} />
          <div className="relative px-6 sm:px-10 py-9 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-marigold/70 mb-2">{cta.eyebrow}</p>
            <h2 className="font-display font-bold text-white text-2xl sm:text-3xl mb-3" style={{ letterSpacing: "-0.025em" }}>
              {cta.heading}
            </h2>
            <p className="font-ui text-white/60 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-6">
              {cta.body}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href={cta.href} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm sm:text-base hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-lg">
                {cta.buttonLabel}
              </Link>
              {cta.secondaryLabel && cta.secondaryHref && (
                <Link href={cta.secondaryHref} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white font-ui font-semibold text-sm hover:bg-white/10 transition-all">
                  {cta.secondaryLabel}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Related articles ── */}
        {related.length > 0 && (
          <div className="mt-16 border-t border-ivory-200 pt-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-ink/10" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Keep Reading</span>
              <div className="h-px flex-1 bg-ink/10" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map(a => <RelatedCard key={a.slug} article={a} />)}
            </div>
          </div>
        )}

        {/* ── Back to blog ── */}
        <div className="mt-10 text-center">
          <Link href="/blog" className="inline-flex items-center gap-2 font-ui font-semibold text-aubergine text-sm hover:text-aubergine/70 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to The Rameelo Review
          </Link>
        </div>
      </div>
    </div>
  );
}
