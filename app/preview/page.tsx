import Link from "next/link";
import { previewOnly } from "./previewOnly";

const components: { slug: string; label: string; file: string; tag: string }[] = [
  // v1 dashboards now render directly from /buyer (mode-switched). Their
  // /preview/buyer-dashboard and /preview/seller-dashboard routes were
  // removed once the v1 dashboards stabilised — DropYard_BuyerDashboard.jsx
  // and DropYard_SellerDashboard.jsx still exist as the source components.
  { slug: "buyer-dashboard-v2",             label: "Buyer Dashboard (v2)",       file: "DropYard_BuyerDashboard_v2.jsx",  tag: "Preview" },
  { slug: "seller-dashboard-v2",            label: "Seller Dashboard (v2)",      file: "DropYard_SellerDashboard_v2.jsx", tag: "Preview" },
  // Feedback batch — landing-page sections from "Feedback on Updates" folder.
];

const tagColors: Record<string, string> = {
  Dashboard: "bg-emerald-100 text-emerald-700",
  Preview:   "bg-violet-100 text-violet-700",
  Feedback:  "bg-sky-100 text-sky-700",
  Landing:   "bg-amber-100 text-amber-700",
};

export default function PreviewIndex() {
  previewOnly();
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Component Preview</h1>
          <p className="mt-2 text-slate-500">Click any component to preview it. This folder is temporary — delete after integration.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {components.map((c) => (
            <Link
              key={c.slug}
              href={`/preview/${c.slug}`}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-slate-800">{c.label}</p>
                <p className="mt-0.5 text-xs text-slate-400">{c.file}</p>
              </div>
              <span className={`ml-4 shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${tagColors[c.tag]}`}>
                {c.tag}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
