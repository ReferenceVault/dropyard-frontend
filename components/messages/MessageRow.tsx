"use client";

import type { ReactNode } from "react";
import { Check, CheckCheck } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { MC, MF } from "./theme";

/** "Today" / "Yesterday" / "Monday, Nov 9" between days in a thread. */
export function DateSeparator({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 14px" }}>
      <span aria-hidden="true" style={{ flex: 1, height: 1, background: MC.fawn }} />
      <span style={{ fontFamily: MF.head, fontSize: 11, fontWeight: 800, color: MC.mink, letterSpacing: "0.04em", padding: "3px 10px", borderRadius: 999, background: MC.paper, border: "1px solid " + MC.fawn }}>
        {label}
      </span>
      <span aria-hidden="true" style={{ flex: 1, height: 1, background: MC.fawn }} />
    </div>
  );
}

/**
 * Read receipts: one grey tick once the server has it, two blue ticks once
 * the other person has opened the thread since. There's no "delivered"
 * middle state because nothing tracks delivery to a device.
 */
export function ReadTicks({ sentAt, otherLastReadAt }: { sentAt?: string | null; otherLastReadAt?: string | null }) {
  if (!sentAt) return null;
  const sent = new Date(sentAt).getTime();
  const read = otherLastReadAt ? new Date(otherLastReadAt).getTime() : 0;
  const seen = Number.isFinite(sent) && read >= sent;
  return (
    <span role="img" aria-label={seen ? "Seen" : "Sent"} title={seen ? "Seen" : "Sent"} style={{ display: "inline-flex", alignItems: "center", marginLeft: 4 }}>
      {seen ? <CheckCheck size={14} strokeWidth={2.6} style={{ color: MC.seen }} /> : <Check size={14} strokeWidth={2.6} style={{ color: MC.ash }} />}
    </span>
  );
}

export interface MessageRowProps {
  side: "in" | "out";
  /** Incoming only: the sender's avatar beside the bubble. */
  avatar?: unknown;
  name?: string;
  avatarBg?: string;
  time: string;
  sentAt?: string | null;
  /** Outgoing only: how far the other person has read. */
  otherLastReadAt?: string | null;
  /** A photo bubble: no padding, the picture fills it. */
  flush?: boolean;
  children: ReactNode;
}

/**
 * One chat message: incoming bubbles grey on the left with a small avatar,
 * outgoing pale green on the right with the time and read ticks.
 */
export function MessageRow({ side, avatar, name, avatarBg, time, sentAt, otherLastReadAt, flush = false, children }: MessageRowProps) {
  const out = side === "out";
  return (
    <div style={{ display: "flex", justifyContent: out ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8, marginBottom: 12 }}>
      {!out && (
        <span style={{ flexShrink: 0, marginBottom: 20, display: "flex" }}>
          <UserAvatar avatar={avatar} name={name} size={28} decorative initialsBg={avatarBg} fontFamily={MF.head} fontSize={10} />
        </span>
      )}
      <div style={{ maxWidth: "min(78%, 520px)", minWidth: 0, display: "flex", flexDirection: "column", alignItems: out ? "flex-end" : "flex-start" }}>
        {!out && name && <span className="sr-only">{name}: </span>}
        <div
          style={{
            padding: flush ? 0 : "10px 14px", overflow: flush ? "hidden" : undefined,
            borderRadius: 18, [out ? "borderBottomRightRadius" : "borderBottomLeftRadius"]: 6,
            background: out ? MC.bubbleOut : MC.bubbleIn, color: MC.ink,
            border: "1px solid " + (out ? MC.green + "33" : MC.fawn),
            fontFamily: MF.body, fontSize: 14, fontWeight: 500, lineHeight: 1.5, overflowWrap: "anywhere",
          }}
        >
          {children}
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", marginTop: 4, padding: "0 2px", fontFamily: MF.body, fontSize: 11, fontWeight: 500, color: MC.ash }}>
          {time}
          {out && <ReadTicks sentAt={sentAt} otherLastReadAt={otherLastReadAt} />}
        </span>
      </div>
    </div>
  );
}
