"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useDropCycle } from "@/context/DropCycleContext";
import { dropCloseMoment, getDropCycleInfo, nextDropMoment } from "@/lib/dropCycle";

export type DropStatus = "UPCOMING" | "LIVE" | "ENDED";

interface CurrentDrop {
  drop: { liveStart: string; closedStart: string; endsAt: string };
  now: string;
}

interface Schedule {
  liveStart: number;
  closedStart: number;
  endsAt: number;
  /** Server clock minus this device's, so a wrong device clock can't open the Drop. */
  skewMs: number;
}

const FETCH_TIMEOUT_MS = 5000;

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

  const load = useCallback(() => {
    apiRequest<CurrentDrop>("/api/drop/current", { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      .then(({ drop, now }) => setSchedule({
        liveStart:   new Date(drop.liveStart).getTime(),
        closedStart: new Date(drop.closedStart).getTime(),
        endsAt:      new Date(drop.endsAt).getTime(),
        skewMs:      new Date(now).getTime() - Date.now(),
      }))
      .catch(() => { /* the local schedule stands in */ })
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

  return {
    // The provider's clock starts at the epoch until it mounts on the client.
    // Nothing is decided until the backend has answered, so a Saturday page
    // can't show one state and then swap to the other.
    ready:     effectiveNow.getTime() > 0 && (settled || !!simulatedDate),
    status,
    now,
    opensAt:   active && nowMs < active.liveStart ? new Date(active.liveStart) : upcomingOpening(now),
    closesAt:  active ? new Date(active.closedStart) : dropCloseMoment(now),
    simulated: !!simulatedDate,
  };
}
