// Shared client helper for POST /api/submissions.
// Every public "notify me", "contact us", waitlist, and report form on the
// marketing site funnels through here, so the admin Inbox sees one consistent
// shape and source tag per entry point.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
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
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(ACCESS_TOKEN_KEY)
      : null;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(input),
    });
  } catch {
    // Offline / server unreachable: fetch throws a bare "Failed to fetch",
    // which every form would otherwise show verbatim.
    throw new Error(NETWORK_ERROR);
  }

  if (!res.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const data = await res.json();
      if (data?.error && typeof data.error === "string") message = data.error;
    } catch {
      // Non-JSON body — keep generic message.
    }
    throw new Error(message);
  }

  return res.json();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
