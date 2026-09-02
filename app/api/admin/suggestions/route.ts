import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listSuggestions } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ suggestions: listSuggestions("pending") });
}
