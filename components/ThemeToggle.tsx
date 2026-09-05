"use client";

import { useEffect, useState } from "react";
import { translate } from "@/lib/i18n";
import type { UiLanguage } from "@/lib/types";

type Theme = "light" | "dark";

function activeTheme(): Theme {
  const saved = window.localStorage.getItem("yamu-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ variant = "header", lang = "english" }: { variant?: "header" | "sidebar"; lang?: UiLanguage }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(activeTheme());
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const followPreference = () => {
      if (!window.localStorage.getItem("yamu-theme")) setTheme(activeTheme());
    };
    preference.addEventListener("change", followPreference);
    return () => preference.removeEventListener("change", followPreference);
  }, []);

  function toggleTheme() {
    const next: Theme = activeTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("yamu-theme", next);
    setTheme(next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={translate(lang, isDark ? "Use light mode" : "Use dark mode")}
      title={translate(lang, isDark ? "Use light mode" : "Use dark mode")}
      onClick={toggleTheme}
      className={variant === "sidebar"
        ? "theme-toggle mb-3 flex min-h-10 w-full items-center justify-between border border-white/15 bg-white/[0.04] px-3 text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
        : "theme-toggle relative grid min-w-12 place-items-center border-r border-pewter bg-canvas text-ink transition-colors hover:bg-mist"}
    >
      {variant === "sidebar" ? <span className="font-mono text-[9px] uppercase tracking-[0.12em]">{translate(lang, "Appearance")}</span> : null}
      <span className="theme-toggle__glyph" aria-hidden="true">
        <span className="theme-toggle__sun" />
        <span className="theme-toggle__moon" />
      </span>
    </button>
  );
}
