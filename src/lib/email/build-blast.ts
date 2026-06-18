import type { SupabaseClient } from "@supabase/supabase-js";
import { marketingBlastEmail } from "./templates/marketingBlast";
import { ticketsLiveBlastEmail, type BlastTier } from "./templates/ticketsLiveBlast";
import { EMAIL } from "./theme";

// Shared building blocks for the admin Email Blast tool — used by both the send
// route and the preview route so what an admin previews/tests is exactly what
// recipients get.

export type BlastEvent = {
  title: string;
  artistName: string | null;
  eventWhen: string;
  eventWhere: string;
  metroCity: string | null;
  bannerUrl: string | null;
  url: string;
  fromPrice: number | null;
  tiers: BlastTier[];
  saleEndLabel: string | null;
  daysAway: number | null;
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtDateShort(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(t: string | null) {
  if (!t) return ""; const [h, m] = t.split(":"); const hr = parseInt(h, 10);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}
function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86_400_000));
}

// Loads a published event into the shape both blast templates expect (tiers,
// prices, sale-close date + days away). Returns null if the event isn't found
// or isn't published.
export async function loadBlastEvent(supabase: SupabaseClient, eventId: string): Promise<BlastEvent | null> {
  const { data: ev } = await supabase
    .from("events")
    .select("title, start_date, start_time, city, state, venue_name, metro_city, cover_image_url, artists(name), ticket_tiers(name, price, quantity, quantity_sold, quantity_comped, sale_end_date, is_visible, sort_order)")
    .eq("id", eventId).eq("status", "published").maybeSingle();
  if (!ev) return null;

  const e = ev as unknown as {
    title: string; start_date: string; start_time: string | null; city: string | null; state: string | null;
    venue_name: string | null; metro_city: string | null; cover_image_url: string | null;
    artists: { name: string } | { name: string }[] | null;
    ticket_tiers: { name: string; price: number; quantity: number | null; quantity_sold: number | null; quantity_comped: number | null; sale_end_date: string | null; is_visible: boolean; sort_order: number | null }[];
  };

  const artist = Array.isArray(e.artists) ? e.artists[0]?.name : e.artists?.name;
  const visible = (e.ticket_tiers ?? []).filter(t => t.is_visible)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.price - b.price);

  const tiers: BlastTier[] = visible.map(t => {
    const cap = t.quantity ?? null;
    const used = (t.quantity_sold ?? 0) + (t.quantity_comped ?? 0);
    return { name: t.name, price: Number(t.price), soldOut: cap != null && used >= cap };
  });

  const availablePrices = tiers.filter(t => !t.soldOut).map(t => t.price);
  const fromPrice = availablePrices.length ? Math.min(...availablePrices) : null;

  // Sale close = earliest visible-tier sale_end_date, else the event date itself.
  const tierEnds = visible.map(t => t.sale_end_date).filter((d): d is string => !!d).sort();
  const saleEnd = tierEnds[0] ?? e.start_date;

  return {
    title: e.title,
    artistName: artist ?? null,
    eventWhen: `${fmtDate(e.start_date)}${fmtTime(e.start_time) ? ` · ${fmtTime(e.start_time)}` : ""}`,
    eventWhere: [e.venue_name, e.city, e.state].filter(Boolean).join(", "),
    metroCity: e.metro_city,
    bannerUrl: e.cover_image_url,
    url: `${EMAIL.site}/events/${eventId}`,
    fromPrice,
    tiers,
    saleEndLabel: saleEnd ? fmtDateShort(saleEnd) : null,
    daysAway: saleEnd ? daysUntil(saleEnd) : null,
  };
}

// Builds the final { subject, html, text } for a recipient given a template key.
// Falls back to the custom (marketing) template when the key is "custom" or an
// event-required template has no event.
export function buildBlastEmail(opts: {
  templateKey: string;
  recipientFirstName: string | null;
  event: BlastEvent | null;
  unsubscribeUrl: string;
  custom?: { subject: string; headline: string | null; body: string | null };
}): { subject: string; html: string; text: string } {
  const { templateKey, recipientFirstName, event, unsubscribeUrl, custom } = opts;

  if (templateKey === "tickets-live" && event) {
    return ticketsLiveBlastEmail({ recipientFirstName, event, unsubscribeUrl });
  }

  // Custom / fallback: free compose wrapped around an optional event card.
  return marketingBlastEmail({
    recipientFirstName,
    subject: custom?.subject ?? "",
    headline: custom?.headline ?? null,
    body: custom?.body ?? null,
    event: event
      ? {
          title: event.title, artistName: event.artistName, eventWhen: event.eventWhen,
          eventWhere: event.eventWhere, metroCity: event.metroCity, bannerUrl: event.bannerUrl,
          fromPrice: event.fromPrice, url: event.url,
        }
      : null,
    unsubscribeUrl,
  });
}
