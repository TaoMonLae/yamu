import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import loadLibrary from "./load-library.mjs";

const sample = { mon: "မန်", burmese: "မွန်", english: "Mon" };

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "yamu-catalog-test-"));
  const previousDir = process.env.DATA_DIR;
  const previousCatalog = process.env.INITIAL_CATALOG_PATH;
  process.env.DATA_DIR = directory;
  process.env.INITIAL_CATALOG_PATH = path.join(directory, "fixture.json");
  fs.writeFileSync(process.env.INITIAL_CATALOG_PATH, JSON.stringify([sample]));
  const databases = [];
  t.after(() => {
    databases.forEach((database) => { if (database.open) database.close(); });
    if (previousDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDir;
    if (previousCatalog === undefined) delete process.env.INITIAL_CATALOG_PATH;
    else process.env.INITIAL_CATALOG_PATH = previousCatalog;
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return {
    directory,
    open(entry = "lib/db.ts") {
      const cache = new Map();
      const catalog = loadLibrary("lib/db.ts", cache);
      databases.push(catalog.getDb());
      return loadLibrary(entry, cache);
    },
  };
}

test("separator-only spelling fields cannot create empty catalog entries", () => {
  const { validateNameInput } = loadLibrary("lib/name-input.ts");
  for (const key of ["mon", "burmese", "english"]) {
    assert.equal(validateNameInput({ ...sample, [key]: " , ; | \n " }).ok, false);
  }
});

test("colliding spreadsheet headers preserve every source cell", () => {
  const { parseSpreadsheet } = loadLibrary("lib/import.ts");
  const parsed = parseSpreadsheet(Buffer.from("mon,mon,mon_2\nfirst,second,third"), "names.csv");
  assert.equal(new Set(parsed.headers).size, 3);
  assert.deepEqual(parsed.headers.map((header) => parsed.rows[0][header]), ["first", "second", "third"]);
});

test("special spreadsheet headers are plain data, not inherited properties", () => {
  const { parseSpreadsheet } = loadLibrary("lib/import.ts");
  const parsed = parseSpreadsheet(Buffer.from("__proto__,constructor,mon\none,two,three"), "names.csv");
  assert.equal(parsed.rows[0].__proto__, "one");
  assert.equal(parsed.suggestedMap.constructor, "skip");
});

test("deleting the final catalog entry survives a server restart", (t) => {
  const data = fixture(t);
  const first = data.open();
  first.listNames().forEach((row) => first.deleteName(row.id));
  first.getDb().close();
  assert.equal(data.open().countNames(), 0);
});

test("an empty database from before the initialization marker is not reseeded", (t) => {
  const data = fixture(t);
  const first = data.open();
  first.listNames().forEach((row) => first.deleteName(row.id));
  first.getDb().prepare("DELETE FROM catalog_metadata").run();
  first.getDb().close();
  assert.equal(data.open().countNames(), 0);
});

test("a fresh database prefers the portable catalog in DATA_DIR", (t) => {
  const data = fixture(t);
  delete process.env.INITIAL_CATALOG_PATH;
  fs.writeFileSync(path.join(data.directory, "names.json"), JSON.stringify([{ ...sample, english: "Persistent" }]));
  const catalog = data.open();
  assert.equal(catalog.countNames(), 1);
  assert.equal(catalog.listNames()[0].english, "Persistent");
});

test("undoing a replacement that started with an empty catalog survives restart", (t) => {
  const data = fixture(t);
  const first = data.open();
  first.listNames().forEach((row) => first.deleteName(row.id));
  first.replaceAllNames([sample], "replacement", "names.csv");
  first.undoLastImport();
  first.getDb().close();
  assert.equal(data.open().countNames(), 0);
});

test("failed append history writes roll back the appended rows", (t) => {
  const catalog = fixture(t).open();
  const before = catalog.countNames();
  assert.throws(() => catalog.appendNames([sample], "seed", "duplicate-batch.csv"));
  assert.equal(catalog.countNames(), before);
});

test("undo clears links to removed rows and restores pre-import suggestion links", (t) => {
  const catalog = fixture(t).open();
  const database = catalog.getDb();
  const oldSuggestion = catalog.createSuggestion({ text: "Old", source: "english" }).suggestion;
  const oldName = catalog.approveSuggestion(oldSuggestion.id, { ...sample, english: "Old" });
  catalog.replaceAllNames([sample], "replacement", "names.csv");
  const replacement = catalog.listNames()[0];
  const newSuggestion = catalog.createSuggestion({ text: "New", source: "english" }).suggestion;
  database.prepare("UPDATE suggestions SET linked_name_id = ? WHERE id = ?").run(replacement.id, newSuggestion.id);
  const result = catalog.undoLastImport();
  assert.equal(result.restored, 2);
  const links = catalog.listSuggestions().find((row) => row.id === newSuggestion.id);
  assert.equal(links.linkedNameId, null);
  const restored = catalog.listSuggestions("approved").find((row) => row.id === oldSuggestion.id);
  assert.equal(restored.linkedNameId, oldName.id);
  assert.deepEqual(database.pragma("foreign_key_check"), []);
});

test("continuous names longer than ten components are never silently truncated", (t) => {
  const catalog = fixture(t).open();
  assert.throws(() => catalog.searchNameQuery("မန်".repeat(11), "mon"), /10 name parts/);
  assert.equal(catalog.searchNameQuery("မန်".repeat(10), "mon").tokens.length, 10);
});

test("search API explains overlong continuous names with a 400 response", async (t) => {
  const data = fixture(t);
  // Keep the API and database within the same module graph and temporary directory.
  const route = data.open("app/api/search/route.ts");
  const response = await route.GET(new Request(`http://localhost/api/search?q=${encodeURIComponent("မန်".repeat(11))}&source=mon`));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /10 name parts/);
  assert.ok(fs.existsSync(path.join(data.directory, "names.db")));
});
