"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, Bell, Menu, ChevronDown, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_NAV } from "./navItems";
import type { AuthUser } from "@/context/AuthContext";

export function AdminTopBar({
  user,
  onSignout,
  onToggleSidebar,
}: {
  user: AuthUser;
  onSignout: () => void;
  onToggleSidebar: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const allItems = ADMIN_NAV.flatMap((s) => s.items);
  const current = allItems.find((i) => i.href === pathname) ?? allItems[0];

  const initials = (user.name ?? user.email)
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "DA";

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close menu on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="h-16 grid grid-cols-[auto_1fr_auto] items-center gap-6 pl-3 pr-4 sm:pr-6 lg:pr-8 bg-white border-b border-slate-200 sticky top-0 z-30">
      {/* LEFT — menu + breadcrumb */}
      <div className="flex items-center gap-4 justify-self-start min-w-0">
        <button
          onClick={onToggleSidebar}
          className="flex h-11 w-11 lg:h-9 lg:w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 flex-shrink-0"
          aria-label="Toggle navigation"
        >
          <Menu size={18} />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-[13px] min-w-0">
          <span className="text-slate-400">Admin</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-900 truncate">{current.label}</span>
        </div>
      </div>

      {/* CENTER — search */}
      <div className="relative w-full max-w-3xl mx-auto hidden sm:block">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search users, items, claims…"
          className="w-full pl-10 pr-14 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/50 transition"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5 leading-none">
          ⌘K
        </kbd>
      </div>

      {/* RIGHT — bell + user */}
      <div className="flex items-center gap-3 justify-self-end">
        <button
          type="button"
          onClick={() => router.push("/admin/inbox")}
          className="relative flex h-11 w-11 lg:h-9 lg:w-9 items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
          aria-label="Notifications — open inbox"
          title="Open inbox"
        >
          <Bell size={15} />
          <span className="absolute top-2.5 right-2.5 lg:top-1.5 lg:right-1.5 w-2 h-2 rounded-full bg-dy-orange ring-2 ring-white" />
        </button>

        <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className={`flex items-center gap-2.5 rounded-full pl-1 pr-2.5 py-1 border transition ${
            menuOpen
              ? "bg-slate-100 border-slate-300"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-[12px] font-bold ring-2 ring-white shadow-sm">
            {initials}
          </span>
          <div className="hidden sm:flex flex-col leading-tight text-left">
            <span className="text-[13px] font-semibold text-slate-900 truncate max-w-[160px]">
              {user.name}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
              {user.role}
            </span>
          </div>
          <ChevronDown size={13} className="text-slate-400 hidden sm:block" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-60 bg-white rounded-2xl border border-slate-200 shadow-[0_12px_40px_rgba(11,47,32,0.12)] overflow-hidden z-40"
          >
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-[13px] font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-[12px] text-slate-500 truncate">{user.email}</p>
              <span className="inline-block mt-2 text-[9px] font-bold uppercase tracking-[0.22em] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {user.role}
              </span>
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                onSignout();
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
