// Prominent "when & where" block for the top of the event detail left column.
// Emphasizes the START date (big calendar tile), the start time (not doors), and
// the venue + city/state address with directions. SVG iconography only.

function fmtTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}
const fmtLong = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const fmtShort = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function EventWhenWhere(p: {
  startDate: string;
  startTime: string | null;
  endDate: string | null;
  isMultiDay: boolean;
  venueName: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}) {
  const d = new Date(p.startDate + "T00:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthAbbr = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = d.getDate();
  const startTime = fmtTime(p.startTime);
  const multiDay = p.isMultiDay && p.endDate && p.endDate !== p.startDate;

  const cityState = [p.city, p.state].filter(Boolean).join(", ");
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [p.venueName, p.addressLine1, p.city, p.state, p.zip].filter(Boolean).join(", ")
  )}`;

  return (
    <section className="rounded-2xl bg-white border border-ivory-200 overflow-hidden shadow-sm">
      <div className="flex flex-col sm:flex-row">
        {/* ── WHEN ── */}
        <div className="flex items-center gap-4 p-4 sm:p-5 border-b sm:border-b-0 sm:border-r border-ivory-200 sm:w-1/2">
          {/* Calendar tile — the big date anchor */}
          <div className="shrink-0 w-[60px] rounded-xl overflow-hidden border border-ivory-200 shadow-sm text-center">
            <div className="bg-durga text-white font-mono text-[10px] font-bold uppercase tracking-[0.18em] py-1">{monthAbbr}</div>
            <div className="bg-white py-2">
              <span className="font-display font-bold text-ink leading-none" style={{ fontSize: "30px", letterSpacing: "-0.03em" }}>{day}</span>
            </div>
          </div>
          {/* Date + start time */}
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-durga font-bold">{weekday}</p>
            <p className="font-display font-bold text-ink text-lg leading-tight mt-0.5" style={{ letterSpacing: "-0.015em" }}>{fmtLong(p.startDate)}</p>
            {multiDay && <p className="font-ui text-[11px] text-ink-muted mt-0.5">through {fmtShort(p.endDate!)}</p>}
            <div className="flex items-center gap-1.5 mt-2">
              <svg className="w-4 h-4 text-aubergine shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="font-ui text-sm text-ink-muted">
                {startTime ? <><span className="font-semibold text-ink">{startTime}</span> start</> : "Time TBA"}
              </p>
            </div>
          </div>
        </div>

        {/* ── WHERE ── */}
        <div className="flex items-start gap-3 p-4 sm:p-5 sm:w-1/2">
          <div className="w-9 h-9 rounded-xl bg-aubergine/8 text-aubergine flex items-center justify-center shrink-0">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-ink text-base leading-tight">{p.venueName || "Venue TBA"}</p>
            {p.addressLine1 && <p className="font-ui text-[13px] text-ink-muted mt-0.5 leading-snug">{p.addressLine1}</p>}
            {cityState && <p className="font-ui text-sm font-semibold text-ink mt-0.5">{cityState}{p.zip ? ` ${p.zip}` : ""}</p>}
            <a href={directions} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 font-ui text-xs font-semibold text-aubergine hover:text-aubergine-light">
              Get directions
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
