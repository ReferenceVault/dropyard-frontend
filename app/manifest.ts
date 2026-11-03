import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest and linked from every page by Next.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DropYard",
    short_name: "DropYard",
    description: "From one home to another. Local yard sales, simplified.",
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
  };
}
