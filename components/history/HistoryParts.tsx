"use client";

// Pieces shared by the seller's Sales history and the buyer's Purchase history
// (and the page header of both Settings pages), so the two dashboards draw the
// same thing the same way. Each dashboard keeps its own data code (fetching,
// adapting, grouping); these only draw. Colours and type are the dashboards'
// own tokens (see components/messages/theme.ts).

import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import { MC, MF } from "@/components/messages/theme";

type Layer = "drop" | "shelf" | string | null | undefined;
type IconType = LucideIcon;

const isImageUrl = (v: unknown): v is string => typeof v === "string" && /^(https?:\/\/|data:image\/)/i.test(v);

/**
 * "DROP" or "SHELF". Drop is white on green (4.9:1); Shelf is ink on amber
 * (6.1:1); white on amber was 2.2:1.
 */
export function TypeBadge({ layer, small = false }: { layer: Layer; small?: boolean }) {
  const shelf = layer === "shelf";
  return (
    <span style={{
      fontFamily: MF.head, fontSize: small ? 10 : 11, fontWeight: 800,
      padding: small ? "3px 8px" : "4px 10px", borderRadius: 6,
      background: shelf ? MC.amber : MC.green, color: shelf ? MC.ink : "#fff",
      letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0, lineHeight: 1.2,
    }}>
      {shelf ? "Shelf" : "Drop"}
    </span>
  );
}

/**
 * Square item picture, tinted by where it sold (green for a Drop, amber for
 * the Shelf): the photo when there is one, the category emoji otherwise.
 * Decorative: the title sits right beside it.
 */
export function HistoryThumb({ photo, fallback, layer, isMobile }: { photo?: string | null; fallback?: string | null; layer: Layer; isMobile: boolean }) {
  const src = isImageUrl(photo) ? photo : isImageUrl(fallback) ? fallback : null;
  const size = isMobile ? 64 : 88;
  const tint = layer === "drop" ? MC.greenMist : layer === "shelf" ? MC.amberMist : MC.sand;
  return (
    <div style={{ width: size, height: size, borderRadius: 14, background: tint, border: "1px solid " + MC.fawn, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
      {src
        // eslint-disable-next-line @next/next/no-img-element -- item photos are user uploads of any size; same as the dashboards' own thumbnails
        ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={(e) => { e.currentTarget.style.display = "none"; }}/>
        : <span aria-hidden="true" style={{ fontSize: isMobile ? 30 : 40, lineHeight: 1 }}>{fallback || "📦"}</span>}
    </div>
  );
}

/**
 * One month's card: a header button ("October 2026" and a summary such as
 * "3 items • $120") that collapses it, with the month's rows stacked under it.
 * Rows draw their own hairline on top.
 */
export function MonthGroup({ title, summary, collapsed, onToggle, isMobile, children }: {
  title: ReactNode; summary: ReactNode; collapsed: boolean; onToggle: () => void; isMobile: boolean; children: ReactNode;
}) {
  return (
    <section style={{ marginBottom: 16, borderRadius: 18, border: "1px solid " + MC.fawn, background: MC.paper, overflow: "hidden" }}>
      <button type="button" onClick={onToggle} aria-expanded={!collapsed} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: isMobile ? "14px 16px" : "16px 22px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", flexWrap: "wrap", rowGap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {collapsed
            ? <ChevronRight size={18} aria-hidden="true" style={{ color: MC.mink, flexShrink: 0 }}/>
            : <ChevronDown size={18} aria-hidden="true" style={{ color: MC.mink, flexShrink: 0 }}/>}
          <h2 style={{ fontFamily: MF.head, fontSize: isMobile ? 16 : 19, fontWeight: 800, color: MC.ink, letterSpacing: "-0.015em" }}>{title}</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontFamily: MF.body, fontSize: isMobile ? 12 : 13.5, fontWeight: 600, color: MC.mink }}>
          {summary}
        </div>
      </button>
      {!collapsed && children}
    </section>
  );
}

/** "•" between the parts of a MonthGroup summary. */
export function Dot() {
  return <span aria-hidden="true" style={{ color: MC.smoke }}>•</span>;
}

export type Stat = { label: string; value: ReactNode; icon: IconType; color: string; bg: string; sub?: ReactNode; urgent?: boolean };

/**
 * Summary tile for the stat rows (History, and the buyer's Claims). Desktop:
 * icon beside the figure. Phones: the tiles are half the screen wide, so the
 * icon sits above the figure and the label keeps the tile's full width.
 */
export function StatTile({ stat: s, index = 0, isMobile }: { stat: Stat; index?: number; isMobile: boolean }) {
  const Ic = s.icon;
  return (
    <div className="fade-in" style={{
      padding: isMobile ? "14px" : "20px 22px", minWidth: 0, borderRadius: 18,
      background: s.urgent ? s.bg : MC.paper, border: "1px solid " + (s.urgent ? s.color + "40" : MC.fawn),
      animationDelay: (index * 40) + "ms", position: "relative",
      display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 10 : 16,
    }}>
      <div style={{ width: isMobile ? 40 : 52, height: isMobile ? 40 : 52, borderRadius: isMobile ? 12 : 16, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Ic size={isMobile ? 19 : 23} strokeWidth={2.1} aria-hidden="true" style={{ color: s.color }}/>
      </div>
      <div style={{ flex: 1, minWidth: 0, width: isMobile ? "100%" : undefined }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <p style={{ fontFamily: MF.head, fontSize: isMobile ? 26 : 33, fontWeight: 900, color: s.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</p>
          {s.sub && <span style={{ fontFamily: MF.body, fontSize: isMobile ? 11 : 12, fontWeight: 600, color: MC.ash, background: MC.sand, border: "1px solid " + MC.fawn, padding: isMobile ? "2px 8px" : "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>{s.sub}</span>}
        </div>
        <p style={{ fontFamily: MF.body, fontSize: isMobile ? 13 : 14, fontWeight: 600, color: MC.mink, marginTop: 5, lineHeight: 1.3 }}>{s.label}</p>
      </div>
      {s.urgent && (
        <span style={{ position: isMobile ? "absolute" : "static", top: 14, right: 14, width: 8, height: 8, flexShrink: 0, borderRadius: "50%", background: s.color, boxShadow: "0 0 0 3px " + s.color + "35", animation: "pulseGreen 2s infinite" }}/>
      )}
    </div>
  );
}

/** The stat tiles in a row: four across on desktop, two by two on phones. */
export function StatGrid({ stats, isMobile }: { stats: Stat[]; isMobile: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))", gap: isMobile ? 10 : 14, marginBottom: isMobile ? 16 : 22 }}>
      {stats.map((s, i) => <StatTile key={s.label} stat={s} index={i} isMobile={isMobile}/>)}
    </div>
  );
}

/** Page title with its icon tile and a one-line description. */
export function PageHeader({ icon: Icon, title, subtitle, isMobile }: { icon: IconType; title: ReactNode; subtitle?: ReactNode; isMobile: boolean }) {
  return (
    <div style={{ padding: isMobile ? "12px 0 8px" : "14px 0 10px", marginBottom: isMobile ? 2 : 4 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 16 }}>
        <div style={{ width: isMobile ? 42 : 48, height: isMobile ? 42 : 48, borderRadius: isMobile ? 12 : 14, background: MC.greenMist, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, boxShadow: "0 2px 0 " + MC.fawn }}>
          <Icon size={isMobile ? 18 : 20} strokeWidth={2.2} aria-hidden="true" style={{ color: MC.greenDeep }}/>
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: MF.head, fontSize: isMobile ? 24 : 30, fontWeight: 900, color: MC.ink, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 4 }}>{title}</h1>
          {subtitle && <p style={{ fontFamily: MF.body, fontSize: isMobile ? 12.5 : 14, fontWeight: 500, color: MC.mink, lineHeight: 1.45, maxWidth: 560 }}>{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

/** Rows of a month card, newest first. Dates are anything `new Date` reads. */
export function newestFirst<T extends { date: string | number | Date }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
