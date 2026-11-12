// One z-index scale for the whole app, and the shared layout for dialogs.
//
// Why dialogs live at the top of this scale AND are rendered into <body>
// (components/ModalPortal): a z-index only competes inside its stacking
// context. The buyer dashboard's page content sits in a `position: relative;
// z-index: 1` wrapper (so it paints above the fixed hills backdrop), which
// made every dialog rendered inside it a z-index-1 layer: the sticky top bar
// (z-index 40) painted over the top of "Ask a question", the report dialog,
// and the rest. Portalled to <body>, a dialog's z-index is compared with the
// header's directly, wherever in the tree it was opened.
import type { CSSProperties } from "react";

export const Z = {
  /** In-flow content lifted over a decorative background. */
  raised: 1,
  /** Sticky in-page bars (e.g. a pinned notice). */
  sticky: 30,
  /** Dashboard top bars. */
  header: 40,
  /** Menus and dropdowns opened from the page or the header. */
  popover: 50,
  /** Mobile bottom navigation. */
  bottomNav: 60,
  /** Toasts. */
  toast: 100,
  /** Every dialog, sheet and lightbox (rendered through ModalPortal). */
  modal: 1000,
  /** A dialog opened from inside another dialog. */
  modalOver: 1010,
} as const;

/**
 * The class for a dialog's panel (the white card): caps its height to the
 * visible screen, `100dvh` so mobile browser bars and an open keyboard are
 * accounted for (with a `100vh` fallback), and lets the panel scroll inside.
 * Defined in app/globals.css because inline styles can't carry the fallback.
 */
export const DIALOG_PANEL = "dy-dialog-panel";
/** The same for bottom sheets: up to 88% of the visible height. */
export const SHEET_PANEL = "dy-sheet-panel";

// Sticky through a variable: on a very short screen (a phone in landscape
// with the keyboard up) app/globals.css switches it to `static`, so the
// field being typed in gets the little room there is.
const STICKY = "var(--dy-dialog-sticky, sticky)" as CSSProperties["position"];

/**
 * Keeps a dialog's title row at the top of its scrolling panel. `pad` is the
 * panel's top padding: the row bleeds into it so scrolled content never
 * shows above the title, and looks exactly as before when not scrolled.
 */
export function dialogHead(pad: number, background = "#FFFFFF"): CSSProperties {
  return { position: STICKY, top: -pad, marginTop: -pad, paddingTop: pad, background, zIndex: 2 };
}

/** Keeps a dialog's action buttons at the bottom of its scrolling panel. */
export function dialogFoot(pad: number, background = "#FFFFFF"): CSSProperties {
  return { position: STICKY, bottom: -pad, marginBottom: -pad, paddingBottom: pad, background, zIndex: 2 };
}
