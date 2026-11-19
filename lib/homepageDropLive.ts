"use client";

import { useSyncExternalStore } from "react";

// Is the Drop live, as the homepage reads it? HomeContent's ScheduledSections
// is the one place that reads the Drop's schedule on "/" (the server's Drop
// record, or ?simulate=), and it publishes the answer here so the header,
// which sits outside that page, switches in the same moment as the sections.
// null while no homepage is mounted or its reading isn't known yet.
let live: boolean | null = null;
const listeners = new Set<() => void>();

export function setHomepageDropLive(next: boolean | null): void {
  if (next === live) return;
  live = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useHomepageDropLive(): boolean | null {
  return useSyncExternalStore(subscribe, () => live, () => null);
}
