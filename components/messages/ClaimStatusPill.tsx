"use client";

import { Calendar, CheckCircle, Clock, Package, X } from "lucide-react";
import type { ClaimPill } from "./claimStatus";
import { MC, MF } from "./theme";

const TONES = {
  amber: { bg: MC.amberMist, color: MC.amberDeep, border: MC.amber + "40" },
  red: { bg: MC.claretMist, color: MC.claret, border: MC.claret + "33" },
  green: { bg: MC.greenMist, color: MC.greenDeep, border: MC.green + "40" },
  grey: { bg: MC.greyMist, color: MC.ash, border: MC.fawn },
} as const;

const ICONS = {
  "offer-pending": Clock,
  "pickup-today": Calendar,
  "in-progress": Package,
  "picked-up": CheckCircle,
  declined: X,
  expired: Clock,
  cancelled: X,
} as const;

/** The claim status pill on inbox rows ("sm") and in the thread header ("md"). */
export function ClaimStatusPill({ pill, size = "sm" }: { pill: ClaimPill | null; size?: "sm" | "md" }) {
  if (!pill) return null;
  const t = TONES[pill.tone];
  const Icon = ICONS[pill.key];
  const md = size === "md";
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: md ? 6 : 4, flexShrink: 0, whiteSpace: "nowrap",
        padding: md ? "5px 12px" : "2px 8px", borderRadius: 999, background: t.bg, color: t.color,
        border: "1px solid " + t.border, fontFamily: MF.head, fontSize: md ? 12 : 10.5, fontWeight: 800, lineHeight: 1.4,
      }}
    >
      <Icon size={md ? 13 : 11} strokeWidth={2.4} aria-hidden="true" />
      {pill.label}
    </span>
  );
}

/** The seller's "Needs reply" cue: the buyer spoke last and nobody answered. */
export function NeedsReplyLabel() {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, whiteSpace: "nowrap",
        padding: "2px 8px", borderRadius: 999, background: MC.claretMist, color: MC.claret,
        fontFamily: MF.head, fontSize: 10.5, fontWeight: 800, lineHeight: 1.4,
      }}
    >
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: MC.claret }} />
      Needs reply
    </span>
  );
}
