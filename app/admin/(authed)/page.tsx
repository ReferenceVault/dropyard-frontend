"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Package,
  ShoppingBag,
  Truck,
  Heart,
  MessageSquare,
  Send,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminSectionCard } from "@/components/admin/AdminSectionCard";

type Overview = {
  users: { total: number; byRole: Record<string, number>; newThisWeek: number };
  items: { total: number; byStatus: Record<string, number>; byPlacement: Record<string, number> };
  claims: { total: number; byStatus: Record<string, number> };
  movingSale: { byStatus: Record<string, number> };
  engagement: { watchlistSaves: number; conversations: number; messagesLast7Days: number };
  drops: { active: number };
};

const ROLE_META: Record<string, { label: string; color: string; ring: string }> = {
  BUYER: { label: "Buyers",    color: "bg-emerald-500", ring: "bg-emerald-100" },
  SELLER: { label: "Sellers",  color: "bg-amber-500",   ring: "bg-amber-100" },
  BOTH:   { label: "Both",     color: "bg-violet-500",  ring: "bg-violet-100" },
};

const CLAIM_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: "Pending",    color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  CONFIRMED:  { label: "Confirmed",  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  REJECTED:   { label: "Rejected",   color: "text-rose-700",    bg: "bg-rose-50 border-rose-200" },
  PICKED_UP:  { label: "Picked up",  color: "text-slate-700",   bg: "bg-slate-100 border-slate-200" },
  // Waiting behind another buyer's accepted claim (the waitlist).
  WAITLISTED: { label: "Waitlisted", color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
};

const MOVING_STATUS_META: Record<string, { label: string; color: string; bar: string }> = {
  PENDING_REVIEW: { label: "Pending review", color: "text-amber-700",   bar: "bg-amber-400" },
  APPROVED:       { label: "Approved",       color: "text-emerald-700", bar: "bg-emerald-500" },
  REJECTED:       { label: "Rejected",       color: "text-rose-700",    bar: "bg-rose-400" },
  COMPLETED:      { label: "Completed",      color: "text-slate-600",   bar: "bg-slate-400" },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function AdminOverviewPage() {
  const { user, accessToken } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    apiRequest<Overview>("/api/admin/overview", { token: accessToken })
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load metrics"),
      );
  }, [accessToken]);

  const firstName = (user?.name ?? "").split(" ")[0] || "Admin";
  const greeting = getGreeting();
  const today = new Date().toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const fmt = (n: number | undefined) => (n == null ? "—" : n.toLocaleString());
  const activeClaims = data
    ? (data.claims.byStatus.PENDING ?? 0) + (data.claims.byStatus.CONFIRMED ?? 0)
    : undefined;
  const pendingMovingSales = data?.movingSale.byStatus.PENDING_REVIEW;
  const liveItems = data?.items.byStatus.LIVE;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 max-w-7xl mx-auto w-full">
      <AdminPageHeader
        title={`${greeting}, ${firstName}`}
        subtitle={`${today} · Here's what's happening across DropYard.`}
        action={
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-[12px] font-bold text-emerald-700 uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            All systems normal
          </div>
        }
      />

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-5 py-3 mb-6">
          <p className="text-sm text-rose-700 font-medium">{error}</p>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <AdminStatCard
          label="Total Users"
          value={fmt(data?.users.total)}
          icon={<Users size={18} />}
          accent="sky"
          hint={data ? `+${data.users.newThisWeek} this week` : "Loading…"}
          delta={data ? { value: `${data.users.newThisWeek}`, positive: true } : undefined}
        />
        <AdminStatCard
          label="Items Listed"
          value={fmt(data?.items.total)}
          icon={<Package size={18} />}
          accent="emerald"
          hint={data ? `${fmt(liveItems)} live now` : "Loading…"}
        />
        <AdminStatCard
          label="Active Claims"
          value={fmt(activeClaims)}
          icon={<ShoppingBag size={18} />}
          accent="amber"
          hint={data ? `${fmt(data.claims.total)} total claims` : "Loading…"}
        />
        <AdminStatCard
          label="Pending Reviews"
          value={fmt(pendingMovingSales)}
          icon={<Truck size={18} />}
          accent="violet"
          hint="Moving Sale applications"
        />
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <AdminSectionCard
            title="User breakdown"
            subtitle="Buyers and sellers across the marketplace"
            action={
              <span className="text-xs text-slate-500 font-medium">
                {data
                  ? `${fmt(
                      (data.users.byRole.BUYER ?? 0) +
                        (data.users.byRole.SELLER ?? 0) +
                        (data.users.byRole.BOTH ?? 0),
                    )} marketplace users`
                  : ""}
              </span>
            }
          >
            <UserBreakdown data={data} />
          </AdminSectionCard>

          <AdminSectionCard
            title="Drop activity"
            subtitle={
              data
                ? `${data.drops.active} active drop · ${fmt(data.items.byPlacement.DROP)} items in Drop · ${fmt(data.items.byPlacement.SHELF)} on Shelf`
                : "Loading…"
            }
          >
            <ClaimFunnel data={data} />
          </AdminSectionCard>
        </div>

        <div className="space-y-4">
          <AdminSectionCard
            title="Moving Sale pipeline"
            subtitle="Application review queue"
            action={
              <Link
                href="/admin/moving-sales"
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700 hover:text-emerald-900"
              >
                Review <ArrowUpRight size={11} />
              </Link>
            }
          >
            <MovingSalePipeline data={data} />
          </AdminSectionCard>

          <AdminSectionCard title="Engagement" subtitle="Last 7 days">
            <div className="space-y-3">
              <EngagementRow
                icon={<Heart size={14} />}
                label="Watchlist saves"
                value={fmt(data?.engagement.watchlistSaves)}
                accent="rose"
              />
              <EngagementRow
                icon={<MessageSquare size={14} />}
                label="Conversations"
                value={fmt(data?.engagement.conversations)}
                accent="violet"
              />
              <EngagementRow
                icon={<Send size={14} />}
                label="Messages sent"
                value={fmt(data?.engagement.messagesLast7Days)}
                accent="emerald"
              />
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Quick actions" subtitle="Common admin tasks">
            <div className="space-y-2">
              <QuickAction
                href="/admin/moving-sales"
                icon={<Truck size={14} />}
                label="Review Moving Sale applications"
                count={pendingMovingSales}
              />
              <QuickAction
                href="#"
                icon={<Sparkles size={14} />}
                label="Send portal announcement"
                count={undefined}
                disabled
              />
            </div>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  );
}

// ── User breakdown bar + legend ─────────────────────────────────

function UserBreakdown({ data }: { data: Overview | null }) {
  if (!data) {
    return <div className="h-24 rounded-xl bg-slate-50 animate-pulse" />;
  }
  // Distribution is computed over marketplace roles (buyer/seller/both) only —
  // admins are an internal headcount and excluded from the bar so percentages add to 100%.
  const visibleRoleKeys = Object.keys(ROLE_META) as Array<keyof typeof ROLE_META>;
  const total = visibleRoleKeys.reduce((sum, r) => sum + (data.users.byRole[r] ?? 0), 0) || 1;
  const roles = visibleRoleKeys.filter((r) => (data.users.byRole[r] ?? 0) > 0);

  return (
    <div className="space-y-5">
      {/* Stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {roles.map((role) => {
          const count = data.users.byRole[role] ?? 0;
          const pct = (count / total) * 100;
          return (
            <div
              key={role}
              className={ROLE_META[role].color}
              style={{ width: `${pct}%` }}
              title={`${ROLE_META[role].label}: ${count}`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {roles.map((role) => {
          const count = data.users.byRole[role] ?? 0;
          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
          return (
            <div key={role} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${ROLE_META[role].color}`} />
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {ROLE_META[role].label}
                </span>
              </div>
              <p className="text-xl font-bold text-slate-900">{count.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400">{pct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Claim funnel ────────────────────────────────────────────────

function ClaimFunnel({ data }: { data: Overview | null }) {
  if (!data) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-50 animate-pulse" />
        ))}
      </div>
    );
  }
  const steps = ["PENDING", "CONFIRMED", "PICKED_UP", "REJECTED", "WAITLISTED"];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {steps.map((step) => {
        const count = data.claims.byStatus[step] ?? 0;
        const meta = CLAIM_STATUS_META[step];
        return (
          <div
            key={step}
            className={`rounded-xl border p-4 ${meta.bg}`}
          >
            <p className={`text-[11px] font-bold uppercase tracking-wider ${meta.color}`}>
              {meta.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{count.toLocaleString()}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Moving sale pipeline ────────────────────────────────────────

function MovingSalePipeline({ data }: { data: Overview | null }) {
  if (!data) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-9 rounded-lg bg-slate-50 animate-pulse" />
        ))}
      </div>
    );
  }
  const statuses = ["PENDING_REVIEW", "APPROVED", "REJECTED", "COMPLETED"];
  const total = statuses.reduce((sum, s) => sum + (data.movingSale.byStatus[s] ?? 0), 0) || 1;

  return (
    <div className="space-y-3">
      {statuses.map((status) => {
        const count = data.movingSale.byStatus[status] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        const meta = MOVING_STATUS_META[status];
        return (
          <div key={status}>
            <div className="flex items-center justify-between text-[12px] mb-1.5">
              <span className={`font-semibold ${meta.color}`}>{meta.label}</span>
              <span className="text-slate-900 font-bold">{count}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${meta.bar} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Engagement row ──────────────────────────────────────────────

function EngagementRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "rose" | "violet" | "emerald";
}) {
  const styles: Record<string, { bg: string; text: string }> = {
    rose:    { bg: "bg-rose-50",    text: "text-rose-700" },
    violet:  { bg: "bg-violet-50",  text: "text-violet-700" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700" },
  };
  const s = styles[accent];
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.bg} ${s.text} flex-shrink-0`}>
          {icon}
        </span>
        <span className="text-[13px] font-medium text-slate-700 truncate">{label}</span>
      </div>
      <span className="text-base font-bold text-slate-900 tabular-nums">{value}</span>
    </div>
  );
}

// ── Quick action row ────────────────────────────────────────────

function QuickAction({
  href,
  icon,
  label,
  count,
  disabled,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  disabled?: boolean;
}) {
  const inner = (
    <div
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        disabled
          ? "text-slate-400 cursor-not-allowed"
          : "text-slate-700 hover:bg-emerald-50/60 cursor-pointer"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          disabled ? "bg-slate-50 text-slate-400" : "bg-emerald-50 text-emerald-700"
        } flex-shrink-0`}
      >
        {icon}
      </span>
      <span className="flex-1 text-[13px] font-medium truncate">{label}</span>
      {typeof count === "number" && count > 0 && (
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
          {count}
        </span>
      )}
      {!disabled && <ArrowUpRight size={13} className="text-slate-300 group-hover:text-emerald-700" />}
    </div>
  );
  if (disabled) return inner;
  return <Link href={href}>{inner}</Link>;
}
