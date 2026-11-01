"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const Icon = {
  Mail: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Flag: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 21V4M4 4h14l-3 5 3 5H4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></svg>
  ),
  Phone: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.72 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Book: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 4h12a4 4 0 014 4v13H8a4 4 0 01-4-4V4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M4 17h16" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Clock: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Bulb: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M9 21h6M10 18h4M8 14a6 6 0 118 0c-1 1-1 2-1 3H9c0-1 0-2-1-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></svg>
  ),
  Map: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6zM9 4v16M15 6v16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Megaphone: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 11v2a2 2 0 002 2h1l4 4V5L6 9H5a2 2 0 00-2 2zM14 7c2 2 2 8 0 10M18 4c4 4 4 12 0 16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></svg>
  ),
  Bug: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><rect x="7" y="8" width="10" height="12" rx="5" stroke="currentColor" strokeWidth="2"/><path d="M12 8V4M8 4l1 3M16 4l-1 3M3 12h4M17 12h4M3 18h3M18 18h3M3 6h4M17 6h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Heart: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Sparkle: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Hand: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M9 11V5a2 2 0 114 0v6M13 11V4a2 2 0 114 0v8M17 11V6a2 2 0 114 0v8a7 7 0 01-7 7h-2a7 7 0 01-7-7v-2a2 2 0 114 0" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></svg>
  ),
  Arrow: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
};

export default function HelpCenterPage() {
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
            Two-way help · A real person answers
          </div>

          <h1 className="mt-6 text-[35px] font-semibold tracking-tight text-white sm:text-[47px] lg:text-[59px]">
            Help{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-amber-300 to-amber-200 bg-clip-text text-transparent">
                Center
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-3 rounded bg-amber-400/20 blur-lg" />
            </span>
          </h1>

          <p className="mt-6 text-[17px] leading-relaxed text-emerald-100/95 sm:text-[19px] max-w-2xl mx-auto">
            DropYard runs on two-way help — neighbours helping neighbours, and a
            community helping us build something worth using.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#get-help"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[13px] font-semibold text-dy-forest transition hover:bg-amber-100 hover:shadow-lg hover:-translate-y-0.5"
            >
              <Icon.Hand className="h-4 w-4" />
              I need help today
            </a>
            <a
              href="#help-us-grow"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-5 py-3 text-[13px] font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/20 hover:-translate-y-0.5"
            >
              <Icon.Sparkle className="h-4 w-4" />
              I want to help DropYard grow
            </a>
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

      {/* ----- GET HELP ----- */}
      <section id="get-help" className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8 scroll-mt-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Get help"
            accent="green"
            icon={<Icon.Hand className="h-6 w-6" />}
            title="Need a hand today?"
            sub="A real person at DropYard reads every message, usually within one business day."
          />

          {/* Three primary help paths */}
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <HelpPathCard
              accent="green"
              icon={<Icon.Mail className="h-6 w-6" />}
              title="Email us anything"
              desc="The fastest way to reach a real person at DropYard."
              cta={{
                label: "info@dropyard.app",
                href: "mailto:info@dropyard.app",
              }}
            >
              <p className="text-[13px] font-bold text-dy-forest">
                It helps to include:
              </p>
              <ul className="mt-2 space-y-1.5 text-[13px] text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                  Your DropYard email or username
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                  A short description of what happened
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                  Screenshots or links, if you have them
                </li>
              </ul>
            </HelpPathCard>

            <HelpPathCard
              accent="amber"
              icon={<Icon.Flag className="h-6 w-6" />}
              title="Report a listing or user"
              desc="For anything that breaks our Community Guidelines."
            >
              <p className="text-[13px] text-slate-600 leading-relaxed">
                Use the <strong>Report</strong> button on the listing, message, or
                profile. <strong>You can report anonymously</strong> — we
                won&apos;t share that you were the person who reported.
              </p>
              <p className="mt-3 text-[13px] text-slate-600 leading-relaxed">
                You can also email reports to{" "}
                <a
                  href="mailto:info@dropyard.app"
                  className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
                >
                  info@dropyard.app
                </a>{" "}
                if you&apos;d rather have a written record.
              </p>
            </HelpPathCard>

            <HelpPathCard
              accent="rose"
              icon={<Icon.Phone className="h-6 w-6" />}
              title="Emergencies"
              desc="Urgent and safety-related — always 9-1-1 first."
            >
              <div className="rounded-xl border-2 border-rose-300 bg-white p-4 text-center">
                <p className="text-[11px] font-black uppercase tracking-wider text-rose-700">
                  Call now
                </p>
                <p className="mt-1 text-[29px] font-black tracking-tight text-dy-forest">
                  9-1-1
                </p>
              </div>
              <p className="mt-3 text-[13px] text-slate-600 leading-relaxed">
                For threats, assault, or anything dangerous — call first, then let
                us know so we can support any investigation. For non-emergency
                police matters, contact the{" "}
                <strong>Ottawa Police Service</strong>.
              </p>
            </HelpPathCard>
          </div>

          {/* Self-serve & response times row */}
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {/* Quick answers */}
            <div className="rounded-3xl bg-white p-7 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-4 ring-violet-200">
                  <Icon.Book className="h-5 w-5" />
                </div>
                <h3 className="text-[17px] font-bold text-dy-forest">
                  Quick answers before you write
                </h3>
              </div>
              <p className="mt-3 text-[13px] text-slate-600">
                A lot of common questions are already covered. If your question
                isn&apos;t in these, we want to hear it.
              </p>
              <div className="mt-5 space-y-2">
                <QuickLink
                  href="/faq"
                  label="FAQ"
                  desc="How the Drop works, payments, pickup, account stuff"
                />
                <QuickLink
                  href="/community-guidelines"
                  label="Community Guidelines"
                  desc="What you can list, what you can't, how disputes work"
                />
                <QuickLink
                  href="/privacy-policy"
                  label="Privacy Policy"
                  desc="How we handle your information"
                />
              </div>
            </div>

            {/* Response times */}
            <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-7 border border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700 ring-4 ring-emerald-200">
                  <Icon.Clock className="h-5 w-5" />
                </div>
                <h3 className="text-[17px] font-bold text-dy-forest">
                  Response times
                </h3>
              </div>
              <div className="mt-5 space-y-3">
                <ResponseRow
                  label="General questions and feedback"
                  time="Within 1 business day"
                  accent="green"
                />
                <ResponseRow
                  label="Reports of policy violations"
                  time="Within 1 business day, often faster"
                  accent="amber"
                />
                <ResponseRow
                  label="Urgent safety reports"
                  time="As fast as we can during waking hours"
                  accent="rose"
                />
              </div>
              <p className="mt-5 text-[11px] text-slate-600">
                For anything time-sensitive, <strong>call 9-1-1 first</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DIVIDER */}
      <div className="relative px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-200 to-transparent" />
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-dy-green-strong shadow-sm">
              <Icon.Heart className="h-3 w-3" />
              And now, your turn
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-200 to-transparent" />
          </div>
        </div>
      </div>

      {/* ----- HELP US GROW ----- */}
      <section
        id="help-us-grow"
        className="relative px-4 py-10 sm:px-6 sm:py-12 lg:px-8 scroll-mt-24 overflow-hidden"
      >
        <div className="absolute -top-20 left-1/4 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-1/4 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Help us grow"
            accent="amber"
            icon={<Icon.Sparkle className="h-6 w-6" />}
            title="DropYard is small, local, and listening."
            sub="Some of the most useful things you can do for the community don't cost anything."
          />

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ContributionCard
              accent="green"
              icon={<Icon.Bulb className="h-6 w-6" />}
              title="Tell us what to build next"
              lead="A neighbour-suggested feature has a much better chance of getting built than something we dreamed up on our own."
              items={[
                "The problem you ran into",
                "What you tried instead",
                "What you wish had been there",
              ]}
              ctaLabel="Tell us your idea"
              ctaTopicId="feature"
            />

            <ContributionCard
              accent="amber"
              icon={<Icon.Map className="h-6 w-6" />}
              title="Tell us where to launch next"
              lead="DropYard expands one neighbourhood at a time. We genuinely use these emails to plan."
              items={[
                "The neighbourhood name and approximate boundaries",
                "Why it's a good fit — active community groups, Buy Nothing scene, Saturday foot traffic",
                "Whether you'd help onboard the first few neighbours",
              ]}
              ctaLabel="Suggest a neighbourhood"
              ctaTopicId="neighbourhood"
            />

            <ContributionCard
              accent="violet"
              icon={<Icon.Megaphone className="h-6 w-6" />}
              title="Tell a neighbour"
              lead="Word-of-mouth from one resident to another is worth more than any ad we could buy."
              items={[
                "Share dropyard.app with a friend",
                "Post it in a community Facebook group",
                "Mention it at the bus stop on a Wednesday morning",
              ]}
              ctaLabel="Copy share link"
              ctaIsShare
            />

            <ContributionCard
              accent="rose"
              icon={<Icon.Bug className="h-6 w-6" />}
              title="Report bugs"
              lead="The faster we hear about a bug, the faster everyone gets a fix."
              items={[
                "What you were trying to do",
                "What happened instead",
                "Your device (phone or computer) and browser",
              ]}
              ctaLabel="Report a bug"
              ctaTopicId="bug"
            />

            <ContributionCard
              accent="sky"
              icon={<Icon.Heart className="h-6 w-6" />}
              title="Share your story"
              lead="A great find, a smooth pickup, a neighbour you wouldn't otherwise have met. If a DropYard exchange made your week, tell us."
              items={[
                "Tell us what happened",
                "Mention whether it's okay to share (anonymously or with credit)",
                "Other neighbours can see what's possible",
              ]}
              ctaLabel="Share a story"
              ctaTopicId="other"
            />

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-dy-forest via-dy-mid to-dy-green-strong p-7 text-white shadow-lg flex flex-col">
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-amber-300/20 blur-2xl" />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/20">
                  <Icon.Mail className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-[19px] font-semibold">Any of the above?</h3>
                <p className="mt-2 text-[13px] text-emerald-100/90 leading-relaxed">
                  Tell us anything — a short note is enough. Pick a topic, write
                  a few lines, and hit send. A real person reads every one.
                </p>
              </div>
              <a
                href="/contact"
                className="relative mt-auto pt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-amber-200 hover:text-amber-100 group"
              >
                Start a message
                <Icon.Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>

          {/* CLOSING */}
          <div className="mt-16 rounded-3xl border border-emerald-100 bg-white p-8 sm:p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-dy-green-strong">
              A note on the small print
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-[13px] text-slate-600 leading-relaxed">
              DropYard is operated by <strong>DropYard Inc.</strong>, based in
              Ontario, Canada. For privacy concerns, see our{" "}
              <Link
                href="/privacy-policy"
                className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
              >
                Privacy Policy
              </Link>
              . For the rules of the road, see our{" "}
              <Link
                href="/community-guidelines"
                className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
              >
                Community Guidelines
              </Link>
              .
            </p>

            <div className="my-8 mx-auto h-px w-24 bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />

            <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-dy-forest">
              Thanks for being part of this.{" "}
              <strong>Real neighbours, real stuff, real trust</strong> — none of
              it happens without you.
            </p>
            <p className="mt-3 text-[13px] italic text-slate-500">— The DropYard team</p>
            <a
              href="mailto:info@dropyard.app"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-dy-mid px-6 py-3 text-[13px] font-semibold text-white transition hover:bg-dy-mid hover:shadow-lg hover:-translate-y-0.5"
            >
              <Icon.Mail className="h-4 w-4" />
              info@dropyard.app
            </a>
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

function SectionHeader({
  eyebrow,
  accent,
  icon,
  title,
  sub,
}: {
  eyebrow: string;
  accent: "green" | "amber";
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  const c = accentClasses[accent];
  return (
    <div className="text-center">
      <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] ${c.bg} ${c.text} ring-1 ${c.ring}`}>
        {icon}
        {eyebrow}
      </div>
      <h2 className="mt-5 text-[29px] font-semibold tracking-tight text-dy-forest sm:text-[35px]">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-[15px] text-slate-600 sm:text-[17px]">
        {sub}
      </p>
    </div>
  );
}

function HelpPathCard({
  accent,
  icon,
  title,
  desc,
  cta,
  children,
}: {
  accent: "green" | "amber" | "rose";
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta?: { label: string; href: string };
  children: React.ReactNode;
}) {
  const c = accentClasses[accent];
  return (
    <div className="group flex flex-col rounded-3xl bg-white p-7 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${c.bg} ${c.text} ring-4 ${c.ring} transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <h3 className="mt-5 text-[17px] font-bold text-dy-forest">{title}</h3>
      <p className="mt-2 text-[13px] text-slate-600">{desc}</p>
      <div className="mt-5 flex-1">{children}</div>
      {cta && (
        <a
          href={cta.href}
          className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold transition ${c.bg} ${c.text} ring-1 ${c.ring} hover:bg-white hover:ring-2`}
        >
          <Icon.Mail className="h-4 w-4" />
          {cta.label}
        </a>
      )}
    </div>
  );
}

function QuickLink({
  href,
  label,
  desc,
}: {
  href: string;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3.5 transition-all hover:border-violet-300 hover:bg-violet-50/40"
    >
      <div>
        <p className="text-[13px] font-bold text-dy-forest">{label}</p>
        <p className="text-[11px] text-slate-500">{desc}</p>
      </div>
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 transition-transform group-hover:translate-x-1">
        <Icon.Arrow className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function ResponseRow({
  label,
  time,
  accent,
}: {
  label: string;
  time: string;
  accent: "green" | "amber" | "rose";
}) {
  const c = accentClasses[accent];
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3.5 border border-slate-100">
      <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${c.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-dy-forest">{label}</p>
      </div>
      <span className={`text-[11px] font-black uppercase tracking-wider ${c.text}`}>
        {time}
      </span>
    </div>
  );
}

function ContributionCard({
  accent,
  icon,
  title,
  lead,
  items,
  ctaLabel,
  ctaTopicId,
  ctaIsShare = false,
}: {
  accent: "green" | "amber" | "violet" | "rose" | "sky";
  icon: React.ReactNode;
  title: string;
  lead: string;
  items: string[];
  ctaLabel: string;
  ctaTopicId?: string;
  ctaIsShare?: boolean;
}) {
  const c = accentClasses[accent];
  const [copied, setCopied] = useState(false);

  const href = ctaIsShare
    ? "#"
    : `/contact${ctaTopicId ? `?topic=${ctaTopicId}` : ""}`;

  const onClick = ctaIsShare
    ? (e: React.MouseEvent) => {
        e.preventDefault();
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText("https://dropyard.app");
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }
      }
    : undefined;

  return (
    <div className="group flex flex-col rounded-3xl bg-white p-7 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${c.bg} ${c.text} ring-4 ${c.ring} transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <h3 className="mt-5 text-[17px] font-bold text-dy-forest">{title}</h3>
      <p className="mt-2 text-[13px] text-slate-600 leading-relaxed">{lead}</p>

      <ul className="mt-5 space-y-2 flex-1">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600">
            <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${c.dot}`} />
            {i}
          </li>
        ))}
      </ul>

      <a
        href={href}
        onClick={onClick}
        className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold transition ${c.bg} ${c.text} ring-1 ${c.ring} hover:bg-white hover:ring-2`}
      >
        {ctaIsShare ? (
          <>
            {copied ? "Copied!" : ctaLabel}
            <Icon.Arrow className="h-4 w-4" />
          </>
        ) : (
          <>
            {ctaLabel}
            <Icon.Arrow className="h-4 w-4" />
          </>
        )}
      </a>
    </div>
  );
}
