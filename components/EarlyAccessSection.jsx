"use client";

// BUG-071 — Early-access email capture.
// Posts to the new dedicated /api/email-subscriptions endpoint which
// silently re-subscribes / dedups. Counter is real (from /count) and
// only shown once the audience crosses 100, per spec.

import React, { useState, useEffect } from "react";
import { isValidEmail } from "@/lib/submissions";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function MailIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="2" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function EarlyAccessSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Real subscriber count from backend. `showProof` is false until the
  // count crosses the threshold (100). Until then we hide the counter line
  // entirely and replace it with a privacy-first trust line.
  const [count, setCount] = useState(0);
  const [showProof, setShowProof] = useState(false);

  // Persist email across visits — only as a convenience for the field's
  // initial value. AuthContext clears this on signout (BUG-063).
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("dropyard_email") : null;
    if (saved) setEmail(saved);
  }, []);

  // Real count from the backend. Re-fetched after every successful
  // submission so the number ticks up naturally.
  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE_URL}/api/email-subscriptions/count`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return;
        if (typeof j.total === "number")    setCount(j.total);
        if (typeof j.showProof === "boolean") setShowProof(j.showProof);
      })
      .catch(() => { /* silent — homepage shouldn't error */ });
    return () => { cancelled = true; };
  }, [submitted]);

  const handleSubmit = async () => {
    if (!isValidEmail(email)) {
      setError("Enter a valid email address");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/email-subscriptions`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), source: "homepage-early-access" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.error) || "Could not save your spot. Try again.");
      }
      localStorage.setItem("dropyard_email", email);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your spot. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // BUG-071 — id="early-access" anchor target for the hero card's
    // "Get Notified" button. scroll-mt-20 leaves room for the sticky
    // header so the headline isn't clipped after the smooth scroll.
    <section id="early-access" className="dy-section dy-wrap scroll-mt-20 border-t border-dy-line bg-white">
      <div className="max-w-4xl mx-auto text-center">

        {/* LABEL */}
        <p className="dy-eyebrow">
          Early Access
        </p>

        {/* HEADLINE — BUG-071 soft / honest copy. Old copy promised a
            weekly newsletter we don't yet send (CASL risk). */}
        <h2 className="dy-h2 mt-3">
          Be first in line for{" "}
          <span className="text-dy-orange">Barrhaven drops.</span>
        </h2>

        {/* SUBTEXT */}
        <p className="dy-body mt-4 max-w-2xl mx-auto">
          We&rsquo;ll email you when the next weekend Drop goes live &mdash; and occasionally with featured items. No spam. Unsubscribe anytime.
        </p>

        {/* INPUT + CTA */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className={`relative flex items-center gap-3 w-full sm:w-auto bg-white rounded px-5 min-h-[50px] border transition ${
            error
              ? "border-red-400 animate-shake"
              : "border-dy-line focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-dy-orange"
          }`}>
            <MailIcon className="h-5 w-5 text-dy-muted" />
            <input
              type="email"
              aria-label="Email address"
              placeholder="you@barrhaven.ca"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="outline-none bg-transparent text-[clamp(16px,1.05vw,20px)] text-dy-forest w-full sm:w-72"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="dy-btn dy-btn--primary dy-focus w-full sm:w-auto disabled:opacity-70"
          >
            {loading ? "Saving your spot..." : "Save my spot"}
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <p className="mt-4 text-[13px] text-red-500">{error}</p>
        )}

        {/* SUCCESS STATE */}
        {submitted && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="text-[23px]">🎉</div>
            <p className="text-[15px] text-dy-green-strong font-semibold">
              You&rsquo;re in. Friday just got better.
            </p>
          </div>
        )}

        {/* SOCIAL PROOF — BUG-071 honest behavior.
            Until we have ≥ 100 active subscribers, show a trust line in
            place of a count (the old code faked a 1,482 counter that
            ticked up by random — that's gone). */}
        <div className="mt-5 text-[clamp(14px,1vw,19px)] text-dy-muted">
          {showProof ? (
            <><span className="font-semibold text-dy-forest">{count.toLocaleString()} neighbours</span> already joined &middot; No spam &middot; Unsubscribe anytime</>
          ) : (
            <>Your email is only used for drop alerts &middot; Unsubscribe anytime</>
          )}
        </div>

        {/* TRUST BADGES */}
        <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 text-[clamp(14px,1vw,19px)] text-dy-muted">
          <span>&#10004; Privacy-first</span>
          <span>&#10004; No spam ever</span>
          <span>&#10004; One-click unsubscribe</span>
        </div>
      </div>
    </section>
  );
}
