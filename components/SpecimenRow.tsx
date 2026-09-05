"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronRight, Copy, Download, X } from "lucide-react";
import { useBranding } from "@/components/BrandingProvider";
import { t, translate } from "@/lib/i18n";
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

function loadCanvasImage(url: string, errorMessage: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(errorMessage));
    image.src = url;
  });
}

async function renderPng(
  row: NameRecord,
  selected: SelectedSpellings,
  specimenNumber: number,
  branding: BrandSettings,
  lang: UiLanguage,
) {
  const tr = (message: string, variables?: Record<string, string | number>) => translate(lang, message, variables);
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = 1800;
  canvas.height = 1080;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(tr("Canvas is not available."));

  const displayFont = canvasFont("--index-font-display", "Arial Narrow, sans-serif");
  const sansFont = canvasFont("--index-font-sans", "Arial, sans-serif");
  const monFont = canvasFont("--font-z20-khit-haungg", '"Z20 KhitHaungg", sans-serif');
  const burmeseFont = canvasFont("--font-z11-myan-sans", '"Z11 MyanSans", sans-serif');
  const columns = [
    { label: tr("Mon").toUpperCase(), value: selected.mon || tr("Not mapped").toUpperCase(), family: selected.mon ? monFont : sansFont },
    { label: tr("Burmese").toUpperCase(), value: selected.burmese || tr("Not mapped").toUpperCase(), family: selected.burmese ? burmeseFont : sansFont },
    { label: tr("English").toUpperCase(), value: selected.english || tr("Not mapped").toUpperCase(), family: sansFont },
  ];

  context.fillStyle = "#fafaf6";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = branding.accentColor;
  context.fillRect(0, 0, canvas.width, 24);

  let brandTextX = 88;
  if (branding.logoUrl) {
    const logo = await loadCanvasImage(branding.logoUrl, tr("Could not load the brand logo."));
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
  context.font = `${branding.tagline ? 500 : 700} ${branding.tagline ? 22 : 28}px ${branding.tagline ? sansFont : monFont}`;
  context.fillStyle = "#6f6c64";
  context.fillText(branding.tagline || tr("ယၟု / Mon / Burmese / English").toUpperCase(), brandTextX, 158);

  context.textAlign = "right";
  context.font = `600 22px ${displayFont}`;
  context.fillStyle = "#11100e";
  context.fillText(tr("Specimen {number}", { number: String(specimenNumber).padStart(3, "0") }).toUpperCase(), 1712, 112);
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
    context.fillText(tr("Selected spelling").toUpperCase(), x + 86, 815);
  });

  context.fillStyle = "#11100e";
  context.font = `600 21px ${displayFont}`;
  context.fillText(tr("Note").toUpperCase(), 88, 946);
  context.font = `400 22px ${sansFont}`;
  context.fillStyle = "#6f6c64";
  context.fillText(row.notes || tr("Catalog entry"), 168, 946);
  if (row.credit) {
    context.font = `600 17px ${displayFont}`;
    context.fillStyle = branding.accentColor;
    context.fillText(tr("Contributed by {name}", { name: row.credit }).toUpperCase(), 88, 994);
  }
  context.textAlign = "right";
  context.fillText(`${branding.siteName.toUpperCase()} · ${tr("Trilingual proof").toUpperCase()}`, 1712, 946);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error(tr("Could not render PNG.")));
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
  const tr = (message: string, variables?: Record<string, string | number>) => translate(lang, message, variables);
  const [selected, setSelected] = useState<SelectedSpellings>({
    mon: row.monVariants[0] ?? row.mon,
    burmese: row.burmeseVariants[0] ?? row.burmese,
    english: row.englishVariants[0] ?? row.english,
  });
  const [copied, setCopied] = useState<Language | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheet = useRef<HTMLDialogElement>(null);
  const detailId = useId();
  useEffect(() => {
    if (!sheetOpen) return;
    const dialog = sheet.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
    };
  }, [sheetOpen]);
  function openDetails() {
    if (window.matchMedia("(max-width: 767px)").matches) setSheetOpen(true);
    else setExpanded((value) => !value);
  }

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
    try { await navigator.clipboard.writeText(selected[key]); }
    catch { setExportError(tr("Could not copy. Please select and copy the spelling manually.")); return; }
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1200);
  }

  async function exportName() {
    setExporting(true);
    setExportError("");
    try {
      await renderPng(row, selected, index, branding, lang);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : tr("Could not export PNG."));
    } finally {
      setExporting(false);
    }
  }

  // Adapted from licensed React Bits Pro list-7 and data-table-4:
  // aligned column grids, disclosure controls, and contextual row details.
  const details = (
    <div className="name-details">
      <div className="name-variants">
        {cells.map((cell) => (
          <fieldset key={cell.key}>
            <legend className={cell.script ? "font-script" : ""}>{cell.label} · {copy.choose}</legend>
            <div className="name-choices">
              {cell.variants.map((variant) => (
                <button key={variant} type="button" aria-pressed={selected[cell.key] === variant}
                  onClick={() => setSelected((current) => ({ ...current, [cell.key]: variant }))}
                  lang={cell.key === "mon" ? "mnw" : cell.key === "burmese" ? "my" : "en"}
                  className={cell.script ? "font-script" : ""}>{variant}</button>
              ))}
              {!cell.variants.length ? <span>{copy.notMapped}</span> : null}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="name-detail-footer">
        <div><p>{copy.notes}: {row.notes || "—"}</p>{row.credit ? <p className="mt-1 text-stone">{tr("Contributed by {name}", { name: row.credit })}</p> : null}</div>
        <button type="button" disabled={exporting} onClick={() => void exportName()} className="name-export">
          <Download size={16} aria-hidden />{exporting ? copy.exporting : copy.export}
        </button>
      </div>
    </div>
  );
  return (
    <article className={`name-entry ${expanded || sheetOpen ? "name-entry-selected" : ""}`}>
      <div className="name-row">
        <span className="name-number">{String(index).padStart(2, "0")}</span>
        {cells.map((cell) => (
          <div key={cell.key} className="name-cell" lang={cell.key === "mon" ? "mnw" : cell.key === "burmese" ? "my" : "en"}>
            <span className="name-mobile-label">{cell.label}</span>
            <span className={`name-spelling ${cell.script ? "font-script" : ""}`}>{selected[cell.key] || "—"}</span>
            <button type="button" disabled={!selected[cell.key]} onClick={() => void copyValue(cell.key)}
              className="name-copy" aria-label={`${copy.copy} ${cell.label}: ${selected[cell.key]}`}>
              {copied === cell.key ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
            </button>
          </div>
        ))}
        <button type="button" className="name-disclosure" onClick={openDetails}
          aria-expanded={expanded || sheetOpen} aria-controls={expanded ? detailId : undefined}
          aria-label={`${copy.choose} · ${selected.english || selected.mon}`}>
          <span>{copy.choose}</span><ChevronRight size={16} aria-hidden className={expanded ? "rotate-90" : ""} />
        </button>
      </div>
      {expanded ? <div id={detailId} className="name-desktop-details">{details}</div> : null}
      {sheetOpen ? <dialog ref={sheet} className="name-sheet" aria-labelledby={`${detailId}-sheet-title`}
        onCancel={() => setSheetOpen(false)} onClose={() => setSheetOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientY < rect.top) setSheetOpen(false); } }}>
        <div className="name-sheet-header">
          <h2 id={`${detailId}-sheet-title`} className="font-script">{selected.mon} <span className="font-display">/ {selected.english}</span></h2>
          <button type="button" autoFocus onClick={() => setSheetOpen(false)} aria-label={tr("Close")}><X size={20} /></button>
        </div>
        {details}
        {exportError ? <p role="alert" className="px-4 py-3 text-sm text-accent">{exportError}</p> : null}
      </dialog> : null}
      <span className="sr-only" role="status">{copied ? copy.copied : ""}</span>
      {exportError && !sheetOpen ? <p role="alert" className="px-4 py-3 text-sm text-accent">{exportError}</p> : null}
    </article>
  );
}
