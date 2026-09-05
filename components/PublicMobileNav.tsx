"use client";

import Link from "next/link";
import { Info, Search, Sparkles } from "lucide-react";
import { translate } from "@/lib/i18n";
import type { UiLanguage } from "@/lib/types";

type PublicPage = "search" | "naming" | "about";

const ITEMS = [
  { id: "search", href: "/", label: "Search", icon: Search },
  { id: "naming", href: "/naming", label: "Naming", icon: Sparkles },
  { id: "about", href: "/about", label: "About", icon: Info },
] as const;

export function PublicMobileNav({ active, lang }: { active: PublicPage; lang: UiLanguage }) {
  const uiLang = lang === "mon" ? "mnw" : lang === "burmese" ? "my" : "en";
  return (
    <nav lang={uiLang} className="public-mobile-nav localized-interface md:hidden" aria-label={translate(lang, "Public pages")}>
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined}>
            <Icon size={19} strokeWidth={1.8} aria-hidden />
            <span>{translate(lang, item.label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
