import { NextResponse, type NextRequest } from "next/server";

// /preview/* holds old design mock-ups (the _v2 / _final dashboards, demo data
// only), for local development. In a production build every /preview route is
// sent to Next's own not-found handling, so it answers with the standard 404
// page and a real 404 status. `npm run dev` still shows them.
//
// Why here and not only notFound() in the pages: the root layout wraps every
// page in <Suspense>, so the response has already started with status 200
// before a page runs; notFound() there swaps in the 404 page but the status
// stays 200. The pages still call notFound() too (app/preview/previewOnly.ts),
// so their content never renders in production either way.
export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") return NextResponse.next();
  // A path no route matches, so Next answers it with its 404 page and status.
  return NextResponse.rewrite(new URL("/__not-found", request.url));
}

export const config = {
  matcher: ["/preview", "/preview/:path*"],
};
