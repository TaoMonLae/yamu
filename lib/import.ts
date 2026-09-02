import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { ColumnKey, ColumnMap, NameInput } from "@/lib/types";
import { formatVariantCell } from "@/lib/variants";

const HEADER_ALIASES: Record<string, ColumnKey> = {
  mon: "mon",
  mnw: "mon",
  "mon name": "mon",
  "mon_name": "mon",
  burmese: "burmese",
  myanmar: "burmese",
  my: "burmese",
  mm: "burmese",
  "burmese name": "burmese",
  english: "english",
  en: "english",
  "english name": "english",
  name: "english",
  notes: "notes",
  note: "notes",
  remark: "notes",
  remarks: "notes",
  credit: "credit",
  contributor: "credit",
  "contributed by": "credit",
};

export function parseSpreadsheet(buffer: Buffer, filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    return parseCsv(buffer.toString("utf8"));
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseXlsx(buffer);
  }
  throw new Error("Use a .xlsx or .csv file.");
}

function parseCsv(text: string) {
  const parsed = Papa.parse<string[]>(text, {
    skipEmptyLines: "greedy",
  });
  if (parsed.errors.length) {
    throw new Error(parsed.errors[0]?.message || "Could not read CSV.");
  }
  return tableFromRows(parsed.data);
}

function parseXlsx(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("The spreadsheet has no sheets.");
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  return tableFromRows(rows);
}

function tableFromRows(rows: string[][]) {
  const cleaned = rows
    .map((row) => row.map((cell) => String(cell ?? "").trim()))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (cleaned.length < 2) {
    throw new Error("The file needs a header row and at least one name row.");
  }

  const headers = uniquifyHeaders(cleaned[0]);
  const body = cleaned.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? "";
    });
    return record;
  });

  return {
    headers,
    rows: body,
    suggestedMap: suggestColumnMap(headers),
  };
}

function uniquifyHeaders(headers: string[]) {
  const seen = new Map<string, number>();
  return headers.map((raw, index) => {
    const base = raw || `column_${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

export function suggestColumnMap(headers: string[]): ColumnMap {
  const used = new Set<ColumnKey>();
  const map: ColumnMap = {};

  for (const header of headers) {
    const key = HEADER_ALIASES[header.toLowerCase().replace(/\s+/g, " ")];
    if (key && key !== "skip" && !used.has(key)) {
      map[header] = key;
      used.add(key);
    } else {
      map[header] = "skip";
    }
  }

  return map;
}

export function applyColumnMap(
  rows: Record<string, string>[],
  mapping: ColumnMap,
): { records: NameInput[]; errors: string[] } {
  const errors: string[] = [];
  const values = Object.values(mapping);
  const allowed = new Set<ColumnKey>(["mon", "burmese", "english", "notes", "credit", "skip"]);
  if (values.some((value) => !allowed.has(value))) {
    errors.push("The column mapping contains an unsupported destination.");
  }
  for (const required of ["mon", "burmese", "english"] as const) {
    const count = values.filter((value) => value === required).length;
    if (count === 0) {
      errors.push(`Map a column to ${required}.`);
    } else if (count > 1) {
      errors.push(`Map exactly one column to ${required}.`);
    }
  }
  if (values.filter((value) => value === "notes").length > 1) {
    errors.push("Map no more than one column to notes.");
  }
  if (values.filter((value) => value === "credit").length > 1) {
    errors.push("Map no more than one column to credit.");
  }
  if (errors.length) return { records: [], errors };

  const records: NameInput[] = [];
  rows.forEach((row, index) => {
    const next: NameInput = { mon: "", burmese: "", english: "", notes: "", credit: "" };
    for (const [header, key] of Object.entries(mapping)) {
      if (key === "skip") continue;
      const value = String(row[header] ?? "").trim();
      next[key] = key === "notes" || key === "credit" ? value : formatVariantCell(value);
    }
    if (!next.mon || !next.burmese || !next.english) {
      errors.push(`Row ${index + 2} is missing Mon, Burmese, or English.`);
      return;
    }
    records.push(next);
  });

  if (!records.length && !errors.length) {
    errors.push("No valid name rows found.");
  }

  return { records, errors };
}
