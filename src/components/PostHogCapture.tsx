"use client";

import { useEffect, useRef } from "react";
import { initPostHog } from "@/lib/posthog";

// Captures a single named PostHog event with properties when it mounts. Used on
// event detail pages to send `event_viewed` (with event name / id / artist /
// organizer) so each event page can be compared by friendly name with exact
// unique counts — separate from the generic $pageview, so pageviews aren't
// double-counted. Keyed by `dedupeKey` so it fires once per item.
export default function PostHogCapture({
  event,
  properties,
  dedupeKey,
}: {
  event: string;
  properties?: Record<string, unknown>;
  dedupeKey?: string;
}) {
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    const key = dedupeKey ?? event;
    if (firedFor.current === key) return;
    firedFor.current = key;
    initPostHog().then((ph) => ph?.capture(event, properties));
    // properties is rebuilt per render; we intentionally fire once per dedupeKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dedupeKey, event]);

  return null;
}
