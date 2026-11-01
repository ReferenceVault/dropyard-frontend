"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  getDropCycleInfo,
  nextDropMoment,
  dropCloseMoment,
} from "@/lib/dropCycle";
import {
  Search, Heart, Clock, MapPin, Package, ChevronRight,
  TrendingDown, DollarSign, Shield, Eye,
  Sparkles, MessageCircle, ArrowRight,
  Tag, Star,
} from "lucide-react";
import TrustedLocallyStats from "@/components/TrustedLocallyStats";
import BuyingStepsSection from "@/components/BuyingStepsSection";
import ShopWaysSection from "@/components/ShopWaysSection";
import BuyerPerksSection from "@/components/BuyerPerksSection";
import { apiRequest } from "@/lib/api";

// Backend item shape for the public /api/items response (subset we use).
type ApiItem = {
  id?: string;
  title?: string;
  price?: number;
  originalPrice?: number | null;
  photos?: string[];
  category?: string;
  placement?: string;
  status?: string;
  createdAt?: string;
};

// Marketing card shape that the two grids below render against. Same shape
// as the original demo arrays — keeps the JSX render path stable.
type DropCard  = { id: string | number; t: string; p: number; op: number | null; img: string; cat: string };
type ShelfCard = { id: string | number; t: string; p: number; op: number | null; img: string; days: number; pd: boolean };

// Category emoji fallback for items without a photo.
const CATEGORY_EMOJI_FOR_BUYERS: Record<string, string> = {
  FURNITURE:   "\u{1F6CB}\u{FE0F}",
  ELECTRONICS: "\u{1F4F1}",
  CLOTHING:    "\u{1F455}",
  KITCHEN:     "\u{1F373}",
  KIDS:        "\u{1F9F8}",
  SPORTS:      "\u{1F3BE}",
  BOOKS:       "\u{1F4DA}",
  HOME:        "\u{1F3E0}",
  TOOLS:       "\u{1F527}",
  OTHER:       "\u{1F4E6}",
};
function categoryLabel(cat?: string): string {
  if (!cat) return "Other";
  return cat.charAt(0) + cat.slice(1).toLowerCase();
}

const C = {
  gLightBg: "#F3F8F3", gSoft: "#E2EFE0", gAccent: "#9CC896",
  gPrimary: "#33802B", gHover: "#2C6126", gDark: "#0F360B",
  oLightBg: "#FFF7ED", oSoft: "#FED7AA", oAccent: "#FDBA74",
  oPrimary: "#f59e0b", oHover: "#d97706", oDark: "#92400e",
  tPrimary: "#2C6126", tLight: "#CCFBF1", tSoft: "#99F6E4",
  ai: "#7C3AED", aiLight: "#F5F3FF",
  wa: "#25D366",
};

// Demo arrays were removed alongside the BUG-035 wiring — this marketing
// page now reads real items from /api/items. The "This Week's Picks" and
// "On the Shelf" sections hide entirely when the marketplace is empty, so
// prospective buyers never see fake "Sectional Sofa / iPhone 13" listings
// that no neighbour is actually offering.

const pad = (n: number) => String(n).padStart(2, "0");

export default function ForBuyersPage() {
  const router = useRouter();
  // BUG-074 — generic auth CTAs default to /join?mode=signin so returning
  // users land on the right form. /join surfaces a prominent Sign-In /
  // Sign-Up toggle so new visitors switch in one click.
  const go = () => router.push("/join?mode=signin");
  // BUG-073 — "Browse the Shelf" buttons route to /buyer (gates anon
  // visitors to /join, lets signed-in users straight to Discover).
  const goShelf = () => router.push("/buyer");

  // Real phase-aware countdown. During LIVE phase, counts down to drop close
  // (Sunday 8 PM) and labels itself "Drop ends in". Any other phase counts
  // down to drop open (Saturday 8 AM) and labels itself "Drop opens in".
  // SSR-safe: `now` starts null so first server + client render match (zeros).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const { totalSec, countdownLabel } = useMemo(() => {
    if (!now) return { totalSec: 0, countdownLabel: "Drop opens in" };
    const info = getDropCycleInfo(now);
    const isLive = info.phase === "LIVE";
    const target = isLive ? dropCloseMoment(now) : nextDropMoment(now);
    return {
      totalSec: Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000)),
      countdownLabel: isLive ? "Drop ends in" : "Drop opens in",
    };
  }, [now]);
  const cd = {
    h: Math.floor(totalSec / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };

  // Real listings for the two preview grids. Both start empty so SSR and
  // first client paint render nothing — the sections hide entirely until
  // the API responds. No demo fallback (same honest-empty pattern as the
  // homepage Featured fix). The fetch runs once on mount; this is a
  // marketing surface, not a live dashboard, so it doesn't need refreshing.
  const [dropItems,  setDropItems]  = useState<DropCard[]>([]);
  const [shelfItems, setShelfItems] = useState<ShelfCard[]>([]);
  useEffect(() => {
    let cancelled = false;
    apiRequest<{ items: ApiItem[] }>("/api/items?limit=12")
      .then(({ items }) => {
        if (cancelled) return;
        const list = Array.isArray(items) ? items : [];
        const photoOrEmoji = (it: ApiItem): string => {
          const photos = Array.isArray(it.photos) ? it.photos.filter(Boolean) : [];
          return photos[0] || CATEGORY_EMOJI_FOR_BUYERS[(it.category as string) || "OTHER"] || "\u{1F4E6}";
        };
        const drops = list
          .filter((i) => i.placement === "DROP" && i.status === "LIVE")
          .slice(0, 4)
          .map((i, idx): DropCard => ({
            id:  i.id ?? "drop-" + idx,
            t:   i.title || "Item",
            p:   Number(i.price) || 0,
            op:  Number(i.originalPrice) > Number(i.price) ? Number(i.originalPrice) : null,
            img: photoOrEmoji(i),
            cat: categoryLabel(i.category),
          }));
        const shelf = list
          .filter((i) => i.placement === "SHELF" && i.status === "LIVE")
          .slice(0, 4)
          .map((i, idx): ShelfCard => {
            const createdMs = i.createdAt ? new Date(i.createdAt).getTime() : Date.now();
            const days = Math.max(1, Math.floor((Date.now() - createdMs) / 86400000));
            return {
              id:   i.id ?? "shelf-" + idx,
              t:    i.title || "Item",
              p:    Number(i.price) || 0,
              op:   Number(i.originalPrice) > Number(i.price) ? Number(i.originalPrice) : null,
              img:  photoOrEmoji(i),
              days,
              pd:   Number(i.originalPrice) > Number(i.price),
            };
          });
        setDropItems(drops);
        setShelfItems(shelf);
      })
      .catch(() => { if (!cancelled) { setDropItems([]); setShelfItems([]); } });
    return () => { cancelled = true; };
  }, []);

  // Tiny inline render helper: photo URL → <img>; emoji fallback → text.
  // Mirrors the <ItemImage> helper in the buyer dashboard.
  const isImageUrl = (s: string): boolean => /^(https?:\/\/|data:image\/)/i.test(s);

  return (
    <div className="min-h-full flex flex-col">

      {/* ═══ 1. HERO ═══ */}
      <section style={{ position: "relative", overflow: "hidden", background: `linear-gradient(165deg,${C.gDark} 0%,${C.gHover} 50%,${C.gPrimary} 100%)`, padding: "60px 24px 56px" }}>
        <style>{`
          @keyframes dy-pulse-ring {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(2.4); opacity: 0; }
          }
          @keyframes dy-tile-pop {
            0% { transform: scale(0.96); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>

        {/* Subtle dot-grid texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            opacity: 0.05,
            pointerEvents: "none",
          }}
        />

        {/* Multiple glow blobs for depth */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 400, height: 400, borderRadius: "50%", background: C.gAccent, opacity: 0.08, filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: -60, left: "10%", width: 320, height: 320, borderRadius: "50%", background: C.oAccent, opacity: 0.10, filter: "blur(60px)" }} />
        <div style={{ position: "absolute", top: "35%", left: -100, width: 280, height: 280, borderRadius: "50%", background: "#FED7AA", opacity: 0.05, filter: "blur(80px)" }} />

        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          {/* Pulsing live badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 16px", borderRadius: 50, backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", marginBottom: 22, backdropFilter: "blur(8px)" }}>
            <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", backgroundColor: "#3A8E31", animation: "dy-pulse-ring 2s ease-out infinite" }} />
              <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8, borderRadius: "50%", backgroundColor: "#3A8E31" }} />
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.92)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
              This week&apos;s Drop is live · 40+ items
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(31px,5vw,55px)", fontWeight: 600, color: "#fff", lineHeight: 1.05, marginBottom: 14, letterSpacing: "-0.05em" }}>
            For{" "}
            <span style={{ position: "relative", display: "inline-block", color: C.oAccent }}>
              Buyers
              <span
                style={{
                  position: "absolute",
                  left: "5%",
                  right: "5%",
                  bottom: -6,
                  height: 6,
                  borderRadius: 3,
                  background: `linear-gradient(90deg, transparent, ${C.oAccent}, transparent)`,
                  opacity: 0.55,
                }}
              />
            </span>
          </h1>

          <p style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.96)", marginBottom: 10 }}>Shop locally. Simply.</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.62)", maxWidth: 680, margin: "0 auto 22px", lineHeight: 1.7 }}>
            Discover amazing deals from your neighbours through curated weekend Drops, always-on Shelf listings. Quality items at great prices, just around the corner.
          </p>

          {/* Benefit chips */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 26, flexWrap: "wrap" }}>
            {[
              { e: "💰", t: "50–70% off retail" },
              { e: "📍", t: "Walking distance" },
              { e: "🛡️", t: "Verified neighbours" },
            ].map((c, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.88)",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  padding: "6px 12px",
                  borderRadius: 50,
                  backdropFilter: "blur(8px)",
                  animation: `dy-tile-pop 0.5s ${0.15 * i}s ease-out backwards`,
                }}
              >
                <span style={{ fontSize: 14 }}>{c.e}</span> {c.t}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 26, flexWrap: "wrap" }}>
            <button onClick={go} style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 14, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, backgroundColor: C.oPrimary, color: "#0F360B", boxShadow: "0 8px 28px rgba(245,158,11,0.35)" }}>
              Join This Week&apos;s Drop <ChevronRight size={18} />
            </button>
            <button onClick={() => router.push("/join?mode=signin")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 14, fontWeight: 700, backgroundColor: "rgba(255,255,255,0.06)", color: "#fff" }}>
              I Have an Account
            </button>
          </div>

          {/* Live countdown — now with unit labels */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "8px 18px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
            <Clock size={14} style={{ color: C.gAccent }} />
            <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.15em" }}>{countdownLabel}</span>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {[
                { v: pad(cd.h), label: "Hrs" },
                { v: pad(cd.m), label: "Min" },
                { v: pad(cd.s), label: "Sec" },
              ].map((u, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: "#fff", backgroundColor: "rgba(255,255,255,0.15)", padding: "3px 8px", borderRadius: 6, letterSpacing: 1, minWidth: 36, textAlign: "center", fontVariantNumeric: "tabular-nums" as const }}>{u.v}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{u.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 2. THIS WEEK'S PICKS ═══
          Only renders when the marketplace has live DROP items. Empty
          marketplace → section disappears entirely, no fake content. */}
      {dropItems.length > 0 && (
      <section style={{ padding: "24px 24px", backgroundColor: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.gPrimary, textTransform: "uppercase", letterSpacing: 2 }}>This Week</span>
            <h2 style={{ fontSize: 27, fontWeight: 600, color: C.gDark, marginTop: 4, letterSpacing: "-0.025em" }}>This Week&apos;s Picks</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
            {dropItems.map((item, i) => {
              const d = item.op ? Math.round((1 - item.p / item.op) * 100) : 0;
              return (
                <div key={item.id}
                  style={{ borderRadius: 16, border: "1px solid #f0f0f0", overflow: "hidden", backgroundColor: "#fff", transition: "all 0.2s", cursor: "pointer" }}
                  onClick={go}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 28px rgba(0,0,0,0.06)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
                  <div style={{ height: 140, backgroundColor: C.gLightBg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                    {isImageUrl(item.img) ? (
                      <img src={item.img} alt={item.t} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}/>
                    ) : (
                      <span style={{ fontSize: 44 }}>{item.img}</span>
                    )}
                    {d > 0 && <span style={{ position: "absolute", top: 10, right: 10, fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 8, backgroundColor: "#DC2626", color: "#fff" }}>-{d}%</span>}
                    <div style={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, backgroundColor: C.gDark, color: "#fff" }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#3A8E31" }} />
                      <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: 0.7 }}>LIVE</span>
                    </div>
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.gDark }}>{item.t}</p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 3 }}>
                      <span style={{ fontSize: 20, fontWeight: 900, color: C.gPrimary }}>${item.p}</span>
                      {item.op && <span style={{ fontSize: 12, color: "#ccc", textDecoration: "line-through" }}>${item.op}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button onClick={go} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 24px", borderRadius: 10, border: `1.5px solid ${C.gPrimary}`, cursor: "pointer", fontSize: 13, fontWeight: 700, backgroundColor: "#fff", color: C.gPrimary }}>
              Browse All Drop Items <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>
      )}

      {/* ═══ 3. THREE WAYS TO SHOP — design from /preview/feedback/two-ways-to-shop ═══ */}
      <ShopWaysSection />

      {/* ═══ 5. ON THE SHELF ═══
          Same conditional render as Section 2 — hides when no real SHELF
          items are live, so visitors never see fake "Standing Desk / Yoga
          Mat" placeholder cards. */}
      {shelfItems.length > 0 && (
      <section style={{ padding: "24px 24px", backgroundColor: C.oLightBg }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: C.oPrimary, textTransform: "uppercase", letterSpacing: 2 }}>No Countdown Needed</span>
              <h2 style={{ fontSize: 27, fontWeight: 600, color: C.gDark, marginTop: 4, letterSpacing: "-0.025em" }}>On the Shelf Right Now</h2>
              <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Available right now — no waiting for Saturday.</p>
            </div>
            <button onClick={goShelf} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: C.oPrimary, background: "none", border: "none", cursor: "pointer" }}>Browse the Shelf <ChevronRight size={14} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
            {shelfItems.map((item) => (
              <div key={item.id}
                style={{ borderRadius: 16, border: "1px solid #f0f0f0", overflow: "hidden", backgroundColor: "#fff", transition: "all 0.2s", cursor: "pointer" }}
                onClick={go}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 28px rgba(0,0,0,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
                <div style={{ height: 120, backgroundColor: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                  {isImageUrl(item.img) ? (
                    <img src={item.img} alt={item.t} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}/>
                  ) : (
                    <span style={{ fontSize: 38 }}>{item.img}</span>
                  )}
                  <div style={{ position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", gap: 3, padding: "3px 7px", borderRadius: 6, backgroundColor: C.oPrimary, color: "#0F360B" }}>
                    <Package size={8} /><span style={{ fontSize: 7, fontWeight: 800 }}>SHELF</span>
                  </div>
                  {item.pd && <div style={{ position: "absolute", top: 8, right: 8, display: "flex", alignItems: "center", gap: 3, padding: "3px 7px", borderRadius: 6, backgroundColor: "#DC2626", color: "#fff" }}>
                    <TrendingDown size={8} /><span style={{ fontSize: 7, fontWeight: 800 }}>PRICE DROP</span>
                  </div>}
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.gDark }}>{item.t}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: C.gPrimary }}>${item.p}</span>
                    {item.op && <span style={{ fontSize: 11, color: "#ccc", textDecoration: "line-through" }}>${item.op}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 9, fontWeight: 600, color: C.oDark, padding: "3px 6px", borderRadius: 4, backgroundColor: C.oLightBg }}>
                    <Package size={8} style={{ color: C.oPrimary }} />{item.days}d ago{item.pd && <span style={{ color: "#DC2626", fontWeight: 700 }}> — reduced!</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ═══ 6. WHY BUY — design from /preview/feedback/the-perk ═══ */}
      <BuyerPerksSection />

      {/* ═══ 7. HOW BUYING WORKS — design from /preview/feedback/simple-steps ═══ */}
      <BuyingStepsSection />

      {/* ═══ 8. STATS — design from /preview/feedback/trusted-locally ═══ */}
      <TrustedLocallyStats />

      {/* ═══ 9. CTA ═══ */}
      <section style={{ padding: "56px 24px", background: `linear-gradient(165deg,${C.gDark},${C.gHover})`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: "20%", width: 200, height: 200, borderRadius: "50%", background: C.gAccent, opacity: 0.05 }} />
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <h2 style={{ fontSize: "clamp(23px,4vw,35px)", fontWeight: 600, color: "#fff", marginBottom: 8, letterSpacing: "-0.025em" }}>Ready to find your next deal?</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 24, lineHeight: 1.6 }}>
            Join your neighbourhood&apos;s next Drop and discover amazing local finds. Or browse the Shelf right now — no waiting required.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={go} style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 14, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, backgroundColor: C.oPrimary, color: "#0F360B", boxShadow: "0 8px 28px rgba(245,158,11,0.35)" }}>
              Join This Week&apos;s Drop <ChevronRight size={18} />
            </button>
            <button onClick={goShelf} style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 15, fontWeight: 700, backgroundColor: "rgba(255,255,255,0.06)", color: "#fff" }}>
              <Package size={16} /> Browse the Shelf
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
