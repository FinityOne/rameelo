import type { PostHog } from "posthog-js";

// Lazy, key-gated PostHog setup. When no key is configured (or on the server),
// posthog-js is never even imported — zero bundle/runtime cost. When a key IS
// set, the library is loaded as a separate async chunk after the page is
// interactive, so it never blocks first paint or navigation.

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let client: PostHog | null = null;
let clientPromise: Promise<PostHog | null> | null = null;

/** Initialize PostHog once (idempotent). Resolves to the client, or null when
 *  disabled (no key / server). Concurrent callers share the same init. */
export function initPostHog(): Promise<PostHog | null> {
  if (typeof window === "undefined" || !POSTHOG_KEY) return Promise.resolve(null);
  if (clientPromise) return clientPromise;
  clientPromise = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,        // we send SPA pageviews manually on route change
      capture_pageleave: true,        // enables bounce / funnel exit analysis
      autocapture: false,             // lean — keeps us well within the free tier
      disable_session_recording: true, // no recordings (performance + cost)
      person_profiles: "identified_only", // anonymous events still count uniques; fewer person profiles
    });
    client = posthog;
    return posthog;
  });
  return clientPromise;
}

/** Capture an event (no-op until PostHog has initialized / when disabled). */
export function capturePostHog(event: string, properties?: Record<string, unknown>) {
  client?.capture(event, properties);
}
