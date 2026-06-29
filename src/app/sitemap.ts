import type { MetadataRoute } from "next";
import { BLOG_ARTICLES } from "@/lib/blog";
import { RELEASES } from "@/lib/changelog";
import { METROS, metroSlug } from "@/lib/metros";
import { createClient } from "@/lib/supabase/server";

const BASE = "https://www.rameelo.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                    lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/events`,        lastModified: now, changeFrequency: "daily",   priority: 0.95 },
    { url: `${BASE}/garba-events`,  lastModified: now, changeFrequency: "daily",   priority: 0.92 },
    { url: `${BASE}/artists`,       lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/blog`,          lastModified: now, changeFrequency: "weekly",  priority: 0.85 },
    { url: `${BASE}/collegiate`,    lastModified: now, changeFrequency: "weekly",  priority: 0.85 },
    { url: `${BASE}/organizers`,    lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/community`,     lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/changelog`,     lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/pricing`,       lastModified: now, changeFrequency: "monthly", priority: 0.65 },
    { url: `${BASE}/about`,         lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/auth/signup`,   lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${BASE}/auth/signin`,   lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];

  const blogPages: MetadataRoute.Sitemap = BLOG_ARTICLES.map((article) => ({
    url: `${BASE}/blog/${article.slug}`,
    lastModified: new Date(article.publishedAt).toISOString(),
    changeFrequency: "monthly" as const,
    priority: article.featured ? 0.85 : 0.75,
  }));

  const changelogPages: MetadataRoute.Sitemap = RELEASES.map((r) => ({
    url: `${BASE}/changelog/${r.slug}`,
    lastModified: new Date(r.date).toISOString(),
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  // City Garba landing pages — one per metro ("garba events near {city}").
  const cityPages: MetadataRoute.Sitemap = METROS.map((m) => ({
    url: `${BASE}/garba-events/${metroSlug(m)}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  let eventPages: MetadataRoute.Sitemap = [];
  let artistPages: MetadataRoute.Sitemap = [];
  let teamPages: MetadataRoute.Sitemap = [];

  try {
    const supabase = await createClient();

    const [{ data: upcomingEvents }, { data: pastEvents }, { data: artists }, { data: collegTeams }] =
      await Promise.all([
        supabase
          .from("events")
          .select("id, start_date, updated_at, cover_image_url, title")
          .eq("status", "published")
          .gte("start_date", new Date().toISOString().slice(0, 10))
          .order("start_date"),
        supabase
          .from("events")
          .select("id, start_date, updated_at, cover_image_url, title")
          .eq("status", "published")
          .lt("start_date", new Date().toISOString().slice(0, 10))
          .order("start_date", { ascending: false })
          .limit(200),
        supabase
          .from("artists")
          .select("slug, updated_at, profile_image_url, name")
          .eq("is_active", true),
        supabase
          .from("collegiate_teams")
          .select("slug, updated_at")
          .eq("is_active", true),
      ]);

    // Upcoming events — high priority, crawl daily
    eventPages = [
      ...(upcomingEvents ?? []).map((e) => ({
        url: `${BASE}/events/${e.id}`,
        lastModified: e.updated_at ?? now,
        changeFrequency: "daily" as const,
        priority: 0.92,
        ...(e.cover_image_url ? { images: [e.cover_image_url] } : {}),
      })),
      // Past events — lower priority but keep for SEO/archival
      ...(pastEvents ?? []).map((e) => ({
        url: `${BASE}/events/${e.id}`,
        lastModified: e.updated_at ?? now,
        changeFrequency: "yearly" as const,
        priority: 0.45,
        ...(e.cover_image_url ? { images: [e.cover_image_url] } : {}),
      })),
    ];

    artistPages = (artists ?? []).map((a) => ({
      url: `${BASE}/artists/${a.slug}`,
      lastModified: a.updated_at ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.75,
      ...(a.profile_image_url ? { images: [a.profile_image_url] } : {}),
    }));

    teamPages = (collegTeams ?? []).map((t) => ({
      url: `${BASE}/collegiate/${t.slug}`,
      lastModified: t.updated_at ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // Silently skip DB pages if connection fails at build time
  }

  return [...staticPages, ...cityPages, ...blogPages, ...changelogPages, ...eventPages, ...artistPages, ...teamPages];
}
