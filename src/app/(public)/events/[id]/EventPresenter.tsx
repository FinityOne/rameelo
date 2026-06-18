import Link from "next/link";

// "Organizer presents" credit shown over the event hero — gives the organizing org
// top billing on their own event: their logo (if uploaded) + name + "presents",
// leading straight into the event title below. A glassy dark pill so it reads as an
// official marquee credit and stands apart from the marigold metro sticker. Links to
// the org's public page when it has one.
type PresenterOrg = { id: string; name: string; slug: string | null; logo_url: string | null };

export default function EventPresenter({ org }: { org: PresenterOrg | null | undefined }) {
  if (!org?.name) return null;

  const inner = (
    <span className="group inline-flex items-center gap-3 pl-1.5 pr-4 py-1.5 rounded-2xl bg-black/35 backdrop-blur-md border border-white/15 shadow-lg shadow-black/20 transition-colors hover:bg-black/45 hover:border-white/25">
      {/* Logo / initial */}
      <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shrink-0 ring-1 ring-white/30 bg-white flex items-center justify-center">
        {org.logo_url
          ? <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
          : <span className="font-display font-bold text-aubergine text-lg">{org.name.charAt(0).toUpperCase()}</span>}
      </span>
      {/* Name + presents */}
      <span className="flex flex-col py-0.5 min-w-0">
        <span className="font-display font-bold text-white text-sm sm:text-base leading-tight line-clamp-2 max-w-[68vw] sm:max-w-sm">{org.name}</span>
        <span className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.24em] text-marigold mt-1">presents</span>
      </span>
    </span>
  );

  return (
    <div className="mb-3">
      {org.slug
        ? <Link href={`/org/${org.slug}`} aria-label={`${org.name} — view organizer`}>{inner}</Link>
        : inner}
    </div>
  );
}
