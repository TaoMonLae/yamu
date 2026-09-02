import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import Papa from "papaparse";

const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!sourcePath || !fs.existsSync(sourcePath)) {
  throw new Error("Pass the path to MyanmarName-en-mm.csv as the first argument.");
}

const projectRoot = process.cwd();
const dataDirectory = process.env.DATA_DIR || path.join(projectRoot, "data");
const databasePath = path.join(dataDirectory, "names.db");
const jsonPath = path.join(dataDirectory, "names.json");
const batchId = "github-taomonlae-myanmar-name-en-mm-f3b4719";

function clean(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalized(value) {
  return clean(value).toLocaleLowerCase("en");
}

function variants(value) {
  return String(value ?? "")
    .split(/[\n,;|]+/)
    .map(clean)
    .filter(Boolean);
}

const parsed = Papa.parse(fs.readFileSync(sourcePath, "utf8"), {
  header: true,
  skipEmptyLines: "greedy",
});

if (parsed.errors.length) {
  throw new Error(`CSV parse failed: ${parsed.errors[0].message}`);
}

const [englishColumn, myanmarColumn, remarkColumn] = parsed.meta.fields ?? [];
if (!englishColumn || !myanmarColumn) {
  throw new Error("The CSV must contain English and Myanmar columns.");
}

const grouped = new Map();
let rejected = 0;
for (const row of parsed.data) {
  const english = clean(row[englishColumn]);
  const burmese = clean(row[myanmarColumn]);
  const remark = clean(row[remarkColumn]);
  const looksRomanized = /^[A-Za-z][A-Za-z .'’-]*$/.test(english);
  const hasMyanmar = /[\u1000-\u109f\uaa60-\uaa7f\ua9e0-\ua9ff]/u.test(burmese);
  if (!looksRomanized || !hasMyanmar) {
    rejected += 1;
    continue;
  }

  const key = normalized(burmese);
  const group = grouped.get(key) ?? {
    burmese,
    english: [],
    englishSeen: new Set(),
    remarks: new Set(),
  };
  if (!group.englishSeen.has(normalized(english))) {
    group.english.push(english);
    group.englishSeen.add(normalized(english));
  }
  if (remark) group.remarks.add(remark);
  grouped.set(key, group);
}

const database = new Database(databasePath);
database.pragma("journal_mode = WAL");

const existingRows = database
  .prepare("SELECT burmese, english FROM names WHERE batch_id IS NULL OR batch_id != ?")
  .all(batchId);
const existingBurmese = new Set(existingRows.flatMap((row) => variants(row.burmese).map(normalized)));
const existingEnglish = new Set(existingRows.flatMap((row) => variants(row.english).map(normalized)));

const insert = database.prepare(`
  INSERT INTO names (mon, burmese, english, notes, batch_id, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);
let inserted = 0;
let skipped = 0;
const createdAt = new Date().toISOString();

database.transaction(() => {
  database.prepare("DELETE FROM names WHERE batch_id = ?").run(batchId);
  database.prepare("DELETE FROM imports WHERE id = ?").run(batchId);

  for (const group of grouped.values()) {
    const overlapsExisting = existingBurmese.has(normalized(group.burmese))
      || group.english.some((value) => existingEnglish.has(normalized(value)));
    if (overlapsExisting) {
      skipped += 1;
      continue;
    }

    const sourceRemarks = [...group.remarks];
    const notes = [
      "Myanmar-Name_en-2-mm · CC BY-NC-ND 4.0",
      sourceRemarks.length ? `Source remarks: ${sourceRemarks.join(" / ")}` : "",
    ].filter(Boolean).join(" · ");
    insert.run("", group.burmese, group.english.join(", "), notes, batchId, createdAt);
    inserted += 1;
  }

  database
    .prepare("INSERT INTO imports (id, filename, row_count, created_at) VALUES (?, ?, ?, ?)")
    .run(batchId, path.basename(sourcePath), inserted, createdAt);
})();

const exportedRows = database
  .prepare("SELECT id, mon, burmese, english, notes FROM names ORDER BY id")
  .all()
  .map((row) => ({
    id: row.id,
    mon: variants(row.mon),
    burmese: variants(row.burmese),
    english: variants(row.english),
    notes: row.notes,
  }));

fs.writeFileSync(jsonPath, `${JSON.stringify(exportedRows, null, 2)}\n`, "utf8");
database.pragma("wal_checkpoint(TRUNCATE)");
database.close();

console.log(JSON.stringify({
  sourceRows: parsed.data.length,
  acceptedRows: parsed.data.length - rejected,
  groupedMyanmarNames: grouped.size,
  inserted,
  skippedExisting: skipped,
  rejected,
  catalogTotal: exportedRows.length,
}, null, 2));
