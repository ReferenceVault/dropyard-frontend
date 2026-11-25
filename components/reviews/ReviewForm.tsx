"use client";

// The review form both sides use: a 1–5 star rating (required) and an
// optional message (up to 500 characters, the backend's limit, counted after
// trimming there). Used inline under a buyer's History row, in the buyer's
// "Pickup Confirmed!" dialog (Rate {seller}) and in the seller's "Rate buyer"
// dialog, so all three behave the same. POST /api/claims/:id/review is the
// caller's job (onSubmit); a rejected promise shows its message here and keeps
// what was typed.
//
// Keyboard: the stars are a radio group: Tab reaches it once, the arrow keys
// (and Home/End) change the rating, Space or Enter picks the focused star.
// Focus moves to the stars when the form opens (autoFocus).

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Star } from "lucide-react";
import { MC, MF } from "@/components/messages/theme";

export const REVIEW_TEXT_MAX = 500;
const STAR_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
const srOnly: CSSProperties = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 };

// What the polite live region says as the limit nears: only when a step is
// crossed, not on every keystroke.
function remainingNote(remaining: number): string {
  if (remaining > 100) return "";
  if (remaining <= 0) return "0 characters left. The limit is " + REVIEW_TEXT_MAX + ".";
  const step = [10, 20, 50, 100].find((t) => remaining <= t);
  return step + " or fewer characters left.";
}

export interface ReviewFormProps {
  /** The question above the stars. */
  prompt: string;
  onSubmit: (rating: number, text: string | undefined) => Promise<void>;
  onCancel: () => void;
  autoFocus?: boolean;
  /** inline: under a History row (tinted box). dialog: no box of its own. */
  variant?: "inline" | "dialog";
}

export function ReviewForm({ prompt, onSubmit, onCancel, autoFocus = true, variant = "inline" }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const starRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();
  const promptId = uid + "-prompt";
  const boxId = uid + "-message";
  const limitId = uid + "-limit";
  const guideId = uid + "-guide";
  const needId = uid + "-need";

  useEffect(() => {
    if (!autoFocus) return;
    starRefs.current[0]?.focus();
    // Only as the form opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(n: number, focus = false) {
    const v = Math.min(5, Math.max(1, n));
    setRating(v);
    setError(null);
    if (focus) starRefs.current[v - 1]?.focus();
  }
  function onStarsKey(e: KeyboardEvent<HTMLDivElement>) {
    const from = rating || 0;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = from + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = from - 1;
    else if (e.key === "Home") next = 1;
    else if (e.key === "End") next = 5;
    if (next === null) return;
    e.preventDefault();
    pick(next, true);
  }
  async function submit() {
    if (rating < 1 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(rating, text.trim() ? text.trim() : undefined);
    } catch (err) {
      setError((err instanceof Error && err.message ? err.message : "Couldn't save the review.") + " Please try again.");
      setBusy(false);
    }
  }

  const shown = hover || rating;
  const remaining = REVIEW_TEXT_MAX - text.length;
  const box: CSSProperties = variant === "inline"
    ? { marginTop: 14, padding: 16, borderRadius: 12, background: MC.sand, border: "1px solid " + MC.fawn }
    : {};

  return (
    <div style={box}>
      <p id={promptId} style={{ fontFamily: MF.head, fontSize: 13, fontWeight: 800, color: MC.ink, marginBottom: 8 }}>{prompt}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div
          role="radiogroup"
          aria-labelledby={promptId}
          aria-required="true"
          onKeyDown={onStarsKey}
          onMouseLeave={() => setHover(0)}
          style={{ display: "flex", gap: 2 }}
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const on = n <= shown;
            return (
              <button
                key={n}
                ref={(el) => { starRefs.current[n - 1] = el; }}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={"Rate " + n + " out of 5 stars"}
                tabIndex={rating ? (rating === n ? 0 : -1) : (n === 1 ? 0 : -1)}
                onClick={() => pick(n)}
                onMouseEnter={() => setHover(n)}
                className="dy-focus"
                style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", borderRadius: 10, cursor: "pointer", padding: 0 }}
              >
                <Star size={28} aria-hidden="true" style={{ color: on ? MC.amber : MC.ash }} fill={on ? MC.amber : "none"} strokeWidth={on ? 0 : 1.6}/>
              </button>
            );
          })}
        </div>
        <span aria-hidden="true" style={{ fontFamily: MF.head, fontSize: 13, fontWeight: 700, color: MC.mink, minWidth: 70 }}>
          {shown ? STAR_WORDS[shown] : ""}
        </span>
      </div>

      <label htmlFor={boxId} style={{ display: "block", fontFamily: MF.head, fontSize: 13, fontWeight: 800, color: MC.ink, marginBottom: 6 }}>
        Add a message (optional)
      </label>
      <textarea
        id={boxId}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, REVIEW_TEXT_MAX))}
        maxLength={REVIEW_TEXT_MAX}
        rows={3}
        placeholder="What went well? Anything others should know?"
        aria-describedby={guideId + " " + limitId}
        disabled={busy}
        className="dy-field"
        style={{ width: "100%", minHeight: 84, padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + MC.smoke, background: MC.paper, fontFamily: MF.body, fontSize: 16, lineHeight: 1.45, color: MC.ink, resize: "vertical", boxSizing: "border-box" }}
      />
      {/* The guideline sits under the box (the person reviewed reads the
          message), and is read with the box along with the limit. */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginTop: 6 }}>
        <p id={guideId} style={{ flex: 1, minWidth: 0, fontFamily: MF.body, fontSize: 12, fontWeight: 500, color: MC.mink, lineHeight: 1.45 }}>
          Keep it friendly and about the pickup. Don&rsquo;t include addresses, phone numbers or other contact details.
        </p>
        <span id={limitId} style={srOnly}>Up to {REVIEW_TEXT_MAX} characters.</span>
        <span aria-hidden="true" style={{ flexShrink: 0, fontFamily: MF.body, fontSize: 12, fontWeight: 600, color: remaining <= 20 ? MC.claret : MC.mink }}>{text.length}/{REVIEW_TEXT_MAX}</span>
      </div>
      <span aria-live="polite" style={srOnly}>{remainingNote(remaining)}</span>

      {error && (
        <p role="alert" style={{ marginTop: 10, fontFamily: MF.body, fontSize: 13, fontWeight: 600, color: MC.claret }}>{error}</p>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        {rating < 1 && (
          <span id={needId} style={{ fontFamily: MF.body, fontSize: 12, fontWeight: 600, color: MC.mink, marginRight: "auto" }}>Choose a star rating to submit.</span>
        )}
        <button type="button" onClick={onCancel} disabled={busy}
          style={{ minHeight: 44, padding: "10px 18px", borderRadius: 999, border: "1.5px solid " + MC.fawn, background: MC.paper, color: MC.ink, fontFamily: MF.head, fontSize: 13, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>
          Cancel
        </button>
        <button type="button" onClick={submit} disabled={rating < 1 || busy} aria-describedby={rating < 1 ? needId : undefined} className="cta-primary"
          style={{ minHeight: 44, padding: "10px 20px", borderRadius: 999, border: "none", background: rating < 1 ? MC.smoke : MC.green, color: rating < 1 ? MC.mink : "#fff", fontFamily: MF.head, fontSize: 13, fontWeight: 800, cursor: rating < 1 || busy ? "not-allowed" : "pointer", boxShadow: rating < 1 ? "none" : "0 2px 0 " + MC.greenDeep }}>
          {busy ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </div>
  );
}
