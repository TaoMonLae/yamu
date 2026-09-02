export type NameRecord = {
  id: number;
  mon: string;
  burmese: string;
  english: string;
  monVariants: string[];
  burmeseVariants: string[];
  englishVariants: string[];
  notes: string;
  credit: string;
  batchId: string | null;
  createdAt: string;
  composed?: boolean;
  sourceTokens?: string[];
};

export type NameInput = {
  mon: string;
  burmese: string;
  english: string;
  notes?: string;
  credit?: string;
};

export type Language = "mon" | "burmese" | "english";
export type SourceLanguage = Language | "auto";
export type UiLanguage = Language;

export type ColumnKey = "mon" | "burmese" | "english" | "notes" | "credit" | "skip";

export type ColumnMap = Record<string, ColumnKey>;

export type SearchResultSet = {
  results: NameRecord[];
  mode: "single" | "composed";
  tokens: string[];
  missingTokens: string[];
};

export type SuggestionKind = "word" | "bug";
export type SuggestionStatus = "pending" | "approved" | "rejected" | "resolved";

export type SuggestionRecord = {
  id: number;
  kind: SuggestionKind;
  text: string;
  source: Language;
  context: string;
  note: string;
  contributorName: string;
  suggestedMon: string;
  suggestedBurmese: string;
  suggestedEnglish: string;
  status: SuggestionStatus;
  linkedNameId: number | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type BrandSettings = {
  siteName: string;
  tagline: string;
  accentColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  updatedAt: string;
};
