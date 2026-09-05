"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Info, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NameSearchHeader } from "@/components/NameSearchHeader";
import { PublicMobileNav } from "@/components/PublicMobileNav";
import { SiteHeader } from "@/components/SiteHeader";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";
import { translate } from "@/lib/i18n";
import { readMonName, WEEKDAYS, type BirthDay, type NamingOutcome } from "@/lib/naming";
import type { UiLanguage } from "@/lib/types";

const EXAMPLES: Record<BirthDay, string> = {
  1: "မာံအမ်သဝ်မန်",
  2: "မာံဃောဆာန်",
  3: "မာံဇၞူရတ်နန်",
  4: "မာံလျးအာဲမန်",
  5: "မာံမြမောဝ်ဇေတ်",
  6: "မာံဟံသာထဝ်",
  7: "မာံနန်အာဲမန်",
};

const OUTCOMES: Record<Exclude<NamingOutcome, "empty">, { label: string; detail: string }> = {
  good: { label: "Good", detail: "No bad components in this reading." },
  okay: { label: "OK", detail: "One bad component is acceptable in this method." },
  bad: { label: "Bad", detail: "Two or more components have a bad reading." },
};

export function NamingApp() {
  const [lang, setLang] = useState<UiLanguage>("english");
  const [birthDay, setBirthDay] = useState<BirthDay>(1);
  const [name, setName] = useState(EXAMPLES[1]);
  const tr = (message: string, variables?: Record<string, string | number>) => translate(lang, message, variables);

  useEffect(() => {
    const stored = window.localStorage.getItem("ui-lang");
    if (stored === "mon" || stored === "burmese" || stored === "english") setLang(stored);
  }, []);

  function changeLang(next: UiLanguage) {
    setLang(next);
    window.localStorage.setItem("ui-lang", next);
  }

  const reading = useMemo(() => readMonName(name, birthDay), [birthDay, name]);
  const selectedDay = WEEKDAYS[birthDay - 1];
  const result = reading.outcome === "empty" ? null : OUTCOMES[reading.outcome];
  const uiLang = lang === "mon" ? "mnw" : lang === "burmese" ? "my" : "en";

  function selectDay(day: BirthDay) {
    setBirthDay(day);
  }

  function useExample() {
    setName(EXAMPLES[birthDay]);
  }

  return (
    <div className="min-h-screen naming-page">
      <div className="hidden md:block"><SiteHeader lang={lang} onLang={changeLang} naming /></div>
      <NameSearchHeader lang={lang} onLang={changeLang} />

      <main lang={uiLang} className="index-shell naming-index localized-interface">
        <nav className="naming-path" aria-label={tr("Naming page navigation")}>
          <Link href="/"><ArrowLeft size={16} aria-hidden />{tr("Name search")}</Link>
          <span className="micro-label text-ash">{tr("Old Mon naming method / 01")}</span>
        </nav>

        <header className="naming-intro">
          <div>
            <p className="micro-label text-ash">{tr("Traditional name reading")}</p>
            <h1>{tr("Read the pattern inside a Mon name.")}</h1>
          </div>
          <p>{tr("This tool applies the seven-day character system recorded in the old Mon naming method. Choose the birth day, enter the full Mon name, and see how each component is read.")}</p>
        </header>

        <div className="naming-layout">
          <section className="naming-controls" aria-labelledby="naming-input-heading">
            <div className="naming-section-head">
              <span>01</span>
              <div><p className="micro-label text-ash">{tr("Birth day")}</p><h2 id="naming-input-heading">{tr("Choose the day.")}</h2></div>
            </div>

            <div className="naming-days" role="group" aria-label={tr("Birth day")}>
              {WEEKDAYS.map((day) => (
                <button key={day.id} type="button" aria-pressed={birthDay === day.id} onClick={() => selectDay(day.id)}>
                  <span>{String(day.id).padStart(2, "0")}</span>
                  <strong>{tr(day.short)}</strong>
                </button>
              ))}
            </div>
            <p className="naming-selected-day"><span lang="mnw" className="font-script">{selectedDay.mon}</span><span>{tr(selectedDay.english)}</span></p>

            <div className="naming-name-field">
              <label htmlFor="naming-name"><span className="micro-label text-ash">02 / {tr("Mon name")}</span><strong>{tr("Enter the full name.")}</strong></label>
              <div>
                <input
                  id="naming-name"
                  lang="mnw"
                  className="font-script"
                  value={name}
                  maxLength={120}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="မာံအမ်သဝ်မန်"
                />
                <Sparkles size={20} aria-hidden />
              </div>
              <p>{tr("Starting titles မာံ, နာဲ, မိ are excluded. The same words in the middle or at the end are read as part of the name.")}</p>
            </div>

            <button type="button" className="naming-example" onClick={useExample}>
              <span>{tr("Use the {day} example", { day: tr(selectedDay.english) })}</span><ArrowRight size={18} aria-hidden />
            </button>
          </section>

          <section className="naming-reading" aria-labelledby="naming-result-heading" aria-live="polite">
            <SpotlightCard className={`naming-result-card naming-result-${reading.outcome}`}>
              <div className="naming-result-top">
                <div><p className="micro-label">03 / {tr("Reading")}</p><h2 id="naming-result-heading" lang="mnw" className="font-script">{reading.name || "—"}</h2></div>
                {result ? <div className="naming-verdict"><span>{tr(result.label)}</span><small>{tr("{count} bad", { count: reading.badCount })}</small></div> : null}
              </div>

              {reading.ignoredTitle ? (
                <p className="naming-title-note"><span lang="mnw" className="font-script">{reading.ignoredTitle}</span><span>{tr("Starting title excluded from the reading")}</span></p>
              ) : null}

              {reading.components.length ? (
                <div className="naming-component-list">
                  {reading.components.map((component, index) => (
                    <article className="naming-component" key={`${component.text}-${index}`}>
                      <div className="naming-component-index">{String(index + 1).padStart(2, "0")}</div>
                      <div className="naming-component-name"><strong lang="mnw" className="font-script">{component.text}</strong><span>{tr("starts with {initial} / day {day}", { initial: component.initial, day: component.dayNumber })}</span></div>
                      <div className="naming-component-astro"><strong lang="mnw" className="font-script">{component.astro}</strong><span lang="mnw" className="font-script">{component.meaningMon}</span></div>
                      <div className="naming-component-rate"><span data-rate={component.rate}>{tr(component.rate)}</span><small>{tr(component.meaningEnglish)}</small></div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="naming-empty">
                  <Info size={22} aria-hidden />
                  <p>{tr("Enter a Mon name to see its components. Punctuation and unsupported characters are ignored.")}</p>
                </div>
              )}

              {result ? <footer className="naming-result-footer"><strong>{tr(result.label)}</strong><p>{tr(result.detail)}</p></footer> : null}
            </SpotlightCard>
          </section>
        </div>

        <section className="naming-method-note" aria-labelledby="method-note-heading">
          <p className="micro-label text-ash">{tr("How the result is decided")}</p>
          <h2 id="method-note-heading">{tr("The whole pattern matters.")}</h2>
          <div><p><strong>0</strong><span>{tr("bad components")}</span><b>{tr("Good")}</b></p><p><strong>1</strong><span>{tr("bad component")}</span><b>{tr("OK")}</b></p><p><strong>2+</strong><span>{tr("bad components")}</span><b>{tr("Bad")}</b></p></div>
          <small>{tr("This is a cultural naming reference, not a scientific prediction or a guarantee about a person's future.")}</small>
        </section>
      </main>

      <PublicMobileNav active="naming" lang={lang} />
    </div>
  );
}
