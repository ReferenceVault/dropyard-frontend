"use client";

// The ⋯ menu on each seller Inventory row: one compact button instead of a
// row of Share / Lower price / Edit / × buttons. The list of actions (and
// which are unavailable, with why) comes from the row.
//
// Keyboard: the menu-button pattern of the header's AccountMenu. Enter, Space
// or ArrowDown open it on the first item, ArrowUp on the last; inside, the
// arrow keys, Home and End move, Escape closes and returns focus to ⋯, Tab
// closes and moves on. A click outside closes it, and so does choosing an
// action.
//
// Drawn in a portal with fixed positioning, so the table, a card or a
// scrolling container can never clip it. It opens below the button, or above
// it when there isn't room (the phone's bottom navigation bar counts as no
// room), and it follows the button if the page scrolls.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { MC, MF } from "@/components/messages/theme";
import { Z } from "@/lib/layers";

export interface ItemAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** Shown under the label when the action can't be used right now. */
  disabledReason?: string | null;
  /** Red, and set apart by a divider (Remove / Delete). */
  danger?: boolean;
}

/** Red for "Remove listing" / "Delete draft": 6.6:1 on white (AA for small text). */
const DANGER = "#B42318";
const MENU_WIDTH = 224;
const GAP = 6;
const EDGE = 8;

export function ItemActionsMenu({ itemName, actions, size = 36 }: { itemName: string; actions: ItemAction[]; size?: number }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef<"first" | "last">("first");
  const menuId = useId();

  const menuItems = () => [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setPos(null);
    if (refocus) buttonRef.current?.focus();
  }, []);

  // Below the button, or above it when there isn't room below. Fixed bars
  // along the bottom of the screen (the phone's bottom navigation) are
  // treated as no room.
  const place = useCallback(() => {
    const b = buttonRef.current, m = menuRef.current;
    if (!b || !m) return;
    const r = b.getBoundingClientRect();
    const h = m.offsetHeight;
    let bottomLimit = window.innerHeight;
    document.querySelectorAll<HTMLElement>("nav, [data-bottom-bar]").forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed") return;
      const er = el.getBoundingClientRect();
      if (er.bottom >= window.innerHeight - 1 && er.height < 160 && er.width > window.innerWidth * 0.6) bottomLimit = Math.min(bottomLimit, er.top);
    });
    const roomBelow = bottomLimit - r.bottom - GAP - EDGE;
    const roomAbove = r.top - GAP - EDGE;
    const up = h > roomBelow && roomAbove > roomBelow;
    const top = up ? Math.max(EDGE, r.top - GAP - h) : Math.min(r.bottom + GAP, Math.max(EDGE, bottomLimit - EDGE - h));
    const left = Math.min(Math.max(EDGE, r.right - MENU_WIDTH), window.innerWidth - EDGE - MENU_WIDTH);
    setPos({ top, left, up });
  }, []);

  // Measure once the menu is in the DOM, then show it in place.
  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  // Focus the first (or last) item once it's placed.
  useEffect(() => {
    if (!open || !pos) return;
    const list = menuItems();
    (focusOnOpen.current === "last" ? list[list.length - 1] : list[0])?.focus();
    // Only when it first appears, not on every reposition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, !!pos]);

  // A click anywhere else closes it; scrolling or resizing moves it with ⋯.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      close(false);
    };
    const onMove = () => place();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, close, place]);

  const openWith = (where: "first" | "last") => { focusOnOpen.current = where; setOpen(true); };
  const onButtonKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); openWith("first"); }
    else if (e.key === "ArrowUp") { e.preventDefault(); openWith("last"); }
  };
  const onMenuKey = (e: React.KeyboardEvent) => {
    const list = menuItems();
    const i = list.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => { e.preventDefault(); list[(n + list.length) % list.length]?.focus(); };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(list.length - 1);
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === "Tab") close(false);
  };

  const choose = (a: ItemAction) => {
    if (a.disabledReason) return;
    // Focus goes back to ⋯ first, so a dialog the action opens returns
    // focus there when it closes.
    close(true);
    a.onSelect();
  };

  const firstDanger = actions.findIndex((a) => a.danger);
  let menu: ReactNode = null;
  if (open) {
    menu = createPortal(
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label={"Actions for " + itemName}
        onKeyDown={onMenuKey}
        style={{
          position: "fixed", top: pos?.top ?? 0, left: pos?.left ?? 0, width: MENU_WIDTH, zIndex: Z.popover,
          visibility: pos ? "visible" : "hidden",
          background: MC.paper, border: "1px solid " + MC.fawn, borderRadius: 14, padding: 6,
          boxShadow: "0 18px 40px -12px rgba(15, 54, 11, 0.28), 0 2px 6px rgba(15, 54, 11, 0.08)",
          fontFamily: MF.body,
        }}
      >
        {actions.map((a, i) => {
          const Icon = a.icon;
          const disabled = !!a.disabledReason;
          const color = disabled ? MC.ash : a.danger ? DANGER : MC.ink;
          return (
            <div key={a.id} role="none">
              {i === firstDanger && i > 0 && <div role="separator" style={{ height: 1, background: MC.fawn, margin: "6px 4px" }} />}
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-disabled={disabled || undefined}
                onClick={() => choose(a)}
                className="dy-item-menu-entry"
                data-danger={a.danger ? "" : undefined}
                style={{
                  width: "100%", minHeight: 44, display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "11px 12px", border: "none", borderRadius: 10, background: "transparent",
                  textAlign: "left", cursor: disabled ? "not-allowed" : "pointer", color,
                }}
              >
                <Icon size={17} strokeWidth={2.2} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: MF.head, fontSize: 14, fontWeight: 650, lineHeight: 1.3 }}>{a.label}</span>
                  {disabled && <span style={{ display: "block", fontSize: 12, fontWeight: 500, lineHeight: 1.35, marginTop: 2, color: MC.ash }}>{a.disabledReason}</span>}
                </span>
              </button>
            </div>
          );
        })}
      </div>,
      document.body,
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={"Actions for " + itemName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : openWith("first"))}
        onKeyDown={onButtonKey}
        className="dy-item-menu-button"
        style={{
          width: size, height: size, flexShrink: 0, borderRadius: "50%",
          display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0,
          border: "1px solid " + MC.fawn, background: open ? MC.greenWash : MC.paper, color: MC.ink, cursor: "pointer",
        }}
      >
        <MoreHorizontal size={18} strokeWidth={2.4} aria-hidden />
      </button>
      {menu}
    </>
  );
}
