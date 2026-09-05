import type { NameInput } from "@/lib/types";
import { formatVariantCell } from "@/lib/variants";

const MAX_SPELLING_LENGTH = 500;
const MAX_NOTES_LENGTH = 2_000;
const MAX_CREDIT_LENGTH = 80;

export function validateNameInput(input: unknown):
  | { ok: true; value: NameInput }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Send a valid catalog name." };
  }

  const candidate = input as Record<string, unknown>;
  if (
    typeof candidate.mon !== "string"
    || typeof candidate.burmese !== "string"
    || typeof candidate.english !== "string"
    || (candidate.notes !== undefined && typeof candidate.notes !== "string")
    || (candidate.credit !== undefined && typeof candidate.credit !== "string")
  ) {
    return { ok: false, error: "Mon, Burmese, English, notes, and credit must be text." };
  }

  const value: NameInput = {
    mon: formatVariantCell(candidate.mon),
    burmese: formatVariantCell(candidate.burmese),
    english: formatVariantCell(candidate.english),
    notes: typeof candidate.notes === "string" ? candidate.notes.trim() : "",
    credit: typeof candidate.credit === "string" ? candidate.credit.trim() : "",
  };

  if (!value.mon || !value.burmese || !value.english) {
    return { ok: false, error: "Mon, Burmese, and English are required." };
  }
  if ([value.mon, value.burmese, value.english].some((item) => item.length > MAX_SPELLING_LENGTH)) {
    return { ok: false, error: `Keep each spelling field under ${MAX_SPELLING_LENGTH} characters.` };
  }
  if ((value.notes?.length ?? 0) > MAX_NOTES_LENGTH) {
    return { ok: false, error: `Keep notes under ${MAX_NOTES_LENGTH.toLocaleString("en")} characters.` };
  }
  if ((value.credit?.length ?? 0) > MAX_CREDIT_LENGTH) {
    return { ok: false, error: `Keep contributor credit under ${MAX_CREDIT_LENGTH} characters.` };
  }

  return { ok: true, value };
}
