// Meta (Facebook) Pixel — shared id + a safe, typed tracking helper.
// The id can be overridden per environment via NEXT_PUBLIC_META_PIXEL_ID; it
// defaults to the production pixel so conversion tracking works out of the box.
export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "1325255668444571";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Fire a Meta Pixel standard or custom event, safely. No-ops on the server or
 * before the pixel snippet has defined `fbq` (the snippet defines `fbq`
 * synchronously and queues calls, so this is safe to call early).
 */
export function trackPixel(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", event, params);
  }
}

/**
 * Fire a pixel event at most once per dedupe key (persisted in localStorage), so
 * a confirmation-page refresh or revisit never double-counts a Purchase.
 */
export function trackPixelOnce(key: string, event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const storeKey = `rmpx:${event}:${key}`;
  try {
    if (localStorage.getItem(storeKey)) return;
    localStorage.setItem(storeKey, "1");
  } catch {
    /* storage blocked — still fire, just without dedupe */
  }
  trackPixel(event, params);
}

// The data every funnel event carries so Meta attributes ViewContent →
// InitiateCheckout → Purchase to the same item, artist, and organizer.
export type EventPixelData = {
  eventId: string;
  eventName: string;
  artistName?: string | null;
  organizer?: string | null;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  metroCity?: string | null;
  eventDate?: string | null;
};

/**
 * Build a consistent Meta param object for an event. Standard commerce keys
 * (content_ids/content_name/content_category) drive catalog matching and
 * optimization; the custom keys (event_id, event_name, artist, organizer, city,
 * metro, date) make the data easy to slice for analysis and audiences. Undefined
 * values are dropped so Meta only sees populated fields.
 */
export function eventPixelParams(e: EventPixelData): Record<string, unknown> {
  const params: Record<string, unknown> = {
    content_type: "product",
    content_ids: [e.eventId],
    content_name: e.eventName,
    currency: "USD",
    // Custom analysis params (event + artist + organizer + place + date).
    event_id: e.eventId,
    event_name: e.eventName,
  };
  if (e.category) { params.content_category = e.category; params.event_category = e.category; }
  if (e.artistName) params.artist = e.artistName;
  if (e.organizer) params.organizer = e.organizer;
  if (e.city) params.event_city = e.city;
  if (e.state) params.event_state = e.state;
  if (e.metroCity) params.event_metro = e.metroCity;
  if (e.eventDate) params.event_date = e.eventDate;
  return params;
}
