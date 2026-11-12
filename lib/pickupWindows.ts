/**
 * Pickup time windows, the one place their names and times live.
 *
 * Items store the seller's choice as ids in Item.pickupWindows ("morning",
 * "afternoon", "evening"). Everything that shows those ids to a person goes
 * through here, so a window's name and hours read the same on the item page,
 * in the listing forms and in the claim flow. (Cards don't show pickup times.)
 */

export type PickupWindowId = "morning" | "afternoon" | "evening";

export interface PickupWindow {
  id: PickupWindowId;
  /** "Mornings" — how a listing's availability is described. */
  label: string;
  /** "9:00 AM – 12:00 PM" — item page. */
  time: string;
  /**
   * "9 am - 12 pm" — the wording inside claim pickup slots
   * ("Saturday · 9 am - 12 pm"). Those strings are sent with the claim and
   * shown to the seller, so this stays exactly as it was.
   */
  slotTime: string;
}

// Earliest first; also the display order whatever order the seller picked in.
export const PICKUP_WINDOWS: readonly PickupWindow[] = [
  { id: "morning",   label: "Mornings",   time: "9:00 AM – 12:00 PM", slotTime: "9 am - 12 pm" },
  { id: "afternoon", label: "Afternoons", time: "12:00 PM – 4:00 PM", slotTime: "12 - 4 pm" },
  { id: "evening",   label: "Evenings",   time: "4:00 PM – 7:00 PM",  slotTime: "4 - 7 pm" },
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

