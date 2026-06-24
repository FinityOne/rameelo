"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { GA_ID } from "./GoogleAnalytics";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// Sends a GA4 page_view on client-side route changes. The inline `config` call
// already fires the initial page_view (preserving GA's native traffic-source
// attribution), so we skip the first render and only track subsequent SPA navs.
export default function GoogleAnalyticsRouteTracker() {
  const pathname = usePathname();
  const firstLoad = useRef(true);

  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
      send_to: GA_ID,
    });
  }, [pathname]);

  return null;
}
