"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { EventCard } from "@/components/ui/EventCard";

type PublicOrg = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  org_type: string | null;
  founded_year: number | null;
  instagram: string | null;
  facebook: string | null;
};

type OrgEvent = {
  id: string;
  title: string;
  category: string;
  artist: string | null;
  city: string;
  state: string;
  metro_city: string | null;
  start_date: string;
  selling_on_rameelo: boolean;
  cover_image_url: string | null;
  artists: { name: string } | null;
  ticket_tiers: { price: number; quantity: number; quantity_sold: number }[];
};

const ORG_TYPE_LABEL: Record<string, string> = {
  nonprofit: "Non-profit",
  business: "Business",
  community: "Community group",
  student: "Student organization",
  individual: "Independent organizer",
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function igHandle(v: string) {
  return v.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
}
function igUrl(v: string) {
  return v.startsWith("http") ? v : `https://instagram.com/${igHandle(v)}`;
}
function normUrl(v: string) {
  return v.startsWith("http") ? v : `https://${v}`;
}

export default function OrgPage() {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg] = useState<PublicOrg | null>(null);
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: orgRows } = await supabase.rpc("get_public_organization", { p_slug: slug });
      const o = (Array.isArray(orgRows) ? orgRows[0] : orgRows) as PublicOrg | undefined;
      if (!o) { setNotFound(true); setLoading(false); return; }
      setOrg(o);
      document.title = `${o.name} | Rameelo`;

      const { data: evData } = await supabase
        .from("events")
        .select("id, title, category, artist, city, state, metro_city, start_date, selling_on_rameelo, cover_image_url, artists (name), ticket_tiers (price, quantity, quantity_sold)")
        .eq("org_id", o.id)
        .eq("status", "published")
        .order("start_date");
      setEvents((evData ?? []) as unknown as OrgEvent[]);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-ivory min-h-screen flex items-center justify-center">
        <div className="w-9 h-9 rounded-full border-4 border-ivory-200 border-t-aubergine animate-spin" />
      </div>
    );
  }

  if (notFound || !org) {
    return (
      <div className="bg-ivory min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="font-display font-bold text-ink text-2xl">Organization not found</p>
        <p className="font-ui text-ink-muted text-sm">This page may have moved or the organization isn&rsquo;t public.</p>
        <Link href="/events" className="px-6 py-3 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">Browse events →</Link>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.start_date >= today);
  const past = events.filter(e => e.start_date < today);
  const location = [org.city, org.state].filter(Boolean).join(", ");

  return (
    <div className="bg-ivory min-h-screen">
      {/* ── Hero ── */}
      <div style={{ background: "linear-gradient(135deg, #2E1B30 0%, #3D2543 100%)" }} className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center bg-white/10 text-white font-display font-bold text-3xl border border-white/15">
              {org.logo_url ? <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" /> : org.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-widest text-marigold/70 mb-1.5">
                {org.org_type ? (ORG_TYPE_LABEL[org.org_type] ?? org.org_type) : "Event organizer"}
              </p>
              <h1 className="font-display font-bold text-white text-3xl sm:text-4xl leading-tight" style={{ letterSpacing: "-0.02em" }}>{org.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                {location && <span className="font-ui text-white/60 text-sm">📍 {location}</span>}
                {org.founded_year && <span className="font-ui text-white/60 text-sm">Est. {org.founded_year}</span>}
              </div>
            </div>
          </div>

          {/* Links */}
          {(org.website || org.instagram || org.facebook) && (
            <div className="flex flex-wrap gap-2 mt-6">
              {org.website && (
                <a href={normUrl(org.website)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-ui font-semibold text-xs hover:bg-white/15 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M3.6 9h16.8M3.6 15h16.8 M12 3a15 15 0 010 18 15 15 0 010-18z" /></svg>
                  Website
                </a>
              )}
              {org.instagram && (
                <a href={igUrl(org.instagram)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-ui font-semibold text-xs hover:bg-white/15 transition-all">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.8 3.8 0 01-1.38-.9 3.8 3.8 0 01-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.2 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.2 8.8 2.2 12 2.2zm0 3.65a6.15 6.15 0 100 12.3 6.15 6.15 0 000-12.3zm0 10.15a4 4 0 110-8 4 4 0 010 8zm6.4-10.4a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z" /></svg>
                  @{igHandle(org.instagram)}
                </a>
              )}
              {org.facebook && (
                <a href={org.facebook.startsWith("http") ? org.facebook : `https://facebook.com/${org.facebook}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-ui font-semibold text-xs hover:bg-white/15 transition-all">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z" /></svg>
                  Facebook
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* About */}
        {org.description && (
          <section>
            <h2 className="font-display font-bold text-ink text-lg mb-3">About {org.name}</h2>
            <p className="font-ui text-ink-muted leading-relaxed text-sm sm:text-base whitespace-pre-line">{org.description}</p>
          </section>
        )}

        {/* Upcoming events */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-ink text-lg">Upcoming events</h2>
            {upcoming.length > 0 && <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">{upcoming.length}</span>}
          </div>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-ivory-200 bg-white px-5 py-8 text-center">
              <p className="font-ui text-sm text-ink-muted">No upcoming events listed right now — check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {upcoming.map(ev => <OrgEventCard key={ev.id} ev={ev} />)}
            </div>
          )}
        </section>

        {/* Past events */}
        {past.length > 0 && (
          <section>
            <h2 className="font-display font-bold text-ink text-lg mb-4">Past events</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {past.map(ev => <OrgEventCard key={ev.id} ev={ev} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function OrgEventCard({ ev }: { ev: OrgEvent }) {
  const prices = (ev.ticket_tiers ?? []).map(t => t.price);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const totalQty = (ev.ticket_tiers ?? []).reduce((s, t) => s + (t.quantity ?? 0), 0);
  const totalSold = (ev.ticket_tiers ?? []).reduce((s, t) => s + (t.quantity_sold ?? 0), 0);
  const soldPct = totalQty > 0 ? Math.round((totalSold / totalQty) * 100) : 0;
  const soldOut = totalQty > 0 && totalSold >= totalQty;
  const artistName = ev.artists?.name ?? ev.artist ?? null;
  return (
    <EventCard
      title={ev.title}
      category={ev.category}
      city={ev.city}
      state={ev.state}
      date={fmtDate(ev.start_date)}
      artistName={artistName}
      metroCity={ev.metro_city}
      detailsBelow
      minPrice={minPrice}
      maxPrice={maxPrice}
      sellingOnRameelo={ev.selling_on_rameelo}
      soldPct={soldPct}
      soldOut={soldOut}
      href={`/events/${ev.id}`}
      coverImageUrl={ev.cover_image_url}
    />
  );
}
