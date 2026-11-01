"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const EFFECTIVE_DATE = "July 1, 2026";
const LAST_UPDATED = "July 1, 2026";

const sections = [
  { num: "1",  title: "About these Terms" },
  { num: "2",  title: "The short version" },
  { num: "3",  title: "Who can use DropYard" },
  { num: "4",  title: "Your account" },
  { num: "5",  title: "What DropYard is" },
  { num: "6",  title: "What DropYard is not" },
  { num: "7",  title: "Listing items (sellers)" },
  { num: "8",  title: "Claiming items (buyers)" },
  { num: "9",  title: "Pickups" },
  { num: "10", title: "Payments between users" },
  { num: "11", title: "Prohibited conduct" },
  { num: "12", title: "Your content" },
  { num: "13", title: "Reporting & enforcement" },
  { num: "14", title: "Suspension & termination" },
  { num: "15", title: "DropYard's IP" },
  { num: "16", title: "Disclaimers" },
  { num: "17", title: "Limitation of liability" },
  { num: "18", title: "Indemnification" },
  { num: "19", title: "Changes to these Terms" },
  { num: "20", title: "Governing law" },
  { num: "21", title: "General provisions" },
  { num: "22", title: "Contact us" },
];

const Icon = {
  Doc: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Sparkle: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Users: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="17" cy="9" r="2" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  User: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Yard: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 12l9-8 9 8v9H3v-9z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Ban: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M5.6 5.6l12.8 12.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Tag: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 12V4h8l10 10-8 8L3 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="8" cy="9" r="1.5" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Cart: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 3h2l3 13h11l2-9H6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/><circle cx="9" cy="20" r="1.5" stroke="currentColor" strokeWidth="2"/><circle cx="17" cy="20" r="1.5" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Truck: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="6" cy="19" r="2" stroke="currentColor" strokeWidth="2"/><circle cx="18" cy="19" r="2" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Dollar: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M16 7c0-2-2-3-4-3s-4 1-4 3 2 3 4 3 4 1 4 3-2 3-4 3-4-1-4-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Stop: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M8 3h8l5 5v8l-5 5H8l-5-5V8l5-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Camera: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 7h4l2-3h6l2 3h4v13H3V7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Flag: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 21V4M4 4h14l-3 5 3 5H4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></svg>
  ),
  Power: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M18.36 6.64a9 9 0 11-12.72 0M12 2v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Lock: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Shield: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Scale: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3v18M5 21h14M6 7l-3 7h6l-3-7zM18 7l-3 7h6l-3-7zM4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  Handshake: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M11 17l-5-5 4-4 3 3 4-4 5 5-4 4-3-3-4 4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Refresh: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  Gavel: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M14 13l-7 7-3-3 7-7M5 7l5-5 8 8-5 5zM15 13l5 5M3 21h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  Book: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 4h12a4 4 0 014 4v13H8a4 4 0 01-4-4V4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M4 17h16" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Mail: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Check: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
  ),
  X: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
  ),
  Clock: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
};

const sectionMeta: Record<
  string,
  { Icon: any; accent: "green" | "amber" | "violet" | "rose" | "sky" }
> = {
  "1":  { Icon: Icon.Doc,       accent: "green" },
  "2":  { Icon: Icon.Sparkle,   accent: "amber" },
  "3":  { Icon: Icon.Users,     accent: "sky" },
  "4":  { Icon: Icon.User,      accent: "violet" },
  "5":  { Icon: Icon.Yard,      accent: "green" },
  "6":  { Icon: Icon.Ban,       accent: "rose" },
  "7":  { Icon: Icon.Tag,       accent: "amber" },
  "8":  { Icon: Icon.Cart,      accent: "violet" },
  "9":  { Icon: Icon.Truck,     accent: "sky" },
  "10": { Icon: Icon.Dollar,    accent: "green" },
  "11": { Icon: Icon.Stop,      accent: "rose" },
  "12": { Icon: Icon.Camera,    accent: "violet" },
  "13": { Icon: Icon.Flag,      accent: "amber" },
  "14": { Icon: Icon.Power,     accent: "rose" },
  "15": { Icon: Icon.Lock,      accent: "violet" },
  "16": { Icon: Icon.Shield,    accent: "amber" },
  "17": { Icon: Icon.Scale,     accent: "sky" },
  "18": { Icon: Icon.Handshake, accent: "green" },
  "19": { Icon: Icon.Refresh,   accent: "amber" },
  "20": { Icon: Icon.Gavel,     accent: "violet" },
  "21": { Icon: Icon.Book,      accent: "sky" },
  "22": { Icon: Icon.Mail,      accent: "green" },
};

const accentClasses: Record<string, { bg: string; text: string; ring: string; dot: string; border: string }> = {
  green:  { bg: "bg-emerald-50",  text: "text-emerald-700",  ring: "ring-emerald-200",  dot: "bg-emerald-500", border: "border-emerald-200" },
  amber:  { bg: "bg-amber-50",    text: "text-amber-700",    ring: "ring-amber-200",    dot: "bg-amber-500",   border: "border-amber-200" },
  violet: { bg: "bg-violet-50",   text: "text-violet-700",   ring: "ring-violet-200",   dot: "bg-violet-500",  border: "border-violet-200" },
  rose:   { bg: "bg-rose-50",     text: "text-rose-700",     ring: "ring-rose-200",     dot: "bg-rose-500",    border: "border-rose-200" },
  sky:    { bg: "bg-sky-50",      text: "text-sky-700",      ring: "ring-sky-200",      dot: "bg-sky-500",     border: "border-sky-200" },
};

const InfoMailLink = () => (
  <a
    href="mailto:info@dropyard.app"
    className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
  >
    info@dropyard.app
  </a>
);

export default function TermsOfServicePage() {
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
            Legal · Ontario, Canada
          </div>

          <h1 className="mt-6 text-[35px] font-semibold tracking-tight text-white sm:text-[47px] lg:text-[59px]">
            Terms of{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-amber-300 to-amber-200 bg-clip-text text-transparent">
                Service
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-3 rounded bg-amber-400/20 blur-lg" />
            </span>
          </h1>

          <p className="mt-6 text-[17px] leading-relaxed text-emerald-100/95 sm:text-[19px] max-w-2xl mx-auto">
            The rules that govern your use of DropYard — written to be
            readable, with legal precision where it matters.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-emerald-100 backdrop-blur ring-1 ring-white/20">
              <Icon.Clock className="h-3.5 w-3.5" />
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

      {/* THE SHORT VERSION FLOATING */}
      <section className="px-4 mt-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-6xl grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            accent="green"
            icon={<Icon.Yard className="h-5 w-5" />}
            title="Neighbour-to-neighbour"
            desc="A venue for local yard sales — not a party to any transaction."
          />
          <SummaryCard
            accent="amber"
            icon={<Icon.Dollar className="h-5 w-5" />}
            title="No payments handled"
            desc="Money flows directly between buyer and seller, in person."
          />
          <SummaryCard
            accent="violet"
            icon={<Icon.User className="h-5 w-5" />}
            title="18+ in Barrhaven"
            desc="You're responsible for your listings and transactions."
          />
        </div>
      </section>

      {/* BODY */}
      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
          {/* TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
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
            <Section num="1" title="About these Terms">
              <p>
                <DropCap>T</DropCap>hese Terms of Service (&ldquo;Terms&rdquo;)
                govern your use of DropYard — the website at{" "}
                <a
                  href="https://dropyard.app"
                  className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
                >
                  dropyard.app
                </a>{" "}
                and any related services (together, &ldquo;DropYard&rdquo; or
                &ldquo;the Service&rdquo;). DropYard is operated by{" "}
                <strong>DropYard Inc.</strong>, a company incorporated in Ontario,
                Canada (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
              </p>
              <p className="mt-4">
                By creating an account, browsing listings, or using DropYard in any
                way, <strong>you agree to these Terms</strong>. If you don&apos;t
                agree, please don&apos;t use DropYard.
              </p>
              <Callout tone="green">
                We&apos;ve written these Terms to be readable. Where legal
                precision is needed, we use it; where plain English works, we use
                that. If anything is unclear, email <InfoMailLink /> and we&apos;ll
                explain it.
              </Callout>
            </Section>

            {/* Section 2 */}
            <Section num="2" title="The short version">
              <CheckList
                items={[
                  "DropYard is a neighbour-to-neighbour yard sale platform. We connect buyers and sellers in the same neighbourhood, who meet in person to complete pickups.",
                  "We're not a party to any transaction between users. We don't process payments, don't hold money, and don't take a cut.",
                  "You must be 18 or older, located in our current service area (Barrhaven, Ottawa), and have location services enabled.",
                  "You are responsible for your own listings and your own transactions. We're a venue, not a guarantor.",
                  "These Terms work alongside our Community Guidelines and Privacy Policy — together they govern your use of DropYard.",
                ]}
              />
            </Section>

            {/* Section 3 */}
            <Section num="3" title="Who can use DropYard">
              <p>You may use DropYard only if all of the following are true:</p>
              <CheckList
                items={[
                  "You are 18 years of age or older",
                  "You are physically located in our service area (currently Barrhaven, Ottawa, Ontario)",
                  "You enable location services on your device so we can verify the above",
                  "You have the legal capacity to enter into a binding agreement",
                  "You have not been previously suspended or banned from DropYard",
                ]}
              />
              <p className="mt-4">
                We may verify any of these at any time, and we may suspend or
                terminate accounts that do not meet them.
              </p>
            </Section>

            {/* Section 4 */}
            <Section num="4" title="Your account">
              <p>
                You will need to create an account to list items or claim items.
                When you create one:
              </p>
              <CheckList
                items={[
                  "Provide accurate, current, and complete information",
                  "Keep your password secure and confidential",
                  "You are responsible for all activity on your account, whether or not you authorized it",
                  "One account per person. Households may share an account, but you may not create multiple accounts to evade any rule, limit, or suspension.",
                  "Notify us immediately if you suspect unauthorized access — email info@dropyard.app",
                ]}
              />
              <p className="mt-4">
                You may close your account at any time by emailing <InfoMailLink />
                .
              </p>
            </Section>

            {/* Section 5 */}
            <Section num="5" title="What DropYard is">
              <p>
                DropYard is a <strong>listing and matching platform</strong> that
                helps neighbours in the same community find each other to exchange
                physical goods. The Service includes:
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <FeatureCard
                  title="Drop & Shelf listings"
                  desc="A way for sellers to list items for browsing in weekly events (the 'Drop') and on a persistent listing page (the 'Shelf')"
                />
                <FeatureCard
                  title="Claim & coordinate"
                  desc="A way for buyers to claim items and coordinate pickup with sellers"
                />
                <FeatureCard
                  title="In-app messaging"
                  desc="Tools to communicate about an item and arrange a time and place to meet"
                />
                <FeatureCard
                  title="Notifications"
                  desc="Optional notifications by email, push, or WhatsApp (where you have opted in)"
                />
              </div>
              <p className="mt-4">
                Other features we may add over time, including AI tools to help
                sellers list more efficiently. Some features may be subject to
                additional terms or fees, which we will make clear before you use
                them.
              </p>
            </Section>

            {/* Section 6 */}
            <Section num="6" title="What DropYard is not">
              <p>
                DropYard is <strong>not a party</strong> to any transaction between
                users. Specifically:
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <NotCard label="We don't sell items" sub="Sellers do." />
                <NotCard label="We don't buy items" sub="Buyers do." />
                <NotCard label="We don't process payments" sub="Buyers pay sellers directly, in person." />
                <NotCard label="We don't ship items" sub="Buyers pick up from sellers." />
                <NotCard label="We don't inspect items" sub="Sellers describe them; buyers inspect at pickup." />
                <NotCard label="We can't compel refunds" sub="We can act on accounts; we can't reverse money." />
              </div>
              <Callout tone="amber">
                You acknowledge and agree that any transaction you enter into
                through DropYard is between you and the other user, and that
                DropYard&apos;s role is limited to providing the venue.
              </Callout>
            </Section>

            {/* Section 7 */}
            <Section num="7" title="Listing items (sellers)">
              <p>
                When you list an item on DropYard, you represent and warrant that:
              </p>
              <CheckList
                items={[
                  "The item is owned by you and is yours to sell",
                  "The item is described accurately, including its condition and any defects",
                  "The photos are real photos of the actual item, taken by you",
                  "The item complies with our Community Guidelines and is not on the prohibited-items list",
                  "The item is legal to sell in Ontario",
                  "The price and accepted payment methods shown on the listing are accurate",
                  "You are able and willing to complete the pickup during the windows you have offered",
                ]}
              />
              <p className="mt-4">
                You are responsible for any taxes that may apply to your sales.
              </p>
            </Section>

            {/* Section 8 */}
            <Section num="8" title="Claiming items (buyers)">
              <p>When you claim an item, you represent and warrant that:</p>
              <CheckList
                items={[
                  "You intend in good faith to pick up and pay for the item",
                  "You will show up at the agreed time or notify the seller promptly if your plans change",
                  "You will inspect the item before paying — once payment changes hands, refunds are at the seller's discretion",
                  "You will treat the seller and the seller's property with respect",
                  "You understand that DropYard is not responsible for the item's quality, fitness, condition, or legality",
                ]}
              />
            </Section>

            {/* Section 9 */}
            <Section num="9" title="Pickups">
              <p>
                All pickups occur <strong>in person</strong> between buyer and
                seller; at the location they agree on (typically the seller&apos;s
                address). By using DropYard, you acknowledge that:
              </p>
              <CheckList
                items={[
                  "You meet at your own risk. DropYard does not supervise or guarantee the safety of any in-person exchange.",
                  "You will exercise reasonable judgement, including preferring daytime pickups and porch or driveway exchanges as the default",
                  "If you are under any threat of harm, contact emergency services (9-1-1) first before contacting us",
                ]}
              />
              <p className="mt-4">
                We strongly encourage following the pickup etiquette set out in our{" "}
                <Link
                  href="/community-guidelines"
                  className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
                >
                  Community Guidelines
                </Link>
                .
              </p>
            </Section>

            {/* Section 10 */}
            <Section num="10" title="Payments between users">
              <Callout tone="green">
                DropYard does <strong>not</strong> process, hold, route, or
                facilitate payments. All payments are made directly between buyer
                and seller, in person, at pickup.
              </Callout>
              <p className="mt-5">
                Sellers choose which methods they accept. The two payment methods
                supported are:
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <PaymentChip label="Cash" />
                <PaymentChip label="Interac e-Transfer" />
              </div>
              <p className="mt-4">
                DropYard does not see or store any payment information, account
                numbers, or transaction details. Any payment disputes are strictly
                between buyer and seller.
              </p>
            </Section>

            {/* Section 11 */}
            <Section num="11" title="Prohibited conduct">
              <p>
                In addition to anything prohibited by our Community Guidelines, you
                agree not to:
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  "Use DropYard for any unlawful purpose or to engage in any unlawful conduct",
                  "Post false, misleading, or fraudulent content",
                  "Impersonate another person, DropYard, or any business",
                  "Use DropYard to stalk, harass, threaten, or intimidate any person",
                  "Reverse engineer, decompile, scrape, or access DropYard by automated means without our prior written consent",
                  "Interfere with the operation of DropYard, including by introducing malware or causing excessive load",
                  "Create accounts to evade a suspension, ban, or other limit",
                  "Solicit users off-platform in a way that circumvents these Terms or our Community Guidelines",
                  "Use DropYard to violate the intellectual property rights of any person",
                ].map((i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-700">
                    <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                      <Icon.X className="h-3 w-3" />
                    </span>
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
              <Callout tone="rose">
                We may suspend or terminate your account for any of the above,
                with or without notice.
              </Callout>
            </Section>

            {/* Section 12 */}
            <Section num="12" title="Your content">
              <p>
                You retain ownership of the photos, descriptions, messages, and
                other content you post on DropYard (&ldquo;Your Content&rdquo;).
              </p>
              <p className="mt-4">
                By posting Your Content, you grant DropYard a{" "}
                <strong>
                  non-exclusive, worldwide, royalty-free, sublicensable license
                </strong>{" "}
                to host, store, display, copy, reproduce, and distribute Your
                Content solely for the purpose of operating, providing, and
                improving DropYard. This license ends when you remove the content
                or close your account, except where the content has been shared
                with other users who may retain copies (for example, a buyer who
                has saved screenshots).
              </p>
              <p className="mt-4">
                You represent and warrant that you have the rights to grant this
                license, and that Your Content does not violate any law or any
                third party&apos;s rights.
              </p>
              <Callout tone="amber">
                You are solely responsible for Your Content. We do not pre-screen
                content but we may remove it if we believe it violates these
                Terms, our Community Guidelines, or applicable law.
              </Callout>

              <h4 className="mt-8 text-[15px] font-bold text-dy-forest">
                12.1 Copyright complaints
              </h4>
              <p className="mt-3">
                If you believe content on DropYard infringes your copyright, send
                us a written notice at <InfoMailLink /> that includes:
              </p>
              <CheckList
                items={[
                  "Identification of the copyrighted work you claim has been infringed",
                  "Identification of the allegedly infringing material (URL or listing ID, if possible)",
                  "Your contact information",
                  "A statement that you have a good-faith belief that the use is not authorized",
                  "A statement that the information in the notice is accurate and that you are the rights holder or authorized to act on the rights holder's behalf",
                ]}
              />
              <p className="mt-4">
                We will handle copyright notices consistent with Canada&apos;s{" "}
                <strong>&ldquo;notice and notice&rdquo;</strong> regime under the
                Copyright Act.
              </p>
            </Section>

            {/* Section 13 */}
            <Section num="13" title="Reporting and enforcement">
              <p>
                If you see content or behaviour that violates these Terms or our{" "}
                <Link
                  href="/community-guidelines"
                  className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
                >
                  Community Guidelines
                </Link>
                , please report it via the in-app Report button or by emailing{" "}
                <InfoMailLink />.
              </p>
              <p className="mt-4">We may, at our discretion:</p>
              <CheckList
                items={[
                  "Remove or hide any content that violates these Terms or the Community Guidelines",
                  "Issue a warning to the user responsible",
                  "Suspend or terminate the account, temporarily or permanently",
                  "Cooperate with law enforcement when a credible safety or legal concern exists",
                ]}
              />
              <p className="mt-4 text-[13px] text-slate-600">
                We are not obligated to take any specific action on every report,
                but we read every one.
              </p>
            </Section>

            {/* Section 14 */}
            <Section num="14" title="Account suspension and termination">
              <p>
                You may close your account at any time by emailing <InfoMailLink />
                .
              </p>
              <p className="mt-4">
                We may suspend or terminate your account, with or without notice,
                if:
              </p>
              <CheckList
                items={[
                  "You violate these Terms or our Community Guidelines",
                  "You provide false information during sign-up or use",
                  "You engage in fraudulent, abusive, or unlawful conduct",
                  "We reasonably believe continued access creates risk to other users or to DropYard",
                  "We discontinue the Service",
                ]}
              />
              <Callout tone="amber">
                When an account is suspended or terminated, your right to use
                DropYard ends immediately. Provisions of these Terms that by their
                nature should survive (including Sections 6, 9, 12, 15, 16, 17,
                18, and 20) will survive termination.
              </Callout>
            </Section>

            {/* Section 15 */}
            <Section num="15" title="DropYard's intellectual property">
              <p>
                The DropYard name, logo, website, app, and underlying software,
                design, and content (other than Your Content) are owned by{" "}
                <strong>DropYard Inc.</strong> and protected by intellectual
                property law. You may not copy, modify, distribute, sell, or
                create derivative works of any of the foregoing without our prior
                written consent, except as needed to use DropYard for its intended
                purpose.
              </p>
            </Section>

            {/* Section 16 */}
            <Section num="16" title="Disclaimers">
              <Callout tone="amber">
                DropYard is provided <strong>&ldquo;as is&rdquo;</strong> and{" "}
                <strong>&ldquo;as available.&rdquo;</strong>
              </Callout>
              <p className="mt-5">
                To the maximum extent permitted by applicable law, DropYard Inc.
                disclaims all warranties of any kind, whether express, implied,
                statutory, or otherwise, including:
              </p>
              <ul className="mt-4 space-y-2.5">
                {[
                  "Warranties of merchantability, fitness for a particular purpose, title, and non-infringement",
                  "Any warranty that the Service will be uninterrupted, secure, error-free, or free of viruses or harmful components",
                  "Any warranty as to the accuracy, reliability, quality, condition, or legality of any listing, item, or user",
                  "Any warranty that buyers will pick up items they claim or that sellers will accurately describe items they list",
                ].map((i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-700">
                    <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <Icon.X className="h-3 w-3" />
                    </span>
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[13px] text-slate-600">
                Some jurisdictions do not allow the exclusion of certain
                warranties, so portions of this section may not apply to you.
                Where exclusions are not permitted, our liability is limited to
                the smallest amount allowed by law.
              </p>
            </Section>

            {/* Section 17 */}
            <Section num="17" title="Limitation of liability">
              <p>To the maximum extent permitted by applicable law:</p>
              <ol className="mt-5 space-y-3">
                <StepItem n={1} title="No indirect damages">
                  DropYard Inc., its officers, employees, founders, contractors,
                  and affiliates will not be liable for any indirect, incidental,
                  consequential, special, exemplary, or punitive damages,
                  including loss of profits, goodwill, data, or substitute
                  services, even if advised of the possibility of such damages.
                </StepItem>
                <StepItem n={2} title="Cap on total liability">
                  Our total cumulative liability to you for any claim arising out
                  of or related to these Terms or your use of DropYard will not
                  exceed the greater of: <strong>(a) CAD $100</strong>, or{" "}
                  <strong>
                    (b) the total amount you have paid to DropYard in the 12
                    months before the claim
                  </strong>{" "}
                  (which, for free users, is zero).
                </StepItem>
                <StepItem n={3} title="Applies broadly">
                  This limitation applies regardless of the legal theory
                  (contract, tort, statute, or otherwise) and even if a remedy
                  fails of its essential purpose.
                </StepItem>
              </ol>
              <p className="mt-5 text-[13px] text-slate-600">
                Some jurisdictions do not allow these limitations. In those
                jurisdictions, our liability is limited to the smallest amount
                permitted by law.
              </p>
            </Section>

            {/* Section 18 */}
            <Section num="18" title="Indemnification">
              <p>
                You agree to indemnify and hold DropYard Inc. (and its officers,
                employees, founders, contractors, and affiliates) harmless from
                any claim, liability, loss, or expense (including reasonable legal
                fees) arising out of or related to:
              </p>
              <CheckList
                items={[
                  "Your use of DropYard",
                  "Your Content",
                  "Your violation of these Terms or the Community Guidelines",
                  "Your violation of any law or any third party's rights",
                  "Your transactions with other DropYard users",
                ]}
              />
              <p className="mt-4">
                We may, at our option, assume the defence of any such claim, and
                you agree to cooperate with our defence.
              </p>
            </Section>

            {/* Section 19 */}
            <Section num="19" title="Changes to these Terms">
              <p>
                We may update these Terms from time to time. For meaningful
                changes, we will give you notice (by email or in-app) at least{" "}
                <strong>30 days</strong> before they take effect. Continued use of
                DropYard after the changes take effect means you accept the new
                Terms. If you do not accept them, please close your account.
              </p>
              <p className="mt-4">
                The &ldquo;Last updated&rdquo; date at the top of this page will
                always tell you when the latest version went live.
              </p>
            </Section>

            {/* Section 20 */}
            <Section num="20" title="Governing law and disputes">
              <p>
                These Terms are governed by the laws of the{" "}
                <strong>Province of Ontario</strong> and the federal laws of
                Canada applicable in Ontario, without regard to conflict-of-laws
                principles.
              </p>
              <Callout tone="green">
                If a dispute arises between you and DropYard, we would much rather
                resolve it directly. Please email <InfoMailLink /> first; most
                issues get resolved that way.
              </Callout>
              <p className="mt-5">
                If we cannot resolve a dispute informally, you and DropYard agree
                to bring any legal action exclusively in the{" "}
                <strong>courts of the City of Ottawa, Ontario</strong>, and you
                consent to the personal jurisdiction of those courts.
              </p>
              <p className="mt-4 text-[13px] text-slate-600">
                Nothing in this section limits your right to pursue available
                remedies before the Office of the Privacy Commissioner of Canada,
                a consumer protection authority, or a small claims court, where
                applicable law allows.
              </p>
            </Section>

            {/* Section 21 */}
            <Section num="21" title="General provisions">
              <div className="mt-2 space-y-4">
                <GeneralRow label="Entire agreement">
                  These Terms, together with our{" "}
                  <Link
                    href="/privacy-policy"
                    className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
                  >
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/community-guidelines"
                    className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
                  >
                    Community Guidelines
                  </Link>
                  , are the entire agreement between you and DropYard Inc.
                  regarding your use of DropYard.
                </GeneralRow>
                <GeneralRow label="Severability">
                  If any provision of these Terms is found unenforceable, the
                  remaining provisions will stay in full effect.
                </GeneralRow>
                <GeneralRow label="No waiver">
                  Our failure to enforce any part of these Terms does not waive
                  our right to enforce it later.
                </GeneralRow>
                <GeneralRow label="Assignment">
                  You may not assign these Terms or any rights under them without
                  our consent. We may assign them, for example in connection with
                  a corporate transaction.
                </GeneralRow>
                <GeneralRow label="No third-party beneficiaries">
                  These Terms are between you and DropYard Inc., and do not
                  create rights for anyone else.
                </GeneralRow>
                <GeneralRow label="Notices">
                  We may send notices to you by email, in-app message, or by
                  posting them at dropyard.app. You can reach us at{" "}
                  <InfoMailLink />.
                </GeneralRow>
                <GeneralRow label="Language">
                  These Terms are provided in English. If a translation is
                  provided for convenience, the English version controls in the
                  event of any conflict.
                </GeneralRow>
              </div>
            </Section>

            {/* Section 22 */}
            <Section num="22" title="Contact us">
              <p>Questions about these Terms? Email <InfoMailLink />.</p>
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-dy-mid text-white shadow-md">
                    <Icon.Doc className="h-5 w-5" />
                  </div>
                  <div>
                    <strong className="block text-dy-forest">DropYard Inc.</strong>
                    <span className="text-[13px] text-slate-600">Ontario, Canada</span>
                  </div>
                </div>
                <a
                  href="mailto:info@dropyard.app"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50 hover:ring-emerald-400"
                >
                  <Icon.Mail className="h-4 w-4" />
                  info@dropyard.app
                </a>
              </div>
              <p className="mt-6 text-[13px] text-slate-600">
                These Terms work alongside our{" "}
                <Link
                  href="/privacy-policy"
                  className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
                >
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link
                  href="/community-guidelines"
                  className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
                >
                  Community Guidelines
                </Link>
                , which together govern your use of DropYard.
              </p>
            </Section>

            <div className="mt-14 border-t border-slate-200 pt-10 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-dy-mid px-6 py-3 text-[13px] font-semibold text-white transition hover:bg-dy-mid hover:shadow-lg hover:-translate-y-0.5"
              >
                <span>&larr;</span> Back to DropYard
              </Link>
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

function SummaryCard({
  accent,
  icon,
  title,
  desc,
}: {
  accent: "green" | "amber" | "violet";
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  const c = accentClasses[accent];
  return (
    <div className="group rounded-2xl bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-[0_15px_50px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} ${c.text} ring-4 ${c.ring} transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <h3 className="font-bold text-dy-forest">{title}</h3>
      </div>
      <p className="mt-3 text-[13px] text-slate-600">{desc}</p>
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

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-wider text-dy-green-strong">
        {title}
      </p>
      <p className="mt-1.5 text-[13px] text-slate-600">{desc}</p>
    </div>
  );
}

function NotCard({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border-2 border-rose-200 bg-rose-50/60 p-4">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white text-rose-700 ring-1 ring-rose-200">
        <Icon.X className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[13px] font-bold text-dy-forest">{label}</p>
        <p className="mt-0.5 text-[11px] text-slate-600">{sub}</p>
      </div>
    </div>
  );
}

function PaymentChip({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-200 bg-emerald-50/60 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-emerald-700 ring-1 ring-emerald-200">
        <Icon.Dollar className="h-5 w-5" />
      </span>
      <p className="text-[13px] font-bold text-dy-forest">{label}</p>
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
        <div className="mt-1 text-[13px] text-slate-600 leading-relaxed">{children}</div>
      </div>
    </li>
  );
}

function GeneralRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-wider text-dy-green-strong">
        {label}
      </p>
      <p className="mt-1.5 text-[13px] text-slate-700 leading-relaxed">{children}</p>
    </div>
  );
}
