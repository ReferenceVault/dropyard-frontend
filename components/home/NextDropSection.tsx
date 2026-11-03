"use client";

import { Fragment, useEffect, useRef } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { dropOpenDay, dropOpenHourLong, dropZoneLabel } from "@/lib/dropCycle";
import { LIVE_NEIGHBOURHOOD } from "@/lib/homeNeighbourhoods";
import type { LiveDropData } from "./LiveDropPanel";
import { useDropSchedule } from "./useDropSchedule";

const pad = (n: number) => String(n).padStart(2, "0");

export const FEATURED_SECTION_ID = "worth-a-closer-look";
const CTA_CLASS = "dy-btn dy-btn--primary dy-focus mt-[clamp(20px,2.2vw,42px)] w-full text-center";
const CARD_CLASS = "dy-card rounded-xl bg-white p-[clamp(20px,2.6vw,50px)] shadow-[var(--shadow-panel)]";

/** Countdown: light figures with colon separators. Stats: bold figures with thin
 *  dividers. Both run edge to edge, the outer columns flush with the card text. */
function Figures({ cells, variant }: { cells: Array<{ value: string; label: string }>; variant: "countdown" | "stats" }) {
  const stats = variant === "stats";
  return (
    <ul className={`mt-[clamp(20px,2.4vw,46px)] grid items-start grid-cols-[auto_1fr_auto_1fr_auto]`}>
      {cells.map((cell, i) => (
        <Fragment key={cell.label}>
          {i > 0 && (
            stats ? (
              <li aria-hidden className="mx-auto h-[clamp(40px,3.6vw,68px)] w-[3px] rounded-full bg-dy-line" />
            ) : (
              <li aria-hidden className="mt-[0.1em] text-center text-[clamp(36px,3.75vw,72px)] font-light leading-none text-dy-forest">:</li>
            )
          )}
          <li className="flex min-w-0 flex-col-reverse items-center">
            <span className="mt-2 text-[clamp(13px,1.3vw,25px)] text-dy-muted">{cell.label}</span>
            <span data-figure className={`text-[clamp(38px,3.75vw,72px)] leading-none tracking-[0.06em] text-dy-forest tabular-nums ${stats ? "font-bold" : "font-medium"}`}>
              {/* Keyed by value, so it replays only when the number changes. */}
              <span key={cell.value} className="dy-tick">{cell.value}</span>
            </span>
          </li>
        </Fragment>
      ))}
    </ul>
  );
}

function DropTitle() {
  return (
    <h3 className="flex items-center gap-2 text-[clamp(22px,1.95vw,38px)] font-semibold text-dy-forest">
      <MapPin className="h-[0.9em] w-[0.9em] shrink-0 text-dy-green" aria-hidden />
      {LIVE_NEIGHBOURHOOD} Drop
    </h3>
  );
}

function LiveNow() {
  return (
    <span className="flex shrink-0 items-center gap-2 text-[clamp(16px,1.5vw,29px)] text-dy-forest">
      <span aria-hidden className="h-2 w-2 rounded-full bg-red-600" />
      Live Now
    </span>
  );
}

/** Smoothly brings "Worth a closer look" in below the fixed header. */
function scrollToFeatured() {
  const section = document.getElementById(FEATURED_SECTION_ID);
  if (!section) return;
  // A reveal in progress offsets the section, which would skew the landing.
  section.getAnimations().forEach((animation) => animation.finish());
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  // Keyboard users carry on from the section, not from the button above it.
  section.focus({ preventScroll: true });
}

/**
 * The Barrhaven Drop card. Which card shows is decided by the Drop schedule
 * alone, never by a click and never by whether any items exist: the countdown
 * until Saturday 8 AM Toronto time, the live card until Sunday 8 PM, then the
 * countdown to the next Drop. Both buttons scroll to "Worth a closer look".
 */
export function NextDropSection({ upcomingOnly = false, live, onDropOpened }: {
  /** Always show the countdown, for the page that has no live state. */
  upcomingOnly?: boolean;
  /** The homepage feed's state, to spot a feed loaded before the Drop opened. */
  live?: Pick<LiveDropData, "state" | "feedPhase">;
  /** Called if the clock opens the Drop after the items were loaded. */
  onDropOpened?: () => void;
}) {
  const { ready, status, now, opensAt, simulated, liveStats } = useDropSchedule();
  const isLive = ready && status === "LIVE" && !upcomingOnly;
  const hasEnded = ready && status === "ENDED" && !upcomingOnly;
  const Heading = upcomingOnly ? "h1" : "h2";

  // A page left open across Saturday 8 AM still holds Thursday's feed, so
  // "Worth a closer look" is refetched once per opening. Never in a loop.
  const reloadedForOpening = useRef(false);
  const feedIsStale = isLive && !simulated && live?.state === "ready" && !!live.feedPhase && live.feedPhase !== "LIVE";
  useEffect(() => {
    if (!isLive) reloadedForOpening.current = false;
    if (!feedIsStale || reloadedForOpening.current) return;
    reloadedForOpening.current = true;
    onDropOpened?.();
  }, [isLive, feedIsStale, onDropOpened]);

  const remaining = ready ? Math.max(0, opensAt.getTime() - now.getTime()) : 0;
  // Rounded up, so the card never reads 00:00:00 while the Drop is still shut.
  const minutes = Math.ceil(remaining / 60000);
  const count = (n: number) => pad(Math.floor(n));
  const stat = (n: number | undefined) => (typeof n === "number" ? pad(n) : "--");

  const liveCard = (
    <div className={CARD_CLASS}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <DropTitle />
        <LiveNow />
      </div>
      <p className="dy-body mt-3">Jump in before items are gone.</p>
      <Figures
        variant="stats"
        cells={[
          { value: stat(liveStats?.items), label: "Items Live" },
          { value: stat(liveStats?.claims), label: "Claimed" },
          { value: stat(liveStats?.sellers), label: "Sellers" },
        ]}
      />
      <button type="button" onClick={scrollToFeatured} className={CTA_CLASS}>Enter The Live Drop</button>
      <p className="dy-body mt-4">Items being claimed in real time.</p>
    </div>
  );

  const countdownCard = (
    <div className={CARD_CLASS}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DropTitle />
        {hasEnded && <span className="text-[clamp(16px,1.5vw,29px)] text-dy-muted">Drop closed</span>}
      </div>
      <p className="mt-3 flex items-center gap-3 text-[clamp(17px,1.6vw,31px)]">
        <span className="text-dy-forest">{dropOpenDay()}</span>
        <span aria-hidden className="h-[1.2em] w-px bg-dy-line" />
        <span className="text-dy-muted">Opens {dropOpenHourLong()}</span>
      </p>
      {/* Whole minutes, so nothing here changes every second for a
          screen reader. */}
      <Figures
        variant="countdown"
        cells={[
          { value: ready ? count(minutes / 1440) : "--", label: "days" },
          { value: ready ? count((minutes % 1440) / 60) : "--", label: "hours" },
          { value: ready ? count(minutes % 60) : "--", label: "minutes" },
        ]}
      />
      {/* The homepage has the section to scroll to; /live-drop doesn't. */}
      {live ? (
        <button type="button" onClick={scrollToFeatured} className={CTA_CLASS}>Preview What Your Neighbours Are Listing</button>
      ) : (
        <Link href="/buyer" className={CTA_CLASS}>Preview What Your Neighbours Are Listing</Link>
      )}
      <p className="dy-body mt-4">
        {hasEnded ? (
          `This Drop has closed. The next one opens ${dropOpenDay()} at ${dropOpenHourLong()} ${dropZoneLabel()}.`
        ) : (
          <>Join <span className="font-semibold text-dy-orange-strong">1,200+</span> neighbours in {LIVE_NEIGHBOURHOOD}</>
        )}
      </p>
    </div>
  );

  return (
    <section aria-labelledby="next-drop-heading" className="bg-dy-pale">
      <div className="dy-wrap dy-section grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,38%)]">
        <div>
          <p className="dy-eyebrow">The Next Drop</p>
          <Heading id="next-drop-heading" className="dy-h2 mt-4">
            {dropOpenDay()},<br />
            everyone&apos;s <span className="text-dy-orange">invited.</span>
          </Heading>
          <p className="mt-4 text-[clamp(17px,1.4vw,27px)] font-semibold text-dy-orange-strong">A new neighbourhood yard sale, every {dropOpenDay()}.</p>
          <p className="dy-body mt-3 max-w-[660px]">
            Neighbours list during the week. Then on {dropOpenDay()}, the Drop opens and everyone gets a chance to claim what they want.
          </p>
        </div>

        {/* aria-live, so the swap at opening and closing is announced. */}
        <div aria-live="polite">{isLive ? liveCard : countdownCard}</div>
      </div>
    </section>
  );
}
