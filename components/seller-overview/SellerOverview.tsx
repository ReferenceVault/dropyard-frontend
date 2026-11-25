"use client";

// The seller Overview (client redesign): hero, the Drop card, four stat
// tiles, Needs Your Attention, a listings card and Your Selling Snapshot, in
// three versions: BEFORE the live Drop, DURING it and AFTER it (overviewState).
// Everything comes from GET /api/items/overview (useSellerOverview); the
// dashboard passes in what the buttons do. Inline styles throughout: the
// seller dashboard resets every element's margin and padding globally.

import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import {
  AlarmClock, ArrowRight, BarChart3, Bell, Box, CalendarDays, Check, CheckCircle2, ChevronRight,
  Eye, FileText, Info, Leaf, MessageSquare, Package, Plus, Pointer, Share2, Tag, Truck, Users, Tags,
} from "lucide-react";
import { pickupWhen } from "@/components/messages/claimStatus";
import { buildAttention, overviewState, type AttentionRow, type OverviewStateInfo } from "./overviewState";
import { useSellerOverview, type ListingCard, type ListingStatus, type SellerOverviewData } from "./useSellerOverview";
import { compactDuration, countdownParts, dropDateTime, dropDay, dropTime, greetingFor, plural, timeAgo } from "./format";
import { SO, SO_FONT, SO_HAND } from "./theme";

export interface SellerOverviewActions {
  listItem: () => void;
  share: (() => void) | null;
  goToItems: (filter: string | null, itemId?: string | null) => void;
  openThread: (conversationId: string) => void;
  editItem: (itemId: string) => void;
  confirmPickup: (row: { claimId: string; itemId: string; title: string; photo: string | null }) => void;
  nav: (view: string) => void;
}

const HERO_PHOTO = "/images/seller-overview/hero-placeholder.jpg";
// Layout by the Overview's own width (measured, so it follows the sidebar):
//   narrow < 1120px — tighter tiles, rows and snapshot; listing titles on two lines
//   stack  <  900px — tiles 2×2, attention and listings one above the other,
//                     snapshot title above its numbers, no 3D calendar
//   phone  <  600px — hero photo as a band under the text, Drop card stacked,
//                     attention buttons full width, listings scroll sideways,
//                     snapshot numbers one per row
const NARROW_BELOW = 1120, STACK_BELOW = 900, PHONE_BELOW = 600;
type Size = { narrow: boolean; stack: boolean; phone: boolean };
const SizeCtx = createContext<Size>({ narrow: false, stack: false, phone: false });
const CALENDAR_ART = "/images/seller-overview/calendar-3d-placeholder.png";

// ── Small shared pieces ──────────────────────────────────────────────────

const btnBase: CSSProperties = {
  minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
  padding: "0 22px", borderRadius: 999, fontFamily: SO_FONT, fontSize: 15, fontWeight: 700,
  cursor: "pointer", whiteSpace: "nowrap", transition: "background-color 150ms, color 150ms",
};
function OrangeButton({ children, onClick, small = false, full = false }: { children: ReactNode; onClick: () => void; small?: boolean; full?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="dy-so-btn dy-so-btn--filled"
      style={{ ...btnBase, ...(small ? { fontSize: 14, padding: "0 18px" } : {}), ...(full ? { width: "100%", whiteSpace: "normal" } : {}), border: "none", background: SO.orange, color: "#fff", boxShadow: "0 6px 14px -8px rgba(194,65,12,0.7)" }}>
      {children}
    </button>
  );
}
/** Outlined at rest; fills with the seller orange on hover (globals.css). */
function OutlineButton({ children, onClick, small = false, full = false }: { children: ReactNode; onClick: () => void; small?: boolean; full?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="dy-so-btn dy-so-btn--outline dy-so-btn--fill"
      style={{ ...btnBase, ...(small ? { fontSize: 14, padding: "0 18px" } : {}), ...(full ? { width: "100%", whiteSpace: "normal" } : {}), border: "1.5px solid #F2B48E", background: "#fff", color: SO.orange }}>
      {children}
    </button>
  );
}
const cardStyle: CSSProperties = { background: SO.card, border: "1px solid " + SO.line, borderRadius: 20, boxShadow: SO.shadow };

function Thumb({ photo, icon: Icon = Package }: { photo: string | null; icon?: typeof Package }) {
  const { narrow } = useContext(SizeCtx);
  return (
    <span aria-hidden="true" style={{ width: narrow ? 64 : 78, height: narrow ? 46 : 54, borderRadius: 9, flexShrink: 0, overflow: "hidden", background: SO.peach, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid " + SO.line }}>
      {photo
        // eslint-disable-next-line @next/next/no-img-element -- S3 photo URLs, as on the item cards
        ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        : <Icon size={22} strokeWidth={1.8} style={{ color: SO.orange }}/>}
    </span>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────

function OverviewHero({ greeting, message, buttons }: { greeting: string; message: string; buttons: ReactNode }) {
  const { stack, phone } = useContext(SizeCtx);
  if (phone) {
    // Phones: the words first, full width; the photo as a band beneath.
    return (
      <section aria-labelledby="so-hero-heading" style={{ background: "#fff" }}>
        <div style={{ padding: "20px 16px 18px" }}>
          <h1 id="so-hero-heading" style={{ fontFamily: SO_FONT, fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15, color: SO.ink }}>{greeting}</h1>
          <p style={{ fontFamily: SO_FONT, fontSize: 15, fontWeight: 500, lineHeight: 1.5, color: SO.text, marginTop: 8 }}>{message}</p>
          {buttons && <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>{buttons}</div>}
        </div>
        <div aria-hidden="true" style={{ position: "relative", height: 140 }}>
          <Image src={HERO_PHOTO} alt="" fill priority sizes="100vw" style={{ objectFit: "cover", objectPosition: "62% center" }}/>
        </div>
      </section>
    );
  }
  return (
    <section aria-labelledby="so-hero-heading" style={{ position: "relative", minHeight: 184, background: "#fff", overflow: "hidden", display: "flex", alignItems: "center" }}>
      <div aria-hidden="true" style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: stack ? "50%" : "64%" }}>
        <Image src={HERO_PHOTO} alt="" fill priority sizes="(min-width: 1024px) 64vw, 100vw" style={{ objectFit: "cover", objectPosition: "center" }}/>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #FFFFFF 0%, rgba(255,255,255,0.88) 14%, rgba(255,255,255,0.35) 30%, rgba(255,255,255,0) 46%)" }}/>
      </div>
      <div style={{ position: "relative", padding: stack ? "24px 24px" : "26px 40px", maxWidth: stack ? "58%" : 700 }}>
        <h1 id="so-hero-heading" style={{ fontFamily: SO_FONT, fontSize: 33, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.12, color: SO.ink }}>{greeting}</h1>
        <p style={{ fontFamily: SO_FONT, fontSize: 16, fontWeight: 500, lineHeight: 1.5, color: SO.text, marginTop: 10, maxWidth: 600, textShadow: "0 0 12px rgba(255,255,255,0.9)" }}>{message}</p>
        {buttons && <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>{buttons}</div>}
      </div>
    </section>
  );
}

// ── The Drop card ────────────────────────────────────────────────────────

function DropCard({ children, label }: { children: ReactNode; label: string }) {
  const { stack, phone } = useContext(SizeCtx);
  return (
    <section aria-label={label} style={{ background: SO.peach, border: "1px solid " + SO.peachLine, borderRadius: 22, padding: phone ? "18px 16px" : "20px 24px", display: "flex", flexDirection: phone ? "column" : "row", flexWrap: stack && !phone ? "wrap" : "nowrap", alignItems: phone ? "stretch" : "center", gap: phone ? 14 : 22 }}>
      {!phone && (
        <span aria-hidden="true" style={{ width: 76, height: 76, borderRadius: "50%", background: SO.peachDeep, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <CalendarDays size={34} strokeWidth={1.8} style={{ color: SO.orange }}/>
        </span>
      )}
      {children}
      {!stack && <Image src={CALENDAR_ART} alt="" aria-hidden="true" width={86} height={82} style={{ flexShrink: 0, marginLeft: "auto", width: 86, height: "auto" }}/>}
    </section>
  );
}
/** The card's vertical divider; none on phones, where the parts stack. */
function Divider() {
  const { phone } = useContext(SizeCtx);
  return phone ? null : <span aria-hidden="true" style={vDivider}/>;
}
const eyebrow: CSSProperties = { fontFamily: SO_FONT, fontSize: 13, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: SO.orange };
const dropTitle: CSSProperties = { fontFamily: SO_FONT, fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: SO.ink, lineHeight: 1.15 };
const dropBody: CSSProperties = { fontFamily: SO_FONT, fontSize: 15, fontWeight: 500, color: SO.text, lineHeight: 1.45, marginTop: 4 };
const vDivider: CSSProperties = { width: 1, alignSelf: "stretch", background: SO.peachLine, flexShrink: 0 };

function BeforeDropCard({ data, now }: { data: SellerOverviewData; now: number }) {
  const opens = data.drops.next.liveStart;
  const c = countdownParts(Date.parse(opens), now);
  const { stack, phone } = useContext(SizeCtx);
  const box = (value: string, unit: string) => (
    <div style={{ width: phone ? undefined : 78, flex: phone ? 1 : undefined, minHeight: 74, padding: "8px 4px", borderRadius: 14, background: SO.peachDeep, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: SO_FONT, fontSize: 28, fontWeight: 800, color: SO.ink, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <span style={{ fontFamily: SO_FONT, fontSize: 11, fontWeight: 800, color: SO.text, letterSpacing: "0.08em", marginTop: 6 }}>{unit}</span>
    </div>
  );
  return (
    <DropCard label="Next live Drop">
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={eyebrow}>Next live Drop</p>
        <p style={{ ...dropTitle, marginTop: 6 }}>{dropDateTime(opens)}</p>
        <p style={dropBody}>List your items now so buyers can preview and save them before the Drop.</p>
      </div>
      <Divider/>
      <div role="timer" aria-label={`Opens in ${plural(c.days, "day")}, ${plural(c.hours, "hour")} and ${plural(c.minutes, "minute")}`} style={{ display: "flex", gap: 10, flexShrink: 0, ...(stack && !phone ? { marginLeft: "auto" } : {}) }}>
        {box(String(c.days), "DAYS")}{box(String(c.hours), "HRS")}{box(String(c.minutes).padStart(2, "0"), "MIN")}
      </div>
    </DropCard>
  );
}

function DuringDropCard({ data, now, info }: { data: SellerOverviewData; now: number; info: OverviewStateInfo }) {
  const closes = data.drops.current.closedStart;
  const n = data.stats.inCurrentDrop;
  const remaining = compactDuration(Date.parse(closes), now);
  const { stack, phone } = useContext(SizeCtx);
  const timer = (
      <div role="timer" aria-label={`${remaining} remaining`} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px", borderRadius: 16, background: SO.greenTint, flexShrink: 0, width: stack && !phone ? "fit-content" : undefined }}>
        <AlarmClock aria-hidden="true" size={30} strokeWidth={2} style={{ color: SO.greenLive }}/>
        <div>
          <p style={{ fontFamily: SO_FONT, fontSize: 26, fontWeight: 800, color: SO.ink, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{remaining}</p>
          <p style={{ fontFamily: SO_FONT, fontSize: 12, fontWeight: 800, color: SO.green, letterSpacing: "0.1em", marginTop: 5 }}>{info.closing ? "CLOSING SOON" : "REMAINING"}</p>
        </div>
      </div>
  );
  return (
    <DropCard label="Live Drop">
      <div style={{ flexShrink: 0 }}>
        <p style={eyebrow}>Live Drop</p>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 8, padding: "6px 16px 6px 12px", borderRadius: 12, background: SO.greenTint, color: SO.green, fontFamily: SO_FONT, fontSize: 20, fontWeight: 800, letterSpacing: "0.02em" }}>
          <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: "50%", background: SO.greenLive, boxShadow: "0 0 0 3px rgba(21,128,61,0.2)" }}/>LIVE NOW
        </span>
      </div>
      <Divider/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={dropTitle}>Ends {dropDay(closes)} at {dropTime(closes)}</p>
        <p style={dropBody}>
          {n > 0
            ? `${n} of your items ${n === 1 ? "is" : "are"} in the live Drop. ${info.closing ? "Last hours: drop prices or make unsold items free." : "Buyers are claiming now."}`
            : "None of your items are in this Drop. Your Shelf items can still be claimed."}
        </p>
      </div>
      {/* Tablet widths: the countdown takes its own row under the status
          (as the AFTER card's "Next Drop" does), so the date isn't squeezed. */}
      {stack && !phone ? <div style={{ flexBasis: "100%", paddingLeft: 98 }}>{timer}</div> : timer}
    </DropCard>
  );
}

function AfterDropCard({ data, info }: { data: SellerOverviewData; info: OverviewStateInfo }) {
  const { stack, phone } = useContext(SizeCtx);
  const drop = info.afterDrop === "current" ? data.drops.current : data.drops.closed;
  const next = data.drops.next.liveStart;
  return (
    <DropCard label="Live Drop complete">
      <div style={{ flexShrink: 0 }}>
        <p style={eyebrow}>Live Drop complete</p>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 8, padding: "6px 18px 6px 12px", borderRadius: 12, background: SO.greenTint, color: SO.green, fontFamily: SO_FONT, fontSize: 20, fontWeight: 800, letterSpacing: "0.02em" }}>
          <CheckCircle2 aria-hidden="true" size={22} strokeWidth={2.2}/>ENDED
        </span>
      </div>
      <Divider/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ ...dropTitle, fontSize: 21 }}>Your items were live until {dropDay(drop.closedStart)} at {dropTime(drop.closedStart)}.</p>
        <p style={dropBody}>Thanks for joining the Drop! Review what sold, arrange pickups, and update any unsold items on the Shelf.</p>
      </div>
      {!stack && <Divider/>}
      <div style={{ display: "flex", gap: 10, flexShrink: 0, ...(stack ? { flexBasis: "100%", paddingLeft: phone ? 0 : 98 } : { maxWidth: 250 }) }}>
        <CalendarDays aria-hidden="true" size={20} strokeWidth={2} style={{ color: SO.orange, flexShrink: 0, marginTop: 2 }}/>
        <div>
          <p style={{ fontFamily: SO_FONT, fontSize: 16, fontWeight: 800, color: SO.ink, lineHeight: 1.3 }}>Next Drop: {dropDateTime(next)}</p>
          <p style={{ ...dropBody, fontSize: 14 }}>Prepare items for next week.</p>
        </div>
      </div>
    </DropCard>
  );
}

// ── Stat tiles ───────────────────────────────────────────────────────────

function StatTiles({ data, after }: { data: SellerOverviewData; after: boolean }) {
  const { narrow, stack, phone } = useContext(SizeCtx);
  const tiles: Array<{ value: number; label: string; icon: typeof Box; tint: string; color: string }> = [
    { value: data.stats.activeListings, label: "Active listings", icon: Box, tint: SO.greenTint, color: SO.price },
    after
      ? { value: data.stats.itemsSoldClosedDrop, label: "Items sold", icon: Tag, tint: SO.orangeTint, color: SO.orange }
      : { value: data.stats.itemsClaimed, label: "Items claimed", icon: Pointer, tint: SO.orangeTint, color: SO.orange },
    { value: data.stats.awaitingPickup, label: "Awaiting pickup", icon: Truck, tint: SO.purpleTint, color: SO.purple },
    { value: data.stats.completedSales, label: "Completed sales", icon: CheckCircle2, tint: SO.greenTint, color: SO.price },
  ];
  return (
    <ul aria-label="Your numbers" style={{ display: "grid", gridTemplateColumns: stack ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))", gap: narrow ? 12 : 18, listStyle: "none" }}>
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <li key={t.label} style={{ ...cardStyle, borderRadius: 18, padding: narrow ? "14px 14px" : "16px 20px", display: "flex", flexDirection: phone ? "column" : "row", alignItems: phone ? "flex-start" : "center", gap: phone ? 10 : narrow ? 12 : 18 }}>
            <span aria-hidden="true" style={{ width: narrow ? 46 : 54, height: narrow ? 46 : 54, borderRadius: 13, background: t.tint, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={26} strokeWidth={1.9} style={{ color: t.color }}/>
            </span>
            <p style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: SO_FONT, fontSize: narrow ? 26 : 30, fontWeight: 800, color: SO.ink, lineHeight: 1.05 }}>{t.value}</span>
              <span style={{ display: "block", fontFamily: SO_FONT, fontSize: narrow ? 15 : 16, fontWeight: 500, color: SO.text, marginTop: 4, whiteSpace: narrow && !phone ? "nowrap" : "normal" }}>{t.label}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

// ── Needs Your Attention ─────────────────────────────────────────────────

interface RowView { heading: string; detail: string; button: string; onAct: () => void; photo: string | null; icon?: typeof Package; open?: { label: string; onOpen: () => void } }

function rowView(r: AttentionRow, state: OverviewStateInfo["state"], now: number, a: SellerOverviewActions): RowView {
  const before = state === "before";
  const openItem = (itemId: string, title: string, filter: string | null = null) => ({ label: `Open ${title} in My items`, onOpen: () => a.goToItems(filter, itemId) });
  switch (r.kind) {
    case "closing":
      return { heading: `Drop closes in ${compactDuration(Date.parse(r.closesAt), now)}`, detail: `${plural(r.count, "unsold item")} · drop prices or make ${r.count === 1 ? "it" : "them"} free`, button: "Lower prices", onAct: () => a.goToItems("live"), photo: null, icon: Tags };
    case "claim_review": {
      const what = r.fullPrice ? "claim" : `offer of $${r.amount}`;
      return before
        ? { heading: r.title, detail: `New ${what} from a buyer`, button: "Review Claim", onAct: () => a.goToItems("action", r.itemId), photo: r.photo, open: openItem(r.itemId, r.title, "action") }
        : { heading: r.fullPrice ? "New claim to review" : "New offer to review", detail: `${r.title} was ${r.fullPrice ? "claimed" : "offered on"} ${timeAgo(r.proposedAt, now)}`, button: "Review Claim", onAct: () => a.goToItems("action", r.itemId), photo: r.photo, open: openItem(r.itemId, r.title, "action") };
    }
    case "confirm_pickup":
      return before
        ? { heading: r.title, detail: `Pickup due: ${r.pickupSlot}`, button: "Confirm Pickup", onAct: () => a.confirmPickup(r), photo: r.photo, open: openItem(r.itemId, r.title, "pickups") }
        : { heading: "Confirm pickup details", detail: `${r.title} buyer is ready to collect`, button: "Confirm Pickup", onAct: () => a.confirmPickup(r), photo: r.photo, open: openItem(r.itemId, r.title, "pickups") };
    case "arrange_pickup": {
      const act = () => (r.conversationId ? a.openThread(r.conversationId) : a.goToItems("pickups", r.itemId));
      return before
        ? { heading: r.title, detail: "Pickup to be scheduled", button: "Arrange Pickup", onAct: act, photo: r.photo, open: openItem(r.itemId, r.title, "pickups") }
        : state === "during"
          ? { heading: "Pickup to arrange", detail: `${r.title} is ready for pickup`, button: "Arrange Pickup", onAct: act, photo: r.photo, open: openItem(r.itemId, r.title, "pickups") }
          : { heading: "Arrange pickup", detail: `${r.title} needs a pickup time`, button: "Arrange Pickup", onAct: act, photo: r.photo, open: openItem(r.itemId, r.title, "pickups") };
    }
    case "back_on_shelf":
      return { heading: "Unsold item can be improved", detail: `${r.title} moved back to the Shelf. Consider updating the listing.`, button: "Improve Listing", onAct: () => a.editItem(r.itemId), photo: r.photo, open: openItem(r.itemId, r.title) };
    case "missing_details": {
      const what = r.missing.includes("photo") && r.missing.includes("description") ? "a photo and a fuller description" : r.missing.includes("photo") ? "a photo" : "a fuller description";
      return before
        ? { heading: r.title, detail: `Update listing (missing ${what})`, button: "Edit Listing", onAct: () => a.editItem(r.itemId), photo: r.photo, open: openItem(r.itemId, r.title) }
        : { heading: "Listing needs a quick update", detail: `${r.title} is ${state === "during" ? "live but " : ""}missing ${what}`, button: "Edit Listing", onAct: () => a.editItem(r.itemId), photo: r.photo, open: openItem(r.itemId, r.title) };
    }
    case "messages_waiting":
      return { heading: "Buyers waiting for a reply", detail: `${plural(r.count, "conversation")} with new messages`, button: "Reply", onAct: () => a.nav("messages"), photo: null, icon: MessageSquare };
    case "drafts":
      return { heading: "Drafts to finish", detail: `${plural(r.count, "draft")} not listed yet`, button: "Finish", onAct: () => a.goToItems("draft"), photo: null, icon: FileText };
  }
}

function AttentionList({ rows, state, now, actions }: { rows: AttentionRow[]; state: OverviewStateInfo["state"]; now: number; actions: SellerOverviewActions }) {
  const [expanded, setExpanded] = useState(false);
  const { narrow, phone } = useContext(SizeCtx);
  const shown = expanded ? rows : rows.slice(0, 3);
  return (
    <section aria-labelledby="so-attention-heading" style={{ ...cardStyle, padding: "22px 24px 14px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Bell aria-hidden="true" size={24} strokeWidth={2} style={{ color: SO.orange }}/>
        <h2 id="so-attention-heading" style={{ fontFamily: SO_FONT, fontSize: 21, fontWeight: 800, letterSpacing: "-0.015em", color: SO.ink }}>Needs Your Attention</h2>
        {rows.length > 0 && (
          <span style={{ minWidth: 26, height: 26, padding: "0 7px", borderRadius: 999, background: SO.orange, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: SO_FONT, fontSize: 14, fontWeight: 800 }}>
            {rows.length}<span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}> {rows.length === 1 ? "item" : "items"}</span>
          </span>
        )}
      </div>
      {rows.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 14, padding: "26px 4px 18px" }}>
          <span aria-hidden="true" style={{ width: 48, height: 48, borderRadius: "50%", background: SO.greenTint, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={24} strokeWidth={2.4} style={{ color: SO.price }}/>
          </span>
          <div>
            <p style={{ fontFamily: SO_FONT, fontSize: 16, fontWeight: 700, color: SO.ink }}>You&apos;re all caught up.</p>
            <p style={{ fontFamily: SO_FONT, fontSize: 14, color: SO.muted, marginTop: 2 }}>New claims, pickups and messages will show up here.</p>
          </div>
        </div>
      ) : (
        <ul style={{ listStyle: "none", marginTop: 10 }}>
          {shown.map((r, i) => {
            const v = rowView(r, state, now, actions);
            return (
              <li key={r.key} style={phone
                ? { display: "grid", gridTemplateColumns: "64px minmax(0, 1fr) 44px", columnGap: 12, rowGap: 10, alignItems: "center", padding: "14px 0", borderTop: i === 0 ? "none" : "1px solid " + SO.line }
                : { display: "flex", alignItems: "center", gap: narrow ? 12 : 16, padding: "14px 0", borderTop: i === 0 ? "none" : "1px solid " + SO.line }}>
                <Thumb photo={v.photo} icon={v.icon}/>
                <div style={phone ? { gridColumn: 2, gridRow: 1, minWidth: 0 } : { flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: SO_FONT, fontSize: 16, fontWeight: 700, color: SO.ink, lineHeight: 1.3 }}>{v.heading}</p>
                  <p style={{ fontFamily: SO_FONT, fontSize: 14, fontWeight: 500, color: SO.text, lineHeight: 1.4, marginTop: 3 }}>{v.detail}</p>
                </div>
                {phone
                  ? <div style={{ gridColumn: "2 / 4", gridRow: 2 }}><OutlineButton onClick={v.onAct} small full>{v.button}</OutlineButton></div>
                  : <OutlineButton onClick={v.onAct} small>{v.button}</OutlineButton>}
                {v.open ? (
                  <button type="button" onClick={v.open.onOpen} aria-label={v.open.label} className="dy-so-chevron"
                    style={{ ...(phone ? { gridColumn: 3, gridRow: 1 } : {}), width: 44, height: 44, flexShrink: 0, borderRadius: 999, border: "none", background: "transparent", color: SO.ink, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <ChevronRight size={20} strokeWidth={2.2} aria-hidden="true"/>
                  </button>
                ) : <span aria-hidden="true" style={{ ...(phone ? { gridColumn: 3, gridRow: 1 } : {}), width: 44, flexShrink: 0 }}/>}
              </li>
            );
          })}
        </ul>
      )}
      {rows.length > 3 && (
        <button type="button" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded} className="dy-so-link"
          style={{ alignSelf: "flex-start", minHeight: 44, marginTop: 2, padding: "0 4px", border: "none", background: "transparent", color: SO.orange, fontFamily: SO_FONT, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          {expanded ? "Show fewer" : `See all ${rows.length}`} <ArrowRight aria-hidden="true" size={16} style={{ transform: expanded ? "rotate(-90deg)" : "rotate(90deg)" }}/>
        </button>
      )}
    </section>
  );
}

// ── Listings card ────────────────────────────────────────────────────────

const STATUS_PILL: Record<ListingStatus, { label: string; dot?: boolean; check?: boolean; tone: "white" | "peach" }> = {
  claimed:        { label: "Claimed", dot: true, tone: "white" },
  pickup_pending: { label: "Pickup pending", tone: "peach" },
  queued:         { label: "Queued for Drop", tone: "peach" },
  live:           { label: "Live in Drop", dot: true, tone: "white" },
  sold:           { label: "Sold", check: true, tone: "white" },
  back_on_shelf:  { label: "Back on Shelf", tone: "white" },
  shelf:          { label: "On the Shelf", tone: "white" },
};

function ListingsCard({ title, items, onSeeAll, onOpen, onListItem }: { title: string; items: ListingCard[]; onSeeAll: () => void; onOpen: (id: string) => void; onListItem: () => void }) {
  const { narrow, phone } = useContext(SizeCtx);
  // Phones: the cards scroll sideways; a fade marks whichever edge has more.
  const rowRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const update = () => {
      if (!phone) { el.style.maskImage = ""; el.style.webkitMaskImage = ""; return; }
      const more = el.scrollWidth - el.clientWidth;
      const left = el.scrollLeft > 1, right = el.scrollLeft < more - 1;
      const mask = left || right ? `linear-gradient(to right, ${left ? "transparent 0, #000 28px" : "#000 0"}, ${right ? "#000 calc(100% - 28px), transparent 100%" : "#000 100%"})` : "";
      el.style.maskImage = mask; el.style.webkitMaskImage = mask;
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => { el.removeEventListener("scroll", update); ro?.disconnect(); };
  }, [phone, items.length]);
  return (
    <section aria-labelledby="so-listings-heading" style={{ ...cardStyle, padding: "22px 24px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 12, background: SO.orangeTint, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Box size={22} strokeWidth={1.9} style={{ color: SO.orange }}/>
        </span>
        <h2 id="so-listings-heading" style={{ fontFamily: SO_FONT, fontSize: 21, fontWeight: 800, letterSpacing: "-0.015em", color: SO.ink, flex: 1 }}>{title}</h2>
        <button type="button" onClick={onSeeAll} className="dy-so-link" aria-label={`See all ${title.toLowerCase()}`}
          style={{ minHeight: 44, padding: "0 4px", border: "none", background: "transparent", color: SO.orange, fontFamily: SO_FONT, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          See all <ArrowRight aria-hidden="true" size={16}/>
        </button>
      </div>
      {items.length === 0 ? (
        <div style={{ marginTop: 16, padding: "28px 20px", borderRadius: 16, border: "1.5px dashed " + SO.peachLine, background: SO.peach, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          <p style={{ fontFamily: SO_FONT, fontSize: 15, color: SO.text }}>Nothing listed here yet.</p>
          <OrangeButton onClick={onListItem} small><Plus size={16} aria-hidden="true"/> List an Item</OrangeButton>
        </div>
      ) : (
        <ul ref={rowRef} aria-label={title} tabIndex={phone ? 0 : undefined} className={phone ? "dy-so-scroller" : undefined}
          style={phone
            ? { listStyle: "none", display: "flex", gap: 12, marginTop: 16, overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", paddingBottom: 4 }
            : { listStyle: "none", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: narrow ? 10 : 16, marginTop: 16 }}>
          {items.map((it) => {
            const pill = STATUS_PILL[it.status];
            return (
              <li key={it.id} style={phone ? { flex: "0 0 46%", minWidth: 150, scrollSnapAlign: "start" } : undefined}>
                <button type="button" onClick={() => onOpen(it.id)} className="dy-so-card" aria-label={`${it.title}, ${pill.label}, $${it.price}. Open in My items`}
                  style={{ width: "100%", textAlign: "left", padding: narrow ? 6 : 8, borderRadius: 16, border: "1px solid " + SO.line, background: "#fff", cursor: "pointer", display: "block" }}>
                  <span style={{ position: "relative", display: "block", aspectRatio: "193 / 163", borderRadius: 11, overflow: "hidden", background: SO.peach }}>
                    {it.photo
                      // eslint-disable-next-line @next/next/no-img-element -- S3 photo URLs, as on the item cards
                      ? <img src={it.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                      : <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Package size={40} strokeWidth={1.4} style={{ color: SO.orange }}/></span>}
                    <span style={{ position: "absolute", top: 8, left: 8, right: 8, display: "flex" }}>
                      {/* A long label ("Queued for Drop") wraps onto a second line in a narrow card, as in the mockup, rather than being cut off. */}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%", padding: narrow ? "4px 9px" : "5px 12px", borderRadius: 13, background: pill.tone === "peach" ? SO.orangeTint : "#fff", color: pill.tone === "peach" ? SO.orangeHover : SO.green, fontFamily: SO_FONT, fontSize: narrow ? 12 : 13, fontWeight: 700, boxShadow: "0 2px 8px rgba(28,25,23,0.12)", lineHeight: 1.25 }}>
                        {pill.dot && <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: SO.greenLive, flexShrink: 0 }}/>}
                        {pill.check && <Check aria-hidden="true" size={14} strokeWidth={2.6}/>}
                        <span style={{ color: pill.tone === "white" && !pill.dot && !pill.check ? SO.ink : undefined }}>{pill.label}</span>
                      </span>
                    </span>
                  </span>
                  <span style={{ display: "block", padding: "10px 6px 4px" }}>
                    <span style={narrow
                      ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.5em", lineHeight: 1.25, fontFamily: SO_FONT, fontSize: 15, fontWeight: 700, color: SO.ink }
                      : { display: "block", fontFamily: SO_FONT, fontSize: 16, fontWeight: 700, color: SO.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</span>
                    <span style={{ display: "block", fontFamily: SO_FONT, fontSize: narrow ? 19 : 21, fontWeight: 800, color: SO.price, marginTop: 4 }}>{it.price === 0 ? "Free" : `$${it.price}`}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── Your Selling Snapshot ────────────────────────────────────────────────

function SellingSnapshot({ period, first, items, lb, neighbours, after }: { period: string; first: { value: number; label: string }; items: number; lb: number; neighbours: number; after: boolean }) {
  const [tip, setTip] = useState(false);
  const { narrow, stack, phone } = useContext(SizeCtx);
  const stat = (icon: ReactNode, value: ReactNode, label: ReactNode, first = false) => (
    <div style={phone
      ? { display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderTop: first ? "none" : "1px solid " + SO.greenLine, minWidth: 0 }
      : { display: "flex", alignItems: "center", gap: narrow ? 10 : 14, padding: `0 ${narrow ? 14 : 24}px 0 ${stack && first ? 0 : narrow ? 14 : 24}px`, borderLeft: stack && first ? "none" : "1px solid " + SO.greenLine, flex: 1, minWidth: 0 }}>
      {icon}
      <div style={{ minWidth: 0 }}>
        <p style={{ fontFamily: SO_FONT, fontSize: narrow ? 23 : 26, fontWeight: 800, color: SO.ink, lineHeight: 1.05 }}>{value}</p>
        <p style={{ fontFamily: SO_FONT, fontSize: narrow ? 14 : 15, fontWeight: 500, color: SO.text, marginTop: 3, whiteSpace: narrow && !stack ? "nowrap" : "normal" }}>{label}</p>
      </div>
    </div>
  );
  return (
    <section aria-labelledby="so-snapshot-heading" style={{ background: SO.greenWash, border: "1px solid " + SO.greenLine, borderRadius: 20, padding: "18px 24px" }}>
      <div style={{ display: stack ? "block" : "flex", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: narrow ? 12 : 16, paddingRight: stack ? 0 : narrow ? 16 : 24, paddingBottom: stack ? 14 : 0, marginBottom: stack ? 12 : 0, borderBottom: stack ? "1px solid " + SO.greenLine : "none", minWidth: 0, flex: "0 0 auto" }}>
          <span aria-hidden="true" style={{ width: 54, height: 54, borderRadius: 13, background: SO.greenTint, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <BarChart3 size={26} strokeWidth={2.2} style={{ color: SO.price }}/>
          </span>
          <div>
            <h2 id="so-snapshot-heading" style={{ fontFamily: SO_FONT, fontSize: 21, fontWeight: 800, letterSpacing: "-0.015em", color: SO.ink }}>Your Selling Snapshot</h2>
            <p style={{ fontFamily: SO_FONT, fontSize: 15, color: SO.text, marginTop: 2 }}>{period}</p>
          </div>
        </div>
        {items === 0 && neighbours === 0 ? (
          <p style={{ flex: 1, padding: stack ? 0 : "0 24px", borderLeft: stack ? "none" : "1px solid " + SO.greenLine, fontFamily: SO_FONT, fontSize: 15, color: SO.text }}>
            {after ? "Nothing sold in the last Drop. Unsold items are back on the Shelf." : period.startsWith("In the last") ? "No sales in the last 30 days yet. Your first sale will show up here." : "No claims in this Drop yet. They'll show up here as they come in."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: phone ? "column" : "row", flex: 1, minWidth: 0 }}>
            {stat(<Tag aria-hidden="true" size={28} strokeWidth={1.8} style={{ color: SO.orange, flexShrink: 0 }}/>, first.value, first.label, true)}
            {stat(
              <Leaf aria-hidden="true" size={28} strokeWidth={1.8} style={{ color: SO.price, flexShrink: 0 }}/>,
              <>~{lb} lb <span style={{ fontSize: 14, fontWeight: 700, color: SO.muted }}>est.</span></>,
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, position: "relative" }}>
                Kept out of landfill
                <button type="button" aria-label="About this estimate" aria-describedby="so-lb-tip" onClick={() => setTip((t) => !t)} onBlur={() => setTip(false)} onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}
                  style={{ width: 28, height: 28, border: "none", background: "transparent", color: SO.muted, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999 }}>
                  <Info size={16} aria-hidden="true"/>
                </button>
                <span id="so-lb-tip" role="tooltip" style={{ position: "absolute", left: 0, bottom: "calc(100% + 8px)", width: 260, padding: "10px 12px", borderRadius: 12, background: SO.ink, color: "#fff", fontFamily: SO_FONT, fontSize: 13, lineHeight: 1.45, boxShadow: "0 10px 24px rgba(0,0,0,0.2)", zIndex: 5, ...(tip ? {} : { width: 1, height: 1, padding: 0, overflow: "hidden", clip: "rect(0,0,0,0)" }) }}>
                  Estimated from a typical weight for each item&apos;s category. DropYard doesn&apos;t weigh items.
                </span>
              </span>,
            )}
            {stat(<Users aria-hidden="true" size={28} strokeWidth={1.8} style={{ color: SO.orange, flexShrink: 0 }}/>, neighbours, neighbours === 1 ? "Neighbour helped" : "Neighbours helped")}
          </div>
        )}
      </div>
      {after && (
        <p style={{ fontFamily: SO_HAND, fontSize: 30, fontWeight: 600, color: SO.price, marginTop: 14, lineHeight: 1.1, transform: "rotate(-1.5deg)", transformOrigin: "left" }}>Small items. Big impact.</p>
      )}
    </section>
  );
}

// ── The page ─────────────────────────────────────────────────────────────

export function SellerOverview({ firstName, accessToken, refreshKey, actions }: { firstName: string; accessToken: string | null; refreshKey: number; actions: SellerOverviewActions }) {
  const [changesAt, setChangesAt] = useState<number | null>(null);
  const { data, failed, now } = useSellerOverview(accessToken, refreshKey, changesAt);
  const nowMs = now.getTime();
  const info = data ? overviewState(nowMs, data.drops) : null;
  if (info && info.changesAt !== changesAt) setChangesAt(info.changesAt);

  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ narrow: false, stack: false, phone: false });
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      const next = { narrow: w < NARROW_BELOW, stack: w < STACK_BELOW, phone: w < PHONE_BELOW };
      setSize((cur) => (cur.narrow === next.narrow && cur.stack === next.stack && cur.phone === next.phone ? cur : next));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const shell = (children: ReactNode) => (
    <div ref={rootRef} className="fade-in dy-so-root" style={{ background: SO.page, fontFamily: SO_FONT, color: SO.ink }}>
      <SizeCtx.Provider value={size}>{children}</SizeCtx.Provider>
    </div>
  );
  if (!data || !info) {
    return shell(
      <div role="status" style={{ padding: 40, fontSize: 15, color: SO.text }}>
        {failed ? "We couldn't load your overview just now. Refresh the page to try again." : "Loading your overview…"}
      </div>,
    );
  }

  const { state } = info;
  const s = data.stats, a = data.attention;
  const isNew = s.activeListings === 0 && s.completedSales === 0 && s.awaitingPickup === 0 && data.listings.recent.length === 0 && a.drafts === 0;
  const rows = buildAttention(info, a, data.drops.current.closedStart, (slot, acceptedAt) => pickupWhen(slot, { now: new Date(nowMs), since: acceptedAt }).kind);
  const hasQueued = data.listings.liveDrop.some((l) => l.status === "queued");
  const shareBtn = actions.share && !isNew ? <OutlineButton onClick={actions.share}><Share2 size={17} aria-hidden="true"/> Share my listings</OutlineButton> : null;

  const greeting = `${greetingFor(now)}, ${firstName}`;
  let message: string, buttons: ReactNode;
  if (isNew) {
    message = state === "during" ? "The Drop is live now. List your first item: it goes on the Shelf, where neighbours can claim it straight away." : "List your first item to join Saturday's Drop.";
    buttons = <OrangeButton onClick={actions.listItem}><Plus size={18} aria-hidden="true"/> List an Item</OrangeButton>;
  } else if (state === "during") {
    message = s.inCurrentDrop > 0 && s.itemsClaimed > 0 ? "Your items are live and neighbours are already claiming them." : s.inCurrentDrop > 0 ? "Your items are live in the Drop. Neighbours can claim them now." : "The Drop is live now. Your Shelf items can be claimed too.";
    buttons = <><OrangeButton onClick={() => actions.goToItems("live")}><Eye size={18} aria-hidden="true"/> View Live Items</OrangeButton>{shareBtn}</>;
  } else if (state === "after") {
    message = "This week's Drop has wrapped up. Review your results, arrange pickups and update anything back on the Shelf.";
    buttons = <><OrangeButton onClick={() => actions.nav("history")}><BarChart3 size={18} aria-hidden="true"/> Review Results</OrangeButton><OutlineButton onClick={() => actions.nav("items")}><Box size={17} aria-hidden="true"/> View My Items</OutlineButton></>;
  } else {
    message = info.preview && hasQueued ? "Buyers are previewing your queued items now." : "Thanks for keeping good items in the community.";
    buttons = shareBtn;
  }

  const listings = state === "during"
    ? { title: "Live Drop Listings", items: data.listings.liveDrop, filter: "live" }
    : state === "after"
      ? { title: "Post-Drop Listings", items: data.listings.postDrop, filter: null }
      : { title: "My Recent Listings", items: data.listings.recent, filter: null };
  const snap = state === "during"
    ? { period: "In this live drop (so far)", first: { value: data.snapshot.currentDrop.claimed, label: "Items claimed" }, items: data.snapshot.currentDrop.claimed, lb: data.snapshot.currentDrop.lb, neighbours: data.snapshot.currentDrop.neighbours }
    : state === "after"
      ? { period: "From the last live drop", first: { value: data.snapshot.closedDrop.sold, label: "Items sold" }, items: data.snapshot.closedDrop.sold, lb: data.snapshot.closedDrop.lb, neighbours: data.snapshot.closedDrop.neighbours }
      : { period: "In the last 30 days", first: { value: data.snapshot.last30Days.sold, label: "Items sold" }, items: data.snapshot.last30Days.sold, lb: data.snapshot.last30Days.lb, neighbours: data.snapshot.last30Days.neighbours };

  return shell(
    <>
      <OverviewHero greeting={greeting} message={message} buttons={buttons}/>
      <div className="dy-so-inner" style={{ display: "flex", flexDirection: "column", gap: size.phone ? 14 : 18 }}>
        {state === "during" ? <DuringDropCard data={data} now={nowMs} info={info}/> : state === "after" ? <AfterDropCard data={data} info={info}/> : <BeforeDropCard data={data} now={nowMs}/>}
        <StatTiles data={data} after={state === "after"}/>
        <div style={{ display: "grid", gridTemplateColumns: size.stack ? "minmax(0, 1fr)" : "minmax(0, 1.08fr) minmax(0, 1fr)", gap: size.phone ? 14 : 18, alignItems: "stretch" }}>
          <AttentionList rows={rows} state={state} now={nowMs} actions={actions}/>
          <ListingsCard title={listings.title} items={listings.items} onSeeAll={() => actions.goToItems(listings.filter)} onOpen={(id) => actions.goToItems(null, id)} onListItem={actions.listItem}/>
        </div>
        <SellingSnapshot period={snap.period} first={snap.first} items={snap.items} lb={snap.lb} neighbours={snap.neighbours} after={state === "after"}/>
      </div>
    </>,
  );
}
