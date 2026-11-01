"use client";

// Faithful copy of /preview/feedback/two-ways-to-shop.jsx — do not modify in
// isolation. If the preview changes, mirror the change here.

import React from "react";
import { dropOpenDay, dropOpenHourCompact } from "@/lib/dropCycle";

function CheckIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const dropFeatures = [
  "New items every weekend",
  "48-hour claiming window",
  "Preview items Thu–Fri",
  "Pickup same weekend",
];

const shelfFeatures = [
  "Browse anytime, claim anytime",
  "More items available between Drops",
  "Discounted prices",
  "No weekend window required",
];

export default function ShopWaysSection() {
  return (
    <section className="relative bg-gradient-to-b from-white to-dy-pale px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">

      {/* background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-dy-green-strong/5 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-dy-orange/5 blur-3xl rounded-full" />
      </div>

      <div className="relative mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-dy-orange">
            Two ways to shop
          </p>

          <h2 className="mt-2 text-[35px] font-semibold tracking-tighter leading-[1.05] text-dy-forest sm:text-[47px]">
            There&rsquo;s always something for you
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-[17px] text-slate-600">
            Whether it&apos;s Drop day or a quiet Tuesday, your community has items waiting.
          </p>
        </div>

        {/* GRID */}
        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-2">

          {/* DROP CARD */}
          <div className="group relative rounded-3xl bg-white p-[1.5px] shadow-[0_20px_70px_rgba(0,0,0,0.08)] transition duration-500 hover:-translate-y-3">

            {/* gradient border */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-dy-green-strong/30 via-[#3A8E31]/40 to-transparent opacity-60 group-hover:opacity-100 transition" />

            <div className="relative rounded-3xl bg-white/95 backdrop-blur p-8">

              {/* TOP */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] tracking-[0.3em] uppercase text-dy-forest/60">Every Saturday</span>
                <span className="text-[11px] bg-dy-green-strong/10 text-dy-green-strong px-3 py-1 rounded-full">Live weekly</span>
              </div>

              <h3 className="mt-6 text-[23px] font-bold text-dy-forest">The Drop</h3>

              <p className="mt-3 text-dy-forest/70 text-[13px] max-w-md">
                Fresh items go live {dropOpenDay()} {dropOpenHourCompact()}. Browse, claim, and pick up — all within 48 hours.
              </p>

              {/* FEATURES */}
              <ul className="mt-8 space-y-4">
                {dropFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-[13px] text-dy-forest/80">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-dy-green-strong/10 text-dy-green-strong">
                      <CheckIcon className="h-3 w-3" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button className="mt-10 w-full rounded-xl bg-dy-mid text-white py-3 text-[13px] font-semibold transition hover:bg-dy-mid hover:shadow-lg">
                Browse Drops &rarr;
              </button>

            </div>
          </div>

          {/* SHELF CARD */}
          <div className="group relative rounded-3xl bg-white p-[1.5px] shadow-[0_20px_70px_rgba(0,0,0,0.08)] transition duration-500 hover:-translate-y-3">

            {/* gradient border */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-dy-orange/30 via-[#ff7a00]/40 to-transparent opacity-60 group-hover:opacity-100 transition" />

            <div className="relative rounded-3xl bg-white/95 backdrop-blur p-8">

              {/* TOP */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] tracking-[0.3em] uppercase text-dy-forest/60">Always open</span>
                <span className="text-[11px] bg-dy-orange/10 text-dy-orange px-3 py-1 rounded-full">Open now</span>
              </div>

              <h3 className="mt-6 text-[23px] font-bold text-dy-forest">The Shelf</h3>

              <p className="mt-3 text-dy-forest/70 text-[13px] max-w-md">
                Items available right now, anytime. No countdown, no rush — browse and claim when you&apos;re ready.
              </p>

              {/* FEATURES */}
              <ul className="mt-8 space-y-4">
                {shelfFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-[13px] text-dy-orange/80">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-dy-orange/10 text-dy-orange">
                      <CheckIcon className="h-3 w-3" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA — was a <button> with neither onClick nor href, so
                  clicking it did nothing. It also said "Explore Shelf" while
                  the rest of the page calls the same action "Browse the
                  Shelf". */}
              <a
                href="/buyer"
                className="mt-10 block w-full rounded-xl bg-[#ff6a00] text-center text-white py-3 text-[13px] font-semibold transition hover:bg-[#e85f00] hover:shadow-lg"
              >
                Browse the Shelf &rarr;
              </a>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
