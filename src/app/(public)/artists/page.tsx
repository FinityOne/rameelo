import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Artist = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  bio: string | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  genres: string[];
  based_in: string | null;
  hometown_city: string | null;
  hometown_state: string | null;
  years_active_since: number | null;
  is_featured: boolean;
  verified: boolean;
};

// Palette cycling for cards without a cover image
const CARD_GRADIENTS = [
  "linear-gradient(135deg, #2E1B30 0%, #7C1F2C 100%)",
  "linear-gradient(135deg, #0E5A52 0%, #0E8C7A 100%)",
  "linear-gradient(135deg, #3D1F1F 0%, #7C1F2C 100%)",
  "linear-gradient(135deg, #1A2A4A 0%, #2E4A8C 100%)",
  "linear-gradient(135deg, #2E1B30 0%, #4a1040 100%)",
  "linear-gradient(135deg, #4a3000 0%, #7C5200 100%)",
];

function ArtistAvatar({ artist }: { artist: Artist }) {
  const initials = artist.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (artist.profile_image_url) {
    return (
      <img
        src={artist.profile_image_url}
        alt={artist.name}
        className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30"
      />
    );
  }
  return (
    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0">
      <span className="font-display font-bold text-white text-2xl" style={{ letterSpacing: "-0.02em" }}>{initials}</span>
    </div>
  );
}

export default async function ArtistsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("artists")
    .select("id, name, slug, tagline, bio, profile_image_url, cover_image_url, genres, based_in, hometown_city, hometown_state, years_active_since, is_featured, verified")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("name");

  const artists: Artist[] = (data ?? []) as Artist[];

  const featuredCount = artists.filter((a) => a.is_featured).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F2" }}>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #2E1B30 0%, #4a1040 40%, #7C1F2C 100%)" }} />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: "#F5A623" }} />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: "#0E8C7A" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 border-2 border-white" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6">
            <span className="w-1.5 h-1.5 bg-marigold rounded-full animate-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-white/70">Navratri Season 2026</span>
          </div>
          <h1 className="font-display font-bold text-white text-5xl sm:text-6xl lg:text-7xl leading-none mb-4" style={{ letterSpacing: "-0.03em" }}>
            The Artists
          </h1>
          <p className="font-ui text-white/60 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            The greatest voices in Garba and Dandiya — from living legends to the generation rewriting the sound.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {[
              { value: String(artists.length), label: "Artists" },
              { value: String(featuredCount), label: "Featured" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display font-bold text-white text-3xl leading-none" style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        {artists.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display font-bold text-ink text-2xl mb-2">No artists yet</p>
            <p className="font-ui text-ink-muted">Check back soon — artists are being added.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6">
            {artists.map((artist, idx) => {
              const location = artist.based_in
                || [artist.hometown_city, artist.hometown_state].filter(Boolean).join(", ");
              const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];

              return (
                <Link
                  key={artist.id}
                  href={`/artists/${artist.slug}`}
                  className="group block rounded-3xl overflow-hidden bg-white border border-ivory-200 hover:border-transparent hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Card header */}
                  <div
                    className="relative h-36 flex items-end p-5 overflow-hidden"
                    style={{
                      background: artist.cover_image_url ? undefined : gradient,
                    }}
                  >
                    {artist.cover_image_url && (
                      <img src={artist.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                    {/* Decorative rings (only when no cover image) */}
                    {!artist.cover_image_url && (
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-3 right-3 w-24 h-24 rounded-full border-2 border-white" />
                        <div className="absolute top-8 right-8 w-12 h-12 rounded-full border border-white" />
                        <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full border-2 border-white" />
                      </div>
                    )}

                    <div className="relative">
                      <ArtistAvatar artist={artist} />
                    </div>

                    {/* Badges */}
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      {artist.verified && (
                        <span className="bg-peacock/80 backdrop-blur-sm text-white font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full">✓ Verified</span>
                      )}
                      {artist.is_featured && (
                        <span className="bg-marigold/90 text-aubergine font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold">Featured</span>
                      )}
                    </div>

                    {/* Arrow on hover */}
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ display: (artist.verified || artist.is_featured) ? 'none' : undefined }}>
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h2 className="font-display font-bold text-ink text-lg leading-tight group-hover:text-aubergine transition-colors" style={{ letterSpacing: "-0.02em" }}>
                        {artist.name}
                      </h2>
                      {artist.tagline && (
                        <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine mt-0.5 truncate">
                          {artist.tagline}
                        </p>
                      )}
                    </div>

                    {/* Bio excerpt */}
                    {artist.bio && (
                      <div className="rounded-xl bg-ivory p-3">
                        <p className="font-ui text-xs text-ink-muted leading-relaxed line-clamp-3">
                          {artist.bio}
                        </p>
                      </div>
                    )}

                    {/* Footer row */}
                    <div className="flex items-center justify-between pt-1">
                      {/* Genres */}
                      <div className="flex flex-wrap gap-1">
                        {(artist.genres ?? []).slice(0, 2).map((g) => (
                          <span key={g} className="font-mono text-[8px] uppercase tracking-widest bg-ivory border border-ivory-200 px-2 py-0.5 rounded-full text-ink-muted">{g}</span>
                        ))}
                        {(artist.genres ?? []).length > 2 && (
                          <span className="font-mono text-[9px] text-ink-muted">+{artist.genres.length - 2}</span>
                        )}
                      </div>

                      {location && (
                        <span className="font-mono text-[9px] uppercase tracking-wide text-ink-muted shrink-0 ml-2 truncate max-w-[100px]">{location}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden" style={{ backgroundColor: "#2E1B30" }}>
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full border-2 border-white -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full border border-white translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative">
            <p className="font-mono text-[11px] uppercase tracking-widest text-white/40 mb-3">Navratri 2026 · Oct 2–12</p>
            <h2 className="font-display font-bold text-white text-3xl sm:text-4xl mb-4" style={{ letterSpacing: "-0.02em" }}>
              See them live this Navratri
            </h2>
            <p className="font-ui text-white/60 max-w-xl mx-auto mb-8">
              Events across 40+ cities. One unforgettable season.
            </p>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-display font-bold text-aubergine text-base hover:opacity-90 transition-all"
              style={{ backgroundColor: "#F5A623" }}
            >
              Browse all events
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
