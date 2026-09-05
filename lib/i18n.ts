import { PO_CATALOGS } from "@/lib/locales.generated";
import type { UiLanguage } from "@/lib/types";

const LOCALE_BY_LANGUAGE = {
  english: "en",
  mon: "mnw",
  burmese: "my",
} as const;

type Variables = Record<string, string | number>;

export function translate(lang: UiLanguage, message: string, variables?: Variables) {
  const locale = LOCALE_BY_LANGUAGE[lang];
  const catalog = PO_CATALOGS[locale] as Record<string, string>;
  const english = PO_CATALOGS.en as Record<string, string>;
  const translated = catalog[message] || english[message] || message;
  if (!variables) return translated;
  return translated.replace(/\{([a-zA-Z0-9_]+)\}/gu, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : match,
  );
}

export function t(lang: UiLanguage) {
  const tr = (message: string, variables?: Variables) => translate(lang, message, variables);
  return {
    wordmark: tr("YAMU"),
    tagline: tr("ယၟု / Mon / Burmese / English"),
    lookup: tr("Look up a name"),
    kicker: tr("Trilingual name lookup — Mon / Burmese / English"),
    headline: tr("Find a name across three scripts."),
    hint: tr("Search the catalog, compare every written form, then choose the spelling you want to keep."),
    placeholder: tr("Aung, အောင်, or အံၚ်"),
    search: tr("Look up"),
    source: tr("Source"),
    auto: tr("Auto"),
    mon: tr("Mon"),
    burmese: tr("Burmese"),
    english: tr("English"),
    empty: tr("The catalog is ready. Enter a name to see its three forms."),
    none: tr("No catalog row matches that spelling."),
    matches: tr("catalog rows"),
    copy: tr("Copy"),
    copied: tr("Copied"),
    notMapped: tr("Not mapped yet"),
    admin: tr("Admin"),
    notes: tr("Note"),
    choose: tr("Choose spelling"),
    export: tr("Export PNG"),
    exporting: tr("Preparing PNG…"),
    selected: tr("Selected spelling"),
    tryName: tr("Try a sample name"),
    composed: tr("Full name composed in order"),
    missingTitle: tr("A word is missing from the index."),
    missingQuestion: tr("Finished spelling? If this word is really missing, you can send it for review."),
    missingHint: tr("Send the missing spelling to the catalog desk. An admin will verify its Mon, Burmese, and English forms before it becomes searchable."),
    missingWords: tr("Missing from this full name"),
    suggestWord: tr("Add this word"),
    cancelSuggestion: tr("Back"),
    suggestionLabel: tr("Word or name"),
    suggestionSource: tr("Written in"),
    suggestionNote: tr("Helpful context (optional)"),
    suggestionNotePlaceholder: tr("Pronunciation, alternate spelling, or where you saw it…"),
    sendSuggestion: tr("Send for review"),
    sendingSuggestion: tr("Sending…"),
    suggestionSent: tr("Received. The catalog desk will review it."),
  };
}
