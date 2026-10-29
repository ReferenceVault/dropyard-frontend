// Barrhaven service area — the neighbourhoods we ask people to pick from.
//
// DropYard runs in Barrhaven only (see /faq), so "which neighbourhood?" is a
// choice from a known list, not a free-text box. The names below are what
// residents actually say; the landmarks are there so someone can find their
// own subdivision without thinking about it.
//
// ⚠ Keep in sync with dropyard_backend/src/lib/barrhaven.ts — same ids,
// names and FSAs. The backend validates against its copy and rejects
// anything it doesn't recognise, so a name that drifts here fails to save.

export type ServiceLevel = "core" | "edge";

export interface Neighbourhood {
  id: string;
  name: string;
  fsa: string;
  landmark: string;
}

/** K2J is Barrhaven proper; K2G and K2R each cover one slice of it. */
export const SERVICE_AREA_FSAS: Record<string, ServiceLevel> = {
  K2J: "core",
  K2G: "edge",
  K2R: "edge",
};

export const BARRHAVEN_NEIGHBOURHOODS: Neighbourhood[] = [
  { id: "old-barrhaven",       name: "Old Barrhaven",          fsa: "K2J", landmark: "Cresthaven, Beatrice, Larkin Drive" },
  { id: "hearts-desire",       name: "Heart's Desire",         fsa: "K2J", landmark: "Jockvale north, Knoxdale Road" },
  { id: "knollsbrook",         name: "Knollsbrook & Jockvale", fsa: "K2J", landmark: "Jockvale Road, Deerfield Drive" },
  { id: "longfields",          name: "Longfields",             fsa: "K2J", landmark: "Longfields Drive, Via Verona" },
  { id: "davidson-heights",    name: "Davidson Heights",       fsa: "K2G", landmark: "Woodroffe south of Fallowfield" },
  { id: "barrhaven-centre",    name: "Barrhaven Town Centre",  fsa: "K2J", landmark: "Marketplace, Strandherd at Greenbank" },
  { id: "chapman-mills",       name: "Chapman Mills",          fsa: "K2J", landmark: "Strandherd east, Prince of Wales" },
  { id: "stonebridge",         name: "Stonebridge",            fsa: "K2J", landmark: "Jockvale south, the golf course" },
  { id: "half-moon-bay",       name: "Half Moon Bay",          fsa: "K2J", landmark: "Greenbank south, Kennevale" },
  { id: "quinns-pointe",       name: "Quinn's Pointe",         fsa: "K2J", landmark: "Greenbank at Borrisokane" },
  { id: "cedarhill",           name: "Cedarhill Estates",      fsa: "K2R", landmark: "Cedarview at West Hunt Club" },
  { id: "fallowfield-village", name: "Fallowfield Village",    fsa: "K2R", landmark: "Fallowfield at Richmond Road" },
  { id: "orchard-estates",     name: "Orchard Estates",        fsa: "K2R", landmark: "Old Richmond Road, Steeple Hill" },
  // Escape hatch — a subdivision we haven't listed must never dead-end the
  // form. Kept last so it reads as the fallback it is.
  { id: "barrhaven-other",     name: "Barrhaven (elsewhere)",  fsa: "K2J", landmark: "Anywhere in Barrhaven not listed above" },
];

export const SUPPORT_EMAIL = "info@dropyard.app";

/** "K2J 4A8" / "k2j4a8" / "K2J" → "K2J". Null when it isn't a postal code. */
export function normalizeFsa(postalCode?: string | null): string | null {
  if (!postalCode) return null;
  const cleaned = postalCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (cleaned.length < 3) return null;
  const fsa = cleaned.slice(0, 3);
  return /^[A-Z]\d[A-Z]$/.test(fsa) ? fsa : null;
}

/** Display formatting as the user types: "k2j4a8" → "K2J 4A8". */
export function formatPostalCode(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
  return cleaned.length > 3 ? `${cleaned.slice(0, 3)} ${cleaned.slice(3)}` : cleaned;
}

export interface ServiceAreaResult {
  /** "partial" = too short to judge yet, so the UI stays quiet. */
  status: "core" | "edge" | "outside" | "invalid" | "partial";
  fsa: string | null;
  inServiceArea: boolean;
}

export function serviceAreaForPostalCode(postalCode?: string | null): ServiceAreaResult {
  const cleaned = (postalCode ?? "").replace(/[^A-Za-z0-9]/g, "");
  if (cleaned.length < 3) return { status: "partial", fsa: null, inServiceArea: false };
  const fsa = normalizeFsa(cleaned);
  if (!fsa) return { status: "invalid", fsa: null, inServiceArea: false };
  const level = SERVICE_AREA_FSAS[fsa];
  if (!level) return { status: "outside", fsa, inServiceArea: false };
  return { status: level, fsa, inServiceArea: true };
}

export function neighbourhoodsForFsa(fsa?: string | null): Neighbourhood[] {
  if (!fsa) return [];
  const upper = fsa.toUpperCase();
  return BARRHAVEN_NEIGHBOURHOODS.filter((n) => n.fsa === upper);
}

export function findNeighbourhood(input?: string | null): Neighbourhood | null {
  if (!input) return null;
  const key = input.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!key) return null;
  return (
    BARRHAVEN_NEIGHBOURHOODS.find(
      (n) =>
        n.id === input.trim() ||
        n.id.replace(/[^a-z0-9]+/g, "") === key ||
        n.name.toLowerCase().replace(/[^a-z0-9]+/g, "") === key,
    ) ?? null
  );
}

/**
 * Options for the picker, with the postal code's own neighbourhoods hoisted
 * into their own group. Typing K2R shouldn't mean scrolling past ten K2J
 * subdivisions to reach Cedarhill — but the rest stay reachable, because
 * FSA boundaries and how people describe where they live don't always agree.
 */
export function groupedNeighbourhoodOptions(fsa?: string | null): Array<{
  label: string;
  options: Neighbourhood[];
}> {
  const matching = neighbourhoodsForFsa(fsa);
  if (matching.length === 0) {
    return [{ label: "Barrhaven neighbourhoods", options: BARRHAVEN_NEIGHBOURHOODS }];
  }
  const rest = BARRHAVEN_NEIGHBOURHOODS.filter((n) => !matching.includes(n));
  return [
    { label: `In ${fsa}`, options: matching },
    { label: "Elsewhere in Barrhaven", options: rest },
  ];
}
