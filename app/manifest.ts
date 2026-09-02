import type { MetadataRoute } from "next";
import { getBrandSettings } from "@/lib/branding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function manifest(): MetadataRoute.Manifest {
  const branding = getBrandSettings();
  const description = branding.tagline
    || `${branding.siteName} compares names across Mon, Burmese, and English.`;

  return {
    id: "/",
    name: `${branding.siteName} — Mon, Burmese, and English Names`,
    short_name: [...branding.siteName].slice(0, 12).join(""),
    description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fafaf6",
    theme_color: branding.accentColor,
    orientation: "any",
    lang: "en",
    categories: ["education", "reference", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
