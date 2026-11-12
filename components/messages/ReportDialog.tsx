"use client";

import { useId, useState, type FormEvent } from "react";
import { CheckCircle, Flag, X } from "lucide-react";
import { ModalA11y } from "@/components/ModalA11y";
import { ModalPortal } from "@/components/ModalPortal";
import { Z, DIALOG_PANEL, dialogHead, dialogFoot } from "@/lib/layers";
import { MC, MF } from "./theme";

const REASONS = {
  listing: [
    "Prohibited or unsafe item",
    "Misleading description or photos",
    "Scam or suspicious listing",
    "Other",
  ],
  user: [
    "Harassment or abusive messages",
    "Scam or suspicious behaviour",
    "Didn't show up for pickup",
    "Spam",
    "Other",
  ],
} as const;
const MAX_DETAILS = 1000;

export interface ReportDialogProps {
  /** A buyer reports the listing, a seller reports the user. */
  kind: "listing" | "user";
  /** The item title, or the person's "First L." name. */
  subject: string;
  onSubmit: (report: { reason: string; details: string }) => Promise<void>;
  onClose: () => void;
}

/** Short report form from the thread's ⋮ menu. Lands in the admin Inbox. */
export function ReportDialog({ kind, subject, onSubmit, onClose }: ReportDialogProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const detailsId = useId();
  const errorId = useId();
  const heading = kind === "listing" ? "Report this listing" : `Report ${subject}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!reason) { setError("Choose a reason."); return; }
    if (reason === "Other" && !details.trim()) { setError("Tell us a little about what happened."); return; }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ reason, details: details.trim() });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't send the report. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalPortal>
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: Z.modal, background: "rgba(15,54,11,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <ModalA11y label={heading} onClose={busy ? null : onClose} />
      <div className={DIALOG_PANEL} style={{ width: "100%", maxWidth: 440, borderRadius: 18, background: MC.paper, boxShadow: "0 24px 60px rgba(15,54,11,0.25)" }}>
        <header style={{ ...dialogHead(0, MC.paper), display: "flex", alignItems: "flex-start", gap: 12, padding: "18px 20px 10px" }}>
          <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: "50%", background: MC.claretMist, color: MC.claret, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Flag size={17} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: MF.head, fontSize: 18, fontWeight: 900, color: MC.ink }}>{heading}</h2>
            {kind === "listing" && <p style={{ fontFamily: MF.body, fontSize: 13, fontWeight: 600, color: MC.mink, marginTop: 2, overflowWrap: "anywhere" }}>{subject}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: MC.sand, color: MC.mink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        {done ? (
          <div role="status" style={{ padding: "8px 20px 20px" }}>
            <p style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MF.body, fontSize: 14, fontWeight: 700, color: MC.greenDeep }}>
              <CheckCircle size={18} aria-hidden="true" /> Thanks. Our team will review your report.
            </p>
            <p style={{ fontFamily: MF.body, fontSize: 13, fontWeight: 500, color: MC.mink, marginTop: 6 }}>
              {kind === "listing" ? "The seller isn't told who reported the listing." : "They aren't told who reported them."}
            </p>
            <button type="button" onClick={onClose} style={{ marginTop: 16, minHeight: 44, padding: "10px 20px", borderRadius: 999, border: "none", background: MC.green, color: "#fff", fontFamily: MF.head, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate style={{ padding: "4px 20px 20px" }}>
            <fieldset style={{ border: "none", padding: 0, margin: 0 }} aria-describedby={error ? errorId : undefined}>
              <legend style={{ fontFamily: MF.head, fontSize: 13, fontWeight: 800, color: MC.ink, marginBottom: 8 }}>What&apos;s wrong?</legend>
              {REASONS[kind].map((r) => (
                <label key={r} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "6px 10px", borderRadius: 10, border: "1px solid " + (reason === r ? MC.green + "66" : MC.fawn), background: reason === r ? MC.greenWash : MC.paper, marginBottom: 6, cursor: "pointer", fontFamily: MF.body, fontSize: 14, fontWeight: 600, color: MC.ink }}>
                  <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={() => { setReason(r); setError(null); }} style={{ width: 18, height: 18, accentColor: MC.green }} />
                  {r}
                </label>
              ))}
            </fieldset>
            <label htmlFor={detailsId} style={{ display: "block", fontFamily: MF.head, fontSize: 13, fontWeight: 800, color: MC.ink, margin: "10px 0 6px" }}>
              Details {reason === "Other" ? "" : <span style={{ fontWeight: 600, color: MC.ash }}>(optional)</span>}
            </label>
            <textarea
              id={detailsId}
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, MAX_DETAILS))}
              rows={3}
              maxLength={MAX_DETAILS}
              placeholder="Anything that helps us look into it"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + MC.fawn, fontFamily: MF.body, fontSize: 16, color: MC.ink, resize: "vertical", background: MC.paper }}
            />
            <p style={{ fontFamily: MF.body, fontSize: 11, fontWeight: 500, color: MC.ash, textAlign: "right" }}>{details.length}/{MAX_DETAILS}</p>
            {error && <p id={errorId} role="alert" style={{ fontFamily: MF.body, fontSize: 13, fontWeight: 700, color: MC.claret, marginTop: 6 }}>{error}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 14, flexWrap: "wrap", ...dialogFoot(20, MC.paper) }}>
              <button type="button" onClick={onClose} disabled={busy} style={{ minHeight: 44, padding: "10px 18px", borderRadius: 999, border: "1.5px solid " + MC.fawn, background: MC.paper, color: MC.mink, fontFamily: MF.head, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                Cancel
              </button>
              <button type="submit" disabled={busy} style={{ minHeight: 44, padding: "10px 20px", borderRadius: 999, border: "none", background: MC.claret, color: "#fff", fontFamily: MF.head, fontSize: 14, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
                {busy ? "Sending…" : "Send report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
    </ModalPortal>
  );
}
