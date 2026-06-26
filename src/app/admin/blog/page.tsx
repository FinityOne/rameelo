"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getArticlesByPriority, getArticlePriority, getCategoriesInOrder } from "@/lib/blog";

// Admin index of every blog article. Content lives in code (src/lib/blog.ts);
// admins can't edit copy here, but can rename an article and upload a cover
// image (stored as overrides). Sorted by the same priority that drives the
// public blog so an admin sees the running order at a glance.

const CATEGORY_COLORS: Record<string, string> = {
  "News": "bg-[#7C1F2C]/10 text-[#7C1F2C]",
  "City Guide": "bg-aubergine/10 text-aubergine",
  "Artist Spotlight": "bg-[#B06A00]/10 text-[#B06A00]",
  "Tips & Tricks": "bg-[#5a1e7a]/10 text-[#5a1e7a]",
  "First-Timer": "bg-peacock/10 text-peacock",
  "Culture": "bg-[#A23A2B]/10 text-[#A23A2B]",
  "For Organizers": "bg-peacock/10 text-peacock",
};
const catColor = (c: string) => CATEGORY_COLORS[c] ?? "bg-ivory-200 text-ink-muted";

type Override = { title: string | null; coverImageUrl: string | null };

export default function AdminBlogPage() {
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("All");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("blog_article_overrides")
        .select("slug, title, cover_image_url");
      const map: Record<string, Override> = {};
      for (const r of (data ?? []) as { slug: string; title: string | null; cover_image_url: string | null }[]) {
        map[r.slug] = { title: r.title, coverImageUrl: r.cover_image_url };
      }
      setOverrides(map);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => ["All", ...getCategoriesInOrder()], []);
  const articles = useMemo(() => getArticlesByPriority(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (cat !== "All" && a.category !== cat) return false;
      if (!q) return true;
      const title = (overrides[a.slug]?.title || a.title).toLowerCase();
      return title.includes(q) || a.slug.includes(q) || a.category.toLowerCase().includes(q);
    });
  }, [articles, overrides, query, cat]);

  const editedCount = Object.keys(overrides).filter(
    (s) => overrides[s].title || overrides[s].coverImageUrl,
  ).length;

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <p className="font-ui text-sm text-ink-muted max-w-xl leading-relaxed">
          Every article on the blog, in published priority order. Article copy is managed in code — here you can rename an article and upload its cover image.
        </p>
        <Link
          href="/blog"
          target="_blank"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ivory-200 bg-white text-ink font-display font-bold text-sm hover:border-aubergine/30 transition-colors"
        >
          View live blog →
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Articles", value: articles.length },
          { label: "Categories", value: getCategoriesInOrder().length },
          { label: "Customized", value: editedCount },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-ivory-200 bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">{s.label}</p>
            <p className="font-display font-bold text-ink text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <svg className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, slug or category…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-ivory-200 bg-white font-ui text-sm focus:outline-none focus:border-aubergine/40"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-ivory-200 bg-white font-ui text-sm focus:outline-none focus:border-aubergine/40"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-aubergine/20 border-t-aubergine animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-ivory-200 bg-white p-12 text-center">
          <p className="font-display font-bold text-ink mb-1">No articles match</p>
          <p className="font-ui text-sm text-ink-muted">Try a different search or category.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-ivory-200 bg-white overflow-hidden divide-y divide-ivory-200">
          {filtered.map((a) => {
            const ov = overrides[a.slug];
            const title = ov?.title || a.title;
            const renamed = !!ov?.title;
            const img = ov?.coverImageUrl;
            return (
              <Link
                key={a.slug}
                href={`/admin/blog/${a.slug}`}
                className="group flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-ivory/50 transition-colors"
              >
                <span className="font-mono text-xs font-bold text-ink-muted w-6 shrink-0 text-center">
                  {getArticlePriority(a.slug) >= 50 ? "—" : getArticlePriority(a.slug)}
                </span>
                {/* Cover thumb */}
                <div className={`w-14 h-14 rounded-lg shrink-0 overflow-hidden bg-gradient-to-br ${a.coverGradient} flex items-center justify-center text-xl`}>
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{a.coverEmoji}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${catColor(a.category)}`}>
                      {a.category}
                    </span>
                    {renamed && (
                      <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-marigold/15 text-marigold-dark">Renamed</span>
                    )}
                    {img && (
                      <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-peacock/10 text-peacock">Image</span>
                    )}
                  </div>
                  <p className="font-display font-bold text-ink text-sm leading-snug truncate group-hover:text-aubergine transition-colors">
                    {title}
                  </p>
                  <p className="font-mono text-[10px] text-ink-muted/70 truncate">/{a.slug}</p>
                </div>
                <svg className="w-4 h-4 text-ink-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
