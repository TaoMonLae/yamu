"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { brandThemeStyle } from "@/lib/brand-theme";
import type { BrandSettings } from "@/lib/types";

type BrandingContextValue = {
  branding: BrandSettings;
  setBranding: (settings: BrandSettings) => void;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({
  children,
  initialBranding,
}: {
  children: ReactNode;
  initialBranding: BrandSettings;
}) {
  const [branding, setBranding] = useState(initialBranding);
  const previousSiteName = useRef(initialBranding.siteName);

  useEffect(() => {
    const root = document.documentElement;
    const theme = brandThemeStyle(branding.accentColor);
    Object.entries(theme).forEach(([property, value]) => root.style.setProperty(property, value));

    let icon = document.querySelector<HTMLLinkElement>('link[data-brand-favicon="true"]');
    if (branding.faviconUrl) {
      if (!icon) {
        icon = document.createElement("link");
        icon.rel = "icon";
        icon.dataset.brandFavicon = "true";
        document.head.appendChild(icon);
      }
      icon.href = branding.faviconUrl;
    } else {
      icon?.remove();
    }

    if (previousSiteName.current !== branding.siteName) {
      document.title = document.title.includes(previousSiteName.current)
        ? document.title.replace(previousSiteName.current, branding.siteName)
        : `${branding.siteName} | Names across Mon, Burmese, and English`;
      previousSiteName.current = branding.siteName;
    }
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, setBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const value = useContext(BrandingContext);
  if (!value) throw new Error("useBranding must be used inside BrandingProvider.");
  return value;
}
