// One claim → one status pill, for both dashboards. Read off the latest claim
// on the thread, never off who spoke last: a thread with no claim has no pill.
import { MESSAGES_TZ } from "./format";

export type PillTone = "amber" | "red" | "green" | "grey";
export interface ClaimPill {
  key: "offer-pending" | "pickup-today" | "in-progress" | "picked-up" | "declined" | "expired" | "cancelled";
  label: string;
  tone: PillTone;
}

export interface ClaimLike {
  status?: string | null;
  buyerConfirmedReceiptAt?: string | null;
  pickupSlot?: string | null;
}

const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: MESSAGES_TZ, weekday: "long" });

/**
 * Whether an accepted claim's pickup is today. `pickupSlot` is free text the
 * buyer typed ("Sat 2pm", "today after 5"), so this only says yes when it
 * names today or today's weekday. An accepted claim holds for two days, so a
 * weekday that matches can only mean this one.
 */
export function isPickupToday(slot: string | null | undefined, now: Date = new Date()): boolean {
  const s = (slot || "").toLowerCase();
  if (!s) return false;
  if (/\btoday\b|\btonight\b/.test(s)) return true;
  const day = weekdayFmt.format(now).toLowerCase(); // "saturday"
  return new RegExp(`\\b${day.slice(0, 3)}(${day.slice(3)})?\\b`).test(s);
}

export function claimPill(claim: ClaimLike | null | undefined, now: Date = new Date()): ClaimPill | null {
  switch (claim?.status) {
    case "PROPOSED":
    case "PENDING":
      return { key: "offer-pending", label: "Offer pending", tone: "amber" };
    case "ACCEPTED":
      // A receipt the buyer confirmed is a finished sale (the backend treats
      // it as completed too) even before the seller marks it picked up.
      if (claim.buyerConfirmedReceiptAt) return { key: "picked-up", label: "Picked up", tone: "green" };
      if (isPickupToday(claim.pickupSlot, now)) return { key: "pickup-today", label: "Pickup today", tone: "red" };
      return { key: "in-progress", label: "Claim in progress", tone: "amber" };
    case "PICKED_UP":
    case "CONFIRMED":
      return { key: "picked-up", label: "Picked up", tone: "green" };
    case "DECLINED":
    case "REJECTED":
      return { key: "declined", label: "Declined", tone: "grey" };
    case "EXPIRED":
      return { key: "expired", label: "Expired", tone: "grey" };
    case "CANCELLED":
      return { key: "cancelled", label: "Cancelled", tone: "grey" };
    default:
      return null;
  }
}

/**
 * A claim still in play: what the Active Claims tab lists. An accepted claim
 * the buyer has confirmed stays here until the seller marks it picked up,
 * because the seller still has that step to do.
 */
export function isLiveClaim(claim: ClaimLike | null | undefined): boolean {
  return claim?.status === "PROPOSED" || claim?.status === "PENDING" || claim?.status === "ACCEPTED";
}
