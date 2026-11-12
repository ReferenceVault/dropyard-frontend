"use client";

import type { ReactNode } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { ClaimStatusPill, NeedsReplyLabel } from "./ClaimStatusPill";
import type { ClaimPill } from "./claimStatus";
import { MC, MF } from "./theme";

export interface ThreadRowProps {
  title: string;
  /** "First L." */
  name: string;
  avatar?: unknown;
  avatarBg?: string;
  /** The item photo (or emoji fallback), drawn by the dashboard. */
  thumb: ReactNode;
  preview: string;
  time: string;
  unreadCount?: number;
  selected?: boolean;
  pill?: ClaimPill | null;
  needsReply?: boolean;
  muted?: boolean;
  onSelect: () => void;
}

/**
 * One inbox row: item photo with the other person's avatar on its corner,
 * title and time, name, last-message preview with the unread count, and the
 * claim pill. Selected rows are pale green with a green bar on the left.
 */
export function ThreadRow({
  title, name, avatar, avatarBg, thumb, preview, time, unreadCount = 0, selected = false,
  pill = null, needsReply = false, muted = false, onSelect,
}: ThreadRowProps) {
  const unread = unreadCount > 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      style={{
        width: "100%", textAlign: "left", padding: "14px 16px 14px 18px", border: "none", borderBottom: "1px solid " + MC.fawn,
        background: selected ? MC.greenWash : MC.paper, cursor: "pointer", display: "flex", gap: 12, position: "relative",
        opacity: muted && !selected ? 0.72 : 1,
      }}
    >
      {selected && <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: MC.green }} />}
      <span style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
        <span style={{ display: "flex", width: 52, height: 52, borderRadius: 12, overflow: "hidden", background: MC.sand, border: "1px solid " + MC.fawn, alignItems: "center", justifyContent: "center" }}>
          {thumb}
        </span>
        <span style={{ position: "absolute", right: -5, bottom: -5, borderRadius: "50%", boxShadow: "0 0 0 2px " + (selected ? MC.greenWash : MC.paper), display: "flex" }}>
          <UserAvatar avatar={avatar} name={name} size={24} decorative initialsBg={avatarBg} fontFamily={MF.head} fontSize={9} />
        </span>
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0, fontFamily: MF.head, fontSize: 14, fontWeight: 800, color: MC.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
          <span style={{ fontFamily: MF.body, fontSize: 11, fontWeight: unread ? 800 : 600, color: unread ? MC.orange : MC.ash, flexShrink: 0 }}>{time}</span>
        </span>
        <span style={{ fontFamily: MF.body, fontSize: 12, fontWeight: 600, color: MC.mink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0, fontFamily: MF.body, fontSize: 12.5, fontWeight: unread ? 700 : 500, color: unread ? MC.ink : MC.mink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {preview || <span style={{ fontStyle: "italic", color: MC.ash }}>No messages yet</span>}
          </span>
          {unread && (
            <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: MC.orange, color: "#fff", fontFamily: MF.head, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {unreadCount > 99 ? "99+" : unreadCount}
              <span className="sr-only"> unread {unreadCount === 1 ? "message" : "messages"}</span>
            </span>
          )}
        </span>
        {(pill || needsReply) && (
          <span style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {needsReply && <NeedsReplyLabel />}
            <ClaimStatusPill pill={pill} />
          </span>
        )}
      </span>
    </button>
  );
}
