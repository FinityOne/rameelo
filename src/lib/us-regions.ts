// US Census regions, used by the public events filter so visitors can browse by
// a broad area ("Northeast") as well as a specific city. State codes only — we
// store `events.state` as a 2-letter abbreviation. Keep this in sync with the
// metros in `metros.ts`; every metro's state should map to a region here.

export type USRegion = { name: string; states: string[] };

export const US_REGIONS: USRegion[] = [
  { name: "West",      states: ["CA", "WA", "OR", "NV", "CO", "AZ", "UT", "NM", "HI", "AK", "ID", "MT", "WY"] },
  { name: "Midwest",   states: ["IL", "MI", "MN", "OH", "IN", "WI", "MO", "IA", "KS", "NE", "ND", "SD"] },
  { name: "South",     states: ["TX", "GA", "FL", "NC", "SC", "VA", "MD", "DC", "TN", "AL", "MS", "LA", "AR", "OK", "KY", "WV", "DE"] },
  { name: "Northeast", states: ["NY", "NJ", "PA", "MA", "CT", "RI", "NH", "VT", "ME"] },
];

const STATE_TO_REGION: Record<string, string> = Object.fromEntries(
  US_REGIONS.flatMap((r) => r.states.map((s) => [s, r.name]))
);

/** Region name for a 2-letter state code, or null if unknown / not provided. */
export function regionForState(state: string | null | undefined): string | null {
  if (!state) return null;
  return STATE_TO_REGION[state.trim().toUpperCase()] ?? null;
}
