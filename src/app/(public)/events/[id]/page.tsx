import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import EventDetailClient from "./EventDetailClient";

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
    openGraph: {
      title: event.title,
      description,
      images,
      type: "website",
      siteName: "Rameelo",
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
  return <EventDetailClient id={id} />;
}
