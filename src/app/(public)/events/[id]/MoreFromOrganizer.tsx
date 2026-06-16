"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "@/app/organizer/events/create/types";

// Minimal "more from this organizer" strip at the very bottom of an event detail
// page. Shows ONLY other UPCOMING, published events from the same organization —
// nothing platform-wide. Renders nothing if the org has no other upcoming events,
// so it never competes with the page's primary CTA.

type OrgEvent = {
  id: string; title: string; start_date: string;
  city: string | null; state: string | null; metro_city: string | null;
  cover_image_url: string | null; cover_gradient: string | null;
  artists: { name: string } | { name: string }[] | null;
};

const fmtDay = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function MoreFromOrganizer({ orgId, currentEventId, orgName }: {
  orgId: string | null; currentEventId: string; orgName?: string | null;
}) {
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!orgId) { setLoaded(true); return; }
    let cancelled = false;
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("events")
      .select("id, title, start_date, city, state, metro_city, cover_image_url, cover_gradient, artists(name)")
      .eq("org_id", orgId)
      .eq("status", "published")
      .neq("id", currentEventId)
      .gte("start_date", today)
      .order("start_date", { ascending: true })
      .limit(4)
      .then(({ data }) => { if (!cancelled) { setEvents((data ?? []) as OrgEvent[]); setLoaded(true); } });
    return () => { cancelled = true; };
  }, [orgId, currentEventId]);

  // Nothing to show → render nothing (keeps the page focused on its CTA).
  if (!loaded || events.length === 0) return null;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-2 pb-12">
      <div className="border-t border-ivory-200 pt-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          More from {orgName?.trim() || "this organizer"}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {events.map(e => {
            const artist = Array.isArray(e.artists) ? e.artists[0]?.name : e.artists?.name;
            const gradient = GRADIENTS.find(g => g.id === e.cover_gradient) ?? GRADIENTS[0];
            const loc = e.metro_city?.trim() || [e.city, e.state].filter(Boolean).join(", ");
            return (
              <Link
                key={e.id}
                href={`/events/${e.id}`}
                className="group rounded-xl border border-ivory-200 bg-white overflow-hidden hover:border-aubergine/30 hover:shadow-sm transition-all"
              >
                <div className="h-16 relative" style={{ background: e.cover_image_url ? undefined : gradient.css }}>
                  {e.cover_image_url && <img src={e.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                </div>
                <div className="p-2.5">
                  <p className="font-display font-bold text-ink text-[13px] leading-tight truncate group-hover:text-aubergine transition-colors">{e.title}</p>
                  {artist && <p className="font-ui text-[11px] text-aubergine truncate mt-0.5">{artist}</p>}
                  <p className="font-mono text-[10px] text-ink-muted mt-1 truncate">{fmtDay(e.start_date)}{loc ? ` · ${loc}` : ""}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
