import path from "node:path";

export function dataDir() {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

export function dbPath() {
  return path.join(dataDir(), "names.db");
}

export function jsonPath() {
  return path.join(dataDir(), "names.json");
}
