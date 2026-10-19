"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { apiRequest, uploadItemPhoto } from "@/lib/api";
import { useSocketEvent } from "@/context/SocketContext";
import { SocketHealthDot } from "@/components/SocketHealthDot";
import { useAuth } from "@/context/AuthContext";
import { useDropCycle } from "@/context/DropCycleContext";
import { formatPickupDateList, formatPickupDateLong } from "@/lib/pickupDates";
import {
  dropCloseMoment,
  nextDropMoment,
  toSellerOverviewPhase,
  hoursSinceLastDropClose,
  formatCompactCountdown,
  dropOpenDay,
  dropOpenHour,
  dropOpenHourCompact,
  OPERATING_TIMEZONE,
} from "@/lib/dropCycle";
import { submitSubmission, isValidEmail } from "@/lib/submissions";
import {
  Camera, X, Check, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Sparkles, Zap,
  MessageCircle, Package, Eye, ArrowRight, User, Clock, Calendar,
  CheckCircle, MapPin, LayoutGrid, Box, DollarSign, ClipboardList,
  MessageSquare, Plus, Truck, History, ArrowLeft, Shield, Tag, TrendingDown,
  Home, Heart, Users, Mail, Phone, Info, Lock, CreditCard, Banknote, Upload, RefreshCw,
  Star, Settings, BarChart3, Bell, Award, Leaf, Send, Share2, AlertCircle,
  Search, CreditCard as CardIcon, LogOut, Loader2, Menu, ShoppingBag
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

// Viewport hook — reused across views that need a mobile branch (Inventory,
// later: Orders / Messages / etc). 768px matches the sidebar collapse breakpoint.
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

// Wordmark without the "From one home to another" tagline. The tagline is
// unreadable at nav height and repeats what the page already says, so the
// title bar uses the clean mark. Was a ~73KB base64 data URI inlined into
// all six dashboard files; public/Logo_1.png is the same artwork, cached
// by the browser and shared across every surface.
const LOGO_SRC = "/logo-wordmark.png";

/* ============================================================
   BACKEND ENUM MAPS
   The form uses richer UI labels than the Prisma enums.
   These tables collapse the rich labels onto the closest enum.
   When the schema gains more categories/conditions later, just
   widen these maps - no other call site changes.
   ============================================================ */
const CATEGORY_TO_ENUM = {
  "Furniture":                "FURNITURE",
  "Electronics":              "ELECTRONICS",
  "Appliances & Kitchen":     "HOME",
  "Clothing & Accessories":   "CLOTHING",
  "Kids & Baby":              "OTHER",
  "Sports & Outdoor":         "SPORTS",
  "Tools & Garden":           "HOME",
  "Home Décor":               "HOME",
  "Books, Games & Hobbies":   "BOOKS",
  "Collectibles & Antiques":  "OTHER",
  "Other":                    "OTHER",
};
const CONDITION_TO_ENUM = {
  "New":             "EXCELLENT",
  "Used - Like New": "LIKE_NEW",
  "Used - Good":     "GOOD",
  "Used - Fair":     "FAIR",
};

// Form payment values map directly to backend PaymentMethod enum.
const PAYMENT_TO_ENUM = {
  "cash":      "CASH",
  "etransfer": "ETRANSFER",
  "either":    "EITHER",
};
// Form publishWhen values map to ItemPlacement enum.
const PLACEMENT_TO_ENUM = {
  "drop":  "DROP",
  "shelf": "SHELF",
};

// Reverse maps - backend enum -> UI label. Used when reading items from the
// API to render in My Items / Edit form.
//
// Backend ItemCategory is narrower than the form's UI labels (we collapsed
// "Appliances & Kitchen", "Tools & Garden" and "Home Décor" all onto HOME),
// so we lose granularity on the way back. Best we can do is show the closest
// generic label. If we ever widen the enum, just expand this map.
const ENUM_TO_CATEGORY_LABEL = {
  FURNITURE:   "Furniture",
  ELECTRONICS: "Electronics",
  SPORTS:      "Sports & Outdoor",
  HOME:        "Home",
  CLOTHING:    "Clothing & Accessories",
  BOOKS:       "Books, Games & Hobbies",
  OTHER:       "Other",
};
const ENUM_TO_CONDITION_LABEL = {
  EXCELLENT: "New",
  LIKE_NEW:  "Used - Like New",
  GOOD:      "Used - Good",
  FAIR:      "Used - Fair",
};
// BUG-095 — pickup availability must not accept dates in the past. Built from
// LOCAL calendar parts, not toISOString(), which converts to UTC first and
// therefore reports "tomorrow" for anyone east of UTC late in the day (and
// "yesterday" for the Americas in the early hours) — Ottawa is UTC-4/-5, so
// toISOString() would have let sellers pick yesterday for part of every day.
function todayLocalISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
/** True when a YYYY-MM-DD string is strictly before today (local time). */
function isPastISODate(value) {
  return typeof value === "string" && value.length === 10 && value < todayLocalISO();
}

const ENUM_TO_PLACEMENT_LABEL = {
  DROP:  "drop",
  SHELF: "shelf",
};

// Category -> default emoji shown in the My Items list when the item has no
// uploaded photo to lean on. Picked to be category-recognisable at a glance.
const CATEGORY_EMOJI = {
  FURNITURE:   "🛋️",     // couch
  ELECTRONICS: "📱",            // phone
  SPORTS:      "⚽",                  // soccer ball
  HOME:        "🏠",            // house
  CLOTHING:    "👕",            // t-shirt
  BOOKS:       "📚",            // books
  OTHER:       "📦",            // package
};

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
function GlobalStyle() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: "Nunito", -apple-system, BlinkMacSystemFont, sans-serif; background: ${C.paper}; color: ${C.ink}; }
        .fade-in { animation: fadeIn 300ms ease-out both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGreen { 0% { box-shadow: 0 0 0 0 ${C.green}55; } 70% { box-shadow: 0 0 0 14px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
        @keyframes pulseAmber { 0% { box-shadow: 0 0 0 0 ${C.amber}60; } 70% { box-shadow: 0 0 0 10px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
        @keyframes pulseLive { 0% { transform: scale(1); opacity: 0.8; } 70% { transform: scale(2.2); opacity: 0; } 100% { transform: scale(2.2); opacity: 0; } }
        .chip-hover:hover { border-color: ${C.smoke} !important; }
        .cta-primary { transition: transform 150ms ease, box-shadow 150ms ease; }
        .cta-primary:hover { transform: translateY(-1px); }
        .cta-primary:active { transform: translateY(0); }
      `}</style>
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

// Magical Seller/Buyer toggle: animated sliding pill with gradient, icons,
// glow, and a brief switching feedback before the dashboard actually flips.
function RoleToggle({ onSwitchToBuyer }) {
  const [switching, setSwitching] = useState(false);
  const [hoverBuyer, setHoverBuyer] = useState(false);

  function handleBuyerClick() {
    if (switching) return;
    // Animate slider over to "Buyer" for ~180ms before triggering the actual
    // role switch, so the user sees the transition before unmount.
    setSwitching(true);
    setTimeout(() => {
      onSwitchToBuyer && onSwitchToBuyer();
    }, 220);
  }

  // Slider sits over the "active" half. Seller is the current dashboard,
  // so it lives on the left until the user clicks Buyer.
  const sliderOnRight = switching;

  return (
    <div style={{
      position: "relative",
      display: "flex",
      padding: 4,
      borderRadius: 14,
      background: C.sand,
      border: "1px solid " + C.fawn,
      boxShadow: "inset 0 1px 2px rgba(31,29,25,0.06)",
      overflow: "hidden",
    }}>
      {/* Animated slider pill */}
      <div style={{
        position: "absolute",
        top: 4, bottom: 4,
        left: 4,
        width: "calc(50% - 4px)",
        background: sliderOnRight
          ? "linear-gradient(135deg, " + C.amber + " 0%, " + C.amberDeep + " 100%)"
          : "linear-gradient(135deg, " + C.green + " 0%, " + C.greenDeep + " 100%)",
        borderRadius: 10,
        boxShadow: sliderOnRight
          ? "0 4px 12px " + C.amber + "55, 0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.18)"
          : "0 4px 12px " + C.green + "55, 0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.18)",
        transform: sliderOnRight ? "translateX(100%)" : "translateX(0)",
        transition: "transform 220ms cubic-bezier(0.4, 0, 0.2, 1), background 220ms ease, box-shadow 220ms ease",
      }}/>

      {/* SELLER (always the active side while on seller dashboard) */}
      <button
        disabled
        style={{
          flex: 1,
          padding: "9px 0",
          borderRadius: 10,
          border: "none",
          background: "transparent",
          cursor: "default",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          fontSize: 12.5,
          fontWeight: 800,
          fontFamily: F.head,
          letterSpacing: "0.02em",
          color: sliderOnRight ? C.ash : "#fff",
          position: "relative", zIndex: 1,
          transition: "color 200ms ease",
        }}
      >
        <Truck size={13} strokeWidth={2.6}/>
        Seller
      </button>

      {/* BUYER (clickable — slides the pill, then routes) */}
      <button
        onClick={handleBuyerClick}
        onMouseEnter={() => setHoverBuyer(true)}
        onMouseLeave={() => setHoverBuyer(false)}
        disabled={switching}
        style={{
          flex: 1,
          padding: "9px 0",
          borderRadius: 10,
          border: "none",
          background: "transparent",
          cursor: switching ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          fontSize: 12.5,
          fontWeight: 800,
          fontFamily: F.head,
          letterSpacing: "0.02em",
          color: sliderOnRight ? "#fff" : (hoverBuyer ? C.ink : C.mink),
          position: "relative", zIndex: 1,
          transition: "color 200ms ease, transform 180ms ease",
          transform: hoverBuyer && !sliderOnRight ? "scale(1.03)" : "scale(1)",
        }}
      >
        <ShoppingBag size={13} strokeWidth={2.6}/>
        Buyer
      </button>
    </div>
  );
}

// Compact "Switch to Buyer" pill — shown in the TopNav on mobile only (CSS
// gated via `.dy-mobile-only` class). The full RoleToggle above lives in the
// desktop sidebar; mobile users need an equivalent affordance because the
// sidebar is hidden. Mirrors the buyer dashboard's compact SwitchToSellerButton
// in shape, swapped to the buyer-side green tint.
function SwitchToBuyerButton({ onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="Switch to Buyer"
      title="Switch to Buyer"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px",
        borderRadius: 999,
        border: "1.5px solid " + (hover ? C.green : C.fawn),
        background: hover
          ? "linear-gradient(135deg, " + C.greenMist + " 0%, " + C.paper + " 100%)"
          : C.paper,
        cursor: "pointer",
        fontFamily: F.head,
        fontSize: 12,
        fontWeight: 800,
        color: hover ? C.greenDeep : C.mink,
        boxShadow: hover
          ? "0 6px 18px " + C.green + "33, 0 1px 2px rgba(31,29,25,0.04)"
          : "0 1px 2px rgba(31,29,25,0.04)",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <span style={{
        width: 24, height: 24, borderRadius: 7,
        background: hover ? C.green : C.greenMist,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        boxShadow: hover ? "0 2px 6px " + C.green + "55" : "none",
        transition: "all 200ms ease",
      }}>
        <ShoppingBag size={13} style={{ color: hover ? "#fff" : C.greenDeep }} strokeWidth={2.6}/>
      </span>
    </button>
  );
}

// Magic nav item: left accent bar with glow on active, sliding chevron on
// hover, premium icon tile with subtle elevation, smooth transitions.
// In `collapsed` (rail) mode, renders icon-only with the label in `title`
// as a native tooltip.
function SidebarNavItem({ item, active, accent, accentMist, Icon, onClick, showBadge, messageBadge = 0, collapsed = false }) {
  const [hover, setHover] = useState(false);
  const bg = active
    ? accentMist
    : (hover ? C.sand : "transparent");

  if (collapsed) {
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title={item.label}
        aria-label={item.label}
        style={{
          position: "relative",
          width: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "8px 0",
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
          marginBottom: 4,
          background: bg,
          transition: "background 180ms ease",
        }}
      >
        {active && (
          <span style={{
            position: "absolute",
            left: -2, top: 7, bottom: 7,
            width: 3,
            borderRadius: "0 3px 3px 0",
            background: accent,
            boxShadow: "0 0 8px " + accent + "80, 0 0 2px " + accent,
          }}/>
        )}
        <span style={{
          width: 34, height: 34, borderRadius: 9,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: active ? accent : (hover ? C.paper : "transparent"),
          boxShadow: active
            ? "0 3px 8px " + accent + "44"
            : (hover ? "0 1px 2px rgba(31,29,25,0.08)" : "none"),
          transition: "background 180ms ease, box-shadow 180ms ease",
        }}>
          <Icon size={16} style={{ color: active ? "#fff" : C.mink }} strokeWidth={2.2}/>
        </span>
        {showBadge && (
          <span style={{
            position: "absolute",
            top: 4, right: 6,
            width: 6, height: 6, borderRadius: "50%",
            background: C.amberDeep,
            boxShadow: "0 0 0 2px " + C.paper,
          }}/>
        )}
        {messageBadge > 0 && (
          <span style={{
            position: "absolute",
            top: 2, right: 4,
            minWidth: 14, height: 14, padding: "0 4px",
            borderRadius: 999,
            background: C.claret, color: "#fff",
            fontFamily: F.head, fontSize: 9, fontWeight: 800,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 2px " + C.paper,
          }}>{messageBadge > 99 ? "99+" : messageBadge}</span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px 9px 14px",
        borderRadius: 10,
        border: "none",
        cursor: "pointer",
        marginBottom: 3,
        textAlign: "left",
        background: bg,
        transition: "background 180ms ease, transform 160ms ease",
        transform: hover && !active ? "translateX(2px)" : "translateX(0)",
        overflow: "visible",
      }}
    >
      {/* Active left accent bar with soft glow */}
      {active && (
        <span style={{
          position: "absolute",
          left: -2,
          top: 7,
          bottom: 7,
          width: 3,
          borderRadius: "0 3px 3px 0",
          background: accent,
          boxShadow: "0 0 8px " + accent + "80, 0 0 2px " + accent,
        }}/>
      )}

      {/* Icon tile — premium feel when active or hover */}
      <span style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? accent : (hover ? C.paper : "transparent"),
        boxShadow: active
          ? "0 3px 8px " + accent + "44"
          : (hover ? "0 1px 2px rgba(31,29,25,0.08)" : "none"),
        transition: "background 180ms ease, box-shadow 180ms ease",
        flexShrink: 0,
      }}>
        <Icon size={15} style={{ color: active ? "#fff" : C.mink }} strokeWidth={2.2}/>
      </span>

      {/* Label */}
      <span style={{
        fontSize: 13,
        fontWeight: active ? 800 : 600,
        color: active ? accent : C.mink,
        fontFamily: F.head,
        flex: 1,
        letterSpacing: active ? "-0.005em" : 0,
        transition: "color 180ms ease",
      }}>
        {item.label}
      </span>

      {/* Badge (e.g. AI usage 3/5) */}
      {showBadge && (
        <span style={{
          fontSize: 9,
          fontWeight: 800,
          padding: "2px 7px",
          borderRadius: 999,
          background: C.amberMist,
          color: C.amberDeep,
          fontFamily: F.head,
        }}>
          3/5
        </span>
      )}

      {/* Unread messages badge (Sidebar Messages item) — claret to distinguish
          from the amber AI-usage badge above. */}
      {messageBadge > 0 && (
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          padding: "2px 8px",
          borderRadius: 999,
          background: C.claret,
          color: "#fff",
          fontFamily: F.head,
          lineHeight: 1.2,
        }}>
          {messageBadge > 99 ? "99+" : messageBadge}
        </span>
      )}

      {/* Sliding chevron on active OR hover (not when badge is showing) */}
      {!showBadge && messageBadge === 0 && (active || hover) && (
        <ChevronRight
          size={13}
          style={{
            color: active ? accent : C.ash,
            opacity: active ? 0.9 : 0.6,
            transform: hover && !active ? "translateX(2px)" : "translateX(0)",
            transition: "transform 160ms ease, opacity 160ms ease",
          }}
          strokeWidth={2.5}
        />
      )}
    </button>
  );
}

// Mobile primary nav — fixed to the bottom of the viewport, replaces the
// sidebar on small screens. 5 tabs with the Sell action elevated to a green
// pill so creating listings is one thumb-tap away. Respects iOS safe-area.
function MobileBottomNav({ activeView, onNav, messagesUnread = 0 }) {
  const navItems = [
    { id: "overview",   label: "Home",     icon: LayoutGrid,    matches: ["overview"] },
    { id: "items",      label: "Items",    icon: Box,           matches: ["items","orders","claims","pickups","edit-item","item-detail"] },
    { id: "add-manual", label: "Sell",     icon: Plus,          matches: ["add-manual","add-chooser","add-ai","ai-setup","ai-photos"], primary: true },
    { id: "messages",   label: "Messages", icon: MessageSquare, matches: ["messages"], badge: messagesUnread > 0 ? messagesUnread : null },
    { id: "history",    label: "You",      icon: User,          matches: ["history","settings","ai-plan"] },
  ];
  return (
    <nav role="navigation" aria-label="Primary" className="dy-mobile-bottom-nav" style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60,
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
          if (item.primary) {
            return (
              <button
                key={item.id}
                onClick={() => onNav(item.id)}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
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
                  boxShadow: "0 3px 10px " + C.greenDeep + "55",
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
                transition: "color 150ms",
              }}
            >
              {active && (
                <span aria-hidden="true" style={{
                  position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)",
                  width: 48, height: 32, borderRadius: 999,
                  background: C.greenMist,
                  border: "1px solid " + C.green + "20",
                }}/>
              )}
              <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "transform 150ms", transform: active ? "scale(1.05)" : "scale(1)" }}>
                <Ic size={22} strokeWidth={active ? 2.4 : 2}/>
                {item.badge != null && (
                  <span style={{
                    position: "absolute", top: -4, right: -10,
                    minWidth: 16, height: 16, padding: "0 4px",
                    borderRadius: 999, background: C.claret, color: "#fff",
                    fontFamily: F.head, fontSize: 9, fontWeight: 800,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    border: "1.5px solid " + C.paper,
                  }}>{item.badge > 99 ? "99+" : item.badge}</span>
                )}
              </span>
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: active ? 800 : 600, letterSpacing: active ? "-0.005em" : "0.02em", whiteSpace: "nowrap" }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Sidebar({ activeView, onNav, aiPlan, onSwitchRole, collapsed = false, messagesUnread = 0 }) {
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

  // Collapsible section state — default open. Keyed by section header.
  const [collapsedSections, setCollapsedSections] = useState({});
  const isCollapsed = (header) => !!collapsedSections[header];
  const toggleSection = (header) => setCollapsedSections(c => ({ ...c, [header]: !c[header] }));

  function handleClick(item) {
    if (item.id === "inventory") return onNav("items");
    onNav(item.id);
  }

  function isActive(item) {
    if (item.group === "inv")      return ["items","orders","claims","pickups","edit-item","add-chooser","add-manual","add-ai","ai-setup","ai-photos"].includes(activeView);
    if (item.group === "ded")      return activeView.startsWith("ded");
    return activeView === item.id;
  }

  function accentColor(item) {
    if (item.group === "ded") return C.teal;
    return C.green;
  }
  function accentMist(item) {
    if (item.group === "ded") return C.tealMist;
    return C.greenMist;
  }

  return (
    <aside className="dy-desktop-sidebar" style={{
      width: collapsed ? 72 : 240,
      borderRight: "1px solid " + C.fawn,
      background: C.paper,
      display: "flex", flexDirection: "column",
      height: "100%", flexShrink: 0,
      transition: "width 240ms cubic-bezier(0.4, 0, 0.2, 1)",
      overflow: "hidden",
    }}>
      {/* Role switcher — hidden in collapsed mode (no meaningful icon-only form) */}
      {!collapsed && (
        <div style={{ padding: "14px 14px 0 14px" }}>
          <RoleToggle onSwitchToBuyer={onSwitchRole}/>
        </div>
      )}

      {/* List new item CTA — full label when expanded, icon-only when collapsed */}
      <div style={{ padding: collapsed ? "14px 12px 4px 12px" : "12px 14px 4px 14px" }}>
        <button
          onClick={() => onNav("add-manual")}
          className="cta-primary"
          title={collapsed ? "List New Item" : undefined}
          style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            padding: collapsed ? "11px 0" : "12px 0",
            borderRadius: 12, border: "none", cursor: "pointer",
            background: C.green, color: "#fff",
            fontSize: 13, fontWeight: 800, fontFamily: F.head,
            boxShadow: "0 2px 0 " + C.greenDeep,
          }}
        >
          <Plus size={15} strokeWidth={2.5}/>
          {!collapsed && "List New Item"}
        </button>
      </div>

      {/* Nav sections — collapsible per-section header (when not in rail mode) */}
      <div style={{ padding: collapsed ? "12px 8px 10px" : "16px 10px 10px 10px", flex: 1, overflowY: "auto" }}>
        {sections.map((sec, si) => {
          const col = isCollapsed(sec.header);
          // Rail mode: replace section header with a thin divider line; always
          // show all icons (section collapse only matters in full mode).
          if (collapsed) {
            return (
              <div key={si} style={{ marginBottom: 10 }}>
                {si > 0 && (
                  <div style={{ height: 1, background: C.fawn, margin: "10px 8px 12px" }}/>
                )}
                {sec.items.map(item => {
                  const act = isActive(item);
                  const ac = accentColor(item);
                  const ab = accentMist(item);
                  const Ic = item.icon;
                  return (
                    <SidebarNavItem
                      key={item.id}
                      item={item}
                      active={act}
                      accent={ac}
                      accentMist={ab}
                      Icon={Ic}
                      onClick={() => handleClick(item)}
                      showBadge={item.group === "settings" && aiPlan === "free"}
                      messageBadge={item.id === "messages" ? messagesUnread : 0}
                      collapsed
                    />
                  );
                })}
              </div>
            );
          }
          return (
            <div key={si} style={{ marginBottom: 14 }}>
              {/* Section header — click to collapse/expand */}
              <button
                onClick={() => toggleSection(sec.header)}
                aria-expanded={!col}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  marginBottom: 6,
                  textAlign: "left",
                  transition: "background 150ms ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.sand; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <ChevronDown
                  size={14}
                  strokeWidth={2.6}
                  style={{
                    color: C.mink,
                    flexShrink: 0,
                    transform: col ? "rotate(-90deg)" : "rotate(0deg)",
                    transition: "transform 200ms ease",
                  }}
                />
                <p style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: C.mink,
                  letterSpacing: "0.16em",
                  fontFamily: F.head,
                  textTransform: "uppercase",
                  flex: 1,
                }}>
                  {sec.header}
                </p>
                {col && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: C.ash,
                    fontFamily: F.head,
                  }}>
                    {sec.items.length}
                  </span>
                )}
              </button>

              {/* Items (hidden when collapsed) */}
              {!col && sec.items.map(item => {
                const act = isActive(item);
                const ac = accentColor(item);
                const ab = accentMist(item);
                const Ic = item.icon;
                return (
                  <SidebarNavItem
                    key={item.id}
                    item={item}
                    active={act}
                    accent={ac}
                    accentMist={ab}
                    Icon={Ic}
                    onClick={() => handleClick(item)}
                    showBadge={item.group === "settings" && aiPlan === "free"}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// Avatar with dropdown menu - real user initials and sign-out.
function SellerUserMenu({ user, onSignout, onOpenSettings }) {
  const [open, setOpen] = useState(false);
  const initials = user?.name ? initialsOf(user.name) : "?";
  const displayName = user?.name || "Guest";
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={displayName}
        style={{
          width: 36, height: 36, borderRadius: "50%",
          background: avatarBg(displayName),
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 900, fontSize: 12, fontFamily: F.head,
          border: "none", cursor: "pointer", padding: 0,
        }}
      >
        {initials}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }}/>
          <div className="fade-in" style={{
            position: "absolute", right: 0, top: "calc(100% + 10px)", zIndex: 50,
            minWidth: 240, borderRadius: 14, background: C.paper,
            border: "1px solid " + C.fawn, boxShadow: "0 12px 32px rgba(31, 29, 25, 0.12)",
            overflow: "hidden",
          }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid " + C.fawn }}>
              <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 2 }}>
                {displayName}
              </p>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, wordBreak: "break-all" }}>
                {user?.email || ""}
              </p>
            </div>
            <button
              onClick={() => { setOpen(false); onSignout && onSignout(); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "12px 16px", border: "none", background: "transparent",
                cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 700,
                color: C.claret, textAlign: "left",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.claretMist; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <LogOut size={14}/> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Breadcrumb label for the current view. Inventory sub-views collapse into
// a single "Inventory" label so the breadcrumb stays clean.
function labelForView(view) {
  if (view === "overview")     return "Overview";
  if (view === "messages")     return "Messages";
  if (view === "history")      return "History";
  if (view === "settings")     return "Settings";
  if (view === "ai-plan")      return "AI plan";
  if ([
    "items","orders","claims","pickups",
    "edit-item","add-chooser","add-manual","add-ai","ai-setup","ai-photos",
  ].includes(view)) return "Inventory";
  // Fallback — humanize the view id.
  return (view || "").charAt(0).toUpperCase() + (view || "").slice(1).replace(/-/g, " ");
}

function TopNav({ user, onSignout, onOpenSettings, activeView, onToggleSidebar, onSwitchRole, messagesUnread = 0, onOpenMessages = null }) {
  // No `useViewport()` here on purpose — layout flips between mobile/desktop
  // happen entirely via CSS media queries on the `.dy-seller-topnav*` classes
  // defined in globals.css. Gating layout on a JS hook produced a first-paint
  // flicker on mobile (SSR `useViewport` defaults to width=1280 → desktop
  // layout rendered first, then re-rendered after hydration). See BUG-030.
  const viewLabel = labelForView(activeView);
  return (
    <header className="dy-seller-topnav">
      {/* LOGO ZONE — 240px wide on desktop to match the sidebar so the next
          column aligns with where the sidebar ends. Compresses to auto on mobile. */}
      <div className="dy-seller-topnav__logo-zone">
        <Link href="/" title="DropYard home" style={{ display: "flex", alignItems: "center", flexShrink: 0, textDecoration: "none" }}>
          <img src={LOGO_SRC} alt="DropYard" className="dy-seller-topnav__logo"/>
        </Link>
      </div>

      {/* BREADCRUMB — sidebar toggle and "Seller /" prefix are desktop-only. */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <button
          onClick={onToggleSidebar}
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
          className="dy-desktop-only"
          style={{
            width: 38, height: 38, borderRadius: 10,
            border: "1px solid " + C.fawn, background: C.paper,
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0,
            transition: "background 150ms ease, border-color 150ms ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.sand; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.paper; }}
        >
          <Menu size={16} style={{ color: C.mink }} strokeWidth={2.2}/>
        </button>
        <nav aria-label="Breadcrumb" className="dy-seller-topnav__breadcrumb" style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: F.head, minWidth: 0 }}>
          <span className="dy-desktop-only" style={{ color: C.mink, fontWeight: 600 }}>Seller</span>
          <span className="dy-desktop-only" style={{ color: C.smoke, fontWeight: 700 }}>/</span>
          <span style={{ color: C.ink, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{viewLabel}</span>
        </nav>
      </div>

      {/* CENTER — search bar (desktop only) */}
      <div className="dy-desktop-only" style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", maxWidth: 640, width: "100%" }}>
          <Search size={15} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: C.ash, pointerEvents: "none" }} strokeWidth={2.4}/>
          <input
            type="text"
            placeholder="Search items, orders, claims…"
            style={{
              width: "100%",
              padding: "11px 16px 11px 40px",
              borderRadius: 999,
              border: "1px solid " + C.fawn,
              background: C.sand,
              fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.ink,
              outline: "none", boxSizing: "border-box",
              transition: "background 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
            }}
            onFocus={e => { e.currentTarget.style.background = C.paper; e.currentTarget.style.borderColor = C.greenMist; e.currentTarget.style.boxShadow = "0 0 0 3px " + C.greenMist; }}
            onBlur={e => { e.currentTarget.style.background = C.sand; e.currentTarget.style.borderColor = C.fawn; e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>
      </div>

      {/* RIGHT — notifications bell + (mobile-only) switch to buyer + user menu */}
      <div className="dy-seller-topnav__right">
        {/* Switch to Buyer: shown only on mobile; desktop has the RoleToggle in the sidebar. */}
        {onSwitchRole && (
          <span className="dy-mobile-only" style={{ display: "inline-flex" }}>
            <SwitchToBuyerButton onClick={() => onSwitchRole()}/>
          </span>
        )}
        <button
          title={messagesUnread > 0 ? messagesUnread + " unread message" + (messagesUnread === 1 ? "" : "s") : "Notifications"}
          aria-label="Notifications"
          className="dy-seller-topnav__bell"
          onClick={() => onOpenMessages && onOpenMessages()}
          onMouseEnter={e => { e.currentTarget.style.background = C.sand; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.paper; }}>
          <Bell size={16} style={{ color: C.mink }} strokeWidth={2.2}/>
          {messagesUnread > 0 ? (
            <span style={{
              position: "absolute", top: 4, right: 4,
              minWidth: 16, height: 16, padding: "0 4px",
              borderRadius: 999, background: C.claret, color: "#fff",
              fontFamily: F.head, fontSize: 9, fontWeight: 800,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              border: "2px solid " + C.paper,
            }}>{messagesUnread > 99 ? "99+" : messagesUnread}</span>
          ) : null}
        </button>
        {/* BUG-064 — socket health pulse for at-a-glance real-time status. */}
        <SocketHealthDot />
        <SellerUserMenu user={user} onSignout={onSignout} onOpenSettings={onOpenSettings}/>
      </div>
    </header>
  );
}


/* ============================== OVERVIEW ============================== */
/* ============================================================
   PHASE-AWARE OVERVIEW HEROES — ported from v2.
   Three faces, chosen by `dropPhase`:
     • "between"  → countdown to next Drop (or fresh-recap face <30h after close)
     • "live"     → live indicator + closes-in countdown + activity stats
     • "closing"  → urgent last-call card (LIVE with ≤ 3h left)
   ============================================================ */

// Inlined v2 shadow tokens — keeps the heroes self-contained inside this file.
const _SH_XS = "0 1px 2px rgba(31, 29, 25, 0.04), 0 1px 1px rgba(31, 29, 25, 0.03)";
const _SH_SM = "0 1px 3px rgba(31, 29, 25, 0.06), 0 1px 2px rgba(31, 29, 25, 0.04)";
const _SH_MD = "0 4px 12px rgba(31, 29, 25, 0.08), 0 2px 4px rgba(31, 29, 25, 0.05)";

// Shared building block used to wrap every Overview block in a consistent
// titled section. Title on the left, optional `action` slot on the right
// (typically a "See all"-style ghost button). Falls back gracefully when both
// are omitted — useful for full-bleed sections that don't need a header.
function OverviewSection({ title, action, children }) {
  const { isMobile } = useViewport();
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

// Bundle-contents reveal — shown next to bundle items in compact contexts
// (Going-Live preview, ShareSheet) where the full ItemDetailView list would
// be too much. Shows the first 3 items inline, lets the seller expand to see
// the rest. Teal theme matches the Bundle-of-N pill elsewhere.
function BundleInside({ contents }) {
  const { isMobile } = useViewport();
  const [open, setOpen] = useState(false);
  if (!contents || contents.length === 0) return null;
  const visible = open ? contents : contents.slice(0, 3);
  const remainder = contents.length - visible.length;
  return (
    <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: 10, background: C.tealMist, border: "1px solid " + C.teal + "25" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Package size={11} style={{ color: C.teal }} strokeWidth={2.3}/>
        <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.teal, letterSpacing: "0.06em", textTransform: "uppercase" }}>What&rsquo;s inside</span>
      </div>
      <p style={{ fontFamily: F.body, fontSize: isMobile ? 11 : 12, fontWeight: 600, color: C.ink, lineHeight: 1.45 }}>
        {visible.join(" · ")}
        {remainder > 0 && (
          <>
            {" "}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setOpen(true); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setOpen(true); } }}
              style={{ cursor: "pointer", fontFamily: F.head, fontSize: isMobile ? 11 : 12, fontWeight: 800, color: C.teal, textDecoration: "underline" }}
            >+{remainder} more</span>
          </>
        )}
        {open && contents.length > 3 && (
          <>
            {" "}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setOpen(false); } }}
              style={{ cursor: "pointer", fontFamily: F.head, fontSize: isMobile ? 11 : 12, fontWeight: 700, color: C.mink, textDecoration: "underline" }}
            >show less</span>
          </>
        )}
      </p>
    </div>
  );
}

// Discrete action-items strip — 4 buckets (pickups today / messages awaiting /
// pickups this week / drafts unfinished). Replaces production's generic
// attentionItems list with v2's metric-first framing: the seller sees one tile
// per category at a glance, each tile jumps to the relevant view.
function ActionItems({ pickupsToday, pickupsWeek, messages, drafts, onNav }) {
  const { isMobile } = useViewport();
  const items = [];
  if (pickupsToday > 0) items.push({
    icon: MapPin, color: C.claret, mist: C.claretMist,
    title: pickupsToday === 1 ? "1 pickup today" : pickupsToday + " pickups today",
    sub: "Don’t keep buyers waiting", go: () => onNav("pickups"),
  });
  if (messages > 0) items.push({
    icon: MessageSquare, color: C.amberDeep, mist: C.amberMist,
    title: messages + " message" + (messages === 1 ? "" : "s") + " awaiting reply",
    sub: "Buyers move fast — reply soon", go: () => onNav("messages"),
  });
  if (pickupsWeek > pickupsToday) items.push({
    icon: Calendar, color: C.greenDeep, mist: C.greenMist,
    title: (pickupsWeek - pickupsToday) + " more pickup" + (pickupsWeek - pickupsToday === 1 ? "" : "s") + " this week",
    sub: "Plan your week", go: () => onNav("pickups"),
  });
  if (drafts > 0) items.push({
    icon: ClipboardList, color: C.mink, mist: C.sand,
    title: drafts + " draft" + (drafts === 1 ? "" : "s") + " unfinished",
    sub: "Finish before Friday to make this Drop", go: () => onNav("items"),
  });
  if (items.length === 0) return null;
  return (
    <OverviewSection title="Needs your attention">
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 8 : 10 }}>
        {items.map((it, i) => {
          const Ic = it.icon;
          return (
            <button
              key={i}
              onClick={it.go}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "15px 18px", borderRadius: 14,
                background: C.paper,
                border: "1px solid " + C.fawn,
                cursor: "pointer", textAlign: "left",
                transition: "border-color 150ms",
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

function BetweenHero({ now, countdown, nextDropAt, queuedCount, shelfCount, draftsCount, recap, onNav, onShare }) {
  const { isMobile } = useViewport();
  // Both must format on the Drop's clock, not the viewer's. Without timeZone
  // the 8 a.m. Toronto opening renders as the local equivalent — "5:30 p.m."
  // in IST, "5 a.m." in Vancouver — and the weekday can slip a day as well.
  const dayLabel = nextDropAt.toLocaleDateString("en-CA", { timeZone: OPERATING_TIMEZONE, weekday: "long" });
  const timeLabel = nextDropAt.toLocaleTimeString("en-CA", { timeZone: OPERATING_TIMEZONE, hour: "numeric", minute: "2-digit", hour12: true }).replace(":00 ", " ");
  const hrsSinceClose = hoursSinceLastDropClose(now);
  const isFresh = recap && hrsSinceClose < 30;
  const showRecapLine = recap && !isFresh && hrsSinceClose < 120; // ~5 days

  // ── Fresh recap face: green hero, sold/earned headline, countdown secondary
  if (isFresh) {
    return (
      <section style={{
        marginBottom: isMobile ? 16 : 24,
        position: "relative", overflow: "hidden",
        borderRadius: isMobile ? 18 : 24,
        padding: isMobile ? "22px 22px" : "32px 36px",
        background: "linear-gradient(135deg, " + C.greenMist + " 0%, " + C.paper + " 75%)",
        border: "1px solid " + C.green + "30",
        boxShadow: _SH_MD + ", inset 0 1px 0 rgba(255,255,255,0.7)",
      }}>
        <div style={{ position: "absolute", top: -60, right: -30, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, " + C.green + "20 0%, transparent 70%)", pointerEvents: "none" }}/>
        <div style={{ position: "absolute", bottom: -50, left: 30, width: 110, height: 110, borderRadius: "50%", background: "radial-gradient(circle, " + C.green + "10 0%, transparent 70%)", pointerEvents: "none" }}/>
        <div style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: isMobile ? 16 : 28 }}>
          <div style={{ flex: 1, minWidth: isMobile ? 0 : 280 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: C.green, marginBottom: 12, boxShadow: _SH_XS }}>
              <Award size={11} style={{ color: "#fff" }} strokeWidth={2.5}/>
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 900, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>Drop wrapped</span>
            </div>
            <h2 style={{ fontFamily: F.head, fontSize: isMobile ? 26 : 40, fontWeight: 900, color: C.ink, letterSpacing: "-0.035em", lineHeight: 1.02, marginBottom: 10 }}>
              {recap.sold} of {recap.total} sold · ${recap.earned} earned
            </h2>
            <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.mink, lineHeight: 1.5, marginBottom: 4 }}>
              Top item: <span style={{ color: C.ink, fontWeight: 700 }}>{recap.top}</span>.
            </p>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.greenDeep, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Calendar size={11} strokeWidth={2.3}/> Next Drop · {dayLabel} {timeLabel} ({countdown})
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0, minWidth: 220 }}>
            <button onClick={() => onNav("pickups")} className="cta-primary" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "13px 22px", borderRadius: 999, border: "none", cursor: "pointer",
              fontFamily: F.head, fontSize: 13, fontWeight: 800, letterSpacing: "-0.005em",
              background: "linear-gradient(180deg, " + C.green + " 0%, " + C.greenDeep + " 100%)",
              color: "#fff",
              boxShadow: "0 2px 0 " + C.greenDeep + ", " + _SH_SM,
            }}>
              <Truck size={14} strokeWidth={2.4}/> See pickups
            </button>
            <button onClick={() => onNav("history")} style={{
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

  // ── Mid + late week: countdown-led, amber hero
  return (
    <section style={{
      marginBottom: isMobile ? 16 : 24,
      position: "relative", overflow: "hidden",
      borderRadius: isMobile ? 18 : 24,
      padding: isMobile ? "18px 16px" : "32px 36px",
      background: "linear-gradient(135deg, " + C.amberMist + " 0%, " + C.paper + " 75%)",
      border: "1px solid " + C.amber + "30",
      boxShadow: _SH_MD + ", inset 0 1px 0 rgba(255,255,255,0.7)",
    }}>
      <div style={{ position: "absolute", top: -60, right: -30, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, " + C.amber + "1a 0%, transparent 70%)", pointerEvents: "none" }}/>
      <div style={{ position: "absolute", bottom: -50, left: 40, width: 110, height: 110, borderRadius: "50%", background: "radial-gradient(circle, " + C.amber + "10 0%, transparent 70%)", pointerEvents: "none" }}/>
      <div style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: isMobile ? 14 : 28 }}>
        <div style={{ flex: 1, minWidth: isMobile ? "100%" : 280 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: C.amberDeep, marginBottom: 12, boxShadow: _SH_XS }}>
            <Calendar size={11} style={{ color: "#fff" }} strokeWidth={2.5}/>
            <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 900, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>Next Drop</span>
          </div>
          <h2 style={{ fontFamily: F.head, fontSize: isMobile ? 20 : 36, fontWeight: 900, color: C.ink, letterSpacing: "-0.035em", lineHeight: 1, marginBottom: 4 }}>
            {dayLabel} {timeLabel}
          </h2>
          <p style={{ fontFamily: F.head, fontSize: isMobile ? 32 : 58, fontWeight: 900, color: C.amberDeep, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 10 }}>
            {countdown}
          </p>
          <p style={{ fontFamily: F.body, fontSize: isMobile ? 12.5 : 14, fontWeight: 600, color: C.mink, lineHeight: 1.5 }}>
            {shelfCount > 0 && queuedCount > 0
              ? shelfCount + " selling on the Shelf now · " + queuedCount + " queued for Saturday"
              : shelfCount > 0
              ? shelfCount + " selling on the Shelf now · joining the Drop on Saturday"
              : queuedCount > 0
              ? queuedCount + " queued for Saturday — list more on the Shelf to sell this week"
              : "Nothing listed yet — list an item to get on the Shelf today"}
            {draftsCount > 0 && " · " + draftsCount + " draft" + (draftsCount === 1 ? "" : "s") + " to finish"}
          </p>
          {showRecapLine && (
            <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.ash, marginTop: 8, paddingTop: 8, borderTop: "1px dashed " + C.amber + "30" }}>
              Last Drop · {recap.sold} sold · ${recap.earned}
              {recap.returnedCount > 0 && " · " + recap.returnedCount + " back on Shelf"}
            </p>
          )}
        </div>
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "row" : "column",
          gap: isMobile ? 8 : 10,
          flexShrink: 0,
          width: isMobile ? "100%" : "auto",
          minWidth: isMobile ? 0 : 220,
        }}>
          <button
            onClick={onShare}
            className="cta-primary"
            style={{
              flex: isMobile ? 1 : "0 1 auto",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: isMobile ? "11px 14px" : "13px 22px",
              borderRadius: 999, border: "none", cursor: "pointer",
              fontFamily: F.head, fontSize: isMobile ? 12 : 13, fontWeight: 800, letterSpacing: "-0.005em",
              background: "linear-gradient(180deg, " + C.amber + " 0%, " + C.amberDeep + " 100%)",
              color: "#fff",
              boxShadow: "0 2px 0 #8B4A00, " + _SH_SM,
              whiteSpace: "nowrap",
            }}
          >
            <Share2 size={14} strokeWidth={2.4}/>
            {isMobile ? "Share" : "Share what I’m bringing"}
          </button>
          <button
            onClick={() => onNav("add-manual")}
            style={{
              flex: isMobile ? 1 : "0 1 auto",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: isMobile ? "11px 14px" : "12px 22px",
              borderRadius: 999, border: "1.5px solid " + C.amber + "40",
              cursor: "pointer", fontFamily: F.head, fontSize: isMobile ? 12 : 13, fontWeight: 800,
              background: C.paper, color: C.amberDeep,
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={13} strokeWidth={2.4}/> List more
          </button>
        </div>
      </div>
    </section>
  );
}

function BackOnShelfCard({ items, onNav }) {
  return (
    <button
      onClick={() => onNav("items")}
      style={{
        width: "100%", textAlign: "left",
        padding: "18px 22px",
        borderRadius: 16,
        background: C.paper,
        border: "1.5px dashed " + C.amber + "60",
        cursor: "pointer",
        display: "flex", alignItems: "center", gap: 14,
        marginBottom: 24,
        boxShadow: _SH_XS,
      }}
    >
      <div style={{
        width: 46, height: 46, borderRadius: 13,
        background: "linear-gradient(135deg, " + C.amberMist + " 0%, " + C.amberMist + "80 100%)",
        border: "1px solid " + C.amber + "30",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Package size={20} style={{ color: C.amberDeep }} strokeWidth={2.3}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 900, color: C.ink, marginBottom: 3, letterSpacing: "-0.01em" }}>
          {items.length} item{items.length === 1 ? "" : "s"} back on the Shelf
        </p>
        <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, lineHeight: 1.45, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {items.map(i => i.t).join(" · ")} · still claimable, consider a price drop
        </p>
      </div>
      <ChevronRight size={16} style={{ color: C.smoke, flexShrink: 0 }}/>
    </button>
  );
}

function LiveHero({ countdown, liveCount, saves, claims, onNav, onShare = null }) {
  const { isMobile } = useViewport();
  return (
    <section style={{
      marginBottom: isMobile ? 16 : 24,
      position: "relative", overflow: "hidden",
      borderRadius: isMobile ? 18 : 24,
      padding: isMobile ? "22px 22px" : "32px 36px",
      background: "linear-gradient(135deg, " + C.greenMist + " 0%, " + C.paper + " 75%)",
      border: "1px solid " + C.green + "40",
      boxShadow: _SH_MD + ", inset 0 1px 0 rgba(255,255,255,0.7)",
    }}>
      <div style={{ position: "absolute", top: -60, right: -30, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, " + C.green + "20 0%, transparent 70%)", pointerEvents: "none" }}/>
      <div style={{ position: "absolute", bottom: -50, left: 40, width: 110, height: 110, borderRadius: "50%", background: "radial-gradient(circle, " + C.green + "10 0%, transparent 70%)", pointerEvents: "none" }}/>
      <div style={{ position: "relative", display: "flex", flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: isMobile ? 16 : 28 }}>
        <div style={{ flex: 1, minWidth: 0, width: isMobile ? "100%" : "auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 999, background: C.green, marginBottom: 12, boxShadow: _SH_XS }}>
            <span style={{ position: "relative", display: "inline-flex", width: 9, height: 9 }}>
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#fff", opacity: 0.6, animation: "pulseLive 1.6s ease-in-out infinite" }}/>
              <span style={{ position: "relative", width: 9, height: 9, borderRadius: "50%", background: "#fff" }}/>
            </span>
            <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 900, color: "#fff", letterSpacing: "0.12em", textTransform: "uppercase" }}>Drop is live</span>
          </div>
          <h2 style={{ fontFamily: F.head, fontSize: isMobile ? 26 : 34, fontWeight: 900, color: C.ink, letterSpacing: "-0.035em", lineHeight: 1.05, marginBottom: 6 }}>
            Closes in {countdown}
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.mink, lineHeight: 1.5, marginBottom: 4 }}>
            <span style={{ color: C.ink, fontWeight: 700 }}>{liveCount}</span> of your items are in the live Drop right now
          </p>
          <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.greenDeep, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Heart size={11} strokeWidth={2.3}/> {saves} {saves === 1 ? "buyer" : "buyers"} watching · {claims} {claims === 1 ? "claim" : "claims"} pending
          </p>
        </div>
        {/* Mobile: stack the two CTAs side-by-side (more compact than two
            full-width buttons) so the hero stays tall-but-not-towering. */}
        <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", gap: 10, flexShrink: 0, minWidth: isMobile ? 0 : 220, width: isMobile ? "100%" : "auto" }}>
          <button
            onClick={() => onNav("messages")}
            className="cta-primary"
            style={{
              flex: isMobile ? 1 : "0 0 auto",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: isMobile ? "11px 14px" : "13px 22px", borderRadius: 999, border: "none", cursor: "pointer",
              fontFamily: F.head, fontSize: 13, fontWeight: 800, letterSpacing: "-0.005em",
              background: "linear-gradient(180deg, " + C.green + " 0%, " + C.greenDeep + " 100%)",
              color: "#fff",
              boxShadow: "0 2px 0 " + C.greenDeep + ", " + _SH_SM,
              whiteSpace: "nowrap",
            }}
          >
            <MessageSquare size={14} strokeWidth={2.4}/> Open messages
          </button>
          <button
            onClick={() => onNav("items")}
            style={{
              flex: isMobile ? 1 : "0 0 auto",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: isMobile ? "10px 14px" : "12px 22px", borderRadius: 999, border: "1.5px solid " + C.green + "40",
              cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800,
              background: C.paper, color: C.greenDeep,
              whiteSpace: "nowrap",
            }}
          >
            <Eye size={13} strokeWidth={2.4}/> See what&apos;s live
          </button>
          {onShare && (
            <button
              onClick={onShare}
              aria-label="Share your live items"
              title="Share"
              style={{
                flex: isMobile ? "0 0 auto" : "0 0 auto",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: isMobile ? "10px 14px" : "12px 22px", borderRadius: 999,
                border: "1.5px solid " + C.green + "40", cursor: "pointer",
                fontFamily: F.head, fontSize: 13, fontWeight: 800,
                background: C.paper, color: C.greenDeep, whiteSpace: "nowrap",
              }}
            >
              <Share2 size={13} strokeWidth={2.4}/> Share
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function ClosingHero({ countdown, unsoldCount, onNav }) {
  const { isMobile } = useViewport();
  return (
    <section style={{
      marginBottom: isMobile ? 16 : 24,
      position: "relative", overflow: "hidden",
      borderRadius: isMobile ? 18 : 24,
      padding: isMobile ? "22px 22px" : "30px 36px",
      background: "linear-gradient(135deg, " + C.claretMist + " 0%, " + C.paper + " 75%)",
      border: "1px solid " + C.claret + "40",
      boxShadow: _SH_MD + ", inset 0 1px 0 rgba(255,255,255,0.7)",
    }}>
      <div style={{ position: "absolute", top: -60, right: -30, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, " + C.claret + "18 0%, transparent 70%)", pointerEvents: "none" }}/>
      <div style={{ position: "relative" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: C.claret, marginBottom: 12, boxShadow: _SH_XS }}>
          <Clock size={11} style={{ color: "#fff" }} strokeWidth={2.5}/>
          <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 900, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>Closing time</span>
        </div>
        <h2 style={{ fontFamily: F.head, fontSize: isMobile ? 24 : 36, fontWeight: 900, color: C.ink, letterSpacing: "-0.035em", lineHeight: 1.02, marginBottom: 6 }}>
          Drop closes in {countdown}
        </h2>
        <p style={{ fontFamily: F.body, fontSize: isMobile ? 13 : 14, fontWeight: 600, color: C.mink, lineHeight: 1.5, marginBottom: 18 }}>
          <span style={{ color: C.ink, fontWeight: 700 }}>{unsoldCount} items</span> haven&apos;t sold yet. Last call — drop prices or move them to the free pile before items roll back to the Shelf.
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
            boxShadow: "0 2px 0 #8B2010, " + _SH_SM,
          }}
        >
          Open closing-time tools <ArrowRight size={13} strokeWidth={2.4}/>
        </button>
      </div>
    </section>
  );
}

// Horizontal scroll strip of items going live this Drop (queued for DROP OR
// already on SHELF). Rendered in the `between` phase — gives the seller a
// glanceable confirmation of what they've contributed.
function GoingLivePreview({ items, onNav }) {
  if (!items || items.length === 0) return null;
  return (
    <OverviewSection
      title="Going live this Drop"
      action={
        <button onClick={() => onNav("items")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 700, background: "none", color: C.mink }}>
          See all <ChevronRight size={12}/>
        </button>
      }
    >
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, paddingTop: 2, scrollSnapType: "x mandatory" }}>
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onNav("items")}
            style={{
              flexShrink: 0, width: 158, padding: 14, borderRadius: 14,
              background: C.paper, border: "1px solid " + C.fawn,
              cursor: "pointer", textAlign: "left", scrollSnapAlign: "start",
              boxShadow: _SH_XS,
            }}
          >
            <div style={{
              width: "100%", height: 80, borderRadius: 12,
              background: "linear-gradient(135deg, " + C.sand + " 0%, " + C.fawn + "80 100%)",
              border: "1px solid " + C.fawn,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 10, overflow: "hidden",
            }}>
              {it.photos && it.photos.length > 0 ? (
                <img src={it.photos[0]} alt={it.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
              ) : (
                <span style={{ fontSize: 36 }}>{it.e || "\u{1F4E6}"}</span>
              )}
            </div>
            <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.ink, lineHeight: 1.3, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.005em" }}>{it.title}</p>
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
            {/* Bundle contents reveal — only when the item is a bundle. Tap "+N more"
                to expand without leaving the strip. */}
            {Array.isArray(it.bundleContents) && it.bundleContents.length > 0 && (
              <BundleInside contents={it.bundleContents}/>
            )}
          </button>
        ))}
      </div>
    </OverviewSection>
  );
}

// Feed of recent claim events. Rendered during `live` and `closing` phases.
// `events` shape: [{ who, what, when, tone }] where tone ∈ "view" | "save" |
// "msg" | "claim" | "confirmed" | "soldout".
function LiveActivity({ events, onNav }) {
  if (!events || events.length === 0) return null;
  const toneColor = {
    view:      C.sky || C.mink,
    save:      C.claret,
    msg:       C.amberDeep,
    claim:     C.amberDeep,
    confirmed: C.greenDeep,
    soldout:   C.greenDeep,
  };
  return (
    <OverviewSection
      title="Activity right now"
      action={
        <button onClick={() => onNav && onNav("claims")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 700, background: "none", color: C.mink }}>
          View claims <ChevronRight size={12}/>
        </button>
      }
    >
      <div style={{
        borderRadius: 14, background: C.paper,
        border: "1px solid " + C.fawn,
        boxShadow: _SH_XS,
        overflow: "hidden",
      }}>
        {events.map((e, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "13px 16px",
            borderBottom: i < events.length - 1 ? "1px solid " + C.fawn : "none",
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: avatarBg(e.who), color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: F.head, fontSize: 11, fontWeight: 900, flexShrink: 0,
              boxShadow: _SH_XS,
            }}>
              {initialsOf(e.who)}
            </div>
            <p style={{ flex: 1, minWidth: 0, fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

// Compact relative-time helper for the LiveActivity feed.
// "just now" → seconds <60; "Xm ago" → minutes <60; "Xh ago" → hours <24;
// otherwise weekday abbreviation.
function relativeWhen(dateLike) {
  if (!dateLike) return "just now";
  const t = new Date(dateLike).getTime();
  if (Number.isNaN(t)) return "just now";
  const diffSec = Math.max(0, (Date.now() - t) / 1000);
  if (diffSec < 60)      return "just now";
  if (diffSec < 3600)    return Math.floor(diffSec / 60) + "m ago";
  if (diffSec < 86400)   return Math.floor(diffSec / 3600) + "h ago";
  return new Date(t).toLocaleDateString("en-CA", { weekday: "short" });
}

// Sell-with-AI teaser. Compact opt-in card with rotating capability ticker.
// The notify CTA posts a SELLER_AI_WAITLIST submission so admins see it in
// the Inbox.
function SellWithAITeaser({ notified, onNotify }) {
  const features = [
    { icon: Camera,         label: "Create listings from photos" },
    { icon: MessageSquare,  label: "Answer buyer questions instantly" },
    { icon: RefreshCw,      label: "Negotiate offers automatically" },
    { icon: Truck,          label: "Coordinate pickups via WhatsApp" },
    { icon: Sparkles,       label: "5 free listings every month" },
  ];

  const [activeFeature, setActiveFeature] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActiveFeature((i) => (i + 1) % features.length);
    }, 3200);
    return () => clearInterval(id);
  }, [paused, features.length]);

  const ActiveIcon = features[activeFeature].icon;

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        marginBottom: 24,
        borderRadius: 18,
        padding: "22px 26px",
        background: "linear-gradient(135deg, " + C.aiMist + " 0%, " + C.paper + " 78%)",
        border: "1px solid " + C.ai + "30",
        boxShadow: _SH_MD + ", inset 0 1px 0 rgba(255,255,255,0.7)",
        position: "relative", overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: -50, right: -20, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, " + C.ai + "1a 0%, transparent 70%)", pointerEvents: "none" }}/>
      <div style={{ position: "absolute", bottom: -40, left: 30, width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle, " + C.ai + "0d 0%, transparent 70%)", pointerEvents: "none" }}/>

      <div style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: C.ai, marginBottom: 12, boxShadow: _SH_XS }}>
            <Sparkles size={11} style={{ color: "#fff" }} strokeWidth={2.6}/>
            <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 900, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>Coming soon</span>
          </div>
          <h2 style={{ fontFamily: F.head, fontSize: 28, fontWeight: 900, color: C.ink, letterSpacing: "-0.035em", lineHeight: 1.08, marginBottom: 12 }}>
            Sell with <span style={{ color: C.ai }}>AI</span>
          </h2>

          {/* Rolling feature ticker */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 38, marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "rgba(255, 255, 255, 0.7)",
              border: "1px solid " + C.ai + "30",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: _SH_XS,
              transition: "all 220ms cubic-bezier(0.25, 1, 0.5, 1)",
            }}>
              <ActiveIcon size={15} style={{ color: C.ai }} strokeWidth={2.4}/>
            </div>
            <p
              key={activeFeature}
              className="fade-in"
              style={{
                fontFamily: F.head, fontSize: 16, fontWeight: 800,
                color: C.ink, letterSpacing: "-0.015em",
                lineHeight: 1.3, flex: 1, minWidth: 0,
              }}
            >
              {features[activeFeature].label}
            </p>
          </div>

          {/* Dot pager */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                    transition: "all 220ms cubic-bezier(0.25, 1, 0.5, 1)",
                  }}
                />
              );
            })}
          </div>
        </div>

        <div style={{ flexShrink: 0, minWidth: 220 }}>
          {notified ? (
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
                <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 900, color: C.greenDeep, letterSpacing: "-0.005em" }}>You&apos;re on the list</p>
                <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, lineHeight: 1.35 }}>We&apos;ll email you the moment it goes live.</p>
              </div>
            </div>
          ) : (
            <button
              onClick={onNotify}
              className="cta-primary"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "13px 22px", borderRadius: 999, border: "none", cursor: "pointer",
                fontFamily: F.head, fontSize: 13, fontWeight: 800, letterSpacing: "-0.005em",
                background: "linear-gradient(180deg, " + C.ai + " 0%, #6628D1 100%)",
                color: "#fff",
                boxShadow: "0 2px 0 #4F1FAA, " + _SH_SM,
              }}
            >
              <Bell size={14} strokeWidth={2.4}/> Notify me when it&apos;s ready
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// Lifetime impact card — items rehomed, $ earned, lbs diverted. Stats are
// derived from PICKED_UP claims in Overview and threaded in via props.
function ImpactCard({ rehomed, earned, weight, onNav }) {
  const { isMobile } = useViewport();
  return (
    <button
      onClick={() => onNav && onNav("history")}
      style={{
        width: "100%", padding: isMobile ? "18px 18px" : "22px 26px",
        borderRadius: 16, background: C.paper,
        border: "1px solid " + C.fawn,
        cursor: "pointer", textAlign: "left",
        marginBottom: 16,
        boxShadow: _SH_XS,
        transition: "border-color 150ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.green + "60"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.fawn; }}
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
          <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 900, color: C.ink, letterSpacing: "-0.01em" }}>Your impact</p>
        </div>
        <ChevronRight size={16} style={{ color: C.smoke }}/>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: isMobile ? 10 : 14 }}>
        <div>
          <p style={{ fontFamily: F.head, fontSize: isMobile ? 22 : 26, fontWeight: 900, color: C.greenDeep, letterSpacing: "-0.02em", lineHeight: 1 }}>{rehomed}</p>
          <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, marginTop: 5 }}>Items rehomed</p>
        </div>
        <div>
          <p style={{ fontFamily: F.head, fontSize: isMobile ? 22 : 26, fontWeight: 900, color: C.greenDeep, letterSpacing: "-0.02em", lineHeight: 1 }}>${(earned || 0).toLocaleString()}</p>
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

// Share modal — triggered from BetweenHero's "Share what I'm bringing" CTA.
// Generates branded text + 6 share targets (copy, WhatsApp, SMS, email, etc).
/**
 * One-shot share for a single inventory row (seller side). Mirrors the buyer
 * dashboard's helper — Web Share API on mobile, clipboard fallback on
 * desktop. Returns nothing; UI feedback is the OS sheet or browser default
 * (the seller's inventory rows don't have a toast surface today). — BUG-051.
 */
async function shareSellerListing(item) {
  const title = item?.t || item?.title || "DropYard listing";
  const price = item?.price;
  const priceFragment = item?.isFree
    ? " · FREE"
    : (typeof price === "number" && price >= 0) ? " · $" + price : "";
  const text = "Check out \"" + title + "\"" + priceFragment + " on DropYard.";
  const base = (typeof window !== "undefined" && window.location && window.location.origin)
    ? window.location.origin
    : "https://dropyard.app";
  // BUG-085 — public item page, was the marketing homepage. See the buyer
  // dashboard's shareUrlFor() for the full rationale.
  const url = base + "/item/" + encodeURIComponent(item?.id || "") + "?ref=share";
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try { await navigator.share({ title, text, url }); return; }
    catch (err) { if (err && err.name === "AbortError") return; }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    try { await navigator.clipboard.writeText(text + " " + url); } catch { /* noop */ }
  }
}

function ShareSheet({ items, onClose }) {
  const { isMobile } = useViewport();
  const [copied, setCopied] = useState(false);

  function pathOf(it) { return it.layer || it.publishedTo || "shelf"; }
  const all = items || [];
  const shelfItems = all.filter((i) => pathOf(i) === "shelf");
  const dropItems  = all.filter((i) => pathOf(i) === "drop");
  const itemCount = all.length;

  const visibleShelf = shelfItems.slice(0, 2);
  const visibleDrop  = dropItems.slice(0, 3 - visibleShelf.length);
  const shownIds = new Set([...visibleShelf, ...visibleDrop].map((i) => i.id));
  const remaining = all.filter((i) => !shownIds.has(i.id)).length;

  const titleOf = (it) => it.t || it.title || "Item";
  // Inline bundle contents in the share text so recipients see what's in a
  // bundle without needing to open the listing — same intent as the
  // BundleInside reveal we use elsewhere, adapted for a text medium.
  const contentsOf = (it) => {
    if (!it.isBundle && !(Array.isArray(it.bundleContents) && it.bundleContents.length > 0)) return "";
    const c = Array.isArray(it.bundleContents) ? it.bundleContents : [];
    if (c.length === 0) return "";
    const head = c.slice(0, 3).join(", ");
    const more = c.length > 3 ? " +" + (c.length - 3) + " more" : "";
    return " (" + head + more + ")";
  };
  const shelfLines = visibleShelf.map((it) => "🟢 " + titleOf(it) + contentsOf(it) + " — $" + it.price + "  · claim now");
  const dropLines  = visibleDrop.map((it) => "🟡 " + titleOf(it) + contentsOf(it) + " — $" + it.price + "  · Drop · Saturday");
  const itemLines = [...shelfLines, ...dropLines].join("\n");
  const tail = remaining > 0 ? "\n   + " + remaining + " more on the listing" : "";
  const SHARE_URL = "https://dropyard.app";

  const onlyShelf = shelfItems.length > 0 && dropItems.length === 0;
  const onlyDrop  = dropItems.length > 0 && shelfItems.length === 0;

  let headline, ctaLine;
  if (onlyShelf) {
    headline = "I'm selling " + itemCount + " items on DropYard 🛍️";
    ctaLine  = "Claim now — first to tap gets it.";
  } else if (onlyDrop) {
    headline = "I'm bringing " + itemCount + " items to this Saturday's Drop 🛍️";
    ctaLine  = `Browse + save them now. Claims open ${dropOpenDay()} ${dropOpenHourCompact()} — set a reminder.`;
  } else {
    headline = "I've got " + shelfItems.length + " on the Shelf + " + dropItems.length + " coming to Saturday's Drop 🛍️";
    ctaLine  = `🟢 Shelf items: claim now\n🟡 Drop items: save them now, claim opens ${dropOpenDay()} ${dropOpenHourCompact()}`;
  }

  const shareText =
    "🟢 DropYard\n" +
    "─────────────────────\n" +
    headline + "\n\n" +
    itemLines + tail + "\n\n" +
    ctaLine + "\n" +
    "👉 " + SHARE_URL + "\n\n" +
    "DropYard is our neighbourhood yard sale — every Saturday. " +
    "Rehome stuff, meet neighbours, keep things out of the landfill. ♻️";

  const shareTextShort = onlyShelf
    ? "🟢 Selling " + itemCount + " items on DropYard — claim now 🛍️\n" + SHARE_URL + " #DropYard"
    : onlyDrop
    ? "🟡 Bringing " + itemCount + " items to Saturday's DropYard 🛍️\n" + SHARE_URL + " #DropYard"
    : "🛍️ " + shelfItems.length + " on the Shelf + " + dropItems.length + " coming Saturday — DropYard\n" + SHARE_URL + " #DropYard";

  const emailSubject = onlyShelf
    ? "I'm selling " + itemCount + " items on DropYard — claim before they're gone"
    : onlyDrop
    ? "I'm bringing " + itemCount + " items to Saturday's DropYard"
    : "Stuff I'm selling on DropYard this week";

  function openWindow(url) { window.open(url, "_blank", "noopener,noreferrer,width=600,height=700"); }
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
    { id: "whatsapp", label: "WhatsApp", color: "#25D366", bg: "#E8F8EE",     glyph: "💬", action: shareWhatsApp },
    { id: "facebook", label: "Facebook", color: "#1877F2", bg: "#E7F0FE",     glyph: "f",  action: shareFacebook },
    { id: "x",        label: "X",        color: "#000000", bg: "#F2F2F2",     glyph: "𝕏",   action: shareX },
    { id: "email",    label: "Email",    color: C.mink,    bg: C.sand,        glyph: "✉",  action: shareEmail },
    { id: "sms",      label: "Messages", color: C.amberDeep, bg: C.amberMist, glyph: "💌", action: shareSMS },
    { id: "copy",     label: copied ? "Copied!" : "Copy link", color: copied ? C.greenDeep : C.ink, bg: copied ? C.greenMist : C.sand, glyph: copied ? "✓" : "🔗", action: copyLink },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(31, 29, 25, 0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: isMobile ? 12 : 24,
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
        style={{
          width: 520, maxWidth: "100%",
          borderRadius: 24,
          background: C.paper,
          boxShadow: "0 20px 48px rgba(31,29,25,0.14), 0 8px 16px rgba(31,29,25,0.08)",
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
                Bring more neighbours to Saturday&apos;s Drop.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: C.sand, border: "none", width: 44, height: 44, borderRadius: "50%",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
            aria-label="Close"
          >
            <X size={15} style={{ color: C.mink }}/>
          </button>
        </div>

        {/* Preview */}
        <div style={{ padding: "18px 22px", overflowY: "auto" }}>
          <p style={{
            fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.ash,
            letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10,
          }}>Preview</p>
          <div style={{
            borderRadius: 12,
            padding: "14px 16px",
            background: C.sand,
            border: "1px solid " + C.fawn,
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
            fontSize: 12.5,
            color: C.ink,
            lineHeight: 1.5,
            maxHeight: 220,
            overflowY: "auto",
          }}>
            {shareText}
          </div>
        </div>

        {/* Share targets — 3 columns */}
        <div style={{ padding: "8px 22px 22px", borderTop: "1px solid " + C.fawn, background: C.paper }}>
          <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.ash, letterSpacing: "0.12em", textTransform: "uppercase", margin: "16px 0 10px" }}>Share via</p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10 }}>
            {targets.map((t) => (
              <button
                key={t.id}
                onClick={t.action}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  padding: "12px 6px",
                  borderRadius: 14, border: "1px solid " + C.fawn,
                  background: t.bg, cursor: "pointer",
                  transition: "transform 150ms ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <span style={{ fontSize: 22 }}>{t.glyph}</span>
                <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: t.color }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Overview({ onNav, user, sellerItems = null, accessToken = null }) {
  const { isMobile } = useViewport();
  // Drop-cycle wiring. `effectiveNow` honours the simulated date when the dev
  // clock is overridden, so the phase-aware UI reacts to scenario testing.
  const cycle = useDropCycle();
  const now = cycle.effectiveNow || new Date();
  const dropPhase = toSellerOverviewPhase(cycle, now);                 // "between" | "live" | "closing"
  const nextDropAt = nextDropMoment(now);                              // Saturday 8 am
  const dropCloseAt = dropCloseMoment(now);                            // Sunday 8 pm
  const countdownToOpen  = formatCompactCountdown(nextDropAt, now);    // e.g. "2d 14h"
  const countdownToClose = formatCompactCountdown(dropCloseAt, now);   // e.g. "4h 23m"
  const isFreshRecap = dropPhase === "between" && hoursSinceLastDropClose(now) < 30;

  const h = now.getHours();
  const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name ? user.name.split(/\s+/)[0] : "there";

  // Hero counts come from the real seller inventory; demo fallbacks keep
  // the standalone /preview/seller-dashboard route presentable. Active = LIVE
  // (claimable). Excludes DRAFT/ARCHIVED (not listed), CLAIMED/SOLD (the buyer
  // already has them or picked up).
  const usingBackend = Array.isArray(sellerItems);
  const isActiveItem = (i) => i && i.status === "LIVE";
  // BUG-096 — an item queued for the next Drop is stored as DRAFT with
  // `queuedAt` set (see BUG-093); it only flips to LIVE when the Drop opens.
  // These two counts both got that wrong: `queuedCount` required LIVE, so it
  // never saw a queued item at all, and `draftsCount` counted every DRAFT, so
  // the same item was reported on Overview as "1 draft unfinished". `queuedAt`
  // is what separates a real unfinished draft from a committed listing.
  const isQueuedForDrop = (i) => i && i.status === "DRAFT" && !!i.queuedAt;
  const queuedCount = usingBackend
    ? sellerItems.filter(i => (isActiveItem(i) || isQueuedForDrop(i)) && i.placement === "DROP").length
    : 1;
  const shelfCount = usingBackend
    ? sellerItems.filter(i => isActiveItem(i) && i.placement === "SHELF").length
    : 2;
  const draftsCount = usingBackend
    ? sellerItems.filter(i => i && i.status === "DRAFT" && !i.queuedAt).length
    : 1;

  // Bump to force every data-loading useEffect below to re-run. Used by the
  // socket listeners (declared further down beside the main fetch) so a new
  // claim or incoming message refreshes Overview's data in real time. Declared
  // up here so the recap useEffect can reference it as a dependency.
  const [refreshTick, setRefreshTick] = useState(0);

  // Last-Drop recap fetch — powers the "fresh recap" hero face (<30h after
  // close) and the SOLD/EARNED/RETURNED ContextualStats variant.
  const [recapState, setRecapState] = useState(null);
  useEffect(() => {
    if (!accessToken) {
      // Preview / unauthenticated route — keep demo values stable.
      setRecapState({ sold: 5, total: 7, earned: 870, top: "Full Bedroom Set", returnedCount: 0 });
      return;
    }
    let cancelled = false;
    apiRequest("/api/items/recap", { token: accessToken })
      .then((data) => {
        if (cancelled || !data) return;
        setRecapState({
          sold:          data.sold ?? 0,
          total:         data.total ?? 0,
          earned:        data.earned ?? 0,
          top:           data.top || "—",
          returnedCount: data.returnedCount ?? 0,
        });
      })
      .catch(() => {
        // Quietly degrade — the Overview should still render if recap fails.
        if (!cancelled) setRecapState({ sold: 0, total: 0, earned: 0, top: "—", returnedCount: 0 });
      });
    return () => { cancelled = true; };
    // refreshTick is bumped by claim:updated so a fresh pickup refetches the
    // recap immediately — the "Drop wrapped" face stays current.
  }, [accessToken, refreshTick]);
  const lastDropRecap = recapState ?? { sold: 0, total: 0, earned: 0, top: "—", returnedCount: 0 };

  // Live-phase activity metrics. `liveSaves` = sum of watcher counts across
  // the seller's currently-live items (uses the existing `saves` field from
  // the sellerItems adapter, which reads `_count.watchlist` from /api/items).
  // `liveClaims` is populated from the same PROPOSED-claims fetch that powers
  // the Needs Attention strip — see the useEffect below. Real view-event
  // tracking is a separate feature (no `viewCount` column today), so the
  // metric is labelled "saves today" instead of "views today".
  const liveCount = queuedCount + shelfCount;
  const liveSaves = usingBackend
    ? sellerItems
        .filter(i => isActiveItem(i))
        .reduce((sum, i) => sum + (typeof i?.saves === "number" ? i.saves : 0), 0)
    : 0;
  const [livePendingClaims, setLivePendingClaims] = useState(0);

  // ShareSheet open state. (Sell-with-AI opt-in state moved to SettingsView
  // after the teaser was relocated from Overview — BUG-046.)
  const [showShare, setShowShare] = useState(false);
  function handleShare() { setShowShare(true); }

  // Lifetime impact stats (items rehomed, $ earned, lbs diverted). Derived
  // from PICKED_UP claims inside the activity-stream fetch below; no extra
  // request needed.
  const [lifetimeStats, setLifetimeStats] = useState({ rehomed: 0, earned: 0, weight: 0 });

  // One fetch powers all three downstream surfaces:
  //   • PROPOSED claims        → Needs Attention rows + activity feed
  //   • ACCEPTED + PICKED_UP   → activity events
  //   • PICKED_UP             → lifetime impact stats
  //   • Conversations         → message count on the Needs-Attention strip
  const [activityEvents, setActivityEvents] = useState([]);
  // Discrete buckets surfaced by <ActionItems/>: pickups due today, the rest of
  // the week, unread messages from buyers, drafts still to finish.
  const [actionBuckets, setActionBuckets] = useState({ pickupsToday: 0, pickupsWeek: 0, messages: 0 });
  // Socket bumps: a new claim or incoming message bumps refreshTick (declared
  // above the recap useEffect), which re-runs both the recap fetch and the
  // bulk fetch below.
  useSocketEvent("claim:new",     () => setRefreshTick(t => t + 1));
  useSocketEvent("claim:updated", () => setRefreshTick(t => t + 1));
  useSocketEvent("message:new",   () => setRefreshTick(t => t + 1));
  useEffect(() => {
    if (!accessToken) {
      setActionBuckets({ pickupsToday: 1, pickupsWeek: 3, messages: 2 });
      setLivePendingClaims(2);
      setActivityEvents([
        { who: "James K.", what: "is viewing your LG TV",  when: "just now",   tone: "view"  },
        { who: "Sarah M.", what: "saved your Sofa Set",    when: "2m ago",     tone: "save"  },
        { who: "Priya R.", what: "asked about pickup",     when: "8m ago",     tone: "msg"   },
        { who: "Tom W.",   what: "claimed your Bookshelf", when: "14m ago",    tone: "claim" },
      ]);
      setLifetimeStats({ rehomed: 47, earned: 1240, weight: 340 });
      return;
    }
    let cancelled = false;
    Promise.all([
      apiRequest("/api/claims/incoming?status=PROPOSED",   { token: accessToken }).catch(() => ({ claims: [] })),
      apiRequest("/api/claims/incoming?status=ACCEPTED", { token: accessToken }).catch(() => ({ claims: [] })),
      apiRequest("/api/claims/incoming?status=PICKED_UP", { token: accessToken }).catch(() => ({ claims: [] })),
      apiRequest("/api/conversations",                    { token: accessToken }).catch(() => ({ conversations: [] })),
    ]).then(([pendingRes, confirmedRes, pickedRes, convRes]) => {
      if (cancelled) return;

      const pending = Array.isArray(pendingRes?.claims) ? pendingRes.claims : [];
      // LiveHero's "claims pending" badge reads from this — replaces the
      // hardcoded `liveClaims = 2`.
      setLivePendingClaims(pending.length);

      const convs = Array.isArray(convRes?.conversations) ? convRes.conversations : [];
      const mineId = user?.id;
      const buyerWaiting = convs.filter(
        (c) =>
          (c.unread ?? 0) > 0 &&
          c.lastMessage &&
          c.lastMessage.senderId &&
          c.lastMessage.senderId !== mineId,
      );

      // ── Activity feed: merge all claim statuses + unread message events,
      //    sort by most recent event time, take the top 6.
      const events = [];

      pending.forEach((c) => {
        events.push({
          when:  c.requestedAt || c.createdAt,
          who:   c.buyer?.name || "Buyer",
          what:  `claimed your ${c.item?.title || "item"}`,
          tone:  "claim",
        });
      });
      const confirmed = Array.isArray(confirmedRes?.claims) ? confirmedRes.claims : [];
      confirmed.forEach((c) => {
        events.push({
          when:  c.confirmedAt || c.updatedAt || c.createdAt,
          who:   c.buyer?.name || "Buyer",
          what:  `is picking up your ${c.item?.title || "item"}`,
          tone:  "confirmed",
        });
      });

      // ActionItems buckets — pickups today/this-week + messages awaiting.
      // pickupSlot is freeform ("Sat 2pm-4pm" / "Sun 10am-12pm" / a date), so
      // we detect "today" by checking the first whitespace-delimited token
      // against the current day's short name. "This week" = total confirmed.
      const SHORT_DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const todayShort = SHORT_DAYS[new Date().getDay()].toLowerCase();
      const pickupsToday = confirmed.filter((c) => {
        const slot = String(c.pickupSlot || "").trim().toLowerCase();
        return slot.startsWith(todayShort);
      }).length;
      const pickupsWeek = confirmed.length;
      setActionBuckets({
        pickupsToday,
        pickupsWeek,
        messages: buyerWaiting.length,
      });
      const pickedUp = Array.isArray(pickedRes?.claims) ? pickedRes.claims : [];
      pickedUp.forEach((c) => {
        events.push({
          when:  c.completedAt || c.updatedAt || c.createdAt,
          who:   c.buyer?.name || "Buyer",
          what:  `picked up your ${c.item?.title || "item"} for $${c.item?.price ?? 0}`,
          tone:  "soldout",
        });
      });
      // Lifetime impact stats derived from the same picked-up set. Weight
      // estimate is intentionally rough (~5 lb/item averaged across household
      // goods); replace with per-category weights when the catalog ships them.
      const lifetimeRehomed = pickedUp.length;
      const lifetimeEarned = pickedUp.reduce((acc, c) => acc + (c.item?.price ?? 0), 0);
      setLifetimeStats({
        rehomed: lifetimeRehomed,
        earned:  Math.round(lifetimeEarned),
        weight:  Math.round(lifetimeRehomed * 5),
      });
      buyerWaiting.forEach((c) => {
        events.push({
          when:  c.lastMessage?.createdAt || c.lastMessageAt,
          who:   c.buyer?.name || "Buyer",
          what:  `asked about ${c.item?.title || "an item"}`,
          tone:  "msg",
        });
      });

      events.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
      setActivityEvents(
        events.slice(0, 6).map((e) => ({
          who:  e.who,
          what: e.what,
          tone: e.tone,
          when: relativeWhen(e.when),
        })),
      );
    });
    return () => { cancelled = true; };
    // refreshTick is a deliberate dep — socket events bump it so we refetch.
  }, [accessToken, user?.id, refreshTick]);

  return (
    <div className="fade-in" style={{ maxWidth: isMobile ? "100%" : 1080, margin: "0 auto" }}>
      {/* Greeting */}
      <div style={{ paddingTop: isMobile ? 14 : 22, paddingBottom: isMobile ? 10 : 14 }}>
        <h1 style={{ fontFamily: F.head, fontSize: isMobile ? 22 : 30, fontWeight: 900, color: C.ink, letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: 6 }}>
          {greet}, {firstName} <span style={{ display: "inline-block", transform: "translateY(-1px)" }}>{"\u{1F44B}"}</span>
        </h1>
        <p style={{ fontFamily: F.body, fontSize: isMobile ? 13 : 15, fontWeight: 500, color: C.mink, lineHeight: 1.55 }}>
          {dropPhase === "live"    ? "The Drop is live right now — keep an eye on claims and messages." :
           dropPhase === "closing" ? `Last call. The Drop closes in ${countdownToClose}.` :
           isFreshRecap            ? "Drop wrapped. Unsold items are back on the Shelf and still selling." :
                                     `Your next Drop is ${countdownToOpen} away.`}
        </p>
      </div>

      {/* Phase-aware hero */}
      {dropPhase === "between" && (
        <BetweenHero
          now={now}
          countdown={countdownToOpen}
          nextDropAt={nextDropAt}
          queuedCount={queuedCount}
          shelfCount={shelfCount}
          draftsCount={draftsCount}
          recap={lastDropRecap}
          onNav={onNav}
          onShare={handleShare}
        />
      )}
      {dropPhase === "live" && (
        <LiveHero
          countdown={countdownToClose}
          liveCount={liveCount}
          saves={liveSaves}
          claims={livePendingClaims}
          onNav={onNav}
          onShare={handleShare}
        />
      )}
      {dropPhase === "closing" && (
        <ClosingHero
          countdown={countdownToClose}
          unsoldCount={Math.max(0, liveCount - 1)}
          onNav={onNav}
        />
      )}

      {/* Fresh-recap nudge — unsold items rolled back to the Shelf may need a price drop. */}
      {isFreshRecap && lastDropRecap.returnedCount > 0 && (
        <BackOnShelfCard
          items={Array.from({ length: lastDropRecap.returnedCount }, (_, i) => ({
            t: i === 0 && lastDropRecap.top ? lastDropRecap.top : `Item ${i + 1}`,
          }))}
          onNav={onNav}
        />
      )}

      {/* 3-up stat strip — content swaps per drop phase. */}
      <ContextualStats
        dropPhase={dropPhase}
        isFreshRecap={isFreshRecap}
        data={{
          queued:      queuedCount,
          drafts:      draftsCount,
          shelf:       shelfCount,
          views:       liveSaves,
          claims:      livePendingClaims,
          pickupsUp:   actionBuckets.pickupsToday + actionBuckets.pickupsWeek,
          sold:        lastDropRecap.sold,
          unsold:      Math.max(0, liveCount - 1),
          timeLeft:    countdownToClose,
          soldRecap:   lastDropRecap.sold,
          earnedRecap: lastDropRecap.earned,
          returned:    lastDropRecap.returnedCount,
        }}
      />

      {/* Phase-specific contributions strip:
          between → upcoming items (Going Live Preview)
          live / closing → real-time event feed */}
      {dropPhase === "between" && (
        <GoingLivePreview
          items={(() => {
            if (!usingBackend) {
              return [
                { id: 1, e: "\u{1F6CF}️", title: "Full Bedroom Set",    price: 600, layer: "drop", bundleContents: ["Queen bed frame", "Mattress", "2 nightstands", "Dresser"] },
                { id: 2, e: "\u{1F4FA}",       title: "LG 55\" Smart TV",    price: 250, layer: "shelf" },
                { id: 3, e: "\u{1F6CB}️", title: "Sofa Set 3 Seater",   price: 500, layer: "drop"  },
                { id: 4, e: "\u{1F527}",       title: "DeWalt Drill Set",    price: 65,  layer: "drop"  },
              ];
            }
            return sellerItems
              .filter((i) => i && i.status === "LIVE" && (i.placement === "DROP" || i.placement === "SHELF"))
              .slice(0, 8)
              .map((i) => ({
                id:     i.id,
                title:  i.title,
                price:  i.price,
                photos: Array.isArray(i.photos) ? i.photos : [],
                e:      CATEGORY_EMOJI[i.category] || "\u{1F4E6}",
                layer:  i.placement === "DROP" ? "drop" : "shelf",
                bundleContents: Array.isArray(i.bundleContents) && i.isBundle ? i.bundleContents : null,
              }));
          })()}
          onNav={onNav}
        />
      )}
      {(dropPhase === "live" || dropPhase === "closing") && (
        <LiveActivity events={activityEvents} onNav={onNav}/>
      )}

      {/* Sell-with-AI teaser — moved to Settings → Sell with AI (BUG-046). */}

      {/* Needs your attention — discrete metric tiles (v2 ActionItems pattern).
          One tile per category: pickups today, pickups this week, unread
          messages, drafts. Replaces the older per-claim row layout. */}
      <ActionItems
        pickupsToday={actionBuckets.pickupsToday}
        pickupsWeek={actionBuckets.pickupsWeek}
        messages={actionBuckets.messages}
        drafts={draftsCount}
        onNav={onNav}
      />

      {/* Lifetime impact card — links to History. */}
      <ImpactCard
        rehomed={lifetimeStats.rehomed}
        earned={lifetimeStats.earned}
        weight={lifetimeStats.weight}
        onNav={onNav}
      />

      {/* ShareSheet modal — opened from BetweenHero. Items list = real seller
          inventory that's going live (queued for DROP or live on SHELF). */}
      {showShare && (
        <ShareSheet
          items={(() => {
            if (!usingBackend) {
              return [
                { id: 1, t: "Full Bedroom Set",  price: 600, layer: "drop", isBundle: true, bundleContents: ["Queen bed frame", "Mattress", "2 nightstands", "Dresser"]  },
                { id: 2, t: "LG 55\" Smart TV",  price: 250, layer: "shelf" },
                { id: 3, t: "Sofa Set 3 Seater", price: 500, layer: "drop"  },
              ];
            }
            return sellerItems
              .filter((i) => i && i.status === "LIVE" && (i.placement === "DROP" || i.placement === "SHELF"))
              .map((i) => ({
                id:       i.id,
                t:        i.title,
                price:    i.price,
                layer:    i.placement === "DROP" ? "drop" : "shelf",
                isBundle: !!i.isBundle,
                bundleContents: Array.isArray(i.bundleContents) ? i.bundleContents : [],
              }));
          })()}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

// v2-style white card. Standalone stat tile used by ContextualStats.
function BannerStat({ icon: Ic, label, value }) {
  const { isMobile } = useViewport();
  // On mobile, stack vertically so the full card width is available to the
  // label ("ON SHELF", "QUEUED", etc) — the horizontal layout used 40px for
  // the icon + 12px gap + 32px padding, leaving only ~16px in a 100px-wide
  // column, which truncated the label with an ellipsis.
  return (
    <div style={{
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      alignItems: isMobile ? "flex-start" : "center",
      gap: isMobile ? 6 : 12,
      padding: isMobile ? "10px 12px" : "14px 18px 14px 14px",
      borderRadius: 14, background: C.paper,
      border: "1px solid " + C.fawn,
      boxShadow: _SH_XS,
      minWidth: 0,
    }}>
      <div style={{
        width: isMobile ? 28 : 40, height: isMobile ? 28 : 40,
        borderRadius: isMobile ? 8 : 11,
        background: "linear-gradient(135deg, " + C.greenMist + " 0%, " + C.greenMist + "80 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        border: "1px solid " + C.green + "20",
      }}>
        <Ic size={isMobile ? 13 : 18} style={{ color: C.greenDeep }} strokeWidth={2.3}/>
      </div>
      <div style={{ textAlign: "left", minWidth: 0, width: "100%" }}>
        <p style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, color: C.mink, letterSpacing: "0.1em", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: "uppercase" }}>{label}</p>
        <p style={{ fontFamily: F.head, fontSize: isMobile ? 19 : 22, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em", lineHeight: 1, whiteSpace: "nowrap" }}>{value}</p>
      </div>
    </div>
  );
}

// 3-up stat strip whose content depends on phase (between/live/closing). In
// the between+fresh-recap window (~30h post-close) it swaps to last Drop's
// SOLD / EARNED / BACK ON SHELF totals.
function ContextualStats({ dropPhase, isFreshRecap, data }) {
  const { isMobile } = useViewport();
  const freshRecap = [
    { icon: CheckCircle, label: "SOLD",          value: String(data.soldRecap) },
    { icon: DollarSign,  label: "EARNED",        value: "$" + data.earnedRecap },
    { icon: Package,     label: "BACK ON SHELF", value: String(data.returned) },
  ];
  const sets = {
    between: isFreshRecap ? freshRecap : [
      { icon: Box,           label: "QUEUED",   value: String(data.queued) },
      { icon: ClipboardList, label: "DRAFTS",   value: String(data.drafts) },
      { icon: Package,       label: "ON SHELF", value: String(data.shelf)  },
    ],
    live: [
      // Label switched from "VIEWS TODAY" to "WATCHING" — the value is the sum
      // of watcher counts across the seller's live items (BUG-044). There's no
      // view-event tracking yet, so labelling it "views" was misleading.
      { icon: Heart,  label: "WATCHING", value: String(data.views) },
      { icon: Tag,    label: "CLAIMS",   value: String(data.claims) },
      { icon: MapPin, label: "PICKUPS",  value: String(data.pickupsUp) },
    ],
    closing: [
      { icon: CheckCircle, label: "SOLD",      value: String(data.sold) },
      { icon: Package,     label: "UNSOLD",    value: String(data.unsold) },
      { icon: Clock,       label: "TIME LEFT", value: data.timeLeft },
    ],
  };
  const items = sets[dropPhase] || sets.between;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: isMobile ? 8 : 12, marginBottom: 22 }}>
      {items.map((s, i) => (
        <BannerStat key={i} icon={s.icon} label={s.label} value={s.value}/>
      ))}
    </div>
  );
}

function UpgradeToProModal({ onClose, onSuccess }) {
  const { isMobile } = useViewport();
  const [name, setName]     = useState("");
  const [card, setCard]     = useState("");
  const [exp, setExp]       = useState("");
  const [cvc, setCvc]       = useState("");
  const [postal, setPostal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]     = useState(false);

  function fmtCard(v) { return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim(); }
  function fmtExp(v)  { const n = v.replace(/\D/g, "").slice(0, 4); return n.length >= 3 ? n.slice(0, 2) + "/" + n.slice(2) : n; }

  const valid = name.trim().length > 1 && card.replace(/\s/g, "").length === 16 && /^\d{2}\/\d{2}$/.test(exp) && cvc.length >= 3 && postal.trim().length >= 3;

  function handleSubmit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setDone(true); setTimeout(() => { onSuccess(); }, 900); }, 1100);
  }

  if (done) {
    return (
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: isMobile ? 16 : 24, backdropFilter: "blur(4px)" }}>
        <div onClick={e => e.stopPropagation()} className="fade-in" style={{ width: 440, maxWidth: "100%", borderRadius: 24, background: C.paper, padding: isMobile ? 26 : 36, boxShadow: "0 24px 64px rgba(31, 29, 25, 0.2)", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: C.greenMist, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <CheckCircle size={32} style={{ color: C.greenDeep }} strokeWidth={2.4}/>
          </div>
          <h3 style={{ fontFamily: F.head, fontSize: 20, fontWeight: 900, color: C.ink, marginBottom: 8, letterSpacing: "-0.01em" }}>Welcome to Pro!</h3>
          <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.mink, lineHeight: 1.6 }}>Your Pro features are now active. Unlimited AI listings, full negotiation, and priority processing — all yours.</p>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 200, padding: 24, backdropFilter: "blur(4px)", overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} className="fade-in" style={{ width: "100%", maxWidth: 480, borderRadius: 24, background: C.paper, boxShadow: "0 24px 64px rgba(31, 29, 25, 0.2)", overflow: "hidden", marginTop: 40, marginBottom: 40 }}>
        {/* Header — brand violet/AI gradient */}
        <div style={{ padding: "22px 26px", background: "linear-gradient(135deg, " + C.ai + ", #6D28D9)", color: "#fff", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, width: 30, height: 30, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.18)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} style={{ color: "#fff" }}/>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Sparkles size={18} strokeWidth={2.2}/>
            <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.9 }}>Upgrade to Pro</span>
          </div>
          <p style={{ fontFamily: F.head, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 4 }}>$4.99 <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.75 }}>/ month</span></p>
          <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, opacity: 0.85, lineHeight: 1.5 }}>Unlimited AI listings, full buyer negotiation, no-show re-listing, priority processing.</p>
        </div>

        {/* Form body */}
        <div style={{ padding: isMobile ? "18px 16px" : "22px 26px" }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Cardholder name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Alex Anderson" style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.ink, outline: "none", background: C.paper, boxSizing: "border-box" }}/>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Card number</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, background: C.paper }}>
              <CreditCard size={16} style={{ color: C.mink, flexShrink: 0 }}/>
              <input type="text" value={card} onChange={e => setCard(fmtCard(e.target.value))} placeholder="1234 5678 9012 3456" inputMode="numeric" style={{ flex: 1, border: "none", outline: "none", fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.ink, background: "transparent" }}/>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
            <div>
              <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Expires</label>
              <input type="text" value={exp} onChange={e => setExp(fmtExp(e.target.value))} placeholder="MM/YY" inputMode="numeric" style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.ink, outline: "none", background: C.paper, boxSizing: "border-box" }}/>
            </div>
            <div>
              <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>CVC</label>
              <input type="text" value={cvc} onChange={e => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" inputMode="numeric" style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.ink, outline: "none", background: C.paper, boxSizing: "border-box" }}/>
            </div>
            <div>
              <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Postal</label>
              <input type="text" value={postal} onChange={e => setPostal(e.target.value.toUpperCase().slice(0, 7))} placeholder="K2J 6T8" style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.ink, outline: "none", background: C.paper, boxSizing: "border-box" }}/>
            </div>
          </div>

          {/* Lock note */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: C.sand, border: "1px solid " + C.fawn, marginBottom: 18 }}>
            <Lock size={12} style={{ color: C.mink, flexShrink: 0 }}/>
            <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>Encrypted in transit. We never see or store your card details — they're tokenized by our payment processor.</p>
          </div>

          {/* CTA */}
          <button onClick={handleSubmit} disabled={!valid || submitting} className="cta-primary" style={{
            width: "100%", padding: "14px 0", borderRadius: 999, border: "none",
            cursor: !valid || submitting ? "not-allowed" : "pointer",
            fontFamily: F.head, fontSize: 14, fontWeight: 800,
            background: !valid || submitting ? C.smoke : "linear-gradient(135deg, " + C.ai + ", #6D28D9)",
            color: !valid || submitting ? C.ash : "#fff",
            boxShadow: !valid || submitting ? "none" : "0 4px 14px " + C.ai + "40",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          }}>
            {submitting ? (
              <>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #fff", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }}/>
                Processing...
              </>
            ) : (
              <>
                <Lock size={13} strokeWidth={2.5}/> Subscribe for $4.99/month
              </>
            )}
          </button>
          <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
          <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash, marginTop: 10, textAlign: "center", lineHeight: 1.5 }}>By subscribing, you agree to our Terms. Cancel anytime — Pro features remain active until the end of your billing period.</p>
        </div>
      </div>
    </div>
  );
}

function AIPlanView({ aiPlan, aiUsed, onUpgrade, onCancel, onBack }) {
  const isPro = aiPlan === "pro";
  const [showUpgrade, setShowUpgrade] = useState(false);
  const openUpgrade = () => setShowUpgrade(true);
  const handleUpgradeSuccess = () => { setShowUpgrade(false); onUpgrade(); };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.ink, fontFamily: F.head, marginBottom: 4 }}>Settings</h2>
        <p style={{ fontSize: 13, color: C.mink, fontFamily: F.body }}>Manage your DropYard preferences and subscriptions.</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg," + C.ai + ",#6D28D9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={18} style={{ color: "#fff" }} />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: C.ink, fontFamily: F.head }}>AI Agent Plan</p>
          <p style={{ fontSize: 12, color: C.mink, fontFamily: F.body }}>Manage your AI Seller Agent subscription</p>
        </div>
      </div>

      {/* Current plan card */}
      <div style={{ borderRadius: 20, overflow: "hidden", border: isPro ? "2px solid " + C.ai : "2px solid #e2e8f0", marginBottom: 24 }}>
        <div style={{ padding: "20px 24px", background: isPro ? "linear-gradient(135deg," + C.ai + ",#6D28D9)" : "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={20} style={{ color: isPro ? "#fff" : "#94a3b8" }} />
            <div>
              <p style={{ fontSize: 18, fontWeight: 900, color: isPro ? "#fff" : "#0f172a", fontFamily: F.head }}>{isPro ? "Pro Plan" : "Free Plan"}</p>
              <p style={{ fontSize: 12, color: isPro ? "rgba(255,255,255,0.7)" : "#94a3b8", fontFamily: F.body }}>{isPro ? "Unlimited AI listings" : "5 free AI listings per month"}</p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 24, fontWeight: 900, color: isPro ? "#fff" : "#0f172a", fontFamily: F.head }}>{isPro ? "$4.99" : "$0"}</p>
            <p style={{ fontSize: 11, color: isPro ? "rgba(255,255,255,0.7)" : "#94a3b8", fontFamily: F.body }}>/month</p>
          </div>
        </div>
        <div style={{ padding: "20px 24px", background: C.paper }}>
          {!isPro && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", fontFamily: F.body }}>AI Listings Used</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: aiUsed >= 5 ? "#DC2626" : C.ai, fontFamily: F.head }}>{aiUsed} / 5</span>
              </div>
              <div style={{ height: 10, borderRadius: 20, backgroundColor: "#f1f5f9", overflow: "hidden" }}>
                <div style={{ height: "100%", width: (aiUsed / 5 * 100) + "%", backgroundColor: aiUsed >= 5 ? "#DC2626" : aiUsed >= 4 ? C.oPrimary : C.ai, borderRadius: 20, transition: "width 0.4s" }} />
              </div>
              {aiUsed >= 4 && (
                <p style={{ fontSize: 11, color: aiUsed >= 5 ? "#DC2626" : C.oPrimary, marginTop: 6, fontWeight: 600, fontFamily: F.body }}>
                  {aiUsed >= 5 ? "You have reached your free limit. Upgrade to continue using AI." : "Almost at your limit! Consider upgrading."}
                </p>
              )}
            </div>
          )}
          {isPro && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, backgroundColor: C.gLightBg, border: "1px solid " + C.gSoft, marginBottom: 16 }}>
              <CheckCircle size={18} style={{ color: C.gPrimary }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.gDark, fontFamily: F.body }}>Your Pro plan is active</p>
                <p style={{ fontSize: 11, color: C.mink, fontFamily: F.body }}>Next billing date: May 19, 2026 - Visa ending 4242</p>
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            {!isPro && (
              <button disabled aria-disabled="true" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0", borderRadius: 999, border: "none", cursor: "not-allowed", fontSize: 14, fontWeight: 700, fontFamily: F.body, background: C.smoke, color: C.mink, opacity: 0.7 }}>
                <Sparkles size={16} /> Upgrade to Pro - $4.99/mo
              </button>
            )}
            {isPro && (
              <button onClick={onCancel} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e2e8f0", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: F.body, background: C.paper, color: C.ash }}>
                Cancel Subscription
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Plan comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Free */}
        <div style={{ borderRadius: 20, border: !isPro ? "2px solid " + C.ai + "30" : "1px solid #e2e8f0", padding: 24, background: C.paper }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.ink, fontFamily: F.head }}>Free</h3>
            {!isPro && <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 50, backgroundColor: C.aiLight, color: C.ai, fontFamily: F.body }}>CURRENT</span>}
          </div>
          <p style={{ fontSize: 28, fontWeight: 900, color: C.ink, fontFamily: F.head, marginBottom: 16 }}>$0<span style={{ fontSize: 14, fontWeight: 500, color: C.ash }}>/mo</span></p>
          {[
            "5 AI listings per month",
            "Photo-to-listing generation",
            "AI price suggestions",
            "Basic buyer responses",
            "WhatsApp notifications",
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Check size={14} style={{ color: C.gPrimary }} />
              <span style={{ fontSize: 12, color: "#475569", fontFamily: F.body }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Pro */}
        <div style={{ borderRadius: 20, border: isPro ? "2px solid " + C.ai : "2px solid " + C.aiBorder, padding: 24, backgroundColor: isPro ? "#fff" : C.aiLight, position: "relative" }}>
          <div style={{ position: "absolute", top: 12, right: 12, fontSize: 9, fontWeight: 800, padding: "3px 10px", borderRadius: 50, background: "linear-gradient(135deg," + C.ai + ",#6D28D9)", color: "#fff", fontFamily: F.body }}>RECOMMENDED</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.ink, fontFamily: F.head }}>Pro</h3>
            {isPro && <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 50, backgroundColor: C.aiLight, color: C.ai, fontFamily: F.body }}>CURRENT</span>}
          </div>
          <p style={{ fontSize: 28, fontWeight: 900, color: C.ai, fontFamily: F.head, marginBottom: 16 }}>$4.99<span style={{ fontSize: 14, fontWeight: 500, color: C.ash }}>/mo</span></p>
          {[
            "Unlimited AI listings",
            "Everything in Free, plus:",
            "Full buyer negotiation",
            "Counter-offer automation",
            "No-show re-listing",
            "Price drop suggestions",
            "Priority AI processing",
                      ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {i === 1 ? <span style={{ width: 14 }} /> : <Check size={14} style={{ color: C.ai }} />}
              <span style={{ fontSize: 12, color: i === 1 ? "#94a3b8" : "#475569", fontWeight: i === 1 ? 600 : 400, fontStyle: i === 1 ? "italic" : "normal", fontFamily: F.body }}>{f}</span>
            </div>
          ))}
          {!isPro && (
            <button disabled aria-disabled="true" style={{ width: "100%", marginTop: 12, padding: "12px 0", borderRadius: 999, border: "none", cursor: "not-allowed", fontSize: 14, fontWeight: 700, fontFamily: F.body, background: C.smoke, color: C.mink, opacity: 0.7 }}>
              Upgrade Now
            </button>
          )}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginTop: 24, padding: 20, borderRadius: 16, border: "1px solid " + C.fawn, background: C.paper }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 14, fontFamily: F.head }}>Common Questions</h3>
        {(() => {
          const faqs = [
            { q: "What counts as an AI listing?", a: "Each time AI generates a listing from a photo, it uses one credit. Editing an existing AI listing does not use a credit." },
            { q: "Can I cancel anytime?", a: "Yes. Cancel anytime from this page. Your Pro features remain active until the end of your billing period." },
            { q: "When do my free credits reset?", a: "Free credits reset on the 1st of every calendar month. Unused credits don't roll over." },
            { q: "Are AI-drafted listings visible to buyers as AI-generated?", a: "Buyers don't see an \u201CAI\u201D label, but every AI-drafted listing is reviewed by you before going live. You're always the seller of record." },
            { q: "Does the AI agent reply to buyers automatically?", a: "Yes — within the rules you set. AI responds to questions using your item details, accepts offers at or above your floor, and counters lower offers. Anything sensitive or uncertain is sent to you for review." },
            { q: "What happens if the AI gets something wrong?", a: "You can override any AI decision from the Messages view. Your AI agent learns from your edits over time so similar mistakes happen less often." },
            { q: "Is my payment information secure?", a: "Card details are encrypted in transit and tokenized by our payment processor. We never see or store your full card number." },
            { q: "Can I switch between Free and Pro?", a: "Yes. Upgrade anytime to unlock unlimited listings. Downgrade anytime — your Pro features stay active until the end of your current billing cycle." },
          ];
          return faqs.map((faq, i) => (
            <div key={i} style={{ padding: "12px 0", borderBottom: i < faqs.length - 1 ? "1px solid " + C.fawn : "none" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.ink, fontFamily: F.body }}>{faq.q}</p>
              <p style={{ fontSize: 12, color: C.mink, lineHeight: 1.6, marginTop: 4, fontFamily: F.body }}>{faq.a}</p>
            </div>
          ));
        })()}
      </div>

      {showUpgrade && <UpgradeToProModal onClose={() => setShowUpgrade(false)} onSuccess={handleUpgradeSuccess}/>}
    </div>
  );
}

/* ============================== AI SETUP ============================== */
function AISetup({ onComplete, onBack, settings, onSave }) {
  const [priceFloor, setPriceFloor] = useState(settings.priceFloor || 80);
  const [autoAccept, setAutoAccept] = useState(settings.autoAccept !== false);
  const [style, setStyle] = useState(settings.style || "friendly");
  // Pickup availability — same shape as ManualItemForm, representing seller's standing availability
  const [pickupMode, setPickupMode] = useState(settings.pickupMode || "flexible");
  const [pickupDays, setPickupDays] = useState(settings.pickupDays || ["Sat", "Sun"]);
  const [pickupCustom, setPickupCustom] = useState(settings.pickupCustom || []);
  const [pickupNewDate, setPickupNewDate] = useState("");
  const [pickupDateError, setPickupDateError] = useState("");
  const [pickupWindows, setPickupWindows] = useState(settings.pickupWindows || ["morning", "afternoon"]);
  const [waNotif, setWaNotif] = useState(settings.waNotif !== false);
  const [waPhone, setWaPhone] = useState(settings.waPhone || "");
  const [paymentMethod, setPaymentMethod] = useState(settings.paymentMethod || "either");

  function togDay(d) { setPickupDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]); }
  function togWin(w) { setPickupWindows(p => p.includes(w) ? p.filter(x => x !== w) : [...p, w]); }
  // BUG-095 — reject past dates. The input's min attribute blocks the picker, but
  // a typed/pasted value still reaches here, so this is the real client guard.
  function addPickupDate() {
    if (!pickupNewDate) return;
    if (isPastISODate(pickupNewDate)) {
      setPickupDateError("Pick-up dates can't be in the past.");
      return;
    }
    setPickupDateError("");
    if (!pickupCustom.includes(pickupNewDate)) {
      setPickupCustom(p => [...p, pickupNewDate]);
    }
    setPickupNewDate("");
  }

  function handleSave() {
    onSave({ priceFloor, autoAccept, style, pickupMode, pickupDays, pickupCustom, pickupWindows, waNotif, waPhone, paymentMethod });
    onComplete();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: C.paper, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#777", fontFamily: F.body }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 50, backgroundColor: C.aiLight, border: "1px solid " + C.aiBorder }}>
          <Sparkles size={14} style={{ color: C.ai }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: C.ai, fontFamily: F.body }}>AI Seller Agent Setup</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div style={{ padding: 20, borderRadius: 16, marginBottom: 16, background: "linear-gradient(135deg," + C.aiLight + ",#EDE9FE)", border: "1px solid " + C.aiBorder }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg," + C.ai + ",#6D28D9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={18} style={{ color: "#fff" }} />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: C.gDark, fontFamily: F.head }}>Set up your AI agent</p>
                <p style={{ fontSize: 11, color: "#888", fontFamily: F.body }}>These become your defaults. Override per-drop anytime.</p>
              </div>
            </div>
          </div>
          <div style={{ padding: 20, borderRadius: 18, border: "1.5px solid " + C.fawn, background: C.paper, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
              <Shield size={16} style={{ color: C.green, flexShrink: 0, marginTop: 2 }}/>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink }}>Price floor</p>
                  <div style={{ padding: "5px 14px", borderRadius: 10, background: C.greenMist, border: "1px solid " + C.green + "25" }}>
                    <span style={{ fontFamily: F.head, fontSize: 20, fontWeight: 900, color: C.greenDeep }}>{priceFloor}%</span>
                  </div>
                </div>
                <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, marginTop: 4, lineHeight: 1.5 }}>The lowest your AI agent will accept as a % of each listed price. Applies to every AI listing unless you override it on a specific item.</p>
              </div>
            </div>
            <input type="range" min="50" max="100" value={priceFloor} onChange={e => setPriceFloor(Number(e.target.value))} style={{ width: "100%", height: 6, borderRadius: 20, cursor: "pointer", accentColor: C.green }}/>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: C.ash }}>50% · flexible</span>
              <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: C.ash }}>100% · firm</span>
            </div>
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: C.sand, border: "1px solid " + C.fawn, display: "flex", alignItems: "center", gap: 8 }}>
              <Info size={13} style={{ color: C.mink, flexShrink: 0 }}/>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>Example: a $40 listing at {priceFloor}% → AI accepts offers of <b style={{ color: C.ink }}>${Math.round(40 * priceFloor / 100)}</b> or more.</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, border: "1.5px solid " + (autoAccept ? C.gPrimary + "40" : "#e5e7eb"), backgroundColor: autoAccept ? C.gLightBg : "#fff" }}>
            <Zap size={18} style={{ color: autoAccept ? C.gPrimary : "#999" }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.gDark, fontFamily: F.body }}>Auto-Accept Full Price</p>
              <p style={{ fontSize: 11, color: C.ash, fontFamily: F.body }}>Full price claims accepted instantly</p>
            </div>
            <button onClick={() => setAutoAccept(!autoAccept)} style={{ width: 48, height: 28, borderRadius: 20, padding: 2, border: "none", cursor: "pointer", backgroundColor: autoAccept ? C.gPrimary : "#D1D5DB" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.paper, boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transform: autoAccept ? "translateX(20px)" : "translateX(0)", transition: "transform 0.2s" }} />
            </button>
          </div>
        </div>
        <div>
          <div style={{ padding: 20, borderRadius: 18, border: "1.5px solid " + C.fawn, background: C.paper, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
              <MapPin size={16} style={{ color: C.green, flexShrink: 0, marginTop: 2 }}/>
              <div>
                <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink }}>Pickup Availability</p>
                <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink }}>When can buyers usually collect from you? Your AI agent will use this to schedule pickups.</p>
              </div>
            </div>

            {/* Mode selector */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14, marginTop: 14 }}>
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

            {/* Recurring days */}
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

            {/* Custom dates */}
            {pickupMode === "custom" && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  <input type="date" min={todayLocalISO()} value={pickupNewDate} onChange={e => { setPickupNewDate(e.target.value); if (pickupDateError) setPickupDateError(""); }}
                    style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.fawn, fontSize: 12, fontFamily: F.body, outline: "none", color: C.ink, background: C.paper }}/>
                  <button onClick={addPickupDate}
                    style={{ padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, background: C.green, color: "#fff", fontFamily: F.head, display: "flex", alignItems: "center", gap: 4, boxShadow: "0 2px 0 " + C.greenDeep }}>
                    <Plus size={12} strokeWidth={2.5}/> Add
                  </button>
                </div>
                {pickupCustom.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {pickupCustom.map(d => (
                      <div key={d} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, background: C.greenMist, border: "1px solid " + C.green + "25" }}>
                        <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 700, color: C.greenDeep }}>{formatPickupDateLong(d)}</span>
                        <button onClick={() => setPickupCustom(p => p.filter(x => x !== d))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                          <X size={11} style={{ color: C.greenDeep }}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {pickupDateError && (
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.claret }}>{pickupDateError}</p>
                )}
                {pickupCustom.length === 0 && !pickupDateError && (
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, fontStyle: "italic" }}>Add one or more specific dates when you&apos;ll be available.</p>
                )}
              </div>
            )}

            {/* Any day */}
            {pickupMode === "anytime" && (
              <div style={{ padding: "10px 12px", borderRadius: 10, background: C.sand, border: "1px solid " + C.fawn, marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 8 }}>
                <Info size={13} style={{ color: C.mink, flexShrink: 0, marginTop: 1 }}/>
                <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>Buyers can request any day. Your AI agent will confirm with you via WhatsApp before scheduling.</p>
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
          <div style={{ padding: 20, borderRadius: 16, border: "1px solid " + C.fawn, background: C.paper, marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.gDark, marginBottom: 12, fontFamily: F.head }}>Communication Style</p>
            {[
              { id: "friendly", l: "Friendly Neighbour", d: "Hi! Thanks for your interest!", e: "\u{1F60A}" },
              { id: "professional", l: "Professional", d: "Thank you for your inquiry.", e: "\u{1F4BC}" },
              { id: "brief", l: "Quick and Brief", d: "Available. $20. Saturday 2pm?", e: "\u{26A1}" },
            ].map(s => (
              <button key={s.id} onClick={() => setStyle(s.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, border: "2px solid " + (style === s.id ? C.gPrimary : "#f0f0f0"), backgroundColor: style === s.id ? C.gLightBg : "#fff", marginBottom: 8, textAlign: "left", cursor: "pointer" }}>
                <span style={{ fontSize: 20 }}>{s.e}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: C.gDark, fontFamily: F.body }}>{s.l}</p>
                  <p style={{ fontSize: 10, color: C.ash, fontStyle: "italic", fontFamily: F.body }}>{s.d}</p>
                </div>
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid " + (style === s.id ? C.gPrimary : "#D1D5DB"), display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {style === s.id && <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: C.gPrimary }} />}
                </div>
              </button>
            ))}
          </div>

          {/* WhatsApp notifications — escalation channel for the seller */}
          <div style={{ padding: 20, borderRadius: 18, border: "1.5px solid " + (waNotif ? C.wa + "40" : C.fawn), background: waNotif ? "#F0FFF4" : C.paper }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: waNotif ? C.wa : C.sand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MessageCircle size={18} style={{ color: waNotif ? "#fff" : C.mink }}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                  <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink }}>WhatsApp notifications</p>
                  <button onClick={() => setWaNotif(!waNotif)} style={{ width: 46, height: 26, borderRadius: 999, padding: 2, border: "none", cursor: "pointer", background: waNotif ? C.wa : C.smoke, transition: "background 150ms", flexShrink: 0 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transform: waNotif ? "translateX(20px)" : "translateX(0)", transition: "transform 200ms" }}/>
                  </button>
                </div>
                <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5, marginBottom: waNotif ? 14 : 0 }}>Get a WhatsApp ping when the AI escalates — counter offers, uncertain questions, pickup confirmations.</p>

                {waNotif && (
                  <div className="fade-in">
                    <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Your WhatsApp number</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, background: C.paper }}>
                      <Phone size={14} style={{ color: C.mink, flexShrink: 0 }}/>
                      <input type="tel" value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder="+1 613 555 0198" style={{ flex: 1, border: "none", outline: "none", fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink, background: "transparent" }}/>
                    </div>
                    <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
                      <Info size={10}/> Only used for escalations. Buyers don't see this number.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment method — global seller preference */}
          <div style={{ marginTop: 16, padding: 20, borderRadius: 18, border: "1.5px solid " + C.fawn, background: C.paper }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: C.sand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <DollarSign size={18} style={{ color: C.mink }}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink }}>Payment method</p>
                <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>How you prefer to be paid at pickup. Shown to buyers on the listing and when they claim. You can override for a specific item.</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {[
                { id: "cash",      label: "Cash only",         icon: DollarSign },
                { id: "etransfer", label: "e-Transfer only",   icon: Banknote   },
                { id: "either",    label: "Cash or e-Transfer", icon: Check      },
              ].map(p => {
                const on = paymentMethod === p.id;
                const Ic = p.icon;
                return (
                  <button key={p.id} onClick={() => setPaymentMethod(p.id)}
                    style={{ flex: 1, padding: "11px 8px", borderRadius: 12, border: "1.5px solid " + (on ? C.green : C.fawn), cursor: "pointer", background: on ? C.greenMist : C.paper, color: on ? C.greenDeep : C.mink, fontFamily: F.head, fontSize: 12, fontWeight: on ? 800 : 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all 150ms" }}>
                    <Ic size={16}/>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 14, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: F.body, background: "linear-gradient(135deg," + C.ai + ",#6D28D9)", color: "#fff" }}>
          Save Settings and Start Listing <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ============================== ADD ITEMS CHOOSER ============================== */
function AddItemsChooser({ onManual, onAI, onBack }) {
  const { isMobile } = useViewport();
  return (
    <div className="fade-in" style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "20px 4px" : "40px 20px" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, border: "none", background: "none", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.mink, marginBottom: 24, padding: 0 }}>
        <ArrowLeft size={15}/> Back
      </button>

      <div style={{ textAlign: "center", marginBottom: isMobile ? 22 : 32 }}>
        <h1 style={{ fontFamily: F.head, fontSize: isMobile ? 24 : 32, fontWeight: 900, color: C.ink, letterSpacing: "-0.025em", marginBottom: 10 }}>How would you like to list?</h1>
        <p style={{ fontFamily: F.body, fontSize: isMobile ? 13 : 15, fontWeight: 500, color: C.mink, lineHeight: 1.55 }}>Pick the route that fits your style. Both land in the same place.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <button onClick={onAI} className="cta-primary" style={{
          padding: "26px 22px", borderRadius: 22,
          border: "2px solid " + C.ai + "30",
          background: "linear-gradient(135deg, " + C.aiMist + ", " + C.paper + ")",
          cursor: "pointer", textAlign: "left",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: C.ai + "15" }}/>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, " + C.ai + ", #6D28D9)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: "0 4px 14px " + C.ai + "40", position: "relative" }}>
            <Sparkles size={24} style={{ color: "#fff" }}/>
          </div>
          <p style={{ fontFamily: F.head, fontSize: 17, fontWeight: 900, color: C.ink, marginBottom: 6, letterSpacing: "-0.015em" }}>Sell with AI</p>
          <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.mink, lineHeight: 1.55, marginBottom: 12 }}>Snap a photo, AI writes the title, description, and suggests a price. Handles buyer Q&A automatically.</p>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.head, fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: C.ai, color: "#fff" }}>
            <Sparkles size={11}/> 5 free per month
          </span>
        </button>

        <button onClick={onManual} className="cta-primary" style={{
          padding: "26px 22px", borderRadius: 22,
          border: "2px solid " + C.fawn,
          background: C.paper,
          cursor: "pointer", textAlign: "left",
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: C.greenMist, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: "0 4px 14px " + C.green + "25" }}>
            <Upload size={24} style={{ color: C.greenDeep }} strokeWidth={2.2}/>
          </div>
          <p style={{ fontFamily: F.head, fontSize: 17, fontWeight: 900, color: C.ink, marginBottom: 6, letterSpacing: "-0.015em" }}>Write it yourself</p>
          <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.mink, lineHeight: 1.55, marginBottom: 12 }}>Full control over title, description, and price. Faster if you know what you're selling.</p>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.head, fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: C.sand, color: C.mink, border: "1px solid " + C.fawn }}>
            <Check size={11}/> Always free
          </span>
        </button>
      </div>
    </div>
  );
}

/** SSR-safe live countdown to next drop open. "" on first render, then ticks
 *  per minute. Used inside ManualItemForm's "Next Drop ... away" pill below. */
function useDropOpenCountdownString() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return now ? formatCompactCountdown(nextDropMoment(now), now) : "";
}

function ManualItemForm({ onDone, onBack, onGoToItems, onGoToSettings = null, onEnhanceAI, aiSettings = {}, accessToken = null, onItemCreated = null }) {
  const dropOpenCountdown = useDropOpenCountdownString();
  const { isMobile } = useViewport();
  // Drop-cycle awareness for the "When should this go live?" block. During a
  // LIVE Drop the two publish paths change meaning: "queue for next" becomes
  // "list into the Drop that's running right now", and the Shelf path is closed
  // (an item listed to the Shelf mid-Drop would sit outside the event traffic).
  // Same phase source the Overview + MyItems use — see MyItemsView line ~4120.
  const dropCycle = useDropCycle();
  const dropNow = dropCycle.effectiveNow || new Date();
  const dropIsLive = toSellerOverviewPhase(dropCycle, dropNow) !== "between";

  // BUG-084 — real count of OTHER sellers in this Drop, replacing a hardcoded
  // "90+". `otherSellerCount` already excludes the caller (the backend derives
  // it from the authed viewer), so a seller who already has items queued isn't
  // counted among their own "other sellers".
  // null = not loaded / request failed → the copy simply omits the clause
  // rather than flashing a placeholder number.
  const [otherSellers, setOtherSellers] = useState(null);
  useEffect(() => {
    let cancelled = false;
    apiRequest("/api/drop/current", accessToken ? { token: accessToken } : {})
      .then((r) => {
        if (cancelled) return;
        const n = typeof r?.otherSellerCount === "number" ? r.otherSellerCount : null;
        setOtherSellers(n);
      })
      .catch(() => { if (!cancelled) setOtherSellers(null); });
    return () => { cancelled = true; };
  }, [accessToken]);

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
  const [pickupDateError, setPickupDateError] = useState("");
  const [pickupWindows, setPickupWindows] = useState(["morning", "afternoon"]);

  function togDay(d) { setPickupDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]); }
  function togWin(w) { setPickupWindows(p => p.includes(w) ? p.filter(x => x !== w) : [...p, w]); }
  // BUG-095 — reject past dates. The input's min attribute blocks the picker, but
  // a typed/pasted value still reaches here, so this is the real client guard.
  function addPickupDate() {
    if (!pickupNewDate) return;
    if (isPastISODate(pickupNewDate)) {
      setPickupDateError("Pick-up dates can't be in the past.");
      return;
    }
    setPickupDateError("");
    if (!pickupCustom.includes(pickupNewDate)) {
      setPickupCustom(p => [...p, pickupNewDate]);
    }
    setPickupNewDate("");
  }
  // photos: array of { id, key, preview, uploading? } - key is the S3 key from /api/uploads/s3,
  // preview is the publicUrl for inline display, uploading is true while the request is in-flight.
  const [photos, setPhotos] = useState([]);
  const [saved, setSaved] = useState(null);
  const [publishWhen, setPublishWhen] = useState("drop"); // "drop" (queue for next Drop) | "shelf" (list now)
  // If the Drop goes LIVE while the form is open with Shelf selected, snap the
  // selection back to the Drop path so the seller can't submit a now-invalid
  // placement. Guards the case where the phase flips mid-composition.
  useEffect(() => {
    if (dropIsLive && publishWhen === "shelf") setPublishWhen("drop");
  }, [dropIsLive, publishWhen]);
  const [paymentMethod, setPaymentMethod] = useState(aiSettings.paymentMethod || "either");
  const [showPayment, setShowPayment] = useState(false);

  // Bundle state — let the seller mark this listing as a bundle (multiple
  // items sold together) and optionally enumerate what's included.
  const [showBundle, setShowBundle] = useState(false);
  const [isBundle, setIsBundle] = useState(false);
  const [bundleContents, setBundleContents] = useState([""]);
  function updateBundleLine(i, v) {
    setBundleContents(prev => prev.map((x, idx) => idx === i ? v : x));
  }
  function addBundleLine() {
    setBundleContents(prev => prev.length >= 20 ? prev : [...prev, ""]);
  }
  function removeBundleLine(i) {
    setBundleContents(prev => prev.length <= 1 ? [""] : prev.filter((_, idx) => idx !== i));
  }

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const fileInputRef = useRef(null);

  const MAX_PHOTOS = 5; // backend cap from createItemSchema

  /** Open the hidden file input. Called by the dropzone and the "Add" tile. */
  function openFilePicker() {
    if (submitting) return;
    fileInputRef.current && fileInputRef.current.click();
  }

  /** Handle file selection - upload each file to S3 and append to photos. */
  async function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-selecting the same file later
    if (files.length === 0) return;
    setSubmitError(null);

    for (const file of files) {
      if (photos.length + 1 > MAX_PHOTOS) {
        setSubmitError("You can upload up to " + MAX_PHOTOS + " photos.");
        break;
      }
      // Optimistic placeholder while upload runs
      const tempId = "tmp-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
      const localPreview = URL.createObjectURL(file);
      setPhotos(prev => [...prev, { id: tempId, key: null, preview: localPreview, uploading: true }]);
      try {
        const { key, publicUrl } = await uploadItemPhoto(file);
        setPhotos(prev => prev.map(p => p.id === tempId ? { id: key, key, preview: publicUrl, uploading: false } : p));
      } catch (err) {
        setPhotos(prev => prev.filter(p => p.id !== tempId));
        URL.revokeObjectURL(localPreview);
        setSubmitError(err && err.message ? err.message : "Photo upload failed. Please try again.");
      }
    }
  }

  function removePhoto(id) {
    setPhotos(prev => {
      const target = prev.find(p => p.id === id);
      if (target && target.preview && target.preview.startsWith("blob:")) URL.revokeObjectURL(target.preview);
      return prev.filter(p => p.id !== id);
    });
  }
  // Reorder helpers — first photo is the cover. Identical implementation in
  // EditItemView; duplicated rather than extracted to keep this PR's blast
  // radius small.
  function movePhoto(idx, delta) {
    setPhotos(prev => {
      const next = idx + delta;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  }
  function setAsCover(idx) {
    setPhotos(prev => {
      if (idx <= 0 || idx >= prev.length) return prev;
      const copy = [...prev];
      const [target] = copy.splice(idx, 1);
      copy.unshift(target);
      return copy;
    });
  }

  /**
   * Submit the listing.
   * `action` is one of "draft" | "drop" | "shelf".
   *
   * BUG-093 — this used to be cosmetic: all three sent identical payloads and
   * the backend defaulted everything to DRAFT, so "Queue for Saturday's Drop"
   * produced an item labelled "Draft" that the seller had to publish a SECOND
   * time. `publish` now carries the intent:
   *   draft → publish:false  → private draft, not auto-promoted on Saturday
   *   drop  → publish:true   → DRAFT + queuedAt, shows as "Queued", auto-goes
   *                            live when the Drop opens
   *   shelf → publish:true   → LIVE immediately
   */
  async function handleSubmit(action) {
    if (submitting) return;
    setSubmitError(null);

    // Client-side validation matching backend Zod rules
    if (!title || title.trim().length < 2) return setSubmitError("Title must be at least 2 characters.");
    if (!desc || desc.trim().length < 10) return setSubmitError("Description must be at least 10 characters.");
    if (!cat) return setSubmitError("Pick a category.");
    if (!cond) return setSubmitError("Pick a condition.");
    // Accept 0 — sellers list "Free pile" giveaways at $0. The empty-string
    // case still needs to be caught, so we parse explicitly first.
    const numericPrice = parseFloat(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) return setSubmitError("Enter a price (0 for a free giveaway).");
    if (numericPrice > 100000) return setSubmitError("Price seems too high — double-check the value.");
    if (photos.some(p => p.uploading)) return setSubmitError("Wait for photos to finish uploading.");

    const photoKeys = photos.map(p => p.key).filter(Boolean);

    setSubmitting(true);
    try {
      // Pickup fields are only sent when the seller actually expanded that
      // section (showPickup) - otherwise the backend keeps schema defaults.
      // For "save as draft" the action is "draft" but placement still reflects
      // the seller's choice (DROP or SHELF) so it's preserved if they later
      // promote the draft.
      const pickupPayload = showPickup
        ? {
            pickupMode,
            pickupDays:        pickupDays,
            pickupCustomDates: pickupCustom,
            pickupWindows:     pickupWindows,
          }
        : {};

      const cleanedBundle = bundleContents.map(s => s.trim()).filter(Boolean).slice(0, 20);
      const bundlePayload = isBundle ? {
        isBundle: true,
        bundleCount: cleanedBundle.length || 2,
        bundleContents: cleanedBundle,
      } : {};

      await apiRequest("/api/items", {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          title:         title.trim(),
          description:   desc.trim(),
          category:      CATEGORY_TO_ENUM[cat] || "OTHER",
          condition:     CONDITION_TO_ENUM[cond] || "GOOD",
          price:         numericPrice,
          photos:        photoKeys.length > 0 ? photoKeys : undefined,
          isMovingSale:  false,
          paymentMethod: PAYMENT_TO_ENUM[paymentMethod] || "EITHER",
          placement:     PLACEMENT_TO_ENUM[publishWhen] || "DROP",
          // "Save as draft" keeps it private; the two publish buttons commit it.
          publish:       action !== "draft",
          ...pickupPayload,
          ...bundlePayload,
        }),
      });
      // Tell parent so My Items can refresh
      if (typeof onItemCreated === "function") {
        try { await onItemCreated(); } catch { /* non-fatal */ }
      }
      setSaved(action);
    } catch (err) {
      setSubmitError(err && err.message ? err.message : "Could not save the item. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Wipe every field back to its initial value. The success screen is rendered
   * by the same component instance as the form, so nothing unmounts after a
   * publish — without this, "List Another Item" put the seller back in front of
   * the listing they just published and made them clear it by hand.
   * Keep in sync with the useState initialisers above.
   */
  function resetForm() {
    setTitle("");
    setDesc("");
    setCat("");
    setCond("");
    setPrice("");
    setPhotos([]);
    setShowPickup(false);
    setPickupMode("flexible");
    setPickupDays([]);
    setPickupCustom([]);
    setPickupNewDate("");
    setPickupDateError("");
    setPickupWindows(["morning", "afternoon"]);
    setShowPayment(false);
    setPaymentMethod(aiSettings.paymentMethod || "either");
    setShowBundle(false);
    setIsBundle(false);
    setBundleContents([""]);
    setSubmitError(null);
    // Placement resets to the Drop path; the dropIsLive effect above corrects
    // it if the phase makes Shelf invalid.
    setPublishWhen("drop");
    setSaved(null);
  }

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
            <button onClick={resetForm} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 20px", borderRadius: 50, border: "1.5px solid #e2e8f0", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: F.body, background: C.paper, color: C.mink }}>
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: C.ink, fontFamily: F.head }}>List New Item</h2>
        {/* BUG-097 — "Enhance with AI" removed until the AI feature ships. It
            navigated to the AIPhotoFlow / AISetup wizard, which advertises a
            "5 free/mo" allowance and generates listings that nothing backs.
            Same reasoning as the de-activated Sell-with-AI CTA on the buyer
            side. The `onEnhanceAI` prop is still passed by the dashboard root,
            so restoring this is re-adding the button — nothing else to rewire. */}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.4fr", gap: isMobile ? 16 : 20 }}>
        {/* Left: Media upload */}
        <div>
          {/* Main photo dropzone */}
          <div style={{ padding: isMobile ? 16 : 20, borderRadius: 16, border: "1px solid " + C.fawn, background: C.paper, marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 10, fontFamily: F.body }}>Photos *</label>
            {/* Hidden real file input - triggered by dropzone and Add tile */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <div onClick={openFilePicker}
              style={{ height: 180, borderRadius: 14, border: "2px dashed #d1d5db", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: submitting ? "not-allowed" : "pointer", background: C.sand, transition: "all 0.2s", opacity: submitting ? 0.6 : 1 }}
              onMouseEnter={e => { if (!submitting) { e.currentTarget.style.borderColor = C.gPrimary; e.currentTarget.style.backgroundColor = C.gLightBg; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.backgroundColor = "#fafafa"; }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.gLightBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Camera size={24} style={{ color: C.gPrimary }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.ink, fontFamily: F.body }}>Drop photos here or click to upload</p>
              <p style={{ fontSize: 11, color: C.ash, fontFamily: F.body }}>JPG, PNG up to 10MB each &middot; max {MAX_PHOTOS} photos</p>
            </div>

            {/* Photo thumbnails */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {photos.map((p, idx) => (
                <div key={p.id} style={{ width: 88, height: 88, borderRadius: 12, border: "1.5px solid " + (idx === 0 ? C.amber : C.gPrimary + "30"), backgroundColor: C.gLightBg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                  {p.preview ? (
                    <img src={p.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: p.uploading ? 0.5 : 1 }}/>
                  ) : (
                    <Camera size={20} style={{ color: C.gPrimary }}/>
                  )}
                  {p.uploading && (
                    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.gPrimary, fontFamily: F.body, background: "rgba(255,255,255,0.6)" }}>
                      Uploading…
                    </span>
                  )}
                  {!p.uploading && idx === 0 && (
                    <span style={{ position: "absolute", top: 4, left: 4, padding: "2px 6px", borderRadius: 999, background: C.amber, color: "#fff", fontFamily: F.head, fontSize: 9, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      Cover
                    </span>
                  )}
                  {!p.uploading && (
                    <button onClick={() => removePhoto(p.id)} aria-label="Remove photo"
                      style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", backgroundColor: "#EF4444", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                      <X size={8} style={{ color: "#fff" }} />
                    </button>
                  )}
                  {!p.uploading && photos.length > 1 && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 4px", background: "rgba(31,29,25,0.55)" }}>
                      <button onClick={() => movePhoto(idx, -1)} disabled={idx === 0} aria-label="Move left"
                        style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: idx === 0 ? "transparent" : "rgba(255,255,255,0.18)", color: "#fff", cursor: idx === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, opacity: idx === 0 ? 0.4 : 1 }}>
                        <ChevronLeft size={11}/>
                      </button>
                      {idx !== 0 ? (
                        <button onClick={() => setAsCover(idx)} aria-label="Set as cover" title="Set as cover"
                          style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: "rgba(240,144,0,0.85)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                          <Star size={10} strokeWidth={2.4}/>
                        </button>
                      ) : <span style={{ width: 18, height: 18 }}/>}
                      <button onClick={() => movePhoto(idx, +1)} disabled={idx === photos.length - 1} aria-label="Move right"
                        style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: idx === photos.length - 1 ? "transparent" : "rgba(255,255,255,0.18)", color: "#fff", cursor: idx === photos.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, opacity: idx === photos.length - 1 ? 0.4 : 1 }}>
                        <ChevronRight size={11}/>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button onClick={openFilePicker} disabled={submitting}
                  style={{ width: 88, height: 88, borderRadius: 12, border: "2px dashed #d1d5db", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: submitting ? "not-allowed" : "pointer", background: C.paper, gap: 2 }}>
                  <Plus size={16} style={{ color: C.smoke }} />
                  <span style={{ fontSize: 8, color: C.smoke, fontFamily: F.body }}>Add</span>
                </button>
              )}
            </div>
            <p style={{ fontSize: 10, color: C.ash, marginTop: 8, fontFamily: F.body }}>The Cover photo is the first one buyers see. Use the arrows to reorder, or the star to promote. Up to {MAX_PHOTOS} photos.</p>
          </div>

          {/* Video upload — Coming soon. Photos are enough for the first
              wave; video adds storage + transcoding cost we're not paying
              for yet. The slot stays visible (with a "Coming soon" pill)
              so sellers know it's planned. To re-enable, restore the
              previous interactive block from git history at this path
              and remove this disabled card. */}
          <div style={{ padding: 16, borderRadius: 16, border: "1px solid " + C.fawn, background: C.paper, opacity: 0.75 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", fontFamily: F.body }}>Short Video</label>
              <span style={{ fontSize: 9, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: C.amberMist, color: C.amberDeep, fontFamily: F.head, letterSpacing: "0.06em", textTransform: "uppercase" }}>Coming soon</span>
            </div>
            <div style={{ height: 80, borderRadius: 12, border: "2px dashed " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: C.sand, cursor: "not-allowed" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.fawn, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Upload size={16} style={{ color: C.ash }} />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.mink, fontFamily: F.body }}>Video uploads aren&rsquo;t live yet</p>
                <p style={{ fontSize: 10, color: C.ash, fontFamily: F.body }}>Photos are enough for now — we&rsquo;ll add MP4/MOV support soon.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Item details */}
        <div style={{ padding: 24, borderRadius: 16, border: "1px solid " + C.fawn, background: C.paper }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6, fontFamily: F.body }}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., IKEA KALLAX Bookshelf - White" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: F.body, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6, fontFamily: F.body }}>Description *</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe condition, dimensions, what is included..." style={{ width: "100%", height: 90, padding: 12, borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: F.body, resize: "none", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6, fontFamily: F.body }}>Category *</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {cats.map(c => (
                  <button key={c} onClick={() => setCat(c)} style={{ padding: "5px 10px", borderRadius: 6, border: "1.5px solid " + (cat === c ? C.gPrimary : "#e2e8f0"), cursor: "pointer", fontSize: 11, fontWeight: cat === c ? 700 : 500, backgroundColor: cat === c ? C.gLightBg : "#fff", color: cat === c ? C.gPrimary : "#64748b", fontFamily: F.body }}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6, fontFamily: F.body }}>Condition *</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {conds.map(c => (
                  <button key={c} onClick={() => setCond(c)} style={{ padding: "6px 10px", borderRadius: 6, border: "1.5px solid " + (cond === c ? C.gPrimary : "#e2e8f0"), cursor: "pointer", fontSize: 10, fontWeight: cond === c ? 700 : 500, backgroundColor: cond === c ? C.gLightBg : "#fff", color: cond === c ? C.gPrimary : "#64748b", fontFamily: F.body }}>{c}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6, fontFamily: F.body }}>Price ($) *</label>
            <input value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" type="number" style={{ width: 160, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 16, fontWeight: 700, fontFamily: F.head, outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Pickup Availability - optional */}
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
                      <input type="date" min={todayLocalISO()} value={pickupNewDate} onChange={e => { setPickupNewDate(e.target.value); if (pickupDateError) setPickupDateError(""); }}
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
                            <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 700, color: C.greenDeep }}>{formatPickupDateLong(d)}</span>
                            <button onClick={() => setPickupCustom(p => p.filter(x => x !== d))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                              <X size={11} style={{ color: C.greenDeep }}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {pickupDateError && (
                      <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.claret }}>{pickupDateError}</p>
                    )}
                    {pickupCustom.length === 0 && !pickupDateError && (
                      <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, fontStyle: "italic" }}>Add one or more specific dates when you&apos;ll be available.</p>
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

          {/* Bundle marking — declare this listing as multiple items sold together. */}
          <div style={{ marginBottom: 20, borderRadius: 16, border: "1.5px solid " + (showBundle ? (C.teal || C.greenDeep) + "30" : C.fawn), overflow: "hidden" }}>
            <button type="button" onClick={() => setShowBundle(!showBundle)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", border: "none", cursor: "pointer", background: showBundle ? (C.tealMist || C.greenMist) : C.sand, textAlign: "left", transition: "background 150ms" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Package size={16} style={{ color: showBundle ? (C.teal || C.greenDeep) : C.mink }}/>
                <div>
                  <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: showBundle ? (C.teal || C.greenDeep) : C.ink }}>Bundle of items</p>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink }}>
                    {isBundle
                      ? "Marked as a bundle · " + (bundleContents.filter(s => s.trim()).length || 0) + " items listed"
                      : "Selling multiple items together? Tap to add contents."}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: C.mink, transform: showBundle ? "rotate(90deg)" : "rotate(0)", transition: "transform 200ms" }}/>
            </button>
            {showBundle && (
              <div style={{ padding: "16px", background: C.paper, borderTop: "1px solid " + C.fawn }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: isBundle ? 16 : 0 }}>
                  <input type="checkbox" checked={isBundle} onChange={e => setIsBundle(e.target.checked)} style={{ width: 18, height: 18, accentColor: C.teal || C.greenDeep, cursor: "pointer" }}/>
                  <div>
                    <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink }}>Mark this listing as a bundle</p>
                    <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, marginTop: 2, lineHeight: 1.45 }}>Buyers see a &ldquo;Bundle of N&rdquo; pill on the card and the contents list on the detail page.</p>
                  </div>
                </label>
                {isBundle && (
                  <div>
                    <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ash, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>What&rsquo;s in the bundle</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {bundleContents.map((line, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="text"
                            value={line}
                            onChange={e => updateBundleLine(idx, e.target.value)}
                            maxLength={120}
                            placeholder={"Item " + (idx + 1) + " (e.g. \"Queen bed frame\")"}
                            style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.ink, outline: "none", background: C.paper }}
                          />
                          <button type="button" onClick={() => removeBundleLine(idx)} title="Remove" style={{ width: 34, height: 34, borderRadius: 10, border: "1.5px solid " + C.fawn, background: C.paper, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: C.mink }}>
                            <X size={13}/>
                          </button>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={addBundleLine} disabled={bundleContents.length >= 20} style={{ marginTop: 10, padding: "8px 14px", borderRadius: 999, border: "1.5px dashed " + (C.teal || C.greenDeep) + "60", background: C.paper, color: C.teal || C.greenDeep, fontFamily: F.head, fontSize: 12, fontWeight: 800, cursor: bundleContents.length >= 20 ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, opacity: bundleContents.length >= 20 ? 0.5 : 1 }}>
                      <Plus size={13}/> Add another item
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment method */}
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
                  {[
                    { id: "cash",      label: "Cash only",         icon: DollarSign },
                    { id: "etransfer", label: "e-Transfer only",   icon: Banknote   },
                    { id: "either",    label: "Cash or e-Transfer", icon: Check      },
                  ].map(p => {
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
                {/* BUG-094 — this used to be gated on `!aiSettings.paymentMethod`
                    and asserted "You haven't set a default payment method."
                    Both were wrong: `aiSettings` is root-level useState({}) that
                    only the AI Setup wizard ever writes, never hydrated from the
                    profile, so the banner fired for everyone who hadn't run that
                    wizard — including sellers who HAD set a default in
                    Settings → Payments (stored on user.acceptedPaymentMethods).
                    There's also no dependable "has set one" signal to gate on:
                    acceptedPaymentMethods carries a schema default of
                    ["CASH","ETRANSFER"], so "never touched it" is
                    indistinguishable from "deliberately picked both".
                    So: always shown, phrased conditionally, true either way. */}
                <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: C.amberMist, border: "1px solid " + C.amber + "25", display: "flex", alignItems: "flex-start", gap: 7 }}>
                  <Info size={12} style={{ color: C.amberDeep, flexShrink: 0, marginTop: 1 }}/>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, lineHeight: 1.45 }}>If you haven&apos;t set a default payment method, <button type="button" onClick={() => onGoToSettings && onGoToSettings("payments")} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 700, color: C.amberDeep, textDecoration: "underline" }}>set your default</button> so it applies to every listing.</p>
                </div>
              </div>
            )}
          </div>

                    {/* When should this go live? */}
          <div style={{ padding: "18px 20px", borderRadius: 18, background: C.sand, border: "1.5px solid " + C.fawn, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink }}>When should this go live?</p>
              {/* During a LIVE Drop the "next Drop ... away" countdown is wrong —
                  the Drop the seller would land in is the one already running. */}
              {dropIsLive ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.green }}>
                  <span style={{ position: "relative", display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: C.green, flexShrink: 0 }}>
                    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.green, opacity: 0.4, animation: "pulseLive 1.8s ease-in-out infinite" }}/>
                  </span>
                  Drop is live and underway
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink }}>
                  <Calendar size={11}/> Next Drop: {dropOpenDay()} {dropOpenHour()}{dropOpenCountdown ? ` (${dropOpenCountdown} away)` : ""}
                </div>
              )}
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
                    <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink }}>
                      {dropIsLive ? "List now in the live drop" : "Queue for the next Drop"}
                    </p>
                    <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 900, padding: "2px 7px", borderRadius: 999, background: C.green, color: "#fff", letterSpacing: "0.06em" }}>RECOMMENDED</span>
                  </div>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>
                    {dropIsLive
                      ? `Goes live immediately${sellerPhrase} — the Drop is running now, so buyers see it straight away.`
                      : `Goes live ${dropOpenDay()} at ${dropOpenHour()}${sellerPhrase} — higher visibility, event-driven traffic.`}
                  </p>
                </div>
              </button>

              {/* Option B: List now on the Shelf — closed while a Drop is LIVE.
                  Everything goes into the running Drop instead, so this path is
                  greyed out and non-interactive until the Drop closes. */}
              <button
                onClick={() => { if (!dropIsLive) setPublishWhen("shelf"); }}
                disabled={dropIsLive}
                aria-disabled={dropIsLive}
                title={dropIsLive ? "The Shelf is closed while a Drop is live" : undefined}
                style={{
                  textAlign: "left", padding: 14, borderRadius: 14,
                  border: "2px solid " + (dropIsLive ? C.fawn : (publishWhen === "shelf" ? C.amber : C.fawn)),
                  background: dropIsLive ? C.smoke + "40" : (publishWhen === "shelf" ? C.amberMist : C.paper),
                  cursor: dropIsLive ? "not-allowed" : "pointer",
                  opacity: dropIsLive ? 0.55 : 1,
                  display: "flex", alignItems: "flex-start", gap: 12,
                }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid " + (!dropIsLive && publishWhen === "shelf" ? C.amber : C.smoke), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  {!dropIsLive && publishWhen === "shelf" && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.amber }}/>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                    <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink }}>List now on the Shelf</p>
                    {dropIsLive && (
                      <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: C.smoke, color: C.mink, letterSpacing: "0.06em", textTransform: "uppercase" }}>Unavailable during a Drop</span>
                    )}
                  </div>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>
                    {dropIsLive
                      ? "The Shelf reopens once this Drop closes — list into the live Drop instead."
                      : "Available to buyers today — automatically rolls into the next Drop if unsold."}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Error banner - surfaces validation and API errors */}
          {submitError && (
            <div style={{ padding: "10px 14px", borderRadius: 12, background: C.claretMist, border: "1px solid " + C.claret + "40", marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 8 }}>
              <AlertCircle size={16} style={{ color: C.claret, flexShrink: 0, marginTop: 1 }}/>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.claret, lineHeight: 1.5 }}>{submitError}</p>
            </div>
          )}

          {/* Action row */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => handleSubmit("draft")} disabled={submitting} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 20px", borderRadius: 999, border: "1.5px solid " + C.fawn, cursor: submitting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: F.head, background: C.paper, color: C.mink, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "Saving…" : "Save as draft"}
            </button>
            <button onClick={() => handleSubmit(publishWhen)} disabled={submitting} className="cta-primary" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "12px 26px", borderRadius: 999, border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 800, fontFamily: F.head,
              background: publishWhen === "drop" ? C.green : C.amber,
              color: "#fff",
              boxShadow: "0 2px 0 " + (publishWhen === "drop" ? C.greenDeep : C.amberDeep),
              opacity: submitting ? 0.6 : 1,
            }}>
              <Check size={15} strokeWidth={2.5}/>
              {submitting ? "Saving…" : "Publish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== MY ITEMS ============================== */
/* ========= INVENTORY SUB-TABS (shared header for Items/Claims/Pickups) ========= */
function InventoryTabs({ activeView, onNav, accessToken = null }) {
  const { isMobile } = useViewport();

  // Orders badge — pending claims (PROPOSED) + scheduled pickups (ACCEPTED),
  // i.e. exactly the two sections OrdersView renders. Fetched here for the
  // same reason as openQuestions below: one number on every inventory tab.
  // It used to be threaded in from each parent, and each parent meant
  // something different by it — MyItemsView sent pickups only, ClaimsView
  // sent pending claims only, and OrdersView sent a hardcoded `4`, so the
  // badge sat there reading "4" above a page saying "No claims to review".
  const [ordersCount, setOrdersCount] = useState(0);
  const [ordersUrgent, setOrdersUrgent] = useState(0);
  const [ordersTick, setOrdersTick] = useState(0);
  useSocketEvent("claim:new",     () => setOrdersTick(t => t + 1));
  useSocketEvent("claim:updated", () => setOrdersTick(t => t + 1));
  useEffect(() => {
    if (!accessToken) { setOrdersCount(0); setOrdersUrgent(0); return; }
    let cancelled = false;
    // Both statuses are requested explicitly — an unfiltered /incoming also
    // returns terminal claims (DECLINED, EXPIRED, PICKED_UP). See BUG-090.
    Promise.all([
      apiRequest("/api/claims/incoming?status=PROPOSED", { token: accessToken }).catch(() => null),
      apiRequest("/api/claims/incoming?status=ACCEPTED", { token: accessToken }).catch(() => null),
    ]).then(([proposed, accepted]) => {
      if (cancelled) return;
      // A failed leg yields null, not []; skip the update rather than
      // reporting a drop to zero the seller would have to act on.
      if (!proposed && !accepted) return;
      const pending = Array.isArray(proposed?.claims) ? proposed.claims : [];
      const pickups = Array.isArray(accepted?.claims) ? accepted.claims : [];
      setOrdersCount(pending.length + pickups.length);
      // Urgent = needs the seller today: every pending claim is waiting on an
      // answer, plus any pickup scheduled for today. Same day heuristic as
      // PickupsView's todayCount.
      const SHORT_DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const todayShort = SHORT_DAYS[new Date().getDay()].toLowerCase();
      const dueToday = pickups.filter((c) => {
        const slot = String(c?.pickupSlot || "").trim().toLowerCase();
        return slot.startsWith(todayShort) || slot.startsWith("today");
      }).length;
      setOrdersUrgent(pending.length + dueToday);
    });
    return () => { cancelled = true; };
  }, [accessToken, activeView, ordersTick]);

  // Unanswered-question badge. Fetched here rather than threaded from each
  // parent view so the count is identical on every inventory tab. Gated on
  // accessToken: /questions/pending is authed, and an unauthed 401 would send
  // the standalone preview to /join.
  const [openQuestions, setOpenQuestions] = useState(0);
  useEffect(() => {
    if (!accessToken) { setOpenQuestions(0); return; }
    let cancelled = false;
    apiRequest("/api/questions/pending", { token: accessToken })
      .then((r) => { if (!cancelled) setOpenQuestions(Array.isArray(r?.questions) ? r.questions.length : 0); })
      .catch(() => { if (!cancelled) setOpenQuestions(0); });
    return () => { cancelled = true; };
  }, [accessToken, activeView]);

  const tabs = [
    { id: "items",  label: "My items",  view: "items" },
    { id: "orders", label: "Orders",    view: "orders", count: ordersCount, urgent: ordersUrgent },
    // Buyers' public questions are visible on the listing whether or not the
    // seller replies, so an unanswered one is urgent by default.
    { id: "questions", label: "Questions", view: "questions", count: openQuestions, urgent: openQuestions },
  ];
  return (
    <div className="fade-in" style={{ maxWidth: isMobile ? "100%" : 1160, margin: isMobile ? "0 auto 12px" : "0 auto 14px" }}>
      {/* Page header with icon */}
      <div style={{ padding: isMobile ? "12px 0 8px" : "14px 0 10px", position: "relative", marginBottom: isMobile ? 2 : 4 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 16 }}>
          <div style={{ width: isMobile ? 42 : 48, height: isMobile ? 42 : 48, borderRadius: isMobile ? 12 : 14, background: C.greenMist, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, boxShadow: "0 2px 0 " + C.fawn }}>
            {activeView === "questions"
              ? <MessageCircle size={isMobile ? 18 : 20} style={{ color: C.greenDeep }} strokeWidth={2.2}/>
              : <Box size={isMobile ? 18 : 20} style={{ color: C.greenDeep }} strokeWidth={2.2}/>}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: F.head, fontSize: isMobile ? 24 : 30, fontWeight: 900, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 4 }}>{activeView === "orders" ? "Orders" : activeView === "questions" ? "Questions" : "My items"}</h1>
            <p style={{ fontFamily: F.body, fontSize: isMobile ? 12.5 : 14, fontWeight: 500, color: C.mink, lineHeight: 1.45, maxWidth: 560 }}>
              {activeView === "orders"
                ? "Upcoming pickups you need to handle."
                : activeView === "questions"
                  ? "Buyers asking about your listings. Answers are public on the item."
                  : "Everything you have listed, in draft, or pending review."}
            </p>
          </div>
        </div>
      </div>

      {/* Tab row */}
      <div style={{ display: "flex", gap: isMobile ? 4 : 8, borderBottom: "1.5px solid " + C.fawn, paddingBottom: 0 }}>
        {tabs.map(tab => {
          const active = activeView === tab.view || (tab.view === "orders" && ["orders","claims","pickups","history"].includes(activeView));
          return (
            <button key={tab.id} onClick={() => onNav(tab.view)} style={{
              position: "relative", display: "flex", alignItems: "center", gap: 8,
              padding: isMobile ? "10px 14px 12px" : "11px 18px 13px", border: "none", cursor: "pointer",
              background: "transparent",
              fontFamily: F.head, fontSize: isMobile ? 13 : 14, fontWeight: active ? 900 : 700,
              color: active ? C.ink : C.mink,
              transition: "color 150ms",
            }}>
              {tab.label}
              {tab.count > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontFamily: F.head, fontSize: 10, fontWeight: 900, padding: "2px 7px", borderRadius: 999, background: tab.urgent > 0 ? C.claretMist : C.sand, color: tab.urgent > 0 ? C.claret : C.mink, border: "1px solid " + C.fawn }}>
                  {tab.count}
                  {tab.urgent > 0 && <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.claret }}/>}
                </span>
              )}
              {active && <div style={{ position: "absolute", left: 0, right: 0, bottom: -1.5, height: 3, background: C.green, borderRadius: 2 }}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== QUESTIONS ==============================
   Seller-side queue for the buyer-facing public Q&A on item detail. Answers
   post straight onto the listing, so this is a publishing surface, not a
   private inbox — the copy says so in a few places to keep that obvious.
   ====================================================================== */
function QuestionsView({ onNav, accessToken = null }) {
  const { isMobile } = useViewport();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(!!accessToken);
  const [drafts, setDrafts]       = useState({});   // questionId -> answer text
  const [busyId, setBusyId]       = useState(null);
  const [errorMsg, setErrorMsg]   = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const reload = useCallback(() => {
    if (!accessToken) { setQuestions([]); setLoading(false); return; }
    setLoading(true);
    apiRequest("/api/questions/pending", { token: accessToken })
      .then((r) => setQuestions(Array.isArray(r?.questions) ? r.questions : []))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => { reload(); }, [reload]);

  async function submitAnswer(q) {
    const text = (drafts[q.id] || "").trim();
    if (!text || busyId) return;
    setBusyId(q.id);
    setErrorMsg(null);
    try {
      await apiRequest(`/api/questions/${q.id}/answer`, {
        method: "PATCH",
        token:  accessToken,
        body:   JSON.stringify({ answer: text }),
      });
      // Answered questions drop out of /pending, so remove locally rather than
      // refetching the whole list on every reply.
      setQuestions((prev) => prev.filter((x) => x.id !== q.id));
      setDrafts((d) => { const next = { ...d }; delete next[q.id]; return next; });
      setSuccessMsg("Answer posted to " + (q.item?.title || "the listing") + ".");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err?.message || "Couldn't post that answer. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <InventoryTabs activeView="questions" onNav={onNav} accessToken={accessToken}/>

      <div style={{ maxWidth: isMobile ? "100%" : 1160, margin: "0 auto" }}>
        {successMsg && (
          <div style={{ padding: "11px 15px", borderRadius: 12, background: C.greenMist, border: "1px solid " + C.green + "40", marginBottom: 14, display: "flex", alignItems: "center", gap: 9 }}>
            <Check size={15} style={{ color: C.greenDeep, flexShrink: 0 }} strokeWidth={2.6}/>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.greenDeep }}>{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div style={{ padding: "11px 15px", borderRadius: 12, background: C.claretMist, border: "1px solid " + C.claret + "40", marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 9 }}>
            <AlertCircle size={15} style={{ color: C.claret, flexShrink: 0, marginTop: 1 }}/>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.claret, lineHeight: 1.5 }}>{errorMsg}</p>
          </div>
        )}

        {loading ? (
          <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ash, padding: "28px 4px" }}>Loading questions…</p>
        ) : questions.length === 0 ? (
          <div style={{ padding: "40px 24px", borderRadius: 20, background: C.paper, border: "1.5px solid " + C.fawn, textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.sand, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <MessageCircle size={22} style={{ color: C.ash }}/>
            </div>
            <p style={{ fontFamily: F.head, fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 5 }}>No questions waiting</p>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.mink, lineHeight: 1.5, maxWidth: 420, margin: "0 auto" }}>
              When a buyer asks something on one of your listings, it lands here. Your answer shows publicly on the item.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {questions.map((q) => {
              const draft = drafts[q.id] || "";
              const busy  = busyId === q.id;
              const photo = Array.isArray(q.item?.photos) ? q.item.photos[0] : null;
              return (
                <article key={q.id} style={{ padding: isMobile ? 16 : 20, borderRadius: 18, background: C.paper, border: "1.5px solid " + C.fawn }}>
                  {/* Which listing this is about */}
                  <div style={{ display: "flex", alignItems: "center", gap: 11, paddingBottom: 13, marginBottom: 13, borderBottom: "1px solid " + C.fawn }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: C.sand, border: "1px solid " + C.fawn, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {photo
                        ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                        : <Package size={16} style={{ color: C.ash }}/>}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.item?.title || "Item"}</p>
                      <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink }}>
                        ${typeof q.item?.price === "number" ? q.item.price : "—"}
                      </p>
                    </div>
                  </div>

                  {/* The question */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 13 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.greenMist, color: C.greenDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.head, fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                      {(q.askerName || "B").charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.ink }}>{q.askerName || "Buyer"}</span>
                        <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: C.ash }}>· {relativeTimeShort(q.createdAt)}</span>
                      </div>
                      <p style={{ fontFamily: F.body, fontSize: 13.5, fontWeight: 600, color: C.ink, lineHeight: 1.55 }}>{q.body}</p>
                    </div>
                  </div>

                  {/* Answer composer */}
                  <textarea
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                    placeholder="Write a public answer…"
                    rows={3}
                    disabled={busy}
                    style={{ width: "100%", padding: 12, borderRadius: 12, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.ink, outline: "none", resize: "vertical", background: busy ? C.sand : C.paper, boxSizing: "border-box" }}
                  />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                    <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.ash }}>Visible to everyone viewing this item.</p>
                    <button
                      onClick={() => submitAnswer(q)}
                      disabled={!draft.trim() || busy}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "10px 20px", borderRadius: 999, border: "none",
                        background: (draft.trim() && !busy) ? C.green : C.fawn,
                        color: (draft.trim() && !busy) ? "#fff" : C.ash,
                        fontFamily: F.head, fontSize: 13, fontWeight: 800,
                        cursor: (draft.trim() && !busy) ? "pointer" : "not-allowed",
                        boxShadow: (draft.trim() && !busy) ? "0 2px 0 " + C.greenDeep : "none",
                      }}
                    >
                      {busy ? "Posting…" : (<><Send size={13}/> Post answer</>)}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function OrdersView({ onNav, accessToken = null, onClaimsChanged = null }) {
  // The Orders tab badge is no longer passed in from here — InventoryTabs
  // fetches it. This used to hold `scheduledCount = 4` / `todayCount = 1`,
  // placeholders that outlived the Phase B demo data and kept claiming four
  // orders on an empty Orders page.
  return (
    <div>
      <InventoryTabs activeView="orders" onNav={onNav} accessToken={accessToken}/>

      {/* Pending claims — wired to GET /api/claims/incoming */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: F.head, fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 12, letterSpacing: "-0.01em" }}>Pending claims</h2>
        <ClaimsView onNav={onNav} embedded={true} accessToken={accessToken} onClaimsChanged={onClaimsChanged}/>
      </div>

      {/* Scheduled pickups — wired to GET /api/claims/incoming?status=ACCEPTED */}
      <div>
        <h2 style={{ fontFamily: F.head, fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 12, letterSpacing: "-0.01em" }}>Scheduled pickups</h2>
        <PickupsView onNav={onNav} embedded={true} accessToken={accessToken} onChanged={onClaimsChanged}/>
      </div>
    </div>
  );
}

// Closing-time banner — replaces the standard Drop strip when the live Drop is
// within the closing threshold (≤3h to Sun 8pm). Surfaces bulk-discount presets
// + custom % so the seller can lower all unsold prices in one tap.
function ClosingTimeBanner({ counts, onDiscount }) {
  const { isMobile } = useViewport();
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState("20");
  function applyCustom() {
    const n = Math.max(1, Math.min(95, Math.round(Number(custom) || 0)));
    if (n) { onDiscount(n); setShowCustom(false); }
  }
  return (
    <div style={{
      padding: isMobile ? "16px 18px" : "18px 22px", borderRadius: isMobile ? 16 : 18,
      background: "linear-gradient(135deg, " + C.claretMist + " 0%, " + C.paper + " 75%)",
      border: "1px solid " + C.claret + "30",
      boxShadow: "0 4px 16px rgba(31,29,25,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
      marginBottom: 14,
      display: "flex", flexDirection: "column", gap: 12,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -50, right: -20, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, " + C.claret + "18 0%, transparent 70%)", pointerEvents: "none" }}/>
      <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 12 : 14, position: "relative" }}>
        <div style={{
          width: isMobile ? 40 : 46, height: isMobile ? 40 : 46, borderRadius: isMobile ? 12 : 13,
          background: "linear-gradient(180deg, " + C.claret + " 0%, #A8281C 100%)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          boxShadow: "0 3px 10px " + C.claret + "55",
        }}>
          <Clock size={isMobile ? 17 : 20} style={{ color: "#fff" }} strokeWidth={2.4}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: F.head, fontSize: isMobile ? 14 : 15, fontWeight: 900, color: C.claret, marginBottom: 3, letterSpacing: "-0.015em" }}>Closing time · last call for the Drop</p>
          <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, lineHeight: 1.5 }}>
            <span style={{ color: C.ink, fontWeight: 700 }}>{counts.live} items</span> still unsold — drop prices in bulk below, or use the &ldquo;Make free&rdquo; action on individual items before they return to the Shelf.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", paddingTop: 2, position: "relative" }}>
        <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase" }}>Drop price by</span>
        {[10, 25, 50].map(p => (
          <button key={p} onClick={() => onDiscount(p)} style={{
            padding: "9px 16px", borderRadius: 999, border: "none", cursor: "pointer",
            fontFamily: F.head, fontSize: 12, fontWeight: 800, letterSpacing: "-0.005em",
            background: "linear-gradient(180deg, " + C.claret + " 0%, #A8281C 100%)",
            color: "#fff",
            boxShadow: "0 2px 0 #A8281C",
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            <TrendingDown size={12} strokeWidth={2.4}/> {p}%
          </button>
        ))}
        {!showCustom ? (
          <button onClick={() => setShowCustom(true)} style={{
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
          }}>
            <input
              type="text" inputMode="numeric" autoFocus
              value={custom}
              onChange={e => setCustom(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
              onKeyDown={e => { if (e.key === "Enter") applyCustom(); if (e.key === "Escape") setShowCustom(false); }}
              style={{ width: 36, padding: "4px 6px", border: "none", outline: "none", fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.claret, background: "transparent", textAlign: "right" }}
            />
            <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.claret }}>%</span>
            <button onClick={applyCustom} style={{
              padding: "6px 12px", borderRadius: 999, border: "none", cursor: "pointer",
              fontFamily: F.head, fontSize: 11, fontWeight: 800,
              background: "linear-gradient(180deg, " + C.claret + " 0%, #A8281C 100%)",
              color: "#fff",
            }}>
              Apply
            </button>
            <button onClick={() => setShowCustom(false)} style={{ padding: "5px 8px", borderRadius: 999, border: "none", cursor: "pointer", background: "transparent", color: C.mink }} title="Cancel">
              <X size={11}/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MyItemsView({ onNav, onEdit, onView, sellerItems, onItemsChange, sellerItemsLoading, accessToken }) {
  const { isMobile } = useViewport();
  // Drop-cycle wiring — coarse phase ("between" | "live" | "closing") drives
  // the Drop strip, lifecycle pills, and per-item actions (e.g. Make free).
  const cycle = useDropCycle();
  const now = cycle.effectiveNow || new Date();
  const dropPhase = toSellerOverviewPhase(cycle, now);
  const dropIsLive = dropPhase === "live" || dropPhase === "closing";
  const isClosing  = dropPhase === "closing";
  const nextDropAt = nextDropMoment(now);
  const dropCloseAt = dropCloseMoment(now);
  const countdownToOpen  = formatCompactCountdown(nextDropAt, now);
  const countdownToClose = formatCompactCountdown(dropCloseAt, now);

  const [filter, setFilter] = useState("all");
  const [successMsg, setSuccessMsg] = useState(null);
  const [priceEditId, setPriceEditId] = useState(null);
  const [tempPrice, setTempPrice] = useState("");
  // Modal state for the new draft "Publish" chooser and destructive delete confirm.
  const [publishChooserItem, setPublishChooserItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // (The pickups-badge fetch that used to live here moved into InventoryTabs,
  // which now owns the Orders count for every tab — BUG-103.)

  // Items now carry publishedTo (queue target) + status (draft | published)
  // Derived "lifecycle" tells the UI what state to render
  const [items, setItems] = useState([
    { id: 1, e: "\uD83D\uDECF\uFE0F", t: "Full Bedroom Set",        cat: "Furniture",            cond: "Used - Good",      price: 600, status: "published", publishedTo: "drop",  views: 42, saves: 8  },
    { id: 2, e: "\uD83D\uDCFA",       t: "LG 55\" Smart TV",         cat: "Electronics",          cond: "Used - Good",      price: 250, status: "published", publishedTo: "shelf", views: 67, saves: 15, shelfDays: 5  },
    { id: 4, e: "\uD83D\uDECB\uFE0F", t: "Sofa Set 3 Seater",        cat: "Furniture",            cond: "Used - Good",      price: 500, status: "published", publishedTo: "drop",  views: 55, saves: 9  },
    { id: 5, e: "\uD83D\uDCD6",       t: "Kids Study Desk",          cat: "Kids & Baby",          cond: "Used - Fair",      price: 45,  status: "draft",     publishedTo: null,    views: 0,  saves: 0  },
    { id: 6, e: "\uD83C\uDF73",       t: "Kitchen Appliances Bundle", cat: "Appliances & Kitchen", cond: "Used - Good",      price: 120, status: "draft",     publishedTo: null,    views: 0,  saves: 0  },
    { id: 7, e: "\uD83E\uDE91",       t: "IKEA KALLAX Bookshelf",    cat: "Furniture",            cond: "Used - Good",      price: 35,  status: "published", publishedTo: "shelf", views: 28, saves: 4,  shelfDays: 12 },
    { id: 8, e: "\uD83D\uDD27",       t: "DeWalt Drill Set",         cat: "Tools & Garden",       cond: "New",              price: 65,  status: "published", publishedTo: "drop",  views: 31, saves: 7  },
  ]);

  // Adapter: backend item shape -> UI item shape used by this view.
  // Backend returns category/condition/placement/status enums; UI wants
  // `e` (emoji), `t` (title), `cat`/`cond` (labels), `publishedTo`, and a
  // `status` of "draft"|"published" so the existing lifecycleOf() logic works.
  function adaptItem(api) {
    if (!api) return null;
    // Hide finished/archived items from My Items entirely. SOLD claims appear
    // in the History tab; ARCHIVED is the seller's manual remove. CLAIMED items
    // stay visible — they're in flight (buyer claimed, seller confirmed,
    // pickup pending) and the seller still cares about them.
    if (api.status === "SOLD" || api.status === "ARCHIVED") return null;
    const placementUi = ENUM_TO_PLACEMENT_LABEL[api.placement] || "drop";
    const isDraft = api.status === "DRAFT";
    let shelfDays;
    if (placementUi === "shelf" && api.createdAt) {
      const ms = Date.now() - new Date(api.createdAt).getTime();
      shelfDays = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
    }
    const saves = (api._count && typeof api._count.watchlist === "number")
      ? api._count.watchlist
      : (typeof api.watcherCount === "number" ? api.watcherCount : 0);
    return {
      id:          api.id,
      e:           CATEGORY_EMOJI[api.category] || "📦",
      t:           api.title,
      cat:         ENUM_TO_CATEGORY_LABEL[api.category] || "Other",
      cond:        ENUM_TO_CONDITION_LABEL[api.condition] || "Used - Good",
      price:       api.price,
      // Agreed sale amount when a claim is active (BUG-055 — was activeClaim.price,
      // now activeClaim.amount). Null for items without an active claim.
      // Inventory row + detail view prefer this over the listed price so the
      // seller sees what they'll actually be paid.
      soldPrice:   (api.activeClaim && typeof api.activeClaim.amount === "number") ? api.activeClaim.amount : null,
      // Surface the buyer's "Confirm receipt" flag so the inventory/pickups
      // view can show a high-priority badge on this item.
      buyerConfirmedReceipt: !!(api.activeClaim && api.activeClaim.buyerConfirmedReceiptAt),
      // BUG-093 — set when the seller committed the item to a Drop. Distinguishes
      // "queued for Saturday" from a private draft; both are backend DRAFT.
      isQueued:    !!api.queuedAt,
      isFree:      api.price === 0 && !isDraft,
      photos:      Array.isArray(api.photos) ? api.photos.filter(Boolean) : [],
      description: api.description || "",
      // BUG-053: surface the raw backend status so lifecycleOf() can route
      // CLAIMED items to their own pill instead of leaving them looking
      // like they're still live.
      backendStatus: api.status,
      status:      isDraft ? "draft" : "published",
      publishedTo: isDraft ? null : placementUi,
      views:       0,
      saves,
      shelfDays,
      isBundle:       !!api.isBundle,
      bundleCount:    typeof api.bundleCount === "number" ? api.bundleCount : 0,
      bundleContents: Array.isArray(api.bundleContents) ? api.bundleContents : [],
      raw:         api,
    };
  }

  // True when the parent supplies real backend items (the auth'd flow through
  // /buyer/page.tsx). False for the standalone /preview/seller-dashboard route
  // where the demo data carries the design preview without auth.
  const usingBackend = Array.isArray(sellerItems);

  // Sync backend items into local state. We keep mutating local state in the
  // action handlers so the optimistic UI feels instant; when the parent
  // refetches, this effect overwrites local state with truth.
  useEffect(() => {
    if (usingBackend) {
      setItems(sellerItems.map(adaptItem).filter(Boolean));
    }
  }, [sellerItems, usingBackend]);

  // API helpers wrapped around the existing local-state actions. Demo IDs
  // (string ids starting with "demo-") and missing accessToken short-circuit
  // so the standalone preview keeps working.
  async function apiPatchItem(id, body) {
    if (!accessToken) return;
    if (typeof id === "string" && id.startsWith("demo-")) return;
    try {
      await apiRequest("/api/items/" + encodeURIComponent(id), {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify(body),
      });
    } catch (err) {
      flash("Save failed: " + (err && err.message ? err.message : "try again"));
      throw err;
    }
  }

  async function apiDeleteItem(id) {
    if (!accessToken) return;
    if (typeof id === "string" && id.startsWith("demo-")) return;
    try {
      await apiRequest("/api/items/" + encodeURIComponent(id), {
        method: "DELETE",
        token: accessToken,
      });
    } catch (err) {
      flash("Delete failed: " + (err && err.message ? err.message : "try again"));
      throw err;
    }
  }

  // Compute the lifecycle for each item
  function lifecycleOf(item) {
    // BUG-093 — a backend DRAFT is either a private draft OR an item queued
    // for the next Drop; `isQueued` (queuedAt) is what separates them. This
    // check has to come BEFORE the plain draft check, which used to swallow
    // queued items and label them "Draft" — sending the seller back through
    // the Publish chooser for something they'd already committed.
    if (item.status === "draft" && item.isQueued) {
      return dropIsLive ? "live" : "queued";
    }
    if (item.status === "draft") return "draft";
    // BUG-053 — CLAIMED items are no longer claimable by other buyers but
    // still in the seller's hands until pickup. Show them with a distinct
    // pill so the seller knows a sale is in flight.
    // BUG-055 — CLAIMED renamed to RESERVED. Both old + new accepted during
    // any rolling-restart window so the UI doesn't go blank if a stale
    // response arrives.
    if (item.backendStatus === "RESERVED" || item.backendStatus === "CLAIMED") return "claimed";
    if (item.publishedTo === "drop" && !dropIsLive) return "queued";
    if (item.publishedTo === "drop" && dropIsLive)  return "live";
    if (item.publishedTo === "shelf" && dropIsLive) return "live";  // Shelf items auto-join Live Drop
    if (item.publishedTo === "shelf" && !dropIsLive) return "shelf";
    return "draft";
  }

  const lifecycleMeta = {
    draft:   { label: "Draft",                       color: C.ash,       bg: C.sand,       border: C.fawn },
    queued:  { label: "Queued for Saturday's Drop",  color: C.amberDeep, bg: C.amberMist,  border: C.amber + "30" },
    live:    { label: "Live in Drop",                color: C.greenDeep, bg: C.greenMist,  border: C.green + "40", pulse: true },
    shelf:   { label: "On the Shelf",                color: C.ink,       bg: C.sand,       border: C.smoke },
    claimed: { label: "Claimed · pickup pending",    color: C.ai,        bg: C.aiMist,     border: C.ai + "40" },
  };

  // Filters follow the lifecycle. "Claimed" only shows up when there's at
  // least one such item — keeps the filter row clean while still surfacing
  // a meaningful filter when it matters.
  const myItemsClaimedCount = items.filter(i => lifecycleOf(i) === "claimed").length;
  const allFilters = [
    { id: "all",    label: "All" },
    { id: "draft",  label: "Drafts" },
    { id: "queued", label: "Queued for Drop" },
    { id: "live",   label: "Live in Drop" },
    { id: "shelf",  label: "On the Shelf" },
    ...(myItemsClaimedCount > 0 ? [{ id: "claimed", label: "Claimed · pickup pending" }] : []),
  ].filter(f => f.id !== "live" || dropIsLive);

  const counts = {
    all:     items.length,
    draft:   items.filter(i => lifecycleOf(i) === "draft").length,
    queued:  items.filter(i => lifecycleOf(i) === "queued").length,
    live:    items.filter(i => lifecycleOf(i) === "live").length,
    shelf:   items.filter(i => lifecycleOf(i) === "shelf").length,
    claimed: myItemsClaimedCount,
  };

  const filtered = filter === "all" ? items : items.filter(i => lifecycleOf(i) === filter);

  // --------- Row actions ---------
  // Each action does an optimistic local update so the UI is snappy, then
  // hits the API. On API failure we surface a toast; the next parent refetch
  // (e.g. on tab switch) will overwrite the local list with truth.
  function openPublishChooser(item) {
    setPublishChooserItem(item);
  }
  async function publishToDrop(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: "published", publishedTo: "drop" } : i));
    setPublishChooserItem(null);
    flash("Queued for Saturday's Drop.");
    try {
      // Status flips DRAFT -> LIVE so it'll appear in the next phase
      // transition (or immediately if backend phase is LIVE).
      await apiPatchItem(id, { status: "LIVE", placement: "DROP" });
    } catch { /* flash already shown by apiPatchItem */ }
  }
  async function publishToShelf(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: "published", publishedTo: "shelf" } : i));
    setPublishChooserItem(null);
    flash(dropIsLive ? "Added to the Shelf · selling now in the live Drop." : "Added to the Shelf · selling now.");
    try {
      await apiPatchItem(id, { status: "LIVE", placement: "SHELF" });
    } catch {}
  }

  async function makeLiveNow(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, publishedTo: "shelf" } : i));
    flash("Now live on the Shelf.");
    try {
      // Move to Shelf and ensure it's LIVE so buyers can see it immediately.
      await apiPatchItem(id, { status: "LIVE", placement: "SHELF" });
    } catch {}
  }

  async function unpublish(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: "draft", publishedTo: null } : i));
    flash("Unpublished · saved to Drafts.");
    try {
      await apiPatchItem(id, { status: "DRAFT" });
    } catch {}
  }

  async function deleteDraft(id) {
    const snapshot = items;
    setItems(prev => prev.filter(i => i.id !== id));
    flash("Draft deleted.");
    try {
      await apiDeleteItem(id);
    } catch {
      // Restore the row if the server rejected the delete
      setItems(snapshot);
    }
  }

  function beginPriceEdit(item) { setPriceEditId(item.id); setTempPrice(String(item.price)); }
  async function commitPriceEdit() {
    const next = Number(tempPrice);
    const id = priceEditId;
    setPriceEditId(null);
    if (!(next > 0)) return;
    const it = items.find(i => i.id === id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, price: next } : i));
    if (it && next < it.price) flash("Price lowered · buyers may get a price-drop notification.");
    try {
      await apiPatchItem(id, { price: next });
    } catch {}
  }
  function flash(msg) { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3500); }

  // Free pile — only meaningful for live items during the closing window.
  // We stash the prior price locally so Undo can restore it; the backend just
  // sees a price change to 0 (and back).
  async function makeFree(id) {
    const it = items.find(i => i.id === id);
    if (!it) return;
    const prior = it.price;
    setItems(prev => prev.map(i => i.id === id
      ? { ...i, _priceBeforeFree: prior, price: 0, isFree: true }
      : i));
    flash("Added to free pile.");
    try {
      await apiPatchItem(id, { price: 0 });
    } catch {}
  }
  async function undoFree(id) {
    const it = items.find(i => i.id === id);
    if (!it) return;
    const restore = it._priceBeforeFree || 1;
    setItems(prev => prev.map(i => i.id === id
      ? { ...i, price: restore, isFree: false, _priceBeforeFree: undefined }
      : i));
    flash("Removed from free pile.");
    try {
      await apiPatchItem(id, { price: restore });
    } catch {}
  }

  // Bulk discount — applied to every live, non-free item. Each item gets its
  // own PATCH so the server stays in sync; UI updates optimistically as a single
  // pass so the row prices change in one frame.
  async function applyBulkDiscount(pct) {
    const factor = 1 - pct / 100;
    const affected = items
      .filter(i => lifecycleOf(i) === "live" && !i.isFree)
      .map(i => ({ id: i.id, next: Math.max(1, Math.round(i.price * factor)) }));
    if (affected.length === 0) {
      flash("Nothing live to discount.");
      return;
    }
    const byId = new Map(affected.map(a => [a.id, a.next]));
    setItems(prev => prev.map(i => byId.has(i.id) ? { ...i, price: byId.get(i.id) } : i));
    flash("Unsold items dropped " + pct + "%.");
    try {
      await Promise.allSettled(affected.map(a => apiPatchItem(a.id, { price: a.next })));
    } catch {}
  }

  // Claimed-items count: derive from backend status when available, otherwise
  // fall back to the demo count for the standalone preview.
  const claimedCount = usingBackend
    ? sellerItems.filter(i => i && i.status === "CLAIMED").length
    : 3;

  return (
    <div className="fade-in" style={{ maxWidth: isMobile ? "100%" : 1160, margin: "0 auto" }}>
      <InventoryTabs activeView="items" onNav={onNav} accessToken={accessToken}/>

      {/* Phase-aware Drop strip — closing window swaps to the bulk-discount banner. */}
      {isClosing ? (
        <ClosingTimeBanner counts={counts} onDiscount={applyBulkDiscount}/>
      ) : (
      <div style={{ padding: isMobile ? "14px 16px" : "12px 16px", borderRadius: 16, background: dropIsLive ? C.greenMist : "linear-gradient(135deg, " + C.amberMist + ", " + C.paper + ")", border: "1.5px solid " + (dropIsLive ? C.green + "30" : C.amber + "25"), marginBottom: 14, display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 12, flexWrap: "wrap" }}>
        {/* Icon tile removed — the live state showed a Sparkles glyph, which
            reads as an "AI generated" marker on a band that has nothing to do
            with AI. Dropped for both phases rather than only the live one, so
            the band keeps the same shape as the Drop cycle turns over. The
            pulsing live dot beside the headline still carries the state. */}
        <div style={{ flex: 1, minWidth: isMobile ? 0 : 220 }}>
          <p style={{ fontFamily: F.head, fontSize: isMobile ? 13 : 14, fontWeight: 900, color: dropIsLive ? C.greenDeep : C.amberDeep, marginBottom: 2, display: "flex", alignItems: "center", gap: 7 }}>
            {dropIsLive && <span style={{ position: "relative", display: "inline-flex", width: 9, height: 9 }}>
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.green, opacity: 0.4, animation: "pulseLive 1.8s ease-in-out infinite" }}/>
              <span style={{ position: "relative", width: 9, height: 9, borderRadius: "50%", background: C.green }}/>
            </span>}
            {dropIsLive
              ? "Drop is live now · closes in " + countdownToClose
              : "Next Drop opens in " + countdownToOpen}
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

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {allFilters.map(f => {
          const on = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 999, border: "1.5px solid " + (on ? C.ink : C.fawn), background: on ? C.ink : C.paper, color: on ? "#fff" : C.mink, fontFamily: F.head, fontSize: 12.5, fontWeight: 700, cursor: "pointer", transition: "all 150ms" }}>
              {f.label}
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: on ? "rgba(255,255,255,0.18)" : C.sand, color: on ? "#fff" : C.ash }}>{counts[f.id]}</span>
            </button>
          );
        })}
      </div>

      {/* Items list */}
      {filtered.length === 0 && (
        <div style={{ padding: "50px 20px", textAlign: "center", borderRadius: 16, border: "1.5px dashed " + C.fawn, background: C.paper }}>
          <Package size={28} style={{ color: C.smoke, marginBottom: 10 }}/>
          {usingBackend && sellerItemsLoading ? (
            <>
              <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 4 }}>Loading your items&hellip;</p>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink }}>Pulling the latest from the server.</p>
            </>
          ) : (
            <>
              <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 4 }}>Nothing here yet</p>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink }}>Items with this status will appear here.</p>
            </>
          )}
        </div>
      )}

      {/* Items table — column headers + single-column list of rows aligned
          to the same grid tracks (Photo · Item · Category · Status · Price · Actions).
          Mobile skips the header row and stacks each item into a vertical card. */}
      {filtered.length > 0 && !isMobile && (
        <div style={{ display: "grid", gridTemplateColumns: "60px minmax(0, 1.6fr) minmax(0, 0.9fr) minmax(140px, 0.9fr) 80px minmax(220px, auto)", gap: 14, padding: "8px 18px", marginBottom: 6, fontFamily: F.head, fontSize: 10, fontWeight: 900, color: C.ash, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          <span aria-hidden="true"/>
          <span>Item</span>
          <span>Category</span>
          <span>Status</span>
          <span style={{ textAlign: "right" }}>Price</span>
          <span style={{ textAlign: "right", paddingRight: 4 }}>Actions</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 10 : 8 }}>
        {filtered.map(item => {
          const lc = lifecycleOf(item);
          const meta = lifecycleMeta[lc];
          // Mobile card layout — vertical stack: thumb+title+price top row,
          // meta + status pills middle, action row bottom. Keeps every action
          // accessible without horizontal scroll.
          if (isMobile) {
            return (
              <article key={item.id} style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 14px", borderRadius: 14, border: "1.5px solid " + meta.border, background: C.paper }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => onView && onView(item)}
                    title="View details"
                    style={{ width: 56, height: 56, borderRadius: 12, background: "linear-gradient(135deg, " + C.sand + ", " + C.fawn + ")", border: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", padding: 0, cursor: "pointer" }}
                  >
                    {item.photos && item.photos.length > 0 ? (
                      <img src={item.photos[0]} alt={item.t} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
                    ) : (
                      <span style={{ fontSize: 26 }}>{item.e}</span>
                    )}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <button
                      type="button"
                      onClick={() => onView && onView(item)}
                      style={{ fontFamily: F.head, fontSize: 14.5, fontWeight: 800, color: C.ink, background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left", display: "block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}
                    >
                      {item.t}
                    </button>
                    <p style={{ marginTop: 3, fontFamily: F.body, fontSize: 11.5, fontWeight: 600, color: C.mink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.cat} · {item.cond}
                    </p>
                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.head, fontSize: 9, fontWeight: 900, padding: "3px 9px", borderRadius: 999, background: meta.bg, color: meta.color, letterSpacing: "0.04em", border: "1px solid " + meta.border }}>
                        {meta.pulse && <span style={{ position: "relative", display: "inline-flex", width: 6, height: 6, flexShrink: 0 }}>
                          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: meta.color, opacity: 0.4, animation: "pulseLive 1.8s ease-in-out infinite" }}/>
                          <span style={{ position: "relative", width: 6, height: 6, borderRadius: "50%", background: meta.color }}/>
                        </span>}
                        {meta.label}
                      </span>
                      {item.isBundle && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.head, fontSize: 9, fontWeight: 900, padding: "3px 9px", borderRadius: 999, background: C.tealMist, color: C.teal, letterSpacing: "0.04em", border: "1px solid " + C.teal + "30" }}>
                          <Package size={9} strokeWidth={2.4}/> Bundle of {item.bundleCount || (item.bundleContents || []).length || 2}
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
                      <p style={{ fontFamily: F.head, fontSize: 17, fontWeight: 900, color: item.isFree ? C.claret : C.green, letterSpacing: "-0.01em" }}>
                        {item.isFree ? "FREE" : (
                          typeof item.soldPrice === "number" && item.soldPrice !== item.price ? (
                            <>
                              <span>{"$" + item.soldPrice}</span>
                              <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 700, color: C.ash, textDecoration: "line-through" }}>{"$" + item.price}</span>
                            </>
                          ) : ("$" + item.price)
                        )}
                      </p>
                    )}
                    {(item.views > 0 || item.saves > 0 || (lc === "shelf" && item.shelfDays)) && (
                      <p style={{ marginTop: 4, fontFamily: F.body, fontSize: 10, fontWeight: 600, color: C.mink, display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {item.views > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><Eye size={9}/> {item.views}</span>}
                        {item.saves > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><Heart size={9}/> {item.saves}</span>}
                        {lc === "shelf" && item.shelfDays && <span>{item.shelfDays}d</span>}
                      </p>
                    )}
                  </div>
                </div>

                {lc === "shelf" && !dropIsLive && (
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.amberDeep, fontStyle: "italic", display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={10}/> Will be featured in Saturday&rsquo;s Drop
                  </p>
                )}

                <div style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 10, borderTop: "1px dashed " + C.fawn }}>
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
                      <button onClick={() => onEdit && onEdit(item)} style={{ ...actionBtnOutlined, flex: 1 }}>Edit</button>
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
          }
          return (
            <article key={item.id} style={{ display: "grid", gridTemplateColumns: "60px minmax(0, 1.6fr) minmax(0, 0.9fr) minmax(140px, 0.9fr) 80px minmax(220px, auto)", alignItems: "center", gap: 14, padding: "12px 18px", borderRadius: 16, border: "1.5px solid " + meta.border, background: C.paper, transition: "all 150ms" }}>
              {/* Col 1 — Photo */}
              <button
                type="button"
                onClick={() => onView && onView(item)}
                title="View details"
                style={{ width: 60, height: 60, borderRadius: 14, background: "linear-gradient(135deg, " + C.sand + ", " + C.fawn + ")", border: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", padding: 0, cursor: "pointer" }}
              >
                {item.photos && item.photos.length > 0 ? (
                  <img src={item.photos[0]} alt={item.t} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
                ) : (
                  <span style={{ fontSize: 28 }}>{item.e}</span>
                )}
              </button>

              {/* Col 2 — Item (name + meta line: views/saves/shelf) */}
              <div style={{ minWidth: 0 }}>
                <button
                  type="button"
                  onClick={() => onView && onView(item)}
                  title="View details"
                  style={{ fontFamily: F.head, fontSize: 15, fontWeight: 800, color: C.ink, background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left", display: "block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.green; e.currentTarget.style.textDecoration = "underline"; e.currentTarget.style.textUnderlineOffset = "3px"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.ink; e.currentTarget.style.textDecoration = "none"; }}
                >
                  {item.t}
                </button>
                {(item.views > 0 || item.saves > 0 || (lc === "shelf" && item.shelfDays) || (lc === "shelf" && !dropIsLive)) && (
                  <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 10, fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink }}>
                    {item.views > 0 && (<span style={{ display: "flex", alignItems: "center", gap: 3 }}><Eye size={10}/> {item.views}</span>)}
                    {item.saves > 0 && (<span style={{ display: "flex", alignItems: "center", gap: 3 }}><Heart size={10}/> {item.saves}</span>)}
                    {lc === "shelf" && item.shelfDays && (<span>{item.shelfDays}d on Shelf</span>)}
                    {lc === "shelf" && !dropIsLive && (
                      <span style={{ color: C.amberDeep, display: "flex", alignItems: "center", gap: 3, fontStyle: "italic" }}>
                        <Calendar size={10}/> In Saturday&apos;s Drop
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Col 3 — Category (with condition underneath) */}
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: F.body, fontSize: 12.5, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.cat}</p>
                <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.cond}</p>
              </div>

              {/* Col 4 — Status pill (+ Free pile pill underneath when active) */}
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.head, fontSize: 10, fontWeight: 900, padding: "3px 10px", borderRadius: 999, background: meta.bg, color: meta.color, letterSpacing: "0.04em", border: "1px solid " + meta.border, maxWidth: "100%" }}>
                  {meta.pulse && <span style={{ position: "relative", display: "inline-flex", width: 6, height: 6, flexShrink: 0 }}>
                    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: meta.color, opacity: 0.4, animation: "pulseLive 1.8s ease-in-out infinite" }}/>
                    <span style={{ position: "relative", width: 6, height: 6, borderRadius: "50%", background: meta.color }}/>
                  </span>}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.label}</span>
                </span>
                {item.isBundle && (
                  <span title={(item.bundleContents || []).join(" · ")} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.head, fontSize: 9, fontWeight: 900, padding: "3px 9px", borderRadius: 999, background: C.tealMist || C.greenMist, color: C.teal || C.greenDeep, letterSpacing: "0.04em", border: "1px solid " + (C.teal || C.greenDeep) + "30" }}>
                    <Package size={9} strokeWidth={2.4}/> Bundle of {item.bundleCount || (item.bundleContents || []).length || 2}
                  </span>
                )}
                {item.isFree && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.head, fontSize: 9, fontWeight: 900, padding: "3px 9px", borderRadius: 999, background: C.claret, color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    <Heart size={9} strokeWidth={2.4}/> Free pile
                  </span>
                )}
              </div>

              {/* Col 5 — Inline-editable price (FREE when item is in the free pile) */}
              <div onClick={e => e.stopPropagation()} style={{ textAlign: "right" }}>
                {priceEditId === item.id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "flex-end" }}>
                    <span style={{ fontFamily: F.head, fontSize: 16, fontWeight: 900, color: C.green }}>$</span>
                    <input type="text" value={tempPrice} autoFocus onChange={e => setTempPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={commitPriceEdit}
                      onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setPriceEditId(null); }}
                      style={{ width: 64, padding: "2px 6px", borderRadius: 6, border: "1.5px solid " + C.green, fontFamily: F.head, fontSize: 16, fontWeight: 900, color: C.green, outline: "none", background: C.paper, textAlign: "center" }}/>
                  </div>
                ) : (
                  <p style={{ fontFamily: F.head, fontSize: 19, fontWeight: 900, color: item.isFree ? C.claret : C.green, letterSpacing: "-0.01em" }}>
                    {item.isFree ? "FREE" : (
                      typeof item.soldPrice === "number" && item.soldPrice !== item.price ? (
                        <>
                          <span>{"$" + item.soldPrice}</span>
                          <span style={{ marginLeft: 6, fontSize: 13, fontWeight: 700, color: C.ash, textDecoration: "line-through" }}>{"$" + item.price}</span>
                        </>
                      ) : ("$" + item.price)
                    )}
                  </p>
                )}
              </div>

              {/* Col 6 — Row actions, lifecycle-aware */}
              <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                {/* Share icon — only for lifecycles a new buyer could still act on.
                    Hidden on drafts (not publicly viewable — BUG-051) and on
                    claimed items (BUG-089): the sale is already in flight, so
                    sharing sends people to a listing nobody else can claim.
                    Written as an allow-list so a future lifecycle has to opt in
                    rather than silently inheriting a Share button. */}
                {["queued", "live", "shelf"].includes(lc) && (
                  <button
                    onClick={async (e) => { e.stopPropagation(); await shareSellerListing(item); }}
                    aria-label="Share this listing"
                    title="Share"
                    style={actionBtnIcon}
                  >
                    <Share2 size={13} style={{ color: C.greenDeep }} strokeWidth={2.4}/>
                  </button>
                )}
                {lc === "draft" && (
                  <>
                    <button onClick={() => openPublishChooser(item)} className="cta-primary" style={actionBtnSolid(C.green, C.greenDeep)}>Publish</button>
                    <button onClick={() => onEdit && onEdit(item)} style={actionBtnOutlined}>Edit</button>
                    <button onClick={() => setConfirmDelete(item)} title="Delete draft" style={actionBtnIcon}>
                      <X size={13} style={{ color: C.claret }} strokeWidth={2.4}/>
                    </button>
                  </>
                )}
                {lc === "queued" && (
                  <>
                    <button onClick={() => makeLiveNow(item.id)} className="cta-primary" style={actionBtnSolid(C.amber, C.amberDeep)}>Move to Shelf</button>
                    <button onClick={() => onEdit && onEdit(item)} style={actionBtnOutlined}>Edit</button>
                    <button onClick={() => unpublish(item.id)} title="Unpublish" style={actionBtnIcon}>
                      <X size={13} style={{ color: C.claret }} strokeWidth={2.4}/>
                    </button>
                  </>
                )}
                {lc === "live" && (
                  <>
                    {isClosing && (
                      item.isFree ? (
                        <button onClick={() => undoFree(item.id)} style={actionBtnOutlined}>
                          Undo free
                        </button>
                      ) : (
                        <button onClick={() => makeFree(item.id)} style={{ ...actionBtnOutlined, color: C.claret, borderColor: C.claret + "40" }}>
                          <Heart size={12} strokeWidth={2.4}/> Make free
                        </button>
                      )
                    )}
                    <button onClick={() => onEdit && onEdit(item)} title="Edit (price changes take effect at next Drop reset)" style={actionBtnOutlined}>Edit</button>
                  </>
                )}
                {lc === "shelf" && (
                  <>
                    <button onClick={() => beginPriceEdit(item)} style={actionBtnOutlined}>
                      <TrendingDown size={12}/> Lower price
                    </button>
                    <button onClick={() => onEdit && onEdit(item)} style={actionBtnOutlined}>Edit</button>
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
          During Live phase, the Drop path is disabled — curation already closed. */}
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
              width: 500, maxWidth: "100%",
              borderRadius: 24,
              background: C.paper,
              boxShadow: "0 24px 60px rgba(31, 29, 25, 0.25)",
              overflow: "hidden",
              maxHeight: "90vh", display: "flex", flexDirection: "column",
            }}
          >
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
                style={{ background: C.sand, border: "none", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                aria-label="Close"
              >
                <X size={15} style={{ color: C.mink }}/>
              </button>
            </div>

            <div style={{ padding: "20px 24px", overflowY: "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button
                  onClick={() => publishToDrop(publishChooserItem.id)}
                  disabled={dropIsLive}
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

                <button
                  onClick={() => publishToShelf(publishChooserItem.id)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "16px 18px", borderRadius: 16,
                    background: "linear-gradient(135deg, " + C.greenMist + " 0%, " + C.paper + " 80%)",
                    border: "1.5px solid " + C.green + "40",
                    cursor: "pointer", textAlign: "left",
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

            <div style={{ padding: "12px 24px", borderTop: "1px solid " + C.fawn, background: C.sand + "80", display: "flex", justifyContent: "center" }}>
              <button onClick={() => setPublishChooserItem(null)} style={{ padding: "8px 22px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
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
              width: 460, maxWidth: "100%",
              borderRadius: 24,
              background: C.paper,
              boxShadow: "0 24px 60px rgba(31, 29, 25, 0.25)",
              overflow: "hidden",
            }}
          >
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
                style={{
                  background: C.sand, border: "none", width: 32, height: 32, borderRadius: "50%",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
                aria-label="Close"
              >
                <X size={15} style={{ color: C.mink }}/>
              </button>
            </div>

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
                  display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontSize: 22, flexShrink: 0,
                }}>
                  {confirmDelete.photos && confirmDelete.photos.length > 0
                    ? <img src={confirmDelete.photos[0]} alt={confirmDelete.t} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
                    : <span>{confirmDelete.e}</span>}
                </div>
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

            <div style={{ padding: "14px 24px", borderTop: "1px solid " + C.fawn, background: C.sand + "80", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDelete(null)}
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
                onClick={() => { const id = confirmDelete.id; setConfirmDelete(null); deleteDraft(id); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 22px", borderRadius: 999, border: "none", cursor: "pointer",
                  fontFamily: F.head, fontSize: 13, fontWeight: 800, letterSpacing: "-0.005em",
                  background: "linear-gradient(180deg, " + C.claret + " 0%, #A8281C 100%)",
                  color: "#fff",
                  boxShadow: "0 2px 0 #A8281C",
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
// Demo claims kept around so /preview/seller-dashboard still tells the design
// story when there's no signed-in seller. The wired version below uses these
// only when no accessToken is supplied.
const DEMO_CLAIMS = [
  { id: "demo-c1", e: "\u{1F4FA}", t: "LG 55 inch Smart TV",   listed: 250, offered: 250, buyer: "James K.", time: "3h ago" },
  { id: "demo-c2", e: "\u{1F6CB}\u{FE0F}", t: "Sofa Set 3 Seater", listed: 500, offered: 500, buyer: "Priya R.", time: "5h ago" },
  { id: "demo-c3", e: "\u{1FA91}", t: "IKEA KALLAX Bookshelf", listed: 35,  offered: 35,  buyer: "Tom W.",   time: "1d ago" },
];

// Format an ISO timestamp as a short relative string ("3h ago", "2d ago").
function relativeTimeShort(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  if (days < 30)  return days + "d ago";
  const months = Math.floor(days / 30);
  return months + "mo ago";
}

// Lifted from SellerMessagesView to module scope so the dashboard root can
// adapt the conversation list before SellerMessagesView even mounts (the nav
// badge needs to count from this lifted state). Seller-perspective adapter.
function adaptSellerConversation(api, myId) {
  if (!api) return null;
  // Seller view only shows conversations where the current user IS the seller.
  // Backend returns both sides; when this user is the buyer in a thread, that
  // belongs in the Buyer Messages view, not here.
  if (api.sellerId && myId && api.sellerId !== myId) return null;
  const layer = api.item?.placement === "SHELF" ? "shelf" : "drop";
  const lastFromMe = api.lastMessage && api.lastMessage.senderId === myId;
  const status = (api.unreadCount || 0) > 0
    ? "needs-response"
    : (lastFromMe ? "answered" : "pending");
  return {
    id:     api.id,
    type:   "question",
    status,
    unread: (api.unreadCount || 0) > 0,
    unreadCount: api.unreadCount || 0,
    group:  "active",
    item: {
      title: api.item?.title || "Item",
      price: api.item?.price ?? 0,
      img:   CATEGORY_EMOJI[api.item?.category] || "\u{1F4E6}",
      layer,
      // Raw backend status (LIVE / CLAIMED / SOLD). Composer locks once
      // the item is SOLD (pickup complete).
      status: api.item?.status || null,
    },
    buyer: {
      name:   api.otherUser?.name || "Buyer",
      hood:   api.otherUser?.neighborhood || "—",
      rating: 0,
      previousPurchases: typeof api.otherUser?.previousPurchases === "number"
        ? api.otherUser.previousPurchases
        : 0,
    },
    lastMsg:  api.lastMessage?.body || "",
    lastTime: relativeTimeShort(api.lastMessageAt),
    messages: [],
  };
}

function ClaimsView({ onNav, embedded = false, accessToken = null, onClaimsChanged = null }) {
  const { isMobile } = useViewport();
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg]     = useState(null);
  const [claims, setClaims]         = useState(accessToken ? [] : DEMO_CLAIMS);
  const [loading, setLoading]       = useState(!!accessToken);
  // Track in-flight accept/decline per claim so we can disable buttons
  const [busyId, setBusyId]         = useState(null);
  // BUG-055 — counter-offer state. The seller can counter a PROPOSED claim
  // with a new amount via PATCH /api/claims/:id/amount. counterId is the
  // claim being countered; counterAmt is the text-input value.
  const [counterId, setCounterId]   = useState(null);
  const [counterAmt, setCounterAmt] = useState("");

  function flash(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  }
  function fail(msg) {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4500);
  }

  // Adapter: backend claim -> UI claim shape used by the existing render code.
  // BUG-090 — this comment used to claim "GET /api/claims/incoming returns only
  // PROPOSED claims". It does not: with no `status` query param the backend
  // returns EVERY claim for the seller in every terminal state (CANCELLED,
  // DECLINED, EXPIRED, PICKED_UP, CONFIRMED). Both fetches below now pass
  // ?status=PROPOSED explicitly. PROPOSED is exactly "live negotiation" —
  // countering via PATCH /:id/amount keeps the status and only flips
  // `lastAmountBy`, so it covers both "your turn" and "waiting for buyer".
  //   shape: { id, status, amount, lastAmountBy, proposedAt,
  //            item:{id,title,price,photos}, buyer:{id,name,email} }
  // The UI didn't have an "offer below ask" concept on the backend, so we
  // present every pending claim as a full-price claim (offered === listed).
  function adaptClaim(api) {
    if (!api) return null;
    // BUG-053 — `offered` reflects the agreed sale price (claim.price when
    // set, falls back to the item's listed price for vanilla claims).
    const offered = typeof api.amount === "number" ? api.amount : (api.item?.price ?? 0);
    return {
      id:       api.id,
      e:        "\u{1F4E6}",
      t:        api.item?.title || "Item",
      listed:   api.item?.price ?? 0,
      offered,
      buyer:    api.buyer?.name || api.buyer?.email || "Buyer",
      time:     relativeTimeShort(api.proposedAt || api.createdAt),
      // BUG-055.1 — whose turn is it? GET /incoming only returns claims
      // where I'm the seller, so lastAmountBy === sellerId means I made the
      // last offer; ball is in the buyer's court. lastAmountBy === buyerId
      // means buyer made the offer; ball is in my court (Accept/Counter/Decline).
      iMadeTheOffer: api.lastAmountBy === api.sellerId,
    };
  }

  // Pull pending claims for this seller. Standalone preview (no accessToken)
  // keeps the demo array. The fetch is wrapped in a stable callback so the
  // socket listener below can re-run it without duplicating the body.
  const reloadClaims = () => {
    if (!accessToken) return;
    apiRequest("/api/claims/incoming?status=PROPOSED", { token: accessToken })
      .then(data => {
        const list = Array.isArray(data?.claims) ? data.claims.map(adaptClaim).filter(Boolean) : [];
        setClaims(list);
      })
      .catch(() => { /* keep current list on transient errors */ });
  };
  useEffect(() => {
    if (!accessToken) { setClaims(DEMO_CLAIMS); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    apiRequest("/api/claims/incoming?status=PROPOSED", { token: accessToken })
      .then(data => {
        if (cancelled) return;
        const list = Array.isArray(data?.claims) ? data.claims.map(adaptClaim).filter(Boolean) : [];
        setClaims(list);
      })
      .catch(err => {
        if (cancelled) return;
        fail("Couldn't load claims: " + (err?.message || "try again"));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken]);
  // Real-time: a buyer just claimed something or cancelled a claim. Refetch
  // the pending list so the row appears/disappears without a manual reload.
  useSocketEvent("claim:new",     () => reloadClaims());
  useSocketEvent("claim:updated", () => reloadClaims());

  const offers = claims.length;

  async function handleAccept(claim) {
    // Standalone preview short-circuit
    if (!accessToken || (typeof claim.id === "string" && claim.id.startsWith("demo-"))) {
      setClaims(prev => prev.filter(c => c.id !== claim.id));
      flash("Offer accepted! " + claim.t + " sold to " + claim.buyer + " for $" + claim.offered + ".");
      return;
    }
    setBusyId(claim.id);
    // Optimistic remove — accepting one claim also auto-rejects siblings on the
    // same item server-side, so refetch is the safest way to resync.
    const snapshot = claims;
    setClaims(prev => prev.filter(c => c.id !== claim.id));
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/accept", {
        method: "PATCH",
        token:  accessToken,
      });
      flash("Offer accepted! " + claim.t + " sold to " + claim.buyer + ".");
      // Item became CLAIMED — let parent refetch the items list so My Items reflects it.
      if (onClaimsChanged) onClaimsChanged();
    } catch (err) {
      setClaims(snapshot);
      fail("Accept failed: " + (err?.message || "try again"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(claim) {
    if (!accessToken || (typeof claim.id === "string" && claim.id.startsWith("demo-"))) {
      setClaims(prev => prev.filter(c => c.id !== claim.id));
      flash(claim.t + " — offer from " + claim.buyer + " declined. Item remains listed.");
      return;
    }
    setBusyId(claim.id);
    const snapshot = claims;
    setClaims(prev => prev.filter(c => c.id !== claim.id));
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/decline", {
        method: "PATCH",
        token:  accessToken,
      });
      flash(claim.t + " — offer from " + claim.buyer + " declined.");
      if (onClaimsChanged) onClaimsChanged();
    } catch (err) {
      setClaims(snapshot);
      fail("Decline failed: " + (err?.message || "try again"));
    } finally {
      setBusyId(null);
    }
  }

  // BUG-055 — seller-side counter. Updates Claim.amount in place; status
  // stays PROPOSED so the buyer sees the new amount and can accept/counter
  // back. Backend resets the 36h expiry on each amount update.
  async function handleCounter(claim) {
    const amt = Math.round(Number(counterAmt));
    if (!Number.isFinite(amt) || amt <= 0) {
      fail("Enter a valid counter amount.");
      return;
    }
    if (!accessToken || (typeof claim.id === "string" && claim.id.startsWith("demo-"))) {
      setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, offered: amt } : c));
      setCounterId(null); setCounterAmt("");
      flash("Counter offered $" + amt + " on " + claim.t + ".");
      return;
    }
    setBusyId(claim.id);
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/amount", {
        method: "PATCH",
        token:  accessToken,
        body:   JSON.stringify({ amount: amt }),
      });
      setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, offered: amt } : c));
      setCounterId(null); setCounterAmt("");
      flash("Counter offered $" + amt + " on " + claim.t + ". Waiting for the buyer.");
    } catch (err) {
      fail("Counter failed: " + (err?.message || "try again"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {!embedded && <InventoryTabs activeView="orders" onNav={onNav} accessToken={accessToken}/>}

      {/* Success toast */}
      {successMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, backgroundColor: C.gLightBg, border: "1px solid " + C.gSoft, marginBottom: 16 }}>
          <CheckCircle size={18} style={{ color: C.gPrimary }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: C.gDark, fontFamily: F.body, flex: 1 }}>{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={14} style={{ color: C.ash }} /></button>
        </div>
      )}

      {/* Error toast */}
      {errorMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, backgroundColor: C.claretMist, border: "1px solid " + C.claret + "33", marginBottom: 16 }}>
          <AlertCircle size={18} style={{ color: C.claret }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: C.claret, fontFamily: F.body, flex: 1 }}>{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={14} style={{ color: C.claret }} /></button>
        </div>
      )}

      {/* Summary */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, padding: 16, borderRadius: 14, border: offers > 0 ? "2px solid " + C.oSoft : "1px solid #f0f0f0", backgroundColor: offers > 0 ? C.oLightBg : "#fff", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.oLightBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <DollarSign size={18} style={{ color: C.oPrimary }} />
          </div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 900, color: C.oPrimary, fontFamily: F.head }}>{offers}</p>
            <p style={{ fontSize: 11, color: C.ash, fontFamily: F.body }}>Pending Claims</p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: C.ash, fontFamily: F.body }}>Loading claims…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && claims.length === 0 && (
        <div style={{ padding: 60, textAlign: "center" }}>
          <ClipboardList size={32} style={{ color: "#e2e8f0", marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: C.ash, fontFamily: F.body }}>No claims to review</p>
          <p style={{ fontSize: 12, color: C.smoke, marginTop: 4, fontFamily: F.body }}>When buyers claim your items, they appear here for you to accept or decline.</p>
        </div>
      )}

      {/* Claims list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {claims.map(claim => {
          const isBusy = busyId === claim.id;
          return (
            <div key={claim.id} style={{ padding: isMobile ? "14px 14px" : "16px 18px", borderRadius: 16, border: "2px solid " + C.oSoft, background: C.paper, opacity: isBusy ? 0.6 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <StatusBadge status="offer" size="sm"/>
                <span style={{ fontSize: 11, color: C.mink, fontWeight: 600, fontFamily: F.body }}>Full price claim</span>
                <span style={{ fontSize: 11, color: C.ash, fontFamily: F.body }}>{claim.time}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14, flexWrap: "wrap" }}>
                <div style={{ width: isMobile ? 46 : 52, height: isMobile ? 46 : 52, borderRadius: 14, background: C.sand, border: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 22 : 24, flexShrink: 0 }}>{claim.e}</div>

                <div style={{ flex: 1, minWidth: isMobile ? "60%" : 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: F.head, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{claim.t}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, fontSize: 12, color: C.mink, fontFamily: F.body }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><User size={11} /> {claim.buyer}</span>
                  </div>
                </div>

                {/* Price — shows current offered amount and the listed price
                    when the buyer's offer differs (offer or seller-counter). */}
                <div style={{ textAlign: "right", marginRight: isMobile ? 0 : 10, flexShrink: 0 }}>
                  <p style={{ fontSize: 18, fontWeight: 900, color: C.oPrimary, fontFamily: F.head }}>${claim.offered}</p>
                  {claim.offered !== claim.listed && (
                    <p style={{ fontSize: 11, fontWeight: 500, color: C.ash, fontFamily: F.body, textDecoration: "line-through", marginTop: 1 }}>${claim.listed} listed</p>
                  )}
                </div>

                {/* Actions — Accept / Counter / Decline. BUG-055.1: only
                    visible when the BUYER made the last offer. If the seller
                    countered, the ball is in the buyer's court — show a
                    "Waiting for buyer" pill instead. */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, width: isMobile ? "100%" : "auto", marginTop: isMobile ? 8 : 0, flexWrap: "wrap" }}>
                  {claim.iMadeTheOffer ? (
                    <span style={{ padding: "8px 14px", borderRadius: 999, background: C.amberMist || "#fef3c7", color: C.amberDeep || "#92400e", fontFamily: F.head, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, border: "1.5px solid " + (C.amber || "#f59e0b") + "30" }}>
                      <Clock size={12}/> Waiting for buyer
                    </span>
                  ) : counterId === claim.id ? (
                    <>
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.ink, fontFamily: F.head }}>$</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={counterAmt}
                        onChange={e => setCounterAmt(e.target.value)}
                        placeholder={String(Math.max(1, Math.round((claim.offered + claim.listed) / 2)))}
                        autoFocus
                        disabled={isBusy}
                        style={{ width: 80, padding: "7px 10px", borderRadius: 8, border: "1.5px solid " + C.fawn, fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.ink, outline: "none", background: C.paper }}
                      />
                      <button onClick={() => handleCounter(claim)} disabled={isBusy} className="cta-primary" style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: C.gPrimary, color: "#fff", fontFamily: F.body, fontSize: 11, fontWeight: 800, cursor: isBusy ? "not-allowed" : "pointer" }}>Send</button>
                      <button onClick={() => { setCounterId(null); setCounterAmt(""); }} disabled={isBusy} style={{ padding: "8px 10px", borderRadius: 8, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.body, fontSize: 11, fontWeight: 700, cursor: isBusy ? "not-allowed" : "pointer" }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleAccept(claim)} disabled={isBusy} style={{ padding: "8px 14px", borderRadius: 8, border: "none", cursor: isBusy ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700, backgroundColor: C.gPrimary, color: "#fff", fontFamily: F.body, flex: isMobile ? 1 : "0 0 auto" }}>Accept ${claim.offered}</button>
                      <button onClick={() => { setCounterId(claim.id); setCounterAmt(String(Math.max(1, Math.round((claim.offered + claim.listed) / 2)))); }} disabled={isBusy} style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid " + C.gPrimary + "55", background: C.gLightBg || "#ecfdf5", color: C.gPrimary, fontFamily: F.body, fontSize: 11, fontWeight: 700, cursor: isBusy ? "not-allowed" : "pointer", flex: isMobile ? 1 : "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><RefreshCw size={11}/> Counter</button>
                      <button onClick={() => handleDecline(claim)} disabled={isBusy} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #FECACA", cursor: isBusy ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 600, background: C.paper, color: "#DC2626", fontFamily: F.body, flex: isMobile ? 1 : "0 0 auto" }}>Decline</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== SELLER MESSAGES ============================== */
// Demo conversations kept around so /preview/seller-dashboard still tells the
// design story without auth. The wired version below uses these only when no
// accessToken is supplied.
const DEMO_SELLER_CONVERSATIONS = [
    {
      id: "s1", type: "claim", status: "pickup-today", unread: true, group: "active",
      item: { title: "Dining Set with 8 Chairs", price: 350, img: "\uD83C\uDF7D\uFE0F", layer: "drop" },
      buyer: { name: "Sarah M.", hood: "Barrhaven", rating: 4.8, previousPurchases: 2 },
      pickup: { day: "Today", time: "2:00 PM", address: "Your address on file" },
      lastMsg: "Reminder: Sarah M. picking up at 2pm today!",
      lastTime: "1h ago",
      messages: [
        { from: "buyer", text: "I'd like to claim the dining set at $350.", time: "Wed, 3:00 PM", type: "claim" },
        { from: "ai", text: "Full price claim accepted automatically. Pickup scheduling sent to Sarah M.", time: "Wed, 3:00 PM", type: "text" },
        { from: "system", text: "WhatsApp confirmation sent.", time: "Wed, 3:01 PM", type: "whatsapp" },
        { from: "buyer", text: "Can I pick up Saturday at 2pm?", time: "Wed, 3:10 PM", type: "text" },
        { from: "ai", text: "Saturday 2pm confirmed. You'll get a reminder 1 hour before.", time: "Wed, 3:10 PM", type: "text" },
        { from: "system", text: "Reminder: Pickup in 1 hour!", time: "Today, 1:00 PM", type: "reminder" },
      ],
    },
    {
      id: "s2", type: "offer", status: "countered", unread: true, group: "active",
      item: { title: "LG 55\" Smart TV", price: 250, img: "\uD83D\uDCFA", layer: "drop" },
      buyer: { name: "James K.", hood: "Bridlewood", rating: 4.2, previousPurchases: 0 },
      lastMsg: "AI countered at $220. Waiting for James.",
      lastTime: "3h ago",
      messages: [
        { from: "buyer", text: "Would you take $180 for the TV?", time: "Today, 11:00 AM", type: "offer", amount: 180 },
        { from: "ai", text: "Offer of $180 is below your 80% floor ($200). AI auto-countered at $220.", time: "Today, 11:00 AM", type: "counter", amount: 220 },
        { from: "system", text: "Counter offer sent via WhatsApp.", time: "Today, 11:01 AM", type: "whatsapp" },
      ],
    },
    {
      id: "s3", type: "question", status: "pending", unread: true, group: "active",
      item: { title: "Sofa Set 3 Seater", price: 500, img: "\uD83D\uDECB\uFE0F", layer: "drop" },
      buyer: { name: "Priya R.", hood: "Half Moon Bay", rating: 5.0, previousPurchases: 1, isFriend: true },
      lastMsg: "Does this come with throw pillows?",
      lastTime: "45 min ago",
      messages: [
        { from: "buyer", text: "Does this come with the throw pillows shown in the photo? Also, any pets in the home?", time: "Today, 12:15 PM", type: "question" },
      ],
    },
    {
      id: "s4", type: "offer", status: "needs-response", unread: true, group: "active",
      item: { title: "DeWalt Drill Set", price: 65, img: "\uD83D\uDD27", layer: "shelf" },
      buyer: { name: "Tom W.", hood: "Barrhaven East", rating: 3.9 },
      lastMsg: "Tom offered $45 for the drill set.",
      lastTime: "2h ago",
      messages: [
        { from: "buyer", text: "Offering $45 for the drill set.", time: "Today, 10:30 AM", type: "offer", amount: 45 },
        { from: "system", text: "This offer is below your AI price floor. Needs your manual review.", time: "Today, 10:30 AM", type: "notice" },
      ],
    },
    {
      id: "s5", type: "claim", status: "pickup-scheduled", unread: false, group: "this-week",
      item: { title: "Full Bedroom Set", price: 550, img: "\uD83D\uDECF\uFE0F", layer: "drop" },
      buyer: { name: "David C.", hood: "Barrhaven", rating: 4.4, previousPurchases: 3 },
      pickup: { day: "Sun, Apr 26", time: "10:00 AM", address: "Your address on file" },
      lastMsg: "Pickup confirmed for Sunday 10am.",
      lastTime: "1d ago",
      messages: [
        { from: "buyer", text: "I'd like to offer $550 for the bedroom set.", time: "Fri, 2:00 PM", type: "offer", amount: 550 },
        { from: "ai", text: "Offer of $550 is above your floor. Auto-accepted.", time: "Fri, 2:00 PM", type: "text" },
        { from: "buyer", text: "Can I pick up Sunday morning?", time: "Fri, 2:15 PM", type: "text" },
        { from: "ai", text: "Sunday 10am works. Confirmed.", time: "Fri, 2:15 PM", type: "text" },
        { from: "system", text: "WhatsApp confirmation sent.", time: "Fri, 2:16 PM", type: "whatsapp" },
      ],
    },
    {
      id: "s6", type: "question", status: "answered", unread: false, group: "this-week",
      item: { title: "IKEA KALLAX Bookshelf", price: 35, img: "\uD83E\uDE91", layer: "shelf" },
      buyer: { name: "Jen L.", hood: "Stonebridge", rating: 4.5 },
      lastMsg: "AI answered: 72\" tall x 58\" wide, walnut finish.",
      lastTime: "5h ago",
      messages: [
        { from: "buyer", text: "What are the dimensions?", time: "Today, 9:00 AM", type: "question" },
        { from: "ai", text: "72\" tall × 58\" wide, walnut finish, holds 8 cubes.", time: "Today, 9:00 AM", type: "text" },
      ],
    },
];

function SellerMessagesView({ user = null, accessToken = null, convList: convListProp = null, onConvListChange = null }) {
  const { isMobile } = useViewport();
  const usingBackend = !!accessToken;
  const myId = user?.id || null;

  const [activeId, setActiveId]         = useState(usingBackend ? null : "s1");
  // Mobile drill-down — null means we're on the list, otherwise we're inside a thread.
  const [mobileViewingId, setMobileViewingId] = useState(null);
  const [draft, setDraft]               = useState("");
  const [sending, setSending]           = useState(false);
  const [errorMsg, setErrorMsg]         = useState(null);
  const [successMsg, setSuccessMsg]     = useState(null);

  // Inbox list — owned by the dashboard root (so the nav badge stays in
  // sync even when this view is unmounted). Falls back to local state for
  // isolated rendering / preview mode.
  const [localConvList, setLocalConvList] = useState(usingBackend ? [] : DEMO_SELLER_CONVERSATIONS);
  const convList = convListProp != null ? convListProp : localConvList;
  const setConvList = (updater) => {
    if (typeof onConvListChange === "function") {
      onConvListChange(updater);
    } else {
      setLocalConvList(updater);
    }
  };
  const [loading, setLoading]           = useState(usingBackend && convListProp == null);

  // Active thread messages — only used in wired mode. In demo mode the
  // existing render path reads inline from each conversation's `messages`.
  const [activeMsgs, setActiveMsgs]     = useState(null);
  const [activeLoading, setActiveLoading] = useState(false);

  // BUG-055 — active PROPOSED claims indexed by conversationId. Powers the
  // in-chat "Pending offer" banner so the seller can Accept/Counter/Decline
  // without leaving the conversation view. Refreshes on every claim:updated
  // socket event.
  const [activeClaimByConv, setActiveClaimByConv] = useState({});
  const [pendingClaimTick, setPendingClaimTick]   = useState(0);
  useSocketEvent("claim:updated", () => setPendingClaimTick(t => t + 1));
  useSocketEvent("claim:new",     () => setPendingClaimTick(t => t + 1));
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    // BUG-055 — fetch PROPOSED + ACCEPTED both so the chat banner can show
    // Accept/Counter/Decline (PROPOSED) OR Mark Picked up (ACCEPTED).
    Promise.all([
      apiRequest("/api/claims/incoming?status=PROPOSED", { token: accessToken }).catch(() => ({ claims: [] })),
      apiRequest("/api/claims/incoming?status=ACCEPTED", { token: accessToken }).catch(() => ({ claims: [] })),
    ])
      .then(([p, a]) => {
        if (cancelled) return;
        const list = [...(Array.isArray(p?.claims) ? p.claims : []), ...(Array.isArray(a?.claims) ? a.claims : [])];
        const idx = {};
        for (const c of list) if (c.conversationId) idx[c.conversationId] = c;
        setActiveClaimByConv(idx);
      })
      .catch(() => { if (!cancelled) setActiveClaimByConv({}); });
    return () => { cancelled = true; };
  }, [accessToken, pendingClaimTick]);

  // In-chat offer action state.
  const [chatBusyClaimId, setChatBusyClaimId] = useState(null);
  const [chatCounterMode, setChatCounterMode] = useState(false);
  const [chatCounterAmt, setChatCounterAmt]   = useState("");
  // BUG-055.1 — every chat action surfaces its error so a 400/404/conflict
  // doesn't appear as "nothing happened" to the user. flashes for ~4.5s.
  function chatFlashErr(action, err) {
    setErrorMsg("Couldn't " + action + ": " + (err?.message || "try again"));
    setTimeout(() => setErrorMsg(null), 4500);
  }
  function chatFlashOk(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4500);
  }
  async function chatAccept(claim) {
    setChatBusyClaimId(claim.id);
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/accept", {
        method: "PATCH", token: accessToken,
      });
      chatFlashOk("Accepted at $" + claim.amount + ".");
      setPendingClaimTick(t => t + 1);
    } catch (err) { chatFlashErr("accept", err); }
    finally { setChatBusyClaimId(null); }
  }
  async function chatDecline(claim) {
    setChatBusyClaimId(claim.id);
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/decline", {
        method: "PATCH", token: accessToken,
      });
      chatFlashOk("Declined. Item is back on the listing.");
      setPendingClaimTick(t => t + 1);
    } catch (err) { chatFlashErr("decline", err); }
    finally { setChatBusyClaimId(null); }
  }
  async function chatCounterSubmit(claim) {
    const amt = Math.round(Number(chatCounterAmt));
    if (!Number.isFinite(amt) || amt <= 0) {
      chatFlashErr("counter", new Error("Enter a valid amount"));
      return;
    }
    setChatBusyClaimId(claim.id);
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/amount", {
        method: "PATCH", token: accessToken,
        body: JSON.stringify({ amount: amt }),
      });
      chatFlashOk("Countered at $" + amt + ". Waiting for the buyer.");
      setChatCounterMode(false);
      setChatCounterAmt("");
      setPendingClaimTick(t => t + 1);
    } catch (err) { chatFlashErr("counter", err); }
    finally { setChatBusyClaimId(null); }
  }
  async function chatMarkPickedUp(claim) {
    setChatBusyClaimId(claim.id);
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/picked-up", {
        method: "PATCH", token: accessToken,
      });
      chatFlashOk("Pickup complete. Item marked as sold.");
      setPendingClaimTick(t => t + 1);
    } catch (err) { chatFlashErr("mark picked up", err); }
    finally { setChatBusyClaimId(null); }
  }

  // Adapter moved to module scope as `adaptSellerConversation(api, myId)` so
  // the dashboard root can apply it before this view mounts. Local alias
  // below keeps existing call sites readable.
  const adaptConversation = (api) => adaptSellerConversation(api, myId);
  function adaptMessage(api) {
    if (!api) return null;
    const fromMe = api.senderId === myId;
    // Mirror of the buyer-side TYPE_MAP — backend MessageType (upper) → lower
    // render keys. Mismatched / missing values fall through to "text".
    const TYPE_MAP = {
      TEXT: "text", OFFER: "offer", COUNTER: "counter", CLAIM: "claim",
      WHATSAPP: "whatsapp", NOTICE: "notice", REMINDER: "reminder",
    };
    const renderType = TYPE_MAP[api.messageType] || "text";
    return {
      id:   api.id,
      from: fromMe ? "seller" : "buyer",
      text: api.body,
      time: new Date(api.createdAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }),
      type: renderType,
      amount: typeof api.amount === "number" ? api.amount : undefined,
    };
  }

  // Initial inbox fetch — moved to the dashboard root so the Sidebar / TopNav
  // / MobileBottomNav badges stay accurate when this view is unmounted. We
  // only run a local fallback fetch when no parent owns the list (legacy
  // path / isolated rendering).
  useEffect(() => {
    if (!usingBackend) return;
    if (convListProp != null) {
      if (Array.isArray(convListProp) && convListProp.length > 0) {
        setActiveId(prev => prev || convListProp[0].id);
      }
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiRequest("/api/conversations", { token: accessToken })
      .then(data => {
        if (cancelled) return;
        const list = Array.isArray(data?.conversations) ? data.conversations.map(adaptConversation).filter(Boolean) : [];
        setConvList(list);
        if (list.length > 0) setActiveId(prev => prev || list[0].id);
      })
      .catch(err => {
        if (cancelled) return;
        setErrorMsg("Couldn't load messages: " + (err?.message || "try again"));
        setTimeout(() => setErrorMsg(null), 4500);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingBackend, accessToken, convListProp]);

  // Load messages for the active thread
  useEffect(() => {
    if (!usingBackend) return;
    if (!activeId) { setActiveMsgs([]); return; }
    let cancelled = false;
    setActiveLoading(true);
    apiRequest("/api/conversations/" + encodeURIComponent(activeId) + "/messages", { token: accessToken })
      .then(data => {
        if (cancelled) return;
        const msgs = Array.isArray(data?.messages) ? data.messages.map(adaptMessage).filter(Boolean) : [];
        setActiveMsgs(msgs);
        // Server already cleared unread on this side — mirror locally so the
        // sidebar badge clears immediately without needing a refetch.
        setConvList(prev => prev.map(c => c.id === activeId ? { ...c, unread: false, unreadCount: 0 } : c));
      })
      .catch(err => {
        if (cancelled) return;
        setErrorMsg("Couldn't load thread: " + (err?.message || "try again"));
        setTimeout(() => setErrorMsg(null), 4500);
      })
      .finally(() => { if (!cancelled) setActiveLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, usingBackend, accessToken]);

  // Real-time push: a new message landed somewhere
  // Live push: append to the OPEN thread + mark read on the server. Inbox
  // preview + unread badge updates now live at the dashboard root so they
  // stay accurate regardless of whether this view is mounted. We also clear
  // the active conv's unread locally so the badge matches what's on screen.
  useSocketEvent("message:new", (payload) => {
    if (!usingBackend || !payload?.conversationId || !payload.message) return;
    const { conversationId, message } = payload;

    if (conversationId === activeId) {
      setActiveMsgs(prev => {
        const list = prev || [];
        if (list.some(m => m.id === message.id)) return list;
        return [...list, adaptMessage(message)];
      });
      apiRequest("/api/conversations/" + encodeURIComponent(conversationId) + "/read", {
        method: "PATCH",
        token:  accessToken,
      }).catch(() => {});
      setConvList(prev => prev.map(c => c.id === activeId
        ? { ...c, unread: false, unreadCount: 0, status: c.status === "needs-response" ? "answered" : c.status }
        : c));
    }
  });

  async function handleSend() {
    const body = draft.trim();
    if (!body) return;
    if (!usingBackend) {
      // Demo mode: append locally to the demo conversation's messages.
      setConvList(prev => prev.map(c => c.id === activeId
        ? { ...c, messages: [...(c.messages || []), { from: "seller", text: body, time: "Now", type: "text" }], lastMsg: body, lastTime: "Now" }
        : c));
      setDraft("");
      return;
    }
    if (!activeId) return;
    setSending(true);
    try {
      await apiRequest("/api/conversations/" + encodeURIComponent(activeId) + "/messages", {
        method: "POST",
        token:  accessToken,
        body:   JSON.stringify({ body }),
      });
      // The socket emit echoes back to me, which appends via the message:new
      // handler. No optimistic add needed.
      setDraft("");
    } catch (err) {
      setErrorMsg("Send failed: " + (err?.message || "try again"));
      setTimeout(() => setErrorMsg(null), 4500);
    } finally {
      setSending(false);
    }
  }

  // ─── Negotiation action handlers (BUG-055 unified lifecycle) ───
  // The seller's in-chat Accept/Counter/Decline now acts on the conversation's
  // active CLAIM (status PROPOSED) instead of an OFFER message. The active
  // claim is looked up from the loaded thread's metadata. We accept either
  // a claim id (preferred) or — if the caller still passes a message id from
  // legacy data — fall through to a no-op.
  const [offerBusyMsgId, setOfferBusyMsgId] = useState(null);
  const [counterDraftMsgId, setCounterDraftMsgId] = useState(null);
  const [counterDraftAmount, setCounterDraftAmount] = useState("");
  async function acceptOffer(claimId) {
    if (!usingBackend || !claimId) return;
    setOfferBusyMsgId(claimId);
    try {
      const resp = await apiRequest("/api/claims/" + encodeURIComponent(claimId) + "/accept", {
        method: "PATCH",
        token:  accessToken,
      });
      const amt = resp?.claim?.amount ?? null;
      setSuccessMsg(amt ? `Offer accepted at $${amt}. Pickup will appear in Pickups view.` : "Offer accepted. Pickup will appear in Pickups view.");
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err) {
      setErrorMsg("Couldn't accept: " + (err?.message || "try again"));
      setTimeout(() => setErrorMsg(null), 4500);
    } finally {
      setOfferBusyMsgId(null);
    }
  }
  async function declineOffer(claimId) {
    if (!usingBackend || !claimId) return;
    setOfferBusyMsgId(claimId);
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claimId) + "/decline", {
        method: "PATCH",
        token:  accessToken,
      });
    } catch (err) {
      setErrorMsg("Couldn't decline: " + (err?.message || "try again"));
      setTimeout(() => setErrorMsg(null), 4500);
    } finally {
      setOfferBusyMsgId(null);
    }
  }
  async function submitCounter(claimId) {
    const amt = Math.round(Number(counterDraftAmount));
    if (!Number.isFinite(amt) || amt <= 0) {
      setErrorMsg("Enter a valid counter amount.");
      setTimeout(() => setErrorMsg(null), 4500);
      return;
    }
    setOfferBusyMsgId(claimId);
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claimId) + "/amount", {
        method: "PATCH",
        token:  accessToken,
        body:   JSON.stringify({ amount: amt }),
      });
      setCounterDraftMsgId(null);
      setCounterDraftAmount("");
    } catch (err) {
      setErrorMsg("Couldn't counter: " + (err?.message || "try again"));
      setTimeout(() => setErrorMsg(null), 4500);
    } finally {
      setOfferBusyMsgId(null);
    }
  }

  // Single source of truth for everything below — derived from state above.
  const conversations = convList;

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

  // No type filter any more (BUG-088) — the list is every thread, newest first.
  const filtered = conversations;
  const active = conversations.find(c => c.id === activeId) || conversations[0];
  const activeStatus = active ? statusMeta[active.status] : null;
  // Demo mode reads messages inline from the conversation; wired mode uses
  // the activeMsgs state populated by GET /:id/messages and socket pushes.
  const activeMessages = usingBackend ? (activeMsgs || []) : (active?.messages || []);

  function renderMessage(m, i) {
    const isYou = m.from === "seller"; // viewer is the seller; "buyer" is counterparty
    const isBuyer = m.from === "buyer";
    const isAI = m.from === "ai";

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
    // CLAIM-type messages render as a celebratory full-width banner.
    if (m.type === "claim") {
      return (
        <div key={i} style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 14, background: "linear-gradient(135deg, " + C.greenMist + " 0%, " + C.greenMist + "80 100%)", border: "1.5px solid " + C.green + "55", maxWidth: 440, boxShadow: "0 2px 0 " + C.green + "20" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Check size={17} style={{ color: "#fff" }} strokeWidth={3}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.greenDeep, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 2 }}>
                {m.amount ? "Claim confirmed · $" + m.amount : "Claim confirmed"}
              </p>
              <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.ink, lineHeight: 1.4 }}>{m.text}</p>
            </div>
          </div>
        </div>
      );
    }

    const bubbleBg = isBuyer ? C.paper : (isAI ? C.aiMist : C.green);
    const bubbleColor = isBuyer ? C.ink : (isAI ? C.ink : "#fff");
    const borderStyle = isBuyer ? ("1px solid " + C.fawn) : (isAI ? ("1px solid " + C.ai + "25") : "none");

    return (
      <div key={i} style={{ display: "flex", justifyContent: isBuyer ? "flex-start" : "flex-end", marginBottom: 10 }}>
        <div style={{ maxWidth: "72%" }}>
          {isAI && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4, justifyContent: "flex-end", marginRight: 2 }}>
              <Sparkles size={10} style={{ color: C.ai }}/>
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.ai, letterSpacing: "0.05em" }}>AI AGENT (YOU)</span>
            </div>
          )}
          {isBuyer && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4, marginLeft: 2 }}>
              <User size={10} style={{ color: C.mink }}/>
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.mink, letterSpacing: "0.05em" }}>{active.buyer.name.toUpperCase()}</span>
            </div>
          )}
          <div style={{ padding: "10px 14px", borderRadius: 14, background: bubbleBg, color: bubbleColor, border: borderStyle, fontFamily: F.body, fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>
            {(m.type === "offer" || m.type === "counter" || m.type === "claim") && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, paddingBottom: 6, borderBottom: "1px solid " + (isBuyer ? C.fawn : (isAI ? C.ai + "20" : "rgba(255,255,255,0.25)")) }}>
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
          <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash, marginTop: 3, textAlign: isBuyer ? "left" : "right", marginLeft: 2, marginRight: 2 }}>{m.time}</p>
          {/* BUG-055.1 — Legacy in-bubble Accept/Counter/Decline buttons
              REMOVED. They were keyed on message id and routed through
              `submitCounter(m.id)` which 404'd against the new claim-id
              endpoints. The single top-of-chat action banner now handles
              all negotiation. */}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: isMobile ? "100%" : 1160, margin: "0 auto" }}>
      {/* Page header — hidden on mobile when inside a thread so the conversation gets full screen */}
      {(!isMobile || !mobileViewingId) && (
      <div style={{ padding: isMobile ? "12px 0 8px" : "14px 0 10px", position: "relative", marginBottom: isMobile ? 2 : 4 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 16 }}>
          <div style={{ width: isMobile ? 42 : 48, height: isMobile ? 42 : 48, borderRadius: isMobile ? 12 : 14, background: C.aiMist, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, boxShadow: "0 2px 0 " + C.fawn }}>
            <MessageSquare size={isMobile ? 18 : 20} style={{ color: C.ai }} strokeWidth={2.2}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: F.head, fontSize: isMobile ? 24 : 30, fontWeight: 900, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 4 }}>Conversations</h1>
            <p style={{ fontFamily: F.body, fontSize: isMobile ? 12.5 : 14, fontWeight: 500, color: C.mink, lineHeight: 1.45, maxWidth: 560 }}>
              {needsAction > 0 ? needsAction + " need" + (needsAction === 1 ? "s" : "") + " your attention · " : ""}
              {unreadCount > 0 ? unreadCount + " unread · " : ""}
              {conversations.length} active thread{conversations.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>
      )}

      {/* Success toast — celebration banner when an offer/counter is accepted. */}
      {successMsg && (
        <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: C.greenMist, border: "1px solid " + C.green + "44", marginBottom: 16, boxShadow: "0 2px 0 " + C.green + "20" }}>
          <CheckCircle size={18} style={{ color: C.greenDeep }}/>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.greenDeep, fontFamily: F.body, flex: 1 }}>{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={14} style={{ color: C.greenDeep }}/></button>
        </div>
      )}

      {/* Error toast */}
      {errorMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, backgroundColor: C.claretMist, border: "1px solid " + C.claret + "33", marginBottom: 16 }}>
          <AlertCircle size={18} style={{ color: C.claret }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: C.claret, fontFamily: F.body, flex: 1 }}>{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={14} style={{ color: C.claret }} /></button>
        </div>
      )}

      {/* Loading indicator while inbox fetches */}
      {usingBackend && loading && (
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: C.ash, fontFamily: F.body }}>Loading conversations…</p>
        </div>
      )}

      {/* BUG-088 — the All / Claims / Offers / Q&A filter row was removed.
          It looked functional but couldn't work: adaptSellerConversation
          hardcodes `type: "question"` on every conversation, so Claims and
          Offers were permanently 0 and Q&A was always identical to All.
          Clicking anything either emptied the list or changed nothing.
          To bring it back, first derive a real conversation type (claim when
          the thread has a claim, offer when it has OFFER/COUNTER messages,
          else question) — the chips are the easy half. */}

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
        {/* Conversation list — hidden on mobile when inside a thread */}
        {(!isMobile || !mobileViewingId) && (
        <div style={{
          borderRight: isMobile ? "none" : "1px solid " + C.fawn,
          overflowY: "auto",
          background: isMobile ? C.paper : undefined,
          border: isMobile ? "1.5px solid " + C.fawn : undefined,
          borderRadius: isMobile ? 16 : 0,
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <MessageSquare size={28} style={{ color: C.smoke, marginBottom: 10 }}/>
              <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.mink }}>No threads yet.</p>
            </div>
          ) : filtered.map(c => {
            const isActive = c.id === activeId;
            const meta = statusMeta[c.status] || statusMeta.completed;
            const Ic = meta.icon;
            return (
              <button key={c.id} onClick={() => { setActiveId(c.id); setMobileViewingId(c.id); }} style={{ width: "100%", textAlign: "left", padding: "16px 18px", border: "none", borderBottom: "1px solid " + C.fawn, background: isActive && !isMobile ? C.greenMist + "60" : C.paper, cursor: "pointer", display: "flex", gap: 12, position: "relative" }}>
                {/* Active accent bar — desktop only, left edge */}
                {isActive && !isMobile && (
                  <span style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 3, borderRadius: 999, background: C.green }}/>
                )}
                {c.unread && <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: "0 0 0 3px " + C.greenMist }}/>}
                <div style={{ fontSize: 32, width: 48, height: 48, borderRadius: 12, background: C.sand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid " + C.fawn }}>{c.item.img}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
                    <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.item.title}</p>
                    <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: C.ash, flexShrink: 0 }}>{c.lastTime}</span>
                  </div>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <User size={10}/> {c.buyer.name}
                    <Star size={10} style={{ color: C.amber, marginLeft: 4 }} fill={C.amber}/> {c.buyer.rating.toFixed(1)}
                  </p>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: c.unread ? 700 : 500, color: c.unread ? C.ink : C.mink, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMsg}</p>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.head, fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: meta.bg, color: meta.color, letterSpacing: "0.04em" }}>
                    <Ic size={10}/> {meta.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        )}

        {active && (!isMobile || mobileViewingId) && (
          <div style={{
            display: "flex", flexDirection: "column", minWidth: 0,
            background: C.paper,
            border: isMobile ? "1.5px solid " + C.fawn : undefined,
            borderRadius: isMobile ? 16 : 0,
            overflow: "hidden",
            minHeight: isMobile ? "70vh" : undefined,
            height: isMobile ? "calc(100vh - 200px)" : undefined,
          }}>
            {isMobile && (
              <button onClick={() => setMobileViewingId(null)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", border: "none", borderBottom: "1px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                <ArrowLeft size={14}/> All conversations
              </button>
            )}
            <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", borderBottom: "1px solid " + C.fawn, display: "flex", alignItems: "center", gap: isMobile ? 12 : 14, flexWrap: "wrap" }}>
              <div style={{ fontSize: isMobile ? 26 : 30, width: isMobile ? 40 : 44, height: isMobile ? 40 : 44, borderRadius: 12, background: C.sand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid " + C.fawn }}>{active.item.img}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: F.head, fontSize: isMobile ? 14 : 15, fontWeight: 800, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.item.title}</p>
                <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 10, marginTop: 2, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: F.head, fontSize: isMobile ? 14 : 16, fontWeight: 900, color: C.green }}>${active.item.price}</span>
                  <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, display: "flex", alignItems: "center", gap: 4 }}>
                    <User size={11}/> {active.buyer.name}{!isMobile && active.buyer.hood && (" · " + active.buyer.hood)}
                  </span>
                  {(() => {
                    // Buyer-tier badge based on prior PICKED_UP claims between us.
                    // Friend > 3+ prior (Regular) > 1-2 prior (Repeat) > none (First-time).
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

            {active.pickup && (
              <div style={{ padding: isMobile ? "10px 14px" : "12px 20px", borderBottom: "1px solid " + C.fawn, background: active.status === "pickup-today" ? C.claretMist : C.greenMist, display: "flex", alignItems: "center", gap: 12 }}>
                <Calendar size={isMobile ? 14 : 16} style={{ color: active.status === "pickup-today" ? C.claret : C.greenDeep, flexShrink: 0 }}/>
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

            {/* BUG-055 — In-chat action banner. Two variants based on claim
                status:
                  PROPOSED → amber banner with Accept/Counter/Decline
                  ACCEPTED → emerald banner with Mark Picked up (high-priority
                             orange tint when buyerConfirmedReceiptAt is set —
                             buyer is waiting). */}
            {usingBackend && active && activeClaimByConv[active.id] && (() => {
              const pc = activeClaimByConv[active.id];
              const busy = chatBusyClaimId === pc.id;
              const listed = pc.item?.price ?? 0;
              const isProposed = pc.status === "PROPOSED";
              const isAccepted = pc.status === "ACCEPTED";
              const buyerWaiting = isAccepted && pc.buyerConfirmedReceiptAt;
              // BUG-055.1 — whoever last set the amount cannot accept it.
              // For the seller: action buttons only show when the BUYER made
              // the last offer. Otherwise show a "Waiting for buyer" pill.
              const myTurn = isProposed && pc.lastAmountBy !== myId;

              // Color palette per state.
              const bg     = isProposed ? (C.amberMist || "#fef3c7") : (buyerWaiting ? (C.amberMist || "#fef3c7") : C.greenMist);
              const border = isProposed ? (C.amber || "#f59e0b") + "30" : (buyerWaiting ? (C.amber || "#f59e0b") + "55" : C.green + "30");
              const iconBg = isProposed ? (C.amber || "#f59e0b") : (buyerWaiting ? (C.amber || "#f59e0b") : C.green);
              const titleColor = isProposed ? (C.amberDeep || "#92400e") : (buyerWaiting ? (C.amberDeep || "#92400e") : C.greenDeep);

              return (
                <div style={{ padding: "12px 16px", background: bg, borderBottom: "1px solid " + border }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isProposed ? <DollarSign size={17} style={{ color: "#fff" }}/> : <Check size={17} style={{ color: "#fff" }} strokeWidth={3}/>}
                      </div>
                      <div>
                        <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: titleColor }}>
                          {isProposed
                            ? "Pending offer · $" + pc.amount
                            : buyerWaiting
                              ? "Buyer waiting — confirm pickup · $" + pc.amount
                              : "Accepted · $" + pc.amount + " — pickup pending"}
                        </p>
                        <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, marginTop: 2 }}>
                          {isProposed && pc.amount !== listed && ("Listed at $" + listed + " · ")}
                          {isProposed && pc.amount === listed && "At listed price · "}
                          {isAccepted && (buyerWaiting ? "Buyer confirmed receipt — please mark pickup complete." : "Coordinate pickup in this thread.")}
                          {isProposed && ("expires " + (pc.expiresAt ? new Date(pc.expiresAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "soon"))}
                        </p>
                      </div>
                    </div>
                    {isProposed && !myTurn && (
                      <span style={{ padding: "8px 14px", borderRadius: 999, background: C.paper, color: C.amberDeep, fontFamily: F.head, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, border: "1.5px solid " + C.amber + "40" }}>
                        <Clock size={12}/> Waiting for buyer to respond
                      </span>
                    )}
                    {isProposed && myTurn && (chatCounterMode ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink }}>$</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={chatCounterAmt}
                          onChange={e => setChatCounterAmt(e.target.value)}
                          placeholder={String(Math.max(1, Math.round((pc.amount + listed) / 2)))}
                          autoFocus
                          disabled={busy}
                          style={{ width: 80, padding: "7px 10px", borderRadius: 8, border: "1.5px solid " + C.fawn, fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.ink, outline: "none", background: C.paper }}
                        />
                        <button onClick={() => chatCounterSubmit(pc)} disabled={busy} className="cta-primary" style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontFamily: F.head, fontSize: 11, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>Send</button>
                        <button onClick={() => { setChatCounterMode(false); setChatCounterAmt(""); }} disabled={busy} style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 11, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button onClick={() => chatAccept(pc)} disabled={busy} className="cta-primary" style={{ padding: "8px 14px", borderRadius: 999, border: "none", background: C.green, color: "#fff", fontFamily: F.head, fontSize: 12, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer", boxShadow: "0 2px 0 " + C.greenDeep, display: "flex", alignItems: "center", gap: 5 }}>
                          <Check size={12}/> Accept ${pc.amount}
                        </button>
                        <button onClick={() => { setChatCounterMode(true); setChatCounterAmt(String(Math.max(1, Math.round((pc.amount + listed) / 2)))); }} disabled={busy} style={{ padding: "8px 14px", borderRadius: 999, border: "1.5px solid " + C.green + "55", background: C.paper, color: C.greenDeep, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                          <RefreshCw size={12}/> Counter
                        </button>
                        <button onClick={() => chatDecline(pc)} disabled={busy} style={{ padding: "8px 14px", borderRadius: 999, border: "1.5px solid " + C.claret + "40", background: C.paper, color: C.claret, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>
                          Decline
                        </button>
                      </div>
                    ))}
                    {isAccepted && (
                      <button onClick={() => chatMarkPickedUp(pc)} disabled={busy} className="cta-primary" style={{ padding: "9px 16px", borderRadius: 999, border: "none", background: C.green, color: "#fff", fontFamily: F.head, fontSize: 12, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer", boxShadow: "0 2px 0 " + C.greenDeep, display: "flex", alignItems: "center", gap: 5 }}>
                        <Check size={13} strokeWidth={3}/> Mark Picked up
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            <div style={{ flex: 1, padding: isMobile ? "14px 14px" : "18px 20px", overflowY: "auto", background: C.sand + "60" }}>
              {usingBackend && activeLoading && (
                <p style={{ fontSize: 12, color: C.ash, fontFamily: F.body, textAlign: "center", padding: "20px 0" }}>Loading thread…</p>
              )}
              {!activeLoading && activeMessages.length === 0 && usingBackend && (
                <p style={{ fontSize: 12, color: C.ash, fontFamily: F.body, textAlign: "center", padding: "20px 0" }}>No messages yet — say hello.</p>
              )}
              {activeMessages.map((m, i) => renderMessage(m, i))}
            </div>

            {/* Quick-reply templates — covers the 80% of routine replies in one tap.
                Tapping populates the draft input (instead of sending) so the seller
                can tweak before sending. */}
            <div style={{ borderTop: "1px solid " + C.fawn, background: C.paper }}>
              <div style={{ display: "flex", gap: 6, padding: isMobile ? "10px 12px 0" : "12px 16px 0", overflowX: "auto", scrollbarWidth: "none" }}>
                {[
                  "Yes, still available — when works?",
                  "Sorry, just sold",
                  "Sure, that time works",
                  "Last price is $" + Math.max(1, Math.round((active.item.price || 0) * 0.9)),
                ].map(template => (
                  <button key={template} onClick={() => setDraft(template)} style={{ padding: "6px 12px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.sand, cursor: "pointer", fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {template}
                  </button>
                ))}
              </div>
            {active.item?.status === "SOLD" ? (
              // Pickup complete — conversation locked. Same UX as the buyer
              // side so both parties see the same record-keeping notice.
              <div style={{ padding: "16px 18px", borderTop: "1px solid " + C.fawn, background: C.greenMist + "60", display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle size={18} style={{ color: C.greenDeep, flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.greenDeep, letterSpacing: "0.04em", textTransform: "uppercase" }}>Conversation closed</p>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, marginTop: 2 }}>This item has been picked up. The thread is kept as a record.</p>
                </div>
              </div>
            ) : (
            <div style={{ padding: isMobile ? "10px 12px" : "12px 16px", display: "flex", gap: isMobile ? 8 : 10, alignItems: "center", background: C.paper }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={"Reply to " + active.buyer.name.split(" ")[0] + "..."}
                disabled={sending}
                style={{ flex: 1, minWidth: 0, padding: isMobile ? "9px 12px" : "10px 14px", borderRadius: 999, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.ink, outline: "none", background: C.paper }}
              />
              {!usingBackend && (
                <button title="Let AI respond" disabled style={{ width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, borderRadius: "50%", border: "1.5px solid " + C.ai + "30", background: C.aiMist, cursor: "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: 0.5 }}>
                  <Sparkles size={isMobile ? 14 : 16} style={{ color: C.ai }}/>
                </button>
              )}
              <button onClick={handleSend} disabled={sending || !draft.trim()} style={{ width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, borderRadius: "50%", border: "none", background: C.green, color: "#fff", cursor: (sending || !draft.trim()) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 0 " + C.greenDeep, flexShrink: 0, opacity: (sending || !draft.trim()) ? 0.5 : 1 }}>
                <Send size={isMobile ? 14 : 16}/>
              </button>
            </div>
            )}
            </div>
          </div>
        )}
        {!active && usingBackend && !loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
            <div style={{ textAlign: "center" }}>
              <MessageSquare size={32} style={{ color: "#e2e8f0", marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: C.ash, fontFamily: F.body }}>No conversations yet</p>
              <p style={{ fontSize: 12, color: C.smoke, marginTop: 4, fontFamily: F.body }}>When buyers message you about your items, threads will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Demo pickups kept for /preview/seller-dashboard so the design preview works
// without auth. The wired version below uses these only when no accessToken
// is supplied.
const DEMO_PICKUPS = [
  { id: "demo-p1", e: "\u{1F4FA}", t: "LG 55 inch Smart TV", price: 250, buyer: "James K.", date: "Today", time: "12:00 - 2:00 PM", isToday: true, isPastDue: true, relistsIn: "1h 47m" },
  { id: "demo-p2", e: "\u{1F6CF}\u{FE0F}", t: "Full Bedroom Set", price: 550, buyer: "Sarah M.", date: "Sat, Apr 25", time: "2:00 - 4:00 PM", isToday: false },
  { id: "demo-p3", e: "\u{1F6CB}\u{FE0F}", t: "Sofa Set 3 Seater", price: 480, buyer: "Priya R.", date: "Sun, Apr 26", time: "10:00 AM - 12:00 PM", isToday: false },
  { id: "demo-p4", e: "\u{1F527}", t: "DeWalt Drill Set", price: 65, buyer: "Tom W.", date: "Mon, Apr 27", time: "5:00 - 7:00 PM", isToday: false },
];

const SHORT_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function PickupsView({ onNav, embedded = false, accessToken = null, onChanged = null }) {
  const { isMobile } = useViewport();
  const [ratingItem, setRatingItem] = useState(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingNote, setRatingNote] = useState("");
  const [noShowItem, setNoShowItem] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg]     = useState(null);
  const [loading, setLoading]       = useState(!!accessToken);
  const [busyId, setBusyId]         = useState(null);

  const [pickups, setPickups] = useState(accessToken ? [] : DEMO_PICKUPS);

  // Adapter: backend confirmed claim -> UI pickup shape used by the existing
  // render code. Backend pickupSlot is freeform ("Sat 2pm-4pm"), so we surface
  // it as the schedule string and try to detect "today" by checking whether
  // the slot string starts with today's short day name.
  function adaptPickup(api) {
    if (!api) return null;
    const slot = api.pickupSlot || "";
    const todayName = SHORT_DAY_NAMES[new Date().getDay()];
    const isToday = slot.toLowerCase().startsWith(todayName.toLowerCase());
    return {
      id:      api.id,
      e:       "\u{1F4E6}",
      t:       api.item?.title || "Item",
      price:   (typeof api.amount === "number" ? api.amount : api.item?.price) ?? 0,
      buyer:   api.buyer?.name || api.buyer?.email || "Buyer",
      date:    isToday ? "Today" : (slot.split(/\s+/)[0] || slot),
      time:    isToday ? slot.replace(/^\S+\s*/, "") : slot.replace(/^\S+\s*/, ""),
      isToday,
      // BUG-055 — buyer-side "Confirm receipt" pings the seller. Surfaces
      // as a high-priority badge so the seller knows the buyer is waiting
      // for them to mark the pickup complete.
      buyerConfirmedReceipt: !!api.buyerConfirmedReceiptAt,
    };
  }

  // Fetch confirmed claims on mount when authed. Standalone preview falls back
  // to the demo list defined above.
  const reloadPickups = () => {
    if (!accessToken) return;
    apiRequest("/api/claims/incoming?status=ACCEPTED", { token: accessToken })
      .then(data => {
        const list = Array.isArray(data?.claims) ? data.claims.map(adaptPickup).filter(Boolean) : [];
        setPickups(list);
      })
      .catch(() => {});
  };
  useEffect(() => {
    if (!accessToken) { setPickups(DEMO_PICKUPS); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    apiRequest("/api/claims/incoming?status=ACCEPTED", { token: accessToken })
      .then(data => {
        if (cancelled) return;
        const list = Array.isArray(data?.claims) ? data.claims.map(adaptPickup).filter(Boolean) : [];
        setPickups(list);
      })
      .catch(err => {
        if (cancelled) return;
        setErrorMsg("Couldn't load pickups: " + (err?.message || "try again"));
        setTimeout(() => setErrorMsg(null), 4500);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken]);
  // A buyer cancelled a ACCEPTED claim, or the seller confirmed a new pending
  // one — either way refetch so the scheduled-pickups list stays current.
  useSocketEvent("claim:updated", () => reloadPickups());

  const todayCount = pickups.filter(p => p.isToday).length;
  const upcomingCount = pickups.filter(p => !p.isToday).length;

  function handlePickedUp(item) {
    setRatingItem(item);
    setRatingStars(0);
    setRatingNote("");
  }

  // Backend call after the rating modal closes. Standalone preview (demo IDs
  // or no token) just removes the row locally.
  async function commitPickedUp(item) {
    if (!accessToken || (typeof item.id === "string" && item.id.startsWith("demo-"))) {
      setPickups(prev => prev.filter(p => p.id !== item.id));
      setSuccessMsg("Pickup complete! " + item.t + " marked as picked up.");
      setTimeout(() => setSuccessMsg(null), 4000);
      return;
    }
    setBusyId(item.id);
    const snapshot = pickups;
    setPickups(prev => prev.filter(p => p.id !== item.id));
    // Hard 20s timeout — same defensive measure we added to the offer / claim
    // flows. Without it, if the network or auto-refresh path stalls, the
    // optimistic row stays gone, busyId never clears, and the seller can't
    // mark any more pickups until they refresh the page.
    const pickupTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out. Please try again.")), 20000)
    );
    try {
      await Promise.race([
        apiRequest("/api/claims/" + encodeURIComponent(item.id) + "/picked-up", {
          method: "PATCH",
          token:  accessToken,
        }),
        pickupTimeout,
      ]);
      setSuccessMsg("Pickup complete! " + item.t + " marked as picked up.");
      setTimeout(() => setSuccessMsg(null), 4000);
      // Item flipped to SOLD server-side — refresh the parent's items list.
      if (onChanged) onChanged();
    } catch (err) {
      // eslint-disable-next-line no-console
      if (typeof console !== "undefined") console.error("[PickupsView] picked-up failed:", err);
      setPickups(snapshot);
      setErrorMsg("Mark picked-up failed: " + (err?.message || "try again"));
      setTimeout(() => setErrorMsg(null), 4500);
    } finally {
      setBusyId(null);
    }
  }

  async function submitRating() {
    const item = ratingItem;
    setRatingItem(null);
    if (item) await commitPickedUp(item);
  }

  function handleNoShow(item) {
    setNoShowItem(item);
  }

  async function confirmNoShow() {
    const item = noShowItem;
    setNoShowItem(null);
    if (!item) return;
    // Optimistic — remove from the pickups list immediately. On API failure
    // we restore the row so the seller can retry.
    const snapshot = pickups;
    setPickups(prev => prev.filter(p => p.id !== item.id));
    if (accessToken && item.id) {
      const noShowTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out. Please try again.")), 20000)
      );
      try {
        await Promise.race([
          apiRequest("/api/claims/" + encodeURIComponent(item.id) + "/cancel", {
            method: "PATCH",
            token:  accessToken,
            body:   JSON.stringify({ reason: "no-show" }),
          }),
          noShowTimeout,
        ]);
      } catch (err) {
        // eslint-disable-next-line no-console
        if (typeof console !== "undefined") console.error("[PickupsView] no-show failed:", err);
        setPickups(snapshot);
        setSuccessMsg("Couldn't mark as no-show: " + (err?.message || "try again"));
        setTimeout(() => setSuccessMsg(null), 4000);
        return;
      }
    }
    setSuccessMsg(item.t + " marked as no-show. Item is back on the Shelf — other neighbours can claim it.");
    setTimeout(() => setSuccessMsg(null), 4500);
  }

  async function handleRelease(item) {
    const snapshot = pickups;
    setPickups(prev => prev.filter(p => p.id !== item.id));
    if (accessToken && item.id) {
      const releaseTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out. Please try again.")), 20000)
      );
      try {
        await Promise.race([
          apiRequest("/api/claims/" + encodeURIComponent(item.id) + "/cancel", {
            method: "PATCH",
            token:  accessToken,
            body:   JSON.stringify({ reason: "released-at-pickup" }),
          }),
          releaseTimeout,
        ]);
      } catch (err) {
        // eslint-disable-next-line no-console
        if (typeof console !== "undefined") console.error("[PickupsView] release failed:", err);
        setPickups(snapshot);
        setSuccessMsg("Couldn't release the claim: " + (err?.message || "try again"));
        setTimeout(() => setSuccessMsg(null), 4000);
        return;
      }
    }
    setSuccessMsg(item.t + " released. Back on the Shelf — waitlisted buyers will be notified.");
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  // Release / No-show are now wired to the backend (item #9). Show the
  // buttons in both demo and real mode.
  const showLegacyActions = true;

  return (
    <div>
      {!embedded && <InventoryTabs activeView="orders" onNav={onNav} accessToken={accessToken} />}

      {/* Success toast */}
      {successMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, backgroundColor: C.gLightBg, border: "1px solid " + C.gSoft, marginBottom: 16 }}>
          <CheckCircle size={18} style={{ color: C.gPrimary }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: C.gDark, fontFamily: F.body, flex: 1 }}>{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={14} style={{ color: C.ash }} /></button>
        </div>
      )}

      {/* Error toast */}
      {errorMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, backgroundColor: C.claretMist, border: "1px solid " + C.claret + "33", marginBottom: 16 }}>
          <AlertCircle size={18} style={{ color: C.claret }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: C.claret, fontFamily: F.body, flex: 1 }}>{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={14} style={{ color: C.claret }} /></button>
        </div>
      )}

      {/* Summary strip — 3-up on desktop, stacks vertically on mobile. */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 16 : 20 }}>
        <div style={{ padding: isMobile ? 14 : 16, borderRadius: 14, border: todayCount > 0 ? "2px solid #FECACA" : "1px solid #f0f0f0", backgroundColor: todayCount > 0 ? "#FFF5F5" : "#fff", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: todayCount > 0 ? "#FEF2F2" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MapPin size={18} style={{ color: todayCount > 0 ? "#DC2626" : "#94a3b8" }} />
          </div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 900, color: todayCount > 0 ? "#DC2626" : "#94a3b8", fontFamily: F.head }}>{todayCount}</p>
            <p style={{ fontSize: 11, color: C.ash, fontFamily: F.body }}>Today</p>
          </div>
        </div>
        <div style={{ padding: isMobile ? 14 : 16, borderRadius: 14, border: "1px solid " + C.fawn, background: C.paper, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.gLightBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Calendar size={18} style={{ color: C.gPrimary }} />
          </div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 900, color: C.gPrimary, fontFamily: F.head }}>{upcomingCount}</p>
            <p style={{ fontSize: 11, color: C.ash, fontFamily: F.body }}>Upcoming</p>
          </div>
        </div>
        <div style={{ padding: isMobile ? 14 : 16, borderRadius: 14, border: "1px solid " + C.fawn, background: C.paper, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.oLightBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Package size={18} style={{ color: C.oPrimary }} />
          </div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 900, color: C.oPrimary, fontFamily: F.head }}>{pickups.length}</p>
            <p style={{ fontSize: 11, color: C.ash, fontFamily: F.body }}>Total Pending</p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: C.ash, fontFamily: F.body }}>Loading pickups…</p>
        </div>
      )}

      {/* Pickup items */}
      {!loading && pickups.length === 0 && (
        <div style={{ padding: 60, textAlign: "center" }}>
          <MapPin size={32} style={{ color: "#e2e8f0", marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: C.ash, fontFamily: F.body }}>No pickups scheduled</p>
          <p style={{ fontSize: 12, color: C.smoke, marginTop: 4, fontFamily: F.body }}>When buyers claim items and schedule pickup, they will appear here.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {pickups.map(p => {
          const isBusy = busyId === p.id;
          return (
          <div key={p.id} style={{ padding: isMobile ? "14px 14px" : "16px 18px", borderRadius: 16, border: p.buyerConfirmedReceipt ? "2px solid " + (C.amber || "#f59e0b") : (p.isToday ? "2px solid #FECACA" : "1px solid #f0f0f0"), backgroundColor: p.buyerConfirmedReceipt ? (C.amberMist || "#fef3c7") : (p.isToday ? "#FFF5F5" : "#fff"), opacity: isBusy ? 0.6 : 1 }}>
            {/* BUG-055 — buyer pinged "Confirm receipt" → high-priority badge
                so the seller knows the buyer is waiting for them to mark
                pickup complete. Outranks the "pickup-today" badge. */}
            {p.buyerConfirmedReceipt && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, background: C.amber || "#f59e0b", color: "#fff", fontSize: 10, fontWeight: 800, fontFamily: F.head, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <CheckCircle size={11}/> Buyer waiting — confirm pickup
                </span>
              </div>
            )}
            {!p.buyerConfirmedReceipt && p.isToday && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <StatusBadge status="pickup-today" size="sm"/>
                <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 600, fontFamily: F.body }}>{p.time}</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14, flexWrap: "wrap" }}>
              <div style={{ width: isMobile ? 46 : 52, height: isMobile ? 46 : 52, borderRadius: 14, background: C.sand, border: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 22 : 24, flexShrink: 0 }}>{p.e}</div>
              <div style={{ flex: 1, minWidth: isMobile ? "60%" : 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: F.head, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.t}</p>
                <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 12, color: C.mink, fontFamily: F.body, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><User size={11} /> {p.buyer}</span>
                  <span style={{ fontWeight: 700, color: C.gPrimary }}>${p.price}</span>
                  {!p.isToday && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} /> {p.date}</span>}
                  {!p.isToday && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> {p.time}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, width: isMobile ? "100%" : "auto", marginTop: isMobile ? 8 : 0 }}>
                <button onClick={() => handlePickedUp(p)} disabled={isBusy} className="cta-primary" style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: isBusy ? "not-allowed" : "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 800, background: C.green, color: "#fff", boxShadow: "0 2px 0 " + C.greenDeep, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flex: isMobile ? 1 : "0 0 auto" }}>
                  <Check size={12} strokeWidth={2.8}/> Picked up
                </button>
                {showLegacyActions && (
                  <>
                    <button onClick={() => handleRelease(p)} title="Buyer came, inspected, declined — release immediately" style={{ padding: "8px 12px", borderRadius: 10, border: "1.5px solid " + C.fawn, cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 700, background: C.paper, color: C.mink, flex: isMobile ? 1 : "0 0 auto" }}>
                      Release
                    </button>
                    <button onClick={() => handleNoShow(p)} title="Mark no-show (2h grace before auto-relist)" style={{ padding: "8px 12px", borderRadius: 10, border: "1.5px solid " + C.claret + "25", cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 700, background: C.paper, color: C.claret, flex: isMobile ? 1 : "0 0 auto" }}>
                      No-show
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Rating modal */}
      {ratingItem && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ width: 420, maxWidth: "calc(100% - 32px)", borderRadius: 24, background: C.paper, padding: 28, boxShadow: "0 24px 80px rgba(0,0,0,0.15)" }}>
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
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6, fontFamily: F.body }}>Note (optional)</label>
              <textarea value={ratingNote} onChange={e => setRatingNote(e.target.value)} placeholder="On time, friendly, easy transaction..." style={{ width: "100%", height: 60, padding: 10, borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 12, fontFamily: F.body, resize: "none", outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={submitRating} style={{ flex: 1, padding: "12px 0", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: F.body, backgroundColor: C.gPrimary, color: "#fff" }}>Submit Rating</button>
              <button onClick={submitRating}
                style={{ padding: "12px 20px", borderRadius: 50, border: "1.5px solid #e2e8f0", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: F.body, background: C.paper, color: C.mink }}>Skip</button>
            </div>
          </div>
        </div>
      )}

      {/* No-show confirmation modal */}
      {noShowItem && (
        <div onClick={() => setNoShowItem(null)} style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24, backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} className="fade-in" style={{ width: 460, maxWidth: "100%", borderRadius: 24, background: C.paper, boxShadow: "0 24px 64px rgba(31, 29, 25, 0.2)", overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid " + C.fawn, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: C.claretMist, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <AlertCircle size={18} style={{ color: C.claret }}/>
                </div>
                <div>
                  <h3 style={{ fontFamily: F.head, fontSize: 17, fontWeight: 900, color: C.ink, letterSpacing: "-0.01em" }}>Mark as no-show?</h3>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, marginTop: 2 }}>{noShowItem.buyer} didn\'t pick up {noShowItem.t}.</p>
                </div>
              </div>
              <button onClick={() => setNoShowItem(null)} style={{ background: C.sand, border: "none", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <X size={14} style={{ color: C.mink }}/>
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              <div style={{ padding: "14px 16px", borderRadius: 14, background: C.amberMist, border: "1px solid " + C.amber + "25", display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
                <Clock size={15} style={{ color: C.amberDeep, flexShrink: 0, marginTop: 2 }}/>
                <div>
                  <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.amberDeep, marginBottom: 3 }}>Auto-relists in 2 hours</p>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>We\'ll release {noShowItem.t} automatically so it can be picked up by someone else. {noShowItem.buyer.split(" ")[0]} can still reach out to reschedule before then.</p>
                </div>
              </div>

              <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, lineHeight: 1.5, fontStyle: "italic" }}>Waitlisted buyers will be notified when the item becomes available again.</p>
            </div>

            <div style={{ padding: "14px 24px", borderTop: "1px solid " + C.fawn, background: C.sand, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setNoShowItem(null)} style={{ padding: "10px 20px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmNoShow} className="cta-primary" style={{ padding: "10px 22px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800, background: C.claret, color: "#fff", boxShadow: "0 2px 0 #8B2010", display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={13}/> Mark no-show
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== SELLER HISTORY ============================== */
// Hoisted out of SellerHistoryView so it has a stable component identity
// across renders. Without this, every collapse toggle remounted all rows
// and replayed the fade-in animation, which looked like the list was refreshing.
function HistoryTxRow({ tx, idx, isMobile = false, isOpen = false, onToggle = null, onRateBuyer = null, accessToken = null }) {
  const layerBadge = tx.layer === "drop"
    ? { label: "Drop", bg: C.green, color: "#fff" }
    : { label: "Shelf", bg: C.amber, color: "#fff" };
  // Asking is set by adaptHistory (originalPrice) or in demo data; treat any
  // value <= sold price as "no discount" so we don't show a misleading "$80 → $80".
  const wasDiscounted = typeof tx.asking === "number" && tx.asking > tx.price;
  const handleToggle = () => onToggle && onToggle(tx.id);
  const SoldViaIcon = tx.layer === "drop" ? Calendar : Package;

  return (
    <article
      onClick={handleToggle}
      style={{
        padding: isMobile ? "14px 16px" : "16px 18px",
        borderRadius: isMobile ? 14 : 16,
        background: C.paper,
        border: "1.5px solid " + (isOpen ? C.green + "40" : C.fawn),
        marginBottom: 10,
        cursor: onToggle ? "pointer" : "default",
        transition: "border-color 150ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 14 }}>
        <div style={{ width: isMobile ? 46 : 56, height: isMobile ? 46 : 56, borderRadius: isMobile ? 12 : 14, background: "linear-gradient(135deg, " + C.sand + ", " + C.fawn + ")", border: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 22 : 28, flexShrink: 0 }}>{tx.img}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
            <p style={{ fontFamily: F.head, fontSize: isMobile ? 14 : 15, fontWeight: 800, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isMobile ? "100%" : undefined }}>{tx.title}</p>
            <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 5, background: layerBadge.bg, color: layerBadge.color, letterSpacing: "0.05em", textTransform: "uppercase" }}>{layerBadge.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: F.body, fontSize: isMobile ? 11 : 12, fontWeight: 600, color: C.mink, display: "flex", alignItems: "center", gap: 3 }}><User size={11}/> {tx.buyer}</span>
            {!isMobile && (
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, display: "flex", alignItems: "center", gap: 3 }}><MapPin size={10}/> {tx.hood}</span>
            )}
            <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.ash }}>{new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: isMobile ? undefined : "numeric" })}</span>
          </div>
          <div style={{ display: "flex", gap: 2, marginTop: 6 }}>
            {[1,2,3,4,5].map(n => <Star key={n} size={isMobile ? 12 : 13} style={{ color: n <= tx.rating ? C.amber : C.fawn }} fill={n <= tx.rating ? C.amber : "none"} strokeWidth={n <= tx.rating ? 0 : 1.5}/>)}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span style={{ fontFamily: F.head, fontSize: isMobile ? 18 : 22, fontWeight: 900, color: C.green }}>${tx.price}</span>
          {onToggle && <ChevronDown size={14} style={{ color: C.smoke, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}/>}
        </div>
      </div>

      {/* Expanded detail panel — Sold via, Asking → sold delta, optional buyer review. */}
      {isOpen && (
        <div onClick={e => e.stopPropagation()} style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed " + C.fawn, display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(2, 1fr)", gap: isMobile ? 10 : 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <SoldViaIcon size={10} style={{ color: C.ash }}/>
              <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase" }}>Sold via</span>
            </div>
            <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>{tx.layer === "drop" ? "Saturday Drop" : "Shelf (anytime)"}</p>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <DollarSign size={10} style={{ color: C.ash }}/>
              <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase" }}>Asking &rarr; sold</span>
            </div>
            <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>
              {wasDiscounted ? ("$" + tx.asking + " → $" + tx.price) : ("$" + tx.price + " (full asking)")}
            </p>
          </div>
          {tx.review && (
            <div style={{ gridColumn: "1 / -1", padding: "10px 12px", borderRadius: 10, background: C.sand, border: "1px solid " + C.fawn }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <MessageSquare size={11} style={{ color: C.greenDeep }} strokeWidth={2.3}/>
                <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.greenDeep, letterSpacing: "0.06em", textTransform: "uppercase" }}>{tx.buyer.split(" ")[0]}&rsquo;s review</span>
              </div>
              <p style={{ fontFamily: F.body, fontSize: isMobile ? 12 : 13, fontWeight: 500, color: C.ink, lineHeight: 1.5, fontStyle: "italic" }}>
                &ldquo;{tx.review}&rdquo;
              </p>
            </div>
          )}
          {/* BUG-055 — Rate buyer CTA. Surfaces only on real claims (not demo
              rows) and only when the seller hasn't already rated. Used for
              marketing "X-star community" pitch on buyer profiles. */}
          {accessToken && onRateBuyer && tx.id && typeof tx.id === "string" && tx.id.length > 8 && !tx.sellerRated && (
            <div style={{ gridColumn: "1 / -1", padding: "10px 12px", borderRadius: 10, background: C.amberMist || "#fef3c7", border: "1px solid " + C.amber + "30" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.amberDeep, letterSpacing: "0.04em" }}>Rate {tx.buyer.split(" ")[0]}</p>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, marginTop: 2 }}>Help other sellers — what was the buyer like?</p>
                </div>
                <button onClick={() => onRateBuyer(tx)} className="cta-primary" style={{ padding: "6px 14px", borderRadius: 999, border: "none", background: C.amber, color: "#fff", fontFamily: F.head, fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                  <Star size={12}/> Rate buyer
                </button>
              </div>
            </div>
          )}
          {tx.sellerRated && tx.sellerRating > 0 && (
            <div style={{ gridColumn: "1 / -1", padding: "8px 12px", borderRadius: 10, background: C.greenMist, border: "1px solid " + C.green + "20", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.greenDeep, letterSpacing: "0.04em", textTransform: "uppercase" }}>You rated {tx.buyer.split(" ")[0]}</span>
              <div style={{ display: "flex", gap: 1 }}>
                {[1,2,3,4,5].map(n => <Star key={n} size={11} style={{ color: n <= tx.sellerRating ? C.amber : C.fawn }} fill={n <= tx.sellerRating ? C.amber : "none"}/>)}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// Demo transactions kept around so /preview/seller-dashboard still tells the
// design story without auth. The wired version below uses these only when no
// accessToken is supplied.
const DEMO_HISTORY_TX = [
    { id: "h1", title: "Solid Wood Coffee Table", price: 80,  asking: 95, img: "\uD83E\uDE91", cat: "Furniture",               buyer: "Hassan M.",   hood: "Barrhaven",      date: "2026-04-13", layer: "drop",      rating: 5, review: "Easy meet-up, table was even nicer in person." },
    { id: "h2", title: "Baby Stroller (Graco)",   price: 45,  asking: 45, img: "\uD83D\uDC76", cat: "Kids & Baby",             buyer: "Lindsay P.",  hood: "Bridlewood",     date: "2026-04-13", layer: "drop",      rating: 5, review: "Porch pickup worked great, thanks!" },
    { id: "h3", title: "Yoga Mat Set",            price: 15,  asking: 15, img: "\uD83E\uDDD8", cat: "Sports & Outdoor",        buyer: "Mark T.",     hood: "Barrhaven",      date: "2026-04-06", layer: "shelf",     rating: 4 },
    { id: "h4", title: "Kitchen Mixer",           price: 65,  asking: 80, img: "\uD83E\uDDC1", cat: "Appliances & Kitchen",    buyer: "Jess B.",     hood: "Half Moon Bay",  date: "2026-04-06", layer: "drop",      rating: 5, review: "Works beautifully, super friendly seller." },
    { id: "h5", title: "Garden Tools Lot",        price: 40,  asking: 40, img: "\uD83C\uDF31", cat: "Tools & Garden",          buyer: "Omar K.",     hood: "Stonebridge",    date: "2026-03-22", layer: "drop",      rating: 5 },
    { id: "h6", title: "Bookshelf Pine 5-tier",   price: 35,  asking: 50, img: "\uD83D\uDCDA", cat: "Furniture",               buyer: "Claire Y.",   hood: "Barrhaven",      date: "2026-03-15", layer: "shelf",     rating: 4 },
    { id: "h7", title: "Winter Coats Bundle",     price: 30,  asking: 30, img: "\uD83E\uDDE5", cat: "Clothing & Accessories",  buyer: "Nina S.",     hood: "Barrhaven East", date: "2026-02-22", layer: "drop",      rating: 5, review: "Coats are perfect for my kids, thank you!" },
    { id: "h8", title: "Kids Toy Kitchen Set",    price: 55,  asking: 55, img: "\uD83C\uDF73", cat: "Kids & Baby",             buyer: "Ada R.",      hood: "Barrhaven",      date: "2025-12-14", layer: "drop",      rating: 5 },
    { id: "h9", title: "Christmas Decor Lot",     price: 25,  asking: 25, img: "\uD83C\uDF84", cat: "Other",                   buyer: "Mia L.",      hood: "Bridlewood",     date: "2025-12-14", layer: "drop",      rating: 4 },
];

function SellerHistoryView({ embedded = false, accessToken = null }) {
  const { isMobile } = useViewport();
  const [collapsed, setCollapsed] = useState({});
  const toggleCollapse = (key) => setCollapsed(p => ({ ...p, [key]: !p[key] }));
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const toggleExpand = (id) => setExpandedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const [transactions, setTransactions] = useState(accessToken ? [] : DEMO_HISTORY_TX);
  const [loading, setLoading]           = useState(!!accessToken);
  const [errorMsg, setErrorMsg]         = useState(null);

  // BUG-055 — seller's "Rate buyer" modal state. Opens from the expanded
  // history row's Rate buyer CTA; POSTs to /api/claims/:id/review where the
  // backend writes to sellerReviewX fields (mirrors buyer's buyerReviewX).
  const [rateTx, setRateTx]       = useState(null);
  const [rateStars, setRateStars] = useState(0);
  const [rateNote, setRateNote]   = useState("");
  const openRateBuyer = (tx) => { setRateTx(tx); setRateStars(0); setRateNote(""); };
  const cancelRate    = () => { setRateTx(null); setRateStars(0); setRateNote(""); };
  const submitRate    = async () => {
    if (!rateTx || rateStars < 1) { cancelRate(); return; }
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(rateTx.id) + "/review", {
        method: "POST",
        token:  accessToken,
        body:   JSON.stringify({ rating: rateStars, text: rateNote.trim() || undefined }),
      });
      // Optimistic update — flip the row to sellerRated locally.
      setTransactions(prev => prev.map(t => t.id === rateTx.id ? { ...t, sellerRated: true, sellerRating: rateStars } : t));
    } catch (err) {
      setErrorMsg("Couldn't save rating: " + (err?.message || "try again"));
      setTimeout(() => setErrorMsg(null), 4500);
    }
    cancelRate();
  };

  // Adapter: backend PICKED_UP claim -> UI transaction shape used by the row
  // renderer. BUG-055 — split buyer's review (rating the seller — surfaced
  // as `rating`/`review` for marketing) vs. seller's own rating of the
  // buyer (`sellerRated`/`sellerRating` — drives the "Rate buyer" button).
  function adaptHistory(api) {
    if (!api) return null;
    const placementUi = ENUM_TO_PLACEMENT_LABEL[api.item?.placement] || "drop";
    const soldPrice = typeof api.amount === "number" ? api.amount : (api.item?.price ?? 0);
    const listedPrice = api.item?.price ?? soldPrice;
    return {
      id:     api.id,
      title:  api.item?.title || "Item",
      price:  soldPrice,
      asking: typeof api.item?.originalPrice === "number" ? api.item.originalPrice : listedPrice,
      img:    CATEGORY_EMOJI[api.item?.category] || "\u{1F4E6}",
      cat:    ENUM_TO_CATEGORY_LABEL[api.item?.category] || "Other",
      buyer:  api.buyer?.name || api.buyer?.email || "Buyer",
      hood:   api.buyer?.neighborhood || "—",
      date:   api.pickedUpAt || api.updatedAt || api.createdAt,
      layer:  placementUi === "shelf" ? "shelf" : "drop",
      // Buyer's review of the seller — shown as a testimonial on the row.
      rating: typeof api.buyerReviewRating === "number" ? api.buyerReviewRating : 0,
      review: api.buyerReviewText || null,
      // Seller's review of the buyer — drives "Rate buyer" CTA.
      sellerRated:  typeof api.sellerReviewRating === "number",
      sellerRating: typeof api.sellerReviewRating === "number" ? api.sellerReviewRating : 0,
    };
  }

  useEffect(() => {
    if (!accessToken) { setTransactions(DEMO_HISTORY_TX); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    apiRequest("/api/claims/incoming?status=PICKED_UP", { token: accessToken })
      .then(data => {
        if (cancelled) return;
        const list = Array.isArray(data?.claims) ? data.claims.map(adaptHistory).filter(Boolean) : [];
        setTransactions(list);
      })
      .catch(err => {
        if (cancelled) return;
        setErrorMsg("Couldn't load history: " + (err?.message || "try again"));
        setTimeout(() => setErrorMsg(null), 4500);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken]);

  const totalItems = transactions.length;
  const totalRevenue = transactions.reduce((a, t) => a + t.price, 0);
  const avgRating = totalItems > 0
    ? (transactions.reduce((a, t) => a + t.rating, 0) / totalItems).toFixed(1)
    : "—";
  const co2Kg = Math.round(totalItems * 2.5);

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

  const stats = [
    { label: "Items sold",    value: totalItems,           icon: Package,     color: C.green,     bg: C.greenMist },
    { label: "Total revenue", value: "$" + totalRevenue,   icon: DollarSign,  color: C.amberDeep, bg: C.amberMist },
    { label: "Avg rating",    value: avgRating,            icon: Star,        color: C.amberDeep, bg: C.amberMist },
    { label: "Drops / Shelf", value: transactions.filter(t=>t.layer==="drop").length + "/" + transactions.filter(t=>t.layer==="shelf").length, icon: Package, color: C.green, bg: C.greenMist },
  ];

  // TxRow lives at module scope (see HistoryTxRow below).
  // Hoisting it out of this component prevents React from remounting every
  // row on state changes (collapse toggles), which used to retrigger the
  // fade-in animation and looked like the page was refreshing.

  return (
    <div className="fade-in" style={{ maxWidth: isMobile ? "100%" : 1160, margin: "0 auto" }}>
      {!embedded && (
        <div style={{ padding: isMobile ? "12px 0 8px" : "14px 0 10px", position: "relative", marginBottom: isMobile ? 2 : 4 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 16 }}>
            <div style={{ width: isMobile ? 42 : 48, height: isMobile ? 42 : 48, borderRadius: isMobile ? 12 : 14, background: C.amberMist, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, boxShadow: "0 2px 0 " + C.fawn }}>
              <Award size={isMobile ? 18 : 20} style={{ color: C.amberDeep }} strokeWidth={2.2}/>
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontFamily: F.head, fontSize: isMobile ? 24 : 30, fontWeight: 900, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 4 }}>Sales history</h1>
              <p style={{ fontFamily: F.body, fontSize: isMobile ? 12.5 : 14, fontWeight: 500, color: C.mink, lineHeight: 1.45, maxWidth: 560 }}>{totalItems} completed sale{totalItems !== 1 ? "s" : ""} across Drops and the Shelf.</p>
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {errorMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, backgroundColor: C.claretMist, border: "1px solid " + C.claret + "33", marginBottom: 16 }}>
          <AlertCircle size={18} style={{ color: C.claret }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: C.claret, fontFamily: F.body, flex: 1 }}>{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={14} style={{ color: C.claret }} /></button>
        </div>
      )}

      {/* Stats grid — 4-col on desktop, 2x2 on mobile */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 10 : 14, marginBottom: isMobile ? 18 : 22 }}>
        {stats.map((st, i) => {
          const Ic = st.icon;
          return (
            <div key={i} className="fade-in" style={{ padding: isMobile ? "14px 14px" : "18px 20px", borderRadius: isMobile ? 14 : 18, background: C.paper, border: "1.5px solid " + C.fawn, animationDelay: (i * 40) + "ms" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 8 : 10 }}>
                <div style={{ width: isMobile ? 32 : 38, height: isMobile ? 32 : 38, borderRadius: isMobile ? 10 : 12, background: st.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic size={isMobile ? 14 : 17} style={{ color: st.color }}/>
                </div>
              </div>
              <p style={{ fontFamily: F.head, fontSize: isMobile ? 22 : 26, fontWeight: 900, color: st.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{st.value}</p>
              <p style={{ fontFamily: F.body, fontSize: isMobile ? 11 : 12, fontWeight: 600, color: C.mink, marginTop: 4 }}>{st.label}</p>
            </div>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: C.ash, fontFamily: F.body }}>Loading sales history…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && totalItems === 0 && (
        <div style={{ padding: 60, textAlign: "center" }}>
          <Award size={32} style={{ color: "#e2e8f0", marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: C.ash, fontFamily: F.body }}>No sales yet</p>
          <p style={{ fontSize: 12, color: C.smoke, marginTop: 4, fontFamily: F.body }}>Once a buyer picks up an item from you, it'll show up here.</p>
        </div>
      )}

      {/* Timeline grouped by year/month - collapsible */}
      {!loading && totalItems > 0 && years.map(year => {
        const yearTxs = transactions.filter(t => new Date(t.date).getFullYear() === year);
        const yearRev = yearTxs.reduce((a, t) => a + t.price, 0);
        const months = Object.keys(grouped[year]);
        const yearKey = "year-" + year;
        const yearCollapsed = !!collapsed[yearKey];
        return (
          <section key={year} style={{ marginBottom: isMobile ? 22 : 28 }}>
            <button onClick={() => toggleCollapse(yearKey)} style={{ width: "100%", display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: isMobile ? "10px 0 8px" : "12px 0 10px", marginBottom: yearCollapsed ? 0 : (isMobile ? 12 : 14), borderBottom: "2px solid " + C.fawn, background: "none", border: "none", borderBottomStyle: "solid", cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
                {yearCollapsed ? <ChevronRight size={isMobile ? 16 : 20} style={{ color: C.mink, flexShrink: 0 }}/> : <ChevronDown size={isMobile ? 16 : 20} style={{ color: C.mink, flexShrink: 0 }}/>}
                <h2 style={{ fontFamily: F.head, fontSize: isMobile ? 18 : 22, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em" }}>{year}</h2>
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
                  {!monthCollapsed && monthTxs.map((tx, idx) => <HistoryTxRow key={tx.id} tx={tx} idx={idx} isMobile={isMobile} isOpen={expandedIds.has(tx.id)} onToggle={toggleExpand} onRateBuyer={openRateBuyer} accessToken={accessToken}/>)}
                </div>
              );
            })}
          </section>
        );
      })}

      {/* Community impact */}
      <div style={{ padding: isMobile ? "20px 22px" : "24px 28px", borderRadius: isMobile ? 18 : 22, background: "linear-gradient(135deg, " + C.ink + ", #3A3730)", position: "relative", overflow: "hidden", marginTop: 20 }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }}/>
        <div style={{ display: "flex", alignItems: isMobile ? "stretch" : "center", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: isMobile ? 16 : 20, flexWrap: "wrap", position: "relative" }}>
          <div>
            <p style={{ fontFamily: F.head, fontSize: isMobile ? 15 : 16, fontWeight: 900, color: "#fff", marginBottom: 6 }}>Your community impact</p>
            <p style={{ fontFamily: F.body, fontSize: isMobile ? 12.5 : 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", lineHeight: 1.55, maxWidth: 420 }}>
              You've given <b style={{ color: C.amber }}>{totalItems} items</b> a second home and earned <b style={{ color: C.green }}>${totalRevenue}</b> for your neighbours.
            </p>
          </div>
          <div style={{ display: "flex", gap: isMobile ? 10 : 12, flexShrink: 0 }}>
            <div style={{ flex: isMobile ? 1 : "0 0 auto", textAlign: "center", padding: isMobile ? "12px 14px" : "12px 18px", borderRadius: 14, background: "rgba(255,255,255,0.08)", minWidth: isMobile ? 0 : 100 }}>
              <Leaf size={18} style={{ color: C.green, marginBottom: 5 }}/>
              <p style={{ fontFamily: F.head, fontSize: isMobile ? 18 : 20, fontWeight: 900, color: "#fff" }}>{co2Kg}kg</p>
              <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>CO2 saved</p>
            </div>
            <div style={{ flex: isMobile ? 1 : "0 0 auto", textAlign: "center", padding: isMobile ? "12px 14px" : "12px 18px", borderRadius: 14, background: "rgba(255,255,255,0.08)", minWidth: isMobile ? 0 : 100 }}>
              <Award size={18} style={{ color: C.amber, marginBottom: 5 }}/>
              <p style={{ fontFamily: F.head, fontSize: isMobile ? 18 : 20, fontWeight: 900, color: "#fff" }}>{totalItems}</p>
              <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Items rehomed</p>
            </div>
          </div>
        </div>
      </div>

      {/* BUG-055 — Rate buyer modal. Opens from HistoryTxRow's CTA, POSTs to
          /api/claims/:id/review. Backend writes to sellerReviewX fields. */}
      {rateTx && (
        <div onClick={cancelRate} style={{ position: "fixed", inset: 0, background: "rgba(11,47,32,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.paper, borderRadius: 20, padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(11,47,32,0.25)" }}>
            <h3 style={{ fontFamily: F.head, fontSize: 18, fontWeight: 900, color: C.ink, marginBottom: 6 }}>Rate {rateTx.buyer}</h3>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.mink, marginBottom: 16 }}>How was the transaction? Your rating helps other sellers and shows on {rateTx.buyer.split(" ")[0]}&rsquo;s buyer profile.</p>
            <div style={{ display: "flex", gap: 4, marginBottom: 16, justifyContent: "center" }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRateStars(n)} style={{ background: "none", border: "none", padding: 4, cursor: "pointer" }}>
                  <Star size={32} style={{ color: n <= rateStars ? C.amber : C.fawn }} fill={n <= rateStars ? C.amber : "none"} strokeWidth={n <= rateStars ? 0 : 1.5}/>
                </button>
              ))}
            </div>
            <textarea value={rateNote} onChange={e => setRateNote(e.target.value)} placeholder="Optional — share a quick note about the buyer" maxLength={500} rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 13, color: C.ink, resize: "vertical", outline: "none", marginBottom: 16 }}/>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={cancelRate} style={{ padding: "9px 16px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={submitRate} disabled={rateStars < 1} className="cta-primary" style={{ padding: "9px 18px", borderRadius: 999, border: "none", background: rateStars < 1 ? C.fawn : C.green, color: "#fff", fontFamily: F.head, fontSize: 12, fontWeight: 800, cursor: rateStars < 1 ? "not-allowed" : "pointer", boxShadow: rateStars < 1 ? "none" : "0 2px 0 " + C.greenDeep }}>Submit rating</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ITEM DETAIL VIEW — read-only product page opened from My items.
   Shows the live data the seller sees (photos, all metadata, lifecycle)
   without any form fields. "Edit" returns to the edit flow.
   ============================================================ */
function ItemDetailView({ item, onBack, onEdit, accessToken: _accessToken }) {
  const { isMobile } = useViewport();
  // BUG-062 — all hooks MUST be called before any early return. Previously
  // `useState(0)` lived after the `if (!item)` guard, so the hook count
  // changed depending on whether `item` was truthy → "React has detected a
  // change in the order of Hooks called" runtime error + state corruption.
  const [active, setActive] = useState(0);

  if (!item) {
    return (
      <div className="fade-in" style={{ maxWidth: 1160, margin: "0 auto", padding: "14px 0" }}>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", border: "none", background: "transparent", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.mink }}>
          <ArrowLeft size={14}/> Back to My items
        </button>
        <p style={{ marginTop: 16, fontFamily: F.body, fontSize: 13, color: C.mink }}>Item not found.</p>
      </div>
    );
  }

  const photos = Array.isArray(item.photos) ? item.photos.filter(Boolean) : [];
  const hasPhotos = photos.length > 0;
  const hero = hasPhotos ? photos[Math.min(active, photos.length - 1)] : null;

  // Lifecycle pill — mirrors MyItemsView's logic
  const dropIsLive = false;
  const lifecycle =
    item.status === "draft" ? "draft" :
    item.publishedTo === "drop"  && !dropIsLive ? "queued" :
    item.publishedTo === "drop"  &&  dropIsLive ? "live"   :
    item.publishedTo === "shelf" &&  dropIsLive ? "live"   :
    item.publishedTo === "shelf" && !dropIsLive ? "shelf"  : "draft";
  const lcMeta = {
    draft:  { label: "Draft",                         bg: C.sand,      color: C.ash,       border: C.fawn },
    queued: { label: "Queued for Saturday's Drop",   bg: C.amberMist, color: C.amberDeep, border: C.amber + "40" },
    live:   { label: "Live in Drop",                  bg: C.greenMist, color: C.greenDeep, border: C.green + "40" },
    shelf:  { label: "On the Shelf",                  bg: C.sand,      color: C.ink,       border: C.smoke },
  }[lifecycle];

  return (
    <div className="fade-in" style={{ maxWidth: isMobile ? "100%" : 1160, margin: "0 auto" }}>
      {/* Header strip — wraps to a second row on mobile so the Edit CTA stays reachable. */}
      <div style={{ padding: isMobile ? "8px 0 12px" : "10px 0 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: isMobile ? 10 : 16, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", border: "none", background: "transparent", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.mink }}>
          <ArrowLeft size={14}/> Back to My items
        </button>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.head, fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 999, background: lcMeta.bg, color: lcMeta.color, border: "1px solid " + lcMeta.border, letterSpacing: "0.06em" }}>
            {lcMeta.label}
          </span>
          {item.isBundle && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.head, fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 999, background: C.tealMist || C.greenMist, color: C.teal || C.greenDeep, border: "1px solid " + (C.teal || C.greenDeep) + "30", letterSpacing: "0.04em" }}>
              <Package size={10} strokeWidth={2.4}/> Bundle of {item.bundleCount || (item.bundleContents || []).length || 2}
            </span>
          )}
          <button
            onClick={onEdit}
            className="cta-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800, background: C.green, color: "#fff", boxShadow: "0 2px 0 " + C.greenDeep }}
          >
            Edit item
          </button>
        </div>
      </div>

      {/* Title + meta */}
      <div style={{ marginBottom: isMobile ? 14 : 18 }}>
        <h1 style={{ fontFamily: F.head, fontSize: isMobile ? 22 : 30, fontWeight: 900, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.05 }}>{item.t}</h1>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", fontFamily: F.body, fontSize: 13, color: C.mink }}>
          <span style={{ fontFamily: F.head, fontWeight: 900, fontSize: isMobile ? 19 : 22, color: C.green }}>${item.price}</span>
          <span>·</span>
          <span>{item.cat}</span>
          <span>·</span>
          <span>{item.cond}</span>
          {item.views > 0 && (<><span>·</span><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Eye size={11}/> {item.views} views</span></>)}
          {item.saves > 0 && (<><span>·</span><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Heart size={11}/> {item.saves} saves</span></>)}
        </div>
      </div>

      {/* Body grid — photos | details on desktop, stacked single-column on mobile. */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 0.9fr) minmax(0, 1.1fr)", gap: isMobile ? 16 : 24, alignItems: "start" }}>
        {/* Photos */}
        <div>
          <div style={{ position: "relative", aspectRatio: "4 / 3", width: "100%", borderRadius: 18, overflow: "hidden", border: "1px solid " + C.fawn, background: "linear-gradient(135deg, " + C.sand + ", " + C.fawn + ")", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {hero ? (
              <img src={hero} alt={item.t} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
            ) : (
              <span style={{ fontSize: 96 }}>{item.e}</span>
            )}

            {/* Prev / next overlay buttons (only when there's more than one photo) */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActive(a => (a - 1 + photos.length) % photos.length)}
                  aria-label="Previous photo"
                  style={{
                    position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)",
                    width: 34, height: 34, borderRadius: "50%",
                    border: "none", cursor: "pointer",
                    background: "rgba(255, 255, 255, 0.94)",
                    boxShadow: "0 4px 12px rgba(31, 29, 25, 0.18)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "transform 150ms ease, background 150ms ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "translateY(-50%) scale(1.06)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.94)"; e.currentTarget.style.transform = "translateY(-50%) scale(1)"; }}
                >
                  <ChevronLeft size={17} style={{ color: C.ink }} strokeWidth={2.5}/>
                </button>
                <button
                  type="button"
                  onClick={() => setActive(a => (a + 1) % photos.length)}
                  aria-label="Next photo"
                  style={{
                    position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)",
                    width: 34, height: 34, borderRadius: "50%",
                    border: "none", cursor: "pointer",
                    background: "rgba(255, 255, 255, 0.94)",
                    boxShadow: "0 4px 12px rgba(31, 29, 25, 0.18)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "transform 150ms ease, background 150ms ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "translateY(-50%) scale(1.06)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.94)"; e.currentTarget.style.transform = "translateY(-50%) scale(1)"; }}
                >
                  <ChevronRight size={17} style={{ color: C.ink }} strokeWidth={2.5}/>
                </button>

                {/* Position counter, bottom-right */}
                <div style={{
                  position: "absolute", bottom: 12, right: 12,
                  padding: "4px 10px", borderRadius: 999,
                  background: "rgba(31, 29, 25, 0.62)",
                  fontFamily: F.head, fontSize: 11, fontWeight: 800, color: "#fff",
                  letterSpacing: "0.04em",
                }}>
                  {Math.min(active, photos.length - 1) + 1} / {photos.length}
                </div>
              </>
            )}
          </div>
          {photos.length > 1 && (
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {photos.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  style={{ width: 54, height: 54, borderRadius: 9, overflow: "hidden", border: "2px solid " + (i === active ? C.green : C.fawn), padding: 0, cursor: "pointer", background: C.paper }}
                >
                  <img src={url} alt={"Photo " + (i + 1)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <DetailSection title="Description">
            <p style={{ fontFamily: F.body, fontSize: 13.5, fontWeight: 500, color: C.ink, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {item.description || item.desc || item.longDesc || <span style={{ color: C.ash }}>No description provided.</span>}
            </p>
          </DetailSection>

          <DetailSection title="At a glance">
            <DetailRow label="Category" value={item.cat}/>
            <DetailRow label="Condition" value={item.cond}/>
            <DetailRow label="Price" value={"$" + item.price}/>
            <DetailRow label="Placement" value={
              item.publishedTo === "drop" ? "Weekend Drop" :
              item.publishedTo === "shelf" ? "The Shelf" :
              item.status === "draft" ? "Draft" : "—"
            }/>
            {item.raw?.paymentMethod && (
              <DetailRow label="Payment" value={String(item.raw.paymentMethod).toLowerCase()}/>
            )}
            {item.raw?.zone && (
              <DetailRow label="Zone" value={item.raw.zone}/>
            )}
          </DetailSection>

          {item.isBundle && (item.bundleContents || []).length > 0 && (
            <DetailSection title={"Bundle contents · " + (item.bundleCount || item.bundleContents.length) + " items"}>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {item.bundleContents.map((line, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink }}>
                    <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: "50%", background: C.teal || C.greenDeep, marginTop: 7 }}/>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          {(item.raw?.pickupMode || (item.raw?.pickupDays && item.raw.pickupDays.length > 0) || (item.raw?.pickupWindows && item.raw.pickupWindows.length > 0)) && (
            <DetailSection title="Pickup">
              {item.raw?.pickupMode && <DetailRow label="Mode" value={String(item.raw.pickupMode)}/>}
              {Array.isArray(item.raw?.pickupDays) && item.raw.pickupDays.length > 0 && (
                <DetailRow label="Days" value={item.raw.pickupDays.join(", ")}/>
              )}
              {Array.isArray(item.raw?.pickupWindows) && item.raw.pickupWindows.length > 0 && (
                <DetailRow label="Windows" value={item.raw.pickupWindows.join(", ")}/>
              )}
              {Array.isArray(item.raw?.pickupCustomDates) && item.raw.pickupCustomDates.length > 0 && (
                <DetailRow label="Dates" value={item.raw.pickupCustomDates.map(formatPickupDateLong).join(", ")}/>
              )}
            </DetailSection>
          )}

          {item.raw?.createdAt && (
            <DetailSection title="Timeline">
              <DetailRow label="Listed" value={new Date(item.raw.createdAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}/>
              {item.raw?.updatedAt && item.raw.updatedAt !== item.raw.createdAt && (
                <DetailRow label="Updated" value={new Date(item.raw.updatedAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}/>
              )}
            </DetailSection>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section style={{ borderRadius: 14, border: "1px solid " + C.fawn, background: C.paper, padding: "14px 16px" }}>
      <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 900, color: C.mink, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 10 }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "4px 0" }}>
      <span style={{ minWidth: 100, fontFamily: F.head, fontSize: 10.5, fontWeight: 800, color: C.ash, letterSpacing: "0.14em", textTransform: "uppercase", paddingTop: 2 }}>
        {label}
      </span>
      <span style={{ flex: 1, fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink, wordBreak: "break-word" }}>
        {value}
      </span>
    </div>
  );
}

function EditItemView({ onBack, editingItem, aiSettings = {}, accessToken = null, onItemsChange = null }) {
  const { isMobile } = useViewport();
  const item = editingItem || {
    t: "LG 55 inch Smart TV",
    description: "4K UHD, 2022 model. Minor scratch on bezel. Remote included.",
    cat: "Electronics",
    cond: "Used - Good",
    price: 250,
    status: "published",
    publishedTo: "shelf",
    e: "\u{1F4FA}",
    photos: [],
    raw: { paymentMethod: "EITHER" },
  };

  const cats  = ["Furniture", "Electronics", "Appliances & Kitchen", "Clothing & Accessories", "Kids & Baby", "Sports & Outdoor", "Tools & Garden", "Home Décor", "Books, Games & Hobbies", "Collectibles & Antiques", "Other"];
  const conds = ["New", "Used - Like New", "Used - Good", "Used - Fair"];

  // ── State (initialised from the editing item) ─────────────────
  const [title, setTitle] = useState(item.t || "");
  const [desc, setDesc] = useState(item.description || item.desc || "");
  const [cat, setCat] = useState(item.cat || "");
  const [cond, setCond] = useState(item.cond || "");
  const [price, setPrice] = useState(item.price ?? "");
  const initialPayment = (() => {
    const raw = item.raw?.paymentMethod;
    if (raw === "CASH") return "cash";
    if (raw === "ETRANSFER") return "etransfer";
    if (raw === "EITHER") return "either";
    return aiSettings.paymentMethod || "either";
  })();
  const [paymentMethod, setPaymentMethod] = useState(initialPayment);

  // Photos — keep ManualItemForm's { id, key, preview, uploading } shape so the
  // S3 uploader is identical. Existing photos are seeded as already-uploaded.
  const [photos, setPhotos] = useState(() => {
    const existing = Array.isArray(item.photos) ? item.photos.filter(Boolean) : [];
    return existing.map((url, i) => ({
      id: `existing-${i}-${url}`,
      key: url,
      preview: url,
      uploading: false,
    }));
  });

  // Pickup — seed from raw item data if present.
  const initialPickup = item.raw || {};
  const [showPickup, setShowPickup] = useState(
    !!(initialPickup.pickupMode || (initialPickup.pickupDays && initialPickup.pickupDays.length) || (initialPickup.pickupCustomDates && initialPickup.pickupCustomDates.length))
  );
  const [pickupMode, setPickupMode] = useState(initialPickup.pickupMode || "flexible");
  const [pickupDays, setPickupDays] = useState(Array.isArray(initialPickup.pickupDays) ? initialPickup.pickupDays : []);
  const [pickupCustom, setPickupCustom] = useState(Array.isArray(initialPickup.pickupCustomDates) ? initialPickup.pickupCustomDates : []);
  const [pickupNewDate, setPickupNewDate] = useState("");
  const [pickupDateError, setPickupDateError] = useState("");
  const [pickupWindows, setPickupWindows] = useState(
    Array.isArray(initialPickup.pickupWindows) && initialPickup.pickupWindows.length > 0
      ? initialPickup.pickupWindows
      : ["morning", "afternoon"]
  );
  function togDay(d) { setPickupDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]); }
  function togWin(w) { setPickupWindows(p => p.includes(w) ? p.filter(x => x !== w) : [...p, w]); }
  // BUG-095 — reject past dates. The input's min attribute blocks the picker, but
  // a typed/pasted value still reaches here, so this is the real client guard.
  function addPickupDate() {
    if (!pickupNewDate) return;
    if (isPastISODate(pickupNewDate)) {
      setPickupDateError("Pick-up dates can't be in the past.");
      return;
    }
    setPickupDateError("");
    if (!pickupCustom.includes(pickupNewDate)) {
      setPickupCustom(p => [...p, pickupNewDate]);
    }
    setPickupNewDate("");
  }

  const [showPayment, setShowPayment] = useState(false);
  // Bundle — seed from raw item data so an existing bundle reopens populated.
  const [showBundle, setShowBundle] = useState(!!initialPickup.isBundle);
  const [isBundle, setIsBundle] = useState(!!initialPickup.isBundle);
  const [bundleContents, setBundleContents] = useState(() => {
    const seed = Array.isArray(initialPickup.bundleContents) && initialPickup.bundleContents.length > 0
      ? initialPickup.bundleContents
      : [""];
    return seed;
  });
  function updateBundleLine(i, v) {
    setBundleContents(prev => prev.map((x, idx) => idx === i ? v : x));
  }
  function addBundleLine() {
    setBundleContents(prev => prev.length >= 20 ? prev : [...prev, ""]);
  }
  function removeBundleLine(i) {
    setBundleContents(prev => prev.length <= 1 ? [""] : prev.filter((_, idx) => idx !== i));
  }
  const [showDelete, setShowDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const fileInputRef = useRef(null);

  const MAX_PHOTOS = 5;

  // ── Lifecycle pill + advisory note (preserve from old EditItemView) ──
  const dropIsLive = false;
  const lifecycle =
    item.status === "draft" ? "draft" :
    item.publishedTo === "drop"  && !dropIsLive ? "queued" :
    item.publishedTo === "drop"  &&  dropIsLive ? "live"   :
    item.publishedTo === "shelf" &&  dropIsLive ? "live"   :
    item.publishedTo === "shelf" && !dropIsLive ? "shelf"  : "draft";
  const lcMeta = {
    draft:  { label: "Draft",                      color: C.ash,       bg: C.sand,      border: C.fawn,         note: null },
    queued: { label: "Queued for Saturday's Drop", color: C.amberDeep, bg: C.amberMist, border: C.amber + "30", note: "This item is queued — edits apply before it goes live Saturday." },
    live:   { label: "Live in Drop",               color: C.greenDeep, bg: C.greenMist, border: C.green + "40", note: "This item is live right now. Changes take effect immediately — price changes apply at the next Drop reset." },
    shelf:  { label: "On the Shelf",               color: C.ink,       bg: C.sand,      border: C.smoke,        note: "This item is on the Shelf. Changes take effect immediately." },
  };
  const meta = lcMeta[lifecycle];

  // ── Photo uploader (identical to ManualItemForm) ──────────────
  function openFilePicker() {
    if (submitting) return;
    fileInputRef.current && fileInputRef.current.click();
  }
  async function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setSubmitError(null);
    for (const file of files) {
      if (photos.length + 1 > MAX_PHOTOS) {
        setSubmitError("You can upload up to " + MAX_PHOTOS + " photos.");
        break;
      }
      const tempId = "tmp-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
      const localPreview = URL.createObjectURL(file);
      setPhotos(prev => [...prev, { id: tempId, key: null, preview: localPreview, uploading: true }]);
      try {
        const { key, publicUrl } = await uploadItemPhoto(file);
        setPhotos(prev => prev.map(p => p.id === tempId ? { id: key, key, preview: publicUrl, uploading: false } : p));
      } catch (err) {
        setPhotos(prev => prev.filter(p => p.id !== tempId));
        URL.revokeObjectURL(localPreview);
        setSubmitError(err && err.message ? err.message : "Photo upload failed. Please try again.");
      }
    }
  }
  function removePhoto(id) {
    setPhotos(prev => {
      const target = prev.find(p => p.id === id);
      if (target && target.preview && target.preview.startsWith("blob:")) URL.revokeObjectURL(target.preview);
      return prev.filter(p => p.id !== id);
    });
  }
  // Reorder helpers — the first photo is the cover. movePhoto swaps two
  // adjacent items; setAsCover splices the chosen index to the front.
  function movePhoto(idx, delta) {
    setPhotos(prev => {
      const next = idx + delta;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  }
  function setAsCover(idx) {
    setPhotos(prev => {
      if (idx <= 0 || idx >= prev.length) return prev;
      const copy = [...prev];
      const [target] = copy.splice(idx, 1);
      copy.unshift(target);
      return copy;
    });
  }

  // True when we have a real backend item to edit (cuid id passed in).
  function isRealItem() {
    if (!accessToken) return false;
    if (!editingItem || !editingItem.id) return false;
    if (typeof editingItem.id === "string" && editingItem.id.startsWith("demo-")) return false;
    return true;
  }

  async function handleSave() {
    if (submitting) return;
    setSubmitError(null);

    if (!title || String(title).trim().length < 2) return setSubmitError("Title must be at least 2 characters.");
    if (!desc  || String(desc).trim().length < 10) return setSubmitError("Description must be at least 10 characters.");
    if (!cat)  return setSubmitError("Pick a category.");
    if (!cond) return setSubmitError("Pick a condition.");
    // Accept 0 — sellers list "Free pile" giveaways at $0. The empty-string
    // case still needs to be caught, so we parse explicitly first.
    const numericPrice = parseFloat(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) return setSubmitError("Enter a price (0 for a free giveaway).");
    if (numericPrice > 100000) return setSubmitError("Price seems too high — double-check the value.");
    if (photos.some(p => p.uploading)) return setSubmitError("Wait for photos to finish uploading.");

    const photoKeys = photos.map(p => p.key).filter(Boolean);
    const pickupPayload = showPickup
      ? {
          pickupMode,
          pickupDays:        pickupDays,
          pickupCustomDates: pickupCustom,
          pickupWindows:     pickupWindows,
        }
      : {};
    const cleanedBundle = bundleContents.map(s => String(s).trim()).filter(Boolean).slice(0, 20);
    const bundlePayload = isBundle
      ? { isBundle: true, bundleCount: cleanedBundle.length || 2, bundleContents: cleanedBundle }
      : { isBundle: false, bundleCount: 0, bundleContents: [] };

    // Standalone preview / demo: skip API, show success.
    if (!isRealItem()) {
      setSaved(true);
      setTimeout(() => onBack(), 1200);
      return;
    }

    setSubmitting(true);
    try {
      // BUG-067 — capture the backend's PATCH response so we get the
      // SERVER-RESOLVED photo URLs. Previously we were writing photoKeys
      // (a mix of full URLs for existing photos + bare S3 keys for newly
      // uploaded ones) back into local state, which made newly-uploaded
      // photos render as broken (browser treated "items/abc/new.jpg" as a
      // relative URL). The PATCH response runs withResolvedPhotos on the
      // backend, returning every photo as a full URL — use those.
      const resp = await apiRequest("/api/items/" + encodeURIComponent(editingItem.id), {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify({
          title:         String(title).trim(),
          description:   String(desc).trim(),
          category:      CATEGORY_TO_ENUM[cat] || "OTHER",
          condition:     CONDITION_TO_ENUM[cond] || "GOOD",
          price:         numericPrice,
          photos:        photoKeys.length > 0 ? photoKeys : undefined,
          paymentMethod: PAYMENT_TO_ENUM[paymentMethod] || "EITHER",
          ...pickupPayload,
          ...bundlePayload,
        }),
      });
      const serverPhotos = Array.isArray(resp?.item?.photos) ? resp.item.photos : null;
      if (typeof onItemsChange === "function") {
        onItemsChange((prev) => prev.map((p) => p.id === editingItem.id
          ? { ...p,
              title:         String(title).trim(),
              description:   String(desc).trim(),
              category:      CATEGORY_TO_ENUM[cat] || p.category,
              condition:     CONDITION_TO_ENUM[cond] || p.condition,
              price:         numericPrice,
              // Prefer the server-resolved URLs over our raw key list. Fall
              // back to the raw list only if the response shape ever changes.
              photos:        serverPhotos || (photoKeys.length > 0 ? photoKeys : p.photos),
              paymentMethod: PAYMENT_TO_ENUM[paymentMethod] || p.paymentMethod,
              isBundle:       bundlePayload.isBundle,
              bundleCount:    bundlePayload.bundleCount,
              bundleContents: bundlePayload.bundleContents,
            }
          : p));
      }
      setSaved(true);
      setTimeout(() => onBack(), 1200);
    } catch (err) {
      setSubmitError(err && err.message ? err.message : "Could not save changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!isRealItem()) {
      setShowDelete(false);
      setDeleted(true);
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("/api/items/" + encodeURIComponent(editingItem.id), {
        method: "DELETE",
        token: accessToken,
      });
      if (typeof onItemsChange === "function") {
        onItemsChange((prev) => prev.filter((p) => p.id !== editingItem.id));
      }
      setShowDelete(false);
      setDeleted(true);
    } catch (err) {
      setShowDelete(false);
      setSubmitError(err && err.message ? err.message : "Could not delete the item. Please try again.");
    } finally {
      setSubmitting(false);
    }
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

  // Layout mirrors ManualItemForm exactly: Back button → header row with title
  // + lifecycle pill → optional lifecycle note → 2-col grid (photos left,
  // fields right) → footer action row with Delete + Cancel + Save changes.
  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: C.paper, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#777", fontFamily: F.body, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back
      </button>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: C.ink, fontFamily: F.head }}>Edit Item</h2>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.head, fontSize: 10, fontWeight: 900, padding: "5px 12px", borderRadius: 999, background: meta.bg, color: meta.color, letterSpacing: "0.06em", border: "1px solid " + meta.border }}>
          {meta.label}
        </span>
      </div>

      {meta.note && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderRadius: 14, background: lifecycle === "live" ? C.greenMist : meta.bg, border: "1px solid " + meta.border, marginBottom: 16 }}>
          <Info size={14} style={{ color: meta.color, flexShrink: 0, marginTop: 2 }}/>
          <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.55 }}>{meta.note}</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.4fr", gap: isMobile ? 16 : 20 }}>
        {/* Left: Photos (S3 upload) */}
        <div>
          <div style={{ padding: isMobile ? 16 : 20, borderRadius: 16, border: "1px solid " + C.fawn, background: C.paper, marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 10, fontFamily: F.body }}>Photos *</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <div onClick={openFilePicker}
              style={{ height: 180, borderRadius: 14, border: "2px dashed #d1d5db", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: submitting ? "not-allowed" : "pointer", background: C.sand, transition: "all 0.2s", opacity: submitting ? 0.6 : 1 }}
              onMouseEnter={e => { if (!submitting) { e.currentTarget.style.borderColor = C.gPrimary; e.currentTarget.style.backgroundColor = C.gLightBg; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.backgroundColor = "#fafafa"; }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.gLightBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Camera size={24} style={{ color: C.gPrimary }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.ink, fontFamily: F.body }}>Drop photos here or click to upload</p>
              <p style={{ fontSize: 11, color: C.ash, fontFamily: F.body }}>JPG, PNG up to 10MB each &middot; max {MAX_PHOTOS} photos</p>
            </div>

            {/* Photo thumbnails */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {photos.map((p, idx) => (
                <div key={p.id} style={{ width: 88, height: 88, borderRadius: 12, border: "1.5px solid " + (idx === 0 ? C.amber : C.gPrimary + "30"), backgroundColor: C.gLightBg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                  {p.preview ? (
                    <img src={p.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: p.uploading ? 0.5 : 1 }}/>
                  ) : (
                    <Camera size={20} style={{ color: C.gPrimary }}/>
                  )}
                  {p.uploading && (
                    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.gPrimary, fontFamily: F.body, background: "rgba(255,255,255,0.6)" }}>
                      Uploading…
                    </span>
                  )}
                  {!p.uploading && idx === 0 && (
                    <span style={{ position: "absolute", top: 4, left: 4, padding: "2px 6px", borderRadius: 999, background: C.amber, color: "#fff", fontFamily: F.head, fontSize: 9, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      Cover
                    </span>
                  )}
                  {!p.uploading && (
                    <button onClick={() => removePhoto(p.id)} aria-label="Remove photo"
                      style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", backgroundColor: "#EF4444", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                      <X size={8} style={{ color: "#fff" }} />
                    </button>
                  )}
                  {!p.uploading && photos.length > 1 && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 4px", background: "rgba(31,29,25,0.55)" }}>
                      <button onClick={() => movePhoto(idx, -1)} disabled={idx === 0} aria-label="Move left"
                        style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: idx === 0 ? "transparent" : "rgba(255,255,255,0.18)", color: "#fff", cursor: idx === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, opacity: idx === 0 ? 0.4 : 1 }}>
                        <ChevronLeft size={11}/>
                      </button>
                      {idx !== 0 ? (
                        <button onClick={() => setAsCover(idx)} aria-label="Set as cover" title="Set as cover"
                          style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: "rgba(240,144,0,0.85)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                          <Star size={10} strokeWidth={2.4}/>
                        </button>
                      ) : <span style={{ width: 18, height: 18 }}/>}
                      <button onClick={() => movePhoto(idx, +1)} disabled={idx === photos.length - 1} aria-label="Move right"
                        style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: idx === photos.length - 1 ? "transparent" : "rgba(255,255,255,0.18)", color: "#fff", cursor: idx === photos.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, opacity: idx === photos.length - 1 ? 0.4 : 1 }}>
                        <ChevronRight size={11}/>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button onClick={openFilePicker} disabled={submitting}
                  style={{ width: 88, height: 88, borderRadius: 12, border: "2px dashed #d1d5db", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: submitting ? "not-allowed" : "pointer", background: C.paper, gap: 2 }}>
                  <Plus size={16} style={{ color: C.smoke }} />
                  <span style={{ fontSize: 8, color: C.smoke, fontFamily: F.body }}>Add</span>
                </button>
              )}
            </div>
            <p style={{ fontSize: 10, color: C.ash, marginTop: 8, fontFamily: F.body }}>The Cover photo is the first one buyers see. Use the arrows to reorder, or the star to promote. Up to {MAX_PHOTOS} photos.</p>
          </div>
        </div>

        {/* Right: Item details */}
        <div style={{ padding: 24, borderRadius: 16, border: "1px solid " + C.fawn, background: C.paper }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6, fontFamily: F.body }}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., IKEA KALLAX Bookshelf - White" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: F.body, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6, fontFamily: F.body }}>Description *</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe condition, dimensions, what is included..." style={{ width: "100%", height: 90, padding: 12, borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: F.body, resize: "none", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6, fontFamily: F.body }}>Category *</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {cats.map(c => (
                  <button key={c} onClick={() => setCat(c)} style={{ padding: "5px 10px", borderRadius: 6, border: "1.5px solid " + (cat === c ? C.gPrimary : "#e2e8f0"), cursor: "pointer", fontSize: 11, fontWeight: cat === c ? 700 : 500, backgroundColor: cat === c ? C.gLightBg : "#fff", color: cat === c ? C.gPrimary : "#64748b", fontFamily: F.body }}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6, fontFamily: F.body }}>Condition *</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {conds.map(c => (
                  <button key={c} onClick={() => setCond(c)} style={{ padding: "6px 10px", borderRadius: 6, border: "1.5px solid " + (cond === c ? C.gPrimary : "#e2e8f0"), cursor: "pointer", fontSize: 10, fontWeight: cond === c ? 700 : 500, backgroundColor: cond === c ? C.gLightBg : "#fff", color: cond === c ? C.gPrimary : "#64748b", fontFamily: F.body }}>{c}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6, fontFamily: F.body }}>Price ($) *</label>
            <input value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" type="number" style={{ width: 160, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 16, fontWeight: 700, fontFamily: F.head, outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Pickup Availability - optional, collapsible (same as ManualItemForm) */}
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
                      <input type="date" min={todayLocalISO()} value={pickupNewDate} onChange={e => { setPickupNewDate(e.target.value); if (pickupDateError) setPickupDateError(""); }}
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
                            <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 700, color: C.greenDeep }}>{formatPickupDateLong(d)}</span>
                            <button onClick={() => setPickupCustom(p => p.filter(x => x !== d))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                              <X size={11} style={{ color: C.greenDeep }}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {pickupDateError && (
                      <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.claret }}>{pickupDateError}</p>
                    )}
                    {pickupCustom.length === 0 && !pickupDateError && (
                      <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, fontStyle: "italic" }}>Add one or more specific dates when you&apos;ll be available.</p>
                    )}
                  </div>
                )}

                {pickupMode === "anytime" && (
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: C.sand, border: "1px solid " + C.fawn, marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <Info size={13} style={{ color: C.mink, flexShrink: 0, marginTop: 1 }}/>
                    <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>Buyers can request any day. You'll confirm via WhatsApp before the pickup is scheduled.</p>
                  </div>
                )}

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

          {/* Bundle marking — same UI as ManualItemForm. */}
          <div style={{ marginBottom: 20, borderRadius: 16, border: "1.5px solid " + (showBundle ? (C.teal || C.greenDeep) + "30" : C.fawn), overflow: "hidden" }}>
            <button type="button" onClick={() => setShowBundle(!showBundle)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", border: "none", cursor: "pointer", background: showBundle ? (C.tealMist || C.greenMist) : C.sand, textAlign: "left", transition: "background 150ms" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Package size={16} style={{ color: showBundle ? (C.teal || C.greenDeep) : C.mink }}/>
                <div>
                  <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: showBundle ? (C.teal || C.greenDeep) : C.ink }}>Bundle of items</p>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink }}>
                    {isBundle
                      ? "Marked as a bundle · " + (bundleContents.filter(s => String(s).trim()).length || 0) + " items listed"
                      : "Selling multiple items together? Tap to add contents."}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: C.mink, transform: showBundle ? "rotate(90deg)" : "rotate(0)", transition: "transform 200ms" }}/>
            </button>
            {showBundle && (
              <div style={{ padding: "16px", background: C.paper, borderTop: "1px solid " + C.fawn }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: isBundle ? 16 : 0 }}>
                  <input type="checkbox" checked={isBundle} onChange={e => setIsBundle(e.target.checked)} style={{ width: 18, height: 18, accentColor: C.teal || C.greenDeep, cursor: "pointer" }}/>
                  <div>
                    <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink }}>Mark this listing as a bundle</p>
                    <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, marginTop: 2, lineHeight: 1.45 }}>Buyers see a &ldquo;Bundle of N&rdquo; pill on the card and the contents list on the detail page.</p>
                  </div>
                </label>
                {isBundle && (
                  <div>
                    <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ash, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>What&rsquo;s in the bundle</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {bundleContents.map((line, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="text"
                            value={line}
                            onChange={e => updateBundleLine(idx, e.target.value)}
                            maxLength={120}
                            placeholder={"Item " + (idx + 1) + " (e.g. \"Queen bed frame\")"}
                            style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.ink, outline: "none", background: C.paper }}
                          />
                          <button type="button" onClick={() => removeBundleLine(idx)} title="Remove" style={{ width: 34, height: 34, borderRadius: 10, border: "1.5px solid " + C.fawn, background: C.paper, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: C.mink }}>
                            <X size={13}/>
                          </button>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={addBundleLine} disabled={bundleContents.length >= 20} style={{ marginTop: 10, padding: "8px 14px", borderRadius: 999, border: "1.5px dashed " + (C.teal || C.greenDeep) + "60", background: C.paper, color: C.teal || C.greenDeep, fontFamily: F.head, fontSize: 12, fontWeight: 800, cursor: bundleContents.length >= 20 ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, opacity: bundleContents.length >= 20 ? 0.5 : 1 }}>
                      <Plus size={13}/> Add another item
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment method - collapsible (same as ManualItemForm) */}
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
                  {[
                    { id: "cash",      label: "Cash only",         icon: DollarSign },
                    { id: "etransfer", label: "e-Transfer only",   icon: Banknote   },
                    { id: "either",    label: "Cash or e-Transfer", icon: Check      },
                  ].map(p => {
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
              </div>
            )}
          </div>

          {/* Error banner */}
          {submitError && (
            <div style={{ padding: "10px 14px", borderRadius: 12, background: C.claretMist, border: "1px solid " + C.claret + "40", marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 8 }}>
              <AlertCircle size={16} style={{ color: C.claret, flexShrink: 0, marginTop: 1 }}/>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.claret, lineHeight: 1.5 }}>{submitError}</p>
            </div>
          )}

          {/* Action row — Delete (left) · Cancel + Save changes (right) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <button onClick={() => setShowDelete(true)} disabled={submitting} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 18px", borderRadius: 999, border: "1.5px solid " + C.claret + "30", cursor: submitting ? "not-allowed" : "pointer", fontFamily: F.head, fontSize: 12, fontWeight: 700, background: C.paper, color: C.claret, opacity: submitting ? 0.6 : 1 }}>
              <X size={13}/> Delete item
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onBack} disabled={submitting} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 20px", borderRadius: 999, border: "1.5px solid " + C.fawn, cursor: submitting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: F.head, background: C.paper, color: C.mink, opacity: submitting ? 0.6 : 1 }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={submitting} className="cta-primary" style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "12px 26px", borderRadius: 999, border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 800, fontFamily: F.head,
                background: C.green, color: "#fff",
                boxShadow: "0 2px 0 " + C.greenDeep,
                opacity: submitting ? 0.6 : 1,
              }}>
                <Check size={15} strokeWidth={2.5}/>
                {submitting ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal — preserved from old EditItemView */}
      {showDelete && (
        <div onClick={() => setShowDelete(false)} style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24, backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} className="fade-in" style={{ width: 440, maxWidth: "100%", borderRadius: 24, background: C.paper, boxShadow: "0 24px 64px rgba(31, 29, 25, 0.2)", overflow: "hidden" }}>
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
              <button onClick={handleDelete} disabled={submitting} className="cta-primary" style={{ padding: "10px 20px", borderRadius: 999, border: "none", cursor: submitting ? "not-allowed" : "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800, background: C.claret, color: "#fff", boxShadow: "0 2px 0 #8B2010", opacity: submitting ? 0.6 : 1 }}>{submitting ? "Deleting…" : "Delete permanently"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PICKUP FORMATTING HELPER — used by AIListingPreviewModal to display
   the seller's configured pickup availability in compact form
   ============================================================ */
function formatPickupSummary(aiSettings) {
  const mode    = aiSettings.pickupMode    || "flexible";
  const days    = aiSettings.pickupDays    || ["Sat", "Sun"];
  const custom  = aiSettings.pickupCustom  || [];
  const windows = aiSettings.pickupWindows || ["morning", "afternoon"];

  let daySummary = "";
  if (mode === "anytime") {
    daySummary = "Any day";
  } else if (mode === "custom") {
    // Shared with the buyer's identical summary. Parsed from calendar parts,
    // not `new Date(d)`, which reads a bare date as UTC midnight and so
    // printed the previous day for every seller in the Americas.
    daySummary = formatPickupDateList(custom);
  } else {
    const weekdays = ["Mon","Tue","Wed","Thu","Fri"];
    const weekend  = ["Sat","Sun"];
    const allDays  = [...weekdays, ...weekend];
    if (days.length === 7) daySummary = "Any day";
    else if (weekend.every(d => days.includes(d)) && weekdays.every(d => !days.includes(d))) daySummary = "Weekends";
    else if (weekdays.every(d => days.includes(d)) && weekend.every(d => !days.includes(d))) daySummary = "Weekdays";
    else if (days.length === 0) daySummary = "By request";
    else daySummary = allDays.filter(d => days.includes(d)).join(" · ");
  }

  const winLabels = { morning: "Mornings", afternoon: "Afternoons", evening: "Evenings" };
  const winSummary = windows.length === 3 ? "Anytime" : windows.map(w => winLabels[w]).join(" · ");
  return { days: daySummary, windows: winSummary };
}

/* ============================================================
   AI LISTING EDIT MODAL — full editable form for an AI-drafted listing
   ============================================================ */
function AIListingEditModal({ item, onClose, onSave, aiSettings = {} }) {
  const floorPct = aiSettings.priceFloor || 80;
  const defaultFloor = Math.round(Number(item.price) * floorPct / 100);

  const [title, setTitle]   = useState(item.t);
  const [longDesc, setLongDesc] = useState(item.longDesc || item.d);
  const [price, setPrice]   = useState(item.price);
  const [floor, setFloor]   = useState(item.floor || "");
  const [retail, setRetail] = useState(item.retail || "");
  const [cond, setCond]     = useState(item.cond);
  const [cat, setCat]       = useState(item.cat);
  const [paymentMethod, setPaymentMethod] = useState(item.paymentMethod || aiSettings.paymentMethod || "either");

  const conditions = ["New", "Used - Like New", "Used - Good", "Used - Fair"];
  const categories = ["Furniture", "Appliances & Kitchen", "Electronics", "Kids & Baby", "Tools & Garden", "Clothing & Accessories", "Sports & Outdoor", "Home Décor", "Other"];

  function handleSave() {
    onSave({ ...item, t: title, longDesc, d: longDesc.slice(0, 80), price, floor: floor ? Number(floor) : item.floor, retail: retail ? Number(retail) : item.retail, cond, cat, paymentMethod });
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 210, padding: 24, backdropFilter: "blur(4px)", overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} className="fade-in" style={{ background: C.paper, borderRadius: 24, width: "100%", maxWidth: 640, boxShadow: "0 24px 64px rgba(31, 29, 25, 0.2)", overflow: "hidden", marginTop: 20, marginBottom: 40 }}>
        {/* Header */}
        <div style={{ padding: "16px 22px", borderBottom: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, " + C.aiMist + ", " + C.paper + ")" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={16} style={{ color: C.ai }}/>
            <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ai, letterSpacing: "0.14em", textTransform: "uppercase" }}>Edit AI listing</span>
          </div>
          <button onClick={onClose} style={{ border: "none", background: C.sand, width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={14} style={{ color: C.mink }}/>
          </button>
        </div>

        <div style={{ padding: "22px 26px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, padding: 14, borderRadius: 14, background: C.sand, border: "1px solid " + C.fawn }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, border: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, background: "linear-gradient(135deg, " + C.sand + ", " + C.aiMist + ")", flexShrink: 0 }}>{item.e}</div>
            <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>Adjust anything the AI got wrong. Changes are saved to this listing only — they won't retrain your AI agent.</p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.ink, outline: "none", background: C.paper, boxSizing: "border-box" }}/>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Description</label>
            <textarea value={longDesc} onChange={e => setLongDesc(e.target.value)} rows={4} style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.ink, outline: "none", resize: "vertical", background: C.paper, boxSizing: "border-box", lineHeight: 1.5 }}/>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Price ($)</label>
              <input type="text" value={price} onChange={e => setPrice(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, outline: "none", background: C.paper, boxSizing: "border-box" }}/>
            </div>
            <div>
              <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Floor ($) <span style={{ color: C.ash, fontWeight: 600 }}>· override</span></label>
              <input type="text" value={floor} onChange={e => setFloor(e.target.value)} placeholder={"Default: $" + defaultFloor} style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, outline: "none", background: C.paper, boxSizing: "border-box" }}/>
              <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash, marginTop: 4, fontStyle: "italic" }}>
                {!floor || Number(floor) === defaultFloor ? "Using your " + floorPct + "% rule (= $" + defaultFloor + ")" : "Custom override · leave blank to use default"}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 12, background: C.sand, border: "1px solid " + C.fawn }}>
            <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Original retail ($) — optional</label>
            <input type="text" value={retail} onChange={e => setRetail(e.target.value)} placeholder="e.g. 79" style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink, outline: "none", background: C.paper, boxSizing: "border-box" }}/>
            <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, marginTop: 6, fontStyle: "italic" }}>Just for your reference when pricing. Buyers won't see this.</p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Payment method</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { id: "cash",      label: "Cash",      icon: DollarSign },
                { id: "etransfer", label: "e-Transfer", icon: Banknote   },
                { id: "either",    label: "Either",    icon: Check      },
              ].map(p => {
                const on = paymentMethod === p.id;
                const Ic = p.icon;
                return (
                  <button key={p.id} type="button" onClick={() => setPaymentMethod(p.id)} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: "1.5px solid " + (on ? C.green : C.fawn), cursor: "pointer", background: on ? C.greenMist : C.paper, color: on ? C.greenDeep : C.mink, fontFamily: F.head, fontSize: 12, fontWeight: on ? 800 : 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all 150ms" }}>
                    <Ic size={13}/> {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
            <div>
              <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Condition</label>
              <select value={cond} onChange={e => setCond(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink, outline: "none", background: C.paper, boxSizing: "border-box", cursor: "pointer" }}>
                {conditions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Category</label>
              <select value={cat} onChange={e => setCat(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink, outline: "none", background: C.paper, boxSizing: "border-box", cursor: "pointer" }}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid " + C.fawn, background: C.sand, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "11px 20px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} className="cta-primary" style={{ padding: "11px 22px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800, background: C.green, color: "#fff", boxShadow: "0 2px 0 " + C.greenDeep, display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={13} strokeWidth={2.8}/> Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   AI LISTING PREVIEW MODAL — mirrors the buyer item detail
   ============================================================ */
function AIListingPreviewModal({ item, onClose, onApprove, onEdit, isApproved, aiSettings = {} }) {
  const pickup = formatPickupSummary(aiSettings);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 200, padding: 24, backdropFilter: "blur(4px)", overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} className="fade-in" style={{ background: C.paper, borderRadius: 24, width: "100%", maxWidth: 640, boxShadow: "0 24px 64px rgba(31, 29, 25, 0.2)", overflow: "hidden", marginTop: 20, marginBottom: 40 }}>
        {/* Header */}
        <div style={{ padding: "16px 22px", borderBottom: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, " + C.aiMist + ", " + C.paper + ")" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={16} style={{ color: C.ai }}/>
            <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ai, letterSpacing: "0.14em", textTransform: "uppercase" }}>AI-drafted preview</span>
          </div>
          <button onClick={onClose} style={{ border: "none", background: C.sand, width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={14} style={{ color: C.mink }}/>
          </button>
        </div>

        <div style={{ padding: "22px 26px" }}>
          {/* Hero image with photo count badge */}
          <div style={{ height: 200, borderRadius: 16, background: "linear-gradient(135deg, " + C.sand + ", " + C.aiMist + ")", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, border: "1px solid " + C.fawn, position: "relative" }}>
            <span style={{ fontSize: 80 }}>{item.e}</span>
            <span style={{ position: "absolute", bottom: 10, left: 10, display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999, background: "rgba(31,29,25,0.75)", color: "#fff", fontFamily: F.head, fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", backdropFilter: "blur(3px)" }}>
              <Camera size={10} strokeWidth={2.2}/> 1 / {item.photos || 3}
            </span>
            <span style={{ position: "absolute", top: 10, right: 10, display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.92)", color: C.ai, fontFamily: F.head, fontSize: 10, fontWeight: 900, letterSpacing: "0.05em", backdropFilter: "blur(3px)", boxShadow: "0 2px 8px rgba(31,29,25,0.08)" }}>
              <Sparkles size={10} strokeWidth={2.4}/> AI-DRAFTED
            </span>
          </div>

          {/* Photo strip — thumbnails of all photos for this item */}
          <div style={{ display: "flex", gap: 5, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
            {Array.from({ length: item.photos || 3 }).map((_, i) => (
              <div key={i} style={{ width: 56, height: 56, borderRadius: 9, background: "linear-gradient(135deg, " + C.sand + ", " + C.aiMist + ")", border: "1.5px solid " + (i === 0 ? C.ai : C.fawn), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, cursor: "pointer", opacity: i === 0 ? 1 : 0.75, transition: "opacity 150ms" }}>{item.e}</div>
            ))}
          </div>

          {/* AI authorship context strip */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: "linear-gradient(135deg, " + C.aiMist + ", " + C.paper + ")", border: "1px dashed " + C.ai + "35", marginBottom: 18 }}>
            <Sparkles size={13} style={{ color: C.ai, flexShrink: 0 }}/>
            <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, flex: 1, lineHeight: 1.5 }}>
              <b style={{ color: C.ai }}>Generated by AI in 4 seconds.</b> Title, description, price suggestion, category, and Q&A drafted from your photos. Review each section below — edit anything that isn\'t right.
            </p>
          </div>

          {/* Title + pills + price */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: F.head, fontSize: 20, fontWeight: 900, color: C.ink, letterSpacing: "-0.01em", marginBottom: 8 }}>{item.t}</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: C.greenMist, color: C.greenDeep }}>{item.cat}</span>
                <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: C.sand, color: C.mink, border: "1px solid " + C.fawn }}>{item.cond}</span>
                {item.paymentMethod && (
                  <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: C.sand, color: C.mink, border: "1px solid " + C.fawn, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {item.paymentMethod === "cash"      && <><DollarSign size={10}/> Cash only</>}
                    {item.paymentMethod === "etransfer" && <><Banknote size={10}/> e-Transfer only</>}
                    {item.paymentMethod === "either"    && <><Check size={10}/> Cash or e-Transfer</>}
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Listing price</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "flex-end" }}>
                <span style={{ fontFamily: F.head, fontSize: 32, fontWeight: 900, color: C.green, letterSpacing: "-0.02em" }}>${item.price}</span>
              </div>
              {item.aiPrice && String(item.aiPrice) === String(item.price) ? (
                <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.ai, marginTop: 3, display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                  <Sparkles size={11}/> AI suggested
                </p>
              ) : item.aiPrice && (
                <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, marginTop: 3, justifyContent: "flex-end", display: "flex" }}>
                  You changed it from AI's ${item.aiPrice}
                </p>
              )}
              {item.floor && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ padding: "6px 10px", borderRadius: 8, background: C.sand, border: "1px solid " + C.fawn, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Shield size={11} style={{ color: C.mink }}/>
                    <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 700, color: C.mink }}>AI won't accept offers below</span>
                    <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 900, color: C.ink }}>${item.floor}</span>
                  </div>
                  <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash, marginTop: 4, fontStyle: "italic", textAlign: "right" }}>
                    {item.floorManuallySet ? "Custom floor for this item" : "Your " + (aiSettings.priceFloor || 80) + "% rule from AI Setup"}
                  </p>
                </div>
              )}
              <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash, marginTop: 6, fontStyle: "italic" }}>Use Edit to change listing price or override the floor.</p>
            </div>
          </div>

          {/* 4-col details grid — mirrors buyer item detail */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 18, marginTop: 14 }}>
            <div style={{ padding: "12px 12px", borderRadius: 14, background: C.paper, border: "1px solid " + C.fawn, textAlign: "center" }}>
              <Shield size={15} style={{ color: C.green, margin: "0 auto 6px", display: "block" }}/>
              <p style={{ fontFamily: F.head, fontSize: 9, fontWeight: 700, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Condition</p>
              <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ink, lineHeight: 1.2 }}>{item.cond}</p>
            </div>
            <div style={{ padding: "12px 12px", borderRadius: 14, background: C.paper, border: "1px solid " + C.fawn, textAlign: "center" }}>
              <MapPin size={15} style={{ color: C.green, margin: "0 auto 6px", display: "block" }}/>
              <p style={{ fontFamily: F.head, fontSize: 9, fontWeight: 700, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Distance</p>
              <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ink, lineHeight: 1.2 }}>~0.4 km</p>
              <p style={{ fontFamily: F.body, fontSize: 8, fontWeight: 600, color: C.ash, marginTop: 2, fontStyle: "italic" }}>varies by buyer</p>
            </div>
            <div style={{ padding: "12px 12px", borderRadius: 14, background: C.paper, border: "1px solid " + C.fawn, textAlign: "center" }}>
              <Calendar size={15} style={{ color: C.green, margin: "0 auto 6px", display: "block" }}/>
              <p style={{ fontFamily: F.head, fontSize: 9, fontWeight: 700, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Pickup</p>
              <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ink, lineHeight: 1.2 }}>{pickup.days}</p>
            </div>
            <div style={{ padding: "12px 12px", borderRadius: 14, background: C.paper, border: "1px solid " + C.fawn, textAlign: "center" }}>
              <Tag size={15} style={{ color: C.green, margin: "0 auto 6px", display: "block" }}/>
              <p style={{ fontFamily: F.head, fontSize: 9, fontWeight: 700, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Category</p>
              <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ink, lineHeight: 1.2 }}>{item.cat.split(" ")[0]}</p>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Description</p>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.ink, lineHeight: 1.65 }}>{item.longDesc || item.d}</p>
          </div>

          {/* Q&A */}
          {item.qa && item.qa.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Prepared answers</p>
              <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, lineHeight: 1.5, marginBottom: 12, fontStyle: "italic" }}>Your AI agent will use these when buyers ask common questions. You can adjust them anytime.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {item.qa.map((qa, i) => (
                  <div key={i} style={{ padding: "12px 14px", borderRadius: 12, background: C.sand, border: "1px solid " + C.fawn }}>
                    <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.ink, marginBottom: 5 }}>“{qa.q}”</p>
                    <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.55 }}>{qa.a}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: C.aiMist + "70", border: "1px dashed " + C.ai + "35", display: "flex", alignItems: "flex-start", gap: 9 }}>
                <Sparkles size={13} style={{ color: C.ai, flexShrink: 0, marginTop: 1 }}/>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ai, marginBottom: 3, letterSpacing: "0.04em" }}>For any other questions</p>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>Your AI agent responds in real time using your item details and your chosen tone. Questions about <b style={{ color: C.ink }}>offers below ${item.floor}</b>, sensitive info, or anything uncertain will be sent to you for review.</p>
                </div>
              </div>
            </div>
          )}

          {/* Buyer preview strip */}
          <div style={{ padding: "14px 16px", borderRadius: 16, background: C.aiMist + "60", border: "1px dashed " + C.ai + "30", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Eye size={15} style={{ color: C.ai, flexShrink: 0, marginTop: 1 }}/>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ai, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Buyer preview</p>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>When live, buyers see a green "Claim now" button at ${item.price}. Pickup shown as <b style={{ color: C.ink }}>{pickup.days}{pickup.windows !== "Anytime" ? " · " + pickup.windows.toLowerCase() : ""}</b>. AI accepts offers at or above ${item.floor}.</p>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid " + C.fawn, background: C.sand, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onEdit} style={{ padding: "11px 20px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            Edit
          </button>
          <button onClick={onApprove} className="cta-primary" style={{ padding: "11px 22px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800, background: isApproved ? C.mink : C.green, color: "#fff", boxShadow: "0 2px 0 " + (isApproved ? C.ash : C.greenDeep), display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={13} strokeWidth={2.8}/> {isApproved ? "Unapprove" : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   AI PHOTO FLOW — upload → clustering → processing → review
   ============================================================ */
function AIPhotoFlow({ onDone, onBack, aiSettings = {} }) {
  const [phase, setPhase] = useState("upload");
  const [pIdx, setPIdx]   = useState(0);

  const floorPct = aiSettings.priceFloor || 80;
  const computeFloor = (price) => Math.round(Number(price) * floorPct / 100);

  const [aiItems, setAiItems] = useState(
    AI_ITEMS.map(it => ({ ...it, aiPrice: it.price, floor: computeFloor(it.price), floorManuallySet: false }))
  );
  const [approvedIds, setApprovedIds] = useState(new Set());
  const [previewItem, setPreviewItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [tempPrice, setTempPrice] = useState("");
  // Per-item publish destination — { [itemId]: "drop" | "shelf" }. Defaults to "drop" if unset.
  const [itemPublishWhen, setItemPublishWhen] = useState({});
  const getPublishWhen = (id) => itemPublishWhen[id] || "drop";
  const setPublishWhen = (id, val) => setItemPublishWhen(prev => ({ ...prev, [id]: val }));

  const toggleApproved = (id) => setApprovedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const approveAll = () => setApprovedIds(new Set(aiItems.map(i => i.id)));

  const saveEdit = (updated) => {
    setAiItems(prev => prev.map(it => {
      if (it.id !== updated.id) return it;
      const computedFloor = computeFloor(updated.price);
      const isOverride = updated.floor && Number(updated.floor) !== computedFloor;
      return { ...updated, aiPrice: it.aiPrice, floor: isOverride ? Number(updated.floor) : computedFloor, floorManuallySet: isOverride };
    }));
    setEditingItem(null);
  };

  const beginPriceEdit = (it) => { setEditingPriceId(it.id); setTempPrice(String(it.price)); };
  const commitPriceEdit = () => {
    const it = aiItems.find(x => x.id === editingPriceId);
    if (it && tempPrice && tempPrice !== String(it.price)) {
      setAiItems(prev => prev.map(x => {
        if (x.id !== editingPriceId) return x;
        const newFloor = x.floorManuallySet ? x.floor : computeFloor(tempPrice);
        return { ...x, price: tempPrice, floor: newFloor };
      }));
    }
    setEditingPriceId(null);
  };
  const revertToAiPrice = (id) => {
    setAiItems(prev => prev.map(x => x.id === id ? { ...x, price: x.aiPrice, floor: x.floorManuallySet ? x.floor : computeFloor(x.aiPrice) } : x));
  };

  // Keep floors in sync if seller adjusts priceFloor% in AI Setup mid-flow
  useEffect(() => {
    setAiItems(prev => prev.map(x => x.floorManuallySet ? x : { ...x, floor: computeFloor(x.price) }));
  }, [floorPct]);

  // Simulate processing progress
  useEffect(() => {
    if (phase === "processing" && pIdx < aiItems.length) {
      const t = setTimeout(() => setPIdx(i => i + 1), 600);
      return () => clearTimeout(t);
    }
    if (phase === "processing" && pIdx >= aiItems.length) {
      const t = setTimeout(() => setPhase("review"), 400);
      return () => clearTimeout(t);
    }
  }, [phase, pIdx, aiItems.length]);

  return (
    <div className="fade-in" style={{ maxWidth: 900, margin: "0 auto", padding: "24px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, " + C.ai + ", #6D28D9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 12px " + C.ai + "35" }}>
            <Sparkles size={20} style={{ color: "#fff" }}/>
          </div>
          <div>
            <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ai, letterSpacing: "0.14em", textTransform: "uppercase" }}>Sell with AI</p>
            <h1 style={{ fontFamily: F.head, fontSize: 22, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em" }}>
              {phase === "upload" ? "Upload photos" : phase === "clustering" ? "Review AI groupings" : phase === "processing" ? "Generating listings..." : "Review and approve"}
            </h1>
          </div>
        </div>
      </div>

      {/* Upload */}
      {phase === "upload" && (
        <div>
          <div onClick={() => setPhase("clustering")}
            style={{ minHeight: 220, borderRadius: 22, border: "2px dashed " + C.ai + "40", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "30px 20px", cursor: "pointer", background: "linear-gradient(135deg, " + C.aiMist + ", " + C.paper + ")", transition: "all 150ms" }}>
            <div style={{ width: 62, height: 62, borderRadius: 18, background: "linear-gradient(135deg, " + C.ai + ", #6D28D9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px " + C.ai + "40" }}>
              <Camera size={28} style={{ color: "#fff" }} strokeWidth={2.2}/>
            </div>
            <p style={{ fontFamily: F.head, fontSize: 17, fontWeight: 900, color: C.ink, letterSpacing: "-0.015em" }}>Drop all your photos here</p>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.mink, textAlign: "center", maxWidth: 420, lineHeight: 1.5 }}>Upload photos of all your items mixed together — <b style={{ color: C.ai }}>AI will figure out which photos belong to which item.</b> JPG or PNG, as many as you like.</p>
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 12, background: C.sand, border: "1px solid " + C.fawn, display: "flex", alignItems: "flex-start", gap: 9 }}>
            <Info size={13} style={{ color: C.mink, flexShrink: 0, marginTop: 1 }}/>
            <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>You'll see how the AI grouped your photos on the next screen — you can split, merge, or move photos before any listings are written.</p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
            <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "none", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.mink, padding: 0 }}>
              <ArrowLeft size={14}/> Back
            </button>
            <button onClick={() => setPhase("clustering")} className="cta-primary" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, background: "linear-gradient(135deg, " + C.ai + ", #6D28D9)", color: "#fff", fontFamily: F.head, boxShadow: "0 2px 0 #5B21B6" }}>
              <Sparkles size={14}/> Use demo photos
            </button>
          </div>
        </div>
      )}

      {/* Clustering */}
      {phase === "clustering" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: "linear-gradient(135deg, " + C.aiMist + ", " + C.paper + ")", border: "1px solid " + C.ai + "25", marginBottom: 18 }}>
            <Sparkles size={16} style={{ color: C.ai, flexShrink: 0 }}/>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.mink, flex: 1 }}>
              <b style={{ color: C.ai }}>Detected {aiItems.length} items from 18 photos.</b> Review each grouping — split if two items got merged, or preview what we\'ll write before generating.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
            {aiItems.map((it, idx) => {
              const photoCount = it.photos || 3;
              return (
                <div key={it.id} style={{ padding: "14px 16px", borderRadius: 16, background: C.paper, border: "1.5px solid " + C.fawn, display: "flex", alignItems: "center", gap: 14 }}>
                  {/* Lead item tile */}
                  <div style={{ width: 56, height: 56, borderRadius: 12, border: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: "linear-gradient(135deg, " + C.sand + ", " + C.aiMist + ")", flexShrink: 0 }}>{it.e}</div>

                  {/* Title + photo thumbs */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, flexWrap: "wrap" }}>
                      <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink, letterSpacing: "-0.005em" }}>{it.t}</p>
                      <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: C.aiMist, color: C.ai, letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Sparkles size={8}/> AI-DETECTED
                      </span>
                    </div>
                    {/* Thumbnail strip — placeholders since we don\'t have real photos, but designed for real ones */}
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      {Array.from({ length: photoCount }).map((_, i) => (
                        <div key={i} style={{ width: 34, height: 34, borderRadius: 7, background: "linear-gradient(135deg, " + C.sand + ", " + C.aiMist + ")", border: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{it.e}</div>
                      ))}
                      <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, marginLeft: 4 }}>{photoCount} photos grouped</span>
                    </div>
                  </div>

                  {/* Per-row actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => alert("Split view: choose which photos to move into a new item.")} title="Split this group into two items" style={{ height: 32, padding: "0 10px", borderRadius: 8, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Plus size={11} strokeWidth={2.5}/> Split
                    </button>
                    <button onClick={() => setPreviewItem(it)} title="Preview the listing the AI will write" style={{ height: 32, padding: "0 10px", borderRadius: 8, border: "1.5px solid " + C.ai + "40", background: C.aiMist, color: C.ai, cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Eye size={11}/> Preview
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: "11px 14px", borderRadius: 12, background: C.sand, border: "1px solid " + C.fawn, display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 20 }}>
            <Info size={13} style={{ color: C.mink, flexShrink: 0, marginTop: 1 }}/>
            <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>If a group looks wrong, use <b style={{ color: C.ink }}>Split</b> to break it apart, or <b style={{ color: C.ink }}>Preview</b> to see what the AI plans to write before committing. You can always edit after generating.</p>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <button onClick={() => setPhase("upload")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 18px", borderRadius: 999, border: "1.5px solid " + C.fawn, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: F.head, background: C.paper, color: C.mink }}>
              <ArrowLeft size={13}/> Re-upload
            </button>
            <button onClick={() => { setPhase("processing"); setPIdx(0); }} className="cta-primary" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, background: "linear-gradient(135deg, " + C.ai + ", #6D28D9)", color: "#fff", fontFamily: F.head, boxShadow: "0 2px 0 #5B21B6" }}>
              <Sparkles size={14}/> Generate {aiItems.length} listings <ArrowRight size={14}/>
            </button>
          </div>
        </div>
      )}

      {/* Processing */}
      {phase === "processing" && (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {aiItems.map((it, i) => {
              const done = i < pIdx;
              const active = i === pIdx;
              return (
                <div key={it.id} style={{ padding: "14px 18px", borderRadius: 14, background: done ? C.greenMist : active ? C.aiMist : C.paper, border: "1.5px solid " + (done ? C.green + "30" : active ? C.ai + "35" : C.fawn), display: "flex", alignItems: "center", gap: 14, transition: "all 300ms" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: C.paper, border: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{it.e}</div>
                  <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.ink, flex: 1 }}>{it.t}</p>
                  {done && <CheckCircle size={18} style={{ color: C.greenDeep }}/>}
                  {active && <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid " + C.ai, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }}/>}
                </div>
              );
            })}
          </div>
          <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
        </div>
      )}

      {/* Review */}
      {phase === "review" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 14, background: "linear-gradient(135deg, " + C.aiMist + ", " + C.paper + ")", border: "1px solid " + C.ai + "25", marginBottom: 18 }}>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.mink }}>
              <b style={{ color: C.ai }}>{aiItems.length} listings created.</b> AI has suggested a price for each — tap the price to change it, or approve to accept the suggestion.
            </p>
            <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.ai }}>{approvedIds.size} / {aiItems.length} approved</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, marginBottom: 22 }}>
            {aiItems.map(it => {
              const isApproved = approvedIds.has(it.id);
              return (
                <div key={it.id} className="fade-in" style={{ padding: "16px 18px", borderRadius: 16, background: C.paper, border: "1.5px solid " + (isApproved ? C.green + "40" : C.fawn), position: "relative", transition: "all 150ms" }}>
                  {isApproved && (
                    <span style={{ position: "absolute", top: 10, right: 10, display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: C.greenMist, color: C.greenDeep, fontFamily: F.head, fontSize: 9, fontWeight: 900, letterSpacing: "0.06em", zIndex: 1 }}>
                      <Check size={9} strokeWidth={3}/> APPROVED
                    </span>
                  )}
                  {/* Hero image with photo count badge */}
                  <div style={{ width: "100%", height: 110, borderRadius: 12, background: "linear-gradient(135deg, " + C.sand + ", " + C.aiMist + ")", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, border: "1px solid " + C.fawn, position: "relative" }}>
                    <span style={{ fontSize: 48 }}>{it.e}</span>
                    <span style={{ position: "absolute", bottom: 7, left: 7, display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 999, background: "rgba(31,29,25,0.75)", color: "#fff", fontFamily: F.head, fontSize: 9, fontWeight: 800, letterSpacing: "0.04em", backdropFilter: "blur(3px)" }}>
                      <Camera size={9} strokeWidth={2.2}/> {it.photos || 3}
                    </span>
                  </div>

                  {/* Title */}
                  <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 7, lineHeight: 1.3 }}>{it.t}</p>

                  {/* Category + condition chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                    <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: C.greenMist, color: C.greenDeep, letterSpacing: "0.04em" }}>{(it.cat || "").split(" ")[0].toUpperCase()}</span>
                    <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: C.sand, color: C.mink, border: "1px solid " + C.fawn, letterSpacing: "0.04em" }}>{(it.cond || "").replace("Used - ", "").toUpperCase()}</span>
                  </div>

                  {/* Description */}
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, lineHeight: 1.5, marginBottom: 10 }}>{it.d}</p>

                  {/* Price cluster with AI suggested / revert */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 12 }}>
                    {editingPriceId === it.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <span style={{ fontFamily: F.head, fontSize: 18, fontWeight: 900, color: C.green }}>$</span>
                        <input type="text" value={tempPrice} autoFocus onChange={e => setTempPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                          onBlur={commitPriceEdit}
                          onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingPriceId(null); }}
                          style={{ width: 68, padding: "3px 6px", borderRadius: 6, border: "1.5px solid " + C.green, fontFamily: F.head, fontSize: 18, fontWeight: 900, color: C.green, outline: "none", background: C.paper, textAlign: "center" }}/>
                      </div>
                    ) : (
                      <button onClick={() => beginPriceEdit(it)} title="Click to change price" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: F.head, fontSize: 20, fontWeight: 900, color: C.green, textDecoration: "underline dotted", textDecorationColor: C.green + "60", textUnderlineOffset: 4, textAlign: "left" }}>
                        ${it.price}
                      </button>
                    )}
                    {editingPriceId !== it.id && (
                      String(it.price) === String(it.aiPrice) ? (
                        <button onClick={() => beginPriceEdit(it)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: F.body, fontSize: 10, fontWeight: 600, color: C.ai, display: "flex", alignItems: "center", gap: 3 }}>
                          <Sparkles size={9}/> AI suggested · tap to adjust
                        </button>
                      ) : (
                        <button onClick={() => revertToAiPrice(it.id)} title="Revert to AI suggestion" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: F.body, fontSize: 10, fontWeight: 600, color: C.mink, display: "flex", alignItems: "center", gap: 3 }}>
                          ↺ Use AI\'s ${it.aiPrice}
                        </button>
                      )
                    )}
                  </div>

                  {/* Action row: Preview + Edit + Approve */}
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={() => setPreviewItem(it)} title="Preview full listing" style={{ height: 32, padding: "0 9px", borderRadius: 9, border: "1.5px solid " + C.ai + "35", background: C.aiMist, color: C.ai, cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <Eye size={11}/> Preview
                    </button>
                    <button onClick={() => setEditingItem(it)} style={{ height: 32, padding: "0 10px", borderRadius: 9, border: "1.5px solid " + C.fawn, background: C.paper, fontFamily: F.head, fontSize: 11, fontWeight: 700, cursor: "pointer", color: C.mink }}>
                      Edit
                    </button>
                    <button onClick={() => toggleApproved(it.id)} style={{ flex: 1, height: 32, padding: "0 10px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 11, fontWeight: 800, background: isApproved ? C.mink : C.green, color: "#fff", boxShadow: "0 2px 0 " + (isApproved ? C.ash : C.greenDeep), display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <Check size={11} strokeWidth={2.8}/> {isApproved ? "Unapprove" : "Approve"}
                    </button>
                  </div>

                  {/* Per-item publish picker — only when approved */}
                  {isApproved && (() => {
                    const pw = getPublishWhen(it.id);
                    return (
                      <div className="fade-in" style={{ marginTop: 10, padding: "8px 4px 0", borderTop: "1px dashed " + C.fawn }}>
                        <p style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Where to publish</p>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button onClick={() => setPublishWhen(it.id, "drop")} title="Queue for Saturday's Drop"
                            style={{ flex: 1, height: 30, borderRadius: 8, border: "1.5px solid " + (pw === "drop" ? C.green : C.fawn), background: pw === "drop" ? C.greenMist : C.paper, color: pw === "drop" ? C.greenDeep : C.mink, fontFamily: F.head, fontSize: 10, fontWeight: pw === "drop" ? 800 : 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, transition: "all 150ms" }}>
                            <Calendar size={10} strokeWidth={2.4}/> Saturday's Drop
                          </button>
                          <button onClick={() => setPublishWhen(it.id, "shelf")} title="List now on the Shelf"
                            style={{ flex: 1, height: 30, borderRadius: 8, border: "1.5px solid " + (pw === "shelf" ? C.amber : C.fawn), background: pw === "shelf" ? C.amberMist : C.paper, color: pw === "shelf" ? C.amberDeep : C.mink, fontFamily: F.head, fontSize: 10, fontWeight: pw === "shelf" ? 800 : 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, transition: "all 150ms" }}>
                            <Zap size={10} strokeWidth={2.4}/> Shelf now
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* Per-item summary — shows count breakdown of where approved items will land */}
          {approvedIds.size > 0 && (() => {
            const approvedArr = aiItems.filter(it => approvedIds.has(it.id));
            const dropCount  = approvedArr.filter(it => getPublishWhen(it.id) === "drop").length;
            const shelfCount = approvedArr.filter(it => getPublishWhen(it.id) === "shelf").length;
            return (
              <div className="fade-in" style={{ padding: "12px 16px", borderRadius: 14, background: C.sand, border: "1.5px solid " + C.fawn, marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={13} style={{ color: C.mink }}/>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink }}>Set the destination for each listing on its card. Next Drop is {dropOpenDay()} {dropOpenHour()}.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                  {dropCount > 0 && (
                    <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: C.greenMist, color: C.greenDeep, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={10}/> {dropCount} for Drop
                    </span>
                  )}
                  {shelfCount > 0 && (
                    <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: C.amberMist, color: C.amberDeep, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Zap size={10}/> {shelfCount} to Shelf
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: 16, background: C.paper, border: "1.5px solid " + C.fawn, gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {approvedIds.size > 0 && approvedIds.size < aiItems.length && (
                <button onClick={approveAll} style={{ padding: "9px 14px", borderRadius: 10, border: "1.5px solid " + C.green, cursor: "pointer", fontFamily: F.head, fontSize: 12, fontWeight: 800, background: C.paper, color: C.greenDeep, display: "flex", alignItems: "center", gap: 5 }}>
                  <Check size={14} strokeWidth={2.5}/> Approve all {aiItems.length}
                </button>
              )}
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink }}>
                {approvedIds.size === 0 && "Review each listing and approve when ready."}
                {approvedIds.size > 0 && approvedIds.size < aiItems.length && (approvedIds.size + " of " + aiItems.length + " approved.")}
                {approvedIds.size === aiItems.length && "All listings approved."}
              </p>
            </div>
            <button onClick={() => onDone(itemPublishWhen)} disabled={approvedIds.size === 0} className="cta-primary" style={{
              padding: "12px 26px", borderRadius: 999, border: "none",
              cursor: approvedIds.size === 0 ? "not-allowed" : "pointer",
              fontFamily: F.head, fontSize: 14, fontWeight: 800,
              background: approvedIds.size === 0 ? C.smoke : C.green,
              color: approvedIds.size === 0 ? C.ash : "#fff",
              boxShadow: approvedIds.size === 0 ? "none" : "0 2px 0 " + C.greenDeep,
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <Sparkles size={14} strokeWidth={2.4}/>
              {approvedIds.size === 0 ? "Approve to publish" : ("Publish " + approvedIds.size + " listing" + (approvedIds.size === 1 ? "" : "s"))}
            </button>
          </div>
        </div>
      )}

      {previewItem && <AIListingPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} onApprove={() => { toggleApproved(previewItem.id); setPreviewItem(null); }} onEdit={() => { const it = previewItem; setPreviewItem(null); setEditingItem(it); }} isApproved={approvedIds.has(previewItem.id)} aiSettings={aiSettings}/>}
      {editingItem && <AIListingEditModal item={editingItem} onClose={() => setEditingItem(null)} onSave={saveEdit} aiSettings={aiSettings}/>}
    </div>
  );
}

/* ============================================================
   SETTINGS — native-styled, mirrors the InventoryTabs pattern.
   Two tabs: Profile (info + password) and Subscription (plan + AI waitlist).
   ============================================================ */

/* Tabs header — same look as InventoryTabs (icon, eyebrow, h1, tab row). */
// Tiny toggle used across the new Notifications / Payments sections.
function Settings_Toggle({ on, onClick, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 36, height: 22, borderRadius: 999, border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      background: on ? C.green : C.fawn,
      position: "relative", transition: "background 150ms", padding: 0,
      opacity: disabled ? 0.5 : 1,
    }}>
      <span style={{
        position: "absolute", top: 2, left: on ? 16 : 2,
        width: 18, height: 18, borderRadius: "50%",
        background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        transition: "left 150ms",
      }}/>
    </button>
  );
}

/* Field, input, button helpers — keep card markup compact. */
function SF_Field({ label, helper, children }) {
  return (
    <div>
      <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.mink, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
      {children}
      {helper && <p style={{ fontFamily: F.body, fontSize: 11, color: C.ash, marginTop: 6 }}>{helper}</p>}
    </div>
  );
}

function SF_Input({ style, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: "100%", padding: "10px 14px", borderRadius: 10,
        border: "1.5px solid " + C.fawn, background: C.paper,
        fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.ink,
        outline: "none", boxSizing: "border-box",
        ...(props.disabled ? { opacity: 0.75, cursor: "not-allowed" } : {}),
        ...style,
      }}
    />
  );
}

function SF_PrimaryButton({ disabled, loading, children, ...props }) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "10px 20px", borderRadius: 999, border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: F.head, fontSize: 13, fontWeight: 800,
        background: disabled ? C.fawn : C.green,
        color: disabled ? C.ash : "#fff",
        boxShadow: disabled ? "none" : "0 2px 0 " + C.greenDeep,
        opacity: loading ? 0.7 : 1,
        transition: "background 150ms",
      }}
    >
      {children}
    </button>
  );
}

function SF_ErrorBanner({ message }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 10, background: C.claretMist, border: "1px solid " + C.claret + "40", display: "flex", alignItems: "flex-start", gap: 8 }}>
      <AlertCircle size={14} style={{ color: C.claret, flexShrink: 0, marginTop: 1 }}/>
      <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.claret }}>{message}</p>
    </div>
  );
}

function SF_SavedBadge({ label }) {
  return (
    <p style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.greenDeep }}>
      <CheckCircle size={13}/> {label}
    </p>
  );
}

/* ───── PROFILE TAB ───── */
function ProfileTab({ user, onSuccess }) {
  const { refreshUser } = useAuth();

  // Profile info state
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSavedAt, setProfileSavedAt] = useState(null);

  // Password state
  const hasPassword = user?.hasPassword !== false;
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSavedAt, setPwSavedAt] = useState(null);

  useEffect(() => {
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
  }, [user?.firstName, user?.lastName]);

  const profileDirty =
    firstName.trim() !== (user?.firstName || "") ||
    lastName.trim() !== (user?.lastName || "");

  async function submitProfile(e) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setProfileError("First and last name are both required.");
      return;
    }
    setSavingProfile(true); setProfileError("");
    try {
      await apiRequest("/api/auth/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      });
      await refreshUser();
      setProfileSavedAt(Date.now());
      setTimeout(() => setProfileSavedAt(null), 2400);
      onSuccess && onSuccess("Profile updated successfully.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitPassword(e) {
    e.preventDefault();
    if (newPw.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setPwError("New password and confirmation do not match."); return; }
    if (hasPassword && !currentPw) { setPwError("Enter your current password."); return; }
    setSavingPw(true); setPwError("");
    try {
      const path = hasPassword ? "/api/auth/me/change-password" : "/api/auth/me/set-password";
      const body = hasPassword
        ? { currentPassword: currentPw, newPassword: newPw }
        : { newPassword: newPw };
      const data = await apiRequest(path, { method: "POST", body: JSON.stringify(body) });
      if (data && data.refreshToken) {
        localStorage.setItem("dy_refresh_token", data.refreshToken);
      }
      await refreshUser();
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setPwSavedAt(Date.now());
      setTimeout(() => setPwSavedAt(null), 2400);
      onSuccess && onSuccess(hasPassword ? "Password updated successfully." : "Password set successfully.");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setSavingPw(false);
    }
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "—";
  const roleLabel = user?.role
    ? (user.role.charAt(0) + user.role.slice(1).toLowerCase())
    : "—";

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* Profile information */}
      <form onSubmit={submitProfile} style={{ background: C.paper, border: "1px solid " + C.fawn, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
        <h2 style={{ fontFamily: F.head, fontSize: 16, fontWeight: 800, color: C.ink, letterSpacing: "-0.01em" }}>Profile information</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <SF_Field label="First name">
            <SF_Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" autoComplete="given-name" disabled={savingProfile}/>
          </SF_Field>
          <SF_Field label="Last name">
            <SF_Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" autoComplete="family-name" disabled={savingProfile}/>
          </SF_Field>
        </div>

        <SF_Field label="Email" helper="To change your email, contact info@dropyard.app.">
          <SF_Input type="email" value={user?.email || ""} readOnly disabled style={{ background: C.sand, color: C.mink }}/>
        </SF_Field>

        <div style={{ background: C.sand, border: "1px solid " + C.fawn, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 28 }}>
          <div>
            <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.ash, letterSpacing: "0.14em", textTransform: "uppercase" }}>Member since</p>
            <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 2 }}>{memberSince}</p>
          </div>
          <div>
            <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.ash, letterSpacing: "0.14em", textTransform: "uppercase" }}>Role</p>
            <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 2 }}>{roleLabel}</p>
          </div>
        </div>

        {profileError && <SF_ErrorBanner message={profileError}/>}

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 14, borderTop: "1px solid " + C.fawn }}>
          {profileSavedAt
            ? <SF_SavedBadge label="Changes saved"/>
            : <p style={{ fontFamily: F.body, fontSize: 12, color: C.ash }}>Save when you&apos;re ready.</p>}
          <SF_PrimaryButton type="submit" disabled={!profileDirty || savingProfile} loading={savingProfile}>
            {savingProfile ? "Saving..." : "Save changes"}
          </SF_PrimaryButton>
        </div>
      </form>

      {/* Password */}
      <form onSubmit={submitPassword} style={{ background: C.paper, border: "1px solid " + C.fawn, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ fontFamily: F.head, fontSize: 16, fontWeight: 800, color: C.ink, letterSpacing: "-0.01em", flex: 1 }}>
            {hasPassword ? "Change password" : "Set a password"}
          </h2>
          {!hasPassword && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 999, background: C.amberMist, color: C.amberDeep, fontFamily: F.head, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              <Shield size={10}/> Google only
            </span>
          )}
        </div>

        {hasPassword && (
          <SF_Field label="Current password">
            <SF_Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" disabled={savingPw}/>
          </SF_Field>
        )}

        <SF_Field label="New password">
          <SF_Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" disabled={savingPw}/>
        </SF_Field>

        <SF_Field label="Confirm new password">
          <SF_Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter new password" autoComplete="new-password" disabled={savingPw}/>
        </SF_Field>

        {pwError && <SF_ErrorBanner message={pwError}/>}

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 14, borderTop: "1px solid " + C.fawn }}>
          {pwSavedAt
            ? <SF_SavedBadge label={hasPassword ? "Password updated" : "Password set"}/>
            : <p style={{ fontFamily: F.body, fontSize: 12, color: C.ash }}>
                {hasPassword ? "Other devices will be signed out." : "Adds a password so you can sign in with email too."}
              </p>}
          <SF_PrimaryButton
            type="submit"
            disabled={savingPw || !newPw || !confirmPw || (hasPassword && !currentPw)}
            loading={savingPw}
          >
            {savingPw ? "Saving..." : (hasPassword ? "Update password" : "Set password")}
          </SF_PrimaryButton>
        </div>
      </form>
    </div>
  );
}

/* ───── SUBSCRIPTION TAB ───── */
function SubscriptionTab({ user, onSuccess }) {
  const [email, setEmail] = useState(user?.email || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin(e) {
    e.preventDefault();
    if (!isValidEmail(email)) { setError("Enter a valid email address."); return; }
    setSubmitting(true); setError("");
    try {
      await submitSubmission({
        type: "SELLER_AI_WAITLIST",
        source: "seller-dashboard-subscription",
        payload: { email: email.trim() },
      });
      setSubmitted(true);
      onSuccess && onSuccess("You're on the AI Seller Agent waitlist!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your spot.");
    } finally {
      setSubmitting(false);
    }
  }

  const freeFeatures = [
    "Unlimited listings during weekly Drops",
    "Run a Moving Sale when you need to",
    "Direct messaging with buyers",
    "Pickup scheduling tools",
    "DropYard fraud protection",
  ];
  const aiFeatures = [
    "Photo-to-listing — AI writes title, description, and price",
    "Auto-responds to buyer questions",
    "Negotiates within rules you set",
    "Schedules pickups within your windows",
    "WhatsApp updates so you don't live in the app",
    "No-show handling — re-opens and contacts next buyer",
  ];

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* Current Plan */}
      <div style={{ background: C.paper, border: "1px solid " + C.fawn, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.ash, letterSpacing: "0.14em", textTransform: "uppercase" }}>Current plan</p>
          <h2 style={{ fontFamily: F.head, fontSize: 24, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em", marginTop: 4 }}>DropYard Free</h2>
          <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.mink, lineHeight: 1.5, marginTop: 6 }}>
            List during weekly Drops, run Moving Sales, and reach neighbours — at no cost.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {freeFeatures.map(f => (
            <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: C.greenMist, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                <Check size={11} style={{ color: C.greenDeep }} strokeWidth={3}/>
              </div>
              <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.ink }}>{f}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid " + C.fawn }}>
          <p style={{ fontFamily: F.body, fontSize: 12, color: C.ash }}>You&apos;re on the free plan. No card on file.</p>
        </div>
      </div>

      {/* AI Seller Agent */}
      <div style={{ background: "linear-gradient(135deg, #FAF5FF 0%, " + C.paper + " 60%, " + C.amberMist + " 100%)", border: "1px solid " + C.fawn, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 14, position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
          <div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, background: "#EDE9FE", color: "#5B21B6", fontFamily: F.head, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              <Sparkles size={10}/> Coming soon
            </span>
            <h2 style={{ fontFamily: F.head, fontSize: 24, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em", marginTop: 8 }}>AI Seller Agent</h2>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.mink, lineHeight: 1.5, marginTop: 6, maxWidth: 360 }}>
              Photo-to-listing, buyer Q&amp;A, negotiation, and pickup scheduling — handled for you.
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.ash, letterSpacing: "0.14em", textTransform: "uppercase" }}>From</p>
            <p style={{ fontFamily: F.head, fontSize: 22, fontWeight: 900, color: C.ink, lineHeight: 1, marginTop: 4 }}>$4.99</p>
            <p style={{ fontFamily: F.body, fontSize: 11, color: C.ash, marginTop: 2 }}>per month</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {aiFeatures.map(f => (
            <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                <Check size={11} style={{ color: "#5B21B6" }} strokeWidth={3}/>
              </div>
              <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.ink }}>{f}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid " + C.fawn }}>
          {submitted ? (
            <div style={{ padding: "12px 14px", borderRadius: 12, background: C.greenMist, border: "1px solid " + C.green + "40", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <CheckCircle size={16} style={{ color: C.greenDeep, flexShrink: 0, marginTop: 1 }}/>
              <div>
                <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.greenDeep }}>You&apos;re on the waitlist!</p>
                <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.ink, marginTop: 2 }}>
                  We&apos;ll email you at <strong>{email}</strong> when it goes live.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.mink, letterSpacing: "0.14em", textTransform: "uppercase" }}>Join the early-access waitlist</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (error) setError(""); }}
                  placeholder="you@email.com"
                  disabled={submitting}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid " + C.fawn, background: C.paper, fontFamily: F.body, fontSize: 13, color: C.ink, outline: "none" }}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "10px 20px", borderRadius: 999, border: "none", cursor: submitting ? "not-allowed" : "pointer", background: "linear-gradient(135deg, #7C3AED, #6D28D9)", color: "#fff", fontFamily: F.head, fontSize: 13, fontWeight: 800, opacity: submitting ? 0.7 : 1, boxShadow: "0 2px 0 #5B21B6" }}
                >
                  {submitting ? "Saving..." : "Join waitlist"}
                </button>
              </div>
              {error && <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.claret }}>{error}</p>}
              <p style={{ fontFamily: F.body, fontSize: 11, color: C.ash }}>No card required. We&apos;ll only email when it&apos;s ready.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* Top-of-page success banner — fades in, fades out 2.6s later. */
function SF_SuccessBanner({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className="fade-in" style={{ position: "sticky", top: 0, zIndex: 30, maxWidth: 1160, margin: "0 auto 16px", padding: "12px 16px", borderRadius: 12, background: C.greenMist, border: "1px solid " + C.green + "55", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 6px 20px rgba(48, 132, 36, 0.12)" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Check size={15} style={{ color: "#fff" }} strokeWidth={3}/>
      </div>
      <p style={{ fontFamily: F.head, fontSize: 13.5, fontWeight: 800, color: C.greenDeep, flex: 1 }}>{message}</p>
      <button onClick={onClose} aria-label="Dismiss" style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.greenDeep }}>
        <X size={14} strokeWidth={2.5}/>
      </button>
    </div>
  );
}

/* Parent SettingsView — picks active tab and renders the right body. */
// `initialSection` lets other screens deep-link into a specific settings pane
// (e.g. the listing form's "Set your default" payment-method link). null = the
// normal entry point: desktop opens on Account, mobile opens on the section list.
function SettingsView({ user, initialSection = null }) {
  const { isMobile } = useViewport();
  const [activeSection, setActiveSection] = useState(initialSection || "account");
  // Mobile drill-down: null = section list, otherwise section id = detail view.
  // A deep link drills straight in rather than dumping the user on the list.
  const [mobileViewingSection, setMobileViewingSection] = useState(initialSection || null);
  const [toast, setToast] = useState(null);

  // Sell-with-AI waitlist opt-in — local-to-Settings since the teaser was
  // moved out of Overview (BUG-046). Persists for the session only; the
  // backend submission is the durable record.
  const [aiNotified, setAiNotified] = useState(false);
  async function handleAINotify() {
    try {
      await submitSubmission({
        type:    "SELLER_AI_WAITLIST",
        source:  "seller-settings-sell-with-ai",
        payload: { email: user?.email },
      });
    } catch {
      // Optimistic — backend error doesn't block the local "Notified ✓" state.
    }
    setAiNotified(true);
  }

  const sections = [
    { id: "account",       label: "Account",       icon: User,       desc: "Name, email, password" },
    { id: "notifications", label: "Notifications", icon: Bell,       desc: "Email, WhatsApp, push" },
    { id: "payments",      label: "Payments",      icon: DollarSign, desc: "How buyers can pay" },
    { id: "pickup",        label: "Pickup",        icon: MapPin,     desc: "Default address" },
    { id: "sellWithAi",    label: "Sell with AI",  icon: Sparkles,   desc: "AI agent that negotiates offers — coming soon" },
    { id: "subscription",  label: "Subscription",  icon: Award,      desc: "Plan and upgrades" },
  ];

  const currentId = isMobile ? mobileViewingSection : activeSection;
  const currentSection = sections.find(s => s.id === currentId);

  function renderSection(id) {
    if (id === "account")       return <ProfileTab user={user} onSuccess={setToast}/>;
    if (id === "notifications") return <SettingsNotifications user={user} onSuccess={setToast}/>;
    if (id === "payments")      return <SettingsPayments user={user} onSuccess={setToast}/>;
    if (id === "pickup")        return <SettingsPickup user={user} onSuccess={setToast}/>;
    if (id === "sellWithAi")    return <SellWithAITeaser notified={aiNotified} onNotify={handleAINotify}/>;
    if (id === "subscription")  return <SubscriptionTab user={user} onSuccess={setToast}/>;
    return null;
  }

  return (
    <div className="fade-in" style={{ maxWidth: isMobile ? "100%" : 1160, margin: "0 auto" }}>
      <SF_SuccessBanner message={toast} onClose={() => setToast(null)}/>

      {/* Page header — hidden on mobile while drilled into a section. */}
      {(!isMobile || !mobileViewingSection) && (
        <div style={{ padding: isMobile ? "12px 0 8px" : "14px 0 10px", position: "relative", marginBottom: isMobile ? 4 : 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 16 }}>
            <div style={{ width: isMobile ? 42 : 48, height: isMobile ? 42 : 48, borderRadius: isMobile ? 12 : 14, background: C.amberMist, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, boxShadow: "0 2px 0 " + C.fawn }}>
              <Settings size={isMobile ? 18 : 20} style={{ color: C.amberDeep }} strokeWidth={2.2}/>
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontFamily: F.head, fontSize: isMobile ? 24 : 30, fontWeight: 900, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 4 }}>Settings</h1>
              <p style={{ fontFamily: F.body, fontSize: isMobile ? 12.5 : 14, fontWeight: 500, color: C.mink, lineHeight: 1.45, maxWidth: 560 }}>
                Account, notifications, payments, pickup defaults, and subscription.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Layout: 2-col grid on desktop, drill-down stack on mobile. */}
      <div style={{
        display: isMobile ? "flex" : "grid",
        flexDirection: isMobile ? "column" : undefined,
        gridTemplateColumns: isMobile ? undefined : "240px 1fr",
        gap: isMobile ? 0 : 24,
        alignItems: "flex-start",
      }}>
        {/* Section nav — vertical strip on desktop, card list on mobile */}
        {(!isMobile || !mobileViewingSection) && (
          <nav style={{ display: "flex", flexDirection: "column", gap: isMobile ? 8 : 4, padding: isMobile ? 0 : "8px 0" }}>
            {sections.map(sec => {
              const Ic = sec.icon;
              const active = !isMobile && activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => isMobile ? setMobileViewingSection(sec.id) : setActiveSection(sec.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                    padding: isMobile ? "16px 16px" : "10px 12px",
                    borderRadius: isMobile ? 14 : 10,
                    border: isMobile ? "1px solid " + C.fawn : "none",
                    background: active ? C.greenMist : C.paper,
                    cursor: "pointer",
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

        {/* Section content panel */}
        {(!isMobile || mobileViewingSection) && (
          <div style={{ minWidth: 0, width: "100%" }}>
            {isMobile && (
              <button onClick={() => setMobileViewingSection(null)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 0 16px", border: "none", background: "none", color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                <ArrowLeft size={14}/> All settings
              </button>
            )}
            {isMobile && currentSection && (
              <div style={{ marginBottom: 18 }}>
                <h2 style={{ fontFamily: F.head, fontSize: 22, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em" }}>{currentSection.label}</h2>
              </div>
            )}
            {renderSection(currentId)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings · Notifications ───
// Channel × event matrix. Patches /api/auth/me/preferences with a deep-merge
// payload so single-toggle changes don't blow away the other rows.
function SettingsNotifications({ user, onSuccess }) {
  const { refreshUser } = useAuth();
  const rows = [
    { id: "claim",    label: "Item claimed",     desc: "When a buyer claims one of your listings" },
    { id: "offer",    label: "Offer received",   desc: "When a buyer makes or counters an offer" },
    { id: "question", label: "Question asked",   desc: "Buyer questions on your listings" },
    { id: "pickup",   label: "Pickup reminders", desc: "Day-before and 2-hour-before reminders" },
    { id: "weekly",   label: "Weekly summary",   desc: "Sunday digest of views, claims, and revenue" },
  ];
  const channels = ["email", "whatsapp", "push"];
  // Defaults match the schema's null state — everything on except questions/whatsapp.
  const DEFAULTS = {
    claim:    { email: true,  whatsapp: true,  push: true  },
    offer:    { email: true,  whatsapp: false, push: true  },
    question: { email: false, whatsapp: false, push: true  },
    pickup:   { email: true,  whatsapp: true,  push: true  },
    weekly:   { email: true,  whatsapp: false, push: false },
  };
  const [prefs, setPrefs] = useState(() => {
    const src = (user?.notificationPrefs) || {};
    const merged = {};
    for (const r of rows) {
      merged[r.id] = { ...DEFAULTS[r.id], ...(src[r.id] || {}) };
    }
    return merged;
  });
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  async function toggle(rowId, channel) {
    const next = { ...prefs, [rowId]: { ...prefs[rowId], [channel]: !prefs[rowId][channel] } };
    setPrefs(next);
    setBusy(`${rowId}.${channel}`);
    try {
      await apiRequest("/api/auth/me/preferences", {
        method: "PATCH",
        body: JSON.stringify({ notificationPrefs: { [rowId]: { [channel]: next[rowId][channel] } } }),
      });
      await refreshUser();
      onSuccess && onSuccess("Notification preferences updated.");
      setError("");
    } catch (err) {
      // Revert on failure.
      setPrefs(prefs);
      setError(err instanceof Error ? err.message : "Could not save preferences.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ padding: "20px 22px", borderRadius: 18, border: "1px solid " + C.fawn, background: C.paper }}>
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
          {channels.map(ch => (
            <div key={ch} style={{ display: "flex", justifyContent: "center" }}>
              <Settings_Toggle
                on={!!prefs[r.id][ch]}
                onClick={() => toggle(r.id, ch)}
                disabled={busy === `${r.id}.${ch}`}
              />
            </div>
          ))}
        </div>
      ))}
      {error && <div style={{ marginTop: 12 }}><SF_ErrorBanner message={error}/></div>}
    </div>
  );
}

// ─── Settings · Payments ───
// Toggles which payment methods are pre-selected on every new listing.
// Enforces "at least one method must stay on" client-side; the backend Zod
// schema enforces the same constraint as a backstop.
function SettingsPayments({ user, onSuccess }) {
  const { refreshUser } = useAuth();
  const seeded = Array.isArray(user?.acceptedPaymentMethods) && user.acceptedPaymentMethods.length > 0
    ? user.acceptedPaymentMethods
    : ["CASH", "ETRANSFER"];
  const [accepted, setAccepted] = useState({
    cash:      seeded.includes("CASH"),
    etransfer: seeded.includes("ETRANSFER"),
  });
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const onlyOneOn = Object.values(accepted).filter(Boolean).length === 1;

  async function toggle(k) {
    if (accepted[k] && onlyOneOn) return; // refuse — at least one must stay on
    const next = { ...accepted, [k]: !accepted[k] };
    setAccepted(next);
    setBusy(k);
    try {
      const list = [];
      if (next.cash)      list.push("CASH");
      if (next.etransfer) list.push("ETRANSFER");
      await apiRequest("/api/auth/me/preferences", {
        method: "PATCH",
        body: JSON.stringify({ acceptedPaymentMethods: list }),
      });
      await refreshUser();
      onSuccess && onSuccess("Payment methods updated.");
      setError("");
    } catch (err) {
      setAccepted(accepted); // revert
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setBusy(null);
    }
  }

  const items = [
    { id: "cash",      label: "Cash",               desc: "Most common for in-person pickup",       icon: Banknote,   color: C.green     },
    { id: "etransfer", label: "Interac e-Transfer", desc: "Free in Canada, settles in minutes",     icon: DollarSign, color: C.greenDeep },
  ];

  return (
    <div style={{ padding: "20px 22px", borderRadius: 18, border: "1px solid " + C.fawn, background: C.paper }}>
      <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, marginBottom: 14, lineHeight: 1.55 }}>
        DropYard never holds your money. Buyers pay you directly at pickup using the methods you accept below. Your choices here become the default options on every new listing.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map(it => {
          const Ic = it.icon;
          const on = accepted[it.id];
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
              <Settings_Toggle on={on} onClick={() => toggle(it.id)} disabled={busy === it.id}/>
            </div>
          );
        })}
      </div>
      {error && <div style={{ marginTop: 12 }}><SF_ErrorBanner message={error}/></div>}
    </div>
  );
}

// ─── Settings · Pickup ───
// Single editable field — defaultPickupAddress — plus a read-only "buyer-facing
// neighbourhood" pulled from User.neighborhood (managed in onboarding).
function SettingsPickup({ user, onSuccess }) {
  const { refreshUser } = useAuth();
  const [address, setAddress] = useState(user?.defaultPickupAddress || "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { setAddress(user?.defaultPickupAddress || ""); }, [user?.defaultPickupAddress]);

  const dirty = address.trim() !== (user?.defaultPickupAddress || "");

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await apiRequest("/api/auth/me/preferences", {
        method: "PATCH",
        body: JSON.stringify({ defaultPickupAddress: address.trim() }),
      });
      await refreshUser();
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2400);
      onSuccess && onSuccess("Pickup defaults updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ padding: "20px 22px", borderRadius: 18, border: "1px solid " + C.fawn, background: C.paper, display: "flex", flexDirection: "column", gap: 16 }}>
      <SF_Field label="Default pickup address" helper="Shown to buyers after they claim an item. You can override per-listing.">
        <SF_Input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="123 Cresthaven Drive, Barrhaven, ON"
          disabled={saving}
        />
      </SF_Field>
      <SF_Field label="Buyer-facing neighbourhood" helper="Set during onboarding — contact support to change.">
        <SF_Input value={user?.neighborhood || ""} readOnly disabled style={{ background: C.sand, color: C.mink }}/>
      </SF_Field>
      {error && <SF_ErrorBanner message={error}/>}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 12, borderTop: "1px solid " + C.fawn }}>
        {savedAt
          ? <SF_SavedBadge label="Changes saved"/>
          : <p style={{ fontFamily: F.body, fontSize: 12, color: C.ash }}>Per-listing windows can be set when creating each item.</p>}
        <SF_PrimaryButton type="submit" disabled={!dirty || saving} loading={saving}>Save changes</SF_PrimaryButton>
      </div>
    </form>
  );
}

/* ============================================================
   SELLER ONBOARDING MODAL
   Shown when a BUYER (or user with sellerOnboardingDone=false) clicks
   "List New Item" or any other listing entry point. Collects the
   minimum profile a seller needs (neighborhood, postal, pickup address,
   payment methods) and posts to POST /api/auth/me/seller-onboarding,
   which flips role→BOTH and sellerOnboardingDone=true.

   Replaces the old Moving Sale registration flow as the buyer→seller
   upgrade path. Server-side gate at POST /api/items enforces the same
   check, so this UI is the primary mechanism but not the only one.
   ============================================================ */
function SellerOnboardingModal({ user, accessToken, onClose, onSuccess }) {
  const [neighborhood, setNeighborhood] = useState(user?.neighborhood ?? "");
  const [postalCode, setPostalCode]     = useState(user?.postalCode ?? "");
  const [pickupAddress, setPickupAddress] = useState(user?.defaultPickupAddress ?? "");
  const [methods, setMethods] = useState(() => {
    const initial = Array.isArray(user?.acceptedPaymentMethods) && user.acceptedPaymentMethods.length > 0
      ? user.acceptedPaymentMethods
      : ["CASH", "ETRANSFER"];
    return new Set(initial);
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Neighborhood autofill from postal code ──────────────────────────────
  // GET /api/geo/postal reads the local Geonames FSA table — no third-party
  // geocoder, no API key. We only fill the field while the user hasn't typed
  // their own value, so autofill never fights the person using the form.
  // Clearing the field re-arms it.
  const neighborhoodTouched = useRef(Boolean(user?.neighborhood));
  const [autofillNote, setAutofillNote] = useState("");

  useEffect(() => {
    const fsa = postalCode.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
    if (!/^[A-Z]\d[A-Z]$/.test(fsa) || neighborhoodTouched.current) {
      setAutofillNote("");
      return;
    }
    let cancelled = false;
    // Debounced so typing a full postal code sends one request, not six.
    const timer = setTimeout(async () => {
      try {
        const data = await apiRequest(`/api/geo/postal?code=${encodeURIComponent(fsa)}`);
        if (cancelled || neighborhoodTouched.current || !data?.neighborhood) return;
        setNeighborhood(data.neighborhood);
        setAutofillNote(`Filled from ${data.fsa} — edit if it's not right.`);
      } catch {
        // Unknown FSA or offline: leave the field for the user to type.
        if (!cancelled) setAutofillNote("");
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [postalCode]);

  const onNeighborhoodChange = (value) => {
    // Empty again → let autofill take over on the next postal-code change.
    neighborhoodTouched.current = value.trim().length > 0;
    setAutofillNote("");
    setNeighborhood(value);
  };

  const toggleMethod = (m) => {
    setMethods(prev => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!neighborhood.trim()) { setError("Neighborhood is required."); return; }
    if (postalCode.trim().length < 3) { setError("Enter a valid postal code."); return; }
    if (pickupAddress.trim().length < 5) { setError("Enter a pickup address."); return; }
    if (methods.size === 0) { setError("Choose at least one payment method."); return; }
    setSubmitting(true);
    try {
      await apiRequest("/api/auth/me/seller-onboarding", {
        method: "POST",
        token:  accessToken ?? undefined,
        body: JSON.stringify({
          neighborhood:           neighborhood.trim(),
          postalCode:             postalCode.trim(),
          defaultPickupAddress:   pickupAddress.trim(),
          acceptedPaymentMethods: Array.from(methods),
        }),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(11,47,32,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, overflow: "auto",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: C.paper, borderRadius: 18,
          maxWidth: 520, width: "100%", padding: 28,
          boxShadow: "0 30px 80px rgba(11,47,32,0.20)",
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ width: 22, height: 2.5, background: C.green, borderRadius: 2 }}/>
          <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.green, letterSpacing: "0.16em", textTransform: "uppercase" }}>
            Become a seller
          </span>
        </div>
        <h2 style={{ fontFamily: F.head, fontSize: 26, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em", marginBottom: 8 }}>
          Complete your seller profile
        </h2>
        <p style={{ fontFamily: F.body, fontSize: 14, color: C.mink, marginBottom: 20, lineHeight: 1.55 }}>
          We need a few details before you can list items. Buyers in your neighborhood will see this when they consider claiming your items.
        </p>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 14, borderRadius: 12, background: C.claretMist, border: "1px solid " + C.claret + "30", color: C.claret, fontFamily: F.body, fontSize: 13 }}>
            <AlertCircle size={15}/>{error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Neighborhood">
            <input
              type="text" value={neighborhood} onChange={e => onNeighborhoodChange(e.target.value)}
              placeholder="e.g. Barrhaven"
              required
              style={fieldInput}
            />
            {autofillNote && (
              <p style={{ fontFamily: F.body, fontSize: 11, color: C.mink, marginTop: 5 }}>
                {autofillNote}
              </p>
            )}
          </Field>
          <Field label="Postal code">
            <input
              type="text" value={postalCode} onChange={e => setPostalCode(e.target.value.toUpperCase())}
              placeholder="K2J"
              required maxLength={10}
              style={fieldInput}
            />
          </Field>
          <Field label="Default pickup address">
            <input
              type="text" value={pickupAddress} onChange={e => setPickupAddress(e.target.value)}
              placeholder="123 Example St, Ottawa"
              required
              style={fieldInput}
            />
          </Field>
          <Field label="Accepted payment methods">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["CASH", "ETRANSFER"].map(m => (
                <button
                  key={m} type="button"
                  onClick={() => toggleMethod(m)}
                  style={{
                    padding: "10px 16px", borderRadius: 999,
                    border: "1.5px solid " + (methods.has(m) ? C.green : C.fawn),
                    background: methods.has(m) ? C.greenMist : C.paper,
                    color: methods.has(m) ? C.greenDeep : C.mink,
                    fontFamily: F.head, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  {methods.has(m) && <Check size={13} strokeWidth={3}/>}
                  {m === "CASH" ? "Cash" : "E-transfer"}
                </button>
              ))}
            </div>
          </Field>

          <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
            <button
              type="button" onClick={onClose} disabled={submitting}
              style={{
                padding: "11px 20px", borderRadius: 12, border: "1.5px solid " + C.fawn,
                background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={submitting}
              style={{
                padding: "11px 22px", borderRadius: 12, border: "none",
                background: submitting ? C.greenMist : C.green,
                color: submitting ? C.greenDeep : "#fff",
                fontFamily: F.head, fontSize: 13, fontWeight: 800,
                cursor: submitting ? "not-allowed" : "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
                boxShadow: submitting ? "none" : "0 2px 0 " + C.greenDeep,
              }}
            >
              {submitting && <Loader2 size={14} className="animate-spin"/>}
              {submitting ? "Saving…" : "Save & continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.ink, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const fieldInput = {
  width: "100%", padding: "11px 14px",
  borderRadius: 12, border: "1.5px solid " + C.fawn,
  background: C.paper, color: C.ink,
  fontFamily: F.body, fontSize: 14,
  outline: "none",
};

// Seller views safe to restore from the URL after a refresh. Excludes the
// transient flows — edit-item, item-detail, add-manual/chooser/ai, ai-setup,
// ai-photos, ai-plan — which read in-memory state (`editingItem`, wizard step)
// that doesn't survive a reload. "messages" and "history" are intentionally
// shared with the buyer tab list so switching roles keeps you on the same tab.
const SELLER_TABS = new Set([
  "overview", "items", "orders", "claims", "pickups", "questions",
  "messages", "history", "settings",
]);

export default function DropYardSellerDashboard({
  onSwitchRole = () => alert("In the full product, this switches to the buyer dashboard."),
  user = null,
  onSignout = null,
  accessToken = null,
  onItemCreated = null,
  // Live items list owned by the parent (/buyer/page.tsx fetches /api/items/mine
  // already). Threading it through avoids a duplicate fetch and keeps the
  // optimistic UI in sync across views.
  sellerItems = null,
  onItemsChange = null,
  sellerItemsLoading = false,
  // Refresh the user object after seller onboarding succeeds, so role/
  // sellerOnboardingDone update everywhere. Provided by /buyer/page.tsx
  // (which has access to AuthContext.refreshUser).
  onUserChanged = null,
} = {}) {
  const { isMobile } = useViewport();
  // BUG-087 — active view persisted in ?tab= so a refresh doesn't bounce the
  // seller back to Overview. Safe to read `window` here: app/buyer/page.tsx
  // gates the dashboards behind a `mounted` flag, so this never runs on SSR.
  const [view, setView] = useState(() => {
    if (typeof window === "undefined") return "overview";
    const t = new URLSearchParams(window.location.search).get("tab");
    return t && SELLER_TABS.has(t) ? t : "overview";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    // Transient views (edit-item, the add/AI flows) are NOT written to the URL:
    // they depend on in-memory state like `editingItem`, so restoring one on
    // refresh would render an editor with nothing loaded. Leaving the previous
    // value in place means a refresh mid-edit lands on the last real tab.
    if (view === "overview") url.searchParams.delete("tab");
    else if (SELLER_TABS.has(view)) url.searchParams.set("tab", view);
    else return;
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [view]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Remount key for the listing form. Every entry point into "List New Item"
  // bumps it, which guarantees a blank form. Without it, pressing the CTA
  // while already on the form (e.g. sitting on its "Published!" screen) is a
  // no-op setView to the same value — nothing unmounts, so the seller keeps
  // staring at the previous listing.
  const [listFormNonce, setListFormNonce] = useState(0);
  const [aiSettings, setAiSettings] = useState({});
  const [aiPlan, setAiPlan] = useState("free");
  const [aiUsed, setAiUsed] = useState(3);
  const [editingItem, setEditingItem] = useState(null);
  const [aiEntryPoint, setAiEntryPoint] = useState("overview");
  // Which Settings pane to open on. null = default entry point.
  const [settingsSection, setSettingsSection] = useState(null);
  const aiConfigured = !!aiSettings.priceFloor;

  // BUG-057 — Sign-out confirmation. All Sign-out paths (TopNav, Sidebar
  // dropdown, etc.) go through onSignoutRequest which opens the modal;
  // only the modal's primary button calls onSignout.
  const [signoutOpen, setSignoutOpen] = useState(false);
  const onSignoutRequest = useCallback(() => setSignoutOpen(true), []);
  const confirmSignout = useCallback(() => {
    setSignoutOpen(false);
    if (typeof onSignout === "function") onSignout();
  }, [onSignout]);

  // Seller-onboarding gate: any nav to a listing flow checks whether the user
  // is already a seller. If not, we pop the onboarding modal and remember
  // where they were trying to go, then navigate there after success.
  const LISTING_VIEWS = new Set(["add-manual", "add-chooser", "add-ai", "ai-setup", "ai-photos"]);
  const needsSellerOnboarding = !!user && (user.role === "BUYER" || !user.sellerOnboardingDone);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pendingNav, setPendingNav] = useState(null);
  const safeNav = (target) => {
    if (LISTING_VIEWS.has(target) && needsSellerOnboarding) {
      setPendingNav(target);
      setShowOnboarding(true);
      return;
    }
    // Generic nav to Settings (sidebar, mobile nav) is a fresh entry — drop any
    // pane left over from a deep link like "Set your default", otherwise
    // Settings would keep reopening on Payments.
    if (target === "settings") setSettingsSection(null);
    if (target === "add-manual" || target === "add-chooser") setListFormNonce(n => n + 1);
    setView(target);
  };

  function goToEdit(item) { setEditingItem(item); setView("edit-item"); }
  function goToView(item) { setEditingItem(item); setView("item-detail"); }
  // Deep-link into a specific Settings pane. `null` = normal entry (Account on
  // desktop, section list on mobile). Used by the listing form's "Set your
  // default" payment link, which previously called onGoToItems("ai-setup") —
  // a prop that ignores its argument, so it landed on Inventory (BUG-083).
  function goToSettings(sectionId = null) { setSettingsSection(sectionId); setView("settings"); }

  // ─── Conversation inbox (lifted to root for nav badges) ───
  // Owns the seller's conversation list at the root so the Sidebar, TopNav
  // notification bell, and MobileBottomNav Messages tab can show the unread
  // count regardless of which view is active. SellerMessagesView receives
  // this through props.
  const [convList, setConvList] = useState([]);
  const myUserId = user?.id || null;

  // Helper: insert/refresh a single conversation from a socket payload.
  // The adapted shape mirrors what SellerMessagesView already renders.
  const upsertConvFromSocket = useCallback((prev, payload) => {
    if (!payload?.conversationId || !payload.message) return prev;
    const { conversationId, message } = payload;
    const isFromMe = message.senderId === myUserId;
    const existing = prev.find((c) => c.id === conversationId);
    if (!existing) {
      if (accessToken) {
        apiRequest("/api/conversations", { token: accessToken })
          .then((data) => {
            const list = Array.isArray(data?.conversations) ? data.conversations : [];
            setConvList(list.map((api) => adaptSellerConversation(api, myUserId)).filter(Boolean));
          })
          .catch(() => { /* keep current list on transient blip */ });
      }
      return prev;
    }
    // Update the matching conversation AND move it to the top so the inbox
    // stays sorted by latest activity. Without the reordering, new messages
    // refresh the data but the row stays put.
    const updated = prev.map((c) => {
      if (c.id !== conversationId) return c;
      const newUnread = isFromMe ? (c.unreadCount || 0) : (c.unreadCount || 0) + 1;
      return {
        ...c,
        lastMsg:       message.body || c.lastMsg,
        lastTime:      relativeTimeShort(message.createdAt),
        lastMessageAt: message.createdAt || c.lastMessageAt,
        unread:        newUnread > 0,
        unreadCount:   newUnread,
        status:        newUnread > 0 ? "needs-response" : c.status,
      };
    });
    const moved = updated.find((c) => c.id === conversationId);
    if (!moved) return updated;
    return [moved, ...updated.filter((c) => c.id !== conversationId)];
  }, [accessToken, myUserId]);

  // Bumped on claim socket events so the conv list refetches and the
  // embedded item.status reflects pickup completion. The composer locks
  // automatically once the item flips SOLD.
  const [convListTick, setConvListTick] = useState(0);
  useSocketEvent("claim:new",     () => setConvListTick(t => t + 1));
  useSocketEvent("claim:updated", () => setConvListTick(t => t + 1));
  useEffect(() => {
    if (!accessToken) { setConvList([]); return; }
    let cancelled = false;
    apiRequest("/api/conversations", { token: accessToken })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.conversations) ? data.conversations : [];
        setConvList(list.map((api) => adaptSellerConversation(api, myUserId)).filter(Boolean));
      })
      .catch(() => { if (!cancelled) setConvList([]); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, myUserId, convListTick]);

  useSocketEvent("message:new", (payload) => {
    setConvList((prev) => upsertConvFromSocket(prev, payload));
  });

  useSocketEvent("conversation:read", (payload) => {
    const cid = payload?.conversationId;
    if (!cid) return;
    setConvList((prev) => prev.map((c) => c.id === cid
      ? { ...c, unreadCount: 0, unread: false, status: c.status === "needs-response" ? "answered" : c.status }
      : c
    ));
  });

  const messagesUnreadCount = useMemo(
    () => convList.filter((c) => (c.unreadCount || 0) > 0).length,
    [convList],
  );

  // Browser-level notification on incoming message. Gated to authed seller +
  // granted permission + not currently viewing the active thread.
  useSocketEvent("message:new", (payload) => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    const msg = payload?.message;
    if (!msg || msg.senderId === myUserId) return;
    const conv = convList.find((c) => c.id === payload.conversationId);
    const itemTitle = conv?.item?.title || "your message";
    const buyerName = conv?.buyer?.name || "Someone";
    try {
      new Notification(buyerName + " · DropYard", {
        body: msg.body ? String(msg.body).slice(0, 120) : `New message about ${itemTitle}`,
        tag:  "dropyard-msg-" + payload.conversationId,
      });
    } catch { /* notifications can fail in restricted contexts */ }
  });

  return (
    <>
      <GlobalStyle/>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.paper, fontFamily: F.body, color: C.ink }}>
        <TopNav
          user={user}
          onSignout={onSignoutRequest}
          onOpenSettings={() => goToSettings(null)}
          activeView={view}
          onToggleSidebar={() => setSidebarCollapsed(c => !c)}
          onSwitchRole={onSwitchRole}
          messagesUnread={messagesUnreadCount}
          onOpenMessages={() => safeNav("messages")}
        />
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Desktop sidebar — rendered always so SSR/client markup matches; CSS
              media query (`.dy-desktop-sidebar`) hides it on mobile. Gating on
              the JS `isMobile` flag caused the sidebar to render in SSR HTML
              (defaults to desktop) and pop out on hydration, shifting layout. */}
          <Sidebar activeView={view} onNav={safeNav} aiPlan={aiPlan} onSwitchRole={onSwitchRole} collapsed={sidebarCollapsed} messagesUnread={messagesUnreadCount}/>
          <main className="dy-seller-main">
            {view === "overview" && <Overview onNav={safeNav} user={user} sellerItems={sellerItems} accessToken={accessToken}/>}
            {view === "items" && <MyItemsView onNav={safeNav} onEdit={goToEdit} onView={goToView} sellerItems={sellerItems} onItemsChange={onItemsChange} sellerItemsLoading={sellerItemsLoading} accessToken={accessToken}/>}
            {view === "questions" && <QuestionsView onNav={safeNav} accessToken={accessToken}/>}
            {view === "item-detail" && <ItemDetailView item={editingItem} onBack={() => setView("items")} onEdit={() => setView("edit-item")} accessToken={accessToken}/>}
            {view === "orders" && <OrdersView onNav={setView} accessToken={accessToken} onClaimsChanged={onItemCreated}/>}
            {view === "claims" && <ClaimsView onNav={setView} accessToken={accessToken} onClaimsChanged={onItemCreated}/>}
            {view === "pickups" && <PickupsView onNav={setView} accessToken={accessToken} onChanged={onItemCreated}/>}
            {view === "messages" && <SellerMessagesView user={user} accessToken={accessToken} convList={convList} onConvListChange={setConvList}/>}
            {view === "history" && <SellerHistoryView accessToken={accessToken}/>}
            {/* Keyed on the requested pane so arriving from a deep link while
                Settings is already mounted still lands on the right section —
                `initialSection` only seeds useState on mount. */}
            {view === "settings" && <SettingsView key={settingsSection || "default"} user={user} initialSection={settingsSection}/>}
            {view === "edit-item" && <EditItemView onBack={() => setView("items")} editingItem={editingItem} aiSettings={aiSettings} accessToken={accessToken} onItemsChange={onItemsChange}/>}

            {view === "add-chooser" && <ManualItemForm key={listFormNonce} onDone={() => setView("items")} onBack={() => setView("items")} onGoToItems={() => setView("items")} onGoToSettings={goToSettings} onEnhanceAI={() => {setAiEntryPoint("add-manual");setView(aiConfigured ? "add-ai" : "ai-setup")}} aiSettings={aiSettings} accessToken={accessToken} onItemCreated={onItemCreated}/>}
            {view === "add-manual" && <ManualItemForm key={listFormNonce} onDone={() => setView("items")} onBack={() => setView("items")} onGoToItems={() => setView("items")} onGoToSettings={goToSettings} onEnhanceAI={() => {setAiEntryPoint("add-manual");setView(aiConfigured ? "add-ai" : "ai-setup")}} aiSettings={aiSettings} accessToken={accessToken} onItemCreated={onItemCreated}/>}
            {view === "add-ai" && <AIPhotoFlow onDone={() => setView("items")} onBack={() => setView("add-manual")} aiSettings={aiSettings}/>}

            {view === "ai-setup" && <AISetup settings={aiSettings} onSave={setAiSettings} onComplete={() => {setView(aiEntryPoint==="add-manual"?"add-ai":"ai-photos")}} onBack={() => setView(aiEntryPoint==="add-manual"?"add-manual":"overview")} />}
            {view === "ai-photos" && <AIPhotoFlow onDone={() => setView("items")} onBack={() => setView("ai-setup")} aiSettings={aiSettings}/>}

            {view === "ai-plan" && <AIPlanView aiPlan={aiPlan} aiUsed={aiUsed} onUpgrade={() => setAiPlan("pro")} onCancel={() => setAiPlan("free")} onBack={() => setView("overview")} />}

            {!["overview", "items", "claims", "pickups", "messages", "history", "settings", "edit-item", "item-detail", "add-chooser", "add-manual", "add-ai", "ai-setup", "ai-photos", "ai-plan", "orders"].includes(view) && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.smoke, fontSize: 16, fontFamily: F.body }}>
                {view.replace(/-/g, " ")} - Coming soon
              </div>
            )}
          </main>
        </div>
        {/* Always render. CSS hides on desktop. See globals.css `.dy-mobile-bottom-nav`. */}
        <MobileBottomNav activeView={view} onNav={safeNav} messagesUnread={messagesUnreadCount}/>
      </div>
      {showOnboarding && (
        <SellerOnboardingModal
          user={user}
          accessToken={accessToken}
          onClose={() => { setShowOnboarding(false); setPendingNav(null); }}
          onSuccess={async () => {
            // Refresh user object in the parent so role + sellerOnboardingDone
            // update across the tree. Then navigate to the originally-requested
            // view (likely "add-manual"). If refresh fails, we still navigate —
            // the server-side gate on POST /api/items is the backstop.
            try { if (typeof onUserChanged === "function") await onUserChanged(); } catch { /* non-fatal */ }
            const target = pendingNav;
            setShowOnboarding(false);
            setPendingNav(null);
            if (target) setView(target);
          }}
        />
      )}

      {/* BUG-057 — Sign-out confirmation modal. Covers TopNav, SellerUserMenu,
          and any future call site that wires to onSignoutRequest. */}
      {signoutOpen && (
        <div onClick={() => setSignoutOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(11,47,32,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="seller-signout-title" style={{ background: C.paper, borderRadius: 20, padding: 24, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(11,47,32,0.25)" }}>
            <h3 id="seller-signout-title" style={{ fontFamily: F.head, fontSize: 18, fontWeight: 900, color: C.ink, marginBottom: 6 }}>Sign out?</h3>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.mink, lineHeight: 1.5, marginBottom: 18 }}>You&rsquo;ll need to sign back in to see your inventory, claims, and messages.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setSignoutOpen(false)} autoFocus style={{ padding: "10px 16px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmSignout} className="cta-primary" style={{ padding: "10px 18px", borderRadius: 999, border: "none", background: C.claret, color: "#fff", fontFamily: F.head, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 0 " + (C.claretDeep || "#9f1239") }}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
