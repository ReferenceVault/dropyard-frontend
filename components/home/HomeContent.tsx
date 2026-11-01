"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ClipboardList, FileText, HandHeart, MapPin, Truck, type LucideIcon } from "lucide-react";
import EarlyAccessSection from "@/components/EarlyAccessSection";
import { SELL_HREF } from "@/components/GlobalHeader";
import { DropCycleProvider } from "@/context/DropCycleContext";
import { LIVE_NEIGHBOURHOOD } from "@/lib/homeNeighbourhoods";
import { ItemCard, ItemCardSkeleton, ItemsEmptyState } from "./ItemCard";
import { NeighbourhoodsSection } from "./NeighbourhoodsSection";
import { FEATURED_SECTION_ID, NextDropSection } from "./NextDropSection";
import { ShelfSection } from "./ShelfSection";
import { useHomeData, type HomeItem, type LoadState } from "./useHomeData";
import { useSectionReveal } from "./useSectionReveal";

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
        className="-z-20 object-cover object-[62%_center] lg:object-[center_45%]"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/50 lg:bg-transparent lg:bg-gradient-to-r lg:from-black/45 lg:via-black/25 lg:to-transparent" />
      <div className="dy-wrap dy-rise py-12">
        <p className="text-[clamp(13px,1.1vw,21px)] font-semibold tracking-[0.1em] text-white">Neighbourhood Marketplace</p>
        <h1 id="hero-heading" className="dy-h1 mt-3 !text-[clamp(38px,3.95vw,76px)] !text-white">
          Your neighbourhood<br />
          yard sale. <span className="text-dy-orange">Online.</span>
        </h1>
        <p className="mt-[clamp(14px,1.05vw,20px)] text-[clamp(17px,1.2vw,23px)] font-semibold text-white">Things already sitting in your home could find another home nearby.</p>
        <p className="mt-[clamp(8px,0.65vw,12px)] max-w-[29em] text-[clamp(16px,1.1vw,21px)] leading-[1.32] text-white/95">
          Discover great finds from people nearby. Buy locally, pick up close to home, and give good things another life.
        </p>
        <div className="mt-[clamp(22px,1.9vw,36px)] flex flex-wrap gap-[clamp(12px,0.85vw,16px)]">
          <Link href="/buyer" className={`dy-btn dy-btn--primary dy-focus ${buttonSize}`}>
            <MapPin className="h-[1em] w-[1em]" fill="currentColor" aria-hidden />
            Browsing {LIVE_NEIGHBOURHOOD}
          </Link>
          <Link href={SELL_HREF} className={`dy-btn dy-btn--light dy-focus ${buttonSize}`}>Sell Something</Link>
        </div>
      </div>
    </section>
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
        <li key={title} className={`${bg} flex items-center gap-[clamp(14px,2vw,38px)] px-[clamp(16px,5.2vw,100px)] py-[clamp(18px,2.3vw,44px)] md:pl-[clamp(16px,3.4vw,66px)] md:pr-4 md:first:pl-[clamp(16px,5.2vw,100px)]`}>
          <Icon className="h-[clamp(40px,4.6vw,88px)] w-[clamp(40px,4.6vw,88px)] shrink-0" strokeWidth={1.4} aria-hidden />
          <div>
            <p className="text-[clamp(19px,1.6vw,31px)] font-semibold">{title}</p>
            <p className="text-[clamp(15px,1.3vw,25px)]">{text}</p>
          </div>
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
            <h2 id="featured-heading" className="dy-h2 mt-3">Worth a closer <span className="text-dy-orange">look.</span></h2>
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
            <ul className="grid grid-cols-1 gap-x-[clamp(14px,1.55vw,30px)] gap-y-8 min-[420px]:grid-cols-2 lg:grid-cols-4">
              {state === "loading"
                ? [0, 1, 2, 3].map((i) => <li key={i}><ItemCardSkeleton /></li>)
                : items.map((item) => (
                    <li key={item.id}>
                      <ItemCard item={item} ribbon="New" saved={savedIds.has(item.id)} onToggleSaved={onToggleSaved} />
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
      </div>
      <div className="flex flex-col justify-center px-[clamp(16px,5.2vw,100px)] py-12 text-white lg:px-[clamp(32px,5.2vw,100px)]">
        <p className="dy-eyebrow !text-white">This Week&apos;s Find</p>
        <h2 id="drop-feature-heading" className="dy-h2 mt-4 !text-white">
          The Drop is where everything <span className="text-dy-orange">happens.</span>
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
    <section aria-labelledby="how-heading" className="dy-section bg-dy-pale">
      <div className="dy-wrap text-center">
        <p className="dy-eyebrow">How DropYard Works</p>
        <h2 id="how-heading" className="dy-h2 mt-4">As simple as a <span className="text-dy-gold">yard sale.</span></h2>
        <ol className="mt-[clamp(36px,4.2vw,80px)] grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative flex flex-col items-center">
              {i > 0 && (
                <span aria-hidden className="absolute right-[calc(50%+clamp(70px,8.4vw,160px))] top-[clamp(23px,1.85vw,35px)] hidden h-px w-[clamp(60px,6.6vw,126px)] -translate-y-px bg-dy-forest after:absolute after:-right-px after:-top-[6px] after:border-y-[6.5px] after:border-l-[11px] after:border-y-transparent after:border-l-dy-forest lg:block" />
              )}
              <span className="flex h-[clamp(46px,3.65vw,70px)] w-[clamp(46px,3.65vw,70px)] items-center justify-center rounded-full bg-dy-gold text-[clamp(16px,1.35vw,26px)] font-bold text-dy-forest">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Icon className="mt-[clamp(20px,2.6vw,50px)] h-[clamp(52px,4.6vw,88px)] w-[clamp(52px,4.6vw,88px)] text-dy-green" strokeWidth={1.4} aria-hidden />
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
    <section aria-labelledby="good-stuff-heading" className="bg-dy-pale">
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
          <p className="dy-eyebrow uppercase">From one home to another</p>
          <h2 id="good-stuff-heading" className="dy-h2 mt-4">
            Good stuff deserves another <span className="text-dy-gold">home.</span>
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

export function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const revealRef = useSectionReveal<HTMLDivElement>();
  const { state, featured, shelf, liveItems, feedPhase, reload, dropStats, neighbourCount, savedIds, claimedIds, userId, toggleSaved } = useHomeData();

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
        <NextDropSection
          stats={state === "ready" ? dropStats : null}
          neighbourCount={neighbourCount}
          live={{ items: liveItems, state, feedPhase, savedIds, claimedIds, userId, onToggleSaved: toggleSaved }}
          onDropOpened={reload}
        />
      </DropCycleProvider>
      <FeaturedSection items={featured} state={state} savedIds={savedIds} onToggleSaved={toggleSaved} />
      <DropFeature />
      <ShelfSection items={shelf} state={state} savedIds={savedIds} onToggleSaved={toggleSaved} />
      <HowItWorks />
      <NeighbourhoodsSection initialRequest={searchParams?.get("hood") ?? null} neighbourCount={neighbourCount} />
      <EarlyAccessSection />
      <GoodStuff />
    </div>
  );
}
