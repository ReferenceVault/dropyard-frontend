"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getDropCycleInfo,
  formatDropDate,
  formatDropTime,
  type DropCycleInfo,
  type DropPhase,
} from "@/lib/dropCycle";

export interface DropCycleState extends DropCycleInfo {
  /** For demo: override current time to simulate different phases */
  simulatedDate: Date | null;
  setSimulatedDate: (d: Date | null) => void;
  /** Current "now" used for calculations */
  effectiveNow: Date;
  /** Milliseconds until nextEventAt */
  msUntilNextEvent: number;
  /** Formatted countdown string */
  countdownLabel: string;
}

const defaultInfo = getDropCycleInfo(new Date());

const DropCycleContext = createContext<DropCycleState>({
  ...defaultInfo,
  simulatedDate: null,
  setSimulatedDate: () => {},
  effectiveNow: new Date(),
  msUntilNextEvent: 0,
  countdownLabel: "",
});

function getCountdownLabel(ms: number): string {
  if (ms <= 0) return "Now";
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000) % 24;
  const d = Math.floor(ms / 86400000);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

export function DropCycleProvider({ children }: { children: React.ReactNode }) {
  const [simulatedDate, setSimulatedDateState] = useState<Date | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  const setSimulatedDate = useCallback((d: Date | null) => {
    setSimulatedDateState(d);
  }, []);

  // Dev-only: ?simulate=<ISO datetime> pins the clock so a phase can be
  // tested without waiting for it or changing the machine's date. The phase
  // is computed client-side from this value, so it drives the whole UI —
  // the Drop banner, the seller publish options, the countdown.
  //
  //   /buyer?simulate=2026-10-10T13:00    → LIVE  (Sat 08:00–Sun 20:00)
  //   /buyer?simulate=2026-10-09T22:00    → PREVIEW
  //
  // Ignored in production builds so a crafted URL can't shift what a real
  // user sees. Invalid dates are ignored and the real clock is used.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("simulate");
    if (!raw) return;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      console.warn(`[DropCycle] ignoring unparseable ?simulate=${raw}`);
      return;
    }
    console.info(`[DropCycle] simulating ${parsed.toISOString()}`);
    setSimulatedDateState(parsed);
  }, []);

  // Only start the clock on the client to avoid SSR/client mismatch
  useEffect(() => {
    setNow(simulatedDate ?? new Date());
    if (simulatedDate) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [simulatedDate]);

  const effectiveNow = now ?? simulatedDate ?? new Date(0);
  const info = getDropCycleInfo(effectiveNow);
  const msUntilNextEvent = now
    ? Math.max(0, info.nextEventAt.getTime() - effectiveNow.getTime())
    : 0;
  const countdownLabel = now ? getCountdownLabel(msUntilNextEvent) : "";

  return (
    <DropCycleContext.Provider
      value={{
        ...info,
        simulatedDate,
        setSimulatedDate,
        effectiveNow,
        msUntilNextEvent,
        countdownLabel,
      }}
    >
      {children}
    </DropCycleContext.Provider>
  );
}

export function useDropCycle() {
  return useContext(DropCycleContext);
}
