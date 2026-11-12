// Time and text formatting for Messages. Every calendar read happens on
// Toronto wall-clock, the same clock the Drop runs on (lib/dropCycle.ts), so
// "Today", a bubble's time and an offer's expiry agree with each other and
// with what the other person sees, wherever the viewer's device is set.
import { DROP_ZONE_ABBR } from "@/lib/dropCycle";

export const MESSAGES_TZ = "America/Toronto";

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: MESSAGES_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: MESSAGES_TZ, hour: "numeric", minute: "2-digit" });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: MESSAGES_TZ, weekday: "short" });
const longDayFmt = new Intl.DateTimeFormat("en-US", { timeZone: MESSAGES_TZ, weekday: "long", month: "short", day: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("en-US", { timeZone: MESSAGES_TZ, month: "short", day: "numeric" });
const shortDateYearFmt = new Intl.DateTimeFormat("en-US", { timeZone: MESSAGES_TZ, month: "short", day: "numeric", year: "numeric" });
const expiryFmt = new Intl.DateTimeFormat("en-US", { timeZone: MESSAGES_TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

type When = string | number | Date | null | undefined;

function toDate(value: When): Date | null {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "2026-11-10": the Toronto calendar day a moment falls on. */
export function torontoDayKey(value: When): string {
  const d = toDate(value);
  return d ? dayKeyFmt.format(d) : "";
}

/** Whole Toronto days between two moments' calendar days (b − a). */
function dayDiff(a: Date, b: Date): number {
  const ka = Date.parse(torontoDayKey(a) + "T00:00:00Z");
  const kb = Date.parse(torontoDayKey(b) + "T00:00:00Z");
  return Math.round((kb - ka) / 86400000);
}

/**
 * Inbox row time, as the mockup shows it: "Just now", "5m", "3h",
 * "Yesterday", "Mon", then "Nov 3" (with the year once it isn't this year).
 */
export function inboxTime(value: When, now: Date = new Date()): string {
  const d = toDate(value);
  if (!d) return "";
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  const days = dayDiff(d, now);
  if (days <= 0) return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h`;
  if (days === 1) return "Yesterday";
  if (days < 7) return weekdayFmt.format(d);
  return torontoDayKey(d).slice(0, 4) === torontoDayKey(now).slice(0, 4) ? shortDateFmt.format(d) : shortDateYearFmt.format(d);
}

/** Date separator label: "Today", "Yesterday", "Monday, Nov 9", "Nov 3, 2025". */
export function dayLabel(value: When, now: Date = new Date()): string {
  const d = toDate(value);
  if (!d) return "";
  const days = dayDiff(d, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (torontoDayKey(d).slice(0, 4) !== torontoDayKey(now).slice(0, 4)) return shortDateYearFmt.format(d);
  return longDayFmt.format(d);
}

/** A bubble's time: "10:26 AM". The day is carried by the separator above it. */
export function messageTime(value: When): string {
  const d = toDate(value);
  return d ? timeFmt.format(d) : "";
}

/** Offer expiry, always in Toronto time and labelled so: "Nov 8, 10:26 AM ET". */
export function expiryLabel(value: When): string {
  const d = toDate(value);
  return d ? `${expiryFmt.format(d)} ${DROP_ZONE_ABBR}` : "";
}

/**
 * Insert a day marker before the first message of each Toronto day. Returns
 * the messages interleaved with `{ separator: label, key }` entries.
 */
export function withDaySeparators<T>(
  messages: T[],
  timeOf: (m: T) => When,
  now: Date = new Date(),
): Array<{ separator: string; key: string } | { message: T; index: number }> {
  const out: Array<{ separator: string; key: string } | { message: T; index: number }> = [];
  let lastKey = "";
  messages.forEach((m, index) => {
    const key = torontoDayKey(timeOf(m));
    if (key && key !== lastKey) {
      out.push({ separator: dayLabel(timeOf(m), now), key: "day-" + key });
      lastKey = key;
    }
    out.push({ message: m, index });
  });
  return out;
}

/** Inbox preview for the last message: a photo with no caption reads "Photo". */
export function previewText(last: { body?: string | null; messageType?: string | null; attachmentUrl?: string | null } | null | undefined): string {
  if (!last) return "";
  const body = (last.body || "").trim();
  if (body) return body;
  if (last.messageType === "IMAGE" || last.attachmentUrl) return "📷 Photo";
  return "";
}
