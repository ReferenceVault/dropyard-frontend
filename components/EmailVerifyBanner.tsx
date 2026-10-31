"use client";

import React, { useState } from "react";
import { Mail, X, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";

const DISMISS_KEY = "dropyard:verify-banner-dismissed";

/**
 * Soft email-verification banner. Renders at the top of any authenticated page
 * when the current user's `verifiedAt` is null. Lets them resend the email
 * without leaving the dashboard. Doesn't gate any features.
 *
 * Google accounts never see this: POST /api/auth/google marks them verified,
 * because Google already proved the address. Before that fix this banner
 * greeted every Google signup with "We sent a link to <you>" about an email
 * that was never sent, and offered to resend a verification they didn't need.
 *
 * So the only people who see it signed up with a password, and the signup
 * route tried to send to that address. What it can't promise is delivery —
 * signup sends fire-and-forget and only logs a failure — so the copy never
 * says the email was sent, and a resend reports back honestly when the send
 * fails.
 */
export function EmailVerifyBanner() {
  const { user, accessToken, refreshUser } = useAuth();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (!user || user.verifiedAt || dismissed) return null;

  const resend = async () => {
    if (!accessToken) return;
    setState("sending");
    setErrorMessage("");
    try {
      const res = await apiRequest<{ alreadyVerified?: boolean }>("/api/auth/me/resend-verification", {
        method: "POST",
        token:  accessToken,
      });
      if (res.alreadyVerified) {
        // Verified in another tab or device, so nothing was sent. Refreshing
        // the user sets verifiedAt, which removes this banner.
        await refreshUser();
        return;
      }
      setState("sent");
    } catch (err) {
      // The server distinguishes "couldn't send" from "too many requests";
      // both matter to the person standing in front of the button, so show
      // what came back rather than a guess about which one it was.
      setErrorMessage(err instanceof Error ? err.message : "");
      setState("error");
    }
  };

  const dismiss = () => {
    setDismissed(true);
    // Per tab, for this session — it comes back on the next visit, which is
    // the point of a nag, but it doesn't reappear on every navigation.
    try { window.sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* private mode */ }
  };

  return (
    <div role="status" className="relative w-full" style={{ zIndex: 40 }}>
      <div className="bg-amber-50 border-b border-amber-200/70">
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-4">
          <div
            className={`shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center ${
              state === "sent"
                ? "bg-emerald-100 border-emerald-300/60"
                : "bg-amber-100 border-amber-300/60"
            }`}
          >
            {state === "sent" ? (
              <CheckCircle2 size={18} className="text-emerald-700" strokeWidth={2.3} />
            ) : (
              <Mail size={17} className="text-amber-700" strokeWidth={2.2} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {state === "sent" ? (
              <div>
                <p className="text-[14px] sm:text-[15px] font-bold text-emerald-900 leading-tight">
                  New link sent
                </p>
                <p className="text-[12px] sm:text-[13px] text-emerald-800/80 mt-0.5 truncate">
                  Check your inbox &mdash; and the spam folder. The link works for 24 hours.
                </p>
              </div>
            ) : state === "error" ? (
              <p className="text-[13px] sm:text-[14px] font-semibold text-amber-900 leading-snug">
                {errorMessage || "We couldn't send the email. Please try again in a few minutes."}
              </p>
            ) : (
              <div>
                <p className="text-[14px] sm:text-[15px] font-bold text-amber-950 leading-tight tracking-tight">
                  Verify your email so we can send you claim and pickup updates
                </p>
                <p className="text-[12px] sm:text-[13px] text-amber-800/85 mt-0.5 truncate">
                  Look for our link at{" "}
                  <span className="font-semibold text-amber-900">{user.email}</span> &mdash; check
                  your spam folder, or send a new one if it isn&rsquo;t there.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {state !== "sent" && (
              <button
                type="button"
                onClick={resend}
                disabled={state === "sending"}
                className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 min-h-11 sm:min-h-0 rounded-full text-[13px] sm:text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {state === "sending" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span className="hidden sm:inline">Sending…</span>
                  </>
                ) : (
                  <span>{state === "error" ? "Try again" : "Send again"}</span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss banner"
              className="p-1.5 rounded-full text-amber-700/70 hover:text-amber-900 hover:bg-amber-100/70 transition-colors"
            >
              <X size={14} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
