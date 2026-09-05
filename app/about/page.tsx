import type { Metadata } from "next";
import { AboutApp } from "@/components/AboutApp";

export const metadata: Metadata = {
  title: "About YAMU — The people behind the names",
  description: "Meet Tao Mon Lae, Oung Seik, and AhHtet CoonMon, and discover the story behind YAMU’s Mon, Burmese, and English name index.",
};

export default function AboutPage() {
  return <AboutApp />;
}
