import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";

export const runtime = "nodejs";

const TEMPLATE = `mon,burmese,english,notes,credit
အံၚ်,အောင်,Aung,example,
နိုၚ်,နိုင်,"Nai, Naing","two English variants",Community contributor
`;

export async function GET() {
  const access = await requireCapability("catalog:export");
  if (!access.ok) return access.response;

  return new NextResponse(TEMPLATE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="names-template.csv"',
    },
  });
}
