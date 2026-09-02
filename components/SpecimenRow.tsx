"use client";

import { useState } from "react";
import { useBranding } from "@/components/BrandingProvider";
import { FitText } from "@/components/FitText";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";
import { ShinyText } from "@/components/reactbits/ShinyText";
import { t } from "@/lib/i18n";
import type { BrandSettings, Language, NameRecord, UiLanguage } from "@/lib/types";

type Props = {
  row: NameRecord;
  lang: UiLanguage;
  index: number;
};

type SelectedSpellings = Record<Language, string>;

function canvasFont(variable: string, fallback: string) {
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return resolved || fallback;
}

function fitText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxSize: number,
  family: string,
  weight = 700,
  minSize = 1,
) {
  context.font = `${weight} ${maxSize}px ${family}`;
  const naturalWidth = context.measureText(value).width;
  if (!naturalWidth) return maxSize;

  return Math.max(minSize, Math.min(maxSize, maxSize * (maxWidth / naturalWidth)));
}

function loadCanvasImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the brand logo."));
    image.src = url;
  });
}

async function renderPng(
  row: NameRecord,
  selected: SelectedSpellings,
  specimenNumber: number,
  branding: BrandSettings,
) {
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = 1800;
  canvas.height = 1080;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available.");

  const displayFont = canvasFont("--index-font-display", "Arial Narrow, sans-serif");
  const sansFont = canvasFont("--index-font-sans", "Arial, sans-serif");
  const scriptFont = canvasFont("--font-z20-khit-haungg", '"Z20 KhitHaungg", sans-serif');
  const columns = [
    { label: "MON", value: selected.mon || "NOT MAPPED", family: selected.mon ? scriptFont : sansFont },
    { label: "BURMESE", value: selected.burmese || "NOT MAPPED", family: selected.burmese ? scriptFont : sansFont },
    { label: "ENGLISH", value: selected.english || "NOT MAPPED", family: sansFont },
  ];

  context.fillStyle = "#fafaf6";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = branding.accentColor;
  context.fillRect(0, 0, canvas.width, 24);

  let brandTextX = 88;
  if (branding.logoUrl) {
    const logo = await loadCanvasImage(branding.logoUrl);
    const ratio = Math.min(64 / logo.naturalWidth, 64 / logo.naturalHeight);
    const logoWidth = logo.naturalWidth * ratio;
    const logoHeight = logo.naturalHeight * ratio;
    context.drawImage(logo, 88 + (64 - logoWidth) / 2, 60 + (64 - logoHeight) / 2, logoWidth, logoHeight);
    brandTextX = 176;
  }

  context.fillStyle = "#11100e";
  const brandSize = fitText(context, branding.siteName.toUpperCase(), 920, 52, displayFont, 700, 24);
  context.font = `700 ${brandSize}px ${displayFont}`;
  context.fillText(branding.siteName.toUpperCase(), brandTextX, 112);
  context.font = `${branding.tagline ? 500 : 700} ${branding.tagline ? 22 : 28}px ${branding.tagline ? sansFont : scriptFont}`;
  context.fillStyle = "#6f6c64";
  context.fillText(branding.tagline || "ယၟု / MON / BURMESE / ENGLISH", brandTextX, 158);

  context.textAlign = "right";
  context.font = `600 22px ${displayFont}`;
  context.fillStyle = "#11100e";
  context.fillText(`SPECIMEN ${String(specimenNumber).padStart(3, "0")}`, 1712, 112);
  context.textAlign = "left";

  context.strokeStyle = "#11100e";
  context.lineWidth = 2;
  context.strokeRect(88, 220, 1624, 650);

  columns.forEach((column, index) => {
    const x = 88 + index * (1624 / 3);
    const width = 1624 / 3;
    if (index > 0) {
      context.beginPath();
      context.moveTo(x, 220);
      context.lineTo(x, 870);
      context.stroke();
    }

    context.fillStyle = "#6f6c64";
    context.font = `600 22px ${displayFont}`;
    context.fillText(`0${index + 1} / ${column.label}`, x + 42, 282);

    const fontSize = fitText(context, column.value, width - 84, 138, column.family);
    context.fillStyle = "#11100e";
    context.font = `700 ${fontSize}px ${column.family}`;
    context.textBaseline = "middle";
    context.fillText(column.value, x + 42, 535);
    context.textBaseline = "alphabetic";

    context.fillStyle = branding.accentColor;
    context.fillRect(x + 42, 805, 30, 5);
    context.fillStyle = "#6f6c64";
    context.font = `500 18px ${sansFont}`;
    context.fillText("SELECTED SPELLING", x + 86, 815);
  });

  context.fillStyle = "#11100e";
  context.font = `600 21px ${displayFont}`;
  context.fillText("NOTE", 88, 946);
  context.font = `400 22px ${sansFont}`;
  context.fillStyle = "#6f6c64";
  context.fillText(row.notes || "Catalog entry", 168, 946);
  if (row.credit) {
    context.font = `600 17px ${displayFont}`;
    context.fillStyle = branding.accentColor;
    context.fillText(`CONTRIBUTED BY ${row.credit.toUpperCase()}`, 88, 994);
  }
  context.textAlign = "right";
  context.fillText(`${branding.siteName.toUpperCase()} · TRILINGUAL PROOF`, 1712, 946);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error("Could not render PNG."));
    }, "image/png");
  });

  const link = document.createElement("a");
  const filename = selected.english.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `name-${row.id}`;
  link.href = URL.createObjectURL(blob);
  const brandSlug = branding.siteName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "name-index";
  link.download = `${filename}-${brandSlug}.png`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export function SpecimenRow({ row, lang, index }: Props) {
  const { branding } = useBranding();
  const copy = t(lang);
  const usesMyanmarScript = lang !== "english";
  const uiLang = lang === "mon" ? "mnw" : lang === "burmese" ? "my" : "en";
  const [selected, setSelected] = useState<SelectedSpellings>({
    mon: row.monVariants[0] ?? row.mon,
    burmese: row.burmeseVariants[0] ?? row.burmese,
    english: row.englishVariants[0] ?? row.english,
  });
  const [copied, setCopied] = useState<Language | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const cells: Array<{
    key: Language;
    label: string;
    variants: string[];
    script: boolean;
  }> = [
    { key: "mon", label: copy.mon, variants: row.monVariants, script: true },
    { key: "burmese", label: copy.burmese, variants: row.burmeseVariants, script: true },
    { key: "english", label: copy.english, variants: row.englishVariants, script: false },
  ];

  async function copyValue(key: Language) {
    await navigator.clipboard.writeText(selected[key]);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1200);
  }

  async function exportName() {
    setExporting(true);
    setExportError("");
    try {
      await renderPng(row, selected, index, branding);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Could not export PNG.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <SpotlightCard className="result-enter border border-ink bg-paper" spotlightColor="color-mix(in srgb, var(--index-accent) 9%, transparent)">
      <div className="flex items-center justify-between border-b border-pewter px-4 py-3 sm:px-5">
        <p className="micro-label text-ash">
          Specimen {String(index).padStart(2, "0")}
        </p>
        <p lang={uiLang} className={`text-[11px] text-stone ${usesMyanmarScript ? "font-script" : "uppercase tracking-[0.08em]"}`}>{copy.selected}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3">
        {cells.map((cell, cellIndex) => (
          <section
            key={cell.key}
            lang={cell.key === "mon" ? "mnw" : cell.key === "burmese" ? "my" : "en"}
            aria-labelledby={`${row.id}-${cell.key}-label`}
            className={`relative min-w-0 px-5 py-6 md:min-h-[360px] md:px-7 md:py-7 ${
              cellIndex > 0 ? "border-t border-pewter md:border-l md:border-t-0" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <p
                id={`${row.id}-${cell.key}-label`}
                className={`text-ash ${usesMyanmarScript || cell.script ? "font-script text-[12px] normal-case tracking-normal" : "micro-label"}`}
              >
                0{cellIndex + 1} / {cell.label}
              </p>
              {selected[cell.key] ? (
                <button
                  type="button"
                  onClick={() => void copyValue(cell.key)}
                  lang={uiLang}
                  className={`min-h-9 border-b border-ink px-1 text-ink transition-colors hover:border-accent hover:text-accent ${usesMyanmarScript ? "font-script text-[12px]" : "micro-label"}`}
                >
                  {copied === cell.key ? <ShinyText>{copy.copied}</ShinyText> : copy.copy}
                </button>
              ) : (
                <span lang={uiLang} className={`text-stone ${usesMyanmarScript ? "font-script text-[11px]" : "micro-label"}`}>
                  {copy.notMapped}
                </span>
              )}
            </div>

            <FitText
              value={selected[cell.key] || "—"}
              containerClassName="mt-7 flex min-h-[118px] items-center"
              className={`font-bold text-ink ${
                cell.script
                  ? "font-script-display text-[clamp(46px,5.4vw,74px)]"
                  : "text-[clamp(48px,6vw,82px)] leading-[1.08] tracking-[-0.04em]"
              }`}
            />

            {cell.variants.length > 1 ? (
              <fieldset className="mt-8">
                <legend lang={uiLang} className={`text-stone ${usesMyanmarScript ? "font-script text-[12px]" : "micro-label"}`}>{copy.choose}</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cell.variants.map((variant) => (
                    <button
                      key={variant}
                      type="button"
                      aria-pressed={selected[cell.key] === variant}
                      onClick={() => setSelected((current) => ({ ...current, [cell.key]: variant }))}
                      lang={cell.key === "mon" ? "mnw" : cell.key === "burmese" ? "my" : "en"}
                      className={`min-h-10 border px-3 text-[14px] transition-colors ${cell.script ? "font-script" : ""} ${
                        selected[cell.key] === variant
                          ? "border-accent bg-accent text-on-accent"
                          : "border-pewter bg-paper text-ink hover:border-ink"
                      }`}
                    >
                      {variant}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : selected[cell.key] ? (
              <div className="mt-10 flex items-center gap-3 text-[11px] uppercase tracking-[0.08em] text-stone">
                <span className="h-1 w-8 bg-accent" aria-hidden="true" />
                One catalog spelling
              </div>
            ) : (
              <div lang={uiLang} className={`mt-10 flex items-center gap-3 text-stone ${usesMyanmarScript ? "font-script text-[11px]" : "micro-label"}`}>
                <span className="h-1 w-8 bg-pewter" aria-hidden="true" />
                {copy.notMapped}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="flex flex-col gap-4 border-t border-pewter px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] text-ash"><span lang={uiLang} className={`mr-3 text-ink ${usesMyanmarScript ? "font-script font-bold" : "micro-label"}`}>{copy.notes}</span>{row.notes || "—"}</p>
          {row.credit ? <p className="mt-2 font-display text-[10px] font-semibold uppercase tracking-[0.08em] text-accent">Contributed by {row.credit}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => void exportName()}
          disabled={exporting}
          lang={uiLang}
          className={`min-h-11 shrink-0 border border-ink bg-ink px-5 text-[12px] font-semibold text-canvas transition-colors hover:border-accent hover:bg-accent hover:text-on-accent disabled:opacity-50 ${usesMyanmarScript ? "font-script" : "font-display uppercase tracking-[0.06em]"}`}
        >
          {exporting ? copy.exporting : `${copy.export} ↓`}
        </button>
      </div>
      {exportError ? <p role="alert" className="border-t border-accent px-5 py-3 text-[12px] text-accent">{exportError}</p> : null}
    </SpotlightCard>
  );
}
