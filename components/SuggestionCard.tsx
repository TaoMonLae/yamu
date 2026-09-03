"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ShinyText } from "@/components/reactbits/ShinyText";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";
import { t } from "@/lib/i18n";
import type { Language, UiLanguage } from "@/lib/types";

type Props = {
  query: string;
  missingTokens: string[];
  initialSource: Language;
  lang: UiLanguage;
  onCancel: () => void;
};

const SOURCE_OPTIONS: Array<{ value: Language; short: string; label: string }> = [
  { value: "mon", short: "01", label: "Mon / မန်" },
  { value: "burmese", short: "02", label: "Burmese / မြန်မာ" },
  { value: "english", short: "03", label: "English" },
];
const EMPTY_SPELLINGS: Record<Language, string> = { mon: "", burmese: "", english: "" };

export function SuggestionCard({ query, missingTokens, initialSource, lang, onCancel }: Props) {
  const copy = t(lang);
  const initialText = missingTokens.length === 1 ? missingTokens[0] : query.trim();
  const [text, setText] = useState(initialText);
  const [source, setSource] = useState<Language>(initialSource);
  const [spellings, setSpellings] = useState(EMPTY_SPELLINGS);
  const [showMore, setShowMore] = useState(false);
  const [contributorName, setContributorName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const uiUsesScript = lang !== "english";
  const uiLang = lang === "mon" ? "mnw" : lang === "burmese" ? "my" : "en";

  useEffect(() => {
    setText(initialText);
    setSource(initialSource);
    setSpellings(EMPTY_SPELLINGS);
    setShowMore(false);
    setNote("");
    setSent(false);
    setError("");
  }, [initialSource, initialText]);

  useEffect(() => setContributorName(window.localStorage.getItem("yamu-contributor-name") ?? ""), []);

  const context = useMemo(() => {
    const normalized = query.trim().replace(/\s+/g, " ");
    return normalized !== text.trim() ? normalized : "";
  }, [query, text]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Yamu-Request": "1" },
        body: JSON.stringify({ kind: "word", text, source, spellings: { ...spellings, [source]: text }, context, note, contributorName }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not send the suggestion.");
      if (contributorName.trim()) window.localStorage.setItem("yamu-contributor-name", contributorName.trim());
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not send the suggestion.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SpotlightCard className="contribution-ticket border border-ink bg-paper" spotlightColor="color-mix(in srgb, var(--index-accent) 9%, transparent)">
      <div className="grid border-b border-ink md:grid-cols-[164px_1fr]">
        <div className="flex items-end justify-between border-b border-ink bg-ink px-5 py-5 text-canvas md:block md:border-b-0 md:border-r">
          <div>
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-canvas/60">Contribution ticket</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-canvas/40">Word desk</p>
          </div>
          <p className="font-display text-[42px] font-semibold leading-none md:mt-10">+01</p>
        </div>
        <div className="px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex items-start justify-between gap-5">
            <p lang={uiLang} className={`${uiUsesScript ? "font-script text-[26px] leading-[1.5]" : "text-[30px] font-semibold tracking-[-0.035em]"} text-ink`}>{copy.missingTitle}</p>
            <button type="button" onClick={onCancel} className={`shrink-0 border-b border-ink pb-1 text-ink hover:border-accent hover:text-accent ${uiUsesScript ? "font-script text-[12px]" : "font-display text-[10px] font-semibold uppercase tracking-[0.07em]"}`}>
              {copy.cancelSuggestion} ×
            </button>
          </div>
          <p className="mt-3 max-w-[64ch] text-[13px] leading-6 text-ash">One spelling is enough. Add the matching forms only if you know them; the catalog desk verifies every entry.</p>
          {missingTokens.length > 1 ? (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-pewter pt-4">
              <span className="micro-label text-stone">Choose missing word</span>
              {missingTokens.map((token, index) => (
                <button key={`${token}-${index}`} type="button" onClick={() => { setText(token); setSent(false); }} className={`border-b pb-1 text-[18px] font-semibold ${text === token ? "border-accent text-ink" : "border-pewter text-ash"} ${/[\u1000-\u109f\uaa60-\uaa7f]/u.test(token) ? "font-script" : ""}`}>{token}</button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {sent ? (
        <div className="result-enter grid md:grid-cols-[164px_1fr]">
          <div className="h-2 bg-accent md:h-auto" />
          <div className="px-5 py-8 sm:px-7">
            <p className="font-display text-[12px] font-semibold uppercase tracking-[0.08em] text-success"><ShinyText>Ticket received</ShinyText></p>
            <p className="mt-3 text-[20px] font-semibold tracking-[-0.02em] text-ink">Thank you for helping the catalog grow.</p>
            <p className="mt-2 text-[12px] leading-5 text-ash">{contributorName.trim() ? `If approved, this entry will show “Contributed by ${contributorName.trim()}.”` : "An admin will verify the three spellings before the entry appears in search."}</p>
            <button type="button" onClick={() => { setSent(false); setNote(""); setSpellings(EMPTY_SPELLINGS); }} className="micro-label mt-5 border-b border-ink pb-1 text-ink">Add another word +</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="grid border-b border-pewter lg:grid-cols-[minmax(0,1fr)_330px]">
            <label className="px-5 py-5 text-ash sm:px-7">
              <span className="micro-label">Word or name</span>
              <input required autoFocus maxLength={80} lang={source === "mon" ? "mnw" : source === "burmese" ? "my" : "en"} value={text} onChange={(event) => setText(event.target.value)} className={`mt-3 h-16 w-full border-b-2 border-ink bg-transparent px-0 text-[30px] font-semibold text-ink outline-none focus:border-accent ${source === "english" ? "font-sans tracking-[-0.02em]" : "font-script"}`} />
            </label>
            <fieldset className="border-t border-pewter px-5 py-5 lg:border-l lg:border-t-0">
              <legend className="micro-label px-0 text-ash">Written in</legend>
              <div className="mt-3 grid grid-cols-3">
                {SOURCE_OPTIONS.map((option) => (
                  <button key={option.value} type="button" aria-pressed={source === option.value} onClick={() => setSource(option.value)} className={`min-h-14 border border-r-0 border-ink px-2 text-left last:border-r ${source === option.value ? "bg-ink text-canvas" : "bg-paper text-ink hover:bg-mist"}`}>
                    <span className="block text-[9px] uppercase tracking-[0.08em] opacity-55">{option.short}</span>
                    <span className={`mt-1 block text-[11px] font-semibold ${option.value === "english" ? "font-display uppercase" : "font-script"}`}>{option.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="border-b border-pewter px-5 py-5 sm:px-7">
            <button type="button" aria-expanded={showMore} aria-controls="additional-spellings" onClick={() => setShowMore((current) => !current)} className="flex w-full items-center justify-between gap-4 text-left">
              <span><span className="font-display text-[13px] font-semibold uppercase tracking-[0.05em] text-ink">I know another spelling</span><span className="mt-1 block text-[11px] text-ash">Optional Mon, Burmese, or English forms</span></span>
              <span className="font-display text-[22px] text-accent" aria-hidden="true">{showMore ? "−" : "+"}</span>
            </button>
            {showMore ? (
              <div id="additional-spellings" className="contribution-reveal mt-5 grid gap-4 sm:grid-cols-2">
                {SOURCE_OPTIONS.filter((option) => option.value !== source).map((option) => (
                  <label key={option.value} className="micro-label text-ash">{option.label}
                    <input maxLength={80} lang={option.value === "mon" ? "mnw" : option.value === "burmese" ? "my" : "en"} value={spellings[option.value]} onChange={(event) => setSpellings((current) => ({ ...current, [option.value]: event.target.value }))} className={`mt-2 h-12 w-full border border-ink bg-paper px-3 text-[17px] font-normal normal-case tracking-normal text-ink outline-none focus:border-accent ${option.value === "english" ? "font-sans" : "font-script"}`} />
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid border-b border-pewter md:grid-cols-2">
            <label className="px-5 py-5 text-ash sm:px-7 md:border-r md:border-pewter">
              <span className="micro-label">Credit name <span className="text-stone">/ optional</span></span>
              <input maxLength={80} autoComplete="name" value={contributorName} onChange={(event) => setContributorName(event.target.value)} placeholder="Name shown after approval" className="mt-2 h-12 w-full border border-pewter bg-paper px-3 font-sans text-[14px] font-normal normal-case tracking-normal text-ink outline-none placeholder:text-stone focus:border-accent" />
              <span className="mt-2 block text-[10px] leading-4 text-stone">Public only if the word is approved. No email required.</span>
            </label>
            <label className="border-t border-pewter px-5 py-5 text-ash sm:px-7 md:border-t-0">
              <span className="micro-label">Helpful note <span className="text-stone">/ optional</span></span>
              <textarea rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Pronunciation, source, or where you saw it" className="mt-2 w-full resize-y border border-pewter bg-paper px-3 py-3 font-sans text-[13px] font-normal normal-case tracking-normal text-ink outline-none placeholder:text-stone focus:border-accent" />
            </label>
          </div>

          <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="text-[10px] uppercase tracking-[0.09em] text-stone">Review queue · credit after approval</p>
            <button type="submit" disabled={busy || !text.trim()} className="min-h-12 bg-accent px-6 font-display text-[12px] font-semibold uppercase tracking-[0.06em] text-on-accent transition-colors hover:bg-[var(--index-accent-dark)] disabled:opacity-50">{busy ? "Sending…" : "Send contribution →"}</button>
          </div>
          {context ? <p className="border-t border-pewter px-5 py-3 text-[11px] text-ash sm:px-7">Found while searching: <span className={/[\u1000-\u109f\uaa60-\uaa7f]/u.test(context) ? "font-script text-ink" : "text-ink"}>{context}</span></p> : null}
          {error ? <p role="alert" className="border-t border-accent px-5 py-3 text-[12px] text-accent sm:px-7">{error}</p> : null}
        </form>
      )}
    </SpotlightCard>
  );
}
