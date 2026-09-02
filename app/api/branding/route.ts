import { NextResponse } from "next/server";
import { getBrandSettings } from "@/lib/branding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ settings: getBrandSettings() });
}
