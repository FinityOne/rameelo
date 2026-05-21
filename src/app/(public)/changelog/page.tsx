import type { Metadata } from "next";
import Link from "next/link";
import { RELEASES, TAG_META, type AudienceTag } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "Changelog — What's New on Rameelo",
  description: "Every feature, improvement, and platform update released on Rameelo — organized by what matters to you: attendees, members, and organizers.",
  alternates: { canonical: "https://rameelo.com/changelog" },
};

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function ChangelogPage() {
  const releases = [...RELEASES].sort((a, b) => b.date.localeCompare(a.date));
  const latest = releases[0];

  // Collect unique tags across all features of a release
  function releaseTags(r: typeof RELEASES[0]): AudienceTag[] {
    return Array.from(new Set(r.features.flatMap((f) => f.tags)));
  }

  return (
    <div style={{ backgroundColor: "#FDFAF5" }} className="min-h-screen">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-ivory-200" style={{ backgroundColor: "#FDFAF5" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/" className="font-mono text-[10px] uppercase tracking-widest text-ink-muted/50 hover:text-ink-muted transition-colors">
              Rameelo
            </Link>
            <span className="text-ink-muted/30 font-mono text-xs">/</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Changelog</span>
          </div>

          <h1
            className="font-display font-bold text-ink mb-3"
            style={{ fontSize: "clamp(32px, 5vw, 52px)", letterSpacing: "-0.03em", lineHeight: 1.05 }}
          >
            What&rsquo;s new
            <span className="font-editorial italic text-marigold"> on Rameelo.</span>
          </h1>
          <p className="font-ui text-ink-muted text-base leading-relaxed max-w-xl">
            Every feature shipped, every improvement deployed — logged here so organizers, members, and
            attendees always know what&rsquo;s available on the platform.
          </p>

          {/* Audience key */}
          <div className="flex flex-wrap gap-2 mt-6">
            {(Object.entries(TAG_META) as [AudienceTag, typeof TAG_META[AudienceTag]][]).map(([key, meta]) => (
              <span
                key={key}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[9px] font-semibold uppercase tracking-widest border ${meta.cls}`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.dot }} />
                {meta.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── RELEASE LIST ───────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="relative">
          {/* Timeline spine */}
          <div className="absolute left-[88px] top-0 bottom-0 w-px bg-ivory-200 hidden sm:block" />

          <div className="space-y-10">
            {releases.map((release, i) => {
              const tags = releaseTags(release);
              const highlights = release.features.filter((f) => f.highlight);
              const isLatest = i === 0;

              return (
                <div key={release.slug} className="sm:grid sm:grid-cols-[120px_1fr] sm:gap-8 group">
                  {/* Left: version + date */}
                  <div className="hidden sm:flex flex-col items-end pt-1 pr-8 relative">
                    {/* Timeline dot */}
                    <div className={`absolute right-[-4.5px] top-2 w-2.5 h-2.5 rounded-full border-2 border-white z-10 ${isLatest ? "bg-aubergine" : "bg-ivory-200"}`} />

                    <span
                      className="font-display font-bold text-ink leading-none"
                      style={{ fontSize: "13px", letterSpacing: "-0.02em" }}
                    >
                      v{release.version}
                    </span>
                    <span className="font-mono text-[9px] text-ink-muted uppercase tracking-widest mt-1">
                      {fmtDateShort(release.date)}
                    </span>
                  </div>

                  {/* Right: release card */}
                  <Link
                    href={`/changelog/${release.slug}`}
                    className="block bg-white rounded-2xl border border-ivory-200 p-6 hover:border-aubergine/25 hover:shadow-sm transition-all"
                  >
                    {/* Mobile version badge */}
                    <div className="flex items-center gap-3 mb-4 sm:hidden">
                      <span className="font-mono text-[10px] font-bold text-ink-muted uppercase tracking-widest">v{release.version}</span>
                      <span className="font-mono text-[9px] text-ink-muted/60">{fmtDate(release.date)}</span>
                    </div>

                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        {isLatest && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-aubergine text-white font-mono text-[8px] font-bold uppercase tracking-widest mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-marigold animate-pulse" />
                            Latest
                          </span>
                        )}
                        <h2
                          className="font-display font-bold text-ink group-hover:text-aubergine transition-colors"
                          style={{ fontSize: "20px", letterSpacing: "-0.018em" }}
                        >
                          {release.name}
                        </h2>
                        <p className="font-mono text-[10px] text-ink-muted/60 uppercase tracking-widest mt-0.5 hidden sm:block">
                          {fmtDate(release.date)}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-ink-muted/40 group-hover:text-aubergine transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>

                    <p className="font-ui text-sm text-ink-muted leading-relaxed mb-4">
                      {release.summary}
                    </p>

                    {/* Highlighted features — scannable */}
                    {highlights.length > 0 && (
                      <ul className="space-y-1.5 mb-4">
                        {highlights.map((f) => (
                          <li key={f.title} className="flex items-start gap-2">
                            <svg className="w-3.5 h-3.5 text-peacock shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-ui text-sm text-ink">{f.title}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Feature count + audience tags */}
                    <div className="flex items-center justify-between pt-3 border-t border-ivory-200">
                      <span className="font-mono text-[9px] text-ink-muted uppercase tracking-widest">
                        {release.features.length} updates
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[8px] font-semibold uppercase tracking-widest border ${TAG_META[tag].cls}`}
                          >
                            {TAG_META[tag].label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscribe strip */}
        <div className="mt-16 rounded-2xl border border-ivory-200 bg-white p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-display font-semibold text-ink mb-1" style={{ fontSize: "16px", letterSpacing: "-0.015em" }}>
              Stay in the loop.
            </p>
            <p className="font-ui text-sm text-ink-muted">
              New features ship regularly. Watch this page — or follow{" "}
              <a href="#" className="text-aubergine hover:underline">@rameelo</a> for announcements.
            </p>
          </div>
          <Link
            href="/auth/signup"
            className="shrink-0 px-5 py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:bg-aubergine/90 transition-colors"
          >
            Create account →
          </Link>
        </div>
      </div>
    </div>
  );
}
