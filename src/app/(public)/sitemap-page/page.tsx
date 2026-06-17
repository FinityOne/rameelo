import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_ARTICLES } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Sitemap — Rameelo",
  description: "A full directory of all pages on Rameelo — garba events, blog articles, organizer tools, and more.",
  robots: { index: true, follow: true },
};

const SECTIONS = [
  {
    title: "Discover",
    links: [
      { label: "Home", href: "/" },
      { label: "Garba & Navratri Events", href: "/events" },
      { label: "Artists", href: "/artists" },
      { label: "Community", href: "/community" },
    ],
  },
  {
    title: "For Organizers",
    links: [
      { label: "Organizer Overview", href: "/organizers" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Rameelo", href: "/about" },
      { label: "The Rameelo Review (Blog)", href: "/blog" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign In", href: "/auth/signin" },
      { label: "Create Account", href: "/auth/signup" },
    ],
  },
];

export default function SitemapPage() {
  const blogByCategory = BLOG_ARTICLES.reduce<Record<string, typeof BLOG_ARTICLES>>(
    (acc, a) => { (acc[a.category] ??= []).push(a); return acc; },
    {}
  );

  return (
    <div className="min-h-screen bg-ivory">
      {/* Header */}
      <div className="bg-aubergine py-14 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-marigold mb-3">Site directory</p>
          <h1 className="font-display font-bold text-white text-3xl sm:text-4xl" style={{ letterSpacing: "-0.025em" }}>
            Sitemap
          </h1>
          <p className="font-ui text-white/50 text-sm mt-2">
            Every page on Rameelo, organized for easy navigation.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">

        {/* Main sections */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-4">
                {section.title}
              </h2>
              <ul className="space-y-2.5">
                {section.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="font-ui text-sm text-ink hover:text-aubergine transition-colors flex items-center gap-1.5 group"
                    >
                      <svg className="w-3 h-3 text-marigold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="h-px bg-ivory-200" />

        {/* Blog articles */}
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-6">
            Blog — The Rameelo Review
          </h2>
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-1">
            {Object.entries(blogByCategory).map(([category, articles]) => (
              <div key={category} className="mb-6">
                <p className="font-mono text-[9px] uppercase tracking-widest text-marigold-dark mb-3">{category}</p>
                <ul className="space-y-2">
                  {articles.map(a => (
                    <li key={a.slug}>
                      <Link
                        href={`/blog/${a.slug}`}
                        className="font-ui text-sm text-ink hover:text-aubergine transition-colors flex items-start gap-1.5 group"
                      >
                        <svg className="w-3 h-3 text-marigold shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                        <span>{a.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-ivory-200" />

        {/* XML sitemap link */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white border border-ivory-200 px-5 py-4">
          <div>
            <p className="font-ui font-semibold text-ink text-sm">XML Sitemap</p>
            <p className="font-ui text-xs text-ink-muted mt-0.5">For search engines and crawlers</p>
          </div>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-aubergine hover:text-marigold-dark transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            rameelo.com/sitemap.xml
          </a>
        </div>

      </div>
    </div>
  );
}
