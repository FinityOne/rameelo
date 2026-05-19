"use client";

import { useState, useEffect } from "react";
import { type Metro, nearestMetro } from "@/lib/metros";

type State =
  | { status: "pending" }
  | { status: "resolved"; metro: Metro }
  | { status: "denied" };

export function useNearestMetro(): State {
  const [state, setState] = useState<State>({ status: "pending" });

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setState({ status: "denied" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const metro = nearestMetro(pos.coords.latitude, pos.coords.longitude);
        setState({ status: "resolved", metro });
      },
      () => setState({ status: "denied" }),
      { timeout: 6000, maximumAge: 10 * 60 * 1000 }
    );
  }, []);

  return state;
}
