"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ArrowRight } from "lucide-react";
import { NameSearchHeader } from "@/components/NameSearchHeader";
import { SiteHeader } from "@/components/SiteHeader";
import { SpecimenRow } from "@/components/SpecimenRow";
import { SuggestionCard } from "@/components/SuggestionCard";
import { t } from "@/lib/i18n";
import { detectSource } from "@/lib/script";
import type { NameRecord, SearchResultSet, SourceLanguage, UiLanguage } from "@/lib/types";

const SOURCES: SourceLanguage[] = ["auto", "mon", "burmese", "english"];
const SAMPLES = ["Aung", "နိုင်", "မိ"];

function specimenResultKey(row: NameRecord) {
  if (!row.composed) return `catalog:${row.id}`;
  return `composed:${JSON.stringify([
    row.monVariants,
    row.burmeseVariants,
    row.englishVariants,
  ])}`;
}

export function Converter() {
  const [lang, setLang] = useState<UiLanguage>("english");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceLanguage>("auto");
  const [results, setResults] = useState<NameRecord[] | null>(null);
  const [searchMeta, setSearchMeta] = useState<Omit<SearchResultSet, "results">>({
    mode: "single",
    tokens: [],
    missingTokens: [],
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const lookupVersion = useRef(0);
  const lookupAbort = useRef<AbortController | null>(null);
  const copy = t(lang);
  const usesMyanmarScript = lang !== "english";
  const queryUsesMyanmarScript = /[\u1000-\u109f\uaa60-\uaa7f]/u.test(query);
  const uiLang = lang === "mon" ? "mnw" : lang === "burmese" ? "my" : "en";

  useEffect(() => {
    const stored = window.localStorage.getItem("ui-lang");
    if (stored === "mon" || stored === "burmese" || stored === "english") {
      setLang(stored);
    }
  }, []);

  function changeLang(next: UiLanguage) {
    setLang(next);
    window.localStorage.setItem("ui-lang", next);
  }

  async function lookup(nextQuery = query, nextSource = source) {
    const value = nextQuery.trim();
    const requestVersion = ++lookupVersion.current;
    lookupAbort.current?.abort();
    if (!value) {
      setResults(null);
      setSearchMeta({ mode: "single", tokens: [], missingTokens: [] });
      setError("");
      setPending(false);
      return;
    }

    const controller = new AbortController();
    lookupAbort.current = controller;
    setPending(true);
    setError("");
    try {
      const params = new URLSearchParams({ q: value, source: nextSource });
      const response = await fetch(`/api/search?${params}`, { signal: controller.signal });
      const data = (await response.json()) as SearchResultSet & { error?: string };
      if (!response.ok) throw new Error(data.error || "Search is temporarily unavailable.");
      if (requestVersion !== lookupVersion.current) return;
      setResults(data.results);
      setSearchMeta({ mode: data.mode, tokens: data.tokens, missingTokens: data.missingTokens });
      if (data.results.length) setSuggesting(false);
    } catch (lookupError) {
      if (lookupError instanceof DOMException && lookupError.name === "AbortError") return;
      if (requestVersion !== lookupVersion.current) return;
      setResults([]);
      setSearchMeta({ mode: "single", tokens: [], missingTokens: [] });
      setError(lookupError instanceof Error ? lookupError.message : "Search failed.");
    } finally {
      if (requestVersion === lookupVersion.current) setPending(false);
    }
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void lookup(query, source);
    }, 220);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, source]);

  useEffect(() => () => {
    lookupVersion.current += 1;
    lookupAbort.current?.abort();
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void lookup();
  }

  function trySample(sample: string) {
    setSuggesting(false);
    setQuery(sample);
    setSource("auto");
    void lookup(sample, "auto");
  }

  const status = useMemo(() => {
    if (pending) return "INDEXING…";
    if (results === null) return copy.empty;
    if (!results.length) return copy.none;
    return `${String(results.length).padStart(2, "0")} ${copy.matches}`;
  }, [copy.empty, copy.matches, copy.none, pending, results]);

  const suggestionSource = source === "auto"
    ? detectSource(searchMeta.missingTokens[0] ?? query) === "burmese" && lang === "mon"
      ? "mon"
      : detectSource(searchMeta.missingTokens[0] ?? query)
    : source;

  return (
    <div className="min-h-screen">
      <div className="hidden md:block"><SiteHeader lang={lang} onLang={changeLang} /></div>
      <NameSearchHeader lang={lang} onLang={changeLang} />

      <main className="index-shell name-index">
        <section aria-labelledby="lookup-heading" className="name-search-area">
          <div className="name-search-title">
            <h1 id="lookup-heading" lang={uiLang} className={usesMyanmarScript ? "font-script" : ""}>{lang === "english" ? "Find a name." : copy.lookup}</h1>
            <p lang={uiLang}>{copy.tagline}</p>
          </div>
          <form onSubmit={onSubmit} role="search">
            <label htmlFor="name-query" className="sr-only">{copy.lookup}</label>
            <div className="name-search-input">
              <Search size={20} aria-hidden />
              <input id="name-query" name="name" type="search" enterKeyHint="search"
                value={query} maxLength={200} autoComplete="off" spellCheck={false}
                onChange={(event) => { setSuggesting(false); setQuery(event.target.value); }}
                placeholder={copy.placeholder} className={queryUsesMyanmarScript ? "font-script" : ""} />
              {query ? <button type="button" className="name-clear" aria-label="Clear search"
                onClick={() => { setQuery(""); setSuggesting(false); document.getElementById("name-query")?.focus(); }}><X size={18} /></button> : null}
              <button type="submit" disabled={pending} className="name-submit" aria-label={copy.search}>
                <span>{pending ? "…" : copy.search}</span><ArrowRight size={22} aria-hidden />
              </button>
            </div>
            <div className="name-search-options">
              <fieldset className="name-source"><legend className="sr-only">{copy.source}</legend>
                {SOURCES.map((item) => <button key={item} type="button" aria-pressed={source === item}
                  onClick={() => { setSource(item); setSuggesting(false); }}
                  className={usesMyanmarScript ? "font-script" : ""}>
                  {item === "auto" ? copy.auto : copy[item]}
                </button>)}
              </fieldset>
              <div className="name-samples"><span>{copy.tryName}</span>{SAMPLES.map((sample) =>
                <button type="button" key={sample} onClick={() => trySample(sample)} className={sample === "Aung" ? "" : "font-script"}>{sample}</button>)}</div>
            </div>
          </form>
        </section>

        <section className="name-results" aria-busy={pending}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <p role="status" lang={uiLang} className={`text-ash ${usesMyanmarScript ? "font-script text-[12px]" : "micro-label"}`}>{status}</p>
            {results?.length ? (
              <p className="hidden text-[11px] uppercase tracking-[0.08em] text-stone sm:block">
                Searched “{query.trim()}”
              </p>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="border border-accent px-4 py-3 text-[13px] text-accent">
              {error}
            </p>
          ) : null}

          <div className="name-results-list">
            {results?.length ? <div className="name-column-head" aria-hidden><span>#</span><span>{copy.mon}</span><span>{copy.burmese}</span><span>{copy.english}</span><span>{copy.choose}</span></div> : null}
            {searchMeta.mode === "composed" && results?.length ? (
              <div className="grid border border-ink bg-ink text-canvas sm:grid-cols-[110px_1fr_auto] sm:items-center">
                <p className="border-b border-canvas/20 px-4 py-4 font-display text-[28px] font-semibold sm:border-b-0 sm:border-r">
                  {String(searchMeta.tokens.length).padStart(2, "0")}
                </p>
                <div className="border-b border-canvas/20 px-4 py-4 sm:border-b-0">
                  <p lang={uiLang} className={usesMyanmarScript ? "font-script text-[13px]" : "micro-label text-canvas/60"}>{copy.composed}</p>
                  <p className={`mt-2 text-[15px] ${queryUsesMyanmarScript ? "font-script" : ""}`}>{searchMeta.tokens.join(" + ")}</p>
                </div>
                <p className="px-4 py-4 text-[11px] uppercase tracking-[0.08em] text-canvas/60">Order preserved</p>
              </div>
            ) : null}
            {results?.map((row, index) => (
              <SpecimenRow key={specimenResultKey(row)} row={row} lang={lang} index={index + 1} />
            ))}
            {!pending && results?.length === 0 && query.trim() ? suggesting ? (
              <SuggestionCard
                key={`${query}-${searchMeta.missingTokens.join("|")}`}
                query={query}
                missingTokens={searchMeta.missingTokens}
                initialSource={suggestionSource}
                lang={lang}
                onCancel={() => setSuggesting(false)}
              />
            ) : (
              <div className="grid border border-ink bg-paper sm:grid-cols-[104px_minmax(0,1fr)_auto] sm:items-stretch">
                <div className="flex items-center justify-between bg-ink px-5 py-4 text-canvas sm:block sm:px-4 sm:py-5">
                  <p className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-canvas/55">No match</p>
                  <p className="font-display text-[30px] font-semibold leading-none text-accent sm:mt-3">00</p>
                </div>
                <div className="border-b border-ink px-5 py-5 sm:border-b-0 sm:border-r sm:px-6">
                  <p lang={uiLang} className={`max-w-[62ch] text-ink ${usesMyanmarScript ? "font-script text-[16px] leading-[1.7]" : "text-[15px] font-medium leading-6"}`}>{copy.missingQuestion}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSuggesting(true)}
                  className={`group flex min-h-14 items-center justify-between gap-5 bg-paper px-5 text-left text-ink transition-colors hover:bg-accent hover:text-on-accent sm:min-w-[190px] ${usesMyanmarScript ? "font-script text-[14px]" : "font-display text-[12px] font-semibold uppercase tracking-[0.06em]"}`}
                >
                  <span lang={uiLang}>{copy.suggestWord}</span>
                  <span className="text-[20px] transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
