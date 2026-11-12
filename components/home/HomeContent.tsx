"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ClipboardList, FileText, HandHeart, Truck, type LucideIcon } from "lucide-react";
import EarlyAccessSection from "@/components/EarlyAccessSection";
import { SELL_HREF } from "@/components/GlobalHeader";
import { DropCycleProvider } from "@/context/DropCycleContext";
import { dropDayOf, dropTimeOf } from "@/lib/dropCycle";
import { LIVE_NEIGHBOURHOOD } from "@/lib/homeNeighbourhoods";
import { ItemCard, ItemCardSkeleton, ItemsEmptyState } from "./ItemCard";
import { NeighbourhoodsSection } from "./NeighbourhoodsSection";
import { FEATURED_SECTION_ID, NextDropSectionView } from "./NextDropSection";
import { ShelfSection } from "./ShelfSection";
import { useDropSchedule } from "./useDropSchedule";
import { useHomeData, type HomeItem, type LoadState } from "./useHomeData";
import { useSectionReveal } from "./useSectionReveal";

// The hero's location pin: a solid pin with a round cut-out (even-odd fill,
// so the button colour shows through) over a separate oval base. Drawn in
// currentColor, sized in em, so it follows the button's text colour and size.
function HeroPinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden focusable="false">
      <path
        fillRule="evenodd"
        d="M12 .8C7.9.8 4.8 3.86 4.8 7.85c0 4.8 5.42 10.4 6.4 11.37a1.13 1.13 0 0 0 1.6 0c.98-.97 6.4-6.57 6.4-11.37C19.2 3.86 16.1.8 12 .8Zm0 4.15a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Z"
      />
      <ellipse cx="12" cy="21.75" rx="4.9" ry="1.7" />
    </svg>
  );
}

function Hero() {
  const buttonSize = "!min-h-[clamp(50px,3.95vw,76px)] !text-[clamp(15px,1.15vw,22px)]";
  return (
    <section aria-labelledby="hero-heading" className="relative isolate flex min-h-[max(540px,min(43.1vw,828px))] items-center overflow-hidden bg-dy-forest">
      <Image
        src="/images/hero-yard-sale.jpg"
        alt="A busy outdoor yard sale with rugs, furniture and neighbours browsing the stalls"
        fill
        priority
        sizes="100vw"
        className="dy-hero-drift -z-20 object-cover object-[62%_center] lg:object-[center_45%]"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/50 lg:bg-transparent lg:bg-gradient-to-r lg:from-black/45 lg:via-black/25 lg:to-transparent" />
      {/* Softens the hard line where the photo meets the trust strip. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-linear-to-b from-transparent to-black/35" />
      <div className="dy-wrap dy-rise py-12">
        <p className="dy-eyebrow dy-eyebrow--on-dark">Neighbourhood Marketplace</p>
        <h1 id="hero-heading" className="dy-h1 mt-4 !text-[clamp(38px,3.95vw,76px)] !text-white">
          Your neighbourhood<br />
          yard sale. <AccentSwoosh>Online.</AccentSwoosh>
        </h1>
        <p className="mt-[clamp(14px,1.05vw,20px)] text-[clamp(17px,1.2vw,23px)] font-semibold text-white">Things already sitting in your home could find another home nearby.</p>
        <p className="mt-[clamp(8px,0.65vw,12px)] max-w-[29em] text-[clamp(16px,1.1vw,21px)] leading-[1.32] text-white/95">
          Discover great finds from people nearby. Buy locally, pick up close to home, and give good things another life.
        </p>
        <div className="mt-[clamp(22px,1.9vw,36px)] flex flex-wrap gap-[clamp(12px,0.85vw,16px)]">
          {/* Full width and equal on phones, where the two would otherwise
              stack at different widths. */}
          <Link href="/buyer" className={`dy-btn dy-btn--primary dy-focus w-full sm:w-auto ${buttonSize}`}>
            {/* 1.25em with the button's gap trimmed by the same 0.25em: the
                pin's size and spacing from the reference design, while the
                button keeps exactly its old width. */}
            <HeroPinIcon className="h-[1.25em] w-[1.25em] -mr-[0.25em] shrink-0" />
            Browsing {LIVE_NEIGHBOURHOOD}
          </Link>
          <Link href={SELL_HREF} className={`dy-btn dy-btn--light dy-focus w-full sm:w-auto ${buttonSize}`}>Sell Something</Link>
        </div>
      </div>
    </section>
  );
}

/** An orange accent word with the brand's brush-stroke underline — the same
 *  traced stroke as "to another." in Early Access. Decorative only. */
function AccentSwoosh({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block text-dy-accent">
      {children}
      <svg aria-hidden viewBox="0 0 65 8" preserveAspectRatio="none" className="absolute left-0 top-[calc(100%-0.16em)] h-[0.32em] w-full overflow-visible">
        <path fill="currentColor" d="M0.6 3.9 C12 2 26 0.6 40 0.6 C52 0.6 60 1.4 64.8 2.2 Q65.4 2.6 64.7 2.8 C60 2.1 52 2.5 40 2.6 C26 2.6 12 4 1 6.2 Q-0.4 5.2 0.6 3.9 Z" />
      </svg>
    </span>
  );
}

const TRUST_ITEMS: Array<{ icon: LucideIcon; title: string; text: string; bg: string }> = [
  { icon: ClipboardList, title: "Free to list", text: "No listing fees.", bg: "bg-dy-green-strong" },
  { icon: Truck, title: "Local pickup", text: "Meet nearby.", bg: "bg-dy-mid" },
  { icon: HandHeart, title: "Less waste", text: "Give good things another home.", bg: "bg-dy-forest" },
];

export function TrustStrip() {
  return (
    <ul className="grid text-white md:grid-cols-3">
      {TRUST_ITEMS.map(({ icon: Icon, title, text, bg }) => (
        // Phones: one compact row per point (title and text share a line) —
        // three stacked full-height blocks took ~260px for three short lines.
        // Tablet up: unchanged three-column strip.
        <li key={title} className={`${bg} flex items-center gap-3 px-4 py-2.5 md:gap-[clamp(14px,2vw,38px)] md:py-[clamp(18px,2.3vw,44px)] md:pl-[clamp(16px,3.4vw,66px)] md:pr-4 md:first:pl-[clamp(16px,5.2vw,100px)]`}>
          {/* Icon tile: a translucent disc gives the line icon a surface. */}
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/25 md:h-[clamp(56px,5.4vw,104px)] md:w-[clamp(56px,5.4vw,104px)]">
            <Icon className="h-[55%] w-[55%]" strokeWidth={1.75} />
          </span>
          <p className="flex flex-wrap items-baseline gap-x-2 md:block">
            <span className="text-[16px] font-semibold md:block md:text-[clamp(19px,1.6vw,31px)]">{title}</span>
            <span className="text-[14px] md:block md:text-[clamp(15px,1.3vw,25px)]">{text}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

function FeaturedSection({ items, state, savedIds, onToggleSaved }: {
  items: HomeItem[];
  state: LoadState;
  savedIds: Set<string>;
  onToggleSaved: (id: string) => void;
}) {
  return (
    <section id={FEATURED_SECTION_ID} tabIndex={-1} aria-labelledby="featured-heading" className="dy-section scroll-mt-20 bg-white outline-none xl:scroll-mt-[92px]">
      <div className="dy-wrap">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="dy-eyebrow">This Week&apos;s Find</p>
            <h2 id="featured-heading" className="dy-h2 mt-3">Worth a closer <span className="text-dy-accent">look.</span></h2>
            <p className="dy-body mt-3">A few things your neighbours are putting up for grabs.</p>
          </div>
          <Link href="/buyer" className="dy-btn dy-btn--primary dy-focus">Browse All Items</Link>
        </div>
        <div className="mt-[clamp(28px,4.2vw,80px)]">
          {state !== "loading" && items.length === 0 ? (
            <ItemsEmptyState
              failed={state === "error"}
              message="Nothing's queued for this week's Drop yet. Be the first to list something."
              action={<Link href={SELL_HREF} className="dy-btn dy-btn--primary dy-focus">Sell Something</Link>}
            />
          ) : (
            // Two columns from the smallest phone: one full-width card per row
            // made this section ~2,450px tall at 390px.
            <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-[clamp(14px,1.55vw,30px)] sm:gap-y-8 lg:grid-cols-4">
              {state === "loading"
                ? [0, 1, 2, 3].map((i) => <li key={i} className="min-w-0"><ItemCardSkeleton /></li>)
                : items.map((item) => (
                    <li key={item.id} className="min-w-0">
                      <ItemCard tight item={item} ribbon="New" saved={savedIds.has(item.id)} onToggleSaved={onToggleSaved} />
                    </li>
                  ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function DropFeature() {
  return (
    <section id="the-drop" aria-labelledby="drop-feature-heading" className="grid scroll-mt-20 bg-dy-forest lg:grid-cols-[65%_35%] xl:scroll-mt-[92px]">
      <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[clamp(480px,50vw,960px)]">
        <Image
          src="/images/hero-drop-yard-sale.jpg"
          alt="A sunny yard sale on the lawn of a house, with framed paintings, pots and plants set out on the grass"
          fill
          sizes="(min-width: 1024px) 65vw, 100vw"
          className="object-cover object-center"
        />
        {/* Melts the photo's edge into the green panel instead of a hard
            seam: the right edge side by side, the bottom edge when stacked. */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/4 bg-linear-to-b from-transparent to-dy-forest/70 lg:hidden" />
        <div aria-hidden className="absolute inset-y-0 right-0 hidden w-1/5 bg-linear-to-r from-transparent to-dy-forest/80 lg:block" />
      </div>
      <div className="flex flex-col justify-center px-[clamp(16px,5.2vw,100px)] py-12 text-white lg:px-[clamp(32px,5.2vw,100px)]">
        <p className="dy-eyebrow dy-eyebrow--on-dark">The Weekly Drop</p>
        <h2 id="drop-feature-heading" className="dy-h2 mt-4 !text-white">
          The Drop is where everything <span className="text-dy-accent">happens.</span>
        </h2>
        <p className="mt-5 text-[clamp(16px,1.35vw,26px)] leading-[1.32] text-[#c4d3c1]">
          A weekly neighbourhood event. Browse and save during the week. On Saturday, claiming opens.
        </p>
        <Link href="/buyer" className="dy-btn dy-btn--primary dy-focus mt-[clamp(24px,2.6vw,50px)] w-fit">Explore the Drop</Link>
      </div>
    </section>
  );
}

const STEPS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: ClipboardList, title: "List", text: "Take a photo and tell us what you're selling." },
  { icon: CalendarDays, title: "Drop", text: "Your item joins the weekly neighbourhood Drop." },
  { icon: FileText, title: "Claim", text: "A neighbour finds it and claims it." },
  { icon: Truck, title: "Pickup", text: "You arrange a simple local pickup." },
];

function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="dy-section dy-texture-dots bg-dy-pale">
      <div className="dy-wrap text-center">
        <p className="dy-eyebrow">How DropYard Works</p>
        <h2 id="how-heading" className="dy-h2 mt-4">As simple as a <span className="text-dy-accent">yard sale.</span></h2>
        <ol className="mt-[clamp(36px,4.2vw,80px)] grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative flex flex-col items-center">
              {i > 0 && (
                <span aria-hidden className="absolute right-[calc(50%+clamp(70px,8.4vw,160px))] top-[clamp(23px,1.85vw,35px)] hidden h-px w-[clamp(60px,6.6vw,126px)] -translate-y-px bg-dy-forest after:absolute after:-right-px after:-top-[6px] after:border-y-[6.5px] after:border-l-[11px] after:border-y-transparent after:border-l-dy-forest lg:block" />
              )}
              <span className="flex h-[clamp(46px,3.65vw,70px)] w-[clamp(46px,3.65vw,70px)] items-center justify-center rounded-full bg-dy-gold text-[clamp(16px,1.35vw,26px)] font-bold text-dy-forest">
                {String(i + 1).padStart(2, "0")}
              </span>
              {/* Icon tile: a white disc with a soft shadow lifts the line icon
                  off the pale background. */}
              <span aria-hidden className="mt-[clamp(20px,2.6vw,50px)] flex h-[clamp(84px,6.9vw,132px)] w-[clamp(84px,6.9vw,132px)] items-center justify-center rounded-full bg-white shadow-(--shadow-card) ring-1 ring-dy-line/70">
                <Icon className="h-[48%] w-[48%] text-dy-green" strokeWidth={1.75} />
              </span>
              <h3 className="mt-[clamp(14px,1.5vw,28px)] text-[clamp(24px,1.95vw,38px)] font-semibold text-dy-forest">{title}</h3>
              <p className="dy-body mt-3 max-w-[320px]">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function GoodStuff() {
  return (
    // White, not pale: the pale footer follows, and the two ran together.
    <section aria-labelledby="good-stuff-heading" className="bg-white">
      <div className="grid lg:grid-cols-[60.6%_39.4%]">
        <div className="flex flex-col">
          <div className="relative aspect-[3/2] lg:aspect-auto lg:flex-1 lg:min-h-[clamp(420px,38vw,724px)]">
            <Image
              src="/images/good-stuff-exchange.jpg"
              alt="A smiling woman in a rust-orange top hands a box of soft toys to a neighbour"
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover object-center"
            />
          </div>
          <p className="flex flex-wrap items-center gap-x-[clamp(10px,3vw,60px)] gap-y-1 bg-dy-forest px-[clamp(16px,5.2vw,100px)] py-[clamp(16px,2.2vw,42px)] text-[clamp(17px,1.95vw,38px)] font-medium text-white">
            {["Seller", "Item", "Neighbour", "New Home"].map((word, i) => (
              <span key={word} className="contents">
                {i > 0 && <span aria-hidden className="tracking-[-0.15em] text-dy-green">»</span>}
                <span>{word}</span>
              </span>
            ))}
          </p>
        </div>
        <div className="flex flex-col justify-center px-[clamp(16px,5.2vw,100px)] py-12">
          <p className="dy-eyebrow">Good for the Neighbourhood</p>
          <h2 id="good-stuff-heading" className="dy-h2 mt-4">
            Good stuff deserves another <span className="text-dy-accent">home.</span>
          </h2>
          <p className="dy-body mt-5">Less waste. Stronger neighbourhoods.<br />Happier homes.</p>
          <div className="mt-[clamp(24px,2.6vw,50px)] flex flex-wrap gap-[14px]">
            <Link href="/buyer" className="dy-btn dy-btn--primary dy-focus">Explore The Drop</Link>
            <Link href={SELL_HREF} className="dy-btn dy-btn--light dy-focus">Sell Something</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The sections that follow the Drop's schedule: the live Drop section and the
 * Shelf. One reading of the schedule for both, so they switch at the same
 * instant (and one /api/drop/current fetch, not two). `between` is the
 * sections in between, made by HomeContent: the clock ticks this component
 * every second, but the same elements come back each time, so React leaves
 * them alone.
 */
function ScheduledSections({ live, onDropOpened, neighbourCount, between, shelf, state, savedIds, onToggleSaved }: {
  live: { state: LoadState; feedPhase: string | null };
  onDropOpened: () => void;
  neighbourCount: number | null;
  between: React.ReactNode;
  shelf: HomeItem[];
  state: LoadState;
  savedIds: Set<string>;
  onToggleSaved: (id: string) => void;
}) {
  const schedule = useDropSchedule();
  return (
    <>
      <NextDropSectionView schedule={schedule} live={live} onDropOpened={onDropOpened} neighbourCount={neighbourCount} />
      {between}
      <ShelfSection
        items={shelf}
        state={state}
        savedIds={savedIds}
        onToggleSaved={onToggleSaved}
        live={schedule.ready ? schedule.status === "LIVE" : null}
        liveEndsDay={dropDayOf(schedule.closesAt)}
        liveEndsTime={dropTimeOf(schedule.closesAt)}
      />
    </>
  );
}

export function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const revealRef = useSectionReveal<HTMLDivElement>();
  const { state, featured, shelf, feedPhase, reload, neighbourCount, savedIds, toggleSaved } = useHomeData();

  useEffect(() => {
    const p = searchParams?.get("page");
    if (p === "howitworks") router.replace("/how-it-works");
    else if (p === "sellers") router.replace("/for-sellers");
    else if (p === "buyers") router.replace("/for-buyers");
  }, [searchParams, router]);

  return (
    <div ref={revealRef} className="bg-white font-dy">
      <Hero />
      <TrustStrip />
      <DropCycleProvider>
        <ScheduledSections
          live={{ state, feedPhase }}
          onDropOpened={reload}
          neighbourCount={neighbourCount}
          between={<>
            <FeaturedSection items={featured} state={state} savedIds={savedIds} onToggleSaved={toggleSaved} />
            <DropFeature />
          </>}
          shelf={shelf}
          state={state}
          savedIds={savedIds}
          onToggleSaved={toggleSaved}
        />
      </DropCycleProvider>
      <HowItWorks />
      <NeighbourhoodsSection initialRequest={searchParams?.get("hood") ?? null} neighbourCount={neighbourCount} />
      <EarlyAccessSection />
      <GoodStuff />
    </div>
  );
}
