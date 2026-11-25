"use client";

// "Pickup Confirmed!" — what the buyer sees once their Confirm pickup has
// gone through (from the Claims page or the Messages banner). "Rate
// {seller}" turns the same dialog into the review form (ReviewForm, the one
// History uses); "Maybe Later", Escape, Cancel and the backdrop close it, and
// the buyer can still review from the item's row in History.

import { useState } from "react";
import { CheckCircle, Star } from "lucide-react";
import { ModalA11y } from "@/components/ModalA11y";
import { ModalPortal } from "@/components/ModalPortal";
import { Z, DIALOG_PANEL } from "@/lib/layers";
import { MC, MF } from "@/components/messages/theme";
import { ReviewForm } from "./ReviewForm";

export interface PickupConfirmedDialogProps {
  /** The seller, as the buyer's pages name them (full name). */
  sellerName: string;
  /** POST /api/claims/:id/review; reject to show the error in the form. */
  onSubmitReview: (rating: number, text: string | undefined) => Promise<void>;
  /** After a review is saved (the caller thanks the buyer). */
  onReviewed: () => void;
  /** Maybe Later / Escape / Cancel. */
  onClose: () => void;
  isMobile?: boolean;
}

export function PickupConfirmedDialog({ sellerName, onSubmitReview, onReviewed, onClose, isMobile = false }: PickupConfirmedDialogProps) {
  const [step, setStep] = useState<"done" | "review">("done");
  const pad = isMobile ? 22 : 28;
  return (
    <ModalPortal>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.modal, padding: isMobile ? 16 : 24, backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
      >
        <ModalA11y label="Pickup confirmed" onClose={onClose}/>
        <div onClick={(e) => e.stopPropagation()} className={"fade-in " + DIALOG_PANEL} style={{ width: 480, maxWidth: "100%", borderRadius: 24, background: MC.paper, boxShadow: "0 24px 60px rgba(31, 29, 25, 0.25)", padding: pad }}>
          {step === "done" ? (
            <div style={{ textAlign: "center" }}>
              <div aria-hidden="true" style={{ width: 64, height: 64, borderRadius: "50%", background: MC.greenMist, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <CheckCircle size={30} strokeWidth={2.2} style={{ color: MC.greenDeep }}/>
              </div>
              <h2 style={{ fontFamily: MF.head, fontSize: 22, fontWeight: 900, color: MC.ink, letterSpacing: "-0.02em", marginBottom: 10 }}>Pickup Confirmed!</h2>
              <p style={{ fontFamily: MF.body, fontSize: 14, fontWeight: 500, color: MC.mink, lineHeight: 1.55, marginBottom: 12 }}>
                You&rsquo;ve successfully confirmed receiving your item. Your transaction is now complete!
              </p>
              <p style={{ fontFamily: MF.body, fontSize: 14, fontWeight: 600, color: MC.ink, lineHeight: 1.55, marginBottom: 20 }}>
                How was your experience with {sellerName}? Your feedback helps build a trusted neighbourhood community.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button type="button" onClick={() => setStep("review")} className="cta-primary"
                  style={{ width: "100%", minHeight: 48, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", borderRadius: 999, border: "none", background: MC.green, color: "#fff", fontFamily: MF.head, fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 0 " + MC.greenDeep }}>
                  <Star size={17} strokeWidth={2.3} aria-hidden="true"/> Rate {sellerName}
                </button>
                <button type="button" onClick={onClose}
                  style={{ width: "100%", minHeight: 48, padding: "12px 20px", borderRadius: 999, border: "1.5px solid " + MC.fawn, background: MC.paper, color: MC.ink, fontFamily: MF.head, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                  Maybe Later
                </button>
              </div>
              <p style={{ fontFamily: MF.body, fontSize: 12.5, fontWeight: 500, color: MC.mink, lineHeight: 1.5, marginTop: 18 }}>
                Thanks for keeping great finds moving from one home to another.
              </p>
            </div>
          ) : (
            <div>
              <h2 style={{ fontFamily: MF.head, fontSize: 20, fontWeight: 900, color: MC.ink, letterSpacing: "-0.02em", marginBottom: 12 }}>Rate {sellerName}</h2>
              <ReviewForm
                variant="dialog"
                prompt={"How was your experience with " + sellerName + "?"}
                onSubmit={async (rating, text) => { await onSubmitReview(rating, text); onReviewed(); }}
                onCancel={onClose}
              />
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
