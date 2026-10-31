"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, MapPin, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { HOME_NEIGHBOURHOODS, LIVE_NEIGHBOURHOOD, neighbourhoodRequestHref } from "@/lib/homeNeighbourhoods";

const NAV_LINKS = [
  { href: "/buyer", label: "Browse" },
  { href: "/#the-drop", label: "The Drop" },
  { href: "/#the-shelf", label: "The Shelf" },
  { href: "/how-it-works", label: "How It Works" },
];

// as=seller survives /join, which sends every signed-in user to /buyer —
// without it a seller CTA opens the buyer dashboard.
export const SELL_HREF = "/join?mode=signin&as=seller";

function NeighbourhoodSelect({ className = "" }: { className?: string }) {
  const router = useRouter();
  // A native select: keyboard, screen-reader and phone pickers all work without
  // any of that being rebuilt. Only Barrhaven is live, so picking another area
  // leads to its waitlist request rather than changing what's being browsed.
  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value !== LIVE_NEIGHBOURHOOD) router.push(neighbourhoodRequestHref(e.target.value));
  };
  return (
    <label className={`relative flex items-center rounded border border-dy-line bg-white text-dy-forest focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-dy-orange ${className}`}>
      <span className="sr-only">Neighbourhood</span>
      <MapPin size={16} className="pointer-events-none absolute left-3 text-dy-green" aria-hidden />
      <select
        value={LIVE_NEIGHBOURHOOD}
        onChange={onChange}
        className="w-full cursor-pointer appearance-none bg-transparent py-2.5 pl-9 pr-9 text-[clamp(15px,1.05vw,20px)] font-medium outline-none"
      >
        {HOME_NEIGHBOURHOODS.map((n) => (
          <option key={n.name} value={n.name}>
            {n.live ? n.name : `${n.name} (coming soon)`}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3" aria-hidden />
    </label>
  );
}

const subscribeToNothing = () => () => {};

export function GlobalHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user: sessionUser, loading, signout } = useAuth();
  // The session can resolve before this tree hydrates (it sits inside a
  // Suspense boundary), so anything that depends on it waits for hydration or
  // the first client render won't match the server's HTML.
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const user = hydrated ? sessionUser : null;
  const sessionKnown = hydrated && !loading;
  const close = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const dashboardHref = user?.role === "ADMIN" ? "/admin" : "/buyer";
  const sellHref = user ? "/buyer?mode=seller" : SELL_HREF;
  const linkClass = "dy-focus rounded text-dy-forest transition-colors hover:text-dy-green-strong";

  return (
    <nav aria-label="Main" className="fixed left-0 right-0 top-0 z-50 bg-white font-dy shadow-[0_1px_0_var(--color-dy-line)]">
      <div className="dy-wrap flex h-20 items-center justify-between gap-4 xl:h-[92px]">
        <Link href="/" className="dy-focus shrink-0 rounded" onClick={close}>
          <Image src="/logo-wordmark.png" alt="DropYard home" width={1520} height={376} priority className="h-10 w-auto xl:h-[clamp(44px,2.9vw,56px)]" />
        </Link>

        <div className="hidden items-center gap-[clamp(16px,2.4vw,46px)] xl:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`${linkClass} text-[clamp(15px,1.15vw,22px)] font-medium`}>{l.label}</Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 xl:flex">
          <NeighbourhoodSelect className="w-[clamp(150px,11.5vw,222px)]" />
          {/* Held back until the session check settles, so a signed-in visitor
              doesn't see "Sign In" flash on every page load. */}
          {sessionKnown && (user ? (
            <>
              <Link href={dashboardHref} className={`${linkClass} max-w-[130px] truncate px-2 text-[clamp(15px,1.05vw,20px)] font-medium`}>
                {user.firstName || "My account"}
              </Link>
              <button type="button" onClick={() => signout()} className="dy-focus rounded bg-dy-pale px-4 py-2.5 text-[clamp(15px,1.05vw,20px)] font-medium text-dy-forest transition-colors hover:bg-dy-line">
                Sign Out
              </button>
            </>
          ) : (
            <Link href="/join?mode=signin" className="dy-focus rounded bg-dy-pale px-[clamp(14px,1.1vw,22px)] py-2.5 text-[clamp(15px,1.05vw,20px)] font-medium text-dy-forest transition-colors hover:bg-dy-line">
              Sign In
            </Link>
          ))}
          <Link href={sellHref} className="dy-focus rounded bg-dy-green-strong px-[clamp(14px,1.1vw,22px)] py-2.5 text-[clamp(15px,1.05vw,20px)] font-medium text-white transition-colors hover:bg-dy-mid">
            Sell Something
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="dy-focus -mr-2 rounded p-2.5 text-dy-forest xl:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="dy-mobile-menu"
        >
          {menuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {menuOpen && (
        <div id="dy-mobile-menu" className="max-h-[calc(100dvh-80px)] overflow-y-auto border-t border-dy-line bg-white pb-5 xl:hidden">
          <div className="dy-wrap flex flex-col gap-1 pt-3">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={close} className={`${linkClass} py-3 text-[17px] font-medium`}>{l.label}</Link>
            ))}
            <NeighbourhoodSelect className="mt-2" />
            {sessionKnown && (user ? (
              <>
                <Link href={dashboardHref} onClick={close} className={`${linkClass} py-3 text-[17px] font-medium`}>
                  {user.firstName || "My account"}
                </Link>
                <button type="button" onClick={() => { close(); signout(); }} className="dy-focus mt-1 rounded bg-dy-pale py-3 font-medium text-dy-forest">
                  Sign Out
                </button>
              </>
            ) : (
              <Link href="/join?mode=signin" onClick={close} className="dy-focus mt-2 rounded bg-dy-pale py-3 text-center font-medium text-dy-forest">
                Sign In
              </Link>
            ))}
            <Link href={sellHref} onClick={close} className="dy-focus mt-1 rounded bg-dy-green-strong py-3 text-center font-medium text-white">
              Sell Something
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
