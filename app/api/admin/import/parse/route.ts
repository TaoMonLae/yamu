import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { hasAcceptableContentLength } from "@/lib/http";
import { parseSpreadsheet } from "@/lib/import";
import { isTrustedMutation } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!hasAcceptableContentLength(request, 11 * 1024 * 1024)) {
    return NextResponse.json({ error: "Keep spreadsheet uploads under 10 MB." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send a valid spreadsheet upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a .xlsx or .csv file." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Keep spreadsheet uploads under 10 MB." }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseSpreadsheet(buffer, file.name);
    return NextResponse.json({
      filename: file.name.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 200) || "upload",
      headers: parsed.headers,
      rows: parsed.rows,
      suggestedMap: parsed.suggestedMap,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read the file.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
