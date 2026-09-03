"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { DepthCard } from "@/components/reactbits/DepthCard";
import { ShinyText } from "@/components/reactbits/ShinyText";

export function ReportBugButton() {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [reporter, setReporter] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const summaryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setReporter(window.localStorage.getItem("yamu-contributor-name") ?? "");
    window.setTimeout(() => summaryRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Yamu-Request": "1" },
        body: JSON.stringify({
          kind: "bug",
          text: summary,
          source: "english",
          context: `${window.location.pathname}${window.location.search}`,
          note: details,
          contributorName: reporter,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not send the report.");
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not send the report.");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setSent(false);
    setError("");
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="relative flex min-w-10 items-center justify-center border-r border-pewter px-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-mist sm:min-w-0 sm:px-4" aria-haspopup="dialog" aria-label="Report a bug">
        <span className="sm:hidden" aria-hidden="true">!</span>
        <span className="hidden sm:inline">Report bug</span>
      </button>
      {open ? (
        <div className="theme-overlay issue-desk-overlay fixed inset-0 z-[80] grid place-items-center overflow-y-auto p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <DepthCard className="w-full max-w-2xl" maxRotation={1} maxTranslation={1} spotlightColor="color-mix(in srgb, var(--index-accent) 12%, transparent)">
            <section role="dialog" aria-modal="true" aria-labelledby="bug-report-title" className="issue-desk-enter w-full border border-ink bg-canvas shadow-[12px_12px_0_var(--index-ink)]">
              <div className="grid border-b border-ink sm:grid-cols-[126px_1fr_auto]">
                <div className="bg-accent px-5 py-4 text-on-accent">
                  <p className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] opacity-70">Issue desk</p>
                  <p className="mt-4 font-display text-[32px] font-semibold leading-none">BUG</p>
                </div>
                <div className="px-5 py-5 sm:px-6">
                  <h2 id="bug-report-title" className="text-[26px] font-semibold tracking-[-0.035em] text-ink">Something went wrong?</h2>
                  <p className="mt-2 max-w-[48ch] text-[12px] leading-5 text-ash">Describe what you expected and what happened. The current page is attached automatically.</p>
                </div>
                <button type="button" onClick={close} aria-label="Close bug report" className="absolute right-5 top-4 text-[26px] text-ink sm:static sm:min-w-16 sm:border-l sm:border-pewter">×</button>
              </div>

              {sent ? (
                <div className="result-enter px-5 py-8 sm:px-7">
                  <p className="font-display text-[12px] font-semibold uppercase tracking-[0.08em] text-success"><ShinyText>Report received</ShinyText></p>
                  <p className="mt-3 text-[20px] font-semibold text-ink">Thank you. It is now on the admin docket.</p>
                  <button type="button" onClick={close} className="mt-6 min-h-11 bg-ink px-6 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-canvas">Close issue desk</button>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <label className="block border-b border-pewter px-5 py-5 text-ash sm:px-7">
                    <span className="micro-label">01 / Short summary</span>
                    <input ref={summaryRef} required maxLength={120} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Example: Search button stops responding" className="mt-3 h-14 w-full border-b-2 border-ink bg-transparent px-0 text-[20px] font-semibold tracking-[-0.02em] text-ink outline-none placeholder:text-stone focus:border-accent" />
                  </label>
                  <label className="block border-b border-pewter px-5 py-5 text-ash sm:px-7">
                    <span className="micro-label">02 / What happened?</span>
                    <textarea required maxLength={1500} rows={5} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="What did you do, what did you expect, and what happened instead?" className="mt-3 w-full resize-y border border-ink bg-paper px-4 py-3 font-sans text-[14px] font-normal normal-case tracking-normal text-ink outline-none placeholder:text-stone focus:border-accent" />
                  </label>
                  <label className="block px-5 py-5 text-ash sm:px-7">
                    <span className="micro-label">Reporter name <span className="text-stone">/ optional, private</span></span>
                    <input maxLength={80} autoComplete="name" value={reporter} onChange={(event) => setReporter(event.target.value)} placeholder="Helps the admin recognize your report" className="mt-2 h-11 w-full border border-pewter bg-paper px-3 font-sans text-[13px] font-normal normal-case tracking-normal text-ink outline-none placeholder:text-stone focus:border-accent" />
                  </label>
                  <div className="flex flex-col-reverse gap-2 border-t border-ink px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-stone">Page captured · no screenshot or email</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={close} className="min-h-11 border border-ink px-5 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-ink">Cancel</button>
                      <button type="submit" disabled={busy} className="min-h-11 bg-accent px-5 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-on-accent disabled:opacity-50">{busy ? "Sending…" : "Send report →"}</button>
                    </div>
                  </div>
                  {error ? <p role="alert" className="border-t border-accent px-5 py-3 text-[12px] text-accent sm:px-7">{error}</p> : null}
                </form>
              )}
            </section>
          </DepthCard>
        </div>
      ) : null}
    </>
  );
}
