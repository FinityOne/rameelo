import { createClient } from "@/lib/supabase/server";
import { stats as fallbackStats } from "@/lib/data";

export type PlatformStats = {
  events: number;
  members: number;
  teams: number;
  cities: number;
  ticketsSold: number;
};

/** Compact a number for display, e.g. 1500 -> "1.5K", 2_000_000 -> "2M". */
export function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/** Live, platform-wide counts pulled from Supabase. */
export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = await createClient();

  const [
    { count: eventCount },
    { count: profileCount },
    { count: teamCount },
    { data: cityRows },
    { data: tierRows },
  ] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("collegiate_teams").select("*", { count: "exact", head: true }),
    supabase.from("events").select("city").eq("status", "published"),
    supabase.from("ticket_tiers").select("quantity_sold"),
  ]);

  const cities = new Set(
    ((cityRows ?? []) as { city: string | null }[])
      .map((r) => (r.city ?? "").trim().toLowerCase())
      .filter(Boolean),
  ).size;

  const ticketsSold = ((tierRows ?? []) as { quantity_sold: number | null }[]).reduce(
    (sum, t) => sum + (t.quantity_sold ?? 0),
    0,
  );

  return {
    events: eventCount ?? 0,
    members: profileCount ?? 0,
    teams: teamCount ?? 0,
    cities,
    ticketsSold,
  };
}

/**
 * The four marketing "headline" stats (Events Hosted / Community Members /
 * Cities Reached / Tickets Sold). Falls back to the static seed values from
 * `data.ts` when a live count is 0, so the page never renders an empty "0+".
 */
export function headlineStats(ps: PlatformStats) {
  return [
    { label: fallbackStats[0].label, value: ps.events > 0 ? `${ps.events}+` : fallbackStats[0].value },
    { label: fallbackStats[1].label, value: ps.members > 0 ? `${compactNumber(ps.members)}+` : fallbackStats[1].value },
    { label: fallbackStats[2].label, value: ps.cities > 0 ? `${ps.cities}+` : fallbackStats[2].value },
    { label: fallbackStats[3].label, value: ps.ticketsSold > 0 ? `${compactNumber(ps.ticketsSold)}+` : fallbackStats[3].value },
  ];
}
