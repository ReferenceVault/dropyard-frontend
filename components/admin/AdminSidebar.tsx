"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ADMIN_NAV } from "./navItems";

type Props = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export function AdminSidebar({ collapsed, mobileOpen, onCloseMobile }: Props) {
  const pathname = usePathname();
  const width = collapsed ? "lg:w-[76px]" : "lg:w-64";

  // Per-section collapse state (expanded by default).
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (id: string) =>
    setCollapsedSections((s) => ({ ...s, [id]: !s[id] }));

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className={`px-2 pt-1 pb-2 ${collapsed ? "lg:px-2" : ""}`}>
        {collapsed ? (
          <div className="hidden lg:flex h-9 w-9 mx-auto items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-md shadow-emerald-500/30 p-1">
            <img src="/Logo_1.png" alt="DropYard" className="h-full w-full object-contain brightness-0 invert" />
          </div>
        ) : (
          <div className="w-full flex items-center justify-center overflow-hidden">
            <img
              src="/Logo_1.png"
              alt="DropYard"
              className="h-20 w-auto object-contain scale-125 origin-center -my-3"
            />
          </div>
        )}
      </div>

      {/* Divider between brand and nav */}
      <div className={`px-4 ${collapsed ? "lg:px-3" : ""}`}>
        <div className="h-px bg-gradient-to-r from-transparent via-emerald-900/20 to-transparent" />
      </div>

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto px-2 pt-4 pb-4 space-y-3 ${collapsed ? "lg:px-2" : ""}`}>
        {ADMIN_NAV.map((section) => {
          const sectionCollapsed = collapsedSections[section.id];
          return (
            <div key={section.id}>
              {/* Section header — clickable to collapse */}
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="group w-full flex items-center justify-between gap-2 px-2 py-1 mb-0.5 rounded-md text-emerald-900 hover:bg-emerald-50/60 transition-colors"
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.24em]">
                    {section.label}
                  </span>
                  <ChevronDown
                    size={10}
                    strokeWidth={2.8}
                    className={`text-emerald-800 transition-transform duration-200 ${
                      sectionCollapsed ? "-rotate-90" : "rotate-0"
                    }`}
                  />
                </button>
              )}

              {/* Section items */}
              {!sectionCollapsed && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
                    const Icon = item.icon;

                    const inner = (
                      <div
                        className={`group relative flex items-center gap-2.5 rounded-lg transition-all duration-150 ${
                          collapsed ? "lg:justify-center lg:px-0 lg:py-2 px-2.5 py-2" : "px-2.5 py-2"
                        } ${
                          active
                            ? "bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70"
                            : item.disabled
                            ? "text-slate-500 cursor-not-allowed"
                            : "text-slate-800 hover:bg-emerald-50 hover:text-emerald-900"
                        }`}
                        title={collapsed ? item.label : undefined}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r bg-dy-orange shadow-[0_0_10px_rgba(255,148,18,0.4)]" />
                        )}

                        {/* Icon tile */}
                        <span
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-all duration-150 ${
                            active
                              ? "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-200/60"
                              : item.disabled
                              ? "bg-white/40 text-slate-400"
                              : "bg-white/60 text-slate-700 group-hover:bg-white group-hover:text-emerald-700 group-hover:shadow-sm"
                          }`}
                        >
                          <Icon size={14} strokeWidth={active ? 2.4 : 1.9} />
                        </span>

                        {/* Label */}
                        <span className={`flex-1 text-[13.5px] font-semibold leading-none ${collapsed ? "lg:hidden" : ""}`}>
                          {item.label}
                        </span>

                        {/* Badge */}
                        {item.badge && !collapsed && (
                          <span className="text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/70">
                            {item.badge}
                          </span>
                        )}

                        {/* Hover arrow */}
                        {!item.disabled && !active && !collapsed && (
                          <ChevronDown
                            size={11}
                            strokeWidth={2}
                            className="-rotate-90 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-emerald-600 transition-all duration-200 -translate-x-1 group-hover:translate-x-0"
                          />
                        )}
                      </div>
                    );

                    if (item.disabled) return <div key={item.id}>{inner}</div>;
                    return (
                      <Link key={item.id} href={item.href} onClick={onCloseMobile}>
                        {inner}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex ${width} flex-shrink-0 flex-col bg-gradient-to-b from-[#d8e7dc] via-[#cbdcd0] to-[#bbcec1] text-slate-800 border-r border-emerald-100/80 transition-[width] duration-200`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile slide-out */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCloseMobile} />
          <aside className="relative w-64 flex flex-col bg-gradient-to-b from-[#d8e7dc] via-[#cbdcd0] to-[#bbcec1] text-slate-800 shadow-2xl border-r border-emerald-100/80">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
