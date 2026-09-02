import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { countNames, lastImport } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ authed: false }, { status: 401 });
  }
  return NextResponse.json({
    authed: true,
    count: countNames(),
    lastImport: lastImport() ?? null,
  });
}
