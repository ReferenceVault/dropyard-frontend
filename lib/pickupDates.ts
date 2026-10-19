/**
 * Pickup dates are stored as bare calendar dates — "2026-10-24" strings in a
 * Postgres String[] (Item.pickupCustomDates). They carry no time and no zone:
 * "October 24" means October 24 wherever you are.
 *
 * `new Date("2026-10-24")` does NOT mean that. Per the ECMAScript spec a
 * date-only string is parsed as UTC midnight, so in Ottawa (UTC-4/-5) it is
 * 2026-10-23T20:00 local — and every `toLocaleDateString()` on it prints
 * "Oct 23". That is the whole of the "my pickup date keeps shifting a day"
 * bug: a seller picked Oct 24, the backend stored "2026-10-24", and both
 * dashboards rendered Oct 23 to them.
 *
 * So: never hand a stored pickup date to `new Date()`. Parse it from its
 * calendar parts into local midnight, which is what the seller meant when
 * they clicked that square, and format from there.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a stored "YYYY-MM-DD" into a Date at LOCAL midnight.
 * Returns null for anything that isn't a well-formed calendar date, so
 * callers can fall back to showing the raw string rather than "Invalid Date".
 */
export function parsePickupDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const m = ISO_DATE.exec(value.trim());
  if (!m) return null;
  const year  = Number(m[1]);
  const month = Number(m[2]);
  const day   = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  // Rejects real-looking nonsense like 2026-02-30, which JS would roll
  // forward to March 2 instead of failing.
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

/** "Oct 24" — the compact form used in one-line availability summaries. */
export function formatPickupDateShort(value: string): string {
  const d = parsePickupDate(value);
  if (!d) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "Sat, Oct 24" — used on chips and slot buttons, where the weekday helps. */
export function formatPickupDateLong(value: string): string {
  const d = parsePickupDate(value);
  if (!d) return value;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "Saturday" — the weekday on its own, for slot labels that lead with it. */
export function formatPickupWeekday(value: string): string {
  const d = parsePickupDate(value);
  if (!d) return value;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

/**
 * One-line summary of a set of pickup dates: every date while there are few,
 * then "first +N more". Sorted, because the stored array is in the order the
 * seller happened to add them.
 */
export function formatPickupDateList(dates: string[], inlineLimit = 2): string {
  const list = Array.isArray(dates) ? dates.filter(Boolean).slice().sort() : [];
  if (list.length === 0) return "By request";
  if (list.length <= inlineLimit) return list.map(formatPickupDateShort).join(", ");
  return `${formatPickupDateShort(list[0])} +${list.length - 1} more`;
}
