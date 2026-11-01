"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const EFFECTIVE_DATE = "May 27, 2026";
const LAST_UPDATED = "May 27, 2026";

const sections = [
  { num: "1",  title: "What DropYard is" },
  { num: "2",  title: "The four promises" },
  { num: "3",  title: "What you can list" },
  { num: "4",  title: "What you can't list" },
  { num: "5",  title: "Listing well" },
  { num: "6",  title: "Pickup etiquette" },
  { num: "7",  title: "How you talk to each other" },
  { num: "8",  title: "Money & payments" },
  { num: "9",  title: "When things go wrong" },
  { num: "10", title: "Reporting" },
  { num: "11", title: "Consequences" },
  { num: "12", title: "Account basics" },
  { num: "13", title: "Changes to these Guidelines" },
  { num: "14", title: "A final note" },
];

const Icon = {
  Heart: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Handshake: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M11 17l-5-5 4-4 3 3 4-4 5 5-4 4-3-3-4 4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Box: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M3 8l9 5 9-5M12 13v8" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Ban: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M5.6 5.6l12.8 12.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Edit: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M11 4H5a2 2 0 00-2 2v13a2 2 0 002 2h13a2 2 0 002-2v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Truck: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="6" cy="19" r="2" stroke="currentColor" strokeWidth="2"/><circle cx="18" cy="19" r="2" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Chat: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M21 12a8 8 0 11-3.2-6.4L21 4l-1.4 3.4A8 8 0 0121 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Dollar: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M16 7c0-2-2-3-4-3s-4 1-4 3 2 3 4 3 4 1 4 3-2 3-4 3-4-1-4-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Alert: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M10.3 3.86l-8.4 14a2 2 0 001.7 3h16.8a2 2 0 001.7-3l-8.4-14a2 2 0 00-3.4 0z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Flag: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 21V4M4 4h14l-3 5 3 5H4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></svg>
  ),
  Gavel: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M14 13l-7 7-3-3 7-7M5 7l5-5 8 8-5 5zM15 13l5 5M3 21h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  User: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Refresh: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  Sparkle: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5zM19 14l1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1L19 14z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Camera: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 7h4l2-3h6l2 3h4v13H3V7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Check: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
  ),
  X: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
  ),
  Phone: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.72 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Mail: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
};

const sectionMeta: Record<
  string,
  { Icon: any; accent: "green" | "amber" | "violet" | "rose" | "sky" }
> = {
  "1":  { Icon: Icon.Heart,     accent: "rose" },
  "2":  { Icon: Icon.Handshake, accent: "green" },
  "3":  { Icon: Icon.Box,       accent: "amber" },
  "4":  { Icon: Icon.Ban,       accent: "rose" },
  "5":  { Icon: Icon.Edit,      accent: "violet" },
  "6":  { Icon: Icon.Truck,     accent: "sky" },
  "7":  { Icon: Icon.Chat,      accent: "amber" },
  "8":  { Icon: Icon.Dollar,    accent: "green" },
  "9":  { Icon: Icon.Alert,     accent: "rose" },
  "10": { Icon: Icon.Flag,      accent: "amber" },
  "11": { Icon: Icon.Gavel,     accent: "violet" },
  "12": { Icon: Icon.User,      accent: "sky" },
  "13": { Icon: Icon.Refresh,   accent: "amber" },
  "14": { Icon: Icon.Sparkle,   accent: "green" },
};

const accentClasses: Record<string, { bg: string; text: string; ring: string; dot: string; border: string }> = {
  green:  { bg: "bg-emerald-50",  text: "text-emerald-700",  ring: "ring-emerald-200",  dot: "bg-emerald-500", border: "border-emerald-200" },
  amber:  { bg: "bg-amber-50",    text: "text-amber-700",    ring: "ring-amber-200",    dot: "bg-amber-500",   border: "border-amber-200" },
  violet: { bg: "bg-violet-50",   text: "text-violet-700",   ring: "ring-violet-200",   dot: "bg-violet-500",  border: "border-violet-200" },
  rose:   { bg: "bg-rose-50",     text: "text-rose-700",     ring: "ring-rose-200",     dot: "bg-rose-500",    border: "border-rose-200" },
  sky:    { bg: "bg-sky-50",      text: "text-sky-700",      ring: "ring-sky-200",      dot: "bg-sky-500",     border: "border-sky-200" },
};

export default function CommunityGuidelinesPage() {
  const [activeId, setActiveId] = useState("section-1");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveId(e.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    sections.forEach((s) => {
      const el = document.getElementById(`section-${s.num}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-dy-pale">
      {/* progress */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-dy-green-strong via-[#3A8E31] to-dy-orange transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-br from-dy-forest via-dy-mid to-dy-green-strong px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-300/25 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/3 right-10 h-40 w-40 rounded-full bg-emerald-200/15 blur-2xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100 backdrop-blur ring-1 ring-white/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            How we treat each other
          </div>

          <h1 className="mt-6 text-[35px] font-semibold tracking-tight text-white sm:text-[47px] lg:text-[59px]">
            Community{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-amber-300 to-amber-200 bg-clip-text text-transparent">
                Guidelines
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-3 rounded bg-amber-400/20 blur-lg" />
            </span>
          </h1>

          <p className="mt-6 text-[17px] leading-relaxed text-emerald-100/95 sm:text-[19px] max-w-2xl mx-auto">
            DropYard is your neighbourhood yard sale — online. Here&apos;s how we
            keep it <strong className="text-white">warm, honest, and safe</strong>.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-emerald-100 backdrop-blur ring-1 ring-white/20">
              <Icon.Sparkle className="h-3.5 w-3.5" />
              Effective date: <span className="font-bold text-white">{EFFECTIVE_DATE}</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-emerald-100 backdrop-blur ring-1 ring-white/20">
              <Icon.Refresh className="h-3.5 w-3.5" />
              Last updated: <span className="font-bold text-white">{LAST_UPDATED}</span>
            </span>
          </div>
        </div>

        <svg
          className="absolute bottom-0 left-0 right-0 w-full text-dy-pale"
          viewBox="0 0 1440 60"
          fill="currentColor"
          preserveAspectRatio="none"
        >
          <path d="M0 30 Q360 60 720 30 T1440 30 V60 H0 Z" />
        </svg>
      </section>

      {/* FOUR PROMISES FLOATING BAR */}
      <section className="px-4 mt-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-6xl grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <PromiseChip n="1" label="Be honest" />
          <PromiseChip n="2" label="Show up" />
          <PromiseChip n="3" label="Be kind" />
          <PromiseChip n="4" label="Keep it safe" />
        </div>
      </section>

      {/* BODY */}
      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
          {/* TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-dy-green-strong mb-4">
                On this page
              </p>
              <nav className="flex flex-col gap-1 border-l border-slate-200 pl-4">
                {sections.map((s) => {
                  const active = activeId === `section-${s.num}`;
                  return (
                    <a
                      key={s.num}
                      href={`#section-${s.num}`}
                      className={`group relative -ml-[17px] flex items-center gap-3 rounded-r-lg py-1.5 pl-4 pr-2 text-[13px] transition-all ${
                        active
                          ? "border-l-2 border-dy-green-strong bg-emerald-50/60 font-semibold text-dy-forest"
                          : "border-l-2 border-transparent text-slate-500 hover:text-dy-forest hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`text-[9px] font-black ${
                          active ? "text-dy-green-strong" : "text-slate-400"
                        }`}
                      >
                        {s.num.padStart(2, "0")}
                      </span>
                      <span className="truncate">{s.title}</span>
                    </a>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* CONTENT */}
          <div className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.05)] sm:p-10 lg:p-14">
            {/* Section 1 */}
            <Section num="1" title="What DropYard is, and what it isn't">
              <p>
                <DropCap>D</DropCap>ropYard is your{" "}
                <strong>neighbourhood yard sale, online</strong>. It runs the same
                way a Saturday-morning garage sale does — neighbours putting things
                they no longer need out for other neighbours to pick up, with a
                friendly chat and a quick handoff at the door. We&apos;ve just made
                it easier to find each other, agree on a price, and pick a time that
                works.
              </p>
              <p className="mt-4">
                DropYard is <strong>not</strong> a shipping marketplace, a
                courier-fulfilled platform, or an anonymous classifieds board. Every
                transaction ends with two real neighbours, in the same community,
                meeting briefly to pass an item from one home to another. Money
                changes hands directly between buyer and seller, in person.
              </p>
              <Callout tone="green">
                These Guidelines exist so that exchange stays warm, honest, and
                safe. By using DropYard, you agree to follow them.
              </Callout>
            </Section>

            {/* Section 2 */}
            <Section num="2" title="The four promises every DropYard user makes">
              <p>When you sign up, you&apos;re promising your neighbours that you&apos;ll:</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <PromiseCard
                  n="1"
                  title="Be honest"
                  desc="About what you list, what condition it's in, and what you're willing to pay."
                />
                <PromiseCard
                  n="2"
                  title="Show up"
                  desc="When you say you will — and let people know promptly if plans change."
                />
                <PromiseCard
                  n="3"
                  title="Treat neighbours well"
                  desc="Politely, patiently, and without harassment."
                />
                <PromiseCard
                  n="4"
                  title="Keep the community safe"
                  desc="By following the rules below and reporting problems when you see them."
                />
              </div>
              <p className="mt-5 text-[13px] text-slate-600">
                Most issues we see come down to one of these four. If you keep them
                in mind, you&apos;ll rarely have a problem.
              </p>
            </Section>

            {/* Section 3 */}
            <Section num="3" title="What you can list">
              <p>
                DropYard is built for the everyday objects that pile up in a
                Canadian home: furniture, kitchenware, kids&apos; gear and toys,
                tools, electronics that still work, books, sports equipment,
                clothing in good condition, holiday decor, garden tools, small
                appliances, hobby supplies, and so on.
              </p>
              <Callout tone="green">
                If your grandmother would be happy to see it picked up by a
                neighbour and used again, it probably belongs on DropYard.
              </Callout>
              <h4 className="mt-6 text-[15px] font-bold text-dy-forest">
                Listings must be:
              </h4>
              <CheckList
                items={[
                  "Owned by you and yours to sell",
                  "Accurately described — title, condition, dimensions, and any flaws",
                  "Photographed honestly — real photos of the actual item, taken by you, showing its current state (no stock images, no manufacturer photos, no images borrowed from another listing)",
                  "Priced clearly — one price, with the payment methods you accept",
                  "Located in Barrhaven for pickup",
                ]}
              />
            </Section>

            {/* Section 4 */}
            <Section num="4" title="What you can't list">
              <p>
                Some items are unsafe, illegal to resell in Ontario, or simply out
                of scope for a neighbour-to-neighbour pickup community. The
                following are <strong>not allowed</strong> on DropYard:
              </p>

              <ProhibitedGroup
                accent="rose"
                title="Illegal or restricted by law"
                items={[
                  "Firearms, ammunition, weapons of any kind (including replicas, BB guns, crossbows, martial-arts weapons)",
                  "Illegal drugs and drug paraphernalia",
                  "Prescription or over-the-counter medications",
                  "Alcohol (Ontario private alcohol resale is restricted by AGCO licensing)",
                  "Cannabis and cannabis accessories (Ontario resale restricted to OCS-licensed retailers)",
                  "Tobacco, vapes, and e-cigarette products",
                  "Stolen goods or anything you can't prove is yours to sell",
                  "Counterfeit goods or knock-offs of branded items",
                  "Government-issued documents — passports, driver's licences, health cards, etc.",
                  "Live animals, animal parts, or anything derived from endangered species",
                  "Human remains, ashes, or body fluids",
                ]}
              />

              <ProhibitedGroup
                accent="amber"
                title="Recalled or unsafe to resell"
                items={[
                  "Items on the Health Canada recall list",
                  "Used car seats and booster seats (expiry, crash history, recalls can't be verified neighbour-to-neighbour)",
                  "Used cribs, bassinets, and playpens manufactured before 2016 (current Canadian safety standards date from then)",
                  "Used helmets of any kind (bike, hockey, ski, motorcycle) — single-impact safety items",
                  "Used mattresses and box springs without a sanitization certificate (provincial health regulations)",
                  "Asbestos, lead paint, or items known to contain them",
                  "Hazardous materials — gasoline, propane tanks over 1 lb, fireworks, fertilizers, pool chemicals, automotive fluids, paints and solvents in unsealed containers",
                ]}
              />

              <ProhibitedGroup
                accent="violet"
                title="Out of scope for DropYard"
                items={[
                  "Food, beverages, or anything consumable",
                  "Vehicles requiring ownership transfer (cars, motorcycles, boats, ATVs). Bicycles, e-bikes, scooters are fine.",
                  "Real estate, rentals, or services of any kind — DropYard is for physical goods only",
                  "Pets or any live animals",
                  "Adult or sexually explicit content of any kind",
                  "Cryptocurrencies, gift cards, or anything resembling a financial instrument",
                  "Items that can only be delivered or shipped — every DropYard pickup is in person",
                ]}
              />

              <Callout tone="green">
                If you&apos;re unsure whether something is allowed, list it anyway
                with a clear description and we&apos;ll let you know. We&apos;d
                rather have you ask than guess.
              </Callout>
            </Section>

            {/* Section 5 */}
            <Section num="5" title="Listing well">
              <p>
                Good listings are the foundation of a good DropYard. A few small
                habits make a big difference:
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <TipCard
                  icon={<Icon.Camera className="h-4 w-4" />}
                  title="Take honest photos"
                  desc="Daytime light, the actual item, scratches and stains included. A truthful photo with a minor flaw will sell faster than a 'perfect' listing that disappoints on pickup."
                />
                <TipCard
                  icon={<Icon.Edit className="h-4 w-4" />}
                  title="Write a real description"
                  desc="Brand, dimensions, age if you remember, and any quirks. 'Drawer sticks a bit but works' is a feature, not a problem."
                />
                <TipCard
                  icon={<Icon.Dollar className="h-4 w-4" />}
                  title="Set a fair price"
                  desc="You can always lower it; you can rarely raise it without losing the buyer's trust."
                />
                <TipCard
                  icon={<Icon.Truck className="h-4 w-4" />}
                  title="Be clear about pickup"
                  desc="Pickup window, payment methods you accept, where to find your house."
                />
              </div>
              <p className="mt-5">
                Update or remove sold items so neighbours aren&apos;t messaging you
                about something that&apos;s already gone.
              </p>
            </Section>

            {/* Section 6 */}
            <Section num="6" title="Pickup etiquette">
              <p>
                The pickup is where DropYard either feels great or doesn&apos;t.
                Most of these are common courtesy:
              </p>
              <CheckList
                items={[
                  "Confirm before you come — a quick 'I'm 10 minutes away' message saves everyone awkwardness",
                  "Show up on time — if you're late or can't make it, tell the other person as early as you can",
                  "Daytime pickups are encouraged — safer and easier for everyone",
                  "Default is porch or driveway pickup — no one is obligated to invite anyone inside their home, and no one should ask. If the item needs help carrying out, agree on that in advance.",
                  "Bring a friend if you'd like — especially for larger items, or if you simply prefer the company",
                  "Have payment ready — cash counted out, e-Transfer pre-loaded, or whatever method you agreed on",
                  "Inspect before you pay — look the item over while the seller is right there. It's much harder to resolve issues after you've left.",
                ]}
              />
              <Callout tone="amber">
                <strong>No-shows aren&apos;t ok — and they won&apos;t hold up your
                listing.</strong> If a buyer claims your item but doesn&apos;t show,
                you can re-list it right away. DropYard also automatically re-lists
                abandoned claims after <strong>2 hours</strong>, so your item is
                back in front of other buyers quickly. You can also report the
                buyer who no-showed.
              </Callout>
            </Section>

            {/* Section 7 */}
            <Section num="7" title="How you talk to each other">
              <p>Keep it human:</p>
              <CheckList
                items={[
                  "Be polite, even when negotiating or saying no",
                  "Don't spam, harass, or pressure the other person",
                  "No discrimination — race, religion, gender, sexual orientation, disability, age, or anything else. Don't refuse to deal with someone based on who they are.",
                  "Don't move communication off-platform for reasons that aren't about coordinating the pickup. The opt-in WhatsApp channel is for confirming pickup details, not for asking personal questions or pushing other services.",
                  "Don't share contact info beyond what's needed — no phone numbers in listings, no social media handles, no asking for someone's full address until pickup is confirmed",
                  "Don't try to buy or sell off-platform to avoid these Guidelines. If a deal happens because of a DropYard listing, the listing is subject to these Guidelines.",
                ]}
              />
            </Section>

            {/* Section 8 */}
            <Section num="8" title="Money and payments — and what DropYard isn't doing">
              <p>
                This part matters because it&apos;s different from larger
                marketplaces.
              </p>
              <Callout tone="amber">
                <strong>DropYard does not process payments.</strong> No money flows
                through our platform. The buyer pays the seller directly at pickup,
                using <strong>cash</strong> or <strong>Interac e-Transfer</strong> —
                the two payment methods DropYard supports.
              </Callout>
              <p className="mt-5">That means:</p>
              <CheckList
                items={[
                  "DropYard never holds your money, so we can't issue refunds. If there's a problem with the item or the transaction, you and your neighbour resolve it directly — and DropYard can help mediate (see 'When things go wrong' below).",
                  "Inspect before you pay. Once you've handed over cash or sent an e-Transfer, that money is gone unless your neighbour chooses to send it back.",
                  "Be careful with e-Transfer — confirm the recipient's email or phone number before sending. Use a security question only the two of you would know.",
                ]}
              />
              <div className="mt-6 rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                    <Icon.Alert className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-black uppercase tracking-wider text-rose-700">
                      Scam warning
                    </h4>
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-700">
                      DropYard will <strong>never</strong> ask you to pay us, send
                      us payment information, or transfer money to a &ldquo;DropYard
                      account.&rdquo; Anyone claiming to be DropYard asking for
                      money is impersonating us. <strong>Report them.</strong>
                    </p>
                  </div>
                </div>
              </div>
            </Section>

            {/* Section 9 */}
            <Section num="9" title="When things go wrong">
              <p>Most problems are honest miscommunications. Try this order:</p>
              <ol className="mt-5 space-y-3">
                <StepItem n={1} title="Talk to your neighbour first">
                  A message asking what happened often resolves things in one round.
                </StepItem>
                <StepItem n={2} title="Report it to DropYard">
                  If direct resolution doesn&apos;t work. Use the in-app Report
                  button on the listing or message, or email{" "}
                  <a
                    href="mailto:info@dropyard.app"
                    className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
                  >
                    info@dropyard.app
                  </a>{" "}
                  with as much detail as you can.
                </StepItem>
                <StepItem n={3} title="We'll review">
                  The listing, the conversation, and both accounts. If we ask you
                  for more information, we&apos;ll do it through DropYard so
                  there&apos;s a record.
                </StepItem>
                <StepItem n={4} title="We can take action on the account">
                  Warnings, suspension, or a permanent ban. We cannot issue refunds
                  or compel payment, because we don&apos;t hold the money.
                </StepItem>
                <StepItem n={5} title="For criminal matters">
                  Theft, fraud, threats, assault — contact the{" "}
                  <strong>Ottawa Police Service</strong> (or <strong>9-1-1</strong>{" "}
                  if it&apos;s urgent), and let us know so we can support any
                  investigation.
                </StepItem>
              </ol>

              <h4 className="mt-8 text-[15px] font-bold text-dy-forest">
                Things we&apos;ll always take seriously
              </h4>
              <CheckList
                items={[
                  "The item turned out to be substantially different from what was described",
                  "The buyer or seller didn't show up and stopped responding",
                  "A claimed payment was never sent (or a sent payment was never acknowledged)",
                  "Harassment, threats, or any behaviour that made you feel unsafe",
                  "Anything involving an item from the 'What you can't list' section",
                ]}
              />
            </Section>

            {/* Section 10 */}
            <Section num="10" title="Reporting">
              <p>
                If you see something that breaks these Guidelines — a prohibited
                listing, a misleading description, a user behaving badly, or
                anything else that feels off — please tell us:
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <ReportChannel
                  icon={<Icon.Flag className="h-5 w-5" />}
                  title="In-app Report"
                  desc="Buttons on listings, profiles, and messages"
                  accent="amber"
                />
                <ReportChannel
                  icon={<Icon.Mail className="h-5 w-5" />}
                  title="Email us"
                  desc="info@dropyard.app for anything you'd rather email"
                  accent="green"
                />
                <ReportChannel
                  icon={<Icon.Phone className="h-5 w-5" />}
                  title="9-1-1"
                  desc="For emergencies — always first, before anything else"
                  accent="rose"
                />
              </div>
              <Callout tone="green">
                You can report anonymously. We won&apos;t share that you were the
                person who reported.
              </Callout>
            </Section>

            {/* Section 11 */}
            <Section num="11" title="Consequences">
              <p>
                We try to handle issues in proportion to what happened. In general:
              </p>

              <div className="mt-6 space-y-4">
                <ConsequenceLevel
                  level="Friendly nudge"
                  accent="green"
                  desc="First-time minor issues — an outdated listing, a forgotten reply, a small etiquette miss — get a friendly nudge and a chance to fix things."
                />
                <ConsequenceLevel
                  level="Temporary suspension (7–30 days)"
                  accent="amber"
                  desc="Repeated or moderate violations can result in a temporary suspension, with a clear explanation of what went wrong and what to change."
                />
                <ConsequenceLevel
                  level="Permanent ban"
                  accent="rose"
                  desc="Serious violations result in an immediate permanent ban."
                />
              </div>

              <h4 className="mt-8 text-[15px] font-bold text-dy-forest">
                Permanent ban includes:
              </h4>
              <ul className="mt-3 space-y-2">
                {[
                  "Listing anything from the 'What you can't list' section, especially illegal or unsafe items",
                  "Fraud — claiming items you didn't deliver, or paying with fake currency or reversed e-Transfers",
                  "Harassment, threats, or discriminatory behaviour",
                  "Impersonating another user, DropYard staff, or a business",
                  "Creating a new account to evade a previous suspension or ban",
                  "Anything that puts another community member at risk",
                ].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                      <Icon.X className="h-3 w-3" />
                    </span>
                    <span className="text-slate-700">{i}</span>
                  </li>
                ))}
              </ul>

              <Callout tone="green">
                We don&apos;t enjoy banning anyone. We do it when we have to so that
                the rest of the community can keep trusting DropYard. If you think
                we got a decision wrong, reply to the email we sent you with your
                side and we&apos;ll take a second look.
              </Callout>
            </Section>

            {/* Section 12 */}
            <Section num="12" title="Account basics">
              <CheckList
                items={[
                  "You must be 18 or older to use DropYard",
                  "One account per person. Households can share an account, but don't create multiple accounts to circumvent any rule or limit.",
                  "Keep your account information accurate — update your contact info if it changes, and don't list under a name that isn't yours",
                  "We may suspend accounts that go unused for an extended period (you'll be notified first)",
                ]}
              />
            </Section>

            {/* Section 13 */}
            <Section num="13" title="Changes to these Guidelines">
              <p>
                We&apos;ll update these Guidelines as the community grows. For
                meaningful changes, we&apos;ll give you notice (by email or in-app)
                at least <strong>30 days</strong> before they take effect. The
                &ldquo;Last updated&rdquo; date at the top of this page will always
                tell you when the latest version went live.
              </p>
            </Section>

            {/* Section 14 — Final note */}
            <Section num="14" title="A final note">
              <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6">
                <p className="text-[15px] leading-relaxed text-slate-700">
                  DropYard works because of small, ordinary acts of trust between
                  neighbours — handing over a stroller, accepting an e-Transfer,
                  agreeing on a Saturday afternoon. These Guidelines exist so those
                  small acts feel safe enough to keep happening, in this community
                  and the ones we&apos;ll grow into next.
                </p>
                <p className="mt-4 text-[15px] font-semibold text-dy-forest">
                  Thanks for being part of it.
                </p>
                <p className="mt-1 text-[13px] italic text-slate-500">
                  — The DropYard team
                </p>
              </div>

              <p className="mt-6 text-[13px] text-slate-600">
                Questions about these Guidelines? Email{" "}
                <a
                  href="mailto:info@dropyard.app"
                  className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
                >
                  info@dropyard.app
                </a>
                . These Guidelines work alongside our{" "}
                <Link
                  href="/privacy-policy"
                  className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
                >
                  Privacy Policy
                </Link>{" "}
                and Terms of Service.
              </p>
            </Section>

          </div>
        </div>
      </section>
    </main>
  );
}

/* -------------------------------------------------- */
/* Sub-components                                     */
/* -------------------------------------------------- */

function Section({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  const meta = sectionMeta[num];
  const accent = accentClasses[meta.accent];
  const IconCmp = meta.Icon;
  return (
    <div id={`section-${num}`} className="mt-14 first:mt-0 scroll-mt-24 group">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ring-4 ${accent.bg} ${accent.text} ${accent.ring} transition-transform group-hover:scale-105`}>
          <IconCmp className="h-5 w-5" />
        </div>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${accent.text}`}>
            Section {num.padStart(2, "0")}
          </p>
          <h3 className="text-[19px] font-semibold tracking-tight text-dy-forest sm:text-[23px]">
            {title}
          </h3>
        </div>
      </div>
      <div className="mt-5 ml-0 sm:ml-[64px] space-y-3 leading-relaxed text-slate-700">
        {children}
      </div>
    </div>
  );
}

function DropCap({ children }: { children: React.ReactNode }) {
  return (
    <span className="float-left mr-2 mt-1 text-[47px] font-black leading-none text-dy-green-strong">
      {children}
    </span>
  );
}

function PromiseChip({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-slate-100 transition hover:-translate-y-1 hover:shadow-[0_15px_50px_rgba(0,0,0,0.08)]">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-dy-green-strong text-[13px] font-black text-white shadow-sm">
        {n}
      </span>
      <span className="text-[13px] font-bold text-dy-forest">{label}</span>
    </div>
  );
}

function PromiseCard({
  n,
  title,
  desc,
}: {
  n: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-emerald-100/60 blur-2xl transition group-hover:scale-150" />
      <div className="relative flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-dy-mid text-[15px] font-black text-white shadow-md">
          {n}
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-dy-forest">{title}</h4>
          <p className="mt-1.5 text-[13px] text-slate-600">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2.5">
      {items.map((i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Icon.Check className="h-3 w-3" />
          </span>
          <span className="text-slate-700">{i}</span>
        </li>
      ))}
    </ul>
  );
}

function Callout({
  tone,
  children,
}: {
  tone: "green" | "amber" | "rose";
  children: React.ReactNode;
}) {
  const styles =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50/70"
      : tone === "rose"
      ? "border-rose-200 bg-rose-50/70"
      : "border-amber-200 bg-amber-50/70";
  const dot =
    tone === "green" ? "bg-emerald-500" : tone === "rose" ? "bg-rose-500" : "bg-amber-500";
  return (
    <div className={`mt-5 flex gap-3 rounded-xl border p-4 text-dy-forest ${styles}`}>
      <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${dot}`} />
      <p className="text-[13px] leading-relaxed">{children}</p>
    </div>
  );
}

function ProhibitedGroup({
  accent,
  title,
  items,
}: {
  accent: "rose" | "amber" | "violet";
  title: string;
  items: string[];
}) {
  const c = accentClasses[accent];
  return (
    <div className={`mt-6 rounded-2xl border-2 ${c.border} ${c.bg} p-5`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-white ${c.text} ring-1 ${c.ring}`}>
          <Icon.X className="h-4 w-4" />
        </span>
        <h4 className={`text-[13px] font-black uppercase tracking-wider ${c.text}`}>
          {title}
        </h4>
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13px] text-slate-700">
            <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${c.dot}`} />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TipCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          {icon}
        </span>
        <h4 className="text-[13px] font-bold text-dy-forest">{title}</h4>
      </div>
      <p className="mt-3 text-[13px] text-slate-600">{desc}</p>
    </div>
  );
}

function StepItem({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-dy-mid text-[13px] font-black text-white shadow-sm">
        {n}
      </span>
      <div>
        <h5 className="text-[13px] font-bold text-dy-forest">{title}</h5>
        <div className="mt-1 text-[13px] text-slate-600">{children}</div>
      </div>
    </li>
  );
}

function ReportChannel({
  icon,
  title,
  desc,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: "green" | "amber" | "rose";
}) {
  const c = accentClasses[accent];
  return (
    <div className={`rounded-2xl border-2 ${c.border} ${c.bg} p-5 text-center transition hover:-translate-y-1`}>
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white ${c.text} ring-1 ${c.ring}`}>
        {icon}
      </div>
      <h4 className={`mt-3 text-[13px] font-black uppercase tracking-wider ${c.text}`}>
        {title}
      </h4>
      <p className="mt-2 text-[11px] text-slate-600">{desc}</p>
    </div>
  );
}

function ConsequenceLevel({
  level,
  accent,
  desc,
}: {
  level: string;
  accent: "green" | "amber" | "rose";
  desc: string;
}) {
  const c = accentClasses[accent];
  return (
    <div className={`flex items-start gap-4 rounded-xl border-l-4 ${c.border.replace("border-", "border-l-")} ${c.bg} p-4`}>
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white ${c.text} ring-1 ${c.ring}`}>
        <Icon.Gavel className="h-5 w-5" />
      </div>
      <div>
        <h5 className={`text-[13px] font-black uppercase tracking-wider ${c.text}`}>
          {level}
        </h5>
        <p className="mt-1 text-[13px] text-slate-700">{desc}</p>
      </div>
    </div>
  );
}
