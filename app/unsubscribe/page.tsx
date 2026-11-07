"use client";

// BUG-071 — Public one-click unsubscribe page.
// Reads the ?token=… query param, POSTs it to the backend, and shows a
// status message. Idempotent: visiting twice still works.

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// BUG-075 — useSearchParams() needs to be wrapped in a Suspense boundary
// per Next.js 16. Without this, every visit prints a console error and
// `next build` fails. Outer export only renders Suspense; inner component
// reads the search params.
export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#f9fbf9] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <Loader2 size={28} className="mx-auto text-slate-400 animate-spin" />
          <p className="mt-4 text-[14px] text-slate-600">Loading…</p>
        </div>
      </main>
    }>
      <UnsubscribeInner />
    </Suspense>
  );
}

function UnsubscribeInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const isReminders = params.get("type") === "drop-reminders";
  const [state, setState]   = useState<"loading" | "done" | "already" | "invalid">("loading");
  const [email, setEmail]   = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}${isReminders ? "/api/drop-reminders/unsubscribe" : "/api/email-subscriptions/unsubscribe"}`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ token }),
        });
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMsg(typeof data?.error === "string" ? data.error : "Could not process this unsubscribe link.");
          setState("invalid");
          return;
        }
        if (data?.email) setEmail(data.email);
        setState(data?.alreadyOff ? "already" : "done");
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Network error.");
        setState("invalid");
      }
    })();
    return () => { cancelled = true; };
  }, [token, isReminders]);

  // "Remind me" emails before the Saturday Drop: their own switch, separate
  // from the newsletter, turned off by a signed link (?type=drop-reminders).
  if (isReminders && (state === "done" || state === "already")) {
    return (
      <main className="min-h-screen bg-[#f9fbf9] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <CheckCircle2 size={32} className={`mx-auto ${state === "done" ? "text-emerald-600" : "text-slate-400"}`} />
          <h1 className="mt-3 text-[20px] font-bold text-slate-900">
            {state === "done" ? <>Drop reminders are off.</> : <>Drop reminders were already off.</>}
          </h1>
          <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
            We won&rsquo;t email you before the Saturday Drop anymore. Your other DropYard emails aren&rsquo;t affected.
          </p>
          <p className="mt-4 text-[12px] text-slate-500">Changed your mind? Tap &ldquo;Remind me&rdquo; on the Discover page to turn them back on.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f9fbf9] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        {state === "loading" && (
          <>
            <Loader2 size={28} className="mx-auto text-slate-400 animate-spin" />
            <p className="mt-4 text-[14px] text-slate-600">Processing…</p>
          </>
        )}

        {state === "done" && (
          <>
            <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
            <h1 className="mt-3 text-[20px] font-bold text-slate-900">You&rsquo;ve been unsubscribed.</h1>
            <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
              {email
                ? <>We&rsquo;ll stop emailing <span className="font-semibold">{email}</span> about DropYard drops.</>
                : <>We&rsquo;ll stop emailing you about DropYard drops.</>}
            </p>
            <p className="mt-4 text-[12px] text-slate-500">Changed your mind? Re-subscribe anytime from the homepage.</p>
          </>
        )}

        {state === "already" && (
          <>
            <CheckCircle2 size={32} className="mx-auto text-slate-400" />
            <h1 className="mt-3 text-[20px] font-bold text-slate-900">You&rsquo;re already unsubscribed.</h1>
            <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
              {email
                ? <>No further emails will be sent to <span className="font-semibold">{email}</span>.</>
                : <>No further emails will be sent to this address.</>}
            </p>
          </>
        )}

        {state === "invalid" && (
          <>
            <AlertCircle size={32} className="mx-auto text-rose-500" />
            <h1 className="mt-3 text-[20px] font-bold text-slate-900">This unsubscribe link isn&rsquo;t valid.</h1>
            <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
              {errorMsg ?? "The link may have expired or already been used."}
              {" "}If you keep getting our emails, reply to the most recent one and we&rsquo;ll handle it manually.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
