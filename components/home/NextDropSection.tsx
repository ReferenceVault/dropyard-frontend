"use client";

import { Fragment, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck, MapPin, Package, Radio, Users, type LucideIcon } from "lucide-react";
import { DROP_ZONE_ABBR, dropDayOf, dropOpenDay, dropOpenHourLong, dropTimeOf, dropZoneLabel } from "@/lib/dropCycle";
import { LIVE_NEIGHBOURHOOD } from "@/lib/homeNeighbourhoods";
import type { LiveDropData } from "./LiveDropPanel";
import { useDropSchedule, type DropSchedule } from "./useDropSchedule";

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

/** The red "LIVE NOW" pill (white on dy-red, 5.0:1). The broadcast icon is
 *  static; the only motion in the live card is the progress bar's width, off
 *  under reduced motion. The Shelf section reuses it as "LIVE DROP · NOW OPEN". */
export function LivePill({ label = "Live now" }: { label?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-dy-red px-3 py-1 text-[clamp(12px,0.95vw,17px)] font-bold uppercase tracking-[0.08em] text-white">
      <Radio className="h-[1.15em] w-[1.15em]" strokeWidth={2.25} aria-hidden />
      {label}
    </span>
  );
}

/** Hours : minutes : seconds to the Drop's end. Fixed-width digits so the
 *  layout never shifts as they tick; hidden from screen readers, which get a
 *  once-a-minute summary instead (see the live card). */
function LiveCountdown({ totalSeconds }: { totalSeconds: number }) {
  const cells = [
    { value: pad(Math.floor(totalSeconds / 3600)), label: "Hours" },
    { value: pad(Math.floor((totalSeconds % 3600) / 60)), label: "Minutes" },
    { value: pad(totalSeconds % 60), label: "Seconds" },
  ];
  return (
    <div aria-hidden className="flex items-start gap-[clamp(4px,0.5vw,10px)]">
      {cells.map((cell, i) => (
        <Fragment key={cell.label}>
          {i > 0 && <span className="text-[clamp(30px,2.9vw,56px)] font-light leading-none text-dy-forest">:</span>}
          <span className="flex flex-col items-center">
            <span className="inline-block min-w-[2ch] text-center text-[clamp(30px,2.9vw,56px)] font-bold leading-none tracking-[0.02em] text-dy-forest tabular-nums">
              {cell.value}
            </span>
            <span className="mt-1.5 text-[clamp(11px,0.85vw,16px)] text-dy-muted">{cell.label}</span>
          </span>
        </Fragment>
      ))}
    </div>
  );
}

/** One live figure: icon + number + label. "–" until the backend has given
 *  a real number; never an estimate. Zero is shown as 0. */
function LiveStat({ icon: Icon, value, label }: { icon: LucideIcon; value: number | undefined; label: string }) {
  return (
    <li className="flex min-w-0 flex-col gap-1 rounded-xl bg-dy-pale px-[clamp(8px,0.9vw,16px)] py-[clamp(10px,1vw,18px)] ring-1 ring-dy-line/60">
      <span className="flex items-center gap-1.5">
        <Icon className="h-[clamp(16px,1.3vw,24px)] w-[clamp(16px,1.3vw,24px)] shrink-0 text-dy-green" aria-hidden />
        <span className="text-[clamp(20px,1.8vw,34px)] font-bold leading-none text-dy-forest tabular-nums">
          {typeof value === "number" ? value.toLocaleString("en-CA") : "–"}
        </span>
      </span>
      <span className="text-[clamp(12px,0.95vw,18px)] leading-tight text-dy-muted">{label}</span>
    </li>
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
 * The "Next Drop" section and its Barrhaven Drop card. Which version shows is
 * decided by the Drop schedule alone, never by a click and never by whether
 * any items exist: the pre-live version (countdown to the opening) until the
 * Drop record's start, the live version until its end, then the pre-live
 * version again counting to the next Drop. The switch happens on the ticking
 * clock, without a reload. Every start/end time shown is read from the Drop
 * record, in Toronto time.
 */
type NextDropSectionProps = {
  /** Always show the countdown, never the live version. */
  upcomingOnly?: boolean;
  /** The section heading is the page's h1 (/live-drop). */
  asPageHeading?: boolean;
  /** The homepage feed's state, to spot a feed loaded before the Drop opened. */
  live?: Pick<LiveDropData, "state" | "feedPhase">;
  /** Called if the clock opens the Drop after the items were loaded. */
  onDropOpened?: () => void;
  /** Real early-access sign-up count from useNeighbourCount(): a number only
   *  when the backend says it's worth showing (showProof), otherwise null —
   *  including while loading and after a failed fetch. */
  neighbourCount?: number | null;
};

export function NextDropSection(props: NextDropSectionProps) {
  return <NextDropSectionView {...props} schedule={useDropSchedule()} />;
}

/** The same section, given a schedule reading the caller shares with other
 *  sections (the homepage's Shelf), so they all switch at the same instant. */
export function NextDropSectionView({ schedule, upcomingOnly = false, asPageHeading = false, live, onDropOpened, neighbourCount = null }: NextDropSectionProps & {
  schedule: DropSchedule;
}) {
  const { ready, status, now, opensAt, closesAt, startedAt, simulated, liveStats } = schedule;
  const isLive = ready && status === "LIVE" && !upcomingOnly;
  const hasEnded = ready && status === "ENDED" && !upcomingOnly;
  const Heading = upcomingOnly || asPageHeading ? "h1" : "h2";

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

  // ── Live version: everything below is read from the Drop record ──
  const closeRemaining = Math.max(0, closesAt.getTime() - now.getTime());
  const closeMinutes = Math.ceil(closeRemaining / 60000);
  const span = closesAt.getTime() - startedAt.getTime();
  // Time elapsed between the Drop's start and end, rounded down.
  const progress = span > 0 ? Math.min(100, Math.max(0, Math.floor(((now.getTime() - startedAt.getTime()) / span) * 100))) : 0;
  const endDay = dropDayOf(closesAt);
  const endTime = dropTimeOf(closesAt);
  const windowLabel = `${dropDayOf(startedAt, true)} ${dropTimeOf(startedAt)} – ${dropDayOf(closesAt, true)} ${endTime} (${DROP_ZONE_ABBR})`;

  const liveCard = (
    <div className={CARD_CLASS}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <LivePill />
        <span className="text-[clamp(16px,1.4vw,27px)] font-semibold text-dy-forest">{LIVE_NEIGHBOURHOOD} Drop</span>
      </div>
      {/* Screen readers get the countdown once a minute, not every second. */}
      <p className="sr-only">
        {closeMinutes > 0
          ? `The Drop ends in ${Math.floor(closeMinutes / 60)} hours ${closeMinutes % 60} minutes, ${endDay} at ${endTime} Eastern Time.`
          : "The Drop is closing now."}
      </p>
      <div className="mt-[clamp(16px,1.8vw,34px)] flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <LiveCountdown totalSeconds={Math.floor(closeRemaining / 1000)} />
        <p aria-hidden className="text-[clamp(13px,1.1vw,21px)] leading-snug text-dy-muted sm:text-right">
          Ends <span className="font-semibold text-dy-forest">{endDay}</span>
          <br className="hidden sm:block" />{" "}
          <span className="font-bold text-dy-accent">{endTime}</span>
        </p>
      </div>
      <div className="mt-[clamp(18px,2vw,38px)]">
        <div className="flex items-baseline justify-between gap-3 text-[clamp(13px,1.05vw,20px)]">
          <span id="live-drop-progress" className="font-semibold text-dy-forest">Live Drop progress</span>
          <span aria-hidden className="text-dy-muted tabular-nums">{progress}% completed</span>
        </div>
        <div
          role="progressbar"
          aria-labelledby="live-drop-progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-valuetext={`${progress}% completed`}
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-dy-pale ring-1 ring-dy-line/60"
        >
          <div className="h-full rounded-full bg-dy-green-strong transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <ul className="mt-[clamp(18px,2vw,38px)] grid grid-cols-3 gap-[clamp(6px,0.8vw,14px)]">
        <LiveStat icon={Package} value={liveStats?.items} label="Items available" />
        <LiveStat icon={CircleCheck} value={liveStats?.claimed} label="Items claimed" />
        <LiveStat icon={Users} value={liveStats?.sellers} label="Neighbours selling" />
      </ul>
      {/* /buyer opens Discover; signed-out visitors go through /join and back. */}
      <Link href="/buyer" className={`${CTA_CLASS} inline-flex items-center justify-center gap-2`}>
        Shop the Live Drop <ArrowRight className="h-[1.1em] w-[1.1em]" aria-hidden />
      </Link>
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
        {isLive ? (
          <div>
            <p className="dy-eyebrow flex-wrap gap-y-1">
              {/* The spaces keep the parts apart for screen readers; the flex
                  gap does it visually. */}
              {LIVE_NEIGHBOURHOOD} Drop{" "}
              {/* Phones wrap the time onto its own line, so no divider there. */}
              <span aria-hidden className="hidden h-[1.1em] w-px bg-dy-line sm:block" />{" "}
              <span className="font-medium normal-case tracking-normal text-dy-muted">{windowLabel}</span>
            </p>
            <Heading id="next-drop-heading" className="dy-h2 mt-4">
              The neighbourhood Drop is <span className="text-dy-accent">live!</span>
            </Heading>
            <p className="mt-4 text-[clamp(17px,1.4vw,27px)] font-semibold text-dy-orange-strong">Great finds are up for grabs right now.</p>
            <p className="dy-body mt-3 max-w-[660px]">
              Browse, claim and give pre-loved items a new home within your community.
            </p>
          </div>
        ) : (
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
        )}

        {/* aria-live, so the swap at opening and closing is announced once, and
            the minute-by-minute summary after it. The live card's ticking
            digits are aria-hidden, so seconds are never announced. */}
        <div aria-live="polite">{isLive ? liveCard : countdownCard}</div>
      </div>
    </section>
  );
}
