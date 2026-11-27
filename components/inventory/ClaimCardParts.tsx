"use client";

// The seller's claim cards in My items (Claimed · action pending / pickup
// pending), the client's redesign: a cream header strip with the status and a
// step tracker, then the item, a paper price tag and the actions. These are
// the presentational parts; OfferCard and PickupCard in
// DropYard_SellerDashboard.jsx decide what goes in them. Styles: .dy-cc-* and
// .dy-tag-* in ClaimCard.css (container queries, so the card follows its own
// width whether the sidebar is open or not).

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import "./ClaimCard.css";

export type ClaimStepState = "done" | "current" | "todo";
export interface ClaimStep { label: string; state: ClaimStepState }

/** The card: header strip (status, plain-language line, steps) over the body. */
export function ClaimCardFrame({ ariaLabel, status, line, steps, children }: {
  ariaLabel: string;
  status: string;
  line?: string | null;
  steps: ClaimStep[];
  children: ReactNode;
}) {
  return (
    <article className="dy-cc" aria-label={ariaLabel}>
      <div className="dy-cc-head">
        <p className="dy-cc-status">
          <span className="dy-cc-dot" aria-hidden="true"/>
          <span className="dy-cc-badge">{status}</span>
          {line && <span className="dy-cc-sep" aria-hidden="true">·</span>}
          {line && <span className="dy-cc-line">{line}</span>}
        </p>
        <ClaimSteps steps={steps}/>
      </div>
      {children}
    </article>
  );
}

/**
 * The step tracker. Screen readers get "Step 3 of 4, current: …" first, then
 * the list with each step marked done, current or next. Narrow cards hide the
 * list visually (it's still read) and show "Step 3 of 4: …" instead.
 */
export function ClaimSteps({ steps }: { steps: ClaimStep[] }) {
  const idx = Math.max(0, steps.findIndex((s) => s.state === "current"));
  const current = steps[idx];
  if (!current) return null;
  return (
    <div className="dy-cc-track">
      <p className="dy-cc-sr">{"Step " + (idx + 1) + " of " + steps.length + ", current: " + current.label + "."}</p>
      <ol className="dy-cc-steps" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={i} className={"dy-cc-step dy-cc-step--" + s.state} aria-current={s.state === "current" ? "step" : undefined}>
            <span className={"dy-cc-join" + (s.state === "todo" ? " dy-cc-join--todo" : "")} aria-hidden="true"/>
            <span className="dy-cc-mark" aria-hidden="true">
              {s.state === "done" && <Check size={11} strokeWidth={3.2}/>}
            </span>
            <span className="dy-cc-sr">{s.state === "done" ? "Done: " : s.state === "current" ? "Current: " : "Next: "}</span>
            <span className="dy-cc-steplabel">{s.label}</span>
          </li>
        ))}
      </ol>
      <p className="dy-cc-compact" aria-hidden="true">
        <span className="dy-cc-bars">
          {steps.map((s, i) => <span key={i} className={"dy-cc-bar dy-cc-bar--" + s.state}/>)}
        </span>
        <span>{"Step " + (idx + 1) + " of " + steps.length + ": "}<strong>{current.label}</strong></span>
      </p>
    </div>
  );
}

/**
 * The paper price tag on a string, in the Discover sign's handwriting
 * (Caveat). Every amount is text; the hidden labels say what each one is.
 */
export function PriceTag({ amount, amountLabel, strike = null, note = null, sold = false }: {
  amount: string;
  amountLabel: string;
  strike?: string | null;
  note?: string | null;
  sold?: boolean;
}) {
  return (
    <div className={"dy-tag" + (sold ? " dy-tag--sold" : "")}>
      <svg className="dy-tag-string" viewBox="0 0 60 30" aria-hidden="true" focusable="false">
        <path d="M2 12 C 14 4, 22 26, 36 18 S 52 14, 59 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
      <div className="dy-tag-paper">
        <span className="dy-tag-hole" aria-hidden="true"/>
        {(strike || note) && (
          <span className="dy-tag-top">
            {strike && <s className="dy-tag-strike"><span className="dy-cc-sr">Listed at </span>{strike}</s>}
            {note && <span className="dy-tag-note">{note}</span>}
          </span>
        )}
        {sold && <span className="dy-tag-sold" aria-hidden="true">Sold</span>}
        <span className="dy-tag-amount"><span className="dy-cc-sr">{amountLabel + " "}</span>{amount}</span>
      </div>
    </div>
  );
}
