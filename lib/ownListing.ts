// Is this listing the signed-in user's own? One check for every card and view
// that offers Save, so none of them disagree: your own items get no heart
// (the backend refuses to save them too: POST /api/watchlist answers 400).
//
// Items come in two shapes: cards carry `sellerId`, detail views carry
// `seller.id`. Either is enough. Signed out, nothing is yours.

export interface ListingOwnerFields {
  sellerId?: string | null;
  seller?: { id?: string | null } | string | null;
}

export function isOwnListing(item: ListingOwnerFields | null | undefined, userId: string | null | undefined): boolean {
  if (!item || !userId) return false;
  if (item.sellerId) return item.sellerId === userId;
  const seller = item.seller;
  return !!seller && typeof seller === "object" && seller.id === userId;
}
