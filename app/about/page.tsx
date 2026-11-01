"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const Icon = {
  Recycle: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M7 19l-3-5 5-3M17 5l3 5-5 3M15 19l5-2-2-5M9 5L4 7l2 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  Pin: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 22s-7-7-7-12a7 7 0 0114 0c0 5-7 12-7 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Shield: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  Spark: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Mail: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Arrow: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  Map: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6zM9 4v16M15 6v16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Bulb: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M9 21h6M10 18h4M8 14a6 6 0 118 0c-1 1-1 2-1 3H9c0-1 0-2-1-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></svg>
  ),
  Quote: (p: any) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M7 17h3l2-4V7H6v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z"/></svg>
  ),
  Heart: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
};

export default function AboutPage() {
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
            About DropYard
          </div>

          <h1 className="mt-6 text-[35px] font-semibold tracking-tight text-white sm:text-[47px] lg:text-[59px] leading-[1.05]">
            From one{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-amber-300 to-amber-200 bg-clip-text text-transparent">
                home
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-3 rounded bg-amber-400/20 blur-lg" />
            </span>
            ,
            <br />
            to another.
          </h1>

          <p className="mt-7 text-[17px] leading-relaxed text-emerald-100/95 sm:text-[19px] max-w-2xl mx-auto">
            DropYard is the <strong className="text-white">neighbourhood yard
            sale, online</strong>. We help neighbours pass along things they no
            longer need to other neighbours — on the same street, or just around
            the corner.
          </p>
          <p className="mt-4 text-[15px] text-emerald-200/80">
            We&apos;re built for one community at a time. We start in{" "}
            <strong className="text-white">Barrhaven</strong>, where we live.
          </p>
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

      {/* ===== HOW IT STARTED ===== */}
      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Eyebrow accent="green" icon={<Icon.Quote className="h-4 w-4" />}>
            How DropYard started
          </Eyebrow>
          <h2 className="mt-5 text-[29px] font-semibold tracking-tight text-dy-forest sm:text-[35px]">
            A familiar Saturday-morning problem.
          </h2>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_300px] items-start">
            <div className="space-y-5 text-[15px] leading-relaxed text-slate-700 sm:text-[17px]">
              <p>
                DropYard began with a familiar Saturday-morning problem:{" "}
                <strong>a garage full of things still good enough to use,
                but no easy way to pass them along.</strong>
              </p>
              <p>
                Anthony and Narveer had both tried the usual options — Facebook
                Marketplace, Kijiji — and kept running into the same
                frustrations. Listings sat stale for weeks. Messages came in from
                across the city. The endless &ldquo;Is it available?&rdquo; from
                buyers who never followed up. There was no sense of who was on
                the other end. Whatever community feeling Saturday-morning yard
                sales used to have didn&apos;t translate to those platforms.
              </p>
              <p>
                What was missing was something <strong>built for the people
                next door</strong>, not the whole city — a way to connect with
                neighbours without the friction of shipping, the staleness of
                mass listings, or the awkwardness of handing your phone number to
                a stranger on the internet.
              </p>
              <p className="text-[19px] font-bold text-dy-mid">So we built one.</p>
              <p>
                DropYard is the result: a hyperlocal reuse community designed
                around the way Saturday-morning yard sales actually work —
                neighbours stepping out to a porch, exchanging cash or an
                e-Transfer, and waving goodbye to something they no longer
                needed. We just made it easier to find each other.
              </p>
            </div>

            {/* Right side — visual / pull-quote */}
            <div className="space-y-4">
              <PullQuote
                tone="amber"
                quote="Listings sat stale for weeks."
                source="The old way"
              />
              <PullQuote
                tone="rose"
                quote="Messages came in from across the city."
                source="The old way"
              />
              <PullQuote
                tone="green"
                quote="A porch, a wave, a quick handoff."
                source="The DropYard way"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHAT WE BELIEVE ===== */}
      <section className="relative px-4 py-10 sm:px-6 sm:py-12 lg:px-8 bg-gradient-to-b from-white to-dy-pale overflow-hidden">
        <div className="absolute top-1/2 -left-32 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl pointer-events-none -translate-y-1/2" />
        <div className="absolute top-1/4 -right-32 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-6xl">
          <div className="text-center">
            <Eyebrow accent="amber" icon={<Icon.Heart className="h-4 w-4" />}>
              What we believe
            </Eyebrow>
            <h2 className="mt-5 text-[29px] font-semibold tracking-tight text-dy-forest sm:text-[35px]">
              Four principles, one yard sale at a time.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <BeliefCard
              n="01"
              accent="green"
              icon={<Icon.Recycle className="h-6 w-6" />}
              title="Reuse should be the default."
              desc="Every item that finds a second home in our neighbourhood is one less thing in a landfill, one less new thing manufactured, and a small amount of money back in a neighbour's pocket. We track the CO₂ our community saves, and we mean it."
            />
            <BeliefCard
              n="02"
              accent="amber"
              icon={<Icon.Pin className="h-6 w-6" />}
              title="Local should mean local."
              desc="A community can't form when buyers and sellers live an hour apart. DropYard is hyperlocal by design — every transaction stays within walking or driving distance."
            />
            <BeliefCard
              n="03"
              accent="violet"
              icon={<Icon.Shield className="h-6 w-6" />}
              title="Trust is the product."
              desc="We don't process payments, we don't take a cut, and we don't insert ourselves between you and your neighbour. We make it easier for the two of you to meet, agree, and trade. The trust that builds between neighbours is what makes the next exchange possible."
            />
            <BeliefCard
              n="04"
              accent="sky"
              icon={<Icon.Spark className="h-6 w-6" />}
              title="Simple beats clever."
              desc="DropYard runs the way a real yard sale runs — list, claim, pick up. We'll add tools that make it faster, but we'll always keep the basics free, friendly, and easy."
            />
          </div>
        </div>
      </section>

      {/* ===== BUILT IN BARRHAVEN ===== */}
      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-dy-forest via-dy-mid to-dy-green-strong px-7 py-12 sm:p-14 text-white shadow-xl">
            <div className="absolute inset-0 pointer-events-none opacity-15">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />
            </div>
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] items-center">
              <div>
                <Eyebrow accent="amber" icon={<Icon.Map className="h-4 w-4" />} inverted>
                  Built in Barrhaven, for Barrhaven (first)
                </Eyebrow>
                <h2 className="mt-5 text-[29px] font-semibold tracking-tight sm:text-[35px]">
                  We started in our own neighbourhood for a reason.
                </h2>
                <p className="mt-5 text-[15px] leading-relaxed text-emerald-100/95 sm:text-[17px]">
                  It&apos;s the one we know well enough to build for. Every
                  design choice — from porch-pickup defaults to the weekend Drop
                  schedule — comes from how we and our neighbours actually shop,
                  sell, and spend our Saturdays.
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-emerald-100/95 sm:text-[17px]">
                  Once Barrhaven works, we&apos;ll grow into the next community,
                  and the next. We&apos;re not in a hurry.
                </p>
                <p className="mt-4 text-[17px] font-bold text-amber-200">
                  We&apos;d rather have one community love DropYard than have a
                  hundred half-care about it.
                </p>
              </div>

              {/* Map / location pin visual */}
              <div className="hidden lg:flex items-center justify-center">
                <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-white/10 backdrop-blur ring-2 ring-white/20">
                  <div className="absolute inset-0 rounded-full border-2 border-amber-300/40 animate-ping opacity-50" />
                  <Icon.Pin className="h-20 w-20 text-amber-200" />
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-300 px-4 py-1 text-[11px] font-black uppercase tracking-wider text-dy-forest shadow-lg">
                    Barrhaven
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== THE FOUNDERS ===== */}
      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <Eyebrow accent="violet" icon={<Icon.Heart className="h-4 w-4" />}>
              The founders
            </Eyebrow>
            <h2 className="mt-5 text-[29px] font-semibold tracking-tight text-dy-forest sm:text-[35px]">
              Two neighbours. One garage too full.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[15px] text-slate-600 sm:text-[17px]">
              <strong>Anthony Annan</strong> and <strong>Narveer Singh</strong>{" "}
              are the co-founders of DropYard. Both are Barrhaven residents and
              both are graduates of the Technology Innovation Management
              master&apos;s program at Carleton University — a program built
              around taking technology ideas from a sketch to a working
              business. DropYard is what came out of theirs.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <FounderCard
              name="Anthony Annan"
              initials="AA"
              role="Co-founder · Business"
              accent="green"
              bio="Anthony handles the business side of DropYard — partnerships, operations, and the careful work of growing into one neighbourhood at a time. When he's away from the laptop, he's usually cooking something or finding a trail to be out on."
              tags={["Partnerships", "Operations", "Cook", "Trail finder"]}
            />
            <FounderCard
              name="Narveer Singh"
              initials="NS"
              role="Co-founder · Engineering"
              accent="amber"
              bio="Narveer is the engineer behind DropYard. The web app, the AI tooling, the bits that make a listing happen — he wrote them. If something on DropYard works (or breaks), it crossed his keyboard first."
              tags={["Web app", "AI tooling", "Listings", "Bug fixer"]}
            />
          </div>
        </div>
      </section>

      {/* ===== WHAT'S NEXT ===== */}
      <section className="relative px-4 py-10 sm:px-6 sm:py-12 lg:px-8 bg-gradient-to-b from-dy-pale to-white overflow-hidden">
        <div className="absolute -top-20 right-1/4 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-5xl">
          <div className="text-center">
            <Eyebrow accent="amber" icon={<Icon.Spark className="h-4 w-4" />}>
              What&apos;s next
            </Eyebrow>
            <h2 className="mt-5 text-[29px] font-semibold tracking-tight text-dy-forest sm:text-[35px]">
              A roadmap that&apos;s small and specific.
            </h2>
          </div>

          <div className="mt-12 space-y-5">
            <RoadmapItem
              n="01"
              accent="green"
              icon={<Icon.Bulb className="h-5 w-5" />}
              title="Better tools for sellers"
              desc="An AI Seller Agent that turns a few photos into a polished listing, suggests fair prices, and answers common buyer questions on your behalf — coming soon."
              tag="Coming soon"
            />
            <RoadmapItem
              n="02"
              accent="amber"
              icon={<Icon.Map className="h-5 w-5" />}
              title="New neighbourhoods"
              desc="Carefully, one at a time, as Barrhaven matures. If you'd like DropYard in your neighbourhood next, tell us."
              tag="One at a time"
            />
            <RoadmapItem
              n="03"
              accent="violet"
              icon={<Icon.Heart className="h-5 w-5" />}
              title="Stronger community signals"
              desc="Sold-item history, neighbour reviews, and small ways to celebrate the sellers who keep great things flowing through the community."
              tag="In design"
            />
          </div>

          <p className="mx-auto mt-10 max-w-2xl text-center text-[13px] text-slate-600">
            If there&apos;s a feature you wish DropYard had,{" "}
            <a
              href="mailto:info@dropyard.app?subject=Feature%20idea"
              className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
            >
              email us
            </a>
            . A real person reads every message.
          </p>
        </div>
      </section>

      {/* ===== SAY HI ===== */}
      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-dy-forest via-dy-mid to-dy-green-strong p-6 sm:p-10 text-center text-white shadow-2xl">
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />

            <div className="relative">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/20">
                <Icon.Mail className="h-6 w-6" />
              </div>
              <Eyebrow accent="amber" icon={<Icon.Heart className="h-3.5 w-3.5" />} inverted>
                Say hi
              </Eyebrow>
              <h3 className="mt-3 text-[29px] font-black tracking-tight sm:text-[35px]">
                We&apos;d love to hear from you.
              </h3>
              <p className="mt-3 text-emerald-100/95">
                Feedback, questions, ideas, or just a hello.
              </p>
              <a
                href="mailto:info@dropyard.app"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[13px] font-bold text-dy-forest transition hover:bg-amber-100 hover:shadow-lg hover:-translate-y-0.5"
              >
                <Icon.Mail className="h-4 w-4" />
                info@dropyard.app
              </a>

              <div className="mt-8 mx-auto h-px w-16 bg-white/20" />

              <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">
                DropYard Inc.
              </p>
              <p className="mt-1 text-[13px] text-emerald-100/90">
                Barrhaven, Ottawa · Ontario, Canada
              </p>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}

/* -------------------------------------------------- */
/* Sub-components                                     */
/* -------------------------------------------------- */

const accentClasses: Record<string, { bg: string; text: string; ring: string; dot: string; border: string }> = {
  green:  { bg: "bg-emerald-50",  text: "text-emerald-700",  ring: "ring-emerald-200",  dot: "bg-emerald-500", border: "border-emerald-200" },
  amber:  { bg: "bg-amber-50",    text: "text-amber-700",    ring: "ring-amber-200",    dot: "bg-amber-500",   border: "border-amber-200" },
  violet: { bg: "bg-violet-50",   text: "text-violet-700",   ring: "ring-violet-200",   dot: "bg-violet-500",  border: "border-violet-200" },
  rose:   { bg: "bg-rose-50",     text: "text-rose-700",     ring: "ring-rose-200",     dot: "bg-rose-500",    border: "border-rose-200" },
  sky:    { bg: "bg-sky-50",      text: "text-sky-700",      ring: "ring-sky-200",      dot: "bg-sky-500",     border: "border-sky-200" },
};

function Eyebrow({
  accent,
  icon,
  inverted = false,
  children,
}: {
  accent: "green" | "amber" | "violet";
  icon: React.ReactNode;
  inverted?: boolean;
  children: React.ReactNode;
}) {
  const c = accentClasses[accent];
  if (inverted) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-200 backdrop-blur ring-1 ring-white/20">
        {icon}
        {children}
      </div>
    );
  }
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] ${c.bg} ${c.text} ring-1 ${c.ring}`}>
      {icon}
      {children}
    </div>
  );
}

function PullQuote({
  tone,
  quote,
  source,
}: {
  tone: "green" | "amber" | "rose";
  quote: string;
  source: string;
}) {
  const c = accentClasses[tone];
  return (
    <div className={`relative rounded-2xl border-l-4 ${c.border.replace("border-", "border-l-")} ${c.bg} p-5 shadow-sm`}>
      <Icon.Quote className={`absolute top-3 right-3 h-6 w-6 opacity-30 ${c.text}`} />
      <p className="text-[15px] font-bold text-dy-forest leading-snug">{quote}</p>
      <p className={`mt-2 text-[11px] font-black uppercase tracking-wider ${c.text}`}>
        {source}
      </p>
    </div>
  );
}

function BeliefCard({
  n,
  accent,
  icon,
  title,
  desc,
}: {
  n: string;
  accent: "green" | "amber" | "violet" | "sky";
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  const c = accentClasses[accent];
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white p-7 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
      <span className={`absolute right-5 top-5 text-[47px] font-black ${c.text} opacity-10 transition group-hover:opacity-20`}>
        {n}
      </span>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${c.bg} ${c.text} ring-4 ${c.ring} transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <h3 className="mt-5 text-[19px] font-bold text-dy-forest">{title}</h3>
      <p className="mt-3 text-[13px] leading-relaxed text-slate-600">{desc}</p>
    </div>
  );
}

function FounderCard({
  name,
  initials,
  role,
  bio,
  accent,
  tags,
}: {
  name: string;
  initials: string;
  role: string;
  bio: string;
  accent: "green" | "amber";
  tags: string[];
}) {
  const c = accentClasses[accent];
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white p-7 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
      <div className={`absolute -top-10 -right-10 h-32 w-32 rounded-full ${c.bg} blur-2xl opacity-60 transition group-hover:scale-150`} />

      <div className="relative flex items-center gap-4">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${accent === "green" ? "from-emerald-500 to-emerald-700" : "from-amber-400 to-amber-600"} text-[19px] font-black text-dy-forest shadow-md ring-4 ${c.ring}`}>
          {initials}
        </div>
        <div>
          <h3 className="text-[19px] font-bold text-dy-forest">{name}</h3>
          <p className={`text-[11px] font-black uppercase tracking-wider ${c.text}`}>
            {role}
          </p>
        </div>
      </div>

      <p className="relative mt-5 text-[13px] leading-relaxed text-slate-600">{bio}</p>

      <div className="relative mt-5 flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className={`rounded-full ${c.bg} px-3 py-1 text-[11px] font-bold ${c.text}`}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function RoadmapItem({
  n,
  accent,
  icon,
  title,
  desc,
  tag,
}: {
  n: string;
  accent: "green" | "amber" | "violet";
  icon: React.ReactNode;
  title: string;
  desc: string;
  tag: string;
}) {
  const c = accentClasses[accent];
  return (
    <div className="group flex items-start gap-5 rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${c.bg} ${c.text} ring-4 ${c.ring}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[11px] font-black uppercase tracking-[0.25em] ${c.text}`}>
            {n}
          </span>
          <span className="text-slate-300">·</span>
          <h3 className="text-[17px] font-bold text-dy-forest">{title}</h3>
          <span className={`ml-auto rounded-full ${c.bg} px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${c.text} ring-1 ${c.ring}`}>
            {tag}
          </span>
        </div>
        <p className="mt-2 text-[13px] text-slate-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
