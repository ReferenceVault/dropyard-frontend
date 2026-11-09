"use client";

import { DropCycleProvider } from "@/context/DropCycleContext";
import { TrustStrip } from "./HomeContent";
import { NextDropSection } from "./NextDropSection";
import { useNeighbourCount } from "./useHomeData";

export function LiveDropContent() {
  // The countdown card's sign-up line, from the same source as the homepage.
  const neighbourCount = useNeighbourCount();
  return (
    <div className="flex-1 bg-dy-pale font-dy">
      <TrustStrip />
      <DropCycleProvider>
        <NextDropSection upcomingOnly neighbourCount={neighbourCount} />
      </DropCycleProvider>
    </div>
  );
}
