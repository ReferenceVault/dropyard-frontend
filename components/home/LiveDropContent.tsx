"use client";

import { DropCycleProvider } from "@/context/DropCycleContext";
import { TrustStrip } from "./HomeContent";
import { NextDropSection } from "./NextDropSection";
import { useNeighbourCount } from "./useHomeData";

export function LiveDropContent() {
  const neighbourCount = useNeighbourCount();
  return (
    <div className="flex-1 bg-dy-pale font-dy">
      <TrustStrip />
      <DropCycleProvider>
        <NextDropSection stats={null} neighbourCount={neighbourCount} upcomingOnly />
      </DropCycleProvider>
    </div>
  );
}
