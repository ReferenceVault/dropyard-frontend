"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle } from "lucide-react";
import { HOME_NEIGHBOURHOODS, LIVE_NEIGHBOURHOOD } from "@/lib/homeNeighbourhoods";
import { isValidEmail, submitSubmission } from "@/lib/submissions";

const cardClass = "flex h-full w-full flex-col rounded-2xl border border-dy-line bg-white p-[clamp(20px,1.55vw,30px)] text-left";

export function NeighbourhoodsSection({ initialRequest, neighbourCount }: { initialRequest: string | null; neighbourCount: number | null }) {
  const [formOpen, setFormOpen] = useState(false);
  const [area, setArea] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedFor, setSubmittedFor] = useState<string | null>(null);
  const [error, setError] = useState("");
  // Which field the error is about, so it can be marked and focused.
  const [errorField, setErrorField] = useState<"area" | "email" | null>(null);
  const areaRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const openFor = (name: string) => {
    setArea(name);
    setSubmittedFor(null);
    setError("");
    setErrorField(null);
    setFormOpen(true);
  };

  const fail = (message: string, field: "area" | "email" | null) => {
    setError(message);
    setErrorField(field);
    if (field === "area") areaRef.current?.focus();
    if (field === "email") emailRef.current?.focus();
  };

  // ?hood= from the header's neighbourhood picker.
  useEffect(() => {
    if (initialRequest && initialRequest !== LIVE_NEIGHBOURHOOD) openFor(initialRequest);
  }, [initialRequest]);

  useEffect(() => {
    if (formOpen) areaRef.current?.focus({ preventScroll: true });
  }, [formOpen]);

  // Back from the confirmation ("Request another neighbourhood"): the panel
  // was already open, so the effect above doesn't run — focus here instead.
  const wasSubmitted = useRef(false);
  useEffect(() => {
    if (submittedFor === null && wasSubmitted.current) areaRef.current?.focus({ preventScroll: true });
    wasSubmitted.current = submittedFor !== null;
  }, [submittedFor]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const neighbourhood = area.trim();
    if (!neighbourhood) { fail("Tell us which neighbourhood.", "area"); return; }
    if (!isValidEmail(email)) { fail("Enter a valid email address.", "email"); return; }
    setSubmitting(true);
    setError("");
    setErrorField(null);
    try {
      // Stored server-side as a NEIGHBOURHOOD_WAITLIST submission (admin
      // Inbox). The server validates both fields again and treats a repeat
      // of the same email + neighbourhood as the same entry.
      await submitSubmission({
        type: "NEIGHBOURHOOD_WAITLIST",
        source: "homepage-neighbourhood-request",
        payload: { email: email.trim(), neighbourhood },
      });
      setSubmittedFor(neighbourhood);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save your request. Try again.";
      // Server-side validation messages name their field.
      fail(message, /neighbourhood/i.test(message) ? "area" : /email/i.test(message) ? "email" : null);
    } finally {
      setSubmitting(false);
    }
  };

  // 8px corners, the same as every button.
  const fieldClass = "dy-focus mt-2 w-full rounded-(--radius-sm) border border-dy-line bg-white px-4 py-3 text-[16px] text-dy-forest placeholder:text-dy-muted";

  return (
    // A soft pale glow in the top-right corner keeps the white section from
    // reading as an empty page.
    <section id="neighbourhoods" aria-labelledby="neighbourhoods-heading" className="dy-section scroll-mt-20 bg-white bg-[radial-gradient(55%_45%_at_100%_0%,var(--color-dy-pale)_0%,transparent_100%)] xl:scroll-mt-[92px]">
      <div className="dy-wrap">
        <p className="dy-eyebrow">Neighbourhoods</p>
        <h2 id="neighbourhoods-heading" className="dy-h2 mt-4">
          Coming to a neighbourhood <span className="text-dy-accent">near you.</span>
        </h2>
        <p className="dy-body mt-5 max-w-[1170px]">
          DropYard is live in {LIVE_NEIGHBOURHOOD} and growing across Ottawa. Don&apos;t see yours? Request it and we&apos;ll bring the Drop to you.
        </p>

        <ul className="mt-[clamp(32px,4.2vw,80px)] grid gap-[clamp(14px,1.55vw,30px)] sm:grid-cols-2 lg:grid-cols-4">
          {HOME_NEIGHBOURHOODS.map((n) => (
            <li key={n.name}>
              {n.live ? (
                // The live neighbourhood stands apart from the waitlist ones:
                // pale-green fill, green border, pulsing dot.
                <div className={`${cardClass} border-dy-green-strong/45! bg-dy-pale!`}>
                  <span className="flex w-fit items-center gap-2 rounded-(--radius-sm) bg-white px-3 py-1.5 text-[clamp(14px,1.05vw,20px)] font-semibold text-dy-green-strong ring-1 ring-dy-line">
                    <span aria-hidden className="dy-live-dot h-1.5! w-1.5!" />
                    Live Now
                  </span>
                  <h3 className="mt-[clamp(20px,2vw,38px)] text-[clamp(24px,1.95vw,38px)] font-semibold text-dy-forest">{n.name}</h3>
                  <p className="dy-body mt-2">
                    {neighbourCount
                      ? <><span className="font-bold text-dy-green-strong">{neighbourCount.toLocaleString()}</span> neighbours</>
                      : "Drops every Saturday"}
                  </p>
                </div>
              ) : (
                // Dashed until hovered: "not here yet", inviting a click.
                <button type="button" onClick={() => openFor(n.name)} className={`${cardClass} dy-focus group border-dashed transition-colors hover:border-solid hover:border-dy-green`}>
                  <span className="w-fit rounded-(--radius-sm) bg-[#fef1d8] px-3 py-1.5 text-[clamp(14px,1.05vw,20px)] font-semibold text-dy-orange-strong">Coming Soon</span>
                  <h3 className="mt-[clamp(20px,2vw,38px)] text-[clamp(24px,1.95vw,38px)] font-semibold text-dy-forest">{n.name}</h3>
                  <span className="dy-body mt-2 inline-flex items-center gap-2 group-hover:text-dy-green-strong">
                    Join the waitlist
                    <ArrowRight aria-hidden className="h-[0.9em] w-[0.9em] transition-transform motion-safe:group-hover:translate-x-1" />
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-[clamp(32px,4.2vw,80px)] text-center">
          {!formOpen && (
            <button type="button" onClick={() => openFor("")} aria-expanded={false} className="dy-btn dy-btn--primary dy-focus">
              Request Your Neighbourhood
            </button>
          )}
        </div>

        {formOpen && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-dy-line bg-dy-pale p-[clamp(20px,2vw,38px)]">
            {submittedFor ? (
              <div>
                <p role="status" className="flex items-start gap-3 text-[17px] font-medium text-dy-forest">
                  <CheckCircle className="mt-0.5 shrink-0 text-dy-green-strong" size={22} aria-hidden />
                  You&apos;re on the list for {submittedFor}. We&apos;ll email {email.trim().toLowerCase()} when the Drop gets there.
                </p>
                {/* Otherwise the success state is a dead end: the request button
                    stays hidden while the panel is open. */}
                <button type="button" onClick={() => openFor("")} className="dy-focus mt-4 rounded px-2 py-2 text-[15px] font-medium text-dy-green-strong underline-offset-4 hover:underline">
                  Request another neighbourhood
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-[15px] font-medium text-dy-forest">
                    Neighbourhood
                    <input
                      ref={areaRef} value={area} maxLength={100} placeholder="e.g. Stittsville"
                      onChange={(e) => { setArea(e.target.value); if (errorField === "area") { setError(""); setErrorField(null); } }}
                      aria-invalid={errorField === "area" || undefined}
                      aria-describedby={errorField === "area" ? "hood-request-error" : undefined}
                      className={`${fieldClass} ${errorField === "area" ? "border-red-500" : ""}`}
                    />
                  </label>
                  <label className="block text-[15px] font-medium text-dy-forest">
                    Email address
                    <input
                      ref={emailRef} type="email" autoComplete="email" value={email} placeholder="you@email.com"
                      onChange={(e) => { setEmail(e.target.value); if (errorField === "email") { setError(""); setErrorField(null); } }}
                      aria-invalid={errorField === "email" || undefined}
                      aria-describedby={errorField === "email" ? "hood-request-error" : undefined}
                      className={`${fieldClass} ${errorField === "email" ? "border-red-500" : ""}`}
                    />
                  </label>
                </div>
                {error && <p id="hood-request-error" role="alert" className="mt-3 text-[14px] text-red-700">{error}</p>}
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <button type="submit" disabled={submitting} className="dy-btn dy-btn--primary dy-focus disabled:opacity-60">
                    {submitting ? "Sending..." : "Send Request"}
                  </button>
                  <button type="button" onClick={() => setFormOpen(false)} className="dy-focus rounded px-2 py-2 text-[15px] font-medium text-dy-muted hover:text-dy-forest">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
