const DEFAULT_JSON_LIMIT = 64 * 1024;

async function readLimitedText(request: Request, maxBytes: number) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > maxBytes) return null;
  }

  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function readJsonObject<T extends object>(
  request: Request,
  maxBytes = DEFAULT_JSON_LIMIT,
): Promise<T | null> {
  try {
    const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (contentType !== "application/json") return null;
    const text = await readLimitedText(request, maxBytes);
    if (text === null) return null;
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as T;
  } catch {
    return null;
  }
}

export function hasAcceptableContentLength(request: Request, maxBytes: number) {
  const raw = request.headers.get("content-length");
  if (!raw) return false;
  const length = Number(raw);
  return Number.isSafeInteger(length) && length >= 0 && length <= maxBytes;
}
