import { NextResponse } from "next/server";
import { createSuggestion } from "@/lib/db";
import { readJsonObject } from "@/lib/http";
import type { Language, SuggestionKind } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await readJsonObject<{
    text?: string;
    kind?: SuggestionKind;
    source?: Language;
    context?: string;
    note?: string;
    contributorName?: string;
    spellings?: Partial<Record<Language, string>>;
  }>(request);
  if (!body) {
    return NextResponse.json({ error: "Send a valid suggestion." }, { status: 400 });
  }
  if (
    (body.text !== undefined && typeof body.text !== "string")
    || (body.context !== undefined && typeof body.context !== "string")
    || (body.note !== undefined && typeof body.note !== "string")
    || (body.contributorName !== undefined && typeof body.contributorName !== "string")
  ) {
    return NextResponse.json({ error: "Suggestion fields must be text." }, { status: 400 });
  }
  const text = body.text?.trim().replace(/\s+/g, " ") ?? "";
  const kind = body.kind ?? "word";
  const allowedSources: Language[] = ["mon", "burmese", "english"];

  if (kind !== "word" && kind !== "bug") {
    return NextResponse.json({ error: "Choose a valid contribution type." }, { status: 400 });
  }
  if (!text || text.length > (kind === "bug" ? 120 : 80)) {
    return NextResponse.json({ error: kind === "bug" ? "Summarize the issue in 120 characters or fewer." : "Enter a word or name up to 80 characters." }, { status: 400 });
  }
  if (!body.source || !allowedSources.includes(body.source)) {
    return NextResponse.json({ error: "Choose the language this spelling uses." }, { status: 400 });
  }
  if (
    (body.context?.length ?? 0) > 300
    || (body.note?.length ?? 0) > (kind === "bug" ? 1_500 : 500)
    || (body.contributorName?.length ?? 0) > 80
  ) {
    return NextResponse.json({ error: "The suggestion context is too long." }, { status: 400 });
  }
  if (kind === "bug" && !body.note?.trim()) {
    return NextResponse.json({ error: "Tell us what happened so we can investigate." }, { status: 400 });
  }
  if (body.spellings !== undefined && (!body.spellings || typeof body.spellings !== "object" || Array.isArray(body.spellings))) {
    return NextResponse.json({ error: "Spellings must be sent as text fields." }, { status: 400 });
  }
  const spellings = body.spellings ?? {};
  if (Object.values(spellings).some((value) => typeof value !== "string" || value.length > 80)) {
    return NextResponse.json({ error: "Keep each spelling under 80 characters." }, { status: 400 });
  }

  const result = createSuggestion({
    kind,
    text,
    source: body.source,
    context: body.context?.slice(0, 300),
    note: body.note?.slice(0, kind === "bug" ? 1_500 : 500),
    contributorName: body.contributorName?.slice(0, 80),
    spellings,
  });
  return NextResponse.json(result, { status: result.created ? 201 : 200 });
}
