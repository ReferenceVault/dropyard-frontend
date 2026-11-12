"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { MC, MF } from "./theme";

/** Within this many px of the bottom counts as "reading the latest". */
const NEAR_BOTTOM_PX = 100;
/** After a thread opens, its messages may still be arriving (fetch, then
 *  socket catch-up); everything in this window lands at the bottom too. */
const OPENING_MS = 1500;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export interface ThreadAutoScrollOptions {
  /** The open conversation; a change means "a thread was just opened". */
  threadKey: string | null;
  /** Identity of the newest message (its id, or anything that changes when one is added). */
  lastMessageKey: string | null;
  /** The newest message is the viewer's own (just sent). */
  lastIsMine: boolean;
}

/**
 * Standard chat scrolling for a thread's message log:
 *  - opening a thread, or sending a message yourself, goes to the bottom;
 *  - a new message while you're at (or within 100px of) the bottom scrolls
 *    smoothly to it, or instantly with prefers-reduced-motion;
 *  - a new message while you've scrolled up to read leaves you where you are
 *    and counts it for a "New message ↓" pill instead, which goes away when
 *    clicked or when you scroll back down yourself;
 *  - photos finishing loading after that scroll keep you pinned to the
 *    bottom if that's where you were, so they can't push the newest message
 *    out of view.
 *
 * Spread `ref` and `onScroll` onto the scrolling element, and render
 * <NewMessagesPill> as its last child.
 */
export function useThreadAutoScroll({ threadKey, lastMessageKey, lastIsMine }: ThreadAutoScrollOptions) {
  const logRef = useRef<HTMLElement | null>(null);
  const s = useRef({
    thread: null as string | null,
    last: null as string | null,
    stick: true,       // the reader is at the bottom and wants to stay there
    auto: false,       // a smooth scroll we started is still running
    autoTimer: 0 as ReturnType<typeof setTimeout> | 0,
    openedAt: 0,
  });
  // Count of messages that arrived while scrolled up, for this thread only;
  // switching threads hides it without a reset.
  const [pending, setPending] = useState<{ thread: string | null; count: number } | null>(null);

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = logRef.current;
    if (!el) return;
    const st = s.current;
    st.stick = true;
    if (smooth && !prefersReducedMotion()) {
      // Scroll events fire mid-animation while still >100px away; don't
      // read those as the reader scrolling up.
      st.auto = true;
      if (st.autoTimer) clearTimeout(st.autoTimer);
      st.autoTimer = setTimeout(() => { st.auto = false; }, 900);
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  // After every render that changed the thread or its newest message, before
  // paint (so an opened thread never flashes its oldest messages first).
  useLayoutEffect(() => {
    const st = s.current;
    if (!logRef.current) return;
    const now = performance.now();
    if (threadKey !== st.thread) {
      st.thread = threadKey;
      st.last = lastMessageKey;
      st.openedAt = now;
      scrollToBottom(false);
      return;
    }
    if (lastMessageKey === st.last) return;
    st.last = lastMessageKey;
    if (now - st.openedAt < OPENING_MS) { scrollToBottom(false); return; }
    if (lastIsMine || st.stick) { scrollToBottom(true); return; }
    // Measured state (where the reader is) decides this, so it can't be
    // derived during render; it's the "update from an external system" case.
    // React's measure-in-layout-effect-then-update pattern, so the rule is
    // silenced for this one call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending((p) => ({ thread: threadKey, count: (p && p.thread === threadKey ? p.count : 0) + 1 }));
  }, [threadKey, lastMessageKey, lastIsMine, scrollToBottom]);

  const onScroll = useCallback(() => {
    const el = logRef.current;
    if (!el) return;
    const st = s.current;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (st.auto) {
      if (distance <= 2) st.auto = false;
      return;
    }
    st.stick = distance <= NEAR_BOTTOM_PX;
    if (st.stick) setPending((p) => (p ? null : p));
  }, []);

  // Callback ref: re-attaches when the log element is replaced (the thread
  // pane remounts between the phone list and thread views). `load` doesn't
  // bubble, so listen in the capture phase for images inside the log.
  const ref = useCallback((node: HTMLElement | null) => {
    logRef.current = node;
    if (!node) return;
    const onLoad = (e: Event) => {
      if ((e.target as HTMLElement)?.tagName === "IMG" && s.current.stick) node.scrollTop = node.scrollHeight;
    };
    node.addEventListener("load", onLoad, true);
    return () => node.removeEventListener("load", onLoad, true);
  }, []);

  const newCount = pending && pending.thread === threadKey ? pending.count : 0;
  const jumpToLatest = useCallback(() => { setPending(null); scrollToBottom(true); }, [scrollToBottom]);

  return { ref, onScroll, newCount, jumpToLatest };
}

/**
 * "New message ↓", pinned to the bottom of the scrolling log while it has
 * something to say. Render it as the log's last child.
 */
export function NewMessagesPill({ count, onClick }: { count: number; onClick: () => void }) {
  if (count <= 0) return null;
  return (
    // Sticky with no height: it sits at the bottom edge of the visible log
    // and the button hangs just above it, over the messages.
    <div style={{ position: "sticky", bottom: 10, height: 0, display: "flex", justifyContent: "center", zIndex: 2, pointerEvents: "none" }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          transform: "translateY(-100%)", pointerEvents: "auto", display: "inline-flex", alignItems: "center", gap: 6,
          minHeight: 36, padding: "7px 14px", borderRadius: 999, border: "none", background: MC.green, color: "#fff",
          fontFamily: MF.head, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(15,54,11,0.25)",
        }}
      >
        {count > 1 ? `${count} new messages` : "New message"}
        <ArrowDown size={14} strokeWidth={2.6} aria-hidden="true" />
      </button>
    </div>
  );
}
