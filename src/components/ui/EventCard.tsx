import Link from "next/link";
import { Badge } from "./Badge";

// ── Ticket urgency ────────────────────────────────────────────────────────────
// A near-empty progress bar signals "nobody's buying" and suppresses conversion,
// so below ~75% sold we hide the bar and surface a positive momentum / scarcity /
// deadline cue instead. Every signal is derived from real data (inventory + event
// date); copy stays vague (never reveals exact stock counts) and is only as loud
// as the evidence supports.
type Urgency = { tone: "hot" | "warn" | "soft" | "new"; icon: string; text: string };

const URGENCY_TONES: Record<Urgency["tone"], string> = {
  hot:  "bg-durga/8 text-durga border border-durga/20",
  warn: "bg-marigold/15 text-marigold-dark border border-marigold/30",
  soft: "bg-peacock/10 text-peacock border border-peacock/20",
  new:  "bg-aubergine/8 text-aubergine border border-aubergine/15",
};

function ticketUrgency(a: {
  sellingOnRameelo: boolean;
  soldPct: number;
  ticketsLeft: number | null;
  daysUntil: number | null;
  lowTierPctSold: number | null;
}): Urgency | null {
  if (!a.sellingOnRameelo) return { tone: "new", icon: "✨", text: "Early access open" };

  // Hard scarcity — kept vague, never prints the remaining number.
  if (a.soldPct >= 90 || (a.ticketsLeft != null && a.ticketsLeft > 0 && a.ticketsLeft <= 10))
    return { tone: "hot", icon: "🔥", text: "Almost gone" };
  if (a.soldPct >= 75) return { tone: "hot", icon: "🔥", text: "Selling fast" };

  // Price-tier FOMO — the cheapest tier is running out, so the price rises next.
  if (a.lowTierPctSold != null && a.lowTierPctSold >= 75)
    return { tone: "warn", icon: "⏳", text: "Lowest price almost gone" };

  // Deadline urgency.
  if (a.daysUntil != null && a.daysUntil >= 0) {
    if (a.daysUntil === 0) return { tone: "hot", icon: "🔥", text: "Happening today" };
    if (a.daysUntil === 1) return { tone: "hot", icon: "🔥", text: "Tomorrow" };
    if (a.daysUntil <= 6)  return { tone: "hot", icon: "🔥", text: `In ${a.daysUntil} days` };
    if (a.daysUntil <= 21) return { tone: "warn", icon: "⏳", text: `${a.daysUntil} days left` };
  }

  // Momentum — only claimed with genuine traction (balanced, not manufactured).
  if (a.soldPct >= 30) return { tone: "hot", icon: "🔥", text: "Selling fast" };
  if (a.soldPct > 0)   return { tone: "soft", icon: "📈", text: "Selling now" };

  // No sales yet → frame as novelty, not emptiness.
  return { tone: "new", icon: "✨", text: "Just announced" };
}

function UrgencyPill({ u }: { u: Urgency }) {
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${URGENCY_TONES[u.tone]}`}>
      <span aria-hidden className="text-[10px] leading-none">{u.icon}</span>
      {u.text}
    </span>
  );
}

interface EventCardProps {
  title: string;
  category: string;
  city: string;
  state: string;
  date: string;
  /** Lowest ticket price; `null` when no tiers are listed yet (Tickets TBA). */
  minPrice: number | null;
  /** Highest ticket price; used to show a "From $x – $y" range. */
  maxPrice?: number | null;
  /** Whether tickets are actually sold on Rameelo (vs. listed for interest). */
  sellingOnRameelo?: boolean;
  soldPct: number;
  soldOut?: boolean;
  /** Tickets remaining — used (silently, never shown) to detect hard scarcity. */
  ticketsLeft?: number | null;
  /** Whole days until the event — drives the deadline urgency pill. */
  daysUntil?: number | null;
  /** % sold of the cheapest tier — drives the "lowest price almost gone" pill. */
  lowTierPctSold?: number | null;
  isLive?: boolean;
  href?: string;
  /** Event cover photo; shown when uploaded, otherwise the gradient fallback. */
  coverImageUrl?: string | null;
  /** Headlining artist/performer — shown when provided (e.g. on org pages). */
  artistName?: string | null;
  /** Nearest major metro — shown as a standout pill on the banner when provided. */
  metroCity?: string | null;
  /** Render date/location in the white body instead of over the image, for
   *  readability. Defaults to the overlay layout so existing cards are unchanged. */
  detailsBelow?: boolean;
}

export function EventCard({
  title,
  category,
  city,
  state,
  date,
  minPrice,
  maxPrice = null,
  sellingOnRameelo = true,
  soldPct,
  soldOut = false,
  ticketsLeft = null,
  daysUntil = null,
  lowTierPctSold = null,
  isLive = false,
  href = "/events",
  coverImageUrl = null,
  artistName = null,
  metroCity = null,
  detailsBelow = false,
}: EventCardProps) {
  // Below 75% sold the bar is replaced by this cue (see ticketUrgency).
  const urgency = soldOut ? null : ticketUrgency({ sellingOnRameelo, soldPct, ticketsLeft, daysUntil, lowTierPctSold });
  return (
    <div className="bg-ivory rounded-[16px] overflow-hidden border border-ivory-200 hover:shadow-md transition-all group">
      {/* Ticket header — cover photo if uploaded, else gradient */}
      <div
        className="h-40 relative flex flex-col justify-between p-4 overflow-hidden"
        style={{
          background: isLive
            ? "linear-gradient(145deg, #0E8C7A 0%, #0a4f46 100%)"
            : "linear-gradient(145deg, #2E1B30 0%, #7C1F2C 60%, #F5A623 130%)",
        }}
      >
        {coverImageUrl && (
          <>
            <img
              src={coverImageUrl}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
            {/* Readability scrim — darkest at the bottom where the title sits */}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.45) 100%)" }}
            />
          </>
        )}
        <div className="relative z-10 flex items-center justify-between">
          <Badge variant={isLive ? "peacock" : "marigold"} dot={isLive}>
            {isLive ? "Live now" : category}
          </Badge>
          {soldOut && (
            <Badge variant="ivory">Sold out</Badge>
          )}
        </div>

        <div className="relative z-10">
          {metroCity && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 bg-marigold text-aubergine font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shadow-md">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {metroCity}
              </span>
            </div>
          )}
          {!detailsBelow && (
            <p className="font-mono text-[10px] text-white/70 tracking-widest uppercase mb-1">
              {date} · {city}, {state}
            </p>
          )}
          <h3
            className="font-display font-semibold text-white text-lg leading-tight line-clamp-2"
            style={{ letterSpacing: "-0.015em" }}
          >
            {title}
          </h3>
        </div>

        {/* Ticket perforation dots */}
        <div className="absolute -bottom-0 left-0 right-0 flex justify-between px-3">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-ivory opacity-0 group-hover:opacity-0" />
          ))}
        </div>
      </div>

      {/* Ticket perforation line */}
      <div className="border-t border-dashed border-ivory-200 mx-4" />

      <div className="p-4 pt-3">
        {/* Event details in the readable white area (artist + date/location) */}
        {detailsBelow && (
          <div className="mb-3 space-y-1.5">
            {artistName && (
              <p className="flex items-center gap-1.5 font-ui text-[13px] font-semibold text-aubergine truncate">
                <svg className="w-3.5 h-3.5 shrink-0 text-marigold-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                {artistName}
              </p>
            )}
            <p className="flex items-center gap-1.5 font-ui text-xs text-ink-muted">
              <svg className="w-3.5 h-3.5 shrink-0 text-ink-muted/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="truncate">{date}</span>
            </p>
            <p className="flex items-center gap-1.5 font-ui text-xs text-ink-muted">
              <svg className="w-3.5 h-3.5 shrink-0 text-ink-muted/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="truncate">{[city, state].filter(Boolean).join(", ")}</span>
            </p>
          </div>
        )}

        {/* Urgency: the bar earns its place only when genuinely filling up (≥75%);
            below that a momentum/scarcity/deadline pill replaces the discouraging
            near-empty bar. */}
        {urgency && (
          soldPct >= 75 ? (
            <div className="mb-3 space-y-1.5">
              <UrgencyPill u={urgency} />
              <div className="h-1 bg-ivory-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-marigold transition-all" style={{ width: `${soldPct}%` }} />
              </div>
            </div>
          ) : (
            <div className="mb-3"><UrgencyPill u={urgency} /></div>
          )
        )}

        <div className="flex items-center justify-between">
          <div>
            {minPrice === null ? (
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Tickets TBA</span>
            ) : minPrice === 0 ? (
              <span className="font-display font-bold text-peacock text-xl" style={{ letterSpacing: "-0.02em" }}>
                Complimentary
              </span>
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>
                  From ${minPrice}
                </span>
                {maxPrice !== null && maxPrice > minPrice && (
                  <span className="text-ink-muted text-xs font-ui">– ${maxPrice}</span>
                )}
                {!sellingOnRameelo && (
                  <span className="font-mono text-[8px] uppercase tracking-widest bg-marigold/20 text-marigold-dark px-1.5 py-0.5 rounded-full">Soon</span>
                )}
              </div>
            )}
          </div>
          <Link
            href={href}
            className={`px-4 py-2 rounded-[10px] text-xs font-ui font-semibold transition-colors ${
              soldOut
                ? "bg-ivory-200 text-ink-muted cursor-not-allowed"
                : "bg-marigold text-aubergine hover:bg-marigold-dark"
            }`}
          >
            {soldOut ? "Sold out" : sellingOnRameelo ? "Get tickets" : "Get early access"}
          </Link>
        </div>
      </div>
    </div>
  );
}
