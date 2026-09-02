"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function activeTheme(): Theme {
  const saved = window.localStorage.getItem("yamu-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
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
      aria-label={isDark ? "Use light mode" : "Use dark mode"}
      title={isDark ? "Use light mode" : "Use dark mode"}
      onClick={toggleTheme}
      className="theme-toggle relative grid min-w-12 place-items-center border-r border-pewter bg-canvas text-ink transition-colors hover:bg-mist"
    >
      <span className="theme-toggle__glyph" aria-hidden="true">
        <span className="theme-toggle__sun" />
        <span className="theme-toggle__moon" />
      </span>
    </button>
  );
}
