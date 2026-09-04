"use client";

import { Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { NameRecord } from "@/lib/types";

type Props = {
  rows: NameRecord[];
  query: string;
  total: number;
  canWrite: boolean;
  canDelete: boolean;
  deletingId: number | null;
  onQuery: (value: string) => void;
  onAdd: () => void;
  onEdit: (row: NameRecord) => void;
  onDelete: (row: NameRecord) => void;
};

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--index-accent)] focus-visible:ring-offset-2";

export default function DataTable1({ rows, query, total, canWrite, canDelete, deletingId, onQuery, onAdd, onEdit, onDelete }: Props) {
  return (
    <section className="border border-pewter bg-paper">
      <div className="flex flex-col gap-3 border-b border-pewter p-4 md:flex-row md:items-center md:justify-between">
        <label className="relative block max-w-xl flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
          <span className="sr-only">Filter catalog</span>
          <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search Mon, Burmese, English, notes…" className={`${focus} h-10 w-full border border-pewter bg-canvas pl-9 pr-3 text-[13px] text-ink placeholder:text-stone`} />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.1em] text-stone">{rows.length} shown / {total} live</span>
          <a href="/api/admin/export?format=csv" className={`${focus} inline-flex h-10 items-center gap-2 border border-pewter px-3 text-[11px] font-medium text-ash no-underline hover:border-ink`}><Download className="h-3.5 w-3.5" /> CSV</a>
          <a href="/api/admin/export?format=json" className={`${focus} inline-flex h-10 items-center gap-2 border border-pewter px-3 text-[11px] font-medium text-ash no-underline hover:border-ink`}><Download className="h-3.5 w-3.5" /> JSON</a>
          {canWrite ? <button type="button" onClick={onAdd} className={`${focus} inline-flex h-10 items-center gap-2 bg-[var(--index-accent)] px-4 text-[11px] font-semibold text-on-accent hover:brightness-95`}><Plus className="h-3.5 w-3.5" /> Add word</button> : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-pewter bg-mist">
              {["Mon", "Burmese", "English", "Notes", "Credit", "Actions"].map((label) => <th key={label} className="h-10 px-4 font-mono text-[9px] font-medium uppercase tracking-[0.11em] text-stone">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const label = row.englishVariants[0] || row.burmeseVariants[0] || row.monVariants[0] || `name ${row.id}`;
              return (
                <tr key={row.id} className="border-b border-pewter last:border-b-0 hover:bg-mist">
                  <td lang="mnw" className="max-w-[220px] px-4 py-3 font-script text-[15px]">{row.monVariants.join(" · ")}</td>
                  <td lang="my" className="max-w-[220px] px-4 py-3 font-script text-[15px]">{row.burmeseVariants.join(" · ")}</td>
                  <td className="max-w-[220px] px-4 py-3 font-medium">{row.englishVariants.join(" · ")}</td>
                  <td className="max-w-[300px] px-4 py-3 text-[12px] leading-5 text-ash">{row.notes || "—"}</td>
                  <td className="px-4 py-3 text-[12px] text-ash">{row.credit || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {canWrite ? <button type="button" onClick={() => onEdit(row)} className={`${focus} p-2 text-ash hover:bg-mist hover:text-ink`} aria-label={`Edit ${label}`}><Pencil className="h-3.5 w-3.5" /></button> : null}
                      {canDelete ? <button type="button" disabled={deletingId === row.id} onClick={() => onDelete(row)} className={`${focus} p-2 text-stone hover:bg-mist hover:text-[var(--index-accent)] disabled:opacity-40`} aria-label={`Delete ${label}`}><Trash2 className="h-3.5 w-3.5" /></button> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length ? (
              <tr><td colSpan={6} className="px-5 py-16 text-center"><p className="font-medium">No catalog entries match.</p><p className="mt-2 text-[12px] text-stone">Try a broader search or add a verified spelling.</p></td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
