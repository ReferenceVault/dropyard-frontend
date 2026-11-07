/**
 * Pickup time windows, the one place their names and times live.
 *
 * Items store the seller's choice as ids in Item.pickupWindows ("morning",
 * "afternoon", "evening"). Everything that shows those ids to a person goes
 * through here, so a window's name and hours read the same on the item page,
 * on every card and in the claim flow.
 */

export type PickupWindowId = "morning" | "afternoon" | "evening";

export interface PickupWindow {
  id: PickupWindowId;
  /** "Mornings" — how a listing's availability is described. */
  label: string;
  /** "9:00 AM – 12:00 PM" — item page. */
  time: string;
  /** "9 AM–12 PM" — cards, where space is tight. */
  shortTime: string;
  /**
   * "9 am - 12 pm" — the wording inside claim pickup slots
   * ("Saturday · 9 am - 12 pm"). Those strings are sent with the claim and
   * shown to the seller, so this stays exactly as it was.
   */
  slotTime: string;
}

// Earliest first; also the display order whatever order the seller picked in.
export const PICKUP_WINDOWS: readonly PickupWindow[] = [
  { id: "morning",   label: "Mornings",   time: "9:00 AM – 12:00 PM", shortTime: "9 AM–12 PM", slotTime: "9 am - 12 pm" },
  { id: "afternoon", label: "Afternoons", time: "12:00 PM – 4:00 PM", shortTime: "12 PM–4 PM", slotTime: "12 - 4 pm" },
  { id: "evening",   label: "Evenings",   time: "4:00 PM – 7:00 PM",  shortTime: "4 PM–7 PM",  slotTime: "4 - 7 pm" },
];

export const PICKUP_WINDOW_IDS: readonly PickupWindowId[] = PICKUP_WINDOWS.map((w) => w.id);

/**
 * The windows an item actually offers, in day order. Unknown ids are dropped
 * and nothing is filled in: no selection gives an empty list, so callers keep
 * their own "no times given" state rather than showing invented hours.
 */
export function selectedPickupWindows(ids: readonly string[] | null | undefined): PickupWindow[] {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  return PICKUP_WINDOWS.filter((w) => ids.includes(w.id));
}

/**
 * One line for a card: "Evenings · 4 PM–7 PM", or for several,
 * "Mornings 9 AM–12 PM · Evenings 4 PM–7 PM". Null when no window is set.
 */
export function pickupWindowsShort(ids: readonly string[] | null | undefined): string | null {
  const wins = selectedPickupWindows(ids);
  if (wins.length === 0) return null;
  if (wins.length === 1) return `${wins[0].label} · ${wins[0].shortTime}`;
  return wins.map((w) => `${w.label} ${w.shortTime}`).join(" · ");
}
