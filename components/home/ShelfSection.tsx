"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ItemCard, ItemCardSkeleton, ItemsEmptyState } from "./ItemCard";
import { LivePill } from "./NextDropSection";
import type { HomeItem, LoadState } from "./useHomeData";

/**
 * The homepage's Shelf. During the live Drop, Shelf items are claimable
 * together with the Drop's, so the section says so: a "LIVE DROP · NOW OPEN"
 * pill, "The Shelf has joined the Drop!", red "LIVE DROP" ribbons and a
 * "Shop the Live Drop" button. Otherwise (Submission, Preview, Closed) it's
 * the "Missed a Live Drop?" version. `live` comes from the same schedule
 * reading as the live Drop section above (HomeContent), so both switch at the
 * same moment, without a reload; null while that reading isn't known yet.
 */
export const ShelfSection = memo(function ShelfSection({ items, state, savedIds, onToggleSaved, live = null, liveEndsDay = "", liveEndsTime = "" }: {
  items: HomeItem[];
  state: LoadState;
  savedIds: Set<string>;
  onToggleSaved: (id: string) => void;
  /** Is the Drop open right now? null until the schedule is known. */
  live?: boolean | null;
  /** When it closes, from the Drop record in Toronto time: "Sunday", "7:00 PM". */
  liveEndsDay?: string;
  liveEndsTime?: string;
}) {
  const isLive = live === true;

  // Said once when the section switches (not on page load, when nothing
  // changed for the reader): adjusted during render, React's pattern for
  // state that follows a prop.
  const [seenLive, setSeenLive] = useState(live);
  const [announcement, setAnnouncement] = useState("");
  if (live !== seenLive) {
    setSeenLive(live);
    if (seenLive !== null && live !== null) {
      setAnnouncement(live
        ? "The Live Drop is open, and The Shelf has joined it."
        : "The Live Drop has closed. The Shelf is open between Drops.");
    }
  }

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
    const gap = parseFloat(getComputedStyle(el).columnGap) || 30; // the gap is responsive
    el.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: reduced ? "auto" : "smooth" });
  };

  // Scroll-edge fade: a soft mask on whichever side has more cards beyond it,
  // so it's obvious the row continues. A mask (not an overlay) works over any
  // background and never covers a clickable card.
  const edgeFade = canPrev && canNext
    ? "linear-gradient(to right, transparent 0, #000 7%, #000 82%, transparent 100%)"
    : canNext
      ? "linear-gradient(to right, #000 0, #000 80%, transparent 100%)"
      : canPrev
        ? "linear-gradient(to right, transparent 0, #000 9%, #000 100%)"
        : undefined;

  const arrowClass = "dy-focus flex h-[clamp(44px,3.15vw,60px)] w-[clamp(44px,3.15vw,60px)] items-center justify-center rounded-full border-2 border-dy-green-strong text-dy-green-strong transition-colors hover:bg-dy-pale disabled:cursor-default disabled:border-dy-line disabled:text-dy-line disabled:hover:bg-transparent";

  return (
    <section id="the-shelf" aria-labelledby="shelf-heading" className="dy-section scroll-mt-20 overflow-hidden bg-white xl:scroll-mt-[92px]">
      <div className="mx-auto grid max-w-[1920px] gap-8 pl-[clamp(16px,5.2vw,100px)] lg:grid-cols-[minmax(0,24%)_minmax(0,1fr)] lg:gap-[clamp(24px,3vw,58px)]">
        <div className="pr-[clamp(16px,5.2vw,100px)] lg:pr-0">
          <p className="sr-only" aria-live="polite">{announcement}</p>
          {isLive ? (
            <>
              <LivePill label="Live Drop · Now open" />
              {/* "the Drop!" never splits, so "Drop!" can't sit alone on a line. */}
              <h2 id="shelf-heading" className="dy-h2 mt-4">
                The Shelf has joined <span className="whitespace-nowrap">the <span className="text-dy-accent">Drop!</span></span>
              </h2>
              <p className="dy-body mt-4">
                Great finds from The Shelf are now part of the Live Drop! Browse and claim your favourites before{" "}
                <span className="whitespace-nowrap">{liveEndsDay} at {liveEndsTime}.</span>
              </p>
            </>
          ) : (
            <>
              <p className="dy-eyebrow">The Shelf</p>
              {/* "Live Drop?" never splits, so the heading can't strand "Live" on a
                  line of its own; on wide screens it takes the second line. */}
              <h2 id="shelf-heading" className="dy-h2 mt-4">
                Missed a <span className="whitespace-nowrap lg:block">Live <span className="text-dy-accent">Drop?</span></span>
              </h2>
              {/* Same orange subheading style as the live Drop section's. */}
              <p className="mt-4 text-[clamp(17px,1.4vw,27px)] font-semibold text-dy-orange-strong">Great finds are still available on The Shelf.</p>
              <p className="dy-body mt-3">Browse and claim items from your neighbours anytime between live drops.</p>
            </>
          )}
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
          {/* Both go to /buyer (Discover); signed-out visitors go through
              /join and back, as from the live Drop section's button. */}
          {isLive ? (
            <Link href="/buyer" className="dy-btn dy-btn--primary dy-focus mt-[clamp(20px,2.6vw,50px)] inline-flex items-center gap-2">
              Shop the Live Drop <ArrowRight className="h-[1.1em] w-[1.1em]" aria-hidden />
            </Link>
          ) : (
            <Link href="/buyer" className="dy-btn dy-btn--primary dy-focus mt-[clamp(20px,2.6vw,50px)]">Browse the Shelf</Link>
          )}
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
              style={edgeFade ? { maskImage: edgeFade, WebkitMaskImage: edgeFade } : undefined}
              // pb-6: room for the cards' shadow, which the scroller would clip.
              className="dy-no-scrollbar dy-focus -mt-2 flex snap-x gap-[clamp(16px,1.6vw,30px)] overflow-x-auto pb-6 pr-[clamp(16px,2.6vw,50px)] pt-2"
            >
              {items.map((item) => (
                <li key={item.id} className="w-[min(78vw,clamp(260px,21.2vw,408px))] shrink-0 snap-start">
                  <ItemCard item={item} ribbon={isLive ? "Live Drop" : "Available"} saved={savedIds.has(item.id)} onToggleSaved={onToggleSaved} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
});
