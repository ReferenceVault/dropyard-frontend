"use client";

// BUG-071 — Admin "Email Blasts" page.
// Lists subscribers, lets an admin compose + preview + send an email blast
// to every active early-access subscriber. Send is two-step (preview + confirm
// modal) per the safety guardrails chosen in the spec.

import React, { useCallback, useEffect, useState } from "react";
import { Mail, Loader2, Send, X, RefreshCw, Eye, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

interface Subscriber {
  id:              string;
  email:           string;
  source:          string;
  subscribedAt:    string;
  unsubscribedAt?: string | null;
}

interface BlastHistoryItem {
  id:             string;
  subject:        string;
  sentAt:         string;
  recipientCount: number;
  sentByUserId:   string;
}

export default function EmailBlastsPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [active, setActive]           = useState(0);
  const [unsubbed, setUnsubbed]       = useState(0);
  const [history, setHistory]         = useState<BlastHistoryItem[]>([]);
  const [loading, setLoading]         = useState(true);

  const [subject, setSubject]               = useState("");
  const [previewHtml, setPreviewHtml]       = useState<string | null>(null);
  const [previewItemCount, setPreviewItemCount] = useState<number>(0);
  const [previewing, setPreviewing]         = useState(false);
  const [confirmOpen, setConfirmOpen]       = useState(false);
  const [sending, setSending]               = useState(false);
  const [sendResult, setSendResult]         = useState<string | null>(null);
  const [sendError, setSendError]           = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [{ active, unsubbed, subscribers }, { blasts }] = await Promise.all([
        apiRequest<{ active: number; unsubbed: number; subscribers: Subscriber[] }>("/api/admin/email-blasts/subscribers"),
        apiRequest<{ blasts: BlastHistoryItem[] }>("/api/admin/email-blasts"),
      ]);
      setActive(active);
      setUnsubbed(unsubbed);
      setSubscribers(subscribers);
      setHistory(blasts);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function loadPreview() {
    setPreviewing(true);
    setSendError(null);
    try {
      const resp = await apiRequest<{ subject: string; html: string; itemCount: number }>("/api/admin/email-blasts/preview", {
        method: "POST",
        body:   JSON.stringify({ subject }),
      });
      setPreviewHtml(resp.html);
      setPreviewItemCount(resp.itemCount);
      if (!subject) setSubject(resp.subject); // fill the suggested default
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Couldn't load preview.");
    } finally {
      setPreviewing(false);
    }
  }

  async function send() {
    setSending(true);
    setSendError(null);
    try {
      const resp = await apiRequest<{ ok: boolean; sent: number; failures: number; sentAt: string }>("/api/admin/email-blasts/send", {
        method: "POST",
        body:   JSON.stringify({ subject }),
      });
      setSendResult(`Sent to ${resp.sent} subscriber${resp.sent === 1 ? "" : "s"}${resp.failures > 0 ? ` (${resp.failures} failed)` : ""}.`);
      setConfirmOpen(false);
      setPreviewHtml(null);
      await refresh();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <AdminPageHeader title="Email Blasts" subtitle="Manually send a marketing email to every active early-access subscriber." />

      {sendResult && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2.5">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <p className="text-[13px] text-emerald-900 font-semibold flex-1">{sendResult}</p>
          <button onClick={() => setSendResult(null)} className="text-emerald-700 hover:text-emerald-900"><X size={14}/></button>
        </div>
      )}

      {/* Stats */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Active subscribers</p>
          <p className="mt-1 text-[28px] font-bold text-slate-900">{loading ? "—" : active}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Unsubscribed</p>
          <p className="mt-1 text-[28px] font-bold text-slate-900">{loading ? "—" : unsubbed}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Last send</p>
          <p className="mt-1 text-[14px] font-semibold text-slate-900">
            {history.length === 0 ? "—" : `${new Date(history[0].sentAt).toLocaleDateString()} (${history[0].recipientCount} sent)`}
          </p>
        </div>
      </section>

      {/* Compose */}
      <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <header className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-[14px] font-bold text-slate-900">Compose & send</h2>
        </header>
        <div className="p-5 space-y-4">
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-1.5">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Leave blank for auto-generated subject"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
            />
          </label>

          <div className="flex flex-wrap gap-2.5 items-center">
            <button
              onClick={loadPreview}
              disabled={previewing}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-[13px] font-semibold px-4 py-2 transition disabled:opacity-60"
            >
              {previewing ? <Loader2 size={14} className="animate-spin"/> : <Eye size={14}/>}
              Preview
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!previewHtml || active === 0}
              title={!previewHtml ? "Preview first" : active === 0 ? "No active subscribers" : ""}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold px-5 py-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={14}/>
              Send to {active} subscriber{active === 1 ? "" : "s"}
            </button>
            {previewItemCount > 0 && (
              <span className="text-[12px] text-slate-500">Including {previewItemCount} live item{previewItemCount === 1 ? "" : "s"}.</span>
            )}
          </div>

          {sendError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 flex items-center gap-2">
              <AlertCircle size={14} className="text-rose-600"/>
              <p className="text-[12px] text-rose-700 font-semibold">{sendError}</p>
            </div>
          )}

          {previewHtml && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-1.5">Preview</p>
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                <iframe srcDoc={previewHtml} title="Email preview" className="w-full h-[640px] bg-white" sandbox="" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* History */}
      <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <header className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-slate-900">Recent sends</h2>
          <button onClick={refresh} className="text-slate-500 hover:text-slate-900"><RefreshCw size={14}/></button>
        </header>
        {history.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-slate-500">No emails sent yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((b) => (
              <li key={b.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-slate-900">{b.subject}</p>
                  <p className="text-[12px] text-slate-500">{new Date(b.sentAt).toLocaleString()} · {b.recipientCount} sent</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Subscribers list */}
      <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <header className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-slate-900">Subscribers ({subscribers.length})</h2>
        </header>
        {loading ? (
          <p className="px-5 py-6 text-[13px] text-slate-500">Loading…</p>
        ) : subscribers.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-slate-500">No subscribers yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {subscribers.map((s) => (
              <li key={s.id} className="px-5 py-2.5 flex items-center justify-between text-[13px]">
                <span className={s.unsubscribedAt ? "text-slate-400 line-through" : "text-slate-900 font-medium"}>{s.email}</span>
                <span className="text-[11px] text-slate-500">
                  {s.unsubscribedAt ? `unsubscribed ${new Date(s.unsubscribedAt).toLocaleDateString()}` : `joined ${new Date(s.subscribedAt).toLocaleDateString()}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Confirm modal */}
      {confirmOpen && (
        <div
          onClick={() => !sending && setConfirmOpen(false)}
          className="fixed inset-0 bg-slate-900/45 z-50 flex items-center justify-center p-4"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-[16px] font-bold text-slate-900 mb-2">Send this email?</h3>
            <p className="text-[13px] text-slate-600 leading-relaxed mb-5">
              This will email <span className="font-bold text-slate-900">{active} active subscriber{active === 1 ? "" : "s"}</span> with the subject <span className="font-semibold">&ldquo;{subject || "(default)"}&rdquo;</span>. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                disabled={sending}
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-[13px] font-semibold hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                disabled={sending}
                onClick={send}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold disabled:opacity-60 flex items-center gap-2"
              >
                {sending && <Loader2 size={14} className="animate-spin"/>}
                {sending ? "Sending…" : `Send to ${active}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
