"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
      <SiteHeader lang={lang} onLang={changeLang} />

      <main className="index-shell pb-20 pt-10 md:pt-14">
        <section aria-labelledby="lookup-heading">
          <p lang={uiLang} className={`flex items-center gap-3 text-ash ${usesMyanmarScript ? "font-script text-[12px]" : "micro-label"}`}>
            <span className="h-px w-12 bg-ink" aria-hidden="true" />
            {copy.kicker}
          </p>

          <div className="mt-8 grid gap-8 border-b border-pewter pb-10 md:grid-cols-[minmax(0,1.5fr)_minmax(260px,.6fr)] md:items-end">
            <h1
              id="lookup-heading"
              lang={uiLang}
              className={`text-balance font-semibold text-ink ${
                usesMyanmarScript
                  ? "font-script-display max-w-[18ch] text-[clamp(40px,5.4vw,70px)]"
                  : "max-w-[15ch] text-[clamp(46px,7.2vw,92px)] leading-[0.96] tracking-[-0.055em]"
              }`}
            >
              {copy.headline}
            </h1>
            <p lang={uiLang} className={`max-w-[38ch] text-pretty text-[15px] text-ash md:justify-self-end md:pb-2 ${usesMyanmarScript ? "font-script leading-[1.8]" : "leading-7"}`}>
              {copy.hint}
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-8" role="search">
            <label htmlFor="name-query" lang={uiLang} className={`text-ink ${usesMyanmarScript ? "font-script text-[13px] font-bold" : "micro-label"}`}>
              {copy.lookup}
            </label>
            <div className="mt-3 flex min-h-[76px] border border-ink bg-paper focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
              <input
                id="name-query"
                name="name"
                lang={usesMyanmarScript ? uiLang : queryUsesMyanmarScript ? "my" : "en"}
                value={query}
                maxLength={200}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.placeholder}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className={`min-w-0 flex-1 bg-transparent px-5 text-[clamp(25px,3vw,42px)] font-medium text-ink outline-none placeholder:text-stone md:px-7 ${
                  usesMyanmarScript || queryUsesMyanmarScript
                    ? "font-script leading-[1.55] tracking-normal"
                    : "tracking-[-0.025em]"
                }`}
              />
              <button
                type="submit"
                disabled={pending}
                className="group min-w-[88px] border-l border-ink bg-accent px-5 font-display text-[15px] font-semibold uppercase tracking-[0.05em] text-on-accent transition-colors duration-150 hover:bg-[var(--index-accent-dark)] disabled:opacity-60 sm:min-w-[160px]"
              >
                <span lang={uiLang} className={`hidden sm:inline ${usesMyanmarScript ? "font-script text-[15px] normal-case tracking-normal" : ""}`}>{pending ? "…" : copy.search}</span>
                <span className="text-[26px] transition-transform duration-150 group-hover:translate-x-1 sm:hidden" aria-hidden="true">→</span>
              </button>
            </div>

            <div className="mt-4 flex flex-col justify-between gap-4 border-b border-pewter pb-6 sm:flex-row sm:items-end">
              <fieldset>
                <legend lang={uiLang} className={`text-ash ${usesMyanmarScript ? "font-script text-[12px] font-bold" : "micro-label"}`}>{copy.source}</legend>
                <div className="mt-2 flex flex-wrap border border-pewter bg-paper">
                  {SOURCES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSource(item)}
                      aria-pressed={source === item}
                      className={`min-h-10 border-r border-pewter px-4 text-[12px] last:border-r-0 ${
                        source === item ? "bg-ink text-canvas" : "bg-paper text-ink hover:bg-mist"
                      } ${usesMyanmarScript || item === "mon" || item === "burmese" ? "font-script" : "font-display font-semibold uppercase tracking-[0.04em]"}`}
                    >
                      {item === "auto"
                        ? copy.auto
                        : item === "mon"
                          ? copy.mon
                          : item === "burmese"
                            ? copy.burmese
                            : copy.english}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <p lang={uiLang} className={`text-ash ${usesMyanmarScript ? "font-script text-[12px] font-bold" : "micro-label"}`}>{copy.tryName}</p>
                <div className="mt-2 flex gap-1">
                  {SAMPLES.map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => trySample(sample)}
                      className={`min-h-9 border-b border-ink px-2 text-[13px] hover:border-accent hover:text-accent ${sample === "Aung" ? "" : "font-script"}`}
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </section>

        <section className="mt-8" aria-live="polite" aria-busy={pending}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <p lang={uiLang} className={`text-ash ${usesMyanmarScript ? "font-script text-[12px]" : "micro-label"}`}>{status}</p>
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

          <div className="flex flex-col gap-6">
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
            {!pending && results?.length === 0 && query.trim() ? (
              <SuggestionCard
                key={`${query}-${searchMeta.missingTokens.join("|")}`}
                query={query}
                missingTokens={searchMeta.missingTokens}
                initialSource={suggestionSource}
                lang={lang}
              />
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
