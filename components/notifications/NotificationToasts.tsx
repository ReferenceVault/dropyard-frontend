"use client";

// Pop-up toasts, rendered ONCE by NotificationsProvider (above both
// dashboards), so switching modes can never show the same one twice.
//
// What gets a toast:
//   - claim and pickup events (notification:new), on either side, unless the
//     thread they're about is the one on screen (its notice is right there);
//   - messages for the OTHER side: on the side you're looking at, the
//     Messages badge already says it. Never your own messages, never system
//     notices (those come with their own claim event), never the open thread.
// Questions only go in the bell.

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X, MessageSquare, CheckCircle, AlertCircle, Bell } from "lucide-react";
import { useNotifications, type AppNotification, type NavTarget, type Role } from "@/context/NotificationsContext";
import { useSocketEvent } from "@/context/SocketContext";
import { Z } from "@/lib/layers";
import { MC, MF } from "@/components/messages/theme";
import { describeNotification, isToastWorthy, type Tone } from "./describe";

interface ToastItem {
  key: string;
  text: string;
  detail?: string;
  tone: Tone | "message";
  target: NavTarget;
  actionLabel: string;
  /** Bell entry to mark read when the toast is followed. */
  notificationId?: string;
  /** Messages in the same thread fold into one toast. */
  count?: number;
}

interface MessagePayload {
  conversationId?: string;
  message?: { id?: string; senderId?: string; messageType?: string; body?: string; attachmentUrl?: string | null };
  conversation?: {
    buyerId?: string; sellerId?: string;
    item?: { title?: string } | null;
    sender?: { name?: string } | null;
  };
}

const MAX_TOASTS = 3;
const SHOW_MS = 8000;
// Someone writing to you; anything else is narration with its own event.
const PERSON_MESSAGE = new Set(["TEXT", "IMAGE", "OFFER", "COUNTER"]);

export function NotificationToasts() {
  const inbox = useNotifications();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = (t: ToastItem) => setToasts((prev) => {
    const existing = prev.find((p) => p.key === t.key);
    const merged = existing ? { ...t, count: (existing.count || 1) + 1 } : t;
    return [...prev.filter((p) => p.key !== t.key), merged].slice(-MAX_TOASTS);
  });
  const dismiss = (key: string) => setToasts((prev) => prev.filter((p) => p.key !== key));

  useSocketEvent<AppNotification>("notification:new", (n) => {
    if (!inbox || !n?.id || !isToastWorthy(n)) return;
    if (inbox.sellerOnly && n.role === "BUYER") return;
    if (inbox.isConversationOpen(n.conversationId)) return;
    const d = describeNotification(n);
    push({
      key: "n:" + n.id, text: d.text, tone: d.tone, target: d.target,
      actionLabel: "View", notificationId: n.id,
    });
  });

  useSocketEvent<MessagePayload>("message:new", (p) => {
    if (!inbox || !p?.conversationId || !p.message) return;
    const m = p.message;
    if (!m.senderId || m.senderId === inbox.myUserId) return;
    if (!PERSON_MESSAGE.has(m.messageType || "TEXT")) return;
    const role = inbox.roleOfConversation(p.conversation) as Role | null;
    if (!role || role === inbox.mode) return;
    if (role === "buyer" && inbox.sellerOnly) return;
    if (inbox.isConversationOpen(p.conversationId)) return;
    const who = p.conversation?.sender?.name || "Someone";
    const what = p.conversation?.item?.title || "an item";
    const body = (m.body || "").trim() || (m.attachmentUrl ? "Photo" : "");
    push({
      key: "m:" + p.conversationId,
      text: `${who} sent you a message about ${what}`,
      detail: body ? body.slice(0, 120) : undefined,
      tone: "message",
      target: { role, conversationId: p.conversationId },
      actionLabel: role === "seller" ? "Open in Selling" : "Open in Buying",
    });
  });

  // Client-only, after hydration: the server never renders toasts, so the
  // stack mustn't be part of the hydrated markup.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  if (!inbox || !hydrated) return null;
  // Signed out (the provider goes with /buyer anyway): nothing to show.
  const visible = inbox.myUserId ? toasts : [];
  return createPortal(
    // Always rendered, even empty, so screen readers pick up additions.
    <div
      className="dy-toast-stack"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      aria-relevant="additions"
      style={{ zIndex: Z.toast }}
    >
      {visible.map((t) => (
        <Toast
          key={t.key + ":" + (t.count || 1)}
          toast={t}
          onDismiss={() => dismiss(t.key)}
          onOpen={() => {
            dismiss(t.key);
            if (t.notificationId) void inbox.markNotificationRead(t.notificationId);
            inbox.navigate(t.target);
          }}
        />
      ))}
    </div>,
    document.body,
  );
}

const noopSubscribe = () => () => {};

function Toast({ toast, onDismiss, onOpen }: { toast: ToastItem; onDismiss: () => void; onOpen: () => void }) {
  // Paused while the pointer or keyboard focus is on it, so it can't vanish
  // mid-read or from under a click.
  const [paused, setPaused] = useState(false);
  const left = useRef(SHOW_MS);
  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; });
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = setTimeout(() => dismissRef.current(), left.current);
    return () => { clearTimeout(timer); left.current -= Date.now() - started; };
  }, [paused]);

  const Icon = toast.tone === "message" ? MessageSquare : toast.tone === "good" ? CheckCircle : toast.tone === "bad" ? AlertCircle : Bell;
  const accent = toast.tone === "bad" ? MC.claret : toast.tone === "info" ? MC.amberDeep : MC.green;
  const text = toast.count && toast.count > 1 ? `${toast.text} (${toast.count} new)` : toast.text;

  return (
    <div
      className="dy-toast dy-rise"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false); }}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 12px 12px 14px",
        background: MC.paper, border: "1px solid " + MC.fawn, borderLeft: "4px solid " + accent, borderRadius: 14,
        boxShadow: "0 12px 32px rgba(15, 54, 11, 0.18)", fontFamily: MF.body, color: MC.ink,
      }}
    >
      <Icon size={18} color={accent} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, lineHeight: 1.35 }}>{text}</p>
        {toast.detail && (
          <p style={{ margin: "2px 0 0", fontSize: 13, color: MC.ash, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {toast.detail}
          </p>
        )}
        <button
          type="button"
          onClick={onOpen}
          style={{
            marginTop: 6, padding: "5px 10px", borderRadius: 8, border: "1px solid " + MC.fawn, background: MC.sand,
            color: MC.greenDeep, fontFamily: MF.head, fontSize: 12.5, fontWeight: 800, cursor: "pointer",
          }}
        >
          {toast.actionLabel}
        </button>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: 999, border: "none", background: "transparent",
          display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: MC.ash,
        }}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
