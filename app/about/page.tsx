import type { Metadata } from "next";
import { AboutApp } from "@/components/AboutApp";

export const metadata: Metadata = {
  title: "About Tao Mon Lae",
  description: "Tao Mon Lae explains why he built Yamu and thanks the people who helped him create the Mon, Burmese, and English name index.",
};

export default function AboutPage() {
  return <AboutApp />;
}
