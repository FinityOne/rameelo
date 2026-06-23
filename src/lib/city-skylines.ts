// Optional real skyline photos per metro, used by the home "Popular Cities"
// tiles. Empty by default — tiles fall back to a representative event cover for
// that city, then a branded skyline illustration. To show a true skyline,
// drop a hosted image URL here (key = the city/metro label as it appears on
// events, e.g. "Boston", "Los Angeles") or upload to /public/cities and point
// at "/cities/boston.jpg".
export const CITY_SKYLINES: Record<string, string> = {
  // "Boston": "/cities/boston.jpg",
  // "Los Angeles": "https://…/la-skyline.jpg",
};

// Deterministic, on-brand gradient per city so the illustrated fallback varies
// pleasantly but stays stable for a given city.
const PALETTES = [
  "linear-gradient(135deg, #0F1F3D 0%, #1E3A7A 100%)",
  "linear-gradient(135deg, #0A3D35 0%, #0E7A6A 100%)",
  "linear-gradient(135deg, #3A1430 0%, #7C1F2C 100%)",
  "linear-gradient(135deg, #1A0635 0%, #4A1060 100%)",
  "linear-gradient(135deg, #6B2210 0%, #B84A22 100%)",
  "linear-gradient(135deg, #2E1B30 0%, #5a1e7a 100%)",
];

export function skylineGradient(city: string): string {
  let h = 0;
  for (let i = 0; i < city.length; i++) h = (h * 31 + city.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
}
