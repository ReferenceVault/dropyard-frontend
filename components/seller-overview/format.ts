// Time and text helpers for the seller Overview. Drop times are always shown
// in Toronto time (the Drop's own clock), whatever the viewer's zone.

const TZ = "America/Toronto";

/** "Saturday, Nov 28 at 8:00 AM" */
export function dropDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { timeZone: TZ, weekday: "long", month: "short", day: "numeric" });
  return `${date} at ${dropTime(iso)}`;
}

/** "Sunday" */
export function dropDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { timeZone: TZ, weekday: "long" });
}

/** "7:00 PM" */
export function dropTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });
}

/** Days, hours and minutes until `target` (never negative). */
export function countdownParts(target: number, now: number): { days: number; hours: number; minutes: number } {
  const ms = Math.max(0, target - now);
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
  };
}

/** "1d 8h 42m", "8h 4m", "42m" */
export function compactDuration(target: number, now: number): string {
  const { days, hours, minutes } = countdownParts(target, now);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** "just now", "12 min ago", "3 hours ago", "2 days ago" */
export function timeAgo(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function plural(n: number, one: string, many = one + "s"): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Morning before noon, afternoon before 5 PM, evening after (the viewer's own clock). */
export function greetingFor(now: Date): string {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
