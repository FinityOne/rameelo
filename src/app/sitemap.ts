import type { MetadataRoute } from "next";
import { BLOG_ARTICLES } from "@/lib/blog";

const BASE = "https://rameelo.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                   lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/events`,        lastModified: now, changeFrequency: "daily",   priority: 0.95 },
    { url: `${BASE}/blog`,          lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/organizers`,    lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/artists`,       lastModified: now, changeFrequency: "weekly",  priority: 0.75 },
    { url: `${BASE}/pricing`,       lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/about`,         lastModified: now, changeFrequency: "monthly", priority: 0.65 },
    { url: `${BASE}/community`,     lastModified: now, changeFrequency: "weekly",  priority: 0.65 },
    { url: `${BASE}/auth/signin`,   lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/auth/signup`,   lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];

  const blogPages: MetadataRoute.Sitemap = BLOG_ARTICLES.map(article => ({
    url: `${BASE}/blog/${article.slug}`,
    lastModified: new Date(article.publishedAt).toISOString(),
    changeFrequency: "monthly" as const,
    priority: article.featured ? 0.85 : 0.75,
  }));

  return [...staticPages, ...blogPages];
}
