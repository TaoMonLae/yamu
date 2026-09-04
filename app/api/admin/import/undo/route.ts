import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { undoLastImport } from "@/lib/db";
import { isTrustedMutation } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }
  const access = await requireCapability("catalog:import");
  if (!access.ok) return access.response;

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
