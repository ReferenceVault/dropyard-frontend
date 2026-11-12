"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { Search, SquarePen, X } from "lucide-react";
import { MC, MF } from "./theme";

export interface InboxTab {
  id: string;
  label: string;
  /** Shown as the orange count badge when above zero (the Unread tab). */
  badge?: number;
  /** What the badge counts, for screen readers: "unread conversations". */
  badgeLabel?: string;
}

export interface MessagesInboxHeaderProps {
  title?: string;
  tabs: InboxTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  /** id of the element the tabs control (the thread list). */
  panelId: string;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (q: string) => void;
  /** Omit to hide the compose button (sellers). */
  onCompose?: (() => void) | null;
  compact?: boolean;
}

export const tabDomId = (panelId: string, id: string) => `${panelId}-tab-${id}`;

/**
 * Top of the inbox column: title, search and compose icons, and the filter
 * tabs. Sticky so it stays reachable while the list scrolls under it.
 * The tabs follow the WAI-ARIA tabs pattern: one tab in the Tab order, arrow
 * keys / Home / End move between them and select as they go.
 */
export function MessagesInboxHeader({
  title = "Inbox", tabs, activeTab, onTabChange, panelId, searchOpen, onSearchOpenChange,
  query, onQueryChange, onCompose = null, compact = false,
}: MessagesInboxHeaderProps) {
  const searchId = useId();
  const headingId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const wasOpen = useRef(searchOpen);

  // Opening search puts the cursor in the field; closing it hands focus back
  // to the icon that opened it.
  useEffect(() => {
    if (searchOpen && !wasOpen.current) inputRef.current?.focus();
    if (!searchOpen && wasOpen.current && document.activeElement === document.body) searchBtnRef.current?.focus();
    wasOpen.current = searchOpen;
  }, [searchOpen]);

  const closeSearch = () => { onQueryChange(""); onSearchOpenChange(false); searchBtnRef.current?.focus(); };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = tabs.findIndex((t) => t.id === activeTab);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onTabChange(tabs[next].id);
    tabRefs.current[tabs[next].id]?.focus();
  };

  const iconBtn = (active: boolean) => ({
    width: 40, height: 40, borderRadius: 12, border: "1px solid " + (active ? MC.green + "55" : MC.fawn),
    background: active ? MC.greenMist : MC.paper, color: active ? MC.greenDeep : MC.mink,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
  });

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 3, background: MC.paper, borderBottom: "1px solid " + MC.fawn }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: compact ? "12px 14px 8px" : "14px 16px 8px" }}>
        <h2 id={headingId} style={{ flex: 1, minWidth: 0, fontFamily: MF.head, fontSize: compact ? 17 : 18, fontWeight: 900, color: MC.ink, letterSpacing: "-0.02em" }}>
          {title}
        </h2>
        <button
          ref={searchBtnRef}
          type="button"
          onClick={() => (searchOpen ? closeSearch() : onSearchOpenChange(true))}
          aria-label={searchOpen ? "Close search" : "Search conversations"}
          aria-expanded={searchOpen}
          aria-controls={searchId}
          title={searchOpen ? "Close search" : "Search conversations"}
          style={iconBtn(searchOpen)}
        >
          {searchOpen ? <X size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
        </button>
        {onCompose && (
          <button type="button" onClick={onCompose} aria-label="New message" title="New message" style={iconBtn(false)}>
            <SquarePen size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <div id={searchId} role="search" hidden={!searchOpen} style={{ padding: compact ? "0 14px 8px" : "0 16px 8px" }}>
        {searchOpen && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, border: "1.5px solid " + MC.green + "55", background: MC.paper }}>
            <Search size={16} aria-hidden="true" style={{ color: MC.ash, flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); closeSearch(); } }}
              placeholder="Search by item, name or message"
              aria-label="Search conversations"
              enterKeyHint="search"
              style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: MF.body, fontSize: 16, fontWeight: 500, color: MC.ink, padding: 0 }}
            />
            {query && (
              <button type="button" onClick={() => { onQueryChange(""); inputRef.current?.focus(); }} aria-label="Clear search" style={{ border: "none", background: "transparent", color: MC.ash, cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}>
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Scrolls sideways on the narrowest phones rather than wrapping or
          pushing the page wider. */}
      <div role="tablist" aria-labelledby={headingId} style={{ display: "flex", gap: compact ? 2 : 4, padding: compact ? "0 8px" : "0 10px", overflowX: "auto", scrollbarWidth: "none" }}>
        {tabs.map((t) => {
          const selected = t.id === activeTab;
          return (
            <button
              key={t.id}
              ref={(el) => { tabRefs.current[t.id] = el; }}
              id={tabDomId(panelId, t.id)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => onTabChange(t.id)}
              onKeyDown={onTabKey}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, whiteSpace: "nowrap",
                padding: compact ? "10px 7px 11px" : "10px 10px 11px", minHeight: 44, border: "none", background: "transparent",
                borderBottom: "2.5px solid " + (selected ? MC.green : "transparent"), marginBottom: -1,
                color: selected ? MC.greenDeep : MC.mink, fontFamily: MF.head, fontSize: 13, fontWeight: selected ? 800 : 700, cursor: "pointer",
              }}
            >
              {t.label}
              {!!t.badge && t.badge > 0 && (
                <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: MC.orange, color: "#fff", fontFamily: MF.head, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                  {t.badge > 99 ? "99+" : t.badge}
                  <span className="sr-only"> {t.badgeLabel || "unread"}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
