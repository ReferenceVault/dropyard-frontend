// Profile appearance helpers, shared by every place a person is shown.
//
// The API resolves each user's choice into one `avatar` field
// (dropyard_backend/src/lib/avatars.ts):
//   { type: "PHOTO",   url }                    an uploaded photo
//   { type: "PRESET",  presetId, url, label }   a DropYard avatar (url is /avatars/…)
//   { type: "INITIALS" }                        the default
// Anything missing or malformed is treated as INITIALS, so older payloads and
// demo data render exactly as before.

export type ResolvedAvatar =
  | { type: "PHOTO"; url: string }
  | { type: "PRESET"; presetId: string; url: string; label: string }
  | { type: "INITIALS" };

export interface AvatarPreset {
  id: string;
  url: string;
  label: string;
  kind: "illustrated" | "neutral";
}

/**
 * "Anthony Smith" → "AS", "Anthony" → "A", "" → "?". First and last word,
 * same rule the dashboards always used. Array.from keeps accented and
 * non-Latin first letters whole.
 */
export function initialsOf(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  if (parts.length === 1) return first.toLocaleUpperCase("en-CA");
  const last = Array.from(parts[parts.length - 1])[0] ?? "";
  return (first + last).toLocaleUpperCase("en-CA");
}

/** Public pages show "First L.", never a full surname. */
export function shortName(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A neighbour";
  if (parts.length === 1) return parts[0];
  const lastInitial = Array.from(parts[parts.length - 1])[0]?.toLocaleUpperCase("en-CA") ?? "";
  return `${parts[0]} ${lastInitial}.`;
}

/** Only our own paths and http(s) URLs are ever put in an <img src>. */
function safeUrl(url: unknown): string | null {
  if (typeof url !== "string" || !url) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return /^https?:\/\//i.test(url) ? url : null;
}

/** Normalise whatever the API (or older demo data) sent into a ResolvedAvatar. */
export function normaliseAvatar(avatar: unknown): ResolvedAvatar {
  if (!avatar || typeof avatar !== "object") return { type: "INITIALS" };
  const a = avatar as Record<string, unknown>;
  const url = safeUrl(a.url);
  if (a.type === "PHOTO" && url) return { type: "PHOTO", url };
  if (a.type === "PRESET" && url && typeof a.presetId === "string") {
    return { type: "PRESET", presetId: a.presetId, url, label: typeof a.label === "string" ? a.label : "Avatar" };
  }
  return { type: "INITIALS" };
}

/** Alt text that says what the picture is. Never implies verification. */
export function avatarAlt(avatar: ResolvedAvatar, name?: string | null): string {
  const who = (name ?? "").trim() || "this neighbour";
  if (avatar.type === "PHOTO") return `Profile picture of ${who}`;
  if (avatar.type === "PRESET") return `${who}'s avatar: ${avatar.label}`;
  return who;
}
