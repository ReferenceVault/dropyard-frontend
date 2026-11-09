"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownUp,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Phone,
  MapPin,
  AlertCircle,
  UserX,
  Users as UsersIcon,
  Package,
  ShoppingBag,
  Heart,
  MoreHorizontal,
  CheckCircle2,
  CircleDashed,
  Ban,
  PauseCircle,
  PlayCircle,
  ShieldOff,
  Loader2,
  X,
  Mail,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AvatarChip } from "@/components/admin/AvatarChip";
import { UserAvatar } from "@/components/UserAvatar";
import { normaliseAvatar, type ResolvedAvatar } from "@/lib/avatar";
import { StatusPill, type StatusTone } from "@/components/admin/StatusPill";
import { RelativeDateBadge, relativeTime } from "@/components/admin/RelativeDateBadge";

// ── Types ────────────────────────────────────────────────────────

type Role = "BUYER" | "SELLER" | "BOTH" | "ADMIN";
type UserStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

type AdminUser = {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  statusReason: string | null;
  statusChangedAt: string | null;
  neighborhood: string | null;
  zone: string | null;
  postalCode: string | null;
  buyerOnboardingDone: boolean;
  sellerOnboardingDone: boolean;
  createdAt: string;
  updatedAt: string;
  /** Profile picture choice, resolved by the API. */
  avatar?: ResolvedAvatar;
  _count: {
    items: number;
    claimsAsBuyer: number;
    claimsAsSeller: number;
    watchlist: number;
  };
};

type UsersResponse = {
  data: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  counts: Record<string, number>;
};

type TabId = "ALL" | Role;
type SortField = "createdAt" | "updatedAt" | "name" | "email";

const ROLE_META: Record<Role, { label: string; tone: StatusTone }> = {
  BUYER:  { label: "Buyer",  tone: "emerald" },
  SELLER: { label: "Seller", tone: "amber" },
  BOTH:   { label: "Both",   tone: "violet" },
  ADMIN:  { label: "Admin",  tone: "slate" },
};

const STATUS_META: Record<UserStatus, { label: string; tone: StatusTone }> = {
  ACTIVE:    { label: "Active",    tone: "emerald" },
  SUSPENDED: { label: "Suspended", tone: "amber" },
  BANNED:    { label: "Banned",    tone: "rose" },
};

const PAGE_SIZE = 20;

type ModalAction = "SUSPEND" | "BAN" | "REACTIVATE";

interface ModalState {
  user: AdminUser;
  action: ModalAction;
}

// ── Page ────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { accessToken, user: currentAdmin } = useAuth();
  const [resp, setResp] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<TabId>("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [refreshKey, setRefreshKey] = useState(0);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toast, setToast] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedUser = selectedId
    ? resp?.data.find((u) => u.id === selectedId) ?? null
    : null;

  // Debounce search input — 350ms after typing stops
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to first page when any filter changes
  useEffect(() => {
    setPage(1);
  }, [tab, debouncedSearch, sortBy, sortDir]);

  const fetchUsers = useCallback(async () => {
    if (!accessToken) return;
    const isInitial = !resp;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sortBy,
        sortDir,
      });
      if (tab !== "ALL") params.set("role", tab);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const data = await apiRequest<UsersResponse>(
        `/api/admin/users?${params.toString()}`,
        { token: accessToken },
      );
      setResp(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // intentionally exclude `resp` — we only read it once for the initial flag
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, page, tab, debouncedSearch, sortBy, sortDir, refreshKey]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  const tabs = [
    { id: "ALL" as const,    label: "All",     count: resp?.counts.ALL },
    { id: "BUYER" as const,  label: "Buyers",  count: resp?.counts.BUYER },
    { id: "SELLER" as const, label: "Sellers", count: resp?.counts.SELLER },
    { id: "BOTH" as const,   label: "Both",    count: resp?.counts.BOTH },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 max-w-7xl mx-auto w-full">
      <AdminPageHeader
        title="Users"
        subtitle="Everyone who's signed up to DropYard — buyers, sellers, and admins."
      />

      <AdminToolbar
        tabs={tabs}
        activeTab={tab}
        onTabChange={setTab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email…"
        onRefresh={() => setRefreshKey((k) => k + 1)}
        refreshing={refreshing}
      />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm mb-4">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(11,47,32,0.04)]">
        {/* Table header — sticky frosted (rounded top so it doesn't bleed past the wrapper corner) */}
        <div className="hidden lg:grid grid-cols-[2.2fr_1fr_1fr_0.9fr_1.4fr_40px] gap-3 px-4 py-2.5 bg-gradient-to-b from-slate-50/95 to-white/95 backdrop-blur-sm border-b border-slate-200 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 sticky top-0 z-10 rounded-t-xl">
          <SortableHeader label="User"     field="name"      sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
          <span className="flex items-center gap-1.5">Activity</span>
          <span className="flex items-center gap-1.5"><MapPin size={11} /> Location</span>
          <SortableHeader label="Joined"   field="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
          <span>Role &amp; setup</span>
          <span aria-hidden="true" />
        </div>

        {/* Rows */}
        {loading && !resp ? (
          <UserRowsSkeleton />
        ) : resp && resp.data.length === 0 ? (
          <EmptyUsersState search={debouncedSearch} tab={tab} />
        ) : (
          <ul className="divide-y divide-slate-100/80">
            {resp?.data.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                currentAdminId={currentAdmin?.id ?? null}
                selected={user.id === selectedId}
                onSelect={() => setSelectedId(user.id)}
                onAction={(action) => setModal({ user, action })}
              />
            ))}
          </ul>
        )}
      </div>

      {resp && resp.data.length > 0 && (
        <AdminPagination
          page={resp.page}
          totalPages={resp.totalPages}
          total={resp.total}
          unit="user"
          onPageChange={setPage}
        />
      )}

      {selectedUser && (
        <UserDetailPanel
          user={selectedUser}
          currentAdminId={currentAdmin?.id ?? null}
          token={accessToken ?? ""}
          onClose={() => setSelectedId(null)}
          onAction={(action) => setModal({ user: selectedUser, action })}
          onAvatarReset={() => {
            setToast(`Profile photo removed for ${selectedUser.name || selectedUser.email}.`);
            setTimeout(() => setToast(""), 3000);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {modal && (
        <StatusChangeModal
          user={modal.user}
          action={modal.action}
          token={accessToken ?? ""}
          onClose={() => setModal(null)}
          onSuccess={(updated, action) => {
            setModal(null);
            setToast(toastFor(updated.name || updated.email, action));
            setTimeout(() => setToast(""), 3000);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2.5 rounded-full bg-slate-900 text-white px-4 py-2.5 text-[13px] font-medium shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
        >
          <CheckCircle2 size={15} className="text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

function toastFor(name: string, action: ModalAction): string {
  if (action === "REACTIVATE") return `${name} reactivated.`;
  if (action === "SUSPEND") return `${name} has been suspended.`;
  return `${name} has been banned.`;
}

// ── Sortable column header ──────────────────────────────────────

function SortableHeader({
  label,
  field,
  sortBy,
  sortDir,
  onSort,
}: {
  label: string;
  field: SortField;
  sortBy: SortField;
  sortDir: "asc" | "desc";
  onSort: (field: SortField) => void;
}) {
  const active = sortBy === field;
  const Icon = !active ? ArrowDownUp : sortDir === "asc" ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors ${
        active ? "text-emerald-700" : "text-slate-500"
      }`}
    >
      {label}
      <Icon size={11} className={active ? "text-emerald-700" : "text-slate-400"} />
    </button>
  );
}

// ── User row ────────────────────────────────────────────────────

function UserRow({
  user,
  currentAdminId,
  selected,
  onSelect,
  onAction,
}: {
  user: AdminUser;
  currentAdminId: string | null;
  selected: boolean;
  onSelect: () => void;
  onAction: (action: ModalAction) => void;
}) {
  const meta = ROLE_META[user.role];
  const statusMeta = STATUS_META[user.status];
  const isSelf = user.id === currentAdminId;
  const isAdmin = user.role === "ADMIN";
  const actionable = !isSelf && !isAdmin;

  const location = (() => {
    const primary = user.neighborhood ?? user.zone ?? user.postalCode;
    const secondary = user.neighborhood && user.zone ? user.zone : null;
    return { primary: primary ?? null, secondary };
  })();

  // Row tint: status takes priority. When selected, use a stronger emerald
  // left bar so the user sees which row is "open" in the side panel.
  const rowTint = selected
    ? "border-l-2 border-l-emerald-500 bg-emerald-50/40"
    : user.status === "BANNED"
    ? "border-l-2 border-l-rose-300"
    : user.status === "SUSPENDED"
    ? "border-l-2 border-l-amber-300"
    : "border-l-2 border-l-transparent";

  return (
    <li className={`group grid grid-cols-1 lg:grid-cols-[2.2fr_1fr_1fr_0.9fr_1.4fr_44px] gap-y-2.5 gap-x-3 px-4 py-3 lg:py-2.5 hover:bg-gradient-to-r hover:from-emerald-50/40 hover:to-transparent transition-colors first:rounded-t-xl last:rounded-b-xl ${rowTint}`}>
      {/* User: avatar + name + email + phone */}
      <div className="flex items-start lg:items-center gap-2.5 min-w-0">
        <div className="relative flex-shrink-0">
          <AvatarChip name={user.name} avatar={user.avatar} seed={user.id} size="md" />
          {user.role === "ADMIN" && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onSelect}
            title="View full profile"
            className="group/name inline-flex items-center gap-1 text-[13px] font-semibold text-slate-900 leading-tight max-w-full text-left hover:text-emerald-700 transition-colors"
          >
            <span className="truncate underline decoration-transparent underline-offset-[3px] decoration-1 group-hover/name:decoration-emerald-500 transition-[text-decoration-color] duration-150">
              {user.name}
            </span>
            <ChevronRight
              size={12}
              strokeWidth={2.4}
              className="flex-shrink-0 -ml-0.5 text-emerald-600 opacity-0 -translate-x-1 group-hover/name:opacity-100 group-hover/name:translate-x-0 transition-all duration-150"
            />
          </button>
          <div className="mt-0.5 flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-[11.5px] text-slate-500 truncate max-w-full select-text">
              {user.email}
            </span>
            {user.phone && (
              <>
                <span className="text-slate-300 hidden sm:inline">·</span>
                <span className="inline-flex items-center gap-1 text-[11.5px] text-slate-500 whitespace-nowrap">
                  <Phone size={9} /> {user.phone}
                </span>
              </>
            )}
          </div>
        </div>
        {/* Action menu — on mobile, sits inline with avatar/name */}
        <div className="lg:hidden flex-shrink-0">
          <UserActionMenu
            user={user}
            actionable={actionable}
            isSelf={isSelf}
            isAdmin={isAdmin}
            onAction={onAction}
            mobile
          />
        </div>
      </div>

      {/* Activity chips */}
      <div className="flex items-center gap-1.5 flex-wrap lg:flex-nowrap lg:pl-0 pl-[44px]">
        <ActivityChip
          icon={<Package size={10} />}
          count={user._count.items}
          tone="amber"
          label="items listed"
        />
        <ActivityChip
          icon={<ShoppingBag size={10} />}
          count={user._count.claimsAsBuyer}
          tone="emerald"
          label="claims made"
        />
        <ActivityChip
          icon={<Heart size={10} />}
          count={user._count.watchlist}
          tone="rose"
          label="items saved"
        />
      </div>

      {/* Location */}
      <div className="flex items-center gap-1.5 min-w-0 lg:pl-0 pl-[44px]">
        <MapPin size={11} className="text-slate-400 flex-shrink-0 lg:hidden" />
        {location.primary ? (
          <div className="min-w-0">
            <p className="text-[12px] text-slate-700 truncate font-medium">{location.primary}</p>
            {location.secondary && (
              <p className="text-[10.5px] text-slate-400 truncate">{location.secondary}</p>
            )}
          </div>
        ) : (
          <span className="text-[12px] text-slate-300">—</span>
        )}
      </div>

      {/* Joined */}
      <div className="flex flex-col gap-0.5 min-w-0 lg:py-0.5 lg:pl-0 pl-[44px]">
        <RelativeDateBadge date={user.createdAt} />
        <span className="text-[10px] text-slate-400" title={new Date(user.updatedAt).toLocaleString()}>
          last seen {relativeTime(user.updatedAt)}
        </span>
      </div>

      {/* Role + status + onboarding dots */}
      <div className="flex items-center gap-1.5 flex-wrap min-w-0 lg:pl-0 pl-[44px]">
        <StatusPill label={meta.label} tone={meta.tone} withDot />
        {user.status !== "ACTIVE" && (
          <span title={user.statusReason ?? undefined}>
            <StatusPill label={statusMeta.label} tone={statusMeta.tone} withDot />
          </span>
        )}
        <OnboardingDots role={user.role} buyerDone={user.buyerOnboardingDone} sellerDone={user.sellerOnboardingDone} />
      </div>

      {/* Desktop action menu — far-right column */}
      <div className="hidden lg:flex items-center justify-end gap-1">
        <UserActionMenu
          user={user}
          actionable={actionable}
          isSelf={isSelf}
          isAdmin={isAdmin}
          onAction={onAction}
        />
      </div>
    </li>
  );
}

// ── Action menu (per-row dropdown) ─────────────────────────────

function UserActionMenu({
  user,
  actionable,
  isSelf,
  isAdmin,
  onAction,
  mobile,
}: {
  user: AdminUser;
  actionable: boolean;
  isSelf: boolean;
  isAdmin: boolean;
  onAction: (action: ModalAction) => void;
  /** When true, the trigger button is visible at all breakpoints (used in the
   *  mobile card-row layout where the desktop column is hidden). */
  mobile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const tooltip = !actionable
    ? isSelf
      ? "You can't change your own status"
      : "Can't moderate another admin"
    : undefined;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (actionable) setOpen((v) => !v);
        }}
        disabled={!actionable}
        aria-label="More actions"
        title={tooltip}
        className={`${mobile ? "inline-flex h-10 w-10" : "hidden lg:inline-flex h-8 w-8"} items-center justify-center rounded-lg border transition-all ${
          actionable
            ? open
              ? "bg-slate-900 border-slate-900 text-white"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50"
            : "bg-transparent border-transparent text-slate-300 cursor-not-allowed"
        }`}
      >
        <MoreHorizontal size={14} />
      </button>

      {open && actionable && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.18)] overflow-hidden z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {user.status === "ACTIVE" && (
            <>
              <MenuItem
                icon={<PauseCircle size={14} className="text-amber-600" />}
                label="Suspend"
                onClick={() => { setOpen(false); onAction("SUSPEND"); }}
              />
              <MenuItem
                icon={<Ban size={14} className="text-rose-600" />}
                label="Ban"
                onClick={() => { setOpen(false); onAction("BAN"); }}
                danger
              />
            </>
          )}
          {user.status === "SUSPENDED" && (
            <>
              <MenuItem
                icon={<PlayCircle size={14} className="text-emerald-600" />}
                label="Reactivate"
                onClick={() => { setOpen(false); onAction("REACTIVATE"); }}
              />
              <MenuItem
                icon={<Ban size={14} className="text-rose-600" />}
                label="Escalate to ban"
                onClick={() => { setOpen(false); onAction("BAN"); }}
                danger
              />
            </>
          )}
          {user.status === "BANNED" && (
            <MenuItem
              icon={<PlayCircle size={14} className="text-emerald-600" />}
              label="Reactivate"
              onClick={() => { setOpen(false); onAction("REACTIVATE"); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12.5px] font-semibold transition ${
        danger
          ? "text-rose-700 hover:bg-rose-50"
          : "text-slate-800 hover:bg-slate-50"
      } border-b border-slate-100 last:border-b-0`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ── User detail side panel ─────────────────────────────────────

type AuditEntry = {
  id: string;
  action: string;
  reason: string | null;
  payload: { from?: string; to?: string } | null;
  createdAt: string;
  actor: { id: string; name: string; email: string; role: string } | null;
};

function UserDetailPanel({
  user,
  currentAdminId,
  token,
  onClose,
  onAction,
  onAvatarReset,
}: {
  user: AdminUser;
  currentAdminId: string | null;
  token: string;
  onClose: () => void;
  onAction: (action: ModalAction) => void;
  onAvatarReset: () => void;
}) {
  const isSelf = user.id === currentAdminId;
  const isAdmin = user.role === "ADMIN";
  const actionable = !isSelf && !isAdmin;

  const roleMeta = ROLE_META[user.role];
  const statusMeta = STATUS_META[user.status];

  // Audit log fetch — runs whenever the user changes.
  const [history, setHistory] = useState<AuditEntry[] | null>(null);
  const [historyError, setHistoryError] = useState("");
  // Bumped after an action taken from inside the panel, so its new audit row shows.
  const [historyTick, setHistoryTick] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setHistory(null);
    setHistoryError("");
    apiRequest<{ data: AuditEntry[] }>(
      `/api/admin/audit-log?targetUserId=${encodeURIComponent(user.id)}&limit=20`,
      { token },
    )
      .then((res) => { if (!cancelled) setHistory(res.data ?? []); })
      .catch((err) => {
        if (!cancelled) setHistoryError(err instanceof Error ? err.message : "Failed to load history");
      });
    return () => { cancelled = true; };
  }, [user.id, token, historyTick]);

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const joined = new Date(user.createdAt).toLocaleString("en-CA", { dateStyle: "long" });
  const updated = new Date(user.updatedAt).toLocaleString("en-CA", { dateStyle: "long", timeStyle: "short" });
  const statusChanged = user.statusChangedAt
    ? new Date(user.statusChangedAt).toLocaleString("en-CA", { dateStyle: "long", timeStyle: "short" })
    : null;

  const tooltip = !actionable
    ? isSelf
      ? "You can't change your own status"
      : "Can't moderate another admin"
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative w-full max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-5 py-4 border-b border-slate-200 flex items-start gap-3">
          <AvatarChip name={user.name} avatar={user.avatar} seed={user.id} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <StatusPill label={roleMeta.label} tone={roleMeta.tone} withDot />
              {user.status !== "ACTIVE" && (
                <StatusPill label={statusMeta.label} tone={statusMeta.tone} withDot />
              )}
            </div>
            <h2 className="mt-1.5 text-[15px] font-bold text-slate-900 truncate">{user.name}</h2>
            <p className="text-[11.5px] text-slate-500 truncate">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={16} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Activity */}
          <section>
            <SectionHeader label="Activity" />
            <div className="grid grid-cols-3 gap-2">
              <ActivityStat icon={<Package size={13} />} count={user._count.items} label="Items listed" tone="amber" />
              <ActivityStat icon={<ShoppingBag size={13} />} count={user._count.claimsAsBuyer} label="Claims made" tone="emerald" />
              <ActivityStat icon={<Heart size={13} />} count={user._count.watchlist} label="Saved" tone="rose" />
            </div>
            {user._count.claimsAsSeller > 0 && (
              <p className="mt-2 text-[11.5px] text-slate-500">
                Also <strong className="text-slate-700">{user._count.claimsAsSeller}</strong> incoming claim{user._count.claimsAsSeller !== 1 ? "s" : ""} as a seller.
              </p>
            )}
          </section>

          {/* Identity */}
          <section>
            <SectionHeader label="Identity & contact" />
            <ul className="rounded-xl bg-slate-50 border border-slate-100 divide-y divide-slate-200/60 overflow-hidden">
              <DetailItem label="First name" value={user.firstName ?? "—"} />
              <DetailItem label="Last name" value={user.lastName ?? "—"} />
              <DetailItem icon={<Mail size={11} />} label="Email" value={user.email} />
              <DetailItem icon={<Phone size={11} />} label="Phone" value={user.phone ?? "—"} />
            </ul>
          </section>

          {/* Location */}
          <section>
            <SectionHeader label="Location" />
            <ul className="rounded-xl bg-slate-50 border border-slate-100 divide-y divide-slate-200/60 overflow-hidden">
              <DetailItem icon={<MapPin size={11} />} label="Neighbourhood" value={user.neighborhood ?? "—"} />
              <DetailItem label="Zone (FSA)" value={user.zone ?? "—"} />
              <DetailItem label="Postal code" value={user.postalCode ?? "—"} />
            </ul>
          </section>

          {/* Account */}
          <section>
            <SectionHeader label="Account" />
            <ul className="rounded-xl bg-slate-50 border border-slate-100 divide-y divide-slate-200/60 overflow-hidden">
              <DetailItem label="Role" value={roleMeta.label} />
              <DetailItem label="Status" value={statusMeta.label} />
              <DetailItem label="Joined" value={joined} />
              <DetailItem label="Last seen" value={updated} />
              <DetailItem
                label="Buyer onboarding"
                value={user.buyerOnboardingDone ? "Complete" : "Not started"}
              />
              <DetailItem
                label="Seller onboarding"
                value={user.sellerOnboardingDone ? "Complete" : "Not started"}
              />
            </ul>
          </section>

          <ProfilePictureModeration
            user={user}
            token={token}
            // Same rail as the API: other admins' accounts are out of scope.
            canModerate={!isAdmin || isSelf}
            onReset={() => { setHistoryTick((t) => t + 1); onAvatarReset(); }}
          />

          {/* Current moderation reason */}
          {user.status !== "ACTIVE" && (
            <section>
              <SectionHeader label="Current moderation" />
              <div className={`rounded-xl border px-4 py-3 ${
                user.status === "BANNED"
                  ? "bg-rose-50 border-rose-200"
                  : "bg-amber-50 border-amber-200"
              }`}>
                <p className={`text-[10px] font-bold uppercase tracking-[0.16em] mb-1 ${
                  user.status === "BANNED" ? "text-rose-700" : "text-amber-700"
                }`}>
                  {statusMeta.label} {statusChanged ? `· ${statusChanged}` : ""}
                </p>
                <p className={`text-[12.5px] leading-relaxed ${
                  user.status === "BANNED" ? "text-rose-900" : "text-amber-900"
                }`}>
                  {user.statusReason ?? "No reason recorded."}
                </p>
              </div>
            </section>
          )}

          {/* Moderation history */}
          <section>
            <SectionHeader label="Moderation history" />
            {historyError && (
              <p className="text-[12px] text-rose-700">{historyError}</p>
            )}
            {!history && !historyError && (
              <div className="flex items-center gap-2 text-[12px] text-slate-500">
                <Loader2 size={12} className="animate-spin" /> Loading…
              </div>
            )}
            {history && history.length === 0 && (
              <p className="text-[12px] text-slate-500">No prior actions on this account.</p>
            )}
            {history && history.length > 0 && (
              <ul className="space-y-2">
                {history.map((h) => (
                  <AuditRow key={h.id} entry={h} />
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Footer action bar */}
        <footer className="border-t border-slate-200 bg-slate-50/60 px-4 py-3 flex items-center justify-between gap-2">
          <p className="text-[11.5px] text-slate-500 truncate">
            {!actionable
              ? tooltip
              : user.status === "ACTIVE"
              ? "Use Suspend for temporary blocks; Ban for permanent action."
              : "Reactivate or escalate as needed."}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {user.status === "ACTIVE" && (
              <>
                <PanelActionButton
                  icon={<PauseCircle size={13} />}
                  label="Suspend"
                  disabled={!actionable}
                  onClick={() => onAction("SUSPEND")}
                  tone="amber"
                />
                <PanelActionButton
                  icon={<Ban size={13} />}
                  label="Ban"
                  disabled={!actionable}
                  onClick={() => onAction("BAN")}
                  tone="rose"
                />
              </>
            )}
            {user.status === "SUSPENDED" && (
              <>
                <PanelActionButton
                  icon={<PlayCircle size={13} />}
                  label="Reactivate"
                  disabled={!actionable}
                  onClick={() => onAction("REACTIVATE")}
                  tone="emerald"
                />
                <PanelActionButton
                  icon={<Ban size={13} />}
                  label="Ban"
                  disabled={!actionable}
                  onClick={() => onAction("BAN")}
                  tone="rose"
                />
              </>
            )}
            {user.status === "BANNED" && (
              <PanelActionButton
                icon={<PlayCircle size={13} />}
                label="Reactivate"
                disabled={!actionable}
                onClick={() => onAction("REACTIVATE")}
                tone="emerald"
              />
            )}
          </div>
        </footer>
      </aside>
    </div>
  );
}

// ─── Profile picture moderation ───────────────────────────────────────────
// Shows the user's current picture. An uploaded photo can be removed (e.g. an
// inappropriate image): the API resets them to initials, deletes the file and
// writes a USER_AVATAR_RESET audit row with the reason given here. DropYard's
// own gallery avatars aren't moderated, so only photos get the action.
function ProfilePictureModeration({
  user,
  token,
  canModerate,
  onReset,
}: {
  user: AdminUser;
  token: string;
  canModerate: boolean;
  onReset: () => void;
}) {
  const avatar = normaliseAvatar(user.avatar);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // A different user (or a fresh picture) closes any half-filled form.
  useEffect(() => { setOpen(false); setReason(""); setError(""); }, [user.id, avatar.type]);

  const label = avatar.type === "PHOTO" ? "Uploaded photo"
    : avatar.type === "PRESET" ? `DropYard avatar · ${avatar.label}`
    : "Initials";

  async function remove() {
    if (!reason.trim()) { setError("Add a reason — it's saved in the moderation history."); return; }
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/api/admin/users/${encodeURIComponent(user.id)}/avatar/reset`, {
        method: "POST",
        token,
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setOpen(false);
      setReason("");
      onReset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove the photo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <SectionHeader label="Profile picture" />
      <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 flex items-center gap-3">
        <UserAvatar avatar={avatar} name={user.name} size={56} />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-slate-800 truncate">{label}</p>
          <p className="text-[11.5px] text-slate-500">
            {avatar.type === "PHOTO"
              ? "Shown on their listings, messages and claims."
              : "Nothing to moderate: no uploaded photo."}
          </p>
        </div>
        {avatar.type === "PHOTO" && canModerate && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-rose-700 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            Remove photo…
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 space-y-2">
          <label htmlFor="avatar-reset-reason" className="block text-[11.5px] font-semibold text-rose-900">
            Reason (saved in the moderation history)
          </label>
          <textarea
            id="avatar-reset-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. Photo isn't appropriate for a neighbourhood marketplace"
            className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-[12.5px] text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          />
          <p className="text-[11.5px] text-rose-900/80">They&apos;ll be switched to their initials and the photo file is deleted. They can choose a new picture any time.</p>
          {error && <p role="alert" className="text-[12px] font-medium text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setOpen(false); setError(""); }} disabled={saving}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="button" onClick={remove} disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
              {saving && <Loader2 size={12} className="animate-spin" />}
              Remove photo
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
      {label}
    </h4>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <li className="px-3 py-2 flex items-start gap-3">
      <span className="flex items-center gap-1.5 min-w-[120px] text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-[12.5px] text-slate-800 break-words flex-1">{value}</span>
    </li>
  );
}

function ActivityStat({
  icon,
  count,
  label,
  tone,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  tone: "emerald" | "amber" | "rose";
}) {
  const zero = count === 0;
  const palette = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/70" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200/70" },
    rose:    { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200/70" },
  }[tone];
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${zero ? "bg-slate-50 text-slate-400 border-slate-100" : `${palette.bg} ${palette.text} ${palette.border}`}`}>
      <div className="flex items-center gap-1.5">{icon}<span className="text-[18px] font-bold tabular-nums">{count}</span></div>
      <p className="text-[10.5px] uppercase tracking-[0.12em] font-semibold mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

function PanelActionButton({
  icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone: "amber" | "rose" | "emerald";
}) {
  const cls = {
    amber:   "border-amber-200 text-amber-700 hover:bg-amber-50",
    rose:    "border-rose-200 text-rose-700 hover:bg-rose-50",
    emerald: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed bg-white ${cls}`}
    >
      {icon}
      {label}
    </button>
  );
}

const AUDIT_LABEL: Record<string, string> = {
  USER_STATUS_CHANGED:       "Status changed",
  USER_AVATAR_RESET:         "Profile photo removed",
  USER_ROLE_CHANGED:         "Role changed",
  ITEM_HIDDEN:               "Item hidden",
  ITEM_UNHIDDEN:             "Item un-hidden",
  SUBMISSION_STATUS_CHANGED: "Submission updated",
  MOVING_SALE_APPROVED:      "Moving sale approved",
  MOVING_SALE_REJECTED:      "Moving sale rejected",
};

function AuditRow({ entry }: { entry: AuditEntry }) {
  const when = new Date(entry.createdAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
  const label = AUDIT_LABEL[entry.action] ?? entry.action;
  return (
    <li className="rounded-lg border border-slate-100 bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[12px] font-bold text-slate-900">{label}</span>
        <span className="text-[10.5px] text-slate-400">{when}</span>
      </div>
      {entry.payload && (entry.payload.from || entry.payload.to) && (
        <p className="text-[11.5px] text-slate-600 mt-1">
          <span className="font-semibold">{entry.payload.from ?? "—"}</span>
          <span className="mx-1.5 text-slate-400">→</span>
          <span className="font-semibold">{entry.payload.to ?? "—"}</span>
        </p>
      )}
      {entry.reason && (
        <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed italic">&ldquo;{entry.reason}&rdquo;</p>
      )}
      {entry.actor && (
        <p className="text-[10.5px] text-slate-400 mt-1">by {entry.actor.name || entry.actor.email}</p>
      )}
    </li>
  );
}

// ── Status change modal ────────────────────────────────────────

function StatusChangeModal({
  user,
  action,
  token,
  onClose,
  onSuccess,
}: {
  user: AdminUser;
  action: ModalAction;
  token: string;
  onClose: () => void;
  onSuccess: (updated: AdminUser, action: ModalAction) => void;
}) {
  const targetStatus: UserStatus =
    action === "SUSPEND" ? "SUSPENDED" : action === "BAN" ? "BANNED" : "ACTIVE";
  const reasonRequired = targetStatus !== "ACTIVE";
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reasonRequired && !reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const data = await apiRequest<{ user: AdminUser }>(
        `/api/admin/users/${encodeURIComponent(user.id)}/status`,
        {
          method: "POST",
          token,
          body: JSON.stringify({
            status: targetStatus,
            reason: reasonRequired ? reason.trim() : undefined,
          }),
        },
      );
      onSuccess(data.user, action);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setSubmitting(false);
    }
  }

  const config = {
    SUSPEND: {
      icon: <PauseCircle className="text-amber-600" size={22} />,
      title: "Suspend user",
      tone: "amber" as const,
      cta: "Suspend",
      description: "They won't be able to sign in. You can reactivate at any time.",
      reasonHint: "Reason (required) — recorded in the audit log",
    },
    BAN: {
      icon: <ShieldOff className="text-rose-600" size={22} />,
      title: "Ban user",
      tone: "rose" as const,
      cta: "Ban",
      description: "Permanent block. Use only for repeated abuse, fraud, or safety incidents.",
      reasonHint: "Reason (required) — recorded in the audit log",
    },
    REACTIVATE: {
      icon: <PlayCircle className="text-emerald-600" size={22} />,
      title: "Reactivate user",
      tone: "emerald" as const,
      cta: "Reactivate",
      description: "Restore normal access. They'll be able to sign in again.",
      reasonHint: "Note (optional) — recorded in the audit log",
    },
  }[action];

  const ctaClass =
    config.tone === "rose"
      ? "bg-rose-600 hover:bg-rose-700 shadow-[0_12px_28px_rgba(225,29,72,0.25)]"
      : config.tone === "amber"
      ? "bg-amber-600 hover:bg-amber-700 shadow-[0_12px_28px_rgba(217,119,6,0.25)]"
      : "bg-emerald-600 hover:bg-emerald-700 shadow-[0_12px_28px_rgba(5,150,105,0.25)]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.25)] overflow-hidden border border-slate-200"
      >
        <header className="px-5 py-4 border-b border-slate-100 flex items-start gap-3">
          <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-bold text-slate-900">{config.title}</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">{config.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={14} />
          </button>
        </header>

        <div className="p-5 space-y-4">
          {/* Target user summary */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3 flex items-center gap-3">
            <AvatarChip name={user.name} avatar={user.avatar} seed={user.id} size="md" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-slate-900 truncate">{user.name}</p>
              <p className="text-[11.5px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          {/* Show existing reason for context when escalating/reactivating */}
          {user.status !== "ACTIVE" && user.statusReason && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 mb-1">
                Currently {STATUS_META[user.status].label.toLowerCase()} — reason
              </p>
              <p className="text-[12px] text-amber-900 leading-relaxed">{user.statusReason}</p>
            </div>
          )}

          {/* Reason field */}
          <div>
            <label htmlFor="status-reason" className="block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-1.5">
              {config.reasonHint}
            </label>
            <textarea
              id="status-reason"
              value={reason}
              onChange={(e) => { setReason(e.target.value); if (error) setError(""); }}
              rows={3}
              maxLength={5000}
              placeholder={reasonRequired ? "e.g. Multiple spam listings reported, ignored warnings…" : "Optional note…"}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 placeholder-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-none disabled:opacity-60"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2">
              <p className="text-[12px] text-rose-700 font-medium">{error}</p>
            </div>
          )}
        </div>

        <footer className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-[12.5px] font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || (reasonRequired && !reason.trim())}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2 text-[12.5px] font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${ctaClass}`}
          >
            {submitting && <Loader2 size={13} className="animate-spin" />}
            {submitting ? "Saving..." : config.cta}
          </button>
        </footer>
      </form>
    </div>
  );
}

// ── Activity chip ───────────────────────────────────────────────

function ActivityChip({
  icon,
  count,
  tone,
  label,
}: {
  icon: React.ReactNode;
  count: number;
  tone: "emerald" | "amber" | "rose";
  label: string;
}) {
  const zero = count === 0;
  const styles: Record<string, string> = {
    emerald: zero ? "bg-slate-50 text-slate-400 border-slate-100" : "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    amber:   zero ? "bg-slate-50 text-slate-400 border-slate-100" : "bg-amber-50 text-amber-700 border-amber-200/60",
    rose:    zero ? "bg-slate-50 text-slate-400 border-slate-100" : "bg-rose-50 text-rose-700 border-rose-200/60",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-bold tabular-nums ${styles[tone]}`}
      title={`${count} ${label}`}
    >
      {icon}
      {count}
    </span>
  );
}

// ── Onboarding dots ─────────────────────────────────────────────

function OnboardingDots({
  role,
  buyerDone,
  sellerDone,
}: {
  role: Role;
  buyerDone: boolean;
  sellerDone: boolean;
}) {
  const items: { letter: string; done: boolean; tone: "emerald" | "amber" }[] = [];
  if (role === "BUYER" || role === "BOTH") {
    items.push({ letter: "B", done: buyerDone, tone: "emerald" });
  }
  if (role === "SELLER" || role === "BOTH") {
    items.push({ letter: "S", done: sellerDone, tone: "amber" });
  }
  if (items.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {items.map((i) => (
        <span
          key={i.letter}
          title={
            i.tone === "emerald"
              ? i.done ? "Buyer setup complete" : "Buyer setup pending"
              : i.done ? "Seller setup complete" : "Seller setup pending"
          }
          className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[9px] font-bold border ${
            i.done
              ? i.tone === "emerald"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-white text-slate-400 border-slate-200 border-dashed"
          }`}
        >
          {i.done ? <CheckCircle2 size={10} /> : i.letter}
        </span>
      ))}
    </div>
  );
}

// ── Skeleton rows ───────────────────────────────────────────────

function UserRowsSkeleton() {
  return (
    <ul className="divide-y divide-slate-100/80">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr_1fr_0.9fr_1.2fr_40px] gap-y-2.5 gap-x-3 px-4 py-3 lg:items-center"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
              <div className="h-2.5 w-48 max-w-full bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-5 w-24 bg-slate-100 rounded animate-pulse lg:pl-0 ml-[44px] lg:ml-0" />
          <div className="h-3 w-20 bg-slate-100 rounded animate-pulse lg:pl-0 ml-[44px] lg:ml-0" />
          <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse lg:pl-0 ml-[44px] lg:ml-0" />
          <div className="h-5 w-24 bg-slate-100 rounded-full animate-pulse lg:pl-0 ml-[44px] lg:ml-0" />
          <div className="hidden lg:block" />
        </li>
      ))}
    </ul>
  );
}

// ── Empty state ─────────────────────────────────────────────────

function EmptyUsersState({ search, tab }: { search: string; tab: TabId }) {
  const hasFilter = search || tab !== "ALL";
  return (
    <div className="py-16 text-center px-6">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-amber-50 ring-4 ring-emerald-100/60">
        {hasFilter ? <UserX size={22} className="text-slate-500" /> : <UsersIcon size={22} className="text-emerald-700" />}
      </div>
      <p className="text-slate-800 font-bold">
        {hasFilter ? "No matching users" : "No users yet"}
      </p>
      <p className="text-slate-500 text-[13px] mt-1 max-w-xs mx-auto">
        {hasFilter
          ? "Try clearing your filters or search query."
          : "Once people sign up, they'll show up here."}
      </p>
    </div>
  );
}
