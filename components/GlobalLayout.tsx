"use client";

import { usePathname } from "next/navigation";
import { GlobalHeader } from "./GlobalHeader";
import { GlobalFooter } from "./GlobalFooter";

export function GlobalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Authed/portal routes render their own shell — the public header + footer
  // should NOT appear on top of them.
  const isDashboard =
    pathname.startsWith("/buyer") ||
    pathname.startsWith("/seller") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/preview");

  return (
    <div className="min-h-screen flex flex-col">
      {!isDashboard && <GlobalHeader />}
      {/* Offset for the fixed nav. Keep in step with the bar height in
          GlobalHeader; pt-16 once slipped content underneath it. */}
      <main className={`flex-1 flex flex-col ${isDashboard ? "" : "pt-20 xl:pt-[92px]"}`}>{children}</main>
      {!isDashboard && <GlobalFooter />}
    </div>
  );
}
