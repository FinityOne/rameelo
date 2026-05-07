import Link from "next/link";
import { Badge } from "./Badge";

interface EventCardProps {
  title: string;
  category: string;
  city: string;
  state: string;
  date: string;
  price: number;
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
  price,
  soldPct,
  soldOut = false,
  isLive = false,
  href = "/tickets",
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
            <span className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>
              ${price}
            </span>
            <span className="text-ink-muted text-xs font-ui"> /ea</span>
          </div>
          <Link
            href={href}
            className={`px-4 py-2 rounded-[10px] text-xs font-ui font-semibold transition-colors ${
              soldOut
                ? "bg-ivory-200 text-ink-muted cursor-not-allowed"
                : "bg-marigold text-aubergine hover:bg-marigold-dark"
            }`}
          >
            {soldOut ? "Sold out" : "Buy tickets"}
          </Link>
        </div>
      </div>
    </div>
  );
}
