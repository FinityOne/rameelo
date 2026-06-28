import type { SupabaseClient } from "@supabase/supabase-js";
import { marketingBlastEmail } from "./templates/marketingBlast";
import { eventBlastEmail, type BlastTier, type BlastEventData, type EventBlastVariant } from "./templates/eventBlast";
import { nearbyEventsEmail, type NearbyEventItem } from "./templates/nearbyEvents";
import { EMAIL } from "./theme";

// US state code → display name, for the "events near you in {state}" copy.
const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "Washington, DC",
};
export const stateName = (code: string | null | undefined): string | null => {
  const c = (code ?? "").trim().toUpperCase();
  return c ? (STATE_NAMES[c] ?? c) : null;
};

// Template keys that map to the shared event-blast renderer (event required).
const EVENT_BLAST_VARIANTS = new Set<string>(["tickets-live", "selling-fast", "final-call", "we-miss-you"]);

// Shared building blocks for the admin Email Blast tool — used by both the send
// route and the preview route so what an admin previews/tests is exactly what
// recipients get.

export type BlastEvent = BlastEventData;

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
  const today = new Date().toISOString().slice(0, 10);
  const visible = (e.ticket_tiers ?? []).filter(t => t.is_visible)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.price - b.price);

  const tiers: BlastTier[] = visible.map(t => {
    const cap = t.quantity ?? null;
    const used = (t.quantity_sold ?? 0) + (t.quantity_comped ?? 0);
    return { name: t.name, price: Number(t.price), soldOut: cap != null && used >= cap };
  });

  // "Available" = still buyable: not sold out and its sale window hasn't passed.
  // Each tier's effective close = its sale_end_date, else the event date.
  const available = visible
    .map(t => {
      const cap = t.quantity ?? null;
      const used = (t.quantity_sold ?? 0) + (t.quantity_comped ?? 0);
      return { name: t.name, price: Number(t.price), soldOut: cap != null && used >= cap, end: t.sale_end_date ?? e.start_date };
    })
    .filter(t => !t.soldOut && t.end >= today);

  const availablePrices = available.map(t => t.price);
  const fromPrice = availablePrices.length ? Math.min(...availablePrices) : null;

  // When do ALL ticket sales close? The latest effective close among available
  // tiers (later tiers usually sell right up to the event), else the event date.
  const closeDate = available.length
    ? available.reduce((max, t) => (t.end > max ? t.end : max), available[0].end)
    : e.start_date;

  // A "tier deadline" is an available tier whose window ends *before* the overall
  // close — i.e. a price/option going away while others remain. Pick the soonest;
  // this is the honest, compelling urgency hook (not a false "tickets close" date).
  const earlier = available
    .filter(t => t.end < closeDate)
    .sort((a, b) => a.end.localeCompare(b.end));
  const deadlineTier = earlier.length
    ? { name: earlier[0].name, label: fmtDateShort(earlier[0].end), days: daysUntil(earlier[0].end) }
    : null;

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
    closeLabel: fmtDateShort(closeDate),
    closeDays: daysUntil(closeDate),
    deadlineTier,
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

  if (EVENT_BLAST_VARIANTS.has(templateKey) && event) {
    return eventBlastEmail({ variant: templateKey as EventBlastVariant, recipientFirstName, event, unsubscribeUrl });
  }

  if (templateKey === "nearby-events") {
    // The send route resolves the per-recipient event set and calls
    // buildNearbyEmail directly, so this path shouldn't normally hit. Fall back
    // to the custom renderer defensively (e.g. a misconfigured preview).
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

// ── Location-aware ("events near each recipient") helpers ─────────────────────

// A buyable upcoming event, distilled for per-recipient geo matching + the
// nearby-events email card.
export type GeoEvent = NearbyEventItem & { id: string; stateCode: string | null; startDate: string };

// Loads every published, upcoming, on-sale event with at least one available
// ticket tier (so we never promote a sold-out or coming-soon event), soonest
// first. Used once per nearby-events blast and shared across all recipients.
export async function loadUpcomingGeoEvents(supabase: SupabaseClient): Promise<GeoEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("events")
    .select("id, title, start_date, start_time, city, state, venue_name, metro_city, cover_image_url, selling_on_rameelo, ticket_tiers(price, quantity, quantity_sold, quantity_comped, sale_end_date, is_visible)")
    .eq("status", "published")
    .eq("selling_on_rameelo", true)
    .gte("start_date", today)
    .order("start_date", { ascending: true })
    .limit(300);

  const rows = (data ?? []) as unknown as {
    id: string; title: string; start_date: string; start_time: string | null; city: string | null;
    state: string | null; venue_name: string | null; metro_city: string | null; cover_image_url: string | null;
    ticket_tiers: { price: number; quantity: number | null; quantity_sold: number | null; quantity_comped: number | null; sale_end_date: string | null; is_visible: boolean }[];
  }[];

  const out: GeoEvent[] = [];
  for (const e of rows) {
    const available = (e.ticket_tiers ?? [])
      .filter(t => t.is_visible)
      .map(t => {
        const cap = t.quantity ?? null;
        const used = (t.quantity_sold ?? 0) + (t.quantity_comped ?? 0);
        return { price: Number(t.price), soldOut: cap != null && used >= cap, end: t.sale_end_date ?? e.start_date };
      })
      .filter(t => !t.soldOut && t.end >= today);
    if (available.length === 0) continue; // nothing buyable → don't promote it

    out.push({
      id: e.id,
      title: e.title,
      metroCity: e.metro_city,
      eventWhen: `${fmtDate(e.start_date)}${fmtTime(e.start_time) ? ` · ${fmtTime(e.start_time)}` : ""}`,
      eventWhere: [e.venue_name, e.city, e.state].filter(Boolean).join(", "),
      fromPrice: Math.min(...available.map(t => t.price)),
      bannerUrl: e.cover_image_url,
      url: `${EMAIL.site}/events/${e.id}`,
      stateCode: (e.state ?? "").trim().toUpperCase() || null,
      startDate: e.start_date,
    });
  }
  return out;
}

// Picks the events to feature for one recipient: the soonest in their own state,
// else the soonest nationally as a fallback so everyone still gets a relevant
// nudge. Returns the items + the location label for the copy ("New Jersey" /
// null → "near you").
export function pickNearbyEvents(
  events: GeoEvent[],
  recipientState: string | null,
  limit = 3
): { items: NearbyEventItem[]; locationLabel: string | null } {
  const st = (recipientState ?? "").trim().toUpperCase();
  const inState = st ? events.filter(e => e.stateCode === st) : [];
  const chosen = (inState.length ? inState : events).slice(0, limit);
  return {
    items: chosen.map(({ id: _id, stateCode: _s, startDate: _d, ...item }) => item),
    locationLabel: inState.length ? stateName(st) : null,
  };
}

// Builds the nearby-events email for a recipient given their featured events.
export function buildNearbyEmail(opts: {
  recipientFirstName: string | null;
  items: NearbyEventItem[];
  locationLabel: string | null;
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  return nearbyEventsEmail({
    recipientFirstName: opts.recipientFirstName,
    locationLabel: opts.locationLabel,
    events: opts.items,
    browseUrl: `${EMAIL.site}/events`,
    unsubscribeUrl: opts.unsubscribeUrl,
  });
}
