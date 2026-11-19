"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useDropCycle } from "@/context/DropCycleContext";
import { useSocketEvent } from "@/context/SocketContext";
import { dropCloseMoment, getDropCycleInfo, nextDropMoment } from "@/lib/dropCycle";

export type DropStatus = "UPCOMING" | "LIVE" | "ENDED";

interface CurrentDrop {
  drop: { liveStart: string; closedStart: string; endsAt: string };
  now: string;
  liveItemCount?: number;
  liveSellerCount?: number;
  claimCount?: number;
  claimedItemCount?: number;
}

/**
 * The live Drop's numbers, counted by the backend (lib/dropStats.ts there) and
 * shown as they come on the homepage's live card and the buyer's Discover
 * hero, so the two can't disagree. Never counted from the item feed: it's
 * paginated. Everyone sees the same figures, a seller's own items included.
 */
export interface LiveDropStats {
  /** Items claimable now: live Drop items and live Shelf items. */
  items: number;
  /** Distinct items (Drop or Shelf) with a claim accepted or picked up since the Drop opened. */
  claimed: number;
  /** Neighbours with at least one available item (the total of GET /api/drop/sellers). */
  sellers: number;
}

interface Schedule {
  liveStart: number;
  closedStart: number;
  endsAt: number;
  /** Server clock minus this device's, so a wrong device clock can't open the Drop. */
  skewMs: number;
}

const FETCH_TIMEOUT_MS = 5000;
/** Claims move during a live Drop, so the card's figures are refetched this often. */
const LIVE_STATS_REFRESH_MS = 60_000;

/** The next opening still ahead: during a live Drop, that's next week's. */
function upcomingOpening(now: Date): Date {
  const opening = nextDropMoment(now);
  return opening > now ? opening : nextDropMoment(new Date(dropCloseMoment(now).getTime() + 1000));
}

/**
 * Where the current Drop stands. The backend's Drop row decides; the local
 * Saturday 8 AM Toronto calculation only stands in when that row can't be
 * read, or has run out and its replacement hasn't arrived. `?simulate=` is
 * dev-only and pins a clock the server doesn't share, so it uses the local
 * calculation too.
 */
export function useDropSchedule() {
  const { effectiveNow, simulatedDate } = useDropCycle();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [settled, setSettled] = useState(false);
  const [liveStats, setLiveStats] = useState<LiveDropStats | null>(null);

  const load = useCallback(() => {
    apiRequest<CurrentDrop>("/api/drop/current", { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      .then(({ drop, now, liveItemCount, liveSellerCount, claimedItemCount }) => {
        setSchedule({
          liveStart:   new Date(drop.liveStart).getTime(),
          closedStart: new Date(drop.closedStart).getTime(),
          endsAt:      new Date(drop.endsAt).getTime(),
          skewMs:      new Date(now).getTime() - Date.now(),
        });
        // Only real figures: an older backend without them leaves the card on "--".
        if ([liveItemCount, liveSellerCount, claimedItemCount].every((n) => typeof n === "number")) {
          setLiveStats({ items: liveItemCount!, claimed: claimedItemCount!, sellers: liveSellerCount! });
        }
      })
      // The local schedule stands in. Any figures already shown were real, so they stay.
      .catch(() => {})
      .finally(() => setSettled(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  const serverSchedule = simulatedDate ? null : schedule;
  const nowMs = effectiveNow.getTime() + (serverSchedule?.skewMs ?? 0);
  const now = new Date(nowMs);
  const expired = !!serverSchedule && nowMs >= serverSchedule.endsAt;
  const active = expired ? null : serverSchedule;

  // A page left open past Monday 00:00 needs next week's Drop row.
  useEffect(() => { if (expired) load(); }, [expired, load]);

  let status: DropStatus;
  if (active) {
    status = nowMs < active.liveStart ? "UPCOMING" : nowMs < active.closedStart ? "LIVE" : "ENDED";
  } else {
    const { phase } = getDropCycleInfo(now);
    status = phase === "LIVE" ? "LIVE" : phase === "CLOSED" ? "ENDED" : "UPCOMING";
  }

  // Fresh figures the moment the Drop opens, then on a timer while it runs,
  // whenever the tab comes back into view, and right after the viewer's own
  // claims move. The figures are the server's whatever the clock, so a
  // `?simulate=`d live Drop refreshes too.
  const isLive = status === "LIVE";
  useEffect(() => {
    if (!isLive) return;
    load();
    const id = setInterval(load, LIVE_STATS_REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [isLive, load]);
  const reloadIfLive = useCallback(() => { if (isLive) load(); }, [isLive, load]);
  useSocketEvent("claim:new", reloadIfLive);
  useSocketEvent("claim:updated", reloadIfLive);

  return {
    // The provider's clock starts at the epoch until it mounts on the client.
    // Nothing is decided until the backend has answered, so a Saturday page
    // can't show one state and then swap to the other.
    ready:     effectiveNow.getTime() > 0 && (settled || !!simulatedDate),
    status,
    now,
    opensAt:   active && nowMs < active.liveStart ? new Date(active.liveStart) : upcomingOpening(now),
    /** When the current (or most recent) Drop opened — the live card's start. */
    startedAt: active ? new Date(active.liveStart) : nextDropMoment(now),
    closesAt:  active ? new Date(active.closedStart) : dropCloseMoment(now),
    simulated: !!simulatedDate,
    liveStats,
  };
}

/** One reading of the schedule, for sections that must switch together. */
export type DropSchedule = ReturnType<typeof useDropSchedule>;
