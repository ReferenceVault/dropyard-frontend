"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";
import type { AuthUser } from "@/context/AuthContext";

const LG_BREAKPOINT = 1024;

export function AdminShell({
  user,
  onSignout,
  children,
}: {
  user: AuthUser;
  onSignout: () => void;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // BUG-057 — Sign-out confirmation. All sign-out clicks go through this
  // gate; the actual onSignout fires only when the user confirms.
  const [signoutOpen, setSignoutOpen] = useState(false);

  // Single header hamburger handler: on desktop it toggles the sidebar
  // collapse state; on mobile it opens the slide-out drawer.
  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth >= LG_BREAKPOINT) {
      setCollapsed((c) => !c);
    } else {
      setMobileOpen(true);
    }
  };

  // Lock body scroll while the mobile drawer is open — otherwise the page
  // behind the overlay scrolls under the user's finger.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  // Auto-close the mobile drawer when the viewport grows past the lg
  // breakpoint (rotating a tablet, resizing on desktop).
  useEffect(() => {
    if (!mobileOpen) return;
    const onResize = () => {
      if (window.innerWidth >= LG_BREAKPOINT) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mobileOpen]);

  return (
    <div className="h-screen overflow-hidden bg-dy-pale flex">
      <AdminSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopBar
          user={user}
          onSignout={() => setSignoutOpen(true)}
          onToggleSidebar={toggleSidebar}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {signoutOpen && (
        <div
          onClick={() => setSignoutOpen(false)}
          className="fixed inset-0 bg-slate-900/45 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-signout-title"
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
          >
            <h3 id="admin-signout-title" className="text-[16px] font-bold text-slate-900 mb-1.5">Sign out?</h3>
            <p className="text-[13px] text-slate-500 leading-relaxed mb-5">You&rsquo;ll need to sign back in to access the admin console.</p>
            <div className="flex justify-end gap-2">
              <button
                autoFocus
                onClick={() => setSignoutOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-[13px] font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => { setSignoutOpen(false); onSignout(); }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-bold transition"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
