"use client";

// Faithful copy of /preview/feedback/a-different-marketplace.jsx — do not
// modify in isolation. If the preview changes, mirror the change here.

import React from "react";

const oldWay = [
  "Endless ‘is this still available?’ messages",
  "No-shows, last-minute lowballs, and vague meetups",
  "Sketchy strangers and parking-lot handoffs",
  "Scrolling through scams and city-wide noise",
  "Listings stay live forever with no real closure",
];

const dropyardWay = [
  "Claims are binding — one buyer per item, one pickup window",
  "Verified neighbourhood drops with less noise",
  "Porch pickups in daylight, close to where you live",
  "One curated feed: The Drop on weekends, The Shelf in between",
  "Drops end cleanly — Sunday closes the loop",
];

function CheckIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIconBold({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 20.5 6.2v5.9c0 5.2-3.6 9.5-8.5 10.9-4.9-1.4-8.5-5.7-8.5-10.9V6.2L12 2Zm3.9 7.5-5 5-2.4-2.4-1.7 1.7 4.1 4.1 6.7-6.7-1.7-1.7Z" />
    </svg>
  );
}

function ClockIconBold({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" />
      <path d="M12 12V7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 12L16 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function PinIconBold({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.25A7.75 7.75 0 0 0 4.25 10c0 5.95 7.75 12.25 7.75 12.25S19.75 15.95 19.75 10A7.75 7.75 0 0 0 12 2.25Zm0 10.5A2.75 2.75 0 1 1 12 7.25a2.75 2.75 0 0 1 0 5.5Z" />
    </svg>
  );
}

const proofCards = [
  {
    icon: ShieldIconBold,
    title: "Verified",
    body: "Neighbourhood-first drops with trust signals built into the flow.",
  },
  {
    icon: ClockIconBold,
    title: "Timed",
    body: "Every Drop has a clear window, deadline, and clean finish.",
  },
  {
    icon: PinIconBold,
    title: "Nearby",
    body: "Local pickup experiences designed around the places people live.",
  },
];

export default function DifferentMarketplaceSection() {
  return (
    <section className="relative overflow-hidden bg-[#f6fff7] px-4 py-6 text-slate-950 sm:px-6 lg:px-8 lg:py-10">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(47,138,34,0.16),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(255,148,18,0.20),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f2fbef_48%,#fff8ed_100%)]" />
        <div className="absolute left-1/2 top-0 h-px w-[76rem] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#2f8a22]/25 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2f8a22]/15 bg-white/80 px-4 py-2 shadow-sm backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-[#ff9412] shadow-[0_0_0_5px_rgba(255,148,18,0.14)]" />
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2f8a22]">
                A different kind of marketplace
              </span>
            </div>

            <h2 className="max-w-3xl text-[29px] font-semibold tracking-tighter leading-[1.1] text-[#0b2f20] sm:text-[35px] lg:text-[47px]">
              Built around the parts of resale people actually hate.
            </h2>

            <p className="mt-6 max-w-xl text-[15px] leading-8 text-slate-700 sm:text-[17px]">
              DropYard turns local resale into scheduled, neighbourhood-based Drops — fewer random messages, fewer awkward meetups, and a cleaner path from listed to claimed.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {/* Was "Explore Drops" pointing at /for-buyers — a different verb
                  for the same action the rest of the page calls "Browse", and
                  it opened the marketing page rather than the Drop it names.
                  Matches the landing page's wording and destination now. */}
              <a
                href="/buyer"
                className="group inline-flex items-center justify-center rounded-full bg-[#ff9412] px-6 py-3.5 text-[13px] font-extrabold text-white shadow-[0_18px_36px_rgba(255,148,18,0.25)] transition duration-300 hover:-translate-y-1 hover:bg-[#ff8500] hover:shadow-[0_22px_46px_rgba(255,148,18,0.32)]"
              >
                Browse the Barrhaven Drop
                <ArrowIcon className="ml-2 h-4 w-4 transition duration-300 group-hover:translate-x-1" />
              </a>
              <a
                href="/how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-[#2f8a22]/18 bg-white/80 px-6 py-3.5 text-[13px] font-extrabold text-[#0b2f20] shadow-sm backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#2f8a22]/35 hover:bg-white"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {proofCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="group relative overflow-hidden rounded-[2rem] border border-[#2f8a22]/12 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,92,59,0.10)] backdrop-blur-xl transition duration-300 hover:-translate-y-2 hover:shadow-[0_26px_76px_rgba(15,92,59,0.16)]"
                >
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#ff9412]/12 transition duration-300 group-hover:scale-125" />
                  <div className="relative mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f5c3b] text-white shadow-[0_16px_32px_rgba(15,92,59,0.22)] ring-8 ring-[#0f5c3b]/8 transition duration-300 group-hover:rotate-[-3deg] group-hover:scale-105">
                    <Icon className="h-9 w-9" />
                  </div>
                  <div className="relative text-[23px] font-black tracking-tight text-[#0b2f20]">{card.title}</div>
                  <p className="relative mt-2 text-[13px] leading-6 text-slate-600">{card.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-14 overflow-hidden rounded-[2.25rem] border border-[#2f8a22]/12 bg-white/80 shadow-[0_28px_90px_rgba(15,92,59,0.12)] backdrop-blur-2xl">
          <div className="grid lg:grid-cols-2">
            <div className="border-b border-slate-200/80 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">The old way</p>
                  <h3 className="mt-2 text-[23px] font-black text-slate-950">Marketplace friction</h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <XIcon className="h-6 w-6" />
                </div>
              </div>

              <div className="space-y-3">
                {oldWay.map((item) => (
                  <div key={item} className="group flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500 transition duration-300 group-hover:bg-slate-300">
                      <XIcon className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-[13px] leading-6 text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden p-6 sm:p-8 lg:p-10">
              <div className="absolute inset-0 bg-gradient-to-br from-[#fff3df] via-white to-[#effbeb]" />
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#ff9412]/14 blur-3xl" />
              <div className="relative">
                <div className="mb-8">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff9412]">The DropYard way</p>
                  <h3 className="mt-2 text-[23px] font-black text-[#0b2f20]">Designed for clean claims</h3>
                </div>

                <div className="space-y-3">
                  {dropyardWay.map((item) => (
                    <div key={item} className="group flex gap-4 rounded-2xl border border-[#2f8a22]/10 bg-white/78 p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#ff9412]/22 hover:bg-white hover:shadow-[0_16px_40px_rgba(15,92,59,0.10)]">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ff9412] text-white shadow-[0_8px_18px_rgba(255,148,18,0.22)] transition duration-300 group-hover:scale-110">
                        <CheckIcon className="h-3.5 w-3.5" />
                      </span>
                      <p className="text-[13px] font-semibold leading-6 text-[#0b2f20]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
