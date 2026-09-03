"use client";

import Link from "next/link";
import Image from "next/image";
import { useBranding } from "@/components/BrandingProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ReportBugButton } from "@/components/ReportBugButton";
import { t } from "@/lib/i18n";
import type { UiLanguage } from "@/lib/types";

const LANGS: { id: UiLanguage; label: string }[] = [
  { id: "mon", label: "မန်" },
  { id: "burmese", label: "ဗမာ" },
  { id: "english", label: "EN" },
];

type Props = {
  lang: UiLanguage;
  onLang: (lang: UiLanguage) => void;
  admin?: boolean;
  about?: boolean;
};

export function SiteHeader({ lang, onLang, admin, about }: Props) {
  const copy = t(lang);
  const usesMyanmarScript = lang !== "english";
  const { branding } = useBranding();

  return (
    <header className="sticky top-0 z-50 border-b border-ink bg-canvas">
      <div className="index-shell flex min-h-[72px] items-stretch justify-between gap-2 sm:gap-6">
        <Link href="/" className="flex min-w-0 items-center gap-2 py-3 no-underline sm:gap-4">
          {branding.logoUrl ? (
            <Image
              src={branding.logoUrl}
              alt=""
              width={32}
              height={32}
              unoptimized
              className="hidden h-8 w-8 border border-pewter object-contain sm:block"
            />
          ) : (
            <span className="hidden h-8 w-8 items-center justify-center border border-ink font-display text-[11px] font-semibold sm:flex">
              001
            </span>
          )}
          <div className="min-w-0">
            <p
              lang="en"
              className="font-display text-[22px] font-bold uppercase leading-none tracking-[-0.01em] text-ink"
            >
              {branding.siteName || copy.wordmark}
            </p>
            <p lang={branding.tagline ? undefined : lang === "burmese" ? "my" : "mnw"} className="mt-1.5 hidden max-w-56 truncate font-script text-[10px] text-ash sm:block">
              {branding.tagline || copy.tagline}
            </p>
          </div>
        </Link>
        <div className="flex items-stretch">
          <div className="flex items-stretch border-x border-pewter">
            {LANGS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onLang(item.id)}
                aria-pressed={lang === item.id}
                className={`relative min-w-10 border-r border-pewter px-2 text-[12px] transition-colors duration-150 last:border-r-0 sm:min-w-12 sm:px-3 ${
                  lang === item.id
                    ? "bg-ink text-canvas after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent"
                    : "bg-canvas text-ink hover:bg-mist"
                } ${item.id === "english" ? "font-display font-semibold" : "font-script"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <ThemeToggle />
          {!admin ? <ReportBugButton /> : null}
          <Link
            href="/about"
            aria-current={about ? "page" : undefined}
            aria-label="About Yamu and its developer"
            className={`relative flex min-w-10 items-center justify-center border-r border-pewter px-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] no-underline transition-colors sm:min-w-0 sm:px-4 ${
              about
                ? "bg-ink text-canvas after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent"
                : "bg-canvas text-ink hover:bg-mist"
            }`}
          >
            <span className="sm:hidden" aria-hidden="true">i</span>
            <span className="hidden sm:inline">About</span>
          </Link>
          {admin ? (
            <span className={`hidden items-center border-r border-pewter px-4 text-[11px] font-semibold text-ash sm:flex ${usesMyanmarScript ? "font-script" : "font-display uppercase tracking-[0.08em]"}`}>
              {copy.admin}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
