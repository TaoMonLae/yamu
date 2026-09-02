import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { dataDir, dbPath, jsonPath } from "@/lib/paths";
import { SEED_NAMES } from "@/lib/seed";
import type {
  Language,
  NameInput,
  NameRecord,
  SearchResultSet,
  SourceLanguage,
  SuggestionKind,
  SuggestionRecord,
  SuggestionStatus,
} from "@/lib/types";
import { formatVariantCell, parseVariantCell } from "@/lib/variants";

type NameRow = {
  id: number;
  mon: string;
  burmese: string;
  english: string;
  notes: string;
  credit: string;
  batch_id: string | null;
  created_at: string;
};

type SuggestionRow = {
  id: number;
  kind: SuggestionKind;
  suggested_text: string;
  source_language: Language;
  context: string;
  note: string;
  contributor_name: string;
  suggested_mon: string;
  suggested_burmese: string;
  suggested_english: string;
  status: SuggestionStatus;
  linked_name_id: number | null;
  created_at: string;
  reviewed_at: string | null;
};

type ImportBackupRow = {
  import_id: string;
  names_json: string;
};

type PortableName = {
  mon?: string | string[];
  burmese?: string | string[];
  english?: string | string[];
  notes?: string;
  credit?: string;
};

let db: Database.Database | null = null;

function portableCell(value: PortableName["mon"]) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string").join(", ");
  return typeof value === "string" ? value : "";
}

function initialCatalog(): NameInput[] {
  const candidates = [
    process.env.INITIAL_CATALOG_PATH,
    path.join(process.cwd(), "data", "names.json"),
    path.resolve(process.cwd(), "..", "..", "data", "names.json"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of [...new Set(candidates)]) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf8")) as unknown;
      if (!Array.isArray(parsed)) continue;
      const records = parsed.flatMap((item): NameInput[] => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const row = item as PortableName;
        const mon = portableCell(row.mon);
        const burmese = portableCell(row.burmese);
        const english = portableCell(row.english);
        if (!mon && !burmese && !english) return [];
        return [{
          mon,
          burmese,
          english,
          notes: typeof row.notes === "string" ? row.notes : "",
          credit: typeof row.credit === "string" ? row.credit : "",
        }];
      });
      if (records.length > 0) return records;
    } catch {
      // Try the next known catalog location, then fall back to the sample seed.
    }
  }
  return [];
}

function mapRow(row: NameRow): NameRecord {
  const monVariants = parseVariantCell(row.mon);
  const burmeseVariants = parseVariantCell(row.burmese);
  const englishVariants = parseVariantCell(row.english);

  return {
    id: row.id,
    mon: monVariants[0] ?? "",
    burmese: burmeseVariants[0] ?? "",
    english: englishVariants[0] ?? "",
    monVariants,
    burmeseVariants,
    englishVariants,
    notes: row.notes ?? "",
    credit: row.credit ?? "",
    batchId: row.batch_id,
    createdAt: row.created_at,
  };
}

function mapSuggestion(row: SuggestionRow): SuggestionRecord {
  return {
    id: row.id,
    kind: row.kind,
    text: row.suggested_text,
    source: row.source_language,
    context: row.context,
    note: row.note,
    contributorName: row.contributor_name,
    suggestedMon: row.suggested_mon,
    suggestedBurmese: row.suggested_burmese,
    suggestedEnglish: row.suggested_english,
    status: row.status,
    linkedNameId: row.linked_name_id,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export function getDb() {
  if (db) return db;

  fs.mkdirSync(dataDir(), { recursive: true });
  db = new Database(dbPath());
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS names (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mon TEXT NOT NULL,
      burmese TEXT NOT NULL,
      english TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      credit TEXT NOT NULL DEFAULT '',
      batch_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_names_mon ON names(mon);
    CREATE INDEX IF NOT EXISTS idx_names_burmese ON names(burmese);
    CREATE INDEX IF NOT EXISTS idx_names_english ON names(english);
    CREATE INDEX IF NOT EXISTS idx_names_batch ON names(batch_id);

    CREATE TABLE IF NOT EXISTS imports (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS import_backups (
      import_id TEXT PRIMARY KEY,
      names_json TEXT NOT NULL,
      FOREIGN KEY (import_id) REFERENCES imports(id)
    );

    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL DEFAULT 'word',
      suggested_text TEXT NOT NULL,
      normalized_text TEXT NOT NULL,
      source_language TEXT NOT NULL,
      context TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      contributor_name TEXT NOT NULL DEFAULT '',
      suggested_mon TEXT NOT NULL DEFAULT '',
      suggested_burmese TEXT NOT NULL DEFAULT '',
      suggested_english TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      linked_name_id INTEGER,
      created_at TEXT NOT NULL,
      reviewed_at TEXT,
      FOREIGN KEY (linked_name_id) REFERENCES names(id)
    );
    CREATE INDEX IF NOT EXISTS idx_suggestions_status_created
      ON suggestions(status, created_at DESC);
  `);

  const ensureColumn = (table: string, name: string, definition: string) => {
    const columns = db!.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === name)) {
      db!.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    }
  };
  ensureColumn("names", "credit", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("suggestions", "kind", "TEXT NOT NULL DEFAULT 'word'");
  ensureColumn("suggestions", "contributor_name", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("suggestions", "suggested_mon", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("suggestions", "suggested_burmese", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("suggestions", "suggested_english", "TEXT NOT NULL DEFAULT ''");
  db.exec(`
    DROP INDEX IF EXISTS idx_suggestions_pending_unique;
    CREATE UNIQUE INDEX idx_suggestions_pending_unique
      ON suggestions(kind, normalized_text, source_language)
      WHERE status = 'pending';
  `);

  const seedVariantMigration = db
    .prepare(
      `UPDATE names
       SET english = ?, notes = ?
       WHERE batch_id = 'seed' AND english = 'Naing' AND notes = 'Sample seed'`,
    )
    .run("Nai, Naing", "Sample seed · 2 English variants");
  if (seedVariantMigration.changes > 0) exportNamesJson();

  const count = db.prepare("SELECT COUNT(*) AS n FROM names").get() as { n: number };
  if (count.n === 0) {
    const bootstrapRecords = initialCatalog();
    const records = bootstrapRecords.length > 0 ? bootstrapRecords : SEED_NAMES;
    insertNames(records, "seed");
    db.prepare(
      "INSERT INTO imports (id, filename, row_count, created_at) VALUES (?, ?, ?, ?)",
    ).run("seed", bootstrapRecords.length > 0 ? "names.json" : "seed.json", records.length, new Date().toISOString());
    exportNamesJson();
  }

  return db;
}

function likePattern(value: string) {
  return `%${value.replace(/[!%_]/g, (character) => `!${character}`)}%`;
}

export function listNames(query = "", limit = 200): NameRecord[] {
  const database = getDb();
  const q = query.trim();
  if (!q) {
    return database
      .prepare("SELECT * FROM names ORDER BY id DESC LIMIT ?")
      .all(limit)
      .map((row) => mapRow(row as NameRow));
  }

  const like = likePattern(q);
  return database
    .prepare(
      `SELECT * FROM names
       WHERE mon LIKE ? ESCAPE '!' OR burmese LIKE ? ESCAPE '!' OR english LIKE ? ESCAPE '!' OR notes LIKE ? ESCAPE '!' OR credit LIKE ? ESCAPE '!'
       ORDER BY id DESC
       LIMIT ?`,
    )
    .all(like, like, like, like, like, limit)
    .map((row) => mapRow(row as NameRow));
}

export function searchNames(
  query: string,
  source: SourceLanguage = "auto",
  limit: number | null = 40,
): NameRecord[] {
  const database = getDb();
  const q = query.trim();
  if (!q) return [];

  const like = likePattern(q);
  const columns: Language[] =
    source === "auto" ? ["mon", "burmese", "english"] : [source];
  const where = columns.map((column) => `${column} LIKE ? ESCAPE '!'`).join(" OR ");
  const params = columns.map(() => like);

  const statement = `SELECT * FROM names WHERE ${where} ORDER BY english COLLATE NOCASE, id${
    limit === null ? "" : " LIMIT ?"
  }`;
  return database
    .prepare(statement)
    .all(...params, ...(limit === null ? [] : [limit]))
    .map((row) => mapRow(row as NameRow));
}

function normalizeLookup(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

function compactLookup(value: string) {
  return normalizeLookup(value).replace(/[\s\p{P}\p{S}]+/gu, "");
}

function hasMyanmarScript(value: string) {
  return /[\u1000-\u109f\uaa60-\uaa7f\ua9e0-\ua9ff]/u.test(value);
}

function exactMatches(query: string, source: SourceLanguage): NameRecord[] {
  const normalized = normalizeLookup(query);
  return searchNames(query, source, null).filter((row) => {
    const variants =
      source === "mon"
        ? row.monVariants
        : source === "burmese"
          ? row.burmeseVariants
          : source === "english"
            ? row.englishVariants
            : [...row.monVariants, ...row.burmeseVariants, ...row.englishVariants];
    return variants.some((variant) => normalizeLookup(variant) === normalized);
  });
}

function segmentContinuousName(
  query: string,
  source: SourceLanguage,
): { tokens: string[]; source: Language } | null {
  if (!hasMyanmarScript(query) || /\s/u.test(query) || source === "english") return null;

  const rows = getDb()
    .prepare("SELECT * FROM names ORDER BY id")
    .all()
    .map((row) => mapRow(row as NameRow));
  const candidateSources: Language[] = source === "auto" ? ["mon", "burmese"] : [source];
  const compactQuery = compactLookup(query);

  for (const candidateSource of candidateSources) {
    const variantKey = `${candidateSource}Variants` as const;
    const dictionary = new Map<string, string>();
    for (const row of rows) {
      for (const variant of row[variantKey]) {
        const compact = compactLookup(variant);
        if (compact) dictionary.set(compact, variant);
      }
    }

    const entries = [...dictionary.entries()]
      .map(([compact, original]) => ({ compact, original }))
      .sort((a, b) => b.compact.length - a.compact.length);
    const best = new Map<number, string[] | null>();

    function walk(position: number): string[] | null {
      if (position === compactQuery.length) return [];
      if (best.has(position)) return best.get(position) ?? null;

      let bestTokens: string[] | null = null;
      for (const entry of entries) {
        if (!compactQuery.startsWith(entry.compact, position)) continue;
        const remainder = walk(position + entry.compact.length);
        if (!remainder) continue;
        const candidate = [entry.original, ...remainder];
        if (!bestTokens || candidate.length < bestTokens.length) bestTokens = candidate;
      }
      best.set(position, bestTokens);
      return bestTokens;
    }

    const tokens = walk(0);
    if (tokens && tokens.length > 1) return { tokens, source: candidateSource };
  }

  return null;
}

function takeProducts<T>(groups: T[][], limit: number) {
  const products: T[][] = [];
  function walk(groupIndex: number, current: T[]) {
    if (products.length >= limit) return;
    if (groupIndex === groups.length) {
      products.push([...current]);
      return;
    }
    for (const item of groups[groupIndex]) {
      current.push(item);
      walk(groupIndex + 1, current);
      current.pop();
      if (products.length >= limit) break;
    }
  }
  walk(0, []);
  return products;
}

function concatenateVariants(groups: string[][], separator = " ", limit = 24) {
  const combinations = takeProducts(groups.map((group) => group.slice(0, 6)), limit);
  return [...new Set(combinations.map((parts) => parts.join(separator)))];
}

export function searchNameQuery(query: string, source: SourceLanguage = "auto"): SearchResultSet {
  const normalizedQuery = query.trim().replace(/\s+/g, " ");
  if (!normalizedQuery) {
    return { results: [], mode: "single", tokens: [], missingTokens: [] };
  }

  let tokens = normalizedQuery.split(" ").slice(0, 10);
  let tokenSource = source;
  const exactWholeName = exactMatches(normalizedQuery, source);
  if (exactWholeName.length > 0) {
    const broadResults = searchNames(normalizedQuery, source);
    const exactIds = new Set(exactWholeName.map((row) => row.id));
    const ranked = [
      ...exactWholeName,
      ...broadResults.filter((row) => !exactIds.has(row.id)),
    ].slice(0, 40);
    return { results: ranked, mode: "single", tokens, missingTokens: [] };
  }

  if (tokens.length === 1) {
    const segmented = segmentContinuousName(normalizedQuery, source);
    if (!segmented) {
      return {
        results: searchNames(normalizedQuery, source),
        mode: "single",
        tokens,
        missingTokens: [],
      };
    }
    tokens = segmented.tokens.slice(0, 10);
    tokenSource = segmented.source;
  }

  const matchesByToken = tokens.map((token) => exactMatches(token, tokenSource).slice(0, 4));
  const missingTokens = tokens.filter((_, index) => matchesByToken[index].length === 0);
  if (missingTokens.length > 0) {
    return { results: [], mode: "composed", tokens, missingTokens: [...new Set(missingTokens)] };
  }

  const now = new Date().toISOString();
  const variantsFor = (key: "monVariants" | "burmeseVariants" | "englishVariants") =>
    matchesByToken.map((records) => [...new Set(records.flatMap((row) => row[key]))]);
  const monVariants = concatenateVariants(variantsFor("monVariants"), "");
  const burmeseVariants = concatenateVariants(variantsFor("burmeseVariants"), "");
  const englishVariants = concatenateVariants(variantsFor("englishVariants"));
  const results: NameRecord[] = [{
    id: -1,
    mon: monVariants[0] ?? "",
    burmese: burmeseVariants[0] ?? "",
    english: englishVariants[0] ?? "",
    monVariants,
    burmeseVariants,
    englishVariants,
    notes: `Composed from ${tokens.length} catalog words · ${tokens.join(" · ")}`,
    credit: "",
    batchId: null,
    createdAt: now,
    composed: true,
    sourceTokens: tokens,
  }];

  return { results, mode: "composed", tokens, missingTokens: [] };
}

export function createSuggestion(input: {
  kind?: SuggestionKind;
  text: string;
  source: Language;
  context?: string;
  note?: string;
  contributorName?: string;
  spellings?: Partial<Record<Language, string>>;
}) {
  const database = getDb();
  const text = input.text.trim().replace(/\s+/g, " ");
  const normalized = normalizeLookup(text);
  const kind = input.kind ?? "word";
  const existing = database
    .prepare(
      `SELECT * FROM suggestions
       WHERE kind = ? AND normalized_text = ? AND source_language = ? AND status = 'pending'
       LIMIT 1`,
    )
    .get(kind, normalized, input.source) as SuggestionRow | undefined;
  if (existing) return { created: false, suggestion: mapSuggestion(existing) };

  const createdAt = new Date().toISOString();
  const result = database
    .prepare(
      `INSERT INTO suggestions
       (kind, suggested_text, normalized_text, source_language, context, note,
        contributor_name, suggested_mon, suggested_burmese, suggested_english, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(
      kind,
      text,
      normalized,
      input.source,
      input.context?.trim() ?? "",
      input.note?.trim() ?? "",
      input.contributorName?.trim() ?? "",
      input.spellings?.mon?.trim() ?? (kind === "word" && input.source === "mon" ? text : ""),
      input.spellings?.burmese?.trim() ?? (kind === "word" && input.source === "burmese" ? text : ""),
      input.spellings?.english?.trim() ?? (kind === "word" && input.source === "english" ? text : ""),
      createdAt,
    );
  const row = database.prepare("SELECT * FROM suggestions WHERE id = ?").get(result.lastInsertRowid) as SuggestionRow;
  return { created: true, suggestion: mapSuggestion(row) };
}

export function listSuggestions(status: SuggestionStatus = "pending", limit = 200) {
  return getDb()
    .prepare("SELECT * FROM suggestions WHERE status = ? ORDER BY created_at ASC LIMIT ?")
    .all(status, limit)
    .map((row) => mapSuggestion(row as SuggestionRow));
}

export function rejectSuggestion(id: number) {
  const reviewedAt = new Date().toISOString();
  const result = getDb()
    .prepare("UPDATE suggestions SET status = 'rejected', reviewed_at = ? WHERE id = ? AND status = 'pending'")
    .run(reviewedAt, id);
  return result.changes > 0;
}

export function resolveSuggestion(id: number) {
  const reviewedAt = new Date().toISOString();
  const result = getDb()
    .prepare("UPDATE suggestions SET status = 'resolved', reviewed_at = ? WHERE id = ? AND status = 'pending' AND kind = 'bug'")
    .run(reviewedAt, id);
  return result.changes > 0;
}

export function approveSuggestion(id: number, input: NameInput) {
  const database = getDb();
  const createdAt = new Date().toISOString();
  const insertedId = database.transaction(() => {
    const suggestion = database
      .prepare("SELECT * FROM suggestions WHERE id = ? AND status = 'pending' AND kind = 'word'")
      .get(id) as SuggestionRow | undefined;
    if (!suggestion) return null;

    const result = database
      .prepare(
        `INSERT INTO names (mon, burmese, english, notes, credit, batch_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        formatVariantCell(input.mon),
        formatVariantCell(input.burmese),
        formatVariantCell(input.english),
        input.notes?.trim() ?? "",
        input.credit?.trim() ?? "",
        `suggestion-${id}`,
        createdAt,
      );
    const nameId = Number(result.lastInsertRowid);
    database
      .prepare(
        `UPDATE suggestions
         SET status = 'approved', linked_name_id = ?, reviewed_at = ?
         WHERE id = ?`,
      )
      .run(nameId, createdAt, id);
    return nameId;
  })();

  if (insertedId === null) return null;
  exportNamesJson();
  return getName(insertedId);
}

export function getName(id: number): NameRecord | null {
  const row = getDb().prepare("SELECT * FROM names WHERE id = ?").get(id) as NameRow | undefined;
  return row ? mapRow(row) : null;
}

export function insertNames(records: NameInput[], batchId: string) {
  const database = getDb();
  const createdAt = new Date().toISOString();
  const stmt = database.prepare(
    `INSERT INTO names (mon, burmese, english, notes, credit, batch_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const run = database.transaction((rows: NameInput[]) => {
    for (const row of rows) {
      stmt.run(
        formatVariantCell(row.mon),
        formatVariantCell(row.burmese),
        formatVariantCell(row.english),
        row.notes ?? "",
        row.credit ?? "",
        batchId,
        createdAt,
      );
    }
  });
  run(records);
}

export function createName(input: NameInput, batchId = "manual") {
  const database = getDb();
  const createdAt = new Date().toISOString();
  const result = database
    .prepare(
      `INSERT INTO names (mon, burmese, english, notes, credit, batch_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      formatVariantCell(input.mon),
      formatVariantCell(input.burmese),
      formatVariantCell(input.english),
      input.notes?.trim() ?? "",
      input.credit?.trim() ?? "",
      batchId,
      createdAt,
    );
  exportNamesJson();
  return getName(Number(result.lastInsertRowid));
}

export function replaceAllNames(records: NameInput[], batchId: string, filename: string) {
  const database = getDb();
  const createdAt = new Date().toISOString();
  const insert = database.prepare(
    `INSERT INTO names (mon, burmese, english, notes, credit, batch_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  database.transaction(() => {
    const previousNames = database.prepare("SELECT * FROM names ORDER BY id").all() as NameRow[];
    database.exec("DELETE FROM names");
    for (const row of records) {
      insert.run(
        formatVariantCell(row.mon),
        formatVariantCell(row.burmese),
        formatVariantCell(row.english),
        row.notes ?? "",
        row.credit ?? "",
        batchId,
        createdAt,
      );
    }
    database
      .prepare("INSERT INTO imports (id, filename, row_count, created_at) VALUES (?, ?, ?, ?)")
      .run(batchId, filename, records.length, createdAt);
    database
      .prepare("INSERT INTO import_backups (import_id, names_json) VALUES (?, ?)")
      .run(batchId, JSON.stringify(previousNames));
  })();
}

export function appendNames(records: NameInput[], batchId: string, filename: string) {
  const database = getDb();
  const createdAt = new Date().toISOString();
  insertNames(records, batchId);
  database
    .prepare("INSERT INTO imports (id, filename, row_count, created_at) VALUES (?, ?, ?, ?)")
    .run(batchId, filename, records.length, createdAt);
}

export function lastImport() {
  return getDb()
    .prepare("SELECT * FROM imports ORDER BY created_at DESC, rowid DESC LIMIT 1")
    .get() as { id: string; filename: string; row_count: number; created_at: string } | undefined;
}

export function undoLastImport() {
  const latest = lastImport();
  if (!latest || latest.id === "seed") return null;

  const database = getDb();
  const existingBackup = database
    .prepare("SELECT * FROM import_backups WHERE import_id = ?")
    .get(latest.id) as ImportBackupRow | undefined;
  const batchCount = database
    .prepare("SELECT COUNT(*) AS n FROM names WHERE batch_id = ?")
    .get(latest.id) as { n: number };
  const totalCount = database.prepare("SELECT COUNT(*) AS n FROM names").get() as { n: number };
  if (!existingBackup && batchCount.n > 0 && batchCount.n === totalCount.n) {
    throw new Error("This older replace import has no restoration backup and cannot be safely undone.");
  }

  const result = database.transaction(() => {
    const deleted = database.prepare("DELETE FROM names WHERE batch_id = ?").run(latest.id);
    let restored = 0;
    if (existingBackup) {
      const previousNames = JSON.parse(existingBackup.names_json) as NameRow[];
      const restore = database.prepare(
        `INSERT INTO names (id, mon, burmese, english, notes, credit, batch_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const row of previousNames) {
        restore.run(row.id, row.mon, row.burmese, row.english, row.notes, row.credit ?? "", row.batch_id, row.created_at);
        restored += 1;
      }
      database.prepare("DELETE FROM import_backups WHERE import_id = ?").run(latest.id);
    }
    database.prepare("DELETE FROM imports WHERE id = ?").run(latest.id);
    return { deleted: deleted.changes, restored };
  })();

  exportNamesJson();
  return { batchId: latest.id, ...result };
}

export function updateName(id: number, input: NameInput) {
  getDb()
    .prepare(
      `UPDATE names SET mon = ?, burmese = ?, english = ?, notes = ?, credit = ? WHERE id = ?`,
    )
    .run(
      formatVariantCell(input.mon),
      formatVariantCell(input.burmese),
      formatVariantCell(input.english),
      input.notes ?? "",
      input.credit ?? "",
      id,
    );
  exportNamesJson();
  return getName(id);
}

export function deleteName(id: number) {
  const result = getDb().prepare("DELETE FROM names WHERE id = ?").run(id);
  exportNamesJson();
  return result.changes > 0;
}

export function countNames() {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM names").get() as { n: number };
  return row.n;
}

export function exportNamesJson() {
  const rows = getDb()
    .prepare("SELECT id, mon, burmese, english, notes, credit FROM names ORDER BY id")
    .all() as Array<{
    id: number;
    mon: string;
    burmese: string;
    english: string;
    notes: string;
    credit: string;
  }>;

  const exported = rows.map((row) => ({
    id: row.id,
    mon: parseVariantCell(row.mon),
    burmese: parseVariantCell(row.burmese),
    english: parseVariantCell(row.english),
    notes: row.notes,
    credit: row.credit,
  }));

  const target = jsonPath();
  const temporary = `${target}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(exported, null, 2)}\n`, "utf8");
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return rows.length;
}
