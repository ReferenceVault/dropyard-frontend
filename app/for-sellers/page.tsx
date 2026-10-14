"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, ArrowRight, MessageCircle, Calendar, Eye,
  Tag, CheckCircle, Upload, Check, DollarSign, Zap,
  MapPin, Package, Mail,
} from "lucide-react";
import SellingStepsSection from "@/components/SellingStepsSection";
import SellingWaysSection from "@/components/SellingWaysSection";
import SellerStatsSection from "@/components/SellerStatsSection";
import SellerCTASection from "@/components/SellerCTASection";
import { submitSubmission, isValidEmail } from "@/lib/submissions";

// DropYard theme colors
const C = {
  gLightBg: "#ECFDF5", gSoft: "#D1FAE5", gAccent: "#6EE7B7",
  gPrimary: "#059669", gHover: "#047857", gDark: "#064e3b",
  oLightBg: "#FFF7ED", oSoft: "#FED7AA", oAccent: "#FDBA74",
  oPrimary: "#f59e0b", oHover: "#d97706", oDark: "#92400e",
  ai: "#7C3AED", aiLight: "#F5F3FF", aiBorder: "#DDD6FE",
  wa: "#25D366",
};

export default function ForSellersPage() {
  const router = useRouter();
  // BUG-074 — generic CTA defaults to signin so returning users land on
  // the right form. /join's prominent Sign-In/Sign-Up toggle handles new
  // visitors in one click.
  // as=seller: every CTA on this page is seller intent, and /join sends
  // signed-in users to /buyer, which opens in buyer mode without it.
  const goJoin = () => router.push("/join?mode=signin&as=seller");

  // AI Seller waitlist (inline form replacing the old "Notify Me When Available" button).
  const [aiEmail, setAiEmail] = useState("");
  const [aiSubmitting, setAiSubmitting] = useState(false);
  const [aiSubmitted, setAiSubmitted] = useState(false);
  const [aiError, setAiError] = useState("");

  const submitAiWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(aiEmail)) {
      setAiError("Enter a valid email address.");
      return;
    }
    setAiSubmitting(true);
    setAiError("");
    try {
      await submitSubmission({
        type: "SELLER_AI_WAITLIST",
        source: "for-sellers-ai-waitlist",
        payload: { email: aiEmail.trim() },
      });
      setAiSubmitted(true);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Could not save your spot. Try again.");
    } finally {
      setAiSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      `}</style>
      <div style={{ minHeight: "100vh", backgroundColor: "#FAFAF8" }}>

        {/* ══════════ 1. HERO ══════════ */}
        <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(165deg, #fefce8 0%, #fff7ed 40%, #fef3c7 100%)", padding: "40px 24px 36px" }}>
          <style>{`
            @keyframes dys-pulse-ring {
              0%, 100% { transform: scale(1); opacity: 0.7; }
              50% { transform: scale(2.4); opacity: 0; }
            }
            @keyframes dys-chip-in {
              0% { transform: translateY(8px) scale(0.96); opacity: 0; }
              100% { transform: translateY(0) scale(1); opacity: 1; }
            }
          `}</style>

          {/* Dot-grid texture */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "radial-gradient(circle, #d4af37 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              opacity: 0.08,
              pointerEvents: "none",
            }}
          />

          {/* Glow blobs */}
          <div style={{ position: "absolute", top: -80, right: -80, width: 420, height: 420, borderRadius: "50%", background: C.oAccent, opacity: 0.18, filter: "blur(70px)" }} />
          <div style={{ position: "absolute", bottom: -60, left: "5%", width: 340, height: 340, borderRadius: "50%", background: C.gAccent, opacity: 0.15, filter: "blur(70px)" }} />
          <div style={{ position: "absolute", top: "30%", right: "8%", width: 200, height: 200, borderRadius: "50%", background: "#FDE68A", opacity: 0.5, filter: "blur(60px)" }} />

<div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
            {/* Pulsing eyebrow */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "7px 18px", borderRadius: 50, backgroundColor: "rgba(255,255,255,0.85)", border: "1px solid rgba(245,158,11,0.3)", marginBottom: 24, backdropFilter: "blur(8px)", boxShadow: "0 4px 18px rgba(245,158,11,0.12)" }}>
              <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", backgroundColor: C.oPrimary, animation: "dys-pulse-ring 2s ease-out infinite" }} />
                <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8, borderRadius: "50%", backgroundColor: C.oPrimary }} />
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: C.oDark, letterSpacing: "0.18em", textTransform: "uppercase" }}>Turn clutter into cash</span>
            </div>

            <h1 style={{ fontSize: "clamp(33px,5vw,57px)", fontWeight: 600, color: C.gDark, lineHeight: 1.05, marginBottom: 16, letterSpacing: "-0.05em" }}>
              Sell easily to your{" "}
              <span style={{ position: "relative", display: "inline-block", color: C.oPrimary }}>
                neighbours.
                <span
                  style={{
                    position: "absolute",
                    left: "8%",
                    right: "8%",
                    bottom: -8,
                    height: 6,
                    borderRadius: 3,
                    background: `linear-gradient(90deg, transparent, ${C.oPrimary}, transparent)`,
                    opacity: 0.4,
                  }}
                />
              </span>
            </h1>

            <p style={{ fontSize: 14, color: "#64748b", maxWidth: 880, margin: "0 auto 24px", lineHeight: 1.7 }}>
              Turn unused items into cash through simple, time-limited community Drops. List items yourself or let AI do it for you — create listings, talk to buyers, and schedule pickups. No meetups with strangers — just neighbours helping neighbours.
            </p>

            {/* Benefit chips */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 28, flexWrap: "wrap" }}>
              {[
                { e: "🎁", t: "$0 to list" },
                { e: "⚡", t: "Sell within the weekend" },
                { e: "🏡", t: "Porch pickup only" },
              ].map((c, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.gDark,
                    backgroundColor: "rgba(255,255,255,0.85)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    padding: "6px 14px",
                    borderRadius: 50,
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 2px 10px rgba(245,158,11,0.08)",
                    animation: `dys-chip-in 0.5s ${0.15 * i}s ease-out backwards`,
                  }}
                >
                  <span style={{ fontSize: 13 }}>{c.e}</span> {c.t}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
              <button onClick={goJoin} style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 32px", borderRadius: 50, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, backgroundColor: C.oPrimary, color: "#fff", boxShadow: "0 8px 28px rgba(245,158,11,0.35)", transition: "all 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = C.oHover; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = C.oPrimary; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}>
                Become a Seller <ArrowRight size={18} />
              </button>
              <button onClick={() => router.push("/join?mode=signin&as=seller")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 32px", borderRadius: 50, border: `2px solid ${C.oPrimary}`, cursor: "pointer", fontSize: 15, fontWeight: 700, backgroundColor: "transparent", color: C.oPrimary, transition: "all 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(245,158,11,0.08)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}>
                I Have an Account
              </button>
            </div>
          </div>
        </section>

        {/* ══════════ 2. HOW SELLING WORKS — design from /preview/feedback/simple-steps-seller ══════════ */}
        <SellingStepsSection />

        {/* ══════════ 3. CHOOSE HOW TO SELL — design from /preview/feedback/two-tiers ══════════ */}
        <SellingWaysSection />

        {/* ══════════ 4. AI SELLER AGENT ══════════ */}
        <section style={{ padding: "56px 24px", backgroundColor: "#fff" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 48, alignItems: "center" }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 50, backgroundColor: C.aiLight, border: `1px solid ${C.aiBorder}`, marginBottom: 16 }}>
                  <Sparkles size={14} style={{ color: C.ai }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.ai }}>Coming Soon — AI Seller Agent</span>
                </div>
                <h2 style={{ fontSize: "clamp(25px,3.3vw,34px)", fontWeight: 600, color: "#0f172a", lineHeight: 1.05, letterSpacing: "-0.05em", marginBottom: 12 }}>Want to go hands-free?<br /><span style={{ color: C.oPrimary }}>Let AI handle it.</span></h2>
                <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.7, marginBottom: 28 }}>You can manage everything yourself — or turn on the AI Seller Agent and let it handle the rest. Set your price floor once. The AI responds to buyers, negotiates offers, and schedules pickups. You just get a WhatsApp when something sells.</p>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, marginBottom: 28 }}>
                  {[
                    { e: "📸", t: "Photo-to-listing", d: "Identifies items, writes descriptions, suggests prices" },
                    { e: "💬", t: "Buyer communication", d: "Responds to questions and 'is this still available?' messages" },
                    { e: "🤝", t: "Price negotiation", d: "Accepts, counters, or declines within your rules" },
                    { e: "📅", t: "Pickup scheduling", d: "Coordinates times within your availability windows" },
                    { t: "WhatsApp notifications", d: "Claims, confirmations, and reminders to your WhatsApp", isWa: true },
                    { e: "🔄", t: "No-show handling", d: "Re-opens and contacts the next buyer" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", borderRadius: 14, backgroundColor: i % 2 === 0 ? "#fafafa" : "#fff", border: "1px solid #f0f0f0" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: (item as any).isWa ? "#F0FFF4" : C.gLightBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14 }}>
                        {(item as any).isWa ? <MessageCircle size={16} style={{ color: C.wa }} /> : (item as any).e}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.t}</p>
                        <p style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>{item.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {aiSubmitted ? (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 20px", borderRadius: 14, background: C.aiLight, border: `1px solid ${C.aiBorder}` }}>
                    <CheckCircle size={18} style={{ color: C.ai }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.ai }}>You&apos;re on the AI Seller waitlist!</p>
                      <p style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>We&apos;ll email you when it goes live.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <form onSubmit={submitAiWaitlist} style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: 8, maxWidth: 460 }}>
                      <div style={{ position: "relative", flex: "1 1 220px", minWidth: 220 }}>
                        <Mail size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                        <input
                          type="email"
                          value={aiEmail}
                          onChange={(e) => { setAiEmail(e.target.value); if (aiError) setAiError(""); }}
                          placeholder="you@email.com"
                          disabled={aiSubmitting}
                          style={{ width: "100%", padding: "13px 14px 13px 38px", borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, color: "#0f172a", outline: "none" }}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={aiSubmitting}
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 22px", borderRadius: 14, border: "none", cursor: aiSubmitting ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, background: `linear-gradient(135deg,${C.ai},#6D28D9)`, color: "#fff", boxShadow: `0 6px 24px ${C.ai}30`, opacity: aiSubmitting ? 0.7 : 1 }}
                      >
                        {aiSubmitting ? "Saving..." : <>Notify Me <ArrowRight size={15} /></>}
                      </button>
                    </form>
                    {aiError && (
                      <p style={{ fontSize: 12, color: "#dc2626", marginTop: 8 }}>{aiError}</p>
                    )}
                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>Then $4.99/month for unlimited AI listings</p>
                  </>
                )}
              </div>

              {/* Chat simulation */}
              <div style={{ borderRadius: 24, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 12px 48px rgba(0,0,0,0.08)" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,${C.ai},#6D28D9)`, display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={16} style={{ color: "#fff" }} /></div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>DropYard AI Agent</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22C55E" }} /><span style={{ fontSize: 10, color: "#94a3b8" }}>Handling buyers for your 15 items</span></div>
                  </div>
                </div>
                <div style={{ padding: 20, backgroundColor: "#fff", display: "flex", flexDirection: "column" as const, gap: 14 }}>
                  <div style={{ display: "flex", gap: 8 }}><div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>S</span></div>
                    <div style={{ borderRadius: 16, borderBottomLeftRadius: 4, padding: "10px 14px", backgroundColor: "#f1f5f9", maxWidth: "75%" }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginBottom: 2 }}>Sarah M. — Barrhaven</p>
                      <p style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.5 }}>&quot;Is the bookshelf still available? Would you take $30?&quot;</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ borderRadius: 16, borderBottomRightRadius: 4, padding: "10px 14px", maxWidth: "80%", backgroundColor: C.aiLight, border: `1px solid ${C.aiBorder}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}><Sparkles size={9} style={{ color: C.ai }} /><span style={{ fontSize: 8, fontWeight: 800, color: C.ai }}>AI AGENT</span></div>
                      <p style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.6 }}>&quot;Hi Sarah! The KALLAX bookshelf is available. The seller&apos;s minimum is $30, so you&apos;ve got a deal! Shall I book it? Saturday 10am–12pm or 12pm–3pm? 😊&quot;</p>
                    </div>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${C.ai},#6D28D9)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Sparkles size={10} style={{ color: "#fff" }} /></div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}><div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>S</span></div>
                    <div style={{ borderRadius: 16, borderBottomLeftRadius: 4, padding: "10px 14px", backgroundColor: "#f1f5f9", maxWidth: "75%" }}><p style={{ fontSize: 13, color: "#0f172a" }}>&quot;Saturday 10am works!&quot;</p></div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ borderRadius: 16, borderBottomRightRadius: 4, padding: "10px 14px", maxWidth: "80%", backgroundColor: C.gLightBg, border: `1px solid ${C.gSoft}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}><CheckCircle size={10} style={{ color: C.gPrimary }} /><span style={{ fontSize: 8, fontWeight: 800, color: C.gPrimary }}>CLAIMED</span></div>
                      <p style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.6 }}>&quot;Done! Bookshelf claimed at $30. Pickup Saturday 10am. Address sent. See you then! 🏡&quot;</p>
                    </div>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${C.gPrimary},${C.gHover})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Check size={10} style={{ color: "#fff" }} /></div>
                  </div>
                </div>
                <div style={{ padding: "12px 20px", borderTop: "1px solid #f0f0f0", backgroundColor: "#F0FFF4", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.wa, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><MessageCircle size={13} style={{ color: "#fff" }} /></div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#0f172a" }}>You received on WhatsApp:</p>
                    <p style={{ fontSize: 12, color: "#475569" }}>&quot;Your bookshelf was claimed! $30, pickup Sat 10am.&quot;</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ 6. STATS — design from /preview/feedback/trusted-locally-seller ══════════ */}
        <SellerStatsSection />

        {/* ══════════ 7. CTA — design from /preview/feedback/ready-to-start-selling ══════════ */}
        <SellerCTASection {...({ onCTA: goJoin } as any)} />

      </div>
    </>
  );
}
