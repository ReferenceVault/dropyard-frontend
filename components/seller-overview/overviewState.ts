// The seller Overview's state (BEFORE / DURING / AFTER) and its "Needs Your
// Attention" rows, as pure functions of the time and GET /api/items/overview.
// No imports, so `node --test tests/overviewState.test.mjs` runs them as is.
//
// States (times are the Drop record's, Toronto, from the endpoint):
//   DURING — the live Drop: liveStart ≤ now < closedStart. The last 3 hours
//            are "closing" (the closing-time row and note).
//   AFTER  — from the close until the end of the Monday after (afterUntil),
//            then on while the seller still has open pickups from that Drop,
//            until the next preview days start (afterCap). Only for a seller
//            who took part (hadActivity); anyone else goes straight to BEFORE.
//   BEFORE — the rest; `preview` on the preview days (Thu–Fri).

export type OverviewStateName = "before" | "during" | "after";

export interface OverviewDrop {
  id: string | null;
  previewStart: string;
  liveStart: string;
  closedStart: string;
  afterUntil: string;
  afterCap: string;
  hadActivity: boolean;
  openPickups: number;
}

export interface OverviewStateInfo {
  state: OverviewStateName;
  /** BEFORE, on the preview days. */
  preview: boolean;
  /** DURING, in the last 3 hours. */
  closing: boolean;
  /** Which Drop the AFTER state is about ("current" once this week's has closed). */
  afterDrop: "current" | "closed" | null;
  /** The next moment the state (or its flags) can change, ms; null if none known. */
  changesAt: number | null;
}

export const CLOSING_WINDOW_MS = 3 * 3_600_000;

export function overviewState(now: number, drops: { current: OverviewDrop; closed: OverviewDrop }): OverviewStateInfo {
  const t = (iso: string) => Date.parse(iso);
  const cur = drops.current;
  const liveStart = t(cur.liveStart), closedStart = t(cur.closedStart);

  if (now >= liveStart && now < closedStart) {
    const closing = closedStart - now <= CLOSING_WINDOW_MS;
    return { state: "during", preview: false, closing, afterDrop: null, changesAt: closing ? closedStart : closedStart - CLOSING_WINDOW_MS };
  }

  // The Drop that has closed most recently, as of now: this week's from its
  // close (even before the data is refetched), else the endpoint's "closed".
  const closedIsCurrent = now >= closedStart;
  const closed = closedIsCurrent ? cur : drops.closed;
  if (closed.hadActivity && now >= t(closed.closedStart)) {
    const until = t(closed.afterUntil), cap = t(closed.afterCap);
    if (now < until) {
      return { state: "after", preview: false, closing: false, afterDrop: closedIsCurrent ? "current" : "closed", changesAt: closed.openPickups > 0 ? cap : until };
    }
    if (closed.openPickups > 0 && now < cap) {
      return { state: "after", preview: false, closing: false, afterDrop: closedIsCurrent ? "current" : "closed", changesAt: cap };
    }
  }

  const previewStart = t(cur.previewStart);
  const preview = now >= previewStart && now < liveStart;
  const next = [previewStart, liveStart].filter((x) => x > now);
  return { state: "before", preview, closing: false, afterDrop: null, changesAt: next.length ? Math.min(...next) : null };
}

// ── Needs Your Attention ─────────────────────────────────────────────────

export interface OverviewAttentionData {
  claims: Array<{ claimId: string; itemId: string; title: string; photo: string | null; proposedAt: string; amount: number; fullPrice: boolean }>;
  pickups: Array<{ claimId: string; itemId: string; title: string; photo: string | null; pickupSlot: string | null; acceptedAt: string; conversationId: string | null }>;
  missingDetails: Array<{ itemId: string; title: string; photo: string | null; missing: string[] }>;
  backOnShelf: Array<{ itemId: string; title: string; photo: string | null }>;
  unsoldInCurrentDrop: number;
  messagesWaiting: number;
  drafts: number;
}

export type AttentionRow =
  | { kind: "closing"; key: string; count: number; closesAt: string }
  | { kind: "claim_review"; key: string; claimId: string; itemId: string; title: string; photo: string | null; proposedAt: string; amount: number; fullPrice: boolean }
  | { kind: "confirm_pickup"; key: string; claimId: string; itemId: string; title: string; photo: string | null; pickupSlot: string; conversationId: string | null }
  | { kind: "arrange_pickup"; key: string; claimId: string; itemId: string; title: string; photo: string | null; conversationId: string | null }
  | { kind: "back_on_shelf"; key: string; itemId: string; title: string; photo: string | null }
  | { kind: "missing_details"; key: string; itemId: string; title: string; photo: string | null; missing: string[] }
  | { kind: "messages_waiting"; key: string; count: number }
  | { kind: "drafts"; key: string; count: number };

/** When a pickup is, by the buyer's suggested time (the page passes pickupWhen's kind). */
export type PickupKind = "today" | "past" | "upcoming" | "unscheduled";

/**
 * Every attention row, most urgent first: the closing-time row (DURING, last
 * 3 hours), claims to review, pickups to confirm (today or past), pickups
 * without a time, unsold items back on the Shelf (AFTER), listings missing
 * details, buyers waiting for a reply, drafts to finish. The page shows the
 * first 3 and a "See all" for the rest.
 */
export function buildAttention(
  info: Pick<OverviewStateInfo, "state" | "closing">,
  a: OverviewAttentionData,
  closesAt: string,
  pickupKind: (slot: string | null, acceptedAt: string) => PickupKind,
): AttentionRow[] {
  const rows: AttentionRow[] = [];
  if (info.state === "during" && info.closing && a.unsoldInCurrentDrop > 0) {
    rows.push({ kind: "closing", key: "closing", count: a.unsoldInCurrentDrop, closesAt });
  }
  for (const c of a.claims) rows.push({ kind: "claim_review", key: "claim-" + c.claimId, ...c });
  const confirm: AttentionRow[] = [], arrange: AttentionRow[] = [];
  for (const p of a.pickups) {
    const k = pickupKind(p.pickupSlot, p.acceptedAt);
    if (p.pickupSlot && (k === "today" || k === "past")) {
      confirm.push({ kind: "confirm_pickup", key: "confirm-" + p.claimId, claimId: p.claimId, itemId: p.itemId, title: p.title, photo: p.photo, pickupSlot: p.pickupSlot, conversationId: p.conversationId });
    } else if (!p.pickupSlot || k === "unscheduled") {
      arrange.push({ kind: "arrange_pickup", key: "arrange-" + p.claimId, claimId: p.claimId, itemId: p.itemId, title: p.title, photo: p.photo, conversationId: p.conversationId });
    }
    // An upcoming pickup needs nothing yet.
  }
  rows.push(...confirm, ...arrange);
  const onShelf = new Set<string>();
  if (info.state === "after") for (const s of a.backOnShelf) { onShelf.add(s.itemId); rows.push({ kind: "back_on_shelf", key: "shelf-" + s.itemId, ...s }); }
  // Once per item: an unsold item's "Improve Listing" covers missing details too.
  for (const m of a.missingDetails) if (!onShelf.has(m.itemId)) rows.push({ kind: "missing_details", key: "missing-" + m.itemId, ...m });
  if (a.messagesWaiting > 0) rows.push({ kind: "messages_waiting", key: "messages", count: a.messagesWaiting });
  if (a.drafts > 0) rows.push({ kind: "drafts", key: "drafts", count: a.drafts });
  return rows;
}
