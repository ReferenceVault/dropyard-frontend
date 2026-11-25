/**
 * Money and number fields keep what the person typed as TEXT, so the field can
 * be empty. Storing a number instead turned an emptied field into 0 (the
 * claim dialog did `parseInt(value) || 0`): the box showed "0", the next digit
 * landed after it ("025"), and the button offered "Send offer of $0". Convert
 * with `amountValue` only to validate or send.
 *
 * Use these with `type="text"` and the matching `inputMode` (numeric or
 * decimal) rather than `type="number"`, which accepts "e", "-" and "." in a
 * whole-dollar field and hides what it accepted (its value reads "" for "1e").
 */

/** Longest whole-dollar amount the API accepts ($100,000) is six digits. */
const MAX_WHOLE_DIGITS = 6;

/**
 * Whole dollars (offers, counters, percentages): digits only, leading zeros
 * dropped. "027" → "27", "0" → "", "1e5-.5" → "155". Use inputMode="numeric".
 */
export function wholeAmountText(raw: string, maxDigits = MAX_WHOLE_DIGITS): string {
  return raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, maxDigits);
}

/**
 * Dollars and cents (listing prices): digits and one decimal point, at most two
 * decimals. Leading zeros dropped except the one before a point or on its own,
 * since $0 is a valid listing price (a free giveaway). "007" → "7",
 * "00" → "0", ".5" → "0.5", "1.2.3" → "1.23", "4.567" → "4.56".
 * Use inputMode="decimal".
 */
export function decimalAmountText(raw: string, maxWholeDigits = MAX_WHOLE_DIGITS): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  let whole = dot === -1 ? cleaned : cleaned.slice(0, dot);
  const cents = dot === -1 ? null : cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  whole = whole.replace(/^0+(?=\d)/, "").slice(0, maxWholeDigits);
  if (cents !== null && whole === "") whole = "0";
  return cents === null ? whole : `${whole}.${cents}`;
}

/** The number in a field's text, or null when it's empty or not a number. */
export function amountValue(text: string): number | null {
  if (text.trim() === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Largest offer, counter or price the API accepts. */
export const MAX_AMOUNT = 100_000;

/**
 * Why a whole-dollar offer or counter can't be sent yet, or null when it can.
 * The API's rule: more than $0, at most $100,000, whole dollars.
 */
export function offerAmountProblem(text: string): string | null {
  const n = amountValue(text);
  if (n === null || n <= 0) return "Enter an amount";
  if (n > MAX_AMOUNT) return "Enter $100,000 or less";
  return null;
}
