"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Minus, Plus, RotateCcw, X } from "lucide-react";
import { ModalA11y } from "@/components/ModalA11y";
import { T } from "./profileTheme";

/**
 * Crop a chosen photo to the circular profile picture.
 *
 * The photo is decoded in the browser (EXIF orientation applied), shown under
 * a circular mask, and positioned by dragging (mouse, touch, pen), zooming
 * (slider, buttons, wheel, pinch) or the keyboard. Saving draws the visible
 * square onto a 512×512 canvas and re-encodes it as WebP (JPEG where WebP
 * encoding isn't available). Re-encoding is what strips EXIF/GPS: a canvas
 * export carries pixels only. The original file never leaves the device.
 *
 * Keyboard, with the photo focused: arrows move (Shift = further), + / − zoom,
 * 0 resets.
 */

export const OUTPUT_PX = 512;
// Downscale huge originals on decode: a 48 MP photo would otherwise hold
// ~200 MB of pixels in memory for a 512px result.
const MAX_DECODE_PX = 2048;
const MAX_ZOOM = 4;

type Source = { image: CanvasImageSource; width: number; height: number; preview: string; dispose: () => void };

async function decodeImage(file: File): Promise<Source> {
  const preview = URL.createObjectURL(file);
  try {
    let bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest > MAX_DECODE_PX) {
      const k = MAX_DECODE_PX / longest;
      const scaled = await createImageBitmap(bitmap, {
        resizeWidth: Math.round(bitmap.width * k),
        resizeHeight: Math.round(bitmap.height * k),
        resizeQuality: "high",
      });
      bitmap.close();
      bitmap = scaled;
    }
    const b = bitmap;
    return { image: b, width: b.width, height: b.height, preview, dispose: () => { b.close(); URL.revokeObjectURL(preview); } };
  } catch {
    // Older Safari: no createImageBitmap options. An <img> applies EXIF
    // orientation itself in every current browser.
    const img = new Image();
    img.decoding = "async";
    img.src = preview;
    try {
      await img.decode();
    } catch {
      URL.revokeObjectURL(preview);
      throw new Error("We couldn't open that image. Try a different JPG, PNG or WebP photo.");
    }
    return { image: img, width: img.naturalWidth, height: img.naturalHeight, preview, dispose: () => URL.revokeObjectURL(preview) };
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Pick a stage size that fits the viewport (320px phones included). */
function useStageSize(): number {
  const [size, setSize] = useState(300);
  useEffect(() => {
    const fit = () => setSize(Math.max(200, Math.min(320, window.innerWidth - 72)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return size;
}

export function AvatarCropper({ file, onCancel, onSave, onChooseAnother, saving, error }: {
  file: File;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
  onChooseAnother: () => void;
  saving: boolean;
  error: string | null;
}) {
  const stage = useStageSize();
  const [src, setSrc] = useState<Source | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [encoding, setEncoding] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    let alive = true;
    let current: Source | null = null;
    setSrc(null);
    setDecodeError(null);
    decodeImage(file).then(
      (s) => { if (alive) { current = s; setSrc(s); setZoom(1); setOffset({ x: 0, y: 0 }); } else s.dispose(); },
      (e: Error) => { if (alive) setDecodeError(e.message); },
    );
    return () => { alive = false; current?.dispose(); };
  }, [file]);

  // "Cover" scale at zoom 1: the short side exactly fills the circle.
  const base = src ? stage / Math.min(src.width, src.height) : 1;
  const drawW = src ? src.width * base * zoom : stage;
  const drawH = src ? src.height * base * zoom : stage;

  const clamp = useCallback((o: { x: number; y: number }, w = drawW, h = drawH) => {
    const mx = Math.max(0, (w - stage) / 2);
    const my = Math.max(0, (h - stage) / 2);
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
  }, [drawW, drawH, stage]);

  const applyZoom = useCallback((next: number) => {
    if (!src) return;
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    const w = src.width * base * z;
    const h = src.height * base * z;
    // Keep the point under the centre fixed while zooming.
    setOffset((o) => clamp({ x: (o.x * z) / zoom, y: (o.y * z) / zoom }, w, h));
    setZoom(z);
  }, [src, base, zoom, clamp]);

  // Re-clamp if the stage resizes (rotating a phone).
  useEffect(() => { setOffset((o) => clamp(o)); }, [clamp]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      applyZoom(pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist));
      return;
    }
    setOffset((o) => clamp({ x: o.x + e.clientX - prev.x, y: o.y + e.clientY - prev.y }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  // Wheel zoom needs a non-passive listener to stop the page scrolling.
  const stageRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(applyZoom);
  useEffect(() => { zoomRef.current = applyZoom; }, [applyZoom]);
  const zoomValue = useRef(zoom);
  useEffect(() => { zoomValue.current = zoom; }, [zoom]);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current(zoomValue.current * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [src]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      setOffset((o) => clamp({ x: o.x + dx, y: o.y + dy }));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault(); applyZoom(zoom + 0.1);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault(); applyZoom(zoom - 0.1);
    } else if (e.key === "0" || e.key === "Home") {
      e.preventDefault(); setZoom(1); setOffset({ x: 0, y: 0 });
    }
  };

  const save = async () => {
    if (!src) return;
    setEncoding(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_PX;
      canvas.height = OUTPUT_PX;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      const k = OUTPUT_PX / stage;
      // Transparent PNGs get a white backdrop (JPEG has no transparency).
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, OUTPUT_PX, OUTPUT_PX);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const left = stage / 2 + offset.x - drawW / 2;
      const top = stage / 2 + offset.y - drawH / 2;
      ctx.drawImage(src.image, left * k, top * k, drawW * k, drawH * k);
      let blob = await toBlob(canvas, "image/webp", 0.9);
      // Browsers that can't encode WebP hand back a PNG instead; prefer JPEG.
      if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", 0.9);
      if (!blob) throw new Error("encode failed");
      onSave(blob);
    } catch {
      setDecodeError("We couldn't prepare that photo. Try a different one.");
    } finally {
      setEncoding(false);
    }
  };

  const imgStyle = (box: number): React.CSSProperties => {
    const k = box / stage;
    return {
      position: "absolute",
      width: drawW * k,
      height: drawH * k,
      left: (stage / 2 + offset.x - drawW / 2) * k,
      top: (stage / 2 + offset.y - drawH / 2) * k,
      maxWidth: "none",
      pointerEvents: "none",
      userSelect: "none",
    };
  };

  const busy = saving || encoding;
  const shownError = decodeError || error;
  const zoomPct = useMemo(() => Math.round(((zoom - 1) / (MAX_ZOOM - 1)) * 100), [zoom]);

  return createPortal(
    <div style={T.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
      <div style={{ ...T.dialog, maxWidth: 440 }}>
        <ModalA11y label="Adjust your profile picture" onClose={busy ? null : onCancel} />
        <div style={T.dialogHead}>
          <h2 style={T.dialogTitle}>Adjust your photo</h2>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="Close" style={T.iconButton}><X size={18} aria-hidden /></button>
        </div>
        <p style={{ ...T.muted, marginTop: 4 }}>Drag to reposition. Zoom with the slider{typeof window !== "undefined" && "ontouchstart" in window ? " or pinch" : ""}.</p>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <div
            ref={stageRef}
            role="application"
            aria-roledescription="photo cropper"
            aria-label="Photo position. Use the arrow keys to move it, plus and minus to zoom, 0 to reset."
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              position: "relative", width: stage, height: stage, overflow: "hidden", borderRadius: 16,
              background: T.c.page, cursor: src ? "grab" : "default", touchAction: "none", outlineOffset: 3,
            }}
            className="dy-focus"
          >
            {src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src.preview} alt="" draggable={false} style={imgStyle(stage)} />
            )}
            {!src && !decodeError && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: T.c.mink }}>
                <Loader2 size={22} className="animate-spin" aria-hidden /><span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Loading photo</span>
              </div>
            )}
            {/* Circular mask: everything outside the circle is dimmed. */}
            <div aria-hidden style={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: "0 0 0 9999px rgba(15, 54, 11, 0.55)", border: "2px solid rgba(255,255,255,0.9)", pointerEvents: "none" }} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
          <button type="button" onClick={() => applyZoom(zoom - 0.25)} disabled={!src || zoom <= 1} aria-label="Zoom out" style={T.iconButton}><Minus size={16} aria-hidden /></button>
          <input
            type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom}
            onChange={(e) => applyZoom(Number(e.target.value))}
            disabled={!src}
            aria-label="Zoom"
            aria-valuetext={`${zoomPct}% zoom`}
            style={{ flex: 1, accentColor: T.c.green, minWidth: 0 }}
          />
          <button type="button" onClick={() => applyZoom(zoom + 0.25)} disabled={!src || zoom >= MAX_ZOOM} aria-label="Zoom in" style={T.iconButton}><Plus size={16} aria-hidden /></button>
          <button type="button" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} disabled={!src} aria-label="Reset position and zoom" style={T.iconButton}><RotateCcw size={15} aria-hidden /></button>
        </div>

        {/* Live preview at the sizes people will actually see. */}
        {src && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16, padding: "12px 14px", borderRadius: 12, background: T.c.page }}>
            {[72, 38, 28].map((d) => (
              <span key={d} aria-hidden style={{ position: "relative", width: d, height: d, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#fff", boxShadow: "0 0 0 1.5px " + T.c.greenMist }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src.preview} alt="" style={imgStyle(d)} />
              </span>
            ))}
            <p style={{ ...T.muted, margin: 0 }}>How it&apos;ll look on your listings and in the header.</p>
          </div>
        )}

        {/* A small original is enlarged to fill the 512px picture and will look
            soft on sharp screens. Say so, without blocking it. */}
        {src && Math.min(src.width, src.height) < 256 && (
          <p style={{ ...T.muted, fontSize: 12.5, marginTop: 12, color: T.c.amberDeep }}>
            This photo is quite small ({src.width}×{src.height}), so it may look a little soft. A larger photo will look sharper.
          </p>
        )}

        {shownError && <p role="alert" style={{ ...T.error, marginTop: 14 }}>{shownError}</p>}

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 18 }}>
          <button type="button" onClick={onChooseAnother} disabled={busy} style={T.linkButton}>Choose a different photo</button>
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button type="button" onClick={onCancel} disabled={busy} style={T.secondaryButton}>Cancel</button>
            <button type="button" onClick={save} disabled={!src || busy} style={T.primaryButton(!src || busy)}>
              {busy && <Loader2 size={14} className="animate-spin" aria-hidden />}
              {busy ? "Saving…" : "Save photo"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default AvatarCropper;
