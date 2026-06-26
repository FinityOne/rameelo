import { createClient } from "@supabase/supabase-js";

// Admin-managed overrides for static blog articles: a renamed title and/or an
// uploaded cover image, keyed by article slug. Stored in
// `blog_article_overrides` and edited from /admin/blog. Reads here use a plain
// (cookieless) anon client so the public blog can stay statically/ISR-rendered.

export type BlogOverride = { title: string | null; coverImageUrl: string | null };

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function getBlogOverrides(): Promise<Record<string, BlogOverride>> {
  try {
    const { data } = await anonClient()
      .from("blog_article_overrides")
      .select("slug, title, cover_image_url");
    const map: Record<string, BlogOverride> = {};
    for (const r of (data ?? []) as { slug: string; title: string | null; cover_image_url: string | null }[]) {
      map[r.slug] = { title: r.title, coverImageUrl: r.cover_image_url };
    }
    return map;
  } catch {
    return {};
  }
}

export async function getBlogOverride(slug: string): Promise<BlogOverride> {
  try {
    const { data } = await anonClient()
      .from("blog_article_overrides")
      .select("title, cover_image_url")
      .eq("slug", slug)
      .maybeSingle();
    return { title: data?.title ?? null, coverImageUrl: data?.cover_image_url ?? null };
  } catch {
    return { title: null, coverImageUrl: null };
  }
}
