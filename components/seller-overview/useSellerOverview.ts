"use client";

// GET /api/items/overview for the seller Overview, kept current:
//   · refetched on claim and message events (a new claim, an accept, a
//     pickup, a buyer's message), so rows and numbers update live;
//   · refetched when the Overview's state is due to change (changesAt), so
//     it switches BEFORE → DURING → AFTER → BEFORE without a reload;
//   · refetched when the page asks (`refreshKey`, e.g. after a confirmed pickup).
// With the dashboard's simulated clock on, the time is sent along (`?at=`, a
// development aid the server ignores in production).

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useDropCycle } from "@/context/DropCycleContext";
import { useSocketEvent } from "@/context/SocketContext";
import type { OverviewAttentionData, OverviewDrop } from "./overviewState";

// sold_elsewhere: the seller marked it sold outside DropYard. Not a DropYard
// sale: no Overview number counts it.
export type ListingStatus = "sold" | "sold_elsewhere" | "pickup_pending" | "claimed" | "queued" | "live" | "shelf" | "back_on_shelf";
export interface ListingCard { id: string; title: string; price: number; photo: string | null; status: ListingStatus }
export interface SnapshotPeriod { sold: number; lb: number; neighbours: number }

export interface SellerOverviewData {
  at: string;
  drops: { current: OverviewDrop; closed: OverviewDrop; next: { liveStart: string; closedStart: string } };
  stats: { activeListings: number; itemsClaimed: number; awaitingPickup: number; completedSales: number; itemsSoldClosedDrop: number; inCurrentDrop: number };
  attention: OverviewAttentionData;
  listings: { recent: ListingCard[]; liveDrop: ListingCard[]; postDrop: ListingCard[] };
  snapshot: { last30Days: SnapshotPeriod; currentDrop: { claimed: number; lb: number; neighbours: number }; closedDrop: SnapshotPeriod };
}

export function useSellerOverview(accessToken: string | null, refreshKey: number, changesAt: number | null) {
  const { simulatedDate, effectiveNow } = useDropCycle();
  const [data, setData] = useState<SellerOverviewData | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useSocketEvent("claim:new", refresh);
  useSocketEvent("claim:updated", refresh);
  useSocketEvent("message:new", refresh);

  // The (simulated) time at fetch time: read from a ref, since it ticks.
  const nowRef = useRef(effectiveNow);
  useEffect(() => { nowRef.current = effectiveNow; });
  const simulated = !!simulatedDate;

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    const at = simulated ? "?at=" + encodeURIComponent(nowRef.current.toISOString()) : "";
    apiRequest<SellerOverviewData>("/api/items/overview" + at, { token: accessToken })
      .then((d) => { if (!cancelled) { setData(d); setFailed(false); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [accessToken, tick, refreshKey, simulated]);

  // Refetch just after the state's next change.
  const nowMs = effectiveNow.getTime();
  useEffect(() => {
    if (changesAt === null) return;
    const wait = changesAt - nowMs + 1000;
    if (wait <= 0 || wait > 7 * 86_400_000) return;
    const id = setTimeout(refresh, wait);
    return () => clearTimeout(id);
    // Re-armed when the target changes, not every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changesAt, refresh]);

  return { data, failed, now: effectiveNow, refresh };
}
