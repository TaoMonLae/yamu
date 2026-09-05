import type { Metadata } from "next";
import { NamingApp } from "@/components/NamingApp";

export const metadata: Metadata = {
  title: "Traditional Mon name reading",
  description: "Read a Mon name with the traditional seven-day character and astrology method.",
};

export default function NamingPage() {
  return <NamingApp />;
}
