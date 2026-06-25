import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import GarbaClient, { type GarbaEvent } from "./GarbaClient";

export const metadata: Metadata = {
  title: "Rameelo — Garba & Navratri Events Across America",
  description:
    "One link to every garba night. Browse featured Raas Garba, Dandiya & Navratri events by city and grab your tickets in a tap.",
  alternates: { canonical: "https://rameelo.com/garba" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Find your garba night — Rameelo",
    description: "Featured Raas Garba, Dandiya & Navratri events across the USA. Pick your city, grab tickets in a tap.",
    type: "website",
    url: "https://rameelo.com/garba",
    siteName: "Rameelo",
    images: [{ url: "https://rameelo.com/og-default.jpg", width: 1200, height: 630, alt: "Rameelo — garba events across America" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Find your garba night — Rameelo",
    description: "Featured garba & Navratri events across the USA. Pick your city, grab tickets in a tap.",
    images: ["https://rameelo.com/og-default.jpg"],
  },
};

// The Instagram "link in bio" destination: an enhanced link page focused on
// getting a fan from Instagram → their city's featured events → checkout in as
// few taps as possible. Server-fetched for fast first paint + SEO; the
// interactive city navigation lives in GarbaClient.
export const revalidate = 300; // refresh the lineup every 5 min

export default async function TourPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Only events the admin has toggled to SELL on Rameelo (selling_on_rameelo)
  // belong on the bio link — it's a buy-tickets destination. Interest-only
  // events (toggle off) are intentionally excluded.
  const { data: raw } = await supabase
    .from("events")
    .select(
      "id, title, category, city, state, metro_city, start_date, start_time, venue_name, cover_image_url, cover_gradient, selling_on_rameelo, featured_on_tour, artists(name), ticket_tiers(name, price, quantity, quantity_sold, sold_out, sale_end_date)",
    )
    .eq("status", "published")
    .eq("selling_on_rameelo", true)
    .gte("start_date", today)
    .order("featured_on_tour", { ascending: false })
    .order("start_date", { ascending: true })
    .limit(80);

  const events: GarbaEvent[] = (raw ?? []).map((e: Record<string, unknown>) => {
    const tiers = (e.ticket_tiers as { name: string; price: number; quantity: number; quantity_sold: number; sold_out: boolean; sale_end_date: string | null }[] | null) ?? [];
    const artist = e.artists as { name: string } | { name: string }[] | null;
    return {
      id: e.id as string,
      title: e.title as string,
      category: (e.category as string) ?? "",
      city: (e.city as string) ?? "",
      state: (e.state as string) ?? "",
      metroCity: (e.metro_city as string) ?? null,
      startDate: e.start_date as string,
      startTime: (e.start_time as string) ?? "",
      venueName: (e.venue_name as string) ?? "",
      coverImageUrl: (e.cover_image_url as string) ?? null,
      coverGradient: (e.cover_gradient as string) ?? "aubergine",
      sellingOnRameelo: !!e.selling_on_rameelo,
      featured: !!e.featured_on_tour,
      artistName: Array.isArray(artist) ? artist[0]?.name ?? null : artist?.name ?? null,
      tiers: tiers.map((t) => ({ name: t.name, price: t.price, quantity: t.quantity, quantitySold: t.quantity_sold, soldOut: t.sold_out, saleEndDate: t.sale_end_date })),
    };
  });

  return <GarbaClient events={events} />;
}
