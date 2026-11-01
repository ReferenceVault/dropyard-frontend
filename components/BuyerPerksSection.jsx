"use client";

// Faithful copy of /preview/feedback/the-perk.jsx — do not modify in
// isolation. If the preview changes, mirror the change here.

import React, { useState } from "react";

function PriceIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M16 8c0-2-2-3-4-3s-4 1-4 3 2 3 4 3 4 1 4 3-2 3-4 3-4-1-4-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LocationIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="10" r="2" fill="currentColor" />
    </svg>
  );
}

function ShieldIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l7 4v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7l7-4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PickupIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

const perks = [
  {
    title: "Amazing Prices",
    description: "Find items priced far below retail — real value from real neighbours.",
    detail: "Compare nearby listings, save favourites, and act quickly when a good deal appears.",
    Icon: PriceIcon,
    accent: "green",
  },
  {
    title: "Hyper-Local",
    description: "Everything is nearby. No shipping, no delays — just walk or drive over.",
    detail: "Browse by neighbourhood so pickup stays convenient and practical.",
    Icon: LocationIcon,
    accent: "orange",
  },
  {
    title: "Quality Items",
    description: "Transparent listings with real sellers, ratings, and clear condition details.",
    detail: "Photos, notes, and seller context help buyers make better decisions before pickup.",
    Icon: ShieldIcon,
    accent: "teal",
  },
  {
    title: "Seamless Pickup",
    description: "Coordinated pickups with clear timing, location, and zero confusion.",
    detail: "Pickup instructions and reminders keep both buyer and seller aligned.",
    Icon: PickupIcon,
    accent: "purple",
  },
];

function AccentBar(accent) {
  const map = {
    green: "bg-dy-green-strong",
    orange: "bg-dy-orange",
    teal: "bg-teal-500",
    purple: "bg-violet-500",
  };
  return map[accent];
}

function AccentText(accent) {
  const map = {
    green: "text-dy-green-strong",
    orange: "text-dy-orange",
    teal: "text-teal-600",
    purple: "text-violet-600",
  };
  return map[accent];
}

function AccentTint(accent) {
  const map = {
    green: "hover:bg-dy-green-strong/5",
    orange: "hover:bg-dy-orange/5",
    teal: "hover:bg-teal-500/5",
    purple: "hover:bg-violet-500/5",
  };
  return map[accent];
}

export default function BuyerPerksSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-dy-green-strong">
            The perks
          </p>

          <h2 className="mt-2 text-[29px] font-semibold tracking-tighter leading-[1.05] text-dy-forest sm:text-[35px]">
            Why buy on DropYard?
          </h2>

          <p className="mx-auto mt-3 text-[15px] text-slate-600 sm:whitespace-nowrap">
            Shop smarter, closer, and faster with neighbourhood finds that feel more personal than a typical marketplace.
          </p>
        </div>

        <div className="mt-10 divide-y divide-slate-200">
          {perks.map((perk, i) => {
            const Icon = perk.Icon;
            const isOpen = openIndex === i;

            return (
              <button
                key={perk.title}
                type="button"
                onClick={() => setOpenIndex(isOpen ? -1 : i)}
                className={`group relative flex w-full items-start gap-6 rounded-2xl px-4 py-8 text-left transition duration-300 ${AccentTint(perk.accent)} hover:scale-[1.01] hover:bg-slate-50/60 hover:shadow-[0_10px_25px_rgba(0,0,0,0.06)]`}
                aria-expanded={isOpen}
              >
                <div className={`absolute left-0 top-0 h-full w-[3px] ${AccentBar(perk.accent)} opacity-60 transition duration-300 group-hover:opacity-100`} />

                <div className="hidden w-10 items-center justify-center text-[11px] font-semibold text-slate-400 sm:flex">
                  {String(i + 1).padStart(2, "0")}
                </div>

                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 ${AccentText(perk.accent)} transition duration-300 group-hover:scale-105 group-hover:bg-white group-hover:shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1">
                  <h3 className="text-[17px] font-semibold text-dy-forest">
                    {perk.title}
                  </h3>
                  <p className="mt-2 max-w-md text-[13px] text-slate-600">
                    {perk.description}
                  </p>

                  <div className={`grid transition-all duration-300 ${isOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <p className="overflow-hidden rounded-xl bg-slate-50 px-4 py-3 text-[13px] leading-6 text-slate-600">
                      {perk.detail}
                    </p>
                  </div>
                </div>

                <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition duration-300 group-hover:bg-white ${isOpen ? "rotate-45" : ""}`}>
                  <PlusIcon className="h-4 w-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
