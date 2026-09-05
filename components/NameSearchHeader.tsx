"use client";

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ReportBugButton } from "@/components/ReportBugButton";
import { useBranding } from "@/components/BrandingProvider";
import { translate } from "@/lib/i18n";
import type { UiLanguage } from "@/lib/types";

export function NameSearchHeader({ lang, onLang }: { lang: UiLanguage; onLang: (lang: UiLanguage) => void }) {
  const { branding } = useBranding();
  const uiLang = lang === "mon" ? "mnw" : lang === "burmese" ? "my" : "en";
  return <header lang={uiLang} className="name-app-header localized-interface md:hidden">
    <Link href="/" className="name-app-brand"><BrandMark logoUrl={branding.logoUrl} className="h-7 w-7" /><span>{branding.siteName}</span></Link>
    <div className="name-app-tools">
      <select aria-label={translate(lang, "Interface language")} value={lang} onChange={(event) => onLang(event.target.value as UiLanguage)}>
        <option value="english">EN</option><option value="mon">မန်</option><option value="burmese">ဗမာ</option>
      </select>
      <ThemeToggle lang={lang} />
      <details className="name-app-menu"><summary aria-label={translate(lang, "More options")}><span aria-hidden>•••</span></summary>
        <nav aria-label={translate(lang, "More options")}>
          <ReportBugButton lang={lang} menuItem />
          <Show when="signed-out"><SignInButton mode="redirect" forceRedirectUrl="/admin"><button type="button">{translate(lang, "Team sign in")}</button></SignInButton></Show>
          <Show when="signed-in"><Link href="/admin">{translate(lang, "Admin panel")}</Link><UserButton /></Show>
        </nav>
      </details>
    </div>
  </header>;
}
