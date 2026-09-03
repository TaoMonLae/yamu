type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, Bucket>;

const globalRateLimits = globalThis as typeof globalThis & {
  __yamuRateLimits?: RateLimitStore;
};

const buckets = globalRateLimits.__yamuRateLimits ?? new Map<string, Bucket>();
globalRateLimits.__yamuRateLimits = buckets;

function prune(now: number) {
  if (buckets.size < 2_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size > 5_000) {
    const oldest = buckets.keys().next().value as string | undefined;
    if (!oldest) break;
    buckets.delete(oldest);
  }
}

export function takeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  prune(now);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}
