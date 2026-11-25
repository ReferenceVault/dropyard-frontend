"use client";

// The share button on an item card, and its share menu. On phones it opens
// the device's own share sheet (as the buyer dashboard's cards do); anywhere
// else, or if that isn't available or fails, the share menu: WhatsApp,
// Facebook, X, Email, Messages and Copy link (the seller share sheet's
// options, lib/share.ts), for the item's public page (/item/{id}?ref=share).
// Works signed out, and on your own listings. Used on homepage cards, the
// public item page (app/item/[id]) and the buyer dashboard's cards.

import { useId, useState } from "react";
import { Check, Link2, Share2, X as Close } from "lucide-react";
import { ModalA11y } from "@/components/ModalA11y";
import { ModalPortal } from "@/components/ModalPortal";
import { Z, DIALOG_PANEL } from "@/lib/layers";
import { copyText, itemShareText, openShareWindow, publicItemUrl, shareLinks } from "@/lib/share";

export interface ShareableItem { id: string; title: string; price?: number | null }

// How the button looks where it sits:
//   home: homepage cards and the item page (pale green disc, soft shadow)
//   card: buyer dashboard cards (pale green disc, flat, as their old button)
//   chip: buyer dashboard sneak-peek cards (32px white disc beside a 32px
//         heart), with an invisible 44px tap area around it
const LOOKS = {
  home: "bg-[#EFF7ED] text-dy-green shadow-[0_4px_12px_-4px_rgba(15,54,11,0.25)] hover:bg-dy-pale hover:text-dy-green-strong",
  card: "bg-[#EFF7ED] text-[#308424] hover:bg-dy-pale hover:text-dy-green-strong",
  chip: "relative bg-white/92 text-[#308424] shadow-[0_2px_6px_rgba(31,29,25,0.15)] hover:bg-white before:absolute before:-inset-1.5 before:content-['']",
} as const;

export function ItemShareButton({ item, className = "", look = "home" }: { item: ShareableItem; className?: string; look?: keyof typeof LOOKS }) {
  const [open, setOpen] = useState(false);

  async function onShare() {
    const url = publicItemUrl(item.id);
    const phone = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    if (phone && typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: item.title, text: itemShareText(item.title, item.price), url });
        return;
      } catch (err) {
        // Dismissed: nothing to do. Anything else: the menu instead.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    setOpen(true);
  }

  // Clicks and keys on the button or in its menu stop here. A card that opens
  // its item on click (the buyer dashboard's) would otherwise get them too:
  // React passes events from the menu's portal up to the card.
  // Only clicks and Enter/Space: Escape and Tab must still reach the menu's
  // document listeners (close, focus trap; see ModalA11y).
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const stopKeys = (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); };
  return (
    <span onClick={stop} onKeyDown={stopKeys} className="contents">
      <button
        type="button"
        onClick={onShare}
        aria-label={`Share ${item.title}`}
        aria-haspopup="dialog"
        className={`dy-focus flex shrink-0 items-center justify-center rounded-full transition-colors ${LOOKS[look]} ${className}`}
      >
        <Share2 className="h-[46%] w-[46%]" strokeWidth={2} aria-hidden />
      </button>
      {open && <ItemShareMenu item={item} onClose={() => setOpen(false)} />}
    </span>
  );
}

function ItemShareMenu({ item, onClose }: { item: ShareableItem; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const headingId = useId();
  const url = publicItemUrl(item.id);
  const text = itemShareText(item.title, item.price);
  const priceLabel = typeof item.price === "number" ? (item.price === 0 ? "Free" : `$${item.price}`) : null;

  async function copy() {
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }
  const targets: Array<{ id: string; label: string; glyph: React.ReactNode; tone: string; action: () => void }> = [
    { id: "whatsapp", label: "WhatsApp", glyph: "💬", tone: "bg-[#E8F8EE]", action: () => openShareWindow(shareLinks.whatsapp(`${text}\n${url}`)) },
    { id: "facebook", label: "Facebook", glyph: <span className="font-bold text-[#1877F2]">f</span>, tone: "bg-[#E7F0FE]", action: () => openShareWindow(shareLinks.facebook(url, text)) },
    { id: "x",        label: "X",        glyph: "𝕏", tone: "bg-[#F2F2F2]", action: () => openShareWindow(shareLinks.x(`${text} ${url}`)) },
    { id: "email",    label: "Email",    glyph: "✉", tone: "bg-dy-pale", action: () => { window.location.href = shareLinks.email(`${item.title} on DropYard`, `${text}\n\n${url}`); } },
    { id: "sms",      label: "Messages", glyph: "💌", tone: "bg-[#FFF7ED]", action: () => { window.location.href = shareLinks.sms(`${text} ${url}`); } },
    { id: "copy",     label: copied ? "Copied!" : "Copy link", glyph: copied ? <Check className="h-5 w-5 text-dy-green-strong" aria-hidden /> : <Link2 className="h-5 w-5 text-dy-forest" aria-hidden />, tone: copied ? "bg-emerald-50" : "bg-dy-pale", action: copy },
  ];

  return (
    <ModalPortal>
      <div
        onClick={onClose}
        className="fixed inset-0 flex items-end justify-center bg-black/50 backdrop-blur-[3px] sm:items-center"
        // Spacing as inline styles throughout the menu: the buyer dashboard
        // resets every element's margin and padding with plain (unlayered)
        // CSS, which beats Tailwind's spacing classes there.
        style={{ zIndex: Z.modal, padding: 12 }}
      >
        <ModalA11y label={`Share ${item.title}`} onClose={onClose} />
        <div onClick={(e) => e.stopPropagation()} className={`fade-in ${DIALOG_PANEL} w-full max-w-115 rounded-3xl bg-white font-dy shadow-[0_20px_48px_rgba(31,29,25,0.18)]`}>
          <div className="flex items-start justify-between gap-3 border-b border-dy-line" style={{ padding: "16px 20px" }}>
            <div className="flex min-w-0 items-start gap-3">
              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF7ED] text-dy-green">
                <Share2 className="h-4.5 w-4.5" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h2 id={headingId} className="text-[17px] font-bold tracking-[-0.01em] text-dy-forest">Share this item</h2>
                <p className="truncate text-[13px] font-medium text-dy-mid" style={{ marginTop: 2 }}>{item.title}{priceLabel ? ` · ${priceLabel}` : ""}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="dy-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-dy-pale text-dy-mid hover:text-dy-forest">
              <Close className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div style={{ padding: "16px 20px 20px" }}>
            <p className="break-all rounded-xl border border-dy-line bg-dy-pale text-[13px] leading-snug text-dy-mid" style={{ padding: "8px 12px" }}>{url}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-dy-mid" style={{ margin: "16px 0 10px" }}>Share via</p>
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {targets.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={t.action} className={`dy-focus flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dy-line text-[13px] font-semibold text-dy-forest transition-transform hover:-translate-y-px ${t.tone}`} style={{ padding: "10px 8px" }}>
                    <span aria-hidden className="text-[20px] leading-none">{t.glyph}</span>
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
            <p className="sr-only" aria-live="polite">{copied ? "Link copied" : ""}</p>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
