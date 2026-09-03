import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { isTrustedMutation } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
