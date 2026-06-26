"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "@/app/organizer/events/create/types";
import type { BlogCityFilter } from "@/lib/blog";

// Live, upcoming events matching a city-guide article's metro/state — rendered
// inline so a reader can jump straight from the article into a listing and buy.
// Matching: state in filter.states OR a place term appears in metro_city/city.

type Tier = { price: number; quantity: number; quantity_sold: number; sold_out: boolean };
type EvRow = {
  id: string; title: string; artist: string | null; city: string | null; state: string | null;
  metro_city: string | null; start_date: string; start_time: string | null; venue_name: string | null;
  cover_image_url: string | null; cover_gradient: string | null; selling_on_rameelo: boolean;
  artists: { name: string } | { name: string }[] | null;
  ticket_tiers: Tier[] | null;
};

type EventVM = {
  id: string; title: string; artist: string | null; city: string | null; state: string | null;
  date: string; coverImageUrl: string | null; coverGradient: string; selling: boolean;
  minPrice: number | null; soldOut: boolean;
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function matchesFilter(e: EvRow, f: BlogCityFilter): boolean {
  const st = (e.state ?? "").toUpperCase();
  if (f.states?.some(s => s.toUpperCase() === st)) return true;
  const hay = `${e.metro_city ?? ""} ${e.city ?? ""}`.toLowerCase();
  return !!f.places?.some(p => {
    const pl = p.toLowerCase();
    return hay.includes(pl) || (!!e.city && pl.includes(e.city.toLowerCase()));
  });
}

function coverBg(url: string | null, gradient: string): string {
  if (url) return `linear-gradient(135deg, rgba(20,8,22,0.45) 0%, rgba(20,8,22,0.7) 100%), url(${url}) center/cover no-repeat`;
  const g = GRADIENTS.find(x => x.id === gradient);
  return g?.css ?? "linear-gradient(135deg, #7C1F2C 0%, #B84A22 50%, #F5A623 100%)";
}

export default function BlogCityEvents({ filter }: { filter: BlogCityFilter }) {
  const [events, setEvents] = useState<EventVM[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("events")
        .select("id, title, artist, city, state, metro_city, start_date, start_time, venue_name, cover_image_url, cover_gradient, selling_on_rameelo, artists(name), ticket_tiers(price, quantity, quantity_sold, sold_out)")
        .eq("status", "published")
        .gte("start_date", today)
        .order("start_date", { ascending: true });
      if (cancelled) return;
      const rows = ((data ?? []) as unknown as EvRow[]).filter(e => matchesFilter(e, filter));
      const vms: EventVM[] = rows.map(e => {
        const tiers = e.ticket_tiers ?? [];
        const paid = tiers.map(t => t.price).filter(p => p > 0);
        const artistRec = Array.isArray(e.artists) ? e.artists[0] : e.artists;
        const soldOut = tiers.length > 0 && tiers.every(t => t.sold_out || t.quantity_sold >= t.quantity);
        return {
          id: e.id, title: e.title, artist: artistRec?.name ?? e.artist ?? null,
          city: e.city, state: e.state, date: e.start_date,
          coverImageUrl: e.cover_image_url, coverGradient: e.cover_gradient ?? "aubergine",
          selling: !!e.selling_on_rameelo,
          minPrice: paid.length ? Math.min(...paid) : (tiers.length ? 0 : null),
          soldOut,
        };
      });
      // Buyable first, then soonest.
      vms.sort((a, b) => Number(b.selling) - Number(a.selling) || a.date.localeCompare(b.date));
      setEvents(vms.slice(0, 8));
    })();
    return () => { cancelled = true; };
  }, [filter]);

  // While loading, render nothing (keeps the article clean); after load, always
  // render the section — with a graceful fallback when no events match yet.
  if (events === null) return null;

  return (
    <section className="mt-12 rounded-3xl border border-marigold/25 bg-white overflow-hidden">
      <div className="px-5 sm:px-7 pt-6 pb-4 border-b border-ivory-200" style={{ background: "linear-gradient(135deg, rgba(245,166,35,0.10), rgba(124,31,44,0.06))" }}>
        <p className="font-mono text-[10px] uppercase tracking-widest text-marigold-dark font-bold mb-1">🎟️ Buy tickets now</p>
        <h2 className="font-display font-bold text-ink text-xl sm:text-2xl" style={{ letterSpacing: "-0.02em" }}>
          Upcoming garba events in {filter.label}
        </h2>
        <p className="font-ui text-sm text-ink-muted mt-1">
          {events.length > 0
            ? "Live on Rameelo right now — tap any event to grab your tickets before they sell out."
            : `New ${filter.label} events are added all season. Browse everything live on Rameelo.`}
        </p>
      </div>

      {events.length > 0 ? (
        <div className="divide-y divide-ivory-200">
          {events.map(e => (
            <Link key={e.id} href={`/events/${e.id}`} className="group flex items-center gap-4 px-5 sm:px-7 py-4 hover:bg-ivory/50 transition-colors">
              <div className="w-16 h-16 rounded-xl shrink-0 overflow-hidden" style={{ background: coverBg(e.coverImageUrl, e.coverGradient) }} />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                  {fmtDate(e.date)}{(e.city || e.state) ? ` · ${[e.city, e.state].filter(Boolean).join(", ")}` : ""}
                </p>
                <p className="font-display font-bold text-ink text-base leading-snug truncate group-hover:text-aubergine transition-colors">{e.title}</p>
                {e.artist && <p className="font-ui text-xs text-ink-muted truncate">🎤 {e.artist}</p>}
              </div>
              <div className="text-right shrink-0">
                {e.soldOut ? (
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-ink text-white">Sold out</span>
                ) : (
                  <>
                    {e.minPrice !== null && (
                      <p className="font-display font-bold text-ink text-sm">{e.minPrice === 0 ? "Free" : `From $${e.minPrice}`}</p>
                    )}
                    <span className={`mt-1 inline-flex items-center gap-1 font-ui font-semibold text-xs ${e.selling ? "text-marigold-dark" : "text-aubergine"}`}>
                      {e.selling ? "Get tickets" : "View event"}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                    </span>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="px-5 sm:px-7 py-8 text-center">
          <Link href="/events" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
            Browse all garba events →
          </Link>
        </div>
      )}
    </section>
  );
}
