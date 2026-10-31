// Areas shown on the public site. Barrhaven is the only live service area (see
// lib/barrhaven.ts); the rest are waitlist targets.
export const LIVE_NEIGHBOURHOOD = "Barrhaven";

export const HOME_NEIGHBOURHOODS = [
  { name: LIVE_NEIGHBOURHOOD, live: true },
  { name: "Kanata", live: false },
  { name: "Orléans", live: false },
  { name: "Nepean", live: false },
];

/** Homepage link that opens the waitlist form for one area. */
export function neighbourhoodRequestHref(name: string): string {
  return `/?hood=${encodeURIComponent(name)}#neighbourhoods`;
}
