import Link from "next/link";
import { events } from "@/lib/data";

const myTickets = [
  {
    id: "t1",
    eventTitle: "Navratri Mega Garba 2025",
    date: "Oct 2 – Oct 10, 2025",
    location: "San Jose Convention Center, CA",
    qty: 2,
    total: 70,
    status: "Confirmed",
    confirmationCode: "RML-2025-8849",
  },
  {
    id: "t2",
    eventTitle: "Chicago Navratri Utsav",
    date: "Oct 3 – Oct 11, 2025",
    location: "Rosemont Convention Center, Chicago, IL",
    qty: 4,
    total: 160,
    status: "Confirmed",
    confirmationCode: "RML-2025-3321",
  },
];

export default function TicketsPage() {
  const availableEvents = events.filter((e) => e.soldTickets < e.totalTickets);

  return (
    <div className="bg-cream min-h-screen">
      {/* ── Header ── */}
      <section
        className="text-white py-16"
        style={{ background: "linear-gradient(145deg, #6e1a2e 0%, #4a1238 50%, #2e1a47 100%)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-gold text-xs font-bold uppercase tracking-widest mb-3">Ticketing</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Your Tickets</h1>
          <p className="text-white/65 text-base max-w-lg">
            Manage your tickets, view upcoming events, and purchase passes for the celebrations ahead.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ── Tabs ── */}
        <div className="flex gap-0 bg-white border border-cream-dark rounded-xl p-1 mb-8 w-fit shadow-sm">
          {["My Tickets", "Upcoming", "Past"].map((tab, i) => (
            <button
              key={tab}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                i === 0
                  ? "bg-brand text-white shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── My Tickets ── */}
        <section className="mb-14">
          <h2 className="text-lg font-bold text-ink tracking-tight mb-5">
            Confirmed Tickets
            <span className="ml-2 text-sm font-semibold text-white bg-brand px-2.5 py-0.5 rounded-full">
              {myTickets.length}
            </span>
          </h2>

          <div className="space-y-4">
            {myTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white border border-cream-dark rounded-2xl overflow-hidden flex flex-col md:flex-row hover:shadow-sm transition-all"
              >
                {/* Left brand stripe */}
                <div className="w-full md:w-1.5 shrink-0" style={{ background: "linear-gradient(to bottom, #6e1a2e, #2e1a47)" }} />

                <div className="p-6 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full border border-green-100">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {ticket.status}
                        </span>
                        <span className="text-ink-muted text-xs font-mono">{ticket.confirmationCode}</span>
                      </div>
                      <h3 className="font-bold text-ink text-lg tracking-tight mb-1">{ticket.eventTitle}</h3>
                      <p className="text-ink-muted text-sm">
                        {ticket.date} · {ticket.location}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-3xl font-extrabold text-ink tracking-tight">${ticket.total}</p>
                      <p className="text-ink-muted text-sm">{ticket.qty} tickets</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 mt-5 pt-5 border-t border-cream-dark">
                    <button className="bg-brand text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-brand-hover transition-colors">
                      View Ticket
                    </button>
                    <button className="border border-cream-dark text-ink-secondary text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-cream-surface transition-colors">
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Browse More ── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-ink tracking-tight">Get More Tickets</h2>
            <Link
              href="/events"
              className="text-brand text-sm font-semibold hover:text-brand-hover transition-colors flex items-center gap-1"
            >
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {availableEvents.slice(0, 3).map((event) => {
              const pct = Math.round((event.soldTickets / event.totalTickets) * 100);
              return (
                <div
                  key={event.id}
                  className="bg-white border border-cream-dark rounded-2xl p-5 hover:border-brand/25 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: "linear-gradient(135deg, #6e1a2e, #2e1a47)" }}
                    >
                      🪔
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="bg-gold-faint text-gold-dark text-xs font-bold px-2.5 py-0.5 rounded-full">
                        {event.category}
                      </span>
                      <h3 className="font-bold text-ink mt-1 leading-snug line-clamp-1 tracking-tight text-sm">
                        {event.title}
                      </h3>
                      <p className="text-ink-muted text-xs mt-0.5">
                        {event.date} · {event.city}, {event.state}
                      </p>
                    </div>
                  </div>

                  <div className="h-1 bg-cream-dark rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-brand rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-ink text-lg">${event.price}</span>
                      <span className="text-ink-muted text-sm"> / person</span>
                    </div>
                    <button className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-hover transition-colors">
                      Buy Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Help Banner ── */}
        <div className="bg-white border border-cream-dark rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #6e1a2e20, #2e1a4715)" }}
            >
              <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-ink text-base">Need help with your tickets?</h3>
              <p className="text-ink-muted text-sm mt-0.5">
                Our support team handles refunds, transfers, and any questions.
              </p>
            </div>
          </div>
          <button className="shrink-0 border border-brand text-brand font-semibold px-6 py-3 rounded-lg hover:bg-brand-faint transition-colors text-sm">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
