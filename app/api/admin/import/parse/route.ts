import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { parseSpreadsheet } from "@/lib/import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const form = await request.formData();
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
      filename: file.name,
      headers: parsed.headers,
      rows: parsed.rows,
      suggestedMap: parsed.suggestedMap,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read the file.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
