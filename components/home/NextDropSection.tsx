"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { useDropCycle } from "@/context/DropCycleContext";
import { dropCloseMoment, dropOpenDay, dropOpenHourLong, dropZoneLabel, nextDropMoment } from "@/lib/dropCycle";
import { LIVE_NEIGHBOURHOOD } from "@/lib/homeNeighbourhoods";
import type { DropStats } from "./useHomeData";

const pad = (n: number) => String(n).padStart(2, "0");

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

/** The next opening still ahead: during a live Drop, that's next week's. */
function upcomingOpening(now: Date): Date {
  const opening = nextDropMoment(now);
  return opening > now ? opening : nextDropMoment(new Date(dropCloseMoment(now).getTime() + 1000));
}

export function NextDropSection({ stats, neighbourCount, upcomingOnly = false }: {
  stats: DropStats | null;
  neighbourCount: number | null;
  /** Always show the countdown, for the page that has no live state. */
  upcomingOnly?: boolean;
}) {
  const { phase, effectiveNow } = useDropCycle();
  // The provider's clock starts at the epoch until it mounts on the client.
  const ready = effectiveNow.getTime() > 0;
  const isLive = ready && phase === "LIVE" && !upcomingOnly;
  const Heading = upcomingOnly ? "h1" : "h2";

  const remaining = ready ? Math.max(0, upcomingOpening(effectiveNow).getTime() - effectiveNow.getTime()) : 0;
  const minutes = Math.floor(remaining / 60000);
  const count = (n: number) => pad(Math.floor(n));

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

        <div className="rounded-xl bg-white p-[clamp(20px,2.6vw,50px)] shadow-[0_24px_60px_-30px_rgba(15,54,11,0.3)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-[clamp(22px,1.95vw,38px)] font-semibold text-dy-forest">
              <MapPin className="h-[0.9em] w-[0.9em] text-dy-green" aria-hidden />
              {LIVE_NEIGHBOURHOOD} Drop
            </h3>
            {isLive && (
              <span className="flex items-center gap-2 text-[clamp(16px,1.5vw,29px)] text-dy-forest">
                <span aria-hidden className="h-2 w-2 rounded-full bg-red-600" />
                Live Now
              </span>
            )}
          </div>

          {isLive ? (
            <>
              <p className="dy-body mt-3">{stats?.items === 0 ? "The Drop is open." : "Jump in before items are gone."}</p>
              <Figures
                separator="|"
                cells={[
                  { value: stats ? pad(stats.items) : "--", label: "Items Live" },
                  { value: stats ? pad(stats.saves) : "--", label: "Saved" },
                  { value: stats ? pad(stats.sellers) : "--", label: "Sellers" },
                ]}
              />
            </>
          ) : (
            <>
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
            </>
          )}

          <Link href={isLive ? "/live-drop" : "/buyer"} className="dy-btn dy-btn--primary dy-focus mt-[clamp(20px,2.2vw,42px)] w-full text-center">
            {isLive ? "Enter The Live Drop" : "Preview What Your Neighbours Are Listing"}
          </Link>

          <p className="dy-body mt-4">
            {isLive ? (
              `Closes ${dropCloseMoment(effectiveNow).toLocaleTimeString("en-CA", { timeZone: "America/Toronto", weekday: "long", hour: "numeric", minute: "2-digit" })}, ${dropZoneLabel()}.`
            ) : neighbourCount ? (
              <>Join <span className="font-semibold text-dy-orange-strong">{neighbourCount.toLocaleString()}</span> neighbours in {LIVE_NEIGHBOURHOOD}</>
            ) : (
              `All Drop times are ${dropZoneLabel()}.`
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
