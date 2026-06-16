import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import EventDetailClient from "./EventDetailClient";
import { eventSchema, breadcrumbSchema, ld } from "@/lib/jsonld";

// Always render fresh — event inventory (ticket quantities) changes in admin and
// must never be served from a stale cache.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("title, description, category, start_date, city, state, metro_city, venue_name, cover_image_url, cover_gradient, artist:artists!events_artist_id_fkey(name)")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!event) {
    return { title: "Event | Rameelo", description: "Find Garba, Dandiya, and Navratri events across the USA." };
  }

  const artistRaw = event.artist as { name: string } | { name: string }[] | null;
  const artistName = Array.isArray(artistRaw) ? (artistRaw[0]?.name ?? null) : (artistRaw?.name ?? null);
  const date = new Date(event.start_date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const category = event.category.charAt(0).toUpperCase() + event.category.slice(1);

  const locationLabel = [event.city, event.state].filter(Boolean).join(", ");
  // Lead the share title with the major metro when set — it's the cue people
  // recognize ("Boston" rather than "Wilmington, MA").
  const titleLocation = event.metro_city?.trim() || locationLabel;
  const title = titleLocation
    ? `${event.title} — ${titleLocation} | Rameelo`
    : `${event.title} | Rameelo`;
  const description = event.description
    ? event.description.slice(0, 155)
    : `${category} event${artistName ? ` with ${artistName}` : ""}${event.venue_name ? ` at ${event.venue_name}` : ""}${locationLabel ? `, ${locationLabel}` : ""} on ${date}. Buy tickets on Rameelo.`;

  // Uploaded banners are arbitrary sizes — don't declare 1200×630 dimensions for
  // them (lying to scrapers makes platforms like Facebook/LinkedIn render a broken
  // or letterboxed preview); let them read the real image. Only the default OG asset
  // is genuinely 1200×630.
  const ogImages = event.cover_image_url
    ? [{ url: event.cover_image_url, alt: event.title }]
    : [{ url: "https://rameelo.com/og-default.jpg", width: 1200, height: 630, alt: `${event.title} — Rameelo` }];

  return {
    title,
    description,
    keywords: [
      event.title,
      `${event.category} event`,
      `${event.category} tickets`,
      ...(event.city ? [`garba ${event.city}`, `navratri ${event.city}`, `${event.category} ${event.city}`] : []),
      ...(event.state ? [`garba ${event.state}`, `navratri ${event.state}`] : []),
      ...(artistName ? [artistName, `${artistName} tickets`, `${artistName} garba`] : []),
      ...(event.metro_city ? [`garba ${event.metro_city}`, `navratri ${event.metro_city}`, `${event.category} ${event.metro_city}`, `garba near ${event.metro_city}`] : []),
      "garba tickets", "navratri tickets", "raas garba usa",
    ],
    alternates: { canonical: `https://rameelo.com/events/${id}` },
    openGraph: {
      title: event.title,
      description,
      images: ogImages,
      type: "article",
      siteName: "Rameelo",
      url: `https://rameelo.com/events/${id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: [ogImages[0].url],
    },
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("title, description, category, start_date, city, state, venue_name, venue_address, cover_image_url, artist:artists!events_artist_id_fkey(name), ticket_tiers(price)")
    .eq("id", id)
    .eq("status", "published")
    .single();

  const artistRaw = event?.artist as { name: string } | { name: string }[] | null | undefined;
  const artistName = artistRaw ? (Array.isArray(artistRaw) ? artistRaw[0]?.name : artistRaw.name) : undefined;
  const prices = ((event?.ticket_tiers ?? []) as { price: number }[]).map(t => t.price).filter(p => p > 0);

  const evSchema = event
    ? eventSchema({
        id,
        name: event.title,
        description: event.description ?? `${event.category} event${event.venue_name ? ` at ${event.venue_name}` : ""}${event.city ? `, ${event.city}` : ""}`,
        startDate: event.start_date,
        city: event.city,
        state: event.state,
        venueName: event.venue_name,
        venueAddress: event.venue_address ?? undefined,
        performerName: artistName,
        imageUrl: event.cover_image_url ?? undefined,
        lowestPrice: prices.length > 0 ? Math.min(...prices) : undefined,
        highestPrice: prices.length > 0 ? Math.max(...prices) : undefined,
        category: event.category,
        keywords: [
          event.title,
          event.category,
          "garba", "navratri", "raas garba",
          ...(event.city ? [event.city] : []),
          ...(event.state ? [event.state] : []),
          ...(artistName ? [artistName] : []),
        ],
      })
    : null;

  const crumbs = breadcrumbSchema([
    { name: "Home", url: "https://rameelo.com" },
    { name: "Events", url: "https://rameelo.com/events" },
    { name: event?.title ?? "Event", url: `https://rameelo.com/events/${id}` },
  ]);

  return (
    <>
      {evSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(evSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbs) }} />
      <EventDetailClient id={id} />
    </>
  );
}
