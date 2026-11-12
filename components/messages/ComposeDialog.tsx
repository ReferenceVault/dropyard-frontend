"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Heart, Loader2, MessageSquare, X } from "lucide-react";
import { ModalA11y } from "@/components/ModalA11y";
import { ModalPortal } from "@/components/ModalPortal";
import { Z, DIALOG_PANEL } from "@/lib/layers";
import { MC, MF } from "./theme";

export interface ComposeItem {
  id: string;
  title: string;
  price: number;
  /** Seller, "First L.". */
  sellerName: string;
  thumb: ReactNode;
  /** An existing thread with this seller about this item. */
  conversationId?: string | null;
}

export interface ComposeDialogProps {
  loading: boolean;
  error?: string | null;
  items: ComposeItem[];
  /** Open the thread that already exists. */
  onOpenExisting: (item: ComposeItem) => void;
  /** Start the thread with its first message. Throw to show an error. */
  onSend: (item: ComposeItem, body: string) => Promise<void>;
  onDiscover: () => void;
  onClose: () => void;
}

/**
 * "New message" for buyers: pick one of your saved items, write the first
 * message, send. The thread is only created on send, so the seller never
 * gets an empty conversation. An item you already have a thread about just
 * opens that thread.
 */
export function ComposeDialog({ loading, error = null, items, onOpenExisting, onSend, onDiscover, onClose }: ComposeDialogProps) {
  const [picked, setPicked] = useState<ComposeItem | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bodyId = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (picked) textRef.current?.focus(); }, [picked]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!picked) return;
    const text = body.trim();
    if (!text) { setSendError("Write a message first."); return; }
    setBusy(true);
    setSendError(null);
    try {
      await onSend(picked, text);
    } catch (err) {
      setSendError(err instanceof Error && err.message ? err.message : "Couldn't send. Try again.");
      setBusy(false);
    }
  }

  const priceText = (p: number) => (p > 0 ? `$${p}` : "Free");

  return (
    <ModalPortal>
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: Z.modal, background: "rgba(15,54,11,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <ModalA11y label="New message" onClose={busy ? null : onClose} />
      <div className={DIALOG_PANEL} style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", borderRadius: 18, background: MC.paper, boxShadow: "0 24px 60px rgba(15,54,11,0.25)", overflow: "hidden" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", borderBottom: "1px solid " + MC.fawn, flexShrink: 0 }}>
          {picked && (
            <button type="button" onClick={() => { setPicked(null); setSendError(null); }} disabled={busy} aria-label="Back to saved items" style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: MC.sand, color: MC.mink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <ArrowLeft size={17} aria-hidden="true" />
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: MF.head, fontSize: 18, fontWeight: 900, color: MC.ink }}>New message</h2>
            <p style={{ fontFamily: MF.body, fontSize: 12.5, fontWeight: 600, color: MC.mink, marginTop: 2 }}>
              {picked ? `To ${picked.sellerName}, about ${picked.title}` : "Choose one of your saved items to message its seller."}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: MC.sand, color: MC.mink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        {picked ? (
          <form onSubmit={send} noValidate style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <label htmlFor={bodyId} style={{ fontFamily: MF.head, fontSize: 13, fontWeight: 800, color: MC.ink }}>Your message</label>
            <textarea
              ref={textRef}
              id={bodyId}
              value={body}
              onChange={(e) => { setBody(e.target.value.slice(0, 2000)); if (sendError) setSendError(null); }}
              rows={4}
              placeholder="Hi! Is this still available?"
              aria-invalid={!!sendError}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1.5px solid " + (sendError ? MC.claret : MC.fawn), fontFamily: MF.body, fontSize: 16, color: MC.ink, resize: "vertical", background: MC.paper }}
            />
            {sendError && <p role="alert" style={{ fontFamily: MF.body, fontSize: 13, fontWeight: 700, color: MC.claret }}>{sendError}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="submit" disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44, padding: "10px 22px", borderRadius: 999, border: "none", background: MC.green, color: "#fff", fontFamily: MF.head, fontSize: 14, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
                {busy && <Loader2 size={15} aria-hidden="true" style={{ animation: "spin 900ms linear infinite" }} />}
                {busy ? "Sending…" : "Send message"}
              </button>
            </div>
          </form>
        ) : loading ? (
          <p role="status" style={{ padding: 28, textAlign: "center", fontFamily: MF.body, fontSize: 13, fontWeight: 600, color: MC.ash }}>Loading your saved items…</p>
        ) : error ? (
          <p role="alert" style={{ padding: 28, textAlign: "center", fontFamily: MF.body, fontSize: 13, fontWeight: 700, color: MC.claret }}>{error}</p>
        ) : items.length === 0 ? (
          <div style={{ padding: "28px 24px 26px", textAlign: "center" }}>
            <span aria-hidden="true" style={{ width: 52, height: 52, margin: "0 auto 12px", borderRadius: "50%", background: MC.greenMist, color: MC.greenDeep, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Heart size={22} />
            </span>
            <p style={{ fontFamily: MF.head, fontSize: 16, fontWeight: 800, color: MC.ink }}>Save items you like to message their sellers</p>
            <p style={{ fontFamily: MF.body, fontSize: 13, fontWeight: 500, color: MC.mink, marginTop: 6 }}>
              Tap the heart on any listing and it shows up here.
            </p>
            <button type="button" onClick={onDiscover} style={{ marginTop: 16, minHeight: 44, padding: "10px 22px", borderRadius: 999, border: "none", background: MC.green, color: "#fff", fontFamily: MF.head, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              Browse Discover
            </button>
          </div>
        ) : (
          <ul aria-label="Saved items" style={{ listStyle: "none", margin: 0, padding: 8, overflowY: "auto" }}>
            {items.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => (it.conversationId ? onOpenExisting(it) : setPicked(it))}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 12, border: "none", background: "transparent", textAlign: "left", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = MC.greenWash; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", background: MC.sand, border: "1px solid " + MC.fawn, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{it.thumb}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontFamily: MF.head, fontSize: 14, fontWeight: 800, color: MC.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
                    <span style={{ display: "block", fontFamily: MF.body, fontSize: 12, fontWeight: 600, color: MC.mink }}>{priceText(it.price)} · {it.sellerName}</span>
                  </span>
                  {it.conversationId && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, padding: "3px 9px", borderRadius: 999, background: MC.greenMist, color: MC.greenDeep, fontFamily: MF.head, fontSize: 11, fontWeight: 800 }}>
                      <MessageSquare size={11} aria-hidden="true" /> Open thread
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
    </ModalPortal>
  );
}
