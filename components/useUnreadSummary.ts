"use client";

// What's unread for the signed-in user, for the public header's avatar dot
// and the account menu's "N unread" line.
//
// The dashboards have the full picture in NotificationsProvider, but that
// only lives inside /buyer, where this header isn't shown. Here we only need
// counts, so this reads the same two endpoints the provider starts from:
//   - GET /api/conversations: unread threads, buying and selling;
//   - GET /api/notifications?limit=1: just its unreadCount (the API already
//     leaves buying entries out for SELLER-only accounts);
// and refetches once (debounced) whenever the socket says something changed,
// and after a reconnect. Since the header and /buyer never render together,
// these listeners never sit alongside the dashboard's.

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthUser } from "@/context/AuthContext";
import { useSocket, useSocketEvent } from "@/context/SocketContext";
import { apiRequest } from "@/lib/api";

export interface UnreadSummary {
  /** Conversations with unread messages, buying side. */
  buyer: number;
  /** Conversations with unread messages, selling side. */
  seller: number;
  /** Unread bell entries (claims, offers, pickups, questions). */
  events: number;
  total: number;
}

interface Conv { buyerId?: string; sellerId?: string; unreadCount?: number }

const EVENTS = ["message:new", "conversation:read", "notification:new", "notification:read"] as const;

export function useUnreadSummary(user: AuthUser | null, accessToken: string | null): UnreadSummary | null {
  const [summary, setSummary] = useState<{ userId: string; value: UnreadSummary } | null>(null);
  const userId = user?.id ?? null;
  const sellerOnly = user?.role === "SELLER";

  // Fetch and count; returns null on a failure (the last counts stay).
  const fetchSummary = useCallback(async (): Promise<UnreadSummary | null> => {
    if (!userId) return null;
    try {
      const token = accessToken ?? undefined;
      const [c, n] = await Promise.all([
        apiRequest<{ conversations?: Conv[] }>("/api/conversations", { token }),
        apiRequest<{ unreadCount?: number }>("/api/notifications?limit=1", { token }),
      ]);
      let buyer = 0, seller = 0;
      for (const conv of c?.conversations ?? []) {
        if ((conv.unreadCount ?? 0) <= 0) continue;
        if (conv.buyerId === userId) buyer += 1;
        else if (conv.sellerId === userId) seller += 1;
      }
      if (sellerOnly) buyer = 0;
      const events = n?.unreadCount ?? 0;
      return { buyer, seller, events, total: buyer + seller + events };
    } catch {
      // Keep the last known counts; a blip shouldn't clear the dot.
      return null;
    }
  }, [userId, sellerOnly, accessToken]);

  const load = useCallback(() => {
    void fetchSummary().then((value) => {
      if (value && userId) setSummary({ userId, value });
    });
  }, [fetchSummary, userId]);

  useEffect(() => { load(); }, [load]);

  // One refetch for a burst of events (a claim sends several at once).
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedule = useCallback(() => {
    if (timer.current) return;
    timer.current = setTimeout(() => { timer.current = null; load(); }, 250);
  }, [load]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  useSocketEvent(EVENTS[0], schedule);
  useSocketEvent(EVENTS[1], schedule);
  useSocketEvent(EVENTS[2], schedule);
  useSocketEvent(EVENTS[3], schedule);

  // Resync on every connect, the first one included: the mount fetch above
  // can run before the socket is up, and an event in between (a message, a
  // thread read in another tab) would otherwise be missed until the next
  // one. Reconnects catch up on whatever happened while it was down.
  const { connected } = useSocket();
  useEffect(() => {
    if (connected) load();
  }, [connected, load]);

  // A summary from a previous account never shows for the next one.
  return summary && summary.userId === userId ? summary.value : null;
}

/**
 * Where the "N unread" line goes: Messages on the side that has unread
 * messages (either side if both, in the mode they last used), or the
 * dashboard itself (where the bell is) when only notifications are unread.
 */
export function unreadHref(u: UnreadSummary): string {
  if (u.buyer > 0 && u.seller === 0) return "/buyer?mode=buyer&tab=messages";
  if (u.seller > 0 && u.buyer === 0) return "/buyer?mode=seller&tab=messages";
  if (u.buyer > 0 && u.seller > 0) return "/buyer?tab=messages";
  return "/buyer";
}
