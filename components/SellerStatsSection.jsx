"use client";

// Faithful copy of /preview/feedback/trusted-locally-seller.jsx — do not
// modify in isolation. If the preview changes, mirror the change here.

import React from "react";

function TagIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 12 12 20 4 12V4h8l8 8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function MoneyBagIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 4h6l-1.5 3h-3L9 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path
        d="M7 10c1.3-2 3-3 5-3s3.7 1 5 3c2 3 2 8-5 8s-7-5-5-8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v6M14.5 12c0-1-1-1.5-2.3-1.5S10 11 10 12s1 1.4 2 1.5 2.5.5 2.5 1.5-1 1.5-2.4 1.5S9.8 16 9.8 15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TargetIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M17 7l3-3M19 4h-3M20 4v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const stats = [
  {
    value: "2,500+",
    label: "items sold",
    helper: "Local listings moving through Drops and The Shelf",
    Icon: TagIcon,
    tone: "orange",
    comingSoon: false,
  },
  {
    value: "$38K+",
    label: "earned by sellers",
    helper: "Neighbourhood value kept close to home",
    Icon: MoneyBagIcon,
    tone: "green",
    comingSoon: false,
  },
  {
    value: "< 2 min",
    label: "average listing time with AI",
    helper: "AI-assisted listing speed is planned as an upcoming enhancement.",
    Icon: ClockIcon,
    tone: "purple",
    comingSoon: true,
  },
  {
    value: "92%",
    label: "sell within first Drop",
    helper: "Strong demand from nearby buyers",
    Icon: TargetIcon,
    tone: "teal",
    comingSoon: false,
  },
];

function toneClasses(tone) {
  const map = {
    orange: {
      card: "from-[#fff6e8] to-white border-[#ffb020]/20 hover:border-[#ffb020]/45",
      icon: "text-[#d97706] bg-[#ffb020]/12 ring-[#ffb020]/12",
      glow: "bg-[#ffb020]/18",
      badge: "border-[#ffb020]/35 bg-[#ffb020]/12 text-[#b76a00]",
    },
    green: {
      card: "from-[#ecf8f1] to-white border-dy-green-strong/18 hover:border-dy-green-strong/40",
      icon: "text-dy-green-strong bg-dy-green-strong/10 ring-dy-green-strong/12",
      glow: "bg-dy-green-strong/14",
      badge: "border-dy-green-strong/30 bg-dy-green-strong/10 text-dy-green-strong",
    },
    purple: {
      card: "from-[#f2edff] to-white border-violet-400/18 hover:border-violet-400/40",
      icon: "text-violet-600 bg-violet-500/10 ring-violet-500/12",
      glow: "bg-violet-500/14",
      badge: "border-violet-300/40 bg-violet-500/10 text-violet-700",
    },
    teal: {
      card: "from-[#ebfbf7] to-white border-teal-400/18 hover:border-teal-400/40",
      icon: "text-teal-600 bg-teal-500/10 ring-teal-500/12",
      glow: "bg-teal-500/14",
      badge: "border-teal-300/40 bg-teal-500/10 text-teal-700",
    },
  };

  return map[tone] || map.green;
}

function StatCard({ stat }) {
  const Icon = stat.Icon;
  const tone = toneClasses(stat.tone);

  return (
    <article
      style={{ transformStyle: 'preserve-3d' }}
      className={`group relative overflow-hidden rounded-[1.75rem] border bg-gradient-to-b ${tone.card} p-6 text-center shadow-[0_10px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-700 hover:-translate-y-3 hover:scale-[1.015] hover:shadow-[0_40px_100px_rgba(15,23,42,0.14)]`}
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full ${tone.glow} blur-2xl transition duration-700 group-hover:scale-150 group-hover:opacity-90`}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.75),transparent_55%)] opacity-80" />

      <div
        className={`relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ring-8 ${tone.icon} transition duration-500 group-hover:scale-110 group-hover:rotate-[-6deg] group-hover:-translate-y-1`}
      >
        <Icon className="h-7 w-7" />
      </div>

      <div className="relative mt-7 bg-gradient-to-br from-dy-forest to-slate-500 bg-clip-text text-[33px] font-semibold tracking-tighter text-transparent sm:text-[45px]">
        {stat.value}
      </div>

      <div className="relative mt-2 flex flex-col items-center gap-2">
        <p className="text-[13px] font-semibold text-slate-600">{stat.label}</p>
        {stat.comingSoon && (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] backdrop-blur-sm ${tone.badge}`}
          >
            Coming Soon
          </span>
        )}
      </div>

      <p className="relative mx-auto mt-4 max-w-[13rem] text-[13px] leading-5 text-slate-500 transition-all duration-300 line-clamp-2 opacity-80 group-hover:line-clamp-none group-hover:opacity-100">
        {stat.helper}
      </p>
    </article>
  );
}

export default function SellerStatsSection() {
  return (
    <section className="relative overflow-hidden bg-[#fffdf8] px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-8rem] h-96 w-96 rounded-full bg-[#ffb020]/10 blur-3xl" />
        <div className="absolute right-[-8rem] top-[-8rem] h-96 w-96 rounded-full bg-dy-green-strong/8 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/2 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-teal-400/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-0 py-4 sm:px-0 lg:px-0">
        <div className="pointer-events-none absolute inset-x-[-100vw] inset-y-0 bg-gradient-to-br from-[#ffb020]/8 via-transparent to-dy-green-strong/8" />

        <div className="relative text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dy-green-strong">Built for neighbourhood commerce</p>

          <h2 className="mx-auto mt-2 max-w-4xl text-[23px] font-semibold tracking-tighter leading-[1.05] text-dy-forest sm:text-[47px]">
            Sellers are thriving
          </h2>

          <p className="mx-auto mt-3 text-[15px] leading-7 text-slate-600 sm:whitespace-nowrap">
            Real traction from local sellers transforming unused household items into premium neighbourhood commerce experiences.
          </p>
        </div>

        <div className="relative mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
