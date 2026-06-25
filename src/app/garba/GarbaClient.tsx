"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { GRADIENTS } from "@/app/organizer/events/create/types";
import { SoldOutTierTags } from "@/components/ui";
import { missedTierNames } from "@/components/home/missed-tiers";

// ── Types ───────────────────────────────────────────────────────────────────
export type GarbaEvent = {
  id: string;
  title: string;
  category: string;
  city: string;
  state: string;
  metroCity: string | null;
  startDate: string;
  startTime: string;
  venueName: string;
  coverImageUrl: string | null;
  coverGradient: string;
  sellingOnRameelo: boolean;
  featured: boolean;
  artistName: string | null;
  tiers: { name: string; price: number; quantity: number; quantitySold: number; soldOut: boolean; saleEndDate: string | null }[];
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function coverBackground(url: string | null, gradient: string): string {
  if (url) return `linear-gradient(180deg, rgba(20,8,22,0.05) 0%, rgba(20,8,22,0.78) 100%), url(${url}) center/cover no-repeat`;
  const g = GRADIENTS.find((x) => x.id === gradient);
  return g?.css ?? "linear-gradient(135deg, #7C1F2C 0%, #B84A22 50%, #F5A623 100%)";
}

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return "";
  return `${h % 12 || 12}:${String(m ?? 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function priceLabel(e: GarbaEvent): string {
  const paid = e.tiers.filter((t) => t.price > 0).map((t) => t.price);
  if (paid.length > 0) return `From $${Math.min(...paid)}`;
  if (e.tiers.length > 0) return "Free entry";
  return "Tickets TBA";
}

function availability(e: GarbaEvent): { label: string; cls: string } | null {
  if (!e.sellingOnRameelo || e.tiers.length === 0) return null;
  // A tier the organizer force-closed counts as fully sold regardless of inventory.
  const allSoldOut = e.tiers.every((t) => t.soldOut || t.quantitySold >= t.quantity);
  if (allSoldOut) return { label: "Sold out", cls: "bg-durga/25 text-red-200 border-durga/40" };
  const total = e.tiers.reduce((s, t) => s + t.quantity, 0);
  const sold = e.tiers.reduce((s, t) => s + (t.soldOut ? t.quantity : t.quantitySold), 0);
  const pct = total > 0 ? sold / total : 0;
  if (pct >= 1) return { label: "Sold out", cls: "bg-durga/25 text-red-200 border-durga/40" };
  if (pct >= 0.9) return { label: "Almost gone", cls: "bg-durga/20 text-red-200 border-durga/40" };
  if (pct >= 0.7) return { label: "Filling fast", cls: "bg-orange-500/15 text-orange-200 border-orange-400/30" };
  return { label: "On sale", cls: "bg-marigold/15 text-marigold border-marigold/30" };
}

function cityKey(e: GarbaEvent): string {
  return (e.metroCity || e.city || "Other").trim();
}

// Ordering applied inside every list: events selling on Rameelo first, then
// featured, then soonest — so buyable events always lead.
function byPriority(a: GarbaEvent, b: GarbaEvent): number {
  return (
    Number(b.sellingOnRameelo) - Number(a.sellingOnRameelo) ||
    Number(b.featured) - Number(a.featured) ||
    a.startDate.localeCompare(b.startDate)
  );
}

// ── Featured carousel card ──────────────────────────────────────────────────
function FeaturedCard({ e }: { e: GarbaEvent }) {
  const avail = availability(e);
  const place = [e.city, e.state].filter(Boolean).join(", ");
  return (
    <Link
      href={`/events/${e.id}`}
      className="group relative shrink-0 w-[82vw] max-w-[340px] snap-center rounded-3xl overflow-hidden border border-white/12 shadow-2xl active:scale-[0.98] transition-transform"
      style={{ scrollSnapAlign: "center" }}
    >
      <div className="aspect-[4/5]" style={{ background: coverBackground(e.coverImageUrl, e.coverGradient) }} />
      {/* Top tags + sold-out tier tags ("you missed the Early Bird / VIP" FOMO) */}
      <div className="absolute top-3 left-3 right-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-marigold text-aubergine shadow-lg">★ Featured</span>
          {avail && <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${avail.cls}`}>{avail.label}</span>}
        </div>
        <SoldOutTierTags names={missedTierNames(e.tiers)} />
      </div>
      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-marigold/90 mb-1.5">{fmtDate(e.startDate)}{fmtTime(e.startTime) ? ` · ${fmtTime(e.startTime)}` : ""}</p>
        <p className="font-display font-bold text-white text-xl leading-tight mb-1" style={{ letterSpacing: "-0.02em" }}>{e.title}</p>
        {e.artistName && <p className="font-ui text-white/70 text-xs mb-0.5">🎤 {e.artistName}</p>}
        <p className="font-ui text-white/60 text-xs">📍 {e.venueName ? `${e.venueName} · ` : ""}{place}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-display font-bold text-white text-sm">{priceLabel(e)}</span>
          <span className="inline-flex items-center gap-1 font-display font-bold text-sm text-aubergine bg-marigold px-3.5 py-2 rounded-xl group-hover:bg-marigold-dark transition-colors">
            {e.sellingOnRameelo ? "Get tickets" : "View event"}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Compact list card ───────────────────────────────────────────────────────
function EventCard({ e, i }: { e: GarbaEvent; i: number }) {
  const avail = availability(e);
  const place = [e.city, e.state].filter(Boolean).join(", ");
  return (
    <Link
      href={`/events/${e.id}`}
      className="tour-rise group flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:border-white/20 active:scale-[0.99] transition-all"
      style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
    >
      {/* Thumb */}
      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0" style={{ background: coverBackground(e.coverImageUrl, e.coverGradient) }}>
        {e.featured && <span className="absolute top-1 left-1 text-[10px]">★</span>}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: e.coverImageUrl ? "transparent" : "rgba(0,0,0,0.15)" }}>
          <span className="font-mono text-[8px] uppercase tracking-wide text-white/80 leading-none">{new Date(e.startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}</span>
          <span className="font-display font-bold text-white text-lg leading-tight">{new Date(e.startDate + "T00:00:00").getDate()}</span>
        </div>
      </div>
      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-white text-[15px] leading-tight truncate" style={{ letterSpacing: "-0.01em" }}>{e.title}</p>
        <p className="font-ui text-white/55 text-xs mt-0.5 truncate">{fmtDate(e.startDate)} · {e.venueName || place}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-display font-bold text-marigold text-xs">{priceLabel(e)}</span>
          {avail && <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${avail.cls}`}>{avail.label}</span>}
        </div>
        {/* Sold-out tier tags — the "you missed the Early Bird" gut-punch. */}
        <SoldOutTierTags names={missedTierNames(e.tiers)} className="mt-1.5" />
      </div>
      {/* Chevron */}
      <svg className="w-4 h-4 text-white/30 group-hover:text-marigold shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
    </Link>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function GarbaClient({ events }: { events: GarbaEvent[] }) {
  const [activeCity, setActiveCity] = useState<string>("All");

  // City navigator data. Cities actively selling tickets on Rameelo lead the
  // navigator (ranked by how many events are on sale); cities whose events
  // aren't selling here yet are delineated after them under "Tickets soon" — so
  // a fan always lands on a buyable city first.
  const { sellingCities, soonCities, cityOrder, sellingSet } = useMemo(() => {
    const m = new Map<string, { total: number; selling: number }>();
    for (const e of events) {
      const k = cityKey(e);
      const cur = m.get(k) ?? { total: 0, selling: 0 };
      cur.total += 1;
      if (e.sellingOnRameelo) cur.selling += 1;
      m.set(k, cur);
    }
    const all = [...m.entries()].map(([city, s]) => ({ city, ...s }));
    const sellingCities = all
      .filter((c) => c.selling > 0)
      .sort((a, b) => b.selling - a.selling || b.total - a.total || a.city.localeCompare(b.city));
    const soonCities = all
      .filter((c) => c.selling === 0)
      .sort((a, b) => b.total - a.total || a.city.localeCompare(b.city));
    return {
      sellingCities,
      soonCities,
      cityOrder: [...sellingCities, ...soonCities].map((c) => c.city),
      sellingSet: new Set(sellingCities.map((c) => c.city)),
    };
  }, [events]);

  const totalCities = sellingCities.length + soonCities.length;

  const featured = useMemo(() => events.filter((e) => e.featured).slice(0, 6), [events]);

  const visible = useMemo(
    () =>
      (activeCity === "All" ? events : events.filter((e) => cityKey(e) === activeCity))
        .slice()
        .sort(byPriority),
    [events, activeCity],
  );

  // All-cities view: group under city headers, selling cities first.
  const grouped = useMemo(() => {
    if (activeCity !== "All") return null;
    const map = new Map<string, GarbaEvent[]>();
    for (const e of visible) {
      const k = cityKey(e);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return cityOrder
      .filter((c) => map.has(c))
      .map((c) => [c, map.get(c)!] as [string, GarbaEvent[]]);
  }, [visible, activeCity, cityOrder]);

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: "#2E1B30" }}>
      {/* Keyframes for entrance + ambient shimmer */}
      <style>{`
        @keyframes tourRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .tour-rise { animation: tourRise .5s cubic-bezier(.16,.84,.44,1) both; }
        .tour-scroll::-webkit-scrollbar { display: none; }
        .tour-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Ambient glows + dot grid (matches the homepage hero language) */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 85% 0%, rgba(245,166,35,0.16) 0%, transparent 45%)" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 0% 30%, rgba(124,31,44,0.5) 0%, transparent 50%)" }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />

      <div className="relative max-w-md mx-auto px-5 pt-10 pb-16">
        {/* ── Identity ── */}
        <div className="text-center mb-7 tour-rise">
          <div className="flex justify-center mb-6">
            <Logo variant="white" height={32} />
          </div>
          <h1 className="font-display font-black text-white text-[26px] leading-[1.05] mb-2" style={{ letterSpacing: "-0.03em" }}>
            Every garba. <span className="font-editorial italic font-medium" style={{ color: "#F5A623" }}>Every city.</span>
          </h1>
          <p className="font-ui text-white/55 text-sm max-w-[18rem] mx-auto leading-relaxed">
            You&rsquo;re one tap from the biggest Raas Garba &amp; Navratri nights in America. Pick your city and grab tickets instantly.
          </p>
          {/* Live stat pill */}
          <div className="inline-flex items-center gap-2 mt-4 border border-white/12 rounded-full px-3.5 py-1.5 bg-white/[0.05]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marigold opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-marigold" />
            </span>
            <span className="font-mono text-[10px] text-white/55 tracking-wider uppercase">{events.length} live events · {totalCities} cities</span>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 tour-rise">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-3xl mb-4">🪔</div>
            <p className="font-display font-bold text-white text-lg mb-1">New nights dropping soon</p>
            <p className="font-ui text-white/50 text-sm mb-5">We&rsquo;re lining up the next round of garba events.</p>
            <Link href="/events" className="inline-block px-5 py-3 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm">Browse all events →</Link>
          </div>
        ) : (
          <>
            {/* ── City navigator (sticky — always reachable while scrolling) ── */}
            <div className="sticky top-0 z-20 -mx-5 px-5 pt-2.5 pb-3 mb-6 bg-[#2E1B30]/85 backdrop-blur-md border-b border-white/10">
              <div className="flex items-center justify-between mb-2 px-0.5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/40">Pick your city</p>
                {activeCity !== "All" && (
                  <button onClick={() => setActiveCity("All")} className="font-ui text-[11px] font-semibold text-marigold hover:text-marigold-dark transition-colors">Clear ✕</button>
                )}
              </div>
              <div className="tour-scroll flex items-center gap-2 overflow-x-auto pb-0.5 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                <CityChip label="All cities" count={events.length} active={activeCity === "All"} onClick={() => setActiveCity("All")} />
                {sellingCities.map((c) => (
                  <CityChip key={c.city} label={c.city} count={c.total} active={activeCity === c.city} onClick={() => setActiveCity(c.city)} />
                ))}
                {soonCities.length > 0 && (
                  <div className="shrink-0 flex items-center gap-2 pl-1.5 pr-0.5" aria-hidden="true">
                    <div className="w-px h-5 bg-white/15" />
                    <span className="font-mono text-[8px] uppercase tracking-widest text-white/30 whitespace-nowrap">Tickets soon</span>
                  </div>
                )}
                {soonCities.map((c) => (
                  <CityChip key={c.city} label={c.city} count={c.total} active={activeCity === c.city} dim onClick={() => setActiveCity(c.city)} />
                ))}
              </div>
            </div>

            {/* ── Featured carousel (all-cities view only) ── */}
            {activeCity === "All" && featured.length > 0 && (
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-3 px-0.5">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-marigold">★ Featured this season</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <div className="tour-scroll flex gap-3 overflow-x-auto -mx-5 px-5 pb-2 snap-x snap-mandatory">
                  {featured.map((e) => <FeaturedCard key={e.id} e={e} />)}
                </div>
              </div>
            )}

            {/* ── Event list ── */}
            {grouped ? (
              <div className="space-y-7">
                {grouped.map(([city, list]) => (
                  <div key={city}>
                    <div className="flex items-center gap-2.5 mb-3 px-0.5">
                      <h2 className="font-display font-bold text-white text-base" style={{ letterSpacing: "-0.01em" }}>{city}</h2>
                      <span className="font-mono text-[9px] text-white/40 bg-white/8 px-2 py-0.5 rounded-full">{list.length} {list.length === 1 ? "event" : "events"}</span>
                      {!sellingSet.has(city) && <span className="font-mono text-[8px] uppercase tracking-widest text-white/35 border border-white/12 px-1.5 py-0.5 rounded-full">Tickets soon</span>}
                      <div className="h-px flex-1 bg-white/8" />
                    </div>
                    <div className="space-y-2.5">
                      {list.map((e, i) => <EventCard key={e.id} e={e} i={i} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2.5 mb-3 px-0.5">
                  <h2 className="font-display font-bold text-white text-base" style={{ letterSpacing: "-0.01em" }}>{activeCity}</h2>
                  <span className="font-mono text-[9px] text-white/40 bg-white/8 px-2 py-0.5 rounded-full">{visible.length} {visible.length === 1 ? "event" : "events"}</span>
                  {!sellingSet.has(activeCity) && <span className="font-mono text-[8px] uppercase tracking-widest text-white/35 border border-white/12 px-1.5 py-0.5 rounded-full">Tickets soon</span>}
                  <button onClick={() => setActiveCity("All")} className="ml-auto font-ui text-xs text-marigold hover:text-marigold-dark transition-colors">← All cities</button>
                </div>
                <div className="space-y-2.5">
                  {visible.map((e, i) => <EventCard key={e.id} e={e} i={i} />)}
                </div>
              </div>
            )}

            {/* ── Browse-all CTA ── */}
            <Link href="/events" className="mt-8 flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border border-white/15 text-white font-display font-bold text-sm hover:bg-white/5 transition-all">
              Browse the full calendar
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </>
        )}

        {/* ── Footer ── */}
        <div className="mt-12 pt-6 border-t border-white/8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <a href="https://instagram.com/rameelo" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-marigold transition-colors" aria-label="Instagram">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.3.07 1.69.07 4.9s0 3.6-.07 4.9c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 01-.9 1.38c-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.3.06-1.69.07-4.9.07s-3.6 0-4.9-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 01-1.38-.9 3.7 3.7 0 01-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.15 0-3.5 0-4.74.07-.9.04-1.39.2-1.71.32-.43.17-.74.37-1.06.7-.32.31-.52.62-.69 1.05-.12.32-.28.81-.32 1.71C3.4 8.5 3.4 8.85 3.4 12s0 3.5.07 4.74c.04.9.2 1.39.32 1.71.17.43.37.74.7 1.06.31.32.62.52 1.05.69.32.12.81.28 1.71.32 1.24.07 1.59.07 4.74.07s3.5 0 4.74-.07c.9-.04 1.39-.2 1.71-.32.43-.17.74-.37 1.06-.7.32-.31.52-.62.69-1.05.12-.32.28-.81.32-1.71.07-1.24.07-1.59.07-4.74s0-3.5-.07-4.74c-.04-.9-.2-1.39-.32-1.71a2.8 2.8 0 00-.7-1.06 2.8 2.8 0 00-1.05-.69c-.32-.12-.81-.28-1.71-.32C15.5 4 15.15 4 12 4zm0 3.06A4.94 4.94 0 1012 17a4.94 4.94 0 000-9.88zm0 8.14A3.2 3.2 0 1112 8.8a3.2 3.2 0 010 6.4zm6.3-8.34a1.15 1.15 0 11-2.3 0 1.15 1.15 0 012.3 0z" /></svg>
            </a>
            <Link href="/organizers" className="font-ui text-xs text-white/40 hover:text-white/70 transition-colors">List your event</Link>
            <Link href="/about" className="font-ui text-xs text-white/40 hover:text-white/70 transition-colors">About</Link>
          </div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-white/30">Rameelo · The home for Raas Garba in America</p>
        </div>
      </div>
    </div>
  );
}

// ── City chip ───────────────────────────────────────────────────────────────
function CityChip({ label, count, active, dim, onClick }: { label: string; count: number; active: boolean; dim?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border font-ui text-sm font-semibold transition-all active:scale-95 ${
        active
          ? "bg-marigold text-aubergine border-marigold shadow-lg"
          : dim
          ? "bg-white/[0.02] text-white/45 border-white/8 hover:border-white/20 hover:text-white/75"
          : "bg-white/[0.05] text-white/70 border-white/12 hover:border-white/30 hover:text-white"
      }`}
    >
      {label}
      <span className={`font-mono text-[9px] ${active ? "text-aubergine/60" : "text-white/35"}`}>{count}</span>
    </button>
  );
}
