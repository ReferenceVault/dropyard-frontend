"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
import DynamicDropCard from "@/components/previews/DynamicDropCard";
import { submitSubmission, isValidEmail } from "@/lib/submissions";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import DifferentMarketplaceSection from "@/components/DifferentMarketplaceSection";
import EarlyAccessSection from "@/components/EarlyAccessSection";
import SellingWaysSection from "@/components/SellingWaysSection";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Clock,
  Recycle,
  Package,
  MapPin,
  ShoppingBag,
  ChevronRight,
  Check,
  ArrowRight,
  User,
  CheckCircle,
  ChevronLeft,
  Bell,
  Heart,
  Search,
  ChevronDown,
  TrendingUp,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Linkedin,
} from "lucide-react";

// ============================================================================
// CUSTOM LOGO COMPONENT
// ============================================================================
export function DropYardLogo({ size = "default" }: { size?: "small" | "default" | "large" }) {
  const sizes = {
    small: { container: "w-8 h-8" },
    default: { container: "w-10 h-10" },
    large: { container: "h-14 w-auto" },
  };
  const s = sizes[size] || sizes.default;

  return (
    <div className={`${s.container} relative flex items-center justify-center`}>
      {/* Tagline-free wordmark, trimmed to its artwork. The tagline is
          illegible at nav height and the hero says it anyway. The old asset was
          54% whitespace, which is why this needed scale-150 to look right —
          with the trimmed file the box is the mark, so the zoom is gone and
          the container drops from h-20 to h-14. */}
      <img src="/logo-wordmark.png" alt="DropYard logo" className="h-full w-auto object-contain" />
    </div>
  );
}

export function DropYardWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-brand font-bold ${className}`}>
      <span className="text-emerald-600">Drop</span>
      <span className="text-amber-500">Yard</span>
    </span>
  );
}

// ============================================================================
// OTTAWA POSTAL CODE ZONES - AUTO DETECTION
// ============================================================================
const POSTAL_ZONES: Record<
  string,
  { name: string; drops: number; items: number; distance: string }
> = {
  K1A: { name: "Downtown Ottawa", drops: 5, items: 312, distance: "1 km" },
  K1B: { name: "Blackburn Hamlet", drops: 2, items: 87, distance: "12 km" },
  K1C: { name: "Orleans South", drops: 3, items: 124, distance: "14 km" },
  K1E: { name: "Orleans Central", drops: 3, items: 156, distance: "15 km" },
  K1G: { name: "Alta Vista", drops: 2, items: 98, distance: "6 km" },
  K1H: { name: "Ottawa South", drops: 3, items: 145, distance: "5 km" },
  K1K: { name: "Vanier", drops: 2, items: 76, distance: "4 km" },
  K1N: { name: "Sandy Hill", drops: 2, items: 89, distance: "2 km" },
  K1S: { name: "Old Ottawa South", drops: 3, items: 134, distance: "4 km" },
  K1T: { name: "Hunt Club", drops: 4, items: 187, distance: "10 km" },
  K1V: { name: "South Keys", drops: 3, items: 156, distance: "11 km" },
  K1Z: { name: "Westboro", drops: 4, items: 198, distance: "5 km" },
  K2A: { name: "Carlingwood", drops: 2, items: 87, distance: "7 km" },
  K2B: { name: "Bayshore", drops: 2, items: 76, distance: "9 km" },
  K2C: { name: "Baseline", drops: 3, items: 112, distance: "8 km" },
  K2E: { name: "Merivale", drops: 3, items: 134, distance: "9 km" },
  K2G: { name: "Nepean", drops: 4, items: 176, distance: "10 km" },
  K2H: { name: "Bells Corners", drops: 3, items: 145, distance: "12 km" },
  K2J: { name: "Barrhaven West", drops: 4, items: 203, distance: "15 km" },
  K2K: { name: "Kanata North", drops: 3, items: 156, distance: "18 km" },
  K2L: { name: "Kanata Central", drops: 3, items: 134, distance: "17 km" },
  K2M: { name: "Kanata South", drops: 2, items: 98, distance: "19 km" },
  K2P: { name: "Centretown", drops: 4, items: 187, distance: "1 km" },
  K2S: { name: "Stittsville", drops: 2, items: 87, distance: "21 km" },
  K2T: { name: "Barrhaven East", drops: 3, items: 156, distance: "14 km" },
  K2V: { name: "Kanata Lakes", drops: 3, items: 143, distance: "20 km" },
};

const detectZone = (pc: string) => {
  if (!pc || pc.length < 3) return null;
  const prefix = pc.substring(0, 3).toUpperCase();
  return POSTAL_ZONES[prefix] || {
    name: "Ottawa Area",
    drops: 3,
    items: 150,
    distance: "10 km",
  };
};

// ============================================================================
// MAIN APP
// ============================================================================
// BUG-075 — Next.js 16 requires useSearchParams() to be wrapped in a
// <Suspense> boundary, otherwise the dev console logs:
//   "useSearchParams() should be wrapped in a suspense boundary..."
// and at build time `next build` bails with the same error. We split the
// component: the outer default export only renders Suspense; the inner
// DropYardWebsiteInner is what reads searchParams.
export default function DropYardWebsite() {
  return (
    <Suspense fallback={<div className="min-h-full bg-white" />}>
      <DropYardWebsiteInner />
    </Suspense>
  );
}

function DropYardWebsiteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // BUG-076 — homepage Featured strip now wires the heart to the real
  // /api/watchlist endpoint. We need to know if the visitor is signed in so
  // ItemCard can either save (POST) or bounce to /join?mode=signin.
  const { user } = useAuth();
  const isAuthed = Boolean(user);
  const goSignin = () => router.push("/join?mode=signin");

  useEffect(() => {
    const p = searchParams?.get("page");
    if (p === "howitworks") router.replace("/how-it-works");
    else if (p === "sellers") router.replace("/for-sellers");
    else if (p === "buyers") router.replace("/for-buyers");
  }, [searchParams, router]);

  // BUG-074 — generic auth CTAs default to "login" mode now. The /join
  // page surfaces a Sign-In / Sign-Up toggle prominently so new visitors
  // can switch to signup in one click — but for the majority of clicks
  // (returning users or testers) landing on signin avoids the extra step.
  // Only buttons whose text explicitly says "Sign up" pass "signup".
  const goBuyerAuth = (mode: "signup" | "login" = "login") => {
    router.push(`/join?mode=${mode === "login" ? "signin" : "signup"}`);
  };
  const goSellerAuth = (mode: "signup" | "login" = "login") => {
    router.push(`/join?mode=${mode === "login" ? "signin" : "signup"}`);
  };
  const goMovingAuth = (mode: "signup" | "login" = "login") => {
    router.push(`/join?mode=${mode === "login" ? "signin" : "signup"}`);
  };
  // BUG-074 — browse-intent CTAs route to /buyer (which gates anon visitors
  // to /join automatically), separate from generic auth CTAs that go straight
  // to the sign-in form.
  const goBrowse = () => router.push("/buyer");

  return (
    <div className="min-h-full font-sans bg-white">
      <HomePage goBuyerAuth={goBuyerAuth} goSellerAuth={goSellerAuth} goMovingAuth={goMovingAuth} goBrowse={goBrowse} isAuthed={isAuthed} goSignin={goSignin} />
    </div>
  );
}

// ============================================================================
// FEATURED ITEMS DATA
// ============================================================================
const NEIGHBORHOODS = [
  { id: "kanata-north", name: "Kanata North", drops: 3, items: 156 },
  { id: "barrhaven", name: "Barrhaven", drops: 4, items: 203 },
  { id: "orleans", name: "Orleans", drops: 3, items: 124 },
  { id: "nepean", name: "Nepean", drops: 4, items: 176 },
  { id: "westboro", name: "Westboro", drops: 4, items: 198 },
  { id: "stittsville", name: "Stittsville", drops: 2, items: 87 },
];

// Backend enum -> human label / emoji maps used when adapting /api/items.
// Kept narrow so the homepage doesn't sprawl; full reverse maps live in the
// buyer dashboard.
const CATEGORY_EMOJI_HOME: Record<string, string> = {
  FURNITURE:   "🛋️",
  ELECTRONICS: "📱",
  SPORTS:      "⚽",
  HOME:        "🏠",
  CLOTHING:    "👕",
  BOOKS:       "📚",
  OTHER:       "📦",
};
const CATEGORY_LABEL_HOME: Record<string, string> = {
  FURNITURE:   "Furniture",
  ELECTRONICS: "Electronics",
  SPORTS:      "Sports & Outdoor",
  HOME:        "Home",
  CLOTHING:    "Clothing",
  BOOKS:       "Books & Games",
  OTHER:       "Other",
};
const CONDITION_LABEL_HOME: Record<string, string> = {
  EXCELLENT: "Excellent",
  LIKE_NEW:  "Like New",
  GOOD:      "Good",
  FAIR:      "Fair",
};

const FEATURED_ITEMS = [
  { id: 1, title: "IKEA Kallax Shelf Unit", price: 45, originalPrice: 120, image: "📦", category: "Furniture", seller: "Patel Family", neighborhood: "Kanata North", distance: "2.3 km", saves: 12, condition: "Like New" },
  { id: 2, title: "Dyson V8 Cordless Vacuum", price: 180, originalPrice: 450, image: "🔌", category: "Electronics", seller: "Chen Family", neighborhood: "Barrhaven", distance: "4.1 km", saves: 28, condition: "Good" },
  { id: 3, title: "Kids Balance Bike (Blue)", price: 35, originalPrice: 90, image: "🚲", category: "Kids & Baby", seller: "Johnson Family", neighborhood: "Orleans", distance: "6.2 km", saves: 8, condition: "Good" },
  { id: 4, title: "KitchenAid Stand Mixer", price: 120, originalPrice: 350, image: "🍳", category: "Kitchen", seller: "Williams Family", neighborhood: "Westboro", distance: "3.5 km", saves: 45, condition: "Excellent" },
];

// ============================================================================
// ITEM CARD
// ============================================================================
// BUG-076 — Heart was pure local state; clicking it did nothing useful and
// the displayed saves count was a hardcoded fake. Now: anon visitors get
// bounced to /join?mode=signin; authed visitors fire the real
// POST/DELETE /api/watchlist/:id flow with optimistic UI. The save count
// updates live so the visitor sees their action reflected.
function ItemCard({
  item,
  isAuthed,
  goSignin,
}: {
  item: typeof FEATURED_ITEMS[0];
  isAuthed: boolean;
  goSignin: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [saves, setSaves] = useState<number>(item.saves);
  const [pending, setPending] = useState(false);
  const discount = Math.round((1 - item.price / item.originalPrice) * 100);

  // Real items from /api/items have CUID string ids. The placeholder
  // fallback in the adapter (idx+1) yields a number, which means the row
  // never came from the API and we can't safely call /api/watchlist on it.
  const realItemId = typeof item.id === "string" ? item.id : null;

  const handleHeart = async () => {
    if (pending) return;
    if (!isAuthed) { goSignin(); return; }
    if (!realItemId) return; // can't watchlist a synthetic placeholder

    // Optimistic flip — revert if the call fails.
    const next = !saved;
    setSaved(next);
    setSaves((s) => Math.max(0, s + (next ? 1 : -1)));
    setPending(true);
    try {
      await apiRequest(`/api/watchlist/${encodeURIComponent(realItemId)}`, {
        method: next ? "POST" : "DELETE",
      });
    } catch {
      // Revert on failure — no toast spam on a marketing page.
      setSaved(!next);
      setSaves((s) => Math.max(0, s + (next ? -1 : 1)));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-300 group">
      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 h-44 flex items-center justify-center overflow-hidden">
        {/^(https?:\/\/|data:image\/)/i.test(item.image) ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <span className="text-[59px] group-hover:scale-110 transition-transform duration-300">{item.image}</span>
        )}
        <div className="absolute top-3 left-3 bg-amber-500 text-white text-[11px] font-bold px-2 py-1 rounded-full">-{discount}%</div>
        <button
          onClick={handleHeart}
          disabled={pending}
          aria-label={saved ? "Unsave item" : "Save item"}
          aria-pressed={saved}
          className={`absolute top-3 right-3 w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${saved ? "bg-rose-500 text-white" : "bg-white/90 text-gray-400 hover:text-rose-500"}`}
        >
          <Heart size={16} fill={saved ? "currentColor" : "none"} />
        </button>
        <div className="absolute bottom-3 left-3 bg-white/90 text-[11px] font-medium px-2 py-1 rounded-full text-gray-700">{item.condition}</div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-2">
          <span className="bg-gray-100 px-2 py-0.5 rounded-full">{item.category}</span>
          <span className="flex items-center gap-1"><MapPin size={12} />{item.distance}</span>
        </div>
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-700">{item.title}</h3>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center"><User size={12} className="text-emerald-600" /></div>
          <span className="text-[11px] text-gray-600">{item.seller}</span>
          <span className="text-[11px] text-gray-400">• {item.neighborhood}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[17px] font-bold text-emerald-600">${item.price}</span>
            <span className="text-[13px] text-gray-400 line-through ml-2">${item.originalPrice}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-gray-400"><Heart size={12} />{saves}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SEARCH BAR
// ============================================================================
function SearchBar() {
  const [query, setQuery] = useState("");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2 flex flex-col md:flex-row gap-2">
      <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
        <Search size={20} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search items..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-gray-900 placeholder:text-gray-400"
        />
      </div>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 min-w-[180px]"
        >
          <MapPin size={18} className="text-emerald-600" />
          <span className="text-gray-700 text-[13px]">{selectedNeighborhood || "All Neighborhoods"}</span>
          <ChevronDown size={16} className="text-gray-400 ml-auto" />
        </button>
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
            <button
              onClick={() => { setSelectedNeighborhood(""); setShowDropdown(false); }}
              className="w-full px-4 py-2 text-left text-[13px] hover:bg-gray-50"
            >
              All Neighborhoods
            </button>
            {NEIGHBORHOODS.map((n) => (
              <button
                key={n.id}
                onClick={() => { setSelectedNeighborhood(n.name); setShowDropdown(false); }}
                className="w-full px-4 py-2 text-left text-[13px] hover:bg-gray-50"
              >
                <span>{n.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2">
        <Search size={18} /><span className="hidden sm:inline">Search</span>
      </button>
    </div>
  );
}

// (DropCountdown removed 2026-06-03 — it was a fake hardcoded H:M:S timer that
// looped at 47h, never imported or rendered anywhere. The live homepage drop
// countdown lives in <DynamicDropCard> which derives from getDropCycleInfo.)

const COMING_SOON_HOODS = [
  { name: "Kanata", interested: 84, trend: "+12 this week" },
  { name: "Orléans", interested: 67, trend: "+9 this week" },
  { name: "Nepean", interested: 53, trend: "+7 this week" },
  { name: "Stittsville", interested: 41, trend: "+5 this week" },
  { name: "Gloucester", interested: 38, trend: "+4 this week" },
  { name: "Westboro", interested: 29, trend: "+3 this week" },
];
const MAX_HOOD_INTEREST = Math.max(...COMING_SOON_HOODS.map((n) => n.interested));

function WaitlistCard({ area, isSelected, onSelect }: {
  area: typeof COMING_SOON_HOODS[0];
  isSelected: boolean;
  onSelect: (name: string) => void;
}) {
  const pct = Math.max(18, Math.round((area.interested / MAX_HOOD_INTEREST) * 100));
  return (
    <motion.button
      type="button"
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onSelect(area.name)}
      className={`group relative h-full overflow-hidden rounded-[20px] border p-4 text-left transition-all duration-300 sm:p-5 ${
        isSelected
          ? "border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-[0_16px_40px_rgba(245,158,11,0.16)]"
          : "border-slate-200/80 bg-white shadow-[0_8px_26px_rgba(15,23,42,0.06)] hover:border-amber-200 hover:shadow-[0_16px_34px_rgba(15,23,42,0.10)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute -right-8 -top-8 h-20 w-20 rounded-full blur-2xl transition-opacity duration-300 ${isSelected ? "bg-amber-200/45 opacity-100" : "bg-slate-100 opacity-0 group-hover:opacity-100"}`} />
      </div>
      <div className="relative flex h-full flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[20px] font-bold tracking-[-0.03em] text-slate-950">{area.name}</h3>
            <p className="mt-0.5 text-[12px] text-slate-500">{area.interested} people interested</p>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 transition-all ${
            isSelected
              ? "bg-amber-500 text-white ring-amber-300"
              : "bg-slate-50 text-slate-400 ring-slate-200 group-hover:bg-amber-50 group-hover:text-amber-600 group-hover:ring-amber-200"
          }`}>
            {isSelected ? <Check className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[12px]">
            <span className="font-medium text-slate-500">Demand level</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              <TrendingUp className="h-3 w-3" />
              {area.trend}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${pct}%` }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className={`h-full rounded-full ${isSelected ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-amber-300 to-amber-500"}`}
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function NeighbourhoodWaitlistSection() {
  const [selectedArea, setSelectedArea] = useState("Kanata");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const selected = COMING_SOON_HOODS.find((n) => n.name === selectedArea);

  // Reset success state when the user picks a different neighbourhood.
  useEffect(() => {
    setSubmitted(false);
    setError("");
  }, [selectedArea]);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await submitSubmission({
        type: "NEIGHBOURHOOD_WAITLIST",
        source: "homepage-hero-waitlist",
        payload: {
          email: email.trim(),
          neighbourhood: selected?.name,
        },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your spot. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#f8faf8] py-5 md:py-7">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-14 h-64 w-64 rounded-full bg-amber-100/40 blur-3xl" />
        <div className="absolute right-[-8%] bottom-10 h-64 w-64 rounded-full bg-emerald-100/35 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 shadow-sm">
            <MapPin className="h-3 w-3" />
            Expanding across Ottawa
          </div>
          <h2 className="text-balance text-[21px] font-bold tracking-[-0.03em] text-slate-950 sm:text-[26px]">
            Not in Barrhaven? <span className="text-amber-600">We&apos;re coming to you.</span>
          </h2>
          <p className="mx-auto mt-2 max-w-3xl text-[12px] leading-5 text-slate-600 sm:text-[14px]">
            Join the waitlist for your neighbourhood and be first to know when a local Drop goes live near you.
          </p>
        </motion.div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.45fr_0.9fr] xl:items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/80 p-2.5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-3 xl:flex xl:flex-col xl:h-full"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-emerald-50/70 to-transparent" />
              <div className="absolute -left-10 top-12 h-44 w-44 rounded-full bg-emerald-100/35 blur-3xl" />
              <div className="absolute right-0 top-16 h-52 w-52 rounded-full bg-amber-100/30 blur-3xl" />
            </div>
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } } }}
              className="relative grid grid-cols-1 gap-2.5 md:grid-cols-2 2xl:grid-cols-3 xl:flex-1 xl:auto-rows-fr"
            >
              {COMING_SOON_HOODS.map((area) => (
                <WaitlistCard
                  key={area.name}
                  area={area}
                  isSelected={selectedArea === area.name}
                  onSelect={setSelectedArea}
                />
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="sticky top-8 overflow-hidden rounded-[24px] border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 shadow-[0_16px_44px_rgba(245,158,11,0.14)] sm:p-5"
          >
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-amber-200/35 blur-3xl" />
            <div className="relative">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm ring-1 ring-amber-200">
                <Bell className="h-4 w-4" />
              </div>
              <h3 className="text-[17px] font-bold tracking-[-0.03em] text-slate-950">
                Notify me for {selected?.name}
              </h3>
              <p className="mt-1.5 text-[12px] leading-5 text-slate-600">
                Join the waitlist and be first to know when DropYard launches in your neighbourhood.
              </p>
              <div className="mt-4 rounded-2xl border border-amber-200 bg-white/85 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-medium text-slate-500">Current interest</p>
                    <p className="mt-0.5 text-[15px] font-bold text-slate-950">{selected?.interested} people</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    <TrendingUp className="h-3 w-3" />
                    {selected?.trend}
                  </span>
                </div>
              </div>
              {!submitted ? (
                <form className="mt-5 space-y-3" onSubmit={handleWaitlistSubmit}>
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">Email address</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                      placeholder="you@email.com"
                      disabled={submitting}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100 disabled:opacity-60"
                    />
                  </label>
                  {error && (
                    <p className="text-[12px] text-rose-600">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {submitting ? "Saving your spot..." : "Notify Me"}
                    {!submitting && <ArrowRight className="h-3.5 w-3.5" />}
                  </button>
                </form>
              ) : (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                  <CheckCircle className="mx-auto mb-1.5 h-6 w-6 text-emerald-500" />
                  <p className="text-[13px] font-semibold text-slate-900">You&apos;re on the {selected?.name} waitlist!</p>
                  <p className="mt-1 text-[12px] text-slate-600">We&apos;ll email you at {email} when the {selected?.name} Drop goes live.</p>
                </div>
              )}
              <p className="mt-3 text-[12px] leading-5 text-slate-500">
                You&apos;ll only get launch updates for <span className="font-semibold text-slate-700">{selected?.name}</span>.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// HOW IT WORKS ILLUSTRATIONS
// ============================================================================

// ============================================================================
// HOW IT WORKS SECTION (animated)
// ============================================================================
function HowItWorksSection() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  // BUG-073 — the "Browse the Shelf" button at the bottom of this section
  // had no onClick handler. Now routes to /buyer (which gates anon visitors
  // to /join automatically — works for both signed-in and signed-out users).
  const router = useRouter();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const steps = [
    { num: 1, img: "/images/step1.jpg", alt: "Sellers submit items" },
    { num: 2, img: "/images/step2.jpg", alt: "We host the Drop" },
    { num: 3, img: "/images/step3.jpg", alt: "Neighbours claim" },
    { num: 4, img: "/images/step4.jpg", alt: "Local pickup & payment" },
  ];

  return (
    <>
      <style>{`
        @keyframes slideInFromLeft {
          0% { opacity: 0; transform: translateX(-60px) scale(0.95); }
          60% { opacity: 1; transform: translateX(8px) scale(1.01); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes growLine {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0); }
          70% { transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        .step-card { opacity: 0; }
        .step-card.animate { animation: slideInFromLeft 0.6s ease-out forwards; }
        .step-line { width: 0%; }
        .step-line.animate { animation: growLine 1.2s ease-out 0.3s forwards; }
        .step-dot { opacity: 0; transform: scale(0); }
        .step-dot.animate { animation: popIn 0.3s ease-out forwards; }
        .header-anim { opacity: 0; }
        .header-anim.animate { animation: fadeInUp 0.5s ease-out forwards; }
      `}</style>

      <section
        ref={sectionRef}
        className="py-8 md:py-12 font-sans bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-900 relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-40 h-40 rounded-full bg-amber-400 blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-60 h-60 rounded-full bg-emerald-400 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-amber-300 blur-3xl"></div>
        </div>

        <div className="max-w-6xl mx-auto px-4 w-full relative z-10">
          <div className="text-center mb-10">
            <h2 className={`text-[29px] md:text-[35px] font-bold text-white mb-3 header-anim ${visible ? "animate" : ""}`}>
              How DropYard Works
            </h2>
            <p
              className={`text-emerald-200 text-[17px] max-w-xl mx-auto header-anim ${visible ? "animate" : ""}`}
              style={{ animationDelay: "0.15s" }}
            >
              Four simple steps from listing to pickup
            </p>
          </div>

          <div className="hidden lg:block relative max-w-5xl lg:max-w-6xl mx-auto">
            <div className="absolute top-[130px] left-[8%] right-[8%] h-0.5 overflow-hidden z-0">
              <div className={`h-full bg-amber-400/50 step-line ${visible ? "animate" : ""}`}></div>
            </div>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`absolute top-[127px] w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50 step-dot ${visible ? "animate" : ""}`}
                style={{ left: `${14 + i * 25}%`, animationDelay: `${0.6 + i * 0.25}s` }}
              ></div>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8 max-w-5xl lg:max-w-6xl mx-auto">
            {steps.map((step) => (
              <div
                key={step.num}
                className={`group step-card ${visible ? "animate" : ""}`}
                style={{ animationDelay: `${(step.num - 1) * 0.2}s` }}
              >
                <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 relative">
                  <div className="absolute top-3 left-3 z-10 bg-amber-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] shadow-md">
                    {step.num}
                  </div>
                  <div className="flex items-center justify-center p-4 sm:p-6">
                    <img src={step.img} alt={step.alt} className="w-full h-full object-contain" />
                  </div>
                </div>
                {step.num === 3 && (
                  <div className="flex items-center justify-center gap-1.5 mt-3 py-1.5 px-3 rounded-lg mx-auto w-fit" style={{ backgroundColor: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.25)" }}>
                    <span className="text-amber-300 text-[11px] font-semibold">The Shelf is always open</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div
            className={`mt-10 py-4 px-5 rounded-2xl flex items-center justify-center gap-3 flex-wrap max-w-5xl lg:max-w-6xl mx-auto header-anim ${visible ? "animate" : ""}`}
            style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", animationDelay: "1s" }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <span style={{ fontSize: 18 }}>📚</span>
            </div>
            <p className="text-white/70 text-[13px] flex-1" style={{ minWidth: 260 }}>
              <span className="text-white font-bold">Missed the Drop?</span>{" "}
              Items are always available on the Shelf — browse and claim anytime between Drops.
            </p>
            <button
              type="button"
              onClick={() => router.push("/buyer")}
              className="flex items-center gap-1.5 py-2 px-4 rounded-lg text-white text-[11px] font-bold flex-shrink-0 transition-transform hover:scale-105 cursor-pointer"
              style={{ backgroundColor: "#F08A00" }}
            >
              Browse the Shelf
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

// ============================================================================
// HERO SECTION
// ============================================================================
const BRAND_GREEN = "#059669";
const BRAND_ORANGE = "#f59e0b";

const HERO_NEIGHBORHOODS = [
  { name: "Barrhaven", status: "live" },
  { name: "Kanata", status: "coming_soon" },
  { name: "Nepean", status: "coming_soon" },
  { name: "Orléans", status: "coming_soon" },
  { name: "Stittsville", status: "coming_soon" },
];

const HERO_QUICK_FILTERS = ["Furniture", "Electronics", "Kids & Baby", "Kitchen", "Sports", "Clothing"];

function HeroSearchIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function HeroMapPinIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" /><circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}
function HeroChevronDownIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function HeroSection({ goBuyerAuth, goSellerAuth }: { goBuyerAuth: (mode?: "signup" | "login") => void; goSellerAuth: (mode?: "signup" | "login") => void }) {
  // BUG-074 — "Browse the Barrhaven Drop" used to force a signup wall via
  // goBuyerAuth("signup") — misleading: button text promised browsing,
  // destination demanded an account. Now routes to /buyer (which gates
  // anon visitors to /join automatically and lets signed-in users land
  // straight on Discover).
  const router = useRouter();
  const goBrowse = () => router.push("/buyer");
  return (
    <section className="relative min-h-[65vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src="/images/hero-bg.jpg" alt="Neighbourhood yard sale" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/75 to-white/20" />
      </div>

      <div className="relative w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* LEFT — Text */}
          <div>
            {/* Live badge */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-3 py-1.5 text-[11px] font-semibold text-white shadow-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 animate-ping opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              Now live in Barrhaven
            </div>

            <h1 className="text-[35px] font-semibold tracking-tighter text-gray-900 leading-[1.1] sm:text-[47px] lg:text-[59px]">
              Barrhaven<br />
              neighbourhood<br />
              <span className="text-emerald-700">yardsale — Online.</span>
            </h1>

            <p className="mt-4 text-[15px] text-gray-600 max-w-md leading-relaxed sm:text-[17px]">
              Buy and sell locally through curated weekend Drops.
            </p>
            <p className="mt-1 text-emerald-700 font-semibold text-[13px] sm:text-[15px]">From one home to another.™</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={goBrowse}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-[13px] font-bold text-white shadow-lg hover:bg-emerald-800 transition-all hover:-translate-y-0.5 sm:px-6 sm:text-[15px]"
              >
                Browse the Barrhaven Drop <ArrowRight size={16} />
              </button>
              <button
                onClick={() => goSellerAuth()}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-3 text-[13px] font-bold text-white shadow-lg hover:bg-amber-600 transition-all hover:-translate-y-0.5 sm:px-6 sm:text-[15px]"
              >
                Sell with DropYard <ArrowRight size={16} />
              </button>
            </div>

            <p className="mt-3 text-[11px] text-gray-500 sm:text-[13px]">
              Already have an account?{" "}
              <button onClick={() => goBuyerAuth("login")} className="text-emerald-700 font-semibold hover:underline">
                Log in
              </button>
            </p>
          </div>

          {/* RIGHT — Dynamic Drop card */}
          <div className="hidden lg:block">
            <DynamicDropCard />
          </div>

        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PAGE SECTIONS (to be filled)
// ============================================================================
function HomePage({
  goBuyerAuth,
  goSellerAuth,
  goMovingAuth,
  goBrowse,
  isAuthed,
  goSignin,
}: {
  goBuyerAuth: (mode?: "signup" | "login") => void;
  goSellerAuth: (mode?: "signup" | "login") => void;
  goMovingAuth: (mode?: "signup" | "login") => void;
  goBrowse: () => void;
  isAuthed: boolean;
  goSignin: () => void;
}) {
  // Live "Featured This Week" — fetches the 4 most recent items from the
  // public /api/items endpoint. Initial state is an empty array (NOT the
  // FEATURED_ITEMS demo) so the homepage NEVER renders fake listings to
  // visitors. When the API returns 0 items the section hides entirely.
  // Same honest-empty-state pattern as the Sneak Peek fix (BUG-037).
  const [featuredItems, setFeaturedItems] = useState<typeof FEATURED_ITEMS>([]);
  useEffect(() => {
    let cancelled = false;
    apiRequest<{ items: Array<Record<string, unknown>> }>("/api/items?limit=4")
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.items) ? data.items : [];
        if (list.length === 0) { setFeaturedItems([]); return; }
        const adapted = list.map((api, idx) => {
          const seller = (api.seller as Record<string, unknown>) || {};
          const count = (api._count as Record<string, unknown>) || {};
          const price = Number(api.price) || 0;
          const original = Number(api.originalPrice) > price
            ? Number(api.originalPrice)
            : Math.round(price * 1.6); // synthetic anchor so the discount badge still reads
          // Prefer the first uploaded photo (a full S3 URL) so the homepage
          // surfaces real listings instead of always a category emoji.
          // ItemCard's render branches on URL vs emoji.
          const photos = Array.isArray(api.photos) ? (api.photos as string[]).filter(Boolean) : [];
          const photoOrEmoji = photos[0] || CATEGORY_EMOJI_HOME[(api.category as string) || "OTHER"] || "📦";
          return {
            id:            (api.id as string | number) ?? idx + 1,
            title:         (api.title as string) || "Item",
            price,
            originalPrice: original,
            image:         photoOrEmoji,
            category:      CATEGORY_LABEL_HOME[(api.category as string) || "OTHER"] || "Other",
            seller:        (seller.name as string) || "Neighbour",
            neighborhood:  (seller.neighborhood as string) || "Nearby",
            distance:      "Nearby",
            saves:         Number(count.watchlist) || 0,
            condition:     CONDITION_LABEL_HOME[(api.condition as string) || "GOOD"] || "Used - Good",
          } as typeof FEATURED_ITEMS[number];
        });
        setFeaturedItems(adapted);
      })
      .catch(() => { if (!cancelled) setFeaturedItems([]); /* honest empty state on network blip */ });
    return () => { cancelled = true; };
  }, []);
  const testimonials = [
    {
      id: 1,
      name: "Sarah M.",
      location: "Chapman Mills",
      image: "https://i.pravatar.cc/150?img=44",
      rating: 5,
      text: "Sold my old furniture in one weekend! So much easier than posting on Facebook.",
    },
    {
      id: 2,
      name: "Mike T.",
      location: "Longfields",
      image: "https://i.pravatar.cc/150?img=12",
      rating: 5,
      text: "Found amazing deals on kids' stuff. Love that it's all local pickup.",
    },
    {
      id: 3,
      name: "The Patel Family",
      location: "Half Moon Bay",
      image: "https://i.pravatar.cc/150?img=5",
      rating: 5,
      text: "Our moving sale was a huge success. Sold almost everything!",
    },
  ];

  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0);


  const nextTestimonial = () => {
    setActiveTestimonialIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveTestimonialIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const getCirclePosition = (index: number) => {
    const total = testimonials.length;
    const angle = (index - activeTestimonialIndex) * (360 / total) - 90;
    const radius = 157;
    const x = Math.cos((angle * Math.PI) / 180) * radius;
    const y = Math.sin((angle * Math.PI) / 180) * radius + 36;
    return { x, y };
  };

  return (
    <div>
      {/* HERO */}
      <HeroSection goBuyerAuth={goBuyerAuth} goSellerAuth={goSellerAuth} />

      {/* Trust Bar */}
      <div className="bg-emerald-800 text-white py-4">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-4 md:gap-12">
          {[
            { icon: MapPin, text: "Local pickup · Barrhaven only" },
            { icon: Users, text: "Real neighbours" },
            { icon: Clock, text: "Time-limited Drops" },
            { icon: Recycle, text: "Reuse, not waste" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px]">
              <item.icon size={16} className="text-amber-400" />
              <span className="text-emerald-100">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Featured This Week — only renders when the API returned real
          listings. With no items, the whole section disappears rather than
          showing fake "Patel Family · Kanata North" demo cards. Marketing
          page stays honest; conversion CTA on the bottom of the page is
          unaffected. */}
      {featuredItems.length > 0 && (
      <section className="py-8 md:py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-[23px] md:text-[29px] font-bold text-gray-900">Featured This Week</h2>
              <p className="text-gray-600 mt-1">Hand-picked deals from your neighbors</p>
            </div>
            <button
              onClick={goBrowse}
              className="hidden md:flex items-center gap-2 text-emerald-600 font-medium hover:text-emerald-700"
            >
              View All <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredItems.map((item) => <ItemCard key={item.id} item={item} isAuthed={isAuthed} goSignin={goSignin} />)}
          </div>
          <div className="text-center mt-10">
            <button
              onClick={goBrowse}
              className="bg-emerald-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-emerald-700 inline-flex items-center gap-2"
            >
              Browse All Items <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
      )}

      {/* A Different Kind of Marketplace — design from /preview/feedback/a-different-marketplace */}
      <DifferentMarketplaceSection />

      {/* Coming Soon — Neighbourhood Waitlist */}
      <NeighbourhoodWaitlistSection />





      {/* Two ways to buy & sell — same component used on /for-sellers */}
      <SellingWaysSection />

      <HowItWorksSection />


      {/* Early Access email signup — design from /preview/feedback/early-access-banner */}
      <EarlyAccessSection />

      <section
        className="relative overflow-hidden pt-10 pb-8 md:pt-14 md:pb-10"
        style={{
          background: "linear-gradient(135deg, #FDF6E3 0%, #F9E8C4 45%, #FFE8C0 100%)",
        }}
      >
        <style>{`
          @keyframes lbn-pulse-dot {
            0%, 100% { transform: scale(1); opacity: 0.85; }
            50% { transform: scale(2.4); opacity: 0; }
          }
        `}</style>

        {/* Warm paper texture — radial dot grid in amber */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(180,120,30,0.18) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            opacity: 0.35,
          }}
        />

        {/* Giant decorative quote marks */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-8 left-[6%] select-none font-black leading-none text-amber-700/15"
          style={{ fontSize: "clamp(180px, 22vw, 320px)", fontFamily: "Georgia, serif" }}
        >
          &ldquo;
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-32 right-[6%] select-none font-black leading-none text-emerald-700/12"
          style={{ fontSize: "clamp(180px, 22vw, 320px)", fontFamily: "Georgia, serif" }}
        >
          &rdquo;
        </span>

{/* Glow blobs */}
        <div className="pointer-events-none absolute -left-20 top-1/2 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-emerald-300/15 blur-3xl" />

        <div className="relative z-10 max-w-5xl mx-auto px-4">
          {/* Pulsing eyebrow */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-white/70 px-3.5 py-1.5 backdrop-blur-md shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500" style={{ animation: "lbn-pulse-dot 2.2s ease-out infinite" }} />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-800">Voices from the neighbourhood</span>
            </div>
            <h2 className="mt-4 text-[28px] md:text-[34px] font-semibold tracking-tighter text-amber-950">Loved by neighbors</h2>
            <p className="text-amber-800/70 text-[13px] md:text-[15px] mt-1 italic">Real stories from real communities</p>
          </div>

          <div className="relative min-h-[320px] flex items-center justify-center">
            <div className="hidden lg:block absolute inset-0">
              {testimonials.map((testimonial, index) => {
                const pos = getCirclePosition(index);
                const isActive = index === activeTestimonialIndex;
                return (
                  <div
                    key={testimonial.id}
                    className="absolute left-1/2 top-1/2 cursor-pointer"
                    style={{
                      transform: `translate(${pos.x - 22}px, ${pos.y - 22}px) scale(${isActive ? 1.3 : 0.9})`,
                      zIndex: isActive ? 20 : 10,
                      transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                    onClick={() => setActiveTestimonialIndex(index)}
                  >
                    <div
                      className={`relative w-11 h-11 rounded-full overflow-hidden border-[3px] transition-all duration-300 ${
                        isActive
                          ? "border-emerald-600 shadow-xl shadow-emerald-500/20"
                          : "border-white shadow-lg hover:border-amber-300"
                      }`}
                    >
                      <img src={testimonial.image} alt={testimonial.name} className="w-full h-full object-cover" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="relative z-30 max-w-lg mx-auto mt-4">
              <div className="bg-white rounded-2xl shadow-2xl shadow-amber-300/30 ring-1 ring-amber-200/50 px-6 pt-8 pb-5 text-center">
                <p className="text-[13px] lg:text-[15px] text-gray-700 leading-relaxed mb-3.5 italic">
                  &ldquo;{testimonials[activeTestimonialIndex].text}&rdquo;
                </p>
                <h3 className="text-[15px] font-bold text-gray-900 mb-0.5">
                  {testimonials[activeTestimonialIndex].name}
                </h3>
                <p className="text-emerald-700 text-[11px] mb-1.5">
                  {testimonials[activeTestimonialIndex].location}
                </p>
                <div className="flex items-center justify-center gap-1 text-amber-400 text-[13px]">
                  {Array.from({ length: testimonials[activeTestimonialIndex].rating }).map((_, i) => (
                    <span key={`star-${i}`}>★</span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={prevTestimonial}
                  className="w-11 h-11 sm:w-9 sm:h-9 rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={nextTestimonial}
                  className="w-11 h-11 sm:w-9 sm:h-9 rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA — design from /preview/feedback/ready-to-join-banner.
          The buttons keep their original wired handlers (goBuyerAuth / goSellerAuth);
          the visual treatment (dark green, amber-accented headline, glow blobs,
          hover arrow) comes from the new design. */}
      <section className="relative w-full bg-[#0f5c3b] py-8 md:py-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 top-0 w-[400px] h-[400px] bg-[#2f8a22]/20 rounded-full blur-3xl" />
          <div className="absolute right-0 bottom-0 w-[400px] h-[400px] bg-[#ff9412]/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto text-center">
          <h2 className="text-[29px] sm:text-[35px] lg:text-[47px] font-semibold tracking-tighter text-white leading-tight">
            Ready to join your neighbourhood&rsquo;s next
            <span className="text-[#ff9412]"> Drop?</span>
          </h2>

          <p className="mt-4 text-[15px] sm:text-[17px] text-white/80 max-w-xl mx-auto">
            Sign up now and start buying or selling this weekend
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => goBuyerAuth()}
              className="group inline-flex items-center gap-3 rounded-full bg-white px-8 py-3 text-[13px] font-bold text-[#0f5c3b] shadow-[0_10px_25px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1"
            >
              <ShoppingBag className="h-5 w-5" />
              Join as a Buyer
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition" />
            </button>

            <button
              onClick={() => goSellerAuth()}
              className="group inline-flex items-center gap-3 rounded-full bg-[#ff9412] px-8 py-3 text-[13px] font-bold text-white shadow-[0_10px_25px_rgba(255,148,18,0.35)] transition duration-300 hover:-translate-y-1 hover:bg-[#e8830f]"
            >
              <Package className="h-5 w-5" />
              Start Selling
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition" />
            </button>
          </div>

          <p className="mt-6 text-[10px] text-white/60 tracking-wide">
            No fees &middot; Takes 60 seconds &middot; No spam
          </p>
        </div>
      </section>
    </div>
  );
}



export function Footer({
  goBuyerAuth,
  goSellerAuth,
  goMovingAuth,
  setPage,
}: {
  goBuyerAuth: (mode?: "signup" | "login") => void;
  goSellerAuth: (mode?: "signup" | "login") => void;
  goMovingAuth: (mode?: "signup" | "login") => void;
  setPage: (p: string) => void;
}) {
  return (
    <footer className="relative bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 text-white pt-14 pb-6 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-20 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl translate-y-1/2" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-1 -mt-8 -ml-10">
              {/* Footer uses Logo_1.png — icon + wordmark, no tagline. Negative ml compensates for whitespace baked into the PNG. */}
              <img src="/Logo_1.png" alt="DropYard" className="h-28 w-auto object-contain" />
            </div>
            <p className="text-slate-300 text-[13px] leading-relaxed max-w-xs -mt-4">
              DropYard brings back the simplicity of yard sales—without the hassle of setting up in your driveway.
            </p>
            <div className="flex items-center gap-3 mt-5">
              {[
                { icon: Instagram, label: "Instagram", hover: "hover:bg-pink-500" },
                { icon: Facebook, label: "Facebook", hover: "hover:bg-blue-600" },
                { icon: Twitter, label: "Twitter / X", hover: "hover:bg-sky-500" },
                { icon: Youtube, label: "YouTube", hover: "hover:bg-red-600" },
                { icon: Linkedin, label: "LinkedIn", hover: "hover:bg-blue-700" },
              ].map(({ icon: Icon, label, hover }) => (
                <button
                  key={label}
                  aria-label={label}
                  className={`w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-110 hover:shadow-lg ${hover}`}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-emerald-400 text-[13px] uppercase tracking-wider">Discover</h4>
            <div className="flex flex-col gap-3">
              <button onClick={() => setPage("howitworks")} className="inline-block w-fit cursor-pointer text-left text-[13px] font-medium text-slate-300 transition-all duration-200 hover:translate-x-2 hover:text-emerald-300 hover:font-bold">How it Works</button>
              <button onClick={() => setPage("buyers")} className="inline-block w-fit cursor-pointer text-left text-[13px] font-medium text-slate-300 transition-all duration-200 hover:translate-x-2 hover:text-emerald-300 hover:font-bold">Browse Items</button>
              <button onClick={() => setPage("buyers")} className="inline-block w-fit cursor-pointer text-left text-[13px] font-medium text-slate-300 transition-all duration-200 hover:translate-x-2 hover:text-emerald-300 hover:font-bold">For Buyers</button>
              <button onClick={() => setPage("sellers")} className="inline-block w-fit cursor-pointer text-left text-[13px] font-medium text-slate-300 transition-all duration-200 hover:translate-x-2 hover:text-emerald-300 hover:font-bold">For Sellers</button>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-amber-400 text-[13px] uppercase tracking-wider">For Sellers</h4>
            <div className="flex flex-col gap-3">
              <button onClick={() => goSellerAuth()} className="inline-block w-fit cursor-pointer text-left text-[13px] font-medium text-slate-300 transition-all duration-200 hover:translate-x-2 hover:text-amber-300 hover:font-bold">Weekly Drop</button>
              <button onClick={() => goSellerAuth()} className="inline-block w-fit cursor-pointer text-left text-[13px] font-medium text-slate-300 transition-all duration-200 hover:translate-x-2 hover:text-amber-300 hover:font-bold">The Shelf</button>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-emerald-400 text-[13px] uppercase tracking-wider">Company</h4>
            <div className="flex flex-col gap-3">
              <a href="/about" className="inline-block w-fit cursor-pointer text-left text-[13px] font-medium text-slate-300 transition-all duration-200 hover:translate-x-2 hover:text-emerald-300 hover:font-bold">About Us</a>
              <a href="/contact" className="inline-block w-fit cursor-pointer text-left text-[13px] font-medium text-slate-300 transition-all duration-200 hover:translate-x-2 hover:text-emerald-300 hover:font-bold">Contact Us</a>
              <a href="/faq" className="inline-block w-fit cursor-pointer text-left text-[13px] font-medium text-slate-300 transition-all duration-200 hover:translate-x-2 hover:text-emerald-300 hover:font-bold">FAQ</a>
              <a href="/community-guidelines" className="inline-block w-fit cursor-pointer text-left text-[13px] font-medium text-slate-300 transition-all duration-200 hover:translate-x-2 hover:text-emerald-300 hover:font-bold">Community Guidelines</a>
              <a href="/privacy-policy" className="inline-block w-fit cursor-pointer text-left text-[13px] font-medium text-slate-300 transition-all duration-200 hover:translate-x-2 hover:text-emerald-300 hover:font-bold">Privacy Policy</a>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-emerald-400 text-[13px] uppercase tracking-wider">Join Free</h4>
            <div className="flex flex-col gap-3">
              <button onClick={() => goBuyerAuth("signup")} className="inline-block w-fit cursor-pointer text-left text-[13px] font-medium text-slate-300 transition-all duration-200 hover:translate-x-2 hover:text-white hover:font-bold">Sign up</button>
              <button onClick={() => goBuyerAuth("login")} className="inline-block w-fit cursor-pointer text-left text-[13px] font-medium text-slate-300 transition-all duration-200 hover:translate-x-2 hover:text-white hover:font-bold">Log in</button>
              <a href="/help-center" className="inline-block w-fit cursor-pointer text-left text-[13px] font-medium text-slate-300 transition-all duration-200 hover:translate-x-2 hover:text-white hover:font-bold">Help Center</a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700/80 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-400 text-[13px]">© 2026 DropYard. All rights reserved.</p>
          <div className="flex items-center gap-6 text-[13px]">
            <a href="/privacy-policy" className="inline-block cursor-pointer text-slate-400 underline-offset-4 decoration-2 decoration-emerald-400 transition-all duration-300 ease-out hover:text-white hover:underline">Privacy Policy</a>
            <a href="/terms-of-service" className="inline-block cursor-pointer text-slate-400 underline-offset-4 decoration-2 decoration-amber-400 transition-all duration-300 ease-out hover:text-white hover:underline">Terms of Service</a>
            <a href="/contact" className="inline-block cursor-pointer text-slate-400 underline-offset-4 decoration-2 decoration-emerald-400 transition-all duration-300 ease-out hover:text-white hover:underline">Contact</a>
          </div>
        </div>

        {/* BUG-070 — Required CC BY 4.0 attribution for the Geonames postal
            code dataset used to compute neighbor distance. */}
        <p className="text-slate-500 text-[11px] text-center mt-4">
          Postal code data: <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">Geonames</a>, licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">CC BY 4.0</a>.
        </p>
      </div>
    </footer>
  );
}
