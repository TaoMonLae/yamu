"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useBranding } from "@/components/BrandingProvider";
import { DepthCard } from "@/components/reactbits/DepthCard";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";
import { brandThemeStyle } from "@/lib/brand-theme";
import type { BrandSettings } from "@/lib/types";

function useFilePreview(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return url;
}

function AssetTile({
  title,
  note,
  accept,
  preview,
  previewSize,
  onFile,
  onRemove,
}: {
  title: string;
  note: string;
  accept: string;
  preview: string | null;
  previewSize: number;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid min-h-32 grid-cols-[96px_1fr] border-b border-pewter last:border-b-0 sm:grid-cols-[120px_1fr_auto] sm:items-center">
      <div className="grid min-h-full place-items-center border-r border-pewter bg-mist p-4">
        {preview ? (
          <Image
            src={preview}
            alt=""
            width={previewSize}
            height={previewSize}
            unoptimized
            className="max-h-16 max-w-16 object-contain"
          />
        ) : (
          <span className="grid h-12 w-12 place-items-center border border-dashed border-stone font-display text-[11px] font-semibold text-stone">
            NONE
          </span>
        )}
      </div>
      <div className="px-4 py-5 sm:px-6">
        <p className="font-display text-[16px] font-semibold uppercase tracking-[0.03em]">{title}</p>
        <p className="mt-2 max-w-[48ch] text-[12px] leading-5 text-ash">{note}</p>
      </div>
      <div className="col-span-2 flex gap-2 border-t border-pewter px-4 py-4 sm:col-span-1 sm:border-t-0 sm:px-5">
        <label className="flex min-h-11 cursor-pointer items-center border border-ink bg-ink px-4 font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-canvas transition-colors hover:bg-accent hover:text-on-accent">
          Choose File
          <input
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
        {preview ? (
          <button
            type="button"
            onClick={onRemove}
            className="min-h-11 border border-pewter px-4 font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-ash hover:border-accent hover:text-accent"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function BrandSettings() {
  const { branding, setBranding } = useBranding();
  const [siteName, setSiteName] = useState(branding.siteName);
  const [tagline, setTagline] = useState(branding.tagline);
  const [accentColor, setAccentColor] = useState(branding.accentColor);
  const [logo, setLogo] = useState<File | null>(null);
  const [favicon, setFavicon] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeFavicon, setRemoveFavicon] = useState(false);
  const [busy, setBusy] = useState<"save" | "reset" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const logoObjectUrl = useFilePreview(logo);
  const faviconObjectUrl = useFilePreview(favicon);
  const logoPreview = logoObjectUrl || (removeLogo ? null : branding.logoUrl);
  const faviconPreview = faviconObjectUrl || (removeFavicon ? null : branding.faviconUrl);

  useEffect(() => {
    setSiteName(branding.siteName);
    setTagline(branding.tagline);
    setAccentColor(branding.accentColor);
  }, [branding]);

  const hasChanges = useMemo(() => (
    siteName !== branding.siteName
    || tagline !== branding.tagline
    || accentColor.toLowerCase() !== branding.accentColor.toLowerCase()
    || Boolean(logo)
    || Boolean(favicon)
    || removeLogo
    || removeFavicon
  ), [accentColor, branding, favicon, logo, removeFavicon, removeLogo, siteName, tagline]);

  useEffect(() => {
    function warnBeforeLeave(event: BeforeUnloadEvent) {
      if (!hasChanges) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [hasChanges]);

  async function sendSettings(reset: boolean) {
    setBusy(reset ? "reset" : "save");
    setMessage("");
    setError("");
    const form = new FormData();
    form.set("siteName", siteName);
    form.set("tagline", tagline);
    form.set("accentColor", accentColor);
    form.set("removeLogo", String(removeLogo));
    form.set("removeFavicon", String(removeFavicon));
    form.set("reset", String(reset));
    if (logo) form.set("logo", logo);
    if (favicon) form.set("favicon", favicon);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "X-Yamu-Request": "1" },
        body: form,
      });
      const data = (await response.json()) as { settings?: BrandSettings; error?: string };
      if (!response.ok || !data.settings) throw new Error(data.error || "Could not save branding settings.");
      setBranding(data.settings);
      setLogo(null);
      setFavicon(null);
      setRemoveLogo(false);
      setRemoveFavicon(false);
      setMessage(reset ? "Default Yamu branding restored." : "Branding saved and applied across the site.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save branding settings.");
    } finally {
      setBusy(null);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    await sendSettings(false);
  }

  async function reset() {
    if (!window.confirm("Restore the default Yamu name, colors, logo, and favicon?")) return;
    await sendSettings(true);
  }

  return (
    <section id="brand-settings" className="scroll-mt-24 border-b border-ink pb-12 pt-10" aria-labelledby="brand-settings-title">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,.72fr)] lg:items-start">
        <div>
          <p className="micro-label text-ash">Settings / public identity</p>
          <h2 id="brand-settings-title" className="mt-4 text-[clamp(38px,5vw,62px)] font-semibold leading-[0.94] tracking-[-0.045em]">
            Make the index yours.
          </h2>
          <p className="mt-4 max-w-[62ch] text-[13px] leading-6 text-ash">
            Update the name and color used throughout the site. Logo and favicon files stay in the same persistent data directory as the catalog.
          </p>

          <form onSubmit={save} className="mt-8 border border-ink bg-paper">
            <div className="grid border-b border-pewter sm:grid-cols-2">
              <label htmlFor="brand-site-name" className="block border-b border-pewter px-5 py-5 text-ash sm:border-b-0 sm:border-r">
                <span className="micro-label">Site Name</span>
                <input
                  id="brand-site-name"
                  name="siteName"
                  required
                  maxLength={40}
                  autoComplete="off"
                  value={siteName}
                  onChange={(event) => setSiteName(event.target.value)}
                  className="mt-3 h-12 w-full border border-ink bg-paper px-3 font-display text-[22px] font-semibold uppercase tracking-[0.02em] text-ink outline-none focus:border-accent"
                />
                <span className="mt-2 block text-[11px] text-stone">Shown in the header and browser title.</span>
              </label>
              <label htmlFor="brand-tagline" className="block px-5 py-5 text-ash">
                <span className="micro-label">Tagline</span>
                <input
                  id="brand-tagline"
                  name="tagline"
                  maxLength={100}
                  autoComplete="off"
                  value={tagline}
                  onChange={(event) => setTagline(event.target.value)}
                  placeholder="Leave empty to use the translated tagline…"
                  className="mt-3 h-12 w-full border border-ink bg-paper px-3 text-[14px] font-normal text-ink outline-none placeholder:text-stone focus:border-accent"
                />
                <span className="mt-2 block text-[11px] text-stone">A custom tagline replaces all translated defaults.</span>
              </label>
            </div>

            <div className="grid border-b border-pewter sm:grid-cols-[180px_1fr] sm:items-center">
              <div className="border-b border-pewter px-5 py-5 sm:border-b-0 sm:border-r">
                <p className="micro-label text-ash">Accent Color</p>
                <p className="mt-2 text-[11px] leading-5 text-stone">Used for actions, selection, focus, and the animated grid.</p>
              </div>
              <div className="flex items-center gap-3 px-5 py-5">
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(accentColor) ? accentColor : "#ff4f1f"}
                  onChange={(event) => setAccentColor(event.target.value)}
                  className="h-12 w-14 border border-ink bg-paper p-1"
                  aria-label="Choose accent color"
                />
                <label htmlFor="brand-accent" className="min-w-0 flex-1">
                  <span className="sr-only">Accent color hex value</span>
                  <input
                    id="brand-accent"
                    name="accentColor"
                    required
                    pattern="#[0-9a-fA-F]{6}"
                    spellCheck={false}
                    value={accentColor}
                    onChange={(event) => setAccentColor(event.target.value)}
                    className="h-12 w-full border border-ink bg-paper px-3 font-mono text-[14px] uppercase text-ink outline-none focus:border-accent"
                    aria-describedby="brand-accent-format"
                  />
                </label>
                <span id="brand-accent-format" className="hidden text-[11px] text-stone sm:block">#RRGGBB</span>
              </div>
            </div>

            <div>
              <AssetTile
                title="Header Logo"
                note="PNG, JPG, or WebP. Use a square transparent image when possible. Maximum 2 MB."
                accept="image/png,image/jpeg,image/webp"
                preview={logoPreview}
                previewSize={64}
                onFile={(file) => { setLogo(file); setRemoveLogo(false); setMessage(""); }}
                onRemove={() => { setLogo(null); setRemoveLogo(Boolean(branding.logoUrl)); setMessage(""); }}
              />
              <AssetTile
                title="Browser Favicon"
                note="PNG or ICO. A 32 × 32 or 64 × 64 square image works best. Maximum 512 KB."
                accept="image/png,image/x-icon,image/vnd.microsoft.icon,.ico"
                preview={faviconPreview}
                previewSize={32}
                onFile={(file) => { setFavicon(file); setRemoveFavicon(false); setMessage(""); }}
                onRemove={() => { setFavicon(null); setRemoveFavicon(Boolean(branding.faviconUrl)); setMessage(""); }}
              />
            </div>

            <div className="flex flex-col gap-4 border-t border-ink px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-5" aria-live="polite">
                {message ? <p role="status" className="text-[12px] text-success">{message}</p> : null}
                {error ? <p role="alert" className="text-[12px] text-accent">{error}</p> : null}
                {!message && !error && hasChanges ? <p className="text-[12px] text-ash">Unsaved changes</p> : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void reset()}
                  className="min-h-11 border border-pewter px-4 font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-ash hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {busy === "reset" ? "Restoring…" : "Restore Defaults"}
                </button>
                <button
                  type="submit"
                  disabled={busy !== null || !hasChanges}
                  className="min-h-11 bg-accent px-5 font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-on-accent hover:bg-[var(--index-accent-dark)] disabled:opacity-40"
                >
                  {busy === "save" ? "Saving…" : "Save Branding →"}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="lg:sticky lg:top-28">
          <p className="micro-label mb-3 text-ash">Live specimen / preview</p>
          <div style={brandThemeStyle(accentColor)}>
              <DepthCard maxRotation={1.8} maxTranslation={2} spotlightColor="color-mix(in srgb, var(--index-accent) 24%, transparent)">
                <SpotlightCard className="border border-ink bg-paper" spotlightColor="color-mix(in srgb, var(--index-accent) 10%, transparent)">
                  <div className="h-2 bg-accent" />
                  <div className="flex min-h-20 items-center gap-4 border-b border-ink px-5 py-4">
                    {logoPreview ? (
                      <Image src={logoPreview} alt="" width={44} height={44} unoptimized className="h-11 w-11 border border-pewter object-contain" />
                    ) : (
                      <span className="grid h-11 w-11 place-items-center border border-ink font-display text-[11px] font-semibold">001</span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-display text-[24px] font-bold uppercase leading-none">{siteName || "UNTITLED"}</p>
                      <p className="mt-2 truncate font-script text-[10px] text-ash">{tagline || "ယၟု / Mon / Burmese / English"}</p>
                    </div>
                  </div>
                  <div className="grid min-h-[260px] grid-cols-[72px_1fr]">
                    <div className="border-r border-ink bg-ink px-4 py-5 text-canvas">
                      <p className="font-display text-[28px] font-semibold">01</p>
                    </div>
                    <div className="flex flex-col justify-between px-5 py-6">
                      <div>
                        <p className="micro-label text-ash">Brand check</p>
                        <p className="mt-5 text-balance text-[34px] font-semibold leading-[0.98] tracking-[-0.04em]">Your public identity, in context.</p>
                      </div>
                      <button type="button" className="min-h-11 self-start bg-accent px-5 font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-on-accent">
                        Primary Action →
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-ink px-5 py-4">
                    <span className="micro-label text-ash">Favicon</span>
                    {faviconPreview ? (
                      <Image src={faviconPreview} alt="" width={24} height={24} unoptimized className="h-6 w-6 object-contain" />
                    ) : (
                      <span className="grid h-6 w-6 place-items-center border border-dashed border-stone font-display text-[8px] text-stone">N/A</span>
                    )}
                  </div>
                </SpotlightCard>
              </DepthCard>
          </div>
          <p className="mt-4 text-[11px] leading-5 text-stone">Preview motion is disabled on touch devices and when reduced motion is enabled.</p>
        </div>
      </div>
    </section>
  );
}
