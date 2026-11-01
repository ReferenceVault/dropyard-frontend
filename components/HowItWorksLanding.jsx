"use client";

// Faithful copy of /preview/feedback/how-it-works.jsx — only deviation from
// the preview is that CTA buttons here accept onClick props so they navigate.
// Visual + copy is byte-for-byte identical to the preview.

import React, { useState } from "react";
import { dropOpenDay, dropOpenHourCompact } from "@/lib/dropCycle";

const C = {
  gLightBg: "#F3F8F3",
  gSoft: "#E2EFE0",
  gAccent: "#9CC896",
  gPrimary: "#2C6126",
  gHover: "#17603D",
  gDark: "#0F3D2A",
  oLightBg: "#FFF7ED",
  oSoft: "#FED7AA",
  oPrimary: "#F99605",
  oHover: "#C96F00",
};

const F = {
  h: "var(--font-instrument-sans), sans-serif",
  b: "var(--font-instrument-sans), sans-serif",
};

function Icon({ name, size = 16, color = "currentColor" }) {
  const icons = {
    arrow: <path d="M5 12h14M13 5l7 7-7 7" />,
    check: <path d="M5 12l4 4 10-10" />,
    down: <path d="m6 9 6 6 6-6" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name] || icons.check}
    </svg>
  );
}

function WeeklyTimelineExperience({ onStartSelling, onBrowseDrop }) {
  const flow = [
    {
      step: "01",
      title: "List During The Week",
      time: "Monday–Friday",
      color: "#2C6126",
      bg: "#F3F8F3",
      icon: "📦",
      text: "Sellers can list items throughout the week and choose whether items should sell immediately or enter the upcoming Drop.",
      note: "Create listings & sell instantly",
    },
    {
      step: "02",
      title: "Preview Before The Drop",
      time: "Monday–Friday",
      color: "#7C3AED",
      bg: "#F5F3FF",
      icon: "👀",
      text: "Buyers can browse, save favourites, and ask questions before the Drop officially opens for claiming.",
      note: "Build demand before Saturday",
    },
    {
      step: "03",
      title: "Live Drop Begins",
      time: `${dropOpenDay()} ${dropOpenHourCompact()}`,
      color: "#F99605",
      bg: "#FFF7ED",
      icon: "🔔",
      text: "Any unsold Shelf items automatically roll into the live Drop where buyers can instantly claim or negotiate.",
      note: "Highest urgency conversion window",
      featured: true,
    },
    {
      step: "04",
      title: "Claim & Pickup",
      time: "Saturday–Sunday",
      color: "#2C6126",
      bg: "#ECFEFF",
      icon: "🛒",
      text: "Buyers coordinate local pickup while sellers complete transactions quickly within the community.",
      note: "Fast local completion",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#FAFAF8] px-6 py-12">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-[-12rem] top-[-10rem] h-[32rem] w-[32rem] rounded-full bg-[#9CC896]/10 blur-3xl" />
        <div className="absolute right-[-10rem] top-[10rem] h-[28rem] w-[28rem] rounded-full bg-[#FED7AA]/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full border border-[#E2EFE0] bg-white px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-dy-mid shadow-sm">
            The DropYard Flow
          </span>

          <h2 className="mt-6 text-[26px] font-semibold leading-[1.05] tracking-tighter text-slate-900 sm:text-[38px] lg:text-[48px]">
            Designed around a
            <span className="block text-dy-orange">weekly buying cycle.</span>
          </h2>

          <p className="mt-6 max-w-2xl text-[17px] leading-8 text-slate-500">
            Sellers can list throughout the week, buyers preview upcoming items early, and any unsold Shelf items automatically roll into the Saturday live Drop.
          </p>
        </div>

        <div className="relative mt-10">
          <div className="absolute left-0 right-0 top-[5rem] hidden h-[2px] bg-gradient-to-r from-dy-mid/20 via-dy-orange/30 to-dy-mid/20 lg:block" />

          <div className="grid gap-7 lg:grid-cols-4">
            {flow.map((item) => (
              <div
                key={item.title}
                className={`group relative overflow-hidden rounded-[2.3rem] border border-white/60 bg-white/90 p-8 backdrop-blur-xl transition-all duration-700 hover:-translate-y-3 hover:scale-[1.02] hover:shadow-[0_38px_100px_rgba(15,23,42,0.14)] ${
                  item.featured
                    ? "shadow-[0_28px_90px_rgba(240,138,0,0.22)] ring-1 ring-dy-orange/12"
                    : "shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
                }`}
                style={{ borderColor: `${item.color}20` }}
              >
                <div className="absolute inset-x-5 top-0 h-[4px] rounded-b-full" style={{ background: item.color }} />

                <div className="flex items-start justify-between gap-4">
                  <div
                    className="relative flex h-[72px] w-[72px] items-center justify-center rounded-[1.7rem] text-[29px] transition-all duration-700 group-hover:-translate-y-1 group-hover:scale-110"
                    style={{ background: `linear-gradient(180deg, ${item.bg}, white)` }}
                  >
                    {item.icon}
                  </div>

                  <span className="text-[47px] font-black tracking-[-0.08em] opacity-10" style={{ color: item.color }}>
                    {item.step}
                  </span>
                </div>

                <div className="relative mt-8">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: item.color }}>
                    {item.time}
                  </p>

                  <div className="mt-3 flex items-start gap-2">
                    <h3 className="text-[32px] font-black leading-[1.02] tracking-[-0.06em] text-slate-900">
                      {item.title}
                    </h3>

                    {item.featured && (
                      <span className="mt-1 rounded-full bg-[#FFF7ED] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-dy-orange">
                        Peak Traffic
                      </span>
                    )}
                  </div>

                  <p className="mt-5 text-[15px] leading-7 text-slate-500">{item.text}</p>
                </div>

                <div className="mt-8 flex items-center gap-2 border-t border-slate-100 pt-5 text-[13px] font-bold text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.note}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
          <button onClick={onStartSelling} className="inline-flex items-center gap-2 rounded-full bg-dy-mid px-8 py-4 text-[13px] font-black text-white shadow-[0_12px_30px_rgba(31,122,77,0.22)] transition hover:-translate-y-1">
            Start Selling
            <Icon name="arrow" size={16} />
          </button>

          <button onClick={onBrowseDrop} className="inline-flex items-center gap-2 rounded-full border-2 border-dy-orange bg-white px-8 py-4 text-[13px] font-black text-dy-orange transition hover:-translate-y-1 hover:bg-[#FFF7ED]">
            Browse Upcoming Drop
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

function InfoSection({ onListShelf }) {
  const receiptItems = [
    { name: "Vintage chair", day: "TUE", amt: "$80.00" },
    { name: "Book lot · 12", day: "WED", amt: "$25.00" },
    { name: "Curtain rods", day: "THU", amt: "$18.00" },
    { name: "Hiking pack", day: "FRI", amt: "$60.00" },
    { name: "Toy bin lot", day: "SAT", amt: "$15.00" },
    { name: "Monstera (large)", day: "SUN", amt: "$35.00" },
  ];

  const bullets = [
    ["List directly, anytime", "Upload photos on a Tuesday afternoon. Your item goes live the same day. No queue, no wait."],
    ["Roll-over from the Drop", "Anything that didn't sell during the Saturday Drop moves to The Shelf automatically Sunday at 8 PM. No relisting needed."],
    ["Smart price suggestions", "Items lingering past 7 days get a suggested price drop, so good stuff doesn't sit forever."],
    ["Calm, no countdown", "Buyers browse The Shelf without urgency timers. Perfect for items that need the right buyer, not the fastest one."],
  ];

  return (
    <section className="relative z-[1] overflow-hidden py-12 text-white" style={{ background: `linear-gradient(165deg,${C.gDark} 0%,${C.gHover} 50%,${C.gPrimary} 100%)` }}>
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_10%_0%,rgba(255,255,255,0.06)_0%,transparent_45%),radial-gradient(ellipse_at_90%_100%,rgba(0,0,0,0.18)_0%,transparent_50%)]" />

      <div className="relative z-[1] mx-auto max-w-[1240px] px-8">
        <div className="grid items-center gap-20 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#FDBA74] before:h-0.5 before:w-8 before:bg-[#FDBA74]">
              The Shelf
            </div>

            <h2 className="m-0 mb-6 text-[clamp(27px,4vw,45px)] font-semibold leading-[1.05] tracking-tighter text-white">
              Don&apos;t want to wait for
              <span className="block text-dy-orange">Saturday?</span>
            </h2>

            <p className="mb-9 max-w-[540px] text-[17px] leading-[1.6] text-white/80">
              The Shelf is DropYard&apos;s always-on layer. List something today and it goes live the same day. Browse calmly without a countdown. Whether you missed last weekend&apos;s Drop or just need to clear something now, The Shelf has you.
            </p>

            <ul className="mb-9 list-none border-t border-white/15 p-0">
              {bullets.map(([title, text], index) => (
                <li key={title} className="flex items-start gap-5 border-b border-white/15 py-[18px]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-dy-orange text-[13px] font-extrabold text-dy-forest shadow-[0_4px_10px_-4px_rgba(240,138,0,0.6)]">
                    {index + 1}
                  </span>
                  <div>
                    <strong className="mb-1 block text-[17px] font-extrabold tracking-[-0.01em] text-white">{title}</strong>
                    <span className="text-[14.5px] leading-[1.55] text-white/70">{text}</span>
                  </div>
                </li>
              ))}
            </ul>

            <button onClick={onListShelf} className="inline-flex items-center gap-2.5 rounded-full bg-dy-orange px-7 py-3.5 text-[15px] font-bold text-dy-forest shadow-[0_8px_22px_-8px_rgba(240,138,0,0.55)] transition hover:-translate-y-0.5 hover:bg-[#C96F00] hover:shadow-[0_12px_28px_-8px_rgba(240,138,0,0.7)]">
              List on The Shelf <span>&rarr;</span>
            </button>
          </div>

          <div className="relative flex justify-center before:absolute before:bottom-[-20px] before:left-1/2 before:z-0 before:h-10 before:w-4/5 before:-translate-x-1/2 before:rounded-full before:bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.35)_0%,transparent_70%)] before:blur-[20px]">
            <div className="relative z-[1] w-full max-w-[420px] rotate-[1.8deg] rounded-[3px] bg-[#FAF6EE] px-8 py-9 text-dy-forest shadow-[0_32px_60px_-20px_rgba(0,0,0,0.5),0_12px_24px_-8px_rgba(0,0,0,0.18)] transition duration-500 hover:rotate-0 hover:-translate-y-1">
              <div className="absolute right-[-22px] top-[70px] rotate-[13deg] rounded-sm border-[2.5px] border-dy-mid bg-[#FAF6EE] px-3 py-1 text-center text-[10.5px] font-extrabold leading-none tracking-[0.15em] text-dy-mid shadow-md">
                <span className="mb-0.5 block text-[8.5px] tracking-[0.18em] opacity-85">OFF THE</span>
                <span className="block text-[13px] font-black tracking-[0.04em]">SHELF</span>
              </div>

              <div className="mb-[18px] border-b border-dashed border-dy-forest pb-[18px] text-center">
                <div className="mb-2 text-[28px] font-black leading-none tracking-[-0.025em]">
                  <span className="text-[#005A3F]">Drop</span>
                  <span className="text-dy-orange">Yard</span>
                </div>
                <div className="text-[10px] font-bold tracking-[0.18em] text-[#6B7280]">SELLER · BARRHAVEN · THE SHELF</div>
              </div>

              {receiptItems.map((item) => (
                <div key={item.name} className="flex items-baseline justify-between gap-4 py-[7px] text-[13px] font-medium">
                  <div className="flex flex-1 items-baseline gap-2">
                    {item.name} <span className="shrink-0 text-[9px] font-bold tracking-[0.1em] text-dy-orange">{item.day}</span>
                  </div>
                  <div className="font-semibold tabular-nums">{item.amt}</div>
                </div>
              ))}

              <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-dashed border-dy-forest pt-4 text-[15px] font-extrabold tracking-[0.01em]">
                <div className="font-extrabold tracking-[0.06em]">SHELF TOTAL</div>
                <div className="text-[17px] font-extrabold">$233.00</div>
              </div>

              <div className="mt-6 border-t border-dashed border-dy-forest pt-4 text-center text-[10px] font-bold leading-[1.7] tracking-[0.16em] text-[#6B7280]">
                6 ITEMS · 6 DIFFERENT DAYS
                <br />
                NO DROP NEEDED
                <div className="mt-2 text-[13px] tracking-[0.2em] text-dy-orange">★ ★ ★ ★ ★</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [faqOpen, setFaqOpen] = useState(null);
  const faqs = [
    ["What happens if my item doesn't sell during the Drop?", "It can move to the Shelf where it stays visible to your community. Buyers can claim it anytime, and you can re-drop it later."],
    ["When do buyers see my items?", "Weekend Drop items can be previewed before the Drop opens for claiming. Buyers can browse, save, and ask questions while items are in preview, then claim once the Drop goes live."],
    ["How does pickup work?", "After a buyer claims your item, they choose a pickup time from your available slots and you receive the details."],
  ];

  return (
    <section className="bg-white px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-8 text-center text-[29px] font-semibold tracking-tighter text-slate-900">Common questions</h2>
        {faqs.map((item, index) => (
          <div key={item[0]} className="border-b">
            <button onClick={() => setFaqOpen(faqOpen === index ? null : index)} className="flex w-full items-center justify-between py-5 text-left">
              <p className="font-bold text-slate-900">{item[0]}</p>
              <Icon name="down" size={18} color="#7F927C" />
            </button>
            <div className="overflow-hidden transition-all" style={{ maxHeight: faqOpen === index ? 220 : 0 }}>
              <p className="pb-5 text-[13px] leading-7 text-slate-500">{item[1]}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HowItWorksLanding(props) {
  const onBuyerCta  = props && props.onBuyerCta;
  const onSellerCta = props && props.onSellerCta;
  return (
    <>
      <style>{`* { box-sizing: border-box; } body { margin: 0; }`}</style>
      <div style={{ minHeight: "100vh", backgroundColor: "#FAFAF8", fontFamily: F.b }}>
        <section className="relative overflow-hidden px-6 py-10 text-center sm:py-12" style={{ background: `linear-gradient(165deg,${C.gDark} 0%,${C.gHover} 50%,${C.gPrimary} 100%)` }}>
          {/* Animated background — dot grid + multiple glow blobs */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#9CC896]/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 bottom-0 h-[24rem] w-[24rem] rounded-full bg-dy-orange/15 blur-3xl" />
          <div className="pointer-events-none absolute left-1/2 top-1/4 h-60 w-60 -translate-x-1/2 rounded-full bg-[#FED7AA]/10 blur-3xl" />

          <div className="relative mx-auto max-w-4xl">
            {/* Pulsing live eyebrow */}
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.2)] backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-dy-orange opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-dy-orange" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-100">
                Live weekly rhythm
              </span>
            </div>

            <h1 className="text-[25px] font-semibold tracking-tighter leading-[1.05] text-white sm:text-[37px] lg:text-[49px]">
              <span className="text-dy-orange">How</span> It Works
            </h1>

            <p className="mt-5 text-[15px] font-semibold text-[#FED7AA] sm:text-[17px]">
              A simple weekly buying cycle designed for local discovery
            </p>

            <p className="mx-auto mt-6 max-w-4xl text-[15px] leading-7 text-white/90 sm:text-[17px] sm:leading-8">
              <span className="font-semibold text-white">DropYard runs on a weekly rhythm.</span> Sellers list items throughout the week, buyers preview and save before claiming opens, then the marketplace comes alive during the Saturday Drop — <span className="whitespace-nowrap">where unsold Shelf items automatically roll into the live buying rush.</span>
            </p>

            {/* Week rhythm visualization — 7 day pills with Saturday highlighted */}
            <div className="mx-auto mt-12 max-w-3xl">
              <div className="flex items-stretch justify-center gap-1.5 sm:gap-2">
                {/* Mon–Fri: Shelf is open for listing AND buying (real-time,
                    no countdown). Sat–Sun: the weekly Drop is LIVE — both
                    days highlighted since claiming is open the whole weekend. */}
                {[
                  { day: "M", label: "List", featured: false },
                  { day: "T", label: "List", featured: false },
                  { day: "W", label: "List", featured: false },
                  { day: "T", label: "List", featured: false },
                  { day: "F", label: "List", featured: false },
                  { day: "S", label: "Live Drop", featured: true },
                  { day: "S", label: "Live Drop", featured: true },
                ].map((d, i) => (
                  <div
                    key={i}
                    className={`flex flex-1 flex-col items-center rounded-2xl px-1 py-3 transition-all duration-300 sm:px-2 ${
                      d.featured
                        ? "bg-dy-orange shadow-[0_12px_36px_rgba(240,138,0,0.55)] ring-2 ring-[#FED7AA]/60"
                        : "bg-white/10 backdrop-blur-sm hover:-translate-y-0.5 hover:bg-white/20"
                    }`}
                  >
                    <span className={`text-[13px] font-black sm:text-[15px] ${d.featured ? "text-dy-forest" : "text-white/80"}`}>
                      {d.day}
                    </span>
                    <span className={`mt-1 text-[9px] font-black uppercase tracking-[0.1em] sm:text-[9px] ${d.featured ? "text-dy-forest" : "text-white/60"}`}>
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="h-px w-8 bg-white/30" />
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/55">
                  7-day buying cycle
                </p>
                <span className="h-px w-8 bg-white/30" />
              </div>
            </div>
          </div>
        </section>

        <WeeklyTimelineExperience onStartSelling={onSellerCta} onBrowseDrop={onBuyerCta} />
        <InfoSection onListShelf={onSellerCta} />
        <FAQSection />

        <section className="px-6 py-14 text-center" style={{ background: `linear-gradient(165deg,${C.gDark},${C.gHover})` }}>
          <h2 className="text-[33px] font-semibold tracking-tighter text-white">Ready to join the next Drop?</h2>
          <p className="mx-auto mt-3 max-w-xl text-[13px] leading-7 text-white/50">Whether you&apos;re buying or selling, it only takes a minute to get started.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button onClick={onBuyerCta} className="inline-flex items-center gap-2 rounded-full bg-dy-mid px-7 py-3.5 text-[13px] font-bold text-white">
              Browse as Buyer <Icon name="arrow" size={16} />
            </button>
            <button onClick={onSellerCta} className="inline-flex items-center gap-2 rounded-full bg-dy-orange px-7 py-3.5 text-[13px] font-bold text-dy-forest">
              Become a Seller <Icon name="arrow" size={16} />
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
