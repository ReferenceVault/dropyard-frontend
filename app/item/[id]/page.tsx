import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ItemGallery from "@/components/item/ItemGallery";
import { UserAvatar } from "@/components/UserAvatar";
import { shortName, type ResolvedAvatar } from "@/lib/avatar";
import { categoryLabel } from "@/lib/categories";

/**
 * BUG-085 — public per-item page.
 *
 * Share buttons have always produced `/?ref=share&item=<id>`, which is just the
 * marketing homepage — the recipient never saw the item. This is the real
 * destination those links now point at.
 *
 * Deliberately a SERVER component:
 *   - `generateMetadata` emits Open Graph tags, which is what WhatsApp,
 *     iMessage, Slack etc. scrape to build a link preview. A client component
 *     could render the page but the shared link would still unfurl as a bare
 *     URL, which is half the point of sharing.
 *   - The page must work for signed-out recipients. `GET /api/items/:id` is
 *     `optionalAuth`, so no session is required.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dropyard.app";

const CONDITION_LABEL: Record<string, string> = {
  EXCELLENT: "New",
  LIKE_NEW: "Used - Like New",
  GOOD: "Used - Good",
  FAIR: "Used - Fair",
};

interface PublicItem {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  price: number;
  originalPrice: number | null;
  photos: string[];
  status: string;
  placement: string;
  seller?: { id: string; name: string; neighborhood: string | null; zone: string | null; avatar?: ResolvedAvatar | null } | null;
}

async function fetchItem(id: string): Promise<PublicItem | null> {
  try {
    // no-store: price and availability change constantly, and a shared link is
    // most often opened minutes after the item moved.
    const res = await fetch(`${API_BASE}/api/items/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.item as PublicItem) ?? null;
  } catch {
    // Backend unreachable — treated the same as "not found" so the visitor
    // gets the friendly 404 rather than a framework error page.
    return null;
  }
}

function priceLabel(price: number): string {
  return price === 0 ? "Free" : `$${price}`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = await fetchItem(id);
  if (!item) {
    return { title: "Item not found · DropYard" };
  }

  const title = `${item.title} · ${priceLabel(item.price)} on DropYard`;
  const where = item.seller?.neighborhood ? ` in ${item.seller.neighborhood}` : "";
  const description =
    item.status === "SOLD"
      ? `This item has been picked up. See what else is available${where} on DropYard.`
      : `${CONDITION_LABEL[item.condition] || "Used"}${where}. ${item.description || ""}`.trim().slice(0, 200);

  const url = `${SITE_URL}/item/${item.id}`;
  // S3 photo URLs are already absolute, which is what OG scrapers require.
  const image = item.photos?.[0];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: "DropYard",
      ...(image ? { images: [{ url: image, alt: item.title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function PublicItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await fetchItem(id);
  if (!item) notFound();

  const isSold = item.status === "SOLD";
  const isTaken = isSold || item.status === "CLAIMED" || item.status === "RESERVED";
  const photos = Array.isArray(item.photos) ? item.photos.filter(Boolean) : [];
  // Public page (and the target of shared links): "First L.", never a full
  // surname, beside the seller's chosen profile picture.
  const sellerName = shortName(item.seller?.name);
  const hood = item.seller?.neighborhood || item.seller?.zone;

  return (
    // Extra bottom padding: room between the Claim button / seller box and the
    // footer's top border.
    <main className="mx-auto w-full max-w-5xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12">
      {/* Back to the homepage, as a pale-green pill: reads as a control rather
          than a caption, but stays quieter than the filled Claim button.
          h-11 keeps the whole pill a 44px tap target. */}
      <Link
        href="/"
        className="dy-focus group mb-6 inline-flex h-11 items-center gap-2 rounded-full bg-dy-pale px-4 text-[14px] font-semibold text-dy-mid ring-1 ring-dy-line transition-colors hover:bg-emerald-100 hover:text-dy-forest sm:text-[15px]"
      >
        <ArrowLeft size={16} strokeWidth={2.25} aria-hidden className="transition-transform group-hover:-translate-x-0.5" />
        DropYard
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Photos — every uploaded photo, with arrows, thumbnails, swipe and a
            full-screen zoomable viewer. A client island: the rest of the page
            (and its Open Graph tags for shared links) stays server-rendered. */}
        <ItemGallery photos={photos} title={item.title} badge={isTaken ? (isSold ? "Sold" : "Claimed") : null} />

        {/* Details */}
        <div>
          {item.placement === "SHELF" && !isTaken && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
              On the Shelf
            </span>
          )}

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{item.title}</h1>

          <div className="mt-2 flex items-baseline gap-3">
            {/* Free reads in red, not the usual green: a giveaway is its own
                thing, not the cheapest price on the page. */}
            <p className={`text-3xl font-bold ${item.price === 0 ? "text-red-600" : "text-emerald-700"}`}>{priceLabel(item.price)}</p>
            {typeof item.originalPrice === "number" && item.originalPrice > item.price && (
              <p className="text-lg font-medium text-slate-400 line-through">${item.originalPrice}</p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-600">
              {categoryLabel(item.category)}
            </span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-600">
              {CONDITION_LABEL[item.condition] || "Used"}
            </span>
          </div>

          {item.description && (
            <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-slate-600">{item.description}</p>
          )}

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Seller</p>
            <div className="mt-2 flex items-center gap-3">
              <UserAvatar avatar={item.seller?.avatar} name={sellerName} size={44} decorative />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-slate-900">{sellerName}</p>
                {hood && <p className="text-[13px] text-slate-500">{hood}</p>}
              </div>
            </div>
          </div>

          {/* CTA — /buyer gates signed-out visitors to /join, and carries the
              item id so they land on this exact listing after signing in. */}
          <div className="mt-6">
            {isSold ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[14px] font-semibold text-slate-700">This item has already been picked up.</p>
                <Link href="/buyer" className="mt-1 inline-block text-[13px] font-semibold text-emerald-700 hover:underline">
                  Browse what&apos;s available now →
                </Link>
              </div>
            ) : (
              <Link
                href={`/buyer?item=${encodeURIComponent(item.id)}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-6 py-3.5 text-[15px] font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-800 sm:w-auto"
              >
                {isTaken ? "View on DropYard" : `Claim for ${priceLabel(item.price)}`} →
              </Link>
            )}
            <p className="mt-3 text-[12px] text-slate-500">
              Free to join. Pick up locally from a neighbour — no shipping, no fees.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
