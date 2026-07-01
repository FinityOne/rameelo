// Coordinate lookup for placing teams / cities on a geoAlbersUsa map.
// Returns [longitude, latitude] (the order react-simple-maps <Marker> expects).
//
// Resolution order: exact "city|ST" match → state centroid fallback. College
// towns are spread across a state, so a city hit is far better than a centroid;
// the centroid only kicks in for a city we don't have on file yet.

function normState(state: string | null | undefined): string | null {
  if (!state) return null;
  const s = state.replace(/\./g, "").trim().toUpperCase();
  return s || null;
}

function key(city: string, state: string): string {
  return `${city.trim().toLowerCase()}|${state}`;
}

// Approximate [lng, lat] for the college towns (and metros) teams live in.
const CITY_COORDS: Record<string, [number, number]> = {
  "los angeles|CA":     [-118.24, 34.05],
  "berkeley|CA":        [-122.27, 37.87],
  "davis|CA":           [-121.74, 38.54],
  "san diego|CA":       [-117.16, 32.72],
  "santa cruz|CA":      [-122.03, 36.97],
  "austin|TX":          [-97.74, 30.27],
  "dallas|TX":          [-96.80, 32.78],
  "college station|TX": [-96.31, 30.63],
  "atlanta|GA":         [-84.39, 33.75],
  "boston|MA":          [-71.06, 42.36],
  "west lafayette|IN":  [-86.91, 40.43],
  "bloomington|IN":     [-86.53, 39.17],
  "pittsburgh|PA":      [-79.996, 40.44],
  "pittsburg|PA":       [-79.996, 40.44], // common misspelling of Pittsburgh
  "philadelphia|PA":    [-75.17, 39.95],
  "mansfield|CT":       [-72.25, 41.80], // UConn (Storrs/Mansfield)
  "orlando|FL":         [-81.38, 28.54],
  "gainesville|FL":     [-82.32, 29.65],
  "tampa|FL":           [-82.46, 27.95],
  "charlottesville|VA": [-78.48, 38.03],
  "blacksburg|VA":      [-80.41, 37.23],
  "richmond|VA":        [-77.44, 37.54],
  "new brunswick|NJ":   [-74.45, 40.49],
  "champaign|IL":       [-88.24, 40.11],
  "evanston|IL":        [-87.69, 42.05],
  "chicago|IL":         [-87.63, 41.88],
  "ithaca|NY":          [-76.50, 42.44],
  "new york|NY":        [-74.01, 40.71],
  "stony brook|NY":     [-73.14, 40.91],
  "ann arbor|MI":       [-83.74, 42.28],
  "college park|MD":    [-76.94, 38.99],
  "cleveland|OH":       [-81.69, 41.50],
  "columbus|OH":        [-82.99, 39.96],
  "washington|DC":      [-77.04, 38.90],
  "st louis|MO":        [-90.20, 38.63],
  "saint louis|MO":     [-90.20, 38.63],
  "chapel hill|NC":     [-79.05, 35.91],
  "durham|NC":          [-78.90, 35.99],
  "seattle|WA":         [-122.33, 47.61],
};

// Rough geographic centers, [lng, lat]. Fallback when the city isn't known.
const STATE_CENTROIDS: Record<string, [number, number]> = {
  AL: [-86.79, 32.81], AK: [-152.0, 64.0], AZ: [-111.66, 34.17], AR: [-92.44, 34.97],
  CA: [-119.68, 37.18], CO: [-105.55, 39.00], CT: [-72.73, 41.60], DE: [-75.51, 39.00],
  DC: [-77.03, 38.90], FL: [-81.69, 28.63], GA: [-83.64, 32.68], HI: [-157.5, 20.90],
  ID: [-114.60, 44.24], IL: [-89.00, 40.06], IN: [-86.28, 39.89], IA: [-93.50, 42.07],
  KS: [-98.38, 38.50], KY: [-84.86, 37.65], LA: [-91.87, 31.05], ME: [-69.24, 45.37],
  MD: [-76.80, 39.06], MA: [-71.82, 42.26], MI: [-85.00, 43.50], MN: [-94.31, 46.28],
  MS: [-89.67, 32.74], MO: [-92.46, 38.36], MT: [-109.65, 46.92], NE: [-99.68, 41.53],
  NV: [-116.65, 39.33], NH: [-71.58, 43.69], NJ: [-74.52, 40.19], NM: [-106.02, 34.42],
  NY: [-75.50, 42.94], NC: [-79.19, 35.54], ND: [-100.30, 47.46], OH: [-82.79, 40.29],
  OK: [-97.50, 35.57], OR: [-120.55, 43.93], PA: [-77.60, 40.88], RI: [-71.51, 41.68],
  SC: [-80.90, 33.86], SD: [-100.23, 44.44], TN: [-86.35, 35.86], TX: [-99.00, 31.48],
  UT: [-111.66, 39.32], VT: [-72.71, 44.07], VA: [-78.66, 37.52], WA: [-120.74, 47.40],
  WV: [-80.61, 38.64], WI: [-89.99, 44.62], WY: [-107.55, 43.00],
};

/** [lng, lat] for a city/state, or null if the state is unknown/unmappable. */
export function resolveUSCoords(
  city: string | null | undefined,
  state: string | null | undefined
): [number, number] | null {
  const st = normState(state);
  if (!st) return null;
  if (city) {
    const hit = CITY_COORDS[key(city, st)];
    if (hit) return hit;
  }
  return STATE_CENTROIDS[st] ?? null;
}
