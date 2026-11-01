"use client";

import React from "react";

function SearchIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 8c0-2.5-2-4-4-4-1.5 0-3 1-4 2-1-1-2.5-2-4-2C6 4 4 5.5 4 8c0 4 8 10 8 10s8-6 8-10Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function TagIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 12l-8 8-8-8V4h8l8 8Z" stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}

function PinIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="10" r="2" fill="currentColor" />
    </svg>
  );
}

// Static accent-class lookups — kept as full literal class strings so Tailwind's
// JIT picks them up at build time. Don't refactor into template strings.
const ACCENT_BORDER = {
  green:  "from-dy-green-strong/35 via-[#3A8E31]/70 to-dy-green-strong",
  orange: "from-dy-orange/35 via-[#f97316]/70 to-dy-orange",
  teal:   "from-teal-400/35 via-teal-400/70 to-teal-500",
  purple: "from-violet-400/35 via-violet-400/70 to-violet-500",
};
const ACCENT_HOVER_ICON = {
  green:  "group-hover:text-dy-green-strong",
  orange: "group-hover:text-dy-orange",
  teal:   "group-hover:text-teal-600",
  purple: "group-hover:text-violet-600",
};

const steps = [
  { number: "01", title: "Browse",          description: "Explore items in your neighbourhood across Drops and The Shelf.",                  Icon: SearchIcon, accent: "green"  },
  { number: "02", title: "Save & Ask",      description: "Save items and message sellers instantly. No waiting, no friction.",               Icon: HeartIcon,  accent: "orange" },
  { number: "03", title: "Claim or Offer",  description: "Claim instantly or make an offer. Everything is structured and fair.",             Icon: TagIcon,    accent: "teal"   },
  { number: "04", title: "Pick Up Locally", description: "Choose a time, get the address, and meet your neighbour nearby.",                  Icon: PinIcon,    accent: "purple" },
];

export default function BuyingStepsSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-dy-pale to-white px-4 py-12 sm:px-6 lg:px-8">
      <style>{`
        @keyframes dropyardBorderFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes dropyardConnectorFlow {
          0% { transform: translateX(-100%); opacity: 0; }
          18% { opacity: 1; }
          82% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dy-animated-border, .dy-connector-light { animation: none !important; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-[400px] w-[400px] rounded-full bg-dy-green-strong/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-dy-orange/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-dy-green-strong">
          Simple steps
        </p>

        <h2 className="mt-2 text-[29px] font-semibold tracking-tighter leading-[1.05] text-dy-forest sm:text-[35px]">
          How buying works
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-[17px] text-slate-600">
          From discovery to pickup, DropYard keeps buying local simple, fast, and frictionless.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = step.Icon;
            return (
              <div key={step.number} className="group relative text-left">
                {i !== steps.length - 1 && (
                  <div className="hidden lg:block absolute left-full top-12 h-[2px] w-[80%] overflow-hidden rounded-full bg-gradient-to-r from-slate-300 via-slate-200 to-transparent">
                    <div
                      className="dy-connector-light absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white to-transparent"
                      style={{ animation: "dropyardConnectorFlow 2.8s ease-in-out infinite", animationDelay: `${i * 180}ms` }}
                    />
                  </div>
                )}

                <div
                  className={`dy-animated-border relative rounded-3xl bg-gradient-to-br ${ACCENT_BORDER[step.accent]} p-[1.5px] opacity-75 transition duration-500 group-hover:opacity-100 group-hover:shadow-[0_20px_55px_rgba(15,92,59,0.12)]`}
                  style={{ backgroundSize: "220% 220%", animation: "dropyardBorderFlow 5.5s ease infinite" }}
                >
                  <div className="relative overflow-visible rounded-3xl bg-white/95 pt-10 p-8 backdrop-blur transition duration-500 group-hover:-translate-y-3 group-hover:shadow-[0_30px_80px_rgba(0,0,0,0.12)]">
                    <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 transition duration-700 group-hover:translate-x-full group-hover:opacity-100" />

                    <div className="absolute -top-5 left-6 rounded-full bg-dy-forest px-3 py-1.5 text-[11px] font-bold text-white shadow-md">
                      {step.number}
                    </div>

                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 transition duration-500 group-hover:scale-110 group-hover:bg-white group-hover:shadow-sm">
                      <Icon className={`h-5 w-5 text-dy-forest transition duration-500 ${ACCENT_HOVER_ICON[step.accent]}`} />
                    </div>

                    <h3 className="text-[17px] font-semibold tracking-tight text-dy-forest">
                      {step.title}
                    </h3>

                    <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-center">
          <div className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white/90 px-6 py-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-[13px] font-bold text-white shadow">
              W
            </div>

            <p className="max-w-md text-left text-[13px] text-slate-700">
              Pickup details, reminders, and confirmations — all delivered to your
              <span className="font-semibold text-[#25D366]"> WhatsApp</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
