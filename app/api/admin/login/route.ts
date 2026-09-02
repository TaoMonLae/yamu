import { NextResponse } from "next/server";
import { adminPassword, createSession, passwordsMatch } from "@/lib/auth";
import { readJsonObject } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await readJsonObject<{ password?: string }>(request);
  if (!body || typeof body.password !== "string" || !passwordsMatch(body.password, adminPassword())) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  await createSession();
  return NextResponse.json({ ok: true });
}
