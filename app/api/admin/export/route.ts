import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { listNames } from "@/lib/db";

export const runtime = "nodejs";

function escapeCsvCell(value: string) {
  const protectedValue = /^[=+\-@＝＋－＠]/u.test(value)
    ? `\t${value}`
    : /^[\t\r\n]/u.test(value)
      ? `'${value}`
      : value;
  return `"${protectedValue.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const access = await requireCapability("catalog:export");
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";
  const rows = listNames("", 100000).reverse();

  if (format === "csv") {
    const header = "mon,burmese,english,notes,credit";
    const body = rows
      .map((row) =>
        [
          row.monVariants.join(", "),
          row.burmeseVariants.join(", "),
          row.englishVariants.join(", "),
          row.notes,
          row.credit,
        ]
          .map(escapeCsvCell)
          .join(","),
      )
      .join("\n");
    return new NextResponse(`${header}\n${body}\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="names.csv"',
      },
    });
  }

  return new NextResponse(
    `${JSON.stringify(
      rows.map(({ id, monVariants, burmeseVariants, englishVariants, notes, credit }) => ({
        id,
        mon: monVariants,
        burmese: burmeseVariants,
        english: englishVariants,
        notes,
        credit,
      })),
      null,
      2,
    )}\n`,
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="names.json"',
      },
    },
  );
}
