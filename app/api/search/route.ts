import { NextResponse } from "next/server";
import { searchNameQuery, TooManyNamePartsError } from "@/lib/db";
import type { SourceLanguage } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const source = (searchParams.get("source") ?? "auto") as SourceLanguage;
  const allowed: SourceLanguage[] = ["auto", "mon", "burmese", "english"];
  const safeSource = allowed.includes(source) ? source : "auto";

  if (q.length > 200) {
    return NextResponse.json({ error: "Keep the search under 200 characters." }, { status: 400 });
  }
  if (q.trim().split(/\s+/u).filter(Boolean).length > 10) {
    return NextResponse.json({ error: "Search for no more than 10 name parts at once." }, { status: 400 });
  }

  try {
    const result = searchNameQuery(q, safeSource);
    return NextResponse.json({
      query: q,
      source: safeSource,
      ...result,
    });
  } catch (error) {
    if (error instanceof TooManyNamePartsError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
