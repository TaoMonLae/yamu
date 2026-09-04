import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { countNames, createName, listNames } from "@/lib/db";
import { readJsonObject } from "@/lib/http";
import { validateNameInput } from "@/lib/name-input";
import { isTrustedMutation } from "@/lib/request-security";

export const runtime = "nodejs";

const PAGE_SIZE = 200;

export async function GET(request: Request) {
  const access = await requireCapability("catalog:read");
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  if (query.length > 200) {
    return NextResponse.json({ error: "Keep the search under 200 characters." }, { status: 400 });
  }
  const rawOffset = searchParams.get("offset") ?? "0";
  if (!/^\d+$/.test(rawOffset)) {
    return NextResponse.json({ error: "Use a valid catalog offset." }, { status: 400 });
  }
  const offset = Number(rawOffset);
  if (!Number.isSafeInteger(offset)) {
    return NextResponse.json({ error: "Use a valid catalog offset." }, { status: 400 });
  }

  const total = countNames(query);
  const results = listNames(query, PAGE_SIZE, offset);
  return NextResponse.json({
    results,
    total,
    hasMore: offset + results.length < total,
    nextOffset: offset + results.length,
  });
}

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }
  const access = await requireCapability("catalog:write");
  if (!access.ok) return access.response;
  const body = await readJsonObject(request);
  const validated = validateNameInput(body);
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });

  const result = createName(validated.value);
  return NextResponse.json({ result, count: countNames() }, { status: 201 });
}
