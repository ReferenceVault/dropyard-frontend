"use client";

import { DropCycleProvider } from "@/context/DropCycleContext";
import { TrustStrip } from "./HomeContent";
import { NextDropSection } from "./NextDropSection";

export function LiveDropContent() {
  return (
    <div className="flex-1 bg-dy-pale font-dy">
      <TrustStrip />
      <DropCycleProvider>
        <NextDropSection upcomingOnly />
      </DropCycleProvider>
    </div>
  );
}
