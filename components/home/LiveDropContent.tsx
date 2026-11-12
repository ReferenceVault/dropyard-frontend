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
        {/* Switches to the live card during the Drop, like the homepage. */}
        <NextDropSection asPageHeading neighbourCount={neighbourCount} />
      </DropCycleProvider>
    </div>
  );
}
