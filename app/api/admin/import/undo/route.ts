import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { undoLastImport } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = undoLastImport();
    if (!result) {
      return NextResponse.json({ error: "Nothing to undo." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not undo the import." },
      { status: 400 },
    );
  }
}
