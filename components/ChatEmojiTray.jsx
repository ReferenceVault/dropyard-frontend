"use client";

import { useState } from "react";
import { EMOJI_GROUPS } from "@/lib/composerEmoji";

/**
 * Categorised emoji picker for the chat composers.
 *
 * Shared by both dashboards rather than written twice: the point of the set
 * is that both ends of a conversation offer the same vocabulary, and two
 * copies of a 250-emoji grid would drift apart the first time either one is
 * touched. Colours come in as props because the two dashboards carry their
 * own design tokens.
 *
 * Stays open after a pick, the way a full picker is expected to — the old
 * 24-emoji strip closed on every tap, which is fine for one reaction and
 * tedious the moment you want two. Escape, the close button, switching
 * threads and sending all shut it.
 */
export function ChatEmojiTray({ onPick, onClose, colors, style }) {
  const [groupId, setGroupId] = useState(EMOJI_GROUPS[0].id);
  const group = EMOJI_GROUPS.find((g) => g.id === groupId) || EMOJI_GROUPS[0];
  const c = colors;

  return (
    <div
      className="fade-in"
      role="dialog"
      aria-label="Choose an emoji"
      style={{
        position: "absolute",
        width: 312,
        maxWidth: "calc(100vw - 32px)",
        borderRadius: 16,
        background: c.paper,
        border: "1px solid " + c.fawn,
        boxShadow: "0 12px 32px rgba(31,29,25,0.16)",
        overflow: "hidden",
        zIndex: 30,
        ...style,
      }}
    >
      {/* Category strip. Emoji double as their own icons — no icon set needed
          and it reads the same in every locale. */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "6px 6px 0", borderBottom: "1px solid " + c.fawn }}>
        {EMOJI_GROUPS.map((g) => {
          const on = g.id === group.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroupId(g.id)}
              title={g.label}
              aria-label={g.label}
              aria-pressed={on}
              style={{
                flex: 1,
                padding: "6px 0 8px",
                border: "none",
                background: "transparent",
                borderBottom: "2px solid " + (on ? c.accent : "transparent"),
                fontSize: 17,
                lineHeight: 1,
                cursor: "pointer",
                opacity: on ? 1 : 0.55,
              }}
            >
              {g.tab}
            </button>
          );
        })}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close emoji picker"
            style={{ width: 24, height: 24, marginLeft: 2, marginBottom: 6, borderRadius: "50%", border: "none", background: "transparent", color: c.mink, fontSize: 15, lineHeight: 1, cursor: "pointer", flexShrink: 0 }}
          >
            ×
          </button>
        )}
      </div>

      <p style={{ padding: "8px 10px 4px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: c.mink, opacity: 0.8 }}>
        {group.label}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: 2,
          padding: "0 8px 10px",
          maxHeight: 208,
          overflowY: "auto",
        }}
      >
        {group.emoji.map((em) => (
          <button
            key={em}
            type="button"
            onClick={() => onPick(em)}
            title={em}
            style={{ width: "100%", aspectRatio: "1", border: "none", borderRadius: 8, background: "transparent", fontSize: 19, lineHeight: 1, cursor: "pointer", padding: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = c.sand; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {em}
          </button>
        ))}
      </div>
    </div>
  );
}
