"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { dropOpenDay, dropOpenHourLong, dropZoneLabel } from "@/lib/dropCycle";
import { LIVE_NEIGHBOURHOOD } from "@/lib/homeNeighbourhoods";
import { LiveDropPanel, type LiveDropData } from "./LiveDropPanel";
import { useDropSchedule } from "./useDropSchedule";
import type { DropStats } from "./useHomeData";

const pad = (n: number) => String(n).padStart(2, "0");

/** What a live card is showing. Before and after a Drop there's only the countdown. */
type LiveFace = "live" | "countdown" | "items";

const PREVIEW_LABEL = "Preview What Your Neighbours Are Listing";
const CTA_CLASS = "dy-btn dy-btn--primary dy-focus mt-[clamp(20px,2.2vw,42px)] w-full text-center";
const FACE_CLASS = "dy-flip__face rounded-xl bg-white shadow-[0_24px_60px_-30px_rgba(15,54,11,0.3)]";
const FACE_PADDING = "p-[clamp(20px,2.6vw,50px)]";

function Figures({ cells, separator }: { cells: Array<{ value: string; label: string }>; separator: ":" | "|" }) {
  return (
    <dl className="mt-[clamp(20px,2.4vw,46px)] flex items-start justify-between">
      {cells.map((cell, i) => (
        <div key={cell.label} className="contents">
          {i > 0 && (
            <span aria-hidden className={`mt-[0.1em] text-[clamp(36px,3.75vw,72px)] font-light leading-none ${separator === "|" ? "text-dy-line" : "text-dy-forest"}`}>
              {separator}
            </span>
          )}
          <div className="flex flex-col-reverse items-center">
            <dt className="mt-2 text-[clamp(13px,1.3vw,25px)] text-dy-muted">{cell.label}</dt>
            <dd className="text-[clamp(38px,3.75vw,72px)] font-medium leading-none tracking-[0.06em] text-dy-forest tabular-nums">{cell.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

function DropTitle() {
  return (
    <h3 className="flex items-center gap-2 text-[clamp(22px,1.95vw,38px)] font-semibold text-dy-forest">
      <MapPin className="h-[0.9em] w-[0.9em] text-dy-green" aria-hidden />
      {LIVE_NEIGHBOURHOOD} Drop
    </h3>
  );
}

function LiveNow() {
  return (
    <span className="flex items-center gap-2 text-[clamp(16px,1.5vw,29px)] text-dy-forest">
      <span aria-hidden className="h-2 w-2 rounded-full bg-red-600" />
      Live Now
    </span>
  );
}

export function NextDropSection({ stats, neighbourCount, upcomingOnly = false, live, onDropOpened }: {
  stats: DropStats | null;
  neighbourCount: number | null;
  /** Always show the countdown, for the page that has no live state. */
  upcomingOnly?: boolean;
  /** The items shown on the card while the Drop is live. */
  live?: LiveDropData;
  /** Called if the clock opens the Drop after the items were loaded. */
  onDropOpened?: () => void;
}) {
  const { ready, status, now, opensAt, closesAt, simulated } = useDropSchedule();
  const scheduledLive = ready && status === "LIVE" && !upcomingOnly;
  // The items and the schedule must agree: a feed that isn't LIVE has nothing
  // to show, so the card stays on its countdown rather than offer an empty Drop.
  const feedDisagrees = !simulated && !!live?.feedPhase && live.feedPhase !== "LIVE";
  const isLive = scheduledLive && !feedDisagrees && !!live;
  const hasNoItems = isLive && live?.state === "ready" && live.items.length === 0;
  const hasEnded = ready && status === "ENDED" && !upcomingOnly;
  const Heading = upcomingOnly ? "h1" : "h2";

  // Keyed to one Drop, so a Drop closing mid-flip resets the card and next
  // week's starts on its live face. A view only: it never touches the phase.
  const [view, setView] = useState<{ drop: number; face: Exclude<LiveFace, "live">; itemsOpened: boolean } | null>(null);
  const dropKey = closesAt.getTime();
  const openView = isLive && view?.drop === dropKey ? view : null;
  const face: LiveFace = openView?.face ?? "live";
  const itemsOpened = !!openView?.itemsOpened;
  const enterRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const focusAfterFlip = useRef(false);

  // In an effect because the target face is inert until this render commits.
  useEffect(() => {
    if (!focusAfterFlip.current) return;
    focusAfterFlip.current = false;
    const target = face === "items" ? backRef : face === "countdown" ? previewRef : enterRef;
    target.current?.focus({ preventScroll: true });
  }, [face]);

  const showFace = (next: Exclude<LiveFace, "live">) => {
    focusAfterFlip.current = true;
    setView({ drop: dropKey, face: next, itemsOpened: itemsOpened || next === "items" });
  };

  // A page left open across Saturday 8 AM still holds Thursday's feed. Once
  // per opening, so a real disagreement can't turn into a request loop.
  const reloadedForOpening = useRef(false);
  const feedIsStale = scheduledLive && live?.state === "ready" && feedDisagrees;
  useEffect(() => {
    if (!scheduledLive) reloadedForOpening.current = false;
    if (!feedIsStale || reloadedForOpening.current) return;
    reloadedForOpening.current = true;
    onDropOpened?.();
  }, [scheduledLive, feedIsStale, onDropOpened]);

  const remaining = ready ? Math.max(0, opensAt.getTime() - now.getTime()) : 0;
  // Rounded up, so the card never reads 00:00:00 while the Drop is still shut.
  const minutes = Math.ceil(remaining / 60000);
  const count = (n: number) => pad(Math.floor(n));

  const countdown = (
    <>
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
        separator=":"
        cells={[
          { value: ready ? count(minutes / 1440) : "--", label: "days" },
          { value: ready ? count((minutes % 1440) / 60) : "--", label: "hours" },
          { value: ready ? count(minutes % 60) : "--", label: "minutes" },
        ]}
      />
      {isLive ? (
        <button ref={previewRef} type="button" onClick={() => showFace("items")} className={CTA_CLASS}>{PREVIEW_LABEL}</button>
      ) : (
        <Link href="/buyer" className={CTA_CLASS}>{PREVIEW_LABEL}</Link>
      )}
      <p className="dy-body mt-4">
        {hasEnded ? (
          `This Drop has closed. The next one opens ${dropOpenDay()} at ${dropOpenHourLong()} ${dropZoneLabel()}.`
        ) : (
          // The real count, which the API withholds until it's worth showing.
          <>Join {neighbourCount ? <span className="font-semibold text-dy-orange-strong">{neighbourCount.toLocaleString()}</span> : "your"} neighbours in {LIVE_NEIGHBOURHOOD}</>
        )}
      </p>
    </>
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

        <div className="dy-flip">
          <div className={`dy-flip__inner ${face === "countdown" ? "dy-flip__inner--flipped" : ""}`}>
            {isLive && live ? (
              <>
                <div inert={face === "countdown"} className={`relative ${FACE_CLASS}`}>
                  {/* Hidden rather than removed once the items replace it, so
                      the card keeps its height. */}
                  <div inert={itemsOpened} className={`${FACE_PADDING} ${itemsOpened ? "invisible" : ""}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <DropTitle />
                      <LiveNow />
                    </div>
                    <p className="dy-body mt-3">{hasNoItems ? "The Drop is open, but nothing's listed yet. Be the first." : "Jump in before items are gone."}</p>
                    <Figures
                      separator="|"
                      cells={[
                        { value: stats ? pad(stats.items) : "--", label: "Items Live" },
                        { value: stats ? pad(stats.saves) : "--", label: "Saved" },
                        { value: stats ? pad(stats.sellers) : "--", label: "Sellers" },
                      ]}
                    />
                    <button ref={enterRef} type="button" onClick={() => showFace("countdown")} className={CTA_CLASS}>Enter The Live Drop</button>
                    <p className="dy-body mt-4">
                      {`Closes ${closesAt.toLocaleTimeString("en-CA", { timeZone: "America/Toronto", weekday: "long", hour: "numeric", minute: "2-digit" })}, ${dropZoneLabel()}.`}
                    </p>
                  </div>

                  {/* Stays mounted once opened, so flipping keeps its scroll position. */}
                  {itemsOpened && (
                    <div
                      role="group"
                      aria-label={`${LIVE_NEIGHBOURHOOD} Drop items`}
                      onKeyDown={(e) => { if (e.key === "Escape") showFace("countdown"); }}
                      className="absolute inset-0 flex flex-col"
                    >
                      <div className="flex items-center justify-between gap-2 px-[clamp(12px,1.3vw,25px)] py-2">
                        <button ref={backRef} type="button" onClick={() => showFace("countdown")} className="dy-focus flex min-h-11 items-center gap-2 rounded text-[clamp(15px,1.1vw,21px)] font-semibold text-dy-green-strong hover:text-dy-forest">
                          <ArrowLeft className="h-[1.1em] w-[1.1em]" aria-hidden />
                          Back to countdown
                        </button>
                        <LiveNow />
                      </div>
                      {/* Focusable so keyboard users can scroll it with the arrow keys. */}
                      <div tabIndex={0} aria-label="Live Drop items" className="dy-focus min-h-0 flex-1 overflow-y-auto rounded-b-xl px-[clamp(12px,1.3vw,25px)] pb-4">
                        <LiveDropPanel {...live} />
                      </div>
                    </div>
                  )}
                </div>

                <div inert={face !== "countdown"} className={`dy-flip__face--back ${FACE_CLASS} ${FACE_PADDING}`}>{countdown}</div>
              </>
            ) : (
              <div className={`${FACE_CLASS} ${FACE_PADDING}`}>{countdown}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
