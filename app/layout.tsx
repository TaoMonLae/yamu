import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import { BrandingProvider } from "@/components/BrandingProvider";
import { BlinkingSquares } from "@/components/reactbits/BlinkingSquares";
import { PwaRegistration } from "@/components/PwaRegistration";
import { brandThemeStyle } from "@/lib/brand-theme";
import { getBrandSettings } from "@/lib/branding";
import "./globals.css";

const z20KhitHaungg = localFont({
  src: [
    {
      path: "../public/fonts/Z20-KhitHaungg-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Z20-KhitHaungg-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-z20-khit-haungg",
  display: "swap",
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const branding = getBrandSettings();
  return {
    applicationName: branding.siteName,
    title: {
      default: `${branding.siteName} | Names across Mon, Burmese, and English`,
      template: `%s | ${branding.siteName}`,
    },
    description: `${branding.siteName} lets you compare Mon, Burmese, and English name spellings, choose a preferred variant, and export a typographic PNG specimen.`,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: branding.siteName,
    },
    icons: {
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const branding = getBrandSettings();
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    colorScheme: "light dark",
    themeColor: branding.accentColor,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = getBrandSettings();
  const themeStyle = brandThemeStyle(branding.accentColor) as CSSProperties;
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${z20KhitHaungg.variable} h-full antialiased`}
      style={themeStyle}
    >
      <head>
        {branding.faviconUrl ? <link data-brand-favicon="true" rel="icon" href={branding.faviconUrl} /> : null}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('yamu-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full bg-canvas text-ink">
        <ClerkProvider afterSignOutUrl="/" appearance={{ theme: shadcn, variables: { colorPrimary: branding.accentColor, borderRadius: "2px" } }}>
          <PwaRegistration />
          <BrandingProvider initialBranding={branding}>
            <BlinkingSquares />
            <div className="app-layer">{children}</div>
          </BrandingProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
