"use client";

import Link from "next/link";
import { SELL_HREF } from "@/components/GlobalHeader";
import { ItemCard, ItemCardSkeleton, ItemsEmptyState } from "./ItemCard";
import type { HomeItem, LoadState } from "./useHomeData";

export interface LiveDropData {
  items: HomeItem[];
  state: LoadState;
  /** The phase the API reported when `items` was loaded. */
  feedPhase: string | null;
  savedIds: Set<string>;
  claimedIds: Set<string>;
  userId: string | null;
  onToggleSaved: (id: string) => void;
}

function ClaimAction({ item, claimed, isOwn }: { item: HomeItem; claimed: boolean; isOwn: boolean }) {
  if (isOwn || claimed) {
    return (
      <p className="flex min-h-11 items-center justify-center rounded bg-dy-pale px-2 text-center text-[14px] font-semibold text-dy-forest">
        {isOwn ? "Your listing" : "Claim pending"}
      </p>
    );
  }
  // Claiming needs a pickup time, which the buyer dashboard collects. /buyer
  // also sends signed-out visitors to sign in and brings them back to this item.
  return (
    <Link
      href={`/buyer?item=${encodeURIComponent(item.id)}`}
      aria-label={`Claim ${item.title}`}
      className="dy-btn dy-btn--primary dy-focus !min-h-11 w-full !px-2 !text-[14px]"
    >
      Claim
    </Link>
  );
}

export function LiveDropPanel({ items, state, savedIds, claimedIds, userId, onToggleSaved }: LiveDropData) {
  if (state !== "loading" && items.length === 0) {
    return (
      <ItemsEmptyState
        failed={state === "error"}
        message="Nothing's live in this Drop yet. Be the first to list something."
        action={<Link href={userId ? "/buyer?mode=seller" : SELL_HREF} className="dy-btn dy-btn--primary dy-focus">Sell Something</Link>}
      />
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5">
      {state === "loading"
        ? [0, 1, 2, 3].map((i) => <li key={i}><ItemCardSkeleton /></li>)
        : items.map((item) => (
            <li key={item.id} className="min-w-0">
              <ItemCard
                compact
                item={item}
                ribbon="Available"
                saved={savedIds.has(item.id)}
                onToggleSaved={onToggleSaved}
                action={<ClaimAction item={item} claimed={claimedIds.has(item.id)} isOwn={!!userId && item.sellerId === userId} />}
              />
            </li>
          ))}
    </ul>
  );
}
