"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackPixel } from "@/lib/meta-pixel";

// Re-fires a Meta PageView on client-side route changes. The App Router
// navigates without a full reload, so the base snippet's one-time PageView
// only covers the initial load — this covers every subsequent navigation.
export default function MetaPixelRouteTracker() {
  const pathname = usePathname();
  const firstLoad = useRef(true);

  useEffect(() => {
    // Skip the initial render — the base snippet already fired PageView for it.
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    trackPixel("PageView");
  }, [pathname]);

  return null;
}
