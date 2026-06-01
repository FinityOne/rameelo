import Link from "next/link";
import { Badge } from "./Badge";

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
  isLive?: boolean;
  href?: string;
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
  isLive = false,
  href = "/events",
}: EventCardProps) {
  return (
    <div className="bg-ivory rounded-[16px] overflow-hidden border border-ivory-200 hover:shadow-md transition-all group">
      {/* Ticket header — gradient */}
      <div
        className="h-40 relative flex flex-col justify-between p-4"
        style={{
          background: isLive
            ? "linear-gradient(145deg, #0E8C7A 0%, #0a4f46 100%)"
            : "linear-gradient(145deg, #2E1B30 0%, #7C1F2C 60%, #F5A623 130%)",
        }}
      >
        <div className="flex items-center justify-between">
          <Badge variant={isLive ? "peacock" : "marigold"} dot={isLive}>
            {isLive ? "Live now" : category}
          </Badge>
          {soldOut && (
            <Badge variant="ivory">Sold out</Badge>
          )}
          {!soldOut && soldPct >= 80 && !isLive && (
            <span className="font-mono text-[10px] text-white/70 tracking-widest uppercase">
              {soldPct}% sold
            </span>
          )}
        </div>

        <div>
          <p className="font-mono text-[10px] text-white/60 tracking-widest uppercase mb-1">
            {date} · {city}, {state}
          </p>
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
        {/* Progress bar */}
        {!soldOut && (
          <div className="mb-3">
            <div className="h-1 bg-ivory-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-marigold transition-all"
                style={{ width: `${soldPct}%` }}
              />
            </div>
          </div>
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
