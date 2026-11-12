"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { EllipsisVertical } from "lucide-react";
import { MC, MF } from "./theme";

export interface ThreadMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  /** A link (View item) rather than an action. */
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  /** Why it's disabled, read out with the item. */
  hint?: string;
  danger?: boolean;
}

/**
 * The ⋮ menu in the thread header. Menu-button pattern: Enter / Space / ↓
 * open it on the first item, ↑ / ↓ / Home / End move, Esc or Tab closes and
 * focus returns to the button; a click outside closes it too.
 */
export function ThreadMenu({ items, label = "More actions" }: { items: ThreadMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("touchstart", onDown); };
  }, [open]);

  const focusItem = (i: number) => {
    const els = itemRefs.current.filter(Boolean) as HTMLElement[];
    if (els.length) els[(i + els.length) % els.length].focus();
  };
  const openAt = (i: number) => { setOpen(true); requestAnimationFrame(() => focusItem(i)); };
  const close = (refocus = true) => { setOpen(false); if (refocus) btnRef.current?.focus(); };

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const els = itemRefs.current.filter(Boolean) as HTMLElement[];
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); focusItem(i + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusItem(i - 1); }
    else if (e.key === "Home") { e.preventDefault(); focusItem(0); }
    else if (e.key === "End") { e.preventDefault(); focusItem(els.length - 1); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") close(false);
  };

  const itemStyle = (it: ThreadMenuItem) => ({
    display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 44, padding: "10px 14px", border: "none",
    background: "transparent", textAlign: "left" as const, textDecoration: "none", borderRadius: 10,
    fontFamily: MF.body, fontSize: 14, fontWeight: 600,
    color: it.disabled ? MC.ash : it.danger ? MC.claret : MC.ink, cursor: it.disabled ? "not-allowed" : "pointer",
  });

  return (
    <div ref={wrapRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close() : openAt(0))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); openAt(0); }
          else if (e.key === "ArrowUp") { e.preventDefault(); openAt(-1); }
        }}
        style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid " + (open ? MC.green + "55" : MC.fawn), background: open ? MC.greenMist : MC.paper, color: MC.mink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        <EllipsisVertical size={18} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 30, minWidth: 220, padding: 6, borderRadius: 14, background: MC.paper, border: "1px solid " + MC.fawn, boxShadow: "0 12px 32px rgba(15,54,11,0.16)" }}
        >
          {items.map((it, idx) => {
            const common = {
              ref: (el: HTMLElement | null) => { itemRefs.current[idx] = el; },
              role: "menuitem",
              tabIndex: -1,
              "aria-disabled": it.disabled || undefined,
              style: itemStyle(it),
              onMouseEnter: (e: ReactMouseEvent<HTMLElement>) => { if (!it.disabled) e.currentTarget.style.background = MC.greenWash; },
              onMouseLeave: (e: ReactMouseEvent<HTMLElement>) => { e.currentTarget.style.background = "transparent"; },
            };
            const content = (
              <>
                {it.icon && <span aria-hidden="true" style={{ display: "flex", color: it.disabled ? MC.smoke : it.danger ? MC.claret : MC.mink }}>{it.icon}</span>}
                <span style={{ display: "flex", flexDirection: "column" }}>
                  {it.label}
                  {it.hint && <span style={{ fontSize: 11.5, fontWeight: 500, color: MC.ash }}>{it.hint}</span>}
                  {it.href && !it.disabled && <span className="sr-only"> (opens in a new tab)</span>}
                </span>
              </>
            );
            if (it.href && !it.disabled) {
              return (
                <a key={it.id} {...common} ref={common.ref as (el: HTMLAnchorElement | null) => void} href={it.href} target="_blank" rel="noopener noreferrer" onClick={() => close(false)}>
                  {content}
                </a>
              );
            }
            return (
              <button
                key={it.id}
                {...common}
                ref={common.ref as (el: HTMLButtonElement | null) => void}
                type="button"
                onClick={() => { if (it.disabled) return; close(); it.onSelect?.(); }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
