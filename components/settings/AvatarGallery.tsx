"use client";

import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DIALOG_PANEL } from "@/lib/layers";
import { Check, Loader2, X } from "lucide-react";
import { ModalA11y } from "@/components/ModalA11y";
import type { AvatarPreset } from "@/lib/avatar";
import { T } from "./profileTheme";

/**
 * The DropYard avatar gallery. A radio group: arrow keys move between
 * avatars, the current choice is marked with a tick and announced as
 * checked, and nothing is saved until "Use this avatar". The list comes from
 * the backend registry (GET /api/avatars/presets), so adding an avatar needs
 * no frontend change.
 */
export function AvatarGallery({ presets, loading, loadError, currentId, onCancel, onSave, saving, error }: {
  presets: AvatarPreset[];
  loading: boolean;
  loadError: string | null;
  currentId: string | null;
  onCancel: () => void;
  onSave: (presetId: string) => void;
  saving: boolean;
  error: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(currentId ?? null);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusIndex = Math.max(0, presets.findIndex((p) => p.id === (selected ?? currentId)));

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const cols = Math.max(1, Math.round((e.currentTarget.parentElement?.clientWidth ?? 300) / (e.currentTarget.clientWidth || 80)));
    const delta: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    let next = i;
    if (e.key in delta) next = Math.min(presets.length - 1, Math.max(0, i + delta[e.key]));
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = presets.length - 1;
    else return;
    e.preventDefault();
    setSelected(presets[next].id);
    refs.current[next]?.focus();
  };

  const selectedPreset = presets.find((p) => p.id === selected) ?? null;
  const unchanged = !selected || selected === currentId;

  return createPortal(
    <div style={T.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onCancel(); }}>
      <div className={DIALOG_PANEL} style={{ ...T.dialog, maxWidth: 560 }}>
        <ModalA11y label="Choose an avatar" onClose={saving ? null : onCancel} />
        <div style={T.dialogHead}>
          <h2 style={T.dialogTitle}>Choose an avatar</h2>
          <button type="button" onClick={onCancel} disabled={saving} aria-label="Close" style={T.iconButton}><X size={18} aria-hidden /></button>
        </div>
        <p style={{ ...T.muted, marginTop: 4 }}>Pick the one that feels like you. You can change it any time.</p>

        {loading && (
          <p style={{ ...T.muted, display: "flex", alignItems: "center", gap: 8, marginTop: 18 }}>
            <Loader2 size={16} className="animate-spin" aria-hidden /> Loading avatars…
          </p>
        )}
        {loadError && <p role="alert" style={{ ...T.error, marginTop: 16 }}>{loadError}</p>}

        {!loading && !loadError && (
          <div
            role="radiogroup"
            aria-label="DropYard avatars"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 12, marginTop: 18 }}
          >
            {presets.map((p, i) => {
              const isSelected = p.id === selected;
              const isCurrent = p.id === currentId;
              return (
                <button
                  key={p.id}
                  ref={(el) => { refs.current[i] = el; }}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={p.label + (isCurrent ? " (your current avatar)" : "")}
                  tabIndex={i === focusIndex ? 0 : -1}
                  onClick={() => setSelected(p.id)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className="dy-focus"
                  style={{
                    position: "relative", aspectRatio: "1", width: "100%", padding: 4, borderRadius: "50%",
                    border: "3px solid " + (isSelected ? T.c.green : "transparent"),
                    background: isSelected ? T.c.greenMist : "transparent", cursor: "pointer",
                    transition: "border-color 120ms ease, background 120ms ease",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" width={96} height={96} style={{ width: "100%", height: "100%", borderRadius: "50%", display: "block", objectFit: "cover" }} />
                  {isSelected && (
                    <span aria-hidden style={{ position: "absolute", right: 0, bottom: 0, width: 24, height: 24, borderRadius: "50%", background: T.c.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <p aria-live="polite" style={{ ...T.muted, marginTop: 14, minHeight: 20 }}>
          {selectedPreset ? (selected === currentId ? `Current avatar: ${selectedPreset.label}.` : `Selected: ${selectedPreset.label}.`) : ""}
        </p>
        {error && <p role="alert" style={{ ...T.error, marginTop: 8 }}>{error}</p>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 14, ...T.dialogFoot }}>
          <button type="button" onClick={onCancel} disabled={saving} style={T.secondaryButton}>Cancel</button>
          <button type="button" onClick={() => selected && onSave(selected)} disabled={unchanged || saving} style={T.primaryButton(unchanged || saving)}>
            {saving && <Loader2 size={14} className="animate-spin" aria-hidden />}
            {saving ? "Saving…" : "Use this avatar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default AvatarGallery;
