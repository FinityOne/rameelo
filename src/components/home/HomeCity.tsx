"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { EventCard } from "@/components/ui";
import { useNearestMetro } from "@/hooks/useNearestMetro";
import { missedTierNames } from "./missed-tiers";

// ── Shared, geolocation-aware "find garba in your city" experience for the home
// page. One provider owns the user's nearest metro + the selected city; the hero
// bar and the events section both consume it, so picking a city anywhere keeps
// everything in sync. City-first by design: a fan lands, sees their city's events,
// and taps straight through to buy — no detour to a search page.

export type HomeEvent = {
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
  sellingOnRameelo: boolean;
  featured: boolean;
  artistName: string | null;
  tiers: { name: string; price: number; quantity: number; quantitySold: number; soldOut: boolean; saleEndDate: string | null }[];
};

const ALL = "All cities";

function cityKey(e: HomeEvent): string {
  return (e.metroCity || e.city || "Other").trim();
}

// Soonest events first (closest to today), featured as a tiebreaker.
function bySoonest(a: HomeEvent, b: HomeEvent): number {
  return a.startDate.localeCompare(b.startDate) || Number(b.featured) - Number(a.featured);
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type CityOpt = { label: string; state: string | null; count: number; selling: number; earliest: string; isNear: boolean };

type Ctx = {
  events: HomeEvent[];
  status: "pending" | "resolved" | "denied";
  nearCity: string | null;
  selectedCity: string;
  select: (c: string) => void;
  cityOptions: CityOpt[];
};

const CityCtx = createContext<Ctx | null>(null);
export function useCity(): Ctx {
  const c = useContext(CityCtx);
  if (!c) throw new Error("useCity must be used within HomeCityProvider");
  return c;
}

// ── Provider ────────────────────────────────────────────────────────────────
export function HomeCityProvider({ events, children }: { events: HomeEvent[]; children: React.ReactNode }) {
  const loc = useNearestMetro();
  const [selectedCity, setSelectedCity] = useState(ALL);
  const touched = useRef(false);

  const cityOptions = useMemo(() => {
    const m = new Map<string, { state: string | null; count: number; selling: number; earliest: string }>();
    for (const e of events) {
      const k = cityKey(e);
      const cur = m.get(k) ?? { state: e.state || null, count: 0, selling: 0, earliest: e.startDate };
      cur.count += 1;
      if (e.sellingOnRameelo) cur.selling += 1;
      if (!cur.state && e.state) cur.state = e.state;
      if (e.startDate < cur.earliest) cur.earliest = e.startDate;
      m.set(k, cur);
    }
    // Cities ordered by their soonest upcoming event (closest to today first).
    return [...m.entries()]
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => a.earliest.localeCompare(b.earliest) || b.count - a.count || a.label.localeCompare(b.label));
  }, [events]);

  // The user's nearest metro, but only if we actually have events there.
  const nearCity = useMemo(() => {
    if (loc.status !== "resolved") return null;
    const target = loc.metro.city.toLowerCase();
    return cityOptions.find((c) => c.label.toLowerCase() === target)?.label ?? null;
  }, [loc, cityOptions]);

  // Pre-emptively show their city once geolocation resolves — unless they've
  // already picked one themselves.
  useEffect(() => {
    if (!touched.current && nearCity) setSelectedCity(nearCity);
  }, [nearCity]);

  const select = (c: string) => {
    touched.current = true;
    setSelectedCity(c);
  };

  const value: Ctx = {
    events,
    status: loc.status,
    nearCity,
    selectedCity,
    select,
    cityOptions: cityOptions.map((c) => ({ ...c, isNear: c.label === nearCity })),
  };

  return <CityCtx.Provider value={value}>{children}</CityCtx.Provider>;
}

// ── City chips (themed for dark hero or light section) ───────────────────────
function CityChips({ theme, onPick }: { theme: "dark" | "light"; onPick?: (c: string) => void }) {
  const { selectedCity, select, cityOptions, nearCity } = useCity();
  const pick = (c: string) => {
    select(c);
    onPick?.(c);
  };

  // Order: Near-you first (highlighted), then All cities, then the rest.
  const rest = cityOptions.filter((c) => c.label !== nearCity);
  const nearOpt = cityOptions.find((c) => c.label === nearCity) ?? null;

  const base = "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border font-ui text-sm font-semibold transition-all active:scale-95 whitespace-nowrap";
  const styles = (active: boolean, near: boolean) => {
    if (theme === "dark") {
      if (active) return "bg-marigold text-aubergine border-marigold shadow-lg";
      if (near) return "bg-marigold/10 text-marigold border-marigold/40";
      return "bg-white/[0.05] text-white/70 border-white/12 hover:border-white/30 hover:text-white";
    }
    if (active) return "bg-aubergine text-white border-aubergine shadow-md";
    if (near) return "bg-marigold/12 text-marigold-dark border-marigold/45";
    return "bg-white text-ink border-ivory-200 hover:border-aubergine/30";
  };
  const countCls = (active: boolean) =>
    theme === "dark"
      ? active ? "text-aubergine/60" : "text-white/35"
      : active ? "text-white/60" : "text-ink-muted/60";

  const Chip = ({ label, count, near }: { label: string; count: number; near: boolean }) => {
    const active = selectedCity === label;
    return (
      <button onClick={() => pick(label)} className={`${base} ${styles(active, near)}`}>
        {near && <span aria-hidden>📍</span>}
        {label}
        <span className={`font-mono text-[9px] ${countCls(active)}`}>{count}</span>
      </button>
    );
  };

  return (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
      {nearOpt && <Chip label={nearOpt.label} count={nearOpt.count} near />}
      <button
        onClick={() => pick(ALL)}
        className={`${base} ${styles(selectedCity === ALL, false)}`}
      >
        {ALL}
      </button>
      {rest.map((c) => (
        <Chip key={c.label} label={c.label} count={c.count} near={false} />
      ))}
    </div>
  );
}

// ── Hero bar (dark) — compact city picker; chips scroll to the events section ─
export function HeroCityBar() {
  const { status, nearCity } = useCity();
  const scrollToEvents = () =>
    document.getElementById("city-events")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center gap-2 mb-2.5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">Find garba in your city</p>
        {status === "pending" && (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-marigold/70">
            <span className="w-1.5 h-1.5 rounded-full bg-marigold animate-pulse" />
            finding near you…
          </span>
        )}
        {status === "resolved" && nearCity && (
          <span className="font-mono text-[10px] text-marigold/70">📍 {nearCity} is closest to you</span>
        )}
      </div>
      <CityChips theme="dark" onPick={() => setTimeout(scrollToEvents, 70)} />
    </div>
  );
}

// ── Card grid helper ─────────────────────────────────────────────────────────
function EventGrid({ list }: { list: HomeEvent[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {list.map((e) => {
        const total = e.tiers.reduce((s, t) => s + t.quantity, 0);
        const sold = e.tiers.reduce((s, t) => s + t.quantitySold, 0);
        const pct = total > 0 ? Math.round((sold / total) * 100) : 0;
        // A forced sold-out tier reads as fully claimed regardless of real sales.
        const remaining = e.tiers.reduce((s, t) => s + (t.soldOut ? 0 : Math.max(0, t.quantity - t.quantitySold)), 0);
        const allSoldOut = e.tiers.length > 0 && e.tiers.every((t) => t.soldOut || t.quantitySold >= t.quantity);
        const prices = e.tiers.map((t) => t.price);
        const minPrice = prices.length ? Math.min(...prices) : null;
        const maxPrice = prices.length ? Math.max(...prices) : null;
        // Cheapest-tier sell-through (price-rises-next FOMO) + whole days to event.
        const lowTiers = minPrice != null ? e.tiers.filter((t) => t.price === minPrice) : [];
        const lowQty = lowTiers.reduce((s, t) => s + t.quantity, 0);
        const lowSold = lowTiers.reduce((s, t) => s + t.quantitySold, 0);
        const lowTierPctSold = lowTiers.some((t) => t.soldOut) ? 100 : (lowQty > 0 ? Math.round((lowSold / lowQty) * 100) : null);
        const daysUntil = Math.round(
          (new Date(e.startDate + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000
        );
        return (
          <EventCard
            key={e.id}
            title={e.title}
            category={e.category}
            city={e.city}
            state={e.state}
            date={fmtDate(e.startDate)}
            minPrice={minPrice}
            maxPrice={maxPrice}
            sellingOnRameelo={e.sellingOnRameelo}
            soldPct={pct}
            soldOut={allSoldOut}
            soldOutTiers={missedTierNames(e.tiers)}
            ticketsLeft={total > 0 ? remaining : null}
            daysUntil={daysUntil}
            lowTierPctSold={lowTierPctSold}
            coverImageUrl={e.coverImageUrl}
            href={`/events/${e.id}`}
            artistName={e.artistName}
            detailsBelow
          />
        );
      })}
    </div>
  );
}

// A metro header with a "Near you" callout + count.
function MetroHeader({ label, state, count, near, hrefAll }: { label: string; state: string | null; count: number; near: boolean; hrefAll?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {near && (
        <span className="inline-flex items-center gap-1 bg-marigold text-aubergine font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shadow-sm shrink-0">
          📍 Near you
        </span>
      )}
      <h3 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>
        {label}{state ? <span className="text-ink-muted font-ui font-medium text-base">, {state}</span> : null}
      </h3>
      <span className="font-mono text-[10px] text-ink-muted bg-white px-2 py-0.5 rounded-full border border-ivory-200">{count} {count === 1 ? "event" : "events"}</span>
      <div className="h-px flex-1 bg-ink/8" />
      {hrefAll && (
        <Link href={hrefAll} className="font-ui text-xs font-semibold text-aubergine hover:text-aubergine/70 transition-colors shrink-0 hidden sm:inline">
          See all →
        </Link>
      )}
    </div>
  );
}

// ── Events section (light) — the city-grouped showcase ───────────────────────
const PER_METRO = 3;
const MAX_METROS = 4;

export function CityEventsSection() {
  const { events, selectedCity, select, nearCity, cityOptions } = useCity();

  const eventsUrl = (c: string) => (c === ALL ? "/events" : `/events?city=${encodeURIComponent(c)}`);

  // Build the metro groups for the "All cities" view (near-you first).
  const groups = useMemo(() => {
    const map = new Map<string, HomeEvent[]>();
    for (const e of events) {
      const k = cityKey(e);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    const ordered = cityOptions.map((c) => c.label).filter((c) => map.has(c));
    const withNearFirst = nearCity ? [nearCity, ...ordered.filter((c) => c !== nearCity)] : ordered;
    return withNearFirst.map((label) => {
      const opt = cityOptions.find((c) => c.label === label)!;
      return { label, state: opt.state, count: opt.count, isNear: label === nearCity, list: map.get(label)!.slice().sort(bySoonest) };
    });
  }, [events, cityOptions, nearCity]);

  const selected = selectedCity !== ALL ? cityOptions.find((c) => c.label === selectedCity) : null;
  const selectedList = useMemo(
    () => (selected ? events.filter((e) => cityKey(e) === selected.label).sort(bySoonest) : []),
    [events, selected],
  );

  return (
    <section id="city-events" className="bg-ivory-200 py-16 sm:py-20 scroll-mt-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-7">
          <p className="font-mono text-[10px] uppercase tracking-widest text-marigold-dark mb-3">
            {selected ? (selected.isNear ? "Near you" : "Your city") : "Garba across America"}
          </p>
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display font-semibold text-ink" style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.022em", lineHeight: 1.1 }}>
              {selected ? `Garba in ${selected.label}` : "Find events in your city"}
            </h2>
            <Link href="/events" className="font-ui text-sm font-semibold text-ink-muted hover:text-ink hidden sm:flex items-center gap-1 transition-colors shrink-0 mb-1">
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>

        {/* City chips (section-level navigation) */}
        {events.length > 0 && (
          <div className="mb-9">
            <CityChips theme="light" />
          </div>
        )}

        {events.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink/10 p-16 text-center bg-ivory">
            <p className="text-4xl mb-3">🪔</p>
            <p className="font-display font-semibold text-ink text-lg mb-1" style={{ letterSpacing: "-0.015em" }}>Events coming soon</p>
            <p className="font-ui text-sm text-ink-muted mb-4">Organizers are adding garba nights now — check back shortly.</p>
            <Link href="/events" className="font-ui text-sm font-semibold text-aubergine hover:underline">Browse all events →</Link>
          </div>
        ) : selected ? (
          /* ── Single city ── */
          <div>
            <MetroHeader label={selected.label} state={selected.state} count={selected.count} near={selected.isNear} />
            <EventGrid list={selectedList.slice(0, 6)} />
            {selectedList.length > 6 && (
              <div className="mt-7 text-center">
                <Link href={eventsUrl(selected.label)} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-colors">
                  See all {selectedList.length} events in {selected.label} →
                </Link>
              </div>
            )}
            <div className="mt-6 text-center">
              <button onClick={() => select(ALL)} className="font-ui text-sm font-semibold text-ink-muted hover:text-ink transition-colors">← Back to all cities</button>
            </div>
          </div>
        ) : (
          /* ── All cities — grouped by metro, near-you first ── */
          <div className="space-y-12">
            {groups.slice(0, MAX_METROS).map((g) => (
              <div key={g.label}>
                <MetroHeader label={g.label} state={g.state} count={g.count} near={g.isNear} hrefAll={g.count > PER_METRO ? eventsUrl(g.label) : undefined} />
                <EventGrid list={g.list.slice(0, PER_METRO)} />
                {g.count > PER_METRO && (
                  <div className="mt-4 sm:hidden text-center">
                    <button onClick={() => select(g.label)} className="font-ui text-sm font-semibold text-aubergine">See all {g.count} in {g.label} →</button>
                  </div>
                )}
              </div>
            ))}
            <div className="text-center pt-2">
              <Link href="/events" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-ink/15 text-ink font-display font-bold text-sm hover:bg-white transition-all">
                Explore the full calendar
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
