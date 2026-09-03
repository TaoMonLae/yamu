import { NextResponse } from "next/server";
import { adminPassword, createSession, passwordsMatch } from "@/lib/auth";
import { readJsonObject } from "@/lib/http";
import { clearRateLimit, takeRateLimit } from "@/lib/rate-limit";
import { clientIp, isTrustedMutation } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }

  const rateKey = `admin-login:${clientIp(request)}`;
  const rate = takeRateLimit(rateKey, 8, 15 * 60 * 1_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  const body = await readJsonObject<{ password?: string }>(request, 2 * 1024);
  let expected: string;
  try {
    expected = adminPassword();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Admin authentication is not configured.");
    return NextResponse.json({ error: "Admin access is not configured." }, { status: 503 });
  }
  if (!body || typeof body.password !== "string" || body.password.length > 256 || !passwordsMatch(body.password, expected)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  try {
    await createSession();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Admin sessions are not configured.");
    return NextResponse.json({ error: "Admin access is not configured." }, { status: 503 });
  }
  clearRateLimit(rateKey);
  return NextResponse.json({ ok: true });
}
