"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, ArrowRight, Shield, KeyRound, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AdminLoginPage() {
  const router = useRouter();
  const { signin, clearAuth, user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Symmetric guard mirroring /join: any signed-in user landing on
  // /admin/login (back button, deep link, stale tab) gets bounced to their
  // dashboard. Admins go to /admin; everyone else to /buyer.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(user.role === "ADMIN" ? "/admin" : "/buyer");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const signedIn = await signin(email, password);
      if (signedIn.role !== "ADMIN") {
        // Don't leave non-admin tokens in localStorage — signing them in
        // here would let them navigate to /buyer in the same tab while the
        // admin form rejected them, which is confusing. clearAuth wipes
        // local state without the redirect that signout() triggers, so the
        // error message below stays visible on the form.
        clearAuth();
        setError("This account doesn't have admin access.");
        return;
      }
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-dy-pale p-4 lg:p-6">
      <div className="w-full max-w-6xl mx-auto h-full bg-white rounded-3xl shadow-[0_30px_80px_rgba(11,47,32,0.10)] overflow-hidden grid grid-cols-1 lg:grid-cols-2 ring-1 ring-emerald-100">
        {/* LEFT — BRAND PANEL */}
        <div
          className="relative hidden lg:flex flex-col justify-between px-12 py-12 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #F3F8F3 0%, #ecf5ed 45%, #def0e0 100%)",
          }}
        >
          {/* subtle dot grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(11,47,32,0.08) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* soft brand glows */}
          <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-dy-green-strong/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-dy-orange/15 blur-3xl pointer-events-none" />

          {/* TOP brand bar (small) */}
          <div className="relative z-10 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-dy-forest/60">DropYard</span>
            <span className="h-px flex-1 max-w-[80px] bg-dy-forest/15" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-dy-green-strong">Admin</span>
          </div>

          {/* CENTER: logo circle + tagline */}
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Outer halo */}
            <div className="relative">
              <div
                className="absolute inset-0 -m-10 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(255,148,18,0.12) 0%, transparent 70%)" }}
              />
              {/* Big logo circle */}
              <div className="relative flex h-56 w-56 items-center justify-center rounded-full bg-white/70 backdrop-blur-sm border-2 border-white shadow-[0_25px_60px_rgba(11,47,32,0.10)]">
                <img src="/Logo_1.png" alt="DropYard" className="h-40 w-40 object-contain" />
              </div>
            </div>

            {/* Decorative serif quote mark */}
            <span aria-hidden="true" className="font-serif mt-6 text-[64px] leading-none text-dy-forest/15 select-none">
              &ldquo;
            </span>

            {/* Tagline */}
            <h2 className="font-serif text-3xl font-medium tracking-tight text-dy-forest -mt-5">
              Built for neighbourhoods.
            </h2>
            <p className="font-serif italic text-2xl text-dy-orange mt-1">
              Run with care.
            </p>
          </div>

          {/* BOTTOM footnote */}
          <div className="relative z-10 flex items-center justify-center gap-2 text-[12px] text-dy-forest/70 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-dy-orange" />
            DropYard neighbourhood marketplace · stewarded with care
          </div>
        </div>

        {/* RIGHT — FORM PANEL */}
        <div className="relative px-8 py-10 sm:px-12 sm:py-14 flex flex-col">
          {/* Top row: 3 dots + secure label */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-dy-green-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-dy-orange" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
              Secure Sign-in
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-4xl font-medium tracking-tight text-dy-forest">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Sign in with your admin email to continue.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="admin-email" className="block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@dropyard.app"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-dy-pale text-slate-900 placeholder-slate-400 focus:outline-none focus:border-dy-green-strong focus:ring-2 focus:ring-dy-green-strong/15 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-dy-pale text-slate-900 placeholder-slate-400 focus:outline-none focus:border-dy-green-strong focus:ring-2 focus:ring-dy-green-strong/15 focus:bg-white transition"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2">
                <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-rose-500 flex-shrink-0" />
                <p className="text-xs text-rose-700 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-bold tracking-wider uppercase text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_15px_35px_rgba(47,138,34,0.25)] active:scale-[0.99] hover:shadow-[0_18px_42px_rgba(47,138,34,0.32)]"
              style={{
                background: "linear-gradient(135deg, #33802B 0%, #2C6126 100%)",
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Trust badges */}
          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-center gap-5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Shield size={11} className="text-dy-green-strong" /> Secure
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1.5">
              <KeyRound size={11} className="text-dy-green-strong" /> Encrypted
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1.5">
              <EyeOff size={11} className="text-dy-green-strong" /> Private
            </span>
          </div>

          {/* Footer */}
          <p className="mt-4 text-center text-[11px] text-slate-400">
            © 2026 DropYard Inc. ·{" "}
            <a href="/join" className="text-slate-600 font-semibold hover:underline">
              Buyer / Seller sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
