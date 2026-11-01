"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const EFFECTIVE_DATE = "May 27, 2026";
const LAST_UPDATED = "May 27, 2026";

const sections = [
  { num: "1",  title: "About DropYard" },
  { num: "2",  title: "Contact" },
  { num: "3",  title: "Information we collect" },
  { num: "4",  title: "Why we collect your information" },
  { num: "5",  title: "Legal basis (PIPEDA)" },
  { num: "6",  title: "What you share with other users" },
  { num: "7",  title: "Sharing with service providers" },
  { num: "8",  title: "Cookies & similar tech" },
  { num: "9",  title: "How long we keep your information" },
  { num: "10", title: "Your rights" },
  { num: "11", title: "How we protect your information" },
  { num: "12", title: "Children's privacy" },
  { num: "13", title: "Jurisdiction & international users" },
  { num: "14", title: "Changes to this policy" },
  { num: "15", title: "Contact us" },
];

// --- ICONS (simple inline svgs, no extra deps) ---
const Icon = {
  Building: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 21V7l9-4 9 4v14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9 21v-6h6v6M9 11h.01M15 11h.01M9 15h.01M15 15h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Mail: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Database: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="2"/><path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Eye: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Scale: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3v18M5 21h14M6 7l-3 7h6l-3-7zM18 7l-3 7h6l-3-7zM4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  Users: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="17" cy="9" r="2" stroke="currentColor" strokeWidth="2"/><path d="M21 19c0-2-2-3.5-4-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Handshake: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 12l4-4 3 3 4-4 4 4-3 3-4 3-4-3-4-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Cookie: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M21 12a9 9 0 11-9-9 5 5 0 005 5 5 5 0 005 5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="8" cy="13" r="1" fill="currentColor"/><circle cx="13" cy="16" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></svg>
  ),
  Clock: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Hand: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M9 11V5a2 2 0 114 0v6M13 11V4a2 2 0 114 0v8M17 11V6a2 2 0 114 0v8a7 7 0 01-7 7h-2a7 7 0 01-7-7v-2a2 2 0 114 0" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></svg>
  ),
  Shield: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  Child: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="7" r="3" stroke="currentColor" strokeWidth="2"/><path d="M12 10v6m-3 5l3-5 3 5M9 13h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Globe: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Refresh: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
};

const sectionMeta: Record<
  string,
  { Icon: any; accent: "green" | "amber" | "violet" | "rose" | "sky" }
> = {
  "1":  { Icon: Icon.Building, accent: "green" },
  "2":  { Icon: Icon.Mail,     accent: "amber" },
  "3":  { Icon: Icon.Database, accent: "violet" },
  "4":  { Icon: Icon.Eye,      accent: "green" },
  "5":  { Icon: Icon.Scale,    accent: "sky" },
  "6":  { Icon: Icon.Users,    accent: "amber" },
  "7":  { Icon: Icon.Handshake,accent: "violet" },
  "8":  { Icon: Icon.Cookie,   accent: "amber" },
  "9":  { Icon: Icon.Clock,    accent: "sky" },
  "10": { Icon: Icon.Hand,     accent: "green" },
  "11": { Icon: Icon.Shield,   accent: "violet" },
  "12": { Icon: Icon.Child,    accent: "rose" },
  "13": { Icon: Icon.Globe,    accent: "sky" },
  "14": { Icon: Icon.Refresh,  accent: "amber" },
  "15": { Icon: Icon.Mail,     accent: "green" },
};

const accentClasses: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
  green:  { bg: "bg-emerald-50",  text: "text-emerald-700",  ring: "ring-emerald-200",  dot: "bg-emerald-500" },
  amber:  { bg: "bg-amber-50",    text: "text-amber-700",    ring: "ring-amber-200",    dot: "bg-amber-500" },
  violet: { bg: "bg-violet-50",   text: "text-violet-700",   ring: "ring-violet-200",   dot: "bg-violet-500" },
  rose:   { bg: "bg-rose-50",     text: "text-rose-700",     ring: "ring-rose-200",     dot: "bg-rose-500" },
  sky:    { bg: "bg-sky-50",      text: "text-sky-700",      ring: "ring-sky-200",      dot: "bg-sky-500" },
};

export default function PrivacyPolicyPage() {
  const [activeId, setActiveId] = useState("section-1");
  const [progress, setProgress] = useState(0);

  // scroll progress bar
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

  // active section highlighting
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
      {/* Reading progress */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-dy-green-strong via-[#3A8E31] to-dy-orange transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-br from-dy-forest via-dy-mid to-dy-green-strong px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {/* dot grid */}
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
        {/* glow blobs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-300/25 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/3 right-10 h-40 w-40 rounded-full bg-emerald-200/15 blur-2xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100 backdrop-blur ring-1 ring-white/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            Legal · PIPEDA-compliant
          </div>

          <h1 className="mt-6 text-[35px] font-semibold tracking-tight text-white sm:text-[47px] lg:text-[59px]">
            Privacy{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-amber-300 to-amber-200 bg-clip-text text-transparent">
                Policy
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-3 rounded bg-amber-400/20 blur-lg" />
            </span>
          </h1>

          <p className="mt-6 text-[17px] leading-relaxed text-emerald-100/95 sm:text-[19px] max-w-2xl mx-auto">
            How <strong className="text-white">DropYard Inc.</strong> collects, uses,
            and protects your personal information — in plain English.
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

        {/* wave bottom */}
        <svg
          className="absolute bottom-0 left-0 right-0 w-full text-dy-pale"
          viewBox="0 0 1440 60"
          fill="currentColor"
          preserveAspectRatio="none"
        >
          <path d="M0 30 Q360 60 720 30 T1440 30 V60 H0 Z" />
        </svg>
      </section>

      {/* QUICK SUMMARY BAR */}
      <section className="px-4 mt-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-6xl grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            accent="green"
            icon={<Icon.Shield className="h-5 w-5" />}
            title="No data sold"
            desc="We don't sell your info to anyone. Ever."
          />
          <SummaryCard
            accent="amber"
            icon={<Icon.Eye className="h-5 w-5" />}
            title="No ad tracking"
            desc="We don't share data with advertisers."
          />
          <SummaryCard
            accent="violet"
            icon={<Icon.Hand className="h-5 w-5" />}
            title="Your data, your call"
            desc="Request, correct, or delete it anytime."
          />
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
            {/* Short version highlight */}
            <div className="relative mb-12 overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 shadow-sm">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-200/30 blur-3xl" />
              <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-dy-green-strong text-white shadow-md">
                    <Icon.Shield className="h-5 w-5" />
                  </div>
                  <h2 className="text-[17px] font-bold text-dy-forest">
                    The short version
                  </h2>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-slate-700">
                  We collect only what we need to run DropYard — your account info,
                  the items you list or claim, and basic technical data.{" "}
                  <strong className="text-dy-forest">We don&apos;t sell your data.</strong>{" "}
                  <strong className="text-dy-forest">We don&apos;t share it with advertisers.</strong>{" "}
                  You can ask us to show, correct, or delete what we have at any
                  time by emailing{" "}
                  <a
                    href="mailto:info@dropyard.app"
                    className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
                  >
                    info@dropyard.app
                  </a>
                  .
                </p>
              </div>
            </div>

            {/* Section 1 */}
            <Section num="1" title="About DropYard">
              <p>
                <DropCap>D</DropCap>ropYard Inc. (&ldquo;DropYard,&rdquo;
                &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates a
                neighbourhood moving-sale marketplace at{" "}
                <a
                  href="https://dropyard.app"
                  className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
                >
                  dropyard.app
                </a>{" "}
                (the &ldquo;Service&rdquo;). DropYard Inc. is incorporated in{" "}
                <strong>Ontario, Canada</strong>.
              </p>
            </Section>

            {/* Section 2 */}
            <Section num="2" title="Contact">
              <p>
                For any privacy-related question, request, or complaint, contact us
                at:
              </p>
              <ContactCard />
            </Section>

            {/* Section 3 */}
            <Section num="3" title="Information we collect">
              <p>We collect information in three ways:</p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <SubCard
                  letter="a"
                  accent="green"
                  title="From you directly"
                  items={[
                    "Account details: name, email, hashed password",
                    "Profile details you add (neighbourhood, phone)",
                    "Item listings: photos, titles, prices, pickup location",
                    "Messages between buyers and sellers",
                    "Support requests and survey responses",
                  ]}
                />
                <SubCard
                  letter="b"
                  accent="amber"
                  title="Automatically"
                  items={[
                    "Device & usage: IP, browser, pages viewed, actions",
                    "Approximate location from your IP",
                    "Cookies for session, auth, and preferences",
                  ]}
                />
                <SubCard
                  letter="c"
                  accent="violet"
                  title="From third parties"
                  items={[
                    "Google OAuth: name and email when you sign in with Google",
                    "Image hosts (e.g. AWS S3) receive your uploaded images",
                  ]}
                />
              </div>
            </Section>

            {/* Section 4 */}
            <Section num="4" title="Why we collect your information">
              <p>We use your information to:</p>
              <CheckList
                items={[
                  "Create and manage your account",
                  "Show your listings and claims to the right people",
                  "Enable messaging between buyers and sellers",
                  "Send transactional emails (claim confirmations, pickup reminders, password resets)",
                  "Improve and secure the Service (analytics, anti-fraud, debugging)",
                  "Comply with legal obligations and enforce our Terms of Service",
                ]}
              />
              <Callout tone="green">
                We do <strong>not</strong> sell your personal information, and we do{" "}
                <strong>not</strong> share it with advertisers.
              </Callout>
            </Section>

            {/* Section 5 */}
            <Section num="5" title="Legal basis (PIPEDA)">
              <p>
                Under Canada&apos;s{" "}
                <strong>
                  Personal Information Protection and Electronic Documents Act
                  (PIPEDA)
                </strong>
                , we collect, use, and disclose your personal information only with
                your knowledge and consent — except where the law allows otherwise
                (for example, to investigate a breach of agreement, comply with a
                court order, or in an emergency that threatens someone&apos;s life or
                safety).
              </p>
              <p className="mt-4">
                By creating an account and using DropYard, you consent to the
                practices described in this Privacy Policy. You may withdraw your
                consent at any time, subject to legal or contractual restrictions,
                by closing your account or contacting us at{" "}
                <a
                  href="mailto:info@dropyard.app"
                  className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
                >
                  info@dropyard.app
                </a>
                .
              </p>
            </Section>

            {/* Section 6 */}
            <Section num="6" title="What you share with other users">
              <p>
                DropYard is a marketplace. To make a sale work, certain info has to
                be visible to the other party:
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <RoleCard
                  role="Sellers"
                  accent="green"
                  desc="see the display name and messages of buyers who claim or ask about their items, plus the pickup contact details the buyer chooses to share."
                />
                <RoleCard
                  role="Buyers"
                  accent="amber"
                  desc="see the seller's display name, item photos, listing details, neighbourhood, and pickup details the seller chooses to share once a claim is confirmed."
                />
              </div>
              <p className="mt-5 text-[13px] text-slate-600">
                You control how much of your real-world contact info you share
                through messaging. Please use your judgment.
              </p>
            </Section>

            {/* Section 7 */}
            <Section num="7" title="Sharing with service providers">
              <p>
                We share limited personal information with vendors who help us run
                the Service. These vendors are contractually required to use your
                data only on our behalf and only for the purposes we specify.
              </p>
              <div className="mt-5 space-y-3">
                <Placeholder>
                  [LIST TO CONFIRM — categories of providers, e.g. hosting, email
                  delivery, image storage]
                </Placeholder>
                <Placeholder>
                  [LIST TO CONFIRM — specific providers and the data they process]
                </Placeholder>
              </div>
              <p className="mt-5">
                We may also disclose information when required by law, regulation,
                valid legal process, or to protect the rights, property, or safety
                of DropYard, our users, or the public.
              </p>
            </Section>

            {/* Section 8 */}
            <Section num="8" title="Cookies & similar tech">
              <p>We use cookies and similar technologies for:</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <UseCard label="Authentication" desc="Keep you signed in (access/refresh tokens stored on your device)" />
                <UseCard label="Preferences"    desc="Remember settings like your neighbourhood" />
                <UseCard label="Security"       desc="Detect abusive behaviour and protect accounts" />
                <UseCard label="Analytics"      desc="Understand how the Service is used so we can improve it" />
              </div>
              <p className="mt-5 text-[13px] text-slate-600">
                You can clear or block cookies through your browser settings, but
                parts of the Service may not work properly without them.
              </p>
            </Section>

            {/* Section 9 */}
            <Section num="9" title="How long we keep your information">
              <p>
                We keep your personal information only as long as it&apos;s needed for
                the purposes described in this policy or to comply with our legal
                obligations.
              </p>
              <CheckList
                items={[
                  "Account data: kept while your account is active and for a reasonable period after closure (fraud prevention, record keeping)",
                  "Transactional records (claims, related messages): may be retained longer to resolve disputes or meet legal obligations",
                  "Logs and analytics: kept for a shorter period and may be aggregated or anonymized",
                ]}
              />
            </Section>

            {/* Section 10 */}
            <Section num="10" title="Your rights">
              <p>You have the right to:</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <RightCard label="Access" desc="See the personal information we hold about you" />
                <RightCard label="Correct" desc="Fix information that is inaccurate or incomplete" />
                <RightCard label="Delete" desc="Request removal, subject to legal and operational limits" />
                <RightCard label="Withdraw consent" desc="Stop our processing at any time" />
              </div>
              <p className="mt-5">
                You can also file a complaint with the{" "}
                <strong>Office of the Privacy Commissioner of Canada</strong> if you
                believe we have not handled your data properly.
              </p>
              <p className="mt-3">
                To exercise any of these rights, email{" "}
                <a
                  href="mailto:info@dropyard.app"
                  className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
                >
                  info@dropyard.app
                </a>
                . We will respond within a reasonable timeframe.
              </p>
            </Section>

            {/* Section 11 */}
            <Section num="11" title="How we protect your information">
              <p>
                We use industry-standard safeguards to protect your information,
                including:
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SafeguardChip label="Encrypted HTTPS" />
                <SafeguardChip label="Hashed passwords" />
                <SafeguardChip label="Restricted DB access" />
                <SafeguardChip label="Routine security review" />
              </div>
              <Callout tone="amber">
                No system is 100% secure. If we ever become aware of a breach
                involving your personal information, we will notify you and the
                appropriate authorities as required by law.
              </Callout>
            </Section>

            {/* Section 12 */}
            <Section num="12" title="Children's privacy">
              <p>
                DropYard is not directed to children under <strong>13</strong>, and
                we do not knowingly collect personal information from children under
                13. If we learn that we have collected personal information from a
                child under 13, we will delete it. If you believe a child has
                provided us with personal information, please contact us at{" "}
                <a
                  href="mailto:info@dropyard.app"
                  className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
                >
                  info@dropyard.app
                </a>
                .
              </p>
            </Section>

            {/* Section 13 */}
            <Section num="13" title="Jurisdiction & international users">
              <p>
                DropYard is operated from <strong>Canada</strong>. If you access the
                Service from outside Canada, you understand that your information
                will be transferred to and processed in Canada (and potentially
                other jurisdictions where our service providers operate), which may
                have different data-protection laws than your home country.
              </p>
            </Section>

            {/* Section 14 */}
            <Section num="14" title="Changes to this policy">
              <p>
                We may update this Privacy Policy from time to time. When we do, we
                will update the &ldquo;Last updated&rdquo; date at the top of this
                page and, where appropriate, notify you through the Service or by
                email. Continued use of DropYard after the changes take effect means
                you accept the revised policy.
              </p>
            </Section>

            {/* Section 15 */}
            <Section num="15" title="Contact us">
              <p>
                Questions, concerns, or feedback about this policy or your
                information? Reach us at:
              </p>
              <ContactCard big />
            </Section>

            {/* CTA */}
            <div className="mt-14 border-t border-slate-200 pt-10 text-center">
              <p className="text-[13px] text-slate-500">
                Thanks for reading. Now go make your neighbourhood a little lighter.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-dy-mid px-6 py-3 text-[13px] font-semibold text-white transition hover:bg-dy-mid hover:shadow-lg hover:-translate-y-0.5"
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
    <div
      id={`section-${num}`}
      className="mt-14 first:mt-0 scroll-mt-24 group"
    >
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
      <div className="mt-5 ml-[64px] space-y-3 leading-relaxed text-slate-700">
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
    <ul className="mt-4 space-y-2">
      {items.map((i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
              <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
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
  tone: "green" | "amber";
  children: React.ReactNode;
}) {
  const styles =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50/70 text-dy-forest"
      : "border-amber-200 bg-amber-50/70 text-dy-forest";
  const dot = tone === "green" ? "bg-emerald-500" : "bg-amber-500";
  return (
    <div className={`mt-5 flex gap-3 rounded-xl border p-4 ${styles}`}>
      <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${dot}`} />
      <p className="text-[13px] leading-relaxed">{children}</p>
    </div>
  );
}

function SubCard({
  letter,
  accent,
  title,
  items,
}: {
  letter: string;
  accent: "green" | "amber" | "violet";
  title: string;
  items: string[];
}) {
  const c = accentClasses[accent];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${c.bg} ${c.text} text-[13px] font-black uppercase`}>
          {letter}
        </span>
        <h4 className="text-[13px] font-bold text-dy-forest">{title}</h4>
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600">
            <span className={`mt-1.5 h-1 w-1 flex-shrink-0 rounded-full ${c.dot}`} />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoleCard({
  role,
  desc,
  accent,
}: {
  role: string;
  desc: string;
  accent: "green" | "amber";
}) {
  const c = accentClasses[accent];
  return (
    <div className={`rounded-2xl border-2 p-5 ${c.bg} ${c.ring.replace("ring-", "border-")}`}>
      <div className="flex items-center gap-2">
        <Icon.Users className={`h-5 w-5 ${c.text}`} />
        <h4 className={`text-[13px] font-black uppercase tracking-wider ${c.text}`}>
          {role}
        </h4>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-slate-700">{desc}</p>
    </div>
  );
}

function UseCard({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-wider text-dy-green-strong">
        {label}
      </p>
      <p className="mt-1.5 text-[13px] text-slate-600">{desc}</p>
    </div>
  );
}

function RightCard({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-dy-green-strong hover:bg-emerald-50/30">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 transition-transform group-hover:scale-110">
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
          <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <p className="text-[13px] font-bold text-dy-forest">{label}</p>
        <p className="mt-0.5 text-[11px] text-slate-600">{desc}</p>
      </div>
    </div>
  );
}

function SafeguardChip({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/60 px-4 py-2">
      <Icon.Shield className="h-4 w-4 text-emerald-700" />
      <span className="text-[11px] font-bold text-dy-forest">{label}</span>
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-4 text-[13px] italic text-amber-800">
      <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 flex-shrink-0">
        <path d="M12 9v4m0 4h.01M10.3 3.86l-8.4 14a2 2 0 001.7 3h16.8a2 2 0 001.7-3l-8.4-14a2 2 0 00-3.4 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

function ContactCard({ big = false }: { big?: boolean }) {
  return (
    <div className={`mt-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 ${big ? "sm:p-6" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-dy-mid text-white shadow-md">
          <Icon.Building className="h-5 w-5" />
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
  );
}
