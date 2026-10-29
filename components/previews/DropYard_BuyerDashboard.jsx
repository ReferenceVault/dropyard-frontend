"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
// uploadItemPhoto is named for its first caller but is a generic authed
// multipart POST to /api/uploads/s3 — same endpoint, same CSRF and
// token-refresh handling — so chat attachments reuse it rather than
// re-implementing that wiring.
import { apiRequest, uploadItemPhoto } from "@/lib/api";
import { useSocket, useSocketEvent } from "@/context/SocketContext";
import { useDropCycle } from "@/context/DropCycleContext";
import { formatPickupDateList, formatPickupWeekday } from "@/lib/pickupDates";
import { SocketHealthDot } from "@/components/SocketHealthDot";
import { useAuth } from "@/context/AuthContext";
import {
  dropOpenHour, dropOpenHourCompact, dropOpenHourBadge,
  dropOpenDay, dropOpenFull, dropOpenHourLong,
  dropCloseDay, dropCloseHour,
  nextDropMoment, dropCloseMoment,
  formatCompactCountdown,
  getDropCycleInfo,
  DROP_OPEN_DAY, DROP_OPEN_HOUR, DROP_CLOSE_DAY, DROP_CLOSE_HOUR,
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
  LayoutGrid, ArrowUpDown,
  Check, X, User, ShoppingBag, MessageSquare, Sparkles, Truck, Calendar,
  Star, Shield, Send, ArrowRight, ArrowLeft, Home, Tag, Bell, MessageCircle,
  CalendarDays, Compass, Archive, RefreshCw, Eye, EyeOff, Info, TrendingDown,
  DollarSign, AlertCircle, CheckCircle, Share2, Award, Leaf,
  Smile, Paperclip,
  Mail,
  Banknote, Wallet,
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
  // Whose turn it is, read from the buyer's side: if the last word in the
  // thread is mine, I'm waiting on the seller; if it's theirs, they answered.
  // This was `lastFromMe ? "answered" : "answered"` — both branches the same,
  // so every thread claimed to be answered, including ones where the buyer
  // had just sent an offer and nobody had replied. Unread count deliberately
  // plays no part: an unread message can only have come from the seller, so
  // it IS an answer; the unread dot is what marks it as new.
  const status = lastFromMe ? "pending" : "answered";
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
    // Raw timestamp — `lastTime` above is a display string and can't be
    // compared. The inbox groups Active vs Earlier on this, and
    // upsertConvFromSocket keeps it current on every incoming message.
    lastMessageAt: api.lastMessageAt || null,
    messages: [],
  };
}

// A thread stays in the "active" group while it's had activity inside this
// window. Older ones collapse into "Earlier" instead of padding the
// "N active threads" count — a three-month-old thread whose claim auto-expired
// is history, not something the buyer is in the middle of.
const ACTIVE_WINDOW_DAYS = 30;

// ─── "I've read that answer" state ──────────────────────────────────────────
// A seller's answer is posted on the item page, which the buyer who asked has
// no reason to revisit — so the reply they were waiting for sat there unseen.
// The badge that fixes that needs to know what has already been read.
//
// This lives in localStorage rather than the database: it's a per-viewer
// convenience, not shared state, and the cost of getting it wrong is a badge
// reappearing on a second device. Keyed question id -> the answeredAt it was
// read at, so a seller editing their answer surfaces it again.
const ANSWER_SEEN_KEY = "dy_seen_answers";
function answerStamp(q) {
  return q?.answeredAt ? String(q.answeredAt) : "answered";
}
function readSeenAnswers() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ANSWER_SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    // Private mode, blocked storage, or corrupt JSON — every answer simply
    // reads as unseen, which is the safe direction to fail in.
    return {};
  }
}
function writeSeenAnswers(map) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(ANSWER_SEEN_KEY, JSON.stringify(map)); } catch { /* ignore */ }
}
function isWithinActiveWindow(iso, days = ACTIVE_WINDOW_DAYS) {
  if (!iso) return false;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return false;
  return Date.now() - ms < days * 24 * 60 * 60 * 1000;
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

// "Listed" value on the item detail grid. Reads the listing's real createdAt;
// demo items on /preview carry a plain `days` number instead. With neither we
// print an em dash rather than a number — this used to guess the age from the
// save count (`Math.max(1, saves / 3)`), so every real listing, which starts
// at zero saves, claimed to be "1d ago" no matter when it was posted.
function listedAgoLabel(item) {
  const real = relativeTimeShort(item.createdAt);
  if (real) return real;
  if (typeof item.daysListed === "number") return item.daysListed + "d ago";
  return "—";
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
    // Average of the ratings buyers left this seller, computed server-side.
    // null until someone has actually rated them — the card then shows no
    // star rather than an invented score.
    sellerRating:  typeof api.seller?.rating === "number" ? api.seller.rating : null,
    sellerRatingCount: api.seller?.ratingCount ?? 0,
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
    createdAt:     api.createdAt || null,
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
  // Off-white, deliberately NOT #FFFFFF. The item cards are C.paper (pure
  // white), so the page tint is what separates a card from the page now that
  // the cards carry no outline — the contrast does the job the border used
  // to. Warm rather than grey to sit with the amber/sand side of the palette,
  // and lighter than C.sand so sand-filled surfaces (inputs, empty states)
  // still read as a distinct layer on top of it.
  page:      "#FAF7F2",
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

/* ============================================================
   ITEM DETAIL TOKENS
   A quieter, more product-first treatment for the item page:
   a neutral grotesque instead of the rounded Nunito, 1px
   borders, radii capped at 16, and shadows light enough to
   read as separation rather than decoration.

   Geist is already loaded by app/layout.tsx as the
   --font-geist-sans variable, so this costs no extra font
   request; Inter and the system stack follow as fallbacks.

   Colours deliberately stay on C.green / C.amber: those are
   the values taken from the DropYard logo, and the brand note
   says the logo's own green and orange win over the proposed
   #27852F / #F39200 where they differ.
   ============================================================ */
const D = {
  font: 'var(--font-geist-sans), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  border: "1px solid " + C.fawn,
  // One restrained elevation, used sparingly — the purchase panel and
  // nothing else. Everything else separates with a border alone.
  shadow: "0 1px 3px rgba(31, 29, 25, 0.05)",
};

// Wordmark without the "From one home to another" tagline. The tagline is
// unreadable at nav height and repeats what the page already says, so the
// title bar uses the clean mark. Was a ~73KB base64 data URI inlined into
// all six dashboard files; public/Logo_1.png is the same artwork, cached
// by the browser and shared across every surface.
const LOGO_SRC = "/logo-wordmark.png";

// Between-drops banner — the Saturday driveway-sale scene, framed so the
// left third stays open for the band's copy. Was a ~230KB base64 data URI
// inlined here; public/banner-between.jpg is the same artwork served as a
// file, so it stays out of the JS bundle and the browser caches it.
const BANNER_BETWEEN_SRC = "/banner-between.jpg";

// Live-Drop banner — a driveway sale in full swing, framed like the
// between-drops artwork: the left third is open street and lawn, so the
// band's copy sits on quiet pixels instead of fighting a tabletop of goods.
// Served from public/ for the same reason as the one above — the LIVE band
// used to carry a ~128KB base64 JPEG inlined in this bundle.
const BANNER_LIVE_SRC = "/banner-live-drop.jpg";

/* ============================================================
   DATA
   ============================================================ */
const categories = ["All","Furniture","Electronics","Appliances & Kitchen","Clothing & Accessories","Kids & Baby","Sports & Outdoor","Tools & Garden","Home Decor","Books, Games & Hobbies","Collectibles & Antiques","Other"];
// The condition filter's options. Fixed, unlike the neighbourhood list, which
// is built from whoever is actually selling — these are the four values the
// backend enum can produce, in the order a buyer would rank them.
const conditions = ["All", ...Object.values(BUYER_ENUM_TO_CONDITION)];



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
  const css = "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { background: #FAF7F2; color: #1F1D19; font-family: 'Nunito', sans-serif; -webkit-font-smoothing: antialiased; overflow-x: hidden; } ::selection { background: #D8EDD2; color: #1F5A18; } button { font-family: inherit; } input, textarea { font-family: inherit; } @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } @keyframes pulseGreen { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } } @keyframes pulseAmber { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } } @keyframes slideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } } .fade-in { animation: fadeUp 0.55s cubic-bezier(0.25, 1, 0.5, 1) both; } .cta-primary { transition: all 200ms cubic-bezier(0.25, 1, 0.5, 1); } .cta-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(48, 132, 36, 0.3); } .preview-scroll::-webkit-scrollbar { height: 6px; } .preview-scroll::-webkit-scrollbar-track { background: #F4EFE6; border-radius: 3px; } .preview-scroll::-webkit-scrollbar-thumb { background: #D6CFC4; border-radius: 3px; } .chip-hover:hover { border-color: #9A948B !important; } @keyframes pulseLive { 0% { transform: scale(1); opacity: 0.8; } 70% { transform: scale(2.2); opacity: 0; } 100% { transform: scale(2.2); opacity: 0; } } @keyframes aiShimmer { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } } @keyframes sellAiPulse { 0%, 100% { transform: scale(1); box-shadow: 0 4px 14px #7C3AED40; } 50% { transform: scale(1.05); box-shadow: 0 6px 20px #7C3AED60; } } @keyframes skel { 0% { background-position: -200px 0; } 100% { background-position: calc(200px + 100%) 0; } } @keyframes bump { 0% { transform: scale(1); } 30% { transform: scale(1.18); } 60% { transform: scale(0.95); } 100% { transform: scale(1); } } @keyframes spin { to { transform: rotate(360deg); } } .skel { background: linear-gradient(90deg, #F4EFE6 0%, #FAF6EE 50%, #F4EFE6 100%); background-size: 400px 100%; animation: skel 1.6s ease-in-out infinite; border-radius: 8px; } .skel-card { background: #FFFFFF; border-radius: 22px; overflow: hidden; border: 1px solid #E7E3DD; box-shadow: 0 1px 2px rgba(31, 29, 25, 0.03); } .bump { animation: bump 0.5s cubic-bezier(0.25, 1, 0.5, 1); } .dy-hero-bleed { width: 100vw; margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); margin-top: -24px; padding: 26px 40px; border-radius: 0; } @media (max-width: 767px) { .dy-hero-bleed { margin-top: -16px; padding: 20px 20px; } }";
  // 100vw counts the vertical scrollbar, so the bleed overhangs the viewport
  // by its width. The clip goes on body, not on the dashboard wrapper: an
  // overflow value there would make that div a scroll container and break the
  // sticky TopBar and sticky filter rails inside it. body's overflow
  // propagates to the viewport instead, leaving sticky positioning alone.
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
// Drop schedule: owned by lib/dropCycle.ts — DO NOT hardcode a day/hour here,
// and do not re-derive the window from the constants either. The boundaries
// are Toronto wall-clock, so they can only be resolved by the library. Checked
// against the real clock on an interval, so the UI flips on its own when the
// Drop opens and closes.
// `now` defaults to the real clock. The caller passes the DropCycle
// provider's clock instead, so the dev-only `?simulate=<ISO>` override
// reaches this dashboard too — without it, the band here stayed on whatever
// the real weekday said while the rest of the UI simulated, and the LIVE
// state could only be seen between Saturday 8am and Sunday 8pm.
function computeDropState(now = new Date()) {
  // The phase comes from getDropCycleInfo, which resolves the window on
  // Toronto wall-clock. This used to read `now.getDay()` / `now.getHours()`
  // off the BROWSER, which is the exact mistake lib/dropCycle.ts was rewritten
  // to remove: every viewer outside Eastern computed their own phase. From
  // IST the dashboard went "LIVE NOW" at Sat 08:00 local — 9.5 hours before
  // the Drop actually opened — and offered Claim buttons on items the API
  // still had as DRAFT.
  return getDropCycleInfo(now).phase === "LIVE" ? "live" : "between";
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

// dropState is gone from the params: the nav's only use for it was choosing
// between the amber pill and the green pill, and there is one active
// treatment now. MobileBottomNav still takes it for its own accent.
function TopBar({ page, setPage, savedCount, claimsCount, messagesUnread = 0, onSwitchRole, onReset, user, onSignout }) {
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
              // Two active treatments, read straight off the design comps:
              // Claims goes green with a bar under it, every other tab wears
              // the pale amber pill. Six comps show this split and none
              // contradict it (Claims green in both its shots, Saved /
              // Messages / History amber in all four of theirs), so it's
              // deliberate rather than drift. `underlined` is the whole rule
              // — flip it to a constant to unify the two.
              const underlined = active && item.id === "claims";
              return (
                <button key={item.id} onClick={() => { onReset && onReset(); setPage(item.id); }} style={{
                  position: "relative",
                  display: "flex", alignItems: "center", gap: 7,
                  padding: underlined ? "8px 15px 13px" : "9px 16px",
                  border: "none", borderRadius: underlined ? 0 : 999,
                  background: active && !underlined ? C.amberMist : "transparent",
                  color: active ? (underlined ? C.green : C.amberDeep) : C.mink,
                  fontSize: 15, fontWeight: active ? 800 : 600,
                  cursor: "pointer", fontFamily: F.head,
                  transition: "color 200ms, background 200ms",
                }}>
                  {item.label}
                  {item.badge && (
                    <span style={{ fontSize: 11, fontWeight: 800, padding: "1px 8px", borderRadius: 20, background: active ? (underlined ? C.green : C.amber) : C.fawn, color: active ? "#fff" : C.mink }}>{item.badge}</span>
                  )}
                  {underlined && (
                    <span aria-hidden="true" style={{ position: "absolute", left: 12, right: 12, bottom: 0, height: 3, borderRadius: "3px 3px 0 0", background: C.green }}/>
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
   PAGE BAR — shared header for Saved / Claims / Messages / History

   Replaces PageTitle, which stacked an uppercase eyebrow, a 38px
   h1, a subtitle and a 56px icon tile above every one of these
   pages. The redesign drops all four: the tab you're on already
   names the page, so the h1 repeated it, and the icon tile
   repeated the icon in the nav. What's left is the back pill and
   a count chip on the right.

   The h1 survives as screen-reader-only text. A page with no
   heading at all is hostile to anyone navigating by headings, and
   nothing in the design depends on it being visible.
   ============================================================ */
function PageBar({ title, chip, chipIcon: ChipIcon, chipTone = "green", onBack }) {
  const { isMobile } = useViewport();
  const tone = chipTone === "amber"
    ? { bg: C.amberMist, fg: C.amberDeep, ring: C.amber + "33" }
    : { bg: C.greenMist, fg: C.greenDeep, ring: C.green + "2E" };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", rowGap: 10, marginBottom: isMobile ? 16 : 22 }}>
      <h1 style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>{title}</h1>
      {onBack ? (
        <button
          onClick={onBack}
          style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: isMobile ? "9px 16px" : "11px 20px", borderRadius: 999, border: "1px solid " + C.fawn, background: C.paper, cursor: "pointer", fontFamily: F.head, fontSize: isMobile ? 13 : 15, fontWeight: 700, color: C.ink, boxShadow: "0 1px 2px rgba(31,29,25,0.04)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = C.sand; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = C.paper; }}
        >
          <ArrowLeft size={isMobile ? 15 : 17} strokeWidth={2.2}/>
          Back to Discover
          {/* Decorative, not a second control — the pill it sits in is the
              only thing clickable here. It's the shape of the grid this
              button goes back to. */}
          <GridGlyph/>
        </button>
      ) : <span/>}
      {chip && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: isMobile ? "8px 14px" : "9px 18px", borderRadius: 999, background: tone.bg, border: "1px solid " + tone.ring, fontFamily: F.head, fontSize: isMobile ? 12 : 14, fontWeight: 700, color: tone.fg, whiteSpace: "nowrap" }}>
          {ChipIcon && <ChipIcon size={isMobile ? 13 : 15} strokeWidth={2.2}/>}
          {chip}
        </span>
      )}
    </div>
  );
}

// 3×3 dot grid drawn inline — lucide has no 9-dot icon at this weight, and
// LayoutGrid's four fat squares read as a view-mode toggle rather than the
// item grid.
function GridGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      {[1, 6.5, 12].map((cy) => [1, 6.5, 12].map((cx) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.3" fill={C.amber}/>
      )))}
    </svg>
  );
}

/* ============================================================
   HILLS BACKDROP
   The neighbourhood the whole product is about, drawn once at the
   bottom of the viewport. Fixed rather than page-bottom so a short
   page (an empty Saved tab) and a long one (History) both sit on
   the same horizon instead of the art sliding up into the content.

   aria-hidden + pointerEvents:none — it is decoration and must
   never swallow a click meant for the content above it.
   ============================================================ */
function HillsBackdrop() {
  return (
    <div
      aria-hidden="true"
      style={{ position: "fixed", left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 0 }}
    >
      {/* No fixed height and no `slice`. The band used to be a clamped height
          with preserveAspectRatio="xMidYMax slice", which crops whichever axis
          overflows — on a wide desktop that ate the top of the village and cut
          the houses in half. Here `width: 100%` + `height: auto` lets the
          viewBox's own 1440:190 ratio set the height, so the artwork is always
          drawn whole, full-bleed, at any viewport width. */}
      <svg viewBox="0 0 1440 190" preserveAspectRatio="xMidYMax meet" style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Back ridge — the village stands on this one */}
        <path d="M0 112 C 180 92, 360 124, 540 120 C 740 115, 880 74, 1060 80 C 1220 86, 1340 112, 1440 104 L1440 190 L0 190 Z" fill="#EDF4E6"/>
        {/* Village spans x 941–1424, which keeps the rightmost cottage 16
            units clear of the viewBox edge. An SVG clips to its viewport, so
            anything past x=1440 would have its wall sliced flat against the
            screen edge. */}
        <g fill="#DCE9CF">
          {/* left cottage */}
          <path d="M1008 96 L1044 72 L1080 96 L1080 122 L1008 122 Z"/>
          <rect x="1036" y="104" width="13" height="18" rx="2" fill="#F5F9F0"/>
          {/* tall house — the centrepiece, two storeys */}
          <path d="M1206 80 L1264 46 L1322 80 L1322 122 L1206 122 Z"/>
          <rect x="1226" y="88" width="15" height="14" rx="2" fill="#F5F9F0"/>
          <rect x="1256" y="88" width="15" height="14" rx="2" fill="#F5F9F0"/>
          <rect x="1286" y="88" width="15" height="14" rx="2" fill="#F5F9F0"/>
          <rect x="1226" y="108" width="15" height="14" rx="2" fill="#F5F9F0"/>
          <rect x="1286" y="108" width="15" height="14" rx="2" fill="#F5F9F0"/>
          <rect x="1256" y="106" width="15" height="16" rx="2" fill="#F5F9F0"/>
          {/* right cottage */}
          <path d="M1360 98 L1392 76 L1424 98 L1424 122 L1360 122 Z"/>
          <rect x="1386" y="106" width="12" height="16" rx="2" fill="#F5F9F0"/>
          {/* trees */}
          <circle cx="960" cy="96" r="19"/>
          <rect x="956" y="106" width="7" height="20" rx="3"/>
          <circle cx="1116" cy="92" r="15"/>
          <rect x="1113" y="100" width="6" height="24" rx="3"/>
          <circle cx="1158" cy="101" r="22"/>
          <rect x="1154" y="114" width="7" height="14" rx="3"/>
          <circle cx="1342" cy="100" r="14"/>
          <rect x="1339" y="108" width="6" height="18" rx="3"/>
        </g>
        {/* Front ridge — sits lower than the village baseline so it frames the
            houses rather than swallowing them */}
        <path d="M0 150 C 170 132, 330 158, 520 154 C 700 150, 860 126, 1040 132 C 1200 138, 1330 156, 1440 148 L1440 190 L0 190 Z" fill="#E2EDD6"/>
      </svg>
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
    // dy-hero-bleed breaks the band out of the dashboard's centred 1280px
    // column so it spans the viewport and sits flush under the nav — it reads
    // as a continuation of the header, not a card floating on the page. The
    // class owns the width, side offsets, negative top margin (cancelling the
    // column's own padding), padding and square corners, so none of those are
    // set inline here or they'd win over it.
    <section className="fade-in dy-hero-bleed" style={{
      background: "#FFE4B0",
      marginBottom: 20,
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 4px 24px rgba(240, 144, 0, 0.14)",
      minHeight: 168,
    }}>
      {/* Background — the packaged driveway-sale scene, and only that. This
          band used to tile the queued listings' own photos over it
          (HeroPhotoMosaic): the grid paints at inset 0, so a beat after the
          feed resolved it covered the artwork completely. The LIVE band still
          tiles — its backdrop is meant to be the neighbourhood's own items. */}
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

          {/* Headline — the countdown pill below already spells out the day and
              hour, so this sells the idea rather than repeating the schedule. */}
          <h1 style={{ fontFamily: F.head, fontSize: 22, fontWeight: 900, color: C.ink, letterSpacing: "-0.025em", lineHeight: 1.2, marginBottom: 10 }}>
            Good finds. Right around the corner.
          </h1>

          {/* Body. The zero case keeps its own copy — "preview what your
              neighbours are selling" is an empty promise when nothing has
              been queued yet. */}
          <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.ink, maxWidth: 520, lineHeight: 1.55, marginBottom: 12 }}>
            {displayCount > 0 ? (
              <>Preview what your neighbours are selling and save your favourites before the {dropOpenDay()} Drop opens.</>
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

      </div>

      {/* Countdown — a cream pill under the band copy, sized to its own
          contents rather than stretched across the band. Replaces the stacked
          card that used to sit in the right column: the clock reads
          left-to-right on one line, and the open moment sits beside it so the
          number is never shown without the time it counts to. */}
      <div style={{
        position: "relative", marginTop: 16,
        width: "fit-content", maxWidth: "100%",
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        padding: "8px 8px 8px 22px", borderRadius: 999,
        background: "rgba(255, 248, 235, 0.92)",
        border: "1.5px solid " + C.amberDeep + "25",
        boxShadow: "0 6px 20px rgba(192, 104, 0, 0.14)",
        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {/* Clock badge — the same amber as the Remind me button at the other
              end of the pill, so the two read as one row. */}
          <span style={{ width: 30, height: 30, borderRadius: "50%", background: C.amberDeep, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Clock size={16} strokeWidth={2.4} style={{ color: "#fff" }}/>
          </span>
          <span style={{ fontFamily: F.head, fontSize: 14, fontWeight: 800, color: C.ink, whiteSpace: "nowrap" }}>Drop opens in</span>
        </span>

        <div style={{ display: "flex", alignItems: "baseline", gap: 3, fontFamily: F.head, fontSize: 26, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
          <span>{t.d}</span>
          <span style={{ fontSize: 13, color: C.amberDeep, fontWeight: 700 }}>d</span>
          <span style={{ marginLeft: 8 }}>{pad(t.h)}</span>
          <span style={{ fontSize: 13, color: C.amberDeep, fontWeight: 700 }}>h</span>
          <span style={{ marginLeft: 8 }}>{pad(t.m)}</span>
          <span style={{ fontSize: 13, color: C.amberDeep, fontWeight: 700 }}>m</span>
          <span style={{ marginLeft: 8 }}>{pad(t.s)}</span>
          <span style={{ fontSize: 13, color: C.amberDeep, fontWeight: 700 }}>s</span>
        </div>

        <span style={{ width: 1, alignSelf: "stretch", margin: "6px 0", background: C.amberDeep + "28", flexShrink: 0 }}/>

        <span style={{ flexShrink: 0, fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.mink, whiteSpace: "nowrap" }}>
          {dropOpenDay()} {dropOpenHourLong()}
        </span>

        <button onClick={onRemindMe} style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
          padding: "12px 22px", borderRadius: 999, border: "none",
          background: reminded ? C.paper : C.amberDeep,
          color: reminded ? C.amberDeep : "#fff",
          fontFamily: F.head, fontSize: 13, fontWeight: 800,
          cursor: "pointer", flexShrink: 0,
          boxShadow: reminded ? "inset 0 0 0 1.5px " + C.amberDeep + "40" : "0 2px 0 " + C.amberDeep,
        }}>
          {reminded ? <><Check size={15}/> Notified</> : <><Bell size={15}/> Remind me</>}
        </button>
      </div>
    </section>
  );
}

/* ============================================================
   DROP CLOSE DIAL
   The live band's countdown, as a ring rather than the bordered
   rectangle it used to be. The arc is the information the digits
   can't give you: "32h 54m" means nothing on its own, but an arc
   two-thirds spent reads as late in the weekend at a glance.

   Drains clockwise from a full circle at Saturday open to empty at
   Sunday close. The window is derived from the two schedule
   constants rather than hardcoded, so moving the Drop moves the
   dial with it.
   ============================================================ */
const LIVE_WINDOW_SEC = (() => {
  // Days from the open weekday to the close weekday, wrapping the week.
  const days = (DROP_CLOSE_DAY - DROP_OPEN_DAY + 7) % 7;
  return ((days * 24 + DROP_CLOSE_HOUR - DROP_OPEN_HOUR) * 3600) || 36 * 3600;
})();

function DropCloseDial({ t, pad, remainingSec }) {
  // Sized against the taller band — a 124px dial read as a small token once
  // the band grew to fit the photo.
  const SIZE = 146;
  const STROKE = 6;
  const radius = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  // Clamped: a clock that keeps ticking past the cutoff (or a window someone
  // widened mid-Drop) must not draw an arc longer than the circle.
  const remaining = Math.max(0, Math.min(1, remainingSec / LIVE_WINDOW_SEC));
  // Under an hour left, the ring turns from amber to red — the last stretch
  // is the one worth reacting to. The `> 0` guard keeps the first paint amber:
  // the clock reads 0 until the client mounts, and a red flash on every load
  // would cry wolf.
  const arcColor = remainingSec > 0 && remainingSec < 3600 ? "#FF6B4A" : C.amber;

  return (
    <div style={{ position: "relative", flexShrink: 0, width: SIZE, height: SIZE }}>
      {/* Dark disc behind the dial so the digits hold up wherever the photo
          happens to be bright. */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "rgba(16, 13, 10, 0.68)",
        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.32)",
      }}/>

      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={radius}
          fill="none" stroke={arcColor} strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - remaining)}
          style={{ transition: "stroke-dashoffset 0.6s linear, stroke 0.4s ease" }}
        />
      </svg>

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "0 12px", textAlign: "center" }}>
        <p style={{ fontFamily: F.head, fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.58)", letterSpacing: "0.16em", textTransform: "uppercase" }}>
          Closes in
        </p>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 1, fontFamily: F.head, fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          <span>{t.h}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700, marginRight: 5 }}>h</span>
          <span>{pad(t.m)}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700, marginRight: 5 }}>m</span>
          <span style={{ color: arcColor }}>{pad(t.s)}</span>
          <span style={{ fontSize: 12, color: arcColor, fontWeight: 700, opacity: 0.8 }}>s</span>
        </div>
        <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
          {dropCloseDay() + " " + dropCloseHour() + " cutoff"}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   WELCOME BAND (Live Drop state)
   Deep ink/charcoal hero. LIVE NOW pill, headline with amber
   underline on "Barrhaven", avatar stack, countdown dial.
   ============================================================ */
function WelcomeBand({ itemsCount = null, sellerNames = null }) {
  // Countdown to Drop close (Sunday 8 PM by default), read from the shared
  // Drop clock rather than a private `new Date()` tick. Two reasons: the band
  // now draws an arc of the window remaining, which is nonsense if it
  // disagrees with the phase that decided to render this band in the first
  // place; and `?simulate=<ISO>` (dev only) then moves the dial too, so the
  // LIVE state can be seen on a Tuesday instead of only at the weekend.
  //
  // SSR-safe: the provider leaves `now` null until the client mounts, so the
  // first render on both sides produces the same markup.
  // The provider holds effectiveNow at epoch 0 until the client mounts —
  // that's its own "no clock yet" sentinel, so treat it as such.
  const { effectiveNow } = useDropCycle();
  const now = effectiveNow.getTime() > 0 ? effectiveNow : null;
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

  const fallbackNeighbours = [
    { name: "Jane D." },
    { name: "Mike T." },
    { name: "Anna W." },
    { name: "Tom R." },
    { name: "Alex K." },
  ];
  // A real array always wins over the demo names, even when it's empty —
  // otherwise an empty Drop would render five invented neighbours.
  const neighbours = Array.isArray(sellerNames)
    ? sellerNames.slice(0, 5).map(n => ({ name: n }))
    : fallbackNeighbours;
  // Claimable items in this Drop. Null = not known (no prop passed) — the
  // copy then drops the number entirely rather than inventing one. This used
  // to be a hardcoded "89" that never moved no matter what was listed.
  const displayCount = typeof itemsCount === "number" ? itemsCount : null;
  // The "+N" pill counts NEIGHBOURS past the five avatars — not items. The
  // old hardcoded "+89" just repeated the item count, which is a different
  // quantity entirely.
  const overflowCount = Array.isArray(sellerNames)
    ? Math.max(0, sellerNames.length - neighbours.length)
    : 0;

  return (
    // Contained card, not the full-bleed strip AnticipationBand uses — and
    // the width is what makes the height work, so the two can't be tuned
    // separately.
    //
    // The artwork is 3:1. Stretched edge to edge on a 1920px screen the band
    // is a 7:1 letterbox, and object-fit: cover can only show a ~40% slice
    // through the middle — a close-up of two tables instead of a street.
    // Growing the band to fix that got it to ~60% but made it 380px tall,
    // which eats the fold. Narrowing it solves both at once: inside the
    // dashboard's 1216px column, 250px of height shows MORE of the photo
    // (~62%) than 380px did at full width, in a third less vertical space.
    <section className="fade-in" style={{
      background: "#1F1A14",
      marginBottom: 20,
      position: "relative",
      overflow: "hidden",
      borderRadius: 20,
      boxShadow: "0 4px 24px rgba(31, 29, 25, 0.18)",
      // Pinned at 250px on desktop; the vw term only takes over on narrow
      // screens, where the column is the viewport and a short band would
      // crop hard again.
      minHeight: "clamp(190px, 19vw, 250px)",
      padding: "26px 28px",
    }}>
      {/* Background — one photo, edge to edge, exactly as the between-drops
          band does it. This used to be HeroPhotoMosaic: the live Drop's own
          listing photos tiled over the artwork in a 3px-gapped grid. The idea
          was that the backdrop should be the neighbourhood's own items, but
          the grid paints at inset 0 across the whole band, so what you
          actually got was a patchwork of mismatched crops with seams running
          through it — a tyre, a treadmill, a bag of coffee — rather than a
          photograph. One scene reads as a place; ten thumbnails read as a
          contact sheet. */}
      <img
        src={BANNER_LIVE_SRC}
        alt=""
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 46%" }}
      />

      {/* Primary scrim — dark on the left where text lives, fading right so the
          image shines through. Lighter than the mosaic version needed: a single
          photograph survives being seen, where tiled thumbnails needed burying. */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(20, 16, 12, 0.90) 0%, rgba(20, 16, 12, 0.78) 32%, rgba(20, 16, 12, 0.50) 58%, rgba(20, 16, 12, 0.22) 82%, rgba(20, 16, 12, 0.06) 100%)" }}/>

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
            {displayCount === null ? (
              <>Items from your neighbours are claimable until {dropCloseDay()} at {dropCloseHour()}. Drops are first-come, first-served.</>
            ) : displayCount > 0 ? (
              <>
                <b style={{ color: "#fff", fontWeight: 800 }}>{displayCount} item{displayCount === 1 ? "" : "s"}</b>
                {" "}from your neighbours {displayCount === 1 ? "is" : "are"} claimable until {dropCloseDay()} at {dropCloseHour()}. Drops are first-come, first-served.
              </>
            ) : (
              <>Nothing is claimable in this Drop right now — new items show up here the moment a neighbour posts one. The window closes {dropCloseDay()} at {dropCloseHour()}.</>
            )}
          </p>
          {/* Avatar stack */}
          {neighbours.length > 0 && (
            <div style={{ display: "flex", alignItems: "center" }}>
              {neighbours.map((n, i) => (
                <div key={i} style={{ width: 32, height: 32, borderRadius: "50%", background: avatarBg(n.name), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.head, fontSize: 10, fontWeight: 800, border: "2px solid " + C.ink, marginLeft: i === 0 ? 0 : -8, zIndex: neighbours.length - i }}>
                  {initialsOf(n.name)}
                </div>
              ))}
              {overflowCount > 0 && (
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.head, fontSize: 10, fontWeight: 800, border: "2px solid " + C.ink, marginLeft: -8 }}>
                  +{overflowCount}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Right: countdown dial */}
        <DropCloseDial t={t} pad={pad} remainingSec={totalSec}/>
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
function MobileFilterBar({ filter, setFilter, search, setSearch, cat, setCat, hood, setHood, cond, setCond, sort, setSort, state, accent, chipFill, sorts, hoods = [], activeFilterCount, onReset }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const accentDeep = accent === C.green ? C.greenDeep : C.amberDeep;
  const accentMist = accent === C.green ? C.greenMist : C.amberMist;
  // Selected chips use the rail's chipFill so the sheet matches the desktop
  // panel; the rest of the sheet (focus ring, count badge, Show results) stays
  // on the lighter accent.
  const selected = chipFill || accent;
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
                      border: "1.5px solid " + (active ? selected : C.fawn),
                      background: active ? selected : C.paper,
                      color: active ? "#fff" : C.mink,
                      fontFamily: F.head, fontSize: 13, fontWeight: active ? 800 : 700,
                      cursor: "pointer", transition: "all 150ms",
                    }}>{c}</button>
                  );
                })}
              </div>
            </div>

            {hoods.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Neighbourhood</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["All", ...hoods].map(h => {
                    const active = hood === h;
                    return (
                      <button key={h} onClick={() => setHood(h)} style={{
                        padding: "9px 14px", borderRadius: 999,
                        border: "1.5px solid " + (active ? selected : C.fawn),
                        background: active ? selected : C.paper,
                        color: active ? "#fff" : C.mink,
                        fontFamily: F.head, fontSize: 13, fontWeight: active ? 800 : 700,
                        cursor: "pointer", transition: "all 150ms",
                      }}>{h === "All" ? "Any neighbourhood" : h}</button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 22 }}>
              <p style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Condition</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {conditions.map(cn => {
                  const active = cond === cn;
                  return (
                    <button key={cn} onClick={() => setCond(cn)} style={{
                      padding: "9px 14px", borderRadius: 999,
                      border: "1.5px solid " + (active ? selected : C.fawn),
                      background: active ? selected : C.paper,
                      color: active ? "#fff" : C.mink,
                      fontFamily: F.head, fontSize: 13, fontWeight: active ? 800 : 700,
                      cursor: "pointer", transition: "all 150ms",
                    }}>{cn === "All" ? "Any condition" : cn}</button>
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
                      border: "1.5px solid " + (active ? selected : C.fawn),
                      background: active ? selected : C.paper,
                      color: active ? "#fff" : C.mink,
                      fontFamily: F.head, fontSize: 13, fontWeight: active ? 800 : 700,
                      cursor: "pointer", transition: "all 150ms",
                    }}>{so.label}</button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={onReset} style={{
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

function FilterRail({ filter, setFilter, search, setSearch, cat, setCat, hood, setHood, cond, setCond, sort, setSort, panelOpen, setPanelOpen, state, hoods = [] }) {
  const { isMobile } = useViewport();
  // All hooks must run unconditionally — when the viewport crosses the mobile
  // breakpoint at hydration (SSR width default → real client width), the early
  // return below would change the hook count and React errors out. Hooks first,
  // then branch.
  const [activeSegment, setActiveSegment] = useState(null); // "search" | "category" | "hood" | "cond" | "sort" | null
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
  const activeFilterCount = (cat !== "All" ? 1 : 0) + (hood !== "All" ? 1 : 0) + (cond !== "All" ? 1 : 0) + (sort !== "newest" ? 1 : 0);
  const accent = state === "between" ? C.amber : C.green;
  // Selected chips and the active-filter tips follow the drop state too.
  // Between Drops the dashboard runs golden brown, so they take the same
  // amberDeep as the Remind me CTA on the anticipation band rather than
  // dropping a lone green pill into an amber page. During a Live Drop the
  // page is green and so are they.
  const chipFill = state === "between" ? C.amberDeep : C.green;
  const chipMist = state === "between" ? C.amberSoft : C.greenMist;
  // Ink rather than amberDeep on the tinted tips: amberDeep on amberSoft only
  // reaches 3.6:1, well short of the 6.7:1 greenDeep/greenMist manages at the
  // same 12px. The amber fill carries the theme; the label stays readable —
  // the same trade the countdown pill on the anticipation band makes.
  const chipText = state === "between" ? C.ink : C.greenDeep;
  const clearAll = () => { setCat("All"); setHood("All"); setCond("All"); setSort("newest"); setSearch(""); };

  // On mobile, swap to the sheet-based filter UI. Branch AFTER all hooks.
  if (isMobile) {
    return (
      <MobileFilterBar
        filter={filter} setFilter={setFilter}
        search={search} setSearch={setSearch}
        cat={cat} setCat={setCat}
        hood={hood} setHood={setHood}
        cond={cond} setCond={setCond}
        sort={sort} setSort={setSort}
        state={state}
        accent={accent}
        chipFill={chipFill}
        sorts={sorts}
        hoods={hoods}
        activeFilterCount={activeFilterCount}
        onReset={clearAll}
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
    // Tighter than it was: five segments share the capsule now, and the old
    // 28px gutters pushed the Sort value under the search button.
    padding: "14px 18px",
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

  // Every segment is laid out the same way: what it filters on the left, the
  // label and current value in the middle, and — on the four that open a
  // chooser — a chevron on the right. Search has no chevron: it opens a text
  // field, not a list.
  //
  // Called as a function rather than rendered as <SegBody/>: a component
  // declared inside a render is a brand-new type on every pass, so React
  // would throw the segment away and rebuild it each keystroke.
  const segBody = ({ icon: Icon, label, value, filled, chevron = true }) => (
    <span style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minWidth: 0 }}>
      <Icon size={17} strokeWidth={2.2} style={{ color: filled ? C.ink : C.mink, flexShrink: 0 }}/>
      <span style={{ flex: 1, minWidth: 0 }}>
        <p style={segLabel}>{label}</p>
        <p style={segValue(filled)}>{value}</p>
      </span>
      {chevron && <ChevronDown size={15} strokeWidth={2.4} style={{ color: C.ash, flexShrink: 0 }}/>}
    </span>
  );

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
            {(cat !== "All" || hood !== "All" || cond !== "All" || sort !== "newest") && (
              <span style={{ fontSize: 13, fontWeight: 500, color: C.mink, whiteSpace: "nowrap" }}>
                · {cat !== "All" ? cat : hood !== "All" ? hood : cond !== "All" ? cond : sortShort}
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
          {segBody({ icon: Search, label: "Search", value: search || "Items, categories, neighbours", filled: !!search, chevron: false })}
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
          {segBody({ icon: LayoutGrid, label: "Category", value: cat === "All" ? "Any category" : cat, filled: cat !== "All" })}
        </button>

        {/* Divider */}
        {activeSegment !== "category" && activeSegment !== "hood" && hoveredSegment !== "category" && hoveredSegment !== "hood" && (
          <div style={{ width: 1, background: C.fawn, margin: "12px 0" }}/>
        )}

        {/* SEGMENT 3 — NEIGHBOURHOOD */}
        <button
          onClick={() => toggleSegment("hood")}
          onMouseEnter={() => setHoveredSegment("hood")}
          onMouseLeave={() => setHoveredSegment(null)}
          style={segStyle("hood")}
        >
          {segBody({ icon: MapPin, label: "Neighbourhood", value: hood === "All" ? "Any neighbourhood" : hood, filled: hood !== "All" })}
        </button>

        {/* Divider */}
        {activeSegment !== "hood" && activeSegment !== "cond" && hoveredSegment !== "hood" && hoveredSegment !== "cond" && (
          <div style={{ width: 1, background: C.fawn, margin: "12px 0" }}/>
        )}

        {/* SEGMENT 4 — CONDITION */}
        <button
          onClick={() => toggleSegment("cond")}
          onMouseEnter={() => setHoveredSegment("cond")}
          onMouseLeave={() => setHoveredSegment(null)}
          style={segStyle("cond")}
        >
          {segBody({ icon: Tag, label: "Condition", value: cond === "All" ? "Any condition" : cond, filled: cond !== "All" })}
        </button>

        {/* Divider */}
        {activeSegment !== "cond" && activeSegment !== "sort" && hoveredSegment !== "cond" && hoveredSegment !== "sort" && (
          <div style={{ width: 1, background: C.fawn, margin: "12px 0" }}/>
        )}

        {/* SEGMENT 5 — SORT */}
        <button
          onClick={() => toggleSegment("sort")}
          onMouseEnter={() => setHoveredSegment("sort")}
          onMouseLeave={() => setHoveredSegment(null)}
          style={{ ...segStyle("sort"), paddingRight: 80 }}
        >
          {segBody({ icon: ArrowUpDown, label: "Sort by", value: sortShort, filled: sort !== "newest" })}
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
      {!activeSegment && (cat !== "All" || hood !== "All" || cond !== "All" || sort !== "newest" || search) && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          {search && (
            <button onClick={() => setSearch("")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 999, background: chipMist, border: "none", color: chipText, fontSize: 12, fontFamily: F.head, fontWeight: 700, cursor: "pointer" }}>
              "{search}" <X size={12}/>
            </button>
          )}
          {cat !== "All" && (
            <button onClick={() => setCat("All")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 999, background: chipMist, border: "none", color: chipText, fontSize: 12, fontFamily: F.head, fontWeight: 700, cursor: "pointer" }}>
              {cat} <X size={12}/>
            </button>
          )}
          {hood !== "All" && (
            <button onClick={() => setHood("All")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 999, background: chipMist, border: "none", color: chipText, fontSize: 12, fontFamily: F.head, fontWeight: 700, cursor: "pointer" }}>
              {hood} <X size={12}/>
            </button>
          )}
          {cond !== "All" && (
            <button onClick={() => setCond("All")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 999, background: chipMist, border: "none", color: chipText, fontSize: 12, fontFamily: F.head, fontWeight: 700, cursor: "pointer" }}>
              {cond} <X size={12}/>
            </button>
          )}
          {sort !== "newest" && (
            <button onClick={() => setSort("newest")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 999, background: chipMist, border: "none", color: chipText, fontSize: 12, fontFamily: F.head, fontWeight: 700, cursor: "pointer" }}>
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
                    <button key={c} onClick={() => { setCat(c); if (c === "All") setActiveSegment(null); }} style={{ padding: "9px 16px", borderRadius: 999, border: "1.5px solid " + (active ? chipFill : C.fawn), background: active ? chipFill : C.paper, color: active ? "#fff" : C.mink, fontFamily: F.head, fontSize: 13, fontWeight: active ? 800 : 700, cursor: "pointer", transition: "all 150ms" }}>{c}</button>
                  );
                })}
              </div>
            </div>
          )}
          {activeSegment === "hood" && (
            <div>
              <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, display: "block" }}>Choose a neighbourhood</label>
              {hoods.length === 0 ? (
                <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.ash, fontStyle: "italic" }}>No neighbourhoods to filter by yet — sellers add theirs to their profile.</p>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["All", ...hoods].map(h => {
                    const active = hood === h;
                    return (
                      <button key={h} onClick={() => { setHood(h); if (h === "All") setActiveSegment(null); }} style={{ padding: "9px 16px", borderRadius: 999, border: "1.5px solid " + (active ? chipFill : C.fawn), background: active ? chipFill : C.paper, color: active ? "#fff" : C.mink, fontFamily: F.head, fontSize: 13, fontWeight: active ? 800 : 700, cursor: "pointer", transition: "all 150ms" }}>{h === "All" ? "Any neighbourhood" : h}</button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {activeSegment === "cond" && (
            <div>
              <label style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, display: "block" }}>Choose a condition</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {conditions.map(cn => {
                  const active = cond === cn;
                  return (
                    <button key={cn} onClick={() => { setCond(cn); if (cn === "All") setActiveSegment(null); }} style={{ padding: "9px 16px", borderRadius: 999, border: "1.5px solid " + (active ? chipFill : C.fawn), background: active ? chipFill : C.paper, color: active ? "#fff" : C.mink, fontFamily: F.head, fontSize: 13, fontWeight: active ? 800 : 700, cursor: "pointer", transition: "all 150ms" }}>{cn === "All" ? "Any condition" : cn}</button>
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
                    <button key={so.id} onClick={() => { setSort(so.id); setActiveSegment(null); }} style={{ padding: "9px 16px", borderRadius: 999, border: "1.5px solid " + (active ? chipFill : C.fawn), background: active ? chipFill : C.paper, color: active ? "#fff" : C.mink, fontFamily: F.head, fontSize: 13, fontWeight: active ? 800 : 700, cursor: "pointer", transition: "all 150ms" }}>{so.label}</button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          {activeSegment !== "search" && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, paddingTop: 18, borderTop: "1px solid " + C.fawn }}>
              <button onClick={() => { clearAll(); setActiveSegment(null); }} style={{ padding: "9px 16px", borderRadius: 999, border: "none", background: "transparent", fontSize: 13, color: C.mink, fontWeight: 700, cursor: "pointer", fontFamily: F.head, textDecoration: "underline", textUnderlineOffset: 3 }}>
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
  const priceFragment = (typeof price === "number" && price >= 0) ? " · " + priceText(price) : "";
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
   PRODUCT CARD TOKENS
   From the "Premium buyer marketplace item card" handoff: white
   card and photo backdrop, a 1px warm border instead of a heavy
   lift, a much larger title/price pair, and pale-green icon discs.

   Two values deliberately diverge from the handoff sheet, which
   says itself that its hexes approximate a screenshot and must be
   validated against the logo before release:
     green — stays C.green (#308424, the logo's own), not the
             sheet's #287D26. Same call the ITEM DETAIL TOKENS
             note above already made for #27852F.
     font  — D.font, which is Geist (loaded by app/layout.tsx) with
             Inter next in the stack. The sheet asks for Inter as a
             stand-in for "clean contemporary sans"; D.font is that,
             already paid for, and keeps the card matching the item
             page it opens into.
   ============================================================ */
const CARD = {
  font:       D.font,
  ink:        "#111827",
  muted:      "#74777D",
  border:     "#E7E3DD",
  iconBg:     "#EFF7ED",
  red:        "#E11D2E",
  green:      C.green,
  greenHover: C.greenDeep,
};

/* ============================================================
   ITEM CARD  — works for drop / shelf
   ============================================================ */
function ItemCard({ item, saved, onToggleSave, onOpen, onClaimNow, index, liveMode, fromPeek, claimedByMe = false, purchasedByMe = false, offerPending = false, isOwn = false, onSwitchRole = null, answerReady = false }) {
  const { isMobile } = useViewport();
  const [hovered, setHovered] = useState(false);
  // Tracked separately from `hovered` so the CTA only darkens when the
  // pointer is actually on it, not anywhere on the card.
  const [ctaHovered, setCtaHovered] = useState(false);
  const discount = item.op ? Math.round((1 - item.p / item.op) * 100) : null;
  // No "Live Drop" pill — the handoff drops it, and every card under the
  // Live Drop header was wearing one, so it repeated the heading. The
  // state badges below (Sneak Peek, Claim pending, Your listing) stay:
  // those report whether the card can be acted on, which the heading
  // doesn't say.
  // badgeBg is a real tint, not C.paper. The photo backdrop is white now, so
  // the white pills these badges used to be were a border floating on nothing.
  let badgeBg = C.greenMist, badgeColor = C.greenDeep, badgeLabel = null, ctaLabel = "Claim Now";
  if (item.layer === "shelf" && !liveMode) {
    // No badge. A Shelf item outside a live Drop only ever appears under the
    // "Available now" header, and every card in that section is one — so the
    // pill repeated the heading on each card and said nothing the heading
    // hadn't. The per-layer accent on the price is gone with the handoff: the
    // price is the green token on every card now, so a Shelf item is told
    // apart by its section and its CTA, not by a second colour.
    badgeBg = C.amberSoft; badgeColor = C.amberDeep; badgeLabel = null;
  }
  // Queued for the next Drop — browsable, not claimable yet. "Live Drop" here
  // contradicted the disabled CTA right below it on the same card.
  if (item.status === "preview") {
    badgeBg = C.amberSoft; badgeColor = C.amberDeep; badgeLabel = "Sneak Peek";
  }
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
  // This viewer has a claim on the item that the seller hasn't answered. The
  // card stays in the feed and keeps its normal look — only the badge above
  // and this CTA change, and only for them; every other buyer sees an ordinary
  // claimable card and can claim it too. The button is parked rather than live
  // because the backend refuses a second claim from the same buyer ("you
  // already have an offer on this item"), so offering it would be an
  // invitation to an error toast.
  const hasPendingOffer = offerPending === true && !isClaimed && !isPreview;
  // The viewer is the seller. The card stays in the feed — this is how a
  // seller sees their listing exactly as the neighbourhood sees it — but
  // every buyer-side action comes off it: no claim (the backend refuses a
  // self-claim), no save (watching your own item is meaningless). Opening
  // the card still works; ItemDetail offers the Seller-view switch there.
  const ctaDisabled = isOwn || isClaimed || isPreview || hasPendingOffer;
  // The claim CTA is always the brand green. It's the same action on every
  // card, so it reads as one button across the feed.
  const ctaBg = CARD.green;

  // The card carries a 1px warm border again and only a whisper of shadow —
  // the handoff asks for the edge to come from the border, not a lift, so the
  // two-layer float that used to stand in for it is gone. The hover lift
  // survives as a 2px nudge because the whole card is clickable and needs to
  // say so. The fromPeek amber bar stays: it marks "saved from your sneak
  // peek", which is information, not decoration.
  const peekBar = fromPeek ? "inset 4px 0 0 " + C.amber + ", " : "";
  const cardShadow = hovered
    ? peekBar + "0 4px 16px rgba(31, 29, 25, 0.08)"
    : peekBar + "0 1px 2px rgba(31, 29, 25, 0.03)";

  // "In Barrhaven" when we know the seller's neighbourhood. `item.dist` falls
  // back to a distance label ("0.9 km"), which reads wrong behind "In", so it
  // goes in bare.
  const sellerPlace = item.sellerHood ? "In " + item.sellerHood : (item.dist || null);

  return (
    <article onClick={onOpen} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="fade-in" style={{ background: C.paper, borderRadius: 22, overflow: "hidden", border: "1px solid " + CARD.border, cursor: "pointer", transition: "all 250ms cubic-bezier(0.25, 1, 0.5, 1)", transform: hovered ? "translateY(-2px)" : "translateY(0)", boxShadow: cardShadow, animationDelay: Math.min(index * 40, 400) + "ms", display:"flex", flexDirection:"column" }}>
      {/* Photo on plain white, contained rather than cropped. The tinted
          gradient that used to sit back here coloured every product shot and
          fought the white card; `contain` keeps the seller's framing intact
          and leaves the negative space the handoff asks for. */}
      <div style={{ position: "relative", aspectRatio: "4/3", background: C.paper, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <ItemImage
          src={item.img}
          emojiSize={72}
          imgStyle={{ objectFit: "contain", padding: isMobile ? 14 : 18, transform: hovered ? "scale(1.03)" : "scale(1)", transition: "transform 400ms ease" }}
          spanStyle={{ transform: hovered ? "scale(1.03)" : "scale(1)", transition: "transform 400ms ease" }}
        />
        <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 10 }}>
          {/* Share button (BUG-051). Uses Web Share API on mobile so users
              get the native iOS/Android share sheet; clipboard fallback on
              desktop. Stop propagation so the click doesn't also open the
              item detail. */}
          <button
            onClick={async (e) => { e.stopPropagation(); await shareListing(item); }}
            aria-label="Share this listing"
            title="Share"
            style={{ width: 42, height: 42, borderRadius: "50%", border: "none", background: CARD.iconBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <Share2 size={20} strokeWidth={2} style={{ color: CARD.green }}/>
          </button>
          {/* Save stays available on an own listing too. Watching your own
              item is pointless, but it's allowed by the backend, so a seller
              who saved one before now needs this heart to unsave it — and
              the Saved page renders the same card. */}
          <button
            onClick={e => { e.stopPropagation(); onToggleSave(item.id); }}
            aria-label={saved ? "Remove from saved" : "Save this listing"}
            aria-pressed={saved}
            title={saved ? "Saved" : "Save"}
            style={{ width: 42, height: 42, borderRadius: "50%", border: "none", background: CARD.iconBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <Heart size={20} strokeWidth={2} style={{ color: CARD.red, fill: saved ? CARD.red : "none" }}/>
          </button>
        </div>
        {badgeLabel && (
          <span style={{ position: "absolute", top: 14, left: 14, fontFamily: CARD.font, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", padding: "5px 11px", borderRadius: 999, background: badgeBg, color: badgeColor, border: "1px solid " + badgeColor + "33" }}>
            {badgeLabel}
          </span>
        )}

        {item.priceDrop && (
          <span style={{ position: "absolute", bottom: 14, left: 14, fontFamily: F.head, fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: C.green, color: "#fff", display: "flex", alignItems: "center", gap: 4 }}>
            <TrendingDown size={10}/> Price dropped
          </span>
        )}
        {/* This viewer's claim, which the seller hasn't answered yet.
            Deliberately a badge and not the full-card overlay below: a claim
            doesn't reserve anything, so the item is still listed and every
            other neighbour still sees an ordinary claimable card. Only this
            viewer sees the badge. */}
        {offerPending && !isOwn && !isClaimed && !isPreview && (
          <span style={{ position: "absolute", bottom: 14, right: 14, fontFamily: CARD.font, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: C.amberSoft, color: C.amberDeep, border: "1px solid " + C.amber + "55", display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={11}/> Claim pending
          </span>
        )}
        {/* The seller answered a question this buyer asked, and they haven't
            read it. Sits top-left under the layer badge so it survives
            alongside the offer-pending / price-drop badges below. Clears the
            moment the item detail opens — that's where the answer is. */}
        {answerReady && (
          <span style={{ position: "absolute", top: badgeLabel ? 46 : 14, left: 14, fontFamily: F.head, fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: C.ai, color: "#fff", display: "flex", alignItems: "center", gap: 4, boxShadow: "0 2px 8px rgba(31,29,25,0.18)" }}>
            <Mail size={10} strokeWidth={2.6}/> Seller replied
          </span>
        )}
        {/* Also a badge rather than the full-card overlay: the item is live
            and claimable by everyone else, so dimming the photo would
            misreport its state to the only person who can't act on it. */}
        {isOwn && (
          <span style={{ position: "absolute", bottom: 14, right: 14, fontFamily: CARD.font, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: C.greenMist, color: C.greenDeep, border: "1px solid " + C.green + "55", display: "flex", alignItems: "center", gap: 4 }}>
            <Package size={11}/> Your listing
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
            ) : isOwn ? (
              // The seller's own item, claimed by a neighbour. "Notify me if
              // it frees up" is the wrong offer to make the person who owns
              // it — the pickup is theirs to run, from the Seller view.
              <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.mink, textAlign: "center", lineHeight: 1.4, maxWidth: 200 }}>A neighbour is picking this up. Arrange it from your <b style={{ color: C.ink }}>Seller view</b>.</p>
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

      <div style={{ padding: isMobile ? "16px 18px 18px" : "18px 22px 22px", display: "flex", flexDirection: "column", flex: 1 }}>
        {fromPeek && (
          <p style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: CARD.font, fontSize: 10, fontWeight: 800, color: C.amberDeep, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
            <Heart size={9} fill={C.amber} stroke={C.amber} strokeWidth={0}/> Saved from your Sneak Peek
          </p>
        )}
        <h3 style={{ fontFamily: CARD.font, fontSize: isMobile ? 19 : 23, fontWeight: 700, color: CARD.ink, letterSpacing: "-0.015em", lineHeight: 1.28, marginBottom: 10 }}>{item.t}</h3>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
          {/* Price keeps priceColor() so a $0 listing still reads "Free" in
              claret — the handoff's green is the price colour, not a rule
              that every price is green. */}
          <span style={{ fontFamily: CARD.font, fontSize: isMobile ? 29 : 32, fontWeight: 750, color: priceColor(item.p, CARD.green), letterSpacing: "-0.02em", lineHeight: 1.1 }}>{priceText(item.p)}</span>
          {item.op && <span style={{ fontFamily: CARD.font, fontSize: 13, fontWeight: 500, color: CARD.muted, textDecoration: "line-through" }}>${item.op}</span>}
          {discount && <span style={{ fontFamily: CARD.font, fontSize: 11, fontWeight: 700, color: C.amberDeep, background: C.amberMist, padding: "3px 8px", borderRadius: 6 }}>Save {discount}%</span>}
          {/* Seller's average rating, opposite the price. Only drawn once a
              buyer has actually rated them — an unrated seller shows nothing
              rather than a default score that would read as a real one. */}
          {typeof item.sellerRating === "number" && (
            <span
              title={"Rated " + item.sellerRating.toFixed(1) + " of 5 across " + item.sellerRatingCount + " completed pickup" + (item.sellerRatingCount === 1 ? "" : "s")}
              style={{ marginLeft: "auto", alignSelf: "center", display: "flex", alignItems: "center", gap: 3, fontFamily: CARD.font, fontSize: 14, fontWeight: 650, color: CARD.ink }}
            >
              <Star size={14} fill={C.amber} strokeWidth={0} style={{ color: C.amber }}/> {item.sellerRating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Seller row — avatar beside a stacked name + metadata line, the way
            the handoff lays it out. The distance used to sit far right on its
            own; it belongs with the seller, since it's their distance. */}
        <div style={{ paddingTop: 16, borderTop: "1px solid " + CARD.border, display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 38, height: 38, flexShrink: 0, borderRadius: "50%", background: avatarBg(item.seller), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CARD.font, fontSize: 16, fontWeight: 700 }}>{item.seller.charAt(0)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: CARD.font, fontSize: 15, fontWeight: 650, color: CARD.ink, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.seller}</div>
            <div style={{ fontFamily: CARD.font, fontSize: 13, fontWeight: 450, color: CARD.muted, lineHeight: 1.45, display: "flex", alignItems: "center", gap: 5 }}>
              <span>Neighbour</span>
              {sellerPlace && (
                <>
                  <span aria-hidden="true">·</span>
                  <MapPin size={12} style={{ flexShrink: 0 }}/>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sellerPlace}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={e => {
            e.stopPropagation();
            // Own listing: the only action worth offering is the one that
            // actually does something — jump to the Seller view to manage it.
            // Falls back to opening the detail, which carries the same switch.
            if (isOwn) { if (onSwitchRole) onSwitchRole(); else if (onOpen) onOpen(); return; }
            if (ctaDisabled) { if (isPreview && onOpen) onOpen(); return; }
            if (onClaimNow) onClaimNow(); else if (onOpen) onOpen();
          }}
          disabled={!isOwn && (isClaimed || hasPendingOffer)}
          onMouseEnter={() => setCtaHovered(true)}
          onMouseLeave={() => setCtaHovered(false)}
          className="cta-primary"
          style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            minHeight: 50, padding: "0 12px", borderRadius: 14,
            border: isOwn ? "1px solid " + CARD.border : "none",
            background: isOwn ? C.paper : isPreview ? C.sand : hasPendingOffer ? C.amberMist : (ctaHovered && !ctaDisabled ? CARD.greenHover : ctaBg),
            color: isOwn ? CARD.ink : isPreview ? CARD.muted : hasPendingOffer ? C.amberDeep : "#fff",
            fontFamily: CARD.font, fontSize: isMobile ? 16 : 17, fontWeight: 700,
            cursor: (!isOwn && (isClaimed || hasPendingOffer)) ? "not-allowed" : "pointer",
            opacity: (isClaimed && !isOwn) ? 0.4 : 1,
            marginTop: "auto",
            // The handoff asks for a flat button; the 2px underglow that gave
            // the old CTA its weight is gone now that the label carries it.
            boxShadow: "none",
          }}
        >
          {isOwn
            ? <><Package size={17}/> Manage in Seller view</>
            : isPreview
              ? <><Clock size={17}/> Opens {dropOpenDay()} {dropOpenHour()}</>
              : hasPendingOffer
                ? <><Clock size={17}/> Waiting for seller</>
                : <><ShoppingBag size={18} strokeWidth={2}/> {ctaLabel}</>}
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

  // Multi-photo gallery, same mechanics as ItemDetail (BUG-066/068): hero +
  // arrows + thumbnail strip, wrapping at both ends, arrow keys bound while
  // this view is open. A Sneak Peek is the one look a buyer gets before
  // Saturday, so showing one photo out of five was the costliest place to
  // drop them.
  const galleryPhotos = Array.isArray(item.photos) ? item.photos.filter(Boolean) : [];
  const hasMultiplePhotos = galleryPhotos.length > 1;
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const safeIdx = Math.min(activePhotoIdx, Math.max(0, galleryPhotos.length - 1));
  const heroSrc = galleryPhotos[safeIdx] || item.img;
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
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft")  { e.preventDefault(); goPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasMultiplePhotos, goPrev, goNext]);

  return (
    <div style={{ paddingBottom: 40 }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, cursor: "pointer", fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.mink, marginBottom: 24 }}>
        <ArrowLeft size={14}/> Back
      </button>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 380px", gap: isMobile ? 24 : 40, alignItems: "start" }}>
        {/* Image area with locked-preview styling */}
        <div>
          {/* Same contain + height cap as the live item detail hero — this is
              the same page for a queued item, and a cropped preview is worse
              here: deciding whether to save it is the only thing this page is
              for. */}
          <div style={{ position: "relative", aspectRatio: "4/3", maxHeight: isMobile ? 340 : 480, borderRadius: 24, background: "linear-gradient(135deg, " + C.amberMist + " 0%, " + C.sand + " 100%)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid " + C.fawn + "80", marginBottom: 24, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, " + C.amber + "12 100%)", pointerEvents: "none" }}/>
            <ItemImage
              src={heroSrc}
              emojiSize={160}
              imgStyle={{ objectFit: "contain", padding: isMobile ? 10 : 16, filter: "saturate(0.85)", opacity: 0.92 }}
              spanStyle={{ filter: "saturate(0.85)", opacity: 0.92 }}
            />

            {hasMultiplePhotos && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous photo"
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: isMobile ? 38 : 44, height: isMobile ? 38 : 44, borderRadius: "50%", border: "1px solid " + C.fawn, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.ink, boxShadow: "0 2px 8px rgba(31,29,25,0.12)", zIndex: 2 }}
                >
                  <ChevronLeft size={isMobile ? 18 : 22} strokeWidth={2.4}/>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next photo"
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: isMobile ? 38 : 44, height: isMobile ? 38 : 44, borderRadius: "50%", border: "1px solid " + C.fawn, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.ink, boxShadow: "0 2px 8px rgba(31,29,25,0.12)", zIndex: 2 }}
                >
                  <ChevronRight size={isMobile ? 18 : 22} strokeWidth={2.4}/>
                </button>
                <span style={{ position: "absolute", bottom: 14, right: 14, display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, background: "rgba(31,29,25,0.75)", backdropFilter: "blur(6px)", color: "#fff", fontFamily: F.head, fontSize: 11, fontWeight: 700 }}>
                  {safeIdx + 1} / {galleryPhotos.length}
                </span>
              </>
            )}

            {/* Drop-day banner — bigger version of the card badge */}
            <div style={{ position: "absolute", top: 18, left: 18, padding: "8px 14px", borderRadius: 999, background: C.amber, color: "#fff", fontFamily: F.head, fontSize: 12, fontWeight: 900, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 3px 10px " + C.amber + "55" }}>
              <Clock size={12} strokeWidth={2.6}/>
              DROPS {dropOpenDay().toUpperCase()} {dropOpenHourBadge()}
            </div>
          </div>

          {/* Thumbnail strip — amber ring on the active thumb to stay inside
              the Sneak Peek palette rather than ItemDetail's green. */}
          {hasMultiplePhotos && (
            <div className="preview-scroll" aria-label="Item photos" style={{ display: "flex", gap: isMobile ? 8 : 10, marginBottom: isMobile ? 16 : 24, marginTop: -8, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "thin" }}>
              {galleryPhotos.map((src, i) => {
                const isActive = i === safeIdx;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActivePhotoIdx(i)}
                    aria-label={`Show photo ${i + 1} of ${galleryPhotos.length}`}
                    aria-pressed={isActive}
                    style={{ flex: "0 0 auto", width: isMobile ? 64 : 78, height: isMobile ? 64 : 78, borderRadius: 12, border: isActive ? `2.5px solid ${C.amber}` : `1.5px solid ${C.fawn}`, boxShadow: isActive ? `0 4px 12px ${C.amber}33` : "none", padding: 0, background: C.paper, overflow: "hidden", cursor: "pointer", transition: "border-color 150ms, box-shadow 150ms, transform 150ms", transform: isActive ? "scale(1.02)" : "scale(1)" }}
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
              Final details, condition notes and exact price will be posted {dropOpenDay()} by {dropOpenHour()}.
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

      {/* Header — the same filled pill the Discover strip now uses, so
          "See all sneak peeks" doesn't land on a weaker version of the
          header it was clicked from. Stays an <h1> because this is a page,
          not a section of one, so SectionHeader's <h2> isn't right here. */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "6px 14px 6px 11px", background: C.amber, borderRadius: 999, boxShadow: "0 2px 10px " + C.amber + "55" }}>
          <span style={{ position: "relative", display: "inline-flex", width: 10, height: 10 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#fff", opacity: 0.6, animation: "pulseLive 1.5s ease-in-out infinite" }}/>
            <span style={{ position: "relative", width: 10, height: 10, borderRadius: "50%", background: "#fff", boxShadow: "0 0 0 2px " + C.amber }}/>
          </span>
          <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 900, color: "#fff", letterSpacing: "0.18em", textTransform: "uppercase" }}>Sneak peek</span>
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
    <section className="fade-in">
      {/* Was a hand-rolled header — a thin amber rule plus small amber text —
          which read as a caption next to "Available now" and "Live Drop",
          both of which use SectionHeader's filled pill. Same component now,
          so the three sections carry equal weight and can't drift apart
          again. Amber keeps it the Sneak Peek colour, and the pulse reads as
          anticipation for something that hasn't opened yet. */}
      <SectionHeader
        eyebrow="Sneak peek"
        eyebrowBg={C.amber}
        pulse={true}
        title="Dropping this Saturday"
        subtitle="A curated preview of what neighbours are bringing. Save anything that catches your eye and we'll highlight it the moment the Drop opens."
        action={{ label: "See all sneak peeks", onClick: onSeeAllPreviews }}
      />

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
    // Padding and illustration trimmed (72/64 → 48/44, 132 → 104): the card
    // was tall enough on a desktop viewport to reach down over the hills
    // backdrop and hide the village behind it. Transparent background rather
    // than C.paper so the hills read through the lower edge, which is what
    // makes it sit on the landscape instead of masking it.
    <div style={{ textAlign: "center", padding: "48px 24px 44px", background: "transparent", borderRadius: 24, border: "1.5px dashed " + C.fawn, position: "relative", overflow: "hidden" }}>
      <div aria-hidden="true" style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 280, height: 200, borderRadius: "50%", background: "radial-gradient(ellipse at center, " + accentColor + "12 0%, transparent 70%)", filter: "blur(12px)", pointerEvents: "none" }}/>
      <div style={{ position: "relative" }}>
        {illustration ? (
          <div style={{ width: 104, height: 104, margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
function ClaimModal({ item, onClose, onConfirm, accessToken = null, onGoToMessages = null, onClaimCreated = null }) {
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
      // Tell the dashboard root a claim + conversation now exist, so the
      // inbox, the Messages badge and the Claims tab are current by the time
      // the buyer taps "View in Messages". The backend also pushes claim:new /
      // message:new over the socket, but this must not depend on the socket
      // being alive — that was the "I don't see the message unless I refresh"
      // bug.
      if (typeof onClaimCreated === "function") onClaimCreated(resp);
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
            {step === "confirm" ? "Claim this item" : step === "offer-sent" ? "Offer sent!" : "Claim sent!"}
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
            <p style={{ fontFamily: F.head, fontSize: 18, fontWeight: 900, color: priceColor(item.price, C.green), marginTop: 4 }}>
              {priceText(item.price)}
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
                <p style={{ fontFamily: F.head, fontSize: 20, fontWeight: 900, color: priceColor(item.price, C.green), flexShrink: 0 }}>{priceText(item.price)}</p>
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
                      {item.paymentMethod === "either"    && <Wallet size={15} style={{ color: C.ink }}/>}
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
                    : (<><Check size={16}/> {isFreePrice(item.price) ? "Claim for free" : "Claim at $" + item.price}</>)}
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
            {/* A claim is a request, not a reservation — the seller decides
                between everyone who claims. Saying "reserved for you" here
                promised something the item's state never backed up. */}
            <h3 style={{ fontFamily: F.head, fontSize: 22, fontWeight: 900, color: C.ink, marginBottom: 8 }}>Claim sent!</h3>
            <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.mink, lineHeight: 1.55, marginBottom: 20 }}>
              Your claim on <b style={{ color: C.ink }}>{item.title}</b> at <b style={{ color: C.ink }}>{priceText(item.price)}</b> is with the seller.<br/>
              Pickup: <b style={{ color: C.ink }}>{slot}</b><br/>
              <span style={{ fontSize: 12.5, color: C.ash }}>The item stays listed until they confirm — other neighbours may claim it too.</span>
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
            <p style={{ fontFamily: F.head, fontSize: 15, fontWeight: 900, color: priceColor(item.price, C.green) }}>{priceText(item.price)}</p>
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
      // Real average from the backend (null when nobody has rated them yet),
      // so the detail view's star matches the one on the card.
      rating:       typeof item.sellerRating === "number" ? item.sellerRating.toFixed(1) : null,
      ratingCount:  item.sellerRatingCount ?? 0,
      id:           item.sellerId || null,
    },
    img: item.img, photos: item.photos, saves: item.saves, watchers: Math.max(1, Math.round((item.saves || 0) * 0.75)), layer: item.layer, status: item.status, timeLeft: item.timeLeft, days: item.days, priceDrop: item.priceDrop, paymentMethod: item.paymentMethod || "either",
    createdAt: item.createdAt || item.raw?.createdAt || null,
    daysListed: typeof item.days === "number" ? item.days : null,
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
    // Same local-calendar parse as the summary above — these strings become
    // the claim's `pickupSlot`, so a day's drift here is a pickup the seller
    // never offered.
    dayLabels = custom
      .slice()
      .sort()
      .map((d) => {
        const label = formatPickupWeekday(d);
        return label === d ? null : label; // unparseable → drop the slot
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
    // formatPickupDateList parses the stored calendar date locally. Doing
    // this with `new Date(d)` printed the day BEFORE the one the seller
    // picked for every viewer west of UTC.
    daySummary = formatPickupDateList(custom);
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

function ItemDetail({ item, onBack, onClaimComplete, onGoToClaims, onGoToSeller, onViewSeller, savedIds, onToggleSave, accessToken = null, onGoToMessages = null, onClaimCreated = null, currentUserId = null, onSwitchRole = null, dropState = "between" }) {
  // Own listings are in the buyer feed by design, so a seller opening their
  // own item detail is now the ordinary path, not just the deep-link /
  // watchlist edge case it was when the feed filtered them out. Either way:
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
  // While the Drop is running the two pools are one. A Shelf item is
  // claimable right now, alongside everything in the Drop, so it wears the
  // LIVE DROP badge and sheds its Shelf markers entirely — telling the buyer
  // "on the shelf" mid-Drop sorts it into a category that isn't live at that
  // moment. The feed already merges the pools this way (see the unified live
  // pool in DiscoverPage) and so does ItemCard via `liveMode`; this is the
  // detail page catching up with both.
  //
  // It reverts on its own when the Drop closes: dropState flips back to
  // "between" on the root's 60s tick, and every unsold item is a Shelf item
  // again — which is also where the backend now parks them (see
  // rolloverUnsoldItemsToShelf).
  const dropIsLive = dropState === "live";
  const showShelfTag = isShelf && !dropIsLive;
  // Claimed, or a Drop item still in PREVIEW: the backend refuses a claim in
  // both cases, so the CTA is parked and the offer hint under it would be
  // describing a flow the buyer can't open. Computed here rather than inside
  // the CTA's IIFE so the hint can share it.
  const notClaimable = item.status === "claimed" || item.status === "preview";
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
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, border: "1px solid " + C.fawn, background: C.paper, cursor: "pointer", fontFamily: D.font, fontSize: 13, fontWeight: 700, color: C.mink, marginBottom: 24 }}>
        <ArrowLeft size={14}/> Back
      </button>

      {/* Two columns: the image + everything that describes the item on the
          left, the purchase panel in a narrower rail on the right. The page
          shell is already a centred 1280px column, inside the 1200–1320
          band the brief asks for. */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 380px", gap: isMobile ? 24 : 48, alignItems: "start" }}>
        <div>
          {/* Image area with badge overlays.
              BUG-066 — heroSrc swaps with the active thumbnail. Photo
              count pill in the bottom-right tells the buyer there's more
              to see when sources > 1. */}
          {/* The hero shows the WHOLE item, so it contains rather than covers.
              It used to inherit ItemImage's default objectFit: "cover", which
              crops to fill — fine for the uniform card grid, wrong here: a
              tall item (a trimmer, a floor pump, a chair) had its top and
              bottom sliced off on the one page where the buyer is trying to
              judge what they're claiming.

              maxHeight caps the box as well. At 4/3 the left column runs to
              roughly 640px tall on a desktop, which pushed the item past the
              fold; the cap keeps the whole photo on screen next to the
              purchase panel. Padding keeps a contained image clear of the
              badges and arrows sitting on top of it. */}
          <div style={{ position: "relative", aspectRatio: "4/3", maxHeight: isMobile ? 340 : 480, borderRadius: 16, background: C.sand, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid " + C.fawn, marginBottom: isMobile ? 12 : 16, overflow: "hidden" }}>
            <ItemImage src={heroSrc} emojiSize={160} imgStyle={{ objectFit: "contain", padding: isMobile ? 10 : 16 }}/>
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
              <span style={{ position: "absolute", bottom: 14, right: 14, display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, background: "rgba(31,29,25,0.75)", backdropFilter: "blur(6px)", color: "#fff", fontFamily: D.font, fontSize: 11, fontWeight: 700, letterSpacing: "0.02em" }}>
                {safeIdx + 1} / {galleryPhotos.length}
              </span>
            )}
            {/* Top-left: stacked badges */}
            <div style={{ position: "absolute", top: 18, left: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              {(item.layer === "drop" || (isShelf && dropIsLive)) && (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: D.font, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", padding: "6px 12px", borderRadius: 999, background: C.ink, color: "#fff" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: "0 0 0 3px " + C.green + "40", animation: "pulseGreen 2s infinite" }}/>
                  LIVE DROP
                </span>
              )}
              {showShelfTag && (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: D.font, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", padding: "6px 12px", borderRadius: 999, background: C.amber, color: "#fff" }}>
                  <Package size={11}/> ON THE SHELF
                </span>
              )}
              {item.priceDrop && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: D.font, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", padding: "5px 11px", borderRadius: 999, background: C.claret, color: "#fff" }}>
                  <TrendingDown size={11}/> PRICE DROP
                </span>
              )}
            </div>
            {/* Top-right: watchers */}
            {item.watchers && (
              <div style={{ position: "absolute", top: 18, right: 18, display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(6px)", border: "1px solid " + C.fawn }}>
                <Eye size={12} style={{ color: C.mink }}/>
                <span style={{ fontFamily: D.font, fontSize: 12, fontWeight: 700, color: C.ink }}>{item.watchers} watching</span>
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
                      borderRadius: 10,
                      // The active thumb is marked by its border alone — the
                      // coloured glow it used to carry was the loudest thing
                      // on the page.
                      border:       isActive ? `2px solid ${accent}` : `1px solid ${C.fawn}`,
                      boxShadow:    "none",
                      padding:      0,
                      background:   C.paper,
                      overflow:     "hidden",
                      cursor:       "pointer",
                      transition:   "border-color 150ms",
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
            <div style={{ padding: "16px 12px", borderRadius: 12, background: C.paper, border: "1px solid " + C.fawn, textAlign: "center" }}>
              <Shield size={16} style={{ color: accent, margin: "0 auto 6px", display: "block" }}/>
              <p style={{ fontFamily: D.font, fontSize: 10.5, fontWeight: 500, color: C.ash, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 5 }}>Condition</p>
              <p style={{ fontFamily: D.font, fontSize: 14, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>{item.condition}</p>
            </div>
            <div style={{ padding: "16px 12px", borderRadius: 12, background: C.paper, border: "1px solid " + C.fawn, textAlign: "center" }}>
              <MapPin size={16} style={{ color: accent, margin: "0 auto 6px", display: "block" }}/>
              <p style={{ fontFamily: D.font, fontSize: 10.5, fontWeight: 500, color: C.ash, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 5 }}>Distance</p>
              <p style={{ fontFamily: D.font, fontSize: 14, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>{seller.dist || seller.neighbourhood || "Nearby"}</p>
            </div>
            <div style={{ padding: "16px 12px", borderRadius: 12, background: C.paper, border: "1px solid " + C.fawn, textAlign: "center" }}>
              {item.layer === "drop" ? <Clock size={16} style={{ color: accent, margin: "0 auto 6px", display: "block" }}/> : <Package size={16} style={{ color: accent, margin: "0 auto 6px", display: "block" }}/>}
              <p style={{ fontFamily: D.font, fontSize: 10.5, fontWeight: 500, color: C.ash, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 5 }}>
                {item.layer === "drop" ? "Claim ends" : "Listed"}
              </p>
              <p style={{ fontFamily: D.font, fontSize: 14, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>
                {item.layer === "drop" ? (item.timeLeft || "This weekend") : listedAgoLabel(item)}
              </p>
            </div>
            <div style={{ padding: "16px 12px", borderRadius: 12, background: C.paper, border: "1px solid " + C.fawn, textAlign: "center" }}>
              {/* Money icons throughout — a bare checkmark read as "payment
                  confirmed" rather than "this is how you pay". */}
              {(item.paymentMethod === "cash") ? <DollarSign size={16} style={{ color: accent, margin: "0 auto 6px", display: "block" }}/> : (item.paymentMethod === "etransfer") ? <Banknote size={16} style={{ color: accent, margin: "0 auto 6px", display: "block" }}/> : <Wallet size={16} style={{ color: accent, margin: "0 auto 6px", display: "block" }}/>}
              <p style={{ fontFamily: D.font, fontSize: 10.5, fontWeight: 500, color: C.ash, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 5 }}>Payment</p>
              <p style={{ fontFamily: D.font, fontSize: 14, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>
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
              <div style={{ padding: "20px 28px", borderRadius: 16, background: C.paper, border: "1px solid " + C.fawn, marginBottom: 16 }}>
                <h3 style={{ fontFamily: D.font, fontSize: 15, fontWeight: 600, color: C.mink, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Pickup availability</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: C.greenMist, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Calendar size={16} style={{ color: C.greenDeep }}/>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: D.font, fontSize: 10, fontWeight: 600, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Days</p>
                      <p style={{ fontFamily: D.font, fontSize: 14, fontWeight: 600, color: C.ink }}>{pickup.days}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: C.amberMist, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Clock size={16} style={{ color: C.amberDeep }}/>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: D.font, fontSize: 10, fontWeight: 600, color: C.ash, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Time windows</p>
                      <p style={{ fontFamily: D.font, fontSize: 14, fontWeight: 600, color: C.ink }}>{pickup.windows}</p>
                    </div>
                  </div>
                </div>
                <p style={{ fontFamily: D.font, fontSize: 11, fontWeight: 500, color: C.ash, marginTop: 12, lineHeight: 1.5, fontStyle: "italic" }}>
                  Exact pickup time and address are confirmed once you claim the item.
                </p>
              </div>
            );
          })()}

          {/* About this item */}
          <div style={{ padding: "24px 28px", borderRadius: 16, background: C.paper, border: "1px solid " + C.fawn, marginBottom: 24 }}>
            <h3 style={{ fontFamily: D.font, fontSize: 15, fontWeight: 600, color: C.mink, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>About this item</h3>
            <p style={{ fontFamily: D.font, fontSize: 15, fontWeight: 500, color: C.ink, lineHeight: 1.7 }}>{item.description}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <span style={{ fontFamily: D.font, fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 999, background: C.greenMist, color: C.greenDeep }}>{item.category}</span>
              <span style={{ fontFamily: D.font, fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 999, background: C.sand, color: C.mink, border: "1px solid " + C.fawn }}>{item.condition}</span>
              {item.saves > 10 && <span style={{ fontFamily: D.font, fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 999, background: C.claretMist, color: C.claret, display: "flex", alignItems: "center", gap: 4 }}><Heart size={11} fill={C.claret}/> {item.saves} saves</span>}
            </div>
          </div>

          {/* Questions & Answers */}
          <div style={{ padding: "24px 28px", borderRadius: 16, background: C.paper, border: "1px solid " + C.fawn }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontFamily: D.font, fontSize: 15, fontWeight: 600, color: C.mink, letterSpacing: "0.1em", textTransform: "uppercase" }}>Questions & Answers</h3>
              <span style={{ fontFamily: D.font, fontSize: 11, fontWeight: 700, color: C.ash, padding: "3px 10px", borderRadius: 999, background: C.sand, border: "1px solid " + C.fawn }}>
                {questions.length} {questions.length === 1 ? "question" : "questions"}
              </span>
            </div>

            {questionsLoading ? (
              <div style={{ textAlign: "center", padding: "20px 10px" }}>
                <p style={{ fontFamily: D.font, fontSize: 13, fontWeight: 600, color: C.ash }}>Loading questions…</p>
              </div>
            ) : questions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 10px", color: C.ash }}>
                <MessageCircle size={24} style={{ color: C.smoke, marginBottom: 8 }}/>
                <p style={{ fontFamily: D.font, fontSize: 13, fontWeight: 600, color: C.mink, marginBottom: 14 }}>No questions yet — be the first to ask.</p>
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
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: avatarBg(askerName), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: D.font, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                          {askerName.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: D.font, fontSize: 12, fontWeight: 700, color: C.ink }}>{askerName}</span>
                            {qa.isMine && (
                              <span style={{ fontFamily: D.font, fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: C.greenMist, color: C.greenDeep, letterSpacing: "0.05em" }}>YOU</span>
                            )}
                            <span style={{ fontFamily: D.font, fontSize: 10, fontWeight: 600, color: C.ash }}>· {relativeTimeShort(qa.createdAt)}</span>
                          </div>
                          <p style={{ fontFamily: D.font, fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.5 }}>{qa.body}</p>
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
                              <span style={{ fontFamily: D.font, fontSize: 12, fontWeight: 700, color: accent }}>Seller</span>
                              <span style={{ fontFamily: D.font, fontSize: 10, fontWeight: 600, color: C.ash }}>· {relativeTimeShort(qa.answeredAt)}</span>
                            </div>
                            <p style={{ fontFamily: D.font, fontSize: 13, fontWeight: 500, color: C.mink, lineHeight: 1.6 }}>{qa.answer}</p>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 10, borderLeft: "2px solid " + C.fawn }}>
                          <Clock size={13} style={{ color: C.ash, flexShrink: 0 }}/>
                          <p style={{ fontFamily: D.font, fontSize: 12, fontWeight: 600, color: C.ash, lineHeight: 1.5 }}>Awaiting the seller&apos;s answer.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!isMyOwnItem && (
              <button onClick={() => setShowAsk(true)} className="cta-primary" style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "1px solid " + C.fawn, background: C.paper, color: C.ink, fontFamily: D.font, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <MessageCircle size={14}/> Ask a question
              </button>
            )}
          </div>
        </div>

        {/* Purchase panel — one surface holding the title, price, seller and
            the actions, rather than four free-floating blocks. It's the only
            element on the page carrying a shadow, and a light one. */}
        <div style={{ position: "sticky", top: 120, background: C.paper, border: D.border, borderRadius: 16, boxShadow: D.shadow, padding: isMobile ? 20 : 24 }}>
          {showShelfTag && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: D.font, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.amberDeep, padding: "5px 11px", background: C.amberMist, borderRadius: 999, marginBottom: 14 }}>
              <Package size={12}/> On the Shelf
            </span>
          )}

          {/* Geist carries a lot of weight at 800; 900 turns the title into a
              slab. Tighter tracking does the "confident" work instead. */}
          <h1 style={{ fontFamily: D.font, fontSize: isMobile ? 26 : 30, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em", lineHeight: 1.18, marginBottom: 12 }}>{item.title}</h1>

          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 22 }}>
            <span style={{ fontFamily: D.font, fontSize: isMobile ? 34 : 40, fontWeight: 700, color: priceColor(item.price, accent), letterSpacing: "-0.03em" }}>{priceText(item.price)}</span>
            {item.origPrice && <span style={{ fontFamily: D.font, fontSize: 17, fontWeight: 500, color: C.ash, textDecoration: "line-through" }}>${item.origPrice}</span>}
            {discount && <span style={{ fontFamily: D.font, fontSize: 12, fontWeight: 600, color: C.amberDeep, background: C.amberMist, padding: "3px 10px", borderRadius: 8 }}>Save {discount}%</span>}
          </div>

          {/* Seller row — inside the panel now, so it's a divider-separated
              row rather than a card nested in a card. */}
          <button onClick={() => onViewSeller && onViewSeller(seller.name)} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderRadius: 0, border: "none", borderTop: D.border, borderBottom: D.border, background: "transparent", cursor: "pointer", marginBottom: 20 }}
            onMouseEnter={e => { e.currentTarget.style.background = C.sand; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: avatarBg(seller.name), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: D.font, fontSize: 15, fontWeight: 600, flexShrink: 0 }}>
              {initialsOf(seller.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: D.font, fontSize: 14, fontWeight: 600, color: C.ink }}>{seller.name}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                <span style={{ fontFamily: D.font, fontSize: 11, fontWeight: 700, color: C.mink, display: "flex", alignItems: "center", gap: 3 }}><MapPin size={10}/> {seller.neighbourhood} · {seller.dist}</span>
                {seller.rating && <span style={{ fontFamily: D.font, fontSize: 11, fontWeight: 700, color: C.amberDeep, display: "flex", alignItems: "center", gap: 3 }}><Star size={10} fill={C.amber} strokeWidth={0}/> {seller.rating}</span>}
              </div>
            </div>
            {true && (
              <span style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 12px", borderRadius:999, background:C.greenMist, color:C.greenDeep, fontFamily:D.font, fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>View profile <ChevronRight size={12}/></span>
            )}
          </button>


          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {isMyOwnItem ? (
              // Self-ownership safety net — see BUG-050. Surface the right
              // affordance instead of giving the seller buttons they can't
              // actually use.
              <>
                <div style={{ padding: 14, borderRadius: 14, border: "1px solid " + C.amber + "55", background: C.amberMist }}>
                  <p style={{ fontFamily: D.font, fontSize: 13, fontWeight: 600, color: C.amberDeep, marginBottom: 4 }}>This is your listing</p>
                  <p style={{ fontFamily: D.font, fontSize: 12, fontWeight: 600, color: C.mink, lineHeight: 1.5 }}>
                    You can&apos;t claim or message yourself. Manage edits, photos, and price in the Seller view.
                  </p>
                </div>
                {onSwitchRole && (
                  <button onClick={onSwitchRole} className="cta-primary" style={{ padding: "13px 0", borderRadius: 12, border: "none", background: accent, color: "#fff", fontFamily: D.font, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
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
                  const label = item.status === "claimed"
                    ? "Already claimed"
                    : item.status === "preview"
                      ? "Claims open " + dropOpenDay() + " " + dropOpenHour()
                      : (isShelf ? "Claim at $" + item.price : "Claim this item");
                  return (
                    <button onClick={() => setShowClaim(true)} disabled={notClaimable} className="cta-primary" style={{ padding: "15px 0", borderRadius: 12, border: "none", background: notClaimable ? C.fawn : accent, color: notClaimable ? C.ash : "#fff", fontFamily: D.font, fontSize: 15, fontWeight: 650, cursor: notClaimable ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                      {item.status === "preview" ? <><Clock size={17}/> {label}</> : label}
                    </button>
                  );
                })()}

                {/* The offer hint belongs directly under the claim CTA — it
                    describes what happens inside that flow, so it reads with
                    the button instead of trailing the whole stack.

                    It used to be gated on `isShelf`, which hid it on every
                    Drop item. ClaimModal's "Make a different offer" option has
                    no layer gate, and neither does the backend —
                    POST /api/items/:id/claim takes an optional `amount` for any
                    item — so the hint was true on a Drop listing too and just
                    wasn't being shown. Only the "sellers often flex on Shelf
                    prices" half was Shelf-specific, so that clause now swaps
                    for a neutral one off the Shelf. */}
                {!notClaimable && (
                  <p style={{ fontFamily: D.font, fontSize: 11, fontWeight: 600, color: C.ash, textAlign: "center" }}>
                    {showShelfTag
                      ? "Or make an offer during claim — sellers often flex on Shelf prices."
                      : "Or make an offer during claim — you can propose your own price."}
                  </p>
                )}

                {/* Secondary row: Save + Ask */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={toggleSave} style={{ padding: "11px 0", borderRadius: 12, border: "1px solid " + (saved ? C.claret : C.fawn), background: saved ? C.claretMist : C.paper, color: saved ? C.claret : C.mink, fontFamily: D.font, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Heart size={14} fill={saved ? C.claret : "none"}/> {saved ? "Saved" : "Save"}
                  </button>
                  <button onClick={() => setShowAsk(true)} style={{ padding: "11px 0", borderRadius: 12, border: "1px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: D.font, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <MessageCircle size={14}/> Ask
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {showClaim && <ClaimModal item={item} onClose={() => setShowClaim(false)} onConfirm={handleClaimConfirm} accessToken={accessToken} onGoToMessages={onGoToMessages} onClaimCreated={onClaimCreated}/>}
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
function RegularSellerProfile({ sellerName, onBack, onSelect, onClaimNow, savedIds, onToggleSave, itemsSource = null, state = "between", currentUserId = null, onSwitchRole = null }) {
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
          {items.map((i, idx) => <ItemCard key={i.id} item={i} saved={savedIds.has(i.id)} onToggleSave={onToggleSave} onOpen={() => onSelect(toDetailItem(i))} onClaimNow={() => onClaimNow && onClaimNow(toDetailItem(i))} index={idx} liveMode={state === "live"} isOwn={!!currentUserId && i.sellerId === currentUserId} onSwitchRole={onSwitchRole}/>)}
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
function SavedPage({ savedIds, savedItems = null, onSelect, onClaimNow, onToggleSave, onBrowse, onBack, claimedIds = new Set(), purchasedIds = new Set(), offeredIds = new Set(), itemsSource = null, state = "between", currentUserId = null, onSwitchRole = null, answeredIds = new Set() }) {
  // Authed users render directly from the watchlist API result (full Item
  // objects, including SOLD ones + ones the user owns themselves). Preview
  // mode falls back to filtering the demo pool by savedIds — the original
  // behaviour preserved for /preview/buyer-dashboard.
  const items = Array.isArray(savedItems)
    ? savedItems
    : (Array.isArray(itemsSource) ? itemsSource : allItems).filter(i => savedIds.has(i.id));
  return (
    <>
      <PageBar onBack={onBack} title="Saved items" chipIcon={Heart} chip={items.length + " saved item" + (items.length !== 1 ? "s" : "")}/>
      {items.length === 0 ? (
        <EmptyState illustration={<EmptySavedIllustration/>} title="Nothing saved yet" message="Tap the heart on items you’re interested in — they’ll gather here so you can claim them when the Drop opens." cta="Browse Discover" onCtaClick={onBrowse} accent={C.amber}/>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
          {items.map((i, idx) => <ItemCard key={i.id} item={i} saved={true} onToggleSave={onToggleSave} onOpen={() => onSelect(toDetailItem(i))} onClaimNow={() => onClaimNow && onClaimNow(toDetailItem(i))} index={idx} liveMode={state === "live"} claimedByMe={claimedIds.has(i.id)} purchasedByMe={purchasedIds.has(i.id)} offerPending={offeredIds.has(i.id)} answerReady={answeredIds.has(i.id)} isOwn={!!currentUserId && i.sellerId === currentUserId} onSwitchRole={onSwitchRole}/>)}
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
    flash(claim.status === "offer-pending"
      ? "Claim on " + claim.t + " waived. Item released."
      : "Claim on " + claim.t + " cancelled. Item released.");
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
  // "completed" is already one of stageInfo's statuses — a claim sits here
  // until the buyer confirms receipt, so the count was derivable all along
  // and the row was just three cards wide.
  const completedCount = claims.filter(c => c.status === "completed").length;

  const stats = [
    { label: "Pickup today",   value: todayCount,     icon: Clock,       color: C.claret,    bg: C.claretMist, urgent: todayCount > 0 },
    { label: "Scheduled",      value: scheduledCount, icon: Calendar,    color: C.greenDeep, bg: C.greenMist,  urgent: false },
    { label: "Offer pending",  value: pendingCount,   icon: RefreshCw,   color: C.amberDeep, bg: C.amberMist,  urgent: false },
    { label: "Completed",      value: completedCount, icon: Star,        color: C.greenDeep, bg: C.greenMist,  urgent: false },
  ];

  return (
    <>
      <PageBar onBack={onBack} title="Pickups & offers" chip={claims.length + " active claim" + (claims.length !== 1 ? "s" : "")}/>

      {/* Success toast */}
      {toast && (
        <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: C.greenMist, border: "1px solid " + C.green + "30", marginBottom: 18 }}>
          <CheckCircle size={17} style={{ color: C.greenDeep, flexShrink: 0 }}/>
          <p style={{ fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.greenDeep, flex: 1 }}>{toast}</p>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: C.mink, display: "flex" }}><X size={14}/></button>
        </div>
      )}

      {/* Stats grid — four across, 2×2 on mobile. Same template as History's
          row so the two pages' stat strips line up instead of drifting. */}
      <div style={{ display: "grid", gridTemplateColumns: __isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: __isMobile ? 10 : 14, marginBottom: __isMobile ? 16 : 22 }}>
        {stats.map((s, i) => {
          const Ic = s.icon;
          return (
            <div key={i} className="fade-in" style={{ padding: "20px 22px", borderRadius: 18, background: s.urgent ? s.bg : C.paper, border: "1px solid " + (s.urgent ? s.color + "40" : C.fawn), animationDelay: (i * 40) + "ms", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ic size={23} strokeWidth={2.1} style={{ color: s.color }}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: F.head, fontSize: 33, fontWeight: 900, color: s.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.mink, marginTop: 5 }}>{s.label}</p>
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
              <article key={c.id} className="fade-in" style={{ padding: "20px 24px", borderRadius: 20, background: c.status === "pickup-overdue" ? C.amberMist : (urgent ? "#FFF5F5" : C.paper), border: "1px solid " + (highlightId === c.id ? C.green : c.status === "pickup-overdue" ? C.amber + "40" : urgent ? C.claret + "40" : C.fawn), boxShadow: highlightId === c.id ? "0 0 0 4px " + C.greenMist + ", 0 8px 24px rgba(48,132,36,0.18)" : "none", transition: "box-shadow 200ms, border-color 200ms", animationDelay: (idx * 50) + "ms" }}>
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

                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ width: 104, height: 104, borderRadius: 18, background: "linear-gradient(135deg, " + C.sand + ", " + C.fawn + ")", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                    <ItemImage src={c.img || c.e} emojiSize={52}/>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
                      <h3 style={{ fontFamily: F.head, fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: "-0.015em" }}>{c.t}</h3>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.head, fontSize: 13, fontWeight: 800, padding: "5px 13px", borderRadius: 999, background: stage.bg, color: stage.color, letterSpacing: "0.02em" }}>
                        <StageIcon size={13}/> {stage.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: F.head, fontSize: 28, fontWeight: 900, color: priceColor(c.price, C.green), letterSpacing: "-0.02em" }}>{priceText(c.price)}</span>
                      <span style={{ fontFamily: F.head, fontSize: 15, fontWeight: 600, color: C.mink, display: "flex", alignItems: "center", gap: 5 }}>
                        <User size={14}/> {c.seller}
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
                      <>
                        {/* "Waiting for seller…" read as a clipped string —
                            the ellipsis was literal text, not overflow. Full
                            wording now, outlined rather than filled, with the
                            chevron the design puts on it. Still a span: it was
                            never clickable and that hasn't changed. */}
                        <span style={{ fontFamily: F.head, fontSize: 15, fontWeight: 700, color: C.amberDeep, padding: "12px 18px", background: C.paper, borderRadius: 999, border: "1.5px solid " + C.amber + "66", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                          <Clock size={16}/> Waiting for seller response
                          <ChevronRight size={16} style={{ opacity: 0.75 }}/>
                        </span>
                        {/* Waive — the buyer's way out while the offer is still
                            with the seller. Without it the only exits were the
                            seller answering or the 36-hour expiry, which left a
                            listed-price claim holding the item RESERVED against
                            a buyer who had already moved on. Same confirm modal
                            and same PATCH /cancel as a scheduled pickup. */}
                        <button onClick={() => setCancelTarget(c)} title="Release this claim so other neighbours can take the item" style={{ padding: "12px 18px", borderRadius: 999, border: "1.5px solid " + C.claret + "40", background: C.paper, color: C.claret, fontFamily: F.head, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
                          <X size={16}/> Waive item
                        </button>
                      </>
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
            {/* Same modal serves both exits — waiving an offer the seller
                hasn't answered yet, and cancelling a pickup that's already
                scheduled. Only the copy differs; the 2-hour courtesy note has
                nothing to say when no pickup has been agreed. */}
            <h3 style={{ fontFamily: F.head, fontSize: 20, fontWeight: 900, color: C.ink, marginBottom: 8 }}>
              {cancelTarget.status === "offer-pending" ? "Waive this item?" : "Cancel this claim?"}
            </h3>
            <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.mink, lineHeight: 1.55, marginBottom: 18 }}>
              Your claim on <b style={{ color: C.ink }}>{cancelTarget.t}</b> will be released so another neighbour can claim it. The seller will be notified.
            </p>
            <div style={{ padding: 12, borderRadius: 12, background: C.amberMist, border: "1px solid " + C.amber + "30", marginBottom: 18, display: "flex", alignItems: "center", gap: 9 }}>
              <Info size={14} style={{ color: C.amberDeep, flexShrink: 0 }}/>
              <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.amberDeep, lineHeight: 1.5 }}>
                {cancelTarget.status === "offer-pending"
                  ? "Your offer is withdrawn and the item goes back on the listing. You can claim it again later if nobody else does."
                  : "Please cancel at least 2 hours before your scheduled pickup."}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setCancelTarget(null)} style={{ padding: "11px 18px", borderRadius: 12, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Keep claim</button>
              <button onClick={() => cancelClaim(cancelTarget)} style={{ padding: "11px 18px", borderRadius: 12, border: "none", background: C.claret, color: "#fff", fontFamily: F.head, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                {cancelTarget.status === "offer-pending" ? "Waive item" : "Cancel claim"}
              </button>
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

// Emoji offered in the composer tray. Deliberately a short, pickup-shaped
// set rather than a full picker: these threads are about agreeing a price and
// a time, so the useful ones are acknowledgements, money, and logistics.
const COMPOSER_EMOJI = [
  "👍", "🙏", "😊", "😁", "😂", "❤️", "🔥", "🎉",
  "✅", "👌", "🤝", "🙌", "👋", "😅", "🤔", "😬",
  "💰", "📦", "🚗", "⏰", "📍", "📸", "❓", "⭐",
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
  // Accepts an updater as well as a value, the way a real useState setter
  // does. It didn't, and `setDraft(d => d + emoji)` stored the function
  // itself as the draft — the next render then called draft.trim() on a
  // function and the thread crashed. Anything shaped like a state setter has
  // to honour the functional form or every caller has to remember it can't.
  const setDraft = (value) => setDrafts(d => ({
    ...d,
    [activeId]: typeof value === "function" ? value(d[activeId] || "") : value,
  }));
  const [sending, setSending]           = useState(false);
  const [errorMsg, setErrorMsg]         = useState(null);
  const [successMsg, setSuccessMsg]     = useState(null);
  // Inline "Make an offer" composer inside the chat. Lets the buyer send an
  // OFFER message without leaving the conversation. Opens with a numeric
  // input + Send/Cancel; submits via POST /messages with messageType OFFER.
  const [offerComposerOpen, setOfferComposerOpen] = useState(false);
  // Attachment upload. `attachBusy` disables the composer while the file is
  // in flight so a second pick can't race the first.
  const fileInputRef = useRef(null);
  const [attachBusy, setAttachBusy] = useState(false);
  // Emoji tray above the composer. Closes on pick, on Escape, and whenever
  // the thread changes — leaving it hanging open over a different
  // conversation is worse than making the buyer tap twice.
  const [emojiOpen, setEmojiOpen] = useState(false);
  useEffect(() => { setEmojiOpen(false); }, [activeId]);
  useEffect(() => {
    if (!emojiOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setEmojiOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [emojiOpen]);
  const [offerComposerAmt, setOfferComposerAmt]   = useState("");

  // BUG-055 — active claims for buyer's conversations (PROPOSED + ACCEPTED).
  // Powers the in-chat action banner so the buyer can Accept/Counter/Decline
  // a seller's counter, or Confirm receipt once accepted.
  const [activeClaimByConv, setActiveClaimByConv]   = useState({});
  // The CURRENT claim per conversation whatever its status — including the
  // terminal ones activeClaimByConv deliberately drops. The thread badge has
  // to follow this: a cancelled claim left the badge reading "Pending", which
  // says the buyer is still waiting on the seller when the claim is gone.
  const [latestClaimByConv, setLatestClaimByConv]   = useState({});
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
        const latest = {};
        for (const c of list) {
          if (!c.conversationId) continue;
          // /api/claims/mine comes back newest-first, so the first claim seen
          // for a conversation is the one that counts.
          if (!latest[c.conversationId]) latest[c.conversationId] = c;
          if (c.status === "PROPOSED" || c.status === "ACCEPTED") {
            idx[c.conversationId] = c;
          }
        }
        setActiveClaimByConv(idx);
        setLatestClaimByConv(latest);
      })
      .catch(() => { if (!cancelled) { setActiveClaimByConv({}); setLatestClaimByConv({}); } });
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

  // ─── Archived threads ────────────────────────────────────────────────────
  // Archiving had no destination: the button set `archivedByBuyer` and the
  // inbox filtered those threads out, but nothing listed them, so a thread
  // the buyer put away was simply gone — not in Messages, not in History.
  // GET /api/conversations?archived=true is the other half of that flag, and
  // this list is what the "Archived" group at the bottom of the inbox renders
  // from. Separate from `convList` on purpose: the nav badge and the "N
  // active threads" count describe the live inbox, and archived threads are
  // deliberately not part of either.
  const [archivedList, setArchivedList]       = useState([]);
  const [showArchived, setShowArchived]       = useState(false);
  const [archivedLoading, setArchivedLoading] = useState(false);
  useEffect(() => {
    if (!usingBackend) { setArchivedList([]); return; }
    let cancelled = false;
    setArchivedLoading(true);
    apiRequest("/api/conversations?archived=true", { token: accessToken })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.conversations) ? data.conversations : [];
        setArchivedList(list.map((api) => adaptBuyerConversation(api, myId)).filter(Boolean));
      })
      .catch(() => { if (!cancelled) setArchivedList([]); })
      .finally(() => { if (!cancelled) setArchivedLoading(false); });
    return () => { cancelled = true; };
  }, [usingBackend, accessToken, myId]);

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
      TEXT: "text", IMAGE: "image", OFFER: "offer", COUNTER: "counter", CLAIM: "claim",
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
      // Fall back to an image bubble whenever a row carries an attachment,
      // even if its messageType says TEXT — a picture with no <img> renders
      // as an empty bubble, which is the worse failure.
      attachmentUrl: typeof api.attachmentUrl === "string" ? api.attachmentUrl : undefined,
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
  }, [activeId, usingBackend, accessToken, threadTick]);

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
      // Opening a thread clears its unread state. It must NOT touch `status`:
      // that says who spoke last, and reading a message doesn't answer it —
      // a thread where the buyer is still waiting stays "Pending" after they
      // open it.
      setConvList(prev => prev.map(c => c.id === activeId
        ? { ...c, unread: false, unreadCount: 0 }
        : c));
    }
  });

  // Pick → upload → send, as two requests: POST /api/uploads/s3 stores the
  // file and hands back a public URL, then the usual message POST carries that
  // URL as `attachmentUrl`. Whatever is already typed rides along as the
  // caption, so attaching never silently discards a draft.
  async function handleAttach(file) {
    if (!file || !activeId) return;
    if (!usingBackend) {
      setErrorMsg("Attachments need a signed-in session.");
      return;
    }
    // Mirrors the upload route's own filter (jpg/png/webp/gif, 10 MB) so the
    // buyer hears about a bad file before spending the round trip on it.
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      setErrorMsg("Only jpg, png, webp or gif images can be attached.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("That image is over 10 MB — please attach a smaller one.");
      return;
    }
    setErrorMsg(null);
    setAttachBusy(true);
    try {
      const { publicUrl } = await uploadItemPhoto(file);
      const caption = draft.trim();
      const res = await apiRequest("/api/conversations/" + encodeURIComponent(activeId) + "/messages", {
        method: "POST",
        token:  accessToken,
        body:   JSON.stringify({ body: caption, messageType: "IMAGE", attachmentUrl: publicUrl }),
      });
      setDraft("");
      // Same reason as handleSend: append from the POST response rather than
      // waiting on the socket echo, which the handler dedupes by id anyway.
      if (res?.message) {
        setActiveMsgs((prev) => {
          const list = prev || [];
          if (list.some((m) => m.id === res.message.id)) return list;
          return [...list, adaptMessage(res.message)];
        });
      }
    } catch (err) {
      setErrorMsg("Couldn't attach that image: " + (err?.message || "try again"));
    } finally {
      setAttachBusy(false);
    }
  }

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
      const res = await apiRequest("/api/conversations/" + encodeURIComponent(activeId) + "/messages", {
        method: "POST",
        token:  accessToken,
        body:   JSON.stringify({ body }),
      });
      setDraft("");
      // Append from the POST response instead of waiting for the socket echo.
      // Same reason as the seller side: the echo fires, but a message that is
      // only ever rendered by a socket event is invisible whenever that event
      // is missed — saved on the server, absent from the thread until a
      // refetch. The socket handler dedupes on id, so the echo is a no-op.
      if (res?.message) {
        setActiveMsgs((prev) => {
          const list = prev || [];
          if (list.some((m) => m.id === res.message.id)) return list;
          return [...list, adaptMessage(res.message)];
        });
      }
      // Writing into an archived thread un-archives the sender's side server
      // side, so mirror that here instead of leaving the row sitting under
      // "Archived" with a message the buyer just sent as its preview.
      const archived = archivedList.find(c => c.id === activeId);
      if (archived) {
        setArchivedList(prev => prev.filter(c => c.id !== activeId));
        setConvList(prev => (prev.some(c => c.id === activeId) ? prev : [archived, ...prev]));
      }
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
    "cancelled":         { label: "Cancelled",         color: C.ash,       bg: C.sand,        icon: X          },
    "expired":           { label: "Expired",           color: C.ash,       bg: C.sand,        icon: Clock      },
    "completed":         { label: "Completed",         color: C.ash,       bg: C.sand,        icon: Check      },
  };

  // The badge has to read off the claim, not just off who spoke last.
  // `c.status` is only "pending" (I spoke last) / "answered" (they did), which
  // is fine while a negotiation is live but wrong the moment the claim ends:
  // a waived claim kept showing "Pending", i.e. "waiting on the seller", on a
  // thread that is finished. A terminal claim overrides; anything still live
  // falls through to the who-spoke-last reading.
  const threadStatus = useCallback((c) => {
    if (!c) return "completed";
    switch (latestClaimByConv[c.id]?.status) {
      case "CANCELLED":                 return "cancelled";
      case "DECLINED": case "REJECTED": return "declined";
      case "EXPIRED":                   return "expired";
      case "PICKED_UP":                 return "completed";
      default:                          return c.status;
    }
  }, [latestClaimByConv]);

  const unreadCount = conversations.filter(c => c.unread).length;

  // ─── Active vs Earlier ───────────────────────────────────────────────────
  // "7 active threads" used to mean "7 threads exist" — it counted months-old
  // threads whose claims had auto-expired, so the number said nothing about
  // what the buyer was actually dealing with. A thread is active when:
  //   · it has a live claim (PROPOSED / ACCEPTED) — a negotiation or an agreed
  //     pickup is live business however old the thread is, so age never
  //     retires it;
  //   · something in it is unread — never hide a message the buyer hasn't
  //     seen; or
  //   · it's had a message inside ACTIVE_WINDOW_DAYS.
  // Everything else is history: still one click away under "Earlier", but out
  // of the count and out of the way.
  const isThreadActive = useCallback((c) => {
    if (!c) return false;
    if (c.unread || (c.unreadCount || 0) > 0) return true;
    if (activeClaimByConv[c.id]) return true;
    // Demo conversations carry no timestamp. Unknown age → leave it active
    // rather than silently burying it.
    if (!c.lastMessageAt) return true;
    return isWithinActiveWindow(c.lastMessageAt);
  }, [activeClaimByConv]);

  const { activeThreads, earlierThreads } = useMemo(() => {
    const act = [], earlier = [];
    for (const c of conversations) (isThreadActive(c) ? act : earlier).push(c);
    return { activeThreads: act, earlierThreads: earlier };
  }, [conversations, isThreadActive]);

  // Thread search. Purely client-side over the conversations already loaded —
  // it filters which rows are drawn and nothing else. The inbox counts in the
  // header chip deliberately keep reporting the whole inbox rather than the
  // match count, so searching doesn't look like threads disappeared.
  const [threadQuery, setThreadQuery] = useState("");
  const searching = threadQuery.trim().length > 0;
  const matchesQuery = useCallback((c) => {
    const q = threadQuery.trim().toLowerCase();
    if (!q) return true;
    return [c?.item?.title, c?.seller?.name, c?.lastMsg]
      .some((field) => typeof field === "string" && field.toLowerCase().includes(q));
  }, [threadQuery]);

  const [showEarlier, setShowEarlier] = useState(false);
  // Opening an older thread (e.g. from the Claims tab or History) must not
  // leave the selection hidden inside a collapsed group.
  useEffect(() => {
    if (activeId && earlierThreads.some(c => c.id === activeId)) setShowEarlier(true);
  }, [activeId, earlierThreads]);

  const inboxSubtitle = [
    unreadCount > 0 ? unreadCount + " unread" : null,
    activeThreads.length + " active thread" + (activeThreads.length !== 1 ? "s" : ""),
    earlierThreads.length > 0 ? earlierThreads.length + " earlier" : null,
  ].filter(Boolean).join(" · ");

  // Move a thread out of the inbox and into the Archived group below it.
  // Not a delete and not one-way: it reappears here the moment either side
  // writes into it (the backend clears the flag on send), and the buyer can
  // bring it back by hand with Unarchive.
  async function archiveThread(conv) {
    if (!conv) return;
    const wasActive = conv.id === activeId;
    setConvList(prev => prev.filter(c => c.id !== conv.id));
    setArchivedList(prev => (prev.some(c => c.id === conv.id) ? prev : [conv, ...prev]));
    if (wasActive) { setActiveId(null); setMobileViewingId(null); }
    if (!usingBackend) return;
    try {
      await apiRequest("/api/conversations/" + encodeURIComponent(conv.id) + "/archive", {
        method: "PATCH",
        token:  accessToken,
        body:   JSON.stringify({ archived: true }),
      });
      chatFlashOk("Moved to Archived, at the bottom of this list.");
    } catch (err) {
      // Put it back — the row vanishing while the server still has it would
      // be a lie that survives until the next refetch.
      setConvList(prev => (prev.some(c => c.id === conv.id) ? prev : [conv, ...prev]));
      setArchivedList(prev => prev.filter(c => c.id !== conv.id));
      if (wasActive) setActiveId(conv.id);
      chatFlashErr("archive", err);
    }
  }

  // The way back. Same endpoint, `archived: false`.
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
      chatFlashOk("Back in your inbox.");
    } catch (err) {
      setArchivedList(prev => (prev.some(c => c.id === conv.id) ? prev : [conv, ...prev]));
      setConvList(prev => prev.filter(c => c.id !== conv.id));
      chatFlashErr("unarchive", err);
    }
  }
  // Selection can land on an archived thread — opening one is how you read it
  // before deciding to bring it back — so resolve against both lists.
  const activeIsArchived = archivedList.some(c => c.id === activeId);
  const active = conversations.find(c => c.id === activeId)
    || archivedList.find(c => c.id === activeId)
    || conversations[0];
  const activeStatus = active ? (statusMeta[threadStatus(active)] || statusMeta.completed) : null;
  // Demo mode reads messages inline from the conversation; wired mode uses
  // the activeMsgs state populated by GET /:id/messages and socket pushes.
  const activeMessages = usingBackend ? (activeMsgs || []) : (active?.messages || []);

  // One inbox row, shared by the Active and Earlier groups. `muted` dims the
  // row so an expanded history reads as background, not as live threads.
  function renderThreadRow(c, muted = false) {
    const isActive = c.id === activeId;
    const meta = statusMeta[threadStatus(c)] || statusMeta.completed;
    const Ic = meta.icon;
    return (
      <button key={c.id} onClick={() => { setActiveId(c.id); setMobileViewingId(c.id); }} style={{ width: "100%", textAlign: "left", padding: "16px 18px", border: "none", borderBottom: "1px solid " + C.fawn, background: isActive && !isMobile ? C.greenMist + "60" : C.paper, cursor: "pointer", display: "flex", gap: 12, position: "relative", opacity: muted && !isActive ? 0.62 : 1 }}>
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
          <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: c.unread ? 700 : 500, color: c.unread ? C.ink : C.mink, marginBottom: muted ? 0 : 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMsg}</p>
          {/* The chip says whose turn it is — meaningless once a thread has
              gone dormant. A six-month-old row badged "Pending" reads as if
              the buyer is still waiting on a reply that is never coming, so
              the Earlier group drops it rather than restating it. */}
          {!muted && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.head, fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: meta.bg, color: meta.color, letterSpacing: "0.04em" }}>
              <Ic size={10}/> {meta.label}
            </span>
          )}
        </div>
      </button>
    );
  }

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

    // Image attachment — a bubble whose content is the picture. Keyed off the
    // URL rather than the type so a row that carries one always renders it.
    // Any caption travels in `text` and sits under the photo.
    if (m.attachmentUrl) {
      return (
        <div key={i} style={{ display: "flex", justifyContent: isYou ? "flex-end" : "flex-start", marginBottom: 10 }}>
          <div style={{ maxWidth: "72%" }}>
            {m.from === "seller" && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4, marginLeft: 2 }}>
                <User size={10} style={{ color: C.mink }}/>
                <span style={{ fontFamily: F.head, fontSize: 10, fontWeight: 700, color: C.mink }}>{active?.seller?.name}</span>
              </div>
            )}
            <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid " + (isYou ? C.green + "55" : C.fawn), background: isYou ? C.greenMist : C.paper }}>
              <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", lineHeight: 0 }}>
                <img
                  src={m.attachmentUrl}
                  alt={m.text ? m.text : "Attached photo"}
                  style={{ display: "block", width: "100%", maxWidth: 300, maxHeight: 300, objectFit: "cover", cursor: "zoom-in" }}
                />
              </a>
              {m.text && (
                <p style={{ padding: "8px 12px", fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.ink, lineHeight: 1.45 }}>{m.text}</p>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: isYou ? "flex-end" : "flex-start", marginTop: 4 }}>
              <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 500, color: C.ash }}>{m.time}</span>
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
      <PageBar onBack={onBack} title="Conversations" chipIcon={MessageCircle} chip={inboxSubtitle}/>

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

      {/* Two cards side by side, not one box split by a divider. The wrapper
          used to carry the border, radius and white fill, with the thread list
          drawing a borderRight as the seam — but it also had a 20px grid gap,
          so that seam floated in the middle of a white field instead of
          sitting between the panels. The border moves onto each panel and the
          gap becomes real space between two cards. */}
      <div style={{
        display: isMobile ? "flex" : "grid",
        flexDirection: isMobile ? "column" : undefined,
        gridTemplateColumns: isMobile ? undefined : "380px 1fr",
        gap: isMobile ? 0 : 20,
        // Was a flat 680px, which on a laptop pushed the composer below the
        // fold — you had to scroll the page to type. Sized off the viewport
        // instead: 290px covers the top bar, the page padding and the PageBar
        // row above, so the composer lands on screen at any window height.
        // Capped at 620 so it doesn't stretch into a letterbox on a tall
        // monitor, floored at 400 so the thread never collapses to a sliver.
        height: isMobile ? "auto" : "clamp(400px, calc(100vh - 290px), 620px)",
        minHeight: isMobile ? "60vh" : undefined,
      }}>
        {/* Thread list — hidden on mobile while a thread is open. */}
        {(!isMobile || !mobileViewingId) && (
        <div style={{
          overflowY: "auto",
          background: C.paper,
          border: "1px solid " + C.fawn,
          borderRadius: isMobile ? 16 : 18,
          height: isMobile ? undefined : "100%",
        }}>
          {/* Search — sticky so it stays reachable while the list scrolls
              under it. */}
          <div style={{ position: "sticky", top: 0, zIndex: 3, padding: 12, background: C.paper, borderBottom: "1px solid " + C.fawn }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", borderRadius: 999, border: "1px solid " + C.fawn, background: C.paper }}>
              <Search size={16} style={{ color: C.ash, flexShrink: 0 }}/>
              <input
                value={threadQuery}
                onChange={(e) => setThreadQuery(e.target.value)}
                placeholder="Search conversations..."
                aria-label="Search conversations"
                style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.ink }}
              />
              {searching && (
                <button onClick={() => setThreadQuery("")} aria-label="Clear search" style={{ border: "none", background: "transparent", color: C.ash, cursor: "pointer", padding: 0, display: "flex", flexShrink: 0 }}>
                  <X size={15}/>
                </button>
              )}
            </div>
          </div>

          {/* `archivedList` counts here too — otherwise archiving your last
              live thread renders "No threads" over an Archived group that
              never gets a chance to draw. */}
          {conversations.length === 0 && archivedList.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <MessageSquare size={28} style={{ color: C.smoke, marginBottom: 10 }}/>
              <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.mink }}>No threads.</p>
            </div>
          ) : (
            <>
              {activeThreads.filter(matchesQuery).map(renderThreadRow)}

              {/* While searching, "no matches" is the honest message — the
                  inbox isn't empty, the query just didn't hit anything. */}
              {searching && activeThreads.filter(matchesQuery).length === 0 && (
                <div style={{ padding: "28px 20px", textAlign: "center" }}>
                  <Search size={24} style={{ color: C.smoke, marginBottom: 8 }}/>
                  <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.mink }}>No matches in your inbox.</p>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, marginTop: 2 }}>
                    Earlier and archived threads are searched too.
                  </p>
                </div>
              )}

              {/* Nothing live, but history exists — say so rather than showing
                  a bare "No threads" over a list that isn't actually empty. */}
              {!searching && activeThreads.length === 0 && (
                <div style={{ padding: "28px 20px", textAlign: "center" }}>
                  <MessageSquare size={24} style={{ color: C.smoke, marginBottom: 8 }}/>
                  <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.mink }}>No active threads.</p>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, color: C.ash, marginTop: 2 }}>
                    Your older conversations are below.
                  </p>
                </div>
              )}

              {/* Earlier — everything with no live claim and no activity in the
                  last ACTIVE_WINDOW_DAYS. Collapsed by default: it's history,
                  so it shouldn't compete with live threads for attention. */}
              {/* A search forces the group open — a match hidden behind a
                  collapsed header reads as "not found". */}
              {earlierThreads.filter(matchesQuery).length > 0 && (
                <>
                  <button
                    onClick={() => setShowEarlier(v => !v)}
                    style={{ width: "100%", textAlign: "left", padding: "11px 18px", border: "none", borderBottom: "1px solid " + C.fawn, background: C.sand, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {(showEarlier || searching) ? <ChevronUp size={14} style={{ color: C.mink }}/> : <ChevronDown size={14} style={{ color: C.mink }}/>}
                    <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Earlier
                    </span>
                    <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.ash, marginLeft: "auto" }}>
                      {earlierThreads.filter(matchesQuery).length} thread{earlierThreads.filter(matchesQuery).length !== 1 ? "s" : ""}
                    </span>
                  </button>
                  {(showEarlier || searching) && earlierThreads.filter(matchesQuery).map(c => renderThreadRow(c, true))}
                </>
              )}

              {/* Archived — threads the buyer put away by hand. Collapsed, at
                  the very bottom, the way WhatsApp and Telegram park theirs.
                  Open one to read it; Unarchive puts it back in the inbox. */}
              {archivedList.filter(matchesQuery).length > 0 && (
                <>
                  <button
                    onClick={() => setShowArchived(v => !v)}
                    style={{ width: "100%", textAlign: "left", padding: "11px 18px", border: "none", borderBottom: "1px solid " + C.fawn, background: C.sand, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {(showArchived || searching) ? <ChevronUp size={14} style={{ color: C.mink }}/> : <ChevronDown size={14} style={{ color: C.mink }}/>}
                    <Archive size={12} style={{ color: C.mink }}/>
                    <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, color: C.mink, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Archived
                    </span>
                    <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.ash, marginLeft: "auto" }}>
                      {archivedList.filter(matchesQuery).length} thread{archivedList.filter(matchesQuery).length !== 1 ? "s" : ""}
                    </span>
                  </button>
                  {(showArchived || searching) && archivedList.filter(matchesQuery).map(c => (
                    <div key={c.id} style={{ position: "relative" }}>
                      {renderThreadRow(c, true)}
                      <button
                        onClick={(e) => { e.stopPropagation(); unarchiveThread(c); }}
                        title="Move back to inbox"
                        style={{ position: "absolute", right: 14, bottom: 12, display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 10, fontWeight: 800, cursor: "pointer" }}
                      >
                        <RefreshCw size={10}/> Unarchive
                      </button>
                    </div>
                  ))}
                </>
              )}

              {/* An empty inbox still needs to say where the archived ones
                  went, otherwise archiving the last thread looks like it
                  deleted everything. */}
              {archivedLoading && archivedList.length === 0 && (
                <div style={{ padding: "10px 18px", borderTop: "1px solid " + C.fawn, background: C.sand }}>
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.ash }}>Checking your archive…</p>
                </div>
              )}
            </>
          )}
        </div>
        )}

        {/* Active conversation — hidden on mobile until a thread is opened. */}
        {active && (!isMobile || mobileViewingId) && (
          <div style={{
            display: "flex", flexDirection: "column", minWidth: 0,
            background: C.paper,
            border: "1px solid " + C.fawn,
            borderRadius: isMobile ? 16 : 18,
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
            <div style={{ padding: isMobile ? "14px 16px" : "18px 22px", borderBottom: "1px solid " + C.fawn, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: isMobile ? 48 : 60, height: isMobile ? 48 : 60, borderRadius: 14, background: C.sand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid " + C.fawn, overflow: "hidden" }}>
                <ItemImage src={active.item.img} emojiSize={34}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: F.head, fontSize: isMobile ? 16 : 19, fontWeight: 800, color: C.ink, letterSpacing: "-0.015em" }}>{active.item.title}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 3, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: F.head, fontSize: isMobile ? 18 : 22, fontWeight: 900, color: priceColor(active.item.price, C.green), letterSpacing: "-0.02em" }}>{priceText(active.item.price)}</span>
                  <span style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.mink, display: "flex", alignItems: "center", gap: 5 }}>
                    <User size={13}/> {active.seller.name} · {active.seller.hood}
                  </span>
                </div>
              </div>
              {activeStatus && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.head, fontSize: 13, fontWeight: 800, padding: "7px 14px", borderRadius: 999, background: activeStatus.bg, color: activeStatus.color, flexShrink: 0 }}>
                  <activeStatus.icon size={13}/> {activeStatus.label}
                </span>
              )}
              {/* Put this thread away by hand, for when the buyer is done with
                  it before the 30-day window retires it on its own. Hidden
                  while a claim is live — archiving a pickup you still have to
                  show up for would hide the only place it's coordinated. */}
              {activeIsArchived ? (
                <button
                  onClick={() => unarchiveThread(active)}
                  title="Move this thread back to your inbox"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, border: "1.5px solid " + C.green + "55", background: C.greenMist, color: C.greenDeep, fontFamily: F.head, fontSize: 11, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}
                >
                  <RefreshCw size={11}/> Unarchive
                </button>
              ) : !activeClaimByConv[active.id] && (
                <button
                  onClick={() => archiveThread(active)}
                  title="Archive this thread"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, border: "1.5px solid " + C.fawn, background: C.paper, color: C.mink, fontFamily: F.head, fontSize: 11, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}
                >
                  <Archive size={11}/> Archive
                </button>
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
                    {/* One pill holding attach, the field, emoji and send —
                        the field used to be its own bordered pill with the
                        send button floating beside it. */}
                    <div style={{ position: "relative", flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6, padding: "5px 6px 5px 8px", borderRadius: 999, border: "1px solid " + C.fawn, background: C.paper }}>
                      {/* The input stays hidden and the paperclip triggers it,
                          so the control matches the rest of the composer
                          instead of being a browser file widget. Resetting
                          e.target.value lets the same file be picked twice in
                          a row — without it the second change event never
                          fires. */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; handleAttach(f); }}
                        style={{ display: "none" }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={attachBusy || sending}
                        title="Attach a photo"
                        aria-label="Attach a photo"
                        style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "transparent", color: attachBusy ? C.smoke : C.mink, display: "flex", alignItems: "center", justifyContent: "center", cursor: (attachBusy || sending) ? "not-allowed" : "pointer", flexShrink: 0 }}
                      >
                        {attachBusy
                          ? <Loader2 size={18} style={{ animation: "spin 900ms linear infinite" }}/>
                          : <Paperclip size={18}/>}
                      </button>
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Type a message..."
                        disabled={sending}
                        style={{ flex: 1, minWidth: 0, padding: "8px 4px", border: "none", fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.ink, outline: "none", background: "transparent" }}
                      />
                      <button
                        type="button"
                        onClick={() => setEmojiOpen(v => !v)}
                        title="Insert an emoji"
                        aria-label="Insert an emoji"
                        aria-expanded={emojiOpen}
                        style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: emojiOpen ? C.sand : "transparent", color: emojiOpen ? C.amberDeep : C.mink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                      >
                        <Smile size={19}/>
                      </button>
                      <button onClick={handleSend} disabled={sending || attachBusy || !draft.trim()} aria-label="Send message" style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: C.green, color: "#fff", cursor: (sending || attachBusy || !draft.trim()) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: (sending || attachBusy || !draft.trim()) ? 0.45 : 1 }}>
                        <Send size={17}/>
                      </button>

                      {emojiOpen && (
                        <div
                          className="fade-in"
                          style={{ position: "absolute", right: 0, bottom: "calc(100% + 10px)", width: 268, padding: 10, borderRadius: 16, background: C.paper, border: "1px solid " + C.fawn, boxShadow: "0 10px 28px rgba(31,29,25,0.14)", display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2, zIndex: 20 }}
                        >
                          {COMPOSER_EMOJI.map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => { setDraft(d => d + em); setEmojiOpen(false); }}
                              title={em}
                              style={{ width: "100%", aspectRatio: "1", border: "none", borderRadius: 8, background: "transparent", fontSize: 19, lineHeight: 1, cursor: "pointer", padding: 0 }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = C.sand; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
    { label: "Items bought", value: totalItems,          icon: ShoppingBag,  color: C.green,     bg: C.greenMist  },
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
      // A row inside the month card now, not a card of its own: no radius or
      // outer margin, and a hairline on top to separate it from whatever sits
      // above — the month header for the first row, the previous purchase for
      // the rest. The highlight flash moves from a ring to a tinted row with
      // a green edge, since a ring needs a gap around it to read.
      <article style={{ padding: __isMobile ? "14px 16px" : "16px 22px", background: highlightId === tx.id ? C.greenMist : "transparent", borderTop: "1px solid " + C.fawn, boxShadow: highlightId === tx.id ? "inset 3px 0 0 " + C.green : "none", transition: "box-shadow 200ms, background 200ms" }}>
        <div style={{ display: "flex", alignItems: "center", gap: __isMobile ? 14 : 18 }}>
          <div style={{ width: __isMobile ? 64 : 88, height: __isMobile ? 64 : 88, borderRadius: 14, background: layerTint, border: "1px solid " + C.fawn, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
            <ItemImage src={tx.img} emojiSize={__isMobile ? 30 : 40}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badge leads the line — the design puts the layer before the
                title rather than trailing it. */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 6, background: layerBadge.bg, color: layerBadge.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>{layerBadge.label}</span>
              <p style={{ fontFamily: F.head, fontSize: __isMobile ? 16 : 19, fontWeight: 800, color: C.ink, letterSpacing: "-0.015em" }}>{tx.title}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontFamily: F.body, fontSize: 13.5, fontWeight: 600, color: C.mink }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><User size={13}/> {tx.seller}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13}/> {tx.hood}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={13}/> {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            {tx.rated && (
              <div style={{ display: "flex", gap: 3, marginTop: 8 }}>
                {[1,2,3,4,5].map(n => <Star key={n} size={15} style={{ color: n <= tx.rating ? C.amber : C.fawn }} fill={n <= tx.rating ? C.amber : "none"} strokeWidth={n <= tx.rating ? 0 : 1.5}/>)}
              </div>
            )}
          </div>
          {/* Price, review action and chevron sit side by side on the right
              rather than stacked under the price. */}
          <div style={{ display: "flex", alignItems: "center", gap: __isMobile ? 10 : 18, flexShrink: 0 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "flex-end" }}>
                <span style={{ fontFamily: F.head, fontSize: __isMobile ? 22 : 27, fontWeight: 900, color: priceColor(tx.price, C.green), letterSpacing: "-0.02em" }}>{priceText(tx.price)}</span>
                {tx.origPrice && <span style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.ash, textDecoration: "line-through" }}>${tx.origPrice}</span>}
              </div>
              {saved > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginTop: 4 }}>
                  <TrendingDown size={13} style={{ color: C.greenDeep }}/>
                  <span style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.greenDeep }}>Saved ${saved}</span>
                </div>
              )}
            </div>
            {!tx.rated && !isReviewing && (
              <button onClick={() => { setReviewId(tx.id); setReviewStars(0); }} style={{ padding: "11px 18px", borderRadius: 999, border: "1.5px solid " + C.amber, background: C.paper, color: C.amberDeep, fontFamily: F.head, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                <Star size={16}/> Leave review
              </button>
            )}
            <ChevronRight aria-hidden="true" size={20} style={{ color: C.smoke, flexShrink: 0 }}/>
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
      {/* No chip here — the four stat cards directly below already lead with
          "3 Items bought", so a "3 completed pickups" chip above them would
          be the same number twice. Matches the History shot. */}
      <PageBar onBack={onBack} title="Purchase history"/>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: __isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: __isMobile ? 10 : 14, marginBottom: __isMobile ? 16 : 22 }}>
        {stats.map((s, i) => {
          const Ic = s.icon;
          return (
            // Icon beside the number instead of stacked above it, so this row
            // is the same component shape as the Claims row. `sub` ("vs
            // original") moves from the card's top corner to a chip sitting
            // next to the value it qualifies — floated up there it read as a
            // label for the whole card.
            <div key={i} className="fade-in" style={{ padding: "20px 22px", borderRadius: 18, background: C.paper, border: "1px solid " + C.fawn, animationDelay: (i * 40) + "ms", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ic size={23} strokeWidth={2.1} style={{ color: s.color }}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                  <p style={{ fontFamily: F.head, fontSize: 33, fontWeight: 900, color: s.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</p>
                  {s.sub && <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.ash, background: C.sand, border: "1px solid " + C.fawn, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>{s.sub}</span>}
                </div>
                <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.mink, marginTop: 5 }}>{s.label}</p>
              </div>
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

      {/* Timeline grouped by month — one card per month, header on top and
          its purchases stacked under it with hairline dividers.

          The year used to get a header of its own ("2026", with a rule under
          it) above a row of uppercase month chips. The design folds the two
          into a single "October 2026" row, so the year loop stays only to
          keep newest-year-first ordering and draws nothing itself. Month
          collapse still works off the same `collapsed[monthKey]` state; the
          year-level collapse goes with its header. */}
      {years.map(year => Object.keys(grouped[year]).map(month => {
        const monthKey = year + "-" + month;
        const monthTxs = grouped[year][month];
        const monthSpent = monthTxs.reduce((a, t) => a + t.price, 0);
        const monthSaved = monthTxs.reduce((a, t) => a + (t.origPrice ? t.origPrice - t.price : 0), 0);
        const monthCollapsed = !!collapsed[monthKey];
        return (
          <section key={monthKey} style={{ marginBottom: 16, borderRadius: 18, border: "1px solid " + C.fawn, background: C.paper, overflow: "hidden" }}>
            <button onClick={() => toggleCollapse(monthKey)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: __isMobile ? "14px 16px" : "16px 22px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", flexWrap: "wrap", rowGap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {monthCollapsed ? <ChevronRight size={18} style={{ color: C.mink, flexShrink: 0 }}/> : <ChevronDown size={18} style={{ color: C.mink, flexShrink: 0 }}/>}
                <h2 style={{ fontFamily: F.head, fontSize: __isMobile ? 16 : 19, fontWeight: 800, color: C.ink, letterSpacing: "-0.015em" }}>{month} {year}</h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: F.body, fontSize: __isMobile ? 12 : 13.5, fontWeight: 600, color: C.mink }}>
                <span>{monthTxs.length} item{monthTxs.length !== 1 ? "s" : ""}</span>
                <span aria-hidden="true" style={{ color: C.smoke }}>•</span>
                <span>${monthSpent} spent</span>
                <span aria-hidden="true" style={{ color: C.smoke }}>•</span>
                <span style={{ fontFamily: F.head, fontWeight: 800, color: C.greenDeep }}>${monthSaved} saved</span>
              </div>
            </button>
            {!monthCollapsed && monthTxs.map((tx, idx) => <TxRow key={tx.id} tx={tx} idx={idx}/>)}
          </section>
        );
      }))}

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
function DiscoverPage({ savedIds, onToggleSave, onSelect, onClaimNow, state, reminded, onRemindMe, savedPreview, togglePreview, onSwitchRole, onPreviewItem, onSeeAllPreviews, claimedIds = new Set(), purchasedIds = new Set(), offeredIds = new Set(), itemsSource = null, itemsLoading = false, sneakPeekSource = null, currentUserId = null, answeredIds = new Set() }) {
  // A seller's own listings are part of the feed (see the fetch in
  // BuyerDashboard). This is what marks them so the card can drop its
  // buyer-side actions — null for the unauthed preview routes, where every
  // demo item carries sellerId: null and nothing matches.
  const isOwnItem = (i) => !!currentUserId && i?.sellerId === currentUserId;
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [hood, setHood] = useState("All");
  const [cond, setCond] = useState("All");
  const [sort, setSort] = useState("newest");
  const [panelOpen, setPanelOpen] = useState(false);

  // Neighbourhood options come from whoever is actually selling, off the
  // UNFILTERED pool — deriving them from the filtered list would delete every
  // other option the moment one was picked. Sellers who haven't set a
  // neighbourhood simply don't add one.
  const hoodPool = Array.isArray(itemsSource) ? itemsSource : allItems;
  const hoods = Array.from(new Set(hoodPool.map(i => i.sellerHood).filter(Boolean))).sort();

  // Unique-seller count for the AnticipationBand "X neighbours have items
  // lined up" line. Null when no source was passed (i.e. preview routes) so
  // AnticipationBand can keep its own demo fallback.
  const queuedSellerCount = Array.isArray(sneakPeekSource) ? new Set(sneakPeekSource.map(i => i.seller).filter(Boolean)).size : null;
  const queuedSellerNames = Array.isArray(sneakPeekSource) ? Array.from(new Set(sneakPeekSource.map(i => i.seller).filter(Boolean))) : null;
  const dropOpenCountdown = useDropOpenCountdownString();

  // WelcomeBand's "N items" headline. Counted off the WHOLE pool, not the
  // filtered grid — the band describes the Drop, not the current search or
  // category. Only `live` items count: `claimed` ones are already gone and
  // `preview` ones are Sneak Peek drafts that can't be claimed yet. Null when
  // no source was passed (preview routes) so the band keeps its demo numbers.
  const liveClaimable = Array.isArray(itemsSource) ? itemsSource.filter(i => i.status === "live") : null;
  const liveItemsCount = liveClaimable ? liveClaimable.length : null;
  const liveSellerNames = liveClaimable ? Array.from(new Set(liveClaimable.map(i => i.seller).filter(Boolean))) : null;

  // (The hero's backdrop used to be built here — a flattened list of the
  // feed's own listing photos, tiled across the band by HeroPhotoMosaic.
  // Both bands now carry a single packaged photograph instead, so there is
  // nothing to collect.)

  // Show the cardboard-box skeleton on the initial backend load — empty
  // network states should not look like "the marketplace is empty".
  if (itemsLoading) {
    return (
      <>
        {state === "between" && <AnticipationBand onRemindMe={onRemindMe} reminded={reminded} queuedCount={queuedSellerCount} sellerNames={queuedSellerNames}/>}
        {state === "live" && <WelcomeBand itemsCount={liveItemsCount} sellerNames={liveSellerNames}/>}
        <FilterRail filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} cat={cat} setCat={setCat} hood={hood} setHood={setHood} cond={cond} setCond={setCond} sort={sort} setSort={setSort} panelOpen={panelOpen} setPanelOpen={setPanelOpen} state={state} hoods={hoods}/>
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
  if (hood !== "All") items = items.filter(i => i.sellerHood === hood);
  if (cond !== "All") items = items.filter(i => i.cond === cond);
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
      {state === "live" && <WelcomeBand itemsCount={liveItemsCount} sellerNames={liveSellerNames}/>}

      <FilterRail filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} cat={cat} setCat={setCat} hood={hood} setHood={setHood} cond={cond} setCond={setCond} sort={sort} setSort={setSort} panelOpen={panelOpen} setPanelOpen={setPanelOpen} state={state} hoods={hoods}/>

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
              : liveUnifiedPool.length + " item" + (liveUnifiedPool.length === 1 ? "" : "s") + " up for grabs. The window closes " + dropCloseDay() + " " + dropCloseHour() + " — claim now before they're gone.";
            return <SectionHeader eyebrow="Live Drop" eyebrowBg={C.green} title="Your neighbours right now" subtitle={subtitle} pulse={true}/>;
          })()}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {liveUnifiedPool.map((item, i) => (
              <ItemCard key={item.id} item={item} saved={savedIds.has(item.id)} onToggleSave={onToggleSave} onOpen={() => onSelect(toDetailItem(item))} onClaimNow={() => onClaimNow(toDetailItem(item))} index={i} liveMode={true} fromPeek={item.fromPeek && savedPreview.has(item.id)} claimedByMe={claimedIds.has(item.id)} purchasedByMe={purchasedIds.has(item.id)} offerPending={offeredIds.has(item.id)} answerReady={answeredIds.has(item.id)} isOwn={isOwnItem(item)} onSwitchRole={onSwitchRole}/>
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
            <SectionHeader eyebrow="Available now" eyebrowBg={C.green} title="Don't wait for Saturday" subtitle={betweenPool.length + " items you can grab today — Shelf items available for pickup anytime."} pulse={true}/>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
              {betweenPool.map((item, i) => (
                <ItemCard key={item.id} item={item} saved={savedIds.has(item.id)} onToggleSave={onToggleSave} onOpen={() => onSelect(toDetailItem(item))} onClaimNow={() => onClaimNow(toDetailItem(item))} index={i} fromPeek={item.fromPeek && savedPreview.has(item.id)} claimedByMe={claimedIds.has(item.id)} purchasedByMe={purchasedIds.has(item.id)} offerPending={offeredIds.has(item.id)} answerReady={answeredIds.has(item.id)} isOwn={isOwnItem(item)} onSwitchRole={onSwitchRole}/>
              ))}
            </div>
          </>
        );
      })()}

      {/* BETWEEN DROPS, Shelf filter — Shelf items only */}
      {!isLive && filter === "shelf" && shelfItems.length > 0 && (
        <>
          <SectionHeader eyebrow="Available now" eyebrowBg={C.green} title="Don't wait for Saturday" subtitle={shelfItems.length + " items ready to grab right now. Message the seller to arrange pickup."} pulse={true}/>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {shelfItems.map((item, i) => (
              <ItemCard key={item.id} item={item} saved={savedIds.has(item.id)} onToggleSave={onToggleSave} onOpen={() => onSelect(toDetailItem(item))} onClaimNow={() => onClaimNow(toDetailItem(item))} index={i} fromPeek={item.fromPeek && savedPreview.has(item.id)} claimedByMe={claimedIds.has(item.id)} purchasedByMe={purchasedIds.has(item.id)} offerPending={offeredIds.has(item.id)} answerReady={answeredIds.has(item.id)} isOwn={isOwnItem(item)} onSwitchRole={onSwitchRole}/>
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
          onCtaClick={() => { setSearch(""); setCat("All"); setHood("All"); setCond("All"); setFilter("all"); setSort("newest"); }}
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

/* Password input with a reveal toggle. The caller owns `show` so one piece of
   state can drive both the new and confirm fields at once — revealing them
   together is the point: "do not match" is unactionable when you can't see
   which of the two has the typo. Right padding clears the eye button. */
function BSF_PasswordInput({ show, onToggleShow, ...props }) {
  return (
    <div style={{ position: "relative" }}>
      <BSF_Input {...props} type={show ? "text" : "password"} style={{ paddingRight: 42 }}/>
      <button
        type="button"
        onClick={onToggleShow}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 6, border: "none", background: "none", color: C.ash, cursor: "pointer" }}
      >
        {show ? <EyeOff size={15}/> : <Eye size={15}/>}
      </button>
    </div>
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
          <BSF_PasswordInput show={showNewPw} onToggleShow={() => setShowNewPw(v => !v)} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" disabled={savingPw}/>
        </BSF_Field>

        <BSF_Field label="Confirm new password">
          <BSF_PasswordInput show={showConfirmPw} onToggleShow={() => setShowConfirmPw(v => !v)} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter new password" autoComplete="new-password" disabled={savingPw}/>
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
    // Discover has no pagination — it renders one grid of everything that's
    // claimable — so the feed has to be drained, not sampled. This called
    // GET /api/items with no params, which the backend serves as page 1 of
    // 20; with 28 live items the 8 oldest simply did not exist as far as any
    // buyer was concerned, while their sellers saw "Live in Drop" on them.
    // 100 is the backend's per-page cap; the loop covers the rest and stops
    // at 1000 items so a runaway catalogue can't hang the dashboard.
    const PAGE_SIZE = 100;
    const MAX_PAGES = 10;
    const fetchAllItems = async () => {
      const first = await apiRequest(`/api/items?limit=${PAGE_SIZE}`, { token: accessToken });
      const items = Array.isArray(first?.items) ? [...first.items] : [];
      const total = typeof first?.total === "number" ? first.total : items.length;
      const pages = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES);
      for (let p = 2; p <= pages; p++) {
        if (cancelled) break;
        const next = await apiRequest(`/api/items?limit=${PAGE_SIZE}&page=${p}`, { token: accessToken });
        if (Array.isArray(next?.items)) items.push(...next.items);
      }
      return { items };
    };
    fetchAllItems()
      .then(data => {
        if (cancelled) return;
        const list = Array.isArray(data?.items) ? data.items : [];
        // A seller's own listings stay IN the buyer feed. They used to be
        // filtered out here (BUG-050), which meant the one person who most
        // wanted to see how their item reads to a buyer couldn't — and left
        // them unable to tell a live listing from one that never published.
        // What they can't do is transact with themselves, and that's handled
        // where the actions are: ItemCard renders a "Your listing" card with
        // no claim CTA, ItemDetail swaps in the Seller-view switch, and the
        // backend refuses a self-claim either way.
        setLiveItems(list.map(adaptBuyerItem).filter(Boolean));
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
        // Own queued items are shown here too, same reasoning as the main
        // feed above. Nothing on a Sneak Peek card transacts — it saves and
        // it previews — so a seller seeing their own item lined up for
        // Saturday is simply the truth about Saturday.
        //
        // Built on `adaptBuyerItem` rather than a hand-rolled subset. The old
        // adapter kept eight fields and threw the rest of the payload away —
        // including `photos`, which is why a Sneak Peek detail page showed a
        // single image however many the seller uploaded. It also made these
        // items structurally different from feed items, so a saved one could
        // not be rendered by ItemCard on the Saved page. Now they are ordinary
        // buyer items (status "preview", since they're DRAFT) with the two
        // peek-only extras layered on top.
        const adapted = list.map((api, i) => {
          const base = adaptBuyerItem(api);
          if (!base) return null;
          return {
            ...base,
            id:       base.id ?? ("api-peek-" + i),
            // Queued items aren't finally priced yet — the peek UI says
            // "around $X" and reads this rather than `p`.
            estPrice: api.originalPrice ?? api.price ?? 0,
            hood:     api.seller?.neighborhood || "Nearby",
            // /sneak-peek doesn't select the seller's coords, so there's no
            // distanceLabel to fall back from. Say "Nearby" rather than let
            // the adapter print a neighbourhood name under "Distance".
            dist:     api.distanceLabel || "Nearby",
          };
        }).filter(Boolean);
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
  // Fetched individually rather than looked up in the feed: the feed only
  // carries LIVE items for the current phase, so a shared item is frequently
  // absent from it. A bad or removed id just leaves the buyer on
  // Discover — a shared link outliving its item is normal, not an error.
  // NO cancelled-flag here, deliberately. This effect used to set one in a
  // cleanup, and under React StrictMode (on by default in dev) that made the
  // deep link a no-op for anyone ALREADY signed in: the double-invoke ran the
  // effect, cleaned it up — flipping `cancelled` — then bailed on the second
  // pass at the ref check, so the one in-flight response was discarded and the
  // item never opened. It worked signed-out only because the token arrives
  // after mount, and that later re-run isn't double-invoked.
  // `consumedItemRef` is what guarantees a single fetch per id, so the flag
  // was redundant as well as harmful; a resolve after unmount is a no-op.
  const consumedItemRef = useRef(null);
  useEffect(() => {
    if (!initialItemId || !accessToken) return;
    if (consumedItemRef.current === initialItemId) return; // once per id
    consumedItemRef.current = initialItemId;
    apiRequest(`/api/items/${encodeURIComponent(initialItemId)}`, { token: accessToken })
      .then((r) => {
        if (!r?.item) return;
        const ui = adaptBuyerItem(r.item);
        if (!ui) return;
        setPage("discover");
        setViewingItem(toDetailItem(ui));
      })
      .catch(() => { /* removed / invalid id — stay on Discover */ })
      .finally(() => { if (onInitialItemConsumed) onInitialItemConsumed(); });
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
  // Sneak Peek "save for Saturday" — demo-only state now. For a signed-in
  // buyer the peek heart writes to the real watchlist (see `peekSaved` /
  // `peekToggle` below); this Set exists purely so /preview/buyer-dashboard,
  // which has no token and no server, still demonstrates the interaction.
  const [savedPreview, setSavedPreview] = useState(() => accessToken ? new Set() : new Set([101, 104]));
  const [viewingPreview, setViewingPreview] = useState(null); // sneak peek item being previewed
  const [showSneakList, setShowSneakList] = useState(false); // full sneak peek list page
  const [reminded, setReminded] = useState(false);
  const [toast, setToast] = useState(null);
  // Drop state is derived from the system clock (see computeDropState).
  // We re-check every 60 seconds so the UI flips automatically the moment
  // the Drop opens (Sat 8am) and closes (Sun 8pm), without any manual toggle.
  //
  // `?simulate=<ISO>` (dev builds only — the provider ignores it in
  // production) pins the clock so the LIVE band can be seen on a Tuesday.
  // When it's set there's nothing to re-check: the moment is fixed, so the
  // interval is skipped rather than re-deciding the same answer every minute.
  const { simulatedDate } = useDropCycle();
  const simulatedMs = simulatedDate ? simulatedDate.getTime() : null;
  const [dropState, setDropState] = useState(() => computeDropState());
  useEffect(() => {
    const resolve = () => setDropState(computeDropState(simulatedMs == null ? new Date() : new Date(simulatedMs)));
    resolve();
    if (simulatedMs != null) return;
    const tick = setInterval(resolve, 60 * 1000);
    return () => clearInterval(tick);
  }, [simulatedMs]);
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
    // Mirrors unreadCountFor on the server: a NOTICE is system narration of a
    // claim transition, not a message someone sent you, so it must not raise
    // the Messages badge. Without this the socket path would put back the
    // phantom unread the backend no longer counts, until the next refetch.
    const isNotice = message.messageType === "NOTICE";
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
      const newUnread = (isFromMe || isNotice) ? (c.unreadCount || 0) : (c.unreadCount || 0) + 1;
      return {
        ...c,
        lastMsg:       message.body || c.lastMsg,
        lastTime:      relativeTimeShort(message.createdAt),
        lastMessageAt: message.createdAt || c.lastMessageAt,
        unread:        newUnread > 0,
        unreadCount:   newUnread,
        // Same rule as the adapter: my own message leaves me waiting on the
        // seller, theirs is an answer. Previously an incoming message set
        // "pending" and reading it flipped to "answered", which labelled a
        // thread by whether it had been opened rather than who spoke last.
        status:        isFromMe ? "pending" : "answered",
      };
    });
    const moved = updated.find((c) => c.id === conversationId);
    if (!moved) return updated;
    return [moved, ...updated.filter((c) => c.id !== conversationId)];
  }, [accessToken, myUserId]);

  // Imperative inbox refresh. Shared by the mount effect, the Messages-tab
  // entry effect, and the post-claim callback — anything that needs the list
  // to be current RIGHT NOW rather than whenever the next socket event lands.
  // Keeps the previous list on a transient failure: blanking the inbox on a
  // network blip is worse than showing a slightly stale one.
  const refreshConvList = useCallback(() => {
    // No token = the unauthed /preview/buyer-dashboard story, which runs on
    // DEMO_BUYER_CONVERSATIONS. Leave it alone — clearing the list is the
    // mount effect's job when a real session ends.
    if (!accessToken) return Promise.resolve();
    return apiRequest("/api/conversations", { token: accessToken })
      .then((data) => {
        const list = Array.isArray(data?.conversations) ? data.conversations : [];
        setConvList(list.map((api) => adaptBuyerConversation(api, myUserId)).filter(Boolean));
      })
      .catch(() => { /* keep the current list on a transient blip */ });
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

  // ─── Don't make the inbox depend on the socket being alive ───
  // The conversation list used to refresh ONLY on socket pushes (message:new /
  // claim:new) or a full page load. So whenever the websocket was down — dev
  // server restart, laptop waking up, a network blip, a handshake that failed
  // on an expired token — sending an offer and tapping "View in Messages"
  // landed on an empty inbox that stayed empty until the user hit refresh.
  //
  // Two cheap safety nets below. Both are no-ops when realtime is healthy
  // (the list is already current, so the refetch just re-renders the same
  // rows), and both remove the manual refresh when it isn't.

  // 1. Entering the Messages tab always pulls a fresh list. This covers every
  //    route in: the "View in Messages" CTA on the offer-sent screen, the top
  //    bar, the mobile bottom nav, and the Claims-tab "Message seller" button.
  useEffect(() => {
    if (page !== "messages") return;
    refreshConvList();
  }, [page, refreshConvList]);

  // 2. On socket reconnect, re-pull everything that went stale while the
  //    connection was down — the inbox here, plus the items feed and the
  //    claims list via their existing ticks.
  const { connected: socketConnected } = useSocket();
  const wasConnectedRef = useRef(socketConnected);
  useEffect(() => {
    const wasConnected = wasConnectedRef.current;
    wasConnectedRef.current = socketConnected;
    if (!socketConnected || wasConnected) return;
    refreshConvList();
    setItemsTick((t) => t + 1);
    setClaimsTick((t) => t + 1);
  }, [socketConnected, refreshConvList]);

  // 3. A claim/offer the buyer just made is the one update we never have to
  //    wait for — we know it happened because our own POST returned 201.
  //    Bumping both ticks refetches the items feed, the inbox (itemsTick) and
  //    the Claims tab, which is exactly what the socket's claim:new would
  //    have triggered.
  const handleClaimCreated = useCallback(() => {
    setItemsTick((t) => t + 1);
    setClaimsTick((t) => t + 1);
  }, []);

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
    // Unread only — `status` tracks who spoke last and is unaffected by the
    // thread being opened somewhere else.
    setConvList((prev) => prev.map((c) => c.id === cid
      ? { ...c, unreadCount: 0, unread: false }
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
      // A claim the seller hasn't answered yet doesn't hold the item: it is
      // still listed and any neighbour can claim it too, so the card must not
      // go into the "YOU CLAIMED THIS" state and lock its own CTA. Tracked
      // separately as offeredIds, which draws the "Claim pending" badge.
      if (c.status === "offer-pending") continue;
      live.add(c.itemId);
    }
    return live;
  }, [claims]);
  // Items this buyer has an un-answered claim on. Shown as a quiet "Claim
  // pending" badge on their own copy of the card; the listing itself stays
  // live for everyone, since the seller is the one who picks a buyer.
  const offeredIds = useMemo(() => {
    const pending = new Set();
    for (const c of claims) {
      if (c.itemId != null && c.status === "offer-pending") pending.add(c.itemId);
    }
    return pending;
  }, [claims]);
  const purchasedIds = useMemo(() => {
    const done = new Set();
    for (const c of claims) {
      if (c.itemId != null && c.status === "picked-up") done.add(c.itemId);
    }
    return done;
  }, [claims]);

  // ─── Questions this buyer asked, and which answers are still unread ──────
  // The seller's reply lands on the public item page. Nothing pointed the
  // buyer back at it, so the only way to find out was to reopen the listing
  // and read the thread again. These drive an envelope badge on the item's
  // card, which is where the buyer actually is.
  const [myQuestions, setMyQuestions] = useState([]);
  const [questionsTick, setQuestionsTick] = useState(0);
  const [seenAnswers, setSeenAnswers] = useState({});
  useSocketEvent("question:answered", () => setQuestionsTick((t) => t + 1));
  // localStorage isn't available during SSR, so seed after mount.
  useEffect(() => { setSeenAnswers(readSeenAnswers()); }, []);
  useEffect(() => {
    if (!accessToken) { setMyQuestions([]); return; }
    let cancelled = false;
    apiRequest("/api/questions/mine", { token: accessToken })
      .then((data) => {
        if (cancelled) return;
        setMyQuestions(Array.isArray(data?.questions) ? data.questions : []);
      })
      .catch(() => { if (!cancelled) setMyQuestions([]); });
    return () => { cancelled = true; };
  }, [accessToken, questionsTick]);

  const answeredIds = useMemo(() => {
    const waiting = new Set();
    for (const q of myQuestions) {
      if (!q.answer || !q.itemId) continue;
      if (seenAnswers[q.id] === answerStamp(q)) continue;
      waiting.add(q.itemId);
    }
    return waiting;
  }, [myQuestions, seenAnswers]);

  // Opening the item is reading the answer — that's where the Q&A renders.
  // Driven off `viewingItem` at the root rather than a callback threaded into
  // ItemDetail, because every route into the detail view (card, deep link,
  // watchlist, seller profile) goes through this one piece of state.
  const markAnswersSeen = useCallback((itemId) => {
    if (!itemId) return;
    setSeenAnswers((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const q of myQuestions) {
        if (q.itemId !== itemId || !q.answer) continue;
        const stamp = answerStamp(q);
        if (next[q.id] !== stamp) { next[q.id] = stamp; changed = true; }
      }
      if (!changed) return prev;
      writeSeenAnswers(next);
      return next;
    });
  }, [myQuestions]);
  useEffect(() => {
    if (viewingItem?.id) markAnswersSeen(viewingItem.id);
  }, [viewingItem?.id, markAnswersSeen]);

  // Optimistic toggle: flip the local Set immediately so the heart animates,
  // then POST/DELETE in the background. Roll back on failure. Skip the network
  // call entirely for demo-only ids (numbers from the static `allItems` array)
  // since those don't exist on the server. Also keeps `savedItems` (the
  // SavedPage source) in sync so the page reflects toggles instantly.
  // Everything the user can save from, in one pool: the Discover feed plus
  // the Sneak Peek strip. Peek items are queued (DRAFT) so they never appear
  // in /api/items, and leaving them out meant a peek save flipped the heart
  // but put nothing on the Saved page until the next watchlist refetch.
  const savableItem = (id) => {
    const feed = Array.isArray(itemsForUI) ? itemsForUI : [];
    const peek = Array.isArray(sneakPeekForUI) ? sneakPeekForUI : [];
    return feed.find(it => it.id === id) || peek.find(it => it.id === id);
  };
  const toggleSave = async (id) => {
    const wasSaved = savedIds.has(id);
    setSavedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    // Keep savedItems aligned. Unsave → remove. Save → look up the full
    // item and append (so SavedPage shows it instantly without waiting for
    // a watchlist refetch).
    if (wasSaved) {
      setSavedItems(prev => prev.filter(it => it.id !== id));
    } else {
      const found = savableItem(id);
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
        const found = savableItem(id);
        if (found) setSavedItems(prev => prev.some(it => it.id === id) ? prev : [found, ...prev]);
      } else {
        setSavedItems(prev => prev.filter(it => it.id !== id));
      }
    }
  };
  const togglePreview = (i) => setSavedPreview(prev => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  // The Sneak Peek heart used to flip `savedPreview`, a Set that lived only
  // in this component: the save never reached /api/watchlist, so it was
  // missing from the Saved tab and gone on the next page load — the amber
  // ring on the card with it. A queued item is an ordinary watchlist row
  // (the backend takes any item id, whatever its status), so for a signed-in
  // buyer the peek heart is now the same save as everywhere else, and the
  // Saved tab lists it with its "Sneak Peek / Opens Saturday" card. The
  // local Set stays behind for the token-less preview route.
  const peekSaved  = accessToken ? savedIds   : savedPreview;
  const peekToggle = accessToken ? toggleSave : togglePreview;
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
    // Upsert, not prepend. ClaimModal does two things after its POST returns
    // 201: calls onClaimCreated (which bumps claimsTick and refetches
    // /api/claims/mine, already containing the new claim) and calls onConfirm,
    // which lands here. A blind prepend then added a second copy under the
    // same backend id — React's "two children with the same key" — until the
    // next refetch happened to replace the array. The socket's claim:new
    // bumps the same tick, so the race had two ways to fire.
    setClaims(prev => [insertedClaim, ...prev.filter(c => c.id !== insertedClaim.id)]);
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
      <div style={{ minHeight: "100vh", background: C.page, color: C.ink, position: "relative" }}>
        <HillsBackdrop/>
        <TopBar page={page} setPage={setPage} savedCount={savedIds.size} claimsCount={claims.length} messagesUnread={messagesUnreadCount} onSwitchRole={onSwitchRole} onReset={resetNav} user={user} onSignout={onSignoutRequest}/>

        {/* position + z-index are load-bearing: HillsBackdrop is fixed with
            z-index 0, and a positioned element paints above unpositioned
            content no matter how low its z-index. Without this the hills
            would sit on top of the page. */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: isMobile ? "16px 16px calc(76px + env(safe-area-inset-bottom, 0))" : "24px 32px 64px" }}>
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
            <RegularSellerProfile sellerName={viewingSellerName} onBack={() => { setViewingSellerName(null); if (sellerBackItem) { setViewingItem(sellerBackItem); setSellerBackItem(null); } }} onSelect={setViewingItem} onClaimNow={setClaimItem} savedIds={savedIds} onToggleSave={toggleSave} itemsSource={itemsForUI} state={dropState} currentUserId={user?.id || null} onSwitchRole={onSwitchRole}/>
          )}
          {viewingItem && (
            <ItemDetail item={viewingItem} onBack={() => setViewingItem(null)} onClaimComplete={handleClaimComplete} onGoToClaims={() => { setViewingItem(null); setViewingSellerName(null); setSellerBackItem(null); setPage("claims"); }}  onViewSeller={(name) => { setSellerBackItem(viewingItem); setViewingItem(null); setViewingSellerName(name); }} savedIds={savedIds} onToggleSave={toggleSave} accessToken={accessToken} onGoToMessages={() => { setViewingItem(null); setViewingSellerName(null); setSellerBackItem(null); setPage("messages"); }} onClaimCreated={handleClaimCreated} currentUserId={user?.id || null} onSwitchRole={onSwitchRole} dropState={dropState}/>
          )}

          {!viewingItem && !viewingSellerName && (
            <>
              {page === "discover" && viewingPreview && (
                <PreviewItemDetail item={viewingPreview} onBack={() => setViewingPreview(null)} savedPreview={peekSaved} togglePreview={peekToggle}/>
              )}
              {page === "discover" && !viewingPreview && showSneakList && (
                <SneakPeekListPage savedPreview={peekSaved} togglePreview={peekToggle} onPreviewItem={setViewingPreview} onBack={() => setShowSneakList(false)} sneakPeekSource={sneakPeekForUI}/>
              )}
              {page === "discover" && !viewingPreview && !showSneakList && <DiscoverPage savedIds={savedIds} onToggleSave={toggleSave} onSelect={setViewingItem} onClaimNow={setClaimItem} state={dropState} reminded={reminded} onRemindMe={handleRemindMe} savedPreview={peekSaved} togglePreview={peekToggle} onSwitchRole={onSwitchRole} onPreviewItem={setViewingPreview} onSeeAllPreviews={() => setShowSneakList(true)} claimedIds={claimedIds} purchasedIds={purchasedIds} offeredIds={offeredIds} itemsSource={itemsForUI} itemsLoading={itemsLoading} sneakPeekSource={sneakPeekForUI} currentUserId={user?.id || null} answeredIds={answeredIds}/>}
              {page === "saved"    && <SavedPage savedIds={savedIds} savedItems={accessToken ? savedItems : null} onSelect={setViewingItem} onClaimNow={setClaimItem} onToggleSave={toggleSave} onBrowse={() => setPage("discover")} onBack={() => setPage("discover")} claimedIds={claimedIds} purchasedIds={purchasedIds} offeredIds={offeredIds} itemsSource={itemsForUI} state={dropState} currentUserId={user?.id || null} onSwitchRole={onSwitchRole} answeredIds={answeredIds}/>}
              {page === "claims"   && <ClaimsPage claims={claims} setClaims={setClaims} onBrowse={() => setPage("discover")} onBack={() => setPage("discover")} onGoToMessages={() => setPage("messages")} onOpenThread={(itemTitle) => openMessageThread(itemTitle)} highlightId={highlightId} onClearHighlight={() => setHighlightId(null)} accessToken={accessToken}/>}
              {page === "messages" && <MessagesPage user={user} accessToken={accessToken} claims={claims} onAcceptCounter={handleAcceptCounterByItemTitle} onDeclineCounter={handleDeclineCounterByItemTitle} openThreadId={openThreadId} onConsumeOpenThread={() => setOpenThreadId(null)} onBack={() => setPage("discover")} convList={convList} onConvListChange={setConvList}/>}
              {page === "history"  && <HistoryPage highlightId={highlightId} onClearHighlight={() => setHighlightId(null)} onOpenThread={(itemTitle) => openMessageThread(itemTitle)} accessToken={accessToken} onBack={() => setPage("discover")}/>}
              {page === "settings" && <SettingsPage user={user}/>}
            </>
          )}
        </div>

        <Toast message={toast} onClose={() => setToast(null)}/>

        {/* Direct-from-card claim — bypasses item detail. The own-listing
            check is the last stop before the modal: cards no longer offer a
            claim on your own item, but this path is reachable from the seller
            profile and a stale feed too, and the backend's 400 would arrive
            only after the buyer picked a slot. */}
        {claimItem && !(user?.id && claimItem.seller?.id === user.id) && (
          <ClaimModal
            item={claimItem}
            onClose={() => setClaimItem(null)}
            onConfirm={(slot, price, realClaim) => { handleClaimComplete({ ...claimItem, price }, slot, realClaim); setClaimItem(null); setPage("claims"); }}
            accessToken={accessToken}
            onGoToMessages={() => { setClaimItem(null); setPage("messages"); }}
            onClaimCreated={handleClaimCreated}
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
