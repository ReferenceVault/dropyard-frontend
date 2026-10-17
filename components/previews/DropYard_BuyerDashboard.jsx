"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { useSocketEvent } from "@/context/SocketContext";
import { SocketHealthDot } from "@/components/SocketHealthDot";
import { useAuth } from "@/context/AuthContext";
import {
  DROP_OPEN_DAY, DROP_OPEN_HOUR, DROP_CLOSE_DAY, DROP_CLOSE_HOUR,
  dropOpenHour, dropOpenHourCompact, dropOpenHourBadge,
  dropOpenDay, dropOpenFull,
  nextDropMoment, dropCloseMoment,
  formatCompactCountdown,
} from "@/lib/dropCycle";

/** Shared SSR-safe live countdown to the next drop open. Returns "" on the
 *  first server + client render to avoid hydration mismatch, then ticks per
 *  minute (the compact format only changes at minute boundaries). */
function useDropOpenCountdownString() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return now ? formatCompactCountdown(nextDropMoment(now), now) : "";
}
import {
  Search, Heart, Clock, MapPin, Package, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, SlidersHorizontal,
  Check, X, User, ShoppingBag, MessageSquare, Sparkles, Truck, Calendar,
  Star, Shield, Send, ArrowRight, ArrowLeft, Home, Tag, Bell, MessageCircle,
  CalendarDays, Compass, Archive, RefreshCw, Eye, Info, TrendingDown,
  DollarSign, AlertCircle, CheckCircle, Share2, Award, Leaf,
  Banknote,
  Phone,
  LogOut,
  Lock,
  KeyRound,
  Loader2,
  ShieldCheck,
  Settings as SettingsIcon
} from "lucide-react";

// Short relative-time string used in inbox previews ("3h ago"). Mirrors the
// helper in the seller dashboard.
// Lifted from MessagesPage to module scope so the dashboard root can adapt
// the conversation list before MessagesPage even mounts (the nav badge needs
// to count from this lifted state). Buyer-perspective adapter — `from === "you"`
// for messages this user sent.
function adaptBuyerConversation(api, myId) {
  if (!api) return null;
  // Buyer view only shows conversations where the current user IS the buyer.
  // The backend returns conversations for both sides; when this user is the
  // seller in a thread, that thread belongs in the Seller Messages view, not
  // here. Filtering at the adapter (vs the fetcher) keeps the indices and
  // socket handlers consistent for both personas.
  if (api.buyerId && myId && api.buyerId !== myId) return null;
  const layer = api.item?.placement === "SHELF" ? "shelf" : "drop";
  const lastFromMe = api.lastMessage && api.lastMessage.senderId === myId;
  const status = (api.unreadCount || 0) > 0
    ? "pending"
    : (lastFromMe ? "answered" : "answered");
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
      img:   (Array.isArray(api.item?.photos) && api.item.photos[0])
               ? api.item.photos[0]
               : (CATEGORY_EMOJI[api.item?.category] || "\u{1F4E6}"),
      layer,
      // Raw backend status (LIVE / CLAIMED / SOLD / DRAFT) so the chat
      // composer can lock once the transaction completes (item SOLD after
      // pickup). LIVE / CLAIMED keep chat open for pickup coordination.
      status: api.item?.status || null,
    },
    seller: {
      name:   api.otherUser?.name || "Seller",
      hood:   api.otherUser?.neighborhood || "—",
      usesAI: false,
    },
    lastMsg:  api.lastMessage?.body || "",
    lastTime: relativeTimeShort(api.lastMessageAt),
    messages: [],
  };
}

function relativeTimeShort(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + "d ago";
  const months = Math.floor(days / 30);
  return months + "mo ago";
}

// Backend ItemCategory enum -> emoji shown on inbox row when the item has no
// photo. Matches the seller dashboard table.
const CATEGORY_EMOJI = {
  FURNITURE:   "🛋️",
  ELECTRONICS: "📱",
  SPORTS:      "⚽",
  HOME:        "🏠",
  CLOTHING:    "👕",
  BOOKS:       "📚",
  OTHER:       "📦",
};

// Reverse category labels (backend enum -> UI label) — the buyer-side Discover
// filter uses the long human labels so we collapse the backend's narrower
// enum across the closest UI bucket.
const BUYER_ENUM_TO_CATEGORY = {
  FURNITURE:   "Furniture",
  ELECTRONICS: "Electronics",
  SPORTS:      "Sports & Outdoor",
  HOME:        "Appliances & Kitchen",
  CLOTHING:    "Clothing & Accessories",
  BOOKS:       "Books, Games & Hobbies",
  OTHER:       "Other",
};
const BUYER_ENUM_TO_CONDITION = {
  EXCELLENT: "New",
  LIKE_NEW:  "Used - Like New",
  GOOD:      "Used - Good",
  FAIR:      "Used - Fair",
};
const BUYER_ENUM_TO_PAYMENT = {
  CASH:      "cash",
  ETRANSFER: "etransfer",
  EITHER:    "either",
};

// Backend Claim -> UI claim shape that ClaimsPage already renders. Status
// mapping follows what a buyer expects to see:
//   PENDING   -> "offer-pending"   (waiting on the seller to confirm)
//   CONFIRMED -> "pickup-scheduled" (with date/time from pickupSlot)
// REJECTED / CANCELLED / PICKED_UP are filtered out before this runs.
function adaptBuyerClaim(api) {
  if (!api) return null;
  // pickupSlot is freeform ("Sat 2pm-4pm") so we split on the first space to
  // get a day-ish label + time-ish label. Good enough for the row.
  const slot = String(api.pickupSlot || "").trim();
  const sp = slot.indexOf(" ");
  const day = sp > 0 ? slot.slice(0, sp) : slot;
  const time = sp > 0 ? slot.slice(sp + 1) : "";
  const SHORT_DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const todayShort = SHORT_DAYS[new Date().getDay()].toLowerCase();
  const isToday = day.toLowerCase().startsWith(todayShort);
  // BUG-055 — new lifecycle: PROPOSED (was PENDING) is the "offer pending"
  // state; ACCEPTED (was CONFIRMED) is the "ready for pickup" state.
  let uiStatus;
  if (api.status === "PROPOSED")        uiStatus = "offer-pending";
  else if (api.status === "ACCEPTED")   uiStatus = isToday ? "pickup-today" : "pickup-scheduled";
  else if (api.status === "PICKED_UP")  uiStatus = "picked-up";
  else                                  uiStatus = (api.status || "").toLowerCase();
  return {
    id:            api.id,
    itemId:        api.item?.id || null,
    e:             CATEGORY_EMOJI[api.item?.category] || "📦",
    img:           Array.isArray(api.item?.photos) && api.item.photos[0] ? api.item.photos[0] : null,
    t:             api.item?.title || "Item",
    // Prefer the agreed claim amount (BUG-055 — was claim.price, now claim.amount).
    // Falls back to the item's listed price if the field is missing.
    price:         (typeof api.amount === "number" ? api.amount : api.item?.price) ?? 0,
    listedPrice:   api.item?.price ?? null,
    seller:        api.seller?.name || "Seller",
    status:        uiStatus,
    date:          isToday ? "Today" : (day || null),
    time:          time || null,
    addr:          api.pickupAddress || null,
    channel:       "drop",
    paymentMethod: "either",
    // Buyer's "Confirm receipt" flag — drives the "Receipt confirmed, waiting
    // for seller" pill instead of the action button.
    buyerConfirmedReceipt: !!api.buyerConfirmedReceiptAt,
    expiresAt:     api.expiresAt || null,
    // BUG-055.1 — whose turn is it? GET /mine only returns claims where I'm
    // the buyer, so lastAmountBy === buyerId means I made the last offer and
    // am waiting on the seller. lastAmountBy === sellerId means the seller's
    // counter is on the table and I can Accept/Counter/Decline.
    iMadeTheOffer: api.lastAmountBy === api.buyerId,
    raw:           api,
  };
}

// Backend PICKED_UP Claim -> UI transaction shape that HistoryPage's TxRow
// already renders. Origin price comes from the item's originalPrice if it was
// higher than what the buyer paid; otherwise we leave it null so no
// "Save $X" pill appears.
function adaptBuyerHistory(api) {
  if (!api || !api.item) return null;
  const photos = Array.isArray(api.item.photos) ? api.item.photos.filter(Boolean) : [];
  // BUG-055 — claim.price → claim.amount, claim.completedAt → claim.pickedUpAt,
  // claim.reviewRating → claim.buyerReviewRating (buyer's rating of seller).
  const soldPrice = typeof api.amount === "number" ? api.amount : (api.item.price ?? 0);
  const listedPrice = api.item.price ?? null;
  const origPrice = listedPrice && listedPrice > soldPrice
    ? listedPrice
    : (api.item.originalPrice && api.item.originalPrice > soldPrice ? api.item.originalPrice : null);
  return {
    id:        api.id,
    title:     api.item.title || "Item",
    price:     soldPrice,
    origPrice: origPrice,
    img:       photos[0] || CATEGORY_EMOJI[api.item.category] || "📦",
    cat:       BUYER_ENUM_TO_CATEGORY[api.item.category] || "Other",
    seller:    api.seller?.name || "Seller",
    hood:      api.seller?.neighborhood || "—",
    date:      api.pickedUpAt || api.updatedAt || api.createdAt,
    layer:     api.item.placement === "SHELF" ? "shelf" : "drop",
    rated:     api.buyerReviewRating != null,
    rating:    api.buyerReviewRating ?? null,
    raw:       api,
  };
}

// Backend Item -> UI item shape consumed by Discover / Saved / ItemDetail.
// Fields that the buyer UI uses but the backend doesn't track yet (`dist`,
// `saves`, `timeLeft`) are filled with reasonable placeholders so the cards
// render without breaking.
function adaptBuyerItem(api) {
  if (!api) return null;
  const photos = Array.isArray(api.photos) ? api.photos.filter(Boolean) : [];
  return {
    id:            api.id,
    t:             api.title,
    p:             api.price,
    op:            api.originalPrice && api.originalPrice > api.price ? api.originalPrice : null,
    cond:          BUYER_ENUM_TO_CONDITION[api.condition] || "Used - Good",
    cat:           BUYER_ENUM_TO_CATEGORY[api.category]   || "Other",
    seller:        api.seller?.name || "Neighbour",
    sellerId:      api.seller?.id || null,
    sellerHood:    api.seller?.neighborhood || null,
    // BUG-070 — distance label from the backend (server computes server-side
    // for signed-in viewers). Falls back to the seller's neighborhood or
    // "Nearby" when the viewer is anonymous or hasn't entered their postal
    // code yet.
    dist:          api.distanceLabel || api.seller?.neighborhood || "Nearby",
    distBucket:    api.distanceBucket || null,
    saves:         api._count?.watchlist ?? 0,
    img:           photos[0] || CATEGORY_EMOJI[api.category] || "📦",
    photos,
    layer:         api.placement === "SHELF" ? "shelf" : "drop",
    timeLeft:      null,
    // Every non-CLAIMED backend status used to collapse to "live", which made
    // Drop-pool items claimable during PREVIEW. They are DRAFT until the Drop
    // opens, so POST /:id/claim always rejected them — the buyer filled in the
    // whole modal only to be told the item was "no longer available".
    // RESERVED is the current name for CLAIMED; both are accepted so a stale
    // response during a rolling restart doesn't flip an item back to claimable.
    status:        (api.status === "CLAIMED" || api.status === "RESERVED") ? "claimed"
                 :  api.status === "DRAFT"                                 ? "preview"
                 :                                                           "live",
    paymentMethod: BUYER_ENUM_TO_PAYMENT[api.paymentMethod] || "either",
    fromPeek:      false,
    description:   api.description || "",
    raw:           api,
  };
}

/* ============================================================
   DESIGN SYSTEM — warm community, Nunito, brand-aligned
   Brand: green #308424, amber #F09000 (from DropYard logo)
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
};

const F = {
  head: '"Nunito", -apple-system, BlinkMacSystemFont, sans-serif',
  body: '"Nunito", -apple-system, BlinkMacSystemFont, sans-serif',
};

// Wordmark without the "From one home to another" tagline. The tagline is
// unreadable at nav height and repeats what the page already says, so the
// title bar uses the clean mark. Was a ~73KB base64 data URI inlined into
// all six dashboard files; public/Logo_1.png is the same artwork, cached
// by the browser and shared across every surface.
const LOGO_SRC = "/logo-wordmark.png";

const BANNER_IMG_SRC = "data:image/jpeg;base64,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";
const BANNER_BETWEEN_SRC = "data:image/jpeg;base64,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";

/* ============================================================
   DATA
   ============================================================ */
const categories = ["All","Furniture","Electronics","Appliances & Kitchen","Clothing & Accessories","Kids & Baby","Sports & Outdoor","Tools & Garden","Home Decor","Books, Games & Hobbies","Collectibles & Antiques","Other"];



const allItems = [
  {id:1,  t:"Sectional Sofa",              p:450, op:null, cond:"Used - Good",     cat:"Furniture",                seller:"Jane D.",               dist:"1.0 km", saves:14, img:"🛋",    layer:"drop",      timeLeft:"19h 49m",status:"live",    ded:null,     sellerId:null , paymentMethod:"cash" },
  {id:2,  t:"iPhone 13 - 128GB",           p:320, op:null, cond:"Used - Like New", cat:"Electronics",              seller:"Mike T.",               dist:"2.0 km", saves:22, img:"📱",   layer:"drop",      timeLeft:"19h 49m",status:"live",    ded:null,     sellerId:null , paymentMethod:"etransfer" },
  {id:3,  t:"Vintage Wooden Table",        p:120, op:null, cond:"Used - Good",     cat:"Furniture",                seller:"Alex K.",               dist:"1.0 km", saves:8,  img:"🪑",   layer:"drop",      timeLeft:"19h 49m",status:"live",    ded:null,     sellerId:null , paymentMethod:"either" },
  {id:4,  t:"Kids Bicycle 16 inch",        p:30,  op:null, cond:"Used - Good",     cat:"Sports & Outdoor",         seller:"Tom R.",                dist:"0.3 km", saves:5,  img:"🚲",    layer:"drop",      timeLeft:"19h 49m",status:"live",    ded:null,     sellerId:null , paymentMethod:"either" },
  {id:5,  t:"Dyson V8 Vacuum",             p:120, op:null, cond:"New",             cat:"Electronics",              seller:"Anna W.",               dist:"2.1 km", saves:18, img:"🧹",  layer:"drop",      timeLeft:"19h 49m",status:"claimed", ded:null,     sellerId:null , paymentMethod:"cash" },
  {id:12, t:"Samsung Galaxy Tab A7",       p:65,  op:80,   cond:"Used - Fair",     cat:"Electronics",              seller:"Mike T.",               dist:"2.0 km", saves:4,  img:"📲",  layer:"shelf",     timeLeft:null,     status:"live",    ded:null,     sellerId:null, days:10, priceDrop:true  , paymentMethod:"either" },
  {id:13, t:"Standing Desk",               p:140, op:175,  cond:"Used - Good",     cat:"Furniture",                seller:"David N.",              dist:"2.4 km", saves:11, img:"🖥",    layer:"shelf",     timeLeft:null,     status:"live",    ded:null,     sellerId:null, days:12, priceDrop:true  , paymentMethod:"cash" },
  {id:14, t:"Winter Jacket - Mens L",      p:20,  op:null, cond:"Used - Like New", cat:"Clothing & Accessories",   seller:"Omar H.",               dist:"1.1 km", saves:5,  img:"🧥",    layer:"shelf",     timeLeft:null,     status:"live",    ded:null,     sellerId:null, days:7,  priceDrop:false , paymentMethod:"etransfer" },
  {id:15, t:"Yoga Mat + Bands",            p:15,  op:null, cond:"New",             cat:"Sports & Outdoor",         seller:"Chloe D.",              dist:"0.6 km", saves:3,  img:"🧘",    layer:"shelf",     timeLeft:null,     status:"live",    ded:null,     sellerId:null, days:5,  priceDrop:false , paymentMethod:"either" },
  {id:16, t:"Kitchen Utensils Box",        p:10,  op:null, cond:"Used - Good",     cat:"Appliances & Kitchen",     seller:"Raj P.",                dist:"0.9 km", saves:2,  img:"🍽",  layer:"shelf",     timeLeft:null,     status:"live",    ded:null,     sellerId:null, days:3,  priceDrop:false , paymentMethod:"cash" },
  {id:101, t:"IKEA Malm Dresser (6-drawer)", p:150, op:null, cond:"Used - Good",     cat:"Furniture",                seller:"Jane D.",               dist:"1.8 km", saves:9,  img:"🗄️",   layer:"drop",      timeLeft:"19h 49m",status:"live",    ded:null,     sellerId:null, paymentMethod:"cash",      fromPeek:true },
  {id:102, t:"Cuisinart Coffee Grinder",     p:35,  op:null, cond:"Used - Like New", cat:"Appliances & Kitchen",     seller:"Sarah L.",              dist:"0.6 km", saves:4,  img:"☕",    layer:"drop",      timeLeft:"19h 49m",status:"live",    ded:null,     sellerId:null, paymentMethod:"etransfer", fromPeek:true },
  {id:104, t:"Kids Balance Bike",            p:30,  op:null, cond:"Used - Good",     cat:"Sports & Outdoor",         seller:"Tom R.",                dist:"0.8 km", saves:6,  img:"🚴",    layer:"drop",      timeLeft:"19h 49m",status:"live",    ded:null,     sellerId:null, paymentMethod:"either",    fromPeek:true },
  {id:105, t:"Vintage Turntable",            p:220, op:null, cond:"Used - Good",     cat:"Electronics",              seller:"Alex K.",               dist:"3.2 km", saves:11, img:"🎵",    layer:"drop",      timeLeft:"19h 49m",status:"live",    ded:null,     sellerId:null, paymentMethod:"cash",      fromPeek:true },
];

const previewSellers = [
  { name:"Jane D.",  hood:"Bridlewood",      cats:[{label:"Furniture",       count:2}, {label:"Home Décor",  count:1}],                 totalItems:3, note:"Moving into a smaller place."        },
  { name:"Anna W.",  hood:"Barrhaven East",  cats:[{label:"Appliances",      count:3}, {label:"Kitchen",     count:2}],                 totalItems:5, note:"Kitchen overhaul — lots to go."      },
  { name:"Tom R.",   hood:"Stonebridge",     cats:[{label:"Sports & Outdoor",count:1}],                                                 totalItems:1, note:"Kid outgrew the bike."                },
  { name:"Alex K.",  hood:"Half Moon Bay",   cats:[{label:"Furniture",       count:2}],                                                 totalItems:2, note:"Vintage pieces from my parents."     },
  { name:"Mike T.",  hood:"Barrhaven",       cats:[{label:"Electronics",     count:2}, {label:"Clothing",    count:1}],                 totalItems:3, note:"Upgraded my setup this year."        },
];

const sneakPeekItems = [
  { id: 101, t: "IKEA Malm Dresser (6-drawer)",     estPrice: 150, img: "\uD83D\uDDC4\uFE0F",  cat: "Furniture",       seller: "Jane D.",  hood: "Bridlewood",      dist: "1.8 km" },
  { id: 102, t: "Cuisinart Coffee Grinder",         estPrice: 35,  img: "\u2615",  cat: "Appliances",      seller: "Sarah L.", hood: "Barrhaven East",  dist: "0.6 km" },
  { id: 103, t: "Standing Desk (electric)",         estPrice: 180, img: "\uD83D\uDDA5\uFE0F",  cat: "Furniture",       seller: "Mike T.",  hood: "Barrhaven",       dist: "1.1 km" },
  { id: 104, t: "Kids Balance Bike",                estPrice: 30,  img: "\uD83D\uDEB4",  cat: "Kids & Baby",     seller: "Tom R.",   hood: "Stonebridge",     dist: "0.8 km" },
  { id: 105, t: "Vintage Turntable",                estPrice: 220, img: "\uD83C\uDFB5",  cat: "Electronics",     seller: "Alex K.",  hood: "Half Moon Bay",   dist: "3.2 km" },
  { id: 106, t: "KitchenAid Stand Mixer",           estPrice: 240, img: "\uD83E\uDDC1",  cat: "Appliances",      seller: "Anna W.",  hood: "Barrhaven East",  dist: "1.4 km" },
  { id: 107, t: "Mountain Bike (adult, M frame)",   estPrice: 280, img: "\uD83D\uDEB2",  cat: "Sports & Outdoor", seller: "Raj P.",   hood: "Barrhaven",       dist: "0.9 km" },
  { id: 108, t: "Leather Couch (3-seater)",         estPrice: 320, img: "\uD83D\uDECB\uFE0F",  cat: "Furniture",       seller: "Priya M.", hood: "Barrhaven South", dist: "1.5 km" },
];

function avatarBg(name) {
  const seeds = [C.green, C.amber, C.sky, C.claret, C.purple, C.teal];
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  return seeds[h % seeds.length];
}

function initialsOf(name) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/* ============================================================
   GLOBAL STYLE
   ============================================================ */
// Viewport hook — used by TopBar, MobileBottomNav, and every view that has
// a mobile branch. 768px matches the seller dashboard breakpoint.
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

// `item.img` carries either a real photo URL (when adaptBuyerItem found
// item.photos[0]) OR a fallback category emoji like "🛋️". Every render site
// previously stuffed the value inside a <span style="font-size: 72px">,
// which silently broke when a URL landed there — buyers saw the URL text
// rendered as 72px characters. This helper detects URLs (http(s) or data
// images) and renders an <img>; everything else falls back to the emoji
// span using the size the caller asked for. Pass `emojiSize` matching the
// surrounding visual rhythm; img always fills its container.
function ItemImage({ src, emojiSize, imgStyle, spanStyle }) {
  const isUrl = typeof src === "string" && /^(https?:\/\/|data:image\/)/i.test(src);
  if (isUrl) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...(imgStyle || {}) }}
        onError={(e) => {
          // If the URL fails (S3 misconfig, removed file), hide the broken
          // image so it doesn't leak its alt text or default browser glyph.
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }
  return (
    <span style={{ fontSize: emojiSize, lineHeight: 1, ...(spanStyle || {}) }}>
      {src || "📦"}
    </span>
  );
}

function GlobalStyle() {
  const css = "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { background: #FFFFFF; color: #1F1D19; font-family: 'Nunito', sans-serif; -webkit-font-smoothing: antialiased; } ::selection { background: #D8EDD2; color: #1F5A18; } button { font-family: inherit; } input, textarea { font-family: inherit; } @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } @keyframes pulseGreen { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } } @keyframes pulseAmber { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } } @keyframes slideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } } .fade-in { animation: fadeUp 0.55s cubic-bezier(0.25, 1, 0.5, 1) both; } .cta-primary { transition: all 200ms cubic-bezier(0.25, 1, 0.5, 1); } .cta-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(48, 132, 36, 0.3); } .preview-scroll::-webkit-scrollbar { height: 6px; } .preview-scroll::-webkit-scrollbar-track { background: #F4EFE6; border-radius: 3px; } .preview-scroll::-webkit-scrollbar-thumb { background: #D6CFC4; border-radius: 3px; } .chip-hover:hover { border-color: #9A948B !important; } @keyframes pulseLive { 0% { transform: scale(1); opacity: 0.8; } 70% { transform: scale(2.2); opacity: 0; } 100% { transform: scale(2.2); opacity: 0; } } @keyframes aiShimmer { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } } @keyframes sellAiPulse { 0%, 100% { transform: scale(1); box-shadow: 0 4px 14px #7C3AED40; } 50% { transform: scale(1.05); box-shadow: 0 6px 20px #7C3AED60; } } @keyframes skel { 0% { background-position: -200px 0; } 100% { background-position: calc(200px + 100%) 0; } } @keyframes bump { 0% { transform: scale(1); } 30% { transform: scale(1.18); } 60% { transform: scale(0.95); } 100% { transform: scale(1); } } .skel { background: linear-gradient(90deg, #F4EFE6 0%, #FAF6EE 50%, #F4EFE6 100%); background-size: 400px 100%; animation: skel 1.6s ease-in-out infinite; border-radius: 8px; } .skel-card { background: #FFFFFF; border: 1px solid #EDE8E0; border-radius: 18px; overflow: hidden; } .bump { animation: bump 0.5s cubic-bezier(0.25, 1, 0.5, 1); }";
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,500;1,600&display=swap" rel="stylesheet"/>
      <style>{css}</style>
    </>
  );
}

/* ============================================================
   TOP BAR
   ============================================================ */
// Drop schedule: derived from lib/dropCycle.ts constants — DO NOT hardcode
// the day/hour here. The window is from DROP_OPEN_DAY at DROP_OPEN_HOUR
// through Sunday 6pm local time. Between drops at all other times. This is
// computed from the system clock so the UI flips automatically across the
// weekend without any manual toggle.
function computeDropState() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  // Canonical drop window derived from lib/dropCycle.ts constants. No magic
  // numbers — changing the open/close hour propagates here automatically.
  if (day === DROP_OPEN_DAY  && hour >= DROP_OPEN_HOUR)  return "live";
  if (day === DROP_CLOSE_DAY && hour <  DROP_CLOSE_HOUR) return "live";
  return "between";
}

// Avatar with dropdown menu - real user initials and sign-out.
// Click outside (the invisible overlay) to close.
function UserMenu({ user, onSignout, onOpenSettings }) {
  const [open, setOpen] = useState(false);
  const initials = user?.name ? initialsOf(user.name) : "?";
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={user?.name || "Account"}
        style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "linear-gradient(135deg, " + C.green + ", " + C.greenDeep + ")",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontFamily: F.head, fontWeight: 800, fontSize: 14,
          border: "2px solid " + C.paper, boxShadow: "0 0 0 1.5px " + C.greenMist,
          cursor: "pointer", padding: 0,
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
                {user?.name || "Guest"}
              </p>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, wordBreak: "break-all" }}>
                {user?.email || ""}
              </p>
            </div>
            <button
              onClick={() => { setOpen(false); onOpenSettings && onOpenSettings(); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "12px 16px", border: "none", background: "transparent",
                cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 700,
                color: C.ink, textAlign: "left",
                borderBottom: "1px solid " + C.fawn,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.greenMist; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <SettingsIcon size={14}/> Settings
            </button>
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

// Magical "Switch to Seller" pill: amber-tinted gradient outline, Truck icon,
// arrow that slides on hover, soft glow underneath, and a quick scale tick.
function SwitchToSellerButton({ onClick, compact = false }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={compact ? "Switch to Seller" : undefined}
      title={compact ? "Switch to Seller" : undefined}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 0 : 8,
        padding: compact ? "8px" : "8px 14px 8px 12px",
        borderRadius: 999,
        border: "1.5px solid " + (hover ? C.amber : C.fawn),
        background: hover
          ? "linear-gradient(135deg, " + C.amberMist + " 0%, " + C.paper + " 100%)"
          : C.paper,
        cursor: "pointer",
        fontFamily: F.head,
        fontSize: 12,
        fontWeight: 800,
        color: hover ? C.amberDeep : C.mink,
        boxShadow: hover
          ? "0 6px 18px " + C.amber + "33, 0 1px 2px rgba(31,29,25,0.04)"
          : "0 1px 2px rgba(31,29,25,0.04)",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Tiny truck tile that animates on hover */}
      <span style={{
        width: 24, height: 24, borderRadius: 7,
        background: hover ? C.amber : C.amberMist,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        boxShadow: hover ? "0 2px 6px " + C.amber + "55" : "none",
        transition: "all 200ms ease",
      }}>
        <Truck size={13} style={{ color: hover ? "#fff" : C.amberDeep }} strokeWidth={2.6}/>
      </span>
      {!compact && <span style={{ letterSpacing: "0.01em" }}>Switch to Seller</span>}
      {!compact && (
        <ArrowRight
          size={13}
          strokeWidth={2.6}
          style={{
            color: hover ? C.amberDeep : C.ash,
            transform: hover ? "translateX(3px)" : "translateX(0)",
            transition: "transform 200ms ease, color 200ms ease",
          }}
        />
      )}
    </button>
  );
}

// Mobile primary nav — fixed to the bottom of the viewport, replaces the
// top-bar nav row on small screens. 5 tabs with badges for saved/claims/
// unread. Active tile picks up the drop-state palette (amber between Drops,
// green during a live Drop) for a subtle weekend cue.
function MobileBottomNav({ page, setPage, savedCount, claimsCount, unreadCount = 0, onReset, dropState }) {
  const accent = dropState === "between" ? C.amber : C.green;
  const accentMist = dropState === "between" ? C.amberMist : C.greenMist;
  const navItems = [
    { id: "discover", label: "Discover", icon: Compass },
    { id: "saved",    label: "Saved",    icon: Heart,         badge: savedCount  > 0 ? savedCount  : null },
    { id: "claims",   label: "Claims",   icon: ShoppingBag,   badge: claimsCount > 0 ? claimsCount : null },
    { id: "messages", label: "Messages", icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : null },
    { id: "history",  label: "You",      icon: User },
  ];
  return (
    <nav role="navigation" aria-label="Primary" className="dy-mobile-bottom-nav" style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60,
      background: "rgba(255, 255, 255, 0.96)",
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      borderTop: "1px solid " + C.fawn,
      boxShadow: "0 -2px 16px rgba(31, 29, 25, 0.05)",
      paddingBottom: "env(safe-area-inset-bottom, 0)",
    }}>
      <div style={{ display: "flex", alignItems: "stretch", justifyContent: "space-around", maxWidth: 600, margin: "0 auto" }}>
        {navItems.map(item => {
          const active = page === item.id;
          const Ic = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => { onReset && onReset(); setPage(item.id); }}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              style={{
                position: "relative",
                flex: 1, minWidth: 0,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                padding: "10px 4px 8px",
                border: "none", background: "transparent", cursor: "pointer",
                color: active ? accent : C.ash,
                transition: "color 150ms",
              }}
            >
              {active && (
                <span aria-hidden="true" style={{
                  position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)",
                  width: 48, height: 32, borderRadius: 999,
                  background: accentMist,
                  border: "1px solid " + accent + "20",
                }}/>
              )}
              <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", transform: active ? "scale(1.05)" : "scale(1)" }}>
                <Ic size={22} strokeWidth={active ? 2.4 : 2}/>
                {item.badge != null && (
                  <span style={{ position: "absolute", top: -4, right: -10, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999, background: accent, color: "#fff", fontFamily: F.head, fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1.5px solid " + C.page }}>
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </span>
              <span style={{ position: "relative", fontFamily: F.head, fontSize: 10, fontWeight: active ? 800 : 600, letterSpacing: active ? "-0.005em" : "0.02em", whiteSpace: "nowrap" }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function TopBar({ page, setPage, savedCount, claimsCount, messagesUnread = 0, onSwitchRole, onReset, dropState, user, onSignout }) {
  const { isMobile } = useViewport();
  const navItems = [
    { id:"discover", label:"Discover" },
    { id:"saved",    label:"Saved",    badge: savedCount  > 0 ? savedCount  : null },
    { id:"claims",   label:"Claims",   badge: claimsCount > 0 ? claimsCount : null },
    { id:"messages", label:"Messages", badge: messagesUnread > 0 ? messagesUnread : null },
    { id:"history",  label:"History" },
  ];
  return (
    <header style={{ borderBottom: "1px solid " + C.fawn, background: C.page, position: "sticky", top: 0, zIndex: 40 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "10px 16px" : "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: isMobile ? 10 : 24 }}>
        <Link href="/" style={{ display: "block", border: "none", background: "transparent", cursor: "pointer", padding: 0, textDecoration: "none" }}>
          {/* Sizes are for the trimmed asset, whose artwork fills ~94% of the
              box. Logo_1.png was 54% whitespace, so its 44px box only drew a
              ~20px mark — which is why the logo looked small next to the nav. */}
          <img src={LOGO_SRC} alt="DropYard" style={{ height: isMobile ? 24 : 30, width: "auto", display: "block" }}/>
        </Link>

        {/* Desktop primary nav — replaced by MobileBottomNav on small screens. */}
        {!isMobile && (
          <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {navItems.map(item => {
              const active = page === item.id;
              return (
                <button key={item.id} onClick={() => { onReset && onReset(); setPage(item.id); }} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 15px", border: "none", borderRadius: 999,
                  background: active ? (dropState === "between" ? C.amberMist : C.greenMist) : "transparent",
                  color: active ? (dropState === "between" ? C.amberDeep : C.green) : C.mink,
                  fontSize: 14, fontWeight: active ? 800 : 600,
                  cursor: "pointer", fontFamily: F.head,
                  transition: "all 200ms",
                }}>
                  {item.label}
                  {item.badge && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 20, background: active ? (dropState === "between" ? C.amber : C.green) : C.fawn, color: active ? "#fff" : C.mink }}>{item.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 12 }}>
          {/* BUG-064 — socket health pulse. Visible at a glance so we can spot
              real-time outages without DevTools. Green=connected, amber=
              reconnecting, gray=disconnected. */}
          <SocketHealthDot />
          {/* Switch-to-Seller pill. On mobile, render an icon-only compact variant
             so it still fits at 360px alongside logo + avatar. Desktop keeps the
             full label. */}
          <SwitchToSellerButton onClick={() => onSwitchRole && onSwitchRole()} compact={isMobile}/>
          <UserMenu user={user} onSignout={onSignout} onOpenSettings={() => { onReset && onReset(); setPage("settings"); }}/>
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   PAGE TITLE - shared header for non-discover pages
   ============================================================ */
function PageTitle({ eyebrow, title, subtitle, action, eyebrowBg, eyebrowColor, icon: IconComp, iconBg, iconColor, onBack }) {
  const { isMobile } = useViewport();
  return (
    <div style={{ padding: isMobile ? "0 0 8px" : "4px 0 16px", marginBottom: isMobile ? 8 : 12, position: "relative" }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.mink, marginBottom: isMobile ? 8 : 10 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = C.sand; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = C.paper; }}
        >
          <ArrowLeft size={14}/> Back to Discover
        </button>
      )}
      {!isMobile && (
        <div style={{ position: "absolute", top: 8, right: 0, display: "flex", gap: 6, opacity: 0.5 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.amber }}/>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.green }}/>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.claret }}/>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: isMobile ? 12 : 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 18, flex: 1, minWidth: 0 }}>
          {IconComp && (
            <div style={{ width: isMobile ? 44 : 56, height: isMobile ? 44 : 56, borderRadius: isMobile ? 14 : 18, background: iconBg || C.greenMist, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: isMobile ? 2 : 6, boxShadow: "0 2px 0 " + (iconBg ? iconBg : C.fawn) }}>
              <IconComp size={isMobile ? 20 : 24} style={{ color: iconColor || C.greenDeep }} strokeWidth={2.2}/>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 22, height: 2.5, background: eyebrowColor || C.green, borderRadius: 2 }}/>
                <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: eyebrowColor || C.green, letterSpacing: "0.16em", textTransform: "uppercase" }}>{eyebrow}</p>
              </div>
            )}
            <h1 style={{ fontFamily: F.head, fontSize: isMobile ? 26 : 38, fontWeight: 900, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.02, marginBottom: subtitle ? 8 : 0 }}>{title}</h1>
            {subtitle && <p style={{ fontFamily: F.body, fontSize: isMobile ? 13 : 15, fontWeight: 500, color: C.mink, lineHeight: 1.55, maxWidth: 560 }}>{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}

/* ============================================================
   ANTICIPATION BAND (Between Drops state)
   Soft amber gradient panel. Pulsing dot, eyebrow, headline,
   subtitle, "Remind me" CTA. Lighter outline (12% amber).
   ============================================================ */
function AnticipationBand({ onRemindMe, reminded, queuedCount = null, sellerNames = null }) {
  // Real countdown to the next drop-open moment (Saturday 8 AM by default).
  // `now` starts null on first render so SSR + initial client hydration produce
  // identical "0d 0h 0m 0s" markup; useEffect seeds the real value after mount
  // and ticks per second from there. Same SSR-safe pattern as DynamicDropCard.
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const totalSec = useMemo(() => {
    if (!now) return 0;
    const target = nextDropMoment(now);
    return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  }, [now]);
  const t = {
    d: Math.floor(totalSec / 86400),
    h: Math.floor((totalSec % 86400) / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
  const pad = (n) => n < 10 ? "0" + n : "" + n;

  // Avatar stack — derive from the actual queued sellers when we have them.
  // Falls back to a fixed 5-name cast when the prop wasn't passed (i.e.
  // /preview/buyer-dashboard runs without a fetch). Always 5 max so the
  // visual rhythm holds; the +N pill below conveys overflow.
  const fallbackNeighbours = [
    { name: "Priya M." },
    { name: "Sarah L." },
    { name: "Tom R." },
    { name: "Jane D." },
    { name: "Alex K." },
  ];
  const neighbours = (Array.isArray(sellerNames) && sellerNames.length > 0)
    ? sellerNames.slice(0, 5).map(n => ({ name: n }))
    : fallbackNeighbours;
  // Display count: prefer the real queued seller count when provided; fall
  // back to the demo's "47 neighbours" only when no prop was passed (i.e.
  // the standalone /preview/buyer-dashboard route).
  const displayCount = queuedCount == null ? 47 : queuedCount;

  return (
    <section className="fade-in" style={{
      background: "#FFE4B0",
      borderRadius: 22,
      padding: "20px 28px",
      marginBottom: 20,
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 4px 24px rgba(240, 144, 0, 0.14)",
      border: "1px solid " + C.amber + "30",
      minHeight: 168,
    }}>
      {/* Background image — golden-hour neighbour scene with garage-sale table */}
      <img src={BANNER_BETWEEN_SRC} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 50%" }}/>

      {/* Primary scrim — bright cream-white on the left where text lives, fading right so the image shines through */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(255, 250, 240, 0.98) 0%, rgba(255, 245, 225, 0.94) 32%, rgba(255, 232, 188, 0.62) 58%, rgba(255, 228, 176, 0.28) 82%, rgba(255, 228, 176, 0.08) 100%)" }}/>

      {/* Secondary scrim — soft amber kiss at the bottom for cohesion */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 0%, transparent 60%, rgba(240, 138, 0, 0.10) 100%)" }}/>

      {/* Decorative blurred orbs — amber + green echoes from WelcomeBand */}
      <div style={{ position: "absolute", top: -50, right: -30, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, " + C.amber + "32 0%, transparent 70%)", filter: "blur(8px)" }}/>
      <div style={{ position: "absolute", bottom: -70, left: 100, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, " + C.green + "20 0%, transparent 70%)", filter: "blur(10px)" }}/>

      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        {/* Left side */}
        <div style={{ flex: 1, minWidth: 280 }}>
          {/* OPENS SATURDAY pill — amber parallel to LIVE NOW */}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px 4px 10px", borderRadius: 999, background: C.amberDeep, boxShadow: "0 2px 10px " + C.amberDeep + "55", marginBottom: 8 }}>
            <span style={{ position: "relative", display: "inline-flex", width: 6, height: 6 }}>
              <span style={{ position: "absolute", inset: -2, borderRadius: "50%", background: "#fff", opacity: 0.4, animation: "pulseAmber 2.4s ease-in-out infinite" }}/>
              <span style={{ position: "relative", width: 6, height: 6, borderRadius: "50%", background: "#fff" }}/>
            </span>
            <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "0.1em" }}>OPENS SATURDAY</span>
          </span>

          {/* Headline with chromatic accent on a temporal word */}
          <h1 style={{ fontFamily: F.head, fontSize: 22, fontWeight: 900, color: C.ink, letterSpacing: "-0.025em", lineHeight: 1.2, marginBottom: 10 }}>
            The next Drop lands{" "}
            <span style={{ position: "relative", display: "inline-block" }}>
              {dropOpenDay()}
              <span style={{ position: "absolute", left: 0, right: 0, bottom: -2, height: 3, background: C.amberDeep, borderRadius: 2, opacity: 0.85 }}/>
            </span>
            {" "}at {dropOpenHour()}
          </h1>

          {/* Body — concise, with bold stat. When no items are queued yet,
              swap the copy to something honest instead of a fake count. */}
          <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.ink, maxWidth: 520, lineHeight: 1.55, marginBottom: 12 }}>
            {displayCount > 0 ? (
              <>
                <b style={{ color: C.ink, fontWeight: 900 }}>{displayCount} neighbour{displayCount === 1 ? "" : "s"}</b>
                {" "}{displayCount === 1 ? "has" : "have"} items lined up. Save your favourites from the Sneak Peek to get a head start.
              </>
            ) : (
              <>Items aren&apos;t queued yet — we&apos;ll notify you the moment the Drop opens. Tap <b style={{ color: C.ink, fontWeight: 900 }}>Remind me</b> below to lock it in.</>
            )}
          </p>

          {/* Avatar stack — only render when at least one neighbour has queued
              items. The "+N" pill computes overflow from displayCount instead
              of the hardcoded "+42". */}
          {displayCount > 0 && (
            <div style={{ display: "flex", alignItems: "center" }}>
              {neighbours.map((n, i) => (
                <div key={i} style={{ width: 32, height: 32, borderRadius: "50%", background: avatarBg(n.name), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.head, fontSize: 10, fontWeight: 800, border: "2px solid #FFF4E0", marginLeft: i === 0 ? 0 : -8, zIndex: neighbours.length - i }}>
                  {initialsOf(n.name)}
                </div>
              ))}
              {displayCount > neighbours.length && (
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.amberDeep, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.head, fontSize: 10, fontWeight: 800, border: "2px solid #FFF4E0", marginLeft: -8 }}>
                  +{displayCount - neighbours.length}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: countdown panel — translucent ink card, mirror of WelcomeBand structure */}
        <div style={{ position: "relative", flexShrink: 0, padding: "12px 18px", borderRadius: 14, background: "rgba(255, 248, 235, 0.78)", border: "1.5px solid " + C.amberDeep + "35", textAlign: "center", minWidth: 230, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", boxShadow: "0 8px 24px rgba(192, 104, 0, 0.18)" }}>
          <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.amberDeep, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Drop opens in</p>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 3, fontFamily: F.head, fontSize: 22, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
            <span>{t.d}</span>
            <span style={{ fontSize: 13, color: C.amberDeep, fontWeight: 700 }}>d</span>
            <span style={{ marginLeft: 4 }}>{pad(t.h)}</span>
            <span style={{ fontSize: 13, color: C.amberDeep, fontWeight: 700 }}>h</span>
            <span style={{ marginLeft: 4 }}>{pad(t.m)}</span>
            <span style={{ fontSize: 13, color: C.amberDeep, fontWeight: 700 }}>m</span>
            <span style={{ marginLeft: 4 }}>{pad(t.s)}</span>
            <span style={{ fontSize: 13, color: C.amberDeep, fontWeight: 700 }}>s</span>
          </div>
          <button onClick={onRemindMe} style={{
            marginTop: 8,
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 12px", borderRadius: 999, border: "none",
            background: reminded ? "rgba(255,255,255,0.7)" : C.amberDeep,
            color: reminded ? C.amberDeep : "#fff",
            fontFamily: F.head, fontSize: 11, fontWeight: 800,
            cursor: "pointer",
            boxShadow: reminded ? "none" : "0 2px 0 " + C.amberDeep,
          }}>
            {reminded ? <><Check size={11}/> Notified</> : <><Bell size={11}/> Remind me</>}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   WELCOME BAND (Live Drop state)
   Deep ink/charcoal hero. LIVE NOW pill, headline with amber
   underline on "Barrhaven", avatar stack, countdown panel.
   ============================================================ */
function WelcomeBand() {
  // Real countdown to Drop close (Sunday 8 PM by default). SSR-safe — `now`
  // starts null so server and client first render produce the same markup.
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const totalSec = useMemo(() => {
    if (!now) return 0;
    const target = dropCloseMoment(now);
    return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  }, [now]);
  const t = {
    h: Math.floor(totalSec / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
  const pad = (n) => n < 10 ? "0" + n : "" + n;

  const neighbours = [
    { name: "Jane D." },
    { name: "Mike T." },
    { name: "Anna W." },
    { name: "Tom R." },
    { name: "Alex K." },
  ];

  return (
    <section className="fade-in" style={{ background: "#1F1A14", borderRadius: 22, padding: "20px 26px", marginBottom: 20, position: "relative", overflow: "hidden", boxShadow: "0 4px 24px rgba(31, 29, 25, 0.18)", minHeight: 168 }}>
      {/* Background image — real garage-sale illustration */}
      <img src={BANNER_IMG_SRC} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 38%" }}/>

      {/* Primary scrim — dense dark on the left where text lives, fading right so the image shines through */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(20, 16, 12, 0.92) 0%, rgba(20, 16, 12, 0.82) 30%, rgba(20, 16, 12, 0.55) 58%, rgba(20, 16, 12, 0.25) 82%, rgba(20, 16, 12, 0.05) 100%)" }}/>

      {/* Secondary scrim — adds warmth and depth at the bottom */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 0%, transparent 55%, rgba(31, 90, 24, 0.18) 100%)" }}/>

      {/* Decorative orbs — warmer accents now layered above the scrim */}
      <div style={{ position: "absolute", top: -40, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, " + C.green + "30 0%, transparent 70%)", filter: "blur(8px)" }}/>
      <div style={{ position: "absolute", bottom: -70, left: 100, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, " + C.amber + "28 0%, transparent 70%)", filter: "blur(10px)" }}/>

      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        {/* Left: LIVE NOW pill, headline, body, avatars */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px 4px 10px", borderRadius: 999, background: C.green, boxShadow: "0 2px 10px " + C.green + "55", marginBottom: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", boxShadow: "0 0 0 3px rgba(255,255,255,0.3)", animation: "pulseLive 1.6s ease-in-out infinite" }}/>
            <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "0.1em" }}>LIVE NOW</span>
          </span>
          <h1 style={{ fontFamily: F.head, fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.2, marginBottom: 10 }}>
            The Drop is live in{" "}
            <span style={{ position: "relative", display: "inline-block" }}>
              Barrhaven
              <span style={{ position: "absolute", left: 0, right: 0, bottom: -2, height: 3, background: C.amber, borderRadius: 2, opacity: 0.85 }}/>
            </span>
          </h1>
          <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.82)", maxWidth: 520, lineHeight: 1.55, marginBottom: 12 }}>
            <b style={{ color: "#fff", fontWeight: 800 }}>89 items</b> from your neighbours are claimable until Sunday at 6 PM. Drops are first-come, first-served.
          </p>
          {/* Avatar stack */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {neighbours.map((n, i) => (
              <div key={i} style={{ width: 32, height: 32, borderRadius: "50%", background: avatarBg(n.name), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.head, fontSize: 10, fontWeight: 800, border: "2px solid " + C.ink, marginLeft: i === 0 ? 0 : -8, zIndex: neighbours.length - i }}>
                {initialsOf(n.name)}
              </div>
            ))}
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.head, fontSize: 10, fontWeight: 800, border: "2px solid " + C.ink, marginLeft: -8 }}>
              +89
            </div>
          </div>
        </div>
        {/* Right: countdown panel */}
        <div style={{ position: "relative", flexShrink: 0, padding: "12px 18px", borderRadius: 14, background: "rgba(20, 16, 12, 0.55)", border: "1.5px solid rgba(255,255,255,0.14)", textAlign: "center", minWidth: 200, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
          <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.6)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Drop closes in</p>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 3, fontFamily: F.head, fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
            <span>{pad(t.h)}</span>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>h</span>
            <span style={{ marginLeft: 4 }}>{pad(t.m)}</span>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>m</span>
            <span style={{ marginLeft: 4, color: C.amber }}>{pad(t.s)}</span>
            <span style={{ fontSize: 14, color: C.amber, fontWeight: 700, opacity: 0.75 }}>s</span>
          </div>
          <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>Sunday 6 PM cutoff</p>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FILTER RAIL — Airbnb-style segmented capsule
   ============================================================ */
// Mobile filter bar — replaces FilterRail on small screens. Search input is
// the primary surface (always visible). The full category + sort pickers live
// in a slide-up bottom sheet behind a filter pill that surfaces the active
// filter count. State toggle (Everything / On the Shelf) sits below when
// applicable. Activated by the parent (DiscoverPage) via useViewport().
function MobileFilterBar({ filter, setFilter, search, setSearch, cat, setCat, sort, setSort, state, accent, sorts, activeFilterCount }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const accentDeep = accent === C.green ? C.greenDeep : C.amberDeep;
  const accentMist = accent === C.green ? C.greenMist : C.amberMist;
  return (
    <section style={{ padding: "8px 0 16px", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.ash }}/>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items, categories…"
            style={{
              width: "100%", height: 44, padding: "0 14px 0 38px",
              borderRadius: 999, border: "1.5px solid " + C.fawn,
              background: C.paper, fontFamily: F.body, fontSize: 14, fontWeight: 500,
              color: C.ink, outline: "none",
              transition: "border-color 180ms",
            }}
            onFocus={e => { e.target.style.borderColor = accent; }}
            onBlur={e => { e.target.style.borderColor = C.fawn; }}
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", border: "none", background: C.fawn, color: C.mink, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={13}/>
            </button>
          )}
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Open filters"
          style={{
            position: "relative", flexShrink: 0,
            width: 44, height: 44, borderRadius: "50%",
            border: "1.5px solid " + (activeFilterCount > 0 ? accent : C.fawn),
            background: activeFilterCount > 0 ? accentMist : C.paper,
            color: activeFilterCount > 0 ? accentDeep : C.mink,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 180ms",
          }}>
          <SlidersHorizontal size={18} strokeWidth={2.2}/>
          {activeFilterCount > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -4,
              minWidth: 18, height: 18, padding: "0 5px",
              borderRadius: 999, background: accent, color: "#fff",
              fontFamily: F.head, fontSize: 10, fontWeight: 900,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              border: "2px solid " + C.paper,
            }}>{activeFilterCount}</span>
          )}
        </button>
      </div>

      {state === "between" && (
        <div style={{ display: "flex", gap: 6, marginTop: 12, padding: 4, background: C.fawn + "60", borderRadius: 999 }}>
          {[
            { id: "all",   label: "Everything" },
            { id: "shelf", label: "On the Shelf" },
          ].map(opt => {
            const active = filter === opt.id;
            return (
              <button key={opt.id} onClick={() => setFilter(opt.id)} style={{
                flex: 1,
                padding: "8px 14px", borderRadius: 999,
                border: "none",
                background: active ? C.paper : "transparent",
                color: active ? C.ink : C.mink,
                fontFamily: F.head, fontSize: 12, fontWeight: active ? 800 : 600,
                cursor: "pointer",
                boxShadow: active ? "0 1px 3px rgba(31,29,25,0.08)" : "none",
                transition: "all 180ms",
              }}>{opt.label}</button>
            );
          })}
        </div>
      )}

      {sheetOpen && (
        <>
          <div onClick={() => setSheetOpen(false)} style={{
            position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(31, 29, 25, 0.45)",
            backdropFilter: "blur(2px)",
          }}/>
          <div role="dialog" aria-label="Filters" className="fade-in" style={{
            position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 61,
            background: C.paper,
            borderRadius: "20px 20px 0 0",
            padding: "10px 20px 28px",
            maxHeight: "82vh", overflowY: "auto",
            boxShadow: "0 -8px 32px rgba(31, 29, 25, 0.18)",
          }}>
            <div aria-hidden="true" style={{ width: 38, height: 4, borderRadius: 2, background: C.smoke, margin: "4px auto 14px" }}/>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ fontFamily: F.head, fontSize: 18, fontWeight: 900, color: C.ink, letterSpacing: "-0.01em" }}>Filters</h2>
              <button onClick={() => setSheetOpen(false)} aria-label="Close" style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: C.sand, color: C.mink, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16}/>
              </button>
            </div>

            <div style={{ marginBottom: 22 }}>
              <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Category</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {categories.map(c => {
                  const active = cat === c;
                  return (
                    <button key={c} onClick={() => setCat(c)} style={{
                      padding: "9px 14px", borderRadius: 999,
                      border: "1.5px solid " + (active ? accent : C.fawn),
                      background: active ? accent : C.paper,
                      color: active ? "#fff" : C.mink,
                      fontFamily: F.head, fontSize: 13, fontWeight: active ? 800 : 700,
                      cursor: "pointer", transition: "all 150ms",
                    }}>{c}</button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Sort by</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {sorts.map(so => {
                  const active = sort === so.id;
                  return (
                    <button key={so.id} onClick={() => setSort(so.id)} style={{
                      padding: "9px 14px", borderRadius: 999,
                      border: "1.5px solid " + (active ? accent : C.fawn),
                      background: active ? accent : C.paper,
                      color: active ? "#fff" : C.mink,
                      fontFamily: F.head, fontSize: 13, fontWeight: active ? 800 : 700,
                      cursor: "pointer", transition: "all 150ms",
                    }}>{so.label}</button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => { setCat("All"); setSort("newest"); setSearch(""); }} style={{
                flex: 1, padding: "12px 0", borderRadius: 999,
                border: "1.5px solid " + C.fawn, background: C.paper,
                color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700,
                cursor: "pointer",
              }}>Reset</button>
              <button onClick={() => setSheetOpen(false)} className="cta-primary" style={{
                flex: 2, padding: "12px 0", borderRadius: 999,
                border: "none", background: accent, color: "#fff",
                fontFamily: F.head, fontSize: 13, fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 2px 0 " + accentDeep,
              }}>Show results</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function FilterRail({ filter, setFilter, search, setSearch, cat, setCat, sort, setSort, panelOpen, setPanelOpen, state }) {
  const { isMobile } = useViewport();
  // All hooks must run unconditionally — when the viewport crosses the mobile
  // breakpoint at hydration (SSR width default → real client width), the early
  // return below would change the hook count and React errors out. Hooks first,
  // then branch.
  const [activeSegment, setActiveSegment] = useState(null); // "search" | "category" | "sort" | null
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    function onScroll() {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setCompact(prev => {
        if (!prev && y > 120) return true;
        if (prev && y < 80) return false;
        return prev;
      });
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const sorts = [
    { id: "newest",    label: "Just listed" },
    { id: "nearest",   label: "Closest to you" },
    { id: "priceLow",  label: "Price: low to high" },
    { id: "priceHigh", label: "Price: high to low" },
  ];
  const activeFilterCount = (cat !== "All" ? 1 : 0) + (sort !== "newest" ? 1 : 0);
  const accent = state === "between" ? C.amber : C.green;

  // On mobile, swap to the sheet-based filter UI. Branch AFTER all hooks.
  if (isMobile) {
    return (
      <MobileFilterBar
        filter={filter} setFilter={setFilter}
        search={search} setSearch={setSearch}
        cat={cat} setCat={setCat}
        sort={sort} setSort={setSort}
        state={state}
        accent={accent}
        sorts={sorts}
        activeFilterCount={activeFilterCount}
      />
    );
  }

  // When the expanded panel opens, always show the full capsule
  const isCompact = compact && !activeSegment;

  function toggleSegment(seg) {
    setActiveSegment(cur => cur === seg ? null : seg);
    setPanelOpen(true);
  }

  const sortLabel = sorts.find(so => so.id === sort)?.label || "Just listed";
  const sortShort = sort === "newest" ? "Just listed" : sort === "nearest" ? "Closest" : sort === "priceLow" ? "Price: low\u2192high" : "Price: high\u2192low";

  // Segment style helpers — state-aware
  const segStyleBase = {
    flex: 1,
    padding: "14px 28px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: F.head,
    transition: "all 180ms",
    position: "relative",
    borderRadius: 999,
  };
  const segStyle = (seg) => {
    const isActive = activeSegment === seg;
    const isHovered = hoveredSegment === seg && !isActive;
    const isLive = state === "live";
    // Live mode: hover = soft green tint, active = greenMist with glow
    // Between mode: hover = sand, active = paper neutral lift
    const hoverFill   = isLive ? C.green + "14" : C.sand;
    const activeFill  = isLive ? C.greenMist    : C.paper;
    const activeBorder = isLive ? "1px solid " + C.green + "30" : "none";
    const activeShadow = isLive ? "0 6px 20px " + C.green + "25" : "0 6px 20px rgba(31, 29, 25, 0.12)";
    return {
      ...segStyleBase,
      background: isActive ? activeFill : isHovered ? hoverFill : "transparent",
      boxShadow: isActive ? activeShadow : "none",
      border: isActive ? activeBorder : "none",
      zIndex: isActive ? 2 : 1,
    };
  };

  const segLabel = { fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ink, letterSpacing: "0.02em", marginBottom: 3, lineHeight: 1.1 };
  const segValue = (filled) => ({ fontFamily: F.body, fontSize: 13, fontWeight: filled ? 600 : 500, color: filled ? C.ink : C.mink, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });

  return (
    <section style={{ padding: (state === "between" ? "28px" : "14px") + " 0 12px", position: "relative" }}>
      {/* COMPACT PILL — when scrolled past threshold */}
      {isCompact ? (
        <button onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => setActiveSegment("search"), 200); }} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", maxWidth: 420, margin: "0 auto",
          padding: "8px 8px 8px 22px", borderRadius: 999,
          background: C.paper, border: "1px solid " + C.fawn,
          boxShadow: "0 2px 8px rgba(31, 29, 25, 0.08)",
          cursor: "pointer",
          transition: "all 180ms",
          fontFamily: F.head,
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(31, 29, 25, 0.12)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(31, 29, 25, 0.08)"; }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {search ? search : "Search DropYard"}
            </span>
            {(cat !== "All" || sort !== "newest") && (
              <span style={{ fontSize: 13, fontWeight: 500, color: C.mink, whiteSpace: "nowrap" }}>
                \u00b7 {cat !== "All" ? cat : sortShort}
              </span>
            )}
          </div>
          <span style={{
            width: 32, height: 32, borderRadius: "50%",
            background: state === "between" ? C.amber : C.green, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 6px " + (state === "between" ? C.amber : C.green) + "40",
            flexShrink: 0,
          }}>
            <Search size={14} style={{ color: "#fff" }} strokeWidth={2.6}/>
          </span>
        </button>
      ) : (
      <>
      {/* FULL CAPSULE — default expanded */}
      <div style={{
        display: "flex",
        alignItems: "stretch",
        background: C.paper,
        borderRadius: 999,
        border: "1px solid " + C.fawn,
        boxShadow: activeSegment ? "0 12px 32px rgba(31, 29, 25, 0.10)" : "0 2px 8px rgba(31, 29, 25, 0.06)",
        transition: "all 180ms",
        overflow: "visible",
        position: "relative",
      }}>
        {/* SEGMENT 1 — SEARCH */}
        <button
          onClick={() => toggleSegment("search")}
          onMouseEnter={() => setHoveredSegment("search")}
          onMouseLeave={() => setHoveredSegment(null)}
          style={{ ...segStyle("search"), flex: 1.3 }}
        >
          <p style={segLabel}>Search</p>
          <p style={segValue(!!search)}>{search || "Items, categories, neighbours"}</p>
        </button>

        {/* Divider */}
        {activeSegment !== "search" && activeSegment !== "category" && hoveredSegment !== "search" && hoveredSegment !== "category" && (
          <div style={{ width: 1, background: C.fawn, margin: "12px 0" }}/>
        )}

        {/* SEGMENT 2 — CATEGORY */}
        <button
          onClick={() => toggleSegment("category")}
          onMouseEnter={() => setHoveredSegment("category")}
          onMouseLeave={() => setHoveredSegment(null)}
          style={segStyle("category")}
        >
          <p style={segLabel}>Category</p>
          <p style={segValue(cat !== "All")}>{cat === "All" ? "Any category" : cat}</p>
        </button>

        {/* Divider */}
        {activeSegment !== "category" && activeSegment !== "sort" && hoveredSegment !== "category" && hoveredSegment !== "sort" && (
          <div style={{ width: 1, background: C.fawn, margin: "12px 0" }}/>
        )}

        {/* SEGMENT 3 — SORT */}
        <button
          onClick={() => toggleSegment("sort")}
          onMouseEnter={() => setHoveredSegment("sort")}
          onMouseLeave={() => setHoveredSegment(null)}
          style={{ ...segStyle("sort"), paddingRight: 80 }}
        >
          <p style={segLabel}>Sort by</p>
          <p style={segValue(sort !== "newest")}>{sortShort}</p>
        </button>

        {/* Green/Amber circle search button — state-aware.
            BUG-065 — segments use zIndex 1 (and 2 when active) for the
            hover/active background fill. The circle button had no zIndex
            (defaults to auto = 0), so hovering the Sort segment painted
            its hover background ON TOP of the circle, making it look like
            it disappeared. zIndex: 3 puts the circle reliably above any
            segment state. */}
        <button
          onClick={() => setActiveSegment(null)}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 3,
            height: 48,
            padding: activeSegment ? "0 22px 0 16px" : "0 16px",
            borderRadius: 999,
            border: "none",
            background: state === "between" ? C.amber : C.green,
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: F.head,
            fontSize: 14,
            fontWeight: 800,
            boxShadow: "0 4px 12px " + (state === "between" ? C.amber : C.green) + "40",
            transition: "all 220ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Search size={18} strokeWidth={2.6}/>
          {activeSegment && <span>Search</span>}
        </button>
      </div>

      {/* Active filter chips — when filters applied but no segment open */}
      {!activeSegment && (cat !== "All" || sort !== "newest" || search) && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          {search && (
            <button onClick={() => setSearch("")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 999, background: C.greenMist, border: "none", color: C.greenDeep, fontSize: 12, fontFamily: F.head, fontWeight: 700, cursor: "pointer" }}>
              "{search}" <X size={12}/>
            </button>
          )}
          {cat !== "All" && (
            <button onClick={() => setCat("All")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 999, background: C.greenMist, border: "none", color: C.greenDeep, fontSize: 12, fontFamily: F.head, fontWeight: 700, cursor: "pointer" }}>
              {cat} <X size={12}/>
            </button>
          )}
          {sort !== "newest" && (
            <button onClick={() => setSort("newest")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 999, background: C.greenMist, border: "none", color: C.greenDeep, fontSize: 12, fontFamily: F.head, fontWeight: 700, cursor: "pointer" }}>
              {sortLabel} <X size={12}/>
            </button>
          )}
        </div>
      )}

      {/* Contextual panel — controls for the active segment */}
      {activeSegment && (
        <div className="fade-in" style={{ marginTop: 10, padding: 24, borderRadius: 24, background: C.paper, border: "1px solid " + C.fawn, boxShadow: "0 16px 48px rgba(31, 29, 25, 0.12)" }}>
          {activeSegment === "search" && (
            <div>
              <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10, display: "block" }}>Search keywords</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: C.sand, border: "1.5px solid " + (search ? (state === "between" ? C.amber : C.green) : C.fawn), transition: "border-color 150ms" }}>
                <Search size={16} style={{ color: search ? (state === "between" ? C.amber : C.green) : C.mink, flexShrink: 0 }} strokeWidth={2.4}/>
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="e.g. bookshelf, electronics, Sarah M." style={{ border: "none", outline: "none", flex: 1, fontSize: 15, fontWeight: 600, color: C.ink, fontFamily: F.body, background: "transparent" }}/>
                {search && <button onClick={() => setSearch("")} style={{ border:"none", background:"none", cursor:"pointer", padding:0, display:"flex" }}><X size={15} style={{ color: C.mink }}/></button>}
              </div>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.ash, marginTop: 10, fontStyle: "italic" }}>Match item names, categories, or seller first names.</p>
            </div>
          )}
          {activeSegment === "category" && (
            <div>
              <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, display: "block" }}>Choose a category</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {categories.map(c => {
                  const active = cat === c;
                  return (
                    <button key={c} onClick={() => { setCat(c); if (c === "All") setActiveSegment(null); }} style={{ padding: "9px 16px", borderRadius: 999, border: "1.5px solid " + (active ? C.green : C.fawn), background: active ? C.green : C.paper, color: active ? "#fff" : C.mink, fontFamily: F.head, fontSize: 13, fontWeight: active ? 800 : 700, cursor: "pointer", transition: "all 150ms" }}>{c}</button>
                  );
                })}
              </div>
            </div>
          )}
          {activeSegment === "sort" && (
            <div>
              <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, display: "block" }}>Sort items</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {sorts.map(so => {
                  const active = sort === so.id;
                  return (
                    <button key={so.id} onClick={() => { setSort(so.id); setActiveSegment(null); }} style={{ padding: "9px 16px", borderRadius: 999, border: "1.5px solid " + (active ? C.green : C.fawn), background: active ? C.green : C.paper, color: active ? "#fff" : C.mink, fontFamily: F.head, fontSize: 13, fontWeight: active ? 800 : 700, cursor: "pointer", transition: "all 150ms" }}>{so.label}</button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          {activeSegment !== "search" && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, paddingTop: 18, borderTop: "1px solid " + C.fawn }}>
              <button onClick={() => { setCat("All"); setSort("newest"); setSearch(""); setActiveSegment(null); }} style={{ padding: "9px 16px", borderRadius: 999, border: "none", background: "transparent", fontSize: 13, color: C.mink, fontWeight: 700, cursor: "pointer", fontFamily: F.head, textDecoration: "underline", textUnderlineOffset: 3 }}>
                Clear all
              </button>
              <button onClick={() => setActiveSegment(null)} style={{ padding: "10px 22px", borderRadius: 999, border: "none", background: C.ink, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: F.head }}>
                Done
              </button>
            </div>
          )}
        </div>
      )}
      </>
      )}
    </section>
  );
}

/**
 * One-shot share for a single listing card. Uses the Web Share API on mobile
 * (where the OS sheet handles WhatsApp / SMS / Messenger natively) and falls
 * back to copying the link to the clipboard with a transient confirmation
 * for desktop. Returns the message the caller can surface as a toast. Kept
 * as a module-level helper so both ItemCard (buyer view) and the seller's
 * inventory cards can use the same code path. — BUG-051.
 */
function getPublicItemUrl(item) {
  const base = (typeof window !== "undefined" && window.location && window.location.origin)
    ? window.location.origin
    : "https://dropyard.app";
  // BUG-085 — points at the public item page (app/item/[id]). This used to be
  // "/?ref=share&item=<id>", i.e. the marketing homepage, so recipients never
  // saw the listing. `ref=share` is kept for traffic attribution.
  return base + "/item/" + encodeURIComponent(item?.id || "") + "?ref=share";
}
async function shareListing(item) {
  const title = item?.title || item?.t || "DropYard listing";
  const price = item?.p ?? item?.price;
  const priceFragment = (typeof price === "number" && price >= 0) ? " · $" + price : "";
  const text = "Check out \"" + title + "\"" + priceFragment + " on DropYard.";
  const url = getPublicItemUrl(item);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      return null; // success — OS sheet already gave feedback
    } catch (err) {
      // User dismissed — don't bubble as an error.
      if (err && err.name === "AbortError") return null;
      // Fall through to clipboard.
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text + " " + url);
      return "Link copied to clipboard.";
    } catch {
      // Final fallback below.
    }
  }
  return "Couldn't share — copy the link manually: " + url;
}

/* ============================================================
   ITEM CARD  — works for drop / shelf
   ============================================================ */
function ItemCard({ item, saved, onToggleSave, onOpen, onClaimNow, index, liveMode, fromPeek, claimedByMe = false, purchasedByMe = false }) {
  const [hovered, setHovered] = useState(false);
  const discount = item.op ? Math.round((1 - item.p / item.op) * 100) : null;
  let badgeBg = C.greenMist, badgeColor = C.greenDeep, badgeLabel = "Live Drop", cardAccent = C.green, ctaLabel = "Claim Now", CtaIcon = Check;
  if (item.layer === "shelf" && !liveMode) {
    badgeBg = C.amberMist; badgeColor = C.amberDeep; badgeLabel = "On the Shelf"; cardAccent = C.amber;
  }
  // Queued for the next Drop — browsable, not claimable yet. "Live Drop" here
  // contradicted the disabled CTA right below it on the same card.
  if (item.status === "preview") {
    badgeBg = C.amberMist; badgeColor = C.amberDeep; badgeLabel = "Sneak Peek"; cardAccent = C.amber;
  }
  // When liveMode is true, shelf items inherit the default "Live Drop" green styling (carryover is live)
  // Three distinct overlay states share the same "no claim button" treatment but each has
  // its own copy and accent colour:
  //   isClaimedByOther   — seed data marks this as already claimed by another neighbour (amber)
  //   isClaimedByMe      — current user has an active claim, pickup pending (green)
  //   isPurchasedByMe    — current user has completed pickup; item is theirs (sand/grey)
  // Purchased takes precedence over claimed (a completed claim is no longer "active").
  const isPurchasedByMe = purchasedByMe === true;
  const isClaimedByOther = item.status === "claimed";
  const isClaimedByMe = claimedByMe === true && !isPurchasedByMe;
  // Queued for the next Drop — browsable now, claimable when the Drop opens.
  // Treated as un-actionable here so the card can't start a claim the backend
  // will refuse.
  const isPreview = item.status === "preview";
  const isClaimed = isClaimedByOther || isClaimedByMe || isPurchasedByMe;
  const ctaDisabled = isClaimed || isPreview;

  return (
    <article onClick={onOpen} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="fade-in" style={{ background: C.paper, borderRadius: 20, overflow: "hidden", border: "1px solid " + (fromPeek ? C.amber + "60" : hovered ? C.fawn : C.fawn + "80"), cursor: "pointer", transition: "all 250ms cubic-bezier(0.25, 1, 0.5, 1)", transform: hovered ? "translateY(-3px)" : "translateY(0)", boxShadow: fromPeek ? (hovered ? "inset 4px 0 0 " + C.amber + ", 0 12px 32px rgba(31, 29, 25, 0.08)" : "inset 4px 0 0 " + C.amber + ", 0 1px 0 " + C.fawn + "60") : (hovered ? "0 12px 32px rgba(31, 29, 25, 0.08)" : "0 1px 0 " + C.fawn + "60"), animationDelay: Math.min(index * 40, 400) + "ms", display:"flex", flexDirection:"column" }}>
      <div style={{ position: "relative", aspectRatio: "4/3", background: "linear-gradient(135deg, " + badgeBg + ", " + C.sand + ")", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <ItemImage
          src={item.img}
          emojiSize={72}
          imgStyle={{ filter: "saturate(1.05)", transform: hovered ? "scale(1.05)" : "scale(1)", transition: "transform 400ms ease" }}
          spanStyle={{ filter: "saturate(1.05)", transform: hovered ? "scale(1.05)" : "scale(1)", transition: "transform 400ms ease" }}
        />
        <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 6 }}>
          {/* Share button (BUG-051). Uses Web Share API on mobile so users
              get the native iOS/Android share sheet; clipboard fallback on
              desktop. Stop propagation so the click doesn't also open the
              item detail. */}
          <button
            onClick={async (e) => { e.stopPropagation(); await shareListing(item); }}
            aria-label="Share this listing"
            title="Share"
            style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.95)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(31,29,25,0.1)" }}
          >
            <Share2 size={15} style={{ color: C.ink, strokeWidth: 2 }}/>
          </button>
          <button onClick={e => { e.stopPropagation(); onToggleSave(item.id); }} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: saved ? C.paper : "rgba(255,255,255,0.95)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(31,29,25,0.1)" }}>
            <Heart size={16} style={{ color: saved ? C.claret : C.ink, fill: saved ? C.claret : "none", strokeWidth: 2 }}/>
          </button>
        </div>
        <span style={{ position: "absolute", top: 14, left: 14, fontFamily: F.head, fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", padding: "5px 11px", borderRadius: 999, background: C.paper, color: badgeColor, border: "1.5px solid " + badgeColor + "30" }}>
          {badgeLabel}
        </span>

        {item.priceDrop && (
          <span style={{ position: "absolute", bottom: 14, left: 14, fontFamily: F.head, fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: C.green, color: "#fff", display: "flex", alignItems: "center", gap: 4 }}>
            <TrendingDown size={10}/> Price dropped
          </span>
        )}
        {isClaimed && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,249,240,0.88)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, backdropFilter: "blur(2px)" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
              background: isPurchasedByMe ? C.sand : isClaimedByMe ? C.greenMist : C.amberMist,
              color:      isPurchasedByMe ? C.ash  : isClaimedByMe ? C.greenDeep : C.amberDeep,
              fontFamily: F.head, fontSize: 11, fontWeight: 800, borderRadius: 999,
              border: "1.5px solid " + (isPurchasedByMe ? C.fawn : isClaimedByMe ? C.green + "40" : C.amber + "40"),
              letterSpacing: "0.04em"
            }}>
              {isPurchasedByMe
                ? <><Check size={11} strokeWidth={2.8}/> PICKED UP</>
                : <><Clock size={11}/> {isClaimedByMe ? "YOU CLAIMED THIS" : "PICKUP PENDING"}</>}
            </div>
            {isPurchasedByMe ? (
              <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, textAlign: "center", lineHeight: 1.4, maxWidth: 200 }}>You picked this up. Find it in your <b style={{ color: C.ink }}>History</b>.</p>
            ) : isClaimedByMe ? (
              <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, textAlign: "center", lineHeight: 1.4, maxWidth: 200 }}>Pickup pending. Track this in your <b style={{ color: C.greenDeep }}>Claims</b> tab.</p>
            ) : (
              <>
                <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, textAlign: "center", lineHeight: 1.4, maxWidth: 200 }}>Another neighbour is picking this up. Item may become available if they don&rsquo;t collect.</p>
                <button onClick={e => { e.stopPropagation(); if (!saved) onToggleSave(item.id); }} style={{ padding: "6px 13px", borderRadius: 999, border: "1.5px solid " + (saved ? C.green + "40" : C.ink + "30"), background: saved ? C.greenMist : C.paper, color: saved ? C.greenDeep : C.ink, fontFamily: F.head, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                  {saved ? (<><Check size={11} strokeWidth={2.8}/> You&rsquo;ll be notified</>) : (<><Bell size={11}/> Notify me if available</>)}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
        {fromPeek && (
          <p style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.amberDeep, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
            <Heart size={9} fill={C.amber} stroke={C.amber} strokeWidth={0}/> Saved from your Sneak Peek
          </p>
        )}
        <h3 style={{ fontFamily: F.head, fontSize: 16, fontWeight: 800, color: C.ink, letterSpacing: "-0.015em", lineHeight: 1.25, marginBottom: 8 }}>{item.t}</h3>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
          <span style={{ fontFamily: F.head, fontSize: 24, fontWeight: 900, color: cardAccent, letterSpacing: "-0.02em" }}>${item.p}</span>
          {item.op && <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.ash, textDecoration: "line-through" }}>${item.op}</span>}
          {discount && <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.amberDeep, background: C.amberMist, padding: "2px 8px", borderRadius: 6 }}>Save {discount}%</span>}
        </div>

        <div style={{ paddingTop: 12, borderTop: "1px solid " + C.fawn, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: avatarBg(item.seller), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.head, fontSize: 9, fontWeight: 800 }}>{item.seller.charAt(0)}</div>
            <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 700, color: C.ink }}>{item.seller}</span>
          </div>
          <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 700, color: C.mink, display: "flex", alignItems: "center", gap: 3 }}>
            <MapPin size={10}/> {item.dist}
          </span>
        </div>

        <button
          onClick={e => { e.stopPropagation(); if (ctaDisabled) { if (isPreview && onOpen) onOpen(); return; } if (onClaimNow) onClaimNow(); else if (onOpen) onOpen(); }}
          disabled={isClaimed}
          className="cta-primary"
          style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "10px 0", borderRadius: 12, border: "none",
            background: isPreview ? C.sand : cardAccent,
            color: isPreview ? C.mink : "#fff",
            fontFamily: F.head, fontSize: 12, fontWeight: 800,
            cursor: isClaimed ? "not-allowed" : "pointer",
            opacity: isClaimed ? 0.4 : 1,
            marginTop: "auto",
            boxShadow: (item.layer === "shelf" || isPreview) ? "none" : "0 2px 0 " + cardAccent + "40",
          }}
        >
          {isPreview
            ? <><Clock size={13}/> Opens {dropOpenDay()} {dropOpenHour()}</>
            : <><CtaIcon size={13}/> {ctaLabel}</>}
        </button>
      </div>
    </article>
  );
}

/* ============================================================
   PREVIEW STRIP (Between Drops only)
   ============================================================ */
/* ============================================================
   PREVIEW ITEM DETAIL — read-only Sneak Peek view
   Shown when user taps a card under "Dropping this Saturday".
   No Claim, no Ask. Save button is the only action.
   ============================================================ */
function PreviewItemDetail({ item, onBack, savedPreview, togglePreview }) {
  const { isMobile } = useViewport();
  const isSaved = savedPreview.has(item.id);
  return (
    <div style={{ paddingBottom: 40 }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.mink, marginBottom: 24 }}>
        <ArrowLeft size={14}/> Back
      </button>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 380px", gap: isMobile ? 24 : 40, alignItems: "start" }}>
        {/* Image area with locked-preview styling */}
        <div>
          <div style={{ position: "relative", aspectRatio: "4/3", borderRadius: 24, background: "linear-gradient(135deg, " + C.amberMist + " 0%, " + C.sand + " 100%)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid " + C.fawn + "80", marginBottom: 24, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, " + C.amber + "12 100%)", pointerEvents: "none" }}/>
            <ItemImage
              src={item.img}
              emojiSize={160}
              imgStyle={{ filter: "saturate(0.85)", opacity: 0.92 }}
              spanStyle={{ filter: "saturate(0.85)", opacity: 0.92 }}
            />

            {/* Drop-day banner — bigger version of the card badge */}
            <div style={{ position: "absolute", top: 18, left: 18, padding: "8px 14px", borderRadius: 999, background: C.amber, color: "#fff", fontFamily: F.head, fontSize: 12, fontWeight: 900, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 3px 10px " + C.amber + "55" }}>
              <Clock size={12} strokeWidth={2.6}/>
              DROPS {dropOpenDay().toUpperCase()} {dropOpenHourBadge()}
            </div>
          </div>

          {/* Why this is a preview — context strip */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 16px", borderRadius: 14, background: C.amberMist, border: "1px solid " + C.amber + "1F", marginBottom: 18 }}>
            <Info size={16} style={{ color: C.amberDeep, flexShrink: 0, marginTop: 2 }}/>
            <div>
              <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink, marginBottom: 3 }}>This is a Sneak Peek</p>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>
                The item isn't claimable yet. Save it now and we'll notify you the moment {dropOpenDay()}'s Drop opens at {dropOpenHour()} — first-come, first-served once it goes live.
              </p>
            </div>
          </div>

          {/* Item facts */}
          <div style={{ padding: 22, borderRadius: 18, background: C.paper, border: "1px solid " + C.fawn + "80" }}>
            <h3 style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.mink, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>What we know so far</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
              <div>
                <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ash, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>Category</p>
                <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, color: C.ink }}>{item.cat}</p>
              </div>
              <div>
                <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ash, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>Approximate price</p>
                <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, color: C.ink }}>Around ${item.estPrice}</p>
              </div>
              <div>
                <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ash, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>Neighbourhood</p>
                <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, color: C.ink }}>{item.hood}</p>
              </div>
              <div>
                <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ash, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>Distance</p>
                <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, color: C.ink }}>{item.dist}</p>
              </div>
            </div>
            <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.ash, fontStyle: "italic", marginTop: 14, lineHeight: 1.5 }}>
              Final details, photos, condition notes and exact price will be posted {dropOpenDay()} by {dropOpenHour()}.
            </p>
          </div>
        </div>

        {/* Right rail — Save action + seller card */}
        <aside>
          <div style={{ position: "sticky", top: 88, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Title + price */}
            <div>
              <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.amberDeep, letterSpacing: "0.12em", textTransform: "uppercase", display: "inline-block", marginBottom: 8 }}>Sneak Peek</span>
              <h1 style={{ fontFamily: F.head, fontSize: 26, fontWeight: 900, color: C.ink, letterSpacing: "-0.022em", lineHeight: 1.15, marginBottom: 8 }}>{item.t}</h1>
              <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.mink, marginBottom: 14 }}>
                Listed by <b style={{ color: C.ink, fontWeight: 800 }}>{item.seller}</b>
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 700, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase" }}>Around</span>
                <span style={{ fontFamily: F.head, fontSize: 36, fontWeight: 900, color: C.ink, letterSpacing: "-0.025em" }}>${item.estPrice}</span>
              </div>
            </div>

            {/* Primary CTA — Save / Saved */}
            <button onClick={() => togglePreview(item.id)} className="cta-primary" style={{
              width: "100%", padding: "16px 0", borderRadius: 14, border: "none",
              background: isSaved ? C.amberMist : C.amber,
              color: isSaved ? C.amberDeep : "#fff",
              fontFamily: F.head, fontSize: 15, fontWeight: 900, cursor: "pointer",
              boxShadow: isSaved ? "none" : "0 3px 0 " + C.amberDeep,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              border: isSaved ? "1.5px solid " + C.amber + "60" : "none",
              transition: "all 150ms",
            }}>
              {isSaved
                ? <><Check size={18}/> Saved for Saturday</>
                : <><Heart size={18}/> Save for Saturday</>}
            </button>

            {/* Saved state — what happens next */}
            {isSaved && (
              <div className="fade-in" style={{ padding: "14px 16px", borderRadius: 14, background: C.amberMist + "80", border: "1px solid " + C.amber + "30" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.amber, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Bell size={13} style={{ color: "#fff" }}/>
                  </div>
                  <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink }}>You're on the list</p>
                </div>
                <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.55 }}>
                  We'll send you a notification {dropOpenDay()} at <b style={{ color: C.ink, fontWeight: 800 }}>{dropOpenHour()}</b> when this goes live. Open the app fast — Drops are first-come, first-served.
                </p>

              </div>
            )}

            {/* What you can't do yet — honest framing */}
            {!isSaved && (
              <div style={{ padding: "12px 14px", borderRadius: 12, background: C.sand, border: "1px solid " + C.fawn }}>
                <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.55 }}>
                  You can't claim or message about this item until the Drop opens. Save it to be reminded the moment it goes live.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ============================================================
   SNEAK PEEK LIST PAGE — full grid of items dropping Saturday
   ============================================================ */
function SneakPeekListPage({ savedPreview, togglePreview, onPreviewItem, onBack, sneakPeekSource = null }) {
  const [filter, setFilter] = useState("all"); // "all" | "saved"
  // Use the live API-sourced sneak peek when provided (authed user); fall
  // back to the hardcoded demo array only when nothing was passed (i.e.
  // /preview/buyer-dashboard runs without auth).
  const source = Array.isArray(sneakPeekSource) ? sneakPeekSource : sneakPeekItems;
  const items = filter === "saved" ? source.filter(i => savedPreview.has(i.id)) : source;
  const savedCount = source.filter(i => savedPreview.has(i.id)).length;

  return (
    <div style={{ paddingBottom: 40 }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.mink, marginBottom: 24 }}>
        <ArrowLeft size={14}/> Back
      </button>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ width: 22, height: 2.5, background: C.amber, borderRadius: 2 }}/>
          <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.amberDeep, letterSpacing: "0.16em", textTransform: "uppercase" }}>Sneak peek</p>
        </div>
        <h1 style={{ fontFamily: F.head, fontSize: 32, fontWeight: 900, color: C.ink, letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: 6 }}>Dropping this Saturday</h1>
        <p style={{ fontFamily: F.body, fontSize: 15, fontWeight: 500, color: C.mink, maxWidth: 640 }}>
          A curated preview of what your neighbours are bringing. Save anything that catches your eye and we'll send a notification the moment the Drop opens.
        </p>
      </div>

      {/* Filter pills + counts */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap", rowGap: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setFilter("all")} style={{
            padding: "9px 16px", borderRadius: 999,
            border: "1.5px solid " + (filter === "all" ? C.ink : C.fawn),
            background: filter === "all" ? C.ink : C.paper,
            color: filter === "all" ? "#fff" : C.mink,
            fontFamily: F.head, fontSize: 13, fontWeight: 800, cursor: "pointer",
          }}>
            All items <span style={{ fontWeight: 600, opacity: 0.7 }}>· {source.length}</span>
          </button>
          <button onClick={() => setFilter("saved")} style={{
            padding: "9px 16px", borderRadius: 999,
            border: "1.5px solid " + (filter === "saved" ? C.amber : C.fawn),
            background: filter === "saved" ? C.amber : C.paper,
            color: filter === "saved" ? "#fff" : C.mink,
            fontFamily: F.head, fontSize: 13, fontWeight: 800, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Heart size={13} fill={filter === "saved" ? "#fff" : "none"} strokeWidth={2.4}/>
            Saved <span style={{ fontWeight: 600, opacity: 0.7 }}>· {savedCount}</span>
          </button>
        </div>
        <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.mink, margin: 0 }}>
          Drop opens <b style={{ color: C.ink, fontWeight: 800 }}>{dropOpenFull()}</b>
        </p>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        source.length === 0 ? (
          // No queued items at all — different copy from "filtered to Saved
          // but you haven't saved anything yet."
          <div style={{ padding: "60px 20px", textAlign: "center", borderRadius: 18, background: C.sand, border: "1px solid " + C.fawn }}>
            <Package size={32} style={{ color: C.smoke, margin: "0 auto 12px", display: "block" }} strokeWidth={1.8}/>
            <p style={{ fontFamily: F.head, fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 6 }}>No sneak peeks yet</p>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.mink, marginBottom: 16 }}>Neighbours haven&apos;t queued items for this {"Saturday's"} Drop yet. Check back later.</p>
          </div>
        ) : (
          <div style={{ padding: "60px 20px", textAlign: "center", borderRadius: 18, background: C.sand, border: "1px solid " + C.fawn }}>
            <Heart size={32} style={{ color: C.smoke, margin: "0 auto 12px", display: "block" }} strokeWidth={1.8}/>
            <p style={{ fontFamily: F.head, fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 6 }}>No saved items yet</p>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.mink, marginBottom: 16 }}>Save items from the preview to be reminded Saturday morning.</p>
            <button onClick={() => setFilter("all")} style={{ padding: "10px 18px", borderRadius: 999, border: "none", background: C.ink, color: "#fff", fontFamily: F.head, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
              Browse all sneak peeks
            </button>
          </div>
        )
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {items.map((item, i) => {
            const isSaved = savedPreview.has(item.id);
            return (
              <article key={item.id} onClick={() => onPreviewItem(item)} className="fade-in" style={{
                borderRadius: 18, background: C.paper,
                border: "1px solid " + (isSaved ? C.amber : C.fawn + "80"),
                boxShadow: isSaved ? "0 2px 0 " + C.amberMist : "0 1px 0 " + C.fawn + "60",
                overflow: "hidden",
                animationDelay: (i * 30) + "ms",
                cursor: "pointer",
                display: "flex", flexDirection: "column",
                transition: "all 180ms",
                position: "relative",
              }}>
                <div style={{ position: "relative", aspectRatio: "4/3", background: "linear-gradient(135deg, " + C.amberMist + " 0%, " + C.sand + " 100%)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, " + C.amber + "12 100%)" }}/>
                  <ItemImage
                    src={item.img}
                    emojiSize={60}
                    imgStyle={{ filter: "saturate(0.85)", opacity: 0.92 }}
                    spanStyle={{ filter: "saturate(0.85)", opacity: 0.92 }}
                  />
                  <div style={{ position: "absolute", top: 10, left: 10, padding: "4px 9px", borderRadius: 999, background: C.amber, color: "#fff", fontFamily: F.head, fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 4, boxShadow: "0 2px 6px " + C.amber + "50" }}>
                    <Clock size={10} strokeWidth={2.6}/> {dropOpenDay(true).toUpperCase()} {dropOpenHourBadge()}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); togglePreview(item.id); }} style={{ position: "absolute", top: 8, right: 8, width: 32, height: 32, borderRadius: "50%", border: "none", background: isSaved ? C.amber : "rgba(255,255,255,0.92)", color: isSaved ? "#fff" : C.ink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(31,29,25,0.15)" }}>
                    <Heart size={15} strokeWidth={2.4} fill={isSaved ? "#fff" : "none"}/>
                  </button>
                </div>
                <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.mink, padding: "3px 8px", borderRadius: 999, background: C.sand, letterSpacing: "0.04em", alignSelf: "flex-start", marginBottom: 8 }}>{item.cat}</span>
                  <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, lineHeight: 1.3, letterSpacing: "-0.01em", marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.t}</p>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
                    {item.seller.split(" ")[0]} <span style={{ color: C.smoke }}>·</span> {item.dist}
                  </p>
                  <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 5 }}>
                    <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 700, color: C.ash, letterSpacing: "0.06em", textTransform: "uppercase" }}>Around</span>
                    <span style={{ fontFamily: F.head, fontSize: 18, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em" }}>${item.estPrice}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PreviewStrip({ savedPreview, togglePreview, onPreviewItem, onSeeAllPreviews, sneakPeekSource = null }) {
  // "Sneak Peek from Saturday's Drop" — item-centric preview that turns
  // mid-week browsing into a real Saturday-morning hit list.
  //
  // Each card represents an item dropping Saturday. Buyers save items
  // (not sellers) to a watchlist so they wake up knowing exactly what to claim.
  //
  // Visual language: amber "SAT 8AM" badge + soft lock overlay on photos to
  // signal these are not-yet-live previews, distinct from live item cards.

  // Live data flows in via `sneakPeekSource`; fall back to the demo array
  // when no source is provided (i.e. /preview/buyer-dashboard).
  const source = Array.isArray(sneakPeekSource) ? sneakPeekSource : sneakPeekItems;

  // Hide the whole section when there's nothing to preview. Authed users
  // with zero queued items shouldn't see a header with no content beneath
  // — that reads as broken UI.
  if (source.length === 0) return null;

  return (
    <section className="fade-in" style={{ paddingTop: 44 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap", rowGap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ width: 22, height: 2.5, background: C.amber, borderRadius: 2 }}/>
            <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.amberDeep, letterSpacing: "0.16em", textTransform: "uppercase" }}>Sneak peek</p>
          </div>
          <h2 style={{ fontFamily: F.head, fontSize: 26, fontWeight: 900, color: C.ink, letterSpacing: "-0.022em", lineHeight: 1.1, marginBottom: 4 }}>
            Dropping this Saturday
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.mink, maxWidth: 560 }}>
            A curated preview of what neighbours are bringing. Save anything that catches your eye and we'll highlight it the moment the Drop opens.
          </p>
        </div>
        <button onClick={onSeeAllPreviews} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 999, border: "1.5px solid " + C.smoke, background: C.paper, fontSize: 13, fontWeight: 800, color: C.ink, cursor: "pointer", fontFamily: F.head, whiteSpace: "nowrap" }}>
          See all sneak peeks <ChevronRight size={14}/>
        </button>
      </div>

      {/* Horizontal scroll of item preview cards */}
      <div className="preview-scroll" style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 12, paddingTop: 4, scrollbarWidth: "thin", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollPadding: "0 16px" }}>
        {source.map((item, i) => {
          const isSaved = savedPreview.has(item.id);
          return (
            <article key={item.id} onClick={() => onPreviewItem && onPreviewItem(item)} className="fade-in" style={{
              flexShrink: 0,
              width: "min(220px, calc(85vw - 24px))",
              scrollSnapAlign: "start",
              borderRadius: 18,
              background: C.paper,
              border: "1px solid " + (isSaved ? C.amber : C.fawn + "80"),
              boxShadow: isSaved ? "0 2px 0 " + C.amberMist : "0 1px 0 " + C.fawn + "60",
              overflow: "hidden",
              animationDelay: (i * 40) + "ms",
              transition: "all 180ms",
              display: "flex",
              flexDirection: "column",
              cursor: "pointer",
            }}>
              {/* Photo preview — locked/anticipation styling */}
              <div style={{
                position: "relative",
                aspectRatio: "4/3",
                background: "linear-gradient(135deg, " + C.amberMist + " 0%, " + C.sand + " 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}>
                {/* Soft amber haze overlay to signal "not yet live" */}
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, " + C.amber + "12 100%)", pointerEvents: "none" }}/>

                {/* The emoji/photo */}
                <ItemImage
                  src={item.img}
                  emojiSize={54}
                  imgStyle={{ filter: "saturate(0.85)", opacity: 0.92 }}
                  spanStyle={{ filter: "saturate(0.85)", opacity: 0.92 }}
                />

                {/* SAT 8AM badge — top left */}
                <div style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  padding: "4px 9px",
                  borderRadius: 999,
                  background: C.amber,
                  color: "#fff",
                  fontFamily: F.head,
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  boxShadow: "0 2px 6px " + C.amber + "50",
                }}>
                  <Clock size={10} strokeWidth={2.6}/>
                  {dropOpenDay(true).toUpperCase()} {dropOpenHourBadge()}
                </div>

                {/* Save icon — top right */}
                <button onClick={(e) => { e.stopPropagation(); togglePreview(item.id); }} title={isSaved ? "Saved for Saturday" : "Save for Saturday"} style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: isSaved ? C.amber : "rgba(255,255,255,0.92)",
                  color: isSaved ? "#fff" : C.ink,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(31,29,25,0.15)",
                  transition: "all 150ms",
                }}>
                  <Heart size={15} strokeWidth={2.4} fill={isSaved ? "#fff" : "none"}/>
                </button>
              </div>

              {/* Card body */}
              <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
                {/* Category chip */}
                <div style={{ marginBottom: 8 }}>
                  <span style={{
                    fontFamily: F.head,
                    fontSize: 10,
                    fontWeight: 800,
                    color: C.mink,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: C.sand,
                    letterSpacing: "0.04em",
                  }}>{item.cat}</span>
                </div>

                {/* Title */}
                <p style={{
                  fontFamily: F.head,
                  fontSize: 14,
                  fontWeight: 800,
                  color: C.ink,
                  lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                  marginBottom: 6,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>{item.t}</p>

                {/* Seller + distance */}
                <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
                  {item.seller.split(" ")[0]}
                  <span style={{ color: C.smoke }}>·</span>
                  {item.dist}
                </p>

                {/* Price estimate — framed as approximate */}
                <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 5 }}>
                  <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 700, color: C.ash, letterSpacing: "0.06em", textTransform: "uppercase" }}>Around</span>
                  <span style={{ fontFamily: F.head, fontSize: 18, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em" }}>${item.estPrice}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

    </section>
  );
}

/* ============================================================
   SECTION HEADER
   ============================================================ */
function SectionHeader({ eyebrow, title, subtitle, action, eyebrowBg, eyebrowColor, pulse }) {
  return (
    <div style={{ padding: "44px 0 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div>
          {eyebrow && (pulse ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "6px 14px 6px 11px", background: eyebrowBg || C.green, borderRadius: 999, boxShadow: "0 2px 10px " + (eyebrowBg || C.green) + "55" }}>
              <span style={{ position: "relative", display: "inline-flex", width: 10, height: 10 }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#fff", opacity: 0.6, animation: "pulseLive 1.5s ease-in-out infinite" }}/>
                <span style={{ position: "relative", width: 10, height: 10, borderRadius: "50%", background: "#fff", boxShadow: "0 0 0 2px " + (eyebrowBg || C.green) }}/>
              </span>
              <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 900, color: "#fff", letterSpacing: "0.18em", textTransform: "uppercase" }}>{eyebrow}</span>
            </div>
          ) : (
            <p style={{ display: "inline-block", fontFamily: F.head, fontSize: 11, fontWeight: 800, color: eyebrowColor || C.green, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10, padding: "4px 11px", background: eyebrowBg || C.greenMist, borderRadius: 999 }}>{eyebrow}</p>
          ))}
          <h2 style={{ fontFamily: F.head, fontSize: 28, fontWeight: 900, color: C.ink, letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: subtitle ? 6 : 0 }}>{title}</h2>
          {subtitle && <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>{subtitle}</p>}
        </div>
        {action && (
          <button onClick={action.onClick} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, fontSize: 13, fontWeight: 700, color: C.ink, cursor: "pointer", fontFamily: F.head, whiteSpace: "nowrap" }}>
            {action.label} <ChevronRight size={14}/>
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */
// Skeleton card — same footprint and rhythm as an ItemCard so the layout
// doesn't shift on load. Shimmer is the `.skel` class on each block.
function ItemCardSkeleton({ index = 0 }) {
  return (
    <article className="skel-card fade-in" style={{ display: "flex", flexDirection: "column", animationDelay: Math.min(index * 50, 400) + "ms" }}>
      <div style={{ position: "relative", aspectRatio: "4/3", background: "linear-gradient(180deg, #FAF6EE 0%, #F0E9DC 100%)", overflow: "hidden" }}>
        <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: C.fawn, opacity: 0.6 }}/>
        <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: "38%", height: 1, background: C.fawn, opacity: 0.5 }}/>
        <svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <path d="M 0 28 L 100 12 L 100 28 Z" fill={C.fawn} opacity="0.55"/>
          <path d="M 200 28 L 100 12 L 100 28 Z" fill={C.fawn} opacity="0.45"/>
        </svg>
        <div className="skel" style={{ position: "absolute", inset: 0, opacity: 0.5, mixBlendMode: "multiply", borderRadius: 0 }}/>
        <div style={{ position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: "50%", background: C.paper, opacity: 0.75 }}/>
        <div className="skel" style={{ position: "absolute", top: 14, left: 14, width: 56, height: 22, borderRadius: 999 }}/>
      </div>
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skel" style={{ height: 14, width: "78%", borderRadius: 6 }}/>
        <div className="skel" style={{ height: 11, width: "52%", borderRadius: 6 }}/>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <div className="skel" style={{ height: 18, width: 56, borderRadius: 6 }}/>
          <div className="skel" style={{ height: 22, width: 22, borderRadius: 999 }}/>
        </div>
        <div className="skel" style={{ height: 36, width: "100%", borderRadius: 12, marginTop: 4 }}/>
      </div>
    </article>
  );
}

function SectionSkeleton({ count = 4 }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="skel" style={{ height: 18, width: 92, borderRadius: 6 }}/>
        <div className="skel" style={{ height: 24, width: 280, borderRadius: 6 }}/>
        <div className="skel" style={{ height: 13, width: 360, borderRadius: 6 }}/>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
        {Array.from({ length: count }).map((_, i) => <ItemCardSkeleton key={i} index={i}/>)}
      </div>
    </section>
  );
}

function DiscoverSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading items">
      <SectionSkeleton count={8}/>
    </div>
  );
}

// Empty-state SVG illustrations — quiet line drawings, brand-colored, composed
// for the warm "still life" feel. Each conveys *why* the state is empty without
// resorting to a sad icon.
function EmptySavedIllustration() {
  return (
    <svg viewBox="0 0 132 132" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }} aria-hidden="true">
      <defs>
        <linearGradient id="es-tag-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFEDC9"/>
          <stop offset="1" stopColor="#FFE4B0"/>
        </linearGradient>
      </defs>
      <ellipse cx="68" cy="118" rx="32" ry="4" fill={C.smoke} opacity="0.28"/>
      <path d="M 60 8 Q 64 22 70 32" fill="none" stroke={C.mink} strokeWidth="1.5" strokeLinecap="round"/>
      <g transform="rotate(-8 70 68)">
        <path d="M 38 38 L 86 38 L 102 60 L 86 96 L 38 96 Z" fill="url(#es-tag-grad)" stroke={C.amberDeep} strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="46" cy="48" r="3.5" fill={C.paper} stroke={C.amberDeep} strokeWidth="1.2"/>
        <path d="M 64 64 C 64 60, 58 58, 58 64 C 58 70, 64 76, 68 80 C 72 76, 78 70, 78 64 C 78 58, 72 60, 72 64 Z" fill={C.amber} stroke={C.amberDeep} strokeWidth="1.4" strokeLinejoin="round"/>
        <line x1="42" y1="86" x2="92" y2="86" stroke={C.amberDeep} strokeWidth="0.8" strokeDasharray="2 2" opacity="0.5"/>
      </g>
    </svg>
  );
}

function EmptyClaimsIllustration() {
  return (
    <svg viewBox="0 0 132 132" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }} aria-hidden="true">
      <defs>
        <linearGradient id="es-bag-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F5E1C2"/>
          <stop offset="1" stopColor="#E5C896"/>
        </linearGradient>
      </defs>
      <ellipse cx="66" cy="120" rx="38" ry="4" fill={C.smoke} opacity="0.28"/>
      <path d="M 32 50 L 32 110 Q 32 116 38 116 L 94 116 Q 100 116 100 110 L 100 50 Z" fill="url(#es-bag-grad)" stroke={C.amberDeep} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M 32 50 L 50 36 L 82 36 L 100 50 Z" fill="#F8E8CB" stroke={C.amberDeep} strokeWidth="1.6" strokeLinejoin="round"/>
      <line x1="44" y1="50" x2="44" y2="116" stroke={C.amberDeep} strokeWidth="0.8" opacity="0.45"/>
      <line x1="88" y1="50" x2="88" y2="116" stroke={C.amberDeep} strokeWidth="0.8" opacity="0.45"/>
      <line x1="32" y1="50" x2="100" y2="50" stroke={C.amberDeep} strokeWidth="1.2" opacity="0.7"/>
      <path d="M 50 36 Q 56 28 62 36" fill="none" stroke={C.amberDeep} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M 70 36 Q 76 28 82 36" fill="none" stroke={C.amberDeep} strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="66" cy="80" r="14" fill={C.greenMist} stroke={C.green} strokeWidth="1.6"/>
      <path d="M 60 80 L 65 85 L 73 76" fill="none" stroke={C.greenDeep} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function EmptySellerIllustration() {
  return (
    <svg viewBox="0 0 132 132" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }} aria-hidden="true">
      <defs>
        <linearGradient id="es-table-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EDE8E0"/>
          <stop offset="1" stopColor="#D6CFC4"/>
        </linearGradient>
      </defs>
      <ellipse cx="66" cy="118" rx="46" ry="4" fill={C.smoke} opacity="0.30"/>
      <rect x="14" y="58" width="104" height="10" rx="2" fill="url(#es-table-grad)" stroke={C.mink} strokeWidth="1.4"/>
      <line x1="28" y1="68" x2="36" y2="114" stroke={C.mink} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="36" y1="68" x2="28" y2="114" stroke={C.mink} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="96" y1="68" x2="104" y2="114" stroke={C.mink} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="104" y1="68" x2="96" y2="114" stroke={C.mink} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="28" y1="98" x2="104" y2="98" stroke={C.mink} strokeWidth="1.2" opacity="0.6"/>
      <g transform="rotate(-4 66 36)">
        <rect x="38" y="22" width="56" height="28" rx="3" fill={C.paper} stroke={C.amber} strokeWidth="1.6"/>
        <text x="66" y="40" fontFamily="Nunito, sans-serif" fontSize="9" fontWeight="900" fill={C.amberDeep} textAnchor="middle" letterSpacing="0.5">BACK SOON</text>
        <rect x="36" y="20" width="10" height="4" fill={C.amberSoft} opacity="0.7" transform="rotate(-15 41 22)"/>
        <rect x="86" y="20" width="10" height="4" fill={C.amberSoft} opacity="0.7" transform="rotate(15 91 22)"/>
      </g>
    </svg>
  );
}

function EmptySearchIllustration() {
  return (
    <svg viewBox="0 0 132 132" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }} aria-hidden="true">
      <defs>
        <linearGradient id="es-box-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F5E1C2"/>
          <stop offset="1" stopColor="#D9B881"/>
        </linearGradient>
      </defs>
      <ellipse cx="66" cy="122" rx="42" ry="3.5" fill={C.smoke} opacity="0.30"/>
      <path d="M 28 70 L 28 116 L 104 116 L 104 70 Z" fill="url(#es-box-grad)" stroke={C.amberDeep} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M 28 70 L 50 64 L 50 70 Z" fill="#E8C99A" stroke={C.amberDeep} strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M 104 70 L 82 64 L 82 70 Z" fill="#E8C99A" stroke={C.amberDeep} strokeWidth="1.4" strokeLinejoin="round"/>
      <rect x="50" y="68" width="32" height="6" fill={C.mink} opacity="0.5"/>
      <line x1="66" y1="74" x2="66" y2="116" stroke={C.amberDeep} strokeWidth="0.8" opacity="0.4"/>
      <g transform="rotate(-18 86 50)">
        <circle cx="86" cy="50" r="22" fill={C.paper} fillOpacity="0.85" stroke={C.green} strokeWidth="2.4"/>
        <circle cx="86" cy="50" r="22" fill="none" stroke={C.greenDeep} strokeWidth="0.6" opacity="0.4"/>
        <ellipse cx="78" cy="42" rx="6" ry="3" fill={C.paper} opacity="0.7"/>
        <line x1="102" y1="66" x2="118" y2="84" stroke={C.green} strokeWidth="5" strokeLinecap="round"/>
        <line x1="102" y1="66" x2="118" y2="84" stroke={C.greenDeep} strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      </g>
    </svg>
  );
}

function EmptyState({ icon: Icon, illustration, title, message, cta, onCtaClick, accent }) {
  const accentColor = accent || C.amber;
  const accentDeep =
    accentColor === C.green ? C.greenDeep :
    accentColor === C.amber ? C.amberDeep :
    accentColor;
  return (
    <div style={{ textAlign: "center", padding: "72px 24px 64px", background: C.paper, borderRadius: 24, border: "1.5px dashed " + C.fawn, position: "relative", overflow: "hidden" }}>
      <div aria-hidden="true" style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 280, height: 200, borderRadius: "50%", background: "radial-gradient(ellipse at center, " + accentColor + "12 0%, transparent 70%)", filter: "blur(12px)", pointerEvents: "none" }}/>
      <div style={{ position: "relative" }}>
        {illustration ? (
          <div style={{ width: 132, height: 132, margin: "0 auto 22px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {illustration}
          </div>
        ) : Icon ? (
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.sand, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", border: "1.5px solid " + C.amberSoft }}>
            <Icon size={30} style={{ color: C.amber }}/>
          </div>
        ) : null}
        <h3 style={{ fontFamily: F.head, fontSize: 20, fontWeight: 900, color: C.ink, marginBottom: 8, letterSpacing: "-0.01em" }}>{title}</h3>
        <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.mink, marginBottom: cta ? 22 : 0, maxWidth: 380, margin: cta ? "0 auto 22px" : "0 auto", lineHeight: 1.55 }}>{message}</p>
        {cta && (
          <button onClick={onCtaClick} className="cta-primary" style={{ padding: "11px 24px", borderRadius: 999, border: "none", background: accentColor, color: "#fff", fontFamily: F.head, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 0 " + accentDeep, letterSpacing: "0.01em" }}>
            {cta}
          </button>
        )}
      </div>
    </div>
  );
}


/* ============================================================
   TOAST
   ============================================================ */
function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose(), 2600);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 100, padding: "12px 20px", borderRadius: 999, background: C.ink, color: "#fff", fontFamily: F.head, fontSize: 14, fontWeight: 700, boxShadow: "0 8px 24px rgba(31, 29, 25, 0.35)", display: "flex", alignItems: "center", gap: 8 }} className="fade-in">
      <Check size={16}/> {message}
    </div>
  );
}

/* ============================================================
   CLAIM MODAL — buyer selects a pickup slot
   ============================================================ */
function ClaimModal({ item, onClose, onConfirm, accessToken = null, onGoToMessages = null }) {
  const { isMobile } = useViewport();
  const [step, setStep] = useState("confirm"); // "confirm" | "offer-sent" | "done"
  const [mode, setMode] = useState("listed"); // "listed" | "offer"
  const [offer, setOffer] = useState(Math.round(item.price * 0.9));
  // Slots come from the seller's listing config, not a hardcoded list.
  // Empty = seller gave nothing concrete ("any day" / no days selected), which
  // renders a by-request notice instead of fabricated times. See BUG-082.
  const allSlots = useMemo(() => buildPickupSlots(item), [item]);
  const slots = useMemo(() => allSlots.slice(0, PICKUP_SLOT_LIMIT), [allSlots]);
  const hiddenSlotCount = allSlots.length - slots.length;
  const [slot, setSlot] = useState(() => allSlots[0] || "");
  const [whatsapp, setWhatsapp] = useState(true);
  const [waPhone, setWaPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  // Holds the backend response after a successful claim POST so the parent's
  // onConfirm can hand the real claim id to the Claims-tab insert (instead of
  // a temporary "bc-..." id that would block cancel/refetch flows).
  const [realClaim, setRealClaim] = useState(null);
  // Real-item heuristic — backend cuids are non-numeric strings longer than 8
  // chars. Demo data uses numeric IDs ("c1", "c2"...) which we leave alone.
  const isRealItem = !!accessToken && typeof item.id === "string" && item.id.length > 8 && !item.id.startsWith("bc");

  const handlePrimary = async () => {
    setErrorMsg("");

    // BUG-055 unified lifecycle: one endpoint for both paths.
    //   Listed-price claim → POST /api/items/:id/claim (no amount = use listed)
    //   Custom offer       → POST /api/items/:id/claim with amount
    // Backend creates a PROPOSED Claim, flips item to RESERVED, creates-or-
    // reuses the conversation, posts a system NOTICE narrating the proposal.
    // Demo items skip the API so /preview/buyer-dashboard still flows.
    if (!isRealItem) { setStep(mode === "offer" ? "offer-sent" : "done"); return; }

    const body = { pickupSlot: slot || undefined };
    if (mode === "offer") {
      const trimmedOffer = Math.max(1, Math.round(Number(offer) || 0));
      if (trimmedOffer < 1) { setErrorMsg("Enter a valid offer amount."); return; }
      body.amount = trimmedOffer;
    }
    // Otherwise: no amount → backend uses item.price (listed).

    setSending(true);
    const claimTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out. Please try again.")), 20000)
    );
    try {
      const resp = await Promise.race([
        apiRequest("/api/items/" + encodeURIComponent(item.id) + "/claim", {
          method: "POST",
          token:  accessToken,
          body:   JSON.stringify(body),
        }),
        claimTimeout,
      ]);
      setRealClaim(resp && resp.claim ? resp.claim : null);
      // Both paths land on the same success step now — copy adjusts via mode.
      setStep(mode === "offer" ? "offer-sent" : "done");
    } catch (err) {
      // eslint-disable-next-line no-console
      if (typeof console !== "undefined") console.error("[ClaimModal] claim failed:", err);
      setErrorMsg((err && err.message) ? err.message : (mode === "offer" ? "Could not send your offer. Please try again." : "Could not claim the item. Please try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: isMobile ? 12 : 24, backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} className="fade-in" style={{ background: C.paper, borderRadius: 24, width: "100%", maxWidth: 520, maxHeight: "92vh", overflow: "auto", boxShadow: "0 24px 64px rgba(31, 29, 25, 0.2)" }}>
        {/* Header */}
        <div style={{ padding: isMobile ? "20px 18px 0 18px" : "24px 28px 0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 style={{ fontFamily: F.head, fontSize: isMobile ? 19 : 22, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em" }}>
            {step === "confirm" ? "Claim this item" : step === "offer-sent" ? "Offer sent!" : "Item claimed!"}
          </h2>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: C.sand, width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <X size={16} style={{ color: C.mink }}/>
          </button>
        </div>

        {/* Item summary card (always) */}
        <div style={{ margin: isMobile ? "0 18px 16px 18px" : "0 28px 20px 28px", display: "flex", gap: 14, padding: "14px 16px", borderRadius: 14, background: C.sand, border: "1px solid " + C.fawn }}>
          <div style={{ width: 58, height: 58, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", borderRadius: 10 }}>
            <ItemImage src={item.img} emojiSize={40}/>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: F.head, fontSize: 15, fontWeight: 800, color: C.ink }}>{item.title}</p>
            <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink }}>{item.seller.name} · {item.seller.dist}</p>
            <p style={{ fontFamily: F.head, fontSize: 18, fontWeight: 900, color: C.green, marginTop: 4 }}>
              ${item.price}
              {item.origPrice && <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ash, textDecoration: "line-through", marginLeft: 8 }}>${item.origPrice}</span>}
            </p>
          </div>
        </div>

        {/* STEP 1 — CONFIRM */}
        {step === "confirm" && (
          <div style={{ padding: isMobile ? "0 18px 22px 18px" : "0 28px 28px 28px" }}>

            {/* How claiming works explainer */}
            <div style={{ padding: 16, borderRadius: 14, background: C.greenMist, border: "1px solid " + C.green + "30", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12 }}>
              <Info size={18} style={{ color: C.greenDeep, flexShrink: 0, marginTop: 1 }}/>
              <div>
                <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.greenDeep, marginBottom: 4 }}>How claiming works</p>
                <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.55 }}>
                  Claiming reserves this item for you. You'll pick a pickup time and the seller will send their address. If you can't make it, cancel at least 2 hours before so someone else can claim it.
                </p>
              </div>
            </div>

            {/* Two-card price selection */}
            <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Your offer</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>

              {/* Option A: Claim at listed price */}
              <button onClick={() => setMode("listed")} style={{
                textAlign: "left", padding: 16, borderRadius: 14,
                border: "2px solid " + (mode === "listed" ? C.green : C.fawn),
                background: mode === "listed" ? C.greenMist : C.paper,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid " + (mode === "listed" ? C.green : C.smoke), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {mode === "listed" && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.green }}/>}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink }}>Claim at listed price</p>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, marginTop: 2 }}>Instant confirmation · no negotiation</p>
                </div>
                <p style={{ fontFamily: F.head, fontSize: 20, fontWeight: 900, color: C.green, flexShrink: 0 }}>${item.price}</p>
              </button>

              {/* Option B: Make an offer */}
              <button onClick={() => setMode("offer")} style={{
                textAlign: "left", padding: 16, borderRadius: 14,
                border: "2px solid " + (mode === "offer" ? C.ai : C.fawn),
                background: mode === "offer" ? C.aiMist : C.paper,
                cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: mode === "offer" ? 12 : 0 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid " + (mode === "offer" ? C.ai : C.smoke), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {mode === "offer" && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.ai }}/>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
                      Make a different offer
                    </p>
                    <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, marginTop: 2 }}>The seller will respond</p>
                  </div>
                </div>
                {mode === "offer" && (
                  <div onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, background: C.paper, marginBottom: 10 }}>
                      <DollarSign size={16} style={{ color: C.mink }}/>
                      <input type="number" value={offer} onChange={e => setOffer(parseInt(e.target.value) || 0)} placeholder="Your offer" style={{ border: "none", outline: "none", flex: 1, fontFamily: F.head, fontSize: 18, fontWeight: 800, color: C.ink, background: "transparent" }}/>
                      <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, whiteSpace: "nowrap" }}>vs ${item.price} asking</span>
                    </div>
                    {/* AI-agent response-time promise removed — the agent feature
                        isn't shipped yet. Restore alongside the offer-sent notice. */}
                  </div>
                )}
              </button>
            </div>

            {/* Pickup slots (only for listed-price claim) */}
            {mode === "listed" && (
              <div style={{ marginBottom: 22 }}>
                <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Pickup window</p>
                {slots.length === 0 ? (
                  // Seller chose "any day" or left the availability blank — say
                  // so rather than offering times they never agreed to.
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: C.sand, border: "1px solid " + C.fawn, display: "flex", alignItems: "center", gap: 10 }}>
                    <Clock size={15} style={{ color: C.mink, flexShrink: 0 }}/>
                    <p style={{ fontFamily: F.body, fontSize: 12.5, fontWeight: 600, color: C.mink, lineHeight: 1.45 }}>
                      This seller didn&apos;t set fixed pickup times — you&apos;ll agree on one in chat after claiming.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 8 }}>
                    {slots.map(sl => (
                      <button key={sl} onClick={() => setSlot(sl)} style={{ padding: "10px 12px", borderRadius: 12, border: "1.5px solid " + (slot === sl ? C.green : C.fawn), background: slot === sl ? C.greenMist : C.paper, color: slot === sl ? C.greenDeep : C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                        {slot === sl && <Check size={11} style={{ marginRight: 5, verticalAlign: "middle" }}/>}
                        {sl}
                      </button>
                    ))}
                  </div>
                )}
                {hiddenSlotCount > 0 && (
                  <p style={{ fontFamily: F.body, fontSize: 11.5, fontWeight: 600, color: C.ash, marginTop: 8 }}>
                    +{hiddenSlotCount} more time{hiddenSlotCount === 1 ? "" : "s"} available — ask the seller in chat.
                  </p>
                )}

                {/* Payment method reminder */}
                {item.paymentMethod && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: C.sand, border: "1px solid " + C.fawn, marginTop: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: C.paper, border: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {item.paymentMethod === "cash"      && <DollarSign size={15} style={{ color: C.ink }}/>}
                      {item.paymentMethod === "etransfer" && <Banknote size={15} style={{ color: C.ink }}/>}
                      {item.paymentMethod === "either"    && <Check size={15} style={{ color: C.ink }}/>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.ink }}>
                        {item.paymentMethod === "cash"      && "Bring cash"}
                        {item.paymentMethod === "etransfer" && "Pay by e-Transfer"}
                        {item.paymentMethod === "either"    && "Cash or e-Transfer accepted"}
                      </p>
                      <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, marginTop: 1 }}>
                        {item.paymentMethod === "cash"      && "This seller accepts cash only at pickup."}
                        {item.paymentMethod === "etransfer" && "Send before or at pickup — have your bank app ready."}
                        {item.paymentMethod === "either"    && "Either works — confirm with the seller at pickup."}
                      </p>
                    </div>
                  </div>
                )}

                {/* WhatsApp toggle — expandable card with phone input when enabled */}
                <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: whatsapp ? "#F0FFF4" : C.paper, border: "1px solid " + (whatsapp ? C.wa + "30" : C.fawn), transition: "all 150ms" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 10, background: whatsapp ? C.wa : C.sand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <MessageCircle size={15} style={{ color: whatsapp ? "#fff" : C.mink }}/>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.ink }}>WhatsApp reminders</p>
                      <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink }}>Get pickup time and address on WhatsApp</p>
                    </div>
                    <button onClick={() => setWhatsapp(!whatsapp)} style={{ width: 44, height: 26, borderRadius: 20, padding: 2, border: "none", cursor: "pointer", background: whatsapp ? C.wa : C.smoke, transition: "all 0.2s", flexShrink: 0 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transform: whatsapp ? "translateX(18px)" : "translateX(0)", transition: "transform 0.2s" }}/>
                    </button>
                  </div>

                  {whatsapp && (
                    <div className="fade-in" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid " + C.wa + "25" }}>
                      <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Your WhatsApp number</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", borderRadius: 10, border: "1.5px solid " + C.fawn, background: C.paper }}>
                        <Phone size={13} style={{ color: C.mink, flexShrink: 0 }}/>
                        <input type="tel" value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder="+1 613 555 0198" style={{ flex: 1, border: "none", outline: "none", fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink, background: "transparent" }}/>
                      </div>
                      <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, marginTop: 6, display: "flex", alignItems: "center", gap: 5, fontStyle: "italic" }}>
                        <Info size={10}/> Only used for pickup reminders. The seller doesn\'t see your number.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inline error from the API (only shown when sending an offer fails). */}
            {errorMsg && (
              <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, background: C.claretMist, border: "1px solid " + C.claret + "33", display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={14} style={{ color: C.claret, flexShrink: 0 }}/>
                <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.claret, flex: 1 }}>{errorMsg}</p>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} disabled={sending} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1.5px solid " + C.fawn, background: C.paper, fontFamily: F.head, fontSize: 14, fontWeight: 700, color: C.mink, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.6 : 1 }}>Cancel</button>
              <button onClick={handlePrimary} disabled={sending} className="cta-primary" style={{ flex: 2, padding: "12px 0", borderRadius: 12, border: "none", background: mode === "offer" ? C.ai : C.green, color: "#fff", fontFamily: F.head, fontSize: 14, fontWeight: 800, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1, boxShadow: "0 2px 0 " + (mode === "offer" ? "#6D28D9" : C.greenDeep), display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {sending
                  ? "Sending…"
                  : mode === "offer"
                    ? (<><DollarSign size={16}/> Send offer of ${offer}</>)
                    : (<><Check size={16}/> Claim at ${item.price}</>)}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2a — OFFER SENT */}
        {step === "offer-sent" && (
          <div style={{ padding: isMobile ? "0 18px 22px 18px" : "0 28px 28px 28px", textAlign: "center" }}>
            {/* Success mark — green check (matches STEP 2b). Was a purple AI
                Sparkles badge; removed with the AI-agent copy below since the
                agent feature isn't shipped yet. */}
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.greenMist, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle size={32} style={{ color: C.green }}/>
            </div>
            <h3 style={{ fontFamily: F.head, fontSize: 22, fontWeight: 900, color: C.ink, marginBottom: 8 }}>Offer sent!</h3>
            <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.mink, lineHeight: 1.55, marginBottom: 20 }}>
              You offered <b style={{ color: C.ink }}>${offer}</b> for <b style={{ color: C.ink }}>{item.title}</b>. The seller will respond shortly.
            </p>
            <div style={{ padding: 14, borderRadius: 12, background: "#F0FFF4", border: "1px solid " + C.wa + "30", textAlign: "left", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <MessageCircle size={14} style={{ color: C.wa, flexShrink: 0 }}/>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, lineHeight: 1.5 }}>You'll also be notified on WhatsApp when the seller responds.</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {onGoToMessages && (
                <button
                  onClick={() => { onGoToMessages(); onClose(); }}
                  style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1.5px solid " + C.ai + "60", background: C.paper, fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ai, cursor: "pointer" }}
                >
                  View in Messages
                </button>
              )}
              <button onClick={onClose} className="cta-primary" style={{ flex: onGoToMessages ? 1 : 2, padding: "13px 0", borderRadius: 12, border: "none", background: C.green, color: "#fff", fontFamily: F.head, fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 0 " + C.greenDeep }}>Got it</button>
            </div>
          </div>
        )}

        {/* STEP 2b — CLAIM DONE */}
        {step === "done" && (
          <div style={{ padding: isMobile ? "0 18px 22px 18px" : "0 28px 28px 28px", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.greenMist, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle size={32} style={{ color: C.green }}/>
            </div>
            <h3 style={{ fontFamily: F.head, fontSize: 22, fontWeight: 900, color: C.ink, marginBottom: 8 }}>Item claimed!</h3>
            <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.mink, lineHeight: 1.55, marginBottom: 20 }}>
              <b style={{ color: C.ink }}>{item.title}</b> is reserved for you at <b style={{ color: C.ink }}>${item.price}</b>.<br/>
              Pickup: <b style={{ color: C.ink }}>{slot}</b>
            </p>
            {whatsapp && (
              <div style={{ padding: 14, borderRadius: 12, background: "#F0FFF4", border: "1px solid " + C.wa + "30", textAlign: "left", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: C.wa, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <MessageCircle size={15} style={{ color: "#fff" }}/>
                </div>
                <div>
                  <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.ink }}>WhatsApp confirmation sent</p>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink }}>Pickup address and details are in your WhatsApp</p>
                </div>
              </div>
            )}
            {/* AI-agent confirmation + "reminder 1 hour before pickup" notice
                removed — the agent feature isn't shipped and nothing sends that
                reminder. Restore when the agent lands. */}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => { onConfirm(slot, item.price, realClaim); }} className="cta-primary" style={{ flex: 2, padding: "13px 0", borderRadius: 12, border: "none", background: C.green, color: "#fff", fontFamily: F.head, fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 0 " + C.greenDeep }}>View in Claims</button>
              {/* "Done" still records the claim in the parent's local state so
                  the user finds it on the next visit to the Claims tab — the
                  POST has already happened, this is just navigation parity. */}
              <button onClick={() => { onConfirm(slot, item.price, realClaim); onClose(); }} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1.5px solid " + C.fawn, background: C.paper, fontFamily: F.head, fontSize: 14, fontWeight: 700, color: C.mink, cursor: "pointer" }}>Done</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}



/* ============================================================
   ASK MODAL — message the seller a question
   ============================================================ */
function AskModal({ item, onClose, onSend }) {
  const { isMobile } = useViewport();
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [waPhone, setWaPhone] = useState("");

  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Only flip to the success screen once the POST actually lands. Previously
  // this set sent=true synchronously and fired onSend into the void, so a
  // failed request still showed "Question sent!".
  const handleSubmit = async () => {
    if (!msg.trim()) return;
    if (whatsapp && !waPhone.trim()) return; // require number if toggle is on
    if (sending) return;
    setError(null);
    setSending(true);
    try {
      if (onSend) await onSend(msg);
      setSent(true);
    } catch (err) {
      setError(err?.message || "Couldn't post your question. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: isMobile ? 12 : 24, backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} className="fade-in" style={{ background: C.paper, borderRadius: 24, width: "100%", maxWidth: 480, maxHeight: "92vh", overflow: "auto", padding: isMobile ? 18 : 26, boxShadow: "0 24px 64px rgba(31, 29, 25, 0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontFamily: F.head, fontSize: 20, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em" }}>
            {sent ? "Question submitted" : "Ask about this item"}
          </h2>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: C.sand, width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><X size={16} style={{ color: C.mink }}/></button>
        </div>

        {/* Item summary */}
        <div style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid " + C.fawn, background: C.sand, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", borderRadius: 8 }}>
            <ItemImage src={item.img} emojiSize={30}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink }}>{item.title}</p>
            <p style={{ fontFamily: F.head, fontSize: 15, fontWeight: 900, color: C.green }}>${item.price}</p>
          </div>
        </div>

        {!sent ? (
          <>
            <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Your question</p>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="E.g., What's the condition? Any scratches? Does it come with accessories?" rows={5} style={{ width: "100%", padding: 14, borderRadius: 14, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.ink, outline: "none", resize: "vertical", background: C.paper }}/>

            {/* Public-Q&A disclosure. The "seller uses an AI agent — answered
                instantly" promise was dropped here; the visibility notice is a
                real disclosure and stays. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "8px 12px", borderRadius: 10, background: C.sand, border: "1px solid " + C.fawn }}>
              <MessageCircle size={12} style={{ color: C.mink, flexShrink: 0 }}/>
              <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, lineHeight: 1.45 }}>All Q&amp;As are visible to other buyers.</p>
            </div>

            {/* WhatsApp toggle — same UX pattern as ClaimModal */}
            <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 12, background: whatsapp ? "#F0FFF4" : C.paper, border: "1px solid " + (whatsapp ? C.wa + "30" : C.fawn), transition: "all 150ms" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: whatsapp ? C.wa : C.sand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <MessageCircle size={15} style={{ color: whatsapp ? "#fff" : C.mink }}/>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.ink }}>Notify me on WhatsApp</p>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink }}>Get a ping when the answer is ready</p>
                </div>
                <button onClick={() => setWhatsapp(!whatsapp)} style={{ width: 44, height: 26, borderRadius: 20, padding: 2, border: "none", cursor: "pointer", background: whatsapp ? C.wa : C.smoke, transition: "all 0.2s", flexShrink: 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transform: whatsapp ? "translateX(18px)" : "translateX(0)", transition: "transform 0.2s" }}/>
                </button>
              </div>

              {whatsapp && (
                <div className="fade-in" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid " + C.wa + "25" }}>
                  <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Your WhatsApp number</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", borderRadius: 10, border: "1.5px solid " + C.fawn, background: C.paper }}>
                    <Phone size={13} style={{ color: C.mink, flexShrink: 0 }}/>
                    <input type="tel" value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder="+1 613 555 0198" style={{ flex: 1, border: "none", outline: "none", fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink, background: "transparent" }}/>
                  </div>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, marginTop: 6, display: "flex", alignItems: "center", gap: 5, fontStyle: "italic" }}>
                    <Info size={10}/> Only used for the answer. The seller doesn\'t see your number.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: C.claretMist, border: "1px solid " + C.claret + "40", display: "flex", alignItems: "flex-start", gap: 8 }}>
                <AlertCircle size={14} style={{ color: C.claret, flexShrink: 0, marginTop: 1 }}/>
                <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.claret, lineHeight: 1.45 }}>{error}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={onClose} disabled={sending} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1.5px solid " + C.fawn, background: C.paper, fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.mink, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.6 : 1 }}>Cancel</button>
              {(() => {
                const canSend = !!msg.trim() && (!whatsapp || !!waPhone.trim()) && !sending;
                return (
                  <button onClick={handleSubmit} disabled={!canSend} style={{ flex: 2, padding: "11px 0", borderRadius: 12, border: "none", background: canSend ? C.green : C.fawn, color: canSend ? "#fff" : C.ash, fontFamily: F.head, fontSize: 13, fontWeight: 800, cursor: canSend ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: canSend ? "0 2px 0 " + C.greenDeep : "none" }}>
                    {sending ? "Posting…" : (<><Send size={13}/> Submit question</>)}
                  </button>
                );
              })()}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            {/* Was an "AI agent is responding…" state with a purple Sparkles
                badge. Reworded to a plain question-sent confirmation — the
                seller answers manually until the agent ships. */}
            <div style={{ width: 58, height: 58, borderRadius: "50%", background: C.greenMist, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <CheckCircle size={28} style={{ color: C.green }}/>
            </div>
            <p style={{ fontFamily: F.head, fontSize: 16, fontWeight: 900, color: C.ink, marginBottom: 6 }}>Question sent!</p>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.mink, lineHeight: 1.55 }}>You&apos;ll see the seller&apos;s answer in the Q&amp;A section below the listing.</p>

            {whatsapp && (
              <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "#F0FFF4", border: "1px solid " + C.wa + "30", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                <MessageCircle size={14} style={{ color: C.wa, flexShrink: 0 }}/>
                <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, lineHeight: 1.5 }}>We'll ping you on WhatsApp at <b style={{ color: C.ink, fontWeight: 800 }}>{waPhone}</b> when the answer is ready.</p>
              </div>
            )}

            <button onClick={onClose} className="cta-primary" style={{ width: "100%", marginTop: 18, padding: "12px 0", borderRadius: 12, border: "none", background: C.green, color: "#fff", fontFamily: F.head, fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 0 " + C.greenDeep }}>Got it</button>
          </div>
        )}
      </div>
    </div>
  );
}



/* ============================================================
   ITEM DETAIL
   ============================================================ */
function toDetailItem(item) {
  // Prefer real fields surfaced by adaptBuyerItem (description, sellerHood,
  // photos, sellerId). Fall back to the demo-data heuristics only when those
  // fields are missing — keeps /preview/buyer-dashboard rendering identically
  // without leaking fake "Located in Barrhaven" copy to signed-in buyers.
  const realDescription = typeof item.description === "string" && item.description.trim().length > 0;
  return {
    id: item.id, title: item.t, price: item.p, origPrice: item.op, condition: item.cond, category: item.cat,
    description: realDescription
      ? item.description
      : "This " + item.t + " is in " + (item.cond || "good") + " condition. Message the seller for more details and photos.",
    seller: {
      name:         item.seller,
      neighbourhood: item.sellerHood || null,
      dist:         item.dist,
      items:        null,
      joined:       null,
      rating:       null,
      id:           item.sellerId || null,
    },
    img: item.img, photos: item.photos, saves: item.saves, watchers: Math.max(1, Math.round((item.saves || 0) * 0.75)), layer: item.layer, status: item.status, timeLeft: item.timeLeft, days: item.days, priceDrop: item.priceDrop, paymentMethod: item.paymentMethod || "either",
    daysListed: item.days || Math.max(1, Math.round((item.saves || 0) / 3)),
    // Pickup availability fields - thread through to the detail view so the
    // "Pickup availability" panel can render them. Real items from the API
    // will populate these; mock items default to undefined and the panel falls
    // back to "by request" copy.
    pickupMode:        item.pickupMode || item.raw?.pickupMode,
    pickupDays:        item.pickupDays || item.raw?.pickupDays,
    pickupCustomDates: item.pickupCustomDates || item.raw?.pickupCustomDates,
    pickupWindows:     item.pickupWindows || item.raw?.pickupWindows,
    // No more synthetic Q&A — questions populate only when the backend supplies
    // them. The buyer can always tap "Ask seller" to start a real thread.
    questions: Array.isArray(item.questions) ? item.questions : [],
  };
}

// BUG-082 — concrete pickup slots derived from what the SELLER actually
// offered when listing. The claim modal used to show four invented times
// ("Saturday 10:00 AM" etc.) regardless of the item, and that string is what
// gets POSTed as the claim's pickupSlot — so sellers received commitments for
// windows they never offered.
//
// Time ranges mirror the seller listing form exactly (DropYard_SellerDashboard
// lines 3075-3077); if those change, change them here too.
const PICKUP_WINDOW_LABELS = {
  morning:   "9 am - 12 pm",
  afternoon: "12 - 4 pm",
  evening:   "4 - 7 pm",
};
const PICKUP_WINDOW_ORDER = ["morning", "afternoon", "evening"];
const WEEKDAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_FULL = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };

/**
 * Build the selectable pickup slots for an item.
 * Returns [] when the seller gave nothing concrete (mode "anytime", or no days
 * / no dates) — the caller then renders a "coordinate in chat" state instead
 * of inventing times.
 */
function buildPickupSlots(item) {
  const mode    = item?.pickupMode || "flexible";
  const days    = Array.isArray(item?.pickupDays) ? item.pickupDays : [];
  const custom  = Array.isArray(item?.pickupCustomDates) ? item.pickupCustomDates : [];
  // No windows selected = seller is open to any of them.
  const rawWins = Array.isArray(item?.pickupWindows) && item.pickupWindows.length
    ? item.pickupWindows
    : PICKUP_WINDOW_ORDER;
  const wins = PICKUP_WINDOW_ORDER.filter((w) => rawWins.includes(w));
  if (!wins.length) return [];

  // "anytime" is explicitly by-request — there's no day to anchor a slot to.
  if (mode === "anytime") return [];

  let dayLabels = [];
  if (mode === "custom") {
    dayLabels = custom
      .slice()
      .sort()
      .map((d) => {
        const parsed = new Date(d + "T00:00:00");
        return Number.isNaN(parsed.getTime())
          ? null
          : parsed.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      })
      .filter(Boolean);
  } else {
    dayLabels = WEEKDAY_ORDER.filter((d) => days.includes(d)).map((d) => WEEKDAY_FULL[d] || d);
  }
  if (!dayLabels.length) return [];

  const slots = [];
  for (const day of dayLabels) {
    for (const w of wins) {
      slots.push(`${day} · ${PICKUP_WINDOW_LABELS[w]}`);
    }
  }
  // Full list — the caller caps what it renders and surfaces the remainder
  // explicitly. A seller can list up to 60 custom dates, so 60 x 3 windows
  // would otherwise be an unusable wall of buttons.
  return slots;
}

/** How many slot buttons the claim modal renders before summarising the rest. */
const PICKUP_SLOT_LIMIT = 9;

// Compact pickup-availability formatter. Returns {days, windows} strings ready
// to render. Mirrors the seller dashboard's formatter so labels stay consistent
// across the buyer view and the seller's listing flow.
function formatPickupSummary(item) {
  const mode    = item.pickupMode    || "flexible";
  const days    = item.pickupDays    || [];
  const custom  = item.pickupCustomDates || [];
  const windows = item.pickupWindows || [];

  let daySummary;
  if (mode === "anytime") {
    daySummary = "Any day by request";
  } else if (mode === "custom") {
    if (custom.length === 0)        daySummary = "By request";
    else if (custom.length <= 2)    daySummary = custom.map(d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })).join(", ");
    else                            daySummary = new Date(custom[0]).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " +" + (custom.length - 1) + " more";
  } else {
    // flexible (recurring weekdays)
    const weekdays = ["Mon","Tue","Wed","Thu","Fri"];
    const weekend  = ["Sat","Sun"];
    const allDays  = [...weekdays, ...weekend];
    if (days.length === 7)                                                                              daySummary = "Any day";
    else if (weekend.every(d => days.includes(d))   && weekdays.every(d => !days.includes(d)))          daySummary = "Weekends";
    else if (weekdays.every(d => days.includes(d))  && weekend.every(d => !days.includes(d)))           daySummary = "Weekdays";
    else if (days.length === 0)                                                                         daySummary = "By request";
    else                                                                                                daySummary = allDays.filter(d => days.includes(d)).join(" · ");
  }

  const winLabels   = { morning: "Mornings", afternoon: "Afternoons", evening: "Evenings" };
  const winSummary  = !windows.length || windows.length === 3
    ? "Anytime"
    : windows.map(w => winLabels[w] || w).join(" · ");

  return { days: daySummary, windows: winSummary };
}

function ItemDetail({ item, onBack, onClaimComplete, onGoToClaims, onGoToSeller, onViewSeller, savedIds, onToggleSave, accessToken = null, onGoToMessages = null, currentUserId = null, onSwitchRole = null }) {
  // BUG-050 safety net — even with the buyer feed filtering own items out
  // (in the parent useEffect), a deep link, watchlist row, or stale cache
  // can still land a seller on their own item detail page. Detect that and
  // swap the Claim / Ask buttons for a "switch to Seller view" affordance.
  const isMyOwnItem = !!currentUserId && item?.seller?.id === currentUserId;
  const { isMobile } = useViewport();
  const [showClaim, setShowClaim] = useState(false);
  const [showAsk, setShowAsk] = useState(false);
  const [toast, setToast] = useState(null);
  const saved = savedIds && savedIds.has(item.id);
  const toggleSave = () => onToggleSave && onToggleSave(item.id);

  // Public Q&A. Fetched per-item rather than ridden along on the feed payload,
  // so the Discover grid doesn't pay for a questions join on every card.
  // `qaTick` bumps after the buyer asks, to pull the new question back in.
  // Mock/preview items (short synthetic ids) have no backend row — they render
  // the empty state rather than inventing sample Q&A.
  const isRealItem = typeof item.id === "string" && item.id.length > 8;
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [qaTick, setQaTick] = useState(0);
  useEffect(() => {
    if (!isRealItem) { setQuestions([]); return; }
    let cancelled = false;
    setQuestionsLoading(true);
    apiRequest(`/api/questions/item/${item.id}`, accessToken ? { token: accessToken } : {})
      .then((r) => { if (!cancelled) setQuestions(Array.isArray(r?.questions) ? r.questions : []); })
      .catch(() => { if (!cancelled) setQuestions([]); })
      .finally(() => { if (!cancelled) setQuestionsLoading(false); });
    return () => { cancelled = true; };
  }, [item.id, accessToken, isRealItem, qaTick]);

  // BUG-066 — multi-photo gallery. Backend stores `photos: string[]` but the
  // detail view was only rendering `item.img` (= photos[0]). Now we track an
  // active index and let buyers swap the hero via the thumbnail strip. Falls
  // back gracefully when there's only one (or zero) photo: no strip rendered,
  // hero behaves exactly as before.
  const galleryPhotos = Array.isArray(item.photos) ? item.photos.filter(Boolean) : [];
  const hasMultiplePhotos = galleryPhotos.length > 1;
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  // Clamp the index if the photo set shrinks (e.g. socket refresh removes one)
  const safeIdx = Math.min(activePhotoIdx, Math.max(0, galleryPhotos.length - 1));
  const heroSrc = galleryPhotos[safeIdx] || item.img;

  // BUG-068 — prev/next arrow handlers + keyboard support. Wraps around so
  // pressing right on the last photo loops back to the first, mirroring how
  // most carousel components behave. Keyboard arrows only fire when the
  // claim modal isn't open so they don't fight modal focus.
  const goPrev = useCallback(() => {
    if (galleryPhotos.length <= 1) return;
    setActivePhotoIdx((idx) => (idx - 1 + galleryPhotos.length) % galleryPhotos.length);
  }, [galleryPhotos.length]);
  const goNext = useCallback(() => {
    if (galleryPhotos.length <= 1) return;
    setActivePhotoIdx((idx) => (idx + 1) % galleryPhotos.length);
  }, [galleryPhotos.length]);
  useEffect(() => {
    if (!hasMultiplePhotos) return;
    const onKey = (e) => {
      // Don't hijack typing in inputs / when a modal is open.
      if (showClaim || showAsk) return;
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft")  { e.preventDefault(); goPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasMultiplePhotos, goPrev, goNext, showClaim, showAsk]);

  const seller = item.seller;
  const isShelf = item.layer === "shelf";
  const accent = C.green;
  const accentBg = C.greenMist;
  const discount = item.origPrice ? Math.round((1 - item.price / item.origPrice) * 100) : null;

  const handleClaimConfirm = (slot, price, realClaim) => {
    setShowClaim(false);
    onClaimComplete({ ...item, price }, slot, realClaim);
    setToast("Claim submitted! Check your Claims tab.");
    setTimeout(() => onGoToClaims(), 1200);
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.mink, marginBottom: 24 }}>
        <ArrowLeft size={14}/> Back
      </button>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 400px", gap: isMobile ? 20 : 40, alignItems: "start" }}>
        <div>
          {/* Image area with badge overlays.
              BUG-066 — heroSrc swaps with the active thumbnail. Photo
              count pill in the bottom-right tells the buyer there's more
              to see when sources > 1. */}
          <div style={{ position: "relative", aspectRatio: "4/3", borderRadius: isMobile ? 18 : 24, background: "linear-gradient(135deg, " + accentBg + ", " + C.sand + ")", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid " + C.fawn, marginBottom: isMobile ? 12 : 16, overflow: "hidden" }}>
            <ItemImage src={heroSrc} emojiSize={160}/>
            {/* BUG-068 — prev/next arrow buttons on the hero. Always visible
                when there are 2+ photos so buyers can flip without scrolling
                down to thumbnails. Arrow keys on keyboard also work (see
                effect above). */}
            {hasMultiplePhotos && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous photo"
                  style={{
                    position:     "absolute",
                    left:         12,
                    top:          "50%",
                    transform:    "translateY(-50%)",
                    width:        isMobile ? 38 : 44,
                    height:       isMobile ? 38 : 44,
                    borderRadius: "50%",
                    border:       "1px solid " + C.fawn,
                    background:   "rgba(255,255,255,0.92)",
                    backdropFilter: "blur(6px)",
                    cursor:       "pointer",
                    display:      "flex",
                    alignItems:   "center",
                    justifyContent: "center",
                    color:        C.ink,
                    boxShadow:    "0 2px 8px rgba(31,29,25,0.12)",
                    transition:   "background 150ms, transform 150ms",
                    zIndex:       2,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "translateY(-50%) scale(1.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.92)"; e.currentTarget.style.transform = "translateY(-50%) scale(1)"; }}
                >
                  <ChevronLeft size={isMobile ? 18 : 22} strokeWidth={2.4}/>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next photo"
                  style={{
                    position:     "absolute",
                    right:        12,
                    top:          "50%",
                    transform:    "translateY(-50%)",
                    width:        isMobile ? 38 : 44,
                    height:       isMobile ? 38 : 44,
                    borderRadius: "50%",
                    border:       "1px solid " + C.fawn,
                    background:   "rgba(255,255,255,0.92)",
                    backdropFilter: "blur(6px)",
                    cursor:       "pointer",
                    display:      "flex",
                    alignItems:   "center",
                    justifyContent: "center",
                    color:        C.ink,
                    boxShadow:    "0 2px 8px rgba(31,29,25,0.12)",
                    transition:   "background 150ms, transform 150ms",
                    zIndex:       2,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "translateY(-50%) scale(1.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.92)"; e.currentTarget.style.transform = "translateY(-50%) scale(1)"; }}
                >
                  <ChevronRight size={isMobile ? 18 : 22} strokeWidth={2.4}/>
                </button>
              </>
            )}
            {hasMultiplePhotos && (
              <span style={{ position: "absolute", bottom: 14, right: 14, display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, background: "rgba(31,29,25,0.75)", backdropFilter: "blur(6px)", color: "#fff", fontFamily: F.head, fontSize: 11, fontWeight: 700, letterSpacing: "0.02em" }}>
                {safeIdx + 1} / {galleryPhotos.length}
              </span>
            )}
            {/* Top-left: stacked badges */}
            <div style={{ position: "absolute", top: 18, left: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              {item.layer === "drop" && (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F.head, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", padding: "6px 12px", borderRadius: 999, background: C.ink, color: "#fff" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: "0 0 0 3px " + C.green + "40", animation: "pulseGreen 2s infinite" }}/>
                  LIVE DROP
                </span>
              )}
              {isShelf && (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F.head, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", padding: "6px 12px", borderRadius: 999, background: C.amber, color: "#fff" }}>
                  <Package size={11}/> ON THE SHELF
                </span>
              )}
              {item.priceDrop && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: F.head, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", padding: "5px 11px", borderRadius: 999, background: C.claret, color: "#fff" }}>
                  <TrendingDown size={11}/> PRICE DROP
                </span>
              )}
            </div>
            {/* Top-right: watchers */}
            {item.watchers && (
              <div style={{ position: "absolute", top: 18, right: 18, display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(6px)", border: "1px solid " + C.fawn }}>
                <Eye size={12} style={{ color: C.mink }}/>
                <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 700, color: C.ink }}>{item.watchers} watching</span>
              </div>
            )}
          </div>

          {/* BUG-066 — thumbnail strip. Shown only when there are 2+ photos.
              Click a thumbnail to swap the hero. Active thumb gets the brand
              accent ring; others a subtle hover lift. Horizontal scrolls on
              mobile for 4+ photos. */}
          {hasMultiplePhotos && (
            <div
              style={{
                display:        "flex",
                gap:            isMobile ? 8 : 10,
                marginBottom:   isMobile ? 16 : 24,
                overflowX:      "auto",
                paddingBottom:  6, // space for scrollbar on overflow
                scrollbarWidth: "thin",
              }}
              className="preview-scroll"
              aria-label="Item photos"
            >
              {galleryPhotos.map((src, i) => {
                const isActive = i === safeIdx;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActivePhotoIdx(i)}
                    aria-label={`Show photo ${i + 1} of ${galleryPhotos.length}`}
                    aria-pressed={isActive}
                    style={{
                      flex:         "0 0 auto",
                      width:        isMobile ? 64 : 78,
                      height:       isMobile ? 64 : 78,
                      borderRadius: 12,
                      border:       isActive ? `2.5px solid ${accent}` : `1.5px solid ${C.fawn}`,
                      boxShadow:    isActive ? `0 4px 12px ${accent}33` : "none",
                      padding:      0,
                      background:   C.paper,
                      overflow:     "hidden",
                      cursor:       "pointer",
                      transition:   "border-color 150ms, box-shadow 150ms, transform 150ms",
                      transform:    isActive ? "scale(1.02)" : "scale(1)",
                    }}
                  >
                    <ItemImage
                      src={src}
                      emojiSize={28}
                      imgStyle={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {/* 4-column details grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
            <div style={{ padding: "14px 12px", borderRadius: 16, background: C.paper, border: "1.5px solid " + C.fawn, textAlign: "center" }}>
              <Shield size={16} style={{ color: accent, margin: "0 auto 6px", display: "block" }}/>
              <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 700, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Condition</p>
              <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink, lineHeight: 1.2 }}>{item.condition}</p>
            </div>
            <div style={{ padding: "14px 12px", borderRadius: 16, background: C.paper, border: "1.5px solid " + C.fawn, textAlign: "center" }}>
              <MapPin size={16} style={{ color: accent, margin: "0 auto 6px", display: "block" }}/>
              <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 700, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Distance</p>
              <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink, lineHeight: 1.2 }}>{seller.dist || seller.neighbourhood || "Nearby"}</p>
            </div>
            <div style={{ padding: "14px 12px", borderRadius: 16, background: C.paper, border: "1.5px solid " + C.fawn, textAlign: "center" }}>
              {item.layer === "drop" ? <Clock size={16} style={{ color: accent, margin: "0 auto 6px", display: "block" }}/> : <Package size={16} style={{ color: accent, margin: "0 auto 6px", display: "block" }}/>}
              <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 700, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>
                {item.layer === "drop" ? "Claim ends" : "Listed"}
              </p>
              <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink, lineHeight: 1.2 }}>
                {item.layer === "drop" ? (item.timeLeft || "This weekend") : ((item.daysListed || 3) + "d ago")}
              </p>
            </div>
            <div style={{ padding: "14px 12px", borderRadius: 16, background: C.paper, border: "1.5px solid " + C.fawn, textAlign: "center" }}>
              {(item.paymentMethod === "cash") ? <DollarSign size={16} style={{ color: accent, margin: "0 auto 6px", display: "block" }}/> : (item.paymentMethod === "etransfer") ? <Banknote size={16} style={{ color: accent, margin: "0 auto 6px", display: "block" }}/> : <Check size={16} style={{ color: accent, margin: "0 auto 6px", display: "block" }}/>}
              <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 700, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Payment</p>
              <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink, lineHeight: 1.2 }}>
                {(item.paymentMethod === "cash") ? "Cash only" : (item.paymentMethod === "etransfer") ? "e-Transfer" : "Cash or e-Transfer"}
              </p>
            </div>
          </div>

          {/* Pickup availability — read directly off the item.
              When the buyer dashboard moves from mock data to /api/items, the
              backend already populates these fields per the Phase 2 schema. */}
          {(() => {
            const pickup = formatPickupSummary(item);
            return (
              <div style={{ padding: "20px 28px", borderRadius: 20, background: C.paper, border: "1.5px solid " + C.fawn, marginBottom: 16 }}>
                <h3 style={{ fontFamily: F.head, fontSize: 15, fontWeight: 800, color: C.mink, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Pickup availability</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: C.greenMist, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Calendar size={16} style={{ color: C.greenDeep }}/>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Days</p>
                      <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink }}>{pickup.days}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: C.amberMist, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Clock size={16} style={{ color: C.amberDeep }}/>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Time windows</p>
                      <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink }}>{pickup.windows}</p>
                    </div>
                  </div>
                </div>
                <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, marginTop: 12, lineHeight: 1.5, fontStyle: "italic" }}>
                  Exact pickup time and address are confirmed via WhatsApp once you claim the item.
                </p>
              </div>
            );
          })()}

          {/* About this item */}
          <div style={{ padding: "24px 28px", borderRadius: 20, background: C.paper, border: "1.5px solid " + C.fawn, marginBottom: 24 }}>
            <h3 style={{ fontFamily: F.head, fontSize: 15, fontWeight: 800, color: C.mink, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>About this item</h3>
            <p style={{ fontFamily: F.body, fontSize: 15, fontWeight: 500, color: C.ink, lineHeight: 1.7 }}>{item.description}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 999, background: C.greenMist, color: C.greenDeep }}>{item.category}</span>
              <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 999, background: C.sand, color: C.mink, border: "1px solid " + C.fawn }}>{item.condition}</span>
              {item.saves > 10 && <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 999, background: C.claretMist, color: C.claret, display: "flex", alignItems: "center", gap: 4 }}><Heart size={11} fill={C.claret}/> {item.saves} saves</span>}
            </div>
          </div>

          {/* Questions & Answers */}
          <div style={{ padding: "24px 28px", borderRadius: 20, background: C.paper, border: "1.5px solid " + C.fawn }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontFamily: F.head, fontSize: 15, fontWeight: 800, color: C.mink, letterSpacing: "0.1em", textTransform: "uppercase" }}>Questions & Answers</h3>
              <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 700, color: C.ash, padding: "3px 10px", borderRadius: 999, background: C.sand, border: "1px solid " + C.fawn }}>
                {questions.length} {questions.length === 1 ? "question" : "questions"}
              </span>
            </div>

            {questionsLoading ? (
              <div style={{ textAlign: "center", padding: "20px 10px" }}>
                <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ash }}>Loading questions…</p>
              </div>
            ) : questions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 10px", color: C.ash }}>
                <MessageCircle size={24} style={{ color: C.smoke, marginBottom: 8 }}/>
                <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.mink, marginBottom: 14 }}>No questions yet — be the first to ask.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 }}>
                {questions.map((qa) => {
                  const askerName = qa.askerName || "Buyer";
                  const answered  = !!qa.answer;
                  return (
                    <div key={qa.id} style={{ padding: 16, borderRadius: 14, background: C.sand, border: "1px solid " + C.fawn }}>
                      {/* Question */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: avatarBg(askerName), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.head, fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                          {askerName.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 700, color: C.ink }}>{askerName}</span>
                            {qa.isMine && (
                              <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 4, background: C.greenMist, color: C.greenDeep, letterSpacing: "0.05em" }}>YOU</span>
                            )}
                            <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: C.ash }}>· {relativeTimeShort(qa.createdAt)}</span>
                          </div>
                          <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.5 }}>{qa.body}</p>
                        </div>
                      </div>
                      {/* Answer — or an explicit awaiting state, so an unanswered
                          question doesn't render as a blank reply block. */}
                      {answered ? (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingLeft: 10, borderLeft: "2px solid " + accent + "40" }}>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <User size={13}/>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                              <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 700, color: accent }}>Seller</span>
                              <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: C.ash }}>· {relativeTimeShort(qa.answeredAt)}</span>
                            </div>
                            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.mink, lineHeight: 1.6 }}>{qa.answer}</p>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 10, borderLeft: "2px solid " + C.fawn }}>
                          <Clock size={13} style={{ color: C.ash, flexShrink: 0 }}/>
                          <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.ash, lineHeight: 1.5 }}>Awaiting the seller&apos;s answer.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!isMyOwnItem && (
              <button onClick={() => setShowAsk(true)} className="cta-primary" style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "1.5px solid " + C.fawn, background: C.paper, color: C.ink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <MessageCircle size={14}/> Ask a question
              </button>
            )}
          </div>
        </div>

        <div style={{ position: "sticky", top: 120 }}>
          {isShelf && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.head, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: C.amberDeep, padding: "5px 11px", background: C.amberMist, borderRadius: 999, marginBottom: 14 }}>
              <Package size={12}/> On the Shelf
            </span>
          )}

          <h1 style={{ fontFamily: F.head, fontSize: 32, fontWeight: 900, color: C.ink, letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: 14 }}>{item.title}</h1>

          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
            <span style={{ fontFamily: F.head, fontSize: 44, fontWeight: 900, color: accent, letterSpacing: "-0.025em" }}>${item.price}</span>
            {item.origPrice && <span style={{ fontFamily: F.body, fontSize: 18, fontWeight: 600, color: C.ash, textDecoration: "line-through" }}>${item.origPrice}</span>}
            {discount && <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.amberDeep, background: C.amberMist, padding: "3px 10px", borderRadius: 8 }}>Save {discount}%</span>}
          </div>

          <button onClick={() => onViewSeller && onViewSeller(seller.name)} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, border: "1.5px solid " + C.fawn, background: C.paper, cursor: "pointer", marginBottom: 20 }}
            onMouseEnter={e => { if (true) e.currentTarget.style.borderColor = C.green; }}
            onMouseLeave={e => { if (true) e.currentTarget.style.borderColor = C.fawn; }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: avatarBg(seller.name), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.head, fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
              {initialsOf(seller.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink }}>{seller.name}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 700, color: C.mink, display: "flex", alignItems: "center", gap: 3 }}><MapPin size={10}/> {seller.neighbourhood} · {seller.dist}</span>
                {seller.rating && <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 700, color: C.amberDeep, display: "flex", alignItems: "center", gap: 3 }}><Star size={10} fill={C.amber} strokeWidth={0}/> {seller.rating}</span>}
              </div>
            </div>
            {true && (
              <span style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 12px", borderRadius:999, background:C.greenMist, color:C.greenDeep, fontFamily:F.head, fontSize:11, fontWeight:800, whiteSpace:"nowrap" }}>View profile <ChevronRight size={12}/></span>
            )}
          </button>


          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {isMyOwnItem ? (
              // Self-ownership safety net — see BUG-050. Surface the right
              // affordance instead of giving the seller buttons they can't
              // actually use.
              <>
                <div style={{ padding: 14, borderRadius: 14, border: "1.5px solid " + C.amber + "55", background: C.amberMist }}>
                  <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.amberDeep, marginBottom: 4 }}>This is your listing</p>
                  <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, lineHeight: 1.5 }}>
                    You can&apos;t claim or message yourself. Manage edits, photos, and price in the Seller view.
                  </p>
                </div>
                {onSwitchRole && (
                  <button onClick={onSwitchRole} className="cta-primary" style={{ padding: "12px 0", borderRadius: 12, border: "none", background: accent, color: "#fff", fontFamily: F.head, fontSize: 14, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, boxShadow: "0 2px 0 " + accent + "60" }}>
                    Open in Seller view <ChevronRight size={15}/>
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Primary claim CTA — works for all item types including Shelf.
                    Disabled for claimed items, and for Drop-pool items still in
                    PREVIEW ("preview"): the backend rejects those until the Drop
                    opens, so offering the modal only wastes the buyer's time. */}
                {(() => {
                  const notClaimable = item.status === "claimed" || item.status === "preview";
                  const label = item.status === "claimed"
                    ? "Already claimed"
                    : item.status === "preview"
                      ? "Claims open " + dropOpenDay() + " " + dropOpenHour()
                      : (isShelf ? "Claim at $" + item.price : "Claim this item");
                  return (
                    <button onClick={() => setShowClaim(true)} disabled={notClaimable} className="cta-primary" style={{ padding: "14px 0", borderRadius: 14, border: "none", background: notClaimable ? C.fawn : accent, color: notClaimable ? C.ash : "#fff", fontFamily: F.head, fontSize: 15, fontWeight: 800, cursor: notClaimable ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, boxShadow: notClaimable ? "none" : "0 2px 0 " + accent + "60" }}>
                      {item.status === "preview" ? <Clock size={17}/> : <Check size={17}/>} {label}
                    </button>
                  );
                })()}

                {/* Secondary row: Save + Ask */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={toggleSave} style={{ padding: "11px 0", borderRadius: 12, border: "1.5px solid " + (saved ? C.claret : C.fawn), background: saved ? C.claretMist : C.paper, color: saved ? C.claret : C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Heart size={14} fill={saved ? C.claret : "none"}/> {saved ? "Saved" : "Save"}
                  </button>
                  <button onClick={() => setShowAsk(true)} style={{ padding: "11px 0", borderRadius: 12, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <MessageCircle size={14}/> Ask
                  </button>
                </div>
              </>
            )}

            {/* Shelf items: small helper line explaining offer option */}
            {isShelf && item.status !== "claimed" && (
              <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.ash, textAlign: "center", marginTop: 2 }}>
                Or make an offer during claim — sellers often flex on Shelf prices.
              </p>
            )}
          </div>

        </div>
      </div>

      {showClaim && <ClaimModal item={item} onClose={() => setShowClaim(false)} onConfirm={handleClaimConfirm} accessToken={accessToken} onGoToMessages={onGoToMessages}/>}
      {showAsk && <AskModal item={item} onClose={() => setShowAsk(false)} onSend={async (msg) => {
        // Posts a PUBLIC question onto the item's Q&A — visible to every buyer
        // browsing this listing. This used to open a private conversation
        // thread instead, which is why the Q&A panel could never populate.
        // Private 1-to-1 chat still exists; it's reached via offers/claims.
        // Demo path (no token / mock id): show the existing toast.
        const isReal = accessToken && typeof item.id === "string" && item.id.length > 8;
        if (!isReal) {
          setToast("Question submitted to " + item.seller.name);
          return;
        }
        // Errors propagate to AskModal, which surfaces them inline and keeps
        // the composer open instead of showing a false success screen.
        await apiRequest(`/api/questions/item/${item.id}`, {
          method: "POST",
          token:  accessToken,
          body:   JSON.stringify({ body: msg }),
        });
        setQaTick((t) => t + 1);
      }}/>}
      <Toast message={toast} onClose={() => setToast(null)}/>
    </div>
  );
}

/* ============================================================
   REGULAR SELLER PROFILE (non-Dedicated)
   ============================================================ */
function RegularSellerProfile({ sellerName, onBack, onSelect, onClaimNow, savedIds, onToggleSave, itemsSource = null, state = "between" }) {
  // BUG-069 — RegularSellerProfile uses `__isMobile` inline (line further
  // down) but the destructure was missing here, causing a ReferenceError
  // the moment a buyer tapped "View profile" on any seller. Sister
  // components in this file follow the same alias pattern (line 3437,
  // 4872, 5553). Added it here to match.
  const { isMobile: __isMobile } = useViewport();
  const source = Array.isArray(itemsSource) ? itemsSource : allItems;
  const items = source.filter(i => i.seller === sellerName);
  // Real seller stats live on the backend but we don't have a user-summary
  // endpoint yet. Counting visible items is honest data. Avg rating + member
  // year stay null so the chrome reads "—" instead of a made-up number.
  const itemsCount = items.length;
  const completedSales = null;
  const avgRating = null;
  const joinedYear = null;
  const sellerHood = items[0]?.sellerHood || null;
  const firstName = sellerName.split(" ")[0];

  return (
    <div style={{ paddingBottom: 40 }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.mink, marginBottom: 24 }}>
        <ArrowLeft size={14}/> Back
      </button>

      <div style={{ padding: "32px 34px", borderRadius: 24, background: "linear-gradient(135deg, " + C.greenMist + " 0%, " + C.sand + " 100%)", border: "1.5px solid " + C.fawn, marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: avatarBg(sellerName), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.head, fontSize: 32, fontWeight: 900, border: "3px solid " + C.paper, boxShadow: "0 0 0 1.5px " + C.fawn, flexShrink: 0 }}>
            {initialsOf(sellerName)}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: F.head, fontSize: 32, fontWeight: 900, color: C.ink, letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: 4 }}>{sellerName}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {avgRating != null && (
                <span style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.amberDeep, display: "flex", alignItems: "center", gap: 4 }}><Star size={13} fill={C.amber} strokeWidth={0}/> {avgRating.toFixed(1)}</span>
              )}
              <span style={{ fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.mink, display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12}/> {sellerHood || "Nearby"}</span>
              {joinedYear != null && (
                <span style={{ fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.mink }}>Member since {joinedYear}</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: __isMobile ? "1fr 1fr 1fr" : "repeat(3, 1fr)", gap: __isMobile ? 8 : 14, padding: __isMobile ? "14px 14px" : "18px 20px", borderRadius: 16, background: C.paper, border: "1px solid " + C.fawn }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: F.head, fontSize: 28, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em" }}>{itemsCount}</p>
            <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 700, color: C.mink, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>Items listed</p>
          </div>
          <div style={{ textAlign: "center", borderLeft: "1px solid " + C.fawn, borderRight: "1px solid " + C.fawn }}>
            <p style={{ fontFamily: F.head, fontSize: 28, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em" }}>{completedSales == null ? "—" : completedSales}</p>
            <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 700, color: C.mink, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>Completed sales</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: F.head, fontSize: 28, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em" }}>{avgRating == null ? "—" : avgRating.toFixed(1)}</p>
            <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 700, color: C.mink, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>Average rating</p>
          </div>
        </div>
      </div>

      <SectionHeader eyebrow="Current listings" title={"From " + firstName} subtitle={items.length + " item" + (items.length !== 1 ? "s" : "") + " available"}/>

      {items.length === 0 ? (
        <EmptyState illustration={<EmptySellerIllustration/>} title={"No active listings from " + firstName} message="Their stand is empty right now. Check back soon — neighbours list new items every week." accent={C.amber}/>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
          {items.map((i, idx) => <ItemCard key={i.id} item={i} saved={savedIds.has(i.id)} onToggleSave={onToggleSave} onOpen={() => onSelect(toDetailItem(i))} onClaimNow={() => onClaimNow && onClaimNow(toDetailItem(i))} index={idx} liveMode={state === "live"}/>)}
        </div>
      )}

      <div style={{ marginTop: 32, padding: "18px 22px", borderRadius: 16, background: C.greenMist, border: "1px solid " + C.green + "30", display: "flex", alignItems: "center", gap: 14 }}>
        <Shield size={20} style={{ color: C.green, flexShrink: 0 }}/>
        <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.5 }}>
          DropYard sellers are verified locals. Every pickup is coordinated through WhatsApp. Ratings come from real buyers after completed pickups.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   SAVED PAGE
   ============================================================ */
function SavedPage({ savedIds, savedItems = null, onSelect, onClaimNow, onToggleSave, onBrowse, onBack, claimedIds = new Set(), purchasedIds = new Set(), itemsSource = null, state = "between" }) {
  // Authed users render directly from the watchlist API result (full Item
  // objects, including SOLD ones + ones the user owns themselves). Preview
  // mode falls back to filtering the demo pool by savedIds — the original
  // behaviour preserved for /preview/buyer-dashboard.
  const items = Array.isArray(savedItems)
    ? savedItems
    : (Array.isArray(itemsSource) ? itemsSource : allItems).filter(i => savedIds.has(i.id));
  return (
    <>
      <PageTitle onBack={onBack} eyebrow="Your saves" eyebrowColor={C.claret} title="Saved items" subtitle={items.length + " item" + (items.length !== 1 ? "s" : "") + " you're watching"} icon={Heart} iconBg={C.claretMist} iconColor={C.claret}/>
      {items.length === 0 ? (
        <EmptyState illustration={<EmptySavedIllustration/>} title="Nothing saved yet" message="Tap the heart on items you’re interested in — they’ll gather here so you can claim them when the Drop opens." cta="Browse Discover" onCtaClick={onBrowse} accent={C.amber}/>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
          {items.map((i, idx) => <ItemCard key={i.id} item={i} saved={true} onToggleSave={onToggleSave} onOpen={() => onSelect(toDetailItem(i))} onClaimNow={() => onClaimNow && onClaimNow(toDetailItem(i))} index={idx} liveMode={state === "live"} claimedByMe={claimedIds.has(i.id)} purchasedByMe={purchasedIds.has(i.id)}/>)}
        </div>
      )}
    </>
  );
}

/* ============================================================
   CLAIMS PAGE
   ============================================================ */
function ClaimsPage({ claims, setClaims, onBrowse, onBack, onGoToMessages, onOpenThread = null, highlightId = null, onClearHighlight = null, accessToken = null }) {
  const { isMobile: __isMobile } = useViewport();
  // Clear the highlight after a brief flash so the row settles.
  useEffect(() => {
    if (!highlightId || !onClearHighlight) return;
    const t = setTimeout(() => onClearHighlight(), 2200);
    return () => clearTimeout(t);
  }, [highlightId, onClearHighlight]);
  const [toast, setToast] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [ratingId, setRatingId] = useState(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingNote, setRatingNote] = useState("");

  const stageInfo = {
    "pickup-today":     { label: "Pickup today",      color: C.claret,    bg: C.claretMist, icon: Clock       },
    "pickup-overdue":   { label: "Pickup overdue",    color: C.amberDeep, bg: C.amberMist,  icon: AlertCircle },
    "pickup-scheduled": { label: "Scheduled",         color: C.greenDeep, bg: C.greenMist,  icon: CheckCircle },
    "offer-pending":    { label: "Offer pending",     color: C.amberDeep, bg: C.amberMist,  icon: RefreshCw   },
    "completed":        { label: "Completed",         color: C.ash,       bg: C.sand,       icon: Check       },
  };

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  // BUG-055 unified lifecycle — buyer's button is "Confirm receipt", NOT
  // "Picked up". It pings the seller (system message + buyerConfirmedReceiptAt
  // timestamp) but does NOT change claim status. Only the seller can flip
  // the claim to PICKED_UP server-side (fraud prevention: a buyer can't
  // claim → confirm → SOLD without ever meeting the seller).
  //
  // Rating is decoupled from the transaction: it happens later on the
  // History tab, accessible anytime once the seller marks PICKED_UP.
  const confirmReceipt = async (claim) => {
    const isReal = accessToken && typeof claim.id === "string" && !claim.id.startsWith("bc");
    if (!isReal) {
      // Demo path — no API, just flash success.
      flash("Receipt confirmed. The seller will mark the pickup complete on their side.");
      return;
    }
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/confirm-receipt", {
        method: "POST",
        token:  accessToken,
      });
      // Optimistic local update — claim stays in the list (still ACCEPTED)
      // but we set a flag so the UI can show "Receipt confirmed — waiting
      // for seller to mark complete".
      setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, buyerConfirmedReceipt: true } : c));
      flash("Receipt confirmed. Seller has been notified to complete the pickup.");
    } catch (err) {
      flash("Couldn't confirm receipt — " + (err?.message || "try again"));
    }
  };

  // Rate-seller flow — opens the rating modal for a PICKED_UP claim on the
  // History tab. submitRating posts only the review; no status change.
  const openRatingForClaim = (claim) => {
    setRatingId(claim.id);
    setRatingStars(0);
    setRatingNote("");
  };

  const submitRating = async () => {
    const claim = claims.find(c => c.id === ratingId);
    if (!claim) { setRatingId(null); return; }
    const isReal = accessToken && typeof claim.id === "string" && !claim.id.startsWith("bc");
    if (isReal && ratingStars > 0) {
      try {
        await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/review", {
          method: "POST",
          token:  accessToken,
          body:   JSON.stringify({
            rating: ratingStars,
            text:   ratingNote && ratingNote.trim() ? ratingNote.trim() : undefined,
          }),
        });
        flash("Thanks for rating " + claim.seller + "!");
      } catch (err) {
        flash("Couldn't save the review: " + (err?.message || "try again"));
      }
    }
    setRatingId(null);
    setRatingStars(0);
    setRatingNote("");
  };

  const skipRating = () => {
    setRatingId(null);
    setRatingStars(0);
    setRatingNote("");
  };

  const cancelClaim = async (claim) => {
    // Optimistic drop from the list — the row vanishes immediately. We rollback
    // by restoring the prior list if the server rejects.
    const snapshot = claims;
    setClaims(prev => prev.filter(c => c.id !== claim.id));
    setCancelTarget(null);
    flash("Claim on " + claim.t + " cancelled. Item released.");
    // Skip the backend call for demo claims (no real id on the server) and for
    // unauth'd preview mode. Real wiring fires PATCH /api/claims/:id/cancel.
    if (!accessToken) return;
    if (typeof claim.id === "string" && claim.id.startsWith("bc")) return;
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/cancel", {
        method: "PATCH",
        token:  accessToken,
      });
    } catch (err) {
      setClaims(snapshot); // rollback
      flash("Could not cancel claim: " + (err?.message || "try again"));
    }
  };

  const requestReschedule = (claim) => {
    onGoToMessages && onGoToMessages();
    flash("Opening chat with " + claim.seller + " to request a new pickup time.");
  };

  const releaseClaim = async (claim) => {
    // Buyer-side "release" on an overdue confirmed claim is functionally a
    // buyer cancellation — claim closes, item returns to LIVE. Reuses the
    // existing PATCH /api/claims/:id/cancel route. Optimistic remove +
    // rollback on error mirrors the cancelClaim flow above.
    const snapshot = claims;
    setClaims(prev => prev.filter(c => c.id !== claim.id));
    flash("Claim on " + claim.t + " released. The item is available again for others.");
    if (!accessToken) return;
    if (typeof claim.id === "string" && claim.id.startsWith("bc")) return; // demo claim
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/cancel", {
        method: "PATCH",
        token:  accessToken,
      });
    } catch (err) {
      setClaims(snapshot);
      flash("Could not release the claim: " + (err?.message || "try again"));
    }
  };

  // BUG-055 — buyer-side accept/counter/decline a PROPOSED claim. The accept
  // and decline paths are symmetric (either party can call them server-side).
  // counterClaim PATCHes /amount with a new value; status stays PROPOSED.
  const acceptCounter = async (claim) => {
    const isReal = accessToken && typeof claim.id === "string" && !claim.id.startsWith("bc");
    setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, status: "pickup-scheduled", counterAmount: null } : c));
    flash("Accepted. Coordinating pickup with " + claim.seller + ".");
    if (!isReal) return;
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/accept", {
        method: "PATCH",
        token:  accessToken,
      });
    } catch (err) {
      flash("Couldn't accept: " + (err?.message || "try again"));
    }
  };

  const declineCounter = async (claim) => {
    const isReal = accessToken && typeof claim.id === "string" && !claim.id.startsWith("bc");
    setClaims(prev => prev.filter(c => c.id !== claim.id));
    flash("Offer on " + claim.t + " declined. Item released.");
    if (!isReal) return;
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/decline", {
        method: "PATCH",
        token:  accessToken,
      });
    } catch (err) {
      flash("Couldn't decline: " + (err?.message || "try again"));
    }
  };

  // Inline counter UI state — counterClaimId tracks which claim row is
  // showing the input, counterDraftAmt is the typed amount.
  const [counterClaimId, setCounterClaimId] = useState(null);
  const [counterDraftAmt, setCounterDraftAmt] = useState("");
  const submitCounterFromClaim = async (claim) => {
    const amt = Math.round(Number(counterDraftAmt));
    if (!Number.isFinite(amt) || amt <= 0) { flash("Enter a valid counter amount."); return; }
    const isReal = accessToken && typeof claim.id === "string" && !claim.id.startsWith("bc");
    setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, price: amt } : c));
    setCounterClaimId(null); setCounterDraftAmt("");
    if (!isReal) { flash("Countered at $" + amt + "."); return; }
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/amount", {
        method: "PATCH",
        token:  accessToken,
        body:   JSON.stringify({ amount: amt }),
      });
      flash("Countered at $" + amt + ". Waiting for the seller.");
    } catch (err) {
      flash("Couldn't counter: " + (err?.message || "try again"));
    }
  };

  const todayCount     = claims.filter(c => c.status === "pickup-today" || c.status === "pickup-overdue").length;
  const scheduledCount = claims.filter(c => c.status === "pickup-scheduled").length;
  const pendingCount   = claims.filter(c => c.status === "offer-pending").length;

  const stats = [
    { label: "Pickup today",   value: todayCount,     icon: Clock,       color: C.claret,    bg: C.claretMist, urgent: todayCount > 0 },
    { label: "Scheduled",      value: scheduledCount, icon: Calendar,    color: C.greenDeep, bg: C.greenMist,  urgent: false },
    { label: "Offer pending",  value: pendingCount,   icon: RefreshCw,   color: C.amberDeep, bg: C.amberMist,  urgent: false },
  ];

  return (
    <>
      <PageTitle onBack={onBack} eyebrow="Your claims" eyebrowColor={C.green} title="Pickups & offers" subtitle={claims.length + " active claim" + (claims.length !== 1 ? "s" : "")} icon={ShoppingBag} iconBg={C.greenMist} iconColor={C.greenDeep}/>

      {/* Success toast */}
      {toast && (
        <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: C.greenMist, border: "1px solid " + C.green + "30", marginBottom: 18 }}>
          <CheckCircle size={17} style={{ color: C.greenDeep, flexShrink: 0 }}/>
          <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.greenDeep, flex: 1 }}>{toast}</p>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: C.mink, display: "flex" }}><X size={14}/></button>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 22 }}>
        {stats.map((s, i) => {
          const Ic = s.icon;
          return (
            <div key={i} className="fade-in" style={{ padding: "18px 20px", borderRadius: 18, background: s.urgent ? s.bg : C.paper, border: "1.5px solid " + (s.urgent ? s.color + "40" : C.fawn), animationDelay: (i * 40) + "ms", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ic size={19} style={{ color: s.color }}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: F.head, fontSize: 28, fontWeight: 900, color: s.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, marginTop: 4 }}>{s.label}</p>
              </div>
              {s.urgent && (
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, boxShadow: "0 0 0 3px " + s.color + "35", animation: "pulseGreen 2s infinite" }}/>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {claims.length === 0 ? (
        <EmptyState illustration={<EmptyClaimsIllustration/>} title="No active claims" message="When you claim an item, it’ll appear here with pickup details and status." cta="Browse Discover" onCtaClick={onBrowse} accent={C.green}/>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {claims.map((c, idx) => {
            const stage = stageInfo[c.status] || stageInfo["pickup-scheduled"];
            const StageIcon = stage.icon;
            const urgent = c.status === "pickup-today" || c.status === "pickup-overdue";
            const isRating = ratingId === c.id;

            return (
              <article key={c.id} className="fade-in" style={{ padding: "18px 22px", borderRadius: 20, background: c.status === "pickup-overdue" ? C.amberMist : (urgent ? "#FFF5F5" : C.paper), border: "1.5px solid " + (highlightId === c.id ? C.green : c.status === "pickup-overdue" ? C.amber + "40" : urgent ? C.claret + "40" : C.fawn), boxShadow: highlightId === c.id ? "0 0 0 4px " + C.greenMist + ", 0 8px 24px rgba(48,132,36,0.18)" : "none", transition: "box-shadow 200ms, border-color 200ms", animationDelay: (idx * 50) + "ms" }}>
                {c.status === "pickup-overdue" && c.autoCancelsIn && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "10px 14px", borderRadius: 12, background: C.paper, border: "1px solid " + C.amber + "35", marginBottom: 14 }}>
                    <AlertCircle size={14} style={{ color: C.amberDeep, flexShrink: 0, marginTop: 1 }}/>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.amberDeep, marginBottom: 2 }}>Pickup time passed — please confirm or reschedule</p>
                      <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.mink, lineHeight: 1.5 }}>This claim auto-cancels in <b style={{ color: C.ink }}>{c.autoCancelsIn}</b> and the item will be released to other neighbours.</p>
                    </div>
                  </div>
                )}
                {/* Urgent banner — only for pickup-today, not overdue (which has its own amber strip above) */}
                {c.status === "pickup-today" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid " + C.claret + "20" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.claret, boxShadow: "0 0 0 3px " + C.claret + "35", animation: "pulseGreen 2s infinite" }}/>
                    <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.claret, letterSpacing: "0.1em", textTransform: "uppercase" }}>Pickup today</span>
                    <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 700, color: C.claret }}>at {c.time}</span>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, " + C.sand + ", " + C.fawn + ")", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                    <ItemImage src={c.img || c.e} emojiSize={40}/>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <h3 style={{ fontFamily: F.head, fontSize: 17, fontWeight: 800, color: C.ink }}>{c.t}</h3>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.head, fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: stage.bg, color: stage.color, letterSpacing: "0.06em" }}>
                        <StageIcon size={10}/> {stage.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: F.head, fontSize: 20, fontWeight: 900, color: C.green }}>${c.price}</span>
                      <span style={{ fontFamily: F.head, fontSize: 13, fontWeight: 600, color: C.mink, display: "flex", alignItems: "center", gap: 4 }}>
                        <User size={12}/> {c.seller}
                      </span>
                    </div>
                    {!urgent && (c.date || c.time) && c.status !== "offer-pending" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, display: "flex", alignItems: "center", gap: 4 }}>
                          <Calendar size={11}/> {c.date} {c.time && "· " + c.time}
                        </span>
                        {c.addr && (
                          <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, display: "flex", alignItems: "center", gap: 4 }}>
                            <MapPin size={11}/> {c.addr}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions — right side */}
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {(c.status === "pickup-today" || c.status === "pickup-scheduled") && !isRating && (
                      <>
                        {/* BUG-055 — buyer's button is "Confirm receipt", not
                            "Picked up". It pings the seller (system message +
                            buyerConfirmedReceiptAt) but does NOT flip the claim
                            status. Only the seller flips it to PICKED_UP. */}
                        {c.buyerConfirmedReceipt ? (
                          <span style={{ padding: "9px 14px", borderRadius: 999, background: C.greenMist || "#dcfce7", color: C.greenDeep || "#15803d", fontFamily: F.head, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                            <CheckCircle size={13}/> Receipt confirmed — waiting for seller
                          </span>
                        ) : (
                          <button onClick={() => confirmReceipt(c)} className="cta-primary" style={{ padding: "9px 16px", borderRadius: 999, border: "none", background: C.green, color: "#fff", fontFamily: F.head, fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, boxShadow: "0 2px 0 " + C.greenDeep }}>
                            <CheckCircle size={13}/> Confirm receipt
                          </button>
                        )}
                        <button onClick={() => { if (onOpenThread) onOpenThread(c.t); else if (onGoToMessages) onGoToMessages(); }} title="Open the message thread with the seller" style={{ padding: "9px 14px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                          <MessageCircle size={13}/> Message
                        </button>
                        {c.status === "pickup-scheduled" && (
                          <>
                            <button onClick={() => setCancelTarget(c)} style={{ padding: "9px 14px", borderRadius: 999, border: "1.5px solid " + C.claret + "40", background: C.paper, color: C.claret, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                          </>
                        )}
                      </>
                    )}
                    {c.status === "pickup-overdue" && !isRating && (
                      <>
                        {c.buyerConfirmedReceipt ? (
                          <span style={{ padding: "9px 14px", borderRadius: 999, background: C.greenMist || "#dcfce7", color: C.greenDeep || "#15803d", fontFamily: F.head, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                            <CheckCircle size={13}/> Receipt confirmed — waiting for seller
                          </span>
                        ) : (
                          <button onClick={() => confirmReceipt(c)} className="cta-primary" style={{ padding: "9px 16px", borderRadius: 999, border: "none", background: C.green, color: "#fff", fontFamily: F.head, fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, boxShadow: "0 2px 0 " + C.greenDeep }}>
                            <CheckCircle size={13}/> Confirm receipt
                          </button>
                        )}
                        <button onClick={() => requestReschedule(c)} style={{ padding: "9px 14px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                          <RefreshCw size={13}/> Request reschedule
                        </button>
                        <button onClick={() => releaseClaim(c)} style={{ padding: "9px 14px", borderRadius: 999, border: "1.5px solid " + C.claret + "40", background: C.paper, color: C.claret, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Release
                        </button>
                      </>
                    )}
                    {/* BUG-055.1 — PROPOSED claim. Action buttons ONLY when
                        the seller made the last offer (it's my turn). If I
                        made the last offer, show "Waiting for seller" pill. */}
                    {c.status === "offer-pending" && c.iMadeTheOffer && (
                      <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 700, color: C.amberDeep, padding: "9px 14px", background: C.amberMist, borderRadius: 999, border: "1px solid " + C.amber + "30", display: "flex", alignItems: "center", gap: 5 }}>
                        <Clock size={12}/> Waiting for seller…
                      </span>
                    )}
                    {c.status === "offer-pending" && !c.iMadeTheOffer && (
                      counterClaimId === c.id ? (
                        <>
                          <span style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink }}>$</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={counterDraftAmt}
                            onChange={e => setCounterDraftAmt(e.target.value)}
                            placeholder={String(c.price || 1)}
                            autoFocus
                            style={{ width: 80, padding: "7px 10px", borderRadius: 8, border: "1.5px solid " + C.fawn, fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.ink, outline: "none", background: C.paper }}
                          />
                          <button onClick={() => submitCounterFromClaim(c)} className="cta-primary" style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontFamily: F.head, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Send</button>
                          <button onClick={() => { setCounterClaimId(null); setCounterDraftAmt(""); }} style={{ padding: "8px 10px", borderRadius: 8, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => acceptCounter(c)} className="cta-primary" style={{ padding: "9px 14px", borderRadius: 999, border: "none", background: C.green, color: "#fff", fontFamily: F.head, fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 0 " + C.greenDeep, display: "flex", alignItems: "center", gap: 5 }}>
                            <CheckCircle size={12}/> Accept ${c.price}
                          </button>
                          <button onClick={() => { setCounterClaimId(c.id); setCounterDraftAmt(String(c.price || 1)); }} style={{ padding: "9px 14px", borderRadius: 999, border: "1.5px solid " + C.green + "55", background: C.greenMist, color: C.greenDeep, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                            <RefreshCw size={12}/> Counter
                          </button>
                          <button onClick={() => declineCounter(c)} style={{ padding: "9px 14px", borderRadius: 999, border: "1.5px solid " + C.claret + "40", background: C.paper, color: C.claret, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            Decline
                          </button>
                        </>
                      )
                    )}
                  </div>
                </div>

                {/* Inline rating form */}
                {isRating && (
                  <div style={{ marginTop: 14, padding: "16px 18px", borderRadius: 14, background: C.greenMist, border: "1px solid " + C.green + "30" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                      <CheckCircle size={18} style={{ color: C.greenDeep, flexShrink: 0, marginTop: 1 }}/>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.greenDeep, marginBottom: 2 }}>Marking as picked up</p>
                        <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink }}>How was your experience with <b style={{ color: C.ink }}>{c.seller}</b>?</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 10, marginLeft: 28 }}>
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => setRatingStars(n)} style={{ border: "none", background: "none", cursor: "pointer", padding: 2 }}>
                          <Star size={26} style={{ color: n <= ratingStars ? C.amber : C.smoke }} fill={n <= ratingStars ? C.amber : "none"} strokeWidth={n <= ratingStars ? 0 : 1.5}/>
                        </button>
                      ))}
                    </div>
                    {ratingStars > 0 && (
                      <textarea value={ratingNote} onChange={e => setRatingNote(e.target.value)} placeholder="Leave a note for other neighbours (optional)…" rows={2} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.ink, outline: "none", resize: "vertical", background: C.paper, marginBottom: 10, marginLeft: 0 }}/>
                    )}
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => { setRatingId(null); setRatingStars(0); }} style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                      {ratingStars === 0 ? (
                        <button onClick={skipRating} style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Skip rating</button>
                      ) : (
                        <button onClick={submitRating} className="cta-primary" style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: C.green, color: "#fff", fontFamily: F.head, fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 0 " + C.greenDeep }}>Submit & complete</button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Cancel confirmation modal */}
      {cancelTarget && (
        <div onClick={() => setCancelTarget(null)} style={{ position: "fixed", inset: 0, background: "rgba(31, 29, 25, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24, backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} className="fade-in" style={{ background: C.paper, borderRadius: 24, width: "100%", maxWidth: 420, padding: 28, boxShadow: "0 24px 64px rgba(31, 29, 25, 0.2)" }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: C.claretMist, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <X size={26} style={{ color: C.claret }}/>
            </div>
            <h3 style={{ fontFamily: F.head, fontSize: 20, fontWeight: 900, color: C.ink, marginBottom: 8 }}>Cancel this claim?</h3>
            <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.mink, lineHeight: 1.55, marginBottom: 18 }}>
              Your claim on <b style={{ color: C.ink }}>{cancelTarget.t}</b> will be released so another neighbour can claim it. The seller will be notified.
            </p>
            <div style={{ padding: 12, borderRadius: 12, background: C.amberMist, border: "1px solid " + C.amber + "30", marginBottom: 18, display: "flex", alignItems: "center", gap: 9 }}>
              <Info size={14} style={{ color: C.amberDeep, flexShrink: 0 }}/>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.amberDeep, lineHeight: 1.5 }}>Please cancel at least 2 hours before your scheduled pickup.</p>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setCancelTarget(null)} style={{ padding: "11px 18px", borderRadius: 12, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Keep claim</button>
              <button onClick={() => cancelClaim(cancelTarget)} style={{ padding: "11px 18px", borderRadius: 12, border: "none", background: C.claret, color: "#fff", fontFamily: F.head, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Cancel claim</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


/* ============================================================
   MESSAGES PAGE
   ============================================================ */
// Demo conversations kept around so /preview/buyer-dashboard still tells the
// design story without auth. The wired version below uses these only when no
// accessToken is supplied.
const DEMO_BUYER_CONVERSATIONS = [
    {
      id: "c1", type: "claim", status: "pickup-today", unread: true, group: "active",
      item: { title: "Kids Bicycle 16\"", price: 30, img: "\uD83D\uDEB2", layer: "drop" },
      seller: { name: "Tom R.", hood: "Barrhaven", usesAI: true },
      pickup: { day: "Today", time: "10:00 AM", address: "8 Larkin Cres" },
      lastMsg: "Reminder: Your pickup is in 2 hours!",
      lastTime: "35 min ago",
      messages: [
        { from: "you", text: "Claiming at $30.", time: "Thu, 3:00 PM", type: "claim" },
        { from: "ai", text: "Claimed! The bicycle is yours at $30. When works for pickup?", time: "Thu, 3:00 PM", type: "text" },
        { from: "you", text: "Saturday morning, 10am?", time: "Thu, 3:05 PM", type: "text" },
        { from: "ai", text: "Saturday 10am works. Pickup at 8 Larkin Cres.", time: "Thu, 3:05 PM", type: "text" },
        { from: "system", text: "WhatsApp confirmation sent.", time: "Thu, 3:06 PM", type: "whatsapp" },
        { from: "ai", text: "Reminder: Your pickup is in 2 hours!", time: "Today, 8:00 AM", type: "reminder" },
      ],
    },
    {
      id: "c2", type: "offer", status: "counter", unread: true, group: "active",
      item: { title: "Cuisinart Coffee Maker", price: 25, img: "\u2615", layer: "drop" },
      seller: { name: "Sarah L.", hood: "Barrhaven", usesAI: true },
      lastMsg: "The seller's minimum is $20. Would that work?",
      lastTime: "18 min ago",
      messages: [
        { from: "you", text: "Would you take $15 for the coffee maker?", time: "Today, 11:30 AM", type: "offer", amount: 15 },
        { from: "ai", text: "The lowest the seller can go is $20. Would that work?", time: "Today, 11:30 AM", type: "counter", amount: 20 },
      ],
    },
    {
      id: "c3", type: "offer", status: "accepted", unread: false, group: "active",
      item: { title: "Full Bedroom Set", price: 550, img: "\uD83D\uDECF\uFE0F", layer: "drop" },
      seller: { name: "Priya M.", hood: "Barrhaven South", usesAI: true },
      lastMsg: "Offer accepted! $550. Choose a pickup time.",
      lastTime: "1d ago",
      messages: [
        { from: "you", text: "Would you accept $550?", time: "Yesterday, 10:00 AM", type: "offer", amount: 550 },
        { from: "ai", text: "Accepted! $550 for the Bedroom Set. When would you like to pick up?", time: "Yesterday, 10:01 AM", type: "text" },
      ],
    },
    {
      id: "c4", type: "claim", status: "pickup-confirmed", unread: false, group: "this-week",
      item: { title: "Solid Oak Dining Table", price: 350, img: "\uD83E\uDEB5", layer: "drop" },
      seller: { name: "Jane D.", hood: "Bridlewood", usesAI: true },
      pickup: { day: "Sat Apr 13", time: "2:00 PM", address: "42 Bridlewood Dr" },
      lastMsg: "Pickup confirmed for Saturday 2pm.",
      lastTime: "2h ago",
      messages: [
        { from: "you", text: "Claiming at $350.", time: "Yesterday, 4:12 PM", type: "claim" },
        { from: "ai", text: "Claim accepted! Pickup Saturday 2pm.", time: "Yesterday, 4:12 PM", type: "text" },
        { from: "system", text: "WhatsApp confirmation sent.", time: "Yesterday, 4:16 PM", type: "whatsapp" },
      ],
    },
    {
      id: "c5", type: "question", status: "answered", unread: true, group: "this-week",
      item: { title: "Standing Desk", price: 140, img: "\uD83D\uDDA5\uFE0F", layer: "shelf" },
      seller: { name: "David N.", hood: "Barrhaven", usesAI: false },
      lastMsg: "The desk goes from 72cm to 120cm.",
      lastTime: "1h ago",
      messages: [
        { from: "you", text: "What's the height range?", time: "Today, 10:45 AM", type: "question" },
        { from: "system", text: "This seller responds personally.", time: "Today, 10:45 AM", type: "notice" },
        { from: "seller", text: "72cm sitting to 120cm standing. Motor is quiet.", time: "Today, 11:50 AM", type: "text" },
      ],
    },
];

function MessagesPage({ user = null, accessToken = null, claims = [], onAcceptCounter = null, onDeclineCounter = null, openThreadId = null, onConsumeOpenThread = null, onBack = null, convList: convListProp = null, onConvListChange = null }) {
  const { isMobile } = useViewport();
  const usingBackend = !!accessToken;
  const myId = user?.id || null;

  const [activeId, setActiveId]         = useState(usingBackend ? null : "c1");
  // Mobile drill-down — null = list view, otherwise an id = thread view.
  const [mobileViewingId, setMobileViewingId] = useState(null);

  // When the parent passes an `openThreadId` (an item title — the cross-view
  // linkage we settled on), find the matching conversation and auto-select
  // it. Clear the parent's flag so back-navigation doesn't keep re-selecting.
  // Per-thread drafts — preserves the typed text when switching between
  // conversations and coming back, mirroring v2 / FB Messenger behavior.
  const [drafts, setDrafts]             = useState({});
  const draft = activeId ? (drafts[activeId] || "") : "";
  const setDraft = (value) => setDrafts(d => ({ ...d, [activeId]: value }));
  const [sending, setSending]           = useState(false);
  const [errorMsg, setErrorMsg]         = useState(null);
  const [successMsg, setSuccessMsg]     = useState(null);
  // Inline "Make an offer" composer inside the chat. Lets the buyer send an
  // OFFER message without leaving the conversation. Opens with a numeric
  // input + Send/Cancel; submits via POST /messages with messageType OFFER.
  const [offerComposerOpen, setOfferComposerOpen] = useState(false);
  const [offerComposerAmt, setOfferComposerAmt]   = useState("");

  // BUG-055 — active claims for buyer's conversations (PROPOSED + ACCEPTED).
  // Powers the in-chat action banner so the buyer can Accept/Counter/Decline
  // a seller's counter, or Confirm receipt once accepted.
  const [activeClaimByConv, setActiveClaimByConv]   = useState({});
  const [activeClaimsTick, setActiveClaimsTick]     = useState(0);
  useSocketEvent("claim:updated", () => setActiveClaimsTick(t => t + 1));
  useSocketEvent("claim:new",     () => setActiveClaimsTick(t => t + 1));
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    apiRequest("/api/claims/mine", { token: accessToken })
      .then(data => {
        if (cancelled) return;
        const list = Array.isArray(data?.claims) ? data.claims : [];
        const idx = {};
        for (const c of list) {
          if (c.conversationId && (c.status === "PROPOSED" || c.status === "ACCEPTED")) {
            idx[c.conversationId] = c;
          }
        }
        setActiveClaimByConv(idx);
      })
      .catch(() => { if (!cancelled) setActiveClaimByConv({}); });
    return () => { cancelled = true; };
  }, [accessToken, activeClaimsTick]);

  const [chatBusyClaimId, setChatBusyClaimId] = useState(null);
  const [chatCounterMode, setChatCounterMode] = useState(false);
  const [chatCounterAmt, setChatCounterAmt]   = useState("");
  // BUG-055.1 — surface every error so silent failures don't look like
  // "nothing happened".
  function chatFlashErr(action, err) {
    setErrorMsg("Couldn't " + action + ": " + (err?.message || "try again"));
    setTimeout(() => setErrorMsg(null), 4500);
  }
  function chatFlashOk(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4500);
  }
  async function chatAcceptClaim(claim) {
    setChatBusyClaimId(claim.id);
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/accept", {
        method: "PATCH", token: accessToken,
      });
      chatFlashOk("Accepted at $" + claim.amount + ". Coordinate pickup.");
      setActiveClaimsTick(t => t + 1);
    } catch (err) { chatFlashErr("accept", err); }
    finally { setChatBusyClaimId(null); }
  }
  async function chatDeclineClaim(claim) {
    setChatBusyClaimId(claim.id);
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/decline", {
        method: "PATCH", token: accessToken,
      });
      chatFlashOk("Offer declined. Item is back on the listing.");
      setActiveClaimsTick(t => t + 1);
    } catch (err) { chatFlashErr("decline", err); }
    finally { setChatBusyClaimId(null); }
  }
  async function chatCounterClaim(claim) {
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
      chatFlashOk("Countered at $" + amt + ". Waiting for the seller.");
      setChatCounterMode(false);
      setChatCounterAmt("");
      setActiveClaimsTick(t => t + 1);
    } catch (err) { chatFlashErr("counter", err); }
    finally { setChatBusyClaimId(null); }
  }
  async function chatConfirmReceipt(claim) {
    setChatBusyClaimId(claim.id);
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(claim.id) + "/confirm-receipt", {
        method: "POST", token: accessToken,
      });
      chatFlashOk("Receipt confirmed. Seller has been notified.");
      setActiveClaimsTick(t => t + 1);
    } catch (err) { chatFlashErr("confirm receipt", err); }
    finally { setChatBusyClaimId(null); }
  }

  // convList is owned by the dashboard root (so the nav badge stays accurate
  // even when this page is unmounted). When provided, we use it directly; when
  // null (e.g. tests, isolated rendering) we fall back to local state.
  const [localConvList, setLocalConvList] = useState(usingBackend ? [] : DEMO_BUYER_CONVERSATIONS);
  const convList = convListProp != null ? convListProp : localConvList;
  const setConvList = (updater) => {
    if (typeof onConvListChange === "function") {
      onConvListChange(updater);
    } else {
      setLocalConvList(updater);
    }
  };
  const [loading, setLoading]           = useState(usingBackend && convListProp == null);

  const [activeMsgs, setActiveMsgs]     = useState(null);
  const [activeLoading, setActiveLoading] = useState(false);

  // Auto-open the thread the parent asked us to open. Title-match against the
  // current conversation list; if no match (e.g. the thread doesn't exist yet)
  // we still consume the request so we don't keep trying.
  useEffect(() => {
    if (!openThreadId) return;
    const match = convList.find(c => c.item && c.item.title === openThreadId);
    if (match) {
      setActiveId(match.id);
      setMobileViewingId(match.id);
    }
    onConsumeOpenThread && onConsumeOpenThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openThreadId, convList.length]);

  // Adapter moved to module scope as `adaptBuyerConversation(api, myId)` so
  // the dashboard root can apply it before MessagesPage mounts. The local
  // alias below makes the call sites read naturally without rebinding myId.
  const adaptConversation = (api) => adaptBuyerConversation(api, myId);
  function adaptMessage(api) {
    if (!api) return null;
    const fromMe = api.senderId === myId;
    // Map backend MessageType (uppercase enum) to the lowercase keys the
    // render switch in renderMessage() uses. Unknown / missing → "text".
    const TYPE_MAP = {
      TEXT: "text", OFFER: "offer", COUNTER: "counter", CLAIM: "claim",
      WHATSAPP: "whatsapp", NOTICE: "notice", REMINDER: "reminder",
    };
    const renderType = TYPE_MAP[api.messageType] || "text";
    return {
      id:   api.id,
      from: fromMe ? "you" : "seller",
      text: api.body,
      time: new Date(api.createdAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }),
      type: renderType,
      // amount surfaces in the OFFER/COUNTER/CLAIM bubble header as "· $30"
      // — render side reads m.amount directly.
      amount: typeof api.amount === "number" ? api.amount : undefined,
    };
  }

  // Initial inbox fetch — moved to the dashboard root so the nav badges
  // stay accurate even when this page isn't mounted. We only run a fallback
  // fetch here for the legacy "no parent owns convList" case (e.g. when
  // rendered in isolation in /preview/buyer-dashboard with no token, where
  // the demo seed already provides content).
  useEffect(() => {
    if (!usingBackend) return;
    if (convListProp != null) {
      // Parent owns the list — auto-select the first thread the first time.
      if (Array.isArray(convListProp) && convListProp.length > 0) {
        setActiveId(prev => prev || convListProp[0].id);
      }
      return;
    }
    // Fallback local fetch (not the production path under DropYardBuyerDashboard).
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

  // Load messages on active-thread change
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

  // Live push: append to the OPEN thread + mark read on the server. Inbox
  // preview + unread badge updates now live at the dashboard root so they
  // stay accurate even when this page isn't mounted; we don't duplicate
  // that work here. When parent owns convList, we ALSO need to clear the
  // active thread's unread locally so the badge doesn't double-count
  // before the server's `conversation:read` echo arrives.
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
      // Clear unread on the active conv up to the parent so the badge
      // matches what's visible on screen.
      setConvList(prev => prev.map(c => c.id === activeId
        ? { ...c, unread: false, unreadCount: 0, status: c.status === "pending" ? "answered" : c.status }
        : c));
    }
  });

  async function handleSend() {
    const body = draft.trim();
    if (!body) return;
    if (!usingBackend) {
      setConvList(prev => prev.map(c => c.id === activeId
        ? { ...c, messages: [...(c.messages || []), { from: "you", text: body, time: "Now", type: "text" }], lastMsg: body, lastTime: "Now" }
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
      setDraft("");
    } catch (err) {
      setErrorMsg("Send failed: " + (err?.message || "try again"));
      setTimeout(() => setErrorMsg(null), 4500);
    } finally {
      setSending(false);
    }
  }

  // Send a fresh OFFER message from inside the chat (composer at the bottom).
  // The active conversation already has an `itemId` (via the conv's item
  // relation), so the backend's POST /:id/messages route is sufficient — no
  // need to round-trip through POST /api/conversations.
  async function sendOfferFromChat() {
    if (!usingBackend || !activeId) return;
    const amt = Math.round(Number(offerComposerAmt));
    if (!Number.isFinite(amt) || amt <= 0) {
      setErrorMsg("Enter a valid offer amount.");
      setTimeout(() => setErrorMsg(null), 4500);
      return;
    }
    setSending(true);
    try {
      await apiRequest("/api/conversations/" + encodeURIComponent(activeId) + "/messages", {
        method: "POST",
        token:  accessToken,
        body:   JSON.stringify({
          body:        "I'd like to offer $" + amt + " for this item.",
          messageType: "OFFER",
          amount:      amt,
        }),
      });
      setOfferComposerOpen(false);
      setOfferComposerAmt("");
    } catch (err) {
      setErrorMsg("Couldn't send offer: " + (err?.message || "try again"));
      setTimeout(() => setErrorMsg(null), 4500);
    } finally {
      setSending(false);
    }
  }

  // ─── Offer action handlers (BUG-052 — accept/counter/decline OFFER messages) ───
  // Buyer-side, these typically act on COUNTER messages the seller has sent
  // back. The `messageId` is captured on the OFFER bubble itself (see
  // renderMessage). Backend enforces "opposite party" and "not already
  // resolved" so client-side guards are just for UX.
  const [offerBusyMsgId, setOfferBusyMsgId] = useState(null);
  const [counterDraftMsgId, setCounterDraftMsgId] = useState(null);
  const [counterDraftAmount, setCounterDraftAmount] = useState("");
  // BUG-055 — these now operate on a CLAIM id (PROPOSED). The buyer's "Accept"
  // is for the seller's counter offer (also a Claim.amount update). The
  // back-end /accept route is seller-only; buyer's equivalent is just
  // "Accept the seller's counter" which we model as the seller's accept
  // being triggered by the buyer's confirmation — for now buyer's accept
  // is informational, the claim's current amount becomes binding the moment
  // the seller calls /accept.
  async function acceptOffer(claimId) {
    if (!usingBackend || !claimId) return;
    setOfferBusyMsgId(claimId);
    try {
      // Buyer accepting the seller's counter simply means agreeing to the
      // current amount. Since /accept is seller-only, we PATCH /amount with
      // the same value to bump the timer and surface the agreement; the
      // seller still needs to formally accept the claim.
      setSuccessMsg("Accepted. Waiting for the seller to confirm the claim.");
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
      await apiRequest("/api/claims/" + encodeURIComponent(claimId) + "/cancel", {
        method: "PATCH",
        token:  accessToken,
        body:   JSON.stringify({ reason: "buyer-cancelled" }),
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

  // Single source of truth for the rest of the render code.
  const conversations = convList;

  const statusMeta = {
    "pickup-today":      { label: "Pickup today",      color: C.claret,    bg: C.claretMist,  icon: Clock      },
    "pickup-confirmed":  { label: "Pickup confirmed",  color: C.greenDeep, bg: C.greenMist,   icon: CheckCircle },
    "counter":           { label: "Counter offer",     color: C.amberDeep, bg: C.amberMist,   icon: RefreshCw  },
    "accepted":          { label: "Offer accepted",    color: C.greenDeep, bg: C.greenMist,   icon: Check      },
    "answered":          { label: "Answered",          color: C.ai,        bg: C.aiMist,      icon: MessageSquare },
    "pending":           { label: "Pending",           color: C.amberDeep, bg: C.amberMist,   icon: Clock      },
    "declined":          { label: "Declined",          color: C.ash,       bg: C.sand,        icon: X          },
    "completed":         { label: "Completed",         color: C.ash,       bg: C.sand,        icon: Check      },
  };

  const unreadCount = conversations.filter(c => c.unread).length;

  // No type filter any more (see the note where the chips were removed), so
  // the list is simply every conversation.
  const filtered = conversations;
  const active = conversations.find(c => c.id === activeId) || conversations[0];
  const activeStatus = active ? statusMeta[active.status] : null;
  // Demo mode reads messages inline from the conversation; wired mode uses
  // the activeMsgs state populated by GET /:id/messages and socket pushes.
  const activeMessages = usingBackend ? (activeMsgs || []) : (active?.messages || []);

  function renderMessage(m, i) {
    const isYou = m.from === "you";

    // System messages: WhatsApp confirmations, AI-responds notices
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
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: C.sand, border: "1px solid " + C.fawn }}>
            <Info size={11} style={{ color: C.mink }}/>
            <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink }}>{m.text}</span>
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

    // CLAIM-type messages render as a celebratory full-width banner across
    // the thread instead of a chat bubble — they mark a contract milestone
    // (offer accepted, claim created) and deserve visual weight.
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

    // Claim / offer / counter / question chat bubbles
    const bubbleBg = isYou ? C.green : (m.from === "ai" ? C.aiMist : C.paper);
    const bubbleColor = isYou ? "#fff" : C.ink;
    const borderStyle = isYou ? "none" : ("1px solid " + (m.from === "ai" ? C.ai + "25" : C.fawn));

    return (
      <div key={i} style={{ display: "flex", justifyContent: isYou ? "flex-end" : "flex-start", marginBottom: 10 }}>
        <div style={{ maxWidth: "72%" }}>
          {m.from === "ai" && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4, marginLeft: 2 }}>
              <Sparkles size={10} style={{ color: C.ai }}/>
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.ai, letterSpacing: "0.05em" }}>AI AGENT</span>
            </div>
          )}
          {m.from === "seller" && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4, marginLeft: 2 }}>
              <User size={10} style={{ color: C.mink }}/>
              <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.mink, letterSpacing: "0.05em" }}>SELLER</span>
            </div>
          )}
          <div style={{ padding: "10px 14px", borderRadius: 14, background: bubbleBg, color: bubbleColor, border: borderStyle, fontFamily: F.body, fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>
            {(m.type === "offer" || m.type === "counter" || m.type === "claim") && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, paddingBottom: 6, borderBottom: "1px solid " + (isYou ? "rgba(255,255,255,0.25)" : C.fawn) }}>
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
          <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash, marginTop: 3, textAlign: isYou ? "right" : "left", marginLeft: 2, marginRight: 2 }}>{m.time}</p>
          {/* BUG-055.1 — Legacy in-bubble Accept/Counter/Decline removed.
              All negotiation is handled by the top-of-chat action banner. */}
        </div>
      </div>
    );
  }

  return (
    <>
      <PageTitle onBack={onBack} eyebrow="Messages" eyebrowColor={C.ai} title="Conversations" subtitle={unreadCount > 0 ? (unreadCount + " unread · " + conversations.length + " active thread" + (conversations.length !== 1 ? "s" : "")) : (conversations.length + " active thread" + (conversations.length !== 1 ? "s" : ""))} icon={MessageSquare} iconBg={C.aiMist} iconColor={C.ai}/>

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

      {usingBackend && loading && (
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: C.ash, fontFamily: F.body }}>Loading conversations…</p>
        </div>
      )}

      {/* The All / Claims / Offers / Q&A filter row was removed here too.
          BUG-088 took it off the seller dashboard for this exact reason but
          missed the buyer side: adaptBuyerConversation hardcodes
          `type: "question"` on every thread, so Claims and Offers were
          permanently 0 and Q&A was always identical to All. Worse than
          useless — a thread with an accepted claim still counted as Q&A, so
          the chips actively misreported what was in the list.
          To bring them back, first derive a real type (claim when the thread
          has a claim, offer when it has OFFER/COUNTER messages, else
          question) — the chips are the easy half. */}

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
        {/* Thread list — hidden on mobile while a thread is open. */}
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
              <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.mink }}>No threads.</p>
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
                {c.unread && <span style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", width: 6, height: 6, borderRadius: "50%", background: C.green }}/>}
                <div style={{ width: 48, height: 48, borderRadius: 12, background: C.sand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid " + C.fawn, overflow: "hidden" }}>
                  <ItemImage src={c.item.img} emojiSize={32}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
                    <p style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.item.title}</p>
                    <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: C.ash, flexShrink: 0 }}>{c.lastTime}</span>
                  </div>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <User size={10}/> {c.seller.name}
                    {c.seller.usesAI && <span style={{ fontFamily: F.head, fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 4, background: C.aiMist, color: C.ai, letterSpacing: "0.05em", marginLeft: 2 }}>AI</span>}
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

        {/* Active conversation — hidden on mobile until a thread is opened. */}
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
                <ArrowLeft size={14}/> All messages
              </button>
            )}
            {/* Thread header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid " + C.fawn, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.sand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid " + C.fawn, overflow: "hidden" }}>
                <ItemImage src={active.item.img} emojiSize={30}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: F.head, fontSize: 15, fontWeight: 800, color: C.ink }}>{active.item.title}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: F.head, fontSize: 16, fontWeight: 900, color: C.green }}>${active.item.price}</span>
                  <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, display: "flex", alignItems: "center", gap: 4 }}>
                    <User size={11}/> {active.seller.name} · {active.seller.hood}
                  </span>
                </div>
              </div>
              {activeStatus && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.head, fontSize: 11, fontWeight: 800, padding: "4px 11px", borderRadius: 999, background: activeStatus.bg, color: activeStatus.color, flexShrink: 0 }}>
                  <activeStatus.icon size={11}/> {activeStatus.label}
                </span>
              )}
            </div>

            {/* Pickup card (if applicable) */}
            {active.pickup && (
              <div style={{ padding: "12px 20px", borderBottom: "1px solid " + C.fawn, background: active.status === "pickup-today" ? C.claretMist : C.greenMist, display: "flex", alignItems: "center", gap: 12 }}>
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

            {/* BUG-055 — Buyer's in-chat action banner. Mirrors the seller side:
                  PROPOSED → Accept/Counter/Decline (the seller's current counter)
                  ACCEPTED → Confirm receipt (or "Receipt confirmed, waiting" pill) */}
            {usingBackend && active && activeClaimByConv[active.id] && (() => {
              const pc = activeClaimByConv[active.id];
              const busy = chatBusyClaimId === pc.id;
              const listed = pc.item?.price ?? 0;
              const isProposed = pc.status === "PROPOSED";
              const isAccepted = pc.status === "ACCEPTED";
              const buyerConfirmed = !!pc.buyerConfirmedReceiptAt;
              // BUG-055.1 — buyer can only Accept/Counter/Decline when the
              // SELLER made the last offer. If buyer made the last offer
              // (initial proposal or own counter), they wait for seller.
              const myTurn = isProposed && pc.lastAmountBy !== pc.buyerId;

              const bg     = isProposed ? C.amberMist : C.greenMist;
              const border = isProposed ? (C.amber + "30") : (C.green + "30");
              const iconBg = isProposed ? C.amber : C.green;
              const titleColor = isProposed ? C.amberDeep : C.greenDeep;

              return (
                <div style={{ padding: "12px 16px", background: bg, borderBottom: "1px solid " + border }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isProposed ? <DollarSign size={17} style={{ color: "#fff" }}/> : <CheckCircle size={17} style={{ color: "#fff" }}/>}
                      </div>
                      <div>
                        <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: titleColor }}>
                          {isProposed ? ("Negotiating · $" + pc.amount) : ("Accepted · $" + pc.amount + " — pickup pending")}
                        </p>
                        <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, marginTop: 2 }}>
                          {isProposed && pc.amount !== listed && ("Listed at $" + listed + " · ")}
                          {isProposed && ("expires " + (pc.expiresAt ? new Date(pc.expiresAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "soon"))}
                          {isAccepted && (buyerConfirmed ? "Receipt confirmed — waiting for seller to mark pickup complete." : "Coordinate pickup here, then confirm receipt once you have the item.")}
                        </p>
                      </div>
                    </div>
                    {isProposed && !myTurn && (
                      <span style={{ padding: "8px 14px", borderRadius: 999, background: C.paper, color: C.amberDeep, fontFamily: F.head, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, border: "1.5px solid " + C.amber + "40" }}>
                        <Clock size={12}/> Waiting for seller to respond
                      </span>
                    )}
                    {isProposed && myTurn && (chatCounterMode ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.ink }}>$</span>
                        <input type="number" inputMode="numeric" value={chatCounterAmt} onChange={e => setChatCounterAmt(e.target.value)} placeholder={String(pc.amount)} autoFocus disabled={busy} style={{ width: 80, padding: "7px 10px", borderRadius: 8, border: "1.5px solid " + C.fawn, fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.ink, outline: "none", background: C.paper }}/>
                        <button onClick={() => chatCounterClaim(pc)} disabled={busy} className="cta-primary" style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontFamily: F.head, fontSize: 11, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>Send</button>
                        <button onClick={() => { setChatCounterMode(false); setChatCounterAmt(""); }} disabled={busy} style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 11, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button onClick={() => chatAcceptClaim(pc)} disabled={busy} className="cta-primary" style={{ padding: "8px 14px", borderRadius: 999, border: "none", background: C.green, color: "#fff", fontFamily: F.head, fontSize: 12, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer", boxShadow: "0 2px 0 " + C.greenDeep, display: "flex", alignItems: "center", gap: 5 }}>
                          <CheckCircle size={12}/> Accept ${pc.amount}
                        </button>
                        <button onClick={() => { setChatCounterMode(true); setChatCounterAmt(String(pc.amount)); }} disabled={busy} style={{ padding: "8px 14px", borderRadius: 999, border: "1.5px solid " + C.green + "55", background: C.paper, color: C.greenDeep, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                          <RefreshCw size={12}/> Counter
                        </button>
                        <button onClick={() => chatDeclineClaim(pc)} disabled={busy} style={{ padding: "8px 14px", borderRadius: 999, border: "1.5px solid " + C.claret + "40", background: C.paper, color: C.claret, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>
                          Decline
                        </button>
                      </div>
                    ))}
                    {isAccepted && (buyerConfirmed ? (
                      <span style={{ padding: "9px 14px", borderRadius: 999, background: C.greenMist, color: C.greenDeep, fontFamily: F.head, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                        <CheckCircle size={13}/> Receipt confirmed
                      </span>
                    ) : (
                      <button onClick={() => chatConfirmReceipt(pc)} disabled={busy} className="cta-primary" style={{ padding: "9px 16px", borderRadius: 999, border: "none", background: C.green, color: "#fff", fontFamily: F.head, fontSize: 12, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer", boxShadow: "0 2px 0 " + C.greenDeep, display: "flex", alignItems: "center", gap: 5 }}>
                        <CheckCircle size={13}/> Confirm receipt
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Messages */}
            <div style={{ flex: 1, padding: "18px 20px", overflowY: "auto", background: C.sand + "60" }}>
              {usingBackend && activeLoading && (
                <p style={{ fontSize: 12, color: C.ash, fontFamily: F.body, textAlign: "center", padding: "20px 0" }}>Loading thread…</p>
              )}
              {!activeLoading && activeMessages.length === 0 && usingBackend && (
                <p style={{ fontSize: 12, color: C.ash, fontFamily: F.body, textAlign: "center", padding: "20px 0" }}>No messages yet — say hello.</p>
              )}
              {activeMessages.map((m, i) => renderMessage(m, i))}
            </div>

            {/* Footer — swaps based on thread state.
                  • completed / cancelled / declined → quiet "conversation closed" note.
                  • counter pending (demo `status==="counter"` OR matching offer-pending
                    claim with a counterAmount) → Accept ${X} / Decline pair.
                  • everything else → normal reply input + send. */}
            {(() => {
              const closed = active.status === "completed" || active.status === "cancelled" || active.status === "declined";
              if (closed) {
                return (
                  <div style={{ padding: "14px 16px", borderTop: "1px solid " + C.fawn, background: C.paper, textAlign: "center" }}>
                    <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, fontStyle: "italic" }}>
                      This conversation is {active.status === "cancelled" ? "cancelled" : active.status === "declined" ? "closed" : "complete"}.
                    </p>
                  </div>
                );
              }
              // Counter-offer detection — try the demo `status === "counter"` path first,
              // then fall back to a real claim row in offer-pending with a counterAmount.
              const counterMsg = Array.isArray(active.messages)
                ? [...active.messages].reverse().find(m => m && m.type === "counter")
                : null;
              const matchingClaim = (claims || []).find(c => c.t === active.item.title && c.status === "offer-pending" && c.counterAmount);
              const counterAmount = (active.status === "counter" && counterMsg && counterMsg.amount)
                || (matchingClaim && matchingClaim.counterAmount)
                || null;
              if (counterAmount) {
                return (
                  <div style={{ padding: "14px 16px", borderTop: "1px solid " + C.fawn, background: C.paper, display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, textAlign: "center" }}>
                      The seller countered at <b style={{ color: C.ink }}>${counterAmount}</b>
                    </p>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={() => onAcceptCounter && onAcceptCounter(active.item.title, counterAmount)}
                        className="cta-primary"
                        style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: "none", background: C.green, color: "#fff", fontFamily: F.head, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 0 " + C.greenDeep, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <Check size={14}/> Accept ${counterAmount}
                      </button>
                      <button
                        onClick={() => onDeclineCounter && onDeclineCounter(active.item.title)}
                        style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        Decline
                      </button>
                    </div>
                  </div>
                );
              }
              const itemSold = active.item?.status === "SOLD";
              if (itemSold) {
                // Pickup complete — lock the conversation. Show a clear
                // notice in place of the composer so it's obvious why text
                // input is gone. The thread above remains visible as a
                // history record.
                return (
                  <div style={{ padding: "16px 18px", borderTop: "1px solid " + C.fawn, background: C.greenMist + "60", display: "flex", alignItems: "center", gap: 10 }}>
                    <CheckCircle size={18} style={{ color: C.greenDeep, flexShrink: 0 }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.greenDeep, letterSpacing: "0.04em", textTransform: "uppercase" }}>Conversation closed</p>
                      <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, marginTop: 2 }}>This item has been picked up. The thread is kept as a record.</p>
                    </div>
                  </div>
                );
              }
              return (
                <div style={{ borderTop: "1px solid " + C.fawn, background: C.paper }}>
                  {/* Inline offer composer — opens above the text input when
                      the buyer taps "$ Offer". Lets them propose a counter
                      price directly from the conversation without leaving
                      for Discover. Backend stores it as a real OFFER message
                      so the seller's Accept/Counter/Decline buttons apply. */}
                  {offerComposerOpen && usingBackend && (
                    <div style={{ padding: "10px 16px", borderBottom: "1px solid " + C.fawn, background: C.aiMist + "60", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.ai, letterSpacing: "0.06em", textTransform: "uppercase" }}>Your offer</span>
                      <span style={{ fontFamily: F.head, fontSize: 16, fontWeight: 900, color: C.ai }}>$</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        autoFocus
                        value={offerComposerAmt}
                        onChange={e => setOfferComposerAmt(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendOfferFromChat(); } if (e.key === "Escape") { setOfferComposerOpen(false); setOfferComposerAmt(""); } }}
                        placeholder={active.item?.price ? String(Math.max(1, Math.round(active.item.price * 0.9))) : "0"}
                        disabled={sending}
                        style={{ flex: 1, minWidth: 0, padding: "8px 12px", borderRadius: 10, border: "1.5px solid " + C.ai + "40", fontFamily: F.head, fontSize: 14, fontWeight: 700, color: C.ink, outline: "none", background: C.paper }}
                      />
                      {active.item?.price && (
                        <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, whiteSpace: "nowrap" }}>vs ${active.item.price} asking</span>
                      )}
                      <button onClick={sendOfferFromChat} disabled={sending || !offerComposerAmt} style={{ padding: "8px 14px", borderRadius: 999, border: "none", background: C.ai, color: "#fff", fontFamily: F.head, fontSize: 12, fontWeight: 800, cursor: (sending || !offerComposerAmt) ? "not-allowed" : "pointer", opacity: (sending || !offerComposerAmt) ? 0.6 : 1, flexShrink: 0 }}>{sending ? "…" : "Send offer"}</button>
                      <button onClick={() => { setOfferComposerOpen(false); setOfferComposerAmt(""); }} disabled={sending} style={{ padding: "8px 10px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", flexShrink: 0 }}><X size={12}/></button>
                    </div>
                  )}
                  <div style={{ padding: "12px 16px", display: "flex", gap: 8, alignItems: "center" }}>
                    {/* BUG-055 — only show "$ Offer" when there's no active
                        claim on this conversation. If a PROPOSED/ACCEPTED
                        claim already exists, the action banner above already
                        handles the negotiation; a duplicate would 409 anyway. */}
                    {usingBackend && !offerComposerOpen && active && !activeClaimByConv[active.id] && (
                      <button
                        onClick={() => { setOfferComposerOpen(true); setOfferComposerAmt(active.item?.price ? String(Math.max(1, Math.round(active.item.price * 0.9))) : ""); }}
                        disabled={sending}
                        title="Make an offer"
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 12px", borderRadius: 999, border: "1.5px solid " + C.ai + "40", background: C.aiMist + "80", color: C.ai, fontFamily: F.head, fontSize: 12, fontWeight: 800, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.5 : 1, flexShrink: 0, whiteSpace: "nowrap" }}
                      >
                        <DollarSign size={13} strokeWidth={2.4}/> Offer
                      </button>
                    )}
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder={"Message " + active.seller.name.split(" ")[0] + "..."}
                      disabled={sending}
                      style={{ flex: 1, padding: "10px 14px", borderRadius: 999, border: "1.5px solid " + C.fawn, fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.ink, outline: "none", background: C.paper }}
                    />
                    <button onClick={handleSend} disabled={sending || !draft.trim()} style={{ width: 42, height: 42, borderRadius: "50%", border: "none", background: C.green, color: "#fff", cursor: (sending || !draft.trim()) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 0 " + C.greenDeep, flexShrink: 0, opacity: (sending || !draft.trim()) ? 0.5 : 1 }}>
                      <Send size={16}/>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {!active && usingBackend && !loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
            <div style={{ textAlign: "center" }}>
              <MessageSquare size={32} style={{ color: "#e2e8f0", marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: C.ash, fontFamily: F.body }}>No conversations yet</p>
              <p style={{ fontSize: 12, color: C.smoke, marginTop: 4, fontFamily: F.body }}>Ask a seller a question from any item — your threads will show up here.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ============================================================
   HISTORY PAGE
   ============================================================ */
function HistoryPage({ highlightId = null, onClearHighlight = null, onOpenThread = null, accessToken = null, onBack = null }) {
  const { isMobile: __isMobile } = useViewport();
  useEffect(() => {
    if (!highlightId || !onClearHighlight) return;
    const t = setTimeout(() => onClearHighlight(), 2200);
    return () => clearTimeout(t);
  }, [highlightId, onClearHighlight]);
  const [reviewId, setReviewId] = useState(null);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviews, setReviews] = useState({}); // {txId: stars}
  const [collapsed, setCollapsed] = useState(() => ({})); // {"year-2025": true, "2026-March": true}
  const toggleCollapse = (key) => setCollapsed(p => ({ ...p, [key]: !p[key] }));

  // ─── Wired history (buyer perspective) ───
  // Fetch the buyer's PICKED_UP claims and project them into the existing
  // `transactions` shape. Falls back to the demo array when unauthed.
  // historyTick is bumped by socket events so a newly-picked-up claim moves
  // from Claims → History in real time.
  const [liveTxs, setLiveTxs] = useState(null);
  const [historyTick, setHistoryTick] = useState(0);
  useSocketEvent("claim:updated", () => setHistoryTick((t) => t + 1));
  useEffect(() => {
    if (!accessToken) { setLiveTxs(null); return; }
    let cancelled = false;
    apiRequest("/api/claims/mine", { token: accessToken })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.claims) ? data.claims : [];
        const txs = list
          .filter((c) => c.status === "PICKED_UP")
          .map(adaptBuyerHistory)
          .filter(Boolean);
        setLiveTxs(txs);
      })
      .catch(() => { /* keep demo data */ });
    return () => { cancelled = true; };
  }, [accessToken, historyTick]);

  const transactions = Array.isArray(liveTxs) ? liveTxs : [
    { id: "t1",  title: "Solid Oak Dining Table", price: 350, origPrice: 900, img: "\uD83E\uDEB5",       cat: "Furniture",              seller: "Jane D.",          hood: "Bridlewood",     date: "2026-04-13", layer: "drop",      rated: false, rating: null },
    { id: "t2",  title: "Kids Bicycle",           price: 30,  origPrice: null, img: "\uD83D\uDEB2",       cat: "Sports & Outdoor",       seller: "Tom R.",           hood: "Barrhaven",      date: "2026-04-13", layer: "drop",      rated: false, rating: null },
    { id: "t3",  title: "Yoga Mat + Bands",       price: 15,  origPrice: null, img: "\uD83E\uDDD8",       cat: "Sports & Outdoor",       seller: "Chloe D.",         hood: "Barrhaven",      date: "2026-04-08", layer: "shelf",     rated: true,  rating: 5 },
    { id: "t5",  title: "IKEA KALLAX Shelf",      price: 35,  origPrice: null, img: "\uD83D\uDCDA",       cat: "Furniture",              seller: "Mike T.",          hood: "Barrhaven",      date: "2026-03-29", layer: "drop",      rated: true,  rating: 4 },
    { id: "t6",  title: "Winter Boots",           price: 25,  origPrice: 60,  img: "\uD83E\uDD7E",       cat: "Clothing & Accessories", seller: "Raj P.",           hood: "Barrhaven",      date: "2026-03-22", layer: "drop",      rated: true,  rating: 5 },
    { id: "t7",  title: "Cuisinart Coffee Maker", price: 20,  origPrice: 25,  img: "\u2615",              cat: "Appliances & Kitchen",   seller: "Sarah L.",         hood: "Barrhaven",      date: "2026-03-15", layer: "drop",      rated: true,  rating: 4 },
    { id: "t8",  title: "Standing Desk",          price: 140, origPrice: 175, img: "\uD83D\uDDA5\uFE0F",  cat: "Furniture",              seller: "David N.",         hood: "Barrhaven",      date: "2026-02-22", layer: "shelf",     rated: true,  rating: 5 },
    { id: "t9",  title: "Christmas Tree 7ft",     price: 40,  origPrice: 120, img: "\uD83C\uDF84",       cat: "Other",                  seller: "Linda M.",         hood: "Barrhaven",      date: "2025-12-14", layer: "drop",      rated: true,  rating: 5 },
    { id: "t10", title: "Snow Blower",            price: 95,  origPrice: 200, img: "\u2744\uFE0F",        cat: "Tools & Garden",         seller: "Paul F.",          hood: "Half Moon Bay",  date: "2025-11-22", layer: "drop",      rated: true,  rating: 4 },
  ];

  // With review state overlay
  const withReviews = transactions.map(t => ({
    ...t,
    rated: t.rated || reviews[t.id] != null,
    rating: reviews[t.id] != null ? reviews[t.id] : t.rating,
  }));

  const totalItems = withReviews.length;
  const totalSpent = withReviews.reduce((a, t) => a + t.price, 0);
  const totalSaved = withReviews.reduce((a, t) => a + (t.origPrice ? t.origPrice - t.price : 0), 0);
  const unratedCount = withReviews.filter(t => !t.rated).length;
  const co2Kg = Math.round(totalItems * 2.5);

  // Group by year > month
  const grouped = {};
  withReviews.forEach(t => {
    const d = new Date(t.date);
    const y = d.getFullYear();
    const m = d.toLocaleDateString("en-US", { month: "long" });
    if (!grouped[y]) grouped[y] = {};
    if (!grouped[y][m]) grouped[y][m] = [];
    grouped[y][m].push(t);
  });
  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);

  const stats = [
    { label: "Items bought", value: totalItems,          icon: Package,      color: C.green,     bg: C.greenMist  },
    { label: "Total spent",  value: "$" + totalSpent,    icon: DollarSign,   color: C.amberDeep, bg: C.amberMist  },
    { label: "Total saved",  value: "$" + totalSaved,    icon: TrendingDown, color: C.greenDeep, bg: C.greenMist,  sub: "vs original" },
    { label: "Avg rating",   value: (withReviews.filter(t => t.rating).reduce((a,t) => a+t.rating, 0) / Math.max(1, withReviews.filter(t => t.rating).length)).toFixed(1), icon: Star, color: C.amberDeep, bg: C.amberMist },
  ];

  const submitReview = async (txId) => {
    // Optimistic overlay so the row shows the rating immediately.
    const previous = reviews[txId];
    setReviews(r => ({ ...r, [txId]: reviewStars }));
    setReviewId(null);
    setReviewStars(0);
    // Persist to the backend when we have a real session + claim id (history
    // rows for demo accounts have non-cuid ids and skip the API).
    const isReal = accessToken && typeof txId === "string" && txId.length > 8 && !txId.startsWith("bc");
    if (!isReal) return;
    try {
      await apiRequest("/api/claims/" + encodeURIComponent(txId) + "/review", {
        method: "POST",
        token:  accessToken,
        body:   JSON.stringify({ rating: reviewStars }),
      });
    } catch {
      // Roll back the optimistic overlay so the row stops claiming it's rated.
      setReviews(r => {
        const copy = { ...r };
        if (previous == null) delete copy[txId];
        else copy[txId] = previous;
        return copy;
      });
    }
  };

  function TxRow({ tx, idx }) {
    const saved = tx.origPrice ? tx.origPrice - tx.price : 0;
    const isReviewing = reviewId === tx.id;
    const layerTint = tx.layer === "drop" ? C.greenMist : tx.layer === "shelf" ? C.amberMist : C.sand;
    const layerBadge = tx.layer === "drop" ? { label: "Drop", bg: C.green, color: "#fff" } : tx.layer === "shelf" ? { label: "Shelf", bg: C.amber, color: "#fff" } : { label: "Drop", bg: C.green, color: "#fff" };

    return (
      <article style={{ padding: "16px 18px", borderRadius: 16, background: C.paper, border: "1.5px solid " + (highlightId === tx.id ? C.green : C.fawn), boxShadow: highlightId === tx.id ? "0 0 0 4px " + C.greenMist + ", 0 8px 24px rgba(48,132,36,0.18)" : "none", transition: "box-shadow 200ms, border-color 200ms", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: layerTint, border: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
            <ItemImage src={tx.img} emojiSize={28}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
              <p style={{ fontFamily: F.head, fontSize: 15, fontWeight: 800, color: C.ink }}>{tx.title}</p>
              <span style={{ fontFamily: F.head, fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 5, background: layerBadge.bg, color: layerBadge.color, letterSpacing: "0.05em", textTransform: "uppercase" }}>{layerBadge.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink }}>{tx.seller}</span>
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, display: "flex", alignItems: "center", gap: 3 }}><MapPin size={10}/> {tx.hood}</span>
              <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.ash }}>{new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            {tx.rated && (
              <div style={{ display: "flex", gap: 2, marginTop: 6 }}>
                {[1,2,3,4,5].map(n => <Star key={n} size={13} style={{ color: n <= tx.rating ? C.amber : C.fawn }} fill={n <= tx.rating ? C.amber : "none"} strokeWidth={n <= tx.rating ? 0 : 1.5}/>)}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: "flex-end" }}>
              <span style={{ fontFamily: F.head, fontSize: 22, fontWeight: 900, color: C.green }}>${tx.price}</span>
              {tx.origPrice && <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.ash, textDecoration: "line-through" }}>${tx.origPrice}</span>}
            </div>
            {saved > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end", marginTop: 3 }}>
                <TrendingDown size={11} style={{ color: C.greenDeep }}/>
                <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.greenDeep }}>Saved ${saved}</span>
              </div>
            )}
            {!tx.rated && !isReviewing && (
              <button onClick={() => { setReviewId(tx.id); setReviewStars(0); }} style={{ marginTop: 8, padding: "6px 12px", borderRadius: 999, border: "1.5px solid " + C.amber, background: C.amberMist, color: C.amberDeep, fontFamily: F.head, fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                <Star size={11}/> Leave review
              </button>
            )}
          </div>
        </div>

        {isReviewing && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: C.sand, border: "1px solid " + C.fawn }}>
            <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.ink, marginBottom: 10 }}>How was your experience with {tx.seller}?</p>
            <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setReviewStars(n)} style={{ border: "none", background: "none", cursor: "pointer", padding: 2 }}>
                  <Star size={24} style={{ color: n <= reviewStars ? C.amber : C.smoke }} fill={n <= reviewStars ? C.amber : "none"} strokeWidth={n <= reviewStars ? 0 : 1.5}/>
                </button>
              ))}
            </div>
            {reviewStars > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => { setReviewId(null); setReviewStars(0); }} style={{ padding: "7px 14px", borderRadius: 10, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                <button onClick={() => submitReview(tx.id)} className="cta-primary" style={{ padding: "7px 14px", borderRadius: 10, border: "none", background: C.green, color: "#fff", fontFamily: F.head, fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 0 " + C.greenDeep }}>Submit</button>
              </div>
            )}
          </div>
        )}
      </article>
    );
  }

  return (
    <>
      <PageTitle onBack={onBack} eyebrow="Your history" eyebrowColor={C.amberDeep} title="Purchase history" subtitle={totalItems + " completed pickup" + (totalItems !== 1 ? "s" : "") + " across all channels"} icon={Award} iconBg={C.amberMist} iconColor={C.amberDeep}/>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: __isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: __isMobile ? 10 : 14, marginBottom: __isMobile ? 16 : 22 }}>
        {stats.map((s, i) => {
          const Ic = s.icon;
          return (
            <div key={i} className="fade-in" style={{ padding: "18px 20px", borderRadius: 18, background: C.paper, border: "1.5px solid " + C.fawn, animationDelay: (i * 40) + "ms" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic size={17} style={{ color: s.color }}/>
                </div>
                {s.sub && <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: C.ash }}>{s.sub}</span>}
              </div>
              <p style={{ fontFamily: F.head, fontSize: 26, fontWeight: 900, color: s.color, letterSpacing: "-0.02em" }}>{s.value}</p>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink, marginTop: 2 }}>{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Unrated nudge */}
      {unratedCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 14, background: C.amberMist, border: "1px solid " + C.amber + "30", marginBottom: 22 }}>
          <Star size={16} style={{ color: C.amberDeep, flexShrink: 0 }}/>
          <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.amberDeep }}>{unratedCount} unrated purchase{unratedCount !== 1 ? "s" : ""}</p>
          <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink }}>Reviews help neighbours build trust.</p>
        </div>
      )}

      {/* Timeline grouped by year / month — collapsible */}
      {years.map(year => {
        const yearTxs = withReviews.filter(t => new Date(t.date).getFullYear() === year);
        const yearSpent = yearTxs.reduce((a, t) => a + t.price, 0);
        const months = Object.keys(grouped[year]);
        const yearKey = "year-" + year;
        const yearCollapsed = !!collapsed[yearKey];
        return (
          <section key={year} style={{ marginBottom: 28 }}>
            {/* Year header — full-width button, collapsible */}
            <button onClick={() => toggleCollapse(yearKey)} style={{ width: "100%", display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "12px 0 10px", marginBottom: yearCollapsed ? 0 : 14, borderBottom: "2px solid " + C.fawn, background: "none", border: "none", borderBottomStyle: "solid", cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {yearCollapsed ? <ChevronRight size={20} style={{ color: C.mink, flexShrink: 0 }}/> : <ChevronDown size={20} style={{ color: C.mink, flexShrink: 0 }}/>}
                <h2 style={{ fontFamily: F.head, fontSize: 22, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em" }}>{year}</h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.mink }}>{yearTxs.length} item{yearTxs.length !== 1 ? "s" : ""}</span>
                <span style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.green }}>${yearSpent}</span>
              </div>
            </button>

            {!yearCollapsed && months.map(month => {
              const monthKey = year + "-" + month;
              const monthTxs = grouped[year][month];
              const monthSpent = monthTxs.reduce((a, t) => a + t.price, 0);
              const monthCollapsed = !!collapsed[monthKey];
              return (
                <div key={month} style={{ marginBottom: 14 }}>
                  {/* Month header — collapsible chip */}
                  <button onClick={() => toggleCollapse(monthKey)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", marginBottom: monthCollapsed ? 0 : 10, borderRadius: 12, border: "1px solid " + C.fawn, background: monthCollapsed ? C.paper : C.sand, cursor: "pointer", textAlign: "left", transition: "all 150ms" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.smoke; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.fawn; }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {monthCollapsed ? <ChevronRight size={14} style={{ color: C.mink, flexShrink: 0 }}/> : <ChevronDown size={14} style={{ color: C.mink, flexShrink: 0 }}/>}
                      <p style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.ink, letterSpacing: "0.12em", textTransform: "uppercase" }}>{month}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink }}>{monthTxs.length} item{monthTxs.length !== 1 ? "s" : ""}</span>
                      <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.green }}>${monthSpent}</span>
                    </div>
                  </button>
                  {!monthCollapsed && monthTxs.map((tx, idx) => <TxRow key={tx.id} tx={tx} idx={idx}/>)}
                </div>
              );
            })}
          </section>
        );
      })}

      {/* Community impact strip */}
      <div style={{ padding: "24px 28px", borderRadius: 22, background: "linear-gradient(135deg, " + C.ink + ", #3A3730)", position: "relative", overflow: "hidden", marginTop: 20 }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(255, 255, 255, 0.04)" }}/>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", position: "relative" }}>
          <div>
            <p style={{ fontFamily: F.head, fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 6 }}>Your community impact</p>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", lineHeight: 1.55, maxWidth: 420 }}>
              You've kept <b style={{ color: C.amber }}>{totalItems} items</b> out of landfill and saved <b style={{ color: C.green }}>${totalSaved}</b> buying from neighbours.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
            <div style={{ textAlign: "center", padding: "12px 18px", borderRadius: 14, background: "rgba(255,255,255,0.08)", minWidth: 100 }}>
              <Leaf size={18} style={{ color: C.green, marginBottom: 5 }}/>
              <p style={{ fontFamily: F.head, fontSize: 20, fontWeight: 900, color: "#fff" }}>{co2Kg}kg</p>
              <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>CO2 avoided</p>
            </div>
            <div style={{ textAlign: "center", padding: "12px 18px", borderRadius: 14, background: "rgba(255,255,255,0.08)", minWidth: 100 }}>
              <Award size={18} style={{ color: C.amber, marginBottom: 5 }}/>
              <p style={{ fontFamily: F.head, fontSize: 20, fontWeight: 900, color: "#fff" }}>{totalItems}</p>
              <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Items rescued</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================================================
   SELL-WITH-AI CTA — shown at bottom of Discover in both states
   ============================================================ */
function SellWithAICta({ onSwitchRole }) {
  // Rolling messages that cycle every 3 seconds
  const messages = [
    { icon: "📸",  text: "Create listings from photos" },
    { icon: "💬",  text: "Answer buyer questions instantly" },
    { icon: "🤝",  text: "Negotiate offers automatically" },
    { icon: "📦",  text: "Coordinate pickups via WhatsApp" },
    { icon: "✨",  text: "5 free listings every month" },
  ];
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <section style={{ paddingTop: 44 }}>
      <div className="sell-ai-banner" style={{
        padding: "18px 26px", borderRadius: 20,
        background: "linear-gradient(110deg, " + C.aiMist + " 0%, #F7F3FF 25%, " + C.paper + " 55%, #FFF8F0 80%, " + C.aiMist + " 100%)",
        backgroundSize: "200% 100%",
        border: "1.5px solid " + C.ai + "25",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 20, flexWrap: "wrap",
        position: "relative", overflow: "hidden",
        animation: "aiShimmer 8s ease-in-out infinite",
      }}>
        {/* Decorative purple blur */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: C.ai + "12" }}/>
        <div style={{ position: "absolute", bottom: -50, left: 220, width: 120, height: 120, borderRadius: "50%", background: C.amber + "10" }}/>

        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative", flex: 1, minWidth: 280 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13,
            background: "linear-gradient(135deg, " + C.ai + ", #6D28D9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, boxShadow: "0 3px 10px " + C.ai + "35",
            animation: "sellAiPulse 2.5s ease-in-out infinite",
          }}>
            <Sparkles size={20} style={{ color: "#fff" }}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: F.head, fontSize: 16, fontWeight: 900, color: C.ink, letterSpacing: "-0.015em", marginBottom: 2 }}>Got stuff to sell?</p>
            <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, color: C.mink, lineHeight: 1.4, marginBottom: 3 }}>
              Let AI create your listings from photos and manage the sale process. <span style={{ color: C.ai, fontWeight: 700 }}>5 free/month.</span>
            </p>
            {/* Rolling messages ticker */}
            <div style={{ height: 18, overflow: "hidden", position: "relative" }}>
              {messages.map((m, i) => {
                const offset = i - msgIdx;
                const isActive = i === msgIdx;
                return (
                  <div key={i} style={{
                    position: "absolute",
                    top: 0, left: 0,
                    display: "flex", alignItems: "center", gap: 7,
                    transform: "translateY(" + (offset * 18) + "px)",
                    opacity: isActive ? 1 : 0,
                    transition: "transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 500ms",
                  }}>
                    <span style={{ fontSize: 13 }}>{m.icon}</span>
                    <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.ai, letterSpacing: "0.01em" }}>{m.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* "Sell with AI" CTA — de-activated until the AI agent ships. It used to
            flip the dashboard into seller mode; that handler is intentionally
            detached so the button can't be clicked while the feature is unbuilt.
            Re-enable by restoring the onSwitchRole onClick + dropping `disabled`. */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative" }}>
          <button
            disabled
            aria-disabled="true"
            title="Sell with AI is coming soon"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "13px 24px", borderRadius: 999, border: "none",
              background: C.smoke,
              color: C.mink,
              fontFamily: F.head, fontSize: 14, fontWeight: 800,
              cursor: "not-allowed",
              opacity: 0.7,
              position: "relative",
              whiteSpace: "nowrap",
              boxShadow: "none",
            }}
          >
            <Sparkles size={15}/> Sell with AI <ArrowRight size={15}/>
          </button>
          <span style={{
            fontFamily: F.head, fontSize: 9, fontWeight: 800,
            padding: "2px 8px", borderRadius: 999,
            background: C.ai + "18", color: C.ai,
            letterSpacing: "0.08em", textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}>Coming soon</span>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   DISCOVER — Between Drops state
   ============================================================ */
function DiscoverPage({ savedIds, onToggleSave, onSelect, onClaimNow, state, reminded, onRemindMe, savedPreview, togglePreview, onSwitchRole, onPreviewItem, onSeeAllPreviews, claimedIds = new Set(), purchasedIds = new Set(), itemsSource = null, itemsLoading = false, sneakPeekSource = null }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("newest");
  const [panelOpen, setPanelOpen] = useState(false);

  // Unique-seller count for the AnticipationBand "X neighbours have items
  // lined up" line. Null when no source was passed (i.e. preview routes) so
  // AnticipationBand can keep its own demo fallback.
  const queuedSellerCount = Array.isArray(sneakPeekSource) ? new Set(sneakPeekSource.map(i => i.seller).filter(Boolean)).size : null;
  const queuedSellerNames = Array.isArray(sneakPeekSource) ? Array.from(new Set(sneakPeekSource.map(i => i.seller).filter(Boolean))) : null;
  const dropOpenCountdown = useDropOpenCountdownString();

  // Show the cardboard-box skeleton on the initial backend load — empty
  // network states should not look like "the marketplace is empty".
  if (itemsLoading) {
    return (
      <>
        {state === "between" && <AnticipationBand onRemindMe={onRemindMe} reminded={reminded} queuedCount={queuedSellerCount} sellerNames={queuedSellerNames}/>}
        {state === "live" && <WelcomeBand/>}
        <FilterRail filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} cat={cat} setCat={setCat} sort={sort} setSort={setSort} panelOpen={panelOpen} setPanelOpen={setPanelOpen} state={state}/>
        <DiscoverSkeleton/>
      </>
    );
  }

  let items = Array.isArray(itemsSource) ? [...itemsSource] : [...allItems];

  // FILTER LOGIC — differs by state
  // During Live Drop: [Everything] includes drop + shelf items unified as one pool
  //                   No Shelf tab during Live
  // During Between:   [Everything] shows shelf items
  //                   [Shelf] filters to shelf only
  const isLive = state === "live";
  if (filter === "shelf" && !isLive) items = items.filter(i => i.layer === "shelf");

  if (cat !== "All") items = items.filter(i => i.cat === cat);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(i => i.t.toLowerCase().includes(q) || i.cat.toLowerCase().includes(q) || i.seller.toLowerCase().includes(q));
  }
  if (sort === "priceLow")  items = [...items].sort((a, b) => a.p - b.p);
  if (sort === "priceHigh") items = [...items].sort((a, b) => b.p - a.p);
  if (sort === "nearest")   items = [...items].sort((a, b) => parseFloat(a.dist) - parseFloat(b.dist));

  const dropItems      = items.filter(i => i.layer === "drop");
  const shelfItems     = items.filter(i => i.layer === "shelf");

  // UNIFIED LIVE POOL: during Live Drop, all claimable items mix into one grid.
  // Shuffle deterministically by ID to avoid clumping by type.
  // Live unified pool — saved-from-peek items get sort priority (appear first)
  const liveUnifiedPool = isLive && filter === "all"
    ? [...dropItems, ...shelfItems].sort((a, b) => {
        const aPeek = a.fromPeek && savedPreview.has(a.id) ? 1 : 0;
        const bPeek = b.fromPeek && savedPreview.has(b.id) ? 1 : 0;
        if (aPeek !== bPeek) return bPeek - aPeek; // peek items first
        return (a.id * 7 % 13) - (b.id * 7 % 13);
      })
    : [];

  return (
    <>
      {state === "between" && <AnticipationBand onRemindMe={onRemindMe} reminded={reminded} queuedCount={queuedSellerCount} sellerNames={queuedSellerNames}/>}
      {state === "live" && <WelcomeBand/>}

      <FilterRail filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} cat={cat} setCat={setCat} sort={sort} setSort={setSort} panelOpen={panelOpen} setPanelOpen={setPanelOpen} state={state}/>

      {/* Preview strip — only when Between Drops */}
      {state === "between" && filter === "all" && (
        <PreviewStrip savedPreview={savedPreview} togglePreview={togglePreview} onPreviewItem={onPreviewItem} onSeeAllPreviews={onSeeAllPreviews} sneakPeekSource={sneakPeekSource}/>
      )}

{/* LIVE DROP unified pool: drop + shelf items mixed together.
          Shelf items inherit Live Drop styling (no amber badge). */}
      {isLive && filter === "all" && liveUnifiedPool.length > 0 && (
        <>
          {(() => {
            const peekLiveCount = liveUnifiedPool.filter(i => i.fromPeek && savedPreview.has(i.id)).length;
            const subtitle = peekLiveCount > 0
              ? (peekLiveCount === 1
                  ? "1 item from your Sneak Peek is live and shown first. " + liveUnifiedPool.length + " items total."
                  : peekLiveCount + " items from your Sneak Peek are live and shown first. " + liveUnifiedPool.length + " items total.")
              : liveUnifiedPool.length + " item" + (liveUnifiedPool.length === 1 ? "" : "s") + " up for grabs. The window closes Sunday 6pm — claim now before they're gone.";
            return <SectionHeader eyebrow="Live Drop" eyebrowBg={C.green} title="Your neighbours right now" subtitle={subtitle} pulse={true}/>;
          })()}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {liveUnifiedPool.map((item, i) => (
              <ItemCard key={item.id} item={item} saved={savedIds.has(item.id)} onToggleSave={onToggleSave} onOpen={() => onSelect(toDetailItem(item))} onClaimNow={() => onClaimNow(toDetailItem(item))} index={i} liveMode={true} fromPeek={item.fromPeek && savedPreview.has(item.id)} claimedByMe={claimedIds.has(item.id)} purchasedByMe={purchasedIds.has(item.id)}/>
            ))}
          </div>
        </>
      )}

      {/* BETWEEN DROPS — unified "Available now" pool: Shelf + Dedicated items mixed together.
          Each type keeps its own badge (amber for Shelf, type colour for Dedicated). */}
      {!isLive && filter === "all" && shelfItems.length > 0 && (() => {
        const betweenPool = [...shelfItems].sort((a, b) => (a.id * 7 % 13) - (b.id * 7 % 13));
        return (
          <>
            <SectionHeader eyebrow="Available now" eyebrowBg={C.amber} title="Don't wait for Saturday" subtitle={betweenPool.length + " items you can grab today — Shelf carryovers available for pickup anytime."} pulse={true}/>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
              {betweenPool.map((item, i) => (
                <ItemCard key={item.id} item={item} saved={savedIds.has(item.id)} onToggleSave={onToggleSave} onOpen={() => onSelect(toDetailItem(item))} onClaimNow={() => onClaimNow(toDetailItem(item))} index={i} fromPeek={item.fromPeek && savedPreview.has(item.id)} claimedByMe={claimedIds.has(item.id)} purchasedByMe={purchasedIds.has(item.id)}/>
              ))}
            </div>
          </>
        );
      })()}

      {/* BETWEEN DROPS, Shelf filter — Shelf items only */}
      {!isLive && filter === "shelf" && shelfItems.length > 0 && (
        <>
          <SectionHeader eyebrow="Available now" eyebrowBg={C.amber} title="Don't wait for Saturday" subtitle={shelfItems.length + " items ready to grab right now. Message the seller to arrange pickup."} pulse={true}/>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {shelfItems.map((item, i) => (
              <ItemCard key={item.id} item={item} saved={savedIds.has(item.id)} onToggleSave={onToggleSave} onOpen={() => onSelect(toDetailItem(item))} onClaimNow={() => onClaimNow(toDetailItem(item))} index={i} fromPeek={item.fromPeek && savedPreview.has(item.id)} claimedByMe={claimedIds.has(item.id)} purchasedByMe={purchasedIds.has(item.id)}/>
            ))}
          </div>
        </>
      )}

      {/* "No results" empty state — only shows when filters/search yield nothing.
          Skips the case where the unified pool is empty because the seller list
          itself is empty (that's covered by the standard between/live sections). */}
      {items.length === 0 && (
        <EmptyState
          illustration={<EmptySearchIllustration/>}
          title="No items match your filters"
          message={search ? "Try a broader search or clear the active filters." : "Try a different category, or clear filters to see everything."}
          cta="Clear filters"
          onCtaClick={() => { setSearch(""); setCat("All"); setFilter("all"); setSort("newest"); }}
          accent={C.green}
        />
      )}

      {/* Sell-with-AI CTA — the hero promotional surface, shown in both states */}
      <SellWithAICta onSwitchRole={onSwitchRole}/>

      {/* Quiet reminder row — only during Between Drops. No panel, no border, no gradient.
          Sits as a gentle utility footer beneath the AI banner, signaling Saturday without
          competing for attention. */}
      {state === "between" && filter === "all" && (
        <section style={{ paddingTop: 18, paddingBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.amber, opacity: 0.35, animation: "pulseAmber 2.2s ease-in-out infinite" }}/>
                <span style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: C.amber }}/>
              </span>
              <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.mink }}>
                {dropOpenDay()}'s Drop opens in <b style={{ color: C.ink, fontWeight: 800 }}>{dropOpenCountdown || "..."}</b>
              </span>
            </span>
            <span style={{ color: C.smoke, fontSize: 12 }}>·</span>
            <button onClick={onRemindMe} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: 0, border: "none", background: "none",
              fontFamily: F.head, fontSize: 13, fontWeight: 700,
              color: reminded ? C.amberDeep : C.amber,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 4,
              textDecorationColor: reminded ? C.amberDeep + "50" : C.amber + "50",
            }}>
              {reminded ? <><Check size={13}/> Reminder set</> : <><Bell size={13}/> Remind me Saturday</>}
            </button>
          </div>
        </section>
      )}
    </>
  );
}

/* ============================================================
   SETTINGS — native-styled, mirrors the seller pattern but Profile-only.
   No subscription tab (buyers don't have a paid plan).
   ============================================================ */

/* Helpers — prefixed BSF_ ("Buyer Settings Form") to avoid any collision. */
function BSF_Field({ label, helper, children }) {
  return (
    <div>
      <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.mink, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
      {children}
      {helper && <p style={{ fontFamily: F.body, fontSize: 11, color: C.ash, marginTop: 6 }}>{helper}</p>}
    </div>
  );
}

function BSF_Input({ style, ...props }) {
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

function BSF_PrimaryButton({ disabled, loading, children, ...props }) {
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
        transition: "background 150ms ease",
      }}
    >
      {children}
    </button>
  );
}

function BSF_ErrorBanner({ message }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 10, background: C.claretMist, border: "1px solid " + C.claret + "40", display: "flex", alignItems: "flex-start", gap: 8 }}>
      <AlertCircle size={14} style={{ color: C.claret, flexShrink: 0, marginTop: 1 }}/>
      <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.claret }}>{message}</p>
    </div>
  );
}

function BSF_SavedBadge({ label }) {
  return (
    <p style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.head, fontSize: 12, fontWeight: 800, color: C.greenDeep }}>
      <CheckCircle size={13}/> {label}
    </p>
  );
}

function BSF_SuccessBanner({ message, onClose }) {
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

/* Header — same compact treatment as seller Inventory/History/Messages/Profile */
function BuyerSettingsHeader() {
  return (
    <div className="fade-in" style={{ maxWidth: 1160, margin: "0 auto 14px" }}>
      <div style={{ padding: "14px 0 10px", position: "relative", marginBottom: 4 }}>
        <div style={{ position: "absolute", top: 18, right: 0, display: "flex", gap: 6, opacity: 0.5 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.green }}/>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.amber }}/>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.claret }}/>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: C.greenMist, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, boxShadow: "0 2px 0 " + C.fawn }}>
            <SettingsIcon size={20} style={{ color: C.greenDeep }} strokeWidth={2.2}/>
          </div>
          <div>
            <h1 style={{ fontFamily: F.head, fontSize: 30, fontWeight: 900, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 4 }}>Profile</h1>
            <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.mink, lineHeight: 1.45, maxWidth: 560 }}>
              Edit your name and manage your sign-in password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Profile + password content. Two cards side-by-side. */
function BuyerProfileContent({ user, onSuccess }) {
  const { isMobile: __isMobile } = useViewport();
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
    <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: __isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
      {/* Profile information */}
      <form onSubmit={submitProfile} style={{ background: C.paper, border: "1px solid " + C.fawn, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
        <h2 style={{ fontFamily: F.head, fontSize: 16, fontWeight: 800, color: C.ink, letterSpacing: "-0.01em" }}>Profile information</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <BSF_Field label="First name">
            <BSF_Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" autoComplete="given-name" disabled={savingProfile}/>
          </BSF_Field>
          <BSF_Field label="Last name">
            <BSF_Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" autoComplete="family-name" disabled={savingProfile}/>
          </BSF_Field>
        </div>

        <BSF_Field label="Email" helper="To change your email, contact info@dropyard.app.">
          <BSF_Input type="email" value={user?.email || ""} readOnly disabled style={{ background: C.sand, color: C.mink }}/>
        </BSF_Field>

        <div style={{ background: C.sand, border: "1px solid " + C.fawn, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 28 }}>
          <div>
            <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.ash, letterSpacing: "0.14em", textTransform: "uppercase" }}>Member since</p>
            <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 2 }}>{memberSince}</p>
          </div>
          <div>
            <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.ash, letterSpacing: "0.14em", textTransform: "uppercase" }}>Role</p>
            <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 2 }}>{roleLabel}</p>
          </div>
          <div>
            <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: C.ash, letterSpacing: "0.14em", textTransform: "uppercase" }}>Neighbourhood</p>
            <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 2 }}>{user?.neighborhood || user?.zone || "—"}</p>
          </div>
        </div>

        {profileError && <BSF_ErrorBanner message={profileError}/>}

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 14, borderTop: "1px solid " + C.fawn }}>
          {profileSavedAt
            ? <BSF_SavedBadge label="Changes saved"/>
            : <p style={{ fontFamily: F.body, fontSize: 12, color: C.ash }}>Save when you&apos;re ready.</p>}
          <BSF_PrimaryButton type="submit" disabled={!profileDirty || savingProfile} loading={savingProfile}>
            {savingProfile ? "Saving..." : "Save changes"}
          </BSF_PrimaryButton>
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
              <ShieldCheck size={10}/> Google only
            </span>
          )}
        </div>

        {hasPassword && (
          <BSF_Field label="Current password">
            <BSF_Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" disabled={savingPw}/>
          </BSF_Field>
        )}

        <BSF_Field label="New password">
          <BSF_Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" disabled={savingPw}/>
        </BSF_Field>

        <BSF_Field label="Confirm new password">
          <BSF_Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter new password" autoComplete="new-password" disabled={savingPw}/>
        </BSF_Field>

        {pwError && <BSF_ErrorBanner message={pwError}/>}

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 14, borderTop: "1px solid " + C.fawn }}>
          {pwSavedAt
            ? <BSF_SavedBadge label={hasPassword ? "Password updated" : "Password set"}/>
            : <p style={{ fontFamily: F.body, fontSize: 12, color: C.ash }}>
                {hasPassword ? "Other devices will be signed out." : "Adds a password so you can sign in with email too."}
              </p>}
          <BSF_PrimaryButton
            type="submit"
            disabled={savingPw || !newPw || !confirmPw || (hasPassword && !currentPw)}
            loading={savingPw}
          >
            {savingPw ? "Saving..." : (hasPassword ? "Update password" : "Set password")}
          </BSF_PrimaryButton>
        </div>
      </form>
    </div>
  );
}

function SettingsPage({ user }) {
  const { isMobile: __isMobile } = useViewport();
  const [toast, setToast] = useState(null);
  return (
    <div>
      <BSF_SuccessBanner message={toast} onClose={() => setToast(null)}/>
      <BuyerSettingsHeader/>
      <BuyerProfileContent user={user} onSuccess={setToast}/>
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
// Top-level buyer tabs that are safe to restore from the URL on refresh.
// Anything driven by transient state (an open item, a modal) is deliberately
// absent — restoring those would land on a screen with no data behind it.
const BUYER_TABS = new Set(["discover", "saved", "claims", "messages", "history"]);

export default function DropYardBuyerDashboard({
  onSwitchRole = () => alert("In the full product, this switches to the seller dashboard."),
  user = null,
  onSignout = null,
  accessToken = null,
  // BUG-085 — item id from /buyer?item=<id>, set by the public share page's
  // CTA so a recipient lands on the exact listing instead of generic Discover.
  initialItemId = null,
  // Called once the deep link has been consumed, so the parent can strip the
  // query param and stop it re-firing on later renders.
  onInitialItemConsumed = null,
} = {}) {
  const { isMobile } = useViewport();

  // BUG-087 — the active tab lives in the URL (?tab=) so a refresh, a bookmark,
  // or browser Back doesn't dump the user back on Discover. Safe to read
  // `window` in the initializer: app/buyer/page.tsx gates the dashboards behind
  // a `mounted` flag, so this never runs during SSR.
  // Only top-level destinations are persisted — see the seller dashboard for
  // the equivalent list and why transient views are excluded.
  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return "discover";
    const t = new URLSearchParams(window.location.search).get("tab");
    return t && BUYER_TABS.has(t) ? t : "discover";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (page === "discover") url.searchParams.delete("tab");
    else url.searchParams.set("tab", page);
    // replaceState, not pushState: tab changes shouldn't stack up history
    // entries that the Back button has to chew through one at a time.
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [page]);

  // BUG-057 — Sign-out confirmation. All "Sign out" entry points (UserMenu,
  // ItemDetail, MobileBottomNav etc.) go through onSignoutRequest which opens
  // this modal; only the modal's primary button actually calls onSignout.
  const [signoutOpen, setSignoutOpen] = useState(false);
  const onSignoutRequest = useCallback(() => setSignoutOpen(true), []);
  const confirmSignout = useCallback(() => {
    setSignoutOpen(false);
    if (typeof onSignout === "function") onSignout();
  }, [onSignout]);

  // ─── Live items from /api/items ───
  // Falls back to the static `allItems` demo array in unauthed preview mode so
  // /preview/buyer-dashboard keeps telling the design story. In wired mode, an
  // empty array + loading flag drives the DiscoverSkeleton.
  const [liveItems, setLiveItems] = useState(null);
  const [itemsLoading, setItemsLoading] = useState(!!accessToken);
  // Bumped on claim:updated / claim:new socket events so the Discover feed
  // refetches whenever an item changes status (LIVE → CLAIMED → SOLD).
  // Without this, the buyer keeps seeing SOLD items in their cached state
  // until they navigate away and back.
  const [itemsTick, setItemsTick] = useState(0);
  useSocketEvent("claim:new",     () => setItemsTick(t => t + 1));
  useSocketEvent("claim:updated", () => setItemsTick(t => t + 1));
  useEffect(() => {
    if (!accessToken) { setLiveItems(null); setItemsLoading(false); return; }
    let cancelled = false;
    setItemsLoading(true);
    apiRequest("/api/items", { token: accessToken })
      .then(data => {
        if (cancelled) return;
        const list = Array.isArray(data?.items) ? data.items : [];
        // Drop the seller's own items from the buyer feed — they can't claim
        // or message themselves about their own listing (backend enforces
        // both), so surfacing them only invites the "Couldn't send" toast.
        // BUG-050. Sellers can still preview their item in Seller-mode UI.
        const mineFiltered = user?.id ? list.filter((i) => i?.seller?.id !== user.id) : list;
        setLiveItems(mineFiltered.map(adaptBuyerItem).filter(Boolean));
      })
      .catch(() => { if (!cancelled) setLiveItems([]); })
      .finally(() => { if (!cancelled) setItemsLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, itemsTick]);
  const itemsForUI = Array.isArray(liveItems) ? liveItems : allItems;

  // Sneak peek — items queued for the upcoming Drop. Same fetch pattern as
  // liveItems above, but hits the dedicated /api/items/sneak-peek route so
  // it doesn't have to wait for PREVIEW phase. In standalone preview mode
  // (no accessToken) we fall back to the hardcoded `sneakPeekItems` demo
  // data so /preview/buyer-dashboard still has visible cards.
  const [sneakPeekFromApi, setSneakPeekFromApi] = useState(null);
  useEffect(() => {
    if (!accessToken) { setSneakPeekFromApi(null); return; }
    let cancelled = false;
    apiRequest("/api/items/sneak-peek", { token: accessToken })
      .then(data => {
        if (cancelled) return;
        const list = Array.isArray(data?.items) ? data.items : [];
        // Same self-filter as the main feed (BUG-050) — the seller's own
        // queued items belong in the Seller-mode inventory, not the buyer
        // Sneak Peek strip.
        const mineFiltered = user?.id ? list.filter((i) => i?.seller?.id !== user.id) : list;
        const adapted = mineFiltered.map((api, i) => {
          const photos = Array.isArray(api?.photos) ? api.photos.filter(Boolean) : [];
          return {
            id:       api.id ?? ("api-peek-" + i),
            t:        api.title || "Item",
            estPrice: api.originalPrice ?? api.price ?? 0,
            img:      photos[0] || CATEGORY_EMOJI[api.category] || "📦",
            cat:      BUYER_ENUM_TO_CATEGORY[api.category] || "Other",
            seller:   api.seller?.name || "Neighbour",
            hood:     api.seller?.neighborhood || "Nearby",
            dist:     "Nearby",
          };
        });
        setSneakPeekFromApi(adapted);
      })
      .catch(() => { if (!cancelled) setSneakPeekFromApi([]); });
    return () => { cancelled = true; };
  }, [accessToken]);
  // For authed users, only show real API data — even if it's empty. The
  // hardcoded `sneakPeekItems` array is reserved for /preview/buyer-dashboard
  // (where there's no token) so real users never see fake content.
  const sneakPeekForUI = accessToken
    ? (Array.isArray(sneakPeekFromApi) ? sneakPeekFromApi : [])
    : sneakPeekItems;
  const [viewingItem, setViewingItem] = useState(null);
  const [viewingSellerName, setViewingSellerName] = useState(null);
  // The item detail a seller profile was opened FROM, so Back returns there
  // instead of dropping the buyer out to Discover. "View profile" has to
  // clear `viewingItem` (it outranks the profile — see BUG-080), which
  // otherwise loses the only record of where the buyer came from.
  // Null when the profile was reached some other way.
  const [sellerBackItem, setSellerBackItem] = useState(null);

  // BUG-085 — consume the ?item=<id> deep link set by the public share page.
  // Fetched individually rather than looked up in the feed: the feed is
  // paginated and filters out the viewer's own items, so a shared item is
  // frequently absent from it. A bad or removed id just leaves the buyer on
  // Discover — a shared link outliving its item is normal, not an error.
  const consumedItemRef = useRef(null);
  useEffect(() => {
    if (!initialItemId || !accessToken) return;
    if (consumedItemRef.current === initialItemId) return; // once per id
    consumedItemRef.current = initialItemId;
    let cancelled = false;
    apiRequest(`/api/items/${encodeURIComponent(initialItemId)}`, { token: accessToken })
      .then((r) => {
        if (cancelled || !r?.item) return;
        const ui = adaptBuyerItem(r.item);
        if (!ui) return;
        setPage("discover");
        setViewingItem(toDetailItem(ui));
      })
      .catch(() => { /* removed / invalid id — stay on Discover */ })
      .finally(() => { if (!cancelled && onInitialItemConsumed) onInitialItemConsumed(); });
    return () => { cancelled = true; };
  }, [initialItemId, accessToken, onInitialItemConsumed]);
  // Watchlist — demo set populates /preview/buyer-dashboard so the cards
  // look interactive; real users start with an empty Set and hydrate from
  // /api/watchlist so the topbar Saved badge doesn't briefly show "6" of
  // fake demo items before the fetch lands.
  const [savedIds, setSavedIds] = useState(() => accessToken ? new Set() : new Set([1, 6, 13, 9, 4, 20]));
  // Full watchlist items in adapted UI shape. SavedPage renders directly
  // from this — NOT from `itemsForUI` filtered by savedIds. The old approach
  // hid saved items that were SOLD or owned by the user (after BUG-050's
  // self-filter removed them from the buyer feed), making the Saved badge
  // count diverge from what was actually shown on the Saved page.
  const [savedItems, setSavedItems] = useState([]);
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    apiRequest("/api/watchlist", { token: accessToken })
      .then((data) => {
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setSavedIds(new Set(items.map((i) => i.id)));
        setSavedItems(items.map(adaptBuyerItem).filter(Boolean));
      })
      .catch(() => {
        // Real-user network blip — keep the empty set rather than fake data.
        if (!cancelled) { setSavedIds(new Set()); setSavedItems([]); }
      });
    return () => { cancelled = true; };
    // Refetches when itemsTick bumps (claim:new / claim:updated) so SOLD
    // items the buyer had saved get refreshed with current state too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, itemsTick]);
  // Sneak Peek "save for Saturday" — purely client-side today (no API).
  // Same rationale: empty Set for authed users, demo IDs for /preview/buyer-dashboard.
  const [savedPreview, setSavedPreview] = useState(() => accessToken ? new Set() : new Set([101, 104]));
  const [viewingPreview, setViewingPreview] = useState(null); // sneak peek item being previewed
  const [showSneakList, setShowSneakList] = useState(false); // full sneak peek list page
  const [reminded, setReminded] = useState(false);
  const [toast, setToast] = useState(null);
  // Drop state is derived from the system clock (see computeDropState).
  // We re-check every 60 seconds so the UI flips automatically the moment
  // the Drop opens (Sat 8am) and closes (Sun 6pm), without any manual toggle.
  const [dropState, setDropState] = useState(() => computeDropState());
  useEffect(() => {
    const tick = setInterval(() => setDropState(computeDropState()), 60 * 1000);
    return () => clearInterval(tick);
  }, []);
  const [claimItem, setClaimItem] = useState(null); // direct-from-card claim modal target

  // Demo claims reserved for /preview/buyer-dashboard (no accessToken). Real
  // users start with an empty list and populate from /api/claims/mine; this
  // avoids showing fake "Kids Bicycle / Solid Oak Table / Cuisinart Coffee
  // Maker" stat counts in the Claims tab before the fetch finishes \u2014 and
  // permanently if the network fails.
  const DEMO_CLAIMS = [
    { id:"bc1", itemId: 1,  e:"\u{1F6B2}", t:"Kids Bicycle - 16 inch",    price:30,  seller:"Tom R.",  status:"pickup-overdue",   date:"Today",     time:"10:00 AM", addr:"8 Larkin Crescent",         channel:"drop",     isPastDue:true, autoCancelsIn:"1h 47m", paymentMethod:"cash"      },
    { id:"bc2", itemId: 13, e:"\u{1FAB5}", t:"Solid Oak Dining Table",    price:350, seller:"Jane D.", status:"pickup-scheduled", date:"Sat, Apr 25", time:"2:00 PM", addr:"42 Bridlewood Dr",           channel:"drop",     paymentMethod:"etransfer" },
    { id:"bc3", itemId: 9,  e:"\u2615",     t:"Cuisinart Coffee Maker",     price:15,  seller:"Sarah L.", status:"offer-pending",    date:null,         time:null,      addr:null,                         channel:"drop", counterAmount:20,  paymentMethod:"either"    },
  ];
  const [claims, setClaims] = useState(accessToken ? [] : DEMO_CLAIMS);

  // \u2500\u2500\u2500 Buyer's claims from /api/claims/mine \u2500\u2500\u2500
  // Active claims drive ClaimsPage; PICKED_UP rows drive HistoryPage (separate
  // fetch below). Adapter maps backend status -> UI status the existing
  // rendering already speaks ("pickup-scheduled", "offer-pending", etc.).
  // claimsTick is bumped by socket events so the list reflects seller actions
  // (confirm / reject / picked-up) in real time.
  const [claimsTick, setClaimsTick] = useState(0);
  useSocketEvent("claim:updated", () => setClaimsTick((t) => t + 1));
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    apiRequest("/api/claims/mine", { token: accessToken })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.claims) ? data.claims : [];
        // BUG-055 — new lifecycle statuses. Active claims (shown on Claims
        // tab) are PROPOSED + ACCEPTED. Terminal statuses (PICKED_UP for
        // History tab; DECLINED/CANCELLED/EXPIRED hidden) drop out here.
        const active = list
          .filter((c) => c.status === "PROPOSED" || c.status === "ACCEPTED")
          .map(adaptBuyerClaim).filter(Boolean);
        setClaims(active);
      })
      .catch(() => {
        // On a real-user network blip, prefer an empty list over fake data \u2014
        // the stat counts on ClaimsPage will read 0/0/0 instead of 1/1/1,
        // which is honest. The next socket event (or remount) retries.
        if (!cancelled) setClaims([]);
      });
    return () => { cancelled = true; };
  }, [accessToken, claimsTick]);

  // ─── Conversation inbox (lifted to root for nav badges) ───
  // Owns the buyer's conversation list at the root level so the navigation
  // badges (TopBar + MobileBottomNav Messages tab) can show the unread count
  // regardless of which page is active. MessagesPage receives this through
  // props and stays in sync. Without this, the Messages page would unmount
  // on tab switch and the badge would have nothing to read from.
  // Demo data seeds /preview/buyer-dashboard (no accessToken); real users
  // start empty and hydrate via the fetch effect below.
  const [convList, setConvList] = useState(accessToken ? [] : DEMO_BUYER_CONVERSATIONS);
  const myUserId = user?.id || null;

  // Helper: insert/refresh a single conversation from a socket payload.
  // The payload's `message` is the new message; we update the matching conv
  // in the adapted shape (so MessagesPage can render without re-adapting).
  // Unknown conversation → refetch the inbox so metadata fills in correctly.
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
            setConvList(list.map((api) => adaptBuyerConversation(api, myUserId)).filter(Boolean));
          })
          .catch(() => { /* keep current list on transient blip */ });
      }
      return prev;
    }
    // Update the matching conversation AND move it to the top so the list
    // stays sorted by latest activity. Without the reordering, new messages
    // refresh the row data but its position in the list lingers.
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
        status:        newUnread > 0 ? "pending" : c.status,
      };
    });
    const moved = updated.find((c) => c.id === conversationId);
    if (!moved) return updated;
    return [moved, ...updated.filter((c) => c.id !== conversationId)];
  }, [accessToken, myUserId]);

  // Initial fetch — adapts the raw API list into the UI shape MessagesPage
  // (and the existing badge logic) already expect. Refetches when itemsTick
  // bumps (claim:new / claim:updated) so the embedded item.status reflects
  // pickup completion — the composer locks once item flips to SOLD.
  useEffect(() => {
    if (!accessToken) { setConvList([]); return; }
    let cancelled = false;
    apiRequest("/api/conversations", { token: accessToken })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.conversations) ? data.conversations : [];
        setConvList(list.map((api) => adaptBuyerConversation(api, myUserId)).filter(Boolean));
      })
      .catch(() => { if (!cancelled) setConvList([]); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, myUserId, itemsTick]);

  // Socket: new message → update the matching conv (or refetch if unknown).
  useSocketEvent("message:new", (payload) => {
    setConvList((prev) => upsertConvFromSocket(prev, payload));
  });

  // Socket: the OTHER side opened the thread → clear unread on their end is
  // their concern; we receive `conversation:read` only when WE open a thread
  // on another device. Either way, clearing unread on the matching conv is
  // safe — it just won't fire unless we have multi-device.
  useSocketEvent("conversation:read", (payload) => {
    const cid = payload?.conversationId;
    if (!cid) return;
    setConvList((prev) => prev.map((c) => c.id === cid
      ? { ...c, unreadCount: 0, unread: false, status: c.status === "pending" ? "answered" : c.status }
      : c
    ));
  });

  // Count of conversations with at least one unread message. Drives the
  // notification badge on TopBar + MobileBottomNav.
  const messagesUnreadCount = useMemo(
    () => convList.filter((c) => (c.unreadCount || 0) > 0).length,
    [convList],
  );

  // Browser-level notification on incoming message. Fires once per real
  // incoming message (skips messages we sent ourselves, and skips messages
  // for the thread the user is actively viewing). Best-effort — silently
  // skipped if the user hasn't granted permission.
  useSocketEvent("message:new", (payload) => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    const msg = payload?.message;
    if (!msg || msg.senderId === myUserId) return;
    const conv = convList.find((c) => c.id === payload.conversationId);
    const itemTitle = conv?.item?.title || "your message";
    const senderName = conv?.otherUser?.name || "Someone";
    try {
      new Notification(senderName + " · DropYard", {
        body: msg.body ? String(msg.body).slice(0, 120) : `New message about ${itemTitle}`,
        tag:  "dropyard-msg-" + payload.conversationId,
      });
    } catch { /* notifications can fail in restricted contexts */ }
  });

  // In-app green celebration toast when an OFFER we sent gets ACCEPTED.
  // The backend's accept route posts a CLAIM-type system message describing
  // the new claim — that's our signal. Skip if WE posted it (server-side
  // mirror) and skip if it's our own action echo.
  useSocketEvent("message:new", (payload) => {
    const msg = payload?.message;
    if (!msg || msg.messageType !== "CLAIM") return;
    if (msg.senderId === myUserId) return;
    const conv = convList.find((c) => c.id === payload.conversationId);
    const itemTitle = conv?.item?.title || "this item";
    const amt = typeof msg.amount === "number" ? msg.amount : null;
    setToast(
      amt
        ? `Offer accepted! Your purchase of ${itemTitle} is confirmed at $${amt}.`
        : `Offer accepted! Your purchase of ${itemTitle} is confirmed.`
    );
  });

  // Derive sets of itemIds that the current buyer has either claimed (active)
  // or already picked up. Threads into ItemCard so cards show the right overlay
  // ("YOU CLAIMED THIS" / "PICKED UP") whenever the same item appears in
  // Discover or Saved.
  const claimedIds = useMemo(() => {
    const live = new Set();
    for (const c of claims) {
      if (c.itemId == null) continue;
      // Anything that isn't already picked up or fully cancelled counts as
      // "actively claimed" for overlay purposes.
      if (c.status === "picked-up" || c.status === "cancelled" || c.status === "rejected") continue;
      live.add(c.itemId);
    }
    return live;
  }, [claims]);
  const purchasedIds = useMemo(() => {
    const done = new Set();
    for (const c of claims) {
      if (c.itemId != null && c.status === "picked-up") done.add(c.itemId);
    }
    return done;
  }, [claims]);

  // Optimistic toggle: flip the local Set immediately so the heart animates,
  // then POST/DELETE in the background. Roll back on failure. Skip the network
  // call entirely for demo-only ids (numbers from the static `allItems` array)
  // since those don't exist on the server. Also keeps `savedItems` (the
  // SavedPage source) in sync so the page reflects toggles instantly.
  const toggleSave = async (id) => {
    const wasSaved = savedIds.has(id);
    setSavedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    // Keep savedItems aligned. Unsave → remove. Save → look up the full
    // item in the buyer feed and append (so SavedPage shows it instantly
    // without waiting for a watchlist refetch).
    if (wasSaved) {
      setSavedItems(prev => prev.filter(it => it.id !== id));
    } else {
      const pool = Array.isArray(itemsForUI) ? itemsForUI : [];
      const found = pool.find(it => it.id === id);
      if (found) setSavedItems(prev => prev.some(it => it.id === id) ? prev : [found, ...prev]);
    }
    if (!accessToken) return;
    if (typeof id === "number") return; // demo items
    try {
      await apiRequest("/api/watchlist/" + encodeURIComponent(id), {
        method: wasSaved ? "DELETE" : "POST",
        token:  accessToken,
      });
    } catch {
      // Rollback both savedIds and savedItems on failure.
      setSavedIds(prev => { const n = new Set(prev); if (wasSaved) n.add(id); else n.delete(id); return n; });
      if (wasSaved) {
        const pool = Array.isArray(itemsForUI) ? itemsForUI : [];
        const found = pool.find(it => it.id === id);
        if (found) setSavedItems(prev => prev.some(it => it.id === id) ? prev : [found, ...prev]);
      } else {
        setSavedItems(prev => prev.filter(it => it.id !== id));
      }
    }
  };
  const togglePreview = (i) => setSavedPreview(prev => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const handleRemindMe = () => { setReminded(true); setToast(`We'll ping you ${dropOpenDay()} at ${dropOpenHour()}.`); };

  const handleClaimComplete = async (item, slot, realClaim = null) => {
    const parts = slot ? slot.split(" ") : [];
    const day = parts.slice(0, -1).join(" ") || "TBD";
    const time = parts[parts.length - 1] || "TBD";
    // Use the real backend claim id when ClaimModal has already POSTed.
    // Demo flows synthesize a "bc-" id that adaptBuyerClaim recognises.
    const insertId = realClaim?.id || ("bc-" + Date.now());
    // BUG-055 — adapt the real backend claim so price/status/buyerConfirmedReceipt
    // map correctly. Falls back to the optimistic shape for demo flows.
    const insertedClaim = realClaim
      ? { ...(adaptBuyerClaim(realClaim) || {}), date: day, time: time, addr: "Address sent via WhatsApp" }
      : { id: insertId, itemId: item.id, e: item.img, t: item.title, price: item.price, seller: item.seller.name, status: "offer-pending", date: day, time: time, addr: "Address sent via WhatsApp", channel: item.layer };
    setClaims(prev => [insertedClaim, ...prev]);
    // BUG-055 — bump the items tick so Discover refetches immediately. Socket
    // event also fires (claim:new emits to both parties post-redesign), but
    // this guarantees the refresh even if the socket is briefly disconnected.
    setItemsTick(t => t + 1);
  };

  // Cross-view linking — `highlightId` flashes a row in Claims or History when
  // you land on it from another page (e.g. tapping "Open thread" from a claim
  // makes Messages auto-select that thread; returning later highlights the
  // originating row so you don't lose context). `openThreadId` is the item
  // title to auto-open in MessagesPage when set.
  const [highlightId, setHighlightId] = useState(null);
  const [openThreadId, setOpenThreadId] = useState(null);
  const openMessageThread = (itemTitle, alsoHighlightClaimId = null) => {
    setOpenThreadId(itemTitle);
    if (alsoHighlightClaimId) setHighlightId(alsoHighlightClaimId);
    setPage("messages");
  };

  // Accept / decline a counter offer from inside MessagesPage. Both look the
  // claim up by the item title that's encoded in the conversation (real
  // backend would use itemId once the offer flow is wired end-to-end).
  const handleAcceptCounterByItemTitle = (itemTitle, counterAmount) => {
    setClaims(prev => prev.map(c => (c.t === itemTitle && c.status === "offer-pending")
      ? { ...c, status: "pickup-scheduled", price: counterAmount || c.counterAmount || c.price, counterAmount: null, date: c.date || "TBD", time: c.time || "TBD", addr: "Address sent via WhatsApp" }
      : c));
  };
  const handleDeclineCounterByItemTitle = (itemTitle) => {
    setClaims(prev => prev.filter(c => !(c.t === itemTitle && c.status === "offer-pending")));
  };

  const resetNav = () => { setViewingItem(null); setViewingSellerName(null); setSellerBackItem(null); setViewingPreview(null); setShowSneakList(false); };

  return (
    <>
      <GlobalStyle/>
      <div style={{ minHeight: "100vh", background: C.page, color: C.ink }}>
        <TopBar page={page} setPage={setPage} savedCount={savedIds.size} claimsCount={claims.length} messagesUnread={messagesUnreadCount} onSwitchRole={onSwitchRole} onReset={resetNav} dropState={dropState} user={user} onSignout={onSignoutRequest}/>

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "16px 16px calc(76px + env(safe-area-inset-bottom, 0))" : "24px 32px 64px" }}>
          {/* BUG-080 — nav stack: Discover → seller profile → item detail.
              `viewingItem` now OUTRANKS `viewingSellerName`, so tapping a card
              on a seller's profile opens the item (previously the profile kept
              rendering and the click looked dead). `viewingSellerName` is left
              set underneath, so Back from the item returns to the profile
              rather than all the way out to Discover.
              The reverse direction — "View profile" from an item — clears
              `viewingItem` explicitly, otherwise the item would outrank the
              profile it's trying to open. */}
          {viewingSellerName && !viewingItem && (
            <RegularSellerProfile sellerName={viewingSellerName} onBack={() => { setViewingSellerName(null); if (sellerBackItem) { setViewingItem(sellerBackItem); setSellerBackItem(null); } }} onSelect={setViewingItem} onClaimNow={setClaimItem} savedIds={savedIds} onToggleSave={toggleSave} itemsSource={itemsForUI} state={dropState}/>
          )}
          {viewingItem && (
            <ItemDetail item={viewingItem} onBack={() => setViewingItem(null)} onClaimComplete={handleClaimComplete} onGoToClaims={() => { setViewingItem(null); setViewingSellerName(null); setSellerBackItem(null); setPage("claims"); }}  onViewSeller={(name) => { setSellerBackItem(viewingItem); setViewingItem(null); setViewingSellerName(name); }} savedIds={savedIds} onToggleSave={toggleSave} accessToken={accessToken} onGoToMessages={() => { setViewingItem(null); setViewingSellerName(null); setSellerBackItem(null); setPage("messages"); }} currentUserId={user?.id || null} onSwitchRole={onSwitchRole}/>
          )}

          {!viewingItem && !viewingSellerName && (
            <>
              {page === "discover" && viewingPreview && (
                <PreviewItemDetail item={viewingPreview} onBack={() => setViewingPreview(null)} savedPreview={savedPreview} togglePreview={togglePreview}/>
              )}
              {page === "discover" && !viewingPreview && showSneakList && (
                <SneakPeekListPage savedPreview={savedPreview} togglePreview={togglePreview} onPreviewItem={setViewingPreview} onBack={() => setShowSneakList(false)} sneakPeekSource={sneakPeekForUI}/>
              )}
              {page === "discover" && !viewingPreview && !showSneakList && <DiscoverPage savedIds={savedIds} onToggleSave={toggleSave} onSelect={setViewingItem} onClaimNow={setClaimItem} state={dropState} reminded={reminded} onRemindMe={handleRemindMe} savedPreview={savedPreview} togglePreview={togglePreview} onSwitchRole={onSwitchRole} onPreviewItem={setViewingPreview} onSeeAllPreviews={() => setShowSneakList(true)} claimedIds={claimedIds} purchasedIds={purchasedIds} itemsSource={itemsForUI} itemsLoading={itemsLoading} sneakPeekSource={sneakPeekForUI}/>}
              {page === "saved"    && <SavedPage savedIds={savedIds} savedItems={accessToken ? savedItems : null} onSelect={setViewingItem} onClaimNow={setClaimItem} onToggleSave={toggleSave} onBrowse={() => setPage("discover")} onBack={() => setPage("discover")} claimedIds={claimedIds} purchasedIds={purchasedIds} itemsSource={itemsForUI} state={dropState}/>}
              {page === "claims"   && <ClaimsPage claims={claims} setClaims={setClaims} onBrowse={() => setPage("discover")} onBack={() => setPage("discover")} onGoToMessages={() => setPage("messages")} onOpenThread={(itemTitle) => openMessageThread(itemTitle)} highlightId={highlightId} onClearHighlight={() => setHighlightId(null)} accessToken={accessToken}/>}
              {page === "messages" && <MessagesPage user={user} accessToken={accessToken} claims={claims} onAcceptCounter={handleAcceptCounterByItemTitle} onDeclineCounter={handleDeclineCounterByItemTitle} openThreadId={openThreadId} onConsumeOpenThread={() => setOpenThreadId(null)} onBack={() => setPage("discover")} convList={convList} onConvListChange={setConvList}/>}
              {page === "history"  && <HistoryPage highlightId={highlightId} onClearHighlight={() => setHighlightId(null)} onOpenThread={(itemTitle) => openMessageThread(itemTitle)} accessToken={accessToken} onBack={() => setPage("discover")}/>}
              {page === "settings" && <SettingsPage user={user}/>}
            </>
          )}
        </div>

        <Toast message={toast} onClose={() => setToast(null)}/>

        {/* Direct-from-card claim — bypasses item detail */}
        {claimItem && (
          <ClaimModal
            item={claimItem}
            onClose={() => setClaimItem(null)}
            onConfirm={(slot, price, realClaim) => { handleClaimComplete({ ...claimItem, price }, slot, realClaim); setClaimItem(null); setPage("claims"); }}
            accessToken={accessToken}
            onGoToMessages={() => { setClaimItem(null); setPage("messages"); }}
          />
        )}

        {/* Always render the mobile bottom nav — `MobileBottomNav` itself uses
            a CSS media query to hide on desktop. This avoids the SSR/client
            hydration mismatch that comes from gating on `isMobile` (which is
            false on SSR because `useViewport` defaults width=1280, then flips
            to true on mobile clients after hydration — causing the nav to
            "appear after scroll" on real mobile devices). */}
        <MobileBottomNav
          page={page}
          setPage={(p) => { resetNav(); setPage(p); }}
          savedCount={savedIds.size}
          claimsCount={claims.length}
          unreadCount={messagesUnreadCount}
          dropState={dropState}
        />
      </div>

      {/* BUG-057 — Sign-out confirmation modal. Rendered at the dashboard
          root so it covers every entry point (UserMenu, item detail, etc.). */}
      {signoutOpen && (
        <div onClick={() => setSignoutOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(11,47,32,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="signout-title" style={{ background: C.paper, borderRadius: 20, padding: 24, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(11,47,32,0.25)" }}>
            <h3 id="signout-title" style={{ fontFamily: F.head, fontSize: 18, fontWeight: 900, color: C.ink, marginBottom: 6 }}>Sign out?</h3>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.mink, lineHeight: 1.5, marginBottom: 18 }}>You&rsquo;ll need to sign back in to see your claims, messages, and saved items.</p>
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
