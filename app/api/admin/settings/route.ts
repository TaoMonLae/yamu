import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getBrandSettings, updateBrandSettings } from "@/lib/branding";
import { hasAcceptableContentLength } from "@/lib/http";
import { isTrustedMutation } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ settings: getBrandSettings() });
}

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!hasAcceptableContentLength(request, 3 * 1024 * 1024)) {
    return NextResponse.json({ error: "Branding upload is too large." }, { status: 413 });
  }

  try {
    const form = await request.formData();
    const settings = await updateBrandSettings({
      siteName: String(form.get("siteName") ?? ""),
      tagline: String(form.get("tagline") ?? ""),
      accentColor: String(form.get("accentColor") ?? ""),
      logo: form.get("logo") instanceof File ? form.get("logo") as File : null,
      favicon: form.get("favicon") instanceof File ? form.get("favicon") as File : null,
      removeLogo: form.get("removeLogo") === "true",
      removeFavicon: form.get("removeFavicon") === "true",
      reset: form.get("reset") === "true",
    });
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save branding settings." },
      { status: 400 },
    );
  }
}
