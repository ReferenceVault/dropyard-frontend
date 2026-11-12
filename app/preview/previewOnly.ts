import { notFound } from "next/navigation";

// /preview/* holds old design mock-ups (the _v2 / _final dashboards, demo data
// only), for local development. In production the 404 status comes from
// proxy.ts (/preview requests are sent to Next's not-found handling); this is
// the second layer, so a page's content never renders in production even if
// a request gets past the proxy. `npm run dev` still shows them.
export function previewOnly(): void {
  if (process.env.NODE_ENV === "production") notFound();
}
