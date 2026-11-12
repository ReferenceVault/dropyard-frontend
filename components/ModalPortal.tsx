"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders a dialog (overlay and all) into <body>, outside whatever stacking
 * context, transform or overflow it was opened from, so its z-index (Z.modal
 * in lib/layers.ts) is compared with the page header's directly. Pair it with
 * <ModalA11y> inside the overlay, as every dialog already does. React events
 * still bubble through the component tree as before.
 *
 * Only used by dialogs, which open in response to a click, so `document` is
 * always there; the guard just keeps a server render from touching it.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
