import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { appendNames, countNames, exportNamesJson, replaceAllNames } from "@/lib/db";
import { applyColumnMap } from "@/lib/import";
import { readJsonObject } from "@/lib/http";
import type { ColumnMap } from "@/lib/types";
import { isTrustedMutation } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await readJsonObject<{
    filename?: string;
    rows?: Record<string, string>[];
    mapping?: ColumnMap;
    mode?: "append" | "replace";
  }>(request, 20 * 1024 * 1024);

  if (
    !body
    || !Array.isArray(body.rows)
    || body.rows.some((row) => !row || typeof row !== "object" || Array.isArray(row))
    || !body.mapping
    || typeof body.mapping !== "object"
    || Array.isArray(body.mapping)
    || (body.mode !== undefined && body.mode !== "append" && body.mode !== "replace")
  ) {
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
  const filename = typeof body.filename === "string"
    ? body.filename.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 200) || "upload"
    : "upload";
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
