"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog behaviour for the dashboards' hand-built overlays. Render it as the
 * first child of the overlay: it names the overlay as a dialog, moves focus in
 * and keeps it there, locks the page behind, and hands focus back on close.
 *
 * `onClose` is what Esc does, so pass the overlay's existing dismiss action.
 * Leave it out when dismissing would do something, like a rating prompt whose
 * only way out is a Skip that writes to the API.
 */
export function ModalA11y({ label, onClose = null }) {
  const anchor = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  // Before paint, or the entrance animation would start a frame late.
  useLayoutEffect(() => { anchor.current?.parentElement?.classList.add("dy-modal"); }, []);

  useEffect(() => {
    const dialog = anchor.current?.parentElement;
    if (!dialog) return;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", label);
    document.body.style.overflow = "hidden";

    if (!dialog.contains(document.activeElement)) {
      const first = dialog.querySelector(FOCUSABLE);
      if (first) first.focus();
      else { dialog.tabIndex = -1; dialog.focus(); }
    }

    const onKeyDown = (e) => {
      if (e.key === "Escape" && closeRef.current) {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...dialog.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!dialog.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
    // The dialog's name is fixed for as long as it's open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <span ref={anchor} hidden />;
}
