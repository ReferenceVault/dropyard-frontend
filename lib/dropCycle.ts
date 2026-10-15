/**
 * Drop Cycle Logic - BRD Section 4.1
 *
 * Mon-Wed:  Submission - Sellers upload items for upcoming Drop
 * Thu-Fri:  Preview - Buyers browse and save, no claiming
 * Sat 8am:  DROP GOES LIVE - Claiming opens
 * Sat-Sun:  Claim & Pickup - 48-hour window
 * Sun 8pm:  Drop closes
 */

// ─────────────────────────────────────────────────────────────────
// CANONICAL DROP TIMING
// Single source of truth for what time the Drop opens and closes.
// EVERY surface that displays the drop time (dashboards, marketing
// pages, FAQ, emails) MUST read from these constants or the format
// helpers below. Adding a new "Saturday 8 AM" anywhere is a bug.
// ─────────────────────────────────────────────────────────────────

/** Day the Drop opens (0 = Sunday, 6 = Saturday). */
export const DROP_OPEN_DAY  = 6;
/** Hour the Drop opens, 24-hour. 8 = 8 AM. */
export const DROP_OPEN_HOUR = 8;
/** Day the Drop closes. */
export const DROP_CLOSE_DAY  = 0;
/** Hour the Drop closes. 20 = 8 PM. */
export const DROP_CLOSE_HOUR = 20;

const DAYS_FULL  = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─────────────────────────────────────────────────────────────────
// Toronto timezone helpers — must mirror the backend's src/lib/dropCycle.ts
//
// The Drop runs on Toronto wall-clock: Sat 08:00 to Sun 20:00 America/Toronto.
// This file used to read the boundaries off the BROWSER's clock (getDay /
// getHours / setHours), so every viewer outside Eastern computed a different
// phase from the server. A seller in Vancouver saw "Queue for the next Drop"
// for three hours after the Drop had actually opened; a tester in IST saw
// "Live Drop" and a claim button while the API still had the items as DRAFT
// and rejected every claim.
//
// Canada alone spans six timezones, so this is wrong for most of the country
// — it only looked correct from Ottawa/Toronto.
// ─────────────────────────────────────────────────────────────────

/** The Drop's wall clock. Exported so components that format a Drop instant
 *  themselves pass it too — formatting without it renders the viewer's zone. */
export const OPERATING_TIMEZONE = "America/Toronto";

/** Read an absolute instant's calendar parts as they appear in Toronto. */
function torontoParts(d: Date): { year: number; month: number; day: number; hour: number; minute: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: OPERATING_TIMEZONE,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? "0";
  // Intl can report hour="24" at midnight in some locales — normalise to 0.
  const hourRaw = Number(get("hour"));
  // getDay() convention: 0 = Sunday … 6 = Saturday, so DROP_OPEN_DAY etc.
  // keep working unchanged.
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year:    Number(get("year")),
    month:   Number(get("month")),
    day:     Number(get("day")),
    hour:    hourRaw === 24 ? 0 : hourRaw,
    minute:  Number(get("minute")),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

/**
 * Absolute instant for a given Toronto wall-clock time. DST-aware: tries EST
 * (UTC-5) then EDT (UTC-4) and keeps whichever round-trips back to the same
 * wall-clock through Toronto's calendar.
 */
function torontoToUtc(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  for (const offset of [5, 4]) {
    const candidate = new Date(Date.UTC(year, month - 1, day, hour + offset, minute, 0, 0));
    const view = torontoParts(candidate);
    if (view.year === year && view.month === month && view.day === day
        && view.hour === hour && view.minute === minute) {
      return candidate;
    }
  }
  // Only reachable for a wall-clock that doesn't exist (the skipped 2am hour
  // on spring-forward). Our boundaries are 00:00 / 08:00 / 20:00, so this is
  // a guard rather than a real case; fall back to EST rather than throwing
  // and blanking the whole dashboard.
  return new Date(Date.UTC(year, month - 1, day, hour + 5, minute, 0, 0));
}

/** Shift a Toronto calendar date by whole days, then pin it to `hour`:00. */
function torontoShift(from: Date, days: number, hour: number): Date {
  const p = torontoParts(from);
  // Date.UTC normalises month/year rollover for us; we only need the
  // resulting calendar date, which we then re-anchor in Toronto.
  const shifted = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return torontoToUtc(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
    hour,
  );
}

function formatHour12(h24: number, style: "AM" | "am" | "a.m." | "amSpaced"): string {
  const display = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
  const isPM = h24 >= 12 && h24 < 24;
  switch (style) {
    case "AM":       return `${display} ${isPM ? "PM" : "AM"}`;
    case "am":       return `${display}${isPM ? "pm" : "am"}`;
    case "a.m.":     return `${display} ${isPM ? "p.m." : "a.m."}`;
    case "amSpaced": return `${display} ${isPM ? "pm" : "am"}`;
  }
}

/** "8 AM" — banner / headline style. */
export function dropOpenHour(): string { return formatHour12(DROP_OPEN_HOUR, "AM"); }
/** "8am" — compact lowercase, no space. */
export function dropOpenHourCompact(): string { return formatHour12(DROP_OPEN_HOUR, "am"); }
/** "8 am" — lowercase with space (marketing copy). */
export function dropOpenHourLowerSpaced(): string { return formatHour12(DROP_OPEN_HOUR, "amSpaced"); }
/** "8 a.m." — dotted. */
export function dropOpenHourDotted(): string { return formatHour12(DROP_OPEN_HOUR, "a.m."); }
/** "8AM" — no space + uppercase for compact badges. */
export function dropOpenHourBadge(): string {
  return formatHour12(DROP_OPEN_HOUR, "AM").replace(" ", "");
}

/** "Saturday" (default) / "Sat" (short). */
export function dropOpenDay(short = false): string {
  return short ? DAYS_SHORT[DROP_OPEN_DAY] : DAYS_FULL[DROP_OPEN_DAY];
}

/** "Saturday at 8 AM" — banner-headline composite. */
export function dropOpenFull(): string {
  return `${dropOpenDay()} at ${dropOpenHour()}`;
}

/** "8:00 AM" — explicit minute style for FAQ / legal copy. */
export function dropOpenHourLong(): string {
  return dropOpenHour().replace(" ", ":00 ");
}

/** "6:00 PM" — close hour explicit minute style. */
export function dropCloseHourLong(): string {
  return dropCloseHour().replace(" ", ":00 ");
}

/** "8 PM" close-hour label. */
export function dropCloseHour(): string { return formatHour12(DROP_CLOSE_HOUR, "AM"); }
/** "Sunday" close-day label. */
export function dropCloseDay(short = false): string {
  return short ? DAYS_SHORT[DROP_CLOSE_DAY] : DAYS_FULL[DROP_CLOSE_DAY];
}

export type DropPhase =
  | "SUBMISSION"   // Mon 00:00 - Wed 23:59
  | "PREVIEW"      // Thu 00:00 - Sat 07:59
  | "LIVE"         // Sat 08:00 - Sun 20:00
  | "CLOSED";      // Sun 20:01 - Mon 00:00

export interface DropCycleInfo {
  phase: DropPhase;
  /** Sellers can list items for the upcoming Drop */
  canSellersList: boolean;
  /** Buyers can browse and save (preview mode) */
  canBuyersBrowse: boolean;
  /** Buyers can submit claims */
  canBuyersClaim: boolean;
  /** Human-readable phase label */
  phaseLabel: string;
  /** Short description for UI */
  phaseDescription: string;
  /** Next significant moment (e.g. "Saturday 8:00 AM" when Drop goes live) */
  nextEventAt: Date;
  /** Label for next event (e.g. "Drop goes live", "Submission opens") */
  nextEventLabel: string;
  /** Current Drop weekend (Saturday date) */
  currentDropDate: Date;
  /** Day names for display */
  dayNames: string[];
}

/** Get the Drop-opening moment (Saturday 8am by default) of the current
 *  Drop, or next Drop if we're past close on Sunday. */
function getCurrentDropSaturday(ref: Date): Date {
  // Toronto wall-clock, not the viewer's. See the timezone note above.
  const { weekday: day, hour } = torontoParts(ref);

  // Past the close moment (Sunday 8pm by default): next week's open day.
  if (day === DROP_CLOSE_DAY && hour >= DROP_CLOSE_HOUR) {
    return torontoShift(ref, 6, DROP_OPEN_HOUR);
  }

  if (day === DROP_CLOSE_DAY) {
    return torontoShift(ref, -1, DROP_OPEN_HOUR); // yesterday = open day
  }
  if (day < DROP_OPEN_DAY) {
    return torontoShift(ref, DROP_OPEN_DAY - day, DROP_OPEN_HOUR); // this week's open day
  }
  return torontoShift(ref, 0, DROP_OPEN_HOUR); // already Saturday
}

/** Get Monday 00:00 Toronto of the submission week (Mon before Drop Saturday) */
function getSubmissionMonday(sat: Date): Date {
  return torontoShift(sat, -5, 0);
}

/** Get Thursday 00:00 Toronto (start of Preview) */
function getPreviewThursday(sat: Date): Date {
  return torontoShift(sat, -2, 0);
}

/** Get the Drop-close moment (Sunday 8pm Toronto) given the open Saturday */
function getDropCloseSunday(sat: Date): Date {
  return torontoShift(sat, 1, DROP_CLOSE_HOUR);
}

export function getDropCycleInfo(now: Date = new Date()): DropCycleInfo {
  const liveSat = getCurrentDropSaturday(now);
  const submissionMon = getSubmissionMonday(liveSat);
  const previewThu = getPreviewThursday(liveSat);
  const closeSun = getDropCloseSunday(liveSat);
  const time = now.getTime();
  const sMon = submissionMon.getTime();
  const pThu = previewThu.getTime();
  const lSat = liveSat.getTime();
  const cSun = closeSun.getTime();

  let phase: DropPhase = "CLOSED";
  let nextEventAt: Date = submissionMon;
  let nextEventLabel = "Submission opens";

  if (time >= sMon && time < pThu) {
    phase = "SUBMISSION";
    nextEventAt = previewThu;
    nextEventLabel = "Preview begins (browse only)";
  } else if (time >= pThu && time < lSat) {
    phase = "PREVIEW";
    nextEventAt = liveSat;
    nextEventLabel = "Drop goes live — claiming opens!";
  } else if (time >= lSat && time <= cSun) {
    phase = "LIVE";
    nextEventAt = closeSun;
    nextEventLabel = "Drop closes";
  } else {
    phase = "CLOSED";
    nextEventAt = submissionMon; // Submission opens Monday (liveSat already points to next Drop)
    nextEventLabel = "Submission opens for next Drop";
  }

  const phaseMeta: Record<
    DropPhase,
    { label: string; description: string; canList: boolean; canBrowse: boolean; canClaim: boolean }
  > = {
    SUBMISSION: {
      label: "Submission window",
      description: "Sellers can add items for this weekend's Drop. Buyers: browse opens Thursday.",
      canList: true,
      canBrowse: false,
      canClaim: false,
    },
    PREVIEW: {
      label: "Preview mode",
      description: `Browse and save items. Claiming opens ${dropOpenDay()} ${dropOpenHourCompact()}!`,
      canList: false,
      canBrowse: true,
      canClaim: false,
    },
    LIVE: {
      label: "Drop is live!",
      description: "Claim items now. Pickup this weekend.",
      canList: false,
      canBrowse: true,
      canClaim: true,
    },
    CLOSED: {
      label: "Drop closed",
      description: "Next submission opens Monday. Stay tuned!",
      canList: false,
      canBrowse: false,
      canClaim: false,
    },
  };

  const meta = phaseMeta[phase];
  const currentDropDate = liveSat;

  return {
    phase,
    canSellersList: meta.canList,
    canBuyersBrowse: meta.canBrowse,
    canBuyersClaim: meta.canClaim,
    phaseLabel: meta.label,
    phaseDescription: meta.description,
    nextEventAt,
    nextEventLabel,
    currentDropDate,
    dayNames: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  };
}

/** Format date for display (e.g. "Sat, Mar 22"), on the Drop's clock.
 *  Without timeZone this reports the VIEWER's calendar day, which for a Drop
 *  instant near midnight Toronto is the wrong date east or west of Eastern. */
export function formatDropDate(d: Date): string {
  return d.toLocaleDateString("en-CA", {
    timeZone: OPERATING_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Format time for display (e.g. "8:00 a.m."), on the Drop's clock.
 *  Without timeZone the 8 a.m. Toronto opening renders as the viewer's local
 *  equivalent — 5:30 p.m. in IST, 5 a.m. in Vancouver — so every seller
 *  outside Eastern was told the wrong opening time. */
export function formatDropTime(d: Date): string {
  return d.toLocaleTimeString("en-CA", {
    timeZone: OPERATING_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─────────────────────────────────────────────────────────────────
// V2 SELLER OVERVIEW HELPERS
// The seller Overview component derives three coarse phases from the
// cycle info above:
//   "between" — anything except LIVE (sellers prepping, post-Drop recap)
//   "live"    — LIVE phase with > 3 hours of selling time left
//   "closing" — LIVE phase with ≤ 3 hours left (urgency cue, "last call")
// Helpers below compute the times + countdowns the Overview needs.
// ─────────────────────────────────────────────────────────────────

export type SellerOverviewPhase = "between" | "live" | "closing";

/** Sunday 20:00 of the currently-relevant Drop weekend. */
export function dropCloseMoment(now: Date = new Date()): Date {
  const info = getDropCycleInfo(now);
  return getDropCloseSunday(info.currentDropDate);
}

/** Saturday 08:00 of the next Drop weekend (or the current one if we're already in/past LIVE). */
export function nextDropMoment(now: Date = new Date()): Date {
  const info = getDropCycleInfo(now);
  return new Date(info.currentDropDate);
}

/** Map the rich DropPhase → coarse seller-Overview phase. */
export function toSellerOverviewPhase(
  info: DropCycleInfo,
  now: Date = new Date(),
  closingThresholdHours = 3,
): SellerOverviewPhase {
  if (info.phase !== "LIVE") return "between";
  const closeAt = getDropCloseSunday(info.currentDropDate);
  const msLeft = closeAt.getTime() - now.getTime();
  if (msLeft <= closingThresholdHours * 60 * 60 * 1000) return "closing";
  return "live";
}

/**
 * Hours elapsed since the previous Drop closed (Sun 8 pm of last week).
 * Useful for the "fresh recap" window in BetweenHero — we treat the first
 * ~30h after a Drop closes as "fresh" and lead with the recap.
 */
export function hoursSinceLastDropClose(now: Date = new Date()): number {
  const info = getDropCycleInfo(now);
  // Last-Drop close = current Drop Saturday - 6 days at DROP_CLOSE_HOUR
  // (the prior week's Sunday close), in Toronto wall-clock like every other
  // boundary in this file.
  const lastClose = torontoShift(info.currentDropDate, -6, DROP_CLOSE_HOUR);
  const ms = now.getTime() - lastClose.getTime();
  return ms / (60 * 60 * 1000);
}

/**
 * Compact countdown like the v2 design: "2d 14h", "4h 23m", "12m", "30s".
 * Differs from the existing DropCycleContext label by omitting seconds
 * above the minute scale (the Overview doesn't want a ticking second hand).
 */
export function formatCompactCountdown(target: Date, now: Date = new Date()): string {
  const ms = Math.max(0, target.getTime() - now.getTime());
  if (ms <= 0) return "now";
  const totalSec = Math.floor(ms / 1000);
  const days  = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins  = Math.floor((totalSec % 3600) / 60);
  const secs  = totalSec % 60;
  if (days > 0)  return mins > 0 || hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  if (mins > 0)  return `${mins}m`;
  return `${secs}s`;
}
