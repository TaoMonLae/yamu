"use client";

import Image from "next/image";
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Info, Search, Sparkles } from "lucide-react";
import { ReportBugButton } from "@/components/ReportBugButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useBranding } from "@/components/BrandingProvider";
import { t, translate } from "@/lib/i18n";
import type { UiLanguage } from "@/lib/types";

type PublicPage = "search" | "naming" | "about";

const NAV_ITEMS = [
  { id: "search", href: "/", label: "Search", icon: Search },
  { id: "naming", href: "/naming", label: "Naming", icon: Sparkles },
  { id: "about", href: "/about", label: "About", icon: Info },
] as const;

type Props = {
  lang: UiLanguage;
  onLang: (lang: UiLanguage) => void;
  admin?: boolean;
  about?: boolean;
  naming?: boolean;
};

export function SiteHeader({ lang, onLang, admin, about, naming }: Props) {
  const copy = t(lang);
  const tr = (message: string) => translate(lang, message);
  const active: PublicPage = about ? "about" : naming ? "naming" : "search";
  const { branding } = useBranding();

  return (
    <header className="public-site-header sticky top-0 z-50 border-b border-ink bg-canvas">
      <div className="index-shell public-site-header__grid">
        <Link href="/" className="public-site-brand">
          {branding.logoUrl ? (
            <Image src={branding.logoUrl} alt="" width={34} height={34} unoptimized className="h-[34px] w-[34px] border border-pewter object-contain" />
          ) : (
            <span className="public-site-brand__fallback">001</span>
          )}
          <span className="min-w-0">
            <strong lang="en">{branding.siteName || copy.wordmark}</strong>
            <small lang={branding.tagline ? undefined : lang === "burmese" ? "my" : "mnw"}>{branding.tagline || copy.tagline}</small>
          </span>
        </Link>

        {!admin ? (
          <nav className="public-site-nav" aria-label={tr("Main navigation")}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined}>
                  <Icon size={15} strokeWidth={1.8} aria-hidden />
                  <span>{tr(item.label)}</span>
                </Link>
              );
            })}
          </nav>
        ) : <div />}

        <div className="public-site-tools">
          <label className="public-language-select">
            <span>{tr("Language")}</span>
            <select value={lang} onChange={(event) => onLang(event.target.value as UiLanguage)} aria-label={tr("Interface language")}>
              <option value="english">EN</option>
              <option value="mon">မန်</option>
              <option value="burmese">ဗမာ</option>
            </select>
          </label>
          <ThemeToggle lang={lang} />
          <Show when="signed-out">
            <SignInButton mode="redirect" forceRedirectUrl="/admin">
              <button type="button" className="public-sign-in">{tr("Sign in")}</button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <span className="public-user-button"><UserButton appearance={{ elements: { avatarBox: "h-7 w-7 rounded-[2px]" } }} /></span>
          </Show>
          {!admin ? <ReportBugButton lang={lang} compact /> : <span className="public-admin-label">{copy.admin}</span>}
        </div>
      </div>
    </header>
  );
}
