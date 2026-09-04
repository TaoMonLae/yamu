import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { listSuggestions } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireCapability("suggestions:review");
  if (!access.ok) return access.response;
  return NextResponse.json({ suggestions: listSuggestions("pending") });
}
