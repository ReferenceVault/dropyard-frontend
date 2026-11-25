"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, MapPin, Package, Radio } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { isOwnListing } from "@/lib/ownListing";
import { ItemShareButton } from "@/components/share/ItemShareButton";
import type { HomeItem } from "./useHomeData";

// Type scale per card size. `tight` is the Featured grid, which runs two
// columns even on a 320px phone, so its phone sizes step down; from `sm` up it
// matches the default card exactly.
const SIZES = {
  default: {
    pad:    "p-[clamp(14px,1.3vw,26px)]",
    ribbon: "text-[clamp(14px,1.15vw,22px)]",
    title:  "text-[clamp(20px,1.85vw,36px)]",
    price:  "text-[clamp(24px,2.15vw,42px)]",
    place:  "mt-2 text-[clamp(17px,1.5vw,29px)]",
    small:  "text-[clamp(14px,1.15vw,22px)]",
    avatar: 28,
    live:   "",
    liveText: "",
  },
  tight: {
    pad:    "p-3 sm:p-[clamp(14px,1.3vw,26px)]",
    ribbon: "text-[13px] sm:text-[clamp(14px,1.15vw,22px)]",
    title:  "text-[16px] sm:text-[clamp(20px,1.85vw,36px)]",
    price:  "text-[20px] sm:text-[clamp(24px,2.15vw,42px)]",
    place:  "mt-1.5 text-[14px] sm:mt-2 sm:text-[clamp(17px,1.5vw,29px)]",
    small:  "text-[13px] sm:text-[clamp(14px,1.15vw,22px)]",
    avatar: 24,
    // "LIVE DROP" on a ~138px card (320px phone, two columns): a little less
    // tail and letter-spacing below sm, so it stays on one line. Where it
    // still doesn't fit left of the share and save buttons, it drops below
    // them (measured: see ItemCard).
    live:   "max-sm:pr-[1.55em]",
    liveText: "max-sm:tracking-[0.04em]",
  },
  compact: {
    pad:    "p-2.5",
    ribbon: "text-[12px]",
    title:  "text-[clamp(15px,1.05vw,20px)]",
    price:  "text-[clamp(17px,1.25vw,24px)]",
    place:  "mt-1 text-[clamp(13px,0.9vw,17px)]",
    small:  "text-[clamp(12px,0.8vw,15px)]",
    avatar: 22,
    live:   "",
    liveText: "",
  },
} as const;

// The ribbon's colours. "Live Drop" is "Worth a closer look"'s while the Drop
// is open (everything there is claimable then): the same red and white as the
// live Drop section's "LIVE NOW" pill (5.0:1).
const RIBBON_TONE = {
  New:         "bg-dy-green-strong text-white",
  Available:   "bg-dy-orange text-dy-forest",
  "Live Drop": "bg-dy-red text-white",
} as const;

export function ItemCard({ item, ribbon, saved, onToggleSaved, compact = false, tight = false, action }: {
  item: HomeItem;
  ribbon: keyof typeof RIBBON_TONE;
  saved: boolean;
  onToggleSaved: (id: string) => void;
  /** Smaller type and controls, for a card inside a card. */
  compact?: boolean;
  /** Smaller type on phones only, for the two-column Featured grid. */
  tight?: boolean;
  /** Sits under the details, outside the link to the listing. */
  action?: React.ReactNode;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = item.photo && !photoFailed;
  const s = SIZES[compact ? "compact" : tight ? "tight" : "default"];
  // Your own listing gets no heart: nobody saves their own item (the backend
  // refuses it). Same check as the buyer dashboard (lib/ownListing.ts).
  const { user } = useAuth();
  const isOwn = isOwnListing(item, user?.id);

  // The ribbon sits top-left beside the share and save buttons (top-right)
  // when there's room, and just below them when there isn't (narrow cards:
  // two columns on a phone, four on a small laptop). Measured rather than
  // guessed at breakpoints: the ribbon's text, the buttons and the card all
  // scale differently. A ResizeObserver reports before paint, so it never
  // shows in the wrong place.
  const ribbonRef = useRef<HTMLSpanElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const [ribbonTop, setRibbonTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const rib = ribbonRef.current, row = buttonsRef.current;
    const card = row?.parentElement;
    if (!rib || !row || !card) return;
    const observer = new ResizeObserver(() => {
      const r = rib.getBoundingClientRect(), b = row.getBoundingClientRect(), c = card.getBoundingClientRect();
      const fits = r.right + 8 <= b.left;
      setRibbonTop(fits ? null : Math.round(b.bottom - c.top + 8));
    });
    observer.observe(card);
    observer.observe(row);
    // The ribbon too: its width changes when the web font arrives, which
    // resizes neither the card nor the buttons.
    observer.observe(rib);
    return () => observer.disconnect();
  }, [isOwn]);

  return (
    // A card surface (white, hairline border, soft shadow) so the details sit
    // on something instead of floating under the photo. Not overflow-hidden:
    // the link's focus ring draws outside the card and must not be clipped.
    //
    // Only as tall as its content: no h-full or flex-grow, so a card is never
    // stretched to the tallest one in its row or scroller. Cards still line
    // up because they all have the same natural height: the title always
    // reserves two lines (below) and every other line is a single line.
    <article className="dy-item relative flex flex-col rounded-2xl border border-dy-line bg-white shadow-(--shadow-card)">
      <Link href={`/item/${encodeURIComponent(item.id)}`} className="dy-focus group block rounded-2xl">
        {/* 15px = the card's 16px corner inside its 1px border. */}
        <div className="relative aspect-square overflow-hidden rounded-t-[15px] bg-dy-pale">
          {showPhoto ? (
            // Plain <img>: remote S3 URLs, same reasoning as app/item/[id].
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.photo!}
              alt={item.title}
              loading="lazy"
              onError={() => setPhotoFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-dy-green" role="img" aria-label="No photo yet">
              <Package size={56} strokeWidth={1.25} aria-hidden />
            </div>
          )}
          <span ref={ribbonRef} style={ribbonTop !== null ? { top: ribbonTop } : undefined} className={`dy-ribbon absolute left-0 top-[6%] whitespace-nowrap py-[0.45em] pl-[1em] pr-[2em] font-medium ${s.ribbon} ${RIBBON_TONE[ribbon]} ${ribbon === "Live Drop" ? s.live : ""}`}>
            {ribbon === "Live Drop" ? (
              // Styled like the "LIVE NOW" pill: broadcast icon, bold capitals.
              // align-top: on the baseline, the icon row made this ribbon a
              // few pixels taller than "Available".
              <span className={`inline-flex items-center gap-[0.4em] align-top font-bold uppercase tracking-[0.08em] ${s.liveText}`}>
                <Radio className="h-[1.1em] w-[1.1em] shrink-0" strokeWidth={2.25} aria-hidden />
                {ribbon}
              </span>
            ) : ribbon}
          </span>
        </div>
        {/* Same padding on all four sides (s.pad), so the bottom matches the sides. */}
        <div className={s.pad}>
          {/* Two lines reserved (leading-tight = 1.25, so 2.5em), the same as
              the clamp: a one-line title leaves its second line empty here
              rather than at the bottom of the card, and seller rows line up. */}
          <h3 className={`line-clamp-2 min-h-[2.5em] font-semibold leading-tight tracking-[-0.01em] text-dy-forest group-hover:text-dy-green-strong ${s.title}`}>
            {item.title}
          </h3>
          <p className={`mt-[0.35em] font-bold tracking-[-0.02em] ${item.price === 0 ? "text-dy-red" : "text-dy-green-strong"} ${s.price}`}>
            {item.price === 0 ? "Free" : `$${item.price}`}
          </p>
          <p className={`flex items-center gap-2 text-dy-forest ${s.place}`}>
            <MapPin className="h-[1em] w-[1em] shrink-0 text-dy-green" aria-hidden />
            <span className="truncate">{item.neighbourhood}</span>
          </p>
          {/* No pickup days or hours on cards: they're on the item page. */}
          {/* Who's selling: their chosen profile picture and "First L." — the
              public homepage never shows a full surname. Directly under the
              content, not pushed to the bottom. */}
          <p className={`mt-[0.6em] flex min-w-0 items-center gap-2 border-t border-dy-line pt-[0.6em] text-dy-forest ${s.small}`}>
            <UserAvatar avatar={item.sellerAvatar} name={item.sellerName} size={s.avatar} decorative />
            <span className="truncate font-medium">{item.sellerName}</span>
          </p>
        </div>
      </Link>
      {action && <div className="px-2.5 pb-2.5">{action}</div>}
      {/* Share and save, top-right over the photo. Outside the link: a button
          can't nest in an anchor, and clicking either must share or save
          rather than open the item. Share is on every card (signed out too,
          and on your own listing: sellers share their own things); the heart
          isn't on your own listing. */}
      <div ref={buttonsRef} className={`absolute flex gap-2 ${compact ? "right-1.5 top-1.5" : "right-[5%] top-[clamp(10px,1vw,20px)]"}`}>
        <ItemShareButton item={item} className={compact ? "h-11 w-11" : "h-[clamp(44px,3.65vw,70px)] w-[clamp(44px,3.65vw,70px)]"} />
        {!isOwn && (
          <button
            type="button"
            onClick={() => onToggleSaved(item.id)}
            aria-label={saved ? `Remove ${item.title} from saved items` : `Save ${item.title}`}
            aria-pressed={saved}
            className={`dy-focus flex items-center justify-center rounded-full bg-white text-dy-line shadow-[0_4px_12px_-4px_rgba(15,54,11,0.25)] transition-colors hover:text-dy-green ${compact ? "h-11 w-11" : "h-[clamp(44px,3.65vw,70px)] w-[clamp(44px,3.65vw,70px)]"}`}
          >
            <Heart className={`h-1/2 w-1/2 ${saved ? "text-dy-green" : ""}`} fill={saved ? "currentColor" : "none"} strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </div>
    </article>
  );
}

export function ItemCardSkeleton() {
  return (
    <div aria-hidden className="rounded-2xl border border-dy-line bg-white motion-safe:animate-pulse">
      <div className="aspect-square rounded-t-[15px] bg-dy-pale" />
      <div className="p-[clamp(12px,1.3vw,26px)]">
        <div className="h-6 w-2/3 rounded bg-dy-pale" />
        <div className="mt-3 h-7 w-1/3 rounded bg-dy-pale" />
        <div className="mt-3 h-5 w-1/2 rounded bg-dy-pale" />
      </div>
    </div>
  );
}

/** Shown instead of invented listings when there's nothing to feature. */
export function ItemsEmptyState({ failed, message, action }: { failed: boolean; message: string; action: React.ReactNode }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-5 rounded-2xl border border-dy-line bg-dy-pale p-8 text-center">
      <Package size={40} strokeWidth={1.25} className="text-dy-green" aria-hidden />
      <p role={failed ? "alert" : undefined} className="dy-body max-w-xl">
        {failed ? "We couldn't load listings just now. Refresh the page to try again." : message}
      </p>
      {!failed && action}
    </div>
  );
}
