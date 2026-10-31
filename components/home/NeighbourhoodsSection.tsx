"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle } from "lucide-react";
import { HOME_NEIGHBOURHOODS, LIVE_NEIGHBOURHOOD } from "@/lib/homeNeighbourhoods";
import { isValidEmail, submitSubmission } from "@/lib/submissions";

const cardClass = "flex h-full w-full flex-col rounded-xl border border-dy-line bg-white p-[clamp(20px,1.55vw,30px)] text-left";

export function NeighbourhoodsSection({ initialRequest, neighbourCount }: { initialRequest: string | null; neighbourCount: number | null }) {
  const [formOpen, setFormOpen] = useState(false);
  const [area, setArea] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedFor, setSubmittedFor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const areaRef = useRef<HTMLInputElement>(null);

  const openFor = (name: string) => {
    setArea(name);
    setSubmittedFor(null);
    setError("");
    setFormOpen(true);
  };

  // ?hood= from the header's neighbourhood picker.
  useEffect(() => {
    if (initialRequest && initialRequest !== LIVE_NEIGHBOURHOOD) openFor(initialRequest);
  }, [initialRequest]);

  useEffect(() => {
    if (formOpen) areaRef.current?.focus({ preventScroll: true });
  }, [formOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const neighbourhood = area.trim();
    if (!neighbourhood) { setError("Tell us which neighbourhood."); return; }
    if (!isValidEmail(email)) { setError("Enter a valid email address."); return; }
    setSubmitting(true);
    setError("");
    try {
      await submitSubmission({
        type: "NEIGHBOURHOOD_WAITLIST",
        source: "homepage-neighbourhood-request",
        payload: { email: email.trim(), neighbourhood },
      });
      setSubmittedFor(neighbourhood);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your request. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = "dy-focus mt-2 w-full rounded border border-dy-line bg-white px-4 py-3 text-[16px] text-dy-forest placeholder:text-dy-muted";

  return (
    <section id="neighbourhoods" aria-labelledby="neighbourhoods-heading" className="dy-section scroll-mt-20 bg-white xl:scroll-mt-[92px]">
      <div className="dy-wrap">
        <p className="dy-eyebrow">Neighbourhoods</p>
        <h2 id="neighbourhoods-heading" className="dy-h2 mt-4">
          Coming to a neighbourhood <span className="text-dy-gold">near you.</span>
        </h2>
        <p className="dy-body mt-5 max-w-[1170px]">
          DropYard is live in {LIVE_NEIGHBOURHOOD} and growing across Ottawa. Don&apos;t see yours? Request it and we&apos;ll bring the Drop to you.
        </p>

        <ul className="mt-[clamp(32px,4.2vw,80px)] grid gap-[clamp(14px,1.55vw,30px)] sm:grid-cols-2 lg:grid-cols-4">
          {HOME_NEIGHBOURHOODS.map((n) => (
            <li key={n.name}>
              {n.live ? (
                <div className={cardClass}>
                  <span className="flex w-fit items-center gap-2 rounded bg-dy-pale px-3 py-1.5 text-[clamp(14px,1.05vw,20px)] text-dy-green-strong">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-red-600" />
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
                <button type="button" onClick={() => openFor(n.name)} className={`${cardClass} dy-focus transition-colors hover:border-dy-green`}>
                  <span className="w-fit rounded bg-[#fdeed0] px-3 py-1.5 text-[clamp(14px,1.05vw,20px)] text-dy-orange-strong">Coming Soon</span>
                  <h3 className="mt-[clamp(20px,2vw,38px)] text-[clamp(24px,1.95vw,38px)] font-semibold text-dy-forest">{n.name}</h3>
                  <span className="dy-body mt-2">Join the waitlist</span>
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
          <div className="mx-auto max-w-2xl rounded-xl border border-dy-line bg-dy-pale p-[clamp(20px,2vw,38px)]">
            {submittedFor ? (
              <p role="status" className="flex items-start gap-3 text-[17px] font-medium text-dy-forest">
                <CheckCircle className="mt-0.5 shrink-0 text-dy-green-strong" size={22} aria-hidden />
                You&apos;re on the list for {submittedFor}. We&apos;ll email {email.trim()} when the Drop gets there.
              </p>
            ) : (
              <form onSubmit={submit} noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-[15px] font-medium text-dy-forest">
                    Neighbourhood
                    <input ref={areaRef} value={area} onChange={(e) => setArea(e.target.value)} maxLength={100} placeholder="e.g. Stittsville" className={fieldClass} />
                  </label>
                  <label className="block text-[15px] font-medium text-dy-forest">
                    Email address
                    <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={fieldClass} />
                  </label>
                </div>
                {error && <p role="alert" className="mt-3 text-[14px] text-red-700">{error}</p>}
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
