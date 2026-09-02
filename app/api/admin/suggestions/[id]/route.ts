import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { approveSuggestion, rejectSuggestion, resolveSuggestion } from "@/lib/db";
import { readJsonObject } from "@/lib/http";
import { validateNameInput } from "@/lib/name-input";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  const suggestionId = Number(id);
  if (!Number.isInteger(suggestionId)) {
    return NextResponse.json({ error: "Invalid suggestion." }, { status: 400 });
  }

  const body = await readJsonObject<{ action?: "approve" | "reject" | "resolve"; name?: unknown }>(request);
  if (!body) return NextResponse.json({ error: "Send a valid review action." }, { status: 400 });
  if (body.action === "reject") {
    if (!rejectSuggestion(suggestionId)) {
      return NextResponse.json({ error: "Pending suggestion not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "approve") {
    const validated = validateNameInput(body.name);
    if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });
    const result = approveSuggestion(suggestionId, validated.value);
    if (!result) {
      return NextResponse.json({ error: "Pending suggestion not found." }, { status: 404 });
    }
    return NextResponse.json({ result });
  }

  if (body.action === "resolve") {
    if (!resolveSuggestion(suggestionId)) {
      return NextResponse.json({ error: "Pending bug report not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Choose approve, reject, or resolve." }, { status: 400 });
}
