"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import {
  Camera, X, Check, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Sparkles, Zap,
  MessageCircle, Package, Eye, ArrowRight, User, Clock, Calendar,
  CheckCircle, MapPin, LayoutGrid, Box, DollarSign, ClipboardList,
  MessageSquare, Plus, Truck, History, ArrowLeft, Shield, Tag, TrendingDown,
  Home, Heart, Users, Mail, Phone, Info, Lock, CreditCard, Banknote, Upload, RefreshCw,
  Star, Settings, BarChart3, Bell, Award, Leaf, Send, Share2, AlertCircle,
  Search, CreditCard as CardIcon
} from "lucide-react";

/* ============================================================
   DESIGN SYSTEM — warm community, Nunito, brand-aligned
   Matched to buyer dashboard. Brand: green #308424, amber #F09000.
   ============================================================ */
const C = {
  paper:     "#FFFFFF",
  page:      "#FFFFFF",
  sand:      "#FFF9F0",
  fawn:      "#EDE8E0",
  smoke:     "#D6CFC4",
  ash:       "#9A948B",
  mink:      "#5F5B54",
  ink:       "#1F1D19",
  green:     "#308424",
  greenDeep: "#1F5A18",
  greenMist: "#D8EDD2",
  amber:     "#F08A00",
  amberDeep: "#C06800",
  amberSoft: "#FFE4C4",
  amberMist: "#FFF7ED",
  claret:    "#CC3B2A",
  claretMist:"#FDECEC",
  sky:       "#2F6FB3",
  teal:      "#0F766E",
  tealMist:  "#CCFBF1",
  purple:    "#7C3AED",
  purpleMist:"#F5F3FF",
  ai:        "#7C3AED",
  aiMist:    "#F5F3FF",
  wa:        "#25D366",
  // Legacy aliases — kept so pre-existing code keeps working until fully ported
  gLightBg:  "#D8EDD2",
  gSoft:     "#D8EDD2",
  gAccent:   "#308424",
  gPrimary:  "#308424",
  gHover:    "#1F5A18",
  gDark:     "#1F5A18",
  oLightBg:  "#FFF7ED",
  oSoft:     "#FFE4C4",
  oAccent:   "#F08A00",
  oPrimary:  "#F08A00",
  oHover:    "#C06800",
  oDark:     "#C06800",
  tPrimary:  "#0F766E",
  tLight:    "#CCFBF1",
  tSoft:     "#CCFBF1",
  aiLight:   "#F5F3FF",
  aiBorder:  "#DDD6FE",
};
const F = {
  head: '"Nunito", -apple-system, BlinkMacSystemFont, sans-serif',
  body: '"Nunito", -apple-system, BlinkMacSystemFont, sans-serif',
  // Legacy aliases
  h:    '"Nunito", -apple-system, BlinkMacSystemFont, sans-serif',
  b:    '"Nunito", -apple-system, BlinkMacSystemFont, sans-serif',
};

// Wordmark without the "From one home to another" tagline. The tagline is
// unreadable at nav height and repeats what the page already says, so the
// title bar uses the clean mark. Was a ~73KB base64 data URI inlined into
// all six dashboard files; public/Logo_1.png is the same artwork, cached
// by the browser and shared across every surface.
const LOGO_SRC = "/logo-wordmark.png";

/* Avatar helpers */
function avatarBg(name) {
  const seeds = [C.green, C.amber, C.sky, C.claret, C.purple, C.teal];
  let h = 0; for (const ch of (name || "")) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  return seeds[h % seeds.length];
}
function initialsOf(name) {
  if (!name) return "?";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length-1].charAt(0)).toUpperCase();
}

/* Global CSS injection — Nunito font, animations, hover behaviours */
/* ============================================================
   VIEWPORT HOOK — drives mobile vs desktop layouts.
   Mobile threshold: ≤ 768px. SSR-safe (defaults to desktop).
   Ported from buyer dashboard for cross-product consistency.
   ============================================================ */
const MOBILE_BREAKPOINT = 768;
function useViewport() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = null;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return { width, isMobile: width <= MOBILE_BREAKPOINT };
}

/* ============================================================
   DROP CLOCK — the platform's heartbeat. Drops run Saturday 8am
   through Sunday 6pm. The last two hours (Sun 4–6pm) are "closing
   time" — discount and free-pile tools open up. Everything else
   is "between" — the Shelf is still selling, and unsold items
   from the last Drop are back on it.
   ============================================================ */
function computeDropPhase(now) {
  // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const d = now.getDay();
  const h = now.getHours();
  if (d === 6 && h >= 8) return "live";       // Saturday from 8am
  if (d === 0) {                                // Sunday
    if (h < 16) return "live";                  // before 4pm
    if (h < 18) return "closing";               // 4–6pm
    return "between";                           // 6pm onwards → back on Shelf
  }
  return "between";
}

function nextDropMoment(now) {
  // Find the next Saturday 8am from `now`
  const sat = new Date(now);
  const daysUntilSat = (6 - now.getDay() + 7) % 7;
  sat.setDate(sat.getDate() + daysUntilSat);
  sat.setHours(8, 0, 0, 0);
  if (sat <= now) sat.setDate(sat.getDate() + 7);
  return sat;
}

function dropCloseMoment(now) {
  // The Sunday 6pm that closes the current or next Drop
  const sun = new Date(now);
  const daysUntilSun = (7 - now.getDay()) % 7;
  sun.setDate(sun.getDate() + daysUntilSun);
  sun.setHours(18, 0, 0, 0);
  if (sun <= now) sun.setDate(sun.getDate() + 7);
  return sun;
}

// Hours since the most recent Sunday 6pm (last Drop close). Used by the
// Overview to decide how prominently to show the post-Drop recap card —
// fresh in the first ~30 hours, fading to a quiet line by mid-week.
function hoursSinceLastDropClose(now) {
  const d = new Date(now);
  let daysBack = d.getDay();
  if (d.getDay() === 0 && d.getHours() < 18) daysBack = 7;
  d.setDate(d.getDate() - daysBack);
  d.setHours(18, 0, 0, 0);
  return Math.max(0, (now - d) / (1000 * 60 * 60));
}

function formatCountdown(target, now) {
  let diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000); diff -= days * 86400000;
  const hours = Math.floor(diff / 3600000); diff -= hours * 3600000;
  const mins = Math.floor(diff / 60000);
  if (days > 0) return days + "d " + hours + "h";
  if (hours > 0) return hours + "h " + mins + "m";
  return mins + "m";
}

function useDropPhase() {
  const [phase, setPhase] = useState(() => computeDropPhase(new Date()));
  useEffect(() => {
    const tick = () => setPhase(computeDropPhase(new Date()));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);
  return phase;
}

// When the demo's phase chip is set, real "now" no longer matches the
// scenario the UI is illustrating, which breaks countdown math. This helper
// synthesizes a moment inside the chosen scenario so dropCloseMoment /
// nextDropMoment / formatCountdown / hoursSinceLastDropClose all read true.
//
// Scenarios:
//   pre-drop   → Friday 6pm  (countdown-led between hero, ~38h to Saturday)
//   live       → Saturday noon
//   closing    → Sunday 5pm  (last hour of closing window)
//   post-drop  → Sunday 8pm  (fresh recap; 2h since close)
function effectiveNow(scenario) {
  const real = new Date();
  if (!scenario) return real;
  const daysToSat = (6 - real.getDay() + 7) % 7;
  const sat = new Date(real);
  sat.setDate(real.getDate() + daysToSat);
  sat.setHours(0, 0, 0, 0);
  if (scenario === "live") { sat.setHours(12, 0, 0, 0); return sat; }
  if (scenario === "closing") { const s = new Date(sat); s.setDate(sat.getDate() + 1); s.setHours(17, 0, 0, 0); return s; }
  if (scenario === "post-drop") { const s = new Date(sat); s.setDate(sat.getDate() + 1); s.setHours(20, 0, 0, 0); return s; }
  if (scenario === "pre-drop") { const f = new Date(sat); f.setDate(sat.getDate() - 1); f.setHours(18, 0, 0, 0); return f; }
  return real;
}

// Map demo scenario string → internal phase. Pre/post-Drop are both "between".
function scenarioToPhase(scenario) {
  if (!scenario) return null;
  if (scenario === "pre-drop" || scenario === "post-drop") return "between";
  return scenario; // live, closing
}

function GlobalStyle() {
  const css = `
:root {
  /* Layered shadow scale — flat to elevated. Used by .card-* utilities below. */
  --shadow-xs:  0 1px 2px rgba(31, 29, 25, 0.04), 0 1px 1px rgba(31, 29, 25, 0.03);
  --shadow-sm:  0 1px 3px rgba(31, 29, 25, 0.06), 0 1px 2px rgba(31, 29, 25, 0.04);
  --shadow-md:  0 4px 12px rgba(31, 29, 25, 0.08), 0 2px 4px rgba(31, 29, 25, 0.05);
  --shadow-lg:  0 10px 28px rgba(31, 29, 25, 0.10), 0 4px 10px rgba(31, 29, 25, 0.06);
  --shadow-xl:  0 20px 48px rgba(31, 29, 25, 0.14), 0 8px 16px rgba(31, 29, 25, 0.08);
  /* Pressable-button "carved" shadow — kept for CTAs only */
  --shadow-press-green: 0 2px 0 ${C.greenDeep};
  --shadow-press-amber: 0 2px 0 #8B4A00;
  --shadow-press-claret: 0 2px 0 #8B2010;
  /* Motion */
  --ease-out: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --t-fast: 140ms;
  --t-base: 220ms;
  --t-slow: 360ms;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  /* Subtle warm gradient — the canvas feels alive without competing */
  background:
    radial-gradient(ellipse 80% 60% at 50% 0%, ${C.sand} 0%, transparent 70%),
    radial-gradient(ellipse 60% 40% at 100% 100%, ${C.greenMist}40 0%, transparent 60%),
    #FFFCF7;
  background-attachment: fixed;
  color: ${C.ink};
  font-family: 'Nunito', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

::selection { background: ${C.greenMist}; color: ${C.greenDeep}; }
button { font-family: inherit; }
input, textarea, select { font-family: inherit; }
:focus { outline: none; }
:focus-visible {
  outline: 2.5px solid ${C.green};
  outline-offset: 2px;
  border-radius: 6px;
  transition: outline-offset var(--t-fast) var(--ease-out);
}

/* ─────────────── ANIMATIONS ─────────────── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulseLive {
  0%   { transform: scale(1); opacity: 0.8; }
  70%  { transform: scale(2.2); opacity: 0; }
  100% { transform: scale(2.2); opacity: 0; }
}
@keyframes skelShimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes heartBreathe {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.18); }
}
@keyframes heartThump {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.25); }
  60%  { transform: scale(0.95); }
  100% { transform: scale(1); }
}

.fade-in { animation: fadeUp 0.5s var(--ease-out) both; }

/* ─────────────── BUTTON UTILITIES ─────────────── */
/* Primary CTAs — keep the "pressable button" carved shadow, but with
   refined hover (subtle lift + deeper shadow) and active (snap back). */
.cta-primary {
  transition: transform var(--t-base) var(--ease-out),
              box-shadow var(--t-base) var(--ease-out),
              filter var(--t-fast) var(--ease-out);
  will-change: transform;
}
.cta-primary:hover {
  transform: translateY(-1.5px);
  filter: brightness(1.04);
}
.cta-primary:active {
  transform: translateY(0);
  filter: brightness(0.96);
  transition-duration: 80ms;
}

/* Secondary / outlined buttons */
.btn-outlined {
  transition: background var(--t-fast) var(--ease-out),
              border-color var(--t-fast) var(--ease-out),
              transform var(--t-fast) var(--ease-out);
}
.btn-outlined:hover {
  background: ${C.sand};
  transform: translateY(-1px);
}
.btn-outlined:active {
  transform: translateY(0);
}

/* Tiny icon buttons (the X, share, etc.) */
.icon-btn {
  transition: background var(--t-fast) var(--ease-out),
              color var(--t-fast) var(--ease-out);
}
.icon-btn:hover { background: ${C.sand}; }

/* ─────────────── CARD UTILITIES ─────────────── */
/* Hoverable cards used in lists (items, pickups, history, etc.). Subtle lift. */
.card-elevate {
  transition: transform var(--t-base) var(--ease-out),
              box-shadow var(--t-base) var(--ease-out),
              border-color var(--t-base) var(--ease-out);
}
.card-elevate:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: ${C.smoke};
}

/* Soft, non-lifting card — slight shadow change only (settings, etc.) */
.card-soft {
  transition: box-shadow var(--t-base) var(--ease-out),
              border-color var(--t-base) var(--ease-out);
}
.card-soft:hover {
  box-shadow: var(--shadow-sm);
  border-color: ${C.smoke};
}

/* Inline list rows (no transform, just background tint) */
.row-hover {
  transition: background var(--t-fast) var(--ease-out);
}
.row-hover:hover { background: ${C.sand}; }

/* ─────────────── INPUT UTILITY ─────────────── */
.input-clean {
  transition: border-color var(--t-fast) var(--ease-out),
              box-shadow var(--t-fast) var(--ease-out);
}
.input-clean:focus {
  border-color: ${C.green};
  box-shadow: 0 0 0 3px ${C.greenMist}80;
}

/* ─────────────── CHIPS / PILLS ─────────────── */
.chip-hover {
  transition: background var(--t-fast) var(--ease-out),
              border-color var(--t-fast) var(--ease-out),
              color var(--t-fast) var(--ease-out);
}
.chip-hover:hover { border-color: ${C.mink} !important; }

/* ─────────────── SCROLLBARS ─────────────── */
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: ${C.fawn};
  border-radius: 8px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
::-webkit-scrollbar-thumb:hover { background: ${C.smoke}; background-clip: padding-box; }
.preview-scroll::-webkit-scrollbar { height: 6px; }
.preview-scroll::-webkit-scrollbar-thumb { background: ${C.fawn}; border-radius: 3px; border: none; }

/* ─────────────── SKELETON LOADERS ─────────────── */
.skel {
  background: linear-gradient(90deg, ${C.fawn} 0%, #F5F1EA 28%, #FAF7F2 50%, #F5F1EA 72%, ${C.fawn} 100%);
  background-size: 200% 100%;
  animation: skelShimmer 1.6s linear infinite;
  border-radius: 8px;
}
.skel-card {
  background: ${C.paper};
  border: 1px solid ${C.fawn};
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--shadow-xs);
}

/* ─────────────── ITEM-CARD MICRO-INTERACTIONS (legacy) ─────────────── */
.item-card .cta-icon { transition: transform var(--t-base) var(--ease-out); }
.item-card:hover .cta-icon { transform: translateX(3px); }
.item-card .heart-btn { transition: transform var(--t-base) var(--ease-out); }
.item-card:hover .heart-btn[data-saved="false"] {
  animation: heartBreathe 1.2s ease-in-out infinite;
  animation-delay: 200ms;
}
.item-card:hover .heart-btn[data-saved="true"] {
  animation: heartThump 0.4s var(--ease-out);
}

/* ─────────────── NAV ─────────────── */
.nav-item {
  transition: background var(--t-fast) var(--ease-out),
              color var(--t-fast) var(--ease-out),
              transform var(--t-fast) var(--ease-out);
}
.nav-item:hover { background: ${C.sand}; }
.nav-item:active { transform: scale(0.98); }

/* Stat cards in the Overview — slight elevation on hover */
.stat-card {
  transition: transform var(--t-base) var(--ease-out),
              box-shadow var(--t-base) var(--ease-out);
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

/* ─────────────── REDUCED MOTION ─────────────── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`;
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,500;1,600&display=swap" rel="stylesheet"/>
      <style>{css}</style>
    </>
  );
}

const SAMPLE_ITEMS = [
  { id: 1, e: "\u{1F6CF}\u{FE0F}", t: "Full Bedroom Set", cat: "Furniture", cond: "Used - Good", price: 600, status: "listed", views: 42, saves: 8 },
  { id: 2, e: "\u{1F4FA}", t: "LG 55 inch Smart TV", cat: "Electronics", cond: "Used - Good", price: 250, status: "listed", views: 67, saves: 15 },
  { id: 3, e: "\u{1F37D}\u{FE0F}", t: "Dining Set with 8 Chairs", cat: "Furniture", cond: "Used - Like New", price: 350, status: "claimed", views: 38, saves: 12, buyer: "Sarah M." },
  { id: 4, e: "\u{1F6CB}\u{FE0F}", t: "Sofa Set 3 Seater", cat: "Furniture", cond: "Used - Good", price: 500, status: "listed", views: 55, saves: 9 },
  { id: 5, e: "\u{1F4D6}", t: "Kids Study Desk", cat: "Kids & Baby", cond: "Used - Fair", price: 45, status: "draft", views: 0, saves: 0 },
  { id: 6, e: "\u{1F373}", t: "Kitchen Appliances Bundle", cat: "Appliances & Kitchen", cond: "Used - Good", price: 120, status: "pending", views: 0, saves: 0 },
];

const AI_ITEMS = [
  {
    id: 1, e: "\u{1FA91}", t: "IKEA KALLAX Bookshelf",
    d: "4-cube bookshelf, good condition.",
    longDesc: "Classic IKEA KALLAX 2x2 cube shelf in white. Structurally solid with no wobble. Light surface scuffing on the top visible on close inspection. Originally $79 at IKEA. Includes all shelves and the wall-anchor kit (unused).",
    cat: "Furniture", cond: "Used - Good", price: "35", retail: 79, paymentMethod: "either",
    photos: 3,
    qa: [
      { q: "Does it assemble easily?", a: "Yes — all hardware included, takes about 15 minutes with a Phillips screwdriver." },
      { q: "Any damage on the cubes?", a: "No structural damage. Minor scuffs on the top surface only, not visible when placed against a wall." },
    ],
  },
  {
    id: 2, e: "\u{1F373}", t: "Cuisinart Coffee Maker",
    d: "Stainless, fully functional.",
    longDesc: "Cuisinart DCC-3200 Perfectemp 14-cup programmable coffee maker. Stainless steel exterior with thermal carafe. All features working — brew strength control, 24-hour programming, auto-off. Descaled and deep-cleaned before listing.",
    cat: "Appliances & Kitchen", cond: "Used - Like New", price: "25", retail: 120, paymentMethod: "cash",
    photos: 4,
    qa: [
      { q: "Does it come with the filters?", a: "Yes — includes the permanent gold-tone filter plus 20 paper filters." },
      { q: "Any issues with the hotplate?", a: "Hotplate works perfectly. Auto-off engages after 2 hours as designed." },
    ],
  },
  {
    id: 3, e: "\u{1F476}", t: "Graco Stroller Blue",
    d: "Compact fold, clean.",
    longDesc: "Graco Modes LX travel system stroller in navy blue. One-handed quick-fold, reversible seat, 3-position recline. Machine-washable canopy. Lightly used with our second child — clean, smoke-free, pet-free home.",
    cat: "Kids & Baby", cond: "Used - Good", price: "45", retail: 280, paymentMethod: "either",
    photos: 5,
    qa: [
      { q: "Is it compatible with car seats?", a: "Yes — accepts Graco SnugRide Click Connect car seats with no adapter." },
      { q: "Any stains on the fabric?", a: "Canopy and seat were just washed. No visible stains or odours." },
    ],
  },
  {
    id: 4, e: "\u{1F4F1}", t: "Samsung Galaxy Tab A7",
    d: "10.4 inch tablet with case.",
    longDesc: "Samsung Galaxy Tab A7 32GB WiFi in dark grey. Minor edge wear consistent with careful use — no screen cracks or scratches. Battery holds an 8-hour charge. Factory-reset, ready for new owner. Includes protective case and original USB-C cable.",
    cat: "Electronics", cond: "Used - Fair", price: "80", retail: 229, paymentMethod: "etransfer",
    photos: 4,
    qa: [
      { q: "What's the battery health?", a: "Holds roughly 80% of its original capacity — about 8 hours of mixed use." },
      { q: "Is the charger included?", a: "USB-C cable is included. No wall adapter — standard USB-C PD works." },
    ],
  },
  {
    id: 5, e: "\u{1F527}", t: "DeWalt Drill Set",
    d: "20V cordless, 2 batteries.",
    longDesc: "DeWalt DCD771C2 20V MAX cordless drill/driver kit. Two 1.3Ah batteries (both hold full charge), charger, and soft carry bag. Chuck is keyless, 2-speed transmission, LED light. Bought new, used on one home-reno project only.",
    cat: "Tools & Garden", cond: "New", price: "65", retail: 149, paymentMethod: "either",
    photos: 4,
    qa: [
      { q: "How much life left on the batteries?", a: "Both batteries are near-new — full charge holds for roughly 40 minutes of continuous drilling." },
      { q: "Is the warranty transferable?", a: "DeWalt's 3-year warranty is tied to the serial number, not the owner, so yes — transferable." },
    ],
  },
];

function typeInfo(type) {
  const map = {
    moving: { t: "Moving Sale", icon: Truck, c: C.teal,   bg: C.tealMist,   p: "$49", pN: 49, hdr: "linear-gradient(135deg," + C.teal + ",#0A5951)" },
    estate: { t: "Estate Sale", icon: Home,  c: C.purple, bg: C.purpleMist, p: "$79", pN: 79, hdr: "linear-gradient(135deg," + C.purple + ",#6D28D9)" },
    garage: { t: "Garage Sale", icon: Tag,   c: C.amber,  bg: C.amberMist,  p: "$29", pN: 29, hdr: "linear-gradient(135deg," + C.amber + "," + C.amberDeep + ")" },
  };
  return map[type] || map.garage;
}


/* ============================== SHARED STATUS BADGE ============================== */
const STATUS_META = {
  "offer":           { label: "New offer",       color: C.amberDeep, bg: C.amberMist,  icon: "clipboardlist" },
  "countered":       { label: "Counter sent",    color: C.ai,        bg: C.aiMist,     icon: "messagesquare" },
  "claimed":         { label: "Claimed",         color: C.greenDeep, bg: C.greenMist,  icon: "check" },
  "scheduled":       { label: "Scheduled",       color: C.greenDeep, bg: C.greenMist,  icon: "checkcircle" },
  "pickup-today":    { label: "Pickup today",    color: C.claret,    bg: C.claretMist, icon: "clock" },
  "pickup-scheduled":{ label: "Scheduled",       color: C.greenDeep, bg: C.greenMist,  icon: "checkcircle" },
  "needs-response":  { label: "Needs response",  color: C.amberDeep, bg: C.amberMist,  icon: "clipboardlist" },
  "pending":         { label: "Unanswered",      color: C.claret,    bg: C.claretMist, icon: "clock" },
  "answered":        { label: "Answered",        color: C.ai,        bg: C.aiMist,     icon: "check" },
  "completed":       { label: "Completed",       color: C.ash,       bg: C.sand,       icon: "check" },
  "draft":           { label: "Draft",           color: C.ash,       bg: C.sand,       icon: null },
  "listed":          { label: "Listed",          color: C.greenDeep, bg: C.greenMist,  icon: "check" },
};
function StatusBadge({ status, size = "sm", label }) {
  const meta = STATUS_META[status] || { label: label || status, color: C.mink, bg: C.sand };
  const iconMap = { clock: Clock, check: Check, checkcircle: CheckCircle, clipboardlist: ClipboardList, messagesquare: MessageSquare };
  const Ic = meta.icon ? iconMap[meta.icon] : null;
  const fs_ = size === "sm" ? 10 : 11;
  const pad = size === "sm" ? "3px 9px" : "4px 11px";
  const isz = size === "sm" ? 10 : 12;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: pad, borderRadius: 999, background: meta.bg, color: meta.color, fontSize: fs_, fontWeight: 800, fontFamily: F.head, whiteSpace: "nowrap", letterSpacing: "0.04em" }}>
      {Ic && <Ic size={isz} strokeWidth={2.4}/>}
      {label || meta.label}
    </span>
  );
}

/* ============================== SIDEBAR ============================== */
function Sidebar({ activeView, onNav, onSwitchRole }) {
  const sections = [
    { header: "ACTIVITY", items: [
      { id: "overview",  label: "Overview",  icon: LayoutGrid },
      { id: "inventory", label: "Inventory", icon: Box, group: "inv" },
      { id: "messages",  label: "Messages",  icon: MessageSquare },
    ]},
    { header: "MANAGE", items: [
      { id: "history",  label: "History",  icon: History },
      { id: "settings", label: "Settings", icon: Settings, group: "settings" },
    ]},
  ];

  function handleClick(item) {
    if (item.id === "inventory") return onNav("items");
    if (item.id === "settings")  return onNav("settings");
    onNav(item.id);
  }

  function isActive(item) {
    if (item.group === "inv")      return ["items","orders","pickups","edit-item","add-manual"].includes(activeView);
    if (item.group === "settings") return activeView === "settings";
    return activeView === item.id;
  }

  function accentColor() { return C.green; }
  function accentMist()  { return C.greenMist; }

  return (
    <aside style={{ width: 240, borderRight: "1px solid " + C.fawn, background: C.paper, display: "flex", flexDirection: "column", height: "100%", flexShrink: 0, position: "relative" }}>
      {/* Role switcher — sliding pill style. Seller is the static "you are here" indicator. */}
      <div style={{ padding: "14px 14px 0 14px" }}>
        <div style={{ display: "flex", padding: 3, borderRadius: 11, background: C.sand, border: "1px solid " + C.fawn, position: "relative" }}>
          <button style={{
            flex: 1, padding: "8px 0", borderRadius: 9, fontSize: 12, fontWeight: 800,
            border: "none", cursor: "default", background: C.paper, color: C.ink,
            fontFamily: F.head, boxShadow: "var(--shadow-xs)",
            letterSpacing: "-0.005em",
          }}>Seller</button>
          <button
            onClick={onSwitchRole}
            className="btn-outlined"
            style={{
              flex: 1, padding: "8px 0", borderRadius: 9, fontSize: 12, fontWeight: 700,
              border: "none", cursor: "pointer", background: "transparent",
              color: C.ash, fontFamily: F.head,
            }}
          >Buyer</button>
        </div>
      </div>

      {/* List new item CTA — refined gradient + carved press shadow */}
      <div style={{ padding: "14px 14px 4px 14px" }}>
        <button
          onClick={() => onNav("add-manual")}
          className="cta-primary"
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "13px 0", borderRadius: 12, border: "none", cursor: "pointer",
            background: "linear-gradient(180deg, " + C.green + " 0%, " + C.greenDeep + " 100%)",
            color: "#fff",
            fontSize: 13, fontWeight: 800, fontFamily: F.head,
            letterSpacing: "-0.005em",
            boxShadow: "var(--shadow-press-green), var(--shadow-sm)",
          }}
        >
          <Plus size={15} strokeWidth={2.6}/> List New Item
        </button>
      </div>

      {/* Nav sections */}
      <div style={{ padding: "16px 10px 10px 10px", flex: 1, overflowY: "auto" }}>
        {sections.map((sec, si) => (
          <div key={si} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 10, marginBottom: 8 }}>
              <span style={{ width: 14, height: 2, background: C.smoke, borderRadius: 1 }}/>
              <p style={{ fontSize: 9, fontWeight: 900, color: C.ash, letterSpacing: "0.14em", fontFamily: F.head, textTransform: "uppercase" }}>{sec.header}</p>
            </div>
            {sec.items.map(item => {
              const act = isActive(item);
              const ac = accentColor(item);
              const ab = accentMist(item);
              const Ic = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  className="nav-item"
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 10, border: "none",
                    cursor: "pointer", marginBottom: 2, textAlign: "left",
                    position: "relative",
                    background: act ? ab : "transparent",
                  }}
                >
                  {/* Active accent bar — subtle left edge marker */}
                  {act && (
                    <span
                      style={{
                        position: "absolute", left: -10, top: 8, bottom: 8, width: 3,
                        borderRadius: 999, background: ac,
                      }}
                    />
                  )}
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: act ? ac : "transparent",
                    transition: "background var(--t-base) var(--ease-out)",
                  }}>
                    <Ic size={15} style={{ color: act ? "#fff" : C.mink }} strokeWidth={act ? 2.4 : 2.2}/>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: act ? 800 : 600, color: act ? ac : C.mink, fontFamily: F.head, flex: 1, letterSpacing: act ? "-0.01em" : 0 }}>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}

function TopNav({ onNav, dropPhase, scenario, onCycleScenario }) {
  const { isMobile } = useViewport();

  // Demo affordance: a small chip in the top bar cycles through scenarios so you
  // can preview every Overview state from any device. The label reflects the
  // active scenario when set; otherwise it shows the real computed phase.
  const phaseMeta = {
    "between":   { label: "Between Drops", color: C.mink,      mist: C.sand },
    "pre-drop":  { label: "Mid-week",      color: C.amberDeep, mist: C.amberMist },
    "live":      { label: "Drop is live",  color: C.greenDeep, mist: C.greenMist },
    "closing":   { label: "Closing time",  color: C.claret,    mist: C.claretMist },
    "post-drop": { label: "Fresh recap",   color: C.greenDeep, mist: C.greenMist },
  };
  const chipKey = scenario || dropPhase;
  const pm = phaseMeta[chipKey] || phaseMeta.between;
  const PhaseChip = onCycleScenario ? (
    <button onClick={onCycleScenario} title="Demo: cycle Drop scenario" aria-label="Cycle Drop scenario" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: isMobile ? "5px 10px" : "6px 12px", borderRadius: 999, border: "1px solid " + pm.color + "30", background: pm.mist, cursor: "pointer", fontFamily: F.head, fontSize: isMobile ? 10 : 11, fontWeight: 800, color: pm.color, letterSpacing: "0.02em" }}>
      {dropPhase === "live" && (
        <span style={{ position: "relative", display: "inline-flex", width: 7, height: 7 }}>
          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: pm.color, opacity: 0.5, animation: "pulseLive 1.6s ease-in-out infinite" }}/>
          <span style={{ position: "relative", width: 7, height: 7, borderRadius: "50%", background: pm.color }}/>
        </span>
      )}
      {pm.label}
    </button>
  ) : null;

  // ───────────────────────── MOBILE TOP BAR (compact)
  if (isMobile) {
    return (
      <header style={{
        borderBottom: "1px solid " + C.fawn,
        background: "rgba(255, 252, 247, 0.92)",
        backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)",
        position: "sticky", top: 0, zIndex: 40, flexShrink: 0,
      }}>
        <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <img src={LOGO_SRC} alt="DropYard" style={{ height: 32, width: "auto", display: "block" }}/>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {PhaseChip}
            <button
              title="Notifications"
              className="btn-outlined"
              style={{
                position: "relative", width: 36, height: 36, borderRadius: "50%",
                border: "1px solid " + C.fawn, background: C.paper, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <Bell size={15} style={{ color: C.mink }} strokeWidth={2.2}/>
              <span style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", background: C.claret, border: "2px solid " + C.paper }}/>
            </button>
            <button
              onClick={() => onNav && onNav("settings")}
              title="Account & settings"
              aria-label="Account & settings"
              className="cta-primary"
              style={{
                width: 34, height: 34, borderRadius: "50%", border: "none", padding: 0,
                background: avatarBg("Alex Anderson"), color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 12, fontFamily: F.head, cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              AA
            </button>
          </div>
        </div>
      </header>
    );
  }

  // ───────────────────────── DESKTOP TOP BAR
  return (
    <header style={{
      height: 64, borderBottom: "1px solid " + C.fawn,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", background: C.paper, flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src={LOGO_SRC} alt="DropYard" style={{ height: 42, width: "auto", display: "block" }}/>
      </div>

      {/* Centre: Drop-phase chip (demo affordance) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{PhaseChip}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          title="Notifications"
          className="btn-outlined"
          style={{
            position: "relative", width: 40, height: 40, borderRadius: "50%",
            border: "1px solid " + C.fawn, background: C.paper, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <Bell size={16} style={{ color: C.mink }} strokeWidth={2.2}/>
          <span style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", background: C.claret, border: "2px solid " + C.paper }}/>
        </button>
        <button
          onClick={() => onNav && onNav("settings")}
          title="Account & settings"
          aria-label="Account & settings"
          className="cta-primary"
          style={{
            width: 36, height: 36, borderRadius: "50%", border: "none", padding: 0,
            background: avatarBg("Alex Anderson"), color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 12, fontFamily: F.head, cursor: "pointer",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          AA
        </button>
      </div>
    </header>
  );
}


/* ============================================================
   MOBILE BOTTOM NAV — fixed-position tab bar for mobile.
   Renders only on mobile (caller decides via useViewport).
   Mirrors buyer's pattern; seller's 5 primary actions:
     Home · Items · Sell (FAB-leaning) · Messages · You
   ============================================================ */
function MobileBottomNav({ activeView, onNav }) {
  const navItems = [
    { id: "overview", label: "Home",     icon: LayoutGrid,    matches: ["overview"] },
    { id: "items",    label: "Items",    icon: Box,           matches: ["items","orders","pickups","edit-item"] },
    { id: "add-manual", label: "Sell", icon: Plus,          matches: ["add-manual"], primary: true },
    { id: "messages", label: "Messages", icon: MessageSquare, matches: ["messages"] },
    { id: "history",  label: "You",      icon: User,          matches: ["history"] },
  ];

  return (
    <nav role="navigation" aria-label="Primary" style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
      background: "rgba(255, 252, 247, 0.92)",
      backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)",
      borderTop: "1px solid " + C.fawn,
      boxShadow: "0 -4px 20px rgba(31, 29, 25, 0.06)",
      paddingBottom: "env(safe-area-inset-bottom, 0)",
    }}>
      <div style={{ display: "flex", alignItems: "stretch", justifyContent: "space-around", maxWidth: 600, margin: "0 auto" }}>
        {navItems.map(item => {
          const active = item.matches.includes(activeView);
          const Ic = item.icon;
          // The "Sell" tab gets a primary treatment — solid green pill with white icon —
          // because creating listings is the seller's headline action.
          if (item.primary) {
            return (
              <button
                key={item.id}
                onClick={() => onNav(item.id)}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className="cta-primary"
                style={{
                  flex: 1, minWidth: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  padding: "8px 4px 6px",
                  border: "none", background: "transparent", cursor: "pointer",
                  color: C.greenDeep,
                }}
              >
                <span style={{
                  width: 48, height: 34, borderRadius: 999,
                  background: "linear-gradient(180deg, " + C.green + " 0%, " + C.greenDeep + " 100%)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "var(--shadow-press-green), var(--shadow-sm)",
                  marginBottom: 2,
                }}>
                  <Ic size={20} strokeWidth={2.8} style={{ color: "#fff" }}/>
                </span>
                <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, letterSpacing: "0.02em", whiteSpace: "nowrap", color: C.greenDeep }}>{item.label}</span>
              </button>
            );
          }
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              style={{
                position: "relative",
                flex: 1, minWidth: 0,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                padding: "10px 4px 8px",
                border: "none", background: "transparent", cursor: "pointer",
                color: active ? C.greenDeep : C.ash,
                transition: "color var(--t-base) var(--ease-out)",
              }}
            >
              {/* Active pill background — sits behind icon when tab is active */}
              {active && (
                <span aria-hidden="true" style={{
                  position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)",
                  width: 48, height: 32, borderRadius: 999,
                  background: C.greenMist,
                  border: "1px solid " + C.green + "20",
                  transition: "all var(--t-base) var(--ease-out)",
                }}/>
              )}
              <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "transform var(--t-base) var(--ease-out)", transform: active ? "scale(1.05)" : "scale(1)" }}>
                <Ic size={22} strokeWidth={active ? 2.4 : 2}/>
              </span>
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: active ? 800 : 600, letterSpacing: active ? "-0.005em" : "0.02em", whiteSpace: "nowrap" }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}


/* ============================== OVERVIEW ==============================
   Drop-day plan, not a status page. The hero, the stats, and the action
   blocks all shift meaning based on which phase of the Drop cycle the
   seller is in: between · live · closing · recap.
   ====================================================================== */

// Tiny shared building block used across overview sections
function OverviewSection({ title, action, children, isMobile }) {
  return (
    <section style={{ marginBottom: isMobile ? 18 : 24 }}>
      {(title || action) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
          {title && <h2 style={{ fontFamily: F.head, fontSize: isMobile ? 14 : 16, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em" }}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Overview({ onNav, dropPhase = "between", now = new Date() }) {
  const { isMobile } = useViewport();
  const h = now.getHours();
  const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  // Share sheet (opened from BetweenHero's "Share what I'm bringing" button)
  const [showShare, setShowShare] = useState(false);
  // Sell-with-AI opt-in (coming-soon feature) — toggled by the teaser CTA
  const [aiNotified, setAiNotified] = useState(false);

  // ---- Demo data — in production this comes from the seller's actual inventory.
  const queuedItems = [
    { id: 1, e: "\u{1F6CF}\uFE0F", t: "Full Bedroom Set",     price: 600, layer: "drop"  },
    { id: 4, e: "\u{1F6CB}\uFE0F", t: "Sofa Set 3 Seater",    price: 500, layer: "drop"  },
    { id: 8, e: "\u{1F527}",        t: "DeWalt Drill Set",     price: 65,  layer: "drop"  },
  ];
  const shelfItems = [
    { id: 2, e: "\u{1F4FA}",        t: "LG 55\" Smart TV",         price: 250, layer: "shelf" },
    { id: 7, e: "\u{1FA91}",        t: "IKEA KALLAX Bookshelf",     price: 35,  layer: "shelf" },
    // These came back from last Drop — still claimable on the Shelf this week.
    { id: 9, e: "\u{1F4DA}",        t: "Kids Book Lot (8)",         price: 18,  layer: "shelf", returnedFromDrop: true },
    { id: 10, e: "\u{1FA91}",       t: "Wooden Side Table",          price: 40,  layer: "shelf", returnedFromDrop: true },
  ];
  const goingLive = [...queuedItems, ...shelfItems];
  const returnedItems = shelfItems.filter(i => i.returnedFromDrop);
  const draftsCount = 2;
  const pickupsToday = 1;
  const pickupsThisWeek = 3;
  const unreadMessages = 3;
  // Live-phase demo
  const liveViewsToday = 142;
  const liveClaims = 2;
  // Last Drop recap data — used by BetweenHero in fresh state and as a fade-out line later.
  const lastDrop = {
    sold: 5,
    total: 7,
    earned: 870,
    top: "Full Bedroom Set",
    returnedCount: returnedItems.length,
  };
  // Lifetime
  const lifetimeRehomed = 47;
  const lifetimeEarned = 1240;
  const lifetimeWeightLbs = 340;

  // Countdowns + recency
  const nextDropAt = nextDropMoment(now);
  const dropCloseAt = dropCloseMoment(now);
  const countdownToOpen  = formatCountdown(nextDropAt, now);
  const countdownToClose = formatCountdown(dropCloseAt, now);
  const hrsSinceClose = hoursSinceLastDropClose(now);
  const isFreshRecap = dropPhase === "between" && hrsSinceClose < 30;

  // Greeting subtitle changes with phase
  const subtitle =
    dropPhase === "live"    ? "The Drop is live right now — keep an eye on claims and messages." :
    dropPhase === "closing" ? "Last call. The Drop closes in " + countdownToClose + "." :
    isFreshRecap            ? "Drop wrapped. Unsold items are back on the Shelf and still selling." :
                              "Your next Drop is " + countdownToOpen + " away.";

  return (
    <div className="fade-in" style={{ maxWidth: isMobile ? "100%" : 1080, margin: "0 auto" }}>
      {/* GREETING */}
      <div style={{ paddingTop: isMobile ? 14 : 22, paddingBottom: isMobile ? 10 : 14 }}>
        <h1 style={{ fontFamily: F.head, fontSize: isMobile ? 24 : 30, fontWeight: 900, color: C.ink, letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: 6 }}>
          {greet}, Alex <span style={{ display: "inline-block", transform: "translateY(-1px)" }}>{"\u{1F44B}"}</span>
        </h1>
        <p style={{ fontFamily: F.body, fontSize: isMobile ? 13 : 15, fontWeight: 500, color: C.mink, lineHeight: 1.55 }}>
          {subtitle}
        </p>
      </div>

      {/* PHASE-AWARE HERO */}
      {dropPhase === "between" && (
        <BetweenHero
          now={now}
          countdown={countdownToOpen}
          nextDropAt={nextDropAt}
          queuedCount={queuedItems.length}
          shelfCount={shelfItems.length}
          draftsCount={draftsCount}
          recap={lastDrop}
          onNav={onNav}
          onShare={() => setShowShare(true)}
          isMobile={isMobile}
        />
      )}
      {dropPhase === "live" && (
        <LiveHero countdown={countdownToClose} liveCount={goingLive.length} views={liveViewsToday} claims={liveClaims} onNav={onNav} isMobile={isMobile}/>
      )}
      {dropPhase === "closing" && (
        <ClosingHero countdown={countdownToClose} unsoldCount={goingLive.length - 1} onNav={onNav} isMobile={isMobile}/>
      )}

      {/* BACK ON SHELF — surfaces only during the fresh post-Drop window when these
          items are most likely to need a price drop or different framing. */}
      {isFreshRecap && returnedItems.length > 0 && (
        <BackOnShelfCard items={returnedItems} onNav={onNav} isMobile={isMobile}/>
      )}

      {/* CONTEXTUAL STATS */}
      <ContextualStats dropPhase={dropPhase} isFreshRecap={isFreshRecap} data={{
        queued: queuedItems.length, drafts: draftsCount, shelf: shelfItems.length,
        views: liveViewsToday, claims: liveClaims, pickupsUp: pickupsThisWeek,
        sold: lastDrop.sold, unsold: goingLive.length - 1, timeLeft: countdownToClose,
        soldRecap: lastDrop.sold, earnedRecap: lastDrop.earned, pickupsWeek: pickupsThisWeek,
        returned: returnedItems.length,
      }} isMobile={isMobile}/>

      {/* ACTION ITEMS — always shown when there's something to action */}
      {(unreadMessages > 0 || pickupsThisWeek > 0 || draftsCount > 0) && (
        <ActionItems
          pickupsToday={pickupsToday} pickupsWeek={pickupsThisWeek}
          messages={unreadMessages} drafts={draftsCount}
          onNav={onNav} isMobile={isMobile}
        />
      )}

      {/* GOING LIVE PREVIEW — between only */}
      {dropPhase === "between" && (
        <GoingLivePreview items={goingLive} onNav={onNav} isMobile={isMobile}/>
      )}

      {/* LIVE ACTIVITY — during live/closing */}
      {(dropPhase === "live" || dropPhase === "closing") && (
        <LiveActivity onNav={onNav} isMobile={isMobile}/>
      )}

      {/* SELL WITH AI TEASER — coming-soon feature, opt-in notification */}
      <SellWithAITeaser notified={aiNotified} onNotify={() => setAiNotified(true)} isMobile={isMobile}/>

      {/* IMPACT CARD — always */}
      <ImpactCard rehomed={lifetimeRehomed} earned={lifetimeEarned} weight={lifetimeWeightLbs} onNav={onNav} isMobile={isMobile}/>

      {/* Share sheet — opened from BetweenHero's "Share what I'm bringing" CTA */}
      {showShare && <ShareSheet items={goingLive} onClose={() => setShowShare(false)} isMobile={isMobile}/>}
    </div>
  );
}

/* ---------- HERO: BETWEEN DROPS ----------
   The same component renders three faces depending on how recently the
   last Drop closed:
     • Fresh (< ~30h)  → recap headline leads; countdown is secondary
     • Mid-week        → countdown leads; small recap line below
     • Late-week       → countdown leads; no recap line (it's stale)
   The "back on Shelf" call-out appears separately above stats when fresh. */
function BetweenHero({ now, countdown, nextDropAt, queuedCount, shelfCount, draftsCount, recap, onNav, onShare, isMobile }) {
  const dayLabel = nextDropAt.toLocaleDateString("en-CA", { weekday: "long" });
  const timeLabel = nextDropAt.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", hour12: true }).replace(":00 ", " ");
  const hrsSinceClose = hoursSinceLastDropClose(now);
  const isFresh = recap && hrsSinceClose < 30;
  const showRecapLine = recap && !isFresh && hrsSinceClose < 120; // ~5 days

  // ─── Fresh recap face: green hero, sold/earned headline, countdown secondary
  if (isFresh) {
    return (
      <section style={{
        marginBottom: isMobile ? 16 : 24,
        position: "relative", overflow: "hidden",
        borderRadius: isMobile ? 20 : 24,
        padding: isMobile ? "24px 20px" : "32px 36px",
        background: "linear-gradient(135deg, " + C.greenMist + " 0%, " + C.paper + " 75%)",
        border: "1px solid " + C.green + "30",
        boxShadow: "var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}>
        {/* Decorative glow */}
        <div style={{ position: "absolute", top: -60, right: -30, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, " + C.green + "20 0%, transparent 70%)", pointerEvents: "none" }}/>
        <div style={{ position: "absolute", bottom: -50, left: 30, width: 110, height: 110, borderRadius: "50%", background: "radial-gradient(circle, " + C.green + "10 0%, transparent 70%)", pointerEvents: "none" }}/>
        <div style={{ position: "relative", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: isMobile ? 18 : 28 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: C.green, marginBottom: 12, boxShadow: "var(--shadow-xs)" }}>
              <Award size={11} style={{ color: "#fff" }} strokeWidth={2.5}/>
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 900, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>Drop wrapped</span>
            </div>
            <h2 style={{ fontFamily: F.head, fontSize: isMobile ? 28 : 40, fontWeight: 900, color: C.ink, letterSpacing: "-0.035em", lineHeight: 1.02, marginBottom: 10 }}>
              {recap.sold} of {recap.total} sold · ${recap.earned} earned
            </h2>
            <p style={{ fontFamily: F.body, fontSize: isMobile ? 13 : 14, fontWeight: 600, color: C.mink, lineHeight: 1.5, marginBottom: 4 }}>
              Top item: <span style={{ color: C.ink, fontWeight: 700 }}>{recap.top}</span>.
            </p>
            <p style={{ fontFamily: F.body, fontSize: isMobile ? 12 : 13, fontWeight: 700, color: C.greenDeep, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Calendar size={11} strokeWidth={2.3}/> Next Drop · {dayLabel} {timeLabel} ({countdown})
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0, minWidth: isMobile ? 0 : 220 }}>
            <button onClick={() => onNav("pickups")} className="cta-primary" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "13px 22px", borderRadius: 999, border: "none", cursor: "pointer",
              fontFamily: F.head, fontSize: 13, fontWeight: 800, letterSpacing: "-0.005em",
              background: "linear-gradient(180deg, " + C.green + " 0%, " + C.greenDeep + " 100%)",
              color: "#fff",
              boxShadow: "var(--shadow-press-green), var(--shadow-sm)",
            }}>
              <Truck size={14} strokeWidth={2.4}/> See pickups
            </button>
            <button onClick={() => onNav("history")} className="btn-outlined" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 22px", borderRadius: 999, border: "1.5px solid " + C.green + "40",
              cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800,
              background: C.paper, color: C.greenDeep,
            }}>
              <Award size={13} strokeWidth={2.4}/> Open history
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ─── Mid + late week: countdown-led, amber hero (existing design)
  return (
    <section style={{
      marginBottom: isMobile ? 16 : 24,
      position: "relative", overflow: "hidden",
      borderRadius: isMobile ? 20 : 24,
      padding: isMobile ? "24px 20px" : "32px 36px",
      background: "linear-gradient(135deg, " + C.amberMist + " 0%, " + C.paper + " 75%)",
      border: "1px solid " + C.amber + "30",
      boxShadow: "var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.7)",
    }}>
      <div style={{ position: "absolute", top: -60, right: -30, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, " + C.amber + "1a 0%, transparent 70%)", pointerEvents: "none" }}/>
      <div style={{ position: "absolute", bottom: -50, left: 40, width: 110, height: 110, borderRadius: "50%", background: "radial-gradient(circle, " + C.amber + "10 0%, transparent 70%)", pointerEvents: "none" }}/>
      <div style={{ position: "relative", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: isMobile ? 18 : 28 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: C.amberDeep, marginBottom: 12, boxShadow: "var(--shadow-xs)" }}>
            <Calendar size={11} style={{ color: "#fff" }} strokeWidth={2.5}/>
            <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 900, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>Next Drop</span>
          </div>
          <h2 style={{ fontFamily: F.head, fontSize: isMobile ? 26 : 36, fontWeight: 900, color: C.ink, letterSpacing: "-0.035em", lineHeight: 1, marginBottom: 4 }}>
            {dayLabel} {timeLabel}
          </h2>
          <p style={{ fontFamily: F.head, fontSize: isMobile ? 44 : 58, fontWeight: 900, color: C.amberDeep, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 12 }}>
            {countdown}
          </p>
          <p style={{ fontFamily: F.body, fontSize: isMobile ? 13 : 14, fontWeight: 600, color: C.mink, lineHeight: 1.5 }}>
            {shelfCount > 0 && queuedCount > 0
              ? shelfCount + " selling on the Shelf now · " + queuedCount + " queued for Saturday"
              : shelfCount > 0
              ? shelfCount + " selling on the Shelf now · joining the Drop on Saturday"
              : queuedCount > 0
              ? queuedCount + " queued for Saturday — list more on the Shelf to sell this week"
              : "Nothing listed yet — start a stoop sale to get on the Shelf today"}
            {draftsCount > 0 && " · " + draftsCount + " draft" + (draftsCount === 1 ? "" : "s") + " to finish"}
          </p>
          {showRecapLine && (
            <p style={{ fontFamily: F.body, fontSize: isMobile ? 11 : 12, fontWeight: 600, color: C.ash, marginTop: 8, paddingTop: 8, borderTop: "1px dashed " + C.amber + "30" }}>
              Last Drop · {recap.sold} sold · ${recap.earned}
              {recap.returnedCount > 0 && " · " + recap.returnedCount + " back on Shelf"}
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0, minWidth: isMobile ? 0 : 220 }}>
          <button
            onClick={onShare}
            className="cta-primary"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "13px 22px", borderRadius: 999, border: "none", cursor: "pointer",
              fontFamily: F.head, fontSize: 13, fontWeight: 800, letterSpacing: "-0.005em",
              background: "linear-gradient(180deg, " + C.amber + " 0%, " + C.amberDeep + " 100%)",
              color: "#fff",
              boxShadow: "var(--shadow-press-amber), var(--shadow-sm)",
            }}
          >
            <Share2 size={14} strokeWidth={2.4}/> Share what I'm bringing
          </button>
          <button
            onClick={() => onNav("add-manual")}
            className="btn-outlined"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 22px", borderRadius: 999, border: "1.5px solid " + C.amber + "40",
              cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800,
              background: C.paper, color: C.amberDeep,
            }}
          >
            <Plus size={13} strokeWidth={2.4}/> List more
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- BACK ON SHELF — fresh post-Drop card ----------
   Surfaces items that came back from the Drop unsold. They're already
   claimable on the Shelf right now; this card just gives them a moment
   of focus so the seller can decide to drop prices or repackage. */
function BackOnShelfCard({ items, onNav, isMobile }) {
  return (
    <button
      onClick={() => onNav("items")}
      className="card-elevate"
      style={{
        width: "100%", textAlign: "left",
        padding: isMobile ? "16px 18px" : "18px 22px",
        borderRadius: 16,
        background: C.paper,
        border: "1.5px dashed " + C.amber + "60",
        cursor: "pointer",
        display: "flex", alignItems: "center", gap: 14,
        marginBottom: isMobile ? 16 : 24,
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div style={{
        width: isMobile ? 40 : 46, height: isMobile ? 40 : 46, borderRadius: 13,
        background: "linear-gradient(135deg, " + C.amberMist + " 0%, " + C.amberMist + "80 100%)",
        border: "1px solid " + C.amber + "30",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Package size={isMobile ? 18 : 20} style={{ color: C.amberDeep }} strokeWidth={2.3}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: F.head, fontSize: isMobile ? 13 : 14, fontWeight: 900, color: C.ink, marginBottom: 3, letterSpacing: "-0.01em" }}>
          {items.length} item{items.length === 1 ? "" : "s"} back on the Shelf
        </p>
        <p style={{ fontFamily: F.body, fontSize: isMobile ? 11 : 12, fontWeight: 600, color: C.mink, lineHeight: 1.45, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {items.map(i => i.t).join(" · ")} · still claimable, consider a price drop
        </p>
      </div>
      <ChevronRight size={16} style={{ color: C.smoke, flexShrink: 0 }}/>
    </button>
  );
}

/* ---------- HERO: LIVE ---------- */
function LiveHero({ countdown, liveCount, views, claims, onNav, isMobile }) {
  return (
    <section style={{
      marginBottom: isMobile ? 16 : 24,
      position: "relative", overflow: "hidden",
      borderRadius: isMobile ? 20 : 24,
      padding: isMobile ? "24px 20px" : "32px 36px",
      background: "linear-gradient(135deg, " + C.greenMist + " 0%, " + C.paper + " 75%)",
      border: "1px solid " + C.green + "40",
      boxShadow: "var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.7)",
    }}>
      <div style={{ position: "absolute", top: -60, right: -30, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, " + C.green + "20 0%, transparent 70%)", pointerEvents: "none" }}/>
      <div style={{ position: "absolute", bottom: -50, left: 40, width: 110, height: 110, borderRadius: "50%", background: "radial-gradient(circle, " + C.green + "10 0%, transparent 70%)", pointerEvents: "none" }}/>
      <div style={{ position: "relative", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: isMobile ? 18 : 28 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 999, background: C.green, marginBottom: 12, boxShadow: "var(--shadow-xs)" }}>
            <span style={{ position: "relative", display: "inline-flex", width: 9, height: 9 }}>
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#fff", opacity: 0.6, animation: "pulseLive 1.6s ease-in-out infinite" }}/>
              <span style={{ position: "relative", width: 9, height: 9, borderRadius: "50%", background: "#fff" }}/>
            </span>
            <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 900, color: "#fff", letterSpacing: "0.12em", textTransform: "uppercase" }}>Drop is live</span>
          </div>
          <h2 style={{ fontFamily: F.head, fontSize: isMobile ? 26 : 34, fontWeight: 900, color: C.ink, letterSpacing: "-0.035em", lineHeight: 1.02, marginBottom: 6 }}>
            Closes in {countdown}
          </h2>
          <p style={{ fontFamily: F.body, fontSize: isMobile ? 13 : 14, fontWeight: 600, color: C.mink, lineHeight: 1.5, marginBottom: 4 }}>
            <span style={{ color: C.ink, fontWeight: 700 }}>{liveCount}</span> of your items are in the live Drop right now
          </p>
          <p style={{ fontFamily: F.body, fontSize: isMobile ? 12 : 13, fontWeight: 700, color: C.greenDeep, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Eye size={11} strokeWidth={2.3}/> {views} views today · {claims} {claims === 1 ? "claim" : "claims"} pending
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0, minWidth: isMobile ? 0 : 220 }}>
          <button
            onClick={() => onNav("messages")}
            className="cta-primary"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "13px 22px", borderRadius: 999, border: "none", cursor: "pointer",
              fontFamily: F.head, fontSize: 13, fontWeight: 800, letterSpacing: "-0.005em",
              background: "linear-gradient(180deg, " + C.green + " 0%, " + C.greenDeep + " 100%)",
              color: "#fff",
              boxShadow: "var(--shadow-press-green), var(--shadow-sm)",
            }}
          >
            <MessageSquare size={14} strokeWidth={2.4}/> Open messages
          </button>
          <button
            onClick={() => onNav("items")}
            className="btn-outlined"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 22px", borderRadius: 999, border: "1.5px solid " + C.green + "40",
              cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800,
              background: C.paper, color: C.greenDeep,
            }}
          >
            <Eye size={13} strokeWidth={2.4}/> See what's live
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- HERO: CLOSING TIME (Sunday 4-6pm) ---------- */
function ClosingHero({ countdown, unsoldCount, onNav, isMobile }) {
  return (
    <section style={{
      marginBottom: isMobile ? 16 : 24,
      position: "relative", overflow: "hidden",
      borderRadius: isMobile ? 20 : 24,
      padding: isMobile ? "24px 20px" : "30px 36px",
      background: "linear-gradient(135deg, " + C.claretMist + " 0%, " + C.paper + " 75%)",
      border: "1px solid " + C.claret + "40",
      boxShadow: "var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.7)",
    }}>
      <div style={{ position: "absolute", top: -60, right: -30, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, " + C.claret + "18 0%, transparent 70%)", pointerEvents: "none" }}/>
      <div style={{ position: "relative" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: C.claret, marginBottom: 12, boxShadow: "var(--shadow-xs)" }}>
          <Clock size={11} style={{ color: "#fff" }} strokeWidth={2.5}/>
          <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 900, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>Closing time</span>
        </div>
        <h2 style={{ fontFamily: F.head, fontSize: isMobile ? 28 : 36, fontWeight: 900, color: C.ink, letterSpacing: "-0.035em", lineHeight: 1.02, marginBottom: 6 }}>
          Drop closes in {countdown}
        </h2>
        <p style={{ fontFamily: F.body, fontSize: isMobile ? 13 : 14, fontWeight: 600, color: C.mink, lineHeight: 1.5, marginBottom: 18 }}>
          <span style={{ color: C.ink, fontWeight: 700 }}>{unsoldCount} items</span> haven't sold yet. Last call — drop prices or move them to the free pile before items roll back to the Shelf.
        </p>
        <button
          onClick={() => onNav("items")}
          className="cta-primary"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 20px", borderRadius: 999, border: "none", cursor: "pointer",
            fontFamily: F.head, fontSize: 13, fontWeight: 800, letterSpacing: "-0.005em",
            background: "linear-gradient(180deg, " + C.claret + " 0%, #A8281C 100%)",
            color: "#fff",
            boxShadow: "var(--shadow-press-claret), var(--shadow-sm)",
          }}
        >
          Open closing-time tools <ArrowRight size={13} strokeWidth={2.4}/>
        </button>
      </div>
    </section>
  );
}

/* ---------- CONTEXTUAL STATS ---------- */
function ContextualStats({ dropPhase, isFreshRecap, data, isMobile }) {
  // In the first ~30h after a Drop closes, show Drop result numbers; after that
  // shift to operational counts (queued/drafts/shelf) for the rest of the week.
  const freshRecap = [
    { icon: CheckCircle, label: "SOLD",         value: String(data.soldRecap) },
    { icon: DollarSign,  label: "EARNED",       value: "$" + data.earnedRecap },
    { icon: Package,     label: "BACK ON SHELF",value: String(data.returned) },
  ];
  const sets = {
    between: isFreshRecap ? freshRecap : [
      { icon: Box,            label: "QUEUED",   value: String(data.queued) },
      { icon: ClipboardList,  label: "DRAFTS",   value: String(data.drafts) },
      { icon: Package,        label: "ON SHELF", value: String(data.shelf)  },
    ],
    live: [
      { icon: Eye,        label: "VIEWS TODAY", value: String(data.views) },
      { icon: Tag,        label: "CLAIMS",      value: String(data.claims) },
      { icon: MapPin,     label: "PICKUPS",     value: String(data.pickupsUp) },
    ],
    closing: [
      { icon: CheckCircle,label: "SOLD",     value: String(data.sold) },
      { icon: Package,    label: "UNSOLD",   value: String(data.unsold) },
      { icon: Clock,      label: "TIME LEFT",value: data.timeLeft },
    ],
  };
  const items = sets[dropPhase] || sets.between;
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "1fr 1fr 1fr", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 16 : 22 }}>
      {items.map((s, i) => (
        <BannerStat key={i} icon={s.icon} label={s.label} value={s.value}/>
      ))}
    </div>
  );
}

/* ---------- ACTION ITEMS ---------- */
function ActionItems({ pickupsToday, pickupsWeek, messages, drafts, onNav, isMobile }) {
  const items = [];
  if (pickupsToday > 0) items.push({
    icon: MapPin, color: C.claret, mist: C.claretMist,
    title: pickupsToday === 1 ? "1 pickup today" : pickupsToday + " pickups today",
    sub: "Don't keep buyers waiting", go: () => onNav("pickups"),
  });
  if (messages > 0) items.push({
    icon: MessageSquare, color: C.amberDeep, mist: C.amberMist,
    title: messages + " message" + (messages === 1 ? "" : "s") + " awaiting reply",
    sub: "Buyers move fast — reply soon", go: () => onNav("messages"),
  });
  if (pickupsWeek > pickupsToday) items.push({
    icon: Calendar, color: C.greenDeep, mist: C.greenMist,
    title: (pickupsWeek - pickupsToday) + " more pickups this week",
    sub: "Plan your week", go: () => onNav("pickups"),
  });
  if (drafts > 0) items.push({
    icon: ClipboardList, color: C.mink, mist: C.sand,
    title: drafts + " draft" + (drafts === 1 ? "" : "s") + " unfinished",
    sub: "Finish before Friday to make this Drop", go: () => onNav("items"),
  });
  if (items.length === 0) return null;
  return (
    <OverviewSection title="Needs your attention" isMobile={isMobile}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 8 : 10 }}>
        {items.map((it, i) => {
          const Ic = it.icon;
          return (
            <button
              key={i}
              onClick={it.go}
              className="card-elevate"
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "15px 18px", borderRadius: 14,
                background: C.paper,
                border: "1px solid " + C.fawn,
                cursor: "pointer", textAlign: "left",
                boxShadow: "var(--shadow-xs)",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = it.color + "60"}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.fawn}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: "linear-gradient(135deg, " + it.mist + " 0%, " + it.mist + "80 100%)",
                border: "1px solid " + it.color + "20",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Ic size={17} style={{ color: it.color }} strokeWidth={2.3}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink, lineHeight: 1.25, letterSpacing: "-0.01em" }}>{it.title}</p>
                <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, marginTop: 2 }}>{it.sub}</p>
              </div>
              <ChevronRight size={16} style={{ color: C.smoke }}/>
            </button>
          );
        })}
      </div>
    </OverviewSection>
  );
}

/* ---------- GOING LIVE PREVIEW ---------- */
function GoingLivePreview({ items, onNav, isMobile }) {
  if (!items || items.length === 0) return null;
  return (
    <OverviewSection
      title="Going live this Drop"
      isMobile={isMobile}
      action={
        <button onClick={() => onNav("items")} style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "none", cursor: "pointer", fontFamily: F.head, fontSize: 12, fontWeight: 700, color: C.mink }}>
          See all <ChevronRight size={12}/>
        </button>
      }
    >
      <div className="preview-scroll" style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, paddingTop: 2, scrollSnapType: "x mandatory" }}>
        {items.map(it => (
          <button
            key={it.id}
            onClick={() => onNav("items")}
            className="card-elevate"
            style={{
              flexShrink: 0, width: 158, padding: 14, borderRadius: 14,
              background: C.paper, border: "1px solid " + C.fawn,
              cursor: "pointer", textAlign: "left", scrollSnapAlign: "start",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <div style={{
              width: "100%", height: 80, borderRadius: 12,
              background: "linear-gradient(135deg, " + C.sand + " 0%, " + C.fawn + "80 100%)",
              border: "1px solid " + C.fawn,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, marginBottom: 10,
            }}>{it.e}</div>
            <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.ink, lineHeight: 1.3, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.005em" }}>{it.t}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
              <span style={{ fontFamily: F.head, fontSize: 14, fontWeight: 900, color: C.greenDeep, letterSpacing: "-0.01em" }}>${it.price}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.head, fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: it.layer === "drop" ? C.amberMist : C.greenMist, color: it.layer === "drop" ? C.amberDeep : C.greenDeep, letterSpacing: "0.04em", textTransform: "uppercase", border: "1px solid " + (it.layer === "drop" ? C.amber + "30" : C.green + "30") }}>
                <span style={{ position: "relative", display: "inline-flex", width: 5, height: 5 }}>
                  <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: it.layer === "drop" ? C.amberDeep : C.greenDeep, opacity: 0.4, animation: "pulseLive 1.8s ease-in-out infinite" }}/>
                  <span style={{ position: "relative", width: 5, height: 5, borderRadius: "50%", background: it.layer === "drop" ? C.amberDeep : C.greenDeep }}/>
                </span>
                {it.layer === "drop" ? "Queued" : "Shelf"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </OverviewSection>
  );
}

/* ---------- LIVE ACTIVITY FEED ---------- */
function LiveActivity({ onNav, isMobile }) {
  const events = [
    { who: "James K.", what: "is viewing your LG TV", when: "just now",   tone: "view" },
    { who: "Sarah M.", what: "saved your Sofa Set",   when: "2 min ago", tone: "save" },
    { who: "Priya R.", what: "asked about pickup",    when: "8 min ago", tone: "msg"  },
    { who: "Tom W.",   what: "claimed your Bookshelf",when: "14 min ago",tone: "claim" },
  ];
  const toneColor = { view: C.sky, save: C.claret, msg: C.amberDeep, claim: C.greenDeep };
  return (
    <OverviewSection title="Activity right now" isMobile={isMobile}>
      <div style={{
        borderRadius: 14, background: C.paper,
        border: "1px solid " + C.fawn,
        boxShadow: "var(--shadow-xs)",
        overflow: "hidden",
      }}>
        {events.map((e, i) => (
          <div key={i} className="row-hover" style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "13px 16px",
            borderBottom: i < events.length - 1 ? "1px solid " + C.fawn : "none",
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: avatarBg(e.who), color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: F.head, fontSize: 11, fontWeight: 900, flexShrink: 0,
              boxShadow: "var(--shadow-xs)",
            }}>
              {initialsOf(e.who)}
            </div>
            <p style={{ flex: 1, minWidth: 0, fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink }}>
              <span style={{ fontWeight: 800 }}>{e.who}</span>{" "}
              <span style={{ color: toneColor[e.tone] || C.mink }}>{e.what}</span>
            </p>
            <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.ash, flexShrink: 0 }}>{e.when}</span>
          </div>
        ))}
      </div>
    </OverviewSection>
  );
}

/* ---------- IMPACT CARD ---------- */
/* ---------- SELL WITH AI TEASER — coming-soon feature ----------
   Opt-in notification when AI-powered listing assistance becomes available.
   Uses the C.ai/C.aiMist palette tokens already in the design system
   (the only place AI branding remains, by design). */
function SellWithAITeaser({ notified, onNotify, isMobile }) {
  // The five capability beats — short, parallel structure, each starts with a verb
  // except the last (the offer). Each gets its own icon for at-a-glance recognition.
  const features = [
    { icon: Camera,         label: "Create listings from photos" },
    { icon: MessageSquare,  label: "Answer buyer questions instantly" },
    { icon: RefreshCw,      label: "Negotiate offers automatically" },
    { icon: Truck,          label: "Coordinate pickups via WhatsApp" },
    { icon: Sparkles,       label: "5 free listings every month" },
  ];

  // Auto-rotate every 3.2s. Pause on hover so users can read at their own pace.
  const [activeFeature, setActiveFeature] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActiveFeature(i => (i + 1) % features.length);
    }, 3200);
    return () => clearInterval(id);
  }, [paused, features.length]);

  const ActiveIcon = features[activeFeature].icon;

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        marginBottom: isMobile ? 18 : 24,
        borderRadius: isMobile ? 16 : 18,
        padding: isMobile ? "18px 20px" : "22px 26px",
        background: "linear-gradient(135deg, " + C.aiMist + " 0%, " + C.paper + " 78%)",
        border: "1px solid " + C.ai + "30",
        boxShadow: "var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.7)",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Decorative glow + sparkle */}
      <div style={{ position: "absolute", top: -50, right: -20, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, " + C.ai + "1a 0%, transparent 70%)", pointerEvents: "none" }}/>
      <div style={{ position: "absolute", bottom: -40, left: 30, width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle, " + C.ai + "0d 0%, transparent 70%)", pointerEvents: "none" }}/>

      <div style={{ position: "relative", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: isMobile ? 16 : 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: C.ai, marginBottom: 12, boxShadow: "var(--shadow-xs)" }}>
            <Sparkles size={11} style={{ color: "#fff" }} strokeWidth={2.6}/>
            <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 900, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>Coming soon</span>
          </div>
          <h2 style={{
            fontFamily: F.head,
            fontSize: isMobile ? 22 : 28,
            fontWeight: 900, color: C.ink, letterSpacing: "-0.035em",
            lineHeight: 1.08, marginBottom: 12,
          }}>
            Sell with <span style={{ color: C.ai }}>AI</span>
          </h2>

          {/* Rolling feature ticker — single slot, cross-fades between features.
              The fixed-height container prevents layout shift as text rotates. */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            minHeight: 38, // fixed slot — keeps layout calm across the rotation
            marginBottom: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "rgba(255, 255, 255, 0.7)",
              border: "1px solid " + C.ai + "30",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: "var(--shadow-xs)",
              transition: "all var(--t-base) var(--ease-out)",
            }}>
              <ActiveIcon size={15} style={{ color: C.ai }} strokeWidth={2.4}/>
            </div>
            <p
              key={activeFeature}  /* key forces re-mount → fade-in plays */
              className="fade-in"
              style={{
                fontFamily: F.head,
                fontSize: isMobile ? 14 : 16,
                fontWeight: 800, color: C.ink, letterSpacing: "-0.015em",
                lineHeight: 1.3, flex: 1, minWidth: 0,
              }}
            >
              {features[activeFeature].label}
            </p>
          </div>

          {/* Dot pager — click to jump to a feature. Active dot is wider (pill-shaped). */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: notified ? 0 : 0 }}>
            {features.map((_, i) => {
              const on = i === activeFeature;
              return (
                <button
                  key={i}
                  onClick={() => { setActiveFeature(i); setPaused(true); setTimeout(() => setPaused(false), 6000); }}
                  aria-label={"Show feature " + (i + 1)}
                  style={{
                    width: on ? 22 : 7, height: 7, borderRadius: 999,
                    background: on ? C.ai : C.ai + "30",
                    border: "none", cursor: "pointer", padding: 0,
                    transition: "all var(--t-base) var(--ease-out)",
                  }}
                />
              );
            })}
          </div>
        </div>

        <div style={{ flexShrink: 0, minWidth: isMobile ? 0 : 220 }}>
          {notified ? (
            // Confirmed state — opt-in already recorded
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", borderRadius: 14,
              background: C.greenMist,
              border: "1px solid " + C.green + "40",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: C.greenDeep,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Check size={14} style={{ color: "#fff" }} strokeWidth={3}/>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 900, color: C.greenDeep, letterSpacing: "-0.005em" }}>You're on the list</p>
                <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, lineHeight: 1.35 }}>We'll email you the moment it goes live.</p>
              </div>
            </div>
          ) : (
            <button
              onClick={onNotify}
              className="cta-primary"
              style={{
                width: isMobile ? "100%" : "auto",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "13px 22px", borderRadius: 999, border: "none", cursor: "pointer",
                fontFamily: F.head, fontSize: 13, fontWeight: 800, letterSpacing: "-0.005em",
                background: "linear-gradient(180deg, " + C.ai + " 0%, #6628D1 100%)",
                color: "#fff",
                boxShadow: "0 2px 0 #4F1FAA, var(--shadow-sm)",
              }}
            >
              <Bell size={14} strokeWidth={2.4}/> Notify me when it's ready
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function ImpactCard({ rehomed, earned, weight, onNav, isMobile }) {
  return (
    <button
      onClick={() => onNav("history")}
      className="card-elevate"
      style={{
        width: "100%", padding: isMobile ? "18px 20px" : "22px 26px",
        borderRadius: 16, background: C.paper,
        border: "1px solid " + C.fawn,
        cursor: "pointer", textAlign: "left",
        marginBottom: isMobile ? 12 : 16,
        boxShadow: "var(--shadow-xs)",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = C.green + "60"}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.fawn}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, " + C.greenMist + " 0%, " + C.greenMist + "80 100%)",
            border: "1px solid " + C.green + "20",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Leaf size={15} style={{ color: C.greenDeep }} strokeWidth={2.3}/>
          </div>
          <p style={{ fontFamily: F.head, fontSize: isMobile ? 13 : 14, fontWeight: 900, color: C.ink, letterSpacing: "-0.01em" }}>Your impact in Barrhaven</p>
        </div>
        <ChevronRight size={16} style={{ color: C.smoke }}/>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: isMobile ? 8 : 14 }}>
        <div>
          <p style={{ fontFamily: F.head, fontSize: isMobile ? 22 : 26, fontWeight: 900, color: C.greenDeep, letterSpacing: "-0.02em", lineHeight: 1 }}>{rehomed}</p>
          <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, marginTop: 5 }}>Items rehomed</p>
        </div>
        <div>
          <p style={{ fontFamily: F.head, fontSize: isMobile ? 22 : 26, fontWeight: 900, color: C.greenDeep, letterSpacing: "-0.02em", lineHeight: 1 }}>${earned.toLocaleString()}</p>
          <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, marginTop: 5 }}>Earned</p>
        </div>
        <div>
          <p style={{ fontFamily: F.head, fontSize: isMobile ? 22 : 26, fontWeight: 900, color: C.greenDeep, letterSpacing: "-0.02em", lineHeight: 1 }}>~{weight} lb</p>
          <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, marginTop: 5 }}>Kept out of landfill</p>
        </div>
      </div>
    </button>
  );
}

function BannerStat({ icon: Ic, label, value }) {
  const { isMobile } = useViewport();
  return (
    <div
      className="stat-card"
      style={{
        display: "flex", alignItems: "center",
        gap: isMobile ? 8 : 12,
        padding: isMobile ? "10px 10px" : "14px 18px 14px 14px",
        borderRadius: isMobile ? 12 : 14,
        background: C.paper,
        border: "1px solid " + C.fawn,
        boxShadow: "var(--shadow-xs)",
        minWidth: 0,
        justifyContent: isMobile ? "center" : "flex-start",
      }}
    >
      <div style={{
        width: isMobile ? 32 : 40, height: isMobile ? 32 : 40,
        borderRadius: isMobile ? 10 : 11,
        background: "linear-gradient(135deg, " + C.greenMist + " 0%, " + C.greenMist + "80 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        border: "1px solid " + C.green + "20",
      }}>
        <Ic size={isMobile ? 14 : 18} style={{ color: C.greenDeep }} strokeWidth={2.3}/>
      </div>
      <div style={{ textAlign: "left", minWidth: 0 }}>
        {/* Label hidden on mobile — at 3-up density it doesn't fit, and the icon is enough signal */}
        {!isMobile && (
          <p style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, color: C.mink, letterSpacing: "0.12em", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: "uppercase" }}>{label}</p>
        )}
        <p style={{ fontFamily: F.head, fontSize: isMobile ? 17 : 22, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em", lineHeight: 1, whiteSpace: "nowrap" }}>{value}</p>
      </div>
    </div>
  );
}

/* ---------- SHARE SHEET ----------
   Opens from BetweenHero's "Share what I'm bringing" CTA. Generates a snippet
   describing the seller's contributions to Saturday's Drop and offers one-click
   share to WhatsApp / Facebook / X / Email / SMS / Copy. */
function ShareSheet({ items, onClose, isMobile }) {
  const [copied, setCopied] = useState(false);

  // ─── Generate the branded share copy.
  // Items split into two groups because buyers act on them differently:
  //   • Shelf items   → claimable RIGHT NOW
  //   • Drop items    → viewable/saveable now, claim opens Saturday 8am
  // The message honors both paths instead of pretending everything is the same.
  // Source-of-truth field is `layer` ("drop" | "shelf") which is what the Overview
  // and MyItemsView use. `publishedTo` is the same idea on stored item records — we
  // accept either, so this works regardless of which surface passed the items in.
  function pathOf(it) {
    return it.layer || it.publishedTo || "shelf";
  }
  const all = items || [];
  const shelfItems = all.filter(i => pathOf(i) === "shelf");
  const dropItems  = all.filter(i => pathOf(i) === "drop");
  const itemCount = all.length;

  // Build the preview list — Shelf first (since those are claim-now), then Drop.
  // Each line tags its path so the recipient sees "claim now" vs "save for Saturday".
  const visibleShelf = shelfItems.slice(0, 2);
  const visibleDrop  = dropItems.slice(0, 3 - visibleShelf.length);
  const shownIds = new Set([...visibleShelf, ...visibleDrop].map(i => i.id));
  const remaining = all.filter(i => !shownIds.has(i.id)).length;

  const shelfLines = visibleShelf.map(it => "🟢 " + it.t + " — $" + it.price + "  · claim now");
  const dropLines  = visibleDrop.map(it => "🟡 " + it.t + " — $" + it.price + "  · Drop · Saturday");
  const itemLines = [...shelfLines, ...dropLines].join("\n");
  const tail = remaining > 0 ? "\n   + " + remaining + " more on the listing" : "";
  const SHARE_URL = "https://dropyard.app/barrhaven";

  // Headline + CTA adapt to what the seller actually has live right now.
  // Three real scenarios:
  //   1. Only Shelf items   → "Available now" framing
  //   2. Only Drop items    → "Going live Saturday — save them now" framing
  //   3. Both                → mixed framing, two clear CTAs
  const onlyShelf = shelfItems.length > 0 && dropItems.length === 0;
  const onlyDrop  = dropItems.length > 0 && shelfItems.length === 0;
  const both      = shelfItems.length > 0 && dropItems.length > 0;

  let headline, ctaLine;
  if (onlyShelf) {
    headline = "I'm selling " + itemCount + " items on DropYard 🛍️";
    ctaLine  = "Claim now — first to tap gets it.";
  } else if (onlyDrop) {
    headline = "I'm bringing " + itemCount + " items to this Saturday's Drop 🛍️";
    ctaLine  = "Browse + save them now. Claims open Saturday 8am — set a reminder.";
  } else {
    // both — show both calls to action
    headline =
      "I've got " + shelfItems.length + " on the Shelf + " +
      dropItems.length + " coming to Saturday's Drop 🛍️";
    ctaLine  =
      "🟢 Shelf items: claim now\n" +
      "🟡 Drop items: save them now, claim opens Saturday 8am";
  }

  // Long-form message — for WhatsApp, SMS, email body, copy/paste
  const shareText =
    "🟢 DropYard · Barrhaven\n" +
    "─────────────────────\n" +
    headline + "\n\n" +
    itemLines + tail + "\n\n" +
    ctaLine + "\n" +
    "👉 " + SHARE_URL + "\n\n" +
    "DropYard is our neighbourhood yard sale — every Saturday, " +
    "right here in Barrhaven. Rehome stuff, meet neighbours, " +
    "keep things out of the landfill. ♻️";

  // Short-form — Twitter/X char-conscious version
  const shareTextShort = onlyShelf
    ? "🟢 Selling " + itemCount + " items on DropYard in Barrhaven — claim now 🛍️\n" + SHARE_URL + " #DropYard #Barrhaven"
    : onlyDrop
    ? "🟡 Bringing " + itemCount + " items to Saturday's DropYard in Barrhaven 🛍️\nSave them now, claims open Saturday 8am → " + SHARE_URL + " #DropYard #Barrhaven"
    : "🛍️ " + shelfItems.length + " on the Shelf + " + dropItems.length + " coming Saturday — DropYard Barrhaven\n" + SHARE_URL + " #DropYard #Barrhaven";

  // Email-specific subject line — adapts to scenario
  const emailSubject = onlyShelf
    ? "I'm selling " + itemCount + " items on DropYard — claim before they're gone"
    : onlyDrop
    ? "I'm bringing " + itemCount + " items to Saturday's DropYard"
    : "Stuff I'm selling on DropYard this week";

  function openWindow(url) {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=700");
  }
  function shareWhatsApp() { openWindow("https://wa.me/?text=" + encodeURIComponent(shareText)); }
  function shareX()        { openWindow("https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareTextShort)); }
  function shareFacebook() { openWindow("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(SHARE_URL) + "&quote=" + encodeURIComponent(shareText)); }
  function shareEmail()    { window.location.href = "mailto:?subject=" + encodeURIComponent(emailSubject) + "&body=" + encodeURIComponent(shareText); }
  function shareSMS()      { window.location.href = "sms:?&body=" + encodeURIComponent(shareText); }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareText; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const targets = [
    { id: "whatsapp", label: "WhatsApp", color: "#25D366", bg: "#E8F8EE", glyph: "💬", action: shareWhatsApp },
    { id: "facebook", label: "Facebook", color: "#1877F2", bg: "#E7F0FE", glyph: "f",   action: shareFacebook },
    { id: "x",        label: "X",        color: "#000000", bg: "#F2F2F2", glyph: "𝕏",   action: shareX },
    { id: "email",    label: "Email",    color: C.mink,    bg: C.sand,    glyph: "✉",   action: shareEmail },
    { id: "sms",      label: "Messages", color: C.amberDeep, bg: C.amberMist, glyph: "💌", action: shareSMS },
    { id: "copy",     label: copied ? "Copied!" : "Copy", color: copied ? C.greenDeep : C.ink, bg: copied ? C.greenMist : C.sand, glyph: copied ? "✓" : "🔗", action: copyLink },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(31, 29, 25, 0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: isMobile ? 16 : 24,
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="fade-in"
        style={{
          width: isMobile ? "100%" : 520, maxWidth: 520,
          borderRadius: isMobile ? 18 : 24,
          background: C.paper,
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          maxHeight: "90vh", display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid " + C.fawn, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "linear-gradient(135deg, " + C.amberMist + " 0%, " + C.amberMist + "70 100%)",
              border: "1px solid " + C.amber + "30",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Share2 size={18} style={{ color: C.amberDeep }} strokeWidth={2.3}/>
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontFamily: F.head, fontSize: 17, fontWeight: 900, color: C.ink, letterSpacing: "-0.015em" }}>Share to your network</h3>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, marginTop: 2 }}>
                Bring more neighbours to Saturday's Drop.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="icon-btn"
            style={{
              background: C.sand, border: "none", width: 32, height: 32, borderRadius: "50%",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
            aria-label="Close"
          >
            <X size={15} style={{ color: C.mink }}/>
          </button>
        </div>

        {/* Branded preview pane — visual representation of what the share looks like.
            The text-only message gets sent on each platform; this card shows what
            the seller's contribution looks like as a "brand moment." */}
        <div style={{ padding: "18px 22px", overflowY: "auto" }}>
          <p style={{
            fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.ash,
            letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10,
          }}>Your share card</p>

          {/* The branded card — replicates the look of a shareable poster.
              Brand green gradient header, item list with hero typography, footer URL. */}
          <div style={{
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid " + C.fawn,
            boxShadow: "var(--shadow-md)",
            background: C.paper,
          }}>
            {/* Hero band — brand green gradient with logo */}
            <div style={{
              padding: "20px 22px",
              background: "linear-gradient(135deg, " + C.green + " 0%, " + C.greenDeep + " 100%)",
              position: "relative", overflow: "hidden",
            }}>
              {/* Decorative subtle glow */}
              <div style={{ position: "absolute", top: -40, right: -20, width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)", pointerEvents: "none" }}/>

              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                {/* Logo on a white pill so it pops on the green */}
                <div style={{
                  background: "#fff", borderRadius: 10, padding: "5px 10px",
                  display: "inline-flex", alignItems: "center",
                  boxShadow: "var(--shadow-xs)",
                }}>
                  <img src={LOGO_SRC} alt="DropYard" style={{ height: 18, width: "auto", display: "block" }}/>
                </div>
                <span style={{
                  fontFamily: F.head, fontSize: 10, fontWeight: 900,
                  color: "rgba(255,255,255,0.85)",
                  letterSpacing: "0.16em", textTransform: "uppercase",
                }}>· Barrhaven</span>
              </div>

              <p style={{
                fontFamily: F.head, fontSize: 19, fontWeight: 900, color: "#fff",
                letterSpacing: "-0.025em", lineHeight: 1.15,
              }}>
                {onlyShelf && (
                  <>I'm selling <span style={{ color: "#FFE9A8" }}>{itemCount} {itemCount === 1 ? "item" : "items"}</span><br/>on DropYard</>
                )}
                {onlyDrop && (
                  <>I'm bringing <span style={{ color: "#FFE9A8" }}>{itemCount} {itemCount === 1 ? "item" : "items"}</span><br/>to this Saturday's Drop</>
                )}
                {both && (
                  <><span style={{ color: "#FFE9A8" }}>{shelfItems.length}</span> on the Shelf +<br/><span style={{ color: "#FFE9A8" }}>{dropItems.length}</span> coming Saturday</>
                )}
              </p>
              <p style={{
                fontFamily: F.body, fontSize: 11, fontWeight: 600,
                color: "rgba(255,255,255,0.85)", marginTop: 6,
              }}>
                {onlyShelf && "Claim now — first to tap gets it"}
                {onlyDrop && "Browse + save now · Claims open Saturday 8am"}
                {both && "Some claim now · Some open Saturday 8am"}
              </p>
            </div>

            {/* Item list — mini cards inside, each tagged with its claim path */}
            <div style={{ padding: "16px 18px", background: C.paper }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...visibleShelf, ...visibleDrop].map((it, i) => {
                  const isShelf = pathOf(it) === "shelf";
                  return (
                    <div key={it.id || i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px", borderRadius: 10,
                      background: C.sand, border: "1px solid " + C.fawn,
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: "linear-gradient(135deg, " + C.paper + " 0%, " + C.fawn + "80 100%)",
                        border: "1px solid " + C.fawn,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, flexShrink: 0,
                      }}>{it.e}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontFamily: F.head, fontSize: 12, fontWeight: 800,
                          color: C.ink, letterSpacing: "-0.005em",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{it.t}</p>
                        {/* Path tag — green for Shelf (claim now), amber for Drop (Saturday) */}
                        <p style={{
                          fontFamily: F.head, fontSize: 9, fontWeight: 800,
                          letterSpacing: "0.04em", textTransform: "uppercase",
                          color: isShelf ? C.greenDeep : C.amberDeep,
                          marginTop: 1,
                          display: "inline-flex", alignItems: "center", gap: 4,
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: isShelf ? C.greenDeep : C.amberDeep }}/>
                          {isShelf ? "Claim now" : "Saturday's Drop"}
                        </p>
                      </div>
                      <span style={{
                        fontFamily: F.head, fontSize: 13, fontWeight: 900,
                        color: C.greenDeep, letterSpacing: "-0.01em", flexShrink: 0,
                      }}>${it.price}</span>
                    </div>
                  );
                })}
                {remaining > 0 && (
                  <p style={{
                    textAlign: "center", paddingTop: 4,
                    fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.mink,
                    fontStyle: "italic",
                  }}>+ {remaining} more {remaining === 1 ? "item" : "items"} on the listing</p>
                )}
              </div>
            </div>

            {/* Footer band — branded URL and tagline. Label adapts to scenario. */}
            <div style={{
              padding: "12px 18px",
              borderTop: "1px solid " + C.fawn,
              background: "linear-gradient(135deg, " + (onlyShelf ? C.greenMist : C.amberMist) + " 0%, " + C.sand + " 100%)",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: onlyShelf ? C.greenDeep : C.amberDeep, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {onlyShelf ? "Tap to claim" : "Tap to browse"}
                </p>
                <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 900, color: C.ink, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis" }}>dropyard.app/barrhaven</p>
              </div>
              <div style={{
                fontFamily: F.head, fontSize: 9, fontWeight: 800,
                padding: "4px 9px", borderRadius: 999,
                background: C.green, color: "#fff",
                letterSpacing: "0.06em", textTransform: "uppercase",
                whiteSpace: "nowrap", flexShrink: 0,
              }}>♻️ Rehome local</div>
            </div>
          </div>

          {/* The actual text message — collapsed by default, accessible for power users */}
          <details style={{ marginTop: 14 }}>
            <summary style={{
              fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.ash,
              letterSpacing: "0.12em", textTransform: "uppercase",
              cursor: "pointer", userSelect: "none",
              padding: "6px 0",
            }}>Message text</summary>
            <div style={{
              marginTop: 6,
              padding: "12px 14px", borderRadius: 12,
              background: C.sand, border: "1px solid " + C.fawn,
              fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.ink,
              lineHeight: 1.5, whiteSpace: "pre-line",
            }}>
              {shareText}
            </div>
          </details>
        </div>

        {/* Target grid */}
        <div style={{
          padding: "0 22px 18px 22px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}>
          {targets.map(t => (
            <button
              key={t.id}
              onClick={t.action}
              className="card-elevate"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                padding: "14px 8px",
                borderRadius: 14,
                background: t.bg,
                border: "1px solid " + (t.id === "copy" && copied ? C.green + "40" : C.fawn),
                cursor: "pointer",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <span style={{
                fontFamily: F.head, fontSize: 22, fontWeight: 900,
                color: t.color, lineHeight: 1,
                width: 36, height: 36, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "#fff",
                border: "1px solid " + C.fawn,
              }}>{t.glyph}</span>
              <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: t.color, letterSpacing: "-0.005em" }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Footer note */}
        <div style={{
          padding: "12px 22px",
          borderTop: "1px solid " + C.fawn,
          background: C.sand + "60",
        }}>
          <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, lineHeight: 1.5, textAlign: "center" }}>
            <Heart size={10} strokeWidth={2.4} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }}/>
            More neighbours, more Drop traffic, more rehomed.
          </p>
        </div>
      </div>
    </div>
  );
}


function ManualItemForm({ onDone, onBack, onGoToItems, acceptedMethods = { cash: true, etransfer: true } }) {
  const { isMobile } = useViewport();

  // BUG-084 — real count of OTHER sellers in this Drop, replacing a hardcoded
  // "90+". Mirrors DropYard_SellerDashboard.jsx so both surfaces read the same.
  // This preview renders unauthenticated, and /api/drop/current is optionalAuth:
  // for an anonymous caller the backend returns otherSellerCount === sellerCount,
  // which is the right number here since there is no "self" to exclude.
  // null = not loaded / request failed → the copy omits the clause rather than
  // flashing a placeholder number.
  const [otherSellers, setOtherSellers] = useState(null);
  useEffect(() => {
    let cancelled = false;
    apiRequest("/api/drop/current", {})
      .then((r) => {
        if (cancelled) return;
        setOtherSellers(typeof r?.otherSellerCount === "number" ? r.otherSellerCount : null);
      })
      .catch(() => { if (!cancelled) setOtherSellers(null); });
    return () => { cancelled = true; };
  }, []);

  // Omitted entirely at 0 or while unknown — "alongside 0 other sellers" reads
  // worse than not mentioning it, and an unloaded count must never be guessed.
  const sellerPhrase =
    otherSellers == null || otherSellers === 0 ? ""
    : otherSellers === 1                       ? " alongside 1 other seller"
    :                                            ` alongside ${otherSellers} other sellers`;

  const cats = ["Furniture", "Electronics", "Appliances & Kitchen", "Clothing & Accessories", "Kids & Baby", "Sports & Outdoor", "Tools & Garden", "Home Décor", "Books, Games & Hobbies", "Collectibles & Antiques", "Other"];
  const conds = ["New", "Used - Like New", "Used - Good", "Used - Fair"];
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");
  const [cond, setCond] = useState("");
  const [price, setPrice] = useState("");
  const [showPickup, setShowPickup] = useState(false);
  const [pickupMode, setPickupMode] = useState("flexible");
  const [pickupDays, setPickupDays] = useState([]);
  const [pickupCustom, setPickupCustom] = useState([]);
  const [pickupNewDate, setPickupNewDate] = useState("");
  const [pickupWindows, setPickupWindows] = useState(["morning", "afternoon"]);

  function togDay(d) { setPickupDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]); }
  function togWin(w) { setPickupWindows(p => p.includes(w) ? p.filter(x => x !== w) : [...p, w]); }
  function addPickupDate() { if (pickupNewDate && !pickupCustom.includes(pickupNewDate)) { setPickupCustom(p => [...p, pickupNewDate]); setPickupNewDate(""); } }
  const [photos, setPhotos] = useState([
    { id: 1, emoji: "\u{1F4F7}", label: "Front view" },
    { id: 2, emoji: "\u{1F50D}", label: "Detail" },
  ]);
  const [hasVideo, setHasVideo] = useState(false);
  const [saved, setSaved] = useState(null);
  const [publishWhen, setPublishWhen] = useState("drop"); // "drop" (queue for next Drop) | "shelf" (list now)
  // Compute available payment-method options based on what the seller accepts globally (Settings → Payments).
  // The listing form narrows from this set — it never offers a method the seller hasn't enabled.
  const availablePaymentOptions = (() => {
    const opts = [];
    if (acceptedMethods.cash) opts.push({ id: "cash", label: "Cash only", icon: DollarSign });
    if (acceptedMethods.etransfer) opts.push({ id: "etransfer", label: "e-Transfer only", icon: Banknote });
    if (acceptedMethods.cash && acceptedMethods.etransfer) opts.push({ id: "either", label: "Cash or e-Transfer", icon: Check });
    return opts;
  })();
  // Default: "either" if both enabled; else the only available method.
  const defaultPaymentMethod = acceptedMethods.cash && acceptedMethods.etransfer
    ? "either"
    : (acceptedMethods.cash ? "cash" : "etransfer");
  const [paymentMethod, setPaymentMethod] = useState(defaultPaymentMethod);
  const [showPayment, setShowPayment] = useState(false);
  // Stoop-sale mode: a 30-second express path for impulse declutters. Hides
  // the advanced sections and auto-lists to the Shelf with sensible defaults.
  const [stoopMode, setStoopMode] = useState(false);

  // Bundle mode: list multiple items together for one price ("8 books for $5").
  // Works in both stoop and full modes — yard sales love bundles.
  const [isBundle, setIsBundle] = useState(false);
  const [bundleCount, setBundleCount] = useState("");
  const [bundleContents, setBundleContents] = useState(""); // one item per line

  if (saved) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.gLightBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <CheckCircle size={32} style={{ color: C.gPrimary }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.ink, marginBottom: 8, fontFamily: F.head }}>
            {saved === "drop" ? "Published to Drop!" : saved === "shelf" ? "Published to Shelf!" : "Draft Saved!"}
          </h2>
          <p style={{ fontSize: 14, color: C.mink, lineHeight: 1.7, marginBottom: 24, fontFamily: F.body }}>
            {saved === "drop"
              ? "Your item will go live in this Saturday's Drop. Buyers can claim it during the 48-hour window."
              : saved === "shelf"
              ? "Your item is now available on the Shelf. Buyers can browse and claim it anytime."
              : "Your draft has been saved. Go to My Items to finish it and choose where to list it."}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => onGoToItems ? onGoToItems() : onDone()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 24px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: F.body, backgroundColor: C.gPrimary, color: "#fff" }}>
              Go to My Items <ArrowRight size={16} />
            </button>
            <button onClick={() => { setSaved(null); setIsBundle(false); setBundleCount(""); setBundleContents(""); setTitle(""); setPrice(""); setDesc(""); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 20px", borderRadius: 50, border: "1.5px solid " + C.fawn, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: F.body, background: C.paper, color: C.mink }}>
              List Another Item
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: C.paper, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#777", fontFamily: F.body, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back
      </button>

      {/* Mode toggle: full listing vs stoop-sale express. The "yard sale, now" path. */}
      <div style={{ marginBottom: 18, padding: 4, background: C.sand, border: "1.5px solid " + C.fawn, borderRadius: 14, display: "flex", gap: 4 }}>
        <button onClick={() => setStoopMode(false)} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800, background: !stoopMode ? C.paper : "transparent", color: !stoopMode ? C.ink : C.mink, boxShadow: !stoopMode ? "0 1px 0 " + C.fawn : "none" }}>
          Full listing
        </button>
        <button onClick={() => setStoopMode(true)} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800, background: stoopMode ? C.paper : "transparent", color: stoopMode ? C.amberDeep : C.mink, boxShadow: stoopMode ? "0 1px 0 " + C.amber + "40" : "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Zap size={13} strokeWidth={2.4}/> Stoop sale · 30 sec
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: C.ink, fontFamily: F.head, marginBottom: 4 }}>
          {isBundle ? (stoopMode ? "Quick stoop sale · bundle" : "List a bundle") : (stoopMode ? "Quick stoop sale" : "List new item")}
        </h2>
        {stoopMode && (
          <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>
            Photo, title, price, done — lands on the Shelf in 30 seconds. Skip the prep.
          </p>
        )}
        {!stoopMode && isBundle && (
          <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>
            One photo showing everything together works best.
          </p>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.4fr", gap: isMobile ? 14 : 20 }}>
        {/* Left: Media upload */}
        <div>
          {/* Main photo dropzone */}
          <div style={{ padding: 20, borderRadius: 16, border: "1px solid " + C.fawn, background: C.paper, marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.mink, marginBottom: 10, fontFamily: F.body }}>Photos *</label>
            <div style={{ height: 180, borderRadius: 14, border: "2px dashed #d1d5db", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", background: C.sand, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.gPrimary; e.currentTarget.style.backgroundColor = C.gLightBg; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.backgroundColor = "#fafafa"; }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.gLightBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Camera size={24} style={{ color: C.gPrimary }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.ink, fontFamily: F.body }}>Drop photos here or click to upload</p>
              <p style={{ fontSize: 11, color: C.ash, fontFamily: F.body }}>JPG, PNG up to 10MB each</p>
            </div>

            {/* Photo thumbnails */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {photos.map(p => (
                <div key={p.id} style={{ width: 72, height: 72, borderRadius: 12, border: "1.5px solid " + C.gPrimary + "30", backgroundColor: C.gLightBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <span style={{ fontSize: 22 }}>{p.emoji}</span>
                  <span style={{ fontSize: 8, color: C.gPrimary, fontWeight: 600, fontFamily: F.body, marginTop: 2 }}>{p.label}</span>
                  <button onClick={() => setPhotos(prev => prev.filter(x => x.id !== p.id))}
                    style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", backgroundColor: "#EF4444", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                    <X size={8} style={{ color: "#fff" }} />
                  </button>
                </div>
              ))}
              <button onClick={() => setPhotos(p => [...p, { id: Date.now(), emoji: "\u{1F4F7}", label: "Photo " + (p.length + 1) }])}
                style={{ width: 72, height: 72, borderRadius: 12, border: "2px dashed #d1d5db", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: C.paper, gap: 2 }}>
                <Plus size={16} style={{ color: C.smoke }} />
                <span style={{ fontSize: 8, color: C.smoke, fontFamily: F.body }}>Add</span>
              </button>
            </div>
            <p style={{ fontSize: 10, color: C.ash, marginTop: 8, fontFamily: F.body }}>First photo becomes the cover image. Add up to 8 photos.</p>
          </div>

          {/* Video upload */}
          <div style={{ padding: 16, borderRadius: 16, border: "1px solid " + C.fawn, background: C.paper }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.mink, marginBottom: 10, fontFamily: F.body }}>Short Video (optional)</label>
            {!hasVideo ? (
              <div onClick={() => setHasVideo(true)}
                style={{ height: 80, borderRadius: 12, border: "2px dashed #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", background: C.sand }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.oPrimary; e.currentTarget.style.backgroundColor = C.oLightBg; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.backgroundColor = "#fafafa"; }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.oLightBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Upload size={16} style={{ color: C.oPrimary }} />
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: C.ink, fontFamily: F.body }}>Add a short video</p>
                  <p style={{ fontSize: 10, color: C.ash, fontFamily: F.body }}>MP4, MOV up to 30 seconds</p>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, backgroundColor: C.oLightBg, border: "1px solid " + C.oSoft }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: C.oPrimary + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 20 }}>{"\u{1F3AC}"}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: C.ink, fontFamily: F.body }}>item_video.mp4</p>
                  <p style={{ fontSize: 10, color: C.ash, fontFamily: F.body }}>12 seconds - 4.2 MB</p>
                </div>
                <button onClick={() => setHasVideo(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                  <X size={14} style={{ color: C.ash }} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Item details */}
        <div style={{ padding: 24, borderRadius: 16, border: "1px solid " + C.fawn, background: C.paper }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.mink, marginBottom: 6, fontFamily: F.body }}>Title *</label>
            <input className="input-clean" value={title} onChange={e => setTitle(e.target.value)} placeholder={isBundle ? "e.g., Kids book bundle · 8 books" : "e.g., IKEA KALLAX Bookshelf - White"} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid " + C.fawn, fontSize: 13, fontFamily: F.body, outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Bundle toggle + (when on) count and contents.
              Bundles = multiple items sold together for one price ("8 books for $5").
              Works in both stoop and full modes — yard sales rely on bundles. */}
          <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 12, border: "1.5px solid " + (isBundle ? C.teal + "40" : C.fawn), background: isBundle ? C.tealMist : C.paper, transition: "all 150ms" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <button
                type="button"
                onClick={() => setIsBundle(v => !v)}
                role="switch"
                aria-checked={isBundle}
                style={{ flexShrink: 0, marginTop: 2, width: 36, height: 20, borderRadius: 999, border: "none", padding: 2, cursor: "pointer", background: isBundle ? C.teal : C.smoke, position: "relative", transition: "background 150ms" }}
              >
                <span style={{ display: "block", width: 16, height: 16, borderRadius: "50%", background: "#fff", transform: isBundle ? "translateX(16px)" : "translateX(0)", transition: "transform 150ms" }}/>
              </button>
              <div style={{ flex: 1, minWidth: 0 }} onClick={e => { e.preventDefault(); setIsBundle(v => !v); }}>
                <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: isBundle ? C.teal : C.ink, lineHeight: 1.3, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Package size={13} strokeWidth={2.3}/> List as a bundle / lot
                </p>
                <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, lineHeight: 1.45, marginTop: 2 }}>
                  Multiple items, one price. Like "8 kids' books for $5" or "kitchen set: blender, mixer, kettle".
                </p>
              </div>
            </label>

            {isBundle && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed " + C.teal + "30", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <label style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, flexShrink: 0 }}>How many items?</label>
                  <input
                    type="text" inputMode="numeric"
                    value={bundleCount}
                    onChange={e => setBundleCount(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                    placeholder="e.g., 8"
                    style={{ width: 80, padding: "8px 12px", borderRadius: 8, border: "1.5px solid " + C.teal + "40", fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.teal, outline: "none", background: C.paper, textAlign: "center" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, marginBottom: 4 }}>
                    What's inside? <span style={{ fontWeight: 500, color: C.ash }}>(optional, one item per line)</span>
                  </label>
                  <textarea
                    value={bundleContents}
                    onChange={e => setBundleContents(e.target.value)}
                    placeholder={"e.g.\nCookbook\nPicture book\nTravel novel"}
                    rows={4}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1.5px solid " + C.teal + "40", fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.ink, outline: "none", boxSizing: "border-box", resize: "vertical", background: C.paper, lineHeight: 1.5 }}
                  />
                  <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash, marginTop: 4 }}>
                    Helps buyers searching for individual items find your bundle.
                  </p>
                </div>
              </div>
            )}
          </div>
          {!stoopMode && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.mink, marginBottom: 6, fontFamily: F.body }}>Description *</label>
              <textarea className="input-clean" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe condition, dimensions, what is included..." style={{ width: "100%", height: 90, padding: 12, borderRadius: 10, border: "1.5px solid " + C.fawn, fontSize: 13, fontFamily: F.body, resize: "none", outline: "none", boxSizing: "border-box" }} />
            </div>
          )}
          {!stoopMode && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.mink, marginBottom: 6, fontFamily: F.body }}>Category *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {cats.map(c => (
                    <button key={c} onClick={() => setCat(c)} className="chip-hover" style={{ padding: "7px 13px", borderRadius: 999, border: "1.5px solid " + (cat === c ? C.green : C.fawn), cursor: "pointer", fontSize: 11, fontWeight: cat === c ? 800 : 600, backgroundColor: cat === c ? C.greenMist : C.paper, color: cat === c ? C.greenDeep : C.mink, fontFamily: F.head, letterSpacing: cat === c ? "-0.005em" : 0 }}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.mink, marginBottom: 6, fontFamily: F.body }}>Condition *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {conds.map(c => (
                    <button key={c} onClick={() => setCond(c)} className="chip-hover" style={{ padding: "7px 13px", borderRadius: 999, border: "1.5px solid " + (cond === c ? C.green : C.fawn), cursor: "pointer", fontSize: 11, fontWeight: cond === c ? 800 : 600, backgroundColor: cond === c ? C.greenMist : C.paper, color: cond === c ? C.greenDeep : C.mink, fontFamily: F.head, letterSpacing: cond === c ? "-0.005em" : 0 }}>{c}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.mink, marginBottom: 6, fontFamily: F.body }}>
              {isBundle ? "Bundle price ($) * " : "Price ($) *"}
              {isBundle && <span style={{ fontWeight: 500, color: C.ash, fontSize: 11 }}>· one price for the whole bundle</span>}
            </label>
            <input className="input-clean" value={price} onChange={e => setPrice(e.target.value)} placeholder={isBundle ? "e.g., 5" : "0.00"} type="number" style={{ width: 160, padding: "10px 14px", borderRadius: 10, border: "1.5px solid " + C.fawn, fontSize: 16, fontWeight: 700, fontFamily: F.head, outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Pickup Availability - optional */}
          {!stoopMode && (
          <div style={{ marginBottom: 20, borderRadius: 16, border: "1.5px solid " + (showPickup ? C.green + "30" : C.fawn), overflow: "hidden" }}>
            <button onClick={() => setShowPickup(!showPickup)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", border: "none", cursor: "pointer", background: showPickup ? C.greenMist : C.sand, textAlign: "left", transition: "background 150ms" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <MapPin size={16} style={{ color: showPickup ? C.green : C.mink }}/>
                <div>
                  <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: showPickup ? C.greenDeep : C.ink }}>Pickup availability</p>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink }}>Optional · let buyers know when they can pick up</p>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: C.mink, transform: showPickup ? "rotate(90deg)" : "rotate(0)", transition: "transform 200ms" }}/>
            </button>

            {showPickup && (
              <div style={{ padding: "16px 16px 18px", background: C.paper, borderTop: "1px solid " + C.fawn }}>
                {/* Mode selector */}
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {[
                    { id: "flexible", l: "Recurring days" },
                    { id: "custom",   l: "Specific dates" },
                    { id: "anytime",  l: "Any day" },
                  ].map(m => {
                    const on = pickupMode === m.id;
                    return (
                      <button key={m.id} onClick={() => setPickupMode(m.id)}
                        style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "1.5px solid " + (on ? C.green : C.fawn), cursor: "pointer", fontSize: 12, fontWeight: on ? 800 : 600, background: on ? C.greenMist : C.paper, color: on ? C.greenDeep : C.mink, fontFamily: F.head, textAlign: "center", transition: "all 150ms" }}>
                        {m.l}
                      </button>
                    );
                  })}
                </div>

                {pickupMode === "flexible" && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => {
                      const sel = pickupDays.includes(day);
                      return (
                        <button key={day} onClick={() => togDay(day)}
                          style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px solid " + (sel ? C.green : C.fawn), cursor: "pointer", fontSize: 12, fontWeight: sel ? 800 : 600, background: sel ? C.greenMist : C.paper, color: sel ? C.greenDeep : C.mink, fontFamily: F.head, transition: "all 150ms" }}>
                          {day}
                        </button>
                      );
                    })}
                  </div>
                )}

                {pickupMode === "custom" && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      <input type="date" value={pickupNewDate} onChange={e => setPickupNewDate(e.target.value)}
                        style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.fawn, fontSize: 12, fontFamily: F.body, outline: "none", color: C.ink, background: C.paper, boxSizing: "border-box" }}/>
                      <button onClick={addPickupDate}
                        style={{ padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, background: C.green, color: "#fff", fontFamily: F.head, display: "flex", alignItems: "center", gap: 4, boxShadow: "0 2px 0 " + C.greenDeep }}>
                        <Plus size={12} strokeWidth={2.5}/> Add
                      </button>
                    </div>
                    {pickupCustom.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {pickupCustom.map(d => (
                          <div key={d} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, background: C.greenMist, border: "1px solid " + C.green + "25" }}>
                            <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 700, color: C.greenDeep }}>{d}</span>
                            <button onClick={() => setPickupCustom(p => p.filter(x => x !== d))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                              <X size={11} style={{ color: C.greenDeep }}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {pickupCustom.length === 0 && (
                      <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, fontStyle: "italic" }}>Add one or more specific dates when you'll be available.</p>
                    )}
                  </div>
                )}

                {pickupMode === "anytime" && (
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: C.sand, border: "1px solid " + C.fawn, marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <Info size={13} style={{ color: C.mink, flexShrink: 0, marginTop: 1 }}/>
                    <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>Buyers can request any day. You'll confirm via WhatsApp before the pickup is scheduled.</p>
                  </div>
                )}

                {/* Time windows */}
                <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Time windows</p>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { id: "morning",   l: "Morning",   t: "9 am - 12 pm" },
                    { id: "afternoon", l: "Afternoon", t: "12 - 4 pm" },
                    { id: "evening",   l: "Evening",   t: "4 - 7 pm" },
                  ].map(w => {
                    const sel = pickupWindows.includes(w.id);
                    return (
                      <button key={w.id} onClick={() => togWin(w.id)}
                        style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1.5px solid " + (sel ? C.green : C.fawn), cursor: "pointer", background: sel ? C.greenMist : C.paper, textAlign: "center", transition: "all 150ms" }}>
                        <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: sel ? 800 : 700, color: sel ? C.greenDeep : C.mink }}>{w.l}</p>
                        <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: sel ? C.greenDeep : C.ash, marginTop: 2 }}>{w.t}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Payment method — only render the picker if there's a choice to make.
              If the seller accepts only cash (or only e-transfer), it's already
              implied by Settings and we skip showing the section. */}
          {!stoopMode && availablePaymentOptions.length > 1 && (
          <div style={{ marginBottom: 20, borderRadius: 16, border: "1.5px solid " + (showPayment ? C.green + "30" : C.fawn), overflow: "hidden" }}>
            <button type="button" onClick={() => setShowPayment(!showPayment)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", border: "none", cursor: "pointer", background: showPayment ? C.greenMist : C.sand, textAlign: "left", transition: "background 150ms" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <DollarSign size={16} style={{ color: showPayment ? C.green : C.mink }}/>
                <div>
                  <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: showPayment ? C.greenDeep : C.ink }}>Payment method</p>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink }}>
                    {showPayment ? "Choose how you'll be paid for this item" : (
                      paymentMethod === "cash"      ? "Cash only · change for this item" :
                      paymentMethod === "etransfer" ? "e-Transfer only · change for this item" :
                                                      "Cash or e-Transfer · change for this item"
                    )}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: C.mink, transform: showPayment ? "rotate(90deg)" : "rotate(0)", transition: "transform 200ms" }}/>
            </button>

            {showPayment && (
              <div style={{ padding: "16px 16px 18px", background: C.paper, borderTop: "1px solid " + C.fawn }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {availablePaymentOptions.map(p => {
                    const on = paymentMethod === p.id;
                    const Ic = p.icon;
                    return (
                      <button key={p.id} type="button" onClick={() => setPaymentMethod(p.id)}
                        style={{ flex: 1, padding: "11px 8px", borderRadius: 10, border: "1.5px solid " + (on ? C.green : C.fawn), cursor: "pointer", background: on ? C.greenMist : C.paper, color: on ? C.greenDeep : C.mink, fontFamily: F.head, fontSize: 12, fontWeight: on ? 800 : 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all 150ms" }}>
                        <Ic size={16}/>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash, marginTop: 10, lineHeight: 1.5, fontStyle: "italic" }}>
                  Options come from Settings → Payments. Want to add more? Change them globally and they'll appear here.
                </p>
              </div>
            )}
          </div>
          )}

                    {/* When should this go live? — hidden in stoop mode (auto-Shelf) */}
          {!stoopMode && (
          <div style={{ padding: "18px 20px", borderRadius: 18, background: C.sand, border: "1.5px solid " + C.fawn, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink }}>When should this go live?</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink }}>
                <Calendar size={11}/> Next Drop: Saturday 8 am
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Option A: Queue for next Drop */}
              <button onClick={() => setPublishWhen("drop")} style={{
                textAlign: "left", padding: 14, borderRadius: 14,
                border: "2px solid " + (publishWhen === "drop" ? C.green : C.fawn),
                background: publishWhen === "drop" ? C.greenMist : C.paper,
                cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid " + (publishWhen === "drop" ? C.green : C.smoke), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  {publishWhen === "drop" && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.green }}/>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink }}>Queue for the next Drop</p>
                    <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 900, padding: "2px 7px", borderRadius: 999, background: C.green, color: "#fff", letterSpacing: "0.06em" }}>RECOMMENDED</span>
                  </div>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>{`Goes live Saturday at 8 am${sellerPhrase} — higher visibility, event-driven traffic.`}</p>
                </div>
              </button>

              {/* Option B: List now on the Shelf */}
              <button onClick={() => setPublishWhen("shelf")} style={{
                textAlign: "left", padding: 14, borderRadius: 14,
                border: "2px solid " + (publishWhen === "shelf" ? C.amber : C.fawn),
                background: publishWhen === "shelf" ? C.amberMist : C.paper,
                cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid " + (publishWhen === "shelf" ? C.amber : C.smoke), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  {publishWhen === "shelf" && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.amber }}/>}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 3 }}>List now on the Shelf</p>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>Available to buyers today — automatically rolls into the next Drop if unsold.</p>
                </div>
              </button>
            </div>
          </div>
          )}

          {/* Stoop-mode helper line — sets expectations for the express path */}
          {stoopMode && (
            <div style={{ padding: "14px 16px", borderRadius: 14, background: C.amberMist, border: "1.5px solid " + C.amber + "30", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <Zap size={15} style={{ color: C.amberDeep, flexShrink: 0 }} strokeWidth={2.4}/>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.amberDeep, lineHeight: 1.5 }}>
                Lands on the Shelf right away. Cash or e-Transfer, flexible pickup. You can fill in details later from My items.
              </p>
            </div>
          )}

          {/* Action row */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {!stoopMode && (
              <button onClick={() => setSaved("draft")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 20px", borderRadius: 999, border: "1.5px solid " + C.fawn, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: F.head, background: C.paper, color: C.mink }}>
                Save as draft
              </button>
            )}
            <button onClick={() => setSaved(stoopMode ? "shelf" : publishWhen)} className="cta-primary" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "12px 26px", borderRadius: 999, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 800, fontFamily: F.head,
              background: stoopMode ? C.amberDeep : (publishWhen === "drop" ? C.green : C.amber),
              color: "#fff",
              boxShadow: "0 2px 0 " + (stoopMode ? "#8B4A00" : (publishWhen === "drop" ? C.greenDeep : C.amberDeep)),
              flex: stoopMode ? 1 : "0 0 auto",
            }}>
              {stoopMode ? <><Zap size={15} strokeWidth={2.5}/> Post stoop sale</> : <><Check size={15} strokeWidth={2.5}/>{publishWhen === "drop" ? " Queue for Saturday's Drop" : " Publish to Shelf now"}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Tiny expandable for showing what's in a bundle. Collapsed by default —
   first three items shown inline, "+N more" to expand. */
function BundleInside({ contents, isMobile }) {
  const [open, setOpen] = useState(false);
  if (!contents || contents.length === 0) return null;
  const visible = open ? contents : contents.slice(0, 3);
  const remainder = contents.length - visible.length;
  return (
    <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: 10, background: C.tealMist, border: "1px solid " + C.teal + "25" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Package size={11} style={{ color: C.teal }} strokeWidth={2.3}/>
        <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.teal, letterSpacing: "0.06em", textTransform: "uppercase" }}>What's inside</span>
      </div>
      <p style={{ fontFamily: F.body, fontSize: isMobile ? 11 : 12, fontWeight: 600, color: C.ink, lineHeight: 1.45 }}>
        {visible.join(" · ")}
        {remainder > 0 && (
          <>
            {" "}
            <button onClick={() => setOpen(true)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: F.head, fontSize: isMobile ? 11 : 12, fontWeight: 800, color: C.teal }}>+{remainder} more</button>
          </>
        )}
        {open && contents.length > 3 && (
          <>
            {" "}
            <button onClick={() => setOpen(false)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: F.head, fontSize: isMobile ? 11 : 12, fontWeight: 700, color: C.mink }}>show less</button>
          </>
        )}
      </p>
    </div>
  );
}

/* ============================== MY ITEMS ============================== */
/* Closing-time banner — used by MyItemsView during Sunday's last 2 hours.
   Bulk discount only: preset 10/25/50% + Custom. The per-item "free pile"
   action lives on each unsold item card — moving to $0 is destructive
   enough that it deserves an explicit per-item decision. */
function ClosingTimeBanner({ counts, isMobile, onDiscount }) {
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState("20");
  function applyCustom() {
    const n = Math.max(1, Math.min(95, Math.round(Number(custom) || 0)));
    if (n) { onDiscount(n); setShowCustom(false); }
  }
  return (
    <div style={{
      padding: isMobile ? "18px 20px" : "20px 24px",
      borderRadius: isMobile ? 16 : 18,
      background: "linear-gradient(135deg, " + C.claretMist + " 0%, " + C.paper + " 75%)",
      border: "1px solid " + C.claret + "30",
      boxShadow: "var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.7)",
      marginBottom: isMobile ? 14 : 22,
      display: "flex", alignItems: "flex-start", gap: 14, flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -50, right: -20, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, " + C.claret + "18 0%, transparent 70%)", pointerEvents: "none" }}/>
      <div style={{ display: "flex", alignItems: "center", gap: 14, alignSelf: "stretch", position: "relative" }}>
        <div style={{
          width: 46, height: 46, borderRadius: 13,
          background: "linear-gradient(180deg, " + C.claret + " 0%, #A8281C 100%)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          boxShadow: "var(--shadow-press-claret), var(--shadow-xs)",
        }}>
          <Clock size={20} style={{ color: "#fff" }} strokeWidth={2.4}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: F.head, fontSize: isMobile ? 14 : 15, fontWeight: 900, color: C.claret, marginBottom: 3, letterSpacing: "-0.015em" }}>Closing time · last call for the Drop</p>
          <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, lineHeight: 1.5 }}>
            <span style={{ color: C.ink, fontWeight: 700 }}>{counts.live} items</span> still unsold — drop prices in bulk below, or use the "Make free" action on individual items before they return to the Shelf.
          </p>
        </div>
      </div>

      {/* Bulk discount picker — preset percentages + custom input. Applies to all unsold items in one tap. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", alignSelf: "stretch", paddingTop: 4, position: "relative" }}>
        <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase" }}>Drop price by</span>
        {[10, 25, 50].map(p => (
          <button key={p} onClick={() => onDiscount(p)} className="cta-primary" style={{
            padding: "9px 16px", borderRadius: 999, border: "none", cursor: "pointer",
            fontFamily: F.head, fontSize: 12, fontWeight: 800, letterSpacing: "-0.005em",
            background: "linear-gradient(180deg, " + C.claret + " 0%, #A8281C 100%)",
            color: "#fff",
            boxShadow: "var(--shadow-press-claret), var(--shadow-xs)",
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            <TrendingDown size={12} strokeWidth={2.4}/> {p}%
          </button>
        ))}
        {!showCustom ? (
          <button onClick={() => setShowCustom(true)} className="btn-outlined" style={{
            padding: "9px 16px", borderRadius: 999,
            border: "1.5px solid " + C.claret + "40",
            cursor: "pointer", fontFamily: F.head, fontSize: 12, fontWeight: 800,
            background: C.paper, color: C.claret,
          }}>
            Custom %
          </button>
        ) : (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 6px", borderRadius: 999,
            border: "1.5px solid " + C.claret + "40", background: C.paper,
            boxShadow: "var(--shadow-xs)",
          }}>
            <input
              type="text" inputMode="numeric" autoFocus
              value={custom}
              onChange={e => setCustom(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
              onKeyDown={e => { if (e.key === "Enter") applyCustom(); if (e.key === "Escape") setShowCustom(false); }}
              style={{ width: 36, padding: "4px 6px", border: "none", outline: "none", fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.claret, background: "transparent", textAlign: "right" }}
            />
            <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.claret }}>%</span>
            <button onClick={applyCustom} className="cta-primary" style={{
              padding: "6px 12px", borderRadius: 999, border: "none", cursor: "pointer",
              fontFamily: F.head, fontSize: 11, fontWeight: 800,
              background: "linear-gradient(180deg, " + C.claret + " 0%, #A8281C 100%)",
              color: "#fff",
              boxShadow: "var(--shadow-xs)",
            }}>
              Apply
            </button>
            <button onClick={() => setShowCustom(false)} className="icon-btn" style={{ padding: "5px 8px", borderRadius: 999, border: "none", cursor: "pointer", background: "transparent", color: C.mink }} title="Cancel">
              <X size={11}/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


/* ========= INVENTORY SUB-TABS (shared header for Items/Claims/Pickups) ========= */
function InventoryTabs({ activeView, onNav, ordersCount = 0, ordersUrgent = 0 }) {
  const { isMobile } = useViewport();
  const tabs = [
    { id: "items",  label: "My items",  view: "items" },
    { id: "orders", label: "Orders",    view: "orders", count: ordersCount, urgent: ordersUrgent },
  ];
  return (
    <div className="fade-in" style={{ maxWidth: isMobile ? "100%" : 1160, margin: isMobile ? "0 auto 16px" : "0 auto 24px" }}>
      {/* Page header with icon + eyebrow */}
      <div style={{ padding: isMobile ? "18px 0 14px" : "28px 0 22px", position: "relative", marginBottom: isMobile ? 6 : 10 }}>
        {/* Decorative coloured dots — hidden on mobile to reduce clutter */}
        {!isMobile && (
          <div style={{ position: "absolute", top: 30, right: 0, display: "flex", gap: 6, opacity: 0.5 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.amber }}/>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.green }}/>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.claret }}/>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 18 }}>
          <div style={{
            width: isMobile ? 46 : 60, height: isMobile ? 46 : 60,
            borderRadius: isMobile ? 14 : 18,
            background: "linear-gradient(135deg, " + C.greenMist + " 0%, " + C.greenMist + "70 100%)",
            border: "1px solid " + C.green + "30",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: isMobile ? 4 : 6,
            boxShadow: "var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.6)",
          }}>
            <Box size={isMobile ? 22 : 26} style={{ color: C.greenDeep }} strokeWidth={2.3}/>
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: F.head, fontSize: isMobile ? 28 : 40, fontWeight: 900, color: C.ink, letterSpacing: "-0.035em", lineHeight: 1.02, marginBottom: isMobile ? 6 : 8 }}>{activeView === "orders" ? "Orders" : "My items"}</h1>
            <p style={{ fontFamily: F.body, fontSize: isMobile ? 13 : 15, fontWeight: 500, color: C.mink, lineHeight: 1.55, maxWidth: 560 }}>
              {activeView === "orders"
                ? "Upcoming pickups you need to handle."
                : "Everything you have listed, in draft, or pending review."}
            </p>
          </div>
        </div>
      </div>

      {/* Tab row */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid " + C.fawn, paddingBottom: 0 }}>
        {tabs.map(tab => {
          const active = activeView === tab.view || (tab.view === "orders" && ["orders","pickups"].includes(activeView));
          return (
            <button
              key={tab.id}
              onClick={() => onNav(tab.view)}
              className="nav-item"
              style={{
                position: "relative", display: "flex", alignItems: "center", gap: 8,
                padding: isMobile ? "11px 16px 13px" : "12px 20px 14px",
                border: "none", cursor: "pointer", background: "transparent",
                fontFamily: F.head, fontSize: isMobile ? 13 : 14, fontWeight: active ? 900 : 700,
                color: active ? C.ink : C.mink,
                letterSpacing: active ? "-0.01em" : 0,
                borderRadius: 0,
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontFamily: F.head, fontSize: 10, fontWeight: 900,
                  padding: "2px 8px", borderRadius: 999,
                  background: tab.urgent > 0 ? C.claretMist : C.sand,
                  color: tab.urgent > 0 ? C.claret : C.mink,
                  border: "1px solid " + (tab.urgent > 0 ? C.claret + "30" : C.fawn),
                }}>
                  {tab.count}
                  {tab.urgent > 0 && <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.claret }}/>}
                </span>
              )}
              {active && <div style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 3, background: C.green, borderRadius: 2 }}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MyItemsView({ onNav, onEdit, dropPhase = "between" }) {
  const { isMobile } = useViewport();
  // Drop state derives from phase. "live" and "closing" both mean items are publicly buyable.
  const dropIsLive  = dropPhase === "live" || dropPhase === "closing";
  const isClosing   = dropPhase === "closing";

  const [filter, setFilter] = useState("all");
  const [successMsg, setSuccessMsg] = useState(null);
  const [priceEditId, setPriceEditId] = useState(null);
  const [tempPrice, setTempPrice] = useState("");
  // Confirmation modal for destructive delete-draft action
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Items now carry publishedTo (queue target) + status (draft | published).
  // shelfDays > 21 surfaces a stale nudge. isBundle adds a Bundle pill.
  const [items, setItems] = useState([
    { id: 1, e: "\uD83D\uDECF\uFE0F", t: "Full Bedroom Set",         cat: "Furniture",            cond: "Used - Good",      price: 600, status: "published", publishedTo: "drop",  views: 42, saves: 8,  isBundle: true, bundleCount: 4, bundleContents: ["Queen bed frame", "Mattress", "2 nightstands", "Dresser"] },
    { id: 2, e: "\uD83D\uDCFA",       t: "LG 55\" Smart TV",          cat: "Electronics",          cond: "Used - Good",      price: 250, status: "published", publishedTo: "shelf", views: 67, saves: 15, shelfDays: 5  },
    { id: 4, e: "\uD83D\uDECB\uFE0F", t: "Sofa Set 3 Seater",         cat: "Furniture",            cond: "Used - Good",      price: 500, status: "published", publishedTo: "drop",  views: 55, saves: 9  },
    { id: 5, e: "\uD83D\uDCD6",       t: "Kids Study Desk",           cat: "Kids & Baby",          cond: "Used - Fair",      price: 45,  status: "draft",     publishedTo: null,    views: 0,  saves: 0  },
    { id: 6, e: "\uD83C\uDF73",       t: "Kitchen Appliances Bundle", cat: "Appliances & Kitchen", cond: "Used - Good",      price: 120, status: "draft",     publishedTo: null,    views: 0,  saves: 0,  isBundle: true, bundleCount: 6, bundleContents: ["Blender", "Food processor", "Hand mixer", "Coffee grinder", "Toaster", "Kettle"] },
    { id: 7, e: "\uD83E\uDE91",       t: "IKEA KALLAX Bookshelf",     cat: "Furniture",            cond: "Used - Good",      price: 35,  status: "published", publishedTo: "shelf", views: 28, saves: 4,  shelfDays: 26 }, // stale
    { id: 8, e: "\uD83D\uDD27",       t: "DeWalt Drill Set",          cat: "Tools & Garden",       cond: "New",              price: 65,  status: "published", publishedTo: "drop",  views: 31, saves: 7  },
  ]);

  // Compute the lifecycle for each item
  function lifecycleOf(item) {
    if (item.status === "draft") return "draft";
    if (item.publishedTo === "drop" && !dropIsLive) return "queued";
    if (item.publishedTo === "drop" && dropIsLive)  return "live";
    if (item.publishedTo === "shelf" && dropIsLive) return "live";  // Shelf items auto-join Live Drop
    if (item.publishedTo === "shelf" && !dropIsLive) return "shelf";
    return "draft";
  }

  const lifecycleMeta = {
    draft:  { label: "Draft",                    color: "#fff",      bg: C.mink,       border: C.mink,             icon: "draft" },
    queued: { label: "Queued for Saturday's Drop", color: C.amberDeep, bg: C.amberMist,  border: C.amber + "30" },
    live:   { label: "Live in Drop",             color: C.greenDeep, bg: C.greenMist,  border: C.green + "40", pulse: true },
    shelf:  { label: "On Shelf",                 color: C.greenDeep, bg: C.greenMist,  border: C.green + "30" },
  };

  // Filters follow the lifecycle
  const allFilters = [
    { id: "all",    label: "All" },
    { id: "draft",  label: "Drafts" },
    { id: "queued", label: "Queued for Drop" },
    { id: "live",   label: "Live in Drop" },
    { id: "shelf",  label: "On the Shelf" },
  ].filter(f => f.id !== "live" || dropIsLive);

  const counts = {
    all:    items.length,
    draft:  items.filter(i => lifecycleOf(i) === "draft").length,
    queued: items.filter(i => lifecycleOf(i) === "queued").length,
    live:   items.filter(i => lifecycleOf(i) === "live").length,
    shelf:  items.filter(i => lifecycleOf(i) === "shelf").length,
  };

  const filtered = filter === "all" ? items : items.filter(i => lifecycleOf(i) === filter);

  // Publish chooser modal state — opens when Publish CTA is tapped on a draft.
  // Lets the seller explicitly pick Drop (curated spotlight) vs. Shelf (claimable now).
  const [publishChooserItem, setPublishChooserItem] = useState(null);

  // --------- Row actions ---------
  function openPublishChooser(item) {
    setPublishChooserItem(item);
  }
  function publishToDrop(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: "published", publishedTo: "drop" } : i));
    setPublishChooserItem(null);
    flash("Queued for Saturday's Drop.");
  }
  function publishToShelf(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: "published", publishedTo: "shelf" } : i));
    setPublishChooserItem(null);
    flash(dropIsLive ? "Added to the Shelf · selling now in the live Drop." : "Added to the Shelf · selling now.");
  }
  function makeLiveNow(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, publishedTo: "shelf" } : i));
    flash("Moved to Shelf · selling now.");
  }
  function unpublish(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: "draft", publishedTo: null } : i));
    flash("Unpublished · saved to Drafts.");
  }
  function deleteDraft(id) {
    setItems(prev => prev.filter(i => i.id !== id));
    flash("Draft deleted.");
  }
  function beginPriceEdit(item) { setPriceEditId(item.id); setTempPrice(String(item.price)); }
  function commitPriceEdit() {
    const next = Number(tempPrice);
    if (next > 0) {
      const it = items.find(i => i.id === priceEditId);
      setItems(prev => prev.map(i => i.id === priceEditId ? { ...i, price: next } : i));
      if (it && next < it.price) flash("Price lowered · buyers may get a price-drop notification.");
    }
    setPriceEditId(null);
  }
  function flash(msg) { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3500); }

  // Free pile — per-item action, only meaningful for live items during closing.
  // Stashes the prior price so the seller can restore if they change their mind.
  function makeFree(id) {
    setItems(prev => prev.map(i => i.id === id
      ? { ...i, _priceBeforeFree: i.price, price: 0, isFree: true }
      : i));
    flash("Added to free pile.");
  }
  function undoFree(id) {
    setItems(prev => prev.map(i => i.id === id
      ? { ...i, price: i._priceBeforeFree || 1, isFree: false, _priceBeforeFree: undefined }
      : i));
    flash("Removed from free pile.");
  }

  const claimedCount = 3;

  return (
    <div className="fade-in">
      <InventoryTabs activeView="items" onNav={onNav} ordersCount={7} ordersUrgent={1}/>

      {/* Phase-aware Drop strip */}
      {isClosing ? (
        <ClosingTimeBanner
          counts={counts}
          isMobile={isMobile}
          onDiscount={(pct) => {
            const factor = 1 - pct / 100;
            setItems(prev => prev.map(i => (lifecycleOf(i) === "live" && !i.isFree) ? { ...i, price: Math.max(1, Math.round(i.price * factor)) } : i));
            flash("Unsold items dropped " + pct + "%.");
          }}
        />
      ) : (
        <div style={{ padding: isMobile ? "14px 16px" : "16px 20px", borderRadius: isMobile ? 14 : 18, background: dropIsLive ? C.greenMist : "linear-gradient(135deg, " + C.amberMist + ", " + C.paper + ")", border: "1.5px solid " + (dropIsLive ? C.green + "30" : C.amber + "25"), marginBottom: isMobile ? 14 : 20, display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 12 : 14, flexWrap: "wrap" }}>
          <div style={{ width: isMobile ? 38 : 44, height: isMobile ? 38 : 44, borderRadius: isMobile ? 12 : 14, background: dropIsLive ? C.green : C.amber, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 3px 10px " + (dropIsLive ? C.green : C.amber) + "35" }}>
            <Calendar size={isMobile ? 17 : 20} style={{ color: "#fff" }}/>
          </div>
          <div style={{ flex: 1, minWidth: isMobile ? 0 : 220 }}>
            <p style={{ fontFamily: F.head, fontSize: isMobile ? 13 : 14, fontWeight: 900, color: dropIsLive ? C.greenDeep : C.amberDeep, marginBottom: 2, display: "flex", alignItems: "center", gap: 7 }}>
              {dropIsLive && <span style={{ position: "relative", display: "inline-flex", width: 9, height: 9 }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.green, opacity: 0.4, animation: "pulseLive 1.8s ease-in-out infinite" }}/>
                <span style={{ position: "relative", width: 9, height: 9, borderRadius: "50%", background: C.green }}/>
              </span>}
              {dropIsLive ? "Drop is live now · ends Sunday 6 pm" : "Next Drop · Saturday 8 am"}
            </p>
            <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, lineHeight: 1.5 }}>
              {dropIsLive
                ? counts.live + " of your items are in the Live Drop right now."
                : counts.shelf + " selling on the Shelf now · " + counts.queued + " queued for Saturday's Drop"}
            </p>
          </div>
          <button onClick={() => onNav("add-manual")} className="cta-primary" style={{ padding: "10px 18px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, background: C.paper, color: dropIsLive ? C.greenDeep : C.amberDeep, fontFamily: F.head, boxShadow: "0 1px 0 " + (dropIsLive ? C.green : C.amber) + "40", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexShrink: 0, width: isMobile ? "100%" : "auto" }}>
            <Plus size={13} strokeWidth={2.5}/> List more
          </button>
        </div>
      )}

      {/* Success toast */}
      {successMsg && (
        <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: C.greenMist, border: "1px solid " + C.green + "30", marginBottom: 16 }}>
          <CheckCircle size={16} style={{ color: C.greenDeep }}/>
          <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.greenDeep, flex: 1 }}>{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <X size={14} style={{ color: C.greenDeep }}/>
          </button>
        </div>
      )}

      {/* Claimed items quick link — more elegant */}
      {claimedCount > 0 && (
        <button onClick={() => onNav("messages")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 14, background: C.paper, border: "1.5px solid " + C.fawn, marginBottom: 16, width: "100%", cursor: "pointer", textAlign: "left", transition: "all 150ms" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.claret + "50"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.fawn; }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.claretMist, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ClipboardList size={16} style={{ color: C.claret }}/>
          </div>
          <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink, flex: 1 }}>
            {claimedCount} {claimedCount === 1 ? "item has" : "items have"} been claimed
          </p>
          <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 700, color: C.mink }}>Open messages</span>
          <ChevronRight size={14} style={{ color: C.mink }}/>
        </button>
      )}

      {/* Filter tabs — wrap on both desktop and mobile (matches buyer pattern; ensures every pill is visible without horizontal scroll) */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {allFilters.map(f => {
          const on = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 999, border: "1.5px solid " + (on ? C.ink : C.fawn), background: on ? C.ink : C.paper, color: on ? "#fff" : C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 150ms", whiteSpace: "nowrap" }}>
              {f.label}
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: on ? "rgba(255,255,255,0.18)" : C.sand, color: on ? "#fff" : C.ash }}>{counts[f.id]}</span>
            </button>
          );
        })}
      </div>

      {/* Items list */}
      {filtered.length === 0 && (
        <div style={{ padding: "50px 20px", textAlign: "center", borderRadius: 16, border: "1.5px dashed " + C.fawn, background: C.paper }}>
          <Package size={28} style={{ color: C.smoke, marginBottom: 10 }}/>
          <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 4 }}>Nothing here yet</p>
          <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink }}>Items with this status will appear here.</p>
        </div>
      )}

      <div style={isMobile
        ? { display: "flex", flexDirection: "column", gap: 10 }
        : { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }
      }>
        {filtered.map(item => {
          const lc = lifecycleOf(item);
          const meta = lifecycleMeta[lc];
          // On mobile we restructure: top row holds emoji + title block + price; actions move to their own bottom row.
          if (isMobile) {
            return (
              <article key={item.id} className="card-elevate" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 14px", borderRadius: 14, border: "1px solid " + meta.border, background: C.paper, boxShadow: "var(--shadow-xs)" }}>
                {/* Top row: emoji · title block · price */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: "linear-gradient(135deg, " + C.sand + ", " + C.fawn + ")", border: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{item.e}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 5, lineHeight: 1.3 }}>{item.t}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.head, fontSize: 9, fontWeight: 900, padding: "3px 9px", borderRadius: 999, background: meta.bg, color: meta.color, letterSpacing: "0.04em", border: "1px solid " + meta.border }}>
                        {meta.pulse && <span style={{ position: "relative", display: "inline-flex", width: 6, height: 6 }}>
                          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: meta.color, opacity: 0.4, animation: "pulseLive 1.8s ease-in-out infinite" }}/>
                          <span style={{ position: "relative", width: 6, height: 6, borderRadius: "50%", background: meta.color }}/>
                        </span>}
                        {meta.icon === "draft" && <ClipboardList size={9} strokeWidth={2.6}/>}
                        {meta.label}{lc === "shelf" && item.shelfDays ? " · " + item.shelfDays + "d" : ""}
                      </span>
                      {item.isBundle && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.head, fontSize: 9, fontWeight: 900, padding: "3px 9px", borderRadius: 999, background: C.tealMist, color: C.teal, letterSpacing: "0.04em", border: "1px solid " + C.teal + "30" }}>
                          <Package size={9} strokeWidth={2.4}/> Bundle of {item.bundleCount}
                        </span>
                      )}
                      {item.isFree && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.head, fontSize: 9, fontWeight: 900, padding: "3px 9px", borderRadius: 999, background: C.claret, color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          <Heart size={9} strokeWidth={2.4}/> Free pile
                        </span>
                      )}
                    </div>
                  </div>

                  <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0, textAlign: "right" }}>
                    {priceEditId === item.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "flex-end" }}>
                        <span style={{ fontFamily: F.head, fontSize: 14, fontWeight: 900, color: C.green }}>$</span>
                        <input type="text" value={tempPrice} autoFocus onChange={e => setTempPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                          onBlur={commitPriceEdit}
                          onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setPriceEditId(null); }}
                          style={{ width: 56, padding: "2px 6px", borderRadius: 6, border: "1.5px solid " + C.green, fontFamily: F.head, fontSize: 14, fontWeight: 900, color: C.green, outline: "none", background: C.paper, textAlign: "center" }}/>
                      </div>
                    ) : (
                      <p style={{ fontFamily: F.head, fontSize: 18, fontWeight: 900, color: item.isFree ? C.claret : C.green, letterSpacing: "-0.01em" }}>{item.isFree ? "FREE" : ("$" + item.price)}</p>
                    )}
                    {isClosing && lc === "live" && (
                      item.isFree ? (
                        <button onClick={() => undoFree(item.id)} style={{ marginTop: 4, padding: "3px 9px", borderRadius: 999, border: "1px solid " + C.fawn, background: C.paper, cursor: "pointer", fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.mink }}>
                          Undo
                        </button>
                      ) : (
                        <button onClick={() => makeFree(item.id)} style={{ marginTop: 4, padding: "3px 9px", borderRadius: 999, border: "1px solid " + C.claret + "40", background: C.paper, cursor: "pointer", fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.claret, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <Heart size={9} strokeWidth={2.4}/> Make free
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Meta row */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, paddingLeft: 64 }}>
                  <span>{item.cat}</span>
                  <span>·</span>
                  <span>{item.cond}</span>
                  {item.views > 0 && (<><span>·</span><span style={{ display: "flex", alignItems: "center", gap: 3 }}><Eye size={10}/> {item.views}</span></>)}
                  {item.saves > 0 && (<><span>·</span><span style={{ display: "flex", alignItems: "center", gap: 3 }}><Heart size={10}/> {item.saves}</span></>)}
                </div>

                {lc === "shelf" && !dropIsLive && (
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.amberDeep, display: "flex", alignItems: "center", gap: 4, fontStyle: "italic", paddingLeft: 64 }}>
                    <Calendar size={10}/> Will be featured in Saturday's Drop
                  </p>
                )}

                {/* Action row — full width, evenly distributed */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 10, borderTop: "1px dashed " + C.fawn, marginTop: 2 }}>
                  {lc === "draft" && (
                    <>
                      <button onClick={() => openPublishChooser(item)} className="cta-primary" style={{ ...actionBtnSolid(C.green, C.greenDeep), flex: 1 }}>Publish</button>
                      <button onClick={() => onEdit && onEdit(item)} style={{ ...actionBtnOutlined, flex: 1 }}>Edit</button>
                      <button onClick={() => setConfirmDelete(item)} title="Delete draft" style={actionBtnIcon}>
                        <X size={13} style={{ color: C.claret }} strokeWidth={2.4}/>
                      </button>
                    </>
                  )}
                  {lc === "queued" && (
                    <>
                      <button onClick={() => makeLiveNow(item.id)} className="cta-primary" style={{ ...actionBtnSolid(C.amber, C.amberDeep), flex: 1 }}>Move to Shelf</button>
                      <button onClick={() => onEdit && onEdit(item)} style={{ ...actionBtnOutlined, flex: 1 }}>Edit</button>
                      <button onClick={() => unpublish(item.id)} title="Unpublish" style={actionBtnIcon}>
                        <X size={13} style={{ color: C.claret }} strokeWidth={2.4}/>
                      </button>
                    </>
                  )}
                  {lc === "live" && (
                    <button onClick={() => onEdit && onEdit(item)} title="Edit (price changes take effect at next Drop reset)" style={{ ...actionBtnOutlined, flex: 1 }}>Edit</button>
                  )}
                  {lc === "shelf" && (
                    <>
                      <button onClick={() => beginPriceEdit(item)} style={{ ...actionBtnOutlined, flex: 1 }}>
                        <TrendingDown size={12}/> Lower price
                      </button>
                      <button onClick={() => onEdit && onEdit(item)} style={{ ...actionBtnOutlined, flex: 1 }}>Edit</button>
                      <button onClick={() => unpublish(item.id)} title="Unpublish" style={actionBtnIcon}>
                        <X size={13} style={{ color: C.claret }} strokeWidth={2.4}/>
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          }
          // Desktop layout — square card with hero thumb + content + footer actions
          return (
            <article
              key={item.id}
              className="card-elevate"
              style={{
                display: "flex", flexDirection: "column",
                borderRadius: 18,
                border: "1px solid " + meta.border,
                background: C.paper,
                boxShadow: "var(--shadow-xs)",
                overflow: "hidden",
              }}
            >
              {/* HERO THUMB — 1:1 aspect, large emoji, status pills overlaid on top edge */}
              <div style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1 / 1",
                background: "linear-gradient(135deg, " + C.sand + " 0%, " + C.fawn + "80 100%)",
                borderBottom: "1px solid " + C.fawn,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 84,
                flexShrink: 0,
              }}>
                {item.e}

                {/* Top-left status badge */}
                <div style={{ position: "absolute", top: 12, left: 12, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontFamily: F.head, fontSize: 10, fontWeight: 900,
                    padding: "4px 10px", borderRadius: 999,
                    background: meta.bg, color: meta.color,
                    letterSpacing: "0.04em", border: "1px solid " + meta.border,
                    boxShadow: "var(--shadow-xs)",
                  }}>
                    {meta.pulse && <span style={{ position: "relative", display: "inline-flex", width: 6, height: 6 }}>
                      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: meta.color, opacity: 0.4, animation: "pulseLive 1.8s ease-in-out infinite" }}/>
                      <span style={{ position: "relative", width: 6, height: 6, borderRadius: "50%", background: meta.color }}/>
                    </span>}
                    {meta.icon === "draft" && <ClipboardList size={10} strokeWidth={2.6}/>}
                    {meta.label}{lc === "shelf" && item.shelfDays ? " · " + item.shelfDays + "d" : ""}
                  </span>
                  {item.isBundle && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontFamily: F.head, fontSize: 10, fontWeight: 900,
                      padding: "3px 9px", borderRadius: 999,
                      background: C.tealMist, color: C.teal,
                      letterSpacing: "0.04em", border: "1px solid " + C.teal + "30",
                      boxShadow: "var(--shadow-xs)",
                    }}>
                      <Package size={10} strokeWidth={2.4}/> Bundle of {item.bundleCount}
                    </span>
                  )}
                </div>

                {/* Top-right: free pile flag (when active) */}
                {item.isFree && (
                  <span style={{
                    position: "absolute", top: 12, right: 12,
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontFamily: F.head, fontSize: 10, fontWeight: 900,
                    padding: "4px 10px", borderRadius: 999,
                    background: C.claret, color: "#fff",
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    boxShadow: "var(--shadow-sm)",
                  }}>
                    <Heart size={10} strokeWidth={2.4}/> Free pile
                  </span>
                )}

                {/* Bottom-right: views/saves chip if there's activity */}
                {(item.views > 0 || item.saves > 0) && (
                  <div style={{
                    position: "absolute", bottom: 12, right: 12,
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "4px 10px", borderRadius: 999,
                    background: "rgba(255, 255, 255, 0.92)",
                    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                    border: "1px solid " + C.fawn,
                    fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.mink,
                    boxShadow: "var(--shadow-xs)",
                  }}>
                    {item.views > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Eye size={10}/> {item.views}</span>}
                    {item.saves > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Heart size={10}/> {item.saves}</span>}
                  </div>
                )}
              </div>

              {/* CONTENT BODY */}
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {/* Title — 2 lines max, clamped */}
                <p style={{
                  fontFamily: F.head, fontSize: 15, fontWeight: 800, color: C.ink,
                  lineHeight: 1.3, letterSpacing: "-0.01em",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  overflow: "hidden", textOverflow: "ellipsis",
                  minHeight: 39,
                }}>{item.t}</p>

                {/* Category · Condition */}
                <p style={{
                  fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink,
                  display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
                }}>
                  <span>{item.cat}</span>
                  <span style={{ color: C.smoke }}>·</span>
                  <span>{item.cond}</span>
                </p>

                {/* Price — large, prominent */}
                <div onClick={e => e.stopPropagation()}>
                  {priceEditId === item.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <span style={{ fontFamily: F.head, fontSize: 24, fontWeight: 900, color: C.green }}>$</span>
                      <input type="text" value={tempPrice} autoFocus onChange={e => setTempPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                        onBlur={commitPriceEdit}
                        onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setPriceEditId(null); }}
                        style={{ width: 84, padding: "2px 6px", borderRadius: 6, border: "1.5px solid " + C.green, fontFamily: F.head, fontSize: 22, fontWeight: 900, color: C.green, outline: "none", background: C.paper, textAlign: "left" }}/>
                    </div>
                  ) : (
                    <p style={{
                      fontFamily: F.head, fontSize: 26, fontWeight: 900,
                      color: item.isFree ? C.claret : C.green,
                      letterSpacing: "-0.02em", lineHeight: 1,
                    }}>{item.isFree ? "FREE" : ("$" + item.price)}</p>
                  )}
                </div>

                {/* Passive context — Shelf items will be in next Drop */}
                {lc === "shelf" && !dropIsLive && (
                  <p style={{
                    fontFamily: F.body, fontSize: 11, fontWeight: 600,
                    color: C.amberDeep, fontStyle: "italic",
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <Calendar size={10}/> Will be featured in Saturday's Drop
                  </p>
                )}
              </div>

              {/* FOOTER ACTIONS — full-width split */}
              <div style={{
                display: "flex", gap: 6, alignItems: "center",
                padding: "12px 16px",
                borderTop: "1px solid " + C.fawn,
                background: C.sand + "60",
              }}>
                {lc === "draft" && (
                  <>
                    <button onClick={() => openPublishChooser(item)} className="cta-primary" style={{ ...actionBtnSolid(C.green, C.greenDeep), flex: 1 }}>Publish</button>
                    <button onClick={() => onEdit && onEdit(item)} style={{ ...actionBtnOutlined, flex: 1 }}>Edit</button>
                    <button onClick={() => setConfirmDelete(item)} title="Delete draft" style={actionBtnIcon}>
                      <X size={13} style={{ color: C.claret }} strokeWidth={2.4}/>
                    </button>
                  </>
                )}
                {lc === "queued" && (
                  <>
                    <button onClick={() => makeLiveNow(item.id)} className="cta-primary" style={{ ...actionBtnSolid(C.amber, C.amberDeep), flex: 1 }}>Move to Shelf</button>
                    <button onClick={() => onEdit && onEdit(item)} style={{ ...actionBtnOutlined, flex: 1 }}>Edit</button>
                    <button onClick={() => unpublish(item.id)} title="Unpublish" style={actionBtnIcon}>
                      <X size={13} style={{ color: C.claret }} strokeWidth={2.4}/>
                    </button>
                  </>
                )}
                {lc === "live" && (
                  <>
                    {isClosing && (
                      item.isFree ? (
                        <button onClick={() => undoFree(item.id)} style={{ ...actionBtnOutlined, flex: 1 }}>
                          Undo free
                        </button>
                      ) : (
                        <button onClick={() => makeFree(item.id)} style={{ ...actionBtnOutlined, flex: 1, color: C.claret, borderColor: C.claret + "40" }}>
                          <Heart size={12} strokeWidth={2.4}/> Make free
                        </button>
                      )
                    )}
                    <button onClick={() => onEdit && onEdit(item)} title="Edit (price changes take effect at next Drop reset)" style={{ ...actionBtnOutlined, flex: 1 }}>Edit</button>
                  </>
                )}
                {lc === "shelf" && (
                  <>
                    <button onClick={() => beginPriceEdit(item)} style={{ ...actionBtnOutlined, flex: 1 }}>
                      <TrendingDown size={12}/> Lower price
                    </button>
                    <button onClick={() => onEdit && onEdit(item)} style={{ ...actionBtnOutlined, flex: 1 }}>Edit</button>
                    <button onClick={() => unpublish(item.id)} title="Unpublish" style={actionBtnIcon}>
                      <X size={13} style={{ color: C.claret }} strokeWidth={2.4}/>
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Publish chooser — seller picks Drop (curated spotlight) vs Shelf (sell now).
          During Live phase, "Drop" path is disabled because the current Drop is in motion
          and curation already closed. */}
      {publishChooserItem && (
        <div
          onClick={() => setPublishChooserItem(null)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(31, 29, 25, 0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, padding: isMobile ? 16 : 24,
            backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="fade-in"
            style={{
              width: isMobile ? "100%" : 500, maxWidth: 500,
              borderRadius: isMobile ? 18 : 24,
              background: C.paper,
              boxShadow: "var(--shadow-xl)",
              overflow: "hidden",
              maxHeight: "90vh", display: "flex", flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid " + C.fawn, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: "linear-gradient(135deg, " + C.greenMist + " 0%, " + C.greenMist + "70 100%)",
                  border: "1px solid " + C.green + "30",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Check size={18} style={{ color: C.greenDeep }} strokeWidth={2.4}/>
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontFamily: F.head, fontSize: 17, fontWeight: 900, color: C.ink, letterSpacing: "-0.015em" }}>Where should it go live?</h3>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {publishChooserItem.t}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPublishChooserItem(null)}
                className="icon-btn"
                style={{ background: C.sand, border: "none", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                aria-label="Close"
              >
                <X size={15} style={{ color: C.mink }}/>
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px", overflowY: "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Option A — Saturday's Drop */}
                <button
                  onClick={() => publishToDrop(publishChooserItem.id)}
                  disabled={dropIsLive}
                  className={dropIsLive ? "" : "card-elevate"}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "16px 18px", borderRadius: 16,
                    background: dropIsLive
                      ? C.sand
                      : "linear-gradient(135deg, " + C.amberMist + " 0%, " + C.paper + " 80%)",
                    border: "1.5px solid " + (dropIsLive ? C.fawn : C.amber + "40"),
                    cursor: dropIsLive ? "not-allowed" : "pointer",
                    textAlign: "left",
                    opacity: dropIsLive ? 0.6 : 1,
                    boxShadow: dropIsLive ? "none" : "var(--shadow-xs)",
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: dropIsLive ? C.fawn : C.amberDeep,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Calendar size={18} style={{ color: dropIsLive ? C.mink : "#fff" }} strokeWidth={2.4}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 900, color: dropIsLive ? C.mink : C.amberDeep, letterSpacing: "-0.01em" }}>
                        List in Saturday's Drop
                      </p>
                      {dropIsLive && (
                        <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: C.fawn, color: C.mink, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          Drop is in motion
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>
                      {dropIsLive
                        ? "Queue closes when the live Drop starts. Wait for next week's window, or use Shelf to sell right now."
                        : "Curated spotlight, full-feature presentation. Best for higher-value items."}
                    </p>
                  </div>
                </button>

                {/* Option B — Shelf */}
                <button
                  onClick={() => publishToShelf(publishChooserItem.id)}
                  className="card-elevate"
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "16px 18px", borderRadius: 16,
                    background: "linear-gradient(135deg, " + C.greenMist + " 0%, " + C.paper + " 80%)",
                    border: "1.5px solid " + C.green + "40",
                    cursor: "pointer", textAlign: "left",
                    boxShadow: "var(--shadow-xs)",
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: C.greenDeep,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Zap size={18} style={{ color: "#fff" }} strokeWidth={2.4}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 900, color: C.greenDeep, letterSpacing: "-0.01em" }}>
                        {dropIsLive ? "Add to the live Drop" : "Add to the Shelf"}
                      </p>
                      <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: C.green, color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Sells now
                      </span>
                    </div>
                    <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>
                      {dropIsLive
                        ? "Goes live immediately and stays selling on the Shelf after the Drop closes."
                        : "Claimable today. Also auto-joins Saturday's live Drop alongside the curated items."}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 24px", borderTop: "1px solid " + C.fawn, background: C.sand + "80", display: "flex", justifyContent: "center" }}>
              <button onClick={() => setPublishChooserItem(null)} className="btn-outlined" style={{ padding: "8px 22px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete-draft confirmation — destructive, can't be undone */}
      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(31, 29, 25, 0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, padding: isMobile ? 16 : 24,
            backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="fade-in"
            style={{
              width: isMobile ? "100%" : 460, maxWidth: 460,
              borderRadius: isMobile ? 18 : 24,
              background: C.paper,
              boxShadow: "var(--shadow-xl)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid " + C.fawn, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: "linear-gradient(135deg, " + C.claretMist + " 0%, " + C.claretMist + "70 100%)",
                  border: "1px solid " + C.claret + "30",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <AlertCircle size={18} style={{ color: C.claret }} strokeWidth={2.3}/>
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontFamily: F.head, fontSize: 17, fontWeight: 900, color: C.ink, letterSpacing: "-0.015em" }}>Delete this listing?</h3>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, marginTop: 2 }}>
                    This action can't be undone.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmDelete(null)}
                className="icon-btn"
                style={{
                  background: C.sand, border: "none", width: 32, height: 32, borderRadius: "50%",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
                aria-label="Close"
              >
                <X size={15} style={{ color: C.mink }}/>
              </button>
            </div>

            {/* Body — show what's being deleted */}
            <div style={{ padding: "20px 24px" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 12,
                background: C.sand, border: "1px solid " + C.fawn,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 11,
                  background: "linear-gradient(135deg, " + C.sand + " 0%, " + C.fawn + "80 100%)",
                  border: "1px solid " + C.fawn,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0,
                }}>{confirmDelete.e}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{confirmDelete.t}</p>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink }}>
                    Draft · {confirmDelete.cat}
                  </p>
                </div>
              </div>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.55, marginTop: 14 }}>
                You'll have to recreate the listing from scratch if you change your mind. Photos, description, and price will all be lost.
              </p>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid " + C.fawn, background: C.sand + "80", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-outlined"
                style={{
                  padding: "10px 20px", borderRadius: 999,
                  border: "1.5px solid " + C.fawn,
                  cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800,
                  background: C.paper, color: C.ink,
                }}
              >
                Keep
              </button>
              <button
                onClick={() => { deleteDraft(confirmDelete.id); setConfirmDelete(null); }}
                className="cta-primary"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 22px", borderRadius: 999, border: "none", cursor: "pointer",
                  fontFamily: F.head, fontSize: 13, fontWeight: 800, letterSpacing: "-0.005em",
                  background: "linear-gradient(180deg, " + C.claret + " 0%, #A8281C 100%)",
                  color: "#fff",
                  boxShadow: "var(--shadow-press-claret), var(--shadow-xs)",
                }}
              >
                <X size={13} strokeWidth={2.6}/> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}

// Reusable button style helpers — defined at module scope for clarity
/* Action-row button system — ALL buttons share a fixed height of 34px and the same border radius,
   so the row reads as a unified horizontal rhythm regardless of label length.  */
const ACTION_BTN_BASE = {
  height: 34,
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: F.head,
  fontSize: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
};
function actionBtnSolid(bg, shadow) {
  return {
    ...ACTION_BTN_BASE,
    padding: "0 14px",
    border: "none",
    fontWeight: 800,
    color: "#fff",
    background: bg,
    boxShadow: "0 2px 0 " + shadow,
  };
}
const actionBtnOutlined = {
  ...ACTION_BTN_BASE,
  padding: "0 14px",
  border: "1.5px solid " + C.fawn,
  fontWeight: 700,
  color: C.mink,
  background: C.paper,
};
const actionBtnIcon = {
  ...ACTION_BTN_BASE,
  width: 34,
  padding: 0,
  border: "1.5px solid " + C.claret + "30",
  background: C.paper,
  color: C.claret,
};


/* ============================== CLAIMS ============================== */
/* ============================== SELLER MESSAGES ============================== */
function SellerMessagesView() {
  const { isMobile } = useViewport();
  const [activeId, setActiveId] = useState("s1");
  // Mobile drill-down: null = list view, otherwise an id = thread view (mirrors buyer's MessagesPage)
  const [mobileViewingId, setMobileViewingId] = useState(null);

  const conversations = [
    {
      id: "s1", type: "claim", status: "pickup-today", unread: true, group: "active",
      item: { title: "Dining Set with 8 Chairs", price: 350, img: "\uD83C\uDF7D\uFE0F", layer: "drop" },
      buyer: { name: "Sarah M.", hood: "Barrhaven", rating: 4.8, previousPurchases: 2, isFriend: false },
      pickup: { day: "Today", time: "2:00 PM", address: "Your address on file" },
      lastMsg: "Reminder: Sarah M. picking up at 2pm today!",
      lastTime: "1h ago",
      messages: [
        { from: "buyer", text: "I'd like to claim the dining set at $350.", time: "Wed, 3:00 PM", type: "claim" },
        { from: "system", text: "Sarah M. claimed at full price. Pickup options sent.", time: "Wed, 3:00 PM", type: "text" },
        { from: "system", text: "WhatsApp confirmation sent.", time: "Wed, 3:01 PM", type: "whatsapp" },
        { from: "buyer", text: "Can I pick up Saturday at 2pm?", time: "Wed, 3:10 PM", type: "text" },
        { from: "seller", text: "Saturday 2pm works — see you then!", time: "Wed, 3:10 PM", type: "text" },
        { from: "system", text: "Reminder: Pickup in 1 hour!", time: "Today, 1:00 PM", type: "reminder" },
      ],
    },
    {
      id: "s2", type: "offer", status: "countered", unread: true, group: "active",
      item: { title: "LG 55\" Smart TV", price: 250, img: "\uD83D\uDCFA", layer: "drop" },
      buyer: { name: "James K.", hood: "Barrhaven Heights", rating: 4.2, previousPurchases: 0, isFriend: false },
      lastMsg: "Countered at $220. Waiting for James.",
      lastTime: "3h ago",
      messages: [
        { from: "buyer", text: "Would you take $180 for the TV?", time: "Today, 11:00 AM", type: "offer", amount: 180 },
        { from: "seller", text: "Could you do $220? That's as low as I can go.", time: "Today, 11:00 AM", type: "counter", amount: 220 },
        { from: "system", text: "Counter offer sent via WhatsApp.", time: "Today, 11:01 AM", type: "whatsapp" },
      ],
    },
    {
      id: "s3", type: "question", status: "pending", unread: true, group: "active",
      item: { title: "Sofa Set 3 Seater", price: 500, img: "\uD83D\uDECB\uFE0F", layer: "drop" },
      buyer: { name: "Priya R.", hood: "Barrhaven South", rating: 5.0, previousPurchases: 1, isFriend: true },
      lastMsg: "Does this come with throw pillows?",
      lastTime: "45 min ago",
      messages: [
        { from: "buyer", text: "Does this come with the throw pillows shown in the photo? Also, any pets in the home?", time: "Today, 12:15 PM", type: "question" },
      ],
    },
    {
      id: "s4", type: "offer", status: "needs-response", unread: true, group: "active",
      item: { title: "DeWalt Drill Set", price: 65, img: "\uD83D\uDD27", layer: "shelf" },
      buyer: { name: "Tom W.", hood: "Stonebridge", rating: 3.9, previousPurchases: 0, isFriend: false },
      lastMsg: "Tom offered $45 for the drill set.",
      lastTime: "2h ago",
      messages: [
        { from: "buyer", text: "Offering $45 for the drill set.", time: "Today, 10:30 AM", type: "offer", amount: 45 },
        { from: "system", text: "$45 is 31% below asking — needs your call.", time: "Today, 10:30 AM", type: "notice" },
      ],
    },
    {
      id: "s5", type: "claim", status: "pickup-scheduled", unread: false, group: "this-week",
      item: { title: "Full Bedroom Set", price: 550, img: "\uD83D\uDECF\uFE0F", layer: "drop" },
      buyer: { name: "David C.", hood: "Barrhaven", rating: 4.4, previousPurchases: 3, isFriend: false },
      pickup: { day: "Sun, Apr 26", time: "10:00 AM", address: "Your address on file" },
      lastMsg: "Pickup confirmed for Sunday 10am.",
      lastTime: "1d ago",
      messages: [
        { from: "buyer", text: "I'd like to offer $550 for the bedroom set.", time: "Fri, 2:00 PM", type: "offer", amount: 550 },
        { from: "seller", text: "$550 works — sold!", time: "Fri, 2:00 PM", type: "text" },
        { from: "buyer", text: "Can I pick up Sunday morning?", time: "Fri, 2:15 PM", type: "text" },
        { from: "seller", text: "Sunday 10am works!", time: "Fri, 2:15 PM", type: "text" },
        { from: "system", text: "WhatsApp confirmation sent.", time: "Fri, 2:16 PM", type: "whatsapp" },
      ],
    },
    {
      id: "s6", type: "question", status: "answered", unread: false, group: "this-week",
      item: { title: "IKEA KALLAX Bookshelf", price: 35, img: "\uD83E\uDE91", layer: "shelf" },
      buyer: { name: "Jen L.", hood: "Stonebridge", rating: 4.5 },
      lastMsg: "Answered: 72\" tall × 58\" wide, walnut finish.",
      lastTime: "5h ago",
      messages: [
        { from: "buyer", text: "What are the dimensions?", time: "Today, 9:00 AM", type: "question" },
        { from: "seller", text: "72\" tall × 58\" wide, walnut finish — holds 8 cubes.", time: "Today, 9:00 AM", type: "text" },
      ],
    },
  ];

  const statusMeta = {
    "pickup-today":      { label: "Pickup today",      color: C.claret,    bg: C.claretMist,  icon: Clock      },
    "pickup-scheduled":  { label: "Pickup scheduled",  color: C.greenDeep, bg: C.greenMist,   icon: CheckCircle },
    "countered":         { label: "Counter sent",      color: C.ai,        bg: C.aiMist,      icon: RefreshCw  },
    "needs-response":    { label: "Needs response",    color: C.claret,    bg: C.claretMist,  icon: AlertCircle },
    "pending":           { label: "Unanswered",        color: C.amberDeep, bg: C.amberMist,   icon: Clock      },
    "answered":          { label: "Answered",          color: C.ai,        bg: C.aiMist,      icon: MessageSquare },
    "completed":         { label: "Completed",         color: C.ash,       bg: C.sand,        icon: Check      },
  };

  const unreadCount = conversations.filter(c => c.unread).length;
  const needsAction = conversations.filter(c => ["needs-response","pending","pickup-today"].includes(c.status)).length;

  const active = conversations.find(c => c.id === activeId) || conversations[0];
  const activeStatus = statusMeta[active.status];

  function renderMessage(m, i) {
    const isYou = m.from === "seller"; // viewer is the seller; "buyer" is counterparty
    const isBuyer = m.from === "buyer";

    if (m.type === "whatsapp") {
      return (
        <div key={i} style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, background: "#F0FFF4", border: "1px solid " + C.wa + "30" }}>
            <MessageCircle size={12} style={{ color: C.wa }}/>
            <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink }}>{m.text}</span>
            <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash }}>· {m.time}</span>
          </div>
        </div>
      );
    }
    if (m.type === "notice") {
      return (
        <div key={i} style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: C.amberMist, border: "1px solid " + C.amber + "30" }}>
            <AlertCircle size={11} style={{ color: C.amberDeep }}/>
            <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.amberDeep }}>{m.text}</span>
          </div>
        </div>
      );
    }
    if (m.type === "reminder") {
      return (
        <div key={i} style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: C.claretMist, border: "1px solid " + C.claret + "30", maxWidth: 360 }}>
            <Bell size={13} style={{ color: C.claret, flexShrink: 0 }}/>
            <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 700, color: C.claret }}>{m.text}</span>
          </div>
        </div>
      );
    }

    // Regular bubble: buyer (left, paper) or seller (right, green)
    const bubbleBg = isBuyer ? C.paper : "linear-gradient(180deg, " + C.green + " 0%, " + C.greenDeep + " 100%)";
    const bubbleColor = isBuyer ? C.ink : "#fff";
    const borderStyle = isBuyer ? ("1px solid " + C.fawn) : "none";

    return (
      <div key={i} className="fade-in" style={{ display: "flex", justifyContent: isBuyer ? "flex-start" : "flex-end", marginBottom: 10 }}>
        <div style={{ maxWidth: "72%" }}>
          {isBuyer && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4, marginLeft: 2 }}>
              <User size={10} style={{ color: C.mink }}/>
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.mink, letterSpacing: "0.08em" }}>{active.buyer.name.toUpperCase()}</span>
            </div>
          )}
          <div style={{
            padding: "11px 15px",
            borderRadius: isBuyer ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
            background: bubbleBg, color: bubbleColor,
            border: borderStyle,
            fontFamily: F.body, fontSize: 13, fontWeight: 500, lineHeight: 1.5,
            boxShadow: isBuyer ? "var(--shadow-xs)" : "var(--shadow-sm)",
          }}>
            {(m.type === "offer" || m.type === "counter" || m.type === "claim") && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, paddingBottom: 6, borderBottom: "1px solid " + (isBuyer ? C.fawn : "rgba(255,255,255,0.25)") }}>
                {m.type === "offer" && <DollarSign size={12}/>}
                {m.type === "counter" && <RefreshCw size={12}/>}
                {m.type === "claim" && <Check size={12}/>}
                <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9 }}>
                  {m.type === "offer" ? "Offer" : m.type === "counter" ? "Counter offer" : "Claim"}
                  {m.amount && " · $" + m.amount}
                </span>
              </div>
            )}
            {m.text}
          </div>
          <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash, marginTop: 4, textAlign: isBuyer ? "left" : "right", marginLeft: 2, marginRight: 2 }}>{m.time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: isMobile ? "100%" : 1160, margin: "0 auto" }}>
      {/* Page header — hidden on mobile when viewing a thread, so the thread gets the full screen */}
      {(!isMobile || !mobileViewingId) && (
        <div style={{ padding: isMobile ? "18px 0 14px" : "28px 0 22px", position: "relative", marginBottom: isMobile ? 6 : 10 }}>
          {/* Decorative dots — desktop flair only */}
          {!isMobile && (
            <div style={{ position: "absolute", top: 30, right: 0, display: "flex", gap: 6, opacity: 0.5 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.amber }}/>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.green }}/>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.claret }}/>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 18 }}>
            <div style={{
              width: isMobile ? 46 : 60, height: isMobile ? 46 : 60,
              borderRadius: isMobile ? 14 : 18,
              background: "linear-gradient(135deg, " + C.aiMist + " 0%, " + C.aiMist + "70 100%)",
              border: "1px solid " + C.ai + "30",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginTop: isMobile ? 4 : 6,
              boxShadow: "var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.6)",
            }}>
              <MessageSquare size={isMobile ? 22 : 26} style={{ color: C.ai }} strokeWidth={2.3}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: F.head, fontSize: isMobile ? 28 : 40, fontWeight: 900, color: C.ink, letterSpacing: "-0.035em", lineHeight: 1.02, marginBottom: isMobile ? 6 : 8 }}>Conversations</h1>
              <p style={{ fontFamily: F.body, fontSize: isMobile ? 13 : 15, fontWeight: 500, color: C.mink, lineHeight: 1.55, maxWidth: 560 }}>
                {needsAction > 0 ? needsAction + " need" + (needsAction === 1 ? "s" : "") + " your attention · " : ""}
                {unreadCount > 0 ? unreadCount + " unread · " : ""}
                {conversations.length} active thread{conversations.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Outer container: 2-col grid on desktop, drill-down stack on mobile */}
      <div style={{
        display: isMobile ? "flex" : "grid",
        flexDirection: isMobile ? "column" : undefined,
        gridTemplateColumns: isMobile ? undefined : "380px 1fr",
        gap: isMobile ? 0 : 20,
        height: isMobile ? "auto" : 680,
        minHeight: isMobile ? "60vh" : undefined,
        border: isMobile ? "none" : "1.5px solid " + C.fawn,
        borderRadius: isMobile ? 0 : 20,
        overflow: isMobile ? "visible" : "hidden",
        background: isMobile ? "transparent" : C.paper,
      }}>
        {/* Conversation list — hidden on mobile when a thread is being viewed */}
        {(!isMobile || !mobileViewingId) && (
          <div style={{
            borderRight: isMobile ? "none" : "1px solid " + C.fawn,
            overflowY: "auto",
            background: isMobile ? C.paper : undefined,
            border: isMobile ? "1.5px solid " + C.fawn : undefined,
            borderRadius: isMobile ? 16 : 0,
          }}>
            {conversations.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <MessageSquare size={28} style={{ color: C.smoke, marginBottom: 10 }}/>
                <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.mink }}>No conversations yet.</p>
              </div>
            ) : conversations.map(c => {
              const isActive = c.id === activeId;
              const meta = statusMeta[c.status] || statusMeta.completed;
              const Ic = meta.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => { setActiveId(c.id); setMobileViewingId(c.id); }}
                  className="row-hover"
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "16px 20px",
                    border: "none", borderBottom: "1px solid " + C.fawn,
                    background: isActive && !isMobile ? C.greenMist + "60" : C.paper,
                    cursor: "pointer", display: "flex", gap: 12,
                    position: "relative",
                  }}
                >
                  {/* Active accent bar on desktop */}
                  {isActive && !isMobile && (
                    <span style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 3, borderRadius: 999, background: C.green }}/>
                  )}
                  {c.unread && <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: "0 0 0 3px " + C.greenMist }}/>}
                  <div style={{
                    fontSize: 32, width: 50, height: 50, borderRadius: 13,
                    background: "linear-gradient(135deg, " + C.sand + " 0%, " + C.fawn + "70 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, border: "1px solid " + C.fawn,
                    boxShadow: "var(--shadow-xs)",
                  }}>{c.item.img}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
                      <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>{c.item.title}</p>
                      <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: C.ash, flexShrink: 0 }}>{c.lastTime}</span>
                    </div>
                    <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <User size={10}/> {c.buyer.name}
                      <Star size={10} style={{ color: C.amber, marginLeft: 4 }} fill={C.amber}/> {c.buyer.rating.toFixed(1)}
                    </p>
                    <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: c.unread ? 700 : 500, color: c.unread ? C.ink : C.mink, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMsg}</p>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.head, fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: meta.bg, color: meta.color, letterSpacing: "0.05em", border: "1px solid " + meta.color + "20" }}>
                      <Ic size={10}/> {meta.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Active thread — only shown on mobile when a thread has been tapped */}
        {active && (!isMobile || mobileViewingId) && (
          <div style={{
            display: "flex", flexDirection: "column", minWidth: 0,
            background: C.paper,
            border: isMobile ? "1.5px solid " + C.fawn : undefined,
            borderRadius: isMobile ? 16 : 0,
            overflow: "hidden",
            // Bound mobile thread height so the message scroll behaves; otherwise it can run away
            minHeight: isMobile ? "70vh" : undefined,
            height: isMobile ? "calc(100vh - 200px)" : undefined,
          }}>
            {/* Mobile back button — returns to list */}
            {isMobile && (
              <button onClick={() => setMobileViewingId(null)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", border: "none", borderBottom: "1px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                <ArrowLeft size={14}/> All conversations
              </button>
            )}

            {/* Thread header */}
            <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", borderBottom: "1px solid " + C.fawn, display: "flex", alignItems: "center", gap: isMobile ? 12 : 14, flexWrap: "wrap" }}>
              <div style={{ fontSize: isMobile ? 26 : 30, width: isMobile ? 40 : 44, height: isMobile ? 40 : 44, borderRadius: 12, background: C.sand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid " + C.fawn }}>{active.item.img}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: F.head, fontSize: isMobile ? 14 : 15, fontWeight: 800, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.item.title}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: F.head, fontSize: isMobile ? 14 : 16, fontWeight: 900, color: C.green }}>${active.item.price}</span>
                  <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, display: "flex", alignItems: "center", gap: 4 }}>
                    <User size={11}/> {active.buyer.name}{!isMobile && (" · " + active.buyer.hood)}
                  </span>
                  {(() => {
                    const pp = active.buyer.previousPurchases || 0;
                    if (active.buyer.isFriend) {
                      return (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.head, fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: C.greenMist, color: C.greenDeep, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                          <Heart size={9} strokeWidth={2.4}/> Friend
                        </span>
                      );
                    }
                    if (pp >= 3) {
                      return (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.head, fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: C.amberMist, color: C.amberDeep, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                          <Star size={9} fill={C.amberDeep} strokeWidth={0}/> Regular · {pp} prior
                        </span>
                      );
                    }
                    if (pp >= 1) {
                      return (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.head, fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: C.tealMist, color: C.teal, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                          <RefreshCw size={9} strokeWidth={2.4}/> Repeat · {pp} prior
                        </span>
                      );
                    }
                    return (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.head, fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: C.sand, color: C.mink, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        First-time
                      </span>
                    );
                  })()}
                </div>
              </div>
              {activeStatus && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.head, fontSize: isMobile ? 10 : 11, fontWeight: 800, padding: isMobile ? "3px 9px" : "4px 11px", borderRadius: 999, background: activeStatus.bg, color: activeStatus.color, flexShrink: 0 }}>
                  <activeStatus.icon size={isMobile ? 10 : 11}/> {activeStatus.label}
                </span>
              )}
            </div>

            {/* Pickup card if applicable */}
            {active.pickup && (
              <div style={{ padding: isMobile ? "10px 14px" : "12px 20px", borderBottom: "1px solid " + C.fawn, background: active.status === "pickup-today" ? C.claretMist : C.greenMist, display: "flex", alignItems: "center", gap: 12 }}>
                <Calendar size={16} style={{ color: active.status === "pickup-today" ? C.claret : C.greenDeep, flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: active.status === "pickup-today" ? C.claret : C.greenDeep }}>
                    Pickup {active.pickup.day} at {active.pickup.time}
                  </p>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                    <MapPin size={10}/> {active.pickup.address}
                  </p>
                </div>
              </div>
            )}

            {/* Messages scroll area */}
            <div style={{ flex: 1, padding: isMobile ? "14px 14px" : "18px 20px", overflowY: "auto", background: C.sand + "60" }}>
              {active.messages.map((m, i) => renderMessage(m, i))}
            </div>

            {/* Quick-reply templates + reply input. The templates cover the 80% of replies that are short and routine. */}
            <div style={{ borderTop: "1px solid " + C.fawn, background: C.paper }}>
              <div style={{ display: "flex", gap: 6, padding: isMobile ? "10px 12px 0" : "12px 16px 0", overflowX: "auto", scrollbarWidth: "none" }}>
                {[
                  "Yes, still available — when works?",
                  "Sorry, just sold",
                  "Sure, " + (active.pickup ? active.pickup.time : "that time") + " works",
                  "Last price is $" + Math.max(1, Math.round(active.item.price * 0.9)),
                ].map(template => (
                  <button key={template} onClick={() => alert("Quick reply selected: \"" + template + "\". Demo only — would populate the input.")} style={{ padding: "6px 12px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.sand, cursor: "pointer", fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {template}
                  </button>
                ))}
              </div>
              <div style={{ padding: isMobile ? "10px 12px" : "12px 16px", display: "flex", gap: isMobile ? 8 : 10, alignItems: "center" }}>
                <input placeholder={"Reply to " + active.buyer.name.split(" ")[0] + "..."} style={{ flex: 1, minWidth: 0, padding: isMobile ? "9px 12px" : "10px 14px", borderRadius: 999, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.ink, outline: "none", background: C.paper }}/>
                <button style={{ width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, borderRadius: "50%", border: "none", background: C.green, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 0 " + C.greenDeep, flexShrink: 0 }}>
                  <Send size={isMobile ? 14 : 16}/>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PickupsView({ onNav, dropPhase = "between" }) {
  const { isMobile } = useViewport();
  const [ratingItem, setRatingItem] = useState(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingNote, setRatingNote] = useState("");
  const [noShowItem, setNoShowItem] = useState(null);
  // Release modal state — captures the buyer-declined scenario (different from no-show).
  // Optional private note lets the seller record why the release happened.
  const [releaseItem, setReleaseItem] = useState(null);
  const [releaseNote, setReleaseNote] = useState("");
  const [successMsg, setSuccessMsg] = useState(null);
  // Tick every 30s so the in-grace countdowns stay live without burning CPU.
  // (Real backend would push, but the demo's clock is local.)
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  // Formats the time remaining for a pickup in grace, given an ISO graceUntil.
  // Returns "1h 47m" / "23m" / "0m" (auto-relisting now).
  function formatGraceLeft(graceUntilIso) {
    const ms = new Date(graceUntilIso).getTime() - Date.now();
    if (ms <= 0) return "0m";
    const totalMin = Math.ceil(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? h + "h " + m + "m" : m + "m";
  }

  // During Live / Closing phases, every minute counts — the no-show modal defaults
  // to "Relist now" because the Drop window is finite. During Between phases the
  // Shelf isn't time-bound and a 2h grace is the kinder default.
  const dropIsLive = dropPhase === "live" || dropPhase === "closing";

  const [pickups, setPickups] = useState([
    { id: 1, e: "\u{1F4FA}", t: "LG 55 inch Smart TV", price: 250, buyer: "James K.", date: "Today", time: "12:00 - 2:00 PM", isToday: true, isPastDue: true, relistsIn: "1h 47m", mode: "in-person" },
    { id: 2, e: "\u{1F6CF}\u{FE0F}", t: "Full Bedroom Set", price: 550, buyer: "Sarah M.", date: "Sat, Apr 25", time: "2:00 - 4:00 PM", isToday: false, mode: "in-person" },
    { id: 5, e: "\u{1FA91}", t: "IKEA KALLAX Bookshelf", price: 35, buyer: "Hassan M.", date: "Sat, Apr 25", time: "4:30 - 5:30 PM", isToday: false, mode: "porch" },
    { id: 3, e: "\u{1F6CB}\u{FE0F}", t: "Sofa Set 3 Seater", price: 480, buyer: "Priya R.", date: "Sun, Apr 26", time: "10:00 AM - 12:00 PM", isToday: false, mode: "in-person" },
    { id: 4, e: "\u{1F527}", t: "DeWalt Drill Set", price: 65, buyer: "Tom W.", date: "Mon, Apr 27", time: "5:00 - 7:00 PM", isToday: false, mode: "porch" },
  ]);

  // Pickup mode (porch / in-person) is set when the buyer claims and a slot is
  // arranged, not toggled from this list. Read-only badges only here.

  const todayCount = pickups.filter(p => p.isToday).length;
  const upcomingCount = pickups.filter(p => !p.isToday).length;

  function handlePickedUp(item) {
    setRatingItem(item);
    setRatingStars(0);
    setRatingNote("");
  }

  function submitRating() {
    const completed = ratingItem;
    setRatingItem(null);
    setPickups(prev => prev.filter(p => p.id !== completed.id));
    setSuccessMsg("Pickup complete! " + completed.t + " marked as picked up.");
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  function handleNoShow(item) {
    setNoShowItem(item);
  }

  function relistNow() {
    const item = noShowItem;
    setNoShowItem(null);
    setPickups(prev => prev.filter(p => p.id !== item.id));
    setSuccessMsg(item.t + " relisted immediately. " + item.buyer.split(" ")[0] + " has been notified.");
    setTimeout(() => setSuccessMsg(null), 4500);
  }

  function giveGrace() {
    const item = noShowItem;
    setNoShowItem(null);
    // Don't remove — flag the pickup as in-grace with a 2h countdown timestamp.
    // The card stays visible so the seller (and buyer) can see the window tick down.
    // Auto-relist would fire server-side when graceUntil < now.
    const graceUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    setPickups(prev => prev.map(p => p.id === item.id ? { ...p, graceUntil, isToday: false } : p));
    setSuccessMsg("Marked no-show · " + item.buyer.split(" ")[0] + " has 2 hours to reschedule before " + item.t + " auto-relists.");
    setTimeout(() => setSuccessMsg(null), 4500);
  }

  // Called when the seller clears the grace state — either because the buyer rescheduled
  // (slot stays, grace flag goes) or because the seller wants to release now (item out).
  function endGrace(item, action) {
    if (action === "release") {
      setPickups(prev => prev.filter(p => p.id !== item.id));
      setSuccessMsg(item.t + " released · back on the Shelf and claimable again.");
    } else {
      // "rescheduled" — keep the pickup, clear the grace flag
      setPickups(prev => prev.map(p => p.id === item.id ? { ...p, graceUntil: null } : p));
      setSuccessMsg("Pickup restored · " + item.buyer.split(" ")[0] + " is back on the schedule.");
    }
    setTimeout(() => setSuccessMsg(null), 4500);
  }

  function handleRelease(item) {
    setReleaseItem(item);
    setReleaseNote("");
  }

  function confirmRelease() {
    const item = releaseItem;
    const note = releaseNote.trim();
    setReleaseItem(null);
    setReleaseNote("");
    setPickups(prev => prev.filter(p => p.id !== item.id));
    // The toast wording is honest about what actually happens in this demo:
    // pickup record gone, item available again. We don't pretend a waitlist exists.
    setSuccessMsg(
      item.t + " released · back on the Shelf and claimable again" +
      (note ? " · note saved" : "")
    );
    setTimeout(() => setSuccessMsg(null), 4500);
  }

  return (
    <div>
      {<InventoryTabs activeView="orders" onNav={onNav} ordersCount={pickups.length} ordersUrgent={todayCount} />}

      {/* Success toast */}
      {successMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, backgroundColor: C.gLightBg, border: "1px solid " + C.gSoft, marginBottom: 16 }}>
          <CheckCircle size={18} style={{ color: C.gPrimary }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: C.gDark, fontFamily: F.body, flex: 1 }}>{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={14} style={{ color: C.ash }} /></button>
        </div>
      )}

      {/* Summary strip — stays 3-up on mobile but tighter */}
      <div style={{ display: "flex", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 14 : 20 }}>
        <div style={{ flex: 1, minWidth: 0, padding: isMobile ? 10 : 16, borderRadius: isMobile ? 12 : 14, border: todayCount > 0 ? "2px solid #FECACA" : "1px solid #f0f0f0", backgroundColor: todayCount > 0 ? "#FFF5F5" : "#fff", display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
          <div style={{ width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: isMobile ? 10 : 12, backgroundColor: todayCount > 0 ? "#FEF2F2" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <MapPin size={isMobile ? 15 : 18} style={{ color: todayCount > 0 ? "#DC2626" : "#94a3b8" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: todayCount > 0 ? "#DC2626" : "#94a3b8", fontFamily: F.head, lineHeight: 1 }}>{todayCount}</p>
            <p style={{ fontSize: isMobile ? 10 : 11, color: C.ash, fontFamily: F.body, marginTop: 2 }}>Today</p>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: isMobile ? 10 : 16, borderRadius: isMobile ? 12 : 14, border: "1px solid " + C.fawn, background: C.paper, display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
          <div style={{ width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: isMobile ? 10 : 12, backgroundColor: C.gLightBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Calendar size={isMobile ? 15 : 18} style={{ color: C.gPrimary }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: C.gPrimary, fontFamily: F.head, lineHeight: 1 }}>{upcomingCount}</p>
            <p style={{ fontSize: isMobile ? 10 : 11, color: C.ash, fontFamily: F.body, marginTop: 2, whiteSpace: "nowrap" }}>Upcoming</p>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: isMobile ? 10 : 16, borderRadius: isMobile ? 12 : 14, border: "1px solid " + C.fawn, background: C.paper, display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
          <div style={{ width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: isMobile ? 10 : 12, backgroundColor: C.oLightBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Package size={isMobile ? 15 : 18} style={{ color: C.oPrimary }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: C.oPrimary, fontFamily: F.head, lineHeight: 1 }}>{pickups.length}</p>
            <p style={{ fontSize: isMobile ? 10 : 11, color: C.ash, fontFamily: F.body, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{isMobile ? "Total" : "Total Pending"}</p>
          </div>
        </div>
      </div>

      {/* Pickup items */}
      {pickups.length === 0 && (
        <div style={{ padding: isMobile ? "36px 16px" : 60, textAlign: "center" }}>
          <MapPin size={isMobile ? 26 : 32} style={{ color: "#e2e8f0", marginBottom: 12 }} />
          <p style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: C.ash, fontFamily: F.body }}>No pickups scheduled</p>
          <p style={{ fontSize: 12, color: C.smoke, marginTop: 4, fontFamily: F.body }}>When buyers claim items and schedule pickup, they will appear here.</p>
        </div>
      )}

      <div style={isMobile
        ? { display: "flex", flexDirection: "column", gap: 10 }
        : { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }
      }>
        {pickups.map(p => {
          // Grace state: buyer was marked no-show but seller chose to give them 2h.
          // Visual frame goes amber and actions narrow to "rescheduled" / "release now."
          const inGrace = !!p.graceUntil;
          const graceLeft = inGrace ? formatGraceLeft(p.graceUntil) : null;

          // Mobile: stacked layout (top row item info, bottom row actions)
          if (isMobile) {
            return (
              <div
                key={p.id}
                className="card-elevate"
                style={{
                  padding: "14px 14px", borderRadius: 14,
                  border: inGrace
                    ? "1.5px solid " + C.amber + "60"
                    : (p.isToday ? "1.5px solid " + C.claret + "40" : "1px solid " + C.fawn),
                  backgroundColor: inGrace
                    ? "linear-gradient(135deg, " + C.amberMist + " 0%, " + C.paper + " 80%)"
                    : (p.isToday ? "#FFF5F5" : C.paper),
                  background: inGrace
                    ? "linear-gradient(135deg, " + C.amberMist + " 0%, " + C.paper + " 80%)"
                    : (p.isToday ? "#FFF5F5" : C.paper),
                  display: "flex", flexDirection: "column", gap: 12,
                  boxShadow: (inGrace || p.isToday) ? "var(--shadow-sm)" : "var(--shadow-xs)",
                }}
              >
                {inGrace && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "4px 10px", borderRadius: 999,
                      background: C.amberDeep, color: "#fff",
                      fontFamily: F.head, fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase",
                      boxShadow: "var(--shadow-xs)",
                    }}>
                      <Clock size={10} strokeWidth={2.6}/> In grace · {graceLeft} left
                    </span>
                  </div>
                )}
                {!inGrace && p.isToday && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <StatusBadge status="pickup-today" size="sm"/>
                    <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 600, fontFamily: F.body }}>{p.time}</span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: C.sand, border: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{p.e}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: F.head, marginBottom: 4 }}>{p.t}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, color: C.mink, fontFamily: F.body, alignItems: "center" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><User size={10} /> {p.buyer}</span>
                      <span style={{ fontWeight: 700, color: C.gPrimary }}>${p.price}</span>
                      {!inGrace && !p.isToday && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={10} /> {p.date}</span>}
                      {!inGrace && !p.isToday && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={10} /> {p.time}</span>}
                    </div>
                    {inGrace && (
                      <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.amberDeep, marginTop: 6, lineHeight: 1.4, fontStyle: "italic" }}>
                        {p.buyer.split(" ")[0]} can still message and reschedule. Auto-relists when the timer hits 0.
                      </p>
                    )}
                  </div>
                </div>
                {/* Action row — grace state shows different actions */}
                <div style={{ display: "flex", gap: 6, paddingTop: 10, borderTop: "1px dashed " + (inGrace ? C.amber + "40" : C.fawn) }}>
                  {inGrace ? (
                    <>
                      <button onClick={() => endGrace(p, "rescheduled")} className="cta-primary" style={{ flex: 1, padding: "9px 10px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 800, background: C.green, color: "#fff", boxShadow: "0 2px 0 " + C.greenDeep, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <Check size={12} strokeWidth={2.8}/> Rescheduled
                      </button>
                      <button onClick={() => endGrace(p, "release")} style={{ flex: 1, padding: "9px 10px", borderRadius: 10, border: "1.5px solid " + C.claret + "25", cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 700, background: C.paper, color: C.claret, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        Release now
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handlePickedUp(p)} className="cta-primary" style={{ flex: 1, padding: "9px 10px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 800, background: C.green, color: "#fff", boxShadow: "0 2px 0 " + C.greenDeep, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <Check size={12} strokeWidth={2.8}/> Picked up
                      </button>
                      <button onClick={() => handleRelease(p)} title="Buyer came, inspected, declined" style={{ flex: 1, padding: "9px 10px", borderRadius: 10, border: "1.5px solid " + C.fawn, cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 700, background: C.paper, color: C.mink, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        Release
                      </button>
                      <button onClick={() => handleNoShow(p)} title="Mark no-show" style={{ flex: 1, padding: "9px 10px", borderRadius: 10, border: "1.5px solid " + C.claret + "25", cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 700, background: C.paper, color: C.claret, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        No-show
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          }
          // Desktop layout — square card with hero thumb + content + footer actions
          return (
            <div
              key={p.id}
              className="card-elevate"
              style={{
                display: "flex", flexDirection: "column",
                borderRadius: 18,
                border: inGrace
                  ? "1.5px solid " + C.amber + "60"
                  : (p.isToday ? "1.5px solid " + C.claret + "40" : "1px solid " + C.fawn),
                backgroundColor: inGrace ? "#FFFBF0" : (p.isToday ? "#FFF5F5" : C.paper),
                boxShadow: (inGrace || p.isToday) ? "var(--shadow-sm)" : "var(--shadow-xs)",
                overflow: "hidden",
              }}
            >
              {/* HERO THUMB */}
              <div style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1 / 1",
                background: inGrace
                  ? "linear-gradient(135deg, " + C.amberMist + " 0%, " + C.paper + " 80%)"
                  : (p.isToday
                    ? "linear-gradient(135deg, " + C.claretMist + " 0%, " + C.paper + " 80%)"
                    : "linear-gradient(135deg, " + C.sand + " 0%, " + C.fawn + "80 100%)"),
                borderBottom: "1px solid " + (inGrace ? C.amber + "30" : (p.isToday ? C.claret + "20" : C.fawn)),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 84,
                flexShrink: 0,
              }}>
                {p.e}

                {/* Grace overlay badge — replaces TODAY badge when in grace */}
                {inGrace ? (
                  <div style={{
                    position: "absolute", top: 12, left: 12,
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 11px", borderRadius: 999,
                    background: C.amberDeep, color: "#fff",
                    fontFamily: F.head, fontSize: 10, fontWeight: 900,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    boxShadow: "var(--shadow-sm)",
                  }}>
                    <Clock size={10} strokeWidth={2.5}/> In grace · {graceLeft} left
                  </div>
                ) : p.isToday && (
                  <div style={{
                    position: "absolute", top: 12, left: 12,
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 11px", borderRadius: 999,
                    background: C.claret, color: "#fff",
                    fontFamily: F.head, fontSize: 10, fontWeight: 900,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    boxShadow: "var(--shadow-sm)",
                  }}>
                    <Clock size={10} strokeWidth={2.5}/> Today · {p.time}
                  </div>
                )}
              </div>

              {/* CONTENT BODY */}
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <p style={{
                  fontFamily: F.head, fontSize: 15, fontWeight: 800, color: C.ink,
                  lineHeight: 1.3, letterSpacing: "-0.01em",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  overflow: "hidden", textOverflow: "ellipsis",
                  minHeight: 39,
                }}>{p.t}</p>

                {/* Buyer + price row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <User size={11} style={{ flexShrink: 0 }}/> {p.buyer}
                  </span>
                  <span style={{ fontFamily: F.head, fontSize: 18, fontWeight: 900, color: C.green, letterSpacing: "-0.01em", flexShrink: 0 }}>${p.price}</span>
                </div>

                {/* Date · time (hidden when today/grace since they're in the overlay) */}
                {!p.isToday && !inGrace && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11}/> {p.date}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11}/> {p.time}</span>
                  </div>
                )}

                {/* Grace context line */}
                {inGrace && (
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.amberDeep, lineHeight: 1.45, fontStyle: "italic" }}>
                    {p.buyer.split(" ")[0]} can still message and reschedule. Auto-relists when the timer hits 0.
                  </p>
                )}
              </div>

              {/* FOOTER ACTIONS — grace state shows different actions */}
              <div style={{
                padding: "12px 16px",
                borderTop: "1px solid " + (inGrace ? C.amber + "30" : (p.isToday ? C.claret + "20" : C.fawn)),
                background: inGrace ? "rgba(255, 247, 237, 0.6)" : (p.isToday ? "rgba(255, 245, 245, 0.5)" : C.sand + "60"),
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                {inGrace ? (
                  <>
                    <button
                      onClick={() => endGrace(p, "rescheduled")}
                      className="cta-primary"
                      style={{
                        width: "100%",
                        padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                        fontFamily: F.head, fontSize: 12, fontWeight: 800, letterSpacing: "-0.005em",
                        background: "linear-gradient(180deg, " + C.green + " 0%, " + C.greenDeep + " 100%)",
                        color: "#fff",
                        boxShadow: "var(--shadow-press-green), var(--shadow-xs)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      }}
                    >
                      <Check size={13} strokeWidth={2.8}/> Buyer rescheduled
                    </button>
                    <button onClick={() => endGrace(p, "release")} title="End grace early — item returns to the Shelf now" style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.claret + "30", cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 700, background: C.paper, color: C.claret, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                      <RefreshCw size={11} strokeWidth={2.4}/> Release now (don't wait)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handlePickedUp(p)}
                      className="cta-primary"
                      style={{
                        width: "100%",
                        padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                        fontFamily: F.head, fontSize: 12, fontWeight: 800, letterSpacing: "-0.005em",
                        background: "linear-gradient(180deg, " + C.green + " 0%, " + C.greenDeep + " 100%)",
                        color: "#fff",
                        boxShadow: "var(--shadow-press-green), var(--shadow-xs)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      }}
                    >
                      <Check size={13} strokeWidth={2.8}/> Picked up
                    </button>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleRelease(p)} title="Buyer came, inspected, declined — release immediately" style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: "1.5px solid " + C.fawn, cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 700, background: C.paper, color: C.mink }}>
                        Release
                      </button>
                      <button onClick={() => handleNoShow(p)} title="Mark no-show (2h grace before auto-relist)" style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: "1.5px solid " + C.claret + "25", cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 700, background: C.paper, color: C.claret }}>
                        No-show
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rating modal */}
      {ratingItem && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: isMobile ? 16 : 0 }}>
          <div style={{ width: isMobile ? "100%" : 420, maxWidth: 420, borderRadius: isMobile ? 18 : 24, background: C.paper, padding: isMobile ? 20 : 28, boxShadow: "var(--shadow-xl)" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: C.gLightBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <CheckCircle size={28} style={{ color: C.gPrimary }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: C.ink, fontFamily: F.head }}>Item Picked Up!</h3>
              <p style={{ fontSize: 13, color: C.mink, marginTop: 4, fontFamily: F.body }}>{ratingItem.t} - picked up by {ratingItem.buyer}</p>
            </div>

            <div style={{ padding: 16, borderRadius: 14, border: "1px solid " + C.fawn, background: C.sand, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 10, fontFamily: F.body, textAlign: "center" }}>Rate this buyer</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 4 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRatingStars(s)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4, fontSize: 28 }}>
                    <Star size={28} style={{ color: s <= ratingStars ? "#FBBF24" : "#e2e8f0", fill: s <= ratingStars ? "#FBBF24" : "none", strokeWidth: 1.5 }} />
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: C.ash, textAlign: "center", fontFamily: F.body }}>
                {ratingStars === 0 ? "Tap to rate" : ratingStars <= 2 ? "Could be better" : ratingStars <= 3 ? "Okay" : ratingStars === 4 ? "Great buyer!" : "Excellent buyer!"}
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.mink, marginBottom: 6, fontFamily: F.body }}>Note (optional)</label>
              <textarea className="input-clean" value={ratingNote} onChange={e => setRatingNote(e.target.value)} placeholder="On time, friendly, easy transaction..." style={{ width: "100%", height: 60, padding: 10, borderRadius: 10, border: "1.5px solid " + C.fawn, fontSize: 12, fontFamily: F.body, resize: "none", outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={submitRating} style={{ flex: 1, padding: "12px 0", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: F.body, backgroundColor: C.gPrimary, color: "#fff" }}>Submit Rating</button>
              <button onClick={() => {
                const completed = ratingItem;
                setRatingItem(null);
                setPickups(prev => prev.filter(p => p.id !== completed.id));
                setSuccessMsg("Pickup complete! " + completed.t + " marked as picked up.");
                setTimeout(() => setSuccessMsg(null), 4000);
              }}
                style={{ padding: "12px 20px", borderRadius: 50, border: "1.5px solid " + C.fawn, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: F.body, background: C.paper, color: C.mink }}>Skip</button>
            </div>
          </div>
        </div>
      )}

      {/* Release modal — buyer came, inspected, declined. Different from no-show:
          the buyer fulfilled their show-up obligation, so no reliability penalty,
          and the item returns to the Shelf immediately (no 2h grace). */}
      {releaseItem && (
        <div
          onClick={() => setReleaseItem(null)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(31, 29, 25, 0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, padding: isMobile ? 16 : 24,
            backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="fade-in"
            style={{
              width: isMobile ? "100%" : 480, maxWidth: 480,
              borderRadius: isMobile ? 18 : 24,
              background: C.paper,
              boxShadow: "var(--shadow-xl)",
              overflow: "hidden",
              maxHeight: "92vh", display: "flex", flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid " + C.fawn, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: "linear-gradient(135deg, " + C.greenMist + " 0%, " + C.greenMist + "70 100%)",
                  border: "1px solid " + C.green + "30",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <RefreshCw size={18} style={{ color: C.greenDeep }} strokeWidth={2.3}/>
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontFamily: F.head, fontSize: 17, fontWeight: 900, color: C.ink, letterSpacing: "-0.015em" }}>Release this pickup?</h3>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, marginTop: 2 }}>
                    Use this when the buyer showed up but didn't take the item.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReleaseItem(null)}
                className="icon-btn"
                style={{ background: C.sand, border: "none", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                aria-label="Close"
              >
                <X size={15} style={{ color: C.mink }}/>
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px", overflowY: "auto" }}>
              {/* Item preview */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 12,
                background: C.sand, border: "1px solid " + C.fawn,
                marginBottom: 16,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 11,
                  background: "linear-gradient(135deg, " + C.paper + " 0%, " + C.fawn + "80 100%)",
                  border: "1px solid " + C.fawn,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0,
                }}>{releaseItem.e}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{releaseItem.t}</p>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink }}>
                    Claimed by {releaseItem.buyer} · ${releaseItem.price}
                  </p>
                </div>
              </div>

              {/* What this means */}
              <div style={{
                padding: "12px 14px", borderRadius: 12,
                background: C.greenMist + "60", border: "1px dashed " + C.green + "40",
                marginBottom: 16,
              }}>
                <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.greenDeep, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>What happens next</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                  <li style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.ink, lineHeight: 1.45, display: "flex", gap: 6 }}>
                    <Check size={12} style={{ color: C.greenDeep, marginTop: 2, flexShrink: 0 }} strokeWidth={3}/>
                    <span>Item goes back to the Shelf — claimable again immediately</span>
                  </li>
                  <li style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.ink, lineHeight: 1.45, display: "flex", gap: 6 }}>
                    <Check size={12} style={{ color: C.greenDeep, marginTop: 2, flexShrink: 0 }} strokeWidth={3}/>
                    <span>{releaseItem.buyer.split(" ")[0]} keeps their reliability rating — they showed up</span>
                  </li>
                  <li style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.ink, lineHeight: 1.45, display: "flex", gap: 6 }}>
                    <Check size={12} style={{ color: C.greenDeep, marginTop: 2, flexShrink: 0 }} strokeWidth={3}/>
                    <span>No grace period — the slot reopens right away</span>
                  </li>
                </ul>
              </div>

              {/* Optional private note */}
              <div>
                <label style={{ display: "block", fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                  Private note <span style={{ fontWeight: 600, color: C.ash, textTransform: "none", letterSpacing: 0 }}>(optional — only you see this)</span>
                </label>
                <textarea
                  className="input-clean"
                  value={releaseNote}
                  onChange={e => setReleaseNote(e.target.value.slice(0, 200))}
                  placeholder="e.g. Decided it was too big for their car. Said they'd watch for a smaller one."
                  rows={3}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.ink, outline: "none", boxSizing: "border-box", resize: "vertical", background: C.paper, lineHeight: 1.5 }}
                />
                <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash, marginTop: 4, textAlign: "right" }}>
                  {releaseNote.length}/200
                </p>
              </div>

              <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, lineHeight: 1.5, fontStyle: "italic", marginTop: 10, textAlign: "center" }}>
                Different from no-show? Use that if the buyer didn't show up at all.
              </p>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid " + C.fawn, background: C.sand + "80", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setReleaseItem(null)}
                className="btn-outlined"
                style={{ padding: "10px 20px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.ink, fontFamily: F.head, fontSize: 13, fontWeight: 800, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRelease}
                className="cta-primary"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 22px", borderRadius: 999, border: "none", cursor: "pointer",
                  fontFamily: F.head, fontSize: 13, fontWeight: 800, letterSpacing: "-0.005em",
                  background: "linear-gradient(180deg, " + C.green + " 0%, " + C.greenDeep + " 100%)",
                  color: "#fff",
                  boxShadow: "var(--shadow-press-green), var(--shadow-xs)",
                }}
              >
                <RefreshCw size={13} strokeWidth={2.6}/> Release back to Shelf
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No-show confirmation modal — phase-aware. During Live/Closing, Relist now
          is primary because the Drop window is finite. During Between, the 2h grace
          is primary because the Shelf isn't time-bound and gives the buyer a chance. */}
      {noShowItem && (
        <div onClick={() => setNoShowItem(null)} style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24, backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} className="fade-in" style={{ width: isMobile ? "100%" : 480, maxWidth: 480, borderRadius: isMobile ? 18 : 24, background: C.paper, boxShadow: "var(--shadow-xl)", overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid " + C.fawn, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, " + C.claretMist + " 0%, " + C.claretMist + "70 100%)", border: "1px solid " + C.claret + "30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <AlertCircle size={18} style={{ color: C.claret }} strokeWidth={2.3}/>
                </div>
                <div>
                  <h3 style={{ fontFamily: F.head, fontSize: 17, fontWeight: 900, color: C.ink, letterSpacing: "-0.015em" }}>Mark as no-show?</h3>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, marginTop: 2 }}>{noShowItem.buyer} didn't pick up {noShowItem.t}.</p>
                </div>
              </div>
              <button onClick={() => setNoShowItem(null)} className="icon-btn" style={{ background: C.sand, border: "none", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <X size={15} style={{ color: C.mink }}/>
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* Two visually distinct paths — same destination (item relists), different timing */}
              <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ash, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>How urgent is the relist?</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Relist now option */}
                <button
                  onClick={relistNow}
                  className="card-elevate"
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "14px 16px", borderRadius: 14,
                    background: dropIsLive ? "linear-gradient(135deg, " + C.claretMist + " 0%, " + C.paper + " 80%)" : C.paper,
                    border: "1.5px solid " + (dropIsLive ? C.claret + "40" : C.fawn),
                    cursor: "pointer", textAlign: "left",
                    boxShadow: "var(--shadow-xs)",
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: dropIsLive ? C.claret : C.sand, border: dropIsLive ? "none" : "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Zap size={16} style={{ color: dropIsLive ? "#fff" : C.claret }} strokeWidth={2.4}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 900, color: dropIsLive ? C.claret : C.ink, letterSpacing: "-0.01em" }}>Relist now</p>
                      {dropIsLive && (
                        <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: C.claret, color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase" }}>Recommended</span>
                      )}
                    </div>
                    <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.45 }}>
                      Waitlisted buyers get notified immediately. {noShowItem.buyer.split(" ")[0]} loses the claim.
                      {dropIsLive && " Best while the Drop is live."}
                    </p>
                  </div>
                </button>

                {/* 2h grace option */}
                <button
                  onClick={giveGrace}
                  className="card-elevate"
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "14px 16px", borderRadius: 14,
                    background: !dropIsLive ? "linear-gradient(135deg, " + C.amberMist + " 0%, " + C.paper + " 80%)" : C.paper,
                    border: "1.5px solid " + (!dropIsLive ? C.amber + "40" : C.fawn),
                    cursor: "pointer", textAlign: "left",
                    boxShadow: "var(--shadow-xs)",
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: !dropIsLive ? C.amberDeep : C.sand, border: !dropIsLive ? "none" : "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Clock size={16} style={{ color: !dropIsLive ? "#fff" : C.amberDeep }} strokeWidth={2.4}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 900, color: !dropIsLive ? C.amberDeep : C.ink, letterSpacing: "-0.01em" }}>Give a 2-hour grace</p>
                      {!dropIsLive && (
                        <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: C.amberDeep, color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase" }}>Recommended</span>
                      )}
                    </div>
                    <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.45 }}>
                      {noShowItem.buyer.split(" ")[0]} can still message and reschedule. Auto-relists at the 2h mark if no contact.
                    </p>
                  </div>
                </button>
              </div>

              <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, lineHeight: 1.5, fontStyle: "italic", marginTop: 14, textAlign: "center" }}>
                Either way, waitlisted buyers will be notified when the item's available again.
              </p>
            </div>

            <div style={{ padding: "12px 24px", borderTop: "1px solid " + C.fawn, background: C.sand + "80", display: "flex", justifyContent: "center" }}>
              <button onClick={() => setNoShowItem(null)} className="btn-outlined" style={{ padding: "8px 22px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== SELLER HISTORY ============================== */
function SellerHistoryView({ embedded = false }) {
  const { isMobile } = useViewport();
  const [collapsed, setCollapsed] = useState({});
  const toggleCollapse = (key) => setCollapsed(p => ({ ...p, [key]: !p[key] }));
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const toggleExpand = (id) => setExpandedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const transactions = [
    { id: "h1", title: "Solid Wood Coffee Table", price: 80,  asking: 95,  img: "\uD83E\uDE91", cat: "Furniture",               buyer: "Hassan M.",   hood: "Barrhaven",         date: "2026-04-13", layer: "drop",  rating: 5, pickupMode: "in-person", review: "Easy meet-up, table was even nicer in person." },
    { id: "h2", title: "Baby Stroller (Graco)",   price: 45,  asking: 45,  img: "\uD83D\uDC76", cat: "Kids & Baby",             buyer: "Lindsay P.",  hood: "Barrhaven Heights", date: "2026-04-13", layer: "drop",  rating: 5, pickupMode: "porch",     review: "Porch pickup worked great, thanks!" },
    { id: "h3", title: "Yoga Mat Set",            price: 15,  asking: 15,  img: "\uD83E\uDDD8", cat: "Sports & Outdoor",        buyer: "Mark T.",     hood: "Barrhaven",         date: "2026-04-06", layer: "shelf", rating: 4, pickupMode: "porch" },
    { id: "h4", title: "Kitchen Mixer",           price: 65,  asking: 80,  img: "\uD83E\uDDC1", cat: "Appliances & Kitchen",    buyer: "Jess B.",     hood: "Barrhaven South",   date: "2026-04-06", layer: "drop",  rating: 5, pickupMode: "in-person", review: "Works beautifully, super friendly seller." },
    { id: "h5", title: "Garden Tools Lot",        price: 40,  asking: 40,  img: "\uD83C\uDF31", cat: "Tools & Garden",          buyer: "Omar K.",     hood: "Stonebridge",       date: "2026-03-22", layer: "drop",  rating: 5, pickupMode: "in-person" },
    { id: "h6", title: "Bookshelf Pine 5-tier",   price: 35,  asking: 50,  img: "\uD83D\uDCDA", cat: "Furniture",               buyer: "Claire Y.",   hood: "Barrhaven",         date: "2026-03-15", layer: "shelf", rating: 4, pickupMode: "in-person" },
    { id: "h7", title: "Winter Coats Bundle",     price: 30,  asking: 30,  img: "\uD83E\uDDE5", cat: "Clothing & Accessories",  buyer: "Nina S.",     hood: "Stonebridge",       date: "2026-02-22", layer: "drop",  rating: 5, pickupMode: "porch",     review: "Coats are perfect for my kids, thank you!" },
    { id: "h8", title: "Kids Toy Kitchen Set",    price: 55,  asking: 55,  img: "\uD83C\uDF73", cat: "Kids & Baby",             buyer: "Ada R.",      hood: "Barrhaven",         date: "2025-12-14", layer: "drop",  rating: 5, pickupMode: "in-person" },
    { id: "h9", title: "Christmas Decor Lot",     price: 25,  asking: 25,  img: "\uD83C\uDF84", cat: "Other",                   buyer: "Mia L.",      hood: "Barrhaven Heights", date: "2025-12-14", layer: "drop",  rating: 4, pickupMode: "porch" },
    { id: "h10",title: "Hassan's Bike Set",       price: 70,  asking: 80,  img: "\uD83D\uDEB2", cat: "Sports & Outdoor",        buyer: "Hassan M.",   hood: "Barrhaven",         date: "2025-09-14", layer: "drop",  rating: 5, pickupMode: "in-person", review: "Bikes were in great shape — kids loved them." },
    { id: "h11",title: "Wool Throw + Pillows",    price: 22,  asking: 22,  img: "\uD83E\uDDFA", cat: "Home Décor",              buyer: "Sarah M.",    hood: "Barrhaven",         date: "2025-09-06", layer: "shelf", rating: 5, pickupMode: "porch" },
    { id: "h12",title: "Coffee Grinder",          price: 18,  asking: 25,  img: "\u2615",        cat: "Appliances & Kitchen",    buyer: "Hassan M.",   hood: "Barrhaven",         date: "2025-08-23", layer: "shelf", rating: 4, pickupMode: "porch" },
  ];

  const totalItems   = transactions.length;
  const totalRevenue = transactions.reduce((a, t) => a + t.price, 0);
  // Category-weight averages (rough lbs); used as a friendlier impact stat than CO2.
  const catWeight = { "Furniture": 50, "Electronics": 20, "Appliances & Kitchen": 12, "Clothing & Accessories": 4, "Kids & Baby": 8, "Sports & Outdoor": 10, "Tools & Garden": 15, "Home Décor": 6, "Books, Games & Hobbies": 5, "Collectibles & Antiques": 6, "Other": 8 };
  const totalWeight = transactions.reduce((a, t) => a + (catWeight[t.cat] || 8), 0);
  const uniqueBuyers = new Set(transactions.map(t => t.buyer)).size;
  const repeatBuyers = (() => {
    const seen = {};
    transactions.forEach(t => { seen[t.buyer] = (seen[t.buyer] || 0) + 1; });
    return Object.values(seen).filter(c => c > 1).length;
  })();

  // Group transactions by year/month for the timeline
  const grouped = {};
  transactions.forEach(t => {
    const d = new Date(t.date);
    const y = d.getFullYear();
    const m = d.toLocaleDateString("en-US", { month: "long" });
    if (!grouped[y]) grouped[y] = {};
    if (!grouped[y][m]) grouped[y][m] = [];
    grouped[y][m].push(t);
  });
  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);

  const impactStats = [
    { label: "Items rehomed",    value: totalItems,            icon: Package,    color: C.greenDeep, bg: C.greenMist },
    { label: "Earned",           value: "$" + totalRevenue,    icon: DollarSign, color: C.amberDeep, bg: C.amberMist },
    { label: "Kept from landfill",value: "~" + totalWeight + " lb", icon: Leaf,    color: C.greenDeep, bg: C.greenMist },
    { label: "Neighbours met",   value: uniqueBuyers,          icon: Users,      color: C.teal,      bg: C.tealMist  },
  ];

  function TxRow({ tx, idx }) {
    const layerBadge = tx.layer === "drop" ? { label: "Drop", bg: C.green, color: "#fff" } : { label: "Shelf", bg: C.amber, color: "#fff" };
    const isOpen = expandedIds.has(tx.id);
    const wasDiscounted = tx.asking && tx.asking !== tx.price;
    return (
      <article
        className={"fade-in " + (isOpen ? "" : "card-elevate")}
        onClick={() => toggleExpand(tx.id)}
        style={{
          padding: isMobile ? "14px 16px" : "18px 22px",
          borderRadius: isMobile ? 14 : 16,
          background: C.paper,
          border: "1px solid " + (isOpen ? C.green + "40" : C.fawn),
          marginBottom: 10,
          animationDelay: (idx * 30) + "ms",
          cursor: "pointer",
          boxShadow: isOpen ? "var(--shadow-sm)" : "var(--shadow-xs)",
          transition: "border-color var(--t-base) var(--ease-out), box-shadow var(--t-base) var(--ease-out)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 14 }}>
          <div style={{ width: isMobile ? 46 : 56, height: isMobile ? 46 : 56, borderRadius: isMobile ? 12 : 14, background: "linear-gradient(135deg, " + C.sand + ", " + C.fawn + ")", border: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 22 : 28, flexShrink: 0 }}>{tx.img}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
              <p style={{ fontFamily: F.head, fontSize: isMobile ? 14 : 15, fontWeight: 800, color: C.ink }}>{tx.title}</p>
              <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 5, background: layerBadge.bg, color: layerBadge.color, letterSpacing: "0.05em", textTransform: "uppercase" }}>{layerBadge.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: F.body, fontSize: isMobile ? 11 : 12, fontWeight: 600, color: C.mink, display: "flex", alignItems: "center", gap: 3 }}><User size={11}/> {tx.buyer}</span>
              {!isMobile && <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, display: "flex", alignItems: "center", gap: 3 }}><MapPin size={10}/> {tx.hood}</span>}
              <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.ash }}>{new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: isMobile ? undefined : "numeric" })}</span>
            </div>
            <div style={{ display: "flex", gap: 2, marginTop: 6 }}>
              {[1,2,3,4,5].map(n => <Star key={n} size={isMobile ? 12 : 13} style={{ color: n <= tx.rating ? C.amber : C.fawn }} fill={n <= tx.rating ? C.amber : "none"} strokeWidth={n <= tx.rating ? 0 : 1.5}/>)}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <span style={{ fontFamily: F.head, fontSize: isMobile ? 18 : 22, fontWeight: 900, color: C.green }}>${tx.price}</span>
            <ChevronDown size={14} style={{ color: C.smoke, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}/>
          </div>
        </div>

        {/* Expanded detail panel */}
        {isOpen && (
          <div onClick={e => e.stopPropagation()} style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed " + C.fawn, display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(2, 1fr)", gap: isMobile ? 10 : 14 }}>
            <DetailCell label="Sold via" value={tx.layer === "drop" ? "Saturday Drop" : "Shelf (anytime)"} icon={tx.layer === "drop" ? Calendar : Package}/>
            <DetailCell label="Asking → sold" value={wasDiscounted ? ("$" + tx.asking + " → $" + tx.price) : ("$" + tx.price)} icon={DollarSign}/>
            {tx.review && (
              <div style={{ gridColumn: isMobile ? "1 / -1" : "1 / -1", padding: "10px 12px", borderRadius: 10, background: C.sand, border: "1px solid " + C.fawn }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <MessageSquare size={11} style={{ color: C.greenDeep }} strokeWidth={2.3}/>
                  <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.greenDeep, letterSpacing: "0.06em", textTransform: "uppercase" }}>{tx.buyer.split(" ")[0]}'s review</span>
                </div>
                <p style={{ fontFamily: F.body, fontSize: isMobile ? 12 : 13, fontWeight: 500, color: C.ink, lineHeight: 1.5, fontStyle: "italic" }}>
                  "{tx.review}"
                </p>
              </div>
            )}
          </div>
        )}
      </article>
    );
  }

  function DetailCell({ label, value, icon: Ic }) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
          {Ic && <Ic size={10} style={{ color: C.ash }}/>}
          <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
        </div>
        <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>{value}</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: isMobile ? "100%" : 1160, margin: "0 auto" }}>
      {/* HERO: Your impact (was: Sales history) */}
      {!embedded && (
        <div style={{ padding: isMobile ? "18px 0 14px" : "28px 0 22px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 18 }}>
            <div style={{
              width: isMobile ? 46 : 60, height: isMobile ? 46 : 60,
              borderRadius: isMobile ? 14 : 18,
              background: "linear-gradient(135deg, " + C.greenMist + " 0%, " + C.greenMist + "70 100%)",
              border: "1px solid " + C.green + "30",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginTop: isMobile ? 4 : 6,
              boxShadow: "var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.6)",
            }}>
              <Leaf size={isMobile ? 22 : 26} style={{ color: C.greenDeep }} strokeWidth={2.3}/>
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontFamily: F.head, fontSize: isMobile ? 28 : 40, fontWeight: 900, color: C.ink, letterSpacing: "-0.035em", lineHeight: 1.02, marginBottom: isMobile ? 6 : 8 }}>Your impact</h1>
              <p style={{ fontFamily: F.body, fontSize: isMobile ? 13 : 15, fontWeight: 500, color: C.mink, lineHeight: 1.55, maxWidth: 560 }}>
                What you've recirculated through Barrhaven — items rehomed, money earned, weight kept out of the landfill, neighbours met.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* IMPACT STATS — 4 cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 10 : 14, marginBottom: isMobile ? 18 : 22 }}>
        {impactStats.map((st, i) => {
          const Ic = st.icon;
          return (
            <div key={i} className="fade-in" style={{ padding: isMobile ? "14px 14px" : "18px 20px", borderRadius: isMobile ? 14 : 18, background: C.paper, border: "1.5px solid " + C.fawn, animationDelay: (i * 40) + "ms" }}>
              <div style={{ width: isMobile ? 32 : 38, height: isMobile ? 32 : 38, borderRadius: isMobile ? 10 : 12, background: st.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: isMobile ? 8 : 10 }}>
                <Ic size={isMobile ? 14 : 17} style={{ color: st.color }}/>
              </div>
              <p style={{ fontFamily: F.head, fontSize: isMobile ? 22 : 26, fontWeight: 900, color: st.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{st.value}</p>
              <p style={{ fontFamily: F.body, fontSize: isMobile ? 11 : 12, fontWeight: 600, color: C.mink, marginTop: 4 }}>{st.label}</p>
            </div>
          );
        })}
      </div>

      {/* TIMELINE — grouped by year/month (kept from previous version) */}
      <section style={{ marginBottom: isMobile ? 16 : 22 }}>
        <h2 style={{ fontFamily: F.head, fontSize: isMobile ? 14 : 15, fontWeight: 900, color: C.ink, letterSpacing: "-0.01em", marginBottom: 12 }}>All sales</h2>
        {years.map(year => {
          const yearTxs = transactions.filter(t => new Date(t.date).getFullYear() === year);
          const yearRev = yearTxs.reduce((a, t) => a + t.price, 0);
          const months = Object.keys(grouped[year]);
          const yearKey = "year-" + year;
          const yearCollapsed = !!collapsed[yearKey];
          return (
            <section key={year} style={{ marginBottom: 22 }}>
              <button onClick={() => toggleCollapse(yearKey)} style={{ width: "100%", display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "10px 0 10px", marginBottom: yearCollapsed ? 0 : 12, borderBottom: "2px solid " + C.fawn, background: "none", border: "none", borderBottomStyle: "solid", cursor: "pointer", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
                  {yearCollapsed ? <ChevronRight size={isMobile ? 16 : 20} style={{ color: C.mink, flexShrink: 0 }}/> : <ChevronDown size={isMobile ? 16 : 20} style={{ color: C.mink, flexShrink: 0 }}/>}
                  <h3 style={{ fontFamily: F.head, fontSize: isMobile ? 18 : 22, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em" }}>{year}</h3>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14 }}>
                  <span style={{ fontFamily: F.body, fontSize: isMobile ? 11 : 12, fontWeight: 600, color: C.mink }}>{yearTxs.length} sale{yearTxs.length !== 1 ? "s" : ""}</span>
                  <span style={{ fontFamily: F.head, fontSize: isMobile ? 13 : 14, fontWeight: 800, color: C.green }}>${yearRev}</span>
                </div>
              </button>

              {!yearCollapsed && months.map(month => {
                const monthKey = year + "-" + month;
                const monthTxs = grouped[year][month];
                const monthRev = monthTxs.reduce((a, t) => a + t.price, 0);
                const monthCollapsed = !!collapsed[monthKey];
                return (
                  <div key={month} style={{ marginBottom: 14 }}>
                    <button onClick={() => toggleCollapse(monthKey)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", marginBottom: monthCollapsed ? 0 : 10, borderRadius: 12, border: "1px solid " + C.fawn, background: monthCollapsed ? C.paper : C.sand, cursor: "pointer", textAlign: "left", transition: "all 150ms" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {monthCollapsed ? <ChevronRight size={14} style={{ color: C.mink }}/> : <ChevronDown size={14} style={{ color: C.mink }}/>}
                        <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.ink, letterSpacing: "0.12em", textTransform: "uppercase" }}>{month}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink }}>{monthTxs.length} sale{monthTxs.length !== 1 ? "s" : ""}</span>
                        <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.green }}>${monthRev}</span>
                      </div>
                    </button>
                    {!monthCollapsed && monthTxs.map((tx, idx) => <TxRow key={tx.id} tx={tx} idx={idx}/>)}
                  </div>
                );
              })}
            </section>
          );
        })}
      </section>

      {/* YEAR-IN-REVIEW — private reflection card (not shareable, this is your own record) */}
      <div style={{ padding: isMobile ? "20px 22px" : "24px 28px", borderRadius: isMobile ? 18 : 22, background: "linear-gradient(135deg, " + C.ink + ", #3A3730)", position: "relative", overflow: "hidden", marginTop: 20 }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }}/>
        <div style={{ position: "relative" }}>
          <p style={{ fontFamily: F.head, fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 6, letterSpacing: "-0.015em" }}>Your year in Barrhaven</p>
          <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, maxWidth: 540 }}>
            You've given <b style={{ color: C.amber }}>{totalItems} items</b> a second home, earned <b style={{ color: C.green }}>${totalRevenue}</b>, and met <b style={{ color: "#fff" }}>{uniqueBuyers} neighbours</b>. {repeatBuyers} of them came back for more.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SETTINGS — Account · Notifications · Payments · Pickup.
   Desktop: 2-col with section nav left + content right.
   Mobile: drill-down — list of section cards → tap to enter detail (same pattern as Messages).
   ============================================================ */
function SettingsView({ acceptedMethods, setAcceptedMethods }) {
  const { isMobile } = useViewport();
  const [activeSection, setActiveSection] = useState("account");
  // Mobile drill-down: null = section list, otherwise section id = detail view
  const [mobileViewingSection, setMobileViewingSection] = useState(null);

  const sections = [
    { id: "account",       label: "Account",        icon: User,        desc: "Name, email, contact" },
    { id: "notifications", label: "Notifications",  icon: Bell,        desc: "Email, WhatsApp, push" },
    { id: "payments",      label: "Payments",       icon: DollarSign,  desc: "How buyers can pay" },
    { id: "pickup",        label: "Pickup",         icon: MapPin,      desc: "Default address & windows" },
  ];

  const currentId = isMobile ? mobileViewingSection : activeSection;
  const currentSection = sections.find(s => s.id === currentId);

  return (
    <div className="fade-in" style={{ maxWidth: isMobile ? "100%" : 1080, margin: "0 auto" }}>
      {/* Page header — hidden on mobile when drilled into a section */}
      {(!isMobile || !mobileViewingSection) && (
        <div style={{ padding: isMobile ? "18px 0 14px" : "28px 0 22px", marginBottom: isMobile ? 6 : 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 18 }}>
            <div style={{
              width: isMobile ? 46 : 60, height: isMobile ? 46 : 60,
              borderRadius: isMobile ? 14 : 18,
              background: "linear-gradient(135deg, " + C.sand + " 0%, " + C.fawn + "70 100%)",
              border: "1px solid " + C.fawn,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginTop: isMobile ? 4 : 6,
              boxShadow: "var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.6)",
            }}>
              <Settings size={isMobile ? 22 : 26} style={{ color: C.mink }} strokeWidth={2.3}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: F.head, fontSize: isMobile ? 28 : 40, fontWeight: 900, color: C.ink, letterSpacing: "-0.035em", lineHeight: 1.02, marginBottom: isMobile ? 6 : 8 }}>Settings</h1>
              <p style={{ fontFamily: F.body, fontSize: isMobile ? 13 : 15, fontWeight: 500, color: C.mink, lineHeight: 1.55, maxWidth: 560 }}>
                Account, notifications, payments, and pickup defaults.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Outer container — 2-col grid on desktop, drill-down stack on mobile */}
      <div style={{
        display: isMobile ? "flex" : "grid",
        flexDirection: isMobile ? "column" : undefined,
        gridTemplateColumns: isMobile ? undefined : "240px 1fr",
        gap: isMobile ? 0 : 24,
        alignItems: "flex-start",
      }}>
        {/* Section nav — list on mobile, vertical tab strip on desktop */}
        {(!isMobile || !mobileViewingSection) && (
          <nav style={{ display: "flex", flexDirection: "column", gap: isMobile ? 8 : 4, padding: isMobile ? 0 : "8px 0" }}>
            {sections.map(sec => {
              const Ic = sec.icon;
              const active = !isMobile && activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => isMobile ? setMobileViewingSection(sec.id) : setActiveSection(sec.id)}
                  className={isMobile ? "card-elevate" : (active ? "" : "nav-item")}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                    padding: isMobile ? "16px 16px" : "10px 12px",
                    borderRadius: isMobile ? 14 : 10,
                    border: isMobile ? "1px solid " + C.fawn : "none",
                    background: active ? C.greenMist : C.paper,
                    cursor: "pointer",
                    boxShadow: isMobile ? "var(--shadow-xs)" : "none",
                  }}
                >
                  <div style={{
                    width: isMobile ? 38 : 30, height: isMobile ? 38 : 30,
                    borderRadius: isMobile ? 11 : 8,
                    background: active ? C.green : (isMobile ? "linear-gradient(135deg, " + C.sand + " 0%, " + C.fawn + "60 100%)" : C.sand),
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    border: isMobile && !active ? "1px solid " + C.fawn : "none",
                  }}>
                    <Ic size={isMobile ? 17 : 14} style={{ color: active ? "#fff" : C.mink }} strokeWidth={2.2}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: F.head, fontSize: isMobile ? 14 : 13, fontWeight: active ? 800 : 700, color: active ? C.greenDeep : C.ink, lineHeight: 1.2, letterSpacing: "-0.005em" }}>{sec.label}</p>
                    {isMobile && <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, marginTop: 2 }}>{sec.desc}</p>}
                  </div>
                  {isMobile && <ChevronRight size={16} style={{ color: C.smoke, flexShrink: 0 }}/>}
                </button>
              );
            })}
          </nav>
        )}

        {/* Section content */}
        {(!isMobile || mobileViewingSection) && (
          <div style={{ minWidth: 0, width: "100%" }}>
            {/* Mobile back button */}
            {isMobile && (
              <button onClick={() => setMobileViewingSection(null)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 0 16px", border: "none", background: "none", color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                <ArrowLeft size={14}/> All settings
              </button>
            )}

            {/* Section title (mobile only — desktop shows the nav rail's accent on the active item) */}
            {isMobile && currentSection && (
              <div style={{ marginBottom: 18 }}>
                <h2 style={{ fontFamily: F.head, fontSize: 22, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em" }}>{currentSection.label}</h2>
              </div>
            )}

            {currentId === "account"       && <SettingsAccount/>}
            {currentId === "notifications" && <SettingsNotifications/>}
            {currentId === "payments"      && <SettingsPayments acceptedMethods={acceptedMethods} setAcceptedMethods={setAcceptedMethods}/>}
            {currentId === "pickup"        && <SettingsPickup/>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Settings · Account ---- */
function SettingsAccount() {
  return (
    <div style={{ padding: "20px 22px", borderRadius: 18, border: "1.5px solid " + C.fawn, background: C.paper }}>
      <SectionField label="Display name"   value="Alex Anderson"/>
      <SectionField label="Email"          value="alex@example.com"/>
      <SectionField label="Phone"          value="+1 (613) 555-0142"  hint="Used for WhatsApp pickup confirmations"/>
      <SectionField label="Neighbourhood"  value="Barrhaven, Ottawa"/>
      <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.ash, marginTop: 14, fontStyle: "italic" }}>
        Profile editing isn't wired up in this preview — these fields are read-only.
      </p>
    </div>
  );
}

/* ---- Settings · Notifications ---- */
function SettingsNotifications() {
  const [prefs, setPrefs] = useState({
    claim:         { email: true,  whatsapp: true,  push: true  },
    offer:         { email: true,  whatsapp: false, push: true  },
    question:      { email: false, whatsapp: false, push: true  },
    pickup:        { email: true,  whatsapp: true,  push: true  },
    weekly:        { email: true,  whatsapp: false, push: false },
  });
  const rows = [
    { id: "claim",    label: "Item claimed",     desc: "When a buyer claims one of your listings"     },
    { id: "offer",    label: "Offer received",   desc: "When a buyer makes or counters an offer"      },
    { id: "question", label: "Question asked",   desc: "Buyer questions on your listings"             },
    { id: "pickup",   label: "Pickup reminders", desc: "Day-before and 2-hour-before reminders"       },
    { id: "weekly",   label: "Weekly summary",   desc: "Sunday digest of views, claims, and revenue"  },
  ];

  function toggle(rowId, channel) {
    setPrefs(p => ({ ...p, [rowId]: { ...p[rowId], [channel]: !p[rowId][channel] } }));
  }

  return (
    <div style={{ padding: "20px 22px", borderRadius: 18, border: "1.5px solid " + C.fawn, background: C.paper }}>
      {/* Channel header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 60px", gap: 12, paddingBottom: 12, borderBottom: "1px solid " + C.fawn, marginBottom: 8 }}>
        <span/>
        <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, color: C.ash, letterSpacing: "0.12em", textAlign: "center" }}>EMAIL</span>
        <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, color: C.ash, letterSpacing: "0.12em", textAlign: "center" }}>WHATSAPP</span>
        <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, color: C.ash, letterSpacing: "0.12em", textAlign: "center" }}>PUSH</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 60px", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: i === rows.length - 1 ? "none" : "1px solid " + C.fawn }}>
          <div>
            <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.ink }}>{r.label}</p>
            <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, marginTop: 2 }}>{r.desc}</p>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}><Toggle on={prefs[r.id].email}    onClick={() => toggle(r.id, "email")}/></div>
          <div style={{ display: "flex", justifyContent: "center" }}><Toggle on={prefs[r.id].whatsapp} onClick={() => toggle(r.id, "whatsapp")}/></div>
          <div style={{ display: "flex", justifyContent: "center" }}><Toggle on={prefs[r.id].push}     onClick={() => toggle(r.id, "push")}/></div>
        </div>
      ))}
    </div>
  );
}

/* ---- Settings · Payments ---- */
function SettingsPayments({ acceptedMethods, setAcceptedMethods }) {
  // Guard: can't disable the last enabled method — listings need at least one.
  function toggle(k) {
    setAcceptedMethods(m => {
      const next = { ...m, [k]: !m[k] };
      const anyOn = Object.values(next).some(Boolean);
      return anyOn ? next : m; // refuse if it would zero everything out
    });
  }
  const onlyOneOn = Object.values(acceptedMethods).filter(Boolean).length === 1;

  const items = [
    { id: "cash",       label: "Cash",           desc: "Most common for in-person pickup",                    icon: Banknote,   color: C.green },
    { id: "etransfer",  label: "Interac e-Transfer", desc: "Free in Canada, settles in minutes",              icon: DollarSign, color: C.greenDeep },
  ];

  return (
    <div style={{ padding: "20px 22px", borderRadius: 18, border: "1.5px solid " + C.fawn, background: C.paper }}>
      <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, marginBottom: 14, lineHeight: 1.55 }}>
        DropYard never holds your money. Buyers pay you directly at pickup using the methods you accept below. Your choices here become the options on every new listing.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map(it => {
          const Ic = it.icon;
          const on = acceptedMethods[it.id];
          const wouldBeLast = on && onlyOneOn;
          return (
            <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid " + C.fawn }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: it.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ic size={16} style={{ color: it.color }}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.ink }}>{it.label}</p>
                <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, marginTop: 2 }}>
                  {it.desc}
                  {wouldBeLast && <span style={{ color: C.amberDeep, fontWeight: 700 }}> · at least one method must stay on</span>}
                </p>
              </div>
              <Toggle on={on} onClick={() => toggle(it.id)}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Settings · Pickup ---- */
function SettingsPickup() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "20px 22px", borderRadius: 18, border: "1.5px solid " + C.fawn, background: C.paper }}>
        <SectionField label="Default pickup address" value="Cresthaven Drive, Barrhaven, ON"  hint="Shown to buyers after they claim an item"/>
        <SectionField label="Buyer-facing display"   value="Barrhaven, Ottawa"                hint="The neighbourhood name buyers see in listings"/>
        <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.ash, marginTop: 14, fontStyle: "italic" }}>
          Per-listing windows can be set directly when listing each item.
        </p>
      </div>
    </div>
  );
}

/* ---- Shared UI bits used across settings sections ---- */
function SectionField({ label, value, hint }) {
  return (
    <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid " + C.fawn }}>
      <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.mink, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 5 }}>{label}</p>
      <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.ink }}>{value}</p>
      {hint && <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} style={{ width: 36, height: 22, borderRadius: 999, border: "none", cursor: "pointer", background: on ? C.green : C.fawn, position: "relative", transition: "background 150ms", padding: 0 }}>
      <span style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "left 150ms" }}/>
    </button>
  );
}

function EditItemView({ onBack, editingItem, dropPhase = "between", acceptedMethods = { cash: true, etransfer: true } }) {
  const { isMobile } = useViewport();
  const item = editingItem || {
    t: "LG 55 inch Smart TV",
    desc: "4K UHD, 2022 model. Minor scratch on bezel. Remote included.",
    cat: "Electronics",
    cond: "Used - Good",
    price: 250,
    status: "published",
    publishedTo: "shelf",
    e: "\u{1F4FA}",
    photos: [],
    paymentMethod: "either",
  };

  const cats  = ["Furniture", "Electronics", "Appliances & Kitchen", "Clothing & Accessories", "Kids & Baby", "Sports & Outdoor", "Tools & Garden", "Home Décor", "Books, Games & Hobbies", "Collectibles & Antiques", "Other"];
  const conds = ["New", "Used - Like New", "Used - Good", "Used - Fair"];

  const [title, setTitle]   = useState(item.t);
  const [desc,  setDesc]    = useState(item.desc || item.longDesc || "");
  const [cat,   setCat]     = useState(item.cat);
  const [cond,  setCond]    = useState(item.cond);
  const [price, setPrice]   = useState(item.price);
  // Payment options narrow to what the seller currently accepts globally.
  // If the existing item uses a method that's no longer accepted, that option still
  // appears (with a "currently disabled" note) so the seller can see and correct it.
  const availablePaymentOptions = (() => {
    const opts = [];
    if (acceptedMethods.cash) opts.push({ id: "cash", label: "Cash only", icon: DollarSign });
    if (acceptedMethods.etransfer) opts.push({ id: "etransfer", label: "e-Transfer only", icon: Banknote });
    if (acceptedMethods.cash && acceptedMethods.etransfer) opts.push({ id: "either", label: "Cash or e-Transfer", icon: Check });
    return opts;
  })();
  const initialMethod = item.paymentMethod || "either";
  // True if the item's current method requires settings that are now off.
  const methodNeedsCash = initialMethod === "cash" || initialMethod === "either";
  const methodNeedsEtransfer = initialMethod === "etransfer" || initialMethod === "either";
  const methodMismatch =
    (methodNeedsCash && !acceptedMethods.cash) ||
    (methodNeedsEtransfer && !acceptedMethods.etransfer);
  const [paymentMethod, setPaymentMethod] = useState(initialMethod);
  // Bundle mode: seller can flip an item between solo and bundle here too.
  // Contents stored as array on the item; edited as one-per-line in textarea.
  const [isBundle, setIsBundle] = useState(!!item.isBundle);
  const [bundleCount, setBundleCount] = useState(item.bundleCount ? String(item.bundleCount) : "");
  const [bundleContents, setBundleContents] = useState(
    Array.isArray(item.bundleContents) ? item.bundleContents.join("\n") : ""
  );
  // Photos — seed with the item's emoji as a placeholder hero; more slots can be added
  const [photos, setPhotos] = useState(
    item.photos && item.photos.length > 0
      ? item.photos
      : [{ id: 1, emoji: item.e || "\u{1F4E6}", isHero: true }]
  );
  const [showDelete, setShowDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [saved, setSaved] = useState(false);

  // Derive lifecycle from status+publishedTo (same rules as MyItemsView)
  const dropIsLive = dropPhase === "live" || dropPhase === "closing";
  const lifecycle =
    item.status === "draft" ? "draft" :
    item.publishedTo === "drop"  && !dropIsLive ? "queued" :
    item.publishedTo === "drop"  &&  dropIsLive ? "live"   :
    item.publishedTo === "shelf" &&  dropIsLive ? "live"   :
    item.publishedTo === "shelf" && !dropIsLive ? "shelf"  : "draft";
  const lcMeta = {
    draft:  { label: "Draft",                     color: C.ash,       bg: C.sand,      border: C.fawn,               note: null },
    queued: { label: "Queued for Saturday's Drop", color: C.amberDeep, bg: C.amberMist, border: C.amber + "30",       note: "This item is queued — edits apply before it goes live Saturday." },
    live:   { label: "Live in Drop",              color: C.greenDeep, bg: C.greenMist, border: C.green + "40",       note: "This item is live right now. Changes take effect immediately — price changes apply at the next Drop reset to avoid shifting mid-negotiation." },
    shelf:  { label: "On the Shelf",              color: C.ink,       bg: C.sand,      border: C.smoke,              note: "This item is on the Shelf. Changes take effect immediately." },
  };
  const meta = lcMeta[lifecycle];

  function handleSave() {
    // The shape that would be sent to the backend / lifted to parent state.
    // EditItemView is read-only at the demo level (no parent setter wired),
    // but constructing the payload here makes the data flow explicit.
    const _payload = {
      ...item,
      t: title,
      desc,
      cat,
      cond,
      price: Number(price) || 0,
      paymentMethod,
      isBundle,
      bundleCount: isBundle ? (Number(bundleCount) || 0) : undefined,
      bundleContents: isBundle
        ? bundleContents.split("\n").map(s => s.trim()).filter(Boolean)
        : undefined,
    };
    void _payload; // reserved for parent update integration
    setSaved(true);
    setTimeout(() => onBack(), 1200);
  }

  function addPhotoSlot() {
    const next = photos.length + 1;
    setPhotos([...photos, { id: Date.now(), emoji: null, isHero: false }]);
  }
  function removePhoto(id) {
    setPhotos(photos.filter(p => p.id !== id));
  }
  function makeHero(id) {
    setPhotos(photos.map(p => ({ ...p, isHero: p.id === id })));
  }
  function movePhoto(id, dir) {
    const idx = photos.findIndex(p => p.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[idx], next[target]] = [next[target], next[idx]];
    setPhotos(next);
  }

  if (deleted) {
    return (
      <div className="fade-in" style={{ maxWidth: 720, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: C.claretMist, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <X size={32} style={{ color: C.claret }} strokeWidth={2.4}/>
        </div>
        <h2 style={{ fontFamily: F.head, fontSize: 22, fontWeight: 900, color: C.ink, marginBottom: 8 }}>Item deleted</h2>
        <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.mink, lineHeight: 1.6, marginBottom: 24 }}>This item has been permanently removed from your inventory.</p>
        <button onClick={onBack} className="cta-primary" style={{ padding: "11px 22px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800, background: C.green, color: "#fff", boxShadow: "0 2px 0 " + C.greenDeep }}>
          Back to My items
        </button>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="fade-in" style={{ maxWidth: 720, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: C.greenMist, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <CheckCircle size={32} style={{ color: C.greenDeep }} strokeWidth={2.4}/>
        </div>
        <h2 style={{ fontFamily: F.head, fontSize: 22, fontWeight: 900, color: C.ink, marginBottom: 8 }}>Changes saved</h2>
        <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.mink, lineHeight: 1.6 }}>Taking you back to your items...</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* Top bar — Back + lifecycle pill */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 0 14px" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "none", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.mink, padding: 0 }}>
          <ArrowLeft size={15}/> Back to My items
        </button>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.head, fontSize: 10, fontWeight: 900, padding: "4px 12px", borderRadius: 999, background: meta.bg, color: meta.color, letterSpacing: "0.06em", border: "1px solid " + meta.border }}>
          {meta.label}
        </span>
      </div>

      {/* Page title */}
      <div style={{ padding: "8px 0 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ width: 22, height: 2.5, background: C.green, borderRadius: 2 }}/>
          <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.green, letterSpacing: "0.16em", textTransform: "uppercase" }}>Edit listing</p>
        </div>
        <h1 style={{ fontFamily: F.head, fontSize: 30, fontWeight: 900, color: C.ink, letterSpacing: "-0.025em", lineHeight: 1.08 }}>{item.t}</h1>
      </div>

      {/* Lifecycle note */}
      {meta.note && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderRadius: 14, background: lifecycle === "live" ? C.greenMist : meta.bg, border: "1px solid " + meta.border, marginBottom: 18 }}>
          <Info size={14} style={{ color: meta.color, flexShrink: 0, marginTop: 2 }}/>
          <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.55 }}>{meta.note}</p>
        </div>
      )}

      {/* PHOTOS SECTION */}
      <section style={{ padding: "20px 22px", borderRadius: 18, border: "1.5px solid " + C.fawn, background: C.paper, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink }}>Photos</p>
            <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, marginTop: 2 }}>First photo shows as the hero. Drag, reorder, or replace any photo.</p>
          </div>
          <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 700, color: C.ash }}>{photos.length} / 8</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {photos.map((p, i) => (
            <div key={p.id} style={{ position: "relative", aspectRatio: "1/1", borderRadius: 12, background: i === 0 ? "linear-gradient(135deg, " + C.greenMist + ", " + C.sand + ")" : C.sand, border: "1.5px solid " + (i === 0 ? C.green + "30" : C.fawn), display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <span style={{ fontSize: 40 }}>{p.emoji || "\u{1F4F7}"}</span>
              {i === 0 && (
                <span style={{ position: "absolute", top: 6, left: 6, fontFamily: F.head, fontSize: 9, fontWeight: 900, padding: "2px 7px", borderRadius: 6, background: C.green, color: "#fff", letterSpacing: "0.06em" }}>HERO</span>
              )}
              {/* Corner controls */}
              <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 3 }}>
                {i > 0 && (
                  <button onClick={() => makeHero(p.id)} title="Make hero photo" style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "rgba(255,255,255,0.9)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Star size={10} style={{ color: C.mink }}/>
                  </button>
                )}
                <button onClick={() => removePhoto(p.id)} title="Remove photo" style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "rgba(255,255,255,0.9)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={11} style={{ color: C.mink }}/>
                </button>
              </div>
              {/* Reorder arrows */}
              {photos.length > 1 && (
                <div style={{ position: "absolute", bottom: 6, right: 6, display: "flex", gap: 3 }}>
                  {i > 0 && (
                    <button onClick={() => movePhoto(p.id, -1)} title="Move earlier" style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "rgba(255,255,255,0.9)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ChevronLeft size={11} style={{ color: C.mink }}/>
                    </button>
                  )}
                  {i < photos.length - 1 && (
                    <button onClick={() => movePhoto(p.id, 1)} title="Move later" style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "rgba(255,255,255,0.9)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ChevronRight size={11} style={{ color: C.mink }}/>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add photo slot */}
          {photos.length < 8 && (
            <button onClick={addPhotoSlot} style={{ aspectRatio: "1/1", borderRadius: 12, border: "1.5px dashed " + C.smoke, background: C.paper, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, transition: "all 150ms" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.background = C.greenMist; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.smoke; e.currentTarget.style.background = C.paper; }}>
              <Camera size={20} style={{ color: C.mink }}/>
              <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 700, color: C.mink }}>Add photo</span>
            </button>
          )}
        </div>
      </section>

      {/* DETAILS SECTION */}
      <section style={{ padding: "20px 22px", borderRadius: 18, border: "1.5px solid " + C.fawn, background: C.paper, marginBottom: 14 }}>
        <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 12 }}>Details</p>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Title</label>
          <input className="input-clean" value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.ink, outline: "none", boxSizing: "border-box", background: C.paper }}/>
        </div>

        {/* Bundle toggle + (when on) count + contents — mirrors ManualItemForm.
            Lets sellers flip an item between solo and bundle when editing. */}
        <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 12, border: "1.5px solid " + (isBundle ? C.teal + "40" : C.fawn), background: isBundle ? C.tealMist : C.paper, transition: "all 150ms" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <button
              type="button"
              onClick={() => setIsBundle(v => !v)}
              role="switch"
              aria-checked={isBundle}
              style={{ flexShrink: 0, marginTop: 2, width: 36, height: 20, borderRadius: 999, border: "none", padding: 2, cursor: "pointer", background: isBundle ? C.teal : C.smoke, position: "relative", transition: "background 150ms" }}
            >
              <span style={{ display: "block", width: 16, height: 16, borderRadius: "50%", background: "#fff", transform: isBundle ? "translateX(16px)" : "translateX(0)", transition: "transform 150ms" }}/>
            </button>
            <div style={{ flex: 1, minWidth: 0 }} onClick={e => { e.preventDefault(); setIsBundle(v => !v); }}>
              <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: isBundle ? C.teal : C.ink, lineHeight: 1.3, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Package size={13} strokeWidth={2.3}/> List as a bundle / lot
              </p>
              <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, lineHeight: 1.45, marginTop: 2 }}>
                Multiple items, one price. Like "8 kids' books for $5" or "kitchen set: blender, mixer, kettle".
              </p>
            </div>
          </label>

          {isBundle && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed " + C.teal + "30", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, flexShrink: 0 }}>How many items?</label>
                <input
                  type="text" inputMode="numeric"
                  value={bundleCount}
                  onChange={e => setBundleCount(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                  placeholder="e.g., 8"
                  style={{ width: 80, padding: "8px 12px", borderRadius: 8, border: "1.5px solid " + C.teal + "40", fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.teal, outline: "none", background: C.paper, textAlign: "center" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, marginBottom: 4 }}>
                  What's inside? <span style={{ fontWeight: 500, color: C.ash }}>(optional, one item per line)</span>
                </label>
                <textarea
                  value={bundleContents}
                  onChange={e => setBundleContents(e.target.value)}
                  placeholder={"e.g.\nCookbook\nPicture book\nTravel novel"}
                  rows={4}
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1.5px solid " + C.teal + "40", fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.ink, outline: "none", boxSizing: "border-box", resize: "vertical", background: C.paper, lineHeight: 1.5 }}
                />
                <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash, marginTop: 4 }}>
                  Helps buyers searching for individual items find your bundle.
                </p>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Description</label>
          <textarea className="input-clean" value={desc} onChange={e => setDesc(e.target.value)} rows={4} style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.ink, lineHeight: 1.55, resize: "vertical", outline: "none", boxSizing: "border-box", background: C.paper }}/>
        </div>

        {/* Category — full width grid, no side-by-side cramping */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Category</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cats.map(c => {
              const on = cat === c;
              return (
                <button key={c} onClick={() => setCat(c)} style={{ padding: "7px 13px", borderRadius: 999, border: "1.5px solid " + (on ? C.green : C.fawn), cursor: "pointer", fontFamily: F.head, fontSize: 12, fontWeight: on ? 800 : 600, background: on ? C.greenMist : C.paper, color: on ? C.greenDeep : C.mink, transition: "all 150ms" }}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Condition — also full width, but fewer options so fits on one row */}
        <div>
          <label style={{ display: "block", fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Condition</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {conds.map(c => {
              const on = cond === c;
              return (
                <button key={c} onClick={() => setCond(c)} style={{ padding: "7px 13px", borderRadius: 999, border: "1.5px solid " + (on ? C.green : C.fawn), cursor: "pointer", fontFamily: F.head, fontSize: 12, fontWeight: on ? 800 : 600, background: on ? C.greenMist : C.paper, color: on ? C.greenDeep : C.mink, transition: "all 150ms" }}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICE + PAYMENT SECTION */}
      <section style={{ padding: "20px 22px", borderRadius: 18, border: "1.5px solid " + C.fawn, background: C.paper, marginBottom: 14 }}>
        <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 12 }}>Price & payment</p>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "180px 1fr", gap: 16, alignItems: "flex-start" }}>
          <div>
            <label style={{ display: "block", fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
              {isBundle ? "Bundle price ($)" : "Price ($)"}
            </label>
            <input className="input-clean" value={price} onChange={e => setPrice(e.target.value)} type="number" style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, fontFamily: F.head, fontSize: 18, fontWeight: 900, color: C.green, outline: "none", boxSizing: "border-box", background: C.paper }}/>
            {isBundle && (
              <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash, marginTop: 4 }}>One price for the whole bundle.</p>
            )}
          </div>
          <div>
            <label style={{ display: "block", fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Payment accepted</label>
            {methodMismatch && (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "10px 12px", marginBottom: 10, borderRadius: 10,
                background: C.amberMist, border: "1px solid " + C.amber + "30",
              }}>
                <AlertCircle size={13} style={{ color: C.amberDeep, flexShrink: 0, marginTop: 1 }} strokeWidth={2.4}/>
                <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.amberDeep, lineHeight: 1.45 }}>
                  This item lists a payment method you've turned off in Settings. Pick one you currently accept.
                </p>
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              {availablePaymentOptions.length === 0 ? (
                <p style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: C.sand, border: "1px solid " + C.fawn, fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, lineHeight: 1.45 }}>
                  Enable a payment method in Settings → Payments first.
                </p>
              ) : availablePaymentOptions.map(p => {
                const on = paymentMethod === p.id;
                const Ic = p.icon;
                return (
                  <button key={p.id} type="button" onClick={() => setPaymentMethod(p.id)} style={{ flex: 1, height: 42, borderRadius: 12, border: "1.5px solid " + (on ? C.green : C.fawn), cursor: "pointer", background: on ? C.greenMist : C.paper, color: on ? C.greenDeep : C.mink, fontFamily: F.head, fontSize: 12, fontWeight: on ? 800 : 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all 150ms" }}>
                    <Ic size={13}/> {p.label.replace(" only", "").replace("Cash or e-Transfer", "Either")}
                  </button>
                );
              })}
            </div>
            <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash, marginTop: 6, fontStyle: "italic" }}>
              Set globally in Settings → Payments.
            </p>
          </div>
        </div>
      </section>

      {/* Footer actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 40 }}>
        <button onClick={() => setShowDelete(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 999, border: "1.5px solid " + C.claret + "30", cursor: "pointer", fontFamily: F.head, fontSize: 12, fontWeight: 700, background: C.paper, color: C.claret }}>
          <X size={13}/> Delete item
        </button>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onBack} style={{ padding: "11px 22px", borderRadius: 999, border: "1.5px solid " + C.fawn, cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 700, background: C.paper, color: C.mink }}>Cancel</button>
          <button onClick={handleSave} className="cta-primary" style={{ padding: "11px 26px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800, background: C.green, color: "#fff", boxShadow: "0 2px 0 " + C.greenDeep, display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={14} strokeWidth={2.6}/> Save changes
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <div onClick={() => setShowDelete(false)} style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24, backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} className="fade-in" style={{ width: 440, borderRadius: 24, background: C.paper, boxShadow: "var(--shadow-xl)", overflow: "hidden" }}>
            <div style={{ padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: C.claretMist, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <X size={18} style={{ color: C.claret }} strokeWidth={2.4}/>
                </div>
                <div>
                  <h3 style={{ fontFamily: F.head, fontSize: 17, fontWeight: 900, color: C.ink, marginBottom: 4 }}>Delete this item?</h3>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.6 }}>
                    <b style={{ color: C.ink }}>{title}</b> will be permanently removed from your inventory.
                    {lifecycle === "live" && " The listing will be taken down immediately."}
                    {" "}This can't be undone.
                  </p>
                </div>
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid " + C.fawn, background: C.sand, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowDelete(false)} style={{ padding: "10px 18px", borderRadius: 999, border: "1.5px solid " + C.fawn, cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 700, background: C.paper, color: C.mink }}>Keep item</button>
              <button onClick={() => { setShowDelete(false); setDeleted(true); }} className="cta-primary" style={{ padding: "10px 20px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800, background: C.claret, color: "#fff", boxShadow: "0 2px 0 #8B2010" }}>Delete permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DropYardSellerDashboard({ onSwitchRole = () => alert("In the full product, this switches to the buyer dashboard.") } = {}) {
  const { isMobile } = useViewport();
  const [view, setView] = useState("overview");
  const [editingItem, setEditingItem] = useState(null);

  // Demo scenario cycler — lets you preview every state from the chip in the top bar.
  // Maps to (dropPhase, synthesized "now") so countdown math reads true in every state.
  const [scenario, setScenario] = useState(null);
  const computedPhase = useDropPhase();
  const dropPhase = scenarioToPhase(scenario) || computedPhase;
  const now = effectiveNow(scenario);
  function cycleScenario() {
    const order = ["pre-drop", "live", "closing", "post-drop"];
    const idx = order.indexOf(scenario);
    setScenario(order[(idx + 1) % order.length]);
  }

  // Globally accepted payment methods (managed in Settings → Payments).
  // ManualItemForm and EditItemView read this to constrain per-listing choices —
  // a seller can only offer methods they've enabled here.
  const [acceptedMethods, setAcceptedMethods] = useState({ cash: true, etransfer: true });

  function goToEdit(item) { setEditingItem(item); setView("edit-item"); }

  return (
    <>
      <GlobalStyle/>
      <div style={{
        display: "flex", flexDirection: "column",
        height: "100vh",
        background: C.paper,
        // Subtle warm noise texture — matches buyer dashboard so the two products feel of-a-piece
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.42 0 0 0 0 0.36 0 0 0 0 0.27 0 0 0 0.18 0'/></filter><rect width='240' height='240' filter='url(%23n)'/></svg>\")",
        backgroundSize: "240px 240px",
        backgroundRepeat: "repeat",
        fontFamily: F.body,
        color: C.ink,
      }}>
        <TopNav onNav={setView} scenario={scenario} dropPhase={dropPhase} onCycleScenario={cycleScenario}/>
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Sidebar — desktop only. On mobile, MobileBottomNav handles primary navigation. */}
          {!isMobile && <Sidebar activeView={view} onNav={setView} onSwitchRole={onSwitchRole}/>}
          <main style={{
            flex: 1,
            overflow: "auto",
            padding: isMobile ? "18px 16px 100px" : "24px 36px 40px",
            background: "transparent",
          }}>
            {view === "overview" && <Overview onNav={setView} dropPhase={dropPhase} now={now}/>}
            {view === "items" && <MyItemsView onNav={setView} onEdit={goToEdit} dropPhase={dropPhase}/>}
            {view === "orders" && <PickupsView onNav={setView} dropPhase={dropPhase}/>}
            {view === "pickups" && <PickupsView onNav={setView} dropPhase={dropPhase}/>}
            {view === "messages" && <SellerMessagesView />}
            {view === "history" && <SellerHistoryView />}
            {view === "edit-item" && <EditItemView onBack={() => setView("items")} editingItem={editingItem} dropPhase={dropPhase} acceptedMethods={acceptedMethods}/>}

            {view === "add-manual" && <ManualItemForm onDone={() => setView("items")} onBack={() => setView("items")} onGoToItems={() => setView("items")} acceptedMethods={acceptedMethods}/>}

            {view === "settings" && <SettingsView acceptedMethods={acceptedMethods} setAcceptedMethods={setAcceptedMethods}/>}

            {!["overview", "items", "orders", "pickups", "messages", "history", "edit-item", "add-manual", "settings"].includes(view) && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.smoke, fontSize: 16, fontFamily: F.body }}>
                {view.replace(/-/g, " ")} - Coming soon
              </div>
            )}
          </main>
        </div>

        {/* Mobile primary nav — fixed bottom bar, mirrors buyer's pattern */}
        {isMobile && <MobileBottomNav activeView={view} onNav={setView}/>}
      </div>
    </>
  );
}
