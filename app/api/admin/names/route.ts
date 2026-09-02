import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { countNames, createName, listNames } from "@/lib/db";
import { readJsonObject } from "@/lib/http";
import { validateNameInput } from "@/lib/name-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  return NextResponse.json({ results: listNames(searchParams.get("q") ?? "") });
}

export async function POST(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await readJsonObject(request);
  const validated = validateNameInput(body);
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });

  const result = createName(validated.value);
  return NextResponse.json({ result, count: countNames() }, { status: 201 });
}
