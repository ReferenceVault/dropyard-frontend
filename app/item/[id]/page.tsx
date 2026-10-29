import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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

const CATEGORY_LABEL: Record<string, string> = {
  FURNITURE: "Furniture",
  ELECTRONICS: "Electronics",
  SPORTS: "Sports & Outdoor",
  HOME: "Home",
  CLOTHING: "Clothing & Accessories",
  BOOKS: "Books, Games & Hobbies",
  OTHER: "Other",
};
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
  seller?: { id: string; name: string; neighborhood: string | null; zone: string | null } | null;
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
  const hero = photos[0];
  const sellerName = item.seller?.name || "A neighbour";
  const hood = item.seller?.neighborhood || item.seller?.zone;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-[13px] font-semibold text-slate-500 transition hover:text-slate-800"
      >
        ← DropYard
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Photos */}
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {hero ? (
              // Plain <img>: these are remote S3 URLs and next/image would need
              // every bucket registered in next.config remotePatterns.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero} alt={item.title} className="h-full max-h-[420px] w-full object-cover" />
            ) : (
              <div className="flex h-64 items-center justify-center text-5xl">📦</div>
            )}
            {isTaken && (
              <span className="absolute left-4 top-4 rounded-full bg-slate-900/85 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
                {isSold ? "Sold" : "Claimed"}
              </span>
            )}
          </div>
          {photos.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {photos.slice(1, 5).map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p} src={p} alt="" className="h-20 w-full rounded-lg border border-slate-200 object-cover" />
              ))}
            </div>
          )}
        </div>

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
              {CATEGORY_LABEL[item.category] || "Other"}
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
            <p className="mt-1 text-[15px] font-semibold text-slate-900">{sellerName}</p>
            {hood && <p className="text-[13px] text-slate-500">{hood}</p>}
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
