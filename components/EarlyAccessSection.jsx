"use client";

// BUG-071 — Early-access email capture.
// Posts to the new dedicated /api/email-subscriptions endpoint which
// silently re-subscribes / dedups. Counter is real (from /count) and
// only shown once the audience crosses 100, per spec.
//
// Layout (feedback point 5): a warm cream band with the driveway-sale photo
// on the right, replacing the plain white block that ran straight on from the
// white Neighbourhoods section above. Sizes are in vw, taken from the
// reference design's proportions, with px floors for tablet and phone.

import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { isValidEmail, NETWORK_ERROR } from "@/lib/submissions";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Sampled from the reference design. No existing token is this warm.
const CREAM = "#fdf3e4";
// The brand accent orange (dy-orange), used for heading accent words across
// the homepage. Was a deeper sampled orange; unified so every section's accent
// word is the same colour.
const ORANGE = "var(--color-dy-accent)";

function MailIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
      }).catch(() => {
        // Offline / unreachable: don't show the browser's bare "Failed to fetch".
        throw new Error(NETWORK_ERROR);
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
    <section
      id="early-access"
      className="relative flex scroll-mt-20 flex-col overflow-hidden font-dy md:block"
      style={{ backgroundColor: CREAM }}
    >
      {/* PHOTO — the design's own driveway-sale photo (flag, seller, rack,
          trike). From tablet up it occupies the right 56.6% of the band, top
          aligned and full height, exactly where the reference places it, with
          its left edge dissolving into the cream. On phones it's a band under
          the text. The section has no padding, so it runs to the edges. */}
      <div aria-hidden="true" className="relative order-2 h-[clamp(210px,58vw,380px)] md:absolute md:inset-y-0 md:right-0 md:h-auto md:w-[56.6%]">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative, fills a box of varying shape */}
        <img
          src="/images/early-access-drop-hd.jpg"
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-[50%_65%] md:object-[80%_0%]"
        />
        {/* Phones: the photo fades up into the cream text panel above it. */}
        <div className="absolute inset-x-0 top-0 h-2/5 md:hidden" style={{ background: `linear-gradient(180deg, ${CREAM} 0%, rgba(253,243,228,0) 100%)` }} />
        {/* Tablet: the text column is proportionally wider, so the fade runs further in. */}
        <div className="absolute inset-0 hidden md:block lg:hidden" style={{ background: `linear-gradient(90deg, ${CREAM} 0%, ${CREAM} 30%, rgba(253,243,228,0.85) 46%, rgba(253,243,228,0.4) 62%, rgba(253,243,228,0) 78%)` }} />
        {/* Desktop: as in the reference — the street at the photo's left edge
            shows faintly through cream, the shoppers are clear. */}
        <div className="absolute inset-0 hidden lg:block" style={{ background: `linear-gradient(90deg, ${CREAM} 0%, rgba(253,243,228,0.82) 9%, rgba(253,243,228,0.45) 19%, rgba(253,243,228,0.14) 29%, rgba(253,243,228,0) 38%)` }} />
      </div>

      <div className="dy-wrap relative z-1 order-1 pb-[clamp(28px,3.6vw,72px)] pt-[clamp(48px,5.6vw,108px)]">
        {/* LABEL */}
        {/* The shared section label (globals.css .dy-eyebrow) — this section's
            design became the style for every homepage section. */}
        <p data-ea="eyebrow" className="dy-eyebrow">Early Access</p>

        {/* HEADLINE — BUG-071 soft / honest copy. Old copy promised a
            weekly newsletter we don't yet send (CASL risk). */}
        {/* dy-h2: the same heading size as every other homepage section. */}
        <h2 className="dy-h2 mt-[clamp(12px,1vw,20px)]">
          Be first in line for
          <span className="block" style={{ color: ORANGE }}>Barrhaven drops.</span>
        </h2>

        {/* SUBTEXT — max-width sets the reference's line breaks on desktop. */}
        <p data-ea="body" className="mt-[clamp(10px,0.8vw,16px)] max-w-[max(300px,43vw)] text-[clamp(16px,1.6vw,30px)] leading-[1.3] text-dy-muted">
          Get notified when the next weekend Drop goes live &mdash; and occasionally about featured finds near you. No spam. Unsubscribe anytime.
        </p>

        {/* INPUT + CTA */}
        <form
          noValidate
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          className="mt-[clamp(20px,2.6vw,50px)] flex flex-col gap-[clamp(8px,1.3vw,24px)] sm:flex-row"
        >
          {/* A label, so a click anywhere on the white field focuses the input. */}
          <label className={`flex h-[clamp(52px,4.25vw,82px)] cursor-text w-full items-center gap-[clamp(10px,0.9vw,18px)] rounded-(--radius-sm) border bg-white px-[clamp(14px,1.6vw,30px)] shadow-[0_1px_3px_rgba(15,54,11,0.06)] transition sm:w-[clamp(240px,29.7vw,570px)] sm:flex-none ${
            error
              ? "border-red-400 animate-shake"
              : "border-white focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-dy-orange"
          }`}>
            <MailIcon className="h-[clamp(18px,1.4vw,26px)] w-[clamp(18px,1.4vw,26px)] shrink-0 text-dy-muted" />
            <input
              type="email"
              name="email"
              autoComplete="email"
              aria-label="Email address"
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? "early-access-error" : undefined}
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // focus:shadow-none!: the field's wrapper draws the focus ring;
              // the global input ring would add a second, square one inside it.
              className="w-full min-w-0 bg-transparent text-[clamp(16px,1.3vw,24px)] text-dy-forest outline-none placeholder:text-dy-muted/80 focus:shadow-none!"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="dy-focus inline-flex h-[clamp(52px,4.25vw,82px)] w-full shrink-0 items-center justify-center whitespace-nowrap rounded-(--radius-sm) bg-dy-green-strong px-[clamp(18px,1.5vw,30px)] text-[clamp(15px,1.3vw,25px)] font-bold text-white shadow-[0_2px_6px_rgba(15,54,11,0.18)] transition-colors hover:bg-(--color-green-hover) disabled:opacity-70 sm:w-auto"
          >
            {loading ? "Saving your spot..." : "Notify me about the Drop"}
          </button>
        </form>

        {/* ERROR */}
        {error && (
          <p id="early-access-error" role="alert" className="mt-3 text-[clamp(13px,1.1vw,20px)] font-medium text-red-600">{error}</p>
        )}

        {/* SUCCESS STATE */}
        {submitted && (
          <p role="status" className="mt-3 flex items-center gap-2 text-[clamp(15px,1.2vw,22px)] font-semibold text-dy-green-strong">
            <span aria-hidden="true">🎉</span> You&rsquo;re in. Friday just got better.
          </p>
        )}

        {/* SOCIAL PROOF — BUG-071 honest behavior.
            Until we have ≥ 100 active subscribers, show a trust line in
            place of a count (the old code faked a 1,482 counter that
            ticked up by random — that's gone). */}
        <p data-ea="note" className="mt-[clamp(12px,1.5vw,28px)] text-[clamp(12px,1.2vw,22px)] text-[#6c7167]">
          {showProof ? (
            <><span className="font-semibold text-dy-forest">{count.toLocaleString()} neighbours</span> already joined. No spam. Unsubscribe anytime.</>
          ) : (
            <>Used only for drop alerts. One-click unsubscribe anytime.</>
          )}
        </p>

        {/* TRUST BADGES */}
        <ul data-ea="trust" className="mt-[clamp(12px,2vw,36px)] flex flex-wrap gap-x-[clamp(18px,3.3vw,60px)] gap-y-2 text-[clamp(13px,1.3vw,24px)] text-[#525b52]">
          {["Privacy-first", "No spam ever", "One-click unsubscribe"].map((t) => (
            <li key={t} className="flex items-center gap-[0.4em]">
              <Check aria-hidden="true" strokeWidth={2.75} className="h-[1em] w-[1em] shrink-0 text-dy-forest" />
              {t}
            </li>
          ))}
        </ul>

        {/* TAGLINE — green italic, orange swoosh under "another." */}
        <p data-ea="tagline" className="mt-[clamp(24px,3vw,56px)] text-[clamp(18px,2vw,38px)] italic text-dy-forest">
          From one home <span className="font-semibold">to{" "}
            <span className="relative inline-block">
              another.
              {/* Brush stroke traced from the design: thick and low under the
                  "a", arching up, tapering to a point under the full stop.
                  A filled shape (not a stroke) so the taper scales with the text. */}
              <svg aria-hidden="true" viewBox="0 0 65 8" preserveAspectRatio="none" className="absolute left-0 top-[calc(100%-0.12em)] h-[0.47em] w-full overflow-visible">
                <path fill={ORANGE} d="M0.6 3.9 C12 2 26 0.6 40 0.6 C52 0.6 60 1.4 64.8 2.2 Q65.4 2.6 64.7 2.8 C60 2.1 52 2.5 40 2.6 C26 2.6 12 4 1 6.2 Q-0.4 5.2 0.6 3.9 Z" />
              </svg>
            </span>
          </span>
        </p>
      </div>
    </section>
  );
}
