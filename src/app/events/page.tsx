import Link from "next/link";
import { events } from "@/lib/data";

const categories = ["All", "Garba", "Raas", "Dandiya"];
const states = ["All States", "CA", "GA", "IL", "NY", "TX", "WA"];

export default function EventsPage() {
  return (
    <div className="bg-cream min-h-screen">
      {/* ── Header ── */}
      <section
        className="text-white py-16"
        style={{ background: "linear-gradient(145deg, #6e1a2e 0%, #2e1a47 100%)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-gold text-xs font-bold uppercase tracking-widest mb-3">Navratri 2025</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Find Your Garba</h1>
          <p className="text-white/65 text-base max-w-lg">
            Hundreds of Garba, Raas, and Dandiya events happening across the USA. Find the one near you.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* ── Filters ── */}
        <div className="bg-white border border-cream-dark rounded-xl p-4 mb-8 flex flex-wrap gap-3 items-center shadow-sm">
          <div className="flex-1 min-w-52">
            <input
              type="text"
              placeholder="Search events, cities, organizers…"
              className="w-full border border-cream-dark rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand text-ink placeholder-ink-muted bg-cream transition-colors"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  cat === "All"
                    ? "bg-brand text-white"
                    : "bg-cream-surface text-ink-secondary hover:bg-brand-faint hover:text-brand"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <select className="border border-cream-dark rounded-lg px-3 py-2.5 text-sm text-ink-secondary bg-cream-surface focus:outline-none focus:border-brand cursor-pointer">
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <p className="text-ink-muted text-sm mb-6">
          Showing <span className="font-semibold text-ink">{events.length}</span> events
        </p>

        {/* ── Event Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event) => {
            const pct = Math.round((event.soldTickets / event.totalTickets) * 100);
            const soldOut = event.soldTickets >= event.totalTickets;
            const almostSoldOut = !soldOut && pct >= 85;

            return (
              <div
                key={event.id}
                className="bg-white rounded-2xl overflow-hidden border border-cream-dark hover:border-brand/25 hover:shadow-md transition-all group"
              >
                {/* Card image area */}
                <div
                  className="h-40 relative flex items-end p-4"
                  style={{ background: "linear-gradient(145deg, #6e1a2e 0%, #2e1a47 100%)" }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-[0.08] select-none">
                    🪔
                  </div>
                  <div className="relative flex items-center gap-2">
                    <span className="bg-gold/90 text-ink text-xs font-bold px-2.5 py-1 rounded-md">
                      {event.category}
                    </span>
                    {soldOut && (
                      <span className="bg-white/15 border border-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-md">
                        Sold Out
                      </span>
                    )}
                    {almostSoldOut && (
                      <span className="bg-gold/20 border border-gold/30 text-gold text-xs font-semibold px-2.5 py-1 rounded-md">
                        Almost Gone
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-xs text-ink-muted mb-1">
                    {event.date} · {event.city}, {event.state}
                  </p>
                  <h3 className="font-bold text-ink leading-snug mb-1 tracking-tight">{event.title}</h3>
                  <p className="text-ink-muted text-sm line-clamp-2 mb-3 leading-relaxed">
                    {event.description}
                  </p>

                  <p className="text-xs text-ink-muted mb-3">
                    <span className="text-ink-secondary font-medium">Organized by</span> {event.organizer}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {event.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="bg-accent-faint text-accent text-xs px-2.5 py-0.5 rounded-full font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-ink-muted mb-1.5">
                      <span>{pct}% sold</span>
                      <span>{(event.totalTickets - event.soldTickets).toLocaleString()} remaining</span>
                    </div>
                    <div className="h-1 bg-cream-dark rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: soldOut ? "#8a7a6a" : almostSoldOut ? "#c29f5d" : "#6e1a2e",
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="font-bold text-ink text-lg">${event.price}</span>
                      <span className="text-ink-muted text-sm"> / person</span>
                    </div>
                    <Link
                      href="/tickets"
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        soldOut
                          ? "bg-cream-surface text-ink-muted cursor-not-allowed"
                          : "bg-brand text-white hover:bg-brand-hover"
                      }`}
                    >
                      {soldOut ? "Sold Out" : "Get Tickets"}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <button className="border border-brand text-brand font-semibold px-8 py-3 rounded-lg hover:bg-brand-faint transition-colors text-sm">
            Load More Events
          </button>
        </div>
      </div>
    </div>
  );
}
