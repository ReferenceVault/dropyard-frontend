"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Z, SHEET_PANEL } from "@/lib/layers";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { ModalA11y } from "@/components/ModalA11y";
import { T } from "@/components/settings/profileTheme";
import {
  QUICK_PICK_VALUES, categoryFor, normaliseForSearch, searchCategories, type Category,
} from "@/lib/categories";

/**
 * Compact, searchable category selector (feedback point 3).
 *
 *   CategorySelect  a form field: shows the chosen category; opens the picker
 *                   as a dropdown on tablets and up, a bottom sheet on phones
 *   CategorySheet   the picker in a bottom sheet (the buyer's "More categories…")
 *   CategoryPicker  the search box + quick picks + list, inline (the buyer's
 *                   desktop Category panel)
 *
 * Typing filters by category name and keywords ("sneakers" → Shoes &
 * Footwear), accents ignored. ↑/↓ move, Enter picks, Esc closes. The search
 * box is an ARIA combobox driving a listbox via aria-activedescendant.
 *
 * Inline styles in the dashboards' palette (T) rather than Tailwind: the
 * dashboards' global `* { margin: 0; padding: 0 }` outranks utilities.
 */

export const ALL = "All";

const PHONE_QUERY = "(max-width: 639px)";
function useIsPhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return phone;
}

/** Bold the part of the label the query matched (accent-insensitive). */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = normaliseForSearch(query);
  if (!q) return <>{text}</>;
  // normaliseForSearch keeps one character per original character for the
  // letters we compare, so indexes line up after lower-casing + accent strip.
  const plain = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const at = plain.indexOf(q);
  if (at < 0 || plain.length !== text.length) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark style={{ background: T.c.greenMist, color: T.c.ink, borderRadius: 3, padding: "0 1px" }}>{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}

type Option = { value: string; category: Category | null; keyword: string | null };

export interface CategoryPickerProps {
  value: string | null;
  onSelect: (value: string) => void;
  /** Adds an "Any category" option (value "All") for filters. */
  allowAll?: boolean;
  /** Show the six quick picks above the search while it's empty. */
  quickPicks?: boolean;
  autoFocus?: boolean;
  onEscape?: () => void;
  /** Height of the scrolling list. */
  listMaxHeight?: number | string;
  /** Accent for the selected state — the buyer side uses its Drop colour. */
  accent?: string;
}

export function CategoryPicker({
  value, onSelect, allowAll = false, quickPicks = false, autoFocus = false, onEscape, listMaxHeight = 320, accent = T.c.green,
}: CategoryPickerProps) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const optionsFor = (q: string): Option[] => {
    const found = searchCategories(q).map((m) => ({ value: m.category.value, category: m.category, keyword: m.keyword }));
    return allowAll && !q.trim() ? [{ value: ALL, category: null, keyword: null }, ...found] : found;
  };
  // 24 categories: filtering on every render is cheaper than memoising.
  const options: Option[] = optionsFor(query);

  // Start on the current choice when the list is unfiltered, else the best match.
  const startIndex = (q: string) =>
    q.trim() ? 0 : Math.max(0, optionsFor(q).findIndex((o) => o.value === (value || (allowAll ? ALL : ""))));
  const [active, setActive] = useState(() => startIndex(""));
  const changeQuery = (q: string) => { setQuery(q); setActive(startIndex(q)); };

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "PageDown") { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 6)); }
    else if (e.key === "PageUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 6)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const o = options[active];
      if (o) onSelect(o.value);
    } else if (e.key === "Escape") {
      if (query) { e.preventDefault(); e.stopPropagation(); changeQuery(""); }
      else if (onEscape) { e.preventDefault(); e.stopPropagation(); onEscape(); }
    }
  };

  const activeId = options[active] ? `${uid}-opt-${active}` : undefined;
  const showQuick = quickPicks && !query.trim();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      {showQuick && (
        <div role="group" aria-label="Popular categories" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {QUICK_PICK_VALUES.map((v) => {
            const c = categoryFor(v);
            const on = v === value;
            return (
              <button key={v} type="button" onClick={() => onSelect(v)} aria-pressed={on} className="dy-focus"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", minHeight: 34, borderRadius: 999,
                  border: "1.5px solid " + (on ? accent : T.c.fawn), background: on ? accent : T.c.paper, color: on ? "#fff" : T.c.ink,
                  fontFamily: T.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                }}>
                <span aria-hidden>{c.emoji}</span>{c.label}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <Search size={15} aria-hidden style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.c.mink, pointerEvents: "none" }} />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-label="Search categories"
          placeholder="Search categories, e.g. sneakers, bike"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
          onKeyDown={onKeyDown}
          className="dy-field dy-focus"
          style={{
            width: "100%", minHeight: 42, padding: "10px 36px 10px 34px", borderRadius: 12, border: "1.5px solid " + T.c.fawn,
            background: T.c.paper, fontFamily: T.font, fontSize: 16, color: T.c.ink, boxSizing: "border-box", outline: "none",
          }}
        />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => { changeQuery(""); inputRef.current?.focus(); }}
            style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 30, height: 30, border: "none", borderRadius: "50%", background: "transparent", color: T.c.mink, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} aria-hidden />
          </button>
        )}
      </div>

      <p aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
        {query.trim() ? `${options.length} ${options.length === 1 ? "category matches" : "categories match"}` : ""}
      </p>

      {options.length > 0 ? (
        <ul ref={listRef} id={listId} role="listbox" aria-label="Categories"
          style={{ listStyle: "none", margin: 0, padding: 4, maxHeight: listMaxHeight, overflowY: "auto", borderRadius: 12, border: "1px solid " + T.c.fawn, background: T.c.paper }}>
          {options.map((o, i) => {
            const selected = o.value === (value || (allowAll ? ALL : ""));
            const isActive = i === active;
            const label = o.category ? o.category.label : "Any category";
            return (
              <li key={o.value} id={`${uid}-opt-${i}`} data-index={i} role="option" aria-selected={selected}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(o.value)}
                onMouseMove={() => setActive(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 9, cursor: "pointer",
                  background: isActive ? T.c.greenMist : "transparent",
                  outline: isActive ? "2px solid " + accent : "none", outlineOffset: -2,
                }}>
                <span aria-hidden style={{ width: 26, fontSize: 18, textAlign: "center", flexShrink: 0 }}>{o.category ? o.category.emoji : "✨"}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: T.font, fontSize: 14, fontWeight: 700, color: T.c.ink }}>
                    <Highlight text={label} query={query} />
                  </span>
                  <span style={{ display: "block", fontFamily: T.font, fontSize: 12, color: T.c.mink, lineHeight: 1.35 }}>
                    {o.keyword ? <>Matches &ldquo;{o.keyword}&rdquo; · {o.category?.hint}</> : (o.category ? o.category.hint : "Show items from every category")}
                  </span>
                </span>
                {selected && <Check size={16} strokeWidth={3} aria-hidden style={{ color: accent, flexShrink: 0 }} />}
              </li>
            );
          })}
        </ul>
      ) : (
        <div role="status" style={{ padding: "14px 12px", borderRadius: 12, border: "1px dashed " + T.c.fawn, background: T.c.sand }}>
          <p style={{ ...T.muted, margin: 0 }}>No category matches &ldquo;{query.trim()}&rdquo;.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {!allowAll && (
              <button type="button" onClick={() => onSelect("OTHER")} style={T.secondaryButton}>Choose Other</button>
            )}
            <button type="button" onClick={() => { changeQuery(""); inputRef.current?.focus(); }} style={T.linkButton}>Clear search</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The picker in a bottom sheet — phones, and the buyer's "More categories…". */
export function CategorySheet({ title = "Choose a category", onClose, ...picker }: CategoryPickerProps & { title?: string; onClose: () => void }) {
  return createPortal(
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: Z.modal, background: "rgba(15, 54, 11, 0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div className={SHEET_PANEL} style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", background: T.c.paper, borderRadius: "20px 20px 0 0", padding: "10px 16px 18px", boxShadow: "0 -12px 40px rgba(15, 54, 11, 0.25)" }}>
        <ModalA11y label={title} onClose={onClose} />
        <span aria-hidden style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 999, background: T.c.fawn, marginBottom: 10 }} />
        <div style={{ ...T.dialogHead, marginBottom: 12 }}>
          <h2 style={{ ...T.dialogTitle, fontSize: 17 }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={T.iconButton}><X size={18} aria-hidden /></button>
        </div>
        <CategoryPicker {...picker} autoFocus onEscape={onClose} listMaxHeight="min(52vh, 440px)" />
      </div>
    </div>,
    document.body,
  );
}

export interface CategorySelectProps {
  value: string | null;
  onChange: (value: string) => void;
  /** id of the visible field label, for aria-labelledby. */
  labelId?: string;
  /** id given to the trigger button, e.g. to focus it on a validation error. */
  id?: string;
  invalid?: boolean;
  /** id of the error message, for aria-describedby. */
  errorId?: string;
  quickPicks?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

/** The Sell / Edit form field. */
export function CategorySelect({
  value, onChange, labelId, id, invalid = false, errorId, quickPicks = true, placeholder = "Choose a category", disabled = false,
}: CategorySelectProps) {
  const uid = useId();
  const triggerId = id || `${uid}-trigger`;
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const chosen = value ? categoryFor(value) : null;

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const pick = (v: string) => { onChange(v); close(); };

  // Dropdown (tablet and up): close on a click or focus outside.
  useEffect(() => {
    if (!open || phone) return;
    const outside = (e: Event) => { if (!wrapRef.current?.contains(e.target as Node)) close(false); };
    document.addEventListener("mousedown", outside);
    document.addEventListener("focusin", outside);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("focusin", outside); };
  }, [open, phone]);

  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth: 0 }}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId ? `${labelId} ${triggerId}` : undefined}
        aria-describedby={invalid && errorId ? errorId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !open) { e.preventDefault(); setOpen(true); } }}
        className="dy-focus"
        style={{
          width: "100%", minHeight: 46, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", textAlign: "left",
          borderRadius: 12, border: "1.5px solid " + (invalid ? T.c.claret : open ? T.c.green : T.c.fawn),
          background: T.c.paper, cursor: disabled ? "not-allowed" : "pointer", fontFamily: T.font, fontSize: 15, color: chosen ? T.c.ink : T.c.ash,
          boxShadow: open ? "0 0 0 3px " + T.c.greenMist : "none",
        }}
      >
        {chosen && <span aria-hidden style={{ fontSize: 18 }}>{chosen.emoji}</span>}
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: chosen ? 700 : 500 }}>
          {chosen ? chosen.label : placeholder}
        </span>
        <ChevronDown size={18} aria-hidden style={{ color: T.c.mink, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
      </button>

      {open && !phone && (
        <div style={{ position: "absolute", zIndex: 60, top: "calc(100% + 6px)", left: 0, right: 0, minWidth: 280, padding: 12, borderRadius: 16, background: T.c.paper, border: "1px solid " + T.c.fawn, boxShadow: "0 18px 40px rgba(15, 54, 11, 0.18)" }}>
          <CategoryPicker value={value} onSelect={pick} quickPicks={quickPicks} autoFocus onEscape={() => close()} listMaxHeight={300} />
        </div>
      )}
      {open && phone && (
        <CategorySheet value={value} onSelect={pick} quickPicks={quickPicks} onClose={() => close()} />
      )}
    </div>
  );
}

export default CategorySelect;
