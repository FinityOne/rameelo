"use client";

import { useEffect } from "react";
import { trackPixel, eventPixelParams } from "@/lib/meta-pixel";

// Fires a Meta "ViewContent" event with the specific event's details when an
// event detail page mounts — the top of the funnel. Shares eventPixelParams with
// InitiateCheckout and Purchase so Meta attributes the whole journey to the same
// event, artist, and organizer. Rendered from the server event page with data
// already fetched there (no extra client query).
export default function MetaPixelViewContent(p: {
  id: string;
  name: string;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  metroCity?: string | null;
  startDate?: string | null;
  artistName?: string | null;
  organizer?: string | null;
  minPrice?: number | null;
}) {
  useEffect(() => {
    trackPixel("ViewContent", {
      ...eventPixelParams({
        eventId: p.id,
        eventName: p.name,
        artistName: p.artistName,
        organizer: p.organizer,
        category: p.category,
        city: p.city,
        state: p.state,
        metroCity: p.metroCity,
        eventDate: p.startDate,
      }),
      ...(p.minPrice != null ? { value: p.minPrice } : {}),
    });
    // Fire once per event view (keyed on event id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);

  return null;
}
