import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { countNames, deleteName, updateName } from "@/lib/db";
import { readJsonObject } from "@/lib/http";
import { validateNameInput } from "@/lib/name-input";
import { isTrustedMutation } from "@/lib/request-security";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return NextResponse.json({ error: "Invalid name ID." }, { status: 400 });
  const body = await readJsonObject(request);
  const validated = validateNameInput(body);
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });
  const updated = updateName(Number(id), validated.value);
  if (!updated) {
    return NextResponse.json({ error: "Name not found." }, { status: 404 });
  }
  return NextResponse.json({ result: updated });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return NextResponse.json({ error: "Invalid name ID." }, { status: 400 });
  const ok = deleteName(Number(id));
  if (!ok) {
    return NextResponse.json({ error: "Name not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, count: countNames() });
}
