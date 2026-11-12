"use client";

// The bell in both dashboards' top bars. Its count is everything waiting for
// this person on BOTH sides: unread conversations (buying and selling) plus
// unread bell entries (claims, offers, pickups, questions). The panel lists
// both: unread conversations first (read by opening them), then activity.
//
// Desktop and tablet (768px and wider): a popover under the bell. Phones: a
// bottom sheet, modal, like the other sheets in the app.

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Bell, Check, X, MessageSquare, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications, type AppNotification, type NavTarget, type RawConversation, type Role } from "@/context/NotificationsContext";
import { ModalPortal } from "@/components/ModalPortal";
import { ModalA11y } from "@/components/ModalA11y";
import { UserAvatar } from "@/components/UserAvatar";
import { Z, SHEET_PANEL, dialogHead } from "@/lib/layers";
import { MC, MF } from "@/components/messages/theme";
import { inboxTime, previewText } from "@/components/messages/format";
import { describeNotification, roleOf, ROLE_LABEL } from "./describe";

const PHONE_QUERY = "(max-width: 767px)";

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])";
function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
}

function useIsPhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const update = () => setPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return phone;
}

const srOnly: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden",
  clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0,
};

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

export function NotificationBell() {
  const inbox = useNotifications();
  const [open, setOpen] = useState(false);
  const isPhone = useIsPhone();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }, []);

  if (!inbox) return null;
  const messageCount = inbox.unread.buyer + inbox.unread.seller;
  const total = messageCount + inbox.notificationsUnread;
  const label = total > 0 ? `Notifications, ${total} unread` : "Notifications";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="dy-notif-bell"
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={16} style={{ color: MC.mink }} strokeWidth={2.2} aria-hidden="true" />
        {total > 0 && (
          <span aria-hidden="true" style={{
            position: "absolute", top: 3, right: 3,
            minWidth: 16, height: 16, padding: "0 4px",
            borderRadius: 999, background: MC.claret, color: "#fff",
            fontFamily: MF.head, fontSize: 9, fontWeight: 800,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: "2px solid " + MC.paper,
          }}>{total > 99 ? "99+" : total}</span>
        )}
      </button>
      {open && (isPhone
        ? <NotificationSheet id={panelId} onClose={() => close(false)} />
        : <NotificationPopover id={panelId} anchor={buttonRef} onClose={close} />)}
    </>
  );
}

// ─── Desktop: a popover under the bell ──────────────────────────────────
function NotificationPopover({ id, anchor, onClose }: {
  id: string;
  anchor: React.RefObject<HTMLButtonElement | null>;
  onClose: (refocus: boolean) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const headingId = id + "-title";

  useLayoutEffect(() => {
    const place = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (!r) return;
      setPos({ top: Math.round(r.bottom + 8), right: Math.max(16, Math.round(window.innerWidth - r.right)) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [anchor]);

  // Focus moves into the panel so a screen reader announces it, and Tab
  // continues through its entries. Once it's placed: hidden can't take focus.
  const placed = pos !== null;
  useEffect(() => { if (placed) panelRef.current?.focus(); }, [placed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(true); } };
    // A click anywhere else closes it (the bell toggles it itself).
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [anchor, onClose]);

  return (
    <ModalPortal>
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-labelledby={headingId}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const panel = panelRef.current;
          if (!panel) return;
          const items = focusables(panel);
          const first = items[0], last = items[items.length - 1];
          const active = document.activeElement;
          // The panel lives at the end of <body>, away from the bell. Tabbing
          // off either end leaves it where the bell is, as a menu would:
          // forwards to whatever follows the bell, backwards to the bell.
          if (!e.shiftKey && (active === last || items.length === 0)) {
            e.preventDefault();
            onClose(false);
            const bell = anchor.current;
            const page = bell ? focusables(document.body).filter((el) => !panel.contains(el)) : [];
            const next = bell ? page[page.indexOf(bell) + 1] : null;
            (next || bell)?.focus();
          } else if (e.shiftKey && (active === first || active === panel)) {
            e.preventDefault();
            onClose(true);
          }
        }}
        // Tabbing out of the panel closes it, like any menu. Checked a tick
        // later: a button that disappears ("Show older" on the last page)
        // drops focus to <body>, and that shouldn't close the panel.
        onBlur={() => {
          setTimeout(() => {
            const panel = panelRef.current;
            if (!panel) return;
            const a = document.activeElement;
            if (panel.contains(a) || anchor.current?.contains(a)) return;
            if (!a || a === document.body) { panel.focus(); return; }
            onClose(false);
          }, 0);
        }}
        style={{
          position: "fixed", top: pos?.top ?? 64, right: pos?.right ?? 16, zIndex: Z.popover,
          width: "min(400px, calc(100vw - 32px))",
          maxHeight: `calc(100dvh - ${(pos?.top ?? 64) + 16}px)`,
          overflowY: "auto", overscrollBehavior: "contain",
          background: MC.paper, border: "1px solid " + MC.fawn, borderRadius: 16,
          boxShadow: "0 18px 48px rgba(15, 54, 11, 0.18), 0 2px 6px rgba(15, 54, 11, 0.06)",
          padding: "14px 0 8px", outline: "none",
          visibility: pos ? "visible" : "hidden",
        }}
      >
        <NotificationPanel headingId={headingId} onDone={() => onClose(false)} />
      </div>
    </ModalPortal>
  );
}

// ─── Phones: a bottom sheet ──────────────────────────────────────────────
function NotificationSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const headingId = id + "-title";
  return (
    <ModalPortal>
      <div
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{ position: "fixed", inset: 0, zIndex: Z.modal, background: "rgba(15, 54, 11, 0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      >
        <div id={id} className={SHEET_PANEL} style={{
          width: "100%", maxWidth: 560, background: MC.paper, borderRadius: "20px 20px 0 0",
          padding: "10px 0 calc(14px + env(safe-area-inset-bottom, 0px))", boxShadow: "0 -12px 40px rgba(15, 54, 11, 0.25)",
        }}>
          <ModalA11y label="Notifications" onClose={onClose} />
          <span aria-hidden style={{ display: "block", margin: "0 auto 8px", width: 40, height: 4, borderRadius: 999, background: MC.fawn }} />
          <NotificationPanel headingId={headingId} onDone={onClose} sheet />
        </div>
      </div>
    </ModalPortal>
  );
}

// ─── The list itself ─────────────────────────────────────────────────────
function NotificationPanel({ headingId, onDone, sheet = false }: { headingId: string; onDone: () => void; sheet?: boolean }) {
  const inbox = useNotifications()!;
  const { user } = useAuth();
  const both = user?.role === "BOTH";
  const pad = sheet ? 10 : 14;

  const go = (target: NavTarget) => { onDone(); inbox.navigate(target); };

  const unreadThreads = inbox.conversations
    .filter((c) => (c.unreadCount || 0) > 0)
    .map((c) => ({ c, role: inbox.roleOfConversation(c) }))
    .filter((x): x is { c: RawConversation; role: Role } => !!x.role && !(x.role === "buyer" && inbox.sellerOnly));

  const events = inbox.notifications.filter((n) => !(inbox.sellerOnly && n.role === "BUYER"));
  const nothing = unreadThreads.length === 0 && events.length === 0;

  return (
    <div style={{ fontFamily: MF.body, color: MC.ink }}>
      <div style={{ ...dialogHead(pad, MC.paper), display: "flex", alignItems: "center", gap: 8, padding: `${pad}px 16px 8px` }}>
        <h2 id={headingId} style={{ margin: 0, flex: 1, fontFamily: MF.head, fontSize: 17, fontWeight: 800 }}>Notifications</h2>
        {sheet && (
          <button type="button" onClick={onDone} aria-label="Close notifications" style={iconButton}>
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {!inbox.notificationsLoaded && !inbox.conversationsLoaded ? (
        <p style={emptyText}>Loading…</p>
      ) : nothing ? (
        <div style={{ padding: "18px 16px 22px", textAlign: "center" }}>
          <p style={{ margin: 0, fontFamily: MF.head, fontWeight: 800, fontSize: 15 }}>You&apos;re all caught up</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: MC.ash }}>New messages, claims, offers and questions will show up here.</p>
        </div>
      ) : (
        <>
          {unreadThreads.length > 0 && (
            <section aria-labelledby={headingId + "-msgs"}>
              <h3 id={headingId + "-msgs"} style={sectionTitle}>Unread messages</h3>
              <ul style={list}>
                {unreadThreads.map(({ c, role }) => {
                  const other = c.otherUser as { name?: string; avatar?: unknown } | null | undefined;
                  const item = c.item as { title?: string } | null | undefined;
                  const name = other?.name || (role === "buyer" ? "Seller" : "Buyer");
                  const count = c.unreadCount || 0;
                  const preview = previewText(c.lastMessage as Parameters<typeof previewText>[0]);
                  return (
                    <li key={c.id}>
                      <button type="button" style={entry} className="dy-notif-entry" onClick={() => go({ role, conversationId: c.id })}>
                        <UserAvatar avatar={other?.avatar} name={name} size={36} decorative />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={entryTop}>
                            <span style={{ fontWeight: 800 }}>{name}</span>
                            {both && <span style={roleChip(role)}>{ROLE_LABEL[role]}</span>}
                          </span>
                          <span style={entryLine}>
                            {plural(count, "new message")} about {item?.title || "an item"}
                          </span>
                          {preview && <span style={{ ...entryLine, color: MC.ash }}>{preview}</span>}
                        </span>
                        <span style={entryTime}>{inboxTime(c.lastMessageAt ?? null)}</span>
                        <span aria-hidden="true" style={dot} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section aria-labelledby={headingId + "-activity"}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px 0" }}>
              <h3 id={headingId + "-activity"} style={{ ...sectionTitle, padding: 0, flex: 1 }}>Activity</h3>
              {/* Only the activity entries: a conversation is read by opening it. */}
              <button
                type="button"
                // aria-disabled rather than disabled: it keeps focus (and the
                // popover open) after the click that empties the count.
                onClick={() => { if (inbox.notificationsUnread > 0) void inbox.markAllNotificationsRead(); }}
                aria-disabled={inbox.notificationsUnread === 0}
                aria-describedby={headingId + "-mark-help"}
                style={{ ...textButton, opacity: inbox.notificationsUnread === 0 ? 0.5 : 1, cursor: inbox.notificationsUnread === 0 ? "default" : "pointer" }}
              >
                <Check size={14} aria-hidden="true" /> Mark notifications as read
              </button>
            </div>
            <p id={headingId + "-mark-help"} style={{ margin: "2px 16px 6px", fontSize: 12, color: MC.ash }}>
              Messages stay unread until you open them.
            </p>
            {events.length === 0 ? (
              <p style={emptyText}>No activity yet.</p>
            ) : (
              <ul style={list}>
                {events.map((n) => <EventEntry key={n.id} n={n} both={both} onGo={(t) => { if (!n.readAt) void inbox.markNotificationRead(n.id); go(t); }} />)}
              </ul>
            )}
            {inbox.hasMoreNotifications && (
              <div style={{ padding: "6px 16px 4px" }}>
                <button type="button" onClick={() => inbox.loadMoreNotifications()} style={{ ...textButton, width: "100%", justifyContent: "center", padding: "9px 0" }}>
                  Show older
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function EventEntry({ n, both, onGo }: { n: AppNotification; both: boolean; onGo: (t: NavTarget) => void }) {
  const d = describeNotification(n);
  const role = roleOf(n);
  const unread = !n.readAt;
  return (
    <li>
      <button type="button" style={{ ...entry, background: unread ? MC.greenWash : "transparent" }} className="dy-notif-entry" onClick={() => onGo(d.target)}>
        {n.actor ? (
          <UserAvatar avatar={n.actor.avatar} name={n.actor.name} size={36} decorative />
        ) : (
          <span aria-hidden="true" style={{ width: 36, height: 36, minWidth: 36, borderRadius: 999, background: MC.greyMist, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            {n.type.startsWith("QUESTION") ? <MessageSquare size={16} color={MC.mink} /> : <Clock size={16} color={MC.mink} />}
          </span>
        )}
        <span style={{ flex: 1, minWidth: 0 }}>
          {unread && <span style={srOnly}>Unread: </span>}
          <span style={{ ...entryLine, color: MC.ink, fontWeight: unread ? 700 : 500, whiteSpace: "normal" }}>{d.text}</span>
          {both && <span style={{ ...roleChip(role), marginTop: 3 }}>{ROLE_LABEL[role]}</span>}
        </span>
        <span style={entryTime}>{inboxTime(n.createdAt)}</span>
        <span aria-hidden="true" style={{ ...dot, visibility: unread ? "visible" : "hidden" }} />
      </button>
    </li>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const iconButton: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 999, border: "1px solid " + MC.fawn, background: MC.paper,
  display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: MC.mink,
};
const sectionTitle: React.CSSProperties = {
  margin: 0, padding: "10px 16px 4px", fontFamily: MF.head, fontSize: 12, fontWeight: 800,
  letterSpacing: "0.06em", textTransform: "uppercase", color: MC.mink,
};
const list: React.CSSProperties = { listStyle: "none", margin: 0, padding: 0 };
const entry: React.CSSProperties = {
  width: "100%", display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 16px",
  border: "none", background: "transparent", textAlign: "left", cursor: "pointer",
  fontFamily: MF.body, fontSize: 13.5, color: MC.ink, lineHeight: 1.35,
};
const entryTop: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" };
const entryLine: React.CSSProperties = {
  display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1,
};
const entryTime: React.CSSProperties = { flexShrink: 0, fontSize: 12, color: MC.ash, marginTop: 1 };
const dot: React.CSSProperties = { flexShrink: 0, width: 8, height: 8, borderRadius: 999, background: MC.green, marginTop: 6 };
const emptyText: React.CSSProperties = { margin: 0, padding: "8px 16px 14px", fontSize: 13, color: MC.ash };
const textButton: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 8px", borderRadius: 8,
  border: "none", background: "transparent", color: MC.greenDeep, fontFamily: MF.head, fontSize: 12.5, fontWeight: 800,
};
const roleChip = (role: Role): React.CSSProperties => ({
  display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 10.5, fontWeight: 800,
  fontFamily: MF.head, letterSpacing: "0.02em",
  background: role === "seller" ? MC.greenMist : MC.amberMist,
  color: role === "seller" ? MC.greenDeep : MC.amberDeep,
});
