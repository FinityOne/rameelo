export type Metro = { city: string; state: string; lat: number; lng: number };

export const METROS: Metro[] = [
  { city: "San Jose",     state: "CA", lat: 37.3382,  lng: -121.8863 },
  { city: "Los Angeles",  state: "CA", lat: 34.0522,  lng: -118.2437 },
  { city: "Atlanta",      state: "GA", lat: 33.7490,  lng: -84.3880  },
  { city: "Chicago",      state: "IL", lat: 41.8781,  lng: -87.6298  },
  { city: "New York",     state: "NY", lat: 40.7128,  lng: -74.0060  },
  { city: "Edison",       state: "NJ", lat: 40.5187,  lng: -74.4121  },
  { city: "Dallas",       state: "TX", lat: 32.7767,  lng: -96.7970  },
  { city: "Houston",      state: "TX", lat: 29.7604,  lng: -95.3698  },
  { city: "Austin",       state: "TX", lat: 30.2672,  lng: -97.7431  },
  { city: "Seattle",      state: "WA", lat: 47.6062,  lng: -122.3321 },
  { city: "Boston",       state: "MA", lat: 42.3601,  lng: -71.0589  },
  { city: "Washington",   state: "DC", lat: 38.9072,  lng: -77.0369  },
  { city: "Philadelphia", state: "PA", lat: 39.9526,  lng: -75.1652  },
  { city: "Denver",       state: "CO", lat: 39.7392,  lng: -104.9903 },
  { city: "Phoenix",      state: "AZ", lat: 33.4484,  lng: -112.0740 },
  { city: "Minneapolis",  state: "MN", lat: 44.9778,  lng: -93.2650  },
  { city: "Detroit",      state: "MI", lat: 42.3314,  lng: -83.0458  },
];

// URL slug for a metro's city ("San Jose" → "san-jose"). Powers the SEO city
// landing pages at /garba-events/[city].
export function metroSlug(m: { city: string }): string {
  return m.city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function findMetroBySlug(slug: string): Metro | undefined {
  const s = (slug ?? "").toLowerCase();
  return METROS.find((m) => metroSlug(m) === s);
}

// Metros nearest a given one (excluding itself), for "nearby cities" cross-links.
export function metrosNear(origin: { lat: number; lng: number; city: string }, limit = 6): Metro[] {
  return METROS.filter((m) => m.city !== origin.city)
    .map((m) => ({ m, d: haversine(origin.lat, origin.lng, m.lat, m.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.m);
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearestMetro(lat: number, lng: number): Metro {
  return METROS.reduce((best, metro) => {
    const d = haversine(lat, lng, metro.lat, metro.lng);
    const bd = haversine(lat, lng, best.lat, best.lng);
    return d < bd ? metro : best;
  });
}
