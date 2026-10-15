"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Clock3,
  Package,
  ShoppingBag,
  Store,
  ArrowRight,
  Eye,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getDropCycleInfo, nextDropMoment, dropCloseMoment } from "@/lib/dropCycle";

// Public marketing card — every number on it now comes from the live drop
// cycle + `/api/items`. The DEMO_* arrays below are only a fallback used when
// the marketplace has no items at all (e.g. first deploy), so the card still
// renders something instead of going blank.
const CATEGORY_EMOJI = {
  FURNITURE:   "🛋️",
  ELECTRONICS: "📱",
  SPORTS:      "⚽",
  HOME:        "🏠",
  CLOTHING:    "👕",
  BOOKS:       "📚",
  OTHER:       "📦",
};
const DEMO_PREVIEW_ITEMS = [
  { id: "d1", name: "Sample listing",      price: 0, icon: "📦", watchers: 0 },
  { id: "d2", name: "Sample listing",      price: 0, icon: "📦", watchers: 0 },
  { id: "d3", name: "Sample listing",      price: 0, icon: "📦", watchers: 0 },
];

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function CountdownUnit({ value, label }) {
  return (
    <div className="rounded-xl bg-[#066544] px-2.5 py-1.5 text-center text-white ring-1 ring-white/10">
      <div className="text-lg font-bold tracking-tight">{String(value).padStart(2, "0")}</div>
      <div className="text-[9px] font-medium uppercase tracking-widest text-emerald-100">{label}</div>
    </div>
  );
}

function PreviewRow({ item, index }) {
  const labels = ["Be Ready", "Launching Soon", "Watch Item"];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.07 }}
      className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2.5 shadow-sm ring-1 ring-slate-100"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-lg ring-1 ring-amber-100">
          {item.icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">{item.name}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-semibold text-emerald-700">${item.price}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{item.watchers}</span>
          </div>
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        {labels[index % labels.length]}
      </span>
    </motion.div>
  );
}

function LiveRow({ item, index }) {
  const isAvailable = item.status === "available";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.07 }}
      className="flex items-center justify-between gap-2 rounded-xl bg-white/85 px-3 py-2.5 shadow-sm ring-1 ring-slate-100"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-lg ring-1 ring-emerald-100">
          {item.icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">{item.name}</div>
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-emerald-700">${item.price}</span>
            {isAvailable ? " · Going fast" : " · Claimed"}
          </div>
        </div>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
        {item.label}
      </span>
    </motion.div>
  );
}

export default function DynamicDropCard() {
  const router = useRouter();
  // `now` is intentionally null on the first render so SSR and the initial
  // client render produce identical markup (no hydration mismatch). The
  // useEffect below seeds it to `new Date()` immediately after mount and
  // ticks every second after that. While null, downstream computed values
  // fall back to placeholder zeros — a sub-frame flicker that's visually
  // imperceptible vs the alternative of throwing on hydration.
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Real drop cycle — Mon-Wed SUBMISSION, Thu-Fri PREVIEW, Sat 8am-Sun 8pm LIVE,
  // Sun 8pm-Mon midnight CLOSED. The card surfaces two states ("countdown" vs
  // "live"). The countdown ALWAYS points at the next Drop-opening moment
  // (Saturday 8 AM) when we're not live, never at intermediate phase
  // boundaries — otherwise during SUBMISSION the label "Live in 19h" would
  // really be counting down to PREVIEW phase, when items aren't claimable.
  const dropInfo = useMemo(() => (now ? getDropCycleInfo(now) : null), [now]);
  const isLive = dropInfo?.phase === "LIVE";
  const targetAt = useMemo(() => {
    if (!now || !dropInfo) return null;
    return isLive ? dropCloseMoment(now) : nextDropMoment(now);
  }, [now, dropInfo, isLive]);
  const remaining = targetAt && now
    ? Math.max(targetAt.getTime() - now.getTime(), 0)
    : 0;

  // Warm /buyer once the Drop is live so the CTA lands instantly instead of
  // paying for that route's first-load bundle at click time. Declared after
  // `isLive` — referencing it from the dep array any earlier is a TDZ crash.
  useEffect(() => {
    if (isLive) router.prefetch("/buyer");
  }, [isLive, router]);
  const time = useMemo(() => formatDuration(remaining), [remaining]);

  // Live items + stats pulled from /api/items. Total + unique sellers compute
  // off the same payload (we ask for 12 so the per-seller count is meaningful
  // even though the card only renders 3).
  const [liveItems, setLiveItems] = useState(DEMO_PREVIEW_ITEMS);
  const [previewItems, setPreviewItems] = useState(DEMO_PREVIEW_ITEMS);
  const [totalCount, setTotalCount] = useState(null);
  const [sellersCount, setSellersCount] = useState(null);
  useEffect(() => {
    let cancelled = false;
    apiRequest("/api/items?limit=12")
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.items) ? data.items : [];
        if (list.length === 0) return;
        // Cheap "watcher" proxy until we surface the real count from
        // /api/items — _count.watchlist is included on every item.
        const adapted = list.slice(0, 3).map((api) => ({
          id:       api.id,
          name:     api.title || "Item",
          price:    Number(api.price) || 0,
          icon:     CATEGORY_EMOJI[api.category] || "📦",
          watchers: Number(api._count?.watchlist) || 0,
          claimed:  api.status === "CLAIMED" || api.status === "SOLD",
        }));
        const liveList = adapted.map((it) => ({
          ...it,
          status: it.claimed ? "claimed" : "available",
          label:  it.claimed ? "Just Claimed" : "Claim Now",
        }));
        setPreviewItems(adapted);
        setLiveItems(liveList);
        setTotalCount(typeof data?.total === "number" ? data.total : list.length);
        const sellerIds = new Set(list.map((i) => i.seller?.id).filter(Boolean));
        setSellersCount(sellerIds.size);
      })
      .catch(() => { /* keep demo fallback */ });
    return () => { cancelled = true; };
  }, []);

  // "Waiting" during the countdown = total watchlist saves across the items
  // we know about. Easy to compute from previewItems' watchers field.
  const waitingCount = useMemo(
    () => previewItems.reduce((acc, it) => acc + (it.watchers || 0), 0),
    [previewItems]
  );
  // "Claimed" while live = items with claimed === true.
  const claimedCount = useMemo(
    () => liveItems.filter((it) => it.claimed).length,
    [liveItems]
  );

  return (
    <div className="w-full max-w-sm ml-auto rounded-2xl bg-white shadow-xl ring-1 ring-slate-200/80 overflow-hidden">
      {/* Header */}
      <div className={`relative overflow-hidden px-4 py-3.5 text-white ${isLive ? "bg-emerald-700" : "bg-gradient-to-r from-emerald-700 to-emerald-600"}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%)]" />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold ring-1 ring-white/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                  LIVE NOW
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold ring-1 ring-white/20">
                  <Bell className="h-3 w-3" />
                  GOING LIVE SOON
                </span>
              )}
            </div>
            <h2 className="text-base font-bold leading-tight">Barrhaven {isLive ? "Live Drop" : "Drop"}</h2>
            <p className="mt-0.5 text-xs text-emerald-100">
              {isLive ? "Jump in before items are gone." : `Live in ${time.days}d ${time.hours}h ${time.minutes}m`}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={isLive ? "live" : "countdown"}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-1 shrink-0"
            >
              {isLive ? (
                <div className="rounded-xl bg-[#066544] px-3 py-1.5 text-xs font-semibold tracking-wide text-emerald-100 ring-1 ring-white/10">
                  NOW
                </div>
              ) : (
                <>
                  {/* Days only when there are any. Without this the boxes read
                      "04 HRS" two days out — the hours are the remainder after
                      whole days, so the card looked four hours away when it was
                      two and a bit. "00 DAYS" on Drop day would just be noise. */}
                  {time.days > 0 && <CountdownUnit value={time.days} label="Days" />}
                  <CountdownUnit value={time.hours} label="Hrs" />
                  <CountdownUnit value={time.minutes} label="Min" />
                  <CountdownUnit value={time.seconds} label="Sec" />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Stats — live from /api/items. The em-dash fallback only shows in the
          unlikely case that the API call failed AND we have no demo data; the
          card otherwise renders honest counts. */}
      <div className="grid grid-cols-3 border-b border-slate-100 bg-slate-50">
        {[
          { icon: Package,    value: totalCount  == null ? "—" : (isLive ? String(totalCount) : `${totalCount}+`), label: isLive ? "Items Live" : "Dropping", color: "text-slate-900" },
          { icon: ShoppingBag, value: (isLive ? claimedCount : waitingCount) || 0,                                  label: isLive ? "Claimed" : "Watching", color: isLive ? "text-emerald-600" : "text-amber-500" },
          { icon: Store,      value: sellersCount == null ? "—" : sellersCount,                                     label: "Sellers", color: "text-amber-500" },
        ].map(({ icon: Icon, value, label, color }) => (
          <div key={label} className="border-r last:border-r-0 border-slate-200 py-3 text-center">
            <Icon className="mx-auto h-3.5 w-3.5 text-slate-400" />
            <div className={`mt-0.5 text-xl font-bold tracking-tight ${color}`}>{value}</div>
            <div className="text-[11px] text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-2 p-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={isLive ? "live-list" : "preview-list"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-2"
          >
            {isLive
              ? liveItems.map((item, i) => <LiveRow key={item.id} item={item} index={i} />)
              : previewItems.map((item, i) => <PreviewRow key={item.id} item={item} index={i} />)}
          </motion.div>
        </AnimatePresence>

        {/* BUG-071 — these used to be href="#" and did nothing on click.
            Now:
              isLive → "/buyer" (the /buyer route gates anon visitors to /join,
                       so this works for both signed-in and signed-out users)
              isLive false → smooth-scroll to the Early Access waitlist
                       (#early-access anchor on this same page)

            BUG-081 — the live branch used to let the browser follow the href,
            which in the App Router is a FULL document reload: the whole React
            tree is torn down and /buyer's bundle (both 1.4 MB dashboards are
            static-imported there — see BUG-077C) is re-fetched and re-executed
            before anything repaints. The old page stays on screen the whole
            time, so the button reads as unresponsive. Now routed client-side.
            The href stays for middle-click / open-in-new-tab / right-click. */}
        <motion.a
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.99 }}
          href={isLive ? "/buyer" : "#early-access"}
          onClick={(e) => {
            // Never hijack modified clicks — those mean "open in a new tab".
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            if (isLive) { router.push("/buyer"); return; }
            // Same-page anchor — smooth scroll instead of the jarring jump
            // browsers do by default.
            const target = typeof document !== "undefined" ? document.getElementById("early-access") : null;
            if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
            else if (typeof window !== "undefined") window.location.hash = "early-access";
          }}
          className={`mt-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition ${isLive ? "bg-emerald-700 hover:bg-emerald-800" : "bg-slate-900 hover:bg-slate-800"}`}
        >
          {isLive ? <><Zap className="h-4 w-4" />Enter the Live Drop</> : <><Bell className="h-4 w-4" />Get Notified</>}
          <ArrowRight className="h-4 w-4" />
        </motion.a>

        <p className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          {isLive
            ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />Items being claimed in real time.</>
            : <><Clock3 className="h-3.5 w-3.5 text-amber-600" />Be first in line when it opens.</>}
        </p>
      </div>
    </div>
  );
}
