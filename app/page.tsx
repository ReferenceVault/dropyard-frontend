import { Suspense } from "react";
import { HomeContent } from "@/components/home/HomeContent";

// BUG-075 — useSearchParams() needs a Suspense boundary or `next build` bails.
export default function DropYardWebsite() {
  return (
    <Suspense fallback={<div className="min-h-full bg-white" />}>
      <HomeContent />
    </Suspense>
  );
}
