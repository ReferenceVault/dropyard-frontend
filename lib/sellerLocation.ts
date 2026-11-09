// One line that says where a seller is, without repeating the place name.
//
// The API's `distanceLabel` (dropyard_backend/src/lib/geo.ts) is one of:
//   "Under 2 km" / "~1.4 km" / "~12 km" / "25+ km"   both sides have coordinates
//   "In <neighbourhood>" / "Nearby"                   either side has none
//   "Your listing"                                    the viewer is the seller
//   missing                                           viewer unknown
// The item modal printed it next to the seller's neighbourhood, so the
// fallback came out as "Barrhaven · In Barrhaven". This keeps the place once
// and adds the distance only when it says something new:
//
//   ("Barrhaven", "In Barrhaven")  → "Barrhaven"
//   ("Barrhaven", undefined)       → "Barrhaven"
//   ("Stonebridge", "~3.0 km")     → "Stonebridge · ~3.0 km away"
//   ("Barrhaven", "Under 2 km")    → "Barrhaven · Under 2 km away"
//   ("Barrhaven", "Your listing")  → "Barrhaven · Your listing"
//   (null, "In Barrhaven")         → "Barrhaven"
//   (null, "Nearby")               → "Nearby"
//   (null, null)                   → null

const same = (a: string, b: string) => a.localeCompare(b, "en-CA", { sensitivity: "base" }) === 0;

export function sellerLocationText(neighbourhood?: string | null, distanceLabel?: string | null): string | null {
  const hood = neighbourhood?.trim() || "";
  let extra = distanceLabel?.trim() || "";

  // "In Barrhaven" is the neighbourhood again; "Nearby" says nothing.
  const place = extra.replace(/^in\s+/i, "");
  if (place !== extra) {
    if (!hood || same(place, hood)) return hood || place || null;
  }
  if (same(extra, "Nearby") || (hood && same(extra, hood))) extra = hood ? "" : extra;

  // A bare distance reads better as "~2 km away" beside a place name.
  if (extra && /\bkm$/i.test(extra)) extra = `${extra} away`;

  if (hood && extra) return `${hood} · ${extra}`;
  return hood || extra || null;
}
