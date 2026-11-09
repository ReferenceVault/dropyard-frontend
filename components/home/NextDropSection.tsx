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
// 16px corners like every other card; dy-glow adds the slow breathing ring
// (motion-allowed only — see globals.css).
const CARD_CLASS = "dy-card dy-glow rounded-2xl bg-white p-[clamp(20px,2.6vw,50px)] shadow-(--shadow-panel) ring-1 ring-dy-line/60";

/** Each figure sits in its own pale tile. Countdown: tiles separated by a pair
 *  of small dots. Stats: tiles side by side, no separator needed. */
function Figures({ cells, variant }: { cells: Array<{ value: string; label: string }>; variant: "countdown" | "stats" }) {
  const stats = variant === "stats";
  return (
    <ul className="mt-[clamp(20px,2.4vw,46px)] grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-x-[clamp(4px,0.6vw,12px)]">
      {cells.map((cell, i) => (
        <Fragment key={cell.label}>
          {i > 0 && (
            stats ? (
              <li aria-hidden className="w-0" />
            ) : (
              <li aria-hidden className="flex flex-col gap-[clamp(6px,0.6vw,12px)]">
                <span className="h-[clamp(5px,0.42vw,8px)] w-[clamp(5px,0.42vw,8px)] rounded-full bg-dy-green/60" />
                <span className="h-[clamp(5px,0.42vw,8px)] w-[clamp(5px,0.42vw,8px)] rounded-full bg-dy-green/60" />
              </li>
            )
          )}
          <li className="flex min-w-0 flex-col-reverse items-center rounded-xl bg-dy-pale px-1 py-[clamp(12px,1.3vw,24px)] ring-1 ring-dy-line/60">
            <span className="mt-2 text-[clamp(13px,1.3vw,25px)] text-dy-muted">{cell.label}</span>
            <span data-figure className={`text-[clamp(34px,3.4vw,66px)] leading-none tracking-[0.04em] text-dy-forest tabular-nums ${stats ? "font-bold" : "font-semibold"}`}>
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
    <span className="flex shrink-0 items-center gap-2 text-[clamp(16px,1.5vw,29px)] font-semibold text-dy-forest">
      {/* Pulses while motion is allowed; a plain dot otherwise. */}
      <span aria-hidden className="dy-live-dot" />
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
export function NextDropSection({ upcomingOnly = false, live, onDropOpened, neighbourCount = null }: {
  /** Always show the countdown, for the page that has no live state. */
  upcomingOnly?: boolean;
  /** The homepage feed's state, to spot a feed loaded before the Drop opened. */
  live?: Pick<LiveDropData, "state" | "feedPhase">;
  /** Called if the clock opens the Drop after the items were loaded. */
  onDropOpened?: () => void;
  /** Real early-access sign-up count from useNeighbourCount(): a number only
   *  when the backend says it's worth showing (showProof), otherwise null —
   *  including while loading and after a failed fetch. */
  neighbourCount?: number | null;
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
        ) : neighbourCount ? (
          // The real early-access count, worded for what it counts: people
          // who signed up. Never a made-up figure (this used to read "1,200+").
          <><span className="font-semibold text-dy-orange-strong">{neighbourCount.toLocaleString("en-CA")}</span> neighbours have signed up in {LIVE_NEIGHBOURHOOD}</>
        ) : (
          // Loading, fetch failed, or too few sign-ups to show yet.
          `Open to every neighbour in ${LIVE_NEIGHBOURHOOD}.`
        )}
      </p>
    </div>
  );

  return (
    <section aria-labelledby="next-drop-heading" className="dy-texture-dots bg-dy-pale">
      <div className="dy-wrap dy-section grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,38%)]">
        <div>
          <p className="dy-eyebrow">The Next Drop</p>
          <Heading id="next-drop-heading" className="dy-h2 mt-4">
            {dropOpenDay()},<br />
            everyone&apos;s <span className="text-dy-accent">invited.</span>
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
