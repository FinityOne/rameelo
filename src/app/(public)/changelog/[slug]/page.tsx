import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getReleaseBySlug, RELEASES, TAG_META, type AudienceTag } from "@/lib/changelog";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return RELEASES.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const release = getReleaseBySlug(slug);
  if (!release) return { title: "Changelog | Rameelo" };
  return {
    title: `v${release.version} ${release.name} — Rameelo Changelog`,
    description: release.summary,
    alternates: { canonical: `https://www.rameelo.com/changelog/${slug}` },
  };
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ReleaseDetailPage({ params }: Props) {
  const { slug } = await params;
  const release = getReleaseBySlug(slug);
  if (!release) notFound();

  // Group features by primary audience (first tag)
  const grouped: Partial<Record<AudienceTag, typeof release.features>> = {};
  const order: AudienceTag[] = ['platform', 'attendees', 'members', 'organizers'];
  for (const f of release.features) {
    const primary = f.tags[0];
    if (!grouped[primary]) grouped[primary] = [];
    grouped[primary]!.push(f);
  }

  const highlights = release.features.filter((f) => f.highlight);
  const allTags = Array.from(new Set(release.features.flatMap((f) => f.tags)));

  return (
    <div style={{ backgroundColor: "#FDFAF5" }} className="min-h-screen">

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-ivory-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-8 flex-wrap">
            <Link href="/" className="font-mono text-[10px] uppercase tracking-widest text-ink-muted/50 hover:text-ink-muted transition-colors">Rameelo</Link>
            <span className="text-ink-muted/30 font-mono text-xs">/</span>
            <Link href="/changelog" className="font-mono text-[10px] uppercase tracking-widest text-ink-muted/50 hover:text-ink-muted transition-colors">Changelog</Link>
            <span className="text-ink-muted/30 font-mono text-xs">/</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">v{release.version}</span>
          </div>

          {/* Version + date */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="px-3 py-1.5 rounded-xl font-display font-bold text-white text-sm"
              style={{ backgroundColor: "#2E1B30", letterSpacing: "-0.01em" }}
            >
              v{release.version}
            </div>
            <span className="font-mono text-[10px] text-ink-muted uppercase tracking-widest">
              {fmtDate(release.date)}
            </span>
          </div>

          <h1
            className="font-display font-bold text-ink mb-5"
            style={{ fontSize: "clamp(28px, 5vw, 44px)", letterSpacing: "-0.03em", lineHeight: 1.06 }}
          >
            {release.name}
          </h1>

          <p className="font-ui text-ink-muted text-base sm:text-lg leading-relaxed mb-6">
            {release.summary}
          </p>

          {/* Audience tags */}
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[9px] font-semibold uppercase tracking-widest border ${TAG_META[tag].cls}`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TAG_META[tag].dot }} />
                {TAG_META[tag].label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">

        {/* ── HIGHLIGHTS ─────────────────────────────────────────────────────── */}
        {highlights.length > 0 && (
          <section>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-5">
              Release highlights
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {highlights.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-ivory-200 bg-white p-5 hover:border-aubergine/20 transition-colors"
                >
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {f.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[8px] font-semibold uppercase tracking-widest border ${TAG_META[tag].cls}`}
                      >
                        {TAG_META[tag].label}
                      </span>
                    ))}
                  </div>
                  <h3
                    className="font-display font-bold text-ink mb-2"
                    style={{ fontSize: "15px", letterSpacing: "-0.01em" }}
                  >
                    {f.title}
                  </h3>
                  <p className="font-ui text-xs text-ink-muted leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── ALL CHANGES — grouped by audience ──────────────────────────────── */}
        <section>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-8">
            All changes · {release.features.length} updates
          </p>

          <div className="space-y-10">
            {order
              .filter((tag) => grouped[tag]?.length)
              .map((tag) => (
                <div key={tag}>
                  {/* Section header */}
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[9px] font-semibold uppercase tracking-widest border ${TAG_META[tag].cls}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TAG_META[tag].dot }} />
                      {TAG_META[tag].label}
                    </span>
                    <div className="flex-1 h-px bg-ivory-200" />
                  </div>

                  {/* Feature list */}
                  <div className="space-y-0 divide-y divide-ivory-200 rounded-2xl border border-ivory-200 bg-white overflow-hidden">
                    {grouped[tag]!.map((f) => (
                      <div key={f.title} className="px-5 py-4 hover:bg-ivory/40 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: TAG_META[tag].dot + '20' }}>
                            <svg className="w-3 h-3" fill="none" stroke={TAG_META[tag].dot} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4
                                className="font-display font-semibold text-ink"
                                style={{ fontSize: "14px", letterSpacing: "-0.01em" }}
                              >
                                {f.title}
                              </h4>
                              {f.highlight && (
                                <span className="font-mono text-[8px] uppercase tracking-widest text-marigold-dark bg-marigold/12 border border-marigold/20 px-1.5 py-0.5 rounded-full">
                                  Highlight
                                </span>
                              )}
                              {f.tags.filter(t => t !== tag).map(t => (
                                <span key={t} className={`font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${TAG_META[t].cls}`}>
                                  {TAG_META[t].label}
                                </span>
                              ))}
                            </div>
                            <p className="font-ui text-sm text-ink-muted leading-relaxed">{f.body}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* ── FOOTER NAV ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-6 border-t border-ivory-200">
          <Link
            href="/changelog"
            className="flex items-center gap-2 font-ui text-sm text-ink-muted hover:text-aubergine transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All releases
          </Link>
          <p className="font-mono text-[9px] text-ink-muted/50 uppercase tracking-widest">
            {release.features.length} updates · {fmtDate(release.date)}
          </p>
        </div>
      </div>
    </div>
  );
}
