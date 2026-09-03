const MUTATION_HEADER = "x-yamu-request";

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

function configuredOrigins() {
  const raw = process.env.APP_ORIGINS?.trim() || process.env.APP_ORIGIN?.trim();
  if (!raw) return null;
  try {
    const origins = raw.split(",").map((value) => new URL(value.trim()).origin);
    if (process.env.NODE_ENV === "production" && origins.some((origin) => !origin.startsWith("https://"))) {
      return [];
    }
    return [...new Set(origins)];
  } catch {
    return [];
  }
}

function expectedHost(request: Request) {
  const origins = configuredOrigins();
  if (origins) {
    return origins[0] ? new URL(origins[0]).host : null;
  }
  return firstHeaderValue(request.headers.get("x-forwarded-host"))
    ?? firstHeaderValue(request.headers.get("host"))
    ?? new URL(request.url).host;
}

export function isTrustedMutation(request: Request) {
  if (request.headers.get(MUTATION_HEADER) !== "1") return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "same-site") return false;

  const source = request.headers.get("origin");
  if (!source) return true;

  try {
    const sourceUrl = new URL(source);
    const origins = configuredOrigins();
    if (origins) return origins.includes(sourceUrl.origin);

    const host = expectedHost(request);
    if (!host || sourceUrl.host !== host) return false;
    return process.env.NODE_ENV !== "production" || sourceUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export function clientIp(request: Request) {
  const trustCloudflare = process.env.TRUST_CLOUDFLARE_PROXY === "true";
  const candidate = (trustCloudflare
    ? firstHeaderValue(request.headers.get("cf-connecting-ip"))
    : null)
    ?? firstHeaderValue(request.headers.get("x-real-ip"))
    ?? "unknown";
  return /^[0-9a-f:.]{1,64}$/i.test(candidate) ? candidate.toLowerCase() : "unknown";
}
