"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminAuthedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, signout, loading } = useAuth();

  // BUG-072 — hydration-safe mount gate. The server has no access to the
  // auth cookie at SSR time, so it always renders the "Checking access"
  // loading state. If the client happens to have the user immediately (e.g.
  // when navigating between admin pages where AuthContext is already
  // populated), React would render a different tree on first paint than
  // the server did → hydration mismatch. We force the loading state on
  // first paint, then flip to the real auth check after mount, so the
  // server's HTML and the client's first render always agree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.replace("/admin/login");
    }
  }, [mounted, user, loading, router]);

  if (!mounted || loading || !user || user.role !== "ADMIN") {
    return (
      <div className="h-screen flex items-center justify-center bg-dy-pale">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-sm font-medium">Checking access…</p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell user={user} onSignout={signout}>
      {children}
    </AdminShell>
  );
}
