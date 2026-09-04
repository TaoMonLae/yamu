import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { countNames, lastImport } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireCapability("catalog:read");
  if (!access.ok) return access.response;
  return NextResponse.json({
    authed: true,
    identity: access.identity,
    count: countNames(),
    lastImport: lastImport() ?? null,
  });
}
