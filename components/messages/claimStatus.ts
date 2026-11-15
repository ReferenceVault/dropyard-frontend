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
  /** When the claim was made: what a bare weekday in pickupSlot counts from. */
  createdAt?: string | Date | null;
}

// ── When is the pickup? ──────────────────────────────────────────────────────
// One reading of an accepted claim's pickup time, shared by Orders → Scheduled
// pickups, the seller's home page, the Orders tab badge and Messages, so they
// can't disagree about what is "today".
//
// pickupSlot is free text the buyer chose once, in the claim form: "Friday ·
// 12 - 4 pm", "Friday, Nov 13 · 12 - 4 pm", or something typed ("today after
// 5"). The seller never confirms or changes it, and a claim that started as an
// offer in Messages has none.
//
//   today       — it says today / tonight, or names today's date or weekday
//   upcoming    — it names a later day (or gives a time with no day we can read)
//   past        — the day it names has gone by
//   unscheduled — no time at all
//
// A bare weekday means the first such day on or after the day the claim was
// made (`since`): an accepted claim is held for 2 days (4 with an extension),
// so it can't mean a week later. Without `since`, today's weekday is today and
// any other weekday is ahead.
export type PickupKind = "today" | "upcoming" | "past" | "unscheduled";
export interface PickupWhen {
  kind: PickupKind;
  /** The time as the buyer gave it, tidied ("Friday · 12–4 pm"); "" when none. */
  time: string;
  /** What a pickup card says: "Buyer suggested: Friday · 12–4 pm", "Was Thursday · …". */
  label: string;
}

const civilFmt = new Intl.DateTimeFormat("en-CA", { timeZone: MESSAGES_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
/** Day number (days since 1970-01-01) of a moment's date in Toronto. */
function civilDay(d: Date): number {
  const [y, m, day] = civilFmt.format(d).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, day) / 86400000);
}
const dayOfWeek = (dayNumber: number) => (dayNumber + 4) % 7; // 1970-01-01 was a Thursday
const WEEKDAY_RE = /\b(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thu|friday|fri|saturday|sat)\b/;
const WEEKDAY_INDEX: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const MONTH_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const dayNumberOf = (y: number, monthIndex: number, d: number) => Math.floor(Date.UTC(y, monthIndex, d) / 86400000);

/** Tidy the buyer's text: no leading separator, "12 - 4 pm" → "12–4 pm". */
export function tidyPickupTime(slot: string | null | undefined): string {
  return String(slot || "")
    .trim()
    .replace(/^[\s·•|,\-–—]+/, "")
    .replace(/(\d(?:\s*[ap]\.?m\.?)?)\s*[-–]\s*(\d)/gi, "$1–$2")
    .replace(/\s{2,}/g, " ");
}

export function pickupWhen(
  slot: string | null | undefined,
  { now = new Date(), since = null }: { now?: Date; since?: string | Date | null } = {},
): PickupWhen {
  const time = tidyPickupTime(slot);
  if (!time) return { kind: "unscheduled", time: "", label: "Pickup time not yet confirmed" };
  const s = time.toLowerCase();
  const today = civilDay(now);
  const sinceDate = since ? new Date(since) : null;
  const base = sinceDate && !Number.isNaN(sinceDate.getTime()) ? Math.min(civilDay(sinceDate), today) : today;

  let target: number | null = null;
  if (/\b(today|tonight)\b/.test(s)) target = today;
  else if (/\btomorrow\b/.test(s)) target = base + 1;
  else {
    const md = MONTH_RE.exec(s);
    if (md) {
      // A date with no year: the nearest one (it's never months away).
      const y = Number(civilFmt.format(now).slice(0, 4));
      const m = MONTHS.indexOf(md[1]);
      target = dayNumberOf(y, m, Number(md[2]));
      if (target - today > 183) target = dayNumberOf(y - 1, m, Number(md[2]));
      else if (today - target > 183) target = dayNumberOf(y + 1, m, Number(md[2]));
    } else {
      const wd = WEEKDAY_RE.exec(s);
      if (wd) target = base + ((WEEKDAY_INDEX[wd[1].slice(0, 3)] - dayOfWeek(base) + 7) % 7);
    }
  }
  const kind: PickupKind = target === null ? "upcoming" : target === today ? "today" : target > today ? "upcoming" : "past";
  return { kind, time, label: kind === "past" ? "Was " + time : "Buyer suggested: " + time };
}

/** Whether an accepted claim's pickup is today (see pickupWhen). */
export function isPickupToday(slot: string | null | undefined, now: Date = new Date(), since: string | Date | null = null): boolean {
  return pickupWhen(slot, { now, since }).kind === "today";
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
      if (isPickupToday(claim.pickupSlot, now, claim.createdAt ?? null)) return { key: "pickup-today", label: "Pickup today", tone: "red" };
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
