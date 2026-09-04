"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Bug,
  Check,
  FileSpreadsheet,
  Inbox,
  Languages,
  LayoutDashboard,
  Palette,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { BrandSettings } from "@/components/BrandSettings";
import { useBranding } from "@/components/BrandingProvider";
import AppShell1, { type AppShellItem } from "@/components/blocks/app-shell-1";
import Dashboard1 from "@/components/blocks/dashboard-1";
import DataTable1 from "@/components/blocks/data-table-1";
import type { AdminIdentity, AdminRole } from "@/lib/auth";
import type { ColumnKey, ColumnMap, NameInput, NameRecord, SuggestionRecord } from "@/lib/types";

type SectionId = "overview" | "catalog" | "reviews" | "import" | "team" | "branding";
type ImportStep = "upload" | "map" | "done";
type ImportMode = "append" | "replace";
type SuggestionDraft = { suggestion: SuggestionRecord; mon: string; burmese: string; english: string; notes: string; credit: string };
type TeamUser = { id: string; name: string; email: string; imageUrl: string; role: AdminRole; createdAt: number; lastSignInAt: number | null };

const FIELD_OPTIONS: Array<{ value: ColumnKey; label: string }> = [
  { value: "mon", label: "Mon" },
  { value: "burmese", label: "Burmese" },
  { value: "english", label: "English" },
  { value: "notes", label: "Notes" },
  { value: "credit", label: "Credit" },
  { value: "skip", label: "Skip" },
];

const button = "inline-flex min-h-10 items-center justify-center gap-2 border border-[#252624] px-4 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--index-accent)] focus-visible:ring-offset-2";
const primaryButton = `${button} border-[var(--index-accent)] bg-[var(--index-accent)] text-white hover:brightness-95`;
const field = "mt-2 h-11 w-full border border-[#cbccc8] bg-white px-3 text-[14px] outline-none focus:border-[var(--index-accent)] focus-visible:ring-1 focus-visible:ring-[var(--index-accent)]";

function SectionHeading({ eyebrow, title, copy, actions }: { eyebrow: string; title: string; copy: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-5 border-b border-[#dfe0dc] pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-[#7d7e79]">{eyebrow}</p>
        <h1 className="mt-3 text-[clamp(32px,4vw,48px)] font-semibold leading-none tracking-[-0.045em]">{title}</h1>
        <p className="mt-3 max-w-[68ch] text-[13px] leading-6 text-[#686965]">{copy}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function AdminApp({ identity }: { identity: AdminIdentity }) {
  const { branding } = useBranding();
  const isAdmin = identity.role === "admin";
  const canManage = identity.role === "admin" || identity.role === "manager";
  const [active, setActive] = useState<SectionId>("overview");
  const [count, setCount] = useState(0);
  const [query, setQuery] = useState("");
  const [names, setNames] = useState<NameRecord[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionRecord[]>([]);
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMap>({});
  const [mode, setMode] = useState<ImportMode>("append");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [editing, setEditing] = useState<NameRecord | null>(null);
  const [adding, setAdding] = useState(false);
  const [reviewing, setReviewing] = useState<SuggestionDraft | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [manualName, setManualName] = useState<NameInput>({ mon: "", burmese: "", english: "", notes: "", credit: "" });
  const [roleSaving, setRoleSaving] = useState<string | null>(null);

  const preview = useMemo(() => rows.slice(0, 6), [rows]);
  const wordSuggestions = suggestions.filter((item) => item.kind === "word").length;
  const bugReports = suggestions.filter((item) => item.kind === "bug").length;

  useEffect(() => {
    void refreshWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function json<T>(response: Response): Promise<T & { error?: string }> {
    return response.json() as Promise<T & { error?: string }>;
  }

  async function refreshWorkspace() {
    const response = await fetch("/api/admin/session");
    if (response.status === 401) {
      window.location.assign("/sign-in?redirect_url=/admin");
      return;
    }
    if (!response.ok) return;
    const data = await json<{ count: number }>(response);
    setCount(data.count);
    await Promise.all([loadNames(""), canManage ? loadSuggestions() : Promise.resolve(), isAdmin ? loadTeam() : Promise.resolve()]);
  }

  async function loadNames(nextQuery: string) {
    const response = await fetch(`/api/admin/names?${new URLSearchParams({ q: nextQuery })}`);
    if (!response.ok) return;
    const data = await json<{ results: NameRecord[] }>(response);
    setNames(data.results);
  }

  async function loadSuggestions() {
    const response = await fetch("/api/admin/suggestions");
    if (!response.ok) return;
    const data = await json<{ suggestions: SuggestionRecord[] }>(response);
    setSuggestions(data.suggestions);
  }

  async function loadTeam() {
    const response = await fetch("/api/admin/team");
    if (!response.ok) return;
    const data = await json<{ users: TeamUser[] }>(response);
    setTeam(data.users);
  }

  function resetNotices() {
    setMessage("");
    setError("");
  }

  async function parseFile(next: File) {
    resetNotices();
    setBusy(true);
    const body = new FormData();
    body.append("file", next);
    const response = await fetch("/api/admin/import/parse", { method: "POST", headers: { "X-Yamu-Request": "1" }, body });
    const data = await json<{ filename?: string; headers?: string[]; rows?: Record<string, string>[]; suggestedMap?: ColumnMap }>(response);
    setBusy(false);
    if (!response.ok) return setError(data.error || "Could not read the file.");
    setFile(next);
    setFilename(data.filename || next.name);
    setHeaders(data.headers || []);
    setRows(data.rows || []);
    setMapping(data.suggestedMap || {});
    setStep("map");
  }

  async function commitImport() {
    resetNotices();
    setBusy(true);
    const response = await fetch("/api/admin/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Yamu-Request": "1" },
      body: JSON.stringify({ filename, rows, mapping, mode }),
    });
    const data = await json<{ imported?: number; total?: number }>(response);
    setBusy(false);
    if (!response.ok) return setError(data.error || "Import failed.");
    setCount(data.total ?? count);
    setMessage(`${data.imported ?? 0} names imported. SQLite and names.json are synchronized.`);
    setStep("done");
    await loadNames("");
  }

  function resetUpload() {
    setFile(null); setFilename(""); setHeaders([]); setRows([]); setMapping({}); setStep("upload"); resetNotices();
  }

  async function undoImport() {
    if (!window.confirm("Undo the most recent import and rewrite the live JSON catalog?")) return;
    setBusy(true); resetNotices();
    const response = await fetch("/api/admin/import/undo", { method: "POST", headers: { "X-Yamu-Request": "1" } });
    const data = await json<{ deleted?: number; restored?: number }>(response);
    setBusy(false);
    if (!response.ok) return setError(data.error || "Nothing to undo.");
    resetUpload();
    setMessage(`Removed ${data.deleted ?? 0} imported rows${data.restored ? ` and restored ${data.restored}` : ""}.`);
    await refreshWorkspace();
  }

  function editRow(row: NameRecord) {
    resetNotices();
    setEditing({ ...row, mon: row.monVariants.join(", "), burmese: row.burmeseVariants.join(", "), english: row.englishVariants.join(", ") });
  }

  async function saveName(event: FormEvent) {
    event.preventDefault();
    const draft = editing ?? manualName;
    setBusy(true); resetNotices();
    const response = await fetch(editing ? `/api/admin/names/${editing.id}` : "/api/admin/names", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", "X-Yamu-Request": "1" },
      body: JSON.stringify(draft),
    });
    const data = await json<{ count?: number; result?: NameRecord }>(response);
    setBusy(false);
    if (!response.ok) return setError(data.error || "Could not save the catalog entry.");
    setCount(data.count ?? (editing ? count : count + 1));
    setEditing(null); setAdding(false);
    setManualName({ mon: "", burmese: "", english: "", notes: "", credit: "" });
    setMessage(editing ? `Catalog entry #${editing.id} updated.` : "Catalog entry added and names.json rewritten.");
    await loadNames(query);
  }

  async function removeName(row: NameRecord) {
    const label = row.englishVariants[0] || row.burmeseVariants[0] || row.monVariants[0] || `#${row.id}`;
    if (!window.confirm(`Delete “${label}” from SQLite and names.json?`)) return;
    setDeletingId(row.id); resetNotices();
    const response = await fetch(`/api/admin/names/${row.id}`, { method: "DELETE", headers: { "X-Yamu-Request": "1" } });
    const data = await json<{ count?: number }>(response);
    setDeletingId(null);
    if (!response.ok) return setError(data.error || "Could not delete the entry.");
    setCount(data.count ?? Math.max(0, count - 1));
    setMessage(`“${label}” deleted.`);
    await loadNames(query);
  }

  function openReview(suggestion: SuggestionRecord) {
    resetNotices();
    setReviewing({
      suggestion,
      mon: suggestion.suggestedMon || (suggestion.source === "mon" ? suggestion.text : ""),
      burmese: suggestion.suggestedBurmese || (suggestion.source === "burmese" ? suggestion.text : ""),
      english: suggestion.suggestedEnglish || (suggestion.source === "english" ? suggestion.text : ""),
      notes: suggestion.note || (suggestion.context ? `Suggested from full name: ${suggestion.context}` : "User suggestion"),
      credit: suggestion.contributorName,
    });
  }

  async function reviewAction(id: number, action: "reject" | "resolve") {
    resetNotices();
    const response = await fetch(`/api/admin/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Yamu-Request": "1" },
      body: JSON.stringify({ action }),
    });
    const data = await json<Record<string, never>>(response);
    if (!response.ok) return setError(data.error || "Could not update the review queue.");
    setMessage(action === "resolve" ? "Bug report resolved." : "Suggestion rejected.");
    await loadSuggestions();
  }

  async function approveSuggestion(event: FormEvent) {
    event.preventDefault();
    if (!reviewing) return;
    setBusy(true); resetNotices();
    const response = await fetch(`/api/admin/suggestions/${reviewing.suggestion.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Yamu-Request": "1" },
      body: JSON.stringify({ action: "approve", name: { mon: reviewing.mon, burmese: reviewing.burmese, english: reviewing.english, notes: reviewing.notes, credit: reviewing.credit } }),
    });
    const data = await json<Record<string, never>>(response);
    setBusy(false);
    if (!response.ok) return setError(data.error || "Could not approve the suggestion.");
    setReviewing(null); setMessage("Suggestion approved and published to the catalog.");
    await refreshWorkspace();
  }

  async function changeRole(userId: string, role: AdminRole) {
    setRoleSaving(userId); resetNotices();
    const response = await fetch("/api/admin/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Yamu-Request": "1" },
      body: JSON.stringify({ userId, role }),
    });
    const data = await json<{ user?: TeamUser }>(response);
    setRoleSaving(null);
    if (!response.ok) return setError(data.error || "Could not update the role.");
    if (data.user) {
      const updated = data.user;
      setTeam((current) => current.map((item) => item.id === updated.id ? updated : item));
    }
    setMessage("Role updated in Clerk user metadata.");
  }

  const navItems: AppShellItem[] = [
    { id: "overview", label: "Overview", detail: "Catalog status", icon: LayoutDashboard },
    { id: "catalog", label: "Catalog", detail: "Names and variants", icon: Languages, badge: count },
    { id: "reviews", label: "Review queue", detail: "Suggestions and reports", icon: Inbox, badge: suggestions.length, hidden: !canManage },
    { id: "import", label: "Import desk", detail: "CSV and spreadsheet", icon: Upload, hidden: !canManage },
    { id: "team", label: "Team & roles", detail: "Access control", icon: Users, hidden: !isAdmin },
    { id: "branding", label: "Brand settings", detail: "Identity and assets", icon: Palette, hidden: !isAdmin },
  ];

  return (
    <AppShell1 identity={identity} siteName={branding.siteName} items={navItems} activeId={active} onNavigate={(id) => { setActive(id as SectionId); resetNotices(); }}>
      {message ? <p role="status" className="mb-5 border-l-2 border-[#2b7a51] bg-[#eef7f1] px-4 py-3 text-[12px] text-[#215f40]">{message}</p> : null}
      {error ? <p role="alert" className="mb-5 border-l-2 border-[var(--index-accent)] bg-[#fff1ec] px-4 py-3 text-[12px] text-[#a83e1c]">{error}</p> : null}

      {active === "overview" ? (
        <>
          <SectionHeading eyebrow="Workspace / live operations" title="Catalog control room." copy={`A role-aware view of ${branding.siteName}. Every write is applied to SQLite and the public JSON catalog together.`} actions={<button type="button" onClick={() => setActive("catalog")} className={primaryButton}>Open catalog <ArrowRight className="h-3.5 w-3.5" /></button>} />
          <Dashboard1 metrics={[
            { label: "Catalog entries", value: count.toLocaleString(), detail: "live, searchable records" },
            { label: "Review queue", value: canManage ? suggestions.length : "—", detail: canManage ? `${wordSuggestions} words · ${bugReports} reports` : "manager access required", emphasis: suggestions.length > 0 },
            { label: "Visible results", value: names.length, detail: query ? `filtered by “${query}”` : "latest catalog rows loaded" },
            { label: "Access level", value: identity.role, detail: "enforced by Clerk metadata" },
          ]} />

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <section className="border border-[#dedfdb] bg-white">
              <div className="border-b border-[#dedfdb] px-5 py-4"><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#777873]">Priority queue</p><h2 className="mt-2 text-[22px] font-semibold tracking-[-0.025em]">Next useful actions</h2></div>
              {[
                { label: "Review community submissions", detail: `${suggestions.length} pending items`, target: "reviews" as SectionId, show: canManage },
                { label: "Add or verify a catalog spelling", detail: "Write all three language forms", target: "catalog" as SectionId, show: true },
                { label: "Import a verified spreadsheet", detail: "Map columns before publishing", target: "import" as SectionId, show: canManage },
                { label: "Audit teammate roles", detail: `${team.length} Clerk accounts`, target: "team" as SectionId, show: isAdmin },
              ].filter((item) => item.show).map((item, index) => (
                <button key={item.label} type="button" onClick={() => setActive(item.target)} className="group grid w-full grid-cols-[38px_1fr_auto] items-center gap-3 border-b border-[#e6e7e3] px-5 py-4 text-left last:border-b-0 hover:bg-[#fafaf8]">
                  <span className="font-mono text-[10px] text-[#8a8b86]">0{index + 1}</span><span><span className="block text-[13px] font-medium">{item.label}</span><span className="mt-1 block text-[11px] text-[#777873]">{item.detail}</span></span><ArrowRight className="h-4 w-4 text-[#aaa] transition-transform group-hover:translate-x-1 group-hover:text-[var(--index-accent)]" />
                </button>
              ))}
            </section>

            <section className="border border-[#dedfdb] bg-[#141415] p-6 text-white">
              <ShieldCheck className="h-5 w-5 text-[var(--index-accent)]" />
              <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">Your access profile</p>
              <h2 className="mt-3 text-[30px] font-semibold capitalize tracking-[-0.035em]">{identity.role}</h2>
              <ul className="mt-6 space-y-3 text-[12px] text-white/62">
                <li className="flex gap-2"><Check className="h-4 w-4 text-white" /> Create and edit catalog entries</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-white" /> Export CSV and JSON</li>
                {canManage ? <li className="flex gap-2"><Check className="h-4 w-4 text-white" /> Import, delete, and review</li> : null}
                {isAdmin ? <li className="flex gap-2"><Check className="h-4 w-4 text-white" /> Manage branding and team roles</li> : null}
              </ul>
            </section>
          </div>
        </>
      ) : null}

      {active === "catalog" ? (
        <>
          <SectionHeading eyebrow="Live database / multilingual index" title="Catalog entries." copy="Search, add, and verify Mon, Burmese, and English forms. Editors may create and edit; destructive actions remain manager-only." actions={<a href="/api/admin/template" className={`${button} text-[#252624] no-underline`}><FileSpreadsheet className="h-3.5 w-3.5" /> CSV template</a>} />
          <DataTable1 rows={names} query={query} total={count} canWrite canDelete={canManage} deletingId={deletingId} onQuery={(value) => { setQuery(value); void loadNames(value); }} onAdd={() => { setAdding(true); resetNotices(); }} onEdit={editRow} onDelete={(row) => void removeName(row)} />
        </>
      ) : null}

      {active === "reviews" && canManage ? (
        <>
          <SectionHeading eyebrow="Community intake / pending" title="Review queue." copy="Verify proposed spellings before publication. Bug reports stay private and can be marked resolved here." />
          <div className="border border-[#dedfdb] bg-white">
            {suggestions.length ? suggestions.map((suggestion, index) => (
              <article key={suggestion.id} className="grid gap-4 border-b border-[#e2e3df] p-5 last:border-b-0 md:grid-cols-[56px_1fr_auto] md:items-center">
                <span className="font-mono text-[11px] text-[#878883]">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2"><span className={`px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] ${suggestion.kind === "bug" ? "bg-[#fff0eb] text-[#a54020]" : "bg-[#efefec] text-[#555652]"}`}>{suggestion.kind === "bug" ? "Bug report" : suggestion.source}</span><span className="text-[10px] text-[#8a8b86]">#{suggestion.id}</span></div>
                  <p lang={suggestion.source === "mon" ? "mnw" : suggestion.source === "burmese" ? "my" : "en"} className={`mt-3 text-[18px] font-semibold ${suggestion.source !== "english" ? "font-script" : ""}`}>{suggestion.text}</p>
                  <p className="mt-1 text-[11px] text-[#777873]">{suggestion.contributorName ? `From ${suggestion.contributorName}` : "Anonymous submission"}{suggestion.note ? ` · ${suggestion.note}` : ""}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {suggestion.kind === "bug" ? <button type="button" onClick={() => void reviewAction(suggestion.id, "resolve")} className={primaryButton}><Bug className="h-3.5 w-3.5" /> Resolve</button> : <><button type="button" onClick={() => void reviewAction(suggestion.id, "reject")} className={button}>Reject</button><button type="button" onClick={() => openReview(suggestion)} className={primaryButton}>Review <ArrowRight className="h-3.5 w-3.5" /></button></>}
                </div>
              </article>
            )) : <div className="px-6 py-20 text-center"><Check className="mx-auto h-6 w-6 text-[#2b7a51]" /><h2 className="mt-4 text-[22px] font-semibold">Queue clear.</h2><p className="mt-2 text-[12px] text-[#777873]">No suggestions or bug reports are waiting.</p></div>}
          </div>
        </>
      ) : null}

      {active === "import" && canManage ? (
        <>
          <SectionHeading eyebrow="Data pipeline / controlled write" title="Import desk." copy="Upload a CSV or spreadsheet, map each source column, then append to or replace the catalog. A replace can be undone once." actions={step !== "upload" ? <button type="button" onClick={resetUpload} className={button}>Start over</button> : undefined} />
          <div className="mb-5 grid border-l border-t border-[#dedfdb] sm:grid-cols-3">
            {(["upload", "map", "done"] as ImportStep[]).map((item, index) => <div key={item} className={`border-b border-r border-[#dedfdb] px-4 py-3 ${step === item ? "bg-[#141415] text-white" : "bg-white"}`}><p className="font-mono text-[9px] uppercase tracking-[0.11em] opacity-55">0{index + 1}</p><p className="mt-1 text-[12px] font-medium capitalize">{item === "map" ? "Map columns" : item}</p></div>)}
          </div>
          {step === "upload" ? <label onDragOver={(event) => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(event) => { event.preventDefault(); setDragOver(false); const next = event.dataTransfer.files[0]; if (next) void parseFile(next); }} className={`flex min-h-[360px] cursor-pointer flex-col items-center justify-center border border-dashed bg-white px-6 text-center ${dragOver ? "border-[var(--index-accent)] bg-[#fff8f5]" : "border-[#747570]"}`}><Upload className="h-6 w-6" /><h2 className="mt-6 text-[32px] font-semibold tracking-[-0.035em]">Drop .csv or .xlsx</h2><p className="mt-3 max-w-[48ch] text-[12px] leading-5 text-[#73746f]">A header row is required. Columns are detected automatically and can be corrected before anything is written.</p><span className={`mt-6 ${primaryButton}`}>{busy ? "Reading…" : "Choose source file"}</span><input type="file" accept=".csv,.xlsx,.xls,.txt" className="sr-only" onChange={(event) => { const next = event.target.files?.[0]; if (next) void parseFile(next); }} /></label> : null}
          {step === "map" ? <section className="border border-[#dedfdb] bg-white"><div className="flex flex-col gap-4 border-b border-[#dedfdb] p-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#82837e]">{rows.length} source rows</p><h2 className="mt-2 text-[22px] font-semibold">{filename}</h2></div><div className="flex border border-[#bfc0bc]">{(["append", "replace"] as ImportMode[]).map((item) => <button key={item} type="button" onClick={() => setMode(item)} className={`h-10 px-4 text-[11px] font-medium capitalize ${mode === item ? "bg-[#141415] text-white" : "bg-white"}`}>{item}</button>)}</div></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-[12px]"><thead><tr>{headers.map((header) => <th key={header} className="border-b border-r border-[#dedfdb] p-3 last:border-r-0"><span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.1em] text-[#777873]">{header}</span><select value={mapping[header] ?? "skip"} onChange={(event) => setMapping((current) => ({ ...current, [header]: event.target.value as ColumnKey }))} className="h-9 w-full border border-[#c6c7c3] bg-white px-2">{FIELD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></th>)}</tr></thead><tbody>{preview.map((row, index) => <tr key={index} className="border-b border-[#e6e7e3] last:border-b-0">{headers.map((header) => <td key={header} className="max-w-[260px] border-r border-[#e6e7e3] px-3 py-3 font-script last:border-r-0">{row[header]}</td>)}</tr>)}</tbody></table></div><div className="flex justify-end border-t border-[#dedfdb] p-4"><button type="button" disabled={busy} onClick={() => void commitImport()} className={primaryButton}>{busy ? "Writing…" : "Import and publish"} <ArrowRight className="h-3.5 w-3.5" /></button></div></section> : null}
          {step === "done" ? <section className="border border-[#dedfdb] bg-white p-8 md:p-12"><span className="inline-flex h-10 w-10 items-center justify-center bg-[#e8f5ed] text-[#216240]"><Check className="h-5 w-5" /></span><h2 className="mt-7 text-[36px] font-semibold tracking-[-0.04em]">Catalog and JSON agree.</h2><p className="mt-3 max-w-[60ch] text-[13px] leading-6 text-[#686965]">{message}</p><div className="mt-7 flex gap-2"><button type="button" onClick={resetUpload} className={primaryButton}>Import another</button><button type="button" disabled={busy} onClick={() => void undoImport()} className={button}>Undo last import</button></div></section> : null}
          {file && step === "upload" ? <p className="mt-3 text-[11px] text-[#777873]">Selected: {file.name}</p> : null}
        </>
      ) : null}

      {active === "team" && isAdmin ? (
        <>
          <SectionHeading eyebrow="Clerk users / public metadata" title="Team and roles." copy="Admins control access levels. Managers operate imports and reviews; editors maintain entries without destructive permissions." actions={<a href="https://dashboard.clerk.com/" target="_blank" rel="noreferrer" className={`${button} text-[#252624] no-underline`}>Open Clerk dashboard</a>} />
          <div className="overflow-x-auto border border-[#dedfdb] bg-white">
            <table className="w-full min-w-[720px] text-left text-[13px]"><thead><tr className="border-b border-[#dedfdb] bg-[#f4f4f1]">{["Teammate", "Email", "Role", "Last sign-in"].map((label) => <th key={label} className="h-10 px-4 font-mono text-[9px] font-medium uppercase tracking-[0.11em] text-[#73746f]">{label}</th>)}</tr></thead><tbody>{team.map((user) => <tr key={user.id} className="border-b border-[#e6e7e3] last:border-b-0"><td className="px-4 py-3"><div className="flex items-center gap-3"><Image src={user.imageUrl} alt="" width={32} height={32} unoptimized className="h-8 w-8 bg-[#efefec] object-cover" /><span className="font-medium">{user.name}{user.id === identity.userId ? <span className="ml-2 text-[10px] text-[#858681]">You</span> : null}</span></div></td><td className="px-4 py-3 text-[#666762]">{user.email}</td><td className="px-4 py-3"><select value={user.role} disabled={roleSaving === user.id || user.id === identity.userId} onChange={(event) => void changeRole(user.id, event.target.value as AdminRole)} className="h-9 min-w-32 border border-[#c8c9c5] bg-white px-2 text-[12px] capitalize disabled:bg-[#f1f1ee]">{(["admin", "manager", "editor"] as AdminRole[]).map((role) => <option key={role} value={role}>{role}</option>)}</select></td><td className="px-4 py-3 text-[12px] text-[#777873]">{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : "Never"}</td></tr>)}</tbody></table>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">{[{ role: "Admin", detail: "Full access, branding, and roles" }, { role: "Manager", detail: "Catalog, imports, delete, and reviews" }, { role: "Editor", detail: "Catalog create, edit, and export" }].map((item) => <article key={item.role} className="border border-[#dedfdb] bg-white p-4"><p className="font-mono text-[10px] uppercase tracking-[0.11em] text-[#777873]">{item.role}</p><p className="mt-2 text-[12px] text-[#555652]">{item.detail}</p></article>)}</div>
        </>
      ) : null}

      {active === "branding" && isAdmin ? <><SectionHeading eyebrow="Site identity / global" title="Brand settings." copy="Update the public name, tagline, accent, logo, and favicon. These changes affect the live converter as well as the admin shell." /><BrandSettings /></> : null}

      {(adding || editing) ? (
        <div role="dialog" aria-modal="true" aria-labelledby="catalog-form-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <form onSubmit={saveName} className="max-h-[calc(100vh-32px)] w-full max-w-2xl overflow-y-auto border border-[#222] bg-[#fafaf8]">
            <div className="flex items-center justify-between border-b border-[#d9dad6] px-5 py-4"><div><p className="font-mono text-[9px] uppercase tracking-[0.11em] text-[#7d7e79]">SQLite + JSON</p><h2 id="catalog-form-title" className="mt-1 text-[22px] font-semibold">{editing ? "Edit catalog entry" : "Add verified word"}</h2></div><button type="button" onClick={() => { setAdding(false); setEditing(null); resetNotices(); }} className="p-2 text-[20px]" aria-label="Close">×</button></div>
            <div className="grid gap-5 p-5 md:grid-cols-2">{(["mon", "burmese", "english"] as const).map((key) => <label key={key} className={key === "english" ? "md:col-span-2" : ""}><span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#6f706c]">{key} variants</span><input required lang={key === "mon" ? "mnw" : key === "burmese" ? "my" : "en"} value={(editing ?? manualName)[key]} onChange={(event) => editing ? setEditing({ ...editing, [key]: event.target.value }) : setManualName({ ...manualName, [key]: event.target.value })} placeholder="Separate alternate spellings with commas" className={`${field} ${key !== "english" ? "font-script text-[16px]" : ""}`} /></label>)}<label className="md:col-span-2"><span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#6f706c]">Notes</span><textarea rows={3} value={(editing ?? manualName).notes ?? ""} onChange={(event) => editing ? setEditing({ ...editing, notes: event.target.value }) : setManualName({ ...manualName, notes: event.target.value })} className={`${field} h-auto py-3`} /></label><label className="md:col-span-2"><span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#6f706c]">Contributor credit</span><input value={(editing ?? manualName).credit ?? ""} onChange={(event) => editing ? setEditing({ ...editing, credit: event.target.value }) : setManualName({ ...manualName, credit: event.target.value })} className={field} /></label>{error ? <p role="alert" className="md:col-span-2 text-[12px] text-[#a83e1c]">{error}</p> : null}</div>
            <div className="flex justify-end gap-2 border-t border-[#d9dad6] p-4"><button type="button" onClick={() => { setAdding(false); setEditing(null); resetNotices(); }} className={button}>Cancel</button><button type="submit" disabled={busy} className={primaryButton}>{busy ? "Saving…" : "Save and publish"}</button></div>
          </form>
        </div>
      ) : null}

      {reviewing ? (
        <div role="dialog" aria-modal="true" aria-labelledby="review-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"><form onSubmit={approveSuggestion} className="max-h-[calc(100vh-32px)] w-full max-w-2xl overflow-y-auto border border-[#222] bg-[#fafaf8]"><div className="flex items-center justify-between border-b border-[#d9dad6] px-5 py-4"><div><p className="font-mono text-[9px] uppercase tracking-[0.11em] text-[#7d7e79]">Suggestion #{reviewing.suggestion.id}</p><h2 id="review-title" className="mt-1 text-[22px] font-semibold">Verify before publishing</h2></div><button type="button" onClick={() => { setReviewing(null); resetNotices(); }} className="p-2 text-[20px]" aria-label="Close">×</button></div><div className="space-y-5 p-5"><div className="border border-[#dedfdb] bg-white p-4"><p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#777873]">Submitted form</p><p className={`mt-2 text-[24px] font-semibold ${reviewing.suggestion.source !== "english" ? "font-script" : ""}`}>{reviewing.suggestion.text}</p></div>{(["mon", "burmese", "english"] as const).map((key) => <label key={key} className="block"><span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#6f706c]">{key} variants</span><input required value={reviewing[key]} onChange={(event) => setReviewing({ ...reviewing, [key]: event.target.value })} className={`${field} ${key !== "english" ? "font-script text-[16px]" : ""}`} /></label>)}<label className="block"><span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#6f706c]">Catalog notes</span><textarea rows={3} value={reviewing.notes} onChange={(event) => setReviewing({ ...reviewing, notes: event.target.value })} className={`${field} h-auto py-3`} /></label><label className="block"><span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#6f706c]">Contributor credit</span><input value={reviewing.credit} onChange={(event) => setReviewing({ ...reviewing, credit: event.target.value })} className={field} /></label>{error ? <p role="alert" className="text-[12px] text-[#a83e1c]">{error}</p> : null}</div><div className="flex justify-end gap-2 border-t border-[#d9dad6] p-4"><button type="button" onClick={() => { setReviewing(null); resetNotices(); }} className={button}>Cancel</button><button type="submit" disabled={busy} className={primaryButton}>{busy ? "Publishing…" : "Approve and publish"}</button></div></form></div>
      ) : null}
    </AppShell1>
  );
}
