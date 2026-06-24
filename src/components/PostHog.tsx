"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initPostHog } from "@/lib/posthog";

// Site-wide PostHog pageview tracking. Mounted once in the root layout, it
// initializes PostHog after hydration and captures a $pageview on every route
// (the App Router navigates without full reloads). posthog-js auto-attaches
// $current_url / $pathname / referrer and PostHog enriches geo server-side, so
// this single event powers: total visitors + cities (geo), and the
// home → event → checkout → confirmation → login → portal funnel by URL.
// When no key is set, initPostHog() returns null and nothing loads.
export default function PostHogPageview() {
  const pathname = usePathname();

  useEffect(() => {
    initPostHog().then((ph) => ph?.capture("$pageview"));
  }, [pathname]);

  return null;
}
