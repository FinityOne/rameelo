import type { MetadataRoute } from "next";
import { BLOG_ARTICLES } from "@/lib/blog";
import { createClient } from "@/lib/supabase/server";

const BASE = "https://rameelo.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                    lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/events`,        lastModified: now, changeFrequency: "daily",   priority: 0.95 },
    { url: `${BASE}/collegiate`,    lastModified: now, changeFrequency: "weekly",  priority: 0.85 },
    { url: `${BASE}/blog`,          lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/organizers`,    lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/artists`,       lastModified: now, changeFrequency: "weekly",  priority: 0.75 },
    { url: `${BASE}/pricing`,       lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/about`,         lastModified: now, changeFrequency: "monthly", priority: 0.65 },
    { url: `${BASE}/community`,     lastModified: now, changeFrequency: "weekly",  priority: 0.65 },
    { url: `${BASE}/auth/signin`,   lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/auth/signup`,   lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
  ];

  const blogPages: MetadataRoute.Sitemap = BLOG_ARTICLES.map(article => ({
    url: `${BASE}/blog/${article.slug}`,
    lastModified: new Date(article.publishedAt).toISOString(),
    changeFrequency: "monthly" as const,
    priority: article.featured ? 0.85 : 0.75,
  }));

  // Fetch published events, artists, and collegiate teams from DB
  let eventPages: MetadataRoute.Sitemap = [];
  let artistPages: MetadataRoute.Sitemap = [];
  let teamPages: MetadataRoute.Sitemap = [];

  try {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: events }, { data: artists }, { data: collegTeams }] = await Promise.all([
      supabase
        .from("events")
        .select("id, start_date, updated_at")
        .eq("status", "published")
        .gte("start_date", today)
        .order("start_date"),
      supabase
        .from("artists")
        .select("slug, updated_at")
        .eq("is_active", true),
      supabase
        .from("collegiate_teams")
        .select("slug, updated_at")
        .eq("is_active", true),
    ]);

    eventPages = (events ?? []).map(e => ({
      url: `${BASE}/events/${e.id}`,
      lastModified: e.updated_at ?? now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    }));

    artistPages = (artists ?? []).map(a => ({
      url: `${BASE}/artists/${a.slug}`,
      lastModified: a.updated_at ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    teamPages = (collegTeams ?? []).map(t => ({
      url: `${BASE}/collegiate/${t.slug}`,
      lastModified: t.updated_at ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // Silently skip DB pages if connection fails at build time
  }

  return [...staticPages, ...blogPages, ...eventPages, ...artistPages, ...teamPages];
}
