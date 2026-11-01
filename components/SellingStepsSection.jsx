"use client";

// Faithful copy of /preview/feedback/simple-steps-seller.jsx — do not modify
// in isolation. If the preview changes, mirror the change here.

import React, { useState } from "react";

function UploadIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V4M12 4l-4 4M12 4l4 4M4 20h16"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

function ChatIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12c0 4-4 7-9 7-1.5 0-3-.3-4.2-.8L3 20l1.2-3.6C3.4 15.2 3 13.7 3 12c0-4 4-7 9-7s9 3 9 7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12l4 4 10-10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function YardSaleCartIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 64 40" fill="none" aria-hidden="true">
      <g>
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0 20 32" to="360 20 32" dur="0.8s" repeatCount="indefinite" />
          <circle cx="20" cy="32" r="5" fill="#33802B" />
          <path d="M20 27v10M15 32h10" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        <g>
          <animateTransform attributeName="transform" type="rotate" from="0 46 32" to="360 46 32" dur="0.8s" repeatCount="indefinite" />
          <circle cx="46" cy="32" r="5" fill="#33802B" />
          <path d="M46 27v10M41 32h10" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </g>

      <g>
        <animateTransform attributeName="transform" type="rotate" values="0 32 20; -4 32 20; 0 32 20; 3 32 20; 0 32 20" dur="1.1s" repeatCount="indefinite" />
        <rect x="14" y="18" width="36" height="10" rx="3" fill="#33802B" />
        <path d="M14 18L10 10" stroke="#33802B" strokeWidth="3" strokeLinecap="round" />
        <rect x="18" y="10" width="10" height="8" rx="2" fill="#facc15" />
        <rect x="30" y="8" width="10" height="10" rx="2" fill="#facc15" opacity="0.95" />
        <rect x="42" y="12" width="8" height="6" rx="1.5" fill="#facc15" opacity="0.9" />
      </g>

      <path d="M2 14h8M0 22h10M4 30h7" stroke="#33802B" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

const steps = [
  {
    title: "List Your Items",
    description: "Create a listing in seconds. Add photos, price your item, and choose Drop or Shelf.",
    Icon: UploadIcon,
    accent: "orange",
  },
  {
    title: "Buyers Discover",
    description: "Your items appear to nearby buyers during Drops or anytime on the Shelf.",
    Icon: EyeIcon,
    accent: "green",
  },
  {
    title: "Handle Inquiries",
    description: "Chat with buyers, answer questions, and agree on the best offer.",
    Icon: ChatIcon,
    accent: "purple",
  },
  {
    title: "Confirm & Collect",
    description: "Confirm pickup, meet locally, and get paid — simple and secure.",
    Icon: CheckIcon,
    accent: "teal",
  },
];

function Accent(accent) {
  const map = {
    orange: "text-dy-orange bg-dy-orange/10",
    green: "text-dy-green-strong bg-dy-green-strong/10",
    purple: "text-violet-600 bg-violet-100",
    teal: "text-teal-600 bg-teal-100",
  };
  return map[accent] || map.green;
}

function ActiveAccent(accent) {
  const map = {
    orange: {
      border: "border-dy-orange",
      badge: "bg-dy-orange text-dy-forest",
      auraBorder: "border-dy-orange/40",
      glow: "shadow-[0_0_42px_rgba(255,148,18,0.18)]",
    },
    green: {
      border: "border-dy-green-strong",
      badge: "bg-dy-green-strong text-white",
      auraBorder: "border-dy-green-strong/40",
      glow: "shadow-[0_0_42px_rgba(47,138,34,0.18)]",
    },
    purple: {
      border: "border-violet-500",
      badge: "bg-violet-500 text-white",
      auraBorder: "border-violet-500/40",
      glow: "shadow-[0_0_42px_rgba(139,92,246,0.18)]",
    },
    teal: {
      border: "border-teal-500",
      badge: "bg-teal-500 text-white",
      auraBorder: "border-teal-500/40",
      glow: "shadow-[0_0_42px_rgba(20,184,166,0.18)]",
    },
  };
  return map[accent] || map.green;
}

export default function SellingStepsSection() {
  const [active, setActive] = useState(0);
  const progressWidth = `${((active + 1) / steps.length) * 100}%`;
  const cartPosition = `calc(${(active / (steps.length - 1)) * 100}% - 24px)`;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-[#f8faf9] px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-0 h-[300px] w-[300px] rounded-full bg-dy-green-strong/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 h-[300px] w-[300px] rounded-full bg-dy-orange/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-dy-orange">
            Simple steps
          </p>

          <h2 className="mt-2 text-[35px] font-semibold tracking-tighter leading-[1.05] text-dy-forest sm:text-[47px]">
            How selling works
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-[17px] text-slate-600">
            From listing to pickup, DropYard makes selling to your neighbours effortless.
          </p>
        </div>

        <div className="relative mt-10 hidden lg:block">
          <div className="relative h-[4px] overflow-visible rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-dy-orange via-dy-green-strong to-[#14b8a6] transition-all duration-700 ease-out"
              style={{ width: progressWidth }}
            />

            <div
              className="absolute top-1/2 z-10 -translate-y-1/2 transition-all duration-700 ease-out"
              style={{ left: cartPosition }}
            >
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_12px_30px_rgba(15,92,59,0.18)] ring-4 ring-white">
                <YardSaleCartIcon className="h-8 w-12 animate-[bounce_0.8s_ease-in-out_infinite]" />
                <span className="absolute -bottom-1 h-2 w-8 rounded-full bg-dy-forest/10 blur-sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-8 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.Icon;
            const isActive = index === active;
            const activeAccent = ActiveAccent(step.accent);

            return (
              <div
                key={step.title}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                tabIndex={0}
                className={`group relative cursor-pointer rounded-2xl border bg-white p-6 transition duration-500 outline-none focus-visible:ring-4 focus-visible:ring-dy-green-strong/15 ${
                  isActive
                    ? `${activeAccent.border} shadow-xl scale-[1.04]`
                    : "border-slate-200 shadow-sm hover:-translate-y-2 hover:shadow-lg"
                }`}
              >
                <div
                  className={`absolute -top-4 left-6 flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold shadow-sm transition ${
                    isActive ? activeAccent.badge : "border border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {index + 1}
                </div>

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${Accent(step.accent)} transition duration-300 ${
                    isActive ? "scale-110" : "group-hover:scale-110"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="mt-6 text-[17px] font-semibold text-dy-forest">{step.title}</h3>

                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{step.description}</p>

                {isActive && (
                  <div className="pointer-events-none absolute inset-0 rounded-2xl">
                    <div className={`absolute inset-0 rounded-2xl border-2 ${activeAccent.auraBorder} animate-pulse`} />
                    <div className={`absolute inset-0 rounded-2xl ${activeAccent.glow}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3A8E31] text-[17px] font-bold text-white shadow">
            ✓
          </div>
          <p className="text-[13px] text-slate-700">
            Claims, confirmations, and pickup reminders — all delivered to your WhatsApp
          </p>
        </div>
      </div>
    </section>
  );
}
