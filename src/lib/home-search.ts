import { createClient } from "@/lib/supabase/server";

export type QuickCity = { city: string; state: string | null };

export type HomeSearchOptions = {
  // Every location with an upcoming published event — city AND major-metro labels —
  // so the dropdown never offers a place with nothing to show and never misses a
  // metro (e.g. an Irvine event surfaces under "Los Angeles" too).
  cities: string[];
  // Quick-select chips: featured events OR major-metro areas that are actively
  // selling tickets on Rameelo.
  quickCities: QuickCity[];
};

type Row = {
  city: string | null;
  state: string | null;
  metro_city: string | null;
  selling_on_rameelo: boolean;
  featured_on_events: boolean | null;
};

// Data-driven options for the home hero search. Server-side (home page is a server
// component); falls back to empty arrays so the UI can use its static defaults.
export async function getHomeSearchOptions(): Promise<HomeSearchOptions> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("events")
      .select("city, state, metro_city, selling_on_rameelo, featured_on_events")
      .eq("status", "published")
      .gte("start_date", today);

    const rows = (data ?? []) as Row[];

    // Dropdown: distinct union of city + metro_city across upcoming published events.
    const citySet = new Set<string>();
    for (const r of rows) {
      if (r.city?.trim()) citySet.add(r.city.trim());
      if (r.metro_city?.trim()) citySet.add(r.metro_city.trim());
    }
    const cities = Array.from(citySet).sort((a, b) => a.localeCompare(b));

    // Quick chips: only featured-or-major-metro areas that are SELLING on Rameelo.
    // Prefer the metro label so chips read "Los Angeles", not "Irvine".
    type Agg = { label: string; state: string | null; featured: boolean; count: number };
    const agg = new Map<string, Agg>();
    for (const r of rows) {
      if (!r.selling_on_rameelo) continue;
      const isFeatured = !!r.featured_on_events;
      const hasMetro = !!r.metro_city?.trim();
      if (!isFeatured && !hasMetro) continue;
      const label = (r.metro_city?.trim() || r.city?.trim()) ?? "";
      if (!label) continue;
      const cur = agg.get(label) ?? { label, state: r.state, featured: false, count: 0 };
      cur.count += 1;
      if (isFeatured) cur.featured = true;
      if (!cur.state && r.state) cur.state = r.state;
      agg.set(label, cur);
    }
    const quickCities = Array.from(agg.values())
      .sort((a, b) =>
        (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||
        b.count - a.count ||
        a.label.localeCompare(b.label))
      .slice(0, 8)
      .map(a => ({ city: a.label, state: a.state }));

    return { cities, quickCities };
  } catch {
    return { cities: [], quickCities: [] };
  }
}
