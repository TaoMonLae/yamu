"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BrandSettings } from "@/components/BrandSettings";
import { useBranding } from "@/components/BrandingProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";
import type { ColumnKey, ColumnMap, NameInput, NameRecord, SuggestionRecord, UiLanguage } from "@/lib/types";

type Step = "upload" | "map" | "done";
type Mode = "append" | "replace";

type SuggestionDraft = {
  suggestion: SuggestionRecord;
  mon: string;
  burmese: string;
  english: string;
  notes: string;
  credit: string;
};

const STEPS: Array<{ id: Step; label: string; detail: string }> = [
  { id: "upload", label: "Upload", detail: ".csv or .xlsx" },
  { id: "map", label: "Map columns", detail: "Review variants" },
  { id: "done", label: "Write JSON", detail: "Publish catalog" },
];

const FIELD_OPTIONS: { value: ColumnKey; label: string }[] = [
  { value: "mon", label: "Mon" },
  { value: "burmese", label: "Burmese" },
  { value: "english", label: "English" },
  { value: "notes", label: "Notes" },
  { value: "credit", label: "Credit" },
  { value: "skip", label: "Skip" },
];

export function AdminApp() {
  const { branding } = useBranding();
  const [lang, setLang] = useState<UiLanguage>("english");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [count, setCount] = useState(0);
  const [query, setQuery] = useState("");
  const [names, setNames] = useState<NameRecord[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionRecord[]>([]);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMap>({});
  const [mode, setMode] = useState<Mode>("append");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [editing, setEditing] = useState<NameRecord | null>(null);
  const [reviewing, setReviewing] = useState<SuggestionDraft | null>(null);
  const [addingWord, setAddingWord] = useState(false);
  const [manualName, setManualName] = useState<NameInput>({ mon: "", burmese: "", english: "", notes: "", credit: "" });
  const [manualMessage, setManualMessage] = useState("");
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem("ui-lang");
    if (stored === "mon" || stored === "burmese" || stored === "english") setLang(stored);
    void refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeLang(next: UiLanguage) {
    setLang(next);
    window.localStorage.setItem("ui-lang", next);
  }

  async function refreshSession() {
    const response = await fetch("/api/admin/session");
    if (!response.ok) {
      setAuthed(false);
      return;
    }
    const data = (await response.json()) as { count: number };
    setAuthed(true);
    setCount(data.count);
    await Promise.all([loadNames(""), loadSuggestions()]);
  }

  async function loadNames(nextQuery: string) {
    const params = new URLSearchParams({ q: nextQuery });
    const response = await fetch(`/api/admin/names?${params}`);
    if (!response.ok) return;
    const data = (await response.json()) as { results: NameRecord[] };
    setNames(data.results);
  }

  async function loadSuggestions() {
    const response = await fetch("/api/admin/suggestions");
    if (!response.ok) return;
    const data = (await response.json()) as { suggestions: SuggestionRecord[] };
    setSuggestions(data.suggestions);
  }

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    setAuthError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setAuthError("That password does not match the admin key.");
      return;
    }
    setPassword("");
    await refreshSession();
  }

  async function onLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
  }

  async function parseFile(next: File) {
    setBusy(true);
    setError("");
    setMessage("");
    const body = new FormData();
    body.append("file", next);
    const response = await fetch("/api/admin/import/parse", { method: "POST", body });
    const data = (await response.json()) as {
      error?: string;
      filename?: string;
      headers?: string[];
      rows?: Record<string, string>[];
      suggestedMap?: ColumnMap;
    };
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Could not read the file.");
      return;
    }
    setFile(next);
    setFilename(data.filename || next.name);
    setHeaders(data.headers || []);
    setRows(data.rows || []);
    setMapping(data.suggestedMap || {});
    setStep("map");
  }

  async function commitImport() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/admin/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, rows, mapping, mode }),
    });
    const data = (await response.json()) as { error?: string; imported?: number; total?: number };
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Import failed.");
      return;
    }
    setCount(data.total ?? 0);
    setMessage(`${data.imported} names imported. SQLite and data/names.json are now in sync.`);
    setStep("done");
    await loadNames(query);
  }

  async function undoImport() {
    if (!window.confirm("Undo the most recent import and rewrite the live JSON catalog?")) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/admin/import/undo", { method: "POST" });
    const data = (await response.json()) as { error?: string; deleted?: number; restored?: number };
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Nothing to undo.");
      return;
    }
    setMessage(
      data.restored
        ? `Removed ${data.deleted} replacement rows, restored ${data.restored} previous rows, and rewrote JSON.`
        : `Removed ${data.deleted} rows from the last import and rewrote JSON.`,
    );
    resetUpload();
    await refreshSession();
  }

  function resetUpload() {
    setFile(null);
    setFilename("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setError("");
    setStep("upload");
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const response = await fetch(`/api/admin/names/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error || "Could not save that row.");
      return;
    }
    setEditing(null);
    await loadNames(query);
  }

  async function removeName(id: number) {
    if (!window.confirm("Delete this name from SQLite and the JSON catalog?")) return;
    await fetch(`/api/admin/names/${id}`, { method: "DELETE" });
    await refreshSession();
    await loadNames(query);
  }

  async function addManualName(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setManualError("");
    setManualMessage("");
    const response = await fetch("/api/admin/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(manualName),
    });
    const data = (await response.json()) as { error?: string; count?: number; result?: NameRecord };
    setBusy(false);
    if (!response.ok) {
      setManualError(data.error || "Could not add that catalog word.");
      return;
    }
    setManualName({ mon: "", burmese: "", english: "", notes: "", credit: "" });
    setAddingWord(false);
    setQuery("");
    setCount(data.count ?? count + 1);
    setManualMessage(`Catalog word #${data.result?.id ?? "new"} added to SQLite and names.json.`);
    await loadNames("");
  }

  function reviewSuggestion(suggestion: SuggestionRecord) {
    setReviewing({
      suggestion,
      mon: suggestion.suggestedMon || (suggestion.source === "mon" ? suggestion.text : ""),
      burmese: suggestion.suggestedBurmese || (suggestion.source === "burmese" ? suggestion.text : ""),
      english: suggestion.suggestedEnglish || (suggestion.source === "english" ? suggestion.text : ""),
      notes: suggestion.note || (suggestion.context ? `Suggested from full name: ${suggestion.context}` : "User suggestion"),
      credit: suggestion.contributorName,
    });
  }

  async function rejectPendingSuggestion(id: number) {
    setError("");
    const response = await fetch(`/api/admin/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error || "Could not reject the suggestion.");
      return;
    }
    await loadSuggestions();
  }

  async function resolveBugReport(id: number) {
    setError("");
    const response = await fetch(`/api/admin/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve" }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error || "Could not resolve the bug report.");
      return;
    }
    setMessage("Bug report marked as resolved.");
    await loadSuggestions();
  }

  async function approvePendingSuggestion(event: FormEvent) {
    event.preventDefault();
    if (!reviewing) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/admin/suggestions/${reviewing.suggestion.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve",
        name: {
          mon: reviewing.mon,
          burmese: reviewing.burmese,
          english: reviewing.english,
          notes: reviewing.notes,
          credit: reviewing.credit,
        },
      }),
    });
    const data = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Could not approve the suggestion.");
      return;
    }
    setReviewing(null);
    setMessage("Suggestion approved, added to the live catalog, and written to JSON.");
    await refreshSession();
  }

  function editRow(row: NameRecord) {
    setEditing({
      ...row,
      mon: row.monVariants.join(", "),
      burmese: row.burmeseVariants.join(", "),
      english: row.englishVariants.join(", "),
    });
  }

  const preview = useMemo(() => rows.slice(0, 6), [rows]);

  if (authed === null) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="index-shell flex min-h-screen items-center">
          <p className="micro-label animate-pulse text-ash">Opening catalog…</p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen">
        <SiteHeader lang={lang} onLang={changeLang} admin />
        <main className="index-shell grid min-h-[calc(100vh-73px)] md:grid-cols-2">
          <section className="flex flex-col justify-between border-x border-pewter px-6 py-10 md:px-10 md:py-14">
            <p className="micro-label text-ash">Restricted catalog desk</p>
            <div className="py-16">
              <p lang="mnw" className="font-script-display text-[clamp(58px,9vw,110px)] font-bold">ယၟု</p>
              <h1 className="mt-5 max-w-[8ch] text-balance text-[clamp(48px,7vw,84px)] font-semibold leading-[0.92] tracking-[-0.05em]">
                Maintain {branding.siteName}.
              </h1>
            </div>
            <p className="max-w-[40ch] text-[13px] leading-6 text-ash">
              Import spreadsheets, map language columns, review spelling variants, and publish one verified JSON catalog.
            </p>
          </section>

          <section className="flex items-center border-r border-pewter bg-paper px-6 py-16 md:px-12">
            <form onSubmit={onLogin} className="w-full max-w-md">
              <p className="micro-label text-ash">Admin authentication</p>
              <h2 className="mt-5 text-[36px] font-semibold tracking-[-0.04em]">Enter the catalog key.</h2>
              <label htmlFor="admin-password" className="micro-label mt-10 block text-ink">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-3 h-14 w-full border border-ink bg-paper px-4 text-[18px] outline-none focus:border-accent"
              />
              <button type="submit" className="mt-4 min-h-12 w-full bg-accent px-5 font-display text-[14px] font-semibold uppercase tracking-[0.06em] text-on-accent hover:bg-[var(--index-accent-dark)]">
                Open catalog →
              </button>
              {authError ? <p role="alert" className="mt-4 border-t border-accent pt-3 text-[12px] text-accent">{authError}</p> : null}
            </form>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader lang={lang} onLang={changeLang} admin />
      <main className="index-shell pb-20 pt-10">
        <header className="grid gap-8 border-b border-ink pb-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="micro-label text-ash">Catalog administration / live data</p>
            <h1 className="mt-5 text-[clamp(52px,7vw,86px)] font-semibold leading-[0.92] tracking-[-0.05em]">Import desk.</h1>
            <p className="mt-5 max-w-[58ch] text-[14px] leading-6 text-ash">
              Spreadsheet cells may contain two or three spellings separated by commas, semicolons, pipes, or line breaks. The first spelling becomes the default.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <a href="#brand-settings" className="border border-ink bg-accent px-4 py-3 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-on-accent no-underline hover:bg-[var(--index-accent-dark)]">Brand Settings ↓</a>
            <a href="/api/admin/template" className="border border-ink px-4 py-3 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-ink no-underline hover:bg-mist">CSV template ↓</a>
            <a href="/api/admin/export?format=json" className="border border-ink px-4 py-3 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-ink no-underline hover:bg-mist">JSON ↓</a>
            <a href="/api/admin/export?format=csv" className="border border-ink px-4 py-3 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-ink no-underline hover:bg-mist">CSV ↓</a>
            <button type="button" onClick={() => void onLogout()} className="border border-ink bg-ink px-4 py-3 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-canvas hover:bg-accent hover:text-on-accent">Sign out</button>
          </div>
        </header>

        <BrandSettings />

        <div className="grid border-b border-x border-pewter sm:grid-cols-3">
          {STEPS.map((item, index) => (
            <div key={item.id} className={`relative flex gap-4 border-b border-pewter px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 ${step === item.id ? "bg-ink text-canvas" : "bg-paper text-ink"}`}>
              {step === item.id ? <span className="absolute inset-x-0 bottom-0 h-1 bg-accent" /> : null}
              <span className="font-display text-[20px] font-semibold">0{index + 1}</span>
              <span>
                <span className="block font-display text-[13px] font-semibold uppercase tracking-[0.04em]">{item.label}</span>
                <span className={`mt-1 block text-[11px] ${step === item.id ? "text-canvas/60" : "text-ash"}`}>{item.detail}</span>
              </span>
            </div>
          ))}
        </div>

        {step === "upload" ? (
          <section className="mt-10">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 className="text-[28px] font-semibold tracking-[-0.03em]">Add a source file</h2>
              <p className="micro-label text-ash">{count} names live</p>
            </div>
            <SpotlightCard spotlightColor="color-mix(in srgb, var(--index-accent) 9%, transparent)" className={`border border-dashed bg-paper ${dragOver ? "border-accent" : "border-ink"}`}>
              <label
                onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  const next = event.dataTransfer.files[0];
                  if (next) void parseFile(next);
                }}
                className="flex min-h-[300px] cursor-pointer flex-col items-center justify-center px-5 py-12 text-center"
              >
                <span className="flex h-16 w-16 items-center justify-center border border-ink font-display text-[28px]">↑</span>
                <span className="mt-7 text-[clamp(30px,4vw,52px)] font-semibold tracking-[-0.04em]">Drop .csv or .xlsx</span>
                <span className="mt-3 max-w-[46ch] text-[13px] leading-6 text-ash">A header row is required. Columns are detected automatically and can be corrected before import.</span>
                <span className="micro-label mt-6 border-b border-ink pb-1 text-ink">{busy ? "Reading file…" : "Choose a file"}</span>
                <input type="file" accept=".csv,.xlsx,.xls,.txt" className="sr-only" onChange={(event) => { const next = event.target.files?.[0]; if (next) void parseFile(next); }} />
              </label>
            </SpotlightCard>
            {file ? <p className="mt-3 text-[12px] text-ash">Selected: {file.name}</p> : null}
          </section>
        ) : null}

        {step === "map" ? (
          <section className="mt-10">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="micro-label text-ash">Source ready</p>
                <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.03em]">{filename}</h2>
                <p className="mt-1 text-[13px] text-ash">{rows.length} rows · previewing the first {preview.length}</p>
              </div>
              <fieldset>
                <legend className="micro-label text-ash">Import mode</legend>
                <div className="mt-2 flex border border-ink">
                  {(["append", "replace"] as Mode[]).map((item) => (
                    <button key={item} type="button" onClick={() => setMode(item)} aria-pressed={mode === item} className={`min-h-11 px-4 font-display text-[11px] font-semibold uppercase tracking-[0.05em] ${mode === item ? "bg-ink text-canvas" : "bg-paper text-ink"}`}>{item === "append" ? "Append" : "Replace all"}</button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="mt-6 overflow-x-auto border border-ink bg-paper">
              <table className="w-full min-w-[720px] border-collapse text-left text-[12px]">
                <thead>
                  <tr>
                    {headers.map((header) => (
                      <th key={header} className="border-b border-r border-ink p-3 font-normal last:border-r-0">
                        <p className="micro-label mb-2 text-ash">{header}</p>
                        <select value={mapping[header] ?? "skip"} onChange={(event) => setMapping((current) => ({ ...current, [header]: event.target.value as ColumnKey }))} className="h-10 w-full border border-pewter bg-paper px-2 outline-none focus:border-accent">
                          {FIELD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-pewter last:border-b-0">
                      {headers.map((header) => <td key={header} className="max-w-[280px] border-r border-pewter px-3 py-3 font-script last:border-r-0">{row[header]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-col justify-between gap-4 border-t border-pewter pt-5 sm:flex-row sm:items-center">
              <p className="max-w-[56ch] text-[12px] leading-5 text-ash">Variant cells are normalized into arrays in JSON. Existing commas are treated as spelling separators.</p>
              <div className="flex gap-2">
                <button type="button" onClick={resetUpload} className="min-h-11 border border-ink px-5 font-display text-[11px] font-semibold uppercase tracking-[0.05em]">Back</button>
                <button type="button" disabled={busy} onClick={() => void commitImport()} className="min-h-11 bg-accent px-5 font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-on-accent hover:bg-[var(--index-accent-dark)] disabled:opacity-50">{busy ? "Writing…" : "Import + write JSON →"}</button>
              </div>
            </div>
          </section>
        ) : null}

        {step === "done" ? (
          <section className="mt-10 border border-ink bg-paper">
            <div className="h-2 bg-accent" />
            <div className="grid gap-8 px-6 py-10 md:grid-cols-[1fr_auto] md:items-end md:px-10">
              <div>
                <p className="micro-label text-success">Publish complete</p>
                <h2 className="mt-4 text-[clamp(38px,5vw,64px)] font-semibold tracking-[-0.04em]">Catalog and JSON agree.</h2>
                <p className="mt-4 max-w-[62ch] text-[14px] leading-6 text-ash">{message}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { resetUpload(); setMessage(""); }} className="min-h-11 bg-ink px-5 font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-canvas hover:bg-accent hover:text-on-accent">Import another</button>
                <button type="button" disabled={busy} onClick={() => void undoImport()} className="min-h-11 border border-ink px-5 font-display text-[11px] font-semibold uppercase tracking-[0.05em] disabled:opacity-50">Undo import</button>
              </div>
            </div>
          </section>
        ) : null}

        {error ? <p role="alert" className="mt-5 border border-accent px-4 py-3 text-[12px] text-accent">{error}</p> : null}
        {message && step !== "done" ? <p role="status" className="mt-5 border-l-4 border-success bg-paper px-4 py-3 text-[12px] text-success">{message}</p> : null}

        <section className="mt-16 border-t border-ink pt-8" aria-labelledby="suggestion-queue-title">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="micro-label text-ash">Community intake / pending review</p>
              <h2 id="suggestion-queue-title" className="mt-3 text-[32px] font-semibold tracking-[-0.035em]">
                Suggestion docket.
              </h2>
              <p className="mt-3 max-w-[62ch] text-[13px] leading-6 text-ash">
                Word contributions are verified before publishing. Bug reports stay private and can be resolved from this same docket.
              </p>
            </div>
            <div className="min-w-28 border border-ink bg-paper px-4 py-3 text-right">
              <p className="font-display text-[28px] font-semibold leading-none">{String(suggestions.length).padStart(2, "0")}</p>
              <p className="micro-label mt-2 text-ash">Pending</p>
            </div>
          </div>

          <div className="mt-5 border border-ink bg-paper">
            {suggestions.length ? suggestions.map((suggestion, index) => {
              const script = suggestion.kind === "word" && suggestion.source !== "english";
              return (
                <article
                  key={suggestion.id}
                  className="grid border-b border-pewter last:border-b-0 md:grid-cols-[86px_minmax(0,1fr)_180px]"
                >
                  <div className="border-b border-pewter px-4 py-5 md:border-b-0 md:border-r">
                    <p className="font-display text-[20px] font-semibold">{String(index + 1).padStart(2, "0")}</p>
                    <p className="micro-label mt-2 text-stone">#{suggestion.id}</p>
                  </div>
                  <div className="min-w-0 border-b border-pewter px-4 py-5 md:border-b-0 md:border-r md:px-6">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                      <p
                        lang={suggestion.source === "mon" ? "mnw" : suggestion.source === "burmese" ? "my" : "en"}
                        className={`text-[28px] font-semibold text-ink ${script ? "font-script leading-[1.5]" : "tracking-[-0.03em]"}`}
                      >
                        {suggestion.text}
                      </p>
                      <p className="micro-label text-accent">{suggestion.kind === "bug" ? "Bug report" : suggestion.source}</p>
                    </div>
                    {suggestion.kind === "word" ? (
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-ash">
                        {suggestion.suggestedMon ? <span className="font-script"><b className="font-sans text-[9px] uppercase tracking-[0.07em] text-stone">Mon</b> {suggestion.suggestedMon}</span> : null}
                        {suggestion.suggestedBurmese ? <span className="font-script"><b className="font-sans text-[9px] uppercase tracking-[0.07em] text-stone">Burmese</b> {suggestion.suggestedBurmese}</span> : null}
                        {suggestion.suggestedEnglish ? <span><b className="text-[9px] uppercase tracking-[0.07em] text-stone">English</b> {suggestion.suggestedEnglish}</span> : null}
                      </div>
                    ) : null}
                    {suggestion.context ? <p className={`mt-3 text-[12px] text-ash ${/[\u1000-\u109f\uaa60-\uaa7f]/u.test(suggestion.context) ? "font-script" : ""}`}>{suggestion.kind === "bug" ? "Page" : "Full-name context"}: {suggestion.context}</p> : null}
                    {suggestion.note ? <p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-ash">{suggestion.kind === "bug" ? "Details" : "User note"}: {suggestion.note}</p> : null}
                    {suggestion.contributorName ? <p className="mt-2 text-[11px] text-ink">{suggestion.kind === "bug" ? "Reporter" : "Requested credit"}: <b>{suggestion.contributorName}</b></p> : null}
                    <p className="mt-3 text-[10px] uppercase tracking-[0.08em] text-stone">
                      Received {new Date(suggestion.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-5 md:flex-col md:items-stretch md:justify-center">
                    {suggestion.kind === "bug" ? (
                      <button type="button" onClick={() => void resolveBugReport(suggestion.id)} className="min-h-11 flex-1 bg-accent px-4 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-on-accent hover:bg-[var(--index-accent-dark)]">Mark resolved ✓</button>
                    ) : (
                      <button type="button" onClick={() => reviewSuggestion(suggestion)} className="min-h-11 flex-1 bg-ink px-4 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-canvas hover:bg-accent hover:text-on-accent">Review →</button>
                    )}
                    <button
                      type="button"
                      onClick={() => void rejectPendingSuggestion(suggestion.id)}
                      className="min-h-11 flex-1 border border-pewter px-4 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-ash hover:border-accent hover:text-accent"
                    >
                      {suggestion.kind === "bug" ? "Dismiss" : "Reject"}
                    </button>
                  </div>
                </article>
              );
            }) : (
              <div className="grid min-h-32 place-items-center px-5 py-10 text-center">
                <div>
                  <p className="font-display text-[22px] font-semibold uppercase">Docket clear.</p>
                  <p className="mt-2 text-[12px] text-ash">No word contributions or bug reports are waiting.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-16 border-t border-ink pt-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="micro-label text-ash">Current database</p>
              <h2 className="mt-3 text-[32px] font-semibold tracking-[-0.035em]">{count} catalog names</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <button
                type="button"
                aria-expanded={addingWord}
                aria-controls="manual-word-entry"
                onClick={() => { setAddingWord((current) => !current); setManualError(""); setManualMessage(""); }}
                className={`min-h-11 border border-ink px-5 font-display text-[11px] font-semibold uppercase tracking-[0.06em] ${addingWord ? "bg-ink text-canvas" : "bg-paper text-ink hover:bg-ink hover:text-canvas"}`}
              >
                {addingWord ? "Close entry ×" : "Add catalog word +"}
              </button>
              <label className="micro-label text-ash">
                Filter catalog
                <input value={query} onChange={(event) => { setQuery(event.target.value); void loadNames(event.target.value); }} placeholder="Name or note…" className="mt-2 h-11 w-full min-w-[280px] border border-ink bg-paper px-3 font-sans text-[14px] normal-case tracking-normal outline-none placeholder:text-stone focus:border-accent sm:w-[340px]" />
              </label>
            </div>
          </div>

          {addingWord ? (
            <SpotlightCard className="mt-5 border border-ink bg-paper" spotlightColor="color-mix(in srgb, var(--index-accent) 9%, transparent)">
              <form id="manual-word-entry" onSubmit={addManualName}>
                <div className="grid border-b border-ink sm:grid-cols-[120px_1fr]">
                  <div className="border-b border-ink bg-ink px-5 py-5 text-canvas sm:border-b-0 sm:border-r">
                    <p className="micro-label text-canvas/60">Manual entry</p>
                    <p className="mt-7 font-display text-[34px] font-semibold leading-none">+01</p>
                  </div>
                  <div className="px-5 py-6 sm:px-7">
                    <h3 className="text-[28px] font-semibold tracking-[-0.03em]">Add one verified word.</h3>
                    <p className="mt-2 max-w-[65ch] text-[12px] leading-5 text-ash">Enter the matching forms in all three scripts. Use commas for alternate spellings; the first value becomes the default.</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3">
                  {([
                    ["mon", "01 / Mon variants", true],
                    ["burmese", "02 / Burmese variants", true],
                    ["english", "03 / English variants", false],
                  ] as const).map(([key, label, script], index) => (
                    <label key={key} className={`px-5 py-5 text-ash md:px-6 ${index > 0 ? "border-t border-pewter md:border-l md:border-t-0" : ""}`}>
                      <span className="micro-label">{label}</span>
                      <input
                        required
                        autoFocus={index === 0}
                        lang={key === "mon" ? "mnw" : key === "burmese" ? "my" : "en"}
                        value={manualName[key]}
                        onChange={(event) => setManualName({ ...manualName, [key]: event.target.value })}
                        placeholder={script ? "စာလုံးပေါင်း, မူကွဲ" : "Spelling, variant"}
                        className={`mt-3 h-14 w-full border border-ink bg-paper px-3 text-[18px] font-normal text-ink outline-none placeholder:text-stone focus:border-accent ${script ? "font-script" : "font-sans"}`}
                      />
                    </label>
                  ))}
                </div>

                <div className="border-t border-pewter px-5 py-5 sm:px-6">
                  <div className="grid gap-4 md:grid-cols-2">
                  <label className="micro-label block text-ash">Catalog notes
                    <textarea
                      value={manualName.notes ?? ""}
                      onChange={(event) => setManualName({ ...manualName, notes: event.target.value })}
                      rows={2}
                      placeholder="Source, pronunciation, or verification note…"
                      className="mt-2 w-full resize-y border border-pewter bg-paper px-3 py-3 font-sans text-[14px] font-normal normal-case tracking-normal text-ink outline-none placeholder:text-stone focus:border-accent"
                    />
                  </label>
                  <label className="micro-label block text-ash">Contributor credit
                    <input value={manualName.credit ?? ""} onChange={(event) => setManualName({ ...manualName, credit: event.target.value })} placeholder="Optional public name" className="mt-2 h-12 w-full border border-pewter bg-paper px-3 font-sans text-[14px] font-normal normal-case tracking-normal text-ink outline-none placeholder:text-stone focus:border-accent" />
                  </label>
                  </div>
                  <div className="mt-5 flex flex-col gap-3 border-t border-pewter pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-stone">Destination / SQLite + data/names.json</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setAddingWord(false); setManualError(""); }} className="min-h-11 border border-ink px-5 font-display text-[11px] font-semibold uppercase tracking-[0.05em]">Cancel</button>
                      <button type="submit" disabled={busy} className="min-h-11 bg-accent px-5 font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-on-accent hover:bg-[var(--index-accent-dark)] disabled:opacity-50">{busy ? "Adding…" : "Add word + write JSON →"}</button>
                    </div>
                  </div>
                  {manualError ? <p role="alert" className="mt-4 border-t border-accent pt-3 text-[12px] text-accent">{manualError}</p> : null}
                </div>
              </form>
            </SpotlightCard>
          ) : null}

          {manualMessage ? <p role="status" className="mt-5 border-l-4 border-success bg-paper px-4 py-3 text-[12px] text-success">{manualMessage}</p> : null}

          <div className="mt-5 overflow-x-auto border border-ink bg-paper">
            <table className="w-full min-w-[840px] border-collapse text-left text-[13px]">
              <thead className="bg-ink text-canvas">
                <tr>{["Mon", "Burmese", "English", "Notes", "Credit", ""].map((label, index) => <th key={`${label}-${index}`} className="border-r border-canvas/20 px-3 py-3 font-display text-[11px] font-semibold uppercase tracking-[0.06em] last:border-r-0">{label}</th>)}</tr>
              </thead>
              <tbody>
                {names.map((row) => (
                  <tr key={row.id} className="border-b border-pewter last:border-b-0 hover:bg-mist/60">
                    <td className="border-r border-pewter px-3 py-3 font-script">{row.monVariants.join(" · ")}</td>
                    <td className="border-r border-pewter px-3 py-3 font-script">{row.burmeseVariants.join(" · ")}</td>
                    <td className="border-r border-pewter px-3 py-3">{row.englishVariants.join(" · ")}</td>
                    <td className="max-w-[280px] border-r border-pewter px-3 py-3 text-ash">{row.notes}</td>
                    <td className="border-r border-pewter px-3 py-3 text-ash">{row.credit || "—"}</td>
                    <td className="px-3 py-3"><div className="flex gap-3"><button type="button" onClick={() => editRow(row)} className="micro-label border-b border-ink pb-1">Edit</button><button type="button" onClick={() => void removeName(row.id)} className="micro-label border-b border-transparent pb-1 text-ash hover:border-accent hover:text-accent">Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {reviewing ? (
          <div role="dialog" aria-modal="true" aria-labelledby="review-suggestion-title" className="theme-overlay fixed inset-0 z-30 flex items-center justify-center p-4">
            <form onSubmit={approvePendingSuggestion} className="max-h-[calc(100vh-32px)] w-full max-w-2xl overflow-y-auto border border-ink bg-canvas">
              <div className="grid border-b border-ink sm:grid-cols-[110px_1fr_auto] sm:items-stretch">
                <div className="bg-ink px-5 py-4 text-canvas">
                  <p className="micro-label text-canvas/60">Docket</p>
                  <p className="mt-2 font-display text-[24px] font-semibold">#{reviewing.suggestion.id}</p>
                </div>
                <div className="px-5 py-4">
                  <p id="review-suggestion-title" className="font-display text-[20px] font-semibold uppercase">Verify suggested spelling</p>
                  <p className="mt-1 text-[11px] text-ash">Source submitted as {reviewing.suggestion.source}</p>
                </div>
                <button type="button" onClick={() => { setReviewing(null); setError(""); }} className="absolute right-6 top-5 text-[24px] sm:static sm:min-w-16 sm:border-l sm:border-pewter" aria-label="Close review dialog">×</button>
              </div>

              <div className="border-b border-pewter bg-paper px-5 py-5">
                <p className="micro-label text-stone">Submitted form</p>
                <p
                  lang={reviewing.suggestion.source === "mon" ? "mnw" : reviewing.suggestion.source === "burmese" ? "my" : "en"}
                  className={`mt-2 text-[32px] font-semibold ${reviewing.suggestion.source !== "english" ? "font-script leading-[1.5]" : "tracking-[-0.03em]"}`}
                >
                  {reviewing.suggestion.text}
                </p>
                {reviewing.suggestion.context ? <p className="mt-2 text-[12px] text-ash">Full-name context: {reviewing.suggestion.context}</p> : null}
              </div>

              <div className="space-y-5 px-5 py-6 sm:px-7">
                <p className="text-[12px] leading-5 text-ash">Complete all three catalog forms. Separate alternate spellings with commas; the first spelling becomes the default.</p>
                {([
                  ["mon", "Mon variants", true],
                  ["burmese", "Burmese variants", true],
                  ["english", "English variants", false],
                ] as const).map(([key, label, script]) => (
                  <label key={key} className="micro-label block text-ash">{label}
                    <input
                      required
                      value={reviewing[key]}
                      onChange={(event) => setReviewing({ ...reviewing, [key]: event.target.value })}
                      className={`mt-2 h-13 w-full border border-ink bg-paper px-3 text-[18px] font-normal normal-case tracking-normal outline-none focus:border-accent ${script ? "font-script" : "font-sans"}`}
                    />
                  </label>
                ))}
                <label className="micro-label block text-ash">Catalog notes
                  <textarea value={reviewing.notes} onChange={(event) => setReviewing({ ...reviewing, notes: event.target.value })} rows={3} className="mt-2 w-full resize-y border border-ink bg-paper px-3 py-3 font-sans text-[14px] font-normal normal-case tracking-normal outline-none focus:border-accent" />
                </label>
                <label className="micro-label block text-ash">Public contributor credit
                  <input maxLength={80} value={reviewing.credit} onChange={(event) => setReviewing({ ...reviewing, credit: event.target.value })} placeholder="Optional name shown after approval" className="mt-2 h-12 w-full border border-ink bg-paper px-3 font-sans text-[14px] font-normal normal-case tracking-normal outline-none focus:border-accent" />
                </label>
                {error ? <p role="alert" className="border-t border-accent pt-3 text-[12px] text-accent">{error}</p> : null}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-ink px-5 py-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => { setReviewing(null); setError(""); }} className="min-h-11 border border-ink px-5 font-display text-[11px] font-semibold uppercase tracking-[0.05em]">Return to docket</button>
                <button type="submit" disabled={busy} className="min-h-11 bg-accent px-5 font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-on-accent disabled:opacity-50">{busy ? "Adding…" : "Approve + add to catalog →"}</button>
              </div>
            </form>
          </div>
        ) : null}

        {editing ? (
          <div role="dialog" aria-modal="true" aria-labelledby="edit-name-title" className="theme-overlay fixed inset-0 z-20 flex items-center justify-center p-4">
            <form onSubmit={saveEdit} className="w-full max-w-xl border border-ink bg-canvas">
              <div className="flex items-center justify-between border-b border-ink px-5 py-4">
                <h3 id="edit-name-title" className="font-display text-[22px] font-semibold uppercase">Edit catalog name</h3>
                <button type="button" onClick={() => setEditing(null)} className="text-[22px]" aria-label="Close edit dialog">×</button>
              </div>
              <div className="space-y-5 px-5 py-6">
                <p className="text-[12px] leading-5 text-ash">Separate alternate spellings with commas. The first value is the default shown to users.</p>
                {([
                  ["mon", "Mon variants", true],
                  ["burmese", "Burmese variants", true],
                  ["english", "English variants", false],
                ] as const).map(([key, label, script]) => (
                  <label key={key} className="micro-label block text-ash">{label}
                    <input value={editing[key]} onChange={(event) => setEditing({ ...editing, [key]: event.target.value })} className={`mt-2 h-12 w-full border border-ink bg-paper px-3 text-[16px] font-normal normal-case tracking-normal outline-none focus:border-accent ${script ? "font-script" : "font-sans"}`} />
                  </label>
                ))}
                <label className="micro-label block text-ash">Notes
                  <textarea value={editing.notes} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} rows={3} className="mt-2 w-full resize-y border border-ink bg-paper px-3 py-3 font-sans text-[14px] font-normal normal-case tracking-normal outline-none focus:border-accent" />
                </label>
                <label className="micro-label block text-ash">Contributor credit
                  <input maxLength={80} value={editing.credit} onChange={(event) => setEditing({ ...editing, credit: event.target.value })} className="mt-2 h-12 w-full border border-ink bg-paper px-3 font-sans text-[14px] font-normal normal-case tracking-normal outline-none focus:border-accent" />
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-ink px-5 py-4">
                <button type="button" onClick={() => setEditing(null)} className="min-h-11 border border-ink px-5 font-display text-[11px] font-semibold uppercase tracking-[0.05em]">Cancel</button>
                <button type="submit" className="min-h-11 bg-accent px-5 font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-on-accent">Save + rewrite JSON</button>
              </div>
            </form>
          </div>
        ) : null}
      </main>
    </div>
  );
}
