"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, MapPin, Menu, X } from "lucide-react";
import { useAuth, type AuthUser } from "@/context/AuthContext";
import { useSocketEvent } from "@/context/SocketContext";
import { AccountMenu } from "@/components/AccountMenu";
import { useUnreadSummary } from "@/components/useUnreadSummary";
import { HOME_NEIGHBOURHOODS, LIVE_NEIGHBOURHOOD, neighbourhoodRequestHref } from "@/lib/homeNeighbourhoods";

// The header's links. How It Works isn't one of them any more: signed-in
// visitors reach it from the account menu ("Help & How It Works"), signed-out
// ones from the phone menu and the footer.
const NAV_LINKS = [
  { href: "/buyer", label: "Browse" },
  { href: "/#the-drop", label: "The Drop", section: "the-drop" },
  { href: "/#the-shelf", label: "The Shelf", section: "the-shelf" },
];
const HOW_IT_WORKS = { href: "/how-it-works", label: "How It Works" };

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
    <label className={`relative flex items-center rounded-full border border-dy-line bg-white text-dy-forest transition-colors hover:border-dy-green focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-dy-orange ${className}`}>
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

// Which homepage section is on screen, so The Drop / The Shelf can show as
// current there (they're anchors on "/", so the pathname alone can't tell).
// Looked up on every scroll rather than once: the sections can render after
// the header does.
function useSectionInView(enabled: boolean): string | null {
  const [section, setSection] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      // The section under a line just below the header.
      const line = (document.querySelector("nav[aria-label=Main]")?.getBoundingClientRect().bottom ?? 80) + 40;
      let hit: string | null = null;
      for (const id of ["the-drop", "the-shelf"]) {
        const r = document.getElementById(id)?.getBoundingClientRect();
        if (r && r.top <= line && r.bottom > line) hit = id;
      }
      setSection(hit);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled]);
  return enabled ? section : null;
}

const subscribeToNothing = () => () => {};

export function GlobalHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user: sessionUser, loading, signout, setUser, accessToken } = useAuth();
  // The session can resolve before this tree hydrates (it sits inside a
  // Suspense boundary), so anything that depends on it waits for hydration or
  // the first client render won't match the server's HTML.
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const user = hydrated ? sessionUser : null;
  const sessionKnown = hydrated && !loading;
  const close = () => setMenuOpen(false);
  const sectionInView = useSectionInView(pathname === "/");
  // The avatar's unread dot. One summary for both copies of the avatar
  // (desktop row and phone bar), so one set of socket listeners.
  const unread = useUnreadSummary(sessionKnown ? user : null, accessToken);

  // A new profile picture (here, in another tab, or on another device) shows
  // in the header straight away. The API sends this to the user's own room.
  useSocketEvent<{ user?: AuthUser }>("user:updated", (payload) => {
    if (payload?.user) setUser(payload.user);
  });

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const sellHref = user ? "/buyer?mode=seller" : SELL_HREF;
  const linkClass = "dy-focus rounded text-dy-forest transition-colors hover:text-dy-green-strong";
  const current = (l: (typeof NAV_LINKS)[number]) =>
    pathname === l.href ? "page" as const
    : l.section && (sectionInView === l.section || (l.section === "the-drop" && pathname === "/live-drop")) ? "location" as const
    : undefined;
  // Phones: How It Works stays in the menu for signed-out visitors. Signed-in
  // ones have it in the account menu.
  const phoneLinks = user ? NAV_LINKS : [...NAV_LINKS, HOW_IT_WORKS];

  return (
    <nav aria-label="Main" className="fixed left-0 right-0 top-0 z-50 bg-white font-dy shadow-[0_1px_0_var(--color-dy-line)]">
      <div className="dy-wrap flex h-20 items-center justify-between gap-4 xl:h-[92px]">
        <Link href="/" className="dy-focus shrink-0 rounded" onClick={close}>
          <Image src="/logo-wordmark.png" alt="DropYard home" width={1520} height={376} priority className="h-12 w-auto xl:h-[clamp(52px,3.5vw,66px)]" />
        </Link>

        <div className="hidden items-center gap-[clamp(24px,2.6vw,52px)] lg:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={current(l)} className={`${linkClass} dy-navlink text-[clamp(15px,1.15vw,22px)] font-medium`}>{l.label}</Link>
          ))}
        </div>

        <div className="hidden items-center gap-[clamp(14px,1.1vw,20px)] lg:flex">
          <NeighbourhoodSelect className="w-[clamp(150px,11.5vw,222px)]" />
          {/* Held back until the session check settles, so a signed-in visitor
              doesn't see "Sign In" flash on every page load. */}
          {sessionKnown && !user && (
            <Link href="/join?mode=signin" className={`${linkClass} rounded-full px-3 py-2.5 text-[clamp(15px,1.05vw,20px)] font-medium`}>
              Sign In
            </Link>
          )}
          <Link href={sellHref} className="dy-press dy-focus whitespace-nowrap rounded-full bg-dy-green-strong px-[clamp(18px,1.3vw,26px)] py-2.5 text-[clamp(15px,1.05vw,20px)] font-semibold text-white hover:bg-dy-mid">
            Sell Something
          </Link>
          {sessionKnown && user && <AccountMenu user={user} signout={signout} size={44} unread={unread} />}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {/* The same account menu as on desktop. */}
          {sessionKnown && user && <AccountMenu user={user} signout={signout} size={40} unread={unread} />}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="dy-focus -mr-2 rounded p-2.5 text-dy-forest"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="dy-mobile-menu"
          >
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="dy-mobile-menu" className="dy-rise max-h-[calc(100dvh-80px)] overflow-y-auto border-t border-dy-line bg-white pb-5 lg:hidden">
          <div className="dy-wrap flex flex-col gap-1 pt-3">
            {phoneLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={close} aria-current={pathname === l.href ? "page" : undefined} className={`${linkClass} py-3 text-[17px] font-medium aria-[current=page]:text-dy-green-strong`}>{l.label}</Link>
            ))}
            <NeighbourhoodSelect className="mt-2" />
            {sessionKnown && !user && (
              <Link href="/join?mode=signin" onClick={close} className="dy-focus mt-2 rounded-full bg-dy-pale py-3 text-center font-medium text-dy-forest">
                Sign In
              </Link>
            )}
            <Link href={sellHref} onClick={close} className="dy-focus mt-1 rounded-full bg-dy-green-strong py-3 text-center font-semibold text-white">
              Sell Something
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
