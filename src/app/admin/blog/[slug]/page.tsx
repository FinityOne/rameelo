"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getArticle, getArticlePriority } from "@/lib/blog";

// Edit the admin-managed fields for a single article: display title + cover
// image. Copy is intentionally read-only (managed in code). Persists via the
// admin_upsert_blog_override RPC and uploads images to the event-images bucket.

export default function AdminBlogEditPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const article = getArticle(slug);

  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!article) { setLoading(false); return; }
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("blog_article_overrides")
        .select("title, cover_image_url")
        .eq("slug", slug)
        .maybeSingle();
      setTitle(data?.title ?? "");
      setCoverUrl(data?.cover_image_url ?? "");
      setLoading(false);
    })();
  }, [slug, article]);

  if (!article) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-2xl border border-ivory-200 bg-white p-12 text-center">
          <p className="font-display font-bold text-ink mb-1">Article not found</p>
          <p className="font-ui text-sm text-ink-muted mb-4">No article exists for <span className="font-mono">/{slug}</span>.</p>
          <Link href="/admin/blog" className="font-ui font-semibold text-aubergine text-sm hover:underline">← Back to all articles</Link>
        </div>
      </div>
    );
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5 MB."); return; }
    setError("");
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `blog/${slug}-${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("event-images").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setError(upErr.message); setUploading(false); if (fileRef.current) fileRef.current.value = ""; return; }
    const { data } = supabase.storage.from("event-images").getPublicUrl(path);
    setCoverUrl(data.publicUrl);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save() {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { error: rpcErr } = await supabase.rpc("admin_upsert_blog_override", {
      p_slug: slug,
      p_title: title.trim(),
      p_cover_image_url: coverUrl.trim(),
    });
    if (rpcErr) { setError(rpcErr.message); setSaving(false); return; }
    setSavedAt(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    setSaving(false);
  }

  const priority = getArticlePriority(slug);

  return (
    <div className="max-w-2xl">
      <Link href="/admin/blog" className="inline-flex items-center gap-1.5 font-ui text-sm text-ink-muted hover:text-ink transition-colors mb-5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        All articles
      </Link>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-aubergine/20 border-t-aubergine animate-spin" />
        </div>
      ) : (
        <>
          {/* Read-only context */}
          <div className="rounded-2xl border border-ivory-200 bg-white p-5 mb-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-aubergine/10 text-aubergine">{article.category}</span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-ivory-200 text-ink-muted">
                Priority {priority >= 50 ? "—" : priority}
              </span>
              <span className="font-mono text-[10px] text-ink-muted">{article.readMinutes} min · {article.author}</span>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">Original title</p>
            <p className="font-display font-bold text-ink text-base mb-3">{article.title}</p>
            <p className="font-ui text-sm text-ink-muted leading-relaxed">{article.excerpt}</p>
            <Link href={`/blog/${slug}`} target="_blank" className="inline-flex items-center gap-1.5 font-ui font-semibold text-aubergine text-sm mt-3 hover:underline">
              View live article →
            </Link>
          </div>

          {/* Editable: title */}
          <div className="rounded-2xl border border-ivory-200 bg-white p-5 mb-4">
            <label className="font-ui text-xs font-semibold text-ink/55 block mb-1">Display title</label>
            <p className="font-mono text-[9px] text-ink/30 mb-2">Leave blank to use the original title. This changes the headline everywhere the article appears.</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={article.title}
              className="w-full px-3 py-2.5 rounded-xl border border-ivory-200 bg-white font-ui text-sm focus:outline-none focus:border-aubergine/40"
            />
          </div>

          {/* Editable: cover image */}
          <div className="rounded-2xl border border-ivory-200 bg-white p-5 mb-4">
            <label className="font-ui text-xs font-semibold text-ink/55 block mb-1">Cover image</label>
            <p className="font-mono text-[9px] text-ink/30 mb-3">Shown in full inside the article, on the blog home page, and the social share card. JPG, PNG or WebP, under 5 MB. Wide (16:9) looks best on the home page.</p>

            <div
              onClick={() => !uploading && fileRef.current?.click()}
              className={`relative w-full h-44 rounded-xl overflow-hidden border-2 cursor-pointer group ${coverUrl ? "border-ink/10" : `border-dashed border-ink/15`} ${uploading ? "cursor-wait" : ""}`}
            >
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="Cover preview" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${article.coverGradient} flex items-center justify-center text-5xl`}>
                  {article.coverEmoji}
                </div>
              )}
              {!uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity font-ui text-sm font-semibold text-white drop-shadow">
                    {coverUrl ? "Change image" : "Upload image"}
                  </span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-full border-2 border-aubergine/20 border-t-aubergine animate-spin" />
                </div>
              )}
            </div>

            {coverUrl && !uploading && (
              <button
                type="button"
                onClick={() => setCoverUrl("")}
                className="mt-2 font-mono text-[9px] uppercase tracking-wider text-ink/30 hover:text-red-500 transition-colors"
              >
                Remove image
              </button>
            )}

            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFile} className="hidden" />
          </div>

          {error && (
            <p className="font-ui text-sm text-red-500 mb-3 flex items-center gap-1.5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving || uploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {savedAt && (
              <span className="font-mono text-[11px] text-peacock flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Saved at {savedAt}
              </span>
            )}
          </div>
          <p className="font-mono text-[10px] text-ink-muted/70 mt-3">Changes appear on the public blog within a minute.</p>
        </>
      )}
    </div>
  );
}
