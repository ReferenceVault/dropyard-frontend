"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ItemCard, ItemCardSkeleton, ItemsEmptyState } from "./ItemCard";
import type { HomeItem, LoadState } from "./useHomeData";

export function ShelfSection({ items, state, savedIds, onToggleSaved }: {
  items: HomeItem[];
  state: LoadState;
  savedIds: Set<string>;
  onToggleSaved: (id: string) => void;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    syncArrows();
    const observer = new ResizeObserver(syncArrows);
    observer.observe(el);
    return () => observer.disconnect();
  }, [items, syncArrows]);

  const page = (direction: 1 | -1) => {
    const el = trackRef.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * (card.offsetWidth + 30), behavior: reduced ? "auto" : "smooth" });
  };

  const arrowClass = "dy-focus flex h-[clamp(44px,3.15vw,60px)] w-[clamp(44px,3.15vw,60px)] items-center justify-center rounded-full border-2 border-dy-green-strong text-dy-green-strong transition-colors hover:bg-dy-pale disabled:cursor-default disabled:border-dy-line disabled:text-dy-line disabled:hover:bg-transparent";

  return (
    <section id="the-shelf" aria-labelledby="shelf-heading" className="dy-section scroll-mt-20 overflow-hidden bg-white xl:scroll-mt-[92px]">
      <div className="mx-auto grid max-w-[1920px] gap-8 pl-[clamp(16px,5.2vw,100px)] lg:grid-cols-[minmax(0,24%)_minmax(0,1fr)] lg:gap-[clamp(24px,3vw,58px)]">
        <div className="pr-[clamp(16px,5.2vw,100px)] lg:pr-0">
          <p className="dy-eyebrow">The Shelf</p>
          <h2 id="shelf-heading" className="dy-h2 mt-4">
            Missed the <span className="text-dy-orange lg:block">Drop?</span>
          </h2>
          <p className="mt-5 text-[clamp(16px,1.3vw,25px)] font-medium text-dy-green-strong">The Shelf is always open. Browse items available between Drops.</p>
          <p className="dy-body mt-4">A few things your neighbours are putting up for grabs.</p>
          {items.length > 1 && (
            <div className="mt-[clamp(20px,2vw,40px)] flex gap-[30px]">
              <button type="button" onClick={() => page(-1)} disabled={!canPrev} aria-label="Previous items" className={arrowClass}>
                <ArrowLeft className="h-1/2 w-1/2" aria-hidden />
              </button>
              <button type="button" onClick={() => page(1)} disabled={!canNext} aria-label="More items" className={arrowClass}>
                <ArrowRight className="h-1/2 w-1/2" aria-hidden />
              </button>
            </div>
          )}
          <Link href="/buyer" className="dy-btn dy-btn--primary dy-focus mt-[clamp(20px,2.6vw,50px)]">Browse the Shelf</Link>
        </div>

        <div className="min-w-0">
          {state === "loading" && (
            <div className="grid grid-cols-[repeat(3,minmax(240px,1fr))] gap-[30px]">
              {[0, 1, 2].map((i) => <ItemCardSkeleton key={i} />)}
            </div>
          )}
          {state !== "loading" && items.length === 0 && (
            <div className="pr-[clamp(16px,5.2vw,100px)]">
              <ItemsEmptyState
                failed={state === "error"}
                message="The Shelf is empty right now. Unsold Drop items land here after each weekend."
                action={<Link href="/join?mode=signin&as=seller" className="dy-btn dy-btn--primary dy-focus">Put Something on the Shelf</Link>}
              />
            </div>
          )}
          {items.length > 0 && (
            <ul
              ref={trackRef}
              onScroll={syncArrows}
              tabIndex={0}
              aria-label="Items on the Shelf"
              className="dy-no-scrollbar dy-focus flex snap-x gap-[30px] overflow-x-auto pr-[clamp(16px,2.6vw,50px)]"
            >
              {items.map((item) => (
                <li key={item.id} className="w-[min(78vw,clamp(260px,21.2vw,408px))] shrink-0 snap-start">
                  <ItemCard item={item} ribbon="Available" saved={savedIds.has(item.id)} onToggleSaved={onToggleSaved} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
