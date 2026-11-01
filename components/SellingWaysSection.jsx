"use client";

// Faithful copy of /preview/feedback/two-ways-to-drop.jsx — do not modify in
// isolation. If the preview changes, mirror the change here.

import React, { useState, useEffect } from "react";
import { dropOpenDay, dropOpenHour } from "@/lib/dropCycle";

const dropFeatures = [
  "Free for sellers — core DropYard experience",
  "48-hour claim window creates urgency",
  "Everyone views items at the same time",
  "Unsold items automatically move to The Shelf",
];

const shelfFeatures = [
  "List anytime — no waiting for Saturday",
  "No deadline — items stay until claimed",
  "Smart price suggestions over time",
  "Seamless transition from Drop to Shelf",
];

function CheckIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function PulseDot() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-dy-orange opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-dy-orange" />
    </span>
  );
}

export default function SellingWaysSection() {
  const [active, setActive] = useState("drop");

  // Auto-select based on day: weekend → Drop, weekdays → Shelf
  useEffect(() => {
    const today = new Date().getDay();
    if (today === 6 || today === 0) {
      setActive("drop");
    } else {
      setActive("shelf");
    }
  }, []);

  return (
    <section className="relative bg-[#f9fbf9] py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0">
        <div className="absolute left-0 top-0 w-96 h-96 bg-dy-green-strong/10 rounded-full blur-3xl" />
        <div className="absolute right-0 bottom-0 w-96 h-96 bg-dy-orange/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <PulseDot />
            <p className="text-[11px] font-bold tracking-[0.18em] text-dy-orange uppercase">
              Two ways to buy &amp; sell
            </p>
          </div>

          <h2 className="mt-2 text-[23px] sm:text-[35px] lg:text-[47px] font-semibold tracking-tighter text-dy-forest leading-[1.05]">
            The Drop is the <span className="text-dy-orange">heartbeat</span>.
            <br /> The Shelf is always-on.
          </h2>

          <p className="mt-3 text-[17px] text-slate-600 leading-relaxed">
            One creates urgency and energy. The other gives you flexibility and control.
          </p>
        </div>

        {/* TOGGLE */}
        <div className="mt-6 inline-flex bg-white rounded-full p-1 shadow-md border">
          <button
            onClick={() => setActive("drop")}
            className={`px-6 py-2 rounded-full text-[13px] font-bold transition ${
              active === "drop" ? "bg-dy-green-strong text-white" : "text-slate-600"
            }`}
          >
            Weekly Drop
          </button>
          <button
            onClick={() => setActive("shelf")}
            className={`px-6 py-2 rounded-full text-[13px] font-bold transition ${
              active === "shelf" ? "bg-dy-orange text-dy-forest" : "text-slate-600"
            }`}
          >
            The Shelf
          </button>
        </div>

        {/* CARDS */}
        <div className="mt-12 grid lg:grid-cols-2 gap-10">

          {/* DROP CARD */}
          <div
            className={`group relative rounded-[2.5rem] bg-gradient-to-br from-white to-dy-pale p-10 transition-all duration-500 ${
              active === "drop"
                ? "scale-105 shadow-[0_40px_100px_rgba(47,138,34,0.25)] border-2 border-dy-green-strong ring-4 ring-dy-green-strong/20"
                : "opacity-60 border border-transparent hover:opacity-80"
            }`}
          >

            {/* animated outline glow */}
            {active === "drop" && (
              <div className="absolute inset-0 rounded-[2.5rem] border-2 border-dy-green-strong animate-pulse opacity-30 pointer-events-none" />
            )}

            {active === "drop" && (
              <div className="absolute top-6 right-6 flex items-center gap-2 text-[11px] text-dy-green-strong">
                <span className="animate-pulse">●</span> Live Drop
              </div>
            )}

            <h3 className="text-[29px] font-black text-dy-forest">Weekly Drop</h3>

            <p className="mt-2 text-dy-green-strong font-semibold">
              {dropOpenDay()} {dropOpenHour()}. Everyone shows up.
            </p>

            <p className="mt-4 text-slate-600 leading-relaxed">
              A synchronized buying moment. Everything goes live together.
            </p>

            <div className="mt-8 space-y-4">
              {dropFeatures.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckIcon className="h-5 w-5 text-dy-green-strong mt-1" />
                  <p className="text-[13px] text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SHELF CARD */}
          <div
            className={`group relative rounded-[2.5rem] bg-gradient-to-br from-white to-[#fff6ec] p-10 transition-all duration-500 ${
              active === "shelf"
                ? "scale-105 shadow-[0_40px_100px_rgba(255,148,18,0.25)] border-2 border-dy-orange ring-4 ring-dy-orange/20"
                : "opacity-60 border border-transparent hover:opacity-80"
            }`}
          >

            {active === "shelf" && (
              <div className="absolute inset-0 rounded-[2.5rem] border-2 border-dy-orange animate-pulse opacity-30 pointer-events-none" />
            )}

            {active === "shelf" && (
              <div className="absolute top-6 right-6 text-[11px] text-dy-orange animate-pulse">
                Always Available
              </div>
            )}

            <h3 className="text-[29px] font-black text-dy-forest">The Shelf</h3>

            <p className="mt-2 text-dy-orange font-semibold">
              Sell anytime. No pressure.
            </p>

            <p className="mt-4 text-slate-600 leading-relaxed">
              A flexible layer between Drops. Control when you sell.
            </p>

            <div className="mt-8 space-y-4">
              {shelfFeatures.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckIcon className="h-5 w-5 text-dy-orange mt-1" />
                  <p className="text-[13px] text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
