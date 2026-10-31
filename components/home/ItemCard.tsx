"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MapPin, Package } from "lucide-react";
import type { HomeItem } from "./useHomeData";

export function ItemCard({ item, ribbon, saved, onToggleSaved, compact = false, action }: {
  item: HomeItem;
  ribbon: "New" | "Available";
  saved: boolean;
  onToggleSaved: (id: string) => void;
  /** Smaller type and controls, for a card inside a card. */
  compact?: boolean;
  /** Sits under the details, outside the link to the listing. */
  action?: React.ReactNode;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = item.photo && !photoFailed;

  return (
    <article className="relative">
      <Link href={`/item/${encodeURIComponent(item.id)}`} className="dy-focus group block rounded-2xl">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-dy-pale">
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
          <span className={`dy-ribbon absolute left-0 top-[6%] py-[0.45em] pl-[1em] pr-[2em] font-medium ${compact ? "text-[12px]" : "text-[clamp(14px,1.15vw,22px)]"} ${ribbon === "New" ? "bg-dy-green-strong text-white" : "bg-dy-orange text-dy-forest"}`}>
            {ribbon}
          </span>
        </div>
        <div className={compact ? "px-1 pt-3" : "px-[clamp(4px,1vw,20px)] pt-[clamp(14px,1.5vw,28px)]"}>
          <h3 className={`line-clamp-2 font-semibold leading-tight tracking-[-0.01em] text-dy-forest group-hover:text-dy-green-strong ${compact ? "text-[clamp(15px,1.05vw,20px)]" : "text-[clamp(20px,1.85vw,36px)]"}`}>
            {item.title}
          </h3>
          <p className={`mt-[0.35em] font-bold tracking-[-0.02em] text-dy-green-strong ${compact ? "text-[clamp(17px,1.25vw,24px)]" : "text-[clamp(24px,2.15vw,42px)]"}`}>
            {item.price === 0 ? "Free" : `$${item.price}`}
          </p>
          <p className={`flex items-center gap-2 text-dy-forest ${compact ? "mt-1 text-[clamp(13px,0.9vw,17px)]" : "mt-2 text-[clamp(17px,1.5vw,29px)]"}`}>
            <MapPin className="h-[1em] w-[1em] shrink-0 text-dy-green" aria-hidden />
            <span className="truncate">{item.neighbourhood}</span>
          </p>
          <p className={`mt-1 text-dy-muted ${compact ? "text-[clamp(12px,0.8vw,15px)]" : "text-[clamp(14px,1.15vw,22px)]"}`}>{item.pickup}</p>
        </div>
      </Link>
      {action && <div className="mt-2 px-1">{action}</div>}
      {/* Outside the link: a button can't nest in an anchor, and clicking it
          must save rather than navigate. */}
      <button
        type="button"
        onClick={() => onToggleSaved(item.id)}
        aria-label={saved ? `Remove ${item.title} from saved items` : `Save ${item.title}`}
        aria-pressed={saved}
        className={`dy-focus absolute flex items-center justify-center rounded-full bg-white text-dy-line transition-colors hover:text-dy-green ${compact ? "right-1.5 top-1.5 h-11 w-11" : "right-[5%] top-[clamp(10px,1vw,20px)] h-[clamp(44px,3.65vw,70px)] w-[clamp(44px,3.65vw,70px)]"}`}
      >
        <Heart className={`h-1/2 w-1/2 ${saved ? "text-dy-green" : ""}`} fill={saved ? "currentColor" : "none"} strokeWidth={1.75} aria-hidden />
      </button>
    </article>
  );
}

export function ItemCardSkeleton() {
  return (
    <div aria-hidden className="motion-safe:animate-pulse">
      <div className="aspect-square rounded-2xl bg-dy-pale" />
      <div className="mt-4 h-6 w-2/3 rounded bg-dy-pale" />
      <div className="mt-3 h-7 w-1/3 rounded bg-dy-pale" />
      <div className="mt-3 h-5 w-1/2 rounded bg-dy-pale" />
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
