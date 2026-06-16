// Major-metro "destination sticker" shown over the event hero image. The metro
// (e.g. "Los Angeles" for an Irvine venue) is the standout regional cue buyers
// scan for, set per event by admins. Rendered only when a metro is present.

export default function MetroSticker({ metro, className = "" }: {
  metro: string | null | undefined; category?: string; className?: string;
}) {
  if (!metro || !metro.trim()) return null;
  return (
    <div className={`mb-2.5 ${className}`}>
      <span className="inline-flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-2xl bg-marigold text-aubergine shadow-xl shadow-black/25 ring-1 ring-black/5 -rotate-[1.5deg]">
        <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-aubergine/15 shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </span>
        <span className="font-editorial italic font-bold text-xl sm:text-3xl leading-none" style={{ letterSpacing: "-0.01em" }}>{metro}</span>
      </span>
    </div>
  );
}
