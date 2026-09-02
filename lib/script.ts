import type { SourceLanguage } from "@/lib/types";

const MYANMAR = /[\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF]/;
const LATIN = /[A-Za-z]/;

export function detectSource(query: string): Exclude<SourceLanguage, "auto"> {
  if (MYANMAR.test(query)) return "burmese";
  if (LATIN.test(query)) return "english";
  return "english";
}

export function effectiveSource(query: string, source: SourceLanguage) {
  return source === "auto" ? "auto" : source;
}
