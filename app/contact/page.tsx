"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { submitSubmission, isValidEmail, type SubmissionType } from "@/lib/submissions";

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
  Chat: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M21 12a8 8 0 11-3.2-6.4L21 4l-1.4 3.4A8 8 0 0121 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Bulb: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M9 21h6M10 18h4M8 14a6 6 0 118 0c-1 1-1 2-1 3H9c0-1 0-2-1-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></svg>
  ),
  Map: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6zM9 4v16M15 6v16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Handshake: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M11 17l-5-5 4-4 3 3 4-4 5 5-4 4-3-3-4 4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Press: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Bug: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><rect x="7" y="8" width="10" height="12" rx="5" stroke="currentColor" strokeWidth="2"/><path d="M12 8V4M8 4l1 3M16 4l-1 3M3 12h4M17 12h4M3 18h3M18 18h3M3 6h4M17 6h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Pin: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 22s-7-7-7-12a7 7 0 0114 0c0 5-7 12-7 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Clock: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Arrow: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  Send: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  Copy: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Check: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
  ),
  Heart: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
};

const TOPICS = [
  { id: "general",     label: "General question",       subject: "General question",          icon: <Icon.Chat className="h-5 w-5" />,      accent: "green"  as const, hint: "Anything about how DropYard works",            type: "CONTACT_GENERAL"       as SubmissionType },
  { id: "report",      label: "Report a listing or user", subject: "Report",                  icon: <Icon.Flag className="h-5 w-5" />,      accent: "rose"   as const, hint: "Something that breaks our Guidelines",        type: "CONTACT_REPORT"        as SubmissionType },
  { id: "bug",         label: "Report a bug",            subject: "Bug report",               icon: <Icon.Bug className="h-5 w-5" />,       accent: "amber"  as const, hint: "Something on DropYard isn't working",          type: "CONTACT_BUG"           as SubmissionType },
  { id: "feature",     label: "Suggest a feature",       subject: "Feature idea",             icon: <Icon.Bulb className="h-5 w-5" />,      accent: "violet" as const, hint: "Something you wish DropYard had",              type: "CONTACT_FEATURE"       as SubmissionType },
  { id: "neighbourhood", label: "Suggest a neighbourhood", subject: "Launch suggestion",      icon: <Icon.Map className="h-5 w-5" />,       accent: "amber"  as const, hint: "Where should DropYard go next?",               type: "CONTACT_NEIGHBOURHOOD" as SubmissionType },
  { id: "partner",     label: "Partnerships",             subject: "Partnership inquiry",     icon: <Icon.Handshake className="h-5 w-5" />, accent: "green"  as const, hint: "Brands, community groups, charities",          type: "CONTACT_PARTNER"       as SubmissionType },
  { id: "press",       label: "Press & media",            subject: "Press inquiry",           icon: <Icon.Press className="h-5 w-5" />,     accent: "sky"    as const, hint: "Stories, interviews, quotes",                  type: "CONTACT_PRESS"         as SubmissionType },
  { id: "other",       label: "Something else",           subject: "Hello",                   icon: <Icon.Heart className="h-5 w-5" />,     accent: "rose"   as const, hint: "Just say hi",                                  type: "CONTACT_OTHER"         as SubmissionType },
];

const VALID_TOPIC_IDS = new Set(TOPICS.map((t) => t.id));

const accentClasses: Record<string, { bg: string; text: string; ring: string; dot: string; border: string }> = {
  green:  { bg: "bg-emerald-50",  text: "text-emerald-700",  ring: "ring-emerald-200",  dot: "bg-emerald-500", border: "border-emerald-200" },
  amber:  { bg: "bg-amber-50",    text: "text-amber-700",    ring: "ring-amber-200",    dot: "bg-amber-500",   border: "border-amber-200" },
  violet: { bg: "bg-violet-50",   text: "text-violet-700",   ring: "ring-violet-200",   dot: "bg-violet-500",  border: "border-violet-200" },
  rose:   { bg: "bg-rose-50",     text: "text-rose-700",     ring: "ring-rose-200",     dot: "bg-rose-500",    border: "border-rose-200" },
  sky:    { bg: "bg-sky-50",      text: "text-sky-700",      ring: "ring-sky-200",      dot: "bg-sky-500",     border: "border-sky-200" },
};

export default function ContactPage() {
  const searchParams = useSearchParams();
  const [topicId, setTopicId] = useState<string>("general");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Preselect topic from ?topic=<id> (used by /help-center cards that funnel here).
  useEffect(() => {
    const t = searchParams.get("topic");
    if (t && VALID_TOPIC_IDS.has(t)) setTopicId(t);
  }, [searchParams]);

  // Reset success state if the user switches topic to write another message.
  useEffect(() => {
    setSubmitted(false);
    setError("");
  }, [topicId]);

  const topic = TOPICS.find((t) => t.id === topicId)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please write a message before sending.");
      return;
    }
    if (email && !isValidEmail(email)) {
      setError("That email address doesn't look right.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await submitSubmission({
        type: topic.type,
        source: "contact-page",
        payload: {
          topicId: topic.id,
          subject: topic.subject,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          message: message.trim(),
        },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setMessage("");
    setName("");
    setEmail("");
  };

  const copyEmail = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("info@dropyard.app");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <main className="min-h-screen bg-dy-pale">
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
            A real person answers
          </div>

          <h1 className="mt-6 text-[35px] font-semibold tracking-tight text-white sm:text-[47px] lg:text-[59px]">
            Let&apos;s{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-amber-300 to-amber-200 bg-clip-text text-transparent">
                talk
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-3 rounded bg-amber-400/20 blur-lg" />
            </span>
            .
          </h1>

          <p className="mt-6 text-[17px] leading-relaxed text-emerald-100/95 sm:text-[19px] max-w-2xl mx-auto">
            Questions, ideas, problems, or just a hello. We&apos;d love to hear
            from you — usually within{" "}
            <strong className="text-white">one business day</strong>.
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

      {/* QUICK CONTACT CARDS */}
      <section className="px-4 mt-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-6xl grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Email card */}
          <div className="group rounded-2xl bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-[0_15px_50px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-4 ring-emerald-200 transition-transform group-hover:scale-110">
                <Icon.Mail className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-dy-forest">Email us</h3>
                <p className="text-[11px] text-slate-500">A real person reads every message</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <a
                href="mailto:info@dropyard.app"
                className="flex-1 truncate rounded-lg bg-emerald-50 px-3 py-2.5 text-[13px] font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
              >
                info@dropyard.app
              </a>
              <button
                onClick={copyEmail}
                aria-label="Copy email"
                className={`flex h-11 w-11 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg border transition ${
                  copied
                    ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-700"
                }`}
              >
                {copied ? <Icon.Check className="h-4 w-4" /> : <Icon.Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Report card */}
          <div className="group rounded-2xl bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-[0_15px_50px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-4 ring-amber-200 transition-transform group-hover:scale-110">
                <Icon.Flag className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-dy-forest">Report</h3>
                <p className="text-[11px] text-slate-500">Anonymous in-app reporting</p>
              </div>
            </div>
            <p className="mt-4 text-[13px] text-slate-600">
              Use the in-app <strong>Report</strong> button on any listing,
              message, or profile. Or email{" "}
              <a href="mailto:info@dropyard.app" className="font-semibold text-emerald-700 underline-offset-4 hover:underline">
                info@dropyard.app
              </a>
              .
            </p>
          </div>

          {/* Emergency card */}
          <div className="group rounded-2xl bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-[0_15px_50px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700 ring-4 ring-rose-200 transition-transform group-hover:scale-110">
                <Icon.Phone className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-dy-forest">Emergency</h3>
                <p className="text-[11px] text-slate-500">Always call 9-1-1 first</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border-2 border-rose-200 bg-rose-50/60 px-4 py-2.5 text-center">
              <p className="text-[23px] font-black tracking-tight text-rose-700">9-1-1</p>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN: TOPIC PICKER + FORM */}
      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700 ring-1 ring-emerald-200">
              <Icon.Mail className="h-4 w-4" />
              Start a message
            </div>
            <h2 className="mt-5 text-[29px] font-semibold tracking-tight text-dy-forest sm:text-[35px]">
              Pick a topic, write a note.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] text-slate-600 sm:text-[17px]">
              Pick a topic, write a note, and hit send. A real person reads
              every message — usually within one business day.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_460px]">
            {/* TOPIC GRID */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-dy-green-strong mb-4">
                What&apos;s this about?
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {TOPICS.map((t) => {
                  const c = accentClasses[t.accent];
                  const isActive = t.id === topicId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTopicId(t.id)}
                      className={`group flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                        isActive
                          ? `${c.border} ${c.bg} shadow-md -translate-y-0.5`
                          : "border-slate-200 bg-white hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-sm"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition ${
                          isActive
                            ? `bg-white ${c.text} ring-1 ${c.ring}`
                            : `${c.bg} ${c.text} ring-4 ${c.ring} group-hover:scale-105`
                        }`}
                      >
                        {t.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-bold text-dy-forest">
                          {t.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-500">
                          {t.hint}
                        </span>
                      </span>
                      {isActive && (
                        <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white ${c.text} ring-1 ${c.ring}`}>
                          <Icon.Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FORM */}
            <div className="rounded-3xl bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,0.06)] border border-slate-100">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-dy-green-strong">
                <Icon.Send className="h-4 w-4" />
                Your message
              </div>

              <div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-200">
                <p className="text-[11px] text-emerald-800">
                  <strong>Subject:</strong> {topic.subject}
                </p>
              </div>

              {submitted ? (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-4 ring-emerald-200">
                    <Icon.Check className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-[15px] font-bold text-dy-forest">
                    Message received.
                  </p>
                  <p className="mt-1.5 text-[13px] text-slate-600">
                    {email
                      ? <>We&apos;ll get back to you at <strong>{email}</strong> within one business day.</>
                      : <>We&apos;ll read it within one business day. Add a reply-to email next time if you&apos;d like a response.</>}
                  </p>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700 hover:text-emerald-900"
                  >
                    Send another message
                    <Icon.Arrow className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="mt-5 space-y-4">
                    <Field label="Your name (optional)">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jamie from Barrhaven"
                        disabled={submitting}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-700 placeholder-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                      />
                    </Field>

                    <Field label="Reply-to email (optional)">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                        placeholder="you@example.com"
                        disabled={submitting}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-700 placeholder-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                      />
                    </Field>

                    <Field label="Message">
                      <textarea
                        value={message}
                        onChange={(e) => { setMessage(e.target.value); if (error) setError(""); }}
                        rows={6}
                        placeholder="Tell us what's on your mind..."
                        disabled={submitting}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-700 placeholder-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
                      />
                    </Field>
                  </div>

                  {error && (
                    <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2">
                      <p className="text-[12px] text-rose-700 font-medium">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-dy-mid px-6 py-3.5 text-[13px] font-bold text-white transition hover:bg-dy-mid hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-dy-mid"
                  >
                    <Icon.Send className="h-4 w-4" />
                    {submitting ? "Sending..." : "Send message"}
                  </button>
                  <p className="mt-3 text-center text-[11px] text-slate-500">
                    A real person reads every message. We usually reply within
                    one business day.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* INFO STRIP — response time, location, team */}
      <section className="relative px-4 py-10 sm:px-6 sm:py-12 lg:px-8 bg-gradient-to-b from-white to-dy-pale overflow-hidden">
        <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-emerald-200/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-amber-200/20 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-6xl grid gap-6 md:grid-cols-3">
          {/* Response times */}
          <div className="rounded-3xl bg-white p-7 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-4 ring-emerald-200">
                <Icon.Clock className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-dy-forest">Response times</h3>
            </div>
            <div className="mt-4 space-y-2.5 text-[13px]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-slate-700">General — <strong>1 business day</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-slate-700">Reports — <strong>often faster</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-slate-700">Urgent — <strong>call 9-1-1 first</strong></span>
              </div>
            </div>
          </div>

          {/* Where we are */}
          <div className="relative overflow-hidden rounded-3xl p-7 bg-gradient-to-br from-dy-forest via-dy-mid to-dy-green-strong text-white shadow-lg">
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-amber-300/20 blur-2xl" />
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/20">
                <Icon.Pin className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-bold">Where we are</h3>
              <p className="mt-2 text-[13px] text-emerald-100/90 leading-relaxed">
                Built in Barrhaven, for Barrhaven first. Headquartered close
                enough to wave at our users on a Saturday.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1.5 ring-1 ring-white/20">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-200">
                  Barrhaven · Ottawa · Ontario
                </span>
              </div>
            </div>
          </div>

          {/* Meet the team */}
          <div className="rounded-3xl bg-white p-7 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-4 ring-violet-200">
                <Icon.Heart className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-dy-forest">Two-person team</h3>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-[11px] font-black text-white ring-2 ring-emerald-200">
                AA
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-[11px] font-black text-dy-forest ring-2 ring-amber-200">
                NS
              </span>
              <p className="text-[13px] text-slate-600">
                Anthony &amp; Narveer answer the mailbox themselves.
              </p>
            </div>
            <Link
              href="/about"
              className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-emerald-700 hover:text-emerald-900 group"
            >
              Meet the founders
              <Icon.Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* SELF-SERVE LINKS */}
      <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-dy-green-strong">
            Before you write
          </p>
          <h3 className="mt-3 text-[19px] font-semibold tracking-tight text-dy-forest sm:text-[23px]">
            A lot of common questions are already answered.
          </h3>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <QuickLink
              href="/faq"
              label="FAQ"
              desc="How the Drop works, payments, pickup"
            />
            <QuickLink
              href="/community-guidelines"
              label="Community Guidelines"
              desc="What you can list and how disputes work"
            />
            <QuickLink
              href="/help-center"
              label="Help Center"
              desc="Two-way help — get help or give help"
            />
          </div>
        </div>
      </section>

      {/* FOOTER NOTE */}
      <section className="px-4 pb-10 sm:px-6 sm:pb-12 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto h-px w-24 bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />
          <p className="mt-6 text-[13px] text-slate-600">
            <strong className="text-dy-forest">DropYard Inc.</strong> · Barrhaven,
            Ottawa · Ontario, Canada
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            See our{" "}
            <Link
              href="/privacy-policy"
              className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
            >
              Privacy Policy
            </Link>{" "}
            for how we handle messages you send us.
          </p>

          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 text-[13px] font-semibold text-dy-mid hover:text-dy-mid"
          >
            <span>&larr;</span> Back to DropYard
          </Link>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
      </span>
      {children}
    </label>
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
      className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50/40 hover:-translate-y-0.5"
    >
      <div>
        <p className="text-[13px] font-bold text-dy-forest">{label}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{desc}</p>
      </div>
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition-transform group-hover:translate-x-1">
        <Icon.Arrow className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
