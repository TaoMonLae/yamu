import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";

const TEMPLATE = `mon,burmese,english,notes,credit
အံၚ်,အောင်,Aung,example,
နိုၚ်,နိုင်,"Nai, Naing","two English variants",Community contributor
`;

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return new NextResponse(TEMPLATE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="names-template.csv"',
    },
  });
}
