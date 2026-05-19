import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import EventDetailClient from "./EventDetailClient";
import { eventSchema, breadcrumbSchema, ld } from "@/lib/jsonld";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("title, description, category, start_date, city, state, venue_name, cover_image_url, cover_gradient, artist:artists!events_artist_id_fkey(name)")
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

  const title = `${event.title} — ${event.city}, ${event.state} | Rameelo`;
  const description = event.description
    ? event.description.slice(0, 160)
    : `${category} event${artistName ? ` with ${artistName}` : ""} at ${event.venue_name}, ${event.city} on ${date}. Get tickets on Rameelo.`;

  const images = event.cover_image_url
    ? [{ url: event.cover_image_url, width: 1200, height: 630, alt: event.title }]
    : [];

  return {
    title,
    description,
    alternates: { canonical: `https://rameelo.com/events/${id}` },
    openGraph: {
      title: event.title,
      description,
      images,
      type: "website",
      siteName: "Rameelo",
      url: `https://rameelo.com/events/${id}`,
    },
    twitter: {
      card: event.cover_image_url ? "summary_large_image" : "summary",
      title: event.title,
      description,
      images: images.map(i => i.url),
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
        description: event.description ?? `${event.category} event at ${event.venue_name}, ${event.city}`,
        startDate: event.start_date,
        city: event.city,
        state: event.state,
        venueName: event.venue_name,
        venueAddress: event.venue_address ?? undefined,
        performerName: artistName,
        imageUrl: event.cover_image_url ?? undefined,
        lowestPrice: prices.length > 0 ? Math.min(...prices) : 0,
        highestPrice: prices.length > 0 ? Math.max(...prices) : undefined,
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
