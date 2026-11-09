"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownUp,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Heart,
  Loader2,
  MessageSquare,
  Package,
  RotateCcw,
  ShoppingBag,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AvatarChip } from "@/components/admin/AvatarChip";
import { StatusPill, type StatusTone } from "@/components/admin/StatusPill";
import { RelativeDateBadge, relativeTime } from "@/components/admin/RelativeDateBadge";
import { categoryLabel } from "@/lib/categories";

// ── Types ────────────────────────────────────────────────────────

type ItemStatus = "DRAFT" | "LIVE" | "RESERVED" | "CLAIMED" | "SOLD" | "ARCHIVED";
type Placement = "DROP" | "SHELF";

type Moderation = {
  action: "ITEM_HIDDEN" | "ITEM_UNHIDDEN";
  reason: string | null;
  createdAt: string;
  actor: { name: string; email: string } | null;
};

type AdminItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  price: number;
  originalPrice: number | null;
  photos: string[];
  status: ItemStatus;
  placement: Placement;
  queuedAt: string | null;
  zone: string | null;
  postalCode: string | null;
  createdAt: string;
  updatedAt: string;
  seller: { id: string; name: string; email: string; status: string; neighborhood: string | null; avatar?: unknown } | null;
  activeClaims: number;
  moderation: Moderation | null;
  _count: { claims: number; watchlist: number; questions: number; conversations: number };
};

type ItemsResponse = {
  data: AdminItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  counts: Record<string, number>;
};

type TabId = "ALL" | ItemStatus;
type SortField = "createdAt" | "updatedAt" | "price" | "title";

const STATUS_META: Record<ItemStatus, { label: string; tone: StatusTone }> = {
  DRAFT:    { label: "Draft",     tone: "slate" },
  LIVE:     { label: "Live",      tone: "emerald" },
  RESERVED: { label: "Reserved",  tone: "amber" },
  CLAIMED:  { label: "Claimed",   tone: "violet" },
  SOLD:     { label: "Sold",      tone: "sky" },
  ARCHIVED: { label: "Taken down", tone: "rose" },
};

const TABS: { id: TabId; label: string }[] = [
  { id: "ALL",      label: "All" },
  { id: "LIVE",     label: "Live" },
  { id: "DRAFT",    label: "Draft" },
  { id: "RESERVED", label: "Reserved" },
  { id: "CLAIMED",  label: "Claimed" },
  { id: "SOLD",     label: "Sold" },
  { id: "ARCHIVED", label: "Taken down" },
];


function priceLabel(v: number) {
  return v === 0 ? "Free" : `$${v}`;
}

// ── Page ─────────────────────────────────────────────────────────

export default function AdminItemsPage() {
  const { accessToken } = useAuth();

  const [rows, setRows] = useState<AdminItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<TabId>("ALL");
  const [search, setSearch] = useState("");
  const [placement, setPlacement] = useState<"" | Placement>("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Takedown / restore modal
  const [target, setTarget] = useState<{ item: AdminItem; mode: "hide" | "unhide" } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Any filter change resets to page 1 — staying on page 7 of a now 2-page
  // result set renders an empty table that looks like "no items".
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setPage(1);
  }, [tab, debouncedSearch, placement, sortBy, sortDir]);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: "20",
        sortBy,
        sortDir,
      });
      if (tab !== "ALL") qs.set("status", tab);
      if (debouncedSearch) qs.set("search", debouncedSearch);
      if (placement) qs.set("placement", placement);

      const res = await apiRequest<ItemsResponse>(`/api/admin/items?${qs.toString()}`, { token: accessToken });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setCounts(res?.counts ?? {});
      setTotal(res?.total ?? 0);
      setTotalPages(res?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load items.");
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, page, tab, debouncedSearch, placement, sortBy, sortDir]);

  useEffect(() => { load(); }, [load]);

  function toggleSort(field: SortField) {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortDir(field === "title" ? "asc" : "desc"); }
  }

  function openModal(item: AdminItem, mode: "hide" | "unhide") {
    setTarget({ item, mode });
    setReason("");
    setModalError(null);
  }

  async function submitModal() {
    if (!target || busy) return;
    const { item, mode } = target;
    if (mode === "hide" && reason.trim().length < 3) {
      setModalError("Please give a reason (at least 3 characters).");
      return;
    }
    setBusy(true);
    setModalError(null);
    try {
      await apiRequest(`/api/admin/items/${item.id}/${mode}`, {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      setTarget(null);
      await load(true);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const tabs = TABS.map((t) => ({ ...t, count: counts[t.id] ?? 0 }));

  return (
    <>
      <AdminPageHeader
        eyebrow="Moderation"
        title="Items"
        subtitle="Review everything sellers have listed. Take down anything suspect — it disappears from buyer feeds immediately and can be restored."
      />

      <AdminToolbar<TabId>
        tabs={tabs}
        activeTab={tab}
        onTabChange={setTab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search title, description, seller…"
        onRefresh={() => load(true)}
        refreshing={refreshing}
        filter={
          <select
            value={placement}
            onChange={(e) => setPlacement(e.target.value as "" | Placement)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-emerald-400"
          >
            <option value="">All placements</option>
            <option value="DROP">Drop</option>
            <option value="SHELF">Shelf</option>
          </select>
        }
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
          <p className="text-[13px] font-medium text-rose-700">{error}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* Header row — hidden on mobile, where each row becomes a card */}
        <div className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1.4fr)_auto_auto_auto] items-center gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 lg:grid">
          <button onClick={() => toggleSort("title")} className="flex items-center gap-1.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800">
            Item {sortBy === "title" ? (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowDownUp size={11} className="opacity-40" />}
          </button>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Seller</span>
          <button onClick={() => toggleSort("price")} className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800">
            Price {sortBy === "price" ? (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowDownUp size={11} className="opacity-40" />}
          </button>
          <button onClick={() => toggleSort("createdAt")} className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800">
            Listed {sortBy === "createdAt" ? (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowDownUp size={11} className="opacity-40" />}
          </button>
          <span className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Actions</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-16 text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[13px] font-medium">Loading items…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Package size={26} className="mx-auto mb-3 text-slate-300" />
            <p className="text-[14px] font-semibold text-slate-800">No items match</p>
            <p className="mt-1 text-[13px] text-slate-500">Try a different tab, placement, or search term.</p>
          </div>
        ) : (
          rows.map((it) => {
            const meta = STATUS_META[it.status] ?? STATUS_META.DRAFT;
            const isHidden = it.status === "ARCHIVED";
            const open = expanded === it.id;
            const photo = it.photos?.[0];
            return (
              <div key={it.id} className="border-b border-slate-100 last:border-b-0">
                <div className="grid grid-cols-1 items-center gap-3 px-5 py-4 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.4fr)_auto_auto_auto] lg:gap-4">
                  {/* Item */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <Package size={16} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setExpanded(open ? null : it.id)}
                          className="truncate text-left text-[14px] font-semibold text-slate-900 hover:text-emerald-700"
                        >
                          {it.title}
                        </button>
                        <StatusPill label={meta.label} tone={meta.tone} withDot />
                        {it.activeClaims > 0 && (
                          <StatusPill label={`${it.activeClaims} active claim${it.activeClaims === 1 ? "" : "s"}`} tone="amber" />
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-slate-500">
                        {categoryLabel(it.category)} · {it.placement === "SHELF" ? "Shelf" : "Drop"}
                      </p>
                    </div>
                  </div>

                  {/* Seller */}
                  <div className="flex min-w-0 items-center gap-2">
                    {it.seller ? (
                      <>
                        <AvatarChip name={it.seller.name} avatar={it.seller.avatar} seed={it.seller.id} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-800">{it.seller.name}</p>
                          <p className="truncate text-[11px] text-slate-500">{it.seller.email}</p>
                        </div>
                      </>
                    ) : (
                      <span className="text-[13px] text-slate-400">—</span>
                    )}
                  </div>

                  <div className="text-[14px] font-semibold text-slate-900 lg:text-right">{priceLabel(it.price)}</div>

                  <div className="lg:text-right">
                    <RelativeDateBadge date={it.createdAt} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 lg:justify-end">
                    {isHidden ? (
                      <button
                        onClick={() => openModal(it, "unhide")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <RotateCcw size={13} /> Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => openModal(it, "hide")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-rose-600 transition hover:bg-rose-50"
                      >
                        <EyeOff size={13} /> Take down
                      </button>
                    )}
                    <button
                      onClick={() => setExpanded(open ? null : it.id)}
                      aria-label={open ? "Collapse" : "Expand"}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {open && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="lg:col-span-2">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Description</p>
                        <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-700">
                          {it.description || "—"}
                        </p>
                        {it.photos.length > 1 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {it.photos.slice(0, 6).map((p) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={p} src={p} alt="" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Engagement</p>
                        <div className="flex flex-wrap gap-3 text-[13px] text-slate-700">
                          <span className="inline-flex items-center gap-1.5"><ShoppingBag size={13} className="text-slate-400" />{it._count.claims} claims</span>
                          <span className="inline-flex items-center gap-1.5"><Heart size={13} className="text-slate-400" />{it._count.watchlist} saves</span>
                          <span className="inline-flex items-center gap-1.5"><MessageSquare size={13} className="text-slate-400" />{it._count.questions} questions</span>
                        </div>
                        <p className="mt-3 text-[12px] text-slate-500">
                          {it.zone || "—"}{it.postalCode ? ` · ${it.postalCode}` : ""}
                        </p>
                        <p className="mt-1 text-[12px] text-slate-500">Updated {relativeTime(it.updatedAt)}</p>

                        {it.moderation && (
                          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              {it.moderation.action === "ITEM_HIDDEN" ? "Taken down" : "Restored"}
                            </p>
                            <p className="mt-1 text-[12px] text-slate-700">
                              {it.moderation.actor?.name ?? "Admin"} · {relativeTime(it.moderation.createdAt)}
                            </p>
                            {it.moderation.reason && (
                              <p className="mt-1 text-[12px] italic text-slate-600">“{it.moderation.reason}”</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {!loading && rows.length > 0 && (
        <AdminPagination page={page} totalPages={totalPages} total={total} unit="item" onPageChange={setPage} />
      )}

      {/* Takedown / restore modal */}
      {target && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => !busy && setTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-[16px] font-bold text-slate-900">
                  {target.mode === "hide" ? "Take down this listing?" : "Restore this listing?"}
                </h2>
                <p className="mt-0.5 truncate text-[13px] text-slate-500">{target.item.title}</p>
              </div>
              <button
                onClick={() => !busy && setTarget(null)}
                aria-label="Close"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4">
              {target.mode === "hide" ? (
                <>
                  <p className="text-[13px] leading-relaxed text-slate-600">
                    It disappears from the buyer feed and the seller&apos;s inventory straight away. Nothing is deleted —
                    claims, conversations and saves are kept, and you can restore it at any time.
                  </p>
                  {target.item.activeClaims > 0 && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                      <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                      <p className="text-[12.5px] leading-relaxed text-amber-800">
                        This item has <strong>{target.item.activeClaims} active claim{target.item.activeClaims === 1 ? "" : "s"}</strong>.
                        A buyer is mid-purchase — taking it down leaves that claim stranded.
                      </p>
                    </div>
                  )}
                  <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Reason (required)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    autoFocus
                    placeholder="e.g. Prohibited item, misleading photos, suspected scam…"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-emerald-400"
                  />
                  <p className="mt-1.5 text-[11.5px] text-slate-500">
                    Recorded in the audit log against you and the seller.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[13px] leading-relaxed text-slate-600">
                    The listing goes back to the status it held before takedown and becomes visible again.
                  </p>
                  <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Note (optional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    autoFocus
                    placeholder="e.g. Reviewed — listing is fine."
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-emerald-400"
                  />
                </>
              )}

              {modalError && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-600" />
                  <p className="text-[12.5px] font-medium text-rose-700">{modalError}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3.5">
              <button
                onClick={() => setTarget(null)}
                disabled={busy}
                className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitModal}
                disabled={busy}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition disabled:opacity-60 ${
                  target.mode === "hide" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                {target.mode === "hide" ? "Take it down" : "Restore it"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
