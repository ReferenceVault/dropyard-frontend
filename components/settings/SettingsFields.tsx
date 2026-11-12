"use client";

// Form pieces for the Settings pages of both dashboards (seller Settings and
// buyer Profile). They used to be two identical copies, SF_* in
// DropYard_SellerDashboard.jsx and BSF_* in DropYard_BuyerDashboard.jsx; the
// dashboards now import these under their old names. Colours and type are the
// dashboards' own tokens (see components/messages/theme.ts).

import { createContext, useContext, useEffect, useId, type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertCircle, Check, CheckCircle, Eye, EyeOff, X } from "lucide-react";
import { MC, MF } from "@/components/messages/theme";

/** Text on a disabled button: 5.3:1 on the fawn fill (C.ash was 4.1:1). */
export const DISABLED_TEXT = "#4F634C";
/** Off track of a Toggle: 3.4:1 against white, so the control is visible when off. */
const TOGGLE_OFF = "#7E8F7B";

/* A Field hands its ids to the Input inside it, so the label names the input
   and the helper describes it (one control per Field). A control that isn't
   an Input (e.g. a <select>) takes them from useFieldIds(). */
const FieldIds = createContext<{ id: string; helperId?: string } | null>(null);
export const useFieldIds = () => useContext(FieldIds);

export function Field({ label, helper, children }: { label: ReactNode; helper?: ReactNode; children: ReactNode }) {
  const id = useId();
  const helperId = helper ? id + "-help" : undefined;
  return (
    <div>
      <label htmlFor={id} style={{ display: "block", fontFamily: MF.head, fontSize: 10, fontWeight: 800, color: MC.mink, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>{label}</label>
      <FieldIds.Provider value={{ id, helperId }}>{children}</FieldIds.Provider>
      {helper && <p id={helperId} style={{ fontFamily: MF.body, fontSize: 11, color: MC.ash, marginTop: 6 }}>{helper}</p>}
    </div>
  );
}

export function Input({ style, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const ids = useFieldIds();
  return (
    <input
      id={ids?.id}
      aria-describedby={ids?.helperId}
      {...props}
      style={{
        width: "100%", padding: "10px 14px", borderRadius: 10,
        border: "1.5px solid " + MC.fawn, background: MC.paper,
        fontFamily: MF.body, fontSize: 14, fontWeight: 500, color: MC.ink,
        outline: "none", boxSizing: "border-box",
        ...(props.disabled ? { opacity: 0.75, cursor: "not-allowed" } : {}),
        ...style,
      }}
    />
  );
}

/* Password input with a reveal toggle. The caller owns `show`. Right padding
   clears the eye button. */
export function PasswordInput({ show, onToggleShow, ...props }: InputHTMLAttributes<HTMLInputElement> & { show: boolean; onToggleShow: () => void }) {
  return (
    <div style={{ position: "relative" }}>
      <Input {...props} type={show ? "text" : "password"} style={{ paddingRight: 42 }}/>
      <button
        type="button"
        onClick={onToggleShow}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 6, border: "none", background: "none", color: MC.ash, cursor: "pointer" }}
      >
        {show ? <EyeOff size={15}/> : <Eye size={15}/>}
      </button>
    </div>
  );
}

/* Hover, pressed and keyboard-focus states come from .dy-sf-btn in
   app/globals.css (inline styles can't express them). */
export function PrimaryButton({ disabled, loading, children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled}
      aria-busy={loading || undefined}
      className={"dy-sf-btn" + (className ? " " + className : "")}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        minHeight: 40, padding: "10px 20px", borderRadius: 999, border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: MF.head, fontSize: 13, fontWeight: 800,
        background: disabled ? MC.fawn : MC.green,
        color: disabled ? DISABLED_TEXT : "#fff",
        boxShadow: disabled ? "none" : "0 2px 0 " + MC.greenDeep,
        opacity: loading ? 0.7 : 1,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

export function ErrorBanner({ message }: { message: ReactNode }) {
  return (
    <div role="alert" style={{ padding: "10px 12px", borderRadius: 10, background: MC.claretMist, border: "1px solid " + MC.claret + "40", display: "flex", alignItems: "flex-start", gap: 8 }}>
      <AlertCircle size={14} style={{ color: MC.claret, flexShrink: 0, marginTop: 1 }}/>
      <p style={{ fontFamily: MF.body, fontSize: 12, fontWeight: 600, color: MC.claret }}>{message}</p>
    </div>
  );
}

export function SavedBadge({ label, id }: { label: ReactNode; id?: string }) {
  return (
    <p id={id} role="status" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MF.head, fontSize: 12, fontWeight: 800, color: MC.greenDeep }}>
      <CheckCircle size={13} aria-hidden="true"/> {label}
    </p>
  );
}

/**
 * The bottom row of a Settings card: a line of text on the left, the Save
 * button on the right. After a save the text is the "saved" badge. Otherwise
 * it says what the button needs (`blockedHint`, while it's disabled for want
 * of input) or what saving will do (`hint`). The button points at that text
 * with aria-describedby, so a screen reader announces the reason too.
 */
export function SaveRow({ savedLabel = null, hint, blockedHint = null, disabled, loading = false, label, loadingLabel = "Saving...", type = "submit", onClick, style }: {
  savedLabel?: ReactNode | null;
  hint: ReactNode;
  blockedHint?: ReactNode | null;
  disabled: boolean;
  loading?: boolean;
  label: ReactNode;
  loadingLabel?: ReactNode;
  type?: "submit" | "button";
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const id = useId();
  const text = !loading && disabled && blockedHint ? blockedHint : hint;
  return (
    <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", paddingTop: 14, borderTop: "1px solid " + MC.fawn, ...style }}>
      {savedLabel
        ? <SavedBadge id={id} label={savedLabel}/>
        : <p id={id} style={{ fontFamily: MF.body, fontSize: 12, color: MC.ash, flex: "1 1 160px", minWidth: 0 }}>{text}</p>}
      <PrimaryButton type={type} onClick={onClick} disabled={disabled} loading={loading} aria-describedby={id} style={{ marginLeft: "auto" }}>
        {loading ? loadingLabel : label}
      </PrimaryButton>
    </div>
  );
}

/* Top-of-page success banner: fades in, goes 2.6s later. */
export function SuccessBanner({ message, onClose }: { message: ReactNode; onClose: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div role="status" className="fade-in" style={{ position: "sticky", top: 0, zIndex: 30, maxWidth: 1160, margin: "0 auto 16px", padding: "12px 16px", borderRadius: 12, background: MC.greenMist, border: "1px solid " + MC.green + "55", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 6px 20px rgba(48, 132, 36, 0.12)" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: MC.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Check size={15} style={{ color: "#fff" }} strokeWidth={3}/>
      </div>
      <p style={{ fontFamily: MF.head, fontSize: 13.5, fontWeight: 800, color: MC.greenDeep, flex: 1 }}>{message}</p>
      <button onClick={onClose} aria-label="Dismiss" style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: MC.greenDeep }}>
        <X size={14} strokeWidth={2.5}/>
      </button>
    </div>
  );
}

/**
 * On/off switch. A screen reader hears "<label>, switch, on/off". While a
 * change is saving (`busy`) clicks are ignored, but the button stays
 * focusable (a native `disabled` would drop keyboard focus mid-toggle).
 */
export function Toggle({ on, onClick, label, busy = false, disabled = false }: { on: boolean; onClick: () => void; label: string; busy?: boolean; disabled?: boolean }) {
  const inactive = busy || disabled;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-busy={busy || undefined}
      aria-disabled={inactive || undefined}
      onClick={() => { if (!inactive) onClick(); }}
      className="dy-sf-toggle"
      style={{
        width: 36, height: 22, borderRadius: 999, border: "none",
        cursor: inactive ? "not-allowed" : "pointer",
        background: on ? MC.green : TOGGLE_OFF,
        position: "relative", transition: "background 150ms", padding: 0, flexShrink: 0,
        opacity: inactive ? 0.6 : 1,
      }}
    >
      <span aria-hidden="true" style={{
        position: "absolute", top: 2, left: on ? 16 : 2,
        width: 18, height: 18, borderRadius: "50%",
        background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        transition: "left 150ms",
      }}/>
    </button>
  );
}
