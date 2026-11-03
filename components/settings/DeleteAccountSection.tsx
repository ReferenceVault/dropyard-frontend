"use client";

import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";
import { ModalA11y } from "@/components/ModalA11y";

// The dashboards inject an unlayered `* { margin: 0; padding: 0 }`, which
// outranks Tailwind's layered spacing utilities, so spacing here is inline.
const BTN_PAD = { padding: "10px 16px" };
const DIALOG_X = 22;

// Per-tab keys that belong to the signed-in person. clearAuth() handles the
// localStorage side.
const SESSION_KEYS = ["dropyard:verify-banner-dismissed"];

/**
 * The "Delete account" danger zone at the foot of Settings, shared by the
 * buyer and seller dashboards. Nothing is cleared locally until the API has
 * confirmed the deletion; a failure leaves the person signed in with the
 * reason on screen.
 */
export default function DeleteAccountSection() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user || user.role === "ADMIN") return null;

  return (
    <section
      aria-labelledby="delete-account-heading"
      style={{ padding: 22 }}
      className="rounded-2xl bg-white border border-rose-200 flex flex-col sm:flex-row sm:items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <h2 id="delete-account-heading" className="text-[15px] font-bold text-[#1F1D19] flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-600 shrink-0" aria-hidden="true" />
          Delete account
        </h2>
        <p style={{ marginTop: 4 }} className="text-[13px] leading-relaxed text-slate-600">
          Permanently delete your DropYard account, for buying and selling. This can&apos;t be undone.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={BTN_PAD}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white text-[13px] font-bold text-rose-700 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 transition shrink-0"
      >
        <Trash2 size={14} aria-hidden="true" /> Delete account…
      </button>
      {/* Portalled: the dashboards animate their content with transforms,
          which would otherwise pin this fixed overlay to that box, not the screen. */}
      {open && createPortal(<DeleteAccountDialog onClose={() => setOpen(false)} />, document.body)}
    </section>
  );
}

function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const { user, clearAuth } = useAuth();
  const hasPassword = user?.hasPassword !== false;
  const [secret, setSecret] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  // State updates are async, so a fast double click could pass the
  // `deleting` check twice. The ref can't.
  const inFlight = useRef(false);

  const ready = understood && secret.trim().length > 0 && !deleting;
  const close = () => { if (!inFlight.current) onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || inFlight.current) return;
    inFlight.current = true;
    setDeleting(true);
    setError("");
    try {
      await apiRequest("/api/auth/me", {
        method: "DELETE",
        body: JSON.stringify(hasPassword ? { password: secret } : { confirmEmail: secret.trim() }),
      });
    } catch (err) {
      inFlight.current = false;
      setDeleting(false);
      setError(err instanceof Error ? err.message : "We couldn't delete your account. Please try again.");
      return;
    }
    // Confirmed by the server: only now forget the session on this device.
    clearAuth();
    for (const key of SESSION_KEYS) {
      try { window.sessionStorage.removeItem(key); } catch { /* private mode */ }
    }
    window.location.replace("/join?deleted=1");
  };

  return (
    <div
      className="fixed inset-0 z-1000 flex items-end sm:items-center justify-center bg-black/45"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <ModalA11y label="Delete your DropYard account" onClose={close} />
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-120 max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-start gap-3" style={{ padding: `20px ${DIALOG_X}px 12px` }}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200 shrink-0">
            <AlertTriangle size={17} aria-hidden="true" />
          </span>
          <h2 className="flex-1 text-[17px] font-bold text-[#1F1D19]" style={{ paddingTop: 6 }}>Delete your account?</h2>
          <button
            type="button"
            onClick={close}
            disabled={deleting}
            aria-label="Cancel"
            style={{ padding: 6 }}
            className="rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex flex-col gap-4" style={{ padding: `0 ${DIALOG_X}px 20px` }}>
          <ul className="list-disc flex flex-col gap-1 text-[13px] leading-relaxed text-slate-700" style={{ paddingLeft: 20 }}>
            <li>Your profile, saved items and preferences are erased.</li>
            <li>Your listings come down. Any open claims, as buyer or seller, are cancelled and the other person is told.</li>
            <li>Past messages and completed sales stay with the other person, shown as &ldquo;Deleted user&rdquo;.</li>
            <li>You&apos;re signed out everywhere and can&apos;t get the account back.</li>
          </ul>

          <label htmlFor="delete-account-secret" className="block">
            <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500" style={{ marginBottom: 6 }}>
              {hasPassword ? "Your password" : "Type your email to confirm"}
            </span>
            <input
              id="delete-account-secret"
              type={hasPassword ? "password" : "email"}
              value={secret}
              onChange={(e) => { setSecret(e.target.value); if (error) setError(""); }}
              autoComplete={hasPassword ? "current-password" : "off"}
              placeholder={hasPassword ? "••••••••" : user?.email}
              disabled={deleting}
              style={{ padding: "10px 14px" }}
              className="w-full rounded-xl border border-slate-200 bg-white text-[14px] text-slate-900 placeholder-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100 transition disabled:opacity-60"
            />
          </label>

          <label className="flex items-start gap-2.5 text-[13px] text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              disabled={deleting}
              style={{ marginTop: 2 }}
              className="h-4 w-4 shrink-0 accent-rose-600"
            />
            I understand this permanently deletes my account and can&apos;t be undone.
          </label>

          {error && (
            <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200" style={{ padding: "8px 12px" }}>
              <p className="text-[12.5px] text-rose-700 font-medium">{error}</p>
            </div>
          )}
        </div>

        <footer style={{ padding: `16px ${DIALOG_X}px` }} className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 border-t border-[#EDE8E0]">
          <button
            type="button"
            onClick={close}
            disabled={deleting}
            style={BTN_PAD}
            className="rounded-lg border border-slate-200 bg-white text-[13px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Keep my account
          </button>
          <button
            type="submit"
            disabled={!ready}
            aria-busy={deleting}
            style={BTN_PAD}
            className={`inline-flex items-center justify-center gap-2 rounded-lg text-[13px] font-bold transition ${
              ready || deleting ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-rose-100 text-rose-300 cursor-not-allowed"
            }`}
          >
            {deleting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </footer>
      </form>
    </div>
  );
}
