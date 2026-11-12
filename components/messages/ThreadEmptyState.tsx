"use client";

import { Inbox, MessageSquare } from "lucide-react";
import { MC, MF } from "./theme";

export interface ThreadEmptyStateProps {
  /** Nothing in the inbox at all, rather than nothing selected. */
  empty?: boolean;
  /** Shown under the heading when the inbox is empty. */
  emptyHint?: string;
  /** Threads with something unread. */
  unreadCount?: number;
  /** Switch the inbox to its Unread tab. */
  onShowUnread?: (() => void) | null;
}

/**
 * The thread pane on desktop before a conversation is picked. Messages no
 * longer opens the newest thread on its own (that marked it read before you
 * had looked at it), so this says what to do and how much is waiting.
 */
export function ThreadEmptyState({ empty = false, emptyHint = "", unreadCount = 0, onShowUnread = null }: ThreadEmptyStateProps) {
  const Icon = empty ? MessageSquare : Inbox;
  return (
    <div style={{ height: "100%", minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
      <div style={{ maxWidth: 340 }}>
        <span aria-hidden="true" style={{ width: 56, height: 56, margin: "0 auto 14px", borderRadius: "50%", background: MC.greenMist, color: MC.greenDeep, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={24} />
        </span>
        <h2 style={{ fontFamily: MF.head, fontSize: 18, fontWeight: 900, color: MC.ink }}>
          {empty ? "No conversations yet" : "Select a conversation"}
        </h2>
        <p style={{ fontFamily: MF.body, fontSize: 13.5, fontWeight: 500, color: MC.mink, marginTop: 6, lineHeight: 1.5 }}>
          {empty
            ? emptyHint
            : unreadCount > 0
              ? `You have ${unreadCount} unread conversation${unreadCount === 1 ? "" : "s"}.`
              : "Choose a conversation from your inbox to read it here."}
        </p>
        {!empty && unreadCount > 0 && onShowUnread && (
          <button
            type="button"
            onClick={onShowUnread}
            style={{ marginTop: 16, minHeight: 44, padding: "10px 20px", borderRadius: 999, border: "1.5px solid " + MC.green + "66", background: MC.paper, color: MC.greenDeep, fontFamily: MF.head, fontSize: 14, fontWeight: 800, cursor: "pointer" }}
          >
            Show unread
          </button>
        )}
      </div>
    </div>
  );
}

/** What a request to open a specific thread names. */
export interface OpenThreadTarget {
  conversationId?: string | null;
  itemId?: string | null;
  /** Legacy: the item title (Claims / History rows). */
  title?: string | null;
}

/** Does a conversation (in either dashboard's adapted shape) match the target? */
export function matchesOpenTarget(c: { id?: string; itemId?: string | null; item?: { title?: string } } | null | undefined, t: OpenThreadTarget | null | undefined): boolean {
  if (!c || !t) return false;
  if (t.conversationId) return c.id === t.conversationId;
  if (t.itemId) return c.itemId === t.itemId;
  return !!t.title && c.item?.title === t.title;
}

/** Read ?conversation=<id> from the address bar. */
export function conversationFromUrl(): OpenThreadTarget | null {
  if (typeof window === "undefined") return null;
  const id = new URLSearchParams(window.location.search).get("conversation");
  return id ? { conversationId: id } : null;
}
