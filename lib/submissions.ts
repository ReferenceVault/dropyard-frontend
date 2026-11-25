// Shared client helper for POST /api/submissions.
// Every public "notify me", "contact us", waitlist, and report form on the
// marketing site funnels through here, so the admin Inbox sees one consistent
// shape and source tag per entry point.

import { publicRequest, FRIENDLY_ERROR } from "@/lib/api";

const ACCESS_TOKEN_KEY = "dy_access_token";

export const NETWORK_ERROR = "We couldn't reach DropYard. Check your connection and try again.";

export type SubmissionType =
  | "CONTACT_GENERAL"
  | "CONTACT_REPORT"
  | "CONTACT_BUG"
  | "CONTACT_FEATURE"
  | "CONTACT_NEIGHBOURHOOD"
  | "CONTACT_PARTNER"
  | "CONTACT_PRESS"
  | "CONTACT_OTHER"
  | "EARLY_ACCESS_SIGNUP"
  | "NEIGHBOURHOOD_WAITLIST"
  | "SELLER_AI_WAITLIST"
  | "LISTING_REPORT"
  | "USER_REPORT";

export interface SubmissionInput {
  type: SubmissionType;
  source: string;
  payload: Record<string, unknown>;
}

export interface SubmissionResult {
  id: string;
  createdAt: string;
}

export async function submitSubmission(
  input: SubmissionInput
): Promise<SubmissionResult> {
  // A saved access token links the entry to the signed-in user (the API
  // ignores one that has expired). Cookies, the CSRF header and the one
  // retry are handled by publicRequest, shared by every public form.
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(ACCESS_TOKEN_KEY)
      : null;

  let result: Awaited<ReturnType<typeof publicRequest<SubmissionResult>>>;
  try {
    result = await publicRequest<SubmissionResult>("/api/submissions", { body: input, bearer: token });
  } catch {
    // Offline / server unreachable: fetch throws a bare "Failed to fetch",
    // which every form would otherwise show verbatim.
    throw new Error(NETWORK_ERROR);
  }

  if (!result.ok) {
    // Server-side validation messages ("Enter a valid email address.") are
    // shown as they are; a CSRF failure after the retry is FRIENDLY_ERROR.
    throw new Error(typeof result.data.error === "string" ? result.data.error : FRIENDLY_ERROR);
  }

  return result.data as SubmissionResult;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
