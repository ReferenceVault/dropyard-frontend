"use client";

// One place for everything that says "something new happened", for BOTH sides
// of the account at once.
//
// Only one dashboard is mounted at a time (/buyer renders the buyer OR the
// seller dashboard), and each used to own its own conversation list and its
// own socket listeners. A message to the side you weren't looking at was
// simply dropped: no badge, nothing, until you switched and it refetched.
//
// This provider sits above both dashboards and owns:
//   - the conversation list for both roles (GET /api/conversations returns
//     both; each dashboard reads its own slice through useRoleConversations)
//     and the message:new / conversation:read listeners that keep it current;
//   - unread counts per role, which the Messages tabs and the Switch button
//     read;
//   - the bell's event entries (claims, offers, pickups, questions) from
//     /api/notifications plus notification:new / notification:read;
//   - moving between modes: a ?conversation= link for the other side
//     switches to it, and navigate() (bell entries, toasts) adds a history
//     entry when it changes side, so Back returns to the mode and page you
//     came from;
//   - the toasts (components/notifications/NotificationToasts), rendered
//     once here. The bell (NotificationBell) sits in each dashboard's top bar
//     and reads from here.
//
// Message activity is NOT stored as notifications: it is derived from the
// conversations' unread counts, so "read" always means the thread was read.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "./AuthContext";
import { useDashboard, type DashboardMode } from "./DashboardContext";
import { useSocket, useSocketEvent } from "./SocketContext";
import { apiRequest } from "@/lib/api";
import { NotificationToasts } from "@/components/notifications/NotificationToasts";

export type Role = DashboardMode; // "buyer" | "seller"

/** A conversation as GET /api/conversations returns it (fields we rely on). */
export interface RawConversation {
  id: string;
  buyerId?: string;
  sellerId?: string;
  itemId?: string | null;
  unreadCount?: number;
  lastMessage?: Record<string, unknown> | null;
  lastMessageAt?: string | null;
  otherLastReadAt?: string | null;
  /** The dashboard's own adapted row after a local edit (see useRoleConversations). */
  __view?: unknown;
  [key: string]: unknown;
}

export interface AppNotification {
  id: string;
  type: string;
  role: "BUYER" | "SELLER";
  amount: number | null;
  conversationId: string | null;
  claimId: string | null;
  questionId: string | null;
  readAt: string | null;
  createdAt: string;
  actor: { id: string; name: string; avatar: unknown } | null;
  item: { id: string; title: string; photo: string | null } | null;
}

interface MessagePayload {
  conversationId?: string;
  message?: { id?: string; senderId?: string; messageType?: string; createdAt?: string; [k: string]: unknown };
  conversation?: { buyerId?: string; sellerId?: string; [k: string]: unknown };
}

/** Somewhere a bell entry or a toast leads: a thread, a tab, or a listing. */
export interface NavTarget {
  role: Role;
  conversationId?: string | null;
  tab?: string | null;
  itemId?: string | null;
}

interface NotificationsValue {
  myUserId: string | null;
  /** The side that's showing. */
  mode: Role;
  /** A SELLER-only account: no buying side at all. */
  sellerOnly: boolean;
  /** Both roles' conversations, newest activity first. */
  conversations: RawConversation[];
  conversationsLoaded: boolean;
  updateConversations: (updater: (prev: RawConversation[]) => RawConversation[]) => void;
  refreshConversations: () => Promise<void>;
  /** Conversations with unread messages, per side. */
  unread: Record<Role, number>;
  roleOfConversation: (c: Pick<RawConversation, "buyerId" | "sellerId"> | null | undefined) => Role | null;
  /** The thread on screen right now, so new messages in it don't count as unread. */
  setOpenConversation: (id: string | null) => void;
  /** Is this thread on screen right now? */
  isConversationOpen: (id: string | null | undefined) => boolean;
  /**
   * Go to a thread, tab or listing. On the side that's showing, the
   * dashboard's registered handler opens it. On the other side: switch mode,
   * with a history entry so Back returns to this mode and page.
   */
  navigate: (target: NavTarget) => void;
  /** Open a conversation wherever it belongs (looked up by id). */
  jumpToConversation: (conversationId: string) => Promise<boolean>;
  /**
   * The showing dashboard says how to open a target on its own side.
   * Returns the unregister function (for an effect's cleanup).
   */
  registerNavHandler: (handler: (target: NavTarget) => void) => () => void;
  /** Bell entries (event notifications). */
  notifications: AppNotification[];
  notificationsUnread: number;
  notificationsLoaded: boolean;
  hasMoreNotifications: boolean;
  loadMoreNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

const PAGE_SIZE = 30;

/** Strip the dashboard's local view so the next render re-adapts from data. */
function fresh(c: RawConversation): RawConversation {
  if (!("__view" in c)) return c;
  const rest = { ...c };
  delete rest.__view;
  return rest;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  // The REST layer authenticates by cookie; the token is passed the same way
  // the dashboards always have.
  const { user, accessToken } = useAuth();
  const { mode, setMode } = useDashboard();
  const { connected } = useSocket();
  const myUserId = user?.id ?? null;
  const sellerOnly = user?.role === "SELLER";

  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ─── Conversations ────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<RawConversation[]>([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const openConversationRef = useRef<string | null>(null);
  // Socket handlers decide things from the latest list without waiting for a
  // render (state updaters may run later than the handler).
  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const refreshConversations = useCallback(async () => {
    if (!myUserId) return;
    try {
      const data = await apiRequest<{ conversations?: RawConversation[] }>("/api/conversations", { token: accessToken ?? undefined });
      const list = Array.isArray(data?.conversations) ? data.conversations : [];
      setConversations(list);
    } catch {
      // Keep the current list on a transient failure; blanking the inbox on
      // a network blip is worse than showing a slightly stale one.
    } finally {
      setConversationsLoaded(true);
    }
  }, [myUserId, accessToken]);

  // Several triggers (claim events, unknown threads) can land together; one
  // refetch covers them all.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      void refreshConversations();
    }, 150);
  }, [refreshConversations]);
  useEffect(() => () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); }, []);

  useEffect(() => {
    if (!myUserId) { setConversations([]); setConversationsLoaded(false); return; }
    void refreshConversations();
  }, [myUserId, refreshConversations]);

  const updateConversations = useCallback((updater: (prev: RawConversation[]) => RawConversation[]) => {
    setConversations((prev) => updater(prev));
  }, []);

  const setOpenConversation = useCallback((id: string | null) => {
    openConversationRef.current = id;
  }, []);
  const isConversationOpen = useCallback((id: string | null | undefined) => (
    !!id && openConversationRef.current === id
  ), []);

  useSocketEvent<MessagePayload>("message:new", (payload) => {
    const cid = payload?.conversationId;
    const message = payload?.message;
    if (!cid || !message) return;
    const fromMe = message.senderId === myUserId;
    // A NOTICE is system narration of a claim change, not someone writing to
    // you; the server doesn't count it as unread, so neither do we.
    const isNotice = message.messageType === "NOTICE";
    const isOpen = openConversationRef.current === cid;
    // A thread we haven't seen (a first message, or one that was archived and
    // has just come back): fetch the list so its item and person fill in.
    if (!conversationsRef.current.some((c) => c.id === cid)) scheduleRefresh();
    setConversations((prev) => {
      const existing = prev.find((c) => c.id === cid);
      if (!existing) return prev;
      const unreadCount = (fromMe || isNotice || isOpen) ? (existing.unreadCount || 0) : (existing.unreadCount || 0) + 1;
      const updated: RawConversation = {
        ...fresh(existing),
        lastMessage: message,
        lastMessageAt: message.createdAt || existing.lastMessageAt,
        unreadCount,
      };
      return [updated, ...prev.filter((c) => c.id !== cid)];
    });
  });

  useSocketEvent<{ conversationId?: string; readByUserId?: string; readAt?: string }>("conversation:read", (payload) => {
    const cid = payload?.conversationId;
    if (!cid) return;
    const readByMe = !!payload.readByUserId && payload.readByUserId === myUserId;
    setConversations((prev) => prev.map((c) => {
      if (c.id !== cid) return c;
      // Me, in this tab or another one: the thread is read.
      if (readByMe) return { ...fresh(c), unreadCount: 0 };
      // The other person: their read position, for my read ticks.
      return { ...fresh(c), otherLastReadAt: payload.readAt || c.otherLastReadAt };
    }));
  });

  // Claim changes alter the item status embedded in each conversation (the
  // composer locks once an item is SOLD).
  useSocketEvent("claim:new", () => scheduleRefresh());
  useSocketEvent("claim:updated", () => scheduleRefresh());

  const roleOfConversation = useCallback((c: Pick<RawConversation, "buyerId" | "sellerId"> | null | undefined): Role | null => {
    if (!c || !myUserId) return null;
    if (c.buyerId === myUserId) return "buyer";
    if (c.sellerId === myUserId) return "seller";
    return null;
  }, [myUserId]);

  const unread = useMemo<Record<Role, number>>(() => {
    const counts = { buyer: 0, seller: 0 };
    for (const c of conversations) {
      if ((c.unreadCount || 0) <= 0) continue;
      const role = roleOfConversation(c);
      if (role) counts[role] += 1;
    }
    if (sellerOnly) counts.buyer = 0;
    return counts;
  }, [conversations, roleOfConversation, sellerOnly]);

  // ─── Bell entries ─────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const notificationsRef = useRef(notifications);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  const refreshNotifications = useCallback(async () => {
    if (!myUserId) return;
    try {
      const data = await apiRequest<{ notifications: AppNotification[]; unreadCount: number; nextBefore: string | null }>(
        `/api/notifications?limit=${PAGE_SIZE}`, { token: accessToken ?? undefined });
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setNotificationsUnread(data?.unreadCount ?? 0);
      setNextBefore(data?.nextBefore ?? null);
    } catch {
      /* keep what we have */
    } finally {
      setNotificationsLoaded(true);
    }
  }, [myUserId, accessToken]);

  useEffect(() => {
    if (!myUserId) { setNotifications([]); setNotificationsUnread(0); setNotificationsLoaded(false); setNextBefore(null); return; }
    void refreshNotifications();
  }, [myUserId, refreshNotifications]);

  const loadMoreNotifications = useCallback(async () => {
    if (!nextBefore) return;
    try {
      const data = await apiRequest<{ notifications: AppNotification[]; nextBefore: string | null }>(
        `/api/notifications?limit=${PAGE_SIZE}&before=${encodeURIComponent(nextBefore)}`, { token: accessToken ?? undefined });
      const more = Array.isArray(data?.notifications) ? data.notifications : [];
      setNotifications((prev) => [...prev, ...more.filter((n) => !prev.some((p) => p.id === n.id))]);
      setNextBefore(data?.nextBefore ?? null);
    } catch {
      /* the button stays, so they can try again */
    }
  }, [nextBefore, accessToken]);

  useSocketEvent<AppNotification>("notification:new", (n) => {
    if (!n?.id) return;
    // A SELLER-only account has no buying side; the API leaves these out of
    // its list and count, so the live path does too.
    if (sellerOnly && n.role === "BUYER") return;
    setNotifications((prev) => (prev.some((p) => p.id === n.id) ? prev : [n, ...prev]));
    if (!n.readAt) setNotificationsUnread((u) => u + 1);
  });

  useSocketEvent<{ ids?: string[]; all?: boolean; readAt?: string }>("notification:read", (p) => {
    const readAt = p?.readAt || new Date().toISOString();
    if (p?.all) {
      setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt })));
      setNotificationsUnread(0);
      return;
    }
    const ids = new Set(p?.ids || []);
    if (!ids.size) return;
    let newlyRead = 0;
    let unseen = false;
    ids.forEach((id) => {
      const n = notificationsRef.current.find((x) => x.id === id);
      if (!n) unseen = true;
      else if (!n.readAt) newlyRead += 1;
    });
    setNotifications((prev) => prev.map((n) => (ids.has(n.id) && !n.readAt ? { ...n, readAt } : n)));
    // An entry older than the loaded page: we can't tell if it was unread,
    // so ask the server for the count instead of guessing. (Already read
    // here, e.g. this tab made the change: nothing to subtract.)
    if (unseen) void refreshNotifications();
    else if (newlyRead) setNotificationsUnread((u) => Math.max(0, u - newlyRead));
  });

  const markNotificationRead = useCallback(async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.readAt) return;
    const readAt = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt } : n)));
    setNotificationsUnread((u) => Math.max(0, u - 1));
    try {
      await apiRequest(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH", token: accessToken ?? undefined });
    } catch {
      void refreshNotifications();
    }
  }, [notifications, accessToken, refreshNotifications]);

  // Only the event entries. Conversations keep their own unread state: a
  // thread is read when it's opened, not when the bell is cleared.
  const markAllNotificationsRead = useCallback(async () => {
    const readAt = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt })));
    setNotificationsUnread(0);
    try {
      await apiRequest("/api/notifications/read-all", { method: "PATCH", token: accessToken ?? undefined });
    } catch {
      void refreshNotifications();
    }
  }, [accessToken, refreshNotifications]);

  // ─── Connect / reconnect: re-pull what the socket may have missed ──────
  // Every connect, the first one included: the mount fetches can run before
  // the socket is up, and an event in between (a message, a thread read in
  // another tab) would otherwise be missed until the next one. Reconnects
  // catch up on whatever happened while it was down.
  useEffect(() => {
    if (!connected) return;
    void refreshConversations();
    void refreshNotifications();
  }, [connected, refreshConversations, refreshNotifications]);

  // ─── Moving between modes for a conversation ──────────────────────────
  // Archived threads aren't in the inbox list; look there before giving up.
  const findRole = useCallback(async (conversationId: string): Promise<Role | null> => {
    const known = conversations.find((c) => c.id === conversationId);
    if (known) return roleOfConversation(known);
    try {
      const data = await apiRequest<{ conversations?: RawConversation[] }>("/api/conversations?archived=true", { token: accessToken ?? undefined });
      const hit = (data?.conversations || []).find((c) => c.id === conversationId);
      return hit ? roleOfConversation(hit) : null;
    } catch {
      return null;
    }
  }, [conversations, roleOfConversation, accessToken]);

  // Only one dashboard is mounted, so one handler at a time.
  const navHandlerRef = useRef<((target: NavTarget) => void) | null>(null);
  const registerNavHandler = useCallback((handler: (target: NavTarget) => void) => {
    navHandlerRef.current = handler;
    return () => { if (navHandlerRef.current === handler) navHandlerRef.current = null; };
  }, []);

  const navigate = useCallback((target: NavTarget) => {
    const current = modeRef.current;
    if (target.role === "buyer" && sellerOnly) return;
    if (target.role === current) {
      navHandlerRef.current?.(target);
      return;
    }
    // Record where we are, so Back can restore this mode and page...
    const here = new URL(window.location.href);
    here.searchParams.set("mode", current);
    window.history.replaceState(null, "", here.pathname + here.search);
    // ...then a new entry for the other side's destination, which that
    // dashboard reads from the URL as it mounts.
    const there = new URL(window.location.origin + window.location.pathname);
    there.searchParams.set("mode", target.role);
    if (target.conversationId) {
      there.searchParams.set("tab", "messages");
      there.searchParams.set("conversation", target.conversationId);
    } else if (target.itemId) {
      there.searchParams.set("item", target.itemId);
    } else if (target.tab) {
      there.searchParams.set("tab", target.tab);
    }
    window.history.pushState(null, "", there.pathname + there.search);
    setMode(target.role);
  }, [setMode, sellerOnly]);

  const jumpToConversation = useCallback(async (conversationId: string) => {
    const role = await findRole(conversationId);
    if (!role || (role === "buyer" && sellerOnly)) return false;
    navigate({ role, conversationId });
    return true;
  }, [findRole, navigate, sellerOnly]);

  // Back / Forward across a jump: the entry says which mode it belongs to.
  // An entry without ?mode= (e.g. the page before a followed ?conversation=
  // link switched sides for that visit only) belongs to the saved mode.
  useEffect(() => {
    const onPop = () => {
      let m = new URLSearchParams(window.location.search).get("mode");
      if (m !== "buyer" && m !== "seller") {
        try { m = window.localStorage.getItem("dropyard:mode"); } catch { m = null; }
      }
      if (m !== "buyer" && m !== "seller") return;
      if (m === "buyer" && sellerOnly) return;
      if (m !== modeRef.current) setMode(m);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setMode, sellerOnly]);

  // A ?conversation= link for the other side (a shared link, or one followed
  // while in the wrong mode) switches to that side instead of showing an
  // empty thread. Checked once per link, after the list has loaded.
  // Read through useSearchParams so a link followed inside the app (same
  // page, new URL) is checked too, not only the one the page loaded with.
  const searchParams = useSearchParams();
  const linkedConversation = searchParams?.get("conversation") ?? null;
  const checkedLinkRef = useRef<string | null>(null);
  useEffect(() => {
    if (!conversationsLoaded) return;
    const id = linkedConversation;
    if (!id || checkedLinkRef.current === id) return;
    checkedLinkRef.current = id;
    let cancelled = false;
    void findRole(id).then((role) => {
      if (cancelled || !role || role === modeRef.current) return;
      if (role === "buyer" && sellerOnly) return;
      const url = new URL(window.location.href);
      url.searchParams.set("mode", role);
      url.searchParams.set("tab", "messages");
      window.history.replaceState(null, "", url.pathname + url.search);
      // Following a link is this visit's choice, not a new default side.
      setMode(role, { persist: false });
    });
    return () => { cancelled = true; };
  }, [conversationsLoaded, linkedConversation, findRole, setMode, sellerOnly]);

  const value = useMemo<NotificationsValue>(() => ({
    myUserId,
    mode,
    sellerOnly,
    conversations,
    conversationsLoaded,
    updateConversations,
    refreshConversations,
    unread,
    roleOfConversation,
    setOpenConversation,
    isConversationOpen,
    navigate,
    jumpToConversation,
    registerNavHandler,
    notifications,
    notificationsUnread,
    notificationsLoaded,
    hasMoreNotifications: !!nextBefore,
    loadMoreNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  }), [myUserId, mode, sellerOnly, conversations, conversationsLoaded, updateConversations, refreshConversations, unread,
    roleOfConversation, setOpenConversation, isConversationOpen, navigate, jumpToConversation, registerNavHandler,
    notifications, notificationsUnread, notificationsLoaded, nextBefore, loadMoreNotifications, markNotificationRead,
    markAllNotificationsRead]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      {/* One instance for the whole page, above both dashboards, so a mode
          switch can never show the same toast twice. */}
      <NotificationToasts />
    </NotificationsContext.Provider>
  );
}

/** null outside the provider (e.g. the /preview dashboards). */
export function useNotifications(): NotificationsValue | null {
  return useContext(NotificationsContext);
}

type Adapt<V> = (api: RawConversation, myId: string | null) => V | null;
type ConvRow = { id: string; unreadCount?: number; otherLastReadAt?: string | null; _api?: RawConversation };

/**
 * One side's conversation list, adapted for that dashboard, with the same
 * `[list, setList]` shape the dashboards always used.
 *
 * Inside the provider the list is a view of the shared conversations, and
 * setList writes back to them, so a thread read or archived on this side is
 * reflected in the badges straight away. Each adapted row keeps a reference
 * to its source (`_api`); a row changed locally is stored as `__view` on its
 * source until the next real update for that thread replaces it.
 *
 * `adapt` must be stable (a module-level function), or the list re-adapts
 * on every render.
 *
 * Outside the provider (the /preview pages) it's plain local state, seeded
 * with the demo list.
 */
export function useRoleConversations<V extends ConvRow>(
  role: Role,
  adapt: Adapt<V>,
  fallbackInitial: V[] = [],
): [V[], (updater: V[] | ((prev: V[]) => V[])) => void, boolean] {
  const ctx = useNotifications();
  const [local, setLocal] = useState<V[]>(fallbackInitial);

  const myUserId = ctx?.myUserId ?? null;
  const belongs = useCallback((c: RawConversation) => (
    role === "buyer" ? c.buyerId === myUserId : c.sellerId === myUserId
  ), [role, myUserId]);

  const toView = useCallback((c: RawConversation): V | null => {
    if (c.__view) return c.__view as V;
    const v = adapt(c, myUserId);
    return v ? ({ ...v, _api: c } as V) : null;
  }, [adapt, myUserId]);

  const shared = ctx?.conversations;
  const list = useMemo<V[]>(() => {
    if (!shared) return local;
    const out: V[] = [];
    for (const c of shared) {
      if (!belongs(c)) continue;
      const v = toView(c);
      if (v) out.push(v);
    }
    return out;
  }, [shared, local, belongs, toView]);

  const update = ctx?.updateConversations;
  const setList = useCallback((updater: V[] | ((prev: V[]) => V[])) => {
    if (!update) { setLocal(updater); return; }
    update((prevAll) => {
      const mine: V[] = [];
      const others: RawConversation[] = [];
      for (const c of prevAll) {
        if (belongs(c)) { const v = toView(c); if (v) mine.push(v); } else others.push(c);
      }
      const next = typeof updater === "function" ? updater(mine) : updater;
      const nextMine = next.map((v): RawConversation => {
        // The current source row; a row coming back from elsewhere (the
        // Archived tab) brings its own.
        const source = prevAll.find((c) => c.id === v.id) ?? v._api ?? ({ id: v.id } as RawConversation);
        const base = fresh(source);
        return {
          ...base,
          // The two fields that feed counts and read ticks follow the edit.
          unreadCount: v.unreadCount ?? base.unreadCount ?? 0,
          otherLastReadAt: v.otherLastReadAt ?? base.otherLastReadAt ?? null,
          __view: v,
        };
      });
      // Keep the inbox ordering the dashboard chose for its own rows; the
      // other side's rows don't interleave with them in any view.
      return [...nextMine, ...others];
    });
  }, [update, belongs, toView]);

  return [list, setList, !!ctx];
}
