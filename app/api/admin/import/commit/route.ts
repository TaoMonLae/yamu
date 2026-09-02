import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { appendNames, countNames, exportNamesJson, replaceAllNames } from "@/lib/db";
import { applyColumnMap } from "@/lib/import";
import { readJsonObject } from "@/lib/http";
import type { ColumnMap } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await readJsonObject<{
    filename?: string;
    rows?: Record<string, string>[];
    mapping?: ColumnMap;
    mode?: "append" | "replace";
  }>(request);

  if (!body || !Array.isArray(body.rows) || !body.mapping || typeof body.mapping !== "object" || Array.isArray(body.mapping)) {
    return NextResponse.json({ error: "Send valid spreadsheet rows and a column mapping." }, { status: 400 });
  }
  if (body.rows.length > 50_000) {
    return NextResponse.json({ error: "Import no more than 50,000 rows at once." }, { status: 413 });
  }

  const { records, errors } = applyColumnMap(body.rows, body.mapping);
  if (errors.length) {
    return NextResponse.json({ error: errors[0], errors }, { status: 400 });
  }

  const batchId = randomUUID();
  const filename = body.filename || "upload";
  if (body.mode === "replace") {
    replaceAllNames(records, batchId, filename);
  } else {
    appendNames(records, batchId, filename);
  }
  const exported = exportNamesJson();

  return NextResponse.json({
    ok: true,
    imported: records.length,
    total: countNames(),
    batchId,
    jsonRows: exported,
    mode: body.mode === "replace" ? "replace" : "append",
  });
}
