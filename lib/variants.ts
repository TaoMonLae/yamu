export function parseVariantCell(value: string | string[] | null | undefined) {
  const parts = Array.isArray(value) ? value : String(value ?? "").split(/[\n,;|]+/);
  const seen = new Set<string>();

  return parts
    .map((part) => part.trim())
    .filter((part) => {
      if (!part || seen.has(part)) return false;
      seen.add(part);
      return true;
    });
}

export function formatVariantCell(value: string | string[] | null | undefined) {
  return parseVariantCell(value).join(", ");
}
