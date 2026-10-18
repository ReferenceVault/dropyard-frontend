"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DropYardSellerDashboard from "@/components/previews/DropYard_SellerDashboard";
import DropYardBuyerDashboard from "@/components/previews/DropYard_BuyerDashboard";
import { EmailVerifyBanner } from "@/components/EmailVerifyBanner";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { DropCycleProvider } from "@/context/DropCycleContext";
import { useAuth } from "@/context/AuthContext";
import { useSocketEvent } from "@/context/SocketContext";
import { apiRequest } from "@/lib/api";

// Backend item shape — used for the seller-items pass-through to
// DropYardSellerDashboard.
interface ApiItem {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  condition: string;
  status: string;
  zone: string;
  photos: string[];
  isMovingSale: boolean;
  seller?: { id: string; name: string; neighborhood?: string };
  _count?: { watchlist: number; claims: number };
  createdAt: string;
}

// Lightweight guard component. Hooks here stay stable across renders, and the
// authed content below is mounted only after `user` is truthy — so its own
// hook order is also stable. Mirrors the `app/admin/(authed)` pattern. NOTE:
// an early return inside the AuthedBuyerContent function would violate the
// Rules of Hooks, so the guard MUST live in this wrapper, not inline.
function BuyerDashboardContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) {
      // Carry the deep-linked item through the sign-in detour. A signed-out
      // visitor arrives here from the public item page's Claim CTA as
      // /buyer?item=<id>; dropping the id meant they signed up and landed on
      // a generic Discover feed with no sign of the listing they clicked.
      // /join hands it back on the way out (BUG-085's missing half).
      const itemId = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("item")
        : null;
      router.replace(itemId ? `/join?item=${encodeURIComponent(itemId)}` : "/join");
    }
  }, [loading, user, router]);
  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f7faf8]">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-sm font-medium">Checking access…</p>
        </div>
      </div>
    );
  }
  return <AuthedBuyerContent />;
}

function AuthedBuyerContent() {
  // Guard against SSR hydration mismatch: the preview dashboards render
  // user-dependent content inside UserMenu. On SSR, user is null so it shows
  // "?" / "Account"; on client, auth context populates and shows the real
  // name, which trips React's hydration check. We defer rendering until
  // after mount so the markup matches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // BUG-085 — /buyer?item=<id> arrives from the public share page's CTA (and
  // from /join after a signed-out recipient creates an account). Held in state
  // so the dashboard can open that listing, then stripped from the URL once
  // consumed — otherwise a refresh or Back would keep reopening the item.
  const searchParams = useSearchParams();
  const [sharedItemId, setSharedItemId] = useState<string | null>(null);
  const sharedItemSeededRef = useRef(false);
  useEffect(() => {
    if (sharedItemSeededRef.current) return;
    const id = searchParams?.get("item");
    if (id) {
      sharedItemSeededRef.current = true;
      setSharedItemId(id);
    }
  }, [searchParams]);
  const clearSharedItemId = useCallback(() => {
    setSharedItemId(null);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("item")) return;
    // Strip ONLY `item` — the dashboard keeps its active tab in `?tab=`
    // (BUG-087), and blanket-resetting the URL to "/buyer" would wipe it.
    url.searchParams.delete("item");
    url.searchParams.delete("ref");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);

  const { user, signout, accessToken, refreshUser } = useAuth();
  const {
    mode,
    setMode,
    setSellerOnboardingComplete,
    setBuyerOnboardingComplete,
    setDropType,
  } = useDashboard();

  // Seed mode + onboarding flags from the authenticated user.
  // Mode/dropType are initialized ONCE per user identity — otherwise
  // refreshUser() after a profile save would re-run setMode() and bounce
  // BOTH-role users back to the buyer dashboard. Onboarding flags can change
  // during the session (e.g. completing onboarding), so they sync on every
  // user update.
  const modeInitForUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user) return;
    if (modeInitForUserIdRef.current !== user.id) {
      modeInitForUserIdRef.current = user.id;
      const isOnlySeller = user.role === "SELLER";
      // ?mode=seller lets a caller state which side of the dashboard it meant.
      // Without it, "Sell with DropYard" on the landing page sent an already
      // signed-in user through /join, which redirects everyone to /buyer — so
      // a seller CTA opened the buyer dashboard and the user had to find
      // "Switch to Seller" themselves.
      //
      // It wins over the remembered mode for this visit but is NOT persisted:
      // following one seller link must not redefine which side every later
      // visit opens on. Only the Seller/Buyer toggle changes the preference.
      const requested = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("mode")
        : null;
      const asked = (requested === "buyer" || requested === "seller") ? requested : null;
      // Prefer the user's last chosen mode (persisted by setMode) over the
      // role-default. SELLER-only users still force "seller" — they have no
      // buyer dashboard. BOTH-role users get whichever they left in.
      const saved = typeof window !== "undefined" ? window.localStorage.getItem("dropyard:mode") : null;
      const preferred = (saved === "buyer" || saved === "seller") ? saved : null;
      if (isOnlySeller) {
        setMode("seller");
      } else if (asked) {
        setMode(asked, { persist: false });
      } else if (preferred) {
        setMode(preferred);
      } else {
        setMode("buyer");
      }
      if (user.role === "BOTH") setDropType("moving");
    }
    setSellerOnboardingComplete(user.sellerOnboardingDone);
    setBuyerOnboardingComplete(user.buyerOnboardingDone);
  }, [user, setMode, setSellerOnboardingComplete, setBuyerOnboardingComplete, setDropType]);

  // ── Seller-items state ─────────────────────────────────────────
  // Lifted here so we can drive both the initial /api/items/mine fetch and
  // the real-time socket-driven refetch, then pass the resulting list into
  // DropYardSellerDashboard (its inventory / overview / list-new-item flows
  // consume it). Buyer-side data is owned by DropYardBuyerDashboard itself.
  const [sellerItems, setSellerItems] = useState<ApiItem[]>([]);
  const [sellerItemsLoading, setSellerItemsLoading] = useState(false);

  useEffect(() => {
    if (mode !== "seller" || !accessToken) return;
    setSellerItemsLoading(true);
    apiRequest<{ items: ApiItem[] }>("/api/items/mine", { token: accessToken })
      .then(({ items }) => setSellerItems(items))
      .catch(() => { /* keep last known list on transient blip */ })
      .finally(() => setSellerItemsLoading(false));
  }, [mode, accessToken]);

  // Real-time: when a buyer claim is confirmed (item → CLAIMED), cancelled
  // (item → LIVE again), or picked up (item → SOLD), the seller's My Items
  // status pills need to update without waiting for a tab switch. Same goes
  // for `claim:new` when an item transitions to having a pending claim.
  const refetchSellerItemsIfSeller = () => {
    if (mode !== "seller" || !accessToken) return;
    apiRequest<{ items: ApiItem[] }>("/api/items/mine", { token: accessToken })
      .then(({ items }) => setSellerItems(items))
      .catch(() => {});
  };
  useSocketEvent("claim:new",     () => refetchSellerItemsIfSeller());
  useSocketEvent("claim:updated", () => refetchSellerItemsIfSeller());

  // Imperative refresh handler the seller dashboard calls after a List-New-Item
  // submission so the My Items tab reflects the new row immediately.
  const refreshSellerItems = async () => {
    if (!accessToken) return;
    try {
      const { items } = await apiRequest<{ items: ApiItem[] }>("/api/items/mine", { token: accessToken });
      setSellerItems(items);
    } catch {
      /* swallow — the user already saw the success toast from the form */
    }
  };

  // The dashboard previews are .jsx and TS infers their prop types from the
  // default values (null / null). Cast to any so the real `user` object,
  // signout function, accessToken, and refresh callback flow through without
  // TS complaining about the inferred null-only types.
  if (mode === "seller") {
    // Match BuyerDashboardContent's loading branch EXACTLY so hydration aligns
    // regardless of which branch SSR took.
    if (!mounted) {
      return (
        <div className="h-screen flex items-center justify-center bg-[#f7faf8]">
          <div className="flex items-center gap-3 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-sm font-medium">Checking access…</p>
          </div>
        </div>
      );
    }
    return (
      <>
        <EmailVerifyBanner />
        <DropYardSellerDashboard
          onSwitchRole={() => setMode("buyer")}
          user={user as any}
          onSignout={signout as any}
          accessToken={accessToken as any}
          onItemCreated={refreshSellerItems as any}
          sellerItems={sellerItems as any}
          onItemsChange={setSellerItems as any}
          sellerItemsLoading={sellerItemsLoading as any}
          onUserChanged={refreshUser as any}
        />
      </>
    );
  }

  // Buyer mode renders the imported dashboard wholesale. Its TopBar
  // "Switch to Seller" button flips back to seller mode here.
  if (mode === "buyer") {
    if (!mounted) {
      return (
        <div className="h-screen flex items-center justify-center bg-[#f7faf8]">
          <div className="flex items-center gap-3 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-sm font-medium">Checking access…</p>
          </div>
        </div>
      );
    }
    return (
      <>
        <EmailVerifyBanner />
        {/* `as any` casts match the existing props: the dashboard is .jsx, so
            TS infers its prop types from default values (null), not a signature. */}
        <DropYardBuyerDashboard
          onSwitchRole={() => setMode("seller")}
          user={user as any}
          onSignout={signout as any}
          accessToken={accessToken as any}
          initialItemId={sharedItemId as any}
          onInitialItemConsumed={clearSharedItemId as any}
        />
      </>
    );
  }

  // DashboardMode is strictly "buyer" | "seller" — TypeScript narrows both
  // branches above. This return is a defensive fallback that should never
  // execute in practice; leaving it here so the function signature returns
  // a consistent ReactNode under future refactors.
  return null;
}

export default function BuyerDashboardPage() {
  return (
    <DashboardProvider>
      <DropCycleProvider>
        <BuyerDashboardContent />
      </DropCycleProvider>
    </DashboardProvider>
  );
}
