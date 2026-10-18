"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  User,
  Zap,
  Shield,
  Users,
  Heart,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signin, signup, signInWithGoogle, user, loading: authLoading } = useAuth();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  // Every path out of /join lands on the dashboard, and the dashboard opens
  // in buyer mode by default. A seller CTA that routes through here therefore
  // dropped the user on the buyer side — "Sell with DropYard" on the landing
  // page did exactly that. ?as=seller carries that intent through to the
  // dashboard, which reads it as ?mode=seller.
  const dashboardHref = useCallback(
    (role?: string) => {
      if (role === "ADMIN") return "/admin";
      // ?item=<id> means the visitor was trying to claim a specific listing
      // and got sent here to sign in first. Hand it back so the dashboard
      // opens that item instead of a generic feed (BUG-085).
      const itemId = searchParams.get("item");
      const params = new URLSearchParams();
      if (searchParams.get("as") === "seller") params.set("mode", "seller");
      if (itemId) params.set("item", itemId);
      const qs = params.toString();
      return qs ? `/buyer?${qs}` : "/buyer";
    },
    [searchParams],
  );

  // Symmetric to BuyerDashboardContent's unauthed-user guard: if an already
  // signed-in user lands on /join (back button, deep link, or stale tab),
  // bounce them to their dashboard instead of showing the auth form.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(dashboardHref(user.role));
    }
  }, [authLoading, user, router, dashboardHref]);

  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleAccessToken = async (accessToken: string) => {
    setError("");
    setLoading(true);
    try {
      const user = await signInWithGoogle(accessToken);
      // Replace, not push — so the back button from the dashboard skips past
      // /join instead of landing the now-authenticated user back here.
      router.replace(dashboardHref(user.role));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signup") setAuthMode("signup");
    else setAuthMode("signin");
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (authMode === "signup" && !agreedToTerms) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }
    // Normalize at the submit boundary — trim whitespace, lowercase so the
    // value we send matches what the server stores (server also normalizes
    // via Zod transform; both sides agree).
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }
    // Pragmatic email regex — catches obvious malformed input ("not-an-email",
    // "user@", "@host.com", "user@host") without trying to be RFC 5322 exact.
    // The server runs Zod's stricter check as the source of truth.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address (e.g. you@example.com).");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    // Signin: any non-empty password is fine (existing accounts may predate
    // the stronger rule). Signup enforces the new complexity rule.
    if (authMode === "signup") {
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }
      if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
        setError("Password must include at least one letter and one number.");
        return;
      }
    }
    setLoading(true);
    try {
      const user = authMode === "signup"
        ? await signup(firstName.trim(), lastName.trim(), normalizedEmail, password)
        : await signin(normalizedEmail, password, rememberMe);
      // Replace, not push — so the back button from the dashboard skips past
      // /join instead of landing the now-authenticated user back here.
      router.replace(dashboardHref(user.role));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* Main content - Split layout */}
      <div className="flex-1 flex flex-col lg:flex-row px-4 md:px-[5%] lg:px-[10%] bg-gradient-to-br from-amber-50 via-orange-50/80 to-amber-100">
        {/* Left Panel - Informational */}
        <div className="w-full lg:w-1/2 pt-8 lg:pt-10 pb-8 lg:pb-12 flex flex-col justify-start">
          <div>
            <div className="inline-flex items-center gap-2 border-2 border-amber-500/60 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Lock size={14} />
            Secure Authentication
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-emerald-600">Drop</span><span className="text-amber-500">Yard</span>
          </h1>
          <p className="text-lg text-gray-700 mb-4">
            From one home to another. Real neighbors. No hassle.
          </p>
          <p className="text-base mb-10">
            <span className="text-emerald-600 font-medium">Currently live in Ottawa.</span> Expanding soon.
          </p>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Zap size={24} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Your privacy comes first</h3>
                <p className="text-sm text-gray-600">
                  Your contact details are not shown publicly. You decide when to share.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Shield size={24} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">No brokers. No spam. No pressure</h3>
                <p className="text-sm text-gray-600">
                  Connect directly with neighbors. We actively remove fake and outdated listings.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Users size={24} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-1">
                  Early-access community <Heart size={14} className="text-amber-500 fill-amber-500" />
                </h3>
                <p className="text-sm text-gray-600">
                  You&apos;re joining DropYard at an early stage as we build it neighborhood by neighborhood. We&apos;d love your feedback.
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Right Panel - Auth Form */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center py-8 lg:py-12">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => { setAuthMode("signin"); setError(""); setAgreedToTerms(false); }}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
                authMode === "signin"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode("signup"); setError(""); setAgreedToTerms(false); }}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
                authMode === "signup"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Sign Up
            </button>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            {authMode === "signin" ? "Welcome Back" : "Create your account"}
          </h2>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 mb-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === "signup" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jamie"
                      autoComplete="given-name"
                      required
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Singh"
                    autoComplete="family-name"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={authMode === "signin" ? "••••••••" : "8+ characters, letter and number"}
                  required
                  minLength={authMode === "signup" ? 8 : 1}
                  autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                  className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {authMode === "signin" ? (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-sm text-emerald-600 font-medium hover:underline">
                  Forgot password?
                </Link>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  required
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the{" "}
                  <Link href="/community-guidelines" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-medium hover:underline">
                    Terms of Service
                  </Link>
                  {" "}and{" "}
                  <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-medium hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (authMode === "signup" && !agreedToTerms)}
              className="w-full min-h-12 py-4 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {authMode === "signin" ? "Sign In" : "Sign Up"}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {googleClientId ? (
            <div className="w-full">
              <GoogleSignInButton
                onAccessToken={handleGoogleAccessToken}
                onError={setError}
                disabled={loading}
              />
            </div>
          ) : (
            <p className="text-center text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl py-3 px-4">
              Google sign-in is not configured. Add{" "}
              <code className="text-xs bg-white px-1 rounded">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to{" "}
              <code className="text-xs bg-white px-1 rounded">frontend/.env.local</code>.
            </p>
          )}

          {/* Security indicators */}
          <div className="flex items-center justify-center gap-6 mt-10 pt-8 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
              <Check size={14} className="text-emerald-500" />
              Secure
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
              <Lock size={14} className="text-emerald-500" />
              Encrypted
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
              <Shield size={14} className="text-emerald-500" />
              Private
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-pulse text-emerald-600 font-semibold">Loading...</div></div>}>
      <JoinPageContent />
    </Suspense>
  );
}
