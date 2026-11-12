"use client";

/**
 * Public item page gallery (app/item/[id]) — also what a shared link opens.
 *
 * The page stays a server component (its Open Graph tags are what WhatsApp,
 * Facebook, iMessage… unfurl); only this part runs in the browser. It gets
 * the item's full `photos` array from the page, so nothing extra is fetched
 * and nothing needs a session.
 *
 *   Main photo   arrows (wrap around), "2 / 5" counter, swipe on touch,
 *                ←/→ keys while it has focus; click/tap opens the viewer.
 *   Thumbnails   every photo; the current one is ringed.
 *   Viewer       full screen, whole photo, prev/next + counter, zoom with
 *                the +/− buttons, the mouse wheel, double-click, or a pinch;
 *                drag to pan when zoomed; Esc, × or a click outside closes.
 *
 * One photo: no arrows, counter or thumbnails. None: the old 📦 placeholder.
 * A photo that fails to load shows a "Photo unavailable" tile instead of a
 * broken-image icon.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, ImageOff } from "lucide-react";
import { ModalA11y } from "@/components/ModalA11y";
import { Z } from "@/lib/layers";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const SWIPE_PX = 40;

interface Props {
  photos: string[];
  title: string;
  /** "Sold" / "Claimed" label over the main photo, if any. */
  badge?: string | null;
}

export default function ItemGallery({ photos, title, badge = null }: Props) {
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const count = photos.length;
  const many = count > 1;
  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);
  const markFailed = (i: number) => setFailed((f) => (f[i] ? f : { ...f, [i]: true }));

  // Swipe on the main photo (touch only; a mostly-vertical move is a scroll).
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { swiped.current = false; const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current; touch.current = null;
    if (!start || !many) return;
    const t = e.changedTouches[0], dx = t.clientX - start.x, dy = t.clientY - start.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped.current = true; go(dx < 0 ? 1 : -1); }
  };
  // Some browsers follow a swipe with a click; ignore that one click. The flag
  // is cleared by the next touchstart, so a later, genuine tap always works.
  const swiped = useRef(false);

  if (count === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <div className="flex h-64 items-center justify-center text-5xl">📦</div>
        {badge && <Badge text={badge}/>}
      </div>
    );
  }

  const arrow = "absolute top-1/2 z-[2] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-800 shadow-md backdrop-blur transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600";

  return (
    // min-w-0: as a grid item this would otherwise grow to the thumbnail
    // strip's full width (5 thumbs ≈ 512px) and overflow a phone screen.
    <div className="min-w-0">
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={`Photos of ${title}`}
        tabIndex={many ? 0 : -1}
        onKeyDown={(e) => { if (!many) return; if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); } if (e.key === "ArrowRight") { e.preventDefault(); go(1); } }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        // touch-pan-y: horizontal swipes belong to the carousel (otherwise the
        // browser may take them as "go back"); vertical ones still scroll.
        className="relative aspect-[4/3] max-h-[420px] w-full touch-pan-y overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
      >
        <button
          type="button"
          onClick={() => { if (swiped.current) return; setViewerOpen(true); }}
          aria-label={`Open photo ${index + 1} of ${count} full screen`}
          className="block h-full w-full cursor-zoom-in"
        >
          {failed[index] ? (
            <Unavailable/>
          ) : (
            // Plain <img>: remote S3 URLs; next/image would need every bucket
            // registered in next.config remotePatterns.
            // eslint-disable-next-line @next/next/no-img-element
            <img key={photos[index]} src={photos[index]} alt={`${title} — photo ${index + 1} of ${count}`} draggable={false} onError={() => markFailed(index)} className="h-full w-full select-none object-cover"/>
          )}
        </button>
        {badge && <Badge text={badge}/>}
        {many && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className={arrow + " left-3"}><ChevronLeft size={22} strokeWidth={2.4}/></button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className={arrow + " right-3"}><ChevronRight size={22} strokeWidth={2.4}/></button>
            <span aria-live="polite" className="pointer-events-none absolute bottom-3 right-3 z-[2] rounded-full bg-slate-900/75 px-3 py-1 text-[12px] font-bold tabular-nums text-white">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {many && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Choose a photo">
          {photos.map((p, i) => (
            <button
              key={p + i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1} of ${count}`}
              aria-current={i === index ? "true" : undefined}
              className={`h-20 w-24 shrink-0 overflow-hidden rounded-lg border bg-slate-50 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${i === index ? "border-emerald-600 ring-2 ring-emerald-600" : "border-slate-200 opacity-80 hover:opacity-100"}`}
            >
              {failed[i] ? (
                <span className="flex h-full w-full items-center justify-center text-slate-400"><ImageOff size={18}/></span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p} alt="" draggable={false} onError={() => markFailed(i)} className="h-full w-full object-cover"/>
              )}
            </button>
          ))}
        </div>
      )}

      {viewerOpen && (
        <PhotoViewer photos={photos} title={title} index={index} onIndex={setIndex} failed={failed} onFail={markFailed} onClose={() => setViewerOpen(false)}/>
      )}
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="pointer-events-none absolute left-4 top-4 z-[2] rounded-full bg-slate-900/85 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
      {text}
    </span>
  );
}

function Unavailable() {
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
      <ImageOff size={28}/>
      <span className="text-[13px] font-semibold">Photo unavailable</span>
    </span>
  );
}

/* ── Full-screen viewer ─────────────────────────────────────────────────── */

interface ViewerProps {
  photos: string[];
  title: string;
  index: number;
  onIndex: (i: number) => void;
  failed: Record<number, boolean>;
  onFail: (i: number) => void;
  onClose: () => void;
}

function PhotoViewer({ photos, title, index, onIndex, failed, onFail, onClose }: ViewerProps) {
  const count = photos.length, many = count > 1;
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // True while a finger/mouse is down: the photo follows it without easing.
  const [dragging, setDragging] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);

  // Keep the zoomed photo covering the stage — never dragged off into empty space.
  const clampPan = useCallback((p: { x: number; y: number }, s: number) => {
    const el = img.current, st = stage.current;
    if (!el || !st || s <= 1) return { x: 0, y: 0 };
    const maxX = Math.max(0, (el.offsetWidth * s - st.clientWidth) / 2);
    const maxY = Math.max(0, (el.offsetHeight * s - st.clientHeight) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, p.x)), y: Math.min(maxY, Math.max(-maxY, p.y)) };
  }, []);
  const zoomTo = useCallback((next: number) => {
    const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    setScale(s);
    setPan((p) => clampPan(s === 1 ? { x: 0, y: 0 } : p, s));
  }, [clampPan]);
  const go = useCallback((delta: number) => { onIndex((index + delta + count) % count); setScale(1); setPan({ x: 0, y: 0 }); }, [index, count, onIndex]);

  // Keys: ←/→ photos, +/− zoom, 0 reset. (Esc is ModalA11y's.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && many) { e.preventDefault(); go(-1); }
      else if (e.key === "ArrowRight" && many) { e.preventDefault(); go(1); }
      else if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomTo(scale * 1.5); }
      else if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomTo(scale / 1.5); }
      else if (e.key === "0") { e.preventDefault(); zoomTo(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, many, scale, zoomTo]);

  // Mouse wheel zoom. Attached natively: React's wheel listener is passive and
  // can't stop the page behind from scrolling.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); zoomTo(scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2)); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scale, zoomTo]);

  // Pointers: one = drag to pan (zoomed) or swipe between photos (not zoomed);
  // two = pinch. A tap on the backdrop (not the photo) closes.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ startX: number; startY: number; panX: number; panY: number; dist: number; scale: number; moved: boolean; onPhoto: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    stage.current?.setPointerCapture(e.pointerId);
    setDragging(true);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    gesture.current = {
      startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y,
      dist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
      scale, moved: gesture.current?.moved ?? false,
      onPhoto: !!img.current && img.current.contains(e.target as Node),
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current, pts = [...pointers.current.values()];
    if (pts.length === 2 && g.dist > 0) {
      g.moved = true;
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      zoomTo(g.scale * (d / g.dist));
      return;
    }
    const dx = e.clientX - g.startX, dy = e.clientY - g.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) g.moved = true;
    if (scale > 1) setPan(clampPan({ x: g.panX + dx, y: g.panY + dy }, scale));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) { if (g) { const p = [...pointers.current.values()][0]; Object.assign(g, { startX: p.x, startY: p.y, panX: pan.x, panY: pan.y, dist: 0, scale }); } return; }
    gesture.current = null;
    setDragging(false);
    if (!g) return;
    const dx = e.clientX - g.startX, dy = e.clientY - g.startY;
    if (scale === 1 && many && Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) { go(dx < 0 ? 1 : -1); return; }
    if (!g.moved && !g.onPhoto) onClose();
  };

  const btn = "flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg transition hover:bg-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white";
  const pct = Math.round(scale * 100);

  return createPortal(
    <div className="fixed inset-0 flex flex-col bg-slate-950" style={{ zIndex: Z.modal }}>
      <ModalA11y label={`${title} — photo ${index + 1} of ${count}`} onClose={onClose}/>
      {/* Top bar: counter · zoom · close */}
      <div className="relative z-[2] flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
        <span className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-bold tabular-nums text-white" aria-live="polite">{index + 1} / {count}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => zoomTo(scale / 1.5)} disabled={scale <= MIN_ZOOM} aria-label="Zoom out" className={btn}><ZoomOut size={20}/></button>
          <span className="w-12 text-center text-[13px] font-bold tabular-nums text-white" aria-live="polite">{pct}%</span>
          <button type="button" onClick={() => zoomTo(scale * 1.5)} disabled={scale >= MAX_ZOOM} aria-label="Zoom in" className={btn}><ZoomIn size={20}/></button>
          <button type="button" onClick={onClose} aria-label="Close photo viewer" className={btn + " ml-2"}><X size={20}/></button>
        </div>
      </div>

      {/* Stage */}
      <div
        ref={stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => {
          // The stage captures the pointer, so e.target is the stage itself —
          // test whether the double-click landed on the photo by position.
          const r = img.current?.getBoundingClientRect();
          if (r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) zoomTo(scale > 1 ? 1 : 2.5);
        }}
        className="relative flex flex-1 touch-none select-none items-center justify-center overflow-hidden px-3 pb-6 sm:px-20"
        style={{ cursor: scale > 1 ? "grab" : "default" }}
      >
        {failed[index] ? (
          <span className="text-white/80"><Unavailable/></span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={img}
            key={photos[index]}
            src={photos[index]}
            alt={`${title} — photo ${index + 1} of ${count}`}
            draggable={false}
            onError={() => onFail(index)}
            className="max-h-full max-w-full object-contain"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transition: dragging ? "none" : "transform 120ms ease-out", cursor: scale > 1 ? "grab" : "zoom-in" }}
          />
        )}
        {many && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className={btn + " absolute left-3 top-1/2 -translate-y-1/2 sm:left-5"}><ChevronLeft size={22} strokeWidth={2.4}/></button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className={btn + " absolute right-3 top-1/2 -translate-y-1/2 sm:right-5"}><ChevronRight size={22} strokeWidth={2.4}/></button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
