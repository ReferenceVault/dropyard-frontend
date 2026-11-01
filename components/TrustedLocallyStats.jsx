"use client";

import React, { useEffect, useRef, useState } from "react";

// ICONS (semantic)
function ListIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" />
      <circle cx="4" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
}

function MapIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function DollarIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 7c0-2-2-3-4-3s-4 1-4 3 2 3 4 3 4 1 4 3-2 3-4 3-4-1-4-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function useCountUp(target, shouldStart, duration = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;

    let start = 0;
    const increment = target / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target, duration, shouldStart]);

  return count;
}

const stats = [
  { value: 2500, suffix: "+",   label: "items listed",       accent: "green",  Icon: ListIcon },
  { value: 25,   prefix: "15–", label: "neighbourhoods",     accent: "mint",   Icon: MapIcon },
  { value: 45,   prefix: "$", suffix: "K+", label: "saved by buyers",   accent: "orange", Icon: DollarIcon },
  { value: 98,   suffix: "%",   label: "successful pickups", accent: "purple", Icon: CheckIcon },
];

function accentStyles(accent) {
  const map = {
    green:  "text-dy-green-strong ring-dy-green-strong/20 shadow-[0_10px_30px_rgba(47,138,34,0.15)]",
    mint:   "text-emerald-600 ring-emerald-400/20 shadow-[0_10px_30px_rgba(16,185,129,0.15)]",
    orange: "text-dy-orange ring-dy-orange/20 shadow-[0_10px_30px_rgba(255,148,18,0.2)]",
    purple: "text-violet-600 ring-violet-400/20 shadow-[0_10px_30px_rgba(139,92,246,0.2)]",
  };
  return map[accent] || map.green;
}

function StatCard({ stat, shouldStart }) {
  const count = useCountUp(stat.value, shouldStart);
  const Icon = stat.Icon;

  return (
    <div className="group relative rounded-3xl bg-white p-6 border border-slate-200 transition duration-300 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
      <div className={`mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ring-8 transition group-hover:scale-110 ${accentStyles(stat.accent)}`}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="text-[27px] sm:text-[33px] font-semibold text-dy-forest tracking-tighter">
        {stat.prefix || ""}
        {count.toLocaleString()}
        {stat.suffix || ""}
      </div>

      <p className="mt-1.5 text-[12px] text-slate-500">{stat.label}</p>
    </div>
  );
}

export default function TrustedLocallyStats() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="bg-dy-pale py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto text-center">
        <p className="text-[11px] font-bold tracking-[0.18em] text-dy-green-strong uppercase">
          Trusted locally
        </p>

        <h2 className="mt-2 text-[33px] sm:text-[45px] font-semibold tracking-tighter leading-[1.05] text-dy-forest">
          DropYard by the numbers
        </h2>

        <p className="mt-3 text-[15px] text-slate-600 mx-auto sm:whitespace-nowrap">
          Real traction from real neighbourhoods — proving local buying can be simple, affordable, and reliable.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} shouldStart={isVisible} />
          ))}
        </div>
      </div>
    </section>
  );
}
