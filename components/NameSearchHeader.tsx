"use client";

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ReportBugButton } from "@/components/ReportBugButton";
import { useBranding } from "@/components/BrandingProvider";
import type { UiLanguage } from "@/lib/types";

export function NameSearchHeader({ lang, onLang }: { lang: UiLanguage; onLang: (lang: UiLanguage) => void }) {
  const { branding } = useBranding();
  return <header className="name-app-header md:hidden">
    <Link href="/" className="name-app-brand"><BrandMark logoUrl={branding.logoUrl} className="h-7 w-7" /><span>{branding.siteName}</span></Link>
    <div className="name-app-tools">
      <select aria-label="Interface language" value={lang} onChange={(event) => onLang(event.target.value as UiLanguage)}>
        <option value="english">EN</option><option value="mon">မန်</option><option value="burmese">ဗမာ</option>
      </select>
      <ThemeToggle />
      <details className="name-app-menu"><summary aria-label="More options"><span aria-hidden>☰</span></summary>
        <nav aria-label="More options">
          <Link href="/about">About YAMU</Link>
          <ReportBugButton />
          <Show when="signed-out"><SignInButton mode="redirect" forceRedirectUrl="/admin"><button type="button">Team sign in</button></SignInButton></Show>
          <Show when="signed-in"><Link href="/admin">Admin panel</Link><UserButton /></Show>
        </nav>
      </details>
    </div>
  </header>;
}
