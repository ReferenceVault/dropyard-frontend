"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// The last few elements that took focus, newest last. A dialog whose own
// button has `autoFocus` (the sign-out prompts) already holds focus by the
// time the effect below runs, so document.activeElement can't say what
// opened it; this can. Recorded in the capture phase, before anything else.
const recentFocus = [];
if (typeof document !== "undefined") {
  document.addEventListener("focusin", (e) => {
    recentFocus.push(e.target);
    if (recentFocus.length > 12) recentFocus.shift();
  }, true);
}
/**
 * Dialog panels keep their title and button rows pinned (lib/layers.ts). When
 * a field gains focus, or the keyboard opens and the viewport shrinks, the
 * browser scrolls the field to the panel's edge, which can be under one of
 * those rows. Nudge the panel so the field sits between them.
 */
function keepFieldClear(dialog) {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement) || !dialog.contains(el) || !el.matches("input, textarea, select, [contenteditable='true']")) return;
  let box = el.parentElement;
  while (box && box !== dialog) {
    if (/(auto|scroll)/.test(getComputedStyle(box).overflowY) && box.scrollHeight > box.clientHeight) break;
    box = box.parentElement;
  }
  if (!box || box === dialog) return;
  const b = box.getBoundingClientRect();
  let top = b.top, bottom = b.bottom;
  for (const row of box.querySelectorAll("*")) {
    if (getComputedStyle(row).position !== "sticky") continue;
    const r = row.getBoundingClientRect();
    if (r.top + r.height / 2 < b.top + b.height / 2) top = Math.max(top, r.bottom);
    else bottom = Math.min(bottom, r.top);
  }
  const f = el.getBoundingClientRect();
  if (f.top < top) box.scrollTop -= top - f.top + 8;
  else if (f.bottom > bottom) box.scrollTop += Math.min(f.bottom - bottom + 8, f.top - top - 8);
}

/** The most recently focused element that is still on the page and outside `dialog`. */
function lastFocusOutside(dialog) {
  for (let i = recentFocus.length - 1; i >= 0; i--) {
    const el = recentFocus[i];
    if (el instanceof HTMLElement && el.isConnected && el !== document.body && !dialog.contains(el)) return el;
  }
  return null;
}

/**
 * Dialog behaviour for the dashboards' hand-built overlays. Render it as the
 * first child of the overlay: it names the overlay as a dialog, moves focus in
 * and keeps it there, locks the page behind, and hands focus back on close.
 *
 * `onClose` is what Esc does, so pass the overlay's existing dismiss action.
 * Leave it out when dismissing would do something, like a rating prompt whose
 * only way out is a Skip that writes to the API.
 *
 * @param {{ label: string, onClose?: (() => void) | null }} props
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
    // What to hand focus back to on close: whatever had it as the dialog
    // opened, unless that's already inside the dialog (an autoFocus button)
    // or nothing at all, in which case the last thing focused before it.
    const active = document.activeElement;
    const opener = active instanceof HTMLElement && active !== document.body && !dialog.contains(active)
      ? active
      : lastFocusOutside(dialog);
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
    // After the browser's own scroll-into-view, on focus and on resize (an
    // on-screen keyboard opening resizes the viewport).
    const clear = () => setTimeout(() => keepFieldClear(dialog), 0);
    dialog.addEventListener("focusin", clear);
    window.addEventListener("resize", clear);
    window.visualViewport?.addEventListener("resize", clear);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      dialog.removeEventListener("focusin", clear);
      window.removeEventListener("resize", clear);
      window.visualViewport?.removeEventListener("resize", clear);
      document.body.style.overflow = previousOverflow;
      // The opener may have gone with a menu that closed; fall back to the
      // last thing focused outside this dialog that's still on the page.
      const target = opener instanceof HTMLElement && opener.isConnected ? opener : lastFocusOutside(dialog);
      if (target) target.focus();
    };
    // The dialog's name is fixed for as long as it's open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <span ref={anchor} hidden />;
}
