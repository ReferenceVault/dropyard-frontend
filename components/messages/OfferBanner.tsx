"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Check, CheckCircle, Clock, DollarSign, RefreshCw } from "lucide-react";
import { expiryLabel } from "./format";
import { tidyPickupTime } from "./claimStatus";
import { MC, MF } from "./theme";
import { offerAmountProblem, wholeAmountText } from "@/lib/amountInput";

export interface OfferBannerClaim {
  id: string;
  status: string;
  amount: number;
  /** The listing price. */
  listed: number;
  expiresAt?: string | null;
  /** Whether the viewer is the one who has to answer the current amount. */
  myTurn: boolean;
  buyerConfirmedReceiptAt?: string | null;
  pickupSlot?: string | null;
}

export interface OfferBannerProps {
  role: "buyer" | "seller";
  claim: OfferBannerClaim;
  /** The other person, "First L.". */
  otherName: string;
  busy?: boolean;
  onAccept: () => void;
  /** Resolve true when the counter went through, so the form can close. */
  onCounter: (amount: number) => Promise<boolean> | boolean;
  onDecline: () => void;
  /** Buyer only: take back their own offer while waiting. */
  onWithdraw?: () => void;
  onConfirmReceipt?: () => void;
  onMarkPickedUp?: () => void;
  compact?: boolean;
}

const MAX_AMOUNT = 100000; // PATCH /api/claims/:id/amount's own limit
const srOnly: CSSProperties = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 };

const btn = (kind: "primary" | "outline" | "danger" | "quiet", busy: boolean): CSSProperties => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40, padding: "8px 16px",
  borderRadius: 999, fontFamily: MF.head, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap",
  cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
  ...(kind === "primary" ? { border: "none", background: MC.green, color: "#fff", boxShadow: "0 2px 0 " + MC.greenDeep }
    : kind === "danger" ? { border: "1.5px solid " + MC.claret + "55", background: MC.paper, color: MC.claret }
    : kind === "quiet" ? { border: "1.5px solid " + MC.fawn, background: MC.paper, color: MC.mink }
    : { border: "1.5px solid " + MC.green + "66", background: MC.paper, color: MC.greenDeep }),
});

/**
 * The offer / claim banner at the top of a thread. Every action goes through
 * the claims API in the dashboard's handlers, so the system notice in the
 * thread and the live update to the other person keep working.
 *
 * Pending offer, viewer's turn:     Accept Offer · Counter Offer · Decline
 * Pending offer, waiting on them:   "Waiting for David K. to respond"
 *                                   + Withdraw offer (buyer) / Decline (seller)
 * Waitlisted (another buyer's claim was accepted): no Accept or Counter;
 *                                   Leave waitlist (buyer) / Remove from
 *                                   waitlist (seller). If that sale falls
 *                                   through, the offer becomes active again.
 * Accepted:                         Confirm pickup (buyer) / Mark picked up (seller)
 * Decline and Withdraw ask first; they end the negotiation.
 */
export function OfferBanner(props: OfferBannerProps) {
  // Keyed so a different claim (another thread, or a fresh counter from the
  // other side) starts clean instead of keeping a half-typed counter open.
  const { claim } = props;
  return <OfferBannerBody key={claim.id + "|" + claim.amount + "|" + claim.status} {...props} />;
}

function OfferBannerBody({
  role, claim, otherName, busy = false, onAccept, onCounter, onDecline, onWithdraw, onConfirmReceipt, onMarkPickedUp, compact = false,
}: OfferBannerProps) {
  const [mode, setMode] = useState<"idle" | "counter" | "confirm-decline" | "confirm-withdraw">("idle");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();
  const titleId = useId();
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "counter") inputRef.current?.focus();
    else if (mode !== "idle") firstActionRef.current?.focus();
  }, [mode]);

  const proposed = claim.status === "PROPOSED" || claim.status === "PENDING";
  const waitlisted = claim.status === "WAITLISTED";
  const accepted = claim.status === "ACCEPTED";
  if (!proposed && !waitlisted && !accepted) return null;
  const receipt = !!claim.buyerConfirmedReceiptAt;

  async function submitCounter(e: FormEvent) {
    e.preventDefault();
    const raw = amount.trim();
    const n = Number(raw);
    if (!raw || !Number.isFinite(n) || n <= 0) { setError("Enter an amount of at least $1."); return; }
    if (!Number.isInteger(n)) { setError("Use whole dollars."); return; }
    if (n > MAX_AMOUNT) { setError("That's more than this offer can be."); return; }
    if (n === claim.amount) { setError(`That's the current offer. To agree to $${claim.amount}, accept it.`); return; }
    setError(null);
    const ok = await onCounter(n);
    if (ok) { setMode("idle"); setAmount(""); }
  }

  const tone = proposed || waitlisted
    ? { bg: MC.amberMist, border: MC.amber + "40", icon: MC.amber, title: MC.amberDeep }
    : { bg: MC.greenMist, border: MC.green + "40", icon: MC.green, title: MC.greenDeep };

  const title = waitlisted
    ? (role === "buyer" ? `On the waitlist · $${claim.amount}` : `${otherName} is on the waitlist · $${claim.amount}`)
    : proposed
      ? (claim.myTurn ? `Offer: $${claim.amount}` : `Your offer: $${claim.amount}`)
      : (receipt ? `Picked up · $${claim.amount}` : `Claim in progress · $${claim.amount}`);
  const detail = waitlisted
    ? (role === "buyer"
      ? "The seller accepted another buyer. If that sale falls through, your offer becomes active again."
      : "You accepted another buyer. If that sale falls through, this offer becomes active again and you can choose.")
    : proposed
    ? [`Listed at $${claim.listed}`, claim.expiresAt ? `Expires ${expiryLabel(claim.expiresAt)}` : null].filter(Boolean).join(" · ")
    : role === "buyer"
      ? (receipt ? "You confirmed pickup. Enjoy your item!" : `Coordinate pickup here, then confirm pickup once you have the item.${claim.pickupSlot ? ` Buyer suggested: ${tidyPickupTime(claim.pickupSlot)}.` : ""}`)
      : (receipt ? `${otherName} confirmed pickup. Mark the pickup complete.` : `Coordinate pickup in this thread.${claim.pickupSlot ? ` Buyer suggested: ${tidyPickupTime(claim.pickupSlot)}.` : ""}`);

  let actions: ReactNode = null;
  if (proposed && mode === "counter") {
    // Empty or $0: Send counter is disabled and the hint says why (the
    // submit-time checks below still cover the rest).
    const problem = offerAmountProblem(amount);
    const hintId = errorId + "-hint";
    const describedBy = [error ? errorId : null, problem && !error ? hintId : null].filter(Boolean).join(" ") || undefined;
    actions = (
      <form onSubmit={submitCounter} noValidate style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label htmlFor={inputId} style={{ fontFamily: MF.head, fontSize: 11, fontWeight: 800, color: MC.amberDeep, letterSpacing: "0.04em", textTransform: "uppercase" }}>Your counter</label>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0 10px", minHeight: 40, borderRadius: 10, border: "1.5px solid " + (error ? MC.claret : MC.fawn), background: MC.paper }}>
            <span aria-hidden="true" style={{ fontFamily: MF.head, fontSize: 15, fontWeight: 800, color: MC.ink }}>$</span>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={amount}
              onChange={(e) => { setAmount(wholeAmountText(e.target.value)); if (error) setError(null); }}
              onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setMode("idle"); setError(null); } }}
              placeholder={String(claim.amount)}
              disabled={busy}
              aria-invalid={!!error || undefined}
              aria-describedby={describedBy}
              style={{ width: 84, border: "none", outline: "none", background: "transparent", fontFamily: MF.head, fontSize: 16, fontWeight: 700, color: MC.ink, padding: "8px 0" }}
            />
          </span>
          {error && <p id={errorId} role="alert" style={{ fontFamily: MF.body, fontSize: 12, fontWeight: 600, color: MC.claret, maxWidth: 260 }}>{error}</p>}
          {/* Polite live region, always present so it's announced when the
              text appears; empty and out of the layout otherwise. */}
          <p id={hintId} role="status" aria-live="polite" style={problem && !error ? { fontFamily: MF.body, fontSize: 12, fontWeight: 600, color: MC.mink, maxWidth: 260 } : srOnly}>
            {problem && !error ? problem : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignSelf: "flex-end", marginBottom: error || problem ? 22 : 0 }}>
          <button type="submit" disabled={busy || !!problem} aria-describedby={problem && !error ? hintId : undefined} style={btn("primary", busy || !!problem)}>Send counter</button>
          <button type="button" disabled={busy} onClick={() => { setMode("idle"); setError(null); }} style={btn("quiet", busy)}>Cancel</button>
        </div>
      </form>
    );
  } else if ((proposed || waitlisted) && (mode === "confirm-decline" || mode === "confirm-withdraw")) {
    const withdrawing = mode === "confirm-withdraw";
    actions = (
      <div role="group" aria-label={withdrawing ? (waitlisted ? "Confirm leaving the waitlist" : "Confirm withdrawing your offer") : (waitlisted ? "Confirm removing this buyer from the waitlist" : "Confirm declining this offer")} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <p style={{ fontFamily: MF.body, fontSize: 13, fontWeight: 700, color: MC.ink, flexBasis: "100%" }}>
          {withdrawing
            ? (waitlisted ? `Leave the waitlist? ${otherName} will see that you left.` : `Withdraw your $${claim.amount} offer? ${otherName} will see that you withdrew it.`)
            : (waitlisted ? `Remove ${otherName} from the waitlist? Their $${claim.amount} offer ends.` : `Decline this $${claim.amount} offer? This ends the negotiation.`)}
        </p>
        <button ref={firstActionRef} type="button" disabled={busy} onClick={() => (withdrawing ? onWithdraw?.() : onDecline())} style={btn("danger", busy)}>
          {withdrawing ? (waitlisted ? "Leave waitlist" : "Withdraw offer") : (waitlisted ? "Remove" : "Decline offer")}
        </button>
        <button type="button" disabled={busy} onClick={() => setMode("idle")} style={btn("quiet", busy)}>
          {withdrawing ? (waitlisted ? "Stay on it" : "Keep offer") : (waitlisted ? "Keep them" : "Keep talking")}
        </button>
      </div>
    );
  } else if (waitlisted) {
    actions = (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999, background: MC.paper, border: "1.5px solid " + MC.amber + "40", color: MC.amberDeep, fontFamily: MF.head, fontSize: 12, fontWeight: 800 }}>
          <Clock size={13} aria-hidden="true" /> Waitlisted
        </span>
        {role === "buyer" && onWithdraw && (
          <button type="button" disabled={busy} onClick={() => setMode("confirm-withdraw")} style={btn("danger", busy)}>Leave waitlist</button>
        )}
        {role === "seller" && (
          <button type="button" disabled={busy} onClick={() => setMode("confirm-decline")} style={btn("danger", busy)}>Remove from waitlist</button>
        )}
      </div>
    );
  } else if (proposed && claim.myTurn) {
    actions = (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" disabled={busy} onClick={onAccept} style={btn("primary", busy)}>
          <CheckCircle size={14} aria-hidden="true" /> Accept Offer
        </button>
        <button type="button" disabled={busy} onClick={() => { setMode("counter"); setAmount(""); }} style={btn("outline", busy)}>
          <RefreshCw size={14} aria-hidden="true" /> Counter Offer
        </button>
        <button type="button" disabled={busy} onClick={() => setMode("confirm-decline")} style={btn("danger", busy)}>Decline</button>
      </div>
    );
  } else if (proposed) {
    actions = (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999, background: MC.paper, border: "1.5px solid " + MC.amber + "40", color: MC.amberDeep, fontFamily: MF.head, fontSize: 12, fontWeight: 800 }}>
          <Clock size={13} aria-hidden="true" /> Waiting for {otherName} to respond
        </span>
        {role === "buyer" && onWithdraw && (
          <button type="button" disabled={busy} onClick={() => setMode("confirm-withdraw")} style={btn("danger", busy)}>Withdraw offer</button>
        )}
        {role === "seller" && (
          <button type="button" disabled={busy} onClick={() => setMode("confirm-decline")} style={btn("danger", busy)}>Decline</button>
        )}
      </div>
    );
  } else if (accepted && role === "buyer") {
    actions = receipt ? (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999, background: MC.paper, color: MC.greenDeep, fontFamily: MF.head, fontSize: 12, fontWeight: 800 }}>
        <CheckCircle size={14} aria-hidden="true" /> Pickup confirmed
      </span>
    ) : (
      <button type="button" disabled={busy} onClick={onConfirmReceipt} style={btn("primary", busy)}>
        <CheckCircle size={14} aria-hidden="true" /> Confirm pickup
      </button>
    );
  } else if (accepted) {
    actions = (
      <button type="button" disabled={busy} onClick={onMarkPickedUp} style={btn("primary", busy)}>
        <Check size={14} strokeWidth={3} aria-hidden="true" /> Mark picked up
      </button>
    );
  }

  return (
    <section
      aria-labelledby={titleId}
      aria-busy={busy || undefined}
      style={{ padding: compact ? "12px 14px" : "14px 20px", background: tone.bg, borderBottom: "1px solid " + tone.border, flexShrink: 0 }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 220px" }}>
          <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: 10, background: tone.icon, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {proposed ? <DollarSign size={18} style={{ color: "#fff" }} /> : <CheckCircle size={18} style={{ color: "#fff" }} />}
          </span>
          <div style={{ minWidth: 0 }}>
            <h3 id={titleId} style={{ fontFamily: MF.head, fontSize: 15, fontWeight: 900, color: tone.title, letterSpacing: "-0.01em" }}>{title}</h3>
            <p style={{ fontFamily: MF.body, fontSize: 12, fontWeight: 600, color: MC.mink, marginTop: 2 }}>{detail}</p>
          </div>
        </div>
        {actions}
      </div>
    </section>
  );
}
