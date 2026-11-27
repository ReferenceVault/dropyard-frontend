"use client";

import { useState, useEffect, useRef, useMemo, useCallback, useId } from "react";
import Link from "next/link";
import { apiRequest, uploadItemPhoto } from "@/lib/api";
import { wholeAmountText, decimalAmountText, offerAmountProblem } from "@/lib/amountInput";
import { useSocket, useSocketEvent } from "@/context/SocketContext";
import { useNotifications, useRoleConversations } from "@/context/NotificationsContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ChatEmojiTray } from "@/components/ChatEmojiTray";
import { ModalA11y } from "@/components/ModalA11y";
import { ModalPortal } from "@/components/ModalPortal";
import { Z, DIALOG_PANEL, dialogHead, dialogFoot } from "@/lib/layers";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import ProfilePictureSection from "@/components/settings/ProfilePictureSection";
import { Field as SF_Field, Input as SF_Input, PasswordInput as SF_PasswordInput, ErrorBanner as SF_ErrorBanner, SaveRow as SF_SaveRow, SuccessBanner as SF_SuccessBanner, Toggle as Settings_Toggle } from "@/components/settings/SettingsFields";
import { TypeBadge, HistoryThumb, MonthGroup, Dot, StatGrid, PageHeader, newestFirst } from "@/components/history/HistoryParts";
import { averageRating } from "@/components/history/averageRating";
import { UserAvatar } from "@/components/UserAvatar";
import { shortName } from "@/lib/avatar";
import { MessagesInboxHeader, tabDomId } from "@/components/messages/MessagesInboxHeader";
import { ThreadRow } from "@/components/messages/ThreadRow";
import { ClaimStatusPill } from "@/components/messages/ClaimStatusPill";
import { OfferBanner } from "@/components/messages/OfferBanner";
import { MessageRow, DateSeparator } from "@/components/messages/MessageRow";
import { ThreadMenu } from "@/components/messages/ThreadMenu";
import { ReportDialog } from "@/components/messages/ReportDialog";
import { useThreadAutoScroll, NewMessagesPill } from "@/components/messages/useThreadAutoScroll";
import { ThreadEmptyState, matchesOpenTarget, conversationFromUrl } from "@/components/messages/ThreadEmptyState";
import { claimPill, isLiveClaim, pickupWhen } from "@/components/messages/claimStatus";
import { inboxTime, messageTime, previewText, withDaySeparators } from "@/components/messages/format";
import { CategorySelect } from "@/components/CategorySelect";
import { CATEGORIES, categoryFor, categoryLabel, categoryEmoji, categoryValueFromLabel } from "@/lib/categories";
import { useAuth } from "@/context/AuthContext";
import { useDropCycle } from "@/context/DropCycleContext";
import { formatPickupDateList, formatPickupDateLong } from "@/lib/pickupDates";
import { PICKUP_WINDOWS, selectedPickupWindows } from "@/lib/pickupWindows";
import {
  dropCloseMoment,
  nextDropMoment,
  toSellerOverviewPhase,
  formatCompactCountdown,
  dropOpenDay,
  dropOpenHour,
  dropOpenHourCompact,
} from "@/lib/dropCycle";
import { submitSubmission, isValidEmail } from "@/lib/submissions";
import {
  BARRHAVEN_NEIGHBOURHOODS,
  SUPPORT_EMAIL,
  findNeighbourhood,
  formatPostalCode,
  groupedNeighbourhoodOptions,
  neighbourhoodsForFsa,
  serviceAreaForPostalCode,
} from "@/lib/barrhaven";
import {
  Camera, X, Check, ChevronRight, ChevronLeft, ChevronDown, Sparkles, Zap,
  MessageCircle, Package, Eye, ArrowRight, User, Clock, Calendar,
  CheckCircle, MapPin, LayoutGrid, Box, DollarSign, ClipboardList,
  MessageSquare, Plus, Truck, History, ArrowLeft, Shield, Tag, TrendingDown,
  Home, Heart, Mail, Info, Lock, CreditCard, Banknote, Upload, RefreshCw,
  Star, Settings, Bell, Award, Leaf, Send, Share2, AlertCircle,
  Search, CreditCard as CardIcon, LogOut, Loader2, ShoppingBag, Archive,
  Paperclip, Smile, Flag, ExternalLink
} from "lucide-react";
import { Pencil, Trash2, CalendarClock, UserX, Undo2, FileDown, HelpCircle, ShoppingCart, PanelLeft } from "lucide-react";
import { ItemActionsMenu } from "@/components/inventory/ItemActionsMenu";
import { ClaimCardFrame, PriceTag } from "@/components/inventory/ClaimCardParts";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { copyText, openShareWindow, shareLinks } from "@/lib/share";
import { SellerOverview } from "@/components/seller-overview/SellerOverview";
import Image from "next/image";

/* ============================================================
   DESIGN SYSTEM — brand palette, site font
   Matched to buyer dashboard. Brand: green #308424, amber #F09000.
   ============================================================ */
const C = {
  // The seller's colour (client redesign): orange in every Drop state for the
  // shell's buttons, active nav, Seller toggle and badges. White text on it is
  // 5.2:1; it's 4.8:1 on soPeach and 4.55:1 on soMist. Green stays for live
  // status only.
  so:      "#C2410C",
  soDeep:  "#9A3412",
  soMist:  "#FFEDE0",
  soPeach: "#FFF4EC",
  soLine:  "#ECE6E0",
  soInk:   "#1C1917",
  paper:     "#FFFFFF",
  page:      "#FFFFFF",
  sand:      "#FBFDFB",
  fawn:      "#E3EAE2",
  smoke:     "#D4DDD3",
  ash:       "#60745D",
  mink:      "#5F755C",
  ink:       "#0F360B",
  green:     "#33802B",
  greenDeep: "#2C6126",
  greenMist: "#E2EFE0",
  amber:     "#F99605",
  amberDeep: "#A35C00",
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
  gLightBg:  "#E2EFE0",
  gSoft:     "#E2EFE0",
  gAccent:   "#308424",
  gPrimary:  "#33802B",
  gHover:    "#2C6126",
  gDark:     "#2C6126",
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
// Hover / pressed wash for the white banner pills (.dy-banner-pill): light
// enough that the label (amberDeep / greenDeep / claret) keeps 4.5:1.
const PILL_TINT = { amber: "#FFF2DF", green: "#EEF6EC", claret: "#FEF4F3" };
const F = {
  head: 'var(--font-instrument-sans), -apple-system, BlinkMacSystemFont, sans-serif',
  body: 'var(--font-instrument-sans), -apple-system, BlinkMacSystemFont, sans-serif',
  // Legacy aliases
  h:    'var(--font-instrument-sans), -apple-system, BlinkMacSystemFont, sans-serif',
  b:    'var(--font-instrument-sans), -apple-system, BlinkMacSystemFont, sans-serif',
};

/* ============================================================
   PRICE DISPLAY
   A $0 listing is a giveaway, not an item that costs nothing —
   "$0" reads like a bug or a missing value. Everywhere a price
   is printed it becomes "Free", in claret rather than the usual
   green, so it reads as its own thing and not as the cheapest
   price on the page.

   Two helpers rather than one component: the price sits inside
   a dozen different type scales and accents, so each call site
   keeps its own styling and only swaps the text and the colour.
   `normal` is whatever colour that site already used.
   Mirrored in DropYard_BuyerDashboard.jsx — the two dashboards
   keep their own copies of these tokens by design.
   ============================================================ */
function isFreePrice(p) {
  return typeof p === "number" && p <= 0;
}
function priceText(p) {
  return isFreePrice(p) ? "Free" : "$" + p;
}
function priceColor(p, normal) {
  return isFreePrice(p) ? C.claret : normal;
}

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
// The house mark on its own (the site icon), for the collapsed sidebar's header.
const LOGO_MARK_SRC = "/icon-192.png";

/* ============================================================
   BACKEND ENUM MAPS
   The form uses richer UI labels than the Prisma enums.
   These tables collapse the rich labels onto the closest enum.
   When the schema gains more categories/conditions later, just
   widen these maps - no other call site changes.
   ============================================================ */
// Categories: the forms now hold the stored value itself (e.g. "TOYS_GAMES"),
// so nothing is collapsed on the way to the API. The list, labels and emoji
// come from lib/categories.ts (mirror of the backend registry).
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

// Reverse map - stored category -> UI label, for My Items / Edit form. One
// stored value per category now, so nothing is lost on the way back; legacy
// HOME reads as Appliances & Kitchen.
const ENUM_TO_CATEGORY_LABEL = Object.fromEntries(
  [...CATEGORIES.map(c => [c.value, c.label]), ["HOME", categoryLabel("HOME")]],
);
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
const CATEGORY_EMOJI = Object.fromEntries(
  [...CATEGORIES.map(c => [c.value, c.emoji]), ["HOME", categoryEmoji("HOME")]],
);

/* Avatar helpers */
// Every profile-initial avatar is the brand green (the Seller button's), with
// white initials. Call sites still pass the name; it no longer matters.
function avatarBg() {
  return C.green;
}
/* Claim pickup — the one way every seller surface (Messages, Orders → Scheduled
   pickups, the inventory row) marks a claim picked up. The server decides
   (PATCH /picked-up accepts only an ACCEPTED claim); the caller opens the
   rate-the-buyer prompt only once the response says the claim IS PICKED_UP.
   Orders and the inventory row used to open the rating first and send the
   PATCH after it, so a claim cancelled since the list loaded still got a
   "Item Picked Up!" rating window before the server refused it. */
async function markClaimPickedUp(claimId, token) {
  const res = await apiRequest("/api/claims/" + encodeURIComponent(claimId) + "/picked-up", { method: "PATCH", token });
  if (res?.claim?.status !== "PICKED_UP") {
    throw new Error("The claim wasn't marked picked up. Refresh and try again.");
  }
  return res.claim;
}
// Same wording as the Messages banner's error.
const pickupErrorText = (err) => "Couldn't mark picked up: " + (err?.message || "try again");

/* Global CSS injection — animations, hover behaviours */
function GlobalStyle() {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--font-instrument-sans), -apple-system, BlinkMacSystemFont, sans-serif; background: ${C.paper}; color: ${C.ink}; }
        .fade-in { animation: fadeIn 300ms ease-out both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGreen { 0% { box-shadow: 0 0 0 0 ${C.green}55; } 70% { box-shadow: 0 0 0 14px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
        @keyframes pulseAmber { 0% { box-shadow: 0 0 0 0 ${C.amber}60; } 70% { box-shadow: 0 0 0 10px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
        @keyframes pulseLive { 0% { transform: scale(1); opacity: 0.8; } 70% { transform: scale(2.2); opacity: 0; } 100% { transform: scale(2.2); opacity: 0; } }
        .chip-hover:hover { border-color: ${C.smoke} !important; }
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


/* ============================== SIDEBAR ============================== */

// Magical Seller/Buyer toggle: animated sliding pill with gradient, icons,
// glow, and a brief switching feedback before the dashboard actually flips.
function RoleToggle({ onSwitchToBuyer, buyerUnread = 0 }) {
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

  // Slider sits over the "active" half: Seller (orange, the seller's colour
  // in every Drop state) until the user picks Buyer (the buyer's green).
  const sliderOnRight = switching;

  return (
    <div style={{
      position: "relative",
      display: "flex",
      padding: 4,
      borderRadius: 14,
      background: C.paper,
      border: "1px solid " + C.soLine,
      boxShadow: "inset 0 1px 2px rgba(31,29,25,0.05)",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        top: 4, bottom: 4,
        left: 4,
        width: "calc(50% - 4px)",
        background: sliderOnRight ? C.green : C.so,
        borderRadius: 10,
        boxShadow: sliderOnRight
          ? "0 4px 12px " + C.green + "55"
          : "0 4px 12px rgba(194,65,12,0.35)",
        transform: sliderOnRight ? "translateX(100%)" : "translateX(0)",
        transition: "transform 220ms cubic-bezier(0.4, 0, 0.2, 1), background 220ms ease, box-shadow 220ms ease",
      }}/>

      {/* SELLER (always the active side while on seller dashboard) */}
      <button
        disabled
        aria-current="true"
        style={{
          flex: 1,
          minHeight: 40,
          padding: "8px 0",
          borderRadius: 10,
          border: "none",
          background: "transparent",
          cursor: "default",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          fontSize: 14,
          fontWeight: 700,
          fontFamily: F.head,
          color: sliderOnRight ? C.mink : "#fff",
          position: "relative", zIndex: 1,
          transition: "color 200ms ease",
        }}
      >
        <Tag size={15} strokeWidth={2.4} aria-hidden="true"/>
        Seller
      </button>

      {/* BUYER (clickable — slides the pill, then routes) */}
      <button
        onClick={handleBuyerClick}
        onMouseEnter={() => setHoverBuyer(true)}
        onMouseLeave={() => setHoverBuyer(false)}
        disabled={switching}
        aria-label={"Switch to Buyer" + buyerUnreadLabel(buyerUnread)}
        style={{
          flex: 1,
          minHeight: 40,
          padding: "8px 0",
          borderRadius: 10,
          border: "none",
          background: hoverBuyer && !sliderOnRight ? C.soPeach : "transparent",
          cursor: switching ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          fontSize: 14,
          fontWeight: 700,
          fontFamily: F.head,
          color: sliderOnRight ? "#fff" : C.soInk,
          position: "relative", zIndex: 1,
          transition: "color 200ms ease, background 150ms ease",
        }}
      >
        <ShoppingCart size={15} strokeWidth={2.4} aria-hidden="true"/>
        Buyer
        <SwitchUnreadTag unread={buyerUnread} top={-2} right={4}/>
      </button>
    </div>
  );
}

// Compact "Switch to Buyer" pill — shown in the TopNav on mobile only (CSS
// gated via `.dy-mobile-only` class). The full RoleToggle above lives in the
// desktop sidebar; mobile users need an equivalent affordance because the
// sidebar is hidden. Mirrors the buyer dashboard's compact SwitchToSellerButton
// in shape, swapped to the buyer-side green tint.
// `unread` = buyer-side conversations with unread messages, so a message to
// the side you aren't looking at still shows.
// Why an amount field's action is disabled ("Enter an amount"). A polite live
// region, so it's announced when it appears; the field and the disabled
// button point at it with aria-describedby. Always rendered: while empty it
// takes no space but stays in the accessibility tree, so the region exists
// before its text does. (Same as the buyer dashboard's.)
function AmountHint({ id, problem, style = null }) {
  return (
    <span id={id} role="status" aria-live="polite" style={problem
      ? { fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, ...style }
      : { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
      {problem || ""}
    </span>
  );
}

function buyerUnreadLabel(unread) {
  return unread > 0 ? `, ${unread} unread buyer conversation${unread === 1 ? "" : "s"}` : "";
}
// Envelope count pinned to a switch control's corner; the same tag as the
// Messages tab's. Decorative: the control's own label carries the count.
// `onFill`: the tag sits on a solid coloured button, so it turns white with
// that colour's text (and a ring in `ring`) instead of solid green.
function SwitchUnreadTag({ unread, top = -7, right = -7, onFill = null, ring = null }) {
  if (!(unread > 0)) return null;
  return (
    <span aria-hidden="true" style={{
      position: "absolute", top, right,
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 6px", borderRadius: 999,
      background: onFill ? C.paper : C.green, color: onFill || "#fff",
      boxShadow: onFill ? "0 0 0 1.5px " + ring + ", 0 0 0 3.5px " + C.paper : "0 0 0 2px " + C.paper,
      fontFamily: F.head, fontSize: 10, fontWeight: 800, lineHeight: 1.2,
      pointerEvents: "none", zIndex: 2,
    }}>
      <Mail size={11} strokeWidth={2.4}/>
      {unread > 99 ? "99+" : unread}
    </span>
  );
}
// The phone header's Switch to Buyer: icon-only (desktop has the sidebar's
// RoleToggle instead), styled like the buyer header's Switch to Seller — a
// solid circle in the Drop's colour (green live, brown between Drops) with a
// white icon. The envelope tag is white here so it reads on the solid fill.
function SwitchToBuyerButton({ onClick, unread = 0 }) {
  const [hover, setHover] = useState(false);
  // The seller's orange in every Drop state (white icon 5.2:1).
  const fill = C.so;
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={"Switch to Buyer" + buyerUnreadLabel(unread)}
      title={"Switch to Buyer" + buyerUnreadLabel(unread)}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        // 36px: the same size as the bell beside it in the phone header.
        width: 36,
        height: 36,
        padding: 0,
        borderRadius: 999,
        border: "none",
        background: hover ? C.soDeep : fill,
        cursor: "pointer",
        color: "#fff",
        boxShadow: "0 4px 12px rgba(194,65,12,0.25)",
        transition: "background-color 180ms ease",
      }}
    >
      <ShoppingBag size={17} strokeWidth={2.3} aria-hidden="true"/>
      <SwitchUnreadTag unread={unread} onFill={C.soDeep} ring={fill}/>
    </button>
  );
}

// Magic nav item: left accent bar with glow on active, sliding chevron on
// hover, premium icon tile with subtle elevation, smooth transitions.
// In `collapsed` (rail) mode, renders icon-only with the label in `title`
// as a native tooltip.
// `showBadge` (the amber "3/5" AI-credit pill on Settings) is gone. It was a
// hardcoded string, not a count: every free seller saw "3/5" whether they had
// used AI nothing times or fifty. There is no credit tracking behind it —
// no column, no route, no counter anywhere in the backend — so it could only
// ever be decoration that read as data. If per-seller AI credits are built
// later, this comes back reading a real number.
// envelopeCount: unread conversations, shown on the expanded Messages item as
// a green envelope tag (Feedback 14 · 4). Same source as the bell.
function SidebarNavItem({ item, active, Icon, onClick, count = 0, countLabel = "", collapsed = false }) {
  const label = item.label + (count > 0 ? ", " + countLabel : "");
  const common = {
    onClick: item.href ? undefined : onClick,
    "aria-current": active ? "page" : undefined,
    className: "dy-seller-nav-item" + (active ? " is-active" : "") + (collapsed ? " is-collapsed" : ""),
    title: collapsed ? item.label : undefined,
    "aria-label": collapsed || count > 0 ? label : undefined,
  };
  const inner = (
    <>
      {/* The active item's mark on the sidebar's left edge. */}
      {active && <span aria-hidden="true" className="dy-seller-nav-item__bar"/>}
      <Icon size={collapsed ? 21 : 20} strokeWidth={2} aria-hidden="true" className="dy-seller-nav-item__icon"/>
      {!collapsed && <span className="dy-seller-nav-item__label">{item.label}</span>}
      {count > 0 && (
        <span aria-hidden="true" className={"dy-seller-nav-item__count" + (collapsed ? " is-dot" : "")}>{count > 99 ? "99+" : count}</span>
      )}
    </>
  );
  return item.href
    ? <a href={item.href} {...common}>{inner}</a>
    : <button type="button" {...common}>{inner}</button>;
}

// Mobile primary nav — fixed to the bottom of the viewport, replaces the
// sidebar on small screens. 5 tabs with the Sell action elevated to a green
// pill so creating listings is one thumb-tap away. Respects iOS safe-area.
function MobileBottomNav({ activeView, onNav, messagesUnread = 0, questionsPending = 0 }) {
  // "You" opens a small menu: History, Settings and Help & Support.
  const [youOpen, setYouOpen] = useState(false);
  const youRef = useRef(null);
  useEffect(() => {
    if (!youOpen) return;
    const onKey = (e) => { if (e.key === "Escape") { setYouOpen(false); youRef.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [youOpen]);
  const navItems = [
    { id: "overview",   label: "Home",     icon: LayoutGrid,    matches: ["overview"] },
    // Same badge as the desktop sidebar — Questions lives under Items.
    { id: "items",      label: "Items",    icon: Box,           matches: ["items","orders","claims","pickups","edit-item","item-detail","questions"], badge: questionsPending > 0 ? questionsPending : null },
    { id: "add-manual", label: "Sell",     icon: Plus,          matches: ["add-manual","add-chooser","add-ai","ai-setup","ai-photos"], primary: true },
    { id: "messages",   label: "Messages", icon: MessageSquare, matches: ["messages"], badge: messagesUnread > 0 ? messagesUnread : null },
    { id: "you",        label: "You",      icon: User,          matches: ["history","settings","ai-plan"], menu: true },
  ];
  const youItems = [
    { id: "history",  label: "History",        icon: History },
    { id: "settings", label: "Settings",       icon: Settings },
    { id: "help",     label: "Help & Support", icon: HelpCircle, href: "/help-center" },
  ];
  return (
    <nav role="navigation" aria-label="Primary" className="dy-mobile-bottom-nav" style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60,
      background: "rgba(255, 252, 250, 0.94)",
      backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)",
      borderTop: "1px solid " + C.soLine,
      boxShadow: "0 -4px 20px rgba(31, 29, 25, 0.06)",
      paddingBottom: "env(safe-area-inset-bottom, 0)",
    }}>
      {youOpen && (
        <>
          <div onClick={() => setYouOpen(false)} style={{ position: "fixed", inset: 0, zIndex: -1 }}/>
          <ul id="dy-seller-you-menu" role="menu" aria-label="You" className="dy-rise" style={{
            position: "absolute", right: 10, bottom: "calc(100% + 8px)", minWidth: 220, listStyle: "none",
            background: C.paper, borderRadius: 16, border: "1px solid " + C.soLine,
            boxShadow: "0 14px 36px rgba(31, 29, 25, 0.16)", padding: 6,
          }}>
            {youItems.map((it) => {
              const Ic = it.icon;
              const active = activeView === it.id;
              const style = { display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 48, padding: "0 14px", borderRadius: 12, border: "none", background: active ? C.soMist : "transparent", color: active ? C.so : C.soInk, fontFamily: F.head, fontSize: 15, fontWeight: active ? 800 : 600, cursor: "pointer", textDecoration: "none", textAlign: "left" };
              return (
                <li key={it.id} role="none">
                  {it.href
                    ? <a role="menuitem" href={it.href} style={style}><Ic size={19} aria-hidden="true"/>{it.label}</a>
                    : <button role="menuitem" type="button" aria-current={active ? "page" : undefined} onClick={() => { setYouOpen(false); onNav(it.id); }} style={style}><Ic size={19} aria-hidden="true"/>{it.label}</button>}
                </li>
              );
            })}
          </ul>
        </>
      )}
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
                  color: C.so,
                }}
              >
                <span style={{
                  width: 48, height: 34, borderRadius: 999,
                  background: C.so,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 3px 10px rgba(194,65,12,0.35)",
                  marginBottom: 2,
                }}>
                  <Ic size={20} strokeWidth={2.8} style={{ color: "#fff" }}/>
                </span>
                <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, letterSpacing: "0.02em", whiteSpace: "nowrap", color: C.so }}>{item.label}</span>
              </button>
            );
          }
          // The count is drawn as a bare number; say what it counts.
          const countLabel = !item.badge ? ""
            : item.id === "messages" ? ", " + item.badge + " unread conversation" + (item.badge === 1 ? "" : "s")
            : item.id === "items" ? ", " + item.badge + " unanswered question" + (item.badge === 1 ? "" : "s")
            : "";
          return (
            <button
              key={item.id}
              ref={item.menu ? youRef : undefined}
              onClick={() => (item.menu ? setYouOpen((o) => !o) : onNav(item.id))}
              aria-label={item.label + countLabel}
              aria-current={active ? "page" : undefined}
              aria-haspopup={item.menu ? "menu" : undefined}
              aria-expanded={item.menu ? youOpen : undefined}
              aria-controls={item.menu && youOpen ? "dy-seller-you-menu" : undefined}
              style={{
                position: "relative",
                flex: 1, minWidth: 0,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                padding: "10px 4px 8px",
                border: "none", background: "transparent", cursor: "pointer",
                color: active ? C.so : C.mink,
                transition: "color 150ms",
              }}
            >
              {active && (
                <span aria-hidden="true" style={{
                  position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)",
                  width: 48, height: 32, borderRadius: 999,
                  background: C.soMist,
                }}/>
              )}
              <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "transform 150ms", transform: active ? "scale(1.05)" : "scale(1)" }}>
                <Ic size={22} strokeWidth={active ? 2.4 : 2}/>
                {item.badge != null && (
                  <span style={{
                    position: "absolute", top: -4, right: -10,
                    minWidth: 16, height: 16, padding: "0 4px",
                    borderRadius: 999, background: C.so, color: "#fff",
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

// `aiPlan` was only ever read to decide whether to show the "3/5" pill, so it
// leaves with it. AIPlanView still takes it — that view is where a real plan
// state would belong.
function Sidebar({ activeView, onNav, onSwitchRole, collapsed = false, messagesUnread = 0, questionsPending = 0, otherUnread = 0 }) {
  // The client's sidebar: one list, a divider before Settings.
  const items = [
    { id: "overview",  label: "Overview",       icon: LayoutGrid },
    { id: "inventory", label: "My Items",       icon: Box, group: "inv" },
    { id: "messages",  label: "Messages",       icon: MessageSquare },
    { id: "history",   label: "History",        icon: History },
    { divider: true },
    { id: "settings",  label: "Settings",       icon: Settings },
    { id: "help",      label: "Help & Support", icon: HelpCircle, href: "/help-center" },
  ];
  function handleClick(item) {
    if (item.id === "inventory") return onNav("items");
    onNav(item.id);
  }
  function isActive(item) {
    if (item.group === "inv") return ["items","orders","claims","pickups","questions","item-detail","edit-item","add-chooser","add-manual","add-ai","ai-setup","ai-photos"].includes(activeView);
    if (item.id === "settings") return activeView === "settings" || activeView === "ai-plan";
    return activeView === item.id;
  }
  // Unread conversations on Messages; unanswered questions on My Items
  // (the Questions tab lives there).
  const countFor = (item) => item.id === "messages" ? messagesUnread : item.id === "inventory" ? questionsPending : 0;
  const countLabelFor = (item, n) => item.id === "messages"
    ? n + " unread conversation" + (n === 1 ? "" : "s")
    : n + " unanswered question" + (n === 1 ? "" : "s");

  return (
    <aside className="dy-desktop-sidebar" style={{
      width: collapsed ? 76 : 240,
      borderRight: "1px solid " + C.soLine,
      background: "#FFFCFA",
      display: "flex", flexDirection: "column",
      height: "100%", flexShrink: 0,
      transition: "width 240ms cubic-bezier(0.4, 0, 0.2, 1)",
      overflow: "hidden",
    }}>
      {!collapsed && (
        <div style={{ padding: "16px 14px 0" }}>
          <RoleToggle onSwitchToBuyer={onSwitchRole} buyerUnread={otherUnread}/>
        </div>
      )}

      {/* + List an Item: full label when expanded, icon-only in the rail. */}
      <div style={{ padding: collapsed ? "16px 14px 6px" : "16px 14px 6px" }}>
        <button
          onClick={() => onNav("add-manual")}
          className="cta-primary dy-so-btn dy-so-btn--filled"
          title={collapsed ? "List an Item" : undefined}
          aria-label={collapsed ? "List an Item" : undefined}
          style={{
            width: "100%", minHeight: 48,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: 0,
            borderRadius: 999, border: "none", cursor: "pointer",
            background: C.so, color: "#fff",
            fontSize: 16, fontWeight: 700, fontFamily: F.head,
            boxShadow: "0 8px 18px -8px rgba(194,65,12,0.75)",
          }}
        >
          <Plus size={collapsed ? 20 : 19} strokeWidth={2.4} aria-hidden="true"/>
          {!collapsed && "List an Item"}
        </button>
      </div>

      <nav aria-label="Seller" style={{ padding: collapsed ? "12px 10px" : "14px 12px", overflowY: "auto", flex: "0 1 auto", minHeight: 0 }}>
        <ul style={{ listStyle: "none" }}>
          {items.map((item, i) => item.divider
            ? <li key={"d" + i} aria-hidden="true" style={{ height: 1, background: C.soLine, margin: collapsed ? "10px 6px" : "12px 10px" }}/>
            : (
              <li key={item.id} style={{ marginBottom: 4 }}>
                <SidebarNavItem
                  item={item}
                  active={isActive(item)}
                  Icon={item.icon}
                  onClick={() => handleClick(item)}
                  count={countFor(item)}
                  countLabel={countLabelFor(item, countFor(item))}
                  collapsed={collapsed}
                />
              </li>
            ))}
        </ul>
      </nav>

      {/* The warm illustration at the bottom: decorative; not in the rail,
          and dropped on short windows (globals.css). */}
      {!collapsed && (
        <div aria-hidden="true" className="dy-seller-sidebar-art" style={{ marginTop: "auto", padding: "10px 8px 0" }}>
          <Image src="/images/seller-overview/sidebar-illustration-placeholder.png" alt="" width={224} height={181} style={{ width: "100%", height: "auto", display: "block" }}/>
        </div>
      )}
    </aside>
  );
}

// Avatar with dropdown menu - real user initials and sign-out.
// `live`: the initials fallback follows the Drop like the buyer header's
// avatar — green while a Drop is live, brown between Drops.
function SellerUserMenu({ user, onSignout }) {
  const [open, setOpen] = useState(false);
  // The sign-out dialog hands focus back to whatever had it when it opened.
  // The menu item that opens it disappears with the menu, so focus moves to
  // the account button first and Esc / "Stay" land back there.
  const buttonRef = useRef(null);
  const displayName = user?.name || "Guest";
  const firstName = user?.firstName || (user?.name ? user.name.split(/\s+/)[0] : "");
  // Esc closes it and hands focus back to the account button; a click
  // outside lands on the backdrop below, which closes it too.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(o => !o)}
        title={displayName}
        aria-label={"Account menu" + (user?.name ? " for " + user.name : "")}
        aria-expanded={open}
        className="dy-seller-account"
        style={{
          minHeight: 44, borderRadius: 999,
          display: "flex", alignItems: "center", gap: 10,
          border: "none", cursor: "pointer", padding: "4px 8px 4px 4px",
          fontFamily: F.head, fontSize: 16, fontWeight: 600, color: C.soInk,
        }}
      >
        {/* Photo, DropYard avatar or initials — updates the moment Settings
            saves (AuthContext) or another tab does (user:updated). */}
        <UserAvatar
          avatar={user?.avatar}
          name={user?.name}
          size={36}
          decorative
          eager
          initialsBg={C.so}
          fontFamily={F.head}
          fontWeight={900}
          fontSize={12}
        />
        {firstName && <span className="dy-desktop-only" style={{ maxWidth: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{firstName}</span>}
        <ChevronDown className="dy-desktop-only" size={18} strokeWidth={2.2} aria-hidden="true" style={{ color: C.soInk, transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }}/>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }}/>
          <div className="dy-rise" style={{
            position: "absolute", right: 0, top: "calc(100% + 10px)", zIndex: 50,
            minWidth: 240, borderRadius: 14, background: C.paper,
            border: "1px solid " + C.soLine, boxShadow: "0 12px 32px rgba(31, 29, 25, 0.12)",
            overflow: "hidden",
          }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid " + C.soLine }}>
              <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.soInk, marginBottom: 2 }}>
                {displayName}
              </p>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, wordBreak: "break-all" }}>
                {user?.email || ""}
              </p>
            </div>
            <button
              onClick={() => { setOpen(false); buttonRef.current?.focus(); onSignout && onSignout(); }}
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
    "items","orders","claims","pickups","questions","item-detail",
    "edit-item","add-chooser","add-manual","add-ai","ai-setup","ai-photos",
  ].includes(view)) return "My Items";
  // Fallback — humanize the view id.
  return (view || "").charAt(0).toUpperCase() + (view || "").slice(1).replace(/-/g, " ");
}

function TopNav({ user, onSignout, activeView, onToggleSidebar, onSwitchRole, otherUnread = 0, sidebarCollapsed = false, onSearch = null }) {
  // No `useViewport()` here on purpose — layout flips between mobile/desktop
  // happen entirely via CSS media queries on the `.dy-seller-topnav*` classes
  // defined in globals.css (BUG-030: no first-paint flicker on phones).
  const viewLabel = labelForView(activeView);
  const [query, setQuery] = useState("");
  return (
    <header className={"dy-seller-topnav" + (sidebarCollapsed ? " is-collapsed" : "")}>
      {/* LOGO ZONE: the sidebar's width on desktop, with the tagline. With
          the sidebar collapsed it narrows to match and shows the house mark
          alone (the CSS picks which image shows; phones keep the wordmark). */}
      <div className="dy-seller-topnav__logo-zone">
        <Link href="/" title="DropYard home" className="dy-seller-topnav__brand">
          <img src={LOGO_SRC} alt="DropYard" className="dy-seller-topnav__logo"/>
          <Image src={LOGO_MARK_SRC} alt="DropYard" width={40} height={40} className="dy-seller-topnav__mark"/>
          <span className="dy-seller-topnav__tagline">From one home to another</span>
        </Link>
      </div>

      {/* Page title, with the small sidebar toggle on desktop. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <button
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!sidebarCollapsed}
          className="dy-desktop-only dy-seller-topnav__toggle"
        >
          <PanelLeft size={18} strokeWidth={2} aria-hidden="true"/>
        </button>
        <p className="dy-seller-topnav__title">{viewLabel}</p>
      </div>

      {/* Search my items: Enter opens My items filtered by title. */}
      <form
        role="search"
        className="dy-desktop-only dy-seller-topnav__search"
        onSubmit={(e) => { e.preventDefault(); if (onSearch) onSearch(query.trim()); setQuery(""); }}
      >
        <Search size={18} aria-hidden="true" strokeWidth={2.2} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: C.mink, pointerEvents: "none" }}/>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search my items…"
          aria-label="Search my items"
          enterKeyHint="search"
          className="dy-seller-topnav__search-input"
        />
      </form>

      {/* RIGHT — bell, (phones) Switch to Buyer, account. */}
      <div className="dy-seller-topnav__right">
        {/* Everything waiting on BOTH sides: unread conversations and claim,
            offer, pickup and question events. See NotificationBell. */}
        <NotificationBell tone="seller"/>
        {onSwitchRole && (
          <span className="dy-mobile-only" style={{ display: "inline-flex" }}>
            <SwitchToBuyerButton onClick={() => onSwitchRole()} unread={otherUnread}/>
          </span>
        )}
        <span aria-hidden="true" className="dy-desktop-only" style={{ width: 1, height: 30, background: C.soLine }}/>
        <SellerUserMenu user={user} onSignout={onSignout}/>
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

// Sell-with-AI teaser. Compact opt-in card with rotating capability ticker.
// The notify CTA posts a SELLER_AI_WAITLIST submission so admins see it in
// the Inbox.
function SellWithAITeaser({ notified, onNotify }) {
  const features = [
    { icon: Camera,         label: "Create listings from photos" },
    { icon: MessageSquare,  label: "Answer buyer questions instantly" },
    { icon: RefreshCw,      label: "Negotiate offers automatically" },
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
        <div style={{ flex: 1, minWidth: "min(280px, 100%)" }}>
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
    ctaLine  = "Claim now. I'll choose from the claims I get.";
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

  // The link formats are shared with the item share menu on cards (lib/share).
  function shareWhatsApp() { openShareWindow(shareLinks.whatsapp(shareText)); }
  function shareX()        { openShareWindow(shareLinks.x(shareTextShort)); }
  function shareFacebook() { openShareWindow(shareLinks.facebook(SHARE_URL, shareText)); }
  function shareEmail()    { window.location.href = shareLinks.email(emailSubject, shareText); }
  function shareSMS()      { window.location.href = shareLinks.sms(shareText); }
  async function copyLink() {
    if (await copyText(shareText)) {
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
    <ModalPortal>
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(31, 29, 25, 0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: Z.modal, padding: isMobile ? 12 : 24,
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <ModalA11y label="Share your listings" onClose={onClose}/>
      <div
        onClick={(e) => e.stopPropagation()}
        className={"fade-in " + DIALOG_PANEL}
        style={{
          width: 520, maxWidth: "100%",
          borderRadius: 24,
          background: C.paper,
          boxShadow: "0 20px 48px rgba(31,29,25,0.14), 0 8px 16px rgba(31,29,25,0.08)",
          display: "flex", flexDirection: "column",
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
    </ModalPortal>
  );
}

// The seller Overview: components/seller-overview/SellerOverview (the client's
// redesign, in BEFORE / DURING / AFTER versions). This wrapper supplies what
// its buttons do and keeps the dashboard's own pieces: the share sheet
// ("Share my listings"), the "Confirm item pickup?" dialog and the toast.
function Overview({ onNav, user, sellerItems = null, accessToken = null, goToItems, onOpenThread, onEdit }) {
  const { width } = useViewport();
  const [showShare, setShowShare] = useState(false);
  const [pendingPickup, setPendingPickup] = useState(null); // { claimId, itemId, title, photo }
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState(null);
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4500); };
  const firstName = user?.firstName || (user?.name ? user.name.split(/\s+/)[0] : "there");

  // What the share sheet lists: live items on the Shelf or in the Drop.
  const shareItems = (Array.isArray(sellerItems) ? sellerItems : [])
    .filter((i) => i && i.status === "LIVE" && (i.placement === "DROP" || i.placement === "SHELF"))
    .map((i) => ({ id: i.id, t: i.title, price: i.price, layer: i.placement === "DROP" ? "drop" : "shelf", isBundle: !!i.isBundle, bundleContents: Array.isArray(i.bundleContents) ? i.bundleContents : [] }));

  async function confirmPickup() {
    const p = pendingPickup;
    setPendingPickup(null);
    if (!p || !accessToken) return;
    try {
      await markClaimPickedUp(p.claimId, accessToken);
      flash("Pickup complete! “" + p.title + "” is marked as picked up. You can rate the buyer in History.");
    } catch (err) {
      flash(pickupErrorText(err));
    }
    setRefreshKey((k) => k + 1);
  }

  return (
    <>
      <SellerOverview
        firstName={firstName}
        accessToken={accessToken}
        refreshKey={refreshKey}
        actions={{
          listItem: () => onNav("add-manual"),
          share: shareItems.length > 0 ? () => setShowShare(true) : null,
          goToItems: (filter, itemId = null) => (goToItems ? goToItems(filter, itemId) : onNav("items")),
          openThread: (conversationId) => (onOpenThread ? onOpenThread(conversationId) : onNav("messages")),
          editItem: (itemId) => {
            const item = Array.isArray(sellerItems) ? sellerItems.find((i) => i && i.id === itemId) : null;
            if (item && onEdit) onEdit(item); else if (goToItems) goToItems(null, itemId);
          },
          confirmPickup: (row) => setPendingPickup(row),
          nav: (view) => onNav(view),
        }}
      />
      {showShare && <ShareSheet items={shareItems} onClose={() => setShowShare(false)}/>}
      {pendingPickup && (
        <PickupConfirmDialog
          kind="pickup"
          item={{ t: pendingPickup.title, e: "\u{1F4E6}", photos: pendingPickup.photo ? [pendingPickup.photo] : [] }}
          buyer={null}
          isMobile={width <= 768}
          onCancel={() => setPendingPickup(null)}
          onConfirm={confirmPickup}
        />
      )}
      {toast && (
        <ModalPortal>
          <div style={{ position: "fixed", left: 16, right: 16, bottom: width <= 768 ? "calc(84px + env(safe-area-inset-bottom, 0px))" : 24, zIndex: Z.toast, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
            <div role="status" className="fade-in" style={{ pointerEvents: "auto", width: "100%", maxWidth: 520, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 12px 16px", borderRadius: 14, background: C.greenMist, border: "1px solid " + C.green + "40", boxShadow: "0 12px 32px -8px rgba(15, 54, 11, 0.3)" }}>
              <CheckCircle size={16} style={{ color: C.greenDeep, flexShrink: 0 }} aria-hidden="true"/>
              <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.greenDeep, flex: 1, overflowWrap: "anywhere" }}>{toast}</p>
              <button onClick={() => setToast(null)} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <X size={14} style={{ color: C.greenDeep }} aria-hidden="true"/>
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
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
      <ModalPortal>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.modal, padding: isMobile ? 16 : 24, backdropFilter: "blur(4px)" }}>
        <div onClick={e => e.stopPropagation()} className={"fade-in " + DIALOG_PANEL} style={{ width: 440, maxWidth: "100%", borderRadius: 24, background: C.paper, padding: isMobile ? 26 : 36, boxShadow: "0 24px 64px rgba(31, 29, 25, 0.2)", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: C.greenMist, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <CheckCircle size={32} style={{ color: C.greenDeep }} strokeWidth={2.4}/>
          </div>
          <h3 style={{ fontFamily: F.head, fontSize: 20, fontWeight: 900, color: C.ink, marginBottom: 8, letterSpacing: "-0.01em" }}>Welcome to Pro!</h3>
          <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.mink, lineHeight: 1.6 }}>Your Pro features are now active. Unlimited AI listings, full negotiation, and priority processing — all yours.</p>
        </div>
      </div>
      </ModalPortal>
    );
  }

  return (
    <ModalPortal>
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.modal, padding: 24, backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} className={"fade-in " + DIALOG_PANEL} style={{ width: "100%", maxWidth: 480, borderRadius: 24, background: C.paper, boxShadow: "0 24px 64px rgba(31, 29, 25, 0.2)" }}>
        {/* Header — brand violet/AI gradient; stays at the top while the form scrolls. */}
        <div style={{ ...dialogHead(0), padding: "22px 26px", background: "linear-gradient(135deg, " + C.ai + ", #6D28D9)", color: "#fff" }}>
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

          {/* CTA — kept in view at the bottom of the panel. */}
          <div style={{ paddingTop: 2, ...dialogFoot(isMobile ? 18 : 22) }}>
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
    </div>
    </ModalPortal>
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
  // Kept so onSave still returns whatever was saved before; there is no
  // control for them any more (WhatsApp notifications were never sent).
  const waNotif = settings.waNotif !== false;
  const waPhone = settings.waPhone || "";
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
                <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>Buyers can request any day. You&apos;ll agree a time with the buyer in Messages before the pickup is scheduled.</p>
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

          {/* No WhatsApp notifications card: nothing sends WhatsApp messages.
              The saved waNotif / waPhone values are passed through unchanged. */}

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

/* Shared by the new-listing and edit forms, which must stay identical. */
const FORM_LABEL = { display: "block", fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 6, fontFamily: F.body };
// 16px: iOS zooms the page when a smaller input takes focus.
const FORM_INPUT = { width: "100%", minHeight: 46, padding: "10px 14px", borderRadius: 10, border: "1.5px solid " + C.smoke, fontSize: 16, fontFamily: F.body, color: C.ink, background: C.paper, boxSizing: "border-box" };
function formCard(isMobile) {
  return { padding: isMobile ? 16 : 24, borderRadius: 16, border: "1px solid " + C.fawn, background: C.paper, minWidth: 0 };
}
function formChip(on) {
  return { minHeight: 38, padding: "7px 12px", borderRadius: 8, border: "1.5px solid " + (on ? C.green : C.smoke), cursor: "pointer", fontSize: 13, fontWeight: on ? 700 : 500, background: on ? C.greenMist : C.paper, color: on ? C.greenDeep : C.mink, fontFamily: F.body, transition: "background-color 150ms, border-color 150ms" };
}
function FormHeading({ title, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontFamily: F.head, fontSize: 17, fontWeight: 800, color: C.ink }}>{title}</h3>
      <p style={{ fontFamily: F.body, fontSize: 13, color: C.mink, marginTop: 3, lineHeight: 1.45 }}>{hint}</p>
    </div>
  );
}

function ManualItemForm({ onDone, onBack, onGoToItems, onGoToSettings = null, onEnhanceAI, aiSettings = {}, accessToken = null, onItemCreated = null }) {
  const dropOpenCountdown = useDropOpenCountdownString();
  const { isMobile } = useViewport();
  const fieldId = useId();
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
    if (!cat) { document.getElementById(fieldId + "-cat-field")?.focus(); return setSubmitError("Pick a category."); }
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
          category:      cat || "OTHER",
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
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "1px solid " + C.smoke, background: C.paper, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.mink, fontFamily: F.body, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back
      </button>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: C.ink, fontFamily: F.head }}>List New Item</h2>
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
            <FormHeading title="Photos" hint="Clear, well-lit photos help your item get claimed."/>
            {/* Hidden real file input - triggered by dropzone and Add tile */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <button type="button" onClick={openFilePicker} disabled={submitting}
              style={{ width: "100%", height: 180, borderRadius: 14, border: "2px dashed " + C.smoke, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: submitting ? "not-allowed" : "pointer", background: C.sand, transition: "all 0.2s", opacity: submitting ? 0.6 : 1 }}
              onMouseEnter={e => { if (!submitting) { e.currentTarget.style.borderColor = C.gPrimary; e.currentTarget.style.backgroundColor = C.gLightBg; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.smoke; e.currentTarget.style.backgroundColor = C.sand; }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.gLightBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Camera size={24} style={{ color: C.gPrimary }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: F.body }}>Choose photos to upload</span>
              <span style={{ fontSize: 12, color: C.ash, fontFamily: F.body }}>JPG, PNG up to 10MB each &middot; max {MAX_PHOTOS} photos</span>
            </button>

            {/* Photo thumbnails */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {photos.map((p, idx) => (
                <div key={p.id} style={{ width: 88, height: 88, borderRadius: 12, border: "1.5px solid " + (idx === 0 ? C.amber : C.gPrimary + "30"), backgroundColor: C.gLightBg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                  {p.preview ? (
                    <img src={p.preview} alt={"Photo " + (idx + 1)} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: p.uploading ? 0.5 : 1 }}/>
                  ) : (
                    <Camera size={20} style={{ color: C.gPrimary }}/>
                  )}
                  {p.uploading && (
                    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.gPrimary, fontFamily: F.body, background: "rgba(255,255,255,0.6)" }}>
                      Uploading…
                    </span>
                  )}
                  {!p.uploading && idx === 0 && (
                    <span style={{ position: "absolute", top: 4, left: 4, padding: "2px 6px", borderRadius: 999, background: C.amber, color: C.ink, fontFamily: F.head, fontSize: 10, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      Cover
                    </span>
                  )}
                  {!p.uploading && (
                    <button onClick={() => removePhoto(p.id)} aria-label="Remove photo"
                      style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", backgroundColor: C.claret, border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                      <X size={12} style={{ color: "#fff" }} />
                    </button>
                  )}
                  {!p.uploading && photos.length > 1 && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 4px", background: "rgba(31,29,25,0.55)" }}>
                      <button onClick={() => movePhoto(idx, -1)} disabled={idx === 0} aria-label="Move left"
                        style={{ width: 24, height: 24, borderRadius: 4, border: "none", background: idx === 0 ? "transparent" : "rgba(255,255,255,0.18)", color: "#fff", cursor: idx === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, opacity: idx === 0 ? 0.4 : 1 }}>
                        <ChevronLeft size={11}/>
                      </button>
                      {idx !== 0 ? (
                        <button onClick={() => setAsCover(idx)} aria-label="Set as cover" title="Set as cover"
                          style={{ width: 24, height: 24, borderRadius: 4, border: "none", background: "rgba(240,144,0,0.85)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                          <Star size={10} strokeWidth={2.4}/>
                        </button>
                      ) : <span style={{ width: 24, height: 24 }}/>}
                      <button onClick={() => movePhoto(idx, +1)} disabled={idx === photos.length - 1} aria-label="Move right"
                        style={{ width: 24, height: 24, borderRadius: 4, border: "none", background: idx === photos.length - 1 ? "transparent" : "rgba(255,255,255,0.18)", color: "#fff", cursor: idx === photos.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, opacity: idx === photos.length - 1 ? 0.4 : 1 }}>
                        <ChevronRight size={11}/>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button onClick={openFilePicker} disabled={submitting}
                  style={{ width: 88, height: 88, borderRadius: 12, border: "2px dashed " + C.smoke, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: submitting ? "not-allowed" : "pointer", background: C.paper, gap: 2 }}>
                  <Plus size={16} style={{ color: C.mink }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.mink, fontFamily: F.body }}>Add</span>
                </button>
              )}
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.5, color: C.ash, marginTop: 10, fontFamily: F.body }}>The Cover photo is the first one buyers see. Use the arrows to reorder, or the star to promote. Up to {MAX_PHOTOS} photos.</p>
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
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20, minWidth: 0 }}>
        <section style={formCard(isMobile)}>
          <FormHeading title="Item details" hint="Fields marked * are required."/>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor={fieldId + "-title"} style={FORM_LABEL}>Title *</label>
            <input id={fieldId + "-title"} className="dy-field" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., IKEA KALLAX Bookshelf - White" style={FORM_INPUT} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor={fieldId + "-desc"} style={FORM_LABEL}>Description *</label>
            <textarea id={fieldId + "-desc"} className="dy-field" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe condition, dimensions, what is included..." style={{ ...FORM_INPUT, minHeight: 112, resize: "vertical", lineHeight: 1.5 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16, marginBottom: 16 }}>
            <div>
              <p id={fieldId + "-cat"} style={FORM_LABEL}>Category *</p>
              {/* Compact, searchable selector (feedback point 3): one field that
                  opens a searchable list — a bottom sheet on phones. */}
              <CategorySelect
                id={fieldId + "-cat-field"}
                labelId={fieldId + "-cat"}
                value={cat || null}
                onChange={(v) => { setCat(v); if (submitError === "Pick a category.") setSubmitError(""); }}
                invalid={!cat && submitError === "Pick a category."}
                errorId={fieldId + "-cat-error"}
              />
              {!cat && submitError === "Pick a category." && (
                <p id={fieldId + "-cat-error"} style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.claret, marginTop: 6 }}>Pick a category.</p>
              )}
            </div>
            <div>
              <p id={fieldId + "-cond"} style={FORM_LABEL}>Condition *</p>
              <div role="group" aria-labelledby={fieldId + "-cond"} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {conds.map(c => (
                  <button key={c} type="button" aria-pressed={cond === c} onClick={() => setCond(c)} style={formChip(cond === c)}>{c}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label htmlFor={fieldId + "-price"} style={FORM_LABEL}>Price ($) *</label>
            <input id={fieldId + "-price"} className="dy-field" value={price} onChange={e => setPrice(decimalAmountText(e.target.value))} placeholder="0.00" type="text" inputMode="decimal" autoComplete="off" style={{ ...FORM_INPUT, width: 160, fontWeight: 700 }} />
            <p style={{ fontFamily: F.body, fontSize: 12, color: C.ash, marginTop: 6 }}>Enter 0 for a free giveaway.</p>
          </div>

          </section>

        <section style={formCard(isMobile)}>
          <FormHeading title="Pickup, bundle and payment" hint="Optional. Open only what you need."/>
          {/* Pickup Availability - optional */}
          <div style={{ marginBottom: 12, borderRadius: 14, border: "1.5px solid " + (showPickup ? C.green + "30" : C.fawn), overflow: "hidden" }}>
            <button type="button" aria-expanded={showPickup} onClick={() => setShowPickup(!showPickup)}
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
                      <button key={m.id} type="button" aria-pressed={on} onClick={() => setPickupMode(m.id)}
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
                        <button key={day} type="button" aria-pressed={sel} onClick={() => togDay(day)}
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
                      <input type="date" aria-label="Pickup date" className="dy-field" min={todayLocalISO()} value={pickupNewDate} onChange={e => { setPickupNewDate(e.target.value); if (pickupDateError) setPickupDateError(""); }}
                        style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.fawn, fontSize: 12, fontFamily: F.body, color: C.ink, background: C.paper, boxSizing: "border-box" }}/>
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
                            <button type="button" aria-label={"Remove " + formatPickupDateLong(d)} onClick={() => setPickupCustom(p => p.filter(x => x !== d))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                              <X size={11} style={{ color: C.greenDeep }}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {pickupDateError && (
                      <p role="alert" style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.claret }}>{pickupDateError}</p>
                    )}
                    {pickupCustom.length === 0 && !pickupDateError && (
                      <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, fontStyle: "italic" }}>Add one or more specific dates when you&apos;ll be available.</p>
                    )}
                  </div>
                )}

                {pickupMode === "anytime" && (
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: C.sand, border: "1px solid " + C.fawn, marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <Info size={13} style={{ color: C.mink, flexShrink: 0, marginTop: 1 }}/>
                    <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>Buyers can request any day. You'll agree a time with the buyer in Messages before the pickup is scheduled.</p>
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
                      <button key={w.id} type="button" aria-pressed={sel} onClick={() => togWin(w.id)}
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
          <div style={{ marginBottom: 12, borderRadius: 14, border: "1.5px solid " + (showBundle ? (C.teal || C.greenDeep) + "30" : C.fawn), overflow: "hidden" }}>
            <button type="button" aria-expanded={showBundle} onClick={() => setShowBundle(!showBundle)}
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
                            className="dy-field"
                            aria-label={"Bundle item " + (idx + 1)}
                            value={line}
                            onChange={e => updateBundleLine(idx, e.target.value)}
                            maxLength={120}
                            placeholder={"Item " + (idx + 1) + " (e.g. \"Queen bed frame\")"}
                            style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.ink, background: C.paper, minWidth: 0 }}
                          />
                          <button type="button" onClick={() => removeBundleLine(idx)} title="Remove" aria-label={"Remove bundle item " + (idx + 1)} style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, border: "1.5px solid " + C.fawn, background: C.paper, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: C.mink }}>
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
          <div style={{ marginBottom: 12, borderRadius: 14, border: "1.5px solid " + (showPayment ? C.green + "30" : C.fawn), overflow: "hidden" }}>
            <button type="button" aria-expanded={showPayment} onClick={() => setShowPayment(!showPayment)}
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
                      <button key={p.id} type="button" aria-pressed={on} onClick={() => setPaymentMethod(p.id)}
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
        </section>

        <section style={formCard(isMobile)}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <h3 style={{ fontFamily: F.head, fontSize: 17, fontWeight: 800, color: C.ink }}>When should this go live?</h3>
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
              <button type="button" aria-pressed={publishWhen === "drop"} onClick={() => setPublishWhen("drop")} style={{
                textAlign: "left", padding: 14, borderRadius: 14,
                border: "2px solid " + (publishWhen === "drop" ? C.green : C.fawn),
                background: publishWhen === "drop" ? C.greenMist : C.paper,
                cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid " + (publishWhen === "drop" ? C.green : C.smoke), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  {publishWhen === "drop" && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.green }}/>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
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
                type="button"
                aria-pressed={!dropIsLive && publishWhen === "shelf"}
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
            <div role="alert" style={{ padding: "10px 14px", borderRadius: 12, background: C.claretMist, border: "1px solid " + C.claret + "40", marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 8 }}>
              <AlertCircle size={16} style={{ color: C.claret, flexShrink: 0, marginTop: 1 }}/>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.claret, lineHeight: 1.5 }}>{submitError}</p>
            </div>
          )}

          {/* Action row */}
          <div style={{ display: "flex", flexDirection: isMobile ? "column-reverse" : "row", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => handleSubmit("draft")} disabled={submitting} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 48, padding: "12px 20px", borderRadius: 999, border: "1.5px solid " + C.fawn, cursor: submitting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: F.head, background: C.paper, color: C.mink, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "Saving…" : "Save as draft"}
            </button>
            <button type="button" onClick={() => handleSubmit(publishWhen)} disabled={submitting} className="cta-primary" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              minHeight: 48, padding: "12px 26px", borderRadius: 999, border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 800, fontFamily: F.head,
              background: publishWhen === "drop" ? C.green : C.amber,
              color: publishWhen === "drop" ? "#fff" : C.ink,
              boxShadow: "0 2px 0 " + (publishWhen === "drop" ? C.greenDeep : C.amberDeep),
              opacity: submitting ? 0.6 : 1,
            }}>
              <Check size={15} strokeWidth={2.5}/>
              {submitting ? "Saving…" : "Publish"}
            </button>
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}

/* ============================== MY ITEMS ============================== */
/* ========= INVENTORY SUB-TABS (shared header for Items/Claims/Pickups) ========= */
function InventoryTabs({ activeView, onNav, accessToken = null }) {
  const { isMobile } = useViewport();

  // My items badge (it was the Orders tab's): offers awaiting the seller
  // (PROPOSED claims the buyer set last) + pickups pending (ACCEPTED). Fetched
  // here so every inventory tab shows the same number; the subtitle spells
  // the breakdown out ("1 claim needs your response · 1 pickup pending") so the badge
  // is never ambiguous.
  const [ordersPending, setOrdersPending] = useState(0);
  const [ordersPickups, setOrdersPickups] = useState(0);
  const [ordersUrgent, setOrdersUrgent] = useState(0);
  const ordersCount = ordersPending + ordersPickups;
  const [ordersTick, setOrdersTick] = useState(0);
  useSocketEvent("claim:new",     () => setOrdersTick(t => t + 1));
  useSocketEvent("claim:updated", () => setOrdersTick(t => t + 1));
  useEffect(() => {
    if (!accessToken) { setOrdersPending(0); setOrdersPickups(0); setOrdersUrgent(0); return; }
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
      // Offers awaiting the seller (not counters waiting on the buyer).
      setOrdersPending(pending.filter((c) => c && c.lastAmountBy !== c.sellerId).length);
      setOrdersPickups(pickups.length);
      // Urgent = needs the seller today: every pending claim is waiting on an
      // answer, plus any pickup scheduled for today (the same rule as the
      // Claimed · pickup pending → Today filter).
      const dueToday = pickups.filter((c) => pickupWhen(c?.pickupSlot, { since: c?.createdAt }).kind === "today").length;
      setOrdersUrgent(pending.filter((c) => c && c.lastAmountBy !== c.sellerId).length + dueToday);
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

  // What the Orders badge is actually counting, said out loud. The badge is
  // the sum of the two sections on the page, so after a seller accepts a
  // claim the number stays at 1 — it has moved from "pending claim" to
  // "scheduled pickup", not stuck.
  // What the My items badge counts, said out loud (the Orders tab's job
  // before it was folded into My items).
  const ordersBreakdown = [
    ordersPending > 0 && (ordersPending === 1 ? "1 claim needs your response" : ordersPending + " claims need your response"),
    ordersPickups > 0 && (ordersPickups === 1 ? "1 pickup pending" : ordersPickups + " pickups pending"),
  ].filter(Boolean);

  const tabs = [
    { id: "items",  label: "My items",  view: "items", count: ordersCount, urgent: ordersUrgent, title: ordersBreakdown.join(" · "), ariaLabel: ordersBreakdown.length ? "My items, " + ordersBreakdown.join(", ") : null },
    // Buyers' public questions are visible on the listing whether or not the
    // seller replies, so an unanswered one is urgent by default.
    { id: "questions", label: "Questions", view: "questions", count: openQuestions, urgent: openQuestions, ariaLabel: openQuestions > 0 ? "Questions, " + openQuestions + (openQuestions === 1 ? " unanswered question" : " unanswered questions") : null },
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
            <h1 style={{ fontFamily: F.head, fontSize: isMobile ? 24 : 30, fontWeight: 900, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 4 }}>{activeView === "questions" ? "Questions" : "My items"}</h1>
            <p style={{ fontFamily: F.body, fontSize: isMobile ? 12.5 : 14, fontWeight: 500, color: C.mink, lineHeight: 1.45, maxWidth: 560 }}>
              {activeView === "questions"
                ? "Buyers asking about your listings. Answers are public on the item."
                : ordersBreakdown.length > 0
                  ? ordersBreakdown.join(" · ") + "."
                  : "Everything you have listed, in draft, or pending review."}
            </p>
          </div>
        </div>
      </div>

      {/* Tab row. On a 320px phone the three tabs and their counts need
          ~300px of 288, which wrapped "My items" onto two lines; there the
          row scrolls sideways instead of squeezing a label. */}
      <div className={isMobile ? "preview-scroll" : undefined} style={{ display: "flex", gap: isMobile ? 4 : 8, borderBottom: "1.5px solid " + C.fawn, paddingBottom: 0, overflowX: isMobile ? "auto" : undefined, scrollbarWidth: isMobile ? "none" : undefined }}>
        {tabs.map(tab => {
          const active = activeView === tab.view;
          return (
            <button key={tab.id} onClick={() => onNav(tab.view)} aria-label={tab.ariaLabel || undefined} aria-current={active ? "page" : undefined} style={{
              position: "relative", display: "flex", alignItems: "center", gap: isMobile ? 6 : 8,
              padding: isMobile ? "10px 12px 12px" : "11px 18px 13px", border: "none", cursor: "pointer",
              whiteSpace: "nowrap", flexShrink: 0,
              background: "transparent",
              fontFamily: F.head, fontSize: isMobile ? 13 : 14, fontWeight: active ? 900 : 700,
              color: active ? C.ink : C.mink,
              transition: "color 150ms",
            }}>
              {tab.label}
              {tab.count > 0 && (
                <span title={tab.title || undefined} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontFamily: F.head, fontSize: 10, fontWeight: 900, padding: "2px 7px", borderRadius: 999, background: tab.urgent > 0 ? C.claretMist : C.sand, color: tab.urgent > 0 ? C.claret : C.mink, border: "1px solid " + C.fawn }}>
                  {tab.count}
                  {tab.urgent > 0 && <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.claret }}/>}
                </span>
              )}
              {active && <div style={{ position: "absolute", left: 0, right: 0, bottom: isMobile ? 0 : -1.5, height: 3, background: C.green, borderRadius: 2 }}/>}
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
function QuestionsView({ onNav, accessToken = null, onQuestionsChanged = null }) {
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
      // Drop the sidebar/bell badge in the same beat.
      if (onQuestionsChanged) onQuestionsChanged();
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
          <div role="status" style={{ padding: "11px 15px", borderRadius: 12, background: C.greenMist, border: "1px solid " + C.green + "40", marginBottom: 14, display: "flex", alignItems: "center", gap: 9 }}>
            <Check size={15} style={{ color: C.greenDeep, flexShrink: 0 }} strokeWidth={2.6}/>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.greenDeep }}>{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div role="alert" style={{ padding: "11px 15px", borderRadius: 12, background: C.claretMist, border: "1px solid " + C.claret + "40", marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 9 }}>
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
                    <UserAvatar avatar={q.askerAvatar} name={q.askerName || "Buyer"} size={28} decorative initialsBg={avatarBg(q.askerName || "Buyer")} fontFamily={F.head} fontSize={10}/>
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

function ClosingTimeBanner({ counts, onDiscount }) {
  const { isMobile } = useViewport();
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState("20");
  // 1–95%. Empty or out of range: Apply is disabled and the hint says why. It
  // used to apply 1% to every unsold item when the field was empty.
  const customPct = Number(custom);
  const customProblem = custom === "" || !(customPct >= 1 && customPct <= 95) ? "Enter 1–95%" : null;
  const customHintId = useId();
  function applyCustom() {
    if (customProblem) return;
    onDiscount(customPct); setShowCustom(false);
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
          <button onClick={() => setShowCustom(true)} className="dy-banner-pill" style={{
            "--pill-edge": C.claret, "--pill-tint": PILL_TINT.claret,
            padding: "9px 16px", borderRadius: 999,
            cursor: "pointer", fontFamily: F.head, fontSize: 12, fontWeight: 800,
            color: C.claret,
          }}>
            Custom %
          </button>
        ) : (
          <>
          {/* The ring for the percent field is on this pill (see
              .dy-pct-field), so it wraps the whole field, not just the
              narrow input inside it. */}
          <div className="dy-pct-field" style={{
            "--pill-edge": C.claret,
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 6px", borderRadius: 999,
            border: "1.5px solid " + C.claret, background: C.paper,
          }}>
            <input
              type="text" inputMode="numeric" autoFocus autoComplete="off"
              aria-label="Custom discount, percent"
              value={custom}
              onChange={e => setCustom(wholeAmountText(e.target.value, 2))}
              aria-invalid={customProblem ? true : undefined}
              aria-describedby={customProblem ? customHintId : undefined}
              onKeyDown={e => { if (e.key === "Enter") applyCustom(); if (e.key === "Escape") setShowCustom(false); }}
              style={{ width: 36, padding: "4px 6px", border: "none", outline: "none", fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.claret, background: "transparent", textAlign: "right" }}
            />
            <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.claret }}>%</span>
            <button onClick={applyCustom} disabled={!!customProblem} aria-describedby={customProblem ? customHintId : undefined} style={{
              padding: "6px 12px", borderRadius: 999, border: "none", cursor: customProblem ? "not-allowed" : "pointer", opacity: customProblem ? 0.5 : 1,
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
          <AmountHint id={customHintId} problem={customProblem} style={{ color: C.claret }}/>
          </>
        )}
      </div>
    </div>
  );
}

// Adapter: backend item shape -> UI item shape (My items, and the item page
// Orders opens). Module level so both can use it.
// Backend returns category/condition/placement/status enums; UI wants
// `e` (emoji), `t` (title), `cat`/`cond` (labels), `publishedTo`, and a
// `status` of "draft"|"published" so the existing lifecycleOf() logic works.
function adaptSellerItem(api) {
  if (!api) return null;
  // Hide finished/archived items from My Items entirely. SOLD claims appear
  // in the History tab; ARCHIVED is the seller's manual remove. CLAIMED items
  // stay visible — they're in flight (buyer claimed, seller confirmed,
  // pickup pending) and the seller still cares about them.
  // Sold, taken down by an admin, or removed by the seller: not in My items.
  // Except an item the seller marked sold elsewhere: it stays, under Sold
  // only, labelled "Sold elsewhere" (it's not a DropYard sale, so it isn't
  // in History).
  if ((api.status === "SOLD" && !api.soldElsewhereAt) || api.status === "ARCHIVED" || api.status === "REMOVED") return null;
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
    // The stored value, for the Edit form's selector (HOME → APPLIANCES_KITCHEN).
    catValue:    categoryFor(api.category).value,
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
    // The claim holding this item, so the row can close the sale itself.
    // Only an ACCEPTED claim can be marked picked up — a PROPOSED one is
    // still a request the seller hasn't answered.
    activeClaimId:     api.activeClaim?.status === "ACCEPTED" ? api.activeClaim.id : null,
    activeClaimBuyer:  api.activeClaim?.buyer?.name || "the buyer",
    activeClaimBuyerAvatar: api.activeClaim?.buyer?.avatar || null,
    // For the pickup card: the buyer's suggested time (pickupWhen), the
    // conversation (Message buyer), and when the claim was made, which is
    // what a bare weekday in the suggested time counts from.
    activeClaimSlot:           api.activeClaim?.pickupSlot || null,
    activeClaimConversationId: api.activeClaim?.conversationId || null,
    activeClaimCreatedAt:      api.activeClaim?.createdAt || null,
    // For the pickup card's header and steps: when it was accepted and by
    // whom (the side that didn't set the amount last), and how the buyer pays.
    activeClaimAcceptedAt:     api.activeClaim?.acceptedAt || null,
    activeClaimAcceptedBy:     api.activeClaim && api.activeClaim.lastAmountBy && api.activeClaim.lastAmountBy !== api.activeClaim.buyerId ? "buyer" : "seller",
    activeClaimPaymentMethod:  api.activeClaim?.paymentMethod || null,
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
    // From GET /api/items/mine: whether any buyer ever saved, asked about,
    // messaged about or claimed it (then it can't be deleted), and how many
    // offers / accepted claims are open (then it can't be removed).
    hasBuyerActivity: !!api.hasBuyerActivity,
    openClaimCount:   typeof api.openClaimCount === "number" ? api.openClaimCount : 0,
    // Open offers (PROPOSED claims) from GET /api/items/mine, for the offers
    // card. sellerCountered: the seller set the amount last, so it's the
    // buyer's turn (the buyer set it on a new offer or a counter back).
    // Sold outside DropYard (POST /api/items/:id/sold-elsewhere).
    soldElsewhere: !!api.soldElsewhereAt,
    // Buyers waiting behind an accepted sale (WAITLISTED), oldest first.
    waitlist: Array.isArray(api.waitlist)
      ? api.waitlist.map(c => ({ id: c.id, buyer: c.buyer?.name || "Buyer", amount: typeof c.amount === "number" ? c.amount : api.price, conversationId: c.conversationId || null }))
      : [],
    openClaims: Array.isArray(api.openClaims)
      ? api.openClaims.filter(c => c && c.status === "PROPOSED").map(c => ({
          id:              c.id,
          amount:          typeof c.amount === "number" ? c.amount : api.price,
          buyerId:         c.buyerId,
          buyer:           c.buyer?.name || "Buyer",
          buyerAvatar:     c.buyer?.avatar || null,
          sellerCountered: !!c.lastAmountBy && c.lastAmountBy !== c.buyerId,
          at:              c.proposedAt || c.createdAt || null,
          conversationId:  c.conversationId || null,
          // Every amount so far ({ by, amount, at }), for the card's steps.
          history:         Array.isArray(c.history) ? c.history : [],
        }))
      : [],
    raw:         api,
  };
}

// My items filter chips. scroll=false: they wrap. scroll=true (phones): one
// row that scrolls sideways, with the chips fading out at whichever edge has
// more of them, and the selected chip brought into view when it changes. The
// fade is a mask on the row, set straight on the element as it scrolls (no
// re-render per scroll event).
const CHIP_FADE = 28;
function ChipScrollRow({ scroll, selectedKey, ariaLabel, children }) {
  const ref = useRef(null);
  const firstRun = useRef(true);
  // The fade: on the left once scrolled, on the right while more is to come.
  const updateFade = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (!scroll) { el.style.maskImage = ""; el.style.webkitMaskImage = ""; return; }
    const more = el.scrollWidth - el.clientWidth;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft < more - 1;
    const mask = left || right
      ? "linear-gradient(to right, " + (left ? "transparent 0, #000 " + CHIP_FADE + "px" : "#000 0") + ", " + (right ? "#000 calc(100% - " + CHIP_FADE + "px), transparent 100%" : "#000 100%") + ")"
      : "";
    el.style.maskImage = mask;
    el.style.webkitMaskImage = mask;
  }, [scroll]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateFade();
    if (!scroll) return;
    el.addEventListener("scroll", updateFade, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateFade) : null;
    if (ro) { ro.observe(el); [...el.children].forEach(c => ro.observe(c)); }
    return () => { el.removeEventListener("scroll", updateFade); if (ro) ro.disconnect(); };
  }, [scroll, updateFade]);
  // The selected chip, centred in the row where it can be (at once the first
  // time, smoothly after that unless the user prefers reduced motion).
  useEffect(() => {
    const el = ref.current;
    const instant = firstRun.current;
    firstRun.current = false;
    if (!el || !scroll) return;
    const chip = el.querySelector('[aria-pressed="true"]');
    if (!chip) return;
    const target = chip.offsetLeft - (el.clientWidth - chip.offsetWidth) / 2;
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: Math.max(0, target), behavior: instant || reduce ? "auto" : "smooth" });
  }, [scroll, selectedKey]);
  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      className={scroll ? "dy-chip-scroll" : undefined}
      style={scroll
        // The padding leaves room for the chips' focus ring inside the
        // scrolling box; the negative margin keeps the row where it was.
        ? { position: "relative", display: "flex", gap: 6, flexWrap: "nowrap", overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", overscrollBehaviorX: "contain", padding: "5px 5px", margin: "-5px -5px 7px" }
        : { position: "relative", display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}
    >
      {children}
    </div>
  );
}

// initialFilter / highlightItemId: where a link landed (a bell entry, an old
// Orders link, an Overview shortcut). The root remounts this view for each
// such link, so they're only read once.
const MY_ITEMS_FILTERS = new Set(["all", "draft", "queued", "live", "shelf", "pickups", "action", "sold"]);
// Older addresses and links: filter=offers was "Offers to review".
const MY_ITEMS_FILTER_ALIASES = { offers: "action" };
function MyItemsView({ onNav, onEdit, onView, sellerItems, onItemsChange, onRefresh = null, sellerItemsLoading, accessToken, onOpenThread = null, initialFilter = null, initialPickupWhen = null, initialSearch = null, highlightItemId = null }) {
  const { isMobile, width } = useViewport();
  // The table's fixed tracks (photo, status, price, actions) need ~600px before
  // Item and Category get any room; beside the sidebar that's only there from
  // ~1200px. Below that the rows use the stacked card layout phones use.
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

  const [filter, setFilter] = useState(() => {
    const f = MY_ITEMS_FILTER_ALIASES[initialFilter] || initialFilter;
    return f && MY_ITEMS_FILTERS.has(f) ? f : "all";
  });
  // Under "Claimed · pickup pending": all of them, or by the buyer's suggested time.
  const [pickupWhenFilter, setPickupWhenFilter] = useState(() => (initialPickupWhen === "today" || initialPickupWhen === "upcoming" ? initialPickupWhen : "all"));
  // A title search from the header's "Search my items…": narrows whichever
  // filter is chosen, until it's cleared.
  const [search, setSearch] = useState(initialSearch || "");
  const searchQ = search.trim().toLowerCase();
  // The card a link pointed at: scrolled into view and outlined for a moment.
  const [highlightId, setHighlightId] = useState(highlightItemId || null);
  const [offerBusyId, setOfferBusyId] = useState(null);
  const [pendingWithdraw, setPendingWithdraw] = useState(null);
  const [pendingDecline, setPendingDecline] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [priceEditId, setPriceEditId] = useState(null);
  const [tempPrice, setTempPrice] = useState("");
  // Modal state for the new draft "Publish" chooser and destructive delete confirm.
  const [publishChooserItem, setPublishChooserItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  // The item whose "Save to Drafts" is waiting for confirmation.
  const [confirmRemove, setConfirmRemove] = useState(null);
  // Mark as sold elsewhere: the item awaiting the seller's confirmation.
  const [confirmSoldElsewhere, setConfirmSoldElsewhere] = useState(null);
  async function markSoldElsewhere(item) {
    if (!accessToken || (typeof item.id === "string" && item.id.startsWith("demo-"))) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, soldElsewhere: true } : i));
      flash("\u201C" + item.t + "\u201D marked as sold elsewhere.");
      return;
    }
    try {
      const res = await apiRequest("/api/items/" + encodeURIComponent(item.id) + "/sold-elsewhere", { method: "POST", token: accessToken });
      const n = res?.closedClaims || 0;
      flash("\u201C" + item.t + "\u201D marked as sold elsewhere." + (n ? (n === 1 ? " The buyer has been told." : " " + n + " buyers have been told.") : ""));
    } catch (err) {
      flash("Couldn't mark it as sold: " + (err?.message || "try again"));
    }
    if (onRefresh) onRefresh();
  }

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

  const adaptItem = adaptSellerItem;

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
      return await apiRequest("/api/items/" + encodeURIComponent(id), {
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
    //
    // During a live Drop a queued draft reads as live on purpose: queuing
    // attaches it to the CURRENT Drop, and the buyer feed promotes it
    // (promoteItemsToLive on GET /api/items) the next time anyone browses.
    // The stored status lags, but buyers already see it in the Drop.
    // EditItemView applies the same rule.
    // Marked sold elsewhere: done, whatever else the item says.
    if (item.soldElsewhere) return "sold";
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
    // Also when the item carries an ACCEPTED claim whatever its status says
    // (isPickupPending): such an item showed as "On the Shelf" with Share,
    // Lower price and Edit active and the open-offer wording.
    if (isPickupPending(item)) return "claimed";
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
    shelf:   { label: "On the Shelf",                color: C.greenDeep, bg: C.greenMist,  border: C.green + "40" },
    claimed: { label: "Claimed · pickup pending",    color: C.ai,        bg: C.aiMist,     border: C.ai + "40" },
    sold:    { label: "Sold elsewhere",              color: C.ash,       bg: C.sand,       border: C.fawn },
  };

  // Filters follow the lifecycle. "Claimed" only shows up when there's at
  // least one such item — keeps the filter row clean while still surfacing
  // a meaningful filter when it matters.
  // Claimed · action pending: every item with an open claim the seller hasn't
  // accepted or declined. Ones waiting on the seller's answer come first, then
  // ones where the seller countered and the buyer has to answer.
  // Claimed · pickup pending: accepted claims waiting for pickup.
  const hasOffers = (i) => !isPickupPending(i) && Array.isArray(i.openClaims) && i.openClaims.length > 0;
  const needsSeller = (i) => i.openClaims.some(c => !c.sellerCountered);
  const actionItems = [
    ...items.filter(i => hasOffers(i) && needsSeller(i)),
    ...items.filter(i => hasOffers(i) && !needsSeller(i)),
  ];
  const pickupItems = items.filter(i => lifecycleOf(i) === "claimed");
  const pickupWhenOf = (i) => pickupWhen(i.activeClaimSlot, { since: i.activeClaimCreatedAt }).kind;
  const myItemsClaimedCount = pickupItems.length;
  const allFilters = [
    { id: "all",     label: "All" },
    { id: "draft",   label: "Drafts" },
    { id: "queued",  label: "Queued for Drop" },
    { id: "live",    label: "Live in Drop" },
    { id: "shelf",   label: "On the Shelf" },
    { id: "pickups", label: "Claimed \u00B7 pickup pending" },
    { id: "action",  label: "Claimed \u00B7 action pending" },
    { id: "sold",    label: "Sold" },
  ].filter(f => (f.id !== "live" || dropIsLive) && (f.id !== "sold" || items.some(i => lifecycleOf(i) === "sold")));

  const counts = {
    // All is what's still for sale or in progress: items sold elsewhere are
    // only under Sold.
    all:     items.filter(i => lifecycleOf(i) !== "sold").length,
    sold:    items.filter(i => lifecycleOf(i) === "sold").length,
    draft:   items.filter(i => lifecycleOf(i) === "draft").length,
    queued:  items.filter(i => lifecycleOf(i) === "queued").length,
    live:    items.filter(i => lifecycleOf(i) === "live").length,
    shelf:   items.filter(i => lifecycleOf(i) === "shelf").length,
    // Items, like every other chip. (The tab badge and the header line count
    // the claims waiting on the seller.)
    pickups: myItemsClaimedCount,
    action:  actionItems.length,
  };
  const pickupCounts = {
    all:      pickupItems.length,
    today:    pickupItems.filter(i => pickupWhenOf(i) === "today").length,
    upcoming: pickupItems.filter(i => pickupWhenOf(i) === "upcoming").length,
  };

  const statusFiltered = filter === "all" ? items.filter(i => lifecycleOf(i) !== "sold")
    : filter === "action" ? actionItems
    : filter === "pickups" ? (pickupWhenFilter === "all" ? pickupItems : pickupItems.filter(i => pickupWhenOf(i) === pickupWhenFilter))
    : items.filter(i => lifecycleOf(i) === filter);
  const filtered = searchQ ? statusFiltered.filter(i => String(i.t || i.title || "").toLowerCase().includes(searchQ)) : statusFiltered;
  // What an empty list says, per filter.
  const emptyCopy = searchQ
    ? ["No items match \u201C" + search.trim() + "\u201D", filter === "all" ? "Try another word, or clear the search." : "Try another word or another filter, or clear the search."]
    : filter === "action"
    ? ["No claims waiting on you or a buyer", "When a buyer claims or makes an offer on one of your items, it shows up here until you accept or decline. Items you\u2019ve countered stay here while the buyer decides."]
    : filter === "pickups"
      ? (pickupWhenFilter === "today" ? ["No pickups today", "No buyer suggested a time today."]
        : pickupWhenFilter === "upcoming" ? ["No upcoming pickups", "No pickups with a suggested time coming up."]
        : ["No claimed items waiting for pickup", "When you accept a claim, the item waits here until it's picked up."])
      : ["Nothing here yet", "Items with this status will appear here."];

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
      // Queued = DRAFT + DROP; the server stamps queuedAt and promotes it when
      // the Drop opens. (This used to send LIVE, which the server now treats
      // as the same request.)
      await apiPatchItem(id, { status: "DRAFT", placement: "DROP" });
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

  // "Save to Drafts": off sale and back to Drafts, reversible; buyers' saves,
  // questions and conversations are kept. The server clears the Drop queue
  // marker (so a queued item really leaves the Drop and Sneak Peek) and
  // refuses while a buyer's offer or accepted claim is open; the row is
  // restored then, and apiPatchItem has already shown why.
  async function unpublish(id) {
    const snapshot = items;
    const it = items.find(i => i.id === id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: "draft", publishedTo: null, isQueued: false } : i));
    try {
      await apiPatchItem(id, { status: "DRAFT" });
      flash("Saved to Drafts: " + (it ? "\u201C" + it.t + "\u201D" : "your listing") + ". It\u2019s no longer for sale.");
    } catch {
      setItems(snapshot);
    }
  }

  // Delete draft / Delete listing (asked first). The row goes at once and
  // comes back if the server refuses (apiDeleteItem shows why); the toast
  // waits for the server, so it never claims a delete that didn't happen.
  async function deleteItem(id) {
    const snapshot = items;
    const it = items.find(i => i.id === id);
    const kind = it && lifecycleOf(it) === "draft" ? "Draft" : "Listing";
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      const r = await apiDeleteItem(id);
      const name = it ? "\u201C" + it.t + "\u201D" : "your item";
      flash(r && r.removed
        ? kind + " removed: " + name + ". Buyers can no longer see it; their conversations with you are kept."
        : kind + " deleted: " + name + ".");
    } catch {
      setItems(snapshot);
    }
  }

  function beginPriceEdit(item) { setPriceEditId(item.id); setTempPrice(String(item.price)); }

  // ── Offers (State C): the claims API, then the list refetches. ──────────
  // A refusal (the buyer withdrew or the offer expired a moment ago, another
  // offer was just accepted) shows the server's reason and refetches too.
  async function claimAction(claim, path, body, okMsg, failPrefix) {
    if (!accessToken) return false;
    setOfferBusyId(claim.id);
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/" + path, {
        method: "PATCH",
        token:  accessToken,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      flash(okMsg);
      return true;
    } catch (err) {
      flash(failPrefix + (err && err.message ? err.message : "try again"));
      return false;
    } finally {
      setOfferBusyId(null);
      if (onRefresh) onRefresh();
    }
  }
  const quoted = (item) => "\u201C" + item.t + "\u201D";
  const acceptOffer  = (item, c) => claimAction(c, "accept", null, "Accepted $" + c.amount + " from " + c.buyer + ". " + quoted(item) + " is now waiting for pickup.", "Couldn\u2019t accept: ");
  const declineOffer = (item, c) => claimAction(c, "decline", null, "Declined " + c.buyer + "\u2019s offer on " + quoted(item) + ".", "Couldn\u2019t decline: ");
  const counterOffer = (item, c, amount) => claimAction(c, "amount", { amount }, "Countered at $" + amount + " on " + quoted(item) + ". Waiting for " + c.buyer + ".", "Couldn\u2019t send the counter: ");
  async function confirmWithdraw() {
    const p = pendingWithdraw;
    setPendingWithdraw(null);
    if (!p) return;
    await claimAction(p.claim, "decline", null, "Counter withdrawn. " + p.claim.buyer + "\u2019s offer on " + quoted(p.item) + " is closed.", "Couldn\u2019t withdraw the counter: ");
  }
  async function confirmDecline() {
    const p = pendingDecline;
    setPendingDecline(null);
    if (!p) return;
    await declineOffer(p.item, p.claim);
  }

  // A link's card: scroll it into view once it's in the list, outline it for
  // a few seconds. (The filter it needs was set as this view mounted.)
  useEffect(() => {
    if (!highlightId) return;
    const el = typeof document !== "undefined" ? document.getElementById("item-card-" + highlightId) : null;
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    const tm = setTimeout(() => setHighlightId(null), 3500);
    return () => clearTimeout(tm);
  }, [highlightId, items]);
  // The filter is part of the address (tab=items&filter=action), so a refresh
  // or a shared link keeps it; the one-off item= of a link is dropped.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (filter === "all") url.searchParams.delete("filter"); else url.searchParams.set("filter", filter);
    url.searchParams.delete("item");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [filter]);

  // The ⋯ menu for one Inventory row: the same actions, under the same
  // per-status rules, as the buttons it replaces. An action that applies to
  // this kind of item but can't be used right now stays in the list,
  // disabled, with the reason; one that never applies isn't listed.
  function itemActions(item, lc) {
    const share = { id: "share", label: "Share listing", icon: Share2, onSelect: () => shareSellerListing(item) };
    const edit = { id: "edit", label: "Edit listing", icon: Pencil, onSelect: () => onEdit && onEdit(item) };
    // Save to Drafts: off sale, back in Drafts; buyers' saves, questions and
    // conversations are kept. Delete listing: permanent, so only while no
    // buyer has saved, asked about, messaged about or claimed it (the server
    // refuses otherwise). Both ask first.
    const saveToDrafts = (reason) => ({ id: "drafts", label: "Save to Drafts", icon: FileDown, disabledReason: reason || null, onSelect: () => setConfirmRemove(item) });
    const deleteListing = (reason) => ({ id: "delete", label: "Delete listing", icon: Trash2, danger: true, onSelect: () => setConfirmDelete(item),
      disabledReason: reason || (item.openClaimCount > 0 ? DELETE_BLOCKED_BY_OFFER : null) });
    const offerOpen = item.openClaimCount > 0 ? REMOVE_BLOCKED_BY_OFFER : null;
    // Sold outside DropYard: closes every offer, accepted claim and waitlist
    // place, with a notice to each buyer (DECISIONS.md #7). Asks first.
    const soldElsewhere = { id: "sold-elsewhere", label: "Mark as sold elsewhere", icon: Tag, danger: true, onSelect: () => setConfirmSoldElsewhere(item) };
    if (lc === "sold") return [
      { id: "view", label: "View details", icon: ClipboardList, onSelect: () => onView && onView(item) },
    ];
    if (lc === "draft") return [
      { id: "publish", label: "Publish", icon: Send, onSelect: () => openPublishChooser(item) },
      edit,
      // Drafts aren't public (BUG-051), so there's nothing to share yet.
      { ...share, disabledReason: "Publish it first to share it." },
      // Permanent, so only for drafts no buyer ever touched: deleting one
      // would erase buyers' saves, questions and messages.
      { id: "delete", label: "Delete draft", icon: Trash2, danger: true, onSelect: () => setConfirmDelete(item),
        disabledReason: null },
    ];
    if (lc === "queued") return [
      share,
      { id: "move", label: "Move to Shelf", icon: ArrowRight, onSelect: () => makeLiveNow(item.id) },
      edit,
      soldElsewhere,
      saveToDrafts(offerOpen),
      deleteListing(),
    ];
    if (lc === "live") return [
      share,
      ...(isClosing ? [item.isFree
        ? { id: "unfree", label: "Undo free", icon: Heart, onSelect: () => undoFree(item.id) }
        : { id: "free", label: "Make free", icon: Heart, onSelect: () => makeFree(item.id) }] : []),
      edit,
      // Locked only for items in the Drop (its live items, and drafts queued
      // for it). Shelf items also show as live during the Drop, but they
      // aren't in it: the usual rules apply (the server enforces the same).
      soldElsewhere,
      ...(item.publishedTo === "shelf"
        ? [saveToDrafts(offerOpen), deleteListing()]
        : [saveToDrafts("Can't save to Drafts while it's in the live Drop."), deleteListing("Can't delete while it's in the live Drop.")]),
    ];
    if (lc === "shelf") return [
      share,
      { id: "lower", label: "Lower price", icon: TrendingDown, onSelect: () => beginPriceEdit(item) },
      edit,
      soldElsewhere,
      saveToDrafts(offerOpen),
      deleteListing(),
    ];
    // "claimed": a buyer's claim has been accepted and the item is waiting
    // for pickup. Not shared (BUG-089: the sale is already in flight), no
    // price change, not edited, not removed; each says why.
    return [
      item.activeClaimId
        ? { id: "pickup", label: "Mark as picked up", icon: Check, onSelect: () => openRowPickup(item), disabledReason: pickupBusyId === item.id ? "Saving…" : null }
        : { id: "review", label: "View details", icon: ClipboardList, onSelect: () => onView && onView(item) },
      { ...share, disabledReason: SALE_PENDING_REASON },
      { id: "lower", label: "Lower price", icon: TrendingDown, onSelect: () => {}, disabledReason: SALE_PENDING_REASON },
      { ...edit, disabledReason: SALE_PENDING_REASON },
      saveToDrafts(SALE_PENDING_DRAFTS),
      deleteListing(SALE_PENDING_DELETE),
    ];
  }
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
  // One timer at a time, so an earlier message's timer can't clear a newer one early.
  const flashTimer = useRef(null);
  function flash(msg) {
    setSuccessMsg(msg);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSuccessMsg(null), 3500);
  }
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  // ── Mark picked up, straight from the inventory row ──────────────────────
  // A claimed item could only be closed out from its message thread, and the
  // thread auto-archives — sellers had to go un-archive a conversation to
  // finish a sale that was sitting right in front of them. This is the same
  // operation as the chat banner and Orders → Scheduled pickups: PATCH
  // /picked-up (claim → PICKED_UP, item → SOLD), then the same rate-the-buyer
  // prompt. Whichever surface the seller uses, the outcome is identical.
  const [pickupItem, setPickupItem]   = useState(null);
  const [pickupStars, setPickupStars] = useState(0);
  const [pickupNote, setPickupNote]   = useState("");
  const [pickupBusyId, setPickupBusyId] = useState(null);

  // The server marks it picked up first (markClaimPickedUp); the rating
  // prompt opens only after that succeeds. A refused claim (cancelled since
  // the list loaded, say) shows the server's reason and the list refetches.
  // Claimed items are pickup cards (PickupCard). Every action on one asks
  // first: Mark picked up, Mark as no-show and Release item (PickupConfirmDialog).
  const [pendingPickup, setPendingPickup] = useState(null);
  function pickupCardActions(item) {
    return pickupMenuActions({
      onMessage: item.activeClaimConversationId && onOpenThread ? () => onOpenThread(item.activeClaimConversationId) : null,
      onView: onView ? () => onView(item) : null,
      onNoShow: () => setPendingPickup({ kind: "no-show", item }),
      onRelease: () => setPendingPickup({ kind: "release", item }),
      onSoldElsewhere: () => setConfirmSoldElsewhere(item),
    });
  }
  async function confirmPendingPickup() {
    const p = pendingPickup;
    setPendingPickup(null);
    if (!p) return;
    if (p.kind === "pickup") { await openRowPickup(p.item); return; }
    // No-show / release: the claim is cancelled and the item is back on sale.
    if (!accessToken || (typeof p.item.id === "string" && p.item.id.startsWith("demo-"))) {
      setItems(prev => prev.map(i => i.id === p.item.id ? { ...i, backendStatus: "LIVE", status: "published", publishedTo: i.publishedTo || "shelf", activeClaimId: null } : i));
      flash(pickupCancelToast(p.kind, p.item.t));
      return;
    }
    try {
      await cancelAcceptedClaim(p.item.activeClaimId, p.kind, accessToken);
      flash(pickupCancelToast(p.kind, p.item.t));
    } catch (err) {
      flash(pickupCancelErrorText(p.kind, err));
    }
    if (onRefresh) onRefresh();
  }

  async function openRowPickup(item) {
    const claimId = item.activeClaimId;
    // Standalone preview / demo rows: reflect it locally.
    if (!accessToken || !claimId || (typeof item.id === "string" && item.id.startsWith("demo-"))) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      flash("Pickup complete! " + item.t + " marked as picked up.");
      setPickupItem(item); setPickupStars(0); setPickupNote("");
      return;
    }
    if (pickupBusyId) return;
    setPickupBusyId(item.id);
    try {
      await markClaimPickedUp(claimId, accessToken);
    } catch (err) {
      flash(pickupErrorText(err));
      // Refetch so a claim the server refused (cancelled meanwhile) drops off.
      if (onRefresh) onRefresh();
      return;
    } finally {
      setPickupBusyId(null);
    }
    flash("Pickup complete! " + item.t + " marked as picked up.");
    // Item is SOLD now — adaptItem drops it from My Items and it shows in
    // History. Ask the parent to refetch rather than guessing locally.
    // (onItemsChange is the parent's setter; called bare it blanked the list
    // instead of refetching, so the sold item stayed until a reload.)
    if (onRefresh) onRefresh();
    setPickupItem(item); setPickupStars(0); setPickupNote("");
  }

  // The pickup has already landed; this only sends the seller's rating.
  async function submitRowPickup({ skip = false } = {}) {
    const item  = pickupItem;
    const stars = pickupStars;
    const note  = pickupNote.trim();
    setPickupItem(null);
    if (!item) return;
    const claimId = item.activeClaimId;
    if (!accessToken || !claimId || (typeof item.id === "string" && item.id.startsWith("demo-"))) return;

    if (skip || stars < 1) return;
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claimId) + "/review", {
        method: "POST", token: accessToken,
        body: JSON.stringify({ rating: stars, text: note || undefined }),
      });
    } catch {
      // The pickup landed; only the rating didn't. Say exactly that.
      flash("Pickup saved, but the rating didn't send.");
    }
  }

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
        {/* White pill with a solid edge in the banner's text tone (amber
            between Drops, green while it's live): see .dy-banner-pill. */}
        <button onClick={() => onNav("add-manual")} className="cta-primary dy-banner-pill" style={{ "--pill-edge": dropIsLive ? C.greenDeep : C.amberDeep, "--pill-tint": dropIsLive ? PILL_TINT.green : PILL_TINT.amber, padding: "10px 18px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 800, color: dropIsLive ? C.greenDeep : C.amberDeep, fontFamily: F.head, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexShrink: 0, width: isMobile ? "100%" : "auto" }}>
          <Plus size={13} strokeWidth={2.5}/> List more
        </button>
      </div>
      )}

      {/* Success toast. Pinned to the bottom of the screen (above the phone's
          bottom bar), not the top of the list: a seller acting on a row far
          down the list has to see what happened. */}
      {successMsg && (
        <ModalPortal>
          {/* The wrapper places it, so .fade-in's transform on the toast can't move
              it. Up to 768px the bottom navigation shows; sit above it. */}
          <div style={{ position: "fixed", left: 16, right: 16, bottom: width <= 768 ? "calc(84px + env(safe-area-inset-bottom, 0px))" : 24, zIndex: Z.toast, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div role="status" className="fade-in" style={{ pointerEvents: "auto", width: "100%", maxWidth: 520, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 12px 16px", borderRadius: 14, background: C.greenMist, border: "1px solid " + C.green + "40", boxShadow: "0 12px 32px -8px rgba(15, 54, 11, 0.3)" }}>
            <CheckCircle size={16} style={{ color: C.greenDeep, flexShrink: 0 }} aria-hidden="true"/>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.greenDeep, flex: 1, overflowWrap: "anywhere" }}>{successMsg}</p>
            <button onClick={() => setSuccessMsg(null)} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <X size={14} style={{ color: C.greenDeep }} aria-hidden="true"/>
            </button>
          </div>
          </div>
        </ModalPortal>
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

      {/* Search results: what was searched, how many, and a way out. */}
      {searchQ && (
        <div role="status" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 12px 10px 16px", marginBottom: 12, borderRadius: 14, background: C.soPeach, border: "1px solid " + C.soLine }}>
          <Search size={16} aria-hidden="true" style={{ color: C.so, flexShrink: 0 }}/>
          <p style={{ flex: 1, minWidth: 0, fontFamily: F.head, fontSize: 14, fontWeight: 700, color: C.soInk, overflowWrap: "anywhere" }}>
            Results for &ldquo;{search.trim()}&rdquo; &middot; {filtered.length} {filtered.length === 1 ? "item" : "items"}
          </p>
          <button type="button" onClick={() => setSearch("")} style={{ minHeight: 40, padding: "0 14px", borderRadius: 999, border: "1.5px solid #F2B48E", background: C.paper, color: C.so, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <X size={14} aria-hidden="true"/> Clear search
          </button>
        </div>
      )}

      {/* Filter tabs: wrap on larger screens; one sideways-scrolling row on
          phones (see ChipScrollRow). */}
      <ChipScrollRow scroll={width < 640} selectedKey={filter} ariaLabel="Filter items">
        {allFilters.map(f => {
          const on = filter === f.id;
          return (
            <button key={f.id} type="button" aria-pressed={on} onClick={() => setFilter(f.id)} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, whiteSpace: "nowrap", padding: "7px 14px", borderRadius: 999, border: "1.5px solid " + (on ? C.ink : C.fawn), background: on ? C.ink : C.paper, color: on ? "#fff" : C.mink, fontFamily: F.head, fontSize: 12.5, fontWeight: 700, cursor: "pointer", transition: "all 150ms" }}>
              {f.label}
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: on ? "rgba(255,255,255,0.18)" : C.sand, color: on ? "#fff" : C.ash }}>{counts[f.id]}</span>
            </button>
          );
        })}
      </ChipScrollRow>

      {/* Claimed · pickup pending: all, or by the buyer's suggested time (the old
          Orders → Scheduled pickups Today / Upcoming / Pending cards). */}
      {filter === "pickups" && (
        <div role="group" aria-label="Pickups by time" style={{ display: "flex", gap: 6, margin: "-4px 0 12px", flexWrap: "wrap" }}>
          {[["all", "All pickups"], ["today", "Today"], ["upcoming", "Upcoming"]].map(([id, label]) => {
            const on = pickupWhenFilter === id;
            return (
              <button key={id} type="button" aria-pressed={on} onClick={() => setPickupWhenFilter(id)}
                style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 36, padding: "6px 12px", borderRadius: 999, border: "1.5px solid " + (on ? C.ai : C.fawn), background: on ? C.aiMist : C.paper, color: on ? C.ai : C.mink, fontFamily: F.head, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                {label}
                <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: on ? C.paper : C.sand, color: on ? C.ai : C.ash }}>{pickupCounts[id]}</span>
              </button>
            );
          })}
        </div>
      )}

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
              <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 4 }}>{emptyCopy[0]}</p>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink }}>{emptyCopy[1]}</p>
            </>
          )}
        </div>
      )}

      {/* Item rows: one compact card at every width, as in the client's
          mockup. Thumbnail | name, "time on status · condition", status pill
          (and, for a claimed item, Mark as picked up) | price over the ⋯ menu.
          No column header and no Category / Status columns. Full width, with
          larger sizes from 640px up (RS below). */}
      <div style={{ display: "flex", flexDirection: "column", gap: width >= 640 ? 12 : 10 }}>
        {filtered.map(item => (
          <div key={item.id} id={"item-card-" + item.id} style={{ borderRadius: 18, transition: "box-shadow 300ms", boxShadow: highlightId === item.id ? "0 0 0 3px " + C.amber + ", 0 8px 24px " + C.amber + "33" : "none" }}>
          {(() => {
          const lc = lifecycleOf(item);
          const meta = lifecycleMeta[lc];
          const RS = width >= 640 ? ROW_SIZE.large : ROW_SIZE.phone;
          const pillSize = { fontSize: RS.pill, padding: RS.pillPad };
          const details = [rowStatusText(item, lc), item.cond.replace(" - ", " – ")];
          if (item.saves > 0) details.push(item.saves === 1 ? "1 save" : item.saves + " saves");
          // State B — an accepted claim: the pickup card (Image B).
          if (lc === "claimed" && item.activeClaimId) {
            return (
              <PickupCard
                key={item.id}
                item={item}
                buyer={item.activeClaimBuyer}
                buyerAvatar={item.activeClaimBuyerAvatar}
                price={typeof item.soldPrice === "number" ? item.soldPrice : item.price}
                listed={item.price}
                when={pickupWhen(item.activeClaimSlot, { since: item.activeClaimCreatedAt })}
                acceptedAt={item.activeClaimAcceptedAt}
                acceptedBy={item.activeClaimAcceptedBy}
                paymentMethod={item.activeClaimPaymentMethod}
                busy={pickupBusyId === item.id}
                onPickup={() => setPendingPickup({ kind: "pickup", item })}
                onOpen={onView ? () => onView(item) : null}
                onMessage={item.activeClaimConversationId && onOpenThread ? () => onOpenThread(item.activeClaimConversationId) : null}
                actions={pickupCardActions(item)}
              />
            );
          }
          // State C — open offers on a listed item: the offers card (Image C).
          if ((lc === "shelf" || lc === "live") && hasOffers(item)) {
            return (
              <OfferCard
                item={item}
                busyId={offerBusyId}
                onOpen={onView}
                menuActions={itemActions(item, lc)}
                onMessage={onOpenThread ? (c) => onOpenThread(c.conversationId) : null}
                onAccept={c => acceptOffer(item, c)}
                onDecline={c => setPendingDecline({ item, claim: c })}
                onCounter={(c, amount) => counterOffer(item, c, amount)}
                onWithdraw={c => setPendingWithdraw({ item, claim: c })}
              />
            );
          }
          // State A (and drafts / queued items): the listed row (Image A).
          return (
            <article key={item.id} style={{ display: "flex", flexDirection: "column", gap: 12, padding: width < 400 ? "14px" : RS.pad, borderRadius: 16, border: "1px solid " + ROW.border, background: C.paper }}>
              <div style={{ display: "flex", alignItems: "center", gap: RS.gap }}>
                {/* The name below is the row's keyboard stop for opening the
                    item; the thumbnail is the same link for the mouse. */}
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  onClick={() => onView && onView(item)}
                  style={{ width: RS.thumb, height: RS.thumb, borderRadius: RS.thumbRadius, background: ROW.thumb, border: "1px solid " + ROW.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", padding: 0, cursor: "pointer" }}
                >
                  {item.photos && item.photos.length > 0 ? (
                    <img src={item.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
                  ) : (
                    <span style={{ fontSize: RS.emoji }}>{item.e}</span>
                  )}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => onView && onView(item)}
                    className="dy-row-name"
                    style={{ fontFamily: F.head, fontSize: RS.name, fontWeight: 700, color: ROW.ink, letterSpacing: "-0.01em", lineHeight: 1.3, background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left", maxWidth: "100%", overflow: "hidden", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                  >
                    {item.t}
                  </button>
                  <p style={{ marginTop: RS.detailsGap, fontFamily: F.body, fontSize: RS.details, fontWeight: 500, color: ROW.muted, lineHeight: 1.4, overflowWrap: "anywhere" }}>
                    {/* Each part keeps its " ·" and moves to the next line whole, so
                        the line wraps between parts and never starts with a dot; a
                        part wider than the column (narrowest phones) wraps inside. */}
                    {details.map((d, i) => <span key={i}>{i > 0 && " "}<span style={{ display: "inline-block", maxWidth: "100%" }}>{d}{i < details.length - 1 && " ·"}</span></span>)}
                  </p>
                  <div style={{ marginTop: RS.pillGap, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span style={{ ...ROW_PILL, ...pillSize, whiteSpace: "normal", background: meta.bg, color: meta.color, border: "1px solid " + meta.border }}>
                      {meta.pulse && <span style={{ position: "relative", display: "inline-flex", width: 6, height: 6, flexShrink: 0 }}>
                        <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: meta.color, opacity: 0.4, animation: "pulseLive 1.8s ease-in-out infinite" }}/>
                        <span style={{ position: "relative", width: 6, height: 6, borderRadius: "50%", background: meta.color }}/>
                      </span>}
                      {/* Wraps onto a second line on the narrowest phones rather than cutting the status off. */}
                      <span>{meta.label}</span>
                    </span>
                    {item.isBundle && (
                      <span style={{ ...ROW_PILL, ...pillSize, gap: 4, background: C.tealMist || C.greenMist, color: C.teal || C.greenDeep, border: "1px solid " + (C.teal || C.greenDeep) + "30" }}>
                        <Package size={11} strokeWidth={2.2}/> Bundle of {item.bundleCount || (item.bundleContents || []).length || 2}
                      </span>
                    )}
                    {item.isFree && (
                      <span style={{ ...ROW_PILL, ...pillSize, gap: 4, background: C.claret, color: "#fff", border: "1px solid " + C.claret }}>
                        <Heart size={11} strokeWidth={2.2}/> Free pile
                      </span>
                    )}
                  </div>
                </div>

                {/* Price on top, the ⋯ menu under it, both right-aligned. */}
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                  {priceEditId === item.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "flex-end" }}>
                      <span style={{ fontFamily: F.head, fontSize: 15, fontWeight: 900, color: C.green }}>$</span>
                      <input type="text" inputMode="decimal" autoComplete="off" value={tempPrice} autoFocus aria-label={"New price for " + item.t} onChange={e => setTempPrice(decimalAmountText(e.target.value))}
                        onBlur={commitPriceEdit}
                        onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setPriceEditId(null); }}
                        style={{ width: 60, padding: "2px 6px", borderRadius: 6, border: "1.5px solid " + C.green, fontFamily: F.head, fontSize: 15, fontWeight: 900, color: C.green, outline: "none", background: C.paper, textAlign: "center" }}/>
                    </div>
                  ) : (
                    <p style={{ fontFamily: F.head, fontSize: RS.price, fontWeight: 750, color: item.isFree ? C.claret : C.green, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", textAlign: "right" }}>
                      {item.isFree ? "FREE" : (
                        typeof item.soldPrice === "number" && item.soldPrice !== item.price ? (
                          <>
                            <span>{"$" + item.soldPrice}</span>
                            <span style={{ marginLeft: 6, fontSize: RS.strike, fontWeight: 700, color: C.ash, textDecoration: "line-through" }}>{"$" + item.price}</span>
                          </>
                        ) : ("$" + item.price)
                      )}
                    </p>
                  )}
                  <ItemActionsMenu itemName={item.t} actions={itemActions(item, lc)} size={RS.menu}/>
                </div>
              </div>
            </article>
          );
          })()}
          </div>
        ))}
      </div>

      {pendingPickup && (
        <PickupConfirmDialog kind={pendingPickup.kind} item={{ ...pendingPickup.item, price: typeof pendingPickup.item.soldPrice === "number" ? pendingPickup.item.soldPrice : pendingPickup.item.price }} buyer={pendingPickup.item.activeClaimBuyer} isMobile={isMobile} onCancel={() => setPendingPickup(null)} onConfirm={confirmPendingPickup}/>
      )}

      {/* Rate the buyer, same prompt the messages and Orders surfaces use.
          Either button completes the pickup; only "Submit Rating" also posts
          the review. */}
      {pickupItem && (
        <RateBuyerModal
          title="Item Picked Up!"
          subtitle={pickupItem.t + " — picked up by " + pickupItem.activeClaimBuyer}
          buyerName={pickupItem.activeClaimBuyer}
          stars={pickupStars} setStars={setPickupStars}
          note={pickupNote} setNote={setPickupNote}
          onSubmit={() => submitRowPickup({ skip: false })}
          onSkip={() => submitRowPickup({ skip: true })}
        />
      )}

      {/* Publish chooser — seller picks Drop (curated spotlight) vs Shelf (sell now).
          During Live phase, the Drop path is disabled — curation already closed. */}
      {publishChooserItem && (
        <ModalPortal>
        <div
          onClick={() => setPublishChooserItem(null)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(31, 29, 25, 0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: Z.modal, padding: isMobile ? 16 : 24,
            backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          }}
        >
          <ModalA11y label="Choose where to publish" onClose={() => setPublishChooserItem(null)}/>
          <div
            onClick={e => e.stopPropagation()}
            className={"fade-in " + DIALOG_PANEL}
            style={{
              width: 500, maxWidth: "100%",
              borderRadius: 24,
              background: C.paper,
              boxShadow: "0 24px 60px rgba(31, 29, 25, 0.25)",
              display: "flex", flexDirection: "column",
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
                    <Package size={18} style={{ color: "#fff" }} strokeWidth={2.4}/>
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
        </ModalPortal>
      )}

      {/* Delete draft / Delete listing — destructive, can't be undone */}
      {/* Delete: an item no buyer touched is deleted outright; one buyers saved,
          asked about, messaged about or claimed is removed instead (the server
          decides the same way), and the dialog says what happens. */}
      {confirmDelete && (() => {
        const isDraft = lifecycleOf(confirmDelete) === "draft";
        const touched = !!confirmDelete.hasBuyerActivity;
        const what = isDraft ? "draft" : "listing";
        return (
          <ConfirmListingDialog
            item={confirmDelete}
            isMobile={isMobile}
            ariaLabel={(touched ? "Remove this " : "Delete this ") + what}
            title={(touched ? "Remove this " : "Delete this ") + what + "?"}
            subtitle={touched ? "Buyers have saved, asked about or messaged about it." : "No buyer has saved, asked about or messaged about it."}
            statusLabel={isDraft ? "Draft" : (lifecycleMeta[lifecycleOf(confirmDelete)] || lifecycleMeta.shelf).label}
            body={touched
              ? "It leaves your items, and buyers can no longer see, save or claim it. Their conversations with you are kept, so you can still message each other, and they\u2019ll see it\u2019s no longer available. This can\u2019t be undone."
              : (isDraft ? "The draft and its photos, description and price will be deleted. This can\u2019t be undone." : "This permanently deletes the listing. This can\u2019t be undone.")}
            confirmLabel={(touched ? "Remove " : "Delete ") + what}
            cancelLabel={"Keep " + what}
            confirmIcon={Trash2}
            onCancel={() => setConfirmDelete(null)}
            onConfirm={() => { const id = confirmDelete.id; setConfirmDelete(null); deleteItem(id); }}
          />
        );
      })()}
      {pendingWithdraw && (
        <ConfirmListingDialog
          item={pendingWithdraw.item}
          isMobile={isMobile}
          ariaLabel="Withdraw your counter"
          title="Withdraw your counter?"
          subtitle={"Your $" + pendingWithdraw.claim.amount + " counter to " + pendingWithdraw.claim.buyer + "."}
          statusLabel="Waiting for the buyer"
          body={"This closes the negotiation with " + pendingWithdraw.claim.buyer + ": their offer is declined and they\u2019re told. The item stays listed."}
          confirmLabel="Withdraw counter"
          cancelLabel="Keep counter"
          confirmIcon={Undo2}
          onCancel={() => setPendingWithdraw(null)}
          onConfirm={confirmWithdraw}
        />
      )}
      {/* Decline: asks first (Accept doesn't). The buyer is told; the item
          stays listed. */}
      {pendingDecline && (
        <ConfirmListingDialog
          item={pendingDecline.item}
          isMobile={isMobile}
          ariaLabel={"Decline " + pendingDecline.claim.buyer + "’s offer"}
          title={"Decline " + pendingDecline.claim.buyer + "’s offer of $" + pendingDecline.claim.amount + "?"}
          subtitle={pendingDecline.claim.amount >= pendingDecline.item.price ? "A full-price claim." : "Listed at $" + pendingDecline.item.price + "."}
          statusLabel="Claimed \u00B7 action pending"
          body={"They’ll be notified and the item stays listed."}
          confirmLabel="Decline offer"
          cancelLabel="Keep offer"
          confirmIcon={X}
          onCancel={() => setPendingDecline(null)}
          onConfirm={confirmDecline}
        />
      )}
      {confirmSoldElsewhere && (
        <ConfirmListingDialog
          item={confirmSoldElsewhere}
          isMobile={isMobile}
          ariaLabel="Mark as sold elsewhere"
          title="Sold it somewhere else?"
          subtitle="It comes off DropYard for good."
          statusLabel={(lifecycleMeta[lifecycleOf(confirmSoldElsewhere)] || lifecycleMeta.shelf).label}
          body={(confirmSoldElsewhere.openClaimCount > 0
            ? "Every buyer with an offer, an accepted claim or a place on the waitlist is told it's gone, and their claims close. "
            : "")
            + "It won't count as a DropYard sale and won't appear in History. You'll find it in My items under Sold."}
          confirmLabel="Mark as sold"
          cancelLabel="Keep listing"
          confirmIcon={Tag}
          tone="danger"
          onCancel={() => setConfirmSoldElsewhere(null)}
          onConfirm={() => { const it = confirmSoldElsewhere; setConfirmSoldElsewhere(null); markSoldElsewhere(it); }}
        />
      )}
      {confirmRemove && (
        <ConfirmListingDialog
          item={confirmRemove}
          isMobile={isMobile}
          ariaLabel="Save to Drafts"
          title="Save to Drafts?"
          subtitle="You can relist it any time."
          statusLabel={(lifecycleMeta[lifecycleOf(confirmRemove)] || lifecycleMeta.shelf).label}
          body="It will be removed from sale and buyers won't see it anymore. It stays in your Drafts, so you can relist it later."
          confirmLabel="Save to Drafts"
          cancelLabel="Keep listing"
          confirmIcon={FileDown}
          tone="primary"
          onCancel={() => setConfirmRemove(null)}
          onConfirm={() => { const id = confirmRemove.id; setConfirmRemove(null); unpublish(id); }}
        />
      )}
    </div>
  );

}

// My Items rows share the buyer item card's finish (CARD in the buyer
// dashboard): a neutral hairline border instead of a tinted 1.5px one, the
// card's near-black ink and muted grey, lighter weights (600–750, not
// 800–900), and flat buttons. The status pill alone carries the status colour.
const ROW = {
  border: "#E7E3DD",
  ink:    "#111827",
  muted:  "#6B6E74",   // 5.0:1 on white (was #74777D, 4.49:1)
  thumb:  "#F4F5F3",
};
// The first half of an Inventory row's grey details line ("9 days on Shelf ·
// Used – Good"): how long it has been in its current state, or the state.
// Shelf days count from when the item was created (there is no separate
// published-at date), as the old "9d on Shelf" did.
function rowStatusText(item, lc) {
  if (lc === "shelf") {
    const d = item.shelfDays;
    if (typeof d !== "number") return "On the Shelf";
    return d === 0 ? "Added to Shelf today" : d === 1 ? "1 day on Shelf" : d + " days on Shelf";
  }
  if (lc === "queued") return "Queued for Saturday";
  if (lc === "live") return "Live in the Drop";
  if (lc === "claimed") return "Claimed · pickup pending";
  if (lc === "sold") return "Sold outside DropYard";
  return "Draft";
}

// Shown when Save to Drafts is unavailable because a buyer's offer or accepted
// claim is open. Matches the server's refusal (PATCH /api/items/:id).
const REMOVE_BLOCKED_BY_OFFER = "Can't save to Drafts while a buyer's offer is open. Decline the offer first.";
// Delete listing while an offer is open (the server refuses it too).
const DELETE_BLOCKED_BY_OFFER = "Can't delete while a buyer's offer is open. Decline the offer first.";
// A sale waiting for pickup: the seller accepted a buyer's claim. The item is
// RESERVED (or the legacy CLAIMED), or it carries the accepted claim itself:
// an item whose status lags its claim (as migration 20261119130000 left some)
// is still a pending sale, not a listing. The listing can't change until the
// pickup is done or the claim is released (the server refuses it too).
function isPickupPending(item) {
  return !!item && (item.backendStatus === "RESERVED" || item.backendStatus === "CLAIMED" || !!item.activeClaimId);
}
const SALE_PENDING_REASON = "Not available while a sale is pending pickup.";
const SALE_PENDING_DRAFTS = "Can't save to Drafts while a sale is pending pickup.";
const SALE_PENDING_DELETE = "Can't delete while a sale is pending pickup.";
// Inventory row sizes: phones (under 640px) and everything wider.
const ROW_SIZE = {
  phone: { pad: "14px 16px", gap: 14, thumb: 64, thumbRadius: 13, emoji: 30, name: 16, details: 13.5, detailsGap: 4, pill: 12, pillPad: "4px 10px", pillGap: 8, price: 19, strike: 13, menu: 38 },
  large: { pad: "18px 22px", gap: 20, thumb: 84, thumbRadius: 16, emoji: 40, name: 18, details: 14.5, detailsGap: 5, pill: 13, pillPad: "5px 12px", pillGap: 10, price: 22, strike: 14, menu: 42 },
};
// One pill size for status, bundle and free-pile labels.
const ROW_PILL = { display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.head, fontSize: 11, fontWeight: 650, lineHeight: 1.2, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap", maxWidth: "100%" };

// ── Claim cards (My items) ─────────────────────────────────────────────────
// The client's redesign of the seller's claim cards: a cream header strip
// (status, a plain-language line, the step tracker), then the photo, title
// and buyer, a paper price tag and the actions. Parts and styles:
// components/inventory/ClaimCardParts.tsx and .dy-cc-* in globals.css.
//
// OfferCard: a listed item with open offers (Claimed · action pending). The
// best offer is the card (highest amount, then earliest); "+N more offers"
// lists the rest, each with its own actions. By state:
//   new offer below asking  Decline · Counter · Accept $X
//   full-price / above      Decline · Accept $X (nothing to counter)
//   buyer countered back    the same, with the history in the steps
//   seller countered        Withdraw · Message buyer; Change counter in ⋯
// Decline and Withdraw ask first (the dialogs in InventoryView); Withdraw
// declines the offer. Everything comes from GET /api/items/mine (openClaims,
// each with its amount history); every action goes to the claims API, and
// the list refetches on the server's answer and on the socket's claim events,
// so the card turns into the pickup card (accepted) or back into the listed
// row (last offer declined, withdrawn or expired).
const NO_THREAD_REASON = "There's no conversation with this buyer yet.";
function offerLabel(c, listed) {
  if (c.sellerCountered) return "Your counter";
  return c.amount === listed ? "Full price claim" : c.amount < listed ? "Offer below asking" : "Offer above asking";
}
// Offers awaiting the seller first, best first (highest amount, then the
// earliest); then the ones waiting on the buyer, oldest first.
function sortOpenOffers(claims) {
  const at = (c) => (c.at ? new Date(c.at).getTime() : 0);
  const awaiting = claims.filter(c => !c.sellerCountered).sort((a, b) => (b.amount - a.amount) || (at(a) - at(b)));
  const countered = claims.filter(c => c.sellerCountered).sort((a, b) => at(a) - at(b));
  return [...awaiting, ...countered];
}
const firstNameOf = (name) => String(name || "Buyer").trim().split(/\s+/)[0] || "Buyer";
const moneyText = (n) => (n === 0 ? "Free" : "$" + n);
// "4 min ago", "2 hours ago", "yesterday" (the header's plain-language line).
function agoText(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + " min ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs === 1 ? "1 hour ago" : hrs + " hours ago";
  const days = Math.floor(hrs / 24);
  return days === 1 ? "yesterday" : days + " days ago";
}
// A claim's amounts, oldest first: [{ by: "buyer"|"seller"|null, amount, at }].
// From the server's history; when that's short (rows past retention, an old
// claim), the current amount is added, and a counter with no offer before it
// gets an unnamed "made an offer" step.
function claimHistory(c, sellerSetLast) {
  const out = (Array.isArray(c.history) ? c.history : [])
    .filter(h => h && typeof h.amount === "number")
    .map(h => ({ by: h.by || null, amount: h.amount, at: h.at || null }));
  const curBy = sellerSetLast ? "seller" : "buyer";
  const last = out[out.length - 1];
  if (!last || last.amount !== c.amount || (last.by && last.by !== curBy)) out.push({ by: curBy, amount: c.amount, at: null });
  if (out[0].by === "seller") out.unshift({ by: "buyer", amount: null, at: null });
  return out;
}
// The done steps for a history, at most three: the first, "N more counters",
// the last.
function historySteps(hist, who, listed) {
  const labels = hist.map((h, i) => {
    if (h.by === "seller") return "You countered " + moneyText(h.amount);
    if (h.amount == null) return who + " made an offer";
    if (i === 0) return h.amount === 0 ? who + " claimed it" : (h.amount === listed ? who + " claimed " : who + " offered ") + moneyText(h.amount);
    return (h.by === "buyer" ? who + " countered " : "Countered at ") + moneyText(h.amount);
  });
  const shown = labels.length > 3 ? [labels[0], (labels.length - 2) + " more counters", labels[labels.length - 1]] : labels;
  return shown.map(label => ({ label, state: "done" }));
}
const lastSetAt = (c) => {
  const h = Array.isArray(c.history) ? c.history : [];
  return (h.length && h[h.length - 1].at) || c.at || null;
};
// Where the negotiation stands: offer (below asking), full, above, back (the
// buyer countered the seller's counter), waiting (the seller countered).
function offerPhase(c, listed) {
  if (c.sellerCountered) return "waiting";
  if (claimHistory(c, false).length > 1) return "back";
  return c.amount === listed ? "full" : c.amount > listed ? "above" : "offer";
}
// The header, the steps and the tag for one offer.
function offerCardContent(c, listed) {
  const who = firstNameOf(c.buyer);
  const phase = offerPhase(c, listed);
  const hist = claimHistory(c, c.sellerCountered);
  const ago = agoText(lastSetAt(c));
  const sent = ago ? ", sent " + ago : "";
  const prev = (by) => { for (let i = hist.length - 2; i >= 0; i--) if (hist[i].by === by && hist[i].amount != null) return hist[i].amount; return null; };
  const turn = c.sellerCountered ? who + " accepts, counters or declines"
    : c.amount >= listed ? "You accept or decline" : "You accept, counter or decline";
  const steps = [...historySteps(hist, who, listed), { label: turn, state: "current" }, { label: "Arrange pickup", state: "todo" }];
  const byPhase = {
    offer:   { status: "Offer from " + who,  line: "$" + (listed - c.amount) + " under your asking price" + sent, label: who + "’s offer:" },
    full:    { status: "Claim from " + who,  line: "Full asking price" + sent, label: who + "’s claim:", note: "Full price" },
    above:   { status: "Offer from " + who,  line: "$" + (c.amount - listed) + " over your asking price" + sent, label: who + "’s offer:" },
    back:    { status: who + " countered",   line: (prev("seller") != null ? who + " countered your " + moneyText(prev("seller")) : who + " countered") + (ago ? ", " + ago : ""), label: who + "’s counter:", note: prev("seller") != null ? "You: " + moneyText(prev("seller")) : null },
    waiting: { status: "Waiting for " + who, line: "Your counter-offer" + sent, label: "Your counter:", note: prev("buyer") != null ? who + ": " + moneyText(prev("buyer")) : null },
  }[phase];
  return { who, phase, steps, ...byPhase, strike: c.amount !== listed ? moneyText(listed) : null };
}

function OfferCard({ item, busyId = null, onOpen = null, menuActions = [], onAccept, onDecline, onCounter, onWithdraw, onMessage = null }) {
  const [expanded, setExpanded] = useState(false);
  const [counterFor, setCounterFor] = useState(null);
  const [counterText, setCounterText] = useState("");
  const listId = useId();
  const offers = sortOpenOffers(item.openClaims || []);
  const [primary, ...others] = offers;
  if (!primary) return null;
  const listed = item.price;
  const awaitingCount = offers.filter(c => !c.sellerCountered).length;
  const view = offerCardContent(primary, listed);
  const photo = item.photos && item.photos.length > 0 ? item.photos[0] : null;
  const canMessage = (c) => !!(onMessage && c.conversationId);

  const counterProblem = (c) => offerAmountProblem(counterText)
    || (Number(counterText) === c.amount ? (c.sellerCountered ? "That's your current counter." : "That's the buyer's offer. To agree to it, accept it.") : null);
  function startCounter(c) {
    setCounterFor(c.id);
    setCounterText(String(c.sellerCountered ? c.amount : Math.max(1, Math.round((c.amount + listed) / 2))));
  }
  async function submitCounter(c) {
    if (counterProblem(c)) return;
    const ok = await onCounter(c, Number(counterText));
    if (ok) { setCounterFor(null); setCounterText(""); }
  }
  const cancelCounter = () => { setCounterFor(null); setCounterText(""); };

  // One offer's buttons. small: the rows under "+N more offers", which have
  // no ⋯ menu, so Change counter is a button there.
  function actionsFor(c, small) {
    const busy = busyId === c.id;
    const who = firstNameOf(c.buyer);
    const sz = small ? " dy-cc-btn--sm" : "";
    if (counterFor === c.id) {
      const problem = counterProblem(c);
      const hintId = "offer-counter-hint-" + c.id;
      return (
        <>
          <span className="dy-cc-dollar" aria-hidden="true">$</span>
          <input
            type="text" inputMode="numeric" autoComplete="off" autoFocus
            value={counterText}
            onChange={e => setCounterText(wholeAmountText(e.target.value))}
            onKeyDown={e => { if (e.key === "Enter") submitCounter(c); if (e.key === "Escape") cancelCounter(); }}
            aria-label={(c.sellerCountered ? "New counter to " : "Counter to ") + c.buyer + ", in dollars"}
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? hintId : undefined}
            disabled={busy}
            className="dy-cc-input dy-field"
          />
          <button type="button" onClick={() => submitCounter(c)} disabled={busy || !!problem} aria-describedby={problem ? hintId : undefined} className={"dy-cc-btn dy-cc-btn--dark" + sz}>
            {busy ? "Sending…" : c.sellerCountered ? "Update counter" : "Send counter"}
          </button>
          <button type="button" onClick={cancelCounter} disabled={busy} className={"dy-cc-btn" + sz}>Cancel</button>
          <AmountHint id={hintId} problem={problem} style={{ flexBasis: "100%" }}/>
        </>
      );
    }
    const message = (
      <button type="button" onClick={canMessage(c) ? () => onMessage(c) : undefined} aria-disabled={canMessage(c) ? undefined : "true"}
        title={canMessage(c) ? undefined : NO_THREAD_REASON} className={"dy-cc-btn" + sz}>
        <MessageSquare size={small ? 15 : 17} aria-hidden="true"/> {"Message " + who}
      </button>
    );
    if (c.sellerCountered) {
      return (
        <>
          <button type="button" onClick={() => onWithdraw(c)} disabled={busy} aria-label={"Withdraw your counter to " + c.buyer} className={"dy-cc-btn dy-cc-btn--link" + sz}>
            <Undo2 size={small ? 15 : 17} aria-hidden="true"/> Withdraw
          </button>
          {message}
          {small && (
            <button type="button" onClick={() => startCounter(c)} disabled={busy} aria-label={"Change your counter to " + c.buyer} className={"dy-cc-btn" + sz}>
              <RefreshCw size={15} aria-hidden="true"/> Change counter
            </button>
          )}
        </>
      );
    }
    // Counter only below the asking price: there's nothing to negotiate on a
    // full-price claim or an offer above it (the steps say "accept or decline").
    const canCounter = c.amount < listed;
    return (
      <>
        <button type="button" onClick={() => onDecline(c)} disabled={busy} aria-label={"Decline " + c.buyer + "’s offer"} className={"dy-cc-btn dy-cc-btn--link" + sz}>Decline</button>
        {canCounter && (
          <button type="button" onClick={busy ? undefined : () => startCounter(c)} aria-disabled={busy ? "true" : undefined} aria-label={"Counter " + c.buyer + "’s offer"} className={"dy-cc-btn" + sz}>
            <RefreshCw size={small ? 15 : 16} aria-hidden="true"/> Counter
          </button>
        )}
        <button type="button" onClick={() => onAccept(c)} disabled={busy} aria-label={"Accept $" + c.amount + " from " + c.buyer + " for " + item.t} className={"dy-cc-btn dy-cc-btn--dark" + sz}>
          {busy ? "Saving…" : <><Check size={small ? 15 : 17} strokeWidth={2.6} aria-hidden="true"/> {"Accept " + moneyText(c.amount)}</>}
        </button>
      </>
    );
  }

  // The card's ⋯: Change counter (seller countered) or Message (seller's
  // turn), then the item's own actions with their rules (live-Drop locks,
  // open-offer reasons) from InventoryView.itemActions.
  const menu = [
    primary.sellerCountered
      ? { id: "change-counter", label: "Change counter", icon: RefreshCw, onSelect: () => startCounter(primary), disabledReason: busyId === primary.id ? "Saving…" : null }
      : { id: "message-buyer", label: "Message " + view.who, icon: MessageCircle, onSelect: () => canMessage(primary) && onMessage(primary), disabledReason: canMessage(primary) ? null : NO_THREAD_REASON },
    ...menuActions,
  ];

  return (
    <ClaimCardFrame
      ariaLabel={item.t + ": " + (awaitingCount > 0 ? awaitingCount + " offer" + (awaitingCount === 1 ? "" : "s") + " to review" : "waiting for the buyer")}
      status={view.status} line={view.line} steps={view.steps}>
      <div className="dy-cc-body" style={{ opacity: busyId === primary.id ? 0.7 : 1 }}>
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => onOpen && onOpen(item)} className="dy-cc-thumb">
          {photo ? <img src={photo} alt=""/> : <span>{item.e}</span>}
        </button>
        <div className="dy-cc-info">
          <button type="button" onClick={() => onOpen && onOpen(item)} className="dy-cc-title dy-row-name">{item.t}</button>
          <p className="dy-cc-meta">
            <span>
              <UserAvatar avatar={primary.buyerAvatar} name={primary.buyer} size={24} decorative initialsBg={avatarBg(primary.buyer)} fontFamily={F.head} fontSize={9}/>
              <span style={{ overflowWrap: "anywhere" }}>{(view.phase === "full" ? "Claim from " : "Offer from ") + primary.buyer}</span>
            </span>
          </p>
          {others.length > 0 && (
            <button type="button" onClick={() => setExpanded(x => !x)} aria-expanded={expanded} aria-controls={listId} className="dy-cc-more-btn">
              {expanded ? "Hide other offers" : "+" + others.length + " more offer" + (others.length === 1 ? "" : "s")}
              <ChevronDown size={15} aria-hidden="true"/>
            </button>
          )}
        </div>
        <div className="dy-cc-tagcell">
          <PriceTag amount={moneyText(primary.amount)} amountLabel={view.label} strike={view.strike} note={view.note || null}/>
        </div>
        <span className="dy-cc-divider" aria-hidden="true"/>
        <div className="dy-cc-actions">
          {actionsFor(primary, false)}
          <ItemActionsMenu itemName={item.t} actions={menu} size={48}/>
        </div>
      </div>
      {others.length > 0 && (
        <ul id={listId} hidden={!expanded} className="dy-cc-others" style={{ display: expanded ? "block" : "none" }}>
          {others.map(c => {
            const ago = agoText(lastSetAt(c));
            return (
              <li key={c.id} className="dy-cc-other" style={{ opacity: busyId === c.id ? 0.6 : 1 }}>
                <div className="dy-cc-other-who">
                  <UserAvatar avatar={c.buyerAvatar} name={c.buyer} size={34} decorative initialsBg={avatarBg(c.buyer)} fontFamily={F.head} fontSize={11}/>
                  <div style={{ minWidth: 0 }}>
                    <span className="dy-cc-other-name">{c.buyer}</span>
                    <span className="dy-cc-other-sub">{(c.sellerCountered ? "Your counter, waiting for " + firstNameOf(c.buyer) : offerLabel(c, listed)) + (ago ? " · " + ago : "")}</span>
                  </div>
                </div>
                <span className="dy-cc-other-amount">{moneyText(c.amount)}</span>
                <div className="dy-cc-actions">{actionsFor(c, true)}</div>
              </li>
            );
          })}
        </ul>
      )}
    </ClaimCardFrame>
  );
}

// ── Pickup card ────────────────────────────────────────────────────────────
// An accepted claim waiting to be picked up (Claimed · pickup pending): "Sold ·
// awaiting pickup", who accepted and when, the steps, how the buyer pays, the
// pickup time and the waitlist; the SOLD tag; Message buyer · Mark picked up
// (asks first) · ⋯ (pickupMenuActions: Message buyer, View details, Mark as
// no-show, Release item, Mark as sold elsewhere; the risky ones ask first).
// How the buyer pays: the claim's choice, else the listing's.
function pickupPaymentText(who, claimMethod, itemMethod) {
  const m = String(claimMethod || itemMethod || "").toUpperCase();
  if (m === "CASH") return who + " pays you at pickup, in cash";
  if (m === "ETRANSFER") return who + " pays you at pickup, by e-Transfer";
  return who + " pays you at pickup, cash or e-Transfer";
}
function PickupCard({ item, buyer, buyerAvatar = null, price, listed = null, when, acceptedAt = null, acceptedBy = "seller", paymentMethod = null, busy = false, onPickup, onOpen = null, onMessage = null, actions }) {
  // Buyers waiting in case this sale falls through (DECISIONS.md #6).
  const waiting = Array.isArray(item.waitlist) ? item.waitlist.length : 0;
  const photo = item.photos && item.photos.length > 0 ? item.photos[0] : null;
  const who = firstNameOf(buyer);
  const priceLabel = moneyText(price);
  const ago = agoText(acceptedAt);
  const fullPrice = typeof listed === "number" && price >= listed;
  const line = (acceptedBy === "buyer" ? who + " accepted your counter"
    : "You accepted " + who + "’s " + (fullPrice ? "claim" : "offer")) + (ago ? " " + ago : "");
  const steps = [
    { label: acceptedBy === "buyer" ? who + " accepted " + priceLabel : (price === 0 ? "You gave it to " + who : "You accepted " + priceLabel), state: "done" },
    { label: price === 0 ? "Hand over" : "Hand over & get paid", state: "current" },
    { label: "Picked up", state: "todo" },
  ];
  const thumb = photo ? <img src={photo} alt=""/> : <span>{item.e}</span>;
  const pickupText = when.kind === "unscheduled" ? "No pickup time yet" : (when.kind === "past" ? "Pickup was " : "Pickup ") + when.time;
  return (
    <ClaimCardFrame ariaLabel={item.t + ": sold to " + buyer + ", awaiting pickup"} status={"Sold · awaiting pickup"} line={line} steps={steps}>
      <div className="dy-cc-body" style={{ opacity: busy ? 0.7 : 1 }}>
        {onOpen ? (
          <button type="button" tabIndex={-1} aria-hidden="true" onClick={onOpen} className="dy-cc-thumb">{thumb}</button>
        ) : (
          <div className="dy-cc-thumb" aria-hidden="true" style={{ cursor: "default" }}>{thumb}</div>
        )}
        <div className="dy-cc-info">
          {onOpen
            ? <button type="button" onClick={onOpen} className="dy-cc-title dy-row-name">{item.t}</button>
            : <p className="dy-cc-title" style={{ cursor: "default" }}>{item.t}</p>}
          <p className="dy-cc-meta">
            <span>
              {buyerAvatar
                ? <UserAvatar avatar={buyerAvatar} name={buyer} size={24} decorative initialsBg={avatarBg(buyer)} fontFamily={F.head} fontSize={9}/>
                : <User size={17} strokeWidth={2.2} aria-hidden="true"/>}
              <span style={{ overflowWrap: "anywhere" }}>{"Sold to " + buyer}</span>
            </span>
            {waiting > 0 && (
              <span className="dy-cc-chip" title="If this sale falls through, their offers become active again and you choose">
                {waiting === 1 ? "1 on the waitlist" : waiting + " on the waitlist"}
              </span>
            )}
          </p>
          {price > 0 && (
            <p className="dy-cc-meta dy-cc-meta--small">
              <span><Banknote size={16} strokeWidth={2.1} aria-hidden="true"/> {pickupPaymentText(who, paymentMethod, item.raw?.paymentMethod)}</span>
            </p>
          )}
          <p className="dy-cc-meta dy-cc-meta--small">
            <span>
              <CalendarClock size={16} strokeWidth={2.1} aria-hidden="true"/>
              <span style={{ overflowWrap: "anywhere" }}>{pickupText}</span>
            </span>
            {when.kind === "today" && <span className="dy-cc-chip dy-cc-chip--today">Today</span>}
          </p>
        </div>
        <div className="dy-cc-tagcell">
          <PriceTag amount={priceLabel} amountLabel="Sold for" sold/>
        </div>
        <span className="dy-cc-divider" aria-hidden="true"/>
        <div className="dy-cc-actions">
          <button type="button" onClick={onMessage || undefined} aria-disabled={onMessage ? undefined : "true"} title={onMessage ? undefined : NO_THREAD_REASON} className="dy-cc-btn">
            <MessageSquare size={17} aria-hidden="true"/> {"Message " + who}
          </button>
          <button type="button" onClick={onPickup} disabled={busy} aria-label={"Mark picked up: " + item.t} className="dy-cc-btn dy-cc-btn--dark">
            <Check size={17} strokeWidth={2.8} aria-hidden="true"/> {busy ? "Saving…" : "Mark picked up"}
          </button>
          <ItemActionsMenu itemName={item.t} actions={actions} size={48}/>
        </div>
      </div>
    </ClaimCardFrame>
  );
}

// The pickup card's ⋯ menu: Message buyer · View details · — · Mark as no-show
// · Release item (the last two in red, each confirmed first).
function pickupMenuActions({ onMessage, onView, onNoShow, onRelease, onSoldElsewhere }) {
  return [
    { id: "message", label: "Message buyer", icon: MessageCircle, onSelect: onMessage || (() => {}), disabledReason: onMessage ? null : "There's no conversation with this buyer yet." },
    { id: "view", label: "View details", icon: Eye, onSelect: onView || (() => {}), disabledReason: onView ? null : "This item can't be opened from here." },
    { id: "no-show", label: "Mark as no-show", icon: UserX, danger: true, onSelect: onNoShow },
    { id: "release", label: "Release item", icon: Undo2, danger: true, onSelect: onRelease },
    ...(onSoldElsewhere ? [{ id: "sold-elsewhere", label: "Mark as sold elsewhere", icon: Tag, danger: true, onSelect: onSoldElsewhere }] : []),
  ];
}

// Mark as no-show and Release item both cancel the accepted claim at once
// (PATCH /api/claims/:id/cancel; only the reason differs). The item goes
// straight back on sale, the buyer is notified the claim was cancelled, and
// a note goes into the conversation. Nothing else happens: no waiting
// period, no notice to people who saved it, nothing on the buyer's record.
const PICKUP_CANCEL_REASON = { "no-show": "no-show", release: "released-at-pickup" };
async function cancelAcceptedClaim(claimId, kind, token) {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out. Please try again.")), 20000));
  return Promise.race([
    apiRequest("/api/claims/" + encodeURIComponent(claimId) + "/cancel", { method: "PATCH", token, body: JSON.stringify({ reason: PICKUP_CANCEL_REASON[kind] }) }),
    timeout,
  ]);
}
function pickupCancelToast(kind, title) {
  return kind === "no-show"
    ? "\u201C" + title + "\u201D marked as no-show. The claim is cancelled and the item is back on sale."
    : "\u201C" + title + "\u201D released. The claim is cancelled and the item is back on sale.";
}
function pickupCancelErrorText(kind, err) {
  return (kind === "no-show" ? "Couldn't mark the no-show: " : "Couldn't release the item: ") + (err && err.message ? err.message : "try again");
}

// The three pickup confirmations, in ConfirmListingDialog. The no-show and
// release texts say exactly what happens (see cancelAcceptedClaim).
function PickupConfirmDialog({ kind, item, buyer, isMobile, onCancel, onConfirm }) {
  const who = buyer || "The buyer";
  const sameEffect = "The claim is cancelled now and the item goes back on sale straight away, so anyone can claim it. " + who + " is notified that the claim was cancelled";
  const copy = kind === "pickup" ? {
    ariaLabel: "Confirm item pickup", title: "Confirm item pickup?", subtitle: who + " claimed this item.",
    body: "Please confirm that the buyer has collected the item. This will mark the transaction as completed and move it to your sales history.",
    confirmLabel: "Confirm pickup", cancelLabel: "Not yet", confirmIcon: Check, tone: "primary",
  } : kind === "no-show" ? {
    ariaLabel: "Mark as no-show", title: "Mark as no-show?", subtitle: who + " didn't come to collect it.",
    body: sameEffect + ", and a note that you marked a no-show is added to your conversation.",
    confirmLabel: "Mark as no-show", cancelLabel: "Keep claim", confirmIcon: UserX, tone: "danger",
  } : {
    ariaLabel: "Release item", title: "Release this item?", subtitle: "Cancel " + who + "\u2019s claim and put it back on sale.",
    body: sameEffect + ", and a note that you released the item is added to your conversation.",
    confirmLabel: "Release item", cancelLabel: "Keep claim", confirmIcon: Undo2, tone: "danger",
  };
  return <ConfirmListingDialog item={item} isMobile={isMobile} statusLabel="Pickup pending" {...copy} onCancel={onCancel} onConfirm={onConfirm}/>;
}

// Confirmation for Save to Drafts / Delete listing / Delete draft: names the item and its
// current status, says plainly what happens, red confirm button. The shared
// dialog pattern (ModalPortal, ModalA11y, Z.modal, DIALOG_PANEL).
function ConfirmListingDialog({ item, isMobile, ariaLabel, title, subtitle, statusLabel, body, confirmLabel, cancelLabel, confirmIcon: ConfirmIcon, onCancel, onConfirm, tone = "danger" }) {
  const primary = tone === "primary";
  return (
    <ModalPortal>
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(31, 29, 25, 0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: Z.modal, padding: isMobile ? 16 : 24,
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <ModalA11y label={ariaLabel} onClose={onCancel}/>
      <div onClick={e => e.stopPropagation()} className={"fade-in " + DIALOG_PANEL} style={{ width: 460, maxWidth: "100%", borderRadius: 24, background: C.paper, boxShadow: "0 24px 60px rgba(31, 29, 25, 0.25)" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid " + C.fawn, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: primary ? C.greenMist : C.claretMist, border: "1px solid " + (primary ? C.green : C.claret) + "30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {primary
                ? <CheckCircle size={18} style={{ color: C.greenDeep }} strokeWidth={2.3} aria-hidden="true"/>
                : <AlertCircle size={18} style={{ color: "#B42318" }} strokeWidth={2.3} aria-hidden="true"/>}
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontFamily: F.head, fontSize: 17, fontWeight: 900, color: C.ink, letterSpacing: "-0.015em" }}>{title}</h3>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, marginTop: 2 }}>{subtitle}</p>
            </div>
          </div>
          <button onClick={onCancel} aria-label="Close" style={{ background: C.sand, border: "none", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={15} style={{ color: C.mink }} aria-hidden="true"/>
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: C.sand, border: "1px solid " + C.fawn }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: "linear-gradient(135deg, " + C.sand + " 0%, " + C.fawn + "80 100%)", border: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontSize: 22, flexShrink: 0 }}>
              {item.photos && item.photos.length > 0
                ? <img src={item.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
                : <span aria-hidden="true">{item.e}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 2, overflowWrap: "anywhere" }}>{item.t}</p>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink }}>
                {[statusLabel, item.cat, typeof item.price === "number" ? (item.price === 0 ? "Free" : "$" + item.price) : null].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.mink, lineHeight: 1.55, marginTop: 14 }}>{body}</p>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid " + C.fawn, background: C.sand + "80", display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button onClick={onCancel} style={{ minHeight: 44, padding: "10px 20px", borderRadius: 999, border: "1.5px solid " + C.fawn, cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800, background: C.paper, color: C.ink }}>
            {cancelLabel}
          </button>
          {/* #B42318: white text 6.6:1. */}
          <button onClick={onConfirm} style={{ minHeight: 44, display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800, letterSpacing: "-0.005em", background: primary ? C.green : "#B42318", color: "#fff", boxShadow: "0 2px 0 " + (primary ? C.greenDeep : "#8A1A12") }}>
            <ConfirmIcon size={14} strokeWidth={2.6} aria-hidden="true"/> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

// Reusable button style helpers — defined at module scope for clarity
/* The Inventory row's action buttons (and their style helpers) became the ⋯
   menu: components/inventory/ItemActionsMenu.tsx. */


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
/**
 * Square item thumbnail: the first uploaded photo when there is one, the
 * category emoji when there isn't. Every list that shows an item — Messages,
 * History, Inventory — needs the same conditional, and each one that grew its
 * own copy ended up showing a generic emoji because its adapter had quietly
 * dropped `photos` from the payload. One component, so the next list that
 * needs a thumbnail can't reintroduce that.
 *
 * `photos` is the array off the API item; `fallback` is the emoji to show
 * when it's empty. `background` and `radius` vary per surface.
 */
function ItemThumb({ photos, fallback, alt, size, emojiSize, radius = 12, background = C.sand }) {
  const photo = Array.isArray(photos) ? photos.find(Boolean) : null;
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid " + C.fawn, overflow: "hidden" }}>
      {photo
        ? <img src={photo} alt={alt || "Item"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
        : <span style={{ fontSize: emojiSize }}>{fallback}</span>}
    </div>
  );
}

/** Messages-inbox wrapper — takes the adapted conversation's `item`. */
function ConversationItemThumb({ item, size, emojiSize }) {
  return (
    <ItemThumb
      photos={item?.photos}
      fallback={item?.img}
      alt={item?.title}
      size={size}
      emojiSize={emojiSize}
    />
  );
}

// Read receipts, the date separators and the bubbles now live in
// components/messages/ (MessageRow), shared with the buyer dashboard.

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
    itemId: api.itemId || api.item?.id || null,
    type:   "question",
    status,
    unread: (api.unreadCount || 0) > 0,
    unreadCount: api.unreadCount || 0,
    group:  "active",
    // "Needs reply": the buyer wrote last and nobody has answered, read or
    // not. A claim NOTICE isn't someone writing, so it never counts; the
    // claim pill tells that part of the story.
    needsReply: !!api.lastMessage && !lastFromMe && api.lastMessage.messageType !== "NOTICE",
    item: {
      id:    api.item?.id || api.itemId || null,
      title: api.item?.title || "Item",
      price: api.item?.price ?? 0,
      // The thread showed a category emoji for every item, however many
      // photos the seller had uploaded. /api/conversations has always sent
      // the item's resolved `photos` — this adapter simply never read them,
      // so the listing a buyer is negotiating over was unrecognisable at a
      // glance in the inbox. `img` stays as the emoji fallback for items
      // with no photo, matching the Inventory rows.
      photos: Array.isArray(api.item?.photos) ? api.item.photos.filter(Boolean) : [],
      img:   CATEGORY_EMOJI[api.item?.category] || "\u{1F4E6}",
      layer,
      // Raw backend status (LIVE / CLAIMED / SOLD). Composer locks once
      // the item is SOLD (pickup complete).
      status: api.item?.status || null,
    },
    buyer: {
      id:     api.otherUser?.id || api.buyerId || null,
      name:   api.otherUser?.name || "Buyer",
      hood:   api.otherUser?.neighborhood || "—",
      avatar: api.otherUser?.avatar || null,
      rating: 0,
      previousPurchases: typeof api.otherUser?.previousPurchases === "number"
        ? api.otherUser.previousPurchases
        : 0,
    },
    // How far the buyer has read — the basis of the read ticks on my own
    // messages. Any message I sent at or before this moment has been seen.
    otherLastReadAt: api.otherLastReadAt || null,
    lastMsg:  previewText(api.lastMessage),
    lastTime: relativeTimeShort(api.lastMessageAt),
    // Raw timestamp for the inbox's own time label ("5m", "Yesterday").
    lastMessageAt: api.lastMessageAt || null,
    messages: [],
  };
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
        { from: "system", text: "Claim accepted. Arrange the pickup here.", time: "Wed, 3:01 PM", type: "notice" },
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
        { from: "system", text: "Counter offer sent.", time: "Today, 11:01 AM", type: "notice" },
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
        { from: "system", text: "Claim accepted. Arrange the pickup here.", time: "Fri, 2:16 PM", type: "notice" },
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

/* ============================================================
   RATE BUYER MODAL
   Opens the moment a seller marks a pickup complete, so the
   rating is captured while the handover is fresh instead of
   waiting for them to go find the History tab. POSTs to
   /api/claims/:id/review, which writes the sellerReviewX fields
   (the buyer's mirror of this writes buyerReviewX).
   ============================================================ */
function RateBuyerModal({ title, subtitle, buyerName, stars, setStars, note, setNote, onSubmit, onSkip }) {
  return (
    <ModalPortal>
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.modal, padding: 16 }}>
      <ModalA11y label="Rate the buyer"/>
      <div className={DIALOG_PANEL} style={{ width: 420, maxWidth: "100%", borderRadius: 24, background: C.paper, padding: 28, boxShadow: "0 24px 80px rgba(0,0,0,0.15)" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: C.gLightBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <CheckCircle size={28} style={{ color: C.gPrimary }}/>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: C.ink, fontFamily: F.head }}>{title}</h3>
          <p style={{ fontSize: 13, color: C.mink, marginTop: 4, fontFamily: F.body }}>{subtitle}</p>
        </div>

        <div style={{ padding: 16, borderRadius: 14, border: "1px solid " + C.fawn, background: C.sand, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 10, fontFamily: F.body, textAlign: "center" }}>Rate {buyerName || "this buyer"}</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 4 }}>
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setStars(s)} aria-label={s + (s === 1 ? " star" : " stars")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <Star size={28} style={{ color: s <= stars ? "#FBBF24" : "#e2e8f0", fill: s <= stars ? "#FBBF24" : "none", strokeWidth: 1.5 }}/>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: C.ash, textAlign: "center", fontFamily: F.body }}>
            {stars === 0 ? "Tap to rate" : stars <= 2 ? "Could be better" : stars <= 3 ? "Okay" : stars === 4 ? "Great buyer!" : "Excellent buyer!"}
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6, fontFamily: F.body }}>Note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="On time, friendly, easy transaction..." style={{ width: "100%", height: 60, padding: 10, borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 12, fontFamily: F.body, resize: "none", outline: "none", boxSizing: "border-box" }}/>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onSubmit} disabled={stars < 1} style={{ flex: 1, padding: "12px 0", borderRadius: 999, border: "none", cursor: stars < 1 ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, fontFamily: F.body, backgroundColor: stars < 1 ? C.fawn : C.gPrimary, color: stars < 1 ? C.ash : "#fff" }}>Submit Rating</button>
          <button onClick={onSkip} style={{ padding: "12px 20px", borderRadius: 50, border: "1.5px solid #e2e8f0", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: F.body, background: C.paper, color: C.mink }}>Skip</button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

function SellerMessagesView({ user = null, accessToken = null, convList: convListProp = null, onConvListChange = null, openThread = null, onConsumeOpenThread = null }) {
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

  // Chat attachments. The seller composer had none at all: a buyer could send
  // a photo of a scratch and the seller could neither see it (adaptMessage
  // dropped attachmentUrl) nor reply with one. Picking a file stages it —
  // upload and send happen when the seller presses send, never on the OS
  // file dialog's own "Open".
  const chatFileInputRef = useRef(null);
  const [attachBusy, setAttachBusy] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const clearPendingAttachment = useCallback(() => {
    setPendingAttachment((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);
  // Switching threads drops the staged file — it was picked for one buyer and
  // must not follow the seller into a different conversation.
  useEffect(() => { clearPendingAttachment(); }, [activeId, clearPendingAttachment]);

  // Emoji tray above the composer. Closes on pick, on Escape, and whenever
  // the thread changes — leaving it hanging open over a different buyer's
  // conversation is worse than making the seller tap twice.
  const [emojiOpen, setEmojiOpen] = useState(false);
  useEffect(() => { setEmojiOpen(false); }, [activeId]);
  useEffect(() => {
    if (!emojiOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setEmojiOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [emojiOpen]);

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

  // ─── Archived threads ────────────────────────────────────────────────────
  // The seller inbox had no archive at all: the backend flag
  // (`archivedBySeller`) and the PATCH route were already there, and the
  // buyer had the button, but a seller's thread list only ever grew. Same
  // two-list model as the buyer view — the live inbox drives the nav badge,
  // and this list renders the collapsed "Archived" group beneath it.
  const [archivedList, setArchivedList]       = useState([]);
  // The shared inbox (NotificationsProvider) needs to know which thread is
  // actually on screen: a message arriving there has been seen, so it isn't
  // counted as unread. On a phone the list and the thread take turns.
  const inbox = useNotifications();
  const setOpenConversation = inbox?.setOpenConversation;
  const visibleThreadId = activeId && (!isMobile || mobileViewingId) ? activeId : null;
  useEffect(() => {
    if (!setOpenConversation) return;
    setOpenConversation(visibleThreadId);
    return () => setOpenConversation(null);
  }, [setOpenConversation, visibleThreadId]);
  // A new message un-archives a thread (server side), so it reappears in the
  // inbox; take it out of the Archived tab at the same moment.
  useEffect(() => {
    setArchivedList(prev => {
      const next = prev.filter(c => !convList.some(x => x.id === c.id));
      return next.length === prev.length ? prev : next;
    });
  }, [convList]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  useEffect(() => {
    if (!usingBackend) { setArchivedList([]); return; }
    let cancelled = false;
    setArchivedLoading(true);
    apiRequest("/api/conversations?archived=true", { token: accessToken })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.conversations) ? data.conversations : [];
        setArchivedList(list.map((api) => adaptSellerConversation(api, myId)).filter(Boolean));
      })
      .catch(() => { if (!cancelled) setArchivedList([]); })
      .finally(() => { if (!cancelled) setArchivedLoading(false); });
    return () => { cancelled = true; };
  }, [usingBackend, accessToken, myId]);

  // Active thread messages — only used in wired mode. In demo mode the
  // existing render path reads inline from each conversation's `messages`.
  const [activeMsgs, setActiveMsgs]     = useState(null);
  const [activeLoading, setActiveLoading] = useState(false);

  // Refetch the open thread when the socket comes back. Messages that landed
  // while it was down were pushed to a listener nobody was holding, and the
  // thread fetch only re-runs when you switch threads — so they stayed
  // missing until a reload. Bumped on the false→true edge only, so an already
  // healthy connection never refetches.
  const { connected: msgSocketConnected } = useSocket();
  const [threadTick, setThreadTick] = useState(0);
  const msgWasConnectedRef = useRef(msgSocketConnected);
  useEffect(() => {
    const was = msgWasConnectedRef.current;
    msgWasConnectedRef.current = msgSocketConnected;
    if (msgSocketConnected && !was) setThreadTick((t) => t + 1);
  }, [msgSocketConnected]);

  // BUG-055 — active PROPOSED claims indexed by conversationId. Powers the
  // in-chat "Pending offer" banner so the seller can Accept/Counter/Decline
  // without leaving the conversation view. Refreshes on every claim:updated
  // socket event.
  const [activeClaimByConv, setActiveClaimByConv] = useState({});
  // The CURRENT claim per conversation whatever its status, including the
  // terminal ones activeClaimByConv drops. The thread badge reads off this:
  // a cancelled claim used to leave the chip saying "Unanswered", i.e. the
  // seller still owes the buyer a reply, on a thread whose claim is gone —
  // and it counted toward the "needs action" tally with it.
  const [latestClaimByConv, setLatestClaimByConv] = useState({});
  const [pendingClaimTick, setPendingClaimTick]   = useState(0);
  useSocketEvent("claim:updated", () => setPendingClaimTick(t => t + 1));
  useSocketEvent("claim:new",     () => setPendingClaimTick(t => t + 1));
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    // One unfiltered call instead of the two status-filtered ones this used
    // to make. /api/claims/incoming with no filter returns every claim on
    // the seller's items newest-first, which gives the active claims (the
    // chat banner's Accept/Counter/Decline and Mark Picked up) AND the
    // terminal ones the badge needs — in a single request.
    apiRequest("/api/claims/incoming", { token: accessToken })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.claims) ? data.claims : [];
        const idx = {};
        const latest = {};
        for (const c of list) {
          if (!c.conversationId) continue;
          // Newest-first, so the first claim seen for a conversation is the
          // one that counts.
          if (!latest[c.conversationId]) latest[c.conversationId] = c;
          // WAITLISTED too: the banner then offers Remove from waitlist.
          if (c.status === "PROPOSED" || c.status === "ACCEPTED" || c.status === "WAITLISTED") {
            idx[c.conversationId] = c;
          }
        }
        setActiveClaimByConv(idx);
        setLatestClaimByConv(latest);
      })
      .catch(() => { if (!cancelled) { setActiveClaimByConv({}); setLatestClaimByConv({}); } });
    return () => { cancelled = true; };
  }, [accessToken, pendingClaimTick]);

  // In-chat offer action state.
  const [chatBusyClaimId, setChatBusyClaimId] = useState(null);
  // Rate-the-buyer prompt, opened by Mark Picked up in the chat banner.
  const [rateClaim, setRateClaim] = useState(null);
  // The banner's Mark picked up, waiting for "Confirm pickup".
  const [confirmChatPickup, setConfirmChatPickup] = useState(null);
  const [rateStars, setRateStars] = useState(0);
  const [rateNote,  setRateNote]  = useState("");
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
  // The banner validates the amount (whole dollars, not the current offer)
  // and closes its form when this resolves true.
  async function chatCounterSubmit(claim, amt) {
    setChatBusyClaimId(claim.id);
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/amount", {
        method: "PATCH", token: accessToken,
        body: JSON.stringify({ amount: amt }),
      });
      chatFlashOk("Countered at $" + amt + ". Waiting for the buyer.");
      setPendingClaimTick(t => t + 1);
      return true;
    } catch (err) { chatFlashErr("counter", err); return false; }
    finally { setChatBusyClaimId(null); }
  }
  async function chatMarkPickedUp(claim) {
    setChatBusyClaimId(claim.id);
    try {
      await markClaimPickedUp(claim.id, accessToken);
      chatFlashOk("Pickup complete. Item marked as sold.");
      setPendingClaimTick(t => t + 1);
      // Ask for the buyer rating straight away. The claim is PICKED_UP now,
      // which is the only state POST /review accepts.
      setRateClaim(claim);
      setRateStars(0);
      setRateNote("");
    } catch (err) {
      chatFlashErr("mark picked up", err);
      // Refused (cancelled since this loaded, say): refetch so the stale
      // Mark picked up banner goes away.
      setPendingClaimTick(t => t + 1);
    }
    finally { setChatBusyClaimId(null); }
  }

  // Seller's rating of the buyer, submitted from the modal above.
  async function submitChatRating({ skip = false } = {}) {
    const claim = rateClaim;
    const stars = rateStars;
    const note  = rateNote.trim();
    setRateClaim(null);
    if (skip || !claim || stars < 1) return;
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/review", {
        method: "POST", token: accessToken,
        body: JSON.stringify({ rating: stars, text: note || undefined }),
      });
      chatFlashOk("Thanks — your rating of " + (claim.buyer?.name || "the buyer") + " was saved.");
    } catch (err) { chatFlashErr("save the rating", err); }
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
      IMAGE: "image",
    };
    const renderType = TYPE_MAP[api.messageType] || "text";
    return {
      id:   api.id,
      from: fromMe ? "seller" : "buyer",
      text: api.body,
      // Toronto time, like the day separators above it.
      time: messageTime(api.createdAt),
      // Raw timestamp alongside the display string — read receipts compare it
      // against the buyer's cursor, which a formatted time can't do.
      sentAt: api.createdAt || null,
      type: renderType,
      amount: typeof api.amount === "number" ? api.amount : undefined,
      // IMAGE was missing from the map and attachmentUrl was dropped
      // entirely, so a photo a buyer sent arrived as an empty text bubble —
      // the seller could see that something came through and not what.
      attachmentUrl: typeof api.attachmentUrl === "string" ? api.attachmentUrl : undefined,
    };
  }

  // Initial inbox fetch — moved to the dashboard root so the Sidebar / TopNav
  // / MobileBottomNav badges stay accurate when this view is unmounted. We
  // only run a local fallback fetch when no parent owns the list (legacy
  // path / isolated rendering).
  useEffect(() => {
    if (!usingBackend) return;
    // Parent owns the list. Nothing is auto-selected: opening the newest
    // thread on arrival marked it read before the seller had looked at it,
    // so it never showed under Unread. The thread pane asks them to pick.
    if (convListProp != null) return;
    let cancelled = false;
    setLoading(true);
    apiRequest("/api/conversations", { token: accessToken })
      .then(data => {
        if (cancelled) return;
        const list = Array.isArray(data?.conversations) ? data.conversations.map(adaptConversation).filter(Boolean) : [];
        setConvList(list);
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
  }, [activeId, usingBackend, accessToken, threadTick]);

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
      // The shared inbox doesn't count a message in the thread on screen
      // (setOpenConversation above); this also clears anything counted before
      // the thread was opened. Deferred so it lands after the inbox's own
      // update for this same event.
      const openId = activeId;
      Promise.resolve().then(() => setConvList(prev => prev.map(c => c.id === openId
        ? { ...c, unread: false, unreadCount: 0, status: c.status === "needs-response" ? "answered" : c.status }
        : c)));
    }
  });

  // Pick → stage. Validated here so a bad file is refused at pick time, and
  // mirroring the upload route's own filter (jpg/png/webp/gif, 10 MB).
  function stageAttachment(file) {
    if (!file || !activeId) return;
    if (!usingBackend) {
      setErrorMsg("Attachments need a signed-in session.");
      return;
    }
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      setErrorMsg("Only jpg, png, webp or gif images can be attached.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("That image is over 10 MB — please attach a smaller one.");
      return;
    }
    setErrorMsg(null);
    setPendingAttachment((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file), name: file.name, size: file.size };
    });
  }

  // Upload the staged file, then post one message carrying the photo and any
  // caption. On failure the file stays staged so send can be pressed again.
  async function sendWithAttachment(caption) {
    if (!activeId || !pendingAttachment) return;
    setAttachBusy(true);
    setSending(true);
    try {
      const { publicUrl } = await uploadItemPhoto(pendingAttachment.file);
      const res = await apiRequest("/api/conversations/" + encodeURIComponent(activeId) + "/messages", {
        method: "POST",
        token:  accessToken,
        body:   JSON.stringify({ body: caption, messageType: "IMAGE", attachmentUrl: publicUrl }),
      });
      setDraft("");
      clearPendingAttachment();
      if (res?.message) {
        setActiveMsgs((prev) => {
          const list = prev || [];
          if (list.some((m) => m.id === res.message.id)) return list;
          return [...list, adaptMessage(res.message)];
        });
      }
      setConvList(prev => prev.map(c => c.id === activeId ? { ...c, needsReply: false } : c));
    } catch (err) {
      setErrorMsg("Couldn't send that image: " + (err?.message || "try again"));
      setTimeout(() => setErrorMsg(null), 4500);
    } finally {
      setAttachBusy(false);
      setSending(false);
    }
  }

  async function handleSend() {
    const body = draft.trim();
    // A staged photo is enough on its own — the caption is optional.
    if (!body && !pendingAttachment) return;
    if (pendingAttachment) { await sendWithAttachment(body); return; }
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
      const res = await apiRequest("/api/conversations/" + encodeURIComponent(activeId) + "/messages", {
        method: "POST",
        token:  accessToken,
        body:   JSON.stringify({ body }),
      });
      setDraft("");
      // Append from the POST response rather than waiting for the socket to
      // echo it back. The echo does fire — the backend emits message:new to
      // the sender as well as the recipient — but relying on it alone meant
      // the sender's own message only appeared if the socket happened to be
      // connected and the event wasn't missed. When it wasn't, the message
      // was saved and invisible until something refetched the thread, which
      // is what "I typed it and it took several refreshes to show up" is.
      // The socket handler dedupes on message id, so the echo is a no-op.
      if (res?.message) {
        setActiveMsgs((prev) => {
          const list = prev || [];
          if (list.some((m) => m.id === res.message.id)) return list;
          return [...list, adaptMessage(res.message)];
        });
      }
      setConvList(prev => prev.map(c => c.id === activeId ? { ...c, needsReply: false } : c));
      // Writing into an archived thread un-archives the sender's side server
      // side, so mirror that here instead of leaving the row under "Archived"
      // with a message the seller just sent as its preview.
      const archived = archivedList.find(c => c.id === activeId);
      if (archived) {
        setArchivedList(prev => prev.filter(c => c.id !== activeId));
        setConvList(prev => (prev.some(c => c.id === activeId) ? prev : [{ ...archived, needsReply: false }, ...prev]));
      }
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

  // Single source of truth for everything below — derived from state above.
  const conversations = convList;

  // ─── Inbox: tabs, search, pills ──────────────────────────────────────────
  // The status pill reads off the thread's latest claim (components/messages/
  // claimStatus.ts), shared with the buyer side; a thread with no claim has
  // none. "Needs reply" is the separate cue for a buyer's message nobody has
  // answered yet, read or not, so a question the seller opened and meant to
  // come back to isn't lost.
  const pillFor = useCallback((c) => (c ? claimPill(latestClaimByConv[c.id]) : null), [latestClaimByConv]);
  const sellerTurnOnOffer = useCallback((c) => {
    const pc = c && activeClaimByConv[c.id];
    return !!pc && pc.status === "PROPOSED" && pc.lastAmountBy !== myId;
  }, [activeClaimByConv, myId]);

  // Threads with something unread: the same count as the nav badge.
  const unreadCount = conversations.filter(c => (c.unreadCount || 0) > 0).length;
  // "Need your attention": a buyer waiting on a reply, or an offer that's
  // the seller's to answer.
  const needsAction = conversations.filter(c => c.needsReply || sellerTurnOnOffer(c)).length;

  const [inboxTab, setInboxTab]       = useState("all");
  const [searchOpen, setSearchOpen]   = useState(false);
  const [threadQuery, setThreadQuery] = useState("");
  const searching = threadQuery.trim().length > 0;
  // Client-side over what's loaded: item title, the buyer's name and the
  // last message. Applies within the selected tab.
  const matchesQuery = useCallback((c) => {
    const q = threadQuery.trim().toLowerCase();
    if (!q) return true;
    return [c?.item?.title, c?.buyer?.name, c?.lastMsg]
      .some((field) => typeof field === "string" && field.toLowerCase().includes(q));
  }, [threadQuery]);
  const tabThreads = useMemo(() => ({
    all:      conversations,
    unread:   conversations.filter(c => (c.unreadCount || 0) > 0),
    claims:   conversations.filter(c => isLiveClaim(activeClaimByConv[c.id])),
    archived: archivedList,
  }), [conversations, archivedList, activeClaimByConv]);
  const visibleThreads = (tabThreads[inboxTab] || []).filter(matchesQuery);
  const INBOX_TABS = [
    { id: "all",      label: "All" },
    { id: "unread",   label: "Unread", badge: unreadCount, badgeLabel: unreadCount === 1 ? "unread conversation" : "unread conversations" },
    { id: "claims",   label: "Active Claims" },
    { id: "archived", label: "Archived" },
  ];
  const listPanelId = "seller-inbox-list";

  // Selection can land on an archived thread — opening one is how the seller
  // reads it before deciding to bring it back.
  const activeIsArchived = archivedList.some(c => c.id === activeId);
  const active = conversations.find(c => c.id === activeId)
    || archivedList.find(c => c.id === activeId)
    || null;

  // Open a named thread: a browser notification or a ?conversation=<id>
  // link. Resolved during render (React's "adjust state when a prop changes"
  // pattern), once per request; a thread that hasn't loaded yet opens as
  // soon as it does. The request is dropped when Messages closes.
  // The parent's open-this-thread request. Dropped once that thread is open,
  // when the seller opens another thread themselves, or (by the parent) when
  // they leave Messages, so coming back later starts on the inbox.
  const consumeOpenRef = useRef(onConsumeOpenThread);
  useEffect(() => { consumeOpenRef.current = onConsumeOpenThread; });
  const [handledOpen, setHandledOpen] = useState(null);
  if (openThread && openThread !== handledOpen) {
    const live = conversations.find(c => matchesOpenTarget(c, openThread));
    const match = live || archivedList.find(c => matchesOpenTarget(c, openThread));
    if (match) {
      setHandledOpen(openThread);
      setActiveId(match.id);
      setMobileViewingId(match.id);
      setInboxTab(live ? (tabThreads[inboxTab]?.some(c => c.id === match.id) ? inboxTab : "all") : "archived");
    }
  }
  // Once the requested thread is open, the request has done its job: tell the
  // parent to drop it. (Not on unmount: React's development Strict Mode
  // unmounts and remounts every component once, which cleared the request
  // before the inbox had loaded, so a ?conversation= link sometimes never
  // opened.) A ?conversation= link is dropped from the address bar then too
  // (not on load, when the other dashboard may still be the one mounted), so
  // a refresh doesn't re-open it over whatever came next.
  useEffect(() => {
    if (!handledOpen) return;
    consumeOpenRef.current?.();
    if (!handledOpen.conversationId || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("conversation") !== handledOpen.conversationId) return;
    url.searchParams.delete("conversation");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [handledOpen]);
  const activeBuyerName = active ? shortName(active.buyer.name) : "";

  // Archive / unarchive. The endpoint and the per-side flag
  // (`archivedBySeller`) already existed — the seller inbox simply never
  // offered either, so a seller's thread list only ever grew.
  async function archiveThread(conv) {
    if (!conv) return;
    setConvList(prev => prev.filter(c => c.id !== conv.id));
    setArchivedList(prev => (prev.some(c => c.id === conv.id) ? prev : [conv, ...prev]));
    if (!usingBackend) return;
    try {
      await apiRequest("/api/conversations/" + encodeURIComponent(conv.id) + "/archive", {
        method: "PATCH",
        token:  accessToken,
        body:   JSON.stringify({ archived: true }),
      });
      setSuccessMsg("Moved to Archived.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setConvList(prev => (prev.some(c => c.id === conv.id) ? prev : [conv, ...prev]));
      setArchivedList(prev => prev.filter(c => c.id !== conv.id));
      setErrorMsg("Couldn't archive: " + (err?.message || "try again"));
      setTimeout(() => setErrorMsg(null), 4000);
    }
  }
  async function unarchiveThread(conv) {
    if (!conv) return;
    setArchivedList(prev => prev.filter(c => c.id !== conv.id));
    setConvList(prev => (prev.some(c => c.id === conv.id) ? prev : [conv, ...prev]));
    if (!usingBackend) return;
    try {
      await apiRequest("/api/conversations/" + encodeURIComponent(conv.id) + "/archive", {
        method: "PATCH",
        token:  accessToken,
        body:   JSON.stringify({ archived: false }),
      });
      setSuccessMsg("Back in your inbox.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setArchivedList(prev => (prev.some(c => c.id === conv.id) ? prev : [conv, ...prev]));
      setConvList(prev => prev.filter(c => c.id !== conv.id));
      setErrorMsg("Couldn't unarchive: " + (err?.message || "try again"));
      setTimeout(() => setErrorMsg(null), 4000);
    }
  }

  // ─── Report the buyer (⋮ menu) ───────────────────────────────────────────
  const [reportOpen, setReportOpen] = useState(false);
  async function submitReport({ reason, details }) {
    const target = active;
    await apiRequest("/api/submissions", {
      method: "POST", token: accessToken,
      body: JSON.stringify({
        type: "USER_REPORT",
        source: "messages-seller",
        payload: {
          message: details ? reason + ": " + details : reason,
          reason, details: details || undefined,
          reportedUserId: target?.buyer?.id || undefined, reportedUserName: target?.buyer?.name,
          itemId: target?.itemId || undefined, itemTitle: target?.item?.title,
          conversationId: target?.id,
          name: user?.name || undefined, email: user?.email || undefined,
        },
      }),
    });
  }

  // One row renderer for every tab.
  function renderThreadRow(c) {
    const row = (
      <ThreadRow
        key={c.id}
        title={c.item.title}
        name={shortName(c.buyer.name)}
        avatar={c.buyer.avatar}
        avatarBg={avatarBg(c.buyer.name)}
        thumb={<ConversationItemThumb item={c.item} size={52} emojiSize={30}/>}
        preview={c.lastMsg}
        time={inboxTime(c.lastMessageAt) || c.lastTime}
        unreadCount={c.unreadCount || (c.unread ? 1 : 0)}
        selected={c.id === activeId && (!isMobile || !!mobileViewingId)}
        pill={pillFor(c)}
        needsReply={!!c.needsReply && inboxTab !== "archived"}
        onSelect={() => { consumeOpenRef.current?.(); setActiveId(c.id); setMobileViewingId(c.id); }}
      />
    );
    if (inboxTab !== "archived") return row;
    // Archived rows keep a one-tap way back, beside (not inside) the row button.
    return (
      <div key={c.id} style={{ position: "relative" }}>
        {row}
        <button
          onClick={() => unarchiveThread(c)}
          aria-label={"Unarchive " + c.item.title}
          style={{ position: "absolute", right: 14, bottom: 12, display: "inline-flex", alignItems: "center", gap: 4, minHeight: 32, padding: "4px 12px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 11, fontWeight: 800, cursor: "pointer" }}
        >
          <RefreshCw size={11} aria-hidden="true"/> Unarchive
        </button>
      </div>
    );
  }
  // Demo mode reads messages inline from the conversation; wired mode uses
  // the activeMsgs state populated by GET /:id/messages and socket pushes.
  const activeMessages = usingBackend ? (activeMsgs || []) : (active?.messages || []);
  // Keeps the open thread at its newest message (components/messages/
  // useThreadAutoScroll): on open, on my own sends, and on arrivals while
  // I'm at the bottom; otherwise a "New message ↓" pill.
  const lastMsg = activeMessages[activeMessages.length - 1];
  const threadScroll = useThreadAutoScroll({
    threadKey: active?.id || null,
    lastMessageKey: lastMsg ? (lastMsg.id || activeMessages.length + ":" + lastMsg.time) : null,
    lastIsMine: lastMsg?.from === "seller",
  });

  function renderMessage(m, i) {
    const isYou = m.from === "seller"; // viewer is the seller; "buyer" is counterparty
    const isAI = m.from === "ai";

    // Chat bubbles (components/messages/MessageRow): the buyer's grey on the
    // left with their avatar beside it, mine pale green on the right with the
    // time and read ticks.
    const rowProps = {
      side: isYou ? "out" : "in",
      avatar: active?.buyer?.avatar,
      name: activeBuyerName,
      avatarBg: avatarBg(active?.buyer?.name),
      time: m.time,
      sentAt: m.sentAt,
      otherLastReadAt: active?.otherLastReadAt,
    };

    // Keyed on the URL rather than the type, so a row that carries a photo
    // always renders it. Any caption travels in `text` and sits underneath.
    if (m.attachmentUrl) {
      return (
        <MessageRow key={i} {...rowProps} flush>
          <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", lineHeight: 0 }}>
            <img
              src={m.attachmentUrl}
              alt={m.text ? m.text : "Attached photo"}
              style={{ display: "block", width: "100%", maxWidth: 300, maxHeight: 300, objectFit: "cover", cursor: "zoom-in" }}
            />
          </a>
          {m.text && (
            <p style={{ padding: "8px 12px", fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.ink, lineHeight: 1.45, overflowWrap: "anywhere" }}>{m.text}</p>
          )}
        </MessageRow>
      );
    }

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

    // AI-agent replies only exist in the /preview demo data.
    if (isAI) {
      return (
        <div key={i} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <div style={{ maxWidth: "72%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4, justifyContent: "flex-end", marginRight: 2 }}>
              <Sparkles size={10} style={{ color: C.ai }}/>
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.ai, letterSpacing: "0.05em" }}>AI AGENT (YOU)</span>
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 16, borderBottomRightRadius: 4, background: C.aiMist, color: C.ink, border: "1px solid " + C.ai + "25", fontFamily: F.body, fontSize: 14, fontWeight: 500, lineHeight: 1.5, overflowWrap: "anywhere" }}>{m.text}</div>
            <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash, marginTop: 3, textAlign: "right", marginRight: 2 }}>{m.time}</p>
          </div>
        </div>
      );
    }

    return (
      <MessageRow key={i} {...rowProps}>
        {(m.type === "offer" || m.type === "counter") && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, paddingBottom: 6, borderBottom: "1px solid " + (isYou ? C.green + "33" : C.fawn), color: isYou ? C.greenDeep : C.amberDeep }}>
            {m.type === "offer" ? <DollarSign size={12} aria-hidden="true"/> : <RefreshCw size={12} aria-hidden="true"/>}
            <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {m.type === "offer" ? "Offer" : "Counter offer"}
              {m.amount && " · $" + m.amount}
            </span>
          </div>
        )}
        {m.text}
      </MessageRow>
    );
  }

  return (
    // Fills the content area instead of being a 1160px card inside it: a
    // column whose header is fixed and whose panes take the remaining height.
    // `minHeight: 0` on the children is what lets them scroll rather than
    // stretching this container past the viewport.
    <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Page header — hidden on mobile when inside a thread so the conversation gets full screen */}
      {(!isMobile || !mobileViewingId) && (
      <div style={{ padding: isMobile ? "12px 16px 8px" : "16px 28px 10px", position: "relative", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 16 }}>
          <div style={{ width: isMobile ? 42 : 48, height: isMobile ? 42 : 48, borderRadius: isMobile ? 12 : 14, background: C.aiMist, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, boxShadow: "0 2px 0 " + C.fawn }}>
            <MessageSquare size={isMobile ? 18 : 20} style={{ color: C.ai }} strokeWidth={2.2}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: F.head, fontSize: isMobile ? 24 : 30, fontWeight: 900, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 4 }}>Conversations</h1>
            <p style={{ fontFamily: F.body, fontSize: isMobile ? 12.5 : 14, fontWeight: 500, color: C.mink, lineHeight: 1.45, maxWidth: 560 }}>
              {needsAction > 0 ? needsAction + " need" + (needsAction === 1 ? "s" : "") + " your attention · " : ""}
              {unreadCount > 0 ? unreadCount + " unread · " : ""}
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>
      )}

      {/* Success toast — celebration banner when an offer/counter is accepted. */}
      {successMsg && (
        <div role="status" className="fade-in" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: C.greenMist, border: "1px solid " + C.green + "44", margin: isMobile ? "0 16px 12px" : "0 28px 12px", flexShrink: 0, boxShadow: "0 2px 0 " + C.green + "20" }}>
          <CheckCircle size={18} style={{ color: C.greenDeep }}/>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.greenDeep, fontFamily: F.body, flex: 1 }}>{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={14} style={{ color: C.greenDeep }}/></button>
        </div>
      )}

      {/* Error toast */}
      {errorMsg && (
        <div role="alert" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, backgroundColor: C.claretMist, border: "1px solid " + C.claret + "33", margin: isMobile ? "0 16px 12px" : "0 28px 12px", flexShrink: 0 }}>
          <AlertCircle size={18} style={{ color: C.claret }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: C.claret, fontFamily: F.body, flex: 1 }}>{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={14} style={{ color: C.claret }} /></button>
        </div>
      )}

      {/* Loading indicator while inbox fetches */}
      {usingBackend && loading && (
        <div style={{ padding: 40, textAlign: "center", flexShrink: 0 }}>
          <p style={{ fontSize: 13, color: C.ash, fontFamily: F.body }}>Loading conversations…</p>
        </div>
      )}

      {/* Filters live in the inbox header as tabs (All / Unread / Active
          Claims / Archived). Unlike the All / Claims / Offers / Q&A chips
          BUG-088 removed (they read a `type` the adapter hardcodes), they
          filter on real data: the unread count and the claims API. */}

      <div style={{
        display: isMobile ? "flex" : "grid",
        flexDirection: isMobile ? "column" : undefined,
        gridTemplateColumns: isMobile ? undefined : "380px 1fr",
        // No gap and no outer border on desktop: the two panes meet at the
        // list's own borderRight, the way a mail client reads. The 20px gap
        // and rounded 1.5px frame made this look like a widget dropped onto
        // a page rather than the page itself.
        gap: 0,
        // Fills whatever height is left under the header instead of a fixed
        // 680px box with dead white space beneath it. `minHeight: 0` lets it
        // shrink below its content so the panes inside scroll.
        flex: "1 1 auto",
        minHeight: 0,
        borderTop: "1px solid " + C.fawn,
        overflow: "hidden",
        background: C.paper,
      }}>
        {/* Conversation list — hidden on mobile when inside a thread */}
        {(!isMobile || !mobileViewingId) && (
        <div style={{
          // The only divider between the two panes now that the outer frame
          // is gone. Mobile keeps neither — the list IS the screen there.
          borderRight: isMobile ? "none" : "1px solid " + C.fawn,
          overflowY: "auto",
          minHeight: 0,
          background: C.paper,
        }}>
          <MessagesInboxHeader
            title="Inbox"
            tabs={INBOX_TABS}
            activeTab={inboxTab}
            onTabChange={setInboxTab}
            panelId={listPanelId}
            searchOpen={searchOpen}
            onSearchOpenChange={setSearchOpen}
            query={threadQuery}
            onQueryChange={setThreadQuery}
            compact={isMobile}
          />

          <div id={listPanelId} role="tabpanel" aria-labelledby={tabDomId(listPanelId, inboxTab)}>
            {visibleThreads.map(c => renderThreadRow(c))}

            {visibleThreads.length === 0 && (() => {
              // Say why the list is empty: the search, the tab, or the inbox.
              const empty = searching
                ? { title: "No conversations match “" + threadQuery.trim() + "”.", hint: inboxTab === "all" ? "Try another word, or look in Archived." : "Try All, or another word." }
                : inboxTab === "unread" ? { title: "You're all caught up.", hint: "No unread messages." }
                : inboxTab === "claims" ? { title: "No active claims.", hint: "Offers and accepted claims show up here." }
                : inboxTab === "archived" ? { title: archivedLoading ? "Checking your archive…" : "Nothing archived.", hint: archivedLoading ? "" : "Archive a finished conversation from its ⋮ menu." }
                : { title: "No conversations yet.", hint: "When buyers message you about your items, they show up here." };
              return (
                <div style={{ padding: "36px 20px", textAlign: "center" }}>
                  {searching ? <Search size={24} style={{ color: C.smoke, marginBottom: 8 }} aria-hidden="true"/> : <MessageSquare size={24} style={{ color: C.smoke, marginBottom: 8 }} aria-hidden="true"/>}
                  <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.mink }}>{empty.title}</p>
                  {empty.hint && <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.ash, marginTop: 2 }}>{empty.hint}</p>}
                </div>
              );
            })()}
          </div>
        </div>
        )}

        {active && (!isMobile || mobileViewingId) && (
          <div style={{
            display: "flex", flexDirection: "column", minWidth: 0,
            background: C.paper,
            overflow: "hidden",
            // Desktop: a grid item stretches to the row height on its own.
            // Mobile: fill the flex parent rather than the old hardcoded
            // `calc(100vh - 200px)`, which guessed at the chrome above it and
            // left a gap whenever it guessed wrong.
            flex: isMobile ? "1 1 auto" : undefined,
            minHeight: 0,
          }}>
            {isMobile && (
              <button onClick={() => setMobileViewingId(null)} style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 44, padding: "10px 14px", border: "none", borderBottom: "1px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                <ArrowLeft size={14} aria-hidden="true"/> All conversations
              </button>
            )}
            {/* Thread header: photo, title, price, buyer, claim pill, ⋮ menu. */}
            <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", borderBottom: "1px solid " + C.fawn, display: "flex", alignItems: "center", gap: isMobile ? 10 : 14 }}>
              <ConversationItemThumb item={active.item} size={isMobile ? 48 : 56} emojiSize={isMobile ? 28 : 32}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontFamily: F.head, fontSize: isMobile ? 15 : 17, fontWeight: 800, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.item.title}</h2>
                <div style={{ display: "flex", alignItems: "center", columnGap: isMobile ? 8 : 10, rowGap: 4, marginTop: 3, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: F.head, fontSize: isMobile ? 15 : 17, fontWeight: 900, color: priceColor(active.item.price, C.green) }}>{priceText(active.item.price)}</span>
                  <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.mink, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <UserAvatar avatar={active.buyer.avatar} name={active.buyer.name} size={22} decorative initialsBg={avatarBg(active.buyer.name)} fontFamily={F.head} fontSize={9}/>
                    {activeBuyerName}{!isMobile && active.buyer.hood && active.buyer.hood !== "—" ? " · " + active.buyer.hood : ""}
                  </span>
                  {(() => {
                    // Buyer-tier badge based on prior PICKED_UP claims between us.
                    // Friend > 3+ prior (Regular) > 1-2 prior (Repeat) > none (First-time).
                    const pp = active.buyer.previousPurchases || 0;
                    const badge = (bg, color, content) => (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.head, fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: bg, color, letterSpacing: "0.04em", textTransform: "uppercase" }}>{content}</span>
                    );
                    if (active.buyer.isFriend) return badge(C.greenMist, C.greenDeep, <><Heart size={9} strokeWidth={2.4} aria-hidden="true"/> Friend</>);
                    if (pp >= 3) return badge(C.amberMist, C.amberDeep, <><Star size={9} fill={C.amberDeep} strokeWidth={0} aria-hidden="true"/> Regular · {pp} prior</>);
                    if (pp >= 1) return badge(C.tealMist, C.teal, <><RefreshCw size={9} strokeWidth={2.4} aria-hidden="true"/> Repeat · {pp} prior</>);
                    return badge(C.sand, C.mink, "First-time");
                  })()}
                  {isMobile && <ClaimStatusPill pill={pillFor(active)}/>}
                </div>
              </div>
              {!isMobile && <ClaimStatusPill pill={pillFor(active)} size="md"/>}
              {usingBackend && (
                <ThreadMenu
                  key={active.id}
                  label="Conversation options"
                  items={[
                    ...(active.itemId ? [{ id: "view", label: "View item", icon: <ExternalLink size={16}/>, href: "/item/" + encodeURIComponent(active.itemId) }] : []),
                    activeIsArchived
                      ? { id: "unarchive", label: "Unarchive", icon: <RefreshCw size={16}/>, onSelect: () => unarchiveThread(active) }
                      // Not while a claim is live: archiving a pickup the seller
                      // has to show up for would hide where it's coordinated.
                      : { id: "archive", label: "Archive", icon: <Archive size={16}/>, onSelect: () => archiveThread(active), disabled: !!activeClaimByConv[active.id], hint: activeClaimByConv[active.id] ? "Finish or decline the claim first" : undefined },
                    { id: "report", label: "Report " + activeBuyerName, icon: <Flag size={16}/>, onSelect: () => setReportOpen(true), danger: true },
                  ]}
                />
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

            {/* Offer / claim banner (components/messages/OfferBanner). The
                seller answers only when the BUYER set the current amount
                (BUG-055.1); otherwise they wait, and can still decline. */}
            {usingBackend && active && activeClaimByConv[active.id] && (() => {
              const pc = activeClaimByConv[active.id];
              return (
                <OfferBanner
                  role="seller"
                  claim={{
                    id: pc.id, status: pc.status, amount: pc.amount,
                    listed: pc.item?.price ?? active.item.price ?? 0,
                    expiresAt: pc.expiresAt, myTurn: pc.status === "PROPOSED" && pc.lastAmountBy !== myId,
                    buyerConfirmedReceiptAt: pc.buyerConfirmedReceiptAt, pickupSlot: pc.pickupSlot, createdAt: pc.createdAt,
                  }}
                  otherName={activeBuyerName}
                  busy={chatBusyClaimId === pc.id}
                  onAccept={() => chatAccept(pc)}
                  onCounter={(amt) => chatCounterSubmit(pc, amt)}
                  onDecline={() => chatDecline(pc)}
                  onMarkPickedUp={() => setConfirmChatPickup({
                    claim: pc,
                    buyer: activeBuyerName,
                    item: {
                      t: pc.item?.title || active.item.title,
                      photos: Array.isArray(pc.item?.photos) ? pc.item.photos.filter(Boolean) : [],
                      e: CATEGORY_EMOJI[pc.item?.category] || "\u{1F4E6}",
                      cat: ENUM_TO_CATEGORY_LABEL[pc.item?.category] || "",
                      price: typeof pc.amount === "number" ? pc.amount : pc.item?.price,
                    },
                  })}
                  compact={isMobile}
                />
              );
            })()}

            {/* `minHeight: 0` is what makes this the pane that scrolls. A flex
                child defaults to min-height:auto, so without it the message
                list grows to its content and pushes the composer off the
                bottom instead of scrolling inside its own box. Messages get a
                day marker before each new (Toronto) day. */}
            <div ref={threadScroll.ref} onScroll={threadScroll.onScroll} role="log" aria-live="polite" aria-label="Conversation" style={{ flex: 1, minHeight: 0, padding: isMobile ? "14px 14px" : "18px 20px", overflowY: "auto", overflowX: "hidden", background: C.paper }}>
              {usingBackend && activeLoading && (
                <p style={{ fontSize: 12, color: C.ash, fontFamily: F.body, textAlign: "center", padding: "20px 0" }}>Loading thread…</p>
              )}
              {!activeLoading && activeMessages.length === 0 && usingBackend && (
                <p style={{ fontSize: 12, color: C.ash, fontFamily: F.body, textAlign: "center", padding: "20px 0" }}>No messages yet — say hello.</p>
              )}
              {withDaySeparators(activeMessages, (m) => m.sentAt).map((entry) => (
                "separator" in entry
                  ? <DateSeparator key={entry.key} label={entry.separator}/>
                  : renderMessage(entry.message, entry.message.id || entry.index)
              ))}
              <NewMessagesPill count={threadScroll.newCount} onClick={threadScroll.jumpToLatest}/>
            </div>

            {/* Quick-reply templates — covers the 80% of routine replies in one tap.
                Tapping populates the draft input (instead of sending) so the seller
                can tweak before sending. */}
            <div style={{ borderTop: "1px solid " + C.fawn, background: C.paper, flexShrink: 0 }}>
              {/* Chips wrap on desktop instead of scrolling off the edge. The
                  row was overflowX:auto with the scrollbar hidden, so the
                  last template ("Last price is $X") was simply cut in half
                  against the panel edge with nothing to say it was there. On
                  mobile a horizontal swipe is natural, so scrolling stays —
                  with trailing padding so the last chip clears the edge. */}
              <div style={{
                display: "flex",
                flexWrap: isMobile ? "nowrap" : "wrap",
                gap: 6,
                padding: isMobile ? "10px 12px 0" : "12px 16px 0",
                overflowX: isMobile ? "auto" : "visible",
                scrollbarWidth: "none",
              }}>
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
            <>
            {/* You removed the listing: the buyer sees "no longer available";
                you can still message each other, but no offers or claims. */}
            {active.item?.status === "REMOVED" && (
              <div role="note" style={{ padding: "10px 16px", borderTop: "1px solid " + C.fawn, background: C.sand, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={15} style={{ color: C.mink, flexShrink: 0 }} aria-hidden="true"/>
                <p style={{ fontFamily: F.body, fontSize: 12.5, fontWeight: 600, color: C.ink }}>You removed this listing. The buyer sees it&apos;s no longer available; you can still message each other here.</p>
              </div>
            )}
            {/* Staged photo, waiting on send — same contract as the buyer
                composer: picking shows it, send shares it. */}
            {pendingAttachment && (
              <div style={{ padding: isMobile ? "10px 12px 0" : "12px 16px 0", display: "flex", alignItems: "center", gap: 10, background: C.paper }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 6, paddingRight: 12, borderRadius: 14, border: "1px solid " + C.fawn, background: C.sand, minWidth: 0 }}>
                  <img src={pendingAttachment.previewUrl} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0, display: "block" }}/>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pendingAttachment.name}</p>
                    <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink }}>
                      {attachBusy ? "Sending…" : `${(pendingAttachment.size / 1024).toFixed(0)} KB · press send to share`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearPendingAttachment}
                    disabled={attachBusy}
                    title="Remove attachment"
                    aria-label="Remove attachment"
                    style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: C.paper, color: C.mink, display: "flex", alignItems: "center", justifyContent: "center", cursor: attachBusy ? "not-allowed" : "pointer", flexShrink: 0 }}
                  >
                    <X size={13} strokeWidth={2.6}/>
                  </button>
                </div>
              </div>
            )}
            <div style={{ position: "relative", padding: isMobile ? "10px 12px" : "12px 16px", display: "flex", gap: isMobile ? 8 : 10, alignItems: "center", background: C.paper }}>
              {/* Hidden input driven by the clip button, so the control looks
                  like the rest of the composer rather than a browser file
                  widget. Resetting value lets the same file be picked twice. */}
              <input
                ref={chatFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; stageAttachment(f); }}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => chatFileInputRef.current?.click()}
                disabled={attachBusy || sending}
                title="Attach a photo"
                aria-label="Attach a photo"
                style={{ width: 40, height: 40, flexShrink: 0, borderRadius: "50%", border: "none", background: "transparent", color: (attachBusy || sending) ? C.smoke : C.mink, display: "flex", alignItems: "center", justifyContent: "center", cursor: (attachBusy || sending) ? "not-allowed" : "pointer", flexShrink: 0 }}
              >
                {attachBusy
                  ? <Loader2 size={17} className="animate-spin"/>
                  : <Paperclip size={17}/>}
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                aria-label="Message"
                className="dy-field"
                placeholder={"Reply to " + active.buyer.name.split(" ")[0] + "..."}
                disabled={sending}
                style={{ flex: 1, minWidth: 0, minHeight: 44, padding: isMobile ? "9px 12px" : "10px 14px", borderRadius: 999, border: "1.5px solid " + C.smoke, fontFamily: F.body, fontSize: isMobile ? 16 : 14, fontWeight: 500, color: C.ink, background: C.paper }}
              />
              <button
                type="button"
                onClick={() => setEmojiOpen(v => !v)}
                title="Insert an emoji"
                aria-label="Insert an emoji"
                aria-expanded={emojiOpen}
                style={{ width: 40, height: 40, flexShrink: 0, borderRadius: "50%", border: "none", background: emojiOpen ? C.sand : "transparent", color: emojiOpen ? C.amberDeep : C.mink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              >
                <Smile size={isMobile ? 17 : 19}/>
              </button>
              {emojiOpen && (
                <ChatEmojiTray
                  onPick={(em) => setDraft(d => d + em)}
                  onClose={() => setEmojiOpen(false)}
                  colors={{ paper: C.paper, fawn: C.fawn, sand: C.sand, mink: C.mink, accent: C.amberDeep }}
                  style={{ right: isMobile ? 12 : 16, bottom: "calc(100% + 6px)" }}
                />
              )}
              {!usingBackend && (
                <button title="Let AI respond" disabled style={{ width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, borderRadius: "50%", border: "1.5px solid " + C.ai + "30", background: C.aiMist, cursor: "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: 0.5 }}>
                  <Sparkles size={isMobile ? 14 : 16} style={{ color: C.ai }}/>
                </button>
              )}
              <button onClick={handleSend} disabled={sending || attachBusy || (!draft.trim() && !pendingAttachment)} aria-label="Send message" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: "50%", border: "none", background: C.green, color: "#fff", cursor: (sending || attachBusy || (!draft.trim() && !pendingAttachment)) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 0 " + C.greenDeep, flexShrink: 0, opacity: (sending || attachBusy || (!draft.trim() && !pendingAttachment)) ? 0.5 : 1 }}>
                {sending || attachBusy
                  ? <Loader2 size={isMobile ? 14 : 16} className="animate-spin"/>
                  : <Send size={isMobile ? 14 : 16}/>}
              </button>
            </div>
            </>
            )}
            </div>
          </div>
        )}
        {reportOpen && active && (
          <ReportDialog
            kind="user"
            subject={activeBuyerName}
            onSubmit={submitReport}
            onClose={() => setReportOpen(false)}
          />
        )}
        {confirmChatPickup && (
        <PickupConfirmDialog kind="pickup" item={confirmChatPickup.item} buyer={confirmChatPickup.buyer} isMobile={isMobile} onCancel={() => setConfirmChatPickup(null)} onConfirm={() => { const c = confirmChatPickup.claim; setConfirmChatPickup(null); chatMarkPickedUp(c); }}/>
      )}
      {rateClaim && (
          <RateBuyerModal
            title="Item Picked Up!"
            subtitle={(rateClaim.item?.title || "The item") + " — picked up by " + (rateClaim.buyer?.name || "the buyer")}
            buyerName={rateClaim.buyer?.name}
            stars={rateStars} setStars={setRateStars}
            note={rateNote} setNote={setRateNote}
            onSubmit={() => submitChatRating({ skip: false })}
            onSkip={() => submitChatRating({ skip: true })}
          />
        )}
        {/* Desktop, nothing selected: say so, and how much is unread.
            Phones show the list on its own until a thread is tapped. */}
        {!active && !isMobile && (!usingBackend || !loading) && (
          <ThreadEmptyState
            empty={conversations.length === 0 && archivedList.length === 0}
            emptyHint="When buyers message you about your items, conversations will appear here."
            unreadCount={unreadCount}
            onShowUnread={() => setInboxTab("unread")}
          />
        )}
      </div>
    </div>
  );
}

/* ============================== SELLER HISTORY ============================== */
// Hoisted out of SellerHistoryView so it has a stable component identity
// across renders. Without this, every collapse toggle remounted all rows
// and replayed the fade-in animation, which looked like the list was refreshing.
function HistoryTxRow({ tx, idx, isMobile = false, isOpen = false, onToggle = null, onRateBuyer = null, accessToken = null }) {
  // Asking is set by adaptHistory (originalPrice) or in demo data; treat any
  // value <= sold price as "no discount" so we don't show a misleading "$80 → $80".
  const wasDiscounted = typeof tx.asking === "number" && tx.asking > tx.price;
  const handleToggle = () => onToggle && onToggle(tx.id);
  const SoldViaIcon = tx.layer === "drop" ? Calendar : Package;
  const panelId = "sale-details-" + tx.id;

  // A row inside its month card (components/history/HistoryParts.tsx), laid
  // out like the buyer's Purchase history: picture, type badge before the
  // title, buyer / neighbourhood / date, the buyer's stars, price on the
  // right. The whole row opens the details panel under it.
  return (
    <article style={{ borderTop: "1px solid " + C.fawn, background: isOpen ? C.sand : "transparent", transition: "background 150ms" }}>
      <div
        role={onToggle ? "button" : undefined}
        tabIndex={onToggle ? 0 : undefined}
        aria-expanded={onToggle ? isOpen : undefined}
        aria-controls={onToggle && isOpen ? panelId : undefined}
        onClick={handleToggle}
        onKeyDown={e => { if (onToggle && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); handleToggle(); } }}
        style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 14 : 18, padding: isMobile ? "14px 16px" : "16px 22px", cursor: onToggle ? "pointer" : "default" }}
      >
        <HistoryThumb photo={Array.isArray(tx.photos) ? tx.photos.find(Boolean) : null} fallback={tx.img} layer={tx.layer} isMobile={isMobile}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
            <TypeBadge layer={tx.layer}/>
            <p style={{ fontFamily: F.head, fontSize: isMobile ? 16 : 19, fontWeight: 800, color: C.ink, letterSpacing: "-0.015em", minWidth: 0, overflowWrap: "anywhere" }}>{tx.title}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16, rowGap: 4, flexWrap: "wrap", fontFamily: F.body, fontSize: isMobile ? 12.5 : 13.5, fontWeight: 600, color: C.mink }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><UserAvatar avatar={tx.buyerAvatar} name={tx.buyer} size={20} decorative initialsBg={avatarBg(tx.buyer)} fontFamily={F.head} fontSize={8}/> {tx.buyer}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13} aria-hidden="true"/> {tx.hood}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={13} aria-hidden="true"/> {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
          {tx.rating > 0 && (
            <div role="img" aria-label={"Rated " + tx.rating + " out of 5 by " + tx.buyer} style={{ display: "flex", gap: 3, marginTop: 8 }}>
              {[1,2,3,4,5].map(n => <Star key={n} size={15} aria-hidden="true" style={{ color: n <= tx.rating ? C.amber : C.fawn }} fill={n <= tx.rating ? C.amber : "none"} strokeWidth={n <= tx.rating ? 0 : 1.5}/>)}
            </div>
          )}
          {isMobile && (
            <p style={{ fontFamily: F.head, fontSize: 22, fontWeight: 900, color: priceColor(tx.price, C.green), letterSpacing: "-0.02em", marginTop: 8 }}>{priceText(tx.price)}</p>
          )}
        </div>
        {!isMobile && (
          <span style={{ fontFamily: F.head, fontSize: 27, fontWeight: 900, color: priceColor(tx.price, C.green), letterSpacing: "-0.02em", flexShrink: 0 }}>{priceText(tx.price)}</span>
        )}
        {onToggle && <ChevronDown size={20} aria-hidden="true" style={{ color: C.mink, flexShrink: 0, alignSelf: "center", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}/>}
      </div>

      {/* Expanded detail panel — Sold via, Asking → sold delta, optional buyer review. */}
      {isOpen && (
        <div id={panelId} style={{ margin: isMobile ? "0 16px 14px" : "0 22px 16px", paddingTop: 12, borderTop: "1px dashed " + C.fawn, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: isMobile ? 10 : 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <SoldViaIcon size={11} aria-hidden="true" style={{ color: C.mink }}/>
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase" }}>Sold via</span>
            </div>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>{tx.layer === "drop" ? "Saturday Drop" : "Shelf (anytime)"}</p>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <DollarSign size={11} aria-hidden="true" style={{ color: C.mink }}/>
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase" }}>Asking &rarr; sold</span>
            </div>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>
              {wasDiscounted ? ("$" + tx.asking + " → $" + tx.price) : ("$" + tx.price + " (full asking)")}
            </p>
          </div>
          {tx.review && (
            <div style={{ gridColumn: "1 / -1", padding: "10px 12px", borderRadius: 10, background: C.paper, border: "1px solid " + C.fawn }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <MessageSquare size={11} aria-hidden="true" style={{ color: C.greenDeep }} strokeWidth={2.3}/>
                <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.greenDeep, letterSpacing: "0.06em", textTransform: "uppercase" }}>{tx.buyer.split(" ")[0]}&rsquo;s review</span>
              </div>
              <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.ink, lineHeight: 1.5, fontStyle: "italic" }}>
                &ldquo;{tx.review}&rdquo;
              </p>
            </div>
          )}
          {/* BUG-055 — Rate buyer CTA. Surfaces only on real claims (not demo
              rows) and only when the seller hasn't already rated. */}
          {accessToken && onRateBuyer && tx.id && typeof tx.id === "string" && tx.id.length > 8 && !tx.sellerRated && (
            <div style={{ gridColumn: "1 / -1", padding: "10px 12px", borderRadius: 10, background: C.amberMist, border: "1px solid " + C.amber + "30" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.amberDeep, letterSpacing: "0.02em" }}>Rate {tx.buyer.split(" ")[0]}</p>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, marginTop: 2 }}>Help other sellers — what was the buyer like?</p>
                </div>
                {/* Same look as the buyer's "Leave review": amber outline,
                    amber-deep text (white on amber was 2.2:1). */}
                <button onClick={() => onRateBuyer(tx)} style={{ minHeight: 40, padding: "8px 16px", borderRadius: 999, border: "1.5px solid " + C.amber, background: C.paper, color: C.amberDeep, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                  <Star size={14} aria-hidden="true"/> Rate buyer
                </button>
              </div>
            </div>
          )}
          {tx.sellerRated && tx.sellerRating > 0 && (
            <div style={{ gridColumn: "1 / -1", padding: "8px 12px", borderRadius: 10, background: C.greenMist, border: "1px solid " + C.green + "20", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.greenDeep, letterSpacing: "0.04em", textTransform: "uppercase" }}>You rated {tx.buyer.split(" ")[0]}</span>
              <div role="img" aria-label={tx.sellerRating + " out of 5"} style={{ display: "flex", gap: 1 }}>
                {[1,2,3,4,5].map(n => <Star key={n} size={11} aria-hidden="true" style={{ color: n <= tx.sellerRating ? C.amber : C.fawn }} fill={n <= tx.sellerRating ? C.amber : "none"}/>)}
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
    { id: "h3", title: "Yoga Mat Set",            price: 15,  asking: 15, img: "\uD83E\uDDD8", cat: "Fitness & Exercise Equipment",        buyer: "Mark T.",     hood: "Barrhaven",      date: "2026-04-06", layer: "shelf",     rating: 4 },
    { id: "h4", title: "Kitchen Mixer",           price: 65,  asking: 80, img: "\uD83E\uDDC1", cat: "Appliances & Kitchen",    buyer: "Jess B.",     hood: "Half Moon Bay",  date: "2026-04-06", layer: "drop",      rating: 5, review: "Works beautifully, super friendly seller." },
    { id: "h5", title: "Garden Tools Lot",        price: 40,  asking: 40, img: "\uD83C\uDF31", cat: "Tools & Garden",          buyer: "Omar K.",     hood: "Stonebridge",    date: "2026-03-22", layer: "drop",      rating: 5 },
    { id: "h6", title: "Bookshelf Pine 5-tier",   price: 35,  asking: 50, img: "\uD83D\uDCDA", cat: "Furniture",               buyer: "Claire Y.",   hood: "Barrhaven",      date: "2026-03-15", layer: "shelf",     rating: 4 },
    { id: "h7", title: "Winter Coats Bundle",     price: 30,  asking: 30, img: "\uD83E\uDDE5", cat: "Clothing & Accessories",  buyer: "Nina S.",     hood: "Barrhaven East", date: "2026-02-22", layer: "drop",      rating: 5, review: "Coats are perfect for my kids, thank you!" },
    { id: "h8", title: "Kids Toy Kitchen Set",    price: 55,  asking: 55, img: "\uD83C\uDF73", cat: "Toys & Games",             buyer: "Ada R.",      hood: "Barrhaven",      date: "2025-12-14", layer: "drop",      rating: 5 },
    { id: "h9", title: "Christmas Decor Lot",     price: 25,  asking: 25, img: "\uD83C\uDF84", cat: "Seasonal & Holiday Items",                   buyer: "Mia L.",      hood: "Bridlewood",     date: "2025-12-14", layer: "drop",      rating: 4 },
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
  // The form is the shared ReviewForm (stars + optional message), the one
  // buyers use. A refusal stays in the form, with what was typed.
  const [rateTx, setRateTx]       = useState(null);
  const openRateBuyer = (tx) => setRateTx(tx);
  const cancelRate    = () => setRateTx(null);
  const submitRate    = async (rating, text) => {
    const tx = rateTx;
    if (!tx) return;
    await apiRequest("/api/claims/" + encodeURIComponent(tx.id) + "/review", {
      method: "POST",
      token:  accessToken,
      body:   JSON.stringify(text ? { rating, text } : { rating }),
    });
    setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, sellerRated: true, sellerRating: rating } : t));
    setRateTx(null);
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
      // /api/claims/incoming already returns the item's resolved photos; this
      // adapter went straight to the category emoji and dropped them, so every
      // completed sale in History showed a generic box. `img` stays as the
      // fallback for items that genuinely have no photo.
      photos: Array.isArray(api.item?.photos) ? api.item.photos.filter(Boolean) : [],
      img:    CATEGORY_EMOJI[api.item?.category] || "\u{1F4E6}",
      cat:    ENUM_TO_CATEGORY_LABEL[api.item?.category] || "Other",
      buyer:  api.buyer?.name || "Buyer",
      buyerAvatar: api.buyer?.avatar || null,
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
  // Only sales the buyer rated: an unrated sale has rating 0 and would drag
  // the average down (5 + 4 + unrated is 4.5, not 3.0).
  const avgRating = averageRating(transactions);
  const co2Kg = Math.round(totalItems * 2.5);

  const grouped = {};
  newestFirst(transactions).forEach(t => {
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
    { label: "Avg rating",    value: avgRating ?? "—",    icon: Star,        color: C.amberDeep, bg: C.amberMist, ...(avgRating ? {} : { sub: "No ratings yet" }) },
    { label: "Drops / Shelf", value: transactions.filter(t=>t.layer==="drop").length + "/" + transactions.filter(t=>t.layer==="shelf").length, icon: Package, color: C.green, bg: C.greenMist },
  ];

  // TxRow lives at module scope (see HistoryTxRow below).
  // Hoisting it out of this component prevents React from remounting every
  // row on state changes (collapse toggles), which used to retrigger the
  // fade-in animation and looked like the page was refreshing.

  return (
    <div className="fade-in" style={{ maxWidth: isMobile ? "100%" : 1160, margin: "0 auto" }}>
      {!embedded && (
        <PageHeader icon={Award} isMobile={isMobile} title="Sales history" subtitle={totalItems + " completed sale" + (totalItems !== 1 ? "s" : "") + " across Drops and the Shelf."}/>
      )}

      {/* Error toast */}
      {errorMsg && (
        <div role="alert" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, backgroundColor: C.claretMist, border: "1px solid " + C.claret + "33", marginBottom: 16 }}>
          <AlertCircle size={18} aria-hidden="true" style={{ color: C.claret }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: C.claret, fontFamily: F.body, flex: 1 }}>{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={14} style={{ color: C.claret }} /></button>
        </div>
      )}

      {/* Stats — the same tiles as the buyer's Purchase history. */}
      <StatGrid stats={stats} isMobile={isMobile}/>

      {/* Loading */}
      {loading && (
        <div role="status" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: C.mink, fontFamily: F.body }}>Loading sales history…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && totalItems === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center", borderRadius: 18, border: "1px solid " + C.fawn, background: C.paper }}>
          <Award size={32} aria-hidden="true" style={{ color: C.smoke, marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: C.ink, fontFamily: F.head }}>No sales yet</p>
          <p style={{ fontSize: 13, color: C.mink, marginTop: 4, fontFamily: F.body }}>Once a buyer picks up an item from you, it&apos;ll show up here.</p>
        </div>
      )}

      {/* Timeline — one card per month, newest first, like the buyer's
          Purchase history: "October 2026" with the month's count and revenue,
          its sales stacked under it. The year loop only keeps the ordering. */}
      {!loading && totalItems > 0 && years.map(year => Object.keys(grouped[year]).map(month => {
        const monthKey = year + "-" + month;
        const monthTxs = grouped[year][month];
        const monthRev = monthTxs.reduce((a, t) => a + t.price, 0);
        return (
          <MonthGroup
            key={monthKey}
            isMobile={isMobile}
            title={month + " " + year}
            collapsed={!!collapsed[monthKey]}
            onToggle={() => toggleCollapse(monthKey)}
            summary={<>
              <span>{monthTxs.length} sale{monthTxs.length !== 1 ? "s" : ""}</span>
              <Dot/>
              <span style={{ fontFamily: F.head, fontWeight: 800, color: C.greenDeep }}>${monthRev} earned</span>
            </>}
          >
            {monthTxs.map((tx, idx) => <HistoryTxRow key={tx.id} tx={tx} idx={idx} isMobile={isMobile} isOpen={expandedIds.has(tx.id)} onToggle={toggleExpand} onRateBuyer={openRateBuyer} accessToken={accessToken}/>)}
          </MonthGroup>
        );
      }))}

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
        <ModalPortal>
        <div onClick={cancelRate} style={{ position: "fixed", inset: 0, background: "rgba(11,47,32,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.modal, padding: 16 }}>
          <ModalA11y label={"Rate " + rateTx.buyer} onClose={cancelRate}/>
          <div className={DIALOG_PANEL} onClick={e => e.stopPropagation()} style={{ background: C.paper, borderRadius: 20, padding: 24, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(11,47,32,0.25)" }}>
            <h3 style={{ fontFamily: F.head, fontSize: 20, fontWeight: 900, color: C.ink, marginBottom: 12 }}>Rate {rateTx.buyer}</h3>
            <ReviewForm
              variant="dialog"
              prompt={"How was the transaction with " + rateTx.buyer + "?"}
              onSubmit={submitRate}
              onCancel={cancelRate}
            />
          </div>
        </div>
        </ModalPortal>
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

  // Lifecycle pill — mirrors MyItemsView's logic (a pending sale first).
  const dropIsLive = false;
  const salePending = isPickupPending(item);
  const lifecycle =
    salePending ? "claimed" :
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
    claimed: { label: "Claimed · pickup pending",     bg: C.aiMist,    color: C.ai,        border: C.ai + "40" },
  }[lifecycle];
  const editReasonId = "item-detail-edit-reason-" + item.id;

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
            onClick={salePending ? undefined : onEdit}
            disabled={salePending}
            aria-describedby={salePending ? editReasonId : undefined}
            className="cta-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", cursor: salePending ? "not-allowed" : "pointer", opacity: salePending ? 0.5 : 1, fontFamily: F.head, fontSize: 13, fontWeight: 800, background: C.green, color: "#fff", boxShadow: "0 2px 0 " + C.greenDeep }}
          >
            Edit item
          </button>
          {salePending && (
            <span id={editReasonId} style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink }}>{SALE_PENDING_REASON}</span>
          )}
        </div>
      </div>

      {/* Title + meta */}
      <div style={{ marginBottom: isMobile ? 14 : 18 }}>
        <h1 style={{ fontFamily: F.head, fontSize: isMobile ? 22 : 30, fontWeight: 900, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.05 }}>{item.t}</h1>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", fontFamily: F.body, fontSize: 13, color: C.mink }}>
          <span style={{ fontFamily: F.head, fontWeight: 900, fontSize: isMobile ? 19 : 22, color: priceColor(item.price, C.green) }}>{priceText(item.price)}</span>
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
                <DetailRow label="Windows" value={selectedPickupWindows(item.raw.pickupWindows).map((w) => w.label + " (" + w.time + ")").join(", ") || item.raw.pickupWindows.join(", ")}/>
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
  const fieldId = useId();
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

  const conds = ["New", "Used - Like New", "Used - Good", "Used - Fair"];

  // ── State (initialised from the editing item) ─────────────────
  const [title, setTitle] = useState(item.t || "");
  const [desc, setDesc] = useState(item.description || item.desc || "");
  // The stored value; older items and demo rows carry only a label.
  const [cat, setCat] = useState(item.catValue || categoryValueFromLabel(item.cat) || "");
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

  // ── Lifecycle pill + advisory note, read the way the inventory reads it ──
  // "Queued" is a backend DRAFT with queuedAt set (isQueued) — the BUG-093
  // rule. It used to be read off the placement alone (publishedTo === "drop",
  // with dropIsLive pinned to false), so an item already LIVE in the Drop was
  // labelled queued while a genuinely queued one showed "Draft".
  // While the Drop is live (or closing) a queued draft is already in it — the
  // buyer feed promotes it on the next browse — so, as in MyItemsView's
  // lifecycleOf, it gets no queued message then. Same phase source as there.
  // A live, reserved or sold Drop listing shows no status message.
  const dropCycle = useDropCycle();
  const dropNow = dropCycle.effectiveNow || new Date();
  const dropPhase = toSellerOverviewPhase(dropCycle, dropNow);
  const dropIsLive = dropPhase === "live" || dropPhase === "closing";
  const lifecycle =
    item.status === "draft" ? (item.isQueued ? (dropIsLive ? null : "queued") : "draft") :
    item.publishedTo === "shelf" ? "shelf" :
    null;
  const lcMeta = {
    draft:  { label: "Draft",                      color: C.ash,       bg: C.sand,      border: C.fawn,         note: null },
    queued: { label: "Queued for Saturday's Drop", color: C.amberDeep, bg: C.amberMist, border: C.amber + "30", note: "This item is queued — edits apply before it goes live Saturday." },
    shelf:  { label: "On the Shelf",               color: C.ink,       bg: C.sand,      border: C.smoke,        note: "This item is on the Shelf. Changes take effect immediately." },
  };
  const meta = lifecycle ? lcMeta[lifecycle] : null;

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
    if (!cat)  { document.getElementById(fieldId + "-cat-field")?.focus(); return setSubmitError("Pick a category."); }
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
          category:      cat || "OTHER",
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
              category:      cat || p.category,
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
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "1px solid " + C.smoke, background: C.paper, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.mink, fontFamily: F.body, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back
      </button>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: C.ink, fontFamily: F.head }}>Edit Item</h2>
        {meta && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.head, fontSize: 10, fontWeight: 900, padding: "5px 12px", borderRadius: 999, background: meta.bg, color: meta.color, letterSpacing: "0.06em", border: "1px solid " + meta.border }}>
            {meta.label}
          </span>
        )}
      </div>

      {meta?.note && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderRadius: 14, background: meta.bg, border: "1px solid " + meta.border, marginBottom: 16 }}>
          <Info size={14} style={{ color: meta.color, flexShrink: 0, marginTop: 2 }}/>
          <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.55 }}>{meta.note}</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.4fr", gap: isMobile ? 16 : 20 }}>
        {/* Left: Photos (S3 upload) */}
        <div>
          <div style={{ padding: isMobile ? 16 : 20, borderRadius: 16, border: "1px solid " + C.fawn, background: C.paper, marginBottom: 14 }}>
            <FormHeading title="Photos" hint="Clear, well-lit photos help your item get claimed."/>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <button type="button" onClick={openFilePicker} disabled={submitting}
              style={{ width: "100%", height: 180, borderRadius: 14, border: "2px dashed " + C.smoke, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: submitting ? "not-allowed" : "pointer", background: C.sand, transition: "all 0.2s", opacity: submitting ? 0.6 : 1 }}
              onMouseEnter={e => { if (!submitting) { e.currentTarget.style.borderColor = C.gPrimary; e.currentTarget.style.backgroundColor = C.gLightBg; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.smoke; e.currentTarget.style.backgroundColor = C.sand; }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.gLightBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Camera size={24} style={{ color: C.gPrimary }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: F.body }}>Choose photos to upload</span>
              <span style={{ fontSize: 12, color: C.ash, fontFamily: F.body }}>JPG, PNG up to 10MB each &middot; max {MAX_PHOTOS} photos</span>
            </button>

            {/* Photo thumbnails */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {photos.map((p, idx) => (
                <div key={p.id} style={{ width: 88, height: 88, borderRadius: 12, border: "1.5px solid " + (idx === 0 ? C.amber : C.gPrimary + "30"), backgroundColor: C.gLightBg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                  {p.preview ? (
                    <img src={p.preview} alt={"Photo " + (idx + 1)} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: p.uploading ? 0.5 : 1 }}/>
                  ) : (
                    <Camera size={20} style={{ color: C.gPrimary }}/>
                  )}
                  {p.uploading && (
                    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.gPrimary, fontFamily: F.body, background: "rgba(255,255,255,0.6)" }}>
                      Uploading…
                    </span>
                  )}
                  {!p.uploading && idx === 0 && (
                    <span style={{ position: "absolute", top: 4, left: 4, padding: "2px 6px", borderRadius: 999, background: C.amber, color: C.ink, fontFamily: F.head, fontSize: 10, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      Cover
                    </span>
                  )}
                  {!p.uploading && (
                    <button onClick={() => removePhoto(p.id)} aria-label="Remove photo"
                      style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", backgroundColor: C.claret, border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                      <X size={12} style={{ color: "#fff" }} />
                    </button>
                  )}
                  {!p.uploading && photos.length > 1 && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 4px", background: "rgba(31,29,25,0.55)" }}>
                      <button onClick={() => movePhoto(idx, -1)} disabled={idx === 0} aria-label="Move left"
                        style={{ width: 24, height: 24, borderRadius: 4, border: "none", background: idx === 0 ? "transparent" : "rgba(255,255,255,0.18)", color: "#fff", cursor: idx === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, opacity: idx === 0 ? 0.4 : 1 }}>
                        <ChevronLeft size={11}/>
                      </button>
                      {idx !== 0 ? (
                        <button onClick={() => setAsCover(idx)} aria-label="Set as cover" title="Set as cover"
                          style={{ width: 24, height: 24, borderRadius: 4, border: "none", background: "rgba(240,144,0,0.85)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                          <Star size={10} strokeWidth={2.4}/>
                        </button>
                      ) : <span style={{ width: 24, height: 24 }}/>}
                      <button onClick={() => movePhoto(idx, +1)} disabled={idx === photos.length - 1} aria-label="Move right"
                        style={{ width: 24, height: 24, borderRadius: 4, border: "none", background: idx === photos.length - 1 ? "transparent" : "rgba(255,255,255,0.18)", color: "#fff", cursor: idx === photos.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, opacity: idx === photos.length - 1 ? 0.4 : 1 }}>
                        <ChevronRight size={11}/>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button onClick={openFilePicker} disabled={submitting}
                  style={{ width: 88, height: 88, borderRadius: 12, border: "2px dashed " + C.smoke, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: submitting ? "not-allowed" : "pointer", background: C.paper, gap: 2 }}>
                  <Plus size={16} style={{ color: C.mink }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.mink, fontFamily: F.body }}>Add</span>
                </button>
              )}
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.5, color: C.ash, marginTop: 10, fontFamily: F.body }}>The Cover photo is the first one buyers see. Use the arrows to reorder, or the star to promote. Up to {MAX_PHOTOS} photos.</p>
          </div>
        </div>

        {/* Right: Item details */}
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20, minWidth: 0 }}>
        <section style={formCard(isMobile)}>
          <FormHeading title="Item details" hint="Fields marked * are required."/>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor={fieldId + "-title"} style={FORM_LABEL}>Title *</label>
            <input id={fieldId + "-title"} className="dy-field" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., IKEA KALLAX Bookshelf - White" style={FORM_INPUT} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor={fieldId + "-desc"} style={FORM_LABEL}>Description *</label>
            <textarea id={fieldId + "-desc"} className="dy-field" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe condition, dimensions, what is included..." style={{ ...FORM_INPUT, minHeight: 112, resize: "vertical", lineHeight: 1.5 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16, marginBottom: 16 }}>
            <div>
              <p id={fieldId + "-cat"} style={FORM_LABEL}>Category *</p>
              {/* Compact, searchable selector (feedback point 3): one field that
                  opens a searchable list — a bottom sheet on phones. */}
              <CategorySelect
                id={fieldId + "-cat-field"}
                labelId={fieldId + "-cat"}
                value={cat || null}
                onChange={(v) => { setCat(v); if (submitError === "Pick a category.") setSubmitError(""); }}
                invalid={!cat && submitError === "Pick a category."}
                errorId={fieldId + "-cat-error"}
              />
              {!cat && submitError === "Pick a category." && (
                <p id={fieldId + "-cat-error"} style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.claret, marginTop: 6 }}>Pick a category.</p>
              )}
            </div>
            <div>
              <p id={fieldId + "-cond"} style={FORM_LABEL}>Condition *</p>
              <div role="group" aria-labelledby={fieldId + "-cond"} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {conds.map(c => (
                  <button key={c} type="button" aria-pressed={cond === c} onClick={() => setCond(c)} style={formChip(cond === c)}>{c}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label htmlFor={fieldId + "-price"} style={FORM_LABEL}>Price ($) *</label>
            <input id={fieldId + "-price"} className="dy-field" value={price} onChange={e => setPrice(decimalAmountText(e.target.value))} placeholder="0.00" type="text" inputMode="decimal" autoComplete="off" style={{ ...FORM_INPUT, width: 160, fontWeight: 700 }} />
            <p style={{ fontFamily: F.body, fontSize: 12, color: C.ash, marginTop: 6 }}>Enter 0 for a free giveaway.</p>
          </div>

          </section>

        <section style={formCard(isMobile)}>
          <FormHeading title="Pickup, bundle and payment" hint="Optional. Open only what you need."/>
          {/* Pickup Availability - optional, collapsible (same as ManualItemForm) */}
          <div style={{ marginBottom: 12, borderRadius: 14, border: "1.5px solid " + (showPickup ? C.green + "30" : C.fawn), overflow: "hidden" }}>
            <button type="button" aria-expanded={showPickup} onClick={() => setShowPickup(!showPickup)}
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
                      <button key={m.id} type="button" aria-pressed={on} onClick={() => setPickupMode(m.id)}
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
                        <button key={day} type="button" aria-pressed={sel} onClick={() => togDay(day)}
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
                      <input type="date" aria-label="Pickup date" className="dy-field" min={todayLocalISO()} value={pickupNewDate} onChange={e => { setPickupNewDate(e.target.value); if (pickupDateError) setPickupDateError(""); }}
                        style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.fawn, fontSize: 12, fontFamily: F.body, color: C.ink, background: C.paper, boxSizing: "border-box" }}/>
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
                            <button type="button" aria-label={"Remove " + formatPickupDateLong(d)} onClick={() => setPickupCustom(p => p.filter(x => x !== d))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                              <X size={11} style={{ color: C.greenDeep }}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {pickupDateError && (
                      <p role="alert" style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.claret }}>{pickupDateError}</p>
                    )}
                    {pickupCustom.length === 0 && !pickupDateError && (
                      <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, fontStyle: "italic" }}>Add one or more specific dates when you&apos;ll be available.</p>
                    )}
                  </div>
                )}

                {pickupMode === "anytime" && (
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: C.sand, border: "1px solid " + C.fawn, marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <Info size={13} style={{ color: C.mink, flexShrink: 0, marginTop: 1 }}/>
                    <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>Buyers can request any day. You'll agree a time with the buyer in Messages before the pickup is scheduled.</p>
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
                      <button key={w.id} type="button" aria-pressed={sel} onClick={() => togWin(w.id)}
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
          <div style={{ marginBottom: 12, borderRadius: 14, border: "1.5px solid " + (showBundle ? (C.teal || C.greenDeep) + "30" : C.fawn), overflow: "hidden" }}>
            <button type="button" aria-expanded={showBundle} onClick={() => setShowBundle(!showBundle)}
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
                            className="dy-field"
                            aria-label={"Bundle item " + (idx + 1)}
                            value={line}
                            onChange={e => updateBundleLine(idx, e.target.value)}
                            maxLength={120}
                            placeholder={"Item " + (idx + 1) + " (e.g. \"Queen bed frame\")"}
                            style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.ink, background: C.paper, minWidth: 0 }}
                          />
                          <button type="button" onClick={() => removeBundleLine(idx)} title="Remove" aria-label={"Remove bundle item " + (idx + 1)} style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, border: "1.5px solid " + C.fawn, background: C.paper, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: C.mink }}>
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
          <div style={{ marginBottom: 12, borderRadius: 14, border: "1.5px solid " + (showPayment ? C.green + "30" : C.fawn), overflow: "hidden" }}>
            <button type="button" aria-expanded={showPayment} onClick={() => setShowPayment(!showPayment)}
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
                      <button key={p.id} type="button" aria-pressed={on} onClick={() => setPaymentMethod(p.id)}
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
          </section>

          <section style={formCard(isMobile)}>
          {submitError && (
            <div role="alert" style={{ padding: "10px 14px", borderRadius: 12, background: C.claretMist, border: "1px solid " + C.claret + "40", marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 8 }}>
              <AlertCircle size={16} style={{ color: C.claret, flexShrink: 0, marginTop: 1 }}/>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.claret, lineHeight: 1.5 }}>{submitError}</p>
            </div>
          )}

          {/* Action row — Delete (left) · Cancel + Save changes (right) */}
          <div style={{ display: "flex", flexDirection: isMobile ? "column-reverse" : "row", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: 10 }}>
            <button type="button" onClick={() => setShowDelete(true)} disabled={submitting} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 18px", borderRadius: 999, border: "1.5px solid " + C.claret + "30", cursor: submitting ? "not-allowed" : "pointer", fontFamily: F.head, fontSize: 12, fontWeight: 700, background: C.paper, color: C.claret, opacity: submitting ? 0.6 : 1 }}>
              <X size={13}/> Delete item
            </button>
            <div style={{ display: "flex", flexDirection: isMobile ? "column-reverse" : "row", gap: 10 }}>
              <button type="button" onClick={onBack} disabled={submitting} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 20px", borderRadius: 999, border: "1.5px solid " + C.fawn, cursor: submitting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: F.head, background: C.paper, color: C.mink, opacity: submitting ? 0.6 : 1 }}>
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
          </section>
        </div>
      </div>

      {/* Delete confirmation modal — preserved from old EditItemView */}
      {showDelete && (
        <ModalPortal>
        <div onClick={() => setShowDelete(false)} style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.modal, padding: 24, backdropFilter: "blur(4px)" }}>
          <ModalA11y label="Delete this item" onClose={() => setShowDelete(false)}/>
          <div onClick={e => e.stopPropagation()} className={"fade-in " + DIALOG_PANEL} style={{ width: 440, maxWidth: "100%", borderRadius: 24, background: C.paper, boxShadow: "0 24px 64px rgba(31, 29, 25, 0.2)" }}>
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
        </ModalPortal>
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

  const winLabels = Object.fromEntries(PICKUP_WINDOWS.map((w) => [w.id, w.label]));
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
  const categories = CATEGORIES.map(c => c.label);

  function handleSave() {
    onSave({ ...item, t: title, longDesc, d: longDesc.slice(0, 80), price, floor: floor ? Number(floor) : item.floor, retail: retail ? Number(retail) : item.retail, cond, cat, paymentMethod });
  }

  return (
    <ModalPortal>
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.modal, padding: 24, backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} className={"fade-in " + DIALOG_PANEL} style={{ background: C.paper, borderRadius: 24, width: "100%", maxWidth: 640, boxShadow: "0 24px 64px rgba(31, 29, 25, 0.2)" }}>
        {/* Header */}
        <div style={{ ...dialogHead(0), padding: "16px 22px", borderBottom: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, " + C.aiMist + ", " + C.paper + ")" }}>
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
              <input type="text" inputMode="decimal" autoComplete="off" value={price} onChange={e => setPrice(decimalAmountText(e.target.value))} style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, outline: "none", background: C.paper, boxSizing: "border-box" }}/>
            </div>
            <div>
              <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Floor ($) <span style={{ color: C.ash, fontWeight: 600 }}>· override</span></label>
              <input type="text" inputMode="decimal" autoComplete="off" value={floor} onChange={e => setFloor(decimalAmountText(e.target.value))} placeholder={"Default: $" + defaultFloor} style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, outline: "none", background: C.paper, boxSizing: "border-box" }}/>
              <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash, marginTop: 4, fontStyle: "italic" }}>
                {!floor || Number(floor) === defaultFloor ? "Using your " + floorPct + "% rule (= $" + defaultFloor + ")" : "Custom override · leave blank to use default"}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 12, background: C.sand, border: "1px solid " + C.fawn }}>
            <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Original retail ($) — optional</label>
            <input type="text" inputMode="decimal" autoComplete="off" value={retail} onChange={e => setRetail(decimalAmountText(e.target.value))} placeholder="e.g. 79" style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink, outline: "none", background: C.paper, boxSizing: "border-box" }}/>
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

        <div style={{ ...dialogFoot(0), padding: "14px 22px", borderTop: "1px solid " + C.fawn, background: C.sand, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "11px 20px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} className="cta-primary" style={{ padding: "11px 22px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800, background: C.green, color: "#fff", boxShadow: "0 2px 0 " + C.greenDeep, display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={13} strokeWidth={2.8}/> Save changes
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

/* ============================================================
   AI LISTING PREVIEW MODAL — mirrors the buyer item detail
   ============================================================ */
function AIListingPreviewModal({ item, onClose, onApprove, onEdit, isApproved, aiSettings = {} }) {
  const pickup = formatPickupSummary(aiSettings);
  return (
    <ModalPortal>
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.modal, padding: 24, backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} className={"fade-in " + DIALOG_PANEL} style={{ background: C.paper, borderRadius: 24, width: "100%", maxWidth: 640, boxShadow: "0 24px 64px rgba(31, 29, 25, 0.2)" }}>
        {/* Header */}
        <div style={{ ...dialogHead(0), padding: "16px 22px", borderBottom: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, " + C.aiMist + ", " + C.paper + ")" }}>
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
                <span style={{ fontFamily: F.head, fontSize: 32, fontWeight: 900, color: priceColor(item.price, C.green), letterSpacing: "-0.02em" }}>{priceText(item.price)}</span>
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

        {/* Action bar — kept in view at the bottom of the panel. */}
        <div style={{ ...dialogFoot(0), padding: "14px 22px", borderTop: "1px solid " + C.fawn, background: C.sand, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onEdit} style={{ padding: "11px 20px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            Edit
          </button>
          <button onClick={onApprove} className="cta-primary" style={{ padding: "11px 22px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 800, background: isApproved ? C.mink : C.green, color: "#fff", boxShadow: "0 2px 0 " + (isApproved ? C.ash : C.greenDeep), display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={13} strokeWidth={2.8}/> {isApproved ? "Unapprove" : "Approve"}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
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
                        <input type="text" inputMode="decimal" autoComplete="off" value={tempPrice} autoFocus aria-label="New price" onChange={e => setTempPrice(decimalAmountText(e.target.value))}
                          onBlur={commitPriceEdit}
                          onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingPriceId(null); }}
                          style={{ width: 68, padding: "3px 6px", borderRadius: 6, border: "1.5px solid " + C.green, fontFamily: F.head, fontSize: 18, fontWeight: 900, color: C.green, outline: "none", background: C.paper, textAlign: "center" }}/>
                      </div>
                    ) : (
                      <button onClick={() => beginPriceEdit(it)} title="Click to change price" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: F.head, fontSize: 20, fontWeight: 900, color: priceColor(it.price, C.green), textDecoration: "underline dotted", textDecorationColor: priceColor(it.price, C.green) + "60", textUnderlineOffset: 4, textAlign: "left" }}>
                        {priceText(it.price)}
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
                            <Package size={10} strokeWidth={2.4}/> Shelf now
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
                      <Package size={10}/> {shelfCount} to Shelf
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
// The field, input, button, banner and switch helpers (SF_*, Settings_Toggle)
// are shared with the buyer dashboard: components/settings/SettingsFields.tsx,
// imported at the top under these names.

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
  // Each field reveals on its own — clicking one eye must not unmask the
  // other. Current password stays masked: it's an existing secret, not
  // something being composed here.
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
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
    <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: 20 }}>
      {/* Profile picture — full width above the two cards. Same account as
          buyer mode, so the same choice shows in both. */}
      <div style={{ gridColumn: "1 / -1" }}>
        <ProfilePictureSection initialsBg={avatarBg(user?.name || "")} onSuccess={onSuccess}/>
      </div>
      {/* Profile information */}
      <form onSubmit={submitProfile} style={{ background: C.paper, border: "1px solid " + C.fawn, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
        <h2 style={{ fontFamily: F.head, fontSize: 16, fontWeight: 800, color: C.ink, letterSpacing: "-0.01em" }}>Profile information</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
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

        <div style={{ background: C.sand, border: "1px solid " + C.fawn, borderRadius: 12, padding: "12px 14px", display: "flex", flexWrap: "wrap", columnGap: 28, rowGap: 12 }}>
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

        <SF_SaveRow
          savedLabel={profileSavedAt ? "Changes saved" : null}
          hint="Save when you're ready."
          blockedHint="Edit your name to save changes."
          disabled={!profileDirty || savingProfile}
          loading={savingProfile}
          label="Save changes"
        />
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
          <SF_PasswordInput show={showNewPw} onToggleShow={() => setShowNewPw(v => !v)} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" disabled={savingPw}/>
        </SF_Field>

        <SF_Field label="Confirm new password">
          <SF_PasswordInput show={showConfirmPw} onToggleShow={() => setShowConfirmPw(v => !v)} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter new password" autoComplete="new-password" disabled={savingPw}/>
        </SF_Field>

        {pwError && <SF_ErrorBanner message={pwError}/>}

        <SF_SaveRow
          savedLabel={pwSavedAt ? (hasPassword ? "Password updated" : "Password set") : null}
          hint={hasPassword ? "Other devices will be signed out." : "Adds a password so you can sign in with email too."}
          blockedHint={hasPassword ? "Fill in all three fields to update." : "Fill in both fields to set a password."}
          disabled={savingPw || !newPw || !confirmPw || (hasPassword && !currentPw)}
          loading={savingPw}
          label={hasPassword ? "Update password" : "Set password"}
        />
      </form>

      <div style={{ gridColumn: "1 / -1" }}><DeleteAccountSection/></div>
    </div>
  );
}

/* ───── SUBSCRIPTION TAB ───── */
function SubscriptionTab({ user, onSuccess }) {
  const { width } = useViewport();
  // Phones: the waitlist field and button stack, the button full width. Side
  // by side, "Join waitlist" ran off the card at 360px with larger text.
  const stackWaitlist = width < 640;
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
    "Direct messaging with buyers",
    "Pickup scheduling tools",
    "DropYard fraud protection",
  ];
  const aiFeatures = [
    "Photo-to-listing — AI writes title, description, and price",
    "Auto-responds to buyer questions",
    "Negotiates within rules you set",
    "Schedules pickups within your windows",
    "No-show handling — re-opens and contacts next buyer",
  ];

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: 20 }}>
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
              <div style={{ display: "flex", flexDirection: stackWaitlist ? "column" : "row", flexWrap: "wrap", gap: 8 }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (error) setError(""); }}
                  placeholder="you@email.com"
                  disabled={submitting}
                  style={{ flex: stackWaitlist ? "0 0 auto" : 1, minWidth: 0, width: stackWaitlist ? "100%" : undefined, padding: "10px 14px", borderRadius: 10, border: "1.5px solid " + C.fawn, background: C.paper, fontFamily: F.body, fontSize: 13, color: C.ink, outline: "none" }}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "10px 20px", borderRadius: 999, border: "none", cursor: submitting ? "not-allowed" : "pointer", background: "linear-gradient(135deg, #7C3AED, #6D28D9)", color: "#fff", fontFamily: F.head, fontSize: 13, fontWeight: 800, opacity: submitting ? 0.7 : 1, boxShadow: "0 2px 0 #5B21B6", ...(stackWaitlist ? { width: "100%", minHeight: 44 } : {}) }}
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

/* Parent SettingsView — picks active tab and renders the right body. */
// `initialSection` lets other screens deep-link into a specific settings pane
// (e.g. the listing form's "Set your default" payment-method link). null = the
// normal entry point: desktop opens on Account, mobile opens on the section list.
function SettingsView({ user, initialSection = null, onBack = null, backLabel = "Back" }) {
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
    { id: "notifications", label: "Notifications", icon: Bell,       desc: "Email and push" },
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

      {/* Return CTA — present only when Settings was opened from inside
          another flow, e.g. the listing form's "Set your default" payment
          link. Sits above the header so it is the first thing in the panel
          on both breakpoints, and stays put on mobile whether the seller is
          on the section list or drilled into a pane. */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "10px 0 2px" : "12px 0 0", border: "none", background: "none", color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          <ArrowLeft size={14}/> {backLabel}
        </button>
      )}

      {/* Page header — hidden on mobile while drilled into a section. */}
      {(!isMobile || !mobileViewingSection) && (
        <div style={{ marginBottom: isMobile ? 2 : 6 }}>
          <PageHeader icon={Settings} isMobile={isMobile} title="Settings" subtitle="Account, notifications, payments, pickup defaults, and subscription."/>
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
                  aria-current={active ? "true" : undefined}
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
  // WhatsApp isn't offered: nothing sends WhatsApp messages. Its saved values
  // (DEFAULTS below, user.notificationPrefs) are left as they are.
  const channels = ["email", "push"];
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
      {/* The choices are stored but nothing sends these emails or pushes yet. */}
      <p style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", marginBottom: 14, borderRadius: 10, background: C.sand, border: "1px solid " + C.fawn, fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>
        <Bell size={14} aria-hidden="true" style={{ color: C.greenDeep, flexShrink: 0, marginTop: 2 }}/>
        Email and push alerts are coming soon; your choices are saved for when they launch.
      </p>
      <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px", gap: 12, paddingBottom: 12, borderBottom: "1px solid " + C.fawn, marginBottom: 8 }}>
        <span/>
        <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.mink, letterSpacing: "0.12em", textAlign: "center" }}>EMAIL</span>
        <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.mink, letterSpacing: "0.12em", textAlign: "center" }}>PUSH</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: i === rows.length - 1 ? "none" : "1px solid " + C.fawn }}>
          <div>
            <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.ink }}>{r.label}</p>
            <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, marginTop: 2 }}>{r.desc}</p>
          </div>
          {channels.map(ch => (
            <div key={ch} style={{ display: "flex", justifyContent: "center" }}>
              <Settings_Toggle
                on={!!prefs[r.id][ch]}
                onClick={() => toggle(r.id, ch)}
                label={r.label + (ch === "email" ? ", email" : ", push")}
                busy={busy === `${r.id}.${ch}`}
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
              <Settings_Toggle on={on} onClick={() => toggle(it.id)} label={it.label} busy={busy === it.id}/>
            </div>
          );
        })}
      </div>
      {error && <div style={{ marginTop: 12 }}><SF_ErrorBanner message={error}/></div>}
    </div>
  );
}

// ─── Settings · Pickup ───
// defaultPickupAddress plus the buyer-facing neighbourhood. The neighbourhood
// used to be read-only ("contact support to change"), which left anyone who
// moved within Barrhaven — the most common reason to be selling in the first
// place — showing buyers the wrong end of town. It's the same validated list
// as onboarding, so changing it can't produce a name we don't know.
function SettingsPickup({ user, onSuccess }) {
  const { refreshUser } = useAuth();
  const [address, setAddress] = useState(user?.defaultPickupAddress || "");
  const [neighborhoodId, setNeighborhoodId] = useState(
    () => findNeighbourhood(user?.neighborhood)?.id ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { setAddress(user?.defaultPickupAddress || ""); }, [user?.defaultPickupAddress]);
  useEffect(() => {
    setNeighborhoodId(findNeighbourhood(user?.neighborhood)?.id ?? "");
  }, [user?.neighborhood]);

  const savedNeighborhoodId = findNeighbourhood(user?.neighborhood)?.id ?? "";
  const dirty =
    address.trim() !== (user?.defaultPickupAddress || "") ||
    neighborhoodId !== savedNeighborhoodId;

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const selected = BARRHAVEN_NEIGHBOURHOODS.find(n => n.id === neighborhoodId);
      await apiRequest("/api/auth/me/preferences", {
        method: "PATCH",
        body: JSON.stringify({
          defaultPickupAddress: address.trim(),
          ...(selected ? { neighborhood: selected.name } : {}),
        }),
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
      <SF_Field label="Default pickup address" helper="Your pickup address is private and never shown to buyers. You decide if and when to share it.">
        <SF_Input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="123 Cresthaven Drive, Barrhaven, ON"
          disabled={saving}
        />
      </SF_Field>
      <SF_Field label="Buyer-facing neighbourhood" helper="Shown on every listing, and what buyers sort by. Update it if you move within Barrhaven.">
        <select
          aria-label="Buyer-facing neighbourhood"
          value={neighborhoodId}
          onChange={e => setNeighborhoodId(e.target.value)}
          disabled={saving}
          style={{
            width: "100%", padding: "11px 14px", borderRadius: 12,
            border: "1.5px solid " + C.fawn, background: C.paper, color: neighborhoodId ? C.ink : C.ash,
            fontFamily: F.body, fontSize: 14, outline: "none", cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          <option value="">Choose your neighbourhood…</option>
          {BARRHAVEN_NEIGHBOURHOODS.map(n => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
      </SF_Field>
      {error && <SF_ErrorBanner message={error}/>}
      <SF_SaveRow
        style={{ paddingTop: 12 }}
        savedLabel={savedAt ? "Changes saved" : null}
        hint="Per-listing windows can be set when creating each item."
        blockedHint="Change the address or neighbourhood to save."
        disabled={!dirty || saving}
        loading={saving}
        label="Save changes"
      />
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

   Location is two questions, in this order:
     postal code  → are we in your area at all? (lib/barrhaven, local)
     neighbourhood→ which part of Barrhaven, from a fixed list.
   It used to be one free-text box autofilled from the FSA table, which
   could only ever answer "Barrhaven" — every seller got the same name and
   the same centroid, so every buyer saw the same distance. The list is
   also what makes the name safe to print on a listing: the backend
   rejects anything that isn't on it.
   ============================================================ */
function SellerOnboardingModal({ user, accessToken, onClose, onSuccess }) {
  const [neighborhoodId, setNeighborhoodId] = useState(
    () => findNeighbourhood(user?.neighborhood)?.id ?? ""
  );
  const [postalCode, setPostalCode]     = useState(() => formatPostalCode(user?.postalCode ?? ""));
  const [pickupAddress, setPickupAddress] = useState(user?.defaultPickupAddress ?? "");
  const [methods, setMethods] = useState(() => {
    const initial = Array.isArray(user?.acceptedPaymentMethods) && user.acceptedPaymentMethods.length > 0
      ? user.acceptedPaymentMethods
      : ["CASH", "ETRANSFER"];
    return new Set(initial);
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Service area ────────────────────────────────────────────────────────
  // DropYard is Barrhaven-only, so the postal code decides whether this form
  // can be submitted at all, and which neighbourhoods we show first. The
  // check is local (lib/barrhaven) — no request, no spinner, no waiting on
  // the network to tell someone they're in the right place.
  const area = serviceAreaForPostalCode(postalCode);
  const optionGroups = useMemo(() => groupedNeighbourhoodOptions(area.fsa), [area.fsa]);
  const selected = BARRHAVEN_NEIGHBOURHOODS.find(n => n.id === neighborhoodId) ?? null;

  // One FSA, one neighbourhood (K2G → Davidson Heights): pick it rather than
  // making the seller confirm the only possible answer. Never overrides a
  // choice already made.
  const neighborhoodTouched = useRef(Boolean(user?.neighborhood));
  useEffect(() => {
    if (neighborhoodTouched.current || !area.inServiceArea) return;
    const candidates = neighbourhoodsForFsa(area.fsa);
    if (candidates.length === 1) setNeighborhoodId(candidates[0].id);
  }, [area.fsa, area.inServiceArea]);

  // Name the place we don't serve yet — "We're not in Kanata (Bridlewood)
  // yet" lands better than a generic refusal, and it's the one case where
  // the Geonames FSA table is the right source. Debounced; failure is silent.
  const [outsidePlace, setOutsidePlace] = useState("");
  useEffect(() => {
    if (area.status !== "outside" || !area.fsa) { setOutsidePlace(""); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await apiRequest(`/api/geo/postal?code=${encodeURIComponent(area.fsa)}`);
        if (!cancelled && data?.place) setOutsidePlace(data.place);
      } catch {
        if (!cancelled) setOutsidePlace("");
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [area.status, area.fsa]);

  const onNeighborhoodChange = (value) => {
    neighborhoodTouched.current = value.length > 0;
    setNeighborhoodId(value);
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
    if (!area.inServiceArea) {
      setError(area.status === "outside"
        ? "That postal code is outside Barrhaven."
        : "Enter your Barrhaven postal code.");
      return;
    }
    if (!selected) { setError("Choose your neighbourhood."); return; }
    if (pickupAddress.trim().length < 5) { setError("Enter a pickup address."); return; }
    if (methods.size === 0) { setError("Choose at least one payment method."); return; }
    setSubmitting(true);
    try {
      await apiRequest("/api/auth/me/seller-onboarding", {
        method: "POST",
        token:  accessToken ?? undefined,
        body: JSON.stringify({
          neighborhood:           selected.name,
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
    <ModalPortal>
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: Z.modal,
        background: "rgba(11,47,32,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, overflow: "auto",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <ModalA11y label="Complete your seller profile" onClose={onClose}/>
      <div className={DIALOG_PANEL}
        style={{
          background: C.paper, borderRadius: 18,
          maxWidth: 520, width: "100%", padding: 28,
          boxShadow: "0 30px 80px rgba(11,47,32,0.20)",
        }}
      >
        <div style={{ ...dialogHead(28), paddingBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ width: 22, height: 2.5, background: C.green, borderRadius: 2 }}/>
          <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.green, letterSpacing: "0.16em", textTransform: "uppercase" }}>
            Become a seller
          </span>
        </div>
        <h2 style={{ fontFamily: F.head, fontSize: 26, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em" }}>
          Complete your seller profile
        </h2>
        </div>
        <p style={{ fontFamily: F.body, fontSize: 14, color: C.mink, marginBottom: 20, lineHeight: 1.55 }}>
          We need a few details before you can list items. Buyers see your neighbourhood and how far away you are when they consider claiming — the closer you are, the more likely they claim.
        </p>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 14, borderRadius: 12, background: C.claretMist, border: "1px solid " + C.claret + "30", color: C.claret, fontFamily: F.body, fontSize: 13 }}>
            <AlertCircle size={15}/>{error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Postal code comes first: it decides whether the rest of the form
              applies at all, and which neighbourhoods we list. */}
          <Field label="Postal code">
            <input
              type="text" value={postalCode}
              onChange={e => setPostalCode(formatPostalCode(e.target.value))}
              placeholder="K2J 4A8"
              required maxLength={7}
              inputMode="text" autoComplete="postal-code" autoCapitalize="characters"
              style={{ ...fieldInput, letterSpacing: "0.08em" }}
            />
            <ServiceAreaNote area={area} place={outsidePlace}/>
          </Field>

          <Field label="Neighbourhood">
            <div style={{ position: "relative" }}>
              <select
                value={neighborhoodId}
                onChange={e => onNeighborhoodChange(e.target.value)}
                disabled={!area.inServiceArea}
                required
                style={{
                  ...fieldInput,
                  appearance: "none",
                  paddingRight: 38,
                  cursor: area.inServiceArea ? "pointer" : "not-allowed",
                  background: area.inServiceArea ? C.paper : C.sand,
                  color: area.inServiceArea && neighborhoodId ? C.ink : C.ash,
                }}
              >
                <option value="">
                  {area.inServiceArea ? "Choose your neighbourhood…" : "Enter a Barrhaven postal code first"}
                </option>
                {optionGroups.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown
                size={16}
                style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", color: C.ash, pointerEvents: "none" }}
              />
            </div>
            <p style={{ fontFamily: F.body, fontSize: 11, color: C.mink, marginTop: 5, lineHeight: 1.5 }}>
              {selected
                ? selected.landmark
                : "Barrhaven is one Drop, but buyers sort by how close you are. Pick the part you actually live in."}
            </p>
          </Field>

          <Field label="Default pickup address">
            <input
              type="text" value={pickupAddress} onChange={e => setPickupAddress(e.target.value)}
              placeholder="123 Longfields Dr, Barrhaven"
              required
              disabled={!area.inServiceArea}
              autoComplete="street-address"
              style={{ ...fieldInput, background: area.inServiceArea ? C.paper : C.sand }}
            />
            <p style={{ fontFamily: F.body, fontSize: 11, color: C.mink, marginTop: 5 }}>
              Your pickup address is private and never shown to buyers. You decide if and when to share it.
            </p>
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

          <div style={{ display: "flex", gap: 10, paddingTop: 12, justifyContent: "flex-end", ...dialogFoot(28) }}>
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
              type="submit" disabled={submitting || !area.inServiceArea}
              style={{
                padding: "11px 22px", borderRadius: 12, border: "none",
                background: submitting || !area.inServiceArea ? C.greenMist : C.green,
                color: submitting || !area.inServiceArea ? C.greenDeep : "#fff",
                fontFamily: F.head, fontSize: 13, fontWeight: 800,
                cursor: submitting || !area.inServiceArea ? "not-allowed" : "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
                boxShadow: submitting || !area.inServiceArea ? "none" : "0 2px 0 " + C.greenDeep,
              }}
            >
              {submitting && <Loader2 size={14} className="animate-spin"/>}
              {submitting ? "Saving…" : "Save & continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
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

/* Live verdict under the postal-code field. Four states, because "we don't
   serve you yet" and "that isn't a postal code" need different answers —
   one is a product boundary, the other is a typo. */
function ServiceAreaNote({ area, place }) {
  if (area.status === "partial") {
    return (
      <p style={{ fontFamily: F.body, fontSize: 11, color: C.mink, marginTop: 5 }}>
        We&rsquo;re live in Barrhaven — K2J, plus the K2G and K2R edges.
      </p>
    );
  }

  if (area.status === "invalid") {
    return (
      <p style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F.body, fontSize: 11, color: C.claret, marginTop: 6 }}>
        <AlertCircle size={13}/> That doesn&rsquo;t look like a postal code. Try K2J 4A8.
      </p>
    );
  }

  if (area.status === "outside") {
    return (
      <div style={{ marginTop: 8, padding: "11px 13px", borderRadius: 12, background: C.amberMist, border: "1px solid " + C.amberSoft }}>
        <p style={{ display: "flex", alignItems: "flex-start", gap: 7, fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.amberDeep, marginBottom: 4 }}>
          <MapPin size={14} style={{ marginTop: 1, flexShrink: 0 }}/>
          DropYard isn&rsquo;t in {place || area.fsa} yet
        </p>
        <p style={{ fontFamily: F.body, fontSize: 12, color: C.mink, lineHeight: 1.5 }}>
          We&rsquo;re Barrhaven-only while the first Drops find their feet. Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}?subject=DropYard%20in%20${encodeURIComponent(place || area.fsa || "my area")}`} style={{ color: C.green, fontWeight: 700 }}>
            {SUPPORT_EMAIL}
          </a>{" "}
          and tell us where you are — it genuinely decides where we go next.
        </p>
      </div>
    );
  }

  return (
    <p style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F.body, fontSize: 11, color: C.greenDeep, marginTop: 6, fontWeight: 600 }}>
      <Check size={13} strokeWidth={3}/>
      {area.status === "core"
        ? `${area.fsa} — you're in the Barrhaven Drop.`
        : `${area.fsa} — Barrhaven edge, you're in.`}
    </p>
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
  "overview", "items", "questions", "messages", "history", "settings",
]);
// The Orders tab (and its claims / pickups views) became My items' offers and
// pickup cards. Old links, bookmarks, bell entries and shortcuts that name
// them land on My items with the matching filter.
const LEGACY_ITEMS_TABS = { orders: "action", claims: "action", pickups: "pickups" };

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
    const params = new URLSearchParams(window.location.search);
    // A link naming a conversation lands in Messages whatever its tab says.
    if (params.get("conversation")) return "messages";
    const t = params.get("tab");
    if (t && LEGACY_ITEMS_TABS[t]) return "items";
    return t && SELLER_TABS.has(t) ? t : "overview";
  });
  // Where a link put My items: { filter, itemId, nonce }. A new nonce remounts
  // the view on that filter with that item's card highlighted. Seeded from
  // ?tab=items&filter=…&item=… (or an old ?tab=orders / claims / pickups).
  const [itemsFocus, setItemsFocus] = useState(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t && LEGACY_ITEMS_TABS[t]) return { filter: LEGACY_ITEMS_TABS[t], itemId: params.get("item"), nonce: 1 };
    if (t === "items" && (params.get("filter") || params.get("item"))) return { filter: params.get("filter"), itemId: params.get("item"), nonce: 1 };
    return null;
  });
  // `search`: a title search from the header ("Search my items…").
  function goToItems(filter = null, itemId = null, pickupWhen = null, search = null) {
    setItemsFocus((f) => ({ filter, itemId, pickupWhen, search: search || null, nonce: ((f && f.nonce) || 0) + 1 }));
    setView("items");
  }
  // What SellerMessagesView should open: { conversationId }. Seeded from a
  // ?conversation=<id> link; set again when a message notification is clicked.
  const [openThread, setOpenThread] = useState(conversationFromUrl);
  // A request only means something on Messages: leaving it drops one that
  // hasn't opened yet (SellerMessagesView drops it itself once it has).
  // Adjusted during render, React's pattern for state that follows other state.
  const [openThreadView, setOpenThreadView] = useState(view);
  if (openThreadView !== view) {
    setOpenThreadView(view);
    if (openThreadView === "messages" && openThread) setOpenThread(null);
  }
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
  // Which view Settings should hand control back to, when Settings was opened
  // from inside another flow rather than from the chrome. null = a normal
  // entry, and Settings shows no return CTA. See goToSettings.
  const [settingsReturnTo, setSettingsReturnTo] = useState(null);
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
    // Old Orders destinations (Overview shortcuts and the like).
    if (LEGACY_ITEMS_TABS[target]) { setSettingsReturnTo(null); goToItems(LEGACY_ITEMS_TABS[target]); return; }
    // The Overview "pickups today" tile: Claimed · pickup pending, on its Today chip.
    if (target === "pickups-today") { setSettingsReturnTo(null); goToItems("pickups", null, "today"); return; }
    // My items through the chrome: a fresh list, no filter from an old link.
    if (target === "items") setItemsFocus(null);
    if (LISTING_VIEWS.has(target) && needsSellerOnboarding) {
      setPendingNav(target);
      setShowOnboarding(true);
      return;
    }
    // Generic nav to Settings (sidebar, mobile nav) is a fresh entry — drop any
    // pane left over from a deep link like "Set your default", otherwise
    // Settings would keep reopening on Payments.
    if (target === "settings") setSettingsSection(null);
    // Navigating through the chrome abandons any pending "back to your
    // listing" return. Without this the held form would stay mounted behind
    // whatever the seller picked instead.
    setSettingsReturnTo(null);
    if (target === "add-manual" || target === "add-chooser") setListFormNonce(n => n + 1);
    setView(target);
  };

  function goToEdit(item) { setEditingItem(item); setView("edit-item"); }
  function goToView(item) { setEditingItem(item); setView("item-detail"); }
  // Pickup cards: Message buyer opens the claim's conversation; View details
  // opens the item from the seller's own list.
  function openConversation(conversationId) {
    if (!conversationId) return;
    setOpenThread({ conversationId });
    setView("messages");
  }
  // Deep-link into a specific Settings pane. `null` = normal entry (Account on
  // desktop, section list on mobile). Used by the listing form's "Set your
  // default" payment link, which previously called onGoToItems("ai-setup") —
  // a prop that ignores its argument, so it landed on Inventory (BUG-083).
  // `returnTo` is the view Settings should offer a Back CTA to. The listing
  // form passes its own view name so the seller can set a payment default and
  // drop straight back into the draft they were composing (BUG — the link was
  // a one-way trip; the only way out was the sidebar, which restarted the
  // listing from scratch).
  function goToSettings(sectionId = null, returnTo = null) { setSettingsSection(sectionId); setSettingsReturnTo(returnTo); setView("settings"); }

  // ─── Conversation inbox ───
  // The list, and the message:new / conversation:read / claim listeners that
  // keep it live, belong to NotificationsProvider (context/
  // NotificationsContext), which serves both sides of the account so a
  // message for the buyer side still counts while this dashboard is open.
  // This is the seller slice of it, adapted for SellerMessagesView;
  // setConvList writes back, so a thread read or archived here moves the
  // badges at once.
  const [convList, setConvList] = useRoleConversations("seller", adaptSellerConversation, []);
  const inbox = useNotifications();

  // A bell entry or toast for this side (NotificationsProvider.navigate):
  // open the thread or tab it names. The other side's are handled by a mode
  // switch, and that dashboard reads them from the URL as it mounts.
  const registerNavHandler = inbox?.registerNavHandler;
  useEffect(() => {
    if (!registerNavHandler) return;
    return registerNavHandler((target) => {
      setSettingsReturnTo(null);
      if (target.conversationId) {
        setOpenThread({ conversationId: target.conversationId });
        setView("messages");
      } else if (target.tab && (LEGACY_ITEMS_TABS[target.tab] || (target.tab === "items" && (target.filter || target.itemId)))) {
        // An offer or pickup notification: My items, on that item's card.
        goToItems(target.filter || LEGACY_ITEMS_TABS[target.tab] || null, target.itemId || null);
      } else if (target.tab && SELLER_TABS.has(target.tab)) {
        setView(target.tab);
      }
    });
  }, [registerNavHandler]);

  const messagesUnreadCount = useMemo(
    () => convList.filter((c) => (c.unreadCount || 0) > 0).length,
    [convList],
  );

  // ─── Unanswered questions, lifted to the root ───────────────────────────
  // QuestionsView fetched this for itself, so the count only existed while
  // that tab was mounted. Owned here instead, it feeds the sidebar badge and
  // the bell from every view — and the socket keeps it live, so a question
  // arriving while the seller is on Overview shows up without a refresh.
  const [questionsPending, setQuestionsPending] = useState(0);
  const [questionsTick, setQuestionsTick] = useState(0);
  useSocketEvent("question:new", () => setQuestionsTick((t) => t + 1));
  useEffect(() => {
    if (!accessToken) { setQuestionsPending(0); return; }
    let cancelled = false;
    apiRequest("/api/questions/pending", { token: accessToken })
      .then((data) => {
        if (cancelled) return;
        setQuestionsPending(Array.isArray(data?.questions) ? data.questions.length : 0);
      })
      .catch(() => { if (!cancelled) setQuestionsPending(0); });
    return () => { cancelled = true; };
  }, [accessToken, questionsTick]);
  // Answering one is the other way the count moves. QuestionsView calls this
  // after a successful PATCH so the badge drops without waiting for a refetch.
  const onQuestionsChanged = useCallback(() => setQuestionsTick((t) => t + 1), []);

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
          sidebarCollapsed={sidebarCollapsed}
          onSwitchRole={onSwitchRole}
          otherUnread={inbox?.unread.buyer || 0}
          onSearch={(q) => goToItems(null, null, null, q)}
        />
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Desktop sidebar — rendered always so SSR/client markup matches; CSS
              media query (`.dy-desktop-sidebar`) hides it on mobile. Gating on
              the JS `isMobile` flag caused the sidebar to render in SSR HTML
              (defaults to desktop) and pop out on hydration, shifting layout. */}
          <Sidebar activeView={view} onNav={safeNav} onSwitchRole={onSwitchRole} collapsed={sidebarCollapsed} messagesUnread={messagesUnreadCount} questionsPending={questionsPending} otherUnread={inbox?.unread.buyer || 0}/>
          <main className={"dy-seller-main" + (view === "messages" ? " dy-seller-main--flush" : "")}>
            {view === "overview" && <Overview onNav={safeNav} user={user} sellerItems={sellerItems} accessToken={accessToken} goToItems={goToItems} onOpenThread={openConversation} onEdit={goToEdit}/>}
            {view === "items" && <MyItemsView key={itemsFocus ? "focus-" + itemsFocus.nonce : "plain"} initialFilter={itemsFocus ? itemsFocus.filter : null} initialPickupWhen={itemsFocus ? itemsFocus.pickupWhen : null} initialSearch={itemsFocus ? itemsFocus.search : null} highlightItemId={itemsFocus ? itemsFocus.itemId : null} onNav={safeNav} onEdit={goToEdit} onView={goToView} onOpenThread={openConversation} sellerItems={sellerItems} onItemsChange={onItemsChange} onRefresh={onItemCreated} sellerItemsLoading={sellerItemsLoading} accessToken={accessToken}/>}
            {view === "questions" && <QuestionsView onNav={safeNav} accessToken={accessToken} onQuestionsChanged={onQuestionsChanged}/>}
            {view === "item-detail" && <ItemDetailView item={editingItem} onBack={() => setView("items")} onEdit={() => setView("edit-item")} accessToken={accessToken}/>}
            {view === "messages" && <SellerMessagesView user={user} accessToken={accessToken} convList={convList} onConvListChange={setConvList} openThread={openThread} onConsumeOpenThread={() => setOpenThread(null)}/>}
            {view === "history" && <SellerHistoryView accessToken={accessToken}/>}
            {/* Keyed on the requested pane so arriving from a deep link while
                Settings is already mounted still lands on the right section —
                `initialSection` only seeds useState on mount. */}
            {view === "settings" && (
              <SettingsView
                key={settingsSection || "default"}
                user={user}
                initialSection={settingsSection}
                onBack={settingsReturnTo ? () => { const back = settingsReturnTo; setSettingsReturnTo(null); setView(back); } : null}
                backLabel="Back to your listing"
              />
            )}
            {view === "edit-item" && <EditItemView onBack={() => setView("items")} editingItem={editingItem} aiSettings={aiSettings} accessToken={accessToken} onItemsChange={onItemsChange}/>}

            {/* The listing form stays MOUNTED — just hidden — while the seller
                is away in Settings via its "Set your default" link. Unmounting
                it would throw away the half-typed draft, which is the whole
                reason the Back CTA exists. `settingsReturnTo` is cleared by
                safeNav, so any other navigation drops the held form normally. */}
            {(view === "add-chooser" || settingsReturnTo === "add-chooser") && (
              <div style={{ display: view === "add-chooser" ? undefined : "none" }}>
                <ManualItemForm key={listFormNonce} onDone={() => setView("items")} onBack={() => setView("items")} onGoToItems={() => setView("items")} onGoToSettings={section => goToSettings(section, "add-chooser")} onEnhanceAI={() => {setAiEntryPoint("add-manual");setView(aiConfigured ? "add-ai" : "ai-setup")}} aiSettings={aiSettings} accessToken={accessToken} onItemCreated={onItemCreated}/>
              </div>
            )}
            {(view === "add-manual" || settingsReturnTo === "add-manual") && (
              <div style={{ display: view === "add-manual" ? undefined : "none" }}>
                <ManualItemForm key={listFormNonce} onDone={() => setView("items")} onBack={() => setView("items")} onGoToItems={() => setView("items")} onGoToSettings={section => goToSettings(section, "add-manual")} onEnhanceAI={() => {setAiEntryPoint("add-manual");setView(aiConfigured ? "add-ai" : "ai-setup")}} aiSettings={aiSettings} accessToken={accessToken} onItemCreated={onItemCreated}/>
              </div>
            )}
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
        <MobileBottomNav activeView={view} onNav={safeNav} messagesUnread={messagesUnreadCount} questionsPending={questionsPending}/>
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
        <ModalPortal>
        <div onClick={() => setSignoutOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(11,47,32,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.modal, padding: 16 }}>
          <ModalA11y label="Sign out" onClose={() => setSignoutOpen(false)}/>
          <div className={DIALOG_PANEL} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="seller-signout-title" style={{ background: C.paper, borderRadius: 20, padding: 24, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(11,47,32,0.25)" }}>
            <h3 id="seller-signout-title" style={{ fontFamily: F.head, fontSize: 18, fontWeight: 900, color: C.ink, marginBottom: 6 }}>Sign out?</h3>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.mink, lineHeight: 1.5, marginBottom: 18 }}>You&rsquo;ll need to sign back in to see your inventory, claims, and messages.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setSignoutOpen(false)} autoFocus style={{ padding: "10px 16px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmSignout} className="cta-primary" style={{ padding: "10px 18px", borderRadius: 999, border: "none", background: C.claret, color: "#fff", fontFamily: F.head, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 0 " + (C.claretDeep || "#9f1239") }}>Sign out</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  );
}
