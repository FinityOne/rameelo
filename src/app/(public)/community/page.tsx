import { communityGroups, testimonials } from "@/lib/data";

const categories = ["All", "Regional", "Beginners", "Organizers", "Cultural"];

export default function CommunityPage() {
  return (
    <div className="bg-cream min-h-screen">
      {/* ── Header ── */}
      <section
        className="text-white py-16"
        style={{ background: "linear-gradient(145deg, #2e1a47 0%, #6e1a2e 100%)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-gold text-xs font-bold uppercase tracking-widest mb-3">Community</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Your Garba Family</h1>
          <p className="text-white/65 text-base max-w-lg mb-7">
            Connect with dancers, organizers, and enthusiasts across the USA. Find your local group or
            join a nationwide community.
          </p>
          <button className="bg-cream text-brand font-bold text-sm px-6 py-3 rounded-lg hover:bg-white transition-colors inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Start a Group
          </button>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ── Category Filters ── */}
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                cat === "All"
                  ? "bg-brand text-white"
                  : "bg-white border border-cream-dark text-ink-secondary hover:border-brand hover:text-brand"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Groups Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {communityGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white border border-cream-dark rounded-2xl p-6 hover:border-brand/30 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: "linear-gradient(135deg, #6e1a2e, #2e1a47)" }}
                >
                  🌸
                </div>
                <span className="bg-accent-faint text-accent text-xs font-semibold px-3 py-1 rounded-full">
                  {group.category}
                </span>
              </div>

              <h3 className="font-bold text-ink text-base mb-1 tracking-tight">{group.name}</h3>
              <p className="text-xs text-ink-muted mb-3 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                {group.city}
              </p>
              <p className="text-ink-secondary text-sm mb-5 line-clamp-2 leading-relaxed">
                {group.description}
              </p>

              <div className="flex items-center justify-between pt-1 border-t border-cream-dark">
                <div>
                  <span className="font-extrabold text-brand text-lg tracking-tight">
                    {group.members.toLocaleString()}
                  </span>
                  <span className="text-ink-muted text-sm"> members</span>
                </div>
                <button className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-hover transition-colors">
                  Join
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Don't see your city ── */}
        <div
          className="rounded-2xl p-8 md:p-12 mb-16 text-center text-white relative overflow-hidden"
          style={{ background: "linear-gradient(145deg, #6e1a2e 0%, #2e1a47 100%)" }}
        >
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: "radial-gradient(circle at 70% 50%, #c29f5d 0%, transparent 60%)",
            }}
          />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
              Don't See Your City?
            </h2>
            <p className="text-white/65 max-w-md mx-auto mb-6 text-sm leading-relaxed">
              Start a Rameelo community group in your area and become the connector your local South Asian
              diaspora needs.
            </p>
            <button className="bg-cream text-brand font-bold px-8 py-3 rounded-lg hover:bg-white transition-colors text-sm">
              Create a Local Group
            </button>
          </div>
        </div>

        {/* ── Testimonials ── */}
        <div>
          <p className="text-gold-dark text-xs font-bold uppercase tracking-widest mb-2">Stories</p>
          <h2 className="text-2xl font-bold text-ink tracking-tight mb-6">From the Community</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="bg-white border border-cream-dark rounded-2xl p-6 hover:shadow-sm transition-all"
              >
                <svg className="w-5 h-5 text-gold/60 mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-ink-secondary italic mb-5 leading-relaxed text-sm">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-cream-dark">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg, #6e1a2e, #2e1a47)" }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-ink text-sm">{t.name}</p>
                    <p className="text-ink-muted text-xs">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
