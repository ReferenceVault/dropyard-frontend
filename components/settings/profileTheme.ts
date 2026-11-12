import type React from "react";
import { Z, dialogHead as stickyHead, dialogFoot as stickyFoot } from "@/lib/layers";

// Inline styles for the profile-picture settings and its dialogs, matching the
// dashboards' `C` palette and `F` fonts (DropYard_BuyerDashboard.jsx /
// DropYard_SellerDashboard.jsx) so the section reads as part of either one.
// Inline rather than Tailwind for the same reason as DeleteAccountSection:
// the dashboards' global `* { margin: 0; padding: 0 }` outranks utilities.

const c = {
  paper: "#FFFFFF",
  page: "#F3F8F3",
  sand: "#FBFDFB",
  fawn: "#E3EAE2",
  ash: "#60745D",
  mink: "#5F755C",
  ink: "#0F360B",
  green: "#33802B",
  greenDeep: "#2C6126",
  greenMist: "#E2EFE0",
  amber: "#F99605",
  amberDeep: "#A35C00",
  claret: "#CC3B2A",
  claretMist: "#FDECEC",
};
const font = "var(--font-instrument-sans), -apple-system, BlinkMacSystemFont, sans-serif";

export const T = {
  c,
  font,
  card: {
    background: c.paper, border: "1px solid " + c.fawn, borderRadius: 16, padding: 24,
  } as React.CSSProperties,
  h2: { fontFamily: font, fontSize: 16, fontWeight: 800, color: c.ink, letterSpacing: "-0.01em", margin: 0 } as React.CSSProperties,
  muted: { fontFamily: font, fontSize: 13, lineHeight: 1.5, color: c.mink } as React.CSSProperties,
  error: {
    fontFamily: font, fontSize: 12.5, fontWeight: 600, color: c.claret, background: c.claretMist,
    border: "1px solid " + c.claret + "40", borderRadius: 10, padding: "10px 12px",
  } as React.CSSProperties,
  overlay: {
    position: "fixed", inset: 0, zIndex: Z.modal, background: "rgba(15, 54, 11, 0.45)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto",
  } as React.CSSProperties,
  dialog: {
    width: "100%", background: c.paper, borderRadius: 20, padding: "20px 22px 22px",
    // Height cap and scrolling come from the DIALOG_PANEL class (lib/layers.ts).
    boxShadow: "0 24px 60px rgba(15, 54, 11, 0.25)",
  } as React.CSSProperties,
  // Title row and button row stay in view while the dialog body scrolls.
  dialogHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, ...stickyHead(20, c.paper) } as React.CSSProperties,
  dialogFoot: stickyFoot(22, c.paper),
  dialogTitle: { fontFamily: font, fontSize: 18, fontWeight: 800, color: c.ink, margin: 0 } as React.CSSProperties,
  iconButton: {
    width: 40, height: 40, flexShrink: 0, borderRadius: "50%", border: "1px solid " + c.fawn, background: c.paper,
    color: c.ink, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0,
  } as React.CSSProperties,
  primaryButton: (disabled: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 40,
    padding: "10px 20px", borderRadius: 999, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: font, fontSize: 13, fontWeight: 800,
    background: disabled ? c.fawn : c.green, color: disabled ? c.ash : "#fff",
    boxShadow: disabled ? "none" : "0 2px 0 " + c.greenDeep,
  }),
  secondaryButton: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 40,
    padding: "10px 18px", borderRadius: 999, border: "1.5px solid " + c.fawn, background: c.paper,
    cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 800, color: c.ink,
  } as React.CSSProperties,
  linkButton: {
    border: "none", background: "transparent", padding: "8px 2px", cursor: "pointer", minHeight: 40,
    fontFamily: font, fontSize: 13, fontWeight: 700, color: c.greenDeep, textDecoration: "underline", textUnderlineOffset: 3,
  } as React.CSSProperties,
};
