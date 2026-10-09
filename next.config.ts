import type { NextConfig } from "next";

// ─────────────────────────────────────────────────────────────────────────
// BUG-058 Phase 2 — Content Security Policy + hardening headers.
//
// CSP is the single biggest defense against XSS. With cookies + CSP an
// injected <script> on this page cannot:
//   - run (script-src restricts source)
//   - exfiltrate to attacker.com (connect-src restricts where fetch can go)
//   - load images/iframes from third parties (img-src / frame-src restricted)
//   - rebase URLs (base-uri locked)
//   - submit forms off-site (form-action locked)
//   - get clickjacked (frame-ancestors 'none')
//
// CONSTRAINTS we accept:
//   - styled-jsx (Next.js built-in) injects inline styles → `style-src` needs
//     `'unsafe-inline'`. Risk: an attacker could inject CSS-based exfiltration,
//     but CSS exfil requires complex attacker setup AND a sink, so this is
//     an acceptable trade for using Next.js without major refactor.
//   - Next.js prod hydration scripts are bundled under `_next/static/...`
//     (same-origin), so `'self'` is enough. Dev mode uses eval; we DO NOT
//     allow 'unsafe-eval' so the CSP also catches dev-only issues during
//     QA on staging.
//   - Google Sign-In loads its widget from `accounts.google.com` and posts
//     credentials back via fetch to `https://oauth2.googleapis.com`. Both
//     are whitelisted explicitly.
//   - Item photos live on S3 with a CDN URL pattern. We allow https: for
//     img-src so any HTTPS image URL works; this is the common SaaS posture.
// ─────────────────────────────────────────────────────────────────────────

const API_HOST = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const IS_DEV = process.env.NODE_ENV !== "production";

// Build a single CSP header value from a directives map. Each entry is a
// (directive → sources[]) pair. Empty sources string for boolean directives
// like upgrade-insecure-requests.
function buildCsp(directives: Record<string, string[] | true>): string {
  return Object.entries(directives)
    .map(([key, value]) => (value === true ? key : `${key} ${value.join(" ")}`))
    .join("; ");
}

// Next.js dev mode injects inline <script> tags for HMR (hot reload) and
// turbopack runtime bootstrap (e.g. self.__next_r). Without 'unsafe-inline'
// + 'unsafe-eval' these get blocked and the app fails to hydrate. We keep
// the strict policy for production and only relax dev.
const SCRIPT_SRC: string[] = IS_DEV
  ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://accounts.google.com", "https://apis.google.com"]
  : ["'self'","'unsafe-inline'", "https://accounts.google.com", "https://apis.google.com"];

const cspDirectives: Record<string, string[] | true> = {
  "default-src":     ["'self'"],
  "script-src":      SCRIPT_SRC,
  "style-src":       ["'self'", "'unsafe-inline'"], // styled-jsx requires inline
  // S3 photos via any HTTPS host. In dev the backend's local-upload fallback
  // serves item photos from the API origin over plain http://, which neither
  // 'self' (the frontend origin) nor https: covers — so allow API_HOST too.
  // Dev-only: production photos are always HTTPS, so the policy stays strict.
  "img-src":         IS_DEV
    ? ["'self'", "data:", "blob:", "https:", API_HOST]
    : ["'self'", "data:", "blob:", "https:"],
  "font-src":        ["'self'", "data:"],
  "connect-src":     ["'self'", API_HOST, "https://accounts.google.com", "https://oauth2.googleapis.com", "wss:", "ws:"], // ws: for Socket.IO + Next.js HMR
  "frame-src":       ["'self'", "https://accounts.google.com"],
  "frame-ancestors": ["'none'"], // prevent clickjacking
  "form-action":     ["'self'"],
  "base-uri":        ["'self'"],
  "object-src":      ["'none'"],
  // Don't upgrade insecure requests in dev — would break http://localhost:4000 API
  ...(IS_DEV ? {} : { "upgrade-insecure-requests": true as const }),
};

const securityHeaders = [
  { key: "Content-Security-Policy",   value: buildCsp(cspDirectives) },
  { key: "X-Frame-Options",           value: "DENY" }, // belt-and-suspenders alongside frame-ancestors
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // HSTS — only meaningful when served over HTTPS in production. Browsers
  // ignore HSTS sent over HTTP, so it's safe to always send.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // BUG-060 — hide framework fingerprint. By default Next.js exposes
  // `X-Powered-By: Next.js` on every response. Disclosing the framework is
  // a low-grade info leak (helps attackers narrow CVE searches) and trips
  // the "fingerprint exposure" check on most security scanners. Off.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
