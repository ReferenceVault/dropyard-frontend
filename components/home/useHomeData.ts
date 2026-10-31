"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatPickupDateList } from "@/lib/pickupDates";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ApiItem {
  id: string;
  title: string;
  price: number;
  photos?: string[];
  status: string;
  placement: string;
  queuedAt?: string | null;
  pickupMode?: string;
  pickupDays?: string[];
  pickupCustomDates?: string[];
  seller?: { id?: string; neighborhood?: string | null } | null;
  _count?: { watchlist?: number };
}

export interface HomeItem {
  id: string;
  title: string;
  price: number;
  photo: string | null;
  neighbourhood: string;
  pickup: string;
}

export interface DropStats {
  items: number;
  saves: number;
  sellers: number;
}

export type LoadState = "loading" | "ready" | "error";

const NO_SAVED_ITEMS = new Set<string>();

const DAY_NAMES: Record<string, string> = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};

function pickupLabel(api: ApiItem): string {
  if (api.pickupMode === "anytime") return "Pickup anytime";
  const dates = api.pickupCustomDates ?? [];
  if (api.pickupMode === "custom" && dates.length > 0) return `Pickup ${formatPickupDateList(dates)}`;
  const days = api.pickupDays ?? [];
  if (days.length === 1) return `Pickup on ${DAY_NAMES[days[0]] ?? days[0]}`;
  if (days.length > 1) return `Pickup ${days.join(", ")}`;
  return "Pickup by request";
}

function toHomeItem(api: ApiItem): HomeItem {
  return {
    id:            api.id,
    title:         api.title || "Item",
    price:         Number(api.price) || 0,
    photo:         api.photos?.find(Boolean) ?? null,
    neighbourhood: api.seller?.neighborhood || "Nearby",
    pickup:        pickupLabel(api),
  };
}

/** Real subscriber count, only once the backend says it's worth showing. */
export function useNeighbourCount() {
  const [neighbourCount, setNeighbourCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE_URL}/api/email-subscriptions/count`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j?.showProof && typeof j.total === "number") setNeighbourCount(j.total);
      })
      .catch(() => { /* the line just stays hidden */ });
    return () => { cancelled = true; };
  }, []);
  return neighbourCount;
}

export function useHomeData() {
  const router = useRouter();
  const { user } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [featured, setFeatured] = useState<HomeItem[]>([]);
  const [shelf, setShelf] = useState<HomeItem[]>([]);
  const [dropStats, setDropStats] = useState<DropStats | null>(null);
  const neighbourCount = useNeighbourCount();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // One page of the feed feeds all three surfaces, split by placement. The
  // feed is empty of Drop items until PREVIEW, so sneak-peek fills "this
  // week's finds" Monday to Wednesday.
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      apiRequest<{ items?: ApiItem[] }>("/api/items?limit=100"),
      apiRequest<{ items?: ApiItem[] }>("/api/items/sneak-peek"),
    ]).then(([feedResult, peekResult]) => {
      if (cancelled) return;
      if (feedResult.status === "rejected") { setState("error"); return; }
      const feed = feedResult.value.items ?? [];
      const peek = peekResult.status === "fulfilled" ? peekResult.value.items ?? [] : [];

      // During PREVIEW the feed's Drop branch doesn't exclude private drafts,
      // so only items the seller committed to the Drop are shown here (BUG-093).
      const dropItems = feed.filter((i) => i.placement === "DROP" && (i.status !== "DRAFT" || i.queuedAt));
      const seen = new Set(dropItems.map((i) => i.id));
      const upcoming = [...dropItems, ...peek.filter((i) => !seen.has(i.id))];

      setFeatured(upcoming.slice(0, 4).map(toHomeItem));
      setShelf(feed.filter((i) => i.placement === "SHELF").slice(0, 12).map(toHomeItem));
      setDropStats({
        items:   dropItems.length,
        saves:   dropItems.reduce((sum, i) => sum + (i._count?.watchlist ?? 0), 0),
        sellers: new Set(dropItems.map((i) => i.seller?.id).filter(Boolean)).size,
      });
      setState("ready");
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    apiRequest<{ items?: Array<{ id: string }> }>("/api/watchlist")
      .then((data) => { if (!cancelled) setSavedIds(new Set((data.items ?? []).map((i) => i.id))); })
      .catch(() => { /* hearts stay empty; saving still works */ });
    return () => { cancelled = true; };
  }, [user]);

  // BUG-076 — real watchlist with optimistic UI; signed-out visitors go to
  // sign in instead.
  const toggleSaved = useCallback(async (id: string) => {
    if (!user) { router.push("/join?mode=signin"); return; }
    const flip = (set: Set<string>) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    };
    const wasSaved = savedIds.has(id);
    setSavedIds(flip);
    try {
      await apiRequest(`/api/watchlist/${encodeURIComponent(id)}`, { method: wasSaved ? "DELETE" : "POST" });
    } catch {
      setSavedIds(flip);
    }
  }, [user, router, savedIds]);

  return { state, featured, shelf, dropStats, neighbourCount, savedIds: user ? savedIds : NO_SAVED_ITEMS, toggleSaved };
}
